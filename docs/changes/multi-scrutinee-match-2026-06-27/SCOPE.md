# Multi-Scrutinee Match (Q-MATCH) — ratification record + build scope

**Change-id:** `multi-scrutinee-match-2026-06-27` · **Status:** SPEC W1 LANDED (§18.19, Nominal) · build = ss43 (W2) · **Ratified S224 (2026-06-27).**

## What + why
The compiler-reimagining narrow-Road-B program (RULING `docs/changes/compiler-reimagining-derisk-2026-06-26/RULING.md`) makes the compiler a set of **pure `fn` `match`-folds**. The canonical per-step shape — every build wave's dispatch core — is a 2D dispatch on `(currentState, event)`:

```scrml
fn step(st: LexState): LexState {
    return match (st.mode, classify(st.cur, lastKind(st))) {
        (.InCode, .SawQuote(q))             :> scanString(st, q)
        (.InCode, .SawBacktick)             :> enterTemplate(st)
        (.InTemplateBody, .SawInterpClose)  :> closeInterp(st)
        (_, .SawEof)                        :> emitEof(st)
        | _                                 :> advanceOne(st)
    }
}
```

This shape **did not compile** before S224 (R26-confirmed: `E-CG-003 match expression had no lowerable arms`). The `(state × event)` product-dispatch existed ONLY engine-bound (§51.0.S `accepts=`) — Approach A, the reactive-runtime vehicle the lexer-slice DD **rejected** (GAP-A1). Q-MATCH lifts it into a standalone, pure, value-return `match`.

## The ratified design (S224 — via AskUserQuestion + Rule-3 calls)
1. **Surface (user-ratified, paren-comma):** `match (e1, …, eN) { (p1, …, pN) :> body }`. Recognized by a `,` at paren-depth 1 in the head; `match (e)` (no comma) stays single-scrutinee.
2. **No-tuple invariant intact (S222):** the parens/commas are bounded grammar, NOT a tuple value — no `.0`/`.1`, nothing of tuple type flows; `let t = (a,b)` still not-a-tuple, `fn f() -> (A,B)` still illegal. A control-flow form (parallel discrimination), NOT a Rust tuple-match. Consistent with no-tuple, not a reversal.
3. **Bindings (§18.7):** payload bindings in any position, in scope across the whole arm body; each `lin` scrutinee consumed (§18.12).
4. **Product exhaustiveness (extends §18.8):** cross-product of per-position §18.8.1 variant-set coverage — deterministic, guard-free (§18.10 rationale preserved). Missing combination → **E-TYPE-020** (enum) / **E-TYPE-006** (union position), message names the uncovered `(V1 × … × VN)` cell. `partial match (…)` opts out. Enum-subset (§53.15) narrows a position.
5. **Nested-pattern exclusion (§18.11/DC-018) PRESERVED — breadth not depth:** each position is single-level. `(.A, .B(x))` legal; `(.A(.B(x)), c)` stays `E-SYNTAX-012`.
6. **Scope v1:** JS-style value-return ONLY, N-ary (N≥2). Block-form `<match for=(A,B)>` DEFERRED (§51.0.S already serves the reactive/2D-UI case).
7. **Codegen:** desugar to nested single-scrutinee dispatch — observationally identical to a hand-written nested match. No new runtime.
8. **New §34 code (NAMED, lands WITH impl per Rule 4 — §60/§61/§26.8 precedent):** `E-MATCH-SCRUTINEE-ARITY` (arm pattern-count ≠ head scrutinee-count). Reuses E-TYPE-020/006, E-SYNTAX-012/011, E-MATCH-SUBSET-DEAD-ARM, E-MATCH-ARM-SEPARATOR.

## Authority
- SPEC §18.19 (normative, this landing) + §18.2 grammar note.
- Lexer-slice DD `scrml-support/docs/deep-dives/compiler-reimagining-lexer-slice-2026-06-26.md` (Approach B; OQ3 = this form).
- §51.0.S (the engine-bound sibling — same product-dispatch, different vehicle).
- No-tuple: §59.7 / §14.11; RULING §3 + user-voice S222.

## Build (W2 = ss43) — the live pipeline, native-parser FROZEN
Target the LIVE Acorn-backed front-end (the native-parser is transition-frozen per RULING §4 — do NOT touch it; its `.scrml`/`.js` mirrors are feature-stale by design): parser recognition (multi-scrutinee head + product-pattern arms) + typer product-exhaustiveness (`type-system.ts:checkMatchDiagnostics`) + `E-MATCH-SCRUTINEE-ARITY` + codegen desugar (`emit-match.ts`) + tests. Catalog the §34 row at impl. Survey-first.
