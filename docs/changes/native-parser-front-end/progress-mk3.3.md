# MK3.3 — ${...} interpolation + E-UNQUOTED-DISPLAY-TEXT + §4.18 conformance close

Per-agent progress file (append-only). A parallel M3.4 dispatch runs concurrently —
do NOT share a progress.md.

## Startup

- 2026-05-20 — worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a2bc2e7d4d0428e78
- Startup verification PASS: pwd under .claude/worktrees/agent-, repo root matches,
  tree clean, `git merge main` fast-forwarded to 060fd0be, all 5 predecessor file
  pairs (display-text-literal / body-mode / parse-markup / parse-expr / lex-mode
  .scrml+.js) present, `bun install` ok, `bun run pretest` ok.

## Reading

- Maps read: primary / structure / dependencies / schema.
- Roadmap §0 / §3.3 (MK3.3 row — authoritative scope) / §4.4 K-class.
- Charter dive Q1.E (DisplayTextLiteral sketch) / Q3.A (§4.18 mapping) / Q3.B
  (worked-example trace incl. step 5: the ${@result.count} interpolation
  producing ONE node) read.
- SPEC §4.18 (§4.18.1-§4.18.9) read IN FULL via SPEC-INDEX (lines 1106-1268),
  esp. §4.18.4 (${...} interpolation) + §4.18.7 (E-UNQUOTED-DISPLAY-TEXT).
- SPEC §34 E-UNQUOTED-DISPLAY-TEXT + E-PARSE-001 entries read.
- Predecessor native-parser files read in full: display-text-literal .scrml+.js
  (MK3.2 — the direct predecessor), body-mode .scrml+.js, parse-markup .js,
  parse-ctx .js, cursor.js, lex.js, lex-in-template.js, parse-expr.js (entry +
  parseTemplateLiteral).
- progress-mk3.1.md + progress-mk3.2.md read.

## SPEC findings (load-bearing)

- §4.18.4 — `${expr}` inside a display-text literal opens a logic context per
  §3.1; expr follows logic-context grammar; @-sigil access applies. A literal
  with one+ interpolations is a SINGLE body child interleaving literal-text
  segments + interpolated expressions — NOT decomposed into siblings. `\${`
  escapes a literal `${` (already handled at MK3.2).
- §4.18.7 — E-UNQUOTED-DISPLAY-TEXT fires when, scanning a code-default-mode
  body, the parser encounters a non-whitespace run that is neither (a) a valid
  scrml expression per §4.18.2 nor (b) a `"..."` literal. The diagnostic SHALL
  identify the offending run + suggest wrapping it (`"<the run>"`). It does NOT
  fire in free-text-mode bodies. The error is a PARSE OUTCOME (charter Q3.A) —
  not a separate heuristic check.
- §34 E-UNQUOTED-DISPLAY-TEXT — severity Error.

## MK3.2 handoff

- MK3.2's scanDisplayTextLiteral is a self-contained scanner returning
  `stoppedAtInterp: true` at an un-escaped `${`, cursor left AT the `$`.
- MK3.2 did NOT wire the scanner into the trampoline's body dispatch.

## Scope (roadmap §3.3 MK3.3 row)

IN:
1. DisplayTextLiteral.InInterpolation — extend scanDisplayTextLiteral to RESUME
   past the `${`: scan to the matching `}` by brace-depth (the lex-in-template
   bracketDepthAtOpen pattern — P6), lex()+parseExpr() the interp body, push the
   expr into `exprs`, continue accumulating segments. ONE node `{segments,exprs}`.
2. Wire scanDisplayTextLiteral into the trampoline body dispatch — in a
   BodyMode.CodeDefault body a `"` begins a DisplayTextLiteral.
3. E-UNQUOTED-DISPLAY-TEXT (§4.18.7) — a parse outcome: in a .CodeDefault body
   a bare run that is neither valid code nor a `"..."` literal → emit the error
   + the "did you mean" suggestion.
4. §4.18 conformance close — every SPEC §4.18 worked example parses; an
   E-UNQUOTED-DISPLAY-TEXT regression test.

## Plan

1. display-text-literal.js/.scrml — fill .InInterpolation: scanInterpolation
   (brace-depth scan to the matching `}`) + parse the interp body via M2; the
   one-node `{segments, exprs}` loop. Fill the `.InInterpolation` engine body.
2. parse-markup.js/.scrml — body-mode-aware dispatch: in dispatchTopLevel, when
   currentBodyMode(ctx) is CodeDefault, a `"` → emit a DisplayTextLiteral block;
   a bare non-ws run that is not valid code → E-UNQUOTED-DISPLAY-TEXT.
3. Conformance — extend parser-conformance-markup.test.js with the MK3.3 section.

## Progress

- 2026-05-20 — progress file (commit 5a87a4d2). Startup verification PASS;
  markup conformance baseline 364/0; pre-commit gate baseline 13451/0.
- 2026-05-20 — display-text-literal.scrml/.js — MK3.3 step 1: the §4.18.4
  `${...}` interpolation (commit 9d497522). scanDisplayTextLiteral now
  consumes interpolations IN-LINE — an un-escaped `${` closes the current
  literal-text segment, scanInterpolation finds the matching `}` by walking
  the M1 lexer's token stream (LBrace/RBrace brace count — string-aware for
  free; R1 seam P6), the `${expr}` body delegates to the M2 expression
  parser (lex + parseExpr), a fresh segment begins after the matching `}`.
  ONE node with N+1 segments + N exprs. Unterminated interpolation →
  E-CTX-001 against the `${`. The MK3.2 §52 stop-at-`${` tests are the
  coupled test update. .scrml + .js in lockstep. Markup conformance 364/0.
- 2026-05-20 — parse-markup.scrml/.js — MK3.3 step 2: the code-default body
  dispatch + E-UNQUOTED-DISPLAY-TEXT (commit 37bb99bf). dispatchTopLevel
  gains a §4.18 code-default-body branch (gated on isCodeDefault(current
  BodyMode(ctx))) — dispatchCodeDefaultBody: whitespace skipped (§4.18.5
  formatting), a `"` → scanDisplayTextLiteral → a DisplayTextLiteral block
  carrying the `{segments,exprs}` node as `.literal`, a bare run validated
  as code via the M2 expression parser → not valid code → E-UNQUOTED-
  DISPLAY-TEXT (§4.18.7) with the `"..."` suggestion. E-UNQUOTED does NOT
  fire in free-text bodies. .scrml + .js in lockstep. Markup conformance
  364/0.
- 2026-05-20 — parser-conformance-markup.test.js — MK3.3 step 3: §55-§62
  conformance (commit 9a18d8b8). 8 describe blocks — findInterpolation
  CloseOffset, scanInterpolation, parseInterpolationBody, the one-node
  `{segments,exprs}` shape, the trampoline code-default body dispatch,
  E-UNQUOTED-DISPLAY-TEXT (the regression test), isValidCodeRun /
  scanCodeDefaultRunExtent units, and the SPEC §4.18 worked examples
  end-to-end (§4.18.3/.4/.6/.7 + the charter Q3.B trace). Markup
  conformance 416/0 (+52 MK3.3 tests).

## MK3 milestone — COMPLETE (charter Q4.A gating)

- Every SPEC §4.18 worked example parses correctly — §62 covers §4.18.3
  (quoted literals), §4.18.4 (the charter Q3.B trace + `"Failed: ${...}"`),
  §4.18.6 (verbatim text capture), §4.18.7 (the bare-prose error).
- E-UNQUOTED-DISPLAY-TEXT fires per §4.18.7 — §60 (the regression test);
  fires in code-default bodies, does NOT fire in free-text bodies.
- An interpolated literal produces ONE node per §4.18.4 — §58 (N+1
  segments + N exprs; not decomposed into siblings).
- MK3.1 + MK3.2 + MK3.3 all landed; the MK3 milestone is COMPLETE.

## MK4 seam (documented)

- The FULL code-default body grammar — a body AST node interleaving the
  parsed code expressions — is the MK4 markup↔JS seam. MK3.3 lands the
  §4.18 quoted-text surface (the `"..."` literal + the E-UNQUOTED parse
  outcome); a valid-code bare run is CONSUMED (the trampoline progresses)
  but its parsed Expr is not yet woven into a body node. MK4 lifts the R1
  spike §3 seam contract for the whole markup↔JS boundary; the
  interpolation delegation (display-text-literal's scanInterpolation) is
  the §4.18.4-scoped instance of that seam.

## SPEC inconsistency (re-surfaced from MK3.2, non-blocking)

- SPEC §4.18.3 says `\"` and `\\` are "the only two escape sequences"
  inside a display-text literal; §4.18.4 then adds `\${`. MK3.2 already
  implemented the 3-escape union (§4.18.4 governs `\${`); MK3.3 inherits
  it. The §4.18.3 "only two" phrasing predates / does not cross-reference
  §4.18.4's `\${`. A one-line §4.18.3 editorial fix would remove the
  apparent conflict. MK3.2 already surfaced this to PA; re-noted here for
  continuity. Non-blocking.

## Verification

- Full `bun run test` — see the final report block.
