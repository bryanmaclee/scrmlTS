# sPA ss2 → PA — re-integration (needs: action)

**From:** sPA ss2 (engine-codegen-statechild, S210-rebuild run) · **To:** PA · **Date:** 2026-06-20
**Action:** re-integrate branch `spa/ss2` → main (single-writer, S147 coherence-gated), then push.

## LIST COMPLETE — the one (S210-rebuild) item landed

| item | known-gap | sev | landing SHA |
|------|-----------|-----|-------------|
| 1 | `g-derived-engine-autoderive-crash` | MED | `3a29be32` |

- **Branch tip:** `ba689e56` (the bookkeeping commit: list-file status + progress.md). The source fix is `3a29be32`.
- **Parked / dropped:** none. List fully dispositioned (1/1).
- **Severity:** stays **MED** — NOT bumped to HIGH. It does NOT fire on the common derived form (see below).

## What landed

**The crash** (R26-reproduced on clean main, `--verbose` stack-traced): `<engine for=@phase>`
crashed the compiler with `ReferenceError: autoDeriveEngineVarName is not defined` at
`symbol-table.ts:5554:17` in `registerEngineDecl` (← `walkRegisterEngines` ← `runSYM`) — a
compiler-side ReferenceError, NOT a scrml diagnostic.

**Root cause:** `autoDeriveEngineVarName` was only RE-EXPORTED at `symbol-table.ts:5180`
(`export { x } from "./engine-varname"`), which creates NO local in-module binding. The §51.0.C
derive-site calls at lines 5554/5556 referenced the bare name → runtime throw. bun does not
type-check, so it slipped past build to a crash.

**Fix:** `compiler/src/symbol-table.ts:5180` — converted the bare re-export into a real local
`import { autoDeriveEngineVarName } from "./engine-varname";` PLUS `export { autoDeriveEngineVarName };`
(creates the binding, preserves the external stable-name surface). One logical line; zero behavior
change for any valid program. After the fix `<engine for=@cell>` produces proper scrml diagnostics
(E-ENGINE-020 + E-ENGINE-004, clean compile failure) — diagnostics that were always queued; the
crash merely preempted them.

**Coupled regression test (S113):** `compiler/tests/unit/derived-engine-rejections.test.js` (+2
tests, +59 lines) — asserts `runSYM` no longer throws on `for=@cell` and the E-ENGINE-020 diagnostic
survives (gathered across TAB+SYM). CONFIRMED both FAIL without the fix (exact ReferenceError) and
PASS with it.

Files: `compiler/src/symbol-table.ts` (+8/-1) · `compiler/tests/unit/derived-engine-rejections.test.js` (+59) · `docs/changes/ss2-g-derived-engine-autoderive-crash/NOTES.md` (new).

## Footprint corrections (R4 — for the list/known-gaps update)

1. **Locus is `symbol-table.ts` ONLY** — NOT emit-engine.ts. The brief-seed guessed
   "emit-engine.ts/symbol-table.ts"; emit-engine.ts is untouched.
2. **Trigger is `for=@cell`** (the `@` sigil makes the `for=` bareword regex fail → opener falls to
   the pre-S25 sentence-form else-branch), NOT the canonical derived form. The list/known-gaps
   headline `<engine for=@expr>` is right in spirit but the canonical `<engine for=Type derived=expr>`
   form does **NOT** crash (it gives E-ENGINE-018 correctly). That's why severity stays MED.

## Base / conflict status (clean re-integration)

- My base was `cf950bab` (session-start origin/main). Main has since advanced +3:
  `a3b08cbb` (deputy 134b) · `20da8edd` (deputy 134) · `8d4e96ae` (feat A2 W2 `<api>` parser).
- **No conflict:** `git diff --stat cf950bab..origin/main` over my touched source files
  (`symbol-table.ts`, the test, `engine-varname.ts`) is EMPTY — none touched main-side. The `<api>`
  feat touches `ast-builder.js`, which my change does NOT touch. File-delta or merge re-integrates clean.
- **No leak:** my 2 commits (`3a29be32` fix, `ba689e56` bookkeeping) are contained only by `spa/ss2`.
- spa-lists/ was NOT touched by the +3 main commits → no list-file conflict.

## Verification

- Gate suite (unit+integration+conformance): **17439 pass / 0 fail / 68 skip / 1 todo** (961 files).
- Browser suite: **442 pass / 0 fail / 8 skip** — after symlinking the gitignored todomvc dist
  (`benchmarks/todomvc/dist/`); the 2 first-run `distExists` fails were the S209 fresh-worktree
  env-gap, NOT a regression (todomvc passes 39/0 on main with its real build).
- Both commits passed the full pre-commit gate.

## PA owns (at re-integration)

- known-gaps reconciliation: close `g-derived-engine-autoderive-crash` (docs/known-gaps.md:1532) with
  the footprint corrections above (locus symbol-table.ts only; trigger `for=@cell`; canonical derived
  form unaffected; severity MED-final).
- INDEX ss2 row → drained/at-ceiling (the one open item landed).
- worktree `../scrml-spa-ss2` cleanup; changelog/master-list/delta-log; push.

## Optional diagnostic-quality follow-up (NOT a bug — track only)

`for=@cell` is genuinely malformed, but the E-ENGINE-020 message ("pre-S25 sentence form" suggesting
`name=for=@phase for=TypeName`) is ugly for this input (engineName back-filled to `"for=@phase"`).
A dedicated "for= expects a Type, got a cell reference `@x`" diagnostic would be a NEW error code /
SPEC decision — out of sPA scope, not pursued. Flagging in case you want to mint it.
