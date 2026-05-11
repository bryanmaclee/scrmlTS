# scrmlTS — Session 82 (OPEN)

**Date opened:** 2026-05-11
**Previous:** `handOffs/hand-off-81.md` (S81 close — 7 commits / F.1 + F.2 adopter overrides + strict self-host gate + A10 deferred closure + SPEC-INDEX regen + D3/D1 A9-Ext-5 follow-ons + OQ-2 debounce/throttle keyword-form retired / +42 tests / 0 regressions / pushed)
**This file:** rotates to `handOffs/hand-off-82.md` at S83 open

**Tests at open (S81 close baseline):**
- pre-commit subset: **10,433 pass / 66 skip / 1 todo / 0 fail** (507 files; commit `dd29e3b`)
- full suite: **11,181 pass / 77 skip / 1 todo / 0 fail** (535 files; `bun run test` at S81 close)

---

## S82 session-start state

### Cross-machine sync — VERIFIED

- **scrmlTS:** clean. `origin/main` 0/0 (S81's 7 commits already pushed per-commit through session; no drift since).
- **scrml-support:** clean against origin (0/0). Untracked files present in working tree, pre-existing from earlier sessions and unrelated to current S82 work:
  - `tools/` directory
  - `voice/articles/2026-05-09-devto-openers-tier1.md`
  - `voice/articles/2026-05-09-devto-reply-modularity-v2-POST.md`
  - `voice/articles/2026-05-09-devto-reply-modularity-v2-slow-burn.md`
  - `voice/articles/2026-05-09-devto-reply-modularity.md`
  - `voice/articles/2026-05-09-server-keyword-deprecation.md`

  These are private article drafts + tooling local-only state; left in place per pa.md Rule 1 (no PA-volunteered marketing-shaped work).

### Hook installation — VERIFIED on this machine

`git config --get core.hooksPath` → `scripts/git-hooks` (persistent in `.git/config` from S78+ install).

### Incoming inbox — EMPTY

`handOffs/incoming/` contains only the `read/` subdir. No unread messages.

### Primer + pa.md + hand-off — READ

Per pa.md §"Session-start checklist":
- pa.md (this repo's PA directives) — read in full.
- `docs/PA-SCRML-PRIMER.md` — read across §1 (tier ladder framing) through §13.8 (promotion ergonomics — `I-MATCH-PROMOTABLE` + `bun scrml promote --match`) plus §14 / §15. Canon snapshot is current at S68 (A5-1 SPEC landings, S77 `<onTimeout>` codegen, S79 `<onTimeout>` `name=`, S79 debounced/throttled cell attribute landing).
- `hand-off-81.md` (S81 close) — read in full.
- User-voice (`../scrml-support/user-voice-scrmlTS.md`) — read S72 + S81 contentful entries (S73-S80 sessions did not append durable user-voice — those threads recorded in hand-offs only). S81 entries: (1) "not" directive remains in play, library-mode inclusive; (2) self-host parity is orthogonal to v0.2.0; (3) `bun scrml fix` CLI auto-fix registered as v0.3 roadmap idea.

### 3 legacy master inbox carry-overs (carry-forward from S78+)

Still safe-to-ignore unless sweep requested:
- `2026-04-22-scrmlTS-to-master-insight-25-multi-meta.md` (UNREAD legacy)
- `2026-05-08-S72-scrmlTS-to-master-needs-push-SUPERSEDED.md`
- `2026-05-08-S71-scrmlTS-to-master-stage-scrml-dev-pipeline.md`

---

## S82 carry-forward — priority menu

Awaiting user direction on next work. S81 closed three carry-forward items (A10 deferred, F.1/F.2 multi-token threshold deep-read, SPEC-INDEX regeneration); D3 + D1 A9-Ext-5 follow-ons; OQ-2 imperative `debounce`/`throttle` keyword-form. Remaining priorities:

### Active remaining priorities (v0.2.0 substantive bar)

1. **A6-6 optional API alignment** — LSP/CG API design dive. Scope TBD (would need investigation + proposal before implementing).

2. **A9 Ext 5 D5 — Redis backend inlining** — stubbed in `compiler/runtime/idempotency.js`; not inlined into emit-server.ts; SQL backend covers default-resolution target. **Adopter-signal-gated** — only ship when an adopter explicitly uses `idempotency-store="redis"`.

3. **W-LEAK-010 follow-up** (per memory-leak deep-dive refresh §7.2):
   - Step 2: `<program idempotency-store=>` background sweeper (CG/runtime dispatch)
   - Step 3: LC pass implementation (Stage 7.6, SCOPE-AND-DECOMPOSITION dispatch)
   - Hold for v0.3.0+ unless W-LEAK-010 spec-amendment is fast-tracked.

4. **Insight 28 OQ-bridge-5** — compile-time WARNING when bridged validator on schema-column field — defer to compiler-diagnostics audit pass.

5. **Insight 28 OQ-bridge-2** — passive (re-debate trigger on ≥3 adopter friction reports). **VERIFIED FILED at S81** in `scrml-support/design-insights.md` Insight 28.

6. **Versioning-discipline discussion** (deferred from S78) — patch-version-as-lifecycle-stage thread. Adjacent question: should `0.2.0` be re-scoped tighter? Hold for a session of its own.

### Future direction (v0.3.0+ orthogonal track)

7. **Self-host parity work** — `cg.scrml` structural restructure (exports inside `^{}` meta-block produces empty dist) + the deeper 21-of-23 parity assertions + the 362-occurrence null/undefined sweep + adjacent E-EQ-004 / E-ERROR-007 / E-FN-003 / E-MU-001 / E-SCOPE-001 cleanups. ~8-12h total estimate per `docs/audits/self-host-spec-conformance-2026-05-11.md` §5. **DEFERRED to v0.3.0+** per S81 user direction.

8. **GCP3 walker gap** — `gauntlet-phase3-eq-checks.js:walkAst` doesn't descend into let-decl inits in pure-logic-rooted modules. Real bug in detector. ~1-2h diagnose + extend + tests. Filed alongside #7.

9. **`bun scrml fix` CLI auto-fix sub-command** — v0.3 roadmap per S81 user-voice. Mechanical rewrites for null→not / ===→== / and similar deterministic spec-evolution conversions. Same surface precedent as `bun scrml migrate <file>` for `<machine>` → `<engine>`.

10. **Articles thread (5 in-flight drafts at `scrml-support/voice/articles/`)** — per pa.md Rule 1, no PA-volunteered marketing work; await user-raised threads.

---

## Open questions to surface at S82 open

1. **Next priority** — see menu above. Awaiting user pick.

2. **Push state — CLEAN** — both repos 0/0 origin/main.

3. **Project-mapper refresh state** — refreshed at S81 (bundled with `7173bfe` D3 ship). Pickup is current. Non-compliance findings (4 archival candidates + 1 known-drift + 1 uncertain) not yet acted on; can be addressed at any future session via single-pass deref.

4. **scrml-dev-pipeline agent not staged on this machine** (carry-forward) — all S81 ships were PA-direct; no compiler-source dispatches needed. Future compiler-source dispatches still need either (a) master-PA to stage the agent (and switch machines after) OR (b) continue using `general-purpose` for SPEC-text-only / `scrml-deep-dive` for diagnostics. Worktree-isolation friction continues to favor PA-direct for small-scope ships.

5. **Self-host strict rebuild gate is ACTIVE** — any new self-host dispatch must address the 5/11 failing files (ast/ts/ri/pa/dg) before re-running. Pre-commit hook excludes self-host tests so this doesn't block compiler-side work. Source-side null/undefined sweep is v0.3.0+ orthogonal — NOT a v0.2.0 blocker.

6. **GCP3 walker gap is filed** but not in the immediate priority menu. Sub-project ~1-2h. Should be paired with the self-host source sweep when that lands (cleaner together than separately).

7. **Worktree branches retained** (forensic per S67):
   - `worktree-agent-ab656f3dcdd0f1638` (S79 debounce/throttle dispatch, 6 WIP commits)
   - S81 had no `isolation: "worktree"` dispatches; nothing new retained.
   Cleanup not priority.

---

## Things S82 PA must NOT screw up (S77/S78/S79/S80/S81 standing list)

S77/S78/S79/S80 lists carry forward verbatim. **S81 additions (still in force at S82):**

- **DON'T disable the strict self-host rebuild gate** (`scripts/rebuild-self-host-dist.ts` exit-1 on host-compiler errors). The bypass that the gate closed was itself a "null/undefined never compile" violation per S81 user-voice. Self-host source-side cleanup is the right next step IF that work is taken up; DO NOT revert the gate to silently emit dist again.
- **DON'T attempt the self-host source-side sweep without explicit user authorization.** S81 deferral was explicit and direction-bound. The audit doc + sweep plan are ready; the work is ready when prioritized.
- **DON'T touch the channel-protect-stale line in `docs/articles/realtime-and-workers-as-syntax-devto-2026-04-29.md:200`.** Per pa.md Rule 1 (no marketing-shaped work) AND because published dev.to articles are immutable historical records. Project-mapper non-compliance report flagged as known-drift.
- **DON'T regenerate SPEC-INDEX via `scripts/update-spec-index.sh`** (legacy; print-only). Use `bun run scripts/regen-spec-index.ts` instead. Comment in the legacy script documents the new path.
- **DON'T introduce new `debounce(fn, ms)` / `throttle(fn, ms)` imperative calls** without first `import { debounce, throttle } from "scrml:time"`. The KEYWORD reservation is gone; bare names now resolve as IDENT and need stdlib import. AST kinds `debounce-call` / `throttle-call` no longer exist.
- **DO use the `<x debounced=Nms>` / `<x throttled=Nms>` attribute form** for state-cell timing (canonical per §6.13). The retired imperative form was for ad-hoc function debouncing; that's now a stdlib concern.
- **DON'T forget the §38.3 attribute-table update from S81** — `<channel auth=>` is now properly documented; `<channel protect=>` is no longer in the table (S80 retirement caught at S81). Any new channel-attribute docs should reference §38.3 + §38.3.1 (NEW S81).
- **DON'T duplicate the engine-state-child grammar helpers** in `type-system.ts` when SYM PASS 11 populates `EngineStateChildEntry.payloadBindings` (filed as future cleanup). Today the local helpers in `type-system.ts:~85-115` are an intentional duplicate of `emit-variant-guard.ts` constants because TS is upstream of codegen and can't import from `./codegen/*`. When PASS 11 populates `entry.payloadBindings`, BOTH consumers can be retired in favor of reading `entry.payloadBindings`.

---

## Tags

#session-82 #open #s81-clean-baseline #v0.2.0-substantive-bar
