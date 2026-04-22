# scrmlTS — Session 34 Wrap

**Date opened:** 2026-04-20
**Date closed:** 2026-04-20 (single-day session)
**Previous:** `handOffs/hand-off-34.md` (S33 wrap, rotated in as S34 starting brief)
**Baseline entering S34:** 7,322 pass / 40 skip / 2 fail (26,703 expects / 331 files) at `eab5251`, origin/main clean.
**Final at S34 close:** **7,373 pass / 40 skip / 2 fail** (26,808 expects / 338 files) at `d23fd54`. Push requested via master inbox.

---

## 0. Close state

### S34 commits — 9 commits, all awaiting push via master

| Commit | Bug | Summary |
|---|---|---|
| `aa92070` | E | `^{}` Object.freeze commas |
| `eb86d31` | A | Event arg threaded into bare-call handlers |
| `27ed6fe` | D | Scope-aware mangling (negative lookbehind for `.`) |
| `881b411` | GITI-002 | Imports registered into logic-block scope chain |
| `70190a7` | B + F | declaredNames threaded through control-flow (if/else/for/while) |
| `127d35a` | C | Block-body arrows preserved in call-arg position |
| `e585dba` | GITI-005 | `${serverFn()}` markup → awaited DOM wiring |
| `e5f5b22` | GITI-003 + 004 | Unused-import prune + server-context `lift` lowering |
| `d23fd54` | GITI-001 | Awaited reactive-set + skip empty-url `<request>` |

Push request sent to master at `/home/bryan/scrmlMaster/handOffs/incoming/2026-04-20-1700-scrmlTS-to-master-push-11-bug-fixes.md`. Commit range: `4ddb7e0..d23fd54`.

### Outbound messages

Both inbound repliers got acknowledgment drops:
- `giti/handOffs/incoming/2026-04-20-1700-scrmlTS-to-giti-all-5-bugs-fixed.md` — per-bug summary + request to re-verify.
- `6NZ/handOffs/incoming/2026-04-20-1700-scrmlTS-to-6nz-all-6-bugs-fixed.md` — per-bug summary + grammar-check pass note + request to re-verify.

### Incoming archive

Both S34 inbounds moved to `handOffs/incoming/read/` after user ack:
- `read/2026-04-20-1210-giti-to-scrmlTS-server-function-codegen-bugs.md`
- `read/2026-04-20-1251-6nz-to-scrmlTS-compiler-bugs-playground-zero.md`

### Uncommitted at wrap

- `docs/SEO-LAUNCH.md` — still uncommitted, **12 sessions running**. Nothing touched it this session either.
- `hand-off.md` — this file (wrap content).

### Cross-repo

- scrmlTSPub retirement still pending at master since S25 (untouched).
- Design-insights ledger unchanged since insight 21 (carried through S33 + S34).

---

## 1. Session theme — "11 adopter-blocking codegen bugs, end-to-end"

S34 was pure bug-fix execution against two adopter-sent inboxes: giti's 5 server-function codegen bugs (received S33, read at S34 open) and 6nz's 6 playground-zero bugs (received mid-S33, read at S34 open).

The core methodology: **reproduce first, fix by root-cause cluster, test per fix, zero regressions per commit.** User explicitly drove this discipline with "D then triage" at session open.

Single arc. User picked "all 11 to unblock" after seeing the Round-1-only proposal; that forced Rounds 2+3 into the same session. All 11 landed; push + reply + archive on one "1 2 3 lets go" wrap.

---

## 2. Session log — arc by arc

### Arc 1 — Session open + inbox surface

User: "read pa.md and start session"

Standard rotation: S33 wrap → `handOffs/hand-off-34.md`, fresh `hand-off.md`, user-voice tail pulled. Two inboxes surfaced at session open:

- **giti** (unread at S33 wrap): 5 P0 codegen bugs — GITI-BLOCK-001..005.
- **6nz** (NEW this day 12:51, unread at S34 open): 6 bugs — A, B, C, D, E, F.

11 bugs total. S33 wrap's forward directive was unambiguous: "next session we will take a look at giti and 6nz bug reports."

### Arc 2 — Triage strategy

Surfaced four triage options: (A) giti sender order, (B) 6nz order, (C) cluster-first, (D) reproduce all then decide.

**User:** "D then triage"

Created `/tmp/s34-repros/` with per-bug repros (wrote 5 from 6nz message, copied 2 from giti's existing repro dir + the tutorial snippet for Bug A + D). Compiled all 7 output dirs in parallel. Evidence captured per bug:

- **Bug A** — `"_scrml_attr_onkeydown_3": function(event) { _scrml_handleKey_8(); }` — wrapper receives event, drops it.
- **Bug B** — `const label = "HOLD"` inside `if` branch (shadow binding).
- **Bug C** — `.map()` with empty args (whole callback lost).
- **Bug D** — `classList._scrml_toggle_7("active", ...)` (mangler rewrites DOM method).
- **Bug E** — `Object.freeze({ get count() {...} get label() {...} })` — no commas; `node --check` fails.
- **Bug F** — `_scrml_derived_declare("next", () => [...])` inside else-branch (plain local treated as derived-reactive).
- **GITI-001** — `fetch("", { method: "GET" })` + `_scrml_reactive_set("data", _scrml_fetch_loadValue_4())` (unawaited Promise).
- **GITI-002** — E-SCOPE-001 error despite correct import in output files (scope-resolver doesn't register imports).
- **GITI-003** — `import { getGreeting } from "../../src/engine/probe.js";` in `.client.js` (server-only leak).
- **GITI-004** — `_scrml_lift(() => document.createTextNode(...))` in server handler body.
- **GITI-005** — `_scrml_fetch_loadGreeting_4();` at module top, no DOM wiring.

Triage synthesis written to §3 of `hand-off.md` (overwritten at session wrap). Proposed 3-round plan: Round 1 (E, A, D, 002) — cheap+high-impact; Round 2 (B+F, C) — medium; Round 3 (005, 003+004, 001) — server-fn wiring.

### Arc 3 — User picks Round 1

**User:** "lets go 1"

Task tracker created, Round 1 started.

**Bug E** (`aa92070`) — first fix. Located `emitCapturedBindings` and `emitTypeRegistryLiteral` in `compiler/src/codegen/emit-logic.ts` at lines 154 + 177. Both joined `props` with `\n` only. Changed to `props.join(",\n")` wrapped inside the brace literals. Same fix applied to both. 3 new CB-9 tests in `meta-captured-bindings.test.js` covering comma-between-getters, comma-between-mixed, and JS-parse validity of the full Object.freeze literal.

**Bug A** (`eb86d31`) — second. Located the call-ref branch of `emitEventWiring` at line 238. When `argsStr.length === 0`, the wrapper called `handler()` bare. Per tutorial §1.5, bare-call event attrs receive event as first arg. Added `const callArgs = argsStr.length === 0 ? "event" : argsStr;`. Non-empty args left untouched. Updated §4 of `event-handler-args-e2e.test.js` + §1/§5/§6/§16 of `event-delegation.test.js` + BUG-R14-005 assertions in `state-block-event-wiring.test.js` (~9 assertions total) — these baked in the old (pre-tutorial) buggy behavior. Added 2 new tests: explicit `onkeydown` repro + non-empty-args regression guard.

**Bug D** (`27ed6fe`) — third. Root at `emit-client.ts:517` — post-processing mangler regex `\\b${name}\\b(?=\\s*[(...])` had no negative lookbehind for `.`. The generated `classList.toggle("active", ...)` template was getting textually rewritten. Fix: `(?<!\\.)\\b${name}\\b(?=...)`. New `mangle-property-access.test.js` — 3 tests covering `classList.toggle` preservation when user fn `toggle` exists, DOM-method preservation for `forEach`, and user-fn call sites still mangled correctly.

**GITI-002** (`881b411`) — fourth. Root at `type-system.ts:4248`  `case "import-decl"`. Case returned `tAsIs()` without binding names. Added `scopeChain.bind(name, { kind: "import", resolvedType: tAsIs() })` for each entry of `importNode.names`. New `import-scope-registration.test.js` — 6 tests covering imported name in fn body, server-fn body (the exact GITI-002 shape), top-level logic expression, default import, negative control (undeclared still fires), multiple named imports.

### Arc 4 — User overrides into all 11

Presented push/reply/archive options after Round 1.

**User:** "No, these were bare bones, no frills bugs. we need them all to unblock."

Interpretation: Round 1's 4 bugs weren't sufficient to unblock giti or 6nz. All 11 needed before any push/reply. Continued into Round 2.

**Bug B + F** (`70190a7`) — likely shared root confirmed. AST dump showed `label = "HOLD"` parsing as `tilde-decl`. The `case "tilde-decl"` in emit-logic.ts:456 DOES have a reassignment-detection branch: `if (opts.declaredNames?.has(node.name))` → emit as reassignment. But `IfOpts` only had `derivedNames`, not `declaredNames`. Every nested body got a fresh empty `declaredNames` Set, so outer `let x = ...` bindings didn't reach inner assignments.

Fix:
- Widened `IfOpts` to include `declaredNames`.
- `emitIfStmt` now threads `bodyOpts` (with `declaredNames`) into `emitLogicBody(consequent, ...)` and `emitLogicBody(alternate, ...)`.
- Widened `emitForStmt` to accept `opts.declaredNames`, thread through.
- Widened `emitWhileStmt` similarly.
- Dispatch at `emit-logic.ts:603-616` passes `opts.declaredNames` through.

Both Bug B (`let x=A; if(c) x=B` → `const x=B` shadow) and Bug F (`let next=[]; for(...) { if(...) next=[...next, @pressed[i]] }` → `_scrml_derived_declare("next", ...)`) share this root — once declaredNames reaches the inner tilde-decl, the reassignment branch fires correctly. 10 tests in new `let-reassignment-in-branch.test.js`.

**Bug C** (`127d35a`) — two-part fix. AST dump showed the arrow as `{ kind: "escape-hatch", estreeType: "ArrowFunctionExpression", raw: "" }` — empty raw. Traced to:

1. `expression-parser.ts:897-903` `CallExpression` case recurses into args via `esTreeToExprNode(a, filePath, baseOffset)` — does NOT thread `rawSource`. So when the arrow-function case at line 981 tried to build its escape-hatch, `rawSource` was `undefined`, producing `raw: ""`.
2. Fix (a): thread `rawSource` into CallExpression arg recursion. In the arrow case, use ESTree `node.start`/`end` to slice the arrow's own substring from `rawSource`. Validate with a shape regex (`/^(async\s+)?(\(|[A-Za-z_$]...=>)/` + must-contain-`=>`) before accepting. If validation fails, fall back to `""` (old behavior) rather than emit a possibly-misaligned slice.
3. That revealed a second bug in downstream processing. For `(x) => { body }`: `rewriteExpr` Pass 1 `rewritePresenceGuard` matches the whole arrow as a "presence guard" (§42) and rewrites to `if (x !== null && x !== undefined) { body }`. That's correct for a statement-level presence guard but wrong for an arrow VALUE in call-arg position.
4. Fix (b): added `skipPresenceGuard` flag to `RewriteContext`; gated pass 1 in both `clientPasses` and `serverPasses`; exported `rewriteExprArrowBody` / `rewriteServerExprArrowBody`. `emitEscapeHatch` now detects arrow/function estreeType and uses the arrow-body variants.

Tests in new `arrow-block-body-in-call-arg.test.js` — 8 covering .map, .forEach, .filter, single-expr arrow guard, nested arrows.

### Arc 5 — Round 3 (server-fn wiring, largest arc)

**GITI-005** (`e585dba`) — server-fn in markup wired to DOM. Logic-binding loop in `emit-event-wiring.ts:407` only fired for `varRefs.length > 0` (i.e., `@`-prefixed vars in the expression). For `${loadGreeting()}`, varRefs is empty — wiring skipped entirely. Added detection via `buildServerFnNames(fnNameMap)` (matches `_scrml_fetch_` / `_scrml_cps_` prefix) and `exprUsesServerFn()` (textual check with `.`-lookbehind exclusion). When a logic binding's expr uses a server fn, emit:

```js
(async () => { try { el.textContent = await (${rewrittenExpr}); } catch (_e) { el.textContent = ""; } })();
```

For mixed expressions (`@var + serverFn()`), emit both the initial IIFE AND a reactive effect that re-fires the same IIFE on @var change. 7 tests in `server-fn-markup-interpolation.test.js`.

**GITI-003 + GITI-004** (`e5f5b22`) — paired commit. Two separate fixes for boundary seepage.

GITI-004: added `boundary: "server" | "client"` field to `EmitLogicOpts`. In `case "lift-expr"` — when `opts.boundary === "server"` and the lift is an expression form, emit `return ${rhsExpr};` via `emitExprField(..., { mode: "server" })` instead of `_scrml_lift(() => document.createTextNode(...))`. Markup form in server context returns a typed-comment null (non-sensical but emission-safe). Updated 6 emit sites in `emit-server.ts` to pass `{ boundary: "server" }` (CPS + non-CPS × CSRF + non-CSRF × body-iteration + last-stmt-return = 6 combinations).

GITI-003: post-emit prune pass in `emit-client.ts`. Parses top-of-file import statements; for each, checks if any imported name is referenced in the REMAINING body (non-import portion); drops imports with zero usage. Scoped to non-special paths: `scrml:`, `vendor:`, and `.client.js` imports are always preserved. `testMode` bypasses so fixture-only unit tests preserve source-rewrite observability. `cross-file-import-export.test.js` `makeTestCtx` updated to `testMode: true`. 5 tests in new `server-client-boundary.test.js`.

**GITI-001** (`d23fd54`) — last. Two parts.

Part 1: `@data = serverFn()` emits `_scrml_reactive_set("data", _scrml_fetch_loadValue_4())` — stores unawaited Promise. Post-emit rewrite pass in `emit-client.ts` (after fnNameMap mangling): for every server-fn mangled name, find `_scrml_reactive_set("X", <stub>(ARGS));` and rewrite to `(async () => _scrml_reactive_set("X", await <stub>(ARGS)))();`. Uses manual paren-depth walk (not regex) so nested args in the call are handled correctly.

Part 2: `<request id="req1">` without a `url=` attribute emits fetch machinery with `fetch("", { method: "GET" })`. Fix in `emit-reactive-wiring.ts:644`: track `hasUrl` flag; return early from `emitRequestNode` when no url. The body's server-fn call (now awaited per part 1) is the fetch. `<request url="...">` unchanged. 6 tests in new `request-tag-and-server-fn-reactive.test.js`.

### Arc 6 — Push + reply + archive

**User:** "1 2 3 lets go"

All three simultaneously:
1. Reply messages drafted and delivered to giti + 6nz inboxes with per-bug summaries and re-verify asks.
2. `needs: push` message to master inbox with full commit range and push-coordination details (per `feedback_push_protocol` — commit to main, send needs:push to master, never push directly).
3. Both S34 incoming messages moved to `handOffs/incoming/read/`.

### Arc 7 — Open note in giti reply

Called out one known-quirk in the giti reply message: `<p>${@data.value}</p>` emits a module-top bare read of `_scrml_reactive_get("data").value;` that executes before the async IIFE resolves — throws `Cannot read properties of undefined`. Pre-existing emission shape (markup `${@x.y}` generating a bare reference), not S34-introduced. Offered workarounds (default value, guard expr) and noted it's available as a follow-up if blocking.

---

## 3. Files changed this session

### Source changes
| File | Commit | Purpose |
|---|---|---|
| `compiler/src/codegen/emit-logic.ts` | `aa92070` | Object.freeze emission comma fix |
| `compiler/src/codegen/emit-logic.ts` | `70190a7` | IfStmt dispatch now threads declaredNames |
| `compiler/src/codegen/emit-logic.ts` | `e5f5b22` | lift-expr case handles boundary: "server" |
| `compiler/src/codegen/emit-event-wiring.ts` | `eb86d31` | thread event into bare-call handlers |
| `compiler/src/codegen/emit-event-wiring.ts` | `e585dba` | serverFn detection + async IIFE for DOM wiring |
| `compiler/src/codegen/emit-client.ts` | `27ed6fe` | mangler regex negative lookbehind |
| `compiler/src/codegen/emit-client.ts` | `e5f5b22` | unused-import prune pass |
| `compiler/src/codegen/emit-client.ts` | `d23fd54` | awaited reactive-set post-rewrite |
| `compiler/src/codegen/emit-control-flow.ts` | `70190a7` | IfOpts widened; for/while widened; thread declaredNames |
| `compiler/src/type-system.ts` | `881b411` | import-decl case binds names into scope |
| `compiler/src/expression-parser.ts` | `127d35a` | CallExpression threads rawSource; arrow slices raw |
| `compiler/src/codegen/rewrite.ts` | `127d35a` | skipPresenceGuard flag + rewriteExprArrowBody variants |
| `compiler/src/codegen/emit-expr.ts` | `127d35a` | emitEscapeHatch picks arrow variant on estreeType |
| `compiler/src/codegen/emit-server.ts` | `e5f5b22` | 6 sites pass boundary: "server" to emitLogicNode |
| `compiler/src/codegen/emit-reactive-wiring.ts` | `d23fd54` | emitRequestNode skip when no url= |

### Test additions
| File | Bug | Tests |
|---|---|---|
| `compiler/tests/unit/meta-captured-bindings.test.js` | E | +3 |
| `compiler/tests/unit/event-handler-args-e2e.test.js` | A | +2 (§4 updated) |
| `compiler/tests/unit/event-delegation.test.js` | A | asserts updated |
| `compiler/tests/unit/state-block-event-wiring.test.js` | A | asserts updated |
| `compiler/tests/unit/mangle-property-access.test.js` | D | +3 (new file) |
| `compiler/tests/unit/import-scope-registration.test.js` | GITI-002 | +6 (new file) |
| `compiler/tests/unit/let-reassignment-in-branch.test.js` | B + F | +10 (new file) |
| `compiler/tests/unit/arrow-block-body-in-call-arg.test.js` | C | +8 (new file) |
| `compiler/tests/unit/server-fn-markup-interpolation.test.js` | GITI-005 | +7 (new file) |
| `compiler/tests/unit/server-client-boundary.test.js` | GITI-003+004 | +5 (new file) |
| `compiler/tests/unit/request-tag-and-server-fn-reactive.test.js` | GITI-001 | +6 (new file) |
| `compiler/tests/unit/cross-file-import-export.test.js` | GITI-003 | `makeTestCtx` switched to `testMode: true` |

Total new tests: 51 (8 new test files + additions to 4 existing).

---

## 4. Test suite health

| Snapshot | Pass | Skip | Fail | Files |
|---|---|---|---|---|
| Entering S34 (`eab5251`) | 7,322 | 40 | 2 | 331 |
| After Bug E (`aa92070`) | 7,325 | 40 | 2 | 331 |
| After Bug A (`eb86d31`) | 7,327 | 40 | 2 | 331 |
| After Bug D (`27ed6fe`) | 7,330 | 40 | 2 | 332 |
| After GITI-002 (`881b411`) | 7,336 | 40 | 2 | 333 |
| After B+F (`70190a7`) | 7,346 | 40 | 2 | 334 |
| After C (`127d35a`) | 7,354 | 40 | 2 | 335 |
| After GITI-005 (`e585dba`) | 7,361 | 40 | 2 | 336 |
| After GITI-003+004 (`e5f5b22`) | 7,367 | 40 | 2 | 337 |
| **Close (`d23fd54`)** | **7,373** | **40** | **2** | **338** |

**Zero regressions at every commit.** Pre-existing fails unchanged (Bootstrap L3 perf + tab.js-path test).

---

## 5. Non-compliance (current state)

Carried:
- `master-list.md` header **11 sessions stale** (S23 baseline). S33 wrap flagged as highest-visibility onboarding doc. S34 did not refresh.
- `docs/SEO-LAUNCH.md` uncommitted **12 sessions**. Ask user once, close.
- `benchmarks/fullstack-react/CLAUDE.md` — out-of-place agent tooling inside framework-comparison dir.
- §48.9 prose still says "pure adds memoization permission to fn" — stale under §33.6. Low priority.
- **NC-3 (S33):** §54.6 has no assigned code for Phase 4h (return-type narrow-fit mismatch). Blocks Phase 4h. No design call yet.

Resolved this session:
- **NC-5 (S34-open, 11 bugs)** — all fixed, all shipped.

Fresh surface note (not tracked as NC):
- `<p>${@data.value}</p>` emits a module-top bare read of `_scrml_reactive_get("data").value` in addition to the reactive-effect wiring. When `data` starts as undefined (e.g. first async fetch), the module-top read throws. Pre-existing emission shape; flagged to giti as a follow-up.

---

## 6. Design-insights ledger

No new insights. S34 was pure bug-fix execution; no design calls surfaced. Insight 21 ratified in S31/S32 remains byte-intact at `scrml-support/design-insights.md` lines 632-760.

---

## 7. User memory touched this session

All existing memories honored:

- `feedback_agent_model` — no subagents this session (direct PA work).
- `feedback_persist_plans` — triage plan written to `hand-off.md` §3 immediately after reproduction, before any fix started. Not deferred to wrap.
- `feedback_user_voice` — entries being appended to `user-voice-scrmlTS.md` this wrap (not deferred).
- `feedback_push_protocol` — user authorized push via "1 2 3 lets go". `needs: push` message sent to master; no direct push from this PA.
- `feedback_batch_size` — 9 commits, one per bug/cluster. Each batch stayed well in-context.
- `feedback_verify_compilation` — every bug verified with local compile + `node --check` before committing. Every commit ran full test suite for regression check.
- `user_truck_driver` — session stayed efficient. User's terse directives ("D then triage", "lets go 1", "no...we need them all to unblock", "1 2 3 lets go") minimized wasted context.
- `feedback_language_cohesion` — honored. Fixes reused existing grammar conventions (e.g., the awaited-reactive-set follows the same IIFE shape as the markup-interpolation async wiring; the `boundary: "server"` option is a clean discriminated addition, not a new code path).
- `project_public_pivot` — S34's bug list IS the adopter-friction queue. Both giti and 6nz are downstream adopters experiencing the compiler at realistic scale. Every fix is adopter-unblocking.
- `project_lin_redesign` — untouched this session.

No new memories written.

---

## 8. Next PA priorities — ordered

### 8.1 Probably-top — await giti + 6nz replies

Reply messages dropped at:
- `giti/handOffs/incoming/2026-04-20-1700-scrmlTS-to-giti-all-5-bugs-fixed.md`
- `6NZ/handOffs/incoming/2026-04-20-1700-scrmlTS-to-6nz-all-6-bugs-fixed.md`

Both ask for per-bug pass/fail confirmation after re-verify. Expect one or more follow-up messages into `scrmlTS/handOffs/incoming/` next session. Triage those first.

### 8.2 Cleanup item surfaced by GITI-001

The `<p>${@x.y}</p>` module-top bare read (emits `_scrml_reactive_get("x").y;` at module load → throws on undefined). Pre-existing. Flagged to giti as a follow-up; if they confirm it's a blocker, fix scope is the markup-interpolation emission path that should skip the module-top bare read when the binding is reactive-only.

### 8.3 Phase 4h (still deferred)

Return-type narrowing at transition call site — blocked on spec gap NC-3 (§54.6 code-assignment). Unchanged from S33. Don't pull unless user redirects.

### 8.4 Conformance un-skip follow-ups

30 S32 conformance tests still skipped per S33 wrap's §8.3. Highest-leverage next un-skip: **inline state-literal field assignment** (`< T> name = x </>`). Gates 7 conformance tests + improves adopter ergonomics.

### 8.5 Non-compliance cleanup

Ordered by leverage:
1. `master-list.md` refresh — 11 sessions stale, highest-visibility onboarding doc.
2. NC-3 spec decision — unblocks Phase 4h.
3. `docs/SEO-LAUNCH.md` — ask user, close.
4. `benchmarks/fullstack-react/CLAUDE.md` — move or delete.
5. §48.9 cleanup — fold into any future SPEC-touching commit.

### 8.6 F8/F9 adopter polish (from S30's deferred list)

Still open: F8 (scaffold lacks `package.json` + `README.md`) and F9 (scaffold lacks inline orientation comments). Cheap side-quests between larger arcs.

---

## 9. Agents + artifacts reference

### Repro corpus
- `/tmp/s34-repros/` — 8 scrml sources + 8 compiled output dirs. Ephemeral (in `/tmp`) but complete snapshots of expected-vs-actual for every bug. Useful for the next PA if any bug needs re-opening.

### Test artifacts
All under `compiler/tests/unit/` with bug-specific prefixes:
- `mangle-property-access.test.js` (D)
- `import-scope-registration.test.js` (GITI-002)
- `let-reassignment-in-branch.test.js` (B + F)
- `arrow-block-body-in-call-arg.test.js` (C)
- `server-fn-markup-interpolation.test.js` (GITI-005)
- `server-client-boundary.test.js` (GITI-003 + 004)
- `request-tag-and-server-fn-reactive.test.js` (GITI-001)

Plus additions to:
- `meta-captured-bindings.test.js` (E)
- `event-handler-args-e2e.test.js` (A)
- `event-delegation.test.js` (A)
- `state-block-event-wiring.test.js` (A)
- `cross-file-import-export.test.js` (testMode switch for GITI-003)

### Spec (no changes this session)
- `compiler/SPEC.md` — 20,439 lines, 54 sections.
- `compiler/SPEC-INDEX.md` — accurate as of S33 open (`eab5251`). No regen needed this session.

### Design-insights ledger
- `scrml-support/design-insights.md` — 21 entries, unchanged.

### Live touch-point map
- `.claude/maps/PHASE-4-TOUCH-POINTS.md` — S33 artifact, not refreshed this session (Phase-4-scoped; S34 was adopter-bug-scoped, different surface).

### Primary agents used
None this session. All direct PA work.

### Gauntlet / debate
No dispatches. S32's 5 fn-debate experts remain staged but dormant.

---

## 10. Session-close protocol executed

User directive: `D then triage` → 11 repros → Round 1 → all-11 override → `1 2 3 lets go`.

- **1 (push)**: `needs: push` message sent to master inbox. Commit range `4ddb7e0..d23fd54`. 9 commits.
- **2 (reply)**: per-bug summary messages dropped into giti + 6nz inboxes.
- **3 (archive)**: both S34 incoming messages moved to `handOffs/incoming/read/`.

---

## 11. Summary for the next PA — one paragraph

S34 cleared both adopter inboxes end-to-end. 11 bugs (5 giti + 6 6nz) spanning seven distinct codegen surfaces: comma separators in Object.freeze (E), event-handler wrapper arity (A), post-emit name mangler scope (D), logic-block import binding (GITI-002), control-flow declaredNames threading for let+conditional reassignment (B + F), arrow-with-block-body rawSource propagation + presence-guard bypass (C), server-fn-in-markup async-IIFE DOM wiring (GITI-005), server/client boundary separation via `boundary: "server"` lift lowering + external-js-import prune (GITI-003 + 004), and `<request>`/reactive-set awaited-Promise post-rewrite (GITI-001). Nine commits `aa92070..d23fd54`, all committed to main, push requested via master inbox per `feedback_push_protocol`. Suite 7,322 → 7,373 / 40 / 2 with zero regressions at every commit. 51 new tests across 8 new test files plus additions to 4 existing files. Tutorial `docs/tutorial-snippets/01e-bindings.scrml` now compiles to the behavior it advertises (A + D both reproduced on it). One latent bug flagged in the giti reply: `${@x.y}` markup emits a module-top bare read that throws pre-resolution for async-initialized reactives — pre-existing emission shape, not S34-introduced, available as follow-up. No new design insights, no spec changes, no new agents staged or retired. Both inbound messages archived to `handOffs/incoming/read/`; next session opens on replies from giti + 6nz (expected).
