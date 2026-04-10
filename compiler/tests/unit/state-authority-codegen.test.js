/**
 * State Authority — Codegen (§52.6)
 *
 * Tests for compiler-generated sync infrastructure for server-authoritative
 * reactive variables (`server @var`).
 *
 * Coverage:
 *   §1  Tier 2: initial load emitted for `server @var = loadFn()` (function call init)
 *   §2  Tier 2: no initial load emitted for literal init (W-AUTH-001 case)
 *   §3  Tier 2: optimistic update + rollback structure
 *   §4  Tier 2: server sync stub emitted
 *   §5  Tier 2: no sync for regular @var (non-server reactive decl)
 *   §6  Integration: full pipeline compiles `server @var` without errors
 *   §7  Integration: client JS contains sync infrastructure for server @var
 *   §8  Integration: client JS does NOT contain sync infrastructure for plain @var
 *   §9  Tier 1: authority="server" + table= does not crash the compiler (scaffold)
 *
 * Tests §1–§5 test the emit-sync.ts functions directly (unit).
 * Tests §6–§9 test via the full compile pipeline (integration path through runCG).
 *
 * NOTE on CG output shape: runCG returns { outputs: Map<filePath, { clientJs, serverJs, html, css }> }
 */

import { describe, test, expect } from "bun:test";

// ---------------------------------------------------------------------------
// Direct imports from emit-sync.ts emitters (unit tests §1–§5)
// ---------------------------------------------------------------------------

import {
  emitInitialLoad,
  emitOptimisticUpdate,
  emitServerSyncStub,
} from "../../src/codegen/emit-sync.ts";

// ---------------------------------------------------------------------------
// Full-pipeline imports (integration tests §6–§9)
// ---------------------------------------------------------------------------

import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runCG } from "../../src/code-generator.js";

// ---------------------------------------------------------------------------
// Helpers (full pipeline)
// ---------------------------------------------------------------------------

function makeRouteMap(entries = []) {
  const functions = new Map();
  for (const e of entries) {
    functions.set(e.functionNodeId, e);
  }
  return { functions };
}

function makeDepGraph(nodes = [], edges = []) {
  const nodeMap = new Map();
  for (const n of nodes) {
    nodeMap.set(n.nodeId, n);
  }
  return { nodes: nodeMap, edges };
}

function makeProtectAnalysis(views = new Map()) {
  return { views };
}

/**
 * Parse + build AST from scrml source string.
 */
function parseAST(source, filePath = "/test/app.scrml") {
  const bsResult = splitBlocks(filePath, source);
  const tabResult = buildAST(bsResult);
  return tabResult.ast;
}

/**
 * Compile a scrml source string through the full CG pipeline and return the
 * client JS output string.
 *
 * CG output shape: { outputs: Map<filePath, { clientJs, serverJs, html, css }> }
 */
function compileClientJs(source, filePath = "/test/app.scrml") {
  const ast = parseAST(source, filePath);
  const result = runCG({
    files: [ast],
    routeMap: makeRouteMap(),
    depGraph: makeDepGraph(),
    protectAnalysis: makeProtectAnalysis(),
  });
  const out = result.outputs.get(filePath);
  return out?.clientJs ?? "";
}

/**
 * Compile a scrml source string and return the server JS output string.
 */
function compileServerJs(source, filePath = "/test/app.scrml") {
  const ast = parseAST(source, filePath);
  const result = runCG({
    files: [ast],
    routeMap: makeRouteMap(),
    depGraph: makeDepGraph(),
    protectAnalysis: makeProtectAnalysis(),
  });
  const out = result.outputs.get(filePath);
  return out?.serverJs ?? "";
}

// ---------------------------------------------------------------------------
// §1: Tier 2 — initial load emitted for function-call init
// ---------------------------------------------------------------------------

describe("state-authority-codegen §1: emitInitialLoad — function-call init emits async IIFE", () => {
  test("returns non-empty lines when initExpr contains a function call", () => {
    const lines = emitInitialLoad("cards", "loadCards()");
    expect(lines.length).toBeGreaterThan(0);
  });

  test("output contains async IIFE pattern", () => {
    const lines = emitInitialLoad("cards", "loadCards()");
    const code = lines.join("\n");
    expect(code).toContain("async");
    expect(code).toContain("()");
    expect(code).toContain("await");
    expect(code).toContain("loadCards()");
  });

  test("output contains _scrml_reactive_set call with varName", () => {
    const lines = emitInitialLoad("cards", "loadCards()");
    const code = lines.join("\n");
    expect(code).toContain('_scrml_reactive_set("cards"');
  });

  test("output references the §52.6.1 spec annotation", () => {
    const lines = emitInitialLoad("cards", "loadCards()");
    const code = lines.join("\n");
    expect(code).toContain("§52.6.1");
  });

  test("varName is interpolated correctly — count", () => {
    const lines = emitInitialLoad("count", "fetchCount()");
    const code = lines.join("\n");
    expect(code).toContain("count");
    expect(code).toContain("fetchCount()");
    expect(code).toContain('_scrml_reactive_set("count"');
  });
});

// ---------------------------------------------------------------------------
// §2: Tier 2 — no initial load for literal init (W-AUTH-001 case)
// ---------------------------------------------------------------------------

describe("state-authority-codegen §2: emitInitialLoad — literal init returns empty lines", () => {
  test("returns empty array when initExpr has no function call (literal '0')", () => {
    const lines = emitInitialLoad("count", "0");
    expect(lines).toHaveLength(0);
  });

  test("returns empty array when initExpr is '[]' (no function call)", () => {
    const lines = emitInitialLoad("cards", "[ ]");
    expect(lines).toHaveLength(0);
  });

  test("returns empty array when initExpr is empty string", () => {
    const lines = emitInitialLoad("x", "");
    expect(lines).toHaveLength(0);
  });

  test("returns empty array when initExpr is 'not' (§52.4.3 placeholder)", () => {
    const lines = emitInitialLoad("userProfile", "not");
    expect(lines).toHaveLength(0);
  });

  test("returns non-empty when initExpr has parentheses (function call detection)", () => {
    const lines = emitInitialLoad("data", "getData()");
    expect(lines.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// §3: Tier 2 — optimistic update + rollback structure
// ---------------------------------------------------------------------------

describe("state-authority-codegen §3: emitOptimisticUpdate — optimistic update + rollback", () => {
  test("returns non-empty lines", () => {
    const lines = emitOptimisticUpdate("cards");
    expect(lines.length).toBeGreaterThan(0);
  });

  test("emits _scrml_prev_<varName> tracking variable", () => {
    const lines = emitOptimisticUpdate("cards");
    const code = lines.join("\n");
    expect(code).toContain("_scrml_prev_cards");
  });

  test("emits _scrml_reactive_subscribe call", () => {
    const lines = emitOptimisticUpdate("cards");
    const code = lines.join("\n");
    expect(code).toContain('_scrml_reactive_subscribe("cards"');
  });

  test("subscriber is async function", () => {
    const lines = emitOptimisticUpdate("cards");
    const code = lines.join("\n");
    expect(code).toContain("async function");
  });

  test("emits try/catch for rollback", () => {
    const lines = emitOptimisticUpdate("cards");
    const code = lines.join("\n");
    expect(code).toContain("try {");
    expect(code).toContain("} catch (");
  });

  test("rollback restores prev value via _scrml_reactive_set", () => {
    const lines = emitOptimisticUpdate("cards");
    const code = lines.join("\n");
    // The catch block restores the rollback value
    expect(code).toContain("_scrml_reactive_set");
    expect(code).toContain("_scrml_rollback_cards");
  });

  test("calls _scrml_server_sync_<varName>", () => {
    const lines = emitOptimisticUpdate("cards");
    const code = lines.join("\n");
    expect(code).toContain("_scrml_server_sync_cards");
    expect(code).toContain("await");
  });

  test("references §52.6.2 and §52.6.3 spec annotations", () => {
    const lines = emitOptimisticUpdate("cards");
    const code = lines.join("\n");
    expect(code).toContain("§52.6.2");
    expect(code).toContain("§52.6.3");
  });

  test("different varName — count — is interpolated correctly", () => {
    const lines = emitOptimisticUpdate("count");
    const code = lines.join("\n");
    expect(code).toContain("_scrml_prev_count");
    expect(code).toContain("_scrml_server_sync_count");
    expect(code).toContain("_scrml_rollback_count");
    expect(code).toContain('_scrml_reactive_subscribe("count"');
  });
});

// ---------------------------------------------------------------------------
// §4: Tier 2 — server sync stub
// ---------------------------------------------------------------------------

describe("state-authority-codegen §4: emitServerSyncStub — placeholder sync function", () => {
  test("returns non-empty lines", () => {
    const lines = emitServerSyncStub("cards");
    expect(lines.length).toBeGreaterThan(0);
  });

  test("emits async function named _scrml_server_sync_<varName>", () => {
    const lines = emitServerSyncStub("cards");
    const code = lines.join("\n");
    expect(code).toContain("async function _scrml_server_sync_cards");
  });

  test("stub includes the expected route path comment", () => {
    const lines = emitServerSyncStub("cards");
    const code = lines.join("\n");
    expect(code).toContain("/_scrml/sync/cards");
  });

  test("stub emits console.warn for developer feedback", () => {
    const lines = emitServerSyncStub("cards");
    const code = lines.join("\n");
    expect(code).toContain("console.warn");
  });

  test("stub includes varName in the warning message", () => {
    const lines = emitServerSyncStub("cards");
    const code = lines.join("\n");
    expect(code).toContain("@cards");
  });

  test("different varName — userProfile — interpolated correctly", () => {
    const lines = emitServerSyncStub("userProfile");
    const code = lines.join("\n");
    expect(code).toContain("_scrml_server_sync_userProfile");
    expect(code).toContain("/_scrml/sync/userProfile");
    expect(code).toContain("@userProfile");
  });
});

// ---------------------------------------------------------------------------
// §5: No sync for regular @var (non-server reactive decl)
// ---------------------------------------------------------------------------

describe("state-authority-codegen §5: emitInitialLoad — no sync for empty/non-function init", () => {
  test("plain @var = null produces no initial load (non-server path)", () => {
    // This mirrors how emitReactiveWiring treats regular @var:
    // it does not call emit-sync functions for nodes without isServer: true.
    // Verify by confirming emitInitialLoad("var", "null") returns empty.
    const lines = emitInitialLoad("editingId", "null");
    expect(lines).toHaveLength(0);
  });

  test("emitOptimisticUpdate still accepts varName but produces subscriber — only called for server vars", () => {
    // The wiring layer (emitReactiveWiring) gates calls to emitOptimisticUpdate
    // on isServer === true. This test verifies the emitter itself is pure and
    // does not accidentally suppress output — only the caller gates it.
    const lines = emitOptimisticUpdate("editingId");
    expect(lines.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// §6: Integration — full pipeline compiles `server @var` without errors
// ---------------------------------------------------------------------------

describe("state-authority-codegen §6: full pipeline — server @var compiles without CG errors", () => {
  test("server @cards = loadCards() compiles without errors", () => {
    const source = `<program>
\${ server @cards = loadCards() }
</>`;
    const ast = parseAST(source);
    const result = runCG({
      files: [ast],
      routeMap: makeRouteMap(),
      depGraph: makeDepGraph(),
      protectAnalysis: makeProtectAnalysis(),
    });
    const cgErrors = result.errors.filter(e => e.severity !== "warning");
    expect(cgErrors).toHaveLength(0);
  });

  test("server @count = 0 compiles without CG errors (W-AUTH-001 emitted by TS, not CG)", () => {
    const source = `<program>
\${ server @count = 0 }
</>`;
    const ast = parseAST(source);
    const result = runCG({
      files: [ast],
      routeMap: makeRouteMap(),
      depGraph: makeDepGraph(),
      protectAnalysis: makeProtectAnalysis(),
    });
    // CG-level errors should be empty (W-AUTH-001 is a TS-stage warning)
    const cgErrors = result.errors.filter(e => e.severity !== "warning");
    expect(cgErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §7: Integration — client JS contains sync infrastructure for server @var
//
// NOTE: The scrml tokenizer spaces the interior of function calls:
//   `loadCards()` in source → `loadCards ( )` in the emitted AST init string.
// clientJs assertions for function names use toContain("loadCards") not
// toContain("loadCards()") to avoid the spacing issue.
// ---------------------------------------------------------------------------

describe("state-authority-codegen §7: client JS contains sync infrastructure for server @var", () => {
  test("server @cards = loadCards() → client JS contains sync stub", () => {
    const source = `<program>
\${ server @cards = loadCards() }
</>`;
    const clientJs = compileClientJs(source);
    expect(clientJs).toContain("_scrml_server_sync_cards");
  });

  test("server @cards = loadCards() → client JS contains optimistic update subscriber", () => {
    const source = `<program>
\${ server @cards = loadCards() }
</>`;
    const clientJs = compileClientJs(source);
    expect(clientJs).toContain("_scrml_reactive_subscribe");
    expect(clientJs).toContain("_scrml_prev_cards");
  });

  test("server @cards = loadCards() → client JS contains async initial load IIFE", () => {
    const source = `<program>
\${ server @cards = loadCards() }
</>`;
    const clientJs = compileClientJs(source);
    // The IIFE sets cards from loadCards() on mount
    expect(clientJs).toContain("async");
    expect(clientJs).toContain("loadCards");
    expect(clientJs).toContain('_scrml_reactive_set("cards"');
  });

  test("server @cards = loadCards() → client JS contains §52.6 section annotation", () => {
    const source = `<program>
\${ server @cards = loadCards() }
</>`;
    const clientJs = compileClientJs(source);
    expect(clientJs).toContain("§52.6");
  });

  test("server @count = 0 (literal init) → client JS still contains sync stub and subscriber", () => {
    // Literal init: no initial load IIFE, but stub and optimistic update ARE generated
    const source = `<program>
\${ server @count = 0 }
</>`;
    const clientJs = compileClientJs(source);
    expect(clientJs).toContain("_scrml_server_sync_count");
    expect(clientJs).toContain("_scrml_prev_count");
  });

  test("server @count = 0 (literal init) → client JS does NOT contain async initial load for count", () => {
    // No function call in init → emitInitialLoad returns [] → no IIFE
    const source = `<program>
\${ server @count = 0 }
</>`;
    const clientJs = compileClientJs(source);
    // The IIFE pattern sets the reactive var via await; with no function call, no IIFE is emitted
    const hasCountIife = clientJs.includes('_scrml_reactive_set("count", await');
    expect(hasCountIife).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §8: Integration — client JS does NOT contain sync infrastructure for plain @var
// ---------------------------------------------------------------------------

describe("state-authority-codegen §8: client JS does NOT contain sync for plain @var", () => {
  test("plain @editingId = null → no _scrml_server_sync_ in client JS", () => {
    const source = `<program>
\${ @editingId = null }
</>`;
    const clientJs = compileClientJs(source);
    expect(clientJs).not.toContain("_scrml_server_sync_editingId");
  });

  test("plain @editingId = null → no _scrml_prev_ tracking var in client JS", () => {
    const source = `<program>
\${ @editingId = null }
</>`;
    const clientJs = compileClientJs(source);
    expect(clientJs).not.toContain("_scrml_prev_editingId");
  });

  test("plain @cards = [] → no optimistic update subscriber for cards", () => {
    const source = `<program>
\${ @cards = [] }
</>`;
    const clientJs = compileClientJs(source);
    expect(clientJs).not.toContain("_scrml_server_sync_cards");
    expect(clientJs).not.toContain("_scrml_prev_cards");
  });

  test("mixed: server @cards and plain @editingId → only cards gets sync, not editingId", () => {
    const source = `<program>
\${ server @cards = loadCards() }
\${ @editingId = null }
</>`;
    const clientJs = compileClientJs(source);
    // cards gets sync
    expect(clientJs).toContain("_scrml_server_sync_cards");
    expect(clientJs).toContain("_scrml_prev_cards");
    // editingId does NOT
    expect(clientJs).not.toContain("_scrml_server_sync_editingId");
    expect(clientJs).not.toContain("_scrml_prev_editingId");
  });
});

// ---------------------------------------------------------------------------
// §9: Tier 1 — authority="server" + table= (scaffold: no crash, no SELECT yet)
//
// Tier 1 auto-SELECT is a follow-up implementation task. These tests verify:
//   a) The compiler does not crash on Tier 1 declarations
//   b) No erroneous output is produced
//   c) This test file defines the contract for when Tier 1 lands
//
// When Tier 1 SELECT generation is implemented in emit-server.ts, the
// "does NOT contain" assertions below should be flipped to verify the
// generated SELECT query.
// ---------------------------------------------------------------------------

describe("state-authority-codegen §9: Tier 1 authority='server' — no crash (scaffold)", () => {
  test("state type with authority='server' + table= compiles without crashing", () => {
    // The type system accepts the declaration. CG should not crash.
    // Tier 1 SELECT is a follow-up; this just verifies no fatal errors.
    const source = `<program db="sqlite:./test.db">
\${
  < Card authority="server" table="cards">
    id: number
    title: string
  </>
}
</>`;
    let didThrow = false;
    try {
      const ast = parseAST(source);
      runCG({
        files: [ast],
        routeMap: makeRouteMap(),
        depGraph: makeDepGraph(),
        protectAnalysis: makeProtectAnalysis(),
      });
    } catch (_e) {
      didThrow = true;
    }
    expect(didThrow).toBe(false);
  });

  test("Tier 1 scaffold: server JS does not yet contain auto-SELECT for state type (pre-implementation contract)", () => {
    // This test documents the current state: Tier 1 SELECT is NOT yet generated.
    // When Tier 1 is implemented, this assertion should be updated to
    // expect(serverJs).toContain("SELECT * FROM cards").
    const source = `<program db="sqlite:./test.db">
\${
  < Card authority="server" table="cards">
    id: number
    title: string
  </>
}
</>`;
    const serverJs = compileServerJs(source);
    // Tier 1 SELECT not yet implemented — confirm no phantom SELECT is emitted
    expect(serverJs).not.toContain("SELECT * FROM cards WHERE");
  });
});
