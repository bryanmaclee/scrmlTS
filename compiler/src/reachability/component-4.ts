/**
 * @module reachability/component-4
 *
 * Component 4 — `auth_gated_boundaries_visible_to(role)` per SPEC §40.9.5.
 *
 * S90 wave A-2.5 — given an `AuthGraph` (per-file enumerated gates +
 * resolved role enum; from A-3.1 + A-3.2 + optionally A-3.3 classification)
 * and the compile-unit `FileAST[]`, compute:
 *
 *   1. The effective role-variant list. When `authGraph.roleEnum` is null
 *      or `roleEnum.isImplicitAnonymous === true`, the effective list is
 *      `["_anonymous"]` (PIPELINE Stage 7.6 line 2380 canonical name).
 *      Otherwise the list is `roleEnum.variants` (in declaration order).
 *
 *   2. A per-gate, per-role visibility verdict
 *      (`"in"` / `"out"` / `"runtime-fallback"`) per §40.9.5 normative
 *      statements. Verdicts are computed once per gate and cached
 *      in `RoleClassificationsByGate`.
 *
 *   3. A per-markup-node ancestry index mapping every markup node id in
 *      the compile unit to the set of gate node ids that contain it
 *      (ancestor chain). Component-4 consumers (the orchestrator's
 *      per-role ChunkPlan filter) use this to decide whether a
 *      component / reactive-cell / server-fn / vendor-unit lives inside
 *      a gate body and therefore depends on the gate's per-role verdict.
 *
 *   4. Diagnostics: `W-AUTH-RUNTIME-FALLBACK` (info-level) per gate
 *      classified as runtime-fallback (OQ-A2-I ratification — RS fires);
 *      `E-CLOSURE-002` (error) when `isImplicitAnonymous === true` AND
 *      any non-anonymous-binary gate is present (OQ-A2-F ratification —
 *      RS fires).
 *
 * **Classification rules (§40.9.5 normative):**
 *
 *   - Binary auth gates — `<program auth="required">`, `<page auth="required">`,
 *     `<channel auth="required">`. `_anonymous` role → OUT; every other
 *     role → IN. `auth="optional"` → all roles IN (gate is non-blocking).
 *
 *   - Variant-referencing auth-role-block gates — `<auth role="X">`.
 *     When A-3.3 has populated `gate.classification`:
 *       - `closed_form: true` — for each role variant, IN if
 *         `variant ∈ gated_for_role`; OUT otherwise.
 *       - `closed_form: false` — RUNTIME-FALLBACK for ALL roles
 *         (W-AUTH-RUNTIME-FALLBACK fires once per gate).
 *     When A-3.3 has NOT landed (`gate.classification === null`) — the
 *     sibling A-3.3 dispatch may land before, after, or never. The
 *     conservative default is RUNTIME-FALLBACK for ALL roles, matching
 *     §40.9.5's `auth check=...` runtime-fallback semantics. This is
 *     also the correct behavior at the v0.3 grammar level: until A-3.3
 *     lands its predicate evaluator, the only way to know a closed-form
 *     classification is to trust the A-3.3 verdict; absence of verdict
 *     means "compiler cannot statically resolve" — exactly the
 *     runtime-fallback condition.
 *
 * **Empty-role + no-role-enum (OQ-A2-F ratification):**
 *
 *   - `isImplicitAnonymous && gates.size === 0` — only `_anonymous`
 *     variant; no per-gate work; no diagnostics. The orchestrator falls
 *     through to single-anonymous ChunkPlan emission (matches the
 *     pre-A-2.5 behavior).
 *
 *   - `isImplicitAnonymous && any binary auth gate present` — every
 *     binary gate is OUT for `_anonymous`; no W-AUTH-RUNTIME-FALLBACK
 *     for binary gates (these ARE statically closed-form). No
 *     `E-CLOSURE-002` for this case — implicit-anonymous + binary gates
 *     is a coherent shape (the gated content is just dropped for the
 *     anonymous viewer; the redirect target is its own entry point).
 *
 *   - `isImplicitAnonymous && any variant-referencing auth-role-block
 *     gate present` — `E-CLOSURE-002` fires (OQ-A2-F ratification). The
 *     gate cannot be classified against a non-existent role enum. The
 *     gate's per-role classification is RUNTIME-FALLBACK for
 *     `_anonymous` (conservative; user sees both the error AND the
 *     fallback diagnostic).
 *
 * **Determinism:** gates iterate in insertion order (A-3.1 walk order);
 * roles iterate in declaration order (RoleEnum.variants); per-gate
 * per-role verdicts are produced in nested deterministic order.
 *
 * **Pure:** does not mutate inputs. Returns fresh Maps / Sets / arrays.
 *
 * Cross-references:
 *   - SPEC.md §40.9.5 — normative semantics + W-AUTH-RUNTIME-FALLBACK trigger.
 *   - SPEC.md §40.1.1 — static role classification mirror.
 *   - SPEC.md §40.9.11 — diagnostic catalog rows.
 *   - SPEC.md §34 — error codes index.
 *   - docs/changes/a2-reachability-solver-scoping/SCOPING.md §A-2.5 —
 *     sub-task decomposition + OQ-A2-F / OQ-A2-I ratifications.
 *   - docs/changes/a3-auth-graph-scoping/SCOPING.md — AuthGraph contract.
 *   - ../types/auth-graph.ts — AuthGraph + AuthGate + RoleEnum +
 *     RoleClassification shapes.
 *   - ../types/reachability.ts — RSError + RoleVariant + NodeId.
 */

import type { ASTNode, FileAST, MarkupNode } from "../types/ast.ts";
import type {
  AuthGate,
  AuthGraph,
  MarkupNodeId,
  RoleVariant,
} from "../types/auth-graph.ts";
import type { NodeId, RSError } from "../types/reachability.ts";

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

/**
 * Terminal per-role verdict for one gate. Mirrors the three-state
 * classification in `RoleClassificationEntry` from
 * `types/reachability.ts:240` but keyed for the per-gate look-up the
 * orchestrator does at ChunkPlan-filter time.
 */
export type GateVisibility = "in" | "out" | "runtime-fallback";

/**
 * Per-gate, per-role visibility map. Outer key is the gate's markup
 * node id (`AuthGate.nodeId`); inner key is the role variant; value is
 * the terminal verdict.
 *
 * Only gates that A-2.5 has actually classified appear in the outer
 * map. Gates absent from the map fall through to "no gate" semantics
 * (admit unconditionally) at the orchestrator's filter site.
 */
export type GateVisibilityIndex = Map<
  MarkupNodeId,
  Map<RoleVariant, GateVisibility>
>;

/**
 * Per-markup-node ancestry index. For every markup node id in the
 * compile unit, the value is the set of gate node ids whose body
 * (subtree) contains this node — i.e. the chain of gate ancestors.
 *
 * The orchestrator uses this at ChunkPlan-filter time: for each
 * (component, reactive-cell, server-fn, vendor-unit) atom, look up its
 * AST id's ancestry; if any ancestor gate is OUT for the current role,
 * the atom is excluded. RUNTIME-FALLBACK gates do NOT exclude — the
 * atom is included eagerly (per §40.9.5 runtime-fallback semantics).
 *
 * Node ids that have no gate ancestors map to an empty set.
 */
export type GateAncestryIndex = Map<NodeId, Set<MarkupNodeId>>;

/**
 * Component 4's full output bundle.
 *
 *   - `effectiveRoles` — the role-variant list to drive per-role
 *     ChunkPlan emission. Single `_anonymous` entry when no enum or
 *     enum is implicit.
 *   - `gateVisibility` — per-gate per-role verdicts.
 *   - `gateAncestry` — per-markup-node ancestor-gates lookup.
 *   - `errors` — `W-AUTH-RUNTIME-FALLBACK` + `E-CLOSURE-002` diagnostics
 *     accumulated during classification.
 */
export interface Component4Result {
  effectiveRoles: RoleVariant[];
  gateVisibility: GateVisibilityIndex;
  gateAncestry: GateAncestryIndex;
  errors: RSError[];
}

/** Canonical anonymous-viewer role (PIPELINE Stage 7.6 line 2380). */
export const ANONYMOUS_ROLE: RoleVariant = "_anonymous";

// ---------------------------------------------------------------------------
// Top-level Component 4 driver
// ---------------------------------------------------------------------------

/**
 * Compute Component 4's output for the full compile unit.
 *
 * Three phases:
 *
 *   1. Resolve `effectiveRoles` from `authGraph.roleEnum`. If the
 *      auth-graph is null OR the role-enum is implicit-anonymous,
 *      `effectiveRoles = ["_anonymous"]`. Otherwise return the
 *      declared variants in source order.
 *
 *   2. Classify each gate per role into `gateVisibility`. Binary gates
 *      use the AuthSiteKind discriminator; auth-role-block gates use
 *      `AuthGate.classification` from A-3.3 when present, else default
 *      to RUNTIME-FALLBACK.
 *
 *   3. Build `gateAncestry` by walking each file's AST top-down,
 *      tracking the chain of gate-bearing markup nodes. Every markup
 *      node descendant of a gate (including the gate's own id) records
 *      that gate in its ancestry set.
 *
 * `authGraph === null` short-circuits to the no-auth-gates floor
 * (effectiveRoles = ["_anonymous"], empty visibility, empty ancestry,
 * no diagnostics) — matches the unit-test mode where the pipeline
 * bypasses A-3 entirely.
 */
export function computeAuthGatedBoundariesVisibleTo(
  authGraph: AuthGraph | null | undefined,
  files: FileAST[],
): Component4Result {
  // Floor: no auth-graph at all → single anonymous role, nothing gated.
  if (!authGraph) {
    return {
      effectiveRoles: [ANONYMOUS_ROLE],
      gateVisibility: new Map(),
      gateAncestry: new Map(),
      errors: [],
    };
  }

  const errors: RSError[] = [];

  // ---------------------------------------------------------------------
  // Phase 1 — resolve effective role list (A-2.5.a).
  // ---------------------------------------------------------------------
  const effectiveRoles = resolveEffectiveRoles(authGraph);
  const isImplicitAnonymous =
    authGraph.roleEnum === null || authGraph.roleEnum.isImplicitAnonymous;

  // ---------------------------------------------------------------------
  // Phase 2 — classify gates per role (A-2.5.b + A-2.5.c).
  // ---------------------------------------------------------------------
  const gateVisibility: GateVisibilityIndex = new Map();
  // Track whether we've already surfaced E-CLOSURE-002 — fire ONCE per
  // compile unit even if multiple auth-role-block gates are present.
  let eClosure002Fired = false;

  for (const [nodeId, gate] of authGraph.gates) {
    const perRole = classifyGate(gate, effectiveRoles, isImplicitAnonymous);
    gateVisibility.set(nodeId, perRole);

    // A-2.5.c — fire W-AUTH-RUNTIME-FALLBACK when ANY role is
    // runtime-fallback. The diagnostic is per-gate (one fire per gate),
    // not per-role — the user-visible signal is "this gate cannot be
    // statically resolved", independent of how many roles map to it.
    if (anyRuntimeFallback(perRole)) {
      errors.push({
        code: "W-AUTH-RUNTIME-FALLBACK",
        severity: "info",
        message: runtimeFallbackMessage(gate),
        span: gate.span,
      });
    }

    // A-2.5.d — E-CLOSURE-002 fires when implicit-anonymous AND a
    // variant-referencing auth-role-block gate is present. Binary gates
    // (program/page/channel auth="required") are OK with implicit-
    // anonymous — they just drop the gated content for the anonymous
    // viewer. Auth-role-block gates can't classify without a role enum.
    if (
      !eClosure002Fired &&
      isImplicitAnonymous &&
      gate.siteKind === "auth-role-block"
    ) {
      errors.push({
        code: "E-CLOSURE-002",
        severity: "error",
        message:
          "Auth gate uses role-variant predicate (<auth role=...>) but no role enum is declared in the application. " +
          "Declare a `:enum` role type at app scope (the <program> body or a file imported by the entry file) " +
          "per SPEC §40.1.1, OR remove the auth-role-block gate. " +
          `Gate at ${gate.filePath}:${formatLine(gate)}.`,
        span: gate.span,
      });
      eClosure002Fired = true;
    }
  }

  // ---------------------------------------------------------------------
  // Phase 3 — build gate-ancestry index (A-2.5.b support structure).
  // ---------------------------------------------------------------------
  const gateAncestry = buildGateAncestryIndex(authGraph, files);

  return {
    effectiveRoles,
    gateVisibility,
    gateAncestry,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Phase 1 — effective-role resolution (A-2.5.a)
// ---------------------------------------------------------------------------

/**
 * Resolve the effective role-variant list from `authGraph.roleEnum`.
 *
 * Three cases:
 *   - `roleEnum === null` — A-3.2 did not run OR no enum was declared.
 *     Single `_anonymous` variant.
 *   - `roleEnum.isImplicitAnonymous === true` — no enum was declared,
 *     A-3.2 flagged it. Single `_anonymous` variant.
 *   - Otherwise — return `roleEnum.variants` verbatim in declaration
 *     order. The list is required to be non-empty when isImplicitAnonymous
 *     is false (A-3.2's contract); if it's empty we degrade gracefully
 *     to `_anonymous` as a defensive floor.
 */
function resolveEffectiveRoles(authGraph: AuthGraph): RoleVariant[] {
  const re = authGraph.roleEnum;
  if (!re) return [ANONYMOUS_ROLE];
  if (re.isImplicitAnonymous) return [ANONYMOUS_ROLE];
  if (!Array.isArray(re.variants) || re.variants.length === 0) {
    return [ANONYMOUS_ROLE];
  }
  return [...re.variants];
}

// ---------------------------------------------------------------------------
// Phase 2 — per-gate classification (A-2.5.b)
// ---------------------------------------------------------------------------

/**
 * Classify a single gate for every effective role.
 *
 * Decision table by `AuthGate.siteKind`:
 *
 *   - "program-auth" / "page-auth" / "channel-auth" — binary gate:
 *       * role === "_anonymous"  → OUT (anonymous can't see required content)
 *       * role !== "_anonymous"  → IN  (authenticated viewer passes)
 *       * "optional" auth mode   → IN for ALL roles (non-blocking)
 *
 *   - "auth-role-block" — variant-referencing gate:
 *       * `classification === null`        → RUNTIME-FALLBACK for all roles.
 *       * `classification.closed_form === true`
 *           → for each role, IN if role ∈ gated_for_role, else OUT.
 *       * `classification.closed_form === false`
 *           → RUNTIME-FALLBACK for all roles.
 *
 *     **Implicit-anonymous defensive case:** when the role enum is
 *     implicit-anonymous AND the gate is an auth-role-block, the gate's
 *     `classification` cannot be valid (no enum to classify against);
 *     return RUNTIME-FALLBACK for all roles regardless of classification
 *     payload. `E-CLOSURE-002` fires alongside in the orchestrator.
 */
function classifyGate(
  gate: AuthGate,
  effectiveRoles: RoleVariant[],
  isImplicitAnonymous: boolean,
): Map<RoleVariant, GateVisibility> {
  const out = new Map<RoleVariant, GateVisibility>();

  switch (gate.siteKind) {
    case "program-auth":
    case "page-auth":
    case "channel-auth": {
      // Binary gate. "optional" auth mode is non-blocking — admit all
      // roles. "required" (and any other non-"none"/"optional" value)
      // gates against anonymous; non-anonymous passes.
      const mode = gate.role;
      const isOptional = mode === "optional";
      for (const role of effectiveRoles) {
        if (isOptional) {
          out.set(role, "in");
        } else if (role === ANONYMOUS_ROLE) {
          out.set(role, "out");
        } else {
          out.set(role, "in");
        }
      }
      return out;
    }
    case "auth-role-block": {
      // Variant-referencing gate. Without a real role enum (implicit-
      // anonymous) we can't classify against the enum — RUNTIME-FALLBACK
      // for all roles. The orchestrator also fires E-CLOSURE-002.
      if (isImplicitAnonymous) {
        for (const role of effectiveRoles) {
          out.set(role, "runtime-fallback");
        }
        return out;
      }

      const cls = gate.classification;
      // A-3.3 hasn't landed or hasn't populated this gate — conservative
      // default per A-2.5 interop spec: RUNTIME-FALLBACK for all roles.
      if (cls === null) {
        for (const role of effectiveRoles) {
          out.set(role, "runtime-fallback");
        }
        return out;
      }
      if (cls.closed_form === false) {
        // Async-check / non-foldable predicate — runtime-fallback.
        for (const role of effectiveRoles) {
          out.set(role, "runtime-fallback");
        }
        return out;
      }
      // Closed-form — per-role IN/OUT.
      const gatedFor = cls.gated_for_role;
      for (const role of effectiveRoles) {
        out.set(role, gatedFor.has(role) ? "in" : "out");
      }
      return out;
    }
  }
}

function anyRuntimeFallback(perRole: Map<RoleVariant, GateVisibility>): boolean {
  for (const v of perRole.values()) {
    if (v === "runtime-fallback") return true;
  }
  return false;
}

function runtimeFallbackMessage(gate: AuthGate): string {
  const line = formatLine(gate);
  return (
    `Auth gate predicate at ${gate.filePath}:${line} cannot be statically resolved against the role enum; ` +
    `gate ships eagerly with runtime check. ` +
    `(Predicate: ${gate.rawPredicate}.) ` +
    "Resolution: refactor the gate to use a closed-form role-variant predicate (e.g. `<auth role=\"Admin\">`), " +
    "OR accept the eager-ship default and the runtime auth-check cost. (SPEC §40.9.5.)"
  );
}

function formatLine(gate: AuthGate): string | number {
  const span = gate.span as { line?: number } | undefined;
  if (span && typeof span.line === "number") return span.line;
  return "?";
}

// ---------------------------------------------------------------------------
// Phase 3 — gate ancestry index
// ---------------------------------------------------------------------------

/**
 * Build a per-markup-node ancestry index from the compile-unit `files`
 * and the gates enumerated in `authGraph.gates`.
 *
 * Walks each file's AST top-down. Maintains a stack of currently-active
 * gate node ids. When a markup node IS a gate (`gates.has(node.id)`),
 * push the gate id onto the stack; visit children; pop. For every
 * markup node visited, record the current stack as that node's ancestry.
 *
 * **Gate ids that aren't markup-node ids** (defensive): the auth-graph
 * is sourced from markup-node walks, so every `nodeId` key in
 * `gates` is a `MarkupNode.id`. The walker is robust to test scenarios
 * that pass a synthetic gates map without matching AST presence.
 *
 * **Node id forms:** the ancestry index is keyed by `NodeId = string | number`.
 * We register only the raw form (typeof from `MarkupNode.id` is
 * `number`). Component 1 / Component 2 / etc. all carry the raw form
 * through to ChunkContents, so a single form suffices.
 *
 * Determinism: walk is depth-first source-order; ancestry sets are
 * insertion-ordered (Set semantics).
 */
function buildGateAncestryIndex(
  authGraph: AuthGraph,
  files: FileAST[],
): GateAncestryIndex {
  const out: GateAncestryIndex = new Map();

  // Gate node ids are MarkupNodeId (numeric). We hold them in a Set for
  // O(1) membership lookup during the walk.
  const gateIds = new Set<MarkupNodeId>(authGraph.gates.keys());

  for (const file of files) {
    if (!file) continue;
    const nodes = getTopLevelNodes(file);
    const stack: MarkupNodeId[] = [];
    for (const n of nodes) {
      walkAncestry(n, gateIds, stack, out);
    }
  }

  return out;
}

function walkAncestry(
  node: ASTNode,
  gateIds: Set<MarkupNodeId>,
  stack: MarkupNodeId[],
  out: GateAncestryIndex,
): void {
  if (!node || typeof node !== "object" || node.kind !== "markup") return;
  const m = node as MarkupNode;

  // Record this node's ancestry — a fresh Set per node so consumers
  // can mutate without aliasing. Empty stack → empty set (no gates).
  const ancestors = new Set<MarkupNodeId>(stack);
  out.set(m.id, ancestors);
  // Also register the stringified form — NodeId tolerates either.
  // (Mirrors component-5's componentToFile dual-key registration.)
  const sId: NodeId = String(m.id);
  if (!out.has(sId)) out.set(sId, ancestors);

  // Push this node's id onto the stack if it's a gate, then recurse.
  const isGate = gateIds.has(m.id);
  if (isGate) stack.push(m.id);
  for (const child of m.children) {
    walkAncestry(child, gateIds, stack, out);
  }
  if (isGate) stack.pop();
}

// ---------------------------------------------------------------------------
// Consumer helper — per-(node, role) visibility filter
// ---------------------------------------------------------------------------

/**
 * Decide whether a single atom (component / reactive-cell / server-fn /
 * vendor-unit lookup hook) is visible to `role` given the gate
 * visibility + ancestry indices.
 *
 * Rules:
 *   - If `nodeId` has no ancestors in `gateAncestry` (or no entry at
 *     all — synthetic ids from worst-case-union admission), the atom is
 *     unconditionally visible (IN). This preserves the pre-A-2.5
 *     behavior for non-gated content.
 *   - For each ancestor gate, look up the gate's per-role verdict:
 *       * Any ancestor "out"               → OUT for this role.
 *       * Any ancestor "runtime-fallback"  → IN for this role (eagerly
 *         shipped per §40.9.5 — the runtime check happens at render).
 *         If both OUT and RUNTIME-FALLBACK ancestors exist, OUT wins
 *         (the stricter ancestor short-circuits — the runtime check
 *         can never re-admit content the user is definitively excluded
 *         from by a parent gate).
 *       * All ancestors "in"               → IN.
 *   - Gates whose `gateVisibility` entry is missing for `role` — defensive
 *     (shouldn't happen given `classifyGate` populates every effective
 *     role) — treat as IN.
 *
 * Exported for the orchestrator's ChunkPlan filter and for direct test
 * coverage.
 */
export function isVisibleForRole(
  nodeId: NodeId,
  role: RoleVariant,
  gateVisibility: GateVisibilityIndex,
  gateAncestry: GateAncestryIndex,
): boolean {
  const ancestors = gateAncestry.get(nodeId) ?? gateAncestry.get(String(nodeId));
  if (!ancestors || ancestors.size === 0) return true;

  for (const gateId of ancestors) {
    const perRole = gateVisibility.get(gateId);
    if (!perRole) continue;
    const verdict = perRole.get(role);
    if (verdict === "out") return false;
    // "in" or "runtime-fallback" → continue the loop; the atom is
    // admitted unless another ancestor returns "out".
  }
  return true;
}

// ---------------------------------------------------------------------------
// Internals — FileAST helper (mirrors entry-points.ts / component-5.ts)
// ---------------------------------------------------------------------------

function getTopLevelNodes(file: FileAST): ASTNode[] {
  if (Array.isArray((file as { nodes?: ASTNode[] }).nodes)) {
    return (file as { nodes: ASTNode[] }).nodes;
  }
  const ast = (file as unknown as { ast?: { nodes?: ASTNode[] } }).ast;
  if (ast && Array.isArray(ast.nodes)) return ast.nodes;
  return [];
}
