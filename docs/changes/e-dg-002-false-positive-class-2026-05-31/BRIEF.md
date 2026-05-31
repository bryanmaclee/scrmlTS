# Dispatch BRIEF — E-DG-002 false-positive class

> Archived verbatim per pa.md S136. Dispatched S147 (2026-05-31) to `scrml-js-codegen-engineer`, `isolation:"worktree"`, background. Agent ID `ae60844ec0f682c88`. Closes S146 match-DG + R27 C9 (both PA-confirmed reproduce on HEAD `f444290a`).

---

# Task: E-DG-002 false-positive class — credit two under-counted reader loci

**Change-id:** `e-dg-002-false-positive-class-2026-05-31`
**Severity:** LOW (cosmetic — spurious warnings) but on the CANONICAL `<match on=@cell>` construct. Closes 2 ledger items (S146 match-DG + R27 C9).

`E-DG-002` ("Reactive variable `@x` is declared but never consumed") fires SPURIOUSLY on two real read loci the DG reader-accounting misses. Both pure consumption-tracker under-counts — codegen + runtime already correct.

## (A) Derived-cell RHS arrow-body read (C9)
```scrml
<program>
  <items>: int[] = [1, 2, 3, 4]
  <threshold> = 2
  const <filtered> = @items.filter(x => x > @threshold)
  <div>${@filtered}</div>
</program>
```
→ E-DG-002 on `@threshold` (read only inside the `.filter` arrow body; `@items` credited fine).

## (B) Block-form `<match on=@cell>` (S146)
```scrml
<program>
  type Phase:enum = { Idle, Busy }
  <phase>: Phase = .Idle
  <match on=@phase>
    <Idle>idle</Idle>
    <Busy>busy</Busy>
  </match>
</program>
```
→ E-DG-002 on `@phase` (consumed only by block-form match dispatch).

## HARD regression guard
Genuinely-unused must STILL fire:
```scrml
<program>
  <reallyUnused> = 5
  <div>hello</div>
</program>
```
→ keep E-DG-002 on `@reallyUnused`. Fix CREDITS specific loci; never blanket-suppress.

(Full discipline blocks — MAPS first-read, F4 startup verification, S99/S126 Bash-edit + no-cd path discipline, S83 commit discipline per sub-bucket, empirical verification of all 3 reproducers, final-report shape — were included verbatim in the dispatched prompt. Primary file `compiler/src/dependency-graph.ts`: `reactiveVarReaders` ~1650, E-DG-002 sweep ~2837, reuse `collectReactiveRefsFromExprNode` ~353 / `forEachIdentInExprNode` / `pushEdge(...,"reads")`. SB1 = derived-RHS arrow-body reads (investigate `forEachIdentInExprNode` recursion vs credit-caller; prefer narrowest fix; full suite if widening a shared helper). SB2 = markup block-form `<match on=>` consumption credit. SB3 = tests + the regression guard. Maps current for DG navigation — `dependency-graph.ts` untouched since the `948d3f2f` watermark.)
