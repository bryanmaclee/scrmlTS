/**
 * g-channel-topic-forward-ref — attribute `@`-ref to a FORWARD-declared reactive
 * cell must resolve (no false E-SCOPE-001). SPEC §6.9 (file-scope cell hoisting)
 * + §38.2/§38.6.2 (dynamic-topic channel `<channel name="rooms" topic=@var>`).
 *
 * The dynamic-topic channel form false-fired E-SCOPE-001 ("Unquoted identifier
 * `@selectedRoom` … did you mean `@@selectedRoom`") when `@selectedRoom` was
 * declared AFTER the channel in source order. The TS-pass attribute walker
 * (type-system.ts visitAttr) bound a reactive cell into scope only when the
 * main top-level walk REACHED that cell's `state-decl` node — so an attribute
 * node visited EARLIER than the decl saw an empty scope. Cells declared BEFORE
 * the channel already resolved; the failure was purely source-order.
 *
 * The bug class was NOT channel-specific — ANY attribute `@`-ref to a
 * later-declared cell (`<input value=@laterCell>` with `<laterCell>` below) hit
 * it. Per §6.9 a forward `@`-ref to a hoisted cell is legal everywhere.
 *
 * Fix: a `preBindReactiveStateCells` pre-pass hoists every file-scope reactive
 * state cell into scope BEFORE the main walk (mirrors `preBindExportedNames` +
 * the engine auto-decl pre-bind). The seed is `asIs`; the main walk re-binds the
 * resolved type when it reaches the decl, so the seed never masks the real type.
 *
 * E-SCOPE-001 is an E- code → result.errors (fatal). Tests assert over BOTH
 * streams so a partition regression (an E- code silently moving to
 * result.warnings) is caught rather than silently passing.
 *
 * Fix site: type-system.ts preBindReactiveStateCells (annotateNodes pre-pass).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let TMP;
beforeAll(() => { TMP = mkdtempSync(join(tmpdir(), "channel-topic-forward-ref-")); });
afterAll(() => { if (TMP) rmSync(TMP, { recursive: true, force: true }); });

function compile(src) {
  const fp = join(TMP, `f-${Math.random().toString(36).slice(2)}.scrml`);
  writeFileSync(fp, src);
  return compileScrml({ inputFiles: [fp], outputDir: join(TMP, "dist"), write: false, log: () => {} });
}

// Cross-stream collector — E-SCOPE-001 partitions to result.errors, but assert
// over BOTH streams so a partition regression is caught.
function scopeDiags(res) {
  return [...(res.errors || []), ...(res.warnings || [])]
    .filter((d) => d.code === "E-SCOPE-001");
}

// ---------------------------------------------------------------------------
// POSITIVE — a forward `@`-ref resolves; no false E-SCOPE-001
// ---------------------------------------------------------------------------

describe("g-channel-topic-forward-ref — forward `@`-ref resolves", () => {
  test("channel topic=@cell with cell declared AFTER (${}-wrapped) does NOT fire E-SCOPE-001", () => {
    const res = compile(`<program>
  <channel name="rooms" topic=@selectedRoom>
    <messages> = []
  </>
  \${ <selectedRoom> = "lobby" }
  <p>x</p>
</program>`);
    expect(scopeDiags(res).length).toBe(0);
  });

  test("channel topic=@cell with cell declared AFTER (bare top-level decl) does NOT fire E-SCOPE-001", () => {
    const res = compile(`<program>
  <channel name="rooms" topic=@selectedRoom>
    <messages> = []
  </>
  <selectedRoom> = "lobby"
  <p>x</p>
</program>`);
    expect(scopeDiags(res).length).toBe(0);
  });

  test("REGRESSION GUARD — cell declared BEFORE the channel still resolves clean", () => {
    const res = compile(`<program>
  \${ <selectedRoom> = "lobby" }
  <channel name="rooms" topic=@selectedRoom>
    <messages> = []
  </>
  <p>x</p>
</program>`);
    expect(scopeDiags(res).length).toBe(0);
  });

  test("the fix is GENERAL — a forward `@`-ref on a non-channel attr (input value=@later) resolves", () => {
    const res = compile(`<program>
  <input value=@laterCell>
  \${ <laterCell> = "x" }
  <p>x</p>
</program>`);
    expect(scopeDiags(res).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// NEGATIVE — genuine misuse must STILL fire E-SCOPE-001 (no over-suppression)
// ---------------------------------------------------------------------------

describe("g-channel-topic-forward-ref — genuine misuse still errors", () => {
  test("a genuinely UNDECLARED channel-attr @ghost still fires E-SCOPE-001", () => {
    const res = compile(`<program>
  <channel name="rooms" topic=@ghostRoom>
    <messages> = []
  </>
  <p>x</p>
</program>`);
    expect(scopeDiags(res).length).toBeGreaterThanOrEqual(1);
    // E- code → result.errors, never result.warnings.
    expect((res.errors || []).some((d) => d.code === "E-SCOPE-001")).toBe(true);
    expect((res.warnings || []).some((d) => d.code === "E-SCOPE-001")).toBe(false);
  });

  test("a genuinely UNDECLARED generic-attr @ghost still fires E-SCOPE-001", () => {
    const res = compile(`<program>
  <input value=@neverDeclared>
  <p>x</p>
</program>`);
    expect(scopeDiags(res).length).toBeGreaterThanOrEqual(1);
  });

  test("a BARE-name forward-ref (missing `@` sigil) still fires E-SCOPE-001 (F5 reactive-without-sigil)", () => {
    // `value=laterCell` references the reactive `@laterCell` without its `@`.
    // The pre-pass binds the cell `kind:"reactive"`, so the F5 bare-name branch
    // (visitAttr `entry.kind === "reactive" && !baseName.startsWith("@")`) must
    // still flag it rather than silently resolving the bare name.
    const res = compile(`<program>
  <input value=laterCell>
  \${ <laterCell> = "x" }
  <p>x</p>
</program>`);
    expect(scopeDiags(res).length).toBeGreaterThanOrEqual(1);
  });
});
