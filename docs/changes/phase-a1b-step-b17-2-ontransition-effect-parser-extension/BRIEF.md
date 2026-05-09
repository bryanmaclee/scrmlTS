# Phase A1b — Step B17.2: parser-extension for `<onTransition>` + `effect=`

**Phase:** A1b sub-step continuation. B17 SHIPPED earlier (E-COMPONENT-ENGINE-SCOPE only); B17.2 lands the deferred parsing of `<onTransition>` + `effect=` per `compiler/src/symbol-table.ts:5128-5139` deferred list items 1+2.
**Estimate:** 3-5h focused (narrow scope per S74 user ratification — body-scan extension only, no full body-parse).
**Dispatched:** 2026-05-09 (S74).
**Authority chain:** SPEC §51.0.H (`effect=` attribute and `<onTransition>` element, lines ~20457-20507) + §51.0.I (`:`-shorthand for body, lines ~20508-20527). A5-2 body-scan precedent for `<onTimeout>` + nested `<engine>` (engine-statechild-parser.ts lines 4-7 + 32-36 + 745-762). PA Rule 4: SPEC §51.0.H wins over any planning-doc paraphrase.

## Re-scope notice (encoded by PA pre-dispatch)

S74 PA surfaced two ratification points before authoring this brief:

**Q1 — Naming:** B17.2 sub-step continuation. PA framing: B17 SHIPPED only the E-COMPONENT-ENGINE-SCOPE check; the deferred list at `symbol-table.ts:5128-5139` enumerates 5 items. B17.2 lands items 1+2 (`effect=` + `<onTransition>` parsing for engine state-child bodies). Items 3+4+5 (inside-component-body cases + inside-`<match>`-arms) remain deferred (separate parser-architecture concerns — different containers).

**Q2 — Scope:** NARROW (body-scan extension) per A5-2 precedent. Does NOT do full body-parse to walkable AST. State-child bodies remain RAW TEXT otherwise. Body rendering remains separately blocked (a future "wide" step will land that).

## Goal (one paragraph)

Extend `engine-statechild-parser.ts` body-scan + opener-attribute extraction to populate two new annotations on `EngineStateChildEntry`:
1. **`effectRaw: string | null`** — the raw `effect=${...}` attribute value from the state-child opener tag (parallel to how `rule=` is parsed today).
2. **`onTransitionElements: OnTransitionEntry[]`** — siblings inside the state-child's `bodyRaw` that are `<onTransition>` elements, captured by body-scan with offset + attribute summary + body raw text (mirrors A5-2's `onTimeoutElements[]` + `innerEngines[]` pattern).

After B17.2 lands, downstream codegen (a future C-step or C13b extension) can consume these annotations directly to emit hook firing per §51.0.H.

## Re-scope on typer diagnostic firing (DECISION SURFACED — NOT in narrow scope per user ratification)

§51.0.H mandates `E-ENGINE-EFFECT-AMBIGUOUS` (§34) when `effect=` appears on a state-child whose `rule=` is multi-target. SPEC line 20471: *"Combining `effect= with a multi-target `rule=` is ambiguous (which target triggers it?) — `E-ENGINE-EFFECT-AMBIGUOUS` (§34)."*

This is a TYPER-PASS diagnostic (A5-3 territory), not a parser concern. Per the user's "narrow first, wide later" ratification, B17.2 ships PARSER ONLY. Typer diagnostic firing for E-ENGINE-EFFECT-AMBIGUOUS becomes a separate sub-step (B17.3 or A5-4 or similar — naming TBD when it dispatches).

**Sequencing note for downstream C-step:** the eventual codegen step that consumes B17.2's annotations to emit `effect=` + `<onTransition>` firing SHOULD wait for B17.3 (typer diagnostic firing) to ship FIRST. Otherwise spec-violating programs (`effect=` on multi-target rule) compile to potentially-broken JS without the loud-error guard. SURFACE this sequencing observation in B17.2's final report so PA tracks it.

## What's already in place (depth-of-survey signal)

**A5-2 precedent — exactly the pattern B17.2 mirrors:**

`compiler/src/symbol-table.ts:339-368` defines `OnTimeoutEntry` + `NestedEngineEntry`:
```ts
export interface OnTimeoutEntry {
  after: string;       // raw `after=` value
  to: string;          // variant name (no leading dot)
  rawOffset: number;   // offset relative to enclosing state-child's bodyRaw
}

export interface NestedEngineEntry {
  rawText: string;     // verbatim source slice
  rawOffset: number;
}
```

`compiler/src/symbol-table.ts:414-420` adds these to `EngineStateChildEntry`:
```ts
onTimeoutElements: OnTimeoutEntry[];   // §51.0.M
innerEngines: NestedEngineEntry[];      // §51.0.Q.1
```

`compiler/src/engine-statechild-parser.ts:737-762` populates them via body-scan. The actual body-scan helpers (find `<onTimeout`, find `<engine` openers, extract attribute substrings, record offsets) are the canonical pattern B17.2 extends.

**`<onTransition>` per §51.0.H lines ~20473-20503 — what to extract:**

| Attribute | Shape | Required? |
|---|---|---|
| `to=.Variant` | Target variant (from-state's outgoing transition target) | One-of {to, from} |
| `from=.Variant` | Source variant (placed in TARGET state-child for incoming-transition handler) | One-of {to, from} |
| `once` | Bare attribute (boolean — handler runs at most ONCE for engine's lifetime) | Optional |
| `if=expr` | Conditional gating (handler fires only when expr evaluates true at transition time) | Optional |

Body shape: `<onTransition to=.Fire>${ playSound("fire"); animateFlame() }</>` — bare body (effect statements). May also be `:`-shorthand per §51.0.I (single-expression body) since `<onTransition>` is structurally a state-child-tag-like element. Survey: confirm `:`-shorthand applies to `<onTransition>` per §51.0.I or just to `<Variant>` openers. Lean: §51.0.I applies broadly to scrml-defined structural elements with bodies; B17.2 supports both forms parser-side.

**`effect=` per §51.0.H lines ~20461-20471 — what to extract:**

`effect=${ ... }` is a logic-context expression on a state-child opener. Today's opener parser captures `rule=` and similar attrs into `EngineRuleForm`; `effect=` needs a parallel field on `EngineStateChildEntry`. The expression body is the substring between the `${` and the matching `}` per the standard logic-context delimiter rules.

**Existing parser entry points to extend:**

- `parseStateChildOpener` (or equivalent in `engine-statechild-parser.ts` lines ~600-700 — survey to find) — parses the state-child's opener tag including `rule=`, `internal:rule=`, `history`. Extends to also capture `effect=`.
- `bodyScan` (or equivalent — driver of the `onTimeoutElements` + `innerEngines` body-scan around lines 745-762) — extends to also detect `<onTransition` openers + extract their attributes + body offset.

## Scope (in / out)

**IN scope (B17.2):**

1. **NEW `OnTransitionEntry` interface** in `compiler/src/symbol-table.ts` with shape:
   ```ts
   export interface OnTransitionEntry {
     /** `to=.Variant` value (no leading dot). null when not present. */
     to: string | null;
     /** `from=.Variant` value (no leading dot). null when not present. */
     from: string | null;
     /** `once` bare attribute. true when present. */
     once: boolean;
     /** `if=` raw expression text (between `${` and matching `}`). null when not present. */
     ifExprRaw: string | null;
     /** Raw body text between opener and closer (effect statements OR :-shorthand expression).
      *  Empty string for self-closing `<onTransition .../>` (degenerate but legal). */
     bodyRaw: string;
     /** TRUE when body parsed via `:`-shorthand (§51.0.I); FALSE for bare-body or self-closing. */
     isColonShorthand: boolean;
     /** Substring offset (relative to enclosing state-child's bodyRaw) of `<onTransition` opener. */
     rawOffset: number;
   }
   ```

2. **NEW field on `EngineStateChildEntry`** (in `compiler/src/symbol-table.ts`):
   - `effectRaw: string | null` — the raw text between `${` and matching `}` of the state-child opener's `effect=` attribute. `null` when `effect=` is absent.
   - `onTransitionElements: OnTransitionEntry[]` — empty array when none present.

3. **Extend `engine-statechild-parser.ts` opener-attribute parsing** to capture `effect=${...}` from the state-child opener tag and populate `effectRaw` on the new `EngineStateChildEntry`. Mirror the existing `rule=` extraction pattern for delimiter handling (`${...}` balanced-brace scan).

4. **Extend `engine-statechild-parser.ts` body-scan** (the same loop that finds `<onTimeout` and nested `<engine` openers) to also detect `<onTransition` openers. For each:
   - Extract `to=`, `from=`, `once`, `if=${...}` attributes from the opener.
   - Find the matching closer (`</>`, `</onTransition>`, OR `:`-shorthand line-end per §51.0.I).
   - Capture `bodyRaw` (between opener and closer) + `isColonShorthand` flag + `rawOffset`.
   - Record `OnTransitionEntry` into `onTransitionElements[]`.

5. **Skip-region handling** — `<onTransition>` regions must be excluded from the `onTimeoutElements` + `innerEngines` body-scans (so an `<onTimeout>` inside an `<onTransition>` body isn't double-counted). Mirror the existing `skipRegions` array pattern at `engine-statechild-parser.ts:745-748`.

6. **Tests:** `compiler/tests/unit/b17-2-ontransition-effect-parser.test.js`. Cover at minimum:
   - Single state-child with `effect=${log("x")}` opener → `effectRaw` populated.
   - Single state-child with `<onTransition to=.Fire>${...}</>` body → `onTransitionElements` has 1 entry.
   - Multi-target `<onTransition>` (e.g., `<onTransition to=.Fire once if=${@gameOver==false}>...</>`) — all 4 attrs captured.
   - `from=.Variant` form (incoming transition handler) — captured separately from `to=`.
   - `:`-shorthand body (`<onTransition to=.Fire : playSound("fire")>`) → `isColonShorthand: true`, `bodyRaw` is post-`:` text.
   - Self-closing `<onTransition to=.Fire/>` → `bodyRaw` empty, `isColonShorthand: false`.
   - Multiple `<onTransition>` in one state-child body → all captured in order.
   - `<onTransition>` body containing `<onTimeout>` siblings → onTimeout NOT double-counted.
   - State-child with NO `effect=` and NO `<onTransition>` → `effectRaw: null`, `onTransitionElements: []`.
   - Co-existence: state-child with `effect=` AND `<onTransition>` children → both captured.
   - Negative: malformed `effect=` (unbalanced braces) → graceful fallback (`effectRaw: null` or parse-error marker — survey decides).
   - Negative: malformed `<onTransition>` opener (missing both `to=` and `from=`) → either skip + warn-trace, or capture with both null — survey decides; document.
   - Regression-guard: A5-2's `onTimeoutElements` + `innerEngines` body-scan still works (smoke test reusing existing fixture).

**OUT of scope (deferred):**

- **Typer diagnostic firing** for E-ENGINE-EFFECT-AMBIGUOUS (multi-target `rule=` + `effect=` combo per §51.0.H line 20471). NEW STEP B17.3 (or A5-4) — author after B17.2 lands.
- **Codegen for `effect=` + `<onTransition>` firing.** NEW STEP after B17.3 lands. Likely a C-step extension to emit-engine.ts (call it C13b or new C-step number).
- **Full body-parse to walkable AST.** Wide step deferred per S74 user ratification ("narrow first, wide later as separate step"). Body rendering remains blocked until that wide step lands.
- **`<onTransition>` / `effect=` parsing INSIDE component bodies.** B17 deferred-list item 3-4; component body markup is still raw text. Separate parser-architecture concern.
- **`<onTransition>` / `effect=` parsing INSIDE `<match>` arms.** B17 deferred-list item 5; match block-form not parsed. Separate parser concern.
- **Validation of `to=`/`from=` variant against the engine's `for=Type` variant set.** Typer concern (A5-3 / B17.3 territory). B17.2 just captures the attribute value as a string.
- **Validation of `if=expr` type/scope.** Typer concern.

## Spec verification (pa.md Rule 4)

Spec sections to read (verbatim) BEFORE writing parser extension:

- **§51.0.H** (lines ~20457-20507) — `effect=` attribute and `<onTransition>` element. Specifically: Form 1 (`effect=` single-target only), Form 2 (`<onTransition>` element), built-in attributes table (to/from/once/if=), default semantics (FROM-state placement fires when LEAVING; TARGET-state `from=X` fires on incoming), `<onEnter>`/`<onLeave>` skipped intentionally, co-existence rules.
- **§51.0.I** (lines ~20508-20527) — `:`-shorthand body form. Three legitimate body forms. `:`-shorthand for `<onTransition>` follows the same rule.
- **§34** rows: `E-ENGINE-EFFECT-AMBIGUOUS` (line ~14377) — out of B17.2 scope but inform the entry shape so B17.3 can fire it.

If derived planning docs (this brief, A5-2 SURVEY, prior B17 dispatch) contradict §51.0.H text, **SPEC WINS.** Quote in SURVEY before writing contradicting tests.

## Dispatch protocol

S67 worktree-as-scratch / file-delta landing.

## Authorized decisions

- **File locus:** EXTEND `compiler/src/engine-statechild-parser.ts` (body-scan + opener-attr parsing). EXTEND `compiler/src/symbol-table.ts` (NEW `OnTransitionEntry` interface + new fields on `EngineStateChildEntry`). NO new files.
- **Test file:** `compiler/tests/unit/b17-2-ontransition-effect-parser.test.js`.
- **Naming convention:** mirror A5-2 — `onTransitionElements` (plural array) + `OnTransitionEntry` (singular entry type). `effectRaw` (single string field, mirrors `rulesRaw` naming convention).
- **`if=` expression delimiter:** §51.0.H grammar uses `if=expr` (no `${...}` wrapper shown in the canonical form). Survey: confirm whether the parser sees `if=(@gameOver==false)` (paren-form) or `if=${@gameOver==false}` (logic-context form). The example at SPEC line 20479 uses `if=(@gameOver == false)` — paren-form. B17.2 should support both forms if both are syntactically legal in the canonical engine state-child body grammar; survey decides shape.

## Sibling-dispatch awareness

If C15 (cross-file engine mount) is dispatched in parallel: file-disjoint (C15 touches `compiler/src/codegen/`; B17.2 touches `compiler/src/engine-statechild-parser.ts` + `compiler/src/symbol-table.ts`). Survey to confirm; expected disjoint.

If A8/A6-2 (test-bind parser) is dispatched in parallel: potentially overlapping (both touch parser/grammar files). Coordinate at brief-write time.

This brief assumes B17.2 dispatches AFTER C14 lands (already shipped at brief-author time, commit `a945313`).

## Anti-patterns reading

`scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — even though this is parser work (not application code), the test fixtures must use canonical scrml shape. State-machine transition handlers have heavy XState `entry`/`exit`/`actions` array training-data bias. The scrml shape is `effect=${...}` attribute (single-target) OR `<onTransition to=.Variant once if=expr>${...}</>` (multi-target/conditional), NOT `actions: [send('GROW'), assign({...})]` array config.

`docs/articles/llm-kickstarter-v1-2026-04-25.md` — kickstarter `<onTransition>` examples (search: `onTransition`).

## File-modification inventory expected

| File | Reason |
|---|---|
| `compiler/src/symbol-table.ts` | NEW `OnTransitionEntry` interface + `effectRaw` + `onTransitionElements` fields on `EngineStateChildEntry` |
| `compiler/src/engine-statechild-parser.ts` | Extend opener-attr parsing for `effect=` + extend body-scan for `<onTransition>` openers + skipRegions handling |
| `compiler/tests/unit/b17-2-ontransition-effect-parser.test.js` (NEW) | Unit tests per §scope IN item 6 |
| `docs/changes/phase-a1b-step-b17-2-ontransition-effect-parser-extension/{progress,SURVEY}.md` | Crash-recovery + survey output (REQUIRED) |

**Negative inventory (MUST NOT touch):**
- `compiler/src/codegen/*` — that's downstream C-step territory; B17.2 is parser-only.
- `compiler/SPEC.md` — no spec changes; spec already covers `<onTransition>` + `effect=`.

## Definition of Done

- All §scope IN items shipped (interface + fields + opener-attr extension + body-scan extension + skipRegions + tests).
- 0 regressions vs baseline (10,426 / 60 / 1 / 0 at S74 post-C14 close).
- Spec re-verified against §51.0.H text directly per pa.md Rule 4.
- A5-2 body-scan (`onTimeoutElements` + `innerEngines`) NOT regressed.
- Existing engine state-child parsing (rule= extraction, history, internal:rule, etc.) NOT regressed.
- B17's E-COMPONENT-ENGINE-SCOPE PASS 13 NOT regressed.
- SURVEY.md documents:
  - `if=` delimiter shape (paren-form vs `${...}` form) decision.
  - Self-closing `<onTransition/>` legality decision (degenerate but harmless? error?).
  - Malformed-attribute fallback decision (skip + warn vs capture-with-null).
  - Verdict shape: SHIP / REFINEMENT / SCOPE-CHANGE / BLOCKER.
- Final report names what B17.3 (typer diagnostic firing) needs from B17.2's output (annotation field names, expected populated state when typer fires E-ENGINE-EFFECT-AMBIGUOUS, etc.).
- Final report names what the future codegen C-step needs from B17.2 (annotation field names + shape for emit-engine.ts consumption).

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is: **<ABSOLUTE-WORKTREE-PATH-PROVIDED-BY-HARNESS>**

## Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST equal the worktree path above. Save as WORKTREE_ROOT.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `bun install` via Bash. Worktrees do NOT inherit `node_modules`.
5. Run `bun run pretest` via Bash.
6. Run `bun run test` (chained, NOT `bun test` directly) via Bash. Confirm 10,426 / 60 / 1 / 0 baseline.

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

## Path discipline (enforce on EVERY Read/Write/Edit call)

- For Read: paths under WORKTREE_ROOT are safe.
- For Write/Edit: **ALWAYS use ABSOLUTE paths under WORKTREE_ROOT.** Do NOT use relative paths or paths starting with the main repo root.

If you find yourself about to write to a path starting with the main repo root, STOP. Re-derive from WORKTREE_ROOT.

## Crash-recovery protocol

Commit after each meaningful change. Update `$WORKTREE_ROOT/docs/changes/phase-a1b-step-b17-2-ontransition-effect-parser-extension/progress.md` after each step.

## Final report format

- WORKTREE_PATH (absolute)
- FINAL_SHA (your branch tip)
- FILES_TOUCHED (list — for PA's `git diff main..<branch> -- <files>` review)
- VERDICT (SHIP / REFINEMENT / SCOPE-CHANGE / BLOCKER)
- TESTS at end: pass / skip / todo / fail counts
- DEFERRED-ITEMS: anything punted to B17.3 / future C-step / PA-decision
- SURVEY summary (one paragraph) — three decisions documented
- B17.3 + downstream-C-step HANDOFFs: annotation field names + populated-state expectations
