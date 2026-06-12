# SCOPE — g-not-negation-unenforced: enforce E-TYPE-045 on all positions + both forms (S188)

**Change-id:** `g-not-negation-enforce-2026-06-12`
**Gap:** `g-not-negation-unenforced` (MED, `docs/known-gaps.md:1835`)
**Ruling (S188 user):** **"Error + full migration"** — SPEC §42.10-faithful enforce as a hard Error, with the full coupled corpus migration in ONE commit.
**Baseline:** HEAD `a25cd3ea` (v0.7.0). Full suite 23,957 / 0 fail at S187 close.

---

## 1. The bug (PA-verified empirically, S188)

SPEC §42.10 (SPEC.md:21676-21691) is emphatic: `not` is the **absence value only**, NOT a boolean negation operator. The negation operator is `!`. Line 21685 normative: *"`not` SHALL NOT appear in prefix position before a boolean expression. The compiler SHALL emit E-TYPE-045."*

**The compiler does not enforce this in most positions.** Empirically confirmed at `a25cd3ea`:
- `not @loggedIn` (bare) in a ternary → compiles CLEAN, emits `!_scrml_reactive_get("loggedIn")`.
- `not (@x == 1)` (paren) in a ternary → compiles CLEAN, emits `!_scrml_structural_eq(...)`.
- `not (@x == 1)` in an **if/while condition** → FIRES E-TYPE-045 (the only working path).

So prefix-`not` is silently rewritten to JS `!` (the exact SPEC-forbidden semantic), and "does what the user meant" — which is *why* it's a footgun: the wrong form works perfectly, cementing the wrong mental model (and is why the tutorial drifted into teaching `not x` as negation — the S186 audit §7 origin).

### Mechanism
1. **Silent rewrite** — two substitutions in `compiler/src/expression-parser.ts`, inside the `rewriteCodeSegments(s, (code) => {...})` block (~lines 1165-1212):
   - `:1170` — `code.replace(/(?<![A-Za-z0-9_$@])not[ \t]*\(/g, "!(")` — parenthesized `not (...)` form.
   - `:1207-1210` — bare `not <operand>` form, with battle-tested guards (statement-boundary `[ \t]+`, keyword-exclusion lookahead) that already protect valid standalone `not`.
   These run inside `preprocessForAcorn` on EVERY expression, so prefix-`not` works as `!` in every position.
2. **The only fire** — `type-system.ts:9563` calls `checkNotPrefixNegation(rawCondition, condSpan, errors)` on if/while raw condition strings ONLY. The check regex (`type-system.ts:11005`, fn at `:10986`) is `not\s*\(` — **paren-only**; bare `not @x` never matches even there.

### The two lowering substitutions ARE the precise §42.10 detector
Whatever they match = exactly the SPEC-forbidden prefix-`not`-as-negation. All valid `not` is excluded BEFORE this point: `is not` is rewritten earlier by `rewriteIsPredicates` (~:690→1113); `= not` / `return not` / `f(not)` / `[a,not]` / newline-crossing / keyword-adjacency are guarded; regex/comment/string interiors pass through via `rewriteCodeSegments` (GITI-017 / 6nz-s / S125 / S127 hardening). This is the single source of truth for "the forbidden form."

---

## 2. Migration cost (precise census, S188 investigation Agent 1)

The broad corpus is **parse-gated, not type-check-gated** in the green suite — most prefix-`not` sites are inert (don't red the suite). FORBIDDEN total = **66 corpus sites (27 paren + 39 bare)**. The real red-suite cost is concentrated:

- **FLAGSHIP `examples/23-trucking-dispatch` — 33 bare sites** (the epicenter). Dominated by `<p if=(not @loaded)>Loading…</>` (18×), plus `if (not ok)`, `not result.ok`, `not allowed`, `not matchesFilter(...)`, `not isLeftColumn(...)`, `not @editing`, `not @notFound`, `not l.driver_name`. Pinned by `trucking-dispatch-smoke-integration.test.js:170` (`errors === []` → 0→33).
- **Auth-scaffold generator** — `stdlib/auth/templates/login.scrml:47` + the `generate-auth` command emit `if (not ok)`; locked by `generate-auth.test.js:110` + `auth-redirect-tightening-integration.test.js:175`.
- **Golden negative fixture** `samples/compilation-tests/gauntlet-s19-phase3-operators/phase3-not-prefix-negation-027.scrml:4` — `.expected.json` ALREADY expects E-TYPE-045 (the fix's own anchor; do NOT migrate it).
- **~6 unit-test files** assert the bare-`not`→`!` lowering; under the optional-sink fix design most call the lowering DIRECTLY (no sink) and stay green — the agent must verify empirically which red (whole-compile path) vs stay (direct-lowering call).
- **~10 non-flagship example/sample files** — hygiene (inert today, not red-suite), but migrate per the full-migration ruling.

Per Rule 2: the flagship's `not @x` saturation is a **permissiveness artifact** (the compiler silently allowed it), NOT design intent — migrate it.

### FORBIDDEN site manifest (Agent 1, classified — verify on the worktree; line numbers are a starting hypothesis)
**Treat the FILE list as authoritative; re-derive exact sites by grep + classify against worktree source.** Migrate ONLY genuine prefix-`not`-as-negation (`not (...)` paren OR bare `not <ident/@ident/member/call>`); NEVER touch valid absence-value `not`.

PAREN (27): `samples/login.scrml`, `samples/multi-step-form.scrml`, `samples/contact-directory.scrml`, `samples/user-profile.scrml`, `samples/card.scrml`, `samples/admin-panel.scrml`, `samples/gauntlet-r11-task-dashboard.scrml`, `samples/recipe-book.scrml`, `samples/gauntlet-r14/htmx-forms.scrml`, `samples/gauntlet-r13/htmx-forms.scrml`, `samples/compilation-tests/gauntlet-r10-odin-filebrowser.scrml`, `samples/compilation-tests/gauntlet-r10-rust-orders.scrml`.

BARE (39): flagship `examples/23-trucking-dispatch/**` (33: app, pages/auth/login, pages/dispatch/{billing,load-new,load-detail,customers,board,drivers}, driver/{home,load-detail,profile,messages,load-log,hos}, customer/{loads,home,load-detail,profile,invoices,quote}) + `examples/17-schema-migrations.scrml`, `examples/14-mario-state-machine.scrml` (×2), `examples/18-state-authority.scrml`, `examples/08-chat.scrml`, `examples/09-error-handling.scrml` (×2) + `stdlib/auth/templates/login.scrml`.

### VALID forms the migration MUST NOT touch (Agent 2)
`x is not`, `is not not`, `= not` / `@x = not` / `default=not` / `<x> = not` init, `return not`, `f(not)`, `[a, not, b]`, `{k: not}`, `T | not` union TYPE, `not null` (SQL DDL §42.9), regex-literal `not` interiors (GITI-017), string-literal `not`.

---

## 3. Fix locus — Locus 2 (S188 investigation Agent 3 recommendation)

**Emit E-TYPE-045 at the lowering choke-point**, not by broadening a fragile regex across N positions:
- `preprocessForAcorn` (expression-parser.ts:1009) is a pure `string→string` lowering with NO diag sink. Its sole caller `parseExprToNode` (:2276) has `filePath`+`offset` in scope (clean span) but also no errors param.
- **Recommended plumbing:** when either substitution (`:1170` paren, `:1207` bare) fires, record an E-TYPE-045 diagnostic at the match offset (relative to the expression base offset → absolute span). Surface it to the type-check phase. The agent picks the cleanest mechanism (Phase-0 survey-confirm):
  - (i) thread an optional `diags?` out-param through `preprocessForAcorn` → `parseExprToNode` → wire at the call sites that feed the type-check errors stream; OR
  - (ii) attach `_diagnostics` onto the returned ExprNode and harvest them in the type-system's existing AST walk (`walkNode`/`EXPR_FIELDS`, ~:15304) — avoids threading 6 callers.
  - **Back-compat invariant:** default the param to undefined / make harvest additive so pure-lowering callers (and the `rewriteExpr`/`rewriteNotKeyword` direct-call unit tests, no sink) compile + behave unchanged — the substitution STILL lowers `not`→`!` (error-recovery output stays coherent); it ADDITIONALLY emits the diagnostic where a sink/harvest exists.
- **Coverage:** every expression flows through `parseExprToNode`→`preprocessForAcorn` exactly once → covers ALL positions + BOTH bare/paren for free, with ONE source of truth (no regex duplication).
- **Dedup:** the existing `checkNotPrefixNegation` (type-system.ts:9563, if/while paren-only) becomes redundant once the choke-point fires there too — RETIRE it OR gate it off to avoid DOUBLE-firing on if/while paren. The golden fixture `is-not-type-checks.test.js:59` (if-cond paren → E-TYPE-045) MUST still pass exactly once.
- **Span quality:** use the match offset + expression base offset; the diagnostic must point at the `not` token.

**Out of scope (deferred):** the native parser (`compiler/native-parser/`) — separate, deferred-to-cutover (~v0.8). It has ZERO E-TYPE-045 emission today, represents `not` as a `NotValue` atom (the misuse surfaces structurally), and its `.scrml` mirrors are FEATURE-stale (do NOT lockstep). File a cutover follow-on; do NOT touch native in this dispatch.

---

## 4. SPEC + doc currency (S188 investigation Agent 2)

- **Stale `:5556` cite** (line drifted to `splitRuleLines` since the S78 catalog backfill; real fire is `type-system.ts:11005`, fn `checkNotPrefixNegation` at :10986, call site :9563):
  - `compiler/SPEC.md:17098` (§34 row) — repoint to the new/real locus.
  - `docs/known-gaps.md:1837` — TWO stale `:5556` cites; the gap entry the fix closes (mark RESOLVED on landing).
  - (SPEC-INDEX has NO E-TYPE-045 / `:5556` cite — confirmed; no change there.)
- **Bare-vs-paren catalog asymmetry:** the normative statement (21685) is BROAD (bare + paren, all positions); all three catalog Trigger cells (SPEC.md:17098 §34, :21606, :21689 §42.10) say only `not (expr)` (paren). **Broaden the Trigger cells** to "prefix position — bare `not @x` OR parenthesized `not (expr)`" so catalog matches the broadened normative + new impl (closes the doc-mismatch class).

---

## 5. Decomposition (ONE coupled commit — Rule: coupled code+test+corpus = atomic; the migration MUST land WITH the reject or E-TYPE-045 reds the suite)

- **Phase 0** — survey-confirm the fix locus (sink-thread vs node-attach-harvest) + re-derive the FORBIDDEN manifest by grep+classify on the worktree (line numbers in §2 are a hypothesis). Report the locus choice + any drift before implementing.
- **Phase 1** — implement E-TYPE-045 at the choke-point (Locus 2); dedup vs the existing if/while check; preserve all valid-`not` forms + the GITI-017/6nz-s regex/value guards.
- **Phase 2** — corpus migration: every FORBIDDEN site `not <x>` → `!<x>` (flagship 33 + examples 6 + samples 27 + auth template). Auth-scaffold generator + `stdlib/auth/templates/login.scrml` migrated; update `generate-auth.test.js:110` + `auth-redirect-tightening-integration.test.js:175` to expect `if (!ok)`.
- **Phase 3** — tests: migrate/invert the whole-compile lock tests (trucking-dispatch smoke recovers to 0 errors; not-return-statement-glue §4 fixture; tokenizer-event-handler-attr-whitespace §1.2-1.4); ADD positive tests (E-TYPE-045 fires on bare + paren in ternary/interp/derived-RHS/`&&`/return/attr; STILL fires in if/while; does NOT fire on valid `not`). Keep the golden fixture + the direct-lowering unit tests green.
- **Phase 4** — SPEC + doc: §34/§42.10 Trigger broaden + `:5556` repoint; known-gaps `:5556` repoint + mark gap RESOLVED.
- **Phase 5 (R26 empirical)** — re-compile on the post-fix baseline: (a) the 3 repro shapes (`not @x` ternary, `not (@x==1)` ternary, bare `not @x` in `&&`) now FIRE E-TYPE-045; (b) the migrated flagship compiles 0-error; (c) valid `not` forms (`x is not`, `= not`, `return not`, regex interior) still compile clean; (d) `node --check` on emitted JS of a migrated flagship page. DO NOT mark DONE without Phase 5 passing.

**Authority:** SPEC §42.10 (normative); S188 investigation (3 read-only agents — census/test-locks/fix-locus); user ruling S188 "Error + full migration". Cross-ref `feedback_coupled_code_test_commit`, `feedback_dont_preclassify_fix_as_surgical`, R26 doctrine (pa.md S138 forward direction).
