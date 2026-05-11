/* SPDX-License-Identifier: MIT
 *
 * engine-a7-internal-rule.test.js — A5-7 Bucket 1 (S83, 2026-05-11)
 *
 * Behavioral test coverage for the `internal:rule=` prefix on composite
 * engine state-children (SPEC §51.0.O, S67 amendment). Complements:
 *   - compiler/tests/unit/a5-2-parser-support.test.js §A5-2.3 (parser)
 *   - compiler/tests/unit/a5-3-typer-walker.test.js §A5-3.2/§A5-3.6 (typer)
 *
 * This file focuses on the OBSERVABLE BEHAVIOR end-to-end:
 *   §1. usage-analyzer.engineInternalRules flag fires when any state-child
 *       carries internal:rule=
 *   §2. usage-analyzer.engineInternalRules does NOT fire when no internal:rule=
 *       present (tree-shake intent)
 *   §3. EngineStateChildEntry.internalRule populated correctly per state-child
 *   §4. Canonical §51.0.O composite with mixed rule= + internal:rule= compiles
 *   §5. E-INTERNAL-RULE-NOT-COMPOSITE flow-through from typer to compileScrml
 *   §6. Anonymous absence shape on state-children without internal:rule=
 *
 * KNOWN DEFERRALS (Wave 4 — out of A5-7 source-no-change scope):
 *   - Distinct internal-vs-external write path codegen (currently both
 *     prefixes lower to the same external transition).
 *   - Inner-engine lifecycle preservation on internal transitions.
 *   - Outer <onTransition> handler exclusion on internal transitions.
 *   All marked .skip with cite below per A5-7 brief.
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

function findEngineDecl(ast) {
  let found = null;
  function walk(nodes) {
    if (!nodes) return;
    for (const n of nodes) {
      if (!n) continue;
      if (n.kind === "engine-decl") { if (!found) found = n; return; }
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

function compileToClientJs(source, suffix = "internal-rule") {
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
// §1. usage-analyzer.engineInternalRules fires when internal:rule= present
// ===========================================================================

describe("engine-a7-internal-rule §1 — usage-analyzer engineInternalRules (fires)", () => {
  test("composite with internal:rule= → engineInternalRules=true", () => {
    const src = `\${
      type AppMode:enum  = { Title, Playing }
      type PlayMode:enum = { Exploring, Battle }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing rule=.Title internal:rule=.Playing>
    <engine for=PlayMode initial=.Exploring>
      <Exploring rule=.Battle></>
      <Battle rule=.Exploring></>
    </>
  </>
</>`;
    const { ast, sym } = runUpToSYM(src);
    // Composite — should not fire E-INTERNAL-RULE-NOT-COMPOSITE.
    expect(sym.errors.filter((e) => e.code === "E-INTERNAL-RULE-NOT-COMPOSITE")).toEqual([]);
    const usage = analyzeUsage({ nodes: ast.nodes });
    expect(usage.engineInternalRules).toBe(true);
  });

  test("multi-target internal:rule=(.A | .B) → engineInternalRules=true", () => {
    const src = `\${
      type AppMode:enum  = { Title, Playing, Paused }
      type PlayMode:enum = { A, B }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing rule=(.Title | .Paused) internal:rule=(.Playing | .Title)>
    <engine for=PlayMode initial=.A>
      <A rule=.B></>
      <B rule=.A></>
    </>
  </>
  <Paused rule=.Playing></>
</>`;
    const { ast } = runUpToSYM(src);
    const usage = analyzeUsage({ nodes: ast.nodes });
    expect(usage.engineInternalRules).toBe(true);
  });

  test("wildcard internal:rule=* → engineInternalRules=true", () => {
    const src = `\${
      type AppMode:enum  = { Title, Playing }
      type PlayMode:enum = { A, B }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing rule=.Title internal:rule=*>
    <engine for=PlayMode initial=.A>
      <A rule=.B></>
      <B rule=.A></>
    </>
  </>
</>`;
    const { ast } = runUpToSYM(src);
    const usage = analyzeUsage({ nodes: ast.nodes });
    expect(usage.engineInternalRules).toBe(true);
  });
});

describe("engine-a7-internal-rule §2 — usage-analyzer engineInternalRules (tree-shake)", () => {
  test("no internal:rule= anywhere → engineInternalRules=false", () => {
    const src = `\${ type Phase:enum = { Idle, Active } }
<engine for=Phase initial=.Idle>
  <Idle rule=.Active></>
  <Active rule=.Idle></>
</>`;
    const { ast } = runUpToSYM(src);
    const usage = analyzeUsage({ nodes: ast.nodes });
    expect(usage.engineInternalRules).toBe(false);
  });

  test("composite without internal:rule= → engineInternalRules=false", () => {
    // Composite state-child exists (has nested <engine>) but NO internal:rule=.
    const src = `\${
      type AppMode:enum  = { Title, Playing }
      type PlayMode:enum = { A, B }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing rule=.Title>
    <engine for=PlayMode initial=.A>
      <A rule=.B></>
      <B rule=.A></>
    </>
  </>
</>`;
    const { ast } = runUpToSYM(src);
    const usage = analyzeUsage({ nodes: ast.nodes });
    expect(usage.engineInternalRules).toBe(false);
  });
});

// ===========================================================================
// §3. EngineStateChildEntry.internalRule per state-child
// ===========================================================================

describe("engine-a7-internal-rule §3 — internalRule field on state-child entries", () => {
  test("only the composite carries non-absent internalRule", () => {
    const src = `\${
      type AppMode:enum  = { Title, Playing, Paused }
      type PlayMode:enum = { Exploring, Battle }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing rule=.Title internal:rule=.Playing>
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
    const byTag = Object.fromEntries(meta.stateChildren.map((sc) => [sc.tag, sc]));

    expect(byTag.Title?.internalRule?.kind).toBe("absent");
    expect(byTag.Playing?.internalRule?.kind).toBe("single");
    expect(byTag.Playing?.internalRule?.target).toBe("Playing");
    expect(byTag.Paused?.internalRule?.kind).toBe("absent");
  });

  test("internal:rule=(.A | .B) populates kind=multi with both targets", () => {
    const src = `\${
      type AppMode:enum  = { Title, Playing, Paused }
      type PlayMode:enum = { A, B }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing rule=(.Title | .Paused) internal:rule=(.Playing | .Title)>
    <engine for=PlayMode initial=.A>
      <A rule=.B></>
      <B rule=.A></>
    </>
  </>
  <Paused rule=.Playing></>
</>`;
    const { ast } = runUpToSYM(src);
    const engine = findEngineDecl(ast);
    const playing = engine._record.engineMeta.stateChildren.find((sc) => sc.tag === "Playing");
    expect(playing?.internalRule?.kind).toBe("multi");
    expect(playing?.internalRule?.targets).toEqual(["Playing", "Title"]);
  });

  test("internal:rule=* populates kind=wildcard", () => {
    const src = `\${
      type AppMode:enum  = { Title, Playing }
      type PlayMode:enum = { A, B }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing rule=.Title internal:rule=*>
    <engine for=PlayMode initial=.A>
      <A rule=.B></>
      <B rule=.A></>
    </>
  </>
</>`;
    const { ast } = runUpToSYM(src);
    const engine = findEngineDecl(ast);
    const playing = engine._record.engineMeta.stateChildren.find((sc) => sc.tag === "Playing");
    expect(playing?.internalRule?.kind).toBe("wildcard");
  });
});

// ===========================================================================
// §4. Canonical §51.0.O example compiles clean end-to-end
// ===========================================================================

describe("engine-a7-internal-rule §4 — canonical §51.0.O example compiles end-to-end", () => {
  test("composite with both rule= and internal:rule= — no errors", () => {
    const src = `\${
      type AppMode:enum  = { Title, Playing }
      type PlayMode:enum = { Exploring, Battle }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing rule=.Title internal:rule=.Playing>
    <engine for=PlayMode initial=.Exploring>
      <Exploring rule=.Battle></>
      <Battle rule=.Exploring></>
    </>
  </>
</>`;
    const { errors, clientJs } = compileToClientJs(src, "ir-canon");
    expect(errors.filter((e) => e.severity === "error")).toEqual([]);
    expect(clientJs).toContain("__scrml_engine_appMode_transitions");
    // External rule= target lands in the transition table.
    expect(clientJs).toMatch(/"Playing":\s*\[\s*"Title"\s*\]/);
  });

  test("internal:rule= alone (no canonical rule=) — composite-only is still legal per spec", () => {
    // §51.0.O: both prefixes may coexist; or just internal:rule= alone. (Note:
    // a composite with no canonical rule= and only internal:rule= effectively
    // has no external exit — the composite is "trapped" but well-formed.)
    const src = `\${
      type AppMode:enum  = { Title, Playing }
      type PlayMode:enum = { A, B }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing internal:rule=.Playing>
    <engine for=PlayMode initial=.A>
      <A rule=.B></>
      <B rule=.A></>
    </>
  </>
</>`;
    const { errors } = compileToClientJs(src, "ir-alone");
    expect(errors.filter((e) => e.severity === "error")).toEqual([]);
  });
});

// ===========================================================================
// §5. E-INTERNAL-RULE-NOT-COMPOSITE surfaces through compileScrml() result
// ===========================================================================

describe("engine-a7-internal-rule §5 — E-INTERNAL-RULE-NOT-COMPOSITE conformance", () => {
  test("internal:rule= on non-composite state-child fires E-INTERNAL-RULE-NOT-COMPOSITE", () => {
    // <Active> has no nested <engine> — it's a non-composite state-child.
    const src = `\${ type Phase:enum = { Idle, Active } }
<engine for=Phase initial=.Idle>
  <Idle rule=.Active></>
  <Active rule=.Idle internal:rule=.Active></>
</>`;
    const { errors } = compileToClientJs(src, "ir-noncomp");
    const fired = errors.filter((e) => e.code === "E-INTERNAL-RULE-NOT-COMPOSITE");
    expect(fired.length).toBeGreaterThanOrEqual(1);
  });

  test("internal:rule= on composite state-child does NOT fire", () => {
    const src = `\${
      type AppMode:enum  = { Title, Playing }
      type PlayMode:enum = { A, B }
    }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing rule=.Title internal:rule=.Playing>
    <engine for=PlayMode initial=.A>
      <A rule=.B></>
      <B rule=.A></>
    </>
  </>
</>`;
    const { errors } = compileToClientJs(src, "ir-comp-ok");
    const fired = errors.filter((e) => e.code === "E-INTERNAL-RULE-NOT-COMPOSITE");
    expect(fired).toEqual([]);
  });

  test("internal:rule=* wildcard on non-composite still fires E-INTERNAL-RULE-NOT-COMPOSITE", () => {
    // Wildcard internal:rule= is also forbidden on non-composite (a5-3 §A5-3.2).
    const src = `\${ type Phase:enum = { Idle, Active } }
<engine for=Phase initial=.Idle>
  <Idle rule=.Active></>
  <Active rule=.Idle internal:rule=*></>
</>`;
    const { errors } = compileToClientJs(src, "ir-wild-noncomp");
    const fired = errors.filter((e) => e.code === "E-INTERNAL-RULE-NOT-COMPOSITE");
    expect(fired.length).toBeGreaterThanOrEqual(1);
  });
});

// ===========================================================================
// §6. Absent-shape default on state-children without internal:rule=
// ===========================================================================

describe("engine-a7-internal-rule §6 — internalRule absence shape", () => {
  test("every state-child without internal:rule= has internalRule.kind='absent'", () => {
    const src = `\${ type Phase:enum = { A, B, C } }
<engine for=Phase initial=.A>
  <A rule=.B></>
  <B rule=.C></>
  <C rule=.A></>
</>`;
    const { ast } = runUpToSYM(src);
    const engine = findEngineDecl(ast);
    const meta = engine._record.engineMeta;
    for (const sc of meta.stateChildren) {
      expect(sc.internalRule?.kind).toBe("absent");
    }
  });
});

// ===========================================================================
// Wave-4 deferred behavior
// ===========================================================================

describe.skip("engine-a7-internal-rule §7 — distinct write path (Wave 4 deferral)", () => {
  test("DEFERRED: internal:rule= write does NOT exit composite (inner engine lifecycle preserved)", () => {
    // Per SPEC §51.0.O: an internal transition does NOT exit the composite.
    // Inner engine's lifecycle is preserved — no re-init, no history write/read.
    //
    // Per emit-engine.ts:76 comment, this distinct write-path codegen is a
    // Wave 4 follow-on. Both rule= and internal:rule= currently produce the
    // same external transition behavior.
    //
    // When the distinct write path lands, this test should assert (sketch):
    //   const { clientJs } = compileToClientJs(...);
    //   expect(clientJs).toMatch(/_scrml_engine_internal_set\(.*"Playing"/);
  });

  test("DEFERRED: <onTransition> on composite does NOT fire on internal transition", () => {
    // Per §51.0.O: <onTransition> handlers attached to the composite do NOT
    // fire on internal transitions. Verifying requires the distinct internal
    // write path to be emitted (Wave 4).
  });

  test("DEFERRED: history cell is NOT written on internal transition", () => {
    // Per §51.0.O cross-ref to §51.0.N: internal transitions don't write to
    // the history cell (because the composite doesn't exit). Verifying
    // requires both internal write path AND history synth-cell emission to
    // be in place (both Wave 4).
  });
});
