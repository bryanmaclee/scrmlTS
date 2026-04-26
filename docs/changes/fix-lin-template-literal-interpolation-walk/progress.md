# Progress: fix-lin-template-literal-interpolation-walk

## Timeline

- [start] Branch verified: `worktree-agent-a4acf8e644bcf9d4e` off `main@9a07d07`.
- [start] `bun install` ran in worktree root + compiler workspace (acorn etc. now resolvable).
- [start] `bun run pretest` compiled 12 browser-test samples into `dist/`.
- [start] Baseline: 7889 pass / 40 skip / 0 fail / 375 files. Matches intake.
- [start] Pre-snapshot written to `docs/changes/fix-lin-template-literal-interpolation-walk/pre-snapshot.md`.
- [step1] Wrote 6 regression tests (TDD). Pre-fix: cases 1-5 fail, case 6 passes — confirms bug behavior.
- [step2] First attempt: walker-only fix in `forEachIdentInExprNode` — added `walkTemplateInterpolations` helper for `lit/template` and `escape-hatch/TemplateLiteral` cases.
- [step3] **Empirical probe revealed deeper root cause** — see "Root cause amendment" below.
- [step4] Applied tokenizer + ast-builder fix to preserve template-literal-ness through tokenize/re-emit pipeline.
- [step5] Multi-quasi templates now emit `lit/template` (was `escape-hatch`) — fixes round-trip + walker.
- [step6] Surfaced anomaly: `self-host/meta-checker.scrml` now fails E-SCOPE-001 on `typeToString` self-recursion in template literal. Threaded `fnAllDeclared` fallback set into `checkLogicExprIdents` to fix forward-/self-reference scope gap.
- [step7] Final: 7895 pass / 40 skip / 0 fail / 376 files. All 6 new tests pass. **Bonus check confirmed**: example 19's `const consumed = ticket` workaround can be removed — direct `${ticket}` interpolation compiles clean.

## Root cause amendment

The intake's stated root cause was **partially wrong**. Empirical probing showed:

1. The scrml tokenizer (`compiler/src/tokenizer.ts:607-622`) reads backtick template literals into `STRING` tokens that strip the backticks (only the inner content is preserved).
2. `collectExpr` in `ast-builder.js:1333-1334` then calls `reemitJsStringLiteral` on every STRING token, which JSON-stringifies the content into a plain double-quoted JS string.
3. By the time `parseExprToNode` runs on the resulting expression text (e.g. `"value: ${t}"` — a regular double-quoted string with literal `${t}` inside), there is no `TemplateLiteral` ESTree node anymore. acorn sees a plain string literal.
4. So the walker's `lit/template` case **never fires** on real-pipeline output — only on synthetic ExprNodes built from acorn directly. The intake assumed the lit was a `lit/template` node; in practice it was a `lit/string`.

The intake's recommended Option 1 (walker-only) therefore could NOT solve the bug as scoped. The real fix had to round-trip the template-literal-ness through the tokenize → re-emit → reparse pipeline.

## Files modified

- `compiler/src/tokenizer.ts` — added `isTemplate?: boolean` field on `Token`; set true on `readBacktickString`.
- `compiler/src/ast-builder.js` — in `collectExpr`, branch on `lastTok.isTemplate` to re-emit STRING with backticks (preserving `${...}` interpolations).
- `compiler/src/expression-parser.ts` — added `tokenizeTemplateInterpolations`, `regexExtractIdents`, `walkTemplateInterpolations`, and `TEMPLATE_INTERP_CACHE` (memoization). Updated `forEachIdentInExprNode` `lit` case to descend into template-literal interpolations. Updated `esTreeToExprNode`'s `TemplateLiteral` case to emit `lit/template` for multi-quasi templates (was `escape-hatch`) — uses ESTree node start/end to slice the original backtick source from `rawSource`. Also kept fallback for `escape-hatch/TemplateLiteral` defensively (in case the new path doesn't reach).
- `compiler/src/type-system.ts` — added optional `knownFnNames?: Set<string>` parameter to `checkLogicExprIdents`; threaded `fnAllDeclared` through all 18 call sites. Without this, the walker's new visibility into template-literal interpolations would surface E-SCOPE-001 on previously-hidden self/forward function references (e.g. `fn typeToString(t) { return \`${typeToString(...)}\` }`).
- `compiler/tests/self-host/tab.test.js` — updated `stripBlockRefs` helper to also drop the `isTemplate` flag for parity comparison with the self-hosted scrml tokenizer (which doesn't track this flag yet).
- `compiler/tests/unit/lin-template-literal-interpolation.test.js` — new file, 6 regression tests per intake §"New regression tests".

## Side findings (out of scope, documented for future work)

1. **Other walker consumers benefit too.** `forEachIdentInExprNode` is called by:
   - `dependency-graph.ts` — reactive dep extraction. Template-literal interpolations like `${@count}` are now seen as deps. (Pre-fix: hidden in escape-hatch/string raw.)
   - `type-system.ts` `checkLogicExprIdents` — scope checking. Now sees idents inside template literals (this surfaced the `typeToString` self-recursion gap, which we fixed).
   - `type-system.ts` various lin checkers (returns, declarations, lambdas) — all now see `${lin}` consumption.
   - `type-system.ts` meta-block scanners (`walkExprForEscapeHatchStrings`) — these were the closest pre-existing workaround; with the surgical fix they're partially redundant for template literals (they still cover other escape-hatch forms).
   No spec changes needed — §35.3 rule 1 ("any read of a `lin` value as an expression is a consumption") clearly applies.

2. **Self-hosted scrml tokenizer (`self-host/tab.scrml`) doesn't track `isTemplate`.** Cleanup follow-up. The parity test is currently gated on stripping the field. To eliminate the gate, add `tok.isTemplate = true` to the self-host's `readBacktickString` and update the AST builder's parity story.

3. **Function name self-visibility was always broken** — case "function-decl" in `type-system.ts` binds the function name AFTER walking the body. This was previously masked because forward-references inside template literals weren't seen. The `fnAllDeclared` fallback works but a cleaner fix is to bind the function name into the enclosing scope BEFORE descending into the body. Out of scope here.

4. **Round-trip emit/parse for multi-quasi templates** was previously broken in a way that `expr-node-corpus-invariant.test.js` did not surface (pre-fix, the bare-expr that exercised the bug had its template-literal converted to a plain string by `reemitJsStringLiteral` so the corpus test never saw an `escape-hatch/TemplateLiteral`). Post-fix, the corpus test does see structured templates and the fix had to also correct the `esTreeToExprNode` `TemplateLiteral` case so it emits a real `lit/template` instead of an escape-hatch with the OUTER expression's raw stuffed into it.

## Tags
#progress #fix-lin-template-literal-interpolation-walk #t2 #lin-tracking #template-literal #ident-walker #scope #scrml-pipeline

## Links
- Intake: `docs/changes/fix-lin-template-literal-interpolation-walk/intake.md`
- Pre-snapshot: `docs/changes/fix-lin-template-literal-interpolation-walk/pre-snapshot.md`
- Tracker: `docs/audits/scope-c-findings-tracker.md` §A4
- Walker: `compiler/src/expression-parser.ts` `forEachIdentInExprNode`
- Lin tracking call site: `compiler/src/type-system.ts:7060-7073`
- Tokenizer: `compiler/src/tokenizer.ts` `readBacktickString`
- Re-emit: `compiler/src/ast-builder.js` `collectExpr`
