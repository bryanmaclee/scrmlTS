# scrmlTS — Session 146 (OPEN)

**Date:** 2026-05-30
**Previous:** `handOffs/hand-off-149.md` (S145 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-150.md` at S147 OPEN.

---

## State as of OPEN
- **HEAD scrmlTS:** `948d3f2f` (S145 within-node allowlist rebump). **v0.7.0.** Clean working tree.
- **Cross-machine sync:** scrmlTS **0/0** with origin; scrml-support **0/0** with origin. Both fetched clean at OPEN.
- **Hooks:** configuration B (local-rich) — `pre-commit` + `post-commit` + `pre-push` all installed at `.git/hooks`. `--no-verify` prohibition extends to pre-push.
- **Inbox:** empty (no unread in `handOffs/incoming/`). S145 cleared GITI-024/025/026/027 + 6nz-Bug-AB to `read/`.
- **known-gaps §0 (S145 close):** HIGH 0 · MED 14 (incl. `:`-shorthand fragility) · LOW 15 · Nominal 8.
- **Maps:** **38 commits stale** — watermark `9ab7aa38` (S142, 2026-05-29). Heavy compiler-source movement since (errorBoundary build `emit-error-boundary.ts` +320, §37 SSE wiring, GITI-024 ast-builder fix, W-AUTH warning, SPEC §12.6, type-system +328, ~37 src files). **Refresh recommended before the next compiler-source dispatch** — every S146 priority below touches src/SPEC. Surfaced to user at OPEN.

---

## S146 priorities (CARRY-FORWARD from S145)
1. **Match `:>`-canonical implementation arc** (ratified S145; design-insight 34; deep-dive `scrml-support/docs/deep-dives/match-arrow-colon-canonical-2026-05-30.md`). Lint (`W-MATCH-ARROW-LEGACY`, arm-context-scoped — deprecate `=>` as a *separator* while it stays valid as a lambda) + AST `bun scrml migrate --fix` rule (precise, NOT regex) + SPEC §18/§19/§34 amendment + docs migration (SPEC/PRIMER/kickstarter, `=>`-heavy) + `!{}` arms move in lockstep. **Zero codegen** — `:>`/`=>`/`->` already build identical AST + emit identical JS today (PA-verified S145).
2. **`:`-shorthand-robustness fix** (NEW MED, S145). `:`-shorthand-state-body engine shapes (`<Nav rule=.Edit>: "nav"`) trip `E-STRUCTURAL-ELEMENT-MISPLACED` on the engine itself. **Confirmed PRE-EXISTING, NOT Bug-AB** (structural-placement check is pre-PASS-11; Bug-AB fix is PASS-11+). User: keep `:`-shorthand, make it robust. **Before fix dispatch:** clean-isolate the trigger (murky between `:`-shorthand-bodies vs surrounding cell decls vs engine-in-program) + confirm pre-existing on baseline `3b825808`. Repros were `/tmp/abShort.scrml` + `/tmp/abShort2.scrml` (gone — re-derive).
3. **GITI-027B** per-role SSR content-stripping — design deliberation/deep-dive (giti blocked; they keep localdev+127.0.0.1 write-gate). `<auth role>` leaks HTML content even under `--emit-per-route` (only JS behavior is role-split). Part A (the warning) shipped S145.
4. **§51.0.H-C1 impl arc** (carried from S144) — SPEC §51.0.H amendment + `effect=`-on-opener (boot-only, init→initial= edge) + §34 `E-ENGINE-EFFECT-ON-DERIVED` + 3 edge-case rulings (errorBoundary scope over boot-effect throw; boot-effect ordering vs `<onIdle>` arming) + §51.0.R module-init linkage + codegen + README Stage-3 flagship fix (self-target → opener-`effect=`).
5. **Tier-rung re-deep-dive** (carried from S144) — the S64 `tier-ladder-rungs-stability` rejection was corpus-ouroboros-driven (corpus-zero made decisive one session before Rule 2 ratified that pattern as forbidden). Re-evaluate on pure DX merits: corpus-zero discounted, Tier 0→1 jump-pain re-tested on current post-R24-R28 gauntlets, inherit the on-enter "design-for-witnessed-need" precedent. Probably its own session; sequence AFTER the on-enter (C1) arc lands.
6. **Other carry-forward:** R28-1c/R28-1d MED needs-confirm · R28-8 (bare-variant into object-literal: extend §14.10 vs canon-fix §4.8) · within-node allowlist staleness hygiene · **native parser** needs the same brace-less-`continue`/`break` label fix as GITI-024 (close LIVE-vs-native divergence at M-swap; allowlist rebump tracks it until then) · native parser M2.4 + MK2 · fresh gauntlet R29 (vs v0.7.0+ baseline) · §36.6 input-state reactivity (S144 Bug-AC secondary, design call).

---

## pa.md directives in force
- **S136** BRIEF.md archival (every `isolation:worktree` dispatch) · **S138** R26 bidirectional empirical-verification · **S139** `full wrap` discriminator (not active).
- **CANDIDATE PENDING (carried S142→S145→S146):** branch-leak coherence addendum — verify `git rev-list origin/main..HEAD` + branch-tip-vs-FINAL_SHA on every landing, not just `git status`-clean. Battle-tested across 6 S145 dispatches + 6 S144 dispatches with zero issues. **Surface for ratification.**
- Standing: `--no-verify` prohibition (extends pre-push) · S126 Bash-edit + no-`cd`-into-main · S99 path-discipline (counter at **20** — zero leaks across last 12+ dispatches) · S88 explicit `isolation:worktree` · S90 CWD gate · S83 commit-discipline + verify-git-state-not-narrative · S94 bump-on-tag.
- Rules: R1 no-marketing · R2 not-a-toy · R3 right-beats-easy · R4 SPEC-normative · R5 shoot-straight.

---

## Tags
#session-146 #OPEN #match-arrow-colon-impl #colon-shorthand-fragility-MED #giti-027b-deferred #spec-51.0.H-C1 #tier-rung-redeepdive #maps-stale-38
