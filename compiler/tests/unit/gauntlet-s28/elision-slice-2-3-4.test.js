/**
 * S28 gauntlet — §51.5 validation elision slices 2, 3, 4.
 *
 * Slice 2 (Cat 2.d): payload-variant literal RHS.
 *   `@shape = Shape.Circle(10)` — the classifier recognizes the constructor
 *   call as a literal target and elides validation when the machine has an
 *   unguarded wildcard rule covering the target variant. Payload data is
 *   carried through the state commit unchanged.
 *
 * Slice 3 (Cat 2.f): trivially-illegal → E-MACHINE-001 compile error.
 *   An assignment whose literal target has NO covering rule (no exact, no
 *   wildcard-target, no wildcard-source, no *:*) is rejected at compile
 *   time per §51.5.1. The compiler emits E-MACHINE-001 into the codegen
 *   errors list and continues to produce a file (with the full guard
 *   still present as a runtime safety net if the user ignores the error).
 *
 * Slice 4: --no-elide debug knob.
 *   `setNoElide(true)` / `SCRML_NO_ELIDE=1` env var forces the classifier
 *   to always return `unknown`, so the full guard emits on every machine-
 *   bound assignment regardless of triage. Used by CI to run parity tests
 *   and by devs wanting to breakpoint the runtime throw site.
 */

import { describe, test, expect, afterEach, beforeEach } from "bun:test";
import { resolve } from "path";
import { writeFileSync, rmSync, existsSync, mkdirSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { compileScrml } from "../../../src/api.js";
import { SCRML_RUNTIME } from "../../../src/runtime-template.js";
import {
  classifyTransition,
  emitTransitionGuard,
  setNoElide,
  isNoElide,
} from "../../../src/codegen/emit-machines.ts";

const tmpRoot = resolve(tmpdir(), "scrml-s28-slice-2-3-4");
let tmpCounter = 0;

function compileSrc(source) {
  const tmpDir = resolve(tmpRoot, `case-${++tmpCounter}-${Date.now()}`);
  const tmpInput = resolve(tmpDir, "app.scrml");
  const outDir = resolve(tmpDir, "out");
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(tmpInput, source);
  try {
    const result = compileScrml({
      inputFiles: [tmpInput],
      write: true,
      outputDir: outDir,
    });
    const clientJsPath = resolve(outDir, "app.client.js");
    const clientJs = existsSync(clientJsPath) ? readFileSync(clientJsPath, "utf8") : "";
    return { errors: result.errors ?? [], clientJs };
  } finally {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  }
}

function runClientAndInvoke(clientJs, userFnCount) {
  const allFns = [...clientJs.matchAll(/^function (_scrml_[A-Za-z0-9_$]+)\s*\(\s*\)\s*\{/gm)]
    .map(m => m[1]);
  const knownInternal = /^_scrml_(project_|derived_|reflect|navigate|session_|auth_|generate_csrf|validate_csrf|ensure_csrf|cors_|server_sync_|machine_|reactive_|subscribe|track|trigger|effect|meta_|deep_|propagate_|lift|reconcile_|destroy_|register_|timer_|animation_|stop_)/;
  const userFns = allFns.filter(n => !knownInternal.test(n));
  const toInvoke = userFns.slice(0, userFnCount);
  const callList = toInvoke.map(n => `${n}();`).join("\n");
  const shims = `
    var requestAnimationFrame = function() {};
    var cancelAnimationFrame = function() {};
  `;
  const fnBody =
    shims + "\n" +
    SCRML_RUNTIME + "\n" +
    clientJs + "\n" +
    callList + "\n" +
    "return { state: _scrml_state };";
  const runner = new Function(fnBody);
  return runner();
}

// ---------------------------------------------------------------------------
// Slice 2 — payload-variant literal RHS
// ---------------------------------------------------------------------------

describe("S28 slice 2 — payload-variant literal RHS elision (Cat 2.d)", () => {
  // Tests in this block exercise elision semantics directly. Reset the
  // no-elide flag so behavior doesn't depend on SCRML_NO_ELIDE env state.
  beforeEach(() => setNoElide(false));

  test("classifier accepts `Shape.Circle(10)` with unguarded `* => .Circle` rule", () => {
    const rules = [
      { from: "*", to: "Circle", guard: null, label: null, effectBody: null },
    ];
    const t = classifyTransition("Shape.Circle(10)", rules);
    expect(t.kind).toBe("legal");
    expect(t.matchedKey).toBe("*:Circle");
  });

  test("classifier accepts complex payload args (nested calls, commas, strings)", () => {
    const rules = [
      { from: "*", to: "Success", guard: null, label: null, effectBody: null },
    ];
    const cases = [
      'Result.Success(compute(1, 2))',
      'Result.Success({ value: 42, label: "ok" })',
      'Result.Success("hello, world")',
      'Result.Success([1, 2, 3])',
    ];
    for (const c of cases) {
      const t = classifyTransition(c, rules);
      expect(t.kind).toBe("legal");
      expect(t.matchedKey).toBe("*:Success");
    }
  });

  test("classifier rejects expressions that only LOOK like a payload call", () => {
    const rules = [
      { from: "*", to: "Done", guard: null, label: null, effectBody: null },
    ];
    // Call followed by extra expression — paren closes before end.
    expect(classifyTransition("S.Done() + 1", rules).kind).toBe("unknown");
    // Unclosed parens.
    expect(classifyTransition("S.Done(", rules).kind).toBe("unknown");
    // Method chain.
    expect(classifyTransition("S.Done().map(x => x)", rules).kind).toBe("unknown");
  });

  test("emitter elides payload-variant assignment end-to-end", () => {
    const rules = [
      { from: "*", to: "Circle", guard: null, label: null, effectBody: null },
    ];
    const lines = emitTransitionGuard(
      "r_shape",
      "Shape.Circle(10)",
      "__t",
      "ShapeMachine",
      rules,
      null,
    );
    const code = lines.join("\n");

    expect(code).toContain("§51.5 elided transition");
    expect(code).toContain('_scrml_reactive_set("r_shape", Shape.Circle(10))');
    expect(code).not.toContain("__matchedKey");
    expect(code).not.toContain("E-MACHINE-001-RT");
  });

  // NOTE: Runtime E2E for payload-variant + machine binding is blocked by
  // a pre-existing type-system gap — enums with payload-variant declarations
  // don't always register their variants into the registry when referenced
  // from a `< machine for=Enum>` binding (E-MACHINE-004 "Valid variants: ."
  // reproduces from any such machine). The codegen-level elision path is
  // exercised by the direct `emitTransitionGuard` call above; the full
  // runtime E2E will be backfilled once the enum-registration gap is
  // closed. Tracked as a follow-on in the S28 wrap.
});

// ---------------------------------------------------------------------------
// Slice 3 — trivially-illegal → E-MACHINE-001 compile error
// ---------------------------------------------------------------------------

describe("S28 slice 3 — trivially-illegal transitions (Cat 2.f, §51.5.1)", () => {
  // Illegal detection runs before the no-elide gate, so these tests are
  // env-independent — but reset anyway for symmetry.
  beforeEach(() => setNoElide(false));

  test("classifier returns illegal for target variant with no covering rule", () => {
    const rules = [
      { from: "A", to: "B", guard: null, label: null, effectBody: null },
      { from: "B", to: "C", guard: null, label: null, effectBody: null },
    ];
    const t = classifyTransition("S.Quantum", rules);
    expect(t.kind).toBe("illegal");
    expect(t.targetVariant).toBe("Quantum");
  });

  test("classifier returns legal (not illegal) when `*:*` covers target with no higher-precedence shadow", () => {
    const rules = [
      { from: "A", to: "B", guard: null, label: null, effectBody: null },
      { from: "*", to: "*", guard: null, label: null, effectBody: null },
    ];
    // For target `Quantum`: runtime resolves Quantum via *:* (A:B only
    // covers B). No X:Quantum, no *:Quantum, no X:* exists → *:* is
    // unambiguously the matched key → elision fires.
    const t = classifyTransition("S.Quantum", rules);
    expect(t.kind).toBe("legal");
    expect(t.matchedKey).toBe("*:*");
  });

  test("illegal NOT returned when any rule has to === target", () => {
    // Even if runtime would reject this via guard, target coverage exists →
    // illegal-check doesn't fire. Guard-based rejection is a runtime concern.
    const rules = [
      { from: "A", to: "Quantum", guard: "false", label: null, effectBody: null },
    ];
    expect(classifyTransition("S.Quantum", rules).kind).toBe("unknown");
  });

  test("classifier returns illegal for payload RHS too (Cat 2.d + 2.f interaction)", () => {
    const rules = [
      { from: "A", to: "B", guard: null, label: null, effectBody: null },
    ];
    const t = classifyTransition("Result.Success(42)", rules);
    expect(t.kind).toBe("illegal");
    expect(t.targetVariant).toBe("Success");
  });

  test("end-to-end: illegal unit assignment produces E-MACHINE-001 at compile time", () => {
    const src = `<program>
\${
  type S:enum = { A, B, Quantum }
  @order: M = S.A
  function bad() { @order = S.Quantum }
}
< machine name=M for=S>
  .A => .B
</>
<p>x</>
</program>
`;
    const { errors } = compileSrc(src);
    const machineErrors = errors.filter(e => e.code === "E-MACHINE-001");
    expect(machineErrors.length).toBeGreaterThan(0);
    expect(machineErrors[0].message).toContain("targets variant .Quantum");
    expect(machineErrors[0].message).toContain("no rule in M covers");
    expect(machineErrors[0].message).toContain("§51.5.1");
  });

  test("end-to-end: legal assignment alongside illegal doesn't suppress the error", () => {
    const src = `<program>
\${
  type S:enum = { A, B, Quantum }
  @order: M = S.A
  function good() { @order = S.B }
  function bad() { @order = S.Quantum }
}
< machine name=M for=S>
  .A => .B
</>
<p>x</>
</program>
`;
    const { errors } = compileSrc(src);
    const machineErrors = errors.filter(e => e.code === "E-MACHINE-001");
    expect(machineErrors.length).toBeGreaterThan(0);
    expect(machineErrors[0].message).toContain("targets variant .Quantum");
  });

  test("end-to-end: wildcard-covered target does NOT trigger illegal", () => {
    const src = `<program>
\${
  type S:enum = { A, B, Quantum }
  @order: M = S.A
  function any() { @order = S.Quantum }
}
< machine name=M for=S>
  .A => .B
  * => *
</>
<p>x</>
</program>
`;
    const { errors } = compileSrc(src);
    expect(errors.filter(e => e.code === "E-MACHINE-001")).toEqual([]);
  });

  test("runtime RHS (not a literal) is NOT flagged — can only be checked at runtime", () => {
    const src = `<program>
\${
  type S:enum = { A, B }
  @order: M = S.A
  function compute(): S { return S.A }
  function step() { @order = compute() }
}
< machine name=M for=S>
  .A => .B
</>
<p>x</>
</program>
`;
    const { errors } = compileSrc(src);
    // Return-value RHS is non-literal → unknown → full guard → no compile error.
    expect(errors.filter(e => e.code === "E-MACHINE-001")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Slice 4 — --no-elide debug knob
// ---------------------------------------------------------------------------

describe("S28 slice 4 — --no-elide debug knob", () => {
  // These tests manipulate the flag explicitly. Reset before and after so
  // env-driven initial state doesn't leak in or out.
  beforeEach(() => setNoElide(false));
  afterEach(() => setNoElide(false));

  test("setNoElide(true) forces classifier to return unknown", () => {
    const rules = [
      { from: "*", to: "Done", guard: null, label: null, effectBody: null },
    ];
    // Without no-elide: legal.
    expect(classifyTransition("S.Done", rules).kind).toBe("legal");
    // With no-elide: unknown.
    setNoElide(true);
    expect(isNoElide()).toBe(true);
    expect(classifyTransition("S.Done", rules).kind).toBe("unknown");
  });

  test("setNoElide(false) restores elision (default state)", () => {
    setNoElide(true);
    setNoElide(false);
    const rules = [
      { from: "*", to: "Done", guard: null, label: null, effectBody: null },
    ];
    expect(classifyTransition("S.Done", rules).kind).toBe("legal");
  });

  test("no-elide does NOT silence §51.5.1 illegal detection (normative obligation)", () => {
    // Illegal-check runs BEFORE the no-elide gate. §51.5.1 is a normative
    // correctness obligation, not a performance optimization — a debug flag
    // should not silence a compile error. no-elide disables elision only.
    setNoElide(true);
    const rules = [
      { from: "A", to: "B", guard: null, label: null, effectBody: null },
    ];
    const t = classifyTransition("S.Quantum", rules);
    expect(t.kind).toBe("illegal");
    expect(t.targetVariant).toBe("Quantum");
  });

  test("end-to-end: no-elide emits full guard for a case that would otherwise elide", () => {
    setNoElide(true);
    const src = `<program>
\${
  type S:enum = { A, B, Done }
  @order: M = S.A
  function finish() { @order = S.Done }
}
< machine name=M for=S>
  * => .Done
</>
<p>x</>
</program>
`;
    const { errors, clientJs } = compileSrc(src);
    expect(errors.filter(e => e.severity !== "warning")).toEqual([]);
    // No elision marker — full guard emitted.
    expect(clientJs).not.toContain("§51.5 elided transition");
    expect(clientJs).toContain("__matchedKey");
    expect(clientJs).toContain("E-MACHINE-001-RT");
  });
});
