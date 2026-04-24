import { genVar } from "./var-counter.ts";
import { emitStringFromTree, exprNodeContainsMemberAccess } from "../expression-parser.ts";
import { escapeHtmlAttr, VOID_ELEMENTS } from "./utils.ts";
import { extractReactiveDeps, collectReactiveVarNames, extractReactiveDepsTransitive, buildFunctionBodyRegistry } from "./reactive-deps.ts";
import { hasTemplateInterpolation, rewriteBunEval } from "./rewrite.js";
import { CGError } from "./errors.ts";
import type { BindingRegistry } from "./binding-registry.ts";
import type { CompileContext } from "./context.ts";
import { isFlatDeclarationBlock, renderFlatDeclarationAsInlineStyle } from "./emit-css.ts";

// Supported bind: attribute names per SPEC §5.4
const SUPPORTED_BIND_NAMES = new Set(["value", "valueAsNumber", "checked", "selected", "files", "group"]);

// Supported transition types for transition:, in:, out: directives
const SUPPORTED_TRANSITIONS = new Set(["fade", "slide", "fly"]);

// Element-type restrictions per SPEC §5.4
const BIND_VALID_TAGS: Record<string, Set<string>> = {
  "bind:value":          new Set(["input", "textarea", "select"]),
  "bind:valueAsNumber":  new Set(["input", "textarea", "select"]),
  "bind:checked":        new Set(["input"]),
  "bind:selected":       new Set(["select"]),
  "bind:files":          new Set(["input"]),
  "bind:group":          new Set(["input"]),
};

// Lifecycle elements that emit no HTML — handled by emit-reactive-wiring.js
const LIFECYCLE_SILENT_TAGS = new Set(["timer", "poll"]);

// §35 Input state type elements that emit no HTML — handled by emit-reactive-wiring.js
const INPUT_STATE_TAGS = new Set(["keyboard", "mouse", "gamepad"]);

// §6.7.7 <request> — single-shot async fetch state type, emits no HTML
const REQUEST_TAGS = new Set(["request"]);

// §6.7.8 <timeout> — single-shot timer state type, emits no HTML
const TIMEOUT_TAGS = new Set(["timeout"]);

/**
 * Generate HTML from markup AST nodes.
 * Also populates the BindingRegistry for client JS wiring.
 */
export function generateHtml(
  nodes: any[],
  ctxOrErrors: CompileContext | CGError[] | null,
  csrfEnabledLegacy?: boolean,
  registryLegacy?: BindingRegistry | null,
  fileASTLegacy?: any,
): string {
  // Support both new (nodes, ctx) and legacy (nodes, errors, csrfEnabled, registry, fileAST) signatures
  let errors: CGError[];
  let csrfEnabled: boolean;
  let registry: BindingRegistry | null | undefined;
  let fileAST: any;
  if (ctxOrErrors && typeof ctxOrErrors === "object" && "fileAST" in ctxOrErrors) {
    // New CompileContext signature
    const ctx = ctxOrErrors as CompileContext;
    errors = ctx.errors;
    csrfEnabled = ctx.csrfEnabled;
    registry = ctx.registry;
    fileAST = ctx.fileAST;
  } else {
    // Legacy positional signature
    errors = (ctxOrErrors as CGError[] | null) ?? [];
    csrfEnabled = csrfEnabledLegacy ?? false;
    registry = registryLegacy;
    fileAST = fileASTLegacy;
  }
  const parts: string[] = [];

  const reactiveVarNames: Set<string> | null = fileAST ? collectReactiveVarNames(fileAST) : null;
  const fnBodyRegistry = fileAST ? buildFunctionBodyRegistry(fileAST) : null;

  function emitNode(node: any): void {
    if (!node || typeof node !== "object") return;

    if (node.kind === "text") {
      parts.push(node.value ?? node.text ?? "");
      return;
    }

    if (node.kind === "comment") {
      return;
    }

    if (node.kind === "state") {
      for (const child of node.children ?? []) {
        emitNode(child);
      }
      return;
    }

    // §17.1.1: if-chain — render all branches, only first active is visible
    if (node.kind === "if-chain") {
      const chainId = genVar("if_chain");
      for (let bIdx = 0; bIdx < (node.branches?.length ?? 0); bIdx++) {
        const branch = node.branches[bIdx];
        const branchId = `${chainId}_b${bIdx}`;
        parts.push(`<div data-scrml-if-chain="${chainId}" data-scrml-chain-branch="${branchId}" style="display:none">`);
        emitNode(branch.element);
        parts.push(`</div>`);
        // Register the branch for event wiring
        if (registry) {
          registry.addLogicBinding({
            kind: "if-chain-branch",
            chainId,
            branchId,
            branchIndex: bIdx,
            condition: branch.condition,
            refs: branch.condition?.refs ?? (branch.condition?.name ? [branch.condition.name.replace(/^@/, "")] : []),
          });
        }
      }
      if (node.elseBranch) {
        const elseId = `${chainId}_else`;
        parts.push(`<div data-scrml-if-chain="${chainId}" data-scrml-chain-branch="${elseId}" style="display:none">`);
        emitNode(node.elseBranch);
        parts.push(`</div>`);
        if (registry) {
          registry.addLogicBinding({
            kind: "if-chain-else",
            chainId,
            branchId: elseId,
          });
        }
      }
      return;
    }

    if (node.kind === "markup") {
      const tag: string = node.tag ?? node.tagName ?? "div";
      const attrs: any[] = node.attributes ?? node.attrs ?? [];
      const children: any[] = node.children ?? [];
      const isSelfClosing: boolean = node.selfClosing === true && children.length === 0;
      const isVoid: boolean = VOID_ELEMENTS.has(tag);

      if (tag === "errorBoundary" || tag === "errorboundary") {
        const boundaryId = genVar("error_boundary");
        parts.push(`<div data-scrml-error-boundary="${boundaryId}">`);
        for (const child of children) {
          emitNode(child);
        }
        parts.push("</div>");
        return;
      }

      if (tag === "program") {
        // Named programs are worker bundles (§4.12.4) — skip entirely.
        // Only emit children for the unnamed/root program.
        const nameAttr = attrs.find((a: any) => a.name === "name");
        if (nameAttr) return;
        for (const child of children) {
          emitNode(child);
        }
        return;
      }

      if (LIFECYCLE_SILENT_TAGS.has(tag)) {
        const span = node.span ?? { file: "", start: 0, end: 0, line: 1, col: 1 };
        const attrMap = new Map<string, any>((attrs ?? []).map((a: any) => [a.name, a]));

        if (!attrMap.has("interval")) {
          if (errors) {
            errors.push(new CGError(
              "E-LIFECYCLE-009",
              `E-LIFECYCLE-009: \`<${tag}>\` is missing the required \`interval\` attribute. ` +
              `The interval specifies how often the body executes, in milliseconds. ` +
              `Example: \`<${tag} interval=1000>\`.`,
              span,
            ));
          }
        } else {
          const intervalAttr = attrMap.get("interval");
          const intervalVal = intervalAttr?.value;
          let intervalMs: number | null = null;
          if (intervalVal?.kind === "string-literal") {
            intervalMs = parseInt(intervalVal.value, 10);
          } else if (intervalVal?.kind === "variable-ref") {
            const raw: string = intervalVal.name ?? "";
            intervalMs = parseInt(raw, 10);
          }
          if (intervalMs !== null && !isNaN(intervalMs) && intervalMs <= 0) {
            if (errors) {
              errors.push(new CGError(
                "E-LIFECYCLE-010",
                `E-LIFECYCLE-010: \`<${tag}>\` has \`interval=${intervalMs}\` which is zero or negative. ` +
                `The interval must be a positive integer (milliseconds). ` +
                `Example: \`interval=1000\` for 1 second.`,
                span,
              ));
            }
          }
        }

        if (attrMap.has("running")) {
          const runningAttr = attrMap.get("running");
          const runningVal = runningAttr?.value;
          if (runningVal?.kind === "variable-ref" && runningVal.name === "false") {
            if (errors) {
              errors.push(new CGError(
                "W-LIFECYCLE-007",
                `W-LIFECYCLE-007: \`<${tag}>\` has \`running=false\` as a boolean literal. ` +
                `This timer starts paused and has no way to resume without a reactive \`@variable\`. ` +
                `Use \`running=@yourVar\` to make the running state reactive, or remove the attribute to always run.`,
                span,
                "warning",
              ));
            }
          }
        }

        if (tag === "timer") {
          if (isSelfClosing || children.length === 0) {
            if (errors) {
              errors.push(new CGError(
                "W-LIFECYCLE-002",
                `W-LIFECYCLE-002: \`<timer>\` has no body and no observable effect. ` +
                `A timer with no logic body only increments tickCount. ` +
                `If you need tick counting, add a \`${"\${"}<#id>.tickCount = <#id>.tickCount + 1}\` body, ` +
                `or remove this timer.`,
                span,
                "warning",
              ));
            }
          }
        }

        if (tag === "poll") {
          if (isSelfClosing || children.length === 0) {
            if (errors) {
              errors.push(new CGError(
                "E-LIFECYCLE-012",
                `E-LIFECYCLE-012: \`<poll>\` requires a logic body. ` +
                `A poll that fetches nothing is nonsensical. ` +
                `Add a \`\${ @data = fetchSomething() }\` body.`,
                span,
              ));
            }
          }
        }

        return;
      }

      if (INPUT_STATE_TAGS.has(tag)) {
        const span = node.span ?? { file: "", start: 0, end: 0, line: 1, col: 1 };
        const attrMap = new Map<string, any>((attrs ?? []).map((a: any) => [a.name, a]));

        if (!attrMap.has("id")) {
          const errCodes: Record<string, string> = { keyboard: "E-INPUT-001", mouse: "E-INPUT-002", gamepad: "E-INPUT-003" };
          const code = errCodes[tag] ?? "E-INPUT-001";
          if (errors) {
            errors.push(new CGError(
              code,
              `${code}: \`<${tag}>\` requires an \`id\` attribute. Without an id, the ` +
              `input state cannot be referenced via \`<#id>\`. ` +
              `Add \`id="yourName"\` to the element.`,
              span,
            ));
          }
        }

        if (tag === "gamepad" && attrMap.has("index")) {
          const indexAttr = attrMap.get("index");
          const indexVal = indexAttr?.value;
          let indexNum: number | null = null;
          if (indexVal?.kind === "string-literal") {
            indexNum = parseInt(indexVal.value, 10);
          } else if (indexVal?.kind === "variable-ref") {
            indexNum = parseInt((indexVal.name ?? "").replace(/^@/, ""), 10);
          }
          if (indexNum !== null && !isNaN(indexNum) && (indexNum < 0 || indexNum > 3)) {
            if (errors) {
              errors.push(new CGError(
                "E-INPUT-004",
                `E-INPUT-004: \`<gamepad>\` attribute \`index\` must be 0, 1, 2, or 3 ` +
                `(the Gamepad API supports at most 4 simultaneous gamepads). ` +
                `Got \`${indexNum}\`. Use a value in [0, 1, 2, 3].`,
                span,
              ));
            }
          }
        }

        return;
      }

      if (REQUEST_TAGS.has(tag)) {
        const span = node.span ?? { file: "", start: 0, end: 0, line: 1, col: 1 };
        const attrMap = new Map<string, any>((attrs ?? []).map((a: any) => [a.name, a]));

        if (!attrMap.has("id")) {
          if (errors) {
            errors.push(new CGError(
              "E-LIFECYCLE-018",
              `E-LIFECYCLE-018: \`<request>\` requires an \`id\` attribute. Without an id, ` +
              `the fetch state cannot be referenced via \`<#id>.loading\`, \`<#id>.data\`, etc. ` +
              `Add \`id="yourName"\` to the element.`,
              span,
            ));
          }
        }

        return;
      }

      if (TIMEOUT_TAGS.has(tag)) {
        const span = node.span ?? { file: "", start: 0, end: 0, line: 1, col: 1 };
        const attrMap = new Map<string, any>((attrs ?? []).map((a: any) => [a.name, a]));

        if (!attrMap.has("delay")) {
          if (errors) {
            errors.push(new CGError(
              "E-TIMEOUT-001",
              `E-TIMEOUT-001: \`<timeout>\` requires a \`delay\` attribute. ` +
              `The delay specifies when the timeout fires, in milliseconds. ` +
              `Example: \`<timeout id="guard" delay=5000>\`.`,
              span,
            ));
          }
        } else {
          const delayAttr = attrMap.get("delay");
          const delayVal = delayAttr?.value;
          let delayMs: number | null = null;
          if (delayVal?.kind === "string-literal") {
            delayMs = parseInt(delayVal.value, 10);
          } else if (delayVal?.kind === "variable-ref") {
            const raw: string = (delayVal.name ?? "").replace(/^@/, "");
            delayMs = parseInt(raw, 10);
          }
          if (delayMs !== null && !isNaN(delayMs) && delayMs <= 0) {
            if (errors) {
              errors.push(new CGError(
                "E-TIMEOUT-002",
                `E-TIMEOUT-002: \`<timeout>\` has \`delay=${delayMs}\` which is zero or negative. ` +
                `The delay must be a positive integer (milliseconds). ` +
                `Example: \`delay=5000\` for 5 seconds.`,
                span,
              ));
            }
          }
        }

        return;
      }

      if (tag === "channel") {
        const span = node.span ?? { file: "", start: 0, end: 0, line: 1, col: 1 };
        const attrMap = new Map<string, any>((attrs ?? []).map((a: any) => [a.name, a]));
        if (!attrMap.has("name")) {
          if (errors) {
            errors.push(new CGError(
              "E-CHANNEL-001",
              `E-CHANNEL-001: \`<channel>\` is missing the required \`name\` attribute. ` +
              `The name identifies this channel and sets the WebSocket URL path. ` +
              `Example: \`<channel name="chat">\`.`,
              span,
            ));
          }
        }
        return;
      }

      // Pre-pass: validate bind: attributes
      if (errors) {
        for (const attr of attrs) {
          if (!attr || !attr.name) continue;
          if (!attr.name.startsWith("bind:")) continue;

          const bindName: string = attr.name;
          const suffix: string = bindName.slice(5);
          const span = attr.span ?? node.span ?? { file: "", start: 0, end: 0, line: 0, col: 0 };

          if (!SUPPORTED_BIND_NAMES.has(suffix)) {
            errors.push(new CGError(
              "E-ATTR-011",
              `E-ATTR-011: \`${bindName}\` is not a supported bind: attribute. ` +
              `Supported: \`bind:value\`, \`bind:checked\`, \`bind:selected\`, \`bind:group\`, \`bind:this\`.`,
              span,
            ));
          }

          const val = attr.value;
          const isReactive: boolean = val && val.kind === "variable-ref" &&
            (val.name ?? "").startsWith("@");
          if (!isReactive && SUPPORTED_BIND_NAMES.has(suffix)) {
            const rawName: string | null = val && val.kind === "variable-ref"
              ? val.name
              : (val && val.kind === "string-literal" ? val.value : null);
            const hint = rawName
              ? ` \`${rawName}\` is not reactive. Use \`@${rawName}\` or change \`${bindName}\` to \`${suffix}=${rawName}\`.`
              : ` The right-hand side of \`${bindName}\` must be an \`@\`-prefixed reactive variable, e.g. \`bind:value=@myVar\`.`;
            errors.push(new CGError(
              "E-ATTR-010",
              `E-ATTR-010: \`bind:\` requires a reactive \`@\` variable.${hint}`,
              span,
            ));
          }

          if (SUPPORTED_BIND_NAMES.has(suffix)) {
            const validTags = BIND_VALID_TAGS[bindName];
            if (validTags && !validTags.has(tag)) {
              errors.push(new CGError(
                "E-ATTR-011",
                `E-ATTR-011: \`${bindName}\` is not valid on \`<${tag}>\`. ` +
                `Valid elements: ${[...validTags].map((t: string) => `<${t}>`).join(", ")}.`,
                span,
              ));
            }
          }
        }
      }

      // Pre-scan for transition directives
      let transitionEnter: string | null = null;
      let transitionExit: string | null = null;
      for (const attr of attrs) {
        if (!attr || !attr.name) continue;
        const aName: string = attr.name;
        if (aName.startsWith("transition:")) {
          const type = aName.slice(11);
          if (SUPPORTED_TRANSITIONS.has(type)) {
            transitionEnter = type;
            transitionExit = type;
          }
        } else if (aName.startsWith("in:")) {
          const type = aName.slice(3);
          if (SUPPORTED_TRANSITIONS.has(type)) {
            transitionEnter = type;
          }
        } else if (aName.startsWith("out:")) {
          const type = aName.slice(4);
          if (SUPPORTED_TRANSITIONS.has(type)) {
            transitionExit = type;
          }
        }
      }

      // DQ-7: Pre-scan children for flat-declaration #{} blocks.
      // Flat-declaration #{} (all prop:value pairs, no selectors) compiles to
      // inline style="" on the containing element instead of an @scope CSS block.
      // Only applies to elements inside a component scope (_expandedFrom set).
      let flatInlineStyle: string | null = null;
      if (node._expandedFrom) {
        const flatParts: string[] = [];
        for (const child of children) {
          if (child && child.kind === "css-inline" && isFlatDeclarationBlock(child)) {
            const inline = renderFlatDeclarationAsInlineStyle(child);
            if (inline) flatParts.push(inline);
          }
        }
        if (flatParts.length > 0) flatInlineStyle = flatParts.join(" ");
      }

      parts.push(`<${tag}`);

      if (node._expandedFrom) {
        // DQ-7: data-scrml="Name" is the @scope root attribute (native CSS @scope).
        // Replaces prior data-scrml-scope="Name" attribute.
        parts.push(` data-scrml="${escapeHtmlAttr(node._expandedFrom)}"`);
      }

      // DQ-7: inject flat-declaration #{} content as inline style=""
      if (flatInlineStyle) {
        parts.push(` style="${escapeHtmlAttr(flatInlineStyle)}"`);
      }

      for (const attr of attrs) {
        if (!attr) continue;
        const name: string = attr.name;
        const val = attr.value;

        if (name.startsWith("transition:") || name.startsWith("in:") || name.startsWith("out:")) {
          continue;
        }

        if (name.startsWith("bind:")) {
          const bindId = genVar(`bind_${name.replace(":", "_")}`);
          parts.push(` data-scrml-${name.replace(":", "-")}="${bindId}"`);
          if (!attr._bindId) attr._bindId = bindId;
          continue;
        }

        if (name.startsWith("class:")) {
          const classBindId = genVar(`class_${name.replace(":", "_")}`);
          parts.push(` data-scrml-${name.replace(":", "-")}="${classBindId}"`);
          if (!attr._bindId) attr._bindId = classBindId;
          continue;
        }

        if (name === "ref" && val && val.kind === "variable-ref") {
          const refName: string = val.name.replace(/^@/, "");
          parts.push(` data-scrml-ref="${escapeHtmlAttr(refName)}"`);
          continue;
        }

        if (!val || val.kind === "absent") {
          parts.push(` ${name}`);
        } else if (val.kind === "string-literal") {
          if (hasTemplateInterpolation(val.value)) {
            const tplId = genVar(`attr_tpl_${name}`);
            parts.push(` ${name}="" data-scrml-attr-tpl-${name}="${tplId}"`);
            if (!attr._tplId) attr._tplId = tplId;
          } else {
            parts.push(` ${name}="${escapeHtmlAttr(val.value)}"`);
          }
        } else if (val.kind === "variable-ref") {
          const varName: string = val.name ?? "";
          if (varName.startsWith("@") && name === "if") {
            // §3: if=@var — reactive conditional display binding.
            // The @-prefix is meaningful here: it marks the variable as reactive.
            const placeholderId = genVar(`attr_${name}`);
            parts.push(` data-scrml-bind-if="${placeholderId}"`);
            if (registry) {
              const ifVarName = varName.replace(/^@/, "");
              const ifBaseVar = ifVarName.split(".")[0];
              const hasDotPath = ifVarName.includes(".");
              registry.addLogicBinding({
                placeholderId,
                expr: `@${ifVarName}`,
                isConditionalDisplay: true,
                varName: ifBaseVar,
                ...(hasDotPath ? { dotPath: ifVarName } : {}),
                ...(transitionEnter ? { transitionEnter } : {}),
                ...(transitionExit ? { transitionExit } : {}),
              });
            }
          } else {
            // General attribute: strip optional @ prefix so show=@count
            // resolves identically to show=count (allow-atvar-in-attrs).
            const resolved = varName.replace(/^@/, "");
            parts.push(` ${name}="${escapeHtmlAttr(resolved)}"`);
          }
        } else if (val.kind === "expr") {
          if (name === "if") {
            const placeholderId = genVar(`attr_${name}`);
            parts.push(` data-scrml-bind-if="${placeholderId}"`);
            if (registry) {
              registry.addLogicBinding({
                placeholderId,
                expr: val.raw,
                isConditionalDisplay: true,
                condExpr: val.raw,
                condExprNode: val.exprNode,
                refs: val.refs,
                ...(transitionEnter ? { transitionEnter } : {}),
                ...(transitionExit ? { transitionExit } : {}),
              });
            }
          } else if (name.startsWith("on")) {
            // Event attribute with ${...} expression value, e.g. onclick=${() => fn(arg)}
            const placeholderId = genVar(`attr_${name}`);
            parts.push(` data-scrml-bind-${name}="${placeholderId}"`);
            if (registry) {
              registry.addEventBinding({
                placeholderId,
                eventName: name,
                handlerName: "",
                handlerArgs: [],
                handlerExpr: val.raw,
                handlerExprNode: val.exprNode,
              });
            }
          }
        } else if (val.kind === "call-ref") {
          // Defense-in-depth: server-only call names must not become client event bindings.
          // This can occur if the tokenizer misparses ^{} meta content in attribute position.
          const SERVER_ONLY_CALL = /^(bun\.eval|Bun\.|process\.|fs\.)/;
          if (SERVER_ONLY_CALL.test(val.name ?? "")) {
            // Silently drop — tokenizer fix should prevent this from reaching CG.
          } else {
            const placeholderId = genVar(`attr_${name}`);
            parts.push(` data-scrml-bind-${name}="${placeholderId}"`);
            if (registry) {
              registry.addEventBinding({
                placeholderId,
                eventName: name,
                handlerName: val.name,
                handlerArgs: val.args ?? [],
                handlerArgExprNodes: val.argExprNodes,
              });
            }
          }
        }
      }

      if (isSelfClosing || isVoid) {
        parts.push(" />");
        return;
      }

      parts.push(">");

      if (csrfEnabled && tag === "form") {
        const csrfId = genVar("csrf");
        parts.push(`<input type="hidden" name="_csrf" value="" data-scrml-csrf="${csrfId}" />`);
      }

      for (const child of children) {
        emitNode(child);
      }

      parts.push(`</${tag}>`);
      return;
    }

    // For logic blocks embedded in markup, emit a placeholder span for client JS
    if (node.kind === "logic") {
      if (node.body?.length === 1 && node.body[0]?.kind === "bare-expr") {
        // Phase 4d: ExprNode-first, string fallback
        const expr: string = node.body[0].exprNode ? emitStringFromTree(node.body[0].exprNode) : (node.body[0].expr ?? "");
        if (/\bbun\s*\.\s*eval\s*\(/.test(expr)) {
          const evalErrors: any[] = [];
          const inlined: string = rewriteBunEval(expr, evalErrors);
          if (evalErrors.length === 0 && !inlined.includes("bun.eval")) {
            try {
              const parsed = JSON.parse(inlined);
              parts.push(String(parsed));
            } catch {
              parts.push(inlined);
            }
            if (errors) {
              for (const e of evalErrors) errors.push(new CGError(e.code, e.message, node.span ?? { file: "", start: 0, end: 0, line: 1, col: 1 }));
            }
            return;
          }
        }
      }

      const placeholderId = genVar("logic");
      // Annotate the AST node with its placeholder ID so the client JS emitter
      // can target lift-exprs to the correct DOM position.
      (node as any)._placeholderId = placeholderId;
      parts.push(`<span data-scrml-logic="${placeholderId}"></span>`);
      if (registry && node.body) {
        for (const child of node.body) {
          if (child && child.kind === "bare-expr" && (child.exprNode || child.expr)) {
            // Phase 4d: ExprNode-first for reactive dep extraction
            const exprStr = child.exprNode ? emitStringFromTree(child.exprNode) : child.expr;
            const reactiveRefs = fnBodyRegistry
              ? extractReactiveDepsTransitive(exprStr, reactiveVarNames, fnBodyRegistry)
              : extractReactiveDeps(exprStr, reactiveVarNames);
            registry.addLogicBinding({ placeholderId, expr: exprStr, exprNode: child.exprNode, reactiveRefs });
          }
        }
      }
      return;
    }

    if (node.kind === "meta") {
      if (node.id != null) {
        const metaScopeId = `_scrml_meta_${node.id}`;
        parts.push(`<span data-scrml-meta="${metaScopeId}"></span>`);
      }
      return;
    }
  }

  for (const node of nodes) {
    emitNode(node);
  }

  return parts.join("");
}
