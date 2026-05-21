# DISPATCH BRIEF — M5-swap Unit R1: statement-catalog bridge

**Status:** dispatch-ready, S117. **Estimate:** 18-30h.
**Authority:** `compiler/native-parser/M5-SWAP-residual-decomposition.md` Unit R1 ·
`BRIEF-M5-SWAP.md` Phase 0 escalation · DD #27.
**Agent:** `scrml-js-codegen-engineer` · `isolation: "worktree"` · `model: opus`.
**Parallel siblings:** R2 (hoist gap) + R4 (§34 reconciliation) dispatch alongside
you — file-disjoint. R3 + R5 come after.

---

## What R1 is

The native parser's `parseProgram` (`compiler/native-parser/parse-stmt.*`) emits a
PascalCase ESTree-shaped `Stmt[]` (`VarDecl` / `If` / `For` / `ExprStmt` / ...).
The live `logic` AST node carries a scrml-specific **lowercase** `LogicStatement[]`
union (`let-decl` / `if-stmt` / `for-stmt` / `match-stmt` / `fail-expr` /
`lift-expr` / ...). **R1 builds the bridge: native `Stmt[]` → live
`LogicStatement[]`.** This is an N×M structural translation, not a case-rename.

R1 produces the translation function/map. R3 (later) wires it into the
`nativeParseFile` FileAST assembler — you do NOT do the wiring.

---

# MAPS — REQUIRED FIRST READ

Before any other context, read `.claude/maps/primary.map.md` in full, then follow
its §"Task-Shape Routing" for **compiler-source new feature** (structure +
dependencies + domain maps).

Map currency: maps reflect HEAD `67a17dc5`. The commits since (`8c9d855b`,
`2154c474`, `95c81557`, `ca0e40ce`) are docs / README / maps only — **no
compiler-source or native-parser file changed.** The compiler-source maps are
current. If your work touches a file you find modified past `67a17dc5`, treat
map content as a hypothesis to verify via grep/Read.

Feedback: final report states "Maps consulted: [list]; load-bearing finding: <one
sentence>" or "Maps consulted but not load-bearing".

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree is harness-allocated under
`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-<id>/`. The `pwd`
from step 1 IS your `WORKTREE_ROOT`.

**S99 leak-history: this project has had path-discipline leaks where agent
Write/Edit calls landed in the main checkout. Do not be the next incident.**

## Startup verification (BEFORE any other tool call)

1. `pwd` — output MUST start with
   `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any
   other repo, STOP and report (S90 CWD-routing failure). Save as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` — MUST equal `WORKTREE_ROOT`.
3. `git merge main --no-edit` — worktrees branch from the session-start commit,
   not live `main` HEAD (S112). `main` HEAD is `ca0e40ce` (carries the Phase 0
   decomposition + refreshed ledger you must read). Resolve any conflict or STOP.
4. `git status --short` — confirm clean after the merge.
5. `bun install` — worktrees do not inherit `node_modules`.
6. `bun run pretest` then `bun run test` for the baseline. Expectation:
   **18,102 pass / 0 fail / 169 skip / 1 todo / 738 files** (S115 CLOSE). If your
   baseline diverges, STOP and report before any change. (A transient dist/timing
   2-fail flake on the first post-install run has been observed; re-run once — it
   must not recur.)

If ANY check fails: DO NOT proceed. Report and exit.

## Path discipline (EVERY Read/Write/Edit call)

- Write/Edit: ALWAYS absolute paths under `WORKTREE_ROOT`. NEVER bare-main-root
  paths. NEVER relative paths.
- Your first commit message MUST include the verbatim `pwd` output, e.g.
  `WIP(R1): start at $(pwd)`.

# COMMIT DISCIPLINE (two-sided rule — S83)

- After EVERY edit: `git diff <file>`; `git add <file>`; commit IMMEDIATELY. Do
  NOT batch — commit per sub-fix. WIP commits expected.
- A code change and its coupled test update are ONE logical unit — ONE commit
  (S113). Never split them; never `--no-verify` to paper a transient red.
- Before reporting DONE: `git status` MUST be clean.
- Update `docs/changes/m5-v0.5-compressed-ladder/progress-R1.md` after each
  meaningful step — timestamped, append-only.

---

# CONTEXT — read before starting

1. `compiler/native-parser/M5-SWAP-residual-decomposition.md` — Unit R1 is your
   scope; the dependency DAG shows R3 consumes your output.
2. `compiler/native-parser/M5-divergence-ledger.md` — the refreshed F1-F9 verdict.
3. `compiler/src/types/ast.ts` — the live `FileAST` + the `LogicStatement` union
   (the lowercase kinds you translate TO).
4. `compiler/src/codegen/emit-logic.ts` — the deepest consumer; dispatches ~40
   lowercase `LogicStatement` kinds. Your translation output must satisfy it.
5. `compiler/native-parser/parse-stmt.scrml` (+ `.js` shadow) — the native
   `parseProgram` / native `Stmt` catalog you translate FROM.

---

# SCOPE

1. **Author the native-`StmtKind` → live-`LogicStatement.kind` map.** Per-kind —
   non-trivial cases:
   - `VarDecl{kind:"let"|"const"}` → `let-decl` / `const-decl`.
   - native ESTree `If{test,consequent,alternate}` → live `if-stmt{cond,then[],
     else[]}` (note: live branches are **array-shaped**, native are single nodes).
   - `For` / `ForIn` / `ForOf` → `for-stmt` variants.
   - `ExprStmt` → `bare-expr`.
   - `FunctionDecl` → `function-decl`. `Return` → `return-stmt`.
   - **`Throw`** — scrml has NO `throw` (§19 — `fail`, not `throw`). If the native
     parser produces a `Throw` node, reconcile against the forbidden-vocabulary
     rule — **surface to PA, do not silently map.**
   - scrml-only kinds — `tilde-decl` / `lin-decl` / `reactive-decl` / `lift-expr` /
     `fail-expr` / `propagate-expr` / `guarded-expr`: identify each one's native
     production and map it. If a scrml-only kind has NO native production, that is
     a native-parser **feature gap** — see escalation below.
2. **Decide WHERE the translation lives** — inside the (future) `nativeParseFile`
   adapter (keeps the native parser pure) vs a native-parser exit-shaping pass
   (aligns with M6 "the native parser IS the front-end"). Recommend + implement;
   surface the call + rationale in your report. The translation must be a
   self-contained, importable unit R3 can consume.
3. **Verify against the 37 `logic.body` consumer files** — `emit-logic.ts` is the
   deepest. Your translated output must walk cleanly.
4. **Tests** — per-kind translation unit tests + a corpus diff (native-parsed →
   translated vs. live-parsed `logic.body` for the sample corpus).

## SOFT ESCALATION

If R1 exceeds ~30h, OR you find a scrml-only `LogicStatement` kind with **no
native production** (a native-parser feature gap, distinct from a translation
gap), STOP and report — that gap is a separate unit, not R1's to absorb.

---

# OUT OF SCOPE — do NOT do these

- The `nativeParseFile` FileAST assembler (R3) — R1 produces the translation
  unit; R3 wires it.
- The declaration hoist gap (R2 — `collect-hoisted`).
- SPEC §34 error-code reconciliation (R4).
- The api.js pipeline swap (R5). M6 deletions.

---

# REPORT SHAPE

`WORKTREE_PATH` · `FINAL_SHA` · `FILES_TOUCHED` · the translation-locus decision +
rationale · per-kind map coverage (kinds mapped / kinds surfaced as gaps) · test
counts before+after · maps-consulted line · any escalation verbatim.

# Tags
#m5-swap #unit-r1 #statement-catalog-bridge #native-parser #s117
