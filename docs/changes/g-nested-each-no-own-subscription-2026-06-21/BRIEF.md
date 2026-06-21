# Fix: g-nested-each-no-own-subscription (HIGH) — change-id g-nested-each-no-own-subscription-2026-06-21
Dispatched S212 2026-06-21 · scrml-js-codegen-engineer · isolation:worktree · opus · agent a0374ad6cfe9b41de · base 87e0f98a

Root (emit-pinned): a nested <each in=@inner> inside an OUTER <each> per-item body (emit-each.ts) is emitted as a
ONE-SHOT inline IIFE — reads reactive_get("inner") once at outer-render, sets data-scrml-each-mount, but is NEVER
registered in _scrml_each_renderers[] nor wrapped in _scrml_effect_static → no subscription to its own cell →
silent empty render on post-mount inner-cell updates. Top-level multi-consumer + top-level hidden BOTH wire
correctly; nesting is the trigger. SCOPE-FIRST complication briefed: N inner mounts share one each-id (one per
outer item) so the top-level querySelector pattern doesn't generalize — agent to pick per-instance-id /
querySelectorAll-renderer / in-closure-subscription, and REPORT scoping (commit WIP) rather than ship a band-aid
if architectural. R26: emit shows inner each registered+subscribed + a happy-dom render check (load() sets @shared
post-mount → inner items render in each card). FULL bun run test; within-node unaffected. Full mandatory-block
brief as dispatched verbatim in the transcript. PA lands via S67.
