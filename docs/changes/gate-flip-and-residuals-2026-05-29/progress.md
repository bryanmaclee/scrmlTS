# gate-flip + 3 residuals — progress

change-id: gate-flip-and-residuals-2026-05-29
WORKTREE: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a8fa8470677d2481c
baseline HEAD: d34f3b935c3f6256c59eeee241986fc390255893
predecessor: gate-found-fix-wave-tail-and-flip (ada56bb6 + rebump 5be0a502) → 3 residuals remain

## Step log (append-only, timestamped)

### 2026-05-29 — Startup
- pwd verified worktree-rooted (.claude/worktrees/agent-a8fa8470677d2481c); toplevel matches; HEAD d34f3b93; tree clean.
- merge main: Already up to date.
- bun install OK (204 pkgs); bun run pretest populated dist (13 samples).
- Read maps: primary, structure (validate-emit wiring api.js:1919, gate default api.js:~641), error (E-CODEGEN-INVALID-JS validate-emit.ts:94), dependencies.
- Read predecessor progress.md — 3 residuals confirmed: (1) meta-checker byte 10606 multi-line ternary in const-init; (2) module-resolver byte 4328 escaped-backtick template + not-in-string; (3) nested !{} structural (R25-Bug-49 §5).

### NEXT: Phase 1 — reproduce FULL-suite forced-gate-ON failure set.

### 2026-05-29 — Baseline (default-OFF)
- `bun run test` (default-OFF): 22132 pass / 0 fail / 219 skip / 1 todo. Matches brief's 22,132 baseline.
- (First run showed transient 2-fail in promote/scan /tmp tests; re-run clean — flaky tmp-dir race, not real.)
- Gate-force mechanism for Phase 1: temporarily set api.js validateEmit default false→true, run FULL `bun run test`, enumerate every E-CODEGEN-INVALID-JS, then restore.

### 2026-05-29 — Phase 1 ENUMERATION (FULL `bun run test`, gate FORCED ON)
Result: 22129 pass / 3 fail / 219 skip. EXACTLY the 3 hypothesized residuals — NO extras across browser/self-host/commands/within-node subsets.

1. (fail) self-host: meta-checker.scrml compilation > compiles without errors
   artifact: meta-checker.client.js (byte 10606, line 329, col 3) "Unexpected token"
   snippet: `...sArray ( type . variants ) ?; type.variants.map((v) =>...`
   → multi-line ternary in const-init broken: `?` terminated with `;` (collectExpr BS-ASI-newline boundary fires before `?`).

2. (fail) self-host: module-resolver.scrml compilation > compiles without errors [A2-SURFACED — fixed by A1]
   artifact: module-resolver.client.js (byte 4328, line 154, col 28) "Unexpected token"
   snippet: ``..., `E-IMPORT-004: \` ${name} ` is !exported by \` ${imp.sourc...``
   → escaped-backtick template mangled + `not`→`!` rewrite fired INSIDE template string content (`is not exported` → `is !exported`).

3. (fail) R25-Bug-49 §5: nested handler — `!{...}` inside an arm body > nested `!{...}` composition — outer + inner arms both emit
   → direct validateEmittedArtifact assertion on nested `!{}` (structural; STOP-latitude per brief).

NEXT: restore default to false; fix residual 1 (meta-checker multi-line ternary) FIRST.

### 2026-05-29 — Residual 1 ROOT CAUSE (precise)
NOT "multi-line ternary" per se. ROOT: collectExpr STMT_KEYWORD statement-boundary break (ast-builder.js:2623) fires when a KEYWORD used as an IDENTIFIER appears mid-expression after a trailing operator.
Repro minimized: `const type = reg.get("x")` then `const variants = Array.isArray(type.variants) ? type.variants.map(...) : []`.
- The 2nd `type` (in `type.variants.map`, right after the ternary `?`) is a STMT_KEYWORD (`type` ∈ STMT_KEYWORDS).
- collectExpr line 2623: `parts.length>0 && angleDepth===0 && tok.kind==="KEYWORD" && STMT_KEYWORDS.has(tok.text) && lastPart !== "." → break`.
- lastPart is `?` (the ternary operator), NOT `.`, so the guard breaks → init truncated to `Array . isArray ( type . variants ) ?`.
- Renaming `type`→`typ` (non-keyword) → full ternary captured, valid JS. CONFIRMED via runTAB decl dump.
FIX: the STMT_KEYWORD boundary (and ASI-NEWLINE) must NOT fire when lastPart is a trailing operator expecting an operand (`?`, `:`, binary/logical/arithmetic ops, `=`, `=>`, `,`, etc.) — the expression continues; the keyword is being used as an identifier. Extend the `lastPart !== "."` guard to a broader CONTINUATION-OPERATOR set.

### 2026-05-29 — Residual 1 FIXED (ast-builder.js STMT_KEYWORD guard)
Generalized the collectExpr STMT_KEYWORD boundary (line ~2623): in RHS context (prev part is a value-expecting operator from _RHS_CTX), a STMT_KEYWORD followed by `.`/`(`/`[`/`?.` is an IDENTIFIER operand, not a statement opener → do NOT break. Expression-opener keywords (if/match/for/partial/function/fn/switch/when/given) NOT exempted (their handlers fire pre-collectExpr).
- meta-checker.scrml: 0 E-CODEGEN-INVALID-JS under gate-ON (was byte 10606).
- Regression test: compiler/tests/integration/keyword-as-identifier-ternary-no-invalid-js.test.js (3 cases) — PASS.
- Pre-commit subset (unit+integration+conformance): 15139 pass / 0 fail. self-host 142 pass / 0 fail.
NEXT: residual 2 (module-resolver escaped-backtick template + not-in-string).

### 2026-05-29 — Residual 2 ROOT CAUSE + FIX (tokenizer.ts readBacktickString)
ROOT: tokenizer.ts readBacktickString() lacked backslash-escape handling (readString() has it). An escaped backtick `\`` inside a template was read as a CLOSING backtick → template truncated mid-string.
Repro: `const msg = \`E-IMPORT-004: \\\`${name}\\\` is not exported by \\\`${source}\\\`\`` → `const msg = \`E-IMPORT-004: \\\`;` (invalid JS). The `is not`→`is !` rewrite then operated on broken fragments (downstream symptom).
FIX: readBacktickString copies `\<char>` verbatim + advances 2, mirroring readString. Single STRING token → escaped backticks preserved, template balanced, `not`-rewrite (source-token-level) never sees string content as a bare token.
Verified: `is not` preserved in templates AND plain strings; module-resolver.scrml 0 E-CODEGEN-INVALID-JS under gate-ON.
Note: sub-issue (b) "not-rewrite inside template content" needed NO separate fix — it resolved transitively (the rewrite was operating on the TRUNCATED fragments, not real string content).
- Regression test: compiler/tests/integration/escaped-backtick-template-no-invalid-js.test.js (3 cases) — PASS.
- Pre-commit subset: 15142 pass / 0 fail. self-host 142 pass / 0 fail (no SQL/template regressions).
NEXT: residual 3 (nested !{}); within-node parity canary check.

### 2026-05-29 — Phase 2.5 within-node parity canary
`bun test compiler/tests/parser-conformance-within-node.test.js`: 1005 pass / 0 fail. PARSE-FAILURE files: 0.
NO over-budget (positive-residual) fixtures from residuals 1+2. No allowlist rebump needed (unlike predecessor ada56bb6's 12-fixture trip).
Reason: residual-1 fix is a NARROW collectExpr guard (keyword-as-identifier in RHS ctx) that only changes parse for the specific `const type`/keyword-as-operand shape — not present in the within-node corpus at the granularity that shifts node counts. Residual-2 fix only affects escaped-backtick templates (rare). Native parser already handles both correctly, so LIVE moving to correct-parse converges TOWARD native (reduces divergence), not away.
NEXT: residual 3 (nested !{}).

### 2026-05-29 — Residual 3 FIXED (emit-logic.ts emitArmBody nested-!{} re-parse)
ROOT (structural, as predecessor diagnosed): the OUTER `!{}` arm HANDLER is a flat token-joined STRING (parseErrorTokens); a nested `EXPR !{ ARMS }` inside it never became a child guarded-expr node → reached rewriteBlockBody (zero `!{}` handling) → inner `!{ }` wrapper leaked verbatim (invalid JS).
ATTEMPTED option (a) parser-level retention: blocked — re-tokenizing the handler string requires BS-level child-block splitting (tokenizeLogic needs `children` from BS); the nested `!{}` is flattened before parseErrorTokens sees it.
IMPLEMENTED option (b) codegen re-parse (CONTAINED): emitArmBody detects a top-level `!{` (string-literal + brace-depth aware via _handlerHasTopLevelGuardedExpr) and re-runs the arm body through runBlockSplitter + buildAST (wrapped in `${...}`), then emits via emitLogicBody (recursive guarded-expr lowering). Falls back to rewriteBlockBody on any re-parse failure (no crash).
- Gate only fires when a nested `!{` is actually present → minimal regression surface.
- Verified: §5 nested case lowers to proper nested `if (_result.variant === "Y") {...}` chain; client.js PARSES OK; both `_scrml_reactive_set("inner","y")` + `("outer","x")` present; NO leaked `!{`.
- Regression test: compiler/tests/integration/nested-error-handler-no-invalid-js.test.js (gate-ON) — PASS.
- error-handler suites (R25-Bug-49 + arm-body + terminator): 51 pass / 0 fail.
- Pre-commit subset: 15142 pass (+1 new test) / 0 fail. within-node canary: 1005 / 0.
NET: all 3 residuals CLOSED. NEXT: full forced-gate-ON suite, then FLIP.

### 2026-05-29 — Phase-1 RE-VERIFY (full forced-gate-ON) → 2 CASCADE residuals + 1 canary
Re-running full forced-gate-ON after residuals 1+2+3: 3 fail (different from initial). residual 3 GREEN. NEW cascade sites revealed (the gate now reaches FURTHER):
- meta-checker.client.js byte 20457 + module-resolver.client.js byte 5171: `await await import(...)` inside `^{}` meta block. TWO bugs:
  - BUG A (double-await): ESTree ImportExpression had no explicit esTreeToExprNode case → `default` escape-hatch used PARENT rawSource (incl. the `await`); outer unary-await re-prefixed → `await await import(...)`. FIX: explicit ImportExpression case slices only `import(<spec>)` via emitStringFromTree(source).
  - BUG B (await outside async): `^{}` lowers to `_scrml_meta_effect(id, function(meta){...})`; bare wrapper + body `await` = SyntaxError. FIX: emit `async function(meta)` when meta body has a top-level `await`.
- dual-pipeline-canary cg.scrml: the residual-1 STMT_KEYWORD fix ELIMINATED the documented LIVE dynamic-import-as-module-import PHANTOM (liveHoist.imports 5→0, now matches native 0). cg.scrml had 0 static `import {` + 5 `const X = await import(...)`; the canary's own comment documents LIVE phantom-counts dynamic imports as decls ("WILL GO AWAY at M6"). My fix closed it EARLY → class LIVE-HOIST-MISCLASSIFY → EXACT. Confirmed caused by residual-1 alone (stashed expr-parser+emit-logic, still EXACT). UPDATED test to assert EXACT (bs.scrml §844 precedent). BENIGN convergence (LIVE→native), NOT a regression.
- Regression test: compiler/tests/integration/await-import-meta-no-invalid-js.test.js (2 cases) — PASS.
- Pre-commit subset: 15145 pass / 0 fail. within-node canary: 1005 / 0.
- meta-checker + module-resolver: 0 E-CODEGEN-INVALID-JS under gate-ON (write:true verified).
NEXT: full forced-gate-ON re-verify (all clean?), then FLIP.

### 2026-05-29 — FULL forced-gate-ON RE-VERIFY: GREEN
`bun run test` with gate forced ON: 22141 pass / 0 fail / 0 E-CODEGEN-INVALID-JS. ENTIRE surface closed (vs initial 22132 baseline +9 = new regression tests). Gate-flip condition MET.
Residual disposition: residuals 1,2,3 CLOSED + 2 cascade (double-await, async-meta-wrapper) CLOSED + 1 canary (cg.scrml phantom) RESOLVED→test-updated. NO STOP-blocked items. NONE intractable.
NEXT: Phase 3 — restore temp marker, then REAL flip (api.js default false→true + comment block + SPEC §2.2.1).

### 2026-05-29 — Phase 3 FLIP DONE
- api.js: validateEmit default false→true + comment block rewritten to DEFAULT ON narrative (residuals 1/2/3 + 2 cascade closed; --no-validate-emit operational escape preserved).
- SPEC §2.2.1: tightened enforcement paragraph to state the gate is "active by default" (S142); --no-validate-emit opt-out note unchanged. PA-DECISION: accurate (default IS on, suite green) — not overclaiming.
- FULL `bun run test` with REAL default-ON: 22141 pass / 0 fail / 0 E-CODEGEN-INVALID-JS. GREEN.
- validate-emit-gate.test.js unaffected (explicit validateEmit:true/false args, default-independent).
NEXT: R26 empirical re-compile table; commit flip.

### 2026-05-29 — R26 empirical re-verification (gate ON via --validate-emit)
| source | gate exit | gate-fires | node --check |
|---|---|---|---|
| stdlib/compiler/meta-checker.scrml | 0 | 0 | client.js + runtime CLEAN |
| stdlib/compiler/module-resolver.scrml | 0 | 0 | client.js + runtime CLEAN |
| examples/23-trucking-dispatch (36 src) | 0 | 0 | 68/68 CLEAN |
| R27 dev-1-react | 0 | 0 | 4/4 CLEAN |
| R27 dev-2-go | 0 | 0 | 4/4 CLEAN |
| R27 dev-4-svelte | 0 | 0 | 4/4 CLEAN |
| R27 dev-5-pascal | 0 | 0 | 4/4 CLEAN |
| R27 dev-3-elixir | 1 — PRE-EXISTING E-PA-002 (NOT a gate fire; gate-fires=0) | 0 | 4/4 partial-output CLEAN |
R26 PASS. All real adopter + self-host sources compile clean under the default-ON gate; the only non-zero exit is dev-3's pre-existing E-PA-002 (identical with gate off), not a gate fire.
