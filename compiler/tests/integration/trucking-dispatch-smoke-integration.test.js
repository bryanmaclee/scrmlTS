/**
 * A-5.5 — trucking-dispatch reference-app compile-smoke (Family F-6).
 *
 * Bundled within the A-5.5 wave-close. Compiles the full
 * `examples/23-trucking-dispatch/` reference application end-to-end via
 * `compileScrml` (multi-file inputFiles + emitPerRoute) and asserts:
 *
 *   1. No fatal errors — pipeline completes cleanly.
 *   2. chunks.json manifest emits + entryPoints map non-empty.
 *   3. Expected v0.2-shape diagnostic counts are stable (regression
 *      baseline; v0.2-shape `auth="role:X"` is silently inert per
 *      F-AUTH-001 — the diagnostics that DO fire on this input are
 *      EXPECTED, not regressions).
 *   4. W-AUTH-LOGIN-MISSING fires once (the canonical anonymous-page
 *      missing-login diagnostic introduced at S91 A-3.5; trucking-
 *      dispatch's `pages/auth/login.scrml` does NOT yet declare a
 *      login intent, so the lint correctly fires here).
 *   5. Per-app chunks emit (chunks.size > 0) — the splitter pass
 *      executes successfully against adopter-scale input.
 *   6. chunks.json `compiler` field stable across compiles (Q-OPEN-4
 *      package.json sourcing).
 *
 * Per OQ-A5-C (PA-lean (a) compile-smoke only): NO Playwright
 * assertions. NO v0.2 → v0.3 migration. NO modifications to
 * trucking-dispatch source. The test reads the existing v0.2-shape
 * tree and verifies the v0.3 pipeline can ingest it without fatal
 * errors and produces the expected adopter-shape baseline diagnostics.
 *
 * Per dive §4.5 R-3 + R-9 (load-bearing): trucking-dispatch is
 * structurally pre-v0.3:
 *   - F-AUTH-001 v0.2-shape: `<program auth="required">` + server-side
 *     `checkRole()` guard (NOT `<auth role="X">` element).
 *   - W-AUTH-001 ("server @var has no detectable initial load
 *     pattern") fires for every server-state declaration in the app.
 *   - W-PROGRAM-001 ("unnamed nested <program>") fires for the page-
 *     level <program> elements.
 *   - W-CG-CHUNK-PREFETCH-UNRESOLVED fires where `<a href="/route">`
 *     points at a route that does not exist in the multi-file route
 *     map (deliberate; future Wave 4.A migration tightens these).
 *
 * EXPECTED DIAGNOSTIC BASELINE (probed at HEAD acbb097, S92):
 *   I-AUTH-REDIRECT-UNRESOLVED            =  2
 *   W-ATTR-001                            = 19
 *   W-AUTH-001                            = 19
 *   W-AUTH-LOGIN-MISSING                  =  1
 *   W-CG-CHUNK-EMPTY                      =  2
 *   W-CG-CHUNK-PREFETCH-UNRESOLVED        =  2
 *   W-CG-UNDEFINED-INTERPOLATION          = 53
 *   W-DEAD-FUNCTION                       =  1
 *   W-PROGRAM-001                         = 34
 *   W-PROGRAM-REDUNDANT-LOGIC             = 18
 *   W-PROGRAM-SPA-INFERRED                =  1
 *   --- aggregate ---
 *   errors:    2 (both I-AUTH-REDIRECT-UNRESOLVED severity:info,
 *                 routed to result.errors per api.js:1674-1675
 *                 since severity != "warning")
 *   warnings:  150
 *   chunks:    6
 *   manifest entryPoints: 2
 *
 * If this baseline drifts: the test surfaces the change so PA can
 * decide whether the new diagnostic firing is an intended pipeline
 * sharpening (in which case update the baseline here) or a regression
 * (in which case investigate the firing site).
 *
 * Spec authority:
 *   - SPEC.md §40.1.1 — Static role classification anchor (A-3).
 *   - SPEC.md §40.9 — Closure Analysis (A-2).
 *   - SPEC.md §47.5 + §47.1.3 — content-addressing (A-4.6).
 *   - SPEC.md §52.10 / §52.13 — server-fn boundary +
 *     W-AUTH-LOGIN-MISSING anchor.
 *
 * SCOPING: scrml-support/docs/deep-dives/a-5-integration-tests-SCOPING-2026-05-14.md
 *   §3.1 family F-6 + OQ-A5-C compile-smoke ratification + §4.2
 *   A-5.5 sub-phase + §4.5 R-3 + R-9.
 *
 * Reference-app friction history:
 *   examples/23-trucking-dispatch/FRICTION.md F-AUTH-001 (v0.2-shape
 *   `auth="role:X"` silent inertia; resolved by future v0.3 migration
 *   to `<auth role="X">` element shape — NOT in A-5 scope).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

// ---------------------------------------------------------------------------
// Locate the trucking-dispatch directory at the repo root
// (this test file lives at compiler/tests/integration/, so up four levels).
// ---------------------------------------------------------------------------

const TD_DIR = join(import.meta.dir, "..", "..", "..", "examples", "23-trucking-dispatch");

function findScrml(dir) {
  const out = [];
  for (const ent of readdirSync(dir)) {
    const p = join(dir, ent);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...findScrml(p));
    else if (p.endsWith(".scrml")) out.push(p);
  }
  // Sort for deterministic input order.
  return out.sort();
}

const TD_FILES = findScrml(TD_DIR);

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "td-smoke-"));
});

afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function compileTd() {
  return compileScrml({
    inputFiles: TD_FILES,
    outputDir: join(TMP, "dist"),
    write: false,
    emitPerRoute: true,
    log: () => {},
  });
}

/**
 * Cross-stream helper. Combines `result.errors` and `result.warnings`
 * into one array per api.js:1674-1675 partition logic.
 */
function allDiags(result) {
  return [...(result.errors ?? []), ...(result.warnings ?? [])];
}

/**
 * Histogram of diagnostic codes across both error + warning streams.
 */
function diagHisto(result) {
  const counts = Object.create(null);
  for (const d of allDiags(result)) {
    const code = d.code ?? "(no-code)";
    counts[code] = (counts[code] ?? 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// §1 — Pipeline-level invariants
// ---------------------------------------------------------------------------

describe("trucking-dispatch — pipeline-level invariants", () => {
  test("36 .scrml files discovered in the reference app", () => {
    // Sanity check on the fixture-discovery layer. If this drifts, the
    // expected-diagnostic-count baseline below also drifts.
    expect(TD_FILES.length).toBe(36);
  });

  test("compile completes — no fatal severity:error diagnostics", () => {
    const result = compileTd();
    const fatal = result.errors.filter((e) => e.severity === "error");
    expect(fatal).toEqual([]);
  });

  test("chunks.json manifest emits — splitter pass executed", () => {
    const result = compileTd();
    expect(result.chunksManifest).toBeDefined();
    expect(result.chunksManifest).not.toBeNull();
    expect(result.chunksManifest.version).toBe(1);
  });

  test("manifest entryPoints map non-empty (per-app chunks emit)", () => {
    const result = compileTd();
    const epKeys = Object.keys(result.chunksManifest.entryPoints);
    expect(epKeys.length).toBeGreaterThan(0);
  });

  test("at least one chunk produced", () => {
    const result = compileTd();
    expect(result.chunks).toBeDefined();
    expect(result.chunks.size).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// §2 — Expected v0.2-shape diagnostic baseline (regression guard)
// ---------------------------------------------------------------------------

describe("trucking-dispatch — v0.2-shape diagnostic baseline", () => {
  // Baseline counts probed at HEAD acbb097 (S92 A-5.4 close).
  // Refreshed at S93 BS-batch (Bug 6B) — W-PROGRAM-001 now suppressed on
  // pure-module files (no top-level markup): 34 → 23 for trucking-dispatch
  // (11 module files affected: types/utility/components/channels modules
  // in pages/ subdirs lacking <program> wrapper per S85 Q2 non-entry-file
  // canonical shape).
  // If a new pipeline pass tightens any of these counts, update this
  // map; if a count regresses, investigate the firing site.
  const EXPECTED_BASELINE = {
    "I-AUTH-REDIRECT-UNRESOLVED": 2,
    "W-ATTR-001": 19,
    "W-AUTH-001": 19,
    "W-AUTH-LOGIN-MISSING": 1,
    "W-CG-CHUNK-EMPTY": 2,
    "W-CG-CHUNK-PREFETCH-UNRESOLVED": 2,
    "W-CG-UNDEFINED-INTERPOLATION": 53,
    "W-DEAD-FUNCTION": 1,
    "W-PROGRAM-001": 23,
    "W-PROGRAM-REDUNDANT-LOGIC": 18,
    "W-PROGRAM-SPA-INFERRED": 1,
  };

  test("aggregate diagnostic count matches baseline", () => {
    const result = compileTd();
    const histo = diagHisto(result);
    const observedTotal = Object.values(histo).reduce((s, n) => s + n, 0);
    const expectedTotal = Object.values(EXPECTED_BASELINE).reduce(
      (s, n) => s + n,
      0,
    );
    expect(observedTotal).toBe(expectedTotal);
  });

  test("every baseline code's count matches", () => {
    const result = compileTd();
    const histo = diagHisto(result);
    for (const [code, expected] of Object.entries(EXPECTED_BASELINE)) {
      expect(histo[code] ?? 0).toBe(expected);
    }
  });

  test("no UNEXPECTED diagnostic codes fire", () => {
    const result = compileTd();
    const histo = diagHisto(result);
    const unexpected = Object.keys(histo).filter(
      (code) => !(code in EXPECTED_BASELINE),
    );
    expect(unexpected).toEqual([]);
  });

  test("W-AUTH-LOGIN-MISSING fires exactly once (canonical missing-login site)", () => {
    // S91 A-3.5 ratified W-AUTH-LOGIN-MISSING + the `scrml generate
    // auth` CLI subcommand + the `stdlib/auth/templates/login.scrml`
    // template — together those close the 03-contact-book latent bug.
    // trucking-dispatch's pages/auth/login.scrml carries a login form
    // but does NOT declare a login intent the AuthGraph recognizes;
    // the lint correctly fires once for this app.
    const result = compileTd();
    const fires = allDiags(result).filter(
      (d) => d.code === "W-AUTH-LOGIN-MISSING",
    );
    expect(fires.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §3 — Per-app chunks structure (chunks.json shape spot-checks)
// ---------------------------------------------------------------------------

describe("trucking-dispatch — chunks.json structure", () => {
  test("manifest.compiler field sources from package.json (Q-OPEN-4)", () => {
    const result = compileTd();
    expect(typeof result.chunksManifest.compiler).toBe("string");
    expect(result.chunksManifest.compiler.length).toBeGreaterThan(0);
    // package.json carries `name: "scrml"` — the compiler field is
    // expected to start with that token. Q-OPEN-4 sourcing is stable
    // across all compiles in the same test run.
    expect(result.chunksManifest.compiler).toMatch(/scrml/);
  });

  test("manifest.compiler field is stable across two compiles", () => {
    const a = compileTd();
    const b = compileTd();
    expect(a.chunksManifest.compiler).toBe(b.chunksManifest.compiler);
  });

  test("every chunk emits with the FNV-1a 8-char base36 hash (§47.1.3)", () => {
    const result = compileTd();
    for (const chunk of result.chunks.values()) {
      // Hash present + 8 base36 chars + not the placeholder.
      expect(chunk.chunkHash).toMatch(/^[0-9a-z]{8}$/);
      expect(chunk.chunkHash).not.toBe("00000000");
    }
  });

  test("each manifest entryPoint key references chunks that exist in the chunks Map", () => {
    const result = compileTd();
    const chunkKeys = new Set([...result.chunks.keys()]);
    for (const epId of Object.keys(result.chunksManifest.entryPoints)) {
      const perRole = result.chunksManifest.entryPoints[epId];
      for (const role of Object.keys(perRole)) {
        const entry = perRole[role];
        if (entry.initial) expect(chunkKeys.has(entry.initial)).toBe(true);
        if (entry.tier1) expect(chunkKeys.has(entry.tier1)).toBe(true);
        if (entry.tier2) expect(chunkKeys.has(entry.tier2)).toBe(true);
      }
    }
  });
});
