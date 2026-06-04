# S154 ruling (c) — no-RHS typed-decl canonical-empty / `not` defaults

Change-id: s154c-no-rhs-typed-defaults-2026-06-03
Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-abf20cc2c8cb31d53
Base: b3ba8925 (S160 docs + S154 ruling (c) SPEC landing already in base)

## SPEC (normative, already landed in base — read in full)
- §6.2 Shape 4 — canonical-empty table + bare-T→not + union T|not/T?→not + lifecycle-A-non-not→error + refinement-violating→E-REFINEMENT-NO-DEFAULT
- §14.12.3 S160 paragraph — Shape-1 presence-progression = assignment OR discrimination; implicit (not to T) names synthesized lifecycle in E-TYPE-001
- §6.8.3 — no-RHS implicit-(not to T) reset reverts to pre
- §34 E-REFINEMENT-NO-DEFAULT row (supersedes RETIRED E-DECL-NEEDS-INITIALIZER)

## VERIFY-NOT-ASSERT findings (all confirmed)
1. E-DECL-NEEDS-INITIALIZER fires at ast-builder.js:4286-4295 (tryParseStructuralDecl no-RHS-typed branch). Array case at 4244-4285 synthesizes [] — PRESERVE.
2. Untyped no-RHS `<x>` never reaches this branch (gated on `scan.typedDecl`) — unaffected. CONFIRMED.
3. const `<x>: T` no-RHS CURRENTLY ALSO fires E-DECL-NEEDS-INITIALIZER (line 4286 does NOT distinguish const). SPEC §6.2 says const-derived no-RHS is a SEPARATE derived-no-expression error, NOT covered by Shape 4. Must NOT route const to canonical-empty synth. NOTE: the array branch (4259) ALSO synthesizes [] for const — pre-existing; will gate new scalar/not synth on !isConst and leave const to fire a derived-no-expr error.
4. Engine-var collision: engine cell classification handled separately (lifecycleEngineCellNames / cellEngineCellNames skip engine cells; E-ENGINE-VAR-DUPLICATE at symbol-table). not-init lifecycle map already skips engine cells via engineCellNames set. CONFIRMED.
5. §53 predicate infra: parsePredicateExpr (ts:923), evaluatePredicateOnLiteral (ts:1114), checkPredicateLiteral (ts:1909) — all exported. Reusable for E-REFINEMENT-NO-DEFAULT static check.

## Design
- ast-builder: classify the bare type STRING. Primitives with canonical empty (int/integer/number→0, bool/boolean→false, string→"") synth literal init + initExpr. Array→[] (preserve). Everything else non-array non-const → not-init + `implicitNotLifecycle: true` marker. Union T|not / T? → not-init NO marker. Refinement (has predicate parens) → synth base canonical-empty + flag for type-system refinement check OR fire there.
- type-system: buildCellValueLifecycleMap ALSO admits cells flagged implicitNotLifecycle (synth presence spec pre=not post=T) → existing walker gives discrimination+assignment+reset for free. E-TYPE-001 message names synthesized lifecycle. Refinement static check via evaluatePredicateOnLiteral → E-REFINEMENT-NO-DEFAULT on violate.

## Log
- [step 0] startup verified; baseline 15755 pass / 89 skip / 1 todo / 0 fail; SPEC + code surveyed.

## RECOVERY (new agent — prior agent crashed on transient API Overloaded mid-impl)
Recovery worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-accc154543a985d79
Base after `git merge main`: b3ba8925
Recovery FINAL_SHA (impl): a0dcccc5

- [r0] startup verified; baseline 15755 pass / 89 skip / 1 todo / 0 fail.
- [r1] SALVAGED prior agent's partial ast-builder.js (174 insertions, node --check OK) via cp from agent-abf20cc2c8cb31d53. NOTE: the Read tool served a stale pre-cp cache; disk reads (awk) confirmed the NEW S160 routing was present and correct.
- [r2] REVIEWED salvaged routing against SPEC §6.2 — coherent + complete: const-gate (isConst && !isArrayType → E-DECL), canonical-empty classification (int/integer/number→0, bool/boolean→false, string→""), union/optional paren-depth-aware top-level |/? scan → not no-marker, refinement base+(...) → synth base empty + refinementNoRhsBase, array preserved. ast-builder probe: 8/8 classification tests pass.
- [r3] type-system.ts (the side prior agent did NOT reach):
    * FnReturnLifecycleSpec += synthesizedFromNoRhs?: boolean.
    * buildCellValueLifecycleMap: else-if branch admits implicitNotLifecycle cells — synth `(not to T)` spec via parseLifecycleReturnAnnotation, initIsPostType:false, resetState:"pre".
    * E-TYPE-001 presence message appends a §14.12.3 synth-note when synthesizedFromNoRhs.
    * runRefinementNoRhsDefaultCheck — static §53 predicate eval (parsePredicateExpr + evaluatePredicateOnLiteral) on the synthesized base canonical-empty → E-REFINEMENT-NO-DEFAULT on VIOLATES; called after runCellValueLifecycleAccessCheck.
- [r4] BUG FOUND + FIXED (pre-existing, newly exposed): collectTypeAnnotation GREEDILY swallowed a no-RHS decl's next-sibling statement (`<u>: User` followed by `function show(){...}` → typeAnnotation="User function show(){...}"; the `{` opened brace-depth and the scan ran to EOF). Shared with the S152 array path (`T[]` swallowed too) — latent because the array path never engaged the lifecycle tracker. FIX: top-level TYPE_BOUNDARY_KEYWORDS stop (statement/decl starters; EXCLUDES not/lin and the contextual `to`). After fix: implicit fn-body read fires E-TYPE-001 at full parity with the explicit `(not to User) = not` form; reset reverts to pre + re-fires.
- [r5] tests (COUPLED, one commit a0dcccc5): INVERTED §6-§9/§13; ADDED §16-§25. 25/25 pass. Full gate 15765 pass / 0 fail (+10 from baseline).
- [r6] R26 EMPIRICAL (real .scrml compile via public API):
    * scalars (`<count>:int`/`<name>:string`/`<active>:bool`) → emitted `_scrml_reactive_set("count",0)` / `("name","")` / `("active",false)`; node --check EXIT 0; NO E-DECL. PASS.
    * struct (`<user>:User`) → not-init `_scrml_reactive_set("user",null)`; read-before-assign `${@user.name}` surfaces E-TYPE-001 (only error) naming the synthesized lifecycle. PASS.
    * refinement SATISFIES (`number(>=0)`→0) node --check EXIT 0; VIOLATES (`number(>0)`) → E-REFINEMENT-NO-DEFAULT (+ existing E-CONTRACT-001 on the literal). PASS.

## DONE — all phases complete, gate green, status clean.
