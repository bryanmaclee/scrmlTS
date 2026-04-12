import { rewriteExpr, rewriteReactiveRefs } from "./rewrite.js";
import { rewriteBlockBody } from "./emit-control-flow.ts";
import { emitExpr } from "./emit-expr.ts";
import type { ExprNode } from "../types/ast.ts";
import type { EncodingContext } from "./type-encoding.ts";
import type { CompileContext } from "./context.ts";

/** An event binding recorded by HTML gen and consumed by client JS gen. */
interface EventBinding {
  placeholderId: string;
  eventName: string;
  handlerName: string;
  handlerArgs?: unknown[];
  /** Raw expression handler from ${...} attribute values (e.g. "() => fn(arg)"). */
  handlerExpr?: string;
  /** Phase 3: structured ExprNode form of `handlerExpr`. */
  handlerExprNode?: ExprNode;
  /** Phase 4: structured ExprNode for each handler arg. */
  handlerArgExprNodes?: ExprNode[];
}

/** A logic binding recorded by HTML gen and consumed by client JS gen. */
interface LogicBinding {
  placeholderId: string;
  expr: string;
  reactiveRefs?: Set<string> | null;
  isConditionalDisplay?: boolean;
  varName?: string;
  condExpr?: string;
  /** Phase 3: structured ExprNode form of `condExpr`. */
  condExprNode?: ExprNode;
  refs?: string[];
  dotPath?: string;
  transitionEnter?: string;
  transitionExit?: string;
  /** Phase 3: structured ExprNode form of `expr`. */
  exprNode?: ExprNode;
}

/**
 * Emit event handler wiring and reactive display wiring.
 *
 * Event handler wiring: Uses data-scrml-bind-* attributes to find elements
 * and attach event listeners. Requires fnNameMap to resolve original function
 * names to their generated names.
 *
 * Approach D (Hybrid Delegation): Splits event handling into two codegen paths:
 *
 * 1. DELEGABLE events (click, submit): Emit a handler registry object and a
 *    single document.addEventListener per event type. The listener walks
 *    event.target up to document checking data-scrml-bind-<eventName>, then
 *    dispatches from the registry. This reduces N individual element listeners
 *    to 1 delegated listener per delegable event type.
 *
 * 2. NON-DELEGABLE events (focus, blur, scroll, change, input, mouseenter,
 *    mouseleave, etc.): Keep Approach A batch querySelectorAll + forEach +
 *    addEventListener per element. These events either do not bubble or have
 *    semantics where delegation is incorrect.
 *
 * bind:value, bind:checked, class:, if= wiring is unchanged — these retain
 * per-element querySelector because reactive subscriptions need persistent
 * element references.
 *
 * @param {{
 *   eventBindings: EventBinding[],
 *   logicBindings: LogicBinding[],
 *   fnNameMap: Map<string, string>,
 * }} params
 * @returns {string[]} lines — JS lines to append to the client module
 */

/**
 * Events that bubble reliably and are safe to delegate to document.
 * All other event types use Approach A (querySelectorAll + forEach).
 */
const DELEGABLE_EVENTS = new Set(["click", "submit"]);

/**
 * Find the matching closing brace/paren/bracket starting at `openPos`.
 * Returns the index of the closing character, or -1 if not found.
 */
function findMatchingClose(str: string, openPos: number): number {
  const open = str[openPos];
  const close = open === "{" ? "}" : open === "(" ? ")" : "]";
  let depth = 1;
  let i = openPos + 1;
  while (i < str.length) {
    const ch = str[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      i++;
      while (i < str.length && str[i] !== ch) {
        if (str[i] === "\\") i++;
        i++;
      }
    } else if (ch === open) {
      depth++;
    } else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

/**
 * If `raw` is a `fn(params) { body }` expression (the scrml fn shorthand),
 * return { params, body } with the body content extracted.
 * Returns null if it is not a fn() expression.
 *
 * This lets the caller rewrite only the body with rewriteBlockBody and then
 * construct a proper `function(params) { rewritten_body }` without double-wrapping.
 */
function parseFnExpression(raw: string): { params: string; body: string } | null {
  // Match: optional whitespace, then `fn` keyword, then `(`
  const m = raw.match(/^\s*fn\s*(\()/);
  if (!m) return null;

  // Find the closing paren of the parameter list
  const parenOpen = raw.indexOf("(", m.index! + (m[0].length - 1));
  const parenClose = findMatchingClose(raw, parenOpen);
  if (parenClose < 0) return null;
  const params = raw.slice(parenOpen + 1, parenClose).trim();

  // Find the opening brace of the body
  const afterParen = raw.slice(parenClose + 1).trimStart();
  if (!afterParen.startsWith("{")) return null;
  const braceOpen = parenClose + 1 + (raw.slice(parenClose + 1).length - afterParen.length);
  const braceClose = findMatchingClose(raw, braceOpen);
  if (braceClose < 0) return null;
  const body = raw.slice(braceOpen + 1, braceClose).trim();

  return { params, body };
}

/**
 * If `raw` is an arrow function `(params) => body` or `param => body`,
 * return true. These can be used directly as event handler values without
 * wrapping in `function(event) { ... }`.
 */
function isArrowFunction(raw: string): boolean {
  return /^\s*\([^)]*\)\s*=>/.test(raw) ||
         /^\s*[\w$_][\w$_0-9]*\s*=>/.test(raw);
}

export function emitEventWiring(ctx: CompileContext, fnNameMap: Map<string, string>): string[] {
  const eventBindings = ctx.registry.eventBindings as EventBinding[];
  const logicBindings = ctx.registry.logicBindings as LogicBinding[];
  const encodingCtx = ctx.encodingCtx;
  const lines: string[] = [];

  const hasEvents = eventBindings && eventBindings.length > 0;
  const hasLogic = logicBindings && logicBindings.length > 0;
  if (!hasEvents && !hasLogic) {
    return lines;
  }

  lines.push("");
  lines.push("// --- Event handler wiring (compiler-generated) ---");
  lines.push("document.addEventListener('DOMContentLoaded', function() {");

  // -------------------------------------------------------------------------
  // Step 8: Wire event handlers from HTML bindings to generated functions
  //
  // Approach D: Split by delegability.
  //   - Delegable (click, submit): handler registry + document.addEventListener
  //     with ancestor walk. One listener per delegable event type.
  //   - Non-delegable: Approach A querySelectorAll + forEach per event type.
  // -------------------------------------------------------------------------

  // Group event bindings by event type (e.g. "onclick", "onsubmit", "onchange")
  const byEventType = new Map<string, Array<{placeholderId: string; handlerExpr: string}>>();

  for (const binding of eventBindings) {
    const { placeholderId, eventName, handlerName, handlerArgs } = binding;
    const domEvent = eventName.replace(/^on/, ""); // onclick → click

    let handlerExpr: string;

    if (binding.handlerExpr) {
      // Raw expression from ${...} attribute value — use as the handler body.
      // Three cases:
      //
      // Case A: fn() { body } — scrml fn shorthand. The fn keyword rewrites to
      //   `function`, but wrapping the result in `function(event) { function() {...}; }`
      //   produces an unnamed function declaration statement — a JS syntax error.
      //   Instead, extract the body, rewrite it with rewriteBlockBody (so @var = expr
      //   becomes _scrml_reactive_set, etc.), and construct function(params) { body }.
      //
      // Case B: Arrow function `(p) => expr` or `p => expr`. Already callable.
      //   Use rewriteExpr on the whole thing and place it directly as the handler.
      //
      // Case C: Plain expression / statement. Rewrite with rewriteBlockBody and
      //   wrap in `function(event) { ... }` so it's a valid callable handler value.

      const fnParsed = parseFnExpression(binding.handlerExpr);
      if (fnParsed !== null) {
        // Case A: fn(params) { body } — rewrite the body, construct function directly.
        const rewrittenBody = rewriteBlockBody(fnParsed.body);
        handlerExpr = `function(${fnParsed.params}) { ${rewrittenBody}; }`;
      } else if (isArrowFunction(binding.handlerExpr)) {
        // Case B: Arrow function — rewrite reactive refs in the expression but
        // do not add an outer wrapper.
        handlerExpr = binding.handlerExprNode
          ? emitExpr(binding.handlerExprNode, { mode: "client" })
          : rewriteExpr(binding.handlerExpr);
      } else {
        // Case C: Plain expression or statement body. Rewrite and wrap.
        const rewritten = rewriteBlockBody(binding.handlerExpr);
        // If the expression is a bare identifier (function reference without call parens),
        // append () to actually invoke it. onclick=${advance} should call advance(), not
        // just reference it as a dead expression statement.
        const isBareRef = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(rewritten.trim());
        const body = isBareRef ? `${rewritten}()` : rewritten;
        handlerExpr = `function(event) { ${body}; }`;
      }
    } else {
      // call-ref path: resolve handler name and serialize arguments
      // Resolve the handler: check fnNameMap first, fall back to original name
      const resolvedHandler = fnNameMap.get(handlerName) || handlerName;

      // Serialize the arguments from the call-ref attribute value.
      // Args from the parser are raw expression strings (e.g. '"apple"', 'userId', '9.99').
      // Object args with .kind need special handling.
      const _argNodes = binding.handlerArgExprNodes;
      const argsStr = (handlerArgs ?? []).map((a: unknown, idx: number) => {
        if (typeof a === "string") return (_argNodes && _argNodes[idx]) ? emitExpr(_argNodes[idx], { mode: "client" }) : rewriteExpr(a);
        const node = a as Record<string, unknown>;
        if (node && node.kind === "string-literal") return JSON.stringify(node.value);
        if (node && node.kind === "number-literal") return String(node.value);
        if (node && node.kind === "variable-ref") return `_scrml_reactive_get(${JSON.stringify(((node.name as string) || "").replace(/^@/, ""))})`;
        if (node && typeof node.value !== "undefined") return JSON.stringify(node.value);
        return String(a);
      }).join(", ");

      // For submit events on forms, auto-inject event.preventDefault()
      const preventLine = domEvent === "submit" ? "event.preventDefault(); " : "";
      handlerExpr = `function(event) { ${preventLine}${resolvedHandler}(${argsStr}); }`;
    }

    if (!byEventType.has(eventName)) {
      byEventType.set(eventName, []);
    }
    byEventType.get(eventName)!.push({ placeholderId, handlerExpr });
  }

  // Emit wiring — delegable events use document.addEventListener with ancestor
  // walk; non-delegable events use Approach A querySelectorAll + forEach.
  for (const [eventName, entries] of byEventType) {
    const domEvent = eventName.replace(/^on/, ""); // onclick → click

    if (DELEGABLE_EVENTS.has(domEvent)) {
      // -----------------------------------------------------------------------
      // Approach D path: handler registry + delegated document listener
      // -----------------------------------------------------------------------
      const registryVarName = `_scrml_${domEvent}`;

      // Emit the handler registry object
      lines.push(`  const ${registryVarName} = {`);
      for (const { placeholderId, handlerExpr } of entries) {
        lines.push(`    ${JSON.stringify(placeholderId)}: ${handlerExpr},`);
      }
      lines.push(`  };`);

      // Emit a single document.addEventListener with ancestor walk
      lines.push(`  document.addEventListener(${JSON.stringify(domEvent)}, function(event) {`);
      lines.push(`    let t = event.target;`);
      lines.push(`    while (t && t !== document) {`);
      lines.push(`      const id = t.getAttribute(${JSON.stringify("data-scrml-bind-" + eventName)});`);
      lines.push(`      if (id && ${registryVarName}[id]) { ${registryVarName}[id](event); return; }`);
      lines.push(`      t = t.parentElement;`);
      lines.push(`    }`);
      lines.push(`  });`);
    } else {
      // -----------------------------------------------------------------------
      // Approach A path: batch querySelectorAll + forEach per event type
      // -----------------------------------------------------------------------
      const mapVarName = `_scrml_${domEvent}_handlers`;

      // Emit the handler dispatch map
      lines.push(`  const ${mapVarName} = {`);
      for (const { placeholderId, handlerExpr } of entries) {
        lines.push(`    ${JSON.stringify(placeholderId)}: ${handlerExpr},`);
      }
      lines.push(`  };`);

      // Emit one querySelectorAll to wire all handlers for this event type
      lines.push(`  document.querySelectorAll('[data-scrml-bind-${eventName}]').forEach(function(el) {`);
      lines.push(`    const _scrml_id = el.getAttribute('data-scrml-bind-${eventName}');`);
      lines.push(`    if (${mapVarName}[_scrml_id]) el.addEventListener(${JSON.stringify(domEvent)}, ${mapVarName}[_scrml_id]);`);
      lines.push(`  });`);
    }
  }

  // -------------------------------------------------------------------------
  // Step 9: Wire reactive display for logic placeholders
  // -------------------------------------------------------------------------
  if (logicBindings && logicBindings.length > 0) {
    lines.push("");
    lines.push("  // --- Reactive display wiring ---");
    for (const binding of logicBindings) {
      const { placeholderId, expr } = binding;

      // Conditional display (if=) — toggle element visibility
      // With optional transition:fade/slide/fly, in:fade, out:slide directives
      if (binding.isConditionalDisplay) {
        const hasTransition = binding.transitionEnter || binding.transitionExit;

        lines.push(`  {`);
        lines.push(`    const el = document.querySelector('[data-scrml-bind-if="${placeholderId}"]');`);
        lines.push(`    if (el) {`);

        // Build the condition expression string used for evaluation
        let conditionCode: string | undefined;
        let subscribeVars: string[] | undefined; // array of var names

        // FIX(IS-VARIANT-ATTR): The previous condition required `refs.length > 0` to
        // activate the condExpr path. This caused `is .Variant` expressions (which have
        // no @-prefixed reactive refs) to silently fall through, producing no output.
        // condExpr is valid even when refs is empty — emit the condition unconditionally.
        if (binding.condExpr) {
          const compiled = binding.condExprNode
            ? emitExpr(binding.condExprNode, { mode: "client" })
            : rewriteExpr(binding.condExpr);
          conditionCode = `(${compiled})`;
          subscribeVars = binding.refs ?? [];
        } else if (binding.varName) {
          const condVarName = binding.varName;
          const encodedCondVar = encodingCtx && encodingCtx.enabled ? encodingCtx.encode(condVarName) : condVarName;
          if (binding.dotPath) {
            conditionCode = `(_scrml_reactive_get(${JSON.stringify(encodedCondVar)}).${binding.dotPath.slice(condVarName.length + 1)})`;
          } else {
            conditionCode = `_scrml_reactive_get(${JSON.stringify(encodedCondVar)})`;
          }
          subscribeVars = [encodedCondVar];
        }

        if (conditionCode && subscribeVars !== undefined) {
          if (!hasTransition) {
            // No transition — simple display toggle (original behavior)
            lines.push(`      el.style.display = ${conditionCode} ? "" : "none";`);
            lines.push(`      _scrml_effect(function() { el.style.display = ${conditionCode} ? "" : "none"; });`);
          } else {
            // Transition-aware display toggle
            const enterClass = binding.transitionEnter ? `"scrml-enter-${binding.transitionEnter}"` : null;
            const exitClass = binding.transitionExit ? `"scrml-exit-${binding.transitionExit}"` : null;

            // Initial state — no animation on first render
            lines.push(`      el.style.display = ${conditionCode} ? "" : "none";`);

            // Build the transition toggle function
            lines.push(`      function _scrml_transition_${placeholderId.replace(/[^a-zA-Z0-9_]/g, "_")}() {`);
            lines.push(`        const _scrml_show = ${conditionCode};`);
            lines.push(`        if (_scrml_show) {`);
            if (enterClass) {
              lines.push(`          el.style.display = "";`);
              lines.push(`          el.classList.add(${enterClass});`);
              lines.push(`          el.addEventListener("animationend", function _scrml_ae() { el.classList.remove(${enterClass}); el.removeEventListener("animationend", _scrml_ae); }, { once: true });`);
            } else {
              lines.push(`          el.style.display = "";`);
            }
            lines.push(`        } else {`);
            if (exitClass) {
              lines.push(`          el.classList.add(${exitClass});`);
              lines.push(`          el.addEventListener("animationend", function _scrml_ae() { el.classList.remove(${exitClass}); el.style.display = "none"; el.removeEventListener("animationend", _scrml_ae); }, { once: true });`);
            } else {
              lines.push(`          el.style.display = "none";`);
            }
            lines.push(`        }`);
            lines.push(`      }`);

            lines.push(`      _scrml_effect(_scrml_transition_${placeholderId.replace(/[^a-zA-Z0-9_]/g, "_")});`);
          }
        }

        lines.push(`    }`);
        lines.push(`  }`);
        continue;
      }

      // Extract all @var references from the expression.
      //
      // Phase 4: prefer reactiveRefs (pre-annotated by emit-html.js using the
      // string-literal-aware extractReactiveDeps). Fall back to inline regex scan
      // for backward compatibility with bindings created without annotation.
      let varRefs: string[];
      if (binding.reactiveRefs !== undefined && binding.reactiveRefs !== null) {
        // Use pre-annotated deps — string-literal-aware, filtered to known reactive vars
        varRefs = Array.from(binding.reactiveRefs);
      } else {
        // Fallback: regex scan of the raw expression string
        // This path handles bindings created without reactiveRefs annotation.
        varRefs = [];
        const varRefRegex = /@([A-Za-z_$][A-Za-z0-9_$]*)/g;
        let match;
        while ((match = varRefRegex.exec(expr)) !== null) {
          varRefs.push(match[1]);
        }
      }

      if (varRefs.length > 0) {
        let rewrittenExpr = binding.exprNode
          ? emitExpr(binding.exprNode, { mode: "client" })
          : rewriteExpr(expr);

        // When encoding is active, replace _scrml_reactive_get("name") with encoded names
        if (encodingCtx && encodingCtx.enabled) {
          for (const ref of varRefs) {
            const encoded = encodingCtx.encode(ref);
            if (encoded !== ref) {
              rewrittenExpr = rewrittenExpr.split(`_scrml_reactive_get("${ref}")`).join(`_scrml_reactive_get(${JSON.stringify(encoded)})`);
            }
          }
        }

        lines.push(`  {`);
        lines.push(`    const el = document.querySelector('[data-scrml-logic="${placeholderId}"]');`);
        lines.push(`    if (el) {`);
        lines.push(`      el.textContent = ${rewrittenExpr};`);

        lines.push(`      _scrml_effect(function() { el.textContent = ${rewrittenExpr}; });`);

        lines.push(`    }`);
        lines.push(`  }`);
      }
    }
  }

  // --- §17.1.1: if-chain wiring ---
  if (logicBindings && logicBindings.length > 0) {
    // Group chain branches by chainId
    const chains = new Map<string, any[]>();
    for (const binding of logicBindings) {
      if (binding.kind === "if-chain-branch" || binding.kind === "if-chain-else") {
        const chainId = binding.chainId;
        if (!chains.has(chainId)) chains.set(chainId, []);
        chains.get(chainId)!.push(binding);
      }
    }

    for (const [chainId, chainBindings] of chains) {
      lines.push("");
      lines.push(`  // if-chain: ${chainId}`);
      lines.push(`  {`);
      lines.push(`    const _chain_branches = document.querySelectorAll('[data-scrml-if-chain="${chainId}"]');`);
      lines.push(`    function _update_chain_${chainId.replace(/[^a-zA-Z0-9_]/g, "_")}() {`);

      // Evaluate conditions in order
      const condBranches = chainBindings.filter((b: any) => b.kind === "if-chain-branch");
      const elseBranch = chainBindings.find((b: any) => b.kind === "if-chain-else");

      lines.push(`      let _active = null;`);
      for (const branch of condBranches) {
        let condCode: string;
        if (branch.condition?.raw) {
          condCode = rewriteReactiveRefs(branch.condition.raw);
        } else if (branch.condition?.name) {
          const varName = branch.condition.name.replace(/^@/, "");
          condCode = `_scrml_reactive_get(${JSON.stringify(varName)})`;
        } else {
          condCode = "true";
        }
        lines.push(`      if (_active === null && (${condCode})) _active = "${branch.branchId}";`);
      }
      if (elseBranch) {
        lines.push(`      if (_active === null) _active = "${elseBranch.branchId}";`);
      }
      lines.push(`      for (const el of _chain_branches) {`);
      lines.push(`        el.style.display = el.getAttribute("data-scrml-chain-branch") === _active ? "" : "none";`);
      lines.push(`      }`);
      lines.push(`    }`);
      lines.push(`    _update_chain_${chainId.replace(/[^a-zA-Z0-9_]/g, "_")}();`);

      // Auto-tracking effect handles all reactive deps
      lines.push(`    _scrml_effect(_update_chain_${chainId.replace(/[^a-zA-Z0-9_]/g, "_")});`);
      lines.push(`  }`);
    }
  }

  lines.push("});");

  return lines;
}
