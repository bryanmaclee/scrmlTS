/**
 * scrml LSP — L4 "Standards polish" handlers.
 *
 * L4.1 — Signature help (textDocument/signatureHelp)
 *   - Trigger characters: `(` and `,` (advance to next parameter).
 *   - Walks back from the cursor to find the open `(` of the enclosing
 *     function call, identifies the callee, looks it up in
 *     `analysis.functions` (same-file) or via L2's workspace cache
 *     (`lookupCrossFileFunction`), and returns a `SignatureHelp` payload
 *     with one `SignatureInformation` describing the callee plus the
 *     active parameter index derived from comma-counting.
 *
 * L4.2 — Code actions (textDocument/codeAction)
 *   - Capability: `codeActionProvider: { codeActionKinds: ["quickfix"] }`.
 *   - Diagnostics carry an error code (e.g. "E-LIN-001"); the per-code
 *     handlers below build a single `CodeAction` of kind "quickfix" with a
 *     `WorkspaceEdit` that mechanically applies the fix.
 *   - Top 5 error codes (per deep-dive 2026-04-24 §L4 + frequency on the
 *     existing test corpus):
 *       1. E-IMPORT-004 — imported name not exported. Quick-fix: rename
 *          to the closest exported name (Levenshtein) using the workspace
 *          export registry.
 *       2. E-IMPORT-005 — bare npm-style import. Quick-fix: prefix with
 *          `./`.
 *       3. E-LIN-001 — linear var declared but not consumed. Quick-fix:
 *          prefix variable with `_` to silence (LSP convention).
 *       4. E-PA-007 — protect=field matches no column. Quick-fix: rename
 *          to the closest column from the listed tables (Levenshtein).
 *       5. E-SQL-006 — `.prepare()` removed. Quick-fix: drop `.prepare()`
 *          (Bun.SQL caches automatically).
 *
 *   - Both E-IMPORT-* builders extract the offending token from the
 *     diagnostic.message (which always names it in backticks) AND locate
 *     the precise byte range of that token inside the diagnostic span,
 *     so the resulting TextEdit only replaces the offending substring,
 *     never the whole import declaration.
 *
 * Held-LSP-shape contract:
 *   - SignatureHelp: { signatures: SignatureInformation[], activeSignature, activeParameter }
 *   - SignatureInformation: { label, parameters: ParameterInformation[], documentation? }
 *   - ParameterInformation: { label: string|[start,end], documentation? }
 *   - CodeAction: { title, kind, edit?: { changes: { [uri]: TextEdit[] } }, diagnostics? }
 *
 * No I/O on import. Pure functions; outputs are LSP-shaped objects.
 */

import { CodeActionKind, MarkupKind } from "vscode-languageserver/node";

import { lookupCrossFileFunction } from "./workspace.js";
import { offsetToPosition, formatFunctionSignature, pathToUri } from "./handlers.js";

// ---------------------------------------------------------------------------
// L4.1 — Signature help
// ---------------------------------------------------------------------------

/**
 * Walk backwards from `offset` and find the offset of the `(` that begins
 * the innermost function call we're inside. Skips strings and comments,
 * balances any nested parens we close.
 *
 * Returns null when the cursor is not inside a paren-opened call.
 */
export function findEnclosingCallParen(text, offset) {
  let i = offset - 1;
  let depth = 0;
  let inString = false;
  let stringChar = null;
  while (i >= 0) {
    const ch = text[i];
    // Crude string skip — we walk backwards so the close-quote is what we
    // hit first; toggle on quotes that are not escaped (best-effort).
    if (inString) {
      if (ch === stringChar && text[i - 1] !== "\\") {
        inString = false;
        stringChar = null;
      }
      i--;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = true;
      stringChar = ch;
      i--;
      continue;
    }
    if (ch === ")") {
      depth++;
      i--;
      continue;
    }
    if (ch === "(") {
      if (depth === 0) return i;
      depth--;
      i--;
      continue;
    }
    // Stop on context-boundary tokens — `{`, `}`, `;`, newline at depth 0
    // bound the search so a stray `(` from a far-up scope doesn't pull us in.
    if (depth === 0 && (ch === "{" || ch === "}" || ch === ";")) {
      return null;
    }
    i--;
  }
  return null;
}

/**
 * Given the offset of a `(`, scan backwards to extract the callee identifier
 * immediately preceding it (skipping whitespace). Returns the identifier or
 * null if the token before `(` isn't a plain identifier.
 *
 * Member-access form `obj.method(` returns just `method` (the trailing
 * identifier) — sufficient for same-file/cross-file function lookup since
 * scrml functions are top-level.
 */
export function extractCalleeBefore(text, parenOffset) {
  let i = parenOffset - 1;
  while (i >= 0 && /\s/.test(text[i])) i--;
  if (i < 0) return null;
  let end = i + 1;
  while (i >= 0 && /[A-Za-z0-9_$]/.test(text[i])) i--;
  const start = i + 1;
  if (start >= end) return null;
  const ident = text.slice(start, end);
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(ident)) return null;
  return ident;
}

/**
 * Count commas between `parenOffset + 1` and `cursorOffset`, ignoring those
 * inside nested parens / brackets / strings. Used to compute the active
 * parameter index for signature help.
 */
export function countActiveParamIndex(text, parenOffset, cursorOffset) {
  let count = 0;
  let depthParen = 0;
  let depthSquare = 0;
  let depthCurly = 0;
  let inString = false;
  let stringChar = null;
  for (let i = parenOffset + 1; i < cursorOffset && i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === stringChar && text[i - 1] !== "\\") {
        inString = false;
        stringChar = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === "(") depthParen++;
    else if (ch === ")") {
      if (depthParen === 0) break;
      depthParen--;
    } else if (ch === "[") depthSquare++;
    else if (ch === "]") depthSquare = Math.max(0, depthSquare - 1);
    else if (ch === "{") depthCurly++;
    else if (ch === "}") depthCurly = Math.max(0, depthCurly - 1);
    else if (ch === "," && depthParen === 0 && depthSquare === 0 && depthCurly === 0) {
      count++;
    }
  }
  return count;
}

/**
 * Render a single `SignatureInformation` for the given function record.
 * Parameters are normalized to `{ name: string, type: string|null }` so
 * the renderer doesn't care whether `params` is `string[]` or `{name}[]`.
 *
 * `label` is the human-readable signature line (used by VS Code as the
 * popup heading); `parameters[]` carry per-param substring offsets so the
 * client can highlight the active param.
 */
export function buildSignatureInformation(fn) {
  const normalized = (fn.params || []).map((p) => {
    if (typeof p === "string") {
      // Param string may be `"name"` or `"name: Type"` or `"name: Type = default"`.
      const m = p.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s*(?::\s*(.+))?$/);
      if (m) return { name: m[1], type: m[2] ? m[2].trim() : null, raw: p };
      return { name: p, type: null, raw: p };
    }
    return { name: p?.name || "", type: p?.type || null, raw: p?.raw || p?.name || "" };
  });

  const paramSegments = normalized.map((p) =>
    p.type ? `${p.name}: ${p.type}` : p.name,
  );

  // Build the label and per-param [start, end] offsets within it.
  const boundary = fn.isServer ? " [server]" : "";
  const failMarker = fn.canFail ? (fn.errorType ? ` ! -> ${fn.errorType}` : " !") : "";
  const prefix = `${fn.name}(`;
  let label = prefix;
  const parameters = [];
  for (let i = 0; i < paramSegments.length; i++) {
    const seg = paramSegments[i];
    const start = label.length;
    label += seg;
    const end = label.length;
    parameters.push({ label: [start, end] });
    if (i < paramSegments.length - 1) label += ", ";
  }
  label += `)${failMarker}${boundary}`;

  return {
    label,
    parameters,
    documentation: {
      kind: MarkupKind.Markdown,
      value: `\`${formatFunctionSignature({
        name: fn.name,
        isServer: !!fn.isServer,
        fnKind: fn.fnKind || "function",
        isGenerator: !!fn.isGenerator,
        canFail: !!fn.canFail,
        errorType: fn.errorType || null,
        params: normalized.map((p) => p.name),
      })}\``,
    },
  };
}

/**
 * Build a `SignatureHelp` for the cursor at `offset`. Returns null when:
 *   - cursor is not inside a function call's open paren, or
 *   - the callee identifier can't be located, or
 *   - no matching function is found in same-file or cross-file scope.
 *
 * `analysis` is the per-file analysis cache from `analyzeText` (carries
 * `functions[]`).
 * `workspace` (optional) lets us surface signatures for cross-file imported
 * functions via the L2 workspace cache.
 * `filePath` (optional) is the importer's absolute path; required for
 * cross-file lookup.
 */
export function buildSignatureHelp(text, offset, analysis, workspace, filePath) {
  const parenOffset = findEnclosingCallParen(text, offset);
  if (parenOffset == null) return null;
  const callee = extractCalleeBefore(text, parenOffset);
  if (!callee) return null;

  let fn = null;
  if (analysis?.functions) {
    fn = analysis.functions.find((f) => f.name === callee) || null;
  }

  if (!fn && workspace && filePath) {
    const hit = lookupCrossFileFunction(workspace, filePath, callee);
    if (hit?.fnNode) {
      const node = hit.fnNode;
      fn = {
        name: node.name,
        params: node.params || [],
        isServer: !!node.isServer,
        fnKind: node.fnKind || "function",
        isGenerator: !!node.isGenerator,
        canFail: !!node.canFail,
        errorType: node.errorType || null,
        _crossFile: true,
        _foreignPath: hit.filePath,
      };
    }
  }

  if (!fn) return null;

  const sigInfo = buildSignatureInformation(fn);
  // Cross-file functions get a small annotation in the documentation so the
  // user knows where the symbol came from.
  if (fn._crossFile) {
    sigInfo.documentation = {
      kind: MarkupKind.Markdown,
      value: (sigInfo.documentation?.value || "") +
        `\n\n_Imported from ${fn._foreignPath}_`,
    };
  }

  const activeParameter = Math.min(
    countActiveParamIndex(text, parenOffset, offset),
    Math.max(0, (fn.params || []).length - 1),
  );

  return {
    signatures: [sigInfo],
    activeSignature: 0,
    activeParameter,
  };
}

// ---------------------------------------------------------------------------
// L4.2 — Code actions (quickfix)
// ---------------------------------------------------------------------------

/**
 * Levenshtein edit distance between two strings. Small implementation —
 * inputs in code-action use are short (identifier names, column names).
 */
export function levenshtein(a, b) {
  if (!a) return b ? b.length : 0;
  if (!b) return a.length;
  const m = a.length;
  const n = b.length;
  // Single-row DP for memory efficiency.
  let prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const curr = new Array(n + 1);
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,        // insertion
        prev[j] + 1,            // deletion
        prev[j - 1] + cost,     // substitution
      );
    }
    prev = curr;
  }
  return prev[n];
}

/**
 * Pick the closest candidate from `candidates` to `target` by Levenshtein
 * distance, capped at `maxDistance`. Returns the best string or null.
 */
export function closestMatch(target, candidates, maxDistance = 3) {
  let best = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    if (!c || typeof c !== "string") continue;
    const d = levenshtein(target.toLowerCase(), c.toLowerCase());
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  if (best && bestDist <= maxDistance) return best;
  return null;
}

/**
 * Extract the first backtick-quoted token from a message string. Diagnostic
 * messages use the convention `` `name` `` to cite offending identifiers,
 * column names, and import specifiers. Returns the token (without backticks)
 * or null.
 */
export function extractBacktickedToken(message) {
  if (typeof message !== "string") return null;
  const m = message.match(/`([^`]+)`/);
  return m ? m[1] : null;
}

/**
 * Build an LSP TextEdit replacing `range` with `newText`.
 */
function replaceEdit(range, newText) {
  return { range, newText };
}

/**
 * Build a CodeAction object with a single TextEdit applied to `uri`.
 */
function makeQuickFix({ title, uri, range, newText, diagnostic }) {
  return {
    title,
    kind: CodeActionKind.QuickFix,
    diagnostics: diagnostic ? [diagnostic] : undefined,
    edit: {
      changes: {
        [uri]: [replaceEdit(range, newText)],
      },
    },
  };
}

/**
 * Find the substring `needle` within `text` strictly inside the byte range
 * [startOff, endOff). Returns its absolute offset or -1 if not found.
 */
function findSubstringInRange(text, startOff, endOff, needle) {
  if (!needle) return -1;
  const segment = text.slice(startOff, endOff);
  const idx = segment.indexOf(needle);
  return idx < 0 ? -1 : startOff + idx;
}

/**
 * Quick-fix builders, keyed by error code. Each receives a context with:
 *   - diagnostic   the LSP Diagnostic that triggered the action
 *   - text         the current buffer text (so we can read identifiers around
 *                  the diagnostic span)
 *   - uri          the buffer's LSP URI (for the WorkspaceEdit)
 *   - analysis     per-file analysis cache
 *   - workspace    L2 workspace cache (may be null in single-file mode)
 *   - filePath     absolute path of the importing/diagnosed file
 *
 * Returns an array of CodeAction (zero or one element typically).
 */
export const QUICK_FIX_BUILDERS = {
  // -------------------------------------------------------------------------
  // E-IMPORT-004 — imported name is not exported. Suggest the closest exported
  // name from the target file's exportRegistry.
  //
  // Diagnostic span typically covers the whole `{ X } from "..."` clause; we
  // extract the offending name from the message's `` `X` `` token, then locate
  // its precise byte range inside the span so the rename only touches X.
  // -------------------------------------------------------------------------
  "E-IMPORT-004": (ctx) => {
    const { diagnostic, text, uri, workspace, filePath } = ctx;
    if (!workspace || !filePath) return [];

    const range = diagnostic.range;
    const startOff = positionToOffset(text, range.start);
    const endOff = positionToOffset(text, range.end);

    // 1. Pull the offending name from the diagnostic message (more precise
    //    than reading the segment, which may include several identifiers).
    let offendingName = extractBacktickedToken(diagnostic.message || "");
    if (!offendingName || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(offendingName)) {
      // Fallback: first identifier in the segment.
      offendingName = (text.slice(startOff, endOff).match(/[A-Za-z_$][A-Za-z0-9_$]*/) || [null])[0];
    }
    if (!offendingName) return [];

    // 2. Find the precise byte range of `offendingName` inside the segment.
    const nameStart = findSubstringInRange(text, startOff, endOff, offendingName);
    if (nameStart < 0) return [];
    const nameEnd = nameStart + offendingName.length;

    // 3. Look up exports of the target file via importGraph.
    const entry = workspace.importGraph?.get(filePath);
    if (!entry) return [];
    let candidateNames = null;
    for (const imp of entry.imports || []) {
      if ((imp.names || []).includes(offendingName)) {
        const targetExports = workspace.exportRegistry?.get(imp.absSource);
        if (targetExports) {
          candidateNames = Array.from(targetExports.keys());
          break;
        }
      }
    }
    if (!candidateNames || candidateNames.length === 0) return [];
    const best = closestMatch(offendingName, candidateNames);
    if (!best || best === offendingName) return [];

    return [makeQuickFix({
      title: `Rename import "${offendingName}" → "${best}"`,
      uri,
      range: {
        start: offsetToPosition(text, nameStart),
        end: offsetToPosition(text, nameEnd),
      },
      newText: best,
      diagnostic,
    })];
  },

  // -------------------------------------------------------------------------
  // E-IMPORT-005 — bare npm-style specifier. Quick-fix: prefix with `./`.
  //
  // Strategy:
  //   1. Pull the bare specifier from the diagnostic message (`` `react` ``).
  //   2. Find a quoted occurrence of that specifier inside the diagnostic's
  //      byte span (the import statement).
  //   3. Replace just the inner specifier text with `./<spec>`, leaving the
  //      surrounding quotes intact.
  // If the specifier already starts with `./`, `../`, `scrml:`, or
  // `vendor:`, no quickfix is emitted.
  // -------------------------------------------------------------------------
  "E-IMPORT-005": (ctx) => {
    const { diagnostic, text, uri } = ctx;
    const range = diagnostic.range;
    const startOff = positionToOffset(text, range.start);
    const endOff = positionToOffset(text, range.end);
    const segment = text.slice(startOff, endOff);

    let bare = extractBacktickedToken(diagnostic.message || "");
    if (!bare) {
      // Fallback: try to match a quoted spec in the segment.
      const quotedMatch = segment.match(/(['"])([^'"]+)\1/);
      bare = quotedMatch ? quotedMatch[2] : segment.trim();
    }
    if (!bare) return [];

    if (bare.startsWith("./") || bare.startsWith("../") ||
        bare.startsWith("scrml:") || bare.startsWith("vendor:") ||
        bare.startsWith("/")) {
      return [];
    }

    // Locate the bare specifier inside the segment. We look for the literal
    // `bare` substring; if found, replace just it. Otherwise, fall through
    // to a wider buffer search starting from `startOff`.
    let specStart = findSubstringInRange(text, startOff, endOff, bare);
    if (specStart < 0) {
      // Try widening — diagnostic span may not cover the spec at all.
      const widerStart = Math.max(0, startOff - 50);
      const widerEnd = Math.min(text.length, endOff + 50);
      specStart = findSubstringInRange(text, widerStart, widerEnd, bare);
      if (specStart < 0) return [];
    }
    const specEnd = specStart + bare.length;

    return [makeQuickFix({
      title: `Prefix import with "./" → "./${bare}"`,
      uri,
      range: {
        start: offsetToPosition(text, specStart),
        end: offsetToPosition(text, specEnd),
      },
      newText: `./${bare}`,
      diagnostic,
    })];
  },

  // -------------------------------------------------------------------------
  // E-LIN-001 — linear var declared but never consumed. Quick-fix: prefix
  // the variable name with `_` (LSP convention for "intentionally unused").
  //
  // The diagnostic span often points at (0,0) when the var span is missing;
  // we fall back to the message's backtick token, then walk `analysis.linVars`
  // for a span we can use.
  // -------------------------------------------------------------------------
  "E-LIN-001": (ctx) => {
    const { diagnostic, text, uri, analysis } = ctx;
    const range = diagnostic.range;
    const startOff = positionToOffset(text, range.start);
    const endOff = positionToOffset(text, range.end);
    const segment = text.slice(startOff, endOff);

    // 1. Try the segment directly (`lin myvar = ...`).
    let varName = (segment.match(/\blin\s+([A-Za-z_$][A-Za-z0-9_$]*)/) || [null, null])[1];
    if (!varName) varName = (segment.match(/[A-Za-z_$][A-Za-z0-9_$]*/) || [null])[0];

    // 2. Fallback: backtick-quoted name in the message (`` `myvar` ``).
    if (!varName || varName === "lin") {
      const fromMsg = extractBacktickedToken(diagnostic.message || "");
      if (fromMsg && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(fromMsg)) {
        varName = fromMsg;
      }
    }
    if (!varName || varName.startsWith("_")) return [];

    // 3. Locate the precise byte range of `varName` to rename. Try the
    //    diagnostic segment first; then widen via analysis.linVars (which
    //    has a span from TS).
    let idStart = findSubstringInRange(text, startOff, endOff, varName);
    if (idStart < 0 && analysis?.linVars) {
      const lv = analysis.linVars.find((v) => v.name === varName && v.span);
      if (lv?.span?.start != null && lv.span.end != null) {
        idStart = findSubstringInRange(text, lv.span.start, lv.span.end, varName);
      }
    }
    // Final fallback: scan the whole buffer for the var name in a `lin` decl.
    if (idStart < 0) {
      const decl = text.match(new RegExp(`\\blin\\s+(${varName})\\b`));
      if (decl) idStart = decl.index + decl[0].lastIndexOf(varName);
    }
    if (idStart < 0) return [];

    return [makeQuickFix({
      title: `Prefix "${varName}" with "_" to silence E-LIN-001`,
      uri,
      range: {
        start: offsetToPosition(text, idStart),
        end: offsetToPosition(text, idStart + varName.length),
      },
      newText: "_" + varName,
      diagnostic,
    })];
  },

  // -------------------------------------------------------------------------
  // E-PA-007 — protect= field doesn't match any column in listed tables.
  // Quick-fix: rename to the closest column from the analysis.protectAnalysis
  // views' fullSchema entries.
  // -------------------------------------------------------------------------
  "E-PA-007": (ctx) => {
    const { diagnostic, text, uri, analysis } = ctx;
    if (!analysis?.protectAnalysis?.views) return [];
    const range = diagnostic.range;
    const startOff = positionToOffset(text, range.start);
    const endOff = positionToOffset(text, range.end);
    const segment = text.slice(startOff, endOff);

    // Prefer the message's backtick token (more precise).
    let offendingField = extractBacktickedToken(diagnostic.message || "");
    if (!offendingField || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(offendingField)) {
      offendingField = (segment.match(/[A-Za-z_][A-Za-z0-9_]*/) || [null])[0];
    }
    if (!offendingField) return [];

    // Find precise byte range of the field inside the segment.
    const fieldStart = findSubstringInRange(text, startOff, endOff, offendingField);
    if (fieldStart < 0) return [];
    const fieldEnd = fieldStart + offendingField.length;

    // Collect every column name across every view in the file.
    const allCols = new Set();
    for (const view of analysis.protectAnalysis.views.values()) {
      for (const tableView of view.tables?.values?.() || []) {
        for (const col of tableView.fullSchema || []) {
          if (col?.name) allCols.add(col.name);
        }
      }
    }
    if (allCols.size === 0) return [];
    const best = closestMatch(offendingField, Array.from(allCols));
    if (!best || best === offendingField) return [];

    return [makeQuickFix({
      title: `Rename protect field "${offendingField}" → "${best}"`,
      uri,
      range: {
        start: offsetToPosition(text, fieldStart),
        end: offsetToPosition(text, fieldEnd),
      },
      newText: best,
      diagnostic,
    })];
  },

  // -------------------------------------------------------------------------
  // E-SQL-006 — `.prepare()` removed (Bun.SQL caches automatically).
  // Quick-fix: drop the `.prepare()` call entirely. The diagnostic span
  // generally covers `.prepare()` or the surrounding expression; we look
  // for the literal substring and remove it (widening the search if needed).
  // -------------------------------------------------------------------------
  "E-SQL-006": (ctx) => {
    const { diagnostic, text, uri } = ctx;
    const range = diagnostic.range;
    const startOff = positionToOffset(text, range.start);
    const endOff = positionToOffset(text, range.end);
    const segment = text.slice(startOff, endOff);
    // Look for `.prepare()` (with optional whitespace inside parens).
    const prepareRe = /\.prepare\s*\(\s*\)/;
    const inSegment = segment.match(prepareRe);
    if (inSegment) {
      const matchStart = startOff + segment.indexOf(inSegment[0]);
      return [makeQuickFix({
        title: `Drop ".prepare()" — Bun.SQL caches automatically`,
        uri,
        range: {
          start: offsetToPosition(text, matchStart),
          end: offsetToPosition(text, matchStart + inSegment[0].length),
        },
        newText: "",
        diagnostic,
      })];
    }
    // Maybe the diagnostic only spans `.prepare` part — widen the search.
    const widerStart = Math.max(0, startOff - 10);
    const widerEnd = Math.min(text.length, endOff + 10);
    const widerSegment = text.slice(widerStart, widerEnd);
    const m = widerSegment.match(prepareRe);
    if (!m) return [];
    const matchStart = widerStart + widerSegment.indexOf(m[0]);
    return [makeQuickFix({
      title: `Drop ".prepare()" — Bun.SQL caches automatically`,
      uri,
      range: {
        start: offsetToPosition(text, matchStart),
        end: offsetToPosition(text, matchStart + m[0].length),
      },
      newText: "",
      diagnostic,
    })];
  },
};

/**
 * Return the set of error codes for which this module ships a quick-fix.
 */
export function supportedQuickFixCodes() {
  return Object.keys(QUICK_FIX_BUILDERS);
}

/**
 * Build an array of `CodeAction` for the given LSP CodeAction request.
 *
 * Inputs:
 *   - text       current buffer contents
 *   - uri        LSP URI
 *   - context    LSP CodeActionContext { diagnostics: Diagnostic[], only?, triggerKind? }
 *   - analysis   per-file analysis cache (may be null)
 *   - workspace  L2 workspace cache (may be null)
 *   - filePath   absolute path of the diagnosed file
 *
 * Returns an array (possibly empty) of CodeAction objects with kind
 * "quickfix".
 */
export function buildCodeActions(text, uri, context, analysis, workspace, filePath) {
  if (!context || !Array.isArray(context.diagnostics)) return [];
  // If the client filtered to non-quickfix kinds, bail.
  if (context.only && Array.isArray(context.only)) {
    const wantsQuickFix = context.only.some((k) =>
      k === CodeActionKind.QuickFix || (typeof k === "string" && k.startsWith("quickfix"))
    );
    if (!wantsQuickFix) return [];
  }

  const out = [];
  for (const diag of context.diagnostics) {
    if (!diag || !diag.code) continue;
    const builder = QUICK_FIX_BUILDERS[diag.code];
    if (!builder) continue;
    const actions = builder({
      diagnostic: diag,
      text,
      uri,
      analysis,
      workspace,
      filePath,
    });
    for (const a of actions || []) out.push(a);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Position helpers
// ---------------------------------------------------------------------------

/**
 * Convert an LSP Position { line, character } to a byte offset in `text`.
 * Inverse of `offsetToPosition` from handlers.js.
 */
export function positionToOffset(text, position) {
  if (!position) return 0;
  let line = 0;
  let col = 0;
  for (let i = 0; i < text.length; i++) {
    if (line === position.line && col === position.character) return i;
    if (text[i] === "\n") {
      line++;
      col = 0;
    } else {
      col++;
    }
  }
  return text.length;
}

// Re-export pathToUri so server.js / tests can import it from a single
// module without round-tripping through handlers.js.
export { pathToUri };

// Silence "unused import" lint on the few imports that only appear in
// secondary code paths. (No-op at runtime.)
void MarkupKind;
