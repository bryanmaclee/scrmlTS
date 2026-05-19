---
title: serialize — SCOPING + L22 family-discipline gate-walk (PRE-FLIGHT FINDING)
date: 2026-05-19
session: S103
authority: SPEC §53.14.3 (`serialize(value, EnumType)` listed planned; sliver-test PASSES verdict pre-dates S90 wire-format infrastructure) + §53.14.4 (family discipline: 4 gates per addition) + family-precedent doc `scrml-support/docs/type-as-argument-family-2026-05-06.md`
family_position: THIRD general-position L22 member candidate (after parseVariant S65 + formFor S102-S103)
status: **STASHED S103** — user selected Path B (pivot to schemaFor). Deep-dive plan reserved at §5 + §7 + §8 OQs for revival if adopter friction signals a serialize-shaped gap OR if schemaFor / tableFor implementations surface an edge that would benefit from L22-serialize-as-primitive. The §53.14.4 discipline pre-flight finding (Gate 2 synonym risk vs `wireEncode(v)` stdlib helper) stands as the load-bearing reason for the stash; revive trigger requires either: (a) ≥2 adopter friction reports requesting compile-time-checked round-trip-law guarantee, (b) formFor/schemaFor/tableFor impl surfaces a value-encoding edge `wireEncode` can't cover, OR (c) reflective-metadata family member needs the symmetric encode-path. Until revival: serialize is NOT on the v0.4-v1.0 roadmap; §53.14.3 family-roster row stays "planned (~6-12mo)" with a footnote pointer to this SCOPING.
---

# serialize — SCOPING (STASHED S103)

> **STASH BANNER:** This SCOPING is RESERVED, not active. User ratified Path B at S103 — pivot to schemaFor as the next L22 family member, defer serialize pending one of three revival triggers documented in the YAML status. The pre-flight Gate 2 synonym risk (vs `wireEncode(v)` stdlib helper) stands; the deep-dive plan in §5 + the OQs in §8 are READY-TO-FIRE if revived. Do NOT delete this doc; it is the load-bearing record of the §53.14.4 discipline catching a likely-synonym before spec/impl commits.

## Pre-flight finding (lead with it per S95 shoot-straight rule)

**serialize may be a synonym for `JSON.stringify(_scrml_wire_encode(value))`.** The §53.14.3 sliver-test PASSES verdict for serialize was authored at S65 (parseVariant landing). At that time, the wire-format infrastructure did NOT exist. The `_scrml_wire_encode(value)` runtime helper (handles `T | not` envelope wrapping) + `_scrml_wire_decode(value)` client-side dual-decoder landed S90 as M-7C-D-12 Track 2 (5+ months after the §53.14 family was framed).

With wire-format infrastructure in place, the substantive value-add of a serialize primitive is QUESTIONABLE. This is the kind of finding the §53.14.4 discipline exists to surface BEFORE spec or impl lands. The honest position: deep-dive needed to validate vs. invalidate.

This SCOPING walks the 4 gates with the wire-format-exists context in mind, surfaces the Gate 2 concern, and structures the deep-dive briefing.

---

## §1. Authority + family position

**Family roster status (per SPEC §53.14.3, updated S103 `6cc426c`):**

| Member | Status | Updated |
|---|---|---|
| parseVariant | shipped S65 | — |
| **formFor** | **shipped S102 (FLAGSHIP)** | S103 `6cc426c` |
| **serialize** | **PLANNED — THIS SCOPING** | — |
| schemaFor | planned | — |
| tableFor | planned | — |
| variantNames / reflective | planned | — |

The roadmap order at S65 was `parseVariant → serialize → formFor → schemaFor → ...`. formFor jumped ahead per S101 user direction (v0.4 anchor; flagship). serialize is the canonical "next in line" but may not be the right next.

---

## §2. Gate 1 — Per-shape sliver test

**Question:** is serialize a sliver of something already expressible in scrml, or does it carve a distinct shape?

**Current alternatives that achieve "encode a typed value for wire/storage":**

| Surface | Coverage of "serialize(v, T)" | Gap |
|---|---|---|
| `JSON.stringify(v)` (Bun built-in) | ~95% — enum + struct values stringify correctly per the codegen shape (`{variant: "Tag", data: {...}}`) | Doesn't apply §57 wire-format envelope for `not` (emits raw `null`); no type-validation |
| `JSON.stringify(_scrml_wire_encode(v))` | ~99% — adds §57 envelope correctly | No type-validation; user must compose two calls |
| `_scrml_wire_encode(v)` alone (server-fn return path) | Already canonical for `T \| not` server returns | Not invokable from user code; emit-server.ts owns it |
| Custom `toJSON()` per enum/struct | Per-type opt-in; covers any encoding shape | Requires per-type authoring; no language-level guarantee |

**The 1% gap** serialize would cover:
1. **Type-validation at boundary** — catch "value doesn't match T at runtime due to a foreign-code intrusion" bugs. JSON.stringify doesn't validate; it just stringifies whatever.
2. **Compile-time monomorphization** — the call site emits the exact encoder for type T (no runtime type-dispatch). Marginal perf win over generic JSON.stringify.
3. **Symmetric API** with parseVariant for adopter mental model — language-level naming consistency.
4. **Language-guaranteed round-trip law** — `parseVariant(serialize(v, T), T) == .Ok(v)` is a structural invariant the language commits to upholding.

**Sliver-test verdict:** **WEAK PASS.** serialize covers a substantive ~1% gap (type-validation + round-trip law), but the gap is narrower than parseVariant's gap (which was 100% — without parseVariant, untyped JSON cannot become typed enum). The "weak pass" framing means Gate 2 (synonym-detection) is the load-bearing filter.

---

## §3. Gate 2 — Synonym-detection (LOAD-BEARING per Gate 1 weakness)

**Claim under test:** serialize is NOT a synonym for `JSON.stringify(_scrml_wire_encode(v))`.

**Pillar 5b reach test:** when an adopter needs "encode this typed value for wire," what does the canonical reach look like?

Today (no serialize):
```scrml
const wire = ^{ JSON.stringify(_scrml_wire_encode(${v})) }
// or, inside server-fn: just `return v` — emit-server.ts handles the encoding
```

With serialize:
```scrml
const wire = serialize(v, T)
```

The ergonomic delta is REAL but SMALL: 1 call vs 2-call composition + a meta-block escape. Adopters reaching for the type-as-argument syntax expect a substantive surface (parseVariant has structural NEED for the type arg; serialize uses it decoratively).

**Cross-check against the canonical synonyms (rejected family members per debate-05 verdict):**

| Synonym precedent | Was it a synonym? | Why | Does serialize look like this? |
|---|---|---|---|
| `parseShape(json, StructType)` | YES — synonym for §53.4 SPARK boundary refinement | Predicates + boundary-typed assignment already cover struct boundary parsing | **PARTIAL MATCH.** serialize covers what JSON.stringify + _scrml_wire_encode already do for ~99% of cases. The 1% gap (type-validation + round-trip law) is real but narrow. |
| `parseArray(json, T)` | YES — synonym for `[].map(parseVariant)` | Composition over an existing primitive | NOT a match for serialize. |
| `parsePartial(json, T)` | YES — covered by `formFor(T, partial=true)` per Gap #20 closure | Different primitive's existing degrees-of-freedom cover the use case | NOT a match for serialize. |
| `~ wireEncode(v)` helper (hypothetical) | NOT proposed; arguably the cleanest synonym for serialize | Pure-function helper without type-as-argument syntax | **YES — this is what serialize might collapse to.** A non-L22 `wireEncode(v)` stdlib helper could deliver 99% of serialize's value without the type-as-argument architectural cost. |

**Gate 2 verdict:** **AT RISK.** The strongest synonym for serialize is a hypothetical `wireEncode(v)` stdlib helper that uses neither type-as-argument syntax nor compile-time monomorphization. If that helper is the right shape, serialize-as-L22 is over-architected for the 1% gap.

**Counter-argument** (deep-dive should test): the language-level guarantee of the round-trip law `parseVariant(serialize(v, T), T) == .Ok(v)` is structurally valuable. A stdlib `wireEncode(v)` cannot provide that guarantee because the type arg is missing on the encode side; the law becomes "best effort" rather than "compiler-enforced." But — is "compiler-enforced round-trip law" load-bearing for adopters, or is it methodology-grade infrastructure for the spec to brag about? **Adopter signal needed; deep-dive territory.**

---

## §4. Gate 3 — Asymmetric forfeit-cost decomposition

**Cost of NOT shipping serialize:**
- Adopters compose `JSON.stringify(_scrml_wire_encode(v))` per-call (boilerplate)
- Round-trip law is "best effort" not "compiler-enforced"
- Asymmetric API surface vs parseVariant (mental model friction)
- For boundary-typed values, no compiler-checked encode path

**Cost of shipping serialize:**
- ~12-18h dispatch (similar architecture to parseVariant: type-system pass + emit-serialize.ts + 6 error codes + tests + runtime helper)
- L22 family-cost amortization (paid once across all family members)
- v0.4+ horizon work
- Adds another type-as-argument special form (more compiler surface)

**Cost of shipping `wireEncode(v)` stdlib helper instead** (the synonym alternative):
- ~2-4h dispatch (single stdlib function + thin runtime helper)
- No L22 architectural cost
- No type-as-argument syntax (different mental model than parseVariant)
- Round-trip law degraded to "best effort"

**Verdict:** if Gate 2 finds serialize IS a synonym for `wireEncode(v)` + stdlib, the forfeit-cost favors shipping the smaller helper. If Gate 2 finds the round-trip law is load-bearing, serialize-as-L22 is right despite the small Gate 1 sliver.

---

## §5. Gate 4 — Per-feature deep-dive (RECOMMENDED FIRE)

Per the methodology rule (S102 OQ-FF-7 closure precedent), Gate 4 fires when:
- Gate 2 surfaces substantive synonym risk, OR
- Convener has substantive doubts that the design surface cannot resolve in SCOPING, OR
- OQ count exceeds ~5 with MEDIUM-or-lower confidence

All three trigger here. Deep-dive RECOMMENDED.

**Anticipated deep-dive questions (OQs):**

1. **OQ-SER-1** — Is the round-trip law `parseVariant(serialize(v, T), T) == .Ok(v)` load-bearing for adopters, or methodology-grade infrastructure? Adopter friction empirical signal required.
2. **OQ-SER-2** — Is `wireEncode(v)` stdlib helper an acceptable substitute for serialize? Walks the Gate 2 synonym test in detail.
3. **OQ-SER-3** — Failure mode — `serialize` returns string vs `serialize(v, T)!` returns failable (catches "value doesn't match type" intrusions from foreign code)?
4. **OQ-SER-4** — Wire-format envelope choice — `_scrml_wire_encode` applies envelope on `T | not`; should `serialize(v, T)` ALSO emit envelope, even when `T` doesn't allow `not`? (Probably yes for symmetry with parseVariant.)
5. **OQ-SER-5** — Per-variant override (custom `toJSON` per variant)? Tension with the round-trip law.
6. **OQ-SER-6** — Compile-time monomorphization vs runtime dispatch? parseVariant precedent says monomorphize.
7. **OQ-SER-7** — Streaming support for large objects? Probably DEFER to v1.next.
8. **OQ-SER-8** — Custom replacer slot (JSON.stringify's second arg)? Probably reject — breaks the round-trip law.
9. **OQ-SER-9** — Schema-conformance side-effect on encode? Probably reject — would surface schema mismatches as encode errors; cleaner to keep encode pure.
10. **OQ-SER-10** — Relationship to `<schema>` shared-core validators — serialize could validate against the schema's predicate set. Probably DEFER — separate concern.
11. **OQ-SER-11** — Symmetry with parseVariant's `ParseError` enum — serialize's `SerializeError` enum if failable? What variants?

**11 OQs** at MEDIUM-or-lower confidence per the methodology rule → debate-style deep-dive.

---

## §6. Alternative — pivot to schemaFor or tableFor

If Gate 2 deep-dive validates the "serialize is a synonym" finding, the natural next L22 family member becomes:

**schemaFor(StructType) — emits `<schema>` SQL DDL from struct fields + predicates.**
- Gate 1: PASSES STRONG — no existing surface generates schema DDL from struct types; closes the §39+L4 vocabulary-unification loop ("define type once → schema, form, validator, parser all derive")
- Gate 2: PASSES STRONG — no synonym (manual `<schema>` authoring is the alternative; that's per-app, not language-level)
- Gate 3: STRONG forfeit-cost — without schemaFor, struct types + schema DDL drift apart
- Gate 4: probably 4-6 OQs; deep-dive justifiable but smaller surface than formFor

**tableFor(StructType, rows) — auto-`<table>` from struct + rows.**
- Gate 1: PASSES STRONG — admin-UI lift; no existing surface generates table markup from struct types
- Gate 2: PASSES STRONG — sibling pattern to formFor (markup generation from type)
- Gate 3: MODERATE forfeit-cost — alternatives are per-app table authoring
- Gate 4: similar OQ shape to formFor; ~8-10 OQs likely

**variantNames(EnumType) / reflective metadata — small primitive.**
- Smaller surface; less interesting; ~2-4h dispatch if pursued
- Gate 1: PASSES (no existing surface exposes variant lists as runtime values)
- Gate 2: PASSES (`Object.keys` on enum type doesn't work for scrml's enum shape)

**PA recommendation:** if serialize gates out, **pivot to schemaFor** as the next L22 family member. schemaFor has the cleanest gate-walk + closes the §39+L4 vocabulary-unification loop that's been waiting since L4 landed.

---

## §7. Sequencing

```
A — Deep-dive on serialize (~3-5h structured-research dispatch)
   ↓
   IF Gate 2 PASSES (serialize is NOT a synonym):
     → serialize SPEC + impl dispatch (~12-18h, mirroring parseVariant Phase 2)
   IF Gate 2 FAILS (serialize is a synonym for wireEncode + stdlib):
     → drop serialize from family roster per §53.14.4 discipline (precedent: parseShape, parseArray, parsePartial)
     → PIVOT to schemaFor SCOPING (~1-2h PA-direct, mirroring this SCOPING shape)

OR

B — Skip serialize evaluation; PIVOT directly to schemaFor SCOPING
   ↓
   schemaFor SCOPING is structurally STRONGER per pre-flight analysis;
   may be the right "continue L22 family" move regardless of serialize outcome
```

---

## §8. OQs for user disposition BEFORE next move

1. **Q-SER-OPEN-1 — Deep-dive on serialize first, OR pivot to schemaFor?** Path A (deep-dive serialize) is methodologically clean but may end in "drop serialize" verdict. Path B (pivot to schemaFor) jumps to a member with stronger gate-walk. PA recommends Path B given the pre-flight finding's strength; preserves L22 family advancement velocity. Path A is justified if you want to litigate serialize-as-family-member rigorously rather than implicitly drop it.
2. **Q-SER-OPEN-2 — IF Path A and Gate 2 PASSES → authorize serialize dispatch as next?** ~12-18h. Subject to Path A outcome.
3. **Q-SER-OPEN-3 — IF Path A and Gate 2 FAILS → drop serialize from family roster AND/OR ship `wireEncode(v)` stdlib helper as the substitute?** Stdlib helper is ~2-4h independent dispatch; would close the adopter-side ergonomic gap without L22 architectural cost.

---

## §9. Tags

#l22-family #serialize #gate-walk #scope-pre-flight #wire-format-collision #s103 #pivot-candidate-schemaFor #pivot-candidate-tableFor #synonym-detection-risk
