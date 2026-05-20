/**
 * match-block-phase5-wildcard.test.js — Match block-form Phase 5: wildcard
 * `<_>` explicit render + full-pipeline integration verification.
 *
 * S109 authoring per docs/changes/match-block-form-scoping/SCOPING.md §Phase 5.
 *
 * Two things this dispatch closes:
 *
 * 1. WILDCARD EXPLICIT RENDER. Pre-S109, `emit-match.ts` SKIPPED the wildcard
 *    `<_>` arm in codegen (`if (entry.isWildcard) continue;`) — the helper's
 *    no-default-branch semantic left the mount slot untouched for any variant
 *    not covered by a named arm. S109 builds the wildcard as a real arm
 *    (sentinel tag `_`) and passes `opts.defaultArmTag: "_"` to
 *    emitVariantGuardedRender, which emits it as the dispatcher's catch-all
 *    `else { ... }` branch (SPEC §18.0.1 — `<_>` matches any remaining variant).
 *
 * 2. FULL-PIPELINE INTEGRATION GAP (pre-existing, surfaced + fixed S109).
 *    `collectMatchBlocks` walked `fileAST.nodes ?? fileAST.children ?? fileAST`.
 *    The pipeline passes the OUTER file-result wrapper whose AST nodes live
 *    under `fileAST.ast.nodes` — so `collectMatchBlocks` found 0 match-blocks
 *    in a real compile and `emitMatchBodyRenderForFile` emitted NOTHING.
 *    `emitMatchMountHtml` still emitted the mount slot (it receives the node
 *    directly from emit-html's walk), so a full compile produced a
 *    `<div data-scrml-match-mount>` with no dispatcher behind it — the match
 *    block was silently inert. The S108 Phase 3/4 unit tests passed because
 *    they call `emitMatchBodyRenderForFile(tab.ast, ctx)` with the BARE AST
 *    (which has top-level `.nodes`). Fix: `collectMatchBlocks` +
 *    `findEngineVarForType` now accept `fileAST.ast?.nodes` too (mirror
 *    emit-engine.ts:collectC12EngineDecls). §INTEGRATION below is the
 *    regression guard — a FULL compile, asserting the dispatcher reaches
 *    the client JS.
 *
 * Coverage:
 *   §1  wildcard codegen — `<_>` arm produces a render fn + dispatcher else-branch
 *   §2  wildcard-only match-block — only `<_>`, no named arms (unconditional render)
 *   §3  no wildcard — dispatcher has NO else-branch (regression guard)
 *   §INTEGRATION  full compile — match dispatcher + wildcard reach client JS
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { emitMatchBodyRenderForFile } from "../../src/codegen/emit-match.ts";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

function parse(src) {
  const bs = splitBlocks("/tmp/test.scrml", src);
  const tab = buildAST(bs, null);
  return tab.ast;
}

function makeCtx(fileAST) {
  return {
    fileAST,
    errors: [],
    csrfEnabled: false,
    registry: {
      logicBindings: [],
      eventBindings: [],
      pushArmContext: () => {},
      popArmContext: () => {},
      addLogicBinding(b) { this.logicBindings.push(b); },
      addEventBinding(b) { this.eventBindings.push(b); },
    },
    derivedNames: new Set(),
    encodingCtx: null,
  };
}

function compileSource(source) {
  const tmp = mkdtempSync(join(tmpdir(), "scrml-match-wildcard-test-"));
  mkdirSync(join(tmp, "src"), { recursive: true });
  const distDir = join(tmp, "dist");
  mkdirSync(distDir, { recursive: true });
  const filePath = join(tmp, "src", "test.scrml");
  writeFileSync(filePath, source);
  try {
    const result = compileScrml({
      inputFiles: [filePath],
      outputDir: distDir,
      write: true,
      verbose: false,
      log: () => {},
    });
    // `write: true` emits to disk at `<outputDir>/<basename>.client.js`.
    // `result.outputs` is not a per-file array, so read the client JS off
    // disk for integration assertions.
    let clientJs = "";
    const clientPath = join(distDir, "test.client.js");
    if (existsSync(clientPath)) clientJs = readFileSync(clientPath, "utf8");
    return { result, clientJs };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// §1: Wildcard codegen — render fn + dispatcher else-branch
// ---------------------------------------------------------------------------

describe("§1: wildcard `<_>` codegen — render fn + dispatcher else-branch", () => {
  test("`<_>` arm produces a render fn AND a dispatcher `else { ... }` catch-all", () => {
    const src = `\${
    type Phase:enum = { Idle, Loading, Error }
    <phase>: Phase = .Idle
}
<match for=Phase on=@phase>
    <Idle> : "press to load"
    <_> : "other state"
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);

    const allRenderJs = out.renderFunctions.join("\n");
    // Named arm render fn.
    expect(allRenderJs).toContain("render_Idle");
    expect(allRenderJs).toContain("press to load");
    // Wildcard render fn — sentinel tag `_` → `_render__`.
    expect(allRenderJs).toContain("render__");
    expect(allRenderJs).toContain("other state");

    const allDispatchJs = out.dispatchers.join("\n");
    // The named arm fires on `_tag === "Idle"`.
    expect(allDispatchJs).toContain('_tag === "Idle"');
    // The wildcard fires as the catch-all `else` — NOT as `_tag === "_"`.
    expect(allDispatchJs).toContain("else {");
    expect(allDispatchJs).not.toContain('_tag === "_"');
  });
});

// ---------------------------------------------------------------------------
// §2: Wildcard-only match-block
// ---------------------------------------------------------------------------

describe("§2: wildcard-only match-block — only `<_>`, renders unconditionally", () => {
  test("a match-block with ONLY `<_>` emits an unconditional render block", () => {
    const src = `\${
    type Phase:enum = { Idle, Loading }
    <phase>: Phase = .Idle
}
<match for=Phase on=@phase>
    <_> : "catch-all body"
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const allRenderJs = out.renderFunctions.join("\n");
    expect(allRenderJs).toContain("render__");
    expect(allRenderJs).toContain("catch-all body");
    // With no named arms, the dispatcher emits the wildcard render as an
    // unconditional block (no `if` chain to attach `else` to).
    const allDispatchJs = out.dispatchers.join("\n");
    expect(allDispatchJs).toContain("render__");
  });
});

// ---------------------------------------------------------------------------
// §3: No wildcard — dispatcher has no else-branch (regression guard)
// ---------------------------------------------------------------------------

describe("§3: no wildcard — dispatcher emits no default branch (regression guard)", () => {
  test("a match-block with only named arms has NO `else` catch-all", () => {
    const src = `\${
    type Phase:enum = { Idle, Loading }
    <phase>: Phase = .Idle
}
<match for=Phase on=@phase>
    <Idle> : "idle body"
    <Loading> : "loading body"
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const allDispatchJs = out.dispatchers.join("\n");
    expect(allDispatchJs).toContain('_tag === "Idle"');
    expect(allDispatchJs).toContain('_tag === "Loading"');
    // No wildcard → no bare `else {` catch-all branch.
    expect(allDispatchJs).not.toContain("else {");
  });
});

// ---------------------------------------------------------------------------
// §INTEGRATION: full-pipeline compile — dispatcher reaches the client JS
// ---------------------------------------------------------------------------

describe("§INTEGRATION: full compile — match dispatcher reaches client JS", () => {
  test("a full compile of a match-block emits the dispatcher + render fns (not just the mount slot)", () => {
    const src = `\${
    type Phase:enum = { Idle, Loading, Error }
    <phase>: Phase = .Idle
}
<page>
    <h1>Status</h1>
    <match for=Phase on=@phase>
        <Idle> : "press to load"
        <Loading> : "loading"
        <Error> : "failed"
    </match>
</>
`;
    const { result, clientJs } = compileSource(src);
    expect(result.fileCount).toBeGreaterThan(0);
    expect(result.errors).toEqual([]);
    // The load-bearing regression guard: pre-S109 `collectMatchBlocks` failed
    // to find the match-block in the pipeline's outer fileAST wrapper, so the
    // dispatcher was NEVER emitted. These assertions fail loudly if that
    // integration gap regresses.
    expect(clientJs).toContain("render_Idle");
    expect(clientJs).toContain("render_Loading");
    expect(clientJs).toContain("render_Error");
    expect(clientJs).toContain("_dispatch");
    expect(clientJs).toContain('_tag === "Idle"');
  });

  test("a full compile with a `<_>` wildcard emits the catch-all else-branch in client JS", () => {
    const src = `\${
    type Phase:enum = { Idle, Loading, Error }
    <phase>: Phase = .Idle
}
<page>
    <match for=Phase on=@phase>
        <Idle> : "press to load"
        <_> : "some other state"
    </match>
</>
`;
    const { result, clientJs } = compileSource(src);
    expect(result.fileCount).toBeGreaterThan(0);
    expect(result.errors).toEqual([]);
    expect(clientJs).toContain("render_Idle");
    expect(clientJs).toContain("render__");
    expect(clientJs).toContain("some other state");
    expect(clientJs).toContain("else {");
  });
});
