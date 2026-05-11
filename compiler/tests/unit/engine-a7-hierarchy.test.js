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
 *   - Inner engine's own dispatcher emission inside composite arm body.
 *   - Parent-rule cascade compile-time validation (cascade-miss diagnostic
 *     message extension per §51.0.Q.3 — typer follow-on).
 *   - Inner-engine state-child non-empty body parsing (the body-parser today
 *     attributes inner state-children to the outer engine when bodies are
 *     non-empty — surfaced as compiler-bug observation, NOT fixed here).
 *   All marked .skip / documented with cite below per A5-7 brief.
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
// §7. Compiler bug surfaced (Wave 4) — inner state-child non-empty bodies
// ===========================================================================

describe.skip("engine-a7-hierarchy §7 — non-empty inner state-child bodies (Wave 4 / bug surface)", () => {
  test("DEFERRED: inner state-child with markup body fails — outer typer mis-attributes inner tags", () => {
    // Compiler-bug observation surfaced by this test:
    // When an inner engine's state-children carry NON-EMPTY bodies (e.g.,
    // <Exploring><button>...</button></>), the body-parser today attributes
    // those inner state-children to the OUTER engine. Two errors fire:
    //   - E-ENGINE-STATE-CHILD-INVALID-VARIANT for inner tags vs outer enum
    //   - E-ENGINE-RULE-INVALID-VARIANT for inner rule= targets vs outer enum
    //
    // This is the canonical SPEC §51.0.Q.2 worked example — adopters will
    // hit this when nesting non-trivial markup inside inner state-children.
    //
    // Marked .skip with cite — NOT fixed under A5-7 source-no-change scope.
    // Tracking ticket: file under hand-off as compiler-bug observation.
    //
    // Repro fixture for the bug (would surface 3+ errors if un-.skipped):
    //   <engine for=AppMode initial=.Title>
    //     <Title rule=.Playing></>
    //     <Playing rule=.Title>
    //       <engine for=PlayMode initial=.Exploring>
    //         <Exploring rule=.Battle>
    //           <button>Fight</button>
    //         </>
    //         <Battle rule=.Exploring></>
    //       </>
    //     </>
    //   </>
  });

  test("DEFERRED: nested engine dispatcher emission inside composite arm body", () => {
    // Per SPEC §51.0.Q.1: nested engine has FULL engine semantics — including
    // its own dispatcher subscribing to the inner variable. Currently the
    // nested engine state-child bodies are parsed but the inner dispatcher /
    // render functions are not emitted to client JS.
    //
    // Verification: search clientJs for `__scrml_engine_playMode_transitions`
    // — today this is absent even when the source declares the inner engine.
  });

  test("DEFERRED: cascade-miss diagnostic message extension (§51.0.Q.3)", () => {
    // Per §51.0.Q.3: when a write inside a composite is rejected by the outer
    // composite's `rule=`, the diagnostic message should extend to name BOTH
    // engines for clarity (no new error code — extension of
    // E-ENGINE-INVALID-TRANSITION message form).
    //
    // Per a5-3 §A5-3.8 deferral: direct-write fire-site inside engine
    // state-child bodies is absent (engine bodies are RAW TEXT). Cascade-miss
    // diagnostic surface is a typer follow-on.
  });
});
