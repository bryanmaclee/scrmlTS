# D1 progress — block-analysis-footprint.ts (the BREAK-1 fix, ADD-ALONGSIDE)

2026-06-18 — D1 start. Worktree-absolute writes (S126). body-dg-builder.ts MUST stay zero-diff.

- Startup verified: pwd under worktrees/agent-, toplevel == WORKTREE_ROOT, status clean, bun install, bun run pretest OK.
- Read SCOPE-AND-DECOMPOSITION.md (main path; created ahead of worktree base 83ac74a3) §1/§2/§4/§7.
- Read primary.map.md (codegen task-shape routing). Load-bearing: dotted resolution ALREADY BUILT in reactive-deps.ts (_deepSetLeafKey via stampCompoundDeepSetTargets) — D1 READS it, does not re-resolve.
- Read reactive-deps.ts (collectCompoundLeafTargets / stampCompoundDeepSetTargets / extractReactiveDepsFromExprNode), body-dg-builder.ts (addAssignTargetWrites 534-553, reactive-nested-assign 398-417, index-reads 409-416), types/ast.ts node shapes.
- PROBE (R26): real BS+TAB compile of a quoteForm fixture → after stampCompoundDeepSetTargets, the two RNA nodes carry DISTINCT _deepSetLeafKey (quoteForm.originCity != quoteForm.weightLbs), residual []. Stamp works post-buildAST (relies on compound `children`, no SYM needed). function-decl bodies hold the RNA nodes directly.
- NOTE: brief filename is block-analysis-footprint.ts (not SCOPE's block-analysis.ts); brief is the dispatch wrapper + names D2's import path ./block-analysis-footprint.ts — following the brief.

2026-06-18 — D1 COMPLETE.
- Wrote compiler/src/block-analysis-footprint.ts (450L). footprintForBlock(node, fileAST?) -> {reads, writes}. Committed 07c3f762.
- Wrote compiler/tests/unit/block-analysis-footprint.test.js (328L, 13 tests / 40 assertions). Committed 17e59808.
- Both commits passed the full pre-commit gate (17274 tests / 944 files).
- R26 verify: new test 13 pass / 0 fail; body-dg-builder.ts diff EMPTY (add-alongside invariant held); BREAK-1 canary on a REAL compiled quote-form AST asserts quoteForm.originCity != quoteForm.weightLbs (distinct dotted grain, not root-cell collapse).
- Export contract for D2: footprintForBlock(node, fileAST?) -> {reads: string[]; writes: string[]} from ./block-analysis-footprint.ts. STABLE.

2026-06-18 — D2 start (RE-DISPATCH; first D2 stalled at the starting line, zero work lost).
- Worktree branched off 83ac74a3 (pre-D1); D1 module ABSENT at startup → `git merge main` (FF to 696a53d0) pulled block-analysis-footprint.ts + the S112 stale-base guard. bun install + bun run pretest OK. Status clean.
- Read SCOPE §1/§3/§4/§7, the REAL D1 module (footprintForBlock contract: walks node.body, returns sorted/deduped no-@ reads/writes), engine-graph.ts + engine-graph.test.js (template), ast.ts node shapes (FunctionDeclNode.name/.body, ComponentDefNode.name/.raw, EngineDeclNode + _record.engineMeta.varName, TypeDeclNode.name, ChannelDeclNode tag:"channel" + attrs name=), emit-engine.ts collectors (return real AST nodes carrying .span), emit-channel.ts readChannelMeta (channel name attr extraction mirrored).
- Maps: primary.map.md codegen/new-feature/test-authoring task-shape routing. Load-bearing: D1's dotted resolution is consumed via footprintForBlock(node, fileAST) — D2 does NOT re-resolve; node discovery reuses FileAST collections + collectC12/C14EngineDecls (no re-walk), mirroring engine-graph.ts discipline.
- Wrote compiler/src/block-analysis.ts (428L). buildBlockAnalysisForFile / buildBlockAnalysis / serializeBlockAnalysis / buildBlockAnalysisJson. Source-order (span.start asc), honest-empty, fixed key order, JSON.stringify(_,null,2)+"\n". Channel name mirrors emit-channel. endLine derived from newline count in span slice (source-threaded), falls back to opener line.

2026-06-18 — D2 test + discovery fix.
- R26 PROBE (real compile): functions do NOT sit on FileAST.nodes — even a module-level fn is wrapped in a `logic` node (decls in logic.body); page-embedded `${…}` is a logic node under markup children. Initial top-level-only filter MISSED all fns. FIXED: collectFunctionDecls walks markup.children + logic.body (mirrors D1 test's functionDecls walker + engine-graph's markup walk); does NOT descend a fn's own body (top-level defs only, no anchor collision).
- R26 PROBE: engine `_record.engineMeta` is a SYM-pass product — buildAST alone leaves machineDecls empty / engineMeta absent, so collectC12EngineDecls returns nothing on a raw AST. Block-analysis runs at metaFiles (post-TS) where it IS populated. Unit test feeds a synthetic engineMeta-bearing engine-decl on machineDecls (engine-graph.test.js precedent); the real-engine path is D3's integration test.
- R26 PROBE: type-decl canonical form is `type Name:enum = { ... }` (the `type` keyword) — `Name: enum = a | b` does NOT register on typeDecls.
- Wrote compiler/tests/unit/block-analysis.test.js (16 tests / 69 assertions). All 5 kinds, id=<relpath>::<name>, span shape, SOURCE-ORDER (type→fn→channel→component→engine), REAL D1 footprint populated (bump writes counter + quoteForm.weightLbs dotted — NOT root-collapsed), honest-empty (type/channel + no-block file), endLine fallback, multi-file, fixed-key-order serialize, BYTE-DETERMINISM (single + multi-file).
- R26 verify: 16 pass / 0 fail. Footprint sample: fn `bump` writes ["counter","quoteForm.weightLbs"] (dotted grain end-to-end through real footprintForBlock).

# D3 progress — emit wiring (--emit-block-analysis flag + per-file sidecar)

2026-06-18 — D3 start. Worktree pwd: /home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-a2806a039d1651b47
- Startup: worktree base was 83ac74a3 (pre-D1/D2). `git merge main` → HEAD d12fdef7 (has D1+D2). bun install + bun run pretest OK. Status clean. D1+D2 files present.
- Read primary.map.md (codegen task-shape). Map STALE (watermark 359a1d83, ~20 commits behind d12fdef7; no block-analysis entries). Engine-graph anchors (cli.js:55, api.js:2551, compile.js:586) confirmed via grep against live source, NOT map.
- Read SCOPE §3 schema / §4 v1.3 / §7 D3. Read block-analysis.ts (buildBlockAnalysis / buildBlockAnalysisForFile / serializeBlockAnalysis / relativeFilePath). Read engine-graph wiring sites in api.js + compile.js + cli.js.
- DIVERGENCE confirmed empirically: gather pass (api.js:783-821) adds imported .scrml files to the file SET, so metaFiles can be a SUPERSET of inputFiles AND order differs → order-zip inputFiles[i]↔analyses[i] is UNSAFE. Using IDENTITY match (relPath suffix) — proof in report.
- api.js: import buildBlockAnalysis from ./block-analysis.ts; added `blockAnalyses: () => buildBlockAnalysis(metaFiles)` next to engineGraphJson. PER-FILE (returns BlockAnalysis[], each carrying .file relpath + only that file's blocks). Committed.
- compile.js: emitBlockAnalysis flag (decl 100, parse 173, return-destructure 283, runOnce-destructure 413); import serializeBlockAnalysis from ../block-analysis.ts; PER-FILE write-loop after the engine-graph loop (~616). Match = IDENTITY: exact .file===absNorm, else absNorm.endsWith("/"+a.file) (the common case — relPath is a suffix), else basename. Honest-empty fallback {version:1,file:base,blocks:[]}.
- cli.js: --emit-block-analysis registered in help (line 56).
- R26 (real CLI, examples/22-multifile 3-file): app + components honest-empty blocks:[]; types.scrml ONLY its own blocks (UserRole type + badgeColor fn, id=<relpath>::<name>, span.line/endLine present). Three sidecars DISTINCT (per-file proof, no merged blob).
- R26 BREAK-1 (real CLI, trucking load-new.scrml): setOriginCity writes ["loadForm.originCity"], setOriginState writes ["loadForm.originState"], setDestinationCity writes ["loadForm.destinationCity"] — DISTINCT dotted grain, NOT root-collapsed. 13 blocks.
- R26 byte-determinism: app/components/types + load-new each byte-IDENTICAL across two compiles (diff clean).
- Wrote compiler/tests/integration/emit-block-analysis-integration.test.js (9 tests / 106 assertions). In-process content (mario: 3 type/4 fn/2 engine, eatPowerUp footprint, engine-via-SYM, source-order); BREAK-1 dotted-grain on real load-new (loadForm.originCity != loadForm.originState; gather→5 analyses>1 input proves identity-match needed); CLI write-loop end-to-end via Bun.spawn of compiler/src/cli.js (written + parses + only-own-blocks; honest-empty <program><page> markup-only blocks:[]; multi-file mario+triage DISTINCT sidecars (merged-blob guard: DragPhase in triage NOT mario); byte-determinism + trailing-newline). 9 pass / 0 fail.

---

## D4 — dock rewire (consumer) — `scrml-js-codegen-engineer`, isolation:worktree

**Start:** 2026-06-18, worktree `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-ad29442024ceb727d`, base SHA `7a2da79c` (D3 present — no merge needed).

- [step 0] Startup verification PASS: pwd under worktree, toplevel==worktree, tree clean, D3 flag present (`grep emit-block-analysis cli.js`=1, block-analysis*.ts both exist), `bun install` + `bun run pretest` OK.
- [step 0] Smoke-tested D3 emit on `examples/23-trucking-dispatch/pages/driver/messages.scrml` → `/tmp/d4-smoke/messages.block-analysis.json` (4564 bytes, 13 blocks). Verified `BlockAnalysisBlock` fields: `id`, `kind`, `name`, `span:{start,end,line,endLine}`, `reads`, `writes`, `footprintDepth`.
- [step 0] HEADLINE BEFORE captured: `dock --units messages.scrml` (regex) = 12 blocks; `bubbleClasses [191..301]` (SWALLOW: render markup 192-300 + last fn lumped to EOF). ALSO regex hallucinates a phantom `driver [10..31] channel` from a COMMENT line 10 (`// - <channel name="driver-events">`), and MISSES the real `publishDriverEvent` fn (line 27). Artifact has neither defect.
- [step 0] SURFACED DEFECT (D2/D3, out of D4 scope): the emitted artifact's `span.endLine` is COLLAPSED to `span.line` for EVERY block — `buildBlockAnalysis(metaFiles)` in api.js:2564 calls `buildBlockAnalysisForFile(file)` WITHOUT threading source, so `projectSpan` falls back to `endLine=line`. Byte spans (`span.start`/`span.end`) ARE correct against RAW source (verified bubbleClasses [7741..7936] slices to the real fn body, 5 newlines). The builder machinery is present; it's just not fed source at the metaFiles stage. D4 consumes `span.endLine` per the brief; the collapse is a deferred D2/D3 follow-on.

- [step 1] Imports added (mkdtempSync/rmSync/tmpdir/join/basename). Committed.
- [step 2] Rewired `defsWithExtents` seam + NEW `blockAnalysisDefExts(relpath, absSourcePath)` helper + extracted `regexDefsWithExtents` (the retained fallback). `.scrml`+on-disk-path → artifact (worktree compiler `--emit-block-analysis` → `<base>.block-analysis.json` → map blocks via `span.line`/`span.endLine`); on any failure → logged regex fallback. `.ts`/`.js`/`.mjs` → TS_DEFS verbatim. Callers: `unitsMode` passes `abs`; `diffScopeMode` passes the working-tree abs ONLY for `branch===""` (Option (b): git-ref content stays regex). dock.ts type-builds clean. Committed.

### Phase 3 — R26 empirical verification (ALL PASS)
- **HEADLINE (units):** `dock --units messages.scrml` BEFORE `bubbleClasses [191..301]` (swallow: render-markup 192-300 lumped into the last fn) + phantom `driver [10..31] channel` (regex matched a COMMENT) + MISSING `publishDriverEvent`. AFTER `bubbleClasses [191..191]` (swallow GONE) + phantom dropped + `publishDriverEvent [27..27]` surfaced. Render markup correctly UNSCOPED.
- **HEADLINE (diff-scope):** transient render-markup edit at line 247 (the `bubbleClasses(...)` USE site inside `<page>`). BEFORE (regex) `ok ...::bubbleClasses` (line 247 FALSELY owned by the bubbleClasses logic block via the next-def swallow). AFTER (artifact) `warn ... 1 changed line in no named block (render-markup)` — correctly unscoped, false-collision GONE. (transient edit reverted; tree clean.)
- **`.ts` UNCHANGED:** `dock --units compiler/src/type-system.ts` (359 blocks) BYTE-IDENTICAL before/after (`diff` empty). TS_DEFS path untouched.
- **FALLBACK fires + logs + degrades:** a compile-FAILING `.scrml` → `[dock] block-analysis artifact unavailable for <relpath>; falling back to regex defs` + regex defs returned (`greet [3..7]`), exit 0, no crash.
- **Determinism:** two compiles → byte-identical artifact; two `--units` runs → identical output.
- **No regressions:** pre-commit gate (unit+integration+conformance) **17221 pass / 90 skip / 1 todo / 0 fail** across 947 files (ran at commit; dock.ts is not compiler-imported, so 0-fail confirms no compiler-source touch).

### Git-ref decision: Option (b)
Artifact-backed ONLY for the working-tree path (`branch===""`); git-ref CONTENT (`gitShow(branch, relpath)`) stays the regex path. Rationale: compiling a PAST version requires materializing the file AND resolving imports-at-that-ref (out of v1 scope per brief); the headline proof is the working-tree case; the regex fallback handles past content acceptably.

### DEFERRED (D2/D3 follow-on — surfaced, NOT fixed here)
**`span.endLine` collapse.** The emitted artifact reports `endLine == line` for EVERY block because `buildBlockAnalysis(metaFiles)` (api.js:2564) calls `buildBlockAnalysisForFile(file)` WITHOUT threading source → `projectSpan` hits its documented `endLine=line` fallback. Byte spans (`span.start`/`span.end`) ARE correct against RAW source (verified). Consequence: artifact-backed `--units` shows every block as `[N..N]` (single-line), so logic-block bodies + between-def lines show as unscoped. The swallow-kill headline holds regardless (last block bounded by its real `endLine`, not EOF). Minimal D3 fix: thread the file's raw source into `buildBlockAnalysisForFile` at api.js:2564 (the builder machinery already derives `endLine` from a source slice — it's just not fed). D4 consumes `span.endLine` per the brief's literal mapping; not papered over (Rule 4).

---

## D5 — span.endLine collapse fix (RE-DISPATCH) — `scrml-js-codegen-engineer`, isolation:worktree

**Start:** 2026-06-18, worktree `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-a7e3e13aea12ab413`, base SHA `7a2da79c` (behind main). Prior D5 agent crashed (ConnectionRefused) read-only, zero commits.

- [step 0] Startup PASS: pwd under worktree, toplevel==worktree, tree clean. Base `7a2da79c` did NOT descend from `447f5244` → `git merge main` FF to `447f5244` (pulled D3/D4: `--emit-block-analysis` wiring + dock.ts consumer). `grep -c blockAnalyses api.js`=1, block-analysis.ts present. `bun install` + `bun run pretest` OK.
- [step 0] REPRO: 6-line `function bigFn(){...}` → `--emit-block-analysis` → `span.line=1, endLine=1, bytes=0..61`. BYTE span correct (61 bytes = lines 1-6), endLine collapsed. Confirmed on HEAD.

### Root cause (verified, TWO distinct defects)
1. **Source not threaded.** `buildBlockAnalysis(files)` (block-analysis.ts:434) maps `buildBlockAnalysisForFile(file)` with no `source`. `effectiveSource` then checked `fileAST.source`/`.preprocessedSource` on the INNER `ast` — both undefined. PROBE (instrumented dump): the metaFiles object is WRAPPED `{ filePath, ast, _sourceText }`; the RAW source rides on the OUTER object as `_sourceText` (api.js CE loop :1362 re-attaches `sourceByFile.get(filePath)` = `readFileSync` of the .scrml), NOT on the inner ast. So `effectiveSource` was always undefined → `projectSpan` hit its `endLine=line` fallback.
2. **Off-by-one.** Even with source, `projectSpan` counted newlines in `slice(start, end)`. An AST `span.end` can include the trailing `\n` AFTER a block's closing `}` (observed on top-level fn decls) → over-count by one line. bigFn-with-trailing-NL `end=61` would give endLine=7.

### Fix (block-analysis.ts only)
- NEW `sourceFromFile(file)` recovers source off the OUTER object: priority `_sourceText` → `source` → `preprocessedSource`. `buildBlockAnalysisForFile` now resolves `effectiveSource = source ?? sourceFromFile(file)`. `buildBlockAnalysis(files)` passes the whole wrapped object through (already did) — no extra threading needed; source rides on the object. Committed `2a28aed5`.
- `projectSpan` now counts newlines in `slice(start, end-1)` (up to the LAST content byte, excluding it) → endLine = line of `source[end-1]`. Correct in BOTH trailing-NL-present (`end=61`→6) and -absent (`end=60`→6) forms.

### RAW vs preprocessed (CRITICAL, verified)
AST `span.start/.end/.line` index into the RAW source (`sourceByFile` = `readFileSync`, only optional convertLegacyCss; BS/TAB never rewrite byte positions). `_sourceText` IS that raw text. Cross-checked byte 59 = `}` against the raw file. So endLine derives from the SAME text the spans index — NO off-by-lines on `${...}`-bearing files.

### Phase 3 — R26 empirical verification (ALL PASS)
1. **Artifact endLine correct:** bigFn (lines 1-6) `endLine=1` (before) → `endLine=6` (after), both trailing-NL forms.
2. **RAW cross-check** on `examples/23-trucking-dispatch/pages/driver/messages.scrml` (19 `${...}` sites): 11/12 blocks `endLine === line-of-byte(span.end-1)` EXACTLY against raw source (e.g. fetchMessages `40..71`, sendMessage `140..168`). The 1 mismatch (`publishDriverEvent`) is a PRE-EXISTING D1/D2 phantom-block defect (see DEFERRED) — its `span.line` itself is +1 off vs `span.start`; my endLine derivation faithfully tracks span.line. Confirmed pre-existing on `447f5244`.
3. **Arc payoff (dock):** `bun scripts/dock.ts --units .../messages.scrml` — BEFORE `[27..27] [40..40] [140..140]` (collapsed) → AFTER `[27..37] [40..71] [140..168]` (TRUE multi-line). Verified by swapping pre-fix block-analysis.ts in/out.
4. **Strengthened test** (`emit-block-analysis-integration.test.js` +3 tests, 9→12): (f) eatPowerUp endLine>line delta>5; (g) endLine===line-of-byte(span.end-1) for EVERY block + line===line-of-byte(span.start); (h) end-to-end sidecar parity. All 3 FAIL on pre-fix code (proof they guard). Committed `0ac9e00f`.

### DEFERRED (PRE-EXISTING, out of D5 scope — surfaced to PA)
**`publishDriverEvent` phantom block (D1/D2 discovery defect).** In messages.scrml the block-analysis reports a `function`-kind block named `publishDriverEvent` with span `1203..1590` that does NOT correspond to a function decl — `publishDriverEvent` is a CALL (line 163), not a decl; the bytes cover the import tail + `<db>` + start of `getCurrentUser`. AND its `span.line=27` is +1 off vs `span.start` (byte 1203 is on raw line 26). Pre-existing at `447f5244` (D4) — pre-fix it showed `27..27`, my fix shows `27..37`. This is a block-discovery / span-assignment bug in D1's footprint or D2's `collectFunctionDecls`, NOT the endLine derivation. The other 11 blocks are exactly correct. Surfacing per Rule 3 — NOT expanding scope into it.
