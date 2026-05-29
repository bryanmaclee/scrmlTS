# progress — gate-emitted-js-parse-invariant-2026-05-29

Ratified A+D (S141). Source: scrml-support/docs/deep-dives/emitted-js-parse-gate-invariant-2026-05-29.md

## 2026-05-29
- Startup verified: worktree CWD ok, base a4f79b2d, tree clean, bun install + pretest done.
- Read deep-dive (design source), primary.map.md, meta-eval reparseEmitted precedent, api.js write loop, codegen/index.ts error threading, emit-control-flow.ts:1603 stub site, emit-logic.ts emitMatchExprDecl, emit-expr.ts emitMatchExpr bridge, errors.ts CGError, SPEC §34/§2.2/§2.4.
- Findings:
  - D-site: emit-control-flow.ts:1603 `arms.length===0` emits `/* match expression could not be compiled */ <expr>;` — the canonical invalid-JS stub. emit-expr.ts bridge routes here too (no opts). emit-logic.ts emitMatchExprDecl arms.length===0 produces VALID JS (no stub) — not a D-site.
  - Error threading: opts.errors (EmitLogicOpts) and ctx.errors (EmitExprContext) both reach CompileContext.errors → cgResult.errors → fails compile. Solid.
  - A insertion seam: api.js write loop (post-rewrite, in-memory artifact strings). meta-eval reparseEmitted is the precedent.
- Next: build A (acorn byte-parse gate fn + wire into api.js), then D (convert stub site), then SPEC, then perf measurement, then full suite.

## 2026-05-29 — CRITICAL EMPIRICAL FINDING (blast-radius)
- Built acorn probe. Sample compilation-tests dist (13 client artifacts): ALL parse clean under BOTH module+script. No false positives there.
- Compiled the §2.4 reference app (examples/23-trucking-dispatch, 8433 lines / 36 files) → 36 client + 27 server + 1 runtime. Wall: ~1142ms (CLI, includes startup).
- **The reference app emits 12 INVALID-JS artifacts TODAY (compile exit-0).** These are TRUE positives, not false positives:
  - `seeds.server.js` — `server {` block leaks unlowered into output (boundary bug).
  - `board.client.js` — `load . (weight_lbs !== null && weight_lbs !== undefined)` — member-access lowering bug for `is some` on a member chain inside `if=`.
  - `billing/drivers/loads/home/...` client.js — `x!==))` : compound `if=(m.field is some && m.field != "")` lowers `!= ""` to a truncated `!==` with NO RHS. ~11 files.
- Full examples/ corpus as one unit: 16 invalid artifacts.
- Baseline trucking-dispatch-smoke test: 13/13 PASS today, asserting result.errors fatal==[] — i.e. it ships these 12 invalid artifacts GREEN.
- CONSEQUENCE: turning gate A **always-on** would flip trucking-dispatch-smoke (and likely sibling example-compile tests) RED — NOT as false positives but as TRUE positives on PRE-EXISTING out-of-scope bugs (the deep-dive scoped C1/C2/C5/C8 + sibling codegen bug fixes as a SEPARATE fix-wave).
- DECISION (Rule 3 — right answer, surface to PA): ship the gate as a flag-gated capability (`validateEmit` compile option / `--validate-emit` CLI flag), default OFF in test+prod paths so the suite stays green, fully wired as an invariant when enabled. D (codegen hard error) lands unconditionally (it only fires on the genuinely-unlowerable arms.length===0 path — does NOT fire on the 12 above). Surface the 12 pre-existing invalid-JS bugs to PA as a deferred fix-wave (this is the "B vs always-on" axis resolved by a SECOND blocker the deep-dive's perf-only framing didn't anticipate).

## 2026-05-29 — build progress
- A backstop: compiler/src/codegen/validate-emit.ts (validateEmittedArtifact / validateEmittedArtifacts), wired into api.js as a pre-write gate behind validateEmit option (default OFF). emitGateFailed guards runtime + per-file + chunk writes. Committed 95411852.
- A tests: unit (validate-emit.test.js, 8) + integration (validate-emit-gate.test.js, 3 — self-adjusting vs fix-wave). Committed 9c93e005.
- D: emit-control-flow.ts arms.length===0 stub → hard E-CG-003 (named source construct) + valid-JS `(undefined)` placeholder. emit-expr.ts bridge forwards ctx.errors. emit-match.test.js "no arms fallback" block rewritten (asserted old invalid stub → now asserts valid placeholder + E-CG-003). Committing.
- Perf measured: ~24ms median to parse all 64 trucking-dispatch artifacts (837KB, 8433-line app) in-process. << SPEC §2.4 1s budget. Always-on fits on perf; blocked only by the 12-16 pre-existing invalid-JS artifacts (out-of-scope fix-wave).
- Next: SPEC §34 row + §2.2.1 invariant; full suite; report.

## 2026-05-29 — SPEC + decision
- SPEC §2.2.1 (Emitted-JS Parse Invariant) + §34 E-CODEGEN-INVALID-JS row committed (6e8070bd).
- D committed eaf049f7. A committed 95411852 + tests 9c93e005.

### §2.4 PERF MEASUREMENT (with/without delta)
- Reference project: examples/23-trucking-dispatch (8433 lines / 36 files — the deep-dive's named §2.4 reference; >2x the 4000-line target, so a conservative worst-case).
- A-gate in-process acorn parse of ALL 64 emitted artifacts (837,585 bytes): median 24.32ms (min 20.00, max 32.31) over 20 runs.
- Full CLI compile of the app (incl. startup): ~1142ms; the gate adds ~24ms = ~2.1% of compile wall-time on a 2x-oversized app. On a true 4000-line app the gate cost extrapolates to ~11-12ms.
- §2.4 budget = "4000 lines < 1s". The gate fits with ENORMOUS margin (~1-2% of budget).

### ALWAYS-ON (A) vs DEV/CI-ONLY (B) DECISION
- PERF axis (the deep-dive's stated open axis): says ALWAYS-ON — gate fits §2.4 trivially.
- SECOND BLOCKER (not anticipated by the perf-only framing): the §2.4 reference app + examples corpus emit 12-16 GENUINELY-INVALID-JS artifacts TODAY (pre-existing codegen miscompiles: compound `if=(m.f is some && m.f != "")` truncates `!= ""` → `!==` with no RHS; a `server {` block leaks unlowered into seeds.server.js). These are TRUE positives. Fixing them is a SEPARATE codegen fix-wave (the deep-dive explicitly scoped C1/C2/C5/C8 + sibling fixes OUT of the gate build). Turning the gate always-on NOW would flip the green trucking-dispatch-smoke test (and sibling example compiles) RED on pre-existing out-of-scope bugs.
- DECISION: ship FLAG-GATED (validateEmit option / future --validate-emit CLI flag), default OFF, fully wired as a hard invariant when enabled. The intended END STATE is always-on, gated on the pre-existing invalid-JS fix-wave landing. This is Rule-3-correct: deliver A+D as ratified, keep the suite green, and surface the 12-16 pre-existing bugs as the blocking backlog rather than silently breaking the suite or silently swallowing the bugs.
- SURFACED TO PA: 12 invalid-JS artifacts in examples/23-trucking-dispatch (board/billing/drivers/loads/home/load-detail client.js + seeds.server.js) + ~4 more across other examples. Flip validateEmit:true default once that fix-wave closes them.

### CLI flag (not wired this dispatch)
- The validateEmit option is the programmatic surface. A --validate-emit CLI flag in cli.js/commands/compile.js is the natural adopter surface but is deferred: the option is OFF by default and the gate's value today is the in-tree invariant + the test harness; wiring a user-facing flag before the pre-existing bugs are fixed would expose adopters to a flag that fails their own compiles on compiler bugs. Surface for PA.
