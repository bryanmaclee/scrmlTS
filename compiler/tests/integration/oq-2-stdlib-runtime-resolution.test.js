/**
 * OQ-2: Stdlib runtime resolution — `scrml:NAME` import bridge.
 *
 * Coverage for the Shape B fix from
 *   docs/changes/oq-2-dev-server-bootstrap/diagnosis.md
 *
 * Pre-fix behavior (the bug):
 *   Codegen emitted literal `import { ... } from "scrml:auth"` into output JS.
 *   Bun's import resolver does not register `scrml:*` schemes (no package.json
 *   `imports` map, no loader plugin, no filesystem entry), so any `await
 *   import()` of an emitted server.js or client.js failed with `Cannot find
 *   package 'scrml:NAME'`. The dispatch app's 32 source files were the first
 *   real-world adopters; every prior single-file example silently dodged the
 *   bug because none used stdlib.
 *
 * Post-fix behavior (Shape B — bundle + import-rewrite):
 *   1. `collectStdlibSpecifiers(tabResults)` walks each TAB AST's import
 *      declarations, returning the set of bare names referenced via
 *      `scrml:NAME`.
 *   2. `bundleStdlibForRun(names, outputDir, log)` copies a hand-written ES
 *      module shim (compiler/runtime/stdlib/<name>.js) into
 *      <outputDir>/_scrml/<name>.js for each name. Names without a shim are
 *      skipped — the resulting emitted JS still fails loudly at runtime, which
 *      surfaces the gap (vs. silently degrading to a missing import).
 *   3. `rewriteStdlibImports(jsCode, bundleDir, outputDir, bundled)` rewrites
 *      `from "scrml:NAME"` → `from "<rel>/NAME.js"` for every NAME in the
 *      bundled set, with `<rel>` computed from `bundleDir` to
 *      `<outputDir>/_scrml/`. This handles W0a / F-COMPILE-001 nested writes:
 *      a file at `dist/pages/auth/login.server.js` gets `../../_scrml/...`,
 *      while `dist/app.server.js` gets `./_scrml/...`.
 *
 * Tests:
 *   §1. Helpers — collectStdlibSpecifiers + rewriteStdlibImports unit checks.
 *   §2. End-to-end: minimal app with `scrml:auth` → bundled shim exists,
 *       emitted JS imports relative path, file is loadable in Bun via
 *       `await import()`. NO `Cannot find package 'scrml:*'` error.
 *   §3. Nested-output case (W0a interaction): a source under a deeper subdir
 *       ends up with the correct `../../_scrml/...` relative import.
 *   §4. Negative case: `scrml:NAME` for a name with no shim is left as-is
 *       (loud-failure preserved). The test asserts the import survives the
 *       rewrite verbatim.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { mkdtempSync } from "fs";
import {
  compileScrml,
  collectStdlibSpecifiers,
  rewriteStdlibImports,
} from "../../src/api.js";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "oq-2-stdlib-"));
});

afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function fx(relPath, source) {
  const abs = join(TMP, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, source);
  return abs;
}

// Minimal stdlib-importing source. The `${...}` block is a server expression
// (per §53) that lifts `import` declarations to the file's import set. The
// file must compile cleanly through the full pipeline; the actual function
// usage doesn't matter for OQ-2 — we only care about the emitted import shape.
const FIXTURE_SCRML = `\${
    import { hashPassword } from 'scrml:auth'
}
h1 "OQ-2 smoke"
`;

// ---------------------------------------------------------------------------
// §1. Helpers
// ---------------------------------------------------------------------------

describe("OQ-2 §1: helpers (unit)", () => {
  test("collectStdlibSpecifiers extracts bare names from `scrml:NAME` imports", () => {
    const tabResults = [
      {
        ast: {
          imports: [
            { source: "scrml:auth" },
            { source: "scrml:crypto" },
            { source: "./local.scrml" }, // user-authored — should be skipped
            { source: "vendor:lodash" },  // vendor — should be skipped
            { source: "scrml:store" },
            { source: "scrml:auth" },     // duplicate — Set dedupes
          ],
        },
      },
    ];
    const names = collectStdlibSpecifiers(tabResults);
    expect(names).toBeInstanceOf(Set);
    expect(names.has("auth")).toBe(true);
    expect(names.has("crypto")).toBe(true);
    expect(names.has("store")).toBe(true);
    expect(names.size).toBe(3);
  });

  test("collectStdlibSpecifiers handles empty / null / missing imports gracefully", () => {
    expect(collectStdlibSpecifiers(null).size).toBe(0);
    expect(collectStdlibSpecifiers([]).size).toBe(0);
    expect(collectStdlibSpecifiers([{}]).size).toBe(0);
    expect(collectStdlibSpecifiers([{ ast: {} }]).size).toBe(0);
    expect(collectStdlibSpecifiers([{ ast: { imports: [] } }]).size).toBe(0);
  });

  test("rewriteStdlibImports rewrites top-level file path to `./_scrml/NAME.js`", () => {
    const outputDir = "/abs/dist";
    const bundleDir = "/abs/dist"; // top-level file lives directly under outputDir
    const bundled = new Set(["auth", "crypto"]);
    const src =
      `import { hashPassword, verifyPassword } from "scrml:auth";\n` +
      `import { generateToken } from "scrml:crypto";\n`;
    const out = rewriteStdlibImports(src, bundleDir, outputDir, bundled);
    expect(out).toContain(`from "./_scrml/auth.js"`);
    expect(out).toContain(`from "./_scrml/crypto.js"`);
    expect(out).not.toContain(`scrml:`);
  });

  test("rewriteStdlibImports computes `../..` for nested-output files (W0a interaction)", () => {
    const outputDir = "/abs/dist";
    const bundleDir = "/abs/dist/pages/auth"; // nested two levels under outputDir
    const bundled = new Set(["auth"]);
    const src = `import { hashPassword } from "scrml:auth";\n`;
    const out = rewriteStdlibImports(src, bundleDir, outputDir, bundled);
    expect(out).toContain(`from "../../_scrml/auth.js"`);
  });

  test("rewriteStdlibImports leaves names not in the bundled set untouched (loud-failure preserved)", () => {
    const outputDir = "/abs/dist";
    const bundleDir = "/abs/dist";
    const bundled = new Set(["auth"]); // store is NOT bundled
    const src =
      `import { hashPassword } from "scrml:auth";\n` +
      `import { createSessionStore } from "scrml:store";\n`;
    const out = rewriteStdlibImports(src, bundleDir, outputDir, bundled);
    expect(out).toContain(`from "./_scrml/auth.js"`);
    // Unbundled name survives verbatim — runtime will fail loudly.
    expect(out).toContain(`from "scrml:store"`);
  });

  test("rewriteStdlibImports is a no-op when bundled is empty / undefined", () => {
    const outputDir = "/abs/dist";
    const bundleDir = "/abs/dist";
    const src = `import { hashPassword } from "scrml:auth";\n`;
    expect(rewriteStdlibImports(src, bundleDir, outputDir, new Set())).toBe(src);
    expect(rewriteStdlibImports(src, bundleDir, outputDir, undefined)).toBe(src);
  });
});

// ---------------------------------------------------------------------------
// §2. End-to-end: minimal app with stdlib → emitted JS is loadable
// ---------------------------------------------------------------------------

describe("OQ-2 §2: end-to-end smoke — emitted JS imports rewritten path and loads in Bun", () => {
  test("minimal `scrml:auth` consumer compiles, bundles shim, and loads in Bun", async () => {
    const ROOT = join(TMP, "e2e-1");
    const src = fx("e2e-1/app.scrml", FIXTURE_SCRML);
    const outDir = join(ROOT, "dist");

    const result = compileScrml({
      inputFiles: [src],
      outputDir: outDir,
      write: true,
      log: () => {},
    });

    // Compilation itself must succeed.
    expect(result.errors).toEqual([]);

    // Bundling fired: hand-written shim exists at <outputDir>/_scrml/auth.js.
    expect(existsSync(join(outDir, "_scrml/auth.js"))).toBe(true);

    // Emitted client JS uses the rewritten relative import — no `scrml:` left.
    const clientJs = readFileSync(join(outDir, "app.client.js"), "utf8");
    expect(clientJs).toContain(`from "./_scrml/auth.js"`);
    expect(clientJs).not.toContain(`from "scrml:`);

    // The acid test: emitted JS is loadable. Pre-fix this throws
    // `Cannot find package 'scrml:auth'`. Post-fix it must resolve cleanly.
    let loadError = null;
    try {
      await import(join(outDir, "app.client.js"));
    } catch (e) {
      loadError = e;
    }
    expect(loadError).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §3. Nested-output case (W0a / F-COMPILE-001 interaction)
// ---------------------------------------------------------------------------

describe("OQ-2 §3: nested-output W0a interaction — relative path matches actual depth", () => {
  test("source under a deeper subdir emits a `../../_scrml/...` relative import", () => {
    // Multi-file invocation forces W0a's `computeOutputBaseDir` to use the
    // common ancestor as the base. With a top-level file + a nested file,
    // the base is the top-level dir, so the nested file's output ends up at
    // `dist/sub/dir/X.client.js` and must reach `_scrml/` via `../../`.
    const ROOT = join(TMP, "e2e-2");
    const top = fx("e2e-2/top.scrml", FIXTURE_SCRML);
    const nested = fx("e2e-2/sub/dir/nested.scrml", FIXTURE_SCRML);
    const outDir = join(ROOT, "dist");

    const result = compileScrml({
      inputFiles: [top, nested],
      outputDir: outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    // Top-level file lives at dist/top.client.js → `./_scrml/auth.js`.
    const topJs = readFileSync(join(outDir, "top.client.js"), "utf8");
    expect(topJs).toContain(`from "./_scrml/auth.js"`);

    // Nested file lives at dist/sub/dir/nested.client.js → `../../_scrml/auth.js`.
    expect(existsSync(join(outDir, "sub/dir/nested.client.js"))).toBe(true);
    const nestedJs = readFileSync(join(outDir, "sub/dir/nested.client.js"), "utf8");
    expect(nestedJs).toContain(`from "../../_scrml/auth.js"`);
    expect(nestedJs).not.toContain(`from "scrml:`);

    // The shim itself is bundled exactly once at <outputDir>/_scrml/.
    expect(existsSync(join(outDir, "_scrml/auth.js"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §4. Negative case — names without a shim are left as-is (loud failure)
// ---------------------------------------------------------------------------

describe("OQ-2 §4: unbundled stdlib names survive verbatim (loud-failure preserved)", () => {
  test("rewriteStdlibImports leaves an unrecognised `scrml:NAME` untouched", () => {
    // Direct unit-level assertion: `rewriteStdlibImports` does NOT rewrite a
    // name that isn't in the `bundled` set. This is the contract that lets
    // future stdlib gaps surface as runtime errors rather than silently
    // resolving to nothing. A future M16 dispatch can register more names by
    // dropping a shim file at compiler/runtime/stdlib/<name>.js.
    const outputDir = "/abs/dist";
    const bundleDir = "/abs/dist";
    const bundled = new Set(); // empty — nothing bundled
    const src = `import { foo } from "scrml:nonexistent";\n`;
    const out = rewriteStdlibImports(src, bundleDir, outputDir, bundled);
    expect(out).toBe(src); // verbatim
  });
});
