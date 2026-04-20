// Conformance tests for: SPEC §33 amendments (S32, 2026-04-20)
//
// S32 extended the `pure` modifier's reach and added W-PURE-REDUNDANT.
// See §33.2 (attachment sites), §33.4 (warning), §33.6 (relationship to
// `fn` and transition bodies).
//
// STATUS: ALL TESTS SKIPPED — spec-only amendment as of commit 1d1c49d.
// Compiler implementation of W-PURE-REDUNDANT, §33.6 transition purity
// enforcement, and the extended attachment sites has NOT landed. These
// tests are gating tests for the implementer.

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../../src/api.js";

/**
 * Helper: compile a source string in library mode and return {errors, warnings}.
 * Collects diagnostics without writing any files to disk.
 */
function diagnose(/* source */) {
  // Implementer: wire this up to compileScrml({ inputFiles: [...], write:false })
  // using an in-memory fs shim or a tmpdir. The current scaffold assumes the
  // implementer will replace this stub when enabling the tests.
  throw new Error("diagnose() harness not yet implemented — see test body");
}

describe("S32-001: §33.2 — state-local transition bodies are pure by default", () => {
  test.skip("CONF-S32-001: transition body mutating outer variable emits E-PURE-001 (or E-FN-003)", () => {
    // Expected: the following source SHALL emit a purity diagnostic at the
    // outer-scope mutation inside the transition body (§33.2 +§33.6 +§48.3.3).
    const src = `
      ${"${"} let counter = 0; ${"}"}
      < Submission>
          id: string
          < Draft>
              validate() => < Validated> {
                  counter = counter + 1  // outer-scope mutation — illegal
                  return < Validated> id = from.id </>
              }
          </>
          < Validated>
              id: string
          </>
      </>
    `;
    const { errors } = diagnose(src);
    expect(
      errors.some(
        (e) => e.code === "E-PURE-001" || e.code === "E-FN-003"
      )
    ).toBe(true);
  });
});

describe("S32-002: §33.6 — transitions MAY NOT call non-deterministic built-ins", () => {
  test.skip("CONF-S32-002: Date.now() inside transition body emits E-FN-004", () => {
    // Expected: transition bodies are fn-level pure. Date.now() in a transition
    // body SHALL emit E-FN-004. Authors must pass the timestamp as a parameter.
    const src = `
      < Submission>
          id: string
          < Draft>
              validate() => < Validated> {
                  let t = Date.now()  // E-FN-004
                  return < Validated> id = from.id validatedAt = t </>
              }
          </>
          < Validated>
              id: string
              validatedAt: number
          </>
      </>
    `;
    const { errors } = diagnose(src);
    expect(errors.some((e) => e.code === "E-FN-004")).toBe(true);
  });
});

describe("S32-003: §33.4 — W-PURE-REDUNDANT on already-pure context", () => {
  test.skip("CONF-S32-003a: `pure fn` emits W-PURE-REDUNDANT", () => {
    // Expected: `pure fn` is accepted but emits W-PURE-REDUNDANT because `fn`
    // is already pure by definition. Author MAY remove the modifier.
    const src = `${"${"} pure fn double(x) { return x * 2 } ${"}"}`;
    const { warnings } = diagnose(src);
    expect(warnings.some((w) => w.code === "W-PURE-REDUNDANT")).toBe(true);
  });

  test.skip("CONF-S32-003b: `pure` on a state-local transition emits W-PURE-REDUNDANT", () => {
    // Expected: `pure` on a transition declaration is accepted but redundant —
    // transitions are implicitly fn-level pure.
    const src = `
      < Submission>
          id: string
          < Draft>
              pure validate() => < Validated> {
                  return < Validated> id = from.id </>
              }
          </>
          < Validated>
              id: string
          </>
      </>
    `;
    const { warnings } = diagnose(src);
    expect(warnings.some((w) => w.code === "W-PURE-REDUNDANT")).toBe(true);
  });
});
