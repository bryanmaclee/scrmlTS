/**
 * Route Inferrer — F-RI-001 deeper regression tests
 *
 * These tests guard against the cross-file string-literal capture-taint
 * pollution bug fixed in W4 (commit message:
 * "WIP(f-ri-001-deeper): route-inference.ts — structural ExprNode walk in
 * collectReferencedNames").
 *
 * Background:
 *   The S39 boundary-security-fix introduced closure-capture-based taint
 *   propagation in RI Step 5b: a client function that captures (without
 *   calling) a server-tainted function gets server-tainted itself. The
 *   capture set was computed by `collectReferencedNames`, which previously
 *   used `emitStringFromTree(exprNode)` + a regex `/\b[A-Za-z_$]...\b/g`
 *   over the flat string. The regex matched identifier-shaped tokens
 *   INSIDE string-literal content, which then collided with peer server
 *   function names in the global `fnNameToNodeIds` map and falsely
 *   escalated client functions.
 *
 *   The dispatch app exposed this: `transition()` in
 *   `pages/dispatch/load-detail.scrml` contains the string literal
 *   `"/login?reason=unauthorized"`. `app.scrml` declares
 *   `server function login(...)`. The regex extracted `login` as a
 *   "captured" identifier; the cross-file taint loop matched it against
 *   the server fn; transition was tainted; E-RI-002 fired on the
 *   `@errorMessage = result.error` assignment. This only manifested in
 *   directory-compile mode (multi-file RI input) — the S50 narrow
 *   regression tests (single-file fixtures, no peer file with a colliding
 *   server fn name) did not catch it.
 *
 * Suites:
 *   §D — Multi-fn + string-literal collision: a client fn whose body
 *        contains a string literal whose token matches a peer server fn
 *        name in another file. PRE-FIX: E-RI-002 fires. POST-FIX: clean.
 *
 *   §E — Per-fn analysis isolation: two functions in the same file that
 *        do NOT share callees or closure captures; one server-escalated,
 *        one client. The client must NOT inherit any escalation from its
 *        peer. (This is structurally a sanity check for the cross-fn
 *        analysis-state isolation invariant called for in deep-dive §5.1
 *        M5 (C).)
 *
 *   §F — `result.error` member access does not pollute closure captures.
 *        A client fn that branches on `result.error` and assigns
 *        `@x = result.error` — both `error` member-access references —
 *        must not appear in the closure-captures set as the bare token
 *        `error` (member-access property names are not free identifier
 *        references). This is the structural fix's MemberExpr.property
 *        skip behavior.
 *
 * Implementation note: these tests use the real BS+TAB pipeline (tabOn)
 * to build FileASTs with ExprNode populated, then run RI on the result.
 * That mirrors production. The S50 tests at
 * `compiler/tests/unit/route-inference-f-ri-001.test.js` use hand-built
 * legacy-string fixtures; this file deliberately exercises the
 * production code path via real ASTs.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runRI } from "../../src/route-inference.js";

// ---------------------------------------------------------------------------
// Helpers — invoke real BS+TAB to build FileAST with ExprNode populated
// ---------------------------------------------------------------------------

function tabOn(filePath, source) {
  const bsOut = splitBlocks(filePath, source);
  return buildAST(bsOut);
}

function emptyProtectAnalysis() {
  return { views: new Map() };
}

function findFunctionRoute(routeMap, fnName) {
  for (const [, route] of routeMap.functions) {
    // routeMap.functions is keyed by `${filePath}::${spanStart}`. We look up
    // by name via the underlying record. The route entry exposes
    // generatedRouteName which encodes the fn name.
    if (route.generatedRouteName && route.generatedRouteName.includes(fnName)) {
      return route;
    }
  }
  return null;
}

// Helper to find the server-fn record. Server fns get a `generatedRouteName`
// while client fns get `null`. To find a client fn we have to look at the
// raw FunctionRoute by inspecting the stored record. Since runRI's RouteMap
// only exposes FunctionRoute (no fn name), we use a different approach: pull
// the list of routes and identify by boundary and escalation reasons.
//
// For the §D test we just count E-RI-002 errors and assert no client
// transitions were tainted. That's the load-bearing assertion.

// ---------------------------------------------------------------------------
// §D — Multi-fn + string-literal collision (the F-RI-001 deeper bug shape)
// ---------------------------------------------------------------------------

describe("§D — multi-fn cross-file: string-literal token must not capture-taint", () => {
  test("client fn with string literal containing peer server-fn-name token does NOT fire E-RI-002", () => {
    // File A defines `server function login(...)` (the server fn whose name
    // is what the bug used to taint via the string literal).
    const fileA = tabOn(
      "/test/app.scrml",
      `<program>
  \${
    server function login(email, password) {
      return { ok: true }
    }
  }
  <p>app shell</p>
</program>
`,
    );

    // File B contains a CLIENT fn that:
    //  - calls a peer server fn (so it has callees)
    //  - branches on result
    //  - assigns @x on the error path
    //  - has a string literal `"/login?reason=unauthorized"` whose token
    //    `login` collides with the peer server fn from fileA.
    //
    // Pre-fix: `login` was extracted as a closureCapture by the regex,
    //          fnNameToNodeIds.get("login") resolved to fileA's server fn,
    //          taint propagated, E-RI-002 fired.
    // Post-fix: structural walker only visits IdentExpr nodes; the string
    //           literal contributes no captures.
    const fileB = tabOn(
      "/test/page.scrml",
      `<program>
  \${
    @errorMessage = ""
    server function transitionStatusServer(loadId, target) {
      return { ok: true }
    }
    function transition(target) {
      const result = transitionStatusServer(0, target)
      if (result.unauthorized) {
        window.location.href = "/login?reason=unauthorized"
        return
      }
      if (result.error) {
        @errorMessage = result.error
        return
      }
    }
  }
  <p>page</p>
</program>
`,
    );

    const { errors } = runRI({
      files: [fileA, fileB],
      protectAnalysis: emptyProtectAnalysis(),
    });

    const riErrors = errors.filter((e) => e.code === "E-RI-002");
    expect(riErrors).toHaveLength(0);
  });

  test("two files where one mentions peer server-fn name only inside a string literal", () => {
    // Variant: ensure ANY peer server fn name in a string literal is safe.
    // Here fileA exports `server function getCurrentUser` and fileB has
    // `"current-user-cache"` and `"getCurrentUser_cache_key"` as string
    // literals — neither of those (when seen as identifier tokens) should
    // taint `wrapperFn`.
    const fileA = tabOn(
      "/test/auth.scrml",
      `<program>
  \${
    server function getCurrentUser(token) {
      return { id: 1 }
    }
  }
  <p>auth</p>
</program>
`,
    );

    const fileB = tabOn(
      "/test/page.scrml",
      `<program>
  \${
    @user = ""
    function wrapperFn() {
      const cache_key = "getCurrentUser_cache_key"
      const note = "current-user-cache"
      @user = cache_key
    }
  }
  <p>page</p>
</program>
`,
    );

    const { errors } = runRI({
      files: [fileA, fileB],
      protectAnalysis: emptyProtectAnalysis(),
    });

    const riErrors = errors.filter((e) => e.code === "E-RI-002");
    expect(riErrors).toHaveLength(0);
  });

  test("direct identifier reference (not in string) DOES still capture-taint correctly", () => {
    // Negative control: confirm capture-taint still works for legit cases.
    // A client fn that references a peer server fn name via a bare ident
    // (no call, no string) IS a real free-variable capture — and SHOULD
    // propagate server-taint. This pins down that the structural walker
    // doesn't accidentally over-restrict legitimate captures.
    const fileA = tabOn(
      "/test/auth.scrml",
      `<program>
  \${
    server function getSecret() {
      return Bun.env.SECRET
    }
  }
  <p>a</p>
</program>
`,
    );

    const fileB = tabOn(
      "/test/page.scrml",
      `<program>
  \${
    @x = ""
    function consumer() {
      // Real bare-ident capture (no call): \`getSecret\` referenced as a value.
      const ref = getSecret
      @x = ref
    }
  }
  <p>b</p>
</program>
`,
    );

    const { errors } = runRI({
      files: [fileA, fileB],
      protectAnalysis: emptyProtectAnalysis(),
    });

    // The capture is real — capture-taint applies — consumer becomes
    // server-tainted — E-RI-002 fires (consumer assigns @x).
    const riErrors = errors.filter((e) => e.code === "E-RI-002");
    expect(riErrors.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// §E — Per-fn analysis isolation
// ---------------------------------------------------------------------------

describe("§E — per-fn analysis isolation: peer fn server-escalation does not pollute peer fns", () => {
  test("two peer client fns: one with @-assignment, one calling a server fn — no false escalation", () => {
    // Same file. Two independent client fns. peerA calls a server fn but
    // does NOT assign @-vars. peerB assigns @-vars but does NOT call any
    // server fn. Neither should escalate.
    const fileAST = tabOn(
      "/test/file.scrml",
      `<program>
  \${
    @msg = ""
    server function fetchData() {
      return { rows: [] }
    }
    function peerA() {
      const data = fetchData()
      const rows = data.rows
      return rows
    }
    function peerB() {
      @msg = "hello"
    }
  }
  <p>x</p>
</program>
`,
    );

    const { routeMap, errors } = runRI({
      files: [fileAST],
      protectAnalysis: emptyProtectAnalysis(),
    });

    const riErrors = errors.filter((e) => e.code === "E-RI-002");
    expect(riErrors).toHaveLength(0);

    // Both peerA and peerB are client.
    const clientCount = [...routeMap.functions.values()].filter(
      (r) => r.boundary === "client",
    ).length;
    const serverCount = [...routeMap.functions.values()].filter(
      (r) => r.boundary === "server",
    ).length;
    expect(serverCount).toBe(1);  // fetchData
    expect(clientCount).toBe(2);  // peerA + peerB
  });

  test("server fn declared first, then peer client fn — analysis order does not affect peer", () => {
    // Verify that the order of fn declarations in a file does not matter.
    // The capture-taint loop iterates analysisMap, and the iteration order
    // shouldn't cause peer pollution.
    const fileAST = tabOn(
      "/test/file.scrml",
      `<program>
  \${
    @count = 0
    server function getCount() {
      return ?{\`SELECT COUNT(*) FROM things\`}.get()
    }
    function increment() {
      @count = @count + 1
    }
  }
  <p>x</p>
</program>
`,
    );

    const { routeMap, errors } = runRI({
      files: [fileAST],
      protectAnalysis: emptyProtectAnalysis(),
    });

    const riErrors = errors.filter((e) => e.code === "E-RI-002");
    expect(riErrors).toHaveLength(0);

    const clientCount = [...routeMap.functions.values()].filter(
      (r) => r.boundary === "client",
    ).length;
    const serverCount = [...routeMap.functions.values()].filter(
      (r) => r.boundary === "server",
    ).length;
    expect(serverCount).toBe(1);
    expect(clientCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §F — MemberExpr.property is not a free-identifier reference
// ---------------------------------------------------------------------------

describe("§F — MemberExpr.property is not a free-identifier reference", () => {
  test("`result.error` member access does not pollute closureCaptures with `error`", () => {
    // If a peer file declares `server function error(...)` (silly but
    // structurally possible), and a client fn has `result.error` as a
    // MemberExpr, the prior regex would have extracted `error` as an
    // identifier and falsely tainted. The structural walker skips
    // MemberExpr.property — so `error` is NOT in closureCaptures.
    const fileA = tabOn(
      "/test/a.scrml",
      `<program>
  \${
    // A server fn whose name happens to also be a common member-access name.
    server function error(code) {
      return ?{\`SELECT * FROM logs WHERE code = \${code}\`}.get()
    }
  }
  <p>a</p>
</program>
`,
    );

    const fileB = tabOn(
      "/test/b.scrml",
      `<program>
  \${
    @errorMessage = ""
    server function doThing() {
      return { error: "oops" }
    }
    function caller() {
      const result = doThing()
      if (result.error) {
        @errorMessage = result.error
        return
      }
    }
  }
  <p>b</p>
</program>
`,
    );

    const { errors } = runRI({
      files: [fileA, fileB],
      protectAnalysis: emptyProtectAnalysis(),
    });

    // No E-RI-002 — caller has no real captures of fileA.error.
    const riErrors = errors.filter((e) => e.code === "E-RI-002");
    expect(riErrors).toHaveLength(0);
  });
});
