# BRIEF — g-channel-topic-forward-ref (LOW) — `<channel topic=@var>` false-fires E-SCOPE-001 when `@var` is declared AFTER the channel (forward-ref doesn't hoist)

change-id: `g-channel-topic-forward-ref-2026-06-12`
dispatched: S189 (2026-06-13) · agent: scrml-js-codegen-engineer · isolation: worktree

## MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full. Task = **compiler-source bug fix** (type-system scope-check). Follow its Task-Shape Routing (primary + error + structure). Maps reflect HEAD `1ad740b4`; HEAD is now `0a6d8b97` — commits since are docs + the S189 g-schemafor (protect-analyzer) / g-given-rebind (ast-builder) / channel (route-inference) fixes, none in `type-system.ts visitAttr`. Map content current for this code. Verify via grep/Read regardless. Report the MAPS feedback line.

## CRITICAL — STARTUP + PATH DISCIPLINE (S99/S126 IN FORCE)
`pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-` (else STOP, S90). `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` == it. `git status --short` clean. `bun install`. `bun run pretest`. ALL edits via Bash (`perl`/`python3`/heredoc) on worktree-absolute paths with the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write. NEVER `cd` into main; use `git -C`/`bun --cwd`/absolute paths. First commit message includes verbatim `pwd`. NO `--no-verify` (not authorized).

## THE BUG (empirically confirmed at HEAD 0a6d8b97)
The dynamic-topic channel form `<channel name="rooms" topic=@selectedRoom>` (SPEC §38.2 / §38.6.2 canonical) false-fires `E-SCOPE-001` ("Unquoted identifier `@selectedRoom` in attribute `topic` … did you mean `@@selectedRoom`") when `@selectedRoom` is declared AFTER the channel in source order. **Pinned to source-order, NOT the `${}` wrapper:** cell declared BEFORE the channel (bare top-level OR in a `${}` block) → compiles clean; cell declared AFTER → E-SCOPE-001.

So the channel-attribute `@`-ref scope-check does NOT resolve against the full FILE-SCOPE-HOISTED cell set. Per §6.9 the cell hoists — a forward `@`-ref to a later-declared cell is legal everywhere else in the language. The `@@selectedRoom` double-sigil suggestion is a tell that the base-name slice may retain the leading `@` on the unresolved path (looking up `@selectedRoom` instead of `selectedRoom`), OR the lookup is against a source-order-limited cell set.

Reproducers (create in worktree):
```
// after.scrml — cell declared AFTER → currently E-SCOPE-001 (the bug)
<program>
  <channel name="rooms" topic=@selectedRoom>
    <messages> = []
  </>
  ${ <selectedRoom> = "lobby" }
  <p>x</p>
</program>
```
```
// before.scrml — cell declared BEFORE → clean (regression guard)
<program>
  ${ <selectedRoom> = "lobby" }
  <channel name="rooms" topic=@selectedRoom>
    <messages> = []
  </>
  <p>x</p>
</program>
```

## FIX LOCUS + DIRECTION (Rule 4; survey-authorized)
`compiler/src/type-system.ts` `visitAttr` (~line 10398) — the channel attrs route through the generic markup-attr `@`-ref scope-check (same region as the resolved `g-channel-reconnect-bare-int`). **Survey WHY the forward-ref fails:** (a) is the base-name slice retaining the leading `@` (the `@@` tell)? (b) is the lookup against a source-order-partial cell set instead of the fully-registered file-scope set? **Fix:** resolve the channel-attribute `@`-ref against the FULLY-registered (hoisted) file-scope cell set — by the time `visitAttr` runs in the TS pass, all state cells are registered (symbol-table earlier pass), so the lookup should find a later-declared cell. Strip the `@` correctly before the scope lookup. Do NOT regress the genuine E-SCOPE-001 (an actually-undeclared `@ghost` in a channel attr SHALL still error). **Likely extends to other channel `@`-bearing attrs** (`name=@x`? other attrs) — verify at fix time + cover.

## COMMIT DISCIPLINE (S83) + R26
Commit per change; clean `git status` before DONE; code+test = one commit. progress.md per step.

## PHASE 3 — EMPIRICAL VERIFICATION (mandatory)
1. `after.scrml` (cell declared AFTER) → CLEAN, exit 0 (E-SCOPE-001 gone).
2. `before.scrml` (cell declared BEFORE) → STILL clean (no regression).
3. A genuinely-undeclared channel-attr `@ghost` (no decl anywhere) → STILL fires E-SCOPE-001 (don't over-suppress).
4. The same forward-ref in a `${}`-wrapped decl AND a bare top-level decl → both clean (the trigger was source-order, not the wrapper).
5. Regression test (the 4 cases). Pre-commit subset green (`bun test compiler/tests/{unit,integration,conformance} --bail`).

## REPORT BACK
WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, the root (base-name slice vs source-order set) + fix, Phase-3 results per case, test delta, whether it extended to other channel attrs, deferrals, MAPS feedback line.
