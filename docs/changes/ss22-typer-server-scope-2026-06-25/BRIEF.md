# Dispatch BRIEF — ss22 items 1+2: server-fn typer-scope false-fires (MED+MED)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus · **change-id:** ss22-typer-server-scope-2026-06-25
**Land target (sPA-side):** `spa/ss22`. **Stated base:** origin/main `cf9f1109` (contains ss19 peer-await `538df06d`).

TWO items, both in the typer's server-fn scope (`compiler/src/type-system.ts` E-SCOPE-001 path). "Do them together" per the list. Commit SEPARATELY (2 commits). Reproduce RED first for each.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (BEFORE any other tool call)
1. `pwd` via Bash MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. Else STOP (CWD-routing). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. **BASE-CURRENCY (S112):** `git -C "$WORKTREE_ROOT" fetch origin --quiet && git -C "$WORKTREE_ROOT" merge origin/main` (FF). Then `git -C "$WORKTREE_ROOT" merge-base --is-ancestor 538df06d HEAD` MUST succeed (ss19 peer-await present). Non-clean FF → STOP + report.
4. `git status --short` clean.
5. `bun install`. 6. `bun run pretest`. Full-suite baseline = `bun run test`, NOT bare `bun test`.

If ANY check fails: STOP, report, exit.

## Path discipline (EVERY edit)
- **S126:** edits via **Bash** (`perl`/`python3`/heredoc) on **worktree-absolute paths** with `.claude/worktrees/agent-<id>/` — NOT Edit/Write. Echo path; re-verify `git diff`/`grep`.
- **NEVER `cd` into main.** `git -C "$WORKTREE_ROOT"`, worktree-absolute paths only.
- **Commit-message file:** UNIQUE name (`msg-<agentid>-itemN.txt`), NOT bare `commitmsg.txt` (sibling-scratchpad clobber; S220).

## Commit discipline
- TWO commits (item 1, item 2). Coupled code+test = one commit. Clean tree before DONE. NEVER `--no-verify` (full ~17.9k-test hook, ~108–180s; allow 300s).

---

## ITEM 1 — g-sse-route-object-typer-scope (MED)
**Locus:** `type-system.ts` — the E-SCOPE-001 identifier-resolution path for `server function*` (SSE) bodies (the server-fn scope; channel built-ins are auto-injected as locals around L6300-6312 — the synthetic SSE `route` object belongs in that same allowlist family).

**The gap (reproduce RED first):** inside a `server function*` (SSE generator) body, `route.lastEventId` / `route.query` → `E-SCOPE-001 "Undeclared identifier route"`. Codegen SYNTHESIZES the SSE `route` object (with `.lastEventId` / `.query`) into the generated handler, but the typer never registers it in scope, so the typer false-fires on a `route` the codegen will provide. Pre-existing, independent of an author `route=` assignment. Cross-ref `docs/changes/escalation-2-sse-author-route-app-mode-2026-06-23/`.

**Fix direction:** allowlist the synthetic SSE `route` object in the server-fn (generator) typer scope — register `route` (with at least `.lastEventId` / `.query`, matching what codegen synthesizes) as an auto-injected local for `server function*` bodies, the same way channel built-ins (§38.6) are auto-injected. Do NOT broaden to non-SSE server fns unless codegen also synthesizes `route` there (verify what codegen emits — grep the SSE route synthesis). Match the member set the codegen actually provides.

**Test (RED first):** a `server function*` SSE body reading `route.lastEventId` + `route.query` compiles WITHOUT E-SCOPE-001 (was RED); a NON-route undeclared identifier in the same body STILL fires E-SCOPE-001 (don't over-allowlist). Mirror the escalation-2 repro.

## ITEM 2 — g-server-fn-typed-object-literal-return (MED)
**Locus:** `type-system.ts` — the server-fn arm's object-literal handling (where a `return { field: ... }` object-literal KEY is resolved). PA-repro pending — REPRODUCE FIRST.

**The gap (reproduce RED first):** `return { field: someValue }` inside a `server function` fires `E-SCOPE-001` on the FIELD NAME — the object-literal KEY is mis-resolved as an identifier in server-fn scope (an object-literal key is NOT an identifier reference; it must not go through scope resolution). Construct the minimal repro; confirm the field-key (not the value) triggers it.

**Fix direction:** ensure object-literal KEYS in a server-fn `return { ... }` are treated as literal property names, NOT scope-resolved identifiers (the typer must skip scope-checking the key position). Match how object-literal keys are handled in the CLIENT/logic scope (grep where object-literal expressions are typed — the client path likely already skips the key; bring the server-fn arm to parity). Do NOT change value-position resolution.

**Test (RED first):** a `server function` `return { name: x, count: 2 }` compiles WITHOUT E-SCOPE-001 on `name`/`count` (was RED); a genuinely-undeclared identifier in VALUE position still fires. Cover nested object literals + a key that coincidentally matches an undeclared name (must not fire).

## Verification (both)
- `bun run test` (full incl. browser) GREEN, 0 regressions vs your startup baseline. Report baseline + post counts.
- R26: recompile each repro; no spurious E-SCOPE-001; real undeclared identifiers still caught.

## Scope boundaries
- ONLY these two typer-scope false-fires. Do NOT change the E-SCOPE-001 mechanism broadly, codegen, or client-scope resolution beyond bringing the server-fn arm to parity.
- If either needs a codegen change (not just typer), or the object-literal fix has broad blast radius, STOP that item + report.

## Report back
Your FINAL MESSAGE is the structured return value to the sPA. Per item: commit SHA, RED→GREEN test output, the type-system.ts diff, confirmation real undeclared-identifier detection still fires, clean-tree confirmation, agent branch + tip SHA, base SHA after origin/main merge.
