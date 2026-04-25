/**
 * Smoke test for LSP L2 cross-file go-to-def + cross-file diagnostics.
 *
 * Boots `bun run lsp/server.js --stdio` as a child process, sends a
 * canonical LSP initialize/didOpen/definition exchange against a
 * temp-directory two-file workspace, and prints the responses.
 *
 * Run from the repo root:
 *   bun docs/changes/lsp-l2-see-the-workspace/smoke-test.js
 */

import { spawn } from "child_process";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TMP = join(tmpdir(), `scrml-l2-smoke-${Date.now()}`);
mkdirSync(TMP, { recursive: true });
const CARD = join(TMP, "card.scrml");
const PAGE = join(TMP, "page.scrml");

writeFileSync(
  CARD,
  [
    "${",
    "  export const Card = <article class=card>",
    "    <h2>Card</h2>",
    "  </article>",
    "}",
    "",
  ].join("\n"),
);
writeFileSync(
  PAGE,
  [
    "${",
    '  import { CardMissing } from "./card.scrml"', // intentionally non-exported name
    "}",
    "<Card />",
    "",
  ].join("\n"),
);

const PAGE_TEXT = require("fs").readFileSync(PAGE, "utf8");

function pathToUri(p) {
  return "file://" + p.split("/").map(encodeURIComponent).join("/");
}

const proc = spawn("bun", ["run", "lsp/server.js", "--stdio"], {
  cwd: process.cwd(),
  stdio: ["pipe", "pipe", "pipe"],
});

let stderrBuf = "";
proc.stderr.on("data", (d) => { stderrBuf += d.toString(); });

let buf = Buffer.alloc(0);
const responses = [];
const diagnostics = [];

proc.stdout.on("data", (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  while (true) {
    const headerEnd = buf.indexOf("\r\n\r\n");
    if (headerEnd === -1) break;
    const headers = buf.slice(0, headerEnd).toString();
    const lengthMatch = headers.match(/Content-Length: (\d+)/);
    if (!lengthMatch) {
      buf = buf.slice(headerEnd + 4);
      continue;
    }
    const length = parseInt(lengthMatch[1], 10);
    if (buf.length < headerEnd + 4 + length) break;
    const body = buf.slice(headerEnd + 4, headerEnd + 4 + length).toString();
    buf = buf.slice(headerEnd + 4 + length);
    try {
      const msg = JSON.parse(body);
      if (msg.method === "textDocument/publishDiagnostics") {
        diagnostics.push(msg.params);
      } else {
        responses.push(msg);
      }
    } catch {}
  }
});

function send(msg) {
  const body = JSON.stringify(msg);
  const header = `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n`;
  proc.stdin.write(header + body);
}

let nextId = 1;
function request(method, params) {
  const id = nextId++;
  send({ jsonrpc: "2.0", id, method, params });
  return id;
}
function notify(method, params) {
  send({ jsonrpc: "2.0", method, params });
}

async function waitForResponse(id, timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = responses.find((m) => m.id === id);
    if (r) return r;
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error(`Timed out waiting for response id=${id}`);
}

async function waitForDiagnostics(uri, timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const d = diagnostics.find((p) => p.uri === uri && p.diagnostics.length > 0);
    if (d) return d;
    await new Promise((r) => setTimeout(r, 30));
  }
  return null;
}

async function main() {
  // initialize
  const initId = request("initialize", {
    processId: process.pid,
    rootUri: pathToUri(TMP),
    capabilities: {},
  });
  await waitForResponse(initId);
  notify("initialized", {});

  // didOpen page.scrml
  notify("textDocument/didOpen", {
    textDocument: {
      uri: pathToUri(PAGE),
      languageId: "scrml",
      version: 1,
      text: PAGE_TEXT,
    },
  });

  // Wait for diagnostics on page.scrml
  const diag = await waitForDiagnostics(pathToUri(PAGE));

  // Now request definition of Card on the second-to-last line.
  const lines = PAGE_TEXT.split("\n");
  const cardLine = lines.findIndex((l) => l.includes("<Card"));
  const cardCol = lines[cardLine].indexOf("Card");
  const defId = request("textDocument/definition", {
    textDocument: { uri: pathToUri(PAGE) },
    position: { line: cardLine, character: cardCol + 1 },
  });
  const defResponse = await waitForResponse(defId);

  // Print results.
  console.log("=== LSP L2 SMOKE TEST RESULTS ===\n");
  console.log("Workspace root:", TMP);
  console.log("page.scrml:", PAGE);
  console.log("card.scrml:", CARD);
  console.log("");
  console.log("--- Diagnostics for page.scrml ---");
  console.log(JSON.stringify(diag, null, 2));
  console.log("");
  console.log("--- textDocument/definition request ---");
  console.log(JSON.stringify({
    textDocument: { uri: pathToUri(PAGE) },
    position: { line: cardLine, character: cardCol + 1 },
  }, null, 2));
  console.log("");
  console.log("--- textDocument/definition response ---");
  console.log(JSON.stringify(defResponse, null, 2));

  // Shut down.
  request("shutdown");
  notify("exit");
  setTimeout(() => process.exit(0), 200);
}

main().catch((e) => {
  console.error("smoke-test failed:", e);
  console.error("server stderr:\n", stderrBuf);
  process.exit(1);
}).finally(() => {
  try { rmSync(TMP, { recursive: true, force: true }); } catch {}
});
