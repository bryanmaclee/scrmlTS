bug-12-vkill STAGE 2 — land the read-side `E-STATE-UNDECLARED` fire (bare `@name` READ with no declaration must error, mirroring the S123 write-side fire), closing bug-12-vkill. Change-id: `sym-cell-registration-completeness-2026-06-13`. User-ratified S192: Class B = Option 1 (bounded name-set exemption); fix the 7 flagship typos; migrate the phase1-003 fixture.

READ FIRST: docs/changes/sym-cell-registration-completeness-2026-06-13/STAGE2-SCOPE.md IN FULL (the 3-thread investigation + exact loci). MAPS: primary.map.md Task-Shape Routing.

STARTUP (F4): branches from current main (stage-1 landed; NO reset). pwd under .claude/worktrees/agent-; clean; bun install; bun run pretest. Path discipline: Bash-edits on worktree-absolute paths, never cd into main, no --no-verify, commit per phase, progress-stage2.md.

ORDER IS LOAD-BEARING: all exemptions + corpus fixes land BEFORE the fire is wired (else it false-positives on the 15 Class-B + 7 typo + 2 file-top reads the census found). Fire LAST.

PHASE 0 — survey (fire site symbol-table.ts:2290 `if(!resolved)`; fileASTMap seam = runSYMBatch tabResults; channel-category via lookupExportRegistry 1404 / category==='channel' 5706/5730) + flagship-intent investigation (STOP if ambiguous): the 7 typo reads @currentCustomerEvents (×5 customer/{home,invoices,loads}) + @currentDriverEvents (×2 driver/{home,messages}) reference an undeclared cell; channel cells are @customerEvents/@driverEvents. Determine intent (channel per-user → identity/point-at-cell; OR global → .filter(current-user) derived cell). STOP + report options if the filter criterion is ambiguous (don't guess app behavior).

PHASE 1 (commit) — Class-B Option-1: thread fileASTMap into runSYM; at the fire site, before firing an unresolved @name, build (memoized) the set of cross-file channel cell names (import bindings with category==='channel' → resolve source file → scan channel text body with /<([A-Za-z_$][\w$]*)\s*>\s*=/g + const <name>); exempt if matched. (Read @boardEvents matches neither alias dispatchBoard nor channel-name dispatch-board — body scan mandatory.) Tests: channel read no-fire; genuine typo in a channel-importing file STILL fires.

PHASE 2 (commit) — fix the flagship (the 7 typos per Phase-0 intent) on the 5 pages; each compiles clean. FIX the real bug, do not exempt.

PHASE 3 (commit) — migrate phase1-reactive-file-level-003.scrml: file-top bare-writes @count=0/@theme="light" → canonical <program> + structural decls; update .expected.json if outcome changes.

PHASE 4 (commit) — wire E-STATE-UNDECLARED at symbol-table.ts:2290 (after pinned-import + Class-B-exemption miss): fire on bare @name resolving to nothing. Native-parser exemption: filePath.includes('/compiler/native-parser/') && endsWith('.scrml') (mirror write-side ~2413-2415; parse-state-body=3, parse-markup=6). Meta/default-logic NOT exempted. SPEC §34 E-STATE-UNDECLARED: "Read-side fire DEFERRED" → "wired S192", remove Class-B-pending note. §6.1 read-side SHALL (Rule 4). Tests: ${@typo} fires; resolved + Class-B + native-parser reads do NOT.

PHASE 5 — R26: full-corpus runSYM census → ZERO false-positives (15 Class-B exempt, 7 typos fixed, 2 file-top migrated, native-parser exempt → no non-genuine-typo unresolved reads remain); synthetic ${@typo} MUST fire (wired-proof). Full suite 0 new fail; trucking-dispatch (36 files) clean. known-gaps bug-12-vkill → status=resolved. File NEW gap g-export-channel-body-text (LOW): export <channel> body collapses to raw text pre-codegen; Option 2b (parse at TAB) is the root fix retiring the Option-1 scan.

REPORT: WORKTREE_PATH, FINAL_SHA, per-phase SHAs, FILES_TOUCHED (5 flagship pages + fixture), Phase-0 flagship-intent decision (+STOP?), Phase-5 census (0-false-positive + typo-fires proof), suite, maps, new gap, deferred. [Verbatim dispatch prompt; full F4/maps/path-discipline blocks included.]
