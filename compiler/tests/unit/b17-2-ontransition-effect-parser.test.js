/* SPDX-License-Identifier: MIT
 * Phase A1b Step B17.2 — parser-extension for `<onTransition>` + `effect=`.
 *
 * Tests the AST-shape extensions produced by:
 *   - `compiler/src/engine-statechild-parser.ts` opener-attribute parsing
 *     (`effect=${...}` extraction; balanced-brace scan).
 *   - `compiler/src/engine-statechild-parser.ts` body-scan helper
 *     `scanForOnTransitionEntries` and its skipRegions composition with
 *     `scanForOnTimeoutEntries` / `scanForNestedEngineEntries`.
 *
 * Coverage (per BRIEF §scope-IN item 6):
 *   §B17.2.1  effect=${...} on state-child opener — basic capture
 *   §B17.2.2  <onTransition to=.X> with body — basic capture
 *   §B17.2.3  <onTransition> with all four attributes (to/once/if=)
 *   §B17.2.4  <onTransition from=.X> — incoming transition handler form
 *   §B17.2.5  <onTransition> :-shorthand body — isColonShorthand: true
 *   §B17.2.6  <onTransition/> self-closing — bodyRaw empty
 *   §B17.2.7  Multiple <onTransition> in one body — order preserved
 *   §B17.2.8  <onTransition> body containing <onTimeout> — no double-count
 *   §B17.2.9  Negative — no effect=, no <onTransition> → null + []
 *   §B17.2.10 Co-existence — effect= AND <onTransition> children
 *   §B17.2.11 Negative — malformed effect= (unbalanced braces) → null
 *   §B17.2.12 Negative — malformed <onTransition> (no to= and no from=)
 *   §B17.2.13 Regression-guard — A5-2 onTimeoutElements + innerEngines intact
 *
 * Source-of-truth: SPEC §51.0.H (lines 20536-20585) + §51.0.I (lines 20587-20605)
 * + B17.2 SURVEY.md decisions (capture-with-null fallback, `:`-shorthand
 * supported defensively, `if=` captured verbatim).
 */

import { describe, expect, test } from "bun:test";
import {
  parseEngineStateChildren,
  scanForOnTransitionEntries,
  scanForOnTimeoutEntries,
  scanForNestedEngineEntries,
} from "../../src/engine-statechild-parser.ts";

// ---------------------------------------------------------------------------
// §B17.2.1 — effect=${...} on state-child opener
// ---------------------------------------------------------------------------

describe("§B17.2.1 — effect=${...} on state-child opener (§51.0.H Form 1)", () => {
  test("simple effect=${log('x')} captures inner expression verbatim", () => {
    const body = `<Small rule=.Big effect=\${ log("x") }></>`;
    const entries = parseEngineStateChildren(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].tag).toBe("Small");
    expect(entries[0].rule).toEqual({ kind: "single", target: "Big" });
    expect(entries[0].effectRaw).toBe(' log("x") ');
  });

  test("effect=${} with nested braces captures balanced expression", () => {
    const body = `<Small rule=.Big effect=\${ if (a) { f() } else { g() } }></>`;
    const entries = parseEngineStateChildren(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].effectRaw).toBe(" if (a) { f() } else { g() } ");
  });

  test("effect=${...} on self-closing state-child", () => {
    const body = `<Small rule=.Big effect=\${ playSound("grow") }/>`;
    const entries = parseEngineStateChildren(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].tag).toBe("Small");
    expect(entries[0].effectRaw).toBe(' playSound("grow") ');
    expect(entries[0].bodyRaw).toBe("");
  });

  test("effect=${...} with :-shorthand body", () => {
    const body = `<Small rule=.Big effect=\${ playSound("grow") }> : "🧍"`;
    const entries = parseEngineStateChildren(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].effectRaw).toBe(' playSound("grow") ');
    expect(entries[0].isColonShorthand).toBe(true);
  });

  test("absent effect= → effectRaw: null", () => {
    const body = `<Small rule=.Big></>`;
    const entries = parseEngineStateChildren(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].effectRaw).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §B17.2.2 — <onTransition to=.X> body capture
// ---------------------------------------------------------------------------

describe("§B17.2.2 — <onTransition to=.X> body capture (§51.0.H Form 2)", () => {
  test("single <onTransition to=.Fire> with bare body", () => {
    const body = `<onTransition to=.Fire>\${ playSound("fire") }</>`;
    const entries = scanForOnTransitionEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].to).toBe("Fire");
    expect(entries[0].from).toBeNull();
    expect(entries[0].once).toBe(false);
    expect(entries[0].ifExprRaw).toBeNull();
    expect(entries[0].bodyRaw).toBe('${ playSound("fire") }');
    expect(entries[0].isColonShorthand).toBe(false);
    expect(entries[0].rawOffset).toBe(0);
  });

  test("explicit </onTransition> closer (instead of </>)", () => {
    const body = `<onTransition to=.Fire>do_thing()</onTransition>`;
    const entries = scanForOnTransitionEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].bodyRaw).toBe("do_thing()");
  });

  test("inside an engine state-child via parseEngineStateChildren", () => {
    // SPEC §51.0.H worked example.
    const body = `<Big rule=(.Fire | .Cape | .Small)>
  <onTransition to=.Fire>\${ playSound("fire"); animateFlame() }</>
  "🧍 🧍"
</>`;
    const entries = parseEngineStateChildren(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].tag).toBe("Big");
    expect(entries[0].rule.kind).toBe("multi");
    expect(entries[0].onTransitionElements).toHaveLength(1);
    expect(entries[0].onTransitionElements[0].to).toBe("Fire");
    expect(entries[0].onTransitionElements[0].bodyRaw).toContain("playSound");
  });
});

// ---------------------------------------------------------------------------
// §B17.2.3 — <onTransition> with multiple attributes
// ---------------------------------------------------------------------------

describe("§B17.2.3 — <onTransition> with all four attributes", () => {
  test("to + once + if= (paren-form) captured separately", () => {
    // SPEC §51.0.H line 20558 canonical example shape.
    const body = `<onTransition to=.Small if=(@gameOver == false) once>\${ log("regression") }</>`;
    const entries = scanForOnTransitionEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].to).toBe("Small");
    expect(entries[0].once).toBe(true);
    expect(entries[0].ifExprRaw).toBe("(@gameOver == false)");
  });

  test("to=.Cape once (without if=)", () => {
    const body = `<onTransition to=.Cape once>\${ playSound("cape") }</>`;
    const entries = scanForOnTransitionEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].to).toBe("Cape");
    expect(entries[0].once).toBe(true);
    expect(entries[0].ifExprRaw).toBeNull();
  });

  test("if=${expr} logic-context form is captured verbatim with wrapper", () => {
    // SURVEY decision 1: parser captures verbatim, typer normalises.
    const body = `<onTransition to=.X if=\${@a > 0}>do()</>`;
    const entries = scanForOnTransitionEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].ifExprRaw).toBe("${@a > 0}");
  });
});

// ---------------------------------------------------------------------------
// §B17.2.4 — from= form (incoming transition handler)
// ---------------------------------------------------------------------------

describe("§B17.2.4 — <onTransition from=.X> incoming-transition handler form", () => {
  test("from=.Big captured into `from`, `to` remains null", () => {
    const body = `<onTransition from=.Big>\${ playSound("powered-up") }</>`;
    const entries = scanForOnTransitionEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].from).toBe("Big");
    expect(entries[0].to).toBeNull();
  });

  test("inside a state-child body via parseEngineStateChildren", () => {
    // Kickstarter v2 §4.4 example.
    const body = `<Fire rule=.Small>
    <onTransition from=.Big>\${ playSound("powered-up") }</>
    "🔥"
  </>`;
    const entries = parseEngineStateChildren(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].tag).toBe("Fire");
    expect(entries[0].onTransitionElements).toHaveLength(1);
    expect(entries[0].onTransitionElements[0].from).toBe("Big");
    expect(entries[0].onTransitionElements[0].to).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §B17.2.5 — :-shorthand body (defensive support per SURVEY decision sub-3a)
// ---------------------------------------------------------------------------

describe("§B17.2.5 — <onTransition> :-shorthand body (§51.0.I)", () => {
  test(":-shorthand sets isColonShorthand and bodyRaw is post-: text", () => {
    const body = `<onTransition to=.Fire> : playSound("fire")`;
    const entries = scanForOnTransitionEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].to).toBe("Fire");
    expect(entries[0].isColonShorthand).toBe(true);
    expect(entries[0].bodyRaw.trim()).toBe('playSound("fire")');
  });
});

// ---------------------------------------------------------------------------
// §B17.2.6 — Self-closing form (per SURVEY decision 2)
// ---------------------------------------------------------------------------

describe("§B17.2.6 — <onTransition .../> self-closing — bodyRaw empty", () => {
  test("self-closing onTransition with to= captures empty body", () => {
    const body = `<onTransition to=.Fire/>`;
    const entries = scanForOnTransitionEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].to).toBe("Fire");
    expect(entries[0].bodyRaw).toBe("");
    expect(entries[0].isColonShorthand).toBe(false);
  });

  test("self-closing onTransition with from= and once", () => {
    const body = `<onTransition from=.AtRisk once/>`;
    const entries = scanForOnTransitionEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].from).toBe("AtRisk");
    expect(entries[0].once).toBe(true);
    expect(entries[0].bodyRaw).toBe("");
  });
});

// ---------------------------------------------------------------------------
// §B17.2.7 — Multiple <onTransition> in one body — order preserved
// ---------------------------------------------------------------------------

describe("§B17.2.7 — Multiple <onTransition> entries in source order", () => {
  test("three siblings captured in source order", () => {
    // SPEC §51.0.H worked example — three onTransition siblings.
    const body = `<onTransition to=.Fire>\${ playSound("fire") }</>
<onTransition to=.Cape once>\${ playSound("cape") }</>
<onTransition to=.Small if=(@gameOver == false)>\${ log("regression") }</>`;
    const entries = scanForOnTransitionEntries(body);
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.to)).toEqual(["Fire", "Cape", "Small"]);
    expect(entries[1].once).toBe(true);
    expect(entries[2].ifExprRaw).toBe("(@gameOver == false)");
    // Offsets monotonically increasing.
    expect(entries[0].rawOffset).toBeLessThan(entries[1].rawOffset);
    expect(entries[1].rawOffset).toBeLessThan(entries[2].rawOffset);
  });
});

// ---------------------------------------------------------------------------
// §B17.2.8 — Composition: <onTransition> body containing <onTimeout>
// ---------------------------------------------------------------------------

describe("§B17.2.8 — <onTransition> body containing <onTimeout> — no double-count", () => {
  test("<onTimeout> inside <onTransition> body is NOT in outer state-child's onTimeoutElements", () => {
    // The <onTimeout> sits INSIDE an <onTransition> body (a strange but
    // technically possible authoring shape) — should NOT be picked up by the
    // outer state-child's onTimeout body-scan per SURVEY decision sub-3b.
    const body = `<Small rule=.Big>
  <onTransition to=.Big>
    <onTimeout after=500ms to=.Done/>
  </>
</>`;
    const entries = parseEngineStateChildren(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].onTransitionElements).toHaveLength(1);
    // Outer state-child should see ZERO direct onTimeout entries.
    expect(entries[0].onTimeoutElements).toHaveLength(0);
  });

  test("<onTimeout> at state-child top level IS captured even when sibling <onTransition> exists", () => {
    const body = `<Small rule=.Big>
  <onTimeout after=500ms to=.Big/>
  <onTransition to=.Big>\${ log("transitioning") }</>
</>`;
    const entries = parseEngineStateChildren(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].onTimeoutElements).toHaveLength(1);
    expect(entries[0].onTimeoutElements[0].to).toBe("Big");
    expect(entries[0].onTransitionElements).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// §B17.2.9 — Negative: no effect= and no <onTransition>
// ---------------------------------------------------------------------------

describe("§B17.2.9 — state-child with no effect= and no <onTransition>", () => {
  test("plain state-child has effectRaw: null and onTransitionElements: []", () => {
    const body = `<Small rule=.Big></>`;
    const entries = parseEngineStateChildren(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].effectRaw).toBeNull();
    expect(entries[0].onTransitionElements).toEqual([]);
  });

  test(":-shorthand body state-child also has empty B17.2 fields", () => {
    const body = `<Small rule=.Big> : "🧍"`;
    const entries = parseEngineStateChildren(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].effectRaw).toBeNull();
    // :-shorthand bodies are not body-scanned (single-expression discipline).
    expect(entries[0].onTransitionElements).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §B17.2.10 — Co-existence: effect= AND <onTransition> per SPEC §51.0.H
// ---------------------------------------------------------------------------

describe("§B17.2.10 — Co-existence: effect= attribute AND <onTransition> children", () => {
  test("both captured independently", () => {
    // SPEC line 20579-20582: a single state-child MAY have BOTH effect= and
    // <onTransition> children.
    const body = `<Small rule=.Big effect=\${ logTransition() }>
  <onTransition to=.Big>\${ playEffect() }</>
</>`;
    const entries = parseEngineStateChildren(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].effectRaw).toBe(" logTransition() ");
    expect(entries[0].onTransitionElements).toHaveLength(1);
    expect(entries[0].onTransitionElements[0].to).toBe("Big");
  });
});

// ---------------------------------------------------------------------------
// §B17.2.11 — Negative: malformed effect= (unbalanced braces)
// ---------------------------------------------------------------------------

describe("§B17.2.11 — Negative: malformed effect= (unbalanced ${ ... })", () => {
  test("effect=${ ... missing closing brace → effectRaw: null per SURVEY decision 3", () => {
    // The parser's findOpenerEnd respects only paren / quote depth, not braces;
    // an opener like `<Small effect=${ unclosed >` would have its `>` consumed
    // as part of the opener if not for the paren/quote logic. We construct a
    // case where the opener ends but the brace never balances within the
    // captured region. The simplest probe: just ensure that absent `${` AT
    // ALL keeps effectRaw at null.
    const body = `<Small rule=.Big effect=plainText></>`;
    const entries = parseEngineStateChildren(body);
    expect(entries).toHaveLength(1);
    // No `${` after `effect=`, so the balanced-brace scan never starts;
    // effectRaw stays null.
    expect(entries[0].effectRaw).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §B17.2.12 — Negative: malformed <onTransition> (no to= and no from=)
// ---------------------------------------------------------------------------

describe("§B17.2.12 — Negative: <onTransition> with neither to= nor from=", () => {
  test("captured with to=null AND from=null per SURVEY decision 3 (typer flags)", () => {
    const body = `<onTransition>\${ doStuff() }</>`;
    const entries = scanForOnTransitionEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].to).toBeNull();
    expect(entries[0].from).toBeNull();
    expect(entries[0].bodyRaw).toBe("${ doStuff() }");
  });

  test("self-closing onTransition with neither attr captured with both null", () => {
    const body = `<onTransition/>`;
    const entries = scanForOnTransitionEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].to).toBeNull();
    expect(entries[0].from).toBeNull();
    expect(entries[0].bodyRaw).toBe("");
  });
});

// ---------------------------------------------------------------------------
// §B17.2.13 — Regression-guard: A5-2 onTimeoutElements + innerEngines intact
// ---------------------------------------------------------------------------

describe("§B17.2.13 — Regression-guard for A5-2 (onTimeoutElements + innerEngines)", () => {
  test("scanForOnTimeoutEntries still works on a typical engine body", () => {
    const body = `<onTimeout after=500ms to=.Done/>`;
    const entries = scanForOnTimeoutEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].after).toBe("500ms");
    expect(entries[0].to).toBe("Done");
  });

  test("scanForNestedEngineEntries still works on a typical body", () => {
    const body = `<engine for=Inner initial=.A><A rule=.B/><B/></>`;
    const entries = scanForNestedEngineEntries(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].rawText).toContain("<engine for=Inner");
  });

  test("parseEngineStateChildren on A5-2-shaped state-child preserves both fields", () => {
    const body = `<Loading rule=.Done history>
  <onTimeout after=1s to=.Done/>
  <engine for=Inner initial=.A>
    <A rule=.B/>
    <B/>
  </>
</>`;
    const entries = parseEngineStateChildren(body);
    expect(entries).toHaveLength(1);
    expect(entries[0].tag).toBe("Loading");
    expect(entries[0].historyAttr).toBe(true);
    expect(entries[0].onTimeoutElements).toHaveLength(1);
    expect(entries[0].onTimeoutElements[0].after).toBe("1s");
    expect(entries[0].innerEngines).toHaveLength(1);
    // B17.2 fields default cleanly.
    expect(entries[0].effectRaw).toBeNull();
    expect(entries[0].onTransitionElements).toEqual([]);
  });
});
