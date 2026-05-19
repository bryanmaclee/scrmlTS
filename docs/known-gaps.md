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

### Bug 1 — Tailwind arbitrary-value classes silently no-op — `floor-shipped` (S108) — full fix open

`grid-cols-[auto_1fr_auto]`, plus any `<utility>-[<value>]` class whose particular utility prefix is not yet supported by the embedded engine (NOTE: investigation during the FLOOR fix found `w-[420px]` and `text-[clamp(1rem,2vw,1.5rem)]` ARE handled by the engine today — only certain prefix families like `grid-cols-*` are missing). Layout breaks silently for unsupported prefixes.

**FLOOR fix shipped S108** — `W-TAILWIND-UNRECOGNIZED-CLASS` info-level lint (SPEC §34, §26.5). The lint fires on any class-name token in `class="..."` that doesn't resolve via the embedded Tailwind registry. Adopters now see compile-time friction at the spot the silent-no-op used to be. Three legitimate causes are named in the message (misspelling / unsupported arbitrary-value / custom CSS class). Suppressible per-project via `compilerSettings.lintTailwindUnrecognizedClass = "off"` for adopters whose codebase relies on custom CSS class names (acknowledged false-positive surface). Compiler source at `compiler/src/tailwind-classes.js` (`findUnrecognizedClasses`); 34-test coverage at `compiler/tests/unit/bug-1-tailwind-unrecognized-class.test.js`.

**Full fix still open** — actually emit CSS for the unrecognized arbitrary-value classes (`grid-cols-[auto_1fr_auto]` → `grid-template-columns: auto 1fr auto`), plus a safelist / `@apply` mechanism to distinguish custom user-defined classes from typos so the lint is precise.

- **Workaround (for unsupported arbitrary-values):** drop a `#{}` CSS shim block with the rules written by hand.
- **Reproducer + analysis:** [`handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md`](../handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md) §"Bug 1".
- **Status:** FLOOR closed S108; full fix not yet SCOPING'd.

### Bug 2 — Phantom `E-SYNTAX-050` on multi-line `<a>` + entity-encoded element-name body — `spec'd`

`<a href="..." \n class="...">\n &lt;program&gt;\n </a>` triggers `E-SYNTAX-050: Bare '/' is no longer a valid closer` on a line containing no `/`. The error reports a wrong line number; cascade of unrelated "unclosed" errors follows. Compile fails on apparently-valid source.

- **Workaround:** collapse the `<a>` opener onto a single line OR change attribute ordering (the exact axis isn't bisected yet).
- **Reproducer + analysis:** [`handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md`](../handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md) §"Bug 2".
- **Status:** not yet SCOPING'd; needs minimal bisecting reducer.

---

## LOW-MED

### Bug 4 — Bare `?{` / `/` in markup-text body has no docs-mode escape — `spec'd`

Writing scrml-about-scrml content (any docs site, README example, blog post about scrml syntax) hits this: bare `?{` opens an SQL context that runs to EOF; bare `/` parses as element closer. Three design options surfaced: docs hardening (entity-escape pattern documentation), docs-mode lint (warn on context-opener outside `<pre>`/`<code>`), markup-text-mode tokenizer awareness (recognize context openers only inside explicit context shapes).

- **Workaround:** wrap context-opener tokens in `<code>` + entity-encode (`<code>?&#123;</code>`, `<code>&#47;</code>`).
- **Reproducer + analysis:** [`handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md`](../handOffs/incoming/read/2026-05-19-0614-side-session-to-scrmlTS-PA-dogfood-bug-surface.md) §"Bug 4".
- **Status:** needs deep-dive on design space.

---

## Closed in S107-S108 (for reference; will rotate out)

- **Bug 5 (all phases)** — `${IDENT}` non-reactive interpolation: Phase 1 textContent at DOMContentLoaded (S107 `c70176e`) + Phase 2 Anomalies B+C closure (S107 `a7fbfa8`) + Phase 3 constant-folding (Option γ) + SPEC §7.4.2 normative section (S108). Constants like `const VERSION = "v0.3.0"` + `${VERSION}` now fold inline at compile time — zero placeholder, zero JS wiring, zero runtime cost.
- **Bug 3** — `[BS]` / `[TAB]` diagnostics now carry `file:line:col` prefix matching `[W-LINT-*]` shape (commit `2e9f9c3`)
- **Bug 6** — 2 hallucinated error-code references in `docs/website/pages/` retired to canonical SPEC §34 names (commit `c4d1114`)
- **Match block-form Phases 1+2+3+4** — structural AST node (S107 `82c48fd`) + 5 SYM diagnostics + arm parser + `:`-shorthand recognition (S107 `c91fae0`) + Phase 3 codegen render dispatch with per-arm render fns + variant-guarded dispatcher (S108) + **Phase 4 `:`-shorthand body codegen** (S108) — bodyRaw parsed as expression via `parseExprToNode`, synthesized into `logic > bare-expr` AST node, routed through standard interpolation path (folds inline for constants per Bug 5 P3; placeholder + reactive binding for `@cell` refs). Tier 1 of the case-analysis ladder is now end-to-end functional for: bare-body markup, self-closing, `:`-shorthand expressions, parenthesized payload bindings. Phase 5 follow-on (wildcard explicit render, payload-binding typer scope, bare-variant inference in nested expression positions) deferred to v0.4+.

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
