# sPA ss7 — meta-reflect-l22

**Launch:** `read spa.md ss7` · **Branch:** `spa/ss7` · **Worktree:** `../scrml-spa-ss7`

**Fill:** ~45% · `at-ceiling` (design forks `compiler.*`/`variantNames`/`serialize`/serializability routed to Bucket B)

## Shared ingestion
L22 meta layer: `reflect()`/`^{}` compile-time meta-eval + the happy-dom mount path for meta-heavy
samples. Shared loci: `meta-checker.ts` (reflect `.variants` build paths + meta-eval) and the
render-harness mount path. The reflect-variant shape bug and the rails-dev mount hang are both
reachable from `meta-checker` + the meta-eval/mount understanding. (Design forks
`compiler.*`/`variantNames`/`serialize` routed to Bucket B.)

## Core files
`compiler/src/meta-checker.ts` · `samples/gauntlet-r18/rails-dev.scrml` · `compiler/tests/e2e-render-map/render-harness.js`

## Items (least-ingestion-first)
1. **`g-reflect-variant-shape-inconsistent`** `[status=landed-on-branch]` LOW · tier low — `reflect()` returns enum `.variants` with inconsistent element shape across internal paths (string vs `{name}`). meta-checker.ts builds `.variants` THREE ways: :1463-1464 maps to bare strings; :2041/:2209 build `{name}` objects; type decl :264 admits the union `Array<string|{name:string}>`. Compile-time `^{}` `reflect(Status).variants` returns STRINGS (matching §14.4.2 `EnumType.variants`=name strings) so a consumer writing `${v.name}` silently gets undefined. status=open verified HEAD (:264 union confirmed).
   > **Brief seed:** Pick ONE canonical shape (strings, per §14.4.2) across all three reflect `.variants` paths in meta-checker.ts (:1463/:2041/:2209), or document the union explicitly. Strings is the standing-spec answer. R26 a consumer `${v.name}` case.
   > **LANDED** `spa/ss7@2c0a9e17` (S211). Real divergence was at the **runtime** emit: `emit-logic.ts` `serializeTypeEntry`:644 emitted `{name}` while compile-time reflect (:1463) + §14.4.2 + ALL corpus consumers use bare strings (and `serializeTypeEntry` dropped `payload` anyway, refuting the extensibility hypothesis). Fix: runtime emit → bare strings (union-robust); flipped the one locking test. Brief-seed loci were slightly off (meta-checker builders vs the actual emit-logic emitter) — R4 trace corrected it. `runtime-meta-integration.test.js` (runtime pass-through of a hand-built fixture, not the emitter) left untouched. Agent af0182404c6565617, src `e0af8314`, full suite 24762/0.
2. **`g-mount-hang-rails-dev`** `[status=parked → PA]` — RECLASSIFIED + MIS-CLUSTERED (see escalation). The brief-seed framing is WRONG on both axes: it is NOT a 0%-CPU mount-time await hang. R26 repro: the **COMPILE itself infinite-loops at 100% CPU** (timeout-killed, exit 124; never reaches mount), in the **meta-eval re-parse** path. emit() output is re-parsed at the "ME" stage via `meta-eval.ts:380 nativeParseFile(...)`; malformed emitted markup normally ERRORS cleanly (`E-META-EVAL-002`) — confirmed across 8 reduced reproducers (A/B/C/D/G/H/I/J all error) — but the full `rails-dev.scrml` drives the **native parser** into a non-terminating loop. The loop is inside `nativeParseFile` (native-parser/), NOT in meta-checker/render-harness. → cross-ingestion (this is **ss4** native-parser territory) + a **robustness-class bug** (compiler hangs on malformed input), not "low urgency."
   > **Escalation → PA:** re-cluster into ss4 (native-parser non-termination). Re-prioritize above "low urgency" — a parser that infinite-loops on any input can hang the whole compiler via the meta-emit path. Reliable repro: `samples/gauntlet-r18/rails-dev.scrml` (`timeout 60 bun run compiler/src/cli.js compile … -o /tmp/x/` → exit 124, 100% CPU). Minimal repro elusive (needs the full sample's specific block accumulation; single sections/blocks error cleanly). Fix target: native parser/lexer must TERMINATE with a clean error like the simpler cases, never loop. Findings archived `docs/changes/ss7-rails-dev-hang/FINDINGS.md`.

## Progress
`ss7.progress.md`. Land on `spa/ss7`; ping PA inbox when ready. Do not advance main / do not push.
