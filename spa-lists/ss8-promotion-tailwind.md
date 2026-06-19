# sPA ss8 — promotion-tailwind

**Launch:** `read spa.md ss8` · **Branch:** `spa/ss8` · **Worktree:** `../scrml-spa-ss8`

## Shared ingestion
Two single-file utility-codegen surfaces sharing the "narrow ergonomic codegen engine" shape:
`tailwind-classes.js` (the whole utility-class engine — arbitrary/transform/filter/gradient/`var()`
composition all in one file, Approach C inline-fallback ruled S191) and `commands/promote.js` (the
Tier-1→2 `<match>`→`<engine>` rewrite stub). Threads: the §26 Composing-Utilities `var()` model + §26.5
Open Items; the §56 promotion-ergonomics mechanical-rewrite precedents (`--match`/`--each` shipped);
staleness-correction (variant prefixes + arbitrary values already shipped S49).

## Core files
`compiler/src/tailwind-classes.js` · `compiler/src/commands/promote.js` · `compiler/SPEC.md` (§26 / §56)

## Items (least-ingestion-first)
1. **`tailwind-utility-engine-narrower`** `[open]` feature n-a · tier med — STALE (SPEC-ISSUE-012): variant prefixes + arbitrary values shipped S49; only §26.5 Open Items (`group-*`/`peer-*`/custom-theme) remain deferred. Currency-correct + scope the remainder. Entry: tailwind-classes.js + collect-class-names.ts.
2. **`bug-1`** `[open]` feature MED · tier med — Tailwind arbitrary-value classes partial-impl; P2/P3 landed S191 via inline-fallback `var()` (Approach C). Remaining: close P2 gradient + P3 transform + P4 filter/backdrop + safelist/string-shaped. Entry: tailwind-classes.js.
3. **`bug-20`** `[open]` feature LOW · tier med — `bun scrml promote --engine` (Tier-1→2 `<match>`→`<engine>` lift) deferred (prints a stub at ~1536, flag parse ~132); pairs with a not-yet-existing `W-MATCH-TRANSITIONS-ACCRUING` lint (needs §34 row). Mirror shipped `--match`/`--each`. Entry: commands/promote.js.

## Progress
`ss8.progress.md`. Land on `spa/ss8`; ping PA inbox when ready. Do not advance main / do not push.
