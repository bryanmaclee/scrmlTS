/**
 * Reachability Solver — Component 3 conformance suite.
 *
 * S90 wave A-2.4 — exercises `server_fn_reachable_within(N, C_set)`
 * per SPEC §40.9.4 via the full `runReachabilitySolver` entry point.
 *
 * Each test constructs:
 *   1. A synthetic FileAST whose program body contains the markup
 *      under test (event-handler attrs / engine state-children /
 *      bind:value bindings).
 *   2. A synthetic DG containing the function-decl DG nodes (with
 *      boundary classification + span linkage back to the AST
 *      function-decl), the call-graph `calls`/`awaits` edges, plus
 *      the Component 1 + Component 2 substrate (RenderDGNodes +
 *      MarkupReadDGNodes) when needed for cross-component validation.
 *
 * The DG is duck-typed at the boundary — Component 3's
 * `ReadOnlyDependencyGraph` consumes only `nodes: Map` + `edges: []`,
 * matching the dependency-graph.ts internal shape verbatim. We
 * build the DG by hand rather than round-tripping the full Stage 7
 * pipeline so the projection semantics are exercised in isolation.
 *
 * Coverage (15 scenarios per SCOPING §A-2.4 tests-gating list):
 *   §1  N=0 initial-render server-fn — `<state user> = ^server fetchUser()`
 *       shape; reactive cell's `awaits` edge admits server-fn at tier 0.
 *   §2  N=1 onclick → server-fn — direct event-handler call-ref
 *       admits server-fn at tier 1 (NOT tier 0).
 *   §3  N=1 onclick → client fn → server-fn — transitive call-graph
 *       closure admits the eventual server-fn target.
 *   §4  N=1 onsubmit → server-fn — alternate event-handler attr name.
 *   §5  N=1 onchange → server-fn — yet another event-handler attr.
 *   §6  N=1 bind:value=@cell — write path admits server-fn reached via
 *       the cell's downstream awaits chain.
 *   §7  N=2 `<onTimeout to=.X>` cascade — destination arm's bodyRaw
 *       contains a server-fn callee identifier; admitted at tier 2.
 *   §8  N=2 `<onIdle to=.X>` cascade — idle watchdog body's callee
 *       admitted at tier 2.
 *   §9  N=2 `<onTransition to=.X>` body — transition effect calls
 *       server-fn → admitted at tier 2.
 *   §10 Channel `onserver:message=handler()` — the handler invokes a
 *       server-fn; admitted at tier 1.
 *   §11 Tier monotonicity — tier0 ⊆ tier1 ⊆ tier2 in cumulative form;
 *       the chunk plan's prefetchTier1 / prefetchTier2 are DELTAS.
 *   §12 No event handlers, no awaits → empty server-fn tiers.
 *   §13 Worst-case-union: ambiguous callee name (two DG candidates)
 *       admits both closures.
 *   §14 Unknown callee name → no admission (safe over-strict floor).
 *   §15 Absent DG → empty server-fn tiers; component-1 result preserved.
 */

import { describe, test, expect } from "bun:test";
import { runReachabilitySolver } from "../../src/reachability-solver.ts";
import type {
  ASTNode,
  AttrNode,
  FileAST,
  MarkupNode,
  Span,
} from "../../src/types/ast.ts";

// ---------------------------------------------------------------------------
// Synthetic AST builders
// ---------------------------------------------------------------------------

const FILE = "/abs/t.scrml";
const span = (start: number = 0, end: number = 0): Span => ({
  file: FILE,
  start,
  end,
  line: 1,
  col: 1,
});

let nextId = 1;
let nextSpanStart = 100;
function nid(): number { return nextId++; }
function newSpan(): Span {
  const s = nextSpanStart;
  nextSpanStart += 10;
  return { file: FILE, start: s, end: s + 1, line: 1, col: 1 };
}

function markup(
  tag: string,
  attrs: AttrNode[] = [],
  children: ASTNode[] = [],
  opts: Record<string, unknown> = {},
): MarkupNode {
  return {
    id: nid(),
    span: newSpan(),
    kind: "markup",
    tag,
    attrs,
    children,
    selfClosing: false,
    closerForm: `</${tag}>`,
    isComponent: false,
    ...opts,
  } as MarkupNode;
}

function attr(name: string, value: AttrNode["value"]): AttrNode {
  return { name, value, span: span() };
}

function callRefAttr(name: string, calleeName: string, args: string[] = []): AttrNode {
  return attr(name, {
    kind: "call-ref",
    name: calleeName,
    args,
    span: span(),
  });
}

function exprAttr(name: string, raw: string): AttrNode {
  return attr(name, { kind: "expr", raw, refs: [], span: span() });
}

function variableRefAttr(name: string, refName: string): AttrNode {
  return attr(name, { kind: "variable-ref", name: refName, span: span() });
}

function bareExprChild(expr: string): ASTNode {
  // bare-expr nodes are NOT in the canonical ASTNode union but are
  // walked by Component 3's initial-render callee enumeration.
  return {
    kind: "bare-expr",
    expr,
    span: newSpan(),
    id: nid(),
  } as unknown as ASTNode;
}

function file(filePath: string, nodes: ASTNode[]): FileAST {
  return {
    filePath,
    nodes,
    imports: [],
    exports: [],
    components: [],
    typeDecls: [],
    spans: {},
    hasProgramRoot: nodes.some(n => n && (n as MarkupNode).tag === "program"),
    authConfig: null,
    middlewareConfig: null,
  } as unknown as FileAST;
}

/**
 * Append synthetic function-decl AST nodes onto a file's nodes array.
 *
 * Component 3's name → DG bridge requires BOTH the AST function-decl
 * (with span) AND the DG fn-node (with matching span). Tests need to
 * inject the AST function-decls explicitly since the synthetic
 * pipeline bypasses TAB.
 */
function withFnDecls(f: FileAST, ...fns: Array<{ astNode: ASTNode }>): FileAST {
  const arr = (f as unknown as { nodes: ASTNode[] }).nodes;
  for (const fn of fns) arr.push(fn.astNode);
  return f;
}

// Build a function-decl AST node with the file-local span the DG uses
// to bridge name → DG nodeId.
function fnDecl(
  fileName: string,
  fnName: string,
  isServer: boolean,
  startOffset: number,
): { astNode: ASTNode; span: Span } {
  const sp: Span = {
    file: fileName,
    start: startOffset,
    end: startOffset + 1,
    line: 1,
    col: 1,
  };
  const astNode = {
    kind: "function-decl",
    name: fnName,
    params: [],
    body: [],
    fnKind: "function" as const,
    isServer,
    canFail: false,
    span: sp,
    id: nid(),
  } as unknown as ASTNode;
  return { astNode, span: sp };
}

// ---------------------------------------------------------------------------
// Synthetic DG builders
// ---------------------------------------------------------------------------

type DGNode =
  | { kind: "render"; nodeId: string; markupNodeId: string; hasLift: boolean; span: Span }
  | { kind: "markup-read"; nodeId: string; sourceRenderNodeId: string | null; ownerScope: string; hasLift: boolean; span: Span }
  | { kind: "reactive"; nodeId: string; varName: string; hasLift: boolean; span: Span }
  | { kind: "function"; nodeId: string; boundary: "client" | "server"; hasLift: boolean; span: Span };

interface DGEdge { from: string; to: string; kind: string; }
interface SyntheticDG { nodes: Map<string, DGNode>; edges: DGEdge[]; }

function makeDG(): SyntheticDG { return { nodes: new Map(), edges: [] }; }

function fnNode(
  filePath: string,
  fnSpan: Span,
  boundary: "client" | "server",
): DGNode {
  return {
    kind: "function",
    nodeId: `fn::${filePath}::${fnSpan.start}::${Math.floor(Math.random() * 1e9)}`,
    boundary,
    hasLift: false,
    span: fnSpan,
  };
}

function reactiveNode(filePath: string, varName: string, start: number): DGNode {
  return {
    kind: "reactive",
    nodeId: `reactive::${filePath}::${start}::${Math.floor(Math.random() * 1e9)}`,
    varName,
    hasLift: false,
    span: { file: filePath, start, end: start + 1, line: 1, col: 1 },
  };
}

function addNode(dg: SyntheticDG, node: DGNode): DGNode {
  dg.nodes.set(node.nodeId, node);
  return node;
}

function edge(dg: SyntheticDG, from: string, to: string, kind: string): void {
  dg.edges.push({ from, to, kind });
}

function runOne(files: FileAST[], depGraph: SyntheticDG | null) {
  return runReachabilitySolver({
    depGraph: depGraph as unknown as never,
    files,
  });
}

function firstPlan(record: ReturnType<typeof runOne>["record"]) {
  const [, rps] = record.closures.entries().next().value!;
  return rps.byRole.get("_anonymous")!;
}

// ---------------------------------------------------------------------------
// §1 — N=0 initial-render server-fn (reactive cell init via ^server fetchUser())
// ---------------------------------------------------------------------------

describe("§1 N=0 initial-render server-fn", () => {
  test("reactive cell with awaits edge to server-fn → admitted at tier 0", () => {
    // ProfileWidget shape per §40.9.9: <state user> = ^server fetchUser().
    // DG emits: reactive::@user --awaits--> fn::fetchUser (server).
    const comp = markup("div");
    const program = markup("program", [], [comp]);
    const f = file(FILE, [program]);

    // The fn-decl for fetchUser lives in the file (or stdlib); the
    // DG node for it has boundary "server".
    const fnFetch = fnDecl(FILE, "fetchUser", true, 200);

    const dg = makeDG();
    const userCell = addNode(dg, reactiveNode(FILE, "user", 50));
    const fetchFn = addNode(dg, fnNode(FILE, fnFetch.span, "server"));
    // The DG `awaits` edge from the reactive cell to the server-fn
    // (the §40.9.9 initial-render admission shape).
    edge(dg, userCell.nodeId, fetchFn.nodeId, "awaits");

    const plan = firstPlan(runOne([f], dg).record);
    expect(plan.initialChunk.serverFnNodeIds.has(fetchFn.nodeId)).toBe(true);
    // Tier 1/2 deltas are EMPTY for this server-fn (it's already in tier 0).
    expect(plan.prefetchTier1.serverFnNodeIds.has(fetchFn.nodeId)).toBe(false);
    expect(plan.prefetchTier2.serverFnNodeIds.has(fetchFn.nodeId)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §2 — N=1 onclick → server-fn
// ---------------------------------------------------------------------------

describe("§2 N=1 onclick → server-fn", () => {
  test("event-handler call-ref → server-fn admitted at tier 1 (not tier 0)", () => {
    const saveFn = fnDecl(FILE, "save", true, 300);
    const button = markup(
      "button",
      [callRefAttr("onclick", "save", [])],
      [],
    );
    const program = markup("program", [], [button]);
    const f = withFnDecls(file(FILE, [program]), saveFn);

    const dg = makeDG();
    const fnDG = addNode(dg, fnNode(FILE, saveFn.span, "server"));

    const plan = firstPlan(runOne([f], dg).record);
    // tier 0 — does NOT contain save (not an initial-render call).
    expect(plan.initialChunk.serverFnNodeIds.has(fnDG.nodeId)).toBe(false);
    // tier 1 delta — DOES contain save.
    expect(plan.prefetchTier1.serverFnNodeIds.has(fnDG.nodeId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §3 — N=1 transitive call-graph closure
// ---------------------------------------------------------------------------

describe("§3 N=1 onclick → client fn → server-fn (transitive)", () => {
  test("client fn callee that transitively awaits server-fn → server-fn admitted at tier 1", () => {
    const handlerFn = fnDecl(FILE, "handleClick", false, 400);
    const sendFn = fnDecl(FILE, "sendData", true, 500);
    const button = markup(
      "button",
      [callRefAttr("onclick", "handleClick", [])],
      [],
    );
    const program = markup("program", [], [button]);
    const f = withFnDecls(file(FILE, [program]), handlerFn, sendFn);

    const dg = makeDG();
    const clientFn = addNode(dg, fnNode(FILE, handlerFn.span, "client"));
    const serverFn = addNode(dg, fnNode(FILE, sendFn.span, "server"));
    edge(dg, clientFn.nodeId, serverFn.nodeId, "awaits");

    const plan = firstPlan(runOne([f], dg).record);
    expect(plan.prefetchTier1.serverFnNodeIds.has(serverFn.nodeId)).toBe(true);
    // handleClick itself is a client fn — not server-admitted.
    expect(plan.prefetchTier1.serverFnNodeIds.has(clientFn.nodeId)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §4 — N=1 onsubmit → server-fn
// ---------------------------------------------------------------------------

describe("§4 N=1 onsubmit → server-fn", () => {
  test("onsubmit call-ref attr behaves identically to onclick", () => {
    const submitFn = fnDecl(FILE, "submitForm", true, 600);
    const form = markup(
      "form",
      [callRefAttr("onsubmit", "submitForm", [])],
      [],
    );
    const program = markup("program", [], [form]);
    const f = withFnDecls(file(FILE, [program]), submitFn);

    const dg = makeDG();
    const fnDG = addNode(dg, fnNode(FILE, submitFn.span, "server"));

    const plan = firstPlan(runOne([f], dg).record);
    expect(plan.prefetchTier1.serverFnNodeIds.has(fnDG.nodeId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §5 — N=1 onchange → server-fn
// ---------------------------------------------------------------------------

describe("§5 N=1 onchange → server-fn", () => {
  test("onchange call-ref attr — same projection shape", () => {
    const updateFn = fnDecl(FILE, "updateRecord", true, 700);
    const select = markup(
      "select",
      [callRefAttr("onchange", "updateRecord", [])],
      [],
    );
    const program = markup("program", [], [select]);
    const f = withFnDecls(file(FILE, [program]), updateFn);

    const dg = makeDG();
    const fnDG = addNode(dg, fnNode(FILE, updateFn.span, "server"));

    const plan = firstPlan(runOne([f], dg).record);
    expect(plan.prefetchTier1.serverFnNodeIds.has(fnDG.nodeId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §6 — bind:value=@cell write-path
// ---------------------------------------------------------------------------

describe("§6 bind:value=@cell write path admits server-fn via cell's awaits chain", () => {
  test("input bind:value=@cell where @cell's downstream writer awaits server-fn", () => {
    // The bind:value attribute's CallRefAttrValue.name resolves to a
    // function-decl whose body awaits a server fn. Component 3's
    // event-handler projection treats bind:* the same as on* — the
    // callee's transitive awaits become tier 1.
    //
    // Construct: bind:value=updateCell where updateCell calls server-fn syncCell.
    const updateFn = fnDecl(FILE, "updateCell", false, 800);
    const syncFn = fnDecl(FILE, "syncCell", true, 900);
    const input = markup(
      "input",
      [callRefAttr("bind:value", "updateCell", [])],
      [],
    );
    const program = markup("program", [], [input]);
    const f = withFnDecls(file(FILE, [program]), updateFn, syncFn);

    const dg = makeDG();
    const clientFn = addNode(dg, fnNode(FILE, updateFn.span, "client"));
    const serverFn = addNode(dg, fnNode(FILE, syncFn.span, "server"));
    edge(dg, clientFn.nodeId, serverFn.nodeId, "awaits");

    const plan = firstPlan(runOne([f], dg).record);
    expect(plan.prefetchTier1.serverFnNodeIds.has(serverFn.nodeId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §7 — N=2 <onTimeout to=.X> cascade — destination arm body's server-fn callee
// ---------------------------------------------------------------------------

describe("§7 N=2 <onTimeout> cascade admits server-fn in destination arm body", () => {
  test("onTimeoutElements[].bodyRaw contains a server-fn callee → tier 2 admission", () => {
    const refreshFn = fnDecl(FILE, "refreshData", true, 1000);

    // Build the engine state-child shape via the DG-pattern (anyNode._record.engineMeta).
    const engineNode = markup("engine", [], [], {
      _record: {
        engineMeta: {
          stateChildren: [
            {
              bodyRaw: "",
              onTimeoutElements: [
                // <onTimeout after="5s" to=.Loaded> with effect body
                // that calls refreshData.
                { bodyRaw: "refreshData()", after: "5s", to: ".Loaded" },
              ],
            },
          ],
        },
      },
    });
    const wrapper = markup("div", [], [engineNode]);
    const program = markup("program", [], [wrapper]);
    const f = withFnDecls(file(FILE, [program]), refreshFn);

    const dg = makeDG();
    const refreshDG = addNode(dg, fnNode(FILE, refreshFn.span, "server"));

    const plan = firstPlan(runOne([f], dg).record);
    // Tier 0 — does NOT contain refreshData.
    expect(plan.initialChunk.serverFnNodeIds.has(refreshDG.nodeId)).toBe(false);
    // Tier 1 delta — also does NOT contain refreshData (no event handler).
    expect(plan.prefetchTier1.serverFnNodeIds.has(refreshDG.nodeId)).toBe(false);
    // Tier 2 delta — DOES contain refreshData via the engine cascade.
    expect(plan.prefetchTier2.serverFnNodeIds.has(refreshDG.nodeId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §8 — N=2 <onIdle to=.X> cascade
// ---------------------------------------------------------------------------

describe("§8 N=2 <onIdle> cascade admits server-fn in idle watchdog body", () => {
  test("engineMeta.idleWatchdog.bodyRaw contains a server-fn callee → tier 2 admission", () => {
    const logoutFn = fnDecl(FILE, "logoutUser", true, 1100);

    const engineNode = markup("engine", [], [], {
      _record: {
        engineMeta: {
          stateChildren: [],
          idleWatchdog: {
            after: "30m",
            to: ".LoggedOut",
            bodyRaw: "logoutUser()",
          },
        },
      },
    });
    const wrapper = markup("section", [], [engineNode]);
    const program = markup("program", [], [wrapper]);
    const f = withFnDecls(file(FILE, [program]), logoutFn);

    const dg = makeDG();
    const logoutDG = addNode(dg, fnNode(FILE, logoutFn.span, "server"));

    const plan = firstPlan(runOne([f], dg).record);
    expect(plan.prefetchTier2.serverFnNodeIds.has(logoutDG.nodeId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §9 — N=2 <onTransition to=.X> body
// ---------------------------------------------------------------------------

describe("§9 N=2 <onTransition> body callee admitted at tier 2", () => {
  test("onTransitionElements[].bodyRaw contains a server-fn callee", () => {
    const persistFn = fnDecl(FILE, "persistState", true, 1200);

    const engineNode = markup("engine", [], [], {
      _record: {
        engineMeta: {
          stateChildren: [
            {
              bodyRaw: "",
              onTransitionElements: [
                { bodyRaw: "persistState()", to: ".Done" },
              ],
            },
          ],
        },
      },
    });
    const program = markup("program", [], [engineNode]);
    const f = withFnDecls(file(FILE, [program]), persistFn);

    const dg = makeDG();
    const persistDG = addNode(dg, fnNode(FILE, persistFn.span, "server"));

    const plan = firstPlan(runOne([f], dg).record);
    expect(plan.prefetchTier2.serverFnNodeIds.has(persistDG.nodeId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §10 — Channel onserver:message=handler() admits server-fn at tier 1
// ---------------------------------------------------------------------------

describe("§10 channel onserver:message= → server-fn at tier 1", () => {
  test("onserver:message attr (call-ref) → handler's awaits chain admitted at tier 1", () => {
    const handlerFn = fnDecl(FILE, "handleMessage", true, 1300);

    const channel = markup(
      "channel",
      [callRefAttr("onserver:message", "handleMessage", ["msg"])],
      [],
    );
    const program = markup("program", [], [channel]);
    const f = withFnDecls(file(FILE, [program]), handlerFn);

    const dg = makeDG();
    const handlerDG = addNode(dg, fnNode(FILE, handlerFn.span, "server"));

    const plan = firstPlan(runOne([f], dg).record);
    expect(plan.prefetchTier1.serverFnNodeIds.has(handlerDG.nodeId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §11 — Tier monotonicity (cumulative semantics + delta exposition)
// ---------------------------------------------------------------------------

describe("§11 tier monotonicity — tier1 includes tier0 cumulatively, deltas exposed via chunk plan", () => {
  test("server-fn admitted at N=0 is in initial chunk and NOT in tier1/tier2 deltas", () => {
    const initFn = fnDecl(FILE, "initData", true, 1400);
    const clickFn = fnDecl(FILE, "doAction", true, 1500);

    const button = markup(
      "button",
      [callRefAttr("onclick", "doAction", [])],
      [],
    );
    const program = markup("program", [], [button]);
    const f = withFnDecls(file(FILE, [program]), initFn, clickFn);

    const dg = makeDG();
    const initialCell = addNode(dg, reactiveNode(FILE, "init", 60));
    const initDG = addNode(dg, fnNode(FILE, initFn.span, "server"));
    const doActionDG = addNode(dg, fnNode(FILE, clickFn.span, "server"));
    // N=0 admission: reactive cell awaits initData.
    edge(dg, initialCell.nodeId, initDG.nodeId, "awaits");

    const plan = firstPlan(runOne([f], dg).record);
    // initData is in tier 0.
    expect(plan.initialChunk.serverFnNodeIds.has(initDG.nodeId)).toBe(true);
    // initData is NOT in tier 1 delta (it's already at tier 0).
    expect(plan.prefetchTier1.serverFnNodeIds.has(initDG.nodeId)).toBe(false);
    // doAction (from onclick) is in tier 1 delta.
    expect(plan.prefetchTier1.serverFnNodeIds.has(doActionDG.nodeId)).toBe(true);
    expect(plan.initialChunk.serverFnNodeIds.has(doActionDG.nodeId)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §12 — Empty case (no event handlers, no awaits)
// ---------------------------------------------------------------------------

describe("§12 empty case — no event handlers, no awaits", () => {
  test("plain markup with no callees → all server-fn tiers empty", () => {
    const compM = markup("h1", [], [bareExprChild("hello")]);
    const program = markup("program", [], [compM]);
    const f = file(FILE, [program]);

    const dg = makeDG();
    // DG has no function nodes at all.

    const plan = firstPlan(runOne([f], dg).record);
    expect(plan.initialChunk.serverFnNodeIds.size).toBe(0);
    expect(plan.prefetchTier1.serverFnNodeIds.size).toBe(0);
    expect(plan.prefetchTier2.serverFnNodeIds.size).toBe(0);
    // Component 1's component admission is unaffected.
    expect(plan.initialChunk.componentNodeIds.has(compM.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §13 — Worst-case-union — ambiguous callee name
// ---------------------------------------------------------------------------

describe("§13 worst-case-union ambiguous callee name → admits all DG candidates", () => {
  test("two DG fn-nodes share the name 'doThing'; both admitted at tier 1", () => {
    // Two function-decls named `doThing` in different files (legal —
    // distinct modules). The event-handler attr resolves to BOTH.
    const fnA = fnDecl(FILE, "doThing", true, 1600);
    const fnB = fnDecl("/abs/other.scrml", "doThing", true, 1700);

    const button = markup(
      "button",
      [callRefAttr("onclick", "doThing", [])],
      [],
    );
    const program = markup("program", [], [button]);
    const fA = withFnDecls(file(FILE, [program]), fnA);
    const fB = withFnDecls(file("/abs/other.scrml", []), fnB);

    const dg = makeDG();
    const dgA = addNode(dg, fnNode(FILE, fnA.span, "server"));
    const dgB = addNode(dg, fnNode("/abs/other.scrml", fnB.span, "server"));

    const plan = firstPlan(runOne([fA, fB], dg).record);
    expect(plan.prefetchTier1.serverFnNodeIds.has(dgA.nodeId)).toBe(true);
    expect(plan.prefetchTier1.serverFnNodeIds.has(dgB.nodeId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §14 — Unknown callee name → no admission
// ---------------------------------------------------------------------------

describe("§14 unknown callee name → safe over-strict floor (no admission)", () => {
  test("onclick=mysteryHandler with no DG fn-node by that name → no server-fn admitted", () => {
    const button = markup(
      "button",
      [callRefAttr("onclick", "mysteryHandler", [])],
      [],
    );
    const program = markup("program", [], [button]);
    const f = file(FILE, [program]);

    const dg = makeDG();
    // No function nodes — `mysteryHandler` doesn't resolve.

    const plan = firstPlan(runOne([f], dg).record);
    expect(plan.prefetchTier1.serverFnNodeIds.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §15 — Absent DG (graceful degradation)
// ---------------------------------------------------------------------------

describe("§15 absent DG — graceful degradation", () => {
  test("null DG → empty server-fn tiers; Component 1 result preserved", () => {
    const button = markup(
      "button",
      [callRefAttr("onclick", "save", [])],
      [],
    );
    const program = markup("program", [], [button]);
    const f = file(FILE, [program]);

    const plan = firstPlan(runOne([f], null).record);
    expect(plan.initialChunk.serverFnNodeIds.size).toBe(0);
    expect(plan.prefetchTier1.serverFnNodeIds.size).toBe(0);
    expect(plan.prefetchTier2.serverFnNodeIds.size).toBe(0);
    // Component 1's component admission is unaffected.
    expect(plan.initialChunk.componentNodeIds.has(button.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §16 — Variable-ref onclick=handler (no parens)
// ---------------------------------------------------------------------------

describe("§16 variable-ref event-handler shape (onclick=handler, no parens)", () => {
  test("onclick=handler resolves the variable-ref name to a server-fn at tier 1", () => {
    const saveFn = fnDecl(FILE, "save", true, 1800);
    const button = markup(
      "button",
      [variableRefAttr("onclick", "save")],
      [],
    );
    const program = markup("program", [], [button]);
    const f = withFnDecls(file(FILE, [program]), saveFn);

    const dg = makeDG();
    const fnDG = addNode(dg, fnNode(FILE, saveFn.span, "server"));

    const plan = firstPlan(runOne([f], dg).record);
    expect(plan.prefetchTier1.serverFnNodeIds.has(fnDG.nodeId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §17 — Expr-form onclick=${() => fn()}
// ---------------------------------------------------------------------------

describe("§17 expr-form event-handler shape (onclick=${() => fn()})", () => {
  test("expr attr value text contains a server-fn ident → admitted at tier 1", () => {
    const persistFn = fnDecl(FILE, "persist", true, 1900);
    const button = markup(
      "button",
      [exprAttr("onclick", "() => persist()")],
      [],
    );
    const program = markup("program", [], [button]);
    const f = withFnDecls(file(FILE, [program]), persistFn);

    const dg = makeDG();
    const fnDG = addNode(dg, fnNode(FILE, persistFn.span, "server"));

    const plan = firstPlan(runOne([f], dg).record);
    expect(plan.prefetchTier1.serverFnNodeIds.has(fnDG.nodeId)).toBe(true);
  });
});
