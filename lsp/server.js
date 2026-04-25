#!/usr/bin/env bun
/**
 * scrml Language Server Protocol (LSP) server.
 *
 * Provides diagnostics, completions, hover, definition, and document symbols
 * for .scrml files. Imports compiler stages directly for fast in-process analysis.
 *
 * The handler logic lives in `lsp/handlers.js` so it can be unit-tested
 * without booting an LSP transport (createConnection demands one at module
 * load time). This module is the LSP wiring shell only.
 *
 * Usage: bun run lsp/server.js --stdio
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  TextDocumentSyncKind,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import {
  analyzeText,
  buildCompletions,
  buildDefinitionLocation,
  buildDocumentSymbols,
  buildHover,
} from "./handlers.js";

// ---------------------------------------------------------------------------
// Connection setup
// ---------------------------------------------------------------------------

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Per-file analysis cache (uri → analysis from analyzeText).
const fileAnalysis = new Map();

function uriToPath(uri) {
  if (uri.startsWith("file://")) return decodeURIComponent(uri.slice(7));
  return uri;
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

connection.onInitialize(() => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      completionProvider: {
        // Trigger chars cover scrml's six contexts: markup `<`, reactive `@`,
        // logic `$`, sql `?`, meta `^`, css `#`, plus member-access `.`,
        // type-annotation `:`, and attribute `=`.
        triggerCharacters: ["<", "@", "$", "?", "^", "#", ".", ":", "="],
        resolveProvider: false,
      },
      hoverProvider: true,
      definitionProvider: true,
      // L1 — phase L1 of the LSP enhancement roadmap (deep-dive 2026-04-24).
      // documentSymbolProvider populates editor outline panels (VS Code,
      // Neovim, etc) from a single AST walk over the .scrml file.
      documentSymbolProvider: true,
    },
  };
});

connection.onInitialized(() => {
  connection.console.log("scrml LSP server initialized");
});

// ---------------------------------------------------------------------------
// Diagnostics — re-analyze on every change
// ---------------------------------------------------------------------------

documents.onDidChangeContent((change) => {
  const filePath = uriToPath(change.document.uri);
  const text = change.document.getText();
  const { diagnostics, analysis } = analyzeText(filePath, text, (msg) => connection.console.log(msg));
  fileAnalysis.set(change.document.uri, analysis);
  connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});

documents.onDidClose((event) => {
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
  fileAnalysis.delete(event.document.uri);
});

// ---------------------------------------------------------------------------
// Per-feature handlers (delegate to handlers.js)
// ---------------------------------------------------------------------------

connection.onCompletion((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  const text = document.getText();
  const offset = document.offsetAt(params.position);
  const analysis = fileAnalysis.get(params.textDocument.uri);
  return buildCompletions(text, offset, analysis);
});

connection.onHover((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;
  const text = document.getText();
  const offset = document.offsetAt(params.position);
  const analysis = fileAnalysis.get(params.textDocument.uri);
  return buildHover(text, offset, analysis);
});

connection.onDefinition((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;
  const text = document.getText();
  const offset = document.offsetAt(params.position);
  const analysis = fileAnalysis.get(params.textDocument.uri);
  return buildDefinitionLocation(params.textDocument.uri, text, offset, analysis);
});

connection.onDocumentSymbol((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  const analysis = fileAnalysis.get(params.textDocument.uri);
  if (!analysis?.ast) return [];
  return buildDocumentSymbols(analysis.ast, analysis.text || document.getText());
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

documents.listen(connection);
connection.listen();
