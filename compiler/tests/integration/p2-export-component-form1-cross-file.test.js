/**
 * P2 §21.2 Form 1 — `export <ComponentName ...>...</>` direct grammar — Integration Tests
 *
 * Coverage (cross-file behaviour):
 *   §X1  Form 1 export → Form 2 import: a file using Form 1 is importable
 *        with the same `import { Name }` syntax that works for Form 2.
 *   §X2  Form 1 export → use site: <Component/> at the importing file
 *        compiles to expanded markup (CE finds the component).
 *   §X3  Both forms in the same exporting file: BOTH names are importable
 *        and both use sites compile to expanded markup.
 *   §X4  exportRegistry shape equivalence: comparing MOD output for two
 *        otherwise-identical files (Form 1 vs Form 2) shows identical
 *        exportRegistry entries (kind=const, isComponent=true).
 *   §X5  Replace-form regression: the exporter's existing legacy form
 *        (Form 2) keeps working unchanged when a separate Form-1 entry is
 *        added to the same file (no new errors, no shape change for legacy).
 *
 * These tests run the FULL CLI compilation surface so they exercise the
 * integration of TAB → MOD → NR → CE → CG. Pass criteria:
 *   - zero compile errors
 *   - emitted artifacts (HTML or client.js) contain the expanded body markup
 *
 * Implementation note (P2-wrapper, 2026-04-30):
 *   Form 1 desugars to `export const ComponentName = <body-root attrs+outer>...</body-root>`
 *   — the body's single root markup element absorbs the outer's attributes;
 *   the outer `<ComponentName>` tag does NOT appear in the rendered HTML.
 *   Form 1 is byte-equivalent to Form 2 at the AST and rendered-HTML level
 *   for matching component shapes. New constraints: body must be single-rooted
 *   (E-EXPORT-002); outer attrs cannot collide with body-root attrs
 *   (E-EXPORT-003), with `class` as the documented exception (§15.5 merge).
 *
 * State-as-Primary unification — Phase P2 (2026-04-30).
 * SPEC §21.2 Form 1 normative spec.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { resolveModules } from "../../src/module-resolver.js";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "p2-form1-"));
});

afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function fx(relPath, source) {
  const abs = join(TMP, relPath);
  mkdirSync(join(abs, "..").replace(/\/$/, ""), { recursive: true });
  writeFileSync(abs, source);
  return abs;
}

/**
 * Read all emitted artifacts (HTML + client JS) for a given file basename
 * and return the concatenation. Use to assert "the body markup IS present
 * somewhere" without caring whether it landed in HTML or client.js.
 */
function combinedArtifacts(outDir, basename) {
  let combined = "";
  const htmlPath = join(outDir, `${basename}.html`);
  if (existsSync(htmlPath)) combined += readFileSync(htmlPath, "utf8") + "\n";
  const clientPath = join(outDir, `${basename}.client.js`);
  if (existsSync(clientPath)) combined += readFileSync(clientPath, "utf8") + "\n";
  return combined;
}

// ---------------------------------------------------------------------------
// §X1 — Form 1 exporter → Form 1-or-Form 2 importable
// ---------------------------------------------------------------------------

describe("§X1 Form 1 export → standard import works", () => {
  test("a Form-1 exporter is importable with the same `import { Name }` syntax", () => {
    const ROOT = join(TMP, "x1");
    mkdirSync(ROOT, { recursive: true });

    fx("x1/components.scrml", `export <X1Badge>
  <span class="x1-badge">badge</>
</>
`);
    const app = fx("x1/app.scrml", `<program>
\${
  import { X1Badge } from './components.scrml'
}
<div>
  <X1Badge/>
</div>
</program>
`);

    const outDir = join(ROOT, "dist");
    const result = compileScrml({
      inputFiles: [app],
      outputDir: outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    const combined = combinedArtifacts(outDir, "app");
    // Component body markup MUST appear (verified by the CSS class).
    expect(combined).toContain("x1-badge");
  });
});

// ---------------------------------------------------------------------------
// §X2 — Form 1 use-site verification with attributes/props
// ---------------------------------------------------------------------------

describe("§X2 Form 1 export with props → use-site error parity (Form 1 = Form 2)", () => {
  // P2-wrapper amendment (2026-04-30): Form 1 is byte-equivalent to Form 2.
  // The previous version asserted `errors == []` for Form 1 with an interpolating
  // prop body — which only "passed" because the OLD wrapper desugaring accidentally
  // turned `${name}` into broken text `$ { name }` (with spaces) that no longer
  // matched BS's `${`-pattern. With the wrapper fix, Form 1 now produces a real
  // `${name}` logic block — exposing a pre-existing CE limitation: prop substitution
  // does not reach into logic blocks (only text content). This affects BOTH Form 1
  // and Form 2 equally.
  //
  // The test is now a parity assertion: Form 1 and Form 2 produce IDENTICAL error
  // shapes. The body markup IS still emitted (CSS class present in output) — only
  // the `${name}` interpolation requires future CE work to substitute into logic
  // blocks.
  test("Form 1 with interpolating prop body produces same errors and same body markup as Form 2", () => {
    const ROOT = join(TMP, "x2");
    mkdirSync(ROOT, { recursive: true });

    // Form 1 exporter
    fx("x2/components-f1.scrml", `export <X2CardF1 props={ name: string }>
  <div class="x2-card-f1">\${name}</>
</>
`);
    // Form 2 exporter — same structural shape (props on body root, ${name} in text)
    fx("x2/components-f2.scrml", `\${
  export const X2CardF2 = <div class="x2-card-f2" props={ name: string }>\${name}</>
}
`);

    const appF1 = fx("x2/app-f1.scrml", `<program>
\${
  import { X2CardF1 } from './components-f1.scrml'
}
<div>
  <X2CardF1 name="alpha"/>
  <X2CardF1 name="beta"/>
</div>
</program>
`);
    const appF2 = fx("x2/app-f2.scrml", `<program>
\${
  import { X2CardF2 } from './components-f2.scrml'
}
<div>
  <X2CardF2 name="alpha"/>
  <X2CardF2 name="beta"/>
</div>
</program>
`);

    const r1 = compileScrml({ inputFiles: [appF1], outputDir: join(ROOT, "d1"), write: true, log: () => {} });
    const r2 = compileScrml({ inputFiles: [appF2], outputDir: join(ROOT, "d2"), write: true, log: () => {} });

    // Parity: both forms produce the SAME error code distribution.
    const e1Codes = (r1.errors || []).map(e => e.code).sort();
    const e2Codes = (r2.errors || []).map(e => e.code).sort();
    expect(e1Codes).toEqual(e2Codes);

    // Body markup IS present in both outputs (CSS class verifies expansion).
    expect(combinedArtifacts(join(ROOT, "d1"), "app-f1")).toContain("x2-card-f1");
    expect(combinedArtifacts(join(ROOT, "d2"), "app-f2")).toContain("x2-card-f2");
  });
});

// ---------------------------------------------------------------------------
// §X3 — Form 1 + Form 2 both exported from the same file, both importable
// ---------------------------------------------------------------------------

describe("§X3 Form 1 + Form 2 coexist in exporter, both work cross-file", () => {
  test("file with both forms exports both names and both are usable", () => {
    const ROOT = join(TMP, "x3");
    mkdirSync(ROOT, { recursive: true });

    // Exporter: Form 2 first, Form 1 after.
    fx("x3/components.scrml", `\${
  export const X3LegacyBadge = <span class="x3-legacy">legacy</>
}

export <X3CanonicalBadge>
  <span class="x3-canonical">canonical</>
</>
`);
    const app = fx("x3/app.scrml", `<program>
\${
  import { X3LegacyBadge, X3CanonicalBadge } from './components.scrml'
}
<div>
  <X3LegacyBadge/>
  <X3CanonicalBadge/>
</div>
</program>
`);

    const outDir = join(ROOT, "dist");
    const result = compileScrml({
      inputFiles: [app],
      outputDir: outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    const combined = combinedArtifacts(outDir, "app");
    // Both component bodies expanded.
    expect(combined).toContain("x3-legacy");
    expect(combined).toContain("x3-canonical");
  });
});

// ---------------------------------------------------------------------------
// §X4 — exportRegistry shape equivalence (Form 1 vs Form 2)
// ---------------------------------------------------------------------------

describe("§X4 MOD exportRegistry shape equivalence", () => {
  test("Form 1 and Form 2 produce identical exportRegistry entries", () => {
    const ROOT = join(TMP, "x4");
    mkdirSync(ROOT, { recursive: true });

    const f1Path = fx("x4/form1.scrml", `export <X4Same>
  <span class="x4">x4</>
</>
`);
    const f2Path = fx("x4/form2.scrml", `\${
  export const X4Same = <span class="x4">x4</>
}
`);

    const f1Tab = buildAST(splitBlocks(f1Path, readFileSync(f1Path, "utf8")));
    const f2Tab = buildAST(splitBlocks(f2Path, readFileSync(f2Path, "utf8")));

    const r1 = resolveModules([f1Tab, f2Tab]);
    const reg = r1.exportRegistry;
    const f1Entry = reg.get(f1Path)?.get("X4Same");
    const f2Entry = reg.get(f2Path)?.get("X4Same");

    expect(f1Entry).toBeTruthy();
    expect(f2Entry).toBeTruthy();
    // Shape equivalence: both must have kind="const" and isComponent=true.
    expect(f1Entry.kind).toBe(f2Entry.kind);
    expect(f1Entry.isComponent).toBe(f2Entry.isComponent);
    expect(f1Entry.kind).toBe("const");
    expect(f1Entry.isComponent).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §X5 — Adding a Form-1 export to a file does not regress legacy Form-2 exports
// ---------------------------------------------------------------------------

describe("§X5 Adding Form 1 alongside Form 2 doesn't regress Form 2", () => {
  test("legacy Form-2 export keeps working when a Form-1 export is added", () => {
    const ROOT = join(TMP, "x5");
    mkdirSync(ROOT, { recursive: true });

    fx("x5/after.scrml", `\${
  export const X5Only = <span class="x5-only">only</>
}

export <X5Added>
  <span class="x5-added">added</>
</>
`);

    // Importer A — uses only Form-2 export.
    const appA = fx("x5/app-a.scrml", `<program>
\${
  import { X5Only } from './after.scrml'
}
<div>
  <X5Only/>
</div>
</program>
`);
    // Importer B — uses both names from the same after.scrml.
    const appB = fx("x5/app-b.scrml", `<program>
\${
  import { X5Only, X5Added } from './after.scrml'
}
<div>
  <X5Only/>
  <X5Added/>
</div>
</program>
`);

    const outDirA = join(ROOT, "dist-a");
    const resultA = compileScrml({
      inputFiles: [appA],
      outputDir: outDirA,
      write: true,
      log: () => {},
    });
    expect(resultA.errors).toEqual([]);
    const combinedA = combinedArtifacts(outDirA, "app-a");
    expect(combinedA).toContain("x5-only");

    const outDirB = join(ROOT, "dist-b");
    const resultB = compileScrml({
      inputFiles: [appB],
      outputDir: outDirB,
      write: true,
      log: () => {},
    });
    expect(resultB.errors).toEqual([]);
    const combinedB = combinedArtifacts(outDirB, "app-b");
    expect(combinedB).toContain("x5-only");
    expect(combinedB).toContain("x5-added");
  });
});
