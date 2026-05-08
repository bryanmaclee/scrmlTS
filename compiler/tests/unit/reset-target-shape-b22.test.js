/**
 * Phase A1b Step B22 — `reset(@cell)` target-shape validation
 * (SYM PASS 14 — `walkValidateResetTargets`).
 *
 * Per SPEC §6.8.2 (line 4844+) + §34 catalog row E-RESET-INVALID-TARGET.
 *
 * **What B22 SHIPS:**
 *   - PASS 14 walker `walkValidateResetTargets` runs after PASS 13.
 *   - Fires `E-RESET-INVALID-TARGET` per §6.8.2 + §34 when the target of a
 *     `reset(...)` keyword call is not one of the three canonical shapes:
 *       reset(@cell)              // bare top-level cell or compound parent
 *       reset(@compound)          // whole compound (alias for the above)
 *       reset(@compound.field)    // single-level compound nav
 *     Plus, per Phase 0 SURVEY decision (§6.3.5 recursive-composition
 *     semantics), multi-level compound nav (`reset(@a.b.c.d)`) is ACCEPTED
 *     when each segment resolves through the compound-scope chain.
 *
 *   - Skips nodes already carrying a parse-time `diagnostic` (E-RESET-NO-ARG
 *     path) so we don't double-report.
 *
 *   - Pass-through (no-fire) on:
 *       * `@`-prefixed IdentExpr where B3 stamped `_resolvedStateCell: null`
 *         (name-resolution issue, not shape — B22 stays silent).
 *       * `@`-rooted MemberExpr chain where `lookupQualifiedStateCell`
 *         returns null (same — leaf-level resolution issue).
 *
 * **Out of scope (deferred per §34 design):**
 *   - `reset()` no-arg + `reset(a, b)` multi-arg: handled by E-RESET-NO-ARG
 *     at parse time (tested in `parse-reset-keyword.test.js`).
 *   - `function reset() {}`: handled by E-RESERVED-IDENTIFIER.
 *   - `default=` evaluation semantics + synthesized-property side-effects:
 *     runtime A1c (per §55.13).
 *
 * Spec authority:
 *   §6.8.2  — `reset(@cell)` keyword + 3 canonical target shapes.
 *   §6.3.5  — V5-strict recursive composition (grounds multi-level decision).
 *   §6.6.x  — compound state (cross-ref).
 *   §34     — error catalog (E-RESET-INVALID-TARGET row added by B22).
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runSYM } from "../../src/symbol-table.ts";

function parse(source) {
  const bs = splitBlocks("test.scrml", source);
  return buildAST(bs);
}

function buildAndRun(source) {
  const { ast, errors: parseErrors } = parse(source);
  const sym = runSYM({ filePath: "test.scrml", ast });
  return { ast, parseErrors, sym };
}

function errsByCode(sym, code) {
  return sym.errors.filter((e) => e.code === code);
}

function hasParseErrorCode(parseErrors, code) {
  return (parseErrors || []).some((e) => e?.code === code);
}

// ===========================================================================
// §B22.1 — POSITIVE: bare cell target — `reset(@cell)`
// ===========================================================================

describe("§B22.1 positive — `reset(@cell)` (bare top-level cell)", () => {
  test("§B22.1.1 simple top-level cell — no fire", () => {
    const src = `<program>\${
      <count> = 0
      function go() { reset(@count) }
    }</program>`;
    const { sym } = buildAndRun(src);
    expect(errsByCode(sym, "E-RESET-INVALID-TARGET").length).toBe(0);
    expect(errsByCode(sym, "E-RESET-NO-ARG").length).toBe(0);
  });

  test("§B22.1.2 multiple cells reset in sequence — no fires", () => {
    const src = `<program>\${
      <a> = 1
      <b> = 2
      <c> = 3
      function go() { reset(@a) ; reset(@b) ; reset(@c) }
    }</program>`;
    const { sym } = buildAndRun(src);
    expect(errsByCode(sym, "E-RESET-INVALID-TARGET").length).toBe(0);
  });
});

// ===========================================================================
// §B22.2 — POSITIVE: whole compound — `reset(@compound)`
// ===========================================================================

describe("§B22.2 positive — `reset(@compound)` (whole compound parent)", () => {
  test("§B22.2.1 reset entire compound — no fire", () => {
    const src = `<program>\${
      <form>
        <name>  = ""
        <email> = ""
      </>
      function go() { reset(@form) }
    }</program>`;
    const { sym } = buildAndRun(src);
    expect(errsByCode(sym, "E-RESET-INVALID-TARGET").length).toBe(0);
  });
});

// ===========================================================================
// §B22.3 — POSITIVE: single-level compound nav — `reset(@compound.field)`
// ===========================================================================

describe("§B22.3 positive — `reset(@compound.field)` (single-level compound nav)", () => {
  test("§B22.3.1 reset single field — no fire", () => {
    const src = `<program>\${
      <form>
        <name>  = ""
        <email> = ""
      </>
      function go() { reset(@form.name) }
    }</program>`;
    const { sym } = buildAndRun(src);
    expect(errsByCode(sym, "E-RESET-INVALID-TARGET").length).toBe(0);
  });

  test("§B22.3.2 multiple field resets — no fires", () => {
    const src = `<program>\${
      <form>
        <name>  = ""
        <email> = ""
      </>
      function go() { reset(@form.name) ; reset(@form.email) }
    }</program>`;
    const { sym } = buildAndRun(src);
    expect(errsByCode(sym, "E-RESET-INVALID-TARGET").length).toBe(0);
  });
});

// ===========================================================================
// §B22.4 — POSITIVE: multi-level compound nav (Phase 0 decision)
// ===========================================================================
//
// Per Phase 0 SURVEY: §6.3.5 recursive composition + B12's
// `lookupQualifiedStateCell` extension descend through ANY cell with a
// `_scope` attached. Multi-level paths resolve uniformly, so B22 ACCEPTS
// `reset(@compound.subCompound.field)` when the full path resolves.
// SPEC-PROSE FOLLOW-UP: §6.8.2 line 4848-4853 should be amended to make
// this explicit.

describe("§B22.4 positive — multi-level compound nav (Phase 0 decision)", () => {
  test("§B22.4.1 two-level nested compound — no fire", () => {
    const src = `<program>\${
      <wrap>
        <inner>
          <leaf> = 0
        </>
      </>
      function go() { reset(@wrap.inner.leaf) }
    }</program>`;
    const { sym } = buildAndRun(src);
    expect(errsByCode(sym, "E-RESET-INVALID-TARGET").length).toBe(0);
  });

  test("§B22.4.2 three-level nested compound — no fire", () => {
    const src = `<program>\${
      <a>
        <b>
          <c>
            <leaf> = 0
          </>
        </>
      </>
      function go() { reset(@a.b.c.leaf) }
    }</program>`;
    const { sym } = buildAndRun(src);
    expect(errsByCode(sym, "E-RESET-INVALID-TARGET").length).toBe(0);
  });

  test("§B22.4.3 reset whole sub-compound (multi-level intermediate) — no fire", () => {
    const src = `<program>\${
      <wrap>
        <inner>
          <leaf> = 0
        </>
      </>
      function go() { reset(@wrap.inner) }
    }</program>`;
    const { sym } = buildAndRun(src);
    expect(errsByCode(sym, "E-RESET-INVALID-TARGET").length).toBe(0);
  });
});

// ===========================================================================
// §B22.5 — NEGATIVE: literal target — `reset(42)`, `reset("x")`, etc.
// ===========================================================================

describe("§B22.5 negative — literal target", () => {
  test("§B22.5.1 numeric literal — fires", () => {
    const src = `<program>\${
      <count> = 0
      function go() { reset(42) }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-RESET-INVALID-TARGET");
    expect(fires.length).toBe(1);
    expect(fires[0].severity).toBe("error");
    expect(fires[0].message).toContain("literal");
    expect(fires[0].message).toContain("§6.8.2");
  });

  test("§B22.5.2 string literal — fires", () => {
    const src = `<program>\${
      <count> = 0
      function go() { reset("hello") }
    }</program>`;
    const { sym } = buildAndRun(src);
    expect(errsByCode(sym, "E-RESET-INVALID-TARGET").length).toBe(1);
  });

  test("§B22.5.3 null literal — fires", () => {
    const src = `<program>\${
      <count> = 0
      function go() { reset(null) }
    }</program>`;
    const { sym } = buildAndRun(src);
    expect(errsByCode(sym, "E-RESET-INVALID-TARGET").length).toBe(1);
  });
});

// ===========================================================================
// §B22.6 — NEGATIVE: function-call result — `reset(getCell())`
// ===========================================================================

describe("§B22.6 negative — function-call result", () => {
  test("§B22.6.1 plain call — fires", () => {
    const src = `<program>\${
      <count> = 0
      function getCell() { return @count }
      function go() { reset(getCell()) }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-RESET-INVALID-TARGET");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("function-call result");
  });
});

// ===========================================================================
// §B22.7 — NEGATIVE: arbitrary expression — `reset(@a + 1)`
// ===========================================================================

describe("§B22.7 negative — arbitrary expression", () => {
  test("§B22.7.1 binary expression — fires", () => {
    const src = `<program>\${
      <count> = 0
      function go() { reset(@count + 1) }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-RESET-INVALID-TARGET");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("binary expression");
  });

  test("§B22.7.2 ternary expression — fires", () => {
    const src = `<program>\${
      <a> = 0
      <b> = 0
      <flag> = true
      function go() { reset(@flag ? @a : @b) }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-RESET-INVALID-TARGET");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("ternary expression");
  });

  test("§B22.7.3 unary expression — fires", () => {
    const src = `<program>\${
      <count> = 0
      function go() { reset(-@count) }
    }</program>`;
    const { sym } = buildAndRun(src);
    expect(errsByCode(sym, "E-RESET-INVALID-TARGET").length).toBe(1);
  });
});

// ===========================================================================
// §B22.8 — NEGATIVE: bare identifier without `@` prefix — `reset(count)`
// ===========================================================================

describe("§B22.8 negative — bare identifier without `@` prefix", () => {
  test("§B22.8.1 bare-name target — fires", () => {
    const src = `<program>\${
      <count> = 0
      function go() { let x = 0 ; reset(x) }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-RESET-INVALID-TARGET");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("bare identifier without `@` prefix");
  });
});

// ===========================================================================
// §B22.9 — NEGATIVE: member chain rooted at non-`@` identifier
// ===========================================================================

describe("§B22.9 negative — member chain rooted at non-`@` identifier", () => {
  test("§B22.9.1 `obj.field` (no `@`) — fires", () => {
    const src = `<program>\${
      <count> = 0
      function go() { let obj = { field: 1 } ; reset(obj.field) }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-RESET-INVALID-TARGET");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("non-`@` identifier");
  });
});

// ===========================================================================
// §B22.10 — NEGATIVE: nested reset (`reset(reset(@a))`)
// ===========================================================================

describe("§B22.10 negative — nested reset (reset-expr inside reset-expr)", () => {
  test("§B22.10.1 `reset(reset(@a))` — fires for outer", () => {
    const src = `<program>\${
      <count> = 0
      function go() { reset(reset(@count)) }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-RESET-INVALID-TARGET");
    // Outer reset has reset-expr as target → invalid.
    // Inner reset(@count) is fine (target is @count) → no fire.
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("nested `reset(...)` call");
  });
});

// ===========================================================================
// §B22.11 — POSITIVE: parse-time E-RESET-NO-ARG passes through (no double-fire)
// ===========================================================================

describe("§B22.11 positive — already-diagnosed nodes are skipped", () => {
  test("§B22.11.1 `reset()` no-arg — only E-RESET-NO-ARG fires (B22 silent)", () => {
    const src = `<program>\${
      <count> = 0
      function go() { reset() }
    }</program>`;
    const { sym, parseErrors } = buildAndRun(src);
    // Step 9 surfaces E-RESET-NO-ARG (parse-time / TAB error).
    expect(hasParseErrorCode(parseErrors, "E-RESET-NO-ARG")).toBe(true);
    // B22 must NOT additionally fire E-RESET-INVALID-TARGET on the
    // synthesized undefined-literal target.
    expect(errsByCode(sym, "E-RESET-INVALID-TARGET").length).toBe(0);
  });

  test("§B22.11.2 `reset(@a, @b)` multi-arg — only E-RESET-NO-ARG fires", () => {
    const src = `<program>\${
      <a> = 0
      <b> = 0
      function go() { reset(@a, @b) }
    }</program>`;
    const { sym, parseErrors } = buildAndRun(src);
    expect(hasParseErrorCode(parseErrors, "E-RESET-NO-ARG")).toBe(true);
    expect(errsByCode(sym, "E-RESET-INVALID-TARGET").length).toBe(0);
  });
});

// ===========================================================================
// §B22.12 — INTEGRATION: member-call form `obj.reset(x)` is NOT a reset-expr
// ===========================================================================
//
// Step 9 §R9.7 regression: `obj.reset(...)` stays a regular method call and
// is NOT lifted to reset-expr. B22 should NEVER see it; confirm here.

describe("§B22.12 integration — `obj.reset(x)` is a method call, not a reset-expr", () => {
  test("§B22.12.1 `limiter.reset(\"key\")` — no E-RESET-INVALID-TARGET", () => {
    const src = `<program>\${
      function go() { let limiter = { reset: (k) => null } ; limiter.reset("key") }
    }</program>`;
    const { sym } = buildAndRun(src);
    expect(errsByCode(sym, "E-RESET-INVALID-TARGET").length).toBe(0);
    expect(errsByCode(sym, "E-RESET-NO-ARG").length).toBe(0);
  });
});

// ===========================================================================
// §B22.13 — Diagnostic message quality
// ===========================================================================

describe("§B22.13 diagnostic message quality", () => {
  test("§B22.13.1 message identifies offending target shape", () => {
    const src = `<program>\${
      <count> = 0
      function go() { reset(@count + 1) }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-RESET-INVALID-TARGET");
    expect(fires.length).toBe(1);
    expect(fires[0].code).toBe("E-RESET-INVALID-TARGET");
    expect(fires[0].severity).toBe("error");
  });

  test("§B22.13.2 message recommends canonical forms", () => {
    const src = `<program>\${
      <count> = 0
      function go() { reset(42) }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-RESET-INVALID-TARGET");
    expect(fires.length).toBe(1);
    // Canonical-form recommendation present.
    expect(fires[0].message).toContain("@cell");
    expect(fires[0].message).toContain("@compound");
    expect(fires[0].message).toContain("@compound.field");
  });

  test("§B22.13.3 message cross-references SPEC §6.8.2 + §34", () => {
    const src = `<program>\${
      <count> = 0
      function go() { reset(42) }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-RESET-INVALID-TARGET");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("§6.8.2");
    expect(fires[0].message).toContain("§34");
  });
});

// ===========================================================================
// §B22.14 — Span integrity
// ===========================================================================

describe("§B22.14 span integrity", () => {
  test("§B22.14.1 fired diagnostic carries the reset-expr's span", () => {
    const src = `<program>\${
      <count> = 0
      function go() { reset(42) }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-RESET-INVALID-TARGET");
    expect(fires.length).toBe(1);
    expect(fires[0].span).toBeTruthy();
    expect(typeof fires[0].span.start).toBe("number");
    expect(typeof fires[0].span.end).toBe("number");
    expect(fires[0].span.end).toBeGreaterThanOrEqual(fires[0].span.start);
  });
});
