/**
 * W-INPUT-STATE-MARKUP-NONREACTIVE — info-level lint (SPEC §36.6, change-id
 * g-input-state-markup-nonreactive-lint, 6nz AF, ratified S210 + S219).
 *
 * An input-state `<#id>.field` read (`<keyboard>` / `<mouse>` / `<gamepad>`,
 * §36) placed inside a markup interpolation (`${ ... }`) renders ONCE at mount
 * with NO reactive subscription — §36.6 normative. That render-once behavior is
 * CORRECT and by-design (input-state is a live-read source, not a reactive
 * cell); this lint only makes the otherwise-SILENT footgun loud and steers the
 * author to the §36.6 `@cell` bridge.
 *
 * Tests both the lint module directly (`runWInputStateMarkupNonreactive` over a
 * synthetic block-split AST) and the end-to-end diagnostic-stream partition (the
 * lint lands in `result.warnings` — never `result.errors` — and CLI exit stays
 * 0).
 *
 * Conservative by construction: it fires ONLY when the `<#id>` ref id matches a
 * DECLARED input-state element (never the reactive §6.7.7 `<request>` bridge)
 * and NOT inside an `animationFrame` loop (the §36.6 bridge / game loop).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { runWInputStateMarkupNonreactive } from "../../src/lint-w-input-state-markup-nonreactive.js";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// ---------------------------------------------------------------------------
// §A  runWInputStateMarkupNonreactive — direct over a synthetic block-split AST
// ---------------------------------------------------------------------------

/**
 * Build a BS-result for a `<program>` body that declares one input-state
 * element (`<mouse id="cursor"/>` by default) and hosts ONE markup interp under
 * a leaf `<div>` carrying `interpRaw` (a `${...}` logic node). Mirrors the BS
 * shape probed empirically: a markup `${...}` interp is a `{ type: "logic" }`
 * child of the leaf element, with the interp text as its `raw`.
 */
function bsWithDivInterp(interpRaw, opts = {}) {
  const stateName = opts.stateName ?? "mouse";
  const stateId = opts.stateId ?? "cursor";
  return {
    filePath: "/x.scrml",
    blocks: [
      {
        type: "markup",
        name: "program",
        span: { line: 1, col: 1 },
        children: [
          {
            type: "markup",
            name: stateName,
            raw: `<${stateName} id="${stateId}"/>`,
            span: { line: 2, col: 3 },
            children: [],
          },
          {
            type: "markup",
            name: "div",
            span: { line: 3, col: 3 },
            children: [
              {
                type: "logic",
                raw: interpRaw,
                span: { line: 3, col: 8 },
                children: [],
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Build a BS-result where the `${...}` logic node is a DIRECT child of the
 * `<program>` root — i.e. the program LOGIC BODY, not a markup value interp.
 */
function bsWithProgramLogicBody(logicRaw) {
  return {
    filePath: "/x.scrml",
    blocks: [
      {
        type: "markup",
        name: "program",
        span: { line: 1, col: 1 },
        children: [
          {
            type: "markup",
            name: "mouse",
            raw: `<mouse id="cursor"/>`,
            span: { line: 2, col: 3 },
            children: [],
          },
          {
            type: "logic",
            raw: logicRaw,
            span: { line: 3, col: 3 },
            children: [],
          },
        ],
      },
    ],
  };
}

describe("runWInputStateMarkupNonreactive — direct", () => {
  test("fires on `${<#cursor>.x}` in a markup body (the footgun)", () => {
    const diags = runWInputStateMarkupNonreactive([bsWithDivInterp("${<#cursor>.x}")]);
    expect(diags.length).toBe(1);
    expect(diags[0].code).toBe("W-INPUT-STATE-MARKUP-NONREACTIVE");
    expect(diags[0].severity).toBe("info"); // §36.6 specs this as the info-nudge
    expect(diags[0].message).toContain("<#cursor>");
    expect(diags[0].message).toContain("ONCE");
    expect(diags[0].message).toContain("@cell"); // steer to the bridge
    expect(diags[0].message).toContain("animationFrame");
  });

  test("fires for keyboard + gamepad input-state too", () => {
    const kb = runWInputStateMarkupNonreactive([
      bsWithDivInterp("${<#keys>.pressed('Space')}", { stateName: "keyboard", stateId: "keys" }),
    ]);
    expect(kb.length).toBe(1);
    const gp = runWInputStateMarkupNonreactive([
      bsWithDivInterp("${<#pad>.button(0)}", { stateName: "gamepad", stateId: "pad" }),
    ]);
    expect(gp.length).toBe(1);
  });

  // --- the bridge / loop exclusions (must NOT fire) ---

  test("does NOT fire when `<#id>` is read inside an `animationFrame` loop (the bridge)", () => {
    // The §36.6 game loop / `@cell` bridge reads `<#id>` inside `animationFrame`.
    const diags = runWInputStateMarkupNonreactive([
      bsWithProgramLogicBody(
        "${ function loop() { @x = <#cursor>.x; animationFrame(loop) } animationFrame(loop) }"
      ),
    ]);
    expect(diags.length).toBe(0);
  });

  test("does NOT fire on a `${...}` that contains an `animationFrame(` call even under a markup parent", () => {
    // Even when the interp parent is a leaf element (e.g. a `<canvas>` game-loop
    // host), an `animationFrame(` inside the body is the bridge — never flagged.
    const diags = runWInputStateMarkupNonreactive([
      bsWithDivInterp("${ function gl(){ const m = <#cursor>.x; animationFrame(gl) } animationFrame(gl) }"),
    ]);
    expect(diags.length).toBe(0);
  });

  test("does NOT fire on a program LOGIC BODY bare read (not a markup interp)", () => {
    // A `${ const m = <#cursor>.x }` directly under `<program>` is the logic
    // body, where reading `<#id>` is legitimate — not a markup value interp.
    const diags = runWInputStateMarkupNonreactive([
      bsWithProgramLogicBody("${ const m = <#cursor>.x }"),
    ]);
    expect(diags.length).toBe(0);
  });

  // --- conservatism: never the reactive §6.7.7 request bridge ---

  test("does NOT fire on a `<#id>` ref whose id is NOT a declared input-state element (request bridge)", () => {
    // `<#feed>` here is a §6.7.7 request render bridge — reactive. No `<mouse>` /
    // `<keyboard>` / `<gamepad>` declares `feed`, so the lint never fires.
    const bs = bsWithDivInterp("${<#feed>.data}");
    // remove the input-state decl so `feed` is unmatched
    bs.blocks[0].children = bs.blocks[0].children.filter((c) => c.name !== "mouse");
    const diags = runWInputStateMarkupNonreactive([bs]);
    expect(diags.length).toBe(0);
  });

  test("does NOT fire when an input-state element is declared but the interp reads a DIFFERENT (request) id", () => {
    // `<mouse id="cursor"/>` is declared, but the interp reads `<#feed>` — not an
    // input-state id, so no fire (the reactive request bridge is left alone).
    const diags = runWInputStateMarkupNonreactive([bsWithDivInterp("${<#feed>.data}")]);
    expect(diags.length).toBe(0);
  });

  // --- conservatism: plain interps, no input-state token ---

  test("does NOT fire on a markup interp with no `<#id>` ref", () => {
    expect(runWInputStateMarkupNonreactive([bsWithDivInterp("${@count}")]).length).toBe(0);
    expect(runWInputStateMarkupNonreactive([bsWithDivInterp("${user.name}")]).length).toBe(0);
  });

  test("does NOT fire when no input-state element is declared at all", () => {
    const bs = bsWithDivInterp("${<#cursor>.x}");
    bs.blocks[0].children = bs.blocks[0].children.filter((c) => c.name !== "mouse");
    expect(runWInputStateMarkupNonreactive([bs]).length).toBe(0);
  });

  test("safe on empty / null / malformed input", () => {
    expect(runWInputStateMarkupNonreactive(null).length).toBe(0);
    expect(runWInputStateMarkupNonreactive([]).length).toBe(0);
    expect(runWInputStateMarkupNonreactive([{ filePath: "/x", blocks: null }]).length).toBe(0);
    expect(runWInputStateMarkupNonreactive([{}]).length).toBe(0);
  });

  test("reports the interp node span (line/col of the `${...}`)", () => {
    const diags = runWInputStateMarkupNonreactive([bsWithDivInterp("${<#cursor>.x}")]);
    expect(diags[0].line).toBe(3);
    expect(diags[0].column).toBe(8);
  });

  test("handles a single-quoted `id` on the input-state element", () => {
    const bs = bsWithDivInterp("${<#cursor>.x}");
    bs.blocks[0].children[0].raw = `<mouse id='cursor'/>`;
    expect(runWInputStateMarkupNonreactive([bs]).length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §B  end-to-end partition — lint lands in result.warnings, never result.errors
// ---------------------------------------------------------------------------

let TMP;
beforeAll(() => { TMP = mkdtempSync(join(tmpdir(), "input-state-markup-lint-")); });
afterAll(() => { if (TMP) rmSync(TMP, { recursive: true, force: true }); });

function compile(src) {
  const fp = join(TMP, "r.scrml");
  writeFileSync(fp, src);
  return compileScrml({ inputFiles: [fp], outputDir: join(TMP, "dist"), write: false, log: () => {} });
}

/** Cross-stream count of the code across BOTH diagnostic streams (S93 rule). */
function warnHits(res) {
  return (res.warnings || []).filter(d => d.code === "W-INPUT-STATE-MARKUP-NONREACTIVE");
}
function errHits(res) {
  return (res.errors || []).filter(d => d.code === "W-INPUT-STATE-MARKUP-NONREACTIVE");
}
function fatalErrors(res) {
  return (res.errors || []).filter(e => e.severity == null || e.severity === "error");
}

describe("W-INPUT-STATE-MARKUP-NONREACTIVE — end-to-end partition", () => {
  test("`<div>${<#cursor>.x}</div>` fires exactly one info lint in result.warnings (exit 0)", () => {
    const res = compile(`<program>\n  <mouse id="cursor"/>\n  <div>x = \${<#cursor>.x}</div>\n</program>`);
    // Cross-stream: in warnings, NEVER in errors (S93 / diagnostic-partition rule).
    expect(warnHits(res).length).toBe(1);
    expect(errHits(res).length).toBe(0);
    expect(warnHits(res)[0].severity).toBe("info");
    expect(fatalErrors(res).length).toBe(0); // info-level keeps CLI exit 0
  });

  test("a `<#cursor>` read inside a program logic body fires NOTHING (not a markup interp)", () => {
    const res = compile(`<program>\n  <mouse id="cursor"/>\n  \${ const m = <#cursor>.x }\n</program>`);
    expect(warnHits(res).length).toBe(0);
    expect(errHits(res).length).toBe(0);
  });

  test("a `<request>` `<#feed>.data` markup interp fires NOTHING (reactive §6.7.7 bridge, not input-state)", () => {
    const res = compile(`<program>\n  <request id="feed" url="/x"/>\n  <div>\${<#feed>.data}</div>\n</program>`);
    expect(warnHits(res).length).toBe(0);
    expect(errHits(res).length).toBe(0);
  });

  test("a plain `${@count}` markup interp fires NOTHING (no input-state read)", () => {
    const res = compile(`<program>\n  @count = 0\n  <div>\${@count}</div>\n</program>`);
    expect(warnHits(res).length).toBe(0);
    expect(errHits(res).length).toBe(0);
  });
});
