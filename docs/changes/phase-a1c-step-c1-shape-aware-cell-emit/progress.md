# Progress: phase-a1c-step-c1-shape-aware-cell-emit

## Tier classification
**T2 — Standard.** Single-subsystem dispatch (codegen `case "state-decl"` extension); the gap is wider than the BRIEF flagged on Variant C compound (no handler today) but bounded. Reuses existing `_scrml_derived_declare` runtime infrastructure for compound-parent proxy; one new helper (`_scrml_default_set`) recommended.

---

## Phase 0 SURVEY

- [start] Worktree branch `worktree-agent-ac5b6dcfb8d28d416` from main HEAD `e62bb5a`. Tree clean. `bun install` 114 pkgs. `bun run pretest` 12 samples 0 errors.
- [baseline] `bun run test` → 9,733 pass / 64 skip / 1 todo / **5 fail** / 33,861 expects. Three pre-existing fails (`F-BUILD-002 §3`, `Bootstrap L3`, `Self-host: tokenizer parity`) — predate C1, originate at commits `2585a36` / `44c1054`. Test invariant for C1 = no new fails (5 ≤ 5).
- [survey] Read in full: BRIEF, SPEC §6.1/§6.2/§6.3/§6.6/§6.8, current dispatch at `emit-logic.ts:572-602`, A1b annotations (`symbol-table.ts:200-310, 428-596, 1430-1560`), AST shapes (`types/ast.ts:420-630`), A1c SCOPE §3.1/§4.1/§4.5/§4.7/§4.8, C0 SURVEY, S61 11.5 progress.md (gap statement at line 79).
- [survey] SURVEY.md drafted with all 10 deliverables per BRIEF §5. Verdict **SCOPE-AMENDMENT-SUGGESTED**.

## Findings highlight

1. **Variant C compound: critical gap** — `emit-logic.ts case "state-decl"` has NO handler for compound parents today. Children silently dropped. Wider gap than BRIEF flagged.
2. **Shape 3 V5-strict gap (S61 11.5 deferred)**: confirmed at `emit-logic.ts:575` (`structuralForm === false` guard). One-line fix.
3. **Markup-typed derived consumption already works via runtime** — `runtime-template.js:181` routes `_scrml_reactive_get` → `_scrml_derived_get` for any derived-registered name. C1 emits declaration; runtime + emit-html handle interpolation unchanged.
4. **`default=` storage needs ONE new runtime helper** (`_scrml_default_set`). BRIEF §4.3 "ZERO new helpers" not achievable with clean design.
5. **Tier 3 positional sugar latent bug** — `(a, b, c)` SequenceExpression evaluates to JS comma-operator (last operand). Out of C1 scope; defer to C21 (or new C1.5).
6. **A1c SCOPE §4.5 C21 needs revision** — Variant C + markup-typed-derived now in C1; only Tier 3 remains for C21 (~2-3 h).

## Estimated cost
4-6 h holds (BRIEF estimate). Sub-step decomposition in SURVEY §9.

## Verdict
**SCOPE-AMENDMENT-SUGGESTED** — three amendments before implementation:
1. Accept +1 runtime helper (`_scrml_default_set`).
2. Reduce A1c SCOPE C21 (Tier 3 only).
3. Update test invariant: 5-or-fewer fails post-SHIP.

## Stop-and-report
SURVEY.md committed; Phase 0 closed. Awaiting PA acknowledgment before implementation dispatch (which should re-dispatch via `scrml-dev-pipeline` once that agent file is staged).
