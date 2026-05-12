/**
 * v0.2.4 Bug-1-anomaly-1 — tokenizer/lift space-loss in event-handler attribute values
 *
 * In `examples/18-state-authority.scrml`, the event-handler attribute value
 *   `onchange=toggle(t.id, not t.completed)`
 * (used inside `lift <li>...</li>` within a `for` loop) compiles to
 *   `_scrml_toggle_16(t.id, nott.completed)`
 * The space between `not` and `t.completed` is dropped before the rewriter
 * can convert `not <operand>` into `!<operand>`.
 *
 * Root cause: in `emit-lift.js:emitSetAttrs`, event-handler attribute values
 * go through `emitExprField(null, attr.value, { mode: "client" })` →
 * `rewriteExprWithDerived` → `rewriteExpr` → `clientPasses`. One of the
 * passes (acorn-based, in `rewriteReactiveRefsAST`) re-serializes the
 * expression with `astring`, which collapses tokenizer-spaced source and
 * drops the space between `not` and its operand.
 *
 * Pre-fix behaviour: emits `nott.completed` (broken).
 * Post-fix behaviour: emits `!t.completed` (Bug-1's `not <operand>` rewrite
 * engages because the space survives).
 *
 * Coverage:
 *   §1 unit: rewriteExpr preserves `not <operand>` ⇒ rewrites to `!<operand>`
 *   §2 integration: compile 18-state-authority.scrml — output passes node --check
 *     and contains `!t.completed` (no `nott.completed`)
 *   §3 parity: `is @flag`, `is not @x` keyword-operator forms still work
 *   §4 regression: simple `do(@flag)` call form still tokenizes/compiles correctly
 */

import { describe, test, expect } from "bun:test";
import { rewriteExpr } from "../../src/codegen/rewrite.ts";
import { compileScrml } from "../../src/api.js";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

/**
 * Compile a .scrml file into a tmp output dir and return the emitted
 * .client.js (or `null` if it wasn't produced). The output is written to
 * `os.tmpdir()` so we do not pollute the repo or the source tree.
 */
function compileFileToTmp(inputAbs) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bug1a1-"));
  try {
    compileScrml({
      inputFiles: [inputAbs],
      write: true,
      outputDir: tmpDir,
    });
    const base = path.basename(inputAbs, ".scrml");
    const clientPath = path.join(tmpDir, `${base}.client.js`);
    if (!fs.existsSync(clientPath)) return null;
    return fs.readFileSync(clientPath, "utf-8");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// §1 — Unit: rewriteExpr preserves `not <operand>` and converts to !operand
// ---------------------------------------------------------------------------

describe("§1 unit — rewriteExpr preserves space after `not` keyword", () => {
  test("§1.1 `not t.completed` rewrites to `!t.completed`", () => {
    const result = rewriteExpr("toggle(t.id, not t.completed)");
    // Must not contain the broken concatenation
    expect(result).not.toMatch(/nott\.completed/);
    // Must rewrite `not <operand>` to `!<operand>` (or some sane equivalent)
    expect(result).toMatch(/!t\.completed|!\(t\.completed\)/);
  });

  test("§1.2 tokenizer-spaced `not t . completed` rewrites correctly", () => {
    // emit-lift.js passes tokenizer-spaced strings into rewriteExpr
    const result = rewriteExpr("toggle ( t . id , not t . completed )");
    expect(result).not.toMatch(/nott/);
    // Either compact or spaced form is acceptable so long as `not` is gone
    // and the operand is preserved as a member access.
    expect(result).toMatch(/!\s*\(?\s*t\s*\.\s*completed/);
  });

  test("§1.3 `not @flag` rewrites to `!_scrml_reactive_get(\"flag\")`", () => {
    const result = rewriteExpr("do(not @flag)");
    expect(result).not.toMatch(/not_scrml_reactive_get|notnull/);
    expect(result).toMatch(/!_scrml_reactive_get\("flag"\)/);
  });

  test("§1.4 standalone `not @flag` rewrites to `!_scrml_reactive_get(\"flag\")`", () => {
    const result = rewriteExpr("not @flag");
    expect(result).not.toMatch(/notnull|not_scrml/);
    expect(result).toMatch(/!_scrml_reactive_get\("flag"\)/);
  });
});

// ---------------------------------------------------------------------------
// §2 — Integration: compile 18-state-authority.scrml
// ---------------------------------------------------------------------------

describe("§2 integration — examples/18-state-authority.scrml compiles cleanly", () => {
  const examplePath = path.join(REPO_ROOT, "examples", "18-state-authority.scrml");

  test("§2.1 client output does not contain `nott.completed`", () => {
    const clientJs = compileFileToTmp(examplePath);
    expect(clientJs).not.toBeNull();
    expect(clientJs).not.toMatch(/nott\.completed/);
  });

  test("§2.2 client output passes JS syntax validation (via Function constructor)", () => {
    const clientJs = compileFileToTmp(examplePath);
    expect(clientJs).not.toBeNull();
    // Use Function constructor as a lightweight `node --check` equivalent.
    // It throws on syntax errors but does not execute the code.
    expect(() => new Function(clientJs)).not.toThrow();
  });

  test("§2.3 toggle handler uses `!t.completed` (Bug-1 rewrite engaged)", () => {
    const clientJs = compileFileToTmp(examplePath);
    expect(clientJs).not.toBeNull();
    // Must contain the rewritten negation form (compact or space-permissive).
    expect(clientJs).toMatch(/!\s*\(?\s*t\s*\.\s*completed/);
  });
});

// ---------------------------------------------------------------------------
// §3 — Parity: other keyword-operator forms
// ---------------------------------------------------------------------------

describe("§3 parity — other keyword-operator forms preserve whitespace", () => {
  test("§3.1 `is @flag` (presence/some) rewrites to a presence check", () => {
    // `is @flag` is ambiguous — could be `x is @flag` (binary `is` op).
    // We just need to confirm no token concatenation happens.
    const result = rewriteExpr("do(x is some)");
    expect(result).not.toMatch(/issome/);
    expect(result).toMatch(/x\s*!==?\s*null|x !=/);
  });

  test("§3.2 `x is not` rewrites to absence check (no concatenation)", () => {
    const result = rewriteExpr("verify(x is not)");
    expect(result).not.toMatch(/isnot|xisnot/);
    expect(result).toMatch(/x\s*===?\s*null|x ==/);
  });
});

// ---------------------------------------------------------------------------
// §4 — Regression: simple value-handler still tokenizes correctly
// ---------------------------------------------------------------------------

describe("§4 regression — simple value-handlers still work", () => {
  test("§4.1 `do(@flag)` rewrites to `do(_scrml_reactive_get(\"flag\"))`", () => {
    const result = rewriteExpr("do(@flag)");
    expect(result).toMatch(/do\(_scrml_reactive_get\("flag"\)\)/);
  });

  test("§4.2 `toggle(t.id, t.completed)` (no `not`) preserves arg structure", () => {
    const result = rewriteExpr("toggle(t.id, t.completed)");
    // No `not` here — just an identifier reference. Output should be intact.
    expect(result).toMatch(/toggle\s*\(\s*t\.id\s*,\s*t\.completed\s*\)/);
  });
});
