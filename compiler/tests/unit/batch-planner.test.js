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
