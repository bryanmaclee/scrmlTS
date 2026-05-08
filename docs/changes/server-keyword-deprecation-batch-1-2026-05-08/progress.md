# Progress: server-keyword-deprecation-batch-1-2026-05-08

- [start] Branch verified, ff-merged main → 33ac96e, baseline test 9784/64/1/3 (network-flake-tolerant)
- [start] pre-snapshot.md + SURVEY.md written
- [start] All 5 stdlib candidates verified server-only by reading their index.scrml headers
- [start] Tier classification: T2 overall (D3 is the load-bearing complexity; rest are T1)
- [D1] DONE — `SERVER_ONLY_SCRML_MODULES` set completion (+5 modules), 6 tests added, all passing
- [D2] DONE — `SERVER_ONLY_PATTERNS` regex completion (process.* + Bun.cron), `buildPerFileImportedServerNamespaces` for namespace-import recognition, 11 tests added, full suite 9801/64/1/3 (+17 from baseline 9784, 0 regressions)
- [D3] DONE — caller-context propagation Step 5c, monotonic fixed-point. 9 new tests. Modified §8 cycle test to expect new propagation behavior. Full suite 9810/64/1/3 (+9 from after D2, 0 regressions).
- [D4] DONE — W-DEAD-FUNCTION with markup-text-search heuristic. 7 new tests. Self-recursive-only correctly flagged.
- [D5] DONE — W-DEPRECATED-SERVER-MODIFIER diagnostic. 5 new tests. Sole-signal case correctly preserved (no fire). Caller-context evidence handled.
- [POST-D5] Full suite 9822/64/1/3 (+38 from baseline 9784, 0 regressions). All 12 E2E samples compile cleanly with NO new warnings.
- [VALIDATION] Larger examples/ directory: W-DEPRECATED-SERVER-MODIFIER fires correctly on real `server function` + SQL patterns (contact-book: 2, admin-dashboard: 1, state-authority: 3). This is the expected deprecation surface for Batch 2 cleanup.
- [VALIDATION] anomaly-report.md written. Status: CLEAR FOR MERGE. Anomaly count: 0.
- [SHIP] Ready for SHIP commit.
