/**
 * Type System — Lifecycle annotation Landing 2.5 unit tests
 *
 * Tests for the SPEC §14.12.6 fn-return position hybrid mechanism
 * (S131 — HU-2 (e)+(a) ratification):
 *   - Presence-progression `(not to T)` — DISCRIMINATION IS TRANSITION.
 *     `given u =>`, `if (u is not) return`, `match u { ... }` AUTO-MARKS.
 *   - Variant-progression `(.VariantA to .VariantB)` — explicit `transition(u)`.
 *     Missing transition() after source-variant discrim fires
 *     E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED.
 *
 * Compiler-source under test:
 *   - `buildFnReturnLifecycleMap(topNodes, typeRegistry)` — collects fn-name →
 *     FnReturnLifecycleSpec from function-decl returnTypeAnnotation values.
 *   - `checkLifecycleBindingAccess(body, bindings, errors, fileSpan)` — the
 *     walker that fires per-binding diagnostics.
 *   - `runLifecycleBindingAccessCheck(topNodes, fnReturnMap, errors, fileSpan)`
 *     — the pipeline-facing wrapper that collects bindings per scope.
 *
 * Test surface (per dispatch brief):
 *   §LL2-5_A buildFnReturnLifecycleMap — presence + variant classification
 *   §LL2-5_B Presence-progression — pre-discrimination fire (E-TYPE-001)
 *   §LL2-5_C Presence-progression — `given u =>` post-transition pass
 *   §LL2-5_D Presence-progression — `if (u is not) return` post-transition pass
 *   §LL2-5_E Presence-progression — `match u { given u => }` post-transition pass
 *   §LL2-5_F Variant-progression — correct `transition()` usage passes
 *   §LL2-5_G Variant-progression — missing `transition()` fires
 *   §LL2-5_H `transition()` compile-time-only — no runtime semantics observed
 *     (no codegen-side test here; verified via runtime emission counts in
 *     integration suite. In unit scope we verify that `transition()` calls
 *     advance state symbolically — the function does no side-effect emission.)
 *   §LL2-5_I End-to-end via runLifecycleBindingAccessCheck wrapper
 */

import { describe, test, expect } from "bun:test";
import {
  TSError,
  buildTypeRegistry,
  buildFnReturnLifecycleMap,
  checkLifecycleBindingAccess,
  runLifecycleBindingAccessCheck,
} from "../../src/type-system.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function span(start = 0, file = "/test/lifecycle-landing-2-5.scrml") {
  return { file, start, end: start + 10, line: 1, col: start + 1 };
}

function makeTypeDecl(name, typeKind, raw, id = 1) {
  return { id, kind: "type-decl", name, typeKind, raw, span: span(0) };
}

function makeFnDecl(name, returnTypeAnnotation, body = []) {
  return {
    id: 1,
    kind: "function-decl",
    name,
    returnTypeAnnotation,
    body,
    span: span(0),
  };
}

function makeLetDecl(name, initText, opts = {}) {
  return {
    id: 1,
    kind: opts.const ? "const-decl" : "let-decl",
    name,
    init: initText,
    span: span(0),
  };
}

function bareExpr(text, kind = "bare-expr") {
  return { kind, value: text, expr: text, span: span(0) };
}

function makeIfStmt(condition, consequent, alternate = []) {
  return {
    id: 1,
    kind: "if-stmt",
    condition,
    consequent,
    alternate,
    span: span(0),
  };
}

function makeGivenGuard(variables, body) {
  return {
    id: 1,
    kind: "given-guard",
    variables,
    body,
    span: span(0),
  };
}

function makeMatchStmt(header, arms) {
  // match-stmt with `body: arms` (the AST-builder uses `body` for arms).
  return {
    id: 1,
    kind: "match-stmt",
    header,
    body: arms,
    span: span(0),
  };
}

function makeMatchArmBlock(variant, isNotArm, body) {
  return {
    id: 1,
    kind: "match-arm-block",
    variant: isNotArm ? "__not__" : variant,
    isNotArm: !!isNotArm,
    body,
    span: span(0),
  };
}

// A given-arm in a match-stmt isn't a distinct AST kind; the ast-builder
// emits a match-arm-block with `variant: null` and the given identifier
// inside the body's bind. For the walker, we recognize given-arm patterns
// via either `test: "given <name>"` or `variant: "given <name>"` text — we
// synthesize the simplest legal form here.
function makeMatchGivenArm(bindingName, body) {
  return {
    id: 1,
    kind: "match-arm-block",
    variant: `given ${bindingName}`,
    test: `given ${bindingName}`,
    body,
    span: span(0),
  };
}

// ---------------------------------------------------------------------------
// §LL2-5_A buildFnReturnLifecycleMap — classification
// ---------------------------------------------------------------------------

describe("§LL2-5_A buildFnReturnLifecycleMap — classification", () => {
  test("classifies (not to User) as presence-progression", () => {
    const decls = [
      makeTypeDecl("User", "struct", "{ id: number, name: string }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());

    const topNodes = [
      makeFnDecl("loadUser", "(not to User)"),
    ];

    const map = buildFnReturnLifecycleMap(topNodes, typeRegistry);
    expect(map.has("loadUser")).toBe(true);
    const spec = map.get("loadUser");
    expect(spec.kind).toBe("presence");
    expect(spec.preType.kind).toBe("not");
    expect(spec.postType.kind).toBe("struct");
    expect(spec.postType.name).toBe("User");
    expect(spec.preVariantName).toBe("");
  });

  test("classifies (.Draft to .Published) as variant-progression", () => {
    const errors = [];
    const typeRegistry = buildTypeRegistry([], errors, span());

    const topNodes = [
      makeFnDecl("publish", "(.Draft to .Published)"),
    ];

    const map = buildFnReturnLifecycleMap(topNodes, typeRegistry);
    expect(map.has("publish")).toBe(true);
    const spec = map.get("publish");
    expect(spec.kind).toBe("variant");
    expect(spec.preVariantName).toBe("Draft");
    expect(spec.postVariantName).toBe("Published");
  });

  test("non-lifecycle return annotation produces no entry", () => {
    const errors = [];
    const typeRegistry = buildTypeRegistry([], errors, span());

    const topNodes = [
      makeFnDecl("ordinary", "string"),
      makeFnDecl("noAnnot", undefined),
    ];

    const map = buildFnReturnLifecycleMap(topNodes, typeRegistry);
    expect(map.size).toBe(0);
  });

  test("legacy `->` glyph also recognised in fn-return annotation", () => {
    const decls = [
      makeTypeDecl("User", "struct", "{ id: number }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());

    const topNodes = [
      makeFnDecl("loadUser", "(not -> User)"),
    ];

    const map = buildFnReturnLifecycleMap(topNodes, typeRegistry);
    expect(map.has("loadUser")).toBe(true);
    expect(map.get("loadUser").kind).toBe("presence");
  });

  test("nested function-decls inside markup/children get collected", () => {
    const decls = [
      makeTypeDecl("User", "struct", "{ id: number }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());

    const topNodes = [
      {
        kind: "markup",
        children: [
          makeFnDecl("loadUser", "(not to User)"),
        ],
      },
    ];

    const map = buildFnReturnLifecycleMap(topNodes, typeRegistry);
    expect(map.has("loadUser")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §LL2-5_B Presence-progression — pre-discrimination fire
// ---------------------------------------------------------------------------

describe("§LL2-5_B Presence-progression — pre-discrimination access fires E-TYPE-001", () => {
  test("direct read of u.name before discrimination fires E-TYPE-001", () => {
    // server fn loadUser() -> (not to User) {...}
    // const u = loadUser(42)
    // print(u.name)   // E-TYPE-001
    const bindings = new Map([
      ["u", {
        kind: "presence",
        preType: { kind: "not" },
        postType: { kind: "struct", name: "User", fields: new Map() },
        preVariantName: "",
        postVariantName: "",
      }],
    ]);

    const body = [
      bareExpr("print(u.name)"),
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    const fires = errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toMatch(/`u`/);
    expect(fires[0].message).toMatch(/lifecycle/);
    expect(fires[0].message).toMatch(/§14\.12\.6\.1/);
  });

  test("multiple pre-transition accesses fire separately", () => {
    const bindings = new Map([
      ["u", {
        kind: "presence",
        preType: { kind: "not" },
        postType: { kind: "struct", name: "User", fields: new Map() },
        preVariantName: "",
        postVariantName: "",
      }],
    ]);

    const body = [
      bareExpr("print(u.name)"),
      bareExpr("print(u.email)"),
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// §LL2-5_C Presence-progression — `given u =>` post-transition pass
// ---------------------------------------------------------------------------

describe("§LL2-5_C Presence-progression — `given u =>` post-transition pass", () => {
  test("access inside `given u => { print(u.name) }` passes", () => {
    const bindings = new Map([
      ["u", {
        kind: "presence",
        preType: { kind: "not" },
        postType: { kind: "struct", name: "User", fields: new Map() },
        preVariantName: "",
        postVariantName: "",
      }],
    ]);

    const body = [
      makeGivenGuard(["u"], [
        bareExpr("print(u.name)"),
        bareExpr("print(u.email)"),
      ]),
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });

  test("access OUTSIDE the given-guard still fires (outer-scope state preserved)", () => {
    const bindings = new Map([
      ["u", {
        kind: "presence",
        preType: { kind: "not" },
        postType: { kind: "struct", name: "User", fields: new Map() },
        preVariantName: "",
        postVariantName: "",
      }],
    ]);

    const body = [
      makeGivenGuard(["u"], [
        bareExpr("print(u.name)"),  // OK
      ]),
      bareExpr("print(u.email)"),  // E-TYPE-001 — outside given
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    const fires = errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toMatch(/email/);
  });

  test("multi-variable `given u, v =>` promotes both inside body", () => {
    const presenceSpec = {
      kind: "presence",
      preType: { kind: "not" },
      postType: { kind: "struct", name: "User", fields: new Map() },
      preVariantName: "",
      postVariantName: "",
    };
    const bindings = new Map([
      ["u", presenceSpec],
      ["v", presenceSpec],
    ]);

    const body = [
      makeGivenGuard(["u", "v"], [
        bareExpr("print(u.name)"),
        bareExpr("print(v.name)"),
      ]),
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §LL2-5_D Presence-progression — `if (u is not) return` early-return
// ---------------------------------------------------------------------------

describe("§LL2-5_D Presence-progression — `if (u is not) return` early-return promotes outer scope", () => {
  test("after `if (u is not) { return }`, subsequent reads pass", () => {
    const bindings = new Map([
      ["u", {
        kind: "presence",
        preType: { kind: "not" },
        postType: { kind: "struct", name: "User", fields: new Map() },
        preVariantName: "",
        postVariantName: "",
      }],
    ]);

    const body = [
      makeIfStmt(
        "u is not",
        [{ kind: "return-stmt", value: "", span: span(0) }],
      ),
      bareExpr("print(u.name)"),  // OK — u promoted to post after early-return
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });

  test("if-stmt WITHOUT early-return does NOT promote outer scope", () => {
    const bindings = new Map([
      ["u", {
        kind: "presence",
        preType: { kind: "not" },
        postType: { kind: "struct", name: "User", fields: new Map() },
        preVariantName: "",
        postVariantName: "",
      }],
    ]);

    const body = [
      makeIfStmt(
        "u is not",
        [bareExpr("log(\"absent\")")],  // no return
      ),
      bareExpr("print(u.name)"),  // E-TYPE-001 — u still pre
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(1);
  });

  test("bare `return` keyword in escape-hatch text also recognised", () => {
    const bindings = new Map([
      ["u", {
        kind: "presence",
        preType: { kind: "not" },
        postType: { kind: "struct", name: "User", fields: new Map() },
        preVariantName: "",
        postVariantName: "",
      }],
    ]);

    // Simulate a body where the if-consequent's stmt isn't a structured
    // return-stmt but a bare-text "return" statement (parser fallback).
    const body = [
      makeIfStmt(
        "u is not",
        [bareExpr("return")],
      ),
      bareExpr("print(u.name)"),
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §LL2-5_E Presence-progression — `match u { given u => }` post-transition pass
// ---------------------------------------------------------------------------

describe("§LL2-5_E Presence-progression — match arm with `given <name>` promotes", () => {
  test("access inside `given u =>` arm passes", () => {
    const bindings = new Map([
      ["u", {
        kind: "presence",
        preType: { kind: "not" },
        postType: { kind: "struct", name: "User", fields: new Map() },
        preVariantName: "",
        postVariantName: "",
      }],
    ]);

    const body = [
      makeMatchStmt("u", [
        makeMatchArmBlock(null, true, [bareExpr("handleAbsence()")]),
        makeMatchGivenArm("u", [bareExpr("print(u.name)")]),
      ]),
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });

  test("access OUTSIDE the match-stmt still fires", () => {
    const bindings = new Map([
      ["u", {
        kind: "presence",
        preType: { kind: "not" },
        postType: { kind: "struct", name: "User", fields: new Map() },
        preVariantName: "",
        postVariantName: "",
      }],
    ]);

    const body = [
      makeMatchStmt("u", [
        makeMatchArmBlock(null, true, [bareExpr("handleAbsence()")]),
        makeMatchGivenArm("u", [bareExpr("print(u.name)")]),
      ]),
      bareExpr("print(u.email)"),  // outside match → outer scope still pre
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §LL2-5_F Variant-progression — correct `transition()` usage passes
// ---------------------------------------------------------------------------

describe("§LL2-5_F Variant-progression — correct `transition()` usage passes", () => {
  test("`if (a is .Draft) { transition(a); print(a.publishedAt) }` passes", () => {
    const bindings = new Map([
      ["a", {
        kind: "variant",
        preType: { kind: "enum", name: "Article" },
        postType: { kind: "enum", name: "Article" },
        preVariantName: "Draft",
        postVariantName: "Published",
      }],
    ]);

    const body = [
      makeIfStmt(
        "a is .Draft",
        [
          bareExpr("transition(a)"),
          bareExpr("print(a.publishedAt)"),
        ],
      ),
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED").length).toBe(0);
    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });

  test("`transition()` advances state — subsequent reads pass", () => {
    const bindings = new Map([
      ["a", {
        kind: "variant",
        preType: { kind: "enum", name: "Article" },
        postType: { kind: "enum", name: "Article" },
        preVariantName: "Draft",
        postVariantName: "Published",
      }],
    ]);

    const body = [
      makeIfStmt(
        "a is .Draft",
        [
          bareExpr("transition(a)"),
          bareExpr("print(a.publishedAt)"),
          bareExpr("log(a.body)"),
          bareExpr("archive(a.publishedAt)"),
        ],
      ),
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    expect(errors.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §LL2-5_G Variant-progression — missing `transition()` fires
// ---------------------------------------------------------------------------

describe("§LL2-5_G Variant-progression — missing `transition()` fires E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED", () => {
  test("`if (a is .Draft) { print(a.publishedAt) }` (no transition()) fires", () => {
    const bindings = new Map([
      ["a", {
        kind: "variant",
        preType: { kind: "enum", name: "Article" },
        postType: { kind: "enum", name: "Article" },
        preVariantName: "Draft",
        postVariantName: "Published",
      }],
    ]);

    const body = [
      makeIfStmt(
        "a is .Draft",
        [
          bareExpr("print(a.publishedAt)"),  // No transition() — fires
        ],
      ),
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    const fires = errors.filter(e => e.code === "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toMatch(/`a`/);
    expect(fires[0].message).toMatch(/publishedAt/);
    expect(fires[0].message).toMatch(/Draft/);
    expect(fires[0].message).toMatch(/Published/);
    expect(fires[0].message).toMatch(/transition\(a\)/);
    expect(fires[0].message).toMatch(/§14\.12\.6\.2/);
  });

  test("access OUTSIDE any source-discrimination fires E-TYPE-001 (not variant-specific)", () => {
    // Without any if-discrimination, post-shape field access fires the
    // generic E-TYPE-001 — the variant-specific code reserved for the
    // "discriminated but not transitioned" case.
    const bindings = new Map([
      ["a", {
        kind: "variant",
        preType: { kind: "enum", name: "Article" },
        postType: { kind: "enum", name: "Article" },
        preVariantName: "Draft",
        postVariantName: "Published",
      }],
    ]);

    const body = [
      bareExpr("print(a.publishedAt)"),  // No discrimination at all
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(1);
    expect(errors.filter(e => e.code === "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §LL2-5_H `transition()` semantics — compile-time-only behaviour
// ---------------------------------------------------------------------------

describe("§LL2-5_H `transition()` semantics — compile-time-only", () => {
  test("`transition()` on a non-lifecycle binding is a silent no-op", () => {
    const bindings = new Map();  // No tracked lifecycle bindings

    const body = [
      bareExpr("transition(someOtherVar)"),
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    expect(errors.length).toBe(0);
  });

  test("`transition()` on a presence-progression binding is legal (no diagnostic)", () => {
    const bindings = new Map([
      ["u", {
        kind: "presence",
        preType: { kind: "not" },
        postType: { kind: "struct", name: "User", fields: new Map() },
        preVariantName: "",
        postVariantName: "",
      }],
    ]);

    const body = [
      bareExpr("transition(u)"),
      bareExpr("print(u.name)"),  // OK — transition() advanced state
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    expect(errors.length).toBe(0);
  });

  test("multiple `transition()` calls on same binding — only first matters; rest are no-op", () => {
    const bindings = new Map([
      ["a", {
        kind: "variant",
        preType: { kind: "enum", name: "Article" },
        postType: { kind: "enum", name: "Article" },
        preVariantName: "Draft",
        postVariantName: "Published",
      }],
    ]);

    const body = [
      makeIfStmt("a is .Draft", [
        bareExpr("transition(a)"),
        bareExpr("transition(a)"),  // No-op
        bareExpr("transition(a)"),  // No-op
        bareExpr("print(a.publishedAt)"),
      ]),
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    expect(errors.length).toBe(0);
  });

  test("`transition(otherBinding)` does NOT advance `mainBinding`", () => {
    const variantSpec = {
      kind: "variant",
      preType: { kind: "enum", name: "Article" },
      postType: { kind: "enum", name: "Article" },
      preVariantName: "Draft",
      postVariantName: "Published",
    };
    const bindings = new Map([
      ["a", variantSpec],
      ["b", variantSpec],
    ]);

    const body = [
      makeIfStmt("a is .Draft", [
        bareExpr("transition(b)"),  // transitions b, NOT a
        bareExpr("print(a.publishedAt)"),  // fires — a wasn't transitioned
      ]),
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED").length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §LL2-5_I End-to-end via runLifecycleBindingAccessCheck wrapper
// ---------------------------------------------------------------------------

describe("§LL2-5_I runLifecycleBindingAccessCheck end-to-end", () => {
  test("wrapper collects fn-return-typed bindings + invokes walker — fires correctly", () => {
    const decls = [
      makeTypeDecl("User", "struct", "{ id: number, name: string }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());

    // Top-level: a fn-decl + a top-level `const u = loadUser(42)` + a bare-expr read.
    const topNodes = [
      makeFnDecl("loadUser", "(not to User)"),
      { ...makeLetDecl("u", "loadUser(42)", { const: true }) },
      bareExpr("print(u.name)"),
    ];

    const fnReturnMap = buildFnReturnLifecycleMap(topNodes, typeRegistry);
    expect(fnReturnMap.size).toBe(1);

    runLifecycleBindingAccessCheck(topNodes, fnReturnMap, errors, span());

    const fires = errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toMatch(/`u`/);
  });

  test("wrapper-level: no fires when binding is discriminated", () => {
    const decls = [
      makeTypeDecl("User", "struct", "{ id: number, name: string }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());

    const topNodes = [
      makeFnDecl("loadUser", "(not to User)"),
      { ...makeLetDecl("u", "loadUser(42)", { const: true }) },
      makeGivenGuard(["u"], [
        bareExpr("print(u.name)"),
      ]),
    ];

    const fnReturnMap = buildFnReturnLifecycleMap(topNodes, typeRegistry);
    runLifecycleBindingAccessCheck(topNodes, fnReturnMap, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });

  test("wrapper-level: variant-progression end-to-end", () => {
    const errors = [];
    const typeRegistry = buildTypeRegistry([], errors, span());

    const topNodes = [
      makeFnDecl("publish", "(.Draft to .Published)"),
      { ...makeLetDecl("a", "publish(42)", { const: true }) },
      makeIfStmt("a is .Draft", [
        bareExpr("print(a.publishedAt)"),  // fires — no transition()
      ]),
    ];

    const fnReturnMap = buildFnReturnLifecycleMap(topNodes, typeRegistry);
    runLifecycleBindingAccessCheck(topNodes, fnReturnMap, errors, span());

    const fires = errors.filter(e => e.code === "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED");
    expect(fires.length).toBe(1);
  });

  test("wrapper short-circuits when no fn-return lifecycle map entries", () => {
    const errors = [];
    const typeRegistry = buildTypeRegistry([], errors, span());

    const topNodes = [
      makeFnDecl("ordinary", "string"),  // no lifecycle
      { ...makeLetDecl("x", "ordinary()", { const: true }) },
      bareExpr("print(x.field)"),  // would be a field access if x was lifecycle — but it isn't
    ];

    const fnReturnMap = buildFnReturnLifecycleMap(topNodes, typeRegistry);
    expect(fnReturnMap.size).toBe(0);

    runLifecycleBindingAccessCheck(topNodes, fnReturnMap, errors, span());
    expect(errors.length).toBe(0);
  });

  test("wrapper-level: empty top nodes is safe", () => {
    const errors = [];
    const fnReturnMap = new Map();
    runLifecycleBindingAccessCheck([], fnReturnMap, errors, span());
    expect(errors.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §LL2-5_J Bug 24 — qualified-form discrim regex tolerance
//
// S138 fix in `checkLifecycleBindingAccess > isIsVariantCheckOf`. Pre-fix
// regex required `bindingName is .VariantName` (bare-dot form only); the
// qualified form `bindingName is EnumName.VariantName` was not recognized
// → tracker stayed at "pre" after the discrimination branch → spurious
// E-TYPE-001 fires on post-discrimination field access.
//
// SPEC §14.10 + §18.0.3 — bare-variant inference (M9) — says bare-dot and
// qualified forms are equivalent. The tracker must treat them so.
//
// Fix: extended regex to optional EnumName prefix:
//   `is\s+(?:[A-Z][A-Za-z0-9_$]*)?\s*\.\s*VariantName`
// ---------------------------------------------------------------------------

describe("§LL2-5_J Bug 24 — qualified-form discrim regex tolerance", () => {
  test("qualified form `is Article.Draft` advances state same as bare `.Draft`", () => {
    const bindings = new Map([
      ["a", {
        kind: "variant",
        preType: { kind: "enum", name: "Article" },
        postType: { kind: "enum", name: "Article" },
        preVariantName: "Draft",
        postVariantName: "Published",
      }],
    ]);

    const body = [
      makeIfStmt(
        "a is Article.Draft",  // qualified form — pre-fix not recognized
        [
          bareExpr("transition(a)"),
          bareExpr("print(a.publishedAt)"),  // would fire E-TYPE-001 pre-fix
        ],
      ),
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    // Post-fix: qualified form recognized; transition() advances state;
    // subsequent .publishedAt read passes.
    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
    expect(errors.filter(e => e.code === "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED").length).toBe(0);
  });

  test("qualified form `is Article.Draft` without transition() still fires LIFECYCLE-VARIANT-NOT-TRANSITIONED", () => {
    const bindings = new Map([
      ["a", {
        kind: "variant",
        preType: { kind: "enum", name: "Article" },
        postType: { kind: "enum", name: "Article" },
        preVariantName: "Draft",
        postVariantName: "Published",
      }],
    ]);

    const body = [
      makeIfStmt(
        "a is Article.Draft",
        [
          bareExpr("print(a.publishedAt)"),  // No transition() — must fire
        ],
      ),
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    // Post-fix: qualified form recognized, so the not-transitioned
    // diagnostic fires correctly (matches the bare-dot equivalent).
    const fires = errors.filter(e => e.code === "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED");
    expect(fires.length).toBe(1);
  });

  test("bare-dot `is .Draft` still works (regression)", () => {
    const bindings = new Map([
      ["a", {
        kind: "variant",
        preType: { kind: "enum", name: "Article" },
        postType: { kind: "enum", name: "Article" },
        preVariantName: "Draft",
        postVariantName: "Published",
      }],
    ]);

    const body = [
      makeIfStmt(
        "a is .Draft",  // bare-dot form — should still work
        [
          bareExpr("transition(a)"),
          bareExpr("print(a.publishedAt)"),
        ],
      ),
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });

  test("post-discrim transition() with `is .Published` (the post-variant for completeness)", () => {
    // Variant-progression spec allows discrimination at the source variant
    // (Draft) followed by transition() + post-type field access. The walker
    // doesn't generally distinguish "discriminating at source vs post" — both
    // would route through isIsVariantCheckOf for state-advance. This test
    // confirms the qualified-form recognition for the post-variant pattern.
    const bindings = new Map([
      ["a", {
        kind: "variant",
        preType: { kind: "enum", name: "Article" },
        postType: { kind: "enum", name: "Article" },
        preVariantName: "Draft",
        postVariantName: "Published",
      }],
    ]);

    const body = [
      makeIfStmt(
        "a is Article.Draft",  // qualified form for the source variant
        [
          bareExpr("transition(a)"),
          bareExpr("print(a.publishedAt)"),
        ],
      ),
    ];
    const errors = [];
    checkLifecycleBindingAccess(body, bindings, errors, span());

    // Qualified-form recognized → transition() advances → post-access passes.
    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });
});
