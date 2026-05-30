# scrmlTS — Session 145 (CLOSE)

**Date:** 2026-05-30
**Previous:** `handOffs/hand-off-148.md` (S144 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-149.md` at S146 OPEN.

---

**🏁 S145 CLOSE (wrap + push).** Second adopter-fix arc in two days — **5 HIGH bugs RESOLVED + R26-verified** + a **SPEC §12.6** library-mode landing + a **match-arrow `:>` design ratification**. Plus a **3-test-flake parallel-safety fix** (the "anything else" the user asked for, to stop `--no-verify` pushes). Test count + push state in §CLOSE-STATE below.

**S145 landings (main, all PA-R26-verified on their landing commits):**
| Commit | Fix | Verify |
|---|---|---|
| `8b50c89b` | **GITI-024** brace-less `continue`/`break` parser fix (`ast-builder.js parseLogicBody`: `tok.line`→`tok.span.line`, 4 sites) | `.server.js` emits `continue;` ✓ |
| `3b825808` | **SPEC §12.6** library-mode `.server.js` suppression for body-content-escalated fns (GITI-027 secondary; user-ratified "body-content-escalated only") + GITI-024 test reconciled to browser-mode `<program>` | no `.server.js`, clean export ✓ |
| `2ebd107a` | **Bug-AB-REOPEN** engine-direct `<onTransition>` parser-coverage gap (6nz; engine-statechild scanner rejected lowercase-led openers) | fire fn + 2 bodies, `@transitions` 0→1→2 ✓ |
| `e2dcde7b` | **GITI-025+026** §37 SSE client-stub wiring (server param-bind + reactive `@cell=gen()` callback + named events) | `route.query["from"]` + `?from=5` + callback; `countdown(5)`→6 frames ✓ |
| `53203851` | **GITI-027A** NEW `W-AUTH-CONTENT-NOT-GATED` warning (security footgun) | fires on sidecar, exit 0 ✓ |
| _(flake-fix commit — see §CLOSE-STATE)_ | **S145** 3-test-flake parallel-safety (test-infra) | _pending agent landing_ |

---

## State as of OPEN (recap)
S145 opened at `6e832615` (v0.7.0), clean 0/0. Inbox had 1 unread (GITI-024) which became the first fix; 4 more arrived mid-session (GITI-025/026/027 + 6nz Bug-AB-reopen). Cross-machine: scrmlTS + scrml-support both 0/0 at open.

---

## 🔬 S145 EXECUTION LOG

### Adopter-fix arc (the morning)
GITI-024 triaged (R26-reverse, GENUINE) → dispatched `scrml-dev-pipeline` worktree → landed `8b50c89b`. The fix root was a depth-of-survey redirect: brief named the emitter (symptom); real fix was upstream in the parser (`tok.line` always-undefined → always-true label capture). +5 tests.

GITI-024 **secondary** (spurious `.server.js` for plain fs-touching `export function`s) → 4-reader workflow `wf_e623be53-2f0` (SPEC §12/§13.4/§21.5/§44.7.1) → user-ratified "body-content-escalated only" → landed **SPEC §12.6** `3b825808`. **Interaction reconciled at land time:** the GITI-024 test asserted a `.server.js` that §12.6 correctly suppresses (library mode, plain export-fn) — switched its 3 end-to-end tests to **browser-mode `<program>` + called `server function`** (route handler retained per §12.6), preserving re-serialization coverage. (The library-suppress agent based off `6e832615` pre-GITI-024, so the test wasn't in its worktree — classic S83 stale-base; PA reconciled.)

**Fresh inbox (GITI-025/026/027 + 6nz Bug-AB-reopen)** → R26-verify workflow `wf_272f8c8d-68e` (all 4 GENUINE) → parallel-3 dispatch (file-disjoint, S143-style) → landed: §37 cluster `e2dcde7b`, Bug-AB `2ebd107a`, GITI-027A `53203851`. **GITI-027A SPEC.md landed via `git apply --3way`** (its branch based off `6e832615` lacked §12.6; blind checkout would've reverted §12.6 — applied its §34/§40.9 additions instead, §12.6 verified intact).

### Match-alias deliberation (the afternoon)
User took inventory of match-syntax redundancy → workflow deliberation `wf_2e850acb-9cc` (4 researchers + adversarial keep-both + synthesis). **Outcome:**
- **Arm arrow → `:>` canonical** (RATIFIED, impl carry-forward). `=>`/`->` → deprecated aliases (`W-MATCH-ARROW-LEGACY` lint→error window). The deliberation surfaced a THIRD, undocumented, corpus-DOMINANT arrow `:>` (the user's own S14 intent) + that `:>` already codegens byte-identically. ZERO behavioral risk. `!{}` arms move in lockstep. Migration = AST `bun scrml migrate --fix` (corpus, volume-agnostic) + docs hand-labor (`=>`-heavy because it was the taught canonical). Design-insight 34; deep-dive `scrml-support/docs/deep-dives/match-arrow-colon-canonical-2026-05-30.md`.
- **Wildcard `else`/`_` — LEFT AS-IS.** The deliberation found "drop else→_" was backwards (else = established canon: corpus 29:7, normalization `_`→`else`, all error-UX; S37-AM-003 demoted `_` partly for `_{}`-collision). User: "feels wrong but probably my familiarity… we'll leave it; revisit on real adopter friction." (S67.)
- **Variant `.`/`::` — LEFT AS-IS** (cross-cutting: `::` canonical in `fail`/`!{}`).
- **`:`-shorthand body — KEEP + make robust.** User affirmed it's intentional + composes well (mandatory-whitespace a noted wart). → the S145-found fragility is a BUG TO FIX (NEW MED, below).

### Test-flake fix (the "anything else")
Dispatched `scrml-dev-pipeline` worktree to make the 3 parallel-load flakes parallel-safe (so the pre-push stops forcing `--no-verify`). See §CLOSE-STATE for landing.

---

## 🆕 NEW findings filed this session
- **NEW MED — `:`-shorthand-state-body engine `E-STRUCTURAL-ELEMENT-MISPLACED` fragility.** Some `<engine>` shapes with `:`-shorthand state bodies (`<Nav rule=.Edit>: "nav"`) trip `E-STRUCTURAL-ELEMENT-MISPLACED` on the engine itself. Found during Bug-AB PA-verify (`abShort2` fails with NO onTransition at all). **Stage-ordering confirms PRE-EXISTING, NOT Bug-AB:** the structural-placement check is pre-PASS-11; the Bug-AB fix is PASS-11+. Exact trigger is subtle (murky between `:`-shorthand-bodies vs surrounding cell decls vs engine-in-program). **Before dispatching a fix:** clean-isolate the trigger + confirm pre-existing on the pre-Bug-AB baseline `3b825808`. User ratified keep-`:`-shorthand + fix-the-fragility. Repros: `/tmp/abShort.scrml`, `/tmp/abShort2.scrml` (gone — re-derive). known-gaps §0 MED row.
- **DEFERRED-DESIGN — GITI-027B per-role SSR content-stripping.** `<auth role>` leaks HTML content even under `--emit-per-route` (only JS behavior is role-split). The "does scrml do per-role server-side rendering / strip `<auth>` subtrees at a serve layer?" question. giti is blocked on it (keeps their localdev+127.0.0.1 write-gate). Needs its own design deliberation/deep-dive. Part A (the warning) shipped this session.

---

## Open questions / S146 priorities (CARRY-FORWARD)
1. **Match `:>`-canonical implementation arc** (ratified S145). Lint (`W-MATCH-ARROW-LEGACY`, arm-context-scoped) + AST `migrate --fix` rule + SPEC §18/§19/§34 amendment + docs migration (SPEC/PRIMER/kickstarter, `=>`-heavy) + `!{}` lockstep. Zero codegen (all 3 arrows emit identically). Deep-dive has the full plan + SPEC delta + code-edit scope.
2. **`:`-shorthand-robustness fix** (NEW MED) — clean-isolate the `E-STRUCTURAL-ELEMENT-MISPLACED` trigger, confirm pre-existing, fix the block-splitter engine-boundary detection. User: keep `:`-shorthand, make it robust.
3. **GITI-027B** per-role SSR content-stripping — design deliberation (giti blocked).
4. **§51.0.H-C1 impl arc** (carried from S144) — SPEC §51.0.H + `effect=`-on-opener + §34 `E-ENGINE-EFFECT-ON-DERIVED` + edge-case rulings + codegen + README flagship fix.
5. **Tier-rung re-deep-dive** (carried from S144) — corpus-ouroboros-driven S64 rejection; re-test on merit.
6. **Other carry-forward:** R28-1c/R28-1d MED needs-confirm · R28-8 (bare-variant into object-literal: extend §14.10 vs canon-fix §4.8) · within-node allowlist staleness · native parser M2.4 + MK2 · fresh gauntlet R29 (vs v0.7.0+ baseline) · §36.6 input-state reactivity (S144 Bug-AC secondary, design call).

---

## pa.md directives in force
- **S136** BRIEF.md archival (all 6 S145 dispatches have BRIEF.md in `docs/changes/`) · **S138** R26 bidirectional (applied throughout) · **S139** `full wrap` (not active).
- **CANDIDATE PENDING (carried S142→S145):** branch-leak coherence addendum (verify `git rev-list origin/main..HEAD` + branch-tip-vs-FINAL_SHA on every landing — battle-tested again this session across 6 dispatches; surface for ratification).
- Standing: `--no-verify` prohibition (extends pre-push) · S126 Bash-edit + no-`cd`-into-main · S99 path-discipline (counter held at 20 — zero leaks across 6 S145 dispatches) · S88 explicit `isolation:worktree` · S90 CWD gate · S83 commit-discipline + verify-git-state · S94 bump-on-tag · `feedback_file_delta_vs_cherry_pick`.
- Rules: R1 no-marketing · R2 not-a-toy · R3 right-beats-easy · R4 SPEC-normative · R5 shoot-straight.

---

## CLOSE-STATE
- **HEAD scrmlTS:** the S145 wrap commit (this commit) — pushed to origin **0/0**. · **flake-fix commit:** `52a1dfe3`. · 6 commits this session: `8b50c89b` GITI-024 · `3b825808` §12.6 · `2ebd107a` Bug-AB · `e2dcde7b` §37 · `53203851` GITI-027A · `52a1dfe3` flake-fix · + this wrap commit.
- **Tests:** full suite **0 real fail / 223 skip** (~22,303 pass). The flake fix held (no timeouts). **Pre-push INITIALLY flagged the within-node parity gate** — GITI-024's brace-less-`continue`/`break` parser fix (`ast-builder.js`) shifted LIVE-vs-native residuals on 2 fixtures (`phase2-for-continue-055` MISSING-FIELD +1; `ast.scrml` SPAN-COORD +7). **BENIGN** (PARSE-FAILURE 0; LIVE moved more-correct, native parser lags — the GITI-024 fix was scoped to the LIVE pipeline, not native). **Rebumped the allowlist** per the S142/S125 procedure (`parser-conformance-within-node-allowlist.json`) → gate clean. After rebump, **pre-push CLEAN — NO `--no-verify` this session** (first clean clean-push since the flakes started). **NEW CARRY-FORWARD:** the native parser (`compiler/native-parser/`) needs the same brace-less-`continue`/`break` label fix — close the LIVE-vs-native divergence at the M-swap (the allowlist rebump tracks it until then).
- **known-gaps §0:** HIGH 0 · MED 14 (+`:`-shorthand fragility) · LOW 15 · Nominal 8 (reconciled S144 count drift). known-gaps + changelog + master-list §0.6 all refreshed.
- **scrml-support:** user-voice S145 + deep-dive `match-arrow-colon-canonical-2026-05-30.md` + design-insight 34 — committed + pushed **0/0**. (Pre-existing untracked `tools/` + `voice/articles/*devto*` marketing drafts left untouched — R1.)
- **Worktrees:** all 6 cleaned (5 fix-landings + flake) — only main checkout remains. S99 path-discipline counter held at **20** (zero leaks across 6 S145 dispatches).
- **Acks:** sent — giti (024 `8b50c89b` / 025+026 `e2dcde7b` / 027A `53203851` + 027B-deferred-design) · 6nz (Bug-AB reopen → `2ebd107a`). Inbox (GITI-024/025/026/027 + 6nz-Bug-AB) moved to `handOffs/incoming/read/`.
- **pa.md candidate (carried):** branch-leak coherence addendum — surface for ratification S146.

---

## Tags
#session-145 #CLOSE #adopter-fix-arc #giti-024 #giti-025 #giti-026 #giti-027a #bug-ab-reopen #spec-12.6-library-mode #match-arrow-colon-canonical #insight-34 #colon-shorthand-fragility-MED #giti-027b-deferred #test-flake-fix
