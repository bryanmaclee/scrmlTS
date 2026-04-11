# Progress: ghost-lint-prepass

- [T2] Branch: changes/ghost-lint-prepass
- [Step 1] compiler/src/lint-ghost-patterns.js — created (~210 lines). lintGhostPatterns() export with 9 active patterns (W-LINT-001 through W-LINT-010, pattern 9 / W-LINT-009 is subsumed by W-LINT-004). Logic-range exclusion, CSS-range detection, offsetToLineCol helper. Sorted output.
- [Step 2] compiler/src/api.js — wired lint pre-pass before Stage 2 (BS). Added lintDiagnostics field to return shape. Import added at line 26. Pre-pass block at lines ~158-175. Early-exit return updated. Final return updated.
- [Step 3] compiler/tests/unit/lint-ghost-patterns.test.js — created (~280 lines). 17 sections, positive + negative per pattern, multi-ghost, ${} exclusion, empty file, integration (§14, §15), shape (§16), sorting (§17).
- [Status] All three files written. Awaiting git commit and bun test run.
