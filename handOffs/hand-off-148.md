# scrmlTS — Session 144 (CLOSE)

**Date:** 2026-05-30
**Previous:** `handOffs/hand-off-147.md` (S143 CLOSE — gauntlet R28 + full fix-wave + v0.7.0 cut; HIGH 5→0).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-148.md` at S145 OPEN.

**🏁 S144 CLOSE (wrap).** Adopter inbox fix-wave COMPLETE + pushed: **9 bugs fixed across 6 landings** (scrmlTS `4c9079d2`, origin **0/0**), giti+6nz acked, GITI-023 closed-not-reproduced. **§51.0.H on-enter RESOLVED → Fork C1 ratified** (design-insight 33; scrml-support `f43c666`, **0/0**). 2 new §34 diagnostics (`E-MATCH-ARM-SEPARATOR`, `W-MATCH-VALUE-UNUSED`). Wrap doc-refresh done (changelog + this hand-off + known-gaps + master-list §0.6). Pushed via **user-authorized `--no-verify`** (3 pre-existing parallel-load flakes block the pre-push; all pass in isolation; flake-fix queued). Tests: **22,263 pass / 0 real fail / 223 skip** (+3 known flakes). **CARRY-FORWARD (S145):** (1) **fix the 3 test flakes** (`self-compilation` + `trucking-dispatch` two-compile-determinism — serialize/isolate); (2) **C1 impl arc** (SPEC §51.0.H + `effect=`-on-opener + §34 `E-ENGINE-EFFECT-ON-DERIVED` + edge-case rulings + codegen + README flagship fix); (3) **tier-rung re-deep-dive** (corpus-zero discounted; jump-pain re-tested on current gauntlets; inherit the on-enter minimal-surface precedent). Detail in the §S144 FIX-WAVE / §51.0.H / §S144 CLOSE-OUT sections below.

---

**S144 OPEN — caught up + inbox empirically triaged.** Session-start checklist run in full (pa.md + PRIMER core + SPEC-INDEX sections + master-list §0 dashboard + known-gaps §0 + user-voice S136-S143 + hand-off). Cross-machine sync: **scrml-support was 24 commits BEHIND origin → pulled --rebase to 0/0** (S143's gauntlet-r28 work was pushed from the other machine; this clone hadn't caught up — the canonical cross-machine trap, avoided). scrmlTS clean 0/0 at `505f4ace` (v0.7.0). Hooks config B (pre-commit + pre-push). **Inbox: 6 adopter reports (4 giti + 2 6nz) covering 9 bugs + 1 design question — all stamped against v0.6.7; all 10 sidecars empirically re-compiled on current HEAD v0.7.0 (R26 reverse-direction doctrine).**

---

## State as of OPEN

| Item | Value |
|---|---|
| HEAD scrmlTS | `505f4ace` — v0.7.0, **0/0 with origin** |
| Latest release tag | `v0.7.0` (errorBoundary + gauntlet R28 fix-wave) |
| pkg.json | 0.7.0 |
| Tests (S143 close) | full `bun run test` 22,215 / 0 / 219 skip; within-node 1005/0; TodoMVC PASS (not re-run S144 OPEN) |
| HEAD scrml-support | origin/main (pulled --rebase from 24-behind → 0/0) |
| Worktrees | main only |
| Inbox | **6 messages UNREAD (triaged, not yet acted)** — giti-020/021/022/023 + 6nz playground-ten (X/Y/Z/AA/AB) + 6nz bug-ac. Sidecars present. |
| Hooks | config B (local-rich) |
| S99 path-discipline counter | 20 (held) |
| Maps | watermark `9ab7aa38`, **STALE ~20+ commits** — refresh before any S144 codegen dispatch |
| HIGH bugs open (known-gaps §0) | 0 (entering session; new inbox adds candidates — see below) |
| MED / LOW / Nominal | 13 / 15 / 7 |

---

## 🛠 S144 FIX-WAVE EXECUTION LOG (in flight)

User authorized **full wave, order A+B→F→C→D→E + close GITI-023.** Dispatched as `scrml-dev-pipeline` worktree agents, landed via S83 file-delta + S99/S142 verify (all clean, zero path-discipline incidents).

| Cluster | Bugs | Status | Landing commit | Tests / gate |
|---|---|---|---|---|
| **A+B** server-fn nested-block | GITI-020/021/022 | ✅ **LANDED** | `8e7f18fe` | +14, pre-commit 15213/0. Root = my prediction (emit-control-flow opts not threading boundary/channelOwnedCells + emit-server fresh-per-stmt opts no declaredNames). |
| **F** §36 input-state read-path | Bug AC | ✅ **LANDED** | `c6cd6538` | +5 (incl happy-dom), 15218/0. Rule-4 correction: true origin ast-builder.js:362 single-underscore lowering; fixed in-fence (CG recovery). **Secondary: reactivity OUT-of-scope per SPEC §36.6 (input reads non-reactive by design) — PA design call deferred.** |
| **C-Z** mangler string-opacity | Bug Z | ✅ **LANDED** | `88071273` | +6, 15224/0. Fenced mangler through rewriteCodeSegments (string/regex/comment-aware). |
| **C-X** block-splitter `//`-in-string | Bug X | ✅ **LANDED** | `e50ee9c2` | +13, 15237/0. Regex-TOLERANT line-scoped `openStringQuoteAt` gate (a first full-string-skip attempt broke self-host bootstrap — BS can't tell string-`"` from regex-`"`; reverted). Bootstrap 22/22 preserved. **One Edit-tool call (2-line JSDoc) — PA-verified NO leak (counter stays 20).** |
| **D** match codegen | Bug Y, Bug AA | ✅ **LANDED** | `93d8cab4` | +12, 15249/0. 1st dispatch `af08f6cb` BLOCKED on PA fence error (good agent behavior — no source touched); re-dispatch `a88b7b23` (tip 83ff7af7) landed w/ **3-WAY MERGE on emit-control-flow.ts** (A+B + D-redux disjoint regions, `git apply --3way` clean). **`E-MATCH-ARM-SEPARATOR`** (typer, both forms) + **`W-MATCH-VALUE-UNUSED`** (emit-functions) — 2 NEW §34 codes. **529-RECOVERY:** dispatch's final report eaten by API 529; PA verified via progress.md + anomaly-report (CLEAR FOR MERGE, 0 anomalies) + git state per S83. |
| **E / Bug-AB** onTransition codegen | Q-AB→Bug AB (+folded E-ENGINE-VAR-DUPLICATE) | ✅ **LANDED** | `5113f3ea` | +5, 15254/0. Defect 1 (fire_hooks never-invoked from program-scope triggers — engine-ctx not threaded into free `function` bodies; fixed emit-control-flow.ts + emit-logic.ts) + Defect 2 (phantom E-ENGINE-VAR-DUPLICATE/E-DG-002 on onTransition-body self-writes — `inEngineBody` walk-guard in symbol-table.ts). SAME root family. **3-WAY MERGE (manual): A+B + D + Bug-AB all extend the same if-stmt opts threading → 3 conflicts resolved to UNION (kept A+B `boundary`/`channelOwnedCells`, added Bug-AB engine fields, dropped Bug-AB dup `boundary`).** **SURFACED §51.0.H design question → deep-dive dispatched (see below).** |

### 🎯 S144 FIX-WAVE COMPLETE (2026-05-30) — full inbox cleared
6 landings on main (`8e7f18fe` A+B · `c6cd6538` F · `88071273` C-Z · `e50ee9c2` C-X · `93d8cab4` D · `5113f3ea` Bug-AB). All 9 genuine inbox bugs fixed + R26-verified + gated; GITI-023 not-reproduced (close-pending). Zero path-discipline incidents (counter 20). 2 new §34 codes (E-MATCH-ARM-SEPARATOR, W-MATCH-VALUE-UNUSED). One 529-recovery (D-redux) handled via S83. **main is 6 ahead of origin — UNPUSHED** (push pending). scratch/ play-files untracked (readme-tier2-{original,colocated,inlined}, probe-fn-in-{ontransition,statechild}, probe1-control{A,B}).

### §51.0.H ON-ENTER — RESOLVED: Fork C1 RATIFIED (S144); implementation PENDING
**C1 ratified (user, S144).** `effect=` gains a 2nd legal host = the `<engine>` opener (the implicit `init→initial=` edge's effect, fires ONCE on boot, no re-fire). (b) on-enter-from-any-source ruled NOT real (every in-edge is a named statically-enumerable `rule=` member); B (`<onEnter>`) HELD pre-priced as reopen-trigger if (b) witnessed; A REJECTED (§51.0.F.1 fracture). Insight 33 RATIFIED in scrml-support/design-insights.md. **IMPLEMENTATION ARC (pending — dispatch when scheduled):** (1) SPEC §51.0.H amendment + `effect=`-on-opener def + §51.0.C 2nd-host + §51.0.R module-init linkage + §34 NEW `E-ENGINE-EFFECT-ON-DERIVED` + edge-case rulings [errorBoundary scope over boot-effect throw → composes like any effect (non-`!`→§19.6.8 backstop, `!`→`!{}` in body); boot-effect ordering vs `<onIdle>` → boot fires first then onIdle arms]; (2) codegen — emit opener effect as init→initial= edge effect (reuse transition-effect machinery) + compile-time from-state check (writes validated vs `.initial.rule`) + E-ENGINE-EFFECT-ON-DERIVED; (3) README Stage-3 flagship canon fix (invalid self-target → opener-`effect=`; finally compiles clean for real). ALSO closes the §51.0.H gap surfaced by Bug-AB.

---
#### (historical trail — deep-dive + debate that produced the C1 ratification)
Surfaced by Bug-AB Defect-2 unmask: `<onTransition to=.SameState>` self-target = E-ENGINE-INVALID-TRANSITION; no clean §51.0.H form for on-enter/on-initial-mount (`from=X` doesn't fire on boot; README Stage-3 flagship reaches for the invalid self-target form for its Loading loader → only "passes" via `// gate: skip`).
- **Deep-dive COMPLETE + committed** → `scrml-support/docs/deep-dives/engine-on-enter-effects-2026-05-30.md` (336L, status:current; scrml-support **1-ahead of origin, UNPUSHED**). Empirically confirmed the from/to-covers-both rationale is dead for on-initial-mount. **Two sub-shapes:** (a) on-initial-mount (witnessed) · (b) on-enter-from-any-source (hypothesized — the hinge). Forks: **A** legalize self-target (zero surface, §51.0.F.1 collision) · **B** `<onEnter>` element (cleanest, new-element cost vs §51.0.M/§51.0.R precedent) · **C1** effect= on initial= (Elm shape, minimal surface, only covers (a)) · C2 plain mount `${}`. PA lean: (b) is likely real (XState/SCXML/Harel entry actions are universal; flagship `<Saving>` is multi-source) → narrows to A vs B.
- **Debate RUNNING** — Workflow `wf_0380856f-b2a` (task `wjhgy390e`): 4 voices (smalltalk→A, plaid→B, rust→C1, scrml-language-design-reviewer→cost-weigher) → debate-judge scores 7 axes + answers (b)-is-real + writes Design Insight to `scrml-support/design-insights.md`. Central Q for judges: is sub-shape (b) real?
- **Carry-forward regardless of verdict:** the README Stage-3 flagship needs a canon fix for its `<Loading>` on-enter loader (R1 — flag, don't volunteer the rewrite).
| **GITI-023** `?.` | — | ⏳ CLOSE at wrap (NOT-REPRODUCED, fixed v0.6.7→v0.7.0) | — | reply to giti |

**Agent IDs (this session, retained worktrees until wrap):** A+B `a4387fba3d9660d73` · F `a883fce02cc1ba77b` · C-Z `add602239179ead08` · C-X `a8c2da7affff5179a` · D `af08f6cb97aa5b092`.

**PA notes banked:** (1) A+B flagged a PRE-EXISTING 297×E-CTX-001 directory-bundle artifact (concatenated negative-test fixtures) — orthogonal, not a regression. (2) F's ast-builder single-underscore root could get a cleaner collapse-to-one-placeholder fix (LOW follow-up). (3) §36.6 reactivity = PA/user design call. (4) Maps NOT refreshed this wave (surgical leads used instead) — refresh before any non-surgical/feature dispatch.

### Bug-AB precise root cause (PA empirical — dispatch this as Wave 2 cluster E after D lands)
**Symptom:** `<onTransition>` never fires when an engine transition is triggered by `@engineVar = .Variant` (direct write) OR `@engineVar.advance(.Variant)` from a **free-standing program-scope `function` body** (6nz's `toggle()` shape). `@transitions` stays 0 at runtime (6nz happy-dom).
**Root (PA-confirmed by reading the emit, /tmp/s144-ab/v3):** the codegen DOES correctly generate (a) the rule table `__scrml_engine_<var>_transitions`, AND (b) the hook-firing function `__scrml_engine_<var>_fire_hooks(from,to)` **with the onTransition handler body inside it**. But the transition WRITE SITES inside a plain `function` body emit bare `_scrml_reactive_set("var","X")` (direct) / `_scrml_reactive_get("var").advance("X")` (a literal `.advance()` method-call on the STRING value — would TypeError) instead of routing through the runtime dispatchers `_scrml_engine_direct_set` / `_scrml_engine_advance` (which exist + which call fire_hooks). So fire_hooks is **defined but never invoked.** (The empty `__scrml_transitions_mode = {}` table is vestigial — a red herring.)
**Why:** the C13 dispatch arm is **engine-context-threaded** (`engineBindingsMap`/`engineVarNames`/`engineCtx`). It IS threaded for event-handlers-on-state-children (emit-event-wiring.ts ~319-445) and state-child bodies (emit-control-flow.ts ~158-1713; line 1515 documents the bare-`_scrml_reactive_set` fallback). It is **NOT threaded into a free-standing program-scope `function` body.** Same structural family as cluster A+B (server-fn context-threading gap). emit-functions.ts ~405-415 claims to thread it for "function bodies" — the gap is which function context.
**R28-claim reconciliation:** R28's "engine + `<onTransition>` validation win" was real for its trigger context (state-child event handlers / bodies, where C13 threads engineCtx — covered by `c13-advance-write-hook.test.js`). 6nz's free-standing `toggle()` is the un-threaded context. So NOT a contradiction — a coverage gap (no test for program-scope-function-triggered transitions + no happy-dom onTransition-fire test).
**Leads:** emit-functions.ts (engine-ctx threading into plain function bodies), emit-event-wiring.ts ~319-445 (C13 detection arm — reference for the working path), emit-control-flow.ts ~158/1515/1713, emit-logic.ts ~126-156 (engineBindingsMap direct-write → `_scrml_engine_direct_set`+fire_hooks), emit-expr.ts ~76-149 (`.advance()` call → `_scrml_engine_advance`). Severity MED-HIGH (canonical adopter shape — a `toggle()` called from onclick — silently doesn't fire effects). **Acceptance:** happy-dom test: program-scope `function` doing `@mode=.Edit` (and a sibling using `.advance`) FIRES `<onTransition>` (@transitions increments). Also add a regression test for the program-scope trigger context specifically.

**FOLDED-IN (S144, user-authorized 2026-05-30) — Bug-AB sibling defect found while playing with README Tier-2 co-location:** writing the engine's OWN var inside its `<onTransition>` body (`@phase = .X` where `phase` is the engine var) trips a **phantom hard error `E-ENGINE-VAR-DUPLICATE`** ("engine variable `phase` collides with a separately-declared state cell `<phase>`" — NO such cell exists) + a sibling **false `E-DG-002`** ("`@count` never consumed" when a cell written in the onTransition body is read elsewhere — the write isn't dep-graph-wired). Root: the analyzer mis-classifies an `@engineVar = .X` WRITE inside the onTransition `${}` body as a `<engineVar>` DECLARATION + doesn't wire the body's writes into the dep-graph. **Distinct from program-scope writes** — the AB `toggle()` probes (`@mode = .Edit` in a free function) did NOT trip E-ENGINE-VAR-DUPLICATE (exit 0); only the onTransition-body self-var write does. **This ALSO hits the README Stage-3 flagship** (its `<Loading>` onTransition writes `@phase = @tasks.length==0 ? .Empty : .Editing`) — invisible only because the README example carries `// gate: skip`. Same family as core Bug-AB (onTransition-body logic not integrated into engine analysis/codegen). **Minimal 11-line repro:** `scratch/probe1-controlB-no-fn.scrml` (PA will inline it into the Bug-AB brief + add it as a regression test). **Acceptance (added):** the minimal repro compiles exit-0 (no phantom E-ENGINE-VAR-DUPLICATE, no false E-DG-002); a cell written inside an onTransition body and read in a state-child is correctly consumed.

---

## 🔬 S144 INBOX EMPIRICAL TRIAGE (current HEAD v0.7.0 — re-compiled all 10 sidecars)

Reports filed against **v0.6.7 / 18de30ba**; we are at **v0.7.0 / 505f4ace** (which shipped the parse-gate DEFAULT-ON at v0.6.11 + the R28 fix-wave). Re-verified each per R26-reverse (verify before claiming OPEN/dispatching). Triage artifacts: `/tmp/s144-triage/<id>/` (compile.log + emit).

| ID | Report sev | v0.6.7 symptom | **current HEAD (v0.7.0) verdict** | Cluster |
|---|---|---|---|---|
| **GITI-020** | HIGH | channel `@cell` write nested in `if`/`for` → client `_scrml_reactive_set` in `.server.js` (undefined → runtime ReferenceError) | **GENUINE** — `.server.js:47` still `_scrml_reactive_set("msg","conditional")` in if-block; tail write correctly `broadcast(__sync)`. Exit 0 (valid JS, gate can't catch). | **A: server-fn body visitor not recursing** |
| **GITI-021** | HIGH | bare reassignment → `const` decl in server fn (nested = shadow+drop; same-scope = redeclare SyntaxError) | **GENUINE** — `.server.js`: `let label="default"` then in if-block `const label="chosen"` (shadow; returns "default"). Exit 0. | **B: server-fn assignment-lowering (declared-ident tracking)** |
| **GITI-022** | MED | `let x` + `x=v` → `let x = x = 1` (TDZ ReferenceError) | **SYMPTOM MUTATED** — now emits `let x; const x = 1` → **gate-caught `E-CODEGEN-INVALID-JS`** (exit 1, "Identifier 'x' already declared"). **Same root as 021.** No longer silent. | **B (same root as 021)** |
| **GITI-023** | HIGH | `o?.a` → `o ? . a` (invalid JS, exit-0) | **✅ NOT REPRODUCED** — emit now `return o?.a?.b;` (valid; node --check PASS); exit 0. **Fixed v0.6.7→v0.7.0** (likely native-parser M2.3 optional-chain). PA-verify full repro then **close GITI-023 as resolved**. | — (resolved) |
| **6nz Bug X** | HIGH | `//` (incl `https://`) inside a string literal → `E-CTX-003` hard fail | **GENUINE** — exit 1, E-CTX-003 "Unclosed logic/program". Comment-scanner eats `//` inside string literals. | **C: string-literal awareness (BS/comment scanner)** |
| **6nz Bug Z** | HIGH | identifier-rename rewrites fn-name substring inside a string literal (exit-0 silent, corrupt content) | **GENUINE** — `client.js:9` `_scrml_reactive_set("label","_scrml_handleKey_3(e)")` (string `"handleKey(e)"` mangled). Exit 0 (valid JS). | **C: string-literal awareness (post-emit mangler)** |
| **6nz Bug Y** | MED | comma-sep `match` arms → `return X ,;` (invalid JS, exit-0) | **NOW GATE-CAUGHT** — exit 1 `E-CODEGEN-INVALID-JS`, no emit. Underlying match-codegen still emits invalid JS; gate makes it loud. Fix = accept comma (valid emit) OR reject with clean E-MATCH diagnostic. | **D: match codegen** |
| **6nz Bug AA** | MED | bare tail `match` in plain `function` dropped → value-discarding IIFE → returns `undefined` | **GENUINE** — `_scrml_bare_3()` IIFE `})()` with no outer `return`. Exit 0 (valid JS). `return match` / `fn` forms work. | **D: match codegen (implicit-return)** |
| **6nz Q-AB → Bug AB** | (question) → **MED codegen bug** | `<onTransition>` doesn't fire on bare `@engineVar = .Variant` write | **RECLASSIFIED — CODEGEN GAP (PA empirical read done).** §51.0.F Move-12 says direct write `@var=.Variant` IS a canonical transition trigger (→ `_scrml_engine_direct_set`, rule-validated, fires onTransition); "outside state-child body" is the runtime-enforced dynamic-from-state case (§51.0.F line 24330). PA probed 3 variants (`.advance()` vs direct × engine-root vs in-state-child onTransition): **the `<onTransition>` effect-handler table `__scrml_transitions_mode` is emitted EMPTY in ALL THREE** (handler body dropped at codegen) + direct write emits plain `_scrml_reactive_set` (bypass) + `.advance()` emits `.advance("Edit")` on the raw string value (also suspect). The rule table `__scrml_engine_mode_transitions` IS built. **No working trigger found in PA probes** — so no clean workaround for 6nz. **DISCREPANCY:** contradicts the R28 "engine + `<onTransition>` validation win" — either R28 verified compile-clean-not-runtime-fire, or R28 fired via `effect=` / inside-state-child event-handler path. Bug-AB fix needs to reconcile this + find the exact gap boundary. **Collides with F on `emit-reactive-wiring.ts` (onTransition wiring lives there, lines 231/326/345) → sequence AFTER F lands.** | **E: codegen fix (Wave 2, after F)** |
| **6nz Bug AC** | HIGH | §36 input-state `<#id>` reads emit unbound `_scrml_input_<id>_` → ReferenceError; whole keyboard/mouse surface runtime-dead; canonical sample itself broken | **GENUINE** — `client.js:18` `el.textContent = _scrml_input_cursor_.x` (unbound; registry stores under `_scrml_input_state_registry.get("cursor")`). Exit 0. Secondary: `${<#cursor>.x}` may be non-reactive even after binding fix (getters not `_scrml_reactive`-backed). | **F: §36 input-state read-path (name mismatch)** |

### Fix-clusters (proposed for a fix-wave, mirroring S143)
- **Cluster A+B — server-fn statement-lowering (GITI-020 + 021 + 022).** Highest impact; giti's real `ui/live.scrml` hit ALL of them on its first realistic server fn ("every server function with the conditional-default idiom is silently wrong / returns the default"). 021+022 = same root (server-fn assignment lowering emits a *declaration* instead of a plain assignment when the LHS is already bound — no per-function declared-ident set). 020 = sibling (channel-broadcast lowering only walks top-level statements, doesn't recurse into nested blocks). **NB:** the CLIENT path was fixed S34 (Bug B+F `70190a7` — threaded `declaredNames` through `emitIfStmt`/`emitForStmt`/`emitWhileStmt`); the SERVER-fn lowering is a separate copy that never got the binding check. That's the lead.
- **Cluster C — string-literal awareness (Bug X + Bug Z).** Two code paths, same conceptual gap: string literals must be opaque to (X) the BS/comment scanner and (Z) the post-emit identifier mangler. Mangler precedent: S34 Bug D `27ed6fe` `(?<!\.)`, S39 Bug I `6b3e63f` `(?<!\.\s*)` — both regex band-aids; string-opacity is the real fix. GITI-023 was the 3rd member (lexer digraph) — now fixed, leaving X+Z.
- **Cluster D — match codegen (Bug Y + Bug AA).** Y = comma-arm invalid emit (gate now loud); AA = bare-tail-match implicit-return dropped in plain `function`. Both value-handling in match lowering.
- **Cluster E — Q-AB design read.** Answer the canonical `<onTransition>`-firing trigger (§51.0.F). Empty handler table + plain reactive_set bypass is the codegen reality; need to decide whether bare `@var = .Variant` from program scope SHOULD dispatch (codegen gap) or whether the canonical trigger is a state-child-body / specific call form (then it's a doc/diagnostic answer). The `W-ENGINE-SELF-WRITE-DETECTED` lint already nudges away from the bare write.
- **Cluster F — §36 input-state read-path (Bug AC).** Standalone HIGH. Read emits `_scrml_input_<id>_` (unbound); fix routes through `_scrml_input_state_registry.get("<id>")` (or emits a `const _scrml_input_<id>_ = registry.get("<id>")` binding once). Canonical sample `samples/compilation-tests/input-canvas-demo.scrml` is itself broken (Bug-51-class: emit-string-only gate, no happy-dom). Secondary reactivity Q (getters not reactive-backed) — decide if in scope.

### Triage notes
- **The gate is doing its job**: GITI-022 + Bug-Y flipped from silent exit-0 to loud `E-CODEGEN-INVALID-JS` — the v0.6.11 invariant working as designed. They still need codegen fixes, but adopters no longer get silent-wrong output for those two.
- **GITI-023 NOT-REPRODUCED** is the R26-reverse payoff — would have been a wasted fix-dispatch.
- Inbox messages NOT yet moved to `read/` (await user ack/action per protocol). Reply owed to giti (close GITI-023; ack 020/021/022) + 6nz (answer Q-AB; ack X/Y/Z/AA/AC).

---

## Open questions / S144 priorities to surface

1. **Inbox fix-wave** — bug-priority-over-feature doctrine (S136) makes this the default next priority. Recommend order by impact: **A+B (server-fn lowering, 3 bugs) → F (input-state) → C (string-awareness) → D (match codegen) → E (Q-AB read).** Await user steering on scope (all / subset) + whether to run as parallel worktree dispatches like S143.
2. **R28 carry-forward (from S143)** — R28-8 design call (extend §14.10 vs canon-fix kickstarter §4.8); R28-1c/R28-1d MED needs-confirm (each per-item reactivity + bare-`<program>` default-logic drops `<each>`); R28-4 (E-PA-002 misleading); R28-2b/R28-7b LOW; R28-C2 kickstarter drift bundle.
3. **S142 branch-coherence candidate addendum — RATIFY?** Battle-tested across all 6 R28 landings (S143). "On every dispatch landing, verify `git rev-list origin/main..HEAD` + branch-tip-vs-FINAL_SHA coherence, not just `git status`-clean." Surface for ratification.
4. **Maps refresh** (~20+ commits stale) — before any codegen dispatch.
5. **Other carry-forward**: C4/R28-5 object-literal lifecycle E-TYPE-001 dormant; C6 formFor bind in engine state-child; Bug 9 L3 transitive async; within-node allowlist staleness; native parser M2.4 + MK2 (S112 charter B, multi-quarter); fresh gauntlet R29 (now vs v0.7.0 baseline).

---

## pa.md directives in force entering S144
- **S136** BRIEF.md archival · **S138** R26 bidirectional · **S139** `full wrap` (in-session-only; NOT active).
- **CANDIDATE PENDING (carried from S142/S143):** branch-leak coherence addendum (battle-tested 6×; surface for ratification).
- Standing: `--no-verify` prohibition (extends pre-push); S126 Bash-edit + no-`cd`-into-main; S99 path-discipline (20); S88 explicit isolation:worktree; S90 CWD gate; S83 commit-discipline + verify-git-state; S94 bump-on-tag; `feedback_file_delta_vs_cherry_pick`.
- Rules: R1 no marketing · R2 not-a-toy · R3 right-beats-easy · R4 SPEC normative · R5 shoot straight · S133 typo-flag.

---

## Tags
#session-144 #OPEN #caught-up #inbox-triaged #cross-machine-sync-recovered #server-fn-lowering-cluster #string-awareness-cluster #match-codegen-cluster #input-state-bug-ac #giti-023-not-reproduced #gate-catching-invalid-js

---

## 🚀 S144 CLOSE-OUT (option 3 — push + acks)
- **Pushed:** scrmlTS main (6 fix-wave + close-out commit) + scrml-support (deep-dive + Insight 33 + ratification) → origin.
- **Acks sent:** giti (020/021/022 FIXED `8e7f18fe`; 023 NOT-REPRODUCED/closed) + 6nz (X `e50ee9c2` / Z `88071273` / Y+AA `93d8cab4` / AC `c6cd6538`; Q-AB answered = Bug-AB `5113f3ea` + the C1 on-enter resolution). Inbox moved to `handOffs/incoming/read/`.
- **DEFERRED to a full wrap (NOT done — user asked push+acks only):** `docs/changelog.md` S144 entry · master-list §0 refresh · `known-gaps.md` refresh (inbox bugs → resolved; §51.0.H → C1-ratified-impl-pending; R28 carry-forwards still open) · `scratch/` play-files left untracked (exploration; canonical repros live in `docs/changes/`).
- **CARRY-FORWARD:** (1) C1 impl arc (SPEC §51.0.H + effect=-on-opener + §34 `E-ENGINE-EFFECT-ON-DERIVED` + edge-case rulings + codegen + README flagship fix); (2) tier-rung re-deep-dive (corpus-zero discounted; jump-pain re-tested on current gauntlets; inherit on-enter precedent); (3) full wrap doc-refresh.

### S144 push — `--no-verify` (USER-AUTHORIZED) + flake carry-forward
The scrmlTS push used `git push --no-verify` per explicit user authorization. Reason: the pre-push full-suite gate tripped **3 CONFIRMED parallel-load flakes** — `self-compilation.test.js` (bootstrap ts.scrml + ast.scrml self-host parity) + `trucking-dispatch-smoke-integration.test.js` (manifest.compiler stable-across-two-compiles). **All pass in isolation** (self-compilation 22/22, trucking 13/13) → NOT S144 regressions (parity + determinism hold; purely parallel-load timing/interference). S143's pre-push was clean (22,215/0) → intermittent. Before pushing, PA manually verified: full suite **22,263 pass / 0 real fail** (modulo the 3 flakes) + TodoMVC JS `node --check` PASS (the hook's other gate). Pushed: scrmlTS `505f4ace..4c9079d2`, scrml-support `08cd936..f43c666` (both 0/0).
**CARRY-FORWARD (next session — user-directed): FIX THE 3 FLAKY TESTS** — make `self-compilation.test.js` + `trucking-dispatch-smoke-integration.test.js`'s two-compile-determinism case parallel-safe (serialize / isolate fs / raise timeouts) so the full-suite pre-push stops flake-blocking pushes. Recurring blocker until fixed.

## 📨 FRESH INBOX — arrived mid-wrap (S145 TRIAGE, NOT acted this session)
**GITI-024** (`handOffs/incoming/2026-05-30-1037-giti-to-scrmlTS-giti-024-server-split-braceless-continue.md` + .scrml) — *brace-less `continue` in server-split emit swallows the next identifier as a label → `E-CODEGEN-INVALID-JS`; + a spurious `.server.js` emitted for plain functions.* Arrived 10:37 DURING the S144 wrap, after the inbox was processed → UNREAD. **Triage at S145** (read repro + classify + root-cause hypothesis before any fix-dispatch, per adopter-bug-diligence). **NB:** likely adjacent to the S144 A+B server-fn-split lowering surface (`8e7f18fe`) — check relatedness / possible regression FIRST. Sidecar present.
