# sPA ss8 → PA — re-integration (needs: action)

**From:** sPA ss8 (promotion-tailwind, S210-rebuild run) · **To:** PA · **Date:** 2026-06-20
**Action:** re-integrate branch `spa/ss8` → main (single-writer, S147 coherence-gated), then push. **+ apply the OWED SPEC/known-gaps currency note (proposed text below — SPEC single-writer = you).**

## LIST DISPOSITIONED — n=2 (both items)

| item | sev | disposition | landing SHA |
|------|-----|-------------|-------------|
| bug-1 sub-arc 1 (string-shaped `content-[]`/`font-[]`) | MED | **landed-on-branch** | `81a46d36` |
| bug-1 sub-arc 3 (arbitrary `ring-offset-[len]`) | MED | **landed-on-branch** | `81a46d36` |
| bug-1 sub-arc 2 (safelist/@apply lint precision) | MED | **parked → you** (SPEC §26.5 deferred; no ruled direction) | — |
| bug-20 (`promote --engine` + `W-MATCH-TRANSITIONS-ACCRUING`) | LOW | **parked → you** (design + §34/§28; lint overlaps shipped W-MATCH-RULE-INERT) | — |

- **Branch tip:** `81a46d36` (single landing commit: 6 src/test files + bookkeeping). My base was `a3b08cbb`.
- **Parked:** bug-1 sub-arc 2 + bug-20 (both design/SPEC-gated — details below). **List fully dispositioned** (landed 2 sub-arcs · parked 2).

## What landed (bug-1 sub-arcs 1+3)

The Bug-1 composing-family arc is already complete (S191, approach C). These are the two mechanical, already-ruled remainder sub-arcs from `docs/known-gaps.md` Bug-1 (lines 1193-1198). All in `compiler/src/tailwind-classes.js`.

**Sub-arc 1 — string-shaped arbitrary values.** New `string` value-kind in `validateArbitraryCss` (a bracket value wholly wrapped in matching `'` or `"`, length ≥ 2; underscore→space within the string; an embedded SAME-quote char is rejected E-TAILWIND-001; a DIFFERENT quote inside is permitted — `content-['a"b']` → `content: 'a"b'` is valid CSS). Inserted AFTER the backtick check, BEFORE the list-split (so a quoted value with underscores stays one token). Two new prefixes: `content` (direct map → `content`); `font` (overloaded — numeric → `font-weight`, else → `font-family`). Verified emits: `content-['hello']`→`content: 'hello'`, `content-['hello_world']`→`content: 'hello world'`, `font-[Inter]`→`font-family: Inter`, `font-['Helvetica_Neue']`→`font-family: 'Helvetica Neue'`, `font-[550]`→`font-weight: 550`.

**Sub-arc 3 — lone arbitrary `ring-offset-[len]`.** New `ring-offset` entry in `ARBITRARY_DECL_TRANSFORM`, kind-dispatched, MIRRORING the named `ring-offset-{w}`/`ring-offset-{color}` exactly. Width form → `--tw-ring-offset-width` + offset-shadow var + `BOX_SHADOW_COMPOSE`; color/var/keyword form → `--tw-ring-offset-color` only. Composes with `ring-[3px]` via the existing `calc(<w> + var(--tw-ring-offset-width, 0px))`. (Closes the "lone remaining ring-family member without a utility.")

**Provenance:** agent `aa1ba07f7987579fa`, src SHA `2ed6cf42`, file-delta'd (S67) into spa/ss8. Files: `compiler/src/tailwind-classes.js` (+64) + 5 tailwind test files (arbitrary-value-emit §16-20 + ring-family §13 new; + 4 coupled stale "STILL-fires" assertions inverted in unrecognized-class §2 / transform-shorthand §12 / minor-families §10 — legit consequences of the recognition change).

**Agent judgment call (sPA reviewed + AGREED):** the brief's example table listed `font-['a"b']` as a rejection, but the brief's RULE text rejects only SAME-quote-embedded. `content: 'a"b'` (different-quote inside) is valid CSS, so the agent followed the RULE (accept) over the example. Correct — kept.

## OWED — SPEC + known-gaps currency note (proposed text; you apply at re-integration)

The code now supports prefixes/value-kinds the SPEC §26.4 normative enumeration doesn't list yet. Same shape as the S109 grid/flex/aspect §26.4 extension. Proposed:

1. **§26.4 supported-prefix list** (~lines 16094-16101): add `content` (the `content` property — accepts string/ident/number/list); add `font` to the prefix list AND the overloaded-disambiguation section (~16103): numeric → `font-weight`, otherwise → `font-family`.
2. **§26.4.1 validation rules** (~16111+): add the **string value-kind** — a bracket value wholly wrapped in matching `'`/`"` is a CSS string; top-level underscores → spaces; an embedded SAME-quote char → reject E-TAILWIND-001; a DIFFERENT quote inside is permitted; `\_`-escape not supported (consistent with the list-split path).
3. **§26.7** — add an "Arbitrary `ring-offset-[…]`" paragraph mirroring the existing "Arbitrary `ring-[…]`" paragraph (~line 16263): width form sets `--tw-ring-offset-width` + offset-shadow var + composing shorthand; color/var/keyword form sets only `--tw-ring-offset-color`.
4. **known-gaps Bug 1** (lines 1193-1198): mark sub-arc 1 (string-shaped) + sub-arc 3 (ring-offset) **LANDED**; sub-arc 2 (safelist/@apply) is now the SOLE open remainder of Bug 1.
5. No §34 code changes (E-TAILWIND-001 already exists; the new rejections reuse it).

## Parked → you (escalations)

**bug-1 sub-arc 2 (safelist/@apply lint precision).** SPEC §26.5 (line 16147) explicitly says "a safelist/`@apply` mechanism to distinguish user-defined classes from typos remains deferred." No ruled direction (safelist config knob vs `@apply` support vs `#{}`-defined-class scan suppression). The existing `lint.tailwind-unrecognized-class = off` escape hatch already covers heavy-custom-CSS adopters. Design ruling needed before any build.

**bug-20 (`promote --engine` Tier-1→2 lift + `W-MATCH-TRANSITIONS-ACCRUING`).** LOW. The `--engine` stub safely exits code 2 today (no breakage). Findings (R4 cross-checked):
- The `--engine` REWRITE is mostly specced + mechanical: §56.6 (input `<match for=Phase on=@phase>` w/ rule= arms → output `<engine for=Phase initial=.X>`) + §3 line 161 ("mechanical and additive; state-children carry forward verbatim; the wrapper swap is the commitment moment"). Same span-rewrite shape as shipped `--match`/`--each`. `initial=` = first arm's variant (specced).
- **BLOCKER (design): `W-MATCH-TRANSITIONS-ACCRUING` is name-only** — exists ONLY in SPEC §56.6 + the promote.js:1542 stub. No §34 row, no §28 config, no fire-conditions (unlike the fully-specced sibling `I-FN-PROMOTABLE` §56.9.1/.2/.3). Its fire-conditions are an unwritten design decision.
- **CRITICAL OVERLAP:** the shipped `W-MATCH-RULE-INERT` (§18.0.2, §34 line 17111, config `lint.match-rule-inert` line 16408, impl across 5 source files) ALREADY fires on `rule=` on a `<match>` arm AND ALREADY recommends "promote to `<engine>` (Tier 2)". So `W-MATCH-TRANSITIONS-ACCRUING` may be REDUNDANT. **Rule first:** (a) is the new lint needed at all vs W-MATCH-RULE-INERT already surfacing the opportunity? (b) if distinct, what differentiates it (≥N accruing-rules threshold? non-double-fire with W-MATCH-RULE-INERT)?
- **REUSE:** `W-ENGINE-INITIAL-MISSING` is ALREADY SHIPPED (symbol-table.ts:6361, emit-engine.ts) — the rewrite's default-initial path reuses it; §56.6's "may emit W-ENGINE-INITIAL-MISSING" is already-existing behavior, no new diagnostic.
- The stub's "four pieces together" may collapse to 2 (rewrite + reuse existing lints) if the new lint is dropped.

## Base / conflict status (clean re-integration)

- Base `a3b08cbb` (FF'd from origin/main during boot — main had advanced cf950bab→a3b08cbb with your A2 W2 `<api>` landing). Main has since advanced +8 to `6eb31fb2` (origin) / local further (your ss2 re-integration + deputy ticks 135 — deputy digest even logs "F3 parallel wave (ss2/ss8/tw-arb)", so you're already tracking this).
- **No conflict:** `git diff --name-only a3b08cbb..origin/main` over my 6 src/test files (`tailwind-classes.js` + the 5 bug-1 tailwind tests) = EMPTY. None touched main-side. File-delta or merge re-integrates clean.
- **No leak:** my single commit `81a46d36` is contained only by `spa/ss8` (coherence: `origin/main...HEAD` = 8 left / 1 right; the 1 right is my landing, touching only tailwind src+tests + docs/changes + spa-lists).
- **spa-lists/ note:** my branch edits `spa-lists/ss8-promotion-tailwind.md` (status) + adds `spa-lists/ss8.progress.md`. Main-side touched `spa-lists/INDEX.md` + `spa-lists/ss2*.md` (your ss2 work) — DISJOINT files, no list-file conflict.

## Verification

- Pre-commit gate (unit+integration+conformance): **17485 pass / 0 fail / 68 skip / 1 todo** (962 files). Commit passed the full gate.
- sPA-independent R26 on the LANDED ss8 source: emit probe byte-exact for all 12 cases (incl. the NOTE-1 quote cases) + **230 pass / 0 fail** across all 5 tailwind test files.
- **Post-commit full+browser run reported "24759 pass, 2 fail" — the 2 fails are the S209 fresh-worktree gitignored-dist env-gap** (`TodoMVC §0/§1: benchmarks/todomvc/dist/app.html must exist` — identical to the 2 `distExists` fails the ss2 re-integration hit). NOT a regression: my change touches zero benchmark files; the post-commit hook itself then compiled the dist, and re-running the 3 todomvc test files = **57 pass / 0 fail**. (The `samples/compilation-tests/dist` symlink was already handled at boot; `benchmarks/todomvc/dist` is the second gitignored-dist gap — consider symlinking it in the ss8 worktree provisioning too, like ss2 noted.)

## PA owns (at re-integration)

- Merge/cherry-pick `81a46d36` → main; push.
- Apply the OWED SPEC §26.4/§26.4.1/§26.7 + known-gaps Bug-1 currency note (proposed text above); regen SPEC-INDEX if ranges shift.
- Route the 2 parked items: sub-arc 2 (safelist/@apply ruling) + bug-20 (the W-MATCH-TRANSITIONS-ACCRUING-vs-W-MATCH-RULE-INERT design question) — likely a quick ruling, then a clean dispatch.
- INDEX ss8 row: bug-1 → drained-to-1-open (sub-arc 2); bug-20 → design-track (Bucket B candidate). Worktree `../scrml-spa-ss8` cleanup; changelog/master-list/delta-log.
