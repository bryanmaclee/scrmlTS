# sPA ss12 — selfhost-mirror-parity

**Launch:** `read spa.md ss12` · **Branch:** `spa/ss12` · **Worktree:** `../scrml-spa-ss12`

> **Low priority** — mostly post-v1.0-deferred experiments. The self-host is a from-scratch
> human-authored showcase, NOT a mechanical TS port (memory `self_host_is_from_scratch`).

## Shared ingestion
The self-host scrml mirrors + bootstrap parity: `ast.scrml` (3792L) / `bs.scrml` / `ts.scrml` mirroring
`ast-builder.js` (16173L) / `block-splitter.js`; `self-host/api.js` (CE+ME un-ported imports :23/:31);
`cg.scrml` + section-assembly; the strict-rebuild gate (S81 conformance audit, 362 null/undefined
violations forbidden). Threads: self-host-is-from-scratch-showcase; the `rewriteNot`-not-running-in-
emit-library gap blocking the null→not migration; structural drift since S81; the v1.0+ re-mirror queue.

## Core files
`compiler/self-host/ast.scrml` · `compiler/self-host/api.js` · `compiler/src/ast-builder.js` · `docs/audits/self-host-spec-conformance-2026-05-11.md`

## Items (least-ingestion-first)
1. **`selfhost-s29-adjacent-bugs`** `[open]` bug n-a · tier med — 3 S29-surfaced self-host bugs (export class/function name+scope, const destructure fragmentation) in ast-builder.js + the TS scope walker. A RELATED S40 scope-walker fix (`64b2e54`, `extractDestructuredNames`) — verify overlap before re-dispatch. Entry: ast-builder.js + ast.scrml + type-system.ts.
2. **`self-host-ast-bs-parity-stale-mirror`** `[open]` experiment LOW · tier high — `ast.scrml`/`bs.scrml` mirrors structurally stale vs JS originals; 26 parity tests skipped pending v1.0+ re-mirror. `bs.scrml` holds 13 source-position null tokens now E-SYNTAX-042 (blocked: emit-library doesn't run `rewriteNot`). Entry: `ast.test.js:230` + bs.test.js + ast.scrml/bs.scrml.
3. **`self-compilation-l3-parity-gap`** `[open]` experiment LOW · tier high — Bootstrap L3 self-hosted compiler-compiles-compiler test skipped; strip-bug fixed S80 but L2/L3 parity unmet (21 parity assertions fail). Entry: `self-compilation.test.js:549` + self-host/api.js + cg.scrml.
4. **`selfhost-idiomification-ts-ast`** `[open]` feature n-a · tier high — idiomify `ts.scrml` + `ast.scrml` (~6,109 lines) off ~200+ null/!=null patterns to idiomatic scrml (human-authored showcase, NOT TS parity). Entry: ts.scrml + ast.scrml; S81 audit per-file null counts.
5. **`expr-ast-phase5-selfhost-parity`** `[open]` feature n-a · tier high — Structured Expression AST Phase 5 self-host parity (port ast.scrml to ExprNode). OVERLAPS heavily with idiomification (same file) — scope together. Entry: self-host/ast.scrml + expression-parser.ts.
6. **`selfhost-ce-me-port`** `[open]` feature n-a · tier high — port component-expander + meta-eval from TS to self-host .scrml (api.js imports them directly :23/:31). Entry: self-host/api.js + component-expander.ts + meta-eval.ts.

## Progress
`ss12.progress.md`. Land on `spa/ss12`; ping PA inbox when ready. Do not advance main / do not push.
