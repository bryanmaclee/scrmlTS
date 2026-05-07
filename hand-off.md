# scrmlTS — Session 65 (CONTINUING past wrap — predicate-Zod deep-dive · debate-05 5/5 C-narrow · npm-myth amend · parseVariant Path A LOCKED · type-as-argument family roadmap recorded · survey-first dispatch in flight)

**Date opened:** 2026-05-06
**Date status:** session continued past initial wrap — Bryan: "we have lots of ctx left lets go"; second tranche of work landed Path A architectural commit + family roadmap
**Previous:** `handOffs/hand-off-64.md` (S64 close — substantial work landed across 3 debates + Stage 0c.A + B2 + Phase 4d)
**This file:** rotates to `handOffs/hand-off-65.md` at S66 open

**Tests at close:** **8,959 / 44 / 1 / 0 / 9,004 / 440** (Phase 2 added +18 net: 8 unit + 10 integration parse-variant tests; 0 regressions).

---

## **🎯 parseVariant SHIPS — L22 family member #1 fully realized**

S65 third tranche: Phase 1 (stdlib scaffold + sniff test) → Phase 3 (spec writing) → Phase 2 (compiler implementation) all GREEN. **`parseVariant(json, EnumType)` is now a working scrml language primitive** at commit `f963a75`. Tests 8959/44/1/0/9004 (+18 / 0 regressions). Type-as-argument is no longer just an architectural commitment; it's a shipped language feature.

## TL;DR — what landed in S65

| Thread | Outcome | Path |
|---|---|---|
| Predicate-Zod-replacement deep-dive | ✅ LANDED | `scrml-support/docs/deep-dives/predicate-system-zod-replacement-2026-05-06.md` (608 lines) |
| Debate-05 brief + 5 expert positions + transcript + judgment | ✅ LANDED | `scrml-support/docs/debates/debate-05-*-2026-05-06.md` |
| Design insight #4 appended | ✅ LANDED | `scrml-support/design-insights.md` (line 1387+) |
| npm-myth article amended | ✅ LANDED | `docs/articles/npm-myth-devto-2026-04-28.md` lines 44-48 |
| X-snippet drafted (3 variants) | ✅ DRAFT — awaits Bryan | `docs/articles/x-snippet-zod-calibration-2026-05-06.md` |
| parseVariant implementation SCOPE | ✅ LANDED — Path A LOCKED (S65 second tranche) | `docs/changes/parsevariant-impl/SCOPE.md` |
| Type-as-argument family roadmap recorded | ✅ LANDED in SCOPE doc + master-list L22 | parseVariant → serialize → formFor → schemaFor → tableFor → reflective |
| L22 added to master-list locks list | ✅ LANDED | `master-list.md §0.2` |
| Survey-first dispatch (parseVariant Path A) | ✅ LANDED | `docs/changes/parsevariant-impl/SURVEY-REPORT.md` (depth-of-survey-discount #7; 2 SCOPE drifts caught + corrected) |
| SCOPE doc updated with survey findings | ✅ LANDED | DRIFT-1 (§10.4 → §41.13) + DRIFT-2 (parser-level no-op) corrected; cost re-estimated 16-23h |
| Primer §12 depth-of-survey-discount counter | ✅ updated | 4 occurrences → 7 (added S64 Stage 0c.A, S64 B2, S65 parseVariant survey) |
| **parseVariant Phase 1 (stdlib scaffold + sniff test)** | ✅ GREEN | scrml-support `5e25586` (L22) + scrmlTS `c2fc731` (parse.scrml + index.scrml + §41.13 bundled) + `808775c` (progress) |
| **parseVariant Phase 3 (spec writing)** | ✅ GREEN | `b07072f` (§53.14) + `56c6b4b` (§34 4 codes) + `549d741` (primer + kickstarter) + `660cb02` (progress) + scrml-support `5efdd05` (family-precedent doc) + `fc7fe93` (predicate-gaps Gap #19 closed + Gap #20 added) |
| **parseVariant Phase 2 (compiler implementation)** | ✅ GREEN — **L22 family member #1 SHIPPED** | `36a2d88` (TS pass + codegen + dispatch hook) + `b5caf5d` (ParseError-as-builtin tEnum + 8 unit tests) + `f963a75` (10 runtime integration tests) + `deb8ea6` (progress) |
| §53.10 → §53.14 stale-reference sweep | ✅ staged (commit pending pre-commit unblock) | SCOPE.md + SURVEY-REPORT.md |
| A1c C0 dispatch brief preparation | ✅ staged | `docs/changes/phase-a1c-codegen/C0-DISPATCH-BRIEF.md` |
| Companion follow-up dev.to article | ✅ staged | `docs/articles/scrml-debate-amends-zod-claim-devto-2026-05-06.md` (~2,636 words, voice-authentic) |
| master-list.md + changelog + hand-off updates | ✅ LANDED (initial wrap + second-tranche update) | all three |

**Commit count after second tranche:** scrmlTS 5 commits; scrml-support 4 commits; total 9 commits across 2 repos. First tranche pushed mid-session (`4595b2c` + `c9c2182`); second tranche commits `9c02e8b` + (master-list/hand-off update commit) **push pending**.

---

## BIG DECISIONS RATIFIED THIS SESSION

### S65 second tranche — Path A LOCKED + type-as-argument family roadmap (architectural commit)

After debate-05's narrowing of Bryan's lean from full Approach A to C-narrow, Bryan asked the load-bearing question: **"what future shippable features could ride the type-as-argument precedent?"** PA enumerated a 5-7 member family (parseVariant → serialize → formFor → schemaFor → tableFor → variantNames + reflective metadata). Two members (`formFor` and `tableFor`) GENUINELY require type-as-argument as a structural language concept — they cannot be expressed as desugars because the compiler must walk struct fields structurally to emit markup trees. **Bryan locked Path A.** Subsequent members ride the precedent for free.

**The deciding code sample (S65 internal — what locked the call):**

```scrml
type User:struct = {
    name:  string req length(>=2)
    email: string(email) req unique
    age:   int min(13) max(120)
}

<schema>${schemaFor(User)}</>
<users>: [User] = []

<program>
    <{formFor(User, submit=createUser)}/>
    <{tableFor(User, rows=@users)}/>
</>
```

One struct definition + five lines of glue → SQL schema with constraints, working form with validation/submission/errors, working table with rendered cells, full reactive lifecycle, zero npm packages. **scrml.dev flagship demo.**

**L22 phrasing (locked):** "Type-as-argument is a first-class scrml language primitive, introduced by `parseVariant`. Foundation for the type-as-argument family. Each future family member must independently pass per-shape sliver test + synonym-detection precondition + asymmetric-forfeit-cost decomposition."

**Discipline that bounds the family** (recorded in SCOPE doc + carried forward in family-precedent doc per Step 12): per-shape sliver test mandatory; synonym-detection mandatory; per-feature deep-dive when convener has any doubt. Without this discipline, Path A becomes the slippery slope simplicity-defender warned about. With it, Path A is load-bearing infrastructure for a 5-7 member family.

**Family economics:** ~20-30h architectural commit at parseVariant pays for ~85-145h of family-feature surface across 6-12 months.

### Boundary-parsing primitive — debate-05 verdict (5/5 unanimous C-narrow)

Convener: **Bryan strongly leaned yes** (anti-sycophancy stance — fired debate to test the lean). Verdict: **lean validated but narrowed** from full Approach A to C-narrow.

**Ship `parseVariant(json, EnumType)`. Close `parseShape` as intentional absent.**

Constraints (load-bearing — judge-ratified):
1. Second arg MUST be scrml-native `enum` type descriptor (not struct, not arbitrary type literal)
2. Discriminator key = enum's own variant names; no custom field name; no name-mapping table
3. Returns typed enum value or fails with `::ParseError msg`
4. Companion design statement closing `parseShape` ships with the addition

**Why not `parseShape`?** It's a synonym for §53 SPARK boundary-zone refinement on assignment. The synonym-detection test (debate-04 methodology) demoted it. Adding it would be stdlib bloat with no distinct semantic shape.

**Why `parseVariant`?** It's the type-establishment step for sum types — constructor selection from a discriminator field is what predicate systems can't perform. SPARK is the predicate-enforcement step that fires AFTER type-establishment. They're sequentially ordered, not substitutable. The DON'T-SHIP forfeit is paid on every tRPC integration in user code, forever.

### Pro-X-voice-voting-against-X at frequency-3 (methodology-grade signal)

| Debate | Expert | Default | Vote | Mechanism |
|---|---|---|---|---|
| debate-03 | roc-expert | retain component-overload carve-out | retracted | structural-element reframe |
| debate-04 | crystal-multi-dispatch | sanction switch as Tier 0+ | voted A (hard-error) | synonym-not-sliver |
| **debate-05** | **simplicity-defender** | **refuse stdlib expansion (B)** | **C-narrow** | **synonym test on `parseVariant`** |

Frequency-3 confirms: when a partisan-defender voice flips under its own methodology lens, the rejection is structurally stronger than expected agreement.

---

## DESIGN-INSIGHT contributions this session

### Insight #4 (debate-05): "Type-establishment vs predicate-enforcement are sequentially ordered, not substitutable"

When a language has a type-enforcement mechanism that operates on already-typed values (scrml's §53 SPARK three-zone enforcement), a natural assumption is that "parse unknown external data into a typed value" is covered by that mechanism. **It is not — these are sequentially ordered operations.** The type-establishment step (constructor selection from a discriminator) must happen *before* predicate enforcement can fire. A stdlib designed to replace an external parsing library must decompose into both steps. A language designer who provides only the second forces every developer to hand-roll the first forever.

The further refinement: the decomposition is type-specific. **For sum types** (enums, discriminated unions), the type-establishment step requires constructor selection — a closed, compiler-derivable operation that predicate systems cannot perform. **For product types** (structs), the type-establishment step collapses into "assign the fields," which a sound boundary-enforcement system already does. The stdlib primitive is justified for the sum-type case and is a synonym (bloat risk) for the product-type case.

The sliver test for any boundary-parsing primitive: **does this type's type-establishment step require operations that the language's predicate-enforcement mechanism cannot perform?** For sum types in a nominally-typed language: reliably yes. For product types under sound boundary enforcement: reliably no.

---

## A+ verdict execution carry-forward (from S64 — STILL pending)

These three items from debate-04 verdict have NOT yet been implemented (carried from S64 hand-off):

1. **`did-you-mean: match` quickfix on E-SWITCH-FORBIDDEN** — ~1-2h
2. **W-LIFECYCLE-CANDIDATE tightening** on `if=` over enum-tag-shaped string-literal RHS — ~1h
3. **Document JS-style `match expr {}` form as canonical value-return rung** in primer §1 + tier-ladder-promotion article — small

Combined: ~3-5h dispatch. Could fold into B3 or parseVariant work.

---

## Open questions to surface immediately at S66 open (UPDATED post-second-tranche)

1. **parseVariant Path A — RESOLVED.** Path A is locked (S65 second tranche). Survey-first diagnostic dispatch is in flight; will land before any implementation work. Open question NEXT: based on survey findings, fire the implementation dispatch (~20-30h Path A scope, possibly discounted via depth-of-survey) — OR refine SCOPE based on survey before dispatching.

2. **Dispatch sequencing post-survey:**
   - (a) Fire parseVariant Path A implementation (20-30h, possibly discounted)
   - (b) Fire B3 (`@name` resolution) first per S64 plan; parseVariant after
   - (c) Stack both — parseVariant Path A in background, B3 in foreground (no file overlap; should be safe)

3. **X-snippet selection.** 3 variants drafted at `docs/articles/x-snippet-zod-calibration-2026-05-06.md`. PA lean: variant 3 (long-form ~180 words) for credibility. Bryan to pick. Will surface again after survey lands.

4. **Companion follow-up dev.to article?** Variant 3 of X snippet narrates the debate-and-revise process. Optional follow-up article (`scrml-debate-amends-zod-claim-devto-2026-05-06.md`) could expand it. PA's view: skip — the npm-myth amendment + X post is sufficient. Avoid article-tail bloat.

5. **B3 dispatch readiness** — UNCHANGED from S64. `@name` resolution remains queued; no file conflicts with parseVariant work. 4-6h focused estimate (likely smaller).

6. **A+ verdict execution items** — UNCHANGED from S64 carry-forward. Could fold into next dispatch.

7. **Predicate-gaps inventory P-promotion** — under the Zod lens (deep-dive), 4 gaps promote to P1: `#17 transform/preprocess`, `#9 reqIf`, `#12 async predicates`, `#8 predicate aliases`. 3 new gaps surfaced (#18 named-shape breadth, #19 boundary-parsing — closing via parseVariant, #20 validator-set transform operators). Inventory revisit when A1c surfaces real-app friction OR adopter reports `reqIf` blocker.

8. **Carry-forward S62/S63/S64 unresolved set:**
   - Article truthfulness audit dispositions (15 articles, S59 carry-forward)
   - scrml.dev v0.2.0 announce refresh
   - 6 KEEP-RECENT-LANDED dirs deref (now eligible after large S64+S65)
   - Maps refresh root cause investigation (S61 issue still open)
   - Tier-ladder em-dashes decision

---

## Things S66 PA needs to NOT screw up

Standing list 1-47 from S64 hand-off carries forward verbatim. New S65 additions:

48. **`parseVariant` is the verdict-locked answer for sum-type boundary parsing.** Don't let any agent re-frame it as `parseShape`-equivalent or extend its scope to structs. The synonym test demoted `parseShape` for a reason; that decision is locked.

49. **`parseShape` is CLOSED as intentional absent** — by debate-05 verdict + judge ratification. Struct boundary parsing is a server function or §53 boundary-zone refinement on assignment. Don't accept "but `parseShape` would be ergonomic" as a re-open argument. The companion design statement must ship with the parseVariant implementation.

50. **Type-establishment-vs-predicate-enforcement is sequentially ordered.** SPARK boundary-zone refinement fires AFTER the value has a type. `parseVariant` is the operation that gives the value a type. Anyone proposing "just use refinement at the call site" for unknown JSON is missing the sequencing.

51. **String-discriminator trap mitigation = enum-only second-arg constraint at the type system.** Not a documentation concern; a compiler-enforced rule. `parseVariant(json, MyStruct)` must produce a clear "must be enum" compile error.

52. **Pro-X-voice-voting-against-X is methodology-grade signal at frequency-3.** Apply going forward: when a partisan-defender flips under its own methodology, weight the flip heavily.

53. **Article amendment posture is calibrated, not retracted.** Form-validation claim ("Zod can't fail your build. This can.") is unmodified — it survives every test. The boundary-parsing claim was overreach in absolute form ("None of it. Ever.") and is now narrowed. Don't let any agent further-soften the form-DX claim.

54. **The deep-dive's 17-gap predicate inventory was re-prioritized under the Zod lens.** P1 promotions: #8 (aliases), #9 (reqIf), #12 (async), #17 (transform/preprocess). Demoted to elimination: #1 (between), #2 (nonempty) — synonyms. Don't re-introduce demoted items under different names without sliver-test verification.

55. **L22 type-as-argument is LOCKED at the language level (S65 second tranche).** parseVariant is the FIRST family member; do NOT let any agent treat it as a one-off when planning implementation. SCOPE doc records the family roadmap; future PA's see L22 in master-list locks list.

56. **The family-bounding discipline is mandatory.** Sliver test + synonym-detection + per-feature deep-dive on every future `Type.foo` request. Without this, L22 becomes the slippery slope simplicity-defender warned about. The family-precedent doc (Step 12 of SCOPE) records this discipline; it MUST be written when parseVariant ships.

57. **`formFor` is the flagship demo.** The 1-struct → schema + form + table demo is the strongest "we are not React" pitch scrml has. PA dispatching `formFor` work later: treat it as marketing-load-bearing, not just stdlib expansion.

58. **api.js cross-file stdlib enum re-export gap (NEW S65 from Phase 2 work).** Phase 1's sniff test reported PASS but was incomplete — `match` worked via a `kind:error` shadow on `BUILTIN_TYPES["ParseError"]` (legacy `tError` entry); `!{}` exhaustiveness, which requires `kind === "enum"`, would have failed. Phase 2 fixed structurally by promoting `ParseError` to a `BUILTIN_TYPES tEnum` with the canonical 4 variants. **The underlying gap remains:** `api.js`'s `importedTypesByFile` seeder reads each dep's OWN typeDecls and does NOT chase re-exports through `index.scrml`. Future stdlib enum additions will need either builtin-status grant (the parseVariant route) OR re-export chasing in api.js. Track as v0.next follow-up; flag in any future "add a stdlib enum" dispatch brief.

59. **`export function` swallows function-decl into export-decl** (`ast-builder.js:5410`). Phase 2 tests had to drop `export` to get a reachable function-decl AST node. Not parseVariant-specific; worth documenting if it bites another dispatch.

60. **L22 family member #1 SHIPPED.** Type-as-argument is now a working scrml language primitive, not just an architectural commitment. Future family members (`serialize`, `formFor`, `schemaFor`, `tableFor`, reflective metadata) ride this precedent. The discipline that bounds the family — sliver test + synonym-detection + per-feature deep-dive — is recorded in SPEC §53.14, primer §13.6, family-precedent doc, and the SCOPE doc.

---

## State as of S65 close (verified at wrap)

| Field | Value |
|---|---|
| scrmlTS HEAD (post-wrap) | `3bef6e6` (S65 outflows commit) — push pending |
| scrmlTS origin sync | 2 commits ahead of origin/main (push pending) |
| scrml-support HEAD (post-wrap) | `c9c2182` (debate-05 judgment + insight) — push pending |
| scrml-support origin sync | 4 commits ahead of origin/main (push pending) |
| Tests | **8,941 / 44 / 1 / 0 / 8,986 / 440** (full suite) |
| Working tree (both repos) | clean (after master-list + changelog + hand-off rewrite committed) |
| Inbox | empty |
| Active agents (post-S65) | 45 (unchanged from S64) |
| Permissions whitelist | unchanged |
| Depth-of-survey-discount counter | **7** (was 6; S65 parseVariant Path A survey landed ~15-25% discount + caught 2 SCOPE drifts) |
| Design insights count (since 2026-03-22) | 30+ entries; 1 new in S65 (#4 boundary-parsing) |

### File-modification inventory (S65 — for cherry-pick / forensic review)

**scrmlTS commits (5 from session-open `0dee2f7`):**
1. `3bef6e6` — docs(s65): debate-05 outflows — npm-myth amend + X snippet + parseVariant scope
2. `4595b2c` — docs(s65-close): wrap — master-list + changelog + hand-off (initial wrap, mid-session)
3. `9c02e8b` — parseVariant SCOPE: Path A LOCKED + family roadmap recorded
4. (this commit) — second-tranche update: master-list L22 + hand-off Path-A reflection

**scrml-support commits (4 from session-open `9123af6`):**
1. `d05c79a` — debate-05 brief
2. `b2de9f6` — 5 expert positions
3. `d008caf` — debate-05 transcript assembled
4. `c9c2182` — debate-05 JUDGED + design insight #4

**Articles touched:**
- `docs/articles/npm-myth-devto-2026-04-28.md` — lines 44-48 amended (`published: true`; PUBLISHED article — public correction effective with this commit; X amendment pending Bryan's selection)
- `docs/articles/x-snippet-zod-calibration-2026-05-06.md` — NEW (`published: false`; draft for Bryan)

**Globals:** none (no agent forges this session).

---

## Cross-references

- **S64 close ledger (this rotation):** `handOffs/hand-off-64.md`
- **S65 working ledger (this file becomes):** `handOffs/hand-off-65.md` at S66 open
- **PA scrml expert primer (READ FIRST every session):** `docs/PA-SCRML-PRIMER.md` (last updated S64)
- **PA directives:** `pa.md`
- **Master-list dashboard (live progress):** `master-list.md` §0
- **parseVariant SCOPE document:** `docs/changes/parsevariant-impl/SCOPE.md`
- **X-snippet draft:** `docs/articles/x-snippet-zod-calibration-2026-05-06.md`
- **Debate-05 transcript:** `../scrml-support/docs/debates/debate-05-boundary-parsing-primitive-2026-05-06.md`
- **Debate-05 judgment:** `../scrml-support/docs/debates/debate-05-judgment-2026-05-06.md`
- **Debate-05 brief:** `../scrml-support/docs/debates/debate-05-boundary-parsing-primitive-2026-05-06-BRIEF.md`
- **5 position files:** `../scrml-support/docs/debates/debate-05-position-*-2026-05-06.md`
- **Predicate-Zod deep-dive:** `../scrml-support/docs/deep-dives/predicate-system-zod-replacement-2026-05-06.md`
- **Predicate-gaps inventory (re-prioritized):** `../scrml-support/docs/predicate-gaps-inventory-2026-05-06.md`
- **Design insights:** `../scrml-support/design-insights.md`

---

## Tags

#session-65 #close #predicate-zod-deep-dive #debate-05-judged #c-narrow-verdict #parsevariant-scope-landed #parseshape-closed #npm-myth-amended #x-snippet-drafted #design-insight-4 #pro-x-voting-against-x-frequency-3 #anti-sycophancy-convener #methodology-stack-triangulation #L22-pending
