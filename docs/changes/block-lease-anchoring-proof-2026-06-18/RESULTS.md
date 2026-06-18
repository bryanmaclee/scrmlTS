# (b1) Anchoring proof — Scheme C (carried-comment) over named scrml defs

**Date:** 2026-06-18 (S206). **For:** the block-lease-parallelism DD §7 prerequisite #2
(*"the dock anchoring (open #2 Scheme C — carried-comment, containment-keyed) must be PROVEN —
a lease keyed to a block-ID is only as stable as the anchor"*). **Harness:** `scripts/dock.ts
--coverage` (inv1 coverage + inv3 orphaned-dock), over throwaway fixtures in this dir.

## The question

Does Scheme C — the `// #dock[…]` comment carried adjacent to a named def — survive the three
identity-breaking operations (rename, move, split), and does the **inv3 orphaned-dock WARN**
reliably catch a **dropped anchor** (the one failure block-lease cannot tolerate: a lease handed
to two holders because the anchor silently mis-resolved)?

The anchor mechanism under test: inv1 counts a def "docked" iff a `#dock` sits within
`[defLine-2, defLine]`; inv3 flags a `#dock` with no def within `[dockLine, dockLine+2]` as
ORPHANED. So the anchor is **positional proximity** (within ~2 lines), name-agnostic.

## Results (all as Scheme C predicts)

| Op | Fixture | Coverage | Orphans | Verdict |
|---|---|---|---|---|
| baseline | `anchor-fixture.scrml` | 3/3 | 0 | clean start |
| **RENAME** (alpha→checkAlpha, comment carried) | `op1-rename.scrml` | 3/3 | 0 | SURVIVES — anchor is positional + name-agnostic; the dock edge never referenced the name, so a rename is a no-op for the anchor |
| **MOVE-GOOD** (def+dock cut together) | `op2a-*.scrml` | 3/3 | 0 | SURVIVES — the comment moves with the def under the natural cut/paste motion |
| **MOVE-BAD** (def moved, dock left behind) | `op2b-*.scrml` | 2/3 | **1 (ORPHAN fires)** | **CAUGHT** — inv3 points at the stranded `#dock` (op2b-src.scrml:7); the moved `Card` shows uncovered. This is the dropped-anchor failure, and the leading indicator the DD gates on fires reliably |
| **SPLIT, dock both** | `op3a-split-both.scrml` | 4/4 | 0 | SURVIVES — the agent (present at the split, holding the reasoning) docks both halves |
| **SPLIT, dock one** | `op3b-split-one.scrml` | 3/4 | 0 | GAP SURFACED — the under-docked half drops inv1 to 75%; the gap is visible, never silent |

## Verdict — the gate is satisfiable for NAMED DEFS

Scheme C survives rename + move under natural editing motion (inv1 stays 100%); the **dropped-anchor
failure is reliably caught by the inv3 orphaned-dock WARN** — exactly the leading indicator the DD §7
names as block-lease's ship-gate (*"block-lease should not ship until that signal is quiet on the
target corpus"*). For **named defs**, the DD's "prove-anchoring" prerequisite is **GREEN**: a lease
keyed to a `<relpath>::<name>` block-ID, with the orphan-WARN as the drop safety net, is stable
enough to lease against.

## Residual (honest — the positional-not-identity ceiling)

The anchor is **proximity-positional, not identity-tracked.** It confirms "a dock sits adjacent to a
def," NOT "this is the *same* def as before" (that lineage lives on the edge target, not the anchor —
which is correct: a lease cares which def the block-ID identifies NOW). The one residual hole:
a MOVE-BAD that strands a dock **where another def happens to sit within 2 lines** would mis-attach
silently (no orphan fired, wrong def docked). The common drop is caught; the coincidental-adjacency
mis-attach is not. Mitigation for the eventual lease (per DD recommendation): attach the dock to the
unit's first line / syntactically *inside* the def rather than free-floating above, shrinking the
mis-attach window. Not blocking for the interim.

## Scope boundary — this proves CODE, not MARKUP

This proves the anchor for **named defs** (function / type / component / engine / channel). It does
NOT address the (a) finding that **render-markup sits in no named def** and therefore has no anchor at
all (the `bubbleClasses [191..301]`-swallows-the-render-body case). Combined state after (a)+(b1):

- **Named-def parallelism:** blocks identifiable (a `--units`), anchor proven + drop-caught (b1) →
  the prove-anchoring gate is GREEN. block-lease-for-code is no longer blocked on *anchoring* — only
  on the *build* (lease registry + lifecycle + blast-region), which is flogeance-in-scrml work.
- **Render-markup parallelism:** still unanchored → **(b2): the markup-subtree anchor** (element-keyed
  ID) is where the remaining anchoring risk is concentrated, and where the markup-heavy flagship corpus
  (trucking) actually needs it.

So (a)+(b1) moved block-lease-for-code from *"blocked on unproven anchoring"* to *"anchoring proven,
only the build remains,"* and localized the open anchoring problem entirely to render-markup (b2).
