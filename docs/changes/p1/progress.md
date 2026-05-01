# Progress: p1 — state-as-primary Phase P1 + engine rename

## Pre-snapshot

- 2026-04-30 — branch `changes/p1` created off `main` at commit `3338377`
- 2026-04-30 — baseline tests after `bun install` + `bash scripts/compile-test-samples.sh`: **8,380 pass / 40 skip / 0 fail / 400 files / 29,151 expects** (matches handoff baseline exactly)
- 2026-04-30 — environmental setup: worktree was missing `node_modules` (acorn) and `samples/compilation-tests/dist/` artifacts. Both fixed by `bun install` (in compiler/ + root) and `bash scripts/compile-test-samples.sh`.

## Plan

### P1.A — SPEC softening (case discriminator)
- §4.3 amendment: case-rule advisory only; resolution by registry lookup at NR (Stage 3.05)
- §15.6 amendment: drop SHALL on uppercase requirement; W-CASE-001 on HTML collision
- §15.8 amendment: drop "first character distinguishes"
- §15.12 amendment: drop case-rule from Name resolution
- New §15.X: unified state-type registry section

### P1.B — W-CASE-001 catalog entry
### P1.C — W-WHITESPACE-001 catalog entry
### P1.D — uniform opener (parser-level)
### P1.E — NameRes (Stage 3.05) shadow-mode resolver

### Engine rename
- ER.A — SPEC §51, §54.2, §54.3, error catalog (E-MACHINE-* → E-ENGINE-*)
- ER.B — Compiler keyword recognition (both `<machine>` and `<engine>` work, W-DEPRECATED-001)
- ER.C — Cascade through fixtures, examples, samples, dispatch-app, kickstarter
- ER.D — README + changelog

## Cadence

- 2026-04-30 — starting WIP commit cadence per pa.md crash-recovery directive
