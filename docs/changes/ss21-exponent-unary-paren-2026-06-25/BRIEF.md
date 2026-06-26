# Dispatch BRIEF — ss21 item 4: g-unary-left-of-exponent-no-paren (MED)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus · **change-id:** ss21-exponent-unary-paren-2026-06-25
**Land target (sPA-side):** `spa/ss21`. **Stated base:** main `cf9f1109`.

ONE gap: `-@a ** 2` emits `- _scrml_reactive_get("a") ** 2` → **LOUD** `E-CODEGEN-INVALID-JS` (JS forbids an un-parenthesized unary operand on the LEFT of `**`). Locus `compiler/src/codegen/emit-expr.ts` → `binaryOperandNeedsParens` (defined L1078, applied L1255-1256).

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. Else STOP (CWD-routing). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. **BASE-CURRENCY (S112):** `git -C "$WORKTREE_ROOT" fetch origin --quiet && git -C "$WORKTREE_ROOT" merge origin/main` (FF). Then `git -C "$WORKTREE_ROOT" merge-base --is-ancestor f5c68682 HEAD` MUST succeed (the landed paren-ternary serializer fix you build alongside is present). Non-clean FF → STOP + report.
4. `git status --short` clean.
5. `bun install`. 6. `bun run pretest`. Full-suite baseline = `bun run test`.

If ANY check fails: STOP, report, exit.

## Path discipline (EVERY edit)
- **S126:** edits via **Bash** (`perl`/`python3`/heredoc) on **worktree-absolute paths** with `.claude/worktrees/agent-<id>/` — NOT Edit/Write. Echo path; re-verify `git diff`/`grep`.
- **NEVER `cd` into main.** `git -C "$WORKTREE_ROOT"`, worktree-absolute paths only.
- **Commit-message file:** UNIQUE name (`msg-<agentid>-exp.txt`), NOT bare `commitmsg.txt` (sibling-scratchpad clobber; S220).

## Commit discipline
- ONE commit (fix + coupled test). Clean tree before DONE. NEVER `--no-verify`.

---

## The gap (reproduce RED first)
JS spec: the operand directly to the LEFT of `**` may NOT be an un-parenthesized `UnaryExpression`. So `-@a ** 2` must serialize as `(-_scrml_reactive_get("a")) ** 2` (or `-(_scrml_reactive_get("a") ** 2)` ONLY if that is the intended scrml semantics — confirm scrml's `**` precedence vs unary; JS makes `-x**2` a SYNTAX error specifically to force the author to disambiguate, and scrml should preserve the author's parse, i.e. whatever the scrml parser produced as the AST — emit faithful parens around THAT). Currently `binaryOperandNeedsParens` returns false for a unary-expr left operand of `**`, so codegen emits the invalid `- x ** 2`.

**Reproduce RED:** compile `<a> = -@a ** 2` (or the canonical decl form) inside `${...}`; confirm the emitted JS is `- _scrml_reactive_get("a") ** 2` and that it triggers `E-CODEGEN-INVALID-JS` (node --check rejects it). Confirm the scrml AST's actual shape for `-@a ** 2` (which binds tighter — does scrml parse it as `(-@a) ** 2` or `-(@a ** 2)`?) and emit parens FAITHFUL to that AST.

## Fix direction (PRECISE — do NOT over-parenthesize)
Add a precise case to `binaryOperandNeedsParens`: when `op === "**"` AND the operand is the LEFT side AND that operand is a unary expression (unary minus/plus/`!`/`~`/etc. — a `UnaryExpression` AST node), return `true` (wrap it). Do NOT blanket-wrap all unary operands — `a + -b` must stay `a + -b` (no parens), `-a * b` stays `-a * b`. The trigger is specifically: left operand of `**` that is a unary expression.
- Verify against the scrml AST node kind for unary (grep the ExprNode unary kind in emit-expr.ts / the AST types). Match on the AST node, not a string heuristic.
- This is DISTINCT from the landed silent paren-ternary fix (`g-paren-ternary`, f5c68682) — that was a SILENT mis-render; this is a LOUD invalid-JS. Do not disturb that fix.

## Test (RED first — codegen + node --check)
- A codegen test: `-@a ** 2` compiles to valid JS (parens around the unary left operand) that `node --check` accepts AND evaluates to the scrml-AST-faithful result.
- **S215 ADVERSARIAL (mandated) — must NOT regress other expr shapes.** Cover at minimum: `a + -b` (stays unparenthesized), `-a * b` (stays), `-a ** b` (NOW parenthesized on the left), `a ** -b` (RIGHT operand unary — JS ALLOWS `2 ** -1`, must stay UN-parenthesized), `(-a) ** 2` already-parenthesized (no double-paren), `-a ** b ** c` (right-assoc `**`), `!@flag ** 2` (other unary), nested `-(-a) ** 2`. Assert each emits valid JS (node --check) AND the correct value.
- Paste RED (invalid `- x ** 2`) and GREEN output.

## Verification
- `bun run test` GREEN, 0 regressions vs baseline (report counts). Pay special attention to ANY existing emit-expr / serializer test fixtures whose expected output changes — only the `**`-left-unary case should shift; if any OTHER expr fixture changes, you over-parenthesized — narrow the condition.
- R26: recompile the repro; valid parenthesized JS.

## Scope boundaries
- ONLY the `**`-left-operand-unary paren case in `binaryOperandNeedsParens`. Do NOT touch the paren-ternary fix, other operators, or the broader serializer.
- Blast radius beyond this one case → STOP + report.

## Report back
Your FINAL MESSAGE is the structured return value to the sPA. Report: commit SHA, RED→GREEN output, the exact `binaryOperandNeedsParens` diff, the full S215 adversarial matrix results (each shape: emitted JS + node --check pass + value), confirmation no other expr fixture shifted, clean-tree confirmation, agent branch + tip SHA, base SHA after origin/main merge.
