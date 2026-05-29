# Gate-build — emitted-JS parse invariant (A+D) — BRIEF (archived per pa.md S136)

Dispatched S141 (2026-05-29) to `scrml-js-codegen-engineer`, `isolation: "worktree"`, model opus, background. Agent id `a477e98f2eba7effa`. Baseline HEAD `a4f79b2d` (v0.6.8, post-R27-fix-wave). change-id `gate-emitted-js-parse-invariant-2026-05-29`.

RATIFIED design (S141 user "Ratify A+D"). Design source: `scrml-support/docs/deep-dives/emitted-js-parse-gate-invariant-2026-05-29.md` (read first; do not re-litigate).

## Build A + D
- **A — in-process Acorn byte-parse backstop**: after codegen, parse each final artifact (`.client.js`/`.server.js`/chunk JS) with the already-dependency Acorn; FAIL with new `E-CODEGEN-INVALID-JS` (artifact + byte offset + snippet). Extend the `meta-eval.ts:350 reparseEmitted()` / `E-META-EVAL-002` precedent. Insertion: post-codegen artifact-emit seam (codegen/index.ts + api.js — confirm). Match Acorn ecmaVersion/sourceType to emitted syntax (avoid false positives).
- **D — codegen-side hard `E-CG-*` at lowering sites**: grep `compiler/src/codegen/` for silent-stub fallbacks (`could not be compiled`, comment+emit-anyway); convert to hard diagnostics naming the SOURCE construct. If none remain (fix-wave closed them), add a guard + test for the convention.

## Empirical (the ONE open axis — measure, don't opine)
Measure A-backstop added wall-time on the SPEC §2.4 ~4000-line reference (trucking-dispatch or largest sample). §2.4 budget = 4000L < 1s. Fits w/ margin → always-on (A). Breaches → dev/CI-only (B) (wire to dev-vs-release signal). Document measurement + decision in report + code comment.

## SPEC
`E-CODEGEN-INVALID-JS` row in §34 + brief normative invariant note (§2 or §47) — compiler SHALL NOT emit unparseable JS. Lands in same change (Rule 4).

## CRITICAL ACCEPTANCE GATE — zero false positives
After wiring, run FULL `bun run test`; confirm ZERO new failures vs 22,108-pass baseline. If the gate false-positives on existing tests' emitted JS, fix the PARSE CONFIG (emitted JS is valid; Acorn config wrong) — never the test.

## Tests: A fires on invalid emit (+ no-false-positive on valid); D emits hard E-CG-* on unlowerable construct; 4 R27 repros still clean.

## Disciplines: F4 startup (pwd-prefix, bun install, pretest, first-commit-embeds-pwd) · S126 Bash-edits worktree-absolute, no cd-into-main · S83 incremental commits (A+tests, D+tests, SPEC+perf separately), clean before DONE · NO --no-verify (full `bun run test` is the false-positive gate) · progress.md per step.

## Report: A insertion file:line + code, D sites converted (or none+guard), §2.4 perf delta + always-on-vs-dev/CI decision + rationale, SPEC additions, full-suite count (≥22,108/0, zero false positives), new codes, maps-feedback.
