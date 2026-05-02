# P3.A — Pre-Snapshot

**Date:** 2026-05-02
**Branch:** `changes/p3.a`
**Base commit:** `4a36ae3` (S53 main tip post-P3.B-merge)

## Baseline test state

`bun run test` from worktree root: **8512 pass / 40 skip / 0 fail / 416 files**.

(`bun test` directly from `compiler/` shows fails because the `pretest` sample-compile script
must run first. Always invoke via `bun run test` from worktree root.)

## Scope of this change

Architectural close of **F-CHANNEL-003** — cross-file `<channel>` inline-expansion via
**CHX (CE phase 2 under UCD)** per the P3 deep-dive:

- TAB recognizes `export <channel name="X" attrs>{body}</>` at top level → synthesizes
  paired `ChannelDeclNode` + `ExportDeclNode`.
- MOD registers channel exports with `category: "channel"` in `exportRegistry`.
- NR resolves cross-file channel references with `resolvedKind: "user-channel"`,
  `resolvedCategory: "channel"`.
- CE (renamed conceptually to "State-Type Expander" under UCD) gains Phase 2
  (`expandChannels`) that inlines cross-file channel bodies at import-reference positions.
- New `state-type-routing.ts` documents which paths route via `isComponent` legacy vs
  `resolvedCategory` new.
- Channel codegen unchanged (per W6 insight: wire layer + IIFE pattern are unchanged
  whether channel was inlined locally or imported).

## Pre-existing test failures recorded as not-regressions

None. The 8512-pass baseline is fully clean.

## Dispatch app channel-decl sites (NOT touched in P3.A)

15 channel decls across 12 dispatch app pages (per FRICTION.md §F-CHANNEL-003). Full
adopter sweep deferred to P3.A-FOLLOW T1-small dispatch.

## Diagnosis test (will be added)

Synthetic cross-file channel demonstrating F-CHANNEL-003 fails today (consumer imports
channel from another file → today errors out with E-EXPORT or E-IMPORT or silent failure).
After P3.A: same fixture compiles and emits the expected wire-layer subscription.

## Tags

#p3-a #pre-snapshot #cross-file-channel #f-channel-003 #scrmlTS

## Links

- [P3 dive](file:///home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/p3-cross-file-inline-expansion-2026-05-02.md)
- [progress.md](./progress.md)
