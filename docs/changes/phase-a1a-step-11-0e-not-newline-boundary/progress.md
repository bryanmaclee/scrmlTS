# Phase A1a Step 11.0e — `<x> = not\n<y>` newline-as-separator boundary fix — Progress

Branch: `phase-a1a-step-11-0e-not-newline-boundary`
Parent baseline HEAD: `ff3bd72` (S61-extension doc bundle wrap commit)
Test baseline: 8,878 pass / 44 skip / 0 fail / 8,922 across 439 files (verified 2026-05-05).

**Tier:** T2 — single-subsystem, parser-internal extension to Step 11.0b's `collectExpr`
ASI-NEWLINE branch. Aligns with 11.0b precedent.

## Survey

[step-11-0e startup] Worktree clean (`pwd` / git toplevel match
`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a19529c52d0f4fccc`),
parent HEAD `ff3bd72`. `bun install` → 113 packages. `bun run pretest` → 12 samples
compiled. `bun run test` first run flake → retry: **8,878 pass / 44 skip / 0 fail /
8,922 across 439 files** — matches BRIEF baseline. Branch
`phase-a1a-step-11-0e-not-newline-boundary` created.

[step-11-0e survey-locus-Q1] Where is `not` consumed?
- `compiler/src/ast-builder.js` L1870, L4548, L4653 — match-arm forms
  (`not =>`, `not => {`). Not relevant to P-FUP-2 (different context: arms
  inside `match { }`, terminated by `}`).
- `compiler/src/ast-builder.js` L2140 — E-EQ-002 recovery (`== not` →
  `is not`). Not relevant.
- `compiler/src/tokenizer.ts` L82 — `not` is in the `KEYWORDS` set and
  tokenizes as `KEYWORD` kind.
- **NO dedicated `<x> = not` decl path.** RHS `not` is consumed as a normal
  KEYWORD token by the inner `consume()` at L2155 in `collectExpr` and
  pushed as `parts.push(lastTok.text)` at L2170. So when `not` appears
  as the entire RHS of `<x> = not`, `lastTok.kind = "KEYWORD"`,
  `lastTok.text = "not"`.

[step-11-0e survey-step-11-0b-mechanism-Q2] Step 11.0b's ASI-NEWLINE branch
(L1959-2021) gates on `lastEndsValue` (L1971-1978):
```
const VALUE_KEYWORDS = new Set(["true", "false", "null", "undefined", "this"]);
const lastEndsValue = (
  lastKind === "IDENT" || lastKind === "NUMBER" || lastKind === "STRING" ||
  lastKind === "AT_IDENT" ||
  (lastKind === "KEYWORD" && VALUE_KEYWORDS.has(lastText)) ||
  (lastKind === "PUNCT" && (lastText === ")" || lastText === "]" || lastText === "}"))
);
```
**`not` is NOT in `VALUE_KEYWORDS`.** So when RHS is just `not`,
`lastEndsValue=false` → ASI-NEWLINE branch never fires → `<y>` opener on
the next line is greedily consumed into the init string.

[step-11-0e survey-probe-Q3+Q4] Probe `_probe_step11_0e.mjs` exercises 7
scenarios. Confirmed:

| Probe | Source pattern | Pre-fix result |
|---|---|---|
| T1 | `<x> = not\n<y> = 0` | **BROKEN** — 1 decl; init=`"not\n< y > = 0"` (sibling consumed) |
| T2 | `@x = not\n@y = 0` | OK — 2 decls (legacy `@`-form path differs) |
| T3 | `<x> = not\n@y = 0` | OK — 2 decls (next-line is `@y` legacy form, hits a different boundary) |
| T4 | 3 V5-strict siblings, first 2 = `not` | **BROKEN** — 1 decl (cascading) |
| T5 | `<x> = not\n<div>...` | **BROKEN** — markup line consumed |
| T6 | `<x> = not; <y> = 0` | OK — semicolon explicit boundary |
| T7 | `<x> = pinned\n<y>` | **OK** — `pinned` tokenizes as IDENT, not KEYWORD |

T7 is the critical contrast: `pinned` is NOT in the tokenizer's KEYWORDS
list (`compiler/src/tokenizer.ts` L55-89), so it tokenizes as IDENT →
`lastEndsValue=true` (lastKind === "IDENT") → Step 11.0b's boundary fires.
`not` is in KEYWORDS → tokenizes as KEYWORD → `VALUE_KEYWORDS` doesn't
include it → `lastEndsValue=false` → boundary doesn't fire.

This isolates the locus to a SINGLE LINE: `VALUE_KEYWORDS` set at L1970.

[step-11-0e survey-design-decision] **Approach: extend `VALUE_KEYWORDS`
to include `"not"`.**

This is a 1-character semantic correction with universal applicability:
- `not` per SPEC §42.1 IS "both a value and a type." It is the absence
  primitive — value-producing.
- SPEC §42.2.1 shows `${ let x = not }` and `${ @name = not }` as
  canonical absence assignments — `not` is a legitimate trailing
  value in the RHS position.
- E-TYPE-045 (SPEC §42.6) explicitly forbids `not` as a prefix
  operator — it is always value-producing, never an opener.
- `is not` operator: when `is not` ends a sub-expression, the trailing
  `not` IS the last token. With this fix, ASI fires correctly on
  `<x> = a is not\n<y>`. (No regression — `not` ending an `is not`
  expression IS value-producing.)

The fix slots into Step 11.0b's universal-fix infrastructure WITHOUT
introducing a `not`-specific branch — it just teaches `lastEndsValue`
that `not` is a value (which the language SPEC says it is).
**Universality preserved.**

[step-11-0e survey-other-modifier-keywords] Per BRIEF §6 risk surface:
checked `pinned` (T7) — works because it's not a keyword. Other
M11-family modifiers are also not in tokenizer KEYWORDS (`req` is also
non-keyword), so they tokenize as IDENT and don't have this issue.
**`not` is unique in this class of bug** because it is the only
M11-related construct that BOTH (a) is a tokenizer KEYWORD and (b) can
appear as a complete RHS value.

Other tokenizer KEYWORDS that COULD appear as a complete RHS:
- `true`, `false`, `null`, `undefined`, `this` — already in VALUE_KEYWORDS.
- Other reserved keywords (`fail`, `transaction`, `new`, etc.) — these
  are statement openers / operators, never standalone-value-producing
  in trailing position.

Confirmed: extending VALUE_KEYWORDS with `"not"` is sufficient.

[step-11-0e survey-discount-9-status] **NOT discount #9.** Survey
confirms genuine source change required (1-line addition to the
VALUE_KEYWORDS set). However, the source change is minimal: adding
`"not"` to a Set literal at L1970. Tests + sample restorations carry
the lift.

[step-11-0e survey-self-host-parity] Per Step 4-7 policy: deferred.
No codegen change. AST shape unchanged (state-decl init field still
strings; downstream stages handle the AST node uniformly whether init
is `"not"`, `"5"`, or any other expression).

## Plan

1. Edit `compiler/src/ast-builder.js` L1970: add `"not"` to VALUE_KEYWORDS.
2. Re-run probe → confirm T1, T4, T5 fixed; T2, T3, T6, T7 unchanged.
3. Run full `bun run test` → 0 regressions expected.
4. Restore the 5 reverted Step 12 samples to V5-strict canon (per BRIEF §4.1).
5. Run `scripts/step12-validate-batch.mjs HEAD~5 HEAD` (or equivalent
   probe) on each restored sample to verify decl-count parity.
6. Add §S11E test block to `parse-shapes-v0next.test.js` (~7 cases per
   BRIEF §4.2 including legacy regression test §S11E.7).
7. Final commit + push.
