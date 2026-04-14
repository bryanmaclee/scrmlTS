/**
 * Batch Planner — PIPELINE Stage 7.5 Scaffold Tests (Slice 2)
 *
 * Slice 2 delivers types, contracts, and a stub planner that returns a
 * well-formed (but empty) BatchPlan. Subsequent slices layer in:
 *   Slice 3 — Tier 1 candidate-set + implicit envelope emission
 *   Slice 4–5 — Tier 2 loop-hoist detection + rewrite
 *   Slice 6 — F9.C mount-hydration synthesis
 *
 * Coverage:
 *   §1  runBatchPlanner returns a well-formed BatchPlan with empty inputs
 *   §2  runBatchPlanner with null depGraph returns empty plan + no errors
 *   §3  nobatchSites populated from sql-query DGNodes flagged nobatch=true
 *   §4  serializeBatchPlan produces stable, deterministic JSON
 *   §5  Deterministic: two planner runs on identical input → identical output
 *   §6  End-to-end: compileScrml populates result.batchPlan
 */

import { describe, test, expect } from "bun:test";
import { runBatchPlanner, serializeBatchPlan } from "../../src/batch-planner.ts";
import { compileScrml } from "../../src/api.js";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// §1
// ---------------------------------------------------------------------------

describe("§1 runBatchPlanner returns a well-formed empty plan", () => {
  test("empty DG → empty plan fields present", () => {
    const { batchPlan, errors } = runBatchPlanner({
      files: [],
      depGraph: { nodes: new Map(), edges: [] },
    });
    expect(batchPlan.coalescedHandlers).toBeInstanceOf(Map);
    expect(batchPlan.coalescedHandlers.size).toBe(0);
    expect(batchPlan.loopHoists).toEqual([]);
    expect(batchPlan.mountHydrate).toBeNull();
    expect(batchPlan.nobatchSites).toBeInstanceOf(Set);
    expect(batchPlan.nobatchSites.size).toBe(0);
    expect(batchPlan.diagnostics).toEqual([]);
    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §2
// ---------------------------------------------------------------------------

describe("§2 runBatchPlanner with null depGraph is safe", () => {
  test("null/undefined depGraph → empty plan, no errors", () => {
    const r1 = runBatchPlanner({ files: [], depGraph: null });
    const r2 = runBatchPlanner({ files: [], depGraph: undefined });
    for (const r of [r1, r2]) {
      expect(r.batchPlan.nobatchSites.size).toBe(0);
      expect(r.batchPlan.loopHoists).toEqual([]);
      expect(r.errors).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// §3
// ---------------------------------------------------------------------------

describe("§3 nobatchSites populated from sql-query nodes flagged nobatch", () => {
  test("sql-query with nobatch=true lands in nobatchSites", () => {
    const nodes = new Map();
    nodes.set("s1", { kind: "sql-query", nobatch: true, query: "SELECT 1" });
    nodes.set("s2", { kind: "sql-query", query: "SELECT 2" });
    nodes.set("f1", { kind: "function", boundary: "server" });
    const { batchPlan } = runBatchPlanner({
      files: [],
      depGraph: { nodes, edges: [] },
    });
    expect(batchPlan.nobatchSites.has("s1")).toBe(true);
    expect(batchPlan.nobatchSites.has("s2")).toBe(false);
    expect(batchPlan.nobatchSites.has("f1")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §4
// ---------------------------------------------------------------------------

describe("§4 serializeBatchPlan produces stable JSON", () => {
  test("empty plan serializes to stable object", () => {
    const { batchPlan } = runBatchPlanner({ files: [], depGraph: null });
    const json = serializeBatchPlan(batchPlan);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual({
      coalescedHandlers: {},
      loopHoists: [],
      mountHydrate: null,
      nobatchSites: [],
      diagnostics: [],
    });
  });

  test("nobatchSites serialized as sorted array of ids", () => {
    const nodes = new Map();
    nodes.set("s3", { kind: "sql-query", nobatch: true });
    nodes.set("s1", { kind: "sql-query", nobatch: true });
    nodes.set("s2", { kind: "sql-query", nobatch: true });
    const { batchPlan } = runBatchPlanner({
      files: [],
      depGraph: { nodes, edges: [] },
    });
    const parsed = JSON.parse(serializeBatchPlan(batchPlan));
    expect(parsed.nobatchSites).toEqual(["s1", "s2", "s3"]);
  });
});

// ---------------------------------------------------------------------------
// §5
// ---------------------------------------------------------------------------

describe("§5 runBatchPlanner is deterministic", () => {
  test("two runs on identical input produce identical serialized output", () => {
    const mkInput = () => {
      const nodes = new Map();
      nodes.set("a", { kind: "sql-query", nobatch: true });
      nodes.set("b", { kind: "sql-query" });
      return { files: [], depGraph: { nodes, edges: [] } };
    };
    const r1 = runBatchPlanner(mkInput());
    const r2 = runBatchPlanner(mkInput());
    expect(serializeBatchPlan(r1.batchPlan)).toBe(serializeBatchPlan(r2.batchPlan));
  });
});

// ---------------------------------------------------------------------------
// §6 end-to-end: compileScrml result exposes batchPlan
// ---------------------------------------------------------------------------

describe("§6 compileScrml result exposes batchPlan", () => {
  test("plain compile run produces a BatchPlan on the result", () => {
    const dir = mkdtempSync(join(tmpdir(), "scrml-bp-"));
    const file = join(dir, "test.scrml");
    writeFileSync(file, [
      '<program db="test.db">',
      "${ server function ping() {",
      "    ?{`SELECT 1`}.run()",
      "} }",
      "</>",
    ].join("\n"));
    try {
      const result = compileScrml({ inputFiles: [file], outputDir: null, write: false, log: () => {} });
      expect(result.batchPlan).toBeDefined();
      expect(result.batchPlan.coalescedHandlers).toBeInstanceOf(Map);
      expect(result.batchPlan.nobatchSites).toBeInstanceOf(Set);
      expect(typeof result.batchPlanJson).toBe("function");
      const json = JSON.parse(result.batchPlanJson());
      expect(json).toHaveProperty("nobatchSites");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Slice 3a — Tier 1 candidate-set detection
// ---------------------------------------------------------------------------

function compileSource(source) {
  const dir = mkdtempSync(join(tmpdir(), "scrml-bp3-"));
  const file = join(dir, "test.scrml");
  writeFileSync(file, source);
  try {
    return compileScrml({ inputFiles: [file], outputDir: null, write: false, log: () => {} });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("§7 Tier 1: 2 SQL sites in a non-! server fn → prepare-lock-only group", () => {
  test("non-! handler with 2 queries → group with envelopeKind=prepare-lock-only", () => {
    const src = [
      '<program db="test.db">',
      "${ server function load(id) {",
      "    let a = ?{`SELECT * FROM users WHERE id = ${id}`}.get()",
      "    let b = ?{`SELECT * FROM posts WHERE user_id = ${id}`}.all()",
      "    return { a, b }",
      "} }",
      "</>",
    ].join("\n");
    const result = compileSource(src);
    const groups = result.batchPlan.coalescedHandlers.get("load") ?? [];
    expect(groups.length).toBe(1);
    expect(groups[0].envelopeKind).toBe("prepare-lock-only");
    expect(groups[0].nodes.length).toBeGreaterThanOrEqual(2);
  });
});

describe("§8 Tier 1: `!` handler with 2 SQL sites → implicit-handler-tx", () => {
  test("! handler envelopeKind=implicit-handler-tx", () => {
    const src = [
      '<program db="test.db">',
      "${ server function load(id)! {",
      "    let a = ?{`SELECT * FROM users WHERE id = ${id}`}.get()",
      "    let b = ?{`SELECT * FROM posts WHERE user_id = ${id}`}.all()",
      "    return { a, b }",
      "} }",
      "</>",
    ].join("\n");
    const result = compileSource(src);
    const groups = result.batchPlan.coalescedHandlers.get("load") ?? [];
    expect(groups.length).toBe(1);
    expect(groups[0].envelopeKind).toBe("implicit-handler-tx");
  });
});

describe("§9 Tier 1: single SQL site does NOT coalesce", () => {
  test("one query, no group emitted", () => {
    const src = [
      '<program db="test.db">',
      "${ server function one(id) {",
      "    return ?{`SELECT * FROM users WHERE id = ${id}`}.get()",
      "} }",
      "</>",
    ].join("\n");
    const result = compileSource(src);
    expect(result.batchPlan.coalescedHandlers.size).toBe(0);
  });
});

describe("§10 Tier 1: `.nobatch()` excludes a site from the group", () => {
  test("2 queries, one .nobatch() → only 1 eligible → no group", () => {
    const src = [
      '<program db="test.db">',
      "${ server function load(id) {",
      "    let a = ?{`SELECT * FROM users WHERE id = ${id}`}.nobatch().get()",
      "    let b = ?{`SELECT * FROM posts WHERE user_id = ${id}`}.all()",
      "    return { a, b }",
      "} }",
      "</>",
    ].join("\n");
    const result = compileSource(src);
    expect(result.batchPlan.coalescedHandlers.size).toBe(0);
  });

  test("3 queries, one .nobatch() → 2 eligible → group emitted", () => {
    const src = [
      '<program db="test.db">',
      "${ server function load(id) {",
      "    let a = ?{`SELECT * FROM users WHERE id = ${id}`}.nobatch().get()",
      "    let b = ?{`SELECT * FROM posts WHERE user_id = ${id}`}.all()",
      "    let c = ?{`SELECT * FROM tags WHERE user_id = ${id}`}.all()",
      "    return { a, b, c }",
      "} }",
      "</>",
    ].join("\n");
    const result = compileSource(src);
    const groups = result.batchPlan.coalescedHandlers.get("load") ?? [];
    expect(groups.length).toBe(1);
    expect(groups[0].nodes.length).toBe(2);
  });
});

describe("§11 E-BATCH-001: `!` handler with implicit envelope AND transaction { }", () => {
  test("both implicit coalescing and explicit transaction → E-BATCH-001", () => {
    // Parser produces a bare-expr from `transaction { ... }` in some
    // function-body configurations, so we invoke runBatchPlanner directly
    // against a hand-built AST that exercises the exact candidate shape.
    const funcDecl = {
      kind: "function-decl",
      name: "mixed",
      isServer: true,
      canFail: true,
      body: [
        { kind: "let-decl", init: "?{`SELECT 1`}.get()" },
        { kind: "let-decl", init: "?{`SELECT 2`}.all()" },
        {
          kind: "transaction-block",
          body: [{ kind: "sql", query: "UPDATE counters SET hits = hits + 1", chainedCalls: [{ method: "run", args: "" }] }],
        },
      ],
    };
    const file = { ast: { nodes: [funcDecl] } };
    const { errors } = runBatchPlanner({ files: [file], depGraph: null });
    const batchErrors = errors.filter((e) => e.code === "E-BATCH-001");
    expect(batchErrors.length).toBe(1);
    expect(batchErrors[0].message).toContain("transaction { }");
    expect(batchErrors[0].message).toContain("mixed");
  });
});

describe("§12 W-BATCH-001: explicit `?{BEGIN}` suppresses implicit envelope", () => {
  test("handler with ?{BEGIN} + 2 coalescing SQL sites → W-BATCH-001", () => {
    const src = [
      '<program db="test.db">',
      "${ server function manual(id) {",
      "    ?{`BEGIN`}",
      "    let a = ?{`SELECT * FROM users WHERE id = ${id}`}.get()",
      "    let b = ?{`SELECT * FROM posts WHERE user_id = ${id}`}.all()",
      "    ?{`COMMIT`}",
      "    return { a, b }",
      "} }",
      "</>",
    ].join("\n");
    const result = compileSource(src);
    const warns = result.warnings.filter((w) => w.code === "W-BATCH-001");
    expect(warns.length).toBe(1);
    expect(warns[0].message).toContain("manual");
    // No coalescing group recorded when envelope is suppressed
    expect(result.batchPlan.coalescedHandlers.get("manual") ?? []).toEqual([]);
  });
});

describe("§13 Tier 1: SQL inside transaction { } is excluded from coalescing", () => {
  test("2 SQL inside transaction, 0 outside → no coalescing group, no error", () => {
    // Direct AST — sidestep the parser's handling of `transaction { }` in
    // function bodies and exercise scanHandler's exclusion rule.
    const funcDecl = {
      kind: "function-decl",
      name: "onlyTx",
      isServer: true,
      canFail: true,
      body: [
        {
          kind: "transaction-block",
          body: [
            { kind: "sql", query: "UPDATE a SET n = n + 1", chainedCalls: [{ method: "run", args: "" }] },
            { kind: "sql", query: "UPDATE b SET n = n + 1", chainedCalls: [{ method: "run", args: "" }] },
          ],
        },
      ],
    };
    const file = { ast: { nodes: [funcDecl] } };
    const { batchPlan, errors } = runBatchPlanner({ files: [file], depGraph: null });
    expect(errors.filter((e) => e.code === "E-BATCH-001").length).toBe(0);
    expect(batchPlan.coalescedHandlers.size).toBe(0);
  });
});

describe("§14 Tier 1: non-server function is ignored", () => {
  test("plain function (client-side) does not enter candidate set", () => {
    const src = [
      '<program db="test.db">',
      "${ function clientSide() {",
      "    // client-side; no SQL here by RI §12.2 anyway",
      "    return 42",
      "} }",
      "</>",
    ].join("\n");
    const result = compileSource(src);
    expect(result.batchPlan.coalescedHandlers.size).toBe(0);
  });
});

describe("§15 Tier 1: deterministic route-id ordering in serialized plan", () => {
  test("two handlers serialized in sorted order", () => {
    const src = [
      '<program db="test.db">',
      "${ server function zebra(id) {",
      "    let a = ?{`SELECT 1`}.get()",
      "    let b = ?{`SELECT 2`}.all()",
      "    return { a, b }",
      "}",
      "server function alpha(id) {",
      "    let a = ?{`SELECT 1`}.get()",
      "    let b = ?{`SELECT 2`}.all()",
      "    return { a, b }",
      "} }",
      "</>",
    ].join("\n");
    const result = compileSource(src);
    const json = JSON.parse(result.batchPlanJson());
    const keys = Object.keys(json.coalescedHandlers);
    expect(keys).toEqual(["alpha", "zebra"]);
  });
});
