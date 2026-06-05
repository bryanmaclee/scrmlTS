# TASK — native parser: `<tableFor>` drops struct columns (silent miscompile)

Native-parser-swap parity-closer (~21 flip-failures unit+integration). Under native, `<tableFor for=T rows=@cell>` SILENTLY MISCOMPILES — emits only SOME struct columns (tableFor-basic.scrml: default 5 `<th>` / native 2). Compiles clean; HTML byte-differs (S139/S163 silent-miscompile — verify EMIT, not error-absence).

change-id: `native-tablefor-struct-field-drop-2026-06-04`

## Symptom (PA-reproduced)
samples/compilation-tests/tableFor-basic.scrml: default 5 `<th>`, native 2 `<th>`, both exit 0. (07-admin-dashboard.scrml + 27-type-derived-table.scrml also use tableFor.)

## PHASE 0 — pin ROOT + single-vs-multi (triage loci unreliable: F2's was wrong)
Candidates: (a) struct TYPE-def field capture — test the SAME struct in a NON-tableFor context (field access / formFor / schemaFor); if those ALSO drop fields → GENERAL struct-def gap (cross-cutting, STOP — different/bigger dispatch). (b) `<tableFor>` markup-element parse. (c) tableFor expansion / column iteration (emit-table-for.ts or native input). Dump native AST/engineMeta for the tableFor + struct; find where field count goes 5→2; name locus (file/fn/line) + live mirror. GATE: clean-single tableFor-scoped → PROCEED; general struct-def gap OR ≥2 roots → STOP+report.

## Implementation (if PROCEED)
Fix native field-capture so `<tableFor>` emits ALL columns (match live). Localized. Fix where fields are dropped (don't touch codegen expander if gap is upstream). `.scrml` mirrors FEATURE-stale — `.js` only.

## TESTS
Native test: tableFor over multi-field struct → all columns (count==default). Pre-commit subset 0-fail. Within-node 1005/0 (rebump benign only; FLAG non-benign).

## PHASE 3 — R26 (byte-compare EMIT — SILENT MISCOMPILE)
tableFor-basic.scrml + ≥1 other: default+native compile, diff -r BYTE-IDENTICAL, native `<th>` count == default, node --check exit 0. DO NOT mark DONE without R26 byte-identical. Drift → report.

## Startup
isolation:worktree; merge 7e54f321 at startup. F4/S99/S126; Bash-edit; no `--no-verify`; S83; progress.md.

# FINAL REPORT (data): WORKTREE/FINAL_SHA/BRANCH/FILES_TOUCHED/merge-confirm · Phase-0 ROOT + single/multi + GATE · what changed · test delta + within-node + flags · R26 verbatim (byte-diff + th-count) · maps feedback + locus correction
