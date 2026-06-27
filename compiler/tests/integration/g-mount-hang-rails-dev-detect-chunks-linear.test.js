/**
 * g-mount-hang-rails-dev (S226) — detectRuntimeChunks must walk the AST
 * LINEARLY (terminate), not exponentially.
 *
 * Root cause: `detectRuntimeChunks` (codegen/emit-client.ts) walked the AST
 * with NO visited-set. `detectFromNode`'s `case "markup"` (and the for-stmt /
 * logic / function-decl cases) re-descended into `node.children` / `node.body`,
 * which the outer `walkNodes` / `walkBody` ALSO descend — so every nesting level
 * DOUBLED the visit count (2^depth). On `samples/gauntlet-r18/rails-dev.scrml`
 * the `reflect()` + `emit()` CRUD generator emits ~15-deep markup using
 * `/`-shorthand closers that leave tags unterminated; the recovery AST is deep
 * enough that the doubling hung the COMPILE at 100% CPU and never terminated
 * (the prior FINDINGS mis-attributed the hang to the meta-eval `nativeParseFile`
 * re-parse — that call actually completes; the hang is downstream in CG's
 * detectRuntimeChunks).
 *
 * Fix: a per-walk `visited` Set guards both walk functions so each node is
 * processed at most once -> strictly linear, terminates on ANY AST shape. The
 * chunk-set output is unchanged (idempotent Set adds).
 *
 * These tests would HANG (never terminate, 100% CPU) against the pre-fix code:
 * reaching the assertions at all is the proof of termination. The synthetic
 * deep-nest case shows the bug fires on WELL-FORMED deep markup too (not just
 * the malformed rails-dev recovery AST) — pre-fix, depth 24 already took ~2.5s
 * and each +2 levels roughly doubled it (depth 40 = hang).
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

function compileSource(name, source) {
  const TMP = mkdtempSync(join(tmpdir(), "g-mount-hang-"));
  try {
    const filePath = join(TMP, `${name}.scrml`);
    writeFileSync(filePath, source);
    const outDir = join(TMP, `${name}.dist`);
    const result = compileScrml({
      inputFiles: [filePath],
      outputDir: outDir,
      write: false,
      log: () => {},
    });
    return result;
  } finally {
    rmSync(TMP, { recursive: true, force: true });
  }
}

describe("g-mount-hang-rails-dev: detectRuntimeChunks walks linearly (terminates)", () => {
  // 30s budget. Pre-fix, the synthetic depth-40 case alone is astronomically
  // exponential (2^40) — this test would not complete. Post-fix it is ~0.3s.
  test("deeply-nested WELL-FORMED markup compiles (no exponential walk)", () => {
    const DEPTH = 40;
    let src = "<program>\n";
    for (let i = 0; i < DEPTH; i++) src += "  ".repeat(i) + `<div class=l${i}>\n`;
    src += "  ".repeat(DEPTH) + "deep text\n";
    for (let i = DEPTH - 1; i >= 0; i--) src += "  ".repeat(i) + "</div>\n";
    src += "</program>\n";

    const result = compileSource("deep-nested-markup", src);
    // Reaching here at all is the termination proof. The compiler must return a
    // result object (it may carry diagnostics — that is fine; the invariant
    // under test is TERMINATION, not zero-diagnostics).
    expect(result).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
  }, 30000);

  test("rails-dev.scrml (the original repro) terminates with clean diagnostics, not a hang", () => {
    // The exact brief repro: a pure compile-time reflect()+emit() CRUD sample
    // whose emitted markup is malformed (`/`-shorthand leaves tags unterminated).
    // The compiler MUST terminate — either parse it or emit a clean fatal
    // diagnostic — never loop. Pre-fix this hung at 100% CPU (exit 124).
    const railsDev = join(import.meta.dir, "../../../samples/gauntlet-r18/rails-dev.scrml");
    const result = compileScrml({
      inputFiles: [railsDev],
      outputDir: join(tmpdir(), "g-mount-hang-rails-dev.dist"),
      write: false,
      log: () => {},
    });
    // Termination proof + the expected clean diagnostic: the malformed emitted
    // markup surfaces E-META-EVAL-002 ("Re-parsing emitted meta code failed").
    expect(result).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
    const hasMetaEvalError = result.errors.some(e => e && e.code === "E-META-EVAL-002");
    expect(hasMetaEvalError).toBe(true);
  }, 30000);
});
