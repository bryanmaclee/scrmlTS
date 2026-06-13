/**
 * g-attr-if-fn-call-misroute follow-ups (S191) — full-pipeline regression locks
 *
 * Two sibling gaps surfaced by the S191 dog-food + PA dual-verify of the parent
 * `if=fn()` standalone fix. Both are "`if=fn()` should behave exactly like
 * `if=(fn())`" parity in the condition-routing region. These go through the FULL
 * pipeline (compileScrml → emitted .client.js) because the if-chain `branches`
 * form in buildAST (ast-builder.js:14625), not in codegen — a synthetic-AST test
 * would bypass it.
 *
 *   §1  g-attr-if-fn-display-not-mount — a clean-subtree `if=fn()` gets the
 *       MOUNT/UNMOUNT controller (like `if=(fn())` / `if=@var`), NOT the
 *       display-toggle fallback. Fix: emit-html.ts clean-subtree if= handler
 *       (~1394 gate + call-ref binding branch).
 *   §2  g-attr-if-fn-chain-head-call-misroute — `if=fn()` as an if-CHAIN head
 *       CALLS the fn (mangled), instead of `_scrml_reactive_get("fnName")`
 *       (reading the fn name as a nonexistent cell). Fix: emit-event-wiring.ts
 *       chain-condition emitter (~1296 call-ref case).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let TMP;
beforeAll(() => { TMP = mkdtempSync(join(tmpdir(), "if-fn-followup-")); });
afterAll(() => { if (TMP) rmSync(TMP, { recursive: true, force: true }); });

// Compile a source string through the full pipeline; return the emitted client JS.
function clientJsFor(src) {
  const stem = `f${Math.floor(performance.now())}_${readdirSync(TMP).length}`;
  const fp = join(TMP, `${stem}.scrml`);
  const outDir = join(TMP, `${stem}-dist`);
  writeFileSync(fp, src);
  compileScrml({ inputFiles: [fp], outputDir: outDir, write: true, log: () => {} });
  const clientFile = readdirSync(outDir).find((f) => f.endsWith(".client.js"));
  return clientFile ? readFileSync(join(outDir, clientFile), "utf8") : "";
}

// ---------------------------------------------------------------------------
// §1 — g-attr-if-fn-display-not-mount: clean-subtree if=fn() → mount/unmount
// ---------------------------------------------------------------------------

describe("g-attr-if-fn-display-not-mount — if=fn() mounts/unmounts like if=(fn())", () => {
  const SRC = `<program>
  <page>
    <count> = 0
    fn isHigh() { return @count > 2 }
    <button onclick=\${@count = @count + 1}>inc</button>
    <p if=isHigh()>BARE</p>
    <p if=(isHigh())>PAREN</p>
  </>
</program>`;

  test("if=fn() emits the mount/unmount controller (not display-toggle)", () => {
    const js = clientJsFor(SRC);
    expect(js).toContain("_scrml_if_mount_");
    // The bare-call condition is called inside the effect, mangled.
    expect(js).toMatch(/_scrml_isHigh_\d+\(\)/);
  });

  test("if=fn() does NOT fall to the display-toggle path", () => {
    const js = clientJsFor(SRC);
    // No el.style.display toggle keyed off isHigh() (that is show= semantics).
    expect(js).not.toMatch(/el\.style\.display = \(_scrml_isHigh_\d+\(\)\)/);
  });

  test("if=fn() does NOT event-bind (parent-gap regression)", () => {
    const js = clientJsFor(SRC);
    expect(js).not.toContain('addEventListener("if"');
  });
});

// ---------------------------------------------------------------------------
// §2 — g-attr-if-fn-chain-head-call-misroute: if=fn() chain head CALLS the fn
// ---------------------------------------------------------------------------

describe("g-attr-if-fn-chain-head-call-misroute — if=fn() chain head calls the fn", () => {
  const SRC = `<program>
  <page>
    <count> = 0
    <flag> = false
    fn isHigh() { return @count > 2 }
    <button onclick=\${@count = @count + 1}>inc</button>
    <div if=isHigh()>HEAD</div>
    <div else-if=@flag>MID</div>
    <div else>ELSE</div>
  </>
</program>`;

  test("chain head emits a CALL to the mangled fn, not reactive_get of its name", () => {
    const js = clientJsFor(SRC);
    expect(js).toContain("_update_chain_");
    // The head condition CALLS isHigh() (mangled) ...
    expect(js).toMatch(/_next === null && \(_scrml_isHigh_\d+\(\)\)/);
    // ... and never reads the fn NAME as a reactive cell.
    expect(js).not.toContain('_scrml_reactive_get("isHigh")');
  });

  test("emitted chain client JS is syntactically valid", () => {
    const js = clientJsFor(SRC);
    // A bare `reactive_get("isHigh")` (the bug) would still be valid JS but wrong;
    // this asserts the whole chain emit parses.
    expect(() => new Function(js.replace(/^\/\/.*$/gm, ""))).not.toThrow();
  });
});
