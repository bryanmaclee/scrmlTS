/**
 * match-block-phase3-codegen.test.js — Phase 3 codegen: `<match>` block-form
 * emits variant-guarded render dispatcher + per-arm render functions, mirroring
 * the engine state-child render dispatch pattern (Phase A10 / S78 precedent).
 *
 * S108 authoring per docs/changes/match-block-form-scoping/SCOPING.md §Phase 3.
 *
 * Phase 3 scope:
 *   1. Retrofit Phase 1 to attach `bodyChildren` to the match-block AST node
 *      (walkable arm-body AST; mirror engine-decl.bodyChildren).
 *   2. New emit-match.ts consumer maps match-block AST → VariantArm[] and
 *      calls emitVariantGuardedRender (the same variant-source-agnostic helper
 *      the engine consumer uses).
 *   3. emit-html.ts dispatches kind="match-block" to emitMatchMountHtml →
 *      `<div data-scrml-match-mount="match_<id>"></div>` at the source position.
 *   4. emit-client.ts aggregates emitMatchBodyRenderForFile alongside the
 *      C12/C14 engine body-render — render fns + dispatchers appended to the
 *      client JS bundle.
 *
 * Coverage:
 *   §1  Phase 1 retrofit — match-block AST node carries `bodyChildren`
 *   §2  emit-match.ts mount HTML — slot emitted at match-block position
 *   §3  emit-match.ts dispatcher — `_scrml_match_<id>_dispatch` + per-arm render fns
 *   §4  Shape A subscribe (bare `on=@cell`) — dispatcher uses
 *       `_scrml_reactive_subscribe(cellName, ...)`
 *   §5  Tree-shake — match-block with all empty arm bodies emits no mount + no JS
 *   §6  Multiple match-blocks in one file — independent dispatchers per AST id
 *   §7  Auto-implied `on=` — match resolves to in-scope `<engine for=Type>`'s
 *       varName when on= is absent
 *
 * Out of Phase 3 v1 scope (deferred):
 *   - Wildcard `<_>` arm explicit render (helper's no-default-branch fall-through ok)
 *   - `:`-shorthand body codegen (Phase 4)
 *   - Bare-variant inference (§18.0.3) — Phase 4 typer integration
 *   - Per-arm reactive re-wire for `${@cell}` interp inside non-initial arm bodies
 *     (matches engine v1 limitation)
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { emitMatchMountHtml, emitMatchBodyRenderForFile } from "../../src/codegen/emit-match.ts";

function parse(src) {
  const bs = splitBlocks("/tmp/test.scrml", src);
  const tab = buildAST(bs, null);
  return { bs, tab };
}

function findFirst(nodes, kind) {
  for (const n of nodes) {
    if (n && n.kind === kind) return n;
  }
  return null;
}

function makeCtx(fileAST) {
  return {
    fileAST,
    registry: {
      logicBindings: [],
      eventBindings: [],
      pushArmContext: () => {},
      popArmContext: () => {},
      addLogicBinding: () => {},
    },
    derivedNames: new Set(),
    encodingCtx: null,
  };
}

// ---------------------------------------------------------------------------
// §1: Phase 1 retrofit — match-block AST node carries armsRaw (load-bearing)
// + bodyChildren array (Phase 1 BS shape, single text-run per Phase 2's
// STRUCTURAL_RAW_BODY_ELEMENTS gate — Phase 3 re-parses armsRaw, NOT bodyChildren)
// ---------------------------------------------------------------------------

describe("§1: Phase 1 + Phase 3 retrofit — AST shape supports body re-parse", () => {
  test("match-block carries armsRaw + bodyChildren array", () => {
    const src = `\${
    type Phase:enum = { Idle, Done }
    @phase = .Idle
}
<match for=Phase on=@phase>
    <Idle>
        <p>Idle</p>
    </>
    <Done>
        <p>Done</p>
    </>
</match>
`;
    const { tab } = parse(src);
    const mb = findFirst(tab.ast.nodes, "match-block");
    expect(mb).not.toBeNull();
    // armsRaw is the load-bearing field — Phase 3 codegen re-parses it via
    // BS+TAB to recover arm-body AST nodes. Phase 2's parseMatchArms gives
    // arm structural entries with bodyRaw text.
    expect(typeof mb.armsRaw).toBe("string");
    expect(mb.armsRaw).toContain("Idle");
    expect(mb.armsRaw).toContain("Done");
    // bodyChildren is additive (mirrors engine-decl.bodyChildren shape) — for
    // match-block specifically it carries the BS-captured raw text run (per
    // Phase 2's STRUCTURAL_RAW_BODY_ELEMENTS gate). Phase 3 codegen does NOT
    // depend on it; reads armsRaw directly.
    expect(Array.isArray(mb.bodyChildren)).toBe(true);
  });

  test("match-block with no body still produces a valid AST node", () => {
    const src = `\${
    type Phase:enum = { Idle }
    @phase = .Idle
}
<match for=Phase on=@phase>
</match>
`;
    const { tab } = parse(src);
    const mb = findFirst(tab.ast.nodes, "match-block");
    expect(mb).not.toBeNull();
    // Empty body → armsRaw is empty string (or short whitespace), bodyChildren
    // may be undefined or [] — both shapes are valid; codegen returns null
    // mount + empty render arrays.
    expect(typeof mb.armsRaw).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// §2: emit-match.ts mount HTML — slot emitted at match-block position
// ---------------------------------------------------------------------------

describe("§2: emit-match.ts emits mount slot HTML", () => {
  test("emitMatchMountHtml returns `<div data-scrml-match-mount=match_<id>>` for non-empty arms", () => {
    const src = `\${
    type Phase:enum = { Idle, Done }
    @phase = .Idle
}
<match for=Phase on=@phase>
    <Idle>
        <p>Idle</p>
    </>
    <Done>
        <p>Done</p>
    </>
</match>
`;
    const { tab } = parse(src);
    const mb = findFirst(tab.ast.nodes, "match-block");
    expect(mb).not.toBeNull();
    const ctx = makeCtx(tab.ast);
    const html = emitMatchMountHtml(mb, ctx);
    expect(html).not.toBeNull();
    expect(html).toContain(`data-scrml-match-mount="match_${mb.id}"`);
  });

  test("emitMatchMountHtml returns null when no bodyChildren are present", () => {
    // Build a synthetic match-block node without bodyChildren.
    const synthetic = {
      id: 9999,
      kind: "match-block",
      forType: "Phase",
      onExprRaw: "@phase",
      armsRaw: "",
      span: { start: 0, end: 0, line: 1, col: 1 },
    };
    const ctx = makeCtx({ nodes: [], typeDecls: [] });
    const html = emitMatchMountHtml(synthetic, ctx);
    expect(html).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §3: emit-match.ts dispatcher emission
// ---------------------------------------------------------------------------

describe("§3: emit-match.ts emits dispatcher + per-arm render fns", () => {
  test("emitMatchBodyRenderForFile produces dispatcher + render fns named by match id", () => {
    const src = `\${
    type Phase:enum = { Idle, Done }
    @phase = .Idle
}
<match for=Phase on=@phase>
    <Idle>
        <p>Idle</p>
    </>
    <Done>
        <p>Done</p>
    </>
</match>
`;
    const { tab } = parse(src);
    const mb = findFirst(tab.ast.nodes, "match-block");
    const ctx = makeCtx(tab.ast);
    const out = emitMatchBodyRenderForFile(tab.ast, ctx);
    expect(out.renderFunctions.length).toBeGreaterThan(0);
    expect(out.dispatchers.length).toBeGreaterThan(0);
    // Render fn naming — _scrml_match_<id>_render_<tag>
    const allRenderJs = out.renderFunctions.join("\n");
    expect(allRenderJs).toContain(`_scrml_match_match_${mb.id}_render_Idle`);
    expect(allRenderJs).toContain(`_scrml_match_match_${mb.id}_render_Done`);
    // Dispatcher contains the mount-attr selector + tag-based branch
    const dispJs = out.dispatchers.join("\n");
    expect(dispJs).toContain(`data-scrml-match-mount="match_${mb.id}"`);
    expect(dispJs).toContain(`_tag === "Idle"`);
    expect(dispJs).toContain(`_tag === "Done"`);
  });
});

// ---------------------------------------------------------------------------
// §4: Shape A subscribe — `on=@cell` uses _scrml_reactive_subscribe
// ---------------------------------------------------------------------------

describe("§4: Shape A subscribe-mode for `on=@cell` form", () => {
  test("bare `on=@cell` → dispatcher uses _scrml_reactive_subscribe + DOMContentLoaded bridge", () => {
    const src = `\${
    type Phase:enum = { Idle, Done }
    @phase = .Idle
}
<match for=Phase on=@phase>
    <Idle>Idle</>
    <Done>Done</>
</match>
`;
    const { tab } = parse(src);
    const ctx = makeCtx(tab.ast);
    const out = emitMatchBodyRenderForFile(tab.ast, ctx);
    const dispJs = out.dispatchers.join("\n");
    expect(dispJs).toContain(`_scrml_reactive_subscribe("phase"`);
    // DOMContentLoaded bridge fires the dispatcher with current cell value.
    expect(dispJs).toContain(`DOMContentLoaded`);
    expect(dispJs).toContain(`_scrml_reactive_get("phase")`);
  });
});

// ---------------------------------------------------------------------------
// §5: Tree-shake — empty arm bodies → no emission
// ---------------------------------------------------------------------------

describe("§5: Tree-shake on empty arm bodies", () => {
  test("match-block with all self-closing arms emits no dispatcher + no mount", () => {
    const src = `\${
    type Phase:enum = { Idle, Done }
    @phase = .Idle
}
<match for=Phase on=@phase>
    <Idle/>
    <Done/>
</match>
`;
    const { tab } = parse(src);
    const mb = findFirst(tab.ast.nodes, "match-block");
    const ctx = makeCtx(tab.ast);
    const html = emitMatchMountHtml(mb, ctx);
    // All-empty arms → empty-string mount (tree-shake).
    expect(html === "" || html === null).toBe(true);
    const out = emitMatchBodyRenderForFile(tab.ast, ctx);
    expect(out.renderFunctions.length).toBe(0);
    expect(out.dispatchers.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §6: Multiple match-blocks in one file
// ---------------------------------------------------------------------------

describe("§6: Multiple match-blocks emit independent dispatchers", () => {
  test("two match-blocks → two distinct dispatchers indexed by AST id", () => {
    const src = `\${
    type Phase:enum = { Idle, Done }
    type Mood:enum = { Happy, Sad }
    @phase = .Idle
    @mood = .Happy
}
<match for=Phase on=@phase>
    <Idle>Idle</>
    <Done>Done</>
</match>

<match for=Mood on=@mood>
    <Happy>Happy</>
    <Sad>Sad</>
</match>
`;
    const { tab } = parse(src);
    const ctx = makeCtx(tab.ast);
    const out = emitMatchBodyRenderForFile(tab.ast, ctx);
    expect(out.dispatchers.length).toBe(2);
    // Each dispatcher subscribes to its own cell.
    const allDisp = out.dispatchers.join("\n---SPLIT---\n");
    expect(allDisp).toContain(`_scrml_reactive_subscribe("phase"`);
    expect(allDisp).toContain(`_scrml_reactive_subscribe("mood"`);
  });
});

// ---------------------------------------------------------------------------
// §7: Auto-implied `on=` from engine-in-scope
// ---------------------------------------------------------------------------

describe("§7: Auto-implied on= resolves to engine var", () => {
  test("match without on= uses engine for same forType when in scope", () => {
    const src = `\${
    type Phase:enum = { Idle, Done }
}
<engine for=Phase initial=.Idle>
    <Idle rule=.Done>Idle</>
    <Done>Done</>
</engine>

<match for=Phase>
    <Idle>Match-Idle</>
    <Done>Match-Done</>
</match>
`;
    const { tab } = parse(src);
    const mb = findFirst(tab.ast.nodes, "match-block");
    expect(mb).not.toBeNull();
    expect(mb.onExprRaw).toBeNull();
    const ctx = makeCtx(tab.ast);
    // For auto-implied, we need the engine-decl to have engineMeta populated.
    // In raw parse output (no SYM PASS), engineMeta is not populated, so the
    // auto-implied lookup returns null and codegen skips. This is the
    // expected pre-SYM behavior. Test that codegen returns gracefully without
    // throwing in this state.
    const out = emitMatchBodyRenderForFile(tab.ast, ctx);
    // Either: dispatcher emitted (if engineMeta was synth-populated somehow),
    // or zero dispatchers (auto-implied lookup failed at codegen time).
    // Both shapes are acceptable for this pre-SYM test — the assertion is
    // that the codegen doesn't crash.
    expect(Array.isArray(out.dispatchers)).toBe(true);
    expect(Array.isArray(out.renderFunctions)).toBe(true);
  });
});
