# Progress: f-component-001

- [start] Branch `changes/f-component-001` created from main fdc9795
- [start] Pre-snapshot: bun test 8039 pass / 40 skip / 134 fail / 385 files (134 fails are pre-existing — network-dependent runtime tests, not related to CE/component-expander)
- [phase 1] Reproduced E-COMPONENT-020 with bare `lift <UserBadge/>` in /tmp/comp-repro/no-args.scrml
- [phase 1] Reproduced "wrapped works" with /tmp/comp-repro/wrapped.scrml — compiles cleanly
- [phase 1] Added diagnostic logging to component-expander.ts
- [phase 1] **Found: cross-file imported components don't actually expand in production at all.**
  - exportRegistry keyed by absolute path, but CE looks up by raw `imp.source` (relative path)
  - "Wrapped works" only works because CE early-returns (hasAnyComponentRefsInLogic doesn't recurse into lift-expr markup children)
  - Output is phantom `document.createElement("UserBadge")` in BOTH wrapped and (would-be-bare) cases
  - The bare case is "louder" because hasAnyComponentRefsInLogic checks lift's direct markup target
- [phase 1] Restored CE backup, confirmed clean state still reproduces E-020 with no source changes
- [phase 1] Confirmed M2 dispatch app workaround also produces phantom output (`document.createElement("LoadCard")`)
- [phase 1] Decision: **BLOCKED — needs deep-dive.** Not narrow. Architectural across CLI / module-resolver / CE.
- [phase 1] Wrote diagnosis.md with full root-cause trace and recommended deep-dive scope
- [phase 1] Final state: NO source changes; only artifact docs added.
- [phase 1] Final test counts (pre-commit hook): 7447 pass / 30 skip / 0 fail / 357 files — unchanged from baseline since no source changed
