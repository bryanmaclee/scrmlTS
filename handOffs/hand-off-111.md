# scrmlTS — Session 108 (CLOSE)

**Date:** 2026-05-19
**Previous:** `handOffs/hand-off-110.md` (S107 CLOSE — rotated at S108 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S108 CLOSE (pre-wrap):** `eba8ded` (Bug 4 C-narrow shipped)
**HEAD at S108 CLOSE (post-wrap):** `<wrap-sha>` (this hand-off + master-list + changelog wrap commit)
**Origin sync at CLOSE:** scrmlTS pre-wrap 0/0; scrml-support 0/0 (no changes this session)

---

## S108 net outcome — 20 substantive commits + 5 HIGH/MED-HI adopter closures + 2 in-flight closures + 1 dispatched deep-dive

Session was scoped at OPEN as "match Phase 3 codegen + parallel agents." Net result: **20 substantive commits**, **5 adopter-visible HIGH/MED-HI dogfood/feature surfaces closed end-to-end**, **3 parallel-agent dispatches successfully cherry-picked into main**, and **1 deep-dive (Bug 4 docs-mode escape) completed + implemented in-session**. Net change at HEAD `eba8ded`: pre-commit subset **13,304 pass / 88 skip / 1 todo / 0 fail / 690 files / 44,794 expect**; full `bun test compiler/tests/` **16,147 pass / 169 skip / 1 todo / 0 fail / 723 files / 47,209 expect**. Delta vs S107 close (15,930 / 714 / 46,845): **+217 pass / +9 files / +364 expect / 0 fail / 0 regressions** — matches new-test count + minor in-place rotations.

Commits in order (S107 close → S108 close):

1. **`6d520d2`** `docs(readme): trim current-state section` — dropped stale v0.1/v0.2 framing, dropped A2-anomaly-2 patch-arc paragraph, updated match-block status to Phase 1+2 shipped (52 → 30 lines).
2. **`b685cf0`** `chore(maps): S108 incremental refresh` — 8 maps refreshed (primary + error + structure + test + domain + schema + non-compliance + INDEX) via project-mapper agent + file-delta.
3. **`ef9d219`** `feat(match-block): Phase 3 codegen render dispatch` — new `compiler/src/codegen/emit-match.ts` (~430 LOC) consumer; reuses `emit-variant-guard.ts:emitVariantGuardedRender` (variant-source-agnostic helper factored S78 specifically for this future reuse). 9 unit tests. on= resolution: bare `@cell` Shape A subscribe; `${expr}` Shape A/B; auto-implied via in-scope engine.
4. **`811181e`** `feat(bug-5): Phase 3 + SPEC §7.4.2` — constant-folding (Option γ) for `${IDENT}` non-reactive interpolation; NEW `compiler/src/codegen/const-fold-env.ts` (~155 LOC, cached env via `partiallyEvaluateExpr`); 14 unit tests + `_constantFolded` marker threads through `collect.ts` + `emit-reactive-wiring.ts` to suppress orphan literal at file-scope; SPEC §7.4.2 normative section (60 lines) authorizes the compile-time inline optimization.
5. **`0b2a8fe`** `WIP(bug1-tailwind-lint): start at /home/.../agent-a7ccf90ad1a63fb4a — findUnrecognizedClasses` (Bug 1 floor agent dispatch start).
6. **`2873515`** `WIP(bug1-tailwind-lint): wire findUnrecognizedClasses into compileScrml` (Bug 1 floor agent — api.js wiring).
7. **`c1e3517`** `WIP(bug1-tailwind-lint): SPEC §34 + §28 + §26.5 — W-TAILWIND-UNRECOGNIZED-CLASS` (Bug 1 floor agent — SPEC normative).
8. **`0617afd`** `WIP(bug1-tailwind-lint): add 34 unit tests for W-TAILWIND-UNRECOGNIZED-CLASS` (Bug 1 floor agent — tests).
9. **`dce4f06`** `WIP(bug1-tailwind-lint): rotate known-gaps Bug 1 entry — FLOOR shipped, full fix open` (Bug 1 floor agent — known-gaps; conflict resolved at cherry-pick time with my match-`:`-shorthand entry).
10. **`204b303`** `feat(match-block): Phase 4 — :-shorthand body codegen via parseExprToNode` — extends emit-match.ts buildMatchArms for `bodyForm: "shorthand"`; synthesizes `logic > bare-expr` AST routed through generateHtml's interpolation case (constants fold via Bug 5 P3; cells emit placeholder + reactive binding); 6 unit tests.
11. **`b261274`** `feat(form-for): B5 — L2 label-store consultation in expander` — emit-form-for.ts buildFieldGroup emits `${(typeof _scrml_label_for === "function" ? _scrml_label_for("Struct", "field") : "Mechanical Default")}` interpolation; closes the wired-but-unconsumed `registerLabels` runtime; SPEC §41.14.7 amended with Codegen subsection.
12. **`1bf2135`** `WIP(pgo-c2): start at /home/.../agent-a039af8b7a78ac87a — detectMarkupForStmtChunkPresence TAB-time walker` (PGO C2 agent — start).
13. **`bd67e62`** `WIP(pgo-c2): emit-client consumer + self-host strip` (PGO C2 agent — consumer wiring).
14. **`ae9bca4`** `test(pgo-c2): add 25 unit tests for hasChunkedMarkupTag + hasForStmt flags` (PGO C2 agent — tests). Fold pattern: skip `buildFunctionBodyRegistry` when no for-stmt; elide markup tag-test per-node when no chunked-markup-tag. Mirrors S102 (hasResetExpr) + S106 (hasEqualityExpr) Option-2 precedent.
15. **`37f8f62`** `feat(tailwind-arbitrary): S108 wave 1 — grid/flex/aspect families` (Bug 1 full-fix agent — substantive). 9 prefix entries + universal underscore-as-space + ratio + repeat/minmax/fit-content function whitelist; 66 unit tests.
16. **`2830579`** `test(tailwind-arbitrary): S108 wave 1 — coverage + rotated unrecognized cases` (Bug 1 full-fix agent — test landing).
17. **`e9bd611`** `docs(tailwind-arbitrary): SPEC §26.4 + SPEC-INDEX + known-gaps for S108 wave 1` (Bug 1 full-fix agent — docs; resolved known-gaps conflict at cherry-pick time keeping agent's full-fix-shipped status).
18. **`bdb9287`** `feat(tailwind-arbitrary): S108 wave 2 — transition/timing + individual transforms + outline` — PA-direct wave: 9 prefix entries (`transition`, `duration`, `delay`, `ease`, `rotate`, `scale`, `translate`, `outline`, `outline-offset`) + 8 function names in VALID_MATH_FUNCTIONS (`cubic-bezier`, `steps`, `rotate3d`, `translate3d`, `scale3d`, `matrix`, `matrix3d`, plus 3D variants); 26 unit tests.
19. **`a40ac64`** `feat(tailwind-arbitrary): S108 wave 3 — transform shorthand + directional transforms` — PA-direct wave: 1 prefix entry (`transform`) + 9 directional decl-transform emitters (`translate-x`/`-y`, `scale-x`/`-y`, `rotate-x`/`-y`/`-z`, `skew-x`/`-y`) + 14 more function names in VALID_MATH_FUNCTIONS (lowercased 2D + 3D transform fns + `perspective`); 23 unit tests.
20. **`eba8ded`** `feat(bug-4): C-narrow — markup-text-mode SQL locus gate (SPEC §3.1 + §8.1 conformance)` — PA-direct C-narrow implementation: removed `?{` recognition from block-splitter.js markup-text loop with explanatory comment block; SPEC §4.17 amended with sibling locus-gating principle cross-ref; 8 dedicated Bug 4 tests + 3 existing block-splitter tests updated to C-narrow semantics. Bug 4 deep-dive at `scrml-support/docs/deep-dives/bug-4-docs-mode-escape-2026-05-19.md` (530 lines, 11 prior-art systems, 372 workaround occurrences in adopter corpus).

Plus this wrap commit (hand-off + master-list + changelog).

## Tests at S108 CLOSE

- **Pre-commit subset** (unit + integration + conformance): **13,304 pass / 88 skip / 1 todo / 0 fail / 690 files / 44,794 expect**
- **Full `bun test compiler/tests/`**: **16,147 pass / 169 skip / 1 todo / 0 fail / 723 files / 47,209 expect**
- Delta vs S107 close (full 15,930 / 714 files / 46,845 expect): **+217 pass / +9 files / +364 expect / 0 fail / 0 regressions**

## S108 commit ledger (20 substantive + 1 wrap)

| # | Commit | What | Tests |
|---|---|---|---|
| 1 | `6d520d2` | docs(readme) current-state trim | — |
| 2 | `b685cf0` | chore(maps) S108 refresh | — |
| 3 | `ef9d219` | feat(match-block) Phase 3 codegen | +9 |
| 4 | `811181e` | feat(bug-5) Phase 3 + SPEC §7.4.2 | +14 |
| 5-9 | `0b2a8fe`..`dce4f06` | Bug 1 floor lint (agent) | +34 |
| 10 | `204b303` | feat(match-block) Phase 4 `:`-shorthand | +6 |
| 11 | `b261274` | feat(form-for) B5 L2 label-store | (in-place updates) |
| 12-14 | `1bf2135`..`ae9bca4` | PGO C2 fold (agent) | +25 |
| 15-17 | `37f8f62`..`e9bd611` | Bug 1 full-fix wave 1 — grid/flex/aspect (agent) | +71 |
| 18 | `bdb9287` | Bug 1 wave 2 — transition/transforms/outline (PA) | +26 |
| 19 | `a40ac64` | Bug 1 wave 3 — transform shorthand + directional (PA) | +23 |
| 20 | `eba8ded` | feat(bug-4) C-narrow + SPEC §4.17 + deep-dive | +8 |
| 21 | `<wrap-sha>` | this wrap commit | — |

Both repos pushed at close.

## State-as-of-CLOSE

| Item | Status |
|---|---|
| Tests pre-commit subset | 13,304 / 88 / 1 / 0 fail / 690 files / 44,794 expect |
| Tests full pre-push gate | 16,147 / 169 / 1 / 0 fail / 723 files / 47,209 expect |
| Test delta from S107 | +217 pass / +9 files / +364 expect / 0 fail / 0 regressions |
| Worktree list | main only (all 3 agent worktrees cleaned during cherry-pick landing) |
| Origin sync (scrmlTS) | post-wrap push: target 0/0 |
| Origin sync (scrml-support) | 0/0 (deep-dive added to scrml-support via agent + already on origin; no further scrml-support edits this session) |
| Inbox `handOffs/incoming/` | empty |
| Path-discipline hook | active (Configuration B installed; `.git/hooks/` has pre-commit + post-commit + pre-push) |
| Self-host bootstrap | unchanged (S102 broken-import-path still unaddressed) |
| Maps watermark | refreshed S108 OPEN to `6616a69`; **22 commits behind HEAD `eba8ded`** (this session's 20 substantive commits since OPEN refresh + wrap). **S109 session-start MUST refresh BEFORE any dev-agent dispatch.** |
| scrml-support untracked | unchanged from S106 (voice articles + tools/ — user's territory) |
| docs/known-gaps.md | rotated 4× across S108 (Bug 5 P3 closure + Bug 1 floor + Bug 1 wave 1+2+3 + match `:`-shorthand closure + Bug 4 `?{` closure + bare-`/` half retained as deferred) |
| pkg.json version | 0.3.3 (unchanged — no release cut this session; v0.3.x patch arc continues) |

## S108 adopter-visible closures (5 HIGH/MED-HI end-to-end)

1. **Match block-form Tier 1 case-analysis** — was opaque HTML pass-through at S107 OPEN; now end-to-end functional. Phases 1+2 (S107) + Phase 3 codegen (S108) + Phase 4 `:`-shorthand body codegen (S108). All four body shapes supported (bare-body markup / self-closing / `:`-shorthand expressions / parenthesized payload bindings). Constants fold inline via Bug 5 P3; reactive cells emit placeholder + binding; multiple match-blocks per file → independent dispatchers indexed by AST id; auto-implied `on=` from in-scope engine works.
2. **Bug 5 `${IDENT}` const-interpolation arc closed end-to-end (Phases 1+2+3 + SPEC §7.4.2)** — was empty placeholder + orphan no-op JS at S106 OPEN; constants like `const VERSION = "v0.3.0"` + `${VERSION}` now fold inline at compile time (zero placeholder, zero JS wiring, zero runtime cost); reactive cells get placeholder + reactive binding; non-foldable non-reactive get placeholder + one-shot textContent at DOMContentLoaded.
3. **Bug 1 Tailwind FLOOR + FULL fix (3 waves)** — was silent layout breakage at S106 close (dogfood report); FLOOR (S108) lint surfaces compile-time friction; FULL fix waves 1-3 ship CSS emission for grid/flex/aspect + transition/timing + individual + shorthand + directional transforms + outline families (~25+ prefix entries + 14 function name additions to VALID_MATH_FUNCTIONS).
4. **formFor B5 L2 label-store** — `data.registerLabels({Struct: {field: "Display"}})` was wired-but-unconsumed (runtime helper + map existed; expander never consulted); now the expander emits `${(typeof _scrml_label_for === "function" ? _scrml_label_for(...) : "Mechanical Default")}` per `<label>` position; SPEC §41.14.7 amended.
5. **Bug 4 `?{` C-narrow** — was catastrophic EOF-cascade when bare `?{` appeared in markup-text body (scrml-about-scrml prose); now `?{` is a SQL opener only inside Logic context per SPEC §3.1 + §8.1 (1 line removal + comment block in block-splitter.js; SPEC §4.17 amended with sibling locus-gating principle cross-ref); 86% of adopter pages already used entity-escape workarounds (zero migration cost).

## Compile-time perf closure (PGO Phase 3 C2 fold)

PGO Phase 3 C2 (agent-dispatched) — skip `buildFunctionBodyRegistry` when `hasForStmt === false`; elide markup tag-test per-node when `hasChunkedMarkupTag === false`. Mirrors S102 hasResetExpr + S106 hasEqualityExpr Option-2 pattern (one TAB-time DFS walk with throw-sentinel short-circuit; cache booleans on `FileAST`; codegen-time consumers gate downstream work on O(1) flags).

## Carry-forwards for S109

### High priority — remaining dogfood bugs

| # | Severity | Item | Cost |
|---|---|---|---|
| Bug 2 | MED-HI | Phantom E-SYNTAX-050 + 4-cascade on multi-line `<a>` + entity-encoded body | needs bisecting reducer; ~2-4h |
| Bug 4 (bare-`/` half) | LOW-MED | Broad-C extension at block-splitter.js:1962-1987 (refine `looksLikeCloser` lookahead) | ~10-20 LOC; deferred pending friction signal |

### High priority — Bug 1 still-deferred families

| Family | Surface | Cost |
|---|---|---|
| `ring-*` / `ring-offset-*` | Tailwind compound — box-shadow stack trick | medium (compound CSS emission) |
| `bg-gradient-*` / `from-*` / `to-*` / `via-*` | gradient stop-color compound | medium (multi-utility coordination) |
| `content-["..."]` / `font-[Inter]` | string-shaped values | needs bracket-parser change (quoted strings) |
| Safelist / `@apply` | precision improvement for adopter false-positive lint surface | medium-large architectural |

### Substantive — L22 family v1.next + new members

| Track | Item | Cost |
|---|---|---|
| formFor v1.next | B2 (registerRenderer per-type registry) + B3 (`@label` annotation) + B4 (auto-recurse nested struct) | ~8-15h aggregate |
| schemaFor v1.next | FK derivation (OQ-SCH-4) + payload-bearing enum lowering | ~4-8h |
| tableFor v1.next | 6 items from S105: sort-state explicit decl + SELECTABLE-CELL-WRONG-TYPE strict-mode + positional column slots + §17.4a for/else codegen + `date`/`timestamp` BUILTIN_TYPE + inline event handler arrow-param | ~6-10h aggregate |
| L22 next member | `variantNames(EnumType)` — smallest primitive; tightens the family | full 4-gate walk first |

### Substantive — Match block-form Phase 5 polish (v0.4+ enrichment)

| Item | Cost |
|---|---|
| Samples + integration tests | ~2-3h |
| Browser test for runtime arm-swap on reactive change | ~1-2h |
| PRIMER §18 refresh | ~30min |
| Wildcard `<_>` explicit render (currently fall-through via no-default-branch) | ~1-2h |
| Payload-binding typer scope (`<Ready(rows)> : doSomething(rows)`) | ~2-3h |
| Bare-variant inference in nested expression positions | ~2-3h |

### Substantive — mid-tier carry from S107

| Track | Item | Cost |
|---|---|---|
| Phase 3.B B4 | count-derived dep precision (agent-dispatched; Q-RT3B-OPEN-2 ratified) | ~3-5h |
| Native parser | M2 expression parser | ~2-4 sessions |
| Self-host bootstrap | broken-import-path investigation (S102 carry; still unaddressed S103-S108) | ~2-4h |

### Light (cleanup)

- Maps refresh required again BEFORE any dev-agent dispatch S109 (22 commits behind watermark `6616a69`)
- Build benchmarks refresh — last measured 2026-05-14 (v0.3.0 STABLE), now 5 days + 20 commits stale; runtime got refreshed today but build did not
- OQ-TF-11 sub-debate (if user contests MEDIUM verdict on row binding `:let` vs implicit `@row`)
- Puppeteer dep cleanup (Q-PW-PORT-OPEN-1 ratified DEFER; awaiting 1-2 release cycles post-S103 Playwright cutover)
- LEGACY `_scrml_subscribers` retirement (v0.4+; Q-RT3-SR-OPEN-3 ratified DEFER post-impl)

### v1.0+ follow-up

- Structural cleanup of browser-test effect-leak pattern (G1 close residue from S105)

### Marketing-shaped (per pa.md Rule 1 — DEFER unless raised)

- formFor + schemaFor + tableFor combined sample app + scrml.dev refresh + README compile-gate block
- L22 family 4-of-6-shipped narrative + tableFor admin-UI-lift adoption pitch
- v0.4 announce content
- Bug 4 C-narrow + Bug 5 P3 + match block-form full Tier 1 closure narrative ("we shipped the language design + the dogfood loop validated it")

## Things S109 PA must NOT screw up

In addition to S96-S107 carry-forwards:

- **Maps refresh BEFORE any dev-agent dispatch** — 22 commits behind watermark `6616a69`. PA-direct fold-in OR re-attempt project-mapper agent at session-start.
- **`?{` recognition is now Logic-context-only** — adopters writing scrml-about-scrml docs prose can use `?{` literally. If S109 work touches block-splitter.js's brace-context recognition area, preserve the C-narrow gate (the comment block at line 1443 names SPEC §3.1 + §8.1 + the deep-dive path explicitly).
- **`_scrml_label_for` is messages-chunk-gated** — the typeof-guard in emit-form-for.ts is load-bearing for formFor in files without inline-override validators. Don't remove the typeof check unless either (a) messages chunk activates unconditionally on formFor expansion (preferred long-term — eliminates the guard cost) or (b) the runtime helper is moved to an always-present chunk.
- **Match block-form Phase 4 v1 limitations documented in module header** — wildcard `<_>` no explicit render (fall-through via no-default-branch); payload-binding typer scope not extended into arm body (E-NAME-NOT-FOUND on payload names in `${expr}` inside arm bodies is expected); bare-variant inference in nested expression positions is broader typer work. If S109 touches emit-match.ts, read module header first.
- **Tailwind ARBITRARY_PREFIX_MAP + VALID_MATH_FUNCTIONS are now the source of truth for FULL fix** — when adding a new family, update both (engine emit + lint sync share `getTailwindCSS`). The `ring-*` family in particular needs compound-multi-property emission (box-shadow stack), not just a 1:1 prop mapping.
- **Hook gate is Configuration B** — local-rich (pre-commit + post-commit + pre-push). `--no-verify` is the S88 process-violation surface; never bypass without explicit authorization.
- **Bug 4 C-narrow has scope-expansion follow-ons** — 6 OQs surfaced in the deep-dive; Q-BUG4-OPEN-1 (extend gate to `!{`/`^{`/`_{`) + Q-BUG4-OPEN-5 (broad-C bare-`/` extension) are the load-bearing scope expansions. None block C-narrow; all deferred pending friction signal.

## Session-start checklist for S109 PA

1. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL
2. Read `docs/PA-SCRML-PRIMER.md` IN FULL (Pillar 5b applies; refresh queued)
3. Read `compiler/SPEC-INDEX.md` IN FULL — note S108 SPEC changes: §7.4.2 NEW (Bug 5 P3 normative) + §4.17 amended (Bug 4 C-narrow sibling cross-ref) + §41.14.7 amended (formFor B5 Codegen subsection) + §34 +1 row (`W-TAILWIND-UNRECOGNIZED-CLASS` — was S108 floor lint) + §26.4/§26.5 expansion (Tailwind full-fix prefix catalog growth)
4. Read `master-list.md` §0 LIVE DASHBOARD IN FULL — note S108 CLOSE addendum at top
5. Read this `hand-off.md` (S108 CLOSE) — will be rotated to `handOffs/hand-off-111.md` at S109 open
6. Read last ~10 contentful user-voice entries — no new entries this session
7. Sync hygiene: `git fetch origin && git rev-list --left-right --count origin/main...HEAD` should be 0/0
8. Inbox check — `handOffs/incoming/*.md` should be empty
9. Verify worktrees: `git worktree list` shows main only
10. Verify hook gate: `git config --get core.hooksPath` empty (Configuration B `.git/hooks/`) with pre-commit + post-commit + pre-push installed
11. Self-host bootstrap state check — `ls -la compiler/dist/self-host/`; partial-broken state persists from S102; decide whether to investigate OR delete to skip cleanly
12. **Maps currency check + REFRESH** — `head -3 .claude/maps/primary.map.md` will show `6616a69` watermark; HEAD is 22 commits ahead. REFRESH BEFORE any scrml-source-shape dispatch.
13. **Read `docs/known-gaps.md`** — rotated 4× during S108; current state has remaining MED-HI Bug 2 phantom-E-SYNTAX-050 + LOW-MED Bug 4 bare-`/` half + various v1.next L22 family enrichment items at varying priority.
14. **Surface carry-forward list** — top priority candidates: Bug 1 ring/gradient compound (medium); Bug 2 bisecting reducer; formFor v1.next (B2-B4); tableFor v1.next 6-item batch; variantNames (next L22 member); Native parser M2; Self-host bootstrap S102 carry.
15. Report: caught up + next priority

## Tags

#session-108 #CLOSE #20-commits #+217-pass #pre-commit-13304 #full-suite-16147 #match-block-phase-3-4-shipped #bug-5-p3-spec-742 #bug-1-floor-plus-full-fix-3-waves #bug-4-c-narrow-spec-conformance #form-for-b5-label-store #pgo-c2-fold #zero-regressions
