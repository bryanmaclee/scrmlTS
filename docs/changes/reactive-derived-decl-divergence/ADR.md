# ADR — `reactive-derived-decl` divergence: fold into `state-decl` or keep separate

**Status:** DRAFT — awaiting user ratification.
**Surfaced:** S59 Step 4 (parser shape discriminant). When Step 4 added the `shape` field to state-decl construction, it discovered that the legacy `const @doubled = @count * 2` form produces a SEPARATE AST kind (`reactive-derived-decl`), not a `state-decl`. The Step 4 dispatch documented this as a kind-divergence finding (§S4.5 in `parse-shapes-v0next.test.js`).
**Date drafted:** S60 (2026-05-05).

---

## §1 The divergence

After Steps 3-5 of Phase A1a:

| Source form | AST kind | Shape field |
|---|---|---|
| `<count> = 0` (V5-strict structural plain) | `state-decl` | `"plain"` |
| `<email req> = <input/>` (V5-strict Shape 2) | `state-decl` | `"decl-with-spec"` |
| `const <doubled> = @count * 2` (V5-strict structural derived) | `state-decl` | `"derived"` |
| `@count = 0` (legacy expression-form decl, inside `${...}`) | `state-decl` | `"plain"` (Step 4 mirrored) |
| **`const @doubled = @count * 2` (legacy expression-form derived)** | **`reactive-derived-decl`** | **(none — separate kind)** |

The fifth row is the divergence. It exists because `reactive-derived-decl` predates the V5-strict canonical naming pass (S58 const-form sweep replaced declaration sites in §6 with `const <x>` form, but the legacy `const @x` form's parser path is a distinct AST node kind). The `const @x` source form may also still appear in older tests/samples not yet rewritten by Step 12.

---

## §2 Why it matters

Three concrete pain points:
1. **Consumer-side branching.** Anything touching derived cells (resolver, typer, codegen, L21 enforcer) must handle BOTH `state-decl` (with `shape: "derived"`) AND `reactive-derived-decl` separately. Bug-prone duplication.
2. **L21 enforcement** (E-DERIVED-VALUE-MUTATE, L21 lock S59). The validator must walk both kinds; missing the legacy kind in the L21 walker is a silent under-enforcement.
3. **Step 12 (existing-test deltas)** has to decide per-test whether to keep the legacy form or rewrite. If the legacy form's AST kind disappears entirely (folded), Step 12's decisions are simpler.

---

## §3 Options

### §3.1 Option A — FOLD `reactive-derived-decl` into `state-decl` with `isConst: true`

Approach:
- Parser path that today produces `reactive-derived-decl` is rewritten to produce `state-decl` with `shape: "derived"`, `isConst: true`, `structuralForm: false` (since the source is `@`-form), and `initExpr` populated.
- All consumer sites switch to the unified kind. The discriminator becomes `kind === "state-decl" && shape === "derived"`, no longer `kind === "reactive-derived-decl"`.

**Pros:**
- Matches the §6.6 spec model (derived is a state-decl shape, not a separate kind).
- Removes consumer-side branching across resolver/typer/codegen.
- L21 walker has one path.
- Step 12 simpler.
- Symmetric with Step 4's other legacy mirror (`@count = 0` → `state-decl` with `shape: "plain"`).

**Cons:**
- Concrete edit cost: ~20 consumer sites identified at S59 close (resolver, typer, codegen, L21 future-enforcer; need re-survey at execution time per depth-of-survey discount).
- Test fallout: any test currently asserting `kind: "reactive-derived-decl"` must update.
- Risk of missing a consumer site silently — needs comprehensive grep + survey.

**Estimate:** 3-5 h focused work. Single dispatch.

### §3.2 Option B — Keep `reactive-derived-decl` separate; accept the duplication

Approach:
- Document the divergence permanently. Both kinds coexist forever.
- L21 walker walks both kinds explicitly. Resolver/typer/codegen each carries dual paths.

**Pros:**
- Zero migration cost.
- Existing tests unchanged.

**Cons:**
- Permanent consumer-side branching, including in any future feature work.
- L21 + future invariants must be vigilantly applied to BOTH kinds. Easy to miss.
- Doesn't match SPEC's conceptual model (derived IS a state-decl shape per §6.6).

**Estimate:** 0 h (status quo).

### §3.3 Option C — Fold INTO A1b instead of standalone

Approach:
- Step 12 leaves both kinds intact.
- A1b's resolver work normalizes the AST before resolver runs — collapse `reactive-derived-decl` into `state-decl{shape:"derived"}` as a pre-resolver pass.

**Pros:**
- Defers the work to when consumers are being touched anyway.
- No standalone dispatch needed.

**Cons:**
- A1b is already the largest of the three sub-phases; piling work risks scope creep.
- Tests still have to update during A1b, no sooner.

**Estimate:** Folded into A1b's resolver setup phase (~1-2h additive within A1b).

---

## §4 PA recommendation

**Option A (FOLD, standalone).** Ratification grounds:

1. **Spec coherence.** §6.6 models derived as a state-decl shape. Two AST kinds for one concept is technical debt; closing it before A1b begins keeps A1b's resolver work simpler.
2. **L21 enforcement risk.** The lock (L21, S59) is in the spec but not yet implemented. Implementing on a unified kind is one walker; on two kinds it's two walkers with audit overhead. Better to fix the substrate before the walker is written.
3. **Step 12 leverage.** Rewriting legacy `const @x = ...` test forms in Step 12 becomes mechanical — the AST kind they parse to is uniform after this fold.
4. **Scope is bounded.** ~20 consumer sites is a 3-5h dispatch, well within single-step territory.
5. **Depth-of-survey discount likely applies.** Many consumers may already pattern-match on `kind === "state-decl"` AND only some explicitly handle `reactive-derived-decl` (e.g., legacy compat code paths). Survey may shrink the actual-edit count.

**Counter-position:** Option C (fold into A1b) is acceptable if A1b is starting imminently and the cost amortizes. Not preferred — A1b is bigger, and absorbing this in standalone keeps A1b cleaner.

**Sequencing:** Run after Step 12 (existing-test deltas). Step 12 normalizes the test suite; this fold flips the AST kind for the legacy form; Step 13 wraps.

Alternative sequencing: BEFORE Step 12. Pro: Step 12 then has a unified AST to clean up. Con: Step 12's enumeration may already be predicated on the divergence; reordering needs re-survey.

PA leans **Option A, run AFTER Step 11, BEFORE Step 12** — let Step 11's smoke verify nothing is broken at the use-site level first, then fold, then Step 12 cleans test deltas under a unified AST.

---

## §5 Decision

(awaiting user ratification)

- [ ] Option A (FOLD, standalone), sequenced AFTER Step 11, BEFORE Step 12 — PA lean.
- [ ] Option A (FOLD, standalone), sequenced AFTER Step 12 — alternate.
- [ ] Option B (keep separate; accept duplication permanently).
- [ ] Option C (fold into A1b's resolver setup).
- [ ] Other — user's call.

---

## §6 Tags

#adr #reactive-derived-decl #state-decl #fold-decision #L21-substrate #phase-a1a-sequencing
