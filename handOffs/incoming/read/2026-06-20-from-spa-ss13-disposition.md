# From sPA ss13 → scrml PA: whole-list disposition (phantom-codegen-nominal-stdlib)

**Date:** 2026-06-20 · **From:** sPA ss13 · **To:** scrml PA
**Kind:** re-integration / findings · **Status:** needs: action (no branch code to merge — see below)
**Branch:** `spa/ss13` tip **`04b8397c`** (base `e8a5491f` = origin/main) · worktree `../scrml-spa-ss13`

---

## TL;DR

ss13 ran to completion: **all 5 items dispositioned, zero dev-dispatches, zero code landings.** The list was
clustered from two stale premises and is non-executable as bounded sPA work — this is the whole-list-stall
stand-down, not a pause-to-ask. The branch carries only disposition bookkeeping (the updated list file +
`spa-lists/ss13.progress.md`); **there is no code to re-integrate.** What you DO get is a verified currency
correction + two escalations. Full detail in `spa-lists/ss13.progress.md` on the branch.

## The 5 dispositions

1. **stdlib Phase 3 (canonical-form) → ESCALATE (design scope).** The entry test already `.skip`s C21/C22/C23
   "pending PA scope decision … coordinated API refactor (signatures + callers + spec extension)." Verified surface:
   3a `throw new Error` 43 hits/11 files (→`fail .Variant` changes fn contracts; the `scrml:test` assertion fns are
   called from every `~{}` block and `assertThrows` needs `try/catch`), 3b `try{}` 9/5, 3c bun-import 2 files —
   3c **explicitly needs a SPEC §40.4 amendment OR a vendoring decision.** Blast radius exceeds the list's ingestion.
   **Ask:** PA/dPA scope a `fail`/`!{}`/bun-import migration model (incl. the §40.4 ruling) before any dispatch.

2. **§23 browser overclaims → PARK (user-blocked).** Only lever is amending published articles; user verbatim
   "no amendments to published articles for now." Phantom-codegen gap stands as a record.

3. **§29 vanilla file interop → PARK (friction-gated).** known-gaps Bug 10: Nominal/framing-corrected S132,
   deliberate deferral, re-trigger ≥2 adopter friction — no trigger fired. Live interop is §21. Standing deferral.

4. **§58 build story → ESCALATE / re-bucket.** Concurs with **sPA ss14 item5** (known-gaps:1236): SPEC'd, 0 impl
   symbols, ~90-200h, M6-gated, trust-sensitive (Merkle/SHA-256). "A deferred feature arc, not an sPA fix → move
   to a design/feature track." **Ask:** re-bucket §58 to PA/dPA staging (joins ss14's same call).

5. **§59 value-native maps → ALREADY BUILT (list/SPEC-INDEX stale).** ⚠ currency correction. known-gaps:
   "value-native map §59 BUILT S169 (Nominal→Implemented)"; the 9 `value-native-map-*` suites pass **202/202**.
   The S208 footprint ("implement §59, green-field") and the SPEC-INDEX both still carry the dead Nominal banner.
   **Ask (doc-only, PA/SPEC territory):** flip SPEC §59 Nominal banner → Implemented; reconcile §0 Nominal counts
   (known-gaps shows "Nominal 9" — verify §59 is excluded); fix the ss13 list item-5.

## What I recommend you do at re-integration

- **Merge?** Optional. The branch is one docs commit (list-disposition + progress.md). FF-merge it to capture the
  bookkeeping, or just read it and update known-gaps/SPEC-INDEX directly — your call (no code, no risk either way).
- **Currency:** flip §59 Nominal→Implemented in SPEC + reconcile §0 (item 5 above).
- **Re-bucket §58** to the design/feature track (ss14 + ss13 agree).
- **Open a scope item** for the stdlib `fail`/`!{}`/bun-import migration (item 1 — the §40.4 ruling gates it).
- **Leave §29 / §23** as standing deferrals (no action).
- **List-builder feedback:** ss13 mixed already-done (§59), ratified-deferral (§29/§23), and design-gated
  (stdlib/§58) items under a "Nominal-flip green-field" banner that was stale on landing. Worth a footprint
  currency-pass on the remaining Bucket-A lists' Nominal claims against actual code before the next sPA boots one.

The user is closing this instance. No wrap performed (sPA owns no durable main-state).
