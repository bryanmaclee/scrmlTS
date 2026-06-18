/* SPDX-License-Identifier: MIT
 * Regression — g-colon-shorthand-markup-misparse (2026-06-18).
 *
 * THE BUG: a TOP-LEVEL `<engine for=Type ...>` whose state-children use a
 * `:`-shorthand with a MARKUP-valued body misparsed at the BLOCK-SPLITTER
 * level (distinct from the engine-statechild-parser angleDepth covered by
 * colon-shorthand-inside-opener-s154b §7). Two paths failed:
 *
 *   1. INSIDE-OPENER (`<Loading : <p>Loading...</p>>`): `scanAttributes` tracked
 *      brace/paren/bracket depth but NOT angle depth inside the `:`-shorthand
 *      body, so the inner `<p>`'s `>` was read as the opener terminator. The
 *      shorthand `.raw` truncated, the engine body shredded, and the markup
 *      closers (`</p>` / `</button>`) tried to close `<engine>` → an
 *      E-CTX-001 cascade.
 *
 *   2. AFTER-`>` DEPRECATED PLACEMENT (`<Idle rule=.Loading> : <button>…</button>`):
 *      `engine`/`machine` were missing from COMPOUND_LIFT_EXEMPT_TAGS, so the
 *      top-level `<engine>` was classified as a compound state-decl (the `:`
 *      after a child opener's `>` reads as a Shape-2 typed-state-decl signal),
 *      captured as opaque text, and EOF-dissolved into a top-level text run —
 *      the `<engine>` never became a block, surfacing the MISLEADING
 *      `E-STRUCTURAL-ELEMENT-MISPLACED` ("<engine> cannot appear inside a ${}
 *      logic body") on the `<engine>` opener (which is NOT in a logic body),
 *      plus an E-VARIANT-AMBIGUOUS cascade on the bare variants. This failed
 *      even for a non-markup (display-text) after-`>` body — body content was
 *      irrelevant; the compound-lift mis-classification was the trigger.
 *
 * SPEC RULING (Rule 4 — fix direction (a)): markup-as-value IS a legal
 * `:`-shorthand single-expression body (§4.14:985 "markup-as-value ... are all
 * legal as the single-expression body"; §4.14:1029 worked engine example
 * `<Loading rule=... : <p>Loading...</>>`; §51.0.I:25826 state-child shorthand
 * is a code-default single expression incl. "nested tags (markup-as-value)").
 * The after-`>` placement is DEPRECATED but parses IDENTICALLY, surfacing only
 * the info-level W-COLON-SHORTHAND-LEGACY-PLACEMENT (§4.14:999 / §51.0.I:25813 /
 * §18.0.1:11216). "Prefer bare-body for multi-element markup arms" is a DOC
 * NOTE (preference), NOT a prohibition. So the fix is to disambiguate the
 * opener `>` from the markup-body tags (§4.13 angleDepth), not to reject.
 *
 * THE FIX (compiler/src/block-splitter.js):
 *   - scanAttributes(): §4.13 angleDepth tracking inside a `:`-shorthand body
 *     (gated on shorthand===true) — embedded markup `<tag>` / `</tag>` / `<tag/>`
 *     `>`s are body content; the opener `>` is the one at angle depth 0.
 *   - COMPOUND_LIFT_EXEMPT_TAGS += "engine", "machine" (parallel to match/each).
 *   - after-`>` recognition in the main loop (tryConsumeAfterCloseColonShorthand
 *     + topIsEngineBody scope guard) routes an after-`>` engine state-child to
 *     the shorthand-leaf emit, captured verbatim into engine-decl.rulesRaw.
 *
 * No over-relax: a GENUINE `<engine>` inside a real `${}` logic body STILL
 * fires E-STRUCTURAL-ELEMENT-MISPLACED.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { splitBlocks } from "../../src/block-splitter.js";
import { compileScrml } from "../../src/api.js";

let TMP;
beforeAll(() => { TMP = mkdtempSync(join(tmpdir(), "g-colon-markup-")); });
afterAll(() => { if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true }); });

function compile(filename, source) {
  const abs = join(TMP, filename);
  writeFileSync(abs, source);
  return compileScrml({ inputFiles: [abs], outputDir: join(TMP, "dist"), write: false, log: () => {} });
}
function realErrors(result) {
  return (result.errors || []).filter((e) => e && e.severity !== "warning" && e.severity !== "info");
}
function allDiagnostics(result) { return [...(result.errors || []), ...(result.warnings || [])]; }
function hasCode(result, code) { return allDiagnostics(result).some((d) => d && d.code === code); }
function countCode(result, code) { return allDiagnostics(result).filter((d) => d && d.code === code).length; }

/** Find the top-level engine block among block-splitter output. */
function findEngine(blocks) {
  for (const b of blocks) {
    if (b && b.name === "engine") return b;
  }
  return null;
}
function childNames(block) {
  return (block.children || []).filter((c) => c.type !== "text").map((c) => c.name);
}

// ===========================================================================
// §1 — block-splitter level: the top-level <engine> survives as a block with
//      shorthand-leaf state-children (INSIDE-OPENER markup body).
// ===========================================================================
describe("§1 BS — inside-opener `:`-shorthand markup body (top-level engine)", () => {
  const src = `type Phase:enum = { Idle, Loading, Done }

<engine for=Phase initial=.Idle>
    <Idle rule=.Loading : <button onclick=load()>Load</button>>
    <Loading : <p>Loading...</p>>
    <Done : <p>Done</p>>
</>`;

  test("engine block is produced with three shorthand state-children", () => {
    const { blocks, errors } = splitBlocks("inside.scrml", src);
    const eng = findEngine(blocks);
    expect(eng).not.toBeNull();
    expect(childNames(eng)).toEqual(["Idle", "Loading", "Done"]);
    // No block-splitter-level error (the E-CTX-001 cascade is gone).
    expect(errors.map((e) => e.code)).toEqual([]);
  });

  test("the markup body is captured in the shorthand leaf's raw (not truncated)", () => {
    const { blocks } = splitBlocks("inside.scrml", src);
    const eng = findEngine(blocks);
    const idle = (eng.children || []).find((c) => c.name === "Idle");
    expect(idle.closerForm).toBe("shorthand");
    // Full body incl. the `</button>` and the opener terminator captured.
    expect(idle.raw).toContain("<button onclick=load()>Load</button>");
    expect(idle.raw.endsWith(">")).toBe(true);
  });
});

// ===========================================================================
// §2 — block-splitter level: AFTER-`>` deprecated placement no longer dissolves
//      the engine into text (compound-lift exemption + after-`>` leaf-emit).
// ===========================================================================
describe("§2 BS — after-`>` deprecated `:`-shorthand markup body (top-level engine)", () => {
  const src = `type Phase:enum = { Idle, Loading, Done }

<engine for=Phase initial=.Idle>
    <Idle rule=.Loading> : <button onclick=load()>Load</button>
    <Loading> : <p>Loading...</p>
    <Done> : <p>Done</p>
</>`;

  test("engine block is produced (NOT dissolved into a text run)", () => {
    const { blocks } = splitBlocks("after.scrml", src);
    const eng = findEngine(blocks);
    expect(eng).not.toBeNull();
    expect(childNames(eng)).toEqual(["Idle", "Loading", "Done"]);
  });

  test("after-`>` state-children emit as shorthand leaves (no context push)", () => {
    const { blocks } = splitBlocks("after.scrml", src);
    const eng = findEngine(blocks);
    for (const name of ["Idle", "Loading", "Done"]) {
      const c = (eng.children || []).find((x) => x.name === name);
      expect(c.closerForm).toBe("shorthand");
    }
  });

  test("after-`>` works for a non-markup (display-text) body too", () => {
    const textSrc = `type Phase:enum = { Idle, Done }

<engine for=Phase initial=.Idle>
    <Idle rule=.Done> : "Hi"
    <Done> : "Bye"
</>`;
    const { blocks } = splitBlocks("after-text.scrml", textSrc);
    const eng = findEngine(blocks);
    expect(eng).not.toBeNull();
    expect(childNames(eng)).toEqual(["Idle", "Done"]);
  });
});

// ===========================================================================
// §3 — end-to-end compile: all forms compile clean; the misleading cascade is
//      gone; after-`>` fires W-COLON-SHORTHAND-LEGACY-PLACEMENT, inside-opener
//      does not.
// ===========================================================================
describe("§3 E2E — top-level engine `:`-shorthand markup bodies", () => {
  const inside = `type Phase:enum = { Idle, Loading, Done }

function load() { @phase = .Loading }

<engine for=Phase initial=.Idle>
    <Idle rule=.Loading : <button onclick=load()>Load</button>>
    <Loading : <p>Loading...</p>>
    <Done : <p>Done</p>>
</>`;
  const after = `type Phase:enum = { Idle, Loading, Done }

function load() { @phase = .Loading }

<engine for=Phase initial=.Idle>
    <Idle rule=.Loading> : <button onclick=load()>Load</button>
    <Loading> : <p>Loading...</p>
    <Done> : <p>Done</p>
</>`;

  test("inside-opener compiles clean — NO E-STRUCTURAL / E-VARIANT cascade, NO legacy lint", () => {
    const res = compile("e2e-inside.scrml", inside);
    expect(realErrors(res)).toEqual([]);
    expect(hasCode(res, "E-STRUCTURAL-ELEMENT-MISPLACED")).toBe(false);
    expect(hasCode(res, "E-VARIANT-AMBIGUOUS")).toBe(false);
    expect(hasCode(res, "W-COLON-SHORTHAND-LEGACY-PLACEMENT")).toBe(false);
  });

  test("after-`>` compiles clean AND fires the legacy lint once per state-child", () => {
    const res = compile("e2e-after.scrml", after);
    expect(realErrors(res)).toEqual([]);
    expect(hasCode(res, "E-STRUCTURAL-ELEMENT-MISPLACED")).toBe(false);
    expect(hasCode(res, "E-VARIANT-AMBIGUOUS")).toBe(false);
    expect(countCode(res, "W-COLON-SHORTHAND-LEGACY-PLACEMENT")).toBe(3);
  });

  test("bare-body multi-element markup state-children still compile clean (regression)", () => {
    const bare = `type Phase:enum = { Idle, Loading, Done }

function load() { @phase = .Loading }

<engine for=Phase initial=.Idle>
    <Idle rule=.Loading><button onclick=load()>Load</button></>
    <Loading><p>Loading...</p></>
    <Done><p>Done</p></>
</>`;
    const res = compile("e2e-bare.scrml", bare);
    expect(realErrors(res)).toEqual([]);
    expect(hasCode(res, "W-COLON-SHORTHAND-LEGACY-PLACEMENT")).toBe(false);
  });

  test("inside-opener NON-markup (call + display-text) still compiles clean (§160 canonical)", () => {
    const nonMarkup = `type Phase:enum = { Idle, Loading, Done }

<engine for=Phase initial=.Idle>
    <Idle : startGame()>
    <Loading : "Loading…">
    <Done : "Finished.">
</>

function startGame() { @phase = .Loading }`;
    const res = compile("e2e-nonmarkup.scrml", nonMarkup);
    expect(realErrors(res)).toEqual([]);
    expect(hasCode(res, "W-COLON-SHORTHAND-LEGACY-PLACEMENT")).toBe(false);
  });
});

// ===========================================================================
// §4 — no over-relax: a GENUINE structural misplacement still fires.
// ===========================================================================
describe("§4 no over-relax — genuine E-STRUCTURAL-ELEMENT-MISPLACED", () => {
  test("a real `<engine>` inside a `${}` logic body STILL fires E-STRUCTURAL-ELEMENT-MISPLACED", () => {
    const src = `type Phase:enum = { Idle, Done }

\${
    <engine for=Phase initial=.Idle>
        <Idle/>
        <Done/>
    </>
}`;
    const res = compile("genuine.scrml", src);
    expect(hasCode(res, "E-STRUCTURAL-ELEMENT-MISPLACED")).toBe(true);
  });

  test("E-COLON-SHORTHAND-ON-VOID still fires for a void element with a `:`-shorthand body", () => {
    const src = `<label> = "Email"
<input : @label>`;
    const res = compile("void.scrml", src);
    expect(hasCode(res, "E-COLON-SHORTHAND-ON-VOID")).toBe(true);
  });

  test("E-CLOSER-001 still fires for a `:`-shorthand body with a `/>` closer", () => {
    const src = `<label> = "Email"
<span :@label/>`;
    const res = compile("closer.scrml", src);
    expect(hasCode(res, "E-CLOSER-001")).toBe(true);
  });
});
