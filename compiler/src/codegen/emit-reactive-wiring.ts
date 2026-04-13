import { genVar } from "./var-counter.ts";
import { emitStringFromTree } from "../expression-parser.ts";
import { emitLogicNode } from "./emit-logic.js";
import { rewriteExpr } from "./rewrite.js";
import { CGError } from "./errors.ts";
import {
  collectTopLevelLogicStatements,
  collectCssVariableBridges,
  getNodes,
  isServerOnlyNode,
} from "./collect.ts";
import { collectDerivedVarNames } from "./reactive-deps.ts";
import { collectChannelNodes, emitChannelClientJs } from "./emit-channel.ts";
import { emitInitialLoad, emitOptimisticUpdate, emitServerSyncStub } from "./emit-sync.ts";
import type { EncodingContext } from "./type-encoding.ts";
import type { CompileContext } from "./context.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BindPropsWiring {
  propName: string;
  callerVar: string;
  componentName: string;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// §51.5 — Build machine bindings map for transition guard emission
// ---------------------------------------------------------------------------

/**
 * Walk the fileAST and build a Map from reactive var name → machine binding info.
 * Returns null if no machine bindings are found.
 *
 * The map is used by rewriteBlockBody to emit emitTransitionGuard instead of
 * plain _scrml_reactive_set for machine-governed reactive variable assignments.
 */
export function buildMachineBindingsMap(fileAST: any): Map<string, { machineName: string; tableName: string; rules: any[] }> | null {
  const machineRegistry = (fileAST as any).machineRegistry as Map<string, any> | undefined;
  if (!machineRegistry || machineRegistry.size === 0) return null;

  const result = new Map<string, { machineName: string; tableName: string; rules: any[] }>();

  // Walk the AST to find reactive-decl nodes with machineBinding annotation
  const nodes: any[] = fileAST.nodes ?? fileAST.ast?.nodes ?? [];
  function walk(nodeList: any[]): void {
    for (const node of nodeList) {
      if (!node || typeof node !== "object") continue;
      if (node.kind === "logic" && Array.isArray(node.body)) {
        for (const child of node.body) {
          if (child && child.kind === "reactive-decl" && child.machineBinding) {
            const machineName: string = child.machineBinding;
            const machine = machineRegistry.get(machineName);
            if (machine && child.name) {
              result.set(child.name as string, {
                machineName,
                tableName: `__scrml_transitions_${machineName}`,
                rules: machine.rules ?? [],
              });
            }
          }
        }
      }
      if (Array.isArray(node.children)) walk(node.children);
    }
  }
  walk(nodes);

  return result.size > 0 ? result : null;
}

/**
 * Emit top-level logic statements and CSS variable bridge wiring.
 */
export function emitReactiveWiring(ctx: CompileContext): string[] {
  const { fileAST, errors, encodingCtx } = ctx;
  const lines: string[] = [];

  const derivedNames = collectDerivedVarNames(fileAST);
  const machineBindings = buildMachineBindingsMap(fileAST);
  const emitOpts: { derivedNames?: Set<string>; encodingCtx?: typeof encodingCtx; machineBindings?: typeof machineBindings } = derivedNames.size > 0
    ? { derivedNames, encodingCtx, ...(machineBindings ? { machineBindings } : {}) }
    : { encodingCtx, ...(machineBindings ? { machineBindings } : {}) };

  // Step 4: Generate top-level logic statements
  const topLevel = ctx.analysis?.topLevelLogic ?? collectTopLevelLogicStatements(fileAST);
  for (const stmt of topLevel) {
    if (isServerOnlyNode(stmt)) {
      errors.push(new CGError(
        "W-CG-001",
        `W-CG-001: Top-level ${stmt.kind} block suppressed from client output. ` +
        `Server-only constructs (SQL, transactions, server-context meta) must be ` +
        `inside server-boundary functions. This block will not execute.`,
        stmt.span ?? { file: fileAST.filePath ?? "", start: 0, end: 0, line: 1, col: 1 },
        "warning",
      ));
      continue;
    }

    const code = emitLogicNode(stmt, emitOpts);
    if (code) lines.push(code);
  }

  // Step 4b: Generate server @var sync infrastructure (§52.6)
  const serverVarDecls = collectServerVarDecls(fileAST);
  if (serverVarDecls.length > 0) {
    lines.push("");
    lines.push("// --- server @var sync infrastructure (§52.6, compiler-generated) ---");
    for (const decl of serverVarDecls) {
      const varName: string = decl.name as string;
      // Phase 4d: ExprNode-first, string fallback
      const initExpr: string = (decl as any).initExpr ? emitStringFromTree((decl as any).initExpr) : (typeof decl.init === "string" ? decl.init : "");
      for (const l of emitServerSyncStub(varName)) lines.push(l);
      for (const l of emitInitialLoad(varName, initExpr)) lines.push(l);
      for (const l of emitOptimisticUpdate(varName)) lines.push(l);
    }
  }

  // Step 4c: Generate transition lookup tables for enums with transitions{} and machines (§51.5)
  const machineRegistry = (fileAST as any).machineRegistry as Map<string, any> | undefined;
  const typeDecls = (fileAST as any).typeDecls as any[] | undefined;
  if (typeDecls || machineRegistry) {
    const { emitTransitionTable } = require("./emit-machines.ts");
    // Emit tables for enums with type-level transitions
    if (typeDecls) {
      const { buildTypeRegistry, BUILTIN_TYPES } = require("../type-system.ts");
      const typeRegistry = buildTypeRegistry(typeDecls, [], { file: fileAST.filePath ?? "", start: 0, end: 0, line: 1, col: 1 });
      for (const [name, type] of typeRegistry) {
        if (BUILTIN_TYPES.has(name)) continue;
        if (type.kind === "enum" && type.transitionRules && type.transitionRules.length > 0) {
          lines.push("");
          for (const l of emitTransitionTable(`__scrml_transitions_${name}`, type.transitionRules)) {
            lines.push(l);
          }
        }
      }
    }
    // Emit tables for machines
    if (machineRegistry && machineRegistry.size > 0) {
      for (const [name, machine] of machineRegistry) {
        lines.push("");
        for (const l of emitTransitionTable(`__scrml_transitions_${name}`, machine.rules)) {
          lines.push(l);
        }
      }
    }
  }

  // Single-pass classification of markup nodes (replaces 5 independent AST walks)
  const { lifecycleNodes, inputStateNodes, requestNodes, timeoutNodes, bindPropsWirings } =
    classifyMarkupNodes(getNodes(fileAST));

  // Step 5: Generate <timer> and <poll> lifecycle initialization (§6.7.5, §6.7.6)
  if (lifecycleNodes.length > 0) {
    lines.push("");
    lines.push("// --- lifecycle initialization (compiler-generated) ---");
    for (const lcNode of lifecycleNodes) {
      const lcLines = emitLifecycleNode(lcNode, errors, fileAST.filePath ?? "");
      for (const l of lcLines) lines.push(l);
    }
  }

  // Step 5b: Generate <keyboard>, <mouse>, <gamepad> input state initialization (§35)
  if (inputStateNodes.length > 0) {
    lines.push("");
    lines.push("// --- input state initialization (compiler-generated) ---");
    for (const isNode of inputStateNodes) {
      const isLines = emitInputStateNode(isNode, errors, fileAST.filePath ?? "");
      for (const l of isLines) lines.push(l);
    }
  }

  // Step 5.5: Generate <channel> client-side WebSocket initialization (§35)
  const channelNodes = ctx.analysis?.channelNodes ?? collectChannelNodes(getNodes(fileAST));
  if (channelNodes.length > 0) {
    lines.push("");
    lines.push("// --- channel WebSocket client initialization (§35, compiler-generated) ---");
    for (const chNode of channelNodes) {
      const chLines = emitChannelClientJs(chNode, errors, fileAST.filePath ?? "");
      for (const l of chLines) lines.push(l);
    }
  }

  // Step 5c: Generate <request> single-shot async fetch initialization (§6.7.7)
  if (requestNodes.length > 0) {
    lines.push("");
    lines.push("// --- request async fetch initialization (§6.7.7, compiler-generated) ---");
    for (const rqNode of requestNodes) {
      const rqLines = emitRequestNode(rqNode, errors, fileAST.filePath ?? "");
      for (const l of rqLines) lines.push(l);
    }
  }

  // Step 5d: Generate <timeout> single-shot timer initialization (§6.7.8)
  if (timeoutNodes.length > 0) {
    lines.push("");
    lines.push("// --- timeout single-shot timer initialization (§6.7.8, compiler-generated) ---");
    for (const toNode of timeoutNodes) {
      const toLines = emitTimeoutNode(toNode, errors, fileAST.filePath ?? "");
      for (const l of toLines) lines.push(l);
    }
  }

  // Step 6: Generate CSS variable bridge
  const cssBridges = ctx.analysis?.cssBridges ?? collectCssVariableBridges(getNodes(fileAST));
  if (cssBridges.length > 0) {
    lines.push("");
    lines.push("// --- CSS variable bridge (compiler-generated) ---");

    for (const bridge of cssBridges) {
      const target = bridge.scoped
        ? `_scrml_el`
        : `document.documentElement`;

      if (bridge.isExpression) {
        const exprJs: string = bridge.expr.replace(
          /@([A-Za-z_$][A-Za-z0-9_$]*)/g,
          `_scrml_reactive_get("$1")`
        );
        const evalFn = genVar("css_expr");
        lines.push(`function ${evalFn}() { return ${exprJs}; }`);
        lines.push(`${target}.style.setProperty(${JSON.stringify(bridge.customProp)}, ${evalFn}());`);
        if (bridge.refs.length > 0) {
          lines.push(`_scrml_effect(() => ${target}.style.setProperty(${JSON.stringify(bridge.customProp)}, ${evalFn}()));`);
        }
      } else {
        lines.push(`${target}.style.setProperty(${JSON.stringify(bridge.customProp)}, _scrml_reactive_get(${JSON.stringify(bridge.varName)}));`);
        lines.push(`_scrml_effect(() => ${target}.style.setProperty(${JSON.stringify(bridge.customProp)}, _scrml_reactive_get(${JSON.stringify(bridge.varName)})));`);
      }
    }
  }

  // Step 7: Generate bind: prop bidirectional wiring (§15.11.1)
  if (bindPropsWirings.length > 0) {
    lines.push("");
    lines.push("// --- bind: prop bidirectional wiring (compiler-generated) ---");
    for (const { propName, callerVar, componentName } of bindPropsWirings) {
      const guardVar = genVar("bind_sync");
      const propJs = JSON.stringify(propName);
      const callerJs = JSON.stringify(callerVar);
      lines.push(`// bind:${propName}=@${callerVar} (from ${componentName})`);
      lines.push(`let ${guardVar} = false;`);
      lines.push(`_scrml_effect(function() {`);
      lines.push(`  const _v = _scrml_reactive_get(${callerJs});`);
      lines.push(`  if (${guardVar}) return; ${guardVar} = true;`);
      lines.push(`  _scrml_reactive_set(${propJs}, _v);`);
      lines.push(`  ${guardVar} = false;`);
      lines.push(`});`);
      lines.push(`_scrml_effect(function() {`);
      lines.push(`  const _v = _scrml_reactive_get(${propJs});`);
      lines.push(`  if (${guardVar}) return; ${guardVar} = true;`);
      lines.push(`  _scrml_reactive_set(${callerJs}, _v);`);
      lines.push(`  ${guardVar} = false;`);
      lines.push(`});`);
    }
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Single-pass markup classification (replaces 5 independent AST walks)
// ---------------------------------------------------------------------------

interface WiringCollections {
  lifecycleNodes: any[];
  inputStateNodes: any[];
  requestNodes: any[];
  timeoutNodes: any[];
  bindPropsWirings: BindPropsWiring[];
}

/**
 * Walk the AST once and classify markup nodes into all 5 wiring buckets.
 *
 * Behavioral notes:
 * - Skips kind === "logic" block children (matches collectLifecycleNodes and
 *   collectInputStateNodes, the dominant behavior of 4/5 original collectors).
 * - _bindProps can appear on ANY markup node, not exclusive with tag classification.
 * - Valid scrml does not place timer/poll/request/timeout inside logic blocks,
 *   so the logic-block skip is safe for all well-formed AST.
 */
function classifyMarkupNodes(nodes: any[]): WiringCollections {
  const result: WiringCollections = {
    lifecycleNodes: [],
    inputStateNodes: [],
    requestNodes: [],
    timeoutNodes: [],
    bindPropsWirings: [],
  };

  function visit(nodeList: any[]): void {
    for (const node of nodeList) {
      if (!node || typeof node !== "object") continue;

      if (node.kind === "markup") {
        const tag: string = node.tag ?? "";

        if (tag === "timer" || tag === "poll") {
          result.lifecycleNodes.push(node);
        } else if (tag === "keyboard" || tag === "mouse" || tag === "gamepad") {
          result.inputStateNodes.push(node);
        } else if (tag === "request") {
          result.requestNodes.push(node);
        } else if (tag === "timeout") {
          result.timeoutNodes.push(node);
        }

        // bindProps is not exclusive — any markup node can have _bindProps
        if (Array.isArray(node._bindProps) && node._bindProps.length > 0) {
          const componentName: string = node._expandedFrom ?? node.tag ?? "unknown";
          for (const { propName, callerVar } of node._bindProps) {
            result.bindPropsWirings.push({ propName, callerVar, componentName });
          }
        }

        // Recurse into markup children
        if (Array.isArray(node.children)) {
          visit(node.children);
        }
        continue;
      }

      // Skip logic block children — reactive-wiring nodes are not inside logic blocks
      if (node.kind === "logic" && Array.isArray(node.body)) {
        continue;
      }

      // Recurse into all other node kinds
      if (Array.isArray(node.children)) {
        visit(node.children);
      }
    }
  }

  visit(nodes);
  return result;
}

// ---------------------------------------------------------------------------
// Lifecycle node emission
// ---------------------------------------------------------------------------

function emitLifecycleNode(node: any, errors: CGError[], filePath: string): string[] {
  const lines: string[] = [];
  const tag: string = node.tag ?? "timer";
  const attrs: any[] = node.attrs ?? node.attributes ?? [];
  const children: any[] = node.children ?? [];
  const span = node.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 };

  const attrMap = new Map<string, any>(attrs.map((a: any) => [a.name, a]));

  const intervalAttr = attrMap.get("interval");
  let intervalMs: number | null = null;
  if (intervalAttr) {
    const v = intervalAttr.value;
    if (v?.kind === "string-literal") {
      intervalMs = parseInt(v.value, 10);
    } else if (v?.kind === "variable-ref") {
      const raw: string = (v.name ?? "").replace(/^@/, "");
      intervalMs = parseInt(raw, 10);
    }
  }

  if (intervalMs === null || isNaN(intervalMs) || intervalMs <= 0) {
    intervalMs = 1000;
  }

  const idAttr = attrMap.get("id");
  let timerId: string | null = null;
  if (idAttr) {
    const v = idAttr.value;
    if (v?.kind === "string-literal") timerId = v.value;
    else if (v?.kind === "variable-ref") timerId = (v.name ?? "").replace(/^@/, "");
  }

  const timerVar = timerId ? `"${timerId}"` : JSON.stringify(genVar("timer"));
  const scopeVar = JSON.stringify(genVar("scope"));

  const runningAttr = attrMap.get("running");
  let runningVarName: string | null = null;
  let runningIsAlwaysTrue = true;
  if (runningAttr) {
    const v = runningAttr.value;
    if (v?.kind === "variable-ref") {
      const raw: string = v.name ?? "";
      if (raw.startsWith("@")) {
        runningVarName = raw.slice(1);
        runningIsAlwaysTrue = false;
      } else if (raw === "true") {
        runningIsAlwaysTrue = true;
      } else if (raw === "false") {
        runningIsAlwaysTrue = false;
      }
    }
  }

  let bodyCode = "/* empty */";
  const logicChild = children.find((c: any) => c?.kind === "logic");
  if (logicChild && Array.isArray(logicChild.body) && logicChild.body.length > 0) {
    const bodyLines: string[] = [];
    for (const stmt of logicChild.body) {
      const code = emitLogicNode(stmt);
      if (code) bodyLines.push(code);
    }
    bodyCode = bodyLines.join("\n  ");
  }

  lines.push(`// <${tag}${timerId ? ` id="${timerId}"` : ""}> interval=${intervalMs}ms`);
  lines.push(`_scrml_timer_start(${scopeVar}, ${timerVar}, ${intervalMs}, function() {`);
  lines.push(`  ${bodyCode}`);
  lines.push(`});`);

  if (!runningIsAlwaysTrue && !runningVarName) {
    lines.push(`_scrml_timer_pause(${scopeVar}, ${timerVar});`);
  }

  if (runningVarName) {
    const varJs = JSON.stringify(runningVarName);
    lines.push(`if (!_scrml_reactive_get(${varJs})) { _scrml_timer_pause(${scopeVar}, ${timerVar}); }`);
    lines.push(`_scrml_effect(function() {`);
    lines.push(`  if (_scrml_reactive_get(${varJs})) { _scrml_timer_resume(${scopeVar}, ${timerVar}); } else { _scrml_timer_pause(${scopeVar}, ${timerVar}); }`);
    lines.push(`});`);
  }

  lines.push(`_scrml_register_cleanup(() => _scrml_timer_stop(${scopeVar}, ${timerVar}));`);

  return lines;
}

// ---------------------------------------------------------------------------
// Input state node emission
// ---------------------------------------------------------------------------

function emitInputStateNode(node: any, errors: CGError[], filePath: string): string[] {
  const lines: string[] = [];
  const tag: string = node.tag ?? "keyboard";
  const attrs: any[] = node.attrs ?? node.attributes ?? [];
  const span = node.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 };

  const attrMap = new Map<string, any>(attrs.map((a: any) => [a.name, a]));

  const idAttr = attrMap.get("id");
  let inputId: string | null = null;
  if (idAttr) {
    const v = idAttr.value;
    if (v?.kind === "string-literal") inputId = v.value;
    else if (v?.kind === "variable-ref") inputId = (v.name ?? "").replace(/^@/, "");
  }

  const inputIdJs = inputId ? JSON.stringify(inputId) : JSON.stringify(genVar("input"));
  const scopeVar = JSON.stringify(genVar("scope"));

  if (tag === "keyboard") {
    lines.push(`// <keyboard${inputId ? ` id="${inputId}"` : ""}>`);
    lines.push(`_scrml_input_keyboard_create(${inputIdJs}, ${scopeVar});`);
    lines.push(`_scrml_register_cleanup(() => _scrml_input_keyboard_destroy(${inputIdJs}, ${scopeVar}));`);
  } else if (tag === "mouse") {
    const targetAttr = attrMap.get("target");
    let targetExpr = "null";
    if (targetAttr) {
      const v = targetAttr.value;
      if (v?.kind === "variable-ref") {
        const raw: string = (v.name ?? "").replace(/^@/, "");
        targetExpr = `() => _scrml_reactive_get(${JSON.stringify(raw)})`;
      }
    }
    lines.push(`// <mouse${inputId ? ` id="${inputId}"` : ""}${targetAttr ? " target=..." : ""}>`);
    lines.push(`_scrml_input_mouse_create(${inputIdJs}, ${scopeVar}, ${targetExpr});`);
    lines.push(`_scrml_register_cleanup(() => _scrml_input_mouse_destroy(${inputIdJs}, ${scopeVar}));`);
  } else if (tag === "gamepad") {
    const indexAttr = attrMap.get("index");
    let gamepadIndex = 0;
    if (indexAttr) {
      const v = indexAttr.value;
      if (v?.kind === "string-literal") {
        const n = parseInt(v.value, 10);
        if (!isNaN(n) && n >= 0 && n <= 3) gamepadIndex = n;
      } else if (v?.kind === "variable-ref") {
        const n = parseInt((v.name ?? "").replace(/^@/, ""), 10);
        if (!isNaN(n) && n >= 0 && n <= 3) gamepadIndex = n;
      }
    }
    lines.push(`// <gamepad${inputId ? ` id="${inputId}"` : ""} index=${gamepadIndex}>`);
    lines.push(`_scrml_input_gamepad_create(${inputIdJs}, ${scopeVar}, ${gamepadIndex});`);
    lines.push(`_scrml_register_cleanup(() => _scrml_input_gamepad_destroy(${inputIdJs}, ${scopeVar}));`);
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Request node emission (§6.7.7)
// ---------------------------------------------------------------------------

function emitRequestNode(node: any, errors: CGError[], filePath: string): string[] {
  const lines: string[] = [];
  const attrs: any[] = node.attrs ?? node.attributes ?? [];

  const attrMap = new Map<string, any>(attrs.map((a: any) => [a.name, a]));

  const idAttr = attrMap.get("id");
  let requestId: string | null = null;
  if (idAttr) {
    const v = idAttr.value;
    if (v?.kind === "string-literal") requestId = v.value;
    else if (v?.kind === "variable-ref") requestId = (v.name ?? "").replace(/^@/, "");
    else if (typeof v === "string") requestId = v;
  }

  if (!requestId) return lines;

  const urlAttr = attrMap.get("url");
  let urlExpr = '""';
  if (urlAttr) {
    const v = urlAttr.value;
    if (v?.kind === "string-literal") urlExpr = JSON.stringify(v.value);
    else if (typeof v === "string") urlExpr = JSON.stringify(v);
    else if (typeof v?.value === "string") urlExpr = JSON.stringify(v.value);
  }

  const depsAttr = attrMap.get("deps");
  const depsVars: string[] = [];
  if (depsAttr) {
    const v = depsAttr.value;
    if (v?.kind === "array" && Array.isArray(v.elements)) {
      for (const el of v.elements) {
        if (el?.kind === "variable-ref") depsVars.push((el.name ?? "").replace(/^@/, ""));
      }
    } else if (typeof v?.value === "string") {
      const matches = v.value.matchAll(/@([A-Za-z_$][A-Za-z0-9_$]*)/g);
      for (const m of matches) depsVars.push(m[1]);
    }
  }

  const methodAttr = attrMap.get("method");
  let method = "GET";
  if (methodAttr) {
    const v = methodAttr.value;
    if (v?.kind === "string-literal") method = v.value;
    else if (typeof v === "string") method = v;
    else if (typeof v?.value === "string") method = v.value;
  }

  const stateVar = `_scrml_request_${requestId}`;
  const fetchFn = `_scrml_request_${requestId}_fetch`;
  const seqVar = `_scrml_request_${requestId}_seq`;
  const mountedVar = `_scrml_request_${requestId}_mounted`;

  lines.push(`// <request id="${requestId}">`);
  lines.push(`var ${stateVar} = { loading: true, data: null, error: null, stale: false };`);
  lines.push(`var ${seqVar} = 0;`);
  lines.push(`var ${mountedVar} = true;`);
  lines.push(`async function ${fetchFn}() {`);
  lines.push(`  var _seq = ++${seqVar};`);
  lines.push(`  ${stateVar}.loading = true;`);
  lines.push(`  ${stateVar}.error = null;`);
  lines.push(`  if (${stateVar}.data !== null) { ${stateVar}.stale = true; }`);
  lines.push(`  _scrml_notify(${JSON.stringify(requestId)});`);
  lines.push(`  try {`);
  lines.push(`    var _res = await fetch(${urlExpr}, { method: ${JSON.stringify(method)} });`);
  lines.push(`    if (!_res.ok) throw new Error("HTTP " + _res.status);`);
  lines.push(`    var _data = await _res.json();`);
  lines.push(`    if (!${mountedVar} || _seq !== ${seqVar}) return;`);
  lines.push(`    ${stateVar}.data = _data;`);
  lines.push(`  } catch (_e) {`);
  lines.push(`    if (!${mountedVar} || _seq !== ${seqVar}) return;`);
  lines.push(`    ${stateVar}.error = _e;`);
  lines.push(`  }`);
  lines.push(`  ${stateVar}.loading = false;`);
  lines.push(`  ${stateVar}.stale = false;`);
  lines.push(`  _scrml_notify(${JSON.stringify(requestId)});`);
  lines.push(`}`);
  lines.push(`${stateVar}.refetch = ${fetchFn};`);
  lines.push(`_scrml_register_cleanup(function() { ${mountedVar} = false; });`);

  if (depsVars.length > 0) {
    const depsJs = depsVars.map(d => `_scrml_reactive_get(${JSON.stringify(d)})`).join(", ");
    lines.push(`_scrml_effect(function() {`);
    lines.push(`  var _d = [${depsJs}];`);
    lines.push(`  if (${mountedVar}) ${fetchFn}();`);
    lines.push(`});`);
  } else {
    lines.push(`${fetchFn}();`);
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Timeout node emission (§6.7.8)
// ---------------------------------------------------------------------------

function emitTimeoutNode(node: any, errors: CGError[], filePath: string): string[] {
  const lines: string[] = [];
  const attrs: any[] = node.attrs ?? node.attributes ?? [];
  const children: any[] = node.children ?? [];

  const attrMap = new Map<string, any>(attrs.map((a: any) => [a.name, a]));

  // Extract delay attribute
  const delayAttr = attrMap.get("delay");
  let delayMs: number | null = null;
  if (delayAttr) {
    const v = delayAttr.value;
    if (v?.kind === "string-literal") {
      delayMs = parseInt(v.value, 10);
    } else if (v?.kind === "variable-ref") {
      const raw: string = (v.name ?? "").replace(/^@/, "");
      delayMs = parseInt(raw, 10);
    }
  }
  if (delayMs === null || isNaN(delayMs) || delayMs <= 0) {
    delayMs = 1000; // fallback (error already reported in emit-html)
  }

  // Extract id attribute
  const idAttr = attrMap.get("id");
  let timeoutId: string | null = null;
  if (idAttr) {
    const v = idAttr.value;
    if (v?.kind === "string-literal") timeoutId = v.value;
    else if (v?.kind === "variable-ref") timeoutId = (v.name ?? "").replace(/^@/, "");
  }

  const timerVar = genVar("timeout");

  // Extract body code from logic children
  let bodyCode = "";
  for (const child of children) {
    if (!child || typeof child !== "object") continue;
    if (child.kind === "logic" && Array.isArray(child.body)) {
      const bodyLines: string[] = [];
      for (const stmt of child.body) {
        const code = emitLogicNode(stmt);
        if (code) bodyLines.push(code);
      }
      bodyCode = bodyLines.join("\n    ");
    }
  }

  lines.push(`// <timeout${timeoutId ? ` id="${timeoutId}"` : ""} delay=${delayMs}>`);

  // Emit the setTimeout call
  lines.push(`var ${timerVar} = setTimeout(function() {`);
  if (bodyCode) {
    lines.push(`    ${bodyCode}`);
  }
  if (timeoutId) {
    lines.push(`    _scrml_reactive_set(${JSON.stringify(timeoutId + "_fired")}, true);`);
  }
  lines.push(`}, ${delayMs});`);

  // Emit cancel function and initial fired state if id is present
  if (timeoutId) {
    lines.push(`_scrml_reactive_set(${JSON.stringify(timeoutId + "_fired")}, false);`);
    lines.push(`function ${timeoutId}_cancel() { clearTimeout(${timerVar}); }`);
  }

  // Register scope cleanup — cancel timeout on teardown (§6.7.2, step 2)
  lines.push(`_scrml_register_cleanup(function() { clearTimeout(${timerVar}); });`);

  return lines;
}

// ---------------------------------------------------------------------------
// §52.6 Server var declaration collector
// ---------------------------------------------------------------------------

/**
 * Walk the AST and collect all `server @var` reactive-decl nodes.
 * These are reactive-decl nodes with `isServer === true`, found inside logic block bodies.
 *
 * @param fileAST - the file AST (may have .nodes or .ast.nodes shape)
 */
function collectServerVarDecls(fileAST: any): any[] {
  const nodes: any[] = getNodes(fileAST);
  const result: any[] = [];

  function visit(nodeList: any[]): void {
    for (const node of nodeList) {
      if (!node || typeof node !== "object") continue;
      if (node.kind === "logic" && Array.isArray(node.body)) {
        for (const child of node.body) {
          if (child && child.kind === "reactive-decl" && child.isServer === true) {
            result.push(child);
          }
        }
      }
      if (Array.isArray(node.children)) visit(node.children);
    }
  }

  visit(nodes);
  return result;
}
