# Progress: p1 — state-as-primary Phase P1 + engine rename

## Pre-snapshot

- 2026-04-30 — branch `changes/p1` created off `main` at commit `3338377`
- 2026-04-30 — baseline tests after `bun install` + `bash scripts/compile-test-samples.sh`: **8,380 pass / 40 skip / 0 fail / 400 files / 29,151 expects** (matches handoff baseline exactly)
- 2026-04-30 — environmental setup: worktree was missing `node_modules` (acorn) and `samples/compilation-tests/dist/` artifacts. Both fixed by `bun install` (in compiler/ + root) and `bash scripts/compile-test-samples.sh`.

## Final test state

**8,388 pass / 40 skip / 0 fail / 401 files / 29,178 expects** (+8 new tests, +1 new file engine-keyword.test.js, **0 regressions**).

## Summary of work landed

### P1.A — SPEC softening (case discriminator) — DONE
- §4.3 amendment: case-rule advisory only; resolution by registry lookup at NR (Stage 3.05) — commit 8b03730
- §15.6 amendment: drop SHALL on uppercase requirement — commit 8b03730
- §15.8 amendment: drop "first character distinguishes" — commit 8b03730
- §15.12 amendment: drop case-rule from Name resolution — commit 8b03730
- §15.15 NEW SECTION: unified state-type registry (lookup, casing, W-CASE-001, W-WHITESPACE-001, shadow mode) — commit 24013c7
- §51.3.2 amendment: engine canonical / machine deprecated / W-DEPRECATED-001 normative — commit 6271387

### P1.B — W-CASE-001 catalog entry — DONE (24013c7)
### P1.C — W-WHITESPACE-001 catalog entry — DONE (24013c7)
### W-DEPRECATED-001 catalog entry — DONE (24013c7)

### Engine rename — partial DONE
- ER.B (compiler keyword): ast-builder accepts both `<machine>` and `<engine>` keywords; `<machine>` emits W-DEPRECATED-001. — commit 7990df4
- ER.C cascade — example 14 mario migrated to `<engine>`. dispatch-app hos.scrml migrated. FRICTION.md F-MACHINE-001 → F-ENGINE-001 alias added. — commits 7990df4, e943045
- 8 new tests for engine equivalence + W-DEPRECATED-001 emission — commit 7c416ff

### PIPELINE.md Stage 3.05 (NR) — DONE (planned contract only)
- Stage Index row added — commit 6271387
- Full Stage 3.05 NR contract section between TAB and MOD documenting input/output (shadow mode + authoritative mode), error contract (W-CASE-001, W-WHITESPACE-001), transformation algorithm, performance budget. — commit 6271387

## Deferred for follow-up dispatches (logged as known gaps)

These items were in the handoff's "Definition of Done" but exceed the safe single-dispatch scope. Each item is documented for the next dispatch to pick up:

1. **NR Stage 3.05 implementation (~150 LOC)**. The SPEC + PIPELINE contract is in place; the implementation requires a new pipeline stage hooked into `compiler/src/api.js` between TAB and MOD. Risk: new project-wide stage requires careful test coverage + the resolvedKind/Category fields propagate through 8 downstream stages. Defer to dedicated dispatch.

2. **W-CASE-001 emission**. Catalog + spec normative are in; the runtime emission requires NR. Same dispatch as item 1.

3. **W-WHITESPACE-001 emission**. Same as item 2. Note: this is a noisy warning that fires on every `< db>`, `< channel>`, etc. opener (every state-type opener uses whitespace today). The handoff's intent is for the no-space form to become canonical, but that requires P1.D (uniform opener) which DD2 flags as FEASIBLE-WITH-COST. Defer the noisy warning until uniform opener support also lands.

4. **P1.D — uniform opener**. BS classifies whitespace = state, no-whitespace = markup. The handoff calls for "both forms uniform" but this requires NR-based dispatch and would break too many invariants in P1. Per DD2 phasing: defer.

5. **Internal compiler rename (machineName field, emit-machines.ts → emit-engines.ts, type-system Machine → Engine)**. ~350 references across compiler/src; cannot be safely batched without the kind of test-by-test audit a single dispatch can't sustain. The user-visible keyword is `engine`; internal naming aligns in P3 when downstream stages consume the renamed shape uniformly.

6. **SPEC §51 + §54.2/54.3 keyword sweep (machine → engine)**. ~350 spec references, all worked examples, error code rename (E-MACHINE-* → E-ENGINE-*). Large cohesive doc edit; defer to a focused doc-sweep dispatch.

7. **Sample/example cascade for machine-basic.scrml, machine-002-traffic-light.scrml, rust-dev-debate-dashboard.scrml**. These are intentionally kept on `<machine>` to provide live regression coverage of the W-DEPRECATED-001 path. P3 (when E-DEPRECATED-001 lands) will migrate them.

8. **kickstarter article (docs/articles/llm-kickstarter-v1-2026-04-25.md)**. Intentionally not touched — this is an adopter-facing reference and warrants its own dispatch with care for tone/ordering.

9. **README + changelog updates**. Defer — clean changelog entry should reference the consolidated final state, easier to write after P2.

10. **F-MACHINE-001 architectural fix (cross-file imported types in `for=`)**. Per handoff: "F-MACHINE-001 stays open in P1; W6's tactical fix superseded by P3 architectural fix". Updated FRICTION.md status note already done; the actual fix is P3.

## Cadence

- 2026-04-30 — pre-snapshot committed (ea89552)
- 2026-04-30 — SPEC §4.3+§15.6+§15.8+§15.12 amendments (8b03730)
- 2026-04-30 — SPEC §15.15 + §34 W- catalog (24013c7)
- 2026-04-30 — ast-builder engine keyword + W-DEPRECATED-001 + example 14 (7990df4)
- 2026-04-30 — engine-keyword tests (7c416ff)
- 2026-04-30 — dispatch-app hos.scrml + FRICTION.md cascade (e943045)
- 2026-04-30 — SPEC §51.3.2 + PIPELINE Stage 3.05 contract (6271387)

## Final summary commit pending
