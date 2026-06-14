# bug-12-vkill STAGE 2 — progress (read-side E-STATE-UNDECLARED fire)

Change-id: sym-cell-registration-completeness-2026-06-13 (stage 2).
Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-af9b984e883af80a2
Base after `git merge 5c2eca97` (stage-1 + engine-varname landed): FF to 5c2eca97.
Baseline suite: 24255 pass / 0 fail / 223 skip across 998 files (one earlier run flaked "2 fail" — non-deterministic; clean baseline is 0 fail).

## PHASE 0 — flagship-intent investigation: RESOLVED (no STOP)
The 7 typo reads `@currentCustomerEvents` (x5) + `@currentDriverEvents` (x2) reference a
filtered-to-current-user derived cell the dev FORGOT to declare. Evidence:
- Channels are GLOBAL: `<customerEvents> = []` / `<driverEvents> = []` (all events).
  Each payload carries `targetCustomerId` / `targetDriverId` (per channel docstrings:
  "customer-side UI filters to events relevant to the logged-in account" /
  "the driver UI filters to its own thread").
- The current-user id IS in scope: `<currentCustomer> = not` (customer pages) /
  `<currentDriver> = not` (driver pages), populated from `data.customer`/`data.driver`.
  `invoices.scrml:207` uses `@currentCustomer.id`; `messages.scrml:148/253` uses `@currentDriver.id`.
- `messages.scrml:11-12` docstring + `:251-253` re-filter loop confirm the intent:
  `@currentDriverEvents` = driver-scoped events.
DECISION: declare a derived cell per page filtering the global channel cell by current-user id:
  customer: `const <currentCustomerEvents> = @customerEvents.filter(ev => @currentCustomer is some && ev.targetCustomerId == @currentCustomer.id)`
  driver:   `const <currentDriverEvents>   = @driverEvents.filter(ev => @currentDriver is some && ev.targetDriverId == @currentDriver.id)`
Probe-verified: this derived form compiles clean inside the trucking tree.

## PHASE 1 — Class-B Option-1 bounded name-set exemption — DONE (this commit)
- SYMInput += `fileASTMap?: Map<string, FileAST>`; runSYM unpacks it.
- runSYMBatch builds `fileASTMap` from tabResults (one pass, shared by ref).
- New `ReadSideCtx` carries {fileScope, filePath, exportRegistry, fileASTMap, channelCellNamesMemo}.
  Threaded through walkResolveAtNames -> resolveAtNameOnExprNode (one extra positional arg).
- `getCrossFileChannelCellNames(ctx)` (memoised): for each channel-category import binding
  (exportRegistry category==='channel'), resolves the SOURCE FileAST via fileASTMap and
  harvests its `<channel>` body cell names via `collectChannelCellNamesInFileAST`.
- MECHANISM DIVERGENCE FROM SCOPE DOC (surfaced): the SCOPE doc mandated a `/<name>\s*=/`
  TEXT scan of the channel body, on the assumption the `export <channel>` body is raw text
  at SYM. EMPIRICALLY FALSE at the SYM stage: the source channel file's tabResults FileAST
  carries the body as structural `state-decl` nodes (verified S192 across all 4 trucking
  channel files: boardEvents/customerEvents/driverEvents/loadEvents). The structural walk
  reads `state-decl.name` directly — strictly more robust + naturally handles the
  alias-vs-cell distinction (we read the DECLARED cell name, not the import alias or the
  `name="dispatch-board"` channel attribute). The text-scan regex is RETAINED as a
  defensive `shorthandBodyRaw` fallback (none observed in-corpus). The SCOPE-doc text-only
  concern is the Option-2b follow-up gap territory.
- The fire ITSELF is NOT wired yet (Phase 4, per load-bearing order). Corpus unchanged.

## PHASE 2 — fix the 7 flagship typos — DONE
Declared the forgotten derived cells (the fire EARNING ITS KEEP — real silent bug fixed):
- customer/{home,invoices,loads}.scrml: `const <currentCustomerEvents> = @customerEvents.filter(ev => @currentCustomer is some && ev.targetCustomerId == @currentCustomer.id)`
- driver/{home,messages}.scrml: `const <currentDriverEvents> = @driverEvents.filter(ev => @currentDriver is some && ev.targetDriverId == @currentDriver.id)`
Each placed adjacent to its `<currentCustomer>`/`<currentDriver>` decl with a doc comment.
- All 5 pages compile clean; whole trucking-dispatch (36 files) compiles clean.
- Verified: derived cell wires reactively into client.js (currentCustomerEvents + targetCustomerId
  refs present, `node --check` valid). No new server-data leak (the SESSION_DB_PATH +
  _scrml_fetch_getCurrentUser are pre-existing client RPC stubs, not server-fn bodies — unchanged
  by this fix). messages.scrml's existing `isForThisDriver` re-filter is now idempotent (harmless).

## PHASE 3 — migrate phase1-003 fixture — DONE
samples/compilation-tests/gauntlet-s19-phase1-decls/phase1-reactive-file-level-003.scrml:
- Was: file-top bare-writes `@count = 0` / `@theme = "light"` (no `<program>`/`${}` host →
  inert text, writes dropped, `${@count}`/`${@theme}` reads resolve null).
- Now: canonical `<program>` wrapper + structural `<count> = 0` / `<theme> = "light"` decls
  (v0.3 §40.8 default-logic auto-lift). Compiles clean; gauntlet-s19-verify outcome unchanged
  (still `clean`, matching expected.json). Updated expected.json `shape`+`notes` to reflect the
  migration. (The 22 OUTCOME_MISMATCHes in that dir are PRE-EXISTING runner drift on OTHER
  fixtures — file-level-003 is NOT among them, before or after.)

## PHASE 4 — wire the read-side fire — WIRED BUT GATED (STOP surfaced)
The read-side E-STATE-UNDECLARED fire is wired at `resolveAtNameOnExprNode` `if (!resolved)`
after the pinned-import fallback, with:
  - EXEMPTION 1: native-parser self-host `.scrml` (mirrors the write-side guard).
  - EXEMPTION 2 (Class B): cross-file channel cells (getCrossFileChannelCellNames).
  - import-binding exemption (any import binding resolves the read).
VERIFIED working: synthetic `${@typo}` fires; trucking corpus (36 files) = 0 fire; the
hard `@boardEvents` alias-vs-cell Class-B case is exempted; native-parser files = 0 fire.

### STOP — the SYM-stage fire over-fires on POST-SYM `@`-name surfaces the census MISSED
Wiring the fire and running the full unit/integration/conformance gate surfaced 16 test
failures across FOUR additional false-positive classes the STAGE2-SCOPE census did NOT
identify (its "adversarial 5th-class check: NEGATIVE" was empirically wrong — the census ran
via compileScrml which SILENTLY PROPAGATES null resolutions, so it could not observe which
reads were unresolved; and the real corpus avoids these isolated patterns, so the corpus
census showed clean):
  1. `<tableFor>`/`<each>` row/loop locals — `@row` (r28-bug-2, §2/§3). **Introduced by CE
     component-expansion POST-SYM — NOT in the SYM-stage AST at all**, so NO file-wide
     SYM binding-set can capture it. This is the decisive blocker: the same class as
     cross-file channel cells, but with no import binding to key an exemption off.
  2. engine boot-`effect=` / state-child implicit cells — `@tasks` (engine-opener-effect-c1).
     Written via a bare `@tasks = …` the WRITE-side V-kill EXEMPTS in engine context (so no
     structural decl exists); the read then has nothing to resolve to.
  3. `<state>`-block cells read from a sibling `function` body or page markup (r24-bug-31 ×8).
     The cell registers but the read-position scope misses it — a SYM scope-registration gap
     distinct from the inline `${ <x> = … }` form which resolves fine.
  4. markup-const / `component-def` reads — `@A` for `const A = <markup>` (cluster-c bug-2).
     A `component-def` node, not a `state-decl`, so `lookupStateCell` misses it.

The SPEC §34 row itself names the two resolutions: "resolving those surfaces at SYM OR
relocating the check to a post-CE stage." Class B resolved ONE POST-SYM surface (channel
cells) via a bounded SYM-stage exemption; surfaces (1)+(2)+(4) are ALL POST-SYM-introduced
(CE/tableFor/engine expansion), so the principled fix is to **RELOCATE the fire to a post-CE
stage** where those names resolve normally — NOT to keep bolting per-class SYM-stage
exemptions (each is a fresh altitude smell + drift risk, the same concern Option 2b raises
for channels). A file-wide "name appears somewhere" SYM exemption was investigated and
REJECTED: `@row` is not in the SYM-stage AST at all (proven via a binding-dump probe), so
no SYM-stage set can capture it.

### Disposition (this commit)
The fire + both exemptions + the native-parser guard are COMPLETE and regression-guarded
(read-side-state-undeclared.test.js runs them with the fire ENABLED). The fire is **gated
behind `SCRML_READSIDE_UNDECLARED` (OFF by default)** so the gate stays green (the 16
over-fires are suppressed) WITHOUT reverting the completed mechanism. SPEC §34 + §6.1.1 +
§6.1.2 updated to the accurate "wired-but-gated, pending post-CE relocation" state (Rule 4).

RECOMMENDATION to PA: relocate the read-side fire to a post-CE stage (Stage where CE/
tableFor/engine expansion has run) so `@row`/`@tasks`/component-def reads resolve normally;
the Class-B channel exemption + native-parser guard can then likely be DROPPED (the cells
materialise post-CE). This is a larger unit than the SCOPE doc anticipated. `bug-12-vkill`
stays OPEN on the read-side until that relocation lands (write-side + stage-1 registration
+ Class-B mechanism are DONE).

## PHASE 5 — close + follow-up — DONE (bug-12-vkill STAYS OPEN)
### Census (R26)
- examples/ corpus: 0 E-STATE-UNDECLARED fires WITH the fire ON (the 7 typos fixed, 15 Class-B
  exempted, 2 file-top migrated, native-parser exempted). Trucking 36-file app: 0 fire ON, clean OFF.
- samples/ census: per-file compileScrml over the full samples tree TIMED OUT (124) — samples is
  too large for a per-file timeout. The unit/integration/conformance GATE (which compiles the
  fixture corpus) is the authoritative coverage: green with the fire gated OFF; the read-side
  tests run it ON and pass.
- Synthetic `${@typo}` in a fresh file: FIRES (proves wired). `@boardEvents` alias-vs-cell: exempt.
- The "0 false-positives" R26 target is NOT met for the fire ON across the unit-test fixture
  corpus — FOUR POST-SYM surfaces over-fire (the STOP). It IS met for the real examples/ corpus.
  Hence the fire is gated OFF and bug-12-vkill stays open.

### Suite
- Full unit/integration/conformance gate: 17032 pass / 0 fail / 90 skip (fire gated off).
  Pre-fix baseline was 24255 pass / 0 fail (one earlier run flaked "2 fail" — non-deterministic).
- trucking-dispatch (36 files) compiles clean post-flagship-fix.

### Gaps
- docs/known-gaps.md bug-12-vkill: STAYS `status=open` (read-side not soundly landable yet).
  Detail updated with the 4 new POST-SYM classes + the post-CE-relocation recommendation.
- NEW `g-readside-undeclared-postce` (MED, open) — the post-CE relocation, the principled fix.
- NEW `g-export-channel-body-text` (LOW, open) — Option 2b root fix that retires the Class-B scan.
- state.ts --check PASSES (gap-counts + recent-sessions regenerated).

### Deferred / surfaced to PA
- The read-side fire needs a POST-CE relocation (g-readside-undeclared-postce). The complete SYM-stage
  mechanism (fire + Class-B exemption + native-parser guard) is committed gated behind
  SCRML_READSIDE_UNDECLARED as the migration starting point.
