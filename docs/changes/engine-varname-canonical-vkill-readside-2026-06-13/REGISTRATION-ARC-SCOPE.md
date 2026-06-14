# SCOPE — SYM cell-registration completeness (stage 1 of bug-12-vkill Part 3, Option-3 staged)

**Status:** scoping (S192). User ruling: "(a) staged, but scope the registration arc first." This is
the standalone stage-1 arc — close the same-file declared-but-not-`stateCells` classes (A/C/D) the
read-side census surfaced. Valuable independent of the read-side fire: SYM `lookupStateCell`
under-indexing real cells likely under-serves other `stateCells`-walking consumers too.

**Predecessor:** Part 2 (var-name canonicalization) LANDED `4494baa5`. The read-side fire (stage 2)
sits ON TOP of this arc. Cross-ref `PART3-READSIDE-SCOPE.md` (the parent 4-class census + options);
the agent census in `progress.md`; `docs/known-gaps.md` `bug-12-vkill`.

## What the census labeled A/C/D actually is (PA root-analysis, empirically verified S192)

The PASS-1 registration walker (`symbol-table.ts` ~1565) registers ANY `state-decl` that reaches
`registerStateDecl` (no `isConst`/derived gate). It SKIPS only `_isReactiveAssign` (V-kill bare
`@x=expr` in fn/`${}` bodies) and engine-body non-derived writes. So the three "classes" are NOT one
mechanism — they are three different surfaces, two of which are **non-canonical declaration forms**:

| Class | Census shape | REAL form (verified in corpus) | Canonical equivalent | Resolves today? |
|---|---|---|---|---|
| **A** | `const @name = expr` derived | **legacy `const @x`** (quiz-app `const @currentQuestion`, svelte `const @doubleCount`) | `const <x> = expr` | legacy NO; **canonical `const <x>` YES** (verified) |
| **C** | `ref=@name` element-ref | canonical `<div ref=@todoColumn>` / `<canvas ref=@c>` (modern-007, phase2-094) | (this IS canonical) | NO — genuine registration gap |
| **D** | §40.8 auto-lift | **`< db>`/state-block bare-write `@products = []`** (bun-admin) — NOT `<program>` body-top | `<products> = []` structural | bare-write NO; **`@x=[]` at `<program>` body-top already HARD-ERRORS** (Unit CC) |

**Verified empirically (S192):** `const <doubled> = @count*2` registers + resolves; `const @doubled`
compiles but its read is SYM-unresolved. `@products=[]` at `<program>` body-top already fires
`E-WRITE-NOT-IN-LOGIC-CONTEXT` (Unit CC S123) — bun-admin escapes it only because it's inside a
`< db>` state-block (not a §40.8 default-logic locus).

## The fork this surfaces (canon-form policy — needs a ruling, not a mechanical dispatch)

A and D are corpus using **non-canonical forms** the language already replaced (`const @x`→`const <x>`
in the S58 sweep; bare-write `@x=init`→structural `<x>=init`). Two directions:

- **REGISTER the legacy forms** — index `const @x` derived cells + state-block bare-write cells in
  `stateCells` so reads resolve. *Pro:* corpus compiles as-is; lowest corpus churn. *Con:* perpetuates
  two non-canonical forms the language is moving off (Rule 2/3 — corpus is artifact, not intent);
  grows the resolvable surface to bless deprecated shapes; the read-side fire then can NEVER nudge
  authors toward canonical form.
- **MIGRATE + DEPRECATE the legacy forms** — migrate corpus `const @x`→`const <x>` (already registers)
  + decide the `< db>` state-block bare-write canonical form, and add a deprecation lint on `const @x`
  (today it compiles SILENTLY — no signal). *Pro:* aligns with the S58 canonical sweep + limit-primitives;
  the canonical forms ALREADY register so Class A largely closes via migration; the read-side fire
  (stage 2) can then legitimately fire on a real typo without a non-canonical-form false-positive class.
  *Con:* more corpus churn; needs the `< db>` state-block bare-write canon-form settled.

Class **C (refs)** is orthogonal — element refs ARE canonical; their binding just isn't registered.
**Register them regardless of the A/D fork.** Clean, self-contained.

## Recommendation

**Split by canonicity:**
1. **Class C — register element-ref bindings in `stateCells`** (or a resolvable ref surface). Canonical
   construct, genuine gap, no policy question. Do it.
2. **Classes A + D — treat as canon-form, lean MIGRATE+DEPRECATE** (Rule 2/3): migrate corpus
   `const @x`→`const <x>` (verified to already register/resolve); settle the `< db>` state-block
   bare-write canonical form; add a `W-CONST-AT-DEPRECATED`-style lint pointing `const @x`→`const <x>`
   (parallels the S192 `name=`/`var=` + the `<machine>`→`<engine>` deprecation precedents). This makes
   the registration surface canonical-only and lets the stage-2 read-side fire be SOUND (a remaining
   unresolved read is then a genuine typo, not a non-canonical-form artifact).

This reframes "register 3 classes at SYM" into: **register refs (mechanical) + a canon-form ruling on
the two legacy decl shapes**. The MIGRATE direction means stage-1 is largely a corpus-migration +
one ref-registration + one deprecation lint — and it materially shrinks stage-2's exemption burden
(only Class B cross-file-channel remains genuinely hard).

## Phase-0 survey items for the registration dispatch

- **Refs (C):** where `ref=@name` binds today (codegen ref-table?) + the cleanest place to also register
  it as a SYM-resolvable cell; whether refs want a full `StateCellRecord` or a lighter resolvable entry.
- **Legacy `const @x` (A):** confirm the parser tag that makes `const @x` skip `registerStateDecl`
  (vs `const <x>` registering); confirm a mechanical `const @x`→`const <x>` migration is behavior-neutral
  on the affected corpus files (compile-diff). Enumerate the corpus `const @x` sites
  (`grep -rn 'const @' --include='*.scrml'`).
- **State-block bare-write (D):** the `< db>`/`< state>` block grammar — what IS the canonical in-block
  decl form, and does a bare `@x=init` there have a legitimate meaning or is it the same non-canonical
  artifact as the §40.8 case (which already errors)? This is the least-understood corner — survey first.
- **Census method:** `runSYM` per-file (NOT `compileScrml`/api.js — it suppresses SYM info-diagnostics,
  returns a false 0). Per the agent's S192 note.

## Open decisions for the user (before dispatch)

1. **A/D direction:** REGISTER-legacy vs MIGRATE+DEPRECATE (PA lean: MIGRATE+DEPRECATE per Rule 2/3).
2. Whether to bundle C (refs) with the A/D canon work or land it as its own smaller commit.
