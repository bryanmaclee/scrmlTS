# compiler/native-parser/

Bottom-up scrml-native JS lexer (and eventually parser); replaces Acorn pre-v1.0; lives in the scrmlTS compiler pipeline.

NOT a port. NOT self-host. NOT a Mn-replacement of `compiler/src/`. Acorn is the conformance ORACLE — never the design template.

Design authority: [`scrml-support/docs/deep-dives/scrml-native-parser-design-2026-05-17.md`](../../../scrml-support/docs/deep-dives/scrml-native-parser-design-2026-05-17.md) (D1 charter, D2 composed-engines architecture, D3 type catalog, D4 missing-primitive inventory, D5 JS subset bound, D6 conformance-test plan, D7 milestones).

## Pillar 5b conformance note

Per PRIMER §2 Pillar 5b ("Reach for state primitives first; reach for `fn` only when the problem is calculation"), this directory's discipline is:

- Every STATE-SHAPE construct points to an `<engine>` (LexMode, BracketStack, ErrorRecovery — see `lex-mode.scrml`, `bracket-stack.scrml`, `error-recovery.scrml`).
- Every `fn` body justifies its calculation classification at the file header (per the D1 two-table operational test).
- The .scrml files carry the CANONICAL scrml-source SHAPE; the .js files carry the executable LIVE SURFACE today (the .scrml<->.js shadow is an M4+ swap-in concession documented in each file's header — see `span.js` for the rationale).

A reader who points to any state-shape construct must be able to find its `<engine>` declaration; any `fn` body the reader points to must justify the calculation classification per the D1 charter. If a `fn` body cannot be justified, it surfaces as tension for re-litigation (per the dispatch rule "shoot straight; document tension; don't paper over").

## M1.1 status (2026-05-17)

| Surface | Status |
|---|---|
| Token catalog (D3) | substantive — all TokenKind variants for JS subset + scrml extensions |
| LexMode engine (D2) | declared with all 7 state-children + rule= contract; bodies bare for M1.1 |
| BracketStack engine (D2) | declared; live frame stack in the JS-host shadow |
| ErrorRecovery engine (D2) | declared with all 3 state-children + full rule= matrix |
| Cursor (D4 P5) | V5-strict-shaped; peek/advance/snapshot/restore |
| InCode-state body | substantive — emits all M1.1 tokens incl. all multi-char operators, numeric value parsing (D1 canonical calc), scrml extensions |
| String / template / comment / regex bodies | STUB (paired-delimiter scan + LexMode round-trip); M1.2-M1.4 dispatches turn each on |
| `lex(source): Token[]` entry point | functional end-to-end |
| Conformance test | `compiler/tests/parser-conformance-lexer.test.js` runs bench corpus + inline micro-corpus (57 pass, 12 skip-with-reason for M1.2+) |

## File listing

| File | One-liner |
|---|---|
| `span.scrml` / `.js` | `{start, end, line, col}` struct; pure-data; calculation classification (D4 P6) |
| `token.scrml` / `.js` | TokenKind nested-by-category enum (D3); QuoteKind; JS_KEYWORDS table; makeToken/makeIdentOrKeyword/makeEof |
| `cursor.scrml` / `.js` | V5-strict-shaped character cursor (D4 P5); peek* calculations; advance + snapshot/restore as state-writes |
| `lex-mode.scrml` / `.js` | `<engine for=LexMode initial=.InCode>` with all 7 state-children + rule= contract; LIVE setMode/getMode helpers |
| `bracket-stack.scrml` / `.js` | `<engine>` + LIVE frame stack mirror of canonical .OpenAt(depth, opener, span) variant |
| `error-recovery.scrml` / `.js` | `<engine for=ErrorRecovery initial=.ParsingNormally>` — DD §D4 P4 canonical positive state example |
| `lex-in-code.scrml` / `.js` | SUBSTANTIVE M1.1 — InCode-state dispatcher; emits tokens for whitespace, idents, keywords, numerics, all punctuation, multi-char operators, scrml extensions, brackets, regex (M1.4-aware stub) |
| `lex.scrml` / `.js` | Top-level `lex(source: string): Token[]`; loop dispatches by LexMode; safety bound + cursor-progress sentinel |
| `README.md` | this file |

## Swap-in roadmap

| Mn | What changes |
|---|---|
| M1.2 | Activates `<InTemplateBody>` (incl. `${...}` nested-engine per §51.0.Q.1) + `<InSingleString>` + `<InDoubleString>` state-child bodies; replaces M1.1 stub scanners |
| M1.3 | Activates `<InLineComment>` + `<InBlockComment>` state-child bodies |
| M1.4 | Activates `<InRegexBody>` state-child body; refines DD §D4 P3 prev-token heuristic |
| M2 | Expression parser implemented in scrml; ParseContext engine; replaces `scrmlNativeParserStub.parse` body in `compiler/tests/parser-conformance/parsers.js` |
| M3-M6 | Per DD §D7 milestones — full statement parser, full bounded subset, scrmlTS pipeline swap-in, Acorn removal |

## Anomalies surfaced during M1.1

1. **scrml line-comments inside `<engine>` state-child bodies that contain `${...}` literal text** are NOT stripped before bracket-matching; the inner `${` opens a logic context that derails state-child closure detection. Workaround applied: keep state-child bodies bare; long-form commentary lives at file-top. Filed for follow-up review.
2. **Compiler v0.3 strips function bodies** from `export function` declarations inside `${...}` JS-escape blocks in SPA-shape .scrml files. Workaround applied: ship 1:1 .js shadow files alongside each .scrml; tests import the .js, the .scrml retains the canonical Pillar 5b SHAPE. The M4+ swap-in retires the shadow.
3. **Payload-bearing engine variants** (`.OpenAt(depth: int, opener: BracketKind, span: Span)`, `.AccumulatingSkipped(tokens: Token[])`, `.ReSynchronized(at: SyncToken)`) — the M1.1 spec subset declares bare variant tags; the payload-carrying form is deferred until the M1.x dispatch that carries payload through to the spec-mirror layer.

## Tags

#scrmlts #m1-1 #native-parser #lexer #pillar-5b #composed-engines #dd-d2 #dd-d3

## Links

- [scrml-native-parser-design-2026-05-17.md](../../../scrml-support/docs/deep-dives/scrml-native-parser-design-2026-05-17.md)
- [PA-SCRML-PRIMER §2 Pillar 5b](../../docs/PA-SCRML-PRIMER.md)
- [compiler/tests/parser-conformance-lexer.test.js](../tests/parser-conformance-lexer.test.js)
- [compiler/tests/parser-conformance/parsers.js](../tests/parser-conformance/parsers.js)
- [docs/changes/m1-1-native-lexer-skeleton/progress.md](../../docs/changes/m1-1-native-lexer-skeleton/progress.md)
