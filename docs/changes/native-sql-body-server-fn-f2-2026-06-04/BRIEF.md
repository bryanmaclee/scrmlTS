# TASK — native parser F2: `?{}` SQL body dropped in `server function` bodies (native-parser-swap parity-closer)

scrml is driving `--parser=scrml-native` to default. Closing F2 (~27 flip-failures across server-fn-star-sql / sql-loop-hoist / inline-sql-in-branch-cps): native DROPS the `?{...}` SQL body inside `server function` bodies → emitted server JS has ZERO `_scrml_sql` → `E-PA-002` (route/pipeline analysis can't find the CREATE TABLE / query).

change-id: `native-sql-body-server-fn-f2-2026-06-04`

## Symptom (PA-reproduced)
Top-level `server function` with `?{...}`: DEFAULT clean (server.js has `_scrml_sql`); NATIVE drops the SQL body → 0 `_scrml_sql` → E-PA-002 ×2.

## ⚠ MULTI-CONTEXT RISK — PHASE 0 SURVEY-STOP GATE
F2 spans multiple `?{}` contexts (may be one root or several): top-level server fn; `server function*` generator (yield ?{} + while); `?{}` in a LOOP; `?{}` in an if-BRANCH/CPS. The log shows `Arrow`/`RBrace`/`no statement begins here` on some F2 fixtures — possibly distinct gaps AROUND the SQL, not the body-drop. Phase-0: reproduce each context (default-clean/native-fail), determine same-root vs distinct-root. GATE: all-share-one-root → PROCEED (fix + R26 all); ≥2 distinct roots → STOP+report decomposition (don't half-fix a multi-gap family). Record the context matrix.

## Locus (triage-pointed; confirm)
`compiler/native-parser/parse-sql-body.js` — native `?{...}` SQL-body parser; triage found it drops the body in top-level server fns. LIVE captures the `?{}` body via BS (§44.8 bracket-matched `?{` scanner). Mirror live capture.

## Implementation (shared-root contexts only if PROCEED)
Fix native `?{}` SQL-body capture so body content survives to emit (matching live `_scrml_sql` lowering). Localized. Don't touch codegen/route-analysis (E-PA-002 clears once SQL present). `.scrml` mirrors FEATURE-stale — fix `.js` only.

## TESTS
Native-path: server fn with `?{}` → SQL captured (no E-PA-002; `_scrml_sql` present), cover each fixed context. Pre-commit subset 0-fail. Within-node 1005/0 (rebump benign only; FLAG non-benign).

## PHASE 3 — R26 (byte-compare EMIT) on fixed contexts
Find real repo fixtures (server-fn-star-sql-r25-bug-42 / sql-loop-hoist-rewrite / inline-sql-in-branch-cps) or minimal repros. Per fixed context: default+native compile to /tmp, diff -r BYTE-IDENTICAL, `_scrml_sql` count >0 == default, node --check exit 0, E-PA-002 == 0. DO NOT mark DONE without R26 byte-identical on every claimed-fixed context. Unfixed/distinct-root contexts → report residual.

## Startup
isolation:worktree; merge 649f4ef8 at startup (base origin/main f11db672, behind local). F4/S99/S126 path discipline; Bash-edit; no `--no-verify`; S83; progress.md.

# FINAL REPORT (data): WORKTREE/FINAL_SHA/BRANCH/FILES_TOUCHED/merge-confirm · Phase-0 context matrix + GATE decision · what changed · test delta + within-node + flags · R26 verbatim per fixed context · residual contexts · maps feedback
