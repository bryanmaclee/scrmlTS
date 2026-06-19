---
needs: action
from: sPA ss1 (server-emit-route-inference)
to: PA
date: 2026-06-19 (S208 continuation)
---

# sPA ss1 — item 1 landed on `spa/ss1`, ready for re-integration

## ACTION: re-integrate `spa/ss1` → main

- **Branch:** `spa/ss1` · **tip SHA:** `795704c1` · 1 commit ahead of `origin/main`, 0 behind (coherence-gated, S147).
- Single sPA-authored landing commit via S67 file-delta from agent `a6eb2c2fd9ba6086b` @`254346e0`.
- Pre-commit hook passed; full `bun run test` 24529 pass / 237 skip / 0 fail (browser incl.).

### Item 1 — `g-route-mis-inference-server-called-pure-helper` (known-gaps.md:1494, MED) → RESOLVED
`emit-server.ts` now emits a module's exported VALUE bindings (constants + pure
functions, incl. route-classified ones additively) into `.server.js` as native ESM
`export const`/`function` — the server analog of the client `_scrml_modules` §21.3
registry footer. **route-inference.ts UNTOUCHED** — Step 5c caller-context escalation
is load-bearing for the `server`-keyword deprecation (ss9), so the gap's "Option 2"
(don't route-infer the pure helper) was correctly NOT taken.

**sPA-independent R26 verify on spa/ss1:** trucking `W-SERVER-IMPORT-UNEMITTED` 6→0,
warnings 80→74, `auth.server.js` exports the value bindings; compile errors 0.

**Correction to the gap text (R4):** the gap conflates constants with route-inferred
fns. Empirically only `rolePath` route-infers; the `SESSION_*` constants never
route-infer — `.server.js` simply had no value-export path. Fix covers both. Suggest
updating known-gaps.md:1494 to `status=resolved` with this framing.

Files: `compiler/src/codegen/emit-server.ts` (+225), `compiler/src/codegen/var-counter.ts` (+15, counter snapshot/restore for byte-stable handler suffixes), 3 integration tests (trucking-smoke 80→74 rebaseline; w-server-import-unemitted MISSING-EXPORT→no-fire; g-pure-module-server-emit +§3 regression).

## NEW RESIDUAL to file (NOT ss1 scope) — MISSING-FILE branch
A CONST-ONLY module with NO server content (no route-inferring fn) emits NO `.server.js`
at all, so a server-USED const import from it still dangles and still fires
`W-SERVER-IMPORT-UNEMITTED` (MISSING-FILE branch). ss1 resolves only MISSING-EXPORT (a
`.server.js` that IS emitted now carries the value exports). Option-1 force-emit-
`.server.js` was rejected by the sibling `g-pure-module-server-emit` Fix A (link-errors
on erased TYPE imports). Distinct residual — recommend filing in known-gaps as a
sibling gap.

## ss1 list remaining (this sPA session stopped after item 1)
- **Item 2** `server-generator-yield-serializability` — scoped+held. Real type-inference
  follow-on (E-ROUTE-003 on the YIELD-ELEMENT type of an SSE `server function*`;
  type-system.ts:3872 `if (!isGenerator)` skips it; test.skip at
  route-wire-serializability.test.js:312). LOW. Needs body-walk yield-typing +
  SPEC §37.4 confirm. Details in `spa-lists/ss1.progress.md`.
- **Item 6** `phase-a4-schema-refinement-pinned` — verified-shipped (refinement S69 +
  schemaFor S104 both live); the master-list.md §0.1 A4 close-edit is HELD for you
  (PA-owned backlog; parallel ss11 may touch master-list). Recommend you close row A4.
- **Items 3/4/5** (sql-row-protect-leak feature, Postgres/MySQL drivers, P4 batcher
  post-v1 extensions) — higher-ingestion feature items, not yet scoped; appropriate for
  a follow-on sPA session.

Full per-item detail: `spa-lists/ss1.progress.md` on `spa/ss1`.

---

# FINAL UPDATE — full ss1 list dispositioned (branch tip moved)

**`spa/ss1` tip is now `37a9a8c9`** (2 commits ahead of origin/main, 0 behind):
- `795704c1` — item 1 code fix (emit pure-module value exports).
- `37a9a8c9` — item 6 A4-row close + items 2-5 park bookkeeping (docs only; hook passed, 17340 tests).

## 6/6 items dispositioned
- **Item 1** — LANDED (resolved). Re-integrate.
- **Item 6** `phase-a4-schema-refinement-pinned` — LANDED. master-list.md §0.1 A4 row closed; all 3 parts verified shipped (pinned A1a/A1c §6.10; refinement B21 `c5f9dcf` S69 §53; schemaFor S104). A5's "pending A4" blocker now moot (A5 not edited — not an ss1 item; flag for your own currency pass).
- **Items 2/3/4/5** — PARKED → design/PA track (verified, not assumed):
  - **2** generator-yield E-ROUTE-003: real hole, but needs a value-expression typer (`yield-stmt.expr` is a raw string; none exists) + a normative non-serializable-yield fixture decision → focused follow-on / small DD.
  - **3** sql-row-protect-leak: SPEC §14.8 EXPLICITLY deferred; net-new HIGH-tier data-flow, no algorithm → design pass.
  - **4** Postgres/MySQL real introspection: Phase 2.5, blocked on the async protect-analyzer migration.
  - **5** P4 batcher extensions: explicitly post-v1.

## Two known-gaps actions for you
1. Mark `g-route-mis-inference-server-called-pure-helper` (known-gaps.md:1494) **resolved** (with the corrected framing: emission-side fix, not route-inference; covers constants too).
2. File the **MISSING-FILE residual** as a sibling gap (const-only module with no `.server.js` → server-used const import still dangles; Option-1 force-emit rejected by g-pure-module Fix A's type-import link-error).

Per-item detail: `spa-lists/ss1.progress.md` + `spa-lists/ss1-server-emit-route-inference.md` on `spa/ss1`.
