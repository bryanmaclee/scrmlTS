# Progress: p1 — state-as-primary Phase P1 + engine rename

## Pre-snapshot

- 2026-04-30 — branch `changes/p1` created off `main` at commit `3338377`
- 2026-04-30 — baseline tests after `bun install` + `bash scripts/compile-test-samples.sh`: **8,380 pass / 40 skip / 0 fail / 400 files / 29,151 expects** (matches handoff baseline exactly)
- 2026-04-30 — environmental setup: worktree was missing `node_modules` (acorn) and `samples/compilation-tests/dist/` artifacts. Both fixed by `bun install` (in compiler/ + root) and `bash scripts/compile-test-samples.sh`.

## Plan + status

### P1.A — SPEC softening (case discriminator) — **DONE**
- §4.3 amendment: case-rule advisory only; resolution by registry lookup at NR (Stage 3.05) — DONE
- §15.6 amendment: drop SHALL on uppercase requirement; W-CASE-001 on HTML collision — DONE
- §15.8 amendment: drop "first character distinguishes" — DONE
- §15.12 amendment: drop case-rule from Name resolution — DONE
- New §15.15: unified state-type registry section — DONE
  - Commits: 8b03730, 24013c7

### P1.B — W-CASE-001 catalog entry — **DONE** (24013c7)
### P1.C — W-WHITESPACE-001 catalog entry — **DONE** (24013c7)
### W-DEPRECATED-001 catalog entry — **DONE** (24013c7)

### Engine rename — partial **(in progress)**
- ER.B (compiler keyword): ast-builder accepts both `<machine>` and `<engine>` keywords; `<machine>` emits W-DEPRECATED-001. — DONE in next commit
- ER.C cascade — example 14 migrated to `<engine>` to keep LSP test green. — DONE in next commit
- Remaining: tests for engine equivalence + W-DEPRECATED-001 emission, sample/example cascade for the other usages.

### Deferred for this dispatch (logged for next phase)
- **P1.D — uniform opener**: BS classifies whitespace = state, no-whitespace = markup. The handoff calls for "both forms uniform" but this requires NR-based dispatch and would break too many invariants in P1. Deferred to P2/P3 per DD2 phasing (FEASIBLE-WITH-COST).
- **P1.E — NameRes Stage 3.05 shadow-mode**: scaffold only, computes resolvedKind but doesn't drive routing. Deferred. P1's catalog + spec foundations are in place; the stage scaffold is ~150 LOC of new pipeline plumbing that adds structural risk. Will land in next dispatch.
- **W-CASE-001 emission code path**: catalog entry is in place; runtime emission requires NR. Deferred to NR-scaffold dispatch.
- **W-WHITESPACE-001 emission**: same — needs the scaffold.
- **Internal compiler rename (machineName field, emit-machines.ts → emit-engines.ts, type-system Machine → Engine)**: too large a rename for this dispatch given the 350+ machine references across compiler/src; the AST keeps `kind: "machine-decl"` and `machineName` field unchanged. The user-visible keyword is `engine`; internal naming aligns in P3 when downstream stages consume the renamed shape uniformly.
- **SPEC §51 + §54.2/54.3 keyword rewrite (machine → engine)**: large doc edit (350 references); deferred to a focused doc-update dispatch.
- **F-MACHINE-001 → F-ENGINE-001 rename in FRICTION.md**: deferred.

## Cadence

- 2026-04-30 — pre-snapshot committed (ea89552)
- 2026-04-30 — SPEC §4.3+§15.6+§15.8+§15.12 amendments (8b03730)
- 2026-04-30 — SPEC §15.15 + §34 W- catalog (24013c7)
- 2026-04-30 — ast-builder engine keyword + W-DEPRECATED-001 + example 14 (next commit)
