# sPA ss22 — re-integration (server-fn pipeline)

**From:** sPA ss22 · **To:** PA · **Date:** 2026-06-25 2144 MDT
**List:** `spa-lists/ss22-server-fn-pipeline.md` · **Branch:** `spa/ss22` · **Tip SHA:** `22ad3ac8`
**Base:** origin/main `cf9f1109` (contains ss19 peer-await `538df06d`). spa/ss22 = base + 4 fix commits, clean linear, `0 4` divergence vs origin/main → clean merge. (Local main is ahead at `7fa00be8` = your ss21+ss27 re-integration; ss22's surface is untouched by those.)
**⚑ Serialize re-integration with ss26** if it ran (both touch emit-server.ts) — PA-owned.

## End state: 5 of 6 items RESOLVED (landed); 1 PARKED (SPEC-deferred).

| # | Item | Tier | Landed SHA | Disposition |
|---|---|---|---|---|
| 1+2 | g-sse-route-object-typer-scope + g-server-fn-typed-object-literal-return | MED+MED | `26c45e1e` | FIXED (item-2 hypothesis corrected) |
| 3 | g-ecg001-protect-invariant-overfire | MED | `8a6ecd60` | FIXED (hypothesis corrected) |
| 5 | g-enum-toenum-not-lowered-server-side | MED | `ee14f803` | FIXED — **giti-relevant**, server R26✓ |
| 4 | g-peer-call-in-raw-template-unawaited | MED | `22ad3ac8` | FIXED (two halves) |
| 6 | g-sql-row-protect-leak | LOW | — | **PARKED** (SPEC §14.8.7 defers; design follow-on) |

Per-item BRIEF.md under `docs/changes/ss22-*-2026-06-25/`.

## ⚑ GITI FLAG (item 5)
`g-enum-toenum-not-lowered-server-side` unblocks the §14.4.3 server-side DB-coerce idiom: `?{...}.all().map(row => ({...row, status: Enum.toEnum(row.status) ?? row.status}))` inside a server fn now works (was a silent runtime TypeError). **Flag giti on re-integration.**

## Per-item detail + 4 HYPOTHESIS CORRECTIONS (the footprint loci were close; the ROOT CAUSES drifted)

**Item 1** — FIXED as footprinted: bound the synthetic SSE `route` (`.lastEventId`/`.query`) in the typer server-fn scope, SSE-generators only. type-system.ts. 4 tests.

**Item 2 — HYPOTHESIS WRONG.** Not a "server-fn object-literal field-KEY" bug. Root cause: an ast-builder return-TYPE-annotation parser bug — an inline-struct return type `-> { name: string }` broke the annotation skip-loop on its own `{`, leaking struct fields into the function BODY where they got scope-walked → false E-SCOPE-001. **LANGUAGE-WIDE (fires on client functions too)**, not server-specific. Fix: shared `consumeReturnTypeAnnotation` helper in ast-builder.js (dedups 4 byte-identical buggy loops). **PA: update the gap description.** ast-builder.js is hot-path → **PA does the within-node allowlist re-baseline** at re-integration (the agent reports the pre-existing `[over-budget] login.scrml residual 7` is unchanged vs base, but confirm).

**Item 3 — HYPOTHESIS WRONG.** Not a "stale pre-transform snapshot" (the scan already targets the final bundle). Root cause: the `\.field\b` regex scanned the WHOLE bundle → a protected field name inside a STRING LITERAL or COMMENT (display text) false-fired. Fix: scan code-positions-only via the shared `rewriteCodeSegments` fence. **Safety invariant preserved** — genuine leaks (member access AND `${row.ssn}` template interpolation) still fire. emit-client.ts.

**Item 5 — HYPOTHESIS REFINED + server R26 satisfied.** Not "rewriteEnumToEnum is client-only" (it's already in serverPasses). Root cause: the structured-AST emit path (`emitExpr`) has ZERO toEnum handling → bypasses all string passes. Two-part fix: (1) post-process the assembled server body to lower `<Enum>.toEnum(...)`; (2) reachability-gated `<Enum>_toEnum`/`_variants` tables into the server bundle (client bundle byte-identical). **Server-runtime R26 (you mandated it):** live handler returns the coerced variant / `not`, status 200, no TypeError. emit-server.ts (enum region) + emit-client.ts (reachability filter).

**Item 4 — two halves.** `${peer()}` in a server-fn template, peer in a SQL `?{}` param, `${@cell}` in a server template all bypassed the #8 structured emit. Fixed BOTH: (a) LOWERING — `emitServerTemplateLit` (emit-expr.ts) + `taggedFromParams` (emit-logic.ts) route interps through structured emitExpr (peer→await, @cell→`_scrml_body[]`); (b) EMISSION — the `_calledPeerNames` walk (emit-server.ts) recovers peer callees from lit/sql raw so `await peer()` isn't a ReferenceError. Reused #8; client templates untouched (mode-gated). Runtime round-trip: awaited value, not `[object Promise]`.

**Item 6 — PARKED (terminal, no code).** The STOP-if-bigger governor fired. **SPEC §14.8.7 (L8024-8030) normatively DEFERS** the protected-column-projection leak as "a data-flow / server-fn-return follow-on … not a read-site projection check"; the agent swept newest-first → no superseding ratification. A name-only check would be UNSOUND (an `AS`-aliased protected column = false-negative on a SECURITY check). RED confirmed (existing `sql-row-typing.test.js:97-109` asserts the RED state). **A real fix needs (design/SPEC-ratification FIRST):** (1) provenance channel on `<sql-row>` (source `(table,column)`), (2) body-return value-flow (`inferReturnTypeFromBody` only covers object-literal, not bare `return u`), (3) body-aware route gate, (4) new `E-ROUTE-*`/`E-PROTECT-*` + SPEC ratification of the static-projection contract. Recommend deliberating the contract shape BEFORE any implementation dispatch.

## NEW deferred findings (PA decides follow-ons)
1. **Item-5 client-side companion:** `Enum.toEnum()` is ALSO un-lowered CLIENT-side for a structured `<cell> = Enum.toEnum(...)` decl (same emitExpr-bypass root cause). The "client toEnum works" assumption holds only for the `.map(arrow=>)` escape-hatch + event-handler paths, NOT structured decls. Candidate client-side follow-on.
2. **Item-4 nested-template `.raw` mangling:** a nested template `${`inner ${pb()}`}` arrives at codegen pre-mangled by the AST-builder (present on base, independent of item 4). Item 4's fix is correct at the emit-expr level (no ReferenceError, valid JS, outer await guaranteed); the inner-raw mangling is a separate ast-builder follow-on — **related to item-2's ast-builder surface**, possibly worth bundling.
3. **Item 2 (gap-description correction):** the gap is an inline-struct-return-TYPE parser bug, language-wide — not a server-fn object-literal-key bug.

## Verification
- Each landing passed the full pre-commit blocking gate on the integrated branch.
- Integrated server-fn sweep on spa/ss22 (final, all 4 commits): **371 pass / 0 fail across 28 files** (5 new ss22 tests + enum/peer/server/sql-row regressions). Item-5 server R26 7/0; item-4 peer-await 6/0 — both verified post-merge (items 4+5 coexist in emit-server.ts; items 3+5 coexist in emit-client.ts — region-isolated, clean auto-merge).
- Branch coherence: tip `22ad3ac8`, base+4 linear, tree clean.

## Process notes
- **Weekly usage limit** had been hit during ss21 (resets 7am MDT). I PROBED with one dispatch (items 1+2) before fanning out — it succeeded (limit clear / had capacity), so I dispatched the remaining 4. All 6 agents completed cleanly this wave (no infra failures, unlike ss21).
- **S112 base-currency** + **S220 scratchpad-race** discipline in every brief (no incidents).
- **Pattern for your server-fn footprinting:** root-cause hypotheses drifted on 4 of 5 worked items even where loci were close; each agent reproduced empirically + followed the real cause (Rule 3/4), preserving safety invariants + region isolation. The footprints' LOCI were good; the stated MECHANISMS were often a layer off (parser vs typer, position vs timing, structured-AST-bypass vs pass-membership).

## Cleanup (PA-owned)
Agent worktree branches (all landed): `worktree-agent-{ad6bc1c2ead6f5c2e (items1+2), af72fdeda1752e85a (item3), a834f7c96a6fd497e (item5), a740894816892c44b (item4)}` + the sPA worktree `../scrml-spa-ss22`. Item-6's worktree (a0cbcc8b) parked with no commit (auto-removed / at base). Safe to prune after you merge `spa/ss22`.

— sPA ss22, standing down.
