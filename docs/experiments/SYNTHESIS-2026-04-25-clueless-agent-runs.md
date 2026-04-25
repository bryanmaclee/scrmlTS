# Clueless-agent experiments — synthesis across 6 runs (2026-04-25, S41)

**Six experiments dispatched.** Five build prompts (TODO, auth, real-time, admin CRUD, reactive dashboard) + one opinion prompt (twitter-style rating). All on Opus 4.7 general-purpose agents. All forbidden from reading `/home/bryan-maclee/scrmlMaster/`. All allowed WebSearch + training data + ~10-30 min effort each.

This document synthesizes the convergent and divergent failure modes that feed the kickstarter v0.

## Convergence — what every build experiment did wrong

Every one of the five build experiments converged on the following failures, regardless of the build task:

### 1. Zero useful web hits
All five searches returned the same false friends:
- **srcML** — XML wrapper for source code
- **SCRML** — math markup
- **SML** — Standard ML (did-you-mean correction)
- **Standard ML / SCL / SCML-conference** — adjacent noise
- **github.com/scrml/scrml.github.io** — points to math-SCRML

WebFetch was either denied or returned the wrong project. **Conclusion: scrml has no usable web presence. The kickstarter is the ONLY upstream context an LLM will have.**

### 2. Self-assessed compile probability: 2-5% across all five
Each agent independently arrived at near-zero confidence its output would parse. None of them were wrong about that.

### 3. The framework chimera (universal)
Every agent reached for the same family — Svelte-shaped SFC + Vue/Solid/Preact-flavored reactivity + Next/SvelteKit routing + Prisma-shaped schemas + Astro-style layouts. Specific lifts per experiment:

| Experiment | Framework chimera composition |
|---|---|
| TODO | Astro frontmatter + Svelte template + SvelteKit `.server.js` endpoints + Next `[id]` |
| Auth | SvelteKit `load`/`action` + Remix-style colocated actions + Prisma schema + Rust `fn`/`->` |
| Real-time | Svelte SFC + Phoenix LiveView `room` blocks + Solid signals + custom `broadcast` DSL |
| Admin CRUD | Svelte + SvelteKit + Prisma `Product.find().orderBy()` + Astro layouts + JSX components |
| Reactive | Svelte SFC + Vue `ref().value` / Preact `signal().value` + Svelte `{#each}` + Svelte 5 `mount()` |

**The `.scrml` file extension is lexically priming "Svelte-shaped" in every model.** This is structural and reliable.

### 4. Convergent invented APIs (every experiment did at least 3 of these)

| Invention | Frequency | Real scrml has |
|---|---|---|
| `import { x } from 'scrml'` or `'scrml/...'` | **5/5** | npm package may not exist as named; canonical scrml has `<program>` + `${...}` |
| `signal()` / `effect()` / `computed()` w/ `.value` | 4/5 | `@var` reactive declarations + `~tilde` derived |
| `{#if}` / `{#each x as y}` Svelte template | 5/5 | `<if>` / `<for>` markup tags + `${expr}` |
| `bind:value={x}` two-way binding | 4/5 | `bind:value=@x` (different sigil) |
| `on:click={fn}` event syntax | 5/5 | `onclick=fn()` bare-call (per Bug A S34 fix) |
| SFC layout `<script>` + `<template>` + `<style>` | 5/5 | `<program>` root + `${...}` logic + `#{}` scoped CSS |
| File-based routing `routes/` or `src/pages/` | 4/5 | Different routing model (§20) |
| `[id]` dynamic route segments | 4/5 | Different param model |
| Co-located `.server.js` endpoints | 3/5 | `server fn` inside `<program>` |
| `<slot />` composition | 3/5 | Component slot system (§16) is different |
| Prisma-shaped model decorators | 3/5 | `<state>` blocks + `<db>` schema introspection (§14, §39) |
| `redirect()` / `error()` as bare functions | 3/5 | Different mechanism |
| `scrml dev` / `scrml build` / `scrml start` CLI | 5/5 | Has `dev`/`build`/`init`/`serve`; lucky guess |
| `defineConfig` from `'scrml/config'` | 2/5 | No such module |

### 5. Critical scrml-specific features ZERO experiments produced

Not one of the five experiments produced any of these:

- `<program>` root element — **W-PROGRAM-001 fires immediately on every output**
- `${ ... }` logic blocks
- `@var` reactive declarations
- `?{}` SQL blocks (everyone bolted on `better-sqlite3` or invented an ORM)
- `#{}` scoped CSS
- `<state>` blocks
- `<channel>` real-time primitive (real-time experiment invented a `room` DSL instead)
- `<request>` for declarative fetches
- `<machine>` for state machines
- `lin` linear types
- `^{}` meta-blocks
- The §53 inline-predicate type system

### 6. Things accidentally right (lucky)

- `.scrml` file extension (universal lucky guess)
- JSX-style `{expr}` interpolation (close to `${expr}`)
- HTML-in-source templating philosophy (right shape, wrong syntax)
- SQLite as the persistence choice (would compile via `?{}` rewrite)
- 303 redirect-after-POST (correct HTTP semantics)
- Form-POST progressive enhancement (philosophically aligned with scrml's boundary model)
- Argon2id for password hashing (matches `Bun.password` defaults)

## Divergence — failures specific to each domain

These didn't converge across all 5 but are the dominant failure modes when the prompt evokes them:

### Auth-specific
- **Invents own session table + cookie management** (SvelteKit/Remix shape)
- **Doesn't know about CSRF** — every output omitted CSRF entirely (real scrml has compiler-enforced + auto-mint-on-403)
- **Validation: ad-hoc `if` checks + a regex** — no sense of inline-predicate types or `scrml:data/validate` stdlib
- **Picks argon2 (correct) but invents `crypto.argon2` import path** — would fail; should be `Bun.password` or `scrml:auth`

### Real-time-specific
- **Invents `room { state {} on join() {} broadcast event(payload) }` DSL** — completely fabricated; the Phoenix LiveView lift is dominant
- **Mixes client signals with server-side state replication** without distinguishing — no concept of scrml's boundary model
- **Doesn't consider `<channel>` as a markup tag** — every agent treated real-time as a code primitive, not a markup tag
- **Invents `broadcast event_name(payload)` keyword** — completely cargo-culted

### Reactive-specific (the worst chimera area)
- **Mixes Vue `ref().value` + Solid `createSignal()` + Svelte 5 `$state()` + Preact `signal().value` in the same file**
- **Hand-rolls debounce inside `effect()`** — doesn't know about `@debounced` decorator
- **No concept of fine-grained reactivity at the markup level** — treats reactivity as code-level, not declaration-level

### Admin-CRUD-specific
- **Invents Prisma-shaped query API** (`Product.find({where}).orderBy().take()`) — universal lift from Prisma
- **Invents `$query.merge().pick()` for query-string handling** — fabricated stdlib
- **Half-baked action dispatch** — agents got confused about how POST actions route to handlers (a real bug in their mental model that's worth flagging)

## Opinion-surface findings (experiment 6 only)

The twitter-style-rate experiment showed that an LLM asked for an OPINION (vs. a build) takes one of two paths:

- **Path A (observed):** Honest skepticism. *"Hard to rate vibes on a ghost. 0 stars for discoverability."* Self-recognized that the OTHER path is the more likely failure mode.
- **Path B (hypothesized, not yet observed):** Sycophantic confabulation. *"Interesting niche language, curious about the type system, 7/10."*

A follow-up experiment that FORCES confabulation (e.g., "compare scrml to Astro") is needed to verify Path B is real. Recommend running before publishing the kickstarter.

The strategic finding from experiment 6:

> *"For a genuinely new language, the LLM-mediated discovery layer is now a gatekeeper, and 'no training data + bad SEO + name collisions' is a death sentence that has nothing to do with the language's merits. **If scrml is real and good, the team has a naming/marketing problem before they have a language problem.**"*

This decomposes the kickstarter problem into TWO problems:

| Problem | Surface | Solution shape |
|---|---|---|
| **A. Context-priming** | Build prompts ("build me X") | Kickstarter v0 (this synthesis) |
| **B. Discoverability** | Opinion prompts ("rate scrml") | Naming + SEO + canonical landing artifact |

The kickstarter solves A. It does NOT solve B. **A user who asks their LLM for an opinion gets "ghost" and never reaches the point of pasting a kickstarter.**

## Kickstarter v0 — required scope (derived from this data)

In priority order (ranked by which failure mode is universal vs. specific):

### Must cover in the first ~2k tokens (universal failures)

1. **Identity assertion.** "scrml is a new language. Web search for 'scrml' returns srcML (XML for source code) and SCRML (math markup) — both unrelated. This document is the canonical context. Do not search; do not pattern-match the name; do not assume similarity to Svelte just because the file extension is `.scrml`."

2. **The shape of a scrml file.** A complete annotated 30-50 line example showing `<program>`, `${...}` logic, `@var`, `?{}`, `#{}`, server fn, a component, a state machine. This is the positive shape against which all the chimeras get corrected.

3. **The "if you'd reach for X, use Y" anti-pattern table.** Compiled directly from the convergent inventions:

| Reaching-for (any framework) | Use in scrml |
|---|---|
| `<script setup>` / Astro `---` frontmatter | `<program>` + `${ ... }` logic block |
| `signal()`, `ref().value`, `useState()` | `@var = ...` reactive declaration |
| `computed()`, `$:`, `$derived` | `~derivedName = expr` tilde-derived |
| `{#if cond}...{/if}` | `<if test=cond>...</if>` |
| `{#each items as item}...{/each}` | `<for each=item in=items>...</for>` |
| `bind:value={x}` | `bind:value=@x` |
| `on:click={fn}` / `@click` | `onclick=fn()` |
| `import { db } from 'better-sqlite3'` | `<db src="./app.db" tables="users,posts">` + `?{}` blocks |
| `db.prepare(sql).all()` | `?{...}.all()` (NOTE: `.prepare()` is removed — E-SQL-006) |
| Prisma-shaped `Product.find({where})` | `?{SELECT * FROM products WHERE ...}` SQL block |
| `socket.io` / Phoenix Channels | `<channel>` markup tag (§38) |
| `useEffect(() => fetch(...))` | `<request url="..." into=@data>` |
| Co-located `.server.js` endpoint | `server fn name() { ... }` inside `<program>` |
| `import { defineConfig } from 'scrml/config'` | NO such module — config is different |

4. **The 8 questions answered up front** (from experiment 1's agent):
   - File extension: `.scrml`
   - Runtime: **Bun** (not Node)
   - DB layer: built-in `?{}` blocks against Bun.SQL — DO NOT npm install drivers
   - Form mutations: `server fn` declarations + bare-call event handlers
   - Template syntax: `${expr}` interpolation + `<for>`/`<if>` markup tags (NOT Svelte braces, NOT JSX)
   - Component model: `const Card = <article props={...}>...</>` (markup-defined components)
   - CSRF: compiler-enforced + automatic mint-on-403 + automatic retry (zero adopter work needed)
   - Type system: independent (§14 structs/enums, §53 inline predicates) — NOT TypeScript

5. **Stdlib catalog** (one-line each — kills the npm reach):
   - `scrml:data/validate` (replaces zod), `scrml:data/transform` (replaces lodash), `scrml:auth` (jwt + password + rate limiter + TOTP), `scrml:crypto`, `scrml:http`, `scrml:time`, `scrml:format`, `scrml:store`, `scrml:router`, `scrml:test`, `scrml:fs`, `scrml:path`, `scrml:process`.

6. **CLI catalog**: `scrml init` / `scrml dev` / `scrml build` / `scrml serve`.

### Domain-specific corrections (when prompt evokes the topic)

7. **Auth recipe** (when prompt mentions login/signup/sessions): one canonical 30-line scrml login flow using `scrml:auth` + `?{}` + boundary security. Counters the SvelteKit-shaped invention.

8. **Real-time recipe** (when prompt mentions chat/live/push): one canonical `<channel>` example. Counters the invented `room` DSL.

9. **Reactive recipe** (when prompt mentions counters/derived/debounce): one canonical example showing `@var`, `~derived`, `@debounced`. Counters the Vue/Solid/Preact mix.

### Known traps (every adopter LLM will hit at least one)

10. **`.prepare()` is gone** — emits E-SQL-006. Use template-string SQL blocks.
11. **`==` in server fn** — landed today (S41), but agents may emit it. Helper is now inlined (GITI-012 fix).
12. **Arrow returning object literal** — `f => ({ ... })` parens preserved in scrml (GITI-013 fix S41); some emitters might still strip.
13. **No `import { x } from 'scrml'`** — the package is laid out differently.

## Token budget estimate

Sections 1-6 (universal): ~5-7k tokens.
Sections 7-9 (domain-specific recipes): ~3-4k tokens (or split into separate primer files).
Section 10 (traps): ~500 tokens.

**Total: 8-12k tokens for v0.** Single-paste friendly.

## Recommended next moves (in order)

1. **Run experiment 7: forced-confabulation opinion prompt.** "Compare scrml to Astro for building a small SaaS." Validates whether sycophantic confabulation (Path B) is real. Important data; ~10 min agent dispatch.
2. **Draft kickstarter v0** from this synthesis. ~30-60 min PA work.
3. **Validation experiment.** Re-run one of the build prompts (TODO is fine) WITH the kickstarter v0 in front. Measure compile probability. If it goes from 2-5% to >50%, ship the kickstarter.
4. **Strategic decision (separate from kickstarter):** discoverability + naming. Out of scope for tonight; flag for future session.

## Tags
#experiment #llm-kickstarter #synthesis #failure-modes #convergent #divergent #strategic-finding #s41
