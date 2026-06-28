You are a dev-agent in an ISOLATED git worktree on the scrml compiler (branch off origin/main). Build the last unbuilt `promote` CLI verb: `--engine`. This is a RATIFIED ready build (S210 ruling B), collapsed to "just the span-rewrite" — NO new lint, NO `W-MATCH-TRANSITIONS-ACCRUING` (that name was DROPPED as redundant).

WORKTREE DISCIPLINE: Write ONLY via worktree-relative or worktree-absolute paths. NEVER write to a main-checkout absolute path (e.g. /home/bryan-maclee/scrmlMaster/scrml/compiler/... is the MAIN checkout — do not touch it). Verify `git rev-parse --show-toplevel` is your worktree before any write. After edits, `git status` must show only your intended files.

FIRST ACTION: archive this brief verbatim to `docs/changes/bug-20-promote-engine-2026-06-27/BRIEF.md` (in your worktree) and commit it.

## What you're building

The `--match` (if-else → `<match>`) and `--each` (for-loop → `<each>`) promote verbs already SHIP in `compiler/src/commands/promote.js`. Mirror their mechanics EXACTLY. `--engine` lifts a `<match for=T on=@cell>` block-form whose arms accrue inert `rule=` attributes into an `<engine for=T initial=.FirstVariant>` block (Tier 1→2 promotion) — the rules become ACTIVE transitions.

## Files (edit ONLY these)
- `compiler/src/commands/promote.js` — the verb. The current `--engine` is a STUB in `runPromote` (~lines 1535-1551) that prints "implementation pending (Tier C)" and exits 2. Replace it with a real rewrite path mirroring `promoteEachOnFile` (~1416-1502), `applyEachRewrite` (~1368), and the descending-offset splice pattern.
- `compiler/SPEC.md` §56.6 (~line 32451) — amend to drop the `W-MATCH-TRANSITIONS-ACCRUING` reference (dropped as redundant per S210 ruling B; the rewrite reuses the shipped `W-MATCH-RULE-INERT` as opportunity surface + `W-ENGINE-INITIAL-MISSING` for the default-initial path). Make §56.6's transformation text accurate to what you ship.
- `compiler/tests/unit/promote-engine.test.js` — NEW; mirror `compiler/tests/unit/promote-each.test.js` and `promote-match.test.js`.
- `docs/changes/bug-20-promote-engine-2026-06-27/BRIEF.md` — this brief.

## The transformation (INPUT → OUTPUT)

INPUT — a `<match>` block-form with inert `rule=` on arms (exactly what `W-MATCH-RULE-INERT` flags):
```
<match for=Phase on=@phase>
    <Idle rule=.Loading>
        <p>idle</p>
    </>
    <Loading rule=.Ready>
        <p>loading</p>
    </>
    <Ready>
        <p>ready</p>
    </>
</match>
```
OUTPUT — `<engine>` (rules become active transitions):
```
<engine for=Phase initial=.Idle>
    <Idle rule=.Loading>
        <p>idle</p>
    </>
    <Loading rule=.Ready>
        <p>loading</p>
    </>
    <Ready>
        <p>ready</p>
    </>
</>
```

Rewrite rules:
1. Opener `<match for=T on=@cell>` → `<engine for=T initial=.<firstArmVariantTag>>`. Drop `on=@cell` (engine owns/declares its own cell — verify against §51 + emit-engine.ts; see cell-name subtlety below). `initial=` = the FIRST arm's variant tag (the list-ratified default).
2. Arms (the `bodyChildren`) carry forward VERBATIM — each arm's `rule=`, any `internal:rule=`, payload bindings, and nested state-children / composite `<engine>` bodies. Slice arm source verbatim from the original; do NOT reconstruct arm bodies.
3. Closer `</match>` or `</>` → `</>` (engine block-form closes with `</>` — see `samples/compilation-tests/engine-011-internal-rule.scrml`).
4. Everything outside the match-block span preserved verbatim.
5. Idempotent: re-running on an `<engine>` is a no-op (the detector only finds `match-block` nodes, never `engine-decl`).

## Detector
Walk the typed-AST for `kind: "match-block"` nodes. The recursive walker `collectMatchBlocks` in `compiler/src/codegen/emit-match.ts` shows the node shape: `bodyChildren` (arms), `onExprRaw`, `forType`, plus `span`. Each arm carries a `variantName`/`isWildcard` and an attribute list where `rule=` is `{ name: "rule", ... }` (see `compiler/src/match-statechild-parser.ts` ~line 130-140 for the arm attribute struct). A match-block is `--engine`-promotable when ≥1 arm carries a `rule=` attr (the `W-MATCH-RULE-INERT` condition — read its fire site to confirm the exact field). Reuse the existing `collectTypedFiles(filePath)` bridge in promote.js to get the typed FileAST. Get each match-block's source span from `node.span.start`..`node.span.end`; splice with sites sorted DESCENDING by start offset (the existing `applyEachRewrite` pattern).

## Cell-name subtlety (ADVERSARIAL — fail-closed)
A `<match for=Phase on=@phase>` references an EXISTING cell `@phase`; an `<engine for=Phase>` DECLARES its own cell (auto-named from the type — `@appMode` for `AppMode` in engine-011). When the match's `on=` cell-name EQUALS the engine's type-derived cell-name, the drop is clean. When it DIFFERS (`<match for=Phase on=@somethingElse>`), promoting changes cell identity and likely breaks references → the transactional `sanityCheckParse(rewritten, filePath)` gate (already in promote.js) MUST catch the compile error and the rewrite reverts + reports `ambiguous`/skip. CONFIRM the gate fails-closed on this shape — never emit broken scrml. This is the `--match`/`--each` "revert any rewrite that fails to re-parse" precedent. Do NOT weaken the gate (S86 standing rule).

## Wiring
Replace the `if (mode === "engine") { ...stub... }` block in `runPromote` so `--engine` flows through your `promoteEngineOnFile` via the same `for (const file of uniqueFiles)` loop the `--match`/`--each` modes use (extend the ternary at ~line 1595). Update `printHelp()` to drop the "DEFERRED to Tier C / currently prints pending" language for `--engine`.

## VERIFY-FIRST (before building)
Run the current stub: `bun scrml promote --engine <anyfile.scrml>` → confirm it prints "pending" / exits 2. Construct a real match-block-with-`rule=` fixture and confirm `W-MATCH-RULE-INERT` fires on it today (`bun scrml compile <fixture>`) — that's your detector's ground truth.

## R26 acceptance
- `bun scrml promote --engine <fixture>` rewrites match→engine cleanly; the OUTPUT scrml-compiles clean (`bun scrml compile <output>` exit 0, no E-*).
- `--dry-run` prints a diff and writes nothing; `--check` exits non-zero when a site would promote.
- Idempotent: a second `--engine` run on the output = no-sites.
- ADVERSARIAL fixtures (each MUST either promote correctly OR cleanly skip via the gate — NEVER emit broken scrml):
  - multi-target arm `<X rule=(.A|.B)>` (rule carries forward verbatim)
  - payload-binding arm (check `samples/compilation-tests/engine-013-payload-binding-bare.scrml` / `engine-014-payload-binding-paren.scrml` for the shape)
  - `_` wildcard arm
  - already-`<engine>` input → no-op (no-sites)
  - single-arm match
  - `on=@cell` where cell-name ≠ type-derived → gate reverts, reports skip (NOT a broken rewrite)
- Full `bun run test` → 0 regressions. The suite is large (~17.6k+ tests, ~108-124s); the pre-commit hook runs it. NEVER `--no-verify`. Foreground commits may need a long timeout.

## Commit discipline
Commit incrementally on your worktree branch. Code + its coupled test = ONE commit (S113). Use `git commit -F <file>` if a message has `${}`/backticks.

## Report back
branch name · tip SHA · what you built (functions added, wiring changed) · VERIFY-FIRST result (stub confirmed) · R26 results per adversarial fixture · full `bun run test` pass/fail counts · any fixture that skipped (with reason) · the exact §56.6 edit you made.
