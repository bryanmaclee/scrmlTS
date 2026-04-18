/**
 * S25 gauntlet — §51.12 temporal machine transitions.
 *
 * A transition rule of the form `.From after Ns => .To` declares that the
 * machine-bound variable transitions to `.To` automatically `N` seconds
 * after it enters `.From`. The compiler synthesizes a timer armed on
 * variant entry and cleared on variant exit. Re-entering `.From` during
 * the timer window restarts the timer (reset semantics, per the
 * lin-discontinuous-scoping deep-dive's companion decision for temporal
 * semantics — matches XState).
 *
 * Duration units: ms, s, m, h. Wildcard `from` is rejected (E-MACHINE-021).
 *
 * Deep-dive rationale: removes the three-piece hand-wire (`<timeout>` +
 * `when @var changes` + `cleanup()`) into a single declarative rule.
 */

import { describe, test, expect } from "bun:test";
import { resolve, dirname } from "path";
import { writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from "fs";
import { compileScrml } from "../../../src/api.js";

const testDir = dirname(new URL(import.meta.url).pathname);
let tmpCounter = 0;

function compileSrc(source, testName = `s25-temporal-${++tmpCounter}`) {
  const tmpDir = resolve(testDir, `_tmp_${testName}`);
  const tmpInput = resolve(tmpDir, `${testName}.scrml`);
  const outDir = resolve(tmpDir, "out");
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(tmpInput, source);
  try {
    const result = compileScrml({
      inputFiles: [tmpInput],
      write: true,
      outputDir: outDir,
    });
    const clientJsPath = resolve(outDir, `${testName}.client.js`);
    const clientJs = existsSync(clientJsPath) ? readFileSync(clientJsPath, "utf8") : "";
    return {
      errors: result.errors ?? [],
      m021: (result.errors ?? []).filter(e => e.code === "E-MACHINE-021"),
      clientJs,
    };
  } finally {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe("S25 §51.12 — temporal machine transitions", () => {
  test("basic `.From after 30s => .To` compiles; codegen emits arm_timer", () => {
    const src = `<program>
\${
  type Fetch:enum = { Idle, Loading, Done, TimedOut }
  @fetch: FetchMachine = Fetch.Idle
  function start() { @fetch = Fetch.Loading }
}
< machine name=FetchMachine for=Fetch>
  .Idle => .Loading
  .Loading after 30s => .TimedOut
  .Loading => .Done
</>
<p>x</>
</program>
`;
    const { errors, clientJs } = compileSrc(src);
    expect(errors.filter(e => e.severity !== "warning")).toEqual([]);
    expect(clientJs).toContain("§51.12 temporal transitions");
    expect(clientJs).toContain("_scrml_machine_clear_timer");
    expect(clientJs).toContain("_scrml_machine_arm_timer");
    // 30s = 30000ms
    expect(clientJs).toContain("30000");
    expect(clientJs).toContain('"TimedOut"');
  });

  test("duration unit parsing: ms, s, m, h", () => {
    const cases = [
      { decl: "after 500ms", ms: 500 },
      { decl: "after 2s", ms: 2000 },
      { decl: "after 3m", ms: 180000 },
      { decl: "after 1h", ms: 3600000 },
    ];
    for (const c of cases) {
      const src = `<program>
\${
  type S:enum = { A, B }
  @state: M = S.A
  function go() { @state = S.A }
}
< machine name=M for=S>
  .A ${c.decl} => .B
</>
<p>x</>
</program>
`;
      const { errors, clientJs } = compileSrc(src);
      expect(errors.filter(e => e.severity !== "warning")).toEqual([]);
      expect(clientJs).toContain(`${c.ms}, "B"`);
    }
  });

  test("wildcard from with `after` → E-MACHINE-021", () => {
    const src = `<program>
\${
  type S:enum = { A, B }
  @state: M = S.A
  function go() { @state = S.B }
}
< machine name=M for=S>
  * after 5s => .B
</>
<p>x</>
</program>
`;
    const { m021 } = compileSrc(src);
    expect(m021.length).toBeGreaterThan(0);
    expect(m021[0].message).toContain("wildcard");
  });

  test("multiple temporal rules on the same from-variant are emitted", () => {
    // Technically two `from=Loading` temporal rules is ambiguous at runtime —
    // the first matching rule wins in arm_initial, and the transition guard
    // arms both but only the last-emitted survives (each arm clears the
    // previous). Compiles without error; the behavior is that only one
    // timer is live at a time. This is a known accept: users who write
    // two timers on the same variant should use a guard instead.
    const src = `<program>
\${
  type S:enum = { A, B, C }
  @state: M = S.A
  function go() { @state = S.A }
}
< machine name=M for=S>
  .A after 1s => .B
  .A after 2s => .C
</>
<p>x</>
</program>
`;
    const { errors, clientJs } = compileSrc(src);
    expect(errors.filter(e => e.severity !== "warning" && e.code !== "E-MACHINE-014")).toEqual([]);
    // Both timer arms present in generated JS.
    expect(clientJs).toContain('1000, "B"');
    expect(clientJs).toContain('2000, "C"');
  });

  test("temporal rule coexists with non-temporal rules on the same machine", () => {
    const src = `<program>
\${
  type Fetch:enum = { Idle, Loading, Done, Failed, TimedOut }
  @fetch: FetchMachine = Fetch.Idle
  function start() { @fetch = Fetch.Loading }
}
< machine name=FetchMachine for=Fetch>
  .Idle => .Loading
  .Loading => .Done
  .Loading => .Failed
  .Loading after 30s => .TimedOut
</>
<p>x</>
</program>
`;
    const { errors, clientJs } = compileSrc(src);
    expect(errors.filter(e => e.severity !== "warning")).toEqual([]);
    expect(clientJs).toContain('30000, "TimedOut"');
    // Non-temporal rules still emit transition-guard code.
    expect(clientJs).toContain("E-MACHINE-001-RT");
  });

  test("initial variant temporal arming — initial state with outgoing temporal rule arms on mount", () => {
    const src = `<program>
\${
  type Fetch:enum = { Loading, TimedOut }
  @fetch: FetchMachine = Fetch.Loading
}
< machine name=FetchMachine for=Fetch>
  .Loading after 30s => .TimedOut
</>
<p>x</>
</program>
`;
    const { errors, clientJs } = compileSrc(src);
    expect(errors.filter(e => e.severity !== "warning")).toEqual([]);
    expect(clientJs).toContain("_scrml_machine_arm_initial");
    expect(clientJs).toContain('"Loading"');
    expect(clientJs).toContain("30000");
  });

  test("non-integer duration (0.5s) rounds to ms", () => {
    const src = `<program>
\${
  type S:enum = { A, B }
  @state: M = S.A
  function go() { @state = S.A }
}
< machine name=M for=S>
  .A after 0.5s => .B
</>
<p>x</>
</program>
`;
    const { errors, clientJs } = compileSrc(src);
    expect(errors.filter(e => e.severity !== "warning")).toEqual([]);
    expect(clientJs).toContain('500, "B"');
  });

  test("no temporal rules → no temporal codegen emitted", () => {
    const src = `<program>
\${
  type S:enum = { A, B }
  @state: M = S.A
  function go() { @state = S.B }
}
< machine name=M for=S>
  .A => .B
</>
<p>x</>
</program>
`;
    const { errors, clientJs } = compileSrc(src);
    expect(errors.filter(e => e.severity !== "warning")).toEqual([]);
    expect(clientJs).not.toContain("§51.12 temporal transitions");
    expect(clientJs).not.toContain("_scrml_machine_arm_timer");
    expect(clientJs).not.toContain("_scrml_machine_arm_initial");
  });
});
