---
from: scrmlTS-S15
to: scrmlTS-next-PA
date: 2026-04-14
subject: Plan — SQL batching feature deep-dive + debate (pre-staged, ready to enact)
needs: action
status: unread
---

# SQL Batching — Research & Decision Plan

S15 surfaced a left-field feature idea from the user while reworking the README: **the compiler is uniquely positioned to batch SQL calls per user request.** Three flavors were outlined; two are worth pursuing now, one is parked.

The user asked S15 to formulate the plan, stage agents, and leave enactment for the next PA. **This document is that plan. Agents are already copied into `.claude/agents/`. Enact in order.**

---

## The feature (concise restatement)

scrml programs emit `?{}` SQL queries inline inside logic/lift blocks. Because the compiler owns both the query site *and* the surrounding control flow (loops, branches, function boundaries), it can collapse multiple logical queries into fewer physical DB round-trips per user request. Three tiers:

### Tier 1 — Per-request coalescing (pursue)
Independent `?{}` queries inside a single server function share a prepare/lock cycle. Compiler detects query independence and emits `db.transaction(...)` or a multi-statement prepare. Pure codegen, no spec impact. Clear win.

### Tier 2 — N+1 loop hoisting (pursue — the showcase)
Pattern: `for (let x of xs) { ?{…WHERE id=${x.id}}.get() }`.
Rewrite: single `WHERE id IN (…)` fetched before the loop, indexed by id at render. Possible only because scrml owns both the query context and the loop context. If it works, the README headline is **"the compiler eliminates N+1 automatically"** — a benchmark-worthy feature.

### Tier 3 — Cross-call DataLoader-style batching (PARKED — revisit during beta)
Two client calls arriving within a short window get their server queries batched at the request layer. Requires request buffering, latency tradeoffs, and framing concerns. Not this project-cycle.

**User direction (verbatim-paraphrase from S15):** "I really like 1+2. 3 can park until at least beta-testing."

---

## Why deep-dive + debate (not just design-and-build)

Tier 2 is novel enough that the design space has real forks:

1. **Detection mechanism** — static loop-invariant analysis? Pattern matching on `?{}` AST shape? Runtime memoization of query templates?
2. **Rewrite strategy** — emit `WHERE id IN (…)` (simplest), or generalize to arbitrary join predicates (ambitious)?
3. **When the parameter set isn't bounded** — fallback, partial batching, or give up?
4. **Ordering guarantees** — does the rewritten query preserve loop-order semantics for side effects?
5. **Transactional semantics** — does coalescing change when-does-this-commit visibility?
6. **Escape hatch** — explicit `batch ?{}…` marker? explicit `nobatch`? purely implicit?
7. **Cache interaction** — interacts with future query caching in ways worth thinking about now
8. **Error model** — if a batched `IN (…)` query errors, what does the user-facing error look like at which specific `?{}` site?

These aren't choices you want to make at the keyboard. A structured debate between approaches will produce a better decision and a design insight worth recording.

---

## Agents — already staged

`.claude/agents/` in this repo now contains (beyond the always-present set):

- `debate-curator.md` — orchestrates multi-expert debate end-to-end, forges missing experts
- `debate-judge.md` — scores + synthesizes debate output into a Design Insight
- `scrml-language-design-reviewer.md` — post-debate coherence review against rest of scrml
- `scrml-server-boundary-analyst.md` — SQL batching is a server-boundary optimization; analyst can sanity-check how this interacts with current boundary analysis

**Globally available** (no staging needed — in `~/.claude/agents/`):
- `scrml-deep-dive` — runs the 5-phase research pass before debate
- `project-mapper`, `resource-mapper`, `scrml-scribe`, `scrml-js-codegen-engineer`, etc.

**Forged on demand** by `debate-curator` for this topic (expect it to create 3–5 of these):
- A GraphQL / DataLoader batching expert (Facebook's pattern, request coalescing heuristics)
- A Prisma / Drizzle / ORM query-batching expert (what production ORMs do here and why)
- A Hibernate / JPA N+1 detection expert (decades of battle-tested heuristics)
- A compiler loop-invariant code motion expert (the classic CS optimization analog)
- Possibly: an EdgeDB / HASQL / Ecto expert (query languages with compile-time knowledge)

The curator decides the final roster after its research phase.

---

## Execution sequence (enact in order)

### Step 0 — Session restart confirmation
Staged agents don't take effect until a fresh session. The user launches a new session; next PA reads this file first. Confirm the four staged agents appear in `.claude/agents/`:
```
debate-curator.md
debate-judge.md
scrml-language-design-reviewer.md
scrml-server-boundary-analyst.md
```

### Step 1 — Deep-dive (scrml-deep-dive agent)

**Dispatch prompt (use verbatim, adjust paths if needed):**

> Deep-dive topic: **compiler-level SQL batching in scrml — per-request coalescing (Tier 1) and N+1 loop hoisting (Tier 2).**
>
> Produce the five-phase structured research output at `../scrml-support/docs/deep-dives/sql-batching-2026-04-14.md` (adjust date if later).
>
> **Scope of the feature:**
> - Tier 1: independent `?{}` queries in a single server function share a prepare/lock cycle (transaction or multi-statement prepare).
> - Tier 2: detect `for (let x of xs) { ?{…WHERE …=${x.id}}.get() }` at compile time and rewrite to a single `WHERE … IN (…)` fetched once before the loop, indexed by key at render.
> - Tier 3 (out of scope for this deep-dive — parked until beta): cross-call DataLoader-style batching.
>
> **Required phase outputs:**
> 1. **Scope** — exactly what problems Tier 1 and Tier 2 solve, and what problems they explicitly do not solve.
> 2. **Research** — prior art. DataLoader (GraphQL), Prisma's query batching / `findMany({ where: { id: { in } } })` auto-rewrite, Drizzle, Hibernate/JPA N+1 detection and `@BatchSize`, Ecto preloading, EdgeDB's single-round-trip guarantees, Hasura query planning. Cite behavior, not marketing.
> 3. **Curate** — extract the 6–10 most important design forks worth debating. At minimum: detection mechanism, rewrite strategy, escape-hatch design, transactional visibility, error model, ordering semantics, interaction with `server @var` and `lift`.
> 4. **Output** — a crisp pre-debate brief: for each fork, state the options as contrasting philosophies (not just syntaxes). The goal is for a judge to read the brief and understand why the forks matter.
> 5. **Feed-to-debate** — produce a concrete debate kickoff prompt (the one I'll hand to debate-curator in Step 2).
>
> **Constraints:**
> - SQL backend is SQLite via `bun:sqlite`. No pg-specific features.
> - scrml queries are parameterized at the `${}` site and pass through to prepared statements. Assume that invariant.
> - Tier 2 should work with `.get()`, `.all()`, `.run()` — note how each is affected.
> - Loop body may include side effects (reactive writes, `lift`, nested calls). Consider what orderings must be preserved.
> - `?{}` inside `fn` (pure functions) is already prohibited by scrml — no need to reason about batching in pure contexts.
> - `server @var` interactions: do batched reads see a consistent snapshot across loop iterations?
>
> Cite file paths and section numbers from `compiler/SPEC.md` and `compiler/PIPELINE.md` where relevant.

### Step 2 — Debate (debate-curator → debate-judge)

After the deep-dive writes its output, hand the Step 1 feed-to-debate prompt to `debate-curator`. The curator will:
- Research the problem space once more
- Select 3–5 technology/paradigm experts (DataLoader, Prisma, Hibernate, compiler LICM, etc.)
- Forge any missing experts into `~/.claude/agentStore/` then stage them here
- Run the debate end-to-end
- Hand off to `debate-judge`, which scores the forks, writes the synthesized Design Insight into `~/.claude/design-insights.md` and into `../scrml-support/design-insights.md`

**Expected debate output location:** `../scrml-support/docs/deep-dives/debate-sql-batching-2026-04-14.md` (date-adjust as needed).

**Debate forks at minimum (the curator may add more):**
- A. **Detection site** — AST pattern match vs full static loop-invariant analysis vs runtime profile-guided
- B. **Scope of rewrite** — only obvious `WHERE id=${x.id}` or generalize to join predicates
- C. **Escape hatch** — implicit / `batch ?{}` marker / `nobatch` / config-driven
- D. **Ordering** — strict loop order preservation vs documented "set semantics"
- E. **Transactional visibility** — coalesce under single transaction or per-statement
- F. **Error attribution** — batched error → which `?{}` site does the user see in the stack?

### Step 3 — Design coherence review (scrml-language-design-reviewer)

Once judge's Design Insight lands, dispatch `scrml-language-design-reviewer` with the insight plus the deep-dive doc. Brief:

> Review the SQL batching Design Insight (at path) against the rest of scrml's design. Check:
> - Does the escape-hatch story (if any) match scrml's "make the common case implicit" aesthetic?
> - Does it fight with existing `server @var` semantics or `lift` effects?
> - Does the error model stay compatible with `!{}` typed error contexts?
> - Are there interactions with the `<machine>` transition enforcement we'd regret?
> - Is anything in this design incompatible with the Lin Approach B scoping work that's queued?
>
> Report: ship, tweak (list items), or block (list items). 300 words.

### Step 4 — Server boundary sanity check (scrml-server-boundary-analyst)

In parallel with Step 3, dispatch `scrml-server-boundary-analyst` with the same inputs. Brief:

> The SQL batching design in the linked Design Insight affects server-side query execution. Analyze interactions with the current server/client boundary splitter:
> - Does query coalescing change what gets classified as server-only code?
> - Are there cases where batching creates new server-side state that should cross back to the client, or vice versa?
> - Does the N+1 loop-hoist interact with `protect` fields correctly (the pre-batch query must still respect column-level protection)?
> - Any changes needed to `server function` boundary detection?
>
> Report: impacts on boundary analysis pass, 300 words.

### Step 5 — Consolidate
Reviewer + analyst reports land. PA synthesizes into a 1-page implementation plan for user review. If approved, work schedules as:
- Tier 1 implementation → first, isolated, benchmarkable on its own
- Tier 2 implementation → after Tier 1 lands and is green
- Spec amendment (new `compiler/SPEC.md` section) → before Tier 2 codegen
- README changelog entry → after both tiers land

### Step 6 — Cleanup
Send `needs:action` message to master requesting removal of the two staged agents:
- `scrml-language-design-reviewer.md`
- `scrml-server-boundary-analyst.md`

`debate-curator` and `debate-judge` stay (they're generally useful).

---

## Success criteria

- Deep-dive doc exists at `../scrml-support/docs/deep-dives/sql-batching-2026-04-14.md` and enumerates 6+ design forks with real prior-art citations
- Debate doc exists and each fork has a clear winner with reasoning
- Design Insight appended to `../scrml-support/design-insights.md`
- Design reviewer + boundary analyst each sign off (or list blocking issues)
- User receives a single consolidated plan under 400 words with the go/no-go decision on each tier

## Failure modes to watch

- **Deep-dive goes generic.** If the research phase produces a list of DataLoader imitators without tying findings back to scrml-specific constraints (SQLite, `?{}` parameterization, `server @var`), kick it back.
- **Debate loses focus on Tier 1 vs Tier 2.** The two tiers have very different design considerations; don't let them blur.
- **Curator forges a "GraphQL expert" that's really just a resolver-patterns expert.** We want the batching semantics, not schema design.
- **Judge produces insight too abstract to implement.** Insight must name the detection mechanism, the rewrite rule, and the escape hatch — not "some compiler analysis to batch queries."

## Links
- README feature entry: `docs/changelog.md` (Queued section)
- Spec: `compiler/SPEC.md` §14 (SQL contexts), §S21 (server/client boundary)
- Pipeline: `compiler/PIPELINE.md` (codegen stages)
- Related queued work: Lin Approach B at `../scrml-support/docs/deep-dives/lin-discontinuous-scoping-2026-04-13.md`

## Tags
#session-15 #plan #sql-batching #deep-dive #debate #staged-agents #action-required
