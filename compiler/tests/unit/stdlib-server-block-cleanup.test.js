// ---------------------------------------------------------------------------
// stdlib-server-block-cleanup — Insight 26 Batch 2 D3 regression guard.
//
// After the 2026-05-08 cleanup, stdlib MUST NOT contain decorative
// `server { ... }` body wraps. Route inference handles classification via
// §12.2 Triggers (1, 2, 3, 5) and SERVER_ONLY_SCRML_MODULES; the decorative
// wraps were removed because they had no parser semantic and no behavioral
// effect (compiler/src/api.js:51). This test guards against re-introduction.
//
// Per Insight 26 E1 surprise finding, `safeCompare` (stdlib/crypto/index.scrml)
// must be declared `fn` rather than `function` (and definitely NOT
// server-wrapped) — it is a constant-time string compare, structurally pure.
// ---------------------------------------------------------------------------

import { test, describe, expect } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STDLIB_ROOT = resolve(__dirname, "..", "..", "..", "stdlib");

/** Walk a directory recursively and collect all .scrml files. */
function collectScrmlFiles(dir) {
  const out = [];
  const entries = readdirSync(dir);
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...collectScrmlFiles(full));
    else if (name.endsWith(".scrml")) out.push(full);
  }
  return out;
}

const allStdlibFiles = collectScrmlFiles(STDLIB_ROOT);

describe("stdlib server-block cleanup (Insight 26 Batch 2 D3)", () => {
  test("stdlib has no decorative `server { ... }` body wraps", () => {
    const offenders = [];
    for (const file of allStdlibFiles) {
      const src = readFileSync(file, "utf-8");
      const lines = src.split("\n");
      lines.forEach((line, idx) => {
        // Match a leading-whitespace `server {` body wrap (the decorative
        // form audited 2026-05-08). The regex matches indented `server {`
        // on its own — not `server function`, not `server @var`,
        // not `server-only` in comments, etc.
        if (/^\s+server\s*\{\s*$/.test(line)) {
          offenders.push(`${file}:${idx + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  test("safeCompare is declared `fn`, not `function`", () => {
    const cryptoSrc = readFileSync(
      resolve(STDLIB_ROOT, "crypto", "index.scrml"),
      "utf-8",
    );
    expect(cryptoSrc).toContain("export fn safeCompare(");
    // Negative: must NOT contain the old `function`-shaped declaration.
    expect(cryptoSrc).not.toContain("export function safeCompare(");
    // Negative: must NOT contain the old server-wrap.
    expect(cryptoSrc).not.toMatch(/\n\s+export\s+(?:async\s+)?function\s+safeCompare[\s\S]{0,200}server\s*\{/);
  });

  test("each cleaned-up stdlib module retains its public exports", () => {
    // Spot-check the load-bearing exports from each cleaned-up module.
    const expectedExports = {
      "auth/password.scrml": ["hashPassword", "verifyPassword", "generatePassword"],
      "auth/jwt.scrml": ["signJwt", "verifyJwt", "decodeJwt"],
      "auth/index.scrml": ["createRateLimiter", "generateTotpSecret", "verifyTotp"],
      "oauth/pkce.scrml": ["generateVerifier", "deriveChallenge", "PKCE_METHOD"],
      "fs/index.scrml": [
        "readFileSync", "writeFileSync", "existsSync", "mkdirSync",
        "readdirSync", "statSync", "rmSync",
      ],
      "path/index.scrml": [
        "join", "resolve", "dirname", "basename", "extname",
        "relative", "normalize",
      ],
      "process/index.scrml": [
        "cwd", "env", "argv", "platform", "exit", "uptime", "memoryUsage",
      ],
      "crypto/index.scrml": [
        "hash", "verifyHash", "generateToken", "generateUUID", "hmac", "safeCompare",
      ],
    };
    for (const [rel, names] of Object.entries(expectedExports)) {
      const src = readFileSync(resolve(STDLIB_ROOT, rel), "utf-8");
      for (const name of names) {
        // Each export name must appear preceded by `export` somewhere — but
        // we don't pin the exact form (`function` vs `fn` vs `const`).
        const re = new RegExp(`\\bexport\\b[^\\n]*\\b${name}\\b`);
        expect(src).toMatch(re);
      }
    }
  });

  test("stdlib module headers no longer reference `server {} blocks` as user-facing instruction", () => {
    // The old comments said things like "Call from server function bodies or
    // server {} blocks". Those are now misleading. Spot-check the cleaned-up
    // files do not promise the user that they need a server {} wrap.
    const filesToCheck = [
      "auth/password.scrml",
      "auth/jwt.scrml",
      "fs/index.scrml",
      "path/index.scrml",
      "process/index.scrml",
      "crypto/index.scrml",
      "oauth/pkce.scrml",
    ];
    for (const rel of filesToCheck) {
      const src = readFileSync(resolve(STDLIB_ROOT, rel), "utf-8");
      // Negative: instruction "Call from server function bodies or server {} blocks"
      // should not appear (it does in the pre-cleanup state).
      expect(src).not.toContain("Call from server function");
      expect(src).not.toContain("from server function bodies");
    }
  });
});
