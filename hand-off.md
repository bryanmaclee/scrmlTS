# scrml — Session 227 (OPEN)

**Date:** 2026-06-27. **Profile:** A — FULL (booted via `/boot A`). Predecessor close: `handOffs/hand-off-229.md` (S226 CLOSE — the PA-continuity INVERSION arc + ss50 landing). Mechanical stream → `handOffs/delta-log.md` + flogence digest (`bun ../flogence/scripts/digest.ts scrml --fresh`).

## 🚨 NEXT-START / status
Booted Profile A. Git clean (HEAD `cf1471dd` == origin/main, 0/0). Board @ open: **HIGH 1 · MED 11 · LOW 11 · Nom 7 · v0.7.0** (known-gaps §0 generated table).

**Boot hygiene done this session:**
- Restored 6 stray-deleted `import-resolution/` fixtures (working-tree deletion, undocumented, consumed by a live test → `git checkout --` restored; tree clean).
- Rotated S226-close `hand-off.md` → `handOffs/hand-off-229.md` (the `/boot`-path sessions S224/S225/S226 had skipped rotation — file 228 was S223; S224/S225 closes were overwritten without archival, content survives in user-voice + delta-log + deep-dives).

## ⏸️ OPEN — S227 drive board

### Design decision-surface (needs user ruling — RUN-not-RATIFY)
- **(b2) markup-lease verdict — READY TO ABSORB + RULE.** dPA artifact `flogence/docs/debates/markup-lease-D-vs-G-block-lease-subsumption-2026-06-27.md`. **Q2 COLLAPSES the D-vs-G fork** (scorecard Q2-collapsed 50.5 / G 30.5 / D 26): both D + G are agent-side re-derivations of a fact the compiler ALREADY computes (§40.9 reachability solver, BUILT S91); adopt the Q2-collapsed model — flogence consumes a compiler-emitted `conflictsWith(A,B)` query (W3.5). Gate-vs-warn → STAGED-WARN→GATE.
  - **PA-OWED before bringing the ruling (Rule 4 fact-checks — OQ-1/OQ-2 routed from the dPA):** (1) does the §40.9 fixpoint OUTPUT distinguish R vs W edges (query-modifier vs redesign)? (2) does the §31 DG resolve `@obj.field` to field grain (or coarsen to `@obj`)? The collapse + GATE viability are CONDITIONAL on these. Hand-off-226 NEXT-START claimed "§31 DG carries R/W edge-kinds at CELL grain — S226 fact-check" — re-verify against current source before ruling.
  - Unblocks **dpa-015** (markup-region `conflictsWith` BUILD).

### Fireable lanes (sPA — user fires per S209; PA slots + recommends)
- **HIGH `g-unary-of-additive-arg`** — SILENT wrong-value miscompile (`-(2+3)`→`-2+3`=1, should be -5). Clear fix: `emitUnary` must parenthesize any arg whose top operator binds looser than the prefix unary, precisely (don't over-wrap `a + -b`). Sibling of the just-landed ss50 item-2. **Compiler-source → maps refresh prerequisite.** Schedule promptly.
- **ss51** (render-path) — board lane.
- **g-mount-hang-rails-dev** — active native 100%-CPU adopter hang (fire-anyway-solo).
- **dpa-012 lints + §40 phase-ordering spec** — ratified S225, queued build.

### The re-scoped inversion build path (S226 OPEN, carried)
1. **Investigation-as-query (the REAL domino-1) — mostly ALREADY BUILT** (`scripts/dock.ts`). WIRE into the PA workflow as a lookup tool + flogence corpus-index. Cleanest no-design-gate forward strand.
2. **Transcript-parse validation** — ready-now dispatch (quantify the ~85% churn / ~15% judgment by token).
3. **dpa-015** (`conflictsWith` BUILD) — GATED on the (b2) ruling above.
4. Easy/hard landing auto-classify — available NOW for CODE via `dock --diff-scope`.

## ⚙️ In-flight (this session)
- **project-mapper** fired (background) — maps 23 commits / 18 source files behind (watermark `6988c426` → HEAD `cf1471dd`). NON-isolated → commit maps with EXPLICIT pathspec (`feedback_nonisolated_agent_shared_index`).

## 📌 Directives in force
R1–R5 · `---` delimiter · Profile A · **S219 PRIMARY-GOAL** (orchestrate-don't-grind · default-GO · only blocking-Q pauses) · **S219 flogence digest-boot** (vPA deputy ELIMINATED; maintenance reverts to PA-at-wrap; no `deputy-maint`/merge-before-push) · **S226 inversion** (no-churn-by-hand · churn-front taxonomy · single-authorizer landing) · **S226 landing-concurrency** (ingestion-disjoint · 3-way-merge-shared-files · full-suite write-skew backstop) · S88/S99/S126 path-discipline · S136 BRIEF archival · S138 R26 · S147 coherence · S215 adversarial-verify · wrap 8-step.

## Tags
#session-227 #open #board-HIGH-1 #b2-markup-lease-verdict-ready #q2-collapses-fork #g-unary-additive-HIGH #maps-23-behind #inversion-live-staged
