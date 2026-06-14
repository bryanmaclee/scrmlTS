# SCOPE — bug-12-vkill STAGE 2 (read-side E-STATE-UNDECLARED fire)

**Status:** scoping (S192, post-stage-1 landed `5c2eca97`). 3-thread workflow investigation (S1 fire-site/exemptions · S2 Class-B mechanism · S3 empirical census). The PART3 scope assumed "fire + Class-B exemption"; the census **reframes** it.

## The fire site (S1)
`symbol-table.ts:2290` — the `if (!resolved)` block in `resolveAtNameOnExprNode`, after the pinned-import fallback. `resolved` = `lookupStateCell` (now includes refs/engine/compound/structural post-stage-1) + `lookupImportBinding`. **Today: SILENT** — a `${@cuont}` typo read compiles exit-0, zero diagnostics. The read-side fire closes exactly this silent-typo class. Write-side exemptions (§40.8/meta) live at the ast-builder TAGGING layer, NOT the fire site; the read side needs only the **native-parser self-host `.scrml`** exemption (parse-state-body=3, parse-markup=6 unresolved reads that would false-fire) — the meta/default-logic cases resolve normally for declared cells and SHOULD fire on a genuine typo.

## The residual surface is THREE classes, not one (S3 — full-corpus runSYM census, 24 null reads)
| Class | Count | Disposition |
|---|---|---|
| **B — cross-file channel** | 15 (8 files, 3 cells) | EXEMPT (genuinely declared, just not at per-file-SYM) |
| **genuine-typo** | 7 (`@currentCustomerEvents`×5, `@currentDriverEvents`×2) | **FIRE — these are real silent bugs in the flagship** |
| **file-top bare-write** | 2 (phase1-003 fixture `@theme`/`@count`) | disposition (migrate vs update-expectation) |

Adversarial 5th-class check: NEGATIVE. The surface is fully characterized.

## Class B handling = OPTION 1 (bounded name-set exemption) — S2 recommendation, alternatives empirically rejected
- **Option 3 (relocate post-CE): FALSIFIED.** The `export <channel>` body is raw TEXT even post-CE (CE deep-clones it verbatim); post-CE runSYM STILL returns NULL. The cell materializes only mid-codegen (emit-channel reparse). Rejected.
- **Option 2 (pre-index): heavy.** Would duplicate the codegen reparse at SYM (drift risk). **Option 2b** (parse `export <channel>` bodies structurally at TAB, like non-export channels — the root cause: the `export` keyword routes the body through `liftBareDeclarations` → collapses to text before auto-lift) is the *proper long-term fix* but has codegen-contract blast radius → **file as a separate follow-up gap**, not in stage 2.
- **Option 1 (bounded name-set scan): RECOMMENDED, LOW-MED.** Thread a `fileASTMap` into runSYM (runSYMBatch already holds every file's AST in `tabResults` — ~5-line plumbing). At the fire site, when a `@name` misses lookupStateCell + lookupImportBinding, build (memoized per-file) a SET of cross-file channel cell names: for each import binding whose `category==='channel'` (infra present at symbol-table.ts:5706 + `lookupExportRegistry`), resolve the source file, light-scan its channel text body (`/<([A-Za-z_$][\w$]*)\s*>\s*=/g`, verified extracts `boardEvents`), exempt if matched. **The alias-vs-cell distinction makes a naive name exemption impossible** (read `@boardEvents` matches neither the import alias `dispatchBoard` nor the channel name `dispatch-board` — the scan MUST read the channel body). Mild altitude smell (SYM reasons over unparsed channel-source text), retired entirely by Option 2b later.

## The fire EARNS ITS KEEP — it caught real flagship bugs (the 7 typos)
`@currentCustomerEvents` / `@currentDriverEvents` are read for notification badges (`if=(@current*Events.length > 0)`), `.length` comparisons vs `@lastSeenCustomerEventCount`, and list rendering — across `pages/customer/{home,invoices,loads}.scrml` + `pages/driver/{home,messages}.scrml`. The channel cell is `@customerEvents`/`@driverEvents` (all events); the `current*` filtered variant was **never declared**. The intent is clearly "events relevant to the current customer/driver" — a derived/filtered cell the dev forgot. **Compiles exit-0 today (silent).** This is precisely the silent-typo class the read-side fire exists to catch — stage 1's whole premise validated. **Stage 2 must fix the flagship**: declare the intended `const <currentCustomerEvents> = @customerEvents.filter(<relevant-to-current>)` (the agent investigates the filter criterion — is the channel per-user or global? is there a current-user id in scope?) OR, if no filter is intended, point the reads at the channel cell directly.

## The 2 file-top-bare-write reads (phase1-003 fixture)
`@count=0`/`@theme="light"` at bare file-top (no `<program>`/`${}` host) parse as inert `text` nodes (writes silently dropped), so the `${@theme}`/`${@count}` reads resolve null. The fixture's `.expected.json` says `clean` but its own notes flag the ambiguity. Disposition: **migrate the fixture to canonical** (`<program>` wrapper + structural `<count>=0` decls) — the file-top bare-write is non-canonical (legacy v0.2; same class V-kill/Unit-CC governs) so the read-side fire correctly surfaces it. (Alternative: update the `.expected.json` to `error`.)

## Stage-2 dispatch shape (proposed)
1. Read-side `E-STATE-UNDECLARED` fire at symbol-table.ts:2290 + the native-parser self-host exemption.
2. Class-B Option-1 bounded name-set exemption (fileASTMap thread + channel-body scan).
3. Fix the flagship: declare the 7 `current*` derived cells (Phase-0 investigate the filter intent; STOP if ambiguous).
4. Migrate the phase1-003 fixture to canonical (or update expectation).
5. R26: full corpus census — only genuine typos fire; the 15 Class-B reads + the native-parser reads do NOT; trucking-dispatch compiles clean post-flagship-fix.
6. Follow-up gap: **Option 2b** (parse `export <channel>` bodies structurally at TAB) as the Class-B root fix that retires the Option-1 scan.
7. Close `bug-12-vkill` (status=resolved).

## Open decisions for the user
1. **Class B = Option 1** (bounded name-set exemption) — confirm (alternatives rejected).
2. **Fix the 7 flagship typos** — yes (the fire's whole point); agent investigates the `current*` filter intent in Phase 0.
3. **phase1-003 fixture** — migrate to canonical (rec) vs update-expectation.
