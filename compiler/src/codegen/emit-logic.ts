import { genVar } from "./var-counter.ts";
import { rewriteExpr, rewriteExprWithDerived, extractSqlParams, rewriteTildeRef } from "./rewrite.js";
import { emitExpr, type EmitExprContext } from "./emit-expr.ts";
import { stripLeakedComments, isLeakedComment, splitBareExprStatements, splitMergedStatements } from "./compat/parser-workarounds.js";
import { emitIfStmt, emitForStmt, emitWhileStmt, emitDoWhileStmt, emitBreakStmt, emitContinueStmt, emitTryStmt, emitMatchExpr, emitSwitchStmt, rewriteBlockBody } from "./emit-control-flow.ts";
import { emitLiftExpr } from "./emit-lift.js";
import { extractReactiveDeps } from "./reactive-deps.ts";
import type { EncodingContext } from "./type-encoding.ts";
import { emitRuntimeCheck } from "./emit-predicates.ts";

// ---------------------------------------------------------------------------
// Deep reactive wrapping helper (Reactivity Phase 1)
// ---------------------------------------------------------------------------

/**
 * Wrap a rewritten expression with _scrml_deep_reactive() if the original
 * expression looks like it produces an object or array literal.
 *
 * Heuristic: wrap when the raw (pre-rewrite) expression starts with `{`, `[`,
 * `new `, or is a common object-producing pattern. For all other cases, the
 * runtime _scrml_deep_reactive is a no-op on primitives, so wrapping is safe
 * but we avoid it for readability.
 */
function _wrapDeepReactive(rewrittenExpr: string, rawExpr: string): string {
  const trimmed = rawExpr.trim();
  if (
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith("new ") ||
    trimmed.startsWith("Array") ||
    trimmed.startsWith("Object")
  ) {
    return `_scrml_deep_reactive(${rewrittenExpr})`;
  }
  return rewrittenExpr;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmitLogicOpts {
  derivedNames?: Set<string> | null;
  encodingCtx?: EncodingContext | null;
  /** §4.12.6: Override DB variable for nested <program db="..."> scopes. */
  dbVar?: string;
  /**
   * §32 Tilde pipeline accumulator context.
   * When set, bare-expr and value-lift nodes assign their result to this variable.
   * The `var` field is mutated by emitLogicNode to reflect the current tilde var name.
   */
  /**
   * §32 tilde mode: "single" (default) assigns once; "array" accumulates push calls
   * into an array declared before the enclosing loop (list comprehension pattern).
   */
  tildeContext?: { var: string | null; mode?: "single" | "array" };
  /**
   * When set to "return", `continue-stmt` nodes emit `return;` instead of `continue;`.
   * Used in reactive-for createItem functions where `continue` is illegal JS.
   */
  continueBehavior?: "continue" | "return";
  /** Track names declared by let-decl/const-decl so tilde-decl can detect reassignment. */
  declaredNames?: Set<string>;
  /** §51.5: Machine binding map for transition guard emission. Keyed by reactive var name. */
  machineBindings?: Map<string, { machineName: string; tableName: string; rules: any[] }> | null;
}

/** An entry in the captured scope for a runtime ^{} meta block (from meta-checker.ts). */
interface ScopeVarEntry {
  name: string;
  kind: "reactive" | "let" | "const" | "function";
}

/** A serialized type entry from the runtime type registry (from meta-checker.ts). */
interface TypeRegistryEntry {
  name: string;
  kind: string;
  [key: string]: unknown;
}

interface LogicArm {
  pattern?: string;
  binding?: string;
  handler?: string;
}

// ---------------------------------------------------------------------------
// Helper: emit a guarded-expr arm body
// ---------------------------------------------------------------------------

function emitArmBody(arm: LogicArm, errVar: string, machineBindings?: Map<string, { machineName: string; tableName: string; rules: any[] }> | null): string {
  const handler = (arm.handler ?? "").trim();
  if (!handler) return "";
  // Block bodies `{ @var = expr; ... }` must go through rewriteBlockBody so that
  // reactive assignments (@var = expr) are emitted as _scrml_reactive_set() calls
  // rather than _scrml_reactive_get() on the left side of =.
  // When machineBindings is provided, machine-bound assignments emit transition guards (§51.5).
  if (handler.startsWith("{") && handler.endsWith("}")) {
    const inner = handler.slice(1, -1).trim();
    return inner ? rewriteBlockBody(inner, machineBindings ?? null) : "";
  }
  const rewritten = rewriteExpr(handler);
  return rewritten.trim().endsWith(";") ? rewritten.trim() : rewritten.trim() + ";";
}

// ---------------------------------------------------------------------------
// Helpers for 4-argument _scrml_meta_effect emission (§22.5)
// ---------------------------------------------------------------------------

/**
 * Emit the capturedBindings argument for _scrml_meta_effect.
 * Reads node.capturedScope (set by meta-checker.ts).
 * Returns "null" if no scope data is available.
 *
 * @var entries produce getter functions (live reactive reads).
 * let/const/function entries produce direct value references.
 */
function emitCapturedBindings(node: any): string {
  const scope: ScopeVarEntry[] | undefined = node.capturedScope;
  if (!Array.isArray(scope) || scope.length === 0) return "null";

  const props: string[] = [];
  for (const entry of scope) {
    const { name, kind } = entry;
    if (!name || typeof name !== "string") continue;
    if (kind === "reactive") {
      // Getter returns live reactive value; auto-tracking intercepts the read
      props.push(`  get ${name}() { return _scrml_reactive_get("${name}"); }`);
    } else {
      // let/const/function — direct reference to the compiled JS variable
      props.push(`  ${name}: ${name}`);
    }
  }

  if (props.length === 0) return "null";
  return ["Object.freeze({", ...props, "})"].join("\n");
}

/**
 * Emit the typeRegistry argument for _scrml_meta_effect.
 * Reads node.typeRegistrySnapshot (set by meta-checker.ts).
 * Returns "null" if no type data is available.
 *
 * The emitted object maps type names to reflection entries.
 * meta.types.reflect(name) uses this object for runtime type introspection.
 */
function emitTypeRegistryLiteral(node: any): string {
  const entries: TypeRegistryEntry[] | undefined = node.typeRegistrySnapshot;
  if (!Array.isArray(entries) || entries.length === 0) return "null";

  const typeProps: string[] = [];
  for (const entry of entries) {
    if (!entry.name || typeof entry.name !== "string") continue;
    const typeData = serializeTypeEntry(entry);
    typeProps.push(`  ${JSON.stringify(entry.name)}: ${typeData}`);
  }

  if (typeProps.length === 0) return "null";
  return ["({", ...typeProps, "})"].join("\n");
}

/**
 * Serialize a single TypeRegistryEntry to a JavaScript object literal string.
 */
function serializeTypeEntry(entry: TypeRegistryEntry): string {
  const parts: string[] = [`kind: ${JSON.stringify(entry.kind)}`];

  if (entry.kind === "enum") {
    const variants = (entry.variants as Array<{ name: string }> | undefined) ?? [];
    const variantStrings = variants.map(v =>
      `{name: ${JSON.stringify(v.name)}}`
    );
    parts.push(`variants: [${variantStrings.join(", ")}]`);
  } else if (entry.kind === "struct") {
    const fields = (entry.fields as Array<{ name: string; type: string }> | undefined) ?? [];
    const fieldStrings = fields.map(f =>
      `{name: ${JSON.stringify(f.name)}, type: ${JSON.stringify(f.type)}}`
    );
    parts.push(`fields: [${fieldStrings.join(", ")}]`);
  } else if (entry.kind === "state") {
    const attrs = (entry.attributes as Array<{ name: string; type: string }> | undefined) ?? [];
    const attrStrings = attrs.map(a =>
      `{name: ${JSON.stringify(a.name)}, type: ${JSON.stringify(a.type)}}`
    );
    parts.push(`attributes: [${attrStrings.join(", ")}]`);
  }

  return `{${parts.join(", ")}}`;
}


// ---------------------------------------------------------------------------
// §22.4.2 reflect() rewrite for runtime meta blocks
//
// - PascalCase identifiers (type names) are quoted: meta.types.reflect("TypeName")
// - camelCase/@var identifiers (variables) are left unquoted: meta.types.reflect(variable)
// - Already-quoted strings are left as-is: meta.types.reflect("already")
// ---------------------------------------------------------------------------

const REFLECT_CALL_RE = /\breflect\s*\(\s*([^)]*)\s*\)/g;

export function rewriteReflectForRuntime(code: string): string {
  if (!code || typeof code !== "string") return code;
  return code.replace(REFLECT_CALL_RE, (_match, arg) => {
    const trimmed = (arg || "").trim();
    if (!trimmed) return `meta.types.reflect(${trimmed})`;
    // Already a string literal — pass through
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return `meta.types.reflect(${trimmed})`;
    }
    // Bare identifier — check if PascalCase (type name) or variable
    if (/^[A-Z][A-Za-z0-9_$]*$/.test(trimmed)) {
      // PascalCase type name → quote it
      return `meta.types.reflect("${trimmed}")`;
    }
    // camelCase, @var, or complex expression — leave as-is
    return `meta.types.reflect(${trimmed})`;
  });
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Build an EmitExprContext from the current EmitLogicOpts.
 * Used at dual-path call sites: node.initExpr ? emitExpr(node.initExpr, exprCtx) : rewriteExpr(...)
 */
function _makeExprCtx(opts: EmitLogicOpts): EmitExprContext {
  return {
    mode: "client",
    derivedNames: opts.derivedNames ?? null,
    tildeVar: opts.tildeContext?.var ?? null,
    dbVar: opts.dbVar,
  };
}

export function emitLogicNode(node: any, opts: EmitLogicOpts = {}): string {
  if (!node || typeof node !== "object") return "";

  // §4.12.6: Inherit dbVar from node annotation if not already set in opts
  if (!opts.dbVar && node._dbVar) {
    opts = { ...opts, dbVar: node._dbVar };
  }

  const derivedNames: Set<string> | null = opts.derivedNames ?? null;

  switch (node.kind) {
    case "bare-expr": {
      // Phase 3 fast path: when exprNode is present, skip all string heuristics
      if (node.exprNode) {
        if (opts.tildeContext) {
          const tVar = genVar("tilde");
          opts.tildeContext.var = tVar;
          return `let ${tVar} = ${emitExpr(node.exprNode, _makeExprCtx(opts))};`;
        }
        return `${emitExpr(node.exprNode, _makeExprCtx(opts))};`;
      }
      let bareExpr: string = node.expr ?? "";
      if (bareExpr.trim() === "/" || bareExpr.trim() === "") return "";
      // Skip slot spread placeholder — CE replaces ${...} slots with children; if any survive
      // to codegen (e.g. component with no caller, or CE expansion failed), drop them silently.
      if (bareExpr.trim() === "...") return "";
      // Skip leaked HTML tag fragments (e.g. `/ < / button >`, `/ < span`, `< / div >`).
      // These arise when scrml closers and HTML tags leak through to JS output.
      if (/^\/?\s*<\s*\/?\s*[a-zA-Z]/.test(bareExpr.trim())) return "";

      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(bareExpr.trim())) return "";

      bareExpr = stripLeakedComments(bareExpr);

      // §42 Presence guard: `( identifier ) => { body }` → `if (x !== null && x !== undefined) { body }`
      // Detect before rewriteExpr to avoid appending a trailing semicolon to the if-block.
      const presenceGuardMatch = bareExpr.trim().match(/^\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)\s*=>\s*\{([\s\S]*)\}\s*$/);
      if (presenceGuardMatch) {
        const varName = presenceGuardMatch[1];
        const body = presenceGuardMatch[2];
        // Rewrite the body contents through the normal pipeline
        const rewrittenBody = rewriteExpr(body.trim());
        return `if (${varName} !== null && ${varName} !== undefined) {\n  ${rewrittenBody}\n}`;
      }

      const destructMatch = bareExpr.trim().match(/^\{\s*([a-zA-Z_$][\w$]*(?:\s*,\s*[a-zA-Z_$][\w$]*)*)\s*\}\s*=\s*([\s\S]+)$/);
      if (destructMatch) {
        const vars = destructMatch[1];
        const init = destructMatch[2].trim();
        const initSplit = splitBareExprStatements(init);
        if (initSplit.length > 1) {
          const lines: string[] = [`const { ${vars} } = ${rewriteExpr(initSplit[0].trim())};`];
          for (let i = 1; i < initSplit.length; i++) {
            const s = initSplit[i].trim();
            if (s) lines.push(`${rewriteExpr(s)};`);
          }
          return lines.filter((l: string) => l !== ";").join("\n");
        }
        return `const { ${vars} } = ${rewriteExpr(init)};`;
      }

      const splitStmts = splitBareExprStatements(bareExpr);
      if (splitStmts.length > 1) {
        return splitStmts
          .map((s: string) => s.trim())
          .filter((s: string) => s && !isLeakedComment(s))
          .map((s: string) => `${rewriteExpr(s)};`)
          .filter((s: string) => s !== ";")
          .join("\n");
      }
      const trimmed = bareExpr.trim();
      if (isLeakedComment(trimmed)) return `// ${trimmed}`;
      // §32: If a tilde context is active, this bare-expr initializes the tilde variable.
      // Emit as `let _scrml_tilde_N = <expr>;` so `~` in subsequent nodes can reference it.
      if (opts.tildeContext) {
        const tVar = genVar("tilde");
        opts.tildeContext.var = tVar;
        return `let ${tVar} = ${rewriteExpr(bareExpr)};`;
      }
      return `${rewriteExpr(bareExpr)};`;
    }

    case "let-decl": {
      if (node.name && opts.declaredNames) opts.declaredNames.add(node.name);
      // If-as-expression: `let a = if (cond) { lift val }`
      if (node.ifExpr) {
        return emitIfExprDecl(node.name, node.ifExpr, "let", opts);
      }
      // For-as-expression: `let names = for (item of items) { lift item.name }`
      if (node.forExpr) {
        return emitForExprDecl(node.name, node.forExpr, "let", opts);
      }
      // Phase 3 fast path: when initExpr is present, skip all string splitting/merging
      if (node.initExpr) {
        const rhs = emitExpr(node.initExpr, _makeExprCtx(opts));
        if (node.predicateCheck && node.predicateCheck.zone === "boundary") {
          const _pc = node.predicateCheck;
          const _checkTmpVar = genVar(`_scrml_chk_${node.name}`);
          const _checkLines = emitRuntimeCheck(_pc.predicate, _checkTmpVar, node.name, _pc.label ?? null);
          return [
            `const ${_checkTmpVar} = ${rhs};`,
            ..._checkLines,
            `let ${node.name} = ${_checkTmpVar};`,
          ].join("\n");
        }
        return `let ${node.name} = ${rhs};`;
      }
      let letInit: string = node.init ?? "";
      // §32: If tilde context is active and init contains `~`, substitute the tilde var.
      if (opts.tildeContext?.var && letInit.includes("~")) {
        letInit = rewriteTildeRef(letInit, opts.tildeContext.var);
        opts.tildeContext.var = null;
      }
      if (typeof letInit === "string" && /@[A-Za-z_$][A-Za-z0-9_$]*\s*=/.test(letInit)) {
        return splitMergedStatements(node.name, letInit, "let");
      }
      if (typeof letInit === "string" && letInit.trim()) {
        const letSplit = splitBareExprStatements(letInit);
        if (letSplit.length > 1) {
          const lines: string[] = [`let ${node.name} = ${rewriteExpr(letSplit[0].trim())};`];
          for (let i = 1; i < letSplit.length; i++) {
            const s = letSplit[i].trim();
            if (s) lines.push(`${rewriteExpr(s)};`);
          }
          return lines.filter((l: string) => l !== ";").join("\n");
        }
      }
      // §53.4.5: If TS annotated this node as boundary zone, emit runtime check first.
      if (node.predicateCheck && node.predicateCheck.zone === "boundary" && letInit) {
        const _pc = node.predicateCheck;
        const _checkTmpVar = genVar(`_scrml_chk_${node.name}`);
        const _rewrittenLetInit = rewriteExpr(letInit);
        const _checkLines = emitRuntimeCheck(_pc.predicate, _checkTmpVar, node.name, _pc.label ?? null);
        return [
          `const ${_checkTmpVar} = ${_rewrittenLetInit};`,
          ..._checkLines,
          `let ${node.name} = ${_checkTmpVar};`,
        ].join("\n");
      }
      if (letInit) {
        return `let ${node.name} = ${rewriteExpr(letInit)};`;
      }
      return `let ${node.name};`;
    }

    case "const-decl":
    case "tilde-decl": {
      if (!node.name) return "";
      // For tilde-decl: if name was already declared by let-decl, emit as reassignment
      if (node.kind === "tilde-decl" && opts.declaredNames?.has(node.name)) {
        const init = node.init ?? "";
        const tildeRhs = node.initExpr ? emitExpr(node.initExpr, _makeExprCtx(opts)) : rewriteExpr(init);
        return `${node.name} = ${tildeRhs};`;
      }
      if (node.kind === "const-decl" && node.name && opts.declaredNames) opts.declaredNames.add(node.name);
      // If-as-expression: `const a = if (cond) { lift val }`
      if (node.ifExpr) {
        return emitIfExprDecl(node.name, node.ifExpr, "const", opts);
      }
      // For-as-expression: `const names = for (item of items) { lift item.name }`
      if (node.forExpr) {
        return emitForExprDecl(node.name, node.forExpr, "const", opts);
      }
      // Phase 3 fast path: when initExpr is present, skip all string splitting/merging
      if (node.initExpr) {
        return `const ${node.name} = ${emitExpr(node.initExpr, _makeExprCtx(opts))};`;
      }
      let constInit: string = node.init ?? "";
      // §32: If tilde context is active and init contains `~`, substitute the tilde var.
      if (opts.tildeContext?.var && constInit.includes("~")) {
        constInit = rewriteTildeRef(constInit, opts.tildeContext.var);
        // Consuming ~ resets the tilde context (lin: exactly once).
        opts.tildeContext.var = null;
      }
      if (typeof constInit === "string" && /@[A-Za-z_$][A-Za-z0-9_$]*\s*=/.test(constInit)) {
        return splitMergedStatements(node.name, constInit, "const");
      }
      // If init references the same name, this is a reassignment (e.g. `cmd = cmd + " " + x`),
      // not a new declaration. Emit as bare assignment instead of const.
      const isSelfRef = constInit && new RegExp(`\\b${node.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(constInit);
      if (isSelfRef) {
        return `${node.name} = ${rewriteExpr(constInit)};`;
      }
      if (typeof constInit === "string" && constInit.trim()) {
        const constSplit = splitBareExprStatements(constInit);
        if (constSplit.length > 1) {
          const lines: string[] = [`const ${node.name} = ${rewriteExpr(constSplit[0].trim())};`];
          for (let i = 1; i < constSplit.length; i++) {
            const s = constSplit[i].trim();
            if (s) lines.push(`${rewriteExpr(s)};`);
          }
          return lines.filter((l: string) => l !== ";").join("\n");
        }
      }
      if (constInit) {
        const rhs = node.initExpr ? emitExpr(node.initExpr, _makeExprCtx(opts)) : rewriteExpr(constInit);
        return `const ${node.name} = ${rhs};`;
      }
      return `const ${node.name};`;
    }

    case "reactive-decl": {
      const initStr: string = node.init ?? "undefined";
      const ctx = opts.encodingCtx;
      const encodedName = ctx ? ctx.encode(node.name) : node.name;
      // Phase 3 fast path: when initExpr is present, skip all string splitting/merging
      if (node.initExpr) {
        const rewrittenInit = emitExpr(node.initExpr, _makeExprCtx(opts));
        const wrappedInit = _wrapDeepReactive(rewrittenInit, initStr);
        if (node.predicateCheck && node.predicateCheck.zone === "boundary" && initStr !== "undefined") {
          const _pc = node.predicateCheck;
          const _checkTmpVar = genVar(`_scrml_chk_${node.name}`);
          const _checkLines = emitRuntimeCheck(_pc.predicate, _checkTmpVar, node.name, _pc.label ?? null);
          return [
            `const ${_checkTmpVar} = ${rewrittenInit};`,
            ..._checkLines,
            `_scrml_reactive_set(${JSON.stringify(encodedName)}, ${_wrapDeepReactive(_checkTmpVar, initStr)});`,
          ].join("\n");
        }
        return `_scrml_reactive_set(${JSON.stringify(encodedName)}, ${wrappedInit});`;
      }
      if (typeof initStr === "string" && /\s+(?:@[A-Za-z_$]|let\s|const\s)/.test(initStr)) {
        return splitMergedStatements(node.name, initStr, "reactive");
      }
      if (typeof initStr === "string" && initStr !== "undefined") {
        const initSplit = splitBareExprStatements(initStr);
        if (initSplit.length > 1) {
          const firstExpr = rewriteExpr(initSplit[0].trim());
          const wrappedFirst = _wrapDeepReactive(firstExpr, initSplit[0].trim());
          const lines: string[] = [`_scrml_reactive_set(${JSON.stringify(encodedName)}, ${wrappedFirst});`];
          for (let i = 1; i < initSplit.length; i++) {
            const s = initSplit[i].trim();
            if (s) lines.push(`${rewriteExpr(s)};`);
          }
          return lines.filter((l: string) => l !== ";").join("\n");
        }
      }
      const rewrittenInit = rewriteExpr(initStr);
      const wrappedInit = _wrapDeepReactive(rewrittenInit, initStr);
      // §53.4.5: If TS annotated this node as boundary zone, emit runtime check first.
      if (node.predicateCheck && node.predicateCheck.zone === "boundary" && initStr !== "undefined") {
        const _pc = node.predicateCheck;
        const _checkTmpVar = genVar(`_scrml_chk_${node.name}`);
        const _checkLines = emitRuntimeCheck(_pc.predicate, _checkTmpVar, node.name, _pc.label ?? null);
        return [
          `const ${_checkTmpVar} = ${rewrittenInit};`,
          ..._checkLines,
          `_scrml_reactive_set(${JSON.stringify(encodedName)}, ${_wrapDeepReactive(_checkTmpVar, initStr)});`,
        ].join("\n");
      }
      return `_scrml_reactive_set(${JSON.stringify(encodedName)}, ${wrappedInit});`;
    }

    case "reactive-derived-decl": {
      // const @name = expr → derived reactive value (§6.6)
      const derivedInit: string = node.init ?? "";
      const reactiveDepsFound = extractReactiveDeps(derivedInit);
      const hasReactiveDeps = reactiveDepsFound.size > 0;

      if (!hasReactiveDeps) {
        const derivedRhs = node.initExpr ? emitExpr(node.initExpr, _makeExprCtx(opts)) : rewriteExpr(derivedInit);
        return `/* W-DERIVED-001: const @${node.name} has no reactive dependencies — treating as const */ const ${node.name} = ${derivedRhs};`;
      }

      const rewrittenBody = node.initExpr
        ? emitExpr(node.initExpr, { ..._makeExprCtx(opts), derivedNames })
        : rewriteExprWithDerived(derivedInit, derivedNames);
      const ctx = opts.encodingCtx;
      const encodedDeclName = ctx ? ctx.encode(node.name) : node.name;

      const lines: string[] = [];
      lines.push(`_scrml_derived_declare(${JSON.stringify(encodedDeclName)}, () => ${rewrittenBody});`);
      for (const dep of reactiveDepsFound) {
        const encodedDep = ctx ? ctx.encode(dep) : dep;
        lines.push(`_scrml_derived_subscribe(${JSON.stringify(encodedDeclName)}, ${JSON.stringify(encodedDep)});`);
      }
      return lines.join("\n");
    }

    case "return-stmt": {
      // Phase 3 fast path: when exprNode is present, skip all string splitting
      if (node.exprNode) {
        return `return ${emitExpr(node.exprNode, _makeExprCtx(opts))};`;
      }
      const retExpr: string = (node.expr ?? node.value ?? "").trim();
      const retSplit = splitBareExprStatements(retExpr);
      if (retSplit.length > 1) {
        const firstTrimmed = retSplit[0].trim();
        const looksLikeStatement = /^[a-zA-Z_$][\w$.]*\s*\.\s*[a-zA-Z_$]/.test(firstTrimmed) ||
                                    /^[a-zA-Z_$][\w$.]*\s*=\s/.test(firstTrimmed);
        if (looksLikeStatement) {
          const stmts = retSplit.map((s: string) => `${rewriteExpr(s.trim())};`).filter((s: string) => s !== ";");
          return `return;\n${stmts.join("\n")}`;
        }
        const remaining = retSplit.slice(1).map((s: string) => `${rewriteExpr(s.trim())};`).filter((s: string) => s !== ";");
        return `return ${rewriteExpr(retSplit[0].trim())};\n${remaining.join("\n")}`;
      }
      return `return ${rewriteExpr(retExpr)};`;
    }

    case "if-stmt":
      // Thread opts when tilde context or continueBehavior is active so nested nodes
      // (e.g. continue-stmt inside if-body inside reactive-for) receive the flags.
      if (opts.tildeContext || opts.continueBehavior) {
        return _emitIfStmtWithOpts(node, opts);
      }
      return emitIfStmt(node);

    case "for-stmt":
      // §32 array accumulator: when tilde context is active, switch to array-mode before
      // emitting the loop body so lift calls push rather than overwrite.
      if (opts.tildeContext) {
        return _emitForStmtWithTilde(node, opts);
      }
      return emitForStmt(node);

    case "while-stmt":
      // §32 array accumulator: same pattern as for-stmt above.
      if (opts.tildeContext) {
        return _emitWhileStmtWithTilde(node, opts);
      }
      return emitWhileStmt(node);

    case "do-while-stmt":
      return emitDoWhileStmt(node);

    case "break-stmt":
      return emitBreakStmt(node);

    case "continue-stmt":
      // In a reactive-for createItem function, `continue` is illegal JS (no surrounding loop).
      // When continueBehavior is "return", emit `return;` to skip the item instead.
      if (opts.continueBehavior === "return") return "return;";
      return emitContinueStmt(node);

    case "lift-expr": {
      const liftE = node.expr;
      // §32 Value-lift: `lift <non-markup-expr>` — if tilde context is active AND the
      // expression does not look like a markup pattern (no leading < tag), treat as
      // a tilde variable assignment rather than a DOM lift.
      if (
        opts.tildeContext &&
        liftE &&
        liftE.kind === "expr" &&
        typeof liftE.expr === "string"
      ) {
        const rawExpr = liftE.expr.trim();
        // Only apply value-lift if the expression does NOT start with a `<` (markup)
        // and does NOT end with `/` (closing tag form)
        if (!rawExpr.startsWith("<") && !rawExpr.endsWith("/")) {
          const liftRhs = liftE.exprNode ? emitExpr(liftE.exprNode, _makeExprCtx(opts)) : rewriteExpr(rawExpr);
          if (opts.tildeContext.mode === "array" && opts.tildeContext.var) {
            // Array accumulator mode — push onto existing array variable.
            return `${opts.tildeContext.var}.push(${liftRhs});`;
          }
          if (opts.tildeContext.var) {
            // Tilde var already pre-declared (if-as-expression) — reassign, don't redeclare.
            return `${opts.tildeContext.var} = ${liftRhs};`;
          }
          const tVar = genVar("tilde");
          opts.tildeContext.var = tVar;
          return `let ${tVar} = ${liftRhs};`;
        }
      }
      return emitLiftExpr(node);
    }

    case "sql": {
      const rawQuery: string = node.query ?? node.body ?? "";
      const calls: any[] = node.chainedCalls ?? [];
      const { sql, params } = extractSqlParams(rawQuery);
      const db = opts.dbVar ?? "_scrml_db";
      if (calls.length > 0) {
        const call = calls[0];
        // Build argList: prefer params extracted from SQL ${} interpolations.
        // Fall back to call.args (explicit .run(@var) / .all(@var) args) when the
        // SQL uses bare ? placeholders and the dev passes params at call site.
        let argList: string;
        if (params.length > 0) {
          argList = params.map((p: string) => rewriteExpr(p)).join(", ");
        } else if (call.args && call.args.trim()) {
          argList = rewriteExpr(call.args.trim());
        } else {
          argList = "";
        }
        return `${db}.query(${JSON.stringify(sql)}).${call.method}(${argList});`;
      }
      if (params.length > 0) {
        const argList = params.map((p: string) => rewriteExpr(p)).join(", ");
        return `${db}.query(${JSON.stringify(sql)}).run(${argList});`;
      }
      return `_scrml_sql_exec(${JSON.stringify(rawQuery)});`;
    }

    case "fail-expr": {
      const enumType: string = node.enumType ?? "";
      const variant: string = node.variant ?? "";
      const args = node.argsExpr ? emitExpr(node.argsExpr, _makeExprCtx(opts)) : (node.args ? rewriteExpr(node.args) : "undefined");
      return `return { __scrml_error: true, type: ${JSON.stringify(enumType)}, variant: ${JSON.stringify(variant)}, data: ${args} };`;
    }

    case "propagate-expr": {
      const tmpVar = genVar("_scrml_tmp");
      const expr = node.exprNode ? emitExpr(node.exprNode, _makeExprCtx(opts)) : rewriteExpr(node.expr ?? "");
      const lines: string[] = [];
      lines.push(`const ${tmpVar} = ${expr};`);
      lines.push(`if (${tmpVar}.__scrml_error) return ${tmpVar};`);
      if (node.binding) {
        lines.push(`const ${node.binding} = ${tmpVar};`);
      }
      return lines.join("\n");
    }

    case "throw-stmt": {
      const throwExpr = node.exprNode ? emitExpr(node.exprNode, _makeExprCtx(opts)) : rewriteExpr(node.expr ?? "");
      const cleaned = throwExpr.trim();
      const needsNew = /^[A-Z][A-Za-z0-9_]*\s*\(/.test(cleaned) && !cleaned.startsWith("new ");
      return needsNew ? `throw new ${cleaned};` : `throw ${cleaned};`;
    }

    case "given-guard": {
      // §42.2.3 Presence guard: `given x => { body }` or `given x, y => { body }`
      // Emits: if (x !== null && x !== undefined) { body }
      // Multi-variable: if (x !== null && x !== undefined && y !== null && y !== undefined) { body }
      const vars: string[] = node.variables ?? [];
      const body: object[] = node.body ?? [];
      if (vars.length === 0) return "";

      const conditions = vars
        .map((v: string) => `${v} !== null && ${v} !== undefined`)
        .join(" && ");

      const lines: string[] = [`if (${conditions}) {`];
      for (const stmt of body) {
        const code = emitLogicNode(stmt as Parameters<typeof emitLogicNode>[0], opts);
        if (code) {
          for (const line of code.split("\n")) lines.push(`  ${line}`);
        }
      }
      lines.push(`}`);
      return lines.join("\n");
    }

    case "error-effect": {
      // Standalone `!{ tryBody } catch Type [as binding] { handler }` form
      const arms: LogicArm[] = node.arms ?? [];
      const tryBody: object[] = (node as Record<string, unknown>).body as object[] ?? [];
      const errVar = genVar("_scrml_err");
      const lines: string[] = [];

      lines.push(`try {`);
      for (const bodyNode of tryBody) {
        const code = emitLogicNode(bodyNode as Parameters<typeof emitLogicNode>[0]);
        if (code) {
          for (const line of code.split("\n")) lines.push(`  ${line}`);
        }
      }
      lines.push(`} catch (${errVar}) {`);

      if (arms.length > 0) {
        let isFirst = true;
        for (const arm of arms) {
          if (arm.pattern === "_") {
            lines.push(`  ${isFirst ? "" : "else "}{`);
            if (arm.binding && arm.binding !== "_") {
              lines.push(`    const ${arm.binding} = ${errVar};`);
            }
            const armCode = emitArmBody(arm, errVar, opts.machineBindings ?? null);
            for (const line of armCode.split("\n")) lines.push(`    ${line}`);
            lines.push(`  }`);
          } else {
            const typeName = arm.pattern ?? "";
            const cond = `${errVar} instanceof ${typeName} || (${errVar} && ${errVar}.type === ${JSON.stringify(typeName)})`;
            lines.push(`  ${isFirst ? "if" : "else if"} (${cond}) {`);
            if (arm.binding && arm.binding !== "_") {
              lines.push(`    const ${arm.binding} = ${errVar};`);
            }
            const armCode = emitArmBody(arm, errVar, opts.machineBindings ?? null);
            for (const line of armCode.split("\n")) lines.push(`    ${line}`);
            lines.push(`  }`);
          }
          isFirst = false;
        }
      } else {
        lines.push(`  throw ${errVar};`);
      }
      lines.push(`}`);
      return lines.join("\n");
    }

    case "guarded-expr": {
      const guardedNode = node.guardedNode;
      const arms: LogicArm[] = node.arms ?? [];
      const lines: string[] = [];
      const errVar = genVar("_scrml_err");
      const resultVar = genVar("_scrml_result");

      lines.push(`let ${resultVar};`);
      lines.push(`try {`);

      if (guardedNode) {
        if (guardedNode.kind === "let-decl" && guardedNode.name) {
          const initExpr = guardedNode.initExpr ? emitExpr(guardedNode.initExpr, _makeExprCtx(opts)) : rewriteExpr(guardedNode.init ?? "undefined");
          lines.push(`  ${resultVar} = ${initExpr};`);
          lines.push(`  var ${guardedNode.name} = ${resultVar};`);
        } else if ((guardedNode.kind === "const-decl" || guardedNode.kind === "tilde-decl") && guardedNode.name) {
          const initExpr = guardedNode.initExpr ? emitExpr(guardedNode.initExpr, _makeExprCtx(opts)) : rewriteExpr(guardedNode.init ?? "undefined");
          lines.push(`  ${resultVar} = ${initExpr};`);
          lines.push(`  var ${guardedNode.name} = ${resultVar};`);
        } else {
          const bodyCode = emitLogicNode(guardedNode);
          if (bodyCode) {
            for (const line of bodyCode.split("\n")) {
              lines.push(`  ${line}`);
            }
          }
        }
      }

      lines.push(`} catch (${errVar}) {`);

      if (arms.length > 0) {
        const hasWildcard = arms.some((a: LogicArm) => a.pattern === "_");
        let isFirst = true;
        for (const arm of arms) {
          if (arm.pattern === "_") {
            const armCode = emitArmBody(arm, errVar, opts.machineBindings ?? null);
            lines.push(`  ${isFirst ? "" : "else "}{`);
            if (arm.binding && arm.binding !== "_") {
              lines.push(`    const ${arm.binding} = ${errVar};`);
            }
            for (const line of armCode.split("\n")) {
              lines.push(`    ${line}`);
            }
            lines.push(`  }`);
          } else {
            const typeName = (arm.pattern ?? "").replace(/^::/, "");
            const cond = `${errVar} instanceof ${typeName} || (${errVar} && ${errVar}.type === ${JSON.stringify(typeName)})`;
            lines.push(`  ${isFirst ? "if" : "else if"} (${cond}) {`);
            if (arm.binding && arm.binding !== "_") {
              lines.push(`    const ${arm.binding} = ${errVar};`);
            }
            const armCode = emitArmBody(arm, errVar, opts.machineBindings ?? null);
            for (const line of armCode.split("\n")) {
              lines.push(`    ${line}`);
            }
            lines.push(`  }`);
          }
          isFirst = false;
        }
        if (!hasWildcard) {
          lines.push(`  else { throw ${errVar}; }`);
        }
      } else {
        lines.push(`  throw ${errVar};`);
      }

      lines.push(`}`);
      return lines.join("\n");
    }

    case "cleanup-registration": {
      const callback: string = node.callback ?? "() => {}";
      const cleanupRhs = node.callbackExpr ? emitExpr(node.callbackExpr, _makeExprCtx(opts)) : rewriteExpr(callback);
      return `_scrml_register_cleanup(${cleanupRhs});`;
    }

    case "when-effect": {
      // Filter out leaked comment lines (// stripped by tokenizer, leaving bare text)
      const rawLines = (node.bodyRaw ?? "").split("\n");
      const codeLines = rawLines.filter((line: string) => {
        const t = line.trim();
        if (!t) return false;
        if (/^(?:let|const|var|if|for|while|return|@|function|switch|try|catch|throw)\b/.test(t)) return true;
        if (/^[a-zA-Z_$@][a-zA-Z0-9_$]*\s*[=\(\[.]/.test(t)) return true;
        if (/^[{}\[\]();]/.test(t)) return true;
        return false;
      });
      const body = rewriteExpr(codeLines.join("\n"));
      return `_scrml_effect(function() { ${body}; });`;
    }

    case "when-worker-message": {
      // §4.12.4: `when message from <#name> (binding) { body }` — parent-side worker message listener
      const workerVar = `_scrml_worker_${node.workerName}`;
      const binding = node.binding ?? "data";
      const body = rewriteExpr(node.bodyRaw ?? "");
      return `${workerVar}.onmessage = function(event) { const ${binding} = event.data; ${body}; };`;
    }

    case "when-worker-error": {
      // §4.12.4: `when error from <#name> (binding) { body }` — parent-side worker error listener
      const workerVar = `_scrml_worker_${node.workerName}`;
      const binding = node.binding ?? "e";
      const body = rewriteExpr(node.bodyRaw ?? "");
      return `${workerVar}.onerror = function(${binding}) { ${body}; };`;
    }

    case "upload-call": {
      const file = rewriteExpr(node.file ?? "null");
      const url = rewriteExpr(node.url ?? '""');
      return `_scrml_upload(${file}, ${url});`;
    }

    case "reactive-nested-assign": {
      const ctx = opts.encodingCtx;
      const encodedTarget = ctx ? ctx.encode(node.target) : node.target;
      const target = JSON.stringify(encodedTarget);
      const path = JSON.stringify(node.path ?? []);
      const value = node.valueExpr ? emitExpr(node.valueExpr, _makeExprCtx(opts)) : rewriteExpr(node.value ?? "undefined");
      return `_scrml_reactive_set(${target}, _scrml_deep_set(_scrml_reactive_get(${target}), ${path}, ${value}));`;
    }

    case "reactive-array-mutation": {
      const ctx = opts.encodingCtx;
      const encodedTarget = ctx ? ctx.encode(node.target) : node.target;
      const target = JSON.stringify(encodedTarget);
      const method: string = node.method;
      const args = node.argsExpr ? emitExpr(node.argsExpr, _makeExprCtx(opts)) : rewriteExpr(node.args ?? "");

      // With Proxy-based reactivity, array mutations go through the Proxy traps
      // which automatically notify fine-grained effects. We still call
      // _scrml_reactive_set afterwards to fire coarse-grained subscribers.
      switch (method) {
        case "push":
          return `{ _scrml_reactive_get(${target}).push(${args}); _scrml_reactive_set(${target}, _scrml_reactive_get(${target})); }`;
        case "unshift":
          return `{ _scrml_reactive_get(${target}).unshift(${args}); _scrml_reactive_set(${target}, _scrml_reactive_get(${target})); }`;
        case "pop":
          return `{ _scrml_reactive_get(${target}).pop(); _scrml_reactive_set(${target}, _scrml_reactive_get(${target})); }`;
        case "shift":
          return `{ _scrml_reactive_get(${target}).shift(); _scrml_reactive_set(${target}, _scrml_reactive_get(${target})); }`;
        case "splice":
          return `{ _scrml_reactive_get(${target}).splice(${args}); _scrml_reactive_set(${target}, _scrml_reactive_get(${target})); }`;
        case "sort":
          return `{ _scrml_reactive_get(${target}).sort(${args}); _scrml_reactive_set(${target}, _scrml_reactive_get(${target})); }`;
        case "reverse":
          return `{ _scrml_reactive_get(${target}).reverse(); _scrml_reactive_set(${target}, _scrml_reactive_get(${target})); }`;
        case "fill":
          return `{ _scrml_reactive_get(${target}).fill(${args}); _scrml_reactive_set(${target}, _scrml_reactive_get(${target})); }`;
        default:
          return `_scrml_reactive_set(${target}, _scrml_reactive_get(${target}));`;
      }
    }

    case "reactive-explicit-set": {
      const args = node.argsExpr ? emitExpr(node.argsExpr, _makeExprCtx(opts)) : rewriteExpr(node.args ?? "");
      return `_scrml_reactive_explicit_set(${args});`;
    }

    case "reactive-debounced-decl": {
      const delay: number = node.delay ?? 300;
      const init: string = node.init ?? "undefined";
      const ctx = opts.encodingCtx;
      const encodedName = ctx ? ctx.encode(node.name) : node.name;
      const rewrittenDebouncedInit = node.initExpr ? emitExpr(node.initExpr, _makeExprCtx(opts)) : rewriteExpr(init);
      return `_scrml_reactive_debounced(${JSON.stringify(encodedName)}, () => ${rewrittenDebouncedInit}, ${delay});`;
    }

    case "debounce-call": {
      const fn = node.fnExpr ? emitExpr(node.fnExpr, _makeExprCtx(opts)) : rewriteExpr(node.fn ?? "() => {}");
      const delay: number = node.delay ?? 300;
      return `_scrml_debounce(${fn}, ${delay});`;
    }

    case "throttle-call": {
      const fn = node.fnExpr ? emitExpr(node.fnExpr, _makeExprCtx(opts)) : rewriteExpr(node.fn ?? "() => {}");
      const delay: number = node.delay ?? 100;
      return `_scrml_throttle(${fn}, ${delay});`;
    }

    case "transaction-block": {
      const lines: string[] = [];
      const db = opts.dbVar ?? "_scrml_db";
      lines.push(`${db}.exec("BEGIN");`);
      lines.push(`try {`);
      for (const stmt of (node.body ?? [])) {
        const code = emitLogicNode(stmt, opts);
        if (code) {
          for (const line of code.split("\n")) {
            lines.push(`  ${line}`);
          }
          if (stmt.kind === "fail-expr") {
            const lastIdx = lines.length - 1;
            const lastLine = lines[lastIdx];
            if (lastLine.trimStart().startsWith("return {")) {
              lines[lastIdx] = `  ${db}.exec("ROLLBACK");`;
              lines.push(`  ${lastLine.trim()}`);
            }
          }
        }
      }
      lines.push(`  ${db}.exec("COMMIT");`);
      lines.push(`} catch (_scrml_txn_err) {`);
      lines.push(`  ${db}.exec("ROLLBACK");`);
      lines.push(`  throw _scrml_txn_err;`);
      lines.push(`}`);
      return lines.join("\n");
    }

    case "try-stmt":
      return emitTryStmt(node);

    case "match-stmt":
      return emitMatchExpr(node);

    case "switch-stmt":
      return emitSwitchStmt(node);

    case "meta": {
      const metaBody: any[] | undefined = node.body;
      if (!Array.isArray(metaBody) || metaBody.length === 0) return "";

      const metaScopeId = node.id != null
        ? `"_scrml_meta_${node.id}"`
        : JSON.stringify(genVar("meta_scope"));

      const bodyLines: string[] = [];
      for (const stmt of metaBody) {
        const code = emitLogicNode(stmt);
        if (code) {
          // Rewrite reflect() → meta.types.reflect() in runtime meta bodies.
          // PascalCase type names are quoted; variables are left as-is.
          const rewritten = rewriteReflectForRuntime(code);
          for (const line of rewritten.split("\n")) {
            bodyLines.push(`  ${line}`);
          }
        }
      }

      if (bodyLines.length === 0) return "";

      // §22.5: emit 4-argument form with capturedBindings and typeRegistry
      const capturedBindings = emitCapturedBindings(node);
      const typeRegistryLiteral = emitTypeRegistryLiteral(node);

      return [
        `_scrml_meta_effect(${metaScopeId}, function(meta) {`,
        ...bodyLines,
        `}, ${capturedBindings}, ${typeRegistryLiteral});`
      ].join("\n");
    }

    case "function-decl": {
      const fnName: string = node.name ?? "anon";
      const params: any[] = node.params ?? [];
      // Bug fix: strip :Type annotations from string params (e.g. "mario:Mario" → "mario")
      const paramNames: string[] = params.map((p: any, i: number) =>
        typeof p === "string" ? p.split(":")[0].trim() : (p.name ?? `_scrml_arg_${i}`)
      );
      const generatorStar: string = node.isGenerator ? "*" : "";

      const fnLines: string[] = [];
      fnLines.push(`function${generatorStar} ${fnName}(${paramNames.join(", ")}) {`);

      // Function body has its own scope for declared names
      const fnOpts: EmitLogicOpts = { ...opts, declaredNames: new Set<string>() };
      for (const stmt of (node.body ?? [])) {
        const code = emitLogicNode(stmt, fnOpts);
        if (code) {
          for (const line of code.split("\n")) {
            fnLines.push(`  ${line}`);
          }
        }
      }

      fnLines.push(`}`);
      return fnLines.join("\n");
    }

    case "lin-decl": {
      // §35.2: lin bindings are immutable — emit as `const`.
      if (!node.name) return "";
      const linInit: string = node.init ?? "";
      if (!linInit.trim()) return `const ${node.name};`;
      const linRhs = node.initExpr ? emitExpr(node.initExpr, _makeExprCtx(opts)) : rewriteExpr(linInit);
      return `const ${node.name} = ${linRhs};`;
    }

    default:
      return "";
  }
}



/**
 * Emit an if-stmt, threading EmitLogicOpts through to child nodes.
 * Used when tilde context is active (e.g., inside a for/while loop accumulator)
 * so that nested lift-expr nodes can use the correct .push() form.
 */
function _emitIfStmtWithOpts(node: any, opts: EmitLogicOpts): string {
  const lines: string[] = [];
  const ifCond = node.condExpr ? emitExpr(node.condExpr, _makeExprCtx(opts)) : rewriteExpr(node.condition ?? node.test ?? "true");
  lines.push(`if (${ifCond}) {`);
  for (const child of (node.consequent ?? node.body ?? [])) {
    const code = emitLogicNode(child, opts);
    if (code) {
      for (const line of code.split("\n")) lines.push(`  ${line}`);
    }
  }
  lines.push("}");
  if (node.alternate) {
    const alternate = Array.isArray(node.alternate) ? node.alternate : [node.alternate];
    lines.push("else {");
    for (const child of alternate) {
      const code = emitLogicNode(child, opts);
      if (code) {
        for (const line of code.split("\n")) lines.push(`  ${line}`);
      }
    }
    lines.push("}");
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// §32 loop-aware tilde helpers — for-stmt and while-stmt with array accumulation
// ---------------------------------------------------------------------------

/**
 * Emit a for-stmt when the tilde accumulator is active.
 *
 * For non-reactive, non-C-style for-of loops: initializes the tilde variable as an
 * array before the loop, then emits the loop body with mode="array" so each lift
 * call inside the body appends with .push() instead of overwriting.
 *
 * Falls back to emitForStmt (no tilde modification) for:
 *   - Reactive iterables (@varName) — those use DOM reconciliation, not ~
 *   - C-style for (init; cond; update) loops
 */
function _emitForStmtWithTilde(node: any, opts: EmitLogicOpts): string {
  let iterable: string = node.iterable ?? node.collection ?? "[]";
  let varName: string = node.variable ?? node.name ?? "item";

  if (typeof iterable === "string") {
    // C-style for loop: fall back to plain emitForStmt (tilde not applicable)
    const cStyleMatch = iterable.match(/^\(\s*(.*?)\s*;\s*(.*?)\s*;\s*(.*?)\s*\)$/s);
    if (cStyleMatch) return emitForStmt(node);

    // Reactive @varName iterable: fall back (reactive loops use DOM reconciliation)
    const reactiveMatch = iterable.trim().match(/^@([A-Za-z_$][A-Za-z0-9_$]*)$/);
    if (reactiveMatch) return emitForStmt(node);

    // For-of: parse out varName and iterable from "( [let|const|var] VAR of EXPR )"
    const forOfMatch = iterable.match(/^\(\s*(?:(?:let|const|var)\s+)?(\w+)\s+of\s+(.*)\s*\)$/s);
    if (forOfMatch) {
      if (varName === "item" && forOfMatch[1] !== "item") varName = forOfMatch[1];
      iterable = forOfMatch[2].trim();
    }
  }

  const lines: string[] = [];
  const tildeCtx = opts.tildeContext!;

  // Initialize tilde var as array if not yet initialized
  if (!tildeCtx.var) {
    const tVar = genVar("tilde");
    tildeCtx.var = tVar;
    tildeCtx.mode = "array";
    lines.push(`let ${tVar} = [];`);
  } else if (tildeCtx.mode !== "array") {
    // Entering a loop when mode was "single" — switch to array (rare edge case)
    tildeCtx.mode = "array";
  }

  const rewrittenIterable = node.iterExpr ? emitExpr(node.iterExpr, _makeExprCtx(opts)) : rewriteExpr(iterable);
  lines.push(`for (const ${varName} of ${rewrittenIterable}) {`);

  const body: any[] = node.body ?? [];
  for (const child of body) {
    const code = emitLogicNode(child, opts);
    if (code) {
      for (const line of code.split("\n")) lines.push(`  ${line}`);
    }
  }

  lines.push("}");
  return lines.join("\n");
}

/**
 * Emit a while-stmt when the tilde accumulator is active.
 *
 * Initializes the tilde variable as an array before the loop, then emits the loop
 * body with mode="array" so each lift call appends with .push().
 */
function _emitWhileStmtWithTilde(node: any, opts: EmitLogicOpts): string {
  const lines: string[] = [];
  const tildeCtx = opts.tildeContext!;

  // Initialize tilde var as array if not yet initialized
  if (!tildeCtx.var) {
    const tVar = genVar("tilde");
    tildeCtx.var = tVar;
    tildeCtx.mode = "array";
    lines.push(`let ${tVar} = [];`);
  } else if (tildeCtx.mode !== "array") {
    tildeCtx.mode = "array";
  }

  const condition = node.condExpr ? emitExpr(node.condExpr, _makeExprCtx(opts)) : rewriteExpr(node.condition ?? "true");
  lines.push(`while (${condition}) {`);

  const body: any[] = node.body ?? [];
  for (const child of body) {
    const code = emitLogicNode(child, opts);
    if (code) {
      for (const line of code.split("\n")) lines.push(`  ${line}`);
    }
  }

  lines.push("}");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// emitIfExprDecl — if-as-expression: `const a = if (cond) { lift val }`
// ---------------------------------------------------------------------------

/**
 * Count direct (top-level) lift-expr nodes in an arm body.
 * Used for E-LIFT-002 detection: multiple lift statements on the same
 * linear execution path in a value-lift arm are a compile error (§10).
 */
function countTopLevelLifts(body: any[]): number {
  return body.filter((n: any) => n?.kind === "lift-expr").length;
}

/**
 * Emit the alternate (else/else-if) chain of an if-as-expression inline,
 * handling else-if chains without extra braces per §17.6.8.
 */
function emitIfExprAltChain(alternate: any[], bodyOpts: EmitLogicOpts, lines: string[]): void {
  if (alternate.length === 1 && alternate[0]?.kind === "if-stmt") {
    // else if — emit without extra braces (§17.6.8)
    const nestedIf = alternate[0];
    const nestedCond = nestedIf.condExpr ? emitExpr(nestedIf.condExpr, _makeExprCtx({})) : rewriteExpr((nestedIf.condition ?? "true").trim());
    const nestedConsequent: any[] = nestedIf.consequent ?? [];
    // E-LIFT-002: multiple lifts on same path in a value-lift arm
    if (countTopLevelLifts(nestedConsequent) > 1) {
      lines.push(`/* E-LIFT-002: multiple lift statements on same execution path in value-lift arm */`);
    }
    lines.push(`else if (${nestedCond}) {`);
    for (const stmt of nestedConsequent) {
      const code = emitLogicNode(stmt, bodyOpts);
      if (code) {
        for (const line of code.split("\n")) lines.push(`  ${line}`);
      }
    }
    lines.push(`}`);
    // Continue chaining for further else-if / else
    if (nestedIf.alternate) {
      const nextAlternate: any[] = Array.isArray(nestedIf.alternate) ? nestedIf.alternate : [nestedIf.alternate];
      emitIfExprAltChain(nextAlternate, bodyOpts, lines);
    }
  } else {
    // plain else
    // E-LIFT-002: multiple lifts in else arm
    if (countTopLevelLifts(alternate) > 1) {
      lines.push(`/* E-LIFT-002: multiple lift statements on same execution path in value-lift arm */`);
    }
    lines.push(`else {`);
    for (const stmt of alternate) {
      const code = emitLogicNode(stmt, bodyOpts);
      if (code) {
        for (const line of code.split("\n")) lines.push(`  ${line}`);
      }
    }
    lines.push(`}`);
  }
}

/**
 * Emit an if-as-expression declaration. Pre-declares a tilde variable,
 * emits the if/else body with lift assigning to that variable, then
 * assigns the result to the declared name.
 *
 * §17.6.4: When no arm executes, result is `not` (compiled to null in JS per §42).
 * §17.6.8: Uses variable-assign-in-branches pattern with else-if chain support.
 */
function emitIfExprDecl(name: string, ifExpr: any, keyword: "let" | "const", opts: EmitLogicOpts): string {
  const tildeVar = genVar("tilde");
  const lines: string[] = [];
  // §17.6.4: default is `not` (compiled to null in JS — §42: `not` => null)
  lines.push(`let ${tildeVar} = null;`);

  // Create a tilde context so lift-expr inside the if body assigns to tildeVar
  const tildeCtx = { var: tildeVar, mode: "single" as "single" | "array" };
  const bodyOpts: EmitLogicOpts = { ...opts, tildeContext: tildeCtx };

  // Emit the if condition
  const condition = ifExpr.condExpr ? emitExpr(ifExpr.condExpr, _makeExprCtx(opts)) : rewriteExpr((ifExpr.condition ?? "true").trim());

  // E-LIFT-002: multiple lifts on same linear path in a value-lift arm
  const consequent: any[] = ifExpr.consequent ?? [];
  if (countTopLevelLifts(consequent) > 1) {
    lines.push(`/* E-LIFT-002: multiple lift statements on same execution path in value-lift arm */`);
  }
  lines.push(`if (${condition}) {`);

  for (const stmt of consequent) {
    const code = emitLogicNode(stmt, bodyOpts);
    if (code) {
      for (const line of code.split("\n")) lines.push(`  ${line}`);
    }
  }
  lines.push(`}`);

  // Emit alternate body if present (§17.6.8 — else-if chain optimization)
  if (ifExpr.alternate) {
    const alternate: any[] = Array.isArray(ifExpr.alternate) ? ifExpr.alternate : [ifExpr.alternate];
    emitIfExprAltChain(alternate, bodyOpts, lines);
  }

  lines.push(`${keyword} ${name} = ${tildeVar};`);

  // Propagate tilde var to parent context so `~` after this decl resolves correctly
  if (opts.tildeContext) {
    opts.tildeContext.var = tildeVar;
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// emitForExprDecl — for-as-expression: `const names = for (item of items) { lift item.name }`
// ---------------------------------------------------------------------------

/**
 * Emit a for-as-expression declaration. Pre-declares a tilde variable as an array,
 * emits the for loop body with lift pushing to that array, then assigns the array
 * to the declared name.
 */
function emitForExprDecl(name: string, forExpr: any, keyword: "let" | "const", opts: EmitLogicOpts): string {
  const tildeVar = genVar("tilde");
  const lines: string[] = [];
  lines.push(`let ${tildeVar} = [];`);

  // Create an array-mode tilde context so lift-expr inside the for body uses .push()
  const tildeCtx = { var: tildeVar, mode: "array" as "single" | "array" };
  const bodyOpts: EmitLogicOpts = { ...opts, tildeContext: tildeCtx };

  // Parse iterable and variable from the forExpr node
  let iterable: string = forExpr.iterable ?? forExpr.collection ?? "[]";
  let varName: string = forExpr.variable ?? forExpr.name ?? "item";

  // Handle for-of form stored as "( let x of iterable )" — extract parts
  if (typeof iterable === "string") {
    const forOfMatch = iterable.match(/^\(\s*(?:(?:let|const|var)\s+)?(\w+)\s+of\s+(.*)\s*\)$/s);
    if (forOfMatch) {
      if (varName === "item" && forOfMatch[1] !== "item") varName = forOfMatch[1];
      iterable = forOfMatch[2].trim();
    }
  }

  const rewrittenIterable = forExpr.iterExpr ? emitExpr(forExpr.iterExpr, _makeExprCtx(opts)) : rewriteExpr(iterable);
  lines.push(`for (const ${varName} of ${rewrittenIterable}) {`);

  const body: any[] = forExpr.body ?? [];
  for (const stmt of body) {
    const code = emitLogicNode(stmt, bodyOpts);
    if (code) {
      for (const line of code.split("\n")) lines.push(`  ${line}`);
    }
  }
  lines.push("}");

  lines.push(`${keyword} ${name} = ${tildeVar};`);

  // Propagate tilde var to parent context so `~` after this decl resolves correctly
  if (opts.tildeContext) {
    opts.tildeContext.var = tildeVar;
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// emitLogicBody — sequence emission with §32 tilde tracking
// ---------------------------------------------------------------------------

/**
 * Emit a sequence of logic nodes with tilde pipeline accumulator tracking (§32).
 *
 * Pre-scans the node list to detect whether `~` is referenced anywhere in the
 * sequence. If so, enables tilde context and passes it through each emitLogicNode
 * call so that:
 *   - `bare-expr` nodes emit `let _scrml_tilde_N = <expr>;`
 *   - value-lift nodes (`lift <non-markup-expr>`) emit `let _scrml_tilde_N = <expr>;`
 *   - `const-decl` / `tilde-decl` nodes with `~` in their init substitute the tilde var
 *
 * When `~` is not referenced in the sequence, falls back to plain emitLogicNode calls
 * (preserving existing behavior and avoiding unnecessary tilde variable declarations).
 *
 * @param nodes - array of AST nodes in a logic body
 * @param opts  - emit options (derivedNames, encodingCtx, dbVar)
 * @returns array of emitted code strings (one per non-empty node)
 */
export function emitLogicBody(nodes: any[], opts: EmitLogicOpts = {}): string[] {
  if (!Array.isArray(nodes) || nodes.length === 0) return [];

  // Track declared names so tilde-decl can distinguish first declaration from reassignment.
  const declaredNames = opts.declaredNames ?? new Set<string>();

  // Pre-scan: does `~` appear in any expression in this sequence?
  const tildeUsed = nodeListContainsTildeRef(nodes);

  if (!tildeUsed) {
    // No tilde references — use plain emission (no overhead, no behavior change)
    return nodes
      .map((n: any) => emitLogicNode(n, { ...opts, declaredNames }))
      .filter((s: string) => s.trim() !== "");
  }

  // Tilde context: a shared mutable object threaded through each emitLogicNode call.
  // `var` holds the current tilde variable name (null = no active tilde).
  const tildeCtx: { var: string | null; mode?: "single" | "array" } = { var: null };
  const optsWithTilde: EmitLogicOpts = { ...opts, tildeContext: tildeCtx, declaredNames };

  return nodes
    .map((n: any) => emitLogicNode(n, optsWithTilde))
    .filter((s: string) => s.trim() !== "");
}

/**
 * Return true if any node (or descendant) in the list contains a `~` reference.
 * Used by emitLogicBody to decide whether tilde tracking is needed.
 */
function nodeListContainsTildeRef(nodes: any[]): boolean {
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    if (nodeContainsTildeRef(node)) return true;
  }
  return false;
}

function nodeContainsTildeRef(node: any): boolean {
  if (!node || typeof node !== "object") return false;
  // Check string fields that hold expressions
  for (const field of ["expr", "init", "value"]) {
    const val = node[field];
    if (typeof val === "string" && hasTildeToken(val)) return true;
    // lift-expr has expr.expr for the inner expression string
    if (field === "expr" && val && typeof val === "object" && typeof val.expr === "string") {
      if (hasTildeToken(val.expr)) return true;
    }
  }
  // Recurse into body arrays
  if (Array.isArray(node.body) && nodeListContainsTildeRef(node.body)) return true;
  if (Array.isArray(node.children) && nodeListContainsTildeRef(node.children)) return true;
  return false;
}

/**
 * Return true if the string contains a standalone `~` (not preceded/followed by word chars).
 */
function hasTildeToken(s: string): boolean {
  return /(?<![A-Za-z0-9_$])~(?![A-Za-z0-9_$])/.test(s);
}
