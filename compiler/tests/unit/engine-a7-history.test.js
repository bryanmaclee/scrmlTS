/* SPDX-License-Identifier: MIT
 *
 * engine-a7-history.test.js — A5-7 Bucket 1 (S83, 2026-05-11)
 *
 * Behavioral test coverage for the `history` attribute on composite engine
 * state-children (SPEC §51.0.N, S67 amendment) and the `.Variant.history`
 * structured-variant-target form. Complements:
 *   - compiler/tests/unit/a5-2-parser-support.test.js §A5-2.2/§A5-2.6 (parser)
 *   - compiler/tests/unit/a5-3-typer-walker.test.js §A5-3.1/§A5-3.7 (typer)
 *
 * This file focuses on the OBSERVABLE BEHAVIOR end-to-end:
 *   §1. usage-analyzer.engineHistory flag fires when any state-child carries `history`.
 *   §2. usage-analyzer.engineHistory does NOT fire when no `history` present (tree-shake intent).
 *   §3. EngineStateChildEntry.historyAttr is populated correctly on each state-child.
 *   §4. `.Variant.history` rule= target parses with historyForm=true (round-trip).
 *   §5. Compiler accepts canonical §51.0.N example end-to-end (no errors).
 *   §6. E-HISTORY-NO-INNER-ENGINE flow-through from typer to compileScrml result.
 *
 * KNOWN DEFERRALS (Wave 4 — out of A5-7 source-no-change scope):
 *   - Synth cell `@_<outerVar>_<variant>_history` emission (emit-engine.ts:532
 *     comment — variant name currently flattened, history modifier dropped).
 *   - Inner-engine variant restore on outer re-entry.
 *   - Outer-exit write hook + outer-entry restore hook.
 *   All marked .skip with cite below per A5-7 brief (do NOT fix source).
 */

import { describe, expect, test } from "bun:test";
import { resolve } from "path";
import { writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from "fs";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runSYM } from "../../src/symbol-table.ts";
import { analyzeUsage } from "../../src/codegen/usage-analyzer.ts";
import { parseRuleAttrValue } from "../../src/engine-statechild-parser.ts";
import { compileScrml } from "../../src/api.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runUpToSYM(source, filePath = "test.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast } = buildAST(bs);
  return { ast, sym: runSYM({ filePath, ast }) };
}

function findEngineDecl(ast) {
  let found = null;
  function walk(nodes) {
    if (!nodes) return;
    for (const n of nodes) {
      if (!n) continue;
      if (n.kind === "engine-decl") {
        if (!found) found = n;
        return;
      }
      if (n.children) walk(n.children);
      if (n.body) walk(n.body);
    }
  }
  walk(ast.nodes || []);
  if (!found && ast.machineDecls) {
    for (const m of ast.machineDecls) {
      if (m && m.kind === "engine-decl") { found = m; break; }
    }
  }
  return found;
}

function compileToClientJs(source, suffix = "history") {
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
// §1. usage-analyzer.engineHistory fires when any state-child carries `history`
// ===========================================================================

describe("engine-a7-history §1 — usage-analyzer engineHistory flag (fires)", () => {
  test("single composite state-child with history → engineHistory=true", () => {
    const src = `\${
      type AppMode:enum  = { Title, Playing, Paused }
      type PlayMode:enum = { Exploring, Battle }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing history rule=(.Title | .Paused)>
    <engine for=PlayMode initial=.Exploring>
      <Exploring rule=.Battle></>
      <Battle rule=.Exploring></>
    </>
  </>
  <Paused rule=.Playing></>
</>`;
    const { ast, sym } = runUpToSYM(src);
    // Make sure typer didn't reject the canonical shape.
    expect(sym.errors.filter((e) => e.code === "E-HISTORY-NO-INNER-ENGINE")).toEqual([]);
    const usage = analyzeUsage({ nodes: ast.nodes });
    expect(usage.engineHistory).toBe(true);
  });

  test("history on multiple composite state-children — engineHistory still true", () => {
    const src = `\${
      type AppMode:enum  = { Active, Paused, Stopped }
      type Sub:enum      = { A, B }
    }
<engine for=AppMode initial=.Active>
  <Active history rule=(.Paused | .Stopped)>
    <engine for=Sub initial=.A>
      <A rule=.B></>
      <B rule=.A></>
    </>
  </>
  <Paused history rule=(.Active | .Stopped)>
    <engine for=Sub initial=.A>
      <A rule=.B></>
      <B rule=.A></>
    </>
  </>
  <Stopped></>
</>`;
    const { ast } = runUpToSYM(src);
    const usage = analyzeUsage({ nodes: ast.nodes });
    expect(usage.engineHistory).toBe(true);
  });
});

describe("engine-a7-history §2 — usage-analyzer engineHistory flag (tree-shake)", () => {
  test("no history on any state-child → engineHistory=false (tree-shake intent)", () => {
    const src = `\${ type Phase:enum = { Idle, Active } }
<engine for=Phase initial=.Idle>
  <Idle rule=.Active></>
  <Active rule=.Idle></>
</>`;
    const { ast } = runUpToSYM(src);
    const usage = analyzeUsage({ nodes: ast.nodes });
    expect(usage.engineHistory).toBe(false);
  });

  test("composite state-child WITHOUT history → engineHistory=false", () => {
    // Composite (has nested <engine>) but no `history` bareword.
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
    expect(usage.engineHistory).toBe(false);
  });
});

// ===========================================================================
// §3. EngineStateChildEntry.historyAttr populated correctly per state-child
// ===========================================================================

describe("engine-a7-history §3 — historyAttr field on state-child entries", () => {
  test("only the state-child with `history` bareword carries historyAttr=true", () => {
    const src = `\${
      type AppMode:enum  = { Title, Playing, Paused }
      type PlayMode:enum = { Exploring, Battle }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing history rule=(.Title | .Paused)>
    <engine for=PlayMode initial=.Exploring>
      <Exploring rule=.Battle></>
      <Battle rule=.Exploring></>
    </>
  </>
  <Paused rule=.Playing></>
</>`;
    const { ast } = runUpToSYM(src);
    const engine = findEngineDecl(ast);
    expect(engine).not.toBeNull();
    const meta = engine?._record?.engineMeta;
    expect(meta).toBeDefined();
    expect(Array.isArray(meta?.stateChildren)).toBe(true);
    const byTag = Object.fromEntries(meta.stateChildren.map((sc) => [sc.tag, sc]));
    expect(byTag.Title?.historyAttr).toBeFalsy();
    expect(byTag.Playing?.historyAttr).toBe(true);
    expect(byTag.Paused?.historyAttr).toBeFalsy();
  });

  test("empty state-child with history attr (no inner engine) — fires E-HISTORY-NO-INNER-ENGINE", () => {
    // Per SPEC §51.0.N + a5-3 §A5-3.1: history on a non-composite (no inner
    // <engine> in body) is a typer error.
    const src = `\${ type Phase:enum = { Idle, Active } }
<engine for=Phase initial=.Idle>
  <Idle history rule=.Active></>
  <Active rule=.Idle></>
</>`;
    const { sym } = runUpToSYM(src);
    const errs = sym.errors.filter((e) => e.code === "E-HISTORY-NO-INNER-ENGINE");
    expect(errs.length).toBe(1);
  });
});

// ===========================================================================
// §4. `.Variant.history` rule= target parses with historyForm flag
// ===========================================================================

describe("engine-a7-history §4 — .Variant.history target form parsing", () => {
  test("single-target rule=.X.history yields historyForm=true", () => {
    const r = parseRuleAttrValue(".Playing.history");
    expect(r.kind).toBe("single");
    expect(r.target).toBe("Playing");
    expect(r.historyForm).toBe(true);
  });

  test("single-target rule=.X (no .history suffix) → historyForm absent or false", () => {
    const r = parseRuleAttrValue(".Playing");
    expect(r.kind).toBe("single");
    expect(r.target).toBe("Playing");
    expect(r.historyForm).toBeFalsy();
  });

  test("multi-target rule=(.A.history | .B) — historyForms aligned per target", () => {
    const r = parseRuleAttrValue("(.A.history | .B)");
    expect(r.kind).toBe("multi");
    expect(r.targets).toEqual(["A", "B"]);
    expect(Array.isArray(r.historyForms)).toBe(true);
    expect(r.historyForms[0]).toBe(true);
    expect(r.historyForms[1]).toBeFalsy();
  });

  test("multi-target all-history rule=(.A.history | .B.history) → both true", () => {
    const r = parseRuleAttrValue("(.A.history | .B.history)");
    expect(r.kind).toBe("multi");
    expect(r.historyForms).toEqual([true, true]);
  });
});

// ===========================================================================
// §5. Canonical §51.0.N composite + .Variant.history compiles clean
// ===========================================================================

describe("engine-a7-history §5 — canonical §51.0.N example compiles end-to-end", () => {
  test("composite with history + .Variant.history rule= target — no errors", () => {
    const src = `\${
      type AppMode:enum  = { Title, Playing, Paused }
      type PlayMode:enum = { Exploring, Battle }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing history rule=(.Title | .Paused)>
    <engine for=PlayMode initial=.Exploring>
      <Exploring rule=.Battle></>
      <Battle rule=.Exploring></>
    </>
  </>
  <Paused rule=.Playing.history></>
</>`;
    const { errors, clientJs } = compileToClientJs(src, "history-canon");
    expect(errors.filter((e) => e.severity === "error")).toEqual([]);
    // Outer engine transitions table is emitted normally.
    expect(clientJs).toContain("__scrml_engine_appMode_transitions");
    // Outer dispatcher subscribes to appMode.
    expect(clientJs).toContain('_scrml_reactive_subscribe("appMode"');
  });

  test("rule=.Variant.history flattens to base variant in emitted transitions table (Wave 4 deferral)", () => {
    // OBSERVABLE TODAY (emit-engine.ts:532 comment): the .history suffix is
    // dropped from the encoded target. <Paused rule=.Playing.history> emits
    // "Paused":["Playing"], not a separate ".Playing.history" target.
    // This test documents the current behavior and will need updating when
    // synth-cell emission lands.
    const src = `\${
      type AppMode:enum  = { Title, Playing, Paused }
      type PlayMode:enum = { Exploring, Battle }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing history rule=(.Title | .Paused)>
    <engine for=PlayMode initial=.Exploring>
      <Exploring rule=.Battle></>
      <Battle rule=.Exploring></>
    </>
  </>
  <Paused rule=.Playing.history></>
</>`;
    const { errors, clientJs } = compileToClientJs(src, "history-flatten");
    expect(errors.filter((e) => e.severity === "error")).toEqual([]);
    // Flattened target: rule=.Playing.history → "Paused": ["Playing"] (no ".history" suffix)
    expect(clientJs).toMatch(/"Paused":\s*\[\s*"Playing"\s*\]/);
  });
});

// ===========================================================================
// §6. E-HISTORY-NO-INNER-ENGINE surfaces through compileScrml() result
// ===========================================================================

describe("engine-a7-history §6 — E-HISTORY-NO-INNER-ENGINE conformance via compileScrml", () => {
  test("history on non-composite state-child surfaces E-HISTORY-NO-INNER-ENGINE", () => {
    const src = `\${ type Phase:enum = { Idle, Active } }
<engine for=Phase initial=.Idle>
  <Idle history rule=.Active></>
  <Active rule=.Idle></>
</>`;
    const { errors } = compileToClientJs(src, "history-noninner");
    const fired = errors.filter((e) => e.code === "E-HISTORY-NO-INNER-ENGINE");
    expect(fired.length).toBeGreaterThanOrEqual(1);
  });

  test("history on composite (has inner engine) — does NOT fire E-HISTORY-NO-INNER-ENGINE", () => {
    const src = `\${
      type AppMode:enum  = { Title, Playing }
      type PlayMode:enum = { A, B }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing history rule=.Title>
    <engine for=PlayMode initial=.A>
      <A rule=.B></>
      <B rule=.A></>
    </>
  </>
</>`;
    const { errors } = compileToClientJs(src, "history-composite-ok");
    const fired = errors.filter((e) => e.code === "E-HISTORY-NO-INNER-ENGINE");
    expect(fired).toEqual([]);
  });
});

// ===========================================================================
// Wave-4 deferred behavior — marked .skip with cite
// ===========================================================================

describe.skip("engine-a7-history §7 — synth-cell emission (Wave 4 deferral)", () => {
  test("DEFERRED: composite with history emits @_<outerVar>_<variant>_history synth cell", () => {
    // Per SPEC §51.0.N: a state-child carrying `history` should cause the
    // compiler to synthesize a reactive cell `@_<outerVar>_<variantName>_history`
    // typed as the inner engine's enum.
    //
    // Per emit-engine.ts:532-534 comment, this is a Wave 4 follow-on. The
    // `.history` target form is currently flattened — the variant name is
    // recorded without the history modifier. History semantics (write on
    // outer-exit, restore on outer re-entry) are not yet implemented.
    //
    // When synth-cell emission lands, this test should assert:
    //   expect(clientJs).toContain("_scrml_state[\"_appMode_Playing_history\"]");
    //   or similar — TBD by codegen author.
  });

  test("DEFERRED: outer-exit writes inner variant to history cell", () => {
    // Per SPEC §51.0.N: on outer-exit from the composite state-child, the
    // inner engine's current variant is written to the history cell.
    // Implementation lives behind the same Wave 4 deferral.
  });

  test("DEFERRED: outer-re-entry restores inner engine from history cell", () => {
    // Per SPEC §51.0.N: on outer-re-entry into a composite with `history`,
    // the inner engine restores from the history cell rather than from
    // initial=. Empty cell → fall back to initial=.
  });
});
