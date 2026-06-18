// ---------------------------------------------------------------------------
// E-CONTROL-FLOW-IN-MARKUP — bare control-flow statement in a markup body
// (bare-control-flow-in-markup-diagnostic-2026-06-17, reject+recover ruling (a), S203)
// ---------------------------------------------------------------------------
//
// SPEC §17.4 / §7: control flow in a markup body (`for`/`if`/`while`) MUST be
// wrapped in a `${ ... }` logic block. A BARE `for (...) { ... }` directly in a
// markup body is NOT recognised as logic — pre-fix the whole construct (incl.
// its inner `${...}` interpolations) was classified as inert text and SHIPPED
// RAW into the DOM. The fix fires E-CONTROL-FLOW-IN-MARKUP (a §34 Error) at the
// markup-text recognition site (liftBareDeclarations, ast-builder.js) and
// RECOVERS by dropping the raw-text emission — neither `for(){}` nor `${...}`
// reaches the DOM.
//
// This regression test asserts BOTH halves of the contract:
//   (1) the bare form FIRES the diagnostic (one per offending construct);
//   (2) the canonical `${ for/lift }` form is STILL CLEAN (no false-fire), and
//       prose / identifiers that merely START with a keyword do not over-fire.

import { describe, test, expect } from "bun:test";
import { writeFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { compileScrml } from "../../src/api.js";

const TMP = mkdtempSync(join(tmpdir(), "cfim-"));
function compile(src) {
  const p = join(TMP, `t-${Math.random().toString(36).slice(2)}.scrml`);
  writeFileSync(p, src);
  return compileScrml({ inputFiles: [p], write: false, outputDir: join(TMP, "out") });
}
function cfimErrors(r) {
  return (r.errors ?? []).filter(e => (e.code ?? "") === "E-CONTROL-FLOW-IN-MARKUP");
}

describe("E-CONTROL-FLOW-IN-MARKUP — fires on bare control flow in a markup body", () => {
  test("bare `for` in a <ul> markup body fires once (Error → result.errors)", () => {
    const src =
      `<program>\n` +
      `\${\n  <items> = [1, 2, 3]\n}\n` +
      `<ul>\n  for (x of @items) {\n    <li>\${x}</>\n  }\n</ul>\n` +
      `</program>\n`;
    const r = compile(src);
    const e = cfimErrors(r);
    expect(e.length).toBe(1);
    // Partition: a §34 Error lands in result.errors, never result.warnings.
    const inWarnings = (r.warnings ?? []).filter(w => (w.code ?? "") === "E-CONTROL-FLOW-IN-MARKUP");
    expect(inWarnings.length).toBe(0);
  });

  test("the message steers to the canonical `${ for/lift }` form + names §17.4 / §7", () => {
    const src =
      `<program>\n\${\n  <items> = [1, 2, 3]\n}\n` +
      `<ul>\n  for (x of @items) {\n    <li>\${x}</>\n  }\n</ul>\n</program>\n`;
    const e = cfimErrors(compile(src));
    expect(e.length).toBe(1);
    expect(e[0].message).toMatch(/\$\{ for/);   // names the canonical wrapped form
    expect(e[0].message).toMatch(/17\.4/);      // cites §17.4
    expect(e[0].message).toMatch(/each in=/);   // names the Tier-1 alternative
  });

  test("bare `if (...) { ... }` in a markup body fires", () => {
    const src =
      `<program>\n\${\n  <show> = true\n}\n` +
      `<div>\n  if (@show) {\n    <p>visible</>\n  }\n</div>\n</program>\n`;
    expect(cfimErrors(compile(src)).length).toBe(1);
  });

  test("bare `while (...) { ... }` in a markup body fires", () => {
    // NB: a bare `<` comparator (`@n < 3`) in a markup-body text run is parsed
    // as a tag opener by BS before this detector runs (a separate, pre-existing
    // `<`-as-tag ambiguity). Use a non-`<` condition so the construct reaches
    // the markup-text recognition site as a coherent text block.
    const src =
      `<program>\n\${\n  <running> = true\n}\n` +
      `<div>\n  while (@running) {\n    <p>tick</>\n  }\n</div>\n</program>\n`;
    expect(cfimErrors(compile(src)).length).toBe(1);
  });

  test("RECOVERY: neither raw `for(){}` nor raw `${...}` reaches any string output", () => {
    const src =
      `<program>\n\${\n  <msgs> = ["a", "b"]\n}\n` +
      `<ul>\n  for (msg of @msgs) {\n    <li>\${msg}</>\n  }\n</ul>\n</program>\n`;
    const r = compile(src);
    expect(cfimErrors(r).length).toBe(1);
    // The recovery invariant: no raw control-flow source nor its inner
    // interpolation survives into any emitted string artifact.
    for (const [k, v] of Object.entries(r)) {
      if (typeof v !== "string") continue;
      expect(v.includes("for (msg of")).toBe(false);
      expect(/\$\{msg\}/.test(v)).toBe(false);
    }
  });

  test("two bare `for` constructs fire twice (once per construct)", () => {
    const src =
      `<program>\n\${\n  <a> = [1]\n  <b> = [2]\n}\n` +
      `<ul>\n  for (x of @a) {\n    <li>\${x}</>\n  }\n</ul>\n` +
      `<ul>\n  for (y of @b) {\n    <li>\${y}</>\n  }\n</ul>\n</program>\n`;
    expect(cfimErrors(compile(src)).length).toBe(2);
  });
});

describe("E-CONTROL-FLOW-IN-MARKUP — does NOT false-fire on the canonical / legitimate forms", () => {
  test("canonical Tier-0 `${ for/lift }` in a <ul> body compiles WITHOUT the error", () => {
    const src =
      `<program>\n\${\n  <items> = [1, 2, 3]\n}\n` +
      `<ul>\${\n  for (x of @items) {\n    lift <li>\${x}</>\n  }\n}</>\n</program>\n`;
    expect(cfimErrors(compile(src)).length).toBe(0);
  });

  test("canonical `${ for (msg of @messages) { lift ... } }` channel-shape is clean", () => {
    const src =
      `<program>\n\${\n  <messages> = ["hello", "world"]\n}\n` +
      `<ul>\${\n  for (msg of @messages) {\n    lift <li>\${msg}</>\n  }\n}</>\n</program>\n`;
    expect(cfimErrors(compile(src)).length).toBe(0);
  });

  test("an `if=` attribute condition (§17.0) is not a body construct — no fire", () => {
    const src =
      `<program>\n\${\n  <show> = true\n}\n` +
      `<div>\n  <p if=@show>shown</>\n</div>\n</program>\n`;
    expect(cfimErrors(compile(src)).length).toBe(0);
  });

  test("prose / identifiers that merely START with a keyword do not over-fire", () => {
    // `for sale`, `if you`, `forEach`-shaped prose runs — none are control flow.
    const src =
      `<program>\n` +
      `<p>for sale: see below</p>\n` +
      `<p>if you want a coffee, ask for one</p>\n` +
      `<p>while supplies last</p>\n</program>\n`;
    expect(cfimErrors(compile(src)).length).toBe(0);
  });

  test("a bare `for` at a default-logic root (<program> direct child) does NOT fire here", () => {
    // The §40.8 default-logic auto-lift owns control flow at default-logic roots;
    // E-CONTROL-FLOW-IN-MARKUP is gated to markup parents and must not steal it.
    const src =
      `<program>\n\${\n  <items> = [1, 2, 3]\n  for (x of @items) {\n    log(x)\n  }\n}\n` +
      `<p>ok</>\n</program>\n`;
    expect(cfimErrors(compile(src)).length).toBe(0);
  });
});
