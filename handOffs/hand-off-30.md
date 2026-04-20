# scrmlTS — Session 29 Wrap

**Date opened:** 2026-04-19
**Date closed:** 2026-04-19 (single-day session)
**Previous:** `handOffs/hand-off-29.md` (S28 wrap, rotated in as S29 starting brief)
**Baseline entering S29:** 7,183 pass / 10 skip / 2 fail (26,415 expects / 315 files) at `bfad4c6`.
**Final at S29 close:** **7,186 pass / 10 skip / 2 fail** (26,421 expects / 315 files) at `b189051`.

---

## 0. Close state

### S29 commits — 2 commits, both pushed to origin/main
- `74303d3` — `fix(self-host/bpp): wrap content in ${} logic block + fix broken regex`
- `b189051` — `fix(ast-builder): component-def requires markup RHS, not just uppercase name`

One external commit landed between mine (`2551fc7` — landing page "Null was a billion-dollar mistake" article link), not authored by this PA.

### Uncommitted at wrap
- `docs/SEO-LAUNCH.md` — same untouched edit, 6 sessions running. Still no action.

### Incoming
- `handOffs/incoming/` empty (only `read/` archive).

### Cross-repo
- scrmlTSPub retirement still pending at master since S25 (no update this session).

### Self-host build state at wrap
- PASS (5): `module-resolver`, `meta-checker`, `block-splitter`, **`body-pre-parser` (S29 fix)**, `tokenizer`
- FAIL (5): `ast-builder` (59 err), `protect-analyzer` (31 err), `route-inference` (12 err), `type-system` (120 err), `dependency-graph` (20 err)
- Before S29: module-resolver was masked-PASS (latent scope bug hidden by phantom-component vacuum). Now genuinely passing.

---

## 1. Session theme — "bpp unlocked, then a compiler-bug arc uncovered"

S29 opened with P3 self-host modernization, starting with body-pre-parser per the S28 recommendation. bpp.scrml unlocked in one structural fix plus one broken-regex fix. Moved to pa.scrml, hit a mysterious "every identifier undeclared including for-loop iter vars" scope-wipe inside `processDbBlock`. Deep-dive found the root cause was in the AST builder (`component-def` heuristic too aggressive), not the scope checker. Fixed that plus 3 coupled issues in one commit. S29 ended with the previously-hidden module-resolver latent bug fixed end-to-end, the full P3 queue better-understood, and 3 adjacent bugs captured for future arcs.

---

## 2. Session log

### Arc — P3 self-host modernization (picked option 1 from S28 queue)

**Commit `74303d3`** — `fix(self-host/bpp): wrap content in ${} logic block + fix broken regex`. bpp.scrml moved from FAIL (3 errors) to PASS. Structural fix: content sat bare inside `<program>` (markup context); the `<` in `i < trimmed.length` was being scanned as a tag opener. Wrapping everything in `${ }` (the big-wrap idiom used by bs.scrml and module-resolver.scrml) resolved the E-CTX-003 AND the two E-IMPORT-001 errors. Also fixed a genuine bug in the source: `if (</>[—–]/.test(trimmed))` → `if (/[—–]/.test(trimmed))` — matched the JS original in parser-workarounds.js:22.

### Arc — pa.scrml translation attempt → compiler-bug deep-dive

Moved to pa.scrml (38 errors, next in the P3 queue). Mechanical ops (`!==` → `!=`, `===` → `==`) brought it to 28 errors. Then discovered a mysterious "all-scope-wiped" condition inside `processDbBlock` — even the function's own for-loop iter vars reported E-SCOPE-001. Deep-dive found the root cause was NOT in the scope checker but in the AST builder.

**Root cause:** `ast-builder.js:3634` treated ANY `const UpperName = ...` as a component-def regardless of RHS. An adjacent pass (`attachDefChildren`, lines 5695-5703) then vacuumed all subsequent sibling declarations — function-decls, classes, other consts — into the phantom component's defChildren. Scope-check doesn't descend into defChildren, which silenced every scope error for the swallowed helpers. In pa.scrml, `const ASCII_WS = new Set(...)` and `const CREATE_TABLE_RE = new RegExp(...)` both fired the bug; everything between them and the next barrier (export-decl) got absorbed.

Minimal reproducer (15 lines) — see tab.test.js "uppercase non-markup const does not vacuum subsequent sibling decls".

### Project-mapper refresh

Ran between the deep-dive and the fix to surface side-effect risk. Confirmed fix surface is narrow (one predicate) but identified 3 lockstep changes needed: `tab.test.js:649` encoded the bug as test policy; `self-host/ast.scrml:1719` carries the same heuristic; module-resolver/bpp/pa rely on `^{}` destructuring imports which depend on a separate masked bug.

### **Commit `b189051`** — `fix(ast-builder): component-def requires markup RHS, not just uppercase name`

Four coupled changes in one commit:
1. **ast-builder.js:3634** — require `expr.trimStart().startsWith("<")` in addition to uppercase-initial name.
2. **self-host/ast.scrml:1719** — parity fix.
3. **type-system.ts meta-case** — (a) remove the fresh scope push so `^{}` import bindings escape into the enclosing frame, and (b) extract destructuring patterns (`{ a, b } = ...`) directly from bare-expr text and bind the names, since the AST builder fragments them into three sibling nodes with no single decl carrying the name. Handles `{ name }` and `{ orig: alias }`. Surgical — a proper fix belongs in the AST builder.
4. **LOGIC_SCOPE_GLOBAL_ALLOWLIST** — add `URL`, `URLSearchParams`, `Buffer`, `process`.

**Tests:** flipped `tab.test.js:649` (was asserting `const MyComponent = 42` produces component-def — encoded the bug as policy). Added 3 positive tests.

Suite 7183 → 7186 pass / 2 fail (pre-existing Bootstrap L3 + tab.js-path unchanged). Self-host `PASS module-resolver` confirms the exposed latent bug is resolved end-to-end. pa.scrml error count changed from 38 → 31 (mask is gone; errors are now real).

---

## 3. Adjacent bugs surfaced during the dive — NOT FIXED, queued for future arcs

These three bugs all fall out of the same "exported decls have their body stored as raw text" pattern and are visible once the component-def mask is gone. Fixing them requires AST-builder work (not just scope-chain patches).

### (a) `export class X { ... }` — class name never extracted

The ast-builder produces an `export-decl` with `raw: "export class X {...}"`, `exportedName: null`, `exportKind: null`. The class name isn't parsed out. Consequence: `X` is never bound in any scope, so `new X(...)` anywhere else in the module is E-SCOPE-001.

Workaround in S28: every self-host module that exports classes (module-resolver's `ModuleError`, pa.scrml's `PAError`, etc.) was masked by the phantom-component vacuum. With the vacuum gone, these will now surface. module-resolver PASSES only because callers use the workaround of not re-referencing the class inside later scope-checked function bodies.

**Fix surface estimate:** parse the `raw` text when `exportKind` isn't extracted, or more robustly teach the AST-builder to recognize `export class Name` and emit a bound class-decl + export-decl pair. Tests would need updating.

### (b) `export function X(...)` — body stored as raw string; scope-check never walks it

`export-decl` stores the full function text (params, body) as a single `raw` field. No `function-decl` child is produced, no `params` array, no parsed `body`. Codegen clearly reads `raw` and produces working JS (bpp proves this). But the scope-check pass at type-system.ts only walks `function-decl` bodies, so exported function bodies are invisible to E-SCOPE-001 / E-ERROR-001 / lin checks.

**Why this hides bugs:** every self-host module's public API (runPA, splitBlocks, tokenizeBlock, buildAST, etc.) is `export function` — so the exported entry points are scope-unchecked. Any `null`/`undefined`/bad-operator/undeclared-ident in those bodies slips through.

**Fix surface estimate:** teach the AST-builder to produce a `function-decl` child for export-decl function exports (or mirror structure so scope-check descends). Likely touches many files. Could cascade into a flurry of genuine error reports across the self-host modules.

### (c) Destructuring `const { a, b } = ...` fragmented in ALL contexts, not just meta

Only worked around for meta blocks in commit `b189051` (via regex extraction from bare-expr text). The same fragmentation happens in regular logic — the AST builder produces:
- `const-decl` with `name: ""`
- `bare-expr` with `expr: "{ a, b } = ..."` and an `escape-hatch` exprNode marked `ParseError`
- An orphan trailing node (import-decl / etc.)

No names bind. Anyone writing `const { x, y } = obj` in user code gets `x` and `y` silently unbound.

**Fix surface estimate:** AST-builder pattern parser. Extract all identifiers from the pattern, emit either multiple const-decls or a single pattern-decl with a names array. Scope binder loops over names. Medium-sized change but localized.

---

## 4. Current queue for S30+

### Unblocked (next session can pick directly)

1. **`^{}` destructuring — proper AST fix** (bug c above). Medium, localized to ast-builder.js. Should precede any more self-host translation so we're not working around it per-site.

2. **Export-decl name extraction** (bugs a + b). Larger; will cascade. Recommend scoping first: draft the ast-builder change, run self-host build, inventory the new errors.

3. **P3 continued** — now that the mask is gone, the 5 still-failing self-host modules (ast, pa, ri, ts, dg) have more accurate error counts. Pre-S29: 47 / 38 / 20 / 116 / 20. Post-S29: 59 / 31 / 12 / 120 / 20. Net change is small (more scope-check coverage, same real-issue surface). pa.scrml is the smallest remaining; might be do-able once (c) lands.

### Still carried from S28

4. P5 ExprNode Phase 4d/5 (delete legacy string fields)
5. Lift Approach C Phase 2
6. §51.13 phase 8 — guarded projection runtime parity
7. `< machine for=Struct>` cross-field invariants
8. Async loading stdlib helpers
9. DQ-12 Phase B
10. Approach C lin (long-deferred)

---

## 5. Non-compliance from map refresh

- `master-list.md` header is 5 sessions stale (S23 / 6,889 pass). Entries missing for gauntlet-s24/s25/s26/s27/s28 test dirs, S28 elision, S27 replay, extract-user-fns helper, SCRML_NO_ELIDE env var.
- `compiler/SPEC.md.pre-request-patch` — 12,414-line pre-amendment backup from 2026-04-11 sitting next to the authoritative 20,071-line SPEC.md. Grep-trap. Recommend deref to `../scrml-support/archive/spec-drafts/` or delete.
- Uncertain: `docs/SEO-LAUNCH.md` uncommitted 5 sessions running; `benchmarks/fullstack-react/CLAUDE.md` agent-tooling in framework-comparison dir.
