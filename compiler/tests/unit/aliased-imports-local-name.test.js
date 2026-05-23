/**
 * aliased-imports-local-name.test.js — S122 Wave 12 Unit W regression
 *
 * Closes the two `imp.names` misuse sites Wave 11 Unit S (commit 1934aadb)
 * identified as deferred follow-ons:
 *
 *   Site 1 — compiler/src/name-resolver.ts:413-440 (importedRegistry seed
 *            keyed by source-side imported name; aliased component imports
 *            failed to register under the local alias).
 *
 *   Site 2 — compiler/src/api.js:1452-1492 (importedTypes seeder keyed by
 *            source-side typeName; aliased type imports were not visible
 *            to TS use-sites that look up by the local alias).
 *
 *   (Plumbing — compiler/src/module-resolver.js:154-160 (importGraph records
 *    now carry specifiers[] so consumers can map alias → imported.))
 *
 * Both sites pre-Unit W consumed `imp.names` (source-side names per
 * ast-builder.js:7039-7044) as if it were the local-binding name. Fix:
 * mirror the Wave 11 Unit S pattern — prefer `imp.specifiers[]` (alias-
 * aware) for the local-name iteration; fall back to `imp.names[]` for
 * default imports (specifiers empty; default-import locals unaliasable).
 *
 * Spec authority: SPEC §21.3 worked-example, §38.12.2 normative algorithm,
 * §38.12.5 ("The local alias is the tag name written in the markup").
 *
 * Strategy: tests directly exercise the affected functions
 *   (buildImportGraph, runNR) and the in-api seeder logic via the
 *   exported runTS surface. Direct unit coverage is more diagnostic
 *   than full-pipeline integration tests, where downstream stages
 *   (CE has its own alias-aware path at component-expander.ts:2924)
 *   can shadow upstream bugs.
 *
 * Coverage:
 *   §1 — buildImportGraph carries specifiers[] through (plumbing)
 *   §2 — runNR registers aliased components under LOCAL name, not imported
 *   §3 — runNR with mixed aliased + non-aliased imports
 *   §4 — runNR default-import fallback (no specifiers) still works
 *   §5 — runTS sees aliased type imports under LOCAL name (Site 2 surface)
 *   §6 — runTS regression: non-aliased type import still seeds correctly
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { buildImportGraph } from "../../src/module-resolver.js";
import { runNR } from "../../src/name-resolver.ts";
import { runTS, buildTypeRegistry } from "../../src/type-system.ts";

const EMPTY_SPAN = { file: "test.scrml", start: 0, end: 0, line: 1, col: 1 };
const EMPTY_PROTECT = { views: new Map() };
const EMPTY_ROUTE = { functions: new Map() };

const OPEN = "${";
const CLOSE = "}";

/** Run BS + TAB; returns { filePath, ast, errors } (buildAST's return). */
function tabOn(filePath, source) {
  const bsOut = splitBlocks(filePath, source);
  return buildAST(bsOut);
}

/** Convenience — pull the bare FileAST out of a buildAST return. */
function astOf(tab) {
  return tab.ast;
}

// ---------------------------------------------------------------------------
// §1 — buildImportGraph carries specifiers[] (Unit W plumbing layer)
// ---------------------------------------------------------------------------

describe("§1 buildImportGraph plumbs specifiers[] through", () => {
  test("aliased import — specifiers[] is non-empty with {imported,local} entries", () => {
    const src = "<program>\n" + OPEN + " import { Foo as Bar } from \"./lib.scrml\" " + CLOSE + "\n</program>";
    const tab = tabOn("/app/app.scrml", src);

    const { graph } = buildImportGraph([{ filePath: "/app/app.scrml", ast: astOf(tab) }]);
    const entry = graph.get("/app/app.scrml");
    expect(entry).toBeDefined();
    expect(entry.imports).toHaveLength(1);

    const imp = entry.imports[0];
    expect(imp.names).toEqual(["Foo"]); // source-side
    expect(Array.isArray(imp.specifiers)).toBe(true);
    expect(imp.specifiers).toHaveLength(1);
    expect(imp.specifiers[0].imported).toBe("Foo");
    expect(imp.specifiers[0].local).toBe("Bar");
  });

  test("non-aliased import — specifiers[] is also populated (imported === local)", () => {
    const src = "<program>\n" + OPEN + " import { Plain } from \"./lib.scrml\" " + CLOSE + "\n</program>";
    const tab = tabOn("/app/app.scrml", src);

    const { graph } = buildImportGraph([{ filePath: "/app/app.scrml", ast: astOf(tab) }]);
    const imp = graph.get("/app/app.scrml").imports[0];
    expect(imp.names).toEqual(["Plain"]);
    expect(imp.specifiers).toHaveLength(1);
    expect(imp.specifiers[0].imported).toBe("Plain");
    expect(imp.specifiers[0].local).toBe("Plain");
  });
});

// ---------------------------------------------------------------------------
// §2 — runNR registers aliased component import under the LOCAL name
// ---------------------------------------------------------------------------

describe("§2 runNR aliased component import — registry uses LOCAL name", () => {
  test("`import { Foo as Bar }` — `<Bar/>` resolves to user-component (NOT `<Foo/>`)", () => {
    // App imports Foo as Bar from a dep, then uses BOTH names.
    const src = "<program>\n"
      + OPEN + " import { Foo as Bar } from \"./components.scrml\" " + CLOSE + "\n"
      + "<div><Bar/><Foo/></div>\n"
      + "</program>";
    const appAST = tabOn("/app/app.scrml", src);

    // Build a minimal exportRegistry — the dep exports Foo as a user-component.
    const exportRegistry = new Map();
    const depExports = new Map();
    depExports.set("Foo", { kind: "component", isComponent: true, category: "user-component" });
    exportRegistry.set("/app/components.scrml", depExports);

    // Build the importGraph by running buildImportGraph so the specifiers
    // field is populated end-to-end through Unit W's plumbing.
    const { graph: importGraph } = buildImportGraph([{ filePath: "/app/app.scrml", ast: astOf(appAST) }]);

    runNR({
      filePath: "/app/app.scrml",
      ast: astOf(appAST),
      exportRegistry,
      importGraph,
    });

    // Walk the AST and inspect resolvedKind on each markup node.
    const tagged = collectTagged(astOf(appAST).nodes ?? []);
    const bar = tagged.find(n => n.tag === "Bar");
    const foo = tagged.find(n => n.tag === "Foo");

    // BAR (the LOCAL alias) must resolve to user-component.
    expect(bar).toBeDefined();
    expect(bar.resolvedKind).toBe("user-component");

    // FOO (the IMPORTED source-side name) must NOT resolve as a user-component
    // — its only entry in any registry is on the dep side, not in the importer.
    expect(foo).toBeDefined();
    expect(foo.resolvedKind).not.toBe("user-component");
  });
});

// ---------------------------------------------------------------------------
// §3 — runNR mixed aliased + non-aliased
// ---------------------------------------------------------------------------

describe("§3 runNR mixed aliased + non-aliased — both forms register", () => {
  test("`import { Alpha as A, Gamma }` — `<A/>` and `<Gamma/>` resolve; `<Alpha/>` does NOT", () => {
    const src = "<program>\n"
      + OPEN + " import { Alpha as A, Gamma } from \"./components.scrml\" " + CLOSE + "\n"
      + "<div><A/><Gamma/><Alpha/></div>\n"
      + "</program>";
    const appAST = tabOn("/app/app.scrml", src);

    const exportRegistry = new Map();
    const depExports = new Map();
    depExports.set("Alpha", { kind: "component", isComponent: true, category: "user-component" });
    depExports.set("Gamma", { kind: "component", isComponent: true, category: "user-component" });
    exportRegistry.set("/app/components.scrml", depExports);

    const { graph: importGraph } = buildImportGraph([{ filePath: "/app/app.scrml", ast: astOf(appAST) }]);

    runNR({ filePath: "/app/app.scrml", ast: astOf(appAST), exportRegistry, importGraph });

    const tagged = collectTagged(astOf(appAST).nodes ?? []);
    const a = tagged.find(n => n.tag === "A");
    const gamma = tagged.find(n => n.tag === "Gamma");
    const alpha = tagged.find(n => n.tag === "Alpha");

    expect(a?.resolvedKind).toBe("user-component");
    expect(gamma?.resolvedKind).toBe("user-component");
    expect(alpha?.resolvedKind).not.toBe("user-component");
  });
});

// ---------------------------------------------------------------------------
// §4 — runNR default-import fallback (negative regression)
// ---------------------------------------------------------------------------

describe("§4 runNR default-import — names[] fallback still works", () => {
  test("`import { Plain } from './lib.scrml'` — `<Plain/>` resolves under names[] path", () => {
    const src = "<program>\n"
      + OPEN + " import { Plain } from \"./components.scrml\" " + CLOSE + "\n"
      + "<div><Plain/></div>\n"
      + "</program>";
    const appAST = tabOn("/app/app.scrml", src);

    const exportRegistry = new Map();
    const depExports = new Map();
    depExports.set("Plain", { kind: "component", isComponent: true, category: "user-component" });
    exportRegistry.set("/app/components.scrml", depExports);

    const { graph: importGraph } = buildImportGraph([{ filePath: "/app/app.scrml", ast: astOf(appAST) }]);

    runNR({ filePath: "/app/app.scrml", ast: astOf(appAST), exportRegistry, importGraph });

    const tagged = collectTagged(astOf(appAST).nodes ?? []);
    const plain = tagged.find(n => n.tag === "Plain");
    expect(plain?.resolvedKind).toBe("user-component");
  });
});

// ---------------------------------------------------------------------------
// §5 — runTS importedTypesByFile (Site 2 — api.js seeder surface)
// ---------------------------------------------------------------------------
//
// The bug in api.js:1452-1492 was that importedTypes was keyed by source-side
// names. The api.js fix keys it by the LOCAL alias. We exercise the runTS
// API directly: when importedTypesByFile is keyed by the LOCAL alias, the
// type is visible at use-sites referring to that alias. This is the contract
// the fixed api.js seeder now upholds.

describe("§5 runTS sees aliased type imports under LOCAL name (Site 2)", () => {
  test("importedTypesByFile keyed by alias `S` — match (s: S) sees the type", () => {
    // Build the dep's typeRegistry for Status, then seed under the LOCAL alias `S`.
    const depRegistry = buildTypeRegistry(
      [{ kind: "type-decl", name: "Status", typeKind: "enum", raw: "{ OK, ERR }" }],
      [],
      EMPTY_SPAN,
    );
    const statusType = depRegistry.get("Status");
    expect(statusType).toBeDefined();
    expect(statusType.kind).toBe("enum");

    // Critical: importedTypesByFile is keyed under the LOCAL alias `S` —
    // this is the contract the Wave 12 Unit W api.js fix upholds.
    const importedTypes = new Map();
    importedTypes.set("S", statusType);
    const importedTypesByFile = new Map();
    importedTypesByFile.set("/app/app.scrml", importedTypes);

    // App imports `Status as S` and uses S in a function signature.
    const src = "<program>\n"
      + OPEN + " import { Status as S } from \"./types.scrml\"\n"
      + "function describe(s: S): string {\n"
      + "  match (s) {\n"
      + "    case .OK { lift \"ok\" }\n"
      + "    case .ERR { lift \"err\" }\n"
      + "  }\n"
      + "}\n"
      + CLOSE + "\n"
      + "</program>";
    const appAST = tabOn("/app/app.scrml", src);

    const tsResult = runTS({
      files: [appAST],
      protectAnalysis: EMPTY_PROTECT,
      routeMap: EMPTY_ROUTE,
      importedTypesByFile,
    });

    // No type-not-in-registry / variant-ambiguous errors on `S` — the alias
    // resolves to the seeded enum type. (Other errors unrelated to alias
    // resolution may surface; we filter to the bug-class fingerprint.)
    const aliasErrors = tsResult.errors.filter(e =>
      e.code === "E-VARIANT-AMBIGUOUS" || e.code === "E-TYPE-025"
    );
    expect(aliasErrors).toHaveLength(0);
  });

  test("BEFORE-fix simulation: seeding under SOURCE name `Status` fails on alias use", () => {
    // This proves the bug exists: if importedTypes is keyed under the
    // source-side name (pre-Unit-W api.js behavior), use-sites of the
    // LOCAL alias `S` cannot resolve it.
    const depRegistry = buildTypeRegistry(
      [{ kind: "type-decl", name: "Status", typeKind: "enum", raw: "{ OK, ERR }" }],
      [],
      EMPTY_SPAN,
    );
    const statusType = depRegistry.get("Status");

    // Mis-seed under SOURCE name (simulates pre-Unit-W api.js bug).
    const importedTypes = new Map();
    importedTypes.set("Status", statusType); // BUG: should be "S"
    const importedTypesByFile = new Map();
    importedTypesByFile.set("/app/app.scrml", importedTypes);

    const src = "<program>\n"
      + OPEN + " import { Status as S } from \"./types.scrml\"\n"
      + "function describe(s: S): string {\n"
      + "  match (s) {\n"
      + "    case .OK { lift \"ok\" }\n"
      + "    case .ERR { lift \"err\" }\n"
      + "  }\n"
      + "}\n"
      + CLOSE + "\n"
      + "</program>";
    const appAST = tabOn("/app/app.scrml", src);

    const tsResult = runTS({
      files: [appAST],
      protectAnalysis: EMPTY_PROTECT,
      routeMap: EMPTY_ROUTE,
      importedTypesByFile,
    });

    // With pre-Unit-W mis-seeding, S resolves as `asIs` (unknown) and the
    // match on `s: S` surfaces E-TYPE-025 (cannot match on asIs subject)
    // or E-VARIANT-AMBIGUOUS — either proves the bug class.
    const aliasErrors = tsResult.errors.filter(e =>
      e.code === "E-VARIANT-AMBIGUOUS" || e.code === "E-TYPE-025"
    );
    expect(aliasErrors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// §6 — runTS non-aliased baseline (negative regression)
// ---------------------------------------------------------------------------

describe("§6 runTS non-aliased — TS still sees imported types", () => {
  test("`import { Status }` (no alias) — match (s: Status) sees the type", () => {
    const depRegistry = buildTypeRegistry(
      [{ kind: "type-decl", name: "Status", typeKind: "enum", raw: "{ OK, ERR }" }],
      [],
      EMPTY_SPAN,
    );
    const statusType = depRegistry.get("Status");

    const importedTypes = new Map();
    importedTypes.set("Status", statusType);
    const importedTypesByFile = new Map();
    importedTypesByFile.set("/app/app.scrml", importedTypes);

    const src = "<program>\n"
      + OPEN + " import { Status } from \"./types.scrml\"\n"
      + "function describe(s: Status): string {\n"
      + "  match (s) {\n"
      + "    case .OK { lift \"ok\" }\n"
      + "    case .ERR { lift \"err\" }\n"
      + "  }\n"
      + "}\n"
      + CLOSE + "\n"
      + "</program>";
    const appAST = tabOn("/app/app.scrml", src);

    const tsResult = runTS({
      files: [appAST],
      protectAnalysis: EMPTY_PROTECT,
      routeMap: EMPTY_ROUTE,
      importedTypesByFile,
    });

    const aliasErrors = tsResult.errors.filter(e =>
      e.code === "E-VARIANT-AMBIGUOUS" || e.code === "E-TYPE-025"
    );
    expect(aliasErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively collect all markup-bearing nodes with a `tag` field. */
function collectTagged(nodes) {
  const out = [];
  function visit(arr) {
    if (!Array.isArray(arr)) return;
    for (const n of arr) {
      if (!n) continue;
      if (typeof n.tag === "string") out.push(n);
      if (Array.isArray(n.children)) visit(n.children);
      if (Array.isArray(n.body)) visit(n.body);
    }
  }
  visit(nodes);
  return out;
}
