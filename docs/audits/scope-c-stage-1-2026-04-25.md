# Scope C Stage 1 — Inventory + Coverage Audit

**Run:** 2026-04-25 (S42)
**Compiler SHA:** `b1ce432`
**Baseline:** 7,852 / 40 / 0 across 372 test files
**Authorization:** S41 hand-off — full Scope C audit, multi-session
**Expanded scope (S42):** examples must be (1) correct, (2) recent canonical, (3) collectively cover the whole spec at the corpus level. See `scrml-support/user-voice-scrmlTS.md` §S42.

---

## §1. Per-example status (14 examples)

For each example: compile result at `b1ce432`, canonicality verdict against current spec, suspected issues. Compile artifacts written to `/tmp/scope-c-compile-logs/`.

### 01-hello.scrml — **CLEAN**, canonical
- **Compile:** clean, 43.5ms
- **Demonstrates:** `<program>`, three closer forms (`</tag>`, `/`, `</>`), Tailwind utilities, `//` comments
- **Canonicality:** ✅ Recent. Header comment matches behavior.
- **Issues:** none

### 02-counter.scrml — **CLEAN**, canonical
- **Compile:** clean, 78.4ms
- **Demonstrates:** `@var` declaration, mutation, `${@count}` interpolation, `bind:value=@step`, `onclick=increment()` (bare-call event handler — Bug A S34 fix), `<input type="number">`
- **Canonicality:** ✅ Uses current bare-call event handler form. Header comment accurate.
- **Issues:** none

### 03-contact-book.scrml — **CLEAN**, canonical (rich)
- **Compile:** clean, 103.5ms
- **Demonstrates:** `< db src=... protect="..." tables="...">` state block, `?{}` SQL with `${}` bound params, `.run()` / `.all()`, `server function`, `lift` in `for` loop, `${render expr}`-free markup, `#{}` scoped CSS, `<form onsubmit=...>`, `auth="required"` attribute on `<program>`
- **Canonicality:** ✅ Rich and current. This is the file the kickstarter v0 §1 uses as the canonical shape. Reference example.
- **Issues:** none

### 04-live-search.scrml — **CLEAN**, canonical
- **Compile:** clean, 68.1ms
- **Demonstrates:** `@query` reactive bind, `for/lift/if (continue)` filtering, derived computation (`q = @query.toLowerCase()`), pure-Tailwind styling
- **Canonicality:** ✅ Header comment mentions `class:highlighted=` but the example doesn't actually use it. **Minor doc drift** — comment promises a `class:highlighted` toggle but body uses static class.
- **Issues:** Comment mentions `class:highlighted` not actually present in body — header inaccuracy

### 05-multi-step-form.scrml — **FAIL**, partially stale
- **Compile:** ❌ `E-COMPONENT-020`: `InfoStep` is not defined when used. Pre-existing across S39/S40/S41/S42.
- **Demonstrates (intent):** `type:enum`, `match` exhaustive dispatch, multi-component file, `class:active=(...)` dynamic class, `lift <ComponentRef>` inline rendering, `dl/dt/dd` semantic, multi-step state transitions
- **Canonicality:** Header says "lin one-shot submission token" but the body uses `@submitted = false` plain reactive, NOT a `lin` token. **Header is stale** — `lin` was probably planned then dropped. The actual implementation uses a plain reactive guard.
- **Issues:**
  - Forward-reference compile failure (component used in markup before its `${}` declaration block)
  - Header comment promises `lin` but body doesn't use it
  - No `props={...}` on the step components — they read free `@firstName`/`@lastName`/etc. directly. Per §15 components, props would be the canonical pattern.

### 06-kanban-board.scrml — **CLEAN**, canonical
- **Compile:** clean, 95.8ms
- **Demonstrates:** `type Status:enum = .Todo | .InProgress | .Done` (short form, distinct from §05's brace form), `@cards = [...]` array reactive, `.map()` mutation (immutable update), `for / if (continue) / lift`, `#{}` grid layout
- **Canonicality:** ✅ Both enum syntaxes (brace + bar) are spec-valid per §14. Body uses the bar form.
- **Issues:** Header says "match dispatch" but body uses `if (continue)` filtering, NOT `match`. Header inaccuracy.

### 07-admin-dashboard.scrml — **CLEAN**, partially stale
- **Compile:** clean, 108.1ms
- **Demonstrates:** `type:struct`, `< db ... protect=... tables=...>`, `?{}` SQL with multi-param interpolation (`${@search}` + LIKE patterns + filter), `<input type="search">`, `<select>` with options, `<table>`, dynamic `class="badge badge-${user.role}"` interpolated CSS class
- **Canonicality:** ⚠️ Header says "compile-time metaprogramming for a data table" via `^{}` + `reflect()` + `emit()` but the **body does NOT use any meta blocks**. Comment line 21 says "(A `^{}` meta block could generate these at compile time… see example 11)" — promises a feature this example doesn't deliver. Should either be refactored to actually use meta or rewritten to honest scope.
- **Issues:**
  - Header oversells — "metaprogramming for a data table" but no `^{}` block exists
  - Stale-shape: hand-coded `<th>Username</th><th>Email</th>...` would be a great target for `^{ for(field of reflect(User).fields) emit(\`<th>${field.name}</th>\`) }` — exactly the pattern example 11 demonstrates. Refresh would deliver on the header's promise.

### 08-chat.scrml — **CLEAN at compile**, **stale shape**, runtime bug
- **Compile:** clean, 98.5ms
- **Demonstrates:** `< db tables=...>`, `?{}` INSERT/SELECT, `@messages = []` array, optimistic spread mutation `[...@messages, msg]`, `class:mine=mine`, `<textarea>` with `onkeydown=`, `if=(@draft.trim().length > 0)` button gating, `crypto.randomUUID()`, `new Date().toISOString()`
- **Canonicality:** ❌ **Major stale-shape.** This is a chat app that does NOT use real-time. Per S41 finding + SPEC §38, real-time problems should use `<channel>` + `@shared` (§38.4). This example uses optimistic-update + DB persistence with no broadcast — a single-user chat. **Two messages from different users won't sync.** Either the example should be renamed "message log" or rewritten to use §38 channels.
- **Issues:**
  - `formatTime(msg.sent_at)` is called but never defined — compiles (function-as-runtime-ref) but will runtime-error
  - `if (@messages.length == 0) { @messages = loadMessages() }` runs at top-level inside `${ }` — this is the "seed on first render" pattern. Per §6, top-level `${}` runs once at mount; reasonable. But unusual against the more common pattern of explicit `loadMessages()` call from a button or `<for>` empty-state.
  - **Does not exercise §38 channels/`@shared` at all** — the canonical real-time path is unrepresented in any example

### 09-error-handling.scrml — **CLEAN**, canonical
- **Compile:** clean, 110.7ms
- **Demonstrates:** `type ContactError:enum = { ... renders <p>...</> }` enum variants with `renders` clauses (§19), `fail ContactError::EmptyName` keyword + scoped variant ref, `validate()! -> ContactError` failable signature, `submit(...)! -> ContactError` server failable, `!{ | ::EmptyName -> {...} | _ -> {...} }` exhaustive error handler, `< errorBoundary>` wrapper, `disabled=@sending`, conditional rendering via `if=@submitted` and `if=(!@submitted)`
- **Canonicality:** ✅ Uses §19 cleanly. Multiple branches in the `!{}` block all set `@sending = false` — pedagogically useful but minor: in real code you'd often have a single bare `_` arm. Acceptable as teaching shape.
- **Issues:** none significant

### 10-inline-tests.scrml — **WARN**, possible compiler bug
- **Compile:** clean output, **14 W-LINT-013 warnings**
- **Demonstrates:** `~{ "test name" test "case" { assert ... } ... }` test sigil syntax (§32 ~ keyword)
- **Canonicality:** ✅ Test syntax matches §32. The `~{}` block contents demonstrate `assert @count == N` reading reactive state.
- **Issues:**
  - **W-LINT-013 misfires 14 times** on `assert @count`/`@step` reads inside the test block. Lint message: "Found '@click="handler" (Vue event shorthand)' — scrml uses 'onclick=handler()'" — the lint thinks `@count` is Vue's `@click` shorthand. **This is a likely compiler ghost-pattern lint scoping bug** — the lint should not fire on `@reactive` reads, only on attribute syntax `@event=`. Filing recommended.

### 11-meta-programming.scrml — **CLEAN**, canonical
- **Compile:** clean, 81.2ms
- **Demonstrates:** `^{}` meta block runtime classification (compile-time when no runtime references), `emit(\`...\`)` markup splice, `reflect(Token)` type registry lookup, `for (const field of info.fields)` compile-time iteration, `type Token:struct = {...}`, `<details>/<summary>` semantic HTML, `<table>` compile-time row generation
- **Canonicality:** ✅ Clean §22 demo. The `<details>` debug-table is a good "compile-time generated UI" pattern.
- **Issues:** none

### 12-snippets-slots.scrml — **CLEAN**, mostly canonical
- **Compile:** clean, 88.8ms
- **Demonstrates:** `props={ header: snippet, body: snippet, actions?: snippet }` (§15), `${render header()}` and `${render body()}` render-snippet calls (§16), `slot="name"` attribute on call-site children, optional slot (`actions?`), `${children}` (§16 unnamed children — though this example only USES it not really), `if=(not (actions is not))` presence check via §42 `not` keyword, `for (u of @users)` iteration with components, `<dl><dt><dd>` definition list semantic HTML, `<a href="mailto:...">` interpolated href
- **Canonicality:** ⚠️ The presence check `if=(not (actions is not))` (double-negation) is technically valid §42 but reads awkwardly. The more canonical form per §42.2.4 is `is some` — i.e. `if=(actions is some)`. Worth refactoring.
- **Issues:**
  - Awkward `not (actions is not)` instead of `(actions is some)`
  - `${children}` is referenced in Card body but no example call-site uses unnamed children — slot is declared but unfilled. Pedagogically incomplete.

### 13-worker.scrml — **CLEAN**, canonical
- **Compile:** clean, 90.2ms
- **Demonstrates:** `<program name="primes">` nested program (§43), `function sieve(limit: number) -> number[]` typed function with array return, `when message(data) { ... }` worker-side message handler, `send(...)` worker-to-parent reply, `<#primes>.send({...})` parent-to-worker call, `when message from <#primes> (data) { ... }` parent-side reply handler (§46), `when error from <#primes> (e) { ... }` worker error capture, `if=(@result is not not)` presence check (§42)
- **Canonicality:** ⚠️ Same awkward double-negation: `is not not`. The canonical form is `is some`. Otherwise good demo of §43/§46 worker lifecycle.
- **Issues:**
  - `is not not` should be `is some` (twice in this file)
  - Comment promises typed messaging but the actual `data` parameter is untyped on both sides — could be illustrative to add `(data: { limit: number })` to show typed worker channels

### 14-mario-state-machine.scrml — **WARN**, mostly canonical
- **Compile:** clean output, **2 W-LINT warnings**
- **Demonstrates:** `< machine name=MarioMachine for=MarioState>` machine declaration (§51), `< machine name=HealthMachine for=HealthRisk derived=@marioState>` derived machine (§51.9), `type PowerUp:enum = { Mushroom(coins: number) ... }` enum payload variants, `match powerUp { .Mushroom(n) => {...} }` payload destructuring (§18), `const @marioName = match @marioState { ... }` derived reactive via const-reactive (§6.6), `fn riskBanner(risk: HealthRisk) -> string { match ... }` pure function with §48 + §18, `@marioState: MarioMachine = MarioState.Small` machine-typed reactive, `@gameOver` boolean reactive, `<button onclick=${eatPowerUp(PowerUp.Mushroom(1))}>` interpolated handler (with `${}` wrapping), `if=(@gameOver == false)`, `<div if=(...) ...>` conditional element
- **Canonicality:** ⚠️ The `onclick=${eatPowerUp(PowerUp.Mushroom(1))}` form (with `${}` wrapping the call) appears alongside the bare-call form `onclick=increment()` from example 02. **Two different idioms in the corpus.** Per S34 Bug A, `onclick=fn()` is the bare-call canonical; `${...}` wrapping is the older form. Worth normalizing.
- **Issues:**
  - W-LINT-007 line 5 misfires on a comment block (header text mentions `prop={val}` as Vue example) — lint scans comment text, **likely ghost-pattern lint scoping bug** (same family as ex10 W-LINT-013 issue)
  - W-LINT-013 line 144 misfire on `if=(@healthMachine == HealthRisk.AtRisk && ...)` — lint sees `@health…` and flags as Vue `@click`
  - Mixed event-handler idiom vs example 02 (bare-call)

---

## §2. Spec → Example coverage matrix

For each spec section, which example(s) demonstrate it. Key: ✅ = demonstrated; ⚠️ = partial / weak demo; ❌ = no example covers it.

| § | Section | Coverage | Examples |
|---|---|---|---|
| 1 | Overview | n/a (prose) | — |
| 2 | File Format and Compilation Model | ✅ | All 14 |
| 3 | Context Model | ✅ | All 14 (implicit) |
| 4 | Block Grammar (closer forms, PA rules) | ✅ | 01 (explicit demo of three closers); all 14 (implicit) |
| 5 | Attribute Quoting Semantics | ✅ | 02 (bind:value, bare-call onclick), 04 (class:), 05 (class:active), 08 (class:mine) |
| 5.2.2 | Event handler binding (bare-call) | ✅ | 02, 03, 04, 05, 06, 07, 08, 09, 14 |
| 6 | Reactivity `@` sigil | ✅ | 02, 03, 04, 06, 08, 09, 10, 14 |
| 6.5 | Reactive arrays / mutation | ✅ | 06 (`.map()` + reassign), 08 (`[...@arr, x]` spread) |
| 6.6 | Derived reactives (`const @x = ...`) | ✅ | 14 (`const @marioEmoji`, `const @marioName`) |
| 6.7.8 | `<timeout>` single-shot | ❌ | none |
| 7 | Logic Contexts `${}` | ✅ | All except 01 |
| 7.6 | File-level scope sharing | ⚠️ | implicit only |
| 8 | SQL Contexts `?{}` | ✅ | 03, 05, 07, 08 |
| 8.9 | Per-handler coalescing | ❌ | none (compiler-internal optimization, not user-visible) |
| 8.10 | N+1 loop hoist | ❌ | none |
| 8.11 | Mount hydration | ❌ | none |
| 9 | CSS Contexts `#{}` | ✅ | 03, 05, 06, 07, 08, 11, 12, 14 |
| 9.1 | Inline CSS within markup | ⚠️ | 11 uses inline `style=`; no `#{}`-in-markup demo |
| 10 | `lift` keyword | ✅ | 03, 04, 05, 06, 08 |
| 10.8 | Lift accumulation order | ⚠️ | implicit only — no example exercises ordering edge cases |
| 11 | State Objects + `protect=` | ✅ | 03, 07 |
| 12 | Route Inference | ✅ | 03, 05, 07, 08 (server functions implicit) |
| 12.5 | Server return values | ✅ | 03, 07 (`lift ?{...}.all()` returns) |
| 13 | Async Model (no async/await) | ✅ | 03, 05, 07, 08 (every server function call) |
| 13.5 | RemoteData enum | ❌ | **GAP** — no example shows `RemoteData` loading-state handling |
| 14 | Type System (struct, enum) | ✅ | 05 (enum brace form), 06 (enum bar form), 07 (struct), 09 (enum payload + renders), 11 (struct + reflect), 12 (struct), 14 (enum payload + struct) |
| 14.3.2 | Enum fields as struct fields | ❌ | none |
| 15 | Component System | ⚠️ | 05 (broken — forward-ref), 12 (cleanest demo). Most other examples use inline markup, not components. |
| 15.13 | Component reactive scope | ⚠️ | 05 component bodies read free `@vars` — implicit, not labeled |
| 16 | Component Slots | ✅ | 12 |
| 17 | Control Flow (if/show, for, iteration) | ✅ | 04, 05, 06, 08, 09, 13, 14 |
| 17.6 | if-as-expression | ⚠️ | 09 uses `${@sending ? "..." : "..."}` (ternary); no `${if (cond) ... else ...}` expression form demo |
| 18 | Pattern Matching + Enums | ✅ | 05 (match Step), 14 (match payload variants, match in fn) |
| 18.17 | `is` operator | ⚠️ | 12 (`actions is not`), 13 (`@result is not not`) — both negative-form |
| 18.18 | Partial match | ❌ | none |
| 19 | Error Handling (fail, ?, !, errorBoundary, renders) | ✅ | 09 |
| 19.10.5 | Implicit per-handler tx | ❌ | none |
| 20 | Navigation API (navigate(), route params) | ❌ | **GAP** — no example shows multi-page routing or `navigate()` |
| 21 | Module + Import System | ❌ | **GAP** — no example shows `import` / `export` between scrml files |
| 22 | Metaprogramming `^{}` | ✅ | 11 (full demo) |
| 23 | Foreign Code `_{}` | ❌ | **GAP** — no example shows opaque passthrough or WASM sigils |
| 23.3 | WASM sigils | ❌ | none |
| 23.4 | Sidecars / `use foreign:` | ❌ | none |
| 24 | HTML Spec Awareness | ✅ | implicit in all |
| 25 | CSS Variable Syntax | ❌ | **GAP** — no example uses `--var` style CSS variables |
| 26 | Tailwind Utility Classes | ✅ | 01, 02, 04, 09, 10, 13, 14 |
| 27 | Comment Syntax `//` | ✅ | All 14 |
| 28 | Compiler Settings | ❌ | none |
| 29 | Vanilla File Interop | ❌ | none |
| 30 | `bun.eval()` | ❌ | **GAP** — no example shows compile-time eval |
| 31 | Dependency Graph | n/a (compiler-internal) | — |
| 32 | `~` Keyword (pipeline accumulator, lin var, inline tests) | ⚠️ | 10 (inline tests only — `~{}` test sigil); pipeline accumulator + lin variable not shown |
| 33 | `pure` Keyword | ⚠️ | 14 uses `fn` (§48) which is the §33.6 alias; no `pure` keyword direct |
| 34 | Error Codes | n/a (reference) | — |
| 35 | Linear Types `lin` | ❌ | **GAP** — no example demonstrates `lin` (05 header promises but body doesn't deliver) |
| 36 | Input State Types `<keyboard>/<mouse>/<gamepad>` | ❌ | **GAP** |
| 37 | Server-Sent Events `server function*` | ❌ | **GAP** — no SSE example |
| 38 | WebSocket Channels `<channel>` + `@shared` | ❌ | **CRITICAL GAP** — chat example (08) should use this but doesn't. Real-time path unrepresented. |
| 39 | Schema and Migrations `< schema>` | ❌ | **GAP** — no example shows `<schema>` declaration or migration diff |
| 40 | Middleware and Request Pipeline | ❌ | **GAP** — `handle()` escape hatch unrepresented |
| 41 | Import System `use`/`import` (capability vendoring) | ❌ | **GAP** — `use foreign:`, capability imports not shown |
| 42 | `not` — Unified Absence | ⚠️ | 12 (`not (actions is not)`), 13 (`is not not`) — both via awkward double-negation. `is some` form not shown |
| 42.2.4 | Compound `is not` / `is some` | ❌ | none |
| 43 | Nested `<program>` | ✅ | 13 (worker) |
| 44 | `?{}` Multi-Database Adaptation (Bun.SQL) | ⚠️ | 03/07/08 use SQLite (`*.db`); no Postgres / MySQL example showing the URI-scheme selection. `.get()` → `T \| not` not shown. |
| 45 | Equality Semantics (single `==`) | ✅ | 03, 06, 08, 14 (all use `==`) |
| 46 | Worker Lifecycle (`when ... from <#name>`) | ✅ | 13 |
| 47 | Output Name Encoding | n/a (compiler-internal) | — |
| 48 | `fn` Pure Functions | ✅ | 14 (`fn riskBanner`) |
| 49 | `while` and `do...while` Loops | ❌ | **GAP** — only `for` shown, no while loop example |
| 50 | Assignment as Expression | ⚠️ | implicit in some idioms; no explicit demo |
| 51 | State Transition Rules / `< machine>` | ✅ | 14 (full demo + derived machine) |
| 51.9 | Derived/projection machines | ✅ | 14 (`HealthMachine` derived from `@marioState`) |
| 51.11 | Audit clause | ❌ | none |
| 51.12 | Temporal transitions (`after Ns =>`) | ❌ | **GAP** |
| 51.13 | Auto-property-tests (`--emit-machine-tests`) | ❌ | none (CLI feature, not source-level) |
| 51.15 | Three-sites cross-check | ❌ | none |
| 52 | State Authority Declarations (server `@var`) | ❌ | **GAP** — no example shows two-tier state authority |
| 53 | Inline Type Predicates / value constraints / SPARK zones | ❌ | **GAP** |
| 54 | Nested Substates and State-Local Transitions | ❌ | **GAP** |

### Coverage summary
- ✅ Demonstrated (well): 23 sections
- ⚠️ Partial / weak: 14 sections
- ❌ Gap: 17 sections (of which **8 are flagged as critical or kickstarter-blocking** below)

---

## §3. Critical coverage gaps (priority order)

These gaps block the kickstarter v1 + matter for adopters most:

1. **§38 WebSocket Channels (`<channel>` + `@shared`)** — real-time path entirely unrepresented. The closest existing example is 08 (chat) but it does NOT use channels. **Highest priority gap.** Adopters reaching for "real-time" today get a non-real-time stale shape.
2. **§35 Linear Types (`lin`)** — example 05 header promises this but body doesn't deliver. No working `lin` demo in the corpus.
3. **§39 Schema and Migrations (`< schema>`)** — schema cold-start / DB initialization is one of the kickstarter v1 gaps S41 already flagged. No example shows it.
4. **§20 Navigation API + multi-page routing** — flagged by S41. Auth + admin clueless-agent runs both struggled with multi-page. No canonical example.
5. **§21 / §41 Module + Import System** — no example shows multi-file scrml apps. Adopters don't see how `import` / `use` works.
6. **§52 State Authority Declarations (server `@var`)** — two-tier state authority is a major scrml feature unrepresented.
7. **§13.5 RemoteData / loading state** — `RemoteData` enum is the canonical loading/error state pattern; no example uses it. Server-call UX patterns are invisible.
8. **§40 Middleware (`handle()` escape hatch)** — auth middleware was flagged in S41 as a gap; no example.

Lower-priority gaps (nice-to-fill):
- §6.7.8 `<timeout>` single-shot — common UI pattern
- §17.6 if-as-expression — pattern not demonstrated despite being canonical for §6 derived
- §18.18 partial match
- §23 Foreign Code `_{}` + WASM sigils
- §25 CSS Variable Syntax
- §30 `bun.eval()`
- §36 Input State Types
- §37 SSE
- §49 while loops
- §51.12 temporal transitions
- §53 Inline Type Predicates / SPARK
- §54 Nested substates

---

## §4. Compiler issues surfaced by this audit

### Issue A — W-LINT-013 misfires on `@reactive` reads (examples 10, 14)
The lint says "Found '@click="handler" (Vue event shorthand)' — scrml uses 'onclick=handler()'" but fires on:
- `assert @count == 0` inside `~{}` test blocks (ex10, 14 misfires)
- `if=(@healthMachine == HealthRisk.AtRisk && @gameOver == false)` (ex14 line 144)

Root cause hypothesis: the ghost-pattern lint scans for `@<ident>=` but isn't context-aware enough — it should only fire on attribute-position `@event="..."`, not on `@reactive` reads in expressions or test bodies.

**Recommendation:** file as compiler bug. Likely a Stage 1 finding worth a dedicated intake.

### Issue B — W-LINT-007 fires on comment text (example 14)
Header comment line 5 (text says `<Comp prop={val}>`) triggers the "scrml uses `<Comp prop=val>`" lint. Comments are universal `//` per §27 and should be excluded from ghost-pattern scans.

**Recommendation:** file as compiler bug — lint should skip `//` comment regions.

### Issue C — Example 05 forward-ref (E-COMPONENT-020)
Pre-existing across S39/S40/S41/S42. Component declarations live in `${ }` blocks AFTER the markup that uses them. Either: (a) refactor 05 to put components first, or (b) the compiler should support forward-ref resolution.

**Recommendation:** quickest path — refactor the example to declaration-before-use. Compiler change (b) is bigger architectural decision.

---

## §5. Per-example refresh recommendations (Stage 3 input)

### Refresh-needed (header drift / minor stale)
- **04 (live-search)** — fix header to match body (no `class:highlighted`)
- **05 (multi-step-form)** — refactor declaration order to fix E-COMPONENT-020; remove `lin` claim from header OR add `lin` properly; consider props-based component pattern
- **06 (kanban-board)** — fix header ("match dispatch" claim) OR add a real `match` demo
- **07 (admin-dashboard)** — deliver on the metaprogramming promise OR rewrite the header
- **12 (snippets-slots)** — change `not (actions is not)` → `(actions is some)`; add an unnamed-children call site
- **13 (worker)** — change `is not not` → `is some` (twice)
- **14 (mario-state-machine)** — normalize `onclick=${...}` → bare-call form to match other examples

### Refresh-needed (structural)
- **08 (chat)** — either rename to "message log" + define `formatTime`, OR rewrite using §38 channels + `@shared` (the latter doubles as filling the §38 gap)

### New examples needed (from §3 critical gaps)
- **§38 channels + @shared** — real-time chat (could replace or pair with 08)
- **§35 `lin`** — one-shot submission token (the original 05 promise) OR a payment / single-action UI
- **§39 `< schema>` + migrations** — schema cold-start example
- **§20 navigation + multi-page** — multi-page app skeleton
- **§21 / §41 multi-file** — `import`/`use` between two scrml files
- **§52 state authority** — server-authoritative `@var` demo
- **§13.5 RemoteData** — loading/error UX

---

## §6. Sample classification (results from background agent)

Classification agent ran at S42 open. Full report: `docs/audits/scope-c-stage-1-sample-classification.md`. Raw data + scripts at `docs/audits/.scope-c-audit-data/`. Highlights:

### Bucket totals (drift from S41-close baseline)
| Bucket | S41 close | S42 actual | Δ |
|---|---|---|---|
| Clean | 27 | **22** | −5 |
| Warn-only | 224 | **229** | +5 |
| Fail | 24 | **24** | 0 |

The 5-sample shift from clean → warn is `W-PROGRAM-001` (no `<program>` root) firing on samples that previously didn't trigger it. No FAIL regressions.

### Failing samples — 24 (1 real negative test, 23 stale)

**Only 1 of 24 fails is a real negative test:** `lin-002-double-use.scrml` (`E-LIN-002`, intentional `lin` reuse). The other 23 are stale — almost all `E-SCOPE-001` from the post-S20 strict-scope tightening (missing `@` sigil on reactive vars in attribute values).

Stale-failure clusters by root cause:
- **12 of 24** share the post-S20 strict-scope drift (missing `@` on reactive vars in attrs) — single batch refresh would clear them. Files: `combined-012-login`, `comp-004-modal`, `comp-006-alert`, `comp-009-dropdown`, `comp-013-tooltip`, `component-scoped-css`, `css-scope-01`, `func-007-fn-params`, plus 7 `gauntlet-r10-*` and `protect-001-basic-auth`, `modern-006-canvas-with-helpers`.
- **3** stale meta-block idiom: `meta-004/005/010-*` use `bun.eval` inside `^{}` in a now-superseded form
- **2** S79 gauntlet attempts that hit different errors: `gauntlet-s79-signup-form` (`E-TYPE-025`), `gauntlet-s79-theme-settings` (`E-SYNTAX-002` — `lift` in standard function body)
- **1** superseded by gauntlet-s20 variant: `channel-basic.scrml`

### Warning-only samples — 229 (~98% systemic on one warning code)

| Warning | Count | Verdict |
|---|---|---|
| **`W-PROGRAM-001`** | 224 | **Systemic** — fires whenever a sample lacks `<program>` root. ~98% of the warn bucket. Either the warning's threshold is too aggressive for sample-corpus context (basic-* / control-* / etc. don't need `<program>` wrapping for syntax tests) or the entire corpus needs mass `<program>`-wrapping. |
| `W-LINT-007` | 9 | Stale-shape — flags `<Comp prop={val}>` JSX braces |
| `W-CG-001` | 5 | Testing-of-warnings — `<sql>` top-level block suppression |
| `W-LINT-013` | 4 | Stale-shape — flags Vue-style `@click=` shorthand. **Same lint that misfires on examples 10 and 14 (see §4).** |
| `W-AUTH-001` | 3 | Systemic on protect/server — auto-injected auth middleware |
| `W-LINT-002` | 2 | Stale-shape — flags `oninput=${e => @x = e.target.value}` instead of `bind:value=@x` |

Bucket breakdown:
- **systemic-warning: 209** files (W-PROGRAM-001-only)
- **stale-shape: 14** files (W-LINT-002/007/013 + a few mixed)
- **testing-of-warnings: 6** files (`server-002/003-protect`, `sql-005/006/007/010-*`)
- **unknown: 0**

### Three big takeaways from the sample audit
1. **W-PROGRAM-001 dominates the warning bucket (224/229 ≈ 98%).** Decision needed: soften the warning's scope (don't fire on syntax-fragment samples) OR mass-migrate the corpus. Either way, this single decision clears most of the warn bucket.
2. **The "24 failing samples" are not a bug-tracking corpus** — only 1 is intentional. The other 23 represent technical debt from the S20 strict-scope tightening that was never paid down. A focused batch refresh against current scope rules would clear most of them.
3. **W-LINT-013 misfires here too.** Examples 10 and 14 are not isolated cases — the same lint hits 4 more samples. Strong signal that this lint's pattern-match needs context-scoping. Confirms §4 Issue A as a real compiler intake.

---

## §7. Stage 1 → Stage 2 / Stage 3 handoff

Stage 1 produces (this doc):
1. ✅ Per-example status (§1)
2. ✅ Spec → example coverage matrix (§2)
3. ✅ Critical gap list (§3)
4. ✅ Compiler issues for separate intake (§4)
5. ✅ Refresh recommendations (§5)
6. ⏳ Sample classification (§6 — pending agent)

Feeds into:
- **Stage 2** (spec cross-reference matrix for kickstarter v0): use §2 of this doc as the example-side of the matrix
- **Stage 3** (refresh stale examples + add missing): use §5 directly as the work list
- **Issue intakes** (separate from Stage 2/3): §4 generates 3 candidate compiler intakes (W-LINT scoping × 2 + E-COMPONENT-020 forward-ref disposition)

---

## Tags
#scope-c #stage-1 #docs-audit #example-status #coverage-matrix #kickstarter-blocking-gaps #w-lint-013-misfire #w-lint-007-misfire #e-component-020

## Links
- [pa.md](../../pa.md)
- [hand-off.md](../../hand-off.md) — S42 active
- [handOffs/hand-off-42.md](../../handOffs/hand-off-42.md) — S41 closed (Scope C plan in §2)
- [compiler/SPEC.md](../../compiler/SPEC.md)
- [compiler/SPEC-INDEX.md](../../compiler/SPEC-INDEX.md)
- [examples/README.md](../../examples/README.md)
- [docs/articles/llm-kickstarter-v0-2026-04-25.md](../articles/llm-kickstarter-v0-2026-04-25.md) — kickstarter v0 (has known bugs)
- [docs/experiments/SYNTHESIS-2026-04-25-clueless-agent-runs.md](../experiments/SYNTHESIS-2026-04-25-clueless-agent-runs.md)
- [docs/experiments/VALIDATION-2026-04-25-kickstarter-v0.md](../experiments/VALIDATION-2026-04-25-kickstarter-v0.md)
- `scrml-support/user-voice-scrmlTS.md` §S42 — corpus-coverage directive
