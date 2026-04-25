/**
 * Smoke test #2 — exercises the success path for L2 cross-file go-to-def.
 *
 * Two-file workspace where page.scrml imports Card from card.scrml, and
 * `<Card />` is referenced in markup. Go-to-def on `Card` returns a
 * Location pointing into card.scrml.
 */

import { spawn } from "child_process";
import { mkdirSync, writeFileSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TMP = join(tmpdir(), `scrml-l2-smoke2-${Date.now()}`);
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
    '  import { Card } from "./card.scrml"', // properly imported
    "}",
    "<Card />",
    "",
  ].join("\n"),
);

const PAGE_TEXT = readFileSync(PAGE, "utf8");

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
      if (msg.method === "textDocument/publishDiagnostics") diagnostics.push(msg.params);
      else responses.push(msg);
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
function notify(method, params) { send({ jsonrpc: "2.0", method, params }); }

async function waitForResponse(id, timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = responses.find((m) => m.id === id);
    if (r) return r;
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error(`Timed out waiting for response id=${id}`);
}

async function main() {
  const initId = request("initialize", {
    processId: process.pid,
    rootUri: pathToUri(TMP),
    capabilities: {},
  });
  await waitForResponse(initId);
  notify("initialized", {});

  notify("textDocument/didOpen", {
    textDocument: {
      uri: pathToUri(PAGE),
      languageId: "scrml",
      version: 1,
      text: PAGE_TEXT,
    },
  });

  // Wait a beat for diagnostics.
  await new Promise((r) => setTimeout(r, 200));

  // Definition request: cursor on `Card` in `<Card />`.
  const lines = PAGE_TEXT.split("\n");
  const cardLine = lines.findIndex((l) => l.includes("<Card"));
  const cardCol = lines[cardLine].indexOf("Card");
  const defReq = {
    textDocument: { uri: pathToUri(PAGE) },
    position: { line: cardLine, character: cardCol + 1 },
  };
  const defId = request("textDocument/definition", defReq);
  const defResponse = await waitForResponse(defId);

  console.log("=== LSP L2 SMOKE TEST #2 — success path ===\n");
  console.log("Workspace root:", TMP);
  console.log("page.scrml content:\n" + PAGE_TEXT);
  console.log("card.scrml content:\n" + readFileSync(CARD, "utf8"));
  console.log("--- Diagnostics for page.scrml ---");
  const pageDiag = diagnostics.find(d => d.uri === pathToUri(PAGE));
  console.log(JSON.stringify(pageDiag, null, 2));
  console.log("\n--- textDocument/definition request ---");
  console.log(JSON.stringify(defReq, null, 2));
  console.log("\n--- textDocument/definition response ---");
  console.log(JSON.stringify(defResponse, null, 2));
  console.log("\n--- Verification ---");
  if (defResponse.result && defResponse.result.uri === pathToUri(CARD)) {
    console.log("PASS: definition response points to card.scrml");
    console.log(`PASS: target line is ${defResponse.result.range.start.line} (0-based; expect 1 for 'export const Card = ...')`);
  } else {
    console.log("FAIL: definition response did not resolve to card.scrml");
  }

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
