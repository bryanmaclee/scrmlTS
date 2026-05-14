/**
 * @module auth-graph
 *
 * §40 AuthGraph — auth-site enumerator + (TBD A-3.2) role-enum resolver +
 * (TBD A-3.3) per-gate classifier + (S90 A-3.4) auth-redirect cross-ref.
 *
 * S90 wave A-3.1 — auth-site enumeration only. This entry point produces
 * an `AuthGraph` with fully populated `gates` (per-file walk over four
 * AuthSiteKind variants) + best-effort `gateToEntryPoint` cross-ref.
 * Classification (`closed_form`/`gated_for_role`) and role-enum resolution
 * are left stubbed for downstream sub-phases.
 *
 * S90 wave A-3.4 — auth-redirect cross-ref. `crossRefRedirects` walks the
 * enumerated gate set, projects each gate's `redirect` field into the
 * `redirectTargets` map (verbatim path strings per OQ-A3-B (a) S90
 * ratification — no EntryPointId synthesis), and emits info-level
 * `I-AUTH-REDIRECT-UNRESOLVED` diagnostics for any redirect path that
 * does not match a URL pattern in `RouteMap.pages`.
 *
 * Consumer: A-2.5 Component 4 of the Reachability Solver
 * (`auth_gated_boundaries_visible_to(role)`). Per OQ-A2-I disposition, the
 * `W-AUTH-RUNTIME-FALLBACK` lint fires from A-2.5, NOT here. Per OQ-A2-F,
 * `E-CLOSURE-002` (no-role-enum-with-auth-gates) also fires from A-2.5.
 *
 * Pipeline position (per SCOPING §5.3): post-RI, post-TS, post-META, pre-RS.
 * A-3.5 wires this into `api.js` orchestration; A-3.1 + A-3.4 leave the
 * module uncalled by the driver — its only consumers at this stage are
 * the unit tests.
 *
 * Cross-references:
 *   - SCOPING: `docs/changes/a3-auth-graph-scoping/SCOPING.md`.
 *   - SPEC.md §40.1.1 — Static role classification (lines 17146-17163).
 *   - SPEC.md §40.9.5 — Component 4 normative statement (lines 17708-17734).
 *   - SPEC.md §40.9.9 — Worked example with `<auth role="admin">` block.
 *   - SPEC.md §40.4 — `<program>` middleware (loginRedirect default + auth modes).
 *   - PIPELINE.md Stage 7.6 — input contract (lines 2340-2348).
 */

import type {
  AuthGraph,
  AuthGate,
  AuthGraphDiagnostic,
  AuthGraphOutput,
  AuthSiteKind,
  EntryPointId,
  MarkupNodeId,
} from "./types/auth-graph.js";

import type {
  ASTNode,
  AttrNode,
  ChannelDeclNode,
  FileAST,
  MarkupNode,
} from "./types/ast.js";

import type { RouteMap } from "./route-inference.js";

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Run the A-3 §40 auth-graph derivation pass.
 *
 * At A-3.1 this is enumeration-only: walks every `FileAST` and records
 * one `AuthGate` per gate-bearing markup node, normalizing across the
 * four `AuthSiteKind` variants. Classification, role-enum resolution,
 * and redirect cross-ref are left for A-3.2/.3/.4.
 *
 * @param files — per-file ASTs from TAB.
 * @param routeMap — RI output. Used for the `gateToEntryPoint` cross-ref
 *   (PageRoute keys are file paths; we use the file path itself as the
 *   entry-point proxy until A-2.2.a finalizes the EntryPointId shape).
 *   Passed as `null` for unit tests that don't need cross-ref population.
 * @returns `{ graph, errors }` — `graph.errors` and `errors` are kept in
 *   sync (mirrors `RSOutput` pattern from `types/reachability.ts:299`).
 */
export function runAuthGraph(
  files: FileAST[],
  routeMap: RouteMap | null,
): AuthGraphOutput {
  const gates = new Map<MarkupNodeId, AuthGate>();
  const gateToEntryPoint = new Map<MarkupNodeId, EntryPointId>();
  const redirectTargets = new Map<MarkupNodeId, string | null>();
  const errors: AuthGraphDiagnostic[] = [];

  for (const fileAST of files) {
    if (!fileAST) continue;
    enumerateFile(fileAST, routeMap, gates, gateToEntryPoint, errors);
  }

  // A-3.4 — auth-redirect cross-ref. Projects each gate's `redirect`
  // field into the redirectTargets map verbatim (bare string per OQ-A3-B
  // (a) S90 ratification) and emits info-level I-AUTH-REDIRECT-UNRESOLVED
  // diagnostics for any redirect path not present in RouteMap.pages.
  crossRefRedirects(gates, routeMap, redirectTargets, errors);

  const graph: AuthGraph = {
    gates,
    roleEnum: null,           // populated by A-3.2
    gateToEntryPoint,
    redirectTargets,          // populated by A-3.4 above
    errors,
  };

  return { graph, errors };
}

// ---------------------------------------------------------------------------
// Per-file enumeration
// ---------------------------------------------------------------------------

/**
 * Walk one `FileAST` and append each gate-bearing site to the gates map.
 * Covers the four AuthSiteKind variants per SCOPING §2.2:
 *
 *   - `program-auth`     — `fileAST.authConfig.auth != null && != "none"`.
 *   - `page-auth`        — any MarkupNode where `tag === "page"` + `auth` attr.
 *   - `auth-role-block`  — any MarkupNode where `tag === "auth"`.
 *   - `channel-auth`     — any ChannelDeclNode where attrs include `auth`.
 */
function enumerateFile(
  fileAST: FileAST,
  routeMap: RouteMap | null,
  gates: Map<MarkupNodeId, AuthGate>,
  gateToEntryPoint: Map<MarkupNodeId, EntryPointId>,
  _errors: AuthGraphDiagnostic[],
): void {
  // -------------------------------------------------------------------
  // 1. program-auth — driven by FileAST.authConfig + the <program> node.
  //
  // authConfig.auth is "none"|"required"|"optional" (TAB normalization).
  // Per SCOPING §A-3.1.c bullet 1, a gate exists when auth != null && != "none".
  // The "optional" mode is a gate (it gates on session presence; A-3.3 will
  // classify this as closed_form: true / gated_for_role: ALL).
  // -------------------------------------------------------------------

  if (fileAST.authConfig != null && fileAST.authConfig.auth !== "none") {
    const programNode = findProgramNode(fileAST.nodes);
    if (programNode) {
      const gate = buildProgramGate(programNode, fileAST);
      gates.set(programNode.id, gate);
      gateToEntryPoint.set(programNode.id, fileAST.filePath);
    }
  }

  // -------------------------------------------------------------------
  // 2 + 3. Walk all markup nodes for `<page auth=>` and `<auth>` gates.
  //
  // Walker visits the entire AST tree (including nested page/auth bodies).
  // The collector predicate matches both AuthSiteKind variants in one pass.
  // -------------------------------------------------------------------

  walkMarkupNodes(fileAST.nodes, (node) => {
    if (node.tag === "page") {
      const authAttr = findAttr(node.attrs, "auth");
      if (authAttr) {
        const role = readStringAttr(authAttr);
        // Per SCOPING §A-3.1.c bullet 2: page-auth gate exists whenever
        // <page auth=> is present (any value, including "none" — A-3.3
        // will downgrade "none" to non-gating during classification).
        // For consistency with program-auth handling, we skip "none" here.
        if (role !== "none") {
          const gate = buildPageGate(node, fileAST, role, authAttr);
          gates.set(node.id, gate);
          gateToEntryPoint.set(node.id, resolvePageEntryPoint(node, fileAST, routeMap));
        }
      }
    } else if (node.tag === "auth") {
      // SCOPING §A-3.1.c bullet 3: any <auth> block counts as a gate,
      // even when `role=` is absent. A-3.3 will emit E-AUTH-GRAPH-004
      // for malformed (no-role, no-check) cases during classification;
      // A-3.1 only enumerates.
      const gate = buildAuthBlockGate(node, fileAST);
      gates.set(node.id, gate);
      gateToEntryPoint.set(node.id, resolvePageEntryPoint(node, fileAST, routeMap));
    }
  });

  // -------------------------------------------------------------------
  // 4. channel-auth — driven by FileAST.channelDecls + attr lookup.
  //
  // ChannelDeclNode is itself a MarkupNode (kind:"markup", tag:"channel")
  // per `ast.ts:1152` — already walked above. But for clarity + parity
  // with the §38 architecture, we re-walk channelDecls explicitly to
  // catch P3a-inlined channels that the markup walker may have already
  // visited via top-level traversal.
  // -------------------------------------------------------------------

  const channelDecls = fileAST.channelDecls ?? [];
  for (const channel of channelDecls) {
    if (!channel) continue;
    const authAttr = findAttr(channel.attrs, "auth");
    if (!authAttr) continue;
    const role = readStringAttr(authAttr);
    if (role === "none") continue;
    // Skip if already enumerated by the generic markup walker above —
    // channelDecls is a hoisted convenience list, the canonical AST
    // visit happened during walkMarkupNodes.
    if (gates.has(channel.id)) continue;
    const gate = buildChannelGate(channel, fileAST, role, authAttr);
    gates.set(channel.id, gate);
    gateToEntryPoint.set(channel.id, fileAST.filePath);
  }
}

// ---------------------------------------------------------------------------
// AuthGate constructors — one per AuthSiteKind
// ---------------------------------------------------------------------------

/** Build a program-auth gate. The `role` slot carries the auth-mode
 *  verbatim (e.g. "required" / "optional") — A-3.3 will read this as the
 *  predicate during classification. */
function buildProgramGate(programNode: MarkupNode, fileAST: FileAST): AuthGate {
  const authConfig = fileAST.authConfig;
  const role = authConfig ? authConfig.auth : null;
  return {
    siteKind: "program-auth",
    nodeId: programNode.id,
    filePath: fileAST.filePath,
    span: programNode.span,
    role,
    gateExpr: null,
    check: null,
    redirect: authConfig?.loginRedirect ?? null,
    classification: null,
    rawPredicate: `auth="${role ?? ""}"`,
  };
}

/** Build a page-auth gate. `role` carries the auth-mode verbatim from
 *  the `<page auth=>` attr; `redirect` carries `loginRedirect=` when
 *  present on the same `<page>`. */
function buildPageGate(
  pageNode: MarkupNode,
  fileAST: FileAST,
  role: string | null,
  authAttr: AttrNode,
): AuthGate {
  const loginRedirectAttr = findAttr(pageNode.attrs, "loginRedirect");
  const redirect = loginRedirectAttr ? readStringAttr(loginRedirectAttr) : null;
  return {
    siteKind: "page-auth",
    nodeId: pageNode.id,
    filePath: fileAST.filePath,
    span: authAttr.span ?? pageNode.span,
    role,
    gateExpr: null,
    check: null,
    redirect,
    classification: null,
    rawPredicate: `auth="${role ?? ""}"`,
  };
}

/** Build an auth-role-block gate. `role` is the `role=` attr value
 *  verbatim (e.g. "admin", "admin,dispatcher"); `check` is the `check=`
 *  attr value (server-fn ref) when present; `redirect` reads from
 *  `else=` first, then falls back to `redirect=` (both forms accepted
 *  per the registered allow-list). */
function buildAuthBlockGate(authNode: MarkupNode, fileAST: FileAST): AuthGate {
  const roleAttr = findAttr(authNode.attrs, "role");
  const role = roleAttr ? readStringAttr(roleAttr) : null;
  const checkAttr = findAttr(authNode.attrs, "check");
  const check = checkAttr ? readStringAttr(checkAttr) : null;
  const elseAttr = findAttr(authNode.attrs, "else");
  const redirectAttr = findAttr(authNode.attrs, "redirect");
  const redirect = elseAttr
    ? readStringAttr(elseAttr)
    : redirectAttr
      ? readStringAttr(redirectAttr)
      : null;

  // rawPredicate joins the gate-defining attrs for diagnostic printing.
  const parts: string[] = [];
  if (roleAttr) parts.push(`role="${role ?? ""}"`);
  if (checkAttr) parts.push(`check="${check ?? ""}"`);

  return {
    siteKind: "auth-role-block",
    nodeId: authNode.id,
    filePath: fileAST.filePath,
    span: roleAttr?.span ?? checkAttr?.span ?? authNode.span,
    role,
    gateExpr: null,
    check,
    redirect,
    classification: null,
    rawPredicate: parts.length > 0 ? parts.join(" ") : "<malformed>",
  };
}

/** Build a channel-auth gate. Per OQ-A3-D recommendation, channel-auth
 *  is binary closed-form — `role` carries the auth-mode verbatim
 *  ("required"/"optional"), A-3.3 will classify as gated_for_role = ALL
 *  non-anonymous variants. */
function buildChannelGate(
  channelNode: ChannelDeclNode,
  fileAST: FileAST,
  role: string | null,
  authAttr: AttrNode,
): AuthGate {
  return {
    siteKind: "channel-auth",
    nodeId: channelNode.id,
    filePath: fileAST.filePath,
    span: authAttr.span ?? channelNode.span,
    role,
    gateExpr: null,
    check: null,
    redirect: null,
    classification: null,
    rawPredicate: `auth="${role ?? ""}"`,
  };
}

// ---------------------------------------------------------------------------
// A-3.4 — auth-redirect cross-ref
// ---------------------------------------------------------------------------

/**
 * Project each gate's redirect target into the `redirectTargets` map and
 * cross-ref against `RouteMap.pages`. Emits info-level
 * `I-AUTH-REDIRECT-UNRESOLVED` for any redirect path that does NOT match
 * a URL pattern in `RouteMap.pages`.
 *
 * Behaviour (per OQ-A3-B (a) S90 ratification — bare-string disposition):
 *   - Iterate every gate in `gates`.
 *   - Read `gate.redirect` verbatim (already extracted at enumeration time
 *     in build*Gate constructors from `FileAST.authConfig.loginRedirect`,
 *     `<page loginRedirect=>`, or `<auth else=/redirect=>`).
 *   - If the gate has no redirect, store `null` in `redirectTargets`.
 *   - If the gate has a redirect and `routeMap` is provided, scan
 *     `routeMap.pages.values()` for a matching `urlPattern`.
 *   - If no `pages` entry matches the redirect path, emit one
 *     `I-AUTH-REDIRECT-UNRESOLVED` diagnostic per unresolved gate.
 *   - When `routeMap` is `null` (unit-test mode), the projection still
 *     records redirect strings but emits no diagnostics — RouteMap is
 *     required to confirm resolution.
 *
 * Per OQ-A2-E ratified S89: A-3.4 does NOT synthesize new entry-points.
 * The redirect target IS its own entry-point (if it exists in RouteMap);
 * absence is the page-author's concern, surfaced as INFO not ERROR.
 *
 * Per SPEC §40.4 + route-inference.ts:2443: when `<program auth=>` is set
 * but no explicit `loginRedirect=` is provided, RI defaults `loginRedirect`
 * to `"/login"`. A-3.4 preserves this default verbatim — the AuthConfig
 * already carries the resolved string.
 *
 * @param gates           — enumerated gates from A-3.1 (with `gate.redirect`
 *                          already extracted).
 * @param routeMap        — RI output. NULL skips diagnostic emission.
 * @param redirectTargets — output map; populated in-place.
 * @param errors          — diagnostic stream; appended in-place.
 */
function crossRefRedirects(
  gates: Map<MarkupNodeId, AuthGate>,
  routeMap: RouteMap | null,
  redirectTargets: Map<MarkupNodeId, string | null>,
  errors: AuthGraphDiagnostic[],
): void {
  // Build a fast lookup set of URL patterns from RouteMap.pages for
  // O(gates) total cost rather than O(gates × pages).
  const urlPatterns: Set<string> | null = routeMap
    ? collectUrlPatterns(routeMap)
    : null;

  for (const [nodeId, gate] of gates) {
    const redirect = gate.redirect;

    // Always record — null when the gate has no redirect, string verbatim
    // when it does. Consumer (A-2.5) reads this map directly.
    redirectTargets.set(nodeId, redirect);

    // Cross-ref to RouteMap.pages is best-effort. NULL redirect means
    // nothing to resolve. NULL routeMap means we're in unit-test mode
    // and can't verify — skip the diagnostic.
    if (redirect == null) continue;
    if (urlPatterns == null) continue;

    if (!urlPatterns.has(redirect)) {
      errors.push({
        code: "I-AUTH-REDIRECT-UNRESOLVED",
        severity: "info",
        message:
          `Auth gate redirect target "${redirect}" does not match any ` +
          `page URL pattern in the route map. The redirect target's own ` +
          `entry-point must exist independently (per OQ-A2-E — no ` +
          `entry-point synthesis). Add a page at this path, or correct ` +
          `the redirect target.`,
        span: gate.span,
        filePath: gate.filePath,
      });
    }
  }
}

/**
 * Collect the set of URL patterns from `RouteMap.pages` for redirect
 * cross-ref. `pages` is keyed by file path with `urlPattern` in the value;
 * we project the urlPattern set for O(1) `has` lookups.
 */
function collectUrlPatterns(routeMap: RouteMap): Set<string> {
  const out = new Set<string>();
  for (const pageRoute of routeMap.pages.values()) {
    if (pageRoute && typeof pageRoute.urlPattern === "string") {
      out.add(pageRoute.urlPattern);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// AST walking + attr utilities
// ---------------------------------------------------------------------------

/**
 * Recursive markup walker. Visits every MarkupNode in the AST tree,
 * including nested markup inside `<page>` / `<auth>` / `<channel>` bodies.
 *
 * Skips text / comment / logic / sql / style / meta nodes — they have no
 * gate semantics. Recurses into MarkupNode children only.
 */
function walkMarkupNodes(
  nodes: ASTNode[] | undefined,
  visit: (node: MarkupNode) => void,
): void {
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (!node) continue;
    if (node.kind === "markup") {
      visit(node);
      walkMarkupNodes(node.children, visit);
    }
    // Skip other node kinds — gates only live on markup nodes per SCOPING.
  }
}

/** Find the `<program>` markup root, if any. Top-level only — `<program>`
 *  never nests in scrml. */
function findProgramNode(nodes: ASTNode[]): MarkupNode | null {
  for (const node of nodes ?? []) {
    if (node && node.kind === "markup" && node.tag === "program") {
      return node;
    }
  }
  return null;
}

/** Lookup an attribute by name on a markup node's attr list. */
function findAttr(attrs: AttrNode[] | undefined, name: string): AttrNode | null {
  if (!Array.isArray(attrs)) return null;
  for (const attr of attrs) {
    if (attr?.name === name) return attr;
  }
  return null;
}

/**
 * Extract the string-literal value from an AttrNode. Returns the literal
 * verbatim for string-literal attrs; returns `null` for absent / interpolated /
 * expression attrs (interpolation-bearing forms are slot-reserved for
 * gateExpr, but per OQ-A3-A v0.3 grammar there is no interpolation surface
 * — the attribute-registry pins `supportsInterpolation: false`).
 */
function readStringAttr(attr: AttrNode | null | undefined): string | null {
  if (!attr) return null;
  const value = attr.value;
  if (!value) return null;
  if (value.kind === "string-literal") {
    return value.value ?? null;
  }
  if (value.kind === "absent") return null;
  // Other value shapes (variable-ref / call-ref / expr / props-block)
  // do not preserve a plain string. A-3.1 returns null; A-3.3 will
  // re-walk for interpolation forms when OQ-A3-A grammar admits them.
  return null;
}

/**
 * Resolve the entry-point id for a `<page>` or `<auth>` gate.
 *
 * Page-auth: the page IS its own entry-point. The PageRoute key in
 * `routeMap.pages` is the file path (per route-inference.ts:2532), so
 * we use the file path itself as the EntryPointId proxy. The EntryPointId
 * shape is finalized by A-2.2.a; A-3.1 records what we have.
 *
 * Auth-role-block: the enclosing page is the entry-point. For v0.3 with
 * file-based routing, the file path is the page identity, so we use the
 * file path as the entry-point id (matching the page-auth handling).
 *
 * Returns the file path verbatim as a string. A-2.5 / A-4 are responsible
 * for translating to the canonical EntryPointId once that surface lands.
 */
function resolvePageEntryPoint(
  _node: MarkupNode,
  fileAST: FileAST,
  _routeMap: RouteMap | null,
): EntryPointId {
  // Per SCOPING §2.1 + OQ-A2-E ratification: no synthesis. We record
  // the file path; A-2.2.a's EntryPointId scheme will canonicalize.
  return fileAST.filePath;
}

// ---------------------------------------------------------------------------
// Re-export the public types for convenience (some consumers will only
// need `runAuthGraph` and the result type — keep the import surface small).
// ---------------------------------------------------------------------------

export type {
  AuthGraph,
  AuthGate,
  AuthGraphDiagnostic,
  AuthGraphOutput,
  AuthSiteKind,
  EntryPointId,
  MarkupNodeId,
} from "./types/auth-graph.js";

// Helper exported for unit tests that want to interrogate individual
// fields without re-walking the AST. Not part of the consumer surface.
export const __test_helpers = {
  findAttr,
  readStringAttr,
  walkMarkupNodes,
  crossRefRedirects,
  collectUrlPatterns,
};

