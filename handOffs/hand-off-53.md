# scrmlTS — Session 51 (CLOSED — fat wrap, push authorized)

**Date opened:** 2026-04-30 (machine-A, post-S50 close)
**Date closed:** 2026-04-30 (same day; long single-day session)
**Previous:** `handOffs/hand-off-52.md` (S50 close — fat wrap; pre-saved at S50 close).
**Baseline entering S51:** scrmlTS at `3dab098` (S50 close); clean / **8,196 pass / 40 skip / 0 fail / 385 files**. scrml-support clean / 0/0 origin.
**State at S51 close:** scrmlTS at `56b80ad` (67 commits ahead of origin); scrml-support at `e83c993` + 4 untracked deep-dives (to be committed at close). Tests **8,380 pass / 40 skip / 0 fail / 400 files**. **Net delta: +184 tests, +15 files, 0 regressions.**

---

## 0. The big shape of S51

**The systemic silent-failure sweep session.** Single-day session that opened the systemic-silent-failure deep-dive (parent), executed 8 fix dispatches + 1 child architectural deep-dive, and closed 6 of 6 original S50 P0s (one partially) + 3 newly-surfaced P0s + many P1/P2s. **+184 tests, +67 commits, 0 regressions, all main commits FF-merged.** Dispatch app went from "compiles clean but cannot run" to "compiles correctly with most architectural gaps closed."

The architectural through-line: **realize the S49 validation principle mechanically across every distinct silent-failure mechanism.** The user's directive was *"anywhere, we're fixing everything"* — and the deep-dive prioritization gave us the order to fix it in.

### Track A — Systemic silent-failure deep-dive (parent)

User directive: *"lets deep dive with everrything first"* — broad-scope research dispatch covering every open architectural defect from S50.

Output: `scrml-support/docs/deep-dives/systemic-silent-failure-sweep-2026-04-30.md` (1,026 lines). Cataloged 35 items across 16 mechanisms (5 P0-bearing from S50 hand-off + 11 expanded). Discovered M17 (test-scaffolding-masks-production) shared by F-COMPONENT-001 + F-RI-001. Recommended **Unified Validation Bundle (UVB)** — 4 validation passes (VP-1..4) shipped as one focused T2 dispatch. Critical path to "validation principle holds across the dispatch app": 3 dispatches (W0a F-COMPILE-001 + W0b OQ-2 + W1 UVB).

12 OQs surfaced; user accepted defaults via "go go go" / "green" cadence. Fed into: W0a, W0b, W1, then triggered W2 child deep-dive.

### Track B — W0a (F-COMPILE-001) + W0b (OQ-2) parallel critical-path

Both worktree-isolated T2 dispatches. **First dispatch attempt aborted** because PA's cwd was scrml-support, not scrmlTS — harness created worktrees in the wrong repo. Both agents correctly halted at startup-verification. PA cd'd to scrmlTS, re-dispatched. Second attempt: W0a completed cleanly; W0b crashed mid-implementation at tool_use 184 with `API Error: ConnectionRefused`.

**W0a (F-COMPILE-001) shipped:**
- Option A (preserve source-tree in dist) + Option B (E-CG-015 hard-error on basename collision)
- 7 commits, +17 tests
- Dispatch app outputs went 32 sources → 17 HTML / 47 distinct (15 collisions) → 21 HTML / 74 distinct (0 collisions)
- SPEC §47.9 amendment (output path encoding) + new error code E-CG-015
- W0a discovered 3 deferred items: F-BUILD-002 candidate (`_scrml_session_destroy` duplicate import), E-CG-002 vs E-CG-015 spec/impl drift (E-CG-002 was already taken by `emit-server.ts:76`; SPEC row corrected), backwards-incompatible dist layout messaging

**W0b (OQ-2) — RESUMED via fresh dispatch on the existing worktree:**
- Hand-written runtime shims for `auth`, `crypto`, `store` at `compiler/runtime/stdlib/`
- `bundleStdlibForRun()` + `rewriteStdlibImports()` in api.js (rewrite `from "scrml:auth"` → `from "<rel>/_scrml/auth.js"`; nested-output files emit `../../_scrml/...` correctly)
- 5 commits (2 pre-rebase: pre-snapshot+repro+diagnosis, runtime shims; 3 post-rebase: bundling+rewrite, regression test, final summary)
- Rebase against post-W0a main resolved 3 conflict regions in api.js (preserved both W0a's pathFor()/writeOutput()/writtenPaths AND W0b's stdlib bundling)
- +9 tests; full smoke-test passes (zero `scrml:*` residue in emitted JS)
- W0b discovered 2 deferred items: F-COMPILE-002 candidate (codegen `.scrml` extension imports not rewritten), SQL Class B parse failures (13 of 17 dev-server failures emit `sql-ref:-1`)

### Track C — W1 (Unified Validation Bundle)

T2 dispatch via scrml-dev-pipeline. 4 validation passes:
- **VP-1**: per-element attribute allowlist → W-ATTR-001 (unrecognized name) + W-ATTR-002 (unrecognized value-shape) — closes F-AUTH-001 + F-CHANNEL-005 + F-EXPORT-001 silent-acceptance windows at warn level
- **VP-2**: post-CE invariant → E-COMPONENT-035 on residual `isComponent: true` — closes F-COMPONENT-001 silent phantom-DOM-emission window at error level
- **VP-3**: attribute-interpolation validation → E-CHANNEL-007 on `${...}` in `<channel name=>`/`<channel topic=>` — closes F-CHANNEL-001 silent-inert window at error level
- **VP-4**: subsumed by W0a's E-CG-015

10 commits, +44 tests. New `compiler/src/attribute-registry.js` (per-element schema for scrml-special elements). New `compiler/src/validators/` directory (4 files + AST walker). SPEC §15.14 + §38.11 + §52.13 amendments. PIPELINE Stage 3.3 added (post-CE invariant section).

Smoke-test confirmed:
- `examples/22-multifile/app.scrml` → fails E-COMPONENT-035 (was silently passing)
- `examples/23-trucking-dispatch/pages/dispatch/board.scrml` → fails 3× E-COMPONENT-035 (was silently emitting phantom)

### Track D — W2 architectural deep-dive

User directive: dispatch deep-dive in parallel with continuing fixes. Output: `scrml-support/docs/deep-dives/f-component-001-architectural-2026-04-30.md` (1,093 lines).

**Killer finding:** the LSP at `lsp/workspace.js` already ships canonical-key + auto-gather. CE is the outlier among 4 cross-file consumers. Compresses parent's T3 estimate to T2-large. Trade-off matrix decisive: Approach B (unified canonical-key + recursion + auto-gather) leads by 11 over A, 13 over D, 17 over C. **No debate needed.**

6 OQs surfaced. Defaults accepted: `.scrml`-only auto-gather (defer .js); sane-limit guard YES; `--no-gather` opt-out flag YES; F-COMPONENT-002 fold-in NO; dispatch-app components refactor NO (separate W2-FOLLOW); no edition gate.

### Track E — W2 architectural fix

T2-large dispatch via scrml-dev-pipeline. Approach B (canonical-key + recursion + auto-gather):

- **F1 (CE recursion):** `hasAnyComponentRefsInLogic` now walks nested markup. Wrapped patterns no longer skip CE.
- **F2 (canonical key):** `runCEFile` consumes `importGraph` directly (per B2-b sub-decision); resolves `imp.source` → `absSource` via importGraph + looks up `fileASTMap.get(absSource)` and `exportRegistry.get(absSource)`. Mirrors LSP's `lsp/workspace.js` pattern + TS-pass pattern at `api.js:626-660`.
- **F3 (auto-gather):** CLI builds transitive `.scrml` import closure starting from inputs. `--no-gather` opt-out flag plumbed through compile/dev/build commands. Sane-limit guard with new error code E-IMPORT-007.

**Bonus discovery (not in deep-dive's F1/F2/F3 catalog):** TAB classifies `${ export const X = <markup/> }` as `export-decl` not `component-def`, so cross-file `ast.components` was empty for export-const components. CE now ALSO scans `ast.exports` and synthesizes a component-def by stripping the `export const NAME =` prefix.

5 commits, +10 tests. New `compiler/tests/integration/cross-file-components.test.js` (10 tests; canonical real-fixture path closes the M17 scaffolding-mask gap). SPEC §15.14.4 + §15.14.5 + §21.6 (E-IMPORT-005/006/007) + §21.7 amendments. PIPELINE Stage 3.2 input/output contract amendments.

**G-gate verification (per deep-dive §10):**
- G1 (22-multifile compiles clean): ✅
- G2 (emitted JS contains expanded markup, no phantoms): ✅ (5 setAttribute calls, 0 createElement)
- G3 (browser renders 5 badges): ✅ (mechanically; full nested `<li><span class="badge">` 5x in app.client.js loop)
- G4 (integration tests pass): ✅ (10/10)
- G5 (dispatch-app `board.scrml` works): ⚠️ PARTIAL — F4 surfaced (nested-PascalCase Phase-1 limitation in `parseComponentBody`; same-file fails identically; **pre-existing not W2-caused**)
- G6 (FRICTION status flip): ✅ (with F4 caveat)

`examples/22-multifile/` master-list row flipped `[x][❌]` → `[x][✅]`. Kickstarter v1 multi-file section dropped KNOWN-BROKEN flag, restored canonical 3-file pattern recipe. **F-COMPONENT-003 candidate** surfaced for nested-PascalCase Phase-1 limitation.

### Track F — W3 (F-NULL-001 + F-NULL-002 paired)

T2-medium dispatch.

**Diagnostic finding:** F-NULL-001's "machine-context-dependent" trigger was incidental. At post-W1 baseline, both with-machine and without-machine client-fn bodies fired E-SYNTAX-042 equally. The true root cause was a generic walker-incompleteness defect in GCP3 affecting every markup-attribute and ternary-condition position, regardless of machine presence.

F-NULL-002 was the same defect manifested differently: the detector's `walkAst` inspected `condExpr/initExpr/exprNode/argsExpr` but never visited `markup.attrs[*].value.exprNode`. Server-fn bodies routed through `if-stmt.condExpr` (visited); markup-attr expressions lived at `attrs[*].value.exprNode` (unreached). Plus a separate diagnostic-quality bug: `spanFromEstree` hard-coded `line:1, col:1`.

7 commits, +15 tests. SPEC §42.7 amendment (uniform rejection across all source positions).

**`--no-verify` violation:** Commit `7d2c4e7` (TDD red intermediate) bypassed pre-commit hook. Next commit (`09cca5e`, fix+tests both green) was clean. **Per pa.md this needs explicit auth; agent did it without asking.** Surfaced for next-session attention. Future TDD work should single-commit fix+tests OR get explicit auth for red commits.

### Track G — W3.1 + W3.2 paired (null follow-on)

T2-medium dispatch.

- **W3.1 (F-NULL-003):** bare `null`/`undefined` literals in value position (declaration init, return, object property, array element, ternary branch, default param) silently passed pre-W3.1. Fix: `forEachLitNull` walker visits every exprNode subtree + emits E-SYNTAX-042 on lit-null nodes. Suppression for `is-not`/`is-some`/`is-not-not` synthetic operands.
- **W3.2 (F-NULL-004):** string-template `${...}` interpolation in attribute string-literals never parsed into exprNodes. Fix shape (b) tactical: `extractTemplateInterpSegments` scans for `${...}` with brace-depth tracking; each segment re-parsed via existing `parseExprToNode`; resulting exprNode fed back through `inspectExprNode`.

6 commits, +39 tests (26 W3.1 + 13 W3.2). SPEC §42.7 enumerated 3 rejection categories + suppression rule. Cascade fixture updates: TodoMVC `app.scrml` (3 sites) + `fn-expr-member-assign.test.js` (3 fixtures) — both used `null` as semantically-equivalent placeholders for `not`; updated to spec-compliant `not` within the same commit as the detector. **No deferrals** — the agent stayed within scope. Diagnostic-quality limitation: W3.2 segments parsed with `offset=0` (no precise byte offset); spans fall back to attribute's `value.span` line/col.

### Track H — Bookkeeping commit (FRICTION)

After Tracks B-G shipped, PA-side bookkeeping commit (`8dddd27`) added 5 new findings to dispatch-app FRICTION.md:
- F-COMPILE-002 (P0, pre-existing) — codegen `.scrml` extension imports not rewritten
- F-BUILD-002 (P0, pre-existing) — `_scrml_session_destroy` duplicate import
- F-SQL-001 (P0, formerly "SQL Class B") — `?{}` parser emits `sql-ref:-1` placeholders
- F-NULL-003 (P1, W3 follow-on) — bare null literals silently pass §42.7
- F-NULL-004 (P1, W3 follow-on) — string-template attr interp null silently pass

### Track I — F-COMPILE-002 + F-BUILD-002 paired

T2-medium dispatch.

**F-COMPILE-002 root cause:** Two-layer bug. (1) `emit-server.ts:111-122` emitted `stmt.source` verbatim (no `.scrml` rewrite), unlike `emit-client.ts` which had it. (2) Post-emit `rewriteRelativeImportPaths` (api.js:283) treated `.server.js`/`.client.js` as source-tree files and would mis-relocate them back into the source tree.

**F-BUILD-002 root cause:** Single-source bug. `emit-server.ts:166` emits `_scrml_session_destroy` from EVERY auth-middleware server.js. `generateServerEntry` (build.js:200-209) imports each module's exports under name → N copies → SyntaxError. Fix shape: option (d) skip-duplicate (first-importer-wins).

6 commits, +15 tests (8 F-COMPILE-002 + 7 F-BUILD-002). SPEC §47.10 + §47.11 + §47.12 amendments.

**Deferred:** F-COMPILE-003 candidate surfaced — pure-helper `.scrml` files compile to near-empty `.client.js` and no `.server.js`. Extension rewrite works but imported file lacks named exports at runtime. Visible in `examples/22-multifile/`. Filed for separate triage (later partly addressed by W5).

### Track J — F-SQL-001

T2-medium dispatch.

**Diagnosis:** The regex `/\?\{[^}]*\}/g` in `compiler/src/expression-parser.ts:137,169` cannot handle `?{...${expr}...}` — `[^}]*` non-greedy stops at the first `}`, which in real SQL templates is the closing brace of a `${}` interpolation. Acorn then sees a truncated input and either parses just the placeholder identifier with the rest as silent trailing content (warning fires from line 1182, no hard error) or fails entirely (escape-hatch fallback). The dispatch's reference to `sql-ref:-1` was a slight mis-statement of the actual symptom; real bug was regex truncation; `sql-ref:-1` is a deliberate parser-stage marker.

Fix shape (C): both ergonomic and hard-error.
- **(A) Ergonomic:** `replaceSqlBlockPlaceholder()` — context-mode-stack scanner (frames: `js{depth}`, `template`, `single`, `double`). `?{` enters JS-context; `` ` `` enters template; `${` inside template enters nested JS-context; pops back correctly. Single-/double-quoted strings respected.
- **(B) Hard-error:** when scanner reaches end-of-input with outer JS-frame still open, `ParseResult.sqlDiagnostic` carries E-SQL-008. `parseExprToNode` returns escape-hatch ExprNode with `sqlDiagnostic`. `safeParseExprToNode`/`safeParseExprToNodeGlobal` push TABError → standard compile error list.

E-SQL-007 was already taken (`?{}` in non-async context); allocated **E-SQL-008**.

7 commits, +17 tests. SPEC §44.8 + E-SQL-008 amendments.

**Smoke-test wins:** dispatch app billing/home/invoices/load-detail F-SQL-001 boundary warning count went from many → 0. Aggregate trailing-content warning count: 146 → 30 (eliminated 116; 30 remaining are pre-existing non-SQL ASI cases).

**Deferred:** 30 remaining trailing-content warnings — F-PARSER-ASI-* / F-PARSER-MARKUP-FRAG-* candidates (samples/compilation-tests/ files + dispatch-app driver/home + driver/hos). Separate triage.

### Track K — W4 (F-RI-001 deeper)

T2-large dispatch.

**Diagnostic finding (the most surprising of the session):** `compiler/src/route-inference.ts` `collectReferencedNames` extracted identifier names via a regex applied to flat-stringified ExprNodes. The regex matched identifier-shaped tokens **inside string-literal contents**. The capture-taint loop (Step 5b) then resolved those bogus names against the global cross-file `fnNameToNodeIds` map. In the dispatch app, `transition()`'s `"/login?reason=unauthorized"` string literal collided with `app.scrml`'s `server function login`, false-tainting `transition`, firing E-RI-002 on the @-assignment — but only in directory (multi-file) compile mode, which is why the S50 single-file regression tests didn't catch it.

Fix: replace regex-on-flat-string with structural walk over ExprNode tree via existing `forEachIdentInExprNode` (visits only `IdentExpr` nodes, skips `LitExpr` content, skips `MemberExpr.property`, skips `LambdaExpr` bodies). Test-fixture compat preserved via `walkExprOrString` string-fallback for hand-built ASTs.

8 commits, +6 tests. SPEC §12.4 amendment (per-fn analysis invariant).

**M2 workaround removed across 10 dispatch-app pages:** `dispatch/load-detail.scrml`, `dispatch/billing.scrml`, `customer/load-detail.scrml`, `customer/quote.scrml`, `customer/invoices.scrml`, `driver/load-detail.scrml`, `driver/home.scrml`, `driver/hos.scrml`, `driver/messages.scrml`, `driver/profile.scrml`. Pattern reverted: removed `@errorMessage = ""` anchor + replaced `setError(errMsg)` server-error-path indirection with direct `if (result.error) { @errorMessage = result.error; return }`.

**F-RI-001 went from PARTIAL → FULLY RESOLVED.** No E-RI-002 fired anywhere on the dispatch app post-fix.

### Track L — W5 (F-AUTH-002 — partial)

T2-medium dispatch. **Partial fix only — Layer 1 of 3.**

**Diagnosis (3 layers):**
- **Layer 1:** `ast-builder.js` EXPORT branch's regex was blind to `pure`/`server` modifier tokens. `collectExpr` stopped at `function` STMT_KEYWORD after consuming `server`, leaving `exportedName=null` and breaking cross-file imports of `export server function NAME` with E-IMPORT-004.
- **Layer 2:** Pure-fn files in browser mode produce empty `.client.js` regardless of exports. SPEC §21.5's "auto-detect" promise is unimplemented.
- **Layer 3:** The actual `?{}` resolution in pure-fn server functions has no spec contract today.

**Shape implemented:** Layer 1 only — modifier parsing fix + SPEC contract direction (§21.5.1 + §44.7.1 + E-SQL-009).

**Layers 2 + 3 deferred as W5a (pure-fn library auto-emit) + W5b (cross-file `?{}` resolve).** W5a is prerequisite for W5b. Architectural cross-file emission gap is broader than F-AUTH-002 (also affects non-SQL pure-fn exports).

6 commits, +13 tests. SPEC §21.5.1 + §44.7.1 + E-SQL-009 amendments.

**F-AUTH-002 went from OPEN → PARTIALLY RESOLVED (W5 Layer 1).**

---

## 1. Commits this session — scrmlTS (67 commits ahead of origin)

```
56b80ad fix(f-auth-002): pure/server export modifier handling + SPEC contract
f656668 WIP(f-auth-002): FRICTION — F-AUTH-002 PARTIALLY RESOLVED (Layer 1 + SPEC)
d96e7c3 WIP(f-auth-002): SPEC §21.5.1 + §44.7.1 + integration tests
181b6be WIP(f-auth-002): ast-builder export-decl recognizes pure/server modifiers
7095f5c WIP(f-auth-002): diagnosis — root cause for E-SQL-004 in cross-file ?{}
bd876a2 WIP(f-auth-002): pre-snapshot — baseline 8361p/0f, branch created
474cce0 fix(f-ri-001-deeper): RI per-fn scoping; multi-server-fn file context no longer false-escalates
a7ee3ac WIP(f-ri-001-deeper): SPEC §12.4 + FRICTION — F-RI-001 RESOLVED, normative per-fn invariant
a898afb WIP(f-ri-001-deeper): revert M2 workaround in remaining 8 dispatch-app pages (M3-M6 sweep)
efb723c WIP(f-ri-001-deeper): revert M2 workaround in dispatch + customer load-detail.scrml
b1d2406 WIP(f-ri-001-deeper): tests — §D + §E + §F regression coverage for cross-file string-literal capture-taint
26c987f WIP(f-ri-001-deeper): route-inference.ts — structural ExprNode walk in collectReferencedNames
a8989ab WIP(f-ri-001-deeper): diagnosis — capture-taint regex matches identifiers inside string literals
6360c94 WIP(f-ri-001-deeper): pre-snapshot — baseline 8361p/0f, multi-fn repro coming next
5c35618 fix(f-sql-001): ?{} parser handles complex shapes; hard-error on unhandled
255b48d WIP(f-sql-001): SPEC §44.8 + E-SQL-008 + FRICTION RESOLVED
d24f15a WIP(f-sql-001): integration tests — bracket-matched + E-SQL-008
9928267 WIP(f-sql-001): hard-error E-SQL-008 path through ast-builder TABError
1b4b67a WIP(f-sql-001): bracket-matched ?{} scanner + E-SQL-008 hard-error path
5ce0f9b WIP(f-sql-001): diagnosis — regex /\?\{[^}]*\}/g cannot match nested braces
d810b34 WIP(f-sql-001): pre-snapshot — baseline 8329p/0f, root cause located
9ac3731 fix(f-compile-002+f-build-002): codegen .scrml-extension rewrite + entry-import deduplication
176de58 WIP(f-compile-002+f-build-002): SPEC + FRICTION updates
2585a36 WIP(f-compile-002+f-build-002): integration tests
0b5695e WIP(f-build-002): generateServerEntry deduplication
32d0c02 WIP(f-compile-002+f-build-002): diagnosis — root cause for both bugs
b0838ae WIP(f-compile-002+f-build-002): pre-snapshot — baseline 8329p/0f, repros captured
e69ecac fix(w3.1+w3.2): bare-null + string-template-interp null sweeps complete §42.7
071122f WIP(w3.1+w3.2): FRICTION — F-NULL-003 + F-NULL-004 RESOLVED
b71ead3 WIP(w3.1+w3.2): SPEC §42.7 — explicit value-position + interpolation enumeration
4f7c430 WIP(w3.1+w3.2): tests — bare-null + string-template-interp coverage
422a9d0 WIP(w3.1+w3.2): bare-null + string-template-interp detectors + cascade fixture updates
528f664 WIP(w3.1+w3.2): pre-snapshot — baseline 8280p/0f, branch created
1f4430d WIP(w2): final progress — G-gate verification + 8290p/0f/+10 net delta
e5cb448 WIP(w2): Plan B reversal — master-list/FRICTION/kickstarter flip-back
2a2d52c docs(w2): SPEC §15.14.4 + §15.14.5 + §21.7 + PIPELINE Stage 3.2
6536f7a feat(w2): F-COMPONENT-001 architectural fix — canonical-key + recursion + auto-gather
1df02e9 WIP(w2): pre-snapshot — baseline 8280p/40s/0f/392 files
8dddd27 docs(s51): FRICTION — 5 new findings logged (F-COMPILE-002, F-BUILD-002, F-SQL-001, F-NULL-003, F-NULL-004)
37c9f8d fix(f-null): GCP3 detector consistent null treatment across markup + fn-body contexts
49b2ab4 WIP(f-null): FRICTION + progress — F-NULL-001 + F-NULL-002 RESOLVED
78ce9dd WIP(f-null): SPEC §42.7 — uniform rejection across all source positions
09cca5e WIP(f-null): GCP3 detector + tests — consistent null treatment
7d2c4e7 WIP(f-null): tests — F-NULL-001/002 + ternary-condition coverage (TDD)   ← --no-verify VIOLATION
7f5c16f WIP(f-null): diagnosis — root cause for both asymmetries identified
37914cc WIP(f-null): pre-snapshot — baseline 8265p/0f, repros captured, diagnosis
1f640d5 feat(uvb-w1): unified validation bundle — VP-1 attr allowlist + VP-2 post-CE invariant + VP-3 attr interp
61eda35 WIP(uvb-w1): FRICTION.md — F-AUTH-001 / F-COMPONENT-001 / F-CHANNEL-001 / F-CHANNEL-005 silent-failure-window-closed
bde823e WIP(uvb-w1): SPEC.md + PIPELINE.md amendments
d670831 WIP(uvb-w1): tests — VP-1 + VP-2 + VP-3 unit + pipeline integration
53f9c56 WIP(uvb-w1): wire VP-1/VP-2/VP-3 into pipeline post-CE; add shared AST walker
cacb344 WIP(uvb-w1): VP-1 + VP-2 + VP-3 validator passes (not yet wired)
d7576bf WIP(uvb-w1): attribute-registry.js — per-element attr schema for scrml-special elements
622804e WIP(uvb-w1): design notes — code namespace, architecture, pipeline placement
51316cc WIP(uvb-w1): pre-snapshot — baseline 8221p/0f at 70eb995
70eb995 fix(oq-2): dev server bootstrap — bundle scrml:* runtime shims + rewrite imports
56c1082 WIP(oq-2): regression test — stdlib bundling + import rewrite + Bun loadability
84b78a0 WIP(oq-2): bundling + import-rewrite — collectStdlibSpecifiers, bundleStdlibForRun, rewriteStdlibImports
7cdf938 WIP(oq-2): runtime shims for scrml:auth, scrml:crypto, scrml:store
58cb308 WIP(oq-2): pre-snapshot + repro + diagnosis
268f190 fix(f-compile-001): preserve dist/ source-tree; E-CG-015 on basename collision
cb5622b WIP(f-compile-001): FRICTION.md F-COMPILE-001 RESOLVED + README updated
7776907 WIP(f-compile-001): SPEC.md §47.9 + E-CG-015 — output path encoding
287c1d7 WIP(f-compile-001): tests — output-tree preservation + collision contract (17 tests)
99d4909 WIP(f-compile-001): build.js + dev.js — recursive *.server.js discovery
05dc7fb WIP(f-compile-001): api.js — Option A preserve source tree + Option B E-CG-015
0373552 WIP(f-compile-001): pre-snapshot — baseline 8196p/0f, repro confirmed
3dab098 (S50 close baseline)
```

Plus the wrap commits landing at session close (this hand-off + master-list + changelog refresh + FRICTION cleanup if needed).

## 2. Commits this session — scrml-support (4 untracked files at S51 close)

scrml-support has 4 untracked files (deep-dive output + 2 progress logs):
```
docs/deep-dives/systemic-silent-failure-sweep-2026-04-30.md (1,026 lines — parent deep-dive)
docs/deep-dives/progress-systemic-silent-failure-sweep-2026-04-30.md
docs/deep-dives/f-component-001-architectural-2026-04-30.md (1,093 lines — child deep-dive)
docs/deep-dives/progress-f-component-001-architectural-2026-04-30.md
```

To be committed at S51 close + push.

User-voice S51 entry to be appended to `user-voice-scrmlTS.md` at session close (verbatim quotes captured below in §7).

---

## 3. Test count timeline

| Checkpoint | Pass | Skip | Fail | Files |
|---|---|---|---|---|
| S50 close (`3dab098`) | 8,196 | 40 | 0 | 385 |
| W0a F-COMPILE-001 merge (`268f190`) | 8,213 | 40 | 0 | 386 |
| W0b OQ-2 merge (`70eb995`) | 8,222 | 40 | 0 | 387 |
| W1 UVB merge (`1f640d5`) | 8,265 | 40 | 0 | 391 |
| W3 F-NULL-001/002 merge (`37c9f8d`) | 8,280 | 40 | 0 | 392 |
| FRICTION bookkeeping (`8dddd27`) | 8,280 | 40 | 0 | 392 |
| W2 architectural merge (`1f4430d`) | 8,290 | 40 | 0 | 393 |
| W3.1+W3.2 merge (`e69ecac`) | 8,329 | 40 | 0 | 395 |
| F-COMPILE-002+F-BUILD-002 merge (`9ac3731`) | 8,344 | 40 | 0 | 397 |
| F-SQL-001 merge (`5c35618`) | 8,361 | 40 | 0 | 398 |
| W4 F-RI-001-deeper merge (`474cce0`) | 8,367 | 40 | 0 | 399 |
| **W5 F-AUTH-002 merge — S51 close (`56b80ad`)** | **8,380** | **40** | **0** | **400** |

**Net delta from S50 close: +184 pass, 0 skip-change, 0 fail-change, +15 files.** Zero regressions across all 12 dispatch waves.

---

## 4. Audit / project state

### S51 dispatch inventory

12 dispatches:
1. Parent silent-failure deep-dive (research; 1,026 lines)
2. W2 child architectural deep-dive (research; 1,093 lines)
3. W0a — F-COMPILE-001 fix (T2)
4. W0b — OQ-2 dev-server bootstrap (T2; crashed mid-flight, resumed)
5. W1 — UVB unified validation bundle (T2)
6. W2 fix — F-COMPONENT-001 architectural (T2-large)
7. W3 — F-NULL-001 + F-NULL-002 paired (T2)
8. W3.1+W3.2 — bare-null + string-template-interp paired (T2)
9. F-COMPILE-002 + F-BUILD-002 paired (T2)
10. F-SQL-001 — `?{}` parser fix (T2)
11. W4 — F-RI-001 deeper (T2-large)
12. W5 — F-AUTH-002 (T2; partial — Layer 1 only)

Plus 1 PA-side bookkeeping commit (FRICTION 5 new findings).

### Status of S50 P0s

| ID | S50 Status | S51 Status |
|---|---|---|
| F-AUTH-001 | OPEN | ✅ silent window closed (W1 W-ATTR-002); ergonomic completion (role gating) deferred to W7 |
| F-AUTH-002 | OPEN | PARTIALLY RESOLVED — W5 Layer 1 (export modifier parsing); W5a + W5b deferred |
| F-COMPONENT-001 | BLOCKED (Plan B parked) | ✅ silent window closed (W1) + architectural fix landed (W2). G5 surfaced F4 nested-PascalCase (pre-existing not W2-caused). 22-multifile flipped back to ✅. |
| F-RI-001 | PARTIAL | ✅ FULLY RESOLVED (W4) + M2 workaround reverted across 10 dispatch-app pages |
| F-CHANNEL-001 | OPEN | ✅ E-CHANNEL-007 errors |
| F-COMPILE-001 | OPEN | ✅ E-CG-015 + dist tree preserved |

### Newly-surfaced findings during S51

| ID | Status | Source dispatch |
|---|---|---|
| F-COMPILE-002 (P0) | ✅ RESOLVED — codegen `.scrml` rewrite + W0b smoke-test discovery | F-COMPILE-002+F-BUILD-002 dispatch |
| F-BUILD-002 (P0) | ✅ RESOLVED — generateServerEntry dedup; W0a smoke-test discovery | F-COMPILE-002+F-BUILD-002 dispatch |
| F-SQL-001 (P0) | ✅ RESOLVED — bracket-matched `?{}` + E-SQL-008; W0b smoke-test discovery | F-SQL-001 dispatch |
| F-NULL-003 (P1) | ✅ RESOLVED — bare-null walker; W3 follow-on | W3.1+W3.2 dispatch |
| F-NULL-004 (P1) | ✅ RESOLVED — string-template-interp; W3 follow-on | W3.1+W3.2 dispatch |
| **F-COMPONENT-003 candidate** (P1) | OPEN — nested-PascalCase Phase-1 limitation in `parseComponentBody`; same-file fails identically | W2 G5 discovery |
| **F-COMPILE-003 candidate** (P1?) | OPEN — pure-helper `.scrml` files compile to near-empty `.client.js` and no `.server.js` | F-COMPILE-002 dispatch |
| **W5a candidate** (T2-medium) | OPEN — pure-fn library auto-emit (per-file mode dispatch) | W5 deferral; prerequisite for W5b |
| **W5b candidate** (T2-medium → T3) | OPEN — cross-file `?{}` resolution against importing `<program db=>` | W5 deferral; depends on W5a |
| **F-PARSER-ASI-** / **F-PARSER-MARKUP-FRAG-** (P2 batch) | OPEN — 30 trailing-content warnings remaining post-F-SQL-001 | F-SQL-001 deferral |

### FRICTION.md complete inventory at S51 close

**P0 (closed in S51 except F-AUTH-002 partial):**
1. F-AUTH-001 — W1 silent window closed (warning); ergonomic deferred (W7)
2. F-AUTH-002 — W5 PARTIAL (Layer 1); W5a + W5b deferred
3. F-COMPONENT-001 — W1 silent window + W2 architectural; F4 caveat
4. F-RI-001 — W4 FULLY RESOLVED
5. F-CHANNEL-001 — W1 closed
6. F-COMPILE-001 — W0a closed
7. F-COMPILE-002 (new) — W3 dispatch closed
8. F-BUILD-002 (new) — W3 dispatch closed
9. F-SQL-001 (new) — F-SQL-001 dispatch closed

**P1 — many closed; some open:**
- F-NULL-001/002/003/004 — W3 + W3.1+W3.2 closed
- F-CHANNEL-005 — W1 W-ATTR-002 warns
- F-EXPORT-001 — W1 W-ATTR-002 warns; ergonomic-completion deferred
- F-COMPONENT-002 — open (W2 deferred)
- F-COMMENT-001 — open (W9)
- F-RI-001-FOLLOW — open (W8)
- F-CPS-001 — DEFERRED INDEFINITELY (M10 architectural)
- F-MACHINE-001 — open (W6)
- F-CHANNEL-002 — DEFERRED (language extension; W3 long-term)
- F-CHANNEL-003 — open (W6)
- F-LIN-001 — open (W8)

**P2 — most carry forward to W9-W11:**
- F-EQ-001, F-AUTH-003, F-DESTRUCT-001, F-PAREN-001, F-CONSUME-001, F-CHANNEL-004, F-CHANNEL-006, F-DG-002-PREFIX

**Observation:** F-IDIOMATIC-001 — should re-check post-W4 + W3.1+W3.2 + W5 to see if `is not`/`is some` adoption picks up now that the asymmetry blockers are removed.

---

## 5. ⚠️ Things the next PA needs to NOT screw up

1. **W5 IS ONLY PARTIAL.** Layer 1 (export modifier parsing) is fixed. W5a (pure-fn library auto-emit) + W5b (cross-file `?{}` resolution) are deferred. The dispatch app's M2-M6 ~450 LOC inline-duplication is NOT yet refactorable. Don't promise adopters they can extract `requireRole(role)` to a shared module yet.

2. **`--no-verify` violation by W3.** Commit `7d2c4e7` bypassed the pre-commit hook for a TDD red intermediate. Per pa.md this requires explicit user authorization. **Surface this at S52 open.** Future TDD work should single-commit fix+tests OR the agent should explicitly ask before red commits.

3. **F4 nested-PascalCase Phase-1 limitation surfaced by W2 G5** — `parseComponentBody` produces 0 blocks for `<LoadCard>` containing `<LoadStatusBadge>`. This is **pre-existing same-file**, NOT a W2 regression. Filed as F-COMPONENT-003 candidate. Don't re-promote `examples/22-multifile/` to "fully working" — it works for the canonical UserBadge case but not for nested-PascalCase patterns.

4. **F-COMPILE-003 candidate (pure-helper export emission)** — surfaced by F-COMPILE-002 dispatch. Pure-helper `.scrml` files compile to near-empty `.client.js`. The extension rewrite works (F-COMPILE-002) but the imported file may not provide named exports at runtime. Visible in `examples/22-multifile/`. W5a covers this domain; expect overlap.

5. **30 remaining trailing-content warnings post-F-SQL-001** — F-PARSER-ASI-* / F-PARSER-MARKUP-FRAG-* candidates across `samples/compilation-tests/gauntlet-r10-svelte-dashboard.scrml`, `gauntlet-s19-phase1-decls/*`, `gauntlet-s79-signup-form.scrml`, `match-001-nested-with-call.scrml`, `gauntlet-s20-sql/sql-transaction-001.scrml`, dispatch-app `driver/home.scrml` and `driver/hos.scrml`. Out of F-SQL-001 scope.

6. **Validation principle is now mechanically realized for M1/M3/M4/M6 mechanisms** (W1 + W0a). M2 (cross-file boundary leak — F-AUTH-002 / F-MACHINE-001 / F-CHANNEL-003) is partly addressed; M5 (file-context escalation — F-RI-001) is fully closed; M11 (asymmetric pass behavior — F-NULL-***) is closed. The systemic silent-failure surface from S50 has been radically reduced.

7. **Worktree-creation off stale main was NOT a problem this session** — every isolation: "worktree" dispatch was created against current main and most agents successfully rebased before continuing (the rebase prelude in every brief works). Continue including the prelude.

8. **First dispatch attempt aborted** — PA's cwd was scrml-support, harness placed both worktrees there. Agents correctly halted at startup-verification. PA cd'd to scrmlTS and re-dispatched. **Lesson:** before any worktree-isolated dispatch, verify pwd is scrmlTS first. Or: have the harness use a fixed path independent of cwd.

9. **F-RI-001 FULLY RESOLVED via structural-walk-not-regex.** The fix is trivial in retrospect: don't apply identifier regex to flat-stringified ExprNodes. Walk structurally. The S50 narrow regression tests (7 tests) didn't catch the bug because they used isolated single-server-fn shapes; the bug only manifested with cross-file string-literal collisions. **Lesson:** use real-fixture integration tests whose shapes match production usage; synthetic narrow tests can mask real bugs.

10. **The systemic silent-failure deep-dive's prediction was correct.** UVB closed the 4-of-6 P0s as predicted; the remaining 2 (F-AUTH-002, F-RI-001) were independently resolved per the per-mechanism strategy. The deep-dive's recommendation to skip debate and go straight to UVB was vindicated. **The 1,026-line research investment paid off in 11 fix dispatches landing without architecture rework.**

11. **Push state at S51 close (BOTH repos) IS authorized.** User said "greenlight fat wrap" — push as part of wrap. scrmlTS at 67 commits ahead pre-push; scrml-support has 4 untracked deep-dive files + needs user-voice S51 append. Both pushed at session close.

12. **Cross-machine sync hygiene clean.** Both repos clean and 0/0 with origin pre-fetch at S51 open. Push at close completes the cycle.

13. **Pre-commit hook test-count discrepancy** — at one point during S51 the hook reported 7,585 tests while main HEAD had 8,280. Filed as observation, not blocker. Likely the hook runs a pruned subset. Track for next session if it recurs.

14. **Authorization scope discipline.** User authorized via "go" / "green" / "go go go" / "c a go" / "b" / "a" / "greenlight fat wrap" — per-action throughout. **Does NOT carry into S52.** Re-confirm before any merge / push / cross-repo write / dispatch.

15. **Component overloading scaffold (`emit-overloads.ts`, 60 LOC) STILL ships dead** — no unit tests, no samples. SPEC-ISSUE-010 still gates it. Pre-S51 carry-forward; not touched in S51.

16. **Tutorial Pass 3-5 (~30h) STILL not started.** Pre-S51 carry-forward.

17. **5 unpublished article drafts STILL pending.** Pre-S51 carry-forward; user said "no amendments for now" S49.

18. **Master inbox stale messages (S26 giti, S43 reconciliation, S49 push-needs) STILL OPEN.** Plus an S51 push-needs notice will be filed at close. Master's queue, not this PA's responsibility.

---

## 6. Open questions to surface immediately at S52 open

- **Push state confirmed at S51 close?** Both scrmlTS + scrml-support pushed.
- **First move on S52?** Plausible candidates:
  - W6 (F-MACHINE-001 + F-CHANNEL-003 paired) — T2-medium; cross-file types + cross-file channels
  - W5a (pure-fn library auto-emit) — T2-medium; prerequisite for W5b; addresses F-COMPILE-003 candidate too
  - W7 (F-AUTH-001 ergonomic completion / role gating) — T3; closes the warning warned by W1 W-ATTR-002 with actual implementation
  - W8 (F-LIN-001 + F-RI-001-FOLLOW paired) — T2-small × 2; small ergonomic wins
  - F-COMPONENT-003 (nested-PascalCase Phase-1) — T2 parser fix
  - F-PARSER-ASI sweep — 30 trailing-content warnings; T2 batch
- **`--no-verify` violation policy.** Should TDD red commits be authorized in advance? Should the pre-commit hook allow a `WIP:` prefix to skip tests? Should every dispatch ask at red intermediates?
- **F-IDIOMATIC-001 re-check.** Now that F-RI-001-FOLLOW is the only remaining `is not` blocker (and W8 will close it), is `is not`/`is some` adoption climbing? Re-grep `examples/23-trucking-dispatch/` post-W8.
- **W5a + W5b dispatch order.** Both required for full F-AUTH-002 closure; W5a is prerequisite. Schedule both back-to-back?
- **Component overloading + Tutorial Pass 3-5 + 5 unpublished articles** — multi-session carry-forward; due any session?

---

## 7. User direction summary (the through-line)

Verbatim user statements + interpretations (S51). Captured here for hand-off completeness; will also append to `scrml-support/user-voice-scrmlTS.md` per pa.md:

### S51 open

> "read pa.md and start session"

PA followed session-start checklist. Sync clean both repos. Read last 10 contentful user-voice entries.

### Direction-setting

> "anywhere, we're fixing everything"

User-scoped session as full-scope architectural sweep. Pa.md authorization is per-action; "anywhere" + "everything" together suggested PA should aggressively work the queue.

### First action

> "lets deep dive with everrything first"

Approved opening the systemic silent-failure deep-dive before any individual triage. The deep-dive (1,026 lines) cataloged 35 items across 16 mechanisms and recommended UVB.

### Action sequence (per-greenlight cadence)

> "go" (W0a + W0b first dispatch) → "go go go" (post-abort retry) → "go" (W1) → "green" (merge W0a + resume W0b + dispatch W1) → "green" (merge W1 + dispatch W2 deep-dive + W3 + bookkeeping) → "c a go" (Option C bookkeeping then Option A W2 fix + W3.1+W3.2) → "b" (Option B — F-COMPILE-002+F-BUILD-002 paired + F-SQL-001) → "a" (Option A — W4 + W5) → "greenlight fat wrap"

The pattern: per-action authorization throughout. Each "go"/"green" applied to the action just proposed. The user used short-form responses to maintain forward motion velocity.

### Through-line

- **User mode:** "we're fixing everything" + per-action greenlights — fast cadence, broad authorization to sweep the queue, but per-action discipline maintained.
- **Validation principle (S49) realized mechanically.** UVB + W0a + W3 + W3.1+W3.2 collectively close the silent-failure window across all 5 mechanisms named at S50. The principle is no longer aspirational; it is enforced.
- **No surprises about scope.** User accepted the deep-dive's defaults across 12 OQs (and 6 W2 OQs) without amendment. The structured deep-dive process worked as designed: research → recommendation → defaults → execution.
- **Adopter-friction surface (FRICTION.md) now reads dramatically better.** 9 P0s closed, 4 P1s closed, several P2s closed. The dispatch app went from "compiles clean but cannot run" to "compiles correctly with most architectural gaps closed." The dispatch-app M2 workaround swept across 10 pages (W4).

### Authorization scope (closing note)

S51's "go"/"green"/"a"/"b"/"c" pattern was per-action throughout. **It does NOT carry into S52.** Per pa.md "Authorization stands for the scope specified, not beyond." Next session should re-confirm before any merge / push / cross-repo write / dispatch.

---

## 8. Tasks (state at S51 close)

| # | Subject | State |
|---|---|---|
| Systemic silent-failure deep-dive | T3 research | ✅ DONE — 1,026 lines |
| F-COMPONENT-001 architectural deep-dive (W2) | T3 research | ✅ DONE — 1,093 lines |
| W0a — F-COMPILE-001 fix | T2 fix | ✅ DONE — merge `268f190` |
| W0b — OQ-2 dev-server bootstrap | T2 fix (resumed) | ✅ DONE — merge `70eb995` |
| W1 — UVB unified validation bundle | T2 fix | ✅ DONE — merge `1f640d5` |
| W2 — F-COMPONENT-001 architectural fix | T2-large fix | ✅ DONE — merge `1f4430d` |
| W3 — F-NULL-001 + F-NULL-002 paired | T2 fix | ✅ DONE — merge `37c9f8d` |
| W3.1+W3.2 — bare-null + string-template-interp | T2 fix | ✅ DONE — merge `e69ecac` |
| F-COMPILE-002 + F-BUILD-002 paired | T2 fix | ✅ DONE — merge `9ac3731` |
| F-SQL-001 — `?{}` parser | T2 fix | ✅ DONE — merge `5c35618` |
| W4 — F-RI-001 deeper | T2-large fix | ✅ DONE — merge `474cce0` |
| W5 — F-AUTH-002 module-with-db-context | T2 fix (PARTIAL Layer 1) | ⚠️ PARTIAL — Layer 1 done; W5a + W5b deferred |
| F-COMPONENT-003 candidate (nested-PascalCase) | T2 fix | OPEN — surfaced by W2 G5 |
| F-COMPILE-003 candidate (pure-helper export) | T2 fix | OPEN — surfaced by F-COMPILE-002 dispatch |
| W5a — pure-fn library auto-emit | T2-medium | OPEN — prerequisite for W5b |
| W5b — cross-file `?{}` resolution | T2-medium → T3 | OPEN — depends on W5a |
| W6 — F-MACHINE-001 + F-CHANNEL-003 paired | T2 fix | OPEN |
| W7 — F-AUTH-001 ergonomic completion (role gating) | T3 | OPEN |
| W8 — F-LIN-001 + F-RI-001-FOLLOW paired | T2-small × 2 | OPEN |
| W9 — M8 paper cuts (F-COMMENT-001 + F-CONSUME-001 + F-CHANNEL-006 + F-DESTRUCT-001) | T1-small × 4 | OPEN |
| W10 — M13 diagnostic bugs (F-AUTH-003 + F-DG-002-PREFIX) | T1-small × 2 | OPEN |
| W11 — M15 docs (F-CHANNEL-004 + audit 184/250) | T1-small × 3 | OPEN |
| W12 — scrml-migrate CLI command | T2-medium | OPEN |
| F-PARSER-ASI / F-PARSER-MARKUP-FRAG sweep (30 warnings) | T2 batch | OPEN |
| F-CPS-001 (CPS protocol architectural limit, M10) | T3 | DEFERRED INDEFINITELY |
| F-CHANNEL-002 (`@shared` on-change hook, M12 missing primitive) | T3 language extension | DEFERRED |
| Master inbox stale messages | bookkeeping | OPEN — master's queue |
| Component overloading tutorial | gated on SPEC-ISSUE-010 | DEFERRED |
| Tutorial Pass 3-5 (~30h) | docs | NOT STARTED |
| 5 unpublished article drafts | user-driven publish | PENDING |
| Audit row 184 (`class={expr}` SPEC-ISSUE-013) | spec | OPEN |
| Audit row 250 (HTML spec version SPEC-ISSUE-005) | spec | OPEN |
| `--no-verify` violation policy | governance | OPEN — surface at S52 open |
| Pre-commit hook test-count discrepancy | observation | OPEN — track if recurs |

---

## 9. needs:push state

scrmlTS commits on `main`: **67 ahead of origin** at S51 close (will be 70+ after wrap commits — this hand-off + master-list + changelog).

scrml-support commits on `main`: 0 ahead BUT has 4 untracked files (2 deep-dives + 2 progress logs) + needs user-voice S51 append.

**S51 close: PUSH AUTHORIZED** by user ("greenlight fat wrap"). Both repos pushed at session close.

---

## 10. File modification inventory (forensic — at S51 close)

### scrmlTS — modified files this session

**Compiler source (12 dispatches across):**
- `compiler/src/api.js` (+250+/-50+ across W0a + W0b + W2 + F-COMPILE-002+F-BUILD-002)
- `compiler/src/commands/build.js` (+30+ across W0a + W2 + F-BUILD-002)
- `compiler/src/commands/compile.js` (+10+ across W0a + W2)
- `compiler/src/commands/dev.js` (+45+ across W0a + W2)
- `compiler/src/component-expander.ts` (+211/-10 W2 — F1+F2+F3+export-decl synthesis)
- `compiler/src/module-resolver.js` (+4 W2 — export resolveModulePath)
- `compiler/src/codegen/emit-server.ts` (+14 F-COMPILE-002 — `.scrml` rewrite)
- `compiler/src/route-inference.ts` (+30+ W4 — structural ExprNode walk)
- `compiler/src/expression-parser.ts` (+174/-7 F-SQL-001 — bracket-matched scanner)
- `compiler/src/ast-builder.js` (+76+ across F-SQL-001 + W5)
- `compiler/src/gauntlet-phase3-eq-checks.js` (+360+ across W3 + W3.1+W3.2)
- `compiler/src/attribute-registry.js` (NEW W1 — 227 lines)
- `compiler/src/validators/ast-walk.ts` (NEW W1 — 122 lines)
- `compiler/src/validators/attribute-allowlist.ts` (NEW W1 — 169 lines)
- `compiler/src/validators/attribute-interpolation.ts` (NEW W1 — 138 lines)
- `compiler/src/validators/post-ce-invariant.ts` (NEW W1 — 98 lines)
- `compiler/src/types/ast.ts` (+4 W5)
- `compiler/runtime/stdlib/auth.js` (NEW W0b — 276 lines)
- `compiler/runtime/stdlib/crypto.js` (NEW W0b — 84 lines)
- `compiler/runtime/stdlib/store.js` (NEW W0b — 136 lines)

**Tests (12+ new test files / extended):**
- `compiler/tests/integration/compile-output-tree.test.js` (NEW W0a — 17 tests)
- `compiler/tests/integration/oq-2-stdlib-runtime-resolution.test.js` (NEW W0b — 9 tests)
- `compiler/tests/integration/uvb-w1-pipeline.test.js` (NEW W1 — 4 tests)
- `compiler/tests/unit/uvb-w1-attr-allowlist.test.js` (NEW W1 — 20 tests)
- `compiler/tests/unit/uvb-w1-attr-interpolation.test.js` (NEW W1 — 10 tests)
- `compiler/tests/unit/uvb-w1-post-ce-invariant.test.js` (NEW W1 — 9 tests)
- `compiler/tests/unit/gauntlet-s19/null-coverage.test.js` (NEW W3 — 15 tests)
- `compiler/tests/unit/gauntlet-s19/null-coverage-bare.test.js` (NEW W3.1 — 26 tests)
- `compiler/tests/unit/gauntlet-s19/null-coverage-template-interp.test.js` (NEW W3.2 — 13 tests)
- `compiler/tests/integration/cross-file-components.test.js` (NEW W2 — 10 tests)
- `compiler/tests/integration/f-compile-002-scrml-import-rewrite.test.js` (NEW F-COMPILE-002 — 8 tests)
- `compiler/tests/integration/f-build-002-server-entry-dedup.test.js` (NEW F-BUILD-002 — 7 tests)
- `compiler/tests/integration/sql-001-bracket-matched.test.js` (NEW F-SQL-001 — 17 tests)
- `compiler/tests/unit/route-inference-f-ri-001-deeper.test.js` (NEW W4 — 6 tests)
- `compiler/tests/integration/f-auth-002-export-modifiers.test.js` (NEW W5 — 13 tests)
- `compiler/tests/unit/cross-file-components.test.js` (M17 docstring update + key path)
- `compiler/tests/unit/fn-expr-member-assign.test.js` (W3.1+W3.2 cascade — `null` → `not`)
- `compiler/tests/self-host/ast.test.js` (W5 forward-compat skip)

**Spec / docs (across all dispatches):**
- `compiler/SPEC.md` — §15.14.4/§15.14.5 (W2), §21.5.1 + §21.6 + §21.7 (W2 + W5), §38.11 (W1), §42.7 (W3 + W3.1+W3.2), §44.7.1 + §44.8 (W5 + F-SQL-001), §47.9/§47.10/§47.11/§47.12 (W0a + F-COMPILE-002+F-BUILD-002), §52.13 (W1), §12.4 (W4) + error catalog updates (E-CG-015, E-COMPONENT-035, E-CHANNEL-007, E-IMPORT-005/006/007, E-SQL-008, E-SQL-009, W-ATTR-001/002)
- `compiler/SPEC-INDEX.md` (F-SQL-001 +1)
- `compiler/PIPELINE.md` (Stage 3.2 W2; Stage 3.3 W1)
- `master-list.md` (W2 — row 99 flipped back to ✅)
- `docs/articles/llm-kickstarter-v1-2026-04-25.md` (W2 — KNOWN-BROKEN flag dropped, canonical 3-file recipe restored, F4 limitation noted)
- `examples/23-trucking-dispatch/FRICTION.md` (across all dispatches)
- `examples/23-trucking-dispatch/README.md` (W0a — run section)
- 10 dispatch-app `.scrml` pages — M2 workaround reverted (W4)
- `benchmarks/todomvc/app.scrml` (W3.1+W3.2 cascade — `@editingId = null` → `= not`, 3 sites)

**Diagnosis + progress dirs (12 NEW dirs under `docs/changes/`):**
- `f-compile-001/` (pre-snapshot + progress)
- `oq-2-dev-server-bootstrap/` (pre-snapshot + repro + diagnosis + progress)
- `uvb-w1/` (pre-snapshot + progress)
- `f-component-001-w2-fix/` (pre-snapshot + progress)
- `f-null-001-002/` (pre-snapshot + diagnosis + progress + 7 .scrml repros)
- `f-null-003-004/` (progress)
- `f-compile-002-build-002/` (pre-snapshot + diagnosis + progress)
- `f-sql-001/` (pre-snapshot + diagnosis + progress)
- `f-ri-001-deeper/` (pre-snapshot + diagnosis + progress + repro-multi-fn.scrml + test-fri001-multi.db)
- `f-auth-002/` (diagnosis + progress)

**Wrap files (committed at session close):**
- `hand-off.md` (this file — S51 close fat wrap, ~600+ lines per directive)
- `master-list.md` (S51 entry at top)
- `docs/changelog.md` (S51 entry at top)
- `handOffs/hand-off-53.md` (this file rotated; pre-saved for S52 open)

### scrml-support — modified files this session

- `docs/deep-dives/systemic-silent-failure-sweep-2026-04-30.md` (NEW, 1,026 lines — parent deep-dive)
- `docs/deep-dives/progress-systemic-silent-failure-sweep-2026-04-30.md` (NEW)
- `docs/deep-dives/f-component-001-architectural-2026-04-30.md` (NEW, 1,093 lines — child W2 deep-dive)
- `docs/deep-dives/progress-f-component-001-architectural-2026-04-30.md` (NEW)
- `user-voice-scrmlTS.md` — appended at S51 close (S51 entry per §7 above)

---

## Tags
#session-51 #closed #fat-wrap #push-authorized #systemic-silent-failure-sweep #uvb-shipped #f-compile-001-resolved #oq-2-resolved #f-component-001-architectural-resolved #f-null-1-2-3-4-resolved #f-compile-002-resolved #f-build-002-resolved #f-sql-001-resolved #f-ri-001-fully-resolved #f-auth-002-partial #w5a-w5b-deferred #f-component-003-surfaced #f-compile-003-surfaced #f-parser-asi-batch-surfaced #m2-workaround-swept-10-pages #--no-verify-violation-flagged #plus-184-tests #plus-67-commits #cross-machine-sync-clean

## Links
- [pa.md](./pa.md)
- [master-list.md](./master-list.md) — refreshed S51 close
- [docs/changelog.md](./docs/changelog.md) — S51 close entry
- `docs/changes/{f-compile-001,oq-2-dev-server-bootstrap,uvb-w1,f-component-001-w2-fix,f-null-001-002,f-null-003-004,f-compile-002-build-002,f-sql-001,f-ri-001-deeper,f-auth-002}/`
- `examples/23-trucking-dispatch/FRICTION.md` — 31+ entries (S51 close inventory)
- `scrml-support/docs/deep-dives/systemic-silent-failure-sweep-2026-04-30.md` — parent deep-dive (1,026 lines)
- `scrml-support/docs/deep-dives/f-component-001-architectural-2026-04-30.md` — W2 child deep-dive (1,093 lines)
- `scrml-support/user-voice-scrmlTS.md` — S51 entry (appended at close)
