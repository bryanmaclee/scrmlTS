/**
 * c9-cross-field-deps.test.js — A1c Step C9 unit tests
 *
 * Cross-field validator dependency wiring (SPEC §55.11 L14).
 *
 * These tests verify that validators referencing OTHER cells via predicate
 * args wire reactive subscriptions to the EXACT cross-field cell — not (as
 * the pre-C9 implementation did) to the COMPOUND PARENT containing that
 * cell. End-to-end runtime correctness is preserved via transitive dirty
 * propagation in both cases, but C9 tightens the precision so validators
 * re-fire on the specific dep, not on every change to any sibling field.
 *
 * Sections:
 *   §C9.0  forEachQualifiedCellRef* walker — pure helper coverage
 *   §C9.1  Real-parser shape: emit-validators wires precise qualified-path subscribe
 *   §C9.2  Real-parser shape: emit-validators emits direct qualified-path read
 *   §C9.3  Multiple cross-field args wire each precisely (no over/under-subscribe)
 *   §C9.4  Method-call call-form: gte(@startDate.plus(1, "day")) — receiver chain only
 *   §C9.5  Binary expr: lt(@maxAge - 1) — operand chain lifted
 *   §C9.6  Array literal: oneOf([@form.allowed]) — element chain lifted
 *   §C9.7  Top-level cell ref (back-compat) — bare ident still works
 *   §C9.8  Relational predicate inner expr: length(>=@minLen) — chain lifted
 *   §C9.9  Runtime end-to-end — real parser → emit → execute → assert re-fire
 *
 * NOT IN SCOPE:
 *   - B10 dep-graph (validator-reads edge) — same root-cause limitation, but
 *     the fix would require qualified-path indexing in `reactiveVarNodeIds`,
 *     which is architectural; tracked in SURVEY §6 item 4 as deferred.
 *   - 4-level error message resolution (C10).
 *   - <errors of=...> element (C11).
 */

import { describe, test, expect } from "bun:test";
import { emitValidatorRunnerSidecar } from "../../src/codegen/emit-validators.ts";
import {
  parseValidatorArg,
  forEachQualifiedCellRefInExprNode,
  forEachQualifiedCellRefInValidatorArg,
  forEachQualifiedCellRefInValidators,
} from "../../src/validator-arg-parser.ts";
import { SCRML_RUNTIME } from "../../src/runtime-template.js";

// ---------------------------------------------------------------------------
// Helpers — minimal AST builders + parse-real-arg adapter.
// ---------------------------------------------------------------------------

const SPAN = { start: 0, end: 0, line: 1, col: 1, file: "<probe>" };

function parseArg(name, raw, slotIndex = 0) {
  return parseValidatorArg(name, raw, SPAN, "<probe>", 0, slotIndex);
}

function compoundChild(name, init, validators) {
  return {
    kind: "state-decl",
    name,
    init,
    initExpr: { kind: "lit", litType: "string", raw: JSON.stringify(init), value: init, span: SPAN },
    shape: "plain",
    structuralForm: true,
    isConst: false,
    _cellKind: "plain",
    validators: validators || [],
    span: SPAN,
  };
}

function callValidator(name, args) {
  return { name, args, span: SPAN };
}

function bareValidator(name) {
  return { name, args: null, span: SPAN };
}

function clientOpts(prefix) {
  return {
    boundary: "client",
    insideFunctionBody: false,
    compoundPathPrefix: prefix,
    encodingCtx: null,
    derivedNames: new Set(),
  };
}

function emitFor(prefix, fieldName, validators) {
  const node = compoundChild(fieldName, "", validators);
  return emitValidatorRunnerSidecar(node, `${prefix}.${fieldName}`, clientOpts(prefix));
}

// ---------------------------------------------------------------------------
// §C9.0 — forEachQualifiedCellRef* walker (pure helper)
// ---------------------------------------------------------------------------

describe("C9 §C9.0 — qualified-cell-ref walker (pure)", () => {
  test("bare @ident yields qualified path = name without @", () => {
    const arg = parseArg("eq", "@password");
    const out = [];
    forEachQualifiedCellRefInValidatorArg(arg, (p) => out.push(p));
    expect(out).toEqual(["password"]);
  });

  test("@compound.field MemberExpr yields full qualified path", () => {
    const arg = parseArg("eq", "@signup.password");
    const out = [];
    forEachQualifiedCellRefInValidatorArg(arg, (p) => out.push(p));
    expect(out).toEqual(["signup.password"]);
  });

  test("multi-level @a.b.c chain yields fully-qualified path", () => {
    const arg = parseArg("eq", "@form.address.zip");
    const out = [];
    forEachQualifiedCellRefInValidatorArg(arg, (p) => out.push(p));
    expect(out).toEqual(["form.address.zip"]);
  });

  test("non-@ ident yields no path (not a cell ref)", () => {
    const arg = parseArg("eq", "myFunction");
    const out = [];
    forEachQualifiedCellRefInValidatorArg(arg, (p) => out.push(p));
    expect(out).toEqual([]);
  });

  test("literal yields no path", () => {
    const arg = parseArg("eq", "\"some value\"");
    const out = [];
    forEachQualifiedCellRefInValidatorArg(arg, (p) => out.push(p));
    expect(out).toEqual([]);
  });

  test("binary expr `@maxAge - 1` lifts left operand chain", () => {
    const arg = parseArg("lt", "@maxAge - 1");
    const out = [];
    forEachQualifiedCellRefInValidatorArg(arg, (p) => out.push(p));
    expect(out).toEqual(["maxAge"]);
  });

  test("binary expr `@a + @b.c` lifts both chains", () => {
    const arg = parseArg("eq", "@a + @b.c");
    const out = new Set();
    forEachQualifiedCellRefInValidatorArg(arg, (p) => out.add(p));
    expect(out.has("a")).toBe(true);
    expect(out.has("b.c")).toBe(true);
    expect(out.size).toBe(2);
  });

  test("array `[@form.a, @form.b]` lifts each element chain", () => {
    const arg = parseArg("oneOf", "[@form.a, @form.b]");
    const out = new Set();
    forEachQualifiedCellRefInValidatorArg(arg, (p) => out.add(p));
    expect(out.has("form.a")).toBe(true);
    expect(out.has("form.b")).toBe(true);
    expect(out.size).toBe(2);
  });

  test("call expr `@startDate.plus(1, \"day\")` lifts receiver chain only — method name is NOT part of the cell-ref path", () => {
    const arg = parseArg("gte", "@startDate.plus(1, \"day\")");
    const out = [];
    forEachQualifiedCellRefInValidatorArg(arg, (p) => out.push(p));
    expect(out).toEqual(["startDate"]);
  });

  test("call expr with @compound.field receiver `@form.startDate.plus(1, \"day\")` lifts full receiver chain", () => {
    const arg = parseArg("gte", "@form.startDate.plus(1, \"day\")");
    const out = [];
    forEachQualifiedCellRefInValidatorArg(arg, (p) => out.push(p));
    expect(out).toEqual(["form.startDate"]);
  });

  test("relational predicate `>= @minLen` lifts the rhs chain", () => {
    const arg = parseArg("length", ">= @minLen", 0);
    const out = [];
    forEachQualifiedCellRefInValidatorArg(arg, (p) => out.push(p));
    expect(out).toEqual(["minLen"]);
  });

  test("relational predicate `>= @form.minLen` lifts the rhs compound chain", () => {
    const arg = parseArg("length", ">= @form.minLen", 0);
    const out = [];
    forEachQualifiedCellRefInValidatorArg(arg, (p) => out.push(p));
    expect(out).toEqual(["form.minLen"]);
  });

  test("forEachQualifiedCellRefInValidators iterates a list of validators", () => {
    const validators = [
      callValidator("gte", [parseArg("gte", "@form.minScore")]),
      callValidator("lte", [parseArg("lte", "@form.maxScore")]),
      bareValidator("req"), // no args — skipped
    ];
    const out = new Set();
    forEachQualifiedCellRefInValidators(validators, (p) => out.add(p));
    expect(out.has("form.minScore")).toBe(true);
    expect(out.has("form.maxScore")).toBe(true);
    expect(out.size).toBe(2);
  });

  test("forEachQualifiedCellRefInExprNode passes through to the standalone walker", () => {
    const arg = parseArg("eq", "@signup.password");
    const out = [];
    forEachQualifiedCellRefInExprNode(arg, (p) => out.push(p));
    expect(out).toEqual(["signup.password"]);
  });
});

// ---------------------------------------------------------------------------
// §C9.1 — emit-validators wires precise qualified-path subscribe (real parse)
// ---------------------------------------------------------------------------

describe("C9 §C9.1 — precise subscribe key (real-parse shape)", () => {
  test("`<confirm req eq(@signup.password)>` subscribes to `signup.password`, NOT `signup`", () => {
    // Real-parse shape: `eq(@signup.password)` → MemberExpr(@signup, "password").
    // Pre-C9: subscribe target was "signup" (the @-base after slice). Post-C9:
    // subscribe target is the qualified cell-ref path "signup.password".
    const arg = parseArg("eq", "@signup.password");
    const out = emitFor("signup", "confirm", [
      bareValidator("req"),
      callValidator("eq", [arg]),
    ]);

    // Precise subscribe.
    expect(out).toContain('_scrml_derived_subscribe("signup.confirm.errors", "signup.password")');
    // No spurious subscribe to the bare compound parent.
    expect(out).not.toContain('_scrml_derived_subscribe("signup.confirm.errors", "signup")');
    // Self-value subscribe still wired.
    expect(out).toContain('_scrml_derived_subscribe("signup.confirm.errors", "signup.confirm")');
  });

  test("top-level @password (bare ident) still subscribes to `password` (back-compat)", () => {
    const arg = parseArg("eq", "@password");
    const out = emitFor("signup", "confirm", [callValidator("eq", [arg])]);
    expect(out).toContain('_scrml_derived_subscribe("signup.confirm.errors", "password")');
  });

  test("multi-level @form.address.zip subscribes to fully-qualified path", () => {
    const arg = parseArg("eq", "@form.address.zip");
    const out = emitFor("form", "shipZip", [callValidator("eq", [arg])]);
    expect(out).toContain('_scrml_derived_subscribe("form.shipZip.errors", "form.address.zip")');
  });
});

// ---------------------------------------------------------------------------
// §C9.2 — emit-validators emits direct qualified-path read (real parse)
// ---------------------------------------------------------------------------

describe("C9 §C9.2 — direct qualified-path read in thunk", () => {
  test("eq(@signup.password) thunk emits `_scrml_reactive_get(\"signup.password\")` directly", () => {
    const arg = parseArg("eq", "@signup.password");
    const out = emitFor("signup", "confirm", [callValidator("eq", [arg])]);
    // Post-C9: direct qualified-path read. (Pre-C9 emitted `_scrml_reactive_get("signup").password`.)
    expect(out).toContain('_scrml_reactive_get("signup.password")');
    expect(out).not.toContain('_scrml_reactive_get("signup").password');
  });

  test("multi-level chain emits direct qualified-path read", () => {
    const arg = parseArg("eq", "@form.address.zip");
    const out = emitFor("form", "shipZip", [callValidator("eq", [arg])]);
    expect(out).toContain('_scrml_reactive_get("form.address.zip")');
  });

  test("top-level @password unchanged (already direct)", () => {
    const arg = parseArg("eq", "@password");
    const out = emitFor("signup", "confirm", [callValidator("eq", [arg])]);
    expect(out).toContain('_scrml_reactive_get("password")');
  });
});

// ---------------------------------------------------------------------------
// §C9.3 — multiple cross-field args wire each precisely
// ---------------------------------------------------------------------------

describe("C9 §C9.3 — multiple cross-field args (each precise)", () => {
  test("score with `gte(@form.minScore)` + `lte(@form.maxScore)` wires both qualified paths", () => {
    const out = emitFor("form", "score", [
      callValidator("gte", [parseArg("gte", "@form.minScore")]),
      callValidator("lte", [parseArg("lte", "@form.maxScore")]),
    ]);
    expect(out).toContain('_scrml_derived_subscribe("form.score.errors", "form.minScore")');
    expect(out).toContain('_scrml_derived_subscribe("form.score.errors", "form.maxScore")');
    // Should NOT subscribe to compound parent (not precise).
    expect(out).not.toMatch(/_scrml_derived_subscribe\("form\.score\.errors", "form"\)/);
  });

  test("dedup: same dep referenced twice across validators → single subscribe", () => {
    const out = emitFor("form", "field", [
      callValidator("gt", [parseArg("gt", "@form.lower")]),
      callValidator("lt", [parseArg("lt", "@form.lower")]),
    ]);
    const matches = out.match(/_scrml_derived_subscribe\("form\.field\.errors", "form\.lower"\)/g) || [];
    expect(matches.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §C9.4 — method-call call-form: receiver chain only
// ---------------------------------------------------------------------------

describe("C9 §C9.4 — method-call (`@x.method(...)`) — receiver chain only", () => {
  test("gte(@startDate.plus(1, \"day\")) subscribes to `startDate` (top-level), not `startDate.plus`", () => {
    const arg = parseArg("gte", "@startDate.plus(1, \"day\")");
    const out = emitFor("form", "endDate", [callValidator("gte", [arg])]);
    expect(out).toContain('_scrml_derived_subscribe("form.endDate.errors", "startDate")');
    expect(out).not.toMatch(/_scrml_derived_subscribe\([^)]+, "startDate\.plus"\)/);
  });

  test("gte(@form.startDate.plus(1, \"day\")) subscribes to `form.startDate` (full receiver chain)", () => {
    const arg = parseArg("gte", "@form.startDate.plus(1, \"day\")");
    const out = emitFor("form", "endDate", [callValidator("gte", [arg])]);
    expect(out).toContain('_scrml_derived_subscribe("form.endDate.errors", "form.startDate")');
    expect(out).not.toMatch(/_scrml_derived_subscribe\([^)]+, "form\.startDate\.plus"\)/);
  });
});

// ---------------------------------------------------------------------------
// §C9.5 — binary expression: operand chain lifted
// ---------------------------------------------------------------------------

describe("C9 §C9.5 — binary expr operand chains", () => {
  test("lt(@maxAge - 1) subscribes to `maxAge`", () => {
    const arg = parseArg("lt", "@maxAge - 1");
    const out = emitFor("form", "age", [callValidator("lt", [arg])]);
    expect(out).toContain('_scrml_derived_subscribe("form.age.errors", "maxAge")');
  });

  test("eq(@a + @b.c) wires both operand chains", () => {
    const arg = parseArg("eq", "@a + @b.c");
    const out = emitFor("form", "field", [callValidator("eq", [arg])]);
    expect(out).toContain('_scrml_derived_subscribe("form.field.errors", "a")');
    expect(out).toContain('_scrml_derived_subscribe("form.field.errors", "b.c")');
  });
});

// ---------------------------------------------------------------------------
// §C9.6 — array literal: each element chain lifted
// ---------------------------------------------------------------------------

describe("C9 §C9.6 — array-of-cell-refs (oneOf)", () => {
  test("oneOf([@form.allowed, @form.altAllowed]) wires each element", () => {
    const arg = parseArg("oneOf", "[@form.allowed, @form.altAllowed]");
    const out = emitFor("form", "role", [callValidator("oneOf", [arg])]);
    expect(out).toContain('_scrml_derived_subscribe("form.role.errors", "form.allowed")');
    expect(out).toContain('_scrml_derived_subscribe("form.role.errors", "form.altAllowed")');
  });

  test("notIn([@bannedList]) wires the single element", () => {
    const arg = parseArg("notIn", "[@bannedList]");
    const out = emitFor("form", "username", [callValidator("notIn", [arg])]);
    expect(out).toContain('_scrml_derived_subscribe("form.username.errors", "bannedList")');
  });
});

// ---------------------------------------------------------------------------
// §C9.7 — back-compat: bare top-level @ident still works
// ---------------------------------------------------------------------------

describe("C9 §C9.7 — top-level @ident back-compat", () => {
  test("bare top-level @password still subscribes to `password`", () => {
    const arg = parseArg("eq", "@password");
    const out = emitFor("signup", "confirm", [callValidator("eq", [arg])]);
    expect(out).toContain('_scrml_derived_subscribe("signup.confirm.errors", "password")');
    // No spurious "signup" subscribe.
    expect(out).not.toMatch(/_scrml_derived_subscribe\("signup\.confirm\.errors", "signup"\)$/m);
  });
});

// ---------------------------------------------------------------------------
// §C9.8 — relational predicate inner expr
// ---------------------------------------------------------------------------

describe("C9 §C9.8 — relational predicate (`length(>=@minLen)`)", () => {
  test("length(>=@minLen) subscribes to `minLen`", () => {
    const arg = parseArg("length", ">= @minLen", 0);
    const out = emitFor("form", "name", [callValidator("length", [arg])]);
    expect(out).toContain('_scrml_derived_subscribe("form.name.errors", "minLen")');
  });

  test("length(>=@form.minLen) subscribes to `form.minLen`", () => {
    const arg = parseArg("length", ">= @form.minLen", 0);
    const out = emitFor("form", "name", [callValidator("length", [arg])]);
    expect(out).toContain('_scrml_derived_subscribe("form.name.errors", "form.minLen")');
  });

  test("length(>=@form.minLen) lowers inner read as direct qualified-path get", () => {
    const arg = parseArg("length", ">= @form.minLen", 0);
    const out = emitFor("form", "name", [callValidator("length", [arg])]);
    // The relational-predicate inner-value thunk should read the qualified path directly.
    expect(out).toContain('_scrml_reactive_get("form.minLen")');
    expect(out).not.toContain('_scrml_reactive_get("form").minLen');
  });
});

// ---------------------------------------------------------------------------
// §C9.9 — Runtime end-to-end (real parse → emit → execute → assert re-fire)
// ---------------------------------------------------------------------------

describe("C9 §C9.9 — runtime end-to-end (cross-field re-fire)", () => {
  function buildSandbox(emitted) {
    const setup = `
      _scrml_reactive_set("signup.password", "secret");
      _scrml_reactive_set("signup.confirm", "secret");

      _scrml_derived_declare("signup", () => ({ password: _scrml_reactive_get("signup.password"), confirm: _scrml_reactive_get("signup.confirm") }));
      _scrml_derived_subscribe("signup", "signup.password");
      _scrml_derived_subscribe("signup", "signup.confirm");

      ${emitted}

      return {
        readErrors: () => _scrml_derived_get("signup.confirm.errors"),
        readIsValid: () => _scrml_derived_get("signup.confirm.isValid"),
        setPassword: (v) => _scrml_reactive_set("signup.password", v),
        setConfirm: (v) => _scrml_reactive_set("signup.confirm", v),
      };
    `;
    const fn = new Function("window", "document", SCRML_RUNTIME + "\n" + setup);
    const win = { addEventListener: () => {} };
    const doc = { createElement: () => ({ appendChild: () => {}, remove: () => {} }), head: { appendChild: () => {} } };
    return fn(win, doc);
  }

  test("eq(@signup.password) fires when the cross-field cell changes", () => {
    const arg = parseArg("eq", "@signup.password");
    const emitted = emitFor("signup", "confirm", [callValidator("eq", [arg])]);
    const api = buildSandbox(emitted);
    expect(api.readErrors().length).toBe(0); // initial pass
    api.setPassword("different");
    const errs = api.readErrors();
    expect(errs.length).toBe(1);
    expect(errs[0].tag).toBe("EqFailed");
  });

  test("eq(@signup.password) does NOT fire when an unrelated sibling field changes (precision)", () => {
    // Add an unrelated sibling cell `signup.email` — must not trigger
    // re-fire on signup.confirm.errors. This is the precision win the
    // pre-C9 implementation didn't deliver (subscribed to compound parent).
    const arg = parseArg("eq", "@signup.password");
    const emitted = emitFor("signup", "confirm", [callValidator("eq", [arg])]);
    const setup = `
      _scrml_reactive_set("signup.password", "secret");
      _scrml_reactive_set("signup.confirm", "secret");
      _scrml_reactive_set("signup.email", "a@b.com");

      _scrml_derived_declare("signup", () => ({
        password: _scrml_reactive_get("signup.password"),
        confirm: _scrml_reactive_get("signup.confirm"),
        email: _scrml_reactive_get("signup.email"),
      }));
      _scrml_derived_subscribe("signup", "signup.password");
      _scrml_derived_subscribe("signup", "signup.confirm");
      _scrml_derived_subscribe("signup", "signup.email");

      ${emitted}

      let errorsRecomputeCount = 0;
      const _origDeclare = _scrml_derived_declare;

      return {
        readErrors: () => _scrml_derived_get("signup.confirm.errors"),
        getDirty: () => _scrml_derived_dirty["signup.confirm.errors"],
        setEmail: (v) => _scrml_reactive_set("signup.email", v),
        clearDirty: () => { _scrml_derived_get("signup.confirm.errors"); }, // forces evaluation, clears dirty
      };
    `;
    const fn = new Function("window", "document", SCRML_RUNTIME + "\n" + setup);
    const win = { addEventListener: () => {} };
    const doc = { createElement: () => ({ appendChild: () => {}, remove: () => {} }), head: { appendChild: () => {} } };
    const api = fn(win, doc);
    api.clearDirty();
    api.setEmail("x@y.com");
    // After setting the unrelated sibling, the cross-field validator's errors
    // derivation should NOT have been marked dirty.
    expect(api.getDirty()).toBe(false);
  });

  test("gte(@startDate.plus(1, \"day\")) — receiver chain re-fires on date change", () => {
    const arg = parseArg("gte", "@startDate.plus(1, \"day\")");
    const emitted = emitFor("form", "endDate", [callValidator("gte", [arg])]);
    const setup = `
      // Stub a Date-like value that has .plus(n, "day").
      _scrml_reactive_set("startDate", { plus: (n, u) => 100 + n });
      _scrml_reactive_set("form.endDate", 200);
      _scrml_derived_declare("form", () => ({ endDate: _scrml_reactive_get("form.endDate") }));
      _scrml_derived_subscribe("form", "form.endDate");

      ${emitted}

      return {
        readErrors: () => _scrml_derived_get("form.endDate.errors"),
        setStart: (v) => _scrml_reactive_set("startDate", v),
      };
    `;
    const fn = new Function("window", "document", SCRML_RUNTIME + "\n" + setup);
    const win = { addEventListener: () => {} };
    const doc = { createElement: () => ({ appendChild: () => {}, remove: () => {} }), head: { appendChild: () => {} } };
    const api = fn(win, doc);
    // gte returns null when value >= threshold; 200 >= 101 (100 + 1) is true → no error.
    expect(api.readErrors().length).toBe(0);
    // Replace startDate with one that yields 999 → 200 < 999+1 → fail.
    api.setStart({ plus: (n, u) => 998 + n });
    const errs = api.readErrors();
    expect(errs.length).toBe(1);
    expect(errs[0].tag).toBe("GteFailed");
  });
});
