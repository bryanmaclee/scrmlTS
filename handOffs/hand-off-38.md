# scrmlTS — Session 37 Wrap

**Date opened:** 2026-04-21
**Date closed:** 2026-04-22 (crossed midnight during debate dispatch)
**Previous:** `handOffs/hand-off-37.md` (S36 in-progress snapshot)
**Baseline entering S37:** 7,384 pass / 40 skip / 2 fail / 338 files at `54bcab7`.
**Final at S37 close:** **7,393 pass / 40 skip / 2 fail / 339 files** at `f6fb0cc`. 19 scrmlTS commits total; 18 pushed to origin/main; 1 (`f6fb0cc`) pending push + wrap commit.

---

## 0. Commits landed this session

### scrmlTS (range `54bcab7..f6fb0cc`)

| Commit | Type | Summary |
|---|---|---|
| `83e6896` | fix(parser) | Bug G parser — fn shorthand accepts `-> ReturnType` |
| `d40afbe` | fix(codegen) | Bug G codegen — §48 fn shorthand implicit-return for tail expressions (match/switch/bare-expr) |
| `6d9b62a` | spec(s37) | Unify fn ≡ pure function, retire E-RI-001, absorb non-determinism + async into §33.3 |
| `ccae1f6` | chore(cleanup) | Retire E-RI-001 code references (PIPELINE.md, route-inference.ts, lsp/server.js, test stale header) |
| `c7198b6` | docs | Phase 0 item 2 — adopter-facing translation table (`docs/external-js.md` + SPEC §41 cross-ref) |
| `f6fb0cc` | fix(meta-checker) | **Bug 6** — don't collect function-local decls as module-scope; `^{}` over-capture fix |

### Push state

- Pushed to origin/main (user-authed direct push, 3x in session): `83e6896..c7198b6` (18 commits total — the S35/S36 backlog + the first 5 of S37).
- **NOT YET PUSHED:** `f6fb0cc` (Bug 6 fix from this session's final work) + wrap commit with hand-off + untracked handoff rotations + research docs.
- **Forward protocol:** unless user re-authorizes direct push, next session relays to master via inbox.

### scrml-support (master's scope — NOT pushed from this PA)

- `c91d466` — insight 22 (server-mount scaffolding, from S35). Pending master push.
- **Insight 23** staged: `/home/bryan/scrmlMaster/handOffs/incoming/design-insights-23.tmp.md` (B1+B3 DEFER verdict). Needs master append + push.
- **Insight 24** staged: `/home/bryan/scrmlMaster/handOffs/incoming/design-insights-24.tmp.md` (NPM compat-tier Phase-0-first verdict). Needs master append + push.

---

## 1. Inbox state at close

**Unread:** none. Inbox is empty (only `read/` subdirectory remains).

**Archived this session** (→ `read/`): 6 messages — giti S35-verified, 6nz Bug G original, 6nz Bug G verified, 6nz CM6 probe + bug batch, + 2 earlier giti pre-archived.

**Outbound messages dropped:**
- `6NZ/handOffs/incoming/2026-04-21-scrmlTS-to-6nz-bug-g-fixed.md` — Bug G fix notification.
- `/home/bryan/scrmlMaster/handOffs/incoming/2026-04-21-scrmlTS-to-master-push-s35-s36-s37.md` — push request (user direct-pushed; master no longer needs to execute the push itself, but the message is still in master's inbox for record).
- `/home/bryan/scrmlMaster/handOffs/incoming/2026-04-22-scrmlTS-to-master-insight-24-plus-phase-0-backlog.md` — needs:action for insight 24 append + Phase 0 BACKLOG items.

---

## 2. Major threads this session — STATE + NEXT

### 2.1 Bug G (6nz) — FULLY RESOLVED

Parser side (`83e6896`) + codegen side (`d40afbe`). 6nz re-verified green with 9/9 puppeteer smoke tests (`2026-04-21-0910-6nz-to-scrmlTS-bug-g-verified.md`). No follow-on action.

### 2.2 S37 spec consolidation — COMMITTED

The S32 `fn ≡ pure function` merge was left half-done — §33.3 had 6 constraints, §48.3 had 5 different prohibitions, 7+ cross-section contradictions. scrml-language-design-reviewer (3 passes) surfaced everything; patch committed at `6d9b62a` + cleanup at `ccae1f6`. E-RI-001 retired (never emitted; server+pure now valid per user-ratified body-purity framing). §48.9, §48.6.2, §48.13, §48.15, §7.3, §54.3, §48.14.1 heading, and 4 error-message leftovers all aligned to the unified contract.

### 2.3 B1+B3 refactor debate — DEFER (trigger registry ratified)

Both DEFER. Trigger registry in insight 23. Re-opens if any of: second S2-class threading bug, new field added to EmitLogicOpts, Phase 4 opens emit-control-flow.ts as ride-along, second GITI-005-class dispatch bug, Phase 4 rewriteExpr fallback deletion ride-along, second emit-time cross-cutting concern.

### 2.4 Module/import/macro/living-compiler context sweep — COMPLETE

Report at `handOffs/s37-module-import-macro-living-context.md` (410 lines). Established: `use`+`import` already exists (SPEC §21+§41), npm rejected at philosophy level (E-IMPORT-005), `^{}` meta + vendor/ is the designed escape hatch, living compiler intentionally "do NOT spec or implement," macros half-specced (pipeline stage exists, surface syntax TBD — SPEC-ISSUE-002/004 still Open).

### 2.5 NPM compat-tier debate — Phase-0-first verdict ACCEPTED

User explicitly accepted radical-doubt overturning their Option-3 bias ("Accept verdict, I'm thrilled to be wrong here"). Insight 24 staged for master append.

**Phase 0 deliverables:**
- [x] **Item 2: adopter-facing doc** — `docs/external-js.md` shipped (`c7198b6`). Translation table leads with zod→§53 (per the user's sharp zod observation).
- [ ] **Item 1: finish `^{}` polish** — MAJOR SCOPE-BLINDNESS RECALIBRATION: meta-eval.ts is already 646 lines, emit+reparse+splice fully wired. Real item 1 work is auditing + fixing concrete `^{}` bugs. Bug 6 shipped this session (`f6fb0cc`); further audit candidates in §3 below.
- [ ] **Item 3: `scrml vendor add <url>` CLI** — not yet started. Fetch + sha384 + write to vendor/ + manifest.

**Phase 1** (fourth init-tier + `dep:` prefix + URL+sha384 pinning) PARKED — insight 24 recommends NOT pre-designing or pre-speccing to avoid sunk-cost magnet. Re-open only if Phase 0 attempt-and-fails on adopter evidence.

**Anti-slippage** (from insight 24): typed-confirm init, per-compile visibility line, `scrml audit` in CI, `scrml upgrade` pull-force. Do NOT rely on warning-spam.

---

## 3. 6nz bug batch — verification outcome + triage queue

Full report at `handOffs/s37-6nz-bug-batch-verification.md`.

| Bug | Status | Priority |
|---|---|---|
| 1 — string `"a\nb"` emits as `"a\\nb"` | CONFIRMED — pervasive, leaks into bugs 2 + 6 outputs | **HIGH** — foundational |
| 2 — ternary in `const @derived` drops arms | NOT REPRODUCED — fold into bug 4 (display wiring) | dismiss |
| 3 — `return X+y` after `const y=A?B:C` dropped | NOT REPRODUCED — 6nz's repro referenced `prevStart` (outer scope); may be a scope-capture issue not a statement-drop. Ask 6nz for exact source. | investigate |
| 4 — `${@derivedReactive}` in markup — no DOM wiring | CONFIRMED — named derived references skip subscription | **HIGH** — breaks core reactive idiom |
| 5 — `for-lift` in markup doesn't re-render | STATIC EMIT OK — needs runtime behavioral test to confirm whether issue is subscription dep-tracking | medium |
| 6 — `^{}` over-captures function locals | **FIXED** this session (`f6fb0cc`) | ✅ |

Next session priorities on the bug queue, in order:
1. **Bug 1** (string escape) — foundational, root-cause in tokenizer/string-literal emit path, likely 10-30 LOC fix.
2. **Bug 4** (derived-reactive in markup wiring) — root-cause in markup display-wiring emitter; likely 20-60 LOC.
3. Clarification request to 6nz on **bug 3** (need exact source with `prevStart`).
4. Behavioral smoke test for **bug 5** (runtime reactive dep tracking).
5. Send combined follow-up to 6nz summarizing state of all 6 bugs.

---

## 4. Standing rules in force (all of these MUST apply to S38)

- **Verify-before-fix** — spec-read + repro compile + evidence before any fix. Adopter PAs cannot be fully trusted to understand scrml.
- **LOC/bug density target** — <30–50 LOC per adopter bug fix (exclusive of tests). Above = refactor flag.
- **Write test, always** — no behavior change without a test that exercises the new path. Stash-pop delta 0 means the test hasn't been written yet.
- **Scope-blindness is structural** — context-sweep BEFORE implementing; spec-analyzer on every spec amendment (2 passes); DD citations >14 days potentially stale; grep the truth-sources first.
- **Distillation beats option-expansion** — when user overloaded, compress to ranked obvious-wins + explicit skip list.
- **All agents on Opus 4.6** — `model: "opus"` on every dispatch.
- **Commit to main, never push** (DEFAULT) — send needs:push to master. User may override per-session with explicit "push auth" — 3x this session. Protocol change pending in master's scope (per 6nz note).
- **PA must not edit code without express permission** — but spec edits allowed with scrml-language-design-reviewer gate.
- **Language cohesion check** — every syntax proposal checked against how the same concept already reads elsewhere; no reflexive HTML/JSX strings.
- **Radical-doubt is genuine, not ceremonial** — debates can overturn user bias; user said "thrilled to be wrong." If a debate never overturns bias, pressure was insufficient.

---

## 5. Phase 0 / adopter-friction queue — for next session pickup

**In priority order:**

1. **Phase 0 item 1 continuation** — `^{}` audit:
   - Investigate if `if`/`for`/`while`/`match`/`try` bodies also over-capture like function-decl did (bug 6's siblings).
   - Check `lin-decl` handling in `^{}` capture.
   - Check `^{}` inside a loop body — does it re-capture per iteration?
   - Add `^{}` cookbook section to `docs/external-js.md` once 3+ patterns validated.

2. **Phase 0 item 3** — `scrml vendor add <url>` CLI. Fetch + sha384 verify + write to `vendor/<name>/` + update manifest. Moderate — session-sized.

3. **Bug 1** — string literal escape handling. Foundational. Affects every string with `\n`/`\t`/`\r`/etc.

4. **Bug 4** — derived-reactive markup display wiring.

5. **Bug 3 clarification** + **bug 5 behavioral test** — async on 6nz.

6. **Finish master-relayed items** if master hasn't picked up:
   - Insight 23 append
   - Insight 24 append
   - Phase 0 BACKLOG entries
   - scrml-support c91d466 push

---

## 6. Non-compliance carryover (unchanged)

- `master-list.md` header 13 sessions stale
- `docs/SEO-LAUNCH.md` uncommitted 14 sessions
- `benchmarks/fullstack-react/CLAUDE.md` out-of-place agent tooling
- NC-3: §54.6 Phase 4h return-type-narrow-fit code assignment gap
- NC-4: `_ensureBoundary` warning shim (removes when B1+B3 ships — triggers apply)

---

## 7. Artifacts produced this session (reference index)

| Artifact | Path | Purpose |
|---|---|---|
| Module/import context report | `handOffs/s37-module-import-macro-living-context.md` | 410-line consolidation of everything pre-established |
| 6nz bug batch verification | `handOffs/s37-6nz-bug-batch-verification.md` | Independent repro + triage of 6 claimed bugs |
| Adopter-facing external-JS doc | `docs/external-js.md` | Translation table + escape hatches + FAQ |
| scrml-language-design-reviewer 3-pass discipline | (in-conversation, in user-voice) | Validated workflow for spec amendments |
| Insight 23 (staged) | `handOffs/incoming/design-insights-23.tmp.md` (in master's scope) | B1+B3 DEFER verdict + trigger registry |
| Insight 24 (staged) | `handOffs/incoming/design-insights-24.tmp.md` (in master's scope) | NPM compat-tier Phase-0-first verdict |
| New memory | `~/.claude/projects/.../memory/feedback_write_test_always.md` | Standing rule |
| New memory | `~/.claude/projects/.../memory/feedback_scope_blindness.md` | Structural mitigation |
| Conformance tests added | `compiler/tests/integration/fn-implicit-return-e2e.test.js` (5 tests) | Bug G codegen coverage |
| Conformance tests added | `compiler/tests/unit/meta-checker.test.js` (2 new tests, §41b/§41c) | Bug 6 coverage |

---

## 8. Next-session open actions (S38 checklist)

At S38 open, the incoming PA should:
1. Read pa.md
2. Read this hand-off
3. Read last ~10 contentful user-voice entries — S37 has ~10 substantive new entries
4. Rotate hand-off.md → handOffs/hand-off-38.md, create fresh hand-off.md
5. Check master outbox: did master execute the needs:push + needs:action from this session?
   - scrml-support push (c91d466 + insight 23 append + insight 24 append)
   - Phase 0 BACKLOG items added
6. Check inbox: likely 6nz follow-ups on bug-6 fix + possibly new bugs from continued playground work
7. Push `f6fb0cc` + wrap commit if not yet authed
8. Pick next thread from §5 Phase 0 queue

---

## 9. S37 close — user-voice signals (summary of highest-value quotes)

From the 10 verbatim quotes appended to user-voice this session, three have the highest load-bearing value:

1. **"IMO, pure function and fn should be exactly equivelent, and pure fn is redundant with no caveats. However, I am now designing this language from a very high level that involves heavy loss of detail."** — design-intent clarity + explicit delegation of detail-execution. Enabled the §33.3 consolidation to proceed with confidence.

2. **"Accept verdict, I'm thrilled to be wrong here"** — ratifies radical-doubt as GENUINE decision mechanism. Future debates can produce definitive verdicts, not advisory ones. KPI for future sessions: debates should sometimes overturn bias; if they never do, pressure is insufficient.

3. **"for the love of God, dont lose anything. We are seeing this more and more."** — named the structural scope-blindness problem. Mitigation saved as `feedback_scope_blindness.md`. Pattern institutionalized: context-sweep before implementing.

All three represent VALIDATED patterns worth propagating — not session-bound decisions but workflow invariants.
