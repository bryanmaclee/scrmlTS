# sPA ss14 — flograph-residuals-orphans

**Launch:** `read spa.md ss14` · **Branch:** `spa/ss14` · **Worktree:** `../scrml-spa-ss14`
**Merged from:** maps-flograph-provenance-residuals · misc-actionable-orphans

## Shared ingestion
Two loosely-coupled execution surfaces gathered as the catch-all. (a) The flograph/dock provenance
residuals: `scripts/flograph.ts` (provenance-sweep, `--with-archive`, `--emit` to docs/graph/),
`scripts/dock.ts` (inv4 sweep), the partially-superseded doc-deref residual. (b) The actionable
singletons that share no broader subsystem — each is its own bounded thing (see per-item entries).
NOTE: items here are largely independent; treat each item's own footprint as the foundation, not a
shared one.

## Core files
`scripts/flograph.ts` · `scripts/dock.ts` · `compiler/src/block-analysis.ts` (per item)

## Items (least-ingestion-first)
1. **`flogence-superseded-doc-deref-residual`** `[open]` feature LOW · tier low — deref the 4 partially-superseded deep-dives still in the live dir. Doc-move only (`--with-archive` keeps lineage queryable); CAVEAT partially- not fully-superseded — confirm move-vs-mark intent. Entry: flograph.ts defaultCorpus + the 4 living-compiler/m5-m6 docs.
2. **`g-each-body-sigil-invariant-classifier`** `[open]` bug LOW · tier low — `expr-node-corpus-invariant.test.js` escape-hatch classifier has no `@.`-sigil awareness; bare `@.`/`@.field` in `<each>` body ParseErrors + counts as escape-hatch, tripping the >50% gate. Pre-rewrite/whitelist `@.` before classification (:134, :375). Entry: that test file + §17.7.3 `@.` grammar.
3. **`dock-malformed-sweep-residual`** `[open]` bug LOW · tier med — `dock --check` provenance-sweep 1 + flograph provenance-sweep 7 at HEAD (standing INFO-level guardrail findings). Drive to zero = convert asserted decided-by/cites edges to verified. Entry: dock.ts inv4 (:149/174) + flograph.ts sweep (:327/367-369).
4. **`g-block-analysis-phantom-block`** `[open]` bug MED · tier med — ("D6") `--emit-block-analysis` mis-identifies a function CALL (`publishDriverEvent`) as a function-DECL block with a wrong span → phantom block + two-holders block-lease failure. Non-shipping flogence tooling. Root: block-discovery/span-assignment in `block-analysis.ts collectBlocks`/`collectFunctionDecls` (:337/:345) or D1 footprint. Entry: block-analysis.ts + block-analysis-footprint.ts. (delta-log S207 [11].)
5. **`bug-14`** `[open]` bug n-a · tier med — MCP V0.D deferred runtime items (globalThis runtime-helper registration; `scrml dev` in-process Bun.serve MCP wiring; dev-only NODE_ENV gate). 3 items gated on §58 Build Story. Self-contained (mcp-descriptors surface). Entry: codegen/mcp-descriptors.ts + generated `_server.js` boot path.
6. **`bug-18`** `[open]` bug LOW · tier low — GITI-015 adopter bug, tracking stub only; **repro must be located first** (grep `GITI-015` in the giti→scrml inbox `handOffs/incoming/read/`) before any scope can be set. No subsystem ingestion until the message is found. Entry: known-gaps:1536 → giti inbox.

## Progress
`ss14.progress.md`. Land on `spa/ss14`; ping PA inbox when ready. Do not advance main / do not push.
