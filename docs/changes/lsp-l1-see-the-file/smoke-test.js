// LSP stdio smoke test for L1.
//
// Spawns `bun run lsp/server.js --stdio`, sends the initialize request +
// initialized notification + textDocument/didOpen + textDocument/documentSymbol,
// and verifies that:
//   1. The initialize response advertises documentSymbolProvider: true.
//   2. The documentSymbol response is a non-empty array of DocumentSymbol[].
//
// Run from project root:
//    bun docs/changes/lsp-l1-see-the-file/smoke-test.js

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..", "..", "..");
const fixture = resolve(projectRoot, "examples", "14-mario-state-machine.scrml");
const fixtureText = readFileSync(fixture, "utf8");

const child = spawn("bun", ["run", "lsp/server.js", "--stdio"], {
  cwd: projectRoot,
  stdio: ["pipe", "pipe", "pipe"],
});

let buffer = Buffer.alloc(0);
const responses = [];
let waiters = [];

function deliverIfReady() {
  // LSP framing: `Content-Length: <n>\r\n\r\n<body of n bytes>`.
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd < 0) return;
    const header = buffer.slice(0, headerEnd).toString("utf8");
    const m = header.match(/Content-Length:\s*(\d+)/i);
    if (!m) {
      // malformed; drop a byte and retry.
      buffer = buffer.slice(1);
      continue;
    }
    const len = Number(m[1]);
    const total = headerEnd + 4 + len;
    if (buffer.length < total) return;
    const body = buffer.slice(headerEnd + 4, total).toString("utf8");
    buffer = buffer.slice(total);
    try {
      const msg = JSON.parse(body);
      responses.push(msg);
      // Resolve any waiters whose predicate matches.
      waiters = waiters.filter(w => {
        if (w.predicate(msg)) { w.resolve(msg); return false; }
        return true;
      });
    } catch (e) {
      console.error("Failed to parse LSP body:", body);
    }
  }
}

child.stdout.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  deliverIfReady();
});
child.stderr.on("data", (chunk) => {
  // Server logs go to stderr — keep visible so a failure is easy to debug.
  process.stderr.write(`[lsp-stderr] ${chunk}`);
});

function send(msg) {
  const body = JSON.stringify(msg);
  const header = `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n`;
  child.stdin.write(header + body);
}

function waitFor(predicate, label, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    // Check existing responses first.
    for (const r of responses) {
      if (predicate(r)) return resolve(r);
    }
    const timer = setTimeout(() => {
      waiters = waiters.filter(w => w.resolve !== resolve);
      reject(new Error(`timeout waiting for ${label}`));
    }, timeoutMs);
    waiters.push({
      predicate,
      resolve: (msg) => { clearTimeout(timer); resolve(msg); },
    });
  });
}

async function main() {
  // 1. initialize
  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { processId: process.pid, rootUri: `file://${projectRoot}`, capabilities: {} } });
  const initResp = await waitFor(m => m.id === 1, "initialize response");
  console.log("\n== initialize response ==");
  console.log(JSON.stringify(initResp.result.capabilities, null, 2));

  // 2. initialized notification
  send({ jsonrpc: "2.0", method: "initialized", params: {} });

  // 3. textDocument/didOpen
  const uri = `file://${fixture}`;
  send({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: { uri, languageId: "scrml", version: 1, text: fixtureText },
    },
  });

  // 4. textDocument/documentSymbol
  send({
    jsonrpc: "2.0",
    id: 2,
    method: "textDocument/documentSymbol",
    params: { textDocument: { uri } },
  });

  const symResp = await waitFor(m => m.id === 2, "documentSymbol response", 8000);
  console.log("\n== documentSymbol response (first 3 symbols) ==");
  const syms = symResp.result || [];
  for (const s of syms.slice(0, 3)) {
    console.log("- name:", s.name, "kind:", s.kind, "detail:", s.detail);
  }
  console.log(`(total: ${syms.length} top-level symbols)`);

  // 5. Validate
  const caps = initResp.result.capabilities;
  let ok = true;
  if (!caps.documentSymbolProvider) {
    console.error("\nFAIL: initialize did not advertise documentSymbolProvider");
    ok = false;
  } else {
    console.log("\nPASS: initialize advertises documentSymbolProvider:", caps.documentSymbolProvider);
  }
  if (!Array.isArray(syms) || syms.length === 0) {
    console.error("FAIL: documentSymbol returned no symbols");
    ok = false;
  } else {
    console.log("PASS: documentSymbol returned", syms.length, "top-level symbols");
  }

  // 6. Shutdown cleanly.
  send({ jsonrpc: "2.0", id: 99, method: "shutdown", params: null });
  await waitFor(m => m.id === 99, "shutdown response", 3000).catch(() => {});
  send({ jsonrpc: "2.0", method: "exit", params: null });
  setTimeout(() => {
    child.kill();
    process.exit(ok ? 0 : 1);
  }, 200);
}

main().catch((e) => {
  console.error("smoke-test failed:", e);
  child.kill();
  process.exit(1);
});
