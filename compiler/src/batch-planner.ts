/**
 * Batch Planner — PIPELINE Stage 7.5
 *
 * Implements §8.9 per-handler coalescing, §8.10 N+1 loop hoisting, and
 * §8.11 mount-hydration coalescing. Runs between Stage 7 (DG) and Stage 8
 * (CG) on the finalized, lift-checked dependency graph.
 *
 * This Slice 2 module is the SCAFFOLD — types, input/output contracts,
 * and a stub planner that walks DG sql-query nodes and produces a
 * structured BatchPlan. Candidate-set computation, loop-hoist detection,
 * mount-hydration synthesis, and error emission are stubs (return empty)
 * and will land in subsequent slices.
 *
 * Determinism: same input produces identical BatchPlan.
 * Idempotency: re-running on a BatchPlan-annotated input is a no-op.
 */

// ---------------------------------------------------------------------------
// Public types — mirrored from SPEC.md §8.9 / §8.10 / §8.11 and
// PIPELINE.md Stage 7.5.
// ---------------------------------------------------------------------------

export type NodeId = string | number;
export type RouteId = string;

/**
 * A group of DGNodes in a single server handler that may share a
 * prepare/lock cycle (and, in `!` handlers, a transactional envelope).
 */
export interface CoalescingGroup {
  nodes: NodeId[];
  /**
   * - "implicit-handler-tx": `!` handler → wrap in BEGIN DEFERRED..COMMIT.
   * - "prepare-lock-only": non-`!` handler → share prepare/lock only.
   */
  envelopeKind: "implicit-handler-tx" | "prepare-lock-only";
}

/**
 * A rewritten for-loop-of-.get()/.all() pattern per §8.10.
 */
export interface LoopHoist {
  loopNode: NodeId;
  queryNode: NodeId;
  keyColumn: string;
  /** Key-expression source text (to be upgraded to ExprNode in a later slice). */
  keyExpr: string;
  terminator: "get" | "all";
  rowCacheColumns: Set<string>;
}

/**
 * Diagnostic emitted for Tier 2 near-misses (D-BATCH-001).
 */
export interface BatchDiagnostic {
  code: "D-BATCH-001";
  severity: "info";
  message: string;
  loopNode: NodeId;
  reason: string;
}

/**
 * Error emitted by the planner (§8.9.2, §8.10.6, §8.10.7, §19.10.5).
 */
export interface BatchPlannerError {
  code: "E-BATCH-001" | "E-BATCH-002" | "E-PROTECT-003" | "W-BATCH-001";
  severity: "error" | "warning";
  message: string;
  span?: unknown;
}

/**
 * The first-class output of Stage 7.5.
 */
export interface BatchPlan {
  /** coalescedHandlers[routeId] = groups within that handler. */
  coalescedHandlers: Map<RouteId, CoalescingGroup[]>;
  loopHoists: LoopHoist[];
  /** Synthetic `__mountHydrate` RouteSpec id (§8.11) or null when unused. */
  mountHydrate: RouteId | null;
  /** DGNode IDs carrying the compile-time .nobatch() marker (§8.9.5). */
  nobatchSites: Set<NodeId>;
  diagnostics: BatchDiagnostic[];
}

// ---------------------------------------------------------------------------
// Input / output contracts (duck-typed at the boundary — consumers pass in
// the DG + routeMap shapes already produced by prior stages).
// ---------------------------------------------------------------------------

interface BPInput {
  files: unknown[];
  depGraph: { nodes: Map<NodeId, unknown>; edges: unknown[] } | null | undefined;
  routeMap?: unknown;
  /** PA output, consumed by the protect-column leak check (§8.10.7). */
  protectAnalysis?: unknown;
}

interface BPOutput {
  batchPlan: BatchPlan;
  errors: BatchPlannerError[];
}

// ---------------------------------------------------------------------------
// runBatchPlanner — entry point
// ---------------------------------------------------------------------------

/**
 * Produce a BatchPlan for the given pipeline state. Slice 2 returns an
 * empty plan with the `nobatchSites` set populated from DG `sql-query`
 * nodes carrying the compile-time marker.
 *
 * Postconditions (even for an empty plan):
 *   - Result is a well-formed BatchPlan with all fields present.
 *   - `nobatchSites` is a Set (possibly empty).
 *   - No mutation of input.
 */
export function runBatchPlanner(input: BPInput): BPOutput {
  const batchPlan: BatchPlan = {
    coalescedHandlers: new Map(),
    loopHoists: [],
    mountHydrate: null,
    nobatchSites: new Set(),
    diagnostics: [],
  };
  const errors: BatchPlannerError[] = [];

  const dg = input.depGraph;
  if (!dg || !dg.nodes) {
    return { batchPlan, errors };
  }

  // Slice 2: populate nobatchSites from sql-query DGNodes whose source
  // SQLNode was marked .nobatch() by ast-builder (§8.9.5). DG does not
  // currently propagate the nobatch flag onto its sql-query nodes, so
  // this loop is a forward-looking scaffold — it will start finding
  // entries once a later slice threads the flag through DG construction.
  for (const [nodeId, node] of dg.nodes) {
    if (!node || typeof node !== "object") continue;
    const n = node as { kind?: string; nobatch?: boolean };
    if (n.kind === "sql-query" && n.nobatch === true) {
      batchPlan.nobatchSites.add(nodeId);
    }
  }

  return { batchPlan, errors };
}

// ---------------------------------------------------------------------------
// serializeBatchPlan — stable JSON form for `--emit-batch-plan` / tests.
// ---------------------------------------------------------------------------

export function serializeBatchPlan(plan: BatchPlan): string {
  const obj = {
    coalescedHandlers: Object.fromEntries(
      Array.from(plan.coalescedHandlers.entries()).map(([k, v]) => [k, v]),
    ),
    loopHoists: plan.loopHoists.map((h) => ({
      ...h,
      rowCacheColumns: Array.from(h.rowCacheColumns).sort(),
    })),
    mountHydrate: plan.mountHydrate,
    nobatchSites: Array.from(plan.nobatchSites).sort(),
    diagnostics: plan.diagnostics,
  };
  return JSON.stringify(obj, null, 2);
}
