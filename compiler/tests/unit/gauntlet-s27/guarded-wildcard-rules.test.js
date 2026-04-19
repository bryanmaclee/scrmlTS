/**
 * S27 regression — guarded wildcard rule fires its guard at runtime.
 *
 * Pre-S27, the transition guard IIFE compared `__key` (the literal
 * runtime `<prev>:<next>`) against the rule's declared `from:to`.
 * For a rule like `* => .X given (…)`, the rule key is "*:X" but
 * __key is "<actualFrom>:X" — the comparison always failed and the
 * guard was silently skipped. A wildcard rule with a guard therefore
 * behaved as if unguarded: every illegal state-to-X transition
 * succeeded because the guard was never consulted.
 *
 * S27 fixes this by matching against __matchedKey (the canonical
 * table key after wildcard fallback), which was already being
 * computed for the §51.11.4 audit `rule` field. One line change in
 * emit-machines.ts; corresponding parity fix in effect-block keying.
 *
 * Tests exercise:
 *   - guarded wildcard rule with truthy guard → transition succeeds
 *   - guarded wildcard rule with falsy guard → throws E-MACHINE-001-RT
 *   - guarded wildcard rule with label → error message includes label
 *   - effect on wildcard rule fires for every matched source variant
 *   - exact rule still wins over wildcard when both declared
 */

import { describe, test, expect } from "bun:test";
import { resolve } from "path";
import { writeFileSync, rmSync, existsSync, mkdirSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { compileScrml } from "../../../src/api.js";
import { SCRML_RUNTIME } from "../../../src/runtime-template.js";

const tmpRoot = resolve(tmpdir(), "scrml-s27-guarded-wildcard");
let tmpCounter = 0;

function compile(source) {
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
    const clientJs = existsSync(resolve(outDir, "app.client.js"))
      ? readFileSync(resolve(outDir, "app.client.js"), "utf8")
      : "";
    return { errors: result.errors ?? [], clientJs };
  } finally {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  }
}

function buildEnv(clientJs) {
  const fns = [...clientJs.matchAll(/^function (_scrml_[A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*\{/gm)].map(m => m[1]);
  const knownInternal = /^_scrml_(project_|derived_|reflect|navigate|session_|auth_|generate_csrf|validate_csrf|ensure_csrf|cors_|server_sync_|machine_|reactive_|subscribe|track|trigger|effect|meta_|deep_|propagate_|lift|reconcile_|destroy_|register_|timer_|animation_|stop_|replay$)/;
  const userFns = fns.filter(n => !knownInternal.test(n));
  const userFnBindings = userFns.map(n => `${JSON.stringify(n)}: ${n}`).join(",\n    ");
  const fnBody = `
    var requestAnimationFrame = function() {};
    var cancelAnimationFrame = function() {};
    ${SCRML_RUNTIME}
    ${clientJs}
    return {
      state: _scrml_state,
      userFns: { ${userFnBindings} },
      userFnNames: ${JSON.stringify(userFns)},
    };
  `;
  // eslint-disable-next-line no-new-func
  return new Function(fnBody)();
}

describe("S27 — guarded wildcard rule fires its guard at runtime", () => {
  test("guarded `* => .X` with truthy guard succeeds from any source variant", () => {
    const src = `<program>
\${
  type S:enum = { Idle, Running, Panic }
  @state: M = S.Idle
  function panicFromIdle() { @state = S.Panic }
}
< machine name=M for=S>
  .Idle => .Running
  * => .Panic given (true) [emergency]
</>
<p>x</>
</program>
`;
    const { errors, clientJs } = compile(src);
    expect(errors.filter(e => e.severity !== "warning")).toEqual([]);
    // The guard comparison now keys on __matchedKey, not __key.
    expect(clientJs).toContain('__matchedKey === "*:Panic"');
    expect(clientJs).not.toContain('__key === "*:Panic"');
    const env = buildEnv(clientJs);
    env.userFns[env.userFnNames.find(n => n.includes("panicFromIdle"))]();
    expect(env.state.state).toBe("Panic");
  });

  test("guarded `* => .X` with falsy guard throws E-MACHINE-001-RT with label", () => {
    const src = `<program>
\${
  type S:enum = { Safe, Danger }
  @state: M = S.Safe
  function pullLever() { @state = S.Danger }
}
< machine name=M for=S>
  * => .Danger given (false) [alarmCheck]
</>
<p>x</>
</program>
`;
    const { errors, clientJs } = compile(src);
    expect(errors.filter(e => e.severity !== "warning")).toEqual([]);
    const env = buildEnv(clientJs);
    const pullLever = env.userFns[env.userFnNames.find(n => n.includes("pullLever"))];
    expect(() => pullLever()).toThrow(/E-MACHINE-001-RT: Transition guard failed \[alarmCheck\]/);
    // State must not have changed since the guard rejected.
    expect(env.state.state).toBe("Safe");
  });

  test("guarded `X:* given (…)` (from-specific, wildcard target) fires guard for any target variant", () => {
    const src = `<program>
\${
  type S:enum = { Start, A, B, C }
  @state: M = S.Start
  function toA() { @state = S.A }
  function toB() { @state = S.B }
}
< machine name=M for=S>
  .Start => * given (false) [readyCheck]
</>
<p>x</>
</program>
`;
    const { errors, clientJs } = compile(src);
    expect(errors.filter(e => e.severity !== "warning")).toEqual([]);
    const env = buildEnv(clientJs);
    // Start → A should fail guard.
    const toA = env.userFns[env.userFnNames.find(n => n.includes("toA"))];
    expect(() => toA()).toThrow(/E-MACHINE-001-RT: Transition guard failed \[readyCheck\]/);
    expect(env.state.state).toBe("Start");
    // Start → B should also fail guard (same wildcard rule keys on Start:*).
    const toB = env.userFns[env.userFnNames.find(n => n.includes("toB"))];
    expect(() => toB()).toThrow(/E-MACHINE-001-RT: Transition guard failed \[readyCheck\]/);
  });

  test("exact rule still wins over wildcard when both declared", () => {
    const src = `<program>
\${
  type S:enum = { A, B }
  @state: M = S.A
  function go() { @state = S.B }
}
< machine name=M for=S>
  .A => .B given (true)  [exactOk]
  * => .B given (false)  [wildcardFail]
</>
<p>x</>
</program>
`;
    const { errors, clientJs } = compile(src);
    expect(errors.filter(e => e.severity !== "warning")).toEqual([]);
    const env = buildEnv(clientJs);
    // A → B should match the exact rule (guard truthy) and succeed.
    // If the wildcard rule's guard fired instead, this would throw.
    env.userFns[env.userFnNames.find(n => n.includes("go"))]();
    expect(env.state.state).toBe("B");
  });

  test("effect block emitted inside a wildcard rule keys on __matchedKey", () => {
    // Shape-only assertion: the effect body is keyed by the wildcard
    // table-entry, not the literal runtime __key. Runtime execution of
    // effect bodies with @-refs is orthogonal (pre-existing rewrite gap
    // in emit-machines effect emission) and out of scope here.
    const src = `<program>
\${
  type S:enum = { A, B, Done }
  @state: M = S.A
  function toDone() { @state = S.Done }
}
< machine name=M for=S>
  .A => .B
  * => .Done { console.log("reached done") }
</>
<p>x</>
</program>
`;
    const { errors, clientJs } = compile(src);
    expect(errors.filter(e => e.severity !== "warning")).toEqual([]);
    // Effect block should key on __matchedKey now (S27 parity fix).
    expect(clientJs).toContain('__matchedKey === "*:Done"');
    // Pre-S27 shape is gone.
    expect(clientJs).not.toMatch(/if \(__key === "\*:Done"\)/);
  });

  test("`*:*` guard fires for any undeclared transition (catch-all)", () => {
    const src = `<program>
\${
  type S:enum = { Q, R, S1 }
  @state: M = S.Q
  function jump() { @state = S.S1 }
}
< machine name=M for=S>
  .Q => .R
  * => * given (false) [catchAll]
</>
<p>x</>
</program>
`;
    const { errors, clientJs } = compile(src);
    expect(errors.filter(e => e.severity !== "warning")).toEqual([]);
    expect(clientJs).toContain('__matchedKey === "*:*"');
    const env = buildEnv(clientJs);
    // Q → S1: no exact rule, no *:S1, no Q:*, falls back to *:*.
    // Its guard is false → throws with label.
    const jump = env.userFns[env.userFnNames.find(n => n.includes("jump"))];
    expect(() => jump()).toThrow(/E-MACHINE-001-RT: Transition guard failed \[catchAll\]/);
  });
});
