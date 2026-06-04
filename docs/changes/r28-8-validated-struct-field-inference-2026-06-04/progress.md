# R28-8 progress — validated-struct-field bare-variant inference

## 2026-06-04T14:00:24Z — startup
- pwd: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a06e68a5cfa97ba40
- ff-merged main 9f01f6cd -> 0dd18219 (docs(s161) tip); maps refreshed.
- bun install OK; pretest OK.
- baseline pre-commit gate GREEN: 15791 pass, 0 fail, 89 skip.
- next: read maps, survey structType.fields consumers (Phase 0 STOP-gate).

## Phase 0 SURVEY — structType.fields consumer blast-radius

Root site confirmed: `parseStructBody` (type-system.ts:1174) calls
`resolveTypeExpr("Category req")` @1201 → falls through to asIs (no branch in
resolveTypeExpr matches "Category req"; the trailing `req` defeats both the
enum-subset recognizer @1740 and the named-type lookup @1868). `structType.fields`
therefore stores asIs for any validated field. The nav walker @8237 reads that asIs
and the flat walker @8089 fires E-VARIANT-AMBIGUOUS (asIs == no-context).

41 `structType.fields` consumer sites. Classification:
- NAME-only (`.fields.has` / `.fields.keys` / `.fields.size`): unaffected by an
  asIs→base-type change (they read field NAMES, not types). The bulk of the L22
  validators are here.
- TYPE-reading consumers that would CHANGE behavior under a root fix:
  1. formFor field-type @12485-12516 — `baseTypeName` computed as `: fieldKind`
     @12510 for non-predicated/non-primitive kinds. asIs→enum makes baseTypeName
     literally `"enum"` (WRONG; should be "Category"). The asIs-gated raw recovery
     @12511 (`if baseTypeName === "asIs"`) would NO LONGER FIRE. => REGRESSION for
     enum-typed formFor fields.
  2. schemaFor field-classification @13009-13077 — recovery gated on
     `if (ftKind === "asIs" || "unknown")` @13013. Root fix bypasses the entire
     enum-subset recovery + nullability re-synthesis + `[asIs,not]` reconstitution.
     Would need the now-resolved enum/subset/primitive to flow cleanly through
     classifyFieldForSql — UNVERIFIED; uncertain.
  3. tableFor field path @13718 — same asIs-gated recovery pattern as schemaFor.
  4. type-encoding.ts normalizeType @190 — struct signature would change
     (`category:asIs` → `category:e:Category{...}`). Affects type-equality + the
     struct field-VALUE type-check (brief noted `{category: 42}` compiles clean
     today because field type is asIs). New diagnostic surface.

DECISION: approach (A) root fix has LARGE + UNCERTAIN blast radius (definite formFor
enum-field regression @12510; bypasses 3 asIs-gated recovery paths; changes type-
encoding signatures). Per brief STOP-gate, fall back to LOCALIZED fix (B): recover
the field's base/subset type INSIDE the bare-variant inference path only, mirroring
`_schemaForRecoverEnumSubset`'s strip approach, confined so no other consumer of
structType.fields changes. No SPEC amendment (§14.10 catch-all already authorizes).

## Implementation — localized fix (B) landed

type-system.ts (commit a4767f40):
- AsIsType + `bareVariantBase?: ResolvedType` sidecar field.
- `parseStructBody` calls `annotateBareVariantBaseFromRawClause(resolvedField,
  typeExpr, registry)` after resolving each field — stashes the recovered enum /
  enum-subset base on the asIs (or the asIs member of a `[asIs,not]` union).
- `recoverEnumBaseFromValidatedClause` — enum-subset first (via shared
  `_schemaForRecoverEnumSubset`, keeps the SUBSET), else leading-token strip →
  registry lookup; returns ONLY enum bases (primitive/struct → null, no sidecar).
- `refineFieldTypeForBareVariant` — read by the nav walker @ the field-type read;
  substitutes the sidecar base (bare asIs) or rebuilds the union with the asIs
  member replaced by its base. Local to the inference walker; asIs kind unchanged
  for every other structType.fields consumer.

Tests (commit 3088723a): r28-8-validated-struct-field-inference.test.js, 11 tests
over the runTS harness (matching existing bare-variant suite). All pass.

## Phase 3 — R26 EMPIRICAL VERIFICATION (S138 doctrine)

NOTE: the bug reproduces via the FULL CLI pipeline (and the runTS harness with a
state-cell decl `<draft>: Article = {...}`), NOT via the bare `compileScrml` API
with a top-level-function const — the API path short-circuits a pipeline stage
that runs the inference. Verified the bug reproduces on the ORIGINAL compiler
(stash fix → CLI gauntlet bare-reverted → 2× E-VARIANT-AMBIGUOUS on .News/.Draft;
runTS state-cell → E-VARIANT-AMBIGUOUS). Fix confirmed against the reproducing path.

| Step | Check | Result |
|------|-------|--------|
| 1a | synthetic (brief's const-in-fn form) `.News` via CLI | CLEAN, exit 0, no E-VARIANT-AMBIGUOUS |
| 1b | synthetic typo `.Newz` via CLI | E-TYPE-063 naming `Category` (+full variant list) — NOT E-VARIANT-AMBIGUOUS |
| 2 | real gauntlet dev-3-elixir, `.News`/`.Draft` reverted to BARE, /tmp copy, CLI | only pre-existing E-PA-002 (press.db); E-VARIANT-AMBIGUOUS count = 0 |
| 3 | `node --check` emitted client.js + runtime.js | both exit 0 |
| extra | emitted client.js readability + no leak | `.News` → `category: "News"`; no `_scrml_sql`/server data in client |

Related-suite regression check: bare-variant (4) + enum-subset (4) + B20 + new =
145 pass / 0 fail. Full pre-commit gate subset: 15802 pass / 0 fail / 89 skip
(baseline 15791; +11 new). 840 files (+1).

## Scope / SPEC
- No SPEC amendment (§14.10 catch-all already authorizes object-literal field
  positions). OPTIONAL doc-polish recommendation surfaced (not applied): §14.10's
  normative example list could add an explicit "object-literal field whose struct
  type is known" example. NOT amended per brief.
- L22 (formFor/schemaFor/tableFor) raw-clause recovery NOT refactored — only
  verified non-regressing (enum-subset-schemafor-da-b3 green).
- Field-VALUE type-checking NOT expanded beyond what falls out of the fix.

STATUS: complete.
