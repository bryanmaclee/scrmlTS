# A-3 AuthGraph SCOPING — progress

Change-id: `a3-auth-graph-scoping`
Wave: Approach A, sub-wave 3 (A-1 substrate landed `376a219`; A-2 SCOPING in `a2-reachability-solver-scoping/`).
Worktree: `agent-aeb3f2db2f564dd24` (this branch).

## Log (timestamps America/Denver MDT)

- 2026-05-13 — start. Read primary.map.md + domain.map.md + schema.map.md.
- 2026-05-13 — read A-2 SCOPING.md (`docs/changes/a2-reachability-solver-scoping/SCOPING.md` — main worktree). A-2.5 consumer contract captured (line ~306 + §7.1 line ~528: `Map<MarkupNodeId, RoleClassification>` per page; closed-form vs runtime-fallback discriminator).
- 2026-05-13 — read SPEC §40.1.1 (static role classification — §40-side normative anchor) + §40.9.5 (Component 4 consumer side) + §40.9.9 (worked example with `<auth role="admin">` block).
- 2026-05-13 — inventoried compiler current state: AuthConfig is `<program auth=>` only (ast.ts:1321); RI builds `authMiddleware: Map<filePath, AuthMiddleware>` (route-inference.ts:135 + 2433); `<channel auth=>` recognized as attr (attribute-registry.js:191). FINDING: `<auth role=>` block per §40.9.9 worked example is NOT YET a registered element in `html-elements.js` — it has no tag-side registration anywhere in `compiler/src/`. A-3.1's enumerator either must add the registration OR consume it as an `unknown` MarkupNode.
- 2026-05-13 — read PIPELINE Stage 7.6 (cites `<program> / <page> / <auth role=> / <channel auth=>` as the four AuthGraph input sites; line 2343).
- 2026-05-13 — drafted SCOPING.md §1-§8 + final §7 total estimate + §8 maps consulted.
- 2026-05-13 — committed as `docs(s89-a3-scoping)`; report sent.
