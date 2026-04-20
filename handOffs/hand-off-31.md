# scrmlTS — Session 30 Wrap

**Date opened:** 2026-04-19
**Date closed:** 2026-04-19 (single-day session)
**Previous:** `handOffs/hand-off-30.md` (S29 wrap, rotated in as S30 starting brief)
**Baseline entering S30:** 7,186 pass / 10 skip / 2 fail (26,421 expects / 315 files) at `b189051`.
**Final at S30 close:** **7,222 pass / 10 skip / 2 fail** (26,480 expects / 315 files) at `e8ddc8d`.

---

## 0. Close state

### S30 commits — 4 commits, all pushed to origin/main
- `2eb4513` — `fix(tokenizer/css): element-leading compound selectors no longer collapse to declarations`
- `8217dd9` — `fix(package): point bin to compiler/bin/scrml.js (executable entry)`
- `5e663a4` (rebased onto `f0e7222`) — `fix(cli): surface ghost-pattern lint diagnostics by default`
- `e8ddc8d` — `feat(lint): cover Vue and Svelte ghost patterns (W-LINT-011..015)`

One external commit landed between mine (`8987201` — "minor edit to 6nz sectio" in README), rebased past cleanly.

### Uncommitted at wrap
- `docs/SEO-LAUNCH.md` — still untouched, 7 sessions running. Still no action.

### Incoming
- `handOffs/incoming/` empty (only `read/` archive).

### Cross-repo
- scrmlTSPub retirement still pending at master since S25.
- **New in scrml-support:** `docs/adopter-friction-audit-2026-04-19.md` — full audit with 13 findings (F1–F13), triage, and recommendations.

---

## 1. Session theme — "public pivot + golden-path adopter audit"

S30 opened with a strategic re-priority from the user: defer ALL self-host work (P3 in master-list + the S29-surfaced adjacent bugs a/b/c), focus on early-adopter friction. scrmlTS went public under MIT on 2026-04-17 and adopters were starting to arrive. Fixed-release-too-early risk was explicit.

Ran a structured golden-path audit as a first-time user: README → `bun install` → `bun link` → `scrml init` → `scrml dev` → edit with intentional typos → copy example standalone. The audit surfaced 13 distinct friction points; 4 were fixed this session.

Pivot recorded to memory (`project_public_pivot.md`) and user-voice so future sessions don't drift back toward self-host by default.

---

## 2. Session log

### Arc — session start + priority pivot

User message: "I want to defer all self-host work. we are public and people are starting to take interest. we need to focus on what these early adopters are actually going to hit. if early momentum dies because I released to early, it will be tragic."

Saved project memory, appended user-voice, proposed three first moves (golden-path audit / finish partial examples / error-quality audit). User picked golden-path audit.

### Arc — golden-path audit → 4 critical fixes

Walked README + install + scaffold + dev + realistic edits as a new adopter. Findings surfaced in order:

1. **README `bun install; scrml compile ...` is broken.** After `bun install`, `scrml` is not on PATH. Needs one-time `bun link` (undocumented). Also `package.json.bin` pointed at `compiler/src/cli.js` (mode 644, non-executable) — even after `bun link`, invoking `scrml` produced "permission denied".

2. **Scaffold's own `#{}` CSS block compiles to corrupted output.** Default `scrml init` includes `button:hover { background: #f5f5f5; }` — on compile, that line was space-mangled to `button: hover { background: #f5f5f5;` AND its closing `}` was dropped, consuming the next sibling rule (`label { ... }`) whole. Breadth: any element-leading compound selector (`a.foo`, `h1, h2`, `input:focus`, `div[disabled]`, `ul > li`) was affected. Root cause: `tokenizer.ts tokenizeCSS` ident path only recognised `<ident> {` as selector, sent everything else to the declaration path.

3. **Ghost-pattern lint pre-pass was invisible by default.** The W-LINT-001..010 catalog existed, the pass ran on every compile, but diagnostics were only printed under `--verbose`. Adopter typed `<button onClick={decrement}>` into the scaffold, got silent acceptance and a compiled-but-dead button.

4. **Ghost-lint catalog was React-centric.** Vue adopters typing `:class=`, `v-if=`, `@click=` got zero feedback. Svelte adopters typing `{#each}`, `{@html}` same.

Each fixed and pushed:
- `2eb4513` — CSS tokenizer compound-selector disambiguation (+10 tests T16–T25)
- `8217dd9` — `package.json bin` → `compiler/bin/scrml.js`
- `5e663a4 → f0e7222` — CLI prints lint diagnostics by default (compile + dev)
- `e8ddc8d` — W-LINT-011 (`:attr=`), W-LINT-012 (Vue directive family), W-LINT-013 (`@event=` shorthand), W-LINT-014 (Svelte blocks), W-LINT-015 (`{@html}`); +26 tests including a scaffold-zero-lint regression guard.

Suite: 7186 → 7222 (+36 new), 2 pre-existing failures unchanged.

### Arc — continued stress testing surfaced 1 critical + 8 known gaps

Systematic pattern coverage after the fixes went in. Ran the full 15-pattern W-LINT matrix against fresh `.scrml` files + a standalone example copy. Works cleanly. Found one critical remaining gap:

**Missing-`@`-sigil silent break (F5, NOT fixed).** Adopter declares `@count = 0`, writes `${count}` in markup (forgets `@`). Compile succeeds silently. HTML gets an empty `<span>`. JS gets a bare `count;` statement referencing an undefined global. The scope checker fires `E-SCOPE-001` for unquoted identifiers in ATTRIBUTE VALUES (`onclick=increment` → "Did you mean to quote or use @?"), but it doesn't descend into `${...}` interpolation contents inside markup. This is THE most common predicted adopter typo and it has zero feedback loop.

Parallels S29's component-def mask: a scope-pass gap is likely hiding more real bugs. Fix requires AST-builder or scope-pass investigation, not a one-liner.

---

## 3. Full friction catalog

Written to `../scrml-support/docs/adopter-friction-audit-2026-04-19.md`. Summary (13 findings, F1–F13):

- **Critical — fixed:** F1 CSS tokenizer (2eb4513), F2 package.json bin (8217dd9), F3 lint diagnostics hidden (5e663a4/f0e7222), F4 Vue/Svelte lint coverage (e8ddc8d).
- **Critical — open:** F5 missing-`@`-sigil silent break in markup interpolation.
- **High:** F6 `scrml init` no-arg scaffolds into CWD, F7 scaffold .gitignore mismatch, F8 scaffold lacks package.json/README, F9 scaffold lacks orientation comments, F10 README missing `bun link` step.
- **Medium:** F11 ugly relative paths past project root, F12 CSS output no trailing newline.
- **Low:** F13 CLI help grammar drift vs README/tutorial.

---

## 4. Current queue for S31+

### Unblocked (next session can pick directly)

1. **F5 — missing-`@`-sigil E-SCOPE-001 coverage.** Highest-leverage adopter fix remaining. Scope-pass investigation, possibly AST-builder gap. Likely cascades into real-error surfacing analogous to S29 component-def removal. Budget 1 session.

2. **F6 + F7 + F10 scaffold/CLI polish batch.** Require explicit dir (or prompt) for `scrml init`; update `.gitignore` default; add `bun link` to README install. Cheap, maybe 1–2 hours.

3. **F8 + F9 scaffold content polish.** Emit `package.json` with dev script + `README.md` in scaffold; add inline orientation comments. Cheap, adopter-facing.

### Carried from S28/S29 (NOW DEFERRED PER S30 PIVOT)

These are all self-host / compiler-internal and explicitly deferred until adopter-friction surface stabilizes:

- Bug (a) — `export class X` name extraction
- Bug (b) — `export function X` body scope-check skip
- Bug (c) — destructuring `const { a, b } = ...` fragmentation
- P3 continued — ast.scrml / ts.scrml / ri.scrml / pa.scrml / dg.scrml still FAIL in self-host build
- P5 ExprNode Phase 4d/5, Lift Approach C Phase 2, §51.13 phase 8, `<machine for=Struct>` cross-field invariants, async loading stdlib helpers, DQ-12 Phase B, Approach C lin

---

## 5. Non-compliance from map refresh (carried unchanged from S29)

- `master-list.md` header is 6 sessions stale (last updated S23). Needs refresh after this session; would be +4 commits, new F-series tracking, ghost-lint 10→15 patterns, etc.
- `compiler/SPEC.md.pre-request-patch` — 12,414-line pre-amendment backup still sitting next to SPEC.md. Grep-trap. Deref to scrml-support/archive/spec-drafts/ or delete.
- `docs/SEO-LAUNCH.md` uncommitted 7 sessions running.
- `benchmarks/fullstack-react/CLAUDE.md` agent-tooling in framework-comparison dir.

---

## 6. Memory + user-voice updates

- Saved project memory: `project_public_pivot.md` — scrmlTS public since 2026-04-17, self-host deferred, adopter-friction priority.
- Added to MEMORY.md index.
- User-voice appended with S30 entry — full verbatim of the strategic pivot.
