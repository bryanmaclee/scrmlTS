/**
 * scrml LSP — pure handler logic.
 *
 * This module exports the analysis + per-feature handler functions used by
 * `lsp/server.js`. They are split out so they can be unit-tested without
 * booting an LSP transport (which `createConnection` requires at module
 * load time).
 *
 * No side effects on import. No I/O. Inputs are already-parsed TextDocument
 * contents; outputs are LSP-shaped (DocumentSymbol[], CompletionItem[],
 * Hover, Diagnostic[], etc).
 */

import {
  DiagnosticSeverity,
  CompletionItemKind,
  MarkupKind,
  SymbolKind,
} from "vscode-languageserver/node";

// Import compiler stages directly. Same set as server.js.
import { splitBlocks } from "../compiler/src/block-splitter.js";
import { buildAST } from "../compiler/src/ast-builder.js";
import { runBPP } from "../compiler/src/body-pre-parser.js";
import { runPA } from "../compiler/src/protect-analyzer.js";
import { runRI } from "../compiler/src/route-inference.js";
import { runTS } from "../compiler/src/type-system.js";
import { runDG } from "../compiler/src/dependency-graph.js";

// L2 — workspace cache for cross-file go-to-def + diagnostics.
import {
  lookupCrossFileDefinition,
  getCrossFileDiagnosticsFor,
} from "./workspace.js";

// ---------------------------------------------------------------------------
// Span / Range helpers
// ---------------------------------------------------------------------------

/**
 * Convert a byte offset to LSP { line, character } position.
 */
export function offsetToPosition(text, offset) {
  let line = 0;
  let lastNewline = -1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      lastNewline = i;
    }
  }
  return { line, character: offset - lastNewline - 1 };
}

/**
 * Convert a span { line, col, start?, end? } to an LSP Range.
 * Span line/col are 1-based; LSP ranges are 0-based.
 */
export function spanToRange(span, text) {
  if (!span) return { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
  const line = Math.max(0, (span.line ?? 1) - 1);
  const col = Math.max(0, (span.col ?? 1) - 1);

  if (span.start != null && span.end != null && text) {
    const startPos = offsetToPosition(text, span.start);
    const endPos = offsetToPosition(text, Math.min(span.end, text.length));
    return { start: startPos, end: endPos };
  }

  return {
    start: { line, character: col },
    end: { line, character: col + 20 },
  };
}

/**
 * Build a selection range covering just an identifier name within a span.
 */
export function nameRange(span, name, text) {
  if (!span || !name || !text) return spanToRange(span || { line: 1, col: 1 }, text);
  const fullRange = spanToRange(span, text);
  if (span.start == null || span.end == null) return fullRange;
  const segment = text.slice(span.start, span.end);
  const idx = segment.indexOf(name);
  if (idx < 0) return fullRange;
  const nameStart = span.start + idx;
  const nameEnd = nameStart + name.length;
  return {
    start: offsetToPosition(text, nameStart),
    end: offsetToPosition(text, nameEnd),
  };
}

/**
 * Convert an absolute filesystem path to a `file://` URI. Used by L2
 * cross-file go-to-def so the LSP client can open the foreign file.
 */
export function pathToUri(filePath) {
  if (!filePath) return "";
  if (filePath.startsWith("file://")) return filePath;
  // Encode each path segment but preserve the slashes.
  const encoded = filePath.split("/").map(encodeURIComponent).join("/");
  return "file://" + encoded;
}

// ---------------------------------------------------------------------------
// Diagnostics — error code → human-readable source/severity
// ---------------------------------------------------------------------------

export function extractSpan(error) {
  if (error.span) {
    return {
      line: error.span.line ?? 1,
      col: error.span.col ?? 1,
      endLine: error.span.endLine,
      endCol: error.span.endCol,
      start: error.span.start,
      end: error.span.end,
    };
  }
  if (error.bsSpan) {
    return {
      line: error.bsSpan.line ?? 1,
      col: error.bsSpan.col ?? 1,
      start: error.bsSpan.start,
      end: error.bsSpan.end,
    };
  }
  if (error.tabSpan) {
    return {
      line: error.tabSpan.line ?? 1,
      col: error.tabSpan.col ?? 1,
      start: error.tabSpan.start,
      end: error.tabSpan.end,
    };
  }
  return { line: 1, col: 1 };
}

export function getDiagnosticSeverity(error) {
  if (error.severity === "warning") return DiagnosticSeverity.Warning;
  if (error.code?.startsWith("W-")) return DiagnosticSeverity.Warning;
  if (error.code?.startsWith("E-ROUTE-")) return DiagnosticSeverity.Warning;
  return DiagnosticSeverity.Error;
}

export function getErrorSource(code) {
  if (!code) return "scrml";
  if (code.startsWith("E-CTX-") || code.startsWith("E-BS-")) return "scrml/block-splitter";
  if (code.startsWith("E-TAB-") || code.startsWith("E-MARKUP-") || code.startsWith("E-STATE-")) return "scrml/tokenizer";
  if (code.startsWith("E-BPP-")) return "scrml/body-pre-parser";
  if (code.startsWith("E-IMPORT-")) return "scrml/module-resolver";
  if (code.startsWith("E-PA-")) return "scrml/protect-analyzer";
  if (code.startsWith("E-RI-") || code.startsWith("E-ROUTE-")) return "scrml/route-inference";
  if (code.startsWith("E-TYPE-") || code.startsWith("E-SCOPE-") || code.startsWith("E-PURE-") || code.startsWith("E-LIN-") || code.startsWith("E-TILDE-") || code.startsWith("W-MATCH-")) return "scrml/type-system";
  if (code.startsWith("E-DG-") || code.startsWith("E-LIFT-") || code.startsWith("W-DG-")) return "scrml/dependency-graph";
  if (code.startsWith("E-CG-")) return "scrml/code-generator";
  return "scrml";
}

// ---------------------------------------------------------------------------
// Analysis (compiler pipeline → analysis cache entry)
// ---------------------------------------------------------------------------

/**
 * Run the compiler pipeline on `text` and return both diagnostics and an
 * analysis object containing the AST + extracted symbol info.
 *
 * `logger` is an optional `(msg) => void` for non-fatal stage warnings.
 * If omitted, warnings are silently dropped.
 *
 * `workspace` (L2, optional): when provided, cross-file `E-IMPORT-*`
 * diagnostics from the workspace cache are merged into the diagnostics
 * array so import-resolution errors surface in the editor on the importer's
 * line.
 */
export function analyzeText(filePath, text, logger, workspace) {
  const log = logger || (() => {});
  const diagnostics = [];
  const analysis = {
    ast: null,
    text,
    reactiveVars: [],
    tildeVars: [],
    linVars: [],
    functions: [],
    types: [],
    machines: [],
    components: [],
    stateBlocks: [],
    stateConstructors: [],
  };

  let bsResult;
  try {
    bsResult = splitBlocks(filePath, text);
  } catch (e) {
    pushError(diagnostics, e, text, "E-BS-000");
    return { diagnostics, analysis };
  }

  let tabResult;
  try {
    tabResult = buildAST(bsResult);
  } catch (e) {
    pushError(diagnostics, e, text, "E-TAB-000");
    return { diagnostics, analysis };
  }

  if (tabResult.errors?.length > 0) {
    for (const e of tabResult.errors) pushError(diagnostics, e, text);
  }

  if (tabResult.ast) {
    analysis.ast = tabResult.ast;
    extractAnalysisInfo(tabResult.ast, analysis);
  }

  let bppResult;
  try {
    bppResult = runBPP({ files: [tabResult] });
    if (bppResult.errors?.length > 0) {
      for (const e of bppResult.errors) pushError(diagnostics, e, text);
    }
  } catch (e) {
    log(`BPP error: ${e.message}`);
  }

  const files = bppResult?.files ?? [tabResult];

  let paResult = { protectAnalysis: { views: new Map() }, errors: [] };
  try {
    paResult = runPA({ files });
    if (paResult.errors?.length > 0) {
      for (const e of paResult.errors) pushError(diagnostics, e, text);
    }
  } catch (e) {
    log(`PA error: ${e.message}`);
  }

  let riResult = { routeMap: { functions: new Map() }, errors: [] };
  try {
    riResult = runRI({ files, protectAnalysis: paResult.protectAnalysis });
    if (riResult.errors?.length > 0) {
      for (const e of riResult.errors) pushError(diagnostics, e, text);
    }
  } catch (e) {
    log(`RI error: ${e.message}`);
  }

  try {
    const tsResult = runTS({
      files,
      protectAnalysis: paResult.protectAnalysis,
      routeMap: riResult.routeMap,
    });
    if (tsResult.errors?.length > 0) {
      for (const e of tsResult.errors) pushError(diagnostics, e, text);
    }
    try {
      const dgResult = runDG({
        files: tsResult.files || files,
        routeMap: riResult.routeMap,
      });
      if (dgResult.errors?.length > 0) {
        for (const e of dgResult.errors) pushError(diagnostics, e, text);
      }
    } catch (e) {
      log(`DG error: ${e.message}`);
    }
  } catch (e) {
    log(`TS error: ${e.message}`);
  }

  // L2 — append cross-file diagnostics from the workspace cache. The cache
  // owns the latest E-IMPORT-* errors for this file's import declarations
  // (e.g. importing a non-exported name surfaces here).
  if (workspace) {
    const crossFile = getCrossFileDiagnosticsFor(workspace, filePath);
    for (const e of crossFile) pushError(diagnostics, e, text);
  }

  return { diagnostics, analysis };
}

function pushError(diagnostics, e, text, fallbackCode) {
  const span = extractSpan(e);
  diagnostics.push({
    severity: getDiagnosticSeverity(e),
    range: spanToRange(span, text),
    message: e.message || String(e),
    source: getErrorSource(e.code),
    code: e.code || fallbackCode || "E-UNKNOWN",
  });
}

/**
 * Walk the AST and populate analysis.{reactiveVars, functions, types, ...}.
 *
 * NOTE: AST node `kind` is lowercase-kebab in the canonical AST shape
 * (`function-decl`, `reactive-decl`, etc).
 */
export function extractAnalysisInfo(ast, analysis) {
  if (!ast) return;

  if (Array.isArray(ast.typeDecls)) {
    for (const td of ast.typeDecls) {
      analysis.types.push({
        name: td.name,
        span: td.span,
        typeKind: td.typeKind || "type",
        raw: td.raw || "",
      });
    }
  }
  if (Array.isArray(ast.machineDecls)) {
    for (const md of ast.machineDecls) {
      analysis.machines.push({
        name: md.machineName,
        span: md.span,
        governedType: md.governedType || "",
        sourceVar: md.sourceVar || null,
      });
    }
  }
  if (Array.isArray(ast.components)) {
    for (const c of ast.components) {
      analysis.components.push({
        name: c.name,
        span: c.span,
      });
    }
  }

  if (!ast.nodes) return;

  function walkNodes(nodes, parentStateType) {
    for (const node of nodes) {
      if (!node) continue;
      switch (node.kind) {
        case "state": {
          analysis.stateBlocks.push({
            stateType: node.stateType,
            span: node.span,
            attrs: node.attrs || [],
          });
          if (Array.isArray(node.children)) walkNodes(node.children, node.stateType);
          break;
        }
        case "state-constructor-def": {
          analysis.stateConstructors.push({
            stateType: node.stateType,
            span: node.span,
            typedAttrs: node.typedAttrs || [],
          });
          if (Array.isArray(node.children)) walkNodes(node.children, node.stateType);
          break;
        }
        case "machine-decl":
          break; // already captured via ast.machineDecls
        case "logic": {
          if (Array.isArray(node.body)) walkLogicNodes(node.body, parentStateType);
          if (Array.isArray(node.components)) {
            for (const c of node.components) {
              if (!analysis.components.find(x => x.name === c.name)) {
                analysis.components.push({ name: c.name, span: c.span });
              }
            }
          }
          if (Array.isArray(node.typeDecls)) {
            for (const td of node.typeDecls) {
              if (!analysis.types.find(x => x.name === td.name)) {
                analysis.types.push({
                  name: td.name,
                  span: td.span,
                  typeKind: td.typeKind || "type",
                  raw: td.raw || "",
                });
              }
            }
          }
          break;
        }
        case "markup":
          if (Array.isArray(node.children)) walkNodes(node.children, parentStateType);
          break;
        case "meta":
          if (Array.isArray(node.body)) walkLogicNodes(node.body, parentStateType);
          break;
        default:
          break;
      }
    }
  }

  function walkLogicNodes(nodes, parentStateType) {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (!node) continue;
      switch (node.kind) {
        case "function-decl": {
          analysis.functions.push({
            name: node.name,
            span: node.span,
            params: node.params || [],
            isServer: !!node.isServer,
            fnKind: node.fnKind || "function",
            isGenerator: !!node.isGenerator,
            canFail: !!node.canFail,
            errorType: node.errorType || null,
            stateTypeScope: node.stateTypeScope || parentStateType || null,
            isHandleEscapeHatch: !!node.isHandleEscapeHatch,
          });
          if (Array.isArray(node.body)) walkLogicNodes(node.body, parentStateType);
          break;
        }
        case "reactive-decl": {
          analysis.reactiveVars.push({
            name: node.name?.startsWith("@") ? node.name.slice(1) : node.name,
            span: node.span,
            type: node.typeAnnotation || null,
            reactiveKind: "reactive",
            isShared: !!node.isShared,
          });
          break;
        }
        case "reactive-derived-decl": {
          analysis.reactiveVars.push({
            name: node.name?.startsWith("@") ? node.name.slice(1) : node.name,
            span: node.span,
            type: null,
            reactiveKind: "derived",
          });
          break;
        }
        case "reactive-debounced-decl": {
          analysis.reactiveVars.push({
            name: node.name?.startsWith("@") ? node.name.slice(1) : node.name,
            span: node.span,
            type: null,
            reactiveKind: "debounced",
            delay: node.delay,
          });
          break;
        }
        case "tilde-decl":
          analysis.tildeVars.push({ name: node.name, span: node.span });
          break;
        case "lin-decl":
          analysis.linVars.push({ name: node.name, span: node.span });
          break;
        case "type-decl":
          if (!analysis.types.find(x => x.name === node.name)) {
            analysis.types.push({
              name: node.name,
              span: node.span,
              typeKind: node.typeKind || "type",
              raw: node.raw || "",
            });
          }
          break;
        case "component-def":
          if (!analysis.components.find(x => x.name === node.name)) {
            analysis.components.push({ name: node.name, span: node.span });
          }
          break;
        case "if-stmt":
          if (Array.isArray(node.consequent)) walkLogicNodes(node.consequent, parentStateType);
          if (Array.isArray(node.alternate)) walkLogicNodes(node.alternate, parentStateType);
          break;
        case "for-stmt":
        case "while-stmt":
        case "transaction-block":
          if (Array.isArray(node.body)) walkLogicNodes(node.body, parentStateType);
          break;
        case "switch-stmt":
          if (Array.isArray(node.cases)) {
            for (const c of node.cases) {
              if (Array.isArray(c.body)) walkLogicNodes(c.body, parentStateType);
            }
          }
          break;
        case "try-stmt":
          if (Array.isArray(node.body)) walkLogicNodes(node.body, parentStateType);
          if (Array.isArray(node.catchBody)) walkLogicNodes(node.catchBody, parentStateType);
          if (Array.isArray(node.finallyBody)) walkLogicNodes(node.finallyBody, parentStateType);
          break;
        case "match-stmt":
          if (Array.isArray(node.arms)) {
            for (const arm of node.arms) {
              if (Array.isArray(arm.body)) walkLogicNodes(arm.body, parentStateType);
            }
          }
          break;
        case "markup":
          if (Array.isArray(node.children)) walkNodes(node.children, parentStateType);
          break;
        default:
          break;
      }
    }
  }

  walkNodes(ast.nodes, null);
}

// ---------------------------------------------------------------------------
// Function signature formatter (used by hover and document-symbol detail)
// ---------------------------------------------------------------------------

export function formatFunctionSignature(fn) {
  const boundary = fn.isServer ? "server" : "client";
  const kindWord = fn.fnKind === "fn" ? "fn" : "function";
  const generator = fn.isGenerator ? "*" : "";
  const failMarker = fn.canFail ? (fn.errorType ? `! -> ${fn.errorType}` : "!") : "";
  const params = (fn.params || [])
    .map(p => (typeof p === "string" ? p : p?.name || ""))
    .filter(Boolean)
    .join(", ");
  return `${kindWord}${generator} ${fn.name}(${params})${failMarker ? " " + failMarker : ""} [${boundary}]`;
}

// ---------------------------------------------------------------------------
// Document symbols (L1)
// ---------------------------------------------------------------------------

/**
 * Build a hierarchical DocumentSymbol[] tree for an analyzed AST.
 *
 * Symbol mapping:
 *   - <state> block (e.g. < db>)        → Module    (children = nested decls)
 *   - state-constructor-def              → Class     (children = constructor body)
 *   - machine-decl                       → Class
 *   - type-decl  (typeKind=enum)         → Enum
 *   - type-decl  (typeKind=struct)       → Struct
 *   - type-decl  (other)                 → Interface
 *   - function-decl (server)             → Method
 *   - function-decl (client)             → Function
 *   - component-def                      → Class
 *   - reactive-decl / -derived / -debounced → Variable
 *   - tilde-decl                         → Variable
 *   - lin-decl                           → Variable
 */
export function buildDocumentSymbols(ast, text) {
  if (!ast || !ast.nodes) return [];

  function symbolFor(node, parentStateScope) {
    if (!node) return null;
    switch (node.kind) {
      case "state": {
        const sym = {
          name: `<${node.stateType}>`,
          detail: "state block",
          kind: SymbolKind.Module,
          range: spanToRange(node.span, text),
          selectionRange: nameRange(node.span, node.stateType, text),
          children: [],
        };
        if (Array.isArray(node.children)) {
          for (const ch of node.children) {
            for (const cs of collectChildSymbols(ch, node.stateType)) sym.children.push(cs);
          }
        }
        return sym;
      }
      case "state-constructor-def": {
        const sym = {
          name: node.stateType,
          detail: "state constructor definition",
          kind: SymbolKind.Class,
          range: spanToRange(node.span, text),
          selectionRange: nameRange(node.span, node.stateType, text),
          children: [],
        };
        if (Array.isArray(node.typedAttrs)) {
          for (const ta of node.typedAttrs) {
            sym.children.push({
              name: ta.name,
              detail: ta.typeExpr + (ta.optional ? "?" : "") + (ta.defaultValue != null ? ` = ${ta.defaultValue}` : ""),
              kind: SymbolKind.Field,
              range: spanToRange(ta.span, text),
              selectionRange: nameRange(ta.span, ta.name, text),
              children: [],
            });
          }
        }
        if (Array.isArray(node.children)) {
          for (const ch of node.children) {
            for (const cs of collectChildSymbols(ch, node.stateType)) sym.children.push(cs);
          }
        }
        return sym;
      }
      case "machine-decl":
        return {
          name: node.machineName,
          detail: `machine for ${node.governedType}${node.sourceVar ? ` (derived @${node.sourceVar})` : ""}`,
          kind: SymbolKind.Class,
          range: spanToRange(node.span, text),
          selectionRange: nameRange(node.span, node.machineName, text),
          children: [],
        };
      case "logic": {
        const children = [];
        if (Array.isArray(node.body)) {
          for (const stmt of node.body) {
            const cs = logicStatementSymbol(stmt, parentStateScope);
            if (cs) children.push(cs);
          }
        }
        if (Array.isArray(node.components)) {
          for (const c of node.components) {
            if (!children.find(s => s.name === c.name)) {
              children.push({
                name: c.name,
                detail: "component",
                kind: SymbolKind.Class,
                range: spanToRange(c.span, text),
                selectionRange: nameRange(c.span, c.name, text),
                children: [],
              });
            }
          }
        }
        if (Array.isArray(node.typeDecls)) {
          for (const td of node.typeDecls) {
            if (!children.find(s => s.name === td.name)) {
              children.push(typeDeclSymbol(td));
            }
          }
        }
        return { __flatten: true, children };
      }
      case "markup": {
        const children = [];
        if (Array.isArray(node.children)) {
          for (const ch of node.children) {
            for (const cs of collectChildSymbols(ch, parentStateScope)) children.push(cs);
          }
        }
        return { __flatten: true, children };
      }
      case "meta": {
        const children = [];
        if (Array.isArray(node.body)) {
          for (const stmt of node.body) {
            const cs = logicStatementSymbol(stmt, parentStateScope);
            if (cs) children.push(cs);
          }
        }
        if (children.length === 0) return null;
        return {
          name: "^{ meta }",
          detail: "compile-time block",
          kind: SymbolKind.Namespace,
          range: spanToRange(node.span, text),
          selectionRange: spanToRange(node.span, text),
          children,
        };
      }
      default:
        return null;
    }
  }

  function collectChildSymbols(node, parentStateScope) {
    const sym = symbolFor(node, parentStateScope);
    if (!sym) return [];
    if (sym.__flatten) return sym.children;
    return [sym];
  }

  function logicStatementSymbol(stmt, parentStateScope) {
    if (!stmt) return null;
    switch (stmt.kind) {
      case "function-decl": {
        const detail = formatFunctionSignature({
          name: stmt.name,
          isServer: !!stmt.isServer,
          fnKind: stmt.fnKind,
          isGenerator: !!stmt.isGenerator,
          canFail: !!stmt.canFail,
          errorType: stmt.errorType,
          params: stmt.params || [],
        });
        return {
          name: stmt.name,
          detail,
          kind: stmt.isServer ? SymbolKind.Method : SymbolKind.Function,
          range: spanToRange(stmt.span, text),
          selectionRange: nameRange(stmt.span, stmt.name, text),
          children: [],
        };
      }
      case "reactive-decl":
      case "reactive-derived-decl":
      case "reactive-debounced-decl": {
        const baseName = stmt.name?.startsWith("@") ? stmt.name.slice(1) : stmt.name;
        const detailMap = {
          "reactive-decl": "@reactive" + (stmt.isShared ? " (shared)" : ""),
          "reactive-derived-decl": "@derived",
          "reactive-debounced-decl": `@debounced(${stmt.delay ?? 300})`,
        };
        return {
          name: `@${baseName}`,
          detail: detailMap[stmt.kind] || "@reactive",
          kind: SymbolKind.Variable,
          range: spanToRange(stmt.span, text),
          selectionRange: nameRange(stmt.span, baseName, text),
          children: [],
        };
      }
      case "tilde-decl":
        return {
          name: stmt.name,
          detail: "~ (must-use)",
          kind: SymbolKind.Variable,
          range: spanToRange(stmt.span, text),
          selectionRange: nameRange(stmt.span, stmt.name, text),
          children: [],
        };
      case "lin-decl":
        return {
          name: stmt.name,
          detail: "lin (linear)",
          kind: SymbolKind.Variable,
          range: spanToRange(stmt.span, text),
          selectionRange: nameRange(stmt.span, stmt.name, text),
          children: [],
        };
      case "type-decl":
        return typeDeclSymbol(stmt);
      case "component-def":
        return {
          name: stmt.name,
          detail: "component",
          kind: SymbolKind.Class,
          range: spanToRange(stmt.span, text),
          selectionRange: nameRange(stmt.span, stmt.name, text),
          children: [],
        };
      case "transaction-block": {
        const children = [];
        if (Array.isArray(stmt.body)) {
          for (const s of stmt.body) {
            const cs = logicStatementSymbol(s, parentStateScope);
            if (cs) children.push(cs);
          }
        }
        if (children.length === 0) return null;
        return {
          name: "transaction",
          detail: "transaction block",
          kind: SymbolKind.Namespace,
          range: spanToRange(stmt.span, text),
          selectionRange: spanToRange(stmt.span, text),
          children,
        };
      }
      default:
        return null;
    }
  }

  function typeDeclSymbol(td) {
    const kindMap = {
      "enum": SymbolKind.Enum,
      "struct": SymbolKind.Struct,
    };
    const symKind = kindMap[td.typeKind] || SymbolKind.Interface;
    return {
      name: td.name,
      detail: td.typeKind ? `type :${td.typeKind}` : "type",
      kind: symKind,
      range: spanToRange(td.span, text),
      selectionRange: nameRange(td.span, td.name, text),
      children: [],
    };
  }

  const symbols = [];
  for (const node of ast.nodes) {
    for (const cs of collectChildSymbols(node, null)) symbols.push(cs);
  }

  // Deduplicate sibling symbols by (kind, name, line) to avoid double-emit
  // when a node appears both in ast.machineDecls and ast.nodes top-level.
  const seen = new Set();
  const out = [];
  for (const s of symbols) {
    const key = `${s.kind}::${s.name}::${s.range.start.line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Hover
// ---------------------------------------------------------------------------

export const ERROR_DESCRIPTIONS = {
  // Block Splitter
  "E-CTX-001": "Wrong closer for current context. Mismatched closing tag, or wrong delimiter for the current block type.",
  "E-CTX-002": "Bare `/` or trailing `/` used inside a logic/sql/css/error-effect/meta context. Use explicit closers in brace-delimited blocks.",
  "E-CTX-003": "Unclosed context at end of file. A tag or brace-delimited block was opened but never closed.",
  // Tokenizer / AST Builder
  "E-TAB-001": "Syntax error in tokenization. The token stream could not be parsed.",
  "E-TAB-002": "Unexpected token in AST construction.",
  // Body Pre-Parser
  "E-BPP-001": "Parse failure in a function/pure/fn body. The body could not be tokenized or parsed into a LogicNode tree.",
  // Module Resolver (L2)
  "E-IMPORT-002": "Circular import detected. Break the cycle by extracting shared code into a third file.",
  "E-IMPORT-004": "Imported name is not exported by the target file. Check the file's exports or add the missing export.",
  "E-IMPORT-005": "Bare npm-style import specifier. scrml requires `./relative`, `scrml:stdlib`, or `vendor:vendor` prefixes.",
  "E-IMPORT-006": "Cannot resolve import — no file found at the given path.",
  // Protect Analyzer
  "E-PA-001": "src= database file does not exist on disk.",
  "E-PA-003": "Bun SQLite schema introspection failed.",
  "E-PA-004": "tables= references a table not found in the database.",
  "E-PA-005": "tables= attribute is absent or its parsed value is empty.",
  "E-PA-006": "src= attribute is absent from a <db> block.",
  "E-PA-007": "protect= field matches no column in any listed table (security error).",
  // Route Inference
  "E-RI-002": "Server-escalated function assigns to @reactive variable. Server functions cannot write client-side reactive state.",
  "E-ROUTE-001": "Unresolvable callee. A function call target could not be statically resolved.",
  // Type System
  "E-SCOPE-001": "Unquoted identifier attribute value cannot be resolved in current scope.",
  "E-TYPE-004": "Struct field does not exist on the given type.",
  "E-TYPE-006": "Non-exhaustive match over union type. Not all members are covered.",
  "E-TYPE-020": "Non-exhaustive match over enum type. Not all variants are covered.",
  "E-TYPE-023": "Duplicate arm for the same variant in a match expression.",
  "E-TYPE-050": "Two tables (or a table + user type) produce the same generated type name.",
  "E-TYPE-051": "ColumnDef.sqlType not mappable to a scrml type. Typed as-is (warning).",
  "E-TYPE-052": "InitCap algorithm produces an invalid scrml identifier from a table name.",
  "E-PURE-001": "Pure function body contains a purity violation (side effect).",
  "E-PURE-002": "Pure function calls a non-pure function.",
  "E-LIN-001": "Linear variable not consumed before scope exit.",
  "E-LIN-002": "Linear variable consumed more than once (or inside a loop).",
  "E-LIN-003": "Linear variable consumed in some branches but not others.",
  "E-TILDE-001": "~ read without initialization.",
  "E-TILDE-002": "~ reinitialized without consumption (or unconsumed at scope exit).",
  "W-MATCH-001": "Redundant wildcard arm when all variants are already covered (warning).",
  // Dependency Graph
  "E-DG-001": "Cyclic dependency detected in 'awaits' edges.",
  "E-DG-002": "Reactive variable has no readers (warning).",
  "E-LIFT-001": "Independent lift-bearing nodes in the same logic block. Two parallel operations both use `lift`, which creates ordering ambiguity.",
  // Code Generator
  "E-CG-001": "Node with unknown type encountered during codegen.",
  "E-CG-002": "Server-boundary function has no generated route name.",
  "E-CG-003": "Dependency graph edge references unknown node ID.",
  "E-CG-004": "CSS scoping collision.",
  "E-CG-005": "Non-deterministic MetaBlock with meta.runtime === false.",
};

const KEYWORD_DOCS = {
  "lift": "**lift** -- Lifts markup content from a loop body into the parent rendering context.\n\nUsed inside `for` loops within `${}` blocks to emit markup for each iteration.",
  "protect": "**protect=** -- Specifies which database fields should be protected from client exposure.\n\nFields listed in `protect=` are only accessible in server-routed functions.",
  "match": "**match** -- Pattern matching expression (Rust-style).\n\nMatches a value against enum variants, union types, or literal patterns. Must be exhaustive.",
  "pure": "**pure** -- Declares a pure function with no side effects.\n\nPure functions cannot read/write @reactive state, perform I/O, or call non-pure functions.",
  "server": "**server** -- Marks a function as server-only.\n\nThe compiler generates a server route and client-side fetch stub automatically.",
  "lin": "**lin** -- Linear type declaration.\n\nA `lin` variable must be consumed exactly once before scope exit. Cannot be used in loops.",
};

/**
 * Return Hover for the word at `offset`, or null.
 */
export function buildHover(text, offset, analysis) {
  const word = getWordAtOffset(text, offset);
  if (!word) return null;

  // @variable
  if (word.startsWith("@")) {
    const varName = word.slice(1);
    if (analysis?.reactiveVars) {
      const rv = analysis.reactiveVars.find(
        (v) => (v.name?.startsWith("@") ? v.name.slice(1) : v.name) === varName
      );
      if (rv) {
        const kindBadge = rv.reactiveKind === "derived"
          ? "(reactive, derived)"
          : rv.reactiveKind === "debounced"
            ? `(reactive, debounced ${rv.delay ?? 300}ms)`
            : "(reactive)";
        const sharedTag = rv.isShared ? " (shared)" : "";
        const lines = [`**@${varName}** ${kindBadge}${sharedTag}`];
        if (rv.type) lines.push("", `Type: \`${rv.type}\``);
        return { contents: { kind: MarkupKind.Markdown, value: lines.join("\n") } };
      }
    }
    return { contents: { kind: MarkupKind.Markdown, value: `**@${varName}** (reactive)` } };
  }

  // Error codes
  if (/^[EW]-[A-Z]+-\d+$/.test(word)) {
    const desc = ERROR_DESCRIPTIONS[word];
    if (desc) return { contents: { kind: MarkupKind.Markdown, value: `**${word}**\n\n${desc}` } };
  }

  // Keywords
  if (KEYWORD_DOCS[word]) {
    return { contents: { kind: MarkupKind.Markdown, value: KEYWORD_DOCS[word] } };
  }

  // Tilde (must-use) variable
  if (analysis?.tildeVars) {
    const tv = analysis.tildeVars.find((v) => v.name === word);
    if (tv) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**${word}** (must-use, ~)\n\nA tilde-typed variable must be read at least once before reassignment or scope exit.`,
        },
      };
    }
  }

  // Linear variable
  if (analysis?.linVars) {
    const lv = analysis.linVars.find((v) => v.name === word);
    if (lv) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**${word}** (linear)\n\nA linear variable must be consumed exactly once before scope exit. Cannot be used inside loops.`,
        },
      };
    }
  }

  // Function names — full signature, boundary, failure modes.
  if (analysis?.functions) {
    const fn = analysis.functions.find((f) => f.name === word);
    if (fn) {
      const lines = [`**${word}**`, "", "```scrml", formatFunctionSignature(fn), "```"];
      if (fn.stateTypeScope) lines.push("", `_Defined inside state \`${fn.stateTypeScope}\`._`);
      if (fn.isHandleEscapeHatch) lines.push("", "_handle() escape hatch: receives the raw request and bypasses route inference._");
      return { contents: { kind: MarkupKind.Markdown, value: lines.join("\n") } };
    }
  }

  // Type names
  if (analysis?.types) {
    const t = analysis.types.find((td) => td.name === word);
    if (t) {
      const lines = [`**${word}** -- ${t.typeKind || "type"}`];
      if (t.raw) {
        lines.push("", "```scrml", `type ${t.name}${t.typeKind ? ":" + t.typeKind : ""} = ${t.raw}`, "```");
      }
      return { contents: { kind: MarkupKind.Markdown, value: lines.join("\n") } };
    }
  }

  // Machine names
  if (analysis?.machines) {
    const m = analysis.machines.find((md) => md.name === word);
    if (m) {
      const lines = [`**${word}** -- machine for \`${m.governedType}\``];
      if (m.sourceVar) lines.push("", `_Derived from @${m.sourceVar}._`);
      return { contents: { kind: MarkupKind.Markdown, value: lines.join("\n") } };
    }
  }

  // Component names
  if (analysis?.components) {
    const c = analysis.components.find((co) => co.name === word);
    if (c) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**${word}** -- component\n\n_Cross-file prop completion lands in L3._`,
        },
      };
    }
  }

  return null;
}

export function getWordAtOffset(text, offset) {
  if (offset < 0 || offset >= text.length) return null;
  let start = offset;
  while (start > 0 && /[\w@\-]/.test(text[start - 1])) start--;
  let end = offset;
  while (end < text.length && /[\w\-]/.test(text[end])) end++;
  const word = text.substring(start, end);
  return word.length > 0 ? word : null;
}

// ---------------------------------------------------------------------------
// Definition
// ---------------------------------------------------------------------------

/**
 * Resolve the declaration site of the symbol under the cursor.
 *
 * `uri`       LSP URI of the file the user is editing.
 * `text`      current buffer contents.
 * `offset`    cursor offset.
 * `analysis`  same-file analysis cache.
 * `workspace` (L2, optional) workspace cache. When provided, an unresolved
 *             same-file lookup falls through to a cross-file lookup that
 *             walks the file's import declarations and follows them to the
 *             foreign declaration. The returned Location's `uri` points
 *             into the foreign file.
 * `filePath`  (L2, optional) absolute path of the importing file. Required
 *             when `workspace` is supplied so the cross-file lookup can
 *             find the importer's import-graph entry. Falls back to
 *             converting `uri` if omitted.
 *
 * Returns an LSP Location, or null if no definition was found.
 */
export function buildDefinitionLocation(uri, text, offset, analysis, workspace, filePath) {
  if (!analysis && !workspace) return null;
  const word = getWordAtOffset(text, offset);
  if (!word) return null;
  const varName = word.startsWith("@") ? word.slice(1) : word;

  if (analysis) {
    if (word.startsWith("@") && analysis.reactiveVars) {
      const rv = analysis.reactiveVars.find(
        (v) => (v.name?.startsWith("@") ? v.name.slice(1) : v.name) === varName
      );
      if (rv?.span) return { uri, range: spanToRange(rv.span, text) };
    }
    if (analysis.functions) {
      const fn = analysis.functions.find((f) => f.name === word);
      if (fn?.span) return { uri, range: spanToRange(fn.span, text) };
    }
    if (analysis.types) {
      const t = analysis.types.find((td) => td.name === word);
      if (t?.span) return { uri, range: spanToRange(t.span, text) };
    }
    if (analysis.machines) {
      const m = analysis.machines.find((md) => md.name === word);
      if (m?.span) return { uri, range: spanToRange(m.span, text) };
    }
    if (analysis.components) {
      const c = analysis.components.find((co) => co.name === word);
      if (c?.span) return { uri, range: spanToRange(c.span, text) };
    }
  }

  // L2 — fall through to cross-file lookup. Reactive vars (`@x`) are scoped
  // per-file by spec, so skip cross-file search for `@`-prefixed words.
  if (workspace && !word.startsWith("@")) {
    const importerPath = filePath || uriToFilePath(uri);
    if (importerPath) {
      const hit = lookupCrossFileDefinition(workspace, importerPath, word);
      if (hit && hit.span) {
        return {
          uri: pathToUri(hit.filePath),
          range: spanToRange(hit.span, hit.sourceText || ""),
        };
      }
    }
  }
  return null;
}

/**
 * Convert an LSP URI back to an absolute path. Mirror of `pathToUri`.
 * Used by `buildDefinitionLocation` when `filePath` isn't passed explicitly.
 */
export function uriToFilePath(uri) {
  if (!uri) return null;
  if (uri.startsWith("file://")) return decodeURIComponent(uri.slice(7));
  return uri;
}

// ---------------------------------------------------------------------------
// Completions
// ---------------------------------------------------------------------------

export const HTML_TAGS = [
  "a", "abbr", "address", "area", "article", "aside", "audio",
  "b", "base", "bdi", "bdo", "blockquote", "body", "br", "button",
  "canvas", "caption", "cite", "code", "col", "colgroup",
  "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt",
  "em", "embed",
  "fieldset", "figcaption", "figure", "footer", "form",
  "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html",
  "i", "iframe", "img", "input", "ins",
  "kbd",
  "label", "legend", "li", "link",
  "main", "map", "mark", "menu", "meta", "meter",
  "nav", "noscript",
  "object", "ol", "optgroup", "option", "output",
  "p", "picture", "pre", "progress",
  "q",
  "rp", "rt", "ruby",
  "s", "samp", "script", "search", "section", "select", "slot", "small", "source", "span", "strong", "style", "sub", "summary", "sup",
  "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track",
  "u", "ul",
  "var", "video",
  "wbr",
];

export const HTML_ATTRIBUTES = [
  "id", "class", "style", "title", "lang", "dir", "hidden", "tabindex",
  "accesskey", "draggable", "spellcheck", "contenteditable", "translate",
  "role", "aria-label", "aria-labelledby", "aria-describedby", "aria-hidden",
  "aria-live", "aria-atomic", "aria-busy", "aria-controls", "aria-current",
  "aria-disabled", "aria-expanded", "aria-haspopup", "aria-pressed", "aria-selected",
  "data-", "name", "value", "type", "href", "src", "alt", "width", "height",
  "action", "method", "target", "rel", "placeholder", "required", "disabled",
  "checked", "selected", "multiple", "readonly", "autofocus", "autocomplete",
  "min", "max", "step", "pattern", "maxlength", "minlength", "for", "form",
  "accept", "enctype", "novalidate",
];

export const SCRML_ATTRIBUTES = [
  { label: "protect=", detail: "Protect database fields from client exposure", kind: CompletionItemKind.Property },
  { label: "tables=", detail: "Specify database tables for a state block", kind: CompletionItemKind.Property },
  { label: "src=", detail: "Database file path for state blocks", kind: CompletionItemKind.Property },
  { label: "bind:value", detail: "Two-way binding for input value", kind: CompletionItemKind.Property },
  { label: "bind:checked", detail: "Two-way binding for checkbox state", kind: CompletionItemKind.Property },
  { label: "bind:selected", detail: "Two-way binding for select value", kind: CompletionItemKind.Property },
  { label: "bind:group", detail: "Two-way binding for radio group", kind: CompletionItemKind.Property },
  { label: "if=", detail: "Conditional rendering", kind: CompletionItemKind.Property },
  { label: "each=", detail: "List rendering", kind: CompletionItemKind.Property },
  { label: "key=", detail: "Unique key for list items", kind: CompletionItemKind.Property },
];

export const SCRML_KEYWORDS = [
  { label: "lift", detail: "Lift markup into parent rendering context", kind: CompletionItemKind.Keyword },
  { label: "match", detail: "Pattern matching expression", kind: CompletionItemKind.Keyword },
  { label: "is", detail: "Type check in pattern matching", kind: CompletionItemKind.Keyword },
  { label: "enum", detail: "Enum type declaration", kind: CompletionItemKind.Keyword },
  { label: "struct", detail: "Struct type declaration", kind: CompletionItemKind.Keyword },
  { label: "fn", detail: "Function shorthand", kind: CompletionItemKind.Keyword },
  { label: "pure", detail: "Pure function declaration", kind: CompletionItemKind.Keyword },
  { label: "server", detail: "Server-only function annotation", kind: CompletionItemKind.Keyword },
  { label: "let", detail: "Variable declaration (mutable)", kind: CompletionItemKind.Keyword },
  { label: "const", detail: "Variable declaration (immutable)", kind: CompletionItemKind.Keyword },
  { label: "lin", detail: "Linear type variable declaration", kind: CompletionItemKind.Keyword },
  { label: "type", detail: "Type declaration", kind: CompletionItemKind.Keyword },
  { label: "import", detail: "Import declaration", kind: CompletionItemKind.Keyword },
  { label: "export", detail: "Export declaration", kind: CompletionItemKind.Keyword },
  { label: "from", detail: "Import source", kind: CompletionItemKind.Keyword },
  { label: "function", detail: "Function declaration", kind: CompletionItemKind.Keyword },
  { label: "return", detail: "Return statement", kind: CompletionItemKind.Keyword },
  { label: "if", detail: "Conditional statement", kind: CompletionItemKind.Keyword },
  { label: "else", detail: "Else branch", kind: CompletionItemKind.Keyword },
  { label: "for", detail: "For loop", kind: CompletionItemKind.Keyword },
  { label: "while", detail: "While loop", kind: CompletionItemKind.Keyword },
  { label: "of", detail: "For-of iteration", kind: CompletionItemKind.Keyword },
  { label: "in", detail: "For-in iteration", kind: CompletionItemKind.Keyword },
  { label: "async", detail: "Async function modifier", kind: CompletionItemKind.Keyword },
  { label: "await", detail: "Await expression", kind: CompletionItemKind.Keyword },
  { label: "navigate", detail: "Client-side navigation", kind: CompletionItemKind.Keyword },
  { label: "@", detail: "Reactive variable sigil", kind: CompletionItemKind.Variable },
  { label: "@derived", detail: "Derived reactive value", kind: CompletionItemKind.Variable },
];

const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET",
  "DELETE", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "ON", "AND", "OR",
  "NOT", "IN", "LIKE", "BETWEEN", "ORDER", "BY", "ASC", "DESC", "LIMIT",
  "OFFSET", "GROUP", "HAVING", "DISTINCT", "AS", "COUNT", "SUM", "AVG",
  "MIN", "MAX", "CREATE", "TABLE", "ALTER", "DROP", "INDEX", "VIEW",
  "NULL", "IS", "EXISTS", "CASE", "WHEN", "THEN", "ELSE", "END",
];

/**
 * Detect the context at a given offset in the source text.
 * Returns: 'markup', 'logic', 'sql', 'meta', 'css', or 'top-level'.
 */
export function detectContext(text, offset) {
  let depth = { logic: 0, sql: 0, meta: 0, css: 0 };
  // L1 fix: track plain `{` openers separately so bare braces inside a
  // logic/sql/meta/css context balance correctly (e.g. `${ type T = { ... } }`).
  // Plain braces are only counted when we are already inside one of the
  // language contexts — at top-level, plain `{` is meaningless.
  let plainDepth = 0;
  function inAnyContext() {
    return depth.logic > 0 || depth.sql > 0 || depth.meta > 0 || depth.css > 0;
  }
  let inString = false;
  let stringChar = null;

  for (let i = 0; i < offset && i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

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

    if (ch === "/" && next === "/") {
      const eol = text.indexOf("\n", i);
      if (eol !== -1) i = eol;
      continue;
    }

    if (ch === "$" && next === "{") { depth.logic++; i++; continue; }
    if (ch === "?" && next === "{") { depth.sql++;   i++; continue; }
    if (ch === "^" && next === "{") { depth.meta++;  i++; continue; }
    if (ch === "#" && next === "{") { depth.css++;   i++; continue; }

    if (ch === "{" && inAnyContext()) { plainDepth++; continue; }

    if (ch === "}") {
      if (plainDepth > 0) { plainDepth--; continue; }
      if (depth.css > 0) depth.css--;
      else if (depth.sql > 0) depth.sql--;
      else if (depth.meta > 0) depth.meta--;
      else if (depth.logic > 0) depth.logic--;
    }
  }

  if (depth.sql > 0) return "sql";
  if (depth.meta > 0) return "meta";
  if (depth.css > 0) return "css";
  if (depth.logic > 0) return "logic";

  const before = text.substring(0, offset);
  const lastOpen = before.lastIndexOf("<");
  const lastClose = before.lastIndexOf(">");
  if (lastOpen > lastClose) return "markup";

  return "top-level";
}

/**
 * Reactive-variable completion items (with kind/type detail).
 */
export function reactiveVarCompletions(reactiveVars) {
  const items = [];
  const seen = new Set();
  for (const rv of reactiveVars || []) {
    const name = rv.name?.startsWith("@") ? rv.name.slice(1) : rv.name;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const kindLabel = rv.reactiveKind === "derived"
      ? "@derived"
      : rv.reactiveKind === "debounced"
        ? `@debounced(${rv.delay ?? 300})`
        : "@reactive";
    const sharedTag = rv.isShared ? " (shared)" : "";
    items.push({
      label: name,
      kind: CompletionItemKind.Variable,
      detail: `@${name}${rv.type ? ": " + rv.type : ""} -- ${kindLabel}${sharedTag}`,
      documentation: "Reactive variable",
    });
  }
  return items;
}

/**
 * Build completion items for `text` at `offset`. `analysis` is the cached
 * symbol info from `analyzeText`, or null if analysis hasn't run yet.
 */
export function buildCompletions(text, offset, analysis) {
  const line = text.substring(text.lastIndexOf("\n", offset - 1) + 1, offset);
  const items = [];
  const context = detectContext(text, offset);

  // L1 fix #3a: `@var.|` member access — generic property completion stub.
  const memberAccessMatch = line.match(/(@[A-Za-z_$][A-Za-z0-9_$]*)\.(\w*)$/);
  if (memberAccessMatch && analysis?.reactiveVars) {
    const targetVarName = memberAccessMatch[1].slice(1);
    const targetVar = analysis.reactiveVars.find(v => {
      const n = v.name?.startsWith("@") ? v.name.slice(1) : v.name;
      return n === targetVarName;
    });
    if (targetVar) {
      items.push({
        label: "length",
        kind: CompletionItemKind.Property,
        detail: `${memberAccessMatch[1]}.length`,
        documentation: "Array/string length (member access — type-aware completions land in L3).",
      });
    }
  }

  if (context === "markup" || context === "top-level") {
    if (line.endsWith("<") || /^\s*<[a-z]*$/.test(line)) {
      for (const tag of HTML_TAGS) {
        items.push({ label: tag, kind: CompletionItemKind.Class, detail: `<${tag}>` });
      }
      if (analysis?.components) {
        for (const c of analysis.components) {
          items.push({
            label: c.name,
            kind: CompletionItemKind.Class,
            detail: `<${c.name}> -- component`,
          });
        }
      }
    }

    if (/^\s*<\w+[\s]/.test(line)) {
      for (const attr of HTML_ATTRIBUTES) {
        items.push({ label: attr, kind: CompletionItemKind.Property });
      }
      for (const attr of SCRML_ATTRIBUTES) items.push(attr);
    }
  }

  if (context === "logic" || context === "top-level") {
    for (const kw of SCRML_KEYWORDS) items.push(kw);

    // L1 fix #3b: trigger reactive-var completion after `@` or `@<partial>`.
    const atMatch = line.match(/@([A-Za-z_$][A-Za-z0-9_$]*)?$/);
    if (atMatch && analysis?.reactiveVars) {
      const prefix = atMatch[1] || "";
      const allItems = reactiveVarCompletions(analysis.reactiveVars);
      for (const it of allItems) {
        if (!prefix || it.label.startsWith(prefix)) items.push(it);
      }
    }

    if (context === "logic") {
      if (analysis?.functions) {
        for (const fn of analysis.functions) {
          items.push({
            label: fn.name,
            kind: fn.isServer ? CompletionItemKind.Method : CompletionItemKind.Function,
            detail: formatFunctionSignature(fn),
            documentation: fn.isServer ? "server function" : "client function",
          });
        }
      }
      if (analysis?.types) {
        for (const t of analysis.types) {
          items.push({
            label: t.name,
            kind: CompletionItemKind.TypeParameter,
            detail: `${t.typeKind} ${t.name}`,
          });
        }
      }
    }
  }

  if (context === "sql") {
    for (const kw of SQL_KEYWORDS) {
      items.push({ label: kw, kind: CompletionItemKind.Keyword, detail: "SQL keyword" });
    }
  }

  return items;
}
