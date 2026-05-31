# Progress — match arm-arrow `:>` canonical (compiler-source enforcement + migrate)

Change-id: match-colon-arrow-canonical-2026-05-30
Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a033b8f5ef0bd0b98

## 2026-05-30 — startup
- Startup verification PASS: pwd under agent-worktree, toplevel matches, merged main (ff to a2930106 — landed SPEC §18.2/§19/§34), bun install + pretest OK.
- Read primary.map.md + error.map.md + SPEC §18.2/§34 W-MATCH-ARROW-LEGACY + E-MATCH-ARM-SEPARATOR rows + W-LIFECYCLE-LEGACY-ARROW template (type-system.ts:2230).

## Findings (empirical, verified)
- LIVE path = BS+TAB+ast-builder.js (native-parser not default). All emit checks done against live.
- Tokenizer: `=>` and `:>` are single OPERATOR tokens (MULTI_OPS in tokenizer.ts:1209). `->` is NOT in MULTI_OPS → tokenizes as two PUNCT tokens `-` then `>`.
- ast-builder.js `isMatchArrow` (line 1650) recognizes ONLY `=>` / `:>` (single OPERATOR). So in the LIVE path:
  - `=>` / `:>` match arms → structured `match-arm-inline` / `match-arm-block` nodes.
  - `->` match arms → fall to `bare-expr` (NOT structured); multiple arms can lump into one bare-expr. Still emits correct JS via match-stmt raw reconstruction.
- Verified byte-identical client.js across `=>` / `:>` / `->` for a value-match (zero-codegen-cost invariant holds).
- `!{}` handler arms: parsed in `parseErrorTokens` (ast-builder.js ~10831) — recognizes all three glyphs (`=>`/`:>` OPERATOR + `->` as `-` then `>`). Arms are plain objects `{pattern,binding,handler,handlerExpr,span}` (no kind).
- `->` as fn-return separator parsed as two tokens (5944/6145/6162) — so I MUST NOT merge `->` into a single tokenizer OPERATOR (would break fn return types). Keep two-token.

## Plan
- SB1: add `->`-aware arm detection helper, thread glyph onto match-arm-inline/block nodes + handler-arm objects; emit W-MATCH-ARROW-LEGACY (info) for `=>`/`->` arms in checkMatchDiagnostics + guarded-expr typer site; register code.
- SB2: migrate --fix AST-driven arm-arrow rewrite (park if hard).
- SB3: unit tests + full pre-commit suite.

## Next
- Implement SB1 glyph preservation in ast-builder.js match-arm sites.

## 2026-05-30 — SB1a committed (c4a5e1d4)
- ast-builder.js: matchArrowGlyphAt helper + 8 arm-construction sites + boundary scanner all ->-aware; armArrow recorded on match-arm-inline/block nodes. -> arms now structured. Full pre-commit suite GREEN (zero regressions).
- Verified all 3 glyphs emit byte-identical client.js.

## 2026-05-30 — SB1b (lint emission) — pre-commit
- type-system.ts: added matchArrowLegacyMessage(location, glyph) shared helper.
- checkMatchDiagnostics: emit W-MATCH-ARROW-LEGACY (info) for every match arm whose armArrow is =>/-> (arm-context-scoped via the recorded glyph). Verified fires 3x for a =>-arm markup match; does NOT fire on arrow-fn (x)=>x or fn-return -> int.
- guarded-expr typer case: record armArrow at all 3 parseErrorTokens arrow-consumption sites (ast-builder.js), emit W-MATCH-ARROW-LEGACY (info) lockstep for !{} handler arms using =>/->. Confirmed via parse-variant E-TYPE-080 test trace (arm glyph=-> seen by lint loop).
- Diagnostic-stream: W- prefix + severity:info -> result.warnings (S93 partition). No central codes catalog (mirrors W-LIFECYCLE-LEGACY-ARROW which lives only in type-system.ts).
- Targeted match+error-handler suites: 505 pass / 0 fail.

## Next
- Run full pre-commit gate (commit SB1b). Then SB2 migrate --fix, SB3 dedicated unit tests + empirical verification.

## 2026-05-30 — SB2 (migrate --fix) — pre-commit
- migrate.js: added rewriteMatchArmArrows(source, filePath) — AST-driven (splitBlocks+buildAST), walks match-arm-inline/block + guarded-expr arms, finds the first =>/-> at/after each arm's span.start (pattern never contains an arm arrow), splices :> right-to-left. Fail-safe: skips on no-AST or byte-mismatch.
- Wired a `--fix` flag (opt-in, matches the W-MATCH-ARROW-LEGACY lint's suggestion). Threaded through parseArgs -> run -> migrateFile (Step 1b after baseline W-* migrations). Help text + summary counter added.
- Verified directly: 3 arms (=>/->/=>) -> :>; arrow-fn (x) => x*2 UNTOUCHED; fn-return -> string UNTOUCHED.
- Existing migrate tests: 79 pass / 0 fail.

## Next
- SB3 dedicated unit tests + full empirical verification (compile/migrate/recompile byte-identical).

## 2026-05-30 — SB3 (tests + empirical) — pre-commit
- Added compiler/tests/unit/match-arrow-colon-canonical-s147.test.js (19 tests):
  §A glyph preservation (3 glyphs × inline+block), §B match-arm lint scope (=>/-> fire 3x, :> no-fire, arrow-fn/fn-return no-fire, info-partition into result.warnings), §C !{} handler-arm lockstep, §D migrate --fix precision (arms→:>, arrow-fn + fn-return untouched, no-op, post-rewrite zero lints). All 19 pass.
- EMPIRICAL (CLI): /tmp/mcverify/clean.scrml — server fn with `->` handler arms + arrow-fn + fn-return.
  - pre-migrate compile exit-0, 3 handler-arm W-MATCH-ARROW-LEGACY (info), client.js node --check VALID.
  - migrate --fix: 3 `->` handler arms → `:>`; arrow-fn `(x) => x*2` + fn-return `-> FetchErr` UNTOUCHED.
  - post-migrate recompile exit-0, ZERO W-MATCH-ARROW-LEGACY.
  - client.js + html + runtime BYTE-IDENTICAL pre vs post (zero-codegen-cost invariant HOLDS).
- FINDING (pre-existing, not my change): match inside fn/function BODY is raw-text logic → not a structured match-stmt → match-arm lint does NOT fire there (only markup ${match} + top-level/let-decl matches). Handler arms DO fire inside fn bodies (parsed structurally via parseErrorTokens→guarded-expr). Reactive-enum `match @x` in markup fires pre-existing E-TYPE-025 for :> too (confirmed — not my change).

## Next
- Full pre-commit gate; commit SB3. Done.
