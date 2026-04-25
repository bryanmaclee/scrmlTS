# Kickstarter v0 — validation results (2026-04-25, S41)

**Setup:** 5 fresh Opus 4.7 general-purpose agents dispatched with the same 5 prompts as the cold-start experiments (TODO, auth, real-time chat, admin CRUD, reactive dashboard). This time agents (a) MUST read `docs/articles/llm-kickstarter-v0-2026-04-25.md` first and (b) MAY read the local repo (kickstarter, SPEC.md, examples/, samples/, stdlib/, README.md). This simulates the realistic adopter scenario — user clones the repo, LLM has access to everything.

**Hypothesis:** kickstarter v0 lifts compile probability from cold-start baseline (2-5%) to >50%.

---

## Headline result

| Build target | Cold-start (no kickstarter, no repo) | Validation (kickstarter + repo) | Lift |
|---|---|---|---|
| Reactive dashboard | 3% | **70% compile / 80% run** | ~23× |
| TODO app | 2-5% | **55-65% compile** | ~20× |
| Auth flow | 2% | **65% compile / 35% run** | ~17× |
| Admin CRUD | 3% | **55% compile / 65% run** | ~18× |
| Real-time chat | 2% | **45% compile / 35% run** | ~17× |

**Average compile probability: ~58%** vs **average cold-start: ~2-3%**. The hypothesis (>50% compile) is met across all 5 targets. **The kickstarter works.**

---

## Cross-cutting wins (every validation experiment did these correctly, every cold-start did them wrong)

- **No `import { ... } from 'scrml'`** invented imports — every agent went to `scrml:auth`, `scrml:router`, `scrml:time` correctly via §4 catalog
- **No `useState` / `signal()` / `ref()` / `$state()`** — `@var = ...` reactive declaration used universally
- **No `{#if}` / `{#each}` / `bind:value={x}` / `on:click={fn}`** — `<if test=>`, `<for each=>`, `bind:value=@x`, `onclick=fn()` used correctly
- **No `<script>` / `---` frontmatter** — `${ ... }` logic block inside `<program>` used correctly
- **No `import Database from 'better-sqlite3'`** — `< db src=...>` + `?{}` used correctly
- **No `.prepare()`** — straight `?{}.run()` / `.all()` / `.get()`
- **No CSRF code written** — kickstarter §3#7 directive ("you write zero CSRF code") was uniformly trusted
- **No `import 'bcrypt'` / `'jsonwebtoken'`** — `scrml:auth` discovered via §4
- **Real-time agent did NOT invent `room { broadcast event() }` DSL** — used `<channel>` correctly per anti-pattern table

These are the failure modes that uniformly killed the cold-start experiments. The kickstarter eliminates them across all five build types tested.

---

## Critical bugs in v0 (recipes that actively mislead)

These are not gaps — they are wrong content in v0 that needs immediate fix:

### Bug 1 — Auth recipe doesn't `await` async helpers
**Source:** validation 2 (auth flow).
**Symptom:** `scrml:auth` exposes `hashPassword` / `verifyPassword` as async (return Promises). The §6 auth recipe calls them without `await`. Result: `[object Promise]` is stored as the password hash. Silent footgun.
**Fix:** Add `await` to both call sites in §6 auth recipe, OR document scrml's auto-await behavior in server functions if that's the actual semantics.

### Bug 2 — Auth recipe missing JWT secret + TTL
**Source:** validation 2.
**Symptom:** `signJwt({ email })` in §6 omits secret + expiresIn. Real signature is `signJwt(payload, secret, expiresIn)`. Result: JWT signed with `undefined` — security footgun.
**Fix:** Update §6 to `signJwt({ email }, process.env.JWT_SECRET, 60 * 60 * 24 * 7)` (or whatever the canonical env var name is).

### Bug 3 — Real-time recipe wrong attribute name
**Source:** validation 3 (real-time chat).
**Symptom:** §6 real-time recipe uses `room="chat-room"`. SPEC §38.2 says the actual attribute is `topic=`. The agent had to read SPEC §38 to discover the recipe was wrong.
**Fix:** Change `room="chat-room"` to `topic="room-general"` in §6 real-time recipe.

### Bug 4 — Real-time recipe wrong handler form
**Source:** validation 3.
**Symptom:** §6 uses `onmessage="@messages = [...@messages, $.data]"` — a string-expression. SPEC §38.3 has no `onmessage` attribute at all. The actual attribute is `onserver:message=handler(msg)` (call-form with §38.6.1 parameter binding).
**Fix:** Replace string-expr with `onserver:message=onIncoming(msg)` plus a `function onIncoming(msg) { @messages = [...@messages, msg] }` declaration.

### Bug 5 — Real-time recipe omits `@shared`
**Source:** validation 3.
**Symptom:** SPEC §38.4 introduces `@shared messages = []` as a reactive-sync primitive — the IDIOMATIC primary path for chat-shaped problems. Manual `broadcast()` is the secondary path for events that shouldn't be reactive state. The kickstarter doesn't mention `@shared` at all, so the agent reached for the more complex manual-broadcast path.
**Fix:** Add `@shared` as the primary §6 real-time recipe; demote manual `broadcast` to "for non-state events."

---

## High-value gaps (fix in v1)

These are real omissions that cost agents accuracy or made them guess:

| # | Gap | Source | Notes |
|---|---|---|---|
| 1 | Add UPDATE example | TODO | Only INSERT/SELECT/DELETE shown in §1 skeleton |
| 2 | Session lifecycle subsection | auth | `session.set()`, `session.user`, `session.clear()`, cookie wiring |
| 3 | Multi-page routing primer | auth + admin | How `app.scrml` and `dashboard.scrml` connect |
| 4 | Schema cold-start | TODO + auth + admin | What happens when `tables=` references non-existent tables |
| 5 | Checkbox + boolean attribute example | TODO | `checked=${expr}` for `<input type="checkbox">` |
| 6 | `${expr}` in attribute strings | TODO + reactive | Does `class="x ${cond ? 'on' : ''}"` work? |
| 7 | Empty-state pattern in `<for>` | reactive + admin | `<if test=~xs.length === 0>` sibling shape |
| 8 | Side-effect / reactive-effect patterns | admin | When you need a side effect, what's the construct |
| 9 | Multi-statement `onclick=` body | reactive + auth | Only single-assignment inline form shown |
| 10 | `class:foo=cond` conditional class | reactive + admin | Form seen in samples but not kickstarter |
| 11 | Literal `$` before interpolation | reactive | How to write `$5.00` next to `${@var}` |
| 12 | Inline edit-vs-create form pattern | admin | Single form, two modes (`@editingId = null` vs id) |
| 13 | Boolean attr coercion | admin | Does `disabled=false` omit the attr? |
| 14 | Number coercion at number-input `bind:value` | admin | String or number? (affects SQL INSERT) |

---

## Clarifications needed

These are existing v0 statements that need rewording or expansion:

| # | Issue | Source |
|---|---|---|
| 1 | "Bare-call event handler with the event arg" paragraph in §7 has reversed "with parens" / "without parens" semantics | TODO |
| 2 | `==` lowering to `===` — client too or only server? | TODO |
| 3 | `</>` close-tag rule — works on any element or only `<program>`? | TODO |
| 4 | `<program>` "required" but emits W- not E- | TODO |
| 5 | `lift` overload — same keyword in data context (`lift ?{}.all()`) and markup context (`lift <li>`) | TODO |

---

## Recommendation: promote contact-book example into the kickstarter

The TODO agent's verbatim feedback:

> *"Strongly consider promoting the contact-book example into the kickstarter as the literal 'if you're building CRUD, copy this and rename.' That is exactly what I did."*

The contact-book example is already in §1 of the kickstarter (it's the canonical shape skeleton). But the agent's point is that it should be **explicitly framed** as "this is the template for any CRUD app — start from this and modify." Not as a feature tour, but as a starting template. Worth a wording revision in §1.

---

## What v1 should look like

A v1 patch (NOT a rewrite — the structure works) that:

1. **Fixes the 5 critical recipe bugs** (auth await, auth JWT secret, real-time topic=, real-time onserver:message=, real-time @shared)
2. **Adds 14 high-value sections** for the gaps above (UPDATE, session lifecycle, multi-page routing, schema cold-start, checkbox, attribute interpolation, empty-state, reactive-effect, multi-statement onclick, class:foo=, literal $, inline edit-vs-create, boolean coercion, number coercion)
3. **Clarifies 5 ambiguous statements** (bare-call/event arg, `==` lowering, `</>` rule, `<program>` warning vs error, `lift` overload)
4. **Reframes §1** as "start from this and rename" rather than feature tour

Estimated v1 length: ~9-11k tokens (still single-paste).

---

## Validation experiment 2 — should we re-run AFTER v1?

Yes. The expected lift from v0 → v1 is smaller than cold-start → v0 (the easy wins are gone), but each critical bug fix should bump the affected build's run probability by 10-30 points. If after v1 the average compile is >75% and average run is >65%, we have a kickstarter that genuinely solves Problem A (the build-prompt path).

Open questions still NOT addressed by either kickstarter version:

- **Problem B (discoverability/SEO/naming).** Kickstarter only helps users who already decided to try scrml. Users asking opinion-shaped questions still get "ghost" responses.
- **Cross-model behavior.** All experiments ran on Claude Opus 4.7. Whether GPT-4 / Gemini / smaller models confabulate (Path B) instead of refuse (Path A) is unverified.

---

## Files referenced in this validation

Each validation agent reported which repo files they read. Aggregated:

- `docs/articles/llm-kickstarter-v0-2026-04-25.md` — read by all 5 (required)
- `compiler/SPEC.md` §38 — read by real-time agent (to fix recipe bugs)
- `compiler/SPEC-INDEX.md` — read by real-time + admin agents
- `examples/02-counter.scrml` — read by reactive
- `examples/03-contact-book.scrml` — read by TODO + auth
- `examples/04-live-search.scrml` — read by reactive + admin
- `examples/06-kanban-board.scrml` — read by TODO
- `examples/07-admin-dashboard.scrml` — read by admin (most useful for that target)
- `examples/08-chat.scrml` — read by real-time
- `samples/compilation-tests/channel-basic.scrml` — read by real-time
- `samples/compilation-tests/combined-006-search-filter.scrml` — read by admin
- `samples/compilation-tests/combined-007-crud.scrml` — read by admin + auth
- `samples/compilation-tests/comp-012-pagination.scrml` — read by admin
- `samples/compilation-tests/sql-006-update.scrml` — read by TODO
- `stdlib/auth/index.scrml` + `password.scrml` + `jwt.scrml` — read by auth (necessary to fix kickstarter recipe bugs)
- `stdlib/time/index.scrml` — read by reactive

The examples directory was the most-used resource after the kickstarter itself. Worth investing in keeping examples current as canonical reference shapes.

---

## Tags
#experiment #validation #kickstarter-v0 #lift-confirmed #v1-patch-list #s41
