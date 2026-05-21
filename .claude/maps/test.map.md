# test.map.md
# project: scrmlts
# updated: 2026-05-21T04:30:00-06:00  commit: e613621

## Test Framework
Runner: `bun test` (Bun built-in test runner)
Config: bunfig.toml — `[test] root = "compiler/tests/", timeout = 10000`
DOM: @happy-dom/global-registrator preloads happy-dom globals for DOM-touching tests
E2E runner: @playwright/test (separate — e2e/playwright.config.ts)
Run all: `bun test compiler/tests/`  (npm: `bun run test`)
Run with coverage: `bun test compiler/tests/ --coverage`
Run single file: `bun test compiler/tests/unit/<name>.test.js`
Run a subtree: `bun test compiler/tests/conformance`
Run e2e: `bun run e2e`  (or `playwright test --config=e2e/playwright.config.ts`)
Pre-test hook: `bash scripts/compile-test-samples.sh` runs automatically before `test`.

## Test Categories  [compiler/tests/ — 731 total .test.js/.test.ts files]
unit         — compiler/tests/unit/**            — ~514 files — per-pass / per-construct unit tests (largest bucket)
integration  — compiler/tests/integration/**     —  ~75 files — multi-stage pipeline + canonical-corpus smoke tests
conformance  — compiler/tests/conformance/**     — ~105 files — one test per SPEC §34 error code + block-grammar subdir
browser      — compiler/tests/browser/**         —  ~12 files — runtime behavior under happy-dom
lsp          — compiler/tests/lsp/**             —  ~10 files — language-server feature tests
commands     — compiler/tests/commands/**        —   ~6 files — CLI subcommand tests (init/migrate/promote/...)
self-host    — compiler/tests/self-host/**       —   ~4 files — self-hosting compiler-module tests
parser-conformance — compiler/tests/parser-conformance-*.test.js — 4 root files (see below; +1 since prior map)
e2e          — e2e/tests/**.spec.ts              —   6 files — Playwright (02-counter, 03-contact-book,
                                                   05-multi-step-form, 14-mario, todomvc, docs-website)

Full-suite pass count grew 16,840 → 17,812 over the S113 native-parser arc
(+972 tests across the 13 dispatched milestone landings).

## Native-Parser Conformance Suite
Four root test files drive the scrml-native parser (compiler/native-parser/)
against an Acorn-style oracle + inline micro-corpora. They are the single source
of truth for current native-parser pass/skip/fail status.

parser-conformance-lexer.test.js  — M1.1-M1.5 lexer; runs bench corpus + inline
  micro-corpus through both Acorn's tokenizer and native-parser/lex.js; asserts
  kind+text+span per token. `expr-literals.js` flipped to `full` byte-identical
  disposition at S102 (`bcb48c9f`); M1.5 verified at S113.
parser-conformance-expr.test.js   — M2 (M2.1 primary, M2.2 operators, M2.3
  call/member/arrow heads, M2.4 scrml-extension forms) + M4.1 (await/yield as
  expression operators); exercises native-parser/parse-expr.js + ast-expr.js;
  conformance Tier 1 (node-kind sequence) + Tier 2 (ident/literal values).
parser-conformance-stmt.test.js   — NEW S113. M3 (M3.1 substrate, M3.2 control-
  flow, M3.3 functions/classes/import/export/try-throw, M3.4 error-recovery +
  full statement conformance); exercises native-parser/parse-stmt.js +
  ast-stmt.js. Tier 1+2 vs Acorn-oracle. 171 test sites at HEAD.
parser-conformance-markup.test.js — MK1 (BlockContext context-boundary
  recognition) + MK2 (TagFrame engine + closer-form pairing + TagKind/TagClass
  classification — 5 BS classifier heuristics demonstrably gone) + MK3 (BodyMode
  + DisplayTextLiteral §4.18 native quoted-text + E-UNQUOTED-DISPLAY-TEXT).
  Exercises native-parser/parse-markup.js + parse-ctx.js + tag-frame.js +
  body-mode.js + display-text-literal.js. Tested vs the BS oracle on the
  markup-bench fixtures.

parser-conformance.test.js  — older parser-conformance harness driver (predates
  the four native-parser suites; uses the same harness modules).

### Harness  [compiler/tests/parser-conformance/]
corpus-enumerator.js — enumerates corpus files
parsers.js           — parser adapter (Acorn oracle + native-parser entry)
tier-diff.js         — Tier 1/2 diff comparator
bench/               — 12 JS corpus files (expr-arrow, expr-async-await,
                       expr-literals, expr-optional-chain, expr-spread-rest,
                       expr-template-literal, expr-yield-generator, stmt-control-flow,
                       stmt-import-export, stmt-try-catch, decl-class, decl-destructure) —
                       the JS-subset corpus
markup-bench/        — 8 `.scrml` corpus files: comments-html, comments-line,
                       css-block, foreign-code, logic-basic, logic-nested-braces,
                       markup-tags, multi-context — the markup-layer corpus

## Fixtures & Factories
compiler/tests/fixtures/ — promote-match-canonical.scrml; promote-multi-file-app/ (CLI promote fixtures)
compiler/tests/helpers/  — expr.ts (expression test helper); extract-user-fns.js (scans compiled
                            client.js for user-defined fns, filtering `_scrml_*` compiler internals)
compiler/tests/unit/__fixtures__/ — runtime-written scratchpads, gitignored, regenerated per run
compiler/tests/parser-conformance/bench/ + markup-bench/ — native-parser conformance corpora
e2e/fixtures/ — db-fixture.ts (per-test SQLite), dev-server-fixture.ts (boots a dev server)
samples/compilation-tests/ — sub-dirs compiled by the `pretest` hook and `bench`/`security` scripts

## Pattern
Unit tests are `describe`/`test`/`expect` from `bun:test`. The dominant pattern
compiles a snippet through a slice of the pipeline (commonly
`splitBlocks()` → `buildAST()`, or `compileScrml()`/`compileInline()` for
end-to-end) and asserts on the resulting AST shape, the emitted JS, or the
returned diagnostic stream. Each test file's docblock names the SPEC section
or phase step it covers. Tests routinely assert AST-shape contracts plus an
anti-test guard (`assertNoHtmlFragmentMatching`) to defeat deceptive-success
where a construct silently parses as plain markup. Diagnostic-stream tests
must check the correct bucket — W-*/I- codes land in `result.warnings`, not
`result.errors` (see error.map.md partition rule). Conformance tests are
named `conf-<CODE>.test.js`, one per SPEC §34 error code. The native-parser
conformance suites instead diff native-parser output against an Acorn oracle
(JS layer) or the live block-splitter (markup layer) and assert per-tier
parity; new tests land alongside their owning M-/MK-sub-step.

## Tags
#scrmlts #map #test #bun-test #playwright #conformance #native-parser

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
