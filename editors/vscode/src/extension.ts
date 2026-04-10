import * as path from "path";
import { workspace, ExtensionContext } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // Determine server path
  const config = workspace.getConfiguration("scrml");
  let serverPath = config.get<string>("server.path");
  const runtime = config.get<string>("server.runtime") || "bun";

  if (!serverPath) {
    // Default: look for the LSP server relative to the extension
    // In development, this is at the project root's lsp/server.js
    // In production, it would be bundled
    serverPath = path.resolve(
      context.extensionPath,
      "..",
      "..",
      "lsp",
      "server.js"
    );
  }

  // Server options: run the LSP server with bun (or node)
  const serverOptions: ServerOptions = {
    run: {
      command: runtime,
      args: ["run", serverPath, "--stdio"],
      transport: TransportKind.stdio,
    },
    debug: {
      command: runtime,
      args: ["run", serverPath, "--stdio"],
      transport: TransportKind.stdio,
    },
  };

  // Client options: register for .scrml files
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "scrml" }],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher("**/*.scrml"),
    },
    outputChannelName: "scrml Language Server",
  };

  // Create and start the client
  client = new LanguageClient(
    "scrml",
    "scrml Language Server",
    serverOptions,
    clientOptions
  );

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
