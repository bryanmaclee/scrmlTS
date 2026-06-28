# BRIEF (verbatim dispatch prompt) — g-component-body-engine-reject-2026-06-27

> Dispatched S228 to `scrml-js-codegen-engineer` (isolation:worktree, opus, bg, agent `a104e360`). Design A, survey-confirmed (`a49cb047`). Archived per S136.

---

# BUILD: g-component-body-markup-parser-absent — fire E-COMPONENT-ENGINE-SCOPE on engines in component bodies

change-id: **g-component-body-engine-reject-2026-06-27**. This is a survey-CONFIRMED, PA-ratified build (Design A). Write `progress.md` in your worktree as your crash-recovery anchor; commit incrementally to YOUR branch.

## MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full first. Task-shape = compiler-source parse-path / diagnostics → follow its Task-Shape Routing (component-expander / symbol-table / ast-builder). Maps reflect HEAD `dec70dce` (2026-06-27); current base `6ac1f635` (S227 wrap — bookkeeping only, no source change). Verify map content against current source. In your final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" or "not load-bearing."

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
Worktree under `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-<your-id>/`.
Before any other tool call: (1) `pwd` MUST start with the worktrees/agent- prefix (else STOP — S90); save WORKTREE_ROOT. (2) `git rev-parse --show-toplevel`==WORKTREE_ROOT. (3) `git status --short` clean. (4) `bun install`. (5) `bun run pretest`; use `bun run test` for full-suite baselines.
Path discipline (S99/S126): Bash-edits (`perl -i`/`python3`/heredoc) on WORKTREE_ROOT-absolute paths ONLY (not Edit/Write — they've leaked to MAIN); echo path before, verify after; never `cd` into main (use `git -C`/`--cwd`/absolute); first commit message includes verbatim pwd; never read source from MAIN.

## THE BUILD (Design A — PA-ratified)
The parser ALREADY re-parses the body + produces `machineDecls`; `parseComponentBody` DISCARDS them. Fire `E-COMPONENT-ENGINE-SCOPE` (existing §34 Error code) from CE. Verify all line numbers against current source.

3 shapes (reproduce each first): (1) structural `<div><engine…></engine></div>` → silent empty div; (2) lift-value `<div>${<engine…/>}</div>` → phantom createElement("engine"); (3) mount file-engine + `<div><Phase/></div>` → misleading E-COMPONENT-020.

Steps: (1) parseComponentBody (~946-985) return `machineDecls` too. (2) parseComponentDef (~991-1011): if machineDecls.length>0 push CE error PER engine mirroring `fireComponentEngineScope` (symbol-table.ts ~8479) exact shape. (3) shape-3: uppercase-tag resolver (~3808) divert engine-named tag to E-COMPONENT-ENGINE-SCOPE before E-COMPONENT-020. (4) shape-2: scan re-parsed nodes for lift/markup-value engine tag, fire same code.
Invariant: body engine MUST NOT be hoisted into file machineDecls (loud reject → compile fails → emission moot).

SPEC (read, don't infer): §15.13.5 (~9435 rejection REQUIRED), §51.0.K/A (singleton), §51.0.D (mount cross-file-only — shape 3), §34 code exists (no new code).

Tests (same commit as code): un-`.skip` the 3 cases in engine-component-scope-b17.test.js (~332-342) asserting E-COMPONENT-ENGINE-SCOPE end-to-end for shapes 1/2/3 (use `diagByCode`, cross-stream); keep §B17.1-9 green; add compile assertion (no silent empty div + non-zero exit).

R26 (S138): compile the 3 repros on post-fix baseline (`bun $WORKTREE_ROOT/compiler/bin/scrml.js compile … --output-dir /tmp/r26-compbody/<n>`); confirm each fires the code. S215 adversarial: no-engine component (no over-fire) · nested engine (fires) · engine in non-component markup (unaffected) · legit cross-file component tag (no false divert).

Commit discipline: incremental to YOUR branch; code+test one commit; NEVER --no-verify; do NOT commit/push main (PA file-deltas on return).

Return: maps line · WORKTREE_ROOT + first-commit pwd · per-shape before→after · files+SHA · full-suite result · R26 + S215 results · line-number corrections · STOP-report if Design A doesn't hold.
