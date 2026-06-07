# D2c — `as (k, v)` positional destructure on `<each>` (§59.8 / §14.11, S169)

## Task
Add the OPTIONAL terse 2-name form `<each in=@m.entries() as (k, v)>` as sugar
over `as e` + `e.key`/`e.value`. The iterated value stays the `{ key, value }`
entry struct; `k ← .key`, `v ← .value` bind positionally. Entries-scoped (the
fixed `.key`/`.value` fields); general §14.11 N-field destructure on arbitrary
struct arrays is DEFERRED.

## Steps (append-only)
- Startup: pwd verified under worktrees/agent-; `git merge main` → Already
  up to date (D1-D4 already in base); bun install + pretest OK.
- Legacy parse (ast-builder.js ~L12112): added parenthesized tuple regex
  `\bas\s*\(id, id\)`, tried FIRST; falls back to single-name. Captured into
  `asNames: [k, v]`. Containment guard clips the over-read at the tuple-match
  position. Strip the `as (k, v)` tail from inExprRaw/ofExprRaw/keyExprRaw
  (the depth-aware capture over-reads through the balanced parens). COMMITTED.
- Codegen (emit-each.ts): `emitDestructureBindingLines` derives
  `const k = item.key; const v = item.value;` at create-time AND inside every
  live-keyed `_scrml_effect` re-resolve + per-item handler prelude (via
  EachReconcileCtx.destructure thread). `asNames` added to EachBlockAstNode.
- Scope (type-system.ts each-block case): bind both destructure names (asIs)
  so bare `${k}`/`${v}` body refs don't fire E-SCOPE-001. COMMITTED (with cg).
- Native parse (parse-file.js): new `readAsBinding` — native attr-tokenizer
  strips parens+comma, landing `as (k, v)` as 3 barewords `as k v`;
  disambiguated by inspecting the raw source gap between the `as` attr span-end
  and the first name (a `(` → destructure). `asNames` emitted. COMMITTED.
- Tests: unit (13) + browser (4). COMMITTED.

## R26 END-TO-END (happy-dom)
`as (k, v)` renders byte-identical to `as e`+e.key/e.value baseline:
`DAL: 4500HOU: 3200` over a 2-entry iteration. All 4 variants
(legacy/native × tuple/single) equivalent + non-empty.

## Scope decision
ENTRIES-SCOPED (`.key`/`.value` entry fields). The codegen derives exactly two
fixed fields; a general N-field positional destructure on arbitrary struct
arrays is OUT of scope (deferred, per brief).

## Deferred
- General §14.11 N-field positional destructure on arbitrary struct arrays.
- Native map literal `[k:v]` / `[string:number]` type-decl (D2b — concurrent;
  the native map-type parse gap is why native R26 used a {key,value} struct
  array instead of a real map literal).
