# sPA ss7 — meta-reflect-l22

**Launch:** `read spa.md ss7` · **Branch:** `spa/ss7` · **Worktree:** `../scrml-spa-ss7`

## Shared ingestion
The `meta-checker.ts` `reflect()` / L22 type-as-argument machinery: the `ResolvedType.variants` shape
(declared `Array<string|{name}>` ~:264), `reflect()`'s three internal variant-build paths, the §53.14.4
family-discipline 4-gate synonym detection, and the §22.4 `compiler.*` reserved-namespace E-META-010
rejection (`meta-eval.ts` has zero `compiler.*` binding). Threads: which L22 members ship vs stash; how
§14.4.2 `EnumType.variants` static + §22 `reflect` already cover proposed members.

> **2 items ESCALATE (design, not execution):** the `compiler.*` API decision, the L22 tail members,
> and serialize are design-open (§53.14.4 gate) → surface to the PA, don't ratify. Only the 2 bugs are
> straight sPA work.

## Core files
`compiler/src/meta-checker.ts` · `compiler/src/type-system.ts` · `compiler/src/meta-eval.ts` · `docs/changes/serialize-scoping/SCOPING.md`

## Items (least-ingestion-first)
1. **`g-reflect-variant-shape-inconsistent`** `[open]` bug LOW · tier med — `reflect()` builds enum `.variants` with inconsistent element shape across its three internal paths (bare strings at :1463 vs `{name}` objects at :2041/:2209; type decl :264 admits both). Pick one canonical shape. Entry: meta-checker.ts.
2. **`g-mount-hang-rails-dev`** `[open]` bug LOW · tier med — `rails-dev.scrml` compiles fine but hangs at happy-dom mount (HARNESS-TIMEOUT, 0% CPU) — likely a `^{}` meta-eval loop or never-resolving mount effect. Entry: `samples/gauntlet-r18/rails-dev.scrml` + render-harness.js; investigate meta-eval path in meta-checker.ts.
3. **`oq-compiler-star-api-decision`** `[escalate]` experiment MED · tier med — **DESIGN:** implement a minimal read-only `compiler.*` API OR keep the reserved-rejection (E-META-010 :1817-1826 landed S48). Live decision, not a fix. Entry: meta-checker.ts → surface to PA.
4. **`l22-variantnames-reflective-metadata`** `[escalate]` feature n-a · tier high — **DESIGN:** do `variantNames` + reflective metadata earn L22-primitive status, or are they covered by shipped §14.4.2 `EnumType.variants` + §22 `reflect`? Each must pass the §53.14.4 synonym gate. Entry: meta-checker.ts + type-system.ts → surface to PA.
5. **`l22-serialize`** `[escalate]` feature n-a · tier high — **DESIGN:** serialize (STASHED S103) — §57 wire-format made it a likely synonym for `JSON.stringify(_scrml_wire_encode(v))`. Reviving needs a DD + documented trigger, not coding. Entry: serialize-scoping SCOPING.md → surface to PA.

## Progress
`ss7.progress.md`. Land on `spa/ss7`; ping PA inbox when ready. Do not advance main / do not push.
