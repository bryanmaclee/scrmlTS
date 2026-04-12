# scrmlTS — Session 4 Hand-Off (FINAL)

**Date:** 2026-04-11
**Next session rotation target:** `handOffs/hand-off-4.md`
**Tests (unit):** 2,298 (S3 final) → **4,902** (with `bun install` correcting an artificially-low pre-snapshot baseline; the ~2,600 delta is environment, not code)
**Tests (integration):** 57 (Phase 1.5 baseline) → **94 pass** (Slice 1 + Slice 2 + ast-builder gap closure all merged to main)

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
| `4d02585` | docs: S4 final wrap (mid-session — superseded by this addendum) |
| `45208c6` | **Merge Phase 2 Slice 2 + Phase 1 gap closure — `checkLinear` ExprNode walk, §35.2.1 lin-params E2E, two `ast-builder.js` `exprNode:` gap closures.** This is the headline merge. |

**Net main delta this session: 11 merge/feature commits + 36 commits ahead of origin.**

---

## Phase 2 Slice 2 — MERGED (`45208c6`)

**`checkLinear` migrates to ExprNode walks for lin consumption.**

**Headline:** §35.2.1 lin function parameters work end-to-end for the first time. The Lin Batch B (S3) parser support + this slice's structured `ExprNode` walker close the loop.

**What landed:**
- `forEachIdentInExprNode` in `expression-parser.ts` — recursive ExprNode walker for IdentExpr nodes; lambdas skipped (conservative — capture is not consumption)
- `scanNodeExprNodesForLin` in `type-system.ts` — calls the walker on every parallel ExprNode field at every checkLinear visit site, fires `lt.consume` on matching declared lin variables. Existing `case "lin-ref"` handler preserved so the 234 hand-crafted unit tests continue to pass
- 9 e2e scenarios in `lin-enforcement-e2e.test.js`: declare/consume, double-consume → E-LIN-002, never consumed → E-LIN-001, branch asymmetry → E-LIN-003, **§35.2.1 lin-params E2E (HEADLINE)**, lin-param not consumed → E-LIN-001, shadowing across function-decl scopes, lambda capture (conservative)
- Two `ast-builder.js` `exprNode:` gap closures (lines 2009 and 3962, default `bare-expr` fallthrough paths the Phase 1 walker missed) — independently verified by a follow-up Opus agent that the Phase 1.5 idempotency invariant holds (15/15 corpus cases) with the additions present

**Pass 2 fallback DELIBERATELY retained:**
`scanNodeExprNodesForLin` has Pass 1 (structured ExprNode walk via `forEachIdentInExprNode` — primary path) and Pass 2 (parser-assisted string scan via `extractIdentifiersExcludingLambdaBodies`, which uses `parseStatements` not regex, preserving lexical scoping). Pass 2 exists because of a pre-existing `collectExpr` over-collection bug: `lin x = "hello"\nuse(x)` greedy-collects across the newline into one `lin-decl` where `init = '"hello"\nuse(x)'`, and Acorn's `parseExpression` then parses only the first expression. Pass 2's `parseStatements` call sees both expressions and finds the lin reference.

A previous Opus agent attempted to delete Pass 2 and regressed 3 e2e scenarios precisely on this case. The fix is upstream in `collectExpr` (Slice 3, T3), not in `checkLinear`. Pass 2 stays until Slice 3 lands; Slice 4 then deletes Pass 2 cleanly. **This is a staging pattern, not a bandaid** — primary path is structured, fallback is bounded, removal condition is precisely known.

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

Integration baseline already includes the 9 lin-enforcement-e2e scenarios from Slice 2. S5 picks up at 4,902 unit + 94 integration with main on `45208c6`.

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
- [docs/changes/expr-ast-phase-2-slice-2/anomaly-report.md](./docs/changes/expr-ast-phase-2-slice-2/anomaly-report.md) — checkLinear ExprNode walk + Phase 1 gap closure (merged `45208c6`)
- [scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md](../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md) — Ghost-lint #1 canonical briefing
- [scripts/git-hooks/README.md](./scripts/git-hooks/README.md) — versioned git hooks install instructions
- [handOffs/incoming/](./handOffs/incoming/) — 2 unread messages from 6nz re: programmatic compiler API
