/**
 * dg-markup-read-emission-a15.test.js — A-1.5 engine surface markup-read emission tests.
 *
 * Verifies that A-1.5 extends sweepNodeForAtRefs to emit MarkupReadDGNodes and
 * reads edges for 3 new engine-related shape categories:
 *
 *   Shape 1: Engine state-child bodyRaw containing @var refs
 *   Shape 2: <onTransition> bodyRaw containing @var refs
 *   Shape 2b: <onTimeout> computed after= (${@var}ms) containing @var refs
 *   Shape 2c: <onIdle> computed after= (${@var}ms) containing @var refs
 *   Shape 3: Engine-cell self-read (engine structurally reads its own cell)
 *
 * Also verifies the additive invariant: creditReader sentinel is preserved
 * alongside the new edges, so E-DG-002 is not broken.
 *
 * Test strategy: hand-craft FileAST objects (with minimal _record annotations)
 * passed directly to runDG, bypassing the SYM pipeline. This matches the
 * approach used by A-1.3 tests in dg-markup-read-emission-a13.test.js.
 *
 * Spec authority: SPEC §51.0.H (<onTransition>), §51.0.M (<onTimeout>),
 *   §51.0.R (<onIdle>), §40.9.3 (markup-context edge emission requirement).
 *   OQ #1 disposition: markup-context (consistent with engine-cell-self-read
 *   pattern). Option X (per-block source node) per A-1.1 ratification.
 */

import { describe, test, expect } from "bun:test";
import { runDG } from "../../src/dependency-graph.ts";

// ---------------------------------------------------------------------------
// AST construction helpers
// ---------------------------------------------------------------------------

function mkSpan(start, file = "/test/a15.scrml") {
  return { file, start, end: start + 10, line: 1, col: start + 1 };
}

function mkStateDecl(name, spanStart = 0, file = "/test/a15.scrml") {
  return { kind: "state-decl", name, init: "0", span: mkSpan(spanStart, file) };
}

function mkLogicBlock(body, spanStart = 0, file = "/test/a15.scrml") {
  return {
    kind: "logic",
    body,
    bodyKind: "logic",
    imports: [],
    exports: [],
    typeDecls: [],
    components: [],
    span: mkSpan(spanStart, file),
  };
}

function mkMarkup({ tag = "program", attrs = [], children = [], spanStart = 100, spanEnd = 5000, file = "/test/a15.scrml" } = {}) {
  return {
    kind: "markup",
    id: spanStart,
    tag,
    attrs,
    children,
    selfClosing: false,
    isComponent: false,
    closerForm: "</>",
    span: { file, start: spanStart, end: spanEnd, line: 1, col: 1 },
  };
}

/**
 * Minimal engine-decl node. The _record.engineMeta is hand-crafted here
 * because runDG is called directly (bypassing the SYM pipeline).
 *
 * The engine-decl MUST be inside a markup node's children so that
 * markupChildDepth > 0 when sweepNodeForAtRefs processes it. Place it as
 * a child of the <program> markup node.
 *
 * @param varName    Auto-declared engine cell name (e.g., "phase").
 * @param stateChildren  Array of minimal EngineStateChildEntry-shaped objects.
 * @param idleWatchdog   Optional OnIdleEntry-shaped object or null.
 * @param spanStart  Span start (must be within the parent markup's span).
 */
function mkEngineDeclNode({ varName, stateChildren = [], idleWatchdog = null, spanStart = 200, file = "/test/a15.scrml" } = {}) {
  return {
    kind: "engine-decl",
    span: mkSpan(spanStart, file),
    _record: {
      engineMeta: {
        varName,
        stateChildren,
        idleWatchdog,
      },
    },
  };
}

/**
 * Minimal EngineStateChildEntry-shaped object for testing.
 *
 * @param tag      Variant name (PascalCase).
 * @param bodyRaw  Raw body text (may contain @var refs).
 * @param onTransitionElements  Array of OnTransitionEntry-shaped objects.
 * @param onTimeoutElements     Array of OnTimeoutEntry-shaped objects.
 */
function mkStateChild({ tag, bodyRaw = "", onTransitionElements = [], onTimeoutElements = [] } = {}) {
  return { tag, bodyRaw, onTransitionElements, onTimeoutElements };
}

/**
 * Minimal OnTransitionEntry-shaped object for testing.
 *
 * @param bodyRaw  Raw body text between <onTransition> opener and closer.
 */
function mkOnTransitionEntry({ bodyRaw = "", to = null, from = null } = {}) {
  return { to, from, once: false, ifExprRaw: null, bodyRaw, isColonShorthand: false, rawOffset: 0 };
}

/**
 * Minimal OnTimeoutEntry-shaped object for testing.
 *
 * @param after  The after= attribute value (e.g., "30s" or "${@delay}ms").
 * @param to     Target variant name.
 */
function mkOnTimeoutEntry({ after, to }) {
  return { after, to, rawOffset: 0 };
}

/**
 * Minimal OnIdleEntry-shaped object for testing.
 *
 * @param after  The after= attribute value (e.g., "5m" or "${@idleMs}ms").
 * @param to     Target variant name.
 */
function mkOnIdleEntry({ after, to }) {
  return { after, to, rawOffset: 0 };
}

function mkFileAST(nodes, filePath = "/test/a15.scrml") {
  return {
    filePath,
    nodes,
    imports: [],
    exports: [],
    components: [],
    typeDecls: [],
    spans: new Map(),
  };
}

function mkRouteMap() {
  return { functions: new Map() };
}

// ---------------------------------------------------------------------------
// Result accessors (same as A-1.3 tests)
// ---------------------------------------------------------------------------

function markupReadNodes(depGraph) {
  const result = [];
  for (const [, node] of depGraph.nodes) {
    if (node.kind === "markup-read") result.push(node);
  }
  return result;
}

function markupReadEdges(depGraph) {
  const mrIds = new Set();
  for (const [id, node] of depGraph.nodes) {
    if (node.kind === "markup-read") mrIds.add(id);
  }
  return depGraph.edges.filter((e) => e.kind === "reads" && mrIds.has(e.from));
}

function reactiveNodeId(depGraph, varName) {
  for (const [id, node] of depGraph.nodes) {
    if (node.kind === "reactive" && node.varName === varName) return id;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Shape 3 — Engine-cell self-read
// ---------------------------------------------------------------------------

describe("A-1.5 Shape 3: engine-cell self-read emits markup-read node + reads edge", () => {
  test("E3-T1: engine for=Phase emits one markup-read node pointing to the engine-cell reactive node", () => {
    // The engine-decl is a child of the <program> markup. The engine block
    // structurally reads its own cell (it renders variant arms based on the
    // cell value). A-1.5 lifts this to a real markup-read DG edge.
    const engineDecl = mkEngineDeclNode({ varName: "phase", spanStart: 200 });
    const markupEl = mkMarkup({ tag: "program", children: [engineDecl], spanStart: 100, spanEnd: 5000 });

    const fileAST = mkFileAST([markupEl]);
    const { depGraph, errors } = runDG({ files: [fileAST], routeMap: mkRouteMap() });

    // No fatal errors expected.
    expect(errors.filter((e) => e.severity === "error")).toHaveLength(0);

    // The engine cell must be registered as a reactive DG node.
    const phaseId = reactiveNodeId(depGraph, "phase");
    expect(phaseId).not.toBeNull();

    // At least one markup-read node must be emitted (for the self-read).
    const mrNodes = markupReadNodes(depGraph);
    expect(mrNodes.length).toBeGreaterThanOrEqual(1);

    // At least one reads edge from a markup-read node to the engine cell.
    const mrEdges = markupReadEdges(depGraph);
    const edgeToPhase = mrEdges.find((e) => e.to === phaseId);
    expect(edgeToPhase).toBeDefined();
  });

  test("E3-T2: E-DG-002 does NOT fire for the engine-cell var (self-read credits it)", () => {
    // The engine-cell self-read (creditReader + emitMarkupReadEdge) must prevent
    // E-DG-002 from firing for the engine's auto-declared variable.
    const engineDecl = mkEngineDeclNode({ varName: "phase", spanStart: 200 });
    const markupEl = mkMarkup({ tag: "program", children: [engineDecl], spanStart: 100, spanEnd: 5000 });

    const fileAST = mkFileAST([markupEl]);
    const { errors } = runDG({ files: [fileAST], routeMap: mkRouteMap() });

    const edg002ForPhase = errors.find(
      (e) => e.code === "E-DG-002" && /phase/.test(e.message),
    );
    expect(edg002ForPhase).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Shape 1 — Engine state-child bodyRaw with @var interpolation
// ---------------------------------------------------------------------------

describe("A-1.5 Shape 1: engine state-child bodyRaw @var refs emit markup-read edges", () => {
  test("E1-T1: Loading state-child body with ${@x} emits markup-read node + reads edge to @x", () => {
    // The Loading state-child body contains a reference to @x (a reactive var).
    // A-1.5 must scan bodyRaw, find @x, emit a markup-read node + reads edge.
    const xDecl = mkStateDecl("x", 10);
    const logicBlock = mkLogicBlock([xDecl], 0);

    const loadingChild = mkStateChild({
      tag: "Loading",
      bodyRaw: '<button onclick=load()>Reload ${@x}</button>',
    });
    const engineDecl = mkEngineDeclNode({
      varName: "phase",
      stateChildren: [loadingChild],
      spanStart: 200,
    });
    const markupEl = mkMarkup({ tag: "program", children: [engineDecl], spanStart: 100, spanEnd: 5000 });

    const fileAST = mkFileAST([logicBlock, markupEl]);
    const { depGraph, errors } = runDG({ files: [fileAST], routeMap: mkRouteMap() });

    expect(errors.filter((e) => e.severity === "error")).toHaveLength(0);

    const xId = reactiveNodeId(depGraph, "x");
    expect(xId).not.toBeNull();

    // Markup-read edges must include one pointing to @x.
    const mrEdges = markupReadEdges(depGraph);
    expect(mrEdges.some((e) => e.to === xId)).toBe(true);
  });

  test("E1-T2: two state-children each with distinct @var refs emit separate markup-read edges", () => {
    // Two state-children: Loading reads @x, Done reads @y. Both must produce edges.
    const xDecl = mkStateDecl("x", 10);
    const yDecl = mkStateDecl("y", 20);
    const logicBlock = mkLogicBlock([xDecl, yDecl], 0);

    const loadingChild = mkStateChild({ tag: "Loading", bodyRaw: "Loading... @x" });
    const doneChild = mkStateChild({ tag: "Done", bodyRaw: "Done. @y rows loaded." });
    const engineDecl = mkEngineDeclNode({
      varName: "phase",
      stateChildren: [loadingChild, doneChild],
      spanStart: 200,
    });
    const markupEl = mkMarkup({ tag: "program", children: [engineDecl], spanStart: 100, spanEnd: 5000 });

    const fileAST = mkFileAST([logicBlock, markupEl]);
    const { depGraph } = runDG({ files: [fileAST], routeMap: mkRouteMap() });

    const xId = reactiveNodeId(depGraph, "x");
    const yId = reactiveNodeId(depGraph, "y");
    const mrEdges = markupReadEdges(depGraph);
    expect(mrEdges.some((e) => e.to === xId)).toBe(true);
    expect(mrEdges.some((e) => e.to === yId)).toBe(true);
  });

  test("E1-T3: engine without state-child bodies (all empty bodyRaw) emits no state-child markup-read edges", () => {
    // Only the self-read edge (Shape 3) should be emitted; no bodyRaw-derived edges.
    const engineDecl = mkEngineDeclNode({
      varName: "phase",
      stateChildren: [
        mkStateChild({ tag: "Idle", bodyRaw: "" }),
        mkStateChild({ tag: "Loading", bodyRaw: "" }),
      ],
      spanStart: 200,
    });
    const markupEl = mkMarkup({ tag: "program", children: [engineDecl], spanStart: 100, spanEnd: 5000 });

    const fileAST = mkFileAST([markupEl]);
    const { depGraph } = runDG({ files: [fileAST], routeMap: mkRouteMap() });

    const phaseId = reactiveNodeId(depGraph, "phase");
    const mrEdges = markupReadEdges(depGraph);
    // Only the self-read edge to @phase should be present — no other @vars.
    const edgesToNonPhase = mrEdges.filter((e) => e.to !== phaseId);
    expect(edgesToNonPhase).toHaveLength(0);
  });

  test("E1-T4: E-DG-002 does NOT fire for @x read in a state-child body", () => {
    // @x is read in the Loading state-child body, which credits it via
    // creditReader. E-DG-002 must not fire.
    const xDecl = mkStateDecl("x", 10);
    const logicBlock = mkLogicBlock([xDecl], 0);

    const loadingChild = mkStateChild({ tag: "Loading", bodyRaw: "@x items" });
    const engineDecl = mkEngineDeclNode({
      varName: "phase",
      stateChildren: [loadingChild],
      spanStart: 200,
    });
    const markupEl = mkMarkup({ tag: "program", children: [engineDecl], spanStart: 100, spanEnd: 5000 });

    const fileAST = mkFileAST([logicBlock, markupEl]);
    const { errors } = runDG({ files: [fileAST], routeMap: mkRouteMap() });

    const edg002ForX = errors.find(
      (e) => e.code === "E-DG-002" && /\bx\b/.test(e.message),
    );
    expect(edg002ForX).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Shape 2 — <onTransition> body with @var refs
// ---------------------------------------------------------------------------

describe("A-1.5 Shape 2: <onTransition> bodyRaw @var refs emit markup-read edges", () => {
  test("E2-T1: onTransition body with @x ref emits markup-read node + reads edge to @x", () => {
    // <Big rule=...><onTransition to=.Small>${ log(@x) }</> ...
    // The onTransition body contains @x. A-1.5 must scan bodyRaw.
    const xDecl = mkStateDecl("x", 10);
    const logicBlock = mkLogicBlock([xDecl], 0);

    const onTransition = mkOnTransitionEntry({
      bodyRaw: "${ log(@x) }",
      to: "Small",
    });
    const bigChild = mkStateChild({
      tag: "Big",
      bodyRaw: "",
      onTransitionElements: [onTransition],
    });
    const engineDecl = mkEngineDeclNode({
      varName: "size",
      stateChildren: [bigChild],
      spanStart: 200,
    });
    const markupEl = mkMarkup({ tag: "program", children: [engineDecl], spanStart: 100, spanEnd: 5000 });

    const fileAST = mkFileAST([logicBlock, markupEl]);
    const { depGraph, errors } = runDG({ files: [fileAST], routeMap: mkRouteMap() });

    expect(errors.filter((e) => e.severity === "error")).toHaveLength(0);

    const xId = reactiveNodeId(depGraph, "x");
    expect(xId).not.toBeNull();

    const mrEdges = markupReadEdges(depGraph);
    expect(mrEdges.some((e) => e.to === xId)).toBe(true);
  });

  test("E2-T2: multiple onTransition elements each with distinct @var refs emit separate edges", () => {
    // Two onTransition handlers in the same state-child: first reads @a, second @b.
    const aDecl = mkStateDecl("a", 10);
    const bDecl = mkStateDecl("b", 20);
    const logicBlock = mkLogicBlock([aDecl, bDecl], 0);

    const ot1 = mkOnTransitionEntry({ bodyRaw: "playSound(@a)", to: "Fire" });
    const ot2 = mkOnTransitionEntry({ bodyRaw: "log(@b)", to: "Cape" });
    const bigChild = mkStateChild({
      tag: "Big",
      bodyRaw: "",
      onTransitionElements: [ot1, ot2],
    });
    const engineDecl = mkEngineDeclNode({
      varName: "marioState",
      stateChildren: [bigChild],
      spanStart: 200,
    });
    const markupEl = mkMarkup({ tag: "program", children: [engineDecl], spanStart: 100, spanEnd: 5000 });

    const fileAST = mkFileAST([logicBlock, markupEl]);
    const { depGraph } = runDG({ files: [fileAST], routeMap: mkRouteMap() });

    const aId = reactiveNodeId(depGraph, "a");
    const bId = reactiveNodeId(depGraph, "b");
    const mrEdges = markupReadEdges(depGraph);
    expect(mrEdges.some((e) => e.to === aId)).toBe(true);
    expect(mrEdges.some((e) => e.to === bId)).toBe(true);
  });

  test("E2-T3: onTransition body with no @var refs emits no markup-read edges", () => {
    // The onTransition body only calls a pure function, no @var.
    const engineDecl = mkEngineDeclNode({
      varName: "phase",
      stateChildren: [
        mkStateChild({
          tag: "Loading",
          bodyRaw: "",
          onTransitionElements: [mkOnTransitionEntry({ bodyRaw: "playSound()", to: "Done" })],
        }),
      ],
      spanStart: 200,
    });
    const markupEl = mkMarkup({ tag: "program", children: [engineDecl], spanStart: 100, spanEnd: 5000 });

    const fileAST = mkFileAST([markupEl]);
    const { depGraph } = runDG({ files: [fileAST], routeMap: mkRouteMap() });

    const phaseId = reactiveNodeId(depGraph, "phase");
    const mrEdges = markupReadEdges(depGraph);
    // Only the self-read edge to @phase; no edges from the onTransition body.
    const edgesToNonPhase = mrEdges.filter((e) => e.to !== phaseId);
    expect(edgesToNonPhase).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Shape 2b — <onTimeout> computed after= with @var ref
// ---------------------------------------------------------------------------

describe("A-1.5 Shape 2b: <onTimeout> computed after= @var refs emit markup-read edges", () => {
  test("E2b-T1: onTimeout after=${@delay}ms emits markup-read node + reads edge to @delay", () => {
    // The onTimeout's after= is a computed expression referencing @delay.
    // A-1.5 must scan the after= value for @var refs.
    const delayDecl = mkStateDecl("delay", 10);
    const logicBlock = mkLogicBlock([delayDecl], 0);

    const oto = mkOnTimeoutEntry({ after: "${@delay}ms", to: "TimedOut" });
    const loadingChild = mkStateChild({
      tag: "Loading",
      bodyRaw: "",
      onTimeoutElements: [oto],
    });
    const engineDecl = mkEngineDeclNode({
      varName: "phase",
      stateChildren: [loadingChild],
      spanStart: 200,
    });
    const markupEl = mkMarkup({ tag: "program", children: [engineDecl], spanStart: 100, spanEnd: 5000 });

    const fileAST = mkFileAST([logicBlock, markupEl]);
    const { depGraph, errors } = runDG({ files: [fileAST], routeMap: mkRouteMap() });

    expect(errors.filter((e) => e.severity === "error")).toHaveLength(0);

    const delayId = reactiveNodeId(depGraph, "delay");
    expect(delayId).not.toBeNull();

    const mrEdges = markupReadEdges(depGraph);
    expect(mrEdges.some((e) => e.to === delayId)).toBe(true);
  });

  test("E2b-T2: onTimeout with literal after= (30s) emits no markup-read edge for after=", () => {
    // Literal after= values (e.g., "30s") have no @var refs.
    // Only the engine-cell self-read edge should be present.
    const oto = mkOnTimeoutEntry({ after: "30s", to: "TimedOut" });
    const loadingChild = mkStateChild({
      tag: "Loading",
      bodyRaw: "",
      onTimeoutElements: [oto],
    });
    const engineDecl = mkEngineDeclNode({
      varName: "phase",
      stateChildren: [loadingChild],
      spanStart: 200,
    });
    const markupEl = mkMarkup({ tag: "program", children: [engineDecl], spanStart: 100, spanEnd: 5000 });

    const fileAST = mkFileAST([markupEl]);
    const { depGraph } = runDG({ files: [fileAST], routeMap: mkRouteMap() });

    const phaseId = reactiveNodeId(depGraph, "phase");
    const mrEdges = markupReadEdges(depGraph);
    // Only self-read to @phase; literal after= generates no @var edges.
    const edgesToNonPhase = mrEdges.filter((e) => e.to !== phaseId);
    expect(edgesToNonPhase).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Shape 2c — <onIdle> computed after= with @var ref
// ---------------------------------------------------------------------------

describe("A-1.5 Shape 2c: <onIdle> computed after= @var refs emit markup-read edges", () => {
  test("E2c-T1: onIdle after=${@idleMs}ms emits markup-read node + reads edge to @idleMs", () => {
    // The engine-wide idle watchdog uses a computed duration referencing @idleMs.
    const idleMsDecl = mkStateDecl("idleMs", 10);
    const logicBlock = mkLogicBlock([idleMsDecl], 0);

    const idleWatchdog = mkOnIdleEntry({ after: "${@idleMs}ms", to: "Idle" });
    const engineDecl = mkEngineDeclNode({
      varName: "phase",
      stateChildren: [],
      idleWatchdog,
      spanStart: 200,
    });
    const markupEl = mkMarkup({ tag: "program", children: [engineDecl], spanStart: 100, spanEnd: 5000 });

    const fileAST = mkFileAST([logicBlock, markupEl]);
    const { depGraph, errors } = runDG({ files: [fileAST], routeMap: mkRouteMap() });

    expect(errors.filter((e) => e.severity === "error")).toHaveLength(0);

    const idleMsId = reactiveNodeId(depGraph, "idleMs");
    expect(idleMsId).not.toBeNull();

    const mrEdges = markupReadEdges(depGraph);
    expect(mrEdges.some((e) => e.to === idleMsId)).toBe(true);
  });

  test("E2c-T2: onIdle with literal after= (5m) emits no markup-read edge for after=", () => {
    // Literal after= on onIdle generates no @var refs.
    const idleWatchdog = mkOnIdleEntry({ after: "5m", to: "Idle" });
    const engineDecl = mkEngineDeclNode({
      varName: "phase",
      stateChildren: [],
      idleWatchdog,
      spanStart: 200,
    });
    const markupEl = mkMarkup({ tag: "program", children: [engineDecl], spanStart: 100, spanEnd: 5000 });

    const fileAST = mkFileAST([markupEl]);
    const { depGraph } = runDG({ files: [fileAST], routeMap: mkRouteMap() });

    const phaseId = reactiveNodeId(depGraph, "phase");
    const mrEdges = markupReadEdges(depGraph);
    // Only self-read to @phase; literal after= generates no @var edges.
    const edgesToNonPhase = mrEdges.filter((e) => e.to !== phaseId);
    expect(edgesToNonPhase).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Combined scenario — engine with multiple shapes active at once
// ---------------------------------------------------------------------------

describe("A-1.5 combined scenario: engine with state-child body + onTransition + onTimeout + onIdle", () => {
  test("COMBO-T1: full engine scenario emits markup-read edges for all @var reads", () => {
    // Scenario: phase engine with:
    //   - Loading state-child body reads @loadMsg
    //   - Loading has onTransition body reads @logVar
    //   - Loading has onTimeout with computed after=${@timeoutMs}ms
    //   - engine-wide onIdle with computed after=${@idleTimeout}ms
    //   - engine-cell self-read for @phase
    const loadMsgDecl = mkStateDecl("loadMsg", 5);
    const logVarDecl = mkStateDecl("logVar", 15);
    const timeoutMsDecl = mkStateDecl("timeoutMs", 25);
    const idleTimeoutDecl = mkStateDecl("idleTimeout", 35);
    const logicBlock = mkLogicBlock([loadMsgDecl, logVarDecl, timeoutMsDecl, idleTimeoutDecl], 0);

    const onTransition = mkOnTransitionEntry({ bodyRaw: "log(@logVar)", to: "Done" });
    const onTimeout = mkOnTimeoutEntry({ after: "${@timeoutMs}ms", to: "TimedOut" });
    const loadingChild = mkStateChild({
      tag: "Loading",
      bodyRaw: "Fetching... @loadMsg",
      onTransitionElements: [onTransition],
      onTimeoutElements: [onTimeout],
    });

    const idleWatchdog = mkOnIdleEntry({ after: "${@idleTimeout}ms", to: "Idle" });

    const engineDecl = mkEngineDeclNode({
      varName: "phase",
      stateChildren: [loadingChild],
      idleWatchdog,
      spanStart: 200,
    });
    const markupEl = mkMarkup({ tag: "program", children: [engineDecl], spanStart: 100, spanEnd: 5000 });

    const fileAST = mkFileAST([logicBlock, markupEl]);
    const { depGraph, errors } = runDG({ files: [fileAST], routeMap: mkRouteMap() });

    expect(errors.filter((e) => e.severity === "error")).toHaveLength(0);

    const phaseId = reactiveNodeId(depGraph, "phase");
    const loadMsgId = reactiveNodeId(depGraph, "loadMsg");
    const logVarId = reactiveNodeId(depGraph, "logVar");
    const timeoutMsId = reactiveNodeId(depGraph, "timeoutMs");
    const idleTimeoutId = reactiveNodeId(depGraph, "idleTimeout");

    const mrEdges = markupReadEdges(depGraph);
    // All 5 reactive vars must be covered by markup-read edges.
    expect(mrEdges.some((e) => e.to === phaseId)).toBe(true);        // self-read
    expect(mrEdges.some((e) => e.to === loadMsgId)).toBe(true);      // state-child body
    expect(mrEdges.some((e) => e.to === logVarId)).toBe(true);       // onTransition body
    expect(mrEdges.some((e) => e.to === timeoutMsId)).toBe(true);    // onTimeout computed after=
    expect(mrEdges.some((e) => e.to === idleTimeoutId)).toBe(true);  // onIdle computed after=
  });
});
