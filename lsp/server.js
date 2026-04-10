#!/usr/bin/env bun
/**
 * scrml Language Server Protocol (LSP) server.
 *
 * Provides diagnostics, completions, hover, and go-to-definition for .scrml files.
 * Imports compiler stages directly for fast in-process analysis.
 *
 * Usage: bun run lsp/server.js --stdio
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  TextDocumentSyncKind,
  DiagnosticSeverity,
  CompletionItemKind,
  MarkupKind,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

// Import compiler stages
import { splitBlocks } from "../compiler/src/block-splitter.js";
import { buildAST } from "../compiler/src/ast-builder.js";
import { runBPP } from "../compiler/src/body-pre-parser.js";
import { runPA } from "../compiler/src/protect-analyzer.js";
import { runRI } from "../compiler/src/route-inference.js";
import { runTS } from "../compiler/src/type-system.js";
import { runDG } from "../compiler/src/dependency-graph.js";

// ---------------------------------------------------------------------------
// Connection setup
// ---------------------------------------------------------------------------

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Per-file analysis cache
const fileAnalysis = new Map();

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

connection.onInitialize((params) => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      completionProvider: {
        triggerCharacters: ["<", "@", "$", "?", "^", ".", ":", "="],
        resolveProvider: false,
      },
      hoverProvider: true,
      definitionProvider: true,
    },
  };
});

connection.onInitialized(() => {
  connection.console.log("scrml LSP server initialized");
});

// ---------------------------------------------------------------------------
// Phase 1: Diagnostics
// ---------------------------------------------------------------------------

/**
 * Extract a span's line/col from various error formats across compiler stages.
 * Returns { line, col } (1-based) or { line: 1, col: 1 } as fallback.
 */
function extractSpan(error) {
  // TSError, PAError, RIError, DGError, CGError, BPPError have .span
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
  // BSError has .bsSpan
  if (error.bsSpan) {
    return {
      line: error.bsSpan.line ?? 1,
      col: error.bsSpan.col ?? 1,
      start: error.bsSpan.start,
      end: error.bsSpan.end,
    };
  }
  // TABError has .tabSpan
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

/**
 * Determine LSP DiagnosticSeverity from error object.
 */
function getDiagnosticSeverity(error) {
  if (error.severity === "warning") return DiagnosticSeverity.Warning;
  if (error.code?.startsWith("W-")) return DiagnosticSeverity.Warning;
  if (error.code?.startsWith("E-ROUTE-")) return DiagnosticSeverity.Warning;
  return DiagnosticSeverity.Error;
}

/**
 * Map scrml error code prefixes to human-readable stage names.
 */
function getErrorSource(code) {
  if (!code) return "scrml";
  if (code.startsWith("E-CTX-") || code.startsWith("E-BS-")) return "scrml/block-splitter";
  if (code.startsWith("E-TAB-") || code.startsWith("E-MARKUP-") || code.startsWith("E-STATE-")) return "scrml/tokenizer";
  if (code.startsWith("E-BPP-")) return "scrml/body-pre-parser";
  if (code.startsWith("E-PA-")) return "scrml/protect-analyzer";
  if (code.startsWith("E-RI-") || code.startsWith("E-ROUTE-")) return "scrml/route-inference";
  if (code.startsWith("E-TYPE-") || code.startsWith("E-SCOPE-") || code.startsWith("E-PURE-") || code.startsWith("E-LIN-") || code.startsWith("E-TILDE-") || code.startsWith("W-MATCH-")) return "scrml/type-system";
  if (code.startsWith("E-DG-") || code.startsWith("E-LIFT-") || code.startsWith("W-DG-")) return "scrml/dependency-graph";
  if (code.startsWith("E-CG-")) return "scrml/code-generator";
  return "scrml";
}

/**
 * Run the compiler pipeline on a document and return diagnostics.
 * Runs stages incrementally — stops at first stage that produces fatal errors.
 */
function analyzeDocument(textDocument) {
  const uri = textDocument.uri;
  const text = textDocument.getText();
  const filePath = uriToPath(uri);
  const diagnostics = [];
  const analysis = { ast: null, reactiveVars: [], functions: [], types: [] };

  // Stage 2: Block Splitter
  let bsResult;
  try {
    bsResult = splitBlocks(filePath, text);
  } catch (e) {
    const span = extractSpan(e);
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: spanToRange(span, text),
      message: e.message || String(e),
      source: getErrorSource(e.code),
      code: e.code || "E-BS-000",
    });
    fileAnalysis.set(uri, analysis);
    return diagnostics;
  }

  // Stage 3: Tokenizer + AST Builder
  let tabResult;
  try {
    tabResult = buildAST(bsResult);
  } catch (e) {
    const span = extractSpan(e);
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: spanToRange(span, text),
      message: e.message || String(e),
      source: getErrorSource(e.code),
      code: e.code || "E-TAB-000",
    });
    fileAnalysis.set(uri, analysis);
    return diagnostics;
  }

  if (tabResult.errors?.length > 0) {
    for (const e of tabResult.errors) {
      const span = extractSpan(e);
      diagnostics.push({
        severity: getDiagnosticSeverity(e),
        range: spanToRange(span, text),
        message: e.message || String(e),
        source: getErrorSource(e.code),
        code: e.code,
      });
    }
  }

  // Extract analysis info from AST
  if (tabResult.ast) {
    analysis.ast = tabResult.ast;
    extractAnalysisInfo(tabResult.ast, analysis);
  }

  // Stage 3.5: Body Pre-Parser
  let bppResult;
  try {
    bppResult = runBPP({ files: [tabResult] });
    if (bppResult.errors?.length > 0) {
      for (const e of bppResult.errors) {
        const span = extractSpan(e);
        diagnostics.push({
          severity: getDiagnosticSeverity(e),
          range: spanToRange(span, text),
          message: e.message || String(e),
          source: getErrorSource(e.code),
          code: e.code,
        });
      }
    }
  } catch (e) {
    // BPP failure is non-fatal for diagnostics
    connection.console.log(`BPP error: ${e.message}`);
  }

  const files = bppResult?.files ?? [tabResult];

  // Stage 4: Protect Analyzer (skip if it requires DB access and we want fast feedback)
  let paResult = { protectAnalysis: { views: new Map() }, errors: [] };
  try {
    paResult = runPA({ files });
    if (paResult.errors?.length > 0) {
      for (const e of paResult.errors) {
        const span = extractSpan(e);
        diagnostics.push({
          severity: getDiagnosticSeverity(e),
          range: spanToRange(span, text),
          message: e.message || String(e),
          source: getErrorSource(e.code),
          code: e.code,
        });
      }
    }
  } catch (e) {
    // PA failure is non-fatal (may fail if DB files are missing)
    connection.console.log(`PA error: ${e.message}`);
  }

  // Stage 5: Route Inference
  let riResult = { routeMap: { functions: new Map() }, errors: [] };
  try {
    riResult = runRI({ files, protectAnalysis: paResult.protectAnalysis });
    if (riResult.errors?.length > 0) {
      for (const e of riResult.errors) {
        const span = extractSpan(e);
        diagnostics.push({
          severity: getDiagnosticSeverity(e),
          range: spanToRange(span, text),
          message: e.message || String(e),
          source: getErrorSource(e.code),
          code: e.code,
        });
      }
    }
  } catch (e) {
    connection.console.log(`RI error: ${e.message}`);
  }

  // Stage 6: Type System
  try {
    const tsResult = runTS({
      files,
      protectAnalysis: paResult.protectAnalysis,
      routeMap: riResult.routeMap,
    });
    if (tsResult.errors?.length > 0) {
      for (const e of tsResult.errors) {
        const span = extractSpan(e);
        diagnostics.push({
          severity: getDiagnosticSeverity(e),
          range: spanToRange(span, text),
          message: e.message || String(e),
          source: getErrorSource(e.code),
          code: e.code,
        });
      }
    }

    // Stage 7: Dependency Graph
    try {
      const dgResult = runDG({
        files: tsResult.files || files,
        routeMap: riResult.routeMap,
      });
      if (dgResult.errors?.length > 0) {
        for (const e of dgResult.errors) {
          const span = extractSpan(e);
          diagnostics.push({
            severity: getDiagnosticSeverity(e),
            range: spanToRange(span, text),
            message: e.message || String(e),
            source: getErrorSource(e.code),
            code: e.code,
          });
        }
      }
    } catch (e) {
      connection.console.log(`DG error: ${e.message}`);
    }
  } catch (e) {
    connection.console.log(`TS error: ${e.message}`);
  }

  fileAnalysis.set(uri, analysis);
  return diagnostics;
}

/**
 * Convert a URI (file://...) to a filesystem path.
 */
function uriToPath(uri) {
  if (uri.startsWith("file://")) {
    return decodeURIComponent(uri.slice(7));
  }
  return uri;
}

/**
 * Convert a span { line, col } to an LSP Range.
 * Span line/col are 1-based; LSP ranges are 0-based.
 */
function spanToRange(span, text) {
  const line = Math.max(0, (span.line ?? 1) - 1);
  const col = Math.max(0, (span.col ?? 1) - 1);

  // Try to use start/end byte offsets for a more precise range
  if (span.start != null && span.end != null && text) {
    const startPos = offsetToPosition(text, span.start);
    const endPos = offsetToPosition(text, Math.min(span.end, text.length));
    return {
      start: startPos,
      end: endPos,
    };
  }

  // Fall back to line/col with a reasonable end position
  return {
    start: { line, character: col },
    end: { line, character: col + 20 },
  };
}

/**
 * Convert a byte offset to LSP { line, character } position.
 */
function offsetToPosition(text, offset) {
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
 * Extract reactive variables, functions, and type declarations from the AST.
 */
function extractAnalysisInfo(ast, analysis) {
  if (!ast || !ast.nodes) return;

  function walkNodes(nodes) {
    for (const node of nodes) {
      if (!node) continue;

      // Reactive variable declarations (from state blocks or logic blocks)
      if (node.kind === "state" && node.vars) {
        for (const v of node.vars) {
          analysis.reactiveVars.push({
            name: v.name,
            span: v.span || node.span,
            type: v.type || null,
          });
        }
      }

      // Logic blocks may contain reactive variable assignments
      if (node.kind === "logic" && node.body) {
        walkLogicNodes(node.body);
      }

      // Markup children
      if (node.children) {
        walkNodes(node.children);
      }
    }
  }

  function walkLogicNodes(nodes) {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (!node) continue;

      // Function declarations
      if (node.kind === "FunctionDecl" || node.kind === "function") {
        analysis.functions.push({
          name: node.name,
          span: node.span,
          params: node.params || [],
          isServer: node.isServer || false,
          fnKind: node.fnKind || "function",
        });
      }

      // Reactive variable assignments
      if (node.kind === "ReactiveAssign" || node.kind === "reactive-assign") {
        analysis.reactiveVars.push({
          name: node.name || node.varName,
          span: node.span,
          type: null,
        });
      }

      // Variable declarations
      if (node.kind === "VarDecl" || node.kind === "var-decl") {
        if (node.name?.startsWith("@")) {
          analysis.reactiveVars.push({
            name: node.name,
            span: node.span,
            type: node.typeAnnotation || null,
          });
        }
      }

      // Type declarations
      if (node.kind === "TypeDecl" || node.kind === "type-decl") {
        analysis.types.push({
          name: node.name,
          span: node.span,
          typeKind: node.typeKind || "unknown",
        });
      }

      // Recurse into children
      if (node.body) walkLogicNodes(Array.isArray(node.body) ? node.body : [node.body]);
      if (node.children) walkLogicNodes(node.children);
      if (node.consequent) walkLogicNodes(Array.isArray(node.consequent) ? node.consequent : [node.consequent]);
      if (node.alternate) walkLogicNodes(Array.isArray(node.alternate) ? node.alternate : [node.alternate]);
    }
  }

  walkNodes(ast.nodes);

  // Also check top-level type declarations
  if (ast.typeDecls) {
    for (const td of ast.typeDecls) {
      analysis.types.push({
        name: td.name,
        span: td.span,
        typeKind: td.typeKind || "unknown",
      });
    }
  }
}

// Document change handler — triggers re-analysis
documents.onDidChangeContent((change) => {
  const diagnostics = analyzeDocument(change.document);
  connection.sendDiagnostics({
    uri: change.document.uri,
    diagnostics,
  });
});

// Clear diagnostics when a document is closed
documents.onDidClose((event) => {
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
  fileAnalysis.delete(event.document.uri);
});

// ---------------------------------------------------------------------------
// Phase 3: Completions
// ---------------------------------------------------------------------------

// HTML5 tag names for completion
const HTML_TAGS = [
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

// HTML global attributes
const HTML_ATTRIBUTES = [
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

// scrml-specific attributes
const SCRML_ATTRIBUTES = [
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

// scrml keywords
const SCRML_KEYWORDS = [
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

connection.onCompletion((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const text = document.getText();
  const offset = document.offsetAt(params.position);
  const line = text.substring(text.lastIndexOf("\n", offset - 1) + 1, offset);
  const analysis = fileAnalysis.get(params.textDocument.uri);

  const items = [];

  // Detect context: are we inside ${ }, ?{ }, ^{ }, or markup?
  const context = detectContext(text, offset);

  if (context === "markup" || context === "top-level") {
    // Tag name completion after <
    if (line.endsWith("<") || /^\s*<[a-z]*$/.test(line)) {
      for (const tag of HTML_TAGS) {
        items.push({
          label: tag,
          kind: CompletionItemKind.Class,
          detail: `<${tag}>`,
        });
      }
    }

    // Attribute completion after a tag name
    if (/^\s*<\w+[\s]/.test(line)) {
      for (const attr of HTML_ATTRIBUTES) {
        items.push({
          label: attr,
          kind: CompletionItemKind.Property,
        });
      }
      for (const attr of SCRML_ATTRIBUTES) {
        items.push(attr);
      }
    }
  }

  if (context === "logic" || context === "top-level") {
    // Keyword completion
    for (const kw of SCRML_KEYWORDS) {
      items.push(kw);
    }

    // Reactive variable completion after @
    if (line.endsWith("@") && analysis?.reactiveVars) {
      for (const rv of analysis.reactiveVars) {
        const name = rv.name?.startsWith("@") ? rv.name.slice(1) : rv.name;
        if (name) {
          items.push({
            label: name,
            kind: CompletionItemKind.Variable,
            detail: `@${name}${rv.type ? ": " + rv.type : ""}`,
            documentation: "Reactive variable",
          });
        }
      }
    }
  }

  if (context === "sql") {
    // Basic SQL keyword completions
    const sqlKeywords = [
      "SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET",
      "DELETE", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "ON", "AND", "OR",
      "NOT", "IN", "LIKE", "BETWEEN", "ORDER", "BY", "ASC", "DESC", "LIMIT",
      "OFFSET", "GROUP", "HAVING", "DISTINCT", "AS", "COUNT", "SUM", "AVG",
      "MIN", "MAX", "CREATE", "TABLE", "ALTER", "DROP", "INDEX", "VIEW",
      "NULL", "IS", "EXISTS", "CASE", "WHEN", "THEN", "ELSE", "END",
    ];
    for (const kw of sqlKeywords) {
      items.push({
        label: kw,
        kind: CompletionItemKind.Keyword,
        detail: "SQL keyword",
      });
    }
  }

  return items;
});

/**
 * Detect the context at a given offset in the source text.
 * Returns: 'markup', 'logic', 'sql', 'meta', 'css', or 'top-level'
 */
function detectContext(text, offset) {
  let depth = { logic: 0, sql: 0, meta: 0, css: 0 };
  let inString = false;
  let stringChar = null;

  for (let i = 0; i < offset && i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    // Track string state
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

    // Skip comments
    if (ch === "/" && next === "/") {
      const eol = text.indexOf("\n", i);
      if (eol !== -1) i = eol;
      continue;
    }

    // Context openers
    if (ch === "$" && next === "{") {
      depth.logic++;
      i++;
      continue;
    }
    if (ch === "?" && next === "{") {
      depth.sql++;
      i++;
      continue;
    }
    if (ch === "^" && next === "{") {
      depth.meta++;
      i++;
      continue;
    }
    if (ch === "#" && next === "{") {
      depth.css++;
      i++;
      continue;
    }

    // Closing braces — work through context stack
    if (ch === "}") {
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

  // Check if we're inside a markup tag
  const before = text.substring(0, offset);
  const lastOpen = before.lastIndexOf("<");
  const lastClose = before.lastIndexOf(">");
  if (lastOpen > lastClose) return "markup";

  return "top-level";
}

// ---------------------------------------------------------------------------
// Phase 4: Hover Information
// ---------------------------------------------------------------------------

// Error code descriptions
const ERROR_DESCRIPTIONS = {
  // Block Splitter
  "E-CTX-001": "Wrong closer for current context. Mismatched closing tag, or wrong delimiter for the current block type.",
  "E-CTX-002": "Bare `/` or trailing `/` used inside a logic/sql/css/error-effect/meta context. Use explicit closers in brace-delimited blocks.",
  "E-CTX-003": "Unclosed context at end of file. A tag or brace-delimited block was opened but never closed.",

  // Tokenizer / AST Builder
  "E-TAB-001": "Syntax error in tokenization. The token stream could not be parsed.",
  "E-TAB-002": "Unexpected token in AST construction.",

  // Body Pre-Parser
  "E-BPP-001": "Parse failure in a function/pure/fn body. The body could not be tokenized or parsed into a LogicNode tree.",

  // Protect Analyzer
  "E-PA-001": "src= database file does not exist on disk.",
  "E-PA-003": "Bun SQLite schema introspection failed.",
  "E-PA-004": "tables= references a table not found in the database.",
  "E-PA-005": "tables= attribute is absent or its parsed value is empty.",
  "E-PA-006": "src= attribute is absent from a <db> block.",
  "E-PA-007": "protect= field matches no column in any listed table (security error).",

  // Route Inference
  "E-RI-001": "Pure function is server-escalated. A function declared `pure` cannot also be routed to the server.",
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

connection.onHover((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const text = document.getText();
  const offset = document.offsetAt(params.position);
  const analysis = fileAnalysis.get(params.textDocument.uri);

  // Get word at position
  const word = getWordAtOffset(text, offset);
  if (!word) return null;

  // Hover on @variable
  if (word.startsWith("@")) {
    const varName = word.slice(1);
    if (analysis?.reactiveVars) {
      const rv = analysis.reactiveVars.find(
        (v) => (v.name?.startsWith("@") ? v.name.slice(1) : v.name) === varName
      );
      if (rv) {
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: `**@${varName}** -- Reactive variable${rv.type ? `\n\nType: \`${rv.type}\`` : ""}`,
          },
        };
      }
    }
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**@${varName}** -- Reactive variable`,
      },
    };
  }

  // Hover on error codes (E-XX-NNN or W-XX-NNN)
  if (/^[EW]-[A-Z]+-\d+$/.test(word)) {
    const desc = ERROR_DESCRIPTIONS[word];
    if (desc) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**${word}**\n\n${desc}`,
        },
      };
    }
  }

  // Hover on keywords
  const keywordDocs = {
    "lift": "**lift** -- Lifts markup content from a loop body into the parent rendering context.\n\nUsed inside `for` loops within `${}` blocks to emit markup for each iteration.",
    "protect": "**protect=** -- Specifies which database fields should be protected from client exposure.\n\nFields listed in `protect=` are only accessible in server-routed functions.",
    "match": "**match** -- Pattern matching expression (Rust-style).\n\nMatches a value against enum variants, union types, or literal patterns. Must be exhaustive.",
    "pure": "**pure** -- Declares a pure function with no side effects.\n\nPure functions cannot read/write @reactive state, perform I/O, or call non-pure functions.",
    "server": "**server** -- Marks a function as server-only.\n\nThe compiler generates a server route and client-side fetch stub automatically.",
    "lin": "**lin** -- Linear type declaration.\n\nA `lin` variable must be consumed exactly once before scope exit. Cannot be used in loops.",
  };

  if (keywordDocs[word]) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: keywordDocs[word],
      },
    };
  }

  // Hover on function names
  if (analysis?.functions) {
    const fn = analysis.functions.find((f) => f.name === word);
    if (fn) {
      const params = fn.params?.map((p) => p.name || p).join(", ") || "";
      const boundary = fn.isServer ? "server" : "client";
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**${word}**(${params}) -- ${fn.fnKind || "function"} [${boundary}]`,
        },
      };
    }
  }

  // Hover on type names
  if (analysis?.types) {
    const t = analysis.types.find((td) => td.name === word);
    if (t) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**${word}** -- ${t.typeKind} type`,
        },
      };
    }
  }

  return null;
});

/**
 * Get the word at the given offset in text.
 */
function getWordAtOffset(text, offset) {
  if (offset < 0 || offset >= text.length) return null;

  // Expand left
  let start = offset;
  while (start > 0 && /[\w@\-]/.test(text[start - 1])) start--;

  // Expand right
  let end = offset;
  while (end < text.length && /[\w\-]/.test(text[end])) end++;

  const word = text.substring(start, end);
  return word.length > 0 ? word : null;
}

// ---------------------------------------------------------------------------
// Phase 5: Go to Definition
// ---------------------------------------------------------------------------

connection.onDefinition((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const text = document.getText();
  const offset = document.offsetAt(params.position);
  const analysis = fileAnalysis.get(params.textDocument.uri);
  if (!analysis) return null;

  const word = getWordAtOffset(text, offset);
  if (!word) return null;

  // @variable -> jump to declaration
  const varName = word.startsWith("@") ? word.slice(1) : word;

  if (word.startsWith("@") && analysis.reactiveVars) {
    const rv = analysis.reactiveVars.find(
      (v) => (v.name?.startsWith("@") ? v.name.slice(1) : v.name) === varName
    );
    if (rv?.span) {
      return {
        uri: params.textDocument.uri,
        range: spanToRange(rv.span, text),
      };
    }
  }

  // Function name -> jump to definition
  if (analysis.functions) {
    const fn = analysis.functions.find((f) => f.name === word);
    if (fn?.span) {
      return {
        uri: params.textDocument.uri,
        range: spanToRange(fn.span, text),
      };
    }
  }

  // Type name -> jump to definition
  if (analysis.types) {
    const t = analysis.types.find((td) => td.name === word);
    if (t?.span) {
      return {
        uri: params.textDocument.uri,
        range: spanToRange(t.span, text),
      };
    }
  }

  return null;
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

documents.listen(connection);
connection.listen();
