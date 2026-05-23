/**
 * runtime-chunks — CHUNK_DEPENDENCIES + applyChunkDependencies
 *
 * Unit tests for the cross-chunk dependency closure helper introduced at
 * S124 (2026-05-23) to close 6nz Bug P (`_scrml_destroy_scope` calling
 * `_scrml_stop_scope_timers` / `_scrml_cancel_animation_frames` across a
 * tree-shake boundary).
 *
 * Scope:
 *   §1  CHUNK_DEPENDENCIES table contents — declarative edges
 *   §2  applyChunkDependencies closure — direct edge pull
 *   §3  applyChunkDependencies closure — idempotency
 *   §4  applyChunkDependencies closure — no spurious pulls when source absent
 *   §5  applyChunkDependencies closure — fixed-point shape (deeper chains)
 */

import { describe, test, expect } from "bun:test";
import { CHUNK_DEPENDENCIES, applyChunkDependencies } from "../../src/codegen/runtime-chunks.ts";

describe("§1 CHUNK_DEPENDENCIES table", () => {
  test("scope chunk depends on timers", () => {
    expect(CHUNK_DEPENDENCIES.scope).toBeDefined();
    expect(CHUNK_DEPENDENCIES.scope).toContain("timers");
  });

  test("scope chunk depends on animation", () => {
    expect(CHUNK_DEPENDENCIES.scope).toContain("animation");
  });
});

describe("§2 applyChunkDependencies — direct edge pull", () => {
  test("scope present → timers + animation pulled in", () => {
    const chunks = new Set(["core", "scope", "errors"]);
    applyChunkDependencies(chunks);
    expect(chunks.has("timers")).toBe(true);
    expect(chunks.has("animation")).toBe(true);
  });

  test("scope present with timers already → animation still added", () => {
    const chunks = new Set(["core", "scope", "timers", "errors"]);
    applyChunkDependencies(chunks);
    expect(chunks.has("animation")).toBe(true);
  });

  test("scope present with animation already → timers still added", () => {
    const chunks = new Set(["core", "scope", "animation", "errors"]);
    applyChunkDependencies(chunks);
    expect(chunks.has("timers")).toBe(true);
  });
});

describe("§3 applyChunkDependencies — idempotency", () => {
  test("running twice produces the same set", () => {
    const chunks = new Set(["core", "scope"]);
    applyChunkDependencies(chunks);
    const snapshot = new Set(chunks);
    applyChunkDependencies(chunks);
    expect(chunks.size).toBe(snapshot.size);
    for (const c of snapshot) expect(chunks.has(c)).toBe(true);
  });

  test("running on a fully-closed set is a no-op", () => {
    const chunks = new Set(["core", "scope", "timers", "animation", "errors"]);
    const sizeBefore = chunks.size;
    applyChunkDependencies(chunks);
    expect(chunks.size).toBe(sizeBefore);
  });
});

describe("§4 applyChunkDependencies — no spurious pulls when source absent", () => {
  test("scope absent → timers NOT pulled", () => {
    // Hypothetical: a compile unit producing zero scope usage (impossible in
    // practice today since scope is always-seeded — see context.ts:211 — but
    // the helper must be correct for arbitrary input sets).
    const chunks = new Set(["core", "errors"]);
    applyChunkDependencies(chunks);
    expect(chunks.has("timers")).toBe(false);
    expect(chunks.has("animation")).toBe(false);
  });

  test("scope absent + timers present (independently activated) → animation NOT pulled by scope edge", () => {
    // Timer-using compile unit without scope (synthetic — not a real shape).
    const chunks = new Set(["core", "timers"]);
    applyChunkDependencies(chunks);
    expect(chunks.has("animation")).toBe(false);
  });
});

describe("§5 applyChunkDependencies — fixed-point shape", () => {
  test("the helper returns the same set instance for chaining", () => {
    const chunks = new Set(["core", "scope"]);
    const ret = applyChunkDependencies(chunks);
    expect(ret).toBe(chunks);
  });

  test("multi-pass closure: changes propagate transitively", () => {
    // The current CHUNK_DEPENDENCIES table is shallow (depth 1), but the
    // fixed-point loop tolerates future deeper chains. This test exists as
    // a regression guard if the table grows. We can only test what's in the
    // table today; if `scope → timers → X` ever lands, augment here.
    const chunks = new Set(["scope"]);
    applyChunkDependencies(chunks);
    expect(chunks.has("scope")).toBe(true);
    expect(chunks.has("timers")).toBe(true);
    expect(chunks.has("animation")).toBe(true);
    // No other chunks pulled in by the scope edge alone.
    expect(chunks.size).toBe(3);
  });
});
