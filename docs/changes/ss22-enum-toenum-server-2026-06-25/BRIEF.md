# Dispatch BRIEF — ss22 item 5: g-enum-toenum-not-lowered-server-side (MED)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus · **change-id:** ss22-enum-toenum-server-2026-06-25
**Land target (sPA-side):** `spa/ss22`. **Stated base:** origin/main `cf9f1109`.

ONE gap: `Enum.toEnum(raw)` inside a `server function` is NOT lowered (Pass-9 `rewriteEnumToEnum` is client-only) AND the `<Enum>_toEnum` / `<Enum>_variants` lookup tables are client-bundle-only → server-side `TypeError: Load.toEnum is not a function` (compile exit-0, SILENT). SEPARATE from Bug-51 (enum DEF, resolved). **giti-relevant** (§14.4.3 DB-coerce idiom). Repro `/tmp/bug51-toenum/repro.scrml`.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
## Startup (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. Else STOP. Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. **BASE-CURRENCY (S112):** `git -C "$WORKTREE_ROOT" fetch origin --quiet && git -C "$WORKTREE_ROOT" merge origin/main` (FF). Then `git -C "$WORKTREE_ROOT" merge-base --is-ancestor 538df06d HEAD`. Non-clean FF → STOP.
4. `git status --short` clean. 5. `bun install`. 6. `bun run pretest`. Baseline = `bun run test`.
If ANY check fails: STOP, report, exit.

## Path discipline (EVERY edit)
- **S126:** Bash edits on worktree-absolute paths; NOT Edit/Write. Echo path; re-verify. **NEVER `cd` into main.** **Commit-message file:** UNIQUE (`msg-<agentid>-enum.txt`).

## Commit discipline
- ONE commit (fix + coupled test). Clean tree. NEVER `--no-verify` (hook ~108–180s; allow 300s).
- **emit-client.ts region note:** a sibling ss22 item (E-CG-001 overfire) edits emit-client.ts at the PROTECTED-FIELD-SCAN region (~L2191-2203). Your enum-table emission is at the ENUM-LOOKUP-TABLE region (~L1398 / ~L2265 + the Bug-51 enum-emit block). Keep your edit localized to the enum region so the two reconcile cleanly at land time.

---

## The gap (reproduce RED first — server runtime)
Repro `/tmp/bug51-toenum/repro.scrml`: `Enum.toEnum(raw)` in a `server function`.
- `rewriteEnumToEnum` (Pass 9, `rewrite.ts:1599`) runs on the CLIENT emit path only → the server-side `Enum.toEnum(...)` call is left un-lowered.
- The `<Enum>_toEnum` / `<Enum>_variants` lookup tables (emit-client.ts ~:1398 / ~:2265) are emitted into the CLIENT bundle only → even if lowered, the server bundle lacks the tables.
Net: server bundle compiles exit-0 but throws `TypeError: <Enum>.toEnum is not a function` at runtime (SILENT compile-time).

**Reproduce RED:** compile the repro; emit the SERVER bundle; show the un-lowered `Enum.toEnum` call AND/OR the missing lookup table; `node --check` may pass (it's a runtime TypeError, not a syntax error) — so demonstrate via the emitted server JS that `.toEnum` is unresolved (no table / no lowering).

## Fix direction (TWO parts)
1. **Run Pass-9 on the server-emit path:** make `rewriteEnumToEnum` (rewrite.ts:1599) also lower `Enum.toEnum(...)` calls in server-fn bodies (currently client-only). Reuse the same rewrite; gate it to also fire for the server path.
2. **Emit the lookup tables into the server bundle, reachability-gated:** extend the Bug-51 enum-emit block (emit-client.ts ~:1398/:2265) so the `<Enum>_toEnum` / `<Enum>_variants` tables for enums REACHABLE from server code are emitted into the SERVER bundle (not just client). Reachability-gated = only enums actually used server-side (don't bloat the server bundle with every enum).

## Test (RED first — server-side runtime R26 MANDATED)
- Compile the repro; emit the server bundle; `node --check` the server bundle; CONFIRM the `<Enum>_toEnum` lookup table is PRESENT in the server bundle AND `Enum.toEnum(raw)` is lowered to a table lookup. Then RUN the server-side path (or a node eval of the emitted server fn) to confirm `toEnum` resolves + returns the coerced variant (no TypeError). This server-runtime R26 is REQUIRED (the PA mandated it for this item).
- Adversarial (S215): an enum used ONLY server-side (table must appear in server bundle); an enum used on BOTH sides (table in both, no double-emit corruption); `toEnum` of an invalid raw (the §14.4.3 coerce-failure path). Regression: client-side `toEnum` still works; client bundle unchanged; an enum used ONLY client-side does NOT get its table in the server bundle (reachability gate).
- Paste RED (TypeError / missing table) + GREEN (table present + lowered + resolves).

## Verification
- `bun run test` GREEN, 0 regressions vs baseline (report counts; pre-existing within-node `[over-budget] login.scrml residual 7` + bug-51-flaky-timeout are KNOWN — confirm vs base).
- Server-runtime R26 as above.

## Scope boundaries
- ONLY server-side enum-toEnum lowering + reachability-gated server-bundle lookup tables. Do NOT change the enum DEF emission (Bug-51, resolved), client-side behavior, or the broader rewrite/enum machinery beyond these two parts.
- If reachability-gating the server tables needs a new analysis pass (not a small extension of the Bug-51 block), STOP + report.

## Report back
FINAL MESSAGE = structured return: per-part commit content, RED→GREEN incl. the server-runtime R26 (table-present + resolves) proof, rewrite.ts + emit-client.ts diffs (flag the emit-client.ts region = enum-table, NOT the E-CG-001 region), reachability-gate proof, clean-tree confirmation, agent branch + tip SHA, base SHA. **Note giti-relevance (§14.4.3) explicitly** so the sPA flags giti on land.
