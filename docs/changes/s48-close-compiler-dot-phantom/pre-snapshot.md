# Pre-Snapshot: s48-close-compiler-dot-phantom

**Captured:** 2026-04-29 (T2 dispatch start)
**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a355a57939cb99b4c`
**Branch (start):** `worktree-agent-a355a57939cb99b4c`
**HEAD at start:** `4dbc20e docs(s48): close — articles batch + 3 audits + Phase 1 + Phase 2 foundation`

## Setup performed before snapshot

- `bun install` — installed 224 packages (worktree had no `node_modules/`).
- `bun run pretest` — compiled 12 sample files into `samples/compilation-tests/dist/`.
- `bun run compiler/scripts/build-self-host.js` — built self-host JS into `compiler/dist/self-host/`.

(The recon's expected baseline of 7,941/40/2 was relative to a previously-built main repo. This worktree is pristine; the setup above brings it to the same state.)

## Test results (pristine baseline, before any code changes)

```
7954 pass
40  skip
0   fail
28265 expect() calls
Ran 7994 tests across 381 files. [12.94s]
```

This is **better** than the recon expected (the recon assumed 2 pre-existing failures: Bootstrap L3 timeout + tokenizer self-host parity). In this snapshot they passed. Fail count delta during this dispatch should remain 0.

## Self-host build state

`bun run compiler/scripts/build-self-host.js` reports failures for some modules (TS/CG/RI/PA — pre-existing E-FN-003 / E-SCOPE-001 errors in self-host code), but the modules I care about for this fix all build successfully:

- `compiler/dist/self-host/meta-checker.js` — built successfully (line 120 contains the `compiler\s*\.` regex I will delete).

## Existing `compiler.*` references (pre-edit verification, matches recon §1)

Source:
- `compiler/src/meta-checker.ts:12` — doc comment
- `compiler/src/meta-checker.ts:165-170` — `COMPILE_TIME_API_PATTERNS` array (line 168 = the regex)
- `compiler/src/meta-checker.ts:367-388` — `exprNodeContainsIdentNamed` helper (only consumer is line 397)
- `compiler/src/meta-checker.ts:397` — wire-up to `testExprNode`
- `compiler/src/meta-checker.ts:1554` — E-META-005 message text

Self-host (TWO copies — both must be edited):
- `stdlib/compiler/meta-checker.scrml:11, 120`
- `compiler/self-host/meta-checker.scrml:11, 120`

(Recon mentioned only `compiler/self-host/meta-checker.scrml`. The `stdlib/compiler/meta-checker.scrml` copy was found via `find . -name "meta-checker.scrml"`. They are byte-identical. The build-self-host script reads from `stdlib/compiler/meta-checker.scrml` — see `compiler/scripts/build-self-host.js:51`.)

Spec:
- `compiler/SPEC.md:10461` — bullet `- \`compiler.*\` API calls`
- `compiler/SPEC.md:10465-10466` — prose claiming access via `compiler.*`
- `compiler/SPEC.md:10978` — §22.8 phase-separation example mentioning `compiler.*`

Tests:
- `compiler/tests/unit/meta-checker.test.js:881-884` — §53 classification test (delete)
- `compiler/tests/unit/self-host-meta-checker.test.js:201-204` — "detects compiler. access" (delete or rewrite as E-META-010)
- `compiler/tests/unit/meta-classifier-emit-raw.test.js:98` — misleadingly-named test (rename only; body uses `reflect()`)

## E-META-009 backfill

Source: `compiler/src/meta-checker.ts:1568-1574` — E-META-009 fires for nested `^{}` inside compile-time meta. It is **not** in `compiler/SPEC.md` §22.11 table (verified — table jumps from E-META-008 to E-META-005 ordering). Per the user's locked decisions, this backfill lands in the same commit.

## What I will NOT touch

- `compiler/src/meta-eval.ts` — no changes needed (per recon §6); the symbol no longer reaches eval.
- E-META-004 numbering gap — left as-is per locked decision.
- `scrml-support/docs/deep-dives/language-status-audit-2026-04-29.md` — outside this worktree (read-only sibling repo).
- `compiler/dist/self-host/meta-checker.js` — gitignored (`.gitignore` line 2: `dist/`); rebuild locally for verification but do NOT commit.

## Tags

#pre-snapshot #s48 #compiler-dot-phantom #t2 #change-id-s48-close-compiler-dot-phantom

## Links

- Recon: `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/recon/compiler-dot-api-decision-2026-04-29.md`
- Worktree: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a355a57939cb99b4c/`
- Spec target: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a355a57939cb99b4c/compiler/SPEC.md` §22.4 (line 10461), §22.8 (line 10978), §22.11 (line 11048-11054), §34 (line 12045+)
