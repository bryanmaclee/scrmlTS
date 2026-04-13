import { genVar } from "./var-counter.ts";
import { rewriteExpr } from "./rewrite.js";
import { emitExpr, emitExprField, type EmitExprContext } from "./emit-expr.ts";
import { emitLogicNode, emitLogicBody } from "./emit-logic.js";
import { hasFragmentedLiftBody, emitConsolidatedLift, emitLiftExpr } from "./emit-lift.js";
import { emitTransitionGuard } from "./emit-machines.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IfOpts {
  derivedNames?: Set<string>;
}

// §51.5 — Machine binding info for transition guard emission in rewriteBlockBody
interface MachineBindingInfo {
  machineName: string;
  tableName: string;
  rules: Array<{ from: string; to: string; guard: string | null; label: string | null; effectBody: string | null }>;
}

// ---------------------------------------------------------------------------
// if / else
// ---------------------------------------------------------------------------

/**
 * Emit an if statement.
 */
export function emitIfStmt(node: any, opts: IfOpts = {}): string {
  const lines: string[] = [];
  const _ifExprCtx: EmitExprContext = { mode: "client", derivedNames: opts.derivedNames ?? null };
  const _ifCond = emitExprField(node.condExpr, node.condition ?? node.test ?? "true", _ifExprCtx);
  lines.push(`if (${_ifCond}) {`);

  const consequent: any[] = node.consequent ?? node.body ?? [];

  if (hasFragmentedLiftBody(consequent)) {
    const liftCode = emitConsolidatedLift(consequent);
    if (liftCode) lines.push(`  ${liftCode}`);
  } else {
    for (const code of emitLogicBody(consequent, opts)) {
      lines.push(`  ${code}`);
    }
  }

  lines.push(`}`);
  if (node.alternate) {
    const alternate: any[] = Array.isArray(node.alternate) ? node.alternate : [node.alternate];

    if (hasFragmentedLiftBody(alternate)) {
      lines.push(`else {`);
      const liftCode = emitConsolidatedLift(alternate);
      if (liftCode) lines.push(`  ${liftCode}`);
      lines.push(`}`);
    } else {
      lines.push(`else {`);
      for (const code of emitLogicBody(alternate, opts)) {
        lines.push(`  ${code}`);
      }
      lines.push(`}`);
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// for
// ---------------------------------------------------------------------------

/**
 * Emit a for statement.
 *
 * When the iteration source is a reactive variable (`@varName`), the generated JS
 * subscribes to that variable and re-renders the loop body on changes. This is the
 * §6.5 reactive for/lift pattern.
 *
 * Non-reactive iterables use the plain for-loop path.
 */
export function emitForStmt(node: any): string {
  const lines: string[] = [];
  let varName: string = node.variable ?? node.name ?? "item";
  let iterable: string = node.iterable ?? node.collection ?? "[]";

  if (typeof iterable === "string") {
    // Check for C-style for loop: "( let i = 0 ; i < 10 ; i++ )"
    const cStyleMatch = iterable.match(/^\(\s*(.*?)\s*;\s*(.*?)\s*;\s*(.*?)\s*\)$/s);
    if (cStyleMatch) {
      const _cParts = node.cStyleParts;
      const _cCtx: EmitExprContext = { mode: "client" };
      const init = emitExprField(_cParts?.initExpr, cStyleMatch[1].trim().replace(/\s*\+\s*\+/g, "++").replace(/\s*-\s*-/g, "--"), _cCtx);
      const cond = emitExprField(_cParts?.condExpr, cStyleMatch[2].trim(), _cCtx);
      const update = emitExprField(_cParts?.updateExpr, cStyleMatch[3].trim().replace(/\s*\+\s*\+/g, "++").replace(/\s*-\s*-/g, "--"), _cCtx);
      lines.push(`for (${init}; ${cond}; ${update}) {`);

      const body: any[] = node.body ?? [];
      for (const code of emitLogicBody(body)) {
        lines.push(`  ${code}`);
      }
      lines.push(`}`);
      return lines.join("\n");
    }

    // Match "( [let|const|var] VAR of EXPR )" or "( VAR of EXPR )"
    const forOfMatch = iterable.match(/^\(\s*(?:(?:let|const|var)\s+)?(\w+)\s+of\s+(.*)\s*\)$/s);
    if (forOfMatch) {
      if (varName === "item" && forOfMatch[1] !== "item") {
        varName = forOfMatch[1];
      }
      iterable = forOfMatch[2].trim();
    }
  }

  // Detect reactive iterable: bare `@varName` (e.g. "@items").
  const reactiveMatch = typeof iterable === "string"
    ? iterable.trim().match(/^@([A-Za-z_$][A-Za-z0-9_$]*)$/)
    : null;

  if (reactiveMatch) {
    // Reactive for/lift path — §6.5.3 with keyed reconciliation
    const reactiveVarName = reactiveMatch[1];
    const wrapperVar = genVar("list_wrapper");
    const renderFn = genVar("render_list");
    const createFnVar = genVar("create_item");
    const tmpContainerVar = genVar("tmp");
    const _forExprCtx: EmitExprContext = { mode: "client" };
    const rewrittenIterable = emitExprField(node.iterExpr, iterable, _forExprCtx);
    const body: any[] = node.body ?? [];

    lines.push(`const ${wrapperVar} = document.createElement("div");`);
    lines.push(`_scrml_lift(${wrapperVar});`);

    lines.push(`function ${createFnVar}(${varName}, _scrml_idx) {`);

    if (hasFragmentedLiftBody(body)) {
      // Pass continueBehavior:"return" so continue-stmts in pre-statements emit `return;`
      const liftCode = emitConsolidatedLift(body, { directReturn: true, continueBehavior: "return" });
      if (liftCode) {
        for (const line of liftCode.split("\n")) {
          lines.push(`  ${line}`);
        }
      }
    } else {
      // Fallback: use DocumentFragment for non-consolidated lift bodies
      lines.push(`  const ${tmpContainerVar} = document.createDocumentFragment();`);
      for (const child of body) {
        if (child && child.kind === "lift-expr") {
          const code = emitLiftExpr(child, { containerVar: tmpContainerVar });
          if (code) {
            for (const line of code.split("\n")) {
              lines.push(`  ${line}`);
            }
          }
        } else {
          // Pass continueBehavior:"return" so continue-stmts nested at any depth
          // (e.g. inside an if-body) emit `return;` rather than illegal `continue;`.
          const code = emitLogicNode(child, { continueBehavior: "return" });
          if (code) {
            for (const line of code.split("\n")) {
              lines.push(`  ${line}`);
            }
          }
        }
      }
      lines.push(`  return ${tmpContainerVar}.firstChild;`);
    }
    lines.push(`}`);

    lines.push(`function ${renderFn}() {`);
    lines.push(`  _scrml_reconcile_list(${wrapperVar}, ${rewrittenIterable}, (item, i) => item?.id !== undefined ? item.id : i, ${createFnVar});`);
    lines.push(`}`);
    lines.push(`${renderFn}();`);
    lines.push(`_scrml_effect_static(${renderFn});`);
    return lines.join("\n");
  }

  // Non-reactive path — plain for loop
  const _plainForCtx: EmitExprContext = { mode: "client" };
  iterable = emitExprField(node.iterExpr, iterable, _plainForCtx);
  lines.push(`for (const ${varName} of ${iterable}) {`);

  const body: any[] = node.body ?? [];

  if (hasFragmentedLiftBody(body)) {
    const liftCode = emitConsolidatedLift(body);
    if (liftCode) {
      lines.push(`  ${liftCode}`);
    }
  } else {
    for (const code of emitLogicBody(body)) {
      lines.push(`  ${code}`);
    }
  }
  lines.push(`}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// while
// ---------------------------------------------------------------------------

/**
 * Emit a while statement, optionally with a label prefix.
 */
export function emitWhileStmt(node: any): string {
  const lines: string[] = [];
  const _whileCtx: EmitExprContext = { mode: "client" };
  const condition = emitExprField(node.condExpr, node.condition ?? "true", _whileCtx);
  const label = node.label ? `${node.label}: ` : "";
  lines.push(`${label}while (${condition}) {`);
  for (const code of emitLogicBody(node.body ?? [])) {
    lines.push(`  ${code}`);
  }
  lines.push(`}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// do-while
// ---------------------------------------------------------------------------

/**
 * Emit a do-while statement.
 */
export function emitDoWhileStmt(node: any): string {
  const lines: string[] = [];
  const _doWhileCtx: EmitExprContext = { mode: "client" };
  const condition = emitExprField(node.condExpr, node.condition ?? "true", _doWhileCtx);
  const label = node.label ? `${node.label}: ` : "";
  lines.push(`${label}do {`);
  for (const code of emitLogicBody(node.body ?? [])) {
    lines.push(`  ${code}`);
  }
  lines.push(`} while (${condition});`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// break / continue
// ---------------------------------------------------------------------------

/**
 * Emit a break statement, optionally with a label target.
 */
export function emitBreakStmt(node: any): string {
  return node.label ? `break ${node.label};` : `break;`;
}

/**
 * Emit a continue statement, optionally with a label target.
 */
export function emitContinueStmt(node: any): string {
  return node.label ? `continue ${node.label};` : `continue;`;
}

// ---------------------------------------------------------------------------
// try / catch / finally
// ---------------------------------------------------------------------------

/**
 * Emit a try-catch-finally statement.
 */
export function emitTryStmt(node: any): string {
  const lines: string[] = [];
  lines.push(`try {`);
  for (const code of emitLogicBody(node.body ?? [])) {
    for (const line of code.split("\n")) {
      lines.push(`  ${line}`);
    }
  }
  lines.push(`}`);

  if (node.catchNode) {
    let catchParam: string = node.catchNode.header ? node.catchNode.header.trim() : "";
    if (catchParam.startsWith("(") && catchParam.endsWith(")")) {
      catchParam = catchParam.slice(1, -1).trim();
    }
    const catchParamStr = catchParam ? ` (${catchParam})` : "";
    lines.push(`catch${catchParamStr} {`);
    for (const code of emitLogicBody(node.catchNode.body ?? [])) {
      for (const line of code.split("\n")) {
        lines.push(`  ${line}`);
      }
    }
    lines.push(`}`);
  }

  if (node.finallyNode) {
    lines.push(`finally {`);
    for (const code of emitLogicBody(node.finallyNode.body ?? [])) {
      for (const line of code.split("\n")) {
        lines.push(`  ${line}`);
      }
    }
    lines.push(`}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// match
// ---------------------------------------------------------------------------

interface MatchArm {
  kind: "variant" | "string" | "wildcard" | "not";
  test: string | null;
  binding: string | null;
  result: string;
  /** Structured AST body for match-arm-block nodes — bypasses rewriteBlockBody */
  structuredBody?: any[] | null;
}

/**
 * Parse a single match arm text into a structured arm descriptor.
 *
 * Recognized arm forms (tried in order — new scrml-native syntax first, then legacy fallback):
 *
 * NEW (scrml-native):
 *   1. .Variant => expr          — enum variant (dot-prefix, capital letter required)
 *   2. .Variant(binding) => expr — enum variant with payload binding
 *   3. "string" => expr          — string literal (double-quoted)
 *   4. 'string' => expr          — string literal (single-quoted)
 *   5. else => expr              — wildcard/catch-all arm
 *
 * LEGACY (Rust-style fallback — recognized but not canonical):
 *   6. ::Variant -> expr          — old enum variant syntax
 *   7. ::Variant(binding) -> expr — old enum variant with payload
 *   8. "string" -> expr           — old string literal (double-quoted)
 *   9. 'string' -> expr           — old string literal (single-quoted)
 *  10. _ -> expr                  — old wildcard syntax
 */
function parseMatchArm(trimmed: string): MatchArm | null {
  // NEW Form 1 & 2: .Variant => result or .Variant(binding) => result
  const newVariantMatch = trimmed.match(/^\.\s*([A-Z][A-Za-z0-9_]*)(?:\s*\(\s*(\w+)\s*\))?\s*=>\s*([\s\S]+)$/);
  if (newVariantMatch) {
    return { kind: "variant", test: newVariantMatch[1], binding: newVariantMatch[2] ?? null, result: newVariantMatch[3].trim() };
  }

  // NEW Form 3: "string" => expr (double-quoted)
  const newDqStringMatch = trimmed.match(/^"((?:[^"\\]|\\.)*)"\s*=>\s*([\s\S]+)$/);
  if (newDqStringMatch) {
    return { kind: "string", test: `"${newDqStringMatch[1]}"`, binding: null, result: newDqStringMatch[2].trim() };
  }

  // NEW Form 4: 'string' => expr (single-quoted)
  const newSqStringMatch = trimmed.match(/^'((?:[^'\\]|\\.)*)'\s*=>\s*([\s\S]+)$/);
  if (newSqStringMatch) {
    return { kind: "string", test: `'${newSqStringMatch[1]}'`, binding: null, result: newSqStringMatch[2].trim() };
  }

  // NEW Form 5a: not => expr — absence arm (§42: `not` in match arms)
  const notArmMatch = trimmed.match(/^not\s*=>\s*([\s\S]+)$/);
  if (notArmMatch) {
    return { kind: "not", test: null, binding: null, result: notArmMatch[1].trim() };
  }

  // NEW Form 5b: else => expr (or bare: else expr) — wildcard arm
  const newWildcardMatch = trimmed.match(/^else\s*(?:=>\s*)?([\s\S]+)$/);
  if (newWildcardMatch) {
    return { kind: "wildcard", test: null, binding: null, result: newWildcardMatch[1].trim() };
  }

  // LEGACY Form 1 & 2: ::Variant -> result or ::Variant(binding) -> result
  const legacyVariantMatch = trimmed.match(/^::\s*(\w+)(?:\s*\(\s*(\w+)\s*\))?\s*->\s*([\s\S]+)$/);
  if (legacyVariantMatch) {
    return { kind: "variant", test: legacyVariantMatch[1], binding: legacyVariantMatch[2] ?? null, result: legacyVariantMatch[3].trim() };
  }

  // LEGACY Form 3: "string" -> expr (double-quoted)
  const legacyDqStringMatch = trimmed.match(/^"((?:[^"\\]|\\.)*)"\s*->\s*([\s\S]+)$/);
  if (legacyDqStringMatch) {
    return { kind: "string", test: `"${legacyDqStringMatch[1]}"`, binding: null, result: legacyDqStringMatch[2].trim() };
  }

  // LEGACY Form 4: 'string' -> expr (single-quoted)
  const legacySqStringMatch = trimmed.match(/^'((?:[^'\\]|\\.)*)'\s*->\s*([\s\S]+)$/);
  if (legacySqStringMatch) {
    return { kind: "string", test: `'${legacySqStringMatch[1]}'`, binding: null, result: legacySqStringMatch[2].trim() };
  }

  // LEGACY Form 5: _ -> expr (old wildcard)
  const legacyWildcardMatch = trimmed.match(/^_\s*->\s*([\s\S]+)$/);
  if (legacyWildcardMatch) {
    return { kind: "wildcard", test: null, binding: null, result: legacyWildcardMatch[1].trim() };
  }

  // §42 presence arm: (identifier) => expr — counterpart to `not => expr` in match
  // Acts as a wildcard/else arm with the variable bound to the matched value.
  const presenceArmMatch = trimmed.match(/^\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)\s*=>\s*([\s\S]+)$/);
  if (presenceArmMatch) {
    return { kind: "wildcard", test: null, binding: presenceArmMatch[1], result: presenceArmMatch[2].trim() };
  }

  return null;
}

/**
 * Split a string containing multiple concatenated match arms into individual arm strings.
 *
 * When the AST delivers a single body child with all arms merged on one line
 * (e.g. ".Todo => Status.InProgress .Done => Status.Todo else => Status.Todo"),
 * this function splits it at arm boundaries before parseMatchArm is called.
 *
 * Arm boundaries are detected by scanning for arm-start tokens at non-string positions:
 *   - .UpperCase  (new variant arm — only when NOT preceded by an identifier char)
 *   - "..." =>    (string literal arm — double-quoted, followed by => or ->)
 *   - '...' =>    (string literal arm — single-quoted, followed by => or ->)
 *   - else        (wildcard arm — when preceded by whitespace or start-of-string)
 *   - ::letter    (legacy variant arm)
 *   - _ ->        (legacy wildcard arm)
 *
 * The "NOT preceded by identifier char" rule prevents false positives from object
 * property accesses like Status.InProgress (where .I would otherwise look like an arm).
 *
 * Returns [s] when only zero or one arm boundary is found.
 */
function splitMultiArmString(s: string): string[] {
  const armStartPositions: number[] = [];
  let inString: string | null = null;
  let braceDepth = 0; // skip arm detection inside nested { } blocks
  let i = 0;

  while (i < s.length) {
    const ch = s[i];

    // Track string literal boundaries (skip content inside strings)
    if (inString !== null) {
      if (ch === "\\") { i += 2; continue; }
      if (ch === inString) { inString = null; }
      i++;
      continue;
    }

    // Skip whitespace (but record position for preceding-char checks below)
    // Track brace depth — skip arm detection inside nested { } blocks
    if (ch === "{") { braceDepth++; i++; continue; }
    if (ch === "}") { if (braceDepth > 0) braceDepth--; i++; continue; }
    if (braceDepth > 0) { i++; continue; }
    if (/\s/.test(ch)) { i++; continue; }

    // New variant arm: .UpperCase or . UpperCase (BS adds spaces around .)
    // Only counts as an arm boundary when NOT preceded by an identifier char.
    // This prevents property accesses like Status.InProgress from triggering.
    // IMPORTANT: skip whitespace before the dot. The block-splitter emits
    // "MarioState . Big" with spaces around '.'. Without skipping whitespace,
    // s[i-1] is ' ' (space), which passes !/[A-Za-z0-9_$]/.test() — incorrectly
    // treating .Big as a new arm start instead of a property access.
    if (ch === "." && i + 1 < s.length) {
      let nextNonSpace = i + 1;
      while (nextNonSpace < s.length && s[nextNonSpace] === " ") nextNonSpace++;
      if (nextNonSpace < s.length && /[A-Z]/.test(s[nextNonSpace])) {
                // An arm boundary is a .UpperCase token followed by => (or ->) at the same depth.
        // This is the only reliable signal that distinguishes arm starts from property accesses
        // in the single-line token-joined format that collectExpr produces (e.g.,
        // "MarioState . Fire . Feather => ..." — .Fire has no arrow, .Feather does).
        //
        // Strategy: look AHEAD past the variant name (and optional payload binding) to check
        // for =>. If present, it's an arm boundary. Otherwise, it's a property access result.
        // Apply the original prevCh rule ONLY when => is NOT found (property access cases like
        // "Status.InProgress .Done => ..." still need splitting at .Done).
        let nameEnd = nextNonSpace;
        while (nameEnd < s.length && /[A-Za-z0-9_]/.test(s[nameEnd])) nameEnd++;
        let afterName = nameEnd;
        while (afterName < s.length && s[afterName] === " ") afterName++;
        // Skip optional payload binding: (binding)
        if (afterName < s.length && s[afterName] === "(") {
          let pd = 1; afterName++;
          while (afterName < s.length && pd > 0) {
            if (s[afterName] === "(") pd++;
            else if (s[afterName] === ")") pd--;
            afterName++;
          }
          while (afterName < s.length && s[afterName] === " ") afterName++;
        }
        const isFollowedByArrow = s.slice(afterName, afterName + 2) === "=>" || s.slice(afterName, afterName + 2) === "->";
        if (isFollowedByArrow) {
          // Definitive arm start — check original prevCh rule to avoid mid-result property accesses
          const prevCh = i > 0 ? s[i - 1] : null;
          if (prevCh === null || !/[A-Za-z0-9_$]/.test(prevCh)) {
            armStartPositions.push(i);
          }
        }
      }
      i++;
      continue;
    }

    // String literal arm: "..." => / "..." -> or '...' => / '...' ->
    // Only counts as an arm boundary when the string is followed by => or ->.
    if (ch === '"' || ch === "'") {
      const q = ch;
      let j = i + 1;
      while (j < s.length && s[j] !== q) {
        if (s[j] === "\\") j++;
        j++;
      }
      if (j < s.length) {
        let k = j + 1;
        while (k < s.length && /\s/.test(s[k])) k++;
        if (s.slice(k, k + 2) === "=>" || s.slice(k, k + 2) === "->") {
          armStartPositions.push(i);
          inString = q;
          i++;
          continue;
        }
      }
      // Not an arm boundary — string is inside a result expression; track it
      inString = q;
      i++;
      continue;
    }

    // §42 absence arm: not => expr
    // Only counts as an arm boundary when preceded by whitespace or at start-of-string,
    // and followed by whitespace or =>.
    if (s.slice(i, i + 3) === "not" && (i + 3 >= s.length || /[\s=]/.test(s[i + 3]))) {
      const prevCh = i > 0 ? s[i - 1] : null;
      if (prevCh === null || /\s/.test(prevCh)) {
        // Verify it's followed by => (skip whitespace)
        let k = i + 3;
        while (k < s.length && /\s/.test(s[k])) k++;
        if (s.slice(k, k + 2) === "=>") {
          armStartPositions.push(i);
          i += 3;
          continue;
        }
      }
    }

    // Wildcard arm: else
    // Only counts as an arm boundary when preceded by whitespace or at start-of-string,
    // and followed by whitespace, =, >, or end-of-string.
    if (s.slice(i, i + 4) === "else" && (i + 4 >= s.length || /[\s=>]/.test(s[i + 4]))) {
      const prevCh = i > 0 ? s[i - 1] : null;
      if (prevCh === null || /\s/.test(prevCh)) {
        armStartPositions.push(i);
        i += 4;
        continue;
      }
    }

    // Legacy variant arm: ::Letter
    if (ch === ":" && i + 1 < s.length && s[i + 1] === ":" && i + 2 < s.length && /[A-Za-z_]/.test(s[i + 2])) {
      armStartPositions.push(i);
      i += 2;
      continue;
    }

    // Legacy wildcard: _ ->
    if (ch === "_") {
      let k = i + 1;
      while (k < s.length && /\s/.test(s[k])) k++;
      if (s.slice(k, k + 2) === "->") {
        armStartPositions.push(i);
      }
    }

    // §42 presence arm: (identifier) => — only when preceded by whitespace or start
    if (ch === "(") {
      const prevCh = i > 0 ? s[i - 1] : null;
      if (prevCh === null || /\s/.test(prevCh)) {
        // Check pattern: ( identifier ) =>
        const presenceRe = /^\(\s*[A-Za-z_$][A-Za-z0-9_$]*\s*\)\s*=>/;
        if (presenceRe.test(s.slice(i))) {
          armStartPositions.push(i);
        }
      }
    }

    i++;
  }

  if (armStartPositions.length <= 1) return [s];

  const result: string[] = [];
  for (let idx = 0; idx < armStartPositions.length; idx++) {
    const start = armStartPositions[idx];
    const end = idx + 1 < armStartPositions.length ? armStartPositions[idx + 1] : s.length;
    const arm = s.slice(start, end).trim();
    if (arm) result.push(arm);
  }
  return result.length > 0 ? result : [s];
}

/**
 * Rewrite the text content of a match arm block body `{ ... }`.
 *
 * Match arm blocks are raw text (not structured AST nodes), so reactive
 * assignments `@name = expr` must be rewritten here before rewriteExpr
 * processes `@name` as a getter call.
 *
 * When machineBindings is provided, machine-bound reactive assignments
 * are wrapped with emitTransitionGuard instead of a plain _scrml_reactive_set.
 * This enforces §51 state machine transition rules at runtime.
 */
export function rewriteBlockBody(content: string, machineBindings?: Map<string, MachineBindingInfo> | null): string {
  const stmts: string[] = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === "{" || ch === "(" || ch === "[") depth++;
    else if (ch === "}" || ch === ")" || ch === "]") depth--;
    else if ((ch === ";" || ch === "\n") && depth === 0) {
      const s = current.trim();
      if (s) stmts.push(s);
      current = "";
      continue;
    }
    current += ch;
  }
  const last = current.trim();
  if (last) stmts.push(last);

  if (stmts.length === 0) return "";

  const results: string[] = [];
  for (const stmt of stmts) {
    const reactiveAssignMatch = stmt.match(/^@([A-Za-z_$][A-Za-z0-9_$]*)\s*=(?!=)\s*([\s\S]+)$/);
    if (reactiveAssignMatch) {
      const name = reactiveAssignMatch[1];
      const valueExpr = rewriteExpr(reactiveAssignMatch[2].trim());
      const binding = machineBindings?.get(name) ?? null;
      if (binding) {
        // §51.5: Emit transition guard instead of plain reactive_set for machine-bound vars
        const guardRules = binding.rules.filter((r: any) => r.guard != null && r.guard !== "");
        const guardLines = emitTransitionGuard(
          name,
          valueExpr,
          binding.tableName,
          binding.machineName,
          guardRules,
        );
        results.push(guardLines.join("\n"));
      } else {
        results.push(`_scrml_reactive_set("${name}", ${valueExpr})`);
      }
    } else {
      results.push(rewriteExpr(stmt));
    }
  }
  return results.join("; ");
}

/**
 * Emit a match expression compiled to a JS if/else IIFE.
 */
export function emitMatchExpr(node: any): string {
  const _matchCtx: EmitExprContext = { mode: "client" };
  const header = emitExprField(node.headerExpr, (node.header ?? "").trim(), _matchCtx);
  const body: any[] = node.body ?? [];

  const tmpVar = genVar("match");

  const arms: MatchArm[] = [];
  for (const child of body) {
    if (!child) continue;
    // Handle structured match-arm-block nodes (from AST builder block body parsing).
    // These come from `. VariantName => { ... }` arms where the body was parsed as AST.
    if (child.kind === "match-arm-block") {
      const arm: MatchArm = {
        kind: child.isWildcard ? "wildcard" : child.isNotArm ? "not" : "variant",
        test: child.variant ?? null,
        binding: null,
        result: "",
        structuredBody: Array.isArray(child.body) ? child.body : null,
      };
      arms.push(arm);
      continue;
    }
    const armExpr: unknown = child.expr ?? child.header ?? "";
    if (typeof armExpr !== "string") continue;
    const trimmed = armExpr.trim();
    if (!trimmed) continue;

    // A single body child may contain all arms concatenated on one line.
    // Split into individual arm strings before parsing (BUG-R13-001).
    const armStrings = splitMultiArmString(trimmed);
    for (const armStr of armStrings) {
      const arm = parseMatchArm(armStr);
      if (arm) arms.push(arm);
    }
  }

  if (arms.length === 0) {
    return `/* match expression could not be compiled */ ${rewriteExpr(header)};`;
  }

  const iifeLines: string[] = [];
  iifeLines.push(`(function() {`);
  iifeLines.push(`  const ${tmpVar} = ${header};`);

  let conditionIndex = 0;
  for (const arm of arms) {
    // Structured body: emit each statement via emitLogicNode (handles lift-expr, etc.)
    // This path is taken for match-arm-block nodes parsed by the AST builder.
    if (arm.structuredBody) {
      const bodyLines = emitLogicBody(arm.structuredBody).filter(Boolean);
      const structuredEmit = bodyLines.length > 0 ? `{ ${bodyLines.join("; ")} }` : `{}`;
      if (arm.kind === "wildcard") {
        if (arm.binding) {
          iifeLines.push(`  else { const ${arm.binding} = ${tmpVar}; ${structuredEmit} }`);
        } else {
          iifeLines.push(`  else ${structuredEmit}`);
        }
      } else {
        const prefix = conditionIndex === 0 ? "if" : "else if";
        let condition: string;
        if (arm.kind === "not") {
          condition = `${tmpVar} === null || ${tmpVar} === undefined`;
        } else {
          condition = `${tmpVar} === "${arm.test}"`;
        }
        iifeLines.push(`  ${prefix} (${condition}) ${structuredEmit}`);
        conditionIndex++;
      }
      continue;
    }
    // Detect block-bodied arm results: `{ statements... }`.
    // Block bodies contain statements (reactive assignments, lift calls) — they must NOT
    // be passed to rewriteExpr directly or @name becomes _scrml_reactive_get("name")
    // on the left side of =. Route through rewriteBlockBody instead.
    const isBlockBody = arm.result.trimStart().startsWith("{") && arm.result.trimEnd().endsWith("}");
    const emitResult = isBlockBody
      ? (() => {
          const inner = arm.result.trim().slice(1, -1).trim();
          return inner ? `{ ${rewriteBlockBody(inner)} }` : `{}`;
        })()
      : `return ${rewriteExpr(arm.result)};`;

    if (arm.kind === "wildcard") {
      if (arm.binding) {
        // §42 presence arm: (x) => expr — bind x to the matched value
        if (isBlockBody) {
          iifeLines.push(`  else { const ${arm.binding} = ${tmpVar}; ${emitResult} }`);
        } else {
          iifeLines.push(`  else { const ${arm.binding} = ${tmpVar}; return ${rewriteExpr(arm.result)}; }`);
        }
      } else {
        iifeLines.push(`  else ${emitResult}`);
      }
    } else {
      const prefix = conditionIndex === 0 ? "if" : "else if";
      let condition: string;
      if (arm.kind === "not") {
        // §42: `not` match arm checks for absence (null or undefined)
        condition = `${tmpVar} === null || ${tmpVar} === undefined`;
      } else if (arm.kind === "variant") {
        condition = `${tmpVar} === "${arm.test}"`;
      } else {
        condition = `${tmpVar} === ${arm.test}`;
      }
      iifeLines.push(`  ${prefix} (${condition}) ${emitResult}`);
      conditionIndex++;
    }
  }

  iifeLines.push(`})()`);
  return iifeLines.join("\n");
}

// ---------------------------------------------------------------------------
// switch
// ---------------------------------------------------------------------------

/**
 * Emit a switch statement.
 */
export function emitSwitchStmt(node: any): string {
  const _switchCtx: EmitExprContext = { mode: "client" };
  const header = emitExprField(node.headerExpr, (node.header ?? "").trim(), _switchCtx);
  const lines: string[] = [];
  let cleanHeader = header;
  if (cleanHeader.startsWith("(") && cleanHeader.endsWith(")")) {
    cleanHeader = cleanHeader.slice(1, -1).trim();
  }
  lines.push(`switch (${cleanHeader}) {`);

  const body: any[] = node.body ?? [];
  let i = 0;
  let caseBlockOpen = false;
  while (i < body.length) {
    const child = body[i];
    if (!child) { i++; continue; }

    if (child.kind === "bare-expr" && typeof child.expr === "string") {
      const exprTrimmed: string = child.expr.trim();

      const breakCaseMatch = exprTrimmed.match(/^break\s+(case\s+.*|default\s*:.*)$/s);
      if (breakCaseMatch) {
        lines.push(`    break;`);
        lines.push(`  }`);
        caseBlockOpen = false;
        const caseLabel = breakCaseMatch[1].trim();
        lines.push(`  ${rewriteExpr(caseLabel)} {`);
        caseBlockOpen = true;
        i++;
        continue;
      }

      if (/^case\s/.test(exprTrimmed) || /^default\s*:/.test(exprTrimmed)) {
        if (caseBlockOpen) {
          lines.push(`  }`);
        }
        lines.push(`  ${rewriteExpr(exprTrimmed)} {`);
        caseBlockOpen = true;
        i++;
        continue;
      }
    }

    const code = emitLogicNode(child);
    if (code) {
      for (const line of code.split("\n")) {
        lines.push(`    ${line}`);
      }
    }
    i++;
  }

  if (caseBlockOpen) {
    lines.push(`  }`);
  }

  lines.push(`}`);
  return lines.join("\n");
}
