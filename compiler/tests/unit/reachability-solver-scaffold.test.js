/**
 * Reachability Solver — PIPELINE Stage 7.6 A-2.1 Scaffold Tests
 *
 * S89 wave A-2.1 delivers a type-surface scaffold + no-op solver body
 * + pipeline wiring + `--emit-reachability` CLI flag. Subsequent waves
 * (A-2.2 .. A-2.7) implement the five-component union + outer fixpoint
 * per SPEC §40.9.
 *
 * Coverage:
 *   §1  runReachabilitySolver returns an empty record + no errors
 *   §2  serializeReachabilityRecord produces a stable, well-formed JSON shape
 *   §3  Deterministic — identical input → identical output
 *   §4  End-to-end: compileScrml exposes reachabilityRecord +
 *       reachabilityRecordJson() on the public return value
 */

import { describe, test, expect } from "bun:test";
import {
  runReachabilitySolver,
  serializeReachabilityRecord,
} from "../../src/reachability-solver.ts";
import { emptyReachabilityRecord } from "../../src/types/reachability.ts";
import { compileScrml } from "../../src/api.js";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// §1
// ---------------------------------------------------------------------------

describe("§1 runReachabilitySolver returns a well-formed empty record", () => {
  test("empty DG → empty record + no errors", () => {
    const { record, errors } = runReachabilitySolver({
      depGraph: { nodes: new Map(), edges: [] },
    });
    expect(record.closures).toBeInstanceOf(Map);
    expect(record.closures.size).toBe(0);
    expect(record.diagnostics).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("null depGraph → empty record + no errors", () => {
    const { record, errors } = runReachabilitySolver({ depGraph: null });
    expect(record.closures.size).toBe(0);
    expect(record.diagnostics).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("emptyReachabilityRecord() factory returns fresh Map + array", () => {
    const r1 = emptyReachabilityRecord();
    const r2 = emptyReachabilityRecord();
    expect(r1.closures).not.toBe(r2.closures);
    expect(r1.diagnostics).not.toBe(r2.diagnostics);
  });
});

// ---------------------------------------------------------------------------
// §2
// ---------------------------------------------------------------------------

describe("§2 serializeReachabilityRecord — well-formed empty JSON", () => {
  test("empty record → canonical empty JSON", () => {
    const json = serializeReachabilityRecord(emptyReachabilityRecord());
    const parsed = JSON.parse(json);
    expect(parsed).toEqual({ closures: {}, diagnostics: [] });
  });
});

// ---------------------------------------------------------------------------
// §3
// ---------------------------------------------------------------------------

describe("§3 Deterministic across runs", () => {
  test("two solver runs on identical input → identical JSON", () => {
    const input = { depGraph: { nodes: new Map(), edges: [] } };
    const out1 = serializeReachabilityRecord(runReachabilitySolver(input).record);
    const out2 = serializeReachabilityRecord(runReachabilitySolver(input).record);
    expect(out1).toBe(out2);
  });
});

// ---------------------------------------------------------------------------
// §4 — end-to-end compileScrml surface
// ---------------------------------------------------------------------------

describe("§4 compileScrml exposes reachabilityRecord + reachabilityRecordJson", () => {
  test("trivial scrml file → result carries empty reachabilityRecord", () => {
    const dir = mkdtempSync(join(tmpdir(), "rs-scaffold-"));
    try {
      const src = join(dir, "trivial.scrml");
      writeFileSync(src, "<program>\n  <body>\n    hello\n  </body>\n</program>\n");
      const result = compileScrml({
        inputFiles: [src],
        outputDir: dir,
        write: false,
        log: () => {},
      });
      expect(result.reachabilityRecord).toBeDefined();
      expect(result.reachabilityRecord.closures).toBeInstanceOf(Map);
      expect(result.reachabilityRecord.closures.size).toBe(0);
      expect(typeof result.reachabilityRecordJson).toBe("function");
      const json = result.reachabilityRecordJson();
      expect(JSON.parse(json)).toEqual({ closures: {}, diagnostics: [] });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
