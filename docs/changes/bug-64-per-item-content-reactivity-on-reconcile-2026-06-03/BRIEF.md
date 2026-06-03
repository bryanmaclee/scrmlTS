# BRIEF — Bug 64 + R28-1c (per-item interpolated content not reactive on reconcile node-reuse)

**Dispatched:** S158, 2026-06-03 · **Agent:** `scrml-js-codegen-engineer` (opus, isolation:worktree, bg) · **Build-on:** main HEAD `55cf3259` (Bug 72 + Bug 60 landed this session — S112 merge-startup REQUIRED, see brief) · **Change-id:** `bug-64-per-item-content-reactivity-on-reconcile-2026-06-03`

User ruled **(b) full codegen fix** (S158 AskUserQuestion) — per-item content reactivity on reconcile reuse, cross-cutting Tier-0 `for/lift` + Tier-1 `<each>`, closing Bug 64 + R28-1c. PA pre-dispatch: codegen evidence captured (createFn asymmetry — static text vs `_scrml_effect` toggle) + runtime Fast-path-B2 reuse mechanism identified (`runtime-template.js:1300`). **Phase-0 survey gate (STOP-if-architectural) — see THE TASK.**

---

(Verbatim `prompt:` text passed to the Agent call follows.)

---

You are fixing **Bug 64 + R28-1c** in the scrml compiler — a per-item reactivity gap in reconciled list rendering (Tier-0 `${for…lift}` + Tier-1 `<each>`). This is a meatier, perf-sensitive, cross-cutting fix with a **mandatory Phase-0 survey gate**. Change-id: `bug-64-per-item-content-reactivity-on-reconcile-2026-06-03`.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (BEFORE any other tool call)
1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo, STOP and report (S90). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` — MUST equal WORKTREE_ROOT.
3. `git rev-parse HEAD` — record your base.
4. **S112 MERGE-STARTUP (CRITICAL — DO NOT SKIP).** The harness may branch your worktree from the SESSION-START commit `1a72c81c`, which is BEHIND current main `55cf3259` by two landings this session: Bug 72 (`3707e212`) + Bug 60 (`55cf3259`). **Bug 72 modified `emit-each.ts`, `emit-lift.js`, `emit-control-flow.ts` — the EXACT files you will edit.** If your base is behind, run `git -C "$WORKTREE_ROOT" merge main` (brings in 55cf3259) BEFORE any edit — else you build on pre-Bug-72 code and a file-delta landing would REVERT Bug 72. After merge, verify: `git -C "$WORKTREE_ROOT" log --oneline -3` shows `3707e212` + `55cf3259` in history, and `grep -c emitNestedEachFromMarkup "$WORKTREE_ROOT"/compiler/src/codegen/emit-each.ts` ≥ 1 (a Bug-72 helper — confirms you have post-Bug-72 code).
5. `git status --short` — clean (or the merge result).
6. `bun install` (worktrees don't inherit node_modules).
7. `bun run pretest` (populates gitignored `samples/compilation-tests/dist/`). Use `bun run test` (chains pretest) for baselines.

If ANY check fails: STOP and report.

## Path discipline (EVERY edit — S99/S126)
- **Apply ALL file edits via Bash** (`perl -i`, `python3`, heredoc, `cp`) on **worktree-absolute paths including the `.claude/worktrees/agent-<id>/` segment** — NOT the Edit/Write tools. Echo the path before each write; re-verify via `git diff`/`grep`.
- **NEVER `cd` into the main repo or anywhere outside WORKTREE_ROOT.** Use `git -C`, `bun --cwd`, worktree-absolute paths only.
- **NEVER `--no-verify`** (forbidden, no authorization).

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full. §"Task-Shape Routing" → "compiler-source bug fix" → `error.map.md` (the S139 Bug-11 / S140 Bug-57 each-reconcile fix notes are pattern templates), `domain.map.md`, `structure.map.md`. **Map currency: maps reflect HEAD `57edc794` — STALE; your fix files (emit-each/emit-lift/emit-control-flow) were modified by Bug 72 `3707e212` AFTER the map cut. Read CURRENT (post-merge) source; treat the map view of those files as outdated.** Report a maps feedback line.

# THE BUG (PA-analyzed — codegen + runtime evidence)

Per-item interpolated **content (text)** in a reconciled list is emitted CREATE-TIME-STATIC, while sibling per-item bindings (`class:`/`if=`) are wrapped in reactive effects. On reconcile node-reuse, the static text does NOT refresh → stale content.

**Codegen evidence (Tier-0 `for/lift` createFn at HEAD):**
```js
function _scrml_create_item_4(ln, _scrml_idx) {
  _scrml_effect(() => { el.classList.toggle("hot", !!(ln.n > 5)); });  // class: → REACTIVE (effect)
  el.addEventListener("mouseover", function(event){ hover(ln.n); });    // handler → wired
  el.appendChild(document.createTextNode(String((ln.n) ?? "")));        // ${ln.n}   → STATIC (no effect)
  el.appendChild(document.createTextNode(String((ln.text) ?? "")));     // ${ln.text} → STATIC
}
```
The Tier-1 `<each>` createFn has the SAME asymmetry (per-item text = static `createTextNode`; class/handler wired).

**Runtime evidence — `_scrml_reconcile_list` (`compiler/src/runtime-template.js:1237`):** Fast-path-B2 (S106, ~line 1300) — when the key sequence is unchanged (same-length index-keyed list, or same `@.id`s), it confirms DOM order and **bails WITHOUT re-running createFn**. Reused nodes keep their create-time content.

**TWO cases to characterize (they may need different mechanisms — survey BOTH):**
- **Bug 64 — ARRAY-REPLACE** (`@lines = newArrayOfSameLength`, idless items → index keys): reconcile runs (array identity changed) → Fast-path-B2 reuse → static text stale. Reproducer: `$WORKTREE_ROOT/docs/changes/bug-64-per-item-content-reactivity-on-reconcile-2026-06-03/repro-bug64-tier0-array-replace.scrml` (click A then B; expect cells to show GAMMA/DELTA; pre-fix they stay alpha/beta).
- **R28-1c — FIELD-MUTATION** (id-keyed `<each>`, same-id item's field changes): per-item effects (class:/if=) re-fire on the field's prop-subscriber; static text doesn't. Reproducer: `$WORKTREE_ROOT/docs/changes/.../repro-r28-1c-tier1-field-mutation.scrml`. (NB: a same-length array-replace with same ids is the testable proxy — same-id nodes reuse.)

# SPEC AUTHORITY (Rule 4)
SPEC §17.4 (Tier-0 `for/lift`) + §17.7 (Tier-1 `<each>`) — both render reactive collections; the contract is a reactive list (content reflects current data). SPEC does not declare reused nodes a frozen snapshot; the universal keyed-list contract (React/Vue/Svelte/Solid) updates a reused-key node's content on data change. Read §17.7 (esp. §17.7.5 keying) + §17.4.

# THE TASK — PHASE 0 IS A HARD GATE

**Phase 0 — survey + characterize (REQUIRED; report before any heavy edit).**
1. After merge-startup, read the CURRENT `emit-each.ts` (the each createFn + `emitEachReconcileLines` + the per-item text/attr emit), `emit-lift.js` + `emit-control-flow.ts` (the Tier-0 for/lift createFn emit), and `runtime-template.js` `_scrml_reconcile_list` (Fast-path-B2 + the reuse path) + `_scrml_effect` semantics.
2. Compile + (happy-dom) run BOTH reproducers. Empirically determine, for EACH case: what updates on the change, what stays stale, and WHY (does the per-item effect re-fire? does reconcile re-run createFn? does the effect close over the stale item?).
3. Determine the MINIMAL CORRECT fix. Candidate approaches (pick by evidence, don't guess):
   - **(i) Symmetry — wrap per-item interpolated content in `_scrml_effect`** (the same treatment class:/if= already get), so text re-fires on the item's prop change. **Likely closes the FIELD-MUTATION case (R28-1c); may NOT close ARRAY-REPLACE** (the effect closes over the createFn's item param, which a reused node doesn't update on array-replace — VERIFY).
   - **(ii) Reconcile-level — on Fast-path-B2 reuse, re-run createFn (or a per-item patch fn) with the NEW item** so reused nodes refresh ALL per-item content. Closes BOTH cases but is a reconcile-runtime change (bigger; perf-sensitive — re-running createFn per reused node every reconcile).
   - A hybrid is possible (symmetry for field-mutation + a lighter reconcile-reuse item-rebind for array-replace).
4. **Assess the PERF cost** of your chosen approach (effects-per-interpolation overhead; or createFn-re-run-on-reuse cost; vs the current static fast path). The reconcile fast-path exists for perf — do not silently regress TodoMVC-scale lists.

**GATE — after Phase 0, decide:**
- **If your fix is approach (i) [symmetry effect-wrap] OR an equivalently-localized codegen-only change that empirically closes BOTH cases (or closes field-mutation and you can show array-replace is genuinely a separate sub-gap) with acceptable perf → PROCEED to implement.**
- **If your fix requires a reconcile-RUNTIME re-architecture (approach ii — re-running createFn on reuse / changing `_scrml_reconcile_list`'s reuse semantics) OR has a significant perf cost OR the two cases need conflicting mechanisms OR you find a design ambiguity → STOP after Phase 0. Write your findings to progress.md, commit it, and report the Phase-0 analysis + proposed approach + perf assessment. Do NOT proceed to the heavy edit — PA will review + greenlight (or escalate to the user) before you continue.**

This gate exists because the user ruled "fix it" but flagged the perf dimension; a reconcile-runtime change is a bigger commitment than a codegen symmetry fix and needs PA sign-off.

**Phase 1 (only after PROCEED or PA greenlight) — implement** across BOTH Tier-0 lift + Tier-1 each (mirror — the per-item content emit lives in the shared each machinery + the lift path; reuse, don't fork; mind the Bug-72 helpers you merged in). Preserve tree-shaking + the reconcile fast paths for the no-change case.

# TESTS
Happy-dom (`compiler/tests/browser/`) is the load-bearing canary (this is a runtime-reconcile behavior): for BOTH Tier-0 (array-replace) AND Tier-1 (same-id field/array change) — render, trigger the change, assert the per-item TEXT updates to the new value AND the `class:`/`if=` toggle still updates AND a handler still fires. Unit tests (`compiler/tests/unit/`) for the codegen shape. NEGATIVE no-regression: a list with NO change still reconciles via the fast path (no extra work); a `[]`→content recreate still works.

Do NOT regress: the each-reconcile suite (Bug 57/11), TodoMVC gauntlet (the pre-push gate runs it), the Bug 72 nested-each-in-lift tests, the Bug 62/65 engine-in-each/lift tests. Run these explicitly if you touch shared reconcile/createFn code.

# COMMIT DISCIPLINE (S83)
- After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>`; `git -C "$WORKTREE_ROOT" add`; commit IMMEDIATELY. First commit message includes verbatim `pwd`.
- Update `$WORKTREE_ROOT/docs/changes/bug-64-per-item-content-reactivity-on-reconcile-2026-06-03/progress.md` (append-only) after each step — INCLUDING the Phase-0 findings (so they survive a crash).
- Before DONE: `git -C "$WORKTREE_ROOT" status` clean.
- Pre-commit hook runs `bun test {unit,integration,conformance} --bail`. **NEVER `--no-verify`.** (Browser tests are NOT in the pre-commit subset — run them explicitly via `bun test compiler/tests/browser/<your-test>` + confirm green before DONE.)

# PHASE 3 — MANDATORY EMPIRICAL R26 (S138)
Re-compile both reproducers + run the happy-dom tests on your post-fix baseline. ALL must hold:
- Tier-0 array-replace: after the B-change, the emitted/rendered cells show the NEW text (GAMMA/DELTA), not stale (alpha/beta); class toggle reflects new data; `node --check` OK.
- Tier-1 same-id change: per-item content refreshes; class toggle + handler intact.
- No-change reconcile still uses the fast path (no perf regression in your happy-dom timing/shape check).
Paste the before/after rendered-text + node --check in your report. DO NOT mark DONE without R26 + the happy-dom tests passing.

# FINAL REPORT
WORKTREE_PATH · BASE + merge-startup result (did you merge? history shows 3707e212+55cf3259?) · BRANCH + FINAL_SHA · FILES_TOUCHED · PHASE-0 FINDINGS (the mechanism of each case + which approach you took + why + perf assessment + whether you STOPPED for greenlight) · FIX SUMMARY (Tier-0 + Tier-1; how you reused shared machinery; tree-shake + fast-path preservation) · TEST DELTA (N new incl. happy-dom; full-suite pass/fail/skip) · R26 EMPIRICAL RESULTS (before/after rendered text both cases + node --check) · MAPS feedback · SIBLING GAPS (Rule 5) · DEFERRED items.
