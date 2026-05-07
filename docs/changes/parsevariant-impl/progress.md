# parseVariant implementation — progress

## Phase 1 — STATUS

[2026-05-06 20:35] - Startup verification: pwd=/home/bryan-maclee/scrmlMaster/scrmlTS; HEAD=2d38e000 (matches expected); `bun run pretest` passed (12 samples compiled).
[2026-05-06 20:38] - L22 record landed at scrml-support: commit `5e25586` (lock: L22 type-as-argument language primitive (S65 debate-05 + Path A)). Adds §3.22 detail, lock-table row, and source-artifact cross-refs in `docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md`.
[2026-05-06 20:42] - stdlib/data/parse.scrml created + stdlib/data/index.scrml re-export added: commit `c2fc731` on scrmlTS (this commit also bundled SPEC §41.13 from parallel Phase 3 work). parse.scrml declares `ParseError:enum` (4 variants: MissingDiscriminator, UnknownVariant(tag), InvalidPayload(field, reason), Malformed(reason)) plus `parseVariant(json, T)! -> ParseError` marker export with defensive runtime fallback.
[2026-05-06 20:48] - Sniff test result: **PASS**. Two scrml fixtures compiled clean against `import { ParseError } from 'scrml:data'`:
  - Fixture 1 (qualified + bare-dot variant access): `ParseError.Malformed(...)`, `.MissingDiscriminator`, `.UnknownVariant("foo")`, `.InvalidPayload(f, r)` all type-resolve and codegen.
  - Fixture 2 (exhaustive match): all four `ParseError` variants matched in a `match e { ... }` block — compiled clean. Cross-file stdlib enum import resolves into the importing file's typeRegistry, including for exhaustiveness checking. Risk #1 (cross-file stdlib enum resolution) is **CLOSED**.
[2026-05-06 20:50] - Full suite: **8941 pass / 44 skip / 1 todo / 0 fail / 8986 total**. Exact baseline match. Zero new failures from Phase 1 changes.

## Phase 1 verdict

**GREEN.**

- L22 lock recorded at scrml-support (commit `5e25586`).
- ParseError + parseVariant marker scaffold landed at scrmlTS (commit `c2fc731`).
- Cross-file stdlib enum import resolution VERIFIED — Risk #1 closed.
- Exhaustiveness check VERIFIED against ParseError.
- Full test suite green, baseline unchanged.

Phase 2 (TS pass + codegen — `E-PARSEVARIANT-TYPE-NOT-ENUM` riding the `E-ENGINE-004` helper, plus `emit-parse-variant.ts` modeled on `emit-machines.ts`) can fire.

## Notes for Phase 2 dispatch

- The committed parse.scrml is the marker stub. Phase 2 codegen at each call site supersedes it; the body's `fail ParseError.Malformed("internal: parseVariant not monomorphized at call site")` is a defensive fallback only.
- `compiler/SPEC.md` §41.13 (parseVariant API entry) was added in the same commit as the stdlib scaffold (parallel Phase 3 work bundled in). Phase 3's remaining items (§53.10 type-as-argument family subsection + §34 catalog adds + family-precedent doc + primer/kickstarter updates) still need to fire.
- `!{}` handler integration verified at the type-resolution level via the exhaustive-match sniff; full `!{}` codegen integration will be exercised in Phase 2 once the call's failure-type is annotated by the TS pass.

## Phase 3 — STATUS

[2026-05-06 20:42] - SPEC §41.13 landed: commit `c2fc731` (bundled with Phase 1 stdlib scaffold — Phase 1 + Phase 3 ran concurrently and the stdlib/data/parse.scrml + stdlib/data/index.scrml files were untracked in working tree at the time of `git add compiler/SPEC.md && git commit`, so the commit caught all three changes). Content correct on both sides; Phase 1's verdict GREEN unaffected.
[2026-05-06 20:46] - SPEC §53.14 landed: commit `b07072f`. Type-as-argument primitives subsection (~76 lines added). Numbering surfaced: brief specified §53.10 but that slot is already occupied (Interaction with `protect=`); landed at §53.14 (next free slot after §53.13 Open Questions, before §54). Brief and SCOPE doc reference §53.10/§53.x — future readers should follow the §53.14 anchor. Subsection covers §53.14.1-§53.14.6: motivation (type-establishment vs predicate-enforcement), reflect() meta-block precedent, family table (parseVariant shipped + 5 planned), discipline (4 gates), compile-time recognition, stdlib-declared types and cross-file resolution.
[2026-05-06 20:48] - SPEC §34 catalog 4 codes added: commit `56c6b4b`. E-PARSEVARIANT-TYPE-NOT-ENUM (compile-time, TS) + E-PARSEVARIANT-DISCRIMINATOR-MISSING / -UNKNOWN-VARIANT / -INVALID-PAYLOAD (runtime via ::ParseError variants).
[2026-05-06 20:51] - Family-precedent doc landed (scrml-support): commit `5efdd05` at scrml-support. `docs/type-as-argument-family-2026-05-06.md` (~227 lines). Future-PA gate-keeping reference; covers family roadmap, 4-gate discipline, methodology stack (debate-02/03/04), what was rejected and why (parseShape, parseArray, parseRecord/Tuple/Partial), future-PA checklist.
[2026-05-06 20:53] - Primer + kickstarter updates landed: commit `549d741` at scrmlTS. Primer §10 stdlib catalog row extended; §13 locks table L22 added; §13.5 spec-real-estate row updated to ACTIVE for parseVariant; §13.6 NEW (type-as-argument family short reference + family member table + authority chain + what-was-rejected list). Kickstarter §3 anti-pattern table 2 new rows + §3a NEW (Type-as-argument primitives — worked example + family roadmap + discipline + what-doesn't-exist).
[2026-05-06 20:54] - predicate-gaps inventory updated: commit `fc7fe93` at scrml-support. Gap #19 explicitly added + CLOSED status (debate-05 + S65). Gap #20 added with planned closure via formFor(StructType, partial=/pick=/omit=). Frontmatter status flipped.

## Phase 3 verdict

**GREEN with one caveat:** `§53.10` slot was already occupied by the existing "Interaction with `protect=`" subsection. The new type-as-argument primitives subsection landed at `§53.14` (next free slot after §53.13 Open Questions). The brief, SCOPE doc, and primer §13.6 reference vary between `§53.x` / `§53.10` / `§53.14`; Phase 3 reconciled by using `§53.14` consistently in primer/kickstarter/inventory/family-precedent doc, and noted in SPEC §53.14 itself why the slot moved. The §41.13 entry's cross-ref to §53.14 is correct as committed; the SCOPE/SURVEY docs and the L22 record at scrml-support still reference `§53.x` / `§53.10` and may want a follow-up sweep, but the canonical anchor is `§53.14` going forward.

Phase 2 (compiler implementation) can reference all spec entries:
- §41.13 (parseVariant API)
- §53.14 (type-as-argument family framing — note the moved-from-§53.10 anchor)
- §34 (E-PARSEVARIANT-TYPE-NOT-ENUM compile code + 3 runtime codes)
- Family-precedent doc at `scrml-support/docs/type-as-argument-family-2026-05-06.md` (gate-keeping reference)

## Phase 3 commits

scrmlTS:
- `c2fc731` — spec(§41.13): parseVariant API entry (bundled with Phase 1 stdlib scaffold)
- `b07072f` — spec(§53.14): type-as-argument primitives subsection — family framing + discipline
- `56c6b4b` — spec(§34): 4 new error codes for parseVariant
- `549d741` — docs(s65): primer §10/§13/§13.6 + kickstarter §3/§3a — parseVariant + type-as-argument family

scrml-support:
- `5efdd05` — docs(family): type-as-argument family — discipline + roadmap
- `fc7fe93` — docs(s65): predicate-gaps inventory — Gap #19 CLOSED via parseVariant + Gap #20 added

## Phase 3 → unexpected findings (for PA awareness)

1. **§53.10 slot collision.** The existing §53.10 subsection (Interaction with `protect=`) was not surfaced in the SCOPE/SURVEY/brief. Landed at §53.14 instead.
2. **Primer §14 already exists** ("What this primer does NOT cover"). Brief specified primer §14 for the new type-as-argument family reference; landed at primer §13.6 (between §13.5 and existing §14) instead.
3. **Kickstarter is v1, not v2.** Brief referenced `§11 anti-patterns` and `~line 750`; the file is `llm-kickstarter-v1-2026-04-25.md` (694 lines), section 3 is the anti-pattern table, section 5 is the stdlib catalog. Updated section 3 + section 5 + new section 3a accordingly.
4. **Concurrency artifact:** Phase 1's stdlib files were untracked in working tree when Phase 3's first commit (`git add compiler/SPEC.md && git commit`) ran, but Phase 1 had already staged them; the commit caught all three changes. Net result was clean (correct file content on both sides), but the commit-attribution mixes Phase 1 + Phase 3 work. Phase 1's progress note already documents this.

