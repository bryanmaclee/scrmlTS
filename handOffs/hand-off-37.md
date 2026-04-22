# scrmlTS — Session 36 (in progress)

**Date opened:** 2026-04-20
**Previous:** `handOffs/hand-off-36.md` (S35 wrap — 5 commits, 11 new tests, zero regressions, push pending via master)
**Baseline entering S36:** 7,384 pass / 40 skip / 2 fail / 338 files at `3f8d88c`. S35 commits still pending push via master.
**Current at tip:** **7,384 / 40 / 2 / 338** at `54bcab7`. Eight C-arc refactor commits. Zero regressions at every step.

---

## 0. Session-open checklist

- [x] Read `pa.md`
- [x] Read `hand-off.md` (S35 wrap)
- [x] Read last ~10 contentful entries from `../scrml-support/user-voice-scrmlTS.md`
- [x] Rotate `hand-off.md` → `handOffs/hand-off-36.md`
- [x] Create fresh `hand-off.md`
- [x] Check inbox

## Inbox at open — 2 messages

### 1. `2026-04-20-1624-6nz-to-scrmlTS-fn-decl-body-dropped.md` — **Bug G** (needs: action)

6nz reports: `fn name(p: T) -> ReturnType { body }` with a `match` body drops the function body (empty `{}` emitted) AND leaks the return-type syntax + body as naked module-scope code (`- > string {` followed by an IIFE). Fails `node --check`. Grammar verified idiomatic against `examples/14-mario-state-machine.scrml:95-100` (`fn riskBanner(risk: HealthRisk) -> string { match risk { ... } }`). Workaround (`function` instead of `fn`) is cheap — "no rush."

**Verification-first plan:**
1. Compile `examples/14-mario-state-machine.scrml` — does the existing example produce valid JS with the same shape? If yes, shape-specific; if no, broader.
2. Reproduce 6nz's minimal repro verbatim.
3. Localize in ast-builder.js / emit path for `fn`-with-return-type.
4. Only then decide fix.

### 2. `2026-04-20-1716-giti-to-scrmlTS-s35-verified-plus-mount-integrated.md` — S35 verified + mount integrated (needs: fyi)

Giti re-verified against tip:
- GITI-008 whitespace: **PASS** (text nodes emitted as whole phrases).
- GITI-007 CSS bare-tag: **PASS** (`grep -c ": ;" status.css` → 0).
- `export const routes` + `export async function fetch(request)`: **PASS** (emitted verbatim per verdict).

Mount integration shipped giti-side:
- `composeScrmlFetch(handlers)` — for-loop dispatcher (null falls through to next).
- `loadScrmlHandlers(distDir)` — walks distDir for `*.server.js`, dynamic-imports, collects `fetch` exports.
- Wired into `createHandler` with precedence over `/api/*`.
- +9 tests / 280 → 289 pass / 0 fail.

**Ergonomics note (not a request):** multi-file adopters will need a for-loop chain dispatcher; `scrml(req) ?? myApi(req)` works for single-file only because `??` over awaited promises short-circuits cleanly for 2 levels but gets ugly at 3+. Giti is NOT asking for a codegen change — flagged for record.

Next moves giti-side: (1) `giti serve` smoke test with live engine data, (2) start `history.html`, (3) start `bookmarks.html`. Giti about to push 4 session-5 private-scope commits.

---

## 1a. S36 execution log — Option C arc

User directive at open: "go straight to option C step 2" → "continue" (x2) → "continue until the job is done. test for regressions etc."

Each step ran the full bun test suite before committing. Char-identical invariant (7,384 / 40 / 2) held at every commit.

| Step | Commit | File(s) | Sites | Summary |
|---|---|---|---|---|
| 2 | `099a30a` | emit-logic.ts | 3 | let/const Phase 4 fallbacks (predicateCheck + plain) |
| 3 | `36b02ec` | emit-logic.ts | 7 | bare-expr fallback (presence guard, destructuring, split-stmts, tilde, plain) |
| 4 | `03aad3d` | emit-logic.ts | 2 | reactive-decl + return-stmt Phase 4 fallbacks |
| 5 | `6cdcc7f` | emit-logic.ts | 6 | SQL dispatch + match-arm tilde accumulator |
| 6 | `3c2e848` | emit-expr.ts + emit-logic.ts | 2 | Extended emitExprField with derivedNames-aware client fallback; migrated tilde-decl + reactive-derived-decl dual-path |
| 7 | `03a0c56` | emit-control-flow.ts | 8 | rewriteBlockBody, emitMatchExpr fallback/arms, emitSwitchStmt |
| 8 | `9501371` | emit-lift.js + emit-machines.ts | 13 | Attr/text template parts, call-ref, for-loop iterable, machine guards + effect bodies |
| 9 | `54bcab7` | emit-event-wiring.ts + compat/parser-workarounds.js | 11 | Event-handler dual-paths + compat-layer substring rewriter |

**Totals:** 52 rewriteExpr call sites migrated across 7 files. Every file now imports `emitExprField` (and has dropped `rewriteExpr` / `rewriteExprWithDerived` from its imports). Only residual references are stale comments (6 total) that name rewriteExpr in prose — semantics preserved by emitExprField's fallback.

**Key engineering move in step 6:** Extended `emitExprField` so client-mode fallback routes through `rewriteExprWithDerived(str, ctx.derivedNames ?? null)`. `rewriteExprWithDerived` internally delegates to `rewriteExpr` when derivedNames is null/empty, so every pre-existing caller stays char-identical. The extension unlocked a single-line collapse of the manual `node.initExpr ? emitExpr(...) : rewriteExprWithDerived(...)` dual-path that tilde-decl and reactive-derived-decl were using.

**What's left (outside S36 scope):**
- `rewrite.ts` itself (the engine — not a migration target).
- Test files directly exercising `rewriteExpr` (unit tests of the rewrite module — appropriate direct API usage).
- **Phase 4b proper:** Remove the fallback from `emitExprField` entirely by teaching the parser to emit ExprNodes for currently-unparsed constructs (presence guards, multi-statement bare-exprs, match-arm results). Separate arc — requires AST-upstream parser changes, not codegen swaps.

**Non-regression gate posture this session:** Each step was compiled against the full 7,384-test suite before commit. The invariant was char-identical JS output (already enforced by existing snapshot + behavioral tests). No step ever introduced a test failure.

---

## 1. Ordered priority queue for S36 (remaining)

### 1.1 Triage Bug G (fn-decl body dropped)

Under the verify-before-fix standing rule, first question is whether example 14 compiles cleanly. If example 14 is the only working form, the gap is in a codegen branch that 6nz's repro hits but example 14 doesn't. If example 14 also fails, the bug is broader than 6nz thinks.

Source files to check:
- `examples/14-mario-state-machine.scrml` — known passing form (per 6nz's read)
- `compiler/src/ast-builder.js` — `fn` declaration parsing (return-type + block body)
- `compiler/src/codegen/emit-logic.ts` or `emit-functions.ts` — wherever `fn` declarations get emitted
- Test corpus: search for `fn` + `match` + return-type annotation patterns

### 1.2 Archive giti S35-verified message

After surfacing to user, move to `handOffs/incoming/read/`.

### 1.3 Option C direct-migration phase — **DONE this session** (steps 2-9 above). Next Option C arc is Phase 4b (parser AST-upstream to delete fallbacks) — separate scope.

### 1.4 B1+B3 refactor arc debate-vs-defer (still pending)

DD-flagged debate — staging via master if dispatching. Not urgent unless surfaced.

### 1.5 Non-compliance carryover (unchanged)

- `master-list.md` header 12 sessions stale
- `docs/SEO-LAUNCH.md` 13 sessions uncommitted
- `benchmarks/fullstack-react/CLAUDE.md` — out-of-place agent tooling
- §48.9 prose stale under §33.6
- NC-3: §54.6 Phase 4h return-type-narrow-fit code assignment gap
- NC-4: `_ensureBoundary` warning shim (removes when B1+B3 ships)

---

## 2. Standing rules in force

- **Verify-before-fix** — no fix without spec-backed bug confirmation; adopter PAs cannot be trusted to fully understand scrml.
- **LOC/bug density target** — <30–50 LOC per adopter bug fix (exclusive of tests). Above = refactor flag.
- **Distillation beats option-expansion** — when overloaded, compress to ranked obvious-wins + explicit skip list.
- **Background agents can fail destructively** — prefer .tmp staging + manual merge over in-place append to tracked files.

---

## 3. Open work from S35 (status as of open)

- **Push pending** — 4 scrmlTS commits + 1 scrml-support commit (insight 22) awaiting master PA push. Message at `/home/bryan/scrmlMaster/handOffs/incoming/2026-04-20-1905-scrmlTS-to-master-push-s35-bug-fixes-plus-server-mount.md`.
- **Await giti S35 re-verify** — **RECEIVED at open** (see Inbox §2 above).
- **Await 6nz Bug G queued** — **RECEIVED at open** (see Inbox §1 above).

---

## 4. Report to user (session open)

Caught up. Two inbox messages at open: (1) **Bug G from 6nz** — `fn name() -> T { match body }` drops body + leaks orphan return-type syntax at module scope (needs: action, no rush, has workaround); (2) **Giti S35 verify PASS + mount integrated** (needs: fyi, +9 giti-side tests, multi-file chain dispatcher shipped with `loadScrmlHandlers` walker). S35 push still pending via master.

Next priority recommendation: Bug G triage under verify-first (compile example 14 first — does the existing working form compile cleanly?), then Option C step 2 (pre-scoped at S35 §8.4). Waiting on direction.
