# sPA ss2 — engine-codegen-statechild

**Launch:** `read spa.md ss2` · **Branch:** `spa/ss2` · **Worktree:** `../scrml-spa-ss2`

## Shared ingestion
The engine surface: `symbol-table.ts` engine-decl parse (serverSource ~:5204, openerEffect raw-text
capture), `emit-engine.ts` codegen (`emitEngineServerSourceHydration` ~:1791, state-child body render),
and §51.0 engine semantics (A/B/E/F/H/I). Shared facts: engine-decl attrs are parsed-and-sometimes-
dropped at SYM; opener effects are raw text (no walkable stmt list); the §52 Tier-2 read-into-engine-cell
path is unbuilt. The `:`-shorthand interp codegen bug also lives in `emit-engine.ts`.

## Core files
`compiler/src/symbol-table.ts` · `compiler/src/codegen/emit-engine.ts` · `compiler/src/engine-graph.ts` · `docs/known-gaps.md`

## Items (least-ingestion-first)
1. **`engine-boot-effect-invalid-transition`** `[landed-on-branch]` (agent 100447ff) bug LOW · tier med — illegal boot-effect transition (target ∉ initial.rule) unchecked; openerEffect captured as raw text at SYM. Wire §51.0.H Form-3 opener-effect write-validation vs `.<initial>.rule`. Entry: `engine-opener-effect-c1.test.js:232-255` + symbol-table.ts/engine-graph.ts; likely lands at type-system.ts.
2. **`g-engine-server-flag-silent-swallow`** `[open]` bug MED · tier med — `<engine ... server ...>` silently swallows the bare `server` flag (no =@source); should fire a new `W-ENGINE-SERVER-DEFERRED` lint. S199 E-leg `server=@source` IS wired. Entry: symbol-table.ts(serverSource :5204) + emit-engine.ts:1791.
3. **`type-system-payloadbindings-dedup`** `[in-flight]` experiment LOW · tier med — engine state-child reserved-attr/structural-tag sets duplicated; retire via `entry.payloadBindings` (B15 walker) + a shared `engine-statechild-grammar.ts`. Entry: type-system.ts:95 (TODO), sets :101-106/:108.
4. **`g-shorthand-interp-engine-element-loci`** `[in-flight]` bug MED · tier med — `${...}` in `:`-shorthand display-text at ENGINE state-child (§51.0.I) + §4.14 ELEMENT loci mishandled (body dropped). Mirror the resolved match-arm pattern (`emit-match.ts displayTextLiteralInner :545`). Entry: emit-engine.ts + emit-html.ts.
5. **`engine-component-scope-b17-e2e-deferred`** `[open]` bug LOW · tier high — 8 B17 engine-in-component e2e cases skipped; engine-decl in defChildren + `<onTransition>` placement validation unwired (parser doesn't produce engine-decl in component-def body). Entry: `engine-component-scope-b17.test.js:259-324` + symbol-table.ts + ast-builder.js.

## Progress
`ss2.progress.md`. Land on `spa/ss2`; ping PA inbox when ready. Do not advance main / do not push.
