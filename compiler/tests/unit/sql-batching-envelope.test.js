/**
 * Tier 1 Implicit Per-Handler Transaction Envelope — CG Tests (Slice 3b)
 *
 * Verifies that CG consumes the Stage 7.5 BatchPlan and wraps `!` server
 * handler bodies in `?{BEGIN DEFERRED}` / `?{COMMIT}` / catch-`?{ROLLBACK}`
 * (§8.9.2, §19.10.5) when an implicit-handler-tx CoalescingGroup is
 * recorded and no E-BATCH-001 composition error fired.
 *
 * Coverage:
 *   §1  `!` handler with 2 SQL sites → envelope emitted
 *   §2  non-`!` handler with 2 SQL sites → no envelope (prepare-lock-only)
 *   §3  `!` handler with single SQL site → no envelope
 *   §4  envelope wraps: BEGIN DEFERRED precedes IIFE, COMMIT follows, catch/ROLLBACK after
 *   §5  regression: handler with `.nobatch()` excluding all but one → no envelope
 *   §6  envelope is per-handler, not file-global
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function compile(source) {
  const dir = mkdtempSync(join(tmpdir(), "scrml-env-"));
  const file = join(dir, "test.scrml");
  writeFileSync(file, source);
  try {
    return compileScrml({ inputFiles: [file], outputDir: null, write: false, log: () => {} });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// §1
// ---------------------------------------------------------------------------

describe("§1 `!` handler with 2 coalescing SQL → envelope emitted", () => {
  test("server JS contains BEGIN DEFERRED, COMMIT, and catch/ROLLBACK", () => {
    const src = [
      '<program db="test.db">',
      "${ server function load(id)! {",
      "    let a = ?{`SELECT * FROM users WHERE id = ${id}`}.get()",
      "    let b = ?{`SELECT * FROM posts WHERE user_id = ${id}`}.all()",
      "    return { a, b }",
      "} }",
      "</>",
    ].join("\n");
    const result = compile(src);
    const js = [...(result.outputs?.values() ?? [])]
      .map((o) => o.serverJs ?? "")
      .join("\n");
    expect(js).toContain('_scrml_db.exec("BEGIN DEFERRED")');
    expect(js).toContain('_scrml_db.exec("COMMIT")');
    expect(js).toContain('_scrml_db.exec("ROLLBACK")');
    expect(js).toContain("_scrml_batch_err");
  });
});

// ---------------------------------------------------------------------------
// §2
// ---------------------------------------------------------------------------

describe("§2 non-`!` handler — no envelope even with 2 SQL sites", () => {
  test("server JS has no BEGIN DEFERRED for prepare-lock-only handler", () => {
    const src = [
      '<program db="test.db">',
      "${ server function load(id) {",
      "    let a = ?{`SELECT * FROM users WHERE id = ${id}`}.get()",
      "    let b = ?{`SELECT * FROM posts WHERE user_id = ${id}`}.all()",
      "    return { a, b }",
      "} }",
      "</>",
    ].join("\n");
    const result = compile(src);
    const js = [...(result.outputs?.values() ?? [])]
      .map((o) => o.serverJs ?? "")
      .join("\n");
    expect(js).not.toContain('_scrml_db.exec("BEGIN DEFERRED")');
  });
});

// ---------------------------------------------------------------------------
// §3
// ---------------------------------------------------------------------------

describe("§3 `!` handler with single SQL site → no envelope", () => {
  test("no coalescing → no envelope emitted", () => {
    const src = [
      '<program db="test.db">',
      "${ server function one(id)! {",
      "    return ?{`SELECT * FROM users WHERE id = ${id}`}.get()",
      "} }",
      "</>",
    ].join("\n");
    const result = compile(src);
    const js = [...(result.outputs?.values() ?? [])]
      .map((o) => o.serverJs ?? "")
      .join("\n");
    expect(js).not.toContain('_scrml_db.exec("BEGIN DEFERRED")');
  });
});

// ---------------------------------------------------------------------------
// §4
// ---------------------------------------------------------------------------

describe("§4 envelope structure is correct", () => {
  test("BEGIN DEFERRED precedes IIFE; COMMIT follows; catch/ROLLBACK at tail", () => {
    const src = [
      '<program db="test.db">',
      "${ server function wrap(id)! {",
      "    let a = ?{`SELECT * FROM users WHERE id = ${id}`}.get()",
      "    let b = ?{`SELECT * FROM posts WHERE user_id = ${id}`}.all()",
      "    return { a, b }",
      "} }",
      "</>",
    ].join("\n");
    const result = compile(src);
    const js = [...(result.outputs?.values() ?? [])]
      .map((o) => o.serverJs ?? "")
      .join("\n");
    const idxBegin = js.indexOf('_scrml_db.exec("BEGIN DEFERRED")');
    const idxIife = js.indexOf("const _scrml_result = await (async () =>", idxBegin);
    const idxCommit = js.indexOf('_scrml_db.exec("COMMIT")', idxBegin);
    const idxCatch = js.indexOf("catch (_scrml_batch_err)", idxBegin);
    const idxRollback = js.indexOf('_scrml_db.exec("ROLLBACK")', idxBegin);
    expect(idxBegin).toBeGreaterThan(-1);
    expect(idxIife).toBeGreaterThan(idxBegin);
    expect(idxCommit).toBeGreaterThan(idxIife);
    expect(idxCatch).toBeGreaterThan(idxCommit);
    expect(idxRollback).toBeGreaterThan(idxCatch);
  });
});

// ---------------------------------------------------------------------------
// §5
// ---------------------------------------------------------------------------

describe("§5 `.nobatch()` pulling a handler below 2 eligible sites → no envelope", () => {
  test("one of two SQL sites is .nobatch() → no envelope", () => {
    const src = [
      '<program db="test.db">',
      "${ server function mixed(id)! {",
      "    let a = ?{`SELECT * FROM users WHERE id = ${id}`}.nobatch().get()",
      "    let b = ?{`SELECT * FROM posts WHERE user_id = ${id}`}.all()",
      "    return { a, b }",
      "} }",
      "</>",
    ].join("\n");
    const result = compile(src);
    const js = [...(result.outputs?.values() ?? [])]
      .map((o) => o.serverJs ?? "")
      .join("\n");
    expect(js).not.toContain('_scrml_db.exec("BEGIN DEFERRED")');
  });
});

// ---------------------------------------------------------------------------
// §6
// ---------------------------------------------------------------------------

describe("§6 envelope is per-handler", () => {
  test("two handlers — only `!` handler gets envelope", () => {
    const src = [
      '<program db="test.db">',
      "${ server function plain(id) {",
      "    let a = ?{`SELECT * FROM users WHERE id = ${id}`}.get()",
      "    let b = ?{`SELECT * FROM posts WHERE user_id = ${id}`}.all()",
      "    return { a, b }",
      "}",
      "server function fallible(id)! {",
      "    let a = ?{`SELECT * FROM tags WHERE id = ${id}`}.get()",
      "    let b = ?{`SELECT * FROM cats WHERE id = ${id}`}.all()",
      "    return { a, b }",
      "} }",
      "</>",
    ].join("\n");
    const result = compile(src);
    const js = [...(result.outputs?.values() ?? [])]
      .map((o) => o.serverJs ?? "")
      .join("\n");
    // One BEGIN DEFERRED (fallible), not two
    const count = (js.match(/_scrml_db\.exec\("BEGIN DEFERRED"\)/g) ?? []).length;
    expect(count).toBe(1);
  });
});
