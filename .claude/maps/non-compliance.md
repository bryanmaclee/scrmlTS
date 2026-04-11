# non-compliance.md
# project: scrmlTS
# generated: 2026-04-10T22:00:00Z
# scan mode: FULL_COLD_START

## Summary

Total docs scanned: 11
Compliant: 11
Non-compliant: 0
Uncertain: 0

## Scope of Scan

Scanned all `.md` files in the repo, excluding: `node_modules/`, `.git/`, `handOffs/`,
`benchmarks/todomvc-react/`, `benchmarks/todomvc-svelte/`, `benchmarks/todomvc-vue/`,
`benchmarks/fullstack-react/`, `.claude/`.

Docs evaluated:
1. `pa.md` — directives match current repo state. Compliant.
2. `master-list.md` — inventory matches code on disk (verified spot-checks: section A pipeline stages, section H editors, section I stdlib modules, section J dist). Compliant.
3. `hand-off.md` — session 2 state; describes completed work. Compliant.
4. `README.md` — updated S2; matches quickstart commands and layout. Compliant.
5. `compiler/SPEC.md` — authoritative. Compliant.
6. `compiler/SPEC-INDEX.md` — quick-lookup companion to SPEC. Compliant.
7. `compiler/PIPELINE.md` — stage contracts. Compliant.
8. `compiler/src/codegen/README.md` — updated S2 to 34 modules; matches current `codegen/` directory (34 files confirmed). Compliant.
9. `editors/neovim/README.md` — updated S2; tree-sitter section references `queries/scrml/highlights.scm` which exists. Compliant.
10. `examples/README.md` — sigil cheatsheet and example list match current `examples/` directory (14 files, bug status on 12 and 13 matches master-list §E). Compliant.
11. `benchmarks/RESULTS.md` — benchmark data dated 2026-04-05; describes measured results, not aspirational. Compliant.

## Non-compliant docs

None found.

## Uncertain docs (needs human review)

None.

## Notes

The three docs dereffed to `scrml-support/archive/` in Session 2 (match-codegen-fix progress,
sample-suite progress, developer-notes) are confirmed absent from the repo. They are not listed
above because they are no longer in scope.

The `scripts/` directory contains 24 utility scripts, several with names suggesting historical
patch operations (`apply-r21-feature-patches.py`, `apply-s37-patches.sh`, `splice-section-18.js`,
etc.). These are `.js`/`.py`/`.sh` files, not `.md` docs, so they fall outside the doc
non-compliance scan. A human should review whether they are still executable/useful or should
be removed. This is flagged as a low-priority cleanup item, not a non-compliance finding.

## Tags
#non-compliance #project-mapper #scrmlTS #cold-run #current-truth-only #cleanup

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [hand-off.md](../../hand-off.md)
