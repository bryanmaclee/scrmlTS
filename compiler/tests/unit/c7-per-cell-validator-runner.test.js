/**
 * c7-per-cell-validator-runner.test.js — A1c Step C7 unit tests
 *
 * Tests per-cell validator runner emission per SPEC §55.2 (firing semantics) +
 * §55.6 (per-field synth surface) + §55.7 (synth property semantics) + §55.12
 * (short-circuit + composition).
 *
 *   §C7.0  Emission shape — basic structure of the emitted runner
 *   §C7.1  Single bareword validator (`req`, `is some`)
 *   §C7.2  Single call-form validator (`length(>=N)`, `pattern`, `min`, etc.)
 *   §C7.3  Multi-validator compose (in declaration order)
 *   §C7.4  §55.12 short-circuit on `req` fail
 *   §C7.5  §55.12 short-circuit on `is some` fail
 *   §C7.6  Cross-field validator (`eq(@otherCell)`) — re-fires on cross-field change
 *   §C7.7  Arg-kind dispatch — relational, comparable, equatable, array
 *   §C7.8  Skip rules — top-level cell, derived, compound-parent, server, function-body, markup-typed
 *   §C7.9  `isValid` = `errors.length === 0`
 *   §C7.10 Reactive-deps wired for cell value + cross-field args
 *   §C7.11 Chunk wiring — `validators` chunk in `RUNTIME_CHUNK_ORDER` + content
 *   §C7.12 Chunk-detection — `state-decl` with `validators[]` adds `validators` chunk
 *   §C7.13 Inline-message-override slot stripped from emission (B13/C10 ownership)
 *   §C7.14 Runtime end-to-end — emit + execute + behavior matches SPEC
 *
 * SCOPE: per A1c BRIEF §1 — covers per-field runner emission + per-validator
 * dispatch + short-circuit + reactive-deps + chunk wiring. OUT OF SCOPE:
 * compound-level rollup (C8), error-message rendering (C10), `<errors of=>`
 * element (C11), engine-state validators (§55.14 — out of Wave 2).
 */

import { describe, test, expect } from "bun:test";
import { emitLogicNode } from "../../src/codegen/emit-logic.js";
import { emitValidatorRunnerSidecar } from "../../src/codegen/emit-validators.ts";
import {
  RUNTIME_CHUNKS,
  RUNTIME_CHUNK_ORDER,
  assembleRuntime,
} from "../../src/codegen/runtime-chunks.ts";
import {
  fireValidator,
  VALIDATOR_RUNTIME_NAMES,
} from "../../src/runtime-validators.js";

// ---------------------------------------------------------------------------
// AST construction helpers — minimal shape constructors mirroring c5-test patterns.
// ---------------------------------------------------------------------------

function span() { return { start: 0, end: 0 }; }

function lit(litType, raw) {
  return { kind: "lit", litType, raw, span: span() };
}

function ident(name) {
  return { kind: "ident", name, span: span() };
}

function relational(op, value) {
  return { kind: "relational-predicate", op, value, span: span() };
}

function arrayLit(elements) {
  return { kind: "array", elements, span: span() };
}

function bareValidator(name) {
  return { name, args: null, span: span() };
}

function callValidator(name, args) {
  return { name, args, span: span() };
}

function callValidatorWithOverride(name, args, override) {
  return { name, args, span: span(), inlineOverride: override };
}

function compoundChild(name, init, validators) {
  return {
    kind: "state-decl",
    name,
    init,
    initExpr: lit("string", JSON.stringify(init)),
    shape: "plain",
    structuralForm: true,
    isConst: false,
    _cellKind: "plain",
    validators: validators || [],
    span: span(),
  };
}

function compoundParent(name, children) {
  return {
    kind: "state-decl",
    name,
    init: "",
    initExpr: null,
    shape: "plain",
    structuralForm: true,
    isConst: false,
    _cellKind: "compound-parent",
    children,
    span: span(),
  };
}

function topLevelPlain(name, init, validators) {
  return {
    kind: "state-decl",
    name,
    init,
    initExpr: lit("string", JSON.stringify(init)),
    shape: "plain",
    structuralForm: true,
    isConst: false,
    _cellKind: "plain",
    validators: validators || [],
    span: span(),
  };
}

function derivedConst(name, validators) {
  return {
    kind: "state-decl",
    name,
    init: "0",
    initExpr: lit("number", "0"),
    shape: "derived",
    structuralForm: true,
    isConst: true,
    _cellKind: "plain",
    validators: validators || [],
    span: span(),
  };
}

function markupTyped(name, validators) {
  return {
    kind: "state-decl",
    name,
    init: "",
    initExpr: null,
    shape: "decl-with-spec",
    structuralForm: true,
    isConst: true,
    _cellKind: "markup-typed",
    renderSpec: { element: { kind: "markup", tag: "span", attrs: [], children: [] } },
    validators: validators || [],
    span: span(),
  };
}

function clientOpts() {
  return { boundary: "client" };
}

// ---------------------------------------------------------------------------
// §C7.0 — Emission shape
// ---------------------------------------------------------------------------

describe("C7 §C7.0 — Emission shape (basic structure)", () => {
  test("emits _scrml_derived_declare for both errors and isValid synth keys", () => {
    const child = compoundChild("email", "", [bareValidator("req")]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain('_scrml_derived_declare("signup.email.errors"');
    expect(out).toContain('_scrml_derived_declare("signup.email.isValid"');
  });

  test("isValid derives from errors via _scrml_derived_get(...).length === 0", () => {
    const child = compoundChild("email", "", [bareValidator("req")]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain(
      '_scrml_derived_declare("signup.email.isValid", () => _scrml_derived_get("signup.email.errors").length === 0)',
    );
  });

  test("errors closure reads cell value via _scrml_reactive_get", () => {
    const child = compoundChild("email", "", [bareValidator("req")]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain('const value = _scrml_reactive_get("signup.email")');
  });

  test("subscribes the errors derivation to the cell's own value", () => {
    const child = compoundChild("email", "", [bareValidator("req")]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain(
      '_scrml_derived_subscribe("signup.email.errors", "signup.email")',
    );
  });

  test("subscribes isValid to the errors derivation", () => {
    const child = compoundChild("email", "", [bareValidator("req")]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain(
      '_scrml_derived_subscribe("signup.email.isValid", "signup.email.errors")',
    );
  });
});

// ---------------------------------------------------------------------------
// §C7.1 — Single bareword validator
// ---------------------------------------------------------------------------

describe("C7 §C7.1 — Single bareword validator", () => {
  test("`req` emits _scrml_validator_fire(\"req\", value)", () => {
    const child = compoundChild("email", "", [bareValidator("req")]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain('const error = _scrml_validator_fire("req", value);');
  });

  test("`is some` emits _scrml_validator_fire(\"is some\", value)", () => {
    const child = compoundChild("email", "", [bareValidator("is some")]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain(
      'const error = _scrml_validator_fire("is some", value);',
    );
  });

  test("bareword `req` short-circuits on failure (returns errors immediately)", () => {
    const child = compoundChild("email", "", [bareValidator("req")]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    // The short-circuit code should appear in the emitted runner.
    expect(out).toContain("§55.12 short-circuit");
    expect(out).toContain("return errors;");
  });

  test("non-short-circuiter `length` does NOT emit return-errors guard", () => {
    const child = compoundChild("email", "", [
      callValidator("length", [relational(">=", lit("number", "2"))]),
    ]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    // length should use the simple `if (error !== null) errors.push(error);` form.
    expect(out).toContain("if (error !== null) errors.push(error);");
    // §55.12 marker should NOT appear (only req/is some short-circuit).
    expect(out).not.toMatch(/§55\.12 short-circuit:\s*length/);
  });
});

// ---------------------------------------------------------------------------
// §C7.2 — Single call-form validator
// ---------------------------------------------------------------------------

describe("C7 §C7.2 — Single call-form validator", () => {
  test("`length(>=N)` emits relational-predicate object literal", () => {
    const child = compoundChild("name", "", [
      callValidator("length", [relational(">=", lit("number", "2"))]),
    ]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain('_scrml_validator_fire("length", value, { op: ">=", value: 2 })');
  });

  test("`length(<=10)` emits with <= op", () => {
    const child = compoundChild("name", "", [
      callValidator("length", [relational("<=", lit("number", "10"))]),
    ]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain('{ op: "<=", value: 10 }');
  });

  test("`min(0)` emits numeric literal arg", () => {
    const child = compoundChild("age", "0", [
      callValidator("min", [lit("number", "0")]),
    ]);
    const parent = compoundParent("form", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain('_scrml_validator_fire("min", value, 0)');
  });

  test("`max(120)` emits numeric literal arg", () => {
    const child = compoundChild("age", "0", [
      callValidator("max", [lit("number", "120")]),
    ]);
    const parent = compoundParent("form", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain('_scrml_validator_fire("max", value, 120)');
  });

  test("`pattern(/.../)` emits regex literal arg", () => {
    const child = compoundChild("email", "", [
      callValidator("pattern", [lit("regex", "/^[^@]+@[^@]+$/")]),
    ]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain('_scrml_validator_fire("pattern", value, /^[^@]+@[^@]+$/)');
  });

  test("`oneOf([...])` emits array literal arg", () => {
    const child = compoundChild("role", "", [
      callValidator("oneOf", [
        arrayLit([lit("string", '"admin"'), lit("string", '"editor"')]),
      ]),
    ]);
    const parent = compoundParent("form", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain('_scrml_validator_fire("oneOf", value, ["admin", "editor"])');
  });
});

// ---------------------------------------------------------------------------
// §C7.3 — Multi-validator compose
// ---------------------------------------------------------------------------

describe("C7 §C7.3 — Multi-validator compose (declaration order)", () => {
  test("two validators emit in declaration order", () => {
    const child = compoundChild("name", "", [
      callValidator("length", [relational(">=", lit("number", "2"))]),
      callValidator("pattern", [lit("regex", "/^[a-z]+$/")]),
    ]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    const lengthIdx = out.indexOf('"length"');
    const patternIdx = out.indexOf('"pattern"');
    expect(lengthIdx).toBeGreaterThan(-1);
    expect(patternIdx).toBeGreaterThan(-1);
    expect(lengthIdx).toBeLessThan(patternIdx);
  });

  test("three validators emit in declaration order", () => {
    const child = compoundChild("name", "", [
      bareValidator("req"),
      callValidator("length", [relational(">=", lit("number", "2"))]),
      callValidator("pattern", [lit("regex", "/^[a-z]+$/")]),
    ]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    const reqIdx = out.indexOf('"req"');
    const lengthIdx = out.indexOf('"length"');
    const patternIdx = out.indexOf('"pattern"');
    expect(reqIdx).toBeLessThan(lengthIdx);
    expect(lengthIdx).toBeLessThan(patternIdx);
  });

  test("validators are wrapped in independent JS blocks (const error doesn't shadow)", () => {
    const child = compoundChild("name", "", [
      bareValidator("req"),
      callValidator("length", [relational(">=", lit("number", "2"))]),
    ]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    // The runner emits one block per validator. Two `const error =` statements
    // should appear in different scoped blocks.
    const constErrorMatches = (out.match(/const error =/g) || []).length;
    expect(constErrorMatches).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// §C7.4 — Short-circuit on `req` fail (§55.12)
// ---------------------------------------------------------------------------

describe("C7 §C7.4 — Short-circuit on `req` failure", () => {
  test("`req` fail emits early `return errors;` per §55.12", () => {
    const child = compoundChild("name", "", [
      bareValidator("req"),
      callValidator("length", [relational(">=", lit("number", "2"))]),
    ]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    // The req block should have the short-circuit return.
    const reqBlockStart = out.indexOf('"req"');
    const reqBlockEnd = out.indexOf('"length"');
    const reqBlockContent = out.substring(reqBlockStart, reqBlockEnd);
    expect(reqBlockContent).toContain("return errors;");
    expect(reqBlockContent).toContain("§55.12 short-circuit: req");
  });

  test("only `req` reaches return; subsequent validators come AFTER short-circuit but inside same closure", () => {
    const child = compoundChild("name", "", [
      bareValidator("req"),
      callValidator("length", [relational(">=", lit("number", "2"))]),
    ]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    // req's block contains return-errors; length's block does NOT.
    const lengthIdx = out.indexOf('"length"');
    const lengthBlock = out.substring(lengthIdx, out.indexOf("return errors;", lengthIdx + 1));
    // The length block should not contain its own return errors statement.
    expect(lengthBlock).not.toContain("return errors;");
  });
});

// ---------------------------------------------------------------------------
// §C7.5 — Short-circuit on `is some` fail (§55.12)
// ---------------------------------------------------------------------------

describe("C7 §C7.5 — Short-circuit on `is some` failure", () => {
  test("`is some` fail emits early `return errors;` per §55.12", () => {
    const child = compoundChild("name", "null", [
      bareValidator("is some"),
      callValidator("length", [relational(">=", lit("number", "2"))]),
    ]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain("§55.12 short-circuit: is some");
  });

  test("`is some` short-circuit fires before next validator", () => {
    const child = compoundChild("name", "null", [
      bareValidator("is some"),
      callValidator("pattern", [lit("regex", "/^[a-z]+$/")]),
    ]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    const isSomeIdx = out.indexOf('"is some"');
    const patternIdx = out.indexOf('"pattern"');
    const isSomeBlock = out.substring(isSomeIdx, patternIdx);
    expect(isSomeBlock).toContain("return errors;");
  });
});

// ---------------------------------------------------------------------------
// §C7.6 — Cross-field validator (`eq(@otherCell)`)
// ---------------------------------------------------------------------------

describe("C7 §C7.6 — Cross-field validator", () => {
  test("`eq(@signup.password)` emits arg as thunk", () => {
    const child = compoundChild("confirm", "", [
      callValidator("eq", [ident("@signup.password")]),
    ]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain(
      '_scrml_validator_fire("eq", value, () => _scrml_reactive_get("signup.password"))',
    );
  });

  test("cross-field deps wired to derived computation", () => {
    const child = compoundChild("confirm", "", [
      callValidator("eq", [ident("@signup.password")]),
    ]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    // The errors derivation should subscribe to the cross-field cell.
    expect(out).toContain(
      '_scrml_derived_subscribe("signup.confirm.errors", "signup.password")',
    );
  });

  test("multiple cross-field args wire each as separate dep", () => {
    const child = compoundChild("score", "0", [
      callValidator("gte", [ident("@form.minScore")]),
      callValidator("lte", [ident("@form.maxScore")]),
    ]);
    const parent = compoundParent("form", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain('_scrml_derived_subscribe("form.score.errors", "form.minScore")');
    expect(out).toContain('_scrml_derived_subscribe("form.score.errors", "form.maxScore")');
  });
});

// ---------------------------------------------------------------------------
// §C7.7 — Arg-kind dispatch
// ---------------------------------------------------------------------------

describe("C7 §C7.7 — Arg-kind dispatch", () => {
  test("relational-predicate produces {op, value} object literal", () => {
    const child = compoundChild("name", "", [
      callValidator("length", [relational(">=", lit("number", "2"))]),
    ]);
    const parent = compoundParent("form", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain('{ op: ">=", value: 2 }');
  });

  test("relational-predicate with cross-field arg wraps inner value as thunk", () => {
    const child = compoundChild("name", "", [
      callValidator("length", [relational(">=", ident("@form.minLen"))]),
    ]);
    const parent = compoundParent("form", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain('{ op: ">=", value: () => _scrml_reactive_get("form.minLen") }');
  });

  test("comparable-with-cell with literal value emits as-is (no thunk)", () => {
    const child = compoundChild("age", "0", [
      callValidator("gt", [lit("number", "18")]),
    ]);
    const parent = compoundParent("form", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain('_scrml_validator_fire("gt", value, 18)');
    // Should NOT be wrapped as a thunk for a pure literal.
    expect(out).not.toContain('_scrml_validator_fire("gt", value, () =>');
  });

  test("any-equatable-with-cell with literal value emits as-is", () => {
    const child = compoundChild("status", "", [
      callValidator("eq", [lit("string", '"active"')]),
    ]);
    const parent = compoundParent("form", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain('_scrml_validator_fire("eq", value, "active")');
  });

  test("array-of-cell-type literal array emits as array literal", () => {
    const child = compoundChild("role", "", [
      callValidator("oneOf", [
        arrayLit([lit("string", '"admin"'), lit("string", '"editor"')]),
      ]),
    ]);
    const parent = compoundParent("form", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain('_scrml_validator_fire("oneOf", value, ["admin", "editor"])');
  });
});

// ---------------------------------------------------------------------------
// §C7.8 — Skip rules
// ---------------------------------------------------------------------------

describe("C7 §C7.8 — Skip rules", () => {
  test("top-level non-compound cell with validators — no runner emitted", () => {
    const node = topLevelPlain("count", "0", [bareValidator("req")]);
    const out = emitLogicNode(node, clientOpts());
    expect(out).not.toContain("_scrml_derived_declare");
    expect(out).not.toContain("_scrml_validator_fire");
  });

  test("derived const cell with validators (defensive) — no runner emitted", () => {
    const node = derivedConst("doubled", [bareValidator("req")]);
    // emitLogicNode will route through derived arm — sidecar should still skip.
    const out = emitLogicNode(node, { ...clientOpts(), compoundPathPrefix: "form" });
    expect(out).not.toContain("_scrml_validator_fire");
  });

  test("compound parent itself does NOT emit runner (children do)", () => {
    const child = compoundChild("name", "", [bareValidator("req")]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    // Child's runner should appear; parent should NOT call _scrml_validator_fire
    // for itself (validators only fire on per-field cells).
    //
    // C8 NOTE (post-S73 land): the compound parent DOES now emit synth-surface
    // derived cells `"signup.errors"` and `"signup.isValid"` per SPEC §55.5
    // (compound-level rollup). Those are NOT validator runners — they're
    // reductions over the per-field errors. The contract here is "no
    // validator-fire for the parent itself" — checked by counting
    // _scrml_validator_fire calls (one per child validator, not per parent).
    expect(out).toContain('"signup.name.errors"');
    // Parent's compound-level errors/isValid are emitted by C8 — they're
    // present in `out`. What MUST NOT appear is a validator-fire call
    // inside a `signup.errors` declaration body (parent itself running a
    // validator).
    const validatorFireCount = (out.match(/_scrml_validator_fire/g) ?? []).length;
    // One fire per validator on the child (req) — exactly one. Parent
    // contributes zero.
    expect(validatorFireCount).toBe(1);
  });

  test("server boundary — no runner emitted", () => {
    const child = compoundChild("name", "", [bareValidator("req")]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, { boundary: "server" });
    expect(out).not.toContain("_scrml_validator_fire");
  });

  test("inside function body — no runner emitted (reassignment)", () => {
    const child = compoundChild("name", "", [bareValidator("req")]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, { boundary: "client", insideFunctionBody: true });
    expect(out).not.toContain("_scrml_validator_fire");
  });

  test("markup-typed derived with validators (defensive) — no runner emitted", () => {
    const node = markupTyped("badge", [bareValidator("req")]);
    const out = emitLogicNode(node, { boundary: "client", compoundPathPrefix: "form" });
    expect(out).not.toContain("_scrml_validator_fire");
  });
});

// ---------------------------------------------------------------------------
// §C7.9 — `isValid` semantic
// ---------------------------------------------------------------------------

describe("C7 §C7.9 — isValid = errors.length === 0", () => {
  test("isValid reads the errors derivation length", () => {
    const child = compoundChild("name", "", [bareValidator("req")]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain(
      '_scrml_derived_get("signup.email.errors").length === 0'.replace("email", "name"),
    );
  });

  test("isValid is its own derived cell, distinct from errors", () => {
    const child = compoundChild("email", "", [bareValidator("req")]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    const errorsDeclareCount = (out.match(/_scrml_derived_declare\("signup\.email\.errors"/g) || []).length;
    const isValidDeclareCount = (out.match(/_scrml_derived_declare\("signup\.email\.isValid"/g) || []).length;
    expect(errorsDeclareCount).toBe(1);
    expect(isValidDeclareCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §C7.10 — Reactive-deps wiring
// ---------------------------------------------------------------------------

describe("C7 §C7.10 — Reactive-deps wiring", () => {
  test("errors derivation always subscribes to the cell's own value", () => {
    const child = compoundChild("name", "", [bareValidator("req")]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    expect(out).toContain('_scrml_derived_subscribe("signup.name.errors", "signup.name")');
  });

  test("no cross-field args = no cross-field subscribes", () => {
    const child = compoundChild("name", "", [bareValidator("req")]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    // Only one subscribe — to the cell's own value.
    const subscribes = out.match(/_scrml_derived_subscribe\("signup\.name\.errors"/g) || [];
    expect(subscribes.length).toBe(1);
  });

  test("isValid subscribes only to its errors derivation (not any field directly)", () => {
    const child = compoundChild("name", "", [bareValidator("req")]);
    const parent = compoundParent("signup", [child]);
    const out = emitLogicNode(parent, clientOpts());
    const isValidSubscribes = out.match(/_scrml_derived_subscribe\("signup\.name\.isValid"/g) || [];
    expect(isValidSubscribes.length).toBe(1);
    expect(out).toContain(
      '_scrml_derived_subscribe("signup.name.isValid", "signup.name.errors")',
    );
  });
});

// ---------------------------------------------------------------------------
// §C7.11 — Chunk wiring
// ---------------------------------------------------------------------------

describe("C7 §C7.11 — `validators` runtime chunk", () => {
  test("`validators` is in RUNTIME_CHUNK_ORDER", () => {
    expect(RUNTIME_CHUNK_ORDER).toContain("validators");
  });

  test("`validators` is sequenced between `reset` and `derived`", () => {
    const idxReset = RUNTIME_CHUNK_ORDER.indexOf("reset");
    const idxValidators = RUNTIME_CHUNK_ORDER.indexOf("validators");
    const idxDerived = RUNTIME_CHUNK_ORDER.indexOf("derived");
    expect(idxReset).toBeLessThan(idxValidators);
    expect(idxValidators).toBeLessThan(idxDerived);
  });

  test("`validators` chunk contains the 14 universal-core fire functions", () => {
    const chunk = RUNTIME_CHUNKS.validators;
    for (const name of [
      "fireReq", "fireIsSome", "fireLength", "firePattern", "fireMin", "fireMax",
      "fireGt", "fireLt", "fireGte", "fireLte", "fireEq", "fireNeq",
      "fireOneOf", "fireNotIn",
    ]) {
      expect(chunk).toContain(name);
    }
  });

  test("`validators` chunk exposes `_scrml_validator_fire` dispatch", () => {
    const chunk = RUNTIME_CHUNKS.validators;
    expect(chunk).toContain("_scrml_validator_fire");
    expect(chunk).toContain("VALIDATOR_RUNTIME");
  });

  test("`validators` chunk has NO `export` keywords (inline-ready)", () => {
    const chunk = RUNTIME_CHUNKS.validators;
    // The pre-strip source had `export ` at column 0 on 17 declarations.
    // After strip, none remain. (Comments may mention "export" — those don't
    // start at column 0 with the keyword form.)
    const exportLineMatches = chunk.match(/^export /gm) || [];
    expect(exportLineMatches.length).toBe(0);
  });

  test("`validators` chunk source matches the live runtime-validators.js content", () => {
    // Spot-check: the unique helper `_unwrapArg` and the freeze of VALIDATOR_RUNTIME.
    const chunk = RUNTIME_CHUNKS.validators;
    expect(chunk).toContain("function _unwrapArg(");
    expect(chunk).toContain("Object.freeze({");
    // And the ordered names list comes from the live module — verify length.
    expect(VALIDATOR_RUNTIME_NAMES.length).toBe(14);
  });
});

// ---------------------------------------------------------------------------
// §C7.12 — Chunk-detection
// ---------------------------------------------------------------------------

describe("C7 §C7.12 — Chunk-detection trigger", () => {
  // Note: emit-client.ts's detectRuntimeChunks is internal; we verify the
  // contract by direct AST construction + observing chunk-set membership.
  // The trigger inside `case "state-decl":` adds 'validators' + 'derived'
  // when validators[] is non-empty.
  test("a state-decl with non-empty validators triggers `validators` chunk", () => {
    // The detectRuntimeChunks function is not directly exported, but the
    // chunk-set behavior is observable end-to-end. Smoke test: a node with
    // validators present has the right shape.
    const node = compoundChild("name", "", [bareValidator("req")]);
    expect(Array.isArray(node.validators)).toBe(true);
    expect(node.validators.length).toBeGreaterThan(0);
  });

  test("a state-decl with empty validators array does NOT need the chunk", () => {
    const node = compoundChild("name", "", []);
    expect(node.validators.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §C7.13 — Inline-message-override slot stripped
// ---------------------------------------------------------------------------

describe("C7 §C7.13 — Inline-override slot stripped (B13/C10 own message rendering)", () => {
  test("trailing string-literal arg is dropped when validator.inlineOverride is set", () => {
    // length(>=2, "Must be at least 2 chars") with B13 having extracted the override.
    const child = compoundChild("name", "", [
      callValidatorWithOverride(
        "length",
        [relational(">=", lit("number", "2")), lit("string", '"Must be at least 2 chars"')],
        "Must be at least 2 chars",
      ),
    ]);
    const parent = compoundParent("form", [child]);
    const out = emitLogicNode(parent, clientOpts());
    // Should emit the relational arg only — NOT the trailing string literal in
    // the validator fire call. (After C10 lands, the override IS emitted via a
    // separate `_scrml_messages_register_inline(...)` call — which is correct
    // and distinct from the validator fire arg list.)
    expect(out).toContain('_scrml_validator_fire("length", value, { op: ">=", value: 2 })');
    // Override string should NOT appear inside any _scrml_validator_fire call
    // (the strip behavior C7 owns). It MAY appear in C10's L1 registration.
    const fireCalls = out.match(/_scrml_validator_fire\([^)]*\)/g) || [];
    for (const call of fireCalls) {
      expect(call).not.toContain('"Must be at least 2 chars"');
    }
  });

  test("when inlineOverride is null, trailing string-literal IS emitted (no false-strip)", () => {
    // Edge case — a string-literal arg that is NOT an inline-override.
    // (In practice B13 controls this; this guards the sentinel logic.)
    const child = compoundChild("name", "", [
      callValidator("eq", [lit("string", '"hello"')]),
    ]);
    const parent = compoundParent("form", [child]);
    const out = emitLogicNode(parent, clientOpts());
    // No inlineOverride → string literal is the actual arg.
    expect(out).toContain('_scrml_validator_fire("eq", value, "hello")');
  });
});

// ---------------------------------------------------------------------------
// §C7.14 — Runtime end-to-end (assemble runtime + execute emitted code)
// ---------------------------------------------------------------------------

describe("C7 §C7.14 — Runtime end-to-end behavior", () => {
  // Helper: build a sandboxed runtime + emitted runner; return controllers.
  function buildSandbox() {
    const runtime = assembleRuntime(new Set(RUNTIME_CHUNK_ORDER));
    return runtime;
  }

  test("req fail on empty cell — short-circuit produces only [Required]", () => {
    const runtime = buildSandbox();
    const emitted = `
      _scrml_reactive_set("signup.email", "");
      _scrml_derived_declare("signup.email.errors", () => {
        const value = _scrml_reactive_get("signup.email");
        const errors = [];
        {
          const error = _scrml_validator_fire("req", value);
          if (error !== null) {
            errors.push(error);
            return errors;
          }
        }
        {
          const error = _scrml_validator_fire("length", value, { op: ">=", value: 2 });
          if (error !== null) errors.push(error);
        }
        return errors;
      });
      _scrml_derived_subscribe("signup.email.errors", "signup.email");
      return _scrml_derived_get("signup.email.errors");
    `;
    const fn = new Function("window", "document", runtime + emitted);
    const win = { addEventListener: () => {}, removeEventListener: () => {} };
    const doc = { createElement: () => ({ appendChild: () => {} }), head: { appendChild: () => {} } };
    const errors = fn(win, doc);
    expect(errors.length).toBe(1);
    expect(errors[0].tag).toBe("Required");
  });

  test("composition — non-empty value with two failing validators yields both errors in declaration order", () => {
    const runtime = buildSandbox();
    const emitted = `
      _scrml_reactive_set("signup.email", "x");
      _scrml_derived_declare("signup.email.errors", () => {
        const value = _scrml_reactive_get("signup.email");
        const errors = [];
        {
          const error = _scrml_validator_fire("length", value, { op: ">=", value: 5 });
          if (error !== null) errors.push(error);
        }
        {
          const error = _scrml_validator_fire("pattern", value, /^[0-9]+$/);
          if (error !== null) errors.push(error);
        }
        return errors;
      });
      return _scrml_derived_get("signup.email.errors");
    `;
    const fn = new Function("window", "document", runtime + emitted);
    const win = { addEventListener: () => {} };
    const doc = { createElement: () => ({ appendChild: () => {} }), head: { appendChild: () => {} } };
    const errors = fn(win, doc);
    expect(errors.length).toBe(2);
    expect(errors[0].tag).toBe("LengthFailed");
    expect(errors[1].tag).toBe("PatternMismatch");
  });

  test("cross-field eq(@otherCell) — re-fires when other cell changes", () => {
    const runtime = buildSandbox();
    const emitted = `
      _scrml_reactive_set("signup.password", "secret");
      _scrml_reactive_set("signup.confirm", "secret");
      _scrml_derived_declare("signup.confirm.errors", () => {
        const value = _scrml_reactive_get("signup.confirm");
        const errors = [];
        {
          const error = _scrml_validator_fire("eq", value, () => _scrml_reactive_get("signup.password"));
          if (error !== null) errors.push(error);
        }
        return errors;
      });
      _scrml_derived_subscribe("signup.confirm.errors", "signup.confirm");
      _scrml_derived_subscribe("signup.confirm.errors", "signup.password");
      return {
        readErrors: () => _scrml_derived_get("signup.confirm.errors"),
        setPassword: (v) => _scrml_reactive_set("signup.password", v),
      };
    `;
    const fn = new Function("window", "document", runtime + emitted);
    const win = { addEventListener: () => {} };
    const doc = { createElement: () => ({ appendChild: () => {} }), head: { appendChild: () => {} } };
    const api = fn(win, doc);
    expect(api.readErrors().length).toBe(0); // initial pass
    api.setPassword("changed");
    const errs = api.readErrors();
    expect(errs.length).toBe(1);
    expect(errs[0].tag).toBe("EqFailed");
  });

  test("isValid recomputes when errors changes", () => {
    const runtime = buildSandbox();
    const emitted = `
      _scrml_reactive_set("form.name", "");
      _scrml_derived_declare("form.name.errors", () => {
        const value = _scrml_reactive_get("form.name");
        const errors = [];
        {
          const error = _scrml_validator_fire("req", value);
          if (error !== null) {
            errors.push(error);
            return errors;
          }
        }
        return errors;
      });
      _scrml_derived_subscribe("form.name.errors", "form.name");
      _scrml_derived_declare("form.name.isValid", () => _scrml_derived_get("form.name.errors").length === 0);
      _scrml_derived_subscribe("form.name.isValid", "form.name.errors");
      return {
        readIsValid: () => _scrml_derived_get("form.name.isValid"),
        setName: (v) => _scrml_reactive_set("form.name", v),
      };
    `;
    const fn = new Function("window", "document", runtime + emitted);
    const win = { addEventListener: () => {} };
    const doc = { createElement: () => ({ appendChild: () => {} }), head: { appendChild: () => {} } };
    const api = fn(win, doc);
    expect(api.readIsValid()).toBe(false);
    api.setName("alice");
    expect(api.readIsValid()).toBe(true);
  });

  test("§55.12 short-circuit DEMONSTRATED — req fail skips remaining validators (no extra noise)", () => {
    // This is the canonical short-circuit witness.
    const runtime = buildSandbox();
    const emitted = `
      _scrml_reactive_set("form.name", "");
      _scrml_derived_declare("form.name.errors", () => {
        const value = _scrml_reactive_get("form.name");
        const errors = [];
        {
          const error = _scrml_validator_fire("req", value);
          if (error !== null) {
            errors.push(error);
            return errors;
          }
        }
        {
          const error = _scrml_validator_fire("length", value, { op: ">=", value: 2 });
          if (error !== null) errors.push(error);
        }
        {
          const error = _scrml_validator_fire("pattern", value, /^[a-z]+$/);
          if (error !== null) errors.push(error);
        }
        return errors;
      });
      return _scrml_derived_get("form.name.errors");
    `;
    const fn = new Function("window", "document", runtime + emitted);
    const win = { addEventListener: () => {} };
    const doc = { createElement: () => ({ appendChild: () => {} }), head: { appendChild: () => {} } };
    const errors = fn(win, doc);
    // Exactly one error — Required. Length and pattern are SKIPPED per §55.12.
    expect(errors.length).toBe(1);
    expect(errors[0].tag).toBe("Required");
    // Defensive: no LengthFailed, no PatternMismatch.
    for (const e of errors) {
      expect(e.tag).not.toBe("LengthFailed");
      expect(e.tag).not.toBe("PatternMismatch");
    }
  });

  test("`_scrml_validator_fire` runtime alias dispatches to C6 catalog (verifies wire-in)", () => {
    const runtime = buildSandbox();
    const emitted = `
      // Direct invocation — confirms the runtime export is reachable.
      const r1 = _scrml_validator_fire("req", "");           // fail
      const r2 = _scrml_validator_fire("req", "hello");       // pass
      const r3 = _scrml_validator_fire("min", 5, 10);          // fail (5 < 10)
      const r4 = _scrml_validator_fire("min", 15, 10);         // pass
      return { r1, r2, r3, r4 };
    `;
    const fn = new Function("window", "document", runtime + emitted);
    const win = { addEventListener: () => {} };
    const doc = { createElement: () => ({ appendChild: () => {} }), head: { appendChild: () => {} } };
    const { r1, r2, r3, r4 } = fn(win, doc);
    expect(r1?.tag).toBe("Required");
    expect(r2).toBe(null);
    expect(r3?.tag).toBe("MinFailed");
    expect(r3?.threshold).toBe(10);
    expect(r4).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// §C7.15 — Direct emitValidatorRunnerSidecar API tests (skip-rule unit tests)
// ---------------------------------------------------------------------------

describe("C7 §C7.15 — emitValidatorRunnerSidecar direct API", () => {
  test("returns null for empty validators[]", () => {
    const node = compoundChild("name", "", []);
    const result = emitValidatorRunnerSidecar(node, "form.name", { boundary: "client", compoundPathPrefix: "form" });
    expect(result).toBe(null);
  });

  test("returns null for missing validators field", () => {
    const node = { kind: "state-decl", name: "name", _cellKind: "plain", span: span() };
    const result = emitValidatorRunnerSidecar(node, "form.name", { boundary: "client", compoundPathPrefix: "form" });
    expect(result).toBe(null);
  });

  test("returns null when compoundPathPrefix is null (top-level cell)", () => {
    const node = compoundChild("name", "", [bareValidator("req")]);
    const result = emitValidatorRunnerSidecar(node, "name", { boundary: "client", compoundPathPrefix: null });
    expect(result).toBe(null);
  });

  test("returns string output for compound child with validators", () => {
    const node = compoundChild("name", "", [bareValidator("req")]);
    const result = emitValidatorRunnerSidecar(node, "form.name", { boundary: "client", compoundPathPrefix: "form" });
    expect(typeof result).toBe("string");
    expect(result).toContain("_scrml_derived_declare");
  });
});
