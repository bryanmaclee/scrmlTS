/**
 * bug-1-tailwind-gradient-family.test.js — Bug 1 Phase 2 gradient composing family.
 *
 * Phase 2 (S191, Approach C / §26.7) added the gradient utilities so a gradient
 * composes from FOUR independent `--tw-gradient-*` custom properties instead of
 * each utility writing a one-shot `background-image` (which would last-write-wins
 * and obliterate siblings). Same INLINE `var()`-fallback model as the Phase-1
 * box-shadow family (no global `*, ::before, ::after` preflight defaults block).
 *
 *   bg-gradient-to-{dir} -> background-image: linear-gradient(<dir>, var(--tw-gradient-stops, ...))
 *   from-{color}         -> --tw-gradient-from + --tw-gradient-to(transparent twin) + 2-stop stops
 *   via-{color}          -> --tw-gradient-to(transparent twin) + 3-stop stops
 *   to-{color}           -> --tw-gradient-to
 *
 * Fidelity decisions (§26.7):
 *   #1  lone bg-gradient-to-r -> `var(--tw-gradient-stops, transparent, transparent)`
 *       (a valid, invisible 2-stop fallback).
 *   #2  from-{color} default --tw-gradient-to = the from-color's TRANSPARENT twin
 *       (v3-faithful, hex -> `rgb(r g b / 0)`); non-hex arbitrary colors fall back
 *       to the literal `transparent`.
 *
 * Coverage:
 *   §1  bg-gradient-to-{dir} — all 8 directions -> linear-gradient(<dir>, stops)
 *   §2  from-{color} — sets --tw-gradient-from + transparent-twin --tw-gradient-to + 2-stop stops
 *   §3  to-{color}   — sets --tw-gradient-to only
 *   §4  via-{color}  — 3-stop stops + transparent-twin --tw-gradient-to
 *   §5  COMPOSE      — bg-gradient-to-r + from + (via) + to on one element resolve to a real gradient
 *   §6  arbitrary    — from-[#hex] / to-[#hex] / via-[#hex] + non-hex keyword fallback
 *   §7  specials     — from/via/to-white/black/transparent
 *   §8  well-formed  — emitted gradient CSS has balanced parens/braces, no empty var
 */

import { describe, test, expect } from "bun:test";
import { getAllUsedCSS } from "../../src/tailwind-classes.js";

function cssFor(classNames) {
  return getAllUsedCSS(classNames.split(" "));
}

// ---------------------------------------------------------------------------
// §1: bg-gradient-to-{dir} — direction -> linear-gradient shorthand
// ---------------------------------------------------------------------------

describe("§1: bg-gradient-to-{dir} sets background-image: linear-gradient(<dir>, stops)", () => {
  const DIRECTIONS = {
    t:  "to top",
    tr: "to top right",
    r:  "to right",
    br: "to bottom right",
    b:  "to bottom",
    bl: "to bottom left",
    l:  "to left",
    tl: "to top left",
  };

  for (const [dir, css] of Object.entries(DIRECTIONS)) {
    test(`bg-gradient-to-${dir} -> linear-gradient(${css}, var(--tw-gradient-stops, ...))`, () => {
      const out = cssFor(`bg-gradient-to-${dir}`);
      expect(out).toContain(`.bg-gradient-to-${dir} {`);
      expect(out).toContain(`background-image: linear-gradient(${css}, var(--tw-gradient-stops, transparent, transparent))`);
    });
  }

  test("lone bg-gradient-to-r emits the invisible-stops fallback (FIDELITY #1)", () => {
    const out = cssFor("bg-gradient-to-r");
    // The fallback resolves to a valid 2-stop (invisible) gradient when no from/via/to.
    expect(out).toContain("var(--tw-gradient-stops, transparent, transparent)");
  });
});

// ---------------------------------------------------------------------------
// §2: from-{color} — sets --tw-gradient-from + transparent-twin --tw-gradient-to + 2-stop stops
// ---------------------------------------------------------------------------

describe("§2: from-{color} sets the from var, transparent-twin to default, and 2-stop stops", () => {
  test("from-blue-500 -> --tw-gradient-from: #3b82f6 + transparent-twin to + stops", () => {
    const out = cssFor("from-blue-500");
    expect(out).toContain(".from-blue-500 {");
    expect(out).toContain("--tw-gradient-from: #3b82f6 var(--tw-gradient-from-position,)");
    // FIDELITY #2: the from-color's transparent twin (blue-500 -> rgb(59 130 246 / 0)).
    expect(out).toContain("--tw-gradient-to: rgb(59 130 246 / 0) var(--tw-gradient-to-position,)");
    expect(out).toContain("--tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgb(59 130 246 / 0))");
  });

  test("from-red-600 derives the correct transparent twin", () => {
    const out = cssFor("from-red-600");
    expect(out).toContain("--tw-gradient-from: #dc2626 var(--tw-gradient-from-position,)");
    expect(out).toContain("--tw-gradient-to: rgb(220 38 38 / 0) var(--tw-gradient-to-position,)");
  });
});

// ---------------------------------------------------------------------------
// §3: to-{color} — sets --tw-gradient-to only
// ---------------------------------------------------------------------------

describe("§3: to-{color} sets --tw-gradient-to only (the final stop)", () => {
  test("to-purple-600 -> --tw-gradient-to: #9333ea", () => {
    const out = cssFor("to-purple-600");
    expect(out).toContain(".to-purple-600 {");
    expect(out).toContain("--tw-gradient-to: #9333ea var(--tw-gradient-to-position,)");
    // to-* sets ONLY the to var — no from/stops on its own.
    expect(out).not.toContain("--tw-gradient-from:");
    expect(out).not.toContain("--tw-gradient-stops:");
  });
});

// ---------------------------------------------------------------------------
// §4: via-{color} — 3-stop stops + transparent-twin --tw-gradient-to
// ---------------------------------------------------------------------------

describe("§4: via-{color} emits the 3-stop --tw-gradient-stops", () => {
  test("via-green-500 -> 3-stop stops (from, green, to) + transparent twin", () => {
    const out = cssFor("via-green-500");
    expect(out).toContain(".via-green-500 {");
    expect(out).toContain("--tw-gradient-to: rgb(34 197 94 / 0) var(--tw-gradient-to-position,)");
    expect(out).toContain(
      "--tw-gradient-stops: var(--tw-gradient-from,), #22c55e var(--tw-gradient-via-position,), var(--tw-gradient-to, rgb(34 197 94 / 0))"
    );
  });
});

// ---------------------------------------------------------------------------
// §5: COMPOSE — the whole point: multiple gradient utilities on one element
// resolve to a real gradient via the shared --tw-gradient-stops cascade.
// ---------------------------------------------------------------------------

describe("§5: gradient utilities COMPOSE (the bug-1 fix)", () => {
  test("bg-gradient-to-r from-blue-500 to-purple-600 -> bg-image + both color vars (2-stop)", () => {
    const out = cssFor("bg-gradient-to-r from-blue-500 to-purple-600");
    // background-image present with the stops var.
    expect(out).toContain("background-image: linear-gradient(to right, var(--tw-gradient-stops");
    // from sets --tw-gradient-from; to OVERRIDES the transparent-twin --tw-gradient-to default.
    expect(out).toContain("--tw-gradient-from: #3b82f6");
    expect(out).toContain("--tw-gradient-to: #9333ea var(--tw-gradient-to-position,)");
    // No missing/empty var that would break the resolved gradient:
    // the stops reference from + to, both of which are set.
    expect(out).toContain("--tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to");
  });

  test("bg-gradient-to-r from-blue-500 via-green-500 to-purple-600 -> 3-stop via stops + bg-image", () => {
    const out = cssFor("bg-gradient-to-r from-blue-500 via-green-500 to-purple-600");
    expect(out).toContain("background-image: linear-gradient(to right, var(--tw-gradient-stops");
    expect(out).toContain("--tw-gradient-from: #3b82f6");
    // via wins the stops cascade (declared after from) with the 3-stop list.
    expect(out).toContain("#22c55e var(--tw-gradient-via-position,)");
    // to sets the final color.
    expect(out).toContain("--tw-gradient-to: #9333ea var(--tw-gradient-to-position,)");
  });
});

// ---------------------------------------------------------------------------
// §6: arbitrary values — from-[#hex] / to-[#hex] / via-[#hex] + non-hex keyword
// ---------------------------------------------------------------------------

describe("§6: arbitrary gradient stops (from-[…]/via-[…]/to-[…])", () => {
  test("from-[#ff0000] -> --tw-gradient-from: #ff0000 + derived transparent twin", () => {
    const out = cssFor("from-[#ff0000]");
    expect(out).toContain("--tw-gradient-from: #ff0000 var(--tw-gradient-from-position,)");
    expect(out).toContain("--tw-gradient-to: rgb(255 0 0 / 0) var(--tw-gradient-to-position,)");
  });

  test("to-[#0000ff] -> --tw-gradient-to: #0000ff", () => {
    const out = cssFor("to-[#0000ff]");
    expect(out).toContain("--tw-gradient-to: #0000ff var(--tw-gradient-to-position,)");
  });

  test("via-[#00ff00] -> 3-stop stops with #00ff00 in the middle", () => {
    const out = cssFor("via-[#00ff00]");
    expect(out).toContain("#00ff00 var(--tw-gradient-via-position,)");
    expect(out).toContain("--tw-gradient-to: rgb(0 255 0 / 0) var(--tw-gradient-to-position,)");
  });

  test("from-[red] (non-hex keyword) falls back to literal transparent twin (FIDELITY #2 tail)", () => {
    const out = cssFor("from-[red]");
    expect(out).toContain("--tw-gradient-from: red var(--tw-gradient-from-position,)");
    // keyword color -> transparent-twin is not derivable -> literal `transparent`.
    expect(out).toContain("--tw-gradient-to: transparent var(--tw-gradient-to-position,)");
  });
});

// ---------------------------------------------------------------------------
// §7: special gradient colors (white / black / transparent)
// ---------------------------------------------------------------------------

describe("§7: special gradient colors", () => {
  test("from-white / to-black / via-transparent register", () => {
    expect(cssFor("from-white")).toContain("--tw-gradient-from: #ffffff");
    expect(cssFor("to-black")).toContain("--tw-gradient-to: #000000 var(--tw-gradient-to-position,)");
    expect(cssFor("via-transparent")).toContain("transparent var(--tw-gradient-via-position,)");
  });
});

// ---------------------------------------------------------------------------
// §8: well-formedness — the composed gradient CSS is balanced + no empty var
// ---------------------------------------------------------------------------

describe("§8: emitted gradient CSS is well-formed", () => {
  test("a full 3-stop gradient has balanced parens/braces and no undefined var", () => {
    const out = cssFor("bg-gradient-to-r from-blue-500 via-green-500 to-purple-600");
    const opens = (out.match(/\(/g) || []).length;
    const closes = (out.match(/\)/g) || []).length;
    expect(opens).toBe(closes);
    const ob = (out.match(/{/g) || []).length;
    const cb = (out.match(/}/g) || []).length;
    expect(ob).toBe(cb);
    // No empty `var()` (a `var(undefined)` or bare `var()` would be a broken stop).
    expect(out).not.toContain("var()");
    expect(out).not.toContain("undefined");
  });
});
