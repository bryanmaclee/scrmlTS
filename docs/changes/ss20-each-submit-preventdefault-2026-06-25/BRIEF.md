# Dispatch BRIEF — ss20 item 3: g-each-mount-form-submit-no-preventdefault (MED)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus · **change-id:** ss20-each-submit-preventdefault-2026-06-25
**Land target (sPA-side):** `spa/ss20`. **Base:** main HEAD `bb1f2592` (contains the ss17 each per-item emitter landing — your locus is the SAME file, build on it).

ONE gap: a `<form onsubmit=fn()>` **inside an `<each>` body** drops the auto-injected `event.preventDefault()` that the top-level registry/event-wiring path injects → pressing Enter / clicking submit reloads the page. Locus `compiler/src/codegen/emit-each.ts` — the each-mount inline event-handler emitter.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. Else STOP (CWD-routing). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. `git status --short` clean.
4. `bun install`. 5. `bun run pretest`. Full-suite baseline = `bun run test`, NOT bare `bun test`.

If ANY check fails: STOP, report, exit.

## Path discipline (EVERY edit)
- **S126:** edits via **Bash** (`perl`/`python3`/heredoc) on **worktree-absolute paths** with `.claude/worktrees/agent-<id>/` — NOT Edit/Write. Echo path; re-verify `git diff`/`grep`.
- **NEVER `cd` into main.** `git -C "$WORKTREE_ROOT"`, worktree-absolute paths only.

## Commit discipline
- ONE commit (fix + coupled happy-dom test). Clean tree before DONE. NEVER `--no-verify` (full hook ~108–124s; allow 300s).

---

## The gap

`emit-each.ts` emits each-item event handlers as **inline** `addEventListener` (around L1233–1289; the actual listener emission is L1289: `${elVar}.addEventListener(${JSON.stringify(ev)}, function(event) { ${wrappedHandlerBody} });`). For a `submit` event this `wrappedHandlerBody` does NOT get the `event.preventDefault();` prefix.

The **canonical correct shape to mirror** is in `compiler/src/codegen/emit-event-wiring.ts` (the top-level/registry path):
```
const preventLine = domEvent === "submit" ? "event.preventDefault(); " : "";
```
(see emit-event-wiring.ts L658 / L680, and emit-variant-guard.ts:807). The top-level path prepends `preventLine` to the handler body; the each-mount path omits it.

**Reproduce RED first:** mount an `<each>` whose item body contains `<form onsubmit=fn()>…</form>`; assert the emitted each-mount listener body lacks `event.preventDefault()` (and/or that a dispatched `submit` event is not defaultPrevented).

## Fix direction
Inject the SAME `domEvent === "submit" ? "event.preventDefault(); " : ""` prefix into the each-mount inline submit listener body, prepended exactly as the registry path does (before the wrapped handler body, INSIDE the `function(event){ … }`, so it runs before `wrappedHandlerBody`). Keep parity with the registry semantics — same condition (`submit` only), same prefix string.

- Do NOT change non-submit each handlers (click etc. stay unchanged).
- Preserve the ss17 Bug-73 `maybeWrapEachPerItemHandler` live-keying wrapper — the preventDefault prefix goes BEFORE/AROUND the wrapped body such that it always runs (preventDefault must fire even if the live-key prelude early-returns on a stale item — i.e. preventDefault should be the very first statement in the listener, before the wrapper prelude). Confirm ordering: `function(event){ event.preventDefault(); <prelude+body> }`.
- If the each path shares a handler-body builder with the registry path, prefer adding the prefix at the shared site only if it doesn't double-inject on the registry path; otherwise inject locally in the each emitter. Note your choice in the commit body.

## Test (value-asserting happy-dom, RED first)
- Mount an `<each>` with a per-item `<form onsubmit=fn()>`. Dispatch a `submit` event (`new Event("submit", {cancelable:true})`); assert `event.defaultPrevented === true` AND `fn` fired AND (adversarial) it fired for the correct item after a keyed reconcile (reorder/array-replace same key → preventDefault still fires + correct item).
- Regression: a non-submit each handler (click) is unaffected; a top-level (non-each) form submit still prevents default.
- Paste RED (no preventDefault) and GREEN output.

## Verification
- `bun run test` GREEN, 0 regressions vs baseline (report counts).
- R26: recompile; the each-mount submit listener now starts with `event.preventDefault();`.

## Scope boundaries
- ONLY the each-mount submit preventDefault injection. Do NOT touch the registry/top-level path, the ss17 handler-expr work, or non-submit handlers.
- Blast radius beyond the each event-handler emitter → STOP + report.

## Report back
Commit SHA, RED→GREEN output, emitted listener before/after, shared-site-vs-local injection decision, clean-tree confirmation, agent branch + tip SHA.
