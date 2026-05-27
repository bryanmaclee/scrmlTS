# R24-BUG-2 — `!{}` handler `{ return }` arm codegen emits `_result = return;` (invalid JS)

**Change-id:** `r24-bug-2-handler-arm-return-codegen-2026-05-27`

**Severity:** HIGH (known-gaps Bug 29 / S136). Adopter-visible: compile exits 0 but emitted client JS contains `let _scrml__scrml_result_46 = return;` (and similar) — invalid JS, fails `node --check`, fails at runtime with `SyntaxError`. Surfaced 8 times in R24 dev-1-react alone. Affects every error-handler arm with a no-op-with-return body — the DOMINANT adopter shape per PRIMER §6.

This is the companion bug to R24-BUG-1 (Bug 28 — RESOLVED in S136 commit 89008e97). Same shape: codegen drift on a canonical adopter form that compiles exit-0 but produces invalid JS. R24-BUG-1 covered word-form boolean operators; R24-BUG-2 covers error-handler arm bodies with terminating statements.

## Bug summary

When a failable function's `!{}` error handler has an arm body that ends with a terminating statement (`return`, `throw`, `break`, `continue`), the codegen wraps the arm body as `let _result = ARM_BODY;` — but a terminating statement is NOT an expression, so the emitted JS is a syntax error.

**Concrete reproducer** — `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/dev-1-react.scrml` lines 159-161 (and 169-171, 153-156):

```scrml
function moveTo(ticketId, newStatus) {
    updateStatus(ticketId, newStatus) !{
        | .NotFound -> { return }
        | .IllegalTransition data -> { return }
        | .DbWrite msg -> { return }
    }
    // ... rest of function
}
```

Emitted JS (current behavior, `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/dist/dev-1-react.client.js` lines 298, 302, 315, 319, 323+):

```javascript
_scrml__scrml_result_46 = return;
```

Expected: the `{ return }` arm body's `return` should propagate as an early-return from the ENCLOSING function — NOT be wrapped in a `_result = ...` binding. The arm-body emitter must detect terminating statements and skip the `_result` wrap.

## The canonical adopter shape (PRIMER §6 / SPEC §19.4)

The "early-return-on-error" idiom is the DOMINANT pattern for error handlers:

```scrml
function load() {
    const rows = fetchItems() !{
        | .Network msg -> { @phase = .Error(msg); return }
        | .Empty       -> { @phase = .Empty; return }
    }
    @phase = .Success(rows.length)  // unreachable if any arm fired
}
```

Adopters write `return` because they want to BRANCH OUT of the function on error and SKIP the post-handler code. The codegen currently treats the arm body as a value-producing expression bound to `_result`, which is correct for arms that DO produce a value, but wrong when the arm body terminates.

## Suspect files (PA-side initial scope)

Likely sites:

- `compiler/src/codegen/emit-variant-guard.ts` — canonical site for `!{}` arm emission (per S118 SPEC §34.1 B2 / `E-EXPR-GUARDED-UNCLOSED` production). Most likely.
- `compiler/src/codegen/emit-control-flow.ts` — secondary; may share arm-body emission logic.
- `compiler/src/codegen/emit-expr.ts` — possibly the result-binding wrapper.
- `compiler/src/codegen/scheduling.ts` — also surfaced in grep; possibly tangential.

Look for the code that emits `let _result_XX = <arm-body>;` — that's the wrap site. The fix: before emitting the wrap, classify the arm body's terminal statement; if it's `return` / `throw` / `break` / `continue`, emit the body directly (no `_result = ...`).

The R24 report's suggested classification is exactly this: "codegen — error-handler arm lowering; teach the arm-body emitter to detect terminating statements and skip the `_result = ...` wrap."

DO NOT assume the fix is just one if-statement — verify by reading the actual code path. There may also be a downstream code path that READS `_result` to determine whether the handler completed normally; that path needs to handle the "no-result-bound" case too.

## Spec references (verify against current SPEC.md; don't trust paraphrase)

- **SPEC §19.4** (Error Handling Revised — `?` propagate, `!` failable, `!{}` handlers, contract).
- **SPEC §19** (Error Handling — full chapter).
- **SPEC §34.1** (Native-Parser Parse Diagnostics — has `E-EXPR-GUARDED-UNCLOSED` per S118 B2 production for `!{}` parsing; helps confirm `!{}` parse-time grammar).

Per pa.md Rule 4 (SPEC is normative; derived planning docs drift): cross-check this brief's spec claims against the current SPEC.md text before encoding the fix. If the spec says something different, the spec wins.

## MAPS — REQUIRED FIRST READ

Before consuming any other context (kickstarter / anti-patterns / SPEC sections / source files),
read `.claude/maps/primary.map.md` in full. It is ~100 lines.

The §"Task-Shape Routing" section in that file tells you which additional maps to consult based
on your task shape. For this task, the shape is **compiler-source bug fix** — follow that routing.

Map currency: maps reflect HEAD `27e14c66` as of 2026-05-27. Recent S136 commits include R24-BUG-1
fix at `compiler/src/expression-parser.ts` + `compiler/src/codegen/rewrite.ts` (commit 89008e97).
Other compiler-source files unchanged since maps watermark. The error-handler codegen files this
dispatch will touch (`emit-variant-guard.ts` etc.) have NOT been touched recently.

Feedback: in your final report, include either:
- "Maps consulted: [list]; load-bearing finding: <one sentence on what the map content told you>"
- "Maps consulted but not load-bearing — [optional: which map you expected to help but didn't]"

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (F4 + S99 + S126)

Your worktree path is whatever the harness assigns — confirm it via Step 1 below.

### Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.
   If the path is under any other repo, STOP and report (S90 CWD-routing failure mode).
   Save as WORKTREE_ROOT.
2. Run `git rev-parse --show-toplevel` — MUST equal WORKTREE_ROOT.
3. Run `git status --short` — confirm tree is clean.
4. Run `bun install` — worktrees do NOT inherit node_modules.
5. Run `bun run pretest` — populates `samples/compilation-tests/dist/`.

If ANY check fails: DO NOT proceed.

### S99 first-commit pwd echo (mandatory)

Your FIRST commit message MUST include the verbatim output of `pwd`, e.g.:
`WIP(r24-bug-2): start at $(pwd)`.

### S126 Bash-edit + no-cd-to-main discipline

Use Bash-based edits exclusively (perl/python/heredoc on worktree-absolute paths).
For `bun`: `bun --cwd "$WORKTREE_ROOT" <subcmd>`.
For `git`: `git -C "$WORKTREE_ROOT" <subcmd>`.
NEVER `cd` into the main repo from this dispatch.

## Commit discipline (S83 two-sided rule)

After EVERY edit: diff → add → commit IMMEDIATELY. Don't batch.
Before reporting DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean.

## The fix

1. **Triage** — read `compiler/src/codegen/emit-variant-guard.ts` (most likely site) + identify where `_result_XX = <arm-body>;` is emitted. Trace the arm-body emission to see how it composes a value-shaped expression. Identify whether:
   (a) the wrap site can be made conditional on "arm body's terminal statement is/isn't a terminating statement" — simplest fix
   (b) the wrap site is structurally always-on and you need to restructure the emission — bigger fix
   (c) the bug is upstream in arm-body normalization, not in the wrap site
   Report your triage finding before patching.

2. **Patch** — for arms whose body terminates with `return`/`throw`/`break`/`continue`:
   - Emit the arm body directly (no `_result = ...` wrap)
   - Ensure downstream code (if it reads `_result` to determine handler completion) handles the "terminating arm" case correctly
   - Preserve the existing behavior for arms whose body produces a value (the `_result = expr;` shape stays for those)

3. **Regression test** — author a test in `compiler/tests/unit/` pinning the fix. Coverage MUST include:
   - Single-arm handler with `{ return }` body
   - Multi-arm handler with all arms terminating (the R24 reproducer shape)
   - Mixed handler: some arms terminating, some producing values (verify both paths emit correctly)
   - Other terminating statements: `{ throw err }`, `{ break }`, `{ continue }`
   - Arm body with non-terminating early-return: `{ if (cond) return; @x = 5 }` — the terminal statement here is `@x = 5`, NOT `return`, so the `_result` wrap should stay
   - Negative-control: verify a value-producing arm (`{ "fallback" }`) still emits `_result = "fallback";` correctly

4. **Run the full test suite** via `bun --cwd "$WORKTREE_ROOT" run test` and verify 0 regressions. Current baseline: 14,785 pass / 0 fail / 88 skip / 1 todo (post-R24-BUG-1 fix).

5. **Verify the reproducer**: compile dev-1-react.scrml via path-aware command:
   ```
   bun --cwd "$WORKTREE_ROOT" run compiler/src/cli.js compile \
     /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/dev-1-react.scrml \
     -o /tmp/r24-bug-2-verify/
   ```
   Then `node --check /tmp/r24-bug-2-verify/*.client.js`. Expected: no `_scrml_result_XX = return;` patterns; `node --check` passes (or at minimum makes progress past the previous failure point — dev-1-react.scrml has OTHER R24 bugs too, so the file may still have issues from Bugs 31/32 etc).

## Required tests

- Regression test in `compiler/tests/unit/` (see step 3)
- Full `bun run test`: 0 fail required (baseline 14,785)

## Final report shape

When done, report back with:

- **WORKTREE_ROOT:** <full path>
- **BRANCH:** <agent branch name>
- **FINAL_SHA:** <tip SHA of your branch>
- **FILES_TOUCHED:** <list with line counts>
- **TRIAGE_FINDING:** which of (a)/(b)/(c) above; exact site of the bug
- **FIX_DESCRIPTION:** what you changed and why
- **TEST_RESULTS:**
  - new tests added: <N>
  - full-suite delta: <pre-counts> → <post-counts>
  - dev-1-react.scrml reproducer: `_result = return;` count BEFORE / AFTER
- **MAPS_CONSULTED:** [list with load-bearing finding]
- **DEFERRED_ITEMS:** anything noticed but not fixed (with severity)

If you hit a Phase-0 STOP, STOP and report — don't proceed with code changes.

## What this dispatch is NOT

- NOT a broader error-handler audit. Fix the terminating-statement case, add the regression test, ship.
- NOT a chance to refactor the arm-body emission. Match existing style; surgical fix.
- NOT R24-BUG-1's territory (`or`/`and` lowering — that's already RESOLVED in commit 89008e97). Stay in error-handler codegen.

## Acknowledgments — context this dispatch composes with

- **R24-BUG-1 (Bug 28)** — RESOLVED S136 commit 89008e97 — `or`/`and` codegen lowering. Pattern precedent: 2-site fix + 42-test regression suite. THIS dispatch follows the same shape.
- **R24 report** at `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24-report.md` § "Compiler bugs surfaced" → R24-BUG-2.
- **known-gaps Bug 29** at `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/known-gaps.md` (HIGH; S136 R24).
- R24-BUG-4 (`<match>` `</>` closer Phase 5 gap) and Bugs 30/31/32/33/34 are SEPARATE — don't widen scope.

Good luck.
