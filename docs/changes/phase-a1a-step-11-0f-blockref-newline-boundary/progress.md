# Phase A1a Step 11.0f — `<x> = ?{SQL}\n<y>` BLOCK_REF newline-as-separator boundary fix — Progress

Branch: `phase-a1a-step-11-0f-blockref-newline-boundary`
Parent baseline HEAD: `713c843` (S61-extension-2 doc bundle wrap commit).
Test baseline: 8,886 pass / 44 skip / 0 fail / 8,930 across 439 files (verified 2026-05-05).

**Tier:** T2 — single-subsystem, parser-internal extension to Step 11.0b's
`collectExpr` ASI-NEWLINE branch. Mirrors Step 11.0e's pattern (1-LOC value-classifier
extension). Sample restoration + tests ride alongside.

## Survey

[step-11-0f startup] Worktree clean (`pwd` /
`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a2fda5fa64c5a861b`),
parent HEAD `713c843` matches BRIEF expectation. `bun install` → 113 packages.
`bun run pretest` → 12 samples compiled. `bun run test` first run flake (2
ECONNREFUSED), retry → **8,886 pass / 44 skip / 0 fail / 8,930 across 439
files** — matches BRIEF baseline. Branch
`phase-a1a-step-11-0f-blockref-newline-boundary` created.

[step-11-0f survey-locus-Q1] Locus per Step 11.0e progress.md confirmed.
File: `compiler/src/ast-builder.js`. The `collectExpr` ASI-NEWLINE branch
at L1959-2030. The `lastEndsValue` predicate at L1980-1987:
```
const VALUE_KEYWORDS = new Set(["true", "false", "null", "undefined", "this", "not"]);
const lastEndsValue = (
  lastKind === "IDENT" ||
  lastKind === "NUMBER" ||
  lastKind === "STRING" ||
  lastKind === "AT_IDENT" ||
  (lastKind === "KEYWORD" && VALUE_KEYWORDS.has(lastText)) ||
  (lastKind === "PUNCT" && (lastText === ")" || lastText === "]" || lastText === "}"))
);
```
**`BLOCK_REF` is NOT in any disjunct.** So when RHS ends in `?{SQL}`,
`lastKind === "BLOCK_REF"` → `lastEndsValue=false` → ASI-NEWLINE branch
doesn't fire → Step 11.0b's universal `<` IDENT lookahead at L2020-2030
also doesn't fire (it gates on `lastEndsValue`) → sibling `<y>` greedily
consumed into init.

[step-11-0f survey-Q2-block_ref-token-mechanics] BLOCK_REF tokens are
constructed at `compiler/src/tokenizer.ts` L796 with `tok.text = child.raw`
(the raw block content, e.g. ``?{`SELECT 1`}``). They represent embedded
child blocks (logic/sql/css/error-effect/meta children — per L20 spec).
A BLOCK_REF IS a value-producing terminal — semantically it's the
in-place result of the embedded child block. SPEC §6 establishes
`?{SQL}` as a SQL passthrough block expression — fully a value.

[step-11-0f survey-Q3-collectExpr-handling] Pre-fix trace for `<x> = ?{SQL}\n<y> = 0`:
- RHS collection enters via `tryParseStructuralDecl` after `=`.
- L1808 first iter: `tok=BLOCK_REF`, `parts.length=0`, L1817 doesn't fire
  (guard requires `parts.length > 0`). BLOCK_REF is consumed at L2164.
  After: `lastTok.kind="BLOCK_REF"`, `lastTok.text="?{...}"`,
  `parts=["?{...}"]`.
- L1808 next iter: `tok=PUNCT "<"`, on next line. depth=0, angleDepth=0,
  parts.length=1, line increased.
- L1959 ASI-NEWLINE branch entered. `lastKind="BLOCK_REF"`. The
  `lastEndsValue` disjuncts don't include BLOCK_REF → `false`.
- L1993 fast break gated on `lastEndsValue` → skipped.
- L2020 Step 11.0b `<` IDENT lookahead also gated on `lastEndsValue` → skipped.
- L1934 `IDENT =` boundary doesn't fire (tok.kind=PUNCT, not IDENT).
- Falls through to L2164 → `<` is consumed into parts.
- Cascading: `< y > = 0` all consumed into init string.
- Result: 1 state-decl with mangled init. Sibling lost.

[step-11-0f survey-Q4-probe-confirmation] Probe `_probe_step11_0f.mjs`
exercises 8 scenarios. Confirmed:

| Probe | Source pattern | Pre-fix result |
|---|---|---|
| T1 | `<x> = ?{SQL}\n<y> = 0` | **BROKEN** — 1 decl; init=`"?{SQL}\\n< y > = 0"` |
| T2 | `<x> = ?{SQL}\n@y = 0` | OK — 2 decls (BUG-R14 `AT_IDENT =` boundary doesn't gate on lastEndsValue) |
| T3 | `@x = ?{SQL}\n@y = 0` | OK — 2 decls (legacy path differs; `@x = …` parses via legacy `@`-form) |
| T4 | 3 V5-strict siblings, all `?{SQL}` | **BROKEN** — 1 decl (cascading) |
| T5 | `<x> = ?{SQL}\nconst <y>` | OK — 2 decls (`const` is STMT_KEYWORD; L1902 breaks) |
| T6 | `<x> = ?{SQL}\n<y>: T = init` | **BROKEN** — 1 decl (typed-decl Shape 2 sibling lost) |
| T7 | `<x> = ?{SQL}\n<formRes>\n…</>` | **BROKEN** — 1 decl (Variant C compound sibling lost) |
| T9 | `<x> = ?{SQL}; <y> = 0` | OK — 2 decls (semicolon explicit boundary) |

**Locus isolated to a SINGLE LINE: `lastEndsValue` predicate at L1980-1987
(specifically the disjunct list).**

[step-11-0f survey-coverage-Q5] Per BRIEF §3.4, probed other expression-shape
forms in `_probe_step11_0f_coverage.mjs`:

| Probe | Pattern | Result | Why |
|---|---|---|---|
| C1 | `<x> = `hello`\n<y>` | OK — 2 decls | template literal tokenizes as STRING |
| C2 | `<x> = obj.prop\n<y>` | OK — 2 decls | `prop` IDENT covered |
| C3 | `<x> = fn()\n<y>` | OK — 2 decls | `)` PUNCT covered |
| C4 | `<x> = arr[0]\n<y>` | OK — 2 decls | `]` PUNCT covered |
| C5 | `<x> = {a:1}\n<y>` | OK — 2 decls | `}` PUNCT covered |
| G1 | `<x> = <input value=?{...}/>\n<y>` | OK — 2 decls | markup-RHS via parseLiftTag, BLOCK_REF inside attr is consumed there |
| G3 | lift expr with BLOCK_REF interpolation | OK — 1 decl (no siblings) | uses collectLiftExpr (L2247) — different path |

**No P-FUP-4 surfaced.** Coverage is complete after BLOCK_REF is added.
The `lastEndsValue` disjunct list will then exhaustively cover ALL
value-producing trailing token kinds at this locus.

[step-11-0f survey-design-decision] **Approach: extend `lastEndsValue`
to recognize `BLOCK_REF`.** This is a 1-LOC semantic correction with
universal applicability:
- BLOCK_REF semantically IS a value-producing terminal (the in-place
  result of an embedded child block — sql, error-effect, meta, etc.).
  SPEC §6 establishes `?{SQL}` as a SQL passthrough block expression.
- The fix is symmetric with the existing `PUNCT")", PUNCT"]", PUNCT"}"`
  disjunct (closing-bracket terminals): BLOCK_REF, like a closing
  bracket, terminates an expression with a value.
- No `BLOCK_REF`-specific branch — just adding a new disjunct to the
  existing list. Mirrors Step 11.0e's pattern (1-character extension to
  a value-classifier list).

The fix slots into Step 11.0b's universal-fix infrastructure WITHOUT
introducing a BLOCK_REF-specific branch — it just teaches `lastEndsValue`
that BLOCK_REF is a value (which it semantically is).
**Universality preserved.**

[step-11-0f survey-Q6-no-regression-guards] Guards verified by survey:
1. **L1817 BLOCK_REF break guard at depth 0:** when a NEW BLOCK_REF
   follows existing parts at depth 0 outside markup, the `tok.kind ===
   "BLOCK_REF" && parts.length > 0 && tagNesting==0` check breaks
   BEFORE entering the ASI-NEWLINE branch. So `?{A} ?{B}` (two
   adjacent BLOCK_REFs) does NOT depend on the new disjunct — it
   breaks earlier via L1817. Adding BLOCK_REF to lastEndsValue does
   not change L1817 semantics.
2. **L1817 exception when `tagNesting > 0`:** BLOCK_REFs inside markup
   tags (e.g. `<input value=?{...}/>`) are consumed by parseLiftTag
   not collectExpr. Verified by G1 probe.
3. **collectLiftExpr (L2247) is a separate function** with its own
   boundary logic. Not affected by changes to collectExpr.

[step-11-0f survey-Q7-self-host-parity] Per Step 4-7 policy: deferred.
No codegen change. AST shape unchanged (state-decl `init` field still
strings; downstream stages handle the AST node uniformly whether init
contains a BLOCK_REF placeholder or not — that's already handled).

[step-11-0f survey-discount-9-status] **NOT discount #9.** Survey
confirms genuine source change required (1-line addition to the
`lastEndsValue` disjunct list). However, the source change is minimal:
adding `lastKind === "BLOCK_REF"` to the disjunct chain at L1980-1987.
Tests + sample restoration carry the lift.

## Plan

1. Edit `compiler/src/ast-builder.js` L1980-1987: add `lastKind === "BLOCK_REF"`
   disjunct to `lastEndsValue` predicate.
2. Re-run probe → confirm T1, T4, T6, T7 fixed; T2, T3, T5, T9 unchanged.
3. Run full `bun run test` → 0 regressions expected.
4. Restore `samples/compilation-tests/combined-007-crud.scrml` to V5-strict canon.
5. Verify decl-count parity vs legacy form.
6. Add §S11F test block to `parse-shapes-v0next.test.js` (~7 cases per
   BRIEF §4.2 including legacy regression test §S11F.7).
7. Final commit.
