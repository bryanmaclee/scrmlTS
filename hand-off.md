# scrmlTS — Session 31

**Date opened:** 2026-04-19
**Previous:** `handOffs/hand-off-31.md` (S30 wrap, rotated in as S31 starting brief)
**Baseline entering S31:** 7,222 pass / 10 skip / 2 fail (26,480 expects / 315 files) at `a6ce8c6`.

---

## Session start state

### Incoming
- `handOffs/incoming/` empty (only `read/` archive).

### Uncommitted carried in
- `docs/SEO-LAUNCH.md` — still uncommitted, 8 sessions running.

### Cross-repo pending
- scrmlTSPub retirement still pending at master since S25.

### Queue (from S30 hand-off §4)

**Unblocked, S30 pivot priority — adopter friction first:**
1. **F5 — missing-`@`-sigil silent break.** Highest-leverage remaining adopter fix. `@count = 0` + `${count}` in markup compiles silently to empty span + bare `count;` JS. Scope-pass or AST-builder gap. 1 session budget.
2. **F6+F7+F10 scaffold/CLI polish batch.** `scrml init` dir prompt, scaffold `.gitignore` fix, README `bun link` step. 1–2 hours.
3. **F8+F9 scaffold content polish.** Emit `package.json`+`README.md` in scaffold; orientation comments. Cheap.

**Deferred per S30 pivot (self-host / compiler-internal):**
- Bug (a), (b), (c) from S29 — export-class/function name, destructuring fragmentation
- P3 continued — ast/ts/ri/pa/dg.scrml self-host fails
- P5 ExprNode Phase 4d/5, Lift Approach C Phase 2, §51.13 phase 8, etc.

### Non-compliance carried
- `master-list.md` 7 sessions stale (last S23).
- `compiler/SPEC.md.pre-request-patch` — 12K-line grep-trap, still present.
- `docs/SEO-LAUNCH.md` uncommitted 8 sessions.
- `benchmarks/fullstack-react/CLAUDE.md` agent-tooling in framework-comparison dir.

---

## Session log

### Arc — F5 (missing-`@`-sigil silent break)

**Repro confirmed (two shapes, both silent):**
1. `<p>${count}</p>` when `@count` declared → HTML empty `<span>`, JS emits bare `count;`. Compile reports success, only E-DG-002 unused-var warning.
2. `<input value=${count}>` when `@count` declared → attr silently dropped (`<input />`), no JS handler. Same silent success.
3. Bonus: `class=count` (unquoted attr, no `${}`) also silent when `@count` declared — same root cause.

**Root cause:** `reactive-decl` / `reactive-derived-decl` / `reactive-debounced-decl` in `compiler/src/type-system.ts` double-bind into the scope chain:
- `scopeChain.bind("@" + name, { kind: "reactive", ... })` — sigil form
- `scopeChain.bind(name, { kind: "reactive", ... })` — bare form

Three sites: 3649, 4044, 4281. The bare-form bind means `checkLogicExprIdents` (2849) and `visitAttr` (4438) look up a bare `count`, find the reactive entry, and silently resolve. No error surfaces. Codegen then emits `count;` (undefined at runtime) or drops the attr.

The double-bind dates to initial commit; purpose is defensive fallback for a handful of lookup sites (`resolveMatchSubjectType` already does its own fallback, so the redundant bare-bind is the root footgun).

**Fix strategy (keep surgical — don't touch the binds):**
1. In `checkLogicExprIdents`: after `scopeChain.lookup(base)` succeeds, if `entry.kind === "reactive"` AND the raw ident did NOT start with `@`, emit E-SCOPE-001 with a tailored "bare ident references reactive `@name` — write `@name` instead" message instead of returning silently.
2. In `visitAttr`: same flag on the existing `variable-ref` path; also extend to handle `value.kind === "expr"` (attribute-value interpolations like `value=${count}`) by walking the exprNode through `checkLogicExprIdents`.

**Tests to add:** new file `compiler/tests/unit/gauntlet-s31/missing-sigil-scope.test.js` covering
- `${count}` markup interp → E-SCOPE-001
- `value=${count}` attr interp → E-SCOPE-001
- `class=count` unquoted attr → E-SCOPE-001 (already existed for unresolved idents; extends to reactive-shadow case)
- `${count + 1}` → E-SCOPE-001
- `${data.path}` → E-SCOPE-001 (base `data` checked)
- Positive: `${@count}`, `${@count + 1}`, `ref=@count` still compile.
- Positive: `let x = 5; ${x}` still compiles (bare, non-reactive).

**Status:** landed as `ebd4d1d`. Suite 7222 → 7233 (+11), zero regressions. Not pushed (no push auth this session).

### Arc — F6 / F10 scaffold/CLI polish (F7 turned out a non-issue)

**F7 dismissed.** Audit claimed `.gitignore` containing `dist/` would miss `src/dist/`. Verified against git: `dist/` at root of `.gitignore` (no leading `/`, no middle `/`) matches `dist/` directories at any depth. `git check-ignore` confirms `src/dist/b.js` is ignored by `dist/` alone. Scaffold is correct; audit was wrong. Noting here so future sessions don't re-open.

**F6 — `scrml init` bare-arg safety.** Added a non-empty-CWD check in `compiler/src/commands/init.js`. New behavior:
- `scrml init` (bare, empty CWD) — implicit `.`, proceeds.
- `scrml init` (bare, non-empty CWD) — exits 1 with: "Use `scrml init <name>` for a new subdirectory, or `scrml init .` to scaffold into the current directory."
- `scrml init .` — explicit current-dir opt-in, always proceeds.
- `scrml init <name>` — unchanged.
Dotfiles don't count as "content" — a freshly `git init`-ed dir with only `.git/` / `.envrc` still accepts bare init.

Updated `compiler/tests/commands/init.test.js` §8 tests to pass `.` explicitly (they pre-seeded `src/` which now triggers F6 safety); added §11 (5 new F6 tests).

**F10 — README `bun link` step.** Added step 2 between `bun install` and the CLI usage. Also rewrote the "Quick start" block to show the golden adopter path: install → link → `scrml init my-app` → `cd && dev` (the latter demonstrates F6-safe form implicitly).

Suite: 7233 → 7238 pass (+5 new F6 tests), 2 pre-existing fails unchanged.

