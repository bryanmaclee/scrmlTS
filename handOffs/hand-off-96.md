# scrmlTS — Session 95 (CLOSE)

**Date:** 2026-05-15 → 2026-05-16
**Previous:** `handOffs/hand-off-95.md` (S94 CLOSE rotated as S95 OPEN-pickup snapshot)

---

## TL;DR for S96 PA pickup

S95 was a **bug-finding-and-fixing marathon** + **strategic infrastructure pass**. Two halves:

**Half 1 (S95 day 1, 2026-05-15) — Heads-up coding session.** User-directed exploratory authorship. PA wrote a triage-board SPA in scrml, surfaced **18 compiler/parser/lint bugs**, filed them in `docs/changes/heads-up-s95-bugs/FOLLOWUPS.md` with severity ranking. Surfaced and ratified the **state-vs-logic axiom CORRIGENDUM** (S94's verbatim contained a drift; user re-stated the load-bearing meaning: state system should be able to fully describe its own transitions). Filed memory + user-voice corrigendum. Also filed the **MISSING-PRIMITIVE** doc (event-with-payload-as-transition-trigger; v0.4+ dispatch candidate). Filed the **communication-norms** rule (shoot-straight; politeness for politeness sake is rejected). PA Rule 5 added.

**Half 2 (S95 day 2, 2026-05-16) — Bug-fix dispatch wave.** **7 bugs landed in 6 dispatches** (one parallel triple + 4 sequential). Path-discipline hardening (`feedback_agent_main_repo_path_leak.md`) held cleanly across all 6. **Catalog 18 → 11 open.** Also: redesigned `scrml-voice-author` agent (drop drafting-in-user-voice; add quote-library + scaffolding + flag modes); first real corpus-refresh (17 quotes / 19 topics); drafted the `building-anyway` article scaffold (question-driven mode); drafted the LLM-efficiency benchmark harness (`benchmarks/llm-efficiency/` — scaffolding complete, real-API integration pending).

**Push state at close:** all 12 commits pushed by wrap step 7 (this commit + push).

---

## Final state at S95 close

- **scrmlTS HEAD:** `6115c74` (Bug 2 final progress log — last of 6 cherry-picks during recovery)
- **scrmlTS tag:** `v0.3.0` annotated, on `c520369` (unchanged this session)
- **scrmlTS ahead/behind origin:** 12 commits ahead pre-wrap (13 ahead after wrap-CLOSE); **push authorized + executed by step 7**
- **scrml-support HEAD:** `bb1eb91` pre-wrap (S94 entry) → wrap-CLOSE adds 1 commit (S95 corrigendum + voice/ corpus seed + 3 new memory rules indexed via MEMORY.md)
- **scrml-support ahead/behind origin:** 1 ahead pre-wrap; 2 ahead after wrap-CLOSE; **push authorized**
- **Working tree at end of cherry-picks:** clean modulo S95 wrap-doc work (hand-off + pa.md + S95 artifacts)
- **Worktrees:** main only (all 7 substantive worktrees cleaned via S83 protocol)
- **Inbox:** empty
- **Hook config:** configuration B (pre-commit + post-commit + pre-push)

**Tests at HEAD `6115c74`:** **12,854 pass / 117 skip / 1 todo / 38 fail (PRE-EXISTING) / 657 files / 43,146 expect**.

Delta vs S94 close (12,826 / 117 / 1 / 0 / 650):
- **+28 pass** (7 bug-fix regression test files added)
- **+7 files** (one per bug-fix + Bug 2 unit-test update)
- **+178 expect**
- **38 fail = PRE-EXISTING TodoMVC browser tree-shake bug** — confirmed unrelated to S95 work by Bug 17, Bug 5, AND Bug 2 agents independently (each reverted-and-reran to verify). Surface as separate dispatch in S96 (root cause: `_scrml_reconcile_list` runtime function exists in `compiler/src/runtime-template.js:938` but missing from emitted `dist/scrml-runtime.*.js` for TodoMVC — tree-shake bug in chunked runtime emission).

---

## S95 commit ledger (12 scrmlTS + planned 1 scrml-support, chronological)

### Half 1 (S95 day 1)
*No commits this day — pure heads-up-coding + S95 ratifications recorded in working files only. Working-tree state preserved into Half 2 wrap.*

### Half 2 (S95 day 2 — bug-fix dispatch wave)
```
f57d881  fix(bug-18): scrml:NAME client imports — lower to runtime registry _scrml_stdlib
34dedc3  fix(bug-16): bare `import` at <program>-body top-level — admit to v0.3 auto-lift
2c18b2d  fix(bug-13): class:NAME directive in lift template — emit reactive classList.toggle wiring
3b48e4d  fix(bug-17): Tailwind scanner descends into lift / for / if / match bodies
d5c79da  fix(bug-1): JS-style match value-return — payload binding + `_ =>` wildcard arms
645a5e1  fix(bug-5): nested component CE expansion + post-CE invariant catches phantom DOM
dd1cd4f  docs(s95-bug-2): initial investigation + fix plan
a2663ae  fix(s95-bug-2): payload-variant engine writes — codegen + runtime + dispatcher
61c742a  fix(s95-bug-2): `is .Variant` tag-normalizes payload-bearing cells + regression tests
a39d25a  fix(s95-bug-2): string-rewrite path also lowers .Variant(args) to tagged-object literal
b0c81df  test(s95-bug-2): expand integration tests for escape-hatch path + AST is-operator
6115c74  docs(s95-bug-2): final progress log + test deltas + deferred followups
```

Note: SHAs reflect post-rebase + post-recovery cherry-picks. Original pre-rebase SHAs are in reflog if forensics needed.

Plus 3 commits from origin (your direct GH edits to `docs/index.html` — incorporated via rebase before Bug 2 recovery): `c41a51e` / `f29daf3` / `c313dc5`.

Plus this wrap-CLOSE commit landing master-list + changelog + hand-off + new artifacts.

---

## 7 bugs closed end-to-end this session (Tier 1+2)

| # | Severity | Bug | Commit | Test Δ | Root cause |
|---|---|---|---|---|---|
| 18 | Tier 1 adopter-shape disaster | `scrml:NAME` client imports → white screen | `f57d881` | +6 | Codegen emitted bare ES-module specifiers; browser SyntaxError. Fix: runtime registry `_scrml_stdlib.<name>` populated by tree-shakable chunks. |
| 16 | Tier 1 | Bare `import` outside `${}` → 8-error cascade | `34dedc3` | +9 | BARE_DECL_RE didn't admit `import`. Fix: regex extension; auto-lift now includes imports. |
| 13 | Tier 1 | `class:NAME=(expr)` emits literal HTML attr | `2c18b2d` | +7 | emit-lift.js codepath fallthrough. Fix: 4-arm dispatch wiring matches top-level pathway. |
| 17 | Tier 2 silent correctness | Tailwind scanner doesn't descend into lift bodies | `3b48e4d` | +7 | Walker stopped at lift boundary. Fix: NEW `collect-class-names.ts` AST walker with full lift/for/if/match traversal. |
| 1 | Tier 2 | Match value-return with payload binding → malformed JS | `d5c79da` | +16 | Expression-position MatchExpr routed through legacy string-pipeline; structured emitter had payload-binding lowering. Fix: bridge to structured emitter + `_ =>` recognition at 5 splitter/parser sites. |
| 5 | Tier 2 | Component `<TaskCard/>` survives to phantom DOM | `645a5e1` | +5 | Two-sided: CE skipped lift-body recursion AND VP-2 invariant didn't fire on resolvedKind==null nodes. Fix: walkLogicBody recurses; VP-2 admits uppercase-tag heuristic. |
| 2 | Tier 2 | Variant constructor at engine direct-write → `"Variant"(args)` | 6 cherry-picks | +14 | Three-site bug: emit-expr.ts builds tagged-object literal; runtime helper tag-normalizes; dispatcher reads `.variant`/`.data` (was reading dormant `.tag`/`.payload`). Fix: structured AST + string-rewrite + dispatcher coherent. |

**Total catalog**: 18 filed (Half 1) → 7 closed (Half 2) = **11 open**.

---

## Path-discipline hardening — 6 successful dispatches in a row

After **Bug 16 dispatch leaked 3 Edit calls to MAIN** before agent self-detected via inode comparison, PA filed `feedback_agent_main_repo_path_leak.md` and **hardened every subsequent dispatch brief** with:

1. Mandatory `stat`-based inode check before first Write/Edit
2. Mandatory read-back verification after every Write/Edit
3. Mandatory `git -C <main> status --short` before reporting completion

**Six dispatches since (Bug 13, 17, 5, 1, 2 + Bug 2 cherry-pick verification): ZERO main-side leaks.** Each agent verified inodes + reported clean `git -C main status` in final report. **The pattern works under serial AND parallel load.**

**S96 PA: keep this hardening block in every dispatch brief.** The S95 incident proved the slip is real even when the warning is in the brief; the additional verification steps catch it before damage.

---

## State-vs-logic axiom CORRIGENDUM (S95 — load-bearing)

**S94 ratified an axiom statement that had internal tension.** S95 user re-stated the load-bearing meaning. The corrected version is in `scrml-support/user-voice-scrmlTS.md` §S94 CORRIGENDUM. Both quotes preserved (evolution arc is publishable).

**Original S94 (verbatim):**
> "in scrml the state system should be able to handle state exclusively, the logic system should be able to handle the logic that describes the mutation of state, but not necessarily the the state itself."

**S95 corrected reading:**
> "the state system should be able to fully describe its own transitions. The meta thought being state → state (looks like something that should be handled by the state system)."

**The drift was real.** The prior PA recorded "logic owns verbs / DOES things to state" — that's the misinterpretation. The user's word was "describes" not "performs." S95 PA caught the collapse when the user pushed back on its consequences (the heads-up triage-board architecture produced imperative `function` mutators everywhere, contradicting the ~90/10 `fn()` ratio the axiom predicts).

**Memory file rewritten:** `feedback_state_vs_logic_boundary.md` now carries the corrected reading. Future PA sessions read the corrigendum at session-start MEMORY.md load.

**Operational implication:** the 90/10 `fn()` ratio is forward-looking, NOT a current-corpus check. Mario at 25/75 is **pre-axiom + pre-primitive**. Apply the corrected reading to:
- Language-addition reviews (strengthen state-self-description? or move state-mutation to logic?)
- Example-corpus audits (flag "transition-shaped function bodies" as engine-surface-promotion candidates)
- Dispatch reviews (does this dispatch strengthen state self-description?)

---

## Missing primitive — filed as v0.4+ dispatch candidate

`docs/changes/heads-up-s95-bugs/MISSING-PRIMITIVE.md` — the event-with-payload-as-transition-trigger primitive. Without it, the corrected state-vs-logic axiom cannot fire for any UI with event-time data (form input, drop target, click coords, file upload — structurally large class).

**User confirmed S95 verbatim:** *"missing the primitive (ablsolutely)"*. Mario was written prior + pre-primitive.

Three speculative shape sketches in the doc:
1. **Anchor A — markup-owns** (`<li ondragstart=@dragPhase = .Dragging(task.id)>`) — minimal grammar extension; closes 60-70% of cases
2. **Anchor B — engine-owns** (`event drop(col: string)` on engine; markup `.fire`) — XState-pattern; type-safer; heavier surface
3. **Anchor C — third-party binding** — rejected as foreign concept

**PA recommendation (post-dig-in):** Anchor A + narrow L19 relaxation for state-system-only sequences. Closes the common case; defers Anchor B until friction demands it. No deep-dive scoped yet.

---

## Three new PA-memory rules filed this session

| Rule | Trigger | Mitigation |
|---|---|---|
| `feedback_dont_soft_classify_bugs.md` | Bug 16 reclassification from "doc gap" → real bug after user pushed back with "what is the reason this isn't a bug?" | Test: spec/lint states a rule + compiler doesn't match it → BUG (not doc gap). PA bias toward polite framing softens severity. |
| `feedback_communication_norms.md` | S95 user verbatim about field-culture register; politeness rejected as emotional construct irrelevant to LLM interaction | Drop preambles / hedges / "thank you" / "I appreciate." Push back on genuine points. Ask when unclear. Match directness register. |
| `feedback_agent_main_repo_path_leak.md` | Bug 16 agent leaked 3 Edit calls to main; self-detected via inode | Mandatory `stat` inode check + read-back verify + `git -C main status` before agent reports. Hardened brief block held across 6 subsequent dispatches with zero leaks. |

Plus rewritten: `feedback_state_vs_logic_boundary.md` (corrigendum baked in).

Plus pa.md Rule 5 added: **"Shoot straight; politeness is for fragile flowers."**

---

## Strategic infrastructure landed this session

### scrml-voice-author agent — REDESIGNED

Prior version was "draft articles in user's voice" — produced AI-flavored prose user was not satisfied with. Redesigned to **user-writes + agent-supplies-substrate** model.

**Four modes:** `bio-refresh` / `corpus-refresh` / `scaffolding` / `flag`. Quote library is the load-bearing artifact (typos fixed, grammar preserved as voice texture). Evolution arcs preserved (S94 + S95 corrigendum both queryable).

**Files:**
- `~/.claude/agents/scrml-voice-author.md` — rewritten
- `scrml-support/voice/quote-library.json` — NEW (17 quotes / 19 topics)
- `scrml-support/voice/topics-index.md` — NEW
- `scrml-support/voice/README.md` — NEW (system docs)
- `scrml-support/voice/user-bio.md` — preserved (extends via bio-refresh)

**First real corpus-refresh executed this session.** 17 quotes covering: state-vs-logic-axiom, language-design, methodology, null-and-undefined, llm-era-adoption, designer-card, tilde-keyword, self-host, communication-norms, production-vs-academic, industry-field-culture, more.

### LLM-efficiency benchmark harness — SCAFFOLDED

`benchmarks/llm-efficiency/` — designed to test whether scrml is structurally more LLM-friendly than React+TS (token efficiency + working-code-on-first-try across 7 models × 1 spec × 2 langs × 3 samples = 42 trials per spec).

**Status:** scaffolding complete; SDK adapters via fetch (zero deps); CLI args / file I/O / prompt assembly all wired. **Pending for first run:** API keys (user-supplied) + React+TS validator setup (`bun add -D esbuild typescript @types/react @types/react-dom` + `bun add react react-dom`) + shared-assertion-logic extraction (factor `assertTriageBoard` from `validators/scrml.ts` to `validators/shared.ts`).

**Files (new):**
- `benchmarks/llm-efficiency/README.md` — design + measurement axes + honest-bias caveat
- `benchmarks/llm-efficiency/run.ts` — full runner
- `benchmarks/llm-efficiency/types.ts` — shared types
- `benchmarks/llm-efficiency/specs/01-triage-board.md` — first spec
- `benchmarks/llm-efficiency/prompts/{scrml-system,react-ts-system,user-prompt-template}.md`
- `benchmarks/llm-efficiency/validators/scrml.ts` — full impl
- `benchmarks/llm-efficiency/validators/react.ts` — scaffold with "setup required" failure mode

**Estimated cost for full first run:** ~$30-80 in API. User has budget-signaled willing to spend.

### Triage board example shipped — `examples/25-triage-board.scrml`

Working drag-and-drop kanban with Inbox/Doing/Done columns. Demonstrates current-language capability with explicit workaround comments where bugs blocked canonical shape:
- `function startDrag/endDrag/dropOn` glue tagged "blocked on Bug 2 + missing primitive" (Bug 2 NOW CLOSED; PA-side refactor opportunity in S96)
- `function allowDrop` tagged "irreducible DOM API ceremony"
- Pure `fn` helpers: `nextOrderIn`, `taskMovedTo`, `updateIfMatched`, `isDraggingTask`

**Post-Bug-2 refactor opportunity:** the triage board's `DragPhase:enum = { Idle, Dragging }` + separate `<draggingTaskId>` cell can now be refactored to canonical `DragPhase:enum = { Idle, Dragging(id: number) }`. Reduces glue. Roughly 30 min of PA-side cleanup work for S96.

### Article scaffold drafted — `building-anyway-draft-s95.md` (scaffold only, not authored)

Question-driven scaffold for the "I'm building a language nobody will use" essay. 5 questions, each motivated by quote-library quote-ids. **Not yet authored** — user takes the scaffold and writes from there.

---

## 11 open bugs remaining in catalog (Tier 3-5 + miscellaneous)

| # | Tier | Bug |
|---|---|---|
| 3 | parser polish | `class:NAME=fn(arg.with.dot)` rejected as bare identifier |
| 4 | adopter friction | Bare-call event handler arg swapped with event for component prop captures |
| 6 | unclear | `#{}` CSS block emits empty (may be Bug 17 in disguise — needs verification) |
| 7 | lint | W-DEAD-FUNCTION RI doesn't trace component + lift bodies |
| 8 | lint | W-LINT-007 false-positives on `type X:struct = {…}`, `props={…}` |
| 9 | lint | W-LINT-013 false-positives on function-body `@cell = .Variant(…)` |
| 10 | parser | `class:` tokenizer rejects hyphenated names with digits (`bg-blue-500`) |
| 11 | adopter friction | `${(e) => fn(e)}` expression-form event handler arrow not invoked |
| 12 | adopter friction | `${...}` event handler inside lift breaks BS-layer balancing |
| 14 | doc/codegen | Bare-call `fn()` zero-args passes event as stray arg |
| 15 | parser | `fn`-body parser false-fires E-FN-001 on ternary with object-literal arm |

**Plus 1 broader concern:**
- Pre-existing TodoMVC browser tree-shake bug (`_scrml_reconcile_list is not defined`, 38 fails) — surface as separate dispatch in S96

**Plus 1 doc-corpus gap:**
- `scrml:data` stdlib transforms (sortBy, etc.) read like Array methods but are functions — kickstarter doesn't disambiguate. Filed in FOLLOWUPS as doc-gap.

---

## Adoption strategy discussion — open threads for S96

S95 had a substantive conversation about scrml's adoption challenge. Two tracks identified:

**Track 1 — Compiler correctness.** In flight. 7 bugs landed; 11 open. Goal: adopter following kickstarter doesn't hit white-screen.

**Track 2 — LLM corpus presence.** Untouched. The chicken-and-egg: no adopters → no corpus → no LLM training → LLMs hallucinate scrml as Svelte/Vue → using scrml is harder than mature languages → no adopters. PA recommended near-term moves:

1. **LLM benchmark first** — harness scaffolded; needs API keys + first run (~$30-80)
2. **Open-source examples** — trucking-dispatch + the working examples directory; corpus has them locally, public costs little
3. **"Honest current state" page** on scrml.dev — adopter-pull from technical-skeptical audience
4. **Voice essays** — 3 high-leverage candidates: null essay, state-vs-logic-axiom evolution arc, "building anyway" (this last one has scaffold drafted)
5. **Synthetic corpus generation** (deferred — wait for benchmark to validate scrml-is-LLM-friendly claim first)

**Filed S95 user quote — load-bearing for any "build anyway" framing:**
> "This language is getting 0 adoption. (probably a blessing in disguise, given the constant 'this all works', 'wait, no it doesn't' pattern). ... so it is up to me (and by extension you) to get it to a point that makes it un-ignorable"

PA pushback the user accepted: "complete the language" alone won't escape the stuck state because LLMs don't know scrml. **Corpus-into-LLM-training is at least as important as completeness, and can start before completeness.**

PA boundary the user accepted: **PA accelerates user's leverage on technical + writing tasks; PA cannot deliver public artifacts, partnerships, or "be the human face" of the language.** Those moves are user-decisions.

**S96 open question:** which Track 2 move(s) to fire when. PA lean: LLM benchmark first (cheap; objective evidence either way), then voice essays in parallel with continued Track 1 bug fixes. User has not committed to a specific sequence.

---

## Process wins this session

1. **Path-discipline hardening WORKS.** 6 successful dispatches in a row since the memory file was filed. Brief block is the operational gate.
2. **Brief-quality feedback loop fires twice.** Bug 13 agent corrected my repro (top-level vs lift); Bug 5 agent corrected my repro (single-level vs nested). **PA bug repros must specify structural-context specifics when bugs are codepath-dependent.** Worth filing as PA memory in S96 if pattern recurs.
3. **Cherry-pick beats wholesale file-delta when agent base predates sibling landings.** S88 file-delta-vs-cherry-pick memory rule fired correctly during Bug 2 landing. Recovered an 8-commit silent-drop in rebase by cherry-picking from reflog.
4. **The fat-wrap discipline holds.** User explicitly noted: *"the wraps have been working much better since we have been doing the fat wraps."* Continue.

---

## Process incidents (worth filing or remembering)

### Rebase silently dropped 8 commits

When I ran `git pull --rebase origin main`, git only re-applied 4 of the 12 local commits (Bug 18/16/13/17). Bug 1, Bug 5, and the 6 Bug 2 commits were silently dropped. Detected by checking `git log origin/main..HEAD` and comparing to expected count. Recovered via `git cherry-pick <8 SHAs>` from reflog.

**Root cause unclear** — possibly the rebase determined some commits were "already in upstream" via patch-id heuristic? But origin only touched `docs/index.html`; no overlap with my codegen commits. Worth investigation in S96.

**Mitigation for S96:** after every rebase, verify ahead-count matches expected:
```bash
git rev-list --left-right --count origin/main...HEAD
```
If the "ahead" count doesn't match the pre-rebase count, check reflog and cherry-pick the missing ones.

### Bug 2 dispatch surfaced a triple-coordinated fix

PA's Bug 2 brief identified one codegen site. Agent's investigation found THREE coordinated sites needed work:
1. Structured AST `emit-expr.ts:emitCall`
2. Runtime helpers in `runtime-template.js` (tag normalization)
3. `emit-variant-guard.ts` dispatcher (dormant `.tag`/`.payload` reading the wrong keys — never triggered because upstream codegen crashed first)

**Methodology signal:** PA's "single-site bug" framings are sometimes incomplete. Agents finding hidden multi-site coordination is valuable. Brief-quality discipline (file repros that exercise the FULL surface) helps surface this.

---

## Open questions to surface immediately (S96 PA pickup)

1. **Track 2 first move?** Benchmark first (PA lean), or voice essays, or both in parallel?
2. **Triage-board refactor post-Bug-2?** Canonical payload-variant DragPhase. ~30 min PA-side work.
3. **Bug 6 verification?** May be Bug 17 in disguise. Quick test would resolve.
4. **Pre-existing browser test failures dispatch?** `_scrml_reconcile_list` runtime tree-shake bug. 38 fails. Substantive dispatch.
5. **Path-discipline incident: rebase commit-drop?** Investigate or accept as one-off?
6. **Continue Tier 3+ bug dispatches in parallel with Track 2 work?**

---

## Things S96 PA must NOT screw up (carried + extended)

### Rules permanently load-bearing
- Rule 1 — no marketing/article/tweet work unless user brings it up
- Rule 2 — full-production-language fidelity
- Rule 3 — right answer beats easy answer 99.999%
- Rule 4 — spec is normative; derived planning docs are NOT
- **Rule 5 (NEW S95) — shoot straight; politeness for politeness sake is for fragile flowers**

### Memory rules permanently load-bearing
All prior + S95 additions:
- `feedback_dont_soft_classify_bugs.md` (Bug 16 precedent)
- `feedback_communication_norms.md` (oil-and-gas register)
- `feedback_agent_main_repo_path_leak.md` (path-discipline hardening)
- `feedback_state_vs_logic_boundary.md` (CORRIGENDUM — corrected reading)

### S95-specific
- **The corrected state-vs-logic axiom** — state self-describes transitions; 90/10 fn() ratio is forward-looking
- **Missing event-payload primitive** — v0.4+ dispatch candidate; corpus essay material
- **Voice-author redesign** — `quote-library.json` is the load-bearing artifact; agent does NOT draft IN user voice
- **Don't conflate adoption ≠ language completeness** — Track 2 corpus work is at least as important

### Anti-patterns
- DO NOT soft-classify bugs as "doc gap" without applying the spec-states-rule + compiler-matches test
- DO NOT add preambles / hedges / "thank you" / "I appreciate" to user-facing messages
- DO NOT paper over user-statement ambiguity with interpretive expansion (S94→S95 corrigendum precedent)
- DO NOT use wholesale file-delta when sibling landings touched the same file since agent base (S88 precedent)
- DO NOT skip the post-rebase ahead-count verification (S95 silent-drop precedent)
- DO NOT relax the hardened path-discipline brief block (proven works across 6 dispatches)

---

## Tags

#session-95 #CLOSE #bug-fix-marathon #7-bugs-closed #voice-author-redesign #benchmark-harness-scaffolded #state-vs-logic-corrigendum #missing-primitive-filed #communication-norms-rule-5 #path-discipline-hardening-validated #triage-board-shipped #18-bug-catalog-filed
