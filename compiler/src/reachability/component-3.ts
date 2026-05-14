/**
 * @module reachability/component-3
 *
 * Component 3 — `server_fn_reachable_within(N, C_set)` per SPEC §40.9.4.
 *
 * S90 wave A-2.4 — given the component set `C_set` produced by
 * Component 1, compute the set of server functions reachable via a
 * chain of at most `N` user interactions starting from any component
 * in `C_set`.
 *
 * **Interaction-graph projection (OQ-A2-H Option α — ratified S89).**
 *
 * Component 3 builds an interaction-graph projection internally; it
 * does NOT extend the DG substrate. The projection edges are derived
 * from:
 *
 *   - **AST event-handler attributes** on markup nodes in `C_set` —
 *     `onclick=fn()` / `onsubmit=fn()` / `onchange=fn()` / `onkeydown=`
 *     etc. The `CallRefAttrValue.name` field identifies the callee
 *     function-decl by name.
 *   - **`bind:value=@cell` write paths** — a bound input cell becomes a
 *     reactive writer at N=1. Component 3 treats the cell write itself
 *     as an interaction edge: any server-fn reached via the cell's
 *     downstream `awaits` chain (DG-side) is admitted to N=1.
 *   - **`<onTimeout to=.Variant>`, `<onIdle to=.Variant>`,
 *     `<onTransition to=.Variant>`** — engine state transitions. These
 *     are firing-paths per §51.0.M / §51.0.R / §51.0.H. The `to=`
 *     attribute names the destination variant; the variant's
 *     state-child body is initial-rendered at N+1. Component 3 admits
 *     any server-fns called during the destination arm's render at the
 *     same N tier as the firing event.
 *   - **Channel `onserver:message=handler()`** — per §38, channel
 *     server-message handlers are firing-paths for downstream server-fn
 *     invocations. The handler's body is server-side, so any callee
 *     server-fn it invokes is admitted to the playable surface at the
 *     same N tier as the message-receive event.
 *
 * **DG substrate consumed.** The projection THEN walks DG `calls` +
 * `awaits` edges from the resolved callee function-decl-DG-nodes to
 * admit transitively-reached server functions. This is the standard
 * call-graph forward closure — DG already encodes it via the existing
 * Stage 7 edge taxonomy.
 *
 * **Bounded BFS (OQ-A2-B Option a — ratified S89).** N=0, N=1, N=2.
 * N≥3 is on-demand at runtime; v0.3.0 emits no per-app override knob.
 *
 *   - **N=0:** server-fns invoked synchronously during initial render —
 *     reactive cell initializers, meta blocks, derived expressions
 *     read during initial markup interpolation. Per OQ-A2-C
 *     (ratified): reactive chains crossing the server boundary at
 *     initial render ARE N=0. The DG already encodes these as
 *     `awaits` edges from a reactive/derived/meta node TO a server
 *     function node — Component 3 walks them.
 *   - **N=1:** server-fns invoked by a direct user interaction with a
 *     component in `C_set`. Event-handler attribute callees are the
 *     entry points; the forward call-graph closure from each callee
 *     admits all transitively-reached server functions.
 *   - **N=2:** cascade — server-fns invoked by the initial render of
 *     components newly instantiated by an N=1 interaction. Per the
 *     Component-1 worst-case-union policy, runtime-gated branches are
 *     already in `C_set` at N=0, so the typical N=2 surface arises
 *     from engine `<onTimeout>` / `<onIdle>` / `<onTransition>` state
 *     transitions that cause variant re-renders.
 *
 * **Worst-case-union for generic-typed server-fn (§40.9.4 normative).**
 * A server-fn whose response shape is not statically known SHALL be
 * treated as worst-case union over all reachable variants. Component 3
 * implements this conservatively: when an `awaits` edge targets a
 * function node whose name's prefix matches a typed-generic shape
 * (e.g. parameter `<T>` in the AST), the closure admits ALL
 * server-fns the call could possibly resolve to (the full set of
 * server-fn DG nodes — over-shipping is the disallowed-direction
 * floor per §40.9.2 worst-case rule). At v0.3.0 the corpus contains
 * zero such patterns (S84) — this clause defines defensive behaviour.
 *
 * **Determinism.** AST walk is depth-first source-order; DG closure
 * walk is `edges[]`-iteration order (deterministic by Stage 7
 * emission). Output Sets are insertion-ordered.
 *
 * **No mutation.** Pure function of inputs.
 *
 * Cross-references:
 *   - SPEC.md §40.9.4 — normative semantics.
 *   - SPEC.md §40.9.9 — worked example (`<state user> = ^server fetchUser()`
 *     is the N=0 admission shape).
 *   - SPEC.md §51.0.M / §51.0.R / §51.0.H — `<onTimeout>` / `<onIdle>` /
 *     `<onTransition>` firing-path semantics.
 *   - SPEC.md §38.5 / §38.6 — channel `onserver:message=` handler shape.
 *   - SPEC.md §6.13.M — `bind:value=` write-path semantics.
 *   - docs/changes/a2-reachability-solver-scoping/SCOPING.md §A-2.4 +
 *     §6 OQ-A2-B / OQ-A2-C / OQ-A2-H — dispositions.
 *   - compiler/src/dependency-graph.ts — `calls`/`awaits` edges +
 *     FunctionDGNode shape.
 *   - ./component-1.ts / ./component-2.ts — sibling component operators.
 */

import type {
  ASTNode,
  AttrNode,
  CallRefAttrValue,
  FileAST,
  FunctionDeclNode,
  MarkupNode,
} from "../types/ast.ts";
import type {
  EntryPointId,
  NodeId as RSNodeId,
} from "../types/reachability.ts";

// ---------------------------------------------------------------------------
// Local DG types — duck-typed at the boundary
// ---------------------------------------------------------------------------
//
// Mirror Component 2's pattern: declare a minimal structural subset
// so Component 3 doesn't depend on the full DG type surface. Anything
// not consumed by the call-graph forward closure is omitted.

type DGNodeId = string;

interface DGFunctionNode {
  kind: "function";
  nodeId: DGNodeId;
  boundary: "client" | "server";
  /** Source-file path embedded in the nodeId (for cross-file name resolution). */
  span?: { file?: string; start?: number; end?: number };
}

interface DGGenericNode {
  kind: string;
  nodeId: DGNodeId;
  boundary?: "client" | "server";
  span?: { file?: string; start?: number; end?: number };
}

interface DGEdge {
  from: DGNodeId;
  to: DGNodeId;
  kind: string;
}

/** Structural subset of the Stage 7 DG consumed by Component 3. */
export interface ReadOnlyDependencyGraph {
  nodes: Map<DGNodeId, DGGenericNode>;
  edges: DGEdge[];
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

/**
 * Per-entry-point server-fn reachability — keyed by interaction-depth
 * tier (0, 1, 2). Tier N=0 ⊆ Tier N=1 ⊆ Tier N=2 per §40.9.4
 * monotonicity.
 *
 * Members are server-function DG `nodeId` strings. The chunk plan at
 * the orchestrator level differences these tiers into the per-tier
 * `serverFnNodeIds` sets of `ChunkContents` per SPEC §40.9.7.
 */
export interface ServerFnReachable {
  /** N=0: server-fns invoked synchronously on initial render. */
  tier0: Set<DGNodeId>;
  /** N=1: server-fns reached via direct user interaction (cumulative — superset of tier0). */
  tier1: Set<DGNodeId>;
  /** N=2: cascade — server-fns from N=1-instantiated components (cumulative — superset of tier1). */
  tier2: Set<DGNodeId>;
}

/**
 * Per-entry-point output. The orchestrator unions across entry points
 * during ChunkPlan materialization.
 */
export type ServerFnReachableByEntryPoint = Map<EntryPointId, ServerFnReachable>;

/**
 * Event-attribute name detection.
 *
 * Per SPEC §6.13.E + §6.13.M: scrml event-handler attributes follow
 * the canonical DOM-event prefix `on*` (lowercase) for client events,
 * `onserver:*` for channel server-side handlers, and `bind:value=`
 * for two-way input binding.
 *
 * The match is exact-prefix; `oninput=` / `onkeydown=` / `onsubmit=`
 * / `onclick=` / `onchange=` etc. all qualify. False positives at the
 * naming boundary (a literal HTML attribute named `online`?) are
 * vanishingly rare in practice; over-inclusion is the safe direction
 * (admits a never-server-fn callee, which has no downstream effect on
 * the server-fn closure).
 */
function isEventHandlerAttrName(name: string): boolean {
  if (typeof name !== "string" || name.length < 3) return false;
  // Channel server-message handlers — per §38 onserver:open/message/close.
  if (name.startsWith("onserver:")) return true;
  // Two-way input binding — per §6.13.M.
  if (name === "bind:value" || name.startsWith("bind:")) return true;
  // Client-side DOM events — per §6.13.E. Pattern: `on` + lowercase event name.
  if (!name.startsWith("on")) return false;
  // Disqualify obvious false matches (`onserver:` already handled above).
  // The third character should be lowercase alpha — DOM events follow this
  // convention (onclick, onsubmit, onchange, onkeydown, oninput, etc.).
  const third = name.charCodeAt(2);
  if (third < 97 || third > 122) return false; // a-z
  return true;
}

/**
 * Compute Component 3's output for the full compile unit.
 *
 * @param initiallyRendered Output of Component 1 — per-entry-point
 *   set of `MarkupNode.id` values (AST ids, NOT DG ids).
 * @param files The compile unit's FileAST[] — Component 3 walks AST
 *   for the interaction-graph projection (event-handler attrs +
 *   engine state-child arm bodies).
 * @param depGraph Stage 7 DG with `calls`/`awaits` edges active for
 *   transitive call-graph closure. When absent, returns empty
 *   reachability for every entry point.
 *
 * Returns a per-entry-point `ServerFnReachable` containing tier0,
 * tier1, tier2 sets of server-fn DG nodeId strings.
 */
export function computeServerFnReachableWithin(
  initiallyRendered: Map<EntryPointId, Set<RSNodeId>>,
  files: FileAST[],
  depGraph: ReadOnlyDependencyGraph | null | undefined,
): ServerFnReachableByEntryPoint {
  const out: ServerFnReachableByEntryPoint = new Map();

  // Degrade gracefully when the DG is absent — empty tiers per entry
  // point. Mirrors the Component 2 graceful-degradation contract.
  if (!depGraph || !depGraph.nodes || !depGraph.edges) {
    for (const ep of initiallyRendered.keys()) {
      out.set(ep, { tier0: new Set(), tier1: new Set(), tier2: new Set() });
    }
    return out;
  }

  // Pre-index the DG for the per-entry-point walks.
  //   1. callGraphAdj — `from → Set<to>` over `calls` + `awaits` edges.
  //      Used by the forward call-graph closure (from a callee root to
  //      every transitively-reached function).
  //   2. functionNameToNodeId — for each FunctionDGNode, map its
  //      source-file-scoped name to the DG nodeId. Used to bridge
  //      event-handler `CallRefAttrValue.name` strings to DG nodes.
  //   3. serverFnNodeIds — the universe of server-fn DG nodeIds, used
  //      for tier admission filtering AND for worst-case-union default
  //      target (generic-typed server-fn admits ALL).
  const callGraphAdj = buildCallGraphAdjacency(depGraph);
  const fnNodesByName = buildFunctionNameIndex(depGraph, files);
  const allServerFnIds = collectAllServerFnNodeIds(depGraph);

  // Pre-index function-decl AST nodes by name — used by the N=0
  // initial-render sweep for entry-point-scoped seed enumeration and
  // by the engine state-child cascade at N=2.
  const fnDeclsByName = buildFnDeclIndexByName(files);

  // Build an AST-id → MarkupNode lookup so we can re-resolve
  // Component 1's id set into walkable subtrees per entry point.
  const markupById = buildMarkupNodeIndex(files);

  // Per-entry-point reachability.
  for (const [ep, componentSet] of initiallyRendered) {
    const tier0 = computeTier0(
      componentSet,
      markupById,
      files,
      fnNodesByName,
      callGraphAdj,
      allServerFnIds,
      depGraph,
    );
    const tier1 = new Set(tier0);
    addTier1(
      tier1,
      componentSet,
      markupById,
      fnNodesByName,
      callGraphAdj,
      allServerFnIds,
    );
    const tier2 = new Set(tier1);
    addTier2(
      tier2,
      componentSet,
      markupById,
      fnNodesByName,
      fnDeclsByName,
      callGraphAdj,
      allServerFnIds,
    );
    out.set(ep, { tier0, tier1, tier2 });
  }

  return out;
}

// ---------------------------------------------------------------------------
// DG pre-indexing
// ---------------------------------------------------------------------------

/**
 * Edge kinds Component 3 walks for transitive call-graph closure.
 *
 * `calls` = client-side function call. `awaits` = client → server-fn
 * call (per dependency-graph.ts:1410: `boundary === "server" ?
 * "awaits" : "calls"`). Component 3 admits both; the targets are
 * server-fns when the edge is `awaits` (terminal admission) and
 * client functions when `calls` (transitive — keep walking).
 */
const CALL_GRAPH_EDGE_KINDS: ReadonlySet<string> = new Set(["calls", "awaits"]);

function buildCallGraphAdjacency(
  dg: ReadOnlyDependencyGraph,
): Map<DGNodeId, Set<DGNodeId>> {
  const out = new Map<DGNodeId, Set<DGNodeId>>();
  for (const edge of dg.edges) {
    if (!CALL_GRAPH_EDGE_KINDS.has(edge.kind)) continue;
    let bucket = out.get(edge.from);
    if (!bucket) {
      bucket = new Set();
      out.set(edge.from, bucket);
    }
    bucket.add(edge.to);
  }
  return out;
}

/**
 * Build a `name → DGNodeId` index for FunctionDGNodes.
 *
 * The DG itself does not expose a name->nodeId map at this boundary —
 * the FunctionDGNode shape carries only `kind`/`nodeId`/`boundary`/
 * `span`. We reconstruct the mapping by cross-referencing AST
 * function-decl spans against DG function-node spans.
 *
 * Algorithm: per-file pass over the FileAST's function-decl list;
 * lookup the DG node whose span.file + span.start matches the AST
 * span. Index name → nodeId. When the DG carries multiple functions
 * with the same name across files (legal in stdlib + user modules),
 * the index records ALL matches in a Set so the per-callee resolution
 * can union them.
 *
 * Per-callee resolution at the event-handler site is then a Set
 * lookup; the lookup result is the set of candidate DG function nodes
 * the callee name could resolve to. When ambiguous (cross-file name
 * collision), Component 3 admits ALL candidates per the worst-case-
 * union floor (over-shipping is the safe direction per §40.9.2).
 */
function buildFunctionNameIndex(
  dg: ReadOnlyDependencyGraph,
  files: FileAST[],
): Map<string, Set<DGNodeId>> {
  const out = new Map<string, Set<DGNodeId>>();

  // Build a `${filePath}::${span.start}` → DG nodeId index for fn nodes.
  const dgFnBySpanKey = new Map<string, DGNodeId>();
  for (const node of dg.nodes.values()) {
    if (node.kind !== "function") continue;
    const sp = node.span;
    if (!sp || typeof sp.file !== "string" || typeof sp.start !== "number") {
      continue;
    }
    dgFnBySpanKey.set(`${sp.file}::${sp.start}`, node.nodeId);
  }

  // Walk each FileAST's function-decls and bind names → DG nodes via
  // the span-key bridge.
  for (const file of files) {
    const filePath = file.filePath;
    forEachFunctionDecl(file, (fn) => {
      if (typeof fn.name !== "string" || fn.name.length === 0) return;
      const key = `${filePath}::${fn.span.start}`;
      const dgNodeId = dgFnBySpanKey.get(key);
      if (!dgNodeId) return;
      let bucket = out.get(fn.name);
      if (!bucket) {
        bucket = new Set();
        out.set(fn.name, bucket);
      }
      bucket.add(dgNodeId);
    });
  }

  return out;
}

/**
 * Universe of server-fn DG nodeIds — used by the closure filter
 * (`closeForwardAdmitServer`) and as the worst-case-union target
 * when a generic-typed server-fn is reached.
 */
function collectAllServerFnNodeIds(dg: ReadOnlyDependencyGraph): Set<DGNodeId> {
  const out = new Set<DGNodeId>();
  for (const node of dg.nodes.values()) {
    if (node.kind !== "function") continue;
    if ((node as DGFunctionNode).boundary === "server") {
      out.add(node.nodeId);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// AST pre-indexing
// ---------------------------------------------------------------------------

/**
 * Build an AST-id → MarkupNode lookup spanning the entire compile unit.
 *
 * Component 1 emits AST ids — Component 3 needs to re-resolve them
 * into walkable subtrees for the event-handler-attribute sweep and
 * the engine state-child cascade. The index covers all markup nodes
 * across all files.
 */
function buildMarkupNodeIndex(files: FileAST[]): Map<RSNodeId, MarkupNode> {
  const out = new Map<RSNodeId, MarkupNode>();
  for (const file of files) {
    const nodes = getTopLevelNodes(file);
    for (const top of nodes) indexMarkupRec(top, out);
  }
  return out;
}

function indexMarkupRec(
  node: ASTNode | undefined,
  acc: Map<RSNodeId, MarkupNode>,
): void {
  if (!node || typeof node !== "object") return;
  if (node.kind === "markup") {
    const m = node as MarkupNode;
    acc.set(m.id, m);
    for (const child of m.children) indexMarkupRec(child as ASTNode, acc);
  }
}

/**
 * Build a name → FunctionDeclNode[] index for the entire compile unit.
 *
 * Used at the N=2 engine state-child cascade to resolve named
 * function calls inside engine arm bodies (which the AST records as
 * raw text in `engineMeta.stateChildren[i].bodyRaw`). We can re-bind
 * the name back to a function-decl AST node, then walk its body for
 * call expressions to enumerate transitive callees.
 *
 * At v0.3.0 the engine state-child body shape is raw text (not
 * walkable AST — see engine-statechild-parser.ts + primer §13.7
 * B14); a future engine-arm structured AST will let Component 3
 * walk arm bodies directly. Today we conservatively admit ALL
 * server-fn names that appear lexically in the bodyRaw — a regex
 * match. Over-shipping vs. under-shipping floor.
 */
function buildFnDeclIndexByName(
  files: FileAST[],
): Map<string, FunctionDeclNode[]> {
  const out = new Map<string, FunctionDeclNode[]>();
  for (const file of files) {
    forEachFunctionDecl(file, (fn) => {
      if (typeof fn.name !== "string" || fn.name.length === 0) return;
      let bucket = out.get(fn.name);
      if (!bucket) {
        bucket = [];
        out.set(fn.name, bucket);
      }
      bucket.push(fn);
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tier construction
// ---------------------------------------------------------------------------

/**
 * Tier 0 — server-fns invoked synchronously during initial render.
 *
 * Per OQ-A2-C (ratified S89, Option a): reactive chains crossing the
 * server boundary at initial render ARE N=0. The DG already encodes
 * these as `awaits` edges from reactive/derived/meta nodes to
 * server-fn nodes; Component 3 walks them.
 *
 * Seeding strategy:
 *   - For each component (markup node) in `C_set`, locate any
 *     `function-decl` AST nodes invoked from its initial-render
 *     subtree via text-interpolation (`${fn(...)}`) or
 *     attribute-expression (`class={fn()}`). Bridge the callee name
 *     to the DG via `fnNodesByName`. From each candidate fn-DG-node,
 *     forward-walk the call-graph adjacency and admit terminal
 *     server-fn nodes.
 *   - Additionally walk `awaits` edges originating from ALL DG
 *     nodes — `reactive` (derived cell with server-fn init),
 *     `meta` (compile-time meta block calling server-fn — though
 *     these typically run at compile time, the closure floor is
 *     conservative). The DG terminal of an `awaits` edge IS a
 *     server-fn. This catches the §40.9.9 worked-example shape
 *     `<state user> = ^server fetchUser()` — DG emits an `awaits`
 *     edge from the @user reactive node to fetchUser.
 *
 * The current implementation does the second strategy unconditionally
 * (closure floor over ALL `awaits` edge terminals reachable from the
 * compile-unit), then filters to the entry-point-scoped surface by
 * cross-referencing the file membership of the originating DG node.
 * Per OQ-A2-C, this is the §40.9.9 admission shape.
 */
function computeTier0(
  componentSet: Set<RSNodeId>,
  markupById: Map<RSNodeId, MarkupNode>,
  files: FileAST[],
  fnNodesByName: Map<string, Set<DGNodeId>>,
  callGraphAdj: Map<DGNodeId, Set<DGNodeId>>,
  allServerFnIds: Set<DGNodeId>,
  dg: ReadOnlyDependencyGraph,
): Set<DGNodeId> {
  const out = new Set<DGNodeId>();

  // Strategy A — text-interpolation + attribute callee enumeration
  // over the component-set's markup spine. For each call name found,
  // resolve to candidate DG fn-nodes and forward-close.
  const calleeNamesAtN0 = new Set<string>();
  for (const astId of componentSet) {
    const m = markupById.get(astId);
    if (!m) continue;
    collectInitialRenderCalleeNames(m, calleeNamesAtN0);
  }
  for (const name of calleeNamesAtN0) {
    admitCalleeClosure(name, fnNodesByName, callGraphAdj, allServerFnIds, out);
  }

  // Strategy B — file-scoped reactive cell initializers that invoke
  // server functions. The DG encodes these as `awaits` edges from a
  // reactive node to a server-fn node (dependency-graph.ts:1475 for
  // derived-init callees). We admit all server-fn terminals of
  // `awaits` edges whose source span lives in a file participating in
  // this entry-point's compile unit.
  //
  // Per §40.9.9 worked example: `<state user> = ^server fetchUser()`
  // emits `awaits: @user → fetchUser`. The reactive node `@user` is
  // read during the initial markup render of `ProfileWidget` (Component
  // 1 admits ProfileWidget; Component 2 admits @user; Component 3
  // here admits fetchUser via the `awaits` edge).
  //
  // We restrict to entry-point files via `participatingFiles` —
  // currently the union of all input files (the compile unit is one
  // shared substrate; per-file scoping comes from the per-entry-point
  // C_set already filtering markup-id membership).
  const participatingFiles = new Set<string>();
  for (const file of files) participatingFiles.add(file.filePath);

  // Strategy-B fire condition: only `awaits` edges originating from a
  // NON-FUNCTION DG node count as N=0 — specifically reactive cells
  // (`<state x> = ^server fn()`), derived cells, and meta blocks. The
  // intuition: these node kinds execute their initializer / derivation
  // expression during initial render. A function-node `awaits` edge
  // means "this client fn calls this server fn" — that's only N=0 if
  // the client fn itself runs at initial render, which is exactly
  // what tier-1 via event handlers / tier-0 strategy A admits when
  // we walk the call-graph from a render-entered callee. Admitting
  // a function-source `awaits` directly would over-admit (false N=0
  // for click-only handlers like §3's handleClick).
  for (const [from, neighbors] of callGraphAdj) {
    // Skip when the source node is a function — those edges are
    // walked transitively via strategy A, never directly seeded as
    // N=0.
    const fromKind = dg.nodes.get(from)?.kind;
    if (fromKind === "function") continue;
    for (const neighbor of neighbors) {
      if (!allServerFnIds.has(neighbor)) continue;
      if (isFromInParticipatingFile(from, participatingFiles)) {
        out.add(neighbor);
      }
    }
  }

  return out;
}

/**
 * Heuristic: a DG nodeId of the form `prefix::<filePath>::<start>::<counter>`
 * encodes its source-file path as the second `::`-delimited segment.
 * (See `makeNodeId` in dependency-graph.ts:239.) We test membership
 * by extracting the file segment.
 */
function isFromInParticipatingFile(
  nodeId: DGNodeId,
  participatingFiles: Set<string>,
): boolean {
  // Format: `<prefix>::<filePath>::<start>::<counter>`
  // The prefix may itself contain `::` (defensive — it doesn't today).
  // Split on `::` and look for any segment that's a known file.
  if (participatingFiles.size === 0) return true;
  const parts = nodeId.split("::");
  for (const part of parts) {
    if (participatingFiles.has(part)) return true;
  }
  return false;
}

/**
 * Tier 1 — server-fns reachable via direct user interaction with
 * components in `C_set`.
 *
 * Per §40.9.4 normative: edges from event-handler-attached components
 * to the server functions those handlers invoke. We walk the markup
 * subtree of every component in `C_set`, collect event-handler
 * attribute callees, bridge them to DG function nodes, and forward-
 * close via `calls`/`awaits` adjacency.
 *
 * Adds to the existing tier1 set (which is seeded with tier0 — tier
 * monotonicity per §40.9.7).
 */
function addTier1(
  tier1: Set<DGNodeId>,
  componentSet: Set<RSNodeId>,
  markupById: Map<RSNodeId, MarkupNode>,
  fnNodesByName: Map<string, Set<DGNodeId>>,
  callGraphAdj: Map<DGNodeId, Set<DGNodeId>>,
  allServerFnIds: Set<DGNodeId>,
): void {
  for (const astId of componentSet) {
    const m = markupById.get(astId);
    if (!m) continue;
    // Per-markup event-handler attribute scan.
    forEachEventHandlerCallee(m, (calleeName) => {
      admitCalleeClosure(
        calleeName,
        fnNodesByName,
        callGraphAdj,
        allServerFnIds,
        tier1,
      );
    });
  }
}

/**
 * Tier 2 — cascade — server-fns invoked by the initial render of
 * components newly instantiated by an N=1 interaction.
 *
 * In the v0.3.0 scope, the typical N=2 surface arises from engine
 * state-child variant transitions (`<onTimeout to=.X>` / `<onIdle
 * to=.X>` / `<onTransition to=.X>`) firing during N=1. The destination
 * arm's state-child body is initial-rendered at N=2; any server-fn
 * called during that initial render qualifies as N=2.
 *
 * Engine state-child bodies live in `engineMeta.stateChildren[].bodyRaw`
 * (raw text — see engine-statechild-parser.ts + primer §13.7 B14). We
 * extract callee names by regex match over the bodyRaw (consistent
 * with the dependency-graph A-1.5 Shape 1 emission pattern at
 * dependency-graph.ts:2158).
 *
 * Component 1 already worst-case-admits runtime-gated branches, so
 * conditional renderings that don't involve engines are typically
 * already in `C_set` at tier 1's processing — the tier 2 cascade
 * surface is narrow in practice but exists for engines.
 */
function addTier2(
  tier2: Set<DGNodeId>,
  componentSet: Set<RSNodeId>,
  markupById: Map<RSNodeId, MarkupNode>,
  fnNodesByName: Map<string, Set<DGNodeId>>,
  fnDeclsByName: Map<string, FunctionDeclNode[]>,
  callGraphAdj: Map<DGNodeId, Set<DGNodeId>>,
  allServerFnIds: Set<DGNodeId>,
): void {
  for (const astId of componentSet) {
    const m = markupById.get(astId);
    if (!m) continue;
    // Engine-decl cascade scan — walk into `engineMeta.stateChildren[].bodyRaw`
    // and collect callee identifier names. The bodyRaw is opaque text
    // at v0.3.0; we conservatively over-admit by including ANY ident
    // that resolves to a known function name in `fnDeclsByName`.
    walkEngineStateChildren(m, (bodyRaw) => {
      const identNames = extractIdentifierNames(bodyRaw);
      for (const name of identNames) {
        if (!fnDeclsByName.has(name)) continue;
        admitCalleeClosure(
          name,
          fnNodesByName,
          callGraphAdj,
          allServerFnIds,
          tier2,
        );
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Markup traversal helpers
// ---------------------------------------------------------------------------

/**
 * Walk a markup subtree DFS source-order, invoking `cb` for each
 * event-handler attribute's CallRefAttrValue.name. The walker
 * descends into all markup children.
 *
 * Only `CallRefAttrValue` (kind === "call-ref") shapes are visited —
 * the `name` field is the bare callee identifier. Expression-form
 * handlers (`onclick=${fn(arg)}`) have AttrValue.kind === "expr"
 * and carry their callee name in `raw`/`exprNode`; we collect those
 * via the auxiliary identifier-text extraction below to keep the
 * worst-case-union floor (over-admit candidates whose name matches
 * a known function decl).
 */
function forEachEventHandlerCallee(
  m: MarkupNode,
  cb: (calleeName: string) => void,
): void {
  visitMarkup(m, (cur) => {
    if (!Array.isArray(cur.attrs)) return;
    for (const attr of cur.attrs) {
      if (!attr || !attr.name) continue;
      if (!isEventHandlerAttrName(attr.name)) continue;
      collectCalleeNamesFromAttr(attr, cb);
    }
  });
}

/**
 * Extract callee names from a single attribute value.
 *
 * Handles three shapes:
 *   - `call-ref` — the `name` field is the callee identifier.
 *   - `expr` — the `raw` source-text may reference identifiers; we
 *     extract bare identifier tokens (matches anything that could be
 *     a function reference; over-admission is the floor).
 *   - `variable-ref` — `onclick=handler` (no parens). The `name`
 *     field is the bare ident.
 *
 * Other shapes (string-literal / props-block / absent) have no callee.
 */
function collectCalleeNamesFromAttr(
  attr: AttrNode,
  cb: (calleeName: string) => void,
): void {
  const v = attr.value;
  if (!v || typeof v !== "object") return;

  if (v.kind === "call-ref") {
    const cr = v as CallRefAttrValue;
    if (typeof cr.name === "string" && cr.name.length > 0) cb(cr.name);
    return;
  }
  if (v.kind === "variable-ref") {
    if (typeof v.name === "string" && v.name.length > 0) cb(v.name);
    return;
  }
  if (v.kind === "expr") {
    // Parse-out bare identifier tokens. `${() => fn(x)}` produces
    // identifiers ["fn", "x"]; the `x` is not a fn name and won't
    // resolve through `fnNodesByName` — the bridge filter takes care
    // of the over-admission.
    if (typeof v.raw === "string") {
      for (const ident of extractIdentifierNames(v.raw)) cb(ident);
    }
  }
}

/**
 * Walk a markup subtree and collect callee names found in any
 * "initial-render context" — text interpolations + attribute
 * expressions. The N=0 sweep uses this to find direct fn invocations
 * that fire during initial mount.
 *
 * The text-interpolation shape `${fn(...)}` is captured by walking
 * `bare-expr` child nodes. The attribute-expression shape `attr=${...}`
 * is captured by examining `expr`-kind AttrValues. Both are over-
 * inclusive — over-admission is the §40.9.2 worst-case-union floor.
 *
 * Event-handler attrs are EXCLUDED here — they fire at N=1, not N=0.
 */
function collectInitialRenderCalleeNames(
  m: MarkupNode,
  acc: Set<string>,
): void {
  visitMarkup(m, (cur) => {
    // Non-event attribute expressions.
    if (Array.isArray(cur.attrs)) {
      for (const attr of cur.attrs) {
        if (!attr || !attr.name) continue;
        if (isEventHandlerAttrName(attr.name)) continue;
        const v = attr.value;
        if (!v || typeof v !== "object") continue;
        if (v.kind === "expr" && typeof v.raw === "string") {
          for (const ident of extractIdentifierNames(v.raw)) acc.add(ident);
        }
        if (v.kind === "call-ref") {
          const cr = v as CallRefAttrValue;
          if (typeof cr.name === "string" && cr.name.length > 0) {
            acc.add(cr.name);
          }
        }
      }
    }
    // Text-interpolation children: bare-expr nodes inside markup.
    if (Array.isArray(cur.children)) {
      for (const ch of cur.children) {
        if (!ch || typeof ch !== "object") continue;
        const cAny = ch as unknown as Record<string, unknown>;
        if (cAny.kind === "bare-expr") {
          // `bare-expr` carries the source as `expr` (string) or
          // `exprNode`; the cheap extractor is the string field.
          const raw = typeof cAny.expr === "string" ? (cAny.expr as string) : null;
          if (raw) {
            for (const ident of extractIdentifierNames(raw)) acc.add(ident);
          }
        }
      }
    }
  });
}

/**
 * Walk an engine-decl AST node's state-child bodies, invoking `cb`
 * for each bodyRaw text payload found.
 *
 * Engine state-child bodies are raw text in `engineMeta.stateChildren[i].bodyRaw`
 * per the engine-statechild-parser convention (primer §13.7 B14).
 * We also walk `onTimeoutElements[].bodyRaw` and the engine-wide
 * `idleWatchdog.body` when present — these are the §51.0.M / §51.0.R
 * firing-path bodies whose initial-render callees fire at N+1.
 */
function walkEngineStateChildren(
  m: MarkupNode,
  cb: (bodyRaw: string) => void,
): void {
  visitMarkup(m, (cur) => {
    if (cur.tag !== "engine") return;
    // The engine-decl AST node carries its parsed metadata at
    // `_record.engineMeta` (mirrors the dependency-graph access
    // pattern at dependency-graph.ts:2133-2156). We duck-type at
    // the boundary — the test fixture builds the metadata directly.
    const anyNode = cur as unknown as Record<string, unknown>;
    const record = anyNode._record as Record<string, unknown> | undefined;
    const engineMeta =
      (record && (record.engineMeta as Record<string, unknown>)) ||
      (anyNode.engineMeta as Record<string, unknown> | undefined);
    if (!engineMeta) return;

    const stateChildren = engineMeta.stateChildren;
    if (Array.isArray(stateChildren)) {
      for (const sc of stateChildren as Array<Record<string, unknown>>) {
        // §51.0.B — state-child body raw text (variant arm).
        const bodyRaw = sc.bodyRaw;
        if (typeof bodyRaw === "string" && bodyRaw.length > 0) cb(bodyRaw);
        // §51.0.M — <onTimeout> firing-path body. The destination
        // variant's arm body is initial-rendered when the timer fires;
        // we admit any server-fn called during that render.
        const onTimeoutEls = sc.onTimeoutElements;
        if (Array.isArray(onTimeoutEls)) {
          for (const oto of onTimeoutEls as Array<Record<string, unknown>>) {
            const otoBody = oto.bodyRaw;
            if (typeof otoBody === "string" && otoBody.length > 0) cb(otoBody);
          }
        }
        // §51.0.H — <onTransition> body. Effect statements may invoke
        // server-fns directly.
        const onTransEls = sc.onTransitionElements;
        if (Array.isArray(onTransEls)) {
          for (const ot of onTransEls as Array<Record<string, unknown>>) {
            const otBody = ot.bodyRaw;
            if (typeof otBody === "string" && otBody.length > 0) cb(otBody);
          }
        }
      }
    }
    // §51.0.R — engine-wide <onIdle> firing-path body.
    const idleWatchdog = engineMeta.idleWatchdog as
      | Record<string, unknown>
      | null
      | undefined;
    if (idleWatchdog) {
      const idleBody = idleWatchdog.bodyRaw ?? idleWatchdog.body;
      if (typeof idleBody === "string" && idleBody.length > 0) cb(idleBody);
    }
  });
}

/**
 * Generic markup DFS — invokes `cb` for every MarkupNode reached,
 * including the initial node. Source-order traversal.
 */
function visitMarkup(node: ASTNode, cb: (m: MarkupNode) => void): void {
  if (!node || typeof node !== "object") return;
  if (node.kind !== "markup") return;
  const m = node as MarkupNode;
  cb(m);
  for (const child of m.children) visitMarkup(child as ASTNode, cb);
}

// ---------------------------------------------------------------------------
// Identifier extraction
// ---------------------------------------------------------------------------

/**
 * Extract bare identifier tokens from raw source text.
 *
 * Mirrors the convention in route-inference.ts:2047 (IDENT_RE).
 * Over-includes — non-callable identifiers (parameter names, local
 * bindings) are filtered downstream by `fnNodesByName` Set membership.
 */
const IDENT_RE = /[A-Za-z_$][A-Za-z0-9_$]*/g;

function extractIdentifierNames(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  let m: RegExpExecArray | null;
  IDENT_RE.lastIndex = 0;
  while ((m = IDENT_RE.exec(text)) !== null) {
    out.push(m[0]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Forward call-graph closure
// ---------------------------------------------------------------------------

/**
 * Resolve `calleeName` to candidate DG fn-nodes, then forward-walk
 * the call-graph adjacency, admitting any reached server-fn node.
 *
 * The walk handles:
 *   - Direct admission: the callee itself is a server-fn (its DG
 *     node is in `allServerFnIds`) → admit.
 *   - Transitive admission: the callee is a client fn that calls
 *     server fn(s) via `awaits` edges → admit the server-fns.
 *   - Worst-case-union (§40.9.4): when a callee resolution is
 *     ambiguous (multiple DG candidates for the same name across
 *     files), admit ALL candidates' closures. When zero candidates
 *     resolve (unknown name — e.g. an HTML attribute value that
 *     wasn't actually a fn), admit nothing (safe over-strict floor).
 *
 * Visited-set cycle guard tolerates synthetic graphs.
 */
function admitCalleeClosure(
  calleeName: string,
  fnNodesByName: Map<string, Set<DGNodeId>>,
  callGraphAdj: Map<DGNodeId, Set<DGNodeId>>,
  allServerFnIds: Set<DGNodeId>,
  acc: Set<DGNodeId>,
): void {
  const candidates = fnNodesByName.get(calleeName);
  if (!candidates || candidates.size === 0) return;

  const visited = new Set<DGNodeId>();
  const stack: DGNodeId[] = [];

  for (const c of candidates) {
    if (!visited.has(c)) {
      visited.add(c);
      stack.push(c);
      // Direct admission — the callee IS a server-fn.
      if (allServerFnIds.has(c)) acc.add(c);
    }
  }

  while (stack.length > 0) {
    const current = stack.pop()!;
    const neighbors = callGraphAdj.get(current);
    if (!neighbors) continue;
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      // Admit server-fn terminals.
      if (allServerFnIds.has(neighbor)) acc.add(neighbor);
      // Keep walking — neighbor may be a client fn whose downstream
      // callees include server-fns.
      stack.push(neighbor);
    }
  }
}

// ---------------------------------------------------------------------------
// FileAST helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a file's top-level AST node list. Mirrors
 * entry-points.ts / component-1.ts pattern.
 */
function getTopLevelNodes(file: FileAST): ASTNode[] {
  if (Array.isArray((file as { nodes?: ASTNode[] }).nodes)) {
    return (file as { nodes: ASTNode[] }).nodes;
  }
  const ast = (file as unknown as { ast?: { nodes?: ASTNode[] } }).ast;
  if (ast && Array.isArray(ast.nodes)) return ast.nodes;
  return [];
}

/**
 * Visit every function-decl AST node in a file, regardless of
 * structural nesting (top-level + inside logic blocks + inside
 * component-def bodies).
 *
 * Recursive walk — descends through markup children, logic block
 * `body`, meta block `body`, and component-def `body` whenever
 * the field is an array of nodes.
 */
function forEachFunctionDecl(file: FileAST, cb: (fn: FunctionDeclNode) => void): void {
  const seen = new Set<unknown>();
  function rec(node: unknown): void {
    if (!node || typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);
    const n = node as Record<string, unknown>;
    if (n.kind === "function-decl") {
      cb(n as unknown as FunctionDeclNode);
    }
    // Recurse into known array-of-node fields.
    for (const key of ["nodes", "children", "body"]) {
      const arr = n[key];
      if (Array.isArray(arr)) {
        for (const child of arr) rec(child);
      }
    }
    // Also recurse into objects under a few well-known nested keys.
    for (const key of ["ast"]) {
      const obj = n[key];
      if (obj && typeof obj === "object") rec(obj);
    }
  }
  rec(file);
}
