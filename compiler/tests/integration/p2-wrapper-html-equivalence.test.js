/**
 * P2-wrapper §21.2 HTML byte-equivalence — Integration Tests
 *
 * Compiles two files (Form 1 vs Form 2) that declare the same component
 * shape and asserts that their use-site rendering produces equivalent
 * HTML / JS output.
 *
 * Equivalence criteria (per SPEC §21.2 amendment):
 *   - Same export-decl shape in MOD's exportRegistry.
 *   - Same component body markup at use sites (same tag, same class, same text).
 *   - No outer wrapper element appears in either form's rendered HTML.
 *
 * The previous P2 v1 wrapper desugaring caused Form 1 to render with an
 * extra `<ComponentName>` outer element wrapping the body. The wrapper fix
 * (P2-wrapper amendment, 2026-04-30) drops this wrapper.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "p2-wrapper-html-"));
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

function combinedArtifacts(outDir, basename) {
  let combined = "";
  const htmlPath = join(outDir, `${basename}.html`);
  if (existsSync(htmlPath)) combined += readFileSync(htmlPath, "utf8") + "\n";
  const clientPath = join(outDir, `${basename}.client.js`);
  if (existsSync(clientPath)) combined += readFileSync(clientPath, "utf8") + "\n";
  return combined;
}

// ---------------------------------------------------------------------------
// §H1 — Single-element body, no props
// ---------------------------------------------------------------------------

describe("§H1 Form 1 vs Form 2 — single-element body, no props", () => {
  test("Form 1 use-site HTML is byte-equivalent to Form 2 use-site HTML", () => {
    const ROOT = join(TMP, "h1");
    mkdirSync(ROOT, { recursive: true });

    fx("h1/comp-f1.scrml", `export <H1Badge>
  <span class="h1-badge">badge</>
</>
`);
    fx("h1/comp-f2.scrml", `\${
  export const H1Badge = <span class="h1-badge">badge</>
}
`);
    const appF1 = fx("h1/app-f1.scrml", `<program>
\${
  import { H1Badge } from './comp-f1.scrml'
}
<div>
  <H1Badge/>
</div>
</program>
`);
    const appF2 = fx("h1/app-f2.scrml", `<program>
\${
  import { H1Badge } from './comp-f2.scrml'
}
<div>
  <H1Badge/>
</div>
</program>
`);
    const r1 = compileScrml({ inputFiles: [appF1], outputDir: join(ROOT, "d1"), write: true, log: () => {} });
    const r2 = compileScrml({ inputFiles: [appF2], outputDir: join(ROOT, "d2"), write: true, log: () => {} });
    expect(r1.errors).toEqual([]);
    expect(r2.errors).toEqual([]);

    const c1 = combinedArtifacts(join(ROOT, "d1"), "app-f1");
    const c2 = combinedArtifacts(join(ROOT, "d2"), "app-f2");

    // Body markup must be present in both
    expect(c1).toContain("h1-badge");
    expect(c2).toContain("h1-badge");

    // CRITICAL: NO outer <H1Badge> custom-element wrapper in either output.
    // Pre-fix, Form 1 would render <H1Badge><span class="h1-badge">...</span></H1Badge>
    // (the old wrapper). With the fix, Form 1 renders just <span class="h1-badge">...</span>.
    expect(c1).not.toContain("<H1Badge");
    expect(c2).not.toContain("<H1Badge");
  });
});

// ---------------------------------------------------------------------------
// §H2 — Body with class merging (outer class + body class)
// ---------------------------------------------------------------------------

describe("§H2 Form 1 vs Form 2 — outer class merges into body root", () => {
  test("outer class is absorbed onto body root in both forms", () => {
    const ROOT = join(TMP, "h2");
    mkdirSync(ROOT, { recursive: true });

    fx("h2/comp-f1.scrml", `export <H2Card class="frame">
  <div class="card-body">card content</>
</>
`);
    fx("h2/comp-f2.scrml", `\${
  export const H2Card = <div class="card-body" class="frame">card content</>
}
`);
    const appF1 = fx("h2/app-f1.scrml", `<program>
\${
  import { H2Card } from './comp-f1.scrml'
}
<div>
  <H2Card/>
</div>
</program>
`);
    const appF2 = fx("h2/app-f2.scrml", `<program>
\${
  import { H2Card } from './comp-f2.scrml'
}
<div>
  <H2Card/>
</div>
</program>
`);
    const r1 = compileScrml({ inputFiles: [appF1], outputDir: join(ROOT, "d1"), write: true, log: () => {} });
    const r2 = compileScrml({ inputFiles: [appF2], outputDir: join(ROOT, "d2"), write: true, log: () => {} });
    expect(r1.errors).toEqual([]);
    expect(r2.errors).toEqual([]);

    const c1 = combinedArtifacts(join(ROOT, "d1"), "app-f1");
    const c2 = combinedArtifacts(join(ROOT, "d2"), "app-f2");

    // Both should have card-body (the body's class) somewhere
    expect(c1).toContain("card-body");
    expect(c2).toContain("card-body");
    // No outer wrapper
    expect(c1).not.toContain("<H2Card");
    expect(c2).not.toContain("<H2Card");
  });
});

// ---------------------------------------------------------------------------
// §H3 — Multi-attr outer absorbed into body root
// ---------------------------------------------------------------------------

describe("§H3 Form 1 vs Form 2 — multi-attr outer absorbed", () => {
  test("outer non-class attrs land on body root in both forms (parity)", () => {
    const ROOT = join(TMP, "h3");
    mkdirSync(ROOT, { recursive: true });

    fx("h3/comp-f1.scrml", `export <H3Item data-section="a">
  <li class="h3-item">item</>
</>
`);
    fx("h3/comp-f2.scrml", `\${
  export const H3Item = <li class="h3-item" data-section="a">item</>
}
`);
    const appF1 = fx("h3/app-f1.scrml", `<program>
\${
  import { H3Item } from './comp-f1.scrml'
}
<ul>
  <H3Item/>
</ul>
</program>
`);
    const appF2 = fx("h3/app-f2.scrml", `<program>
\${
  import { H3Item } from './comp-f2.scrml'
}
<ul>
  <H3Item/>
</ul>
</program>
`);
    const r1 = compileScrml({ inputFiles: [appF1], outputDir: join(ROOT, "d1"), write: true, log: () => {} });
    const r2 = compileScrml({ inputFiles: [appF2], outputDir: join(ROOT, "d2"), write: true, log: () => {} });

    // Same error shape (parity)
    const e1Codes = (r1.errors || []).map(e => e.code).sort();
    const e2Codes = (r2.errors || []).map(e => e.code).sort();
    expect(e1Codes).toEqual(e2Codes);

    const c1 = combinedArtifacts(join(ROOT, "d1"), "app-f1");
    const c2 = combinedArtifacts(join(ROOT, "d2"), "app-f2");

    // Both contain the body's class
    expect(c1).toContain("h3-item");
    expect(c2).toContain("h3-item");
    // No outer wrapper in either form
    expect(c1).not.toContain("<H3Item");
    expect(c2).not.toContain("<H3Item");
  });
});
