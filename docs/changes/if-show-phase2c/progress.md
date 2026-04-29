# Progress: if-show-phase2c

Phase 2c — `if=` mount/unmount activation (Approach B1, locked by user).

## Plan
1. PRECURSOR: strip `if=`/`else-if=`/`else` from chain branch elements; add N31 regression test.
2. MAIN: uncomment dead Phase 2b block; update 28 expects; add 14 new tests.

## Baseline
- Branch worktree-agent-adf8b1a27295f9b08, rebased onto main (4fb5cec).
- After `bun install` and `bash scripts/compile-test-samples.sh`:
  - Full suite (compiler/tests): 7957 pass / 40 skip / 0 fail / 28267 expects.
  - Required compile-test-samples step: dist/ files for browser tests.

## Steps
- [11:01] Started — baseline captured, recon + deep-dive ingested, source files mapped.
- [11:32] PRECURSOR — added stripChainBranchAttrs helper in emit-html.ts
  (lines 99-114) and applied to branches.element + elseBranch in if-chain
  handler (lines 195, 213). Added 4 N31 regression tests in
  tests/unit/else-if.test.js §3.
- [11:48] PRE-COMMIT BLOCKER — pre-commit hook ran ALL tests. Discovered the
  132 "fails" were ECONNREFUSED on browser tests because dist/ files missing
  in worktree (pre-existing infra issue, not regression). Compiled samples;
  tests then green: 7957 → 7961 with N31 (+4).
- [12:01] PRECURSOR COMMIT — 934f62d. Tests pass + post-commit gauntlet check.
- [12:18] MAIN STEP A — Uncommented dead Phase 2b block in emit-html.ts:551-603,
  replaced deferral comment with LIVE Phase 2c block-comment documentation.
- [12:25] MAIN STEP B — Updated tests/unit/if-expression.test.js (8 tests
  affected per recon §2.1: §8 row 1, §9 rows 3-5, §11 row 11, §12 row 12,
  §15 rows 15-16, §16 row 18). Mix of UPDATE (data-scrml-bind-if= →
  template+marker), REPLACE (display-toggle test → mount/unmount test),
  and find-predicate UPDATE (isConditionalDisplay → isMountToggle).
- [12:32] MAIN STEP C — Updated tests/unit/allow-atvar-attrs.test.js (4 tests
  affected per recon §2.2: rows 19-21 + row 23). Same mix.
- [12:40] MAIN STEP D — Updated tests/unit/if-is-variant.test.js (9 tests
  affected per recon §2.3: rows 24-27, 29, 31, 34-36). Mix of UPDATE,
  find-predicate UPDATE, and REPLACE (el.style.display → mount/unmount).
- [12:48] MAIN STEP E — Updated tests/browser/browser-forms.test.js (3 tests
  affected per recon §2.7: rows 38-40). Re-keyed selectors from
  [data-scrml-bind-if] → .success and updated assertions to mount/unmount
  semantics. Recompiled combined-003-form-validation sample for new dist/.
- [12:55] MAIN STEP F — Created tests/unit/if-mount-emission.test.js with 22
  new tests (N1-N9 emission shape, N12-N15 binding shape, N16-N21 controller,
  N22-N24 round-trip). Includes regression sanity checks for fallback path.
- [13:03] FULL SUITE — 7957 → 7983 pass (+26 net: precursor +4, Phase 2c +22).
  0 fail, 0 regressions outside the recon's enumerated set.
- [13:05] HAND-COMPILE — verified emission shape matches deep-dive §3:
  HTML: `<template id="..."><div>...</div></template><!--scrml-if-marker:..-->`
  JS:   _scrml_create_scope + _scrml_mount_template + _scrml_unmount_scope +
        initial mount + _scrml_effect with mount-on-truthy/unmount-on-falsy.
- [13:07] TodoMVC validate — node --check via bun PASS.
- [13:10] Ready to commit MAIN.
