# non-compliance.report.md
# project: scrmlTS
# generated: 2026-04-19T22:00:00Z
# scan mode: FULL_COLD_START (refresh — prior snapshot 2026-04-17/S21)

## Summary

Total docs scanned: 23 (excluding handOffs/, node_modules/, .claude/, .git/, samples/compilation-tests/**, benchmarks/todomvc-*/README.md, benchmarks/fullstack-react/*.md)
Compliant: 17
Non-compliant: 3
Uncertain: 2
Noted-out-of-scope: 1

---

## Non-compliant docs

### master-list.md
**Reason:** content-heuristic (stale header) + grep-mismatch
**Detail:** Header reads "Last updated: 2026-04-17 (S23 — ... 6,889 pass / 10 skip / 2 fail across 278 files)". Actual baseline at S29 open is **7,183 pass / 10 skip / 2 fail across 315 files** (26,415 expects). Other stale numbers found:
- Line 13: "6,889 pass ... across 278 files" — drifted by +294 pass / +37 files.
- Line 26: "CG (Code Generator): compiler/src/codegen/ (37 files, ~14,912 LOC)" — file count is still 37-ish but LOC has grown with emit-machines.ts (+300 LOC S27-S28) and emit-machine-property-tests.ts (+500 LOC S26-S28).
- Line 35: "Total compiler src: ~24,739 LOC" — drift likely significant after S24-S28 additions.
- Line 59: "bpp.scrml | 230" — actual is 232 (commit 74303d3 edit).
- Line 65: "module-resolver.scrml | 305" — not verified, may drift.
- Line 74: "compiler/SPEC.md — 18,753 lines, 53 sections" — actual is **20,071 lines** (+1,318 lines since S21, covering §51.3.2 migration, §51.5.2 elision amendment, §51.11 audit extension, §51.12 temporal, §51.13 projection, §51.14 replay).
- Line 76: "compiler/PIPELINE.md — 1,569 lines" — actual is **1,630 lines**.
- Also: no inventory entries for new gauntlet-s24/s25/s26/s27/s28 test trees, new `compiler/tests/helpers/extract-user-fns.js`, `SCRML_NO_ELIDE` env var, S28 elision feature, S27 replay feature, S27 audit completeness, S29 self-host bpp.scrml parity.
**Suggested disposition:** update in place — this is the live inventory and S27/S28 shipped significant content.

### compiler/SPEC.md.pre-request-patch
**Reason:** name-heuristic (`-patch` suffix suggests working copy backup) + content-heuristic + location
**Detail:** 12,414-line file modified 2026-04-11 (8 days before this scan). Front-matter references "docs/spec-issues/SPEC-AMENDMENTS-2026-04-02.md" and "docs/changes/spec-s37-amendments/spec-amendments.md" — paths that no longer exist in-repo. This is a pre-amendment snapshot of SPEC.md from before §51.3.2 migration, §51.5 elision, §51.11 audit, §51.12 temporal, §51.13 projection, §51.14 replay, and S25/S26/S27/S28 spec amendments landed. The current SPEC.md is 20,071 lines and authoritative. Leaving this file next to SPEC.md is a trap for any agent that grep-searches both.
**Suggested disposition:** deref to scrml-support/archive/spec-drafts/ with the original filename preserved, OR delete outright (git history preserves it).

### docs/changelog.md
**Reason:** grep-mismatch (minor — otherwise compliant)
**Detail:** Baseline line correctly reads "2026-04-19 after S28 ... 7,183 tests passing / 10 skipped / 2 failing" — matches current reality. However, the doc does not yet mention the S29 commit at 74303d3 (compiler/self-host/bpp.scrml port). Also, the "In Flight" section is not present / was removed; check whether the doc is meant to track in-flight items (it used to).
**Suggested disposition:** append a brief S29 entry once the AST-builder component-def bug fix lands. Otherwise compliant — this is routine drift between session close and next session open.

---

## Uncertain docs (needs human review)

### docs/SEO-LAUNCH.md
**Reason:** uncertain — working doc uncommitted 5 sessions running
**Detail:** 178 lines, last modified 2026-04-19 14:14, uncommitted on main (`git status M`). Per hand-off.md this is "the same untouched edit, 5 sessions running." The doc itself is a working checklist for ranking `scrml` on Google. It is a planning/ops doc, not a code-reality claim. Safe to leave. But by the "current truth only" principle, a doc that has been uncommitted-and-untouched for 5 sessions may want to either land or deref.
**What to check:** Ask the user whether the SEO work is live or dormant. If dormant, either commit the current state or move the doc into scrml-support/. If live, move it into a session's work.

### benchmarks/fullstack-react/CLAUDE.md
**Reason:** uncertain — framework-comparison dir, but claude-code-specific instructions dropped into it
**Detail:** File begins `Default to using Bun instead of Node.js.` — a Claude Code system-instruction-style file inside a framework-comparison directory. Not a scrml feature claim; it is agent-tooling configuration for that sub-benchmark. Per scope rules, framework comparison dirs are out-of-scope. But the presence of a CLAUDE.md in the benchmark tree is unusual and may either (a) be an artifact of a previous agent session that should be cleaned up, or (b) legitimately scope agents into bun-only when exploring that benchmark.
**What to check:** Confirm with user whether this is intended tooling configuration or a leftover artifact.

---

## Compliant docs (no action needed)

- README.md — current (2026-04-18); "Components with props and slots" line (line 271) correctly says `const Card = <div>` defines a component (markup RHS).
- pa.md — current agent directives.
- hand-off.md — live S29 session hand-off.
- docs/lin.md — current (2026-04-18); `lin` keyword usage guide, matches §35.
- docs/tutorial.md — current (2026-04-18); "Layer 2 Components" section describes `const Card = <div class="card">...</>` correctly as markup-RHS component definition (line 686, 714, 738, 771, 951). Line 1616 cheatsheet also uses markup-RHS form. Tutorial does NOT claim non-markup RHS produces components — so tutorial is correct and the ast-builder heuristic is what drifted from the documented contract.
- docs/changelog.md — S28 covered; see non-compliant note above for S29 follow-up.
- scrmlFormula.md — creative/reference, no code claims.
- DESIGN.md — rationale doc; aligns with current contracts.
- compiler/SPEC.md — authoritative (20,071 lines). §15.6 at line 6370 says `const Name = <element ...>` defines a component; §51.3.2 opener migration, §51.5.2 elision amendment, §51.13.1 phase 7, §51.14.6 E-REPLAY-003 all present.
- compiler/SPEC-INDEX.md — 148 lines, current.
- compiler/PIPELINE.md — 1,630 lines, Stage 3.2 CE documents component-def consumption invariant.
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
- handOffs/**/*.md (29 historical hand-offs; intentional archive)
- archive/**/*.md (none present)
- benchmarks/todomvc-react/README.md, benchmarks/todomvc-svelte/README.md (framework comparison dirs)
- benchmarks/fullstack-react/*.md (except CLAUDE.md flagged above as uncertain)
- samples/compilation-tests/**/*.md (fixture corpus)

---

## Actionable this session (S29)

1. **master-list.md** — refresh the header line, gauntlet-s24 through gauntlet-s28 inventory, SPEC.md line count (20,071), PIPELINE.md line count (1,630), codegen LOC (add ~800 since S21 in emit-machines + emit-machine-property-tests), and self-host bpp.scrml line count (232). Low-risk chore that also serves as the S29 close-state snapshot.
2. **compiler/SPEC.md.pre-request-patch** — move to scrml-support/archive/spec-drafts/ or delete. Having a 12,414-line pre-amendment SPEC snapshot sitting next to the 20,071-line authoritative SPEC is a real trap for grep-based agents.
3. **AST-builder component-def bug** (not a doc issue, but relevant to this refresh) — see primary.map.md and domain.map.md. Fix surface is narrow at ast-builder.js:3634 (require RHS to start with `<`), but tab.test.js:649-654 explicitly encodes the bug as expected behavior and must flip sign in the same commit. Self-host modules (ast.scrml, ts.scrml, meta-checker.scrml, cg-parts/section-assembly.js) carry mirror heuristics and must update in lockstep. All downstream call sites identified in domain.map.md already have defensive guards or treat component-def as pass-through — no wide codegen refactor expected.

## Tags
#non-compliance #project-mapper #cleanup #scrmlTS #s29 #component-def-bug #spec-drift

## Links
- [primary.map.md](./primary.map.md)
- [domain.map.md](./domain.map.md)
- [error.map.md](./error.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
