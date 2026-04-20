# non-compliance.report.md
# project: scrmlTS
# generated: 2026-04-20T22:05:00Z
# scan mode: INCREMENTAL_UPDATE (S34 close refresh from S29 baseline)

## Summary

Total docs scanned: 24 (excluding handOffs/, node_modules/, .claude/, .git/, samples/compilation-tests/**, benchmarks/todomvc-*/README.md, benchmarks/fullstack-react/*.md)
Compliant: 18
Non-compliant (carry from S29-S33): 3
Uncertain (carry from S29): 2
New this session (S34): 1 (GITI-006 follow-up — emission-shape, code-level flag)

---

## Non-compliant docs

### master-list.md
**Reason:** content-heuristic (stale header) + grep-mismatch — CARRY (12 sessions stale; per invocation, "will be refreshed this session separately")
**Detail:** Header still reads "Last updated: 2026-04-17 (S23 — ... 6,889 pass / 10 skip / 2 fail across 278 files)". Actual baseline at S34 close is **7,373 pass / 40 skip / 2 fail across 338 files** (26,808 expects). Delta since header: +484 pass / +30 skip / +60 files / +1,260 expects. Between S23 (header date) and S34 close we've shipped S24-S34 content — 11 full sessions of compiler + codegen work — and the inventory file does not reflect any of it. Explicitly stale items:
- Line 13 baseline numbers (see above).
- Line 26: "CG (Code Generator): compiler/src/codegen/ (37 files, ~14,912 LOC)" — LOC drifted substantially with S27-S28 emit-machines (+800 combined) and S34 emit-client (+180), emit-event-wiring (+82), emit-reactive-wiring (+18), emit-control-flow (+31), rewrite (+29).
- Line 35: "Total compiler src: ~24,739 LOC" — type-system.ts alone has grown +786 LOC to 8,712 since the S29 snapshot; total drift likely >1,500 LOC.
- Line 59: "bpp.scrml | 230" — actual is 232 (commit 74303d3 edit, S29).
- Line 74: "compiler/SPEC.md — 18,753 lines, 53 sections" — actual is **20,439 lines** (+1,686 lines since line in file; covers §51.3.2, §51.5.2, §51.11, §51.12, §51.13, §51.14, §54.6 purity).
- Line 76: "compiler/PIPELINE.md — 1,569 lines" — actual is **1,630 lines**.
- No inventory entries for gauntlet-s24/s25/s26/s27/s28/s32 test trees, the 8 new S34 adopter-bug test files, `compiler/tests/helpers/extract-user-fns.js` (S28), `SCRML_NO_ELIDE` env var (S28), S28 elision feature, S27 replay feature, S27 audit completeness, S29 self-host bpp.scrml parity, S32 Phase 4a-4g purity enforcement, S34 codegen adopter-bug fixes.
**Suggested disposition:** refresh in place this session (invocation flags this as separate scope); once refreshed, this line drops out of the report.

### compiler/SPEC.md.pre-request-patch
**Reason:** name-heuristic (`-patch` suffix) + content-heuristic + location — CARRY (flagged S29, not yet moved)
**Detail:** 12,414-line pre-amendment SPEC snapshot sitting next to the authoritative 20,439-line SPEC.md. Front-matter references paths that no longer exist in-repo (`docs/spec-issues/SPEC-AMENDMENTS-2026-04-02.md`, `docs/changes/spec-s37-amendments/spec-amendments.md`). Pre-dates §51.3.2 migration, §51.5 elision, §51.11 audit, §51.12 temporal, §51.13 projection, §51.14 replay, §54.6 purity. Leaving it next to SPEC.md is a grep trap.
**Suggested disposition:** move to scrml-support/archive/spec-drafts/ (preserve original filename) OR delete outright (git history preserves).

### docs/changelog.md
**Reason:** grep-mismatch (minor) — CARRY updated
**Detail:** Baseline line reads "2026-04-19 after S28 ... 7,183 tests passing / 10 skipped / 2 failing" — matches S29 open reality, not S34 close. No entries for S29 (self-host bpp.scrml), S30 (public pivot), S31 (design-insights), S32 (purity enforcement Phase 4a-4d), S33 (Phase 4e-4g + gauntlet-s32 un-skip), or S34 (11 adopter bugs, 10 commits). "In Flight" section still not present.
**Suggested disposition:** append S29-S34 entries in the same block; routine session-boundary drift.

---

## Uncertain docs (needs human review)

### docs/SEO-LAUNCH.md
**Reason:** uncertain — working doc uncommitted 12 sessions running — CARRY (was 5 sessions at S29; now 12)
**Detail:** 178 lines, uncommitted on main (`git status M`). Per the original flag this was "the same untouched edit, 5 sessions running"; now it's **12 sessions running**. The doc is a working checklist for ranking `scrml` on Google — planning/ops, not a code-reality claim, so it does not violate the "current truth" principle directly. But a doc uncommitted-and-untouched for 12 sessions is signaling "this work is not happening" and the file is taking up working-tree space on every `git status`.
**What to check:** user decision — either (a) commit the current state as the S35 opener and resume the SEO work, (b) move the doc into scrml-support/ until it's ready to restart, or (c) delete it and carry the idea forward in a follow-up note.

### benchmarks/fullstack-react/CLAUDE.md
**Reason:** uncertain — framework-comparison dir, but claude-code-specific instructions dropped into it — CARRY (unchanged since S29)
**Detail:** File begins `Default to using Bun instead of Node.js.` — Claude Code system-instruction-style file inside a framework-comparison directory. Not a scrml feature claim; it is agent-tooling configuration for that sub-benchmark. Framework comparison dirs are nominally out-of-scope.
**What to check:** user decision — intended tooling configuration or leftover artifact? If intentional, add a one-line "why this is here" comment at the top. If leftover, remove.

---

## New this session (S34)

### GITI-006 follow-up — `${@var.path}` async-reactive emission shape
**Reason:** code-level behavior flag (not a doc non-compliance, but surfaced via a working-tree inbound and worth tracking alongside doc drift) — NEW
**Detail:** markup interpolation of the form `${@var.path}` (dotted-path read on a reactive) currently emits a module-top **bare** read that runs at IIFE mount time. If the reactive is populated asynchronously — e.g. by a server-fn async IIFE fixed under GITI-001 earlier in the same body — the read throws `TypeError: cannot read property 'path' of undefined` before the writer settles. Pre-existing emission shape (not a regression from any S34 commit); flagged by giti as low-priority follow-up in `handOffs/incoming/read/2026-04-20-1558-giti-to-scrmlTS-bugs-verified-all-pass.md`.
**Suggested disposition:** scope a small codegen change to wrap module-top `${@var.path}` reads in either (a) a `_scrml_reactive_get` defer pattern that no-ops on undefined, or (b) an element-bound async reader that waits for first set. Plan in a future session; not urgent.

---

## §48.9 stale (carry from S33)
**Reason:** content-heuristic — CARRY
**Detail:** SPEC §48.9 describes behavior that no longer matches current fn purity rules after S32 Phase 4a-4g shipped (specifically around machine-transition purity and terminal-mutation checks). S33 wrap flagged this as stale — needs a spec amendment or section rewrite to reflect §54.6 / §33.6 enforcement actually landing.
**Suggested disposition:** spec amendment in a future session; schedule alongside any other §48 cleanup.

---

## Compliant docs (no action needed)

- README.md — current; markup-RHS component definition claim correct.
- pa.md — current agent directives.
- hand-off.md — live S34 close hand-off.
- docs/lin.md — current; matches §35.
- docs/tutorial.md — current (2026-04-18); markup-RHS-only component form.
- docs/changelog.md — S28 covered; see non-compliant note above for S29-S34 follow-up.
- scrmlFormula.md — creative/reference, no code claims.
- DESIGN.md — rationale doc; aligns with current contracts.
- compiler/SPEC.md — authoritative (20,439 lines).
- compiler/SPEC-INDEX.md — 148 lines, current.
- compiler/PIPELINE.md — 1,630 lines.
- compiler/src/codegen/README.md — matches current codegen/ contents.
- examples/README.md — quick-start and sigil cheatsheet.
- editors/neovim/README.md — editor integration, not a feature claim.
- scripts/git-hooks/README.md — tooling doc.
- benchmarks/RESULTS.md, benchmarks/sql-batching/RESULTS.md — empirical data.

### Tutorial snippets (docs/tutorial-snippets/)
33 .scrml files; compiled-as-tests fixtures. Match tutorial.md. Implicitly compliant.

---

## Out-of-scope (excluded from scan per scope rules)

- node_modules/**/*.md
- .claude/**/*.md (self-referential)
- handOffs/**/*.md (34 historical hand-offs; intentional archive)
- archive/**/*.md (none present)
- benchmarks/todomvc-react/README.md, benchmarks/todomvc-svelte/README.md (framework comparison dirs)
- benchmarks/fullstack-react/*.md (except CLAUDE.md flagged above as uncertain)
- samples/compilation-tests/**/*.md (fixture corpus)

---

## Actionable this session (S34 close)

1. **master-list.md** — refresh header + all stale numbers (baseline, SPEC/PIPELINE line counts, codegen LOC, bpp.scrml line count, missing gauntlet trees, S34 adopter-bug test files). Per invocation this refresh is happening separately from the maps refresh.
2. **compiler/SPEC.md.pre-request-patch** — move to scrml-support/archive/spec-drafts/ or delete outright. Still a grep trap 14 days in.
3. **docs/changelog.md** — append S29 (self-host bpp.scrml), S30 (public pivot), S31 (design-insights), S32 (Phase 4a-4d), S33 (Phase 4e-4g + un-skip), S34 (11 adopter bugs, 7,373 baseline) entries.
4. **docs/SEO-LAUNCH.md** — 12-session decision: commit / archive / delete.
5. **benchmarks/fullstack-react/CLAUDE.md** — confirm intent or clean up.
6. **GITI-006** (code, not doc) — schedule a small codegen pass for `${@var.path}` async-reactive reads in a future session.
7. **§48.9 spec refresh** — schedule amendment to align with S32 Phase 4 enforcement.

## Tags
#non-compliance #project-mapper #cleanup #scrmlTS #s34 #adopter-bugs #giti-006 #master-list-stale #spec-drift

## Links
- [primary.map.md](./primary.map.md)
- [domain.map.md](./domain.map.md)
- [error.map.md](./error.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
