# self-host-v2 LEXER — slice 1 (Road-B compiler impl#2, S234)

Home: `compiler/self-host-v2/` (fresh dedicated area — NOT native-parser, NOT a port).
Design authority: `scrml-support/docs/deep-dives/compiler-reimagining-lexer-slice-2026-06-26.md`
(Approach B: pure `fn lex(src) -> Token[]` folding `step(st) -> LexState` over `match (mode, event)`).

## Slice-1 scope (built here)
- Shared substrate: TokenKind (payload enum) · QuoteKind/BracketKind · Span/Token/Cursor/Scan structs ·
  makeCursor/peekCode/advance/isEof · char-class fns · regexAllowedAfter.
- Lex-fold skeleton: LexMode + LexEvent enums · LexState struct · classify · step (`match (mode,event)`) ·
  lex driver (`while (!isEof) st = step(st)`).
- CORE-TOKEN scanners: scanIdentOrKeyword · scanNumber · scanOperatorOrPunct (+ munchEq/munchBang/munchLt/munchGt).

## DEFERRED to later slices (routed to a total stub arm; NOT scanned this slice)
- strings (scanString / QuoteKind bodies)         — slice-2
- template-interp nesting (InTemplateBody + `${}`) — slice-2/3
- line + block comments (`//`, `/*`)               — slice-2
- regex bodies (`/.../flags`)                      — slice-3
- BracketStack + ErrorRecovery threading           — later (fields not in slice-1 LexState)
In `step`, every non-`(InCode, Ordinary|SawEof)` event routes to `deferAdvance` (advances 1 char, emits
no token) so the fold stays TOTAL. The slice-1 corpus contains none of these, so the stub never fires.

---

## THE ORACLE (token-diff, loop-until-green)

### Reference = impl#1 lexer (`compiler/native-parser/lex.js`)
`lex(source)` → `Token[]`, each `{ kind:string, text:string, span:{start,end,line,col} }`.
Phase-0 characterization (probed live against native-parser/lex.js):
- Whitespace + newline trivia are SKIPPED (not emitted).
- Keywords are DISTINCT kinds (`const`->`KwConst`, `let`->`KwLet`, ...); operators maximal-munched
  (`===`->StrictEqual, `!==`->StrictNotEqual, `<=`->LessEqual, `++`->Increment, `??`->NullishCoalesce,
  `?.`->OptionalChain); `NumberLit` carries raw text; `EOF` token at end (empty text, span `[len,len]`).

### Candidate = impl#2 (`compiler/self-host-v2/lex.scrml`)
Compiled via the LIVE compiler (`<program>` browser mode → `<base>.client.js`), then the emitted
`_scrml_lex_N(src)` is discovered by regex + called via `new Function(clientText + "return <fn>;")()`.
Only runtime helper referenced by the pure lexer = `_scrml_structural_eq` (from `==`); the oracle
provides a compact deep-equal stub. NO reactive/runtime/DOM deps (pure fold).

### Normalization (both sides -> `{kind, text, start, end}`)
- kind tag: `typeof k === "object" ? k.variant : k` (payload variant -> `{variant,data}`; nullary -> string).
- impl#2 nullary kinds are NAMED to match impl#1 exactly (LParen/Plus/StrictEqual/NumberLit/Ident/...).
- KEYWORD collapse: any impl#1 `Kw*` kind AND impl#2 `Keyword` -> canonical `"KW"`; the `text` field
  (compared too) discriminates the specific keyword. Low-coupling: no mirroring of impl#1's per-keyword
  table (D3: token taxonomy is impl freedom; the wave oracle is allowlisted/normalized).
- `Eof`/`EOF` -> `"EOF"`.
Diff compares the 4-tuple per token. Divergence on the slice-1 subset = RED.

### Corpus subset (slice-1 only: idents / keywords / numbers / operators / punctuation)
A curated in-test array of slice-1-only snippets (NO strings/comments/regex/templates, since deferred).
Rationale: real corpus `case.scrml` sources almost all contain deferred token classes; a curated subset
is the defensible slice-1 diff surface (the brief's "SMALL corpus subset restricted to slice-1 tokens").

---

## DOGFOOD FINDINGS (live compiler bugs / gaps surfaced building slice 1)

**F1 (PRIMARY) — library mode cannot lower the flagship idiom.**
A bare `${...}` exports-only module compiles in library mode (SPEC §21.5), but the library emitter
(`compiler/src/codegen/emit-library.ts`) is a SHALLOW REGEX-TRANSFORM over raw source text: it strips
`type` decls + rewrites `fn`->`function` + `not`/`is`, but does NOT (a) strip type annotations on
params/returns/locals [`fn f(n: int) -> int` leaks `: int`/`-> int` verbatim -> E-CODEGEN-INVALID-JS],
(b) lower `match`, (c) lower payload-variant construction. So idiomatic scrml (typed payloads + match-fold)
does NOT compile as an importable library module. Only the `<program>` (browser) path routes through the
real AST emitter (emit-logic/emit-expr) that lowers these. => slice-1 WORKAROUND: wrap the lexer in
`<program>` and consume the emitted client.js. Repro: `${ export fn dbl(n: int) -> int { return n*2 } }`
(no `<program>`) -> E-CODEGEN-INVALID-JS; same body inside `<program>` -> clean.
IMPLICATION FOR ROAD-B: the reimagined compiler must emit library modules through the real emitter, or
a scrml-native library (the compiler's own modules!) can't use typed payloads + match. This is the single
biggest structural blocker for "the compiler is written in idiomatic scrml as importable modules."

**F2 — int-literal `match` arms break the parser + emit invalid JS.**
`match n { 61 :> "eq"  40 :> "lp"  _ :> "other" }` -> `[scrml] warning: statement boundary not detected`
+ E-CODEGEN-INVALID-JS (`const _scrml_match = n; else return "other";` — the int-literal arms are DROPPED,
leaving a bare `else`). STRING-literal match arms (`match s { "if" :> 1 ... }`) compile clean.
=> The DD's Approach-B `scanOperatorOrPunct` design (`match peekCode(cur,0){ 61 :> munchEq(...) ... }`)
does NOT compile. slice-1 dispatches operators on the 1-CHAR STRING instead
(`const ch: string = ...; match ch { "=" :> ... }`) — cleaner/more-readable anyway.

**F3 — product-match drops an arm carrying a literal (int) pattern in a tuple slot.**
`match (a, b) { (.LParen, 0) :> "lp0"  (.Num(v,r), _) :> "num"  (_,_) :> "other" }` -> the `(.LParen, 0)`
arm is SILENTLY DROPPED from the lowered JS (only the variant arms emit). enum×enum product-match lowers
correctly. slice-1 `match (mode, event)` is enum×enum (sidesteps F3), but flag it.

**F4 — bare variant resolves ONLY in fn-return position or when qualified.**
`return .Num(v,r)` (fn return type = the enum) RESOLVES. As a fn ARG (`mkTok(.LParen, ...)`), a struct-field
value (`{ kind: .Plus, ... }`), or an array element (`[.LParen]`) it fires E-VARIANT-AMBIGUOUS EVEN with the
target type annotated (the JS lowers correctly to the string tag, but the TYPER rejects it). => slice-1 uses
qualified `TokenKind.X` and typed-return helper fns exclusively.

**F5 — `match` subject must be typed; a `.substring`-derived local is `asIs`.**
`const ch = c.source.substring(...); match ch {...}` -> E-TYPE-025 (asIs subject). Annotate
`const ch: string = ...`. (Host-method return types are `asIs`; annotate to feed the typer.)

**F6 — `match` arms with `|` ALTERNATION drop silently (string + payload variants).**
An alternation arm fails to lower when the alternatives are STRING literals (`"const" | "let" :> true`) OR
when any alternative is a PAYLOAD pattern (`.Ident(_) | .Num(_) :> false`): the arm is dropped, leaving a
bare `else` -> parse desync / E-CODEGEN-INVALID-JS. NULLARY-enum-variant alternation (`.A | .B :> x`) works
(both newline- and comma-separated). => `isKeyword` uses single-literal arms (a lookup table);
`regexAllowedAfter` uses an `is .Variant` chain instead of the DD's payload-wildcard alternation.

**F7 (benign) — W-DEAD-FUNCTION false-positives on `match`-arm-only callees; they are NOT tree-shaken.**
Reachability does not trace calls from inside `match` arm bodies (`"=" :> munchEq(cur)`; `(.InCode,
.Ordinary) :> emitOneToken(st)`), so munch* / emitOneToken / kUnknown warn as "no callers." Codegen KEEPS
them (verified: every fn survives in the emitted client.js), so output is correct — the warning is noise,
not a shake. Still a real RI call-graph gap (match-arm edges) worth closing.

**F8 — whole-file host-method return-type poisoning: `<string>.charCodeAt()` types as `string`.**
`advance` originally reassigned a `let cc` to an anonymous struct literal `{ source: cc.source, ... }`; in
the FULL file (but NOT an isolated repro) the typer then inferred `cc.source.charCodeAt()` — and even
`peekCode(cc,0)` (a `-> int` fn) — as `string`, firing E-EQ-001 on `ch == 10`. Fix: factor a per-char
`advance1(c: Cursor) -> Cursor` with a clean typed param + `isLineFeed(code: int)` helper, so the reassigned
cursor stays `Cursor`-typed via the return annotation. Root cause = reassign-to-anonymous-struct poisons a
string field's host-method return type across functions. Localized; worth a typer follow-up.

Findings F2/F4/F5/F6 are ergonomic-but-workaroundable; F1 is the structural one; F3/F8 are latent
correctness/soundness bugs (silent arm-drop / cross-fn type poisoning) worth their own follow-ups; F7 is
benign noise. All confirmed against the live compiler at this worktree's base SHA (495a041b).

## STATUS — slice 1 COMPLETE (GREEN)
- [x] Phase 0 — oracle characterized + capability-probed (F1-F8 captured).
- [x] substrate + skeleton + scanners (lex.scrml) — compiles clean via the live compiler.
- [x] oracle test (self-host-v2-lexer-slice1.test.js) — 34/34 GREEN, token-parity vs impl#1 on the slice-1 corpus.

Slice-1 corpus GREEN classes: identifiers, keywords (JS_KEYWORDS minus contextual `type`), numbers
(int/decimal/hex/exponent), operators (`= == === =>  ! != !==  < <=  > >=  + ++  - --  ? ?? ?.  && || & |
* / %`), punctuation/brackets, trivia-skipping. Deferred (routed to `deferAdvance`, not scanned): strings,
template-interp, line/block comments, regex bodies + BracketStack/ErrorRecovery threading.

CONSUMED-BY-ORACLE runtime helper: `_scrml_structural_eq` only (deep-equal stub in the test).
Dogfood verdict: the flagship type+match-fold idiom LOWERS CORRECTLY through the real emitter (clean enum
objects + match IIFEs + threaded structs); it does NOT reach the importable library path (F1) — the single
structural blocker for "the compiler as idiomatic-scrml importable modules."

---

# self-host-v2 LEXER — slice 2 (strings + comments, S234)

Continues slice-1 (LANDED a8df839a). Same substrate/fold/oracle; adds the string
+ comment token classes.

## Slice-2 scope (built here)
- STRINGS — `scanString(cur, q)`: single- + double-quoted. A backslash escapes
  the NEXT code point (so an escaped quote never terminates the string — the only
  escape behavior that affects WHERE the string ends). Emits one
  `StringLit(cooked, raw, quote)` per string; token `text` = the RAW lexeme
  (quotes included), matching impl#1. `decodeSingleEscape` is the §12.8.4
  single-char escape table; `quoteCode` maps QuoteKind → closing-quote code.
- COMMENTS — `skipLineComment` (`//` → line-terminator/EOF) + `skipBlockComment`
  (`/*` → `*/`/EOF). impl#1 SKIPS comments as trivia; slice-2 matches — NO token
  emitted, only the cursor advances (line/col tracked by `advance`).
- Fold wiring — dispatch gains `(.InCode, .SawQuote(q)) :> scanStringStep(st, q)`,
  `(.InCode, .SawLineComment)` / `(.InCode, .SawBlockComment)` arms. `regexAllowedAfter`
  gains a `StringLit` case (a string cannot be followed by a regex).

## DEFERRED to slice-3 (still routed to `deferAdvance`; NOT scanned)
- template-interp nesting (InTemplateBody + `${…}`)  — SawBacktick event
- regex bodies (`/…/flags`)                          — SawRegexSlash event
- BracketStack + ErrorRecovery threading             — LexState fields not present yet
- **cooked-decode of hex/unicode/line-continuation escapes** (`\xHH`, `\uHHHH`,
  `\u{…}`, `\<newline>`): slice-2 decodes them via the single-char identity path,
  so `cooked` is approximate for those inputs — but `raw`/span are ALREADY correct
  (a backslash always escapes exactly the next code point, and hex/unicode escape
  bodies never contain a bare closing quote), so the token-diff (kind/text/span)
  is GREEN for them. Precise cooked-decode needs `parseInt` / `String.fromCodePoint`
  host support (unverified in scrml) — a slice-3 fidelity item, not a boundary bug.
The slice-2 corpus contains none of the still-deferred classes; the stub never fires.

## THE ORACLE (extended)
New sibling `compiler/tests/integration/self-host-v2-lexer-slice2.test.js` — same
compile→discover→eval→token-diff harness as slice-1, over a curated string/comment
corpus (single/double strings, escapes, hex/unicode raw-parity, empty, unterminated,
line/block comments, comments+strings MIXED with slice-1 tokens) PLUS a slice-1
no-regression guard subset. Regex/template inputs stay OUT (deferred). 31/31 GREEN;
slice-1's 34/34 unchanged (no regression) — 65/65 across the two files.

## DOGFOOD FINDINGS — slice 2: ZERO NEW.
Every slice-2 shape the DD prescribes compiled + lowered correctly on the live
compiler (probed before editing lex.scrml):
- **multi-field payload-variant** construction — `.StringLit(cooked, raw, quote)`
  lowers to `{variant:"StringLit", data:{cooked, raw, quote}}` (slice-1 used only
  single-field payload variants; multi-field works).
- **product-match arm binding a payload variant in a tuple slot** —
  `(.InCode, .SawQuote(q)) :> …` lowers + binds `q` correctly (F3 was a LITERAL-
  in-tuple-slot drop; a payload-variant-with-binding is unaffected).
- **`match` arms whose patterns are escape-bearing string literals** —
  `"\\" :> "\\"`, `"\"" :> "\""`, `"\n" ` etc. lower + decode correctly.
No workarounds beyond the slice-1 set (F1 `<program>` wrapper, F2 string-dispatch,
F4 qualified `TokenKind.X` / typed-return helpers) were needed.

## STATUS — slice 2 COMPLETE (GREEN)
- [x] string scanners (single/double + escape boundary handling) — token-diff GREEN.
- [x] comment scanners (line/block, trivia-skipped) — token-diff GREEN.
- [x] oracle sibling test — 31/31 GREEN; slice-1 34/34 unchanged.
- Deferred to slice-3: template-interp, regex bodies, BracketStack/ErrorRecovery,
  precise hex/unicode/line-continuation cooked-decode.

---

# self-host-v2 LEXER — slice 3 (regex + template-interp, S234)

Continues slices 1-2 (LANDED). Same substrate/fold/oracle; adds the LAST two
token classes: REGEX bodies + TEMPLATE-INTERPOLATION nesting (the §51.0.Q.1
composite). Replaces the slice-2 `deferAdvance` stubs for the `SawRegexSlash`
and `SawBacktick` events.

## Slice-3 scope (built here)
- REGEX — `scanRegex(cur)`: `/pattern/flags` scanned when `regexAllowedAfter(last)`
  is true (slice-1's `/`-vs-division predicate). Char-classes (`[...]` — a `/`
  inside `[]` does NOT close the regex), escapes (`\/`), the IdentifierPart flag
  run, and unterminated bodies (stop AT a line terminator / at EOF). Emits ONE
  `RegexLit(pattern, flags)` token; token `text` = the RAW lexeme (both slashes +
  flags), matching impl#1. `regexAllowedAfter` gained `.RegexLit` + `.RBrace`
  false-cases (parity with impl#1's false-list; impl#1's value-keyword cases —
  this/true/false/null/undefined — do NOT apply here: this lexer's keyword set
  excludes them, so they lex as `Ident`, already in the false-list).
- TEMPLATE-INTERP — the composite. `scanTemplateChunk(cur)` scans a free-text run
  to the next backtick / `${` / EOF (a backslash escapes the next code point, so
  `` \` `` / `\${` never terminate). Emits `TemplateChunk(cooked, raw)` per run
  (the opening backtick is ABSORBED — the first chunk starts after it; the CLOSING
  backtick IS included in the final chunk's raw/span — an impl#1 asymmetry matched
  exactly), `TemplateInterpStart` (`${`) + `TemplateInterpEnd` (`}`) around each
  interp, and the interp body lexes as EXPRESSIONS (InCode) one level deep.
- Fold wiring — `dispatch` gains `(.InCode, .SawRegexSlash) :> scanRegexStep`,
  `(.InCode, .SawBacktick) :> enterTemplateStep`, `(.InCode, .SawInterpClose) :>
  closeInterpStep`. `step` now branches on `st.mode` FIRST (`.InTemplateBody :>
  templateBodyStep` — free-text, no trivia skip; else `codeStep` — trivia +
  classify + dispatch). `LexState` gains `bracketDepth: int` (a MINIMAL running
  open-bracket counter — NOT the full typed BracketStack, which is slice-4) +
  `interpDepths: int[]` (the interp frame stack). A single `mkState()` constructor
  centralises the field list.
- Interp-close disambiguation (§51.0.Q.1): `${` pushes the current `bracketDepth`
  onto `interpDepths`; a `}` is the interp-closer (SawInterpClose -> emit
  TemplateInterpEnd, pop the frame, resume InTemplateBody) ONLY when
  `bracketDepth == top(interpDepths)` — otherwise it is a plain RBrace (object
  literal inside the interp). `enterTemplateStep` DRIVES the first chunk
  synchronously (matches impl#1's backtick handler — guarantees the empty leading
  chunk even for a lone trailing backtick, which the `while (!isEof)` driver would
  otherwise skip at EOF); `closeInterpStep` does NOT (so a trailing `}` at EOF
  emits no extra chunk — also matching impl#1).

## DEFERRED to slice-4 (still routed / left approximate)
- Full typed `BracketStack` (opener kinds + spans) + `ErrorRecovery` LexState
  threading — slice 3 threads only the minimal `bracketDepth: int` needed for
  interp-close disambiguation.
- Precise cooked-decode of hex/unicode/line-continuation escapes — `TemplateChunk`
  `cooked` is set ~= `raw` (approximate); NOT compared by the oracle (kind/text/
  span only). raw/span are already correct (a backslash always escapes exactly the
  next code point, and escape bodies never contain a bare backtick / `${`).
- OUT OF SCOPE token classes surfaced by adversarial probing (excluded from the
  corpus, NOT regressions): the `.foo` BareVariant production (impl#1 lexes
  `` ``.length `` 's `.length` after a value as `BareVariant`; impl#2 emits
  `Dot`+`Ident`) and value-keyword-then-regex where impl#1's larger keyword table
  diverges (`typeof /re/` — impl#2 lexes `typeof` as `Ident` -> division).

## THE ORACLE (extended)
New sibling `compiler/tests/integration/self-host-v2-lexer-slice3.test.js` — same
compile->discover->eval->token-diff harness, over REGEX_CORPUS (15: leading /
after-`=` / after-`return` / in-`(`/`[` / in-interp positions; char-classes;
escaped `/` and `]`; flags; unterminated at EOF and at a newline), DIVISION_CORPUS
(4: `/` after Ident / NumberLit / `)` / `}`), TEMPLATE_CORPUS (20: plain, empty,
single/multi/adjacent interps, interp-at-start, empty interp, object-literal +
expr + string + regex + arrow interp bodies, ONE/TWO-level nested templates,
escaped backtick, literal newline), MIXED_CORPUS (2), and a SLICE12_GUARD (9)
no-regression subset. 54/54 GREEN. Slices 1+2 unchanged (34/34 + 31/31) —
119/119 across the three files.

## DOGFOOD FINDINGS — slice 3

**F9 (NEW) — a literal `${` inside a scrml STRING literal is lexed as
interpolation, and an unbalanced `${` fails with E-CTX-003 "Unclosed 'logic'".**
`"${"` (or `'${'`, or any string with an OPEN `${` and no matching `}`) in an
expression-position string literal breaks lexing:
`<program>${ export fn g() -> string { return "${" } }</program>` ->
`E-CTX-003: Unclosed 'logic'` + `E-CTX-003: Unclosed 'program'`. A BALANCED
`"a${x}b"` compiles (scrml interpolates `${...}` inside string literals, BOTH
quote styles — `'lit${'` fails identically). This is likely INTENDED (scrml string
interpolation is a real feature; cf. §4.18.4 display-text `${...}` interpolation),
but it means a scrml-authored lexer/compiler cannot write a literal `${`/`}`
token-text as a plain string literal. WORKAROUND used: DERIVE the interp token
text from the source via `sliceText(cur, to)` (`${` = a 2-char slice, `}` = a
1-char slice) — no `"${"`/`"}"` string literal needed anywhere. Classification for
PA: language-feature interaction (ergonomic gotcha), cleanly workaroundable; flag
in case expression-position (non-display-text) string interpolation is NOT the
intended §4.18.4 scope.

**F7 confirmed at scale (benign, NOT new).** The slice-1 match-arm-reachability
gap now fires 21 `W-DEAD-FUNCTION` warnings (every match-arm-only callee:
`scanRegex`, `templateBodyStep`, `closeInterpStep`, `emitInterpStart`,
`scanTemplateChunk`, `bracketDelta`, `popDepth`, `mkState`, `codeStep`, etc.).
Codegen KEEPS them all (verified: `_scrml_lex_N` + every helper survives in the
emitted client.js; the oracle drives GREEN), so output is correct — the warnings
are noise. Reinforces F7's "match-arm call edges are not traced by reachability."

No NEW workarounds beyond the slice-1/2 set (F1 `<program>` wrapper, F2
string-dispatch, F4 qualified `TokenKind.X` / typed-return helpers) were needed.
Confirmed shapes that lower + execute correctly (probed before editing): nullary-
enum `match st.mode { .InTemplateBody :> … _ :> … }`; a new nullary event variant
(`.SawInterpClose`) added to the product match; `int[].slice(0, n)`; the `TmplScan`
struct carrying a `Cursor` + an enum field; the enter-drives-synchronously fold
shape.

## STATUS — slice 3 COMPLETE (GREEN)
- [x] regex scanner (char-classes + escapes + flags + unterminated) — token-diff GREEN.
- [x] template-interp composite (chunks + interp triad + nesting) — token-diff GREEN.
- [x] oracle sibling test — 54/54 GREEN; slices 1+2 unchanged (65/65) — 119/119 total.
- Deferred to slice-4: full typed BracketStack + ErrorRecovery threading; precise
  hex/unicode/line-continuation cooked-decode. Out-of-scope token classes noted
  above (BareVariant `.foo`; value-keyword-then-regex under a subset keyword table).
