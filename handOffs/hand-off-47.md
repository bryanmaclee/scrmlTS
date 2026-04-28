# scrmlTS — Session 45 (CLOSED — MACHINE SWITCH)

**Date opened:** 2026-04-26
**Date closed:** 2026-04-27 (rolled past midnight during C debate; user wrapping for machine switch)
**Previous:** `handOffs/hand-off-45.md` (S44 closed — rotated at S45 open)
**Baseline entering S45:** 7,952 pass / 40 skip / 0 fail / 381 files at `150c553`. scrmlTS clean + in sync (0/0). scrml-support: 18 untracked files (S43 + S44 carry) — push HELD for 2 sessions.
**State at S45 close:** **7,952 pass / 40 skip / 0 fail / 381 files** at `150c553` (compiler unchanged + about-to-commit hand-off/master-list/changelog wrap commit). **scrml-support pushed at `d177afe`** — 2-session hold cleared. **Machine switch authorized.**

---

## 0. Pickup mode for next session (probably on the OTHER machine)

S45 was the cleanest design-only session run to date — pure debate-orchestration throughput. **4 debates fired sequentially** (Bug B → G → A → C), 19 expert dispatches, 4 design insights recorded to `scrml-support/design-insights.md`, **2-session push hold cleared**. **Tracking doc landed** at `scrml-support/docs/debate-wave-2026-04-26-actionables.md` distilling the 5 v1 commitments + 1 open user-decision + explicit non-goals from the wave.

**One-paragraph state-of-the-world:** No compiler changes. No test changes. The wave's design output is in scrml-support (already pushed); the actionable v1 roadmap is in the tracking doc. scrmlTS itself is unchanged from S44 close (`150c553`) until this wrap commit lands the hand-off + changelog + master-list. The machine-switch protocol applies: both repos clean + pushed before the user moves machines, so the other machine pulls the same baseline.

---

## 1. Open questions to surface IMMEDIATELY at session start (next machine)

Surface to user before any further work:

1. **Cross-machine sync first** — per pa.md S43-codified rule. On the other machine, fetch + pull both `scrmlTS` and `scrml-support` before reading hand-off or doing any work. Both repos pushed at S45 close so the other machine should pull cleanly.

2. **R4 user-side decision** — judge of A debate flagged this as an open question. **"Is R4 a real workflow or aspirational property?"** Mathlib (1.5M LOC of Lean) ships entirely on R1+R3, never R4. Bazel says R4 operational at Google/Meta scale. User said R1+R4 in S43 user-voice. Judge recommended: design for R4 (preserves user disambiguation), instrument first real R4 use as evidence, reopen if never exercised in 12 months. **Surface this for an explicit user yes/no before any capture-artifact implementation begins.**

3. **Comp-time capability boundary** — the highest-leverage SPEC commitment surfaced across all 4 debates. This is doc-only work but it MUST land before any `^{}` / bridge / build-time feature evolves further. **Strong recommend tackling first.** See tracking doc §1.

4. **Voice-author bio bake** — STILL queued from S44. Agent loadable. Deferred this session per user "go to debate waves." First substantive action recommendation when not doing the capability-boundary SPEC work.

5. **A9 candidate** — STILL pending intake.md. T2 fix (extend `walkAndExpand` to recurse into if-chain `branches`).

6. **`dist/` pollution** under `handOffs/incoming/dist/` — STILL pending disposition (now 7+ sessions). Inertia. Probably just delete on a slow day.

7. **rawSource-threading sweep** — gap in 5 expression-parser branches noted from S44 Bug M dispatch. Not yet intake-filed. Probably masked by scrml's arrow-callback convention.

8. **BS-html-comment-opacity intake** at `docs/changes/fix-bs-html-comment-opacity/intake.md` — not yet dispatched. Severity low post-Bug-O fix.

9. **Stray file in scrml-support working tree** — `design-insights-tmp-G.md` (39 lines, draft from G-judge timeout retry; superseded by what actually landed in `design-insights.md`). Untouched, untracked. Decide: delete or archive.

10. **agent-forge template fix** — make the forge produce blank-line-before-`model:` so future forges aren't broken (S44 carry). Mechanical.

---

## 2. The 4-debate wave — full state

### 2.1 Outcomes

| Debate | Topic | Final ranking (top 3) | v1 decision |
|---|---|---|---|
| **Bug B** | Language-config tier ladder | simplicity-defender 50.5 / rust-edition 49 / racket-hash-lang 45 | No-knob v1, ship `scrml fmt --upgrade-syntax` first, `#lang` only when Superposition lands as non-default dialect |
| **G** | File storage model | A 52 / C 48.5 / B 32.5 | Stay on A (source-canonical); B falsified by Unison's `oss-transcripts`; C-Salsa deferred until measurement |
| **A** | Recoverability + comp-time-shape | lean-lake R3 49 / unison-B 46.5 / security-hybrid 44.5 | v1 capture = `.scrml-shape/objects/<hash>` + manifest schema designed for SLSA L3 layering later; AST-identity orthogonal to hermetic-build-provenance |
| **C** | Bridges architecture | roc 47 / gingerbill 46.5 / security 44 | 4 orthogonal layers; v1 = BLAKE3 hash-of-tarball + URL+hash + no registry + §41.6 vendored floor + no compile-time-execution at vendor-add + kernel-enforced capability sandbox |

### 2.2 Cross-debate convergence (load-bearing)

Every debate resolved as a **composite/hybrid**, not a single-position winner:
- B: simplicity-defender's reframe ("does the knob need to exist?") + rust-edition's migration tooling commitment
- G: A wins outright + C as deferred future option (B explicitly out)
- A: B's AST-identity primitive + C's hermetic-build-provenance — orthogonal, not competing
- C: 4 orthogonal layers (distribution / identity / execution / trust) decided independently

**Single highest-leverage commitment surfaced:** specify the comp-time capability boundary in SPEC BEFORE any `^{}` / bridge / build-time feature ships. Cargo `build.rs` RFC#475 stuck 7 years is the existence proof.

### 2.3 Tracking doc

`scrml-support/docs/debate-wave-2026-04-26-actionables.md` — terse, decision-oriented, status-fielded. 5 things to do + 1 thing to decide + explicit non-goals + follow-up question queue. Linked from design-insights.md and the 4 deep-dives.

### 2.4 Process learnings

**G-judge stream timed out** on first dispatch (~41 minutes runtime → API stream idle timeout). Recovered cleanly via condensed-prompt retry (positions summarized rather than verbatim). For the remaining 2 debates (A, C), used the condensed-prompt format directly — both succeeded. **Pattern for future debate-judge dispatches:** if 5+ expert positions are being judged, condense the positions into ~2k-token summaries before passing to debate-judge rather than including full ~10k-token verbatim positions.

---

## 3. Cross-repo state at close

### 3.1 scrmlTS

- **HEAD:** `150c553` (A7+A8 fix from S44; about to land wrap commit)
- **Origin:** in sync (0/0)
- **Working tree:** modified — `hand-off.md` (this), `master-list.md` (S45 update), `docs/changelog.md` (S45 entry); untracked — `handOffs/hand-off-45.md` (S44-closed rotation done at S45 open). Will commit + push at wrap close.

### 3.2 scrml-support

- **HEAD:** `d177afe` (S45 wave outputs)
- **Origin:** in sync (0/0)
- **Working tree:** 1 untracked — `design-insights-tmp-G.md` (stray draft from G-judge timeout retry; flagged in §1.9). NOT pushed. NOT staged. Untouched.

### 3.3 6nz inbox (outbound from scrmlTS — carried, no new this session)

- `2026-04-25-1100-scrmlTS-to-6nz-s41-fixes-and-kickstarter.md`
- `2026-04-26-0919-scrmlTS-to-6nz-s42-close-fixes-and-kickstarter-v1.md`
- `2026-04-26-1430-scrmlTS-to-6nz-bugs-mno-triage.md`
- `2026-04-26-1530-scrmlTS-to-6nz-bugs-mo-shipped.md`

### 3.4 Master inbox (carried, no new this session)

- `2026-04-25-0750-giti-to-master-push-request-s8-close.md`
- `2026-04-26-1230-scrmlTS-to-master-staleness-reconciliation-and-cross-machine-rule.md`

### 3.5 scrmlTS inbox

Empty (still only `dist/` pollution, §1.6).

---

## 4. Top of queue (S46 candidates)

### Immediate (clear, scoped)

1. **Cross-machine sync hygiene check on the other machine** (pa.md mandates this).
2. **Comp-time capability boundary SPEC commitment** — the highest-leverage commitment from the wave. Doc-only.
3. **Voice-author bio bake** — first action: `@scrml-voice-author baseline bio crawl`.
4. **R4 user-side decision** — surface explicitly.

### Investigation queue

5. **A9 intake** — write proper `intake.md` from §A9 tracker entry.
6. **BS-html-comment opacity** intake → dispatch.
7. **rawSource-threading sweep** — when next codegen incident traces back to one of the 5 affected branches.
8. **Bug L widened-scope re-attempt**.
9. **agent-forge template fix** — blank-line-before-`model:`.

### Strategic (downstream of the wave)

10. Manifest schema design for `.scrml-shape/objects/<hash>` + `manifest.toml` carrying `(root, compiler, target)` — designed NOW for SLSA L3 attestation later.
11. **`scrml fmt --upgrade-syntax`** tool sketch (Bug B's only operational requirement — pattern decoupled from any tier mechanism).
12. Bridge header schema + `scrml vendor add` CLI sketch (downstream of C).
13. `compat-debate` framing (how long does scrml promise source-compat?).
14. CVE-stream design (Sigstore-Rekor-shaped Merkle log; non-trivial).

### Earlier carries

- Self-host parity (couples to Bug L).
- Bun.SQL Phase 2.5.
- LSP `endLine`/`endCol` Span detached.
- Strategic: Problem B (discoverability/SEO/naming).
- Cross-repo: 6nz playground-four cosmetic reverts.

---

## 5. Standing rules in force

### NEW in S45 (durable directives)

- **Debate-judge condensed-prompt pattern:** for 5+ expert debates, condense positions to ~2k-token summaries before dispatch. Verbatim positions exceed stream idle timeout (~41 min observed on G-judge first attempt). Recovery: re-dispatch with condensed positions. (Validated on A + C debates which used this pattern from the start.)
- **All-debate-resolutions-are-hybrids pattern:** every one of the 4 wave debates resolved as a composite/hybrid, not a single-position winner. Future debate framings should expect this; the judge should explicitly look for the orthogonal-layer factoring rather than presuming pure-position dominance.

### Carried from S44 + earlier

- Comp-time capability boundary must be SPEC'd before any `^{}` / bridge feature evolves further (NEW priority: highest-leverage commitment from S45 wave).
- Major moves require deep-dives + debates from radical-doubt + know-everything mindsets.
- Radical doubt is a SAFETY mechanism, NOT skepticism.
- Real-time user-voice append (note: S44 + S45 entries are missing from `scrml-support/user-voice-scrmlTS.md`; ends at S43 line 765. Backfill candidate.).
- "Make no mistakes" for irreversible operations.
- Cross-machine sync hygiene (codified pa.md S43).
- AI-agent friction is NOT a language-design constraint.
- Superposition is an explicit language pillar (formalization debate held).
- `docs/changelog.md` is THE changelog (in-repo).
- Hand-off context-density permanent rule (bloat OK).
- "wrap" is an 8-step operation.
- Worktree-isolation startup verification + path discipline.
- `examples/VERIFIED.md` is user's verification log; PA never marks rows checked.
- Every dev dispatch that writes scrml MUST include `docs/articles/llm-kickstarter-v1-2026-04-25.md` + `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`.
- Compiler-bug fixes via `scrml-dev-pipeline` with `isolation: "worktree"`, `model: "opus"`. PA does not edit compiler source without express user authorization.
- Commits to `main` only after explicit user authorization. Push only after explicit authorization.
- All agents on Opus.
- Forged agents need blank line between `</example>` and `model:` (S44 finding; agent-forge backlog).
- Mid-session forges aren't loadable until session restart (S44 finding).
- Superposition formalization HELD.

---

## 6. Tests at S45 close

```
7952 pass
40 skip
0 fail
28256 expect() calls
Ran 7992 tests across 381 files. [7.05s]
```

Net delta over S44 close: **0** (design-only session, no compiler changes).

---

## 7. S45 commits (chronological)

**scrml-support:**
- `d177afe` docs(s45): debate-wave actionables + 4 design insights + carry deep-dives — 20 files / 8299 insertions

**scrmlTS:**
- (this wrap commit at session close — hand-off + master-list + changelog + S44-closed rotation file)

---

## 8. Recommended next-session opening sequence (probably other machine)

1. Read `pa.md` (standard).
2. **Cross-machine sync hygiene FIRST** — fetch + ahead/behind for scrmlTS AND scrml-support. Both pushed at S45 close so should pull cleanly.
3. Read this hand-off in full.
4. Read `scrml-support/user-voice-scrmlTS.md` last 10+ contentful entries (NOTE: file ends at S43 line 765; S44 + S45 entries are missing — backfill candidate).
5. **Read `scrml-support/docs/debate-wave-2026-04-26-actionables.md` IN FULL.** This is the actionable distillate of S45's 4-debate wave; future work should derive from it.
6. Surface §1 questions to user.
7. **Resolve §1.2 (R4 user-side decision) and §1.3 (comp-time capability boundary) before any other substantive work.** Both are doc-/decision-only; both unlock or close-off downstream investigation.
8. After those resolve: voice-author bio bake (§1.4) is first substantive action.

---

## 9. Session log (chronological)

- 2026-04-26 — S45 opened (immediately after S44 close). pa.md + S44-closed hand-off read. Cross-machine sync clean (scrmlTS 0/0; scrml-support 0/0 with 18 untracked carried). Rotated S44-closed → `handOffs/hand-off-45.md`. Forged agents now loading cleanly post-YAML fix. Surfaced §1 questions including newly-noted S44 user-voice gap.
- 2026-04-26 — User: "defer push go to debate waves." Fired Bug B debate first. Roster: haskell-language-pragma + rust-edition + lean-tactic-mode + racket-hash-lang + simplicity-defender. Sequential expert dispatch + judge synthesis. Final: simplicity-defender 50.5 won; design insight recorded.
- 2026-04-26 — Fired G debate. Roster: salsa + unison + simplicity-defender + nix + bazel. Sequential. **First judge dispatch timed out (~41 min stream idle).** Recovered with condensed-prompt retry. Final: A 52 won; B falsified.
- 2026-04-26 → 2026-04-27 — Fired A debate. Roster: unison + nix + lean-lake + bazel + security. Used condensed-judge pattern from start; succeeded. Final: lean-lake R3 49 won; B-vs-C resolved as hybrid; R4-vs-R3 user-decision flagged.
- 2026-04-27 — Fired C debate. Roster: roc + gingerbill + security + unison. Final: roc 47 won as composite; 4 orthogonal layers.
- 2026-04-27 — User: "this is alot to wade through and I think Im losing the thread. what did we find we can actuallu do?" Distilled to terse 5-things-to-do + 1-thing-to-decide summary.
- 2026-04-27 — User: "yes, turn it into a tracking doc, push." Wrote `scrml-support/docs/debate-wave-2026-04-26-actionables.md`. Committed scrml-support at `d177afe` (20 files / 8299 insertions). Pushed. 2-session hold cleared.
- 2026-04-27 — User: "wrap, session, moving machines so fire sale, everything must go." Wrap initiated. Tests run (7952/40/0). Master-list + changelog + hand-off updated. scrml-support clean + pushed. scrmlTS wrap commit pending.

---

## Tags
#session-45 #closed #machine-switch #4-debate-wave-completed #bug-B-G-A-C-insights-landed #scrml-support-push-cleared-after-2-sessions #tracking-doc-landed #comp-time-capability-boundary-highest-leverage #r4-vs-r3-user-decision-flagged #g-judge-timeout-condensed-prompt-pattern

## Links
- [pa.md](./pa.md)
- [master-list.md](./master-list.md) — S45 close numbers
- [docs/changelog.md](./docs/changelog.md) — S45 entry added at close
- [handOffs/hand-off-45.md](./handOffs/hand-off-45.md) — S44 closed (rotated S45 open)
- `scrml-support/design-insights.md` lines 498/533/560/669 — 4 debate insights
- `scrml-support/docs/debate-wave-2026-04-26-actionables.md` — terse tracking doc (THIS IS THE LOAD-BEARING OUTPUT)
- `scrml-support/docs/deep-dives/{recoverability,file-storage,bridge-architecture,mid-compile-config}-2026-04-26.md` — debate-feeding deep-dives
