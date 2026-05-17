/**
 * Route Inference (RI) — `server { ... }` block stub rewriter — Unit Tests
 *
 * Coverage for the A2-FOLLOWUP rewriter (S99 — A2-anomaly-2-surfaced) in
 * `compiler/src/route-inference.ts:rewriteServerBlockStubs`.
 *
 * Background. A2 (commit c4fc98a) populated body+params on `export function`
 * synth stubs. The seeds-style idiom `export function foo() { server { ... } }`
 * (see examples/23-trucking-dispatch/seeds.scrml runSeeds) wraps a function body
 * in a `server { ... }` block. The parser has no `server-block` AST node; the
 * `server { ... }` text becomes a single `bare-expr` whose `exprNode` is
 * `{kind:"ident", name:"server"}` and whose raw `expr` text holds the entire
 * wrapped body (with embedded `?{}` BLOCK_REFs rendered as
 * `__scrml_sql_placeholder__`).
 *
 * Two downstream consequences post-A2:
 *   1. TS's bare-expr scope walker fires E-SCOPE-001 on `server`.
 *   2. RI's `walkBodyForTriggers` extracts `"server"` from exprNode and misses
 *      the embedded `?{}` SQL operations that would otherwise fire Trigger 1.
 *
 * Fix: pre-pass rewrites malformed bare-expr stubs — clears `exprNode = null`
 * so TS skips the scope check, RI falls through to the raw `expr` string,
 * SERVER_ONLY_PATTERNS detects `?{}`, function escalates server-bound.
 *
 * SPEC anchor: §12.2 Trigger 1 — `?{}` SQL context escalates the enclosing
 * function. The `server { ... }` wrapper is developer-facing intent, a
 * transparent wrapper that semantically matches §12.2's body-content rule.
 *
 * Tests:
 *   §1  export function foo() { server { ?{} } }       → server-bound
 *   §2  bare    function foo() { server { ?{} } }      → server-bound
 *   §3  export function foo() { server { ?{} bar() } } → escalates;
 *                                                        bar() (server fn)
 *                                                        also server-bound
 *   §4  function foo() { return a + b }                → stays client
 *   §5  function foo() { server { ?{} } let x = 1 }    → escalates
 *   §6  Rewriter idempotency — running RI twice safe
 *   §7  Server-block stub mark — exprNode cleared, expr preserved
 */

import { describe, test, expect } from "bun:test";
import { runRI } from "../../src/route-inference.js";

// ---------------------------------------------------------------------------
// Construction helpers (minimal, follows route-inference.test.js conventions)
// ---------------------------------------------------------------------------

function span(start, file = "/test/app.scrml") {
  return { file, start, end: start + 10, line: 1, col: start + 1 };
}

function makeFunctionDecl({
  name,
  params = [],
  body = [],
  isServer = false,
  fnKind = "function",
  spanStart = 10,
  file = "/test/app.scrml",
  exported = false,
  fromExport = false,
}) {
  return {
    id: spanStart,
    kind: "function-decl",
    name,
    params,
    body,
    fnKind,
    isServer,
    span: span(spanStart, file),
    ...(exported ? { exported: true } : {}),
    ...(fromExport ? { fromExport: true } : {}),
  };
}

/**
 * Build the bare-expr shape produced by parseLogicBody when it encounters
 * a `server { ... }` block inside a function body. exprNode is the parser's
 * surface form (ident "server") and `expr` is the raw textual reconstruction
 * including any embedded `?{}` placeholders.
 */
function makeServerBlockStub(rawExpr, spanStart = 20, file = "/test/app.scrml") {
  return {
    id: spanStart,
    kind: "bare-expr",
    expr: rawExpr,
    exprNode: { kind: "ident", name: "server" },
    span: span(spanStart, file),
  };
}

function makeBareExpr(expr, spanStart = 20, file = "/test/app.scrml", exprNode = null) {
  return {
    id: spanStart,
    kind: "bare-expr",
    expr,
    ...(exprNode ? { exprNode } : {}),
    span: span(spanStart, file),
  };
}

function makeFileAST(filePath, fnNodes) {
  return {
    filePath,
    nodes: [
      {
        id: 1,
        kind: "logic",
        body: fnNodes,
        span: span(0, filePath),
      },
    ],
    imports: [],
    exports: [],
    components: [],
    typeDecls: [],
    spans: new Map(),
  };
}

function emptyProtectAnalysis() {
  return { views: new Map() };
}

function getRoute(routeMap, filePath, spanStart) {
  return routeMap.functions.get(`${filePath}::${spanStart}`);
}

// ---------------------------------------------------------------------------
// §1 — export function foo() { server { ?{} } } → server-bound
// ---------------------------------------------------------------------------

describe("§1 — export function with server { ?{} } block promotes to server-bound", () => {
  test("export function runSeeds() { server { ?{INSERT ...} } } escalates via Trigger 1", () => {
    const fn = makeFunctionDecl({
      name: "runSeeds",
      exported: true,
      fromExport: true,
      body: [
        // The bare-expr shape that parseLogicBody produces — see the dispatch
        // brief and the rewriter docstring in route-inference.ts.
        makeServerBlockStub(
          "server {\nconst demoHash = hashPassword ( \"demo\" )\n" +
          "?{`INSERT INTO users (email) VALUES ('a@b.c')`}\n. run ( )\n}",
          20,
        ),
      ],
    });
    const fileAST = makeFileAST("/test/app.scrml", [fn]);
    const { routeMap, errors } = runRI({
      files: [fileAST],
      protectAnalysis: emptyProtectAnalysis(),
    });

    const route = getRoute(routeMap, "/test/app.scrml", 10);
    expect(route).toBeDefined();
    expect(route.boundary).toBe("server");
    // Trigger 1 — server-only-resource (sql-query) detected via the raw expr
    // text. The rewriter cleared exprNode so walkBodyForTriggers fell through
    // to the raw `expr` string where SERVER_ONLY_PATTERNS[0] (`/\?\{/`)
    // matched.
    const sqlTriggers = route.escalationReasons.filter(
      (r) => r.kind === "server-only-resource" && r.resourceType === "sql-query"
    );
    expect(sqlTriggers.length).toBeGreaterThanOrEqual(1);
    // No fatal RI errors fire on this function — the rewriter neutralises
    // the spurious `server` ident so TS won't fire E-SCOPE-001 either.
    expect(
      errors.filter((e) => e.severity === "error" || (!e.severity && !String(e.code ?? "").startsWith("W-")))
    ).toHaveLength(0);
  });

  test("rewriter clears the misleading exprNode on the malformed bare-expr", () => {
    const stub = makeServerBlockStub("server {\n?{`SELECT 1`}\n. get ( )\n}", 20);
    const fn = makeFunctionDecl({
      name: "stub",
      exported: true,
      fromExport: true,
      body: [stub],
    });
    const fileAST = makeFileAST("/test/app.scrml", [fn]);
    runRI({ files: [fileAST], protectAnalysis: emptyProtectAnalysis() });

    // The rewriter mutates the AST in place. After runRI, the stub's
    // exprNode is null and the marker __serverBlockStub is set.
    expect(stub.exprNode).toBeNull();
    expect(stub.__serverBlockStub).toBe(true);
    // The raw expr is preserved verbatim so RI's walkBodyForTriggers can
    // still pattern-match the embedded `?{}`.
    expect(stub.expr).toContain("?{");
  });
});

// ---------------------------------------------------------------------------
// §2 — bare function foo() { server { ?{} } } also promotes
// ---------------------------------------------------------------------------

describe("§2 — non-export function with server { ?{} } block also promotes", () => {
  test("function runSeeds() { server { ?{} } } (no `export`) escalates", () => {
    // Uniform application: both `export function` and bare `function` produce
    // the same malformed bare-expr shape post-A2. The rewriter is unconditional.
    const fn = makeFunctionDecl({
      name: "runSeeds",
      // No exported / fromExport — pure inline function.
      body: [
        makeServerBlockStub(
          "server {\n?{`UPDATE jobs SET status = 'done'`}\n. run ( )\n}",
          20,
        ),
      ],
    });
    const fileAST = makeFileAST("/test/app.scrml", [fn]);
    const { routeMap } = runRI({
      files: [fileAST],
      protectAnalysis: emptyProtectAnalysis(),
    });

    const route = getRoute(routeMap, "/test/app.scrml", 10);
    expect(route.boundary).toBe("server");
  });
});

// ---------------------------------------------------------------------------
// §3 — nested: export function foo() { server { bar() } } where bar() is also server-bound
// ---------------------------------------------------------------------------

describe("§3 — nested: outer fn server-block referencing inner server fn", () => {
  test("export function foo() { server { ?{} bar() } } promotes; bar() also server-bound", () => {
    // The brief specifies: "Nested: `export function foo() { server { bar() } }`
    // where `bar()` is also server-bound."
    //
    // bar() has its own `?{}` body and escalates via Trigger 1 on its own
    // right. foo() references bar() inside its server-block. The rewriter
    // clears foo()'s exprNode but the raw text still contains both `?{}` and
    // `bar(`. SERVER_ONLY_PATTERNS matches the `?{` and pushes Trigger 1.
    const bar = makeFunctionDecl({
      name: "bar",
      spanStart: 100,
      body: [makeBareExpr("?{`SELECT 1`}.get()", 110)],
    });
    const foo = makeFunctionDecl({
      name: "foo",
      exported: true,
      fromExport: true,
      spanStart: 10,
      body: [
        makeServerBlockStub(
          "server {\n?{`INSERT INTO log VALUES ('foo')`}\n. run ( )\nbar ( )\n}",
          20,
        ),
      ],
    });
    const fileAST = makeFileAST("/test/app.scrml", [foo, bar]);
    const { routeMap } = runRI({
      files: [fileAST],
      protectAnalysis: emptyProtectAnalysis(),
    });

    const fooRoute = getRoute(routeMap, "/test/app.scrml", 10);
    const barRoute = getRoute(routeMap, "/test/app.scrml", 100);

    expect(fooRoute.boundary).toBe("server");
    // bar() has its own ?{} so it escalates independently via its own body.
    expect(barRoute.boundary).toBe("server");
  });
});

// ---------------------------------------------------------------------------
// §4 — Non-export, non-server function does NOT promote
// ---------------------------------------------------------------------------

describe("§4 — function with no server block stays client", () => {
  test("export function compute() { return a + b } stays client (no escalation)", () => {
    const fn = makeFunctionDecl({
      name: "compute",
      exported: true,
      fromExport: true,
      body: [
        // A plain bare-expr — exprNode is a binary expression, not the
        // server-block ident shape. The rewriter must NOT touch this node.
        makeBareExpr("a + b", 20, "/test/app.scrml", {
          kind: "binary",
          op: "+",
          left: { kind: "ident", name: "a" },
          right: { kind: "ident", name: "b" },
        }),
      ],
    });
    const fileAST = makeFileAST("/test/app.scrml", [fn]);
    const { routeMap } = runRI({
      files: [fileAST],
      protectAnalysis: emptyProtectAnalysis(),
    });

    const route = getRoute(routeMap, "/test/app.scrml", 10);
    expect(route).toBeDefined();
    expect(route.boundary).toBe("client");
    expect(route.escalationReasons).toHaveLength(0);
  });

  test("function with bare-expr exprNode = ident(\"server\") but no `{` in expr is NOT rewritten", () => {
    // Edge case: if someone wrote `server` as a bare reference (impossible
    // in scrml normally, but defensive), the rewriter must NOT clear the
    // exprNode because there's no wrapping `{` brace. The brief specifies
    // the rewriter is conservative: pattern is exactly `server\s*\{`.
    const stub = {
      id: 20,
      kind: "bare-expr",
      expr: "server",
      exprNode: { kind: "ident", name: "server" },
      span: span(20),
    };
    const fn = makeFunctionDecl({
      name: "weird",
      body: [stub],
    });
    const fileAST = makeFileAST("/test/app.scrml", [fn]);
    runRI({ files: [fileAST], protectAnalysis: emptyProtectAnalysis() });

    // Rewriter did NOT touch this node — exprNode is still the ident.
    // (TS will still fire E-SCOPE-001 on this — that's the correct behavior
    // for a true undeclared `server` ident; the rewriter is a targeted
    // fix for the structural `server { ... }` block stub only.)
    expect(stub.exprNode).toEqual({ kind: "ident", name: "server" });
    expect(stub.__serverBlockStub).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §5 — Mixed body: server block + other statements
// ---------------------------------------------------------------------------

describe("§5 — mixed body: server block plus sibling statements", () => {
  test("function with server { ?{} } followed by client-shape stmts still escalates", () => {
    // Per the brief: "Mixed: function with both server block + client logic —
    // body is dual-domain per RI rules."
    //
    // RI escalates the whole function as soon as ANY trigger fires (Trigger 1
    // here from the `?{}` inside the server block). The sibling let-decl
    // doesn't matter for routing — the function lands on the server because
    // ?{} is a server-only resource per SPEC §12.2.
    const fn = makeFunctionDecl({
      name: "dual",
      exported: true,
      fromExport: true,
      body: [
        makeServerBlockStub(
          "server {\n?{`SELECT id FROM users`}\n. all ( )\n}",
          20,
        ),
        {
          id: 30,
          kind: "let-decl",
          name: "x",
          init: "1",
          span: span(30),
        },
      ],
    });
    const fileAST = makeFileAST("/test/app.scrml", [fn]);
    const { routeMap } = runRI({
      files: [fileAST],
      protectAnalysis: emptyProtectAnalysis(),
    });

    const route = getRoute(routeMap, "/test/app.scrml", 10);
    expect(route.boundary).toBe("server");
  });
});

// ---------------------------------------------------------------------------
// §6 — Rewriter idempotency
// ---------------------------------------------------------------------------

describe("§6 — rewriter idempotency", () => {
  test("running runRI twice on the same AST does not double-mutate", () => {
    const stub = makeServerBlockStub(
      "server {\n?{`SELECT 1`}\n. get ( )\n}",
      20,
    );
    const fn = makeFunctionDecl({
      name: "stub",
      exported: true,
      fromExport: true,
      body: [stub],
    });
    const fileAST = makeFileAST("/test/app.scrml", [fn]);

    runRI({ files: [fileAST], protectAnalysis: emptyProtectAnalysis() });
    // First run mutated the AST.
    expect(stub.exprNode).toBeNull();
    expect(stub.__serverBlockStub).toBe(true);

    // Second run: same input, mutated AST. The rewriter's guard
    // (`if (!exprNode || ...)`) makes it idempotent.
    const result2 = runRI({
      files: [fileAST],
      protectAnalysis: emptyProtectAnalysis(),
    });
    expect(stub.exprNode).toBeNull();
    expect(stub.__serverBlockStub).toBe(true);

    // Function still classifies as server.
    const route = getRoute(result2.routeMap, "/test/app.scrml", 10);
    expect(route.boundary).toBe("server");
  });
});

// ---------------------------------------------------------------------------
// §7 — Server-block stub mark + expr preservation
// ---------------------------------------------------------------------------

describe("§7 — rewriter postcondition: marker set, expr preserved, exprNode null", () => {
  test("postcondition shape on a rewritten bare-expr", () => {
    const originalExpr = "server {\nconst x = 1\n?{`INSERT INTO t VALUES (1)`}\n. run ( )\n}";
    const stub = makeServerBlockStub(originalExpr, 20);
    const fn = makeFunctionDecl({
      name: "stub",
      body: [stub],
    });
    const fileAST = makeFileAST("/test/app.scrml", [fn]);
    runRI({ files: [fileAST], protectAnalysis: emptyProtectAnalysis() });

    expect(stub.__serverBlockStub).toBe(true);
    expect(stub.exprNode).toBeNull();
    // expr text is the source of truth for downstream RI passes.
    expect(stub.expr).toBe(originalExpr);
    expect(stub.kind).toBe("bare-expr");
  });
});
