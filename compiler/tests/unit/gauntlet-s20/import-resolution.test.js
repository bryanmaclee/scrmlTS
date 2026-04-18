/**
 * import-resolution.test.js — E-IMPORT-006 (module not found)
 *
 * Fixed in S21: the module resolver computed an absolute path for each import
 * but never verified that the target existed on disk. A `./nonexistent.scrml`
 * import compiled cleanly. E-IMPORT-006 now fires when the target file is
 * absent (and is not itself in the compile set).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join, resolve } from "path";
import { compileScrml } from "../../../src/api.js";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/import-resolution");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

beforeAll(() => { mkdirSync(FIXTURE_DIR, { recursive: true }); });
afterAll(() => { rmSync(FIXTURE_DIR, { recursive: true, force: true }); });

function compileSource(source, filename, extraFiles = {}) {
  const filePath = resolve(join(FIXTURE_DIR, filename));
  writeFileSync(filePath, source);
  const inputFiles = [filePath];
  for (const [name, body] of Object.entries(extraFiles)) {
    const p = resolve(join(FIXTURE_DIR, name));
    writeFileSync(p, body);
    inputFiles.push(p);
  }
  const result = compileScrml({ inputFiles, outputDir: FIXTURE_OUTPUT, write: false });
  const allErrors = result.errors || [];
  return {
    errors: allErrors,
    fatalErrors: allErrors.filter((e) => e.severity !== "warning"),
  };
}

describe("E-IMPORT-006: module not found (§21.3)", () => {
  test("importing a non-existent relative module fires E-IMPORT-006", () => {
    const source = `\${
  import { helper } from "./does-not-exist.scrml"
}
<p>x</>`;
    const { fatalErrors } = compileSource(source, "e6-missing.scrml");
    const e006 = fatalErrors.filter((e) => e.code === "E-IMPORT-006");
    expect(e006.length).toBeGreaterThanOrEqual(1);
    expect(e006[0].message).toContain("./does-not-exist.scrml");
  });

  test("importing an existing relative module does NOT fire E-IMPORT-006", () => {
    const target = `\${
  export const greet = "hi"
}`;
    const source = `\${
  import { greet } from "./present.scrml"
}
<p>\${greet}</>`;
    const { fatalErrors } = compileSource(source, "e6-present-importer.scrml", {
      "present.scrml": target,
    });
    const e006 = fatalErrors.filter((e) => e.code === "E-IMPORT-006");
    expect(e006.length).toBe(0);
  });

  test(".js imports are not subject to E-IMPORT-006 (bundler resolves)", () => {
    const source = `\${
  import { utility } from "./lib.js"
}
<p>x</>`;
    const { fatalErrors } = compileSource(source, "e6-js-skip.scrml");
    const e006 = fatalErrors.filter((e) => e.code === "E-IMPORT-006");
    expect(e006.length).toBe(0);
  });
});

describe("S24 §2g — extension-less relative imports resolve to .scrml", () => {
  test("import from './name' (no extension) resolves to './name.scrml'", () => {
    const target = `\${
  export const greet = "hi"
}`;
    const source = `\${
  import { greet } from "./present-noext"
}
<p>\${greet}</>`;
    const { fatalErrors } = compileSource(source, "e6-noext-importer.scrml", {
      "present-noext.scrml": target,
    });
    const e006 = fatalErrors.filter((e) => e.code === "E-IMPORT-006");
    expect(e006.length).toBe(0);
  });

  test("import from './dir' resolves to './dir/index.scrml'", () => {
    const indexTarget = `\${
  export const label = "dir"
}`;
    const dirPath = join(FIXTURE_DIR, "mod-dir");
    mkdirSync(dirPath, { recursive: true });
    writeFileSync(join(dirPath, "index.scrml"), indexTarget);
    const source = `\${
  import { label } from "./mod-dir"
}
<p>\${label}</>`;
    const { fatalErrors } = compileSource(source, "e6-dir-importer.scrml");
    const e006 = fatalErrors.filter((e) => e.code === "E-IMPORT-006");
    expect(e006.length).toBe(0);
  });

  test("missing extension-less target still fires E-IMPORT-006", () => {
    const source = `\${
  import { x } from "./still-missing-noext"
}
<p>x</>`;
    const { fatalErrors } = compileSource(source, "e6-noext-missing.scrml");
    const e006 = fatalErrors.filter((e) => e.code === "E-IMPORT-006");
    expect(e006.length).toBeGreaterThanOrEqual(1);
  });
});
