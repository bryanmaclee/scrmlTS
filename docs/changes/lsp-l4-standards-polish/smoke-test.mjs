#!/usr/bin/env bun
/**
 * Smoke test for LSP L4 — signature help + code actions over the actual
 * JSON-RPC stdio transport.
 *
 * Spawns `bun run lsp/server.js --stdio`, performs the LSP handshake,
 * opens a synthetic document, sends `textDocument/signatureHelp` and
 * `textDocument/codeAction` requests, then prints the responses.
 *
 * Run from the repo root:
 *   bun docs/changes/lsp-l4-standards-polish/smoke-test.mjs
 *
 * Exit code 0 on success (both responses received and shape-checked).
 *
 * NOTE: This file is part of the L4 paper trail. It is intentionally NOT
 * shipped under `scripts/` and is NOT executed by `bun test`. It exists
 * so a human reviewer (or the Anomaly agent) can reproduce the smoke
 * verification described in the agent dispatch.
 *
 * IMPLEMENTATION NOTE — buffer parsing:
 * The LSP framing protocol uses Content-Length in BYTES (UTF-8). A
 * String concat would mis-count byte lengths when the payload contains
 * non-ASCII characters (window/logMessage notifications include an
 * em-dash). We buffer raw Buffer objects and slice them by byte offset.
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const proc = spawn("bun", ["run", "lsp/server.js", "--stdio"], {
  cwd: repoRoot,
  stdio: ["pipe", "pipe", "inherit"],
});

let nextId = 1;
const pending = new Map();
let buf = Buffer.alloc(0);

proc.stdout.on("data", (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  // Parse all complete LSP messages in the buffer (byte-accurate).
  while (true) {
    const sep = Buffer.from("\r\n\r\n", "ascii");
    const headerEnd = buf.indexOf(sep);
    if (headerEnd < 0) break;
    const header = buf.slice(0, headerEnd).toString("ascii");
    const lengthMatch = header.match(/Content-Length:\s*(\d+)/i);
    if (!lengthMatch) {
      buf = buf.slice(headerEnd + 4);
      continue;
    }
    const length = parseInt(lengthMatch[1], 10);
    const bodyStart = headerEnd + 4;
    if (buf.length < bodyStart + length) break;
    const body = buf.slice(bodyStart, bodyStart + length).toString("utf8");
    buf = buf.slice(bodyStart + length);
    let msg;
    try { msg = JSON.parse(body); } catch { continue; }
    if (msg.id != null && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg);
    }
  }
});

function send(method, params, isNotification = false) {
  const obj = isNotification
    ? { jsonrpc: "2.0", method, params }
    : { jsonrpc: "2.0", id: nextId++, method, params };
  const json = JSON.stringify(obj);
  const byteLen = Buffer.byteLength(json, "utf8");
  const msg = `Content-Length: ${byteLen}\r\n\r\n${json}`;
  proc.stdin.write(msg);
  if (isNotification) return null;
  return new Promise((resolve, reject) => {
    pending.set(obj.id, { resolve, reject });
    setTimeout(() => {
      if (pending.has(obj.id)) {
        pending.delete(obj.id);
        reject(new Error(`Timeout waiting for ${method} (id=${obj.id})`));
      }
    }, 8000);
  });
}

async function main() {
  // 1. initialize
  const initResp = await send("initialize", {
    processId: process.pid,
    rootUri: null,
    capabilities: {},
  });
  console.log("=== INITIALIZE RESPONSE (capabilities) ===");
  console.log(JSON.stringify(initResp.result.capabilities, null, 2));

  send("initialized", {}, true);

  // 2. didOpen with a document containing a function call + an E-LIN-001
  //    diagnostic source.
  const uri = "file:///smoke.scrml";
  const text = [
    "<program>",
    "${",
    "  function add(a, b) { return a + b }",
    "  add(",
    "  lin x = 5",
    "}",
    "</program>",
    "",
  ].join("\n");
  send("textDocument/didOpen", {
    textDocument: { uri, languageId: "scrml", version: 1, text },
  }, true);

  // Wait briefly for analysis to land.
  await new Promise(r => setTimeout(r, 300));

  // 3. signatureHelp request — cursor right after `(` of `add(`.
  const lines = text.split("\n");
  const sigPos = { line: 3, character: lines[3].indexOf("add(") + 4 };
  const sigResp = await send("textDocument/signatureHelp", {
    textDocument: { uri },
    position: sigPos,
  });
  console.log("=== SIGNATURE HELP RESPONSE ===");
  console.log(JSON.stringify(sigResp.result, null, 2));

  // 4. codeAction request synthesising an E-LIN-001 diagnostic on `lin x`.
  const linLine = 4;
  const linColStart = lines[linLine].indexOf("lin x");
  const linColEnd = linColStart + "lin x = 5".length;
  const caResp = await send("textDocument/codeAction", {
    textDocument: { uri },
    range: {
      start: { line: linLine, character: linColStart },
      end: { line: linLine, character: linColEnd },
    },
    context: {
      diagnostics: [{
        severity: 1,
        code: "E-LIN-001",
        source: "scrml/type-system",
        message: "E-LIN-001: Linear variable `x` declared but never consumed",
        range: {
          start: { line: linLine, character: linColStart },
          end: { line: linLine, character: linColEnd },
        },
      }],
    },
  });
  console.log("=== CODE ACTION RESPONSE ===");
  console.log(JSON.stringify(caResp.result, null, 2));

  // Shape checks.
  const ok = (cond, label) => {
    if (cond) console.log("PASS:", label);
    else { console.log("FAIL:", label); process.exitCode = 2; }
  };
  ok(initResp.result?.capabilities?.signatureHelpProvider != null,
     "signatureHelpProvider advertised");
  ok(initResp.result?.capabilities?.codeActionProvider != null,
     "codeActionProvider advertised");
  ok(sigResp.result?.signatures?.length === 1,
     "signatureHelp returned 1 signature");
  ok(sigResp.result?.signatures?.[0]?.label?.startsWith("add("),
     "signature label starts with 'add('");
  ok(Array.isArray(caResp.result) && caResp.result.length >= 1,
     "codeAction returned at least 1 action");
  ok(caResp.result?.[0]?.kind === "quickfix",
     "first action is quickfix");

  send("shutdown", {});
  send("exit", {}, true);
  setTimeout(() => process.exit(process.exitCode || 0), 200);
}

main().catch((e) => {
  console.error("smoke test failed:", e);
  proc.kill();
  process.exit(1);
});
