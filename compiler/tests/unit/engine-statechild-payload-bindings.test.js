/* SPDX-License-Identifier: MIT
 * B1 (§51.0.B.1, S98 amendment — track 2 compiler-feature wiring) —
 * payload-binding parser + PASS 11 validation regression coverage.
 *
 * Companion to:
 *   - SPEC §51.0.B.1 (normative landed at 7ba0268, S98)
 *   - SURVEY scrml-support/docs/deep-dives/payload-bearing-engine-state-child-variants-SURVEY-2026-05-17.md
 *
 * Coverage:
 *   §1  parsePayloadBindings — 3 forms parse correctly
 *   §2  Reserved-name precedence (rule/effect/history/internal:rule skipped)
 *   §3  PASS 11 — E-ENGINE-PAYLOAD-ON-UNIT-VARIANT
 *   §4  PASS 11 — E-ENGINE-PAYLOAD-ARITY-MISMATCH
 *   §5  PASS 11 — E-ENGINE-PAYLOAD-RESERVED-COLLISION
 *   §6  Multi-field variants (BracketStack.OpenAt three fields)
 *   §7  Array-typed payloads (ErrorRecovery.AccumulatingSkipped(tokens: [Token]))
 */

import { describe, expect, test } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runSYM } from "../../src/symbol-table.ts";
import {
  parsePayloadBindings,
  parseEngineStateChildren,
} from "../../src/engine-statechild-parser.ts";

function runUpToSYM(source, filePath = "test.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast } = buildAST(bs);
  return { ast, sym: runSYM({ filePath, ast }) };
}

function findCodes(sym, prefix) {
  return sym.errors.filter((e) => e.code.startsWith(prefix)).map((e) => e.code);
}

// ---------------------------------------------------------------------------
// §1 — parsePayloadBindings: three forms parse correctly
// ---------------------------------------------------------------------------

describe("B1 §1 parsePayloadBindings — three forms", () => {
  test("bare-attribute form single field", () => {
    expect(parsePayloadBindings(" rows rule=.Idle")).toEqual([
      { kind: "positional", name: "rows" },
    ]);
  });

  test("parenthesized form single field", () => {
    expect(parsePayloadBindings("(rows) rule=.Idle")).toEqual([
      { kind: "positional", name: "rows" },
    ]);
  });

  test("named form single field", () => {
    expect(parsePayloadBindings(" rows=r rule=.Idle")).toEqual([
      { kind: "named", field: "rows", name: "r" },
    ]);
  });

  test("paren-named form (named-inside-parens)", () => {
    expect(parsePayloadBindings("(rows: r) rule=.Idle")).toEqual([
      { kind: "named", field: "rows", name: "r" },
    ]);
  });

  test("bare-attribute multi-field", () => {
    expect(parsePayloadBindings(" depth opener span rule=.Foo")).toEqual([
      { kind: "positional", name: "depth" },
      { kind: "positional", name: "opener" },
      { kind: "positional", name: "span" },
    ]);
  });

  test("parenthesized multi-field", () => {
    expect(parsePayloadBindings("(depth, opener, span) rule=.Foo")).toEqual([
      { kind: "positional", name: "depth" },
      { kind: "positional", name: "opener" },
      { kind: "positional", name: "span" },
    ]);
  });

  test("empty attribute list yields no bindings", () => {
    expect(parsePayloadBindings(" rule=.Idle")).toEqual([]);
  });

  test("self-close trailing slash does not bleed into bindings", () => {
    expect(parsePayloadBindings(" rows rule=.Idle/")).toEqual([
      { kind: "positional", name: "rows" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// §2 — Reserved-name precedence
// ---------------------------------------------------------------------------

describe("B1 §2 reserved-attr precedence — skipped from bindings", () => {
  test("rule= not treated as binding", () => {
    expect(parsePayloadBindings(" rule=.Idle")).toEqual([]);
  });

  test("history bareword not treated as binding", () => {
    expect(parsePayloadBindings(" history rule=.Idle")).toEqual([]);
  });

  test("effect=${...} not treated as binding", () => {
    expect(parsePayloadBindings(" effect=${ doStuff() } rule=.Idle")).toEqual([]);
  });

  test("internal:rule= not treated as binding", () => {
    expect(parsePayloadBindings(" internal:rule=.Foo rule=.Bar")).toEqual([]);
  });

  test("mixed bindings + reserved attrs — only bindings extracted", () => {
    const out = parsePayloadBindings(" rows history rule=.Idle effect=${ x }");
    expect(out).toEqual([{ kind: "positional", name: "rows" }]);
  });
});

// ---------------------------------------------------------------------------
// §3 — PASS 11: E-ENGINE-PAYLOAD-ON-UNIT-VARIANT
// ---------------------------------------------------------------------------

describe("B1 §3 PASS 11 — unit-variant rejection", () => {
  test("E-ENGINE-PAYLOAD-ON-UNIT-VARIANT fires when bindings declared on unit variant", () => {
    const src = `type S:enum = { Idle, Done }

<engine for=S initial=.Idle>
    <Idle rule=.Done></>
    <Done rows rule=.Idle></>
</>
`;
    const { sym } = runUpToSYM(src);
    expect(findCodes(sym, "E-ENGINE-PAYLOAD-ON-UNIT-VARIANT").length).toBeGreaterThan(0);
  });

  test("unit variant with no bindings does NOT fire", () => {
    const src = `type S:enum = { Idle, Done }

<engine for=S initial=.Idle>
    <Idle rule=.Done></>
    <Done rule=.Idle></>
</>
`;
    const { sym } = runUpToSYM(src);
    expect(findCodes(sym, "E-ENGINE-PAYLOAD-ON-UNIT-VARIANT")).toEqual([]);
  });

  test("payload variant with bindings does NOT fire unit-variant code", () => {
    const src = `type S:enum = { Idle, Done(rows: int) }

<engine for=S initial=.Idle>
    <Idle rule=.Done></>
    <Done rows rule=.Idle></>
</>
`;
    const { sym } = runUpToSYM(src);
    expect(findCodes(sym, "E-ENGINE-PAYLOAD-ON-UNIT-VARIANT")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §4 — PASS 11: E-ENGINE-PAYLOAD-ARITY-MISMATCH
// ---------------------------------------------------------------------------

describe("B1 §4 PASS 11 — arity mismatch", () => {
  test("too few positional bindings fires E-ENGINE-PAYLOAD-ARITY-MISMATCH", () => {
    const src = `type S:enum = { Idle, Done(rows: int, total: int) }

<engine for=S initial=.Idle>
    <Idle rule=.Done></>
    <Done rows rule=.Idle></>
</>
`;
    const { sym } = runUpToSYM(src);
    expect(findCodes(sym, "E-ENGINE-PAYLOAD-ARITY-MISMATCH").length).toBeGreaterThan(0);
  });

  test("too many positional bindings fires E-ENGINE-PAYLOAD-ARITY-MISMATCH", () => {
    const src = `type S:enum = { Idle, Done(rows: int) }

<engine for=S initial=.Idle>
    <Idle rule=.Done></>
    <Done rows total rule=.Idle></>
</>
`;
    const { sym } = runUpToSYM(src);
    expect(findCodes(sym, "E-ENGINE-PAYLOAD-ARITY-MISMATCH").length).toBeGreaterThan(0);
  });

  test("mixed positional + named on same opener fires E-ENGINE-PAYLOAD-ARITY-MISMATCH", () => {
    const src = `type S:enum = { Idle, Done(rows: int, total: int) }

<engine for=S initial=.Idle>
    <Idle rule=.Done></>
    <Done rows total=t rule=.Idle></>
</>
`;
    const { sym } = runUpToSYM(src);
    expect(findCodes(sym, "E-ENGINE-PAYLOAD-ARITY-MISMATCH").length).toBeGreaterThan(0);
  });

  test("exact match — no diagnostic", () => {
    const src = `type S:enum = { Idle, Done(rows: int, total: int) }

<engine for=S initial=.Idle>
    <Idle rule=.Done></>
    <Done rows total rule=.Idle></>
</>
`;
    const { sym } = runUpToSYM(src);
    expect(findCodes(sym, "E-ENGINE-PAYLOAD-ARITY-MISMATCH")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §5 — PASS 11: E-ENGINE-PAYLOAD-RESERVED-COLLISION
// ---------------------------------------------------------------------------

describe("B1 §5 PASS 11 — reserved collision", () => {
  test("variant field named 'rule' fires E-ENGINE-PAYLOAD-RESERVED-COLLISION", () => {
    const src = `type S:enum = { Idle, Done(rule: string) }

<engine for=S initial=.Idle>
    <Idle rule=.Done></>
    <Done(rule_local) rule=.Idle></>
</>
`;
    const { sym } = runUpToSYM(src);
    expect(findCodes(sym, "E-ENGINE-PAYLOAD-RESERVED-COLLISION").length).toBeGreaterThan(0);
  });

  test("variant field named 'effect' fires E-ENGINE-PAYLOAD-RESERVED-COLLISION", () => {
    const src = `type S:enum = { Idle, Done(effect: string) }

<engine for=S initial=.Idle>
    <Idle rule=.Done></>
    <Done(eff) rule=.Idle></>
</>
`;
    const { sym } = runUpToSYM(src);
    expect(findCodes(sym, "E-ENGINE-PAYLOAD-RESERVED-COLLISION").length).toBeGreaterThan(0);
  });

  test("variant field named 'history' fires E-ENGINE-PAYLOAD-RESERVED-COLLISION", () => {
    const src = `type S:enum = { Idle, Done(history: int) }

<engine for=S initial=.Idle>
    <Idle rule=.Done></>
    <Done(h) rule=.Idle></>
</>
`;
    const { sym } = runUpToSYM(src);
    expect(findCodes(sym, "E-ENGINE-PAYLOAD-RESERVED-COLLISION").length).toBeGreaterThan(0);
  });

  test("non-colliding field name does NOT fire", () => {
    const src = `type S:enum = { Idle, Done(rows: int) }

<engine for=S initial=.Idle>
    <Idle rule=.Done></>
    <Done rows rule=.Idle></>
</>
`;
    const { sym } = runUpToSYM(src);
    expect(findCodes(sym, "E-ENGINE-PAYLOAD-RESERVED-COLLISION")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §6 — Multi-field variants (BracketStack.OpenAt three fields)
// ---------------------------------------------------------------------------

describe("B1 §6 multi-field variants (BracketStack)", () => {
  test("three positional bare-attribute bindings parse correctly", () => {
    const body = `<OpenAt depth opener span rule=.Balanced></>`;
    const out = parseEngineStateChildren(body);
    expect(out.length).toBe(1);
    expect(out[0].payloadBindings).toEqual([
      { kind: "positional", name: "depth" },
      { kind: "positional", name: "opener" },
      { kind: "positional", name: "span" },
    ]);
  });

  test("three positional parenthesized bindings parse correctly", () => {
    const body = `<OpenAt(depth, opener, span) rule=.Balanced></>`;
    const out = parseEngineStateChildren(body);
    expect(out.length).toBe(1);
    expect(out[0].payloadBindings).toEqual([
      { kind: "positional", name: "depth" },
      { kind: "positional", name: "opener" },
      { kind: "positional", name: "span" },
    ]);
  });

  test("BracketStack multi-field validates clean — no payload diagnostics", () => {
    const src = `type BracketStack:enum = {
    Balanced,
    OpenAt(depth: int, opener: int, span: int)
}

<engine for=BracketStack initial=.Balanced>
    <Balanced rule=.OpenAt></>
    <OpenAt depth opener span rule=.Balanced></>
</>
`;
    const { sym } = runUpToSYM(src);
    expect(findCodes(sym, "E-ENGINE-PAYLOAD")).toEqual([]);
  });

  test("BracketStack parenthesized form validates clean", () => {
    const src = `type BracketStack:enum = {
    Balanced,
    OpenAt(depth: int, opener: int, span: int)
}

<engine for=BracketStack initial=.Balanced>
    <Balanced rule=.OpenAt></>
    <OpenAt(depth, opener, span) rule=.Balanced></>
</>
`;
    const { sym } = runUpToSYM(src);
    expect(findCodes(sym, "E-ENGINE-PAYLOAD")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §7 — Array-typed payloads (ErrorRecovery.AccumulatingSkipped)
// ---------------------------------------------------------------------------

describe("B1 §7 array-typed payloads", () => {
  test("array-typed payload (Token[]) binds the same as scalar — no diagnostic", () => {
    const src = `type ErrorRecovery:enum = {
    Healthy,
    AccumulatingSkipped(tokens: [int])
}

<engine for=ErrorRecovery initial=.Healthy>
    <Healthy rule=.AccumulatingSkipped></>
    <AccumulatingSkipped tokens rule=.Healthy></>
</>
`;
    const { sym } = runUpToSYM(src);
    expect(findCodes(sym, "E-ENGINE-PAYLOAD")).toEqual([]);
  });

  test("array-typed parenthesized form validates clean", () => {
    const src = `type ErrorRecovery:enum = {
    Healthy,
    AccumulatingSkipped(tokens: [int])
}

<engine for=ErrorRecovery initial=.Healthy>
    <Healthy rule=.AccumulatingSkipped></>
    <AccumulatingSkipped(tokens) rule=.Healthy></>
</>
`;
    const { sym } = runUpToSYM(src);
    expect(findCodes(sym, "E-ENGINE-PAYLOAD")).toEqual([]);
  });
});
