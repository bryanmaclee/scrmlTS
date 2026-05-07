# A1b Step B16 — derived engines + E-DERIVED-ENGINE-* + B7-reuse cycle detection — DISPATCH BRIEF

**Status:** PRE-DRAFTED at S68. Ready to dispatch once B14 lands. PA must update §"Main HEAD" before firing.

**Estimate:** 3-5h (per audit).

**Sequencing:** STRICT SEQUENTIAL after B14. Reads B14's `_engineMeta` annotation. Can run **PARALLEL with B15 + B17** post-B14 land (different walker territories).

---

## Dispatch instructions for PA

When ready to dispatch:

1. Confirm B14 has landed.
2. Update §"Main HEAD" below to current main tip post-B14.
3. Dispatch via `general-purpose` with `isolation: "worktree"` + `model: "opus"`.
4. Pass content below `---DISPATCH---` marker as the agent prompt.
5. Fire B15 + B16 + B17 in same message for parallel execution.

---DISPATCH---

# Dispatch: A1b Step B16 — derived engines (L20) + E-DERIVED-ENGINE-* family + cycle detection via B7 reuse

You are running as the substitute for `scrml-dev-pipeline` (per pa.md fallback rule; agent unavailable in this session).

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (run FIRST)

1. Run `pwd` via Bash. Save WORKTREE_ROOT.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `bun install` via Bash.
5. Run `bun run pretest` via Bash.
6. Run `bun run test` (chains pretest) to confirm baseline.

**If your worktree was created from a base BEFORE current main HEAD:** rebase your branch onto local main.

**Path discipline:** ALWAYS use ABSOLUTE paths under WORKTREE_ROOT for Write/Edit.

## CRASH RECOVERY

Commit after each meaningful change. Update `docs/changes/phase-a1b-step-b16-derived-engines/progress.md` after each step. WIP commits expected. Branch name suggestion: `phase-a1b-step-b16-derived-engines`.

## CONTEXT — current main state (S68, post-B14)

- **Main HEAD:** [TO BE UPDATED — current main tip post-B14 land]
- **Phase A1b status:**
  - B1-B13 ✅ all shipped
  - **B14** ✅ shipped at [TO BE UPDATED] — engine cell registered; `_engineMeta.derivedExpr` carries the `derived=expr` ExprNode for derived engines (per B14 audit Option C hybrid).
  - B15 dispatched in parallel (state-child exhaustiveness + non-derived rule= typer + initial= validation)
  - **B16 — THIS STEP**
  - B17 dispatched in parallel (`<onTransition>` + residual component-vs-engine cases)

- **B7 generic infrastructure (S67 SHIPPED):** `detectCycle(adj, allNodes)` parameterized on adjacency map + node set. Per primer §13.7 B7 specifics: "B16 (engine-derived, `E-DERIVED-ENGINE-CIRCULAR`) and B10/B11/B12 (validator-arg deps, §31.4) will reuse the same DFS with their own filtered adjacency." B10 was the FIRST consumer (`E-VALIDATOR-CIRCULAR-DEP`); B16 is the SECOND.

- **Active locks:** L1-L22. Critical for B16: L20 (`derived=expr` engine attribute).

## SCOPE — B16 step definition

Source of truth: `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.4 row B16.

**Estimate:** 3-5h (per audit; clean reuse of B7 + B14 infrastructure).

**Driver:** `compiler/SPEC.md` §51.0.J (derived engines, L20 — line 20369-20408), §51.0.F (rule= contract, for boundary), §51.0.G (`.advance(.X)`), §31.5 (derived dep tracking + E-DERIVED-ENGINE-CIRCULAR cross-ref), §34 catalog.

## RULE-4 AUDIT — pre-dispatch findings (READ FIRST)

**MANDATORY READ:** `docs/audits/a1b-b16-rule4-audit-2026-05-07.md` (full file, ~145 lines).

The audit identified 1 substantive expansion + 1 boundary clarification. The 7-point brief expansion below incorporates them.

**Per pa.md Rule 4:** spec text is normative; SCOPE doc is derived. SCOPE didn't mention E-DERIVED-ENGINE-CIRCULAR; audit added it via B7 reusability promise.

## REQUIRED B16 IMPLEMENTATION (per audit §2 — 7-point brief)

### 1. E-DERIVED-ENGINE-CIRCULAR via B7's generic detectCycle (SECOND consumer of reusability promise)

Per §51.0.J line 20403:
> "Chained derivation (A → B → C) | LEGAL. Cycle detection at compile time → `E-DERIVED-ENGINE-CIRCULAR` (§34)."

Per primer §13.7 B7 specifics: B7's `detectCycle(adj, allNodes)` is parameterized on adjacency map + node set. B16 reuses with its own filtered adjacency.

**Implementation:**
- For each engine cell with `_cellKind === "engine"` AND `_engineMeta.derivedExpr !== null`: walk the derived-expr ExprNode collecting reactive cell reads (use existing `forEachIdentInExprNode` infrastructure).
- Emit dep-edges in B7's existing dep-graph (`reads` edges between two `reactive` DG nodes — same shape B7 uses for derived-cell deps).
- Add `buildEngineDerivedAdj(edges, nodes)` filter (sibling of B7's `buildDerivedReadsAdj` and B10's `buildValidatorArgsAdj`) — restricts edges to engine-cell → upstream connections.
- Run `detectCycle` on this filtered adjacency.
- Fire `E-DERIVED-ENGINE-CIRCULAR` on cycles.

This work likely lives in `compiler/src/dependency-graph.ts` (B7's home), NOT symbol-table.ts. Phase 0 verifies.

### 2. Walk engine cells with `_engineMeta.derivedExpr !== null`

Non-derived engines: SKIP (B15 owns those rules). Derived engines: B16 territory.

The walker may be a new SYM PASS (next available number after B15's PASS) for the rejection rules, OR live in `dependency-graph.ts` for the cycle detection. Phase 0 surveys to determine clean placement.

### 3. B16 fires four error codes per §51.0.J

| Error | Trigger |
|---|---|
| `E-DERIVED-ENGINE-NO-RULES` (§51.0.J + §34) | `rule=` declared on a state-child of a derived engine. Derived-engine transitions are determined by the source expression. |
| `E-DERIVED-ENGINE-NO-INITIAL` (§51.0.J + §34) | `initial=` declared on a derived engine. Initial value computed from `derived=expr` at engine-init time. |
| `E-DERIVED-ENGINE-NO-WRITE` (§51.0.J + §34) | Direct write to the auto-declared variable of a derived engine. The variable is read-only. Includes `.advance(.X)` calls. |
| `E-DERIVED-ENGINE-CIRCULAR` (§51.0.J + §34) | Chained derivation forms a cycle. Detected via B7's `detectCycle`. |

B16 does NOT fire `E-DERIVED-ENGINE-INITIAL-UNDEFINED` (§51.0.J line 20402) — that's runtime; A1c codegen + runtime emit.

B16 does NOT fire general `E-ENGINE-INVALID-TRANSITION` — that's split between B15 (compile-time, statically-known) and A1c (runtime, dynamic).

### 4. `.advance(.X)` on derived engines

Per §51.0.G: `.advance(.X)` is method-style transition; same `rule=` validation as direct write; throws on invalid.

On derived engines: `.advance` is REJECTED per §51.0.J (since direct writes are rejected). Same `E-DERIVED-ENGINE-NO-WRITE` fires.

Walker: include `.advance(.X)` calls in the direct-write enumeration. AST shape: `MemberCall` with receiver `@engineCell` and method name `advance`.

### 5. Boundary with B15

B15 owns compile-time E-ENGINE-INVALID-TRANSITION on non-derived engines (statically-known from-state writes).

B16 owns the derived-engine rejection family. No overlap with B15.

### 6. `<onTransition>` and `effect=` on derived-engine state-children are LEGAL

Per §51.0.J line 20401:
> "`<onTransition>` and `effect=` on state-children | LEGAL — fire on derived state changes (the value changed; transition is real, just initiated by source-cell update, not user code)."

The walker does NOT reject these on derived engines. B17 owns `<onTransition>` + `effect=` validation uniformly.

### 7. Phase-0 survey gate (mandatory, ~30-60min)

Confirm:
- (a) B14's `_engineMeta.derivedExpr` annotation is reliably populated for derived engines.
- (b) §34 catalog rows for the four derived-engine errors are present (canonical naming).
- (c) B7's `detectCycle` API is callable from B16's location (or B16 hooks into `runDG` in `dependency-graph.ts`).
- (d) Walker for direct-write sites + `.advance` calls — does an existing walker handle this (e.g., the same walker that fires E-DERIVED-WRITE for const cells per §6.6.8, or B8's PASS 6 for E-DERIVED-VALUE-MUTATE)? Or does B16 need a new walker?

Survey may surface a depth-of-survey-discount per primer §12.

## OUT OF SCOPE for B16 (explicit)

- **Non-derived engine rule= validation** — B15.
- **State-child exhaustiveness** — B15.
- **`<onTransition>` + `effect=` placement** — B17.
- **General E-ENGINE-INVALID-TRANSITION** (compile-time non-derived → B15; runtime → A1c).
- **E-DERIVED-ENGINE-INITIAL-UNDEFINED** (runtime — A1c codegen + runtime).
- **A1c codegen** — runtime hooks. B16 fires compile-time only.

## CANONICAL FILES — read these before coding

1. `compiler/SPEC.md` §51.0 sections:
   - §51.0.J derived engines (PRIMARY normative source — line 20369+)
   - §51.0.F rule= contract (boundary cross-ref)
   - §51.0.G `.advance(.X)`
   - §31.5 derived dep tracking (E-DERIVED-ENGINE-CIRCULAR cross-ref)
   - **NOTE:** Use `grep -nE "^####? +51\.0\." compiler/SPEC.md` for current line numbers.

2. `docs/PA-SCRML-PRIMER.md` §13.7 — B7 specifics (CRITICAL — `detectCycle` reuse pattern); B10 specifics (FIRST consumer precedent); B14 specifics (`_engineMeta` foundation).

3. `compiler/src/dependency-graph.ts` — B7's `detectCycle`, `buildDerivedReadsAdj`. Add `buildEngineDerivedAdj` here.

4. `compiler/src/symbol-table.ts` — find appropriate insertion point for B16's walker pass (rejection rules) if needed. Or fold into existing walker that handles direct-writes.

## TEST EXPECTATIONS

- All existing tests remain green (post-B14 baseline).
- Add B16-specific tests:
  - Derived engine: `<engine for=Phase derived=match @x { ... }>` registers with `_engineMeta.derivedExpr`.
  - `rule=` on state-child of derived engine → fires E-DERIVED-ENGINE-NO-RULES.
  - `initial=` on derived engine → fires E-DERIVED-ENGINE-NO-INITIAL.
  - Direct write `@phase = .X` to derived engine → fires E-DERIVED-ENGINE-NO-WRITE.
  - `.advance(.X)` on derived engine → fires E-DERIVED-ENGINE-NO-WRITE.
  - Chained derivation A → B → C with cycle → fires E-DERIVED-ENGINE-CIRCULAR.
  - `<onTransition>` on derived-engine state-child: ALLOWED (no fire).
  - `effect=` on derived-engine state-child (single-target): ALLOWED (no fire from B16).
  - Non-derived engine: B16 skips (B15 owns).

## REPORTING — when complete

Write final report block in `docs/changes/phase-a1b-step-b16-derived-engines/progress.md` with:

1. WORKTREE_PATH
2. FINAL_SHA
3. FILES_TOUCHED (full paths from repo root)
4. TEST_DELTA
5. DEFERRED_ITEMS
6. OPEN_QUESTIONS
7. PRIMER §13.7 B16 ROW DRAFT + B16 specifics block
8. SURVEY-NOTE at `docs/changes/phase-a1b-step-b16-derived-engines/SURVEY.md`
9. SPEC-PROSE FOLLOW-UPS (any §34 catalog rows added)

## METHODOLOGY (carry-forward from pa.md)

- Rule 1: No marketing/article work — stay focused on B16.
- Rule 2: Production-language fidelity, not MVP.
- Rule 3: Right answer beats easy answer 99.999% of the time.
- Rule 4: Spec is normative; SCOPE/audit are derived. Verify every spec-derivative claim against §51.0.J directly.
- No `--no-verify` on pre-commit hook unless explicitly authorized.

## CROSS-REFS for context

- `docs/audits/a1b-b16-rule4-audit-2026-05-07.md` — full audit (READ FIRST).
- `docs/audits/a1b-b14-rule4-audit-2026-05-07.md` — B14 audit (`_engineMeta` foundation).
- `docs/audits/a1b-b7-rule4-audit-2026-05-07.md` — B7 audit (the dep-graph + `detectCycle` B16 reuses).
- `docs/audits/a1b-b10-rule4-audit-2026-05-07.md` — B10 audit (FIRST consumer of B7's reusability promise; precedent for B16's pattern).

You are authorized to land all work in your worktree. PA reviews file-delta and lands via `git checkout <branch> -- <files>` to main. Report when complete.
