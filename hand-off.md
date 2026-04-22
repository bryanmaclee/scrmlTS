# scrmlTS — Session 38

**Date opened:** 2026-04-22
**Previous:** `handOffs/hand-off-38.md` (S37 wrap snapshot)
**Baseline entering S38:** 7,393 pass / 40 skip / 2 fail / 339 files at `9540518` (S37 wrap).

---

## 0. Session-start state

### Git
- `main` at `9540518` (S37 wrap commit).
- `origin/main` at `c7198b6` per `git branch -vv`.
- **Unpushed locally:** `f6fb0cc` (Bug 6 meta-checker fix) + `9540518` (S37 wrap).
- Push relay is live: `handOffs/incoming/2026-04-22-scrmlTS-to-master-s37-close-consolidated.md` dropped into master's inbox at S37 close. No direct-push auth carried into this session.

### Inbox
- `handOffs/incoming/` — empty (only `read/` subdir).
- No new cross-repo messages since S37 close.

### scrml-support picked up
- `a5b99f5` — insight 23 (B1+B3 DEFER + trigger registry) ✅ appended
- `62fb26f` — insight 24 (NPM compat-tier Phase-0-first verdict) ✅ appended
- `a2f2357` — S37 user-voice log ✅ appended
- Remaining master-side item: push of scrmlTS `f6fb0cc` + `9540518` (waiting on master).

### User-voice
- Last read on session start: ~10 contentful S37 entries (Bug G wrap, write-test-always rule, spec-analyzer discipline, fn≡pure ratification, "thrilled to be wrong", scope-blindness meta-signal, Phase 0 auth).

---

## 1. Next-priority queue (inherited from S37 §5, unchanged)

In priority order:

1. **Phase 0 item 1 continuation — `^{}` audit**
   - Investigate if `if`/`for`/`while`/`match`/`try` bodies also over-capture (Bug 6 siblings).
   - Check `lin-decl` handling inside `^{}` capture.
   - Check `^{}` inside a loop body — re-capture per iteration?
   - Add `^{}` cookbook section to `docs/external-js.md` once ≥3 patterns validated.

2. **Phase 0 item 3 — `scrml vendor add <url>` CLI.** Fetch + sha384 + write to `vendor/<name>/` + update manifest. Session-sized.

3. **Bug 1 — string literal escape handling.** Foundational (affects `\n`/`\t`/`\r` in every string); leaks into Bugs 2 + 6 outputs. Likely 10–30 LOC in tokenizer/string-emit path.

4. **Bug 4 — derived-reactive markup display wiring.** Named derived refs skip subscription; breaks core reactive idiom. Likely 20–60 LOC.

5. **Bug 3 clarification** — ask 6nz for exact source with `prevStart` scope.

6. **Bug 5 behavioral test** — confirm runtime reactive dep-tracking for `for-lift`.

7. **Follow-up message to 6nz** — consolidated state of all 6 bugs.

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

## 4. Open threads

- Master has not yet executed `2026-04-22-scrmlTS-to-master-s37-close-consolidated.md` push request at session open. If user re-auths direct push, can be handled locally.
- Phase 0 item 2 (`docs/external-js.md`) committed at `c7198b6` — landed upstream. Item 1 + item 3 are the remaining Phase 0 deliverables.
- S37 Phase 0 item 1 "recalibration": meta-eval.ts already 646 lines + wiring complete; Phase 0 item 1 was redefined as **audit + fix concrete `^{}` bugs**, not "implement emit+reparse." Bug 6 was the first fruit; continuation queue in §1.

---

## 5. Session log (S38 running notes)

- 2026-04-22 — Session opened. pa.md + hand-off read, last ~10 contentful user-voice entries reviewed, inbox verified empty, rotated S37 wrap → `handOffs/hand-off-38.md`, fresh hand-off.md created.
- 2026-04-22 — **Bug 1 (string escape) FIXED.** Root cause: 8 identical `STRING`-token re-quote sites in `ast-builder.js` used `.replace(/\\/g, "\\\\").replace(/"/g, '\\"')` which double-escaped backslashes. Fix: `reemitJsStringLiteral(rawInner)` helper that interprets standard JS escapes (`\n \t \r \\ \" \' \0 \b \f \v \xHH \uHHHH \u{...}`) then `JSON.stringify`s. All 8 sites replaced. 11 unit tests at `compiler/tests/unit/ast-builder-string-escape.test.js` all pass. Suite: **7,404 pass / 40 skip / 2 fail / 340 files** (baseline 7,393 → +11 new tests, +1 file; same 2 pre-existing self-host fails). Bug 1's downstream effects on bugs 2 and 6 outputs no longer present (strings emit correctly). Commit `41aa7c0`.
- 2026-04-22 — **New inbox messages read**: giti GITI-010 (CSRF bootstrap blocker, needs design call A/B/C), 6nz bug-6 verified (9/9 puppeteer green), 6nz bug-3 + bug-5 minimal repros with exact source. Task list created; priority order ratified (Bug 3, GITI-010, Bug 5, Bug 4).
- 2026-04-22 — **Bug 3 (return after ternary-const dropped) FIXED.** Root cause: `collectExpr`'s angle-bracket tracker bumped `angleDepth` unconditionally when `<` was followed by IDENT. In `base < limit ? base : limit` (no matching `>`), `angleDepth` stayed at 1 — disabling the statement-boundary check (the `angleDepth === 0` guard on line 1161) — causing greedy collect to eat `return base + min` into the expression string. Meriyah then rejected the malformed expression and downstream fallback dropped the tail. Fix: before bumping `angleDepth`, check if previous token is a clearly value-producing token (IDENT, AT_IDENT, NUMBER, STRING, `)`, `]`). If so, `<` is a less-than comparison, not a tag opener. Tag openers always appear at expression positions (after `=`, `,`, `(`, stmt-start, keywords like `return`/`lift`), never after a value. 11 unit tests at `compiler/tests/unit/ast-builder-lt-vs-tag-open.test.js`. Suite: **7,415 pass / 40 skip / 2 fail / 341 files**. Commit `3778d76`.
- 2026-04-22 — **Reply to 6nz dropped** at `6NZ/handOffs/incoming/2026-04-22-scrmlTS-to-6nz-bug-1-and-bug-3-fixed.md` confirming Bug 1 + Bug 3 landed with root-cause details. Archived 6nz bug-6-verified + bug-3 reproducer to `incoming/read/`. Left giti CSRF bug + 6nz bug-5 reproducer in `incoming/` (still open).
- 2026-04-22 — **Bug 5 (for-lift wrapper accumulation) FIXED — narrow scope.** Root cause: `emit-reactive-wiring.ts` unconditionally wraps any reactive-deps lift group in `_scrml_effect(function() {...})`. Reactive for-lift emits already contain `_scrml_effect_static(renderFn)` that registers `@items` as dep on first run and re-reconciles in place. The outer `_scrml_effect` wrap re-creates the list wrapper div per mutation — 6nz observed 3→8→15 `<li>` children on sequential clicks. Fix: detect pure-keyed-reconcile blocks (combinedCode has `_scrml_reconcile_list(` AND no other `_scrml_reactive_get(` outside reconcile calls via `stripReconcileCalls` balanced-paren helper). For those, skip the outer effect wrap and emit directly with `_scrml_lift_target` set once. **Narrow scope: mixed case (keyed reconcile + other reactive reads like `if (@todos.length == 0) { lift empty }`) falls through to current behavior — preserves pre-existing wrapper-re-creation bug that's separate from Bug 5 and needs its own fix.** 6 unit tests at `compiler/tests/unit/for-lift-no-outer-effect.test.js` covering pure case, mixed-case regression guard, multi-for-lift, and balanced-parens stripping. Suite: **7,421 pass / 40 skip / 2 fail / 342 files**. LOC: ~50 (fix + helper) + ~170 (tests).
