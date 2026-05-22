# progress — M5-swap Wave 1 combined B4 + B5 + B6

Native-parser core-scrml keyword units. Append-only, timestamped.

Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a8b362b65d899eb5c
Branch: worktree-agent-a8b362b65d899eb5c
Base SHA: 6db511a1

## 2026-05-21 — startup

- Startup verification PASS: pwd under worktrees/agent-, git toplevel matches,
  `git merge main` already up to date, tree clean, `bun install` OK.
- Baseline `bun test compiler/tests/` = 18278 pass / 0 fail / 169 skip. Green.
- Read DD m5-swap-redecomposition Tier B (§B4/§B5/§B6) + primary.map.md.
- Surveyed token.js, ast-stmt.js, parse-stmt.js, translate-stmt.js,
  live ast.ts (LinDeclNode / TypeDeclNode / FunctionDeclNode shapes),
  live ast-builder.js (fn-modifier + type-decl parse paths), SPEC §34.1 + §35.2.

## 2026-05-21 — B4 + B5 + B6 complete

- Lexer: 5 TokenKinds (KwLin/KwType/KwFn/KwServer/KwPure) + 5 JS_KEYWORDS
  entries in token.js + token.scrml mirror.
- B4 `lin`: LinDecl StmtKind + makeLinDecl factory + parseLinDecl production
  + dispatch + export interaction + LinDecl translate arm -> live `lin-decl`.
- B5 `type`: TypeDecl StmtKind + makeTypeDecl factory + parseTypeDecl
  production (body form + alias form + `export type` fix) + typeBodyText /
  typeAliasText raw reconstruction + TypeDecl translate arm -> live `type-decl`.
- B6 `fn`/`server`/`pure`/`!`: makeFunctionDecl extended with optional
  `modifiers` arg (back-compat 6-arg legacy shape preserved) + parseScrmlFunctionDecl
  production (modifier prefix + trailing `!` + `! -> ErrorType` + return-type
  annotation skip) + dispatch + export interactions + translate-stmt
  makeFunctionDecl now READS fnKind/isServer/isPure/canFail/errorType.
- `.scrml` mirrors: parse-stmt.scrml + translate-stmt.scrml updated; all new
  `.scrml` lines grep-clean for malformed predicates (no `is not not`, no
  `===`/`!==`, no `null`/`undefined`).
- SPEC §34.1: +8 codes (E-STMT-LIN-NAME/INIT, E-STMT-TYPE-NAME/KIND/UNCLOSED-BODY,
  E-STMT-FN-KEYWORD/NAME/ERROR-TYPE); prologue count 66->74; SPEC-INDEX changelog
  + regen.
- Tests: native-parser-core-decl-keywords.test.js — 38 tests, all pass.
- Full suite: 18316 pass / 0 fail / 169 skip (baseline 18278; +38 new; zero
  regressions). Pre-commit gate (unit+integration+conformance): 13675 pass / 0 fail.

## DD OQ2 — `pure` belongs in the parser

CONFIRMED parser-recognized. `pure` is a load-bearing prefix modifier carried
on the FunctionDecl node (`isPure`). The live ast-builder already recognizes
`pure` at the parser layer (ast-builder.js:5655). No re-scope surfaced.

## DD OQ3 — shared `!` sigil

Trailing signature-`!` is consumed as a single Bang token AFTER the param
list, BEFORE the body `{`; it does NOT consume the body `{`. A future B2
`!{}` guarded-expr production operates in expression position — distinct
grammar position, no collision. Covered by test §4.

## STATUS: B4 / B5 / B6 all complete.
