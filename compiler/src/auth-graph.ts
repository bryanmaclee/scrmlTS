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
  RoleEnum,
  RoleVariant,
} from "./types/auth-graph.js";

import type {
  ASTNode,
  AttrNode,
  ChannelDeclNode,
  FileAST,
  MarkupNode,
  Span,
  TypeDeclNode,
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

  // A-3.2: role enum resolution. Runs AFTER per-file enumeration so the
  // reference-based (b) discovery rule can read the gate set's `role`
  // attribute values. The resolver also fires E-AUTH-GRAPH-002 (auth
  // gates reference role variants but no enum is declared / ambiguous
  // discovery) when applicable.
  const roleEnum = resolveRoleEnum(files, gates, errors);

  // A-3.4 — auth-redirect cross-ref. Projects each gate's `redirect`
  // field into the redirectTargets map verbatim (bare string per OQ-A3-B
  // (a) S90 ratification) and emits info-level I-AUTH-REDIRECT-UNRESOLVED
  // diagnostics for any redirect path not present in RouteMap.pages.
  crossRefRedirects(gates, routeMap, redirectTargets, errors);

  const graph: AuthGraph = {
    gates,
    roleEnum,
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
// A-3.2 — Role enum resolution (per SCOPING §A-3.2 + OQ-A3-F ratified S90)
// ---------------------------------------------------------------------------

/**
 * Discover the app-scope role enum per SPEC §40.1.1 line 17157
 * ("single scrml-native `:enum` type declared at app scope").
 *
 * Per OQ-A3-F ratified S90, A-3.2 implements a (b)+(c) **dual rule** with
 * reconciliation, falling through to E-AUTH-GRAPH-002 on ambiguity:
 *
 *   (b) Reference-based discovery (PRIMARY) — walk the enumerated gate
 *       set's `role=` attribute values. For each value that is a
 *       recognized enum-variant identifier (case-sensitive match against
 *       a declared enum's variants), record the enum that owns it.
 *       Exactly one match → use it.
 *
 *   (c) Entry-file `<program>`-body-scope discovery (FALLBACK) — when (b)
 *       yields zero matches OR multiple distinct enums, look at the entry
 *       file's `<program>` body for enum declarations. The first enum
 *       declared at app entry scope is the role enum.
 *
 *   Reconciliation — if (b) finds exactly one enum, use it. If (b) finds
 *   zero, use (c). If (b) finds multiple, check (c); if (c) matches one
 *   of the (b) candidates, use it; otherwise fire E-AUTH-GRAPH-002.
 *
 * Empty-role-enum + no-role-enum handling (per dispatch brief A-3.2.b):
 *   - No auth gates anywhere + no role enum found → synthesize
 *     `_anonymous` single-variant enum per PIPELINE Stage 7.6 line 2380.
 *   - Auth gates present but no role enum found → fire E-AUTH-GRAPH-002
 *     with diagnostic citing the gates that reference variants.
 *
 * @param files — per-file ASTs from TAB. Used to enumerate TypeDeclNode
 *   candidates across the whole corpus AND to identify the entry-file
 *   `<program>` body for (c).
 * @param gates — per-gate records produced by `runAuthGraph`'s
 *   enumeration pass. Used as the (b)-rule input.
 * @param errors — diagnostic sink. E-AUTH-GRAPH-002 fires here when the
 *   dual rule cannot reconcile to exactly one enum AND auth gates exist.
 */
export function resolveRoleEnum(
  files: FileAST[],
  gates: Map<MarkupNodeId, AuthGate>,
  errors: AuthGraphDiagnostic[],
): RoleEnum | null {
  // Step 1: collect ALL enum declarations across the corpus. Each entry
  // pairs an enum's name + parsed variant list + the file it was declared
  // in + its source span. Enums hoisted to FileAST.typeDecls are the
  // canonical source — this includes enums declared inside `<program>`
  // bodies AND top-level scope (TAB hoists both per ast-builder.js).
  const enumCandidates = collectEnumCandidates(files);
  if (enumCandidates.length === 0) {
    return handleNoEnumFound(gates, errors, files);
  }

  // Step 2: (b) reference-based discovery — find which enums own the
  // variant names appearing in <auth role="X"> attribute values.
  const referencedEnums = findEnumsReferencedByGates(gates, enumCandidates);

  // Step 3: dispatch on the (b) result.
  if (referencedEnums.length === 1) {
    // (b) found exactly one — use it. This is the empirical signal.
    return buildRoleEnum(referencedEnums[0]!, false);
  }

  if (referencedEnums.length === 0) {
    // (b) found nothing — fall to (c) entry-file program-body scope.
    const entryEnum = findEntryFileProgramScopeEnum(files, enumCandidates);
    if (entryEnum) {
      return buildRoleEnum(entryEnum, false);
    }
    // (c) also found nothing — handle no-enum-found path.
    return handleNoEnumFound(gates, errors, files);
  }

  // (b) found MULTIPLE distinct enums — reconcile with (c).
  const entryEnum = findEntryFileProgramScopeEnum(files, enumCandidates);
  if (entryEnum) {
    const matched = referencedEnums.find(
      (cand) => cand.name === entryEnum.name && cand.filePath === entryEnum.filePath,
    );
    if (matched) return buildRoleEnum(matched, false);
  }
  // Reconciliation failed — ambiguous. Fire E-AUTH-GRAPH-002.
  fireAmbiguousEnumDiagnostic(referencedEnums, gates, errors);
  return null;
}

/**
 * An enum candidate — a declared `:enum` type, paired with its parsed
 * variants and source location. Internal to A-3.2; not exported.
 */
interface EnumCandidate {
  name: string;
  variants: string[];
  filePath: string;
  span: Span;
  /** True when this candidate was declared inside a `<program>` body
   *  (vs hoisted from a top-level logic block). Drives the (c) fallback. */
  inProgramScope: boolean;
}

/**
 * Walk every `FileAST.typeDecls` AND every `<program>` body's nested
 * LogicNode typeDecls to enumerate every `:enum` declaration in the
 * compilation corpus. Each returned candidate carries the file path +
 * span + an `inProgramScope` flag for (c)-rule disambiguation.
 *
 * Variant lists are parsed via `parseEnumVariantsFromRaw` (a local copy
 * of the symbol-table.ts:4426 parser logic, scoped to A-3.2's needs).
 *
 * Empty-variant enums (e.g. `type Role: enum`) are still recorded as
 * candidates with `variants: []` — A-3.2.b uses the corpus position
 * (entry-file program-scope) to disambiguate; an empty enum that wins
 * the role-enum slot will downstream-trigger reachability behaviour
 * (no variants → no gated_for_role surfaces → A-2.5 worst-case).
 */
function collectEnumCandidates(files: FileAST[]): EnumCandidate[] {
  const out: EnumCandidate[] = [];

  for (const fileAST of files) {
    if (!fileAST) continue;

    // FileAST.typeDecls is the hoisted list of all type-decls in the
    // file (across all logic blocks). We use this as the canonical
    // source so we don't need to re-walk the AST tree for `:enum`
    // declarations.
    const hoisted = fileAST.typeDecls ?? [];
    for (const decl of hoisted) {
      if (!isEnumDecl(decl)) continue;
      out.push({
        name: decl.name,
        variants: parseEnumVariantsFromRaw(decl.raw ?? ""),
        filePath: fileAST.filePath,
        span: decl.span,
        inProgramScope: isDeclInProgramScope(decl, fileAST),
      });
    }
  }

  return out;
}

/**
 * (b)-rule: which enums own variant names referenced by `<auth role=>`
 * attribute values in the gate set?
 *
 * For each gate with a non-null `role` field that is a SINGLE bare
 * identifier (case-sensitive enum-variant shape), check which enum
 * candidates declare that variant. Multiple enums declaring the SAME
 * variant name → all of them are added to the candidate pool (the
 * caller's reconciliation rule handles the ambiguity).
 *
 * Skips:
 *   - gates with `role: null` (channel-auth without role, malformed gates).
 *   - gates whose role is a builtin auth-mode token ("required" /
 *     "optional" / "none") — these are program-auth / page-auth /
 *     channel-auth keywords, not role-enum-variant references.
 *   - comma-separated forms (`"admin,dispatcher"`) — A-3.2 reads only
 *     bare identifiers for the (b) rule; A-3.3 handles complex predicate
 *     parsing during classification.
 *
 * Returns the deduplicated set of enums (by name+filePath) referenced.
 */
function findEnumsReferencedByGates(
  gates: Map<MarkupNodeId, AuthGate>,
  enumCandidates: EnumCandidate[],
): EnumCandidate[] {
  const builtinAuthModes = new Set(["required", "optional", "none"]);
  const matched: EnumCandidate[] = [];
  const seen = new Set<string>();  // key: name + "\x00" + filePath

  for (const gate of gates.values()) {
    // Only auth-role-block gates carry actual variant-identifier role
    // values; program-auth / page-auth / channel-auth carry the auth-mode
    // keyword ("required"/"optional"). Per SCOPING §A-3.2.a, the (b) rule
    // reads `<auth role="X">` specifically.
    if (gate.siteKind !== "auth-role-block") continue;
    const role = gate.role;
    if (!role) continue;
    // Skip if it's a builtin auth-mode keyword (defensive — auth-role-block
    // shouldn't see these, but be paranoid).
    if (builtinAuthModes.has(role)) continue;
    // Only bare identifiers count for (b). A-3.3 will handle complex
    // forms (comma-OR, negation, interpolation) during classification.
    if (!isBareIdentifier(role)) continue;

    for (const cand of enumCandidates) {
      if (!cand.variants.includes(role)) continue;
      const key = `${cand.name}\x00${cand.filePath}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matched.push(cand);
    }
  }

  return matched;
}

/**
 * (c)-rule: discover the role enum by structural position — the first
 * enum declared inside the entry file's `<program>` body scope.
 *
 * "Entry file" heuristic (no normative SPEC text exists yet; A-3.5 will
 * formalize when integration wiring lands):
 *   - The first file in `files[]` with `hasProgramRoot: true`.
 *   - If none have a program root, the first file with at least one
 *     enum-in-program-scope candidate.
 *
 * "Program-body-scope" enum: an EnumCandidate whose `inProgramScope`
 * flag is true (set by `collectEnumCandidates`).
 *
 * Returns null when no entry-file enum exists.
 */
function findEntryFileProgramScopeEnum(
  files: FileAST[],
  enumCandidates: EnumCandidate[],
): EnumCandidate | null {
  // Prefer files with hasProgramRoot=true.
  const entryFile = files.find((f) => f && f.hasProgramRoot) ?? files[0];
  if (!entryFile) return null;

  // First enum in the entry file's program scope. We iterate
  // `enumCandidates` in collection order (which is FileAST.typeDecls
  // declaration order per `collectEnumCandidates`) — this gives a
  // deterministic "first" for repeated runs.
  for (const cand of enumCandidates) {
    if (cand.filePath !== entryFile.filePath) continue;
    if (!cand.inProgramScope) continue;
    return cand;
  }

  // Fallback: first enum in the entry file regardless of scope. This
  // matches the spirit of "app entry scope" when the entry file has
  // its enum declared at top-level (which TAB still hoists to
  // FileAST.typeDecls; the inProgramScope flag may be false).
  for (const cand of enumCandidates) {
    if (cand.filePath === entryFile.filePath) return cand;
  }
  return null;
}

/**
 * Build a `RoleEnum` record from a winning candidate. The
 * `isImplicitAnonymous: false` flag indicates a real adopter-declared
 * enum (vs the synthesized `_anonymous` fallback).
 */
function buildRoleEnum(cand: EnumCandidate, isImplicitAnonymous: boolean): RoleEnum {
  return {
    name: cand.name,
    variants: cand.variants.slice() as RoleVariant[],
    span: cand.span,
    filePath: cand.filePath,
    isImplicitAnonymous,
  };
}

/**
 * Handle the no-enum-found path per dispatch brief A-3.2.b:
 *
 *   - If NO auth gates anywhere AND no role enum → synthesize the
 *     `_anonymous` single-variant floor per PIPELINE Stage 7.6 line 2380.
 *     Adopter is building a no-auth app.
 *   - If at least one gate REFERENCES a role-enum variant (i.e. an
 *     `<auth role="X">` block where X is a bare-identifier) AND no role
 *     enum is declared → fire E-AUTH-GRAPH-002. Per OQ-A2-F, E-CLOSURE-002
 *     fires from A-2.5; A-3.2 surfaces the compile-time signal.
 *   - If only binary auth gates (program-auth / page-auth / channel-auth
 *     with `auth="required"`/`"optional"`) exist and no role enum is
 *     declared → no diagnostic; synthesize the `_anonymous` floor so
 *     downstream traversal still has a role to dispatch on. These gates
 *     are not role-variant references; they don't require a role enum.
 */
function handleNoEnumFound(
  gates: Map<MarkupNodeId, AuthGate>,
  errors: AuthGraphDiagnostic[],
  files: FileAST[],
): RoleEnum | null {
  const variantReferencingGates = gatesThatReferenceVariants(gates);

  if (gates.size === 0 || variantReferencingGates.length === 0) {
    // No variant-referencing gates — synthesize the anonymous floor.
    // This covers both the "no auth at all" case and the "only binary
    // gates" case (program-auth / page-auth / channel-auth with
    // auth=required which doesn't reference role-enum variants).
    return synthesizeAnonymousEnum(files);
  }

  // Variant-referencing gates exist but no role enum declared anywhere.
  // Fire E-AUTH-GRAPH-002 with the first such gate as the span anchor.
  const firstGate = variantReferencingGates[0]!;
  errors.push({
    code: "E-AUTH-GRAPH-002",
    severity: "error",
    message:
      "auth gates reference role variants but no `:enum` is declared at app scope. " +
      "Declare a single `:enum` type with variants matching the values referenced by " +
      "`<auth role=>` blocks (SPEC §40.1.1).",
    span: firstGate.span,
    filePath: firstGate.filePath,
  });
  return null;
}

/**
 * Filter: which gates carry a role-enum-variant reference (an
 * `<auth role="X">` block where X is a bare identifier — the (b) rule
 * input shape)? Returns gates in iteration order for deterministic
 * first-fire-site selection.
 */
function gatesThatReferenceVariants(
  gates: Map<MarkupNodeId, AuthGate>,
): AuthGate[] {
  const builtinAuthModes = new Set(["required", "optional", "none"]);
  const out: AuthGate[] = [];
  for (const gate of gates.values()) {
    if (gate.siteKind !== "auth-role-block") continue;
    const role = gate.role;
    if (!role) continue;
    if (builtinAuthModes.has(role)) continue;
    if (!isBareIdentifier(role)) continue;
    out.push(gate);
  }
  return out;
}

/**
 * Synthesize the `_anonymous` single-variant floor enum per PIPELINE
 * Stage 7.6 line 2380. Anchors the span to the entry file when one is
 * available; falls back to `<synthesized>` otherwise.
 */
function synthesizeAnonymousEnum(files: FileAST[]): RoleEnum {
  const fallbackFile = files.find((f) => f && f.hasProgramRoot) ?? files[0];
  const fallbackSpan: Span = {
    file: fallbackFile?.filePath ?? "<synthesized>",
    start: 0,
    end: 0,
    line: 1,
    col: 1,
  };
  return {
    name: "_anonymous",
    variants: ["_anonymous"] as RoleVariant[],
    span: fallbackSpan,
    filePath: fallbackFile?.filePath ?? "<synthesized>",
    isImplicitAnonymous: true,
  };
}

/**
 * Fire E-AUTH-GRAPH-002 for the ambiguous-multi-enum case: (b) found
 * multiple enums AND (c) did NOT resolve. Diagnostic message lists the
 * conflicting candidate names so the adopter can disambiguate by
 * collapsing to a single enum or by declaring one at entry-file
 * program scope.
 */
function fireAmbiguousEnumDiagnostic(
  candidates: EnumCandidate[],
  gates: Map<MarkupNodeId, AuthGate>,
  errors: AuthGraphDiagnostic[],
): void {
  const names = candidates.map((c) => `\`${c.name}\``).join(", ");
  const firstGate = gates.values().next().value as AuthGate | undefined;
  const span: Span = candidates[0]?.span ?? firstGate?.span ?? {
    file: "<unknown>", start: 0, end: 0, line: 1, col: 1,
  };
  errors.push({
    code: "E-AUTH-GRAPH-002",
    severity: "error",
    message:
      `auth-role gate values match variants from multiple distinct \`:enum\` types ` +
      `(${names}); add a single role enum at the entry file's \`<program>\` body ` +
      `scope to disambiguate (SPEC §40.1.1). The (b)+(c) discovery dual rule could ` +
      `not reconcile to a single enum.`,
    span,
    filePath: candidates[0]?.filePath ?? firstGate?.filePath ?? "<unknown>",
  });
}

// ---------------------------------------------------------------------------
// A-3.2 helpers — enum decl detection + variant parsing
// ---------------------------------------------------------------------------

/** True when the node is a `type X : enum` declaration. */
function isEnumDecl(decl: ASTNode | TypeDeclNode | null | undefined): decl is TypeDeclNode {
  if (!decl || typeof decl !== "object") return false;
  if ((decl as TypeDeclNode).kind !== "type-decl") return false;
  return (decl as TypeDeclNode).typeKind === "enum";
}

/**
 * Heuristic: was the TypeDeclNode declared inside a `<program>` body's
 * logic block? FileAST.typeDecls is the hoisted aggregate, so we have
 * to walk the AST to find which LogicNode owned the original
 * declaration.
 *
 * Identifies a decl as "in program scope" when:
 *   - The file has a `<program>` markup root, AND
 *   - The decl appears in a LogicNode whose parent chain includes the
 *     `<program>` markup node.
 *
 * For the purposes of A-3.2's (c) rule, we accept any enum hoisted from
 * a logic block whose parent chain reaches the `<program>` element. A
 * pragmatic match is sufficient — the worked example in SPEC §40.9.9
 * places the enum inside the entry file at file scope.
 *
 * Implementation: walk the AST from the file's nodes, tracking when
 * we're inside a `<program>` subtree, and look for the decl by
 * reference equality + by (name, raw) tuple. We never mutate the AST.
 */
function isDeclInProgramScope(decl: TypeDeclNode, fileAST: FileAST): boolean {
  if (!fileAST.hasProgramRoot) return false;
  return findDeclInProgramSubtree(fileAST.nodes, decl, false);
}

/**
 * Recursive search: traverse the AST in document order; toggle
 * `insideProgram=true` once we descend into the `<program>` markup
 * subtree. Within that subtree, any LogicNode whose typeDecls list
 * contains the target decl returns true.
 */
function findDeclInProgramSubtree(
  nodes: ASTNode[] | undefined,
  target: TypeDeclNode,
  insideProgram: boolean,
): boolean {
  if (!Array.isArray(nodes)) return false;
  for (const node of nodes) {
    if (!node) continue;
    if (node.kind === "markup") {
      const enteringProgram = node.tag === "program";
      const childInside = insideProgram || enteringProgram;
      if (findDeclInProgramSubtree(node.children, target, childInside)) {
        return true;
      }
    } else if (node.kind === "logic" && insideProgram) {
      const td = node.typeDecls ?? [];
      for (const candidate of td) {
        if (candidate === target) return true;
        // Reference equality may fail if the hoisting pass cloned the
        // node. Fall back to structural match on the load-bearing fields.
        if (
          candidate
          && candidate.name === target.name
          && candidate.typeKind === target.typeKind
          && candidate.raw === target.raw
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Parse an enum body's raw text to extract variant names. Mirrors
 * `symbol-table.ts:4426` parseEnumVariantNamesFromRaw — scoped to
 * A-3.2's needs. Returns an empty array for malformed / empty bodies.
 *
 * Recognizes:
 *   - Comma / newline / pipe separators between variants at paren depth 0.
 *   - `transitions { ... }` block (stripped — variants come first).
 *   - Payload-list `(field:type)` (stripped from variant name).
 *   - `renders ...` suffix (stripped from variant name).
 *   - Standard variant-name shape: `^[A-Z][A-Za-z0-9_]*$`.
 *
 * Empty enums (`type Role: enum` or `type Role: enum = {}`) return [].
 */
function parseEnumVariantsFromRaw(raw: string): string[] {
  const out: string[] = [];
  let body = (raw || "").trim();
  if (body.startsWith("{")) body = body.slice(1);
  if (body.endsWith("}")) body = body.slice(0, -1);
  body = body.trim();
  if (!body) return out;

  // Strip a `transitions { ... }` block if present (engine-decl form).
  let variantsSection = body;
  {
    let depth = 0;
    for (let i = 0; i < body.length; i++) {
      const ch = body[i]!;
      if (ch === "(" || ch === "[" || ch === "{") { depth++; continue; }
      if (ch === ")" || ch === "]" || ch === "}") { depth--; continue; }
      if (depth === 0 && body.slice(i).startsWith("transitions")) {
        const after = body.slice(i + "transitions".length).trimStart();
        if (after.startsWith("{")) {
          variantsSection = body.slice(0, i).trim();
          break;
        }
      }
    }
  }

  // Split on `\n`, `,`, and `|` at paren depth 0.
  const segments: string[] = [];
  let depth = 0;
  let buf = "";
  for (let i = 0; i < variantsSection.length; i++) {
    const ch = variantsSection[i]!;
    if (ch === "(" || ch === "[" || ch === "{") { depth++; buf += ch; continue; }
    if (ch === ")" || ch === "]" || ch === "}") { depth--; buf += ch; continue; }
    if (depth === 0 && (ch === "\n" || ch === "," || ch === "|")) {
      if (buf.trim()) segments.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) segments.push(buf.trim());

  for (const seg of segments) {
    let text = seg;
    const paren = text.indexOf("(");
    if (paren >= 0) text = text.slice(0, paren).trim();
    const rendersIdx = text.indexOf(" renders ");
    if (rendersIdx >= 0) text = text.slice(0, rendersIdx).trim();
    if (!text) continue;
    if (!/^[A-Z][A-Za-z0-9_]*$/.test(text)) continue;
    out.push(text);
  }
  return out;
}

/** Bare-identifier regex — single PascalCase / lowercase identifier. */
function isBareIdentifier(s: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(s.trim());
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
  RoleEnum,
  RoleVariant,
} from "./types/auth-graph.js";

// Helper exported for unit tests that want to interrogate individual
// fields without re-walking the AST. Not part of the consumer surface.
export const __test_helpers = {
  findAttr,
  readStringAttr,
  walkMarkupNodes,
  crossRefRedirects,
  collectUrlPatterns,
  parseEnumVariantsFromRaw,
  isBareIdentifier,
};

