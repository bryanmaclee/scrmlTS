# scrmlTS — Session 12 Hand-Off

**Date:** 2026-04-13
**Previous:** `handOffs/hand-off-11.md`
**Baseline at start:** 6,000 pass / 145 fail across 6,145 tests (main @ `2204281`)

---

## Session 12 — in progress

### Commits
*(none yet)*

### Queued (carried from S11)
1. **Machine transition guards — function body threading.** `emitFunctions` in `emit-functions.ts` needs `machineBindings` from `buildMachineBindingsMap`. Export from `emit-reactive-wiring.ts`, call in `emitFunctions`, pass through `cpsOpts`. Small plumbing change.
2. **Example 11 remaining** — strip consumed const declarations from client JS; resolve reflect meta `${field.name}` interpolations as static text.
3. **Example 12 remaining** — CE doesn't expand `<Card>` inside `lift` (parser sees it as text); `actions` prop conditional + `showAll()` unresolved.
4. **Lin Approach B implementation** — spec amendments drafted, multi-session scope.
5. **README audit** — systematic read-through to catch remaining gaps.

---

## Tags
#session-12 #in-progress

## Links
- [handOffs/hand-off-11.md](./handOffs/hand-off-11.md) — S11 final
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
