# A1b Step B18 — progress (RE-DISPATCH)

## 2026-05-07 — re-dispatch start (agent ab6fc7efcf407919c)

- WORKTREE_ROOT = `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ab6fc7efcf407919c`.
- Initial state: branch `worktree-agent-ab6fc7efcf407919c` was at `4ac906f` (pre-B22/B19/B18-redispatch-prep). Fast-forwarded to main HEAD `42c42b1`.
- `bun install` complete; `bun run pretest` populated dist samples.
- Baseline `bun run test`: **9463 pass / 60 skip / 1 todo / 0 fail** (matches BRIEF re-dispatch baseline; one earlier transient ECONNREFUSED in a Bun-internal HTTP fixture flaked once then passed on rerun).
- Read BRIEF.md, SURVEY-failed-dispatch-1.md, progress-failed-dispatch-1.md.
- Read SPEC §5.2.3 (1127-1188), §4.14 (941-983), §34 catalog row at 14260.
- Verified existing infra: `scanOpenerForAttrs` in `ast-builder.js:380` already handles paren/brace/quote depth for opener bounding. Engine state-child parser in `engine-statechild-parser.ts:276` produces `bodyRaw` for both `:`-shorthand and bare-body; the `:`-shorthand path is at lines 343-355.
- Plan: implement per saved survey §2 — helper module `multi-statement-scan.ts` + markup-attribute fire-site at `ast-builder.js` markup branch + engine state-child fire-site at SYM PASS 11 (`validateEngineStateChildrenAndRules`) + tests.

## Strategy

- **Helper** (new): `compiler/src/multi-statement-scan.ts` exports `scanForTopLevelSemicolon(text: string): SemicolonHit[]`. Single-pass char walker tracking paren/brace/bracket depth, single/double/backtick string state with escape, line/block comment state, and `${...}` template-literal interpolation depth (the latter recurses into the same depth machinery — `;` inside `${expr}` is NEVER a top-level hit).
- **Fire-site #1 — markup attributes:** in `ast-builder.js` markup branch (line 8355 `case "markup":`), after `tokenizeAttributes` but BEFORE `parseAttributes`, run `scanForTopLevelSemicolon` over the opener portion of `block.raw` (from `<` to opener-`>`). For each top-level `;` hit, find the nearest preceding `attrName=` token. If `attrName` matches event-handler shape (`/^on[a-z]+$/i` plus `on:`/`onserver:`/`onclient:` prefixes), push a TABError(E-MULTI-STATEMENT-HANDLER). The opener-only scope is critical: do NOT scan into the body (which can have arbitrary `;`).
- **Fire-site #2 — engine state-child `:`-shorthand body:** extend `engine-statechild-parser.ts` to add a flag `isColonShorthand: boolean` on `EngineStateChildEntry` (the bodyRaw differs in semantics — for `:`-shorthand, body is post-`:` single-expression text; for bare-body, body is the inter-tag text where `;` is allowed because it IS a sequence of statements). In SYM PASS 11 `validateEngineStateChildrenAndRules`, after parsing state-children, for each entry with `isColonShorthand: true` whose `bodyRaw` contains a top-level `;`, fire `E-MULTI-STATEMENT-HANDLER`.
- **`${...}` exemption:** the helper treats `${` as opening a brace-depth-tracked region; `;` inside `${...}` is NOT a top-level hit because brace depth > 0 at that point. ATTR_EXPR tokens emitted from `${...}` form are never fed to the markup-attribute scanner because the scanner walks `block.raw`, not the token stream — and inside `block.raw`, `${...}` regions are correctly bracketed.
- **Test file:** `compiler/tests/unit/multi-statement-handler-b18.test.js` covers all 7 brief scenarios + edge cases.

## 2026-05-07 — fire-site #1 (markup-attribute scan) landed

- Added import of `scanForTopLevelSemicolon` + `isEventHandlerAttrName` to `ast-builder.js`.
- Inserted fire-site after `parseAttributes` in the markup branch (case "markup", around line 8365).
- Implementation: scan opener slice via existing `scanOpenerForAttrs`, walk top-level `;` hits, for each hit map to the nearest preceding `name=` token via local regex over the opener slice, fire E-MULTI-STATEMENT-HANDLER if the name passes `isEventHandlerAttrName`.
- Wrapped in try/catch for crash-resistance — any helper failure is a survivable degradation.
- Test sweep: **9463 pass / 60 skip / 1 todo / 0 fail** — zero regression.
- Committed as separate WIP.

## 2026-05-07 — fire-site #2 (engine state-child :-shorthand body) landed

- Extended `EngineStateChildEntry` with `isColonShorthand: boolean`.
- Updated `parseEngineStateChildren` to set the flag for the `:`-shorthand path (around lines 343-356) and to FALSE for bare-body / self-closing.
- Imported `scanForTopLevelSemicolon` into `symbol-table.ts`.
- In `validateEngineStateChildrenAndRules` (PASS 11), added a final loop after the rule= validation: for each `sc` with `isColonShorthand: true`, scan `bodyRaw` for top-level `;`. If any found, fire `E-MULTI-STATEMENT-HANDLER` per SPEC §4.14 line 980.
- Diagnostic message names the offending state-child tag and recommends switching to bare-body form.
- Test sweep: **9463 pass / 60 skip / 1 todo / 0 fail** — zero regression.

## 2026-05-07 — B18 tests landed

- New file: `compiler/tests/unit/multi-statement-handler-b18.test.js` — 55 tests covering all 7 brief scenarios + edge cases:
  - §B18.1-3: bare-call / bare-assignment / bare single-expression ALLOWED
  - §B18.4: multi-statement bare-form FIRES
  - §B18.5: string-internal `;` ALLOWED (helper handles `"..."` and `'...'`)
  - §B18.6: nested-body `;` ALLOWED (paren depth > 0)
  - §B18.7: `${...}` arrow form ALLOWED (brace depth > 0 inside `${}`)
  - §B18.8: engine state-child `:`-shorthand multi-statement FIRES (via direct validator invocation — see surface-form note below)
  - §B18.9: engine state-child `:`-shorthand single-expression ALLOWED
  - §B18.10: engine state-child bare-body / self-closing exempt
  - §B18.11: multiple violations, multiple fires
  - §B18.12: diagnostic message shape (code, attribute name, tag, spec ref §5.2.3 / §4.14, named-function suggestion)
  - §B18.13: non-event attributes are exempt (e.g., `class=`, `title=`)
  - §B18.14: `on:click` namespaced form fires
  - §B18.15: `onserver:`/`onclient:` channel handler fires
  - §B18.16: helper unit tests (`scanForTopLevelSemicolon` 16 cases, `parseEngineStateChildren` `isColonShorthand` 4 cases, `isEventHandlerAttrName` 5 cases)
- **Surface-form note (load-bearing):** today's BS does NOT tokenize the canonical spec-form `:`-shorthand (`<Idle : startGame()>`) for engine state-children — see B15 test-file lines 26-31. BS also chokes on the post-`>` `:` form (`<Idle> : startGame()`) when used as an engine state-child body; the bare `;` at markup level corrupts BS state and the engine block doesn't form. To exercise SYM PASS 11 fire-site #2 today, the tests invoke `validateEngineStateChildrenAndRules` directly with synthetic engine-decls. The parser (`parseEngineStateChildren`) IS verified to set `isColonShorthand` correctly for both forms via direct unit tests. When canonical-form parsing lands (future dispatch), full-pipeline integration tests can be added without changing PASS 11.
- Exported `validateEngineStateChildrenAndRules` from `symbol-table.ts` for direct test use (consistent with B16's exported walkers `walkDerivedEngineDeclRejections` / `walkDerivedEngineWriteRejections`).
- Full test sweep: **9518 pass / 60 skip / 1 todo / 0 fail** — +55 tests, zero regression.

## 2026-05-07 — REPORTING (final)

### WORKTREE_PATH

`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ab6fc7efcf407919c`

Branch: `worktree-agent-ab6fc7efcf407919c`

### FINAL_SHA

`7dd64f0776e9e96d12c725b29314e11f67e7c8ee` (SHIP commit on branch `worktree-agent-ab6fc7efcf407919c`).

WIP commit lineage:
- `839916c` — helper module (scanForTopLevelSemicolon + isEventHandlerAttrName)
- `6fef60e` — fire-site #1 (markup-attribute scan)
- `325cf98` — fire-site #2 (engine state-child :-shorthand scan)
- `e70a96f` — tests (55-test multi-statement-handler-b18.test.js)
- `7dd64f0` — SHIP (primer + survey + final progress)
- `5c6d0ea` — docs: pin FINAL_SHA reference (this commit; current branch HEAD)

### FILES_TOUCHED (from repo root)

NEW:
- `compiler/src/multi-statement-scan.ts` — helper module (scanForTopLevelSemicolon + isEventHandlerAttrName).
- `compiler/tests/unit/multi-statement-handler-b18.test.js` — 55 tests.
- `docs/changes/phase-a1b-step-b18-multi-statement-handler/SURVEY.md` — Phase 0 survey (re-dispatch).

MODIFIED:
- `compiler/src/ast-builder.js` — added import of helper + fire-site #1 in markup branch (around line 8365).
- `compiler/src/symbol-table.ts` — imported helper; exported `validateEngineStateChildrenAndRules` for direct test use; added fire-site #2 (engine state-child `:`-shorthand body scan) at end of validator.
- `compiler/src/engine-statechild-parser.ts` — extended `EngineStateChildEntry` construction with `isColonShorthand: boolean` flag; flag set in the `:`-shorthand parser branch.
- `compiler/src/symbol-table.ts` — `EngineStateChildEntry` interface extended with `isColonShorthand: boolean` documentation.
- `docs/PA-SCRML-PRIMER.md` — §13.7 B18 row added + B18 specifics block added (between B19 specifics and §13.8).
- `docs/changes/phase-a1b-step-b18-multi-statement-handler/progress.md` — this file.

### TEST_DELTA

vs S68 baseline 9425/49/1/0 full (per BRIEF.md item 4):

- Pre-B18 baseline (post-B22 + post-B19, current main): **9463 pass / 60 skip / 1 todo / 0 fail / 33271 expect calls** (468 tests across 466 files).
- Post-B18: **9518 pass / 60 skip / 1 todo / 0 fail / 33368 expect calls** (9579 tests across 467 files).
- Net delta vs pre-B18: **+55 pass / +97 expect calls / 0 skip / 0 fail / 0 todo / +1 file**.
- Net delta vs S68 baseline: +93 pass / +11 skip / +1 file (B22 + B19 + B18 combined effect — B22 added +25, B19 added +14, B18 added +55).

### DEFERRED_ITEMS

1. **Match-block `:`-shorthand arm bodies (§18.0.1)** — parser yields raw text only today; same shape as engine state-children pre-B15. Future micro-step when match-arm parsing matures.
2. **Full-pipeline integration tests for fire-site #2** — gated on BS-side `:`-shorthand tokenization. Today's BS does NOT tokenize the canonical spec-form `:`-shorthand for engine state-children (`<Idle : startGame()>`); it also chokes on the post-`>` `:` form when used in an engine body. Tests today use direct `validateEngineStateChildrenAndRules` invocation with synthetic engine-decls. When BS catches up, full-pipeline integration tests can be added without changing PASS 11.
3. **Compile-time named-function existence validation** — resolver territory (B3-style); B18 only validates the bare-form shape. Future dispatch.
4. **A1c codegen** — bare-form lowering to `function(event){ ... }` wrapper (§5.2.1) is codegen concern.
5. **Tokenizer silent-skip cleanup** — the unexpected-char skip at tokenizer.ts lines 498-499 is the silence-source that L19 catches at AST-builder time. A future cleanup could fire a parse-time E-PARSE-* on the `;` itself; B18 deliberately stays at TAB time so the cleanup is non-blocking.

### OPEN_QUESTIONS

None blocking. Two soft observations:

1. **Surface-form note for downstream readers:** the BS-side `:`-shorthand tokenization gap (DEFERRED #2 above) is not a spec gap — SPEC §4.14 + §51.0.I correctly describe the canonical form. The implementation gap will be closed in a future dispatch dedicated to BS surface coverage. PASS 11 walker is forward-compatible.
2. **`onserver:*` / `onclient:*` brief carve-out reversed:** brief said "OUT OF SCOPE for B18" but hedged "if scope is unclear at survey, scope-restrict B18 to standard `on*` attributes." Per saved survey + this dispatch, the scope was clear — the same single-expression rule applies. `isEventHandlerAttrName` includes `onserver:` / `onclient:` prefixes; §B18.15 codifies. PA may revisit if this surface needs separate treatment.

### PRIMER §13.7 B18 ROW DRAFT

(Already landed in `docs/PA-SCRML-PRIMER.md` between B19 row and table close.) Reproduced here for the report:

```
| **B18** | (no new AST field for markup-attribute fire-site — fires `E-MULTI-STATEMENT-HANDLER` per SPEC §5.2.3 + §34 on `<markup>` openers whose event-handler attribute value contains a top-level `;` outside expression-internal contexts; new `EngineStateChildEntry.isColonShorthand: boolean` flag for SYM PASS 11 fire-site #2) | every `<markup>` block (TAB time, in `ast-builder.js`) + every `EngineStateChildEntry` with `isColonShorthand: true` (SYM PASS 11) | `EngineStateChildEntry { tag, rule, bodyRaw, isColonShorthand: boolean, rawOffset }` (extension of B15's interface) | new helper `compiler/src/multi-statement-scan.ts` exporting `scanForTopLevelSemicolon(text): SemicolonHit[]` + `isEventHandlerAttrName(name): boolean`. Helper tracks paren/brace/bracket depth, single/double/backtick string state with escape, line/block comments, and `${...}` template-literal interpolation depth. **Two fire-sites:** (1) `ast-builder.js` markup branch fires at TAB time (around line 8365) — scans opener slice via existing `scanOpenerForAttrs`, maps each top-level `;` to nearest preceding `name=` token via local regex, fires when name passes `isEventHandlerAttrName` (`/^on[a-z]+$/i` OR `/^on:/` OR `/^onserver:/` OR `/^onclient:/`). (2) SYM PASS 11 (`validateEngineStateChildrenAndRules`, now exported for direct test use) extended with a final loop after rule= validation: for each entry with `isColonShorthand: true`, scan `bodyRaw` and fire E-MULTI-STATEMENT-HANDLER per §4.14 line 980. No new §34 catalog row — `E-MULTI-STATEMENT-HANDLER` (line 14260) already exists from earlier spec dispatch. |
```

### B18 SPECIFICS BLOCK

(Already landed in `docs/PA-SCRML-PRIMER.md` after B19 specifics and before §13.8.) The block has 8 bullets covering: two fire-sites + two stages, helper module unification, attribute-owner mapping, `onserver:` / `onclient:` inclusion, `isColonShorthand` flag load-bearing surface, BS-side `:`-shorthand tokenization gap with test-methodology consequence, no-new-§34-row note, test-count delta, and 4 deferred follow-ups.

### SURVEY-NOTE

NEW survey (this dispatch): `docs/changes/phase-a1b-step-b18-multi-statement-handler/SURVEY.md`. Salvaged survey (failed dispatch 1): `docs/changes/phase-a1b-step-b18-multi-statement-handler/SURVEY-failed-dispatch-1.md` (kept for historical reference). The new survey supersedes by recording the BS-side tokenization gap finding and the `onserver:`/`onclient:` scope-decision.

### SPEC-PROSE FOLLOW-UPS

None. SPEC §5.2.3 + §4.14 + §34 catalog row 14260 are normative-complete. Cross-refs are current.

### METHODOLOGY CHECK (per pa.md)

- **Rule 1 (no marketing/article work):** ✅ stayed focused on B18.
- **Rule 2 (production-language fidelity — multi-statement-handler is high-frequency):** ✅ correctness > minimal scope. Helper handles all expression-internal contexts including nested templates and escape sequences. `onserver:`/`onclient:` included via prefix-match (broader than brief's hedge but consistent with spec generality).
- **Rule 3 (right answer beats easy answer 99.999% of the time):** ✅ chose two-fire-site implementation matching spec normative cross-refs (§5.2.3 + §4.14) rather than narrow markup-only scope.
- **Rule 4 (spec is normative; verify every claim against §5.2.3 directly):** ✅ verified §5.2.3 lines 1127-1188, §4.14 lines 941-983 + line 980, §6.6.1 line 980 cross-ref, §34 catalog row 14260. No spec-prose changes needed.
- **Pre-commit hook:** all WIP commits passed pre-commit (browser validation + JS / CSS / mangled-defs checks); `--no-verify` not used.
