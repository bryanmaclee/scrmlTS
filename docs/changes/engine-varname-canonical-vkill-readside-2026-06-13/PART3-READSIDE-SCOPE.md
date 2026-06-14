# SCOPE — bug-12-vkill READ-side `E-STATE-UNDECLARED` fire (Part 3 follow-up)

**Status:** scoping (S192). Part 2 (engine var-name canonicalization + SPEC §51.0.C) LANDED `4494baa5`.
Part 3 (the read-side fire) STOPPED at the agent's Phase-0 census gate — canonicalization was
necessary but NOT sufficient. This doc scopes what the sound read-side fire actually requires.

**Authority:** the agent census at `progress.md` (S192, 34 fires / 15 files / 0 genuine typos);
PA root-analysis S192; SPEC §34 `E-STATE-UNDECLARED` row + §6.1.1-.1.3; `docs/known-gaps.md`
`bug-12-vkill` (stays `open`, re-scoped). Write-side fire = S123 (`walkResolveAtNames`,
`_isReactiveAssign`-tagged state-decl arm). Read-side has NO parser tag — it fires on every bare
`@name` read that `resolveAtNameOnExprNode` can't resolve, so the resolvable-cell surface must be
COMPLETE or the fire false-positives.

## The blocker the gap recorded was incomplete

`bug-12-vkill` recorded "engine var-name canonicalization is the unblocker." That is now DONE and
was real — but the full-corpus census found the read-side fire has **three more** legit-unresolved
read classes that canonicalization does not touch. The recorded blocker was one of four.

## The census — 4 legit-unresolved read classes (zero typos)

| Class | Shape | Example | Root |
|---|---|---|---|
| **A** | `const <x> = expr` derived reactive (§6.2) | quiz-app `@currentQuestion`/`@scorePercent`; svelte-dashboard `@doubleCount`/`@countSquared`; bun-admin `@lowStockCount` | declared but not in `fileScope.stateCells` |
| **B** | cross-**FILE** channel-scoped cell read | 23-trucking-dispatch `@boardEvents`/`@currentCustomerEvents`/`@currentDriverEvents` (10 fires/8 files) | `<boardEvents>` declared in another file's `<channel>` body, inlined by CE (§38.12) **POST-SYM** |
| **C** | `ref=@name` DOM element-ref binding | `<canvas ref=@canvasEl>` then `@canvasEl` read | the ref auto-declares a binding SYM doesn't register as a cell |
| **D** | §40.8 default-logic body-top auto-lift | bun-admin `@products`/`@categories`/`@editingProduct`… | `@x = []` bare-write auto-lifts to a decl that never registers in `fileScope.stateCells` (bun-admin's stateCells is **empty** despite 6 cells) — already write-side-EXEMPT |

## Root analysis — two categories

1. **Same-file declared-but-not-registered (A, C, D).** `registerStateDecl` (symbol-table.ts:1209)
   indexes ANY state-decl that REACHES it — there is no `isConst`/derived gate. So the gap is
   **reachability**: the PASS-1 walker doesn't register (a) `const <x>` derived decls in some
   positions, (b) `ref=@` bindings, (c) §40.8 bare-write auto-lift cells. These ARE normal declared
   cells — exempting them by carve-out would swallow genuine typos and defeat the diagnostic
   (pa.md Rule 2/3). The fix is to REGISTER them, not exempt them. Tractable (same-file, SYM-stage).
2. **Cross-file post-CE (B).** The channel cell decl lives in another file; CE inlines it after the
   per-file SYM pass runs. SYM structurally cannot see it. This is the genuinely-hard one — it needs
   either cross-file data at SYM (a channel pre-index) or the check moved downstream of CE.

## Options

**Option 1 — extend SYM registration + cross-file channel pre-index (keep the check at SYM).**
Register A/C/D in `fileScope.stateCells` at SYM (3 reachability extensions to the PASS-1 walker /
auto-lift / ref handling), and add a cross-file channel-decl pre-pass so SYM resolves imported
channel cells (closes B). Then land the read-side fire at the existing `if (!resolved)` site.
- *Pro:* fire stays at SYM (early diagnostic, clean source spans); closes all 4; const/ref/auto-lift
  become first-class resolvable everywhere (benefits other passes too).
- *Con:* the cross-file channel pre-index is real new pipeline work (SYM gaining cross-file
  awareness it doesn't have today); largest of the three.

**Option 2 — relocate the read-side check to a post-CE stage.**
Move the bare-`@read` resolution check downstream of CE inlining + auto-lift materialization, where
the full cell set (same-file + cross-file + auto-lifted) is visible. Closes all 4 (B naturally).
- *Pro:* B falls out for free; no SYM cross-file plumbing.
- *Con:* the read-side fire leaves the SYM pass (architectural move); the post-CE stage must carry
  good source spans for the diagnostic (today the read-side span is already approximate — symbol-table.ts
  `makeReportSpan`); risk the post-CE node graph loses the clean per-`@read` locus.

**Option 3 — hybrid / partial.**
Register A/C/D at SYM (close the 3 same-file classes — the common typo surface), and for B EITHER
a narrow, explicitly-bounded cross-file-channel exemption (cross-file channel reads are a known,
finite construct — NOT a typo class) OR defer B. Land the fire covering A/C/D + typos.
- *Pro:* closes the realistic typo surface (a bare `@typo` in a fn/markup body fires) without the
  cross-file pipeline work; B is a bounded, named exemption not a blanket carve-out.
- *Con:* a cross-file channel-cell typo would not fire (small, named hole); two-step if B is wanted later.

## The meta-question (surface before committing to cost)

The read-side fire is a **typo-catch safety net** — bare `@x` read against a name with no decl.
The **write-side already fires** (S123). Is the read-side worth Option-1/2 cost? Adopter-visibility
is LOW (only surfaces on a genuine typo under V5-strict; the workaround "declare before you read"
IS the canonical pattern). Against that: it completes the V-kill symmetry and the const/ref/auto-lift
registration gap (category 1) is a real latent correctness surface independent of the fire — those
cells being absent from `stateCells` likely under-serves other SYM consumers too (worth its own look).

## Recommendation

**Split the value from the cost.** Category-1 registration (index const-derived + ref + auto-lift
cells in `stateCells`) is worth doing on its own merits — it's a latent SYM-completeness gap that
the read-side fire merely EXPOSED (other passes that walk `stateCells` are likely also blind to these
cells). Do that first as a contained correctness arc; it closes A/C/D. THEN the read-side fire is a
small bolt-on covering typos + A/C/D, with B as a single bounded decision (Option 3's named
cross-file-channel exemption, or Option 1's pre-index if B-typos are deemed worth it).

So: **Option 3 staged** — (1) a SYM cell-registration-completeness arc (A/C/D), valuable standalone;
(2) the read-side fire on top, with B handled as a bounded exemption (upgradeable to a pre-index later).
This avoids gating a low-urgency typo-catch on the heaviest piece (cross-file SYM awareness), while
banking the genuinely-valuable registration-completeness fix.

## Phase-0 survey items for the eventual fix dispatch

- Confirm the exact non-registration mechanism per class (A: which `const <x>` positions miss PASS-1;
  C: where `ref=@` binds; D: where §40.8 auto-lift materializes the cell). The agent's runSYM census
  method is the tool — **note: `compileScrml`/api.js does NOT surface SYM info-diagnostics; the census
  MUST run via `runSYM` per-file** (api-path returns a false 0).
- Decide registration vs a parallel resolvable surface for each (do these cells want full
  `StateCellRecord`s, or a lighter "known-name" set the read-side resolver also consults?).
- For B: price the cross-file channel pre-index vs the bounded exemption.
- Read-side diagnostic span quality (the existing `makeReportSpan` approximation) — acceptable for a
  typo lint, or upgrade needed.

## Cross-refs
- `progress.md` (the agent census) · SPEC §34 `E-STATE-UNDECLARED` + §6.1.1-.1.3 · §40.8 (auto-lift) ·
  §38.12 (cross-file channel inline) · `docs/known-gaps.md` `bug-12-vkill` · write-side precedent S123
  (`E-WRITE-NOT-IN-LOGIC-CONTEXT` + V-kill, `walkResolveAtNames`).
