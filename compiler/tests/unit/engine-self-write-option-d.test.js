/**
 * engine-self-write-option-d.test.js — v0.3 §51.0.F Option-d synthesis
 *
 * Three deliverables in one test file:
 *
 *   D1 — RUNTIME no-op semantics on self-write.
 *        `_scrml_engine_direct_set("x", current)` and
 *        `_scrml_engine_advance("x", current)` are TRUE no-ops when target
 *        equals current. Returns false (non-external-transition signal).
 *        No <onTransition>, no history capture, no timer rearm, no idle reset,
 *        no subscriber fire.
 *
 *   D2 — COMPILE-TIME info lint W-ENGINE-SELF-WRITE-DETECTED.
 *        Two fire conditions:
 *          (a) Inside state-child body — fire-site #10 in PASS 16
 *              (validateEngineA5Extensions). STRICT — fires when the cascade-
 *              miss scanner sees `dw.target === sc.tag`. The cascade-miss
 *              E-ENGINE-INVALID-TRANSITION check is intentionally SKIPPED
 *              for self-writes.
 *          (b) Outside state-child body — PASS 12.B walker
 *              (walkEngineSelfWriteOutside). CONSERVATIVE — fires when
 *              `@var = .Variant` writes in function bodies / top-level logic
 *              target a literal variant of a non-derived engine cell.
 *
 *   D3 — SPEC §51.0.F amendment + §34 catalog row are exercised indirectly:
 *        the AC4 silent-cases below assert that LEGITIMATE state changes
 *        (cross-state writes that satisfy rule=) still fire ZERO diagnostics.
 *
 * Acceptance criteria coverage:
 *   AC1 — 14-mario AC6/AC7 e2e: out of scope here (PA lands the fixture).
 *   AC2 — Existing engine tests pass without regression: tested in pre-commit.
 *   AC3 — W-ENGINE-SELF-WRITE-DETECTED fires inside + outside.
 *   AC4 — W-ENGINE-SELF-WRITE-DETECTED silent on cross-state writes.
 *   AC5 — Test count target +10 to +15 (this file: 14 tests).
 *   AC6/AC7 — SPEC + idiomatic-examples: out of unit-test scope.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runSYM } from "../../src/symbol-table.ts";
import { RUNTIME_CHUNKS } from "../../src/codegen/runtime-chunks.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runUpToSYM(source, filePath = "test.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast } = buildAST(bs);
  return { ast, sym: runSYM({ filePath, ast }) };
}

/** Build a minimal runtime sandbox over RUNTIME_CHUNKS.engine for D1 tests.
 *  Mirrors c13-advance-write-hook.test.js makeRuntime() shape — see that
 *  file's §C13.4 comment for the "// " re-prefix rationale. */
function makeRuntime() {
  const src = "// " + RUNTIME_CHUNKS.engine;
  const wrapped = `
    var _scrml_state = {};
    var _scrml_reactive_get = function(name) { return _scrml_state[name]; };
    var _scrml_reactive_set_calls = [];
    var _scrml_reactive_set = function(name, value) {
      _scrml_state[name] = value;
      _scrml_reactive_set_calls.push({ name: name, value: value });
    };
    ${src}
    return {
      _scrml_engine_advance,
      _scrml_engine_direct_set,
      _scrml_engine_check_transition,
      _scrml_state,
      get setCalls() { return _scrml_reactive_set_calls.slice(); },
      resetSetCalls() { _scrml_reactive_set_calls.length = 0; },
    };
  `;
  return new Function(wrapped)();
}

function errorsByCode(errors, code) {
  return errors.filter((e) => e.code === code);
}

// ===========================================================================
// D1 — Runtime no-op on self-write
// ===========================================================================

describe("Option-d D1 — runtime self-write no-op", () => {
  test("_scrml_engine_direct_set: target === current returns false (no-op signal) and does NOT call _scrml_reactive_set", () => {
    const r = makeRuntime();
    r._scrml_state.marioState = "Small";
    const table = Object.freeze({ Small: ["Big"], Big: [] });
    r.resetSetCalls();
    const result = r._scrml_engine_direct_set("marioState", "Small", table);
    // Returns false — non-external-transition signal (consistent with the
    // internal-rule path's return shape).
    expect(result).toBe(false);
    // Cell value unchanged.
    expect(r._scrml_state.marioState).toBe("Small");
    // _scrml_reactive_set was NOT called — no subscriber fire.
    expect(r.setCalls.length).toBe(0);
  });

  test("_scrml_engine_advance: target === current returns false and does NOT call _scrml_reactive_set", () => {
    const r = makeRuntime();
    r._scrml_state.marioState = "Small";
    // rule=.Big — single-target, does NOT include .Small. Under v0.3 §51.0.F
    // self-write to .Small is a NO-OP (NOT a rule= violation).
    const table = Object.freeze({ Small: ["Big"], Big: [] });
    r.resetSetCalls();
    const result = r._scrml_engine_advance("marioState", "Small", table);
    expect(result).toBe(false);
    expect(r._scrml_state.marioState).toBe("Small");
    expect(r.setCalls.length).toBe(0);
  });

  test("_scrml_engine_advance: self-write does NOT throw E-ENGINE-INVALID-TRANSITION even when rule= excludes self", () => {
    // The crux of Option-d: when rule= does NOT list the current variant as
    // a target, the legacy behavior was to throw on self-write. Under v0.3
    // the runtime returns false silently.
    const r = makeRuntime();
    r._scrml_state.marioState = "Small";
    const table = Object.freeze({ Small: ["Big"], Big: ["Small"] });
    expect(() => r._scrml_engine_advance("marioState", "Small", table)).not.toThrow();
  });

  test("_scrml_engine_direct_set: cross-state write that violates rule= STILL throws (regression guard)", () => {
    // The runtime no-op only short-circuits self-writes. Cross-state writes
    // that violate rule= must continue to throw. AC2 protection.
    const r = makeRuntime();
    r._scrml_state.marioState = "Small";
    const table = Object.freeze({ Small: ["Big"], Big: [] });
    expect(() => r._scrml_engine_direct_set("marioState", "Cape", table))
      .toThrow(/E-ENGINE-INVALID-TRANSITION/);
    expect(r._scrml_state.marioState).toBe("Small");
  });

  test("_scrml_engine_advance: cross-state legal transition still commits + returns true", () => {
    // Ensure the no-op short-circuit hasn't broken the canonical happy path.
    const r = makeRuntime();
    r._scrml_state.x = "A";
    const table = Object.freeze({ A: ["B"], B: ["A"] });
    r.resetSetCalls();
    const result = r._scrml_engine_advance("x", "B", table);
    expect(result).toBe(true);
    expect(r._scrml_state.x).toBe("B");
    expect(r.setCalls.length).toBe(1);
    expect(r.setCalls[0]).toEqual({ name: "x", value: "B" });
  });

  test("self-write precedence: short-circuits BEFORE internal-rule path (no idle-watchdog reset)", () => {
    // Per v0.3 §51.0.F, self-write is the TRUE no-op shape — it preempts
    // even the internal-rule path that resets the idle watchdog. We verify
    // by passing an idle-entry callback proxy: the helper returns false
    // immediately; idle reset never fires (we don't have a global idle
    // watchdog visible here, so we assert via the return value + no _scrml
    // _reactive_set call as the proxy for "no side effects").
    const r = makeRuntime();
    r._scrml_state.x = "Same";
    // Internal table permits self-loop. External table does NOT list .Same
    // as a target. Under v0.3 §51.0.F the self-write IS a no-op regardless
    // of which table would have permitted it.
    const externalTable = Object.freeze({ Same: ["Other"], Other: ["Same"] });
    const internalTable = Object.freeze({ Same: ["Same"] });
    r.resetSetCalls();
    const result = r._scrml_engine_advance(
      "x", "Same", externalTable, null, null, internalTable, null,
    );
    expect(result).toBe(false);
    expect(r._scrml_state.x).toBe("Same");
    expect(r.setCalls.length).toBe(0);
  });
});

// ===========================================================================
// D2 part A — W-ENGINE-SELF-WRITE-DETECTED inside state-child body (STRICT)
// ===========================================================================

describe("Option-d D2A — W-ENGINE-SELF-WRITE-DETECTED inside state-child body", () => {
  test("@var = .Variant where .Variant matches the enclosing state-child tag — fires info lint", () => {
    const src = `\${ type Phase:enum = { Idle, Active, Done } }
<engine for=Phase initial=.Active>
  <Idle rule=.Active></>
  <Active rule=.Done>
    <button onclick=\${ @phase = .Active }>Self-write</button>
  </>
  <Done></>
</>`;
    const { sym } = runUpToSYM(src);
    const lints = errorsByCode(sym.errors, "W-ENGINE-SELF-WRITE-DETECTED");
    expect(lints.length).toBe(1);
    expect(lints[0].severity).toBe("info");
    expect(lints[0].message).toContain("@phase = .Active");
    expect(lints[0].message).toContain("<Active>");
    expect(lints[0].message).toContain("idempotent");
  });

  test("@var.advance(.Variant) where .Variant matches the enclosing state-child tag — fires info lint", () => {
    const src = `\${ type Phase:enum = { Idle, Active, Done } }
<engine for=Phase initial=.Active>
  <Idle rule=.Active></>
  <Active rule=.Done>
    <button onclick=\${ @phase.advance(.Active) }>Self-advance</button>
  </>
  <Done></>
</>`;
    const { sym } = runUpToSYM(src);
    const lints = errorsByCode(sym.errors, "W-ENGINE-SELF-WRITE-DETECTED");
    expect(lints.length).toBe(1);
    expect(lints[0].severity).toBe("info");
    expect(lints[0].message).toContain("@phase.advance(.Active)");
    expect(lints[0].message).toContain("<Active>");
  });

  test("self-write does NOT fire E-ENGINE-INVALID-TRANSITION even when rule= excludes self (cascade-miss check skipped)", () => {
    // The crux of D2 part A: fire-site #10 SKIPS fire-site #9 for self-writes.
    const src = `\${ type Phase:enum = { Idle, Active, Done } }
<engine for=Phase initial=.Active>
  <Idle rule=.Active></>
  <Active rule=.Done>
    <button onclick=\${ @phase = .Active }>Self-write no-op</button>
  </>
  <Done></>
</>`;
    const { sym } = runUpToSYM(src);
    const cascadeMiss = errorsByCode(sym.errors, "E-ENGINE-INVALID-TRANSITION");
    expect(cascadeMiss.length).toBe(0);
  });
});

// ===========================================================================
// D2 part B — W-ENGINE-SELF-WRITE-DETECTED outside state-child (CONSERVATIVE)
// ===========================================================================

describe("Option-d D2B — W-ENGINE-SELF-WRITE-DETECTED outside state-child body", () => {
  test("@var = .Variant inside a function body where .Variant is in engine.variants — fires info lint", () => {
    const src = `\${
      type Phase:enum = { Idle, Active, Done }
      function reset() { @phase = .Idle }
    }
<engine for=Phase initial=.Active>
  <Idle rule=.Active></>
  <Active rule=.Done></>
  <Done></>
</>`;
    const { sym } = runUpToSYM(src);
    const lints = errorsByCode(sym.errors, "W-ENGINE-SELF-WRITE-DETECTED");
    // Conservative fire: target .Idle is a variant of Phase; fire info.
    expect(lints.length).toBeGreaterThanOrEqual(1);
    expect(lints[0].severity).toBe("info");
    expect(lints[0].message).toContain("@phase = .Idle");
    expect(lints[0].message).toContain("OUTSIDE");
  });

  test("@var.advance(.Variant) inside a function body — fires info lint", () => {
    const src = `\${
      type Phase:enum = { Idle, Active, Done }
      function trigger() { @phase.advance(.Done) }
    }
<engine for=Phase initial=.Idle>
  <Idle rule=.Active></>
  <Active rule=.Done></>
  <Done></>
</>`;
    const { sym } = runUpToSYM(src);
    const lints = errorsByCode(sym.errors, "W-ENGINE-SELF-WRITE-DETECTED");
    expect(lints.length).toBeGreaterThanOrEqual(1);
    expect(lints[0].severity).toBe("info");
    expect(lints[0].message).toContain("@phase.advance(.Done)");
  });
});

// ===========================================================================
// D2 silent-cases — W-ENGINE-SELF-WRITE-DETECTED MUST NOT fire on these
// ===========================================================================

describe("Option-d D2 silent-cases — info lint does NOT fire on legitimate cross-state writes", () => {
  test("inside-state-child write to a DIFFERENT variant (legitimate state change) — silent", () => {
    // <Active rule=.Done> with `@phase = .Done` is the canonical legal
    // transition. Neither E-ENGINE-INVALID-TRANSITION nor W-ENGINE-SELF-
    // WRITE-DETECTED should fire.
    const src = `\${ type Phase:enum = { Idle, Active, Done } }
<engine for=Phase initial=.Active>
  <Idle rule=.Active></>
  <Active rule=.Done>
    <button onclick=\${ @phase = .Done }>Legitimate transition</button>
  </>
  <Done></>
</>`;
    const { sym } = runUpToSYM(src);
    const lints = errorsByCode(sym.errors, "W-ENGINE-SELF-WRITE-DETECTED");
    const errs = errorsByCode(sym.errors, "E-ENGINE-INVALID-TRANSITION");
    expect(lints.length).toBe(0);
    expect(errs.length).toBe(0);
  });

  test("outside-state-child write to a non-variant value (e.g., string literal) — silent", () => {
    // The walker must NOT fire on writes whose RHS is not a bare-variant
    // form (ident `.X`). A function reading `let x = "hello"` then writing
    // some other shape doesn't trigger.
    const src = `\${
      type Phase:enum = { Idle, Active, Done }
      function noop() { let x = 5; let y = x + 1 }
    }
<engine for=Phase initial=.Idle>
  <Idle rule=.Active></>
  <Active rule=.Done></>
  <Done></>
</>`;
    const { sym } = runUpToSYM(src);
    const lints = errorsByCode(sym.errors, "W-ENGINE-SELF-WRITE-DETECTED");
    expect(lints.length).toBe(0);
  });

  test("write to a NON-engine cell with bare-variant RHS — silent (cell is not an engine)", () => {
    // A plain reactive cell named `phase` (lowercase) carrying a Phase enum
    // VALUE — not an engine cell. The walker only fires when the LHS is a
    // registered engine cell. Plain reactive variant cells fall through.
    // (This guards against accidentally firing on every `@cell = .Tag` write
    // for non-engine cells.)
    const src = `\${
      type Phase:enum = { Idle, Active }
    }
<plainCell>: Phase = .Idle
\${
  function set() { @plainCell = .Idle }
}
`;
    const { sym } = runUpToSYM(src);
    const lints = errorsByCode(sym.errors, "W-ENGINE-SELF-WRITE-DETECTED");
    expect(lints.length).toBe(0);
  });
});
