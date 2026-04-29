# Progress: if-show-phase2c

Phase 2c — `if=` mount/unmount activation (Approach B1, locked by user).

## Plan
1. PRECURSOR: strip `if=`/`else-if=`/`else` from chain branch elements; add N31 regression test.
2. MAIN: uncomment dead Phase 2b block; update 28 expects; add 14 new tests.

## Baseline
- Branch worktree-agent-adf8b1a27295f9b08, rebased onto main (4fb5cec).
- After `bun install`:
  - tests/unit:        6023 pass / 0 fail / 0 skip / 24734 expects
  - tests/self-host:   263 pass / 2 skip / 0 fail / 1029 expects
  - tests/integration: 929 pass / 0 fail / 0 skip / 1053 expects
  - tests/browser:     pre-existing 132 fails (ECONNREFUSED — need live server; pre-existing infra issue)
- Total relevant scope (unit+self-host+integration): 7215 pass, 2 skip, 0 fail.

## Steps
- [11:01] Started — baseline captured, recon + deep-dive ingested, source files mapped.
- [11:32] PRECURSOR — added stripChainBranchAttrs helper in emit-html.ts (lines 99-114) and applied
  to branches.element + elseBranch in if-chain handler (lines 195, 213). Added 4 N31 regression
  tests in tests/unit/else-if.test.js §3. Tests pass: 7219 pass / 2 skip / 0 fail (+4 from baseline).
  Ready to commit precursor.
