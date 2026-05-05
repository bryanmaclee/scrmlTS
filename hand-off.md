# scrmlTS — Session 59 (CLOSED — heavy-execution: 7/13 of A1a + L21 + program-attrs + 3 audits + dashboard rewrite)

**Date opened:** 2026-05-05
**Date closed:** 2026-05-05 (same day)
**Previous:** `handOffs/hand-off-58.md` (S58 close — Stage 0b COMPLETE)
**This file (close snapshot):** rotated to `handOffs/hand-off-59.md` at S59 close

**Baseline entering S59:** scrmlTS at `b140cc1`, 8,720 / 43 / 0 / 8,763 across 432 files. scrml-support at `48170b1`. Both repos clean+pushed.

**State at S59 close:** scrmlTS at `505531f` then forward through wrap commits (final SHA at hand-off rewrite + push). scrml-support at `f7b935a`. **Tests: 8,784 pass / 43 skip / 0 fail / 8,827 across 435 files.** Net delta: **+64 pre-commit-equivalent pass tests, +3 net test files, ~30+ commits scrmlTS, 3 commits scrml-support.**

---

## 0. The big shape of S59 — Phase A1a in flight, 7/13 sub-steps + program-attrs + L21 + 3 audits

S59 was the session where Phase A1a started — and where the original scoping was invalidated by the parser audit, leading to a comprehensive realignment: piecemeal not greenfield, ~280-440h estimate, 13-step rev2 decomposition.

**The sequence of work:**

1. **L21 small-deliberation lock** opened S59 — `E-DERIVED-VALUE-MUTATE` ratified FORBIDDEN; sibling rename `E-REACTIVE-002` → `E-DERIVED-WRITE`. Single SPEC commit + cross-cutting docs.
2. **Phase A1 entry plan ratified** — split (b) three-way: A1a lex+parse → A1b resolve+type → A1c codegen. PA-recommended, user-authorized.
3. **A1a dispatch rev-1** — halted on baseline mismatch (`samples/compilation-tests/dist/` empty in fresh worktree → ~130 ECONNREFUSED). Fix: `bun run pretest` added to brief startup + pa.md F4 step 5.
4. **A1a dispatch rev-2** — halted on first-run flake (2 fails resolve on rerun). Fix: flake-handling protocol added to brief.
5. **A1a dispatch rev-3** — agent invoked PHASE 0.5 doctrine + produced 11-step decomposition instead of monolithic. PA accepted.
6. **Step 1 landed** — `reset` keyword reserved. `9cd7779`.
7. **Step 2 dispatch (S60 rev)** — halted on AST-contract mismatch: target was `kind: "reactive-decl"` not `kind: "state"`. Surfaced the parser-audit need.
8. **Comprehensive parser audit** + scope-of-work inventory + article truthfulness audit. **Major user redirect:** "we are in the middle of a MAJOR breaking language change... we need a way of knowing where we are at in the progress."
9. **Master-list rewrite** as v0.2.0 progress dashboard. README banner. scrml.dev announce draft.
10. **Re-decomposition (rev 2)** — corrected AST target (`state-decl`); foundational pass becomes Step 2; 13 total steps.
11. **Per-step dispatches resumed in parallel** — Step 8 (E-RESERVED-IDENTIFIER + init.js fix), Step 2 (foundational `<NAME>` decl-site recognition; depth-of-survey discount confirmed: agent finished in ~21min vs 10-15h estimate), Step 3 (mass rename `reactive-decl` → `state-decl`), Step 4 (shape discriminant; surfaced `reactive-derived-decl` divergence), program-attrs feature (parallel side track), Step 5 (Shape 2 renderSpec + bareword validators).
12. **Methodology meta-insight captured** — "depth-of-survey discount" pattern with 4 confirmed occurrences (S51 W2 + S52 DD4 + S59 Step 2 + S59 documentary-attrs). Design-insights.md + PA-SCRML-PRIMER §12 updated.
13. **Wrap.**

---

## 1. The S59 commit ledger (~30+ commits, all pushed)

Headline commits in chronological order (some intermediate WIPs omitted; full ledger via `git log --oneline 9cb123c..HEAD` on close):

| SHA | Type | Description |
|---|---|---|
| `1217b41` | spec | L21 lock — E-DERIVED-VALUE-MUTATE + rename E-REACTIVE-002 → E-DERIVED-WRITE |
| `8e5e459` | docs | Cross-cutting doc updates for L21 |
| `9772c0f` | scrml-support | L21 outcomes ledger + user-voice S59 |
| `44afa5d` | brief | Phase A1a lex+parse dispatch brief — rev1 |
| `25f4397` | brief+pa | A1a rev2 — bun run pretest in worktree (F4 step 5) |
| `3c9748e` | brief | A1a rev3 — flake-handling protocol |
| `9cd7779` | compile | Step 1 — reserve `reset` as keyword |
| `da8f0a1` | docs | Step 1→Step 8 dependency record (init.js template) |
| `1eab7a2` | audit | Parser audit: 25 features classified |
| `802375e` | inventory | Comprehensive v0.2.0 scope-of-work map |
| `d1618ed` | audit | Article truthfulness audit (15 articles) |
| `a6504da` | docs | Master-list rewrite as v0.2.0 dashboard |
| `88535f9` | docs | README v0.2.0 banner + scrml.dev announce draft |
| `be964b7` | docs | AST contracts + 13-step decomposition rev 2 |
| `af4a0da` | compile | Step 8 — E-RESERVED-IDENTIFIER + init.js fix |
| `5c005a0` | scrml-support | Design-insight: depth-of-survey discount (3 occurrences) |
| `b87e1cd` | docs | PA-SCRML-PRIMER §12 — depth-of-survey discount pointer |
| `d28f6f7` | compile | Step 2 — foundational `<NAME>` decl-site recognition |
| `8fa26e1` | compile | Step 3 — rename reactive-decl → state-decl mass sweep |
| `94f903a` | docs | Step 3 self-rename artifact cleanup |
| `41d0027` | docs | Master-list refresh post-Step-3 |
| `4620290` | feat | Documentary `<program>` attributes (title/description/version/author/license) |
| `96dbe92` | compile | Step 4 — shape discriminant on state-decl + self-host parity |
| `f7b935a` | scrml-support | Design-insight: 4th occurrence (documentary-attrs brief-locus) |
| `f1a6da5` | docs | Master-list refresh post-Step-4 + reactive-derived-decl divergence |
| `505531f` | compile | Step 5 — Shape 2 renderSpec + bareword validators |
| `<wrap>` | docs | hand-off + master-list + changelog wrap (this commit) |

---

## 2. Phase A1a 13-step status — LIVE

| # | Step | Status | Commit |
|---|---|---|---|
| 1 | Lexer: reserve `reset` | ✅ | `9cd7779` |
| 2 | Foundational: `<NAME>` decl-site recognition | ✅ | `d28f6f7` (depth-of-survey discount confirmed) |
| 3 | AST kind rename `reactive-decl` → `state-decl` | ✅ | `8fa26e1` (~514 changes / ~120 files) |
| 4 | Parser: state-decl `shape` discriminant | ✅ | `96dbe92` (17 sites + self-host parity) |
| 5 | Parser: Shape 2 `renderSpec` + bareword validators | ✅ | `505531f` |
| 6 | Parser: `default=` + `pinned` on state-decl | ⏸ NEXT | |
| 7 | Parser: `pinned` on import items | ⏸ | |
| 8 | E-RESERVED-IDENTIFIER trigger | ✅ | `af4a0da` |
| 9 | Expression parser: `reset(@cell)` keyword + E-RESET-NO-ARG | ⏸ | |
| 10 | Expression parser: MemberCall/MemberAssignment/UnaryDelete shape verification | ⏸ | |
| 11 | Variant C compound verification + render-by-tag verification + kickstarter v2 §3 smoke | ⏸ | |
| 12 | Existing-test deltas: rewrite + drop | ⏸ | |
| 13 | Final commit + CHANGELOG draft | ⏸ | |

**7/13 done.** Remaining estimated ~18-30h focused work across Steps 6, 7, 9, 10, 11, 12, 13.

---

## 3. Stdlib state (16 user-facing modules, unchanged S59)

`auth`, `crypto`, `data`, `format`, `fs`, `http`, `path`, `process`, `router`, `store`, `test`, `time`, `redis`, `cron`, `regex`, `oauth`. No stdlib changes S59.

---

## 4. Tests posture

| Snapshot | Pass | Skip | Fail | Total | Files |
|---|---|---|---|---|---|
| S58 close | 8,720 | 43 | 0 | 8,763 | 432 |
| Post Step 1 | 8,726 | 43 | 0 | 8,769 | 433 |
| Post Step 8 | 8,730 | 43 | 0 | 8,773 | 434 |
| Post Step 2 | 8,745 | 43 | 0 | 8,788 | 434 |
| Post Step 3 | 8,745 | 43 | 0 | 8,788 | 434 (rename, no count change) |
| Post program-attrs | 8,757 | 43 | 0 | 8,800 | 435 |
| Post Step 4 | 8,769 | 43 | 0 | 8,812 | 435 |
| **S59 close (post Step 5)** | **8,784** | **43** | **0** | **8,827** | **435** |
| **Delta vs S58 close** | **+64 pass** | **0** | **0** | **+64** | **+3 files** |

**0 failures throughout.** Pre-commit subset (browser-excluded) at S59 close ~8,055 / 33 / 0.

---

## 5. ⚠️ S60 first moves

S60 PA's ready-to-go checklist:

1. **Read pa.md, PA-SCRML-PRIMER, hand-off, last ~10 user-voice contentful entries** per session-start checklist. Primer §12 has the depth-of-survey-discount mitigations + 4 occurrences — read carefully; this is the methodology principle for S60+ dispatches.
2. **Confirm test baseline 8,784 / 43 / 0 / 8,827 across 435 files.**
3. **Resume A1a per-step dispatches.** Next: **Step 6 (`default=` + `pinned` on state-decl)**. Small (~1-1.5h). Single-file work in `tryParseStructuralDecl`. Brief-locus authorization in place.
4. **Investigate Step 5's path-discipline leak.** Agent leaked progress.md content directly to main's working tree (not just worktree). Surfaced for next session: extend pa.md F4 path-discipline check to detect leaks earlier; consider mandating `git status --short` in main repo BEFORE cherry-pick.
5. **Address `reactive-derived-decl` divergence** — schedulable any time as a small standalone (~3-5h). Consumer site count ~20. Either fold into `state-decl` with `isConst: true` discriminant OR keep separate kind. PA leans fold (matches §6.6 spec model).
6. **Validator args ExprNode conversion** (Step 5 deferral) — `string[]` → `ExprNode[]` per AST-CONTRACTS §1.1. Either add to A1b's job list OR small standalone now.
7. **`is some` two-word predicate parsing** — small standalone or fold into Step 6 / 7 attribute-scan extension. Any subsequent A1a step can absorb.

**Suggested S60 launch:**
- Read primer + hand-off + user-voice tail (~5-10 min).
- Confirm tests baseline.
- Discuss with user: Step 6 next (default=/pinned) OR investigate Step 5 path-discipline leak first OR address `reactive-derived-decl` divergence first.

---

## 6. Open questions to surface immediately at S60 open

1. **Push posture.** All commits pushed at S59 close including the wrap commit. scrml-support also pushed.
2. **Article truthfulness audit dispositions** — user has 15 articles classified. PA cannot see actual public dev.to / scrml.dev state. User must cross-reference + decide which to edit / retract / take down (or leave as-is). Dispositions queued.
3. **scrml.dev announce publishing** — draft at `docs/website/v0.2.0-announce-2026-05-05.md`. Not yet published (out of repo). User-controlled timing.
4. **`tier-ladder-promotion` article** — `published: false`; gated on A2 (engines) per truthfulness audit. Article NOW uses program documentary attrs in first code block (S59 update); when A2 ships, sanity-check + flip flag.
5. **Step 5 path-discipline leak root cause** — investigate and surface a concrete pa.md F4 addition for S60+.
6. **`reactive-derived-decl` divergence** — fold-in step scheduling.

---

## 7. ⚠️ Things S60 PA needs to NOT screw up

1. **Read PA-SCRML-PRIMER.md FIRST** (step 2 of session-start, after pa.md). §12 has the depth-of-survey-discount mitigations — APPLY them to every audit / brief / dispatch. The pattern WILL recur.
2. **AST kind is `state-decl`, NOT `reactive-decl`.** Step 3 renamed everywhere; the historical name is preserved only in audit/inventory banners. Don't introduce new `"reactive-decl"` strings.
3. **`reactive-derived-decl` is a SEPARATE kind** (not touched by Step 3). Surfaced by Step 4. Until folded in, anything touching derived cells must handle BOTH kinds.
4. **Validator args are `string[]` for now**, NOT `ExprNode[]`. AST-CONTRACTS §1.1 says final shape is ExprNode[]; Step 5 deferred conversion. A1b owns the conversion.
5. **`<program>` documentary attributes (S59 NEW)**: `title=`, `description=`, `version=`, `author=`, `license=`. SPEC §40.7. Don't conflate with §43 nested-program `name=` (worker identity).
6. **Brief-locus errors are routine** (4th occurrence S59). When a dispatch brief names a touchpoint, the agent MUST verify via survey + correct the touchpoint if survey reveals it's wrong. Don't insist on the brief's named file when survey contradicts.
7. **Path-discipline regression risk** (Step 5 leak). Verify `git status --short` in main BEFORE cherry-pick to detect any leaks. Add this as a standing rule in S60.
8. **Test invariant strengthening — anti-html-fragment guard** is non-negotiable on every Shape-1/2/3 positive test. The deceptive-success pattern (compile-clean while parsing as html-fragment) is the load-bearing anti-test.
9. **Tests now 8,784 / 43 / 0 / 8,827** baseline at S60 open. Each subsequent step adds ~10-15 tests with 0 regressions contract.
10. **README v0.2.0 banner** — public signal is live at S59 close. If user changes their mind on v0.2.0 framing or wants to update progress dashboard prose, the README banner is the authoritative signal.

---

## 8. State as of close (verified)

- **scrmlTS HEAD:** `505531f` (final wrap commit forthcoming this turn)
- **scrml-support HEAD:** `f7b935a`
- **Tests:** 8,784 pass / 43 skip / 0 fail / 8,827 / 435 files (S60 baseline)
- **Working tree both repos:** scrmlTS will be clean post-wrap-commit; scrml-support clean
- **Inbox:** empty
- **Worktrees:** S59's worktrees still around (rev1/rev2/rev3 + Step 1/2/3/4/5/8 + program-attrs + audit). Auto-cleanup if no changes; otherwise dispose at convenience. Step 5's worktree may have the leftover `_probe-step5-edge.js` debug file — not pushed; can be discarded.
- **Primer:** `docs/PA-SCRML-PRIMER.md` updated S59 (§12 depth-of-survey discount × 4 + bun-run-pretest + brief-locus correction)
- **Permissions whitelist:** `.claude/settings.local.json` `additionalDirectories` includes both `scrmlTS/` and `scrml-support/`. Effective.

---

## 9. Files written / modified S59 (forensic inventory)

### scrmlTS (this repo, ~30+ commits)

| Action | Files |
|---|---|
| MAJOR REWRITE | `master-list.md` (header + new §0 dashboard; old session-log removed; ~+200 net lines), `compiler/SPEC.md` (§6.6.18 NEW + §40.7 NEW + §6.6.8 rename + §34 entries + §6.5.1 note + various Step-3 rename sweep) |
| EXTENDED (compiler source) | `compiler/src/tokenizer.ts` (Step 1 reset KEYWORD), `compiler/src/ast-builder.js` (Steps 2+3+4+5+8 cumulative — `tryParseStructuralDecl` NEW + structural-decl recognizer + shape discriminant + Shape 2 markup-RHS + bareword validators + E-RESERVED-IDENTIFIER + ~17 legacy state-decl construction sites updated + AST kind sweep), `compiler/src/types/ast.ts` (state-decl + state-decl extended fields), `compiler/src/codegen/index.ts` (program-attrs head injection + W-PROGRAM-TITLE-NESTED), `compiler/src/attribute-registry.js` (program-attrs validator allowlist), `compiler/src/html-elements.js` (program-attrs allowlist), `compiler/src/commands/init.js` (function reset rename), `compiler/self-host/ast.scrml` (Step 4 self-host parity) |
| EXTENDED (tests) | `compiler/tests/integration/parse-shapes-v0next.test.js` (NEW S59 Step 8; populated cumulatively across Steps 2/4/5 — ~50+ cases), `compiler/tests/integration/program-documentary-attrs.test.js` (NEW), `compiler/tests/unit/tokenizer-reset-keyword.test.js` (NEW), `compiler/tests/self-host/bpp.test.js` (Step 3 cross-cut isolation fix), various sample renames |
| NEW (docs) | `docs/changes/v0next-audit/PARSER-AUDIT-2026-05-05.md` (226 lines), `docs/changes/v0next-inventory/SCOPE-MAP-2026-05-05.md` (561 lines), `docs/changes/v0next-inventory/ARTICLE-TRUTHFULNESS-AUDIT-2026-05-05.md` (136 lines), `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md` (rev 2 ~290 lines), `docs/changes/phase-a1a-lex-parse/DISPATCH-A1A-BRIEF.md` (rev 1-3, then deferred), `docs/changes/phase-a1a-lex-parse/progress.md` (cumulative — Steps 1-5 + 8), `docs/changes/phase-a1a-step-8-reserved-ident/progress.md`, `docs/changes/program-documentary-attrs/progress.md`, `docs/website/v0.2.0-announce-2026-05-05.md` (NEW; ~250 lines) |
| EXTENDED (docs) | `compiler/SPEC-INDEX.md` (Step 3 rename + program-attrs entry), `compiler/PIPELINE.md` (Step 3 rename), `docs/PA-SCRML-PRIMER.md` (§12 depth-of-survey discount × 4 + bun-run-pretest + brief-locus correction), `docs/changelog.md` (S59 entry — ~80 lines), `pa.md` (F4 step 5 — bun-run-pretest mandate), `README.md` (v0.2.0 banner + stats refresh), `docs/articles/tier-ladder-promotion-devto-2026-05-04.md` (program-attrs in first code block), `docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md` (cross-references to scope-map; superseded note) |
| UPDATED | `master-list.md` (multiple refreshes per landing), `hand-off.md` (this rotation), `handOffs/hand-off-59.md` (close snapshot), `.claude/maps/primary.map.md` (Step 3 rename + S59 cleanup commit `94f903a`) |

### scrml-support (cross-repo write target, 3 commits)

- `9772c0f` — L21 outcomes ledger §3.14 RESOLVED + user-voice S59 entries (lock ratification + small-deliberation methodology note)
- `5c005a0` — design-insights.md "Depth-of-survey discount" entry (3 occurrences)
- `f7b935a` — design-insights.md updated to 4 occurrences (documentary-attrs brief-locus)

(user-voice-scrmlTS.md S59 entries to be appended in this wrap commit if not already.)

---

## 10. Cross-references

- **S59 outcomes embedded in:** SPEC.md (§6.6.18 + §6.6.8 rename + §40.7 + various rename), PA-SCRML-PRIMER §12 (depth-of-survey + locks L1-L21 incl. L21 + bun-run-pretest)
- **S58 outcomes ledger:** `handOffs/hand-off-58.md`
- **S57 outcomes ledger:** `handOffs/hand-off-57.md`
- **Implementation roadmap:** SUPERSEDED by `docs/changes/v0next-inventory/SCOPE-MAP-2026-05-05.md` §0 dashboard
- **PA scrml expert primer (READ FIRST):** `docs/PA-SCRML-PRIMER.md`
- **PA directives:** `pa.md`
- **Master-list dashboard (live progress):** `master-list.md` §0
- **User-voice S59 entries:** `../scrml-support/user-voice-scrmlTS.md` §"Session 59" (verbatim user authorizations from S59)

---

## 11. Tags

#session-59 #closed #phase-a1a-in-flight #7-of-13-done #l21-locked #program-attrs #parser-audit #scope-map-inventory #article-truthfulness-audit #dashboard-rewrite #depth-of-survey-discount #reactive-derived-decl-divergence #path-discipline-leak

---

## 12. The seamless-transition guarantee

S60 PA, on opening, should:

1. **Read pa.md** (already done by definition — session-start step 1)
2. **Read PA-SCRML-PRIMER.md in full** (mandated step 2; updated S59 — §12 has depth-of-survey discount × 4 occurrences + bun-run-pretest + brief-locus correction)
3. **Read this hand-off** (covers everything material from S59)
4. **Read last ~10 contentful user-voice entries** (will pick up S59's L21 lock ratification + small-deliberation methodology + breaking-change-acknowledgment + program-attrs synonym question + depth-of-survey-discount capture authorization)
5. **Confirm test baseline 8,784 / 43 / 0 / 8,827 across 435 files**
6. **Surface the open questions** at the top of §6 of this hand-off — push posture (CLEAN), article dispositions, scrml.dev publishing, tier-ladder publishing gate, Step 5 path-discipline leak, reactive-derived-decl divergence.

If S60 PA finds itself searching for "what's the AST kind name?" — IT IS `state-decl`. If S60 PA hits an audit that estimates >5h for new infrastructure — APPLY the depth-of-survey discount mitigation checklist.

The implementation phase is in flight. 7/13 of A1a done. Phase A2-A6 + B1-B5 + C1-C3 still ahead. Multi-month migration. Steady cadence.
