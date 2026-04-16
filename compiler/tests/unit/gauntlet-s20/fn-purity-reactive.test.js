/**
 * fn-purity-reactive.test.js — Regression test for fn purity + reactive writes
 *
 * Bug: E-FN-003 did not fire when fn body contained reactive variable writes
 * (@var = value or @var += value). Fixed in S20 gauntlet.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join, resolve } from "path";
import { compileScrml } from "../../../src/api.js";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/fn-purity-reactive");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

beforeAll(() => { mkdirSync(FIXTURE_DIR, { recursive: true }); });
afterAll(() => { rmSync(FIXTURE_DIR, { recursive: true, force: true }); });

function compileSource(source, filename = "test.scrml") {
  const filePath = resolve(join(FIXTURE_DIR, filename));
  writeFileSync(filePath, source);
  const result = compileScrml({ inputFiles: [filePath], outputDir: FIXTURE_OUTPUT, write: false });
  const allErrors = result.errors || [];
  return {
    errors: allErrors,
    fatalErrors: allErrors.filter(e => e.severity !== "warning"),
  };
}

describe("E-FN-003: reactive writes inside fn body", () => {
  test("@var = value inside fn fires E-FN-003", () => {
    const source = `<program>
\${ @counter = 0 }
\${
  fn badWrite(a) {
    @counter = a
    return a
  }
}
<p>Test</>
</program>`;
    const { fatalErrors } = compileSource(source, "fn-reactive-assign.scrml");
    const fn003 = fatalErrors.filter(e => e.code === "E-FN-003");
    expect(fn003.length).toBeGreaterThanOrEqual(1);
    expect(fn003[0].message).toContain("@counter");
  });

  test("@var += value inside fn fires E-FN-003", () => {
    const source = `<program>
\${ @count = 0 }
\${
  fn badCompound(a) {
    @count += 1
    return a
  }
}
<p>Test</>
</program>`;
    const { fatalErrors } = compileSource(source, "fn-reactive-compound.scrml");
    const fn003 = fatalErrors.filter(e => e.code === "E-FN-003");
    expect(fn003.length).toBeGreaterThanOrEqual(1);
    expect(fn003[0].message).toContain("@count");
  });

  test("@var READ inside fn does NOT fire E-FN-003", () => {
    const source = `<program>
\${ @value = 42 }
\${
  fn pureRead(a) {
    return a + @value
  }
}
<p>Test</>
</program>`;
    const { fatalErrors } = compileSource(source, "fn-reactive-read.scrml");
    const fn003 = fatalErrors.filter(e => e.code === "E-FN-003");
    expect(fn003).toHaveLength(0);
  });

  test("local variable write inside fn does NOT fire E-FN-003", () => {
    const source = `<program>
\${
  fn pureLocal(a) {
    let temp = a * 2
    return temp
  }
}
<p>Test</>
</program>`;
    const { fatalErrors } = compileSource(source, "fn-local-write.scrml");
    const fn003 = fatalErrors.filter(e => e.code === "E-FN-003");
    expect(fn003).toHaveLength(0);
  });
});
