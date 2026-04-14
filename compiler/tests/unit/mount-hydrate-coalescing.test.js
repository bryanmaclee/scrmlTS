/**
 * §8.11 Mount-Hydration Coalescing — Slice 6 (F9.C __mountHydrate)
 *
 * Coverage:
 *   §1  2 callable server @var → one __mountHydrate route emitted, per-var
 *       initial-load IIFEs replaced with one unified fetch.
 *   §2  3 callable server @var → all three keys present in response + client
 *       demux.
 *   §3  1 callable + 1 literal placeholder → no coalescing (only 1 callable).
 *       Per-var IIFE path; no __mountHydrate route.
 *   §4  1 callable server @var → per-var IIFE path unchanged; no route.
 *   §5  0 server @var → no __mountHydrate route, no change.
 *   §6  Writes (assignments) still emit per-var sync stub + optimistic update
 *       (§8.11.3 — writes stay 1:1).
 *   §7  Route shape: POST /__mountHydrate exported as _scrml_route___mountHydrate.
 *   §8  Tier 1 coalescing integration — Batch Planner will see sibling DGNodes
 *       inside the synthetic handler. (Forward-looking: we verify the handler
 *       body contains the loader expressions as siblings. §8.11.2.)
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function compile(source) {
  const dir = mkdtempSync(join(tmpdir(), "scrml-mh-"));
  const file = join(dir, "test.scrml");
  writeFileSync(file, source);
  try {
    return compileScrml({ inputFiles: [file], outputDir: null, write: false, log: () => {} });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function clientJsOf(result) {
  return [...(result.outputs?.values() ?? [])].map((o) => o.clientJs ?? "").join("\n");
}
function serverJsOf(result) {
  return [...(result.outputs?.values() ?? [])].map((o) => o.serverJs ?? "").join("\n");
}

// ---------------------------------------------------------------------------
// §1: 2 callable server @var → coalesced
// ---------------------------------------------------------------------------

describe("§1 two callable server @var → mount-hydrate coalescing", () => {
  test("server JS emits synthetic __mountHydrate route", () => {
    const src = [
      '<program db="test.db">',
      "${ server function loadA() { return 1 } }",
      "${ server function loadB() { return 2 } }",
      "${ server @a = loadA() }",
      "${ server @b = loadB() }",
      "</>",
    ].join("\n");
    const server = serverJsOf(compile(src));
    expect(server).toContain("_scrml_route___mountHydrate");
    expect(server).toContain('path: "/__mountHydrate"');
    expect(server).toContain('method: "POST"');
    expect(server).toContain("Promise.all");
  });

  test("client JS emits unified fetch and demuxes both vars", () => {
    const src = [
      '<program db="test.db">',
      "${ server function loadA() { return 1 } }",
      "${ server function loadB() { return 2 } }",
      "${ server @a = loadA() }",
      "${ server @b = loadB() }",
      "</>",
    ].join("\n");
    const client = clientJsOf(compile(src));
    expect(client).toContain('fetch("/__mountHydrate"');
    expect(client).toContain('_scrml_reactive_set("a", _scrml_mh_json["a"])');
    expect(client).toContain('_scrml_reactive_set("b", _scrml_mh_json["b"])');
  });

  test("client JS replaces per-var initial-load IIFEs for coalesced vars", () => {
    const src = [
      '<program db="test.db">',
      "${ server function loadA() { return 1 } }",
      "${ server function loadB() { return 2 } }",
      "${ server @a = loadA() }",
      "${ server @b = loadB() }",
      "</>",
    ].join("\n");
    const client = clientJsOf(compile(src));
    // Under coalescing, per-var §52.6.1 IIFE comments are suppressed for the
    // coalesced vars — only the unified /__mountHydrate block appears.
    expect(client).not.toContain("server @a — initial load on mount");
    expect(client).not.toContain("server @b — initial load on mount");
    expect(client).toContain("coalesced via /__mountHydrate");
  });
});

// ---------------------------------------------------------------------------
// §2: 3 callable server @var → all three keys
// ---------------------------------------------------------------------------

describe("§2 three callable server @var → all keys coalesced", () => {
  test("server response object has all three keys", () => {
    const src = [
      '<program db="test.db">',
      "${ server function loadA() { return 1 } }",
      "${ server function loadB() { return 2 } }",
      "${ server function loadC() { return 3 } }",
      "${ server @a = loadA() }",
      "${ server @b = loadB() }",
      "${ server @c = loadC() }",
      "</>",
    ].join("\n");
    const server = serverJsOf(compile(src));
    expect(server).toContain('"a": _scrml_mh_v0');
    expect(server).toContain('"b": _scrml_mh_v1');
    expect(server).toContain('"c": _scrml_mh_v2');
  });

  test("client demuxes all three", () => {
    const src = [
      '<program db="test.db">',
      "${ server function loadA() { return 1 } }",
      "${ server function loadB() { return 2 } }",
      "${ server function loadC() { return 3 } }",
      "${ server @a = loadA() }",
      "${ server @b = loadB() }",
      "${ server @c = loadC() }",
      "</>",
    ].join("\n");
    const client = clientJsOf(compile(src));
    expect(client).toContain('_scrml_reactive_set("a"');
    expect(client).toContain('_scrml_reactive_set("b"');
    expect(client).toContain('_scrml_reactive_set("c"');
  });
});

// ---------------------------------------------------------------------------
// §3: 1 callable + 1 literal placeholder → no coalescing
// ---------------------------------------------------------------------------

describe("§3 one callable + one literal → no coalescing", () => {
  test("no __mountHydrate route emitted", () => {
    const src = [
      '<program db="test.db">',
      "${ server function loadA() { return 1 } }",
      "${ server @a = loadA() }",
      "${ server @count = 0 }",
      "</>",
    ].join("\n");
    const server = serverJsOf(compile(src));
    expect(server).not.toContain("_scrml_route___mountHydrate");
    expect(server).not.toContain("/__mountHydrate");
  });

  test("per-var IIFE is emitted for the callable one", () => {
    const src = [
      '<program db="test.db">',
      "${ server function loadA() { return 1 } }",
      "${ server @a = loadA() }",
      "${ server @count = 0 }",
      "</>",
    ].join("\n");
    const client = clientJsOf(compile(src));
    // The per-var §52.6.1 IIFE wraps the initial load in `(async () => {`.
    // Route inference rewrites `loadA()` → `_scrml_fetch_loadA_N()` on the
    // client; we just verify the IIFE exists for @a.
    expect(client).toContain("server @a — initial load on mount");
    expect(client).toMatch(/\(async \(\) => \{[\s\S]*_scrml_reactive_set\("a"/);
  });
});

// ---------------------------------------------------------------------------
// §4: single callable server @var → unchanged per-var IIFE
// ---------------------------------------------------------------------------

describe("§4 single callable server @var → no coalescing", () => {
  test("no __mountHydrate route emitted", () => {
    const src = [
      '<program db="test.db">',
      "${ server function loadA() { return 1 } }",
      "${ server @a = loadA() }",
      "</>",
    ].join("\n");
    const server = serverJsOf(compile(src));
    expect(server).not.toContain("__mountHydrate");
  });

  test("per-var IIFE unchanged", () => {
    const src = [
      '<program db="test.db">',
      "${ server function loadA() { return 1 } }",
      "${ server @a = loadA() }",
      "</>",
    ].join("\n");
    const client = clientJsOf(compile(src));
    expect(client).toContain("server @a — initial load on mount");
    expect(client).not.toContain("/__mountHydrate");
  });
});

// ---------------------------------------------------------------------------
// §5: no server @var → no change, no route
// ---------------------------------------------------------------------------

describe("§5 no server @var → no route, no change", () => {
  test("no __mountHydrate in server or client output", () => {
    const src = [
      '<program db="test.db">',
      "${ @x = 0 }",
      "</>",
    ].join("\n");
    const server = serverJsOf(compile(src));
    const client = clientJsOf(compile(src));
    expect(server).not.toContain("__mountHydrate");
    expect(client).not.toContain("__mountHydrate");
  });
});

// ---------------------------------------------------------------------------
// §6: writes stay 1:1 (§8.11.3)
// ---------------------------------------------------------------------------

describe("§6 server @var writes stay 1:1 under coalescing", () => {
  test("per-var sync stub + optimistic subscribe still emitted", () => {
    const src = [
      '<program db="test.db">',
      "${ server function loadA() { return 1 } }",
      "${ server function loadB() { return 2 } }",
      "${ server @a = loadA() }",
      "${ server @b = loadB() }",
      "</>",
    ].join("\n");
    const client = clientJsOf(compile(src));
    expect(client).toContain("async function _scrml_server_sync_a");
    expect(client).toContain("async function _scrml_server_sync_b");
    expect(client).toContain('_scrml_reactive_subscribe("a"');
    expect(client).toContain('_scrml_reactive_subscribe("b"');
  });
});

// ---------------------------------------------------------------------------
// §7: route export shape matches _scrml_route_* convention
// ---------------------------------------------------------------------------

describe("§7 route export matches convention", () => {
  test("export const _scrml_route___mountHydrate = { path, method, handler }", () => {
    const src = [
      '<program db="test.db">',
      "${ server function loadA() { return 1 } }",
      "${ server function loadB() { return 2 } }",
      "${ server @a = loadA() }",
      "${ server @b = loadB() }",
      "</>",
    ].join("\n");
    const server = serverJsOf(compile(src));
    expect(server).toMatch(/export const _scrml_route___mountHydrate = \{/);
    expect(server).toContain("handler: _scrml_mountHydrate_handler");
  });
});

// ---------------------------------------------------------------------------
// §8: handler body contains sibling loader expressions (Tier 1 will see them)
// ---------------------------------------------------------------------------

describe("§8 handler body has sibling loader expressions", () => {
  test("Promise.all includes each loader call wrapped in Promise.resolve", () => {
    const src = [
      '<program db="test.db">',
      "${ server function loadA() { return 1 } }",
      "${ server function loadB() { return 2 } }",
      "${ server @a = loadA() }",
      "${ server @b = loadB() }",
      "</>",
    ].join("\n");
    const server = serverJsOf(compile(src));
    expect(server).toContain("Promise.resolve(loadA())");
    expect(server).toContain("Promise.resolve(loadB())");
  });
});
