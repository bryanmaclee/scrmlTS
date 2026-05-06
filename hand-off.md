# scrmlTS — Session 63 (CLOSE — B1 LANDED · Stage 0c PLANNED · article-pair drafted · scrml-not-superset concession ratified · live debate QUEUED for S64)

**Date opened:** 2026-05-06
**Date closed:** 2026-05-06 (same calendar day, long session)
**Previous:** `handOffs/hand-off-62.md` (S62 — B1 dispatched in worktree; 3 WIP commits landed before interruption)
**This file:** rotates to `handOffs/hand-off-63.md` at S64 open

**Tests at close:** **8,933 / 44 / 1 / 0 / 8,978 / 440** (unchanged from B1 landing; this session's later work was 100% docs/spec/articles/agents — zero compiler-source touched after B1).

---

## BIG DECISIONS RATIFIED THIS SESSION (load-bearing context — read first)

S63 was a long multi-thread session with five substantive design ratifications. Each is captured throughout this hand-off in detail, but the next-session PA should encounter them at the top so context isn't reconstructed through inference.

### 1. Phase A1b Step B1 (symbol-table) LANDED + PUSHED

Stage 3.06 SYM module at `compiler/src/symbol-table.ts` (~500 LOC). Per-scope state-cell registry. Foundational for B2-B22. Salvaged PA-direct after S62 dispatch was interrupted. Two cycle-guard fixes during salvage (WeakSet visited-set in walker; `Object.defineProperty(..., enumerable:false)` on `_record`/`_scope` annotations to prevent BP/CG infinite-loop on the cycle). +31 pass / +1 file / zero regressions. Final main commit `9d2fa45`.

### 2. Function + component overloading DEPRECATED for v0.2.0 (Stage 0c housekeeping milestone)

User had been quietly suspicious that the state-type-discriminated function-overload mechanism (`emit-overloads.ts`) didn't earn its keep against scrml's existing primitives (`match`, `<engine>`, derived state). Asked claude to walk through the dev-ergonomics for a real centralization scenario. The drafts confirmed the suspicion: each workaround flavor fragmented something different (bodies / call sites / type system). The engine-shaped re-expression collapsed the whole question. **Sliver test (named this session):** if Bryan can't easily invent a case where the feature does something existing primitives can't, the feature is empty enough to act on. Empty.

Component overloading (§17.5 / SPEC-ISSUE-010) collapsed under the same scrutiny — every realistic use reduces to two-different-components, single-component-with-`match`-body, or `match for=state` over an enum.

**Disposition:** HARD removal at v0.2.0 (no soft-deprecation cycle; v0.2.0 is breaking-by-design). Lands as **Stage 0c housekeeping milestone** before A1c-C0, ~3-5h focused, 6 sub-steps (0c.A-F) at `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md §4.-1`. SPEC §17.5 rewritten this session ("Component Overloading" → "Discrimination on type or value — use `match` or `engine`"). SPEC-ISSUE-010 closes without resolution.

**The deprecation IS GATED on the queued live debate (decision 5 below).** If the live debate surfaces a credible retention case, Stage 0c rolls back, SPEC §17.5 reverts, etc.

### 3. scrml is not a JS-superset language — the deeper concession (folded into the deprecation article)

Started as a small acknowledgment in the deprecation article's framing. Bryan made it explicit during article revision: *"It is true that is where it started. but for a long time I tried to keep the easy dev conversion path, despite KNOWING for some time. This is a language. It is its own, and should stand as such."* (Verbatim from S63, appended to user-voice-scrmlTS.md.)

This is a **language-positioning shift**, not just a feature-deprecation rationale. scrml originally aimed at JS-identical-with-slight-superset; for a long time Bryan deliberately preserved the easy-dev-conversion path despite knowing scrml had outgrown that frame. v0.2.0 stops the pretense. The deprecation article carries this concession in its closing as a parallel beat to the smaller (overload-deletion) argument.

**Implications for next-session PA + future strategic work:**
- Article positioning: scrml.dev / dev.to copy can stop framing the language as a JS-bridge or superset.
- v0.2.0 announce can lead with "this is its own language" instead of "JS-better."
- Future articles in the series get this positioning as a baseline assumption, not a framing exercise.
- The "easy-dev-conversion path" claim is not retired forever — adopters from JS still benefit from familiarity at the syntax-keyword level — just not promised as a guarantee.

### 4. Synthesis-from-store as DEFAULT for `debate-curator` + `scrml-deep-dive` agents

Bryan observation mid-session: the debate-curator + deep-dive agents were synthesizing expert positions from documented philosophy ~half the time anyway, even when nominally invoking experts as sub-agents. Plus the S63 deep-dive surfaced its own caveat: the Agent/Task tool wasn't available in its environment, so its expert section reasoned from docs rather than invoking live. The de-facto behavior didn't match the stated mechanism.

**Edits landed at `~/.claude/agents/debate-curator.md` + `~/.claude/agents/scrml-deep-dive.md`:** default mode is now "read agent description + first 1-2 substantive sections from `~/.claude/agents-store/{name}-expert.md`, synthesize position." Output explicitly labels each position **"synthesized from agent description"**. Live dispatch reserved for explicit-escalation-flag (rare; reserved for genuinely close calls or when surface area exceeds what descriptions cover). The `scrml-deep-dive` agent also got its NAVIGATION + Source A paths refreshed (was pointing at frozen `~/projects/scrml8/`; now points at current `~/scrmlMaster/` ecosystem).

**Pa-side context:** the global agent files at `~/.claude/agents/` are NOT git-tracked. Edits saved to disk, available next session. No commit needed for those.

### 5. Live-dispatch debate QUEUED for S64+ (gates article publish + Stage 0c code deletion)

Per Bryan's anti-sycophancy instinct + the deep-dive's honest synthesis caveat: the article asserts "the kinds of language designers who would push back hardest on the deletion" couldn't surface a counter-case. That claim is currently synthesized; the live debate makes it real. **Queued artifact:** `scrml-support/docs/debates/QUEUED-state-type-overload-deletion-2026-05-06.md`. Self-contained brief.

**Panel (6 experts; audit done at S63 close):**
- All 5 already in `~/.claude/agents/`: `simplicity-defender`, `gingerbill-expert`, `haskell-language-pragma-expert`, `roc-expert`, `rust-edition-expert`, `salsa-incremental-compilation-expert`.
- Pro-retain steel-man **forged this session**: `crystal-multi-dispatch-expert` at `~/.claude/agents/crystal-multi-dispatch-expert.md` (865 lines). Argues for argument-type-discriminated method dispatch as a designed-in primitive from Crystal's lineage. Agent-registry rebuilt to reflect (44 active agents now).

**Panel is FULLY READY for S64 to fire.** No further forging or staging needed.

**Mode:** explicit live-dispatch escalation flag (overrides the post-S63 debate-curator default of synthesis-from-store).

**Anti-sycophancy guard built into the brief:** debate-judge is told the convener has a prior conclusion; the debate's job is to find the strongest case AGAINST it.

**Outcome → action gating table is in the brief.** TL;DR:
- Confirms deprecate-hard → article publishes, Stage 0c executes, planning stays
- Soft-deprecate finding → article rewrites, Stage 0c becomes W-DEPRECATED warning cycle, SPEC §17.5 + audits revise
- Any credible retention case → article shelves/rewrites, Stage 0c cancels, SPEC §17.5 reverts to retention shape

### 6. Article companion-pair drafted (Bryan-narrated, both `published: false`, in scrmlTS/docs/articles/)

Two articles arrived as a deliberate companion-pair after the sidequest:

- **NEW: `why-scrml-has-to-deprecate-function-and-component-overloading-devto-2026-05-06.md`** — Bryan-narrated. ~1500 prose words + ~120 lines of scrml code blocks (three drafts of JS-shaped scrml followed by the engine-shaped re-expression). Frame: slightly facetious announcement. Carries both the small argument (these features die because match/engine cover them) AND the big concession (scrml is not a JS-superset; the bridge I had insisted on building was already in the language).
- **EDITED COMPANION: `tier-ladder-promotion-devto-2026-05-04.md`** — byline normalized to `by Bryan MacLee`, opening hook added pointing forward to the deprecation companion, closing trailer refreshed.

The pair tells one story: the ladder (`if=` → `<match>` → `<engine>`) is the canonical path; the overload mechanism was a parallel path that didn't earn its keep against the ladder. Both `published: false` — Bryan controls publishing timing.

**Article-precedent set:** `scrml-voice-author` agent file updated (`~/.claude/agents/scrml-voice-author.md`) so its default output target is now `scrmlTS/docs/articles/<slug>-devto-<date>.md`, NOT the prior `scrml-support/voice/article-drafts/`. The `published: false` frontmatter flag is the publication gate, not the file location.

### 7. Verbatim conversation capture as a precedent

User-mandated: design conversations that crystallize a stance get full-fidelity capture, not just summary. **Established this session at `scrml-support/docs/function-overloading-sliver-2026-05-06.md`** (the verbatim transcript of the function-overloading sidequest from "small side-quest. how is function overloading done today in scrml" through to "BOOM!"). Set this as the standing pattern for future stance-crystallizing sessions.

---

## Open questions to surface immediately at S64 open

1. **B2 dispatch readiness.** B1 public API surface is final. B2 (E-NAME-COLLIDES-STATE) consumes `lookupStateCell`. Per A1b SCOPE-AND-DECOMPOSITION §4.2, B2's brief should reference B1's API directly. Estimate per A1b: 4-6h focused.

2. **Live debate fire timing.** The queued debate brief is ready. Bryan needs to authorize: (a) panel composition + challenge wording ratified as-is, OR (b) revisions before fire. Pre-debate work (forging crystal-multi-dispatch-expert) is DONE this session; nothing else blocks fire.

3. **Article publish gating.** Both articles in `scrmlTS/docs/articles/` are `published: false`. Bryan controls publishing. The deprecation article specifically should NOT publish until the live debate confirms the deletion (the article asserts breadth of investigation that the live debate makes real). Tier-ladder is independent of the debate outcome and could publish independently.

4. **§S11D.5 .todo promotion.** Test added in S61 Step 11.0d-finisher under `compiler/tests/integration/parse-shapes-v0next.test.js` § S11D.5. Should flip to passing in B2 or as a standalone sweep. Verify B1 actually handles the case at TAB-output time (likely yes per the absorption note).

5. **scrmlMaster PA `pa.md` deletion.** Master inbox message dropped at session-open: `/home/bryan-maclee/scrmlMaster/handOffs/incoming/2026-05-06-1015-scrmlTS-to-master-pa-md-deletion-surfaced.md`. Master-PA should restore its own pa.md before the next cross-repo cycle.

6. **Carry-forward S62 unresolved set:**
   - Article truthfulness audit dispositions (15 articles).
   - scrml.dev v0.2.0 announce publishing (could refresh now to mention B1 + Stage 0c + the scrml-not-superset concession).
   - 6 KEEP-RECENT-LANDED dirs eligible for aggressive deref (PA recommended hold until S65).
   - Maps refresh root cause (agent Write-denied issue from S61) — investigate before next maps dispatch.

7. **Tier-ladder companion-edit em-dashes.** The deprecation article + tweet are at zero em-dashes. Tier-ladder still has 13 em-dashes — all in Bryan's pre-existing prose. Decision deferred this session: leave them as Bryan's deliberate style, OR clean for companion-pair tonal consistency. **No action required; flagging for awareness.**

---

## Things S64 PA needs to NOT screw up

(Augments S62's standing list 1-21. New S63 additions:)

22. **B1 `_record`/`_scope` annotations are NON-ENUMERABLE.** Read via `getScopeForNode(node)` or direct property access. NEVER assume `for...in` / `Object.keys` will see them.
23. **B1 walker cycle-guard is load-bearing.** WeakSet visited-set threaded through `walk` + `registerStateDecl`. Don't remove.
24. **SYM is Stage 3.06 in `api.js`** between NR (3.05) and CE (3.2). `tabResultsForNR` is the input source.
25. **`ScopeKind = "file" | "function" | "engine" | "component" | "compound"`** — full set declared; B1 walker fills `file` / `function` / `compound` only. `engine` and `component` are reserved for B14+/B17+.
26. **§S11D.5 `.todo` test is now actually handled by B1** — promote to passing in B2 or standalone sweep.
27. **Stage 0c is GATED on the queued live debate.** Don't execute Stage 0c.A-F until the debate confirms or surfaces no counter-case. The planning amendments (SPEC §17.5, A1c plan §4.-1, audit cross-refs) are already landed AS the current best understanding but are subject to revision.
28. **Article publish gates on the queued debate** for the deprecation article specifically. Tier-ladder is independent.
29. **`debate-curator` + `scrml-deep-dive` defaults shifted** (S63 mid-session). DEFAULT is now synthesis-from-store. Live dispatch is escalation-only. Output labels each position. The QUEUED debate brief explicitly invokes the live-dispatch escalation flag — do NOT silently fall back to synthesis if the runtime denies sub-agent dispatch; halt and surface to Bryan.
30. **scrml-not-superset concession is now ratified positioning.** Future articles, scrml.dev copy, v0.2.0 announce should reflect this. The "easy-dev-conversion path" framing is retired as a promise (still useful as an adoption-aid description).
31. **Article default-output dir convention shifted** (S63 mid-session). `scrml-voice-author` agent now defaults to `scrmlTS/docs/articles/<slug>-devto-<date>.md`. The earlier `scrml-support/articles/` was a one-off and is now empty (the misplaced article was moved to scrmlTS).
32. **Verbatim-capture precedent set.** Stance-crystallizing conversations get full-fidelity preservation at `scrml-support/docs/<topic>-<date>.md`. Don't summarize.
33. **Anti-sycophancy posture is durable.** When Bryan brings up a feature with a stated suspicion, default behavior is "show the work, not the conclusion." Don't agree fast; demonstrate. The radical-doubt deep-dive frame is the formal-process version of this.
34. **scrmlMaster PA `pa.md` was deleted (S62→S63 anomaly).** Surface to master-PA at S64 open if not yet resolved.

---

## State as of S63 close (verified at wrap)

| Field | Value |
|---|---|
| scrmlTS HEAD (pre-wrap-commit) | `9d2fa45` (B1 final landing) |
| scrmlTS HEAD (post-wrap-commit) | (assigned at commit) |
| scrmlTS origin sync | clean post-push |
| scrml-support HEAD (pre-wrap-commit) | `269d401` |
| scrml-support HEAD (post-wrap-commit) | (assigned at commit) |
| scrml-support origin sync | clean post-push |
| Tests | **8,933 / 44 / 1 / 0 / 8,978 / 440** (full suite, browser included) |
| Working tree (both repos) | clean post-wrap |
| Inbox | empty |
| Worktrees | B1 worktree intact at `agent-ac9404e6ed07fe773` (~85 carry-forward; not S63's concern) |
| Permissions whitelist | unchanged |
| `~/.claude/agents/` (global, not git-tracked) | 4 files edited this session: `debate-curator.md`, `scrml-deep-dive.md`, `scrml-voice-author.md`, NEW `crystal-multi-dispatch-expert.md` (865 lines, forged for queued debate) |
| `~/.claude/agent-registry.md` | rebuilt this session (44 active agents) |

### File-modification inventory (this session — for cherry-pick / forensic review)

**scrmlTS (modified):**
- `compiler/SPEC.md` — §17.5 rewrite (deprecation status block)
- `compiler/src/codegen/README.md` — `emit-overloads.ts` row annotated DEPRECATED
- `docs/articles/tier-ladder-promotion-devto-2026-05-04.md` — companion edits (byline, opening hook, closing trailer, em-dash cleanup in MY additions only)
- `docs/changelog.md` — S63 entry (Stage 0c + sidequest + article + deep-dive + deprecation)
- `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md` — Stage 0c §4.-1 inserted (6 sub-steps 0c.A-F)
- `hand-off.md` — this file (comprehensive close ledger)
- `master-list.md` — Stage 0c noted, A1 row updated

**scrmlTS (new files):**
- `docs/articles/why-scrml-has-to-deprecate-function-and-component-overloading-devto-2026-05-06.md` — new article, `published: false`
- `docs/articles/teej_baiting_tweet.md` — cleaned up (was previously uncommitted draft, now committed); typos fixed, em-dashes removed; voice preserved

**scrml-support (modified):**
- `docs/deep-dives/language-status-audit-2026-04-29.md` — 4 deprecation closures w/ cross-refs
- `docs/deep-dives/tutorial-freshness-audit-2026-04-29.md` — 3 deprecation closures w/ cross-refs
- `user-voice-scrmlTS.md` — S63 entries appended (load-bearing user quotes from sidequest)

**scrml-support (new files):**
- `docs/function-overloading-sliver-2026-05-06.md` — full verbatim conversation transcript
- `docs/deep-dives/state-type-overload-deprecation-2026-05-06.md` — radical-doubt deep-dive output (~57KB, 5-phase)
- `docs/debates/QUEUED-state-type-overload-deletion-2026-05-06.md` — queued live-dispatch debate brief (panel ready, fires at S64+)

**Global (not git-tracked):**
- `~/.claude/agents/debate-curator.md` — synthesis-from-store default added; live-dispatch escalation flag
- `~/.claude/agents/scrml-deep-dive.md` — same default shift; NAVIGATION + Source A paths refreshed (scrml8 → scrmlMaster ecosystem)
- `~/.claude/agents/scrml-voice-author.md` — output target shifted to `scrmlTS/docs/articles/`
- `~/.claude/agents/crystal-multi-dispatch-expert.md` — NEW (forged this session for queued debate)
- `~/.claude/agent-registry.md` — rebuilt (44 active, +1 newly forged)

**Master inbox (sent earlier in session):**
- `/home/bryan-maclee/scrmlMaster/handOffs/incoming/2026-05-06-1015-scrmlTS-to-master-pa-md-deletion-surfaced.md` — flags scrmlMaster pa.md deletion as root cause of S63-open hand-off rotation anomaly; requests pa.md restoration + a guard against chain-reading another repo's pa.md

---

## Cross-references

- **S62 close ledger (this rotation):** `handOffs/hand-off-62.md`
- **S61 close ledger:** `handOffs/hand-off-61.md`
- **PA scrml expert primer (READ FIRST every session):** `docs/PA-SCRML-PRIMER.md`
- **PA directives:** `pa.md`
- **Master-list dashboard (live progress):** `master-list.md` §0
- **A1b RATIFIED plan:** `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md`
- **A1c RATIFIED plan + Stage 0c amendment:** `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md` (§4.-1 = Stage 0c housekeeping)
- **A1a final state:** `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md`
- **B1 BRIEF + progress (with salvage notes):** `docs/changes/phase-a1b-step-b1-symbol-table-extension/`
- **NEW deprecation article:** `docs/articles/why-scrml-has-to-deprecate-function-and-component-overloading-devto-2026-05-06.md`
- **Companion (tier-ladder):** `docs/articles/tier-ladder-promotion-devto-2026-05-04.md`
- **Verbatim conversation source:** `../scrml-support/docs/function-overloading-sliver-2026-05-06.md`
- **Radical-doubt deep dive:** `../scrml-support/docs/deep-dives/state-type-overload-deprecation-2026-05-06.md`
- **Queued live-dispatch debate brief (panel ready):** `../scrml-support/docs/debates/QUEUED-state-type-overload-deletion-2026-05-06.md`

---

## Tags

#session-63 #close #b1-landed #stage-0c-planned #overload-deprecation #scrml-not-superset #js-bridge-concession #debate-curator-synthesis-default #scrml-deep-dive-paths-refreshed #queued-live-debate #article-companion-pair #verbatim-capture-precedent #anti-sycophancy-posture-durable #crystal-multi-dispatch-expert-forged #scrml-voice-author-output-target-shifted
