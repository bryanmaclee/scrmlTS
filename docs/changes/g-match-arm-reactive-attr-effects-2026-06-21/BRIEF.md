# Fix: g-match-arm-drops-reactive-attr-class-effects (HIGH) — change-id g-match-arm-reactive-attr-effects-2026-06-21
Dispatched S212 2026-06-21 · scrml-js-codegen-engineer · isolation:worktree · opus · agent a0f78a14d422ae109 · base session-start 6d8a47ab → merge origin/main 09cc6b21 (S112)

Root: the match-arm-block render path (emit-control-flow.ts ~1681-1794) renders the arm body to a template
string with reactive-attr/class placeholders (data-scrml-attr-tpl-style, data-scrml-class-*) but skips the
_scrml_effect emission the top-level path (emit-bindings.ts/emit-html.ts) does → dead bindings. Same arm-body
blind-spot FAMILY as the resolved tailwind bug (different pass: class-scan vs reactive-attr-effect) + the
nested-each fix (arm/iteration render = incomplete emitter). FIX: arm-render collects + emits _scrml_effect for
its arm-body reactive-attr/class/style bindings, registered at arm-mount (mirror top-level path + per-mount
effect registration). SCOPE-FIRST: check <each> block-form bodies share the gap (report flag; fix both if so,
Rule 2/3) + generic reactive attrs. R26: emit-grep effect count rises 1→≥3 + happy-dom (bump moves INSIDE div +
toggles class:hidden). FULL bun run test; within-node unaffected. Full mandatory-block brief in transcript. PA lands S67.
