# stdlib Phase 1.5 — null/undefined → not sweep — progress

## 2026-05-13 — start

Inventoried 173 raw matches across stdlib. Per S89 Wave 3.7 audit + S81 user-voice
directive: `null`/`undefined` literals in free-floating expression positions are
drift; mechanical conversion applies. SPEC §6.4 `default=null` ATTRIBUTE pattern
is canonical and NOT swept.

Canonical patterns (per `is some`/`is not` already in trucking-dispatch pages):
- `x == null` / `x == undefined` → `x is not`
- `x != null` / `x != undefined` → `x is some`
- `return null` → `return not`
- `let x = null` → `let x = not`
- bare `null` / `undefined` literal expression → `not`
- bare `null` / `undefined` in arg position → `not` where it is a value, but
  flag any cases where the existing `assertNull`/`assertFalsy` tests rely on
  literal `null` shape for self-test (these may need re-frame, NOT mechanical).

NOT swept:
- SQL DDL `not null` / `default null` inside `<schema>` (legitimate per §39)
- `default=null` / `value=null` attribute on markup elements (SPEC §6.4 canonical)
- JSDoc prose comments mentioning "null" (literary use; not source surface)
- `string | null` / `T | null` TS-style type annotations describing JS-host
  return shape in `@returns` JSDoc — descriptive, not normative scrml syntax
- `stdlib/compiler/meta-checker.scrml` string-literal `"null"` / `"undefined"`
  inside arrays of reserved-keyword names being matched against source text
  (these are compiler internals identifying drift in user code, NOT drift themselves)
- regex-result-loop `while ((m = re.exec(x)) != null) { ... }` — see audit
  decision below.

## Pass 1 — per-module audit and conversion

Plan: walk modules alphabetically. For each, classify hits. Commit per module
that touches actual source.

## 2026-05-13 — completed

All 11 modules with drift converted. 11 per-module commits landed.
0 test regressions (11170 pass / 88 skip / 1 todo / 0 fail baseline preserved).

### Commits (in order)
- effc24e auth/jwt.scrml — 10 sites
- 20997a8 compiler/meta-checker.scrml + module-resolver.scrml — 13 sites
- 90f2f65 cron + crypto — 2 sites
- 6a313c8 data/{messages,transform,validate}.scrml — 11 sites
- eb5fbf8 format + fs + http — 19 sites
- b9b61c2 oauth/{index,google,github,microsoft}.scrml — 22 sites
- 381a6eb path + process — 14 sites
- b60282f redis + regex + router — 17 sites
- 93bacae store/kv.scrml — 11 sites
- 0170eab test/index.scrml — 7 sites
- 8db6233 time/index.scrml — 22 sites

### AMBIGUOUS / NOT swept (3 sites)
- stdlib/host/index.scrml:48,81 — JSDoc prose listing JS-host throwable types
  including "null, undefined". Describing the JS-host runtime layer of safeCall,
  not promoting null/undefined in scrml. Updating would lose the semantic
  precision about what JS source can throw. Left intact.
- stdlib/compiler/meta-checker.scrml:95,96 — string literals "undefined" /
  "null" inside GLOBAL_BUILTINS array — these IDENTIFY reserved-keyword names
  in user scrml source so the compiler can recognize and (per pipeline) reject
  them. Internal fingerprint data, not drift.
- stdlib/compiler/meta-checker.scrml:624 — string literal "null" in
  ["number", "string", "boolean", "bool", "null", "asIs"] primitive-type-name
  list. Identifies the scrml-source-level type keyword `null` for the compiler's
  type-registry seeding. Internal fingerprint data, not drift.

### SQL canonical NOT swept (per §39)
- stdlib/store/kv.scrml: 8 occurrences of SQL `NOT NULL` / `IS NULL` /
  `IS NOT NULL` inside DDL/query string literals (lines 16-18, 42-44, 84, 87, 93).

### SPEC §6.4 dependency
Zero occurrences of `default=null` or `value=null` attribute syntax in stdlib —
the SPEC §6.4 canonical pattern does not appear in stdlib sources. Not blocked
on SPEC amendment.

Total source sites scanned: 173 raw matches.
- DRIFT converted: 148 sites across 18 files (11 modules).
- CANONICAL skipped: 8 sites (SQL DDL inside string literals in store/kv.scrml).
- AMBIGUOUS not swept: 5 sites (host/index.scrml prose + meta-checker
  fingerprint string-literal entries).
