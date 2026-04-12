# Pre-Snapshot: expr-ast-phase-2-slice-3

Captured before any compiler source change. Branch `changes/expr-ast-phase-2-slice-3` @ 5ecee0e.
Bun runtime: v1.3.0 (note: brief mentioned 1.3.6 segfault risk; local is 1.3.0, no segfault observed).

## Unit suite — `bun test compiler/tests/unit`

- 4902 pass
- 3 fail (pre-existing)
- 2 skip
- 21809 expect() calls
- 148 files

### Pre-existing unit failures (must not regress, must not be affected by Slice 3)

1. `if-as-expression > if as statement (not after =) still works as if-stmt`
2. `§E runTS importedTypesByFile parameter > §E1 file without imports is unaffected by importedTypesByFile`
3. `§E runTS importedTypesByFile parameter > §E2 multiple files — each gets its own importedTypes slice`

## Integration suite — `bun test compiler/tests/integration`

- 96 pass
- 0 fail
- 0 skip
- 179 expect() calls
- 5 files

### Discrepancy from brief

PA brief stated baseline was "94 integration pass / 2 pre-existing fails (self-host-smoke
`tab.js exists` and `api.js exports compileScrml`)." Local run shows 96/0. Self-host-smoke
appears to be passing fully here. Either the brief baseline is stale, or the failing
self-host tests have been fixed since the brief was written. Slice 3 must keep this at
96/0/0.

## Scenario 2 baseline (the contradiction case)

Already passing pre-fix via the Pass-2 string-scan dedup quirk described in the impact
analysis. After the fix it must still pass, but via the cross-node E-LIN-002 path
(three separate parser nodes, each issuing its own consumeLinRef call).

## Tags
#scrmlTS #expr-ast #slice-3 #pre-snapshot

## Links
- [impact-analysis.md](./impact-analysis.md)
- [progress.md](./progress.md)
