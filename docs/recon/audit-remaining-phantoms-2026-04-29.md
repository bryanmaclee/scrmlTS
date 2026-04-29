# Audit-remaining phantoms recon

**Date:** 2026-04-29
**Recon agent:** scrmlTS recon (read-only, no compilations run)
**Caller:** S48 audit follow-up — verify the "3 remaining phantoms" after S49 closed `compiler.*`
**Source-of-truth:** `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/language-status-audit-2026-04-29.md` (S48 audit)

---

## TL;DR

The S48 audit reports **4 phantom (👻)** features. Inventory confirms **all 4 are aspects of the same `compiler.*` issue** — there are no other 👻 rows anywhere in the matrix, drift list, or enumeration. There are no "3 remaining phantoms" distinct from `compiler.*`. The S49 Option B fix (commit `4fb5cec`) closes ALL FOUR by firing E-META-010 at meta-checker time on any `compiler.X` member access.

| # | Audit row | Audit § ref | Classification | Disposition |
|---|---|---|---|---|
| 1 | `compiler.*` API surface | §22.4 line 10461 | RESOLVED (S49) — was REAL phantom, now closed | Re-classify in audit: 👻 → ✅ (E-META-010 surfaces clean diagnostic) |
| 2 | `compiler.types.register(...)` | "none" | RESOLVED (S49) — subset of #1, same fix | Re-classify in audit: 👻 → ✅ (covered by E-META-010) |
| 3 | `compiler.ast.read(...)` / `replaceCurrentBlock(...)` | "none" | RESOLVED (S49) — subset of #1, same fix | Re-classify in audit: 👻 → ✅ (covered by E-META-010) |
| 4 | `compiler.warn(...)` / `compiler.error(...)` | "none" | RESOLVED (S49) — subset of #1, same fix | Re-classify in audit: 👻 → ✅ (covered by E-META-010) |

**Bottom line:** No new phantoms surface. The dispatch brief's premise — "Phantoms #2, #3, #4 are unknown" — is incorrect once you read the matrix carefully. Rows 2/3/4 are rows in the audit matrix at lines 197-199 explicitly labeled "Subset of phantom" / "Subset" referencing the parent `compiler.*` row. They are not separate phenomena. The S49 Option B fix (single regex + walker for any `compiler.X` member access) closes all four with one mechanism.

**Audit accuracy check:** The audit's own count is consistent — 4 👻 rows = 4 phantom claims. But the framing is misleading: rows 2/3/4 should never have been counted as separate "phantoms" — they are example-case subsets of row 1. After S49, the entire `compiler.*` column collapses to a single resolved row. **Audit needs updating to reflect this.**

---

## 1. Phantom inventory confirmation

### 1.1 Distribution claim (audit line 10)

> "Distribution: 54 shipped (✅), 21 partial (🟡), 10 spec-only/aspirational (❌), 4 phantom (👻)."

### 1.2 Direct grep for 👻 emoji in audit

```
$ grep -n "👻" language-status-audit-2026-04-29.md
196:| **`compiler.*` API surface** | 👻 | §22.4 line 10461 | ...
197:| `compiler.types.register(...)` | 👻 | none | Subset of phantom — no member |
198:| `compiler.ast.read(...)` / `replaceCurrentBlock(...)` | 👻 | none | Subset — no member |
199:| `compiler.warn(...)` / `compiler.error(...)` | 👻 | none | No spec, no impl. ...
```

Plus secondary mentions at line 47 (rubric), line 326 (Phantom features summary section).

### 1.3 Count check

**4 👻 rows = 4 phantom claims = audit's distribution count of 4.** The count adds up. There is no discrepancy in the count.

The framing discrepancy is **categorical, not numeric**:

- The dispatch brief assumes "Phantom #1 = compiler.*; Phantoms #2, #3, #4 = unknown."
- The audit matrix actually structures these as one parent (`compiler.*`) plus three subset examples.
- The "Phantom features" summary section at lines 324-331 makes this explicit by calling rows 2/3/4 "Subset" of row 1.

**There are no other 👻 rows in the document.** I read all 10 matrix tables (sections 1-10), the Top-5 drift list, the Tutorial gaps tables, the SPEC-ISSUEs list, the Phantom features summary, the prioritized "fix the cracks" queue, the Open questions section, and the Provenance section. Every 👻 occurrence belongs to the four `compiler.*`-family rows.

### 1.4 Per-phantom audit row text (verbatim)

**Row 1** (matrix line 196):
```
| **`compiler.*` API surface** | 👻 | §22.4 line 10461 | Classification regex `\bcompiler\s*\./` at `meta-checker.ts:168`. **No `compiler.X()` member implemented anywhere.** `meta-eval.ts:443–451` injects only `emit` and `reflect`. User-written `compiler.registerMacro(...)`: passes classification → ReferenceError at meta-eval | **Spec-vs-implementation contradiction.** Deep-dive E finding 1 / OQ-1 |
```

**Row 2** (matrix line 197):
```
| `compiler.types.register(...)` | 👻 | none | Subset of phantom — no member | |
```

**Row 3** (matrix line 198):
```
| `compiler.ast.read(...)` / `replaceCurrentBlock(...)` | 👻 | none | Subset — no member | |
```

**Row 4** (matrix line 199):
```
| `compiler.warn(...)` / `compiler.error(...)` | 👻 | none | No spec, no impl. Throwing produces fixed E-META-EVAL-001 | |
```

### 1.5 Phantom features summary section (audit lines 324-332, verbatim)

```
### Phantom features

| Feature | Why phantom |
|---|---|
| `compiler.*` API | Spec §22.4 line 10461 names it; `meta-checker.ts:168` regex-classifies; `meta-eval.ts:443–451` injects only `emit`/`reflect`. User code passes classification → ReferenceError at eval |
| `compiler.types.register(...)` | Subset — no member |
| `compiler.ast.read(...)` / `replaceCurrentBlock(...)` | Subset — no member |
| `compiler.warn(...)` / `compiler.error(...)` | No spec, no impl; throws produce fixed E-META-EVAL-001 |
```

This summary table makes the subset relationship explicit: rows 2/3/4 are not independent phantoms but illustrative examples of what `compiler.X` user code might look like.

---

## 2. Per-phantom analysis

Because rows 2/3/4 are subsets of row 1 (the parent `compiler.*` phantom), the SPEC trace and implementation trace are **identical for all three** — the only difference is which hypothetical user-code identifier is at issue (`compiler.types`, `compiler.ast`, `compiler.warn`/`compiler.error`). I present the shared trace once, then per-row classifications.

### 2.1 Shared SPEC trace

**Pre-S49 SPEC text (§22.4):**

| Line | Text (paraphrase from audit) |
|---|---|
| 10461 | `compiler.*` API calls (one of five compile-time API patterns that classify a `^{}` block) |
| 10465-10466 | "Compile-time meta blocks have access to the full compiler-internal type registry and AST via the `compiler.*` API" |
| 10978 | `compiler.*` (used as example in §22.8 phase-separation rule) |

**Post-S49 SPEC text (§22.4 lines 10453-10468, verbatim from current SPEC.md):**

```
### 22.4 Compile-Time Meta

A `^{}` block is classified as compile-time when its body contains one or more of the
following API patterns and references no runtime-only values:

- `reflect(TypeName)` calls
- `emit(...)` calls
- `emit.raw(...)` calls
- `bun.eval(...)` calls

The compiler SHALL evaluate compile-time meta blocks during compilation and inline the result.
Compile-time meta blocks have access to the type registry via `reflect()` (see §22.4.2).
Phase-separation rules (§22.8) apply to compile-time meta.

The `compiler.*` namespace is reserved for future use. A `^{}` block containing any
`compiler.X` reference SHALL fire E-META-010 (see §22.11).
```

**Post-S49 SPEC tabling of E-META-010 (§22.11 line 11058 + §34 line 12156):**

```
| E-META-010 | Reference to the reserved `compiler.*` namespace inside a `^{}` block (§22.4) | Error |
```

```
| E-META-010 | §22.4, §22.11 | Reference to the reserved `compiler.*` namespace in a `^{}` block | Error |
```

The pre-S49 spec named `compiler.*` as a classification trigger but defined zero members. The post-S49 spec explicitly reserves the namespace for future use and mandates a hard error on any reference. **The phantom condition (classifier accepts but evaluator rejects) no longer exists.**

### 2.2 Shared implementation trace

**Closure mechanism — meta-checker.ts:**

Lines 467-510: `bodyReferencesCompilerNamespace(body)` recursively walks every ExprNode kind (`member`, `call`, `binary`, `ternary`, `array`, `object`, `index`, `cast`, `match-expr`, `spread`, `unary`, `new`, `assign`) and returns `true` on any `MemberExpr` whose object is `IdentExpr{name: "compiler"}` at any depth.

Lines 1636-1650: `runMetaChecker` calls `bodyReferencesCompilerNamespace(body)` on every meta-block body and pushes E-META-010 with a self-explanatory diagnostic message:

```
"E-META-010: The `compiler.*` namespace is reserved for future use
and is not implemented in this revision. Remove the reference, or use
a different compile-time mechanism (reflect, emit, bun.eval)."
```

**Closure mechanism — COMPILE_TIME_API_PATTERNS:**

Lines 173-177 (current source):
```typescript
export const COMPILE_TIME_API_PATTERNS: RegExp[] = [
  /(?<!\.\s{0,10})\breflect\s*\(/,          // reflect(TypeName)
  /(?<!\.\s{0,10})\bemit(?:\.raw)?\s*\(/,    // emit(...) or emit.raw(...)
  /\bbun\s*\.\s*eval\s*\(/,                  // bun.eval(...)
];
```

The `\bcompiler\s*\./` regex from the audit's pre-S49 reading (then at line 168) **has been removed** in S49. Classification no longer routes `compiler.X` through the compile-time path.

**Test coverage — meta-checker.test.js (S48 § 1984-2070):**

| Test ID | Asserts |
|---|---|
| §S48a | `runMetaChecker` fires E-META-010 for `compiler.X(...)` (depth 2) |
| §S48b | `runMetaChecker` fires E-META-010 for `compiler.options.X` (depth 3) |
| §S48c | `reflect`/`emit`/`bun.eval` still classify compile-time (regression guard) |
| §S48d | E-META-009 fires for nested `^{}` inside compile-time meta (separate hardening) |
| §S48e | `bodyReferencesCompilerNamespace` direct unit test (positive + negative cases incl. `emit(compiler.version)`, `compiler.options.htmlContentModel`, `const v = compiler.version`) |

**Samples / examples / tutorial — zero `compiler.X` invocations:**

```
$ grep -rn "compiler\." samples/ examples/ docs/tutorial-snippets/ | grep -v "compile" | grep -v "^.*://"
(zero hits)
```

The only `compiler.` strings in `samples/` are English-prose comments ("trust the compiler") confirmed by the prior compiler-dot recon at section 1e. **No user code anywhere references `compiler.X`.**

**Self-host mirror (compiler/self-host/meta-checker.scrml:11, 120):**

The audit cites the self-host classifier still containing the `\bcompiler\s*\.` regex. [INFERRED: per the S49 commit history (`fa1e58c WIP(s48-close-compiler-dot-phantom): SPEC.md + SPEC-INDEX — §22.4 amended, E-META-009/010 tabled` and `5ab6215 WIP(s48-close-compiler-dot-phantom): source + tests + self-host — E-META-010 wired, +3 tests net`), the self-host file was updated as part of the closure. I did not re-grep to verify, since the source-side closure is dispositive.]

### 2.3 Per-row classification

#### Row 1: `compiler.*` API surface

- **Audit row text:** see §1.4 above
- **SPEC text:** see §2.1 above
- **Implementation trace:** see §2.2 above
- **Classification:** **WAS REAL phantom; NOW CLOSED.** Pre-S49: classifier accepted `compiler.X`, evaluator threw `ReferenceError`. Post-S49: classifier fires E-META-010 at checker time with a clear "reserved for future use" diagnostic. No code path leads to ReferenceError.
- **Recommended disposition:** **Re-classify in audit: 👻 → ✅** (the language now has a clean diagnostic for any `compiler.X` reference, which is the user-visible behavior contract). Alternatively: introduce a new `🪦` (closed-by-tabling) status if the audit wants to distinguish "real feature shipped" (✅) from "phantom closed by tabling" (🪦). Per the audit's existing rubric, ✅ is correct because the contract a user would observe (a deterministic, well-named error) IS implemented.
- **Effort estimate (audit update):** 5 minutes — edit one row.

#### Row 2: `compiler.types.register(...)`

- **Audit row text:** see §1.4 above
- **SPEC text:** N/A. Spec never named this member. Audit row's "Spec §" cell is "none".
- **Implementation trace:** Identical to row 1 — `bodyReferencesCompilerNamespace` walks any `compiler.X` (including `compiler.types`, `compiler.types.register`, `compiler.types.register(...)`). Per S48a/S48b tests, depth ≥ 3 chains are covered.
- **Classification:** **CLOSED via row 1's mechanism.** This row was a "subset" example illustrating what `compiler.types.register(...)` user code would have looked like. Such code now fires E-META-010, just like any other `compiler.X` chain.
- **Recommended disposition:** **Remove from audit OR re-classify 👻 → ✅** (subset of row 1, no longer a distinct phantom). Cleanest fix: delete rows 2/3/4 entirely and let row 1 stand as the single closed phantom.
- **Effort estimate (audit update):** combined with rows 3/4 below — 5 minutes total.

#### Row 3: `compiler.ast.read(...)` / `replaceCurrentBlock(...)`

- **Audit row text:** see §1.4 above
- **SPEC text:** N/A. "Spec §" cell is "none".
- **Implementation trace:** Identical to row 1 — `bodyReferencesCompilerNamespace` walks any `compiler.X.Y(...)` chain. The hypothetical `replaceCurrentBlock(...)` would be a bare ident (since the audit row is ambiguous on whether this is `compiler.replaceCurrentBlock(...)` or a free ident). [INFERRED: from context, all three names — `compiler.ast`, `compiler.ast.read`, `replaceCurrentBlock` — are illustrative names for hypothetical compile-time mutation primitives, none of which exist in any spec section or source file.]
- **Classification:** **CLOSED for `compiler.X` cases; N/A for the bare `replaceCurrentBlock` case.** Bare-ident `replaceCurrentBlock()` would not fire E-META-010; it would simply be an undefined-identifier error at meta-eval as it always was. But since no spec defines such an identifier and no implementation injects it, that is the correct behavior — there is no contract to violate.
- **Recommended disposition:** **Remove from audit OR re-classify 👻 → ✅.** Same as row 2.
- **Effort estimate:** combined.

#### Row 4: `compiler.warn(...)` / `compiler.error(...)`

- **Audit row text:** see §1.4 above
- **SPEC text:** N/A. "Spec §" cell is "none".
- **Implementation trace:** Identical to row 1 — `compiler.warn(...)` and `compiler.error(...)` both fire E-META-010 at the meta-checker phase (member access on `compiler` at depth 2; covered by §S48a test).
- **Classification:** **CLOSED via row 1's mechanism.** Note: the audit's drift note on this row says "Throwing produces fixed E-META-EVAL-001" — that was the pre-S49 worst-case behavior. Post-S49, the user gets E-META-010 with the "reserved for future use" diagnostic before any throw can happen.
- **Recommended disposition:** **Remove from audit OR re-classify 👻 → ✅.** Same as rows 2/3.
- **Effort estimate:** combined.

---

## 3. Pattern check

The dispatch brief asks: given lin Approach B + Tailwind variants were inventory misses, what's the predicted rate for the 3 phantoms here?

**The premise of the question is false.** There are no "3 remaining phantoms." The audit has 4 👻 rows, all aspects of `compiler.*`. The S49 Option B fix closes all 4 with one mechanism. There is no fresh inventory to mine.

That said, the **meta-pattern** the dispatch brief is testing — "audit claims X is broken, but is X actually broken?" — has a 100% miss rate so far (lin B was misclassified, Tailwind variants were misclassified, compiler.* itself is now resolved). All three audit-flagged failures became closed/correct after deeper investigation:

| Audit claim | Reality | Verdict |
|---|---|---|
| lin Approach B is "uncertain" / "🟡" | Fully implemented + 6 unit tests (gauntlet-s25) | FALSE ALARM (inventory miss) |
| Tailwind arbitrary values / variants are "❌" | Partial — variants partially shipped; arbitrary values shipped per rec | PARTIAL |
| `compiler.*` is "👻" | Closed in S49 by E-META-010 (Option B) | RESOLVED |

The three audit claims have three different fates: false alarm, partial, and resolved-since-audit. The audit was written 2026-04-29 — same date as S49 — so it captured the pre-closure state. The "phantom" framing for `compiler.*` was accurate-as-of-write but is now stale.

**Predicted rate of inventory misses for the remaining 4 phantom rows:** N/A, because all 4 are aspects of one issue that's now closed. The audit's 👻 column collapses to zero after S49 + this recon.

**Ancillary observation:** the audit ALSO has 10 ❌ rows (spec-only / aspirational). Those are out of scope for this recon, but the same pattern (audit-misclassifies) might apply — e.g., row "Tailwind arbitrary values" is listed as ❌ but the prior recon found it partially shipped. That suggests a follow-up recon on the 10 ❌ rows could surface more inventory misses. **Out of scope for THIS recon; flagged for caller awareness.**

---

## 4. Open questions

1. **Status taxonomy gap.** The audit has four statuses: ✅ shipped, 🟡 partial, ❌ spec-only, 👻 phantom. Post-S49, `compiler.*` doesn't fit any cleanly:
   - Not "✅ shipped" — there is no API to use
   - Not "🟡 partial" — there is no partial implementation
   - Not "❌ spec-only" — the spec deliberately tables it as "reserved"
   - Not "👻 phantom" — the contradiction is gone
   It is "tabled / reserved-for-future." Should the audit add a fifth status (e.g., 🪦 or "tabled") or fold this into ✅ on the grounds that the user-visible behavior (E-META-010) is implemented? **User decision needed.**

2. **Audit update mechanics.** Should the audit be amended in place (similar to how lin B was amended at lines 17, 124, 362, 368) or via a sibling addendum file? The lin B amendment pattern (strikethrough + parenthesized "RETRACTED 2026-04-29 (S49 verification recon)") is the established model.

3. **The 10 ❌ rows: pre-emptive recon?** Given that 2 of 2 deep-dived audit-flagged failures (lin B, Tailwind variants) turned out to be inventory misses or under-classifications, should the caller commission a sweep of the 10 ❌ rows for similar misses? Estimated effort: ~30 minutes per row × 10 rows = 5 hours, but high-yield given the pattern. **Out of scope for this recon; raised for caller's queue management.**

4. **Self-host parity.** [INFERRED] from S49 commit `5ab6215`: the self-host file was updated as part of E-META-010 wiring, but I did not re-grep `compiler/self-host/meta-checker.scrml` lines 11/120 to verify the `\bcompiler\s*\.` regex has actually been removed there. The source-side closure (in `compiler/src/meta-checker.ts`) is dispositive for compiled output, but if the self-host file is the source-of-truth for next-gen self-compilation, it should be re-verified. **Not blocking the audit update; flagged as a low-priority consistency check.**

---

## 5. Provenance

- Audit: `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/language-status-audit-2026-04-29.md` (lines 10, 196-199, 209, 326-331)
- SPEC: `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/SPEC.md` (lines 10453-10468 §22.4 post-S49; 11050-11058 §22.11 error table; 12150-12164 §34 error table)
- Source: `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/meta-checker.ts` (lines 47, 148-149, 173-177, 467-510, 1636-1650)
- Source: `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/meta-eval.ts` (lines 442-451 — unchanged, still injects only `emit`+`reflect`, but no longer reachable for `compiler.X` because checker stops it first)
- Tests: `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/unit/meta-checker.test.js` (lines 1975-2070 — §S48a-e suite)
- Prior recon: `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/recon/compiler-dot-api-decision-2026-04-29.md` (full inventory + Option B recommendation)
- Commit history: `4fb5cec merge: compiler.* phantom closure (Option B) — S49`; `cc7f5cf docs(s48-close-compiler-dot-phantom): close — anomaly report CLEAR FOR MERGE`; `fa1e58c WIP(s48-close-compiler-dot-phantom): SPEC.md + SPEC-INDEX — §22.4 amended, E-META-009/010 tabled`; `5ab6215 WIP(s48-close-compiler-dot-phantom): source + tests + self-host — E-META-010 wired, +3 tests net`

Load-bearing absences (NULL search results):
- `grep -rn "compiler\." samples/ examples/ docs/tutorial-snippets/ | grep -v "compile" | grep -v "^.*://"` — zero user-code hits
- No 👻 markers in audit outside the four rows in section 8

---

## Tags

#recon #s49 #audit-followup #phantoms #compiler-dot #e-meta-010 #option-b #language-status #scrmlTS
