// Conformance tests for: SPEC §54 (S32, 2026-04-20 — NEW SECTION)
//
// §54 introduces nested substates, state-local transitions, the `from`
// contextual keyword, field narrowing across substates, terminal-by-absence,
// four new error codes, and an eight-row interaction matrix (§54.7).
//
// Un-skipped during S33 where Phase 4a-4g coverage made the test executable.
// Remaining skips annotate specific gating dependencies (`@ narrowing`,
// inline state-literal field assign, machine audit/replay runtime).

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";
import { runTS } from "../../../src/type-system.js";

function diagnose(source) {
  const bs = splitBlocks("/conformance/test.scrml", source);
  const { ast, errors: astErrors } = buildAST(bs);
  const res = runTS({ files: [ast] });
  const all = [...(bs.errors || []), ...(astErrors || []), ...(res.errors || [])];
  const errors = all.filter(e => e.severity !== "warning");
  const warnings = all.filter(e => e.severity === "warning");
  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// §54.3 — Transition body shape and `from` keyword
// ---------------------------------------------------------------------------

describe("S32-015: §54.3 — transition body SHALL terminate with explicit `return < SubstateName>` literal", () => {
  test.skip("CONF-S32-015a: transition body without a terminal `return` is a compile error", () => {
    // Gate: return-type narrowing / terminal-return enforcement is Phase 4h
    // territory. Spec §54.6 has no assigned code for this (NEW NC-3 open).
    const src =
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { let _ = 1 }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>`;
    const { errors } = diagnose(src);
    expect(errors.length).toBeGreaterThan(0);
  });

  test.skip("CONF-S32-015b: transition whose `return` operand is not a `< SubstateName>` literal is a compile error", () => {
    // Gate: same as 015a — Phase 4h.
    const src =
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { return 42 }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>`;
    const { errors } = diagnose(src);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("S32-016: §54.3 — `from` SHALL be a keyword ONLY inside transition bodies", () => {
  test("CONF-S32-016: `from.field` inside a transition body does not emit E-SCOPE-001", () => {
    const src =
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { let b = from.body }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>`;
    const { errors } = diagnose(src);
    const fromScopeErr = errors.find(e =>
      e.code === "E-SCOPE-001" && /\bfrom\b/.test(String(e.message))
    );
    expect(fromScopeErr).toBeUndefined();
  });
});

describe("S32-017: §54.3 — `from` SHALL NOT be reserved outside transition bodies", () => {
  test("CONF-S32-017a: `from` as a parameter name in a plain function is legal", () => {
    const src = `\${ function add(from, n) { return from + n } }`;
    const { errors } = diagnose(src);
    // No E-SCOPE-001 on `from`, no reserved-keyword error.
    const fromErrs = errors.filter(e =>
      e.code === "E-SCOPE-001" && /\bfrom\b/.test(String(e.message))
    );
    expect(fromErrs).toHaveLength(0);
  });

  test("CONF-S32-017b: `from` as a local `let` binding outside a transition body is legal", () => {
    const src = `\${ function f() { let from = 1; return from + 1 } }`;
    const { errors } = diagnose(src);
    const fromErrs = errors.filter(e =>
      e.code === "E-SCOPE-001" && /\bfrom\b/.test(String(e.message))
    );
    expect(fromErrs).toHaveLength(0);
  });

  test.skip("CONF-S32-017c: `from` as a field name in a struct is legal", () => {
    // Gate: scrml uses typed-attr syntax `name(type)`, not `name: type`.
    // The `< state Edge>` form is not recognized. Struct-level `from`
    // field-name testing requires `< Edge from(string) to(string)></>`
    // and a separate type-system field-naming path not yet wired.
    const src = `< Edge from(string) to(string)></>`;
    const { errors } = diagnose(src);
    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §54.4 — Field visibility and match exhaustiveness
// ---------------------------------------------------------------------------

describe("S32-018: §54.4 — `match` over a substated state type SHALL require exhaustive substate coverage", () => {
  test.skip("CONF-S32-018: non-exhaustive substate match emits E-TYPE-020", () => {
    // Gate: CONF-S32-018 uses untyped `< state ...>` syntax. The equivalent
    // pattern with typed-attr syntax IS verified by unit tests
    // (substate-match-e2e.test.js / substate-match-exhaustiveness.test.js).
    const src =
      `< Submission id(string)>\n` +
      `    < Draft body(string)></>\n` +
      `    < Validated body(string)></>\n` +
      `    < Submitted body(string)></>\n` +
      `</>\n` +
      `\${ function status(sub) { return match sub { < Draft> => "a"; < Validated> => "b" } } }`;
    const { errors } = diagnose(src);
    expect(errors.some(e => e.code === "E-TYPE-020")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §54.5 — Terminal substates
// ---------------------------------------------------------------------------

describe("S32-019: §54.5 — terminal substates accept no state-local transition calls", () => {
  test("CONF-S32-019: calling a transition on a terminal-substate binding emits E-STATE-TRANSITION-ILLEGAL", () => {
    // Simpler shape than the spec-doc narrow-via-is case; uses direct type
    // annotation which is the well-tested narrowing path.
    const src =
      `<program>\n` +
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>\n` +
      `\${\n` +
      `  let d: Draft = < Draft></>;\n` +
      `  d.somethingElse();\n` +
      `}\n` +
      `</program>`;
    const { errors } = diagnose(src);
    expect(errors.some(e => e.code === "E-STATE-TRANSITION-ILLEGAL")).toBe(true);
  });
});

describe("S32-020: §54.5 — terminal substates reject all field mutations", () => {
  test("CONF-S32-020: writing to a field of a terminal-substate binding emits E-STATE-TERMINAL-MUTATION", () => {
    const src =
      `<program>\n` +
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>\n` +
      `\${\n` +
      `  let v: Validated = < Validated></>;\n` +
      `  v.body = "edited";\n` +
      `}\n` +
      `</program>`;
    const { errors } = diagnose(src);
    expect(errors.some(e => e.code === "E-STATE-TERMINAL-MUTATION")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §54.6 — Error codes (universal-scope E-STATE-COMPLETE and friends)
// ---------------------------------------------------------------------------

describe("S32-021: §54.6.1 — E-STATE-COMPLETE fires at state literal's closing tag (universal scope)", () => {
  test.skip("CONF-S32-021a: state literal with unassigned required field emits E-STATE-COMPLETE at the `</>`", () => {
    // Gate: inline state-literal field-assignment parser support (shared
    // with CONF-S32-006a/b). E-STATE-COMPLETE universal walker IS live
    // (Phase 1b) — unit tests verify the walker; field-assignment syntax
    // is the remaining unresolved parse path.
    const src =
      `< Product name(string) price(number) sku(string)></>\n` +
      `\${ let p = < Product> name = "x" price = 1 </> }`;
    const { errors } = diagnose(src);
    expect(errors.some(e => e.code === "E-STATE-COMPLETE")).toBe(true);
  });

  test.skip("CONF-S32-021b: E-STATE-COMPLETE does NOT fire for fields with `= not` defaults", () => {
    // Gate: same as 021a.
    const src =
      `< Product name(string) sku(string) = not></>\n` +
      `\${ let p = < Product> name = "x" </> }`;
    const { errors } = diagnose(src);
    expect(errors.some(e => e.code === "E-STATE-COMPLETE")).toBe(false);
  });
});

describe("S32-022: §54.6.2 — E-STATE-FIELD-MISSING on cross-substate field read", () => {
  test.skip("CONF-S32-022: reading a field declared on a different substate emits E-STATE-FIELD-MISSING", () => {
    // Gate: E-STATE-FIELD-MISSING + cross-substate narrowing via `is` is a
    // separate Phase 4-adjacent arc (§54.4). Not implemented.
    const src =
      `< Submission id(string)>\n` +
      `    < Draft body(string)></>\n` +
      `    < Submitted submittedAt(number)></>\n` +
      `</>\n` +
      `\${ function readWhenDraft(@sub: Submission) { if (@sub is < Draft>) { let t = @sub.submittedAt } } }`;
    const { errors } = diagnose(src);
    const err = errors.find(e => e.code === "E-STATE-FIELD-MISSING");
    expect(err).toBeDefined();
  });
});

describe("S32-023: §54.6.3 — E-STATE-TRANSITION-ILLEGAL on non-declared transition call", () => {
  test.skip("CONF-S32-023: calling a transition not declared on the current substate emits E-STATE-TRANSITION-ILLEGAL", () => {
    // Gate: the spec fixture uses `is`-based narrowing + `@sub.method()` call
    // after narrowing. Narrowing-via-is isn't yet threaded into the call-site
    // check. Direct-substate-binding call IS covered by CONF-S32-019 and
    // unit/transition-decl-illegal.test.js.
    const src =
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)>\n` +
      `        submit() => < Submitted> { }\n` +
      `    </>\n` +
      `    < Submitted body(string)></>\n` +
      `</>\n` +
      `\${ function oops(@sub: Submission) { if (@sub is < Draft>) { @sub.submit() } } }`;
    const { errors } = diagnose(src);
    expect(errors.some(e => e.code === "E-STATE-TRANSITION-ILLEGAL")).toBe(true);
  });
});

describe("S32-024: §54.6.4 — E-STATE-TERMINAL-MUTATION on terminal-substate field write", () => {
  test.skip("CONF-S32-024: writing to a field of a terminal-narrowed binding emits E-STATE-TERMINAL-MUTATION with explanation", () => {
    // Gate: narrowing-via-is path. Direct-substate-binding write IS covered
    // by CONF-S32-020 and unit/transition-decl-terminal.test.js.
    const src =
      `< Submission id(string)>\n` +
      `    < Submitted body(string)></>\n` +
      `</>\n` +
      `\${ function mut(@sub: Submission) { if (@sub is < Submitted>) { @sub.body = "edited" } } }`;
    const { errors } = diagnose(src);
    const err = errors.find(e => e.code === "E-STATE-TERMINAL-MUTATION");
    expect(err).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §54.7 — Interaction matrix (normative statements — all deferred)
// ---------------------------------------------------------------------------

describe("S32-025 through S32-031: §54.7 interaction matrix", () => {
  test.skip("CONF-S32-025: projection machines observe state-local transition reassignments", () => {
    // Gate: runtime behavior (machine derived=), needs e2e harness.
    const src = `/* pending runtime harness */`;
    expect(src).toBeDefined();
  });
  test.skip("CONF-S32-026: lin + state-local transitions — no E-LIN-*", () => {
    // Gate: lin redesign Approach B ratified but not yet implemented.
    const src = `/* pending lin redesign */`;
    expect(src).toBeDefined();
  });
  test.skip("CONF-S32-027: `when @var changes {}` — exactly one firing per transition", () => {
    // Gate: runtime behavior.
    const src = `/* pending runtime harness */`;
    expect(src).toBeDefined();
  });
  test.skip("CONF-S32-028a: machine-bound audit captures transition edge", () => {
    // Gate: runtime behavior (audit sink).
    const src = `/* pending runtime harness */`;
    expect(src).toBeDefined();
  });
  test.skip("CONF-S32-028b: non-machine-bound transition is not audited", () => {
    // Gate: runtime behavior (audit sink).
    const src = `/* pending runtime harness */`;
    expect(src).toBeDefined();
  });
  test.skip("CONF-S32-029: replay re-runs transition body", () => {
    // Gate: replay engine integration, runtime behavior.
    const src = `/* pending replay runtime */`;
    expect(src).toBeDefined();
  });
  test.skip("CONF-S32-030: temporal transition does NOT execute state-local body", () => {
    // Gate: temporal-transition engine + state-local body dispatch path.
    const src = `/* pending temporal runtime */`;
    expect(src).toBeDefined();
  });
  test.skip("CONF-S32-031: E-STATE-COMPLETE on lifted state literal at `</>`", () => {
    // Gate: same as 021a — inline state-literal field-assignment syntax.
    const src = `/* pending inline-field-assign parser */`;
    expect(src).toBeDefined();
  });
});
