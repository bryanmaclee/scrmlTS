# Corpus Rewrite — Wave 1 SCOPE (the four Tier-1 flagship rewrites)

**Status:** in-progress (rulings pending)
**Date:** 2026-06-15 (S195)
**Change-id:** `corpus-rewrite-wave1-2026-06-15`
**Authority:** `scrml-support/docs/deep-dives/example-corpus-idiomatic-audit-2026-06-14.md` (the corpus-idiomatic audit, Tier-1 plan) + this grounding (workflow `wf_b91c9acb-ed1`, 6 agents, all four target idioms compile-verified on the live compiler at HEAD `cd822f7a`).

## What wave 1 is

The four flagship examples a newcomer reads first, each currently teaching the **inverse** of its named lesson:

| Order | File | Current (transpilation) | Target idiom |
|---|---|---|---|
| 1 | **09-error-handling** | boolean-flag soup; `!{}` arms discard payloads; enum `renders` clauses are dead code | **errors-as-states** — error variants held in a `Phase` enum; `!{}` routes into `.Failed(err)`; the held variant renders (§19) |
| 2 | **05-multi-step-form** | hand-built `match` transitions + `if=/else-if=/else` instance chain + `<submitted>` guard; no validators | **`<engine for=Step>`** with `rule=` state-children + decl-coupled validators gating Next/Submit via `@signup.isValid` (§51 + §55) |
| 3 | **16-remote-data** | inline `${ match @state { .V :> lift <Comp> } }` (the §7-row-1049 anti-pattern) + nested `${for/lift}` | **`<match for=ContactsPhase>`** (Tier-1 structural) over a typed async Phase enum + `<each>` rows + a live `.Failed` arm (§18 + §17.7 + §19) |
| 4 | **04-live-search** | `${ for … if(!matches) continue; lift }`; non-reactive `const people`; no derived cell | **derived `const <filtered>` cell** + `<each>`/`<empty>` over a reactive typed collection (§6.6 + §17.7) |

The Tier-0 `<each>` conversion folds **into** these rewrites where they touch for-lift sites (disposition (c) — not a blind sweep; see below).

## Grounding — verify-before-claim catches (the audit is a derived doc; Rule 4)

1. **`promote --each` is SHIPPED (S134), NOT "Landing 3 PENDING."** PRIMER §6.3's "the CLI prints impl pending" claim is **stale/wrong** (verified empirically + in `compiler/src/commands/promote.js`). BUT the tool only promotes **bare `@cell` iterables** (§56.10.2) — function-call iterables (`loadContacts()`), literal arrays, multi-lift bodies are correctly skipped. On the real corpus only **~11 sites / 8 files** auto-promote; 13 files fail (mostly pre-existing trucking compile errors, unrelated). The transactional sanity-gate guarantees **zero corruption** — every failure leaves the file untouched. → **Tier-0 disposition (c): run `promote --each --dry-run` per file as a rewrite opens it, eyeball the diff, accept in place; hand-handle the skipped/failed shapes.** Not a blind sweep (would silently under-deliver + misreport scope); not a standalone by-hand dispatch (wasteful).
2. **for-lift inventory = 36 sites / 28 distinct files** (audit said "32 files" — overcounted). **Code-level `server function` modifier sites = 0** (every occurrence is in comments/docs; the audit's "8 files" is **not borne out**). The 3 latent bugs (13-worker always-true `is some` L85; 07-admin unwired `fetchUsers`; 27 unused `UserRole` enum + dead stubs) are **confirmed**.
3. **All four target idioms compile clean today** — with two real compiler gaps (below). The audit's "zero compiler cost, all idioms shipped" is substantially true for the idioms but its own BEFORE/AFTER sketches don't all compile as literally written.

## Two real compiler gaps surfaced (load-bearing)

- **GAP-A — void element in `<match>` arm** (constrains 09): a void HTML element (`<input>`, `<br>`, `<img>`) as a **direct child** of a `<match for=T on=@x>` arm body breaks the arm-closer scanner → `E-MATCH-PARSE-001` / `E-CTX-001` (the scanner eats the arm/match closers). Workaround proven clean: wrap + self-close (`<label><input … /></label>`). **09 is a contact FORM (inputs everywhere) rendered via `<match for=Phase>`** → this bites head-on. The same void element compiles fine in plain markup and one level deep inside a wrapper. Root: the arm-body scanner should treat §24 void elements as self-terminating (matching plain-markup behavior). **Disposition fork → R3.**
- **GAP-B — auto-declared `<engine>` + bare-variant writes** (constrains 16-engine, NOT 16-match): `<engine for=ContactsPhase initial=.Idle>` with no manual `<phase>` decl → bare `.Loading`/`.Loaded` writes in sibling fn bodies fire `E-VARIANT-AMBIGUOUS` (§14.10 — the type-checker can't see the auto-cell's type). The **kickstarter §11.1 engine recipe VERBATIM does not compile (5 errors)**. The engine form is only writable today by adding an explicit `<phase>: ContactsPhase` decl, which then draws `E-DG-002` "declared but never consumed." The **match-for-Phase form has no such gap.** → strong argument for 16→match (R1). File GAP-B as a known-gap (doc-vs-impl divergence: a printed recipe that doesn't compile); does NOT block wave 1.

## Per-flagship dispatch detail (all ONE self-contained dispatch each)

**09-error-handling** — REWRITE. Target: `type Phase:enum = .Editing .Submitting .Succeeded .Failed(err: ContactError)`; single `<phase>` cell (delete `<submitted>`/`<sending>`); `!{}` arms route `{ @phase = .Failed(err); return }` (payload USED, not discarded); render via `<match for=Phase on=@phase>` so the `.Failed err` arm's `${err}` fires the variant's (currently-dead) `renders` clause. Compile-verified clean (Test K). Constraints: no bare `match` in markup (E-TYPE-026); GAP-A workaround on form inputs. README L45 + file-header re-aim. **Rulings: R2 (render-path + G2), R3 (GAP-A).**

**05-multi-step-form** — REWRITE. Target: `<engine for=Step initial=.Info>` with `rule=` state-children (the three `const XStep` component bodies move into the matching state-children verbatim); decl-coupled `<signup>` compound with `req`/`length` validators; Next/Submit gated on `!@signup.isValid`; `<errors of=@signup.field/>`. **Compile-verified clean, ZERO gaps.** CODEGEN NOTE: mandate the in-body transition form `onclick=${ @step = .Variant }` (compile-time `rule=` checked; avoids `W-ENGINE-SELF-WRITE-DETECTED`). Back-nav = multi-target `rule=(.Prev | .Next)`. README L41 + file-header re-aim. **No gating ruling — dispatch-ready now.**

**16-remote-data** — REWRITE. Target (recommended): `type ContactsPhase:enum = { Idle, Loading, Loaded(rows: Contact[]), Failed(message) }` + `type Contact:struct`; render via Tier-1 `<match for=ContactsPhase on=@phase>` with `<each in=rows key=@.id><empty>…</empty></each>` in the `.Loaded` arm; wire a live `.Failed` via failable `fetchContacts() ! ContactsError` + `!{}` (advances G2). **Both match + engine forms compile clean (match cleanly, engine only with the GAP-B workaround).** README L52 re-aim (off "enum + match"; the stale "§13.5 RemoteData:enum stdlib type" clause runs against kickstarter §11.5 "name the phase per-screen, don't import a generic type" — re-check). **Ruling: R1 (match vs engine).**

**04-live-search** — REWRITE + re-aim README. Target: `type Person:struct`; reactive `<people>: Person[]`; `const <filtered> = @people.filter(p => …@query…)`; render `<ul><each in=@filtered key=@.id> … <empty>No people match…</empty></each></ul>`. **Compile-verified clean (both body forms), ZERO gaps.** Explicit `key=@.id` (§17.7.5 Landing-1 caveat). README L40 ("no derived-state boilerplate" — actively miseducating) + file-header re-aim. **No gating ruling — dispatch-ready now.**

## Rulings (SETTLED — S195 AskUserQuestion)

- **R1 — 16 shape: `<match for=ContactsPhase>` (Tier-1 structural).** Compiles clean as a newcomer authors it; engine trips GAP-B; async-reload's transition graph is trivial; teaches Tier-1 + the ladder meta-lesson. 05+14 carry engine-flagship duty.
- **R2 — 09: `<match for=Phase>` AND 09 absorbs gap G2.** 09 becomes THE errors-as-states teaching vehicle; no separate NEW G2 file needed this wave. Held `.Failed(err)` renders via the `<Failed err>` arm so the variant's `renders` clause fires.
- **R3 — GAP-A: fix the void-scanner first, then rewrite 09 clean** (Rule 3 — a flagship shouldn't teach a compiler-limitation workaround; the fix de-risks every future form-bearing match arm).

## Dispatch plan (FINAL)

**Wave 1a — fire in parallel now (`isolation:worktree`, `scrml-js-codegen-engineer`, opus):**
- **GAP-A void-scanner compiler fix** (change-id `match-arm-void-element-scanner-2026-06-15`) — arm-body closer scanner treats §24 void elements as self-terminating (matching plain-markup). Regression tests + compile-verify a form-bearing `<match>` arm with a bare `<input/>`. **Gates 09.** Closes the GAP-A known-gap.
- **05-multi-step-form** rewrite (engine + validators; in-body transition form; multi-target back-nav). No gap.
- **16-remote-data** rewrite (`<match for=ContactsPhase>` + typed payload + `<each>`/`<empty>` + live `.Failed` via failable `!{}`). No gap (match form).
- **04-live-search** rewrite (derived `const <filtered>` + `<each>`/`<empty>` + reactive `<people>: Person[]`). No gap.

**Wave 1b — after GAP-A lands:**
- **09-error-handling** rewrite (errors-as-states via `<match for=Phase>`, payloads routed into `.Failed`, absorbs G2). Clean once GAP-A is fixed.

**Cross-cutting:**
- **README.md re-aims (rows 04/05/09/16) + file-header comments** → PA-authored at land time (single shared README; avoids the 4-way file-delta clobber — memory `feedback_file_delta_vs_cherry_pick`). Header comments may ride with each rewrite agent.
- Each `isolation:worktree` dispatch carries the F4/S88/S90/S99/S126 discipline block + S136 BRIEF.md archival + mandatory compile-verify (exit 0, zero E-, `node --check` client+server JS) as the acceptance gate. Each landing PA-independent-R26-verified + S147 coherence-checked before commit.
- **File GAP-B** as a known-gap (kickstarter §11.1 recipe doesn't compile + auto-declare doesn't type-anchor bare-variant writes) — does NOT block wave 1.

## Housekeeping (PA — verify-before-claim currency, same-landing discipline)

- **File GAP-A + GAP-B as known-gaps** (`bun scripts/state.ts` board).
- **Correct PRIMER §6.3** "Landing 3 PENDING" → "shipped S134" (stale derived-doc claim; memory `feedback_verify_before_claim`).
- **Add a currency note to the audit DD** (28 files not 32; 0 code-level server-fn-modifier sites) — the same-landing currency discipline for the write-once tier.
