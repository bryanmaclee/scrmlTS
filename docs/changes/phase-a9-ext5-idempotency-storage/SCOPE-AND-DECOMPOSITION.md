# A9 Ext 5 — SCOPE-AND-DECOMPOSITION (S76 PA dispatch overlay on SURVEY)

**Status:** dispatch-authorized 2026-05-09 (S76).
**Predecessor:** `SURVEY.md` (599 lines, S75) — full Phase 0 work; **authoritative for §1-§9**.
**This doc:** S76 PA overlay encoding the 6 OQ resolutions + dispatch shape. Read SURVEY first; read this for the resolutions to encode.

---

## §A. Dispatch shape

- **Single agent, sequential D0-D8** (per SURVEY §4.3 recommendation).
- **Tier:** T2 (compiler source + spec text + new files + new tests).
- **Budget:** ~50h end-to-end (discount-adjusted per SURVEY §5.1).
- **Isolation:** `worktree`.
- **Model:** `opus` (per pa.md global rule).
- **Landing protocol:** S67 worktree-as-scratch / file-delta (PA reviews `git diff main..<branch>`, pulls via `git checkout <branch> -- <files>`, single PA-authored ship commit in main).
- **Crash recovery:** incremental commits per D-step + `progress.md` append-only updates per pa.md global directive.

---

## §B. OQ resolutions (S76 PA-decided — DO NOT re-deliberate at dispatch)

Each item below resolves one OQ from SURVEY §7. Encode in spec text + implementation per resolution; if implementation surfaces friction with a resolution, **halt and surface to PA**, do not silently deviate.

### §B.1 — OQ-Ext5-1 — Spec section anchor (HIGH)
**Resolution:** Primary spec section lands at **§19.9.6**, NOT §47. §47 = "Output Name Encoding" (verified at SPEC line 17857). Server-function locus is §19.9 (verified at SPEC line 11001).
**Insertion point:** new `#### 19.9.6` between current `#### 19.9.5 Auto-\`!\`-Wrap of CPS Server Stubs (Worked Example)` (line 11069) and `### 19.10 SQL Transactions` (line 11167).
**`.idempotent()` modifier:** new `#### 19.9.7` immediately after §19.9.6.

### §B.2 — OQ-Ext5-2 — `<program>` attribute name
**Resolution:** **`idempotency-store=`** (matches `db=` brevity; aligns with §40 attribute naming).

### §B.3 — OQ-Ext5-3 — Shadow-table schema
**Resolution:** survey default; INTEGER timestamps for cross-driver portability:

```sql
_scrml_idempotency_keys (
  key             TEXT    PRIMARY KEY,
  response_body   TEXT    NOT NULL,
  response_status INTEGER NOT NULL,
  created_at      INTEGER NOT NULL,
  expires_at      INTEGER NOT NULL
)
```

**TTL:** 24h (Stripe convention; compiler-internal constant; surface in §19.9.6 prose only).
**Eviction:** lazy on read (not background sweep — simpler for v0.2.0).

### §B.4 — OQ-Ext5-4 — `D-CPS-MONOTONE` info diagnostic
**Resolution:** **verbose-only**. Fires only when compiler runs with `--verbose` flag. Production builds elide. Other diagnostics (D-CPS-MACHINE-INTRINSIC-MONOTONE, D-CPS-IDEMPOTENT-OVERRIDE) fire at default verbosity per SPEC §34 normative.

### §B.5 — OQ-Ext5-5 — `<channel>` server-fns handling
**Resolution:** **SKIP**. Classifier early-returns on channel-tagged routes (`route.kind === "channel"` per likely shape; verify at dispatch). No key emission, no compile error. WS frame-level replay safety is a separate post-v0.2.0 concern.

### §B.6 — OQ-Ext5-6 — Default-resolution precedence
**Resolution:** already encoded in SURVEY §19.9.6 paragraph 3: **db-driver-shadow-table FIRST, then `scrml:redis` import, then "none" with static rejection**. No change.

### §B.7 — OQ-Ext5-7 — Classifier stage placement
**Resolution:** **NEW Stage 5.5** between existing Stage 5 RI and Stage 7 DG. Mirrors Stage 7.5 BP separating from Stage 7 DG. Add new section to PIPELINE.md (~30 LOC of prose). Co-locate code in `compiler/src/monotonicity-analyzer.ts` (NEW file per SURVEY §2.1).

### §B.8 — OQ-Ext5-8 — §40.2 sub-anchor mis-numbering
**Resolution:** **follow existing inconsistency in Ext 5**. Land new row as `#### 39.2.6 idempotency-store=` (matches existing pattern: `39.2.1 cors=` etc.). Spec-coherence cleanup of §39.2.x → §40.2.x is **out-of-scope** for Ext 5; will land as a separate doc-only commit later.

---

## §C. Sub-step decomposition (mirror Ext 4 D0-D8)

Each D-step ends with one WIP commit on the worktree branch. Format: `WIP(a9-ext5): D<N> — <short topic>`.

| Step | Topic | Tier | Budget | Output |
|------|-------|------|--------|--------|
| **D0** | Pre-snapshot + spec edit prose (§19.9.6 + §19.9.7 + §39.2.6 attribute row + §34 rows ×5; PIPELINE.md Stage 5.5 prose) | T1 | 6-8h | `WIP(a9-ext5): D0 — pre-snap + SPEC §19.9.6/§19.9.7/§39.2.6/§34 + PIPELINE Stage 5.5` |
| **D1** | `.idempotent()` modifier parsing (ast-builder.js + AST node-shape extension; `FunctionDecl.idempotentModifier: boolean`) | T1 | 2-4h | `WIP(a9-ext5): D1 — .idempotent() modifier parsing` |
| **D2** | `idempotency-store=` attribute parsing (attribute-registry.js) + default-resolution helper (`resolveIdempotencyStore`) + FeatureUsage flag (usage-analyzer.ts:51) | T2 | 4-6h | `WIP(a9-ext5): D2 — idempotency-store= attr + default resolution + FeatureUsage` |
| **D3** | Static monotonicity classifier (NEW `compiler/src/monotonicity-analyzer.ts`; Stage 5.5 hookpoint in route-inference.ts ~lines 2200-2260; channel-skip + machine-intrinsic recognition) | T2-T3 | 10-14h | `WIP(a9-ext5): D3 — monotonicity-analyzer.ts + Stage 5.5 hookpoint` |
| **D4** | Codegen — emit-functions.ts client UUID + `Idempotency-Key` header (~lines 200-340); emit-server.ts dedup middleware in BOTH CSRF paths (~lines 580-870, 630, 800) | T2 | 6-10h | `WIP(a9-ext5): D4 — codegen client UUID + server dedup middleware` |
| **D5** | Runtime helpers — NEW `compiler/runtime/idempotency.js` (3 backend helpers + shadow-table CREATE-IF-NOT-EXISTS bootstrap); new `idempotency` chunk in runtime-chunks.ts | T2 | 6-8h | `WIP(a9-ext5): D5 — runtime/idempotency.js + chunks registration` |
| **D6** | Static-reject diagnostics in type-system.ts (E-CPS-NONIDEM-NO-STORAGE + E-CPS-IDEMPOTENCY-STORE-DRIVER-MISMATCH + E-CPS-IDEMPOTENCY-STORE-MISSING-IMPORT + 2 D- codes); reuse Ext 4 W-CPS-NEEDS-FAILABLE infra | T2 | 4-6h | `WIP(a9-ext5): D6 — static-reject diagnostics` |
| **D7** | Tests — classifier unit + modifier unit + program-attr unit + emission integration + runtime-replay integration + SPEC presence (~75-110 new tests) | T2 | 10-14h | `WIP(a9-ext5): D7 — tests (classifier + modifier + attr + emission + runtime + spec)` |
| **D8** | Final friction burn-in + verification + report-back to PA. Run full `bun run test`; expect baseline-aware result vs S75 close (10,763 / 68 / 1 / 3 — 3 fails are env-only). **No SHIP commit on agent's branch.** PA writes the ship commit at landing. | T2 | 4-6h | `WIP(a9-ext5): D8 — final verification; ready for PA landing` |

**Total: ~52-76h gross; ~50h with reuse-discounts (db= shape, .nobatch() shape, Ext 4 envelope, Ext 4 diagnostic infra).**

---

## §D. Files-touched preview (PA's landing checklist)

**NEW files (3):**
- `compiler/src/monotonicity-analyzer.ts` (~300 LOC)
- `compiler/runtime/idempotency.js` (~200 LOC)
- `docs/changes/phase-a9-ext5-idempotency-storage/progress.md` (running log)

**EDITED files (8 + spec + pipeline):**
- `compiler/SPEC.md` (+~250-350 lines: §19.9.6 + §19.9.7 + §39.2.6 + §34 rows)
- `compiler/PIPELINE.md` (+~30 lines: Stage 5.5 section)
- `compiler/src/route-inference.ts` (+~30 LOC; classifier hook + monotonicity field on `cpsSplit`)
- `compiler/src/type-system.ts` (+~100 LOC; new diagnostic fire-sites)
- `compiler/src/ast-builder.js` (+~50 LOC; `.idempotent()` modifier parsing)
- `compiler/src/attribute-registry.js` (+~10 LOC; `idempotency-store=` registration)
- `compiler/src/codegen/usage-analyzer.ts` (+~30 LOC; `idempotencyStore` flag)
- `compiler/src/codegen/runtime-chunks.ts` (+~30 LOC; new `idempotency` chunk)
- `compiler/src/codegen/emit-functions.ts` (+~40 LOC; client-side UUID + header emission)
- `compiler/src/codegen/emit-server.ts` (+~80 LOC; server-side dedup middleware in both CSRF paths)

**NEW test files (6):**
- `compiler/tests/unit/a9-ext5-monotonicity-classifier.test.js`
- `compiler/tests/unit/a9-ext5-program-attr.test.js`
- `compiler/tests/unit/a9-ext5-idempotent-modifier.test.js`
- `compiler/tests/integration/a9-ext5-emission.test.js`
- `compiler/tests/integration/a9-ext5-runtime-replay.test.js`
- `compiler/tests/spec/a9-ext5-spec-amendments.test.js`

**Total LOC:** ~870-1100 implementation + ~75-110 new tests.

---

## §E. Out-of-scope (do not extend)

Per SURVEY §6 — confirmed do-NOT items:

- Ext 1 multi-batch CPS (~38h, deferred to v0.next+1)
- Ext 3 conditional-tier emission (~22h, deferred with Ext 1)
- Ext 2 loop-aware splitting (~34h, deferred with Ext 1)
- Cross-function body-split (~200-400h, deferred to v0.3.0+)
- Codemod for `.idempotent()` auto-insertion (per S72 migration-tooling rule)
- Multi-process server replication / cross-process replay coordination (post-v1.0.0)
- `.nonidempotent()` modifier (REJECTED Q2)
- Per-batch annotation `?{ } as idempotent` (REJECTED Q2)
- Compiler-inferred natural-key from batch contents (REJECTED — UUID only)
- CRDT-shape integration for `server @var` (deferred beyond Ext 5)
- WebSocket frame-level replay safety for `<channel>` (separate concern)
- TTL configurability (hard-coded 24h; future amendment if friction)
- Per-route `idempotency-store=` override (only at `<program>` granularity)
- Batch-grain monotonicity within multi-batch CPS (only relevant when Ext 1 ships)
- §39.2.x → §40.2.x renumbering cleanup (separate doc-only commit)

If implementation reveals one of these items is load-bearing for Ext 5 to be functional: **halt and surface to PA**, do not silently expand scope.

---

## §F. Reading list for the dispatched agent (in order)

**Mandatory:**
1. `pa.md` — esp. §"Worktree-isolation: startup verification + path discipline (S42 finding F4)" + §"Crash Recovery: Incremental Commits + Progress Reports"
2. `docs/PA-SCRML-PRIMER.md` — full file (~7k tokens; canonical scrml language model)
3. `docs/changes/phase-a9-ext5-idempotency-storage/SURVEY.md` — full Phase 0 SURVEY (599 lines, authoritative for §1-§9)
4. **THIS DOC** (`SCOPE-AND-DECOMPOSITION.md`) — S76 PA OQ resolutions + dispatch shape
5. `docs/changes/a9-ext4-s4-wiring-2026-05-08/progress.md` — Ext 4's dispatch progress log (mirror this shape)

**Targeted reads at each D-step:**
- D0: `compiler/SPEC.md` lines 11001-11167 (§19.9 + §19.10) + lines 16643-16850 (§40.2 attribute table) + lines 14000-14400 (§34 catalog) + lines 5286-5727 (§8.1.1 db= precedent + §8.9.5 .nobatch() precedent)
- D1: `compiler/src/ast-builder.js` (modifier-suffix parsing — search for `.nobatch` if it exists; otherwise locate function-decl modifier handling)
- D2: `compiler/src/attribute-registry.js` + `compiler/src/codegen/usage-analyzer.ts` (FeatureUsage @ line 51)
- D3: `compiler/src/route-inference.ts` (CPSSplit @ 17/108; analyzeCPSEligibility @ 842; cpsSplit attachment @ 2200-2260)
- D4: `compiler/src/codegen/emit-functions.ts` (Ext 4 envelope @ 225-339); `compiler/src/codegen/emit-server.ts` (Ext 4 envelopes @ 630, 800)
- D5: `compiler/src/codegen/runtime-chunks.ts` (chunk registry @ 1-200)
- D6: `compiler/src/type-system.ts` (Ext 4 W-CPS-NEEDS-FAILABLE fire-site)
- D7: existing test patterns at `compiler/tests/unit/` + `tests/integration/` + `tests/spec/`

---

## §G. Reporting back to PA

At completion (D8), report to PA via the agent's final message:

1. **WORKTREE_PATH** (absolute, from `pwd` at startup)
2. **AGENT_BRANCH** (from `git rev-parse --abbrev-ref HEAD`; harness-assigned name)
3. **FINAL_SHA** (`git rev-parse HEAD` after final WIP commit)
4. **FILES_TOUCHED** (full list — NEW + EDITED separately)
5. **TEST_RESULT** at FINAL_SHA: pass / skip / todo / fail counts vs S75 baseline (10,763 / 68 / 1 / 3); flag any regressions
6. **DEFERRED_ITEMS** encountered during dispatch (anything halt-worthy that wasn't surfaced in real-time)
7. **OQ_DEVIATIONS** (none expected; if any, flag explicitly)
8. **RUN_LOG** — append to `progress.md` per crash-recovery directive

**PA-side landing:**
- `git diff main..<AGENT_BRANCH> -- <FILES_TOUCHED>` review
- Filter agent-side-stale-views (files modified by sibling work since dispatch start)
- `git checkout <AGENT_BRANCH> -- <files>` into main
- Single PA-authored ship commit: `feat(a9-ext5): SHIP — S5 replay safety / idempotency-key storage (Stage 5.5 monotonicity classifier + .idempotent() modifier + idempotency-store= attr + runtime helpers)`
- Pre-commit hook runs full `bun test` (excluding browser); push pending user authorization
- Worktree branch retained for forensic per S67

---

## Tags

#a9-ext5 #s5-replay-safety #idempotency-key-storage #s76-dispatch-overlay #single-agent-sequential #d0-d8 #50h-budget #six-oqs-resolved #stage-5-5-classifier #section-19-9-6-anchor #channel-skip #verbose-only-d-cps-monotone #shadow-table-integer-timestamps #idempotent-modifier-shape-from-nobatch
