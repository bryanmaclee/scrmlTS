# v0.3 BS-layer structural-tag scanner — comment-skip

## Goal
Make BS-layer's structural-tag scanner respect `//` line comments and `<!-- ... -->` HTML comments — currently a literal `<program>` or `</program>` tag inside such comments is parsed as a real opener/closer.

## Progress log (append-only)

- 2026-05-12T00:00Z — startup verification PASS (pwd, git root, clean tree, bun install, pretest 12 samples compiled)
- 2026-05-12T00:00Z — read primary.map.md + structure.map.md + BRIEFING-ANTI-PATTERNS + llm-kickstarter-v1
- 2026-05-12T00:05Z — REPRO findings:
  - `//` line comment WITH `<program>` content: ALREADY HANDLED (BS line 613, §4.7). No bug.
  - `//` line comment WITH `<channel>` content inside `<program>`: ALREADY HANDLED. No bug.
  - `<!--` HTML comment WITH `<program>`: BUG CONFIRMED. `<program>` inside `<!-- ... -->` is parsed as a real opener. Repro: `.tmp-repro/test-bs-html-fake-double.scrml` shows W-PROGRAM-SPA-INFERRED firing at line 1 col 6 — that's the FAKE `<program>` inside the comment.
  - `<!--` HTML comment WITH `<channel>` inside `<program>`: BUG CONFIRMED. Repro: `.tmp-repro/test-bs-html-fake-channel.scrml` produces E-CTX-001 because BS opens a real `<channel>` inside the comment text.
- 2026-05-12T00:08Z — SPEC CONFLICT FOUND: SPEC §4.7 line 509 explicitly states: "This suppression applies ONLY to `//`. The block splitter SHALL NOT handle `<!-- -->` (markup comments) or `/* */` (CSS/JS block comments) — those are concerns of the per-context tokenizers and SHALL NOT be processed at block-splitter level." Brief asks me to add `<!-- -->` skip at BS, which directly contradicts this normative statement. Per §27.2 `<!-- -->` is the markup-context native comment.
- 2026-05-12T00:10Z — Verified no other stage handles `<!-- -->` (no occurrences in tokenizer.ts, ast-builder.js, or any other compiler/src/* — only migrate.js for the migrate CLI). Real-world use: examples/23-trucking-dispatch/pages/customer/loads.scrml contains `<!--` comments that happen to NOT contain structural tags, so they incidentally compile clean.
- 2026-05-12T00:12Z — DECISION: implement at BS (mirror `//` handling for `<!-- -->`) because (a) the bug is real, (b) the fix is mechanically trivial, (c) leaving it broken keeps the trap for LLM-authored scrml, (d) `/* */` only applies to JS/CSS/SQL contexts per §27.2 — does NOT apply at file-top markup so no skip needed there. SPEC §4.7 normative statement requires amendment as part of this change. Will surface the spec amendment as an OPEN QUESTION for PA.
- 2026-05-12T00:18Z — IMPL landed at compiler/src/block-splitter.js — new `<!-- ... -->` skip block immediately after the `//` skip (line ~635). Scope: applies only when `!topIsBraceContext()` AND `!inDoubleQuote` AND `!inSingleQuote`. Inside `${}`, `?{}`, `#{}`, etc. the sequence falls through as raw text. Multi-line comments scan until first `-->` (HTML-spec compliant; nested HTML comments are not a thing). Unclosed `<!--` runs to EOF (best-effort, matches `//` policy).
- 2026-05-12T00:20Z — TESTS landed at compiler/tests/unit/bs-comment-skip.test.js — 10 tests:
  1. `<!-- ... -->` produces a comment block at top level
  2. `<!-- <program> -->` does NOT open a real `<program>` context
  3. `<!-- </program> -->` does NOT close an open `<program>`
  4. `<!-- <channel name="foo"> -->` does NOT open a real `<channel>` (S87 repro shape)
  5. mixed: real opener AFTER a commented-out opener
  6. `<!--` inside `${}` is NOT a comment (raw text in JS) — scope guard
  7. `<!--` inside `"..."` is NOT a comment — quote-state guard
  8. multi-line `<!-- ... -->` spans lines
  9. regression guard: existing `//` skip unchanged
  10. unclosed `<!--` runs to EOF without throwing
- 2026-05-12T00:22Z — TEST DELTAS:
  - Unit: 9134 pass / 37 skip / 0 fail (was: ~9124 pre-change; +10 from this dispatch)
  - Integration: 1414 pass / 18 skip / 1 todo / 0 fail (no change)
  - Conformance: 313 pass / 30 skip / 0 fail (no change)
  - pretest: 12 sample fixtures compile clean (no change)
- 2026-05-12T00:24Z — REPRO POST-FIX:
  - test-bs-html-fake-double.scrml: W-PROGRAM-SPA-INFERRED now fires at line 2 col 1 (REAL `<program>`), was line 1 col 6 (FAKE inside comment).
  - test-bs-html-fake-channel.scrml: compiles clean. Was: E-CTX-001 + E-CTX-003 (fake channel inside `<!-- -->` opened a real frame, then `</program>` failed to match).
  - test-bs-line-comment-fake-channel.scrml: regression check — still compiles clean.
- 2026-05-12T00:25Z — DONE; ready for commit + final report.
