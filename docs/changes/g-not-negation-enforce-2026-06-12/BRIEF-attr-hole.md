FOLLOW-UP BRIEF — close the bare-`not`-in-ATTRIBUTE-value E-TYPE-045 hole (g-not-negation-enforce, S188)

# TASK
The g-not-negation-enforce landing (main `736166b4`) wired E-TYPE-045 for prefix-`not`-as-negation at the expression-parser lowering choke-point (`preprocessForAcorn` stamps `_notPrefixNegation` → `harvestNotPrefixNegation` TS-J). PA independent R26 caught a RESIDUAL HOLE: **bare (non-parenthesized) prefix-`not` in ATTRIBUTE values does NOT fire E-TYPE-045.** Close it. Branch from current main (which HAS the choke-point fix — build on it, do NOT re-do it).

# THE HOLE (PA-verified, isolated)
| Repro | Position | Current | Want |
|---|---|---|---|
| `<p if=not @y>z</p>` (h1) | bare-`not` in `if=` attr | **silent ✗** | FIRE E-TYPE-045 |
| `<p if=@x && not @y>z</p>` (h2) | bare-`not` `&&`-operand in `if=` attr | **silent ✗** | FIRE |
| `<p show=not @y>z</p>` (h6) | bare-`not` in `show=` attr | **silent ✗** | FIRE |
| `<p if=(not @y)>z</p>` (h5) | PAREN-`not` in `if=` attr | fires ✓ | stays FIRE (exactly once — NO double) |
| `${ @a && not @b }` (h3) | bare-`not` `&&` in LOGIC | fires ✓ | stays FIRE (once) |
| `${ @a && not @b ? x : y }` (h4) | bare-`not` in interpolation | fires ✓ | stays FIRE (once) |
| `${ not @x ? a : b }` (f1) / `not (@x==1)` (f2) | ternary | fires ✓ | stays FIRE (once) |
| `if (not (flag))` golden fixture | if-STATEMENT | fires ✓ | stays FIRE (once) |

So: bare-`not` in any ATTRIBUTE value (`if=`/`show=`/`while=`/any boolean-condition attr) is the uncovered position. Paren-in-attr + all logic/interp/ternary/if-stmt positions already fire via the choke-point harvest.

# ROOT (diagnose first — Phase 0)
Likely: a bare-`not` in an attribute value routes through the codegen `rewriteNotKeyword` / `compiler/src/codegen/rewrite.ts` `_rewriteNotSegment` lowering (a SECOND, separate `not`→`!` site that already has an `errors?` sink and already emits E-TYPE-042 / E-SYNTAX-010 with the SAME regex shapes) — NOT through `parseExprToNode`/`preprocessForAcorn` (the stamping choke-point). That is why paren-in-attr (which DOES route through the choke-point) fires but bare-in-attr does not. **Verify this empirically** — grep/trace how `if=`/`show=` attribute-value expressions are lowered + where bare-`not` in an attr gets its `not`→`!`. Confirm the exact path before fixing.

# FIX (Phase 1 — pick the mechanism after Phase-0 diagnosis)
Two candidate approaches — choose the one that closes ALL attr-bare positions WITHOUT double-firing on the already-covered cases:
- (A) Emit E-TYPE-045 at the codegen `_rewriteNotSegment` bare-`not` substitution (the sink already exists; mirror the E-TYPE-042 emit pattern). **CAUTION:** Agent-3's survey found the sink is wired only on the CLIENT pass (`clientPasses` Pass 2 `rewriteNotKeyword(s, ctx.errors)`); the SERVER pass + `emit-library.ts` callers pass NO errors — wire `ctx.errors` there too if attr-bare can reach those. **CAUTION:** ensure this does NOT also fire on attr-PAREN (h5) or any case the harvest already covers → DOUBLE-FIRE. If the codegen path sees both bare + paren, scope the new emit to the bare form only, OR dedup by span against the harvest's already-fired set.
- (B) Route attribute-value conditions through `parseExprToNode` (the stamping choke-point) so bare-`not`-in-attr stamps `_notPrefixNegation` like every other position — single source of truth, no second emit site. Preferred IF attr-values can be cleanly routed without disturbing attr codegen.

**The non-negotiable invariant: every position in the h1-h6 matrix fires E-TYPE-045 EXACTLY ONCE (no double-fire, no miss).** The harvest already dedups by span — leverage that.

# DO NOT
- Re-implement the choke-point harvest (it is landed + correct for 5/6 positions).
- Touch the corpus migration (62 sites already migrated + landed).
- Touch `compiler/native-parser/` (deferred to ~v0.8 cutover).
- Break any valid-`not` form (`is not`, `= not`, `return not`, regex interiors) or the golden fixture.

# TESTS (Phase 2)
Add attr-bare cases to `compiler/tests/unit/e-type-045-prefix-not-all-positions.test.js` (it currently MISSES the attr-bare position — that is why the suite was green despite the hole): assert E-TYPE-045 fires on `<p if=not @y>`, `<p if=@x && not @y>`, `<p show=not @y>`; assert it does NOT double-fire on `<p if=(not @y)>` (exactly one E-TYPE-045). Keep all existing tests green.

# SPEC/GAP (Phase 3)
- known-gaps.md: flip `g-not-negation-unenforced` `status=open` → `status=resolved`; update the `### G-NOT-NEGATION-UNENFORCED` header descriptor + the PARTIAL-LANDING note to a RESOLVED note (the attr-bare hole now closed; all 6 positions fire). The 4 sibling dog-food gaps (`g-derived-rhs-interp-wrapped`, `g-given-rebind-not-rejected`, `g-division-in-ternary-arm`, `g-attr-gte-tagclose`) are UNCHANGED — do NOT touch them.
- SPEC §42.10 already lists "attribute `if=`" — no SPEC change needed unless the diagnosis reveals a spec gap.

# Phase 4 — R26 EMPIRICAL (mandatory; the same dual-verify that caught the hole)
Compile via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile`: the full h1-h6 matrix — h1/h2/h6 MUST now fire E-TYPE-045 (exactly once each); h3/h4/h5/f1/f2 + the golden if-stmt MUST still fire exactly once (grep count == 1, NO double); valid forms (`x is not`, `@x = not`, `return not`, regex `/not found/i`) clean; flagship `examples/23-trucking-dispatch` still 0-error. **DO NOT mark DONE without this passing.** Report the per-position fire-count.

# STARTUP + PATH DISCIPLINE (worktree)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-` — else STOP (S90). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT; `git status --short` clean; `git merge main` (base MUST contain `736166b4`); `bun install`; `bun run pretest`.
3. Edits via Bash (`perl`/`python3`/heredoc) on worktree-absolute paths incl. `.claude/worktrees/agent-<id>/`; NOT Edit/Write (S126). Never `cd` into main; use `git -C "$WORKTREE_ROOT"` + worktree-absolute paths. First commit msg includes verbatim `pwd`.
4. Read `.claude/maps/primary.map.md` first (maps reflect HEAD ~736166b4 / 2026-06-12).

# COMMIT DISCIPLINE
Commit incrementally per phase (crash-recovery); update `docs/changes/g-not-negation-enforce-2026-06-12/progress.md` (append-only). ONE coupled change (fix + test + gap-flip). No `--no-verify`. `git status` clean before DONE; run full `bun run test` (zero new fails; the only deltas are the new attr-bare test cases).

# FINAL REPORT
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED · the diagnosed root path + the chosen mechanism (A or B) + how double-fire is prevented · the h1-h6 per-position fire-count · full-suite pass/fail/skip · R26 results · maps feedback.
