# scrmlTS — Session 165 (CLOSE)

**Date:** 2026-06-05
**Previous:** `handOffs/hand-off-169.md` (= S164 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-170.md` at next OPEN.
**Profile:** opened **A (FULL)** ("read pa.md and start session"; default A). Full session-start completed (pa.md + PRIMER + SPEC-INDEX + master-list §0 + hand-off-169 + user-voice S154–S163 tail + git sync + inbox).

## 🏁 S165 CLOSE — native-parser-swap grind: 4 clean families landed (flip 509→451, −58); clean-single phase EXHAUSTED · WRAP + PUSHED
Ultracode autonomous grind ("grind the cleanest one"). 4 families closed (F2-match `2c2e5bb2` / promote-each `785f24d1` / R1 typed-`@cell` `89912bb9` / server-fn-star `26a24b71`), each survey-STOP→dispatch→PA-independent dual-verify→file-delta land→re-measure. Full suite **23,054 pass / 0 fail / 220 skip / 1 todo / 912 files** on main HEAD `26a24b71`; within-node 1005/0; known-gaps **HIGH 0 · MED 9 · LOW 16**. Coherence held every landing (`0/N`). **PUSHED** this wrap (push-at-wrap authorized): scrmlTS 4 landings + wrap → origin 0/0; scrml-support 0/0 (no writes). Worktrees: main only (4 dispatch worktrees cleaned). On v0.7.0 (shadow-only native parity-closers, default output UNCHANGED — no tag, no cross-repo notice). Detail below.

---

## SESSION-OPEN STATE (caught up)

### Sync / repo state at OPEN
- **scrmlTS:** clean, `0/0` with origin. HEAD `c02e2860` (S164 wrap commit).
- **scrml-support:** clean, `0/0` with origin.
- **Inbox:** EMPTY (`handOffs/incoming/` no unread).
- **Version:** on top of **v0.7.0** (pkg.json unchanged through S162–S164; native-parser parity-closers are shadow-only, default output UNCHANGED — no tag, no cross-repo notice).
- **Tests at S164 close:** full `bun run test` **23,037 pass / 0 fail / 220 skip / 1 todo / 911 files**. Within-node parity **1005/0**.
- **known-gaps:** **HIGH 0** · MED 9 · LOW 16 (per S161 close; S162–S164 were native-parser-swap parity work, no new HIGH).
- **Maps:** STALE by 11 native-parser commits — `primary.map.md` watermark `f11db672`, HEAD `c02e2860`. **Refresh (or explicitly factor post-map landings) before any native-parser dispatch** (all 11 commits touched `compiler/native-parser/` + `compiler/src/native-walker/`).

### S165 PROGRESS (live — autonomous grind, push-at-wrap)
**Operating mode:** user picked "grind a meaty family" (opener) + re-granted **autonomous grind (S164-style)** (dispatch → R26 → land → re-measure → next → repeat; surface only on STOP / R26-fail / design-ruling) + **push at wrap** (land local). Ultracode ON (xhigh + workflow orchestration).

### LANDED — F2-match string-literal match-arm recognition (`2c2e5bb2`)
Native parser now recognizes **string-literal** match-arm patterns (`match x { "str" => ... }`) — SPEC §18.16 parity. Was `E-EXPR-MATCH-PATTERN` parse-failure. 3 edits: `ast-expr.js` (`MatchArmPatternKind.Literal` + `makeLiteralPattern`), `parse-expr.js` (`StringLit` branch in `parseMatchArmPattern`), `translate-expr.js` (`reconstructArmPattern` Literal case re-serializes `raw`). ZERO codegen/walker change (the native→live bridge re-parses `rawArms` through the live `emit-control-flow.ts parseMatchArm` which already lowers string arms). +17 native unit tests. within-node SPAN-COORD-only rebump (101 6→12, 102 5→9, kanban-r11 223→235).
- **Process:** survey-STOP cleared (PROCEED single-root via read-only Phase-0 survey) → fix dispatched (`scrml-js-codegen-engineer`, worktree) → **3-skeptic adversarial verify workflow** (parity / allowlist-legitimacy / meta-deferral) all PASS — the allowlist skeptic measured RAW classifier counts + confirmed structural classes HELD-OR-DROPPED (bumps are opposite-of-masking) → file-delta land → pre-commit + post-commit full gate 23054/0. Coherence 0/1 (== 1 PA commit). Agent branch `worktree-agent-a0a135dbe7ad711e9` @ `a2280563` (retain for session, clean at wrap). BRIEF.md archived.
- **Scope honesty:** RECOGNITION parity for STRING-literal arms only. **Boolean + number arms deferred** (empirically: BOTH silently drop on the DEFAULT path too — the live emitter has no boolean/number arm form; recognizing them in native would route into the live silent-drop → native WORSE. Separate dual-front-end §18.16 backlog; the Literal node carries `litKind` so a future live-side addition reuses it). The `meta-match-in-meta-001` 4th fixture is a SEPARATE gap (statement-`match` inside `^{}` — `meta-eval.ts serializeNode` has no match case; default ALSO silently drops it).

### NEW BACKLOG (banked S165)
- **F2-match-CLASSIFICATION over-render** (native gap; surfaced by the verify workflow): native classifies a *bare statement-position* value-return `match` as a renderable bare-expr and OVER-RENDERS its value (extra `<span data-scrml-logic>` + reactive textContent) where default runs it side-effect-only. Pre-existing (the allowlisted KIND-NAME entries), orthogonal to literal-arm recognition — so the 3 fixed fixtures are at RECOGNITION parity, NOT byte-identical emit parity. Candidate next clean-single family (re-triage is assessing).
- **F2-meta-match-lowering** (`meta-eval.ts` serializeNode has no match case; BOTH default-silently-drops + native-loud-fails — a latent default miscompile too).
- **Stale-high within-node structural allowlist** on the 3 F2-match fixtures (raw dropped below budget as the arms now parse; MISSING-FIELD allowlisted 38 vs raw 17 etc.) — downward re-baseline hygiene follow-up.
- **Survey-method note:** the F2-match SURVEY agent's support-matrix called boolean "default supports it" (an exit-code read) — empirically default SILENTLY DROPS boolean (the `node --check`-clean ≠ correct trap, S139). Survey matrices MUST check emitted output, not just exit code.

### RE-MEASURE MILESTONE (S165): flip-failures **509 → 506 (−3)**
Throwaway-worktree flip harness at `2c2e5bb2`: **506 fails / control 0** (rigorously re-verified — flip reverted→0, deterministic 506×4 runs; api.js parser-default flip at `api.js:631` line-agnostic, native selected when `parser === "scrml-native"` at api.js:924+2365). 161 distinct failing test files. The −3 is exactly F2-match's parse-failure→clean-parse gain; the 3 fixtures are NOT byte-emit-closed (over-render classification gap; allowlist still carries their EXTRA-FIELD over-render deltas — the stale-high follow-up). **506 cluster landscape:** promote-each 24 · compiler-api 14 (derivative) · r24-bug-31 12 (multi-AVOID) · lifecycle-shape1 12 (missing-enforce) · error-handler-const-bind/r25-bug-49 12 · enum-subset-enforce-b4 12 · structural-in-logic 11 (missing-enforce) · engine-body-render/over-render 11 · server-fn-star-sql/F2-gen 10 · enum-subset-match-exhaust-b2 10. Aggregate sigs: toEqual 129 · toBe 104 · toMatch 61 · toHaveLength 57 (incl over-render) · toContain 51 · native parse-fail diagnostics ~43.

### NEXT-FAMILY SURVEY (S165) — done; promote-each picked (the only cleanGrindable)
5-family survey workflow (`wlg1smrpy`) results:
- **promote-each (~24, BIGGEST) — `cleanGrindable:TRUE`, single-root, S, parser-bridge-only, NO codegen. PICKED + DISPATCHED.** Root: native for-stmt builders (`translate-stmt.js makeForStmtCStyle ~L1368 + makeForStmtInOf ~L1401`) omit the live-only `iterable` STRING field that `promote.js:1229` reads → all promote sites skipped → status≠"promoted". Fix = synthesize `iterable` matching live `ast-builder.js ~L5724-5771`. Codegen unaffected (emit reads `iterExpr`; byte-identical). FLAG: `iterable` is OFF the ForStmtNode ast.ts contract (runtime-only) — consumer-migration (promote.js→iterExpr) is the cleaner long-term hygiene alt, deferred (orthogonal to flip, risks live promote tests).
- **error-handler-const-bind (12) — multi-root, AVOID** (Root A cross-cutting `<state>`-block state-decl recognition [high blast radius, own family] + Root B GuardedExpr-in-const-RHS codegen/bridge, F2a-shaped).
- **enum-subset (b2 ~14 + b4 ~16) — multi-root; DECOMPOSES into 3** (REFINES S164 row-21 over-lump): R1 typed-`@cell` decl `@x: T = v` (parser-only, single, M, best standalone next-grind after promote-each — `parse-stmt.js parseStatement` no bare `@name:Type=e` arm) · R2 struct-ctor `Type{…}` in expr position (parser-only, single, M, `parse-expr.js` no `Ident{}` postfix) · R3 bare-variant-in-let (TS-phase type-res, defer, no codegen move). The `oneOf([...])` subset machinery itself is NOT broken native.
- **server-fn-star/F2-gen (10) — 2 stacked roots, grindable-with-care SEQUENTIAL:** ROOT-1 (S, parser-only — `parse-markup.js:2160 BARE_DECL_RE` stale pre-Bug-42, missing `function*`; copy live `[*\s]` form; restores top-level lift) → ROOT-2 (M-L, codegen-bridge — `translate-expr.js:289` Yield arm stubs the arg; mirror the StmtKind.Return sqlNode-attach path + emit a `yield-stmt`).
- **over-render+§4.18 bundle — DECOMPOSE:** the engine-body-render.test.js cluster (~11) is **100% §4.18 bare-display-text → native is SPEC-CORRECT (S163) → DESIGN-RULING-GATED** (USER bare→quoted corpus-migration call OR M6 defer; NOT a native fix). The **over-render extra-span** is a SEPARATE clean-single native bug (NOT in engine-body-render — manifests on bare `@x=0` / bare value-return-match at logic-stmt position; def 0 spans / nat 1 span; `translate-stmt.js translateOneStmt ExprStmt` catch-all emits a renderable bare-expr) — clean-grindable after survey-STOP, CAUTION re V-kill `@x=` write semantics (target byte-parity-with-default state-decl shape, don't re-open V-kill).

### LANDED — promote-each family (`785f24d1`): 3 §17.4 for-statement parity gaps
Closed the BIGGEST flip cluster. Survey predicted clean-single field-synthesis; agent's Phase-0 found the family is **3 same-locus normative-SPEC parser-bridge gaps** (documented scope-expansion, Rule-2/3-justified): (1) `iterable` string-field synth on the 2 native for-stmt builders (live RAW-TOKENIZED form); (2) **§17.4b `key <expr>`** for-header clause (was E-STMT-EXPECT-RPAREN; now a CONTEXTUAL keyword); (3) **§17.4a `else`** empty-state block (was E-STMT-STRAY-ELSE). Files: `translate-stmt.js` (+240 serializers) · `parse-stmt.js` (+50) · `ast-stmt.js` (+20 keyExpr/elseBody params) · within-node allowlist (+43/−34).
- **Salvage:** the agent STALLED (600s no-output watchdog) on the final full `bun run test` step — all work was COMMITTED (clean salvage). PA completed Phase-3 step 4 PA-direct (full suite 23054/0) + ran an **adversarial allowlist audit** (raw==allowlist exactly, no masking; shape-canary IDENTICAL main↔fix; corpus net −182 divergences; the +28 EXTRA-FIELD is correct-shadow of more-complete native AST + a pre-existing state-decl-in-component native bug now walker-reachable). promote-each native 33/0 (cluster cleared); consumer tests 92/0.
- **Residual native-completeness (NOT regressions — native matches live's imperfect behavior; future work):** 050 `else` consumed-then-dropped (live also drops it); 051 still 2 native errors live doesn't (8→2). key/else are parity-by-string-matching with live, not new structured live-AST fields.
- **Flag (deferred hygiene):** `iterable` is OFF the ForStmtNode ast.ts contract (runtime-only) — consumer-migration (promote.js→iterExpr) is the cleaner long-term, deferred (orthogonal to flip).

### RE-MEASURE MILESTONE (S165): flip-failures **509 → 506 → 484**
- F2-match: 509→506 (−3, parse-failure→clean-parse; over-render keeps the 3 from byte-emit-parity).
- promote-each: 506→484 (−22; the ~24 promote-each.test.js cluster cleared, ABSENT from the flip fail-set; net −22 from key/else shifts). Control 0. The "2 crash markers" in the re-measure were `OOM`-grep false-positives on "MUSHR**OOM**" — ZERO real crashes; 484 is complete. 161 distinct failing test files.

### LANDED — R1 typed-`@cell` decl (`89912bb9`): native parses `@name: Type = e`
Clean SINGLE-FILE fix (`parse-stmt.js` +146; NO codegen/walker/allowlist change — cleaner than promote-each). New `parseTypedAtStateDecl` arm dispatched on `ScrmlAt && peekKind==Colon && atCellDeclNameFollows` (excludes the `@.` sigil); mirrors `parseServerAtStateDecl` minus `server` → builds the same StateDecl node → byte-identical to live. Disambiguation = purely the `:` lookahead; bare `@name = e` write / `@name` read / `@name.field` dotted all UNCHANGED (PA-verified byte-identical main==worktree on the seam probes; the dotted-probe E-CTX-001 was a pre-existing compound-`<obj>`-block gap, R1-unrelated — R1's guard needs Colon, `@obj.field` has Dot). **10 R1-attributable fixtures cleared** (b2 4→9, b4 4→9). PA-independent verify: full suite 23054/0, within-node 1005/0 (no bump), default b2 14/0 + b4 16/0. No stall, no scope expansion. api.js flip reverted.
- **NEW BROAD family surfaced (R1):** native ECMAScript-strict ASI rejects **multiple statements on ONE source line** (`${ let a=1 let b=2 }`) — fires for ANY following statement, non-fatal-to-parse (error-recovery continues). Distinct native-parity family; the b2/b4 single-line-block-head fixtures carry it (R1's `@role` decl still parses through it). Candidate grind (broad emit-move?).

### S165 LANDINGS SUMMARY (3 clean families, autonomous grind)
| Family | Commit | Flip |
|---|---|---|
| F2-match string-literal arms | `2c2e5bb2` | 509→506 |
| promote-each (3 §17.4 for-stmt gaps) | `785f24d1` | 506→484 |
| R1 typed-`@cell` decl | `89912bb9` | 484→463 |
| server-fn-star (`function*` lift + yield translate) | `26a24b71` | 463→**451** |

**Cumulative flip 509 → 451 (−58)** across **4 clean families**. Coherence `0 4` (4 PA commits, no leak). server-fn-star absent from the 451 fail-set (cluster cleared). 0 real crashes. Push held to wrap. server-fn-star = full BYTE-PARITY (server.js+client.js byte-identical native==default; client zero `_scrml_sql`; no new codegen — live yield-stmt consumer pre-existed; no within-node bump). 0 real crashes. **The clean-single phase is now genuinely thinning** — remaining candidates are partial/multi/meatier: server-fn-star (ROOT-1 S regex-sync clean but only clears no-SQL function*; ROOT-2 M-L yield-translate for full closure) · R2 struct-ctor (M; S164-AVOID-single vs survey-single-root CONTRADICTION → needs survey-STOP) · over-render extra-span (single-root, V-kill caution) · the NEW ASI multi-stmt-per-line gap (broad) · §4.18 engine-body-render (DESIGN-RULING-GATED, user bare→quoted call) · error-handler-const-bind (multi-AVOID) · R3 bare-variant-in-let (TS-phase defer).

### INFLECTION (S165): user chose "keep grinding (I pick)" → server-fn-star
§4.18 stays DEFERRED to M6 (user picked grinding, not the §4.18 ruling). Worktrees retained: F2-match `a0a135` / promote-each `aedbda` / R1 `a4cbb2d` (clean at wrap).

**server-fn-star survey-STOP (agent a8aba82) → PROCEED BOTH ROOTS** (`server function*` + yield SQL; `server-fn-star-sql-r25-bug-42.test.js`, 10/12 flip-fails; SILENT miscompile, both exit 0, serverLen drops):
- **ROOT-1 (clean S, parser-only):** `parse-markup.js:2160 BARE_DECL_RE` is the SOLE top-level lift gate, a stale pre-Bug-42 verbatim copy missing `[*\s]`; sync to live `ast-builder.js:399`. Restores lift for all 9 gen tests + t12 but 0 to full parity alone (lockstep comment at 2157-2159 was VIOLATED).
- **ROOT-2 (M, mirror, NO new codegen):** `translate-expr.js:289` Yield escape-hatch drops ALL yields (plain + SQL). Fix = Yield branch in `translate-stmt.js` ExprStmt arm + `makeYieldStmt` mirroring `makeReturnStmt` (L1675, reuse `reconstructChainedSql`). The live `yield-stmt` kind + codegen consumer ALREADY exist (emit-logic.ts:2320-2348). t4/t5/t6/t12 free wins. COMPLETE set (no SSE-shell/named-events/client-leak roots).

### server-fn-star LANDED (`26a24b71`) — verified clean
PA-independent: byte-parity confirmed (worktree native server.js byte-identical to default + yields emitted; MAIN-no-fix drops them — before/after proof); full suite 23054/0; within-node 1005/0 no-bump; coherence 0/4. No stall, no scope expansion, no allowlist masking risk. Files: parse-markup.js (+8 BARE_DECL_RE sync) + translate-stmt.js (+48 Yield branch + makeYieldStmt mirror). .scrml mirror feature-stale → .js-only (S162).

### WRAP — DONE + PUSHED (S165 CLOSE)
User chose "Wrap + push" → full 8-step wrap executed: (1) hand-off CLOSE (this file); (2) master-list §0.6 S165 entry; (3) changelog S165 block + baseline-para lead; (4) inbox empty / no outbound (shadow-only, no cross-repo notice); (5) final full suite 23,054/0 on `26a24b71`; (6) tree clean post-commit; (6b) 4 dispatch worktrees removed (main only); (7) PUSHED 4 landings + wrap to origin (scrmlTS 0/0); (8) no new durable user-voice (autonomy grants session-scoped; no design ratifications). scrml-support 0/0 (untouched).

### NEXT-SESSION OPENER (if wrapped here)
Clean-single native-parser phase EXHAUSTED. Remaining flip-fails (~453) are meatier/multi/design-gated — see CARRY-FORWARD HYGIENE + the candidate menu above. Re-triage the current ~453 to find any new clean-single before grinding a meaty family blind (the S164 triage's clean targets + this session's are consumed). §4.18 bare→quoted corpus-migration is a STANDING USER RULING (deferred to M6 this session). Phase-A default-flip remains a standing USER decision (v0.8 target).

### CARRY-FORWARD HYGIENE (banked S165, not blocking)
- **within-node stale-high structural allowlist** on the 3 F2-match fixtures (raw dropped below budget; downward re-baseline follow-up).
- **promote.js→iterExpr consumer-migration** (remove the off-contract `iterable` dependency; post-promote-each hygiene).
- **F2-match-CLASSIFICATION over-render** (bare stmt-position value-return match / `@x=0` over-renders an extra `<span>`; clean-single after survey-STOP; V-kill caution) — a candidate grind.
- **§4.18 engine-body-render (~11)** = DESIGN-RULING-GATED (USER bare→quoted corpus-migration call OR M6 defer; native is SPEC-correct per S163). NOT a native fix.

## Where we are — the strategic line (S161 ratification, still in force)
**Native-parser swap is the #1 strategic line** (direction-a: drive `--parser=scrml-native` to default-flip → delete BS+Acorn+BPP at M6). Reasons: self-describing / one-front-end / eliminates the legacy-BS-fragility bug CLASS — NOT because it shrinks the bug backlog (most R24–R28 bug effort is POST-parse codegen/CPS/type-system, which the swap reduces none of). **The Phase-A default-flip itself remains a STANDING USER DECISION; PA ships parity-closers feeding it. v0.8 target.**

S164 ran an autonomous native-parser-swap grind: **5 clean-single-gap families landed (flip 674→509, −165)**; §51.0.S engine message-dispatch family now FULLY native-parity end-to-end. **The clean-single-gap phase is now largely EXHAUSTED** — the remaining 509 are meatier native gaps / §4.18 corpus-migration (NOT native bugs) / missing-enforcement.

## THE REMAINING 509 (next-session map) — from `docs/changes/native-swap-triage-s164/TRIAGE.md`
The authoritative family map (grouped by native parse-gap ROOT, each reproduced default-clean/native-fail, ranked + avoid-list + provenance). Three characters:

1. **Meatier native gaps (real swap work, higher effort):**
   - **F2-generator** — `server function*` dropped ENTIRELY from native AST (function* lift gate + no native yield-stmt arm in translate-stmt.js; NEW machinery). The yield-`?{}` leg of F2 gated on it.
   - **F2-match arm (F3 family)** — native `match action { "add" => {...} }` arm-parse FAILS (E-EXPR-MATCH-PATTERN / "unexpected Arrow") even with NO `?{}` — native string-literal-pattern + `=>` match-arm recognition gap.
   - **mario PowerUp payload-enum** — native captures only the first enum variant (`["Mushroom"]`), mis-emits payload variants.
   - **enum-subset struct-ctor** (~22) — native can't parse `TypeName { field: val }` in expr position (parser + downstream type-res; multi-stage — AVOID single dispatch).
   - **r24-bug-31** (~12) — MULTI-GAP (2 roots: `<state>` block close-mismatch + `!{}` failable arm-drop; AVOID — decompose first).
   - **F2 assign-RHS** `@x = ?{}.all()` — state-decl-routed / E-RI-002 (out-of-locus for translate-stmt; small).
2. **§4.18 corpus-migration — NOT native bugs (engine-body-render ~11 + others):** native CORRECTLY fires `E-UNQUOTED-DISPLAY-TEXT` on BARE arm-body text (§4.18.7, per the S163 ruling); QUOTED arm-body text is BYTE-IDENTICAL native==default. Resolves via the deferred bare→quoted corpus migration OR accepted-as-known-divergence until M6. **NEEDS A USER RULING: do the §4.18 migration now, or keep deferring to M6.**
3. **Missing-enforcement / lower-leverage** (lifecycle-shape1 ~12, structural-in-logic ~11): native compiles clean where default fires an error (inverse-shape); real parity work but no adopter-corpus emit move — schedule after the emit-producing families.

Other downstream codes in the 509 (E-TYPE-001 14, E-TYPE-020 12, E-CODEGEN-INVALID-JS 12, E-MATCH-NOT-EXHAUSTIVE 6) need per-fixture triage to find the native parse ROOT (the surface code is downstream).

## NEXT-SESSION OPENER OPTIONS (pick per user appetite — surfaced at OPEN)
- **Re-triage the current 509** (the original triage's clean targets are consumed + its loci were wrong 3× in S164) to find any remaining clean single-gaps before grinding a meaty family blind. OR
- **F2-match (F3)** or **F2-generator** — the next real native gaps (meatier; survey-STOP gate stays on). OR
- **§4.18 corpus-migration ruling** — surface to the user: do bare→quoted now (kills engine-body-render + others) or keep deferring to M6.
- Or pivot to the MED bug backlog if the user prefers.

## OPEN QUESTIONS / DESIGN CALLS (carried)
1. **Phase-A default-flip = STANDING USER DECISION.** PA never dispatches "the flip."
2. **§4.18 corpus migration** (bare→quoted arm-body text) — DEFERRED per S163; needs a do-now-vs-defer ruling. ~11+ flip-failures (engine-body-render) are this, NOT native bugs.
3. **v0.7 → v0.8 placement** — the swap is a v0.8 target; 509 remaining (meatier).

## CARRY-FORWARD (backlog)
- **F2 sub-families queued:** F2-generator (`server function*`) · F2-match (F3) · F2 assign-RHS.
- **FLAGGED native follow-ups (benign, from S164):** native attr-value `span.start` block-relative inside lift/each markup-as-value subtrees (benign SPAN-COORD residuals; emit byte-identical) · nested-engine `acceptsType:null` pairing (benign EXTRA-FIELD on hierarchy fixtures).
- **native `.scrml` mirrors FEATURE-stale (S162)** — all native fixes are `.js`/`.ts` only; the `.scrml` mirrors untouched (moot until a re-sync; brief the conditional form per `feedback_native_parser_scrml_mirror_feature_stale`).
- **Bug backlog (MED 9):** Bug 1 Tailwind · V-kill READ-side · MCP V0 deferrals · Generator policy · L19 · A5 freeze · R28-1d (NOT-REPRODUCED) · C6 · Bug 14 MCP.
- **LOW backlog** (incl. the S162 `.scrml`-mirror feature-staleness, `is given`/`is not given` predicate-drift).
- **S154 carry:** body-split/CPS debt · per= per-instance engines (DD) · self-tree-shaking build-story DD-candidate · self-demo scrml.dev F1/F2 debate (now scrml-site PA's, but the F1/F2 debate is unscheduled) · 6NZ caps stray.

## pa.md directives in force
- Rules R1–R5. `---` answer-delimiter (S152). Profile A/B (S156). `full wrap` / 88% floor (S139). Standing-autonomy grant is session-scoped (S164's expired at close — re-grant per session).
- Dispatch discipline: S88 isolation explicit · F4 startup-verify · S112 merge-startup (`git merge --ff-only main` in every isolation:worktree brief — branches from origin/main, stale-behind) · S99/S126 Bash-edit + no-`cd` (S100 hook active) · S136 BRIEF.md archival · S138 R26 / PA-independent dual-verify EVERY landing · S147 branch-leak coherence (`rev-list --left-right` + tip==FINAL_SHA) every commit. `--no-verify` forbidden.
- Background-commit race (S164): wait for a backgrounded `git commit`'s completion notification before reading HEAD/coherence — mid-commit reads show stale 0/N-1.
- Canonical dev-agent `scrml-js-codegen-engineer` (fix dispatches). Triage via `general-purpose` (read-only). Re-measures PA-direct (throwaway worktree).

## Tags
#session-165 #profile-a-full-start #session-open #native-parser-swap-loop #clean-single-gap-exhausted #509-remaining #maps-stale-11-commits #4.18-migration-ruling-pending #high-0
