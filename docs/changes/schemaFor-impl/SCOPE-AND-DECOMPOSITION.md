---
title: schemaFor impl — SCOPE-AND-DECOMPOSITION
date: 2026-05-19
session: S104
authority:
  - SPEC §41.15 (NORMATIVE — 154 lines at compiler/SPEC.md:18548-18701)
  - SPEC §39.5.7-§39.5.8 (shared-core vocabulary + SQL DDL lowering table; the structural enabler)
  - SPEC §53.14.5 (type-as-argument family compile-time recognition pattern)
  - SPEC §34 (8 E-SCHEMAFOR-* error codes; lines 14873-14880)
  - Deep-dive: scrml-support/docs/deep-dives/schemaFor-design-2026-05-19.md (12 OQs closed; Form B verdict)
  - SCOPING: docs/changes/schemaFor-scoping/SCOPING.md (gates 1-3 STRONG PASS; 5/5 ratified)
  - Precedent files: compiler/src/type-system.ts:3993-4070 (formFor recognition), compiler/src/codegen/emit-form-for.ts (expander shape), compiler/src/codegen/emit-parse-variant.ts (CallExpression precedent), stdlib/data/form-for.scrml (stub-export pattern)
status: SCOPE DRAFTED — pending user ratification + dispatch
estimated_cost: ~12-18h dispatch (deep-dive cost estimate; LOWER end of family per simpler emit shape — no markup synthesis)
family_position: THIRD active L22 general-position member (after parseVariant S65 + formFor S102-S103)
---

# schemaFor impl — SCOPE-AND-DECOMPOSITION

## §0. Pre-dispatch corpus-ouroboros check (S101 standing rule)

Confirmed at S104 pre-author:
- `git grep -l 'schemaFor\b' -- compiler/src/ stdlib/` → ZERO matches. No existing compiler or stdlib surface.
- `git log --grep=schemaFor` → SPEC §41.15 (`c84d1c8`), SCOPING + ratification commits, deep-dive commits. No impl commits.

schemaFor is greenfield. Implementation rides parseVariant + formFor scaffolding; reuses existing helpers verbatim where the shape matches.

## §1. The narrative lead (frame this in the changelog, NOT as a side feature)

Per S104 hand-off "Things must NOT screw up": **OQ-SCH-12 enum lowering is the FLAGSHIP value-add.** schemaFor closes the enum-knowledge-loss-at-DB-boundary gap that hand-authored `<schema>` blocks leave open. 23-trucking-dispatch has 7 enum columns currently stored as bare `text not null` — the variant set is dropped at the DB boundary, so `INSERT INTO loads VALUES (..., 'BogusStatus')` is unstoppable. schemaFor encodes the constraint mechanically: bare-variant enums lower to `text req oneOf([variants...])` → `TEXT NOT NULL CHECK (col IN (...))` per §39.5.8.

This is the lead. The rest (Form B function-call recognition + pick/omit transforms + multi-table composition) is plumbing.

## §2. Scope — what's IN, what's OUT for v1.0

### IN scope (this dispatch)

| Surface | Spec | Notes |
|---|---|---|
| Type-system recognition of `schemaFor(StructType[, {pick:[...], omit:[...]}])` CallExpression | §41.15.9 + §53.14.5 | Mirror parseVariant's `walkAndValidateParseVariantCalls` shape (CallExpression form), NOT formFor's markup-element walker. |
| Validate type argument is bare `:struct` ident | §41.15.1 + E-SCHEMAFOR-TYPE-NOT-STRUCT | Resolve against `typeRegistry`; mirror parseVariant `E-PARSEVARIANT-TYPE-NOT-ENUM` precedent. |
| Validate call context = inside `<schema>` block via `${...}` interpolation | §41.15.8 + E-SCHEMAFOR-INVALID-CALL-CONTEXT | Determined by walking-parent-context during the schemaFor walker pass. |
| Validate `pick=[...]` / `omit=[...]` options | §41.15.4 + 3 error codes | E-SCHEMAFOR-PICK-INVALID-FIELD, E-SCHEMAFOR-OMIT-INVALID-FIELD, E-SCHEMAFOR-PICK-OMIT-CONFLICT. |
| Reject nested struct fields | §41.15.7 + E-SCHEMAFOR-NESTED-STRUCT-NO-FK-V1 | v1.0 has no FK derivation (OQ-SCH-4 ratified out-of-scope). |
| Reject payload-bearing enum fields | §41.15.6 + E-SCHEMAFOR-VARIANT-PAYLOAD-ENUM-V1 | Bare-variant enums lower; payload variants reject. |
| Reject unmappable types | §41.15.8 + E-SCHEMAFOR-NO-SQL-MAPPING | Function types, Promise types, foreign-code types, opaque types. |
| Codegen `emit-schema-for.ts` — struct walk → shared-core schema body text | §41.15.2 + §41.15.5 + §41.15.6 + §41.15.9 | NEW file. Emit per-field `<column-name>: <column-type> <constraints>` in shared-core form; §39.5.8 lowering happens downstream in the existing `<schema>` pipeline. |
| Table-name pluralization rule | §41.15.2 verbatim | "lowercase + trailing `s`" — `User → users`, `LoadAssignment → loadassignments`. NOT snake_case (deep-dive verdict's snake_case framing is superseded by SPEC §41.15.2 explicit rule — SPEC wins per Rule 4). Irregulars (`Person → persons`, `Child → childs`) accepted as imperfect; `@table` annotation reserved v1.next. |
| Enum-typed field lowering — bare-variant → `text req oneOf([variants])` | §41.15.6 + §39.5.8 enum row | The FLAGSHIP value-add. |
| pick / omit field-set transforms | §41.15.4 | Both array-of-string-literal args; mutually exclusive. |
| Multi-table composition via concatenation inside one `<schema>` block | §41.15.3 | `<schema>${ schemaFor(User) } ${ schemaFor(Post) }</>` works mechanically — each call expands independently. |
| Interleavability — hand-authored + schemaFor calls in same `<schema>` block | §41.15.3 | Falls out of source-level expansion automatically. |
| Stdlib re-export from `scrml:data` | precedent: stdlib/data/form-for.scrml + index.scrml | NEW `stdlib/data/schema-for.scrml` (~60 lines mirror form-for.scrml shape) + 1-line export in `stdlib/data/index.scrml`. |
| Test coverage | precedent: form-for.test.js (20 e2e + 26 unit = 46 tests at formFor) | Target: 30-50 tests covering all 8 error codes + happy-path single-table + multi-table + pick/omit + enum lowering + nested-struct rejection + invalid-call-context. Unit + integration mix. |
| Sample + example | precedent: examples/23-trucking-dispatch demonstrating enum-knowledge-loss | NEW `examples/26-type-derived-schema.scrml` (or extend 17-schema-migrations.scrml — see survey decision). |

### OUT of scope (DEFER explicitly; not blockers)

| Item | Why deferred | Spec ref |
|---|---|---|
| `@table("name")` annotation | RESERVED v1.next | §41.15.2 + §41.15.8 |
| `@column("name")` annotation | RESERVED v1.next | §41.15.8 |
| FK derivation from nested struct fields | v1.0 has none (OQ-SCH-4 ratified) | §41.15.7 + Q-SCH-OPEN-4 |
| Variant-payload enum lowering (JSON column vs separate table) | v1.next | §41.15.6 + §41.15.8 |
| Array-form `schemaFor([User, Post])` | v1.next ergonomic | §41.15.3 + §41.15.8 |
| `partial: true` option | NOT-APPLICABLE — adopter omits `req` at struct level | §41.15.4 + §41.15.8 |
| migration-diff sample fixture | Optional; schema-differ.js already consumes `<schema>` block output identically per OQ-SCH-6 round-trip | follow-on if friction surfaces |
| Marketing-shaped content (sample app / scrml.dev refresh / README compile-gate block) | pa.md Rule 1 — DEFER unless raised | Q-SCH-OPEN-5 ratified |

## §3. Architectural decisions made up-front

### §3.1 AST rewrite shape — source-level expansion at type-system stage

**Decision:** AST-rewrite at type-system stage replaces the `schemaFor(...)` CallExpression inside the `${...}` interpolation with a synthesized text node carrying the expanded shared-core table-declaration body. The existing `<schema>` block parser sees the expanded text identically to hand-authored content. This mirrors formFor's "rewrite at TS so downstream stages see hand-authored-equivalent shape" precedent.

**Rationale (SPEC §41.15.9 step 6 + §41.15.3 interleaving requirement):**
- §41.15.3 mandates that hand-authored + schemaFor calls SHALL be interleavable inside the same `<schema>` block. The cleanest way to support this is to expand schemaFor BEFORE the `<schema>` block parser sees the body — so the parser ingests a pre-expanded body with hand-authored + schemaFor-derived content side-by-side as raw text.
- §41.15.9 step 6 ("Annotates the AST node with the resolved struct shape + transform metadata") + the codegen note ("emits the equivalent table-declaration fragment at the call site") are reconcilable: TS pass validates + records struct metadata on the call-node; a small TS-stage AST-rewrite invokes the expander helper to produce the text; codegen-side `emit-schema-for.ts` is the expander module itself (not a separate post-TS phase).
- formFor's "rewrite at TS" precedent worked end-to-end (S102 dispatch landed +58 tests, 0 regressions). Same pattern fits schemaFor with the CallExpression discriminator instead of markup-element discriminator.

**Survey-first authorization for the agent:** if implementation-time survey reveals the `<schema>` block is parsed BEFORE type-system runs (i.e., the `<schema>` body's `${...}` interpolations are already lifted to ExprNodes at parser stage), the agent SHALL adjust the recognition site to match — possibly threading the expansion via the existing `<schema>` body-text-rewrite path, or hooking into the schema-body consumer directly. The agent has authority to correct the pipeline-ordering hypothesis if SPEC §41.15.9 framing turns out to mismatch the actual pipeline.

### §3.2 No `validateTypeArgument` helper extraction this dispatch

Today formFor + parseVariant inline their type-argument validation (different lookup paths into `typeRegistry`). The deep-dive proposed extracting a shared `validateTypeArgument(expr, expectedKind, errors, span)` helper. **NOT in this dispatch's scope.** schemaFor inlines its own validation matching formFor's pattern. The helper extraction is a 3-site refactor that should happen AS its own dispatch after schemaFor lands — when there are 3 sites to compare for the right shape.

### §3.3 No shared `walkStructFields` helper extraction this dispatch

The deep-dive's Implementation Path §1-2 references a shared `walkStructFields(typeId): FieldShape[]` helper at `compiler/src/codegen/struct-walk.ts` (per formFor OQ-FF-8 verdict). **Survey at dispatch time:** if this helper was actually extracted at formFor (S102) landing, schemaFor REUSES it verbatim. If it wasn't extracted (the formFor impl inlined the struct walk in `emit-form-for.ts`), schemaFor inlines its own walk; extraction is a refactor for v1.next when there's a third caller.

The dispatch brief authorizes the agent to discover which world we're in + pick accordingly.

### §3.4 Enum lowering — bare-variant detection at struct field type

The struct-walk produces `{name, type, predicates}` per field. For each field:
- If `type` resolves to a `:enum` in `typeRegistry`, classify variants: all-unit-variants → bare-variant; one-or-more payload-bearing → payload enum.
- Bare-variant: emit `<fieldName>: text req oneOf([<variant1-name-string>, <variant2-name-string>, ...])` — note: VARIANT NAMES AS STRINGS (matching SPEC §41.15.6 worked example "['Pending', 'Active', 'Archived']").
- Payload enum: emit `E-SCHEMAFOR-VARIANT-PAYLOAD-ENUM-V1` at TS stage. Do NOT emit any column declaration.
- Field's existing predicates on the column merge with the synthesized `req oneOf(...)` form. (Common case: `status: Status req` field — `req` from field plus `oneOf` from enum → resulting column carries both.)

### §3.5 Tests — error-code coverage is non-negotiable

Each of the 8 error codes SHALL have at least one fire test + one no-fire test. formFor precedent: per-error-code coverage was the bulk of the dispatch's test count (20 end-to-end + 26 unit = 46 tests). schemaFor target: minimum 30 tests, likely 40-50. Coverage matrix:

| Error code | Fire test | No-fire test |
|---|---|---|
| E-SCHEMAFOR-TYPE-NOT-STRUCT | schemaFor(MyEnum) | schemaFor(MyStruct) — accepts |
| E-SCHEMAFOR-PICK-INVALID-FIELD | schemaFor(T, {pick:["bogus"]}) | schemaFor(T, {pick:["realField"]}) |
| E-SCHEMAFOR-OMIT-INVALID-FIELD | schemaFor(T, {omit:["bogus"]}) | schemaFor(T, {omit:["realField"]}) |
| E-SCHEMAFOR-PICK-OMIT-CONFLICT | schemaFor(T, {pick:[...], omit:[...]}) | each alone — accept |
| E-SCHEMAFOR-NESTED-STRUCT-NO-FK-V1 | struct with nested struct field | struct with primitive fields only |
| E-SCHEMAFOR-NO-SQL-MAPPING | struct with function-type field | all-mappable-types struct |
| E-SCHEMAFOR-VARIANT-PAYLOAD-ENUM-V1 | struct with `Result:enum = {Ok(int), Err(string)}` field | struct with bare-variant `Status:enum = {Pending, Active}` field — accept + lower to oneOf |
| E-SCHEMAFOR-INVALID-CALL-CONTEXT | top-level `${ schemaFor(T) }` outside `<schema>` | `<schema>${ schemaFor(T) }</>` |

Plus happy-path emission tests:
- Single-table emission shape verification (per-predicate lowering at the `<schema>` parser level after schemaFor expansion)
- Multi-table composition (concatenated calls in one block)
- Interleaved hand-authored + schemaFor tables
- pick / omit field-set verification
- Bare-variant enum auto-lowering to `oneOf`
- Pluralization rule: `User → users`, `LoadAssignment → loadassignments`

## §4. Step decomposition

### Step 1 — Survey + dispatch baseline (~1h)

Agent runs F4 startup verification + survey:
- `pwd` matches `WORKTREE_ROOT`; `bun install`; `bun run pretest`
- `grep -n 'validateTypeArgument\|walkStructFields' compiler/src/` to confirm whether the deep-dive's hypothetical extracted helpers exist (deferred-extraction decision per §3.2 + §3.3)
- Trace the `<schema>` block pipeline: where is `<schema>` body first consumed? Is it parsed before or after type-system? How are `${...}` interpolations inside `<schema>` body represented in the AST?
- Read formFor recognition site at `compiler/src/type-system.ts:3993-4070` + walker at `:9988+` in full
- Read parseVariant recognition + walker similarly
- Read `emit-form-for.ts` + `emit-parse-variant.ts` in full

**Survey report (commit before any impl):** what the pipeline actually looks like + which precedent (formFor or parseVariant) is the closer architectural mirror + any architectural-cost corrections to §3.1's AST-rewrite hypothesis.

### Step 2 — stdlib re-export stub (~30min)

- NEW `stdlib/data/schema-for.scrml` (~60 lines mirror `stdlib/data/form-for.scrml`)
- Add `export { schemaFor } from './schema-for.scrml'` to `stdlib/data/index.scrml`
- Defensive runtime fallback shim (matches formFor pattern — body is unreachable under a correct compiler)
- Commit per S83 incremental discipline

### Step 3 — Type-system recognition + validation walker (~3-5h)

- Add `collectSchemaForImports` mirroring `collectFormForImports` / `collectParseVariantImports` at type-system.ts (after line 4018 where formFor section ends; insert NEW section "§41.15 / §53.14 — schemaFor call-expression recognition + AST rewrite pass")
- Add `walkAndExpandSchemaForCalls` walker (new function at type-system.ts:~10000+, sibling to walkAndExpandFormForNodes)
- Walker validates:
  1. Type arg is bare struct ident; emit E-SCHEMAFOR-TYPE-NOT-STRUCT on mismatch
  2. Call context is inside `<schema>` block via `${...}` interpolation; emit E-SCHEMAFOR-INVALID-CALL-CONTEXT otherwise
  3. options arg (if present): pick + omit field-name validity; pick/omit non-co-occurrence
  4. Per-struct-field: type has v1.0 SQL mapping (E-SCHEMAFOR-NO-SQL-MAPPING); not nested struct (E-SCHEMAFOR-NESTED-STRUCT-NO-FK-V1); enum is bare-variant (E-SCHEMAFOR-VARIANT-PAYLOAD-ENUM-V1 on payload enum)
- On validation success: call into `emit-schema-for.ts` expander; rewrite the CallExpression's parent `${...}` interpolation with the synthesized table-declaration text
- Commit per major sub-step

### Step 4 — Codegen expander `emit-schema-for.ts` (~2-3h)

- NEW `compiler/src/codegen/emit-schema-for.ts` (~150-250 lines based on parseVariant precedent scale, simpler than formFor)
- Exports `expandSchemaFor(structDecl, options): string` — produces shared-core schema-body text
- Helpers:
  - `pluralizeStructName(name): string` — SPEC §41.15.2 rule: lowercase + trailing `s` (if already ends in `s`, leave; else +`s`)
  - `walkFieldsForSchema(typeRegistry, structDecl, pick, omit): FieldShape[]` — per-field walk producing `{name, columnType, predicates}` 3-tuples
  - `lowerFieldToShared Core(field): string` — per-field text emission: `<column-name>: <column-type> <constraints>`; enum-typed fields auto-`oneOf`
  - `parseStructFieldRawClause(rawBody, fieldName): string` — reuse formFor's pattern at emit-form-for.ts (read field validator-tail from raw type-decl body — buildTypeRegistry resolves the type-portion only)
- Commit per helper

### Step 5 — Tests (~3-5h)

- NEW `compiler/tests/unit/schema-for.test.js` — pure-emit shape verification (expander unit tests + per-error-code TS fire)
- NEW `compiler/tests/integration/schema-for.test.js` — end-to-end: source `.scrml` with schemaFor → compile → verify emitted SQL DDL shape
- Target ~30-50 tests; all 8 error codes covered + happy-path matrix per §3.5
- Run pre-commit subset after each test-file addition; baseline 12,807 must NOT regress
- Commit per test-file addition + per fix-as-needed

### Step 6 — Sample + example (~1-2h)

- NEW `samples/compilation-tests/schemaFor-basic.scrml` — minimal struct + schemaFor + `<schema>` block; expected emit fixture
- NEW `examples/26-type-derived-schema.scrml` — runnable demo: User struct + Post struct + schemaFor calls + actual queries
- Choice: NEW example file (recommended) vs extending `examples/17-schema-migrations.scrml`. PA picks NEW — keeps 17 as the SQL-mirror reference while 26 is the type-derived demo.
- Verify both compile clean + sample expected-output fixture matches
- Commit

### Step 7 — Final pre-push baseline + close report (~30min)

- Run `bun run test` full suite (chains pretest); confirm 0 regressions vs S104 baseline 12,807
- Update `docs/changelog.md` with S104 schemaFor impl entry (LEAD with OQ-SCH-12 enum-lowering closing the L4 vocabulary-unification loop)
- Final commit
- Report to PA: FINAL_SHA, FILES_TOUCHED, tests pre/post, deferred items, gate-walk outcomes

## §5. Open questions for user (pre-dispatch)

**NONE substantive.** SPEC §41.15 is complete; deep-dive verdicts close all 12 OQs; SCOPING ratified 5/5. The architectural decision in §3.1 (AST-rewrite shape) is a SURVEY-AUTHORIZED finding — agent reports + corrects if hypothesis mismatches actual pipeline.

If user disagrees with any §3 architectural decisions OR §2 IN/OUT scope partition, surface NOW before dispatch.

## §6. Files touched (anticipated)

| File | Change | Size |
|---|---|---|
| `compiler/src/type-system.ts` | NEW schemaFor section after formFor section (lines ~4070+) + NEW `walkAndExpandSchemaForCalls` function (~10000+) | +250-400L |
| `compiler/src/codegen/emit-schema-for.ts` | NEW file | +150-250L |
| `stdlib/data/schema-for.scrml` | NEW file | +60L |
| `stdlib/data/index.scrml` | +1 export line | +1L |
| `compiler/tests/unit/schema-for.test.js` | NEW file | +400-600L |
| `compiler/tests/integration/schema-for.test.js` | NEW file | +200-300L |
| `samples/compilation-tests/schemaFor-basic.scrml` | NEW file | +30L |
| `samples/compilation-tests/schemaFor-basic.expected.js` (or similar) | NEW fixture | +60L |
| `examples/26-type-derived-schema.scrml` | NEW file | +100-150L |
| `docs/changelog.md` | NEW S104 schemaFor entry | +30-50L |
| `master-list.md` §0 | flip §53.14.3 family-roster row "spec'd; impl pending" → "SHIPPED S104"; flip schemaFor row at "L22 family schemaFor" section | +small diff |
| `compiler/SPEC-INDEX.md` | Quick Lookup new entries | +small diff |

**Total estimated:** ~1,200-2,000 lines added across ~10 files.

## §7. Test gate (pre-push)

**Baseline at S104 OPEN:** 12,807 pass / 88 skip / 1 todo / 0 fail / 668 files / 43,219 expect.

**Acceptance:** post-dispatch pre-commit subset MUST be 12,807+N pass / 0 fail / 0 regression. Full `bun run test` (pre-push gate) MUST pass on the worktree before file-delta landing.

## §8. Dispatch protocol

- Agent: **scrml-js-codegen-engineer** (`subagent_type: "scrml-js-codegen-engineer"`)
- Model: opus
- Isolation: `isolation: "worktree"` (S88 — MANDATORY)
- Brief includes: F4 startup verification block + S99 path-discipline incident-counter + S83 commit-discipline two-sided rule + MAPS-required-first-read block + kickstarter-v2 link + BRIEFING-ANTI-PATTERNS link
- run_in_background: true (this is a multi-hour dispatch)

## §9. Tags

#schemaFor #l22-family-third-member #v0.4 #s104 #ddl-from-struct-type #flagship-enum-lowering #form-b-function-call #scope-and-decomposition
