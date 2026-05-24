# scrmlTS — Session 124 (CLOSE)

**Date:** 2026-05-23
**Previous:** `handOffs/hand-off-126.md` (S123 CLOSE — rotated at S124 OPEN)
**Machine:** post-machine-switch — S123 closed on prior machine; S124 ran on this machine
**HEAD at S124 OPEN:** `329101db` · **HEAD at S124 CLOSE:** `fded4f12`
**Wrap:** full 8-step. Push status: surface at wrap.

---

## S124 net outcome

**~focused session — 10 substantive commits to scrmlTS + 1 to scrml-support, +1112 tests, 0 regressions, 2 STOP-and-revert events handled per Rule 3.**

### Commit ledger (chronological)

| SHA | Title |
|---|---|
| `f181d60a` | fix(rewriteNotKeyword GITI-017): regex-literal + comment awareness — close silent-corruption class |
| `d570341d` | fix(runtime-chunks 6nz-P): cross-chunk dependency closure — scope → {timers, animation} |
| `b5e7fc15` | feat(M6.6.b.2 Step A — STOP): native-walker bridge stamp + STOP doc surfacing (c)-class scope gaps |
| `ad335d0a` | feat(M6.6.b.1.5): native attr tokenizer extensions + cookbook corrigendum — unblocks M6.6.b.2 |
| `d7dc86a1` | feat(M6.6.b.2): native engine state-child walker + symbol-table swap — closes the heaviest M6 gate |
| `7426084c` | feat(M6.6.b.3): migrate remaining legacy helpers to native walker — isLegacyArrowRulesBody + scanForOnIdleEntries |
| `404fc619` | chore(M6.7 STOP): partial-landing — corpus migrations + canary close + flag flip REVERTED |
| `5be5ff34` | docs(M6.5 path-b SCOPING): empirical 7-class divergence catalog + 8-unit decomposition + 5 PA decisions |
| `f0368d9c` | feat(M6.5.b.0): within-node parity canary extension — Wave 2 unblocked |
| `fded4f12` | docs(MCP V0 SCOPING): 11-tool surface + 5-sub-unit decomposition + 4 PA decisions ready for ratification |

Plus scrml-support commit `ee8615d`: docs(build-story research roughing): map current state + sub-system inventory + 6 open decisions.

### Tests

| | Count |
|---|---|
| Full `bun run test` at S124 OPEN | 19,933 pass / 0 fail / 175 skip / 1 todo / 754 files |
| Full `bun run test` at S124 CLOSE | **21,045 pass / 0 fail / 170 skip / 1 todo / 759 files** |
| Delta | **+1,112 tests, 0 fail, 0 regressions** |
| Pre-commit gate (unit + integration + conformance) at CLOSE | clean on every commit, no `--no-verify` used |
| Native parser canary | 998/1000 → **999/1000** strict-pass (bs.scrml DIFF-hoist-count closed via S124 null migration; H-bs-tail signature investigated repeatedly across S121/S122 wave debugging finally root-caused + closed) |
| Within-node canary (NEW) | baseline 1000 file-entries / 133,054 divergences across 7 classes — Wave 2 regression-guard now in place |

---

## State-as-of-close

| Item | Value |
|---|---|
| HEAD | `fded4f12` (MCP V0 SCOPING) |
| Tests (full `bun run test`) | 21,045 pass / 0 fail / 170 skip / 1 todo (759 files) |
| pkg.json version | 0.6.0 (unchanged — no tag cut S124) |
| scrmlTS origin sync | 10 commits unpushed — push status surface at wrap |
| scrml-support origin sync | 1 commit unpushed (build-story roughing) — push status surface at wrap |
| Hook gate | Configuration B per pa.md S88 (pre-commit + pre-push; post-commit lost since S122-open per S122 close note — still lost) |
| `.claude/maps/` | watermark `d570341d` — refreshed S124; ~3 commits stale at CLOSE (last 3 commits not in watermark) — refresh on S125 OPEN before next dev dispatch |
| Worktrees | clean — 6 worktree dispatches this session all cleaned (single instance of one stale entry persisted via lock; cleaned at wrap step 6b) |
| Inbox | empty (no new messages during S124; 5 from S123 already triaged) |
| Outbox sent this session | 2 closure replies: `giti/2026-05-23-2100-scrmlTS-to-giti-giti-017-closed.md` + `6NZ/2026-05-23-2200-scrmlTS-to-6nz-bug-p-closed.md` |
| Active arc | M6.5 path-b Wave 2 (.b.1-.b.6) — unblocked by .b.0 canary; 6 parallel-eligible dispatches |
| New roughing doc | `scrml-support/docs/build-story-research-roughing-2026-05-23.md` (user-direction "research and rough" satisfied) |

---

## S124 architectural arcs (the full picture)

### 1. Adopter bug fixes (queued S123, closed S124)

**GITI-017 (`f181d60a`).** `not` keyword silently corrupted regex literals — emitted `.js` parsed clean, regex syntactically valid, but matched different strings than the author wrote. Root cause: `rewriteNotKeyword` (codegen/rewrite.ts) had string-literal skip but no regex-literal awareness. Fix: extended the state machine to skip regex + line/block comments + regex-vs-division disambiguation via `regexAllowedAfter(codeBefore)` predicate. +20 tests in §B section. Closure reply sent to giti.

**6nz-P (`d570341d`).** Runtime chunker tree-shake gap: `_scrml_destroy_scope` (scope chunk, always-included) unconditionally called `_scrml_stop_scope_timers` (timers chunk) and `_scrml_cancel_animation_frames` (animation chunk). When no user-facing timer/animation usage, both chunks tree-shaken, runtime threw `ReferenceError` on first scope teardown. Fix: declarative `CHUNK_DEPENDENCIES` table in `runtime-chunks.ts` + `applyChunkDependencies` fixed-point closure wired into `detectRuntimeChunks` tail. Single edge today: `scope → [timers, animation]`. +11 unit + +5 integration tests. Closure reply sent to 6nz (notes playgrounds 5/6 should clear cascading failures).

### 2. M6 cutover ladder progression (the big arc)

**M6.6.b.2 Step A + STOP (`b5e7fc15`).** Native-walker bridge stamp landed (additive `_nativeEngineBlock` + `_source` on engine-decl in collect-hoisted.js). STOP condition fired correctly: the b.1 SURVEY's "1 (c)-class field" verdict was empirically wrong — 4+ additional (c)-class gaps surfaced (rule=.X / rule=* / rule=(.A|.B) paren / internal:rule=.X / if= quote-preserve). Cookbook contained factual errors (`value.text` should be `value.raw`; "native admits .X as variable-ref" was false). Agent surfaced 3 options for PA decision.

**Option A (FIX-NATIVE first) picked over Option B (hybrid walker) and Option C (defer).** Per pa.md Rule 3: extending the native parser is the right-not-easy answer; FIX-NATIVE preserves the M6 cutover's "native parser as canonical" direction over per-consumer adapter accumulation.

**M6.6.b.1.5 tokenizer extension (`ad335d0a`).** Three additive extensions to native attr tokenizer: `.X` as `dotted-ident` kind (uppercase-or-underscore lookahead disambiguates from decimal `.5`), `*` as `wildcard` kind (standalone-only constraint prevents `*foo` match), `sourceText` verbatim-source field on every non-absent AttrValue (recovers `if="..."` / `if=${...}` quote/wrapper preservation). Adjacent fix: `readInitial` in collect-hoisted.js extended to recognize the new `dotted-ident` kind (one in-flight test breakage caught + fixed by the agent). Cookbook corrigendum: `value.text` → `value.raw` globally; 4 new shared-helper recipes (`readDottedValue` / `readWildcardValue` / `readPossiblyParenthesizedRule` / `readVerbatimSource`); resolved OQ #1 + #2. +27 tests.

**M6.6.b.2 walker re-dispatch (`d7dc86a1`).** **The heaviest M6 gate closed.** New `compiler/src/native-walker/engine-statechild-walker.ts` (533 LOC) — implements all 12 `EngineStateChildEntry` fields via the corrected cookbook recipes. Symbol-table.ts:5014 call-site swap to discriminated branch (native walker when `_nativeEngineBlock` present; legacy fallback otherwise). +27 dual-pipeline parity tests covering every shape category. Two cookbook recipe oversights surfaced + corrected in flight by the agent (sliceBodyFromSpan helper for text-only bodies; readRuleAttrInput for `onTimeoutEntry.to` dotted-ident). Two documented divergences (SPEC §4.14 in-opener `:`-shorthand only native; `<Done(rows)>` parens form collapse to bareword shape on both — parity holds).

**M6.6.b.3 (`7426084c`).** The two remaining legacy helpers migrated: `walkIsLegacyArrowRulesBody` + `walkOnIdleEntries`. Empirical scope finding: the M6 cutover plan's b.3-b.6 framing (dependency-graph.ts + component-3.ts + type-system.ts + usage-analyzer + emit-engine consumer migrations) was **misconceived** — zero of those files import from `engine-statechild-parser.ts` directly. They all read `engineMeta.stateChildren` via the StateCellRecord that symbol-table.ts populates; b.2 already migrated them transitively-by-shape-preservation. **4 planned dispatches (~9-17h budgeted) collapsed into this single ~3-5h dispatch.** +13 parity tests.

**M6.7 STOP (`404fc619`).** Attempted the parser default flag flip. **845 test failures surfaced.** Real-world fixture spot-check: `14-mario-state-machine.scrml` 48 errors, `trucking-dispatch/app.scrml` 11 errors, `01-hello.scrml` clean. Root cause: the canary at 998/1000 measures pipeline-shape parity (top-kind sequence, hoist counts, deep-seq) but NOT within-node field parity (the actual shape of each AST node's children). Per pa.md Rule 3 the agent reverted the flip + landed the independent wins: 3 corpus-stale migrations (bs.scrml null→not / zig-buildconfig + tailwind-prose-coverage closer migrations) pushed canary 998 → 999/1000. **Surprise structural payoff: the bs.scrml migration eliminated the native parser's phantom typeDecl mis-recognition of `name: null,` in object-literal value position at line 241 — H-bs-tail signature from S121/S122 wave debugging FINALLY ROOT-CAUSED + CLOSED.** M6.4b verified naturally dead-code (lives inside the live buildAST path which only runs when `parser === "legacy"`; no migration needed; M6.8 deletes with the rest).

**M6.5 path-b SCOPING (`5be5ff34`).** Empirical 7-class within-node divergence catalog (KIND-NAME / FIELD-SHAPE / MISSING-FIELD / EXTRA-FIELD / COUNT-LENGTH / SPAN-COORD / NESTED-SHAPE). 8-unit decomposition (.b.0-.b.7). 5 PA decisions named: api.js boundary adapter site / FIX-NATIVE for B/C/D/E / canary metric revision / test ALL real-world fixtures before re-flipping / Class A folds into M6.6 closure. Honest re-estimate **29-54h** (vs M6 plan's 30-60h sketch — depth-of-survey discount). No v0.8-deferral STOP triggered. Most surprising finding: even "clean" `01-hello.scrml` has 53 within-node divergences (END-TO-END output works but FileAST is divergent — confirms canary insufficient gate); Mario's 781 divergences collapse to TWO native parser bugs (D + E); 22-multifile is the most dangerous failure mode (parses clean on both, 186 within-node divergences including a hoist-gap silently zeroing 13 downstream consumers).

**M6.5.b.0 within-node canary (`f0368d9c`).** Production-hardened classifier at `compiler/src/native-parser-canary/within-node-classifier.ts` (437 LOC). Sister canary test `parser-conformance-within-node.test.js` (1004 tests). Allowlist baseline `parser-conformance-within-node-allowlist.json` (1000 entries / 7106 lines). Performance: 1.5s for full corpus (avg 1.45ms/file). All 3 STOP conditions evaluated and did NOT fire. NESTED-SHAPE deliberately collapsed to MISSING+EXTRA pair (matches SCOPING precedent; 0 baseline confirms it's not needed today). **Wave 2 (.b.1-.b.6) now unblocked.**

### 3. Build-story research roughing (user-direction "research and rough")

Landed `scrml-support/docs/build-story-research-roughing-2026-05-23.md` (375 lines). Maps the current state of SPEC §58 (S118 — Nominal, spec-ahead-of-implementation). 6 sub-system inventory (BS-1 manifest reader / BS-2 closure verifier / BS-3 sidecar generator / BS-4 component hashing / BS-5 `story=` attribute wiring / BS-6 determinism audit). Net rough sizing ~90-200h for full Wave 2 through audit close. Identifies M6 cutover as the gating dependency. **6 open decisions surfaced for user refinement** (Q3 audit gate timing / Q4 canonical output order rule / content-addressed store substrate / "language tool" enumeration / compiler-source canonicalization / BS-6 audit owner).

### 4. MCP-DevTools v0 — survey + SCOPING dispatch (user-direction "take a closer look" + "V0 of mcp parallel")

**Phase 1 — synthesis from S122 deep-dive** (`scrml-support/docs/deep-dives/scrml-mcp-llm-agent-surface-2026-05-23.md`, 651L): v0 (read-only) 40-80h with **NO M6 dep**. Where scrml beats foldkit: typed transition graph + per-route per-role topology + auto-synthesized validity + channel state. Where scrml lacks: global dispatch hook + time-travel/replay + one-command setup. 4 user-facing questions surfaced.

**Phase 2 — V0 SCOPING dispatch landed:** Refined to **11 tools** (added `get_reachable_server_fns`), **5 sub-units** (MCP-V0.A through .E), **52-78h re-estimate** within deep-dive band. All 3 STOP conditions cleared. **4 PA recommendations queued for ratification:**

| Q | Decision | Agent recommendation |
|---|---|---|
| Q1 | Slot | **v0.4 + parallel-with-M6.5 Wave 2 per S124 user direction** |
| Q2 | V0 tool scope | **11 tools**; keep `list_server_functions` with `dispatchable: false` annotation |
| Q3.4 | Production-build gating | `<program mcp="dev-only">` default + `<program mcp="always">` escape hatch (matches existing enum-attr pattern). Other 5 design Qs from deep-dive §8 are v1+. |
| Q4 | `scrml:mcp` stdlib pattern | **Compiler-internal posture** — adopters opt in via `<program mcp>` only; mirrors §40.2 auto-middleware + `stdlib/cron/` lifecycle. |

**Sub-unit DAG:** A∥B (file-disjoint, parallel) → C → D → E. Critical path ~6 calendar days at 1 agent/sub-unit OR ~3 days with A+B parallel.

**Verified empirical anchors:** `mcp=` collision-free vs 30 existing `<program>` attrs; no M6 dep (only `api.js` ordinary merge concern); MCP SDK Apache/MIT + Bun-compat; SPEC-ref correction (stdlib convention is §41, not §47.11).

**Status at wrap:** **PA decisions pending ratification.** Once Q1-Q4 ratified, MCP-V0.A + MCP-V0.B dispatch in parallel. Per S124 direction these run alongside M6.5 Wave 2 — both arcs file-disjoint (M6.5 in compiler/native-parser/ + compiler/src/native-walker/; MCP in codegen + new compiler/src/mcp-server + stdlib/mcp/).

---

## Process incidents — zero this session (S99 path-discipline streak holds)

**Zero S99-class path-discipline incidents this session despite 6 worktree dispatches.** The combination of:
- Echo-pwd-in-first-commit discipline aid (every dispatch's first commit recorded `pwd`)
- Per-Edit absolute-path-prefix discipline (briefed in every dispatch)
- S112 `git merge main` startup step (briefed in every dispatch; held cleanly on all)
- S88 explicit `isolation: "worktree"` parameter on every Agent call

— held the line. S99 incident counter remains at 11 (last incident was S123 #11). **Goal for the platform-level fix (PreToolUse hook): still high-impact infra investment outstanding but the discipline aids are working for this session.**

---

## Open threads / carry-forwards — surface at S125 OPEN

### M6 critical path (active arc — biggest)

```
M6.5.b.0 ✅ (S124)
        │
        ▼ Wave 2 — parallel (file-disjoint, 6 dispatches):
M6.5.b.1 (~4-8h)  ┐ FIX-NATIVE match-arm separator
M6.5.b.2 (~8-15h) ┤ FIX-NATIVE structural-decl <ident> LHS
M6.5.b.3 (~4-8h)  ├ FIX-NATIVE hoist-gap recursion
M6.5.b.4 (~3-6h)  │ FIX-NATIVE sql-ref envelope (M6.7 root cause)
M6.5.b.5 (~3-6h)  │ ADAPT shape normalizer at api.js boundary
M6.5.b.6 (~1-2h)  ┘ ADAPT SPAN-COORD enrichment
        │
        ▼
M6.5.b.7 (~2-3h) closure + canary verification
        │
        ▼
M6.7 re-dispatch (~3-6h, smaller after adapter unblocks)
        │
        ▼
SOAK (≥1 session of native-default usage)
        │
        ▼
M6.8 deletion (~12-20h)
        │
        ▼
v0.7 cut
```

**S125 OPEN decision needed:** Wave 2 dispatch shape — 6 parallel dispatches (file-disjoint, technically possible but high coordination overhead) OR serialize 2-3 at a time OR sequential. PA recommendation (mild): land .b.1 + .b.2 (the two FIX-NATIVE bugs that collapsed 781 Mario divergences) first as the canary-verification proof-points; then parallel .b.3-.b.6 in one wave.

### Adopter bug fixes (queued from S123 — 4 remaining)

User direction S124: "M6.5 then the adopter bugs." After M6.5 path-b closes, work the 4 remaining queued inbox bugs:

1. **6nz-S** — `return not` + `const` mis-emit as `return !const`. HIGH (pageerror on module load). ~1-3h.
2. **6nz-R** — `if=@derivedReactive` mounts but never unmounts on flip-to-false. HIGH. ~2-4h.
3. **GITI-018** — Multi-`scrml:` stdlib import only first rewritten in library mode. HIGH (library mode blocker). ~2-4h.
4. **GITI-015** — `is some` ternary + computed-member LHS not lowered. Author-level workaround exists. ~1-2h.

### Build-story arc (research roughing landed S124)

User refines §4's 6 open decisions in `scrml-support/docs/build-story-research-roughing-2026-05-23.md` at their leisure. Once narrowed, PA dispatches per-sub-system SCOPINGs. Then implementation roadmap doc + per-Wave dispatches follow. **Not on the v0.7 critical path — separate arc.**

### MCP-DevTools v0 — SCOPING LANDED; 4 PA decisions queued (S124 close)

Substrate research + SCOPING dispatch landed. **4 PA decisions ready for ratification** at S125 OPEN (Q1 slot / Q2 11-tool surface / Q3.4 `<program mcp="dev-only">` default / Q4 compiler-internal stdlib posture). Default-accept-all keeps the project on the path. Post-ratification: dispatch MCP-V0.A + MCP-V0.B parallel; then C → D → E. 5 sub-units, 52-78h total. **Truly parallel with M6.5 Wave 2** — file-disjoint surfaces; only PA-side coordination is dispatch-queue management.

Full deliverable: `docs/changes/mcp-v0-devtools-scoping/SCOPING.md` (496 LOC).

### V-kill READ-side fire — DEFERRED (small, blocked)

Per S123 close + still current: needs engine var-name canonicalization unblocker. ~2-3h after the unblocker.

### Pre-existing carry-forwards (unchanged)

- dev.to article updates (Rule 1 — only if user raises)
- Living Compiler retraction stamp (pending user hand)
- scrml.dev article canonicalization
- SPEC-INDEX Quick-Lookup mini-index stale (S117 flag)
- §29 vanilla-interop spec↔impl divergence (user has not ruled)
- Generator (`yield` / `function*`) policy (S114)
- MK4 lazy-require ESM cycle
- Bug 9 (dashboard async-not-awaited codegen) — defer to post-M6
- Dashboard still broken at runtime (Bug 9)
- "Pre-existing unrelated bug" surfaced Wave 14 DD: `~snapshot = {...}` tilde-decl emits raw tilde sigil
- `eb941333` stray commit (S119 P4-2-agent CWD slip — harmless)
- Adopter corpus migration backlog: file-root `@cell = init` → V5-strict `<cell> = init` (opportunistic)

---

## v0.7 critical path (revised post-S124)

```
M6.5 Wave 2 (.b.1-.b.6) parallel-eligible
M6.5.b.7 closure
M6.7 Phase A flag flip re-dispatch
SOAK
M6.8 Phase B legacy deletion
v0.7 cut
```

**Revised total estimate to v0.7: ~50-90h focused work, ~3-5 focused sessions.** S124 work shrank the path by collapsing b.4-b.6 (~9-17h saved via empirical finding) but the M6.7 STOP revealed M6.5 path-b is needed (29-54h added). **Net push-out: ~20-45h compared to the pre-S124 picture; but the work is now well-understood with empirical sizing rather than hopeful.**

---

## Notable structural findings (worth banking)

1. **Canary metric class lesson:** pipeline-shape parity ≠ within-node parity. The M6.7 STOP was the empirical proof. Going forward, any default-flip operation (M6.7 re-dispatch, future native-parser-replaces-X work) needs **two canaries**: shape AND within-node. The within-node canary infrastructure (M6.5.b.0) is now in place.

2. **Cookbook-vs-empirical lesson:** the b.1 SURVEY's claims were taken authoritative but had 4+ factual errors. M6.6.b.2 STOP forced empirical verification before any further dispatch. Per pa.md Rule 4 — cross-reference SCOPING claims against empirical probe BEFORE encoding into a brief.

3. **Consumer-migration-by-shape-preservation:** b.4-b.6 collapsed because the suspected consumer files (dependency-graph, type-system, component-3, usage-analyzer, emit-engine) don't import from `engine-statechild-parser.ts` directly — they read `engineMeta.stateChildren` from StateCellRecord. **When PA dispatches "consumer migration" work, FIRST grep for direct imports of the legacy module; if there are none, the consumers may already be migrated by shape preservation.** Worth a memory rule.

4. **H-bs-tail closed via accidental side-effect:** the bs.scrml `name: null,` migration to `name: not,` eliminated the native parser's phantom typeDecl recognition. This signature was investigated repeatedly across S121/S122 wave debugging without root-causing it. Lesson: when an in-flight investigation has stalled, a tangential cleanup pass that touches the same code may surface the root cause as a side-effect.

5. **Foldkit-MCP shape ≠ scrml-MCP shape:** the user's intuition ("MCP for scrml") was right but the design space is differentiated, not equivalent. scrml wins on static structure (typed engine graph, per-route per-role topology, validity surface); foldkit wins on dynamic observation (TEA `update` funnel, free replay). The right v0 pitch is "the compiler emits more structure than any other framework; the MCP layer surfaces it."

---

## Wrap step status

| Step | Status |
|---|---|
| 1. Hand-off | ✅ this file |
| 2. Master-list | ⏳ S124 entry queued (next) |
| 3. CHANGELOG | ⏳ Recently Landed S124 block queued (next) |
| 4. Inbox/outbox | ✅ inbox empty; 2 closure replies sent during session |
| 5. Test suite | ✅ 21,045 pass / 0 fail (captured in S124 close) |
| 6. Working tree | ⏳ verify clean after master-list + changelog writes |
| 6b. Worktree cleanup | ✅ all 6 worktrees cleaned per pa.md S83 |
| 7. Push | ⏳ surface to user — 9 commits unpushed scrmlTS + 1 scrml-support |
| 8. Meta-docs | ✅ no meta-doc state changes this session |

---

## Session-start checklist for S125 PA

1. Cross-machine sync (per pa.md): `git fetch origin && git pull --rebase origin main` for BOTH scrmlTS + scrml-support before reading hand-off. If user pushed at S124 close, both should be at-origin.
2. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL.
3. Read `docs/PA-SCRML-PRIMER.md` IN FULL.
4. Read `compiler/SPEC-INDEX.md` IN FULL.
5. Read `master-list.md` §0 IN FULL — the S124 entry in §0.6 is the live delta.
6. Read this `hand-off.md` (S124 CLOSE) — rotate to `handOffs/hand-off-127.md` at S125 OPEN.
7. Read recent contentful user-voice — S124 entries will be appended at wrap (if any new directives during today's session).
8. Sync hygiene re-confirm: `git fetch` scrmlTS + scrml-support; both should be at-origin post-S124-push.
9. **Maps refresh** — watermark `d570341d` (S124 mid-session refresh); ~3 commits stale at CLOSE; refresh before any S125 dev dispatch.
10. **Inbox triage gate**: empty as of S124 close — no triage needed if still empty at S125 OPEN.
11. Next-priority candidates:
    - **M6.5 Wave 2 (.b.1-.b.6)** — PA recommendation: land .b.1 + .b.2 as canary-verification proof-points first, then parallel .b.3-.b.6 (the dominant path).
    - **MCP-DevTools v0** — pending user input on 4 questions surfaced S124.
    - **Build-story decisions** — pending user refinement of 6 open Qs in the roughing doc.
    - **4 queued adopter bugs** — user direction "M6.5 then the adopter bugs"; on the v0.7 path's tail end.
12. Report: caught up + next priority.

---

## Tags

#session-124 #CLOSE #M6.6-cluster-complete #M6.5-SCOPING-landed #M6.5-b0-canary-landed
#M6.7-STOP-handled-per-rule-3 #H-bs-tail-signature-closed #build-story-roughing-landed
#mcp-devtools-synthesized #21045-tests-0-fail #zero-path-discipline-incidents
#wrap-push-pending-user-call
