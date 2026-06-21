# ss2 item 1 — g-derived-engine-autoderive-crash (PA-direct, sPA ss2, 2026-06-20)

**Branch:** `spa/ss2` (base `origin/main` cf950bab) · **Landed by:** sPA ss2 PA-direct (verified one-line missing-binding fix; no agent dispatch).

## Bug
`<engine for=@cell>` (e.g. `<engine for=@phase>`) crashed the compiler with
`ReferenceError: autoDeriveEngineVarName is not defined` (NOT a scrml diagnostic).
Reproduces on clean main. Surfaced incidentally by two ss3 agents (S209).

## Root cause (R26-reproduced + stack-traced)
Crash at `symbol-table.ts:5554:17` in `registerEngineDecl` (via `walkRegisterEngines` → `runSYM`).

`for=@phase` points `for=` at a CELL, not a Type bareword. The ast-builder `for=` regex is a
bareword IDENT (no `@` sigil), so `forMatch` fails and the opener falls into the pre-S25
sentence-form `else` branch (ast-builder.js:14785): `engineName` is back-filled to the raw header
`"for=@phase"` and **E-ENGINE-020 is queued**. SYM then runs `registerEngineDecl`, which —
`varName`/`varNameOverride` empty, `engineName` non-empty — calls
`autoDeriveEngineVarName(engineName)` at line 5554/5556.

That symbol was only **re-exported** from symbol-table.ts at line 5180 (`export { x } from "./y"`),
which creates **no local binding**. The in-module call therefore threw a `ReferenceError`, aborting
the whole compile and preempting the already-queued E-ENGINE-020.

## Fix
`compiler/src/symbol-table.ts` (line ~5180): convert the bare re-export into a real local
`import { autoDeriveEngineVarName } from "./engine-varname";` PLUS `export { autoDeriveEngineVarName };`
— creates the in-module binding the §51.0.C derive sites read, preserves the stable-name external
surface. One logical line; no behavior change for any valid program.

After the fix `<engine for=@cell>` produces proper scrml diagnostics (E-ENGINE-020 + E-ENGINE-004,
compile FAILS cleanly) — the diagnostics that were always queued; the crash merely preempted them.
The canonical `<engine for=Type derived=expr>` form is unaffected (same E-ENGINE-018 as clean main).

## Test (coupled, same commit — S113)
`compiler/tests/unit/derived-engine-rejections.test.js` — new describe block (2 tests):
1. `runSYM` does NOT throw on `for=@cell` (the crash regression).
2. The malformed opener surfaces E-ENGINE-020 (gathered across TAB+SYM stages) and no diagnostic
   leaks the internal ReferenceError text.
Confirmed both FAIL without the fix (exact `autoDeriveEngineVarName is not defined`) and PASS with it.

## Verification
- Gate suite (unit+integration+conformance): **17439 pass / 0 fail / 68 skip / 1 todo** (961 files).
- Browser suite: **442 pass / 0 fail / 8 skip** (after symlinking the gitignored todomvc dist — S209 env-gap, NOT a regression).
- R26 CLI repro: crash → clean diagnostics; canonical derived form unchanged.

## Notes for PA
- No SPEC touch. No new error code. No fixture/allowlist shift.
- `for=@cell` remains malformed — the E-ENGINE-020 message ("pre-S25 sentence form" suggesting
  `name=for=@phase for=TypeName`) is ugly for this specific input, but it is a *proper* diagnostic
  (real code, clean compile failure). A dedicated "for= expects a type, got a cell" diagnostic would
  be a new error code / SPEC decision — out of sPA scope; not pursued. Flagging as an optional
  diagnostic-quality follow-up, not a bug.
