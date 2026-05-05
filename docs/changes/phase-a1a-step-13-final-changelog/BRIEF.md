# Phase A1a Step 13 — Final commit + CHANGELOG draft

**Status:** DRAFT — queued for dispatch after Steps 6, 7, 9, 10, 11, 12 land.
**Estimate:** 0.5 h. Pure aggregation.

---

## §1 What lands

A single CHANGELOG entry under `docs/changelog.md` summarizing Phase A1a as a whole:
- All step landings (Steps 1-13) with SHAs.
- Aggregate test delta (S59 baseline 8,784 → A1a-close baseline).
- Surface area: AST contract changes (state-decl new fields; new kinds `render-spec`, `reset-expr`; import-item `pinned`; expression mutation shapes).
- Pre-existing-test cleanup count (Step 12 enumeration).
- Out-of-scope deferrals for A1b (V5-strict bare-name resolver enforcement, derived wiring, L21 firing, validator typer, pinned forward-ref check).
- Out-of-scope deferrals for A1c (codegen for new shapes; render-spec dispatch; reset(@cell) lowering; default= integration).

Plus a concluding commit on main: `compile(a1a-COMPLETE): Phase A1a lex+parse done — N steps, ΔX tests`.

---

## §2 Scope

### §2.1 In-scope
1. Aggregate progress logs from Steps 1-12.
2. Draft CHANGELOG entry per existing format conventions.
3. Update master-list.md §0 phase progress table — A1a row from "in flight" to "DONE", record completion SHA + test delta.
4. Update README v0.2.0 banner if PA wishes (PA call).
5. PA-SCRML-PRIMER §13 locks table — confirm L18 / L19 / L21 references still accurate post-A1a-landing.

### §2.2 Out-of-scope
- A1b dispatch brief — that's a separate planning artifact post-A1a (already partially scoped at `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md`).
- v0.2.0 announce publishing — user-controlled.

---

## §3 Definition of done

1. ✅ `docs/changelog.md` has a new dated session block summarizing A1a.
2. ✅ `master-list.md` §0 dashboard reflects A1a-DONE status.
3. ✅ Final commit on main pushed.
4. ✅ Tests + working tree clean.

---

## §4 Tags

#phase-a1a #step-13 #changelog #wrap
