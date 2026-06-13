# bug-1 Tailwind preflight Phase 2: gradient — progress

## 2026-06-13 startup
- Verified worktree root (agent-a3f0bf9e7dd185635). Tree clean.
- HEAD was ed3fa5ee (Phase 1), predated main 3cc87919 (BRIEF archival). Fast-forward merged main.
- bun install OK (204 packages).
- Next: read deep-dive + primary.map + Phase 1 template (registerRing/BOX_SHADOW_COMPOSE).

## 2026-06-13 registerGradient + tests
- Read deep-dive (Approach C confirmed), primary.map (codegen/registry routing), Phase 1 template
  (registerRing/BOX_SHADOW_COMPOSE/ringShadowSetter + ARBITRARY_DECL_TRANSFORM ring entry).
- Phase-0 fidelity survey (both decisions empirically confirmed):
  - DECISION #1: lone bg-gradient-to-r -> `var(--tw-gradient-stops, transparent, transparent)` =
    valid invisible 2-stop gradient. CONFIRMED.
  - DECISION #2: v3-faithful hex->`rgb(r g b / 0)` transparent-twin (clean 4-line hexToTransparentRgb);
    non-hex arbitrary (keyword/var) -> literal `transparent` fallback. CHOSE (a) for hex.
- Added registerGradient() + GRADIENT_DIRECTIONS + GRADIENT_STOPS_FALLBACK + hexToTransparentRgb +
  gradientFromSetter/gradientViaSetter/gradientToSetter after registerRing (tailwind-classes.js).
- Wired registerGradient() call after registerRing() at module init.
- Added from/via/to arbitrary handlers to ARBITRARY_DECL_TRANSFORM.
- Smoke-tested all emit shapes + 2/3-stop compose resolution + CSS balance — all correct.
- New test file bug-1-tailwind-gradient-family.test.js (8 sections, 47 cases) + inverted §6 of the
  ring-family test (4 gradient lint guards: FIRE -> no-fire) + header update. 55 pass / 0 fail.
- Next: SPEC §26.7 extension + SPEC-INDEX regen + R26 empirical verify + full suite.

## 2026-06-13 invert-on-landing sweep (pre-commit caught 3 extra guard files)
- The pre-commit hook surfaced THREE additional gradient lint-guard files beyond the brief-named
  ring-family §6 (the brief said "invert §6" but the same regression-guard class lived in 3 more):
  - bug-1-tailwind-transform-shorthand.test.js §9: from-[#ff0000] FIRE -> no-fire (+ header/title).
  - bug-1-tailwind-unrecognized-class.test.js §2: bg-gradient-to-r FIRE -> no-fire.
  - bug-1-tailwind-minor-families.test.js §10: from-[#ff0000] FIRE -> no-fire (+ header/title).
  - bug-1-tailwind-arbitrary-value-emit.test.js §12: stale gradient-deferred COMMENT corrected
    (assertion uses arbitrary ring-offset-[2px] — still genuinely deferred, left intact).
- Genuinely-still-deferred classes LEFT untouched: arbitrary ring-offset-[<len>], font-[Inter],
  content-[...] (string-shaped — separate bug-1 sub-items per deep-dive scope).
- All 5 tailwind unit files: 143 pass / 0 fail. arbitrary-value-emit: 66 pass / 0 fail.
- Broad scan of integration/conformance/browser: no gradient-class assertions there.

## 2026-06-13 SPEC §26.7 extension
- Added §26.7.1 "Gradient family (Phase 2)" subsection: direction utility + 8-direction map,
  from/via/to color-stop setters with golden CSS, the compose resolution worked example, and the
  TWO normative fidelity decisions (#1 lone-direction transparent,transparent; #2 from-color
  transparent twin v3-faithful hex / non-hex→transparent).
- Rewrote §26.7 "Phase status" para: gradient now Phase 2 LANDED + recognized; arbitrary
  ring-offset-[<len>] named as the lone remaining ring-family deferred member.
- Updated §26.7 intro to cross-reference §26.7.1.
- Ran scripts/regen-spec-index.ts (§26 range 15987-16208 -> 15987-16238) + hand-updated the §26
  descriptive text with the §26.7.1 gradient entry.

## 2026-06-13 R26 empirical verify (PASS) — DONE
- Compiled <div class="bg-gradient-to-r from-blue-500 via-green-500 to-purple-600">grad</div>.
- Emitted t.css (verbatim):
  .bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops, transparent, transparent)) }
  .from-blue-500 { --tw-gradient-from: #3b82f6 var(--tw-gradient-from-position,); --tw-gradient-to: rgb(59 130 246 / 0) var(--tw-gradient-to-position,); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgb(59 130 246 / 0)) }
  .via-green-500 { --tw-gradient-to: rgb(34 197 94 / 0) var(--tw-gradient-to-position,); --tw-gradient-stops: var(--tw-gradient-from,), #22c55e var(--tw-gradient-via-position,), var(--tw-gradient-to, rgb(34 197 94 / 0)) }
  .to-purple-600 { --tw-gradient-to: #9333ea var(--tw-gradient-to-position,) }
- Asserts PASS: linear-gradient(to right, var(--tw-gradient-stops present; --tw-gradient-from #3b82f6;
  --tw-gradient-to #9333ea (to-purple-600 overrides from-derived default); 3-stop via #22c55e;
  parens 15/15 + braces 4/4 balanced; no empty var(); no undefined. Real blue->green->purple gradient.
- Client.js clean (gradient in t.css only, no server leak).
- Commits: b3ae85bb (code+tests), c1fef912 (SPEC §26.7.1 + index). Full suite 16922 pass / 0 fail.
- DONE. Deferred (out of bug-1 scope): Phase 3 transform, Phase 4 filter/backdrop; arbitrary ring-offset-[<len>].
