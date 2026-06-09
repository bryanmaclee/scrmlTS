/**
 * stdlib-transitive-shim-copy — bundleStdlibForRun transitive sibling-FILE copy
 * (S176 / DD1 Fork 1 Phase 3 — stdlib-ouroboros de-leak enabler)
 *
 * A shim may `import { x } from "./other.js"` a SIBLING shim file (not a
 * subdir). Examples on disk:
 *   - scrml:time  → ./math.js          (Phase 3 de-leak: floor routed via math)
 *   - scrml:oauth → ./http.js, ./crypto.js
 *
 * Before this fix, bundleStdlibForRun copied only the named umbrella shim (+
 * matching subdir tree). A sibling FILE import was never copied, so an adopter
 * importing ONLY the umbrella (`scrml:time` without `scrml:math`) got a runtime
 * "Cannot find module ./math.js". This pins the transitive copy.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { bundleStdlibForRun } from "../../src/api.js";

let TMP;
beforeAll(() => { TMP = mkdtempSync(join(tmpdir(), "stdlib-transitive-")); });
afterAll(() => { if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true }); });

describe("transitive sibling-file copy", () => {
  test("X1: scrml:time alone copies time.js AND its ./math.js dependency", () => {
    const outDir = join(TMP, "x1");
    const bundled = bundleStdlibForRun(new Set(["time"]), outDir, () => {}, []);
    expect(bundled.has("time")).toBe(true);
    expect(existsSync(join(outDir, "_scrml", "time.js"))).toBe(true);
    // The de-leak target: math.js must be copied transitively even though the
    // adopter did NOT import scrml:math directly.
    expect(existsSync(join(outDir, "_scrml", "math.js"))).toBe(true);
  });

  test("X2: scrml:oauth alone copies oauth.js AND ./http.js + ./crypto.js (latent-bug fix)", () => {
    const outDir = join(TMP, "x2");
    const bundled = bundleStdlibForRun(new Set(["oauth"]), outDir, () => {}, []);
    expect(bundled.has("oauth")).toBe(true);
    expect(existsSync(join(outDir, "_scrml", "oauth.js"))).toBe(true);
    expect(existsSync(join(outDir, "_scrml", "http.js"))).toBe(true);
    expect(existsSync(join(outDir, "_scrml", "crypto.js"))).toBe(true);
  });

  test("X3: a leaf shim with no sibling-file imports (path) copies only itself", () => {
    const outDir = join(TMP, "x3");
    const bundled = bundleStdlibForRun(new Set(["path"]), outDir, () => {}, []);
    expect(bundled.has("path")).toBe(true);
    expect(existsSync(join(outDir, "_scrml", "path.js"))).toBe(true);
    // No spurious math.js / http.js copied for a leaf.
    expect(existsSync(join(outDir, "_scrml", "math.js"))).toBe(false);
  });
});
