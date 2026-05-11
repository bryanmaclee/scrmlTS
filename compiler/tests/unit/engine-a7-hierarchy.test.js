/* SPDX-License-Identifier: MIT
 *
 * engine-a7-hierarchy.test.js — A5-7 Bucket 1 (S83, 2026-05-11)
 *
 * Behavioral test coverage for nested-engine declarations + parent-rule
 * cascade dispatch (SPEC §51.0.Q, S67 amendment). Complements:
 *   - compiler/tests/unit/a5-2-parser-support.test.js §A5-2.5 (parser shape)
 *   - compiler/tests/unit/a5-3-typer-walker.test.js §A5-3.9/§A5-3.11 (cohesion + aggregation)
 *
 * This file focuses on the OBSERVABLE BEHAVIOR end-to-end:
 *   §1. usage-analyzer.engineNested flag fires when state-child contains <engine>
 *   §2. tree-shake intent — engineNested=false on flat engines
 *   §3. EngineStateChildEntry.innerEngines populated for composite state-children
 *   §4. Outer engine compiles + emits its own transition table even when nested
 *   §5. Machine Cohesion §51.0.K — engines inside function bodies are absorbed (parser cohesion)
 *   §6. Singleton invariant — multiple sibling top-level engines stay distinct
 *
 * KNOWN DEFERRALS (Wave 4 — out of A5-7 source-no-change scope):
 *   - Inner-engine variant restore on outer re-entry.
 *   - Inner engine's own dispatcher emission inside composite arm body
 *     (Bug #2 — Wave 4 codegen follow-on).
 *   - Parent-rule cascade compile-time validation (cascade-miss diagnostic
 *     message extension per §51.0.Q.3 — Bug #3, typer follow-on).
 *   Inner-engine state-child non-empty body parsing was Bug #1 — FIXED at
 *   changes/fix-nested-engine-body-parser-lowercase-html (2026-05-11);
 *   §7 below now exercises the canonical fixtures.
 */

import { describe, expect, test } from "bun:test";
import { resolve } from "path";
import { writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from "fs";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runSYM } from "../../src/symbol-table.ts";
import { analyzeUsage } from "../../src/codegen/usage-analyzer.ts";
import { compileScrml } from "../../src/api.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runUpToSYM(source, filePath = "test.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast } = buildAST(bs);
  return { ast, sym: runSYM({ filePath, ast }) };
}

function findEngineDecls(ast) {
  const found = [];
  function walk(nodes) {
    if (!nodes) return;
    for (const n of nodes) {
      if (!n) continue;
      if (n.kind === "engine-decl") found.push(n);
      if (n.children) walk(n.children);
      if (n.body) walk(n.body);
    }
  }
  walk(ast.nodes || []);
  if (ast.machineDecls) {
    for (const m of ast.machineDecls) {
      if (m && m.kind === "engine-decl" && !found.includes(m)) found.push(m);
    }
  }
  return found;
}

function compileToClientJs(source, suffix = "hier") {
  const uniq = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const name = `${suffix}-${uniq}`;
  const tmpDir = resolve("/tmp", `scrml-${name}`);
  const tmpInput = resolve(tmpDir, `${name}.scrml`);
  const outDir = resolve(tmpDir, "out");
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(tmpInput, source);
  try {
    const result = compileScrml({
      inputFiles: [tmpInput],
      write: true,
      outputDir: outDir,
    });
    const clientPath = resolve(outDir, `${name}.client.js`);
    const clientJs = existsSync(clientPath) ? readFileSync(clientPath, "utf8") : "";
    return { errors: result.errors ?? [], clientJs };
  } finally {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ===========================================================================
// §1. usage-analyzer.engineNested fires when state-child contains nested <engine>
// ===========================================================================

describe("engine-a7-hierarchy §1 — usage-analyzer engineNested (fires)", () => {
  test("composite state-child with nested <engine> → engineNested=true", () => {
    const src = `\${
      type AppMode:enum  = { Title, Playing }
      type PlayMode:enum = { Exploring, Battle }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing rule=.Title>
    <engine for=PlayMode initial=.Exploring>
      <Exploring rule=.Battle></>
      <Battle rule=.Exploring></>
    </>
  </>
</>`;
    const { ast } = runUpToSYM(src);
    const usage = analyzeUsage({ nodes: ast.nodes });
    expect(usage.engineNested).toBe(true);
    // Outer engine still counted via `engines` flag.
    expect(usage.engines).toBe(true);
  });

  test("nested-engine flag fires even when other A7 features absent", () => {
    // Just the hierarchy surface, no history/internal/onTimeout.
    const src = `\${
      type AppMode:enum  = { A, B }
      type Sub:enum      = { X, Y }
    }
<engine for=AppMode initial=.A>
  <A rule=.B>
    <engine for=Sub initial=.X>
      <X rule=.Y></>
      <Y rule=.X></>
    </>
  </>
  <B rule=.A></>
</>`;
    const { ast } = runUpToSYM(src);
    const usage = analyzeUsage({ nodes: ast.nodes });
    expect(usage.engineNested).toBe(true);
    expect(usage.engineHistory).toBe(false);
    expect(usage.engineInternalRules).toBe(false);
    expect(usage.engineOnTimeout).toBe(false);
  });
});

describe("engine-a7-hierarchy §2 — usage-analyzer engineNested (tree-shake)", () => {
  test("flat engine (no nested) → engineNested=false", () => {
    const src = `\${ type Phase:enum = { Idle, Active } }
<engine for=Phase initial=.Idle>
  <Idle rule=.Active></>
  <Active rule=.Idle></>
</>`;
    const { ast } = runUpToSYM(src);
    const usage = analyzeUsage({ nodes: ast.nodes });
    expect(usage.engineNested).toBe(false);
  });

  test("two SIBLING file-scope engines (multi-engine §51.4 pattern) → engineNested=false", () => {
    // Two file-scope engines side-by-side are NOT nested per §51.0.Q.4 row 1
    // (multi-engine pattern). Nested means inside a state-child body.
    const src = `\${
      type Phase:enum   = { Idle, Active }
      type Toggle:enum  = { Off, On }
    }
<engine for=Phase initial=.Idle>
  <Idle rule=.Active></>
  <Active rule=.Idle></>
</>
<engine for=Toggle initial=.Off>
  <Off rule=.On></>
  <On rule=.Off></>
</>`;
    const { ast } = runUpToSYM(src);
    const engines = findEngineDecls(ast);
    expect(engines.length).toBe(2);
    const usage = analyzeUsage({ nodes: ast.nodes });
    expect(usage.engineNested).toBe(false);
  });
});

// ===========================================================================
// §3. innerEngines field populated on composite state-children
// ===========================================================================

describe("engine-a7-hierarchy §3 — innerEngines field on state-child entries", () => {
  test("only the composite state-child has non-empty innerEngines", () => {
    const src = `\${
      type AppMode:enum  = { Title, Playing, Paused }
      type PlayMode:enum = { Exploring, Battle }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing rule=(.Title | .Paused)>
    <engine for=PlayMode initial=.Exploring>
      <Exploring rule=.Battle></>
      <Battle rule=.Exploring></>
    </>
  </>
  <Paused rule=.Playing></>
</>`;
    const { ast } = runUpToSYM(src);
    const engines = findEngineDecls(ast);
    // Both outer and inner may register as engine-decls — the outer carries
    // stateChildren in its engineMeta; the inner registers separately if
    // PASS 10.A walks into the inner scope. We focus on the outer's children.
    const outer = engines.find((e) => e._record?.engineMeta?.forType === "AppMode");
    expect(outer).toBeDefined();
    const sc = outer._record.engineMeta.stateChildren;
    const byTag = Object.fromEntries(sc.map((s) => [s.tag, s]));
    expect(Array.isArray(byTag.Playing?.innerEngines)).toBe(true);
    expect(byTag.Playing.innerEngines.length).toBeGreaterThanOrEqual(1);
    expect((byTag.Title?.innerEngines || []).length).toBe(0);
    expect((byTag.Paused?.innerEngines || []).length).toBe(0);
  });

  test("self-closing <engine .../> is NOT recognized as a valid nested-engine form", () => {
    // Per a5-2 §A5-2.5 + engine-statechild-parser.ts:410 — engines must
    // contain state-children, so self-closing inner forms are not recognized.
    const src = `\${
      type AppMode:enum  = { Title, Playing }
      type PlayMode:enum = { A, B }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing rule=.Title>
    <engine for=PlayMode initial=.A/>
  </>
</>`;
    const { ast } = runUpToSYM(src);
    const engines = findEngineDecls(ast);
    const outer = engines.find((e) => e._record?.engineMeta?.forType === "AppMode");
    const playing = outer._record.engineMeta.stateChildren.find((s) => s.tag === "Playing");
    // innerEngines should be empty — the self-closing form is not a recognized nested form.
    expect((playing?.innerEngines || []).length).toBe(0);
  });
});

// ===========================================================================
// §4. Outer engine emits its own transition table even when nested present
// ===========================================================================

describe("engine-a7-hierarchy §4 — outer engine end-to-end compilation", () => {
  test("composite + nested engine — outer engine compiles + emits transitions table", () => {
    const src = `\${
      type AppMode:enum  = { Title, Playing, Paused }
      type PlayMode:enum = { Exploring, Battle }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing rule=(.Title | .Paused)>
    <engine for=PlayMode initial=.Exploring>
      <Exploring rule=.Battle></>
      <Battle rule=.Exploring></>
    </>
  </>
  <Paused rule=.Playing></>
</>`;
    const { errors, clientJs } = compileToClientJs(src, "outer-emit");
    expect(errors.filter((e) => e.severity === "error")).toEqual([]);
    expect(clientJs).toContain("__scrml_engine_appMode_transitions");
    // Outer dispatcher wires to appMode.
    expect(clientJs).toContain('_scrml_reactive_subscribe("appMode"');
    // Initial variant set.
    expect(clientJs).toMatch(/_scrml_reactive_set\("appMode",\s*"Title"\)/);
  });

  test("compilation succeeds with EMPTY inner state-child bodies (canonical form)", () => {
    // The canonical SPEC §51.0.Q.1 example has empty inner state-child bodies.
    // This passes today. Inner state-children with non-empty bodies surface a
    // body-parser limitation — see §7 .skip block below.
    const src = `\${
      type AppMode:enum  = { A, B }
      type Sub:enum      = { X, Y, Z }
    }
<engine for=AppMode initial=.A>
  <A rule=.B>
    <engine for=Sub initial=.X>
      <X rule=.Y></>
      <Y rule=.Z></>
      <Z rule=.X></>
    </>
  </>
  <B rule=.A></>
</>`;
    const { errors } = compileToClientJs(src, "empty-inner");
    expect(errors.filter((e) => e.severity === "error")).toEqual([]);
  });
});

// ===========================================================================
// §5. Machine Cohesion §51.0.K — engine in function body is absorbed
// ===========================================================================

describe("engine-a7-hierarchy §5 — engine cohesion (per §51.0.K footnote)", () => {
  test("engine inside function body does NOT register as engine-decl (per parser cohesion)", () => {
    // Mirrors a5-3 §A5-3.9: the parser cohesion intercepts engines in function
    // bodies before they become engine-decl nodes. Per §51.0.K footnote, this
    // is the Machine Cohesion / singleton invariant enforcement.
    const src = `\${
      type Phase:enum = { Idle, Active }
      function setup() {
        <engine for=Phase initial=.Idle>
          <Idle rule=.Active></>
          <Active rule=.Idle></>
        </>
      }
    }`;
    const { ast } = runUpToSYM(src);
    const engines = findEngineDecls(ast);
    // The engine should not register at file scope — it was absorbed by the
    // function-body parser (no separate engine-decl emitted).
    expect(engines.length).toBe(0);
  });
});

// ===========================================================================
// §6. Singleton invariant — sibling file-scope engines coexist independently
// ===========================================================================

describe("engine-a7-hierarchy §6 — multi-engine pattern (§51.4)", () => {
  test("two sibling file-scope engines compile + emit two independent transition tables", () => {
    const src = `\${
      type Phase:enum   = { Idle, Active }
      type Toggle:enum  = { Off, On }
    }
<engine for=Phase initial=.Idle>
  <Idle rule=.Active></>
  <Active rule=.Idle></>
</>
<engine for=Toggle initial=.Off>
  <Off rule=.On></>
  <On rule=.Off></>
</>`;
    const { errors, clientJs } = compileToClientJs(src, "multi");
    expect(errors.filter((e) => e.severity === "error")).toEqual([]);
    expect(clientJs).toContain("__scrml_engine_phase_transitions");
    expect(clientJs).toContain("__scrml_engine_toggle_transitions");
  });
});

// ===========================================================================
// §7. Inner state-child non-empty body parsing (Wave 4 — body-parser fix)
//
// Bug #1 fix-cite (changes/fix-nested-engine-body-parser-lowercase-html,
// 2026-05-11): `findStateChildCloser` / `findEngineCloser` /
// `findOnTransitionCloser` in engine-statechild-parser.ts now track
// lowercase HTML opener depth separately, preventing premature state-child
// closure when a composite's body contains lowercase markup BEFORE a nested
// <engine>. Pre-fix this fixture fired
// E-ENGINE-STATE-CHILD-INVALID-VARIANT + E-ENGINE-RULE-INVALID-VARIANT.
// ===========================================================================

describe("engine-a7-hierarchy §7 — non-empty inner state-child bodies (Bug #1 fix)", () => {
  test("inner state-child with markup body compiles cleanly — no outer-engine mis-attribution", () => {
    // Canonical SPEC §51.0.Q.2 worked example: composite state-child with a
    // nested engine whose inner state-children carry non-empty markup
    // (`<button>Fight</button>` inside `<Exploring>`).
    //
    // Pre-fix: E-ENGINE-STATE-CHILD-INVALID-VARIANT fired for `<Exploring>`
    // / `<Battle>` against AppMode + E-ENGINE-RULE-INVALID-VARIANT for the
    // inner `rule=` targets. Post-fix: clean compilation.
    const src = `\${
      type AppMode:enum  = { Title, Playing }
      type PlayMode:enum = { Exploring, Battle }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing rule=.Title>
    <engine for=PlayMode initial=.Exploring>
      <Exploring rule=.Battle>
        <button>Fight</button>
      </>
      <Battle rule=.Exploring></>
    </>
  </>
</>`;
    const { errors } = compileToClientJs(src, "inner-body");
    const fatal = errors.filter((e) => e.severity === "error");
    expect(fatal).toEqual([]);
    // The mis-attribution codes specifically must be absent.
    const misAttributionCodes = errors.filter(
      (e) =>
        e.code === "E-ENGINE-STATE-CHILD-INVALID-VARIANT" ||
        e.code === "E-ENGINE-RULE-INVALID-VARIANT",
    );
    expect(misAttributionCodes).toEqual([]);
  });

  test("lowercase markup BEFORE nested <engine> in composite body compiles cleanly", () => {
    // Adopter pattern: outer-scoped controls (a `<button>` for instance)
    // sit alongside the nested engine in the composite body. Pre-fix, any
    // lowercase HTML element BEFORE the nested <engine> opener corrupted
    // the depth counter inside findStateChildCloser, prematurely closing
    // <Playing> at `</button>` and leaking the inner engine's state-children
    // into the outer engine's registry.
    const src = `\${
      type AppMode:enum  = { Title, Playing }
      type PlayMode:enum = { Exploring, Battle }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing rule=.Title>
    <button>Pause game</button>
    <engine for=PlayMode initial=.Exploring>
      <Exploring rule=.Battle></>
      <Battle rule=.Exploring></>
    </>
  </>
</>`;
    const { errors } = compileToClientJs(src, "outer-controls");
    const fatal = errors.filter((e) => e.severity === "error");
    expect(fatal).toEqual([]);
  });

  test.skip("DEFERRED (Bug #2): nested engine dispatcher emission inside composite arm body", () => {
    // Per SPEC §51.0.Q.1: nested engine has FULL engine semantics — including
    // its own dispatcher subscribing to the inner variable. Currently the
    // nested engine state-child bodies are parsed but the inner dispatcher /
    // render functions are not emitted to client JS.
    //
    // Bug #1 (body-parser mis-attribution) is FIXED at
    // changes/fix-nested-engine-body-parser-lowercase-html (2026-05-11) —
    // see §7 tests above. The remaining inner-dispatcher emission gap is
    // tracked separately as Bug #2 (Wave 4 codegen follow-on).
    //
    // Verification: search clientJs for `__scrml_engine_playMode_transitions`
    // — today this is absent even when the source declares the inner engine.
  });

  test.skip("DEFERRED (typer follow-on): cascade-miss diagnostic message extension (§51.0.Q.3)", () => {
    // Per §51.0.Q.3: when a write inside a composite is rejected by the outer
    // composite's `rule=`, the diagnostic message should extend to name BOTH
    // engines for clarity (no new error code — extension of
    // E-ENGINE-INVALID-TRANSITION message form).
    //
    // Per a5-3 §A5-3.8 deferral: direct-write fire-site inside engine
    // state-child bodies is absent (engine bodies are RAW TEXT). Cascade-miss
    // diagnostic surface is a typer follow-on (Bug #3, Wave 4 typer follow-on).
  });
});
