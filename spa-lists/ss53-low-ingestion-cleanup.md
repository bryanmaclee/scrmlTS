# ss53 — low-ingestion cleanup (per-item disjoint) — VERIFY-FIRST/SURVEY

**Fill-note (read this — the scope is NOT "11 LOWs").** The S228-boot intent was "sweep the 11 open LOWs in one cleanup sPA (ss27 precedent)." On inspection against the LIVE known-gaps dispositions, **only 2 of the 11 are genuinely sPA-cleanup-able** — the other 9 are design-gated / by-design / self-host-forbidden / already-listed / groundwork-gated and must NOT be force-swept (false-coverage). This list carries the 2 real items; the **EXCLUDED** table below reconciles the other 9 with reasons so nothing is silently dropped.

**Ingestion:** NONE shared — this is the sanctioned **per-item-disjoint** cleanup lane (the ss27 shape; `core files: (per-item disjoint)`). The two items are write-disjoint (`promote.js` vs `detect-sql-in-arrow.ts`) → trivially satisfy the S226 ingestion-disjoint invariant; safe to do sequentially in one sPA.

**Brief reminders:** VERIFY-FIRST per item (reproduce the current behavior before changing it). R26 (compile + `node --check` + behavior) + full `bun run test` (0-regression). **S215 adversarial** per item (constructed-edge, not just happy-path). Item-1 is a small ratified BUILD (mirrors shipped `--match`/`--each`); item-2 is a confirm-dead-then-prune (do NOT remove the safety net unless dead is PROVEN across the corpus).

## Items

1. **bug-20** — `bun scrml promote --engine` (Tier-1→2 sibling) `[status=landed-on-branch · spa/ss53 9a7b8470]` **READY BUILD · RATIFIED S210 (ruling B)**
   - **sPA NOTE (boundary flagged for PA):** built the ratified span-only rewrite (green, fail-closed). VERIFY-FIRST surfaced that the brief's cell-name model was INVERTED — the *idiomatic same-named-cell* shape (`<phase>: Phase` + `<match for=Phase on=@phase>`) REVERTS via `E-ENGINE-VAR-DUPLICATE` (span-only rewrite leaves the now-redundant `<phase>` decl, which collides with the engine's auto-declared `@phase`). Guided, not silent. `--engine` only one-pass-promotes when the match's `on=@cell` name DIFFERS from the type-derived engine cell. The cell-decl-lift is OUT of "just the span-rewrite" scope → **candidate follow-on gap for the PA** (SPEC §56.6.2 documents the boundary honestly).
   - The `--match` (Tier-0→1) and `--each` CLI verbs shipped (S66 / S134). The companion **`--engine`** (Tier-1→2: `<match for=Type>` block-form → `<engine for=Type initial=.Variant>`) is the last unbuilt `promote` verb. RULING B (S210) collapsed it from "4 pieces" to **just the span-rewrite** — `W-MATCH-TRANSITIONS-ACCRUING` was DROPPED as redundant (overlaps the shipped `W-MATCH-RULE-INERT`), so NO new lint is needed.
   - **Build:** the `--engine` span-rewrite in `promote.js`, mirroring the shipped `--match`/`--each` mechanics. `initial=` = the first arm's variant; per-arm `rule=` carry the transition targets; state-children carry forward verbatim. Reuse the existing `W-MATCH-RULE-INERT` (opportunity surface) + shipped `W-ENGINE-INITIAL-MISSING` (default-initial path). SPEC §56.6 to be amended to drop the W-MATCH-TRANSITIONS-ACCRUING reference when the rewrite lands.
   - **Footprint:** `compiler/src/.../promote.js` (the verb dispatch + span-rewrite) + the §56.6 SPEC reference edit. Transactional sanity-gate (revert any rewrite that fails to re-parse — the `--match`/`--each` precedent). Adversarial: multi-target `rule=(.A|.B)` arms · payload-binding arms · `_` wildcard arm · already-engine input (no-op) · single-arm match.

2. **g-detect-sql-in-arrow-case-a-redundant** — dead Case A safety-net prune `[status=landed-on-branch · spa/ss53 2715b2ad]` **VERIFY-FIRST · confirm-dead-then-prune → PROVEN DEAD, pruned**
   - After ss50 item-1 (`2fca8075`) the concise/return-arrow no longer orphans the `?{}` at parse, so `detect-sql-in-arrow.ts` **Case A** no longer fires for that shape (retained as a safety net; no double-fire today). The cleanup: PROVE Case A is dead across the corpus, then remove it — OR, if a live shape still trips it, close the gap as "intentional safety net, keep" (do NOT remove a live guard).
   - **Verify-first:** grep the corpus + run the suite to confirm zero live Case-A fires; construct the pre-ss50 shapes to confirm Case B (or the parser fix) now covers them. Only prune if PROVEN dead.
   - **Footprint:** `compiler/src/detect-sql-in-arrow.ts` (Case A branch) + its tests. Adversarial: the exact pre-ss50 arrow-body `?{}` shapes that motivated Case A originally — confirm they still error (via the ss50 parser fix / Case B), not silently compile.

## EXCLUDED — the other 9 open LOWs (NOT in this sweep, with reason)

| gap | why not in this cleanup |
|---|---|
| `g-rendermap-needs-server-classification` | **already in ss51** (item 2) — don't duplicate |
| `g-sse-server-keyword` | DD-deferred KEEP; re-trigger unmet; **no code** (design-gated) |
| `g-sql-row-protect-leak` | explicitly "design follow-on, **NOT an sPA fix**" — needs SPEC ratification of the static-projection contract first |
| `g-markup-session-read-undeclared` | **DESIGN-Q for the user** — is markup a legal read locus for the window-scoped `@session`? Needs a ruling, not a fix |
| `g-const-collides-state` | **by-design** (V5-strict bans local shadowing of state names); filed only so the reply/DX-clarity is tracked — "not a fix" |
| `g-selfhost-class-collector-each-match-no-walk` | **self-host** (`section-assembly.js`) — B4-deferred / forbidden-sPA-scope; fix when self-host work resumes post-v1.0 |
| `r28-2b` | `:let` leading-colon tokenizer fix — **broad blast radius** (all leading-colon attrs); deliberately deferred to a separate tokenizer dispatch; `:let` works via the `let` alias today |
| `bug-21` | Q6-narrow deep multi-level reset — runtime CORRECT; symptom UNREACHABLE without deep-field-tracking groundwork; "**not worth it absent adopter friction**" |
| `bug-22` | Q6-narrow cross-cell `default=@otherCell` reset classification — heuristic; "**none needed in practice**"; the real type-check fires at the assignment site |

**Net:** 2 sweepable / 1 already-listed / 6 design-or-groundwork-gated / (the remaining LOW count reconciles against the §0 total). If a future session wants to attack the gated ones, they route to the PA/dPA design track (most are Bucket B), not this lane.

<!-- @minted: S228 (2026-06-28) over the post-S227 open board (HIGH 0 · MED 8 · LOW 11 · Nom 7). per-item-disjoint cleanup (ss27 shape). 2 actionable (bug-20 ready build + g-detect-sql prune); 9 excluded-with-reason. -->
