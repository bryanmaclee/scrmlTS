# sPA re-integration — ss39 legacy-path parse/markup fixes

**From:** sPA ss39 · **Date:** 2026-06-26 · **List:** `spa-lists/ss39-legacy-parse-markup-fixes.md`
**Branch:** `spa/ss39` · **tip SHA:** `1ff49231` · **base:** `5fb41cb9` (origin/main + ss38)
**Coherence:** `rev-list --left-right --count origin/main...spa/ss39` = `0 4` (4 = ss38 base + 3 ss39 commits). Worktree clean. Each commit passed the full pre-commit gate (18150 tests / 0 fail on the final commit).

## FF-merge note

`spa/ss39` is based on `5fb41cb9` (= current LOCAL main, which already has the ss38 landing but is NOT yet pushed to origin). FF-merging `spa/ss39` into local `main` (at `5fb41cb9`) advances it cleanly to `1ff49231`. No rebase needed.

## Items

| # | gap | status | SHA | real locus (≠ footprint) |
|---|-----|--------|-----|--------------------------|
| 1 | g-markup-comment-angle-bracket-parsed-as-tag | **LANDED** | `19a45bf4` | `compiler/src/match-statechild-parser.ts` |
| 2 | g-nested-template-raw-mangle-ast-builder | **LANDED** | `7b88d26d` | `compiler/src/tokenizer.ts` |
| 3 | g-named-machine-arrow-no-statedecl-silent-empty | **PARKED → needs PA ruling** | `1ff49231` (survey docs only) | typer/codegen state-model |

### Item 1 — LANDED `19a45bf4`
Markup-section `//` / `/* */` / `<!-- -->` comments inside a `<match>` arm body leaked their angle-bracket fragments (`<form>`/`<each>`) to the arm-split tag scanner → corrupted structure → mis-fired `E-MATCH-PARSE-001` + `E-MATCH-NOT-EXHAUSTIVE` on an unrelated arm. Fix: `skipMatchComment` helper mirroring block-splitter's `findStructuralBodyEnd` skip-zones, consulted in `findArmCloser`/`findNextArmOpener`/main-loop advance. +1 new regression test (12 cases, full-pipeline R26) + 1 sibling test header corrected.
- **2 boundaries surfaced (NOT fixed):** (a) plain-markup top-level `/* <x> */ <div>` still fails in `block-splitter.js` — argued SPEC §27.2-aligned (`/* */` is NOT markup-native; only `<!-- -->` + universal `//` are); (b) `//` in match-arm free-text PROSE URL fails — pre-existing, SPEC §27.1-consistent.

### Item 2 — LANDED `7b88d26d`
Nested template literal `${`inner ${pb()}`}` mangled upstream of codegen: legacy tokenizer `readBacktickString` tracked only backtick depth → inner template's opening backtick mistaken for the outer's closer → inner body re-tokenized as bare punct/idents → ast-builder re-joined with spaces. Fix: mutually-recursive `scanTemplateBody`/`scanInterpBody` preserve nested templates/strings/balanced-braces verbatim; single-level path byte-identical (base-vs-fix diff verified). +1 new integration test (8 cases) + strengthened the ss22 `peer-call-in-template-interp-awaited` assertion.
- **1 boundary surfaced (NOT fixed):** a template literal used as the ENTIRE markup-text interpolation `<div>${`hi ${@name}`}</div>` is dropped from HTML + client.js — PRE-EXISTING, independent of nesting; separate markup-interpolation-of-template-literal surface.

### Item 3 — PARKED, needs a PA design ruling
Survey-only (no source changed; verdict (c) AMBIGUOUS). Full report: `docs/changes/g-named-machine-arrow-no-statedecl-2026-06-26/SURVEY.md`.
- The brief's premise (option a — emit/require a governed-cell init) is **SPEC-FORBIDDEN** for non-derived named machines: §51.3.3 mandates a SEPARATE `@var: MachineName = init`; §51.4 allows multiple machines/cells per enum; §51.0.B says `name=` does not source an auto-var → no canonical cell/`initial=` to auto-emit.
- The diagnostic option (b) can't be landed determinately — the typer's **deliberate S192 pre-bind** (`type-system.ts:11314-11339`, binds BOTH `PM` and lowercased `pm` for EVERY machine) and the SPEC encode contradictory read-name models.
- **OPEN QUESTION for the ruling:** is the lowercased read (`@pm`/`@ui`) legal for a NON-derived named machine, or only for derived/projection machines (§51.9)? Model 1 (spec-canonical: narrow pre-bind to derived-only + let `E-STATE-UNDECLARED` fire + route match `on=` through the walker) vs Model 2 (lowercased read canonical → must auto-init → re-collides with §51.3.3/§51.4). Undoing the S192 pre-bind is the contested call.
- Surfaced broader gaps: `match on=@X` read **bypasses** the `E-STATE-UNDECLARED` walker entirely (general, corpus-wide); `W-ENGINE-INITIAL-MISSING` misfires on arrow-body named machines; `<machine>` keyword = same gap; derived engines correctly exempt. Post-ruling = small bounded multi-surface arc (decomposition in SURVEY.md).

## PA action items

1. **FF-merge `spa/ss39` → local main** (advances `5fb41cb9` → `1ff49231`). Items 1+2 are clean codegen fixes; review staged delta if desired (S215 — both independently re-verified on-branch before landing).
2. **Footprint-accuracy signal:** BOTH fixed items had **locus corrections** — the list footprint named `ast-builder.js` but the real loci were `match-statechild-parser.ts` (item 1) and `tokenizer.ts` (item 2). Both legacy path; `compiler/native-parser/` untouched throughout.
3. **S211 collision note is MOOT:** neither fixed item actually touched `ast-builder.js`, so there is **no ast-builder.js intersection** to reconcile against ss32/ss33/ss34. Item-1 file (`match-statechild-parser.ts`) and item-2 file (`tokenizer.ts`) are both disjoint from the emit-client (ss32/ss33) and emit-server (ss34) surfaces.
4. **Item 3 → bank a DD / design arc** for the Model-1-vs-Model-2 read-name ruling (NOT an sPA fix). Also worth its own lane: the general `match on=@X` → `E-STATE-UNDECLARED` bypass (corpus-wide silent-undeclared-read gap) and the `W-ENGINE-INITIAL-MISSING` arrow-body misfire. Item 3's true surface is typer/codegen state-model, **mis-filed** in the legacy parse-markup lane.
5. **Cleanup:** I ran in a sibling worktree `/home/bryan-maclee/scrmlMaster/scrml-spa-ss39` (matching the ss32/33/38 convention), with `dist` + `node_modules` symlinked from main (S209 gap workaround). `git worktree remove /home/bryan-maclee/scrmlMaster/scrml-spa-ss39` after merging.

## Briefs / docs on-branch
- `docs/changes/g-markup-comment-angle-bracket-2026-06-26/BRIEF.md`
- `docs/changes/g-nested-template-raw-mangle-2026-06-26/BRIEF.md`
- `docs/changes/g-named-machine-arrow-no-statedecl-2026-06-26/{BRIEF,SURVEY}.md`

End-state: items 1+2 `landed-on-branch`, item 3 `parked`. Standing down.
