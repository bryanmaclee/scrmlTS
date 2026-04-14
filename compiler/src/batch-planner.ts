/**
 * Batch Planner — PIPELINE Stage 7.5
 *
 * Implements §8.9 per-handler coalescing, §8.10 N+1 loop hoisting, and
 * §8.11 mount-hydration coalescing. Runs between Stage 7 (DG) and Stage 8
 * (CG) on the finalized, lift-checked dependency graph.
 *
 * Slice 3a: Tier 1 candidate-set detection (§8.9.1). Walks each file's
 * function-decl bodies, counts SQL sites (both `kind: "sql"` AST nodes
 * and string-embedded `?{...}` inside let-decl / return / other
 * expression fields), filters out `.nobatch()` sites and sites nested
 * inside `transaction-block` children, and emits CoalescingGroups with
 * envelopeKind determined by the enclosing function's `canFail` flag.
 *
 * Side effects detected:
 *   E-BATCH-001 — server handler contains BOTH an implicit coalescing
 *                 envelope AND an explicit `transaction { }` block.
 *   W-BATCH-001 — server handler contains explicit `?{BEGIN}` alongside
 *                 would-be implicit coalescing (suppresses the envelope).
 *
 * Tier 2 loop hoisting, F9.C __mountHydrate synthesis, and CG emission
 * are future slices.
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
// Input / output contracts (duck-typed at the boundary)
// ---------------------------------------------------------------------------

interface FileInput {
  filePath?: string;
  ast?: unknown;
  nodes?: unknown[];
}

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
// Helpers — AST walkers
// ---------------------------------------------------------------------------

/** Best-effort extraction of the top-level AST nodes from a FileInput. */
function getFileNodes(file: unknown): unknown[] {
  if (!file || typeof file !== "object") return [];
  const f = file as FileInput & { nodes?: unknown[]; ast?: FileInput };
  if (Array.isArray(f.nodes)) return f.nodes;
  if (f.ast && typeof f.ast === "object") {
    const nested = (f.ast as { nodes?: unknown[] }).nodes;
    if (Array.isArray(nested)) return nested;
  }
  return [];
}

/**
 * Recursive walker that applies `visit` to every AST node reachable from
 * the given root. Skips `span` fields and non-object values. Returns
 * nothing; mutations to `visit`'s closure are the output.
 *
 * `visit` returns:
 *   - `false` to skip descending into this node's children
 *   - anything else (undefined, true) to continue descending
 */
function walkAst(root: unknown, visit: (node: Record<string, unknown>) => boolean | void): void {
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    if (Array.isArray(cur)) {
      for (let i = cur.length - 1; i >= 0; i--) stack.push(cur[i]);
      continue;
    }
    const node = cur as Record<string, unknown>;
    const descend = visit(node) !== false;
    if (!descend) continue;
    for (const k of Object.keys(node)) {
      if (k === "span" || k === "id") continue;
      // Skip structured ExprNode mirror fields whose string form is also
      // present on the same node (`init`/`initExpr`, `value`/`valueExpr`,
      // `expr`/`exprNode`, etc.). The SQL-in-string scanner reads the
      // string form; descending into the ExprNode would double-count.
      if (k === "exprNode" || k.endsWith("Expr")) continue;
      const v = node[k];
      if (v && typeof v === "object") stack.push(v);
    }
  }
}

/**
 * Count `?{...}` SQL occurrences in a string (string-embedded SQL,
 * outside structured SQLNodes). Supports the `?{...}` form with
 * balanced braces; tolerates `.nobatch()` by subtracting those sites.
 *
 * Returns { total, nobatchCount, beginLiteral } where:
 *   total — number of `?{` occurrences (raw site count)
 *   nobatchCount — sites followed by .nobatch()
 *   beginLiteral — true if any occurrence looks like `?{BEGIN...`
 */
function scanStringSql(s: string): { total: number; nobatch: number; beginLiteral: boolean } {
  if (!s || typeof s !== "string") return { total: 0, nobatch: 0, beginLiteral: false };
  let total = 0;
  let nobatch = 0;
  let beginLiteral = false;
  // `?{` then backtick, raw SQL body (any char except backtick — SQL can
  // legitimately contain `}` from ${…} interpolation, so we don't use
  // `[^}]` here), backtick, `}`, optional chain of `.method(args)` calls.
  // The tokenizer's re-emitter inserts whitespace around punctuation,
  // so chain matching is whitespace-tolerant.
  const re = /\?\{`([^`]*)`\}((?:\s*\.\s*\w+\s*\([^)]*\))*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    total++;
    const body = m[1] ?? "";
    const chain = m[2] ?? "";
    if (/\bBEGIN\b/i.test(body.trim())) beginLiteral = true;
    if (/\.\s*nobatch\s*\(\s*\)/.test(chain)) nobatch++;
  }
  return { total, nobatch, beginLiteral };
}

interface HandlerScan {
  /** Distinct SQL sites that would participate in a coalescing group. */
  sqlSiteIds: NodeId[];
  /** Total SQL sites observed, including those excluded for nobatch. */
  totalSqlSites: number;
  /** Sites marked .nobatch(). */
  nobatchSites: number;
  /** True if the handler body contains an explicit `transaction { }` block. */
  hasTransactionBlock: boolean;
  /** True if the handler body contains an explicit `?{BEGIN}` literal. */
  hasExplicitBegin: boolean;
}

/**
 * Walk a function-decl body and summarize its SQL usage. A site is
 * considered "coalescing-eligible" when it is NOT nested inside a
 * transaction-block child AND it is NOT flagged .nobatch().
 *
 * Because the AST interleaves structured SQLNodes (top-level `?{}`
 * statements) with string-form SQL (embedded inside let-decl init and
 * other expression fields), both are counted. Structured sites produce
 * a stable NodeId from the AST node's `id` field; string sites produce
 * synthetic IDs of the form `${funcName}#str-${n}` for reporting.
 */
function scanHandler(funcDecl: Record<string, unknown>, funcName: string): HandlerScan {
  const scan: HandlerScan = {
    sqlSiteIds: [],
    totalSqlSites: 0,
    nobatchSites: 0,
    hasTransactionBlock: false,
    hasExplicitBegin: false,
  };

  // Set of node object references for every SQL node inside a
  // transaction-block — those are excluded from the candidate set.
  const inTransaction = new WeakSet<object>();

  // First pass — mark every SQLNode that is (transitively) inside a
  // `transaction-block` child, and record transaction-block presence.
  walkAst(funcDecl.body, (node) => {
    if (node.kind === "transaction-block") {
      scan.hasTransactionBlock = true;
      walkAst(node.body, (inner) => {
        if (inner.kind === "sql") inTransaction.add(inner);
        return true;
      });
      return false; // don't re-descend; we've already marked inner SQL
    }
    return true;
  });

  // Second pass — count SQL sites (structured + string), honor .nobatch(),
  // skip transaction-nested SQL.
  let stringSiteCounter = 0;
  walkAst(funcDecl.body, (node) => {
    // Structured SQL node
    if (node.kind === "sql") {
      scan.totalSqlSites++;
      const nodeQuery = typeof node.query === "string" ? node.query : "";
      if (/\bBEGIN\b/i.test(nodeQuery.trim())) scan.hasExplicitBegin = true;
      if (inTransaction.has(node as object)) return true;
      if (node.nobatch === true) {
        scan.nobatchSites++;
        return true;
      }
      const id = typeof node.id === "number" || typeof node.id === "string"
        ? (node.id as NodeId)
        : `${funcName}#sql-${scan.sqlSiteIds.length}`;
      scan.sqlSiteIds.push(id);
      return true;
    }
    // String-embedded SQL — look at any string field that might contain `?{...}`
    for (const k of Object.keys(node)) {
      if (k === "span" || k === "kind" || k === "id") continue;
      const v = node[k];
      if (typeof v !== "string") continue;
      if (v.indexOf("?{") < 0) continue;
      const { total, nobatch, beginLiteral } = scanStringSql(v);
      if (total === 0) continue;
      scan.totalSqlSites += total;
      if (beginLiteral) scan.hasExplicitBegin = true;
      const eligible = total - nobatch;
      scan.nobatchSites += nobatch;
      for (let i = 0; i < eligible; i++) {
        scan.sqlSiteIds.push(`${funcName}#str-${stringSiteCounter++}`);
      }
    }
    return true;
  });

  return scan;
}

// ---------------------------------------------------------------------------
// runBatchPlanner — entry point
// ---------------------------------------------------------------------------

/**
 * Produce a BatchPlan for the given pipeline state.
 *
 * Slice 3a: populates `coalescedHandlers` from per-file AST traversal.
 * For each server function-decl, a CoalescingGroup is emitted iff two
 * or more SQL sites are coalescing-eligible (not inside a
 * transaction-block, not marked .nobatch()). The group's envelopeKind
 * reflects the enclosing function's `canFail` flag.
 *
 * Side effects emitted:
 *   E-BATCH-001 when an implicit envelope would be synthesized but the
 *     same handler contains an explicit `transaction { }`.
 *   W-BATCH-001 when an implicit envelope would be synthesized but the
 *     handler contains an explicit `?{BEGIN}` that suppresses it.
 *
 * Postconditions:
 *   - Result is a well-formed BatchPlan with all fields present.
 *   - Deterministic across runs.
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

  // Seed nobatchSites from DG sql-query nodes carrying the flag
  // (forward-looking — DG does not yet propagate .nobatch() today).
  const dg = input.depGraph;
  if (dg && dg.nodes) {
    for (const [nodeId, node] of dg.nodes) {
      if (!node || typeof node !== "object") continue;
      const n = node as { kind?: string; nobatch?: boolean };
      if (n.kind === "sql-query" && n.nobatch === true) {
        batchPlan.nobatchSites.add(nodeId);
      }
    }
  }

  // Candidate-set detection per file per server function-decl
  for (const file of input.files ?? []) {
    const topNodes = getFileNodes(file);

    // Collect every server function-decl (anywhere in the file tree, since
    // they can be nested inside markup/logic blocks).
    walkAst(topNodes, (node) => {
      if (node.kind !== "function-decl") return true;
      if (!node.isServer) return true;

      const funcName = typeof node.name === "string" ? node.name : "<anonymous>";
      const canFail = node.canFail === true;
      const routeId: RouteId = funcName;

      const scan = scanHandler(node, funcName);

      // Coalescing applies when 2+ eligible SQL sites exist
      if (scan.sqlSiteIds.length < 2) return true;

      // §19.10.5: explicit `?{BEGIN}` suppresses the implicit envelope (W-BATCH-001)
      if (scan.hasExplicitBegin) {
        errors.push({
          code: "W-BATCH-001",
          severity: "warning",
          message:
            `Server handler '${funcName}' contains an explicit ?{BEGIN} that suppresses ` +
            `the implicit per-handler transaction (§19.10.5). ` +
            `Use transaction { } or .nobatch() for clarity.`,
          span: node.span,
        });
        return true;
      }

      // §8.9.2: implicit envelope MUST NOT compose with explicit transaction { } (E-BATCH-001)
      const envelopeKind: "implicit-handler-tx" | "prepare-lock-only" =
        canFail ? "implicit-handler-tx" : "prepare-lock-only";

      if (canFail && scan.hasTransactionBlock) {
        errors.push({
          code: "E-BATCH-001",
          severity: "error",
          message:
            `Server handler '${funcName}' contains both an implicit per-handler ` +
            `transaction (§8.9.2) — synthesized because ${scan.sqlSiteIds.length} ` +
            `SQL queries are coalescing candidates — and an explicit ` +
            `transaction { } block. Either .nobatch() the outer queries or wrap ` +
            `the full handler body in transaction { }.`,
          span: node.span,
        });
        // Still record the group so tests can verify the candidate set;
        // CG slice will refuse to emit the envelope when errors exist.
      }

      const existing = batchPlan.coalescedHandlers.get(routeId) ?? [];
      existing.push({ nodes: [...scan.sqlSiteIds], envelopeKind });
      batchPlan.coalescedHandlers.set(routeId, existing);

      return true;
    });
  }

  return { batchPlan, errors };
}

// ---------------------------------------------------------------------------
// serializeBatchPlan — stable JSON form for `--emit-batch-plan` / tests.
// ---------------------------------------------------------------------------

export function serializeBatchPlan(plan: BatchPlan): string {
  const sortedHandlers = Array.from(plan.coalescedHandlers.entries()).sort(
    ([a], [b]) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0),
  );
  const obj = {
    coalescedHandlers: Object.fromEntries(sortedHandlers),
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
