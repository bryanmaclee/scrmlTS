# scrmlTS — Session 38 (CLOSED)

**Date opened:** 2026-04-22
**Date closed:** 2026-04-22
**Previous:** `handOffs/hand-off-38.md` (S37 wrap snapshot)
**Baseline entering S38:** 7,393 pass / 40 skip / 2 fail / 339 files at `9540518` (S37 wrap).
**Final at S38 close:** **7,463 pass / 40 skip / 2 fail / 347 files** at `cfb1a14`. All 8 session commits pushed to origin/main. Plus S37 carryover (`f6fb0cc`, `9540518`) also pushed.

---

## 0. Session-start state

### Git
- `main` at `9540518` (S37 wrap commit).
- `origin/main` at `c7198b6` per `git branch -vv`.
- **Unpushed locally:** `f6fb0cc` (Bug 6 meta-checker fix) + `9540518` (S37 wrap).
- Push relay is live: `handOffs/incoming/2026-04-22-scrmlTS-to-master-s37-close-consolidated.md` dropped into master's inbox at S37 close. No direct-push auth carried into this session.

### Inbox (at close)
- **Inbox NOT empty at close** — arrived during wrap:
  - `2026-04-22-0612-master-to-scrmlTS-readme-add-giti-link.md` — master asks to add giti link to README.
  - `2026-04-22-0814-giti-009-relative-imports.scrml` + `.js` sidecar + `.md` — GITI-009 relative-import forwarding bug (reproducer attached).
  - `2026-04-22-0814-giti-to-scrmlTS-giti-010-acked-and-giti-009-filed.md` — giti confirms GITI-010 resolution + files GITI-009.
  - `2026-04-22-0841-giti-011-css-at-rules.scrml` + `.md` — GITI-011 CSS at-rule handling bug (reproducer attached).
  - `2026-04-22-0940-6nz-to-scrmlTS-bugs-4-5-verified-playground-four-surfaces-4-new.md` + 4 `.scrml` sidecars — 6nz verified S38 bugs 4+5 against push, then playground-four surfaced **4 new bugs** (H: function-rettype match drops return; I: name-mangling bleed; J: markup-interp helper-fn hides reactive; K: sync-effect throw halts caller).
- Carryover from S37 wrap archived to `read/`: none still open.
- **S39 should triage this batch first.** The 4 new 6nz bugs + GITI-009 + GITI-011 exceed a single session's fix capacity — will need priority ranking.

### scrml-support picked up
- `a5b99f5` — insight 23 (B1+B3 DEFER + trigger registry) ✅ appended
- `62fb26f` — insight 24 (NPM compat-tier Phase-0-first verdict) ✅ appended
- `a2f2357` — S37 user-voice log ✅ appended
- Remaining master-side item: push of scrmlTS `f6fb0cc` + `9540518` (waiting on master).

### User-voice
- Last read on session start: ~10 contentful S37 entries (Bug G wrap, write-test-always rule, spec-analyzer discipline, fn≡pure ratification, "thrilled to be wrong", scope-blindness meta-signal, Phase 0 auth).

---

## 1. Next-priority queue for S39 (updated at close)

S38 closed the entire S37 bug queue (1, 3, 4, 5, 6 all fixed, plus mixed-case follow-on), GITI-010, and the multi-`^{}` debate. Remaining follow-ups in priority order:

1. **Auth-middleware CSRF mint-on-403 path** — surfaced from GITI-010.
   Session-based CSRF validation in `emit-server.ts` at line 510 still
   doesn't mint on 403; different contract from baseline (uses
   `_scrml_session_middleware`). Scope a dedicated fix when someone
   reports it in the wild OR when giti migrates to auth middleware.

2. **Phase 0 item 1 `^{}` audit continuation** — 4 items remain:
   - If/for/while/match/try body over-capture siblings (Bug 6 shape).
   - `lin-decl` handling inside `^{}` capture.
   - `^{}` inside a loop body — re-capture per iteration?
   - Add `^{}` cookbook section to `docs/external-js.md` once ≥3 patterns validated (emit.raw fix just added a second; CM6-via-esm.sh would be the third).

3. **Phase 0 item 3 — `scrml vendor add <url>` CLI.** Fetch + sha384 +
   write to `vendor/<name>/` + update manifest. Session-sized. Not started.

4. **master-list.md header + `docs/SEO-LAUNCH.md` hygiene** — both
   ~15 sessions stale (noted in §3).

5. **NC-3 / NC-4 non-compliance items** — §54.6 Phase 4h return-type-
   narrow-fit gap, `_ensureBoundary` warning shim cleanup.

6. **GITI-009 (giti-reported)** — relative-import forwarding against source
   path instead of compiled output path. Waiting on minimal repro from giti.

---

## 2. Standing rules in force (S38)

- **Verify-before-fix** — spec-read + repro compile + evidence before any fix.
- **Write test, always** — no behavior change without a test that exercises the new path.
- **Scope-blindness is structural** — context-sweep BEFORE implementing; spec-analyzer on every spec amendment (2 passes); DD citations >14 days potentially stale.
- **Distillation beats option-expansion** when user is overloaded.
- **All agents on Opus 4.6** — `model: "opus"` on every dispatch.
- **Commit to main, never push (DEFAULT)** — send needs:push to master. Per-session direct-push auth only with explicit user opt-in.
- **PA must not edit code without express permission.** Spec edits allowed only with scrml-language-design-reviewer gate.
- **Language cohesion check** — every syntax proposal checked against how the same concept already reads elsewhere.
- **Radical-doubt is genuine, not ceremonial** — debates can overturn user bias.
- **LOC/bug density target** — <30–50 LOC per adopter bug fix (exclusive of tests); above = refactor flag.

---

## 3. Non-compliance carryover

- `master-list.md` header ~14 sessions stale.
- `docs/SEO-LAUNCH.md` uncommitted ~15 sessions.
- `benchmarks/fullstack-react/CLAUDE.md` out-of-place agent tooling.
- NC-3: §54.6 Phase 4h return-type-narrow-fit code assignment gap.
- NC-4: `_ensureBoundary` warning shim (removes when B1+B3 ships — triggers apply).

---

## 4. Open threads (at close)

- User-authorized direct push executed 2× during S38 (Bug 1–GITI-010 batch pushed at `40e162b`; Bug 4 push at `adbc30c`; mixed-case push at `8691f75`; SPEC §22.3 push at `6609fb6`; emit.raw fix push at `cfb1a14`). Forward protocol: direct-push auth was per-session; default DEFAULT for S39 is needs:push relay to master unless user re-auths.
- **Master-side pending**: `handOffs/incoming/2026-04-22-scrmlTS-to-master-insight-25-multi-meta.md` requests append of multi-`^{}` debate verdict as insight 25 to `scrml-support/design-insights.md`. Two hallucinated refs (nonexistent "insight 40", nonexistent "file-scoped compile-time accumulator") flagged in the relay message — master must strip before append.
- Phase 0 item 2 (`docs/external-js.md`) committed S37 `c7198b6`. Item 1 (`^{}` audit) advanced this session via Bug 6 (S37), Bug 4 (S38), and emit.raw classifier (S38). Item 3 (`scrml vendor add <url>` CLI) still not started.
- S37 Phase 0 item 1 audit queue: remaining items are `if`/`for`/`while`/`match`/`try` body over-capture siblings (Bug-6-shape), `lin-decl` handling inside `^{}`, `^{}` inside a loop body (re-capture per iteration?), multiple top-level `^{}` nice-to-have (RATIFIED + SPEC'd this session).

---

## 5. Session log (S38 running notes)

- 2026-04-22 — Session opened. pa.md + hand-off read, last ~10 contentful user-voice entries reviewed, inbox verified empty, rotated S37 wrap → `handOffs/hand-off-38.md`, fresh hand-off.md created.
- 2026-04-22 — **Bug 1 (string escape) FIXED.** Root cause: 8 identical `STRING`-token re-quote sites in `ast-builder.js` used `.replace(/\\/g, "\\\\").replace(/"/g, '\\"')` which double-escaped backslashes. Fix: `reemitJsStringLiteral(rawInner)` helper that interprets standard JS escapes (`\n \t \r \\ \" \' \0 \b \f \v \xHH \uHHHH \u{...}`) then `JSON.stringify`s. All 8 sites replaced. 11 unit tests at `compiler/tests/unit/ast-builder-string-escape.test.js` all pass. Suite: **7,404 pass / 40 skip / 2 fail / 340 files** (baseline 7,393 → +11 new tests, +1 file; same 2 pre-existing self-host fails). Bug 1's downstream effects on bugs 2 and 6 outputs no longer present (strings emit correctly). Commit `41aa7c0`.
- 2026-04-22 — **New inbox messages read**: giti GITI-010 (CSRF bootstrap blocker, needs design call A/B/C), 6nz bug-6 verified (9/9 puppeteer green), 6nz bug-3 + bug-5 minimal repros with exact source. Task list created; priority order ratified (Bug 3, GITI-010, Bug 5, Bug 4).
- 2026-04-22 — **Bug 3 (return after ternary-const dropped) FIXED.** Root cause: `collectExpr`'s angle-bracket tracker bumped `angleDepth` unconditionally when `<` was followed by IDENT. In `base < limit ? base : limit` (no matching `>`), `angleDepth` stayed at 1 — disabling the statement-boundary check (the `angleDepth === 0` guard on line 1161) — causing greedy collect to eat `return base + min` into the expression string. Meriyah then rejected the malformed expression and downstream fallback dropped the tail. Fix: before bumping `angleDepth`, check if previous token is a clearly value-producing token (IDENT, AT_IDENT, NUMBER, STRING, `)`, `]`). If so, `<` is a less-than comparison, not a tag opener. Tag openers always appear at expression positions (after `=`, `,`, `(`, stmt-start, keywords like `return`/`lift`), never after a value. 11 unit tests at `compiler/tests/unit/ast-builder-lt-vs-tag-open.test.js`. Suite: **7,415 pass / 40 skip / 2 fail / 341 files**. Commit `3778d76`.
- 2026-04-22 — **Reply to 6nz dropped** at `6NZ/handOffs/incoming/2026-04-22-scrmlTS-to-6nz-bug-1-and-bug-3-fixed.md` confirming Bug 1 + Bug 3 landed with root-cause details. Archived 6nz bug-6-verified + bug-3 reproducer to `incoming/read/`. Left giti CSRF bug + 6nz bug-5 reproducer in `incoming/` (still open).
- 2026-04-22 — **Bug 5 (for-lift wrapper accumulation) FIXED — narrow scope.** Root cause: `emit-reactive-wiring.ts` unconditionally wraps any reactive-deps lift group in `_scrml_effect(function() {...})`. Reactive for-lift emits already contain `_scrml_effect_static(renderFn)` that registers `@items` as dep on first run and re-reconciles in place. The outer `_scrml_effect` wrap re-creates the list wrapper div per mutation — 6nz observed 3→8→15 `<li>` children on sequential clicks. Fix: detect pure-keyed-reconcile blocks (combinedCode has `_scrml_reconcile_list(` AND no other `_scrml_reactive_get(` outside reconcile calls via `stripReconcileCalls` balanced-paren helper). For those, skip the outer effect wrap and emit directly with `_scrml_lift_target` set once. **Narrow scope: mixed case (keyed reconcile + other reactive reads like `if (@todos.length == 0) { lift empty }`) falls through to current behavior — preserves pre-existing wrapper-re-creation bug that's separate from Bug 5 and needs its own fix.** 6 unit tests at `compiler/tests/unit/for-lift-no-outer-effect.test.js` covering pure case, mixed-case regression guard, multi-for-lift, and balanced-parens stripping. Suite: **7,421 pass / 40 skip / 2 fail / 342 files**. Commit `b37769c`.
- 2026-04-22 — **GITI-010 (CSRF bootstrap unbootstrappable) FIXED — Option A.** Root cause: baseline CSRF 403 response did not `Set-Cookie`, so cookie-less first POST → 403 forever (the double-submit loop was closed with no mint path). User ratified Option A (mint-on-403 + single client retry) after trade-off analysis against B (dedicated bootstrap route) and C (HTML meta-tag injection). Fix is three-sided: (1) **Server baseline path** (`emit-server.ts`): 403 response now includes `Set-Cookie: scrml_csrf=${_scrml_csrf_token}; ...`. `_scrml_csrf_token` is always valid (existing or freshly-minted by `_scrml_ensure_csrf_cookie`). (2) **Server middleware paths** (`_scrml_hasCsrfMW` resolve + no-handle): split the check — if cookie missing, mint fresh UUID + 403 with Set-Cookie (bootstrap); if cookie present but mismatched, terminal 403 (real CSRF, no mint). (3) **Client** (`emit-client.ts` + `emit-functions.ts`): emit `_scrml_fetch_with_csrf_retry(path, method, body)` helper that retries exactly once on 403, re-reading `document.cookie` for the freshly-planted token. CSRF-enabled mutating stubs route through the helper. Helper gated behind `hasMutatingCsrfServerFn` check (via `ctx.routeMap.functions` iteration) to avoid dead-code emission in SSE-only files. Auth-middleware CSRF path (session-based) NOT fixed — separate contract, deferred to its own fix. 9 unit tests at `compiler/tests/unit/csrf-bootstrap.test.js` covering server Set-Cookie emit, validation ordering, 200-rotate regression guard, helper emission uniqueness, retry shape, stub routing, and no-server-fn emission guard. Suite: **7,430 pass / 40 skip / 2 fail / 343 files**. Commit `40e162b`. **Pushed to origin/main with commits 41aa7c0, 3778d76, b37769c, 40e162b + S37 carryover (f6fb0cc, 9540518).**
- 2026-04-22 — **Bug 4 (derived-reactive markup wiring) FIXED.** Root cause was two-layered: (1) `collectReactiveVarNames` in `reactive-deps.ts` collected `reactive-decl` and `tilde-decl` but not `reactive-derived-decl` (`const @isInsert = ...`). That set is used as a filter by `extractReactiveDeps` — so markup interpolations like `${@isInsert}` had `reactiveRefs` computed as empty, emit-event-wiring at line 459 saw `varRefs.length === 0`, and the ENTIRE wiring block was skipped (silent render bug — element rendered once, never updated). (2) Once wiring emission was restored, the rewrite emitted `_scrml_reactive_get("isInsert")` instead of `_scrml_derived_get("isInsert")` because `emitExprField` calls in emit-event-wiring didn't pass `ctx.derivedNames`. Fix: (a) add `reactive-derived-decl` to `collectReactiveVarNames`; (b) populate `ctx.derivedNames` via `collectDerivedVarNames(fileAST)` at both CompileContext construction sites (browser + library mode); (c) thread `ctx.derivedNames` through the two `emitExprField` calls in emit-event-wiring's markup-interpolation path. Runtime semantics verified: effect → `_scrml_derived_get` → first-call dirty → `fn()` runs inside effect stack → `_scrml_reactive_get(upstream)` reads register upstream as effect dep → subsequent mutations propagate dirty-flags → outer effect re-fires → textContent updates. 8 unit tests at `compiler/tests/unit/derived-reactive-markup-wiring.test.js`. Suite: **7,438 pass / 40 skip / 2 fail / 344 files**. Commit `adbc30c`. **Pushed to origin/main with `40e162b..adbc30c`.**
- 2026-04-22 — **Inbox replies dispatched**: (1) 6nz: full batch resolved (bugs 1, 3, 4, 5 + bug 6 already verified) → `6NZ/handOffs/incoming/2026-04-22-scrmlTS-to-6nz-bug-4-and-bug-5-fixed.md`. (2) giti: GITI-010 fix shipped in `40e162b`; their retraction was timing confusion (they compiled after my push and mistook it for pre-existing behavior) → `giti/handOffs/incoming/2026-04-22-scrmlTS-to-giti-giti-010-fixed.md`. Four inbox messages archived to `incoming/read/`.
- 2026-04-22 — **Mixed-case for-lift wrapper re-creation FIXED — follow-on to Bug 5 (Option B).** Root cause: logic blocks combining keyed for-lift with other reactive content (e.g. `if (@empty) { lift... } for (let x of @items)...`) had outer `_scrml_effect` wrapping everything, stacking two bugs — (a) wrapper div re-created per outer-effect fire; (b) conditional `_scrml_lift(<li empty>)` accumulated because `hasKeyedReconcile` correctly skipped `innerHTML=""` (skipping clear preserves wrapper but also stops clearing conditional). Fix: detect mixed case (`hasKeyedReconcile && hasOtherReactiveReads`) and hoist for-lift setup OUTSIDE the effect via `hoistForLiftSetup(combinedCode)` helper — extracts wrapper decl + createFn + renderFn + first renderFn() call + `_scrml_effect_static(renderFn)` using regex + balanced-brace matching. Effect body retains `_scrml_lift(wrapper)` which re-mounts the same node (appendChild MOVES it, wrapper's reconciled children persist). With wrapper hoisted, `innerHTML=""` restored at effect top — safe because re-mount happens immediately. Fixes both (a) and (b) in one pass. 11 unit tests at `compiler/tests/unit/for-lift-mixed-case-hoist.test.js`. One pre-existing Bug-5 test updated to match new mixed-case shape (wrapper BEFORE effect now, not after). Suite: **7,449 pass / 40 skip / 2 fail / 345 files**. Commit `8691f75`. Pushed.
- 2026-04-22 — **Multi-top-level `^{}` debate RATIFIED — SPEC §22.3 terminal bullet added.** User asked for a debate on 6nz's "allow multiple top-level `^{…}` blocks for lifecycle stages" nice-to-have. debate-curator dispatched (5 experts: elm-architecture 34, template-haskell 45, zig-comptime 46, racket-phases 44, scrml-radical-doubt 53 — minimum-delta wins). Verdict: codify existing compiler behavior; **do NOT** introduce `^init{}`/`^mount{}`/`^teardown{}` keywords. Applied: (1) SPEC edit — one-bullet normative rule at §22.3 (top-level = file scope; each block classified independently; source order within phase; DOMContentLoaded-already-fired clause; mixed compile-time+runtime permitted). scrml-language-design-reviewer 2-pass review: pass 1 REVISE (4 issues: undefined "top-level", async over-strength, already-fired gap, "emission order" unused) — all fixed; pass 2 CLEAN (cross-sections verified against §22.4/§22.5/§22.6/§7.3/§22.8/§22.10/§41). (2) Test suite at `compiler/tests/unit/multi-meta-source-order.test.js` (6 tests) + compilation sample at `samples/compilation-tests/multi-meta-source-order.scrml`. (3) 6nz reply dropped at `6NZ/handOffs/incoming/2026-04-22-scrmlTS-to-6nz-multi-meta-ratified.md` — "already supported, SPEC says so now, name the functions `init()`/`mount()` not keywords." (4) Master relay at `handOffs/incoming/2026-04-22-scrmlTS-to-master-insight-25-multi-meta.md` requesting scrml-support/design-insights.md append as insight 25, with two hallucinated references flagged (debate-curator invented "insight 40" and "file-scoped compile-time accumulator" — stripped from SPEC delta, flagged in relay). Suite: **7,456 pass / 40 skip / 2 fail / 346 files**. Commit `6609fb6`. Pushed.
- 2026-04-22 — **`emit.raw` classifier bug (task #6) FIXED.** Surfaced during multi-meta testing: `^{ emit.raw(...) }` at file scope was being classified as runtime meta, emitting `_scrml_meta_effect(...)` with body `emit.raw("...")` — which would CRASH at runtime (per §22.5.1, `emit.raw` has no runtime counterpart). Root cause: `testExprNode` in `meta-checker.ts` used `exprNodeContainsCall(exprNode, "emit")` which only matches CallExpr where callee is an IdentExpr with name "emit". For `emit.raw(...)`, the callee is a MemberExpr (object=ident("emit"), property="raw") — not matched. The string-fallback regex DID catch it, but the ExprNode path runs first and short-circuits. Fix: added `exprNodeContainsEmitRawCall` helper that walks ExprNode tree looking for CallExpr with MemberExpr callee matching `emit.raw`. Wired into `testExprNode`. Verified on `/tmp/emit-raw/app.scrml`: HTML now contains the injected `<p class="compile-time-emitted">` at compile time; client JS has no `_scrml_meta_effect` for the block and no runtime `emit.raw(` reference. 7 unit tests at `compiler/tests/unit/meta-classifier-emit-raw.test.js` covering compile-time expansion, no runtime emit, bare `emit(...)` regression guard, `reflect(...)` regression guard, pure-runtime regression guard, `meta.emit.raw` false-positive guard, nested-statements classification. Suite: **7,463 pass / 40 skip / 2 fail / 347 files**. Commit `cfb1a14`. Pushed.
- 2026-04-22 — **S38 WRAP.** User-voice S38 appended to `../scrml-support/user-voice-scrmlTS.md` (6 verbatim entries + commentary). Changelog catch-up block covering S29–S37 (consolidated, arc-organized, ~180 lines) + detailed S38 entry appended to `docs/changelog.md` (502 → 722 lines — previously last-updated S28). S38 closed the entire S37 bug queue (1, 3, 4, 5 + mixed-case follow-on), resolved GITI-010, ratified SPEC §22.3 multi-`^{}` via 5-expert debate, and fixed a `emit.raw` classifier bug surfaced during testing. 8 commits total this session, all pushed to origin/main. Final: **7,463 pass / 40 skip / 2 fail / 347 files** at `cfb1a14`.
