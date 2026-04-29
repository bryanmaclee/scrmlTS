# Pre-Change Snapshot — tailwind-arbitrary-values-and-variants

**Branch:** `changes/tailwind-arbitrary-values-and-variants`
**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa60b1c0c3f006792`
**Recorded:** 2026-04-29 (S49 dispatch)

## Test Suite Baseline (full)

```
Ran 1804 tests across 381 files. [1405.00ms]
1380 pass
   8 skip
 416 fail
 279 errors
13606 expect() calls
```

The 416 fails + 279 errors are **pre-existing**, unrelated to tailwind utility work. They are dominated by `If Basic (control-001)`, `If-Else (control-002)`, `If Reactive (control-011)`, gauntlet-s25 unhandled errors, and similar control-flow / sample-suite tests. None touch `compiler/src/tailwind-classes.js` or its `compiler/tests/unit/tailwind-classes.test.js`.

## Test Suite Baseline (tailwind-only)

```
Ran 100 tests across 1 file. [29.00ms]
100 pass
  0 fail
253 expect() calls
```

100 passing tests in `tests/unit/tailwind-classes.test.js`, organized in §1–§18.

## File Sizes (before)

- `compiler/src/tailwind-classes.js` — 753 LOC
- `compiler/tests/unit/tailwind-classes.test.js` — 621 LOC
- `compiler/SPEC.md` — 20,442 LOC; §26 starts line 11626; §26.3 lines 11639–11643; §34 error index line 12045

## Existing Variant Surface (per recon §3, verified)

- `RESPONSIVE_BREAKPOINTS` (line 582): 5 keys — `sm`, `md`, `lg`, `xl`, `2xl`
- `STATE_PSEUDO_CLASSES` (line 594): 11 keys — `hover`, `focus`, `active`, `disabled`, `first`, `last`, `odd`, `even`, `visited`, `focus-within`, `focus-visible`
- `parseClassName` (line 631): splits on `:`, picks one responsive + one state, last segment is base
- `getTailwindCSS` (line 659): wraps in `:pseudo`, `@media (min-width:...)`, returns `null` on miss
- Tests §13 cover responsive (5 cases + null-on-unknown). §14 cover 4 of 11 state pseudo-classes. §15 cover 2 stacked combinations.
- Untested but registered: `first`, `last`, `odd`, `even`, `visited`, `focus-within`, `focus-visible` (7 backfill targets per recon §4.2)

## Existing Arbitrary-Value Surface

- **None.** `parseClassName` does not handle `[...]` syntax; `getTailwindCSS("p-[1.5rem]")` returns `null`. No tests reference arbitrary values. No samples use them.

## Spec Alignment (§26.3 current)

```
### 26.3 Open Items

- Arbitrary values (e.g., `p-[1.5rem]`) — TBD (SPEC-ISSUE-012)
- Responsive and variant prefixes (e.g., `md:`, `hover:`) — TBD (SPEC-ISSUE-012)
- Custom theme configuration — TBD (SPEC-ISSUE-012)
```

The variant-prefixes "TBD" line is **stale** — variants are partly shipped already.

## E-TAILWIND-* code namespace

No existing entry. E-TAILWIND-001 is free for the validation-error code minted in commit 1.
