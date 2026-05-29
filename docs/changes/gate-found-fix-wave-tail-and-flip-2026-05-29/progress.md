# gate-found fix-wave TAIL + gate flip — progress

change-id: gate-found-fix-wave-tail-and-flip-2026-05-29
WORKTREE: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-af4740ca5885aa5ba
baseline HEAD: 942d62e7 (merged main; maps-only vs 9ab7aa38 watermark)

## Step log (append-only, timestamped)

### 2026-05-29 — Startup
- pwd verified worktree-rooted; toplevel matches; tree clean.
- merged main (fast-forward 9ab7aa38..942d62e7, maps only).
- bun install OK (204 pkgs); pretest/compile-test-samples populated dist (13 samples).
- Read maps: primary, structure (validate-emit wiring), error (E-CODEGEN-INVALID-JS, E-CG-003).
- Read validate-emit.ts, api.js gate wiring (line 635 default false, line 1919 gate block), test files.
- Gate-force mechanism confirmed: pass `validateEmit: true` to compileScrml.

### NEXT: Phase 1 — reproduce forced-gate-ON failure surface at baseline.

### 2026-05-29 — Phase 1 ENUMERATION (gate forced on, examples corpus)
Single-file examples 01-27: ALL CLEAN (0 invalid).
trucking-dispatch: 12 invalid artifacts (C10 cluster + C11). multifile: clean.
The "8 hypothesis" was the predecessor's TEST subset; the example-corpus surface is the C10/C11 cluster (12). C10/C11 are LIVE at baseline (predecessor's "closed" belief WRONG).

Root-cause analysis (C10):
- TWO distinct defects under the C10 umbrella, both in the for-lift/`lift <markup>` `if=(...)` path:
  - C10a (DOMINANT, 11 artifacts): lift markup attr-value reassembly in ast-builder.js `_parseLiftAttrValue` pushes STRING token `.text` (quotes stripped by tokenizer readString) raw → `if=(x != "")` → `(x !=)` dangling `!=` (invalid JS); `if=(x == "active")` → `(x == active)` bare ident (runtime ReferenceError, syntactically valid so gate doesn't catch it but it's a correctness bug too).
  - C10b (1 artifact, board.scrml): `load . weight_lbs is some` (space-padded dot, exprNode=NULL → regex fallback in codegen/rewrite.ts) → `load . (weight_lbs !== null && weight_lbs !== undefined)` (malformed).

### 2026-05-29 — FIX C10a (ast-builder.js `_pushAttrToken`)
Added `_pushAttrToken` helper in `_parseLiftAttrValue`: re-quotes STRING tokens via `reemitJsStringLiteral` (+ backtick template re-wrap), mirroring the collectExpr top-level re-quote pattern. Applied at all 3 `parts.push(ct.text)` sites.
Result: trucking-dispatch invalid 12 → 2 (board C10b + seeds C11 remain). Reproducers PARSE OK + correct lowering. NEXT: C10b + C11.

### 2026-05-29 — FIX C10b (codegen/rewrite.ts DOTTED_LHS whitespace tolerance)
`_rewriteNotSegment` is/is-not/is-not-not LHS capture char class `[A-Za-z0-9_$.]*` stopped at BS-space-padded dots, capturing only the trailing property and stranding `load .` outside parens. Replaced the 3 regexes with a shared DOTTED_LHS pattern admitting `\s*.\s*` member tails (mirrors R24-BUG-35 S137 variant-suffix `\s*` tolerance).
Result: trucking-dispatch invalid 2 → 1 (only C11 seeds.server.js remains). NEXT: C11.

### 2026-05-29 — FIX C11 (seeds.scrml example migration to canonical `server function`)
C11 is NOT a codegen lowering bug — `server { ... }` as a STATEMENT block inside a regular function body is NOT a spec-canonical construct (SPEC has no `server {` block-statement form; grep confirms zero hits). The example author used a speculative shape; the compiler leaked it verbatim. Per Rule 4 (SPEC normative) + corpus-ouroboros (corpus is artifact not intent), the right fix is to migrate the example to the canonical `export server function runSeeds()` form (SPEC §12.5; `server fn|server function` is in BARE_DECL_RE). Removed the `server {` wrapper + its closing brace; updated decl. Verified: canonical form compiles 0 errors, server.js parses, no `server {` leak.
Result: trucking-dispatch + full examples corpus forced-gate-ON = 0 invalid artifacts. trucking-dispatch gate-ON compile = 0 errors.

NOTE: the self-adjusting validate-emit-gate.test.js asserted `fires[0].message` contains ".client.js" — true only while a client.js was the first invalid artifact. With the corpus now clean (invalidCount=0) the test takes its `else` branch (no false positives). The transient red between C10a/b (client cases fixed) and C11 (only server case left) is why C10b+C11 commit together.

### 2026-05-29 — C11 CORRECTION (Insight 26: `server` keyword is deprecated)
First migrated to `export server function` but that fired W-DEPRECATED-SERVER-MODIFIER — per Insight 26, the explicit `server` keyword is deprecated; body-content inference (a `?{}` is a server-only resource = Trigger T1) auto-escalates a plain `export function runSeeds()` to server. Corrected to plain `export function` (no `server` keyword) — matches the ORIGINAL decl, only the `server {` block wrapper removed.
Coupled test update: trucking-dispatch-smoke-integration.test.js EXPECTED_BASELINE — E-ROUTE-001 1→0 (the RI computed-member warning on the malformed `server {` bare-expr stub; stub gone = trigger gone). The two W-CG-CHUNK-* warnings UNAFFECTED (empty seeds route chunk under emitPerRoute, not the stub). Smoke test 13/0 pass.

### 2026-05-29 — FIX surface 8 (return-in-arm-body at top-level) + variant named-arg construction
Surface 8 (tilde Gap 5 / transition Lifecycle): a `return X` written in a `!{}` arm BODY at top-level `${...}` leaked verbatim (`return "missing"` outside fn). FIX emit-logic.ts emitArmAssign: added rewriteTopLevelReturn — at top-level a terminal `return X` rewrites to `resultVar = X` (the arm value becomes the guarded result); inside a fn it stays `return` (canonical early-return-on-error). Applied to both the multi-line and terminator-stmt paths.
Variant named-arg construction (root of the transition Lifecycle server.js fire): `.Published(body: "x", publishedAt: 0)` (§18.7 named-field construction) lowered to `data: { body: body : "x", ... }` (field name double-applied). FIX rewrite.ts _rewritePayloadVariantConstructorCalls + emit-expr.ts variant-construct branch (parity): detect `name: value` named args; emit verbatim instead of re-prefixing with positional fieldNames. Both repros PARSE OK; lifecycle test 9/0.

### 2026-05-29 — Bug 4.5 T3 — CLASSIFIED non-canonical-fixture (test migration, not codegen)
The brief flagged Bug 4.5 as "likely NOT invalid-JS; confirm." It DOES fire the gate, BUT the root cause is the TEST FIXTURE using a non-canonical brace compound form `<user> = { <name> = "alice" <age> = 30 }`. PRIMER §5 / SPEC §6.3: ad-hoc compound state uses STRUCTURAL-CHILDREN form (`<user> <name>=.. <age>=.. </>`). The brace form isn't a recognized compound shape — parsed as a plain cell with raw-markup init → `_scrml_reactive_set("user", { < name > = .. })` (invalid JS). Verified canonical structural-children form compiles 0 errors under gate-ON. FIX: migrate the T3 fixture to canonical form (NOT a codegen change). DEFERRED-SURFACE: whether the brace form should fire a hard diagnostic (silent-swallow class) is a separate design question — surfaced to PA, not fixed here. Residual gate-ON 5→4.

### 2026-05-29 — onTransition filter — non-canonical-body fixture (test migration)
filter-onTrans byte 1078: `<onTransition to=.Loading>hook body</onTransition>` body `hook body` is bare prose = two bare idents = invalid JS. §51.0.H / S111: the onTransition body is a code-default body; bare prose should be quoted display-text or a real effect. Verified `@log = "x"` effect body compiles 0 errors under gate-ON. FIX: migrate the fixture to a valid effect statement (`@transitionLog = "fired"`); test asserts the structural-element FILTER, not body text. DEFERRED-SURFACE: bare prose in onTransition body silently passes (no E-UNQUOTED-DISPLAY-TEXT) — diagnostic gap surfaced to PA, not fixed here. Residual gate-ON 4→3.

### 2026-05-29 — FIX self-host meta-checker (bare `let NAME`) + module-resolver (`?.` collapse)
Both stdlib/compiler/*.scrml (NOT compiler/self-host/ — those stay deferred). Genuine CODEGEN bugs, not fixtures.
- meta-checker byte 3852: `let m` (no `=`) + newline + `while` emitted `let m = while (...)`. ROOT: ast-builder.js `let` else-branch (no `=`) called collectExpr() with empty parts buffer, so its BUG-ASI-NEWLINE boundary heuristic (fires only once parts.length>0) didn't stop it consuming the following statement as init. FIX: a `let NAME` with no `=` is a bare decl — return `{ kind: "let-decl", init: "" }` directly, no collectExpr.
- module-resolver byte 1093: `file.ast?.filePath` BS-space-padded to `file . ast ? . filePath`, which fails to parse as exprNode (escape-hatch) → string-rewrite path leaves `? .` → acorn reads malformed ternary. FIX: preprocessForAcorn collapse `?\s*\.\s*(?=[a-z_$[(])` → `?.` (gated on non-uppercase following char so a ternary with bare-variant arms `cond ? .Active : .Idle` is PRESERVED). Verified optional `?.`/`?.[`/`?.()` collapse + both ternary shapes intact.
Both self-host stdlib files compile 0 errors under gate-ON; 104 self-host tests pass; unit+conformance 0 regressions. Residual gate-ON 3→1 (only nested !{} remains).

### 2026-05-29 — Phase 3 step 2: CLI flags --validate-emit / --no-validate-emit
Wired through compile.js + build.js + dev.js (each has its own parseArgs + compileScrml call — not shared). `undefined` = api default; `--validate-emit` forces on; `--no-validate-emit` opt-out. Help text added to all three. Verified end-to-end: clean+--validate-emit succeeds; invalid+--validate-emit aborts E-CODEGEN-INVALID-JS; invalid+--no-validate-emit bypasses (exit 0).

### 2026-05-29 — STOP-AND-SURFACE: nested !{} (R25-Bug-49 §5) blocks the default-ON flip
The ONE residual gate-ON surface. ROOT (structural, pre-existing): a `!{}` arm HANDLER is captured by the BS/ast-builder as a flat token-joined STRING (ast-builder.js ~L10906). A nested `EXPR !{ ARMS }` inside that handler is NOT re-parsed into a guarded-expr AST node — it reaches emitArmBody → rewriteBlockBody (emit-control-flow.ts) which has ZERO `!{}`/guarded-expr handling, so the inner `!{ | ::Y -> {...} }` leaks verbatim (the `!{` `}` structural wrapper survives → invalid JS). The inner arm BODY is partially rewritten (`@inner = "y"` → `_scrml_reactive_set`) which is why the pre-gate test passed (it checked substring presence, not parse-validity — false confidence the gate exposes).
A correct fix requires EITHER (a) parser-level retention of the nested error-effect block as a child guarded-expr node (parseRecursiveBody already builds these for the OUTER level), OR (b) re-parsing the handler string through parseLogicBody at codegen time (codegen→parser cross-boundary). Both are substantial changes to the error-handling parse/emit CORE with high regression risk; deferred per the brief's "STOP and surface as infrastructure-blocked" provision. Nested error-handling-in-error-handler is a rare shape.
CONSEQUENCE: validateEmit default stays OFF this dispatch (the brief's acceptance gate: "If the suite cannot go green with the gate on, STOP-and-report the residual surface — do NOT disable the gate to pass"). The flip is a ONE-LINE change (api.js:641 false→true) once nested-!{} is closed; CLI flags + the always-on doc + SPEC note all land now so the flip is trivial.

### 2026-05-29 — Phase 3 step 3: SPEC §2.2.1 note (--no-validate-emit operational escape)
Added a normative note to §2.2.1 documenting the `--no-validate-emit` opt-out as an OPERATIONAL escape (NOT a relaxation of the "SHALL NOT emit JS that fails to parse" invariant). Per the brief's PA-DECISION-FLAGGED guidance: kept the invariant wording verbatim; framed the flag as suppressing the gate's enforcement, not the requirement. Did NOT claim "active by default" — the default-ON flip is blocked by the nested-!{} residual, so claiming default-on would be spec-ahead-of-impl in the WRONG direction. The S141 §2.2.1 text already reads always-on (spec-ahead); this note adds the escape-hatch without overclaiming the current default.

### 2026-05-29 — R26 empirical re-verification (gate FORCED ON via --validate-emit)
| source | gate exit | node --check |
|---|---|---|
| examples/23-trucking-dispatch (36 src) | 0 | 67/67 clean |
| examples single-files (01-27) + 22-multifile | 0 (0 gate-fires) | 68/68 clean |
| R27 dev-1-react / dev-2-go / dev-4-svelte / dev-5-pascal | 0 | 20/20 clean (4 each) |
| R27 dev-3-elixir | 1 — PRE-EXISTING E-PA-002 (missing expenses.db); identical exit with gate OFF; NOT a gate fire | 4/4 partial-output clean |
ALL real adopter-facing sources compile clean under the gate. R26 PASS.

### 2026-05-29 — REVISED residual surface (gate-ON full subset = 3 fail, all self-host-infra OR structural)
Re-running the full unit+integration+conformance with the gate forced ON shows 3 residual failures (15133 pass / 3 fail / 88 skip — note pass count ROSE vs the 15124 mid-wave because the fixed surfaces re-greened):
1. self-host meta-checker.scrml — byte 10606: multi-line ternary in const-init `const x = Array.isArray(...)\n ? a \n : b` — collectExpr breaks mid-ternary → `... )\n?;\n a` (invalid). PRE-EXISTING (the let-m fix at byte 3852 closed; this is the NEXT site in the cascade).
2. self-host module-resolver.scrml — byte 4328: a backtick template literal with escaped backticks + `not` prose `\`...\` is not exported by \`...\`` → escaped-backtick mangles the template + `not` rewrite fires inside string content → invalid. PRE-EXISTING (the ?. fix at byte 1093 closed; NEXT cascade site).
3. R25-Bug-49 §5 nested !{} (structural; STOP-AND-SURFACED above).
These 3 are INTERNAL-COMPILER-INFRA (2 self-host stdlib files with a multi-bug cascade of distinct collectExpr / template-literal pre-existing latent codegen bugs) + 1 structural error-handling gap. NONE affect real adopter sources (R26 table all clean). They are the residual blocking the default-ON flip; each needs careful core-parser/codegen surgery (collectExpr state machine; template-literal escaped-backtick; error-effect-block structural retention) under stable infra — deferred per the brief's STOP-and-report provision.

### NET RESULT
- C10 (a+b) + C11: CLOSED — full examples corpus 12→0 invalid artifacts under the gate.
- Codegen classes CLOSED: !{} top-level return (surface 1+8), variant named-field construction, init-set/default-set thunk paren-wrap (match-arm), bare let-decl no-init, optional-chain space-collapse.
- Test-fixture migrations (non-canonical shapes): Bug 4.5 T3 brace-compound, onTransition bare-prose body.
- CLI flags --validate-emit / --no-validate-emit wired (compile/build/dev) + SPEC §2.2.1 operational-escape note.
- Gate default STAYS OFF (flip blocked by the 3 residual self-host-infra/structural surfaces).
