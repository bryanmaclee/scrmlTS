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
 * L2 (deep-dive 2026-04-24, "See the workspace"):
 *   - On `initialize`, the server bootstraps a workspace-wide cache by
 *     scanning `rootUri`/`rootPath`/`workspaceFolders` for `.scrml` files,
 *     running BS+TAB on each, and computing the cross-file import graph +
 *     export registry.
 *   - On `didChange` / `didOpen` / `didClose`, the workspace slice is
 *     updated and the cross-file graph is rebuilt; if the touched file's
 *     export shape changed, ALL open buffers are re-analyzed so their
 *     diagnostics catch up with the new graph (conservative L2 policy
 *     per Q3 of the deep-dive).
 *   - `onDefinition` consults the workspace for cross-file lookups.
 *
 * Usage: bun run lsp/server.js --stdio
 */

import { existsSync, readFileSync } from "fs";

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

import {
  createWorkspace,
  bootstrapWorkspace,
  updateFileInWorkspace,
  removeFileFromWorkspace,
} from "./workspace.js";

// ---------------------------------------------------------------------------
// Connection setup
// ---------------------------------------------------------------------------

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Per-file analysis cache (uri → analysis from analyzeText).
const fileAnalysis = new Map();

// L2 — workspace-wide cache (cross-file imports/exports/diagnostics).
const workspace = createWorkspace();

function uriToPath(uri) {
  if (uri.startsWith("file://")) return decodeURIComponent(uri.slice(7));
  return uri;
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

connection.onInitialize((params) => {
  // L2 — pick the workspace root from initialize params. Prefer
  // `workspaceFolders` (LSP 3.6+), fall back to deprecated `rootUri` /
  // `rootPath`. If none are present (single-file mode), the workspace
  // stays empty and the LSP behaves as L1 did.
  let rootPath = null;
  if (params.workspaceFolders && params.workspaceFolders.length > 0) {
    rootPath = uriToPath(params.workspaceFolders[0].uri);
  } else if (params.rootUri) {
    rootPath = uriToPath(params.rootUri);
  } else if (params.rootPath) {
    rootPath = params.rootPath;
  }
  if (rootPath) {
    bootstrapWorkspace(workspace, rootPath, (msg) => connection.console.log(msg));
  } else {
    connection.console.log("scrml LSP: no workspace root supplied — running in single-file mode");
  }

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

/**
 * Re-analyze a single open document and publish its diagnostics.
 * Pulls cross-file diagnostics from the workspace cache.
 */
function analyzeAndPublish(doc) {
  const filePath = uriToPath(doc.uri);
  const text = doc.getText();
  const { diagnostics, analysis } = analyzeText(
    filePath,
    text,
    (msg) => connection.console.log(msg),
    workspace,
  );
  fileAnalysis.set(doc.uri, analysis);
  connection.sendDiagnostics({ uri: doc.uri, diagnostics });
}

documents.onDidChangeContent((change) => {
  const filePath = uriToPath(change.document.uri);
  const text = change.document.getText();
  // L2 — refresh the workspace's TAB record for this file FIRST so the
  // cross-file graph (and any E-IMPORT-* errors derived from it) reflect
  // the latest buffer before per-file analyzeText pulls them in.
  const { exportsChanged } = updateFileInWorkspace(workspace, filePath, text);

  // Now publish diagnostics for the changed buffer using the refreshed cache.
  analyzeAndPublish(change.document);

  // L2 — if exports shifted, re-publish diagnostics for every other open
  // buffer because their cross-file E-IMPORT-* surface may have changed.
  // Conservative policy from deep-dive Q3.
  if (exportsChanged) {
    for (const other of documents.all()) {
      if (other.uri === change.document.uri) continue;
      analyzeAndPublish(other);
    }
  }
});

documents.onDidClose((event) => {
  const filePath = uriToPath(event.document.uri);
  // L2 — keep the on-disk version in the cache if the file still exists.
  // Avoids dead-import false positives when a tab is closed but the file
  // is still on disk and still being imported by other open buffers.
  try {
    if (existsSync(filePath)) {
      const onDisk = readFileSync(filePath, "utf8");
      updateFileInWorkspace(workspace, filePath, onDisk);
    } else {
      removeFileFromWorkspace(workspace, filePath);
    }
  } catch {
    removeFileFromWorkspace(workspace, filePath);
  }
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
  const filePath = uriToPath(params.textDocument.uri);
  // L2 — pass workspace + filePath so an unresolved same-file lookup can
  // fall through to the cross-file resolver.
  return buildDefinitionLocation(params.textDocument.uri, text, offset, analysis, workspace, filePath);
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
