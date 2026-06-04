# TASK — native-parser `<each>` structural-promotion (#2f)  ·  change-id: `native-each-block-promotion-2026-06-04`

> **Archived dispatch brief (S136).** Verbatim `prompt:` text passed to `scrml-js-codegen-engineer` (isolation:worktree, opus, background) on 2026-06-04 (S162). Dispatched after a read-only Phase-0 SURVEY-STOP (agent `abd5757444f24c04f`) corrected the root-cause hypothesis: `<match>` is already promoted and works; only `<each>` is unpromoted. Map currency cited: HEAD `810ce386`; map baseline `9f01f6cd`; native-parser unchanged since baseline.

---

You are fixing the dominant swap-gate unit in the scrml-native parser: `<each>` is NOT promoted to a structural control-flow FileAST node, so under `--parser=scrml-native` it falls through to a generic HTML markup node and silently mis-compiles. You will make `<each>` join the existing structural-promotion mechanism (the same triad `<match>` and `<engine>` already use), so the native pipeline produces the SAME `each-block` FileAST node the legacy (live) pipeline produces — which existing codegen (`compiler/src/codegen/emit-each.ts`) already consumes unchanged.

**This is a MECHANICAL extension. NO codegen changes. NO SPEC changes.** A Phase-0 survey already closed the design questions; its findings are below — trust them but verify against source as you go.

---

## MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full (~100 lines). §"Task-Shape Routing" → this is a "compiler-source bug fix / native-parser" shape: also consult `structure.map.md` (native-parser §) + `dependencies.map.md` + `test.map.md`.
Map currency: maps reflect HEAD `9f01f6cd` (2026-06-04). The current main HEAD is `810ce386`; the ONLY post-baseline code change is `compiler/src/type-system.ts` (R28-8, irrelevant to this task). **The `compiler/native-parser/` tree is UNCHANGED since the map baseline.** ALSO: the Phase-0 survey findings pasted below are a DEEPER + CURRENT map of this exact locus — trust them over the `.claude/maps/` files for native-parser depth, but verify line numbers against live source (they may drift ±a few lines).
Feedback: in your final report include "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing".

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

S99 has had multiple path-discipline leaks; treat every write as a potential leak. Your worktree path is whatever `pwd` reports at startup — call it WORKTREE_ROOT.

## Startup verification (BEFORE any other tool call)
1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it's under any other repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that's the S90 CWD-routing failure. Save the output as WORKTREE_ROOT.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. **S112 MERGE-STARTUP (load-bearing — do NOT skip):** your worktree branched from a session-start commit, which may LAG live main and lack recent landings + the current maps. Run `git -C "$WORKTREE_ROOT" merge --ff-only main` (or `git -C "$WORKTREE_ROOT" merge main` if ff is impossible — report if it conflicts). This inherits main's current state. Verify HEAD after: `git -C "$WORKTREE_ROOT" log --oneline -1` should show `810ce386` or a descendant.
4. `git -C "$WORKTREE_ROOT" status --short` — confirm clean.
5. `cd "$WORKTREE_ROOT" && bun install` — worktrees don't inherit node_modules; the pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise.
6. `cd "$WORKTREE_ROOT" && bun run pretest` — populates `samples/compilation-tests/dist/` (gitignored; full-suite browser tests need it).

If ANY check fails: STOP and report. Do not proceed.

## Path discipline (EVERY Read/Write/Edit/Bash)
- ALL writes use ABSOLUTE paths under WORKTREE_ROOT including the `.claude/worktrees/agent-<id>/` segment. NEVER write to a path starting with the bare main repo root.
- **S126 Bash-edit mitigation — apply file edits via Bash** (`perl`/`python`/heredoc on worktree-absolute paths), echoing the target path before each write and re-verifying via `git -C "$WORKTREE_ROOT" diff` / `grep` after. The Edit/Write TOOLS have leaked to MAIN twice (S126 #12/#13); Bash writes go where `pwd`/`git` resolve. Prefer Bash edits for this dispatch.
- **NEVER `cd` into the main repo** (or anywhere outside WORKTREE_ROOT). Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"` (or `cd "$WORKTREE_ROOT"` once and stay), and worktree-absolute paths exclusively. A `cd` into main leaks `bun add` / compile/run output to main (S126 #14/#15).
- Your FIRST commit message MUST include the verbatim `pwd` output: `WIP(native-each): start at <pwd>`.

---

# COMMIT DISCIPLINE (S83 — two-sided)
- After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify, then `git -C "$WORKTREE_ROOT" add <file>` and commit IMMEDIATELY. Don't batch — commit per sub-unit (predicate+dispatch / synthEachBlockNode / colon-shorthand / tests).
- Crash-recovery: WIP commits expected. Update `"$WORKTREE_ROOT"/docs/changes/native-each-block-promotion-2026-06-04/progress.md` after each step (append-only, timestamped). If you crash, your commits + progress.md are how the next agent resumes.
- Before reporting DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean (everything committed). "work in worktree, no commits" is NOT an acceptable terminal report.
- **NEVER `--no-verify`** on commit or push without explicit authorization. If the pre-commit gate fails, investigate the real cause; do not bypass.

---

# THE FIX — survey findings + exact loci

**Root cause (CORRECTED by the survey):** `<match>` and `<engine>` are ALREADY promoted and work (match output is byte-identical native-vs-default). **Only `<each>` is broken** — it is absent from the structural-element registry, so it routes to the generic markup synth. Concrete divergence on `<each in=@items as item><li>${item}</li></each>`: native emits `W-ATTR-001` (the `as item` binding parsed as a stray HTML attr) → `E-SCOPE-001` (no iteration scope) → bare `el.textContent = item` (no `_scrml_reconcile_list` / render-fn / per-item factory). Default emits the full each render.

**The promotion triad to mirror (identical for engine + match):** (1) a `block.name === "X"` predicate, (2) a `mapOneBlock` dispatch branch, (3) a `synthXNode(block, idGen, source)` that reads attrs + shapes the live node.

**Exact loci (verify line numbers; native-parser unchanged since survey):**
- `compiler/native-parser/tag-frame.js`:
  - `STRUCTURAL_ELEMENTS` frozen registry (~line 121-129) — contains `engine, match, errors, onTransition, onTimeout, onIdle, page`. **`each` is MISSING — add it.**
  - `tagKindFor()` (~line 219) routes registry members to `TagKind.ScrmlStructural`; non-members to `TagKind.Html`.
  - Colon-shorthand IS captured at the tag-frame level (~line 606-619) → lands as `block.colonShorthandBody` (via `parse-markup.js` ~line 1781).
- `compiler/native-parser/parse-file.js`:
  - `mapOneBlock()` (~line 233-278) — the dispatch. `<match>` branch at ~236/247 (`isMatchBlock` → `synthMatchBlockNode`); `<engine>` at ~263-275; the generic fall-through `synthMarkupNode` at ~277-278. **Add an `isEachBlock` branch BEFORE the fall-through.**
  - `isMatchBlock` (~line 503) and `synthMatchBlockNode` (~line 513) — **your closest template for `synthEachBlockNode`.** synthMatchBlockNode reads `for=`/`on=`, captures `armsRaw`, preserves `bodyChildren`.
  - `synthMarkupNode` (~line 349) — the generic synth; it currently **DROPS `block.colonShorthandBody`** (this is the general colon-shorthand gap — see sub-unit (d)).

**TARGET SHAPE — the live `each-block` FileAST node (verbatim; this is what your synth must produce):** `compiler/src/ast-builder.js` ~line 12093 (`kind: "each-block"`) through ~12136. Consumer contract: `compiler/src/codegen/emit-each.ts` ~line 88-96. Required fields:
`kind:"each-block"`, `iterShape:"in"|"of"|null`, `inExprRaw`, `ofExprRaw`, `asName`, `keyExprRaw`, `templateChildren`, `emptyChild`, `bodyChildren`, `bodyRaw`, `span`, `openerHadSpaceAfterLt` — plus the colon-shorthand fields `closerForm` + `shorthandBodyRaw` on per-item children (ast-builder.js ~12126-12136; emit-each.ts recovery at ~271-281).

**Key enabler (makes this EASIER than the live path):** the native parser already parses each's body STRUCTURALLY — `block.children` is a clean walkable array (e.g. `[text, <li> markup, text, <empty> markup, text]`). You do NOT need the live path's raw-body re-split (`_splitBlocksForP2Form1`). Just partition the existing `block.children` into `templateChildren` (per-item markup) + `emptyChild` (the first `markup` child with `tag==="empty"`) + `bodyChildren`, and read the opener attrs (`in`/`of`/`as`/`key`). `as item` lands as two bareword attrs `as`(absent-valued) + `item`(absent-valued) — mirror the live bareword shape (live ref: ast-builder.js ~12009-12013 for iterShape tie-break = record `in` on tie, defer conflict to a later PASS).

## Sub-units (do in this order; commit each separately)
- **(a) Register + dispatch.** Add `each: true` to `STRUCTURAL_ELEMENTS`; add `isEachBlock` predicate + the `mapOneBlock` dispatch branch (mirror isMatchBlock/synthMatchBlockNode). [S]
- **(b)+(c) `synthEachBlockNode`.** Reads `in=`/`of=`/`as`/`key=` opener attrs → `iterShape`/`inExprRaw`/`ofExprRaw`/`asName`/`keyExprRaw`; partitions `block.children` → `templateChildren` + `emptyChild` + `bodyChildren`; sets `span`/`bodyRaw`/`openerHadSpaceAfterLt`. Mirror synthMatchBlockNode's attr-read + child-preservation patterns. [M]
- **(d) Colon-shorthand body in `synthMarkupNode` (GENERAL fix — PA-approved scope).** `synthMarkupNode` drops `block.colonShorthandBody`. Map it → the per-item child's `shorthandBodyRaw` + stamp `closerForm:"shorthand"` (live field names at ast-builder.js ~12126-12136). **Fix it at `synthMarkupNode` generally** (not each-only) — this also closes standalone `<span : @label>` under native (currently lost: children:0, selfClosing:true). Same size, broader value. [S]

## STOP-FLAG coupling to cover (from the survey)
- **each-inside-match-arm:** `<each>` nested inside a `<match>` arm currently "compiles" silently-wrong under native (match preserves `bodyChildren` raw, masking the unpromoted inner each). Your promotion must reach into match-arm body subtrees. **Add an explicit test for `<each>` inside a `<match>` arm** producing correct promoted output under the flip.

---

# PHASE 3 — EMPIRICAL VERIFICATION (S138 — MANDATORY before reporting DONE)

Regression tests alone do NOT close this. Compile REAL each-shaped source under BOTH parsers and confirm equivalence:

```
for shape in each-in-collection each-of-count each-as-name each-colon-shorthand each-empty each-in-match-arm standalone-colon-shorthand; do
  # write a minimal fixture to /tmp (NOT the repo), then:
  bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile /tmp/each-verify/$shape.scrml --parser=scrml-native --output-dir /tmp/each-verify/native/$shape > /tmp/each-verify/native-$shape.log 2>&1
  bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile /tmp/each-verify/$shape.scrml --output-dir /tmp/each-verify/default/$shape > /tmp/each-verify/default-$shape.log 2>&1
  # diff the emitted client.js — expect byte-identical OR semantically-equivalent (same _scrml_reconcile_list / render-fn / per-item factory present)
done
```

Symptom checks that MUST pass post-fix (each was failing these):
- `W-ATTR-001` (item= stray attr) GONE from native output.
- `E-SCOPE-001` (item unbound) GONE.
- Native client.js for an `<each>` now contains `_scrml_reconcile_list` + a per-each render fn + per-item factory (the structural each semantics), matching default.
- `node --check` clean on every emitted JS.
- each-in-match-arm: the inner each is promoted (not masked).

**DO NOT mark DONE without Phase 3 empirical verification passing.** Report the native-vs-default diff result per shape in your final report.

---

# WITHIN-NODE PARITY (S125)
Promoting `<each>` changes the native AST for each-bearing files (KIND `markup/each` → `each-block`), which should REDUCE divergence vs the live AST (a good change). Run `bun test "$WORKTREE_ROOT"/compiler/tests/parser-conformance-within-node.test.js`. If the allowlist baseline (100,636) changes, the change should be REDUCTIONS — rebump the allowlist accordingly and note the delta (and direction) in your report. The pre-commit subset EXCLUDES within-node parity, so run it explicitly. Do NOT mask a divergence INCREASE without explaining it.

# TEST GATE
- Add unit tests for each sub-unit (the 4 canonical §17.7.2 each shapes + `<empty>` + colon-shorthand + `as`-name + `key=` + each-in-match-arm). Put them in `compiler/tests/unit/` (a new `native-each-promotion.test.js` is fine).
- Full pre-commit gate must pass (0 fail) on every commit. The 4 existing each tests (each-block.test.js 32, each-colon-shorthand-r25-bug-40.test.js 20, promote-each.test.js 33, engine-body-render.test.js 31) must stay green (0 regression). NB: those 4 run under the DEFAULT parser today; your change is native-side, so they should be unaffected — confirm.
- Report final pass/skip/fail counts.

---

# FINAL REPORT (your last message — raw, for PA file-delta landing)
- Maps feedback line.
- WORKTREE_PATH, FINAL_SHA, branch name, FILES_TOUCHED list.
- Per-sub-unit what-landed summary (a/b+c/d) with the synth function shape.
- Phase 3 results: per-shape native-vs-default diff verdict (byte-identical / semantically-equivalent / divergent-with-reason).
- within-node parity: baseline before/after + direction (reduction expected) + allowlist rebump if any.
- each-in-match-arm coupling: verified or flagged.
- Test counts: added + full-suite pass/skip/fail.
- Any deferred items or surprises (e.g. a fixture where native still diverges, with the divergence shape).
- `git -C "$WORKTREE_ROOT" status` MUST be clean at report time.

Scope discipline: NO codegen edits (emit-each.ts is the consumer, leave it), NO SPEC edits, NO src/ changes outside what's strictly needed for the FileAST shape. If you find the fix requires touching codegen or src/, STOP and report the coupling rather than expanding scope.
