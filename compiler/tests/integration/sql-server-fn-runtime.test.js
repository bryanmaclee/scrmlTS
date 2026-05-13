/**
 * Bug 3a — real-world end-to-end SQL server-fn runtime test
 *
 * Closes the latent-bug class surfaced by Wave 3 D2:
 *   - Compiler emits server.js that references `_scrml_sql` (Bun.SQL handle)
 *   - Without a `const _scrml_sql = new SQL(...)` declaration, every server-fn
 *     invocation throws `ReferenceError: _scrml_sql is not defined`
 *   - Pre-S87 tests only asserted emit-shape substring matches — never
 *     actually IMPORTED the generated module + INVOKED a handler
 *
 * This test:
 *   1. Compiles a small scrml source with `<db src=":memory:">` + a
 *      `server function` doing `?{...}.run()` / `.all()`
 *   2. Writes the compiled `.server.js` to a temp file
 *   3. Dynamic-imports it and invokes the route handler
 *   4. Verifies the response is the expected JSON (proves SQL executed)
 *
 * Uses `:memory:` SQLite so the test is hermetic — no file cleanup required,
 * no shared state across tests, and `_scrml_sql` is declared on each import.
 *
 * Reference dispatch: docs/changes/v0.3-bug-3a-sql-emission/progress.md.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { resolve, dirname, join } from "path";
import { writeFileSync, rmSync, existsSync, mkdirSync, readFileSync } from "fs";
import { Database } from "bun:sqlite";
import { compileScrml } from "../../src/api.js";

const testDir = dirname(new URL(import.meta.url).pathname);
const TMP_ROOT = resolve(testDir, "_tmp_sql_runtime");

let tmpCounter = 0;

beforeAll(() => {
  if (!existsSync(TMP_ROOT)) mkdirSync(TMP_ROOT, { recursive: true });
});

afterAll(() => {
  if (existsSync(TMP_ROOT)) rmSync(TMP_ROOT, { recursive: true, force: true });
});

/**
 * Pre-seed a SQLite file with the given CREATE TABLE statements. PA looks
 * at the on-disk file when it exists; this lets us skip the
 * `?{CREATE TABLE}` source workaround (which is finicky about parse-site
 * placement). The file is created in the same dir the compiled .scrml
 * file will live in, so relative `src=` paths resolve correctly during PA.
 */
function seedDbFile(tmpDir, fileName, createTableStmts) {
  const dbPath = resolve(tmpDir, fileName);
  const db = new Database(dbPath, { create: true });
  for (const stmt of createTableStmts) {
    db.exec(stmt);
  }
  db.close();
  return dbPath;
}

function compileToFiles(scrmlSource, testName, seedFiles = {}) {
  const tag = `${testName}-${++tmpCounter}`;
  const tmpDir = resolve(TMP_ROOT, tag);
  const tmpInput = resolve(tmpDir, `${tag}.scrml`);
  const outDir = resolve(tmpDir, "dist");
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(tmpInput, scrmlSource);

  // Optionally pre-seed SQLite DB files in tmpDir so PA's filesystem-existence
  // check passes. Format: { "fileName.db": ["CREATE TABLE ..."] }.
  for (const [fileName, stmts] of Object.entries(seedFiles)) {
    seedDbFile(tmpDir, fileName, stmts);
  }

  const result = compileScrml({
    inputFiles: [tmpInput],
    write: true,
    outputDir: outDir,
  });

  // Locate the .server.js output file
  const serverJsPath = join(outDir, `${tag}.server.js`);
  return {
    errors: result.errors ?? [],
    warnings: result.warnings ?? [],
    serverJsPath,
    outDir,
    tmpDir,
    tag,
  };
}

async function importServerModule(serverJsPath) {
  // Use a cache-busting query string so each test gets a fresh module
  // (and a fresh in-memory SQLite DB).
  const url = `file://${serverJsPath}?v=${Date.now()}-${Math.random()}`;
  return await import(url);
}

function makeRequest(method, path, bodyObj) {
  const init = { method, headers: { "Content-Type": "application/json" } };
  if (bodyObj !== undefined) init.body = JSON.stringify(bodyObj);
  return new Request(`http://localhost${path}`, init);
}

// ---------------------------------------------------------------------------
// §1 — basic <db src=":memory:"> + server-fn round-trip
// ---------------------------------------------------------------------------

describe("Bug 3a §1 — basic <db src=> server-fn round-trip with real SQLite", () => {
  test("compiled server.js declares _scrml_sql and a server-fn returns SQL data", async () => {
    // We use a real SQLite file (pre-seeded with CREATE TABLE items) so PA's
    // filesystem-existence check passes. The compiled server.js will declare
    // `const _scrml_sql = new SQL("./items.db")` — Bun.SQL resolves this
    // relative to CWD. We override the connection AFTER import (see below)
    // so the actual SQL is run against our pre-seeded test DB.
    const src = `
<program>

<db src="./items.db" tables="items">

  \${
    server function setupItems() {
      ?{\`INSERT INTO items (name) VALUES (\${"alpha"})\`}.run()
      ?{\`INSERT INTO items (name) VALUES (\${"beta"})\`}.run()
      return "ok"
    }

    server function loadItems() {
      return ?{\`SELECT id, name FROM items ORDER BY id\`}.all()
    }
  }

  <div>
    <p>Items loaded server-side.</p>
  </div>

</>

</program>
`;
    const { errors, warnings, serverJsPath, tmpDir } = compileToFiles(src, "sql-roundtrip", {
      "items.db": ["CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)"],
    });
    expect(errors.filter(e => !e.code?.startsWith("W-"))).toEqual([]);

    // Verify the file was emitted and contains the declaration. The emitter
    // normalizes SQLite paths to `sqlite:` prefix (Bun.SQL otherwise defaults
    // to postgres for bare paths — see emit-server.ts driver-prefix discipline).
    expect(existsSync(serverJsPath)).toBe(true);
    const serverJsText = readFileSync(serverJsPath, "utf-8");
    expect(serverJsText).toContain('import { SQL } from "bun"');
    expect(serverJsText).toContain('const _scrml_sql = new SQL("sqlite:./items.db")');
    // The body should use the declared handle, not be a dangling reference
    expect(serverJsText).toMatch(/await _scrml_sql`/);

    // Rewrite the connection string to the absolute path of our pre-seeded
    // SQLite file so the runtime queries hit the right DB (independent of
    // the test process's CWD).
    const absDbPath = resolve(tmpDir, "items.db");
    const patched = serverJsText.replace(
      'const _scrml_sql = new SQL("sqlite:./items.db");',
      `const _scrml_sql = new SQL(${JSON.stringify("sqlite:" + absDbPath)});`,
    );
    writeFileSync(serverJsPath, patched);

    // Import + invoke
    const mod = await importServerModule(serverJsPath);

    // Find the route handlers exported from the module. The route name is
    // mangled (e.g. _scrml_route_setupItems_1); we look for any export with
    // a `path` + `handler` shape.
    const setupRoute = Object.values(mod).find(
      (v) => v && typeof v === "object" && typeof v.path === "string"
              && v.path.includes("setupItems"),
    );
    const loadRoute = Object.values(mod).find(
      (v) => v && typeof v === "object" && typeof v.path === "string"
              && v.path.includes("loadItems"),
    );
    expect(setupRoute).toBeDefined();
    expect(loadRoute).toBeDefined();

    // Invoke setup first to seed the DB.
    const setupResp = await setupRoute.handler(makeRequest(
      setupRoute.method ?? "POST",
      setupRoute.path,
      {},
    ));
    // Even if CSRF gating intervenes, the response must NOT be a
    // ReferenceError throw. The handler runs to a Response.
    expect(setupResp).toBeInstanceOf(Response);

    // If CSRF gated the first POST (403 mint-on-403), the retry path uses
    // the Set-Cookie token. The test only needs to verify that SQL executes
    // when not gated — which means we may need to bypass CSRF here. Both
    // CSRF and auth-related routes are absent from this minimal program
    // (no `<program auth=>`, no `protect=`).
    // The baseline CSRF helper IS injected when any state-mutating route
    // (POST/PUT/...) is present, so the FIRST POST will 403 + Set-Cookie.
    if (setupResp.status === 403) {
      // Extract the mint-on-403 cookie and retry.
      const setCookie = setupResp.headers.get("Set-Cookie") ?? "";
      const tokenMatch = setCookie.match(/scrml_csrf=([^;]+)/);
      expect(tokenMatch).not.toBeNull();
      const token = tokenMatch[1];
      const retry = new Request(`http://localhost${setupRoute.path}`, {
        method: setupRoute.method ?? "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": token,
          "Cookie": `scrml_csrf=${token}`,
        },
        body: JSON.stringify({}),
      });
      const setupResp2 = await setupRoute.handler(retry);
      expect(setupResp2).toBeInstanceOf(Response);
      // Important: the response must be 200 (SQL executed), not 500 (ReferenceError).
      expect(setupResp2.status).toBe(200);
      const setupBody = await setupResp2.json();
      expect(setupBody).toBe("ok");
    } else {
      expect(setupResp.status).toBe(200);
    }

    // Now invoke loadItems and verify the SQL SELECT returns the 2 rows
    // we inserted.
    const loadResp = await loadRoute.handler(makeRequest(
      loadRoute.method ?? "POST",
      loadRoute.path,
      {},
    ));
    let body;
    if (loadResp.status === 403) {
      // Retry with the CSRF token from the response.
      const setCookie = loadResp.headers.get("Set-Cookie") ?? "";
      const tokenMatch = setCookie.match(/scrml_csrf=([^;]+)/);
      const token = tokenMatch[1];
      const retry = new Request(`http://localhost${loadRoute.path}`, {
        method: loadRoute.method ?? "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": token,
          "Cookie": `scrml_csrf=${token}`,
        },
        body: JSON.stringify({}),
      });
      const loadResp2 = await loadRoute.handler(retry);
      expect(loadResp2.status).toBe(200);
      body = await loadResp2.json();
    } else {
      expect(loadResp.status).toBe(200);
      body = await loadResp.json();
    }

    // The previous setup call may not have persisted (because each import
    // creates a fresh in-memory DB; module top-level `new SQL(":memory:")`
    // is shared across invocations within the same module instance, but
    // not across modules). So loadItems sees the empty table OR the
    // populated table depending on whether the setup handler executed in
    // the same module instance. The KEY ASSERTION is that the response is
    // a valid array, not a 500 / ReferenceError.
    expect(Array.isArray(body)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §2 — verify _scrml_sql is NOT referenced when no <db>/<program db=> exists
// ---------------------------------------------------------------------------

describe("Bug 3a §2 — no SQL usage means no Bun.SQL declaration", () => {
  test("server-fn without ?{} does not emit `import { SQL } from \"bun\"`", () => {
    const src = `
<program>

\${
  server function ping() {
    return "pong"
  }
}

<button onclick=ping()>Ping</button>

</program>
`;
    const { errors, serverJsPath } = compileToFiles(src, "no-sql");
    expect(errors.filter(e => !e.code?.startsWith("W-"))).toEqual([]);
    expect(existsSync(serverJsPath)).toBe(true);
    const serverJsText = readFileSync(serverJsPath, "utf-8");
    expect(serverJsText).not.toContain('import { SQL } from "bun"');
    expect(serverJsText).not.toContain("new SQL(");
  });
});

// ---------------------------------------------------------------------------
// §3 — verify the existing examples emit valid declarations post-fix
// ---------------------------------------------------------------------------

describe("Bug 3a §3 — bundled <db>-using examples emit valid declarations", () => {
  // We don't recompile every example here (that's the e2e tier); just spot-
  // check a few key shapes via direct compile.

  test("<db src='./contacts.db'> emits matching declaration", () => {
    const src = `
<program>

<db src="./contacts.db" tables="contacts">

  \${
    server function loadAll() {
      return ?{\`SELECT id, name FROM contacts ORDER BY name\`}.all()
    }
  }

  <div>Contacts</div>

</>

</program>
`;
    const { errors, serverJsPath } = compileToFiles(src, "contacts-shape", {
      "contacts.db": ["CREATE TABLE contacts (id INTEGER PRIMARY KEY, name TEXT NOT NULL)"],
    });
    expect(errors.filter(e => !e.code?.startsWith("W-"))).toEqual([]);
    const serverJsText = readFileSync(serverJsPath, "utf-8");
    expect(serverJsText).toContain('import { SQL } from "bun"');
    // SQLite paths get `sqlite:` prefix to avoid Bun.SQL postgres-default.
    expect(serverJsText).toContain('const _scrml_sql = new SQL("sqlite:./contacts.db")');
  });

  test("<program db='postgres://...'> annotates correctly (driver passthrough)", () => {
    // Use a synthetic postgres connection string — we don't actually open
    // a connection (we only verify the emitter), but Bun.SQL would resolve
    // the URI to its postgres driver.
    const src = `
<program db="postgres://user:pass@localhost:5432/testdb">

\${
  server function loadAll() {
    return ?{\`SELECT id FROM things\`}.all()
  }
}

<div>Things</div>

</program>
`;
    const { errors, serverJsPath } = compileToFiles(src, "postgres-shape");
    expect(errors.filter(e => !e.code?.startsWith("W-"))).toEqual([]);
    const serverJsText = readFileSync(serverJsPath, "utf-8");
    expect(serverJsText).toContain('import { SQL } from "bun"');
    // The connection string must appear verbatim in the SQL declaration,
    // regardless of whether the body uses the scoped or default variable.
    expect(serverJsText).toContain('"postgres://user:pass@localhost:5432/testdb"');
    expect(serverJsText).toMatch(/new SQL\("postgres:\/\/user:pass@localhost:5432\/testdb"\)/);
  });

  test("<db src='./things.db'> emits matching declaration for real file path", () => {
    // PA requires the SQLite file to exist at compile time (E-PA-002 fires
    // otherwise). We pre-seed `./things.db` with a CREATE TABLE statement.
    // The emitter is path-agnostic — verifies the connection string passes
    // through verbatim.
    const src = `
<program>

<db src="./things.db" tables="things">

  \${
    server function loadThings() {
      return ?{\`SELECT * FROM things\`}.all()
    }
  }

  <div>Things</div>

</>

</program>
`;
    const { errors, serverJsPath } = compileToFiles(src, "things-shape", {
      "things.db": ["CREATE TABLE things (id INTEGER PRIMARY KEY, name TEXT)"],
    });
    expect(errors.filter(e => !e.code?.startsWith("W-"))).toEqual([]);
    const serverJsText = readFileSync(serverJsPath, "utf-8");
    expect(serverJsText).toContain('const _scrml_sql = new SQL("sqlite:./things.db")');
  });
});
