# scrmlTS — Session 97 (CLOSE)

**Date:** 2026-05-16 → 2026-05-17
**Previous:** `handOffs/hand-off-97.md` (S96 CLOSE rotated as S97 OPEN-pickup snapshot)

---

## TL;DR for S98 PA pickup

S97 was an **18-commit marathon** closing the entire S95 + S96 + B1-followon bug catalogs end-to-end AND scaffolding a brute-force ghost-pattern stress harness + 5 new lint families (covering 8 frameworks/paradigms).

- **S95 catalog: 18/18 closed** (16 from S96 + 2 closed this session via repros that revealed Bug 3 was side-effect-fixed and Bug 4 was a 2-coordinated-fix component-expander issue)
- **S96 followups: 5/5 closed** (chained-ternary, bare-assign, postfix/compound, match-arm RHS, `.advance(.X.history)`)
- **B1 follow-ons line 231-236: 7/7 closed** (3 verified-already-closed at v0.2.4 cluster + 3 newly closed S97 + 1 new bug discovered during verification, closed same session)
- **Brute-force stress harness scaffolded** — 34 fixtures + living scorecard, 0 silent-bad-js found
- **5 new lint families** — W-LINT-016 (React hooks), 017 (Vue composition API), 018 (Svelte stores), 019 (Solid primitives), 020 (Vue `{{}}`), 021 (Angular), 022 (TS types), 023 (React Fragment). Catalog 16 → 23 patterns
- **All scrmlTS commits pushed at S97 CLOSE**

---

## Final state at S97 close

- **scrmlTS HEAD:** `b855d0d` (W-LINT-023 React Fragment) + wrap-CLOSE landing on top
- **scrmlTS tag:** `v0.3.0` annotated on `c520369` (unchanged this session)
- **scrmlTS ahead/behind origin:** 0/0 after push
- **scrml-support HEAD:** `548a675` (unchanged this session)
- **scrml-support ahead/behind origin:** 0/0
- **Working tree:** clean post-wrap-commit
- **Worktrees:** main only (S97 was all PA-side direct work — no isolation:worktree dispatches)
- **Inbox:** empty (incoming/dist/ has old artifacts; no live messages)
- **Outbox:** 1 message dropped at `6nz/handOffs/incoming/` re: S96 Bug 14 §5.2.2 revert
- **Hook config:** configuration B (pre-commit + post-commit + pre-push); pre-push gate held across all 18+ commits

**Tests at HEAD `b855d0d`:** **13,019 pass / 117 skip / 1 todo / 0 fail / 667 files / 43,402 expect**.

Delta vs S96 close (12,892 / 117 / 1 / 0 / 657 / 43,202):
- **+127 pass** (new test files + new fixtures)
- **+10 new test files** (657 → 667)
- **+200 expects**
- **0 regressions** throughout

---

## S97 commit ledger (18 commits, chronological)

```
3b06ad8  fix(parser): escape-hatch raw slice misaligned when preprocessForAcorn changes string length
2fd5f7a  docs(master-list): correct stale Bug 2 status — closed v0.2.3, not pending
07c345a  fix(tokenizer): event-handler bare-assignment shape per SPEC §5.2.3 L19
5df1a3a  fix(codegen+tokenizer): bare-form postfix update + compound assigns per SPEC §5.2.3
2503382  fix(component-expander): S95 Bug 4 — prop ref in call-ref attribute args
27c4202  docs(master-list): S97 verification pass on B1 follow-ons line 231-236
b503391  docs(kickstarter-v1): correct stale `onclick=fn()` event-injection claim per SPEC §5.2.2
c451ae6  fix(codegen): match-arm RHS bare-variant placeholder unmask in rewriteEnumVariantAccess
4e7c70e  docs(master-list): mark match-arm RHS bare-variant CLOSED (c451ae6)
8c9c891  fix(codegen): route @-prefix reactive-method-call event handlers through structured emit
7facfc7  docs(master-list): mark .advance(.X.history) CLOSED + last open follow-on
0a3388f  fix(engine-statechild-parser): rule= value bounded by trailing boolean attr
15ad767  docs(master-list): mark rule= boolean-attr-boundary CLOSED (0a3388f)
1f390c2  test(stress): brute-force ghost-pattern coverage harness — initial 34-fixture pass
dd601ad  feat(lint): W-LINT-016 — React hook calls (useState, useEffect, useRef, ...)
12e2881  feat(lint): W-LINT-017/018/019 — Vue + Svelte + Solid reactive-primitive lints
184c011  feat(lint): W-LINT-020 (Vue {{}}), W-LINT-021 (Angular), W-LINT-022 (TS) — close all uncovered-gap
b855d0d  feat(lint): W-LINT-023 — React Fragment opener `<>`
```

Plus this wrap-CLOSE commit landing master-list + changelog + hand-off.

---

## Final stress harness scorecard (S97 close)

| Category | Pre-S97 | S97 close | Delta |
|---|---|---|---|
| ghost-caught (specific lint fires) | 12 | **26** | +14 |
| compile-error (specific E-* fires) | — | 3 | — |
| generic-error (caught but adopter-unhelpful) | — | 1 (Svelte `$store` only) | — |
| silent-bad-js (compiles, JS broken) | — | 0 | — |
| clean-pass (regression guards) | — | 4 | — |
| **uncovered-gap (silent acceptance)** | — | **0** ✅ | — |

Lint catalog: **16 → 23 patterns** (+7 entries; W-LINT-016 through W-LINT-023).

---

## Bug catalog state at S97 close

- **S95 catalog**: 18/18 closed end-to-end
- **S96 followups**: 5/5 closed end-to-end
- **B1 follow-ons (master-list line 231-236)**: 7/7 closed end-to-end (incl. 1 new surfaced during S97 verification, closed same session)

The "B1 surfaced v0.2.x gaps" table (master-list §0.6 line 217-227) was already 9/9 closed at S96 close after Bug 2 status correction in `2fd5f7a`. So:

**ALL filed compiler bugs are closed.** Remaining items are:
1. Special-shape: Svelte `$store` auto-subscribe (not yet lint-covered — needs $-prefix ident context detection)
2. Latent: postfix value-semantic (inline note in `rewriteReactiveAssign` — silently-wrong only in value-position, vanishingly rare in scrml source)
3. Doc: pa-scrmlTS.md kickstarter v1→v2 staleness (pa.md cites v1, but v2 supersedes per its own header)
4. Research: `feel-of-performance` empirical study (S83-queued, deferred S94/S95/S96/S97)

---

## Process wins this session

1. **Test-baseline integrity**: 0 regressions across 18 commits + 5 wrap-bookkeeping commits. Pre-push gate held throughout — no `--no-verify` invocations.
2. **Master-list staleness cross-verification**: Bug 2 closed-at-v0.2.3 was carrying as "STILL PENDING"; B1 follow-on entries similarly carrying stale "tracked for later" status when v0.2.4 had closed them. Cross-verify-against-changelog discipline applied; 4 stale entries corrected. Reinforces S82 precedent and the broader Rule 4 principle (derived planning docs are not normative).
3. **Hand-off framing scope-discovery**: S96 hand-off described "chained-ternary" bug as the trigger; actual trigger was `::` + FunctionExpression in arg position. S96 "remaining `.advance(.X.history)` bug" was actually broader `@<var>.method(args)` class. Adopter-shape repro frequently reveals scope different than hand-off cited. Filed as memory rule candidate.
4. **Stress harness as living scorecard**: pass/fail encodes "current truth"; trajectory matters. Future sessions can chip at the 1 remaining `generic-error` (Svelte `$store`) without rebuilding the test infrastructure. Fixture additions are cheap (push to one of the framework arrays).
5. **PA wrap-suggestion reflex correction**: at ~43% context used, PA proposed wrap; user pushed back. Memory rule `feedback_dont_wrap_at_43_percent.md` filed mid-session and immediately applied — wrap only proposed at ~85% remaining (this current wrap fires at user's explicit "wrap and push" trigger).

---

## Process incidents (worth noting)

### Test-fixture syntax errors mid-development

Two tests in S97 had to be fixed after initial-write fail:
- `§1.2 onclick=@compound.field.method(arg)` in `event-handler-reactive-method-call.test.js` — used compound state-decl syntax that doesn't compile cleanly. Replaced with zero-arg `@items.sort()` test.
- `§1.2 prop ref in conditional if= expression` in `component-prop-substitution-call-ref.test.js` — used `<Badge active=true/>` which fires E-SCOPE-001 on bare `true`/`false`. Replaced with single-arg prop ref test.

Lesson: fixture authoring should compile-check incrementally; canonical scrml fixture shapes per primer §3 / §6 are the safest path.

### One scope-misreading in Bug 4 first attempt

First Bug 4 fix attempt (`substituteProps` extension only) didn't fix the symptom because the upstream `parseComponentBody` re-tokenize via `normalizeTokenizedRaw` was destroying the call-ref shape BEFORE substitution. Reverted, added `normalizeTokenizedRaw` Step 6 first, then re-applied substituteProps fix. Both required end-to-end. Surfaced the layered tokenize-then-substitute pattern in component-expander.

---

## Things S98 PA must NOT screw up (carried + extended)

### pa.md Rules permanently load-bearing (now at `scrml-support/pa-scrmlTS.md`)
- Rule 1 — no marketing/article/tweet work unless user brings up
- Rule 2 — full-production-language fidelity
- Rule 3 — right answer beats easy answer 99.999%
- Rule 4 — SPEC is normative; derived planning docs are NOT
- Rule 5 — shoot straight; politeness for politeness sake rejected

### S96/S97 PA-memory rules permanently load-bearing
- `feedback_read_spec_at_session_start.md` — SPEC-INDEX.md read; verify spec sections directly before spec-implication changes (S96 directive)
- `feedback_declaration_form_in_reproducers.md` — synthetic reproducers use V5-strict canonical shape (S96)
- `feedback_dont_wrap_at_43_percent.md` — don't propose wrap above 50% remaining; 1M context budget actively tracked by user (S97 NEW)

### S97-specific anti-patterns
- DO NOT trust master-list "STILL PENDING" markers without cross-verifying against `docs/changelog.md`. The changelog is normative for shipping status; master-list is derived. (S97 precedent: Bug 2 + 4 B1 entries had stale status.)
- DO NOT trust hand-off bug framing without reproduce-first verification. (S97 precedent: chained-ternary actually `::`+FunctionExpression; `.advance(.X.history)` actually broader `@<var>.method(args)` class.)
- DO NOT extend the stress harness fixtures without classifying them; the test pass-fail encodes "current truth" — fixtures without classification break the contract.

---

## Open questions to surface immediately (S98 PA pickup)

1. **Svelte `$store` auto-subscribe** — the only remaining generic-error fixture. Pattern is `\$[a-zA-Z]\w*` in markup-interp context but distinguishing from legitimate `$identifier` (rare but possible JS identifier with leading `$`) needs more context than the current pre-Stage-2 lint pass has. Possible approaches: (a) require `$ident` to appear inside `${...}` markup-interp slot, (b) require `$ident` followed by `.subscribe(` or specific Svelte API patterns, (c) lint at later stage with scope info. File as v0.3.x candidate.

2. **pa-scrmlTS.md kickstarter v1→v2 reference staleness** — pa.md cites `docs/articles/llm-kickstarter-v1-2026-04-25.md` for dev-dispatch briefings; v2 (`llm-kickstarter-v2-2026-05-04.md`) self-declares as superseding v1. Should pa.md be updated to point to v2? Or is there a reason v1 is the canonical brief (e.g., v2 might have its own gaps)? Quick doc-side decision needed.

3. **Postfix value-semantic** — inline note in `rewriteReactiveAssign` flags that `setter(X, getter(X) + 1)` lowering returns NEW value (matches `++x` not `x++` semantic). For event-handler statement context the difference is invisible; for value-position the postfix return is silently wrong. Document-only finding; concrete fix would balloon complexity for vanishingly rare scrml shape. File as v0.3.x watch-item.

4. **`feel-of-performance` empirical study** — S83-queued, deferred S94/S95/S96/S97. Not picked up. Open question: is this still the right priority slot or has it been superseded by other work?

5. **Brute-force harness extension candidates** — S97 harness covers React/Vue/Svelte/Solid/Angular/TS/JS-paradigm. Not yet covered: Alpine.js (`x-data`, `x-on:`), HTMX (`hx-get`, `hx-trigger`), Lit (`@event=`, `?bool=`, `.prop=`), Stencil (`@Watch()`, `@Listen()`), Web Components (`customElements.define`, `attachShadow`). Each could add 3-5 fixtures and 1 new lint code. Trigger when adopter friction signals.

---

## Tags

#session-97 #CLOSE #18-commits #all-bug-catalogs-closed #s95-18-of-18 #s96-followups-5-of-5 #b1-followons-7-of-7 #stress-harness-scaffolded #lint-catalog-16-to-23 #5-new-lint-families #zero-regressions #full-production-fidelity
