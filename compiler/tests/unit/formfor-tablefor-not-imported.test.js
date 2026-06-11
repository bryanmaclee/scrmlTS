/**
 * formfor-tablefor-not-imported.test.js — S183
 * E-FORMFOR-NOT-IMPORTED / E-TABLEFOR-NOT-IMPORTED.
 *
 * A `<formFor for=T .../>` or `<tableFor for=T rows=@c/>` markup element used
 * WITHOUT `import { formFor } from 'scrml:data'` (resp. `tableFor`) previously
 * compiled clean (exit 0, zero diagnostic) and emitted a LITERAL `<formFor>` /
 * `<tableFor>` HTML tag → silent blank (the form/table never generated). User
 * ruled this a hard ERROR (S183), same silent-drop-of-a-known-construct class as
 * the S182 engine `E-ENGINE-EFFECT-NOT-INTERPOLATED`.
 *
 * The import-absent detection scan (type-system.ts
 * `scanForUnimportedTypeDataElement`) is the `else` arm of the
 * formForLocals/tableForLocals.size>0 expansion gate. It mirrors the expansion
 * walker's descent (children/body/bodyChildren/armBodyChildren) so any node the
 * walker WOULD have expanded is detected here too. One Error per offending node.
 *
 * Both codes are severity:error → they land in `result.errors`. The assertions
 * use a cross-stream helper to be robust regardless of partition.
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import fs from "fs";
import path from "path";
import os from "os";

function compileSrcToTmp(src, basename = "formfor-tablefor-test") {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ff-tf-"));
  const srcPath = path.join(tmpDir, `${basename}.scrml`);
  fs.writeFileSync(srcPath, src);
  try {
    const result = compileScrml({
      inputFiles: [srcPath],
      write: true,
      outputDir: tmpDir,
    });
    return {
      result,
      html: fs.existsSync(path.join(tmpDir, `${basename}.html`))
        ? fs.readFileSync(path.join(tmpDir, `${basename}.html`), "utf-8")
        : null,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Cross-stream diagnostic collector — robust regardless of which stream the
// code lands in (these are Errors → result.errors, but a `.filter` on the wrong
// stream silently passes, so we merge both).
function allDiags(result) {
  return [...(result.errors ?? []), ...(result.warnings ?? [])];
}
function diagCodes(result) {
  return allDiags(result).map((d) => d.code);
}

describe("S183 — E-FORMFOR-NOT-IMPORTED", () => {
  test("<formFor> without import → E-FORMFOR-NOT-IMPORTED (Error)", () => {
    const src = `\${
    type Signup:struct = { name: string req length(>=2), agree: boolean req }
    server function persistSignup(values: Signup) ! string { return "ok" }
}
<program>
    <formFor for=Signup onsubmit=persistSignup/>
</program>`;
    const { result } = compileSrcToTmp(src);
    expect(diagCodes(result)).toContain("E-FORMFOR-NOT-IMPORTED");
    const fired = allDiags(result).find((d) => d.code === "E-FORMFOR-NOT-IMPORTED");
    expect(fired).toBeDefined();
    expect(fired.severity).toBe("error");
    // The message names the primitive + points at the import fix.
    expect(fired.message).toContain("formFor");
    expect(fired.message).toContain("scrml:data");
    // It lands in the Error stream (CLI exit 1).
    expect((result.errors ?? []).some((e) => e.code === "E-FORMFOR-NOT-IMPORTED")).toBe(true);
  });

  test("two unimported <formFor> nodes → two E-FORMFOR-NOT-IMPORTED (fan-out)", () => {
    const src = `\${
    type Signup:struct = { name: string req, agree: boolean req }
}
<program>
    <formFor for=Signup/>
    <formFor for=Signup/>
</program>`;
    const { result } = compileSrcToTmp(src);
    const count = diagCodes(result).filter((c) => c === "E-FORMFOR-NOT-IMPORTED").length;
    expect(count).toBe(2);
  });
});

describe("S183 — E-TABLEFOR-NOT-IMPORTED", () => {
  test("<tableFor> without import → E-TABLEFOR-NOT-IMPORTED (Error)", () => {
    const src = `\${
    type Load:struct = { id: string, status: string }
    <rows>: Load[] = []
}
<program>
    <tableFor for=Load rows=@rows/>
</program>`;
    const { result } = compileSrcToTmp(src);
    expect(diagCodes(result)).toContain("E-TABLEFOR-NOT-IMPORTED");
    const fired = allDiags(result).find((d) => d.code === "E-TABLEFOR-NOT-IMPORTED");
    expect(fired).toBeDefined();
    expect(fired.severity).toBe("error");
    expect(fired.message).toContain("tableFor");
    expect(fired.message).toContain("scrml:data");
    expect((result.errors ?? []).some((e) => e.code === "E-TABLEFOR-NOT-IMPORTED")).toBe(true);
  });
});

describe("S183 — canonical WITH import does NOT fire + still expands (regression)", () => {
  test("canonical <formFor> with import → NO *-NOT-IMPORTED; data-scrml-formfor emitted", () => {
    const src = `\${
    import { formFor } from 'scrml:data'
    type Signup:struct = { name: string req length(>=2), agree: boolean req }
    server function persistSignup(values: Signup) ! string { return "ok" }
}
<program>
    <formFor for=Signup onsubmit=persistSignup/>
</program>`;
    const { result, html } = compileSrcToTmp(src);
    expect(diagCodes(result)).not.toContain("E-FORMFOR-NOT-IMPORTED");
    // The expansion walker still ran — the form markup is generated.
    expect(html).not.toBeNull();
    expect(html).toContain("data-scrml-formfor");
  });

  test("canonical <tableFor> with import → NO *-NOT-IMPORTED; data-scrml-tablefor emitted", () => {
    const src = `\${
    import { tableFor } from 'scrml:data'
    type Load:struct = { id: string, status: string }
    <rows>: Load[] = []
}
<program>
    <tableFor for=Load rows=@rows/>
</program>`;
    const { result, html } = compileSrcToTmp(src);
    expect(diagCodes(result)).not.toContain("E-TABLEFOR-NOT-IMPORTED");
    expect(html).not.toBeNull();
    expect(html).toContain("data-scrml-tablefor");
  });
});

describe("S183 — import-one-use-the-other → the missing one fires", () => {
  test("import formFor but use <tableFor> → E-TABLEFOR-NOT-IMPORTED (the missing one)", () => {
    const src = `\${
    import { formFor } from 'scrml:data'
    type Load:struct = { id: string, status: string }
    <rows>: Load[] = []
}
<program>
    <tableFor for=Load rows=@rows/>
</program>`;
    const { result } = compileSrcToTmp(src);
    const codes = diagCodes(result);
    // The imported one (formFor) is irrelevant here; the USED-but-unimported
    // tableFor fires.
    expect(codes).toContain("E-TABLEFOR-NOT-IMPORTED");
    // And the formFor code does NOT spuriously fire (no <formFor> present).
    expect(codes).not.toContain("E-FORMFOR-NOT-IMPORTED");
  });
});
