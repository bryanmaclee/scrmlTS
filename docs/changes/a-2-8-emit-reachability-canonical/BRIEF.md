# A-2.8 — Canonical-key-ordering for `--emit-reachability` JSON + determinism tests

**Status:** STAGED (ready to fire after A-2.7 lands).
**Authored:** S91 mid-session (2026-05-14).
**Sequence:** dispatch AFTER A-2.7 outer-fixpoint commit lands in main. A-2.7 modifies `reachability-solver.ts` orchestrator output structure (possibly adds fields per fixpoint); A-2.8 must serialize against the post-A-2.7 baseline.
**Estimated walltime:** **2-4h** (per S91 scoping audit — significantly under the original master-list 7-12h estimate; most CLI wiring is already done S89 A-2.1).
**Dispatch agent:** `scrml-js-codegen-engineer` with `isolation: "worktree"`.

---

# Current state (what already exists at HEAD)

**S89 A-2.1 scaffold landed the CLI surface entirely:**
- `compiler/src/cli.js:53` — `--emit-reachability` documented in usage text.
- `compiler/src/commands/compile.js:121` — flag IS parsed.
- `compiler/src/commands/compile.js:394-403` — `result.reachabilityRecordJson()` IS called; file IS written to `<base>.reachability.json` next to compiled outputs.
- `compiler/src/api.js:1574-1575` — `reachabilityRecord` + `reachabilityRecordJson()` lazy serializer exported on the return.
- `compiler/src/reachability-solver.ts:365-418` — `serializeReachabilityRecord` exists with partial canonicalization:
  - Entry-point keys sorted (`epKeys.sort()`).
  - Per-role keys sorted (`roleKeys.sort()`).
  - Set members sorted lexicographically via `String(a)` comparator.

**What's MISSING per SPEC §40.9.8 determinism mandate:**
- Diagnostics array (`record.diagnostics`) is emitted in insertion order — NOT canonical.
- Set-member comparator falls back to `String(a)` which is fragile for composite IDs (e.g., `"file.scrml:NodeKind:42"` vs `"file.scrml:NodeKind:7"` — string-sort puts 42 before 7).
- No determinism test asserts bit-identical output across N runs of the same source.
- Post-A-2.7 record shape will gain new fields (fixpoint iteration count, termination flag, possibly closure rounds). The serializer needs to handle them deterministically.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.

## Startup verification (before any other tool call)

1. `pwd` — MUST equal worktree path AND MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under another repo: STOP. Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` — must equal WORKTREE_ROOT.
3. `git status --short` — confirm tree clean.
4. `bun install` — worktrees do NOT inherit node_modules.
5. `bun run pretest` — populates `samples/compilation-tests/dist/`.

If ANY check fails: STOP. Report. Exit.

## Path discipline

ALWAYS use ABSOLUTE paths under WORKTREE_ROOT for Write/Edit. NEVER use absolute paths under `/home/bryan-maclee/scrmlMaster/scrmlTS/` directly — those are main. Translate to `$WORKTREE_ROOT/`.

---

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` first (~118 lines).

Map currency: maps stamped at `ff9be0e` (S90 close) at S91 open; A-2.7's commit will be ahead of that. Treat map content as starting hypothesis; verify via grep/Read against current source for anything load-bearing.

Relevant maps for this task:
- `primary.map.md` — project orientation + Key Facts S90/S91 close
- `domain.map.md` — Task-Shape Routing; A-2 status + post-A-2.7 state
- `schema.map.md` — ReachabilityRecord / ChunkPlan / RSError / fixpoint result shapes
- `error.map.md` — diagnostic codes (E-CLOSURE-001/002 etc.)

Feedback in final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing".

---

# ANTI-PATTERNS + KICKSTARTER (mandatory pre-read)

- `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
- `docs/articles/llm-kickstarter-v1-2026-04-25.md`

**Absolute rules** (HARD):
- `null` and `undefined` do NOT exist in scrml. Both → `not`. `""` / `0` / `false` are defined values. TS impl is JS-host; JS-host null/undefined are fine there.
- Self-host is from-scratch rewrite. No "TS parity" load-bearing reasoning.
- try/catch is NOT in scrml's vocabulary.

---

# Commit discipline — TWO-SIDED RULE (mandatory)

> After EVERY edit: `git diff <file>`; `git add <file>`; commit IMMEDIATELY. Don't batch.
> Before reporting DONE: `git status` MUST be clean. "Work in worktree, no commits" is NOT acceptable.
> NO `--no-verify` without explicit user authorization. **This brief does NOT authorize it.**

---

# THE TASK — A-2.8 Canonical Determinism

## Spec authority

- **SPEC §40.9.8** (compiler/SPEC.md L17794-17812) — Determinism preservation. Quoted normative statement:
  > *"All inputs to `playable_surface(E, N)` are STATIC — source files + spec semantics + the role enum declared at app scope. The analysis takes NO telemetry input in v0.3. The output is therefore deterministic-from-source-only: same source produces same closure produces same chunk assignments produces same content addresses."*
  > *"The analysis output SHALL be incorporated into per-route content addresses (§47) such that two builds of the same source produce identical content addresses for the same per-tier chunks."*
- **SPEC §47** (Output Name Encoding) — content-addressing surface; depends on §40.9.8 determinism.
- **PIPELINE.md Stage 7.6** — already references the determinism invariant.

## Sub-task 1 — Audit + harden `serializeReachabilityRecord`

Edit `compiler/src/reachability-solver.ts:365-418` (or wherever the function lives after A-2.7's wire-in).

### 1.A — Set-member comparator

Replace the `String(a) < String(b)` comparator in `sortedArrayFromSet` with a STRUCTURED comparator that handles:
- **String IDs** (compare lexicographically — current behavior is correct here).
- **Numeric IDs** (compare numerically; `"42"` should sort after `"7"` numerically when both are stringified numbers).
- **Composite IDs** (e.g., `"file.scrml:NodeKind:42"`) — split on `:`, compare each segment in order, numeric-where-possible at the trailing-segment level.
- **Mixed sets** — strings BEFORE composites BEFORE numerics (or a documented stable order).

Authoritative behavior: pick ONE rule, document it inline above the function, and ensure it's stable. **The point is bit-identical output across runs, not human-readable sort order.**

If the post-A-2.7 record has structured node IDs (objects, not strings), use a canonical-stringify helper before sort.

### 1.B — Diagnostics array canonical ordering

Currently `record.diagnostics` is emitted in insertion order. Add canonical-ordering: sort by `(code, severity, entryPoint || "", role || "", message)` as the comparator key. Insertion order varies across runs (depending on iteration order over Maps); canonical order does not.

### 1.C — Post-A-2.7 field handling

Audit the post-A-2.7 record shape (read `reachability-solver.ts` + `outer-fixpoint.ts` at HEAD). For each new field added by A-2.7 (likely: `fixpointIterations`, `fixpointTerminated`, possibly per-(entry-point, role) iteration counts), emit them canonically in the JSON output. If A-2.7 added per-round closure-snapshot lists for debugging, those need canonical key-ordering too.

### 1.D — Inline comment block

Add a comment block at the top of `serializeReachabilityRecord` documenting:
- The §40.9.8 normative anchor (verbatim quote).
- The canonical-ordering rules used (item 1.A's chosen rule + item 1.B's comparator key + any A-2.7-induced additions).
- The bit-identical invariant the function enforces.

## Sub-task 2 — Tests

Create `compiler/tests/unit/reachability-record-determinism.test.js` (NEW). Cover:

1. **Bit-identical across 2 runs** — compile the same source twice; assert `serializeReachabilityRecord` produces byte-identical output.
2. **Bit-identical across 10 runs** — same source × 10 invocations of `runReachabilitySolver` → 10 byte-identical JSON outputs. Defense-in-depth for any subtle non-determinism (Map iteration order is implementation-defined in V8/Bun; this catches it).
3. **Mixed-shape ID sort stability** — synthesize a record with composite IDs that would sort differently under naive lexicographic vs. structured comparator; assert structured comparator wins.
4. **Diagnostics canonical order** — synthesize a record with diagnostics inserted in random order; assert serialized output is sorted by (code, severity, entryPoint, role, message).
5. **Post-A-2.7 field shape** — if A-2.7 added `fixpointIterations`/`terminated`/etc., assert each field appears at a deterministic position in JSON output and across multiple runs.
6. **Worked example replay determinism** — port the §40.9.9 worked-example fixture from `compiler/tests/integration/auth-graph-spec-40-9-9-worked-example.test.js`; compile + serialize × 5 runs; assert all 5 outputs byte-identical.
7. **--emit-reachability file write determinism** — run the CLI with `--emit-reachability` on the §40.9.9 worked example twice into separate tmp dirs; diff the two output files; assert empty diff.
8. **Empty record canonical shape** — compile a trivial 1-line scrml file; assert the empty-ish ReachabilityRecord serializes to a stable canonical shape.

Aim for ~10-15 tests.

## Sub-task 3 (polish) — PIPELINE.md / docs touch-up

Edit PIPELINE.md Stage 7.6 (or wherever the Reachability Solver determinism invariant lives) to note the A-2.8 hardening. ~3-5 lines max.

If `domain.map.md` Task-Shape Routing needs an A-2.8 entry, update it briefly.

---

# What NOT to do

- NOT touching the fixpoint algorithm itself (A-2.7's territory).
- NOT touching Components 1-5 source.
- NOT touching A-3 AuthGraph or §40.9 SPEC prose.
- NOT extending the `--emit-reachability` flag with new sub-flags or modes.
- NOT working on A-2.9 (perf characterization) or A-4 (splitter).
- NOT adding telemetry-version axis (§40.9.8 explicitly defers Approach B to v2).

---

# Reporting

When DONE, report:

1. Sub-task 1 outcome — line numbers touched in `reachability-solver.ts`; canonical-ordering rule chosen + rationale; diagnostics comparator shape.
2. Sub-task 2 outcome — test file path + test count delta; bit-identical assertions × N runs.
3. Sub-task 3 outcome — PIPELINE.md prose touched.
4. **WORKTREE_PATH** + **FINAL_SHA**.
5. **FILES_TOUCHED** list.
6. Maps-consulted statement.
7. Deferred items + reasons.

---

# Crash recovery

Per pa.md "Crash Recovery: Incremental Commits + Progress Reports":
- Commit per sub-task. Don't batch.
- Update `docs/changes/a-2-8-emit-reachability-canonical/progress.md` after each step with timestamp + what was done.
- WIP commits expected. If you crash, your commits + progress file are how the next agent picks up.

---

# Authority chain

- SPEC.md §40.9.8 (normative determinism)
- SPEC.md §47 (content-addressing dependent on §40.9.8)
- PIPELINE.md Stage 7.6 (Reachability Solver — implementation contract)
- master-list §0.1 phase progress (A-2 wave row; A-2.7 closes the wave, A-2.8 is the polish phase)
- This brief (`docs/changes/a-2-8-emit-reachability-canonical/BRIEF.md`)
- A-2.7's commit + new outer-fixpoint.ts (read at HEAD before authoring serializer changes)
