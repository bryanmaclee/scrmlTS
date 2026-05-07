# scrmlTS — Session 64 (OPEN)

**Date opened:** 2026-05-06
**Previous:** `handOffs/hand-off-63.md` (S63 — B1 LANDED + Stage 0c PLANNED + article-pair drafted + scrml-not-superset concession ratified + live debate QUEUED)
**Rotates to:** `handOffs/hand-off-64.md` at S65 open

**Tests at open:** 8,933 / 44 / 1 / 0 / 8,978 / 440 (baseline carry-forward from S63 close).

---

## Session-start state

- scrmlTS: clean, in sync with origin (0 ahead / 0 behind).
- scrml-support: clean, in sync with origin (0 ahead / 0 behind).
- Inbox: empty (`handOffs/incoming/` only contains `dist/` + `read/`).
- PA-SCRML-PRIMER.md read in full (canon snapshot 2026-05-05; primer ratified through L21).
- pa.md read.
- hand-off-63 read.
- Last ~10 contentful user-voice entries reviewed (S57 → S63 sidequest).

---

## Open questions surfaced from S63 close (paste-forward)

1. **B2 dispatch readiness.** B1 public API surface is final at `compiler/src/symbol-table.ts`. B2 (E-NAME-COLLIDES-STATE) consumes `lookupStateCell`. Estimate per A1b SCOPE-AND-DECOMPOSITION §4.2: 4-6h focused.

2. **Live debate fire timing.** The queued debate brief at `scrml-support/docs/debates/QUEUED-state-type-overload-deletion-2026-05-06.md` is ready. 6-expert panel staged (5 existing + `crystal-multi-dispatch-expert` forged S63). Awaits Bryan's authorization to fire (panel/wording ratify-as-is, OR revise first). **Mode:** explicit live-dispatch escalation flag — do NOT silently fall back to synthesis if runtime denies sub-agent dispatch; halt and surface.

3. **Article publish gating.** Both articles in `scrmlTS/docs/articles/` are `published: false`. Bryan controls publishing.
   - The deprecation article should NOT publish until the live debate confirms (it asserts breadth-of-investigation that the debate makes real).
   - Tier-ladder is independent; could publish independently.

4. **§S11D.5 .todo promotion.** Likely handled by B1 at TAB-output time. Verify and promote in B2 or as standalone sweep.

5. **scrmlMaster PA `pa.md` deletion.** Master inbox message dropped S63: `scrmlMaster/handOffs/incoming/2026-05-06-1015-scrmlTS-to-master-pa-md-deletion-surfaced.md`. Master-PA should restore before next cross-repo cycle.

6. **Carry-forward S62 unresolved set:**
   - Article truthfulness audit dispositions (15 articles).
   - scrml.dev v0.2.0 announce publishing (could refresh now to mention B1 + Stage 0c + scrml-not-superset).
   - 6 KEEP-RECENT-LANDED dirs eligible for aggressive deref (PA recommended hold until S65).
   - Maps refresh root cause (agent Write-denied issue from S61) — investigate before next maps dispatch.

7. **Tier-ladder companion-edit em-dashes** — leave Bryan's prose as-is OR clean for tonal consistency. No action required; flagging.

---

## Standing rules carry-forward (do NOT screw up — augments S62's list 1-21, S63 added 22-34)

22. B1 `_record`/`_scope` annotations are NON-ENUMERABLE — read via `getScopeForNode(node)`.
23. B1 walker cycle-guard (WeakSet) is load-bearing.
24. SYM is Stage 3.06 in `api.js` between NR (3.05) and CE (3.2). Input source: `tabResultsForNR`.
25. `ScopeKind = "file" | "function" | "engine" | "component" | "compound"` — B1 fills file/function/compound only; engine/component reserved for B14+/B17+.
26. §S11D.5 `.todo` test is now actually handled by B1 — promote.
27. **Stage 0c is GATED on the queued live debate.** Don't execute 0c.A-F until debate confirms.
28. Article publish gates on the queued debate (deprecation article specifically).
29. `debate-curator` + `scrml-deep-dive` defaults shifted (synthesis-from-store DEFAULT; live-dispatch escalation-only). The QUEUED brief invokes the live-dispatch flag.
30. **scrml-not-superset concession is ratified positioning.** Future articles, scrml.dev copy, v0.2.0 announce should reflect.
31. Article default-output dir: `scrmlTS/docs/articles/<slug>-devto-<date>.md` (was `scrml-support/articles/`).
32. Verbatim-capture precedent set: stance-crystallizing conversations → full-fidelity at `scrml-support/docs/<topic>-<date>.md`.
33. Anti-sycophancy posture is durable — show the work, not the conclusion.
34. scrmlMaster PA `pa.md` was deleted (S62→S63 anomaly) — surface to master-PA at S64 if not yet resolved.

---

## In-flight threads

(none active at S64 open — fresh session, awaiting user direction)

---

## Cross-references

- S63 close ledger: `handOffs/hand-off-63.md`
- PA scrml expert primer: `docs/PA-SCRML-PRIMER.md`
- PA directives: `pa.md`
- Master-list dashboard: `master-list.md` §0
- A1b plan: `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md`
- A1c plan + Stage 0c amendment: `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md` §4.-1
- B1 brief + progress: `docs/changes/phase-a1b-step-b1-symbol-table-extension/`
- Deprecation article (NEW S63): `docs/articles/why-scrml-has-to-deprecate-function-and-component-overloading-devto-2026-05-06.md`
- Companion (tier-ladder): `docs/articles/tier-ladder-promotion-devto-2026-05-04.md`
- Verbatim conversation source: `../scrml-support/docs/function-overloading-sliver-2026-05-06.md`
- Radical-doubt deep-dive: `../scrml-support/docs/deep-dives/state-type-overload-deprecation-2026-05-06.md`
- QUEUED debate brief: `../scrml-support/docs/debates/QUEUED-state-type-overload-deletion-2026-05-06.md`

---

## Tags

#session-64 #open #b1-landed-baseline #b2-ready #stage-0c-debate-gated #queued-live-debate-ready
