/**
 * Derived engines — Move-14 inline-expression body (S83 B3)
 *
 * SPEC §51.0.J defines `<engine for=Type derived=match @x { ... }>` — the
 * rich form where the derived projection is an inline expression instead of
 * a single source-var (`derived=@x`, the §51.9 legacy projection).
 *
 * Pre-S83 the parser:
 *   - Used `machineRaw.indexOf(">")` which returned the `>` of the first `=>`
 *     arrow inside the match body (mis-bounding the opener).
 *   - Matched `derived=\s*@(IDENT)\b` only — the rich form fell through and
 *     the engine was treated as non-derived (W-ENGINE-INITIAL-MISSING).
 *
 * S83 B3 fix scope (parsing + codegen smoke-emit):
 *   - Brace-aware opener-end finder in ast-builder.js
 *   - New regex matches `derived=match @VAR { BODY }` and captures both
 *   - `engineDecl.inlineMatchBody` carries the raw body text; `sourceVar`
 *     keeps the upstream var (so DG + cycle-detection are unchanged)
 *   - symbol-table.ts stores derivedExpr as `{ kind: "inline-match", ... }`
 *   - emit-engine.ts buildDerivedEngineClosureBody lowers via `rewriteExpr`
 *
 * Out of scope (B3 follow-on):
 *   - Inline-expression non-match forms (`derived=fn(@x)`,
 *     `derived=if @a then .B else .C`, etc.)
 *   - Multi-upstream inline-match (`match { @a + @b }`)
 *   - Cross-arm refinements in match-body
 *   - Pipe-alternation arms (`.A | .B => .X`) — LANDED v0.2.4 #2 (S84). Both
 *     the parser (this file's §1) and codegen (§3 below) handle alternation.
 *     `rewriteMatchExpr` recognises `.A | .B | .C => result` and emits an
 *     OR-chain condition. Same path lights up for ${expr}-position match.
 *   - Type-system wiring against auto-declared engine variables
 *     (separate pre-existing E-ENGINE-004 bug — see master-list).
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function parse(source) {
  const bsOut = splitBlocks("test.scrml", source);
  return buildAST(bsOut);
}

function findEngine(nodes) {
  for (const n of nodes ?? []) {
    if (!n) continue;
    if (n.kind === "engine-decl") return n;
  }
  return null;
}

// ---------------------------------------------------------------------------
// §1 Parsing — `<engine for=T derived=match @x { ARMS }>` shape recognition
// ---------------------------------------------------------------------------

describe("§1 derived=match @x { ARMS } — parsing", () => {
  test("engine-decl is produced (no W-ENGINE-INITIAL-MISSING fallback)", () => {
    const src = `\${ type C:enum = { R, G, B }; <c> = C::R }
<engine for=C derived=match @c {
  .R => .R
  .G => .G
  .B => .B
}>
  <R/>
  <G/>
  <B/>
</>
<program><p>\${@c}</p></program>
`;
    const { ast, errors } = parse(src);
    const eng = findEngine(ast.nodes);
    expect(eng).not.toBeNull();
    expect(eng.kind).toBe("engine-decl");
    expect(eng.governedType).toBe("C");
    // sourceVar captures the upstream (single source: @c)
    expect(eng.sourceVar).toBe("c");
    // inlineMatchBody is non-null and contains arms
    expect(typeof eng.inlineMatchBody).toBe("string");
    expect(eng.inlineMatchBody.length).toBeGreaterThan(0);
    expect(eng.inlineMatchBody.includes(".R")).toBe(true);
  });

  test("brace-aware opener-end skips => inside arms (incl. alternation)", () => {
    // Pre-fix `indexOf(">")` returned the `>` of `=>` and headerLine was
    // truncated mid-arm; the brace-aware finder skips `{...}` content.
    // Note: pipe-alternation arms are PARSED (matchBody captured) but the
    // codegen `rewriteMatchExpr` does not yet split alternation — see
    // file header notes.
    const src = `<engine for=C derived=match @c {
  .A | .B => .A
  .X | .Y => .X
  _       => .A
}>
  <A/>
  <X/>
</>`;
    const { ast } = parse(src);
    const eng = findEngine(ast.nodes);
    expect(eng).not.toBeNull();
    expect(eng.governedType).toBe("C");
    expect(eng.sourceVar).toBe("c");
    // Body text captures the alternation verbatim.
    expect(eng.inlineMatchBody.includes(".A | .B")).toBe(true);
  });

  test("legacy derived=@x (no match body) still parses (regression guard)", () => {
    // The legacy single-source-var form must continue to work post-B3.
    const src = `\${ type C:enum = { R, G }; <c> = C::R }
<engine for=C derived=@c>
  <R/>
  <G/>
</>`;
    const { ast } = parse(src);
    const eng = findEngine(ast.nodes);
    expect(eng).not.toBeNull();
    expect(eng.sourceVar).toBe("c");
    // inlineMatchBody is null on the legacy shape.
    expect(eng.inlineMatchBody).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §2 Codegen smoke — emitDerivedEngineSubstrate produces inline-match
//
// We compile-shake the engine through the BS→TAB→SYM pipeline and check that
// the resulting engineMeta.derivedExpr carries the inline-match shape, AND
// that buildDerivedEngineClosureBody returns a non-trivial body (i.e. the
// match arms are lowered through rewriteExpr).
// ---------------------------------------------------------------------------

describe("§2 derived=match @x — codegen smoke (closure body shape)", () => {
  test("buildDerivedEngineClosureBody lowers inline-match through rewriteExpr", async () => {
    // Directly test the buildDerivedEngineClosureBody helper with a hand-rolled
    // derivedExpr object — this tests the codegen path without depending on
    // the full SYM pipeline. The shape mirrors what symbol-table.ts produces
    // when ast-builder emits engineDecl.inlineMatchBody.
    //
    // Since buildDerivedEngineClosureBody is a non-exported helper in
    // emit-engine.ts, we exercise it indirectly via the exported
    // emitDerivedEngineSubstrate which calls it.
    const { emitDerivedEngineSubstrate } = await import("../../src/codegen/emit-engine.ts");
    const meta = {
      forType: "C",
      variants: [],
      initialVariant: null,
      derivedExpr: {
        kind: "inline-match",
        upstream: "c",
        matchBody: ".A => .A\n.B => .B",
      },
      varName: "cell",
      isExported: false,
      isPinned: false,
      parentEngine: null,
      innerEngines: [],
      historyAttr: undefined,
      internalRules: undefined,
      onTimeoutElements: undefined,
    };
    const lines = emitDerivedEngineSubstrate(meta);
    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThan(0);
    const out = lines.join("\n");
    // The closure body uses `_scrml_reactive_get("c")` to read the upstream.
    expect(out.includes('_scrml_reactive_get("c")')).toBe(true);
    // The arms map to JS variant tags (rewriteEnumVariantAccess lowers
    // .A → "A" inside the IIFE produced by rewriteMatchExpr).
    expect(out.includes('"A"')).toBe(true);
    expect(out.includes('"B"')).toBe(true);
    // The substrate declares the derived cell.
    expect(out.includes('_scrml_derived_declare("cell"')).toBe(true);
    // Subscribe edge to upstream "c".
    expect(out.includes('_scrml_derived_subscribe("cell", "c")')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §3 derived=match @x with pipe-alternation arms — codegen smoke
//
// S84 v0.2.4 #2 follow-on: rewriteMatchExpr now handles `.A | .B | .C => result`
// arms. The derived-engine path inherits the fix because emit-engine.ts's
// buildDerivedEngineClosureBody lowers the inline-match body through the same
// rewriter (rewriteExpr → rewriteMatchExpr). This test asserts that the OR-chain
// condition appears in the emitted closure body.
// ---------------------------------------------------------------------------

describe("§3 derived=match @x { .A | .B => .X } — pipe-alternation codegen", () => {
  test("alternation arms lower to OR-chain in derived-engine closure body", async () => {
    const { emitDerivedEngineSubstrate } = await import("../../src/codegen/emit-engine.ts");
    const meta = {
      forType: "C",
      variants: [],
      initialVariant: null,
      derivedExpr: {
        kind: "inline-match",
        upstream: "c",
        matchBody: ".A | .B => .A\n.X | .Y => .X",
      },
      varName: "cell",
      isExported: false,
      isPinned: false,
      parentEngine: null,
      innerEngines: [],
      historyAttr: undefined,
      internalRules: undefined,
      onTimeoutElements: undefined,
    };
    const lines = emitDerivedEngineSubstrate(meta);
    const out = lines.join("\n");
    // The IIFE body must have an OR-chain for the first arm
    expect(out).toMatch(/=== "A" \|\| .*?=== "B"/);
    // And another OR-chain for the second arm
    expect(out).toMatch(/=== "X" \|\| .*?=== "Y"/);
    // Substrate emit is unchanged
    expect(out.includes('_scrml_derived_declare("cell"')).toBe(true);
    expect(out.includes('_scrml_derived_subscribe("cell", "c")')).toBe(true);
  });

  test("mixed alternation + singleton arms in derived-engine projection", async () => {
    const { emitDerivedEngineSubstrate } = await import("../../src/codegen/emit-engine.ts");
    const meta = {
      forType: "C",
      variants: [],
      initialVariant: null,
      derivedExpr: {
        kind: "inline-match",
        upstream: "c",
        matchBody: ".A => .A\n.B | .C | .D => .B",
      },
      varName: "cell",
      isExported: false,
      isPinned: false,
      parentEngine: null,
      innerEngines: [],
      historyAttr: undefined,
      internalRules: undefined,
      onTimeoutElements: undefined,
    };
    const lines = emitDerivedEngineSubstrate(meta);
    const out = lines.join("\n");
    // Singleton arm unchanged
    expect(out).toMatch(/=== "A"\) return/);
    // 3-way alternation arm
    expect(out).toMatch(/=== "B" \|\| .*?=== "C" \|\| .*?=== "D"/);
  });
});
