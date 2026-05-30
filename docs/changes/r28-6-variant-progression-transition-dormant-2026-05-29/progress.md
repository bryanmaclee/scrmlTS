# R28-6 progress — variant-progression transition() DORMANT on .get() return path

## Startup
- WORKTREE_ROOT=/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a61a312b0e364b383
- pwd verified under .claude/worktrees/agent-
- base HEAD eda211f2; merge main -> already up to date
- bun install + pretest OK

## Investigation
- SPEC §14.12.6.2 read (worked example is EXACTLY this bug: publish(id) -> (.Draft to .Published) w/ ?{...}.get() body)
- §14.12.10 normative SHALL-fire confirmed
- Fix-locus: type-system.ts — fn-return lifecycle map + per-access tracker
- Tracker entry: buildFnReturnLifecycleMap (14510), runLifecycleBindingAccessCheck (15295), checkLifecycleBindingAccess (14644)

## Next
- Build repro to observe actual dormant behavior

## Root cause (confirmed via debug probes, reverted)
- fnReturnLifecycleMap BUILDS correctly: publishManuscript -> variant Draft->Published (annotation NOT lost at map-build).
- Caller binding `m` IS collected by runLifecycleBindingAccessCheck.
- The if-stmt discrimination `( m is . Draft )` matches; innerDiscrim has `m`.
- BUG: the consequent statement is a `state-decl` (reactive-assign `@viewerName = "x" + m.publishedAt`).
  The walker's state-decl handler `continue`d past the RHS read-scan — only classifying the CELL's
  own write transition. The RHS read `m.publishedAt` of a DIFFERENT lifecycle binding was never scanned.
  The prior comment "there's no LHS access to scan in the bare-expr surface" overlooked the RHS read.

## Fix (compiler/src/type-system.ts, checkLifecycleBindingAccess state-decl handler)
- Scan the state-decl RHS (init text) via processStatementText BEFORE applying the cell's own write
  classification (pre-write state so a self-referential RHS observes prior transition state).

## R26 Phase-3 empirical verification (PASS)
- repro-a (dormant, no transition): now FIRES E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED, exit 1.
- repro-b (correct, transition present): clean exit 0.
- repro-c (presence-progression via given): clean exit 0.
- repro-d (presence, if-is-not early-return then RHS read): clean exit 0.
- repro-e (presence, RHS read no discrim): now fires E-TYPE-001 (symmetric dormancy also closed).
- dev-1-react / dev-3-elixir / dev-5-pascal: baseline-vs-postfix diagnostic sets IDENTICAL (zero regression,
  zero false positive; all used transition() correctly). dev-5 pre-existing E-PA-004 is a synthetic-DB
  artifact present in BOTH baseline and post-fix.

## Tests
- compiler/tests/unit/type-system-lifecycle-landing-2-5.test.js — added §LL2-5_K (6 cases). File now 41 tests, all pass.
- Full pre-commit gate: 15158 pass / 88 skip / 0 fail across 792 files.

## DONE
