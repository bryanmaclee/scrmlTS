# scrmlTS — Session 4 Hand-Off (IN PROGRESS)

**Date:** 2026-04-11
**Next session rotation target:** `handOffs/hand-off-4.md`
**Starting test baseline (unit):** 2,298 pass, 2 skip, 90 pre-existing fail (from S3 final)

## Session 4 start state

Rotated S3 → `handOffs/hand-off-3.md`. PA caught up on pa.md, S3 final hand-off, and last user-voice entries (S85/S86).

## Carry-over context

- **Known gap:** Lin Batch B landed parser + type-system + unit tests, but real-pipeline `linNodes` population from AST walker is NOT wired. E2E `lin`-param enforcement pending — first candidate for Batch C.
- **Bun runner bug:** full-scope `bun test` segfaults (Bun v1.3.6); run subdirs individually.
- **Pipeline dispatch rule (durable feedback):** single-concern slices only — parser-only, then type-system-only, etc. No bundled briefs.
- **Agent model split:** background agents on Sonnet, PA on Opus.
- **PA commits manually** from main; pipeline agents often have git blocked; worktree isolation unreliable.

## Next-wave candidates (from S3)

1. **Lin Batch C** — `read lin` borrow-like + real-pipeline `linNodes` wiring (E2E gap). T2.
2. Mother-app 50/51 fails (R17)
3. Ghost-lint Solution #1 (inline agent prompt edit)
4. Skipped tests unblock (temp-file harness in `callback-props.test.js`)
5. E-SYNTAX-043 parser tightening
6. `meta.*` runtime API
7. DQ-12 Phase B — bare compound
8. `scripts/git-hooks/` versioning
9. `compiler/SPEC-INDEX.md` refresh
10. Bun segfault — repro/file/pin

## Session log

### Lin Batch C Step 1 — MERGED, but revealed structural gap

**Branch:** `changes/lin-batch-c-step1` → main (merge commit this session)
**Agent:** `scrml-dev-pipeline` (Sonnet), single-concern slice per batch-size rule
**Scope delivered:**
- TS-G entry rewired: `fileAST.nodes ?? fileAST.ast?.nodes ?? []` (dual-shape fallback matches existing `buildOverloadRegistry` pattern at L4060 — CE wraps AST as `{filePath, ast, errors}`, so naive `.nodes` is always undefined)
- Dead `linNodes?: ASTNodeLike[]` field removed from local `FileAST` interface
- 234 unit tests pass, 0 regressions

**Scope NOT delivered (agent stopped at boundary — correct behavior):**
- E2E integration tests. Cannot pass as written — see gap below.

### STRUCTURAL GAP: lin-enforcement has never worked E2E

Discovered by the pipeline agent while trying to write E2E tests. **This predates Batch B and Batch C — it's been latent since linear types were first added.**

- `checkLinear` walks the tree looking for `kind: "lin-decl"` and `kind: "lin-ref"` nodes (type-system.ts:3655, 3670)
- `ast-builder.js` **never emits either kind**. `lin x = expr` in a logic block produces `{kind: "tilde-decl"}` + `{kind: "bare-expr", expr: "lin"}`. Variable references are strings in `init`/`expr` fields.
- All ~60 existing `checkLinear` unit tests construct synthetic hand-crafted ASTs with the expected kinds. Unit tests are green; real compile is silent.
- **Batch B's lin-param path has the same bug:** function-decl case reads `param.isLin` correctly and seeds `preDeclaredLinNames`, but body references are strings — no `lin-ref` nodes to consume them. Any *correct* lin-param usage would spuriously E-LIN-001 in real compile. (We only got away with this pre-Step-1 because TS-G never fired at all.)

Now that TS-G fires in the real pipeline on real ASTs, this gap is live — but does nothing harmful yet because no `lin-decl`/`lin-ref` nodes appear, so `checkLinear` walks and silently finds nothing.

### Actions dispatched this session

- **T3 deep-dive launched (background, Sonnet)** → `scrml-support/docs/deep-dives/lin-enforcement-ast-wiring-2026-04-11.md`. Three options under evaluation:
  - **A.** Parser emits `lin-decl`/`lin-ref` (TAB-stage change, downstream consumer audit needed)
  - **B.** `checkLinear` string-scans `init`/`expr` fields (like `scanNodeExpressions` already does for mustUse; concerns: lexical scope + shadowing correctness)
  - **C.** Hybrid — parser emits `lin-decl` only; references stay as strings with `checkLinear` doing name tracking
- Recommendation + migration plan for existing 60 unit tests expected in the deep-dive.

### Housekeeping not yet done

- [ ] Append this discovery to `scrml-support/user-voice.md` as an agent-note (pending)
- [ ] Pre-existing uncommitted working-tree changes on `pa.md` (Cross-repo messaging dropbox section) — not from this session, belongs to prior unsaved work. **Flag to user: what do you want to do with these?**
- [ ] Hand-off + master-list commits pending (test hook runs — will verify)

## Tags
#session-4 #in-progress

## Links
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
- [handOffs/hand-off-3.md](./handOffs/hand-off-3.md) — S3 final
