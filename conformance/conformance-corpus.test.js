/**
 * Conformance corpus — bun:test wrapper (codes half).
 *
 * One test() per case under conformance/cases/. Each runs the impl#1 adapter
 * and asserts the emitted code-set satisfies the case's PRESENCE (expect.codes)
 * and ABSENCE (expect.notCodes) contract. Pinpoints which case regressed.
 *
 * NOTE: this file lives under the top-level conformance/ dir (SCOPE OQ5 — the
 * suite's eventual impl-agnostic home), which is OUTSIDE bunfig.toml's
 * `[test] root = "compiler/tests/"`. It is therefore NOT auto-discovered by
 * the root-restricted pre-commit gate; run it explicitly:
 *
 *     bun test conformance/conformance-corpus.test.js
 *
 * (Wiring it into the gated suite is a full-W2 decision — see the dispatch
 * report's extraction-friction section.)
 */
import { describe, test, expect } from "bun:test";
import { loadCases, runCase } from "./run.ts";

describe("scrml conformance corpus — impl#1 (codes half)", () => {
  const cases = loadCases();

  test("corpus is non-empty (cases loaded)", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const c of cases) {
    const label = c.expected["runtime-half-pending"]
      ? `${c.relDir} (${c.expected.id}) [runtime-half-pending]`
      : `${c.relDir} (${c.expected.id})`;
    test(label, () => {
      const r = runCase(c);
      // PRESENCE: every required code fired.
      expect(r.missing).toEqual([]);
      // ABSENCE: no forbidden code fired.
      expect(r.forbidden).toEqual([]);
    });
  }
});
