/**
 * P2 §21.2 Form 1 — Use-site verification (CE finds component regardless of export form)
 *
 * Coverage:
 *   §U1  No E-COMPONENT-020 fires when use-site references a Form-1 export
 *        (CE Path (b) successfully synthesizes the component-def from the
 *        export-decl raw).
 *   §U2  Use-site `<Component/>` produces no E-MARKUP-001 (the tag is
 *        recognized as a component, not an unknown HTML element).
 *   §U3  W2 invariant — the same use-site referencing a Form-2 export
 *        produces the same diagnostic shape (no errors). Confirms CE
 *        treats Form 1 and Form 2 identically at the use site.
 *
 * State-as-Primary unification — Phase P2 (2026-04-30).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "p2-form1-use-"));
});

afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function fx(rel, src) {
  const abs = join(TMP, rel);
  mkdirSync(join(abs, "..").replace(/\/$/, ""), { recursive: true });
  writeFileSync(abs, src);
  return abs;
}

// ---------------------------------------------------------------------------
// §U1 — Form 1 export, use-site at importer: no E-COMPONENT-020
// ---------------------------------------------------------------------------

describe("§U1 CE finds Form 1 components via path (b)", () => {
  test("use-site `<Form1Comp/>` produces NO E-COMPONENT-020", () => {
    const ROOT = join(TMP, "u1");
    mkdirSync(ROOT, { recursive: true });

    fx("u1/comp.scrml", `export <U1Form1Comp>
  <span class="u1-form1">form1</>
</>
`);
    const app = fx("u1/app.scrml", `<program>
\${
  import { U1Form1Comp } from './comp.scrml'
}
<div>
  <U1Form1Comp/>
</div>
</program>
`);

    const result = compileScrml({
      inputFiles: [app],
      outputDir: join(ROOT, "dist"),
      write: false,
      log: () => {},
    });

    const ceErrors = (result.errors || []).filter(
      e => e && typeof e.code === "string" && e.code.startsWith("E-COMPONENT-")
    );
    expect(ceErrors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §U2 — Form 1 use-site does not trigger E-MARKUP-001 (unknown HTML element)
// ---------------------------------------------------------------------------

describe("§U2 Form 1 component tags are not flagged as unknown HTML elements", () => {
  test("use-site `<Form1Tag/>` produces NO E-MARKUP-001", () => {
    const ROOT = join(TMP, "u2");
    mkdirSync(ROOT, { recursive: true });

    fx("u2/comp.scrml", `export <U2WidgetTag>
  <span class="u2-widget">widget</>
</>
`);
    const app = fx("u2/app.scrml", `<program>
\${
  import { U2WidgetTag } from './comp.scrml'
}
<div>
  <U2WidgetTag/>
</div>
</program>
`);

    const result = compileScrml({
      inputFiles: [app],
      outputDir: join(ROOT, "dist"),
      write: false,
      log: () => {},
    });

    const markupErrors = (result.errors || []).filter(
      e => e && e.code === "E-MARKUP-001"
    );
    expect(markupErrors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §U3 — Form 1 vs Form 2: error counts identical at use site
// ---------------------------------------------------------------------------

describe("§U3 Use-site error shape parity (Form 1 vs Form 2)", () => {
  test("compiling identical use-site against Form 1 vs Form 2 yields equivalent errors[]", () => {
    const ROOT = join(TMP, "u3");
    mkdirSync(ROOT, { recursive: true });

    // Two separate exporting files, only difference is Form 1 vs Form 2.
    const f1Path = fx("u3/comp1.scrml", `export <U3Same>
  <span class="u3-same">same</>
</>
`);
    const f2Path = fx("u3/comp2.scrml", `\${
  export const U3Same = <span class="u3-same">same</>
}
`);

    // Two importers, identical except for the import source.
    const app1 = fx("u3/app1.scrml", `<program>
\${
  import { U3Same } from './comp1.scrml'
}
<div>
  <U3Same/>
</div>
</program>
`);
    const app2 = fx("u3/app2.scrml", `<program>
\${
  import { U3Same } from './comp2.scrml'
}
<div>
  <U3Same/>
</div>
</program>
`);

    const r1 = compileScrml({
      inputFiles: [app1],
      outputDir: join(ROOT, "d1"),
      write: false,
      log: () => {},
    });
    const r2 = compileScrml({
      inputFiles: [app2],
      outputDir: join(ROOT, "d2"),
      write: false,
      log: () => {},
    });

    const e1Codes = (r1.errors || []).map(e => e.code).sort();
    const e2Codes = (r2.errors || []).map(e => e.code).sort();
    expect(e1Codes).toEqual(e2Codes);
    // Both should have ZERO errors for this clean fixture.
    expect(e1Codes).toEqual([]);
  });
});
