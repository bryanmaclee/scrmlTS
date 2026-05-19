# Known gaps — spec-vs-implementation drift

> **Honest current state.** The README describes the nominal language at the time of any version release ("does not describe what the compiler is perfectly capable of doing"). This document is the running ledger of the largest places where the compiler does NOT yet match the nominal spec. Entries are added as gaps surface (e.g., during dogfood passes, adopter bug reports, audit passes), and removed when the gap closes via a landed implementation arc.
>
> **Severity legend:** HIGH = adopter-visible breakage on a documented pillar feature. MED = silent acceptance + missing safety guarantees. LOW = ergonomic / cosmetic drift.
>
> **Per-gap status:** `spec'd` = SPEC normative + compiler does nothing · `scoping` = SCOPING.md authored, OQs open · `in-impl` = implementation arc actively in flight · `blocked` = waiting on something else
>
> Updated 2026-05-19 (S108).

---

## MED-HI

### Bug 1 — Tailwind arbitrary-value classes silently no-op — `full-fix-shipped` (S108) for grid/flex/aspect + transition/timing + transforms (individual + shorthand + directional) + outline; ring + gradient + safelist still open

**S108 — FULL-FIX FOR GRID/FLEX/ASPECT + TRANSITION/TIMING + TRANSFORMS + OUTLINE FAMILIES SHIPPED** in three waves. Wave 1 (S108 `37f8f62`): grid family (`grid-cols-`, `grid-rows-`, `col-span-`, `row-span-`, `col-start/end-`, `row-start/end-`), flex family (`flex-`, `grow-`, `shrink-`, `order-`, `basis-`), aspect family (`aspect-`) + universal underscore-as-space convention + ratio shape `aspect-[16/9]` + grid-track CSS functions (`repeat()`, `minmax()`, `fit-content()`). Wave 2 (S108 v2 follow-on `bdb9287`): transition/timing family (`transition-`, `duration-`, `delay-`, `ease-`) with `cubic-bezier()` + `steps()` function support; modern individual transform props (`rotate-`, `scale-`, `translate-`); outline family (`outline-`, `outline-offset-`). Wave 3 (S108 v3 follow-on): transform shorthand (`transform-[rotate(45deg)_scale(1.5)]`) + directional `translate-x-` / `translate-y-` / `scale-x-` / `scale-y-` (emit modern individual CSS props with single-axis form) + directional `rotate-x-` / `rotate-y-` / `rotate-z-` / `skew-x-` / `skew-y-` (emit `transform: <fn>(...)` shorthand). VALID_MATH_FUNCTIONS expanded with all 2D + 3D transform function names (`rotate`, `scale`, `translate`, `skew`, `rotateX/Y/Z`, etc.).

**FLOOR fix shipped S108** — `W-TAILWIND-UNRECOGNIZED-CLASS` info-level lint (SPEC §34, §26.5). The lint fires on any class-name token in `class="..."` that doesn't resolve via the embedded Tailwind registry. Adopters see compile-time friction at the spot the silent-no-op used to be. Three legitimate causes named in the message (misspelling / unsupported arbitrary-value / custom CSS class). Suppressible per-project via `compilerSettings.lintTailwindUnrecognizedClass = "off"` for adopters whose codebase relies on custom CSS class names (acknowledged false-positive surface). Compiler source at `compiler/src/tailwind-classes.js` (`findUnrecognizedClasses`); 39-test coverage at `compiler/tests/unit/bug-1-tailwind-unrecognized-class.test.js`. Lint and emit share a single source-of-truth via `getTailwindCSS()` — when the engine ships a new family the lint automatically stops firing on it (verified by S108 regression tests).

**S108 full-fix coverage:** 66-test wave-1 + 26-test wave-2 + 23-test wave-3 across `compiler/tests/unit/bug-1-tailwind-{arbitrary-value-emit,minor-families,transform-shorthand}.test.js`.

**Remaining open** — Tailwind compound utilities that DON'T map 1:1 to a single CSS property: `ring-*` / `ring-offset-*` (box-shadow stack trick) + `bg-gradient-*` / `from-*` / `to-*` / `via-*` (gradient stop-color compound) + string-shaped values like `content-["text"]` + `font-[Inter]` (quoted strings need bracket-parser extension). All continue firing the lint with the `#{}` workaround. Also still open: safelist / `@apply` mechanism to distinguish custom user-defined classes from typos so the lint is precise on mixed Tailwind+custom-CSS codebases.

- **Workaround (for still-deferred families):** drop a `#{}` CSS shim block with the rules written by hand.
- **Reproducer + analysis:** [`handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md`](../handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md) §"Bug 1".
- **Status:** FLOOR closed S108; full-fix for grid/flex/aspect + transition/timing + individual transforms + outline shipped S108; ring + gradient + transform shorthand + safelist still open.

### Bug 2 — Phantom `E-SYNTAX-050` on multi-line `<a>` + entity-encoded element-name body — `spec'd`

`<a href="..." \n class="...">\n &lt;program&gt;\n </a>` triggers `E-SYNTAX-050: Bare '/' is no longer a valid closer` on a line containing no `/`. The error reports a wrong line number; cascade of unrelated "unclosed" errors follows. Compile fails on apparently-valid source.

- **Workaround:** collapse the `<a>` opener onto a single line OR change attribute ordering (the exact axis isn't bisected yet).
- **Reproducer + analysis:** [`handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md`](../handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md) §"Bug 2".
- **Status:** not yet SCOPING'd; needs minimal bisecting reducer.

---

## LOW-MED

### Bug 4 — Bare `/` in markup-text body parses as element closer — `spec'd`

The `?{` half of the original Bug 4 surface closed at S108 via Approach C-narrow (markup-text-mode locus gate per SPEC §3.1 + §8.1). The bare-`/` half remains open. Writing scrml-about-scrml prose where `/` appears in text (e.g., "`""` / `0` / `[]` are all defined values") can still confuse the BS-layer's `looksLikeCloser` heuristic in edge cases. Per the deep-dive's broad-C disposition, this is a refinement of the bare-`/` look-ahead at `block-splitter.js:1962-1987` — additional ~10-20 LOC. Deferred pending friction signal beyond the dogfood report's single citation.

- **Workaround:** entity-encode (`&#47;`) when `/` appears at scrml-content-as-data positions in prose.
- **Reproducer + analysis:** [`handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md`](../handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md) §"Bug 4" + deep-dive §"Broad C".
- **Status:** Q-BUG4-OPEN-5 in deep-dive `scrml-support/docs/deep-dives/bug-4-docs-mode-escape-2026-05-19.md`; broad-C extension if friction surfaces.

---

## Closed in S107-S108 (for reference; will rotate out)

- **Bug 5 (all phases)** — `${IDENT}` non-reactive interpolation: Phase 1 textContent at DOMContentLoaded (S107 `c70176e`) + Phase 2 Anomalies B+C closure (S107 `a7fbfa8`) + Phase 3 constant-folding (Option γ) + SPEC §7.4.2 normative section (S108). Constants like `const VERSION = "v0.3.0"` + `${VERSION}` now fold inline at compile time — zero placeholder, zero JS wiring, zero runtime cost.
- **Bug 3** — `[BS]` / `[TAB]` diagnostics now carry `file:line:col` prefix matching `[W-LINT-*]` shape (commit `2e9f9c3`)
- **Bug 6** — 2 hallucinated error-code references in `docs/website/pages/` retired to canonical SPEC §34 names (commit `c4d1114`)
- **Match block-form Phases 1+2+3+4** — structural AST node (S107 `82c48fd`) + 5 SYM diagnostics + arm parser + `:`-shorthand recognition (S107 `c91fae0`) + Phase 3 codegen render dispatch with per-arm render fns + variant-guarded dispatcher (S108) + **Phase 4 `:`-shorthand body codegen** (S108) — bodyRaw parsed as expression via `parseExprToNode`, synthesized into `logic > bare-expr` AST node, routed through standard interpolation path (folds inline for constants per Bug 5 P3; placeholder + reactive binding for `@cell` refs). Tier 1 of the case-analysis ladder is now end-to-end functional for: bare-body markup, self-closing, `:`-shorthand expressions, parenthesized payload bindings. Phase 5 follow-on (wildcard explicit render, payload-binding typer scope, bare-variant inference in nested expression positions) deferred to v0.4+.
- **Bug 4 (`?{` half) — markup-text-mode SQL locus gate (Approach C-narrow)** — S108 deep-dive at `scrml-support/docs/deep-dives/bug-4-docs-mode-escape-2026-05-19.md` (530 lines) ratified C-narrow per SPEC §3.1 + §8.1 conformance ("SQL is a child of Logic, not markup-text"). Bare `?{` in markup-text body no longer opens an SQL context — adopters writing scrml-about-scrml docs prose can write `?{` literally without the pre-S108 EOF-cascade. 86% of adopter pages (83 of 96) already used entity-escape workarounds — zero migration cost. SPEC §4.17 amended with the locus-gating principle cross-ref. Companion bare-`/` half deferred (Q-BUG4-OPEN-5; broad-C extension if friction surfaces).

---

## Where this list comes from

- **Dogfood bug reports** filed when the user/PA hits friction on real adopter-shaped work — see `handOffs/incoming/read/` for archived reports.
- **Spec-vs-impl audit passes** when sweeping a SPEC section (e.g., the S107 §18.0 surface audit that discovered the match block-form gap).
- **Adopter bug reports** (none yet; will flow through GitHub Issues when first surfaces).
- **PA self-discovery** during implementation work when a planned fix surfaces a deeper gap (e.g., the W-MATCH-RULE-INERT lint attempt surfacing the broader §18.0.1 unparsed state).

## Where to discuss / report

- New gaps in adopter code: file a GitHub Issue (link TBD; repo at https://github.com/bryanmaclee/scrmlTS)
- Cross-reference with phase status: [`master-list.md`](../master-list.md) §0 LIVE DASHBOARD
- Per-gap implementation arcs: [`docs/changes/`](./changes/) — each gap with an active impl arc has a SCOPING.md + progress.md there
- Per-session landings: [`docs/changelog.md`](./changelog.md)
