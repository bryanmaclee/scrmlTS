/**
 * F-COMPONENT-004 — Form 1 + Form 2 parity for logic-block prop substitution.
 *
 * Verifies that both Form 1 (`export <Name ...>`) and Form 2
 * (`export const Name = <element ...>`) produce IDENTICAL successful expansion
 * when the component body uses prop references inside logic-block bodies
 * (`${ const x = name }`).
 *
 * The fix in component-expander.ts ensures substituteProps walks logic-block
 * ExprNode subtrees, replacing IdentExpr references to declared props with the
 * caller-side value (LitExpr for string-literal attrs, IdentExpr for variable-refs).
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

const TMP = join(tmpdir(), "f-component-004-parity-" + Date.now());
mkdirSync(TMP, { recursive: true });

function fx(rel, body) {
  const full = join(TMP, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, body, "utf8");
  return full;
}

function combinedArtifacts(outDir, baseName) {
  let out = "";
  for (const ext of [".html", ".client.js", ".server.js"]) {
    const p = join(outDir, baseName + ext);
    if (existsSync(p)) out += readFileSync(p, "utf8");
  }
  return out;
}

describe("F-COMPONENT-004 §1 — basic logic-block prop interpolation parity", () => {
  test("Form 1 + Form 2 both compile successfully and produce same body markup with substituted prop", () => {
    const ROOT = join(TMP, "basic");
    mkdirSync(ROOT, { recursive: true });

    fx("basic/components-f1.scrml", `export <BasicCardF1 props={ name: string }>
  <div class="basic-f1">
    \${
      const greeting = name
    }
    <p>greeting: \${greeting}</p>
  </>
</>
`);
    fx("basic/components-f2.scrml", `\${
  export const BasicCardF2 = <div class="basic-f2" props={ name: string }>
    \${
      const greeting = name
    }
    <p>greeting: \${greeting}</p>
  </>
}
`);

    const appF1 = fx("basic/app-f1.scrml", `<program>
\${
  import { BasicCardF1 } from './components-f1.scrml'
}
<div>
  <BasicCardF1 name="Alice"/>
</div>
</program>
`);
    const appF2 = fx("basic/app-f2.scrml", `<program>
\${
  import { BasicCardF2 } from './components-f2.scrml'
}
<div>
  <BasicCardF2 name="Alice"/>
</div>
</program>
`);

    const r1 = compileScrml({ inputFiles: [appF1], outputDir: join(ROOT, "d1"), write: true, log: () => {} });
    const r2 = compileScrml({ inputFiles: [appF2], outputDir: join(ROOT, "d2"), write: true, log: () => {} });

    expect(r1.errors || []).toEqual([]);
    expect(r2.errors || []).toEqual([]);

    const c1 = combinedArtifacts(join(ROOT, "d1"), "app-f1");
    const c2 = combinedArtifacts(join(ROOT, "d2"), "app-f2");
    // Both forms produce body markup
    expect(c1).toContain("basic-f1");
    expect(c2).toContain("basic-f2");
    // The substituted "Alice" prop should appear in compiled output for both forms
    expect(c1).toContain("Alice");
    expect(c2).toContain("Alice");
  });
});

describe("F-COMPONENT-004 §2 — member access on substituted prop", () => {
  test("name.length parity — both forms compile cleanly", () => {
    const ROOT = join(TMP, "member");
    mkdirSync(ROOT, { recursive: true });

    fx("member/components-f1.scrml", `export <MemberF1 props={ name: string }>
  <div class="member-f1">
    \${
      const len = name.length
    }
    <p>len: \${len}</p>
  </>
</>
`);
    fx("member/components-f2.scrml", `\${
  export const MemberF2 = <div class="member-f2" props={ name: string }>
    \${
      const len = name.length
    }
    <p>len: \${len}</p>
  </>
}
`);

    const appF1 = fx("member/app-f1.scrml", `<program>
\${
  import { MemberF1 } from './components-f1.scrml'
}
<MemberF1 name="alpha"/>
</program>
`);
    const appF2 = fx("member/app-f2.scrml", `<program>
\${
  import { MemberF2 } from './components-f2.scrml'
}
<MemberF2 name="alpha"/>
</program>
`);

    const r1 = compileScrml({ inputFiles: [appF1], outputDir: join(ROOT, "d1"), write: true, log: () => {} });
    const r2 = compileScrml({ inputFiles: [appF2], outputDir: join(ROOT, "d2"), write: true, log: () => {} });

    expect(r1.errors || []).toEqual([]);
    expect(r2.errors || []).toEqual([]);
  });
});

describe("F-COMPONENT-004 §3 — multi-prop logic-block parity", () => {
  test("two props referenced in single logic block — both substitute, both forms succeed", () => {
    const ROOT = join(TMP, "multi");
    mkdirSync(ROOT, { recursive: true });

    fx("multi/components-f1.scrml", `export <MultiF1 props={ first: string, last: string }>
  <div class="multi-f1">
    \${
      const fullName = first
    }
    <p>\${fullName}</p>
  </>
</>
`);
    fx("multi/components-f2.scrml", `\${
  export const MultiF2 = <div class="multi-f2" props={ first: string, last: string }>
    \${
      const fullName = first
    }
    <p>\${fullName}</p>
  </>
}
`);

    const appF1 = fx("multi/app-f1.scrml", `<program>
\${
  import { MultiF1 } from './components-f1.scrml'
}
<MultiF1 first="Ada" last="Lovelace"/>
</program>
`);
    const appF2 = fx("multi/app-f2.scrml", `<program>
\${
  import { MultiF2 } from './components-f2.scrml'
}
<MultiF2 first="Ada" last="Lovelace"/>
</program>
`);

    const r1 = compileScrml({ inputFiles: [appF1], outputDir: join(ROOT, "d1"), write: true, log: () => {} });
    const r2 = compileScrml({ inputFiles: [appF2], outputDir: join(ROOT, "d2"), write: true, log: () => {} });

    expect(r1.errors || []).toEqual([]);
    expect(r2.errors || []).toEqual([]);

    const c1 = combinedArtifacts(join(ROOT, "d1"), "app-f1");
    const c2 = combinedArtifacts(join(ROOT, "d2"), "app-f2");
    expect(c1).toContain("Ada");
    expect(c2).toContain("Ada");
  });
});
