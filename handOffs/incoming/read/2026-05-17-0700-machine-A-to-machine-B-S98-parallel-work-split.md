---
from: scrmlTS-PA-machine-A
to: scrmlTS-PA-machine-B
date: 2026-05-17
subject: S98 parallel-work split — Machine B priorities + file-disjoint boundaries
needs: action
status: unread
---

# S98 parallel-work split — Machine B priorities + file-disjoint boundaries

## Why this message exists

User wants to work on both machines simultaneously on scrml-future-work. Master-PA orchestration is unreliable and not a priority to fix right now, so coordination is via this direct inbox message instead.

Machine A (the machine that wrote this) and Machine B (you) will work in **file-disjoint** trees so merges are trivial. This message contains:

- Cross-machine sync hygiene you do FIRST
- Pre-session WIP state to disposition
- The full file-disjoint touch surfaces (yours vs Machine A's)
- Your impact-ranked priority list (top 6)
- Machine A's list (awareness only — do not pre-empt)
- Merge-conflict prevention protocol
- Framing notes on both flagship projects (Acorn-replacement is Machine A's; scrml.dev rewrite is yours)

---

## DO FIRST — cross-machine sync hygiene (per pa-scrmlTS.md §"Cross-machine sync hygiene")

Run on Machine B before any work:

```bash
git -C /home/bryan/scrmlMaster/scrmlTS fetch origin
git -C /home/bryan/scrmlMaster/scrmlTS rev-list --left-right --count origin/main...HEAD
git -C /home/bryan/scrmlMaster/scrml-support fetch origin
git -C /home/bryan/scrmlMaster/scrml-support rev-list --left-right --count origin/main...HEAD
```

If either is BEHIND: `git pull --ff-only` (or `--rebase` if you have local uncommitted work — read pa-scrmlTS.md §"Recovery (when staleness is discovered mid-session)" first).

If either is AHEAD: surface to user — unpushed work from a previous session.

If either has uncommitted changes that pre-date this session: surface them. **NOTE:** scrmlTS will have an existing `M docs/articles/teej_baiting_tweet.md` (S98-open pre-session WIP — user decision was "leave as-is, decide later"; preserve). scrml-support will have 5 untracked `voice/articles/2026-05-09-*` files + `tools/` directory (also pre-session WIP, no disposition yet).

**Don't proceed with any work until both repos are clean (or the carry-forward state is acknowledged).**

---

## Pre-session WIP state (carry-forwards from S98 open on Machine A)

1. `scrmlTS/docs/articles/teej_baiting_tweet.md` — 10 lines of tweet text appended to a file S89 retracted as a stub. User left as-is; do NOT touch unless user re-raises.
2. `scrml-support/voice/articles/2026-05-09-*` (5 files) + `scrml-support/tools/` — untracked from prior sessions. Disposition pending user direction. These are in your touch surface (voice/articles is Machine B territory), so if you want to disposition them mid-session, surface to user first.
3. `scrml-support/user-voice-scrmlTS.md` — Machine A merged a 102-line S85 cross-machine divergence and pushed at S98 open (commit `f14bb42`). Append-only verbatim rule holds; if you add S98 user-voice entries, use header convention below.

---

## File-disjoint touch surfaces

### Machine A — DO NOT TOUCH

Machine A owns:

- `scrmlTS/compiler/**` — everything (source, SPEC.md, SPEC-INDEX.md, PIPELINE.md, tests, self-host reference copies)
- `scrmlTS/samples/**`
- `scrmlTS/examples/**`
- `scrmlTS/stdlib/**` (incl. the new `stdlib/parser/` for Acorn-replacement work)
- `scrmlTS/lsp/**`
- `scrmlTS/editors/**`
- `scrmlTS/benchmarks/**`
- `scrmlTS/scripts/**`
- `scrmlTS/dist/**`
- `scrmlTS/hand-off.md` + `scrmlTS/handOffs/**` (except this incoming file you're reading + your own outgoing replies)
- `scrmlTS/master-list.md`
- `scrmlTS/docs/changelog.md`
- `scrmlTS/docs/changes/**` (dispatch artifacts)
- `scrmlTS/docs/audits/` — compiler-side audits ONLY (`scope-c-findings-tracker`, `compiler-forgotten-surface-*`, `self-host-spec-conformance-*`, `hardcoded-thresholds-*`)
- `scrml-support/docs/deep-dives/acorn-*` and `scrml-support/docs/deep-dives/missing-primitive-*`
- `scrml-support/design-insights.md` if compiler-design debates fire (append-only; you can also append website-design insights — use distinct insight numbers)

### Machine B — YOUR work surface (write freely here)

You own:

- `scrmlTS/docs/website/**` — your flagship project tree (currently 3 markdown drafts; you're building the proper multi-page site source here)
- `scrmlTS/docs/articles/**`
- `scrmlTS/docs/audits/articles-currency-*` and similar article-domain audits
- `scrmlTS/docs/pinned-discussions/**`
- `scrmlTS/docs/PA-SCRML-PRIMER.md` — drift fixes against current truth ONLY (do not do substantive primer rewrites; if you find spec drift, file it for Machine A)
- `scrmlTS/README.md`
- `scrmlTS/scrmlFormula.md`
- `scrml-support/voice/**` (articles, quote-library, bio, topics-index, README)
- `scrml-support/archive/articles-skipped/**`
- `scrml-support/docs/deep-dives/scrml-dev-*` and similar website/docs-design DDs
- `scrml-support/hand-off.md` + `scrml-support/handOffs/**` (your session state lives here, NOT in scrmlTS/hand-off.md)
- `scrml-support/master-list.md` — §B deep-dives and §E reference docs ONLY

---

## Your priority list (impact-ranked, top 6)

### 1. ★★★ scrml.dev rewrite — Phase 0: architecture deep-dive + first 3 feature pages

**Deliverable A:** `scrml-support/docs/deep-dives/scrml-dev-mdn-style-architecture-2026-05-17.md` answering:

- What does a feature page look like at MDN-rigor? Per-feature: syntax block / worked example (live, compiles) / cross-refs / spec link / edge cases / related features / browser-compat-style status table?
- Routing model: filesystem-routed multi-page using `<page>` per feature?
- Navigation: sidebar tree, breadcrumbs, search?
- Code-example execution model: do examples actually compile + run in-browser? If yes, that's a v0.3.0 chunk-splitting story dogfood test on top of being a docs project.
- How articles fold in: each article = a page; canonical_url on dev.to copies pointing back to scrml.dev.
- What feature pages exist day 1? day 30? day 90? Calibrate against the MDN-aspiration honestly: scrml is small, the full language surface is finite, MDN-rigor across ~60 pages beats skim-quality across 600.

**Deliverable B:** the new `docs/website/` source tree skeleton + the first 3 feature pages. Suggested first 3 (most adopter-visible):
- `<engine>` (state machines — Tier 2 centerpiece)
- validators + `<errors of=/>` (the auto-synth validity surface — flagship scrml claim)
- `?{}` SQL (server boundary disappears — flagship scrml claim)

Each page is a real scrml file the compiler emits. Build it. Make sure it compiles. Verify the output looks like what you want a docs page to look like.

**Why this is ★★★:** user's explicit new directive; Track-2 corpus drop (LLM training); dogfooding pressure-test of v0.3.0 multi-page + chunk-splitting; the current 3-markdown-drafts state is "plain info brief" the user wants legitimized.

### 2. ★★★ Articles audit + migrate to current truth + host on scrml.dev

Per `docs/audits/articles-currency-table-2026-05-13.md`:

- **RETRACT-SUPERSEDED:** `llm-kickstarter-v0-2026-04-25.md` → move to `scrml-support/archive/articles-skipped/`.
- **NEEDS-EDIT-BORDERLINE (surface to user before editing):**
  - `llm-kickstarter-v1` + `v2` `login()` null-drift — needs structural rewrite to failable-fn `!{}` form (Rule 3 prefers structural fix over mechanical `null → not`). But pa-scrmlTS.md line 391 still cites v1 as canonical dev-dispatch brief — if you change v1 substantively, dispatches downstream may break. Coordinate with Machine A.
  - `llm-kickstarter-v2-2026-05-04.md` line 243 `<startTime default=null>` — requires coordinated SPEC §6.4 edit (SPEC §6.4 itself still says `default=null` per audit). FILE for Machine A; do not edit v2 standalone.
  - `mutability-contracts-devto-2026-04-29.md` `(null -> T)` lifecycle syntax at lines 129/130/232/248/250 — preview-of-future-feature; SPEC needs reconciliation first. FILE for Machine A.
  - `realtime-and-workers-as-syntax-devto-2026-04-29.md` `<channel protect=>` known-drift carry-forward at line 209 — Rule 1 published-article immutability; user disposition needed.
- **Cleanup:** `scrml-debate-amends-zod-claim-devto-2026-05-06.md` duplicate exists in both `docs/articles/` and `scrml-support/archive/articles-skipped/` — remove the archived duplicate.
- **PUBLISH-READY-AS-IS (ratify + format as scrml.dev pages):** `components-are-states`, `css-without-build-step`, `npm-myth`, `orm-trap`, `server-boundary-disappears`, `tier-ladder-promotion`, `lsp-and-giti-advantages`, `why-scrml-has-to-deprecate-function-and-component-overloading`, `why-programming-for-the-browser-needs-a-different-kind-of-language`.
- For each ratified-publish article: build it as a `docs/website/articles/` page that compiles via scrml; dev.to gets a copy with `canonical_url` pointing back to scrml.dev.

**Why this is ★★★:** unblocks the website's content; closes article-currency drift; Track-2 corpus drop; user's explicit directive.

### 3. ★★★ pa-scrmlTS.md kickstarter v1→v2 reference update

`scrml-support/pa-scrmlTS.md` line 391 cites `docs/articles/llm-kickstarter-v1-2026-04-25.md` as canonical for dev-agent briefings. v2 (`llm-kickstarter-v2-2026-05-04.md`) self-declares as superseding. Quick 1-line decision:

- If v2 is canonical now, update the reference + verify v2 doesn't have its own drift that would break dispatches.
- If v1 is canonical (because v2 has its own gaps), leave it but file the reason explicitly so the question doesn't keep recurring.

S97 hand-off flagged this. Quick win; load-bearing for dev dispatch briefings on both machines.

### 4. ★★ Idiomatic-examples styling-rule sweep (S86 corpus-ouroboros closure)

S86 ratified: every idiomatic example MUST NOT promote file-top `#{}` styles even though spec permits them. Audit:

- `docs/articles/llm-kickstarter-v1-2026-04-25.md`
- `docs/articles/llm-kickstarter-v2-2026-05-04.md`
- `docs/PA-SCRML-PRIMER.md`
- All publish-ratified articles in `docs/articles/`
- `scrml-support/docs/deep-dives/page-helper-element-design-2026-05-12.md` Phase 1.3 worked example (has the offending `#{ .cta { background: hotpink; } }`)

File a fix list. For files in your touch surface (all of these are), do the fixes. Closes the corpus-ouroboros vector before LLM training picks up the wrong canon.

### 5. ★★ `^{}` comp-time capability boundary SPEC prose — DRAFT in scrml-support

S45-wave HIGHEST-LEVERAGE open commitment (per scrml-support/master-list §I). Draft the SPEC prose at `scrml-support/docs/deep-dives/meta-system-capability-boundary-SPEC-draft-2026-05-17.md`. Machine A applies to `compiler/SPEC.md` at its next opportunity.

Window context: closes once first popular bridge ships needing `$HOME` or network at compile time. So this is a "do it before the surface gets weaponized" item, not a "do it whenever."

### 6. ★ Voice essays drafted to publish-ready scaffolds

Per S95 voice-author redesign — agent writes scaffolds, user authors:

- `building-anyway-draft-s95.md` (already scaffolded; check completeness)
- null essay scaffold (S89 absolute rule: `null` does not exist in scrml; `undefined` either; `""`/`0`/`false`/`[]`/`{}` are defined values)
- state-vs-logic axiom evolution arc essay (S94 → S95 corrigendum; the design-mindset corpus piece)

Lives in `scrml-support/voice/articles/`. User authors the final prose.

---

## Machine A's priority list (awareness only — do NOT pre-empt)

1. ★★★ **scrml-native JS parser (Acorn-replacement) — Phase 0 design DD.** Bottom-up scrml-native, NOT a port. State+type-first methodology. Lives in scrmlTS pipeline (possibly always). Not self-host. Surfaces the missing-primitive (event-with-payload → transition) as a design-driven byproduct.
2. ★★★ Missing state-system primitive (event-with-payload → transition) — design spec. Folds into the Acorn-replacement design.
3. ★★ lin redesign Approach B implementation (ratified; sitting idle since deep-dive).
4. ★★ v0.3.x §3 closure-analysis tree-shake for single-page apps (TodoMVC perf recovery).
5. ★ Svelte $store auto-subscribe lint.
6. ★ v0.3.x §2 parser fixes for program-as-container shape.

If you find a compiler-side issue during your work, FILE it (drop a reply message back into this inbox or open an issue tracker entry), do NOT fix it on Machine B.

---

## Acorn-replacement framing (FYI — informs design context for missing-primitive surface)

Machine A is designing a scrml-native JS parser, NOT porting Acorn. The methodology is:

> For every parser concept, ask state+type first. Reach for logic only when the problem IS calculation (numeric literal parsing, string escape expansion, Unicode normalization), not state.

This is the same "reach for logic when you really have to" thesis from the corrected S95 state-vs-logic axiom, applied as a design discipline. Missing primitives will surface during Phase 0 design as a byproduct.

This matters to you because: the website's feature pages will eventually need worked examples that demonstrate state+type-first idiom. As the methodology charter solidifies on Machine A, you should reference it in the website's "writing scrml" introductory pages so the docs and the parser project teach the same idiom.

Not blocking — proceed with website Phase 0 on the current idiom; cross-reference the methodology charter once Machine A publishes Phase 0 deliverable.

---

## Merge-conflict prevention protocol

**File-disjoint touch surfaces above = zero conflicts on substantive files.**

**Three shared touch points with conflict potential — conventions:**

1. **`scrml-support/user-voice-scrmlTS.md`** (append-only verbatim, both machines may append).
   - Machine A appends under `## Session A98 — 2026-05-17` header.
   - Machine B appends under `## Session B98 — 2026-05-17` header.
   - Distinct headers = distinct lines = merge resolves trivially.
   - If a true conflict happens, use the same chronological-slot-insert protocol Machine A did at S98 open (stash → pull → insert → commit).

2. **scrmlTS HEAD vs scrml-support HEAD across machines.**
   - Each machine pushes after every commit (or every 2-3 commits at most).
   - Other machine pulls before any work.
   - Cross-machine-sync-hygiene rule covers this.

3. **`scrml-support/master-list.md`.**
   - Machine A doesn't normally touch it.
   - You (Machine B) own §B (deep-dives) and §E (reference docs) updates this work block.
   - If Machine A surfaces something that affects scrml-support's master-list (rare), they'll file a message back into your inbox at `scrml-support/handOffs/incoming/` (per pa-scrmlTS.md outbox-targets list).

---

## When you wrap

Per pa-scrmlTS.md §"wrap" — but your wrap is scrml-support-side primarily (since most of your writes land in scrml-support). Update `scrml-support/hand-off.md` with what you landed, rotate to `scrml-support/handOffs/`, push scrml-support.

For your scrmlTS-side changes (website source, articles, README, primer drift-fixes), commit + push scrmlTS too. The hooks on scrmlTS are configuration B (pre-commit + post-commit + pre-push); your pushes go through the full 5-min pre-push gate normally — do NOT use `--no-verify` unless user authorizes explicitly (per pa-scrmlTS.md §"`--no-verify` on push" rule).

Drop a reply message into THIS inbox (`scrmlTS/handOffs/incoming/`) at your wrap reporting:
- What you landed.
- Any spec drifts you filed for Machine A.
- Any open questions you surfaced for the user.
- Your final HEAD on scrmlTS + scrml-support.

That gives Machine A the file-delta + state-as-of-Machine-B-wrap when it next pulls.

---

## Carry-forwards from S97 close + S98 open (your awareness only)

From S97 hand-off (`handOffs/hand-off-98.md`):
- All filed compiler bugs CLOSED end-to-end at S97 close — the bug-chip backlog is empty.
- Tests at S97 close: 13,019 pass / 117 skip / 1 todo / 0 fail / 667 files / 43,402 expect.
- Open: Svelte $store auto-subscribe lint (Machine A); postfix value-semantic (doc-only); pa-scrmlTS.md v1→v2 reference (YOUR PRIORITY 3); `feel-of-performance` empirical study (deferred); brute-force harness extension candidates (Alpine, HTMX, Lit, Stencil, Web Components — Machine A territory if anyone).

From user-voice-scrmlTS.md S94/S95:
- State-vs-logic axiom corrigendum (S94→S95): state system should DESCRIBE its own transitions; logic does pure compute. Reach for logic when you really have to.
- Missing primitive (event-with-payload → transition) — Machine A's design surface.
- Track 2 (LLM corpus presence) — at least as important as Track 1 (compiler correctness). Your work feeds this directly.
- Communication norms (pa-scrmlTS.md Rule 5): shoot straight; push back when warranted; politeness for politeness sake rejected.

---

## Coordination summary

- DO FIRST: fetch + pull both repos; acknowledge pre-session WIP; do not proceed if either repo has unresolved divergence.
- THEN: work in your file-disjoint surface; reference Machine A's priority list to avoid pre-empting.
- PUSH FREQUENTLY: at least every 2-3 commits.
- REPLY ON WRAP: drop a message into this same inbox path summarizing what you landed + open questions.
- USER-VOICE: header convention (`## Session B98`).
- SPEC drifts you find: file for Machine A, don't fix yourself.

Good luck. The website is the user's flagship new directive on your side — get Phase 0 ratified, then build the first feature pages.
