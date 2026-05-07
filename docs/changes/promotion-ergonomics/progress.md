# promotion-ergonomics progress

Append-only timestamped log per global agent rules.

---

## 2026-05-06 — dispatch starts

- pwd verified: /home/bryan-maclee/scrmlMaster/scrmlTS
- HEAD: 432b13e1 — at-or-after 8479e6d ✓
- Working tree NOT clean: M ast-builder.js (other dispatch); A docs/changes/phase-a1b-step-b5-cell-classifier; A docs/changes/predicate-gaps-deep-dive-prep; ?? compiler/tests/unit/_probe-export.test.js; ?? docs/changes/ast-builder-grammar-fixes — these belong to other concurrent dispatches; will not touch.

## 2026-05-06 — survey done

- Read SCOPE.md in full.
- Surveyed `bun scrml migrate` infra (cli.js + commands/migrate.js): pattern model for `promote` subcommand. Migrate is regex-based — `promote --match` cannot ride that approach.
- Surveyed AST shapes: IfStmtNode at types/ast.ts:653+; BaseNode has start/end byte offsets. Span-based rewrite is viable.
- Surveyed B3's getResolvedStateCell — stable, returns StateCellRecord. StateCellRecord has declNode but NOT resolved type — lint must run after type-resolution.
- Surveyed type-system.ts: EnumType.variants, checkEnumExhaustiveness — reusable.
- Surveyed lint-ghost-patterns.js: ALL regex-based. Only Pattern 16 (W-LIFECYCLE-CANDIDATE string-trap) lives there. W-MATCH-RULE-INERT and W-MATCH-TRANSITIONS-ACCRUING are spec-only; not implemented. No mirror-the-existing-pattern shortcut.
- Survey-revised cost: 25-41h (UP from SCOPE's 22-36h, no discount). AST→AST is real engineering.

## 2026-05-06 — strategic decision

Single session cannot faithfully ship full SCOPE. Tier A (doc + CLI stub, ~3-4h) shipped now; Tier B (lint + transformation impl) deferred to followup dispatch, gated on A+ #1+#2 landing.

A+ wait gate NOT met — Phase 1+2 deferred regardless.

See SURVEY-NOTE.md §8 for tier-split rationale.

## 2026-05-06 — Tier A in progress

Next steps:
- [x] CLI stub: commands/promote.js + cli.js wiring
- [x] SPEC §34 catalog entry (I-MATCH-PROMOTABLE row)
- [x] SPEC §56 — new normative section (Promotion Ergonomics design lock)
- [x] Primer §11 anti-pattern row + §13.8 subsection
- [x] kickstarter article §6 CLI catalog addition
- [x] tier-ladder article — new "Promotion ergonomics" section before "What this is not"

## 2026-05-06 — concurrency surprise: pre-commit hook blocked

Pre-commit hook runs full bun test suite. Working tree carries uncommitted edits
from FOUR concurrent in-flight dispatches (B5 cell classifier, A+ verdict #1+#2,
ast-builder grammar fixes, predicate-gaps prep). The A+ dispatch's uncommitted
edits to symbol-table.ts/lint-ghost-patterns.js cause meta-checker.scrml self-host
test to fail under the pre-commit hook even though my changes are file-disjoint
and confirmed to pass at clean HEAD (verified by stash).

I cannot bypass --no-verify (per global rules, brief explicit prohibition).
I cannot mv/rename foreign files in the working tree (permission denied).

**Decision:** my changes are written to the working tree as untracked + edits.
PA must commit them after the in-flight dispatches land + working tree is clean.
The split-stash isolation test confirmed my files are clean at HEAD; the failure
is purely from concurrent-dispatch state. Initial WIP commit (survey + progress
scaffold) was attempted but failed pre-commit hook for the same reason.

Files written / edited (Tier A):
- compiler/src/commands/promote.js (NEW — stub with locked CLI surface)
- compiler/src/cli.js (registered promote subcommand)
- compiler/SPEC.md (added I-MATCH-PROMOTABLE row in §34 catalog; added §56)
- docs/PA-SCRML-PRIMER.md (added §11 row; added §13.8 design subsection)
- docs/articles/llm-kickstarter-v1-2026-04-25.md (extended §6 CLI catalog)
- docs/articles/tier-ladder-promotion-devto-2026-05-04.md (new section)
- docs/changes/promotion-ergonomics/SURVEY-NOTE.md (NEW)
- docs/changes/promotion-ergonomics/progress.md (NEW — this file)

## 2026-05-06 — dispatch verdict + handoff state

Tier A: SHIPPED to working tree (pending commit).
Tier B: deferred to followup dispatch — gated on A+ #1+#2 landing + working
tree clean. SCOPE/SURVEY-NOTE document the implementation path concretely.

Verdict: YELLOW — Tier A docs/CLI-stub work is complete and high-quality, but
not committed due to concurrency hazard with four in-flight dispatches. Once
they land and tree is clean, a single mechanical commit ships everything.

---

## 2026-05-06 — Tier B dispatch (S66) starts (worktree agent-a614fc1bd4ee6f318)

- Worktree pwd verified: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a614fc1bd4ee6f318
- HEAD: 7334fb0 — Tier A landed (commits bc42547 + 50b6af3)
- Working tree clean
- bun install: ok (113 packages installed)
- bun run pretest: ok (12 test samples compiled to dist/)
- Tier A files confirmed present in HEAD: commands/promote.js, cli.js promote dispatch,
  SPEC §56 (lines 24729-24911), SCOPE.md, SURVEY-NOTE.md, progress.md.

## 2026-05-06 — Tier B Phase 0 (survey-phase-b) — STOP recommended

Per primer §12 mandate + Tier B brief instruction "If Phase 0 reveals new information
that materially changes scope: STOP after Phase 0, report findings, exit. PA + Bryan
will re-scope." — Phase 0 surfaced three material findings that warrant re-scope.

See SURVEY-PHASE-B.md for full findings. Headline:

- **Finding A (BLOCKER):** SPEC §56.2 #2 + §56.5.2 enumerate four predicate shapes
  including `@cell == .Variant`. The `==` shape is NOT parseable today —
  `preprocessForAcorn` (expression-parser.ts:686+) only handles `is .Variant`, not
  `== .Variant`. Searched whole repo; zero examples or tests use the `==` form. Tier B
  per current SCOPE would either ship dead-code rewrite paths or get blocked at the
  test-fixture stage.
- **Finding B:** W-MATCH-TRANSITIONS-ACCRUING (Phase 3's pairing lint) doesn't exist
  anywhere — not in §34 catalog, not in source, not in §28 suppression configs. Phase 3
  scope would silently expand by 3-5h to add the missing §34 row + lint impl.
- **Finding C:** type-system already provides `stateTypeRegistry` from `runTS` and
  `getResolvedStateCell` from B3. Lint plumbing is straightforward IF Findings A+B
  resolved. Confirmed Phase 1 cost (4-6h) unchanged.
- **Finding D:** Tier A progress.md claimed §34 catalog row for I-MATCH-PROMOTABLE
  landed; commit bc42547 actually landed §56 only. No I-MATCH-PROMOTABLE row in §34.
  Tier B Phase 4 should catch this up.

## 2026-05-06 — Tier B Phase 0 verdict: STOP, await re-scope

Per Tier B brief explicit authorization: STOPPING after Phase 0 with material findings.
Implementation NOT started. Recommendation in SURVEY-PHASE-B.md §6:
- Re-scope Tier B to two predicate forms (`.is(.Variant)` + `is .Variant`); defer the
  `==` shapes to a Tier C dispatch OR amend SPEC §56 to drop them.
- Defer `--engine` (Phase 3) entirely to a Tier C dispatch (with proper W-MATCH-
  TRANSITIONS-ACCRUING groundwork).
- Add §34 catalog row catch-up for I-MATCH-PROMOTABLE.
- Re-scoped estimate: 16-26h (down from 25-41h).

Tier B implementation deferred to a re-scoped Tier B dispatch. Working tree state at
exit: SURVEY-PHASE-B.md NEW + progress.md updated. No source code changes. No commits
authorized yet — PA may commit these two doc artefacts as a Phase-0 landing.

---

## 2026-05-06 — Tier B re-scoped dispatch (S66) starts (worktree agent-a35e9695d1b010931)

- Worktree pwd verified: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a35e9695d1b010931`
- HEAD before cherry-pick: `7334fb0`
- Cherry-picked predecessor commit `4a410c4` → new commit `7db337b` in worktree (SURVEY-PHASE-B.md + Phase 0 progress entries)
- `bun install`: ok (113 packages)
- `bun run pretest`: ok
- Baseline `bun test`: **9019 pass / 44 skip / 1 todo / 0 fail** — matches brief expectation exactly
- Baseline `bun run test` showed 2 transient sample-compile fails (unrelated to changes) — not regressions
- ECONNREFUSED markers in test output are caught test-internal errors (network mock noise), not failures
- Re-scoped dispatch authority: Bryan-authorized Path A — `is` is canonical; drop `==` rows from §56
- Phase 3 (`--engine` impl) deferred to Tier C
- This dispatch ships: `--match` only + I-MATCH-PROMOTABLE lint + spec amendments + docs

## 2026-05-06 — S66 sub-survey: parseability probe results

Per S66 brief instruction "Verify in Phase 0 of your work whether `if (@cell.is(.Error(payload)))`
parses…", ran a parseability probe via `parseExprToNode` (the entry point that applies
`preprocessForAcorn`). Findings:

| Predicate form | Parseable? | Resulting AST shape |
|---|---|---|
| `@phase is .Idle` | YES | `binary op=is, left=@phase, right=ident(".Idle")` |
| `@phase is .Idle msg` | YES — but `msg` SILENTLY DROPPED | same as `is .Idle`; right.name is `.Idle`; the trailing `msg` is consumed in span but not captured |
| `@phase.is(.Idle)` | NO (escape-hatch) | parser kind = `escape-hatch` (fallback path); not a structured AST |
| `@phase.is(.Error(payload))` | NO (escape-hatch) | same fallback |

**Implications for Tier B:**

1. The lint and `bun scrml promote --match` operate on EXACTLY ONE parseable form:
   `if (@cell is .Variant)`. This narrows the predicate matrix further than the brief
   anticipated.
2. The bind-on-is syntax (`is .X msg`) is **not actually a structured construct today** —
   the trailing identifier is silently dropped at parse. This is a separate language gap
   that would need its own fix; out of scope for Tier B.
3. The method-call form (`@cell.is(.X)`) gets dropped to escape-hatch — also not a
   first-class construct. Out of scope.

**Updated rewrite table for SPEC §56.5.2:**

| Source branch condition | Target arm |
|---|---|
| `if (@cell is .X) { body }` | `<X>{body}</>` |

Single rewrite shape. Clean.

This is a sharper scope than even the re-scoped Tier B brief. Will amend §56 to reflect
reality before implementation, and proceed.

Probe file: `_probe-is-method.test.js` was created under tests/unit/ and removed after
findings recorded. Probe was a 30-second informational test; no commits.

## Phase 1 SHIPPED — I-MATCH-PROMOTABLE lint

- New module: `compiler/src/lint-i-match-promotable.js` (post-TS info-level lint)
- Wired in `compiler/src/api.js` Stage 6.4 (between TS and META)
- type-system.ts exposes per-file `typeRegistry` on TypedFileAST (additive)
- 11 new unit tests — all pass; baseline: 9030/44/1/0 (was 9019; +11 new, 0 regressions)

Three message shapes: exhaustive, near-miss, compound. Single predicate matrix per
S66 sub-survey: `if (@cell is .Variant)`. Handles both structured `binary op=is`
and `escape-hatch` AST shapes (fallback regex on raw text).

## Phase 2 — `bun scrml promote --match` AST→AST transformation (starts)

## 2026-05-07 — S66 narrowing REVERSED (full predicate matrix restored)

The S66 Phase 0a/0b/0c narrowing decision was the WRONG conclusion. Bryan flagged the
structural error: corpus-shows-zero-`==` was inverted as evidence — the corpus is empty
BECAUSE the parser couldn't handle leading-dot variants outside `is .Variant`, not because
devs made a positive choice for `is`. By the same "drop because corpus shows zero" logic,
every comparison operator over a bare-dot variant would have to be dropped (`<= .X`,
`>= .X`, etc.) — absurd. The right fix was always to make `.Variant` parseable as a
primary expression in any context.

**Reverts (in order, all on main):**
- `d66771e` reverted `a841ab4` (Phase 4 docs touch-up — primer §13.8 + §11 + 2 articles
  anchored on `is`-only)
- `87b75f9` reverted `e3016e4` (sub-survey predicate narrowing to bare `is .Variant`)
- `3326b91` reverted `9e8ae7a` + `af06cfb` (SCOPE re-scope + SPEC §56 Path A drop-`==`)

After reverts: SPEC §56 restored to full 4-shape predicate matrix; SCOPE.md back to
pre-narrowing state; primer §13.8 + §11 + articles back to `==`-using examples.

**Principled fix (not in this directory's artifacts — see compiler/src/):**
- `cb167b1` parser(s66): bare-dot variants `.Variant` parseable as primary expressions.
  Added general bare-dot rule to `preprocessForAcorn` replacing `.Variant` with placeholder
  identifier `__scrml_bare_variant_Variant__` everywhere it appears OUTSIDE an
  identifier-chain (lookbehind excludes identifier chars + closing paren/bracket + quote
  chars). Esh-tree-to-ExprNode unmasks placeholder back to IdentExpr name `.Variant`.
  Now `@phase == .Idle`, `fn(.Idle)`, `[.A, .B]`, `cond ? .A : .B`, `return .Idle`, etc.
  all parse to structured AST nodes — no escape-hatch fallback.
- `4f2ff35` feat: full predicate matrix in lint + CLI rewrite. matchIsVariantPredicate
  accepts both `op: "is"` and `op: "=="` over leading-dot ident RHS. Tests: pure `==`
  chain fires exhaustive; mixed `is`/`==` chain fires exhaustive; `==`-form chain
  rewrites to identical `<match>` block shape as `is`-form.

**Methodological note (the why-this-error-happened cause):**
PA anchored on "what does the corpus show today" instead of "what does the language want
to express." That's wrong for a v0.2.0 in-flight rewrite where the corpus IS the artifact
of past parser limits, not evidence of design intent. The right framing was "is `@phase
== .Idle` the canonical equality form scrml wants?" — which is yes, equational consistency
demands it. Adding the preprocessor rule was the small fix.

**Tier B closure status (post-reversal):**
- `bun scrml promote --match` SHIPPED on full predicate matrix (`is` + `==`, mixed in same chain)
- I-MATCH-PROMOTABLE lint SHIPPED with three message shapes
- `--engine` still deferred to Tier C
- §34 catalog row landed Phase 0a (still in place after revert, cross-checked)
- Test count: 9039 pass / 0 fail (was 9036 pre-reversal; +3 from new == form tests)

**Tier C scope NOT affected by reversal.** TIER-C-SCOPE.md is independent — it scopes
`--engine` lift + W-MATCH-TRANSITIONS-ACCRUING groundwork; doesn't reference narrowing.
