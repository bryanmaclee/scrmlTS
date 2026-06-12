# progress — lifecycle-field comment-leak parse bug (S184)

worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a45a3baf0b20b5569

## 2026-06-11 — startup + survey
- Startup verification passed (pwd under agent-worktree, toplevel match, clean, bun install, pretest).
- Maps read: primary.map.md (full), error.map.md + structure.map.md (function-boundary block).
- Reproduced T1 (line comment) + T4 (block comment): both wrongly fire E-STRUCT-FUNCTION-FIELD. T2/T3 (no trailing comment) correctly fire E-TYPE-001. T5/T6 (real fn fields) correctly reject.
- ROOT CAUSE FOUND (deeper than PA survey): the `//` glyph is ALREADY stripped upstream by the time
  the raw struct body reaches type-system.ts — the leaked text is comment WORDS without the `//`.
  Origin: tokenizer emits COMMENT tokens whose `.text` is the comment content sans `//` glyph
  (tokenizer.ts readLineComment:849 / readBlockComment:865). `collectBracedBody` (ast-builder.js:3361-3363)
  pushes EVERY token's `.text` including COMMENT tokens → comment words leak into `decl.raw` for structs.
  This means a type-system.ts-only `//`-match strip CANNOT work (no `//` present); the correct fix is to
  SKIP COMMENT tokens in `collectBracedBody` (mirrors the tokenizer's own `if (t.kind==='COMMENT') continue` at :995).

## Loci survey (comment-leak reproduction)
- NAMED `:struct` field (decl.raw via collectBracedBody) — LEAKS → false E-STRUCT-FUNCTION-FIELD. FIX TARGET.
- Inline-struct cell typeAnnotation (multi-line) — typeAnnotation ALSO comment-leaked; manifests as silent
  field-split mis-parse (whitespace-collapse) rather than a false error here. Root fix covers it.
- Shape-1 cell-type lifecycle `(Idle to Active)` — fails E-TYPE-UNKNOWN-NAME WITH OR WITHOUT comment →
  PRE-EXISTING + ORTHOGONAL (not comment-induced). OUT of scope.
- Inline-struct REAL fn field — not rejected even WITHOUT comment → pre-existing inline-struct gap. OUT of scope.
- fn-return / fn-param lifecycle — scrml has no lifecycle annotation in those positions; no leak.

## Plan
- Fix: skip COMMENT tokens in collectBracedBody (ast-builder.js). Root-cause, single central fix.
- Defense-in-depth: also strip trailing comment-residue in type-system.ts type-expr extraction IF the root
  fix leaves any residue path (re-verify after).
- Regression tests in compiler/tests/unit/.

## 2026-06-11 — fix + tests + verification (DONE)
- FIX: compiler/src/ast-builder.js collectBracedBody now skips COMMENT tokens
  (`lastTok = consume(); if (lastTok.kind === "COMMENT") continue;`). Single central
  root-cause fix — the comment text never reaches decl.raw, so EVERY downstream consumer
  (named-struct E-STRUCT-FUNCTION-FIELD scan, inline-struct typeAnnotation, resolveTypeExpr,
  bare-variant inference, etc.) sees a clean braced body. No type-system.ts strip helper needed.
- Insertion-point decision: chose the AST-builder root over N scattered type-system.ts strips.
  A type-system.ts `//`-match strip was IMPOSSIBLE (the `//`/`/*` glyph is already gone by then —
  only the comment WORDS survive) AND a paren-anchored strip risked over-stripping `() -> void`.
  Skipping the COMMENT token at collection is the only clean, non-over-stripping fix.
- TESTS: compiler/tests/unit/lifecycle-field-comment-leak.test.js (12 tests, all pass).
- Full suite: BEFORE 23855 pass / 221 skip / 1 todo / 0 fail (clean re-run; an earlier run showed
  2 flaky fails that cleared). AFTER 23867 pass (+12 new) / 221 skip / 1 todo / 0 fail. ZERO regressions.
- R26: T1 → E-STRUCT-FUNCTION-FIELD count 0, E-TYPE-001 fires (2× — known double-fire incidental,
  out of scope). Real fn field (t5) → still rejects (count 1, no over-strip). Valid post-fix program
  compiles + node --check OK on emitted client.js + runtime.js.
- Loci that LEAKED + fixed: named `:struct` field (the bug) + inline-struct multi-line typeAnnotation
  (silent mis-parse) — both via collectBracedBody, fixed by the one change.
- Loci surveyed + NOT leaking / out of scope: Shape-1 cell-type `(Idle to Active)` (fails
  E-TYPE-UNKNOWN-NAME with OR without comment — pre-existing/orthogonal); inline-struct REAL fn field
  (not rejected even without comment — pre-existing inline gap); fn-return / fn-param (no lifecycle there).
