# M6.7-C1 — native→CE component-def / registration parity

Closes the dominant E-COMPONENT-020 flip cluster: same-file `const Upper = <markup>`
component-defs that native PARSES but feeds CE a broken `raw`, so CE can't register them.

## Startup verification (2026-05-24)

- WORKTREE: `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-ab69fa2f8f85953c4`
- BRANCH: `worktree-agent-ab69fa2f8f85953c4`
- `git merge main --no-edit` → fast-forward to `15f4a2f2` (absorbed D1/D2).
- `bun install` clean (204 packages). `bun run pretest` clean (13 samples).
- Maps consulted: primary.map.md (Task-Shape Routing → "Native-parser bug fix");
  structure.map.md (Native-Parser Layout — collect-hoisted.js / parse-file.js).

## Phase 0 — VERIFIED (did not trust the bucket label)

Reproduced via dual-pipeline probes (live default vs `parser:"scrml-native"`).

### Which fixtures failed
- Same-file `const Card = <div…>` + `<Card/>`: native fired E-COMPONENT-021 →
  E-COMPONENT-020 → E-COMPONENT-035; live clean.
- Same-file void-element bodies (`<div><br></div>` + sibling): same.
- Corpus measurement (samples/compilation-tests, same-file component-defs):
  **16 files / net 19 native-only E-020 before fix; 0 after**.

### EXACT native-vs-live divergence (per sub-cause)
- **Sub-cause (a) — DOMINANT — same-file component-def `raw` shape.** Native's
  `synthComponentDef` (collect-hoisted.js) sliced `bodyText.slice(init.span.start -
  blockSpan.start, init.span.end - blockSpan.start)`. But the native
  `MarkupValue.init.span` is **bodyText-RELATIVE** (an index into the LogicEscape/Meta
  `bodyText`), NOT host-absolute. The `- blockSpan.start` subtraction shifted the slice
  LEFT by `blockSpan.start`, truncating the markup and leaking the LHS `nst Name =`
  prefix. Example: `const Card = <div class="card">hi</div>` produced
  `raw = "st Card = <div class=\"card"` (garbage). Masked for `^{ }` Meta blocks only
  because `blockSpan.start === 0` makes the subtraction a no-op. The broken `raw` failed
  CE's `parseComponentBody` (E-COMPONENT-021) → no registry entry → E-COMPONENT-020 at
  every use-site → E-COMPONENT-035 post-CE invariant.
- **Sub-cause (b) RULED OUT** — `ast.components` IS populated (count + name correct).
- **Sub-cause (c) — SEPARATE, SPLIT TO FOLLOW-ON — cross-file `export const Name =
  <markup>` raw slice.** `synthExportDecl` uses `stmt.span` (host-absolute) minus
  `blockSpan.start`, but `bodyText`'s absolute start is `blockSpan.start + openerWidth`
  (the `${`/`^{` width = 2), so the export raw is off by the opener width
  (`"port const Card = …"`). Distinct span field + distinct convention + distinct risk
  (synthExportDecl also serves non-component exports). Cross-file probe confirms native
  still fires E-COMPONENT-020/-035 for `export const Card` after this fix.
- **Sub-cause (d) RULED OUT** — use-site `<Card>` markup is correctly flagged
  `isComponent: true` under native; CE's `isUserComponentMarkup` predicate is satisfied.

### Fix locus
The native→live shape boundary (`collect-hoisted.js::synthComponentDef`), NOT CE.
CE stays parser-agnostic (the b.5/b.6 precedent — native matches the live shape CE
expects). No CE change needed: the corrected verbatim `raw` is idempotent under CE's
`normalizeTokenizedRaw` and re-parses to the same registry entry as live's token-joined
`raw`.

## The fix

`synthComponentDef`: slice the bodyText-relative span DIRECTLY —
`bodyText.slice(init.span.start, init.span.end)` — dropping the spurious
`- blockSpan.start` subtraction. ~19 lines (mostly the root-cause comment).

### Impact
- Same-file component-def slice (samples slice): net **19 native-only E-COMPONENT-020
  → 0**. All same-file component fixtures that resolve under live now resolve under native.
- Cross-file `export const` path NOT closed (split to follow-on).

## Sub-causes split to named follow-on
- **M6.7-C1-followon — native export-decl raw slice (cross-file components).**
  `synthExportDecl` (collect-hoisted.js ~L593-605) must compute the bodyText-absolute
  start (`blockSpan.start + opener-width`) rather than subtracting `blockSpan.start`, OR
  switch to a bodyText-relative span field if one is available on the Export stmt. Affects
  cross-file E-COMPONENT-020/-035 (CE path-b). Note: also serves non-component exports —
  any fix must regression-guard those.

## Verification

- **New tests** `compiler/tests/unit/m67-c1-component-parity.test.js` — 10 tests, all
  pass; load-bearing (9/10 fail without the fix). 8 full-compile dual-pipeline parity
  tests + 3 parse-level raw-slice correctness tests (LogicEscape, Meta-masked-path,
  multi-sibling). (Note: the 11th line count = describe blocks; 10 `test()` cases.)
- **Within-node canary** — 1005 pass / 0 fail. Corpus histogram IDENTICAL before/after
  (95351 total; FIELD-SHAPE 11069 etc. all unchanged). Expected: native's verbatim `raw`
  still differs TEXTUALLY from live's token-joined `raw` (already a FIELD-SHAPE
  divergence), so the canary is flat — the fix makes `raw` CORRECT-but-different rather
  than GARBAGE-and-different. **No allowlist movement; no regression.**
- **Strict-pass canary** — EXACT=964 before AND after (load-bearing gate HOLDS; the
  strict-pass canary measures top-level shape, not `raw` semantics). 1000/1001 strict-pass.
- **Full `bun run test`** — see final report counts (live default; CE untouched so no
  live-regression risk).
