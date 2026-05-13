/**
 * @module reachability-solver
 *
 * Reachability Solver — PIPELINE Stage 7.6 (SPEC §40.9).
 *
 * Runs between Stage 7.5 (Batch Planner) and Stage 8 (Code Generator)
 * on the finalized, lift-checked dependency graph. Consumes DG +
 * RouteMap + AuthGraph + ServerFnBoundary + VendorUnitDeclarations +
 * RoleEnum + (informational) BatchPlan and produces a per-entry-point
 * per-role ChunkPlan tree per SPEC §40.9.7.
 *
 * **A-2.1 SCAFFOLD ONLY.** This module is the pipeline slot; the
 * algorithm lands across A-2.2 through A-2.7:
 *
 *   - A-2.2 — Component 1: initially_rendered_components + entry-point
 *             enumeration (§40.9.2).
 *   - A-2.3 — Component 2: reactive_dep_closure (§40.9.3).
 *   - A-2.4 — Component 3: server_fn_reachable_within +
 *             interaction-graph projection (§40.9.4).
 *   - A-2.5 — Component 4: auth_gated_boundaries_visible_to +
 *             AuthGraph consumption (§40.9.5).
 *   - A-2.6 — Component 5: vendor_units_used_by (§40.9.6).
 *   - A-2.7 — outer fixed-point operator + E-CLOSURE-001 (§40.9.1).
 *   - A-2.8 — JSON serialization for --emit-reachability (A-2.1 wires
 *             a minimal serializer here so the CLI flag is functional;
 *             A-2.8 upgrades it to canonical key-ordering).
 *
 * The current body returns an empty `ReachabilityRecord` for every
 * input. Determinism + monotonicity (PIPELINE Stage 7.6 lines 2391-2392)
 * are trivially satisfied — the empty record IS the deterministic
 * floor; subsequent waves extend rather than replace.
 *
 * Cross-references:
 *   - SPEC.md §40.9 — Closure Analysis (Minimal Playable Surface).
 *   - SPEC.md §40.9.1 — five-component union + closure fixed point.
 *   - SPEC.md §40.9.11 — E-CLOSURE-001 + W-AUTH-RUNTIME-FALLBACK codes.
 *   - PIPELINE.md Stage 7.6 (lines 2332-2412) — verbatim contract.
 *   - docs/changes/a2-reachability-solver-scoping/SCOPING.md §5 — A-2 wave decomposition.
 */

import {
  type ReachabilityRecord,
  type RSInput,
  type RSOutput,
  type RSError,
  emptyReachabilityRecord,
} from "./types/reachability.ts";

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Run the Stage 7.6 Reachability Solver.
 *
 * **A-2.1 SCAFFOLD:** returns `{ record: emptyReachabilityRecord(), errors: [] }`
 * for every input. Pipeline behavior is unchanged — downstream consumers
 * (A-4 codegen wave) treat the empty record as "no per-route closure
 * available" and fall back to the v0.2 whole-app emission.
 *
 * **Determinism:** identical output for identical input (trivially —
 * no input is examined). PIPELINE Stage 7.6 line 2391.
 *
 * **No mutation:** does not mutate any field of `input`. PIPELINE
 * Stage 7.6 line 2393.
 *
 * **Termination:** O(1). No iteration. PIPELINE Stage 7.6 line 2394.
 *
 * Subsequent waves replace the body in-place; the signature is
 * stable across A-2.x.
 */
export function runReachabilitySolver(input: RSInput): RSOutput {
  // Touch the input to suppress unused-parameter warnings at the
  // type-surface level. The scaffold does not read any field.
  void input;

  const record: ReachabilityRecord = emptyReachabilityRecord();
  const errors: RSError[] = [];

  return { record, errors };
}

// ---------------------------------------------------------------------------
// JSON serialization — A-2.1 minimal scaffold + A-2.8 canonicalization target
// ---------------------------------------------------------------------------

/**
 * Serialize a `ReachabilityRecord` to JSON for the `--emit-reachability`
 * CLI flag.
 *
 * **A-2.1 scaffold:** emits a well-formed empty-shape JSON document.
 * Maps are serialized as objects with sorted string keys; Sets as
 * sorted arrays. The shape mirrors the TypeScript surface verbatim
 * so downstream tests can assert structure without depending on the
 * algorithm.
 *
 * **A-2.8 will replace this body** with the canonical-key-ordering
 * serializer per PIPELINE Stage 7.6 line 2391 determinism invariant.
 * The signature is stable.
 */
export function serializeReachabilityRecord(record: ReachabilityRecord): string {
  const closures: Record<string, unknown> = {};
  // Sort entry-point keys for deterministic output.
  const epKeys = Array.from(record.closures.keys()).sort();
  for (const ep of epKeys) {
    const rps = record.closures.get(ep);
    if (!rps) continue;
    const byRole: Record<string, unknown> = {};
    const roleKeys = Array.from(rps.byRole.keys()).sort();
    for (const role of roleKeys) {
      const plan = rps.byRole.get(role);
      if (!plan) continue;
      byRole[role] = {
        initialChunk: serializeChunkContents(plan.initialChunk),
        prefetchTier1: serializeChunkContents(plan.prefetchTier1),
        prefetchTier2: serializeChunkContents(plan.prefetchTier2),
        prefetchTierN: plan.prefetchTierN.map(serializeChunkContents),
      };
    }
    closures[ep] = { byRole };
  }

  const diagnostics = record.diagnostics.map((d) => ({
    code: d.code,
    severity: d.severity,
    message: d.message,
    ...(d.entryPoint !== undefined ? { entryPoint: d.entryPoint } : {}),
    ...(d.role !== undefined ? { role: d.role } : {}),
  }));

  return JSON.stringify({ closures, diagnostics }, null, 2);
}

function serializeChunkContents(cc: {
  componentNodeIds: Set<unknown>;
  reactiveCellNodeIds: Set<unknown>;
  serverFnNodeIds: Set<unknown>;
  vendorUnitNames: Set<unknown>;
}): Record<string, unknown> {
  return {
    componentNodeIds: sortedArrayFromSet(cc.componentNodeIds),
    reactiveCellNodeIds: sortedArrayFromSet(cc.reactiveCellNodeIds),
    serverFnNodeIds: sortedArrayFromSet(cc.serverFnNodeIds),
    vendorUnitNames: sortedArrayFromSet(cc.vendorUnitNames),
  };
}

function sortedArrayFromSet(set: Set<unknown>): unknown[] {
  return Array.from(set).sort((a, b) => {
    const sa = String(a);
    const sb = String(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });
}
