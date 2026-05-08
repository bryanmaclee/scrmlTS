# B18 — Phase 0 SURVEY (re-dispatch S69)

**Date:** 2026-05-07
**Step:** A1b B18 — L19 multi-statement event-handler validation (E-MULTI-STATEMENT-HANDLER)
**Brief:** `docs/changes/phase-a1b-step-b18-multi-statement-handler/BRIEF.md`
**Saved survey from failed dispatch 1:** `SURVEY-failed-dispatch-1.md` (used as starting point per re-dispatch context).
**Spec:** SPEC §5.2.3 (lines 1127-1188), §4.14 (lines 941-983, with multi-statement rejection at 980), §34 catalog row at 14260, §6.6.1 line 980 cross-ref.

This survey supersedes SURVEY-failed-dispatch-1.md by recording corrections / tightenings discovered during this dispatch's actual implementation.

---

## §1 Survey items (per BRIEF §6 Phase-0 gate)

### (a) Existing walker locus + extension point

**Confirmed (matches saved survey):**
1. **Markup-attribute scope:** No existing walker dedicated to attribute-value validation. The B18 implementation lives at AST-builder time (`ast-builder.js` markup branch, around line 8365), reusing the existing `scanOpenerForAttrs` helper (lines 380-432) for opener-bound extraction — `scanOpenerForAttrs` already tracks paren / brace / quote depth and is the same primitive that `block-splitter.scanAttributes` uses for attribute-region delimitation. The new helper `scanForTopLevelSemicolon` adds the finer expression-internal tracking (template-literal interpolation, comments, escapes) needed for `;` detection.
2. **Engine state-child `:`-shorthand body:** SYM PASS 11 (`validateEngineStateChildrenAndRules` in `compiler/src/symbol-table.ts`) is the right home. The existing pass already walks `engine-decl._record.engineMeta` and consumes `parseEngineStateChildren` output; B18 adds a final loop that re-uses the parser-produced `EngineStateChildEntry.bodyRaw` + a new `isColonShorthand: boolean` flag.

**Verdict:** matches saved survey. Implementation lives in two distinct walkers — markup-attribute at TAB time, engine state-child at SYM PASS 11.

### (b) Whether AST already distinguishes single-expression from multi-statement attribute values

**Finding (matches saved survey):** No. The tokenizer (`compiler/src/tokenizer.ts`) emits ATTR_CALL only for `name=fn(...)` form (stops at matching `)`), and ATTR_IDENT for bareword identifiers. Multi-statement source like `onclick=fn(); other()` parses as `onclick=fn()` then `;` (skipped silently as "unexpected char" at lines 498-499) then `other` as a boolean attribute, then `()` is unhandled.

The silent-skip at the unexpected-char branch is the silence-source. **L19 was designed precisely to catch this silent-bug surface.** B18 adds the diagnostic without altering tokenizer behavior — the scan is performed on the raw opener slice at AST-builder time, mapping each top-level `;` to the most recent `name=` token via local regex over the opener slice.

### (c) `:`-shorthand body coverage

**Confirmed in scope (matches saved survey):** SPEC §4.14 line 980 explicitly cross-refs `E-MULTI-STATEMENT-HANDLER` for `<Idle : startGame(); track()>` form; §6.6.1 line 980 also references it. B18 owns BOTH event-handler attrs AND engine state-child `:`-shorthand bodies (the two checks share the helper but live in different walkers).

**New finding from this dispatch (NOT in saved survey):** today's block-splitter does NOT tokenize the canonical spec-form `:`-shorthand for engine state-children (`<Idle : startGame()>` — `:` INSIDE opener, body terminated by `>`). BS also chokes on the post-`>` `:` form (`<Idle> : startGame()`) when used as an engine state-child body (the bare `;` at markup level corrupts BS state — the engine block doesn't form). The B15 test-file note (lines 26-31) flags this limitation: parser support for `:`-shorthand was added but BS-side tokenization is pending.

**Consequence:** B18 SYM PASS 11 fire-site #2 cannot be exercised end-to-end via integration source today. Tests invoke `validateEngineStateChildrenAndRules` directly with synthetic engine-decls + parser-produced `EngineStateChildEntry.bodyRaw`. The parser (`parseEngineStateChildren`) IS verified to set `isColonShorthand` correctly for both forms via direct unit tests. When BS-side `:`-shorthand tokenization lands (future dispatch — outside B18 scope), full-pipeline integration tests activate without changing PASS 11.

Match-block `:`-shorthand arm bodies (§18.0.1) remain raw text only — same shape as engine state-children pre-B15 — and are explicitly DEFERRED out of B18 scope.

### (d) `${...}` arrow form is exempt path-distinguished

**Confirmed (matches saved survey):** YES. Tokenizer emits ATTR_EXPR for `${...}` (lines 366-384); the entire bracket-balanced content is one opaque token that never enters the L19 scan target.

**Implementation cross-check:** the markup-attribute scan walks `block.raw` directly (not the token stream), so it sees the literal `${...}` text. The helper `scanForTopLevelSemicolon` treats `{` as opening a brace-tracked region (depth++); any `;` inside is not top-level. The `$` prefix is handled implicitly because `${...}` enters brace tracking at the `{` — the same path as bare `{`. Verified by §B18.7 test cases.

### (e) Existing test coverage of E-MULTI-STATEMENT-HANDLER

**Confirmed (matches saved survey):** Zero matches in `compiler/tests/` and `compiler/src/`. Net-new diagnostic. B18 owns the entire test surface — 55 tests landed in `compiler/tests/unit/multi-statement-handler-b18.test.js`.

---

## §2 Plan (executed)

1. **Helper module** at `compiler/src/multi-statement-scan.ts` exporting `scanForTopLevelSemicolon(text: string): SemicolonHit[]` and `isEventHandlerAttrName(name: string): boolean`. Tracks paren/brace/bracket depth, single/double/backtick string state with escape, line/block comments, `${...}` template-literal interpolation depth (with nested-template support).
2. **Markup-attribute fire-site (#1)** in `compiler/src/ast-builder.js` markup branch. After `parseAttributes` runs, scan the opener slice (between `attrStart` and `openerEnd` from `scanOpenerForAttrs`), map each top-level `;` to its enclosing attribute via local regex `([A-Za-z_][A-Za-z0-9_:\-]*)\s*=`, fire `E-MULTI-STATEMENT-HANDLER` on hits whose owning attr passes `isEventHandlerAttrName`. Wrapped in try/catch — any helper failure is a survivable degradation (no AST build breakage).
3. **Engine state-child fire-site (#2)** in `compiler/src/symbol-table.ts` SYM PASS 11 (`validateEngineStateChildrenAndRules`). Added a final loop after rule= validation: for each `EngineStateChildEntry` with `isColonShorthand: true` whose `bodyRaw` contains a top-level `;`, fire `E-MULTI-STATEMENT-HANDLER` per §4.14 line 980. Required parser change: extended `EngineStateChildEntry` interface with `isColonShorthand: boolean` and updated `parseEngineStateChildren` to set it.
4. **Tests** at `compiler/tests/unit/multi-statement-handler-b18.test.js` — 55 tests covering all 7 brief scenarios + edge cases. Engine state-child fire-site uses direct `validateEngineStateChildrenAndRules` invocation (now exported) due to BS-side `:`-shorthand tokenization gap noted in §1(c).

---

## §3 OUT-OF-SCOPE / DEFERRED

- **Match-block `:`-shorthand arm bodies (§18.0.1):** parser yields raw text only; same shape as engine state-children pre-B15. Out of B18; future micro-step.
- **Canonical-form `:`-shorthand engine state-children full-pipeline integration test:** BS-side tokenization gap. Future dispatch when BS adds the `<Tag : single-expression>` opener form. PASS 11 walker is forward-compatible — same parser → same fire path; only test source-form needs to change.
- **Compile-time named-function existence validation:** resolver territory (B3-style); B18 only validates the bare-form shape.
- **A1c codegen** for bare-form lowering (§5.2.1): codegen concern.
- **`onserver:*` / `onclient:*` channel attribute handlers — out-of-scope brief carve-out reversed:** per saved survey + this dispatch, the prefix-match regex covers them via `isEventHandlerAttrName` (the same single-expression rule applies). The brief's "OUT OF SCOPE" carve-out was permissive / hedged ("if scope is unclear at survey, scope-restrict"); the survey was clear, so the broader inclusion is shipped. §B18.15 codifies.

---

## §4 Spec-prose follow-ups

None expected. SPEC §5.2.3 + §4.14 + §34 catalog row 14260 are normative-complete. Cross-refs §4.14 line 980 (engine state-child `:`-shorthand) and §6.6.1 already reference E-MULTI-STATEMENT-HANDLER. The surface-form gap noted in §1(c) is a parser/tokenizer implementation gap, not a spec gap — spec text correctly describes the canonical form (`<Tag : single-expression>`); BS-side tokenization will catch up in a future dispatch.

---

## §5 Re-dispatch deltas vs SURVEY-failed-dispatch-1.md

- §1(c): added the BS-side tokenization gap finding (canonical `:`-shorthand engine state-children not produced by BS today; post-`>` form also not produced when used as engine body). This was implicit in the B15 test-file note but not explicitly in the saved survey.
- §3: refined `onserver:`/`onclient:` decision — included via prefix-match regex (`isEventHandlerAttrName`) per saved survey reasoning, reversing brief's "OUT OF SCOPE" hedge.
- Implementation: added `isColonShorthand: boolean` field to `EngineStateChildEntry` interface (saved survey said the parser would track this internally but didn't specify the type-level surface).
- Tests: documented surface-form note in test-file header so future readers / agents understand the direct-validator-invocation pattern for fire-site #2.
