# native-match-arm-same-line-2026-06-04 — progress

## Step 0 — startup verification (DONE)
- pwd = /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-af8e2f77509278bf3
- toplevel == pwd; HEAD = e5b673dc (== brief base); merge --ff-only main: already up to date
- git status clean; bun install OK; bun run pretest OK
- maps: primary.map.md (L153 native-parser; L148 M5-swap precondition) + structure.map.md (L24 native-parser dir). Routing = parser/grammar shape.

## Phase 0 — SURVEY + DECISION = PROCEED

### Mechanism (verified by probe /tmp/probe-match.mjs + /tmp/probe-pred2.mjs + /tmp/probe-pred3.mjs)
- `isAtArmBoundary` (parse-expr.js:2988) has THREE conjuncts: (a) inMatchArmBody, (b) curr-line > prev-line (NEWLINE gate), (c) peekStartsArmPattern.
- Consulted at EXACTLY ONE site: L992, the TOP of parsePostfixChain's while loop (cursor at a postfix-operator candidate token, e.g. Dot/BareVariant/DoubleColon/LBracket/LParen).
- Same-line arms fail SOLELY because conjunct (b) blocks: `.Idle => "idle" .Busy => "busy"` has no newline between `"idle"` and `.Busy`, so the postfix chain greedy-consumes `.Busy` as member access on the StringLit -> E-EXPR-MATCH-PATTERN + E-EXPR-UNCLOSED-BRACE cascade.

### Disambiguation = ALREADY SOLVED by peekStartsArmPattern (the strong predicate)
- peekStartsArmPattern is ARROW-ANCHORED: every recognized pattern (`.Variant`, `::Variant`, `else`, `_`, `is .V`, `not...`, `Qual.Variant`) requires a following `=>`/`:>`/`->` arm-arrow within a bounded (depth-aware, scanPastPayloadParen) window, AND requires UPPERCASE variant names. A lowercase `.field` member-access continuation is NOT recognized (returns false at the boundary Dot).
- The ONLY false-positives the per-token dump found are post-`.` Ident positions (e.g. `[7] Ident:Field`, `[8] Ident:v` inside payload binding, is-pattern `BareVariant:Ok` after `is`). The postfix-chain guard at L992 NEVER sits at those positions — it fires at the `.`/operator token at the TOP of the loop, consumes the `.member`, and re-checks at the NEXT operator. So the false-positives are unreachable as boundary decisions.

### Controls that ALREADY pass same-line (no regression risk)
- `else => 2`, `_ => 2`, `Color.Red => 1 Color.Blue => 2`, `{ x: 1 } => ...` object-literal body — all parse correctly TODAY same-line because their prior arm body ends in a token (NumberLit/`}`) that does not postfix-chain into the next pattern's lead token.

### Controls that MUST stay correct after the fix (verified pre-fix; will re-verify post-fix)
- member-access body `.A => obj.field .B => other.x` — boundary at `.B` Dot is arm?=true; the intervening `.field` Dot is arm?=false (no arrow after field). PASS.
- nested-match-in-arm — inner same-line match also fixed by same change.
- payload-binding `.Ok(v) =>`, is-pattern `is .Ok =>` — patterns parsed by parseMatchArmPattern, not the boundary guard.

### DECISION: clean local extension. Drop conjunct (b) (the newline gate) in isAtArmBoundary; rely on (a) inMatchArmBody + (c) peekStartsArmPattern. NO change to peekStartsArmPattern, parseMatchArm, parseMatchExpr, or any broad expression parsing. NO codegen/SPEC change. PROCEED to Phase 2.

### Out of scope (separate F3 sub-issue, NOTED not fixed): `if (c) { lift x } else { lift y }` in EXPRESSION position — different production (if-as-expr), not the match-arm boundary mechanism.

## Phase 2 — FIX applied (parse-expr.js)
- isAtArmBoundary: dropped conjunct (b) the newline gate (prev/curr line comparison). Now: (a) inMatchArmBody + (b) peekStartsArmPattern only.
- prevTokenLine/currentTokenLine retained — still used by isAtStateDeclBoundary (M6.5.b.2.1).
- node --check OK. Probe /tmp/probe-match.mjs: ALL 12 fixtures parse correctly (same-line =>/:>/->, member-access body, nested-match, object-literal, else, _, qualified).
- AST parity /tmp/probe-parity.mjs: same-line AST byte-identical to newline AST (spans stripped) for all 8 cases. => codegen emits identical JS.

### LEAK-TO-MAIN incident + recovery (S126):
- First edit attempt used `cd /home/.../scrmlTS && ... $(pwd)/...` which resolved $(pwd) to MAIN, writing the edit to main's parse-expr.js. Detected via stale probe output (file Bun read still had the gate). Reverted main via `git checkout -- parse-expr.js` (main clean). Re-applied to the EXPLICIT worktree absolute path. No main contamination remains.

## .scrml MIRROR — S115 LOCKSTEP PRE-EXISTING DIVERGENCE (NOT mirrored — surfacing)
- parse-expr.scrml (3218L) is a SUBSTANTIALLY EARLIER snapshot: it has NO isAtArmBoundary, NO peekStartsArmPattern, NO isArmArrowAt, NO scanPastPayloadParen, NO prevTokenLine/currentTokenLine, NO inMatchArmBody flag, and NO arm-boundary guard in parsePostfixChain. The ENTIRE M6.5.b.1 newline-as-separator boundary feature is absent from the mirror.
- git history confirms: .js mirror most-recent commits = M6.7-D3 / M6.7-D1 / M6.5.b.2.1; .scrml mirror most-recent = Wave 9-I predicate-drift (predates ALL M6.5.b.1 work).
- The .scrml mirror is NOT on the active test path (no test/source compiles it; all conformance tests import the .js). It is a bootstrap artifact for the eventual self-host.
- DECISION: mirroring a one-line gate REMOVAL is impossible when the host function doesn't exist in the mirror. Porting the full M6.5.b.1 boundary machinery (6+ helpers + postfix-chain guard + inMatchArmBody threading) into the .scrml is a LARGE SEPARATE task, well beyond same-line-boundary scope. NOT done here. Surfaced as a deferred follow-up: ".scrml mirror is behind .js on the entire M6.5.b.1 arm-boundary feature, not just the F3 same-line delta." Per brief "STOP-and-report if it needs more" — the .scrml lockstep needs more; the .js fix does not.

## Phase 3a — conformance test (DONE)
- compiler/tests/native-match-arm-same-line.test.js: 21 tests, all pass.
  - same-line =>/:>/->, 3-arm, else/_, qualified, payload-binding parse.
  - AST structural parity same-line === newline (5 cases).
  - disambiguation controls: member-access body (full Member kept), uppercase member (obj.Field not split), object-literal, nested same-line match, call, ternary — all 2 arms, no leak.
  - newline controls unchanged.
- SEPARATE PRE-EXISTING GAP found: is-pattern arms (`is .Ok => 1`) fail in BOTH same-line AND newline form (E-EXPR-MATCH-PATTERN + unclosed-brace) — orthogonal to F3 (the boundary). Test asserts PARITY (same-line ≡ newline) for that case, NOT clean parse. Surfaced as a separate native-parser gap.

## Phase 3b — within-node parity (within-node.test.js)
- ONE fixture rebumped: samples/compilation-tests/match-001-nested-with-call.scrml (it contains the exact F3 target — a same-line `match @state { .Small => "Small" .Big => "Big" .Fire => "Fire" .Cape => "Cape" }`).
  - FIELD-SHAPE 5 -> 7, SPAN-COORD 15 -> 19. KIND-NAME/MISSING-FIELD/EXTRA-FIELD/COUNT-LENGTH unchanged in the allowlist entry.
- Corpus aggregate (baseline parse-expr vs fixed parse-expr, measured by swap-and-rerun):
  - KIND-NAME 3362->3362 (0), FIELD-SHAPE 11014->11016 (+2), MISSING-FIELD 32871->32871 (0),
    EXTRA-FIELD 13720->13719 (-1), COUNT-LENGTH 1019->1017 (-2), SPAN-COORD 37984->37988 (+4). TOTAL 99970->99973 (+3).
- DIRECTION EXPLAINED: the LOAD-BEARING structural classes improved — COUNT-LENGTH -2 (the arm-COUNT mismatch is GONE: native now emits the right number of arms; previously the same-line match dropped 3 of 4 arms) and EXTRA-FIELD -1. The +2 FIELD-SHAPE / +4 SPAN-COORD are the newly-PARSED arm nodes (Big/Fire/Cape) now being field/span-compared against the live AST, surfacing the inherent native-vs-live field/coord residual that was previously MASKED by the parse-failure. This is the documented canary behavior ("more parses -> more aligned nodes get field-nitpicked"); it is an IMPROVEMENT (true divergence down: COUNT-LENGTH), not a regression. No KIND-NAME / MISSING-FIELD / PARSE-FAILURE change.

## Phase 3c — FULL-PIPELINE empirical verification (compileScrml, both parsers)
- /tmp/f3fix/sameline.scrml (same-line 3-arm match) + /tmp/f3fix/newline.scrml (newline control), compiled via compileScrml({write:false}) under parser:null (live) and parser:"scrml-native".
- VERDICTS:
  - same-line/live   : 0 fatal errors, 1 output.
  - same-line/native : 0 fatal errors, 1 output. Match emits correctly: `if (X === "Idle") return "idle"; else if (X === "Busy") ...; else if (X === "Done") ...`. ALL 3 arms.
  - newline/live     : 0 fatal errors, 1 output.
  - same-line/live clientJs === newline/live clientJs : TRUE (same-line and newline are semantically identical on the live path — proves the equivalence).
  - same-line/native clientJs vs same-line/live clientJs : differs ONLY by synthetic-id counter offsets (_scrml_match_4 vs _scrml_match_5, _scrml_refresh_3 vs _4, _scrml_logic_1 vs _2) — 7 of 48 lines, all id-number shifts, the match LOGIC byte-identical. This is the PRE-EXISTING native-vs-live id-allocation order divergence (F3-independent). => "id-offset-equivalent" per the brief's acceptance. node --check / Acorn gate clean (validateEmit default ON, 0 E-CODEGEN-INVALID-JS).

## Phase 3d — related suites (flip-gated)
- promote-match, match-arm-inline, match-arm-inline-markup-payload, derived-const-match-exhaustiveness-bug71, return-match-exhaustiveness-bug67 — 46 tests, 0 fail. NONE pass parser:"scrml-native" — they run the LIVE path by default, so they're FLIP-GATED (will exercise native only when it becomes default). F3 doesn't touch the live path, so they're unaffected; they are the downstream consumers F3 unblocks for the eventual swap.

## TEST GATE — counts
- Pre-commit gate (compiler/tests/{unit,integration,conformance}): 15829 pass / 0 fail / 89 skip / 1 todo — IDENTICAL before and after (the gate glob excludes root-level compiler/tests/*.test.js where the new test + within-node live).
- Root conformance (native-match-arm-same-line + within-node + expr + corpus): 2658 pass / 0 fail / 1 skip. Includes the 21 new F3 tests + the rebumped within-node gate.

## SEPARATE F3 SUB-ISSUE (NOT FIXED — follow-up): `if (c) { lift x } else { lift y }` in EXPRESSION position.
- Different production (if-as-expr), NOT the match-arm boundary mechanism. Out of this dispatch's scope per brief. Noted for a separate dispatch.

## SEPARATE PRE-EXISTING GAPS surfaced (NOT in scope):
1. .scrml mirror (parse-expr.scrml) lacks the ENTIRE M6.5.b.1 arm-boundary machinery (not just the F3 same-line delta) — S115 lockstep broken at the feature level. Needs a full port, not a one-line mirror.
2. is-pattern arms (`is .Ok => 1`) fail in BOTH same-line AND newline form (E-EXPR-MATCH-PATTERN + unclosed-brace) — a native arm-PATTERN gap orthogonal to F3's arm-BOUNDARY. Conformance test asserts same-line≡newline parity for that case.

## DONE — all commits landed, tree clean.
