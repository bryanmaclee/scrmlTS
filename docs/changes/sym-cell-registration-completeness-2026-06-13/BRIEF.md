Compiler-source + corpus-migration arc in scrmlTS. Change-id: `sym-cell-registration-completeness-2026-06-13`. This is STAGE 1 of bug-12-vkill Part 3 (Option-3 staged, user-ratified S192). It closes three same-file "declared-but-not-in-SYM-`stateCells`" read classes the S192 read-side census surfaced — so `lookupStateCell` resolves them. Standalone value (SYM resolution under-indexing real cells under-serves other `stateCells`-walking consumers); the read-side `E-STATE-UNDECLARED` fire (stage 2) lands ON TOP later, NOT in this dispatch.

USER RULINGS (S192) that scope this dispatch:
- Class A (legacy `const @x` derived) + Class D (state-block bare-write `@x=init`): **MIGRATE + DEPRECATE** — migrate corpus to the canonical form (which already registers + resolves) and add a deprecation lint. Do NOT add registration for the legacy forms (the "register-the-legacy-form" option was REJECTED — it perpetuates non-canonical shapes; Rule 2/3).
- Class C (`ref=@name` element-refs): **REGISTER** the binding in SYM (refs ARE canonical — genuine gap). **Its own SEPARATE commit** (user ruling).

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full first. This is a **compiler-source bug fix + corpus migration** — follow the Task-Shape Routing (SYM/symbol-table.ts + ast-builder.js + the corpus `.scrml`). Map currency: HEAD is `4494baa5` (S192 Part-2 landing); maps watermark `7f2092cf`. Source changed by Part 2 (engine-varname.ts, symbol-table.ts, ast-builder.js, type-system.ts, emit-machines.ts) — grep/Read current source to confirm anything map-stale. Final report: "Maps consulted: [list]; load-bearing finding: <sentence>" OR "Maps consulted but not load-bearing".

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 leak-history — do NOT be next)
1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90 CWD-routing). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git status --short` clean. 4. `bun install`. 5. `bun run pretest`. Use `bun run test` (chains pretest) for full-suite baselines.
## Path discipline
- ALL edits via Bash (`perl -0pi`/`python3`/heredoc/`cp`) on WORKTREE_ROOT-absolute paths INCLUDING the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write (S126: those have leaked to MAIN). Echo path before each write; `git -C "$WORKTREE_ROOT" diff`/`grep` after.
- NEVER `cd` into main or anywhere outside WORKTREE_ROOT. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only.
- First commit message includes verbatim `pwd`: `WIP(reg-completeness): start at <pwd>`.

# COMMIT DISCIPLINE
Commit per phase (3 distinct commits — refs is its OWN commit per the ruling). After every edit: `git -C "$WORKTREE_ROOT" diff`, `git add`, commit. Before DONE: `git status` clean. Update `docs/changes/sym-cell-registration-completeness-2026-06-13/progress.md` (append-only, timestamped) after each phase. Coupled code+test, AND coupled corpus-migration+lint, land in the SAME commit (no transiently-red/warn windows).

---

# BACKGROUND (PA root-analysis S192 — verified)
The PASS-1 walker (`symbol-table.ts` ~1565) registers ANY `state-decl` reaching `registerStateDecl` (~1209) — no isConst gate. It SKIPS `_isReactiveAssign` (V-kill) + engine-body non-derived writes. The three classes are NOT one mechanism:

| Class | Real form (verified) | Canonical equivalent (already registers+resolves) |
|---|---|---|
| A | legacy `const @x = expr` (quiz-app `const @currentQuestion`; svelte `const @doubleCount`; 12 corpus files) | `const <x> = expr` |
| C | `ref=@name` (`<div ref=@todoColumn>`, `<canvas ref=@c>`) — emitted at codegen `emit-bindings.ts:334` as `_scrml_reactive_set(refName, querySelector(...))` but NOT in SYM `stateCells` | (this IS canonical — register it) |
| D | state-block bare-write `@x=init` inside `< db>` (bun-admin `@products=[]`) | `<x> = init` (every canonical `< db>` example uses structural — 03-contact-book/08-chat/17-schema-migrations) |

Verified: `const <doubled>` registers+resolves; `const @doubled` compiles but read is SYM-unresolved. `@x=init` at `<program>`/`<page>`/`<channel>` body-top ALREADY hard-errors (`E-WRITE-NOT-IN-LOGIC-CONTEXT`, Unit CC S123) — Class D is specifically the `< db>`/state-block variant that escapes Unit CC (state-blocks aren't §40.8 loci) AND doesn't register.

# PHASE 0 — SURVEY (STOP-gate; report in progress.md, STOP only if a finding contradicts this brief)
1. **Class A skip-tag:** find the exact parser tag/path that makes `const @x` skip `registerStateDecl` while `const <x>` registers (the migration target). Confirm a mechanical `const @x`→`const <x>` rewrite is BEHAVIOR-NEUTRAL on the 12 affected files (compile-diff each). Enumerate all sites: `grep -rn 'const @' --include='*.scrml' examples samples` (+ compiler/tests, stdlib).
2. **Class C ref site:** where `ref=@name` binds (ast-builder + emit-bindings.ts:334). Decide whether the ref wants a full `StateCellRecord` or a lighter resolvable entry in `stateCells`; pick the lowest-coupling that makes `lookupStateCell(refName)` resolve. There is a `ref-binding` kind in `codegen/type-encoding.ts` — reuse it.
3. **Class D `< db>` semantics (least-understood — STOP if non-trivial):** confirm bare `@x=init` inside a `< db>` block is a NON-CANONICAL DECL attempt (→ migrate to `<x>=init`), NOT a meaningful write to a db-schema-auto-declared cell. If `< db tables=...>` auto-declares cells from table columns such that `@x=init` is a legitimate write, STOP and report — the migration target changes. Enumerate the corpus surface: bare `@x=init` decls inside `< db>`/state-blocks.

# PHASE 1 — COMMIT 1 (REFS — separate per ruling)
Register `ref=@name` element-ref bindings so `lookupStateCell` resolves them (Phase-0 shape decision). Tests: a `<canvas ref=@c>` + `@c` read resolves at SYM (no longer null); the codegen ref emission is UNCHANGED (this is SYM-registration only — verify emit-bindings.ts output byte-identical). Full suite green. Commit alone.

# PHASE 2 — COMMIT 2 (`const @x` MIGRATE + DEPRECATE)
- Add an INFO lint `W-CONST-AT-DEPRECATED` (§34 row + fire site) on `const @x = expr`: "the canonical derived-cell form is `const <x> = expr` (§6.2); `const @x` is deprecated." Reserved `E-CONST-AT-DEPRECATED` end-of-window. Mirror the W-PURE-DEPRECATED / W-MATCH-ARROW-LEGACY / W-LIFECYCLE-LEGACY-ARROW precedents (info-level, migration-target named).
- Migrate ALL corpus `const @x`→`const <x>` (the 12 files). COUPLED with the lint in this commit (so the migrated corpus is lint-clean).
- SPEC currency: §6.2 / §34 — confirm the canonical derived form is `const <x>` (it is, per the S58 sweep "zero `const @x` in SPEC.md"); add the `W-CONST-AT-DEPRECATED` §34 row. Per pa.md Rule 4, read the §6.2/§6.6 derived-decl normative text before adding the lint.
- Do NOT register the `const @x` form (MIGRATE+DEPRECATE, not REGISTER).

# PHASE 3 — COMMIT 3 (state-block bare-write MIGRATE + DEPRECATE)
- Migrate corpus bare-write `@x=init` inside `< db>`/state-blocks → structural `<x>=init` (bun-admin + any siblings the Phase-0 enumeration found).
- Deprecate signal: a diagnostic steering `@x=init`→`<x>=init` inside a state-block. DEFAULT: a new INFO lint (e.g. `W-STATE-BLOCK-BARE-WRITE-DECL`) — do NOT silently extend Unit CC's `E-WRITE-NOT-IN-LOGIC-CONTEXT` to state-blocks (that comment explicitly excluded them; a hard error is a bigger call). If Phase-0 showed the state-block bare-write is genuinely a write (not a decl), STOP instead. Coupled migration+lint in this commit.

# PHASE 4 — VERIFY + known-gaps
- R26: full suite (`bun --cwd "$WORKTREE_ROOT" run test`, 0 new fail) + recompile the census files (quiz-app, gauntlet-r10-svelte-dashboard, gauntlet-r10-bun-admin, modern-007-dnd-with-helpers, phase2-animationframe-non-fn-094, 23-trucking-dispatch) and confirm the migrated/registered A/C/D reads now RESOLVE at SYM (the read-side census null-set shrinks to ONLY Class B cross-file-channel). Census method: `runSYM` per-file — NOTE `compileScrml`/api.js suppresses SYM info-diagnostics (false 0); run via `runSYM` directly. End report with the residual null-resolved read count (should be Class-B-only).
- `docs/known-gaps.md`: update `bug-12-vkill` detail — stage-1 (registration completeness, A/C/D) LANDED; the read-side fire (stage-2) now needs ONLY Class B (cross-file channel post-CE). Token STAYS `status=open` (stage-2 not done).
- Leave progress.md complete.

# REPORT
WORKTREE_PATH (`pwd`), FINAL_SHA, branch, FILES_TOUCHED (incl. every migrated `.scrml`), per-phase status, the 3 commit SHAs (refs / const-@x / state-block), the Phase-0 findings (A skip-tag, C ref shape, D `< db>` semantics decision), the Phase-4 residual-null-read count (Class-B-only target), maps-consulted feedback, deferred items. Flag any --no-verify use (the brief does NOT authorize it).

You are on Opus. Edits via Bash on worktree-absolute paths, never cd into main, 3 distinct commits (refs first), full-suite-green per phase, R26 before DONE.
