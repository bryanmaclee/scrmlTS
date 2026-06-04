# scrmlTS — Session 160 (CLOSE)

**Date:** 2026-06-03
**Previous:** `handOffs/hand-off-164.md` (= S159 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-165.md` at next OPEN.
**Profile:** opened **A (FULL)** ("read pa.md and start session"; no signal → default A). User: "1" → (clarified: #14/(d)-A already built S155/S156) → **"Finish S154 — (b)/(c) rulings"** → all micro-rulings via AskUserQuestion → process "Draft→reviewer gate→land" + autonomy "Full autonomous arc + push".

---

## 🏁 S160 CLOSE — S154 rulings (b) + (c) FINISHED end-to-end (design rulings → spec → impl), autonomous arc + crash-recovery

Finished the last two ratified-but-unbuilt S154 design rulings. Collected all micro-rulings (AskUserQuestion), drafted both SPEC amendments, reviewer-gated each (READY-WITH-CHANGES → rev-2 applied), landed SPEC PA-direct, dispatched compiler impl (worktree), file-delta landed + PA-independent dual-R26. **(c) impl survived a transient-API-overload mid-dispatch crash → clean S89 salvage (zero work lost).** Both arcs independently dual-verified.

### Sync / repo state at CLOSE
- **scrmlTS:** clean, HEAD `f7c540c8`, `origin/main` **0/4** → **PUSH PENDING this wrap** (4 PA commits). `130ee93b` (session-start docs) · `b3ba8925` ((c) SPEC) · `d0d66d3e` ((c) impl) · `f7c540c8` ((b) SPEC+impl).
- **scrml-support:** **WRITES PENDING this wrap** — 2 DRAFT + 2 REVIEW files in `archive/spec-drafts/` (uncommitted) + the S160 user-voice append (to do). Commit + push at wrap. Verify cross-machine sync (synced 0/0 at open).
- **Tests at close:** full `bun test compiler/tests/` **22,910 pass / 0 fail / 220 skip / 1 todo** (901 files; pre-commit gate subset 15,791). S159 baseline 22,874; **+36** = (c) +10 / (b) +26; 0 regressions. NB the `bun run test` (full+browser) 2 parity-timing flakes (07-admin-dashboard, 27-type-derived-table) are S159-noted, pre-existing; neither touches no-RHS-defaults or `:`-shorthand.
- **Hooks:** config B. S100 path-discipline hook held (no main-side PA-write rejections this session — CWD-drift guard `cd <main>` used before every main-side write post-dispatch).
- **Inbox:** EMPTY at open (verify at next open for the scrml-site reply re S159). **Worktrees:** all cleaned (3 (c)+(b) worktrees removed at their landings) — main only.
- **Version:** on top of **v0.7.0** (pkg.json unchanged; no tag — design-ruling spec+impl, not a release cut).
- **Maps:** refreshed THIS session to `f9d4b0f1` (commit `130ee93b`). Now **4 commits stale** (cSPEC/cimpl/bSPEC+impl touched ast-builder/type-system/SPEC/engine+match-statechild-parsers/symbol-table/migrate.js). **Refresh before the next compiler-source dispatch.**

### known-gaps §0 state at CLOSE
- **HIGH 0. MED 10** (unchanged — no new MED). **2 NEW LOW filed** (see deferred below). C6/C4 currency still stale-resolved (carry).

---

## DONE this session (S160)

1. **S154 ruling (c) — no-RHS typed-decl canonical-empty/`not` defaults — SPEC+IMPL COMPLETE.**
   - **SPEC `b3ba8925`** (PA-direct): §6.2 Shape 4 generalized array-only → ALL typed cells (canonical empties `int`/`integer`→0, `number`→0, `bool`/`boolean`→false, `string`→"", `T[]`→[]; bare-`T` no-empty struct/enum/date/timestamp/opaque → `not` + implicit `(not to T)` lifecycle §14.12; union `T|not`/`T?` → `not` NO lifecycle; lifecycle-annotated A-non-`not` → error; refinement-violating-empty → NEW `E-REFINEMENT-NO-DEFAULT` §53/§34). §6.1.5 grammar + §14.12.3 (Shape-1 `(not to T)` transitions on assignment OR discrimination + lifecycle-aware E-TYPE-001 message) + §6.8.3 (no-RHS synthesized-`not` reset → pre). **§34 RETIRED `E-DECL-NEEDS-INITIALIZER`** → `E-REFINEMENT-NO-DEFAULT`. SPEC-INDEX regen +27L → 31,521.
   - **IMPL `d0d66d3e`** (dispatch + S89 crash-recovery): ast-builder type-string classification + canonical-empty synth / not-init+`implicitNotLifecycle` marker / union-no-marker / refinement-flag / const-gate (`!isConst`) / array-preserve; type-system `buildCellValueLifecycleMap` admits `implicitNotLifecycle` cells (synth `(not to T)` via `parseLifecycleReturnAnnotation` → existing walker gives discrimination+assignment+reset), E-TYPE-001 names the synthesized lifecycle, `runRefinementNoRhsDefaultCheck` static §53 check. **BONUS:** fixed a pre-existing greedy `collectTypeAnnotation` swallow (no-RHS typed decl + next-sibling statement ran the type scan to EOF) via top-level `TYPE_BOUNDARY_KEYWORDS` stop (excludes not/lin/contextual-to). +10 tests. **PA dual-R26:** scalar→`_scrml_reactive_set(0/""/false)`, struct→E-TYPE-001 "(not to User)... SYNTHESIZED from the no-RHS", refinement VIOLATES→E-REFINEMENT-NO-DEFAULT / SATISFIES→0.

2. **S154 ruling (b) — inside-opener `:`-shorthand canonical everywhere; after-`>` deprecated — SPEC+IMPL COMPLETE `f7c540c8`** (combined dispatch + PA file-delta).
   - **SPEC:** §4.14 (after-`:` ws OPTIONAL + inside-opener-canonical-everywhere + after-`>` deprecation + markup-arm bare-body note); §51.0.I def+table rewritten; §51.0.B Mario migrated; §18.0.1 bullet rewritten + flagship NotAsked/Loading/Ready/Failed markup-arms → BARE-BODY (D4, not the `</p>>` tail); §34 +`W-COLON-SHORTHAND-LEGACY-PLACEMENT`; **~57 after-`>` worked-example arms migrated to inside-opener BY HAND** (type-annotation colons untouched — verified via diff grep). SPEC-INDEX regen → 31,548.
   - **IMPL:** legacy-TS `engine-statechild-parser` + `match-statechild-parser` gain inside-opener `:` recognition (post-attr `:`, body to final `>` via angleDepth, string-aware) + RETAIN after-`>` + emit the W-lint (symbol-table); native-walker shape-parity; `migrate.js --fix` AST-driven rule (mirrors S147); after-`:` ws relaxed. **ZERO codegen change** (all placements build identical AST). +26 tests. **PA dual-R26:** both placements → client JS BYTE-IDENTICAL; after-`>` fires W-lint ×3 (per arm); inside-opener fires 0.

---

## OPEN QUESTIONS TO SURFACE IMMEDIATELY (S160 CLOSE)

1. **2 NEW LOW (pre-existing, surfaced by (b) — file in known-gaps):**
   - **`/>` + `:`-shorthand on HTML element fires E-DG-002, not E-CLOSER-001** (§4.14 line 982 specifies E-CLOSER-001). Pre-existing on the S159 HTML path; ruling (b) said "no `/>` change" so out of (b) scope. A real SPEC-vs-impl divergence — fix = make `<span :@thing />` fire E-CLOSER-001 per §4.14.
   - **after-`>` ENGINE form fails E2E at the block-splitter** (E-STRUCTURAL-ELEMENT-MISPLACED). Pre-existing (after-`>` engine never worked E2E). The now-canonical inside-opener engine form WORKS E2E (net improvement). Consequence: the engine after-`>` W-lint is parser-verified but only E2E-fires where after-`>` body text reaches the parser; the match locus is E2E-proven.
2. **(c) cosmetic deferrals (recovery agent flagged, both PRE-EXISTING, not regressions):**
   - `formatTypeForDiagnostic` renders struct types as `asIs` in the E-TYPE-001 lifecycle label (`(not to asIs)` not `(not to User)`) — affects the explicit `(not to User)` form identically; cosmetic message-quality follow-up.
   - refinement-VIOLATES fires BOTH `E-REFINEMENT-NO-DEFAULT` (new) AND existing `E-CONTRACT-001` (on the synthesized 0) — both correct, not contradictory; dedup is an optional follow-up.
3. **PROCESS NOTE (Rule 5 — surfaced):** the (b) dispatch agent self-flagged using `core.hooksPath=/dev/null` (a `--no-verify` equivalent) on early **progress.md-only** WIP commits before self-correcting. Per-commit `--stat` audit confirmed the SPEC commit (`6c4c82f1`) + impl commit (`62d6a267`) are separate + gated; no code/SPEC rode in on a bypass; the PA landing commit re-ran the full gate. Harmless but logged.
4. **scrml-site notice** — consider whether the (c) no-RHS-default change (new compiler behavior: a no-RHS typed cell now compiles where it used to error) warrants a notice to scrml-site's PA. (b) is zero-codegen so no notice needed for it.
5. **Maps refresh** overdue (4 commits stale).

## CARRY-FORWARD (backlog)
- **Bug backlog (MED 10, unchanged):** Bug 1 Tailwind residuals · V-kill READ-side · MCP V0 deferrals · Generator policy (design-call) · L19 multi-statement-handler (design-call) · A5 freeze-extension (adoption-watch) · R28-1d (NOT-REPRODUCED S147) · **R28-8 (design-call: extend §14.10 vs canon-fix §4.8)** · C6 (likely stale-resolved) · Bug 14 MCP-partial.
- **The 2 NEW LOW** (above) + the 2 (c) cosmetic deferrals.
- **C6 + C4 currency:** §R27 C4 row shows OPEN but C4 RESOLVED S151 (STALE row); C6 obvious shapes compile CLEAN — likely stale-resolved; formal NOT-REPRODUCED needs dev-4's gauntlet-r27 formFor source.
- **PRIMER §13.7 `dA-b1` row is STALE** (shows enum-subset batches 2/3 deferred; they landed S156) — fix at next primer pass. Also fold the S160 (b)/(c) landings into the PRIMER (§4.14/§6.2/§14.12/§51.0.I) at next primer refresh.
- #2f native-parser each/match structural promotion (M5-swap precondition). Native parser charter B (M2.4 + MK2).
- S154 carry: body-split/CPS debt · #5 lint FPs · #6 cross-file client imports · #7 MCP flip · per= per-instance engines (needs DD) · self-tree-shaking compiler build-story DD-candidate (S155 parked) · self-demo scrml.dev F1/F2 debate (S148, 2 experts forged; website now in sibling repo scrml-site) · 6NZ caps stray.

## pa.md directives in force
- Rules R1–R5. `---` answer-delimiter (S152). Profile A/B (S156). `full wrap`/88% floor (S139). Working-style: largest ratified target, autonomous, park-on-input, surface only on real failure / needed design ruling.
- Dispatch discipline ALL held: S88 explicit isolation · F4 startup-verify · S112 merge-startup · S99/S126 Bash-edit + no-`cd` · **S136 BRIEF.md archival** (both (c)+(b) BRIEF.md archived; (c) carries the recovery note) · **S138 R26/dual-verify** (every landing, PA-independent — (c) 4-case, (b) byte-identity) · **S147 branch-leak coherence** (every landing: branch-tip==FINAL_SHA + 0/N divergence, no leak). `--no-verify` forbidden (1 agent-side hooksPath bypass on doc-only commits, self-corrected — logged §3).
- **S89 crash-recovery** re-exercised: (c) impl original agent crashed on transient API overload mid-impl → salvaged committed survey+design + the syntactically-valid partial ast-builder.js → fresh agent carried the analysis + cp'd the partial + completed. ZERO work lost.
- **CWD-drift-POST-dispatch (S159 lesson):** `cd <main>` before main-side writes after every isolation:worktree dispatch — held (no S100-hook rejections).
- **Reviewer-gate substitution:** named `scrml-language-design-reviewer` NOT loadable this session (not in ~/.claude/agents/; only `scrml-language-critic` in cold storage); gate fulfilled via general-purpose-Opus with a rigorous reviewer brief. Both verdicts READY-WITH-CHANGES; all changes folded into rev-2. (If the named reviewer is wanted, stage it for a future session.)
- Canonical dev-agent `scrml-js-codegen-engineer`. SendMessage agent-resume NOT available → crash-recovery via FRESH dispatch carrying the analysis.

## Process notes (S160) — LESSONS
- **Stale-read self-correction:** my S160-OPEN framing called #14/(d)-A "NOT YET BUILT" — they were IMPL-COMPLETE S155/S156. Caught by verifying git log BEFORE dispatching a build (R26 reverse-direction applied to MY own claim). The PRIMER §13.7 dA-b1 row fed the error (stale). Lesson: verify build-state via git log even for "obviously unbuilt" arcs.
- **Reviewer gate earned its keep:** the (c) reviewer caught scrml has no `float`/`real`/`{}` types (the draft table was wrong) + 3 missed edge cases (union T|not, refinement-violating-empty [→ the 4b user ruling], lifecycle-annotated). The (b) reviewer caught the migration UNDERCOUNT (43→~57, the no-space `>:` arms) + that it needs per-line care vs type-annotation colons + that the legacy-TS parsers need NEW code (only native does inside-opener). Both prevented wrong landings.
- **AST-synthesis / reuse-existing-infra pattern (both arcs):** (c) synthesized `(not to T)` via the existing `parseLifecycleReturnAnnotation` → free discrimination/assignment/reset; (b) all placements build identical AST → zero codegen. Reusing the existing walker/infra over new mechanism.

## Tags
#session-160 #CLOSE #profile-a-full-start #s154-bc-finished #no-rhs-typed-defaults #inside-opener-colon-shorthand #reviewer-gate #s89-crash-recovery #pa-dual-r26 #push-pending
