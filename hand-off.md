# scrmlTS — Session 4 Hand-Off (FINAL)

**Date:** 2026-04-11
**Next session rotation target:** `handOffs/hand-off-4.md`
**Tests (unit):** 2,298 (S3 final) → **4,902** (with `bun install` correcting an artificially-low pre-snapshot baseline; the ~2,600 delta is environment, not code)
**Tests (integration):** 57 (Phase 1.5 baseline) → **94 pass** after Slice 1 + Slice 2 work

---

## Session 4 in one paragraph

S4 was the session scrml's compiler architecture changed direction. Started with Lin Batch C Step 1 (a small TS-G wiring fix), which surfaced a structural gap (`checkLinear` walks node kinds the parser never emits), which surfaced the deeper root cause (scrml stores expressions as token strings, not structured ASTs), which the user — refusing to bandaid — escalated into committing to a multi-phase structured expression AST migration. Phases 0, 1, 1.5, 2-Slice-1, and 2-Slice-2 all landed or are ready. §35.2.1 lin function parameters now work end-to-end for the first time. Three parallel cleanup items (Ghost-lint #1, git-hooks versioning, SPEC-INDEX refresh) also shipped while audits ran in the background.

---

## Merged to main this session

| Commit | What |
|---|---|
| `503f5b9` | Merge Lin Batch C Step 1 — TS-G wiring fix (rewires `fileAST.nodes ?? fileAST.ast?.nodes` dual-shape fallback, removes dead `linNodes` field). 234 unit tests pass. |
| `8500cbd` | docs: S4 strategic pivot — Lin Batch C Step 2 parked, structural lin gap surfaced |
| `956b660` | docs(pa): cross-repo messaging dropbox convention (your prior-session uncommitted work) |
| `b30a8c1` | docs: commit to structured expression AST migration as multi-phase project |
| `1cfa6cc` | docs: S4 parallel cleanups — Ghost-lint #1 + git-hooks versioning + SPEC-INDEX refresh |
| `e43b7a2` | Merge Phase 1 + Phase 1.5 — structured expression AST, parallel fields with idempotency invariant |
| `8832b7d` | docs: README expansion (your work) |
| `cc85b38` | chore: bun.lock configVersion bump from `bun install` |
| `9151f1a` | Merge Phase 2 Slice 1 — `lin` keyword promoted to KEYWORDS, `lin-decl` emission in parser, codegen case for lin-decl |

**Net main delta this session: 9 merge/feature commits + 33 commits ahead of origin.**

---

## NOT merged — sitting on `changes/expr-ast-phase-2-slice-2`

**Phase 2 Slice 2 — `checkLinear` migrates to ExprNode walks for lin consumption.**

**Status:** 9 e2e scenarios pass (including §35.2.1 lin-params E2E for the first time ever), zero regressions, 4902 unit + 94 integration. **Self-classified CLEAR FOR MERGE by the agent.**

**Why I didn't merge it:** the implementation has a Pass 1 + Pass 2 walker. Pass 1 is the structured `ExprNode` walk we want; Pass 2 is a parser-assisted string fallback for two cases:
1. `bare-expr` emission sites in `ast-builder.js` (lines ~2009 and ~3962) that Phase 1 missed when populating parallel `exprNode` fields — these are real Phase 1 gaps.
2. `lin x = "hello"\nuse(x)` where `collectExpr` greedy-collects across the newline into one `lin-decl` node — Acorn's `parseExpression` then parses only the first expression and silently drops the rest. **This is the deeper deferred issue from the Phase 1.5 audit.** Pass 2 saves us by calling `parseStatements` (not `parseExpression`) on the raw string.

I dispatched a follow-up Opus 4.6 agent to delete Pass 2 and close the gap. It tried, regressed 3 e2e tests, and **correctly stopped and reported**: the regressions are the `collectExpr` over-collection, NOT a `forEachIdentInExprNode` bug. The fix needs `collectExpr` corrected first, in its own slice, with its own impact analysis.

**Conclusion:** Pass 1 + Pass 2 is a staging pattern, not a bandaid. It stays until Slice 3 fixes `collectExpr`, then Slice 4 deletes Pass 2 in one focused commit.

**Two ways to land Slice 2 next session:**
- **Option A** — merge the Slice 2 branch as-is. Pass 2 present, documented as temporary.
- **Option B** — extend Slice 2 with the two `ast-builder.js` `exprNode:` gap closures (lines 2009/3962, independently verified by the Opus follow-up agent to pass the Phase 1.5 idempotency invariant) and THEN merge. Better state, ~4 lines of additional code, no Pass 2 deletion (still pending Slice 3).

I lean Option B. The ast-builder edits are strictly improving and don't depend on the collectExpr fix.

---

## Headline wins this session

1. **Committed to structured expression AST migration.** No more string-scan hacks for semantic passes. The decision artifact: `scrml-support/docs/deep-dives/expression-ast-phase-0-design-2026-04-11.md` (2028 lines, 10 OQs all decided).
2. **Phase 1 + 1.5 merged.** ExprNode discriminated union, ESTree converter, idempotency invariant, parallel fields populated by parser. Zero regressions. 84 new unit tests, 13 new integration tests.
3. **Phase 2 Slice 1 merged.** `lin` is now a KEYWORD, parser emits `lin-decl` nodes, codegen emits `const x = ...` (was previously dropped silently). 13 new integration tests for lin-decl emission.
4. **§35.2.1 lin-params work end-to-end.** Slice 2's e2e test scenario 5 proves it. This was the original motivation for the entire migration — Batch B (S3) added the parser support but the body-reference path was broken; Slice 2's ExprNode walker closes the loop.
5. **Three parallel cleanups shipped:** Ghost-lint #1 (scrml-developer agent prompt + canonical anti-patterns briefing in scrml-support + pa.md dispatch rule), `scripts/git-hooks/` versioning (pre-commit + install.sh + README, fresh clones now bootstrap hooks with one command), SPEC-INDEX refresh (53 sections + 5 appendices re-lined for SPEC.md growth from 18,521 → 18,863 lines).

---

## Strategic decisions made this session

| Decision | Rationale | Source |
|---|---|---|
| Commit to structured expression AST migration (multi-phase) | "No bandaids" — string-scan workarounds are symptoms of one root cause | User S4 turn |
| Lin Batch C Step 2 (Option C hybrid) PARKED, not shipped | Same | User S4 |
| OQ-2: lin-decl emission in Phase 2 (not Phase 1) | Cleaner Phase 1 invariant — purely parallel fields, no shape change | User S4 |
| All other Phase 0 OQs accepted as design doc recommended | OQ-1, 3, 4, 5, 6, 7, 8, 9, 10 — see deep-dive | User S4 |
| **All agents now use Opus 4.6** (not Sonnet) | Accuracy > token cost on this multi-month migration. Saved as durable feedback memory + pa.md updated | User S4 (latest turn) |

---

## Strategic backlog from this session

### Phase 2 continuation (next session priorities)

1. **Land Slice 2** — Option B preferred (extend with ast-builder gap closures + merge).
2. **Slice 3 — fix `collectExpr` `lin-decl` boundary.** When parsing `lin IDENT = <rhs>`, respect newline-as-statement-boundary so `lin x = "hello"\nuse(x)` becomes two AST nodes, not one over-collected `lin-decl`. **T3 — needs impact analysis** because tightening collectExpr's stop conditions could ripple into other parser tests. Probably touches `let`/`const`/`tilde` paths symmetrically.
3. **Slice 4 — delete Pass 2 fallback.** Once Slice 3 lands, `forEachIdentInExprNode` alone covers every case. Delete `extractAllIdentifiersFromString`, `extractIdentifiersExcludingLambdaBodies`, and the Pass 2 block in `scanNodeExprNodesForLin`. ~30 LOC deletion, bounded.
4. **Phase 2 continued passes (per Phase 0 §5.3):** TildeTracker.scanExpression → ExprNode walk; protect-analyzer; extractReactiveDeps (`codegen/reactive-deps.ts`); dependency-graph; meta-checker; route-inference (deferred). Each one its own slice.

### Phase 3 (codegen migration — biggest phase, 4-6 sessions)

`rewriteExpr(string)` → `emitExpr(ExprNode)` across the ~14k LOC codegen directory. Deletes 18 client + 15 server rewrite passes from `rewrite.ts` (kill list in Phase 0 design doc §7). Per-emitter strategy, not per-expression-kind.

### Phase 4 / 5 (drop strings / self-host parity)

Phase 4: remove `init: string`/`expr: string`/etc. from AST shape after Phase 3. Phase 5: port `compiler/self-host/ast.scrml` (3,551 lines) to mirror the new shape.

### Inbox: 6nz wants a programmatic compiler API (NEW THIS SESSION)

Two messages from 6nz arrived in `handOffs/incoming/`:

1. **`2026-04-11-1900-6nz-to-scrmlTS-compiler-api-blocks-all-6nz-work.md`** — original ask: 6nz needs the scrmlTS compiler exposed as a programmatic API. Real implementation work is fully blocked on it. Five surfaces requested: programmatic parse, incremental compile, JS emission with source maps, diagnostics stream, embeddable.
2. **`2026-04-11-1915-6nz-to-scrmlTS-correction-local-server-not-pwa-compiler.md`** — correction: 6nz is local-server on Bun, not browser-PWA. The compiler is hosted as a callable library inside the 6nz Bun process, NOT browser-embedded. **This drastically simplifies the ask** — it's a Bun-process API, not a browser bundle.

**Status:** unread by PA decision-maker (you). Both flagged `needs: fyi`, not blocking. **Next session:** decide whether the compiler API is a P1 item that interleaves with Phase 2/3, or whether it waits until the structured expression AST migration completes (Phase 4 makes API stability much easier — would you really want to ship a programmatic API with `init: string` fields?). Move both files to `handOffs/incoming/read/` after disposition.

### Other carry-over (from S3 next-wave list)

- Mother-app 50/51 fails (R17) — bigger component/slot surface
- Skipped tests unblock — temp-file harness in `callback-props.test.js`
- E-SYNTAX-043 parser tightening
- `meta.*` runtime API
- DQ-12 Phase B (bare compound) — Phase 3 territory now (codegen rewrite)
- Bun segfault on full test run — investigate / file upstream / pin version

---

## Gotchas to remember

- **Bun v1.3.6 segfault:** full-scope `bun test` panics. Run subdirs individually. Open question.
- **Pipeline agents have git blocked sometimes** — PA commits manually from main. Worktree isolation is unreliable; sometimes agents write to main tree directly.
- **Phase 1 gap:** two `bare-expr` emission sites in `ast-builder.js` (lines ~2009 and ~3962) don't populate `exprNode`. Pass 2 of the Slice 2 walker covers them temporarily. Slice 3's collectExpr fix removes the deeper need; the gap closures are independently mergeable.
- **`collectExpr` over-collects across newlines for declaration RHS.** This is the deferred Phase 1.5 audit finding that became the Slice 2 blocker. Slice 3's primary target.
- **Pre-existing test failures (do not regress):** 3 unit (`if-as-expr` related), 2 integration (`self-host-smoke` — `tab.js exists`, `api.js exports compileScrml`). Baseline going into S5.

---

## Test baselines for S5

| Suite | Pass | Fail | Skip |
|---|---|---|---|
| `compiler/tests/unit` | 4,902 | 3 (pre-existing) | 2 |
| `compiler/tests/integration` | 94 | 2 (pre-existing self-host-smoke) | — |

If `changes/expr-ast-phase-2-slice-2` is merged at start of S5, integration count rises by 9 (the lin-enforcement-e2e scenarios) → 103.

---

## Tags
#session-4 #final #expr-ast-migration #phase-1 #phase-2 #lin-enforcement #structured-ast #ghost-lint #git-hooks #spec-index #strategic-pivot #6nz-inbox #opus-4-6

## Links
- [pa.md](./pa.md) — agent rules (now requires Opus 4.6 + Ghost-pattern briefing in gauntlet dispatches)
- [master-list.md](./master-list.md) — current inventory + structured expression AST migration entry under P5
- [handOffs/hand-off-3.md](./handOffs/hand-off-3.md) — S3 final
- [scrml-support/docs/deep-dives/lin-enforcement-ast-wiring-2026-04-11.md](../scrml-support/docs/deep-dives/lin-enforcement-ast-wiring-2026-04-11.md) — root-cause discovery
- [scrml-support/docs/deep-dives/expression-ast-phase-0-design-2026-04-11.md](../scrml-support/docs/deep-dives/expression-ast-phase-0-design-2026-04-11.md) — the migration design (2028 lines)
- [docs/changes/lin-batch-c-step1/anomaly-report.md](./docs/changes/lin-batch-c-step1/anomaly-report.md) — the anomaly that started the chain
- [docs/changes/expr-ast-phase-1/anomaly-report.md](./docs/changes/expr-ast-phase-1/anomaly-report.md) — Phase 1 land
- [docs/changes/expr-ast-phase-1-audit/anomaly-report.md](./docs/changes/expr-ast-phase-1-audit/anomaly-report.md) — Phase 1.5 idempotency fix
- [docs/changes/expr-ast-phase-2-slice-1/anomaly-report.md](./docs/changes/expr-ast-phase-2-slice-1/anomaly-report.md) — lin keyword + lin-decl emission
- [docs/changes/expr-ast-phase-2-slice-2/anomaly-report.md](./docs/changes/expr-ast-phase-2-slice-2/anomaly-report.md) — checkLinear ExprNode walk (NOT yet merged)
- [scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md](../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md) — Ghost-lint #1 canonical briefing
- [scripts/git-hooks/README.md](./scripts/git-hooks/README.md) — versioned git hooks install instructions
- [handOffs/incoming/](./handOffs/incoming/) — 2 unread messages from 6nz re: programmatic compiler API
