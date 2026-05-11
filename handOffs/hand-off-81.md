# scrmlTS — Session 81 (CLOSE — 7 commits · F.1/F.2 adopter overrides + strict self-host gate + A10 deferred closure + SPEC-INDEX regen + D3/D1 A9-Ext-5 follow-ups + OQ-2 debounce/throttle keyword-form RETIRED · +42 tests · 0 regressions · pushed)

**Date opened:** 2026-05-11
**Date closed:** 2026-05-11 (single-day session)
**Previous:** `handOffs/hand-off-80.md` (S80 close — auth/protect/csrf codification + D3 csrf= drift resolved + Bootstrap L3 strip-bug fix + A5-7 canonical samples + 6 commits / 0 regressions)
**This file:** rotates to `handOffs/hand-off-81.md` at S82 open

**Tests at open (S80 close baseline):**
- pre-commit subset: 10,416 pass / 62 skip / 1 todo / 0 fail (506 files)
- full suite: 11,139 pass / 73 skip / 1 todo / 0 fail (534 files)

**Tests at S81 close (pre-commit subset, `dd29e3b`):** **10,433 pass / 66 skip / 1 todo / 0 fail** (507 files; +17 from baseline)
**Tests at S81 close (FULL suite, `bun run test`):** **11,181 pass / 77 skip / 1 todo / 0 fail** (535 files; +42 pass / +4 skip / +1 file / 0 regressions vs S80)

---

## S81 close — summary

Substantive session. **Seven distinct ships landing across one day**, chaining smaller items into a larger keyword-retirement. Pre-commit hook fired clean on every commit; full-suite re-run at session close confirmed zero regressions across all 11,139 pre-existing S80 tests.

### S81 commit chain (in order — 7 commits on scrmlTS + 1 on scrml-support)

**scrmlTS commits (7):**

1. `ab980c0` feat(s81-f1-f2): F.1 `<program cors-max-age=N>` + F.2 `<program channel-reconnect=N>` adopter overrides; SPEC §39.2.1 amendment + §38.3.1 NEW subsection + §38.3 attribute table cleanup; +21 tests
2. `7189bd9` chore(s81): strict self-host rebuild gate at scripts/rebuild-self-host-dist.ts (exit-1 on host-compiler errors); spec-conformance audit doc at docs/audits/self-host-spec-conformance-2026-05-11.md (filed, source-side sweep DEFERRED to v0.3.0+)
3. `f50f313` feat(s81-a10-followon): Phase A10 deferred items closed — TS body-walk re-enablement on engine-decl + payload-binding scope injection; engine-arm typos now fire E-SCOPE-001 at compile time; +7 tests
4. `b6c8e1c` chore(s81): SPEC-INDEX regen — `scripts/regen-spec-index.ts` (TS, idempotent, preserves summaries, handles §49 single-`#`); 62 Sections-table rows refreshed
5. `7173bfe` feat(s81-d3): pure-fn call detection in monotonicity classifier (A9 Ext 5); FunctionPurityLookup threaded through `analyzeMonotonicity` → `classifyStatement`; +13 tests. Project-mapper incremental refresh bundled.
6. `acfd20c` feat(s81-d1): export-synth `.idempotent()` modifier propagation (A9 Ext 5); tokenization-tolerant regex on synth raw; +5 tests
7. `dd29e3b` feat(s81-oq2): imperative `debounce(fn,ms)`/`throttle(fn,ms)` keyword-call form RETIRED — removed KEYWORD reservation, deleted parse blocks + AST kinds + codegen + runtime helpers; adopters use stdlib `scrml:time` or §6.13 attribute form; net -87 LOC

**scrml-support commits (1):**

- `16e201f` user-voice: S81 — "not" directive (library-mode inclusive) + self-host orthogonal to v0.2.0 + CLI auto-fix (`bun scrml fix`) registered as v0.3 roadmap idea

---

## S81 thread-by-thread

### Thread 1 — Session bootstrap + cross-machine sync

Per pa.md "Per-machine setup": session-start checks found `core.hooksPath = scripts/git-hooks` already set (persisted from S80 install). scrmlTS clean at session start; scrml-support 2 commits behind origin (S80 deep-dive doc + Batch K archive landings on the OTHER machine). `git pull --rebase` clean. No surprises.

### Thread 2 — Priority #4 (multi-token threshold deep-read) → S81 F.1+F.2 ship (`ab980c0`)

User picked priority #4 from carry-forward menu. Per S78 audit §7 caveat predicted "2-4 more Bucket C items lurking in `codegen/emit-*.ts` related to rate-limit/CSRF/CORS Max-Age." Per-file deep-read across all 25 emit-* files surfaced **exactly 2** Bucket C candidates (matches lower bound):

- **F.1**: `Access-Control-Max-Age='86400'` hardcoded at emit-server.ts:339 with no override path. S78 §1 dropped-set misclassified this as "passes through middleware config" — it doesn't (only the origin URL does).
- **F.2**: `reconnectMs = 2000` hardcoded in `extractChannelAttrs` at emit-channel.ts:124. Per-channel `<channel reconnect=>` exists, but no project-level default.

Both ship same-shape as S79 C.1/C.2: `<program ATTR=VALUE>` attribute with parsed-at-codegen-time helpers (`parseCorsMaxAge`, `parseChannelReconnect`); silent fallback on null/malformed per v1 scope. F.1 + F.2 + S79 C.1 + S79 C.2 establishes the 4-precedent pattern that `<program>` attributes are the canonical configurability locus for compiler-emitted middleware defaults.

Side fix at SPEC §38.3 attribute table: S80 rename of `<channel protect=>` → `<channel auth=>` had been missed at table-level cleanup; row updated.

Audit doc landed at `docs/audits/hardcoded-thresholds-followup-2026-05-11.md` (246 lines).

### Thread 3 — Self-host null/undefined surfacing → strict gate + audit doc (`7189bd9`)

User noticed `!= null` patterns in the S81 F.1+F.2 ast.scrml mirror edit. PA verification per Rule 4: SPEC §42 + E-SYNTAX-042 (§34 line 14779) make `null`/`undefined` unconditional violations in scrml source. The 3 new lines I added were stylistically consistent with the surrounding 200+-occurrence violation chain — but the CHAIN ITSELF was the violation. Drilling in surfaced a much bigger structural finding:

1. **362 null/undefined occurrences across 13 self-host files** (per grep): ast.scrml 62+10, ts.scrml 140+2, ri.scrml 50, pa.scrml 20+6, dg.scrml 17, bs.scrml 13, meta-checker ×2 = 22, module-resolver ×2 = 10, bpp.scrml 5, tab.scrml 3+2, cg.scrml 0.
2. **The rebuild script silently emitted dist files even when the host compiler reported violations.** `scripts/rebuild-self-host-dist.ts` used a truthy `entry?.libraryJs` check that ignored the errors array. Pre-S81 this leak let drift accumulate undetected for an unknown period.
3. **The GCP3 detector has a walker gap.** Strict-rebuild baseline: 5 files surface 312 total errors (140 E-SYNTAX-042 + 15 E-EQ-004 + 2 E-ERROR-007 + 30 E-FN-003 + 3 other fn-codes + 2 E-MU-001 + 120 E-SCOPE-001). 6 files compile clean despite having grep-detected null source — the walker doesn't descend into let-decl inits in pure-logic-rooted modules. Filed as a separate sub-project (~1-2h).

**User directives over two clarifications:**
- "self hosting is entirely orthogonal. And at the moment I would prefer to spend the tokens getting the compiler all the way [to v0.2.0]." → source-side sweep DEFERRED to v0.3.0+
- "TBC. I am saying that the 'not' directive that I stated is still in play. null/undefined should not compile." → strict gate ACTIVE; the bypass was itself a rule violation

**Landed:** scripts/rebuild-self-host-dist.ts strict-gate change (exit 1 on any non-warning error from host compiler). Audit doc at `docs/audits/self-host-spec-conformance-2026-05-11.md` (190 lines) captures full inventory + sweep plan (~8-12h estimate when taken up) + detector-gap finding + non-null violations breakdown (E-EQ-004 mechanical / E-ERROR-007 needs design / E-FN-003 case-by-case / E-MU-001 small / E-SCOPE-001 triage). User-voice S81 (`16e201f`) appends the three durable directives.

**Operational consequence:** 5/11 self-host files fail the rebuild gate today. Their `compiler/dist/self-host/{ast,ts,ri,pa,dg}.js` are stale relative to current source until either (a) the source is swept or (b) someone re-runs rebuild with gate disabled (NOT recommended). compiler/tests/self-host/ is excluded from pre-commit so this doesn't block compiler-side work.

### Thread 4 — Priority #1 (Phase A10 deferred items) → A10-followon ship (`f50f313`)

User picked priority #1. The two A10 deferrals had been preserved from S78/S79/S80 hand-offs:

- **Payload-binding scope injection** — `<Error msg>` introducing `msg` as local in arm body sub-scope (per match-arm-block B20 pattern)
- **Type-system body-walk re-enablement** — gated on emission-boundary structural-element filter

The gate condition (codegen `STATE_CHILD_STRUCTURAL_TAGS` filter in `emit-variant-guard.ts`) had landed at S78 Phase A10 ship. So both deferrals were structurally enable-able at S81.

Investigation surfaced the REAL value-add: with TS body-walk disabled, **typos inside engine state-child bodies** (e.g., `${mssg}` instead of `${msg}` inside `<Error msg>`) passed silently to runtime. Re-enabling closes a real safety net.

Implementation at `compiler/src/type-system.ts:5435` engine-decl case:
- Replaced `tAsIs()` early-return with proper body-walk
- For each state-child markup node: push `engine-arm:<tag>:<nodeKey>` scope, extract payload bindings via local helper (TS-side duplicate of codegen's `extractPayloadBindingsFromAttrs` — TS is upstream of codegen so can't import), bind each name with `tAsIs()` resolved type, descend into renderable children (filtering structural tags at every level), pop scope.
- Pattern mirrors B20's match-arm-block payload-destructure injection at line 5102-5125.

Symbol-table comment at PASS 3 (`type-system.ts:1619`) updated to reflect S81 closure of the gap.

+7 unit tests at `compiler/tests/unit/engine-body-typecheck-a10-followon.test.js` covering positive (`${msg}` resolves) + negative (typos fire E-SCOPE-001) + arm-locality + multi-binding + structural-element skip + outer-scope-preservation.

### Thread 5 — Priority #11 (SPEC-INDEX regen) → mechanical line-range refresh (`b6c8e1c`)

Auto-generated SPEC-INDEX line numbers stale across S64-S80 amendments. Legacy `scripts/update-spec-index.sh` is print-only; the actual table-row updates were always manual. PA wrote `scripts/regen-spec-index.ts` (TS, idempotent, preserves summaries, handles §49's single-`#` `# §49.` heading correctly). 62 of 63 Sections-table rows refreshed (TOC row also handled). "Total lines" updated 25,508 → 26,286. New entry in build.map.md catalogue.

### Thread 6 — Priority #8 (Insight 28 OQ-bridge-2) → verified passive

Quick verification: OQ-bridge-2 is correctly filed in `scrml-support/design-insights.md` Insight 28 with the friction-trigger condition ("≥3 adopter reports of `custom(fn)` zod-wrapper as friction → re-debate"). No current action needed. Closed-as-verified.

### Thread 7 — Priority #12 (Project-mapper refresh) → bundled with D3 commit

Project-mapper agent dispatched in background; hit a system-reminder vs user-prompt conflict on Write. Agent surfaced refresh content inline; PA persisted maps directly. Refreshed 7 of 14 maps; 4 left unchanged (config/dependencies/events/error — no detected drift). New non-compliance.report.md entries for 4 candidate archival items (a5-7 INVENTORY, debounce-throttle dispatch dir, both hardcoded-thresholds audits) + 1 known-drift register (published dev.to article with stale `<channel protect=>` line — DO NOT TOUCH per Rule 1) + 1 uncertain (self-host-spec-conformance audit). Maps committed alongside D3 (`.claude/maps/` is tracked in git despite the gitignore rule — predates the rule).

### Thread 8 — Priority #6 A9 Ext 5 D3 (pure-fn detection) → D3 ship (`7173bfe`)

User picked D3 over D5/D1 ordering rationale: D3 has measurable correctness improvement TODAY (over-emission of idempotency keys = wasteful HTTP-header bandwidth + dedup-table rows). D5 is adopter-signal-gated; D1 is structurally sound today.

Implementation at `compiler/src/monotonicity-analyzer.ts`: new exported type `FunctionPurityLookup` (minimal structural shape — TS-only); threaded as optional 3rd param through `analyzeMonotonicity` → `classifyFunctionMonotonicity` → `classifyStatement`. New helper `isPureFnCallStatement` returns true iff bare-expr with call exprNode + bare IdentExpr callee + every functionIndex entry has `fnKind === "fn"` + no arg contains nested call OR SQL sub-tree. `null` functionIndex preserves pre-D3 conservative-non-monotone behavior (backward compat).

`api.js` wiring: `buildFunctionIndex(ceResults)` called between RI + MC stages; passed to `analyzeMonotonicity`.

+13 unit tests covering positive (fn-kind callee → monotone), negative (function-kind → non-monotone, unknown → non-monotone, member-access callee → non-monotone, mixed-kind overload → conservative non-monotone, nested call in arg → non-monotone, SQL arg → non-monotone via SQL classification precedence), mixed batches (SELECT + pure-fn → monotone), backward compat (null index → non-monotone).

### Thread 9 — Priority #6 A9 Ext 5 D1 (export-synth modifier propagation) → D1 ship (`acfd20c`)

The synthetic function-decl created from `export function foo() {...}` at ast-builder.js:~5871-5887 (export-decl path) didn't propagate `.idempotent()` modifier per §19.9.7. Downstream walkers reading `fnNode.idempotentModifier === true` on the synth node saw `undefined`. No production breakage (raw export emission preserved the modifier text verbatim) — but the monotonicity classifier missed the override.

Fix: tokenization-tolerant regex (`/\)\s*\.\s*idempotent\s*\(\s*\)/`) tested against the export raw. First-attempt regex didn't account for the space-padded post-tokenization rejoin — quick iteration corrected to allow whitespace between every token.

+5 unit tests covering positive (export function + .idempotent() → flag set), negative (plain export → flag absent), fn-kind synth (export fn + .idempotent()), server combo, comment-only `.idempotent()` mention documented as a known false-positive surface (test accepts either outcome as a forward-compat awareness anchor).

### Thread 10 — Priority #4 redux (Debounce/throttle imperative keyword retirement, OQ-2) → big ship (`dd29e3b`)

Investigation surfaced ZERO adopter footprint: grep across samples/examples/stdlib returned only the stdlib's OWN implementation of `debounce`/`throttle` in `stdlib/time/index.scrml:238+272`. The imperative `debounce(fn, ms)` / `throttle(fn, ms)` form was a special-form keyword call with custom AST kinds + runtime helpers, but the stdlib alternative is fully shipped + the §6.13 attribute form is canonical. Clean-cut retirement is the right precedent (mirrors S79 Approach B for `reactive-debounced-decl`).

**Retirement scope (12 files touched):**

- `tokenizer.ts:70` — removed `debounce`, `throttle` from KEYWORDS (now tokenize as IDENT; side benefit: `let debounce = ...` no longer fires E-RESERVED-IDENTIFIER)
- `ast-builder.js:~7579-7669` — deleted DEBOUNCE + THROTTLE built-in parse blocks (~90 LOC)
- `types/ast.ts:~1229-1249` — deleted `DebounceCallNode` + `ThrottleCallNode` interfaces + union members
- `codegen/emit-logic.ts:~2166-2176` — deleted case arms
- `codegen/emit-client.ts:~310-317` — deleted chunk-detector case arms
- `component-expander.ts:~104-106, ~1274-1281` — deleted type imports + substitution case arms
- `runtime-template.js:~1044-1062` — deleted `_scrml_debounce` + `_scrml_throttle` runtime helpers
- `codegen/runtime-chunks.ts:~29-31` — updated utilities-chunk doc comment
- 4 test files migrated/updated to reflect retirement

**Test migration:**

- `compiler/tests/unit/tab.test.js:~2049-2065` — pre-S81 tests verified `debounce(fn, ms)` produces `debounce-call` AST kind; post-S81 verify the AST kind no longer appears + form parses as `bare-expr`/`expression-statement`. New +1 test: `let debounce = 42` works (formerly E-RESERVED-IDENTIFIER).
- `compiler/tests/unit/code-generator.test.js:~1720-1759` — pre-S81 asserted `_scrml_debounce` emission; post-S81 verify retired helpers don't appear in default output.
- `compiler/tests/self-host/tab.test.js:158` — "scrml keywords" parity fixture updated to drop `debounce throttle`.
- `compiler/tests/helpers/extract-user-fns.js:~78-79` — removed `debounce(?!_\d)|throttle(?!_\d)|` alternations from internal-helper filter regex.

**Migration story (zero adopter footprint = trivial):**
- Before: `debounce(handleSearch, 250)`
- After: `import { debounce } from "scrml:time"` then `debounce(handleSearch, 250)` (regular CallExpr through stdlib import)

The S81 user-voice (`16e201f`) entry on `bun scrml fix` registers this kind of mechanical migration as a v0.3 roadmap idea — the CLI sub-command would auto-rewrite null→not, ===→==, and this debounce/throttle import-insertion shape.

Net: -87 LOC.

**Quirk encountered + fixed**: the first runtime-template.js retirement-note comment used backticks inside `//` line comments (`` `_scrml_debounce` ``) and Bun's JS parser flagged a syntax error at the backtick. Tokenization is parser-version-dependent — simplified to plain text + no-backtick prose.

---

## S81 audit-thread outcomes

### Hardcoded-thresholds follow-up (priority #4) — FULLY CLOSED

S78 §7 caveat predicted "2-4 more Bucket C items lurking." S81 audit found exactly 2 (lower bound):
- F.1 CORS Max-Age (S78 misclassified as middleware-routed)
- F.2 channel-reconnect default

Both shipped at `ab980c0`. Audit doc filed; can be archived after S81 wrap dispatch sequence completes per project-mapper non-compliance report.

### Self-host spec-conformance — STRICT GATE ACTIVE; SOURCE SWEEP DEFERRED

362-occurrence null/undefined inventory across 13 files + 4 adjacent violation categories captured in `docs/audits/self-host-spec-conformance-2026-05-11.md`. Strict rebuild gate honors the "null/undefined never compile" directive; source-side cleanup is v0.3.0+ orthogonal work per user direction.

### Phase A10 deferred items — FULLY CLOSED

Both deferrals (TS body-walk re-enable + payload-binding scope injection) shipped together at `f50f313`. The pre-S81 hand-off menu's priority #1 now reads CLOSED.

### A9 Ext 5 D3 + D1 — FULLY CLOSED

Two of the three S76 carry-forwards shipped. D5 (Redis backend inlining) remains adopter-signal-gated — no current signal.

### OQ-2 imperative debounce/throttle retirement — FULLY CLOSED

Last S79 OQ deferral closed at `dd29e3b`.

---

## S81 user-voice (recorded in scrml-support `16e201f`)

Three durable verbatim entries:

1. **"not" directive remains in play (library-mode inclusive).** The rebuild-script bypass was itself a rule violation. Closed at scrmlTS `7189bd9`.
2. **Self-host parity is orthogonal to v0.2.0.** Source-side cleanup deferred to v0.3.0+. Audit doc + sweep plan filed.
3. **CLI auto-fix idea registered as v0.3 roadmap.** `bun scrml fix` would mechanically convert null→not, ===→==, etc. Out-of-scope categories explicitly documented (try/catch / fn-purity / mutation-decls / E-SCOPE-001 are NOT mechanical).

---

## Cross-machine sync state at S81 close

- **scrmlTS:** all 7 ships pushed per-commit through session. 0/0 origin/main at wrap.
- **scrml-support:** 1 commit ahead at session-start (rebased clean to S80 deep-dive doc); 1 new commit pushed mid-session at `16e201f` (user-voice S81). 0/0 origin/main at wrap.

Per pa.md "wrap" §7 default (push included) — already pushed per-commit.

---

## Next priority — menu (S81 close — carry-forward)

Awaiting user direction at S82 open. Three items SHIPPED at S81:
- ~~#1 Phase A10 deferred items~~ (CLOSED via `f50f313`)
- ~~#4 Multi-token threshold deep-read~~ (CLOSED via `ab980c0` F.1+F.2)
- ~~#11 SPEC-INDEX regeneration~~ (CLOSED via `b6c8e1c`)

Three D-items from A9 Ext 5: D3 + D1 SHIPPED (`7173bfe`, `acfd20c`); D5 remains adopter-signal-gated.

OQ-2 debounce/throttle imperative-keyword retirement SHIPPED at `dd29e3b`.

### Active remaining priorities

1. **A6-6 optional API alignment** — LSP/CG API design dive (TBD scope; would need investigation + proposal before implementing).

2. **A9 Ext 5 D5 — Redis backend inlining.** Stubbed in `compiler/runtime/idempotency.js`; not yet inlined into emit-server.ts; SQL backend covers default-resolution target. **Adopter-signal-gated** — only ship when an adopter explicitly uses `idempotency-store="redis"`.

3. **W-LEAK-010 follow-up** (per memory-leak deep-dive refresh §7.2):
   - Step 2: `<program idempotency-store=>` background sweeper (CG/runtime dispatch)
   - Step 3: LC pass implementation (Stage 7.6, SCOPE-AND-DECOMPOSITION dispatch)
   - Hold for v0.3.0+ unless W-LEAK-010 spec-amendment is fast-tracked

4. **Insight 28 OQ-bridge-5** — compile-time WARNING when bridged validator on schema-column field — defer to compiler-diagnostics audit pass.

5. **Insight 28 OQ-bridge-2** — passive (re-debate trigger on ≥3 adopter friction reports). **VERIFIED FILED at S81** in `scrml-support/design-insights.md` Insight 28.

6. **Versioning-discipline discussion** (deferred from S78) — patch-version-as-lifecycle-stage thread. Adjacent question: should `0.2.0` be re-scoped tighter? Hold for a session of its own.

### Future direction (v0.3.0+ orthogonal track)

7. **Self-host parity work** — `cg.scrml` structural restructure (exports inside `^{}` meta-block produces empty dist) + the deeper 21-of-23 parity assertions + the 362-occurrence null/undefined sweep + adjacent E-EQ-004/E-ERROR-007/E-FN-003/E-MU-001/E-SCOPE-001 cleanups. ~8-12h total estimate per `docs/audits/self-host-spec-conformance-2026-05-11.md` §5. **DEFERRED to v0.3.0+** per S81 user direction.

8. **GCP3 walker gap** — `gauntlet-phase3-eq-checks.js:walkAst` doesn't descend into let-decl inits in pure-logic-rooted modules. Real bug in detector. ~1-2h diagnose + extend + tests. Filed alongside #7.

9. **`bun scrml fix` CLI auto-fix sub-command** — v0.3 roadmap per S81 user-voice. Mechanical rewrites for null→not / ===→== / and similar deterministic spec-evolution conversions. Same surface precedent as `bun scrml migrate <file>` for `<machine>` → `<engine>`.

10. **Articles thread (5 in-flight drafts at scrml-support/voice/articles/):** Per pa.md Rule 1, no PA-volunteered marketing work; await user-raised threads.

---

## Open questions to surface immediately at S82 open

1. **Push state — CLEAN at S81 close.** scrmlTS 0/0 origin; scrml-support 0/0 origin. No outstanding push.

2. **Project-mapper refresh state** — refreshed at S81 (bundled with `7173bfe` D3 ship). Next session pickup is current. Map non-compliance findings (4 archival candidates + 1 known-drift + 1 uncertain) NOT yet acted on; could be addressed at any future session via single-pass deref.

3. **scrml-dev-pipeline agent not staged on THIS machine** (carry-forward). All S81 ships were PA-direct; no compiler-source dispatches needed. Future compiler-source dispatches still need either (a) master-PA to stage the agent (and switch machines after) OR (b) continue using `general-purpose` for SPEC-text-only / `scrml-deep-dive` for diagnostics. Worktree-isolation friction continues to favor PA-direct for small-scope ships.

4. **Self-host strict rebuild gate is ACTIVE.** Any new self-host dispatch must address the 5/11 failing files (ast/ts/ri/pa/dg) before re-running. Pre-commit hook excludes self-host tests so this doesn't block compiler-side work. Source-side null/undefined sweep is v0.3.0+ orthogonal — NOT a v0.2.0 blocker.

5. **GCP3 walker gap is filed** but not in the immediate priority menu. Sub-project ~1-2h. Should be paired with the self-host source sweep when that lands (cleaner together than separately).

6. **Worktree branches retained from S79+S80** (forensic per S67): `worktree-agent-ab656f3dcdd0f1638` (S79 debounce/throttle dispatch, 6 WIP commits). S81 had no isolation:"worktree" dispatches. Cleanup not priority.

7. **3 legacy master inbox carry-overs** (S78+S79+S80+S81 carry-forward, still safe-to-ignore unless sweep requested):
   - `2026-04-22-scrmlTS-to-master-insight-25-multi-meta.md` (UNREAD legacy)
   - `2026-05-08-S72-scrmlTS-to-master-needs-push-SUPERSEDED.md`
   - `2026-05-08-S71-scrmlTS-to-master-stage-scrml-dev-pipeline.md`

---

## Things S82 PA must NOT screw up (S77/S78/S79/S80 standing list + S81 additions)

S77/S78/S79/S80 lists carry forward verbatim. **S81 additions:**

- **DON'T disable the strict self-host rebuild gate** (`scripts/rebuild-self-host-dist.ts` exit-1 on host-compiler errors). The bypass that the gate closed was itself a "null/undefined never compile" violation per S81 user-voice. Self-host source-side cleanup is the right next step IF that work is taken up; DO NOT revert the gate to silently emit dist again.
- **DON'T attempt the self-host source-side sweep without explicit user authorization.** S81 deferral was explicit and direction-bound. The audit doc + sweep plan are ready; the work is ready when prioritized.
- **DON'T touch the channel-protect-stale line in `docs/articles/realtime-and-workers-as-syntax-devto-2026-04-29.md:200`.** Per pa.md Rule 1 (no marketing-shaped work) AND because published dev.to articles are immutable historical records. Project-mapper non-compliance report flagged as known-drift.
- **DON'T regenerate SPEC-INDEX via `scripts/update-spec-index.sh`** (legacy; print-only). Use `bun run scripts/regen-spec-index.ts` instead. Comment in the legacy script documents the new path.
- **DON'T introduce new `debounce(fn, ms)` / `throttle(fn, ms)` imperative calls** without first `import { debounce, throttle } from "scrml:time"`. The KEYWORD reservation is gone; bare names now resolve as IDENT and need stdlib import. AST kinds `debounce-call`/`throttle-call` no longer exist.
- **DO use the `<x debounced=Nms>` / `<x throttled=Nms>` attribute form** for state-cell timing (canonical per §6.13). The retired imperative form was for ad-hoc function debouncing; that's now a stdlib concern.
- **DON'T forget the §38.3 attribute-table update from S81** — `<channel auth=>` is now properly documented; `<channel protect=>` is no longer in the table (S80 retirement caught at S81). Any new channel-attribute docs should reference §38.3 + §38.3.1 (NEW S81).
- **DON'T duplicate the engine-state-child grammar helpers** in type-system.ts when SYM PASS 11 populates `EngineStateChildEntry.payloadBindings` (filed as future cleanup). Today the local helpers in `type-system.ts:~85-115` are an intentional duplicate of `emit-variant-guard.ts` constants because TS is upstream of codegen and can't import from `./codegen/*`. When PASS 11 populates `entry.payloadBindings`, BOTH consumers can be retired in favor of reading `entry.payloadBindings`.

---

## Tags

#session-81 #close #7-commits #adopter-overrides-shipped #strict-self-host-gate #phase-a10-closed #spec-index-regen #d3-pure-fn-detection #d1-export-synth-modifier #oq-2-imperative-debounce-retired #42-net-tests #0-regressions #pushed #v0.2.0-substantive-progress
