/**
 * library-mode-types.test.js
 *
 * Integration regression test for Bug R18 #2:
 * --mode library must not emit raw scrml type declarations as JavaScript.
 *
 * Before the fix (emit-library.ts whole-block extraction path):
 *   Compiling a file with `type X:enum = { ... }` or `type Y:struct = { ... }`
 *   in --mode library produced output containing the literal scrml type syntax,
 *   causing: SyntaxError: Unexpected identifier 'HttpMethod'
 *
 * Tests:
 *   §1  Library mode output does not contain raw type declaration syntax (unit via compileScrml)
 *   §2  Library mode output passes node --check (syntax validity)
 *   §3  Library mode output contains exported functions defined alongside type decls
 *   §4  Library mode output does not contain the runtime bootstrap (DOMContentLoaded, etc.)
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Locate the compiler src/ directory
// Mirrors the pattern used in init.test.js to handle git worktrees.
// ---------------------------------------------------------------------------

function findCompilerSrc() {
  const here = dirname(fileURLToPath(import.meta.url));
  const standard = resolve(here, "../../src");
  if (existsSync(join(standard, "api.js"))) return standard;

  // Git worktree fallback
  const worktreePattern = /.claude\/worktrees\/[^/]+\//;
  if (worktreePattern.test(here)) {
    const projectRoot = here.replace(/.claude\/worktrees\/[^/]+\/.*$/, "");
    const mainSrc = join(projectRoot, "compiler/src");
    if (existsSync(join(mainSrc, "api.js"))) return mainSrc;
  }
  return null;
}

const COMPILER_SRC = findCompilerSrc();

// ---------------------------------------------------------------------------
// Minimal scrml source with both an enum and a struct type declaration,
// plus exported functions. This is the regression repro case.
// ---------------------------------------------------------------------------

const SCRML_WITH_TYPE_DECLS = `
<program>

\${
    // Regression: Bug R18 #2 — type declarations must be stripped in library mode
    type HttpMethod:enum = { GET | POST | PUT | DELETE | PATCH }

    type ApiRequest:struct = {
        path: string,
        method: string,
        authenticated: boolean
    }

    type ApiResponse:struct = {
        status: number,
        body: string,
        ok: boolean
    }

    export function buildRequest(path, method) {
        return { path, method, body: "", authenticated: false }
    }

    export function isSuccess(response) {
        return response.status >= 200 && response.status < 300
    }

    export const DEFAULT_METHOD = "GET"
}

<div>
    <p>Library mode type regression test</>
</>

</>
`;

// ---------------------------------------------------------------------------
// Test scaffolding
// ---------------------------------------------------------------------------

let tmpDir = null;
let scrmlPath = null;
let compileScrml = null;

beforeAll(async () => {
  if (!COMPILER_SRC) return;

  tmpDir = join(tmpdir(), `scrml-lib-types-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tmpDir, { recursive: true });

  scrmlPath = join(tmpDir, "test-types.scrml");
  writeFileSync(scrmlPath, SCRML_WITH_TYPE_DECLS, "utf8");

  const mod = await import(join(COMPILER_SRC, "api.js"));
  compileScrml = mod.compileScrml;
});

afterAll(() => {
  if (tmpDir && existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// §1  Library mode output does not contain raw type declaration syntax
// ---------------------------------------------------------------------------

describe("library-mode-types §1: no raw type syntax in library output", () => {
  test("output does not contain 'type HttpMethod' (enum declaration)", async () => {
    if (!compileScrml || !scrmlPath) {
      console.log("Skipping — compiler not found");
      return;
    }

    const result = compileScrml({
      inputFiles: [scrmlPath],
      outputDir: tmpDir,
      mode: "library",
      write: false,
    });

    const outputs = [...result.outputs.values()];
    expect(outputs.length).toBeGreaterThan(0);
    const libraryJs = outputs[0].libraryJs ?? "";

    expect(libraryJs).not.toContain("type HttpMethod");
    expect(libraryJs).not.toContain("HttpMethod:enum");
  });

  test("output does not contain 'type ApiRequest' (struct declaration)", async () => {
    if (!compileScrml || !scrmlPath) return;

    const result = compileScrml({
      inputFiles: [scrmlPath],
      outputDir: tmpDir,
      mode: "library",
      write: false,
    });

    const outputs = [...result.outputs.values()];
    const libraryJs = outputs[0].libraryJs ?? "";

    expect(libraryJs).not.toContain("type ApiRequest");
    expect(libraryJs).not.toContain("ApiRequest:struct");
  });

  test("output does not contain enum variant list (GET | POST | ...)", async () => {
    if (!compileScrml || !scrmlPath) return;

    const result = compileScrml({
      inputFiles: [scrmlPath],
      outputDir: tmpDir,
      mode: "library",
      write: false,
    });

    const outputs = [...result.outputs.values()];
    const libraryJs = outputs[0].libraryJs ?? "";

    // The pipe-separated enum body must not appear in JS output
    expect(libraryJs).not.toContain("GET | POST");
    expect(libraryJs).not.toContain("PUT | DELETE");
  });

  test("output does not contain struct field type annotation (path: string)", async () => {
    if (!compileScrml || !scrmlPath) return;

    const result = compileScrml({
      inputFiles: [scrmlPath],
      outputDir: tmpDir,
      mode: "library",
      write: false,
    });

    const outputs = [...result.outputs.values()];
    const libraryJs = outputs[0].libraryJs ?? "";

    // Struct field declarations like `path: string` must not appear
    expect(libraryJs).not.toContain("authenticated: boolean");
  });
});

// ---------------------------------------------------------------------------
// §2  Library mode output passes node --check (syntax validity)
//
// This is the key end-to-end regression: `node --check <file>` must exit 0.
// The bug caused SyntaxError: Unexpected identifier 'HttpMethod' here.
// ---------------------------------------------------------------------------

describe("library-mode-types §2: node --check passes on library output", () => {
  test("library JS output is syntactically valid JavaScript (node --check)", async () => {
    if (!compileScrml || !scrmlPath) {
      console.log("Skipping — compiler not found");
      return;
    }

    const result = compileScrml({
      inputFiles: [scrmlPath],
      outputDir: tmpDir,
      mode: "library",
      write: false,
    });

    expect(result.errors).toHaveLength(0);

    const outputs = [...result.outputs.values()];
    expect(outputs.length).toBeGreaterThan(0);
    const libraryJs = outputs[0].libraryJs ?? "";
    expect(libraryJs.length).toBeGreaterThan(0);

    // Write to temp file and check with node --check
    const outFile = join(tmpDir, "lib-output.mjs");
    writeFileSync(outFile, libraryJs, "utf8");

    const proc = Bun.spawnSync(["node", "--check", outFile], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const stderr = proc.stderr.toString();
    expect(proc.exitCode).toBe(0);
    if (proc.exitCode !== 0) {
      console.error("node --check failed:", stderr);
    }
  });
});

// ---------------------------------------------------------------------------
// §3  Exported functions survive library mode compilation
// ---------------------------------------------------------------------------

describe("library-mode-types §3: exported functions are present in library output", () => {
  test("buildRequest function is exported", async () => {
    if (!compileScrml || !scrmlPath) return;

    const result = compileScrml({
      inputFiles: [scrmlPath],
      outputDir: tmpDir,
      mode: "library",
      write: false,
    });

    const outputs = [...result.outputs.values()];
    const libraryJs = outputs[0].libraryJs ?? "";

    expect(libraryJs).toContain("buildRequest");
  });

  test("isSuccess function is exported", async () => {
    if (!compileScrml || !scrmlPath) return;

    const result = compileScrml({
      inputFiles: [scrmlPath],
      outputDir: tmpDir,
      mode: "library",
      write: false,
    });

    const outputs = [...result.outputs.values()];
    const libraryJs = outputs[0].libraryJs ?? "";

    expect(libraryJs).toContain("isSuccess");
  });

  test("DEFAULT_METHOD constant is exported", async () => {
    if (!compileScrml || !scrmlPath) return;

    const result = compileScrml({
      inputFiles: [scrmlPath],
      outputDir: tmpDir,
      mode: "library",
      write: false,
    });

    const outputs = [...result.outputs.values()];
    const libraryJs = outputs[0].libraryJs ?? "";

    expect(libraryJs).toContain("DEFAULT_METHOD");
  });
});

// ---------------------------------------------------------------------------
// §4  Library mode output is a clean ES module (no browser bootstrap)
// ---------------------------------------------------------------------------

describe("library-mode-types §4: no browser runtime in library output", () => {
  test("output does not contain DOMContentLoaded", async () => {
    if (!compileScrml || !scrmlPath) return;

    const result = compileScrml({
      inputFiles: [scrmlPath],
      outputDir: tmpDir,
      mode: "library",
      write: false,
    });

    const outputs = [...result.outputs.values()];
    const libraryJs = outputs[0].libraryJs ?? "";

    expect(libraryJs).not.toContain("DOMContentLoaded");
    expect(libraryJs).not.toContain("_scrml_reactive_get");
    expect(libraryJs).not.toContain("scrml reactive runtime");
  });

  test("compilation produces no errors", async () => {
    if (!compileScrml || !scrmlPath) return;

    const result = compileScrml({
      inputFiles: [scrmlPath],
      outputDir: tmpDir,
      mode: "library",
      write: false,
    });

    expect(result.errors).toHaveLength(0);
  });
});
