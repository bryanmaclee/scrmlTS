# scrmlTS — Session 160 (OPEN)

**Date:** 2026-06-03
**Previous:** `handOffs/hand-off-164.md` (= S159 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-165.md` at next OPEN.
**Profile:** opened **A (FULL)** ("read pa.md and start session"; no signal → default A).

---

## S160 IN FLIGHT — S154 (b)/(c) build arc (autonomous + push authorized)

**Direction (S160):** user picked "finish S154 (b)/(c)". All micro-rulings collected (see OPEN-QUESTIONS #1 below — FULLY RULED). Process: **draft → reviewer gate → land**; autonomy: **full autonomous arc + push** (commits+push authorized for this arc; surface only on real failure).

**Progress (crash-recovery state):**
- DRAFTS WRITTEN: `../scrml-support/archive/spec-drafts/no-rhs-typed-decl-defaults-S160-DRAFT.md` (c) + `colon-shorthand-inside-opener-S160-DRAFT.md` (b).
- 3 background agents running: maps refresh (`a440fa5b53ef9c100`) + (c) reviewer (`a9d79d2b7abd27211`) + (b) reviewer (`a9975532b038ad6b5`, general-purpose-as-reviewer — `scrml-language-design-reviewer` NOT loadable this session, substitution flagged to user). Reviewers write `*-REVIEW.md` + return verdict.
- NEXT: process reviews → apply rev-2 changes → land SPEC (c first, then b) → dispatch compiler impl (isolation:worktree, full F4/S99/S136/S138/S147 discipline) → R26/test verify → land → push → wrap.
- (c) is contained (§6.2/§14.12/§34/ast-builder/type-system). (b) is grammar reconciliation + 43 SPEC-example migration + after-`>` deprecation W-lint (ZERO adopter corpus migration). Build sequence: c then b.

---

## S160 OPEN — caught up; awaiting direction

Full Profile-A session-start complete: pa.md (full) + PRIMER (full) + SPEC-INDEX (full) + master-list §0 + S159 hand-off + user-voice tail (S152/S154/S155/S156/S158). Git sync clean. Inbox empty.

### Sync / repo state at OPEN
- **scrmlTS:** clean, HEAD `f9d4b0f1`, `origin/main` **0/0** (pushed at S159 wrap).
- **scrml-support:** clean, **0/0**. No writes pending.
- **Inbox:** EMPTY. **Worktrees:** main only.
- **Version:** on top of **v0.7.0** (pkg.json unchanged since S143 cut).
- **Hooks:** config B (pre-commit + post-commit + pre-push). S100 path-discipline hook active.
- **Maps:** `97fe2199` (commit `3621d6a1`) — **3 commits stale** (Bug 73 `588b9399` emit-each/emit-lift; S154(a) `6b62ffb7` ast-builder/block-splitter/type-system/emit-html; spec `1fb9823f`). **REFRESH before next compiler-source dispatch.**

### known-gaps §0 at OPEN
- **HIGH 0. MED 10.** No new gaps. C6 + C4 surfaced likely-stale-resolved (see S159 carry).

---

## OPEN QUESTIONS TO SURFACE (carried from S159 CLOSE)

1. **S154 (b)/(c) — FULLY RULED S160 (all micro-Qs closed via AskUserQuestion); BUILD PENDING.**
   - **(b) `:` inside-opener canonical EVERYWHERE** (HTML · `<each>` · match arms · engine state-children — user re-confirmed full Pillar-5 uniformity S160 *with the engine-arm readability cost visible*; previewed after-`>` vs inside-opener Mario). after-`>` form → DEPRECATED (W-lint, match-`:>` precedent); migrate the **43 after-`>` SPEC worked-example lines** (engine + match) to inside-opener — **adopter `.scrml` corpus has ZERO after-`>` uses**, so migration is SPEC-examples-only, zero adopter impact. (b-i) after-`:` whitespace **NOT required** — `:@thing` legal (SPEC §4.14 only mandates BEFORE-`:` ws, line 979/983; impl-verify the parser doesn't demand after-`:` ws). (b-ii) `/>` stays **E-CLOSER-001** (already SPEC, line 979/982) — canonical tersest = `<span :@thing>` (no closer; `/>` is redundant + contradictory). Build: §4.14/§51.0.I/§18.0.1 reconcile to inside-opener + §51.0.B Mario example + 43 examples migrate + §34 +1 W-lint row for after-`>` deprecation + parser flip (engine state-child + match-arm accept inside-opener; angleDepth handles embedded-markup body `>`) + emit deprecation lint.
   - **(c) no-RHS typed-decl → canonical-empty-else-`not`** (supersedes E-DECL-NEEDS-INITIALIZER). Canonical empties: `int`/`number`/`float`→`0`, `string`→`""`, `bool`→`false`, `T[]`→`[]` (Shape 4 shipped S152), `map`/`{}`-object→`{}`. struct+enum (no canonical empty) → **`not`** (NO recursive zero-fill, NO auto-first-variant). `not`-init **engages §14.12 lifecycle** → `(not to T)`-shaped (starts absent; E-TYPE-001 on pre-assignment read; clears after first write). **RETIRE** E-DECL-NEEDS-INITIALIZER (§34 row + §6.2 error text — sole trigger now always resolves; ~1-session lifespan, zero corpus uses, clean cut). Build: §6.2 Shape 4 generalize + §14.12 cross-ref + §34 retire + ast-builder/type-system (synthesize canonical-empty defaults; `not`-init + lifecycle for no-empty types; stop firing E-DECL-NEEDS-INITIALIZER).
2. **S154 #14 (event-payload-transition) + (d)-A (enum-subset) — SPEC LANDED S154 + IMPL COMPLETE S155/S156.** [S160 correction — DONE, not pending; an S160-OPEN stale-read framed them as unbuilt.] #14: parser/typer/codegen 3-batch `6667b664`/`c6f323f0`/`a9ce4c3a`, wrapped `118db71d` (S155). (d)-A: 4-batch `bfc50545`/`7a3c018f`/`0097d5b0`/`71be8f5f`, wrapped `57edc794` (S156). PRIMER §13.7 `dA-b1` row is STALE (shows batches 2/3 deferred; they landed S156 — fix at next primer pass). **Deferred SIBLING tails (bigger, design-gated, NOT part of ratified #14/(d)-A scope):** per-instance engines `<engine per=@expr>` (needs DD) · server-boundary CPS (Ext 3 conditional-tier unbuilt) · enum-subset engine `for=` (§53.15.7) · return-type subset enforcement (pre-existing parser gap).
3. **Bug 64 sibling-gap #1 (function-body reactive-write-dropped)** — NOT-REPRODUCED S158; re-trigger only if a narrower shape surfaces.
4. **DD candidate (S155, parked, unanswered S155-S159):** self-tree-shaking compiler build-story (§58+§47+self-host). Confirm-pending: is "the whole dependency code issue" = `bun link` full-toolchain friction?
5. **scrml-site notice sent S159** (Bug 73 handler-staleness + S154(a) `:`-shorthand-HTML render — both change codegen output shape). Watch `handOffs/incoming/` for reply.
6. **Self-demo scrml.dev website (S148, STRATEGIC):** F1 (pre-computed-static vs in-browser-live) + F2 (SourceMap-v3 vs custom-bidirectional) debate is carry-forward; 2 experts forged (`source-map-provenance-expert` + `in-browser-compilation-expert`). NB website now lives in sibling repo `scrml-site` (extracted S154, own PA) — scrmlTS is purely the language.

## CARRY-FORWARD (backlog)
- **Bug backlog (MED 10):** Bug 1 Tailwind residuals · V-kill READ-side · MCP V0 deferrals · Generator policy (design-call) · L19 multi-statement-handler (design-call) · A5 freeze-extension (adoption-watch) · R28-1d (NOT-REPRODUCED S147) · **R28-8 (design-call: extend §14.10 vs canon-fix §4.8)** · C6 (likely stale-resolved) · Bug 14 MCP-partial.
- **C6 + C4 currency:** §R27 C4 row shows OPEN but C4 RESOLVED S151 as R28-5 (STALE row — fix at next currency pass). C6 (`bind:value=@synth.field` E-SCOPE-001 in engine state-child): obvious shapes compile CLEAN at HEAD — likely stale-resolved; formal NOT-REPRODUCED needs dev-4's gauntlet-r27 formFor source.
- **#2f native-parser each/match structural promotion** (M5-swap precondition; witnessed twice S153).
- **Native parser charter B** (M2.4 + MK2 next; multi-quarter arc).
- S154 carry: body-split/CPS debt (Ext 3 conditional-tier + Ext 2 loop-aware unbuilt) · #5 lint FPs (W-DEAD-FUNCTION / I-FN-PROMOTABLE) · #6 cross-file client imports · #7 MCP flip · per= per-instance engines (needs DD) · 6NZ caps stray.

## pa.md directives in force
- Rules R1–R5. `---` answer-delimiter (S152). Profile A/B (S156). `full wrap` / 88% floor (S139). Working-style: largest ratified target, autonomous, park-on-input, surface only on real failure / needed design ruling.
- Dispatch discipline: S88 explicit isolation · F4 startup-verify · S112 merge-startup · S99/S126 Bash-edit + no-`cd` · S136 BRIEF.md archival · S138 R26/dual-verify (both directions) · S147 branch-leak coherence · S67 file-delta. `--no-verify` forbidden (commit + push gates).
- **CWD-drift-POST-dispatch (S159 lesson, memory `feedback_cwd_reset_post_dispatch`):** after an `isolation:worktree` dispatch the PA shell CWD can drift INTO the worktree → S100 hook rejects legit main-side writes. Mitigation: `cd /home/bryan-maclee/scrmlMaster/scrmlTS && pwd` before ANY main-side Write/Edit after a dispatch; Bash-heredoc workaround if it fires.
- **Phase-0-survey-STOP gate** (S158 pattern): agent surveys + STOPs before the heavy edit; PA reviews + greenlights/escalates. Used cleanly on Bug 73 + S154(a).
- **`bun run test` flakes 2 parity-timing tests** (07-admin-dashboard, 27-type-derived-table — pre-existing, pass 1005/0 in isolation). RE-RUN on pre-push flake (do not `--no-verify`). Reliable gate: `bun test compiler/tests/`.
- Canonical dev-agent `scrml-js-codegen-engineer`. SendMessage agent-resume NOT available → continue Phase-0-STOPped agents via FRESH dispatch carrying the analysis.

## Tags
#session-160 #OPEN #profile-a-full-start #caught-up #awaiting-direction #s154-bc-pending-rulings #s154-14-da-spec-landed-impl-pending #maps-3-stale
