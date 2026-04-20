# scrmlTS — Session 33 Wrap

**Date opened:** 2026-04-20
**Date closed:** 2026-04-20 (single-day session)
**Previous:** `handOffs/hand-off-33.md` (S32 wrap, rotated in as S33 starting brief)
**Baseline entering S33:** 7,262 pass / 49 skip / 2 fail (26,585 expects / 321 files) at `faf4c19`, origin/main clean.
**Final at S33 close:** **7,322 pass / 40 skip / 2 fail** (26,703 expects / 331 files) at `36eadb9`, pushed to origin/main.

---

## 0. Close state

### S33 commits — 10 commits, all pushed to origin/main

| Commit | Phase | Summary |
|---|---|---|
| `2009bbb` | open | `docs(s33-open): regenerate SPEC-INDEX post-S32, rotate hand-off, log giti inbound` |
| `36320ab` | 4a | `impl(s32-phase-4a): block-splitter recognizes transition-decl body (§54.3)` |
| `44a348f` | 4b | `impl(s32-phase-4b): AST transition-decl node (§54.3)` |
| `09ede6e` | 4c | `impl(s32-phase-4c): StateType.transitions registry hook (§54.3)` |
| `82c9e17` | 4d | `impl(s32-phase-4d): from contextual keyword + params binding in transition bodies (§54.3)` |
| `72210e8` | 4e | `impl(s32-phase-4e): E-STATE-TRANSITION-ILLEGAL at call site (§54.6.3)` |
| `5de6a2d` | 4f | `impl(s32-phase-4f): E-STATE-TERMINAL-MUTATION on field writes to terminal substates (§54.6.4)` |
| `37f21f7` | 4g | `impl(s32-phase-4g): fn-level purity in transition bodies (§33.6)` |
| `36eadb9` | conf | `test(s32-conformance): un-skip 9 tests now covered by Phase 4a-4g` |

Push range: `4ddb7e0..36eadb9` (push landed cleanly; user authorized at wrap via `C then B then A`).

### Uncommitted at wrap

- `docs/SEO-LAUNCH.md` — still uncommitted, **11 sessions running**. Nothing touched it this session either.
- `hand-off.md` — this file (new wrap content).

### Incoming

- `handOffs/incoming/2026-04-20-1210-giti-to-scrmlTS-server-function-codegen-bugs.md` — **unread as of wrap**. 5 P0 codegen bugs blocking giti UI end-to-end. User directive: S34 priority.
- Nothing cross-repo outgoing from S33.

### Cross-repo

- scrmlTSPub retirement still pending at master since S25 (untouched).
- Design-insights ledger unchanged since insight 21 (S31, carried through S32/S33 implementation without new entries).

---

## 1. Session theme — "S32 implementation completion — Phase 4a through 4g"

S33 was pure implementation continuation of the S32 ratified amendment (insight 21 — Plaid state-local transitions + `pure` modifier reach-extension). Seven Phase 4 sub-phases landed, plus preflight (SPEC-INDEX regen + project-mapper refresh) and post-phase conformance un-skip. Zero regressions across every phase.

Single arc, linear cadence. User drove with terse "A" greenlights through the full sequence; no detours. Phase 4h (return-type narrowing at call site) is the only Phase 4 sub-phase not delivered — blocked on spec §54.6 code-assignment gap (NEW NC-3), not an implementation dependency.

---

## 2. Session log

### Arc 1 — session open + preflight

User said "read pa.md and start session". Standard rotation: S32 wrap → `handOffs/hand-off-33.md`, fresh hand-off, incoming scan (empty at scan time).

Reported preflight options to user. User: "lets do both and set up for success." Launched in parallel:

- **SPEC-INDEX regen** via `bash scripts/update-spec-index.sh` then manual edit. Result: SPEC-INDEX.md rewritten from 149 lines to 155, all §1-§54 row lines + Quick Lookup refreshed, §54 row added explicitly (20152-20439, 288 lines), S32-specific lookups added (§33.6, §51.15, §54.3/4/5/6, E-STATE-COMPLETE, state-local transitions, field narrowing).
- **project-mapper refresh** via Agent dispatch (opus). Mapper could not write (permission denied on `.claude/maps/`) but returned full delta patch inline. Most load-bearing output: **PHASE-4-TOUCH-POINTS.md** with 7-section inventory (block-splitter, tokenizer/BS handoff, AST transition-decl target sites, StateType mutation sites, scope-chain insertion points, purity walker reuse, diagnostic registry) — absolute paths + line numbers for every Phase 4a-4h hook point. I wrote this file at `.claude/maps/PHASE-4-TOUCH-POINTS.md` (gitignored) before proceeding.

Mapper also flagged NEW NC-4: **unread giti inbound** (arrived between my session-open scan and the map pass). Surfaced to user before committing to Phase 4.

### Arc 2 — giti inbound triage decision

**User:** "stay on 4"

Inbound message summary (kept in inbox, not opened into a task):

- **GITI-BLOCK-001:** `<request>` emits `fetch("", {method:"GET"})` — empty URL.
- **GITI-BLOCK-002:** `import { x } from './file.js'` inside `${}` triggers false E-SCOPE-001 when used inside a `server function` body.
- **GITI-BLOCK-003:** server-only import leaks into `.client.js`.
- **GITI-BLOCK-004:** `lift <bare-expr>` in a `server function` body lowers to `_scrml_lift(() => document.createTextNode(...))` — DOM code in a Bun server handler.
- **GITI-BLOCK-005:** `${serverFn()}` in markup drops the fetch result (no DOM binding emitted).

giti has parked UI work entirely. Deferred to S34 per user wrap directive.

### Arc 3 — Phase 4a (block-splitter)

S32 close documented the wall: `name(params) => < Target> { body }` fails E-CTX-003 because `{` after `< Target>` enters nested-state context, not logic.

Reproduced at `/tmp/repro-phase4.mjs` with four cases. Narrowed: fails whenever `< Ident>` appears after `ident(...) =>` at state-body level — `< Ident>` pushed as state frame, stack goes off by one.

**Fix:** targeted block-splitter lookahead. Added `isAfterTransitionArrow(tagStartPos)` helper — backward-scans whitespace → `=>` → whitespace → balanced `(...)` → identifier. At the `<`-whitespace state-opener path (line 1017+), if topFrame is `state` AND `isAfterTransitionArrow` matches AND the `< Ident>` is followed by `{` (forward-peek skipping whitespace), consume `< Ident>` as text and set `topFrame.transitionBodyPending = true`. At the bare `{` branch (line 879+), if topFrame has the flag, pushBraceContext("logic") instead of orphanBraceDepth++.

Three-part forward-peek guard means the flag is armed ONLY when the full compound pattern `ident(...) => < Target> {` is present. Plain `=>` in markup or `< Target>` elsewhere takes existing paths.

Tests: `compiler/tests/unit/transition-decl-block-split.test.js` — 9 tests covering empty body, logic body, markup-returning body, no-param / typed-param / nested-paren signatures + three regression guards. 7,262 → 7,271 pass.

### Arc 4 — Phase 4b (AST node)

Block-splitter Phase 4a emits text (signature) + logic (body) siblings inside state children. Phase 4b collapses them into a single `transition-decl` AST node.

Shape: `{ kind: "transition-decl", name, paramsRaw, targetSubstate, body: ASTNode[], span, fromSubstate: string | null }`.

Helpers (ast-builder.js):
- `parseTrailingTransitionSignature(text)` — backward-scans a text block's trailing content for the signature pattern. Returns `{name, paramsRaw, target, sigStart}` or null.
- `collapseTransitionDecls(children, filePath, counter, parentStateName)` — walks state children pairwise; when text+logic matches a signature, emits a unified node and preserves any leading residual text.

Hooked in `case "state"` at buildBlock, right after children are recursively built. Also fixed the logic case's body slice: `prefixLen = raw.startsWith("${") ? 2 : 1` so transition bodies (`{...}`, 1-char opener) correctly strip the single brace instead of losing a whitespace char.

Tests: `compiler/tests/unit/transition-decl-ast.test.js` — 8 tests covering node shape, params passthrough, multi-transition accumulation, sibling isolation, span presence, body-as-logic parsing. 7,271 → 7,279 pass.

Note: `fromSubstate` field added in the Phase 4d commit but the plumbing was threaded through `collapseTransitionDecls` at 4b for locality.

### Arc 5 — Phase 4c (registry)

Goal: `StateType.transitions?: Map<string, TransitionInfo>` so Phase 4e/4f can look up transitions by name on the receiver's type.

Additions (type-system.ts):
- New `TransitionInfo` interface: `{ name, paramsRaw, targetSubstate, span }`.
- `StateType` gains `transitions?: Map<string, TransitionInfo>`.
- `tState()` factory grows optional `transitions` param; spread-sets only when non-empty (mirrors `parentState` pattern).
- `registerStateType()` grows trailing `transitions?` param, passes through.
- state-constructor-def visitor (line 3363+): walks `n.children`, filters `kind === "transition-decl"`, builds a Map, passes to `registerStateType`.

Substates placeholder preservation at lines 1890-1892 unchanged — parents don't carry transitions, and the placeholder path only applies to parent states (substates register their own transitions at their own `tState` call). No new preservation needed.

Tests: `compiler/tests/unit/transition-decl-registry.test.js` — 7 tests. No-transition state has `transitions === undefined`, single / multiple transitions accumulate, sibling isolation (Draft's transitions don't leak to Validated), parent does NOT inherit substate transitions, top-level state with a transition still registers, span presence. 7,279 → 7,286 pass.

### Arc 6 — Phase 4d (`from` + params)

Goal: inside a transition body, `from` is bound to the enclosing substate's type, and params bind with their declared types.

Additions:
- **ast-builder.js:** `collapseTransitionDecls` now stamps `fromSubstate: string | null` on every transition-decl (the declaring state's name). Threaded from `buildBlock`'s `case "state"` via `block.name`.
- **type-system.ts:** new `case "transition-decl"` after `case "state-constructor-def"`. Pushes `transition:<From>:<Name>` scope. Binds `from` via `stateTypeRegistry.get(fromSubstate) ?? tAsIs()`. Parses `paramsRaw` on the fly — top-level comma-split honoring `() [] {} <>` nesting, then `name: typeExpr` split at first colon. Resolves each type annotation through main `typeRegistry`. Walks body via `visitLogicNode(stmt, "client")`. Pops scope.

Client boundary chosen as a provisional default — §33.6 purity is a superset that applies uniformly, and Phase 4g layers `checkFnBodyProhibitions` on top independent of boundary. `from` already a tokenizer KEYWORD (line 57); contextual-ness enforced via scope lookup.

Tests: `compiler/tests/unit/transition-decl-scope.test.js` — 6 tests. `fromSubstate` stamped correctly (Draft for nested, Solo for top-level). `from` bare / `from.field` / declared param inside body: no E-SCOPE-001. `from` outside transition: E-SCOPE-001 fires (negative control). 7,286 → 7,292 pass.

### Arc 7 — Phase 4e (E-STATE-TRANSITION-ILLEGAL) — first behavior-visible

Call-site check: when `<receiver>.<method>(<args>)` resolves the receiver to a StateType with declared transitions, and `method` is not among them, fire E-STATE-TRANSITION-ILLEGAL.

Additions:
- **expression-parser.ts:** exported `forEachCallInExprNode` (was internal).
- **type-system.ts:** new `checkTransitionCallsInExpr(exprNode, span, scopeChain, stateTypeRegistry, errors)`. Walks every CallExpr; when callee is a MemberExpr, resolves the receiver (IdentExpr direct lookup, OR the reactive-read rewrite `CallExpr(Ident("_scrml_reactive_get"), [Lit("name")])`). If receiver is a StateType with non-empty `transitions` AND method not in map → emit with declared-transitions list (sorted for stable messages).

Hook sites (mirror of §2a E-SCOPE-001 hooks): let/const-decl initExpr, reactive-decl initExpr, bare-expr exprNode.

Silence rules: callee not member, receiver not state, state has no transitions (terminal — 4f's territory), method IS in map.

Tests: `compiler/tests/unit/transition-decl-illegal.test.js` — 8 tests. Legal / illegal / error message shape / field read (silent) / terminal (silent) / non-state binding (silent) / reactive `@sub.method()` legal and illegal.

**Test fixture note:** `let x: T = < T></>; x.method();` — explicit `;` required between logic statements when the init is a state literal, otherwise the logic-body expression parser absorbs the following call into the previous let's initializer. Pre-existing parser shape, documented in 4e's commit body.

7,292 → 7,300 pass.

### Arc 8 — Phase 4f (E-STATE-TERMINAL-MUTATION)

Completes the Phase 4 behavior surface. A substate is "terminal" iff `parentState` is set AND `transitions` is undefined or empty. Field writes on terminal substates fire E-STATE-TERMINAL-MUTATION.

Scope narrowed deliberately: only fires on substates (parentState set). Top-level states are silent — firing there would regress every pre-S32 user program that writes fields on plain states.

Additions (type-system.ts):
- New `checkTerminalMutationsInExpr(exprNode, span, scopeChain, stateTypeRegistry, errors)` — walks for `AssignExpr` with `MemberExpr` target. Receiver resolution same as 4e. Generic descent through sub-expression fields avoids an exhaustive kind-switch.
- Hook sites: same three as 4e (let/const/reactive init, bare-expr).
- **reactive-nested-assign case:** the `@obj.path = value` form is a dedicated AST node, not a bare-expr. Added a mirror check here — if the reactive var resolves to a terminal substate, fire with `path[0]` as the reported field name.

Tests: `compiler/tests/unit/transition-decl-terminal.test.js` — 7 tests. Terminal + field write fires. Error names substate and field. Non-terminal (has transitions): silent. Top-level state: silent. Field read: silent. Non-state binding: silent. Reactive `@sub.body = x` to terminal: fires.

7,300 → 7,307 pass.

### Arc 9 — Phase 4g (transition-body purity)

One-line dispatch extension: after the body walks in `case "transition-decl"`, call `checkFnBodyProhibitions(n, txBody, errors, filePath, stateTypeRegistry, nonPureFnNames, scopeChain)` — same signature the `case "function-decl"` dispatch uses. Per §33.6 transition purity is a subset of fn purity, so E-FN-001..E-FN-005 apply verbatim. No new error codes.

Note: shared walker emits `fn <name>` prose since it reads `fnNode.name`. For a transition-decl, `.name` is the transition name, so users see `fn validate is declared async` etc. — mildly misleading wording but semantically correct per §33.6. Refining per-caller wording can come later.

Tests: `compiler/tests/unit/transition-decl-purity.test.js` — 6 tests. Date.now / Math.random / new Date in transition body → E-FN-004. Pure body: silent. `from` / `from.field`: silent. Non-transition `function` with Date.now(): silent (regression guard — E-FN-* is fn/transition-only per §48, not regular `function`).

7,307 → 7,313 pass.

### Arc 10 — Conformance un-skip (post-phase)

User directive "C then B then A". Un-skipped 9 of 39 gated S32 conformance tests.

Rewrote diagnose() helper in each conformance file to use the lighter `splitBlocks → buildAST → runTS` harness instead of the `compileScrml`+tmpdir shim (matches unit-test pattern). Rewrote test source samples to use actual scrml typed-attr syntax `name(type)` instead of the spec-document shorthand `name: type` and legacy `< state Name>` opener.

**Un-skipped (9 tests, all green):**
- `s33-pure.test.js`: CONF-S32-001 (outer-scope mutation → E-FN-003), -002 (Date.now → E-FN-004), -003a (pure fn → W-PURE-REDUNDANT).
- `s48-fn.test.js`: CONF-S32-004 (fn ≡ pure function diagnostic set parity).
- `s54-substates.test.js`: CONF-S32-016 (`from.field` inside transition: no E-SCOPE-001), -017a/b (`from` as param/let outside transition: legal), -019 (terminal substate transition call → E-STATE-TRANSITION-ILLEGAL), -020 (terminal substate field write → E-STATE-TERMINAL-MUTATION).

**Remaining 30 skips — each annotated with a specific gate** (see commit `36eadb9` body for full list). Categories:
- **Inline state-literal field-assign syntax** `< T> name = x </>` — parser parses `name = x` as logic-level assignment, not a state field initializer. Blocks CONF-S32-005, -006a, -006b, -007, -021a, -021b, -031.
- **Phase 4h / return-type narrowing** — blocks CONF-S32-015a, -015b. No spec code assigned (NEW NC-3).
- **`@ narrowing` via `is < Substate>`** not threaded into call/mutation checks — blocks CONF-S32-023, -024.
- **E-STATE-FIELD-MISSING + cross-substate narrowing** — separate §54.4 arc. Blocks CONF-S32-022.
- **Struct `from` field naming** — blocks CONF-S32-017c.
- **Pure transition modifier** (`pure validate() =>`) — parser doesn't accept yet. Blocks CONF-S32-003b.
- **Untyped-state exhaustiveness syntax** — covered by unit tests. Blocks CONF-S32-018.
- **§51.15 machine cross-check** — separate S32 arc not yet started. 7 tests.
- **Runtime/e2e behavior** (audit, replay, temporal, `when changes`) — needs runtime harness. CONF-S32-025 through -031.

7,313 → 7,322 pass / 40 skip (was 49).

### Arc 11 — Push + wrap

User: `C then B then A`. Completed C (above). Pushed 10 commits `4ddb7e0..36eadb9` to origin/main (one-time user auth via the wrap directive). Running wrap: updating hand-off, appending user-voice.

Forward directive from user: **next session opens on giti + 6nz bug reports.** Phase 4h, 4+h conformance, and any further S32 work are deprioritized for S34.

---

## 3. Files changed this session — full list with purpose

| File | Commit | Purpose |
|---|---|---|
| `compiler/SPEC-INDEX.md` | `2009bbb` | Full regeneration — §1-§54 line numbers + §54 row + Quick Lookup refresh |
| `handOffs/hand-off-33.md` | `2009bbb` | Rotated S32 wrap |
| `handOffs/incoming/2026-04-20-1210-giti-to-scrmlTS-server-function-codegen-bugs.md` | `2009bbb` | giti inbound — 5 P0 codegen bugs (unread, S34 priority) |
| `compiler/src/block-splitter.js` | `36320ab` | `isAfterTransitionArrow` helper + state-opener hook + `{` branch hook |
| `compiler/tests/unit/transition-decl-block-split.test.js` | `36320ab` | 9 Phase 4a tests |
| `compiler/src/ast-builder.js` | `44a348f` | `parseTrailingTransitionSignature` + `collapseTransitionDecls` + logic case prefix detection |
| `compiler/tests/unit/transition-decl-ast.test.js` | `44a348f` | 8 Phase 4b tests |
| `compiler/src/type-system.ts` | `09ede6e` | TransitionInfo interface + StateType.transitions field + tState/registerStateType signatures + state-constructor-def visitor hook |
| `compiler/tests/unit/transition-decl-registry.test.js` | `09ede6e` | 7 Phase 4c tests |
| `compiler/src/ast-builder.js` | `82c9e17` | `fromSubstate` stamped on transition-decl |
| `compiler/src/type-system.ts` | `82c9e17` | `case "transition-decl"` visitor — scope push, `from` bind, param parsing, body walk |
| `compiler/tests/unit/transition-decl-scope.test.js` | `82c9e17` | 6 Phase 4d tests |
| `compiler/src/expression-parser.ts` | `72210e8` | `forEachCallInExprNode` exported |
| `compiler/src/type-system.ts` | `72210e8` | `checkTransitionCallsInExpr` + 3 hook sites |
| `compiler/tests/unit/transition-decl-illegal.test.js` | `72210e8` | 8 Phase 4e tests |
| `compiler/src/type-system.ts` | `5de6a2d` | `checkTerminalMutationsInExpr` + 3 hook sites + reactive-nested-assign case extension |
| `compiler/tests/unit/transition-decl-terminal.test.js` | `5de6a2d` | 7 Phase 4f tests |
| `compiler/src/type-system.ts` | `37f21f7` | `checkFnBodyProhibitions` call in transition-decl case |
| `compiler/tests/unit/transition-decl-purity.test.js` | `37f21f7` | 6 Phase 4g tests |
| `compiler/tests/conformance/s32-fn-state-machine/s33-pure.test.js` | `36eadb9` | diagnose() wired; 3 un-skipped + 1 skip |
| `compiler/tests/conformance/s32-fn-state-machine/s48-fn.test.js` | `36eadb9` | diagnose() wired; 1 un-skipped + 4 skip |
| `compiler/tests/conformance/s32-fn-state-machine/s54-substates.test.js` | `36eadb9` | diagnose() wired; 5 un-skipped + 18 skip |
| `.claude/maps/PHASE-4-TOUCH-POINTS.md` | (local, gitignored) | 7-section Phase-4 inventory from project-mapper output |
| `hand-off.md` | this wrap | S33 full log (this file) |
| `handOffs/hand-off-33.md` | rotated | S32 wrap preserved verbatim |
| `../scrml-support/user-voice-scrmlTS.md` | this wrap | S33 verbatim entries appended |

---

## 4. Test suite health

- **Entering S33:** 7,262 pass / 49 skip / 2 fail (26,585 expects / 321 files) at `faf4c19`.
- **After 2009bbb (open):** unchanged (docs only).
- **After 36320ab (4a):** 7,271 pass / 49 / 2 (+9 tests).
- **After 44a348f (4b):** 7,279 pass / 49 / 2 (+8 tests).
- **After 09ede6e (4c):** 7,286 pass / 49 / 2 (+7 tests).
- **After 82c9e17 (4d):** 7,292 pass / 49 / 2 (+6 tests).
- **After 72210e8 (4e):** 7,300 pass / 49 / 2 (+8 tests).
- **After 5de6a2d (4f):** 7,307 pass / 49 / 2 (+7 tests).
- **After 37f21f7 (4g):** 7,313 pass / 49 / 2 (+6 tests).
- **Close after 36eadb9 (conformance):** **7,322 pass / 40 skip / 2 fail (26,703 expects / 331 files).**

**Zero regressions across every commit.** Nine dedicated test files added (one per phase + one per commit boundary where applicable).

**Pre-existing fails unchanged:** Bootstrap L3 perf, tab.js-path test. Neither blocks any S33 work or adopter path.

**Skip delta:** 49 → 40. Nine S32 conformance tests are now green; the remaining 30 each carry a specific gate annotation (see commit `36eadb9`).

---

## 5. Design-insights ledger

No new insights this session. Phase 4 was pure execution against insight 21's spec amendment — no new design calls emerged during implementation. The one "spec gap" surfaced (Phase 4h's narrow-fit error code, §54.6) was logged as NEW NC-3 in the project-mapper non-compliance report, not as a design insight.

Insight 20 + 21 both remain byte-intact at `scrml-support/design-insights.md` lines 545-628 and 632-760 respectively.

---

## 6. Non-compliance (current state)

Carried from prior sessions:
- `master-list.md` header still **10 sessions stale** (S23 baseline). S33 should have refreshed; did not.
- `docs/SEO-LAUNCH.md` uncommitted **11 sessions**. Ask user once, close.
- `benchmarks/fullstack-react/CLAUDE.md` — agent-tooling inside a framework-comparison dir. Out of place.
- §48.9 prose still says "pure adds memoization permission to fn" — stale under §33.6. Low priority.
- **NEW NC-3 (S33):** §54.6 has no assigned code for Phase 4h (return-type narrow-fit mismatch). Design call needed before 4h can implement.
- **NEW NC-4 (S33):** giti inbound unread in `handOffs/incoming/`. S34 priority.

Resolved this session:
- SPEC-INDEX.md line-number drift — regenerated (commit `2009bbb`).

Fresh cleanup items from the conformance rewrite:
- Inline state-literal field-assign syntax (`< T> name = val </>`) parses as logic-level assignment. This is a pre-existing parser shape that gates 7 conformance tests + future inline-construction ergonomics. Not a regression; a known limit.
- `@ narrowing` via `is < Substate>` — not threaded into call-site / mutation-site type resolution. Gates 2 conformance tests. Future §54.4 arc.
- E-STATE-FIELD-MISSING + cross-substate narrowing — separate §54.4 arc, not in Phase 4 scope. Gates 1 conformance test.

---

## 7. User memory touched this session

No new memories written. Existing memories honored:

- `feedback_agent_model` — opus dispatched for project-mapper. No other subagents this session.
- `feedback_persist_plans` — this hand-off written immediately at wrap (not deferred).
- `feedback_user_voice` — S33 entries being appended to user-voice-scrmlTS.md this wrap (not deferred).
- `feedback_push_protocol` — user explicitly authorized push via the wrap directive `C then B then A`. Single push of 10 commits.
- `feedback_batch_size` — Phase 4 split across seven commits; each batch stayed well in-context. Worked.
- `feedback_verify_compilation` — every phase verified via `bun test` before commit; zero regressions validates the discipline across 8 implementation commits + 1 conformance commit.
- `user_truck_driver` — session stayed efficient; terse user greenlights + predictable phase cadence minimized wasted context.
- `feedback_language_cohesion` — honored throughout. Phase 4 reuses existing grammar conventions (`< X>` space-after-`<`, `from` as KEYWORD, reuse E-FN-* rather than new purity codes, paramsRaw kept verbatim for later parse rather than inventing a new param AST shape).
- `project_public_pivot` — tested when the giti inbound surfaced; user explicitly said "stay on 4" because Phase 4 IS the adopter-forward flagship feature. S34 shifts to giti + 6nz per user forward directive.
- `project_lin_redesign` — untouched this session; noted in Phase 4g commit body as an interaction site for transition-body purity + `lin` bindings (CONF-S32-026).

---

## 8. Next PA priorities — ordered

### 8.1 FIRST — giti + 6nz bug reports (S34 user directive)

User wrap: "next session we will take a look at giti and 6nz bug reports".

**giti inbound** at `handOffs/incoming/2026-04-20-1210-giti-to-scrmlTS-server-function-codegen-bugs.md`:

1. **GITI-BLOCK-005** (highest priority per sender) — `${serverFn()}` in markup drops the fetch result. No DOM binding emitted. Related to 001 but on the non-`<request>` path.
2. **GITI-BLOCK-002** — `import { x } from './file.js'` in logic context triggers false E-SCOPE-001 when used inside `server function` body. Scope resolver missing a rule that registers imported names into the logic-block symbol table.
3. **GITI-BLOCK-001** — `<request>` tag emits `fetch("", {method:"GET"})` — empty URL. Also stores unawaited Promise.
4. **GITI-BLOCK-003** — server-only import leaks into `.client.js`.
5. **GITI-BLOCK-004** — `lift <bare-expr>` in `server function` body lowers to `_scrml_lift(() => document.createTextNode(...))`. DOM code in Bun handler.

giti sender explicitly stated `Option A (fix bugs in order 005 first)` OR `Option B (document exact working idiom for <request>)`. Option A preferred.

**6nz** — no inbound as of S33 close. User's "giti and 6nz bug reports" suggests either an inbound is expected imminently or 6nz work needs proactive pull. First S34 action: check inbox, and if empty for 6nz, surface to user for clarification.

Move the giti message to `handOffs/incoming/read/` only AFTER user acknowledgment (per pa.md protocol).

### 8.2 SECOND — Phase 4h (remaining Phase 4 sub-phase, deferred)

Only unimplemented Phase 4 sub-phase. Return-type narrowing at transition call site: when `x.validate()` is called on `x: Draft` and `validate` has `targetSubstate: "Validated"`, the call result should narrow `x`'s static type to `Validated`.

**Blocked on spec gap (NEW NC-3):** §54.6 has no assigned code for narrow-fit mismatch. Candidates: (a) reuse E-STATE-COMPLETE with widened message, (b) new E-STATE-NARROWING-FIT under §54.6.5, (c) extend E-TYPE-026. Spec amendment needed before implementation.

Non-blocking work 4h can start without the error-code decision: tracking the return type through the expression tree so `let v = sub.validate()` binds `v: Validated` rather than `asIs`. This is what the conformance test CONF-S32-015a/b expect for "body without return" / "return not a state literal" cases.

### 8.3 THIRD — Conformance un-skip follow-ups

As parser or narrowing capabilities land, un-skip the relevant tests. Un-skip map for the 30 still-skipped conformance tests is in commit `36eadb9`'s body.

Highest-leverage next un-skip: **inline state-literal field assignment** (`< T> name = x </>`). Fixes 7 conformance tests + improves ergonomics of adopter code (which currently must use `< T></>` + post-assignment OR separate construction patterns).

### 8.4 FOURTH — Non-compliance cleanup

Ordered by leverage:

1. **master-list.md refresh** — 10 sessions stale. Tight S30-S33 window (avoid backfilling). This is the highest-visibility doc for onboarding context.
2. **NEW NC-3 spec decision** — unblocks Phase 4h. Probably 30 min of user-involved conversation.
3. **SEO-LAUNCH.md** — ask user once ("commit, revert, or archive?"), then close.
4. **benchmarks/fullstack-react/CLAUDE.md** — move or delete.
5. **§48.9 cleanup** — fold into any future SPEC-touching commit. Not urgent alone.

### 8.5 FIFTH — F8/F9 adopter polish (from S30's deferred list, carried through S31/S32/S33)

Still open:
- F8 — scaffold lacks `package.json` + `README.md`. Cheap.
- F9 — scaffold lacks inline orientation comments. Cheap.

Good side-quest between larger arcs.

---

## 9. Agents + artifacts reference (so you don't have to grep)

### Conformance tests (31 statements, 39 tests, 9 now green)

- `/home/bryan/scrmlMaster/scrmlTS/compiler/tests/conformance/s32-fn-state-machine/REGISTRY.md` — statement ledger CONF-S32-001..031.
- `s33-pure.test.js` — 3 green, 1 skip.
- `s48-fn.test.js` — 1 green, 4 skip.
- `s51-machine-cross-check.test.js` — 0 green, 7 skip (§51.15 not started).
- `s54-substates.test.js` — 5 green, 18 skip.

### Phase 4 test artifacts

All under `compiler/tests/unit/` with `transition-decl-*` prefix:
- `block-split.test.js` — 9 tests (Phase 4a).
- `ast.test.js` — 8 tests (Phase 4b).
- `registry.test.js` — 7 tests (Phase 4c).
- `scope.test.js` — 6 tests (Phase 4d).
- `illegal.test.js` — 8 tests (Phase 4e).
- `terminal.test.js` — 7 tests (Phase 4f).
- `purity.test.js` — 6 tests (Phase 4g).

Total S33-added unit tests: 51.

### Design-insights

- `/home/bryan/scrmlMaster/scrml-support/design-insights.md` — 21 entries unchanged. Insight 21 at lines 632-760.

### User voice

- `/home/bryan/scrmlMaster/scrml-support/user-voice-scrmlTS.md` — S33 entries appended this wrap.

### Live SPEC (authoritative)

- `/home/bryan/scrmlMaster/scrmlTS/compiler/SPEC.md` — 20,439 lines, 54 sections.
- `/home/bryan/scrmlMaster/scrmlTS/compiler/SPEC-INDEX.md` — **fresh this session** (commit `2009bbb`). Line numbers and Quick Lookup accurate as of S33 open. Re-regenerate if SPEC.md is edited before S34.

### Phase 4 touch-point map

- `/home/bryan/scrmlMaster/scrmlTS/.claude/maps/PHASE-4-TOUCH-POINTS.md` — written from project-mapper output. Gitignored; local only. Still accurate for Phase 4h.

### Primary agents used this session

- `project-mapper` (opus) — hit write-permission denial on `.claude/maps/`; returned full delta inline. PA wrote PHASE-4-TOUCH-POINTS.md from the mapper's output.

No new agents staged; no agents retired.

### Gauntlet / debate

No gauntlet dispatches. No new debates. S32's 5 fn-debate experts remain staged (from S31) but were not used this session.

---

## 10. Session-close protocol executed (for the pattern)

User directive: `C then B then A`.

- **C (conformance):** `36eadb9` — 9 un-skipped, 30 annotated.
- **B (push):** `4ddb7e0..36eadb9` → origin/main. 10 commits, zero conflicts.
- **A (wrap):** this file, user-voice append.

---

## 11. Summary for the next PA — one paragraph

S33 took S32's ratified §54 amendment from partial (Phases 1/2/3 complete) to substantively whole across 10 commits + 1 conformance commit. Phase 4a (block-splitter transition-decl recognition) through Phase 4g (fn-level purity in transition bodies) all landed cleanly with dedicated unit-test coverage per sub-phase. Baseline held exactly: 7,262 → 7,322 pass / 40 skip / 2 fail, zero regressions across 331 test files. User can now write `< Submission> < Draft> validate() => < Validated> { ... } </> < Validated></> </>` and get E-STATE-TRANSITION-ILLEGAL on undeclared calls, E-STATE-TERMINAL-MUTATION on terminal-substate field writes, and E-FN-* on impure transition bodies — all with the `from` contextual keyword and declared params in scope. Phase 4h (return-type narrowing) is the only remaining sub-phase, blocked on a spec code-assignment gap (NEW NC-3). User explicitly directed S34 to open on giti + 6nz bug reports (giti has an unread P0 inbound with 5 codegen bugs blocking its Web UI end-to-end), not further Phase 4 work. Push authorized at wrap; all 10 commits on origin/main at `36eadb9`. SPEC-INDEX regenerated at session open and remains accurate.
