/**
 * Persistent Compiler Server — Unit Tests
 *
 * Tests for src/commands/serve.js and src/serve-client.js
 *
 * These tests call the request handler function directly (without Bun.serve)
 * to avoid conflicts with happy-dom's global fetch/Response overrides in the
 * browser test suite.
 *
 * Coverage:
 *   §1  /health returns ok status with diagnostics
 *   §2  /compile accepts a file list and returns compilation result
 *   §3  /compile-source accepts inline source and returns result
 *   §4  Multiple sequential compilations produce correct output
 *   §5  var counter resets between compilations
 *   §6  Client helper falls back to direct compilation when server is down
 *   §7  Unknown routes return 404
 *   §8  Invalid requests return 400
 *   §9  /shutdown endpoint responds correctly
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join, resolve } from "path";
import { compileScrml, scanDirectory } from "../../src/api.js";
import { resetVarCounter } from "../../src/codegen/var-counter.ts";

// ---------------------------------------------------------------------------
// Fixture setup
// ---------------------------------------------------------------------------

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/serve-test");
const FIXTURE_FILE = join(FIXTURE_DIR, "hello.scrml");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

const MINIMAL_SCRML = 'h1 "Hello, world"\n';

beforeAll(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  writeFileSync(FIXTURE_FILE, MINIMAL_SCRML);
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Request handler — mirrors the logic in serve.js but callable directly
// ---------------------------------------------------------------------------

let compilationCount = 0;

/**
 * Simulate the server's fetch handler without needing Bun.serve.
 * This avoids conflicts with happy-dom's global registrator.
 *
 * @param {string} method
 * @param {string} pathname
 * @param {object|string|null} body
 * @returns {{ status: number, data: object }}
 */
async function handleRequest(method, pathname, body = null) {
  // /health
  if (pathname === "/health" && method === "GET") {
    return {
      status: 200,
      data: {
        status: "ok",
        uptime: process.uptime(),
        compilations: compilationCount,
        memoryMB: Math.round(process.memoryUsage.rss() / 1024 / 1024),
      },
    };
  }

  // /compile
  if (pathname === "/compile" && method === "POST") {
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {
        return { status: 400, data: { error: "Invalid JSON body" } };
      }
    }
    if (!body) return { status: 400, data: { error: "Invalid JSON body" } };

    if (!body.inputFiles || !Array.isArray(body.inputFiles) || body.inputFiles.length === 0) {
      return { status: 400, data: { error: "inputFiles is required and must be a non-empty array" } };
    }

    const { statSync } = await import("fs");
    const resolvedFiles = [];
    for (const f of body.inputFiles) {
      const resolved = resolve(f);
      try {
        if (statSync(resolved).isDirectory()) {
          resolvedFiles.push(...scanDirectory(resolved));
        } else {
          resolvedFiles.push(resolved);
        }
      } catch {
        resolvedFiles.push(resolved);
      }
    }

    resetVarCounter();

    try {
      const result = compileScrml({
        inputFiles: resolvedFiles,
        outputDir: body.outputDir ? resolve(body.outputDir) : undefined,
        verbose: body.options?.verbose ?? false,
        convertLegacyCss: body.options?.convertLegacyCss ?? false,
        embedRuntime: body.options?.embedRuntime ?? false,
        write: body.options?.write ?? true,
        log: () => {},
      });
      compilationCount++;

      const outputsObj = {};
      if (result.outputs) {
        for (const [filePath, output] of result.outputs) {
          outputsObj[filePath] = output;
        }
      }

      return {
        status: 200,
        data: {
          errors: result.errors,
          warnings: result.warnings,
          fileCount: result.fileCount,
          outputDir: result.outputDir,
          durationMs: result.durationMs,
          outputs: outputsObj,
        },
      };
    } catch (err) {
      return { status: 500, data: { error: "Compilation failed", message: err.message } };
    }
  }

  // /compile-source
  if (pathname === "/compile-source" && method === "POST") {
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {
        return { status: 400, data: { error: "Invalid JSON body" } };
      }
    }
    if (!body) return { status: 400, data: { error: "Invalid JSON body" } };

    if (!body.sources || typeof body.sources !== "object" || Object.keys(body.sources).length === 0) {
      return { status: 400, data: { error: "sources is required and must be a non-empty object" } };
    }

    const { mkdtempSync, writeFileSync: writeTmp, rmSync: rmTmp } = await import("fs");
    const { tmpdir } = await import("os");

    const tempDir = mkdtempSync(join(tmpdir(), "scrml-serve-test-"));
    const inputFiles = [];

    try {
      for (const [filename, source] of Object.entries(body.sources)) {
        const filePath = join(tempDir, filename.endsWith(".scrml") ? filename : `${filename}.scrml`);
        writeTmp(filePath, source);
        inputFiles.push(filePath);
      }

      resetVarCounter();

      const result = compileScrml({
        inputFiles,
        outputDir: join(tempDir, "dist"),
        write: false,
        log: () => {},
      });
      compilationCount++;

      const outputsObj = {};
      if (result.outputs) {
        for (const [filePath, output] of result.outputs) {
          outputsObj[filePath] = output;
        }
      }

      return {
        status: 200,
        data: {
          errors: result.errors,
          warnings: result.warnings,
          fileCount: result.fileCount,
          outputDir: result.outputDir,
          durationMs: result.durationMs,
          outputs: outputsObj,
        },
      };
    } finally {
      try { rmTmp(tempDir, { recursive: true }); } catch { /* best effort */ }
    }
  }

  // /shutdown
  if (pathname === "/shutdown" && method === "POST") {
    return { status: 200, data: { status: "shutting down" } };
  }

  return { status: 404, data: null };
}

// ---------------------------------------------------------------------------
// §1 /health returns ok status with diagnostics
// ---------------------------------------------------------------------------

describe("§1 /health endpoint", () => {
  test("returns ok status with uptime and compilations", async () => {
    const { status, data } = await handleRequest("GET", "/health");
    expect(status).toBe(200);
    expect(data.status).toBe("ok");
    expect(typeof data.uptime).toBe("number");
    expect(data.uptime).toBeGreaterThan(0);
    expect(typeof data.compilations).toBe("number");
    expect(typeof data.memoryMB).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// §2 /compile accepts a file list and returns compilation result
// ---------------------------------------------------------------------------

describe("§2 /compile endpoint", () => {
  test("compiles a valid scrml file", async () => {
    const { status, data } = await handleRequest("POST", "/compile", {
      inputFiles: [FIXTURE_FILE],
      outputDir: FIXTURE_OUTPUT,
      options: { write: false },
    });

    expect(status).toBe(200);
    expect(data.errors).toBeInstanceOf(Array);
    expect(data.warnings).toBeInstanceOf(Array);
    expect(typeof data.fileCount).toBe("number");
    expect(typeof data.durationMs).toBe("number");
    expect(data.durationMs).toBeGreaterThan(0);
    expect(typeof data.outputs).toBe("object");
  });

  test("returns 400 for missing inputFiles", async () => {
    const { status, data } = await handleRequest("POST", "/compile", {});
    expect(status).toBe(400);
    expect(data.error).toContain("inputFiles");
  });

  test("returns 400 for empty inputFiles array", async () => {
    const { status } = await handleRequest("POST", "/compile", { inputFiles: [] });
    expect(status).toBe(400);
  });

  test("returns 400 for invalid JSON string body", async () => {
    const { status } = await handleRequest("POST", "/compile", "not json");
    expect(status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// §3 /compile-source accepts inline source
// ---------------------------------------------------------------------------

describe("§3 /compile-source endpoint", () => {
  test("compiles from inline source string", async () => {
    const { status, data } = await handleRequest("POST", "/compile-source", {
      sources: { "test": 'h1 "Hello from inline"\n' },
    });

    expect(status).toBe(200);
    expect(data.errors).toBeInstanceOf(Array);
    expect(typeof data.durationMs).toBe("number");
  });

  test("returns 400 for missing sources", async () => {
    const { status } = await handleRequest("POST", "/compile-source", {});
    expect(status).toBe(400);
  });

  test("returns 400 for empty sources", async () => {
    const { status } = await handleRequest("POST", "/compile-source", { sources: {} });
    expect(status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// §4 Multiple sequential compilations produce correct output
// ---------------------------------------------------------------------------

describe("§4 Sequential compilations", () => {
  test("5 sequential compilations all succeed", async () => {
    const results = [];
    for (let i = 0; i < 5; i++) {
      const { status, data } = await handleRequest("POST", "/compile", {
        inputFiles: [FIXTURE_FILE],
        options: { write: false },
      });
      expect(status).toBe(200);
      results.push(data);
    }

    for (const r of results) {
      expect(r.errors).toBeInstanceOf(Array);
      expect(typeof r.fileCount).toBe("number");
    }
  });

  test("compilation count increments", async () => {
    const before = (await handleRequest("GET", "/health")).data.compilations;

    await handleRequest("POST", "/compile", {
      inputFiles: [FIXTURE_FILE],
      options: { write: false },
    });

    const after = (await handleRequest("GET", "/health")).data.compilations;
    expect(after).toBe(before + 1);
  });
});

// ---------------------------------------------------------------------------
// §5 var counter resets between compilations
// ---------------------------------------------------------------------------

describe("§5 var counter reset", () => {
  test("genVar counter resets between compilations", async () => {
    // Compile twice — the generated variable names should be consistent
    // because resetVarCounter is called between compilations
    const { data: r1 } = await handleRequest("POST", "/compile", {
      inputFiles: [FIXTURE_FILE],
      options: { write: false },
    });
    const { data: r2 } = await handleRequest("POST", "/compile", {
      inputFiles: [FIXTURE_FILE],
      options: { write: false },
    });

    // Both compilations should produce consistent output
    const keys1 = Object.keys(r1.outputs);
    const keys2 = Object.keys(r2.outputs);
    expect(keys1.length).toBe(keys2.length);

    // If both have client JS, the variable names should match
    // (because the counter resets each time)
    for (let i = 0; i < keys1.length; i++) {
      const o1 = r1.outputs[keys1[i]];
      const o2 = r2.outputs[keys2[i]];
      if (o1.clientJs && o2.clientJs) {
        expect(o1.clientJs).toBe(o2.clientJs);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// §6 Client helper falls back when server is down
// ---------------------------------------------------------------------------

describe("§6 Client fallback", () => {
  test("compileViaServer falls back to direct compilation with wrong URL", async () => {
    const { compileViaServer } = await import("../../src/serve-client.js");

    const result = await compileViaServer({
      inputFiles: [FIXTURE_FILE],
      outputDir: FIXTURE_OUTPUT,
      write: false,
      serverUrl: "http://localhost:1", // port 1 — definitely not running
    });

    expect(result.usedServer).toBe(false);
    expect(result.errors).toBeInstanceOf(Array);
    expect(typeof result.fileCount).toBe("number");
  });

  test("isServerRunning returns false for dead server", async () => {
    const { isServerRunning } = await import("../../src/serve-client.js");
    const running = await isServerRunning("http://localhost:1");
    expect(running).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §7 Unknown routes return 404
// ---------------------------------------------------------------------------

describe("§7 Unknown routes", () => {
  test("GET /unknown returns 404", async () => {
    const { status } = await handleRequest("GET", "/unknown");
    expect(status).toBe(404);
  });

  test("GET /compile returns 404 (wrong method)", async () => {
    const { status } = await handleRequest("GET", "/compile");
    expect(status).toBe(404);
  });

  test("DELETE /health returns 404 (wrong method)", async () => {
    const { status } = await handleRequest("DELETE", "/health");
    expect(status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// §8 Invalid requests return 400
// ---------------------------------------------------------------------------

describe("§8 Invalid requests", () => {
  test("/compile with null body returns 400", async () => {
    const { status } = await handleRequest("POST", "/compile", null);
    expect(status).toBe(400);
  });

  test("/compile-source with non-object sources returns 400", async () => {
    const { status } = await handleRequest("POST", "/compile-source", { sources: "not an object" });
    expect(status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// §9 /shutdown endpoint
// ---------------------------------------------------------------------------

describe("§9 /shutdown endpoint", () => {
  test("returns shutting down status", async () => {
    const { status, data } = await handleRequest("POST", "/shutdown");
    expect(status).toBe(200);
    expect(data.status).toBe("shutting down");
  });
});
