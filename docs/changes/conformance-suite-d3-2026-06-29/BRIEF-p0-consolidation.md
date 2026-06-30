# P0 CONSOLIDATION — turn the conformance pilots into a real, gated, P0-complete suite

Dispatched S231 (2026-06-29) · agent a1a4cca0 · isolation:worktree · scrml-js-codegen-engineer · base HEAD 5e93dd43. Reuse the landed W1/W2/W3 machinery (conformance/ — format/adapter/run/normalize/driver, 22/22); do NOT rebuild.

[F4 startup + path-discipline (pwd under .claude/worktrees/agent-, ff-merge if stale base S112, bun install/pretest, Bash-edit absolute paths S99/S126, no cd into main, WIP(p0) first commit, COMMIT INCREMENTALLY per sub-bucket — a prior dispatch crashed on connection-closed, incremental commits saved it). MAPS block.]

READ: the W3 DD (RATIFIED — §OQ4 every case spec-anchored MANDATORY + §OQ6 P0 coverage map/sequencing); conformance/ IN FULL (run/normalize/driver/adapter + the 7 (b)-cases as template); compiler/tests/browser/*.test.js (~58 P0 twins to lift — pre-reviewed w/ SPEC refs, OQ4 Option D).

TASK:
1. Lift the P0 (b)-runtime surface broadly — target ~25-35 NEW cases across reactive(3)/derived/each(~8-10 of 26 distinct shapes: render/per-item-reactivity/keyed/empty/nested/as-alias/index)/match-block(6)/engine(5)/forms(5: bind:value/checked/validators/errors). Mirror the 7 existing (b)-cases. EVERY case spec:"§N"+rationale (OQ4 mandatory); a surprising capture = bug-or-spec-gap (assert SPEC-correct, don't bless impl#1). Author BOTH dom (whole-tree) + domAnchored per case -> resolves OQ1.
2. D-1 GATE the corpus: add compiler/tests/conformance/corpus-bridge.test.js importing+running conformance/run.ts (all cases assert pass) so it rides the existing pre-commit gate (bunfig root = compiler/tests/; do NOT modify bunfig). Corpus MUST be deterministic (settle-based, no real-time waits) — confirm no flakiness 3 runs.
3. Schema extensions (W2 friction): notCodePrefixes (family-glob absence), optional per-code severity (§34 error/warning partition normative), a files multi-file convention (aux .scrml imports). Keep all 22 existing cases green.
4. OQ1 RESOLUTION: from authoring both modes across ~30 cases, RECOMMEND the default (whole-tree vs anchored) + brittleness/impl-neutrality evidence. Both ship; just recommend the default.

GATES (S198 FULL bun run test — corpus now runs in-gate via the bridge): full suite green incl corpus-bridge; all corpus cases pass; 3x deterministic; do NOT touch compiler/src/ (reuse the landed adapter); only compiler/tests/ add is the bridge; no parser/AST change -> within-node unaffected; node --check clean.

REPORT: N new cases by surface + a sample; OQ1 RECOMMENDATION (default+evidence); gate-wiring proof + gate-time delta; bug-or-spec-gap surprises (OQ4 honesty mechanism); FRICTION for the remaining lift (P1 errorBoundary/components/lifecycle + the NET-NEW server-fn(§52)+channels needing a stubbed server boundary); WORKTREE_PATH/FINAL_SHA/FILES_TOUCHED/deferred. Do NOT land to main (PA S67 file-delta); git status clean before DONE.
