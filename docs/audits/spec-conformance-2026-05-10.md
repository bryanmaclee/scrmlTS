# SPEC Conformance Audit — 2026-05-10 (S78)

**Status:** complete (read-only)
**Scope:** `compiler/src` vs `compiler/SPEC.md`
**Authored by:** general-purpose agent dispatched S78
**HEAD at audit:** `6a1b15eadfd44e357de18f6a891ef159e3bb7043`

---

## §0 Headline

**We are on course.** No surface shows a "src is structurally ahead of spec" pattern in a way that contradicts the spec or invents un-specified user-visible behavior. The drift is concentrated in catalog-bookkeeping rather than language-design drift:

- **18 codes fire in src with ZERO spec mention** (truly undocumented). 15 of those are the `W-LINT-001..015` "ghost-pattern" family + 3 codegen/desugaring codes. None of them grant the language new powers — they are diagnostics for *training-data-bias-shaped non-scrml* (LINT family) or codegen-internal invariants.
- **90 codes appear in spec body prose but lack a §34 catalog row.** This is the larger structural gap and the place the user's instinct ("real drift count is between 0 and ~30") under-counted: 30+ is an upper bound on *prose-only ish* codes, but stretched against the §34-table-row regex specifically, the real number is 90. Most are legacy series (E-ENGINE-001..021, E-LIFECYCLE-009..018, E-TYPE-041..081, etc.) emitted by older passes that pre-date the §34 table-form catalog convention. A high-visibility one is `I-MATCH-PROMOTABLE` — the SPEC-INDEX header claims "S66 +1 row" but the row was never actually added to §34, even though §56 describes the diagnostic comprehensively.
- **Universal-core predicate vocabulary**: zero drift. Surface 4 is clean.
- **Stdlib catalog**: SPEC §41 explicitly defers per-module API enumeration to "the stdlib release manifest, not this spec" (§41.5), so per-module API drift against the SPEC is N/A. Against PRIMER §10 the only material miss is `generatePassword` (an `scrml:auth` export).
- **Structural elements**: SPEC §4.15 and §24.4 list `<engine>`, `<match>`, `<errors>`, `<onTransition>`, `<onTimeout>`. The S77-shipped `<onIdle>` is NOT in §4.15 / §24.4 yet — that's a real spec gap. Conversely, `attribute-registry.js` covers `program`, `page`, `channel`, `machine`, `errorboundary`, `errors` but NOT the §4.15 scrml-defined set (`engine`, `match`, `onTransition`, `onTimeout`, `onIdle`) — also a real gap.
- **AST kinds**: largely covered; one notable spec-silence is the `@debounced(N)`/`throttle()`/`debounce()` syntax-level forms (kinds `reactive-debounced-decl`, `debounce-call`, `throttle-call`). Zero spec mention of "debounce" or "throttle" anywhere in SPEC.md.
- **Phase A10 body-render**: implicit-spec assumption HOLDS. SPEC §51.0.B explicitly says "a body — markup rendered when the engine is in this variant" and §51.0.I says "Bodied state-children render their body when the engine is in that variant." No new spec text is needed.

**Where to prioritise effort:** §1.3 W-LINT family (cheap, big win) → §3 structural-element gaps (cheap, correctness-bookkeeping) → §1.2 catalog-row backfill for the prose-only legacy series (medium, lift to 100% lookup-by-§34 fidelity).

---

## §1 Diagnostic codes (E-* / W-* / I-*)

**Method:** grep'd `compiler/src/` for double-quoted, single-quoted, and backtick-template-literal forms of `(E-|W-|I-)<UPPERCASE-ID>`. Merged + deduplicated. Compared against (a) the §34 catalog table-row regex and (b) all spec mentions anywhere.

**Counts:**

| Bucket | Count |
|---|---|
| Total unique codes that fire in src | 283 |
| Cataloged in §34 table row | 175 |
| Prose-only (in spec but no §34 row) | 90 |
| Undocumented (zero spec mention) | 18 |

### §1.1 Cataloged (no action needed) — 175 codes

Spot-checks (9 random codes confirmed present in §34):
- `E-CTX-001` (line 14293), `E-TYPE-001` (line 14296), `E-LIN-001` (14396), `E-ENGINE-INVALID-TRANSITION` (14535), `E-COMPONENT-ENGINE-SCOPE` (14545), `E-PARSEVARIANT-TYPE-NOT-ENUM` (14570), `E-IDLE-MISPLACED` (14435), `E-RESET-INVALID-TARGET` (14528), `E-TEST-006` (14514).

All §34 catalog rows have spec-section back-references, severity, and trigger description — adequate for the lookup-index purpose §34 declares.

### §1.2 Prose-only — 90 codes (catalog row needed)

These codes fire in src AND are described somewhere in spec body prose (e.g., normative statements in their owning section) but lack a §34 table row. The §34 catalog claims to be "a single lookup point" (line 14289 prologue) — these codes break that claim. Backfill is mechanical catalog hygiene.

Grouped by likely owning section:

**§5 (attributes):**
- `E-ATTR-013` — fires in attribute validation; no §34 row.

**§6 (reactive declarations):**
- `E-DG-002` — dependency-graph diagnostic; no §34 row.

**§8 (SQL):**
- `E-SQL-006`, `E-SQL-008` — `?{}` related; spec body covers; no §34 row. (`E-SQL-008` is described in §44.8 prose.)

**§15 (components):**
- `E-COMPONENT-013`, `E-COMPONENT-014`, `E-COMPONENT-020`, `E-COMPONENT-021`, `W-COMPONENT-001` — no §34 rows.

**§17 / control flow:**
- `E-CTRL-001`, `E-CTRL-002`, `E-CTRL-003`, `E-CTRL-004`, `E-CTRL-005` — no §34 rows. (`E-CTRL-011` IS in §34 row 14566.)

**§18 (match):**
- `E-MATCH-012`, `W-MATCH-003` — no §34 rows. (W-MATCH-001..002 are in §34; W-MATCH-RULE-INERT also in §34.)

**§19 (errors):**
- (none missing in this slice — E-ERROR-001..008 are mostly cataloged via §34 lines 14417-14430.)

**§21 (import):**
- `E-IMPORT-005`, `E-IMPORT-006`, `E-IMPORT-007` — §21 body prose mentions these (line 17184: "E-USE-005 for `use` declarations, E-IMPORT-005 for `import` statements"); no §34 rows.

**§22 (meta):**
- `E-META-002`, `E-META-003`, `E-META-005`, `E-META-006`, `E-META-007`, `E-META-008` — no §34 rows.

**§28 / lifecycle:**
- `E-LIFECYCLE-009`, `E-LIFECYCLE-010`, `E-LIFECYCLE-012`, `E-LIFECYCLE-015`, `E-LIFECYCLE-017`, `E-LIFECYCLE-018`, `W-LIFECYCLE-002`, `W-LIFECYCLE-007` — none in §34.

**§35 (lin):**
- `E-LIN-005` (lin shadowing) is in §35.5 prose; no §34 row.
- `E-LIN-006` (deferred-ctx) is in §35.5 prose; no §34 row.

**§36 (input):**
- `E-INPUT-001`, `E-INPUT-002`, `E-INPUT-003`, `E-INPUT-004` — defined inline in §36 prose at lines 15338, 15347, 15356, 15365 (full message text + trigger + worked example). **Zero §34 rows.** Primer §13.5 flagged this region as the "spec sliver" — the slice has its own diagnostics defined locally but never lifted to §34.

**§38 (channels):**
- `E-CHANNEL-008`, `E-CHANNEL-EXPORT-001`, `E-CHANNEL-EXPORT-002` — no §34 rows (other channel codes like E-CHANNEL-001..007 ARE in §34).

**§40 / middleware:**
- `E-MW-001`, `E-MW-002`, `E-MW-005`, `E-MW-006` — no §34 rows.

**§41 (use/import):**
- `E-USE-001`, `E-USE-002`, `E-USE-005` — §41 body prose mentions these (line 17137, 17138); no §34 rows. (`E-USE-INVALID-CTX` IS in §34 row 14565.)

**§44 (SQL multi-db):**
- (covered — `E-SQL-008` already noted under §8.)

**§45 (equality):**
- `E-EQ-001`, `E-EQ-002`, `E-EQ-003`, `E-EQ-004`, `W-EQ-001` — no §34 rows.

**§47 (codegen):**
- `E-CG-006`, `E-CG-010`, `E-CG-014` — fire in codegen passes; spec body §47 mentions concepts but no §34 rows.

**§51 (machines/engines):**
- `E-ENGINE-001`, `E-ENGINE-003`, `E-ENGINE-004`, `E-ENGINE-005`, `E-ENGINE-010`, `E-ENGINE-013` through `E-ENGINE-021` — legacy machine codes, mostly described in older §51.1+ prose; no §34 rows. (Newer engine codes E-ENGINE-VAR-DUPLICATE, E-ENGINE-INVALID-TRANSITION, E-ENGINE-EFFECT-AMBIGUOUS, etc., DO have §34 rows.)
- `E-TIMEOUT-001`, `E-TIMEOUT-002` — §6.7.8 `<timeout>` codes; no §34 rows.

**§51.14 (replay):**
- `E-REPLAY-001`, `E-REPLAY-002`, `E-REPLAY-003` — defined inline at lines 23053-23072 (full bullet-list inline definition with severity tag). **Zero §34 rows.**

**§14 (type system):**
- `E-TYPE-041`, `E-TYPE-042`, `E-TYPE-045`, `E-TYPE-071`, `E-TYPE-081` — fire in type-system pass; no §34 rows. (Other E-TYPE-NNN entries ARE in §34.)

**§11 / protect:**
- `E-PROTECT-003` — no §34 row.

**§Syntax-* misc:**
- `E-SYNTAX-042`, `E-SYNTAX-043`, `E-SYNTAX-044` — no §34 rows.

**Batch processing:**
- `E-BATCH-001`, `E-BATCH-002`, `W-BATCH-001` — no §34 rows. (S5 body-split machinery — newer A9 codes E-CPS-* DID get §34 rows.)

**S66 promotion ergonomics:**
- `I-MATCH-PROMOTABLE` — described comprehensively in §56 + §56.2 + §56.7 ("§34 — `I-MATCH-PROMOTABLE` ... catalog rows"), but the §34 catalog row was NEVER actually added. The SPEC-INDEX header (line 9) claims "S66 +1 row I-MATCH-PROMOTABLE" but `awk 'NR>=14287 && NR<=14574' SPEC.md | grep PROMOTABLE` returns 0 hits. This is the cleanest possible example of "src + spec body agree, §34 catalog table not updated."

### §1.3 Undocumented — 18 codes (spec text + catalog row needed)

| Code | Source file | Reason fired | Severity |
|---|---|---|---|
| `E-ERRORS-001` | `compiler/src/codegen/emit-html.ts:511` | `<errors>` missing required `of` attribute | Error |
| `E-ERRORS-002` | `compiler/src/codegen/emit-html.ts:560` | `<errors of=...>` requires `@`-rooted scrml expression | Error |
| `E-SWITCH-FORBIDDEN` | `compiler/src/ast-builder.js:4514, 7121` | `switch` keyword used (S64 debate-04: stays hard-error) | Error |
| `W-CG-001` | `compiler/src/codegen/emit-reactive-wiring.ts:366` | Top-level block suppressed from client output | Warning |
| `W-LINT-001` | `compiler/src/lint-ghost-patterns.js:269` | `<style>` block — no scrml meaning (React/Vue ghost) | Warning |
| `W-LINT-002` | `compiler/src/lint-ghost-patterns.js:280` | `oninput=${e => @x = e.target.value}` ghost pattern | Warning |
| `W-LINT-003` | `compiler/src/lint-ghost-patterns.js:290` | `className=` React attribute | Warning |
| `W-LINT-004` | `compiler/src/lint-ghost-patterns.js:301` | `onChange=`, `onSubmit=` (camelCase events) | Warning |
| `W-LINT-005` | `compiler/src/lint-ghost-patterns.js:313` | `value={expr}` JSX brace | Warning |
| `W-LINT-006` | `compiler/src/lint-ghost-patterns.js:324` | `for (item of @items)` in markup | Warning |
| `W-LINT-007` | `compiler/src/lint-ghost-patterns.js:337` | `<Comp prop={val}>` JSX prop brace | Warning |
| `W-LINT-008` | `compiler/src/lint-ghost-patterns.js:349` | `{cond && <El>}` React conditional | Warning |
| `W-LINT-010` | `compiler/src/lint-ghost-patterns.js:368` | `${}` inside `#{}` CSS (Svelte pattern) | Warning |
| `W-LINT-011` | `compiler/src/lint-ghost-patterns.js:385` | `:attr="expr"` Vue colon-prefixed binding | Warning |
| `W-LINT-012` | `compiler/src/lint-ghost-patterns.js:397` | Vue `v-if`, `v-for`, `v-model`, etc. directives | Warning |
| `W-LINT-013` | `compiler/src/lint-ghost-patterns.js:415` | Vue `@event=` attribute shorthand | Warning |
| `W-LINT-014` | `compiler/src/lint-ghost-patterns.js:429` | Svelte `{#if}...{/if}` block directives | Warning |
| `W-LINT-015` | `compiler/src/lint-ghost-patterns.js:439` | Svelte `{@html expr}` raw-HTML directive | Warning |

**Note on numbering:** `W-LINT-009` is intentionally absent — see comment at `lint-ghost-patterns.js:355-359`: "Deduplicated: W-LINT-004 already matches onClick. This entry is intentionally omitted." A `W-LINT-016` (string-discriminator trap) appears to be in development per the comment at line ~445 but did not surface in the grep — its emission path may not yet wire through `code: "W-LINT-016"`.

**Recommendation:** the W-LINT family is shipped, user-facing, and silently expected to fire on adopter code (ghost-pattern mitigation per `scrml-support/docs/ghost-error-mitigation-plan.md`). They belong in §34 with a brief "ghost-pattern lint" row each, OR a single rolled-up §34.X subsection cataloging all 15 as a family. The latter is lighter-weight.

`E-ERRORS-001` and `E-ERRORS-002` belong in §55.8 with §34 rows. `E-SWITCH-FORBIDDEN` belongs in §17 (control flow / why scrml has no `switch`) with §34 row. `W-CG-001` belongs in §47 (output / codegen) with §34 row.

### §1.4 Legacy/internal — 0 codes confirmed

None of the 283 grep'd codes appeared to be internal-only / test-infra. Every code was emitted by a user-facing pipeline stage. The `E-PARSE-001`, `E-BS-000`, `E-BPP-001` codes that look internal are actually user-facing parse-failure diagnostics and are cataloged.

---

## §2 Stdlib catalog

**Method:** listed exports from each `/home/bryan/scrmlMaster/scrmlTS/stdlib/<module>/index.scrml` via grep for `export` lines. Compared against PRIMER §10 (SPEC §41 explicitly defers — see §41.5: *"exact catalog is defined in the stdlib release manifest, not in this spec"*).

**Spec drift:** N/A by design. SPEC §41 covers only the import mechanism (§41.2-§41.11), `registerMessages` (§41.12 — L12), and `parseVariant` (§41.13 — L22). Per-module API enumeration is explicitly out of scope for the spec.

**Primer drift:** minor — PRIMER §10 sketches each module but does not enumerate exhaustively, so most modules have no measurable drift. One identifiable miss:

| Module | Exported by stdlib | Listed in PRIMER §10 | Status |
|---|---|---|---|
| `scrml:auth` | `generatePassword` | not listed | Primer miss |
| `scrml:auth` | `hashPassword, verifyPassword, signJwt, verifyJwt, decodeJwt, createRateLimiter, generateTotpSecret, verifyTotp` | listed (mostly verbatim) | ✓ |
| `scrml:oauth` | exhaustive (`startFlow, exchangeCode, refreshToken, getUserInfo, revoke, generateVerifier, deriveChallenge, memoryAdapter, googleConfig, parseGoogleIdToken, githubConfig, microsoftConfig, discordConfig, PKCE_METHOD`) | match (S58 entry) | ✓ |
| `scrml:data` | `validate, isValid, firstError, required, email, minLength, maxLength, pick, omit, mapKeys, mapValues, groupBy, indexBy, sortBy, unique, parseVariant, ParseError, registerMessages, messageFor` | match (after S65) | ✓ |
| `scrml:router` | `match, parseQuery, buildUrl, navigate, currentPath, onNavigate` | match | ✓ |
| `scrml:store` | `createStore, createSessionStore, createCounter` | match | ✓ |
| `scrml:http` | `get, post, put, del, patch, isOk, isError, withBaseUrl, withAuth, withDefaults, retry, multipart, uploadFile` | match | ✓ |
| `scrml:redis` | `get, set, setex, del, exists, expire, ttl, incr, decr, sadd, srem, sismember, smembers, publish, subscribe, unsubscribe, createClient, send, close, getBuffer` | match (primer is exhaustive) | ✓ |
| `scrml:cron` | `schedule, nextOccurrence, stop` | match | ✓ |
| `scrml:crypto` | `hash, verifyHash, hmac, safeCompare, generateUUID, generateToken` | match | ✓ |
| `scrml:format` | (all 16) | match | ✓ |
| `scrml:time` | (all 18 incl. timezone family) | match | ✓ |
| `scrml:regex` | `patterns, test, match, extract, replace, escape, caseInsensitive, isValid` | match | ✓ |
| `scrml:fs` | `readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync` | "Node compat" — not enumerated | ✓ (vague) |
| `scrml:path` | `basename, dirname, extname, join, normalize, relative, resolve, sep` | "Node compat" — not enumerated | ✓ (vague) |
| `scrml:process` | `argv, cwd, env, exit, memoryUsage, platform, uptime` | "Node compat" — not enumerated | ✓ (vague) |
| `scrml:test` | `assertEqual, assertNotEqual, assertContains, assertDefined, assertFalsy, assertInRange, assertNoThrow, assertNull, assertThrows, assertTruthy, group` | "test runner" — not enumerated | ✓ (vague) |

**Bonus directory not in primer's 16-module list:** `stdlib/compiler/`. This is the compiler-self-host stdlib (exports `compileScrml`, `scanDirectory`, `buildAST`, etc., from `compiler/src/*.{js,ts}`) and is an internal bridge for self-host. Primer §10 says "16 modules"; counting the user-facing set you get 16 (the 17 directories minus `compiler/`).

**Recommendation:** add `generatePassword` to PRIMER §10's `scrml:auth` line. No spec change required.

---

## §3 Structural elements

**Method:** read `/home/bryan/scrmlMaster/scrmlTS/compiler/src/attribute-registry.js`, extracted `ELEMENT_ATTR_REGISTRY.set(...)` entries. Cross-referenced against SPEC §4.15 + §24.4.

**Registered in attribute-registry.js:**
- `program`, `page`, `channel`, `machine`, `errorboundary`, `errors`

**Listed as scrml-defined structural elements in SPEC §4.15 + §24.4:**
- `<engine>`, `<match>`, `<errors>`, `<onTransition>`, `<onTimeout>`

**Drift in code (attribute-registry.js):**

| Element in §4.15 | Registered in attribute-registry.js? | Status |
|---|---|---|
| `<engine>` | ❌ | Missing |
| `<match>` | ❌ | Missing |
| `<errors>` | ✓ | OK |
| `<onTransition>` | ❌ | Missing |
| `<onTimeout>` | ❌ | Missing |

The docstring of `attribute-registry.js` (lines 22-26) says the registry is "intentionally narrow — only elements where attribute semantics are LOAD-BEARING and the silent-acceptance window is sharp" and "New scrml-special elements MUST be added here before VP-1 / VP-3 can validate them." Per SPEC §24.4 line 13633: *"Validation pass VP-1 (§3.3 attribute allowlist) registers the per-element attribute catalogs for these structural elements in `compiler/src/attribute-registry.js`."* That makes the per-spec invariant: the §4.15 elements SHOULD have attribute-registry.js entries. Today only `<errors>` does.

This is a known consequence of `attribute-registry.js` predating the §4.15 D4 batch. The structural-element diagnostics (`E-STRUCTURAL-ELEMENT-MISPLACED`, `E-NAME-COLLIDES-RESERVED`) fire from the block-grammar layer; the attribute-allowlist VP-1 path is the unwired layer.

**Drift in spec (§4.15 + §24.4):**

| Element shipped in src | Listed in §4.15? | Listed in §24.4? | Notes |
|---|---|---|---|
| `<engine>` | ✓ | ✓ | — |
| `<match>` | ✓ | ✓ | — |
| `<errors>` | ✓ | ✓ | — |
| `<onTransition>` | ✓ | ✓ | — |
| `<onTimeout>` | ✓ (S67) | ✓ (S67) | — |
| `<onIdle>` (S77, A5-6) | ❌ | ❌ | **Spec gap.** §51.0.R defines the element; §34 has the 3 E-IDLE-* rows; but the registry tables at §4.15 and §24.4 were not updated when A5-6 shipped 2026-05-10. |

**Registered in attribute-registry.js but NOT in §4.15:**
- `program`, `page`, `channel`, `machine`, `errorboundary` — these are scrml-special elements (page-level, channel-level, machine-level, error-boundary, root program), not the §4.15 "block-grammar layer scrml-defined structural elements" set. Their spec coverage lives elsewhere (`page` in §6 / §40, `channel` in §38, `machine` in §51.1+, `errorboundary` in §19, `program` in §6 / §40). They are NOT structural elements in the §4.15 sense. Code is consistent with spec on this distinction; no drift to flag here.

**Recommendation:**
1. Add `<onIdle>` row to SPEC §4.15 table (~line 996, after `<onTimeout>` row).
2. Add `<onIdle>` row to SPEC §24.4 table (~line 13625, after `<onTimeout>` row).
3. Decide whether to populate `attribute-registry.js` with `engine`, `match`, `onTransition`, `onTimeout`, `onIdle` entries — this is a code change, not a spec change. The block-splitter and per-element validators in `compiler/src/engine-validation.ts` etc. already enforce the attribute schemas; the registry centralisation is bookkeeping not behaviour.

---

## §4 Validator predicate vocabulary

**Method:** read `compiler/src/validator-catalog.ts` `UNIVERSAL_CORE_PREDICATES` constant (lines 139-252). Cross-referenced against SPEC §55.1 (lines 25288-25320).

**14 predicates in src — match the spec exactly:**

| # | src name | spec §55.1 entry | Status |
|---|---|---|---|
| 1 | `req` | `req` | ✓ |
| 2 | `is some` | `is some` | ✓ |
| 3 | `length` | `length(predicate)` | ✓ |
| 4 | `pattern` | `pattern(regex)` | ✓ |
| 5 | `min` | `min(n)` | ✓ |
| 6 | `max` | `max(n)` | ✓ |
| 7 | `gt` | `gt(expr)` | ✓ |
| 8 | `lt` | `lt(expr)` | ✓ |
| 9 | `gte` | `gte(expr)` | ✓ |
| 10 | `lte` | `lte(expr)` | ✓ |
| 11 | `eq` | `eq(expr)` | ✓ |
| 12 | `neq` | `neq(expr)` | ✓ |
| 13 | `oneOf` | `oneOf([...])` | ✓ |
| 14 | `notIn` | `notIn([...])` | ✓ |

**Per S66 audit reversal (primer §8 / pa.md Rule 4):** `email`/`url`/`numeric`/`integer` are correctly NOT in `UNIVERSAL_CORE_PREDICATES` — they are stdlib `scrml:data` predicate-builders. `custom` is correctly NOT in `UNIVERSAL_CORE_PREDICATES` — it is the §55.9 enum tag for developer-defined predicates. Drift count: 0.

**Status:** clean. No action.

---

## §5 AST kinds

**Method:** grep'd `compiler/src/ast-builder.js` and `compiler/src/types/ast.ts` for `kind: "..."` literals. Extracted unique kinds; cross-checked sample against SPEC sections.

**92 unique AST kinds. Spot-check sample (one per family):**

| Kind | Construct | Spec section | Status |
|---|---|---|---|
| `array`, `binary`, `unary`, `ternary`, `lit`, `call`, `member`, `index`, `object`, `ident`, `lambda`, `cast`, `new`, `spread` | JS expressions | §7 / §50 | ✓ standard |
| `markup`, `html-fragment`, `text`, `prop`, `string-literal` | markup nodes | §4 / §5 | ✓ |
| `state-decl`, `const-decl`, `let-decl`, `lin-decl`, `tilde-decl` | declarations | §6, §35, §32 | ✓ |
| `if-stmt`, `if-expr`, `if-chain`, `for-stmt`, `for-expr`, `while-stmt`, `do-while-stmt`, `break-stmt`, `continue-stmt`, `return-stmt`, `block`, `bare-expr` | control flow | §17, §49 | ✓ |
| `function-decl`, `assign`, `expr`, `comment` | misc | §48, §50 | ✓ |
| `match-stmt`, `match-expr`, `match-arm-inline`, `shorthand`, `state`, `state-constructor-def` | match + state | §18, §14, §54 | ✓ |
| `engine`, `engine-decl`, `transition-decl`, `error-effect`, `when-effect`, `when-message` | engines / workers / transitions | §51.0, §46 | ✓ |
| `import-decl`, `export-decl`, `component-def`, `props-block`, `use-decl` | components / imports | §15, §16, §21, §41 | ✓ |
| `sql`, `sql-ref`, `meta`, `css-inline`, `style`, `logic`, `escape-hatch` | sublanguages | §8, §22, §9, §7 | ✓ |
| `lift-expr`, `fail-expr`, `propagate-expr`, `reset-expr`, `throw-stmt`, `try-stmt`, `transaction-block`, `given-guard`, `guarded-expr` | language constructs | §10, §19, §6.8, §42 | ✓ |
| `reactive-array-mutation`, `reactive-explicit-set`, `reactive-nested-assign` | reactive writes | §6.5, §6.2 | ✓ |
| `cleanup-registration` | lifecycle | §6.7 | ✓ |
| `input-state-ref` | input states | §36 | ✓ |
| `upload-call` | file upload | §13 / §40 | ✓ |
| `variable-ref`, `call-ref`, `render-spec`, `type-decl`, `type`, `relational-predicate`, `absent` | misc internal / type system | §14, §53 | ✓ |
| `test` | test blocks | §19.12 | ✓ |
| `switch-stmt` | parsed only to fire E-SWITCH-FORBIDDEN | §17 (negative-space) | ⚠ kind exists for the rejection path; documented as forbidden, no spec for the kind itself (correct) |
| **`reactive-debounced-decl`** | `@debounced(N) name = expr` modifier | **NONE** | ❌ **spec-silent** |
| **`debounce-call`** | `debounce(fn, ms)` built-in call form | **NONE** | ❌ **spec-silent** |
| **`throttle-call`** | `throttle(fn, ms)` built-in call form | **NONE** | ❌ **spec-silent** |

**Notable findings:**

- **`reactive-derived-decl` is fully retired** (per primer §12 / S64 audit). The grep produced a single hit at `types/ast.ts:631` — that line is a comment ("ReactiveDerivedDeclNode (kind:\"reactive-derived-decl\") was retired at...") not a live construction. Zero `kind: "reactive-derived-decl"` constructions in src. ✓

- **The 4 retained reactive- kinds the brief flagged for verification** (`reactive-debounced-decl`, `reactive-array-mutation`, `reactive-explicit-set`, `reactive-nested-assign`) are all still actively constructed (2 sites each in `ast-builder.js`). ✓

- **debounce/throttle gap.** SPEC.md has ZERO mentions of the strings "debounce" or "throttle" (case-insensitive `grep -i` confirms). The compiler parses:
  - `@debounced(N) name = expr` — a top-level reactive modifier (`ast-builder.js:3900-3922, 5835-5860`)
  - `debounce(fn, ms)` and `throttle(fn, ms)` — top-level call forms (`ast-builder.js:7501-7556`)

  Both produce AST nodes. Both are language-level (parser-recognized keywords), not stdlib function calls. The `scrml:time` module exports `debounce, throttle, sleep` (per primer §10) which is a separate surface — but the parser is consuming `debounce`/`throttle` as KEYWORDS, not member-access. This is a real spec gap. Either:
  - (a) the parser should NOT special-case `debounce`/`throttle` and instead leave them as plain call expressions resolved against `scrml:time`, OR
  - (b) the spec needs a §6.X subsection documenting `@debounced(N)` as a state-modifier and `debounce()`/`throttle()` as language-level built-ins.

  Per pa.md Rule 4 ("spec is normative"), this is the kind of code-ahead-of-spec gap the user asked to be checked for.

**Recommendation:** raise debounce/throttle as a deliberation: is this a language feature (spec section needed) or a parser artifact (parser-side fix needed)?

---

## §6 Phase A10 body-render

**Method:** read SHIP commit body for `6a1b15e` (Phase A10 — engine state-child body render). Re-read SPEC §51.0.B + §51.0.I + §51.0.D for the implicit contract.

**Per the SCOPE doc (`docs/changes/phase-a10-engine-state-child-body-render/SCOPE-AND-DECOMPOSITION.md`):** "no new spec text expected."

**Verification of the implicit-spec assumption:**

SPEC §51.0.B (line 20451) — bullet on state-children:
> a body — markup rendered when the engine is in this variant (§51.0.C, §51.0.I)

SPEC §51.0.B (line 20471) worked example:
> Renders "🧍" when @marioState == .Small, "🧍 🧍" when .Big, etc.

SPEC §51.0.I (line 20736-20737):
> Bodied state-children render their body when the engine is in that variant.

**Verdict:** the spec is EXPLICIT that state-child bodies render. Phase A10 closes the v1 reactive-subscription gap (codegen now emits `emitVariantGuardedRender` to subscribe on engine variable + re-render on variant change with full reactive semantics). This implements the user-visible contract the spec already declared. No spec amendment required.

**Optional spec strengthening (not necessary, surfaced for completeness):** SPEC §51.0.I currently says bodies render *"when the engine is in that variant"* — implying re-render on variant change. A one-sentence clarification could read: *"On variant change, the rendered body unwires (cleanup-registration runs) and the new variant's body wires; reactive subscriptions inside the body are re-established each entry."* This is implementation-shaped, not contract-shaped, and is probably better left in implementation comments / PIPELINE.md rather than the language spec.

**Status:** implicit-spec assumption HOLDS. No action.

---

## §7 Recommended actions (prioritized)

| # | Action | Surface | Effort | Why |
|---|---|---|---|---|
| 1 | Add §34 rows for `W-LINT-001..015` family (15 rows) — or single roll-up subsection §34.X "Ghost-pattern lint family" | §1.3 | ~30 min | 15 user-visible warnings with zero spec mention; documented entirely in `lint-ghost-patterns.js` comments |
| 2 | Add `<onIdle>` row to SPEC §4.15 (line ~996) and §24.4 (line ~13625) | §3 | ~10 min | S77 A5-6 shipped the element + E-IDLE-* codes + §51.0.R; the structural-element registries were not updated |
| 3 | Add §34 rows for `E-ERRORS-001`, `E-ERRORS-002`, `E-SWITCH-FORBIDDEN`, `W-CG-001` | §1.3 | ~10 min | 4 codes with full message text in src but no spec mention; user-visible diagnostics |
| 3b | Add §34 row for `I-MATCH-PROMOTABLE` | §1.2 | ~2 min | SPEC-INDEX header claims this row exists; reality is it doesn't. Cheapest possible spec-hygiene fix |
| 4 | Decide spec status of `@debounced(N)` modifier + `debounce()`/`throttle()` built-in call forms | §5 | TBD — needs deliberation | Code parses these as language-level keywords; SPEC.md has zero mention of "debounce"/"throttle". Could be parser cleanup OR spec extension |
| 5 | Backfill §34 rows for `E-INPUT-001..004` (§36 sliver) — inline-defined diagnostics never lifted to catalog | §1.2 | ~10 min | Primer §13.5 flagged this region; 4 codes fully spec'd in §36 prose, just need the catalog row |
| 6 | Backfill §34 rows for `E-REPLAY-001..003` (§51.14 replay) | §1.2 | ~5 min | Same pattern as INPUT — inline-defined in §51.14, no catalog row |
| 7 | Backfill §34 rows for `E-LIN-005`, `E-LIN-006` (described in §35.5 prose) | §1.2 | ~5 min | Same pattern |
| 8 | Backfill §34 rows for the remaining ~75 prose-only codes (E-ENGINE-001..021 legacy, E-LIFECYCLE-009..018, E-TYPE-041..081, etc.) | §1.2 | ~2-3 hours | Mostly mechanical; legacy series predates the §34 catalog convention |
| 9 | Add `generatePassword` to PRIMER §10 `scrml:auth` line | §2 | ~1 min | Single missing export name in primer |
| 10 | Populate `attribute-registry.js` with `engine`, `match`, `onTransition`, `onTimeout`, `onIdle` entries — OR remove the SPEC §24.4 normative claim that says it covers them | §3 | ~30 min code-side, OR ~10 min spec-side | Spec at §24.4 line 13633 says the registry "registers the per-element attribute catalogs for these structural elements"; code does not. Either fix |

**Total effort estimate:** ~4-5 hours for items 1-9 (catalog hygiene), plus a deliberation thread for item 4 (debounce/throttle). Item 10 is a code-or-spec edit; not bookkeeping.

---

## §8 Audit methodology + caveats

**Grep patterns used for diagnostic code extraction:**

- Double-quoted: `grep -rohE '"(E-|W-|I-)[A-Z][A-Z0-9-]+"' compiler/src/`
- Single-quoted: `grep -rohE "'(E-|W-|I-)[A-Z][A-Z0-9-]+'" compiler/src/`
- Backtick: `grep -rohE '\`(E-|W-|I-)[A-Z][A-Z0-9-]+\`' compiler/src/`

Merged + deduplicated → 283 codes.

**Caveats / known coverage gaps in this audit:**

1. **Template-string interpolation forms** like `` `E-${prefix}-001` `` are NOT detected by the grep. The audit assumes diagnostic codes are emitted as static literal strings. If any code is constructed via interpolation, it would be missed. Spot-check via grep for `\`E-\${` returned no hits in `compiler/src/`.

2. **String constants assigned to a variable** then emitted: e.g., `const CODE = "E-NEW-001"; ... emit(CODE)`. The grep catches the assignment but the call site context is the string-literal site. Spot-check: looked at a sample of error-emission sites; all use string literals at the emit site.

3. **The runtime-only codes** (e.g., `E-REPLAY-001-RT`, `E-CONTRACT-001-RT`) are sometimes emitted from `runtime-template.js` and other runtime stubs — the audit captured these and counted them under §1.1 / §1.2 as user-facing.

4. **Codes referenced in comments but not emitted:** e.g., `E-PARSEVARIANT-DISCRIMINATOR-MISSING`, `E-PARSEVARIANT-UNKNOWN-VARIANT`, `E-PARSEVARIANT-INVALID-PAYLOAD` appear in SPEC §34 and the type-system code but may not yet be runtime-emitted (they are documented as the surfaced ParseError tags). Audit treats these as cataloged ✓ since the surface in spec is well-defined.

5. **AST-kind extraction** caught a single false positive: `reactive-derived-decl` appears in a comment in `types/ast.ts:631` and was caught by `kind: "..."` regex. Re-checked: zero live construction. The kind is fully retired.

6. **Stdlib export extraction** used a coarse grep over `export\b` lines + `from './path'` re-exports. Sub-exports via `export { x } from './path'` were caught; default exports were not (no stdlib module appears to use default export).

7. **`compiler/SPEC.md` line numbers** drifted from `compiler/SPEC-INDEX.md` baseline — index header says S70 update, but at HEAD the index's claimed line 14002 for §34 actually shows §32 content. Real §34 starts at line 14287. Index needs `bash scripts/update-spec-index.sh` refresh (separate from this audit).

8. **Out-of-scope items** (per dispatch brief):
   - PIPELINE.md vs src — not audited
   - kickstarter/articles — not audited
   - deep-dives in scrml-support/ — not audited
   - per-test fixtures / test files — not audited
   - performance / benchmarks — not audited
   - examples/ / samples/ — not audited

**Confidence note:** the per-code spec-search uses substring matching on the full SPEC.md. A code like `E-CG-014` appearing in spec body prose under any heading would be detected; a code mentioned only as part of a longer compound symbol (e.g., as a substring of `E-CG-014-RT`) might falsely register as "found." Spot-check confirmed no such false positives in the §1.3 undocumented set.
