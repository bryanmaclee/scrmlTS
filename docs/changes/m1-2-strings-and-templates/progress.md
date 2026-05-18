# Progress: m1-2-strings-and-templates

S100 dispatch — activates `<InSingleString>` + `<InDoubleString>` + `<InTemplateBody>` (with §51.0.Q.1 nested LexMode engine for `${...}` interpolation) state-child bodies.

## Pre-snapshot

- Baseline branch: `worktree-agent-ad5b398abf76f780d` (off main `5ea7561` after M1.1 landed)
- Pre-dispatch lexer conformance: **57 pass / 12 skip / 0 fail**
- Pre-dispatch full suite: (run before final commit)
- Working directory: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ad5b398abf76f780d`

## Plan

1. Verify TokenKind variants — add `TemplateInterpStart` / `TemplateInterpEnd` if missing (M1.1 has `LogicEscapeOpen` / `LogicEscapeClose`; per DD §D3 the scrml-extension shape and the JS-template shape are DISTINCT tokens). Add `TemplateInterpStart` + `TemplateInterpEnd` for templates; keep `LogicEscapeOpen` / `LogicEscapeClose` for scrml `${}`.
2. Create `lex-in-single-string.scrml` + `.js` shadow — escape-aware single-quoted string scanner. Emits one `StringLit`. Per ANOMALY-2 workaround.
3. Create `lex-in-double-string.scrml` + `.js` shadow — same shape, `"`-terminated.
4. Create `lex-in-template.scrml` + `.js` shadow — `<InTemplateBody>` body with NESTED `<engine for=LexMode initial=.InCode>` per §51.0.Q.1. Emits sequence of `TemplateChunk` + `TemplateInterpStart` + interp-body tokens + `TemplateInterpEnd` + `TemplateChunk` … until closing backtick. Nested templates supported via standard recursion through outer `lex` loop.
5. Activate state-child bodies in `lex-mode.scrml` — the three M1.2 state-children get NON-bare bodies. (Carefully — ANOMALY-1 says line-comments inside engine state-child bodies with `${` may break. Keep bodies free of `${` literal text; use `<engine>` declarations as the body content.)
6. Extend `lex.scrml` dispatch loop — route `LexMode.InSingleString` / `InDoubleString` / `InTemplateBody` to the new bodies' dispatchers when the outer loop sees them. (M1.1 had the dispatch happen inline in `dispatchInCode`. M1.2 keeps that for the *opener* recognition but the loop also needs to handle the case where outer is already in InCode after a `${` opened inside InTemplateBody — see plan-detail below.)
7. Refactor `dispatchInCode` to NOT inline the template scanner — push that into `lex-in-template.scrml`. Single-string + double-string stay inline-driven from `dispatchInCode` because they are bounded scans (no inner engine); but the body is escape-aware now.
8. Update `parser-conformance-lexer.test.js` — flip `M1.2-*` disposition skips to enabled byte-identical (or smoke-with-stronger-asserts for cases where Acorn token-shape differs from ours per intentional divergence). Add new inline micro-corpus cases for escape sequences + nested templates.
9. Update `README.md` — M1.2 status, anomaly section.
10. Verify full `bun test`. No regressions.

### Decomposition detail — nested-engine pattern

Per DD §D2 and SPEC §51.0.Q.1, `InTemplateBody` is a composite state-child whose body declares `<engine for=LexMode initial=.InCode>`. At runtime: when outer LexMode transitions IN to `.InTemplateBody` (backtick), the inner engine initializes; the lex loop dispatches per-character through the inner engine. Inside the inner engine's `.InCode`, when we see `${`, we increase a per-template `braceDepth` counter (kept in ctx) and continue lexing JS tokens. When we see `}` AT THE EXACT depth that opened the interp, we emit `TemplateInterpEnd` and resume the OUTER InTemplateBody chunk scanner. When we see `\`` AT depth 0 we emit final `TemplateChunk` + closing-backtick consumed + transition outer LexMode back to `.InCode`.

The "nested engine" SHAPE is realized in M1.2 at the scrml-source layer (engine declaration inside the InTemplateBody body); the live JS-host surface mirrors this with a `templateStack` array in ctx tracking per-template state. The outer lex loop dispatches by `getMode(ctx)`; when mode==InTemplateBody, dispatch goes to `lex-in-template.js#dispatchInTemplateBody`; that dispatcher reads `templateStack` top frame to know whether we're scanning the raw chunk or the interp body. When the interp body opens (`${` seen during chunk scanning), the inner engine "initializes" — at the JS-host layer this is pushing an `interpDepth` frame and transitioning outer mode to InCode; subsequent dispatch is normal InCode work (with the brace-stack tracking the closing-`}` for the interp). When the brace stack returns to the depth at which `${` opened, the next `}` is consumed as TemplateInterpEnd and outer mode transitions back to InTemplateBody.

Nested templates fall out naturally — inside the interp body, a new `\`` opens another template, which pushes another frame.

## Timeline

- Startup verification + bun install + pretest OK; baseline lexer conformance 57/12/0
- Maps + native-parser/README + lex-mode.scrml + lex.scrml + lex-in-code.scrml + token.scrml + cursor + bracket-stack + DD §D2/D3/D7 + SPEC §51.0.Q (lines 22671-22838) + M1.1 progress + parser-conformance-lexer.test.js all read
- Added TokenKind variants `TemplateInterpStart` + `TemplateInterpEnd` to token.scrml + token.js — committed `56bf6a9`
- Wrote `lex-in-single-string.scrml/.js` — escape-aware scanner per JS spec §12.8.4 (table includes `\n` `\r` `\t` `\b` `\f` `\v` `\0` `\\` `\'` `\"` `` \` `` `\/`, `\xHH`, `\uHHHH`, `\u{...}`, IdentityEscape, LineContinuation) — committed `048cbe5`
- Wrote `lex-in-double-string.scrml/.js` — mirror; shares `scanStringEscape` primitive — committed `a4610ba`
- Wrote `lex-in-template.scrml/.js` — §51.0.Q.1 nested-engine pattern; per-call `ctx.templateStack` tracks template-interp frames; nested templates supported — committed `ce1b7a1`
- Activated `<InTemplateBody>` as composite state-child in `lex-mode.scrml` with nested `<engine for=LexMode var=innerLexMode initial=.InCode>`; surfaced ANOMALY-4 (compiler v0.3 requires var= disambiguation + full state-child enumeration on inner engine sharing outer's enum type) — committed `3a61768`
- Wired up dispatcher integration in `lex.scrml/.js` + `lex-in-code.scrml/.js` — committed `bb1f66d`. Removed pre-existing `if (lastKind == undefined)` (S89 ABSOLUTE rule). Surfaced ANOMALY-5 (lex-in-code.scrml fails .scrml compile against current main due to E-SYNTAX-042 + cascading scope errors — pre-existing M1.1 carry-over, surfaced after `undefined`-keyword strictening).
- Updated `parser-conformance-lexer.test.js` — flipped M1.2-* disposition skips to strengthened assertions (StringLit count + TemplateChunk presence + TemplateInterpStart/End balance) + 11 new inline cases for escapes (`\n`, `\t`, `\xHH`, `\uHHHH`, `\u{...}`, IdentityEscape, LineContinuation) + plain template + single interp + nested templates + balanced-brace interp + member-access interp. Result: 57/12/0 → 87/3/0. — committed `8f7419e`
- Updated `README.md` — M1.2 status table + new file listings + roadmap (M1.2 ✅) + ANOMALY-4 + ANOMALY-5 + tag refresh — committed `018e08a`

## Verification

- Lexer conformance: 87 pass / 3 skip / 0 fail (up from 57/12/0)
- Pre-commit gate (unit+integration+conformance): 12624 pass / 88 skip / 1 todo / 0 fail — baseline preserved exactly
- Full `bun test`: 15444 pass / 172 skip / 0 fail — ZERO regressions
- `git status --short`: clean tree before final report
- `bun -e "import {lex}..."` smoke tests confirm: single-string, double-string, plain template, single interp, nested template, balanced-brace interp, member-access interp ALL produce correctly-sequenced token streams

## Pillar 5b conformance check

Per the file-top headers of each new file:
- **State-shape**: `LexMode` engine (lex-mode.scrml) handles the InCode/InSingleString/InDoubleString/InTemplateBody mode dispatching, with §51.0.Q.1 nested engine inside InTemplateBody for `${...}` interp. `BracketStack` engine tracks brace nesting (used to disambiguate interp-closing `}` from balanced inner braces). `templateStack` on ctx tracks the per-template frames (mirror of inner-engine instances per §51.0.Q.1's "outer × 1 = 1 inner instance" invariant).
- **Calculation (`fn`)**:
  - `decodeSingleEscapeChar(c)` — JS escape table lookup (pure fn over input byte; no ambient context).
  - `scanHexEscape(cursor, n)` / `scanBraceUnicodeEscape(cursor)` — N-hex-digit codepoint decode (pure fn).
  - `scanStringEscape(cursor)` — orchestrates the escape sub-decoders (calculation; only state-write is cursor advance, which is the V5-strict cursor pattern per DD §D4 P5).
  - `scanSingleQuotedString(cursor)` / `scanDoubleQuotedString(cursor)` — body scan (calculation; state-writes confined to cursor advance + tokens-array append, both V5-strict-pattern-conformant).
  - `scanTemplateChunk(cursor)` — body chunk scan (same pattern).
  - `isTemplateInterpClose(cursor, ctx)` — predicate (pure read).
- **Wrappers**: `dispatchInSingleString` / `dispatchInDoubleString` / `dispatchInTemplateBody` / `emitTemplateInterpClose` — state-aware wrappers that own the LexMode transitions; the wrapping boundary is clean (state side at the rim, calculation inside).

No `fn` body manages where-in-parsing we are; mode dispatch is entirely engine-driven. Pillar 5b clean.

## DONE

Ready for report.
