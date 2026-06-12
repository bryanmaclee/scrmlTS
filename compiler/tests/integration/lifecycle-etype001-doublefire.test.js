/**
 * Bug 1 (S184 lifecycle arc) — E-TYPE-001 double-fire on a struct-field-on-cell
 * read.
 *
 * A single pre-transition read of a lifecycle struct FIELD through a `<state>`
 * cell (`<u>: User` where `User` carries `passwordHash: (not to string)`, read
 * `@u.passwordHash`) emitted TWO identical E-TYPE-001 errors. Root cause:
 * `statementText()` in `checkLifecycleFieldAccess` deduped source fragments via
 * an EXACT-string Set; the structured `exprNode` rendering (`@u.passwordHash`)
 * and the raw `node.init` (`@u . passwordHash`) are the SAME access in two
 * whitespace renderings, so they keyed as distinct entries — both survived the
 * join, and `extractAccesses` (whitespace-tolerant `\s*\.\s*` regex) matched
 * the access twice. Fix: the dedup key is whitespace-normalized so the two
 * renderings collapse to one fragment.
 *
 * The cell-VALUE-typed Shape 1 case (`<st>: (not to User) = not`, read
 * `@st.name`) was always correct (1 fire — it routes through a different
 * walker, `checkLifecycleBindingAccess`). These tests lock both: the bug must
 * be 1, the always-correct case stays 1, and the count must scale LINEARLY
 * (two distinct reads -> two fires, not 2N).
 *
 * PIPELINE-LEVEL: these go through `compileScrml()` end-to-end. The Landing-1
 * unit tests (`lifecycle-shape1-tracker.test.js` Test 13 `toBe(1)`) invoke a
 * SINGLE walker on a synthesized AST and therefore could not observe the
 * double-fire, which only manifested across the full type-system pass on the
 * real parsed source.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "lifecycle-etype001-"));
});

afterAll(() => {
  if (TMP) rmSync(TMP, { recursive: true, force: true });
});

function compileSource(name, source) {
  const filePath = join(TMP, `${name}.scrml`);
  writeFileSync(filePath, source);
  const outDir = join(TMP, `${name}.dist`);
  const result = compileScrml({
    inputFiles: [filePath],
    outputDir: outDir,
    write: false,
    log: () => {},
  });
  return {
    errors: result.errors || [],
    warnings: result.warnings || [],
  };
}

// Cross-stream diagnostic helper (S92 partition) — E-* codes are fatal and
// land in result.errors, but search both streams so an accidental severity
// reclassification can't silently zero this assertion.
function findDiagnostic(result, code) {
  return [
    ...(result.errors || []).filter(e => e.code === code),
    ...(result.warnings || []).filter(e => e.code === code),
  ];
}

describe("Bug 1 — E-TYPE-001 double-fire on struct-field-on-cell read", () => {
  test("struct-field-on-cell pre-transition read fires E-TYPE-001 exactly ONCE (top-level)", () => {
    const src =
      `type User:struct = { id: number, passwordHash: (not to string) }\n` +
      `<u>: User = { id: 1, passwordHash: not }\n` +
      `\${ const leaked = @u.passwordHash }\n`;
    const result = compileSource("structcell-toplevel", src);
    expect(findDiagnostic(result, "E-TYPE-001").length).toBe(1);
  });

  test("struct-field-on-cell pre-transition read fires E-TYPE-001 exactly ONCE (fn body)", () => {
    const src =
      `type User:struct = { id: number, passwordHash: (not to string) }\n` +
      `<u>: User = { id: 1, passwordHash: not }\n` +
      `function f() {\n` +
      `  const x = @u.passwordHash\n` +
      `}\n`;
    const result = compileSource("structcell-fnbody", src);
    expect(findDiagnostic(result, "E-TYPE-001").length).toBe(1);
  });

  test("cell-value-typed Shape 1 pre-transition read stays exactly ONE (no regression)", () => {
    const src =
      `type User:struct = { id: number, name: string }\n` +
      `<st>: (not to User) = not\n` +
      `\${ const leaked = @st.name }\n`;
    const result = compileSource("cellvalue-typed", src);
    expect(findDiagnostic(result, "E-TYPE-001").length).toBe(1);
  });

  test("two distinct pre-transition reads fire E-TYPE-001 LINEARLY (2 reads -> 2, not 4)", () => {
    const src =
      `type User:struct = { id: number, passwordHash: (not to string) }\n` +
      `<u>: User = { id: 1, passwordHash: not }\n` +
      `\${ const a = @u.passwordHash\n` +
      `   const b = @u.passwordHash }\n`;
    const result = compileSource("two-reads", src);
    expect(findDiagnostic(result, "E-TYPE-001").length).toBe(2);
  });
});
