// Conformance tests for: SPEC §54 (S32, 2026-04-20 — NEW SECTION)
//
// §54 introduces nested substates, state-local transitions, the `from`
// contextual keyword, field narrowing across substates, terminal-by-absence,
// four new error codes (E-STATE-COMPLETE, E-STATE-FIELD-MISSING,
// E-STATE-TRANSITION-ILLEGAL, E-STATE-TERMINAL-MUTATION), and an
// eight-row interaction matrix (§54.7).
//
// STATUS: ALL TESTS SKIPPED — spec-only amendment as of commit 1d1c49d.
// Compiler implementation of §54 has NOT landed. These tests are gating
// tests for the implementer.

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../../src/api.js";

function diagnose(/* source */) {
  throw new Error("diagnose() harness not yet implemented — see test body");
}

// ---------------------------------------------------------------------------
// §54.3 — Transition body shape and `from` keyword
// ---------------------------------------------------------------------------

describe("S32-015: §54.3 — transition body SHALL terminate with explicit `return < SubstateName>` literal", () => {
  test.skip("CONF-S32-015a: transition body without a terminal `return` is a compile error", () => {
    const src = `
      < Submission>
          < Draft>
              validate() => < Validated> {
                  let _ = 1   // no return statement
              }
          </>
          < Validated></>
      </>
    `;
    const { errors } = diagnose(src);
    expect(errors.length).toBeGreaterThan(0);
  });

  test.skip("CONF-S32-015b: transition whose `return` operand is not a `< SubstateName>` literal is a compile error", () => {
    const src = `
      < Submission>
          < Draft>
              validate() => < Validated> {
                  return 42  // not a state literal
              }
          </>
          < Validated></>
      </>
    `;
    const { errors } = diagnose(src);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("S32-016: §54.3 — `from` SHALL be a keyword ONLY inside transition bodies", () => {
  test.skip("CONF-S32-016: `from.field` inside a transition body resolves to the pre-transition instance", () => {
    const src = `
      < Submission>
          id: string
          < Draft>
              validate() => < Validated> {
                  return < Validated> id = from.id </>  // 'from' is pre-transition
              }
          </>
          < Validated>
              id: string
          </>
      </>
    `;
    const { errors } = diagnose(src);
    expect(errors).toEqual([]);
  });
});

describe("S32-017: §54.3 — `from` SHALL NOT be reserved outside transition bodies", () => {
  test.skip("CONF-S32-017a: `from` as a parameter name in a plain function is legal", () => {
    const src = `${"${"} function add(from, n) { return from + n } ${"}"}`;
    const { errors } = diagnose(src);
    expect(errors).toEqual([]);
  });

  test.skip("CONF-S32-017b: `from` as a local `let` binding outside a transition body is legal", () => {
    const src = `${"${"} function f() { let from = 1; return from + 1 } ${"}"}`;
    const { errors } = diagnose(src);
    expect(errors).toEqual([]);
  });

  test.skip("CONF-S32-017c: `from` as a field name in a struct is legal", () => {
    const src = `
      < state Edge>
          from: string
          to: string
      </>
    `;
    const { errors } = diagnose(src);
    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §54.4 — Field visibility and match exhaustiveness
// ---------------------------------------------------------------------------

describe("S32-018: §54.4 — `match` over a substated state type SHALL require exhaustive substate coverage", () => {
  test.skip("CONF-S32-018: non-exhaustive substate match emits E-TYPE-020", () => {
    const src = `
      < Submission>
          < Draft></>
          < Validated></>
          < Submitted></>
      </>
      ${"${"}
        function status(sub) {
            return match sub {
                < Draft>     => "editing"
                < Validated> => "ready"
                // missing < Submitted> arm
            }
        }
      ${"}"}
    `;
    const { errors } = diagnose(src);
    expect(errors.some((e) => e.code === "E-TYPE-020")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §54.5 — Terminal substates
// ---------------------------------------------------------------------------

describe("S32-019: §54.5 — terminal substates accept no state-local transition calls", () => {
  test.skip("CONF-S32-019: calling any transition on a terminal-narrowed binding emits E-STATE-TRANSITION-ILLEGAL", () => {
    const src = `
      < Submission>
          id: string
          < Draft>
              submit() => < Submitted> { return < Submitted> id = from.id </> }
          </>
          < Submitted>
              id: string
              // zero outgoing transitions — positively terminal
          </>
      </>
      ${"${"}
        function tryEdit(@sub: Submission) {
            @sub = @sub.submit()
            @sub = @sub.submit()  // E-STATE-TRANSITION-ILLEGAL: Submitted is terminal
        }
      ${"}"}
    `;
    const { errors } = diagnose(src);
    expect(errors.some((e) => e.code === "E-STATE-TRANSITION-ILLEGAL")).toBe(
      true
    );
  });
});

describe("S32-020: §54.5 — terminal substates reject all field mutations", () => {
  test.skip("CONF-S32-020: writing to any field of a terminal-narrowed binding emits E-STATE-TERMINAL-MUTATION", () => {
    const src = `
      < Submission>
          id: string
          < Submitted>
              id: string
              body: string
          </>
      </>
      ${"${"}
        function tryMutate(@sub: Submission) {
            @sub.body = "new"  // E-STATE-TERMINAL-MUTATION
        }
      ${"}"}
    `;
    const { errors } = diagnose(src);
    expect(errors.some((e) => e.code === "E-STATE-TERMINAL-MUTATION")).toBe(
      true
    );
  });
});

// ---------------------------------------------------------------------------
// §54.6 — Error codes (universal-scope E-STATE-COMPLETE and friends)
// ---------------------------------------------------------------------------

describe("S32-021: §54.6.1 — E-STATE-COMPLETE fires at state literal's closing tag (universal scope)", () => {
  test.skip("CONF-S32-021a: state literal with unassigned required field emits E-STATE-COMPLETE at the `</>`", () => {
    const src = `
      < state Product>
          name: string
          price: number
          sku: string
      </>
      ${"${"}
        let p = < Product> name = "x" price = 1 </>  // sku unassigned
      ${"}"}
    `;
    const { errors } = diagnose(src);
    expect(errors.some((e) => e.code === "E-STATE-COMPLETE")).toBe(true);
  });

  test.skip("CONF-S32-021b: E-STATE-COMPLETE does NOT fire for fields with `= not` defaults", () => {
    const src = `
      < state Product>
          name: string
          sku: string = not
      </>
      ${"${"}
        let p = < Product> name = "x" </>  // sku has default; OK
      ${"}"}
    `;
    const { errors } = diagnose(src);
    expect(errors.some((e) => e.code === "E-STATE-COMPLETE")).toBe(false);
  });
});

describe("S32-022: §54.6.2 — E-STATE-FIELD-MISSING on cross-substate field read", () => {
  test.skip("CONF-S32-022: reading a field declared on a different substate emits E-STATE-FIELD-MISSING with cross-substate hint", () => {
    const src = `
      < Submission>
          id: string
          < Draft>
              body: string
          </>
          < Submitted>
              submittedAt: number
          </>
      </>
      ${"${"}
        function readWhenDraft(@sub: Submission) {
            if (@sub is < Draft>) {
                let t = @sub.submittedAt  // E-STATE-FIELD-MISSING
            }
        }
      ${"}"}
    `;
    const { errors } = diagnose(src);
    const err = errors.find((e) => e.code === "E-STATE-FIELD-MISSING");
    expect(err).toBeDefined();
    // Diagnostic format (§54.6.2) REQUIRES mentioning the other substate that
    // actually declares the field. Implementer: assert err.message mentions
    // "Submitted" and "submittedAt".
  });
});

describe("S32-023: §54.6.3 — E-STATE-TRANSITION-ILLEGAL on non-declared transition call", () => {
  test.skip("CONF-S32-023: calling a transition not declared on the current substate emits E-STATE-TRANSITION-ILLEGAL", () => {
    const src = `
      < Submission>
          id: string
          < Draft>
              validate() => < Validated> { return < Validated> id = from.id </> }
          </>
          < Validated>
              id: string
              submit() => < Submitted> { return < Submitted> id = from.id </> }
          </>
          < Submitted>
              id: string
          </>
      </>
      ${"${"}
        function oops(@sub: Submission) {
            if (@sub is < Draft>) {
                @sub = @sub.submit()  // E-STATE-TRANSITION-ILLEGAL — submit not on Draft
            }
        }
      ${"}"}
    `;
    const { errors } = diagnose(src);
    expect(errors.some((e) => e.code === "E-STATE-TRANSITION-ILLEGAL")).toBe(
      true
    );
  });
});

describe("S32-024: §54.6.4 — E-STATE-TERMINAL-MUTATION on terminal-substate field write", () => {
  test.skip("CONF-S32-024: writing to a field of a terminal-narrowed binding emits E-STATE-TERMINAL-MUTATION with explanation", () => {
    const src = `
      < Submission>
          < Submitted>
              body: string
              // no transitions -> terminal
          </>
      </>
      ${"${"}
        function mut(@sub: Submission) {
            if (@sub is < Submitted>) {
                @sub.body = "edited"  // E-STATE-TERMINAL-MUTATION
            }
        }
      ${"}"}
    `;
    const { errors } = diagnose(src);
    const err = errors.find((e) => e.code === "E-STATE-TERMINAL-MUTATION");
    expect(err).toBeDefined();
    // Diagnostic format (§54.6.4) REQUIRES mentioning "positively terminal"
    // and suggesting a self-transition. Implementer: assert err.message.
  });
});

// ---------------------------------------------------------------------------
// §54.7 — Interaction matrix (normative statements)
// ---------------------------------------------------------------------------

describe("S32-025: §54.7.1 — state-local transition SHALL be observable to projection machines", () => {
  test.skip("CONF-S32-025: a `< machine derived=@source>` re-reads after a state-local transition assigns @source", () => {
    // Expected: projection machines observe the reactive reassignment caused
    // by a transition call identically to any other reassignment.
    const src = `
      < Submission>
          < Draft>
              validate() => < Validated> { return < Validated> </> }
          </>
          < Validated></>
      </>
      ${"${"}
        @sub: Submission = < Draft> </>
        @view = < machine derived=@sub> /* ... */ </>
        @sub = @sub.validate()
      ${"}"}
    `;
    const { errors } = diagnose(src);
    expect(errors).toEqual([]);
    // Implementer: assert at codegen/runtime that the derived view's
    // dependency on @sub triggers re-read on the transition assignment.
  });
});

describe("S32-026: §54.7.2 — state-local transitions SHALL be compatible with `lin` bindings without special marking", () => {
  test.skip("CONF-S32-026: `lin @sub: Submission` consumed by `@sub = @sub.validate(now)` compiles without lin-specific diagnostic", () => {
    // Expected: the old binding is consumed at `=`, linearity is preserved;
    // no E-LIN-* fires.
    const src = `
      < Submission>
          < Draft>
              validate() => < Validated> { return < Validated> </> }
          </>
          < Validated></>
      </>
      ${"${"}
        lin @sub: Submission = < Draft> </>
        @sub = @sub.validate()  // linear consume + re-assign
      ${"}"}
    `;
    const { errors } = diagnose(src);
    expect(errors.some((e) => e.code && e.code.startsWith("E-LIN-"))).toBe(
      false
    );
  });
});

describe("S32-027: §54.7.4 — `when @var changes {}` SHALL fire exactly once per state-local transition call", () => {
  test.skip("CONF-S32-027: `when @sub changes {}` observes exactly one trigger per transition", () => {
    // Expected: §54.7.4 — a transition call is exactly one reactive assignment,
    // and the `when ... changes` hook fires exactly once. Implementer: this is
    // primarily a codegen/runtime behavior test; the static check is that the
    // emitted runtime wires a single subscription-trigger edge.
    const src = `
      < Submission>
          < Draft>
              validate() => < Validated> { return < Validated> </> }
          </>
          < Validated></>
      </>
      ${"${"}
        @sub: Submission = < Draft> </>
        when @sub changes { /* handler */ }
        @sub = @sub.validate()
      ${"}"}
    `;
    const { errors } = diagnose(src);
    expect(errors).toEqual([]);
    // Runtime assertion stub — implementer to wire to a harness that counts
    // `when ... changes` invocations, expecting exactly 1.
  });
});

describe("S32-028: §54.7.5 — audit SHALL capture state-local transition assignments on machine-bound variables", () => {
  test.skip("CONF-S32-028a: machine-bound variable audit-captures a transition call", () => {
    // Expected: audit clause sees the re-assignment produced by the transition.
    const src = `
      < Submission>
          < Draft>
              validate() => < Validated> { return < Validated> </> }
          </>
          < Validated></>
      </>
      < machine name=Flow for=Submission audit=@log></>
      ${"${"}
        @log: any[] = []
        @sub: Submission = < Draft> </>
        bind @sub -> < machine Flow>
        @sub = @sub.validate()  // audit SHALL capture this edge
      ${"}"}
    `;
    const { errors } = diagnose(src);
    expect(errors).toEqual([]);
    // Runtime assertion: @log length increments by exactly 1.
  });

  test.skip("CONF-S32-028b: non-machine-bound state variable transition is NOT audited", () => {
    // Expected: no machine bind = no audit. No diagnostic either way.
    const src = `
      < Submission>
          < Draft>
              validate() => < Validated> { return < Validated> </> }
          </>
          < Validated></>
      </>
      ${"${"}
        @sub: Submission = < Draft> </>
        @sub = @sub.validate()  // NOT audited (no bind)
      ${"}"}
    `;
    const { errors } = diagnose(src);
    expect(errors).toEqual([]);
    // Runtime assertion: no audit sink exists; compiler SHALL NOT generate one.
  });
});

describe("S32-029: §54.7.6 — replay SHALL execute the state-local transition body", () => {
  test.skip("CONF-S32-029: replay re-runs the transition body (preserves `validatedAt = now` side-effect-via-parameter)", () => {
    // Expected: §51.14 replay, when replaying an edge that corresponds to a
    // state-local transition, SHALL invoke the transition body (not just
    // reassign the target substate directly).
    const src = `
      < Submission>
          id: string
          < Draft>
              validate(now: number) => < Validated> {
                  return < Validated> id = from.id validatedAt = now </>
              }
          </>
          < Validated>
              id: string
              validatedAt: number
          </>
      </>
      < machine name=Flow for=Submission replay=@log></>
      ${"${"}
        @log: any[] = []
        @sub: Submission = < Draft> id = "x" </>
        bind @sub -> < machine Flow>
        @sub = @sub.validate(42)
      ${"}"}
    `;
    const { errors } = diagnose(src);
    expect(errors).toEqual([]);
    // Runtime assertion: after replay, @sub.validatedAt === 42
    // (body executed, not just direct reassignment).
  });
});

describe("S32-030: §54.7.7 — temporal transition SHALL NOT execute any state-local transition body", () => {
  test.skip("CONF-S32-030: `after Ns => .To` fires a pure reassignment; no method body runs", () => {
    // Expected: §54.7.7 — temporal edges are pure reassignments. Any
    // state-local transition body targeting the same substate SHALL NOT run.
    const src = `
      < Submission>
          < Draft>
              expire() => < Expired> { return < Expired> </> }   // state-local
          </>
          < Expired></>
      </>
      < machine name=Flow for=Submission>
          after 30s => .Expired   // temporal — body NOT executed
      </>
    `;
    const { errors } = diagnose(src);
    expect(errors).toEqual([]);
    // Runtime assertion: side effects observable only through the body are
    // absent after a temporal fire.
  });
});

describe("S32-031: §54.7.8 — E-STATE-COMPLETE fires at the `</>` of a lifted literal inside `fn`", () => {
  test.skip("CONF-S32-031: `lift < Substate> ... </>` with unassigned field emits E-STATE-COMPLETE at the literal's closing tag", () => {
    // Expected: the lift statement itself produces no diagnostic; the state-
    // literal completeness check runs universally and fires at `</>` BEFORE
    // the lift accumulates.
    const src = `
      < state Row>
          name: string
          age: number
      </>
      ${"${"}
        fn buildRows(n) {
            for (let i = 0; i < n; i = i + 1) {
                lift < Row> name = "x" </>  // age unassigned — E-STATE-COMPLETE at </>
            }
            return ~
        }
      ${"}"}
    `;
    const { errors } = diagnose(src);
    expect(errors.some((e) => e.code === "E-STATE-COMPLETE")).toBe(true);
  });
});
