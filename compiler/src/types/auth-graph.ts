/**
 * @module types/auth-graph
 *
 * AuthGraph — PIPELINE Stage 7.55-ish (post-BP, pre-RS) type surface.
 *
 * Authored S90 wave A-3.1 — auth-site enumerator + `<auth>` element registration.
 * Only the ENUMERATION-time slice is populated by A-3.1; the classification slice
 * (`closed_form`/`gated_for_role`) and role-enum/redirect surfaces remain stubbed
 * (`null`/empty) until A-3.2 (role enum), A-3.3 (classifier), and A-3.4 (redirect
 * cross-ref) land.
 *
 * Output contract per `docs/changes/a3-auth-graph-scoping/SCOPING.md` §2:
 *
 *   interface AuthGraph {
 *     gates: Map<MarkupNodeId, AuthGate>;
 *     roleEnum: RoleEnum | null;
 *     gateToEntryPoint: Map<MarkupNodeId, EntryPointId>;
 *     redirectTargets: Map<MarkupNodeId, string | null>;
 *     errors: AuthGraphDiagnostic[];
 *   }
 *
 * Hard consumer: A-2.5 Component 4 of the Reachability Solver
 * (`auth_gated_boundaries_visible_to(role)`). Per OQ-A2-I disposition, the
 * `W-AUTH-RUNTIME-FALLBACK` lint fires from A-2.5, NOT here. A-3 carries the
 * `closed_form: false` discriminator + the gate expression through the contract;
 * emission of the runtime-fallback diagnostic is RS territory. Similarly per
 * OQ-A2-F, `E-CLOSURE-002` (no-role-enum-with-auth-gates) fires from A-2.5.
 *
 * Cross-references:
 *   - SCOPING: `docs/changes/a3-auth-graph-scoping/SCOPING.md` (full).
 *   - SPEC.md §40.1.1 — Static role classification (lines 17146-17163).
 *   - SPEC.md §40.9.5 — Component 4 normative statement (lines 17708-17734).
 *   - SPEC.md §40.9.9 — Worked example with `<auth role="admin">` block.
 *   - PIPELINE.md Stage 7.6 — input contract (lines 2340-2348).
 */

import type { Span } from "./ast.js";
import type { ExprNode } from "./ast.js";

// ---------------------------------------------------------------------------
// Primitive aliases
// ---------------------------------------------------------------------------

/**
 * AST node identifier for a gate-bearing MarkupNode (`<program>` / `<page>` /
 * `<auth>` / `<channel>`). Mirrors `MarkupNode.id` from `ast.ts:206` (numeric,
 * stable within a single compile invocation).
 */
export type MarkupNodeId = number;

/**
 * Stable identifier for a single entry point. Mirrors `EntryPointId` from
 * `types/reachability.ts:70`. File-path-anchored — for v0.3 the convention is
 * `<filePath>::<route-or-program-anchor>`; finalized by A-2.2.a.
 */
export type EntryPointId = string;

/**
 * A single variant of the app-scope role enum (SPEC §40.1.1).
 *
 * For applications with no role-enum declared and no auth gates, the
 * solver synthesizes a single anonymous viewer variant
 * (canonically `"_anonymous"` per PIPELINE Stage 7.6 line 2380). A-3
 * surfaces the presence/absence signal via `RoleEnum.isImplicitAnonymous`;
 * A-2.5 acts on it.
 */
export type RoleVariant = string;

// ---------------------------------------------------------------------------
// AuthSiteKind — the four declaration sites enumerated by A-3.1
// ---------------------------------------------------------------------------

/**
 * Which markup site carries the gate. Per SCOPING §2.2:
 *
 *   - `program-auth`     — `<program auth="required">` — file-level request boundary.
 *   - `page-auth`        — `<page auth="required">` — per-page filesystem-routed.
 *   - `auth-role-block`  — `<auth role="admin">...</auth>` — sub-page component gate
 *                          (SPEC §40.9.9 worked example).
 *   - `channel-auth`     — `<channel auth="required">` — WebSocket upgrade gate
 *                          (SPEC §38.5 / §52.13).
 */
export type AuthSiteKind =
  | "program-auth"
  | "page-auth"
  | "auth-role-block"
  | "channel-auth";

// ---------------------------------------------------------------------------
// RoleClassification — closed-form vs runtime-fallback discriminator
// ---------------------------------------------------------------------------

/**
 * Per-gate classification verdict. Either statically classifiable against the
 * role enum (closed_form: true) or requires runtime evaluation
 * (closed_form: false). Populated by A-3.3; A-3.1 emits NO classification
 * (all gates land with `classification: null`).
 *
 * Closed-form: `gated_for_role` is the variant set that PASSES the gate
 * (e.g., for `<auth role="admin">`, `gated_for_role = { Admin }`). A-2.5's
 * per-role traversal: if `role ∈ gated_for_role`, the gated component is IN;
 * else OUT.
 *
 * Runtime-fallback: A-2.5 admits to worst-case (all roles) and fires
 * `W-AUTH-RUNTIME-FALLBACK` per OQ-A2-I disposition.
 */
export type RoleClassification =
  | { closed_form: true;  gated_for_role: Set<RoleVariant> }
  | { closed_form: false; gate_expr: ExprNode | null };

// ---------------------------------------------------------------------------
// AuthGate — per-gate record
// ---------------------------------------------------------------------------

/**
 * Per-gate record stored in `AuthGraph.gates`. Authored at A-3.1 with
 * `classification: null` (set to a real verdict by A-3.3). The `role`,
 * `check`, `else`, and `redirect` fields preserve raw attribute values
 * verbatim — A-3.1 does no interpretation of `role` strings.
 *
 * Per OQ-A3-A (predicate grammar) partial disposition: the walker only
 * RECORDS the `role` attr value as a verbatim string; CLASSIFICATION of
 * that string (single-variant / OR / negation / boolean) is A-3.3
 * territory. A-3.1 stores `role: attrValue` as a string and a separate
 * `gateExpr: ExprNode | null` slot for interpolation-bearing cases.
 */
export interface AuthGate {
  /** Which markup site this gate sits on. */
  siteKind: AuthSiteKind;

  /** AST node id of the gated MarkupNode (program / page / auth-block / channel). */
  nodeId: MarkupNodeId;

  /** Source file path of the gate (mirrors `FileAST.filePath`). */
  filePath: string;

  /** Source span (for diagnostics + downstream A-2.5 W-AUTH-RUNTIME-FALLBACK fire-site). */
  span: Span;

  /**
   * The raw `role=` attribute value verbatim from source, when present.
   * Examples: `"admin"`, `"admin,dispatcher"`, `"${maybeAdmin ? 'admin' : 'guest'}"`,
   * `"required"` (for `program-auth` / `page-auth` / `channel-auth` sites whose
   * role-shaped attr is `auth=` rather than `role=`).
   *
   * A-3.1 NORMALIZES across the four AuthSiteKind variants by promoting:
   *   - `<program auth="required">`  → role: "required"
   *   - `<page auth="required">`     → role: "required"
   *   - `<auth role="admin">`        → role: "admin"
   *   - `<channel auth="required">`  → role: "required"
   *
   * NULL when the gate-bearing attribute is absent (e.g., `<auth>` with no
   * `role=` — malformed gate; A-3.3 will emit E-AUTH-GRAPH-004).
   */
  role: string | null;

  /**
   * Interpolation-bearing role value as an ExprNode. NULL when the role
   * attribute is a plain string literal. A-3.1 currently always leaves this
   * NULL — the attribute-registry pins `supportsInterpolation: false` for
   * `<auth role=>`, so interpolation forms are rejected upstream by VP-1/VP-3
   * before A-3 runs. Slot reserved for OQ-A3-A option (d) (full interpolation
   * grammar) if disposition changes in v0.4+.
   */
  gateExpr: ExprNode | null;

  /**
   * Server-fn reference from `<auth check="fnName">`. NULL when absent.
   * A-3.3 cross-refs to RouteMap.functions; if the fn is async OR not a
   * closed-form predicate over the role enum, the classification becomes
   * runtime-fallback (per SPEC §40.9.5 line 17724).
   */
  check: string | null;

  /**
   * Fallback redirect path from `<auth else=...>` or `<auth redirect=...>`.
   * Per SPEC §40.9.9 worked example, `<auth role="X" else="/login">` is the
   * canonical shape. NULL when absent. A-3.4 cross-refs to `RouteMap.pages`;
   * per OQ-A2-E disposition, NO entry-point synthesis happens here.
   */
  redirect: string | null;

  /**
   * Per-gate classification verdict — populated by A-3.3. A-3.1 emits NULL.
   * A-2.5 reads this to drive per-role visibility traversal.
   */
  classification: RoleClassification | null;

  /**
   * Source-form preserved for diagnostics: the raw attribute value(s) joined
   * for printing (e.g. `role="admin" else="/login"` → `'role="admin"'`).
   * Not normative; the `role` / `check` / `redirect` fields are the
   * authoritative payload.
   */
  rawPredicate: string;
}

// ---------------------------------------------------------------------------
// RoleEnum — the app-scope :enum declaration
// ---------------------------------------------------------------------------

/**
 * The app-scope role enum per SPEC §40.1.1. Single enum in v0.3.0 scope —
 * multiple-role-enums per compilation unit is deferred per §40.9.5 line 17732.
 *
 * Populated by A-3.2 (NOT A-3.1). A-3.1 always returns `roleEnum: null` on
 * the AuthGraph; A-3.2 fills it.
 */
export interface RoleEnum {
  /** :enum type name from app-scope declaration. */
  name: string;
  /** Variants in declaration order — canonical iteration order per §40.9.8 determinism. */
  variants: RoleVariant[];
  /** Source span of the :enum declaration (for diagnostics). */
  span: Span;
  /** Source file path of the :enum declaration. */
  filePath: string;
  /**
   * Anonymous-viewer convention (per §40.9.9 line 17864 + PIPELINE Stage 7.6
   * line 2380): TRUE when NO role enum is declared. A-2.5 acts on this signal
   * — if `true` AND any auth gates are present, A-2.5 fires `E-CLOSURE-002`
   * per OQ-A2-F. If `true` AND no auth gates, A-2.5 treats every entry point
   * as having a single anonymous viewer role.
   */
  isImplicitAnonymous: boolean;
}

// ---------------------------------------------------------------------------
// AuthGraphDiagnostic — structural error surface for A-3
// ---------------------------------------------------------------------------

/**
 * Diagnostic codes raised by A-3 enumeration / classification passes. Per
 * OQ-A2-I disposition, `W-AUTH-RUNTIME-FALLBACK` is NOT in this list — that
 * fires from A-2.5 (RS). Per OQ-A2-F disposition, `E-CLOSURE-002` also fires
 * from A-2.5. A-3's diagnostics are catastrophic-only (structural-malformed
 * gates, malformed role-enum declarations) plus a single info-level
 * cross-ref signal (`I-AUTH-REDIRECT-UNRESOLVED`).
 *
 * Codes:
 *   - `E-AUTH-GRAPH-001` — role-enum declared but malformed (e.g., :enum
 *     decl without variants). Fires from A-3.2.
 *   - `E-AUTH-GRAPH-002` — multiple role enums in same compilation unit
 *     (§40.9.5 deferred-wave error). Fires from A-3.2.
 *   - `E-AUTH-GRAPH-003` — `<auth role="X">` references a role variant
 *     not in the enum. Fires from A-3.3 (needs role-enum to compare).
 *   - `E-AUTH-GRAPH-004` — `<auth>` block without `role=` AND without
 *     `check=` attribute (malformed gate). Fires from A-3.3.
 *   - `I-AUTH-REDIRECT-UNRESOLVED` — info-level: a gate carries a redirect
 *     target path that does NOT match any URL pattern in `RouteMap.pages`.
 *     Per OQ-A2-E + OQ-A3-B (a) S90 ratification this is INFORMATIONAL ONLY:
 *     the redirect target is its own entry-point and its absence is the
 *     page-author's concern, NOT a compile error. Fires from A-3.4
 *     (`crossRefRedirects`). The §34 catalog row for this code will be
 *     added in a later A-3.5 SPEC dispatch.
 *   - `W-AUTH-PAGE-INFERRED` — info-level: a `<page>` lacks an explicit
 *     `auth=` attribute AND the enclosing file's `<program auth=>` is
 *     `"required"`. Per OQ-A3-C (b) S90 ratification (explicit-per-page-only
 *     inheritance + lint nudge), the gate is NOT auto-inherited; the page
 *     ships ungated at the closure-analysis layer (program-level auth still
 *     enforces at the request boundary). The lint nudges adopters to add
 *     explicit per-page `auth=` for closure-analysis correctness. Fires
 *     from A-3.3 (`classifyGates`). The §34 catalog row will be added in
 *     a later A-3.5 SPEC dispatch.
 *   - `W-AUTH-LOGIN-MISSING` — WARNING-level (load-bearing structural-gap
 *     signal): one or more auth gates declare a redirect target but NO
 *     page anywhere in the compilation unit's `RouteMap.pages` matches
 *     ANY redirect target the gates name. Distinct from
 *     `I-AUTH-REDIRECT-UNRESOLVED` — that fires on a per-gate typo basis
 *     (info, gate-local) when a specific redirect path does not resolve;
 *     `W-AUTH-LOGIN-MISSING` fires once per compilation when the structural
 *     gap is total (auth declared, but no working login page exists at all),
 *     and points adopters at `scrml generate auth`. Fires from A-3.4
 *     (`crossRefRedirects`). Per OQ-1 two-tier severity ratification
 *     (03-contact-book-auth-redirect-SCOPING §5).
 *
 * A-3.1 NEVER emits diagnostics — enumeration is best-effort. Malformed
 * gates are recorded in `AuthGraph.gates` with `role: null` and surfaced
 * by A-3.3 during classification. A-3.4 may emit `I-AUTH-REDIRECT-UNRESOLVED`
 * info diagnostics when a gate's redirect target does not match any page
 * URL pattern, AND a single `W-AUTH-LOGIN-MISSING` warning when the gap is
 * total (no auth-redirect target resolves anywhere).
 */
export interface AuthGraphDiagnostic {
  code:
    | "E-AUTH-GRAPH-001"
    | "E-AUTH-GRAPH-002"
    | "E-AUTH-GRAPH-003"
    | "E-AUTH-GRAPH-004"
    | "I-AUTH-REDIRECT-UNRESOLVED"
    | "W-AUTH-LOGIN-MISSING"
    | "W-AUTH-PAGE-INFERRED";
  severity: "error" | "warning" | "info";
  message: string;
  span: Span;
  filePath: string;
}

// ---------------------------------------------------------------------------
// AuthGraph — the top-level output surface
// ---------------------------------------------------------------------------

/**
 * Output of A-3 §40 auth-graph derivation pass. Consumed by A-2.5 (RS
 * Component 4) + A-4 (per-route splitter). Stage 7.55-ish in the pipeline —
 * computed AFTER RI (needs `RouteMap.pages` + `RouteMap.authMiddleware`)
 * and BEFORE RS (A-2.5 consumes the gate set).
 *
 * A-3.1 populates:
 *   - `gates` — fully populated with `AuthGate` entries (classification: null).
 *   - `gateToEntryPoint` — best-effort cross-ref to RouteMap-derived entry-points.
 *
 * A-3.1 leaves stubbed:
 *   - `roleEnum: null` (A-3.2 fills).
 *   - `redirectTargets` (A-3.4 fills via `buildRedirectMap`).
 *   - `errors: []` (A-3.3 / A-3.2 emit).
 */
export interface AuthGraph {
  /**
   * Per-gate classification, keyed by the gate-bearing MarkupNode's id.
   * A-3.1 populates this with `AuthGate` entries; A-3.3 fills in
   * `classification`. The KEY is the markup node's id — this is the
   * stable handle A-2.5 will use to look up gate metadata.
   */
  gates: Map<MarkupNodeId, AuthGate>;

  /**
   * App-scope role enum (SPEC §40.1.1). NULL until A-3.2 runs. Single
   * enum per compilation unit in v0.3.0 scope.
   */
  roleEnum: RoleEnum | null;

  /**
   * Cross-ref: gate MarkupNodeId → entry-point reference. A-3.1 populates
   * best-effort:
   *   - `program-auth` gates → file's program entry-point id.
   *   - `page-auth` gates → the page's own entry-point id (via RouteMap.pages).
   *   - `auth-role-block` gates → the enclosing page's entry-point (via
   *     RouteMap.pages lookup keyed on `filePath`).
   *   - `channel-auth` gates → the file's program entry-point (channel is
   *     file-level per Insight 30 §38.1).
   *
   * Per OQ-A2-E ratified S89: A-3 does NOT synthesize new entry-points
   * for auth-redirect targets. The redirect target's own entry-point
   * exists independently and is resolved via `RouteMap.pages` lookup at
   * A-2.5 / A-4 consumption time.
   */
  gateToEntryPoint: Map<MarkupNodeId, EntryPointId>;

  /**
   * Cross-ref: auth-redirect target. Records the redirect target path
   * VERBATIM (per OQ-A3-B (a) S90 ratification — bare-string disposition,
   * NOT a resolved EntryPointId). Sources:
   *
   *   - `<program auth=... loginRedirect=...>` — program-auth gate (extracted
   *     from `FileAST.authConfig.loginRedirect`).
   *   - `<page auth=... loginRedirect=...>` — page-auth gate (extracted from
   *     the `loginRedirect=` attr on the same `<page>`).
   *   - `<auth role=... else=...>` — auth-role-block gate (extracted from
   *     `else=` or fallback `redirect=` attr per SPEC §40.9.9 worked example).
   *
   * Value is the redirect path string verbatim (e.g. `"/login"`, `"/auth"`),
   * or `null` when the gate has no redirect target. Consumer (A-2.5) is
   * responsible for resolving the path against `RouteMap.pages` if a page
   * lookup is needed.
   *
   * Populated by A-3.4 (`crossRefRedirects`); A-3.1 leaves it EMPTY.
   *
   * Per OQ-A2-E ratified S89: A-3 does NOT synthesize new entry-points
   * for these targets. The redirect target's own entry-point exists
   * independently and is the page-author's concern. A-3.4 emits an
   * info-level `I-AUTH-REDIRECT-UNRESOLVED` diagnostic when a redirect
   * path does not match any URL pattern in `RouteMap.pages` — informational
   * only, not a compile error.
   */
  redirectTargets: Map<MarkupNodeId, string | null>;

  /**
   * Diagnostics emitted during A-3 derivation. Per OQ-A2-I,
   * `W-AUTH-RUNTIME-FALLBACK` is NOT fired here; that fires from A-2.5.
   * A-3's diagnostics are structural-malformed only — `E-AUTH-GRAPH-001..004`
   * per `AuthGraphDiagnostic` codes.
   */
  errors: AuthGraphDiagnostic[];
}

// ---------------------------------------------------------------------------
// AuthGraphOutput — convenience wrapper mirroring RSInput/RSOutput pattern
// ---------------------------------------------------------------------------

/**
 * Convenience wrapper output from `runAuthGraph(files, routeMap)`. Mirrors
 * the RSOutput pattern from `types/reachability.ts:299` for consistency with
 * the wider reachability-pipeline surface.
 *
 * `graph.errors` and `errors` overlap intentionally — `graph.errors` is the
 * in-record artifact (for any future `--emit-auth-graph` JSON output and
 * downstream consumers); `errors` is the api.js-level error stream used by
 * the compile-error aggregator (analogous to `bpResult.errors` for the
 * batch planner).
 */
export interface AuthGraphOutput {
  graph: AuthGraph;
  errors: AuthGraphDiagnostic[];
}
