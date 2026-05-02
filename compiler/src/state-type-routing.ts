/**
 * P3.A — state-type routing table
 *
 * The category-routing-table is a self-documenting transitional pattern that
 * tracks, for each user-declared state-type CATEGORY, which routing field
 * downstream stages consume:
 *
 *   - "isComponent-legacy"     — read `node.isComponent === true` and the
 *                                exportRegistry's `info.isComponent` boolean.
 *                                This is the path used by every stage prior to
 *                                P3.A: BS, ast-builder bare-component-ref grammar,
 *                                CE phase 1, type-system state-type validation,
 *                                codegen emit-html / emit-bindings / emit-client,
 *                                LSP cross-file completion, validators VP-2.
 *
 *   - "resolvedCategory-new"   — read NR's `resolvedKind` / `resolvedCategory`
 *                                fields stamped on each markup/state node, AND
 *                                the exportRegistry's `info.category` field.
 *                                This is the path P3.A introduces for cross-file
 *                                channel references; CHX (CE phase 2) consumes it.
 *
 * The table covers the P3.A scope: components stay legacy-routed (zero risk to
 * the 75 in-tree `isComponent` references); channels become NR-authoritative.
 * Engines (P3.B, F-ENGINE-001) close via the wrapping-component idiom (P3
 * dive §5.2) which routes via the legacy component path.
 *
 * Future categories (timer, poll, request, errorBoundary cross-file —
 * P3-FUTURE per dive §13.2) will be added here as `resolvedCategory-new`.
 *
 * The full migration of the 75 isComponent sites to NR-authoritative routing
 * is deferred to **P3-FOLLOW** (T2-medium, ratified per OQ-P3-2 = Option (b)).
 * When that ships, this file becomes obsolete and is deleted.
 *
 * Per P3 deep-dive §8.4 (Option (b) — per-category promotion).
 */

/** Resolved state-type category produced by NR (`name-resolver.ts`). */
export type ResolvedCategory =
  | "html"
  | "channel"
  | "engine"
  | "timer"
  | "poll"
  | "db"
  | "schema"
  | "request"
  | "errorBoundary"
  | "machine"
  | "user-component"
  | "user-state-type"
  | "unknown";

/** Routing strategy for a category. */
export type RoutingStrategy = "isComponent-legacy" | "resolvedCategory-new";

/**
 * The category-routing-table.
 *
 * Lookup contract:
 *   ROUTING[category] === "isComponent-legacy"   → consume `node.isComponent`
 *                                                  and `info.isComponent` boolean
 *   ROUTING[category] === "resolvedCategory-new" → consume `node.resolvedCategory`
 *                                                  and `info.category` string
 *
 * Stages that route on category SHOULD import this table and switch on
 * `ROUTING[node.resolvedCategory ?? "unknown"]`. Stages that haven't been
 * migrated yet (the 75 isComponent sites) continue to read `isComponent`
 * directly until P3-FOLLOW lands.
 */
export const ROUTING: Record<ResolvedCategory, RoutingStrategy> = {
  // P3.A scope — channel becomes NR-authoritative (CHX in CE phase 2).
  "channel":         "resolvedCategory-new",

  // Legacy paths (untouched in P3.A — P3-FOLLOW will migrate these).
  "user-component":  "isComponent-legacy",  // CE phase 1 (W2 cross-file expansion)
  "user-state-type": "isComponent-legacy",  // type-system state-type validation
  "html":            "isComponent-legacy",  // built-in HTML elements
  "engine":          "isComponent-legacy",  // <engine> (P3.B used wrapping component)
  "machine":         "isComponent-legacy",  // <machine> deprecated alias
  "timer":           "isComponent-legacy",  // <timer> lifecycle
  "poll":            "isComponent-legacy",  // <poll> lifecycle
  "db":              "isComponent-legacy",  // <db> stateful boundary
  "schema":          "isComponent-legacy",  // <schema> compile-time-only (DD4 §7.4)
  "request":         "isComponent-legacy",  // <request> async lifecycle
  "errorBoundary":   "isComponent-legacy",  // <errorBoundary> lifecycle
  "unknown":         "isComponent-legacy",  // fallback for unresolved tags
};

/**
 * Convenience predicate — returns true when the category should route via the
 * NEW resolvedCategory path.
 */
export function shouldRouteByCategory(category: ResolvedCategory | undefined): boolean {
  if (!category) return false;
  return ROUTING[category] === "resolvedCategory-new";
}

/**
 * P3.A — categories that participate in cross-file inline-expansion (CHX).
 *
 * Currently only "channel" is in scope. Future state-types added under UCD
 * (timer/poll/request/etc. cross-file per P3-FUTURE) will join this set.
 */
export const CROSS_FILE_INLINE_CATEGORIES = new Set<ResolvedCategory>(["channel"]);

/**
 * Predicate — returns true when a markup/state node represents a cross-file
 * import-reference whose body should be inlined by CHX.
 *
 * The caller must populate `node.resolvedCategory` (NR shadow mode) and a
 * `crossFile` flag (set by CHX when looking up the importedRegistry).
 */
export function isCrossFileInlineRef(
  node: { resolvedCategory?: ResolvedCategory; isComponent?: boolean; tag?: string }
): boolean {
  const cat = node.resolvedCategory;
  if (!cat) return false;
  return CROSS_FILE_INLINE_CATEGORIES.has(cat);
}
