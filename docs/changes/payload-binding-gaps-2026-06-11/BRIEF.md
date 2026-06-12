# TASK — fix two variant-payload binding gaps in the typer (Gap 1 + Gap 2)

Change-id: `payload-binding-gaps-2026-06-11`. SCOPE at the change-dir. Both = typer scope-registration misses in `compiler/src/type-system.ts`. User RATIFIED both design calls. Do both.

(Standard template: MAPS-first [watermark 1734b81b / HEAD cf954570], F4 startup-verify, S99/S126 Bash-edit path discipline, NO `--no-verify`, S136/S138/S83 — identical boilerplate to docs/changes/lifecycle-field-comment-leak-2026-06-11/BRIEF.md.)

## GAP 1 — `!{}` multi-field payload binding not scoped
`save() !{ | ::Conflict(field, detail) :> { log(field+detail) } | ::Gone :> {} }` (DbError::Conflict(field,detail)) → E-SCOPE-001 on field+detail. EXPECTED clean.
Root: type-system.ts:9282-9284 binds `arm.binding` as ONE name; the `!{}` parser (ast-builder.js ~11654) captures paren `::V(a,b)` as the comma-JOINED string `"a, b"` → `scopeChain.bind("a, b")` → individual a/b never resolve.
Fix (RATIFIED): at :9283 split `arm.binding` on `,` (trim/drop-empty), bind EACH. Paren `::V(a,b)` is §19.4.3 canonical — fix it. Do NOT extend the parser for space-multi `::V a b` (stays single-binding). Single-field `::V a` stays working.

## GAP 2 — `<match>` block-form payload binding not scoped (single + multi)
`<match for=R on=@r> <Done count> "got ${count}" </> ... </>` → E-SCOPE-001 on `count`. Contradicts PRIMER §6.2.
Root: JS-style match-arm-block (type-system.ts:9578-9590) registers each payloadBindings into the arm scope (WORKING); the `<match for=T>` BLOCK-form arms (match-statechild-parser MatchArmEntry, symbol-table.ts ~10494) don't reach that registration → typer scope-checks the body without bindings → E-SCOPE-001.
Fix (RATIFIED — wire it live): register block-form arm payload bindings into the arm-body scope, MIRROR the :9588 JS-style path. Multi-field positional (`<Conflict field detail>`) binds all, like engine state-child. Trace the exact block-form arm scope-check locus first.

## SCOPE GUARD
ONLY Gap 1 + Gap 2 in the typer. Do NOT touch working paths (JS-style match, engine state-child, single-field `!{}`) — verify green. Do NOT touch codegen unless tracing proves a companion is needed (report). Do NOT do Gap 3 (SPEC §41.13 doc — PA handles after this lands).

## TESTS
Gap 1: `::Conflict(field, detail)` both resolve; `::V a` + 3-field variant work. Gap 2: `<Done count>` + `<Conflict field detail>` resolve; match-002 sample compiles. Regression: JS-match + engine multi-field green. Cross-stream helper (S92). Full suite 0 regressions.

## R26 (before DONE)
Gap-1 `::Conflict(field,detail)` → 0 E-SCOPE-001 + usable; Gap-2 `<Done count>`/`<Conflict field detail>` → 0 E-SCOPE-001 + usable; node --check; single-field `!{}` + JS-match + engine still clean.

## FINAL REPORT
WORKTREE_PATH/FINAL_SHA/FILES_TOUCHED/BRANCH; Gap-1+Gap-2 loci + fix + why; before/after + regression checks; test counts; R26; codegen-companion?; maps line; deferrals.

---
NOTE: abridged from the verbatim Agent prompt for length; full dispatched prompt carried the complete MAPS/F4/S99-S126/S138/S83 boilerplate (identical to docs/changes/lifecycle-field-comment-leak-2026-06-11/BRIEF.md).
