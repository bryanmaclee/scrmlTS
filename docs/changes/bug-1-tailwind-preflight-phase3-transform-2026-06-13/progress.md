# Phase 3 transform — progress (S191)

## 2026-06-13 startup
- Worktree base ed3fa5ee (Phase 1 only); ff-merged main (15f1bdb4) to pull in Phase 2 (gradient, f5b71e61) + this BRIEF.
- bun install + pretest OK. First WIP commit landed.
- Maps read (primary.map.md full): watermark 1e17213e predates §26.7 Tailwind work as briefed; templates read directly (registerRing/registerGradient/BOX_SHADOW_COMPOSE in tailwind-classes.js).

## Survey (Phase 0) — per-utility change-vs-stay decisions
- CHANGE to --tw-* compose: translate-{x,y} (named+arbitrary), scale-{x,y} (named+arbitrary), bare scale-N (BOTH axes), 2D rotate-N (named), skew-{x,y} (named+arbitrary). NEW named utilities added.
- STAY literal (escape hatch, ARBITRARY_PREFIX_MAP, unchanged): transform-[...], scale-[...], translate-[...], rotate-[<angle>] full-shorthand forms.
- STAY literal (3D EXCLUSION): rotate-x/y/z arbitrary -> transform: rotateX(<v>) — 2D --tw-* model has no 3D-rotate var; do NOT compose.
- STAY null (unrecognized canary, unchanged): bare skew-[10deg] (no bare-skew prefix; only skew-x/skew-y).

## Implementation (tailwind-classes.js)
- NEW TRANSFORM_COMPOSE const (the C-style shorthand w/ inline fallbacks: translate/rotate/skew->0, scale->1).
- NEW transformSetter() helper + registerTransform() (named: TRANSLATE_SCALE spacing+fractions+full, SCALE_VALUES 0/50..150, ROTATE_VALUES 0..180, SKEW_VALUES 0..12; all + negatives via leading-minus class keys).
- registerTransform() wired after registerGradient() at module init.
- ARBITRARY_DECL_TRANSFORM: translate-x/y, scale-x/y, skew-x/y rewritten to C-style (set --tw-* + TRANSFORM_COMPOSE); rotate-x/y/z kept literal.
- COMMIT: code+test coupled (S113).

## Test (bug-1-tailwind-transform-shorthand.test.js) — behavior-change sweep
- SWEEP across compiler/tests/ + samples/: only this file asserted old directional-prop output.
  - minor-families §5/§6 (scale-[1.5]/translate-[10px]) = full-shorthand escape hatch -> STAY, no change.
  - unrecognized-class skew-[10deg] = bare-skew unrecognized canary -> STAY, no change.
  - @keyframes transform: in css-at-rules.test.js + samples/dist runtime = user CSS / animation, NOT tailwind utils -> STAY.
- Rewrote §4 (translate-x/y), §5 (scale-x/y), §7 (skew-x/y) to --tw-* truth; §6 rotate-3D stays literal; +§8 named, +§9 multi-axis compose (the bug-1 fix), +§10 escape-hatch-stays-literal, +§11/§12 lint regression.
- Test files updated for the behavior change: 1 (bug-1-tailwind-transform-shorthand.test.js).
- 37 pass / 0 fail in the transform test; all 8 tailwind test files 443 pass / 0 fail.

## Remaining
- SPEC §26.7 extension (transform family) + SPEC-INDEX regen.
- R26 empirical verify (compose 4 transforms on one element).
- Full pre-commit gate.

## Deferred
- Phase 4 (filter + backdrop-filter) — separate dispatch.

## 2026-06-13 completion
- Code+test commit e945a216 (full pre-commit gate PASS incl. gauntlet + browser validation).
- SPEC §26.7.2 + §26.7 phase-status + SPEC-INDEX regen commit 421a1d84.
- R26 EMPIRICAL VERIFY PASS: compiled /tmp/bug1-p3-r26/t.scrml (translate-x-4 translate-y-2 rotate-45 scale-x-110).
  t.css has all 4 --tw-* vars set (--tw-translate-x: 1rem, --tw-translate-y: 0.5rem, --tw-rotate: 45deg, --tw-scale-x: 1.1),
  4 rules each carrying the composing transform: shorthand, ZERO bare translate:/scale: individual-prop collisions,
  balanced braces. Browser computes transform: translate(1rem, 0.5rem) rotate(45deg) skewX(0) skewY(0) scaleX(1.1) scaleY(1)
  — all four transforms apply (not last-wins).
- All 443 tailwind unit tests pass; full pre-commit gate clean on both commits.
