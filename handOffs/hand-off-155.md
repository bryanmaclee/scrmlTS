# scrmlTS — Session 150 (CLOSE)

**Date:** 2026-05-31
**Previous:** `handOffs/hand-off-154.md` (S149 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-155.md` at S151 OPEN.

---

## 🏁 S150 CLOSE

- **HEAD scrmlTS:** `addfd205` — **div 0/0 with origin (PUSHED).** Clean tree (except this hand-off + the wrap-doc commit in flight).
  - This session's pushes: (a) S149 backlog `8765462a`/`fe705c09`/`bd90f66e` (scrmlTS was 0/3) + scrml-support `0e15055` DD (was 0/1) — pushed early-session on "push both"; (b) `addfd205` srcmap fix — pushed via "wrap and push".
- **scrml-support:** div 0/0 with origin (the S149 DD pushed early-session). This session only appended user-voice S150 (uncommitted in scrml-support — see wrap note below).
- **Tests:** full `bun run test` **22,450 pass / 0 fail / 220 skip / 1 todo / 861 files** (S149 baseline 22,448; +2 srcmap regression tests).
- **known-gaps §0:** HIGH 0 · MED 12 · LOW ~15 (srcmap-attr line-lie RESOLVED; srcmap-offset-threading NEW) · Nominal 7.
- **Worktrees:** main only. **Inbox:** empty.

### THE SESSION (one arc)
**Source-map attr-expr line-lie RESOLVED** (`addfd205`) — the only substantive work. The S149-carried "located, bounded, PA-direct" task turned out to be **mis-diagnosed** (Rule 4): the hand-off's `emit-event-wiring.ts:1243` root cause never fires on mario (no if-chains). Empirical instrumented tracing found TWO classes — ~40 ast-builder `safeParseExprToNode(…,0)` fragment-relative sites + a distinct wrong-absolute-offset B1 class (object-props / worker `if=` / reactive-assigns). PA surfaced the corrected scope via AskUserQuestion; user chose **honest-synthetic now + queue full fix**. Fix = validate-at-resolution in `build-source-map.ts` (drop any named mapping whose offset resolves to a line not containing the identifier). Offset-source-agnostic, contained to the source-map-only path, no AST mutation, zero footprint when maps off. **Empirical: LINE-WRONG 40→0; col-drift 39 KEPT unchanged (purely subtractive); named 103→63; mario 6 line-0 → 0; maps valid JSON + node --check clean.** +2 regression tests.

---

## ⭐ S151 FIRST ACTIONS (carry-forward, priority order)

1. **C1 self-demo website — build into the repo.** The largest ratified-for-go carry. The S149 spike (`/tmp/c1-demo/viewer.html` + `/tmp/c1-serve.js` — may be gone by S151; rebuild from the spec) proved: editable scrml → server-side recompile → live app + folded output + engine boxes, hover-linked via real `.js.map`. Layout: live+boxes left 60%, editable source+output right 40%, fixed live pane. Build into `docs/website/` properly (decide: keep harness chrome plain-JS, or rebuild as a scrml app per the dogfood thesis). **Per S146 — serve in browser for user BEFORE any push.** The F1=C1-static launch increment. NOTE: with the S150 fix, the C1 viewer's hover-provenance no longer points reads at the comment line — but col-precision awaits the offset-threading arc (#2).

2. **srcmap offset-threading full-fix (the queued half — NEW LOW).** Thread the real absolute base offset through the offset-0 parse sites (~40 ast-builder `safeParseExprToNode(…,0)` + the wrong-absolute-offset B1 root in object-props/worker-if/reactive-assigns) so the now-DROPPED use-site reads gain CORRECT col-precise provenance, and the 39 col-drift mappings become col-accurate. Infra exists (`collectExpr` returns absolute spans; `parseExprToNode`/`safeParseExprToNode` accept an offset). Regression surface: span field read by other passes + tests assert near spans → run full suite. Matters most when C1 needs full bidirectional provenance. BRIEF + landing note archived `docs/changes/srcmap-attr-expr-relative-span-2026-05-31/BRIEF.md`.

3. **Tier-2 ceiling primitive** (event-payload-transition) — the highest-leverage *language* arc the S149 tier-rung DD surfaced (the real case-analysis friction lives at the Tier-2 ceiling, not the 0→1 step). A design arc, not ratified-for-go; would need a deliberation.

## Carry-forward backlog → S151

**From S150 (NEW):**
- srcmap offset-threading full-fix (task #2 above — col-precise correct provenance; the queued half of the S150 ratification).

**Still open (carried):**
- **engine-graph multi-file write-loop bug** (LOW): `engineGraphJson()` builds an all-files graph; the compile.js write loop writes that same JSON to EVERY per-file `<base>.engine-graph.json`. Single-file correct. Reachability shares the loop shape.
- **C2a playground** (F1 fast-follow, ratified): spike proves local live-edit free; deployed-static needs the WASM/self-host path. Gated behind a CLI-conformance corpus. Next milestone after C1-static.
- **Phase 2 provenance** (F2 standards-hybrid, ratified but unbuilt): CSS source maps + HTML `data-scrml-span` correlation. Deferred until C1 needs them.
- **2 S148 findings:** `derived=match` arms not covered by match-`:>` tooling (triage). `migrate.js` Migration-2 `<machine>`→`<engine>` rewrites inside comment/string context (tool bug — add comment/string skip).
- **Open MEDs:** C4 object-literal lifecycle E-TYPE-001 · C6 formFor-in-engine · R28-8 bare-variant-into-object-literal (design call) · `:`-shorthand-state-body fragility (S145 — KEEP+make-robust, so it's a BUG to fix) · Bug 60 render-by-tag nested-compound.
- **Ratified-but-gated arcs:** D-runtime arc (027B-D server-render-time role-gating) · native-parser M6 joint-retirement (complete front-end, shadow-only, parity 1005/0 — the flip-to-default decision).
- **Hygiene:** 12 non-compliance deref candidates · within-node allowlist staleness · **maps refresh** (watermark `09f74bee`, now stale for S149 source-map + engine-graph + S150 build-source-map codegen landings — refresh before next compiler-source dispatch).

## NATIVE-PARSER STATUS (current, keep)
Native parser is a **COMPLETE front-end** (charter B, ~37,300 LOC, 38 modules w/ .scrml mirrors). M1-M4 + MK1-MK4 done; K-ledger 12/12 (S114). Runs as **opt-in shadow** via `--parser=scrml-native` (M5.1); DEFAULT is still legacy live path. Parity 1005/0. Remaining arc: **M6 joint-retirement** (delete legacy front-end behind a soak-gated flag-flip) — dormant since ~S128.

## pa.md directives — S150 observations
- **Rule 4 fired** (caught the mis-located root cause before acting; corrected via empirical tracing + AskUserQuestion).
- **`feedback_dont_preclassify_fix_as_surgical` confirmed again** — the "bounded PA-direct" hand-off framing was wrong; the real fix surface was broad; scope surfaced to user not assumed.
- **S146 show-visual-work-before-push** — N/A this session (no UI work; srcmap is internal). Applies to S151 C1 website.
- Commit auth GRANTED this session (PA-reviewed srcmap fix); push GRANTED ("wrap and push"). Both consumed.
- Rules R1-R5 in force; S136 BRIEF archival (landing note added), S138 R26 (empirical-first applied — instrumented + corpus-verified before claiming closed), S147 branch-leak coherence (held).

## Tags
#session-150 #CLOSE #source-map-line-lie-RESOLVED #honest-synthetic #rule-4-fired #root-cause-corrected #carry-C1-website #carry-srcmap-offset-threading #carry-tier2-ceiling-primitive #pushed-all-0-0 #known-gaps-HIGH-0
