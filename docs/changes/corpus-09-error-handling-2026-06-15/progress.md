# corpus-09-error-handling-2026-06-15 — Wave 1b REVISED (ruling (b): pure errors-as-states)

Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a49b01cb05f1f9642
Branch: worktree-agent-a49b01cb05f1f9642
Base: main HEAD 86cb8d67 (GAP-A void-scanner fix f563bc89 confirmed ancestor)

## Goal
Rewrite examples/09-error-handling.scrml to PURE errors-as-states (option b).
NO <errorBoundary>, NO showError/fail-e shim, NO variant `renders` clauses.
Failure routes into `.Failed(err)` state; `<match>` arm renders the error directly.

## 2026-06-15 — Step log (append-only)

- Startup verified: pwd under worktrees/agent-, toplevel==WORKTREE_ROOT, tree clean,
  ff-only main = already up to date, f563bc89 is-ancestor exit 0, bun install + pretest OK.
- Required reads done: primary.map.md, kickstarter v2 §6.8/§7/§11.5-recipe, primer §6/§6.1/§6.2,
  SPEC §19.3/§19.4/§19.7/§19.14 + §12.2 trigger 1 (the ?{} → server inference).
- EMPIRICAL FINDING (held-error-display ergonomics): routing a PAYLOAD-bearing variant
  constructor nested as an argument — `@phase = .Failed(.InvalidEmail(email))` — emits
  MALFORMED JS (E-CODEGEN-INVALID-JS: `data: { err: . InvalidEmail ( email ) }`). The unit
  variant `.Failed(.EmptyName)` alone would be fine; the break is the nested payload-bearing
  constructor as an arg. CLEANEST COMPILING SHAPE: a two-statement arm —
  `let err = .InvalidEmail(email); @phase = .Failed(err); return`. Compiles clean, keeps the
  bound payload USED (rides into the held error), reads clearly. Used uniformly across all 8 arms.
- Held-error DISPLAY: per the brief's known constraint, inline `${ match … :> <markup> }`
  emits malformed JS — NOT used. Instead a pure `fn errorMessage(e: ContactError) -> string`
  with a JS-style value-return match (returns STRINGS). The `<Failed err>` arm interpolates
  `${errorMessage(err)}`. Compiles clean; client lowers to `_scrml_errorMessage_10(err)`.
- Wrote examples/09-error-handling.scrml. Header reframed to pure errors-as-states + ONE
  NOTE line that variant-`renders`/`<errorBoundary>` is a SEPARATE §19.6 render-context idiom.
- COMPILE-VERIFY: exit 0, ZERO E- errors (only W-PROGRAM-SPA-INFERRED info, same as siblings).
  node --check client/server/runtime all OK. SECURITY: client.js has 0 `_scrml_sql`,
  0 `INSERT INTO`/`CREATE TABLE`/`contact_messages`; submit() is a fetch stub; SQL lives in server.js.
  grep: 0 `= false`/`= true`; 0 active `<errorBoundary>` element; 0 `showError`/`fail e`;
  0 active `renders` clause (the 3 matches are comment prose). 8 active `.Failed(err)` routings
  (4 arms x 2 handlers). `<Failed err>` arm shows `${errorMessage(err)}`.
- NEXT: within-node allowlist rebump for 09 + full `bun run test`.
- WITHIN-NODE REBUMP done. Ran the classifier (classifyDivergences on live BS+TAB vs native, with
  populateNativeAttrValueExprNodes mirrored per the pipeline). New 09 raw classCounts:
  KIND-NAME 5, FIELD-SHAPE 29, MISSING-FIELD 62, EXTRA-FIELD 34, COUNT-LENGTH 4, SPAN-COORD 67
  (NESTED-SHAPE 0, PARSE-FAILURE 0). Set the allowlist entry to exactly these (residual 0).
  Was: KIND-NAME 7, FIELD-SHAPE 26, EXTRA-FIELD 29, COUNT-LENGTH 3, SPAN-COORD 93, MISSING-FIELD 62.
  `bun test parser-conformance-within-node.test.js` -> 1009 pass / 0 fail (09 no longer over-budget).
- NEXT: full `bun run test` to confirm 0 fail across the suite.
