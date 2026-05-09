/**
 * c5-reset-default.test.js — A1c Step C5 unit tests
 *
 * Tests `reset(@cell)` runtime + `default=` integration per SPEC §6.8 (L18, γ).
 *
 *   §C5.1  Init-thunk sidecar — Shape 1 plain cell (no defaultExpr)
 *   §C5.2  Init-thunk sidecar — Shape 2 decl-with-spec cell (no defaultExpr)
 *   §C5.3  Init-thunk SKIPPED — derived (E-DERIVED-WRITE territory)
 *   §C5.4  Init-thunk SKIPPED — markup-typed derived
 *   §C5.5  Init-thunk SKIPPED — compound parents (reset walks children)
 *   §C5.6  Init-thunk SKIPPED — when defaultExpr is present (default wins per §6.8.2 line 4857)
 *   §C5.7  Init-thunk SKIPPED — inside function body (reassignment, not declaration)
 *   §C5.8  Init-thunk SKIPPED — server boundary
 *   §C5.9  reset(@cell) lowering — IdentExpr target
 *   §C5.10 reset(@compound.field) lowering — single-level MemberExpr target
 *   §C5.11 reset(@a.b.c.d) lowering — multi-level compound nav
 *   §C5.12 reset target shape defensive — non-canonical falls through to marker
 *   §C5.13 Compound child init-thunk uses qualified-path key
 *   §C5.14 Runtime: cell with default= → reset evaluates default thunk
 *   §C5.15 Runtime: cell without default= → reset re-evaluates init thunk
 *   §C5.16 Runtime: compound reset walks all children in declaration order
 *   §C5.17 Runtime: cross-cell default expression evaluates fresh at reset time
 *   §C5.18 Runtime: reset of unknown cell is a no-op (defensive)
 *   §C5.19 Runtime: chunk wiring — default+init+reset live in 'reset' chunk
 *
 * SCOPE: per A1c BRIEF §1 — covers init-thunk emission, reset-expr lowering,
 * runtime helper semantics. OUT OF SCOPE: validity-surface reset wiring (C8),
 * engine-state reset (C12-C15), validators-on-reset (Wave 3).
 */

import { describe, test, expect } from "bun:test";
import { emitLogicNode } from "../../src/codegen/emit-logic.js";
import { emitExpr } from "../../src/codegen/emit-expr.js";
import { SCRML_RUNTIME } from "../../src/runtime-template.js";
import { RUNTIME_CHUNKS, RUNTIME_CHUNK_ORDER } from "../../src/codegen/runtime-chunks.js";

// Helpers — minimal AST shape constructors (mirror c1-shape-aware-cell-emit.test.js).
function shape1Plain(name, init) {
  return {
    kind: "state-decl",
    name,
    init,
    initExpr: undefined,
    shape: "plain",
    structuralForm: true,
    isConst: false,
    _cellKind: "plain",
    span: { start: 0, end: 0 },
  };
}

function shape3Derived(name, init) {
  return {
    kind: "state-decl",
    name,
    init,
    initExpr: undefined,
    shape: "derived",
    structuralForm: true,
    isConst: true,
    _cellKind: "plain",
    span: { start: 0, end: 0 },
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
    span: { start: 0, end: 0 },
  };
}

function nullLit() {
  return { kind: "lit", litType: "null", raw: "null", span: { start: 0, end: 0 } };
}

function clientCtx() {
  return { mode: "client", derivedNames: null };
}

// ---------------------------------------------------------------------------
// §C5.1 — Init-thunk sidecar fires for Shape 1 plain cells
// ---------------------------------------------------------------------------

describe("C5 §C5.1 — Init-thunk sidecar (Shape 1 plain)", () => {
  test("emits _scrml_init_set alongside _scrml_reactive_set", () => {
    const node = shape1Plain("count", "0");
    const result = emitLogicNode(node);
    expect(result).toContain('_scrml_reactive_set("count"');
    expect(result).toContain('_scrml_init_set("count", () => 0)');
  });

  test("init-thunk captures the original init expression verbatim", () => {
    const node = shape1Plain("startTime", "Date.now()");
    const result = emitLogicNode(node);
    expect(result).toMatch(/_scrml_init_set\("startTime", \(\) => Date\.now\(\)\)/);
  });

  test("init-thunk is skipped when init is empty/undefined string", () => {
    const node = shape1Plain("placeholder", "");
    const result = emitLogicNode(node);
    expect(result).not.toContain('_scrml_init_set("placeholder"');
  });
});

// ---------------------------------------------------------------------------
// §C5.2 — Init-thunk sidecar fires for Shape 2 decl-with-spec cells
// ---------------------------------------------------------------------------

describe("C5 §C5.2 — Init-thunk sidecar (Shape 2 decl-with-spec)", () => {
  test("emits _scrml_init_set for bindable cell with init expression", () => {
    const node = {
      kind: "state-decl",
      name: "userName",
      init: "''",
      shape: "decl-with-spec",
      structuralForm: true,
      isConst: false,
      _cellKind: "bindable",
      _isBindable: true,
      renderSpec: { kind: "render-spec", element: { kind: "markup", tag: "input" } },
      span: { start: 0, end: 0 },
    };
    const result = emitLogicNode(node);
    expect(result).toContain('_scrml_init_set("userName"');
  });
});

// ---------------------------------------------------------------------------
// §C5.3 — Init-thunk SKIPPED for derived cells
// ---------------------------------------------------------------------------

describe("C5 §C5.3 — Init-thunk SKIPPED (derived)", () => {
  test("Shape 3 V5-strict derived does NOT emit _scrml_init_set", () => {
    const node = shape3Derived("doubled", "@count * 2");
    const result = emitLogicNode(node);
    expect(result).toContain('_scrml_derived_declare("doubled"');
    expect(result).not.toContain('_scrml_init_set("doubled"');
  });

  test("Shape 3 legacy derived (structuralForm:false) does NOT emit _scrml_init_set", () => {
    const node = { ...shape3Derived("doubled", "@count * 2"), structuralForm: false };
    const result = emitLogicNode(node);
    expect(result).not.toContain('_scrml_init_set("doubled"');
  });
});

// ---------------------------------------------------------------------------
// §C5.4 — Init-thunk SKIPPED for markup-typed derived cells
// ---------------------------------------------------------------------------

describe("C5 §C5.4 — Init-thunk SKIPPED (markup-typed derived)", () => {
  test("markup-typed derived cell does NOT emit _scrml_init_set", () => {
    const node = {
      kind: "state-decl",
      name: "badge",
      init: "",
      initExpr: null,
      shape: "decl-with-spec",
      structuralForm: true,
      isConst: true,
      _cellKind: "markup-typed",
      renderSpec: { kind: "render-spec", element: { kind: "markup", tag: "span" } },
      span: { start: 0, end: 0 },
    };
    const result = emitLogicNode(node);
    expect(result).not.toContain('_scrml_init_set("badge"');
  });
});

// ---------------------------------------------------------------------------
// §C5.5 — Init-thunk SKIPPED for compound parents
// ---------------------------------------------------------------------------

describe("C5 §C5.5 — Init-thunk SKIPPED (compound parent)", () => {
  test("compound parent itself does NOT register init-thunk (children handle their own)", () => {
    const node = compoundParent("formRes", [
      shape1Plain("name", '""'),
      shape1Plain("email", '""'),
    ]);
    const result = emitLogicNode(node);
    // The compound parent gets a derived_declare, not an init_set.
    expect(result).toContain('_scrml_derived_declare("formRes"');
    expect(result).not.toContain('_scrml_init_set("formRes",');
    // But each compound CHILD does get an init-thunk at qualified path.
    expect(result).toContain('_scrml_init_set("formRes.name"');
    expect(result).toContain('_scrml_init_set("formRes.email"');
  });

  test("empty compound (children: []) does NOT emit init-thunk for the parent", () => {
    const node = compoundParent("emptyCompound", []);
    const result = emitLogicNode(node);
    expect(result).not.toContain('_scrml_init_set("emptyCompound"');
  });
});

// ---------------------------------------------------------------------------
// §C5.6 — Init-thunk SKIPPED when defaultExpr is present
// ---------------------------------------------------------------------------

describe("C5 §C5.6 — Init-thunk SKIPPED (defaultExpr present)", () => {
  test("Shape 1 cell with default=null emits ONLY _scrml_default_set, not _scrml_init_set", () => {
    const node = {
      ...shape1Plain("startTime", "Date.now()"),
      defaultExpr: nullLit(),
    };
    const result = emitLogicNode(node);
    expect(result).toContain('_scrml_default_set("startTime"');
    // Per SPEC §6.8.2 line 4857: default thunk wins over init thunk; emitting
    // both would be wasted code (init-thunk would be unreachable).
    expect(result).not.toContain('_scrml_init_set("startTime"');
  });
});

// ---------------------------------------------------------------------------
// §C5.7 — Init-thunk SKIPPED inside function bodies
// ---------------------------------------------------------------------------

describe("C5 §C5.7 — Init-thunk SKIPPED (inside function body)", () => {
  test("state-decl reassignment inside function-decl body does NOT emit _scrml_init_set", () => {
    // Mirrors a function body containing `@count = 5` reassignment.
    const fnNode = {
      kind: "function-decl",
      name: "increment",
      params: [],
      body: [shape1Plain("count", "5")],
      span: { start: 0, end: 0 },
    };
    const result = emitLogicNode(fnNode);
    // The state-decl IS emitted as _scrml_reactive_set inside the function,
    // but the init-thunk sidecar is suppressed (this is a reassignment, not
    // a canonical declaration site).
    expect(result).toContain('_scrml_reactive_set("count"');
    expect(result).not.toContain('_scrml_init_set("count"');
  });

  test("state-decl reassignment with insideFunctionBody opt does NOT emit _scrml_init_set", () => {
    const node = shape1Plain("count", "5");
    const result = emitLogicNode(node, { boundary: "client", insideFunctionBody: true });
    expect(result).not.toContain('_scrml_init_set("count"');
  });
});

// ---------------------------------------------------------------------------
// §C5.8 — Init-thunk SKIPPED on server boundary
// ---------------------------------------------------------------------------

describe("C5 §C5.8 — Init-thunk SKIPPED (server boundary)", () => {
  test("server-boundary state-decl does NOT emit _scrml_init_set", () => {
    const node = shape1Plain("entries", "[]");
    const result = emitLogicNode(node, { boundary: "server" });
    // _scrml_init_set is a client-side helper; server emit must not call it.
    expect(result).not.toContain("_scrml_init_set");
  });
});

// ---------------------------------------------------------------------------
// §C5.9 — reset(@cell) lowering for IdentExpr targets
// ---------------------------------------------------------------------------

describe("C5 §C5.9 — reset(@cell) IdentExpr target lowering", () => {
  test("reset(@count) lowers to _scrml_reset(\"count\")", () => {
    const node = {
      kind: "reset-expr",
      target: { kind: "ident", name: "@count", span: { start: 0, end: 0 } },
      span: { start: 0, end: 0 },
    };
    const result = emitExpr(node, clientCtx());
    expect(result).toBe('_scrml_reset("count")');
  });

  test("reset(@form) (compound parent target) lowers to _scrml_reset(\"form\")", () => {
    // The runtime's prefix-match handles the compound walk; codegen doesn't
    // need to know whether the target is a parent or a leaf.
    const node = {
      kind: "reset-expr",
      target: { kind: "ident", name: "@form", span: { start: 0, end: 0 } },
      span: { start: 0, end: 0 },
    };
    const result = emitExpr(node, clientCtx());
    expect(result).toBe('_scrml_reset("form")');
  });
});

// ---------------------------------------------------------------------------
// §C5.10 — reset(@compound.field) single-level compound nav lowering
// ---------------------------------------------------------------------------

describe("C5 §C5.10 — reset(@compound.field) lowering", () => {
  test("reset(@form.name) lowers to _scrml_reset(\"form.name\")", () => {
    const node = {
      kind: "reset-expr",
      target: {
        kind: "member",
        object: { kind: "ident", name: "@form", span: { start: 0, end: 0 } },
        property: "name",
        optional: false,
        span: { start: 0, end: 0 },
      },
      span: { start: 0, end: 0 },
    };
    const result = emitExpr(node, clientCtx());
    expect(result).toBe('_scrml_reset("form.name")');
  });
});

// ---------------------------------------------------------------------------
// §C5.11 — reset(@a.b.c.d) multi-level compound nav lowering
// ---------------------------------------------------------------------------

describe("C5 §C5.11 — reset(@a.b.c.d) multi-level compound nav lowering", () => {
  test("reset(@outer.inner.leaf) lowers to _scrml_reset(\"outer.inner.leaf\")", () => {
    // Build MemberExpr chain: ((@outer).inner).leaf
    const node = {
      kind: "reset-expr",
      target: {
        kind: "member",
        object: {
          kind: "member",
          object: { kind: "ident", name: "@outer", span: { start: 0, end: 0 } },
          property: "inner",
          optional: false,
          span: { start: 0, end: 0 },
        },
        property: "leaf",
        optional: false,
        span: { start: 0, end: 0 },
      },
      span: { start: 0, end: 0 },
    };
    const result = emitExpr(node, clientCtx());
    expect(result).toBe('_scrml_reset("outer.inner.leaf")');
  });

  test("4-segment path reset(@a.b.c.d) lowers to dotted key", () => {
    const node = {
      kind: "reset-expr",
      target: {
        kind: "member",
        object: {
          kind: "member",
          object: {
            kind: "member",
            object: { kind: "ident", name: "@a", span: { start: 0, end: 0 } },
            property: "b",
            optional: false,
            span: { start: 0, end: 0 },
          },
          property: "c",
          optional: false,
          span: { start: 0, end: 0 },
        },
        property: "d",
        optional: false,
        span: { start: 0, end: 0 },
      },
      span: { start: 0, end: 0 },
    };
    const result = emitExpr(node, clientCtx());
    expect(result).toBe('_scrml_reset("a.b.c.d")');
  });
});

// ---------------------------------------------------------------------------
// §C5.12 — Defensive marker for unrecognized target shapes
// ---------------------------------------------------------------------------

describe("C5 §C5.12 — Defensive marker for non-canonical targets", () => {
  test("non-`@`-prefixed IdentExpr falls to marker", () => {
    // B22 should have rejected; this exercises the defensive fallthrough.
    const node = {
      kind: "reset-expr",
      target: { kind: "ident", name: "count", span: { start: 0, end: 0 } },
      span: { start: 0, end: 0 },
    };
    const result = emitExpr(node, clientCtx());
    expect(result).toContain("C5: unexpected reset target shape");
  });

  test("MemberExpr rooted at non-`@` IdentExpr falls to marker", () => {
    const node = {
      kind: "reset-expr",
      target: {
        kind: "member",
        object: { kind: "ident", name: "obj", span: { start: 0, end: 0 } },
        property: "field",
        optional: false,
        span: { start: 0, end: 0 },
      },
      span: { start: 0, end: 0 },
    };
    const result = emitExpr(node, clientCtx());
    expect(result).toContain("C5: unexpected reset target shape");
  });
});

// ---------------------------------------------------------------------------
// §C5.13 — Compound child init-thunk uses qualified-path key
// ---------------------------------------------------------------------------

describe("C5 §C5.13 — Compound child init-thunk uses qualified-path key", () => {
  test("compound child init-thunk registers under parent.child key", () => {
    const node = compoundParent("signup", [
      shape1Plain("email", '""'),
      shape1Plain("password", '""'),
    ]);
    const result = emitLogicNode(node);
    expect(result).toContain('_scrml_init_set("signup.email"');
    expect(result).toContain('_scrml_init_set("signup.password"');
    // Children's flat names should NOT appear.
    expect(result).not.toMatch(/_scrml_init_set\("email",/);
    expect(result).not.toMatch(/_scrml_init_set\("password",/);
  });

  test("nested compound child init-thunk uses full qualified path", () => {
    const inner = compoundParent("inner", [shape1Plain("leaf", "0")]);
    const outer = compoundParent("outer", [inner]);
    const result = emitLogicNode(outer);
    expect(result).toContain('_scrml_init_set("outer.inner.leaf"');
  });
});

// ---------------------------------------------------------------------------
// §C5.14 — Runtime: cell with default= → reset evaluates default thunk
// ---------------------------------------------------------------------------

describe("C5 §C5.14 — Runtime: default-thunk wins over init-thunk", () => {
  test("reset of a cell with both default and init evaluates the DEFAULT", () => {
    const fn = new Function(
      SCRML_RUNTIME +
      "\nreturn { _scrml_init_set, _scrml_default_set, _scrml_reset, _scrml_reactive_get, _scrml_reactive_set };"
    );
    const rt = fn();
    rt._scrml_reactive_set("retries", 3);
    rt._scrml_init_set("retries", () => 0);
    rt._scrml_default_set("retries", () => 99);
    rt._scrml_reset("retries");
    expect(rt._scrml_reactive_get("retries")).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// §C5.15 — Runtime: cell without default= → reset re-evaluates init thunk
// ---------------------------------------------------------------------------

describe("C5 §C5.15 — Runtime: init-thunk re-evaluates", () => {
  test("reset of a cell with only init thunk evaluates the init expression", () => {
    const fn = new Function(
      SCRML_RUNTIME +
      "\nreturn { _scrml_init_set, _scrml_reset, _scrml_reactive_get, _scrml_reactive_set };"
    );
    const rt = fn();
    rt._scrml_reactive_set("count", 42);
    rt._scrml_init_set("count", () => 0);
    rt._scrml_reset("count");
    expect(rt._scrml_reactive_get("count")).toBe(0);
  });

  test("init thunk re-evaluates each call (not a snapshot)", () => {
    const fn = new Function(
      SCRML_RUNTIME +
      "\nreturn { _scrml_init_set, _scrml_reset, _scrml_reactive_get, _scrml_reactive_set };"
    );
    const rt = fn();
    let counter = 0;
    rt._scrml_init_set("counter", () => ++counter);
    rt._scrml_reset("counter");
    expect(rt._scrml_reactive_get("counter")).toBe(1);
    rt._scrml_reset("counter");
    expect(rt._scrml_reactive_get("counter")).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// §C5.16 — Runtime: compound reset walks all children in declaration order
// ---------------------------------------------------------------------------

describe("C5 §C5.16 — Runtime: compound reset walks children", () => {
  test("reset(@compound) resets every registered child cell", () => {
    const fn = new Function(
      SCRML_RUNTIME +
      "\nreturn { _scrml_init_set, _scrml_reset, _scrml_reactive_get, _scrml_reactive_set };"
    );
    const rt = fn();
    rt._scrml_init_set("form.name", () => "");
    rt._scrml_init_set("form.email", () => "");
    rt._scrml_init_set("form.age", () => 0);
    rt._scrml_reactive_set("form.name", "alice");
    rt._scrml_reactive_set("form.email", "a@b.com");
    rt._scrml_reactive_set("form.age", 30);
    rt._scrml_reset("form");
    expect(rt._scrml_reactive_get("form.name")).toBe("");
    expect(rt._scrml_reactive_get("form.email")).toBe("");
    expect(rt._scrml_reactive_get("form.age")).toBe(0);
  });

  test("compound reset visits children in declaration order", () => {
    const fn = new Function(
      SCRML_RUNTIME +
      "\nreturn { _scrml_init_set, _scrml_reset, _scrml_reactive_get, _scrml_reactive_set };"
    );
    const rt = fn();
    const visitOrder = [];
    rt._scrml_init_set("c.first", () => { visitOrder.push("first"); return 1; });
    rt._scrml_init_set("c.second", () => { visitOrder.push("second"); return 2; });
    rt._scrml_init_set("c.third", () => { visitOrder.push("third"); return 3; });
    rt._scrml_reset("c");
    expect(visitOrder).toEqual(["first", "second", "third"]);
  });

  test("compound reset respects mixed default+init children", () => {
    const fn = new Function(
      SCRML_RUNTIME +
      "\nreturn { _scrml_init_set, _scrml_default_set, _scrml_reset, _scrml_reactive_get, _scrml_reactive_set };"
    );
    const rt = fn();
    rt._scrml_init_set("mix.a", () => "init-a");
    rt._scrml_default_set("mix.b", () => "default-b");
    rt._scrml_init_set("mix.c", () => "init-c");
    rt._scrml_reactive_set("mix.a", "live-a");
    rt._scrml_reactive_set("mix.b", "live-b");
    rt._scrml_reactive_set("mix.c", "live-c");
    rt._scrml_reset("mix");
    expect(rt._scrml_reactive_get("mix.a")).toBe("init-a");
    expect(rt._scrml_reactive_get("mix.b")).toBe("default-b");
    expect(rt._scrml_reactive_get("mix.c")).toBe("init-c");
  });
});

// ---------------------------------------------------------------------------
// §C5.17 — Runtime: cross-cell default expression evaluates fresh at reset
// ---------------------------------------------------------------------------

describe("C5 §C5.17 — Runtime: cross-cell default re-evaluates per reset", () => {
  test("default=@otherCell reads the LIVE value of the other cell at reset time", () => {
    const fn = new Function(
      SCRML_RUNTIME +
      "\nreturn { _scrml_default_set, _scrml_reset, _scrml_reactive_get, _scrml_reactive_set };"
    );
    const rt = fn();
    // Simulate: <token default=@seed> = generateUUID()
    rt._scrml_reactive_set("seed", "alpha");
    rt._scrml_reactive_set("token", "uuid-original");
    rt._scrml_default_set("token", () => rt._scrml_reactive_get("seed"));
    rt._scrml_reset("token");
    expect(rt._scrml_reactive_get("token")).toBe("alpha");
    // Mutate the upstream and reset again — must re-evaluate, not capture.
    rt._scrml_reactive_set("seed", "beta");
    rt._scrml_reset("token");
    expect(rt._scrml_reactive_get("token")).toBe("beta");
  });
});

// ---------------------------------------------------------------------------
// §C5.18 — Runtime: reset of unknown cell is a defensive no-op
// ---------------------------------------------------------------------------

describe("C5 §C5.18 — Runtime: defensive no-op on unknown name", () => {
  test("reset of a cell with no registered thunks AND no compound children does not throw", () => {
    const fn = new Function(
      SCRML_RUNTIME +
      "\nreturn { _scrml_reset };"
    );
    const rt = fn();
    expect(() => rt._scrml_reset("nonexistent_cell")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// §C5.19 — Runtime chunk wiring
// ---------------------------------------------------------------------------

describe("C5 §C5.19 — Runtime chunk wiring", () => {
  test("'reset' chunk exists in RUNTIME_CHUNK_ORDER", () => {
    expect(RUNTIME_CHUNK_ORDER).toContain("reset");
  });

  test("'reset' chunk contains _scrml_reset", () => {
    expect(RUNTIME_CHUNKS.reset).toContain("function _scrml_reset");
  });

  test("'core' chunk contains _scrml_default_set and _scrml_init_set (declarations)", () => {
    // Storage maps live in 'core' so module-init calls always resolve.
    // The runtime helper that USES them lives in 'reset' chunk.
    expect(RUNTIME_CHUNKS.core).toContain("function _scrml_default_set");
    expect(RUNTIME_CHUNKS.core).toContain("function _scrml_init_set");
  });

  test("'reset' chunk does NOT live before 'core' (chunk ordering)", () => {
    const coreIdx = RUNTIME_CHUNK_ORDER.indexOf("core");
    const resetIdx = RUNTIME_CHUNK_ORDER.indexOf("reset");
    expect(coreIdx).toBeLessThan(resetIdx);
  });
});
