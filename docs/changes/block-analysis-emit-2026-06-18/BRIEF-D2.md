> **RE-DISPATCHED S206** (agent a2322e040eb1d9944): the first D2 (a8ad5f2b) stalled environmentally at the starting line (zero loss). Re-run differs: D1 LANDED first, so D2 imports the REAL block-analysis-footprint.ts — NO STUB. Below is the original brief; the stub instruction is void.

# BRIEF — D2 (block-analysis builder + sidecar) — dispatched S206, agent a8ad5f2b1ab34fb19

> Archived verbatim per S136. Agent: `scrml-js-codegen-engineer`, `isolation: worktree`, opus, background.

# D2 — block-analysis builder + serializer (mirror engine-graph.ts)

Change-id: `block-analysis-emit-2026-06-18`. Read the full plan FIRST: `docs/changes/block-analysis-emit-2026-06-18/SCOPE-AND-DECOMPOSITION.md` (§1 Fact 1/3, §3 SCHEMA, §4 v1.2, §7 D2). Template: `compiler/src/engine-graph.ts` + `engine-graph.test.js`.

## MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full + the Task-Shape Routing maps. Map currency: HEAD `359a1d83` as of 2026-06-18 (NEW file + reads engine-graph/ast/reactive-deps, unmodified — current). Report maps consulted + finding.

## CRITICAL STARTUP + PATH DISCIPLINE (S99)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-` (else STOP — S90). Save WORKTREE_ROOT. 2. rev-parse == ROOT. 3. status clean. 4. `bun install`. 5. `bun run pretest`. Any fail → STOP.
Path discipline: Bash edits on WORKTREE-ABSOLUTE paths (`.claude/worktrees/agent-<id>/` segment) — NOT Edit/Write (S126). Never `cd` into main.

## COMMIT DISCIPLINE (S83)
First commit: `WIP(block-analysis-d2): start at $(pwd)`. Per-function commits; progress.md; clean status before DONE. Report WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, R26.

## SCOPE
Create `compiler/src/block-analysis.ts` mirroring engine-graph.ts (fixed key order, source-order, `JSON.stringify(_,null,2)+"\n"`, honest-empty): `buildBlockAnalysisForFile`, `buildBlockAnalysis(files)`, `serializeBlockAnalysis`, `buildBlockAnalysisJson(files)`. Node discovery (reuse collectors): `FileAST.nodes` function-decl; `.components`; engines via `collectC12EngineDecls`+`collectC14DerivedEngineDecls` (identity = `_record.engineMeta.varName`); `.typeDecls`; `.channelDecls` (markup `tag:"channel"`, `attributes.name`). Per block: SCOPE §3 schema `{id:"<relpath>::<name>", kind, name, span:{start,end,line,endLine}, reads:[], writes:[], footprintDepth:"shallow"}` (spans from `node.span`; type/channel → empty footprints). Footprint from `footprintForBlock` imported from `./block-analysis-footprint.ts` (D1 authors it in parallel) — create a MINIMAL THROWAWAY STUB of that file locally so you compile/test; FLAG the stub in your report (PA discards it, lands D1's real one). Determinism: source-order blocks; sorted/deduped footprints; byte-identical across two builds. Test `block-analysis.test.js` (mirror engine-graph.test.js): multi-def fixture (fn+component+engine+type+channel) → 5 kinds, ids, spans, source-order, byte-determinism (footprints empty under stub — assert SHAPE).

## R26 VERIFY (mandatory)
unit test green; byte-determinism asserted; the stub-file flag reported prominently (the one PA-reconcile item at landing).
