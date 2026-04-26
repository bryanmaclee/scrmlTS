# scrmlTS — Session 44 (OPEN)

**Date opened:** 2026-04-26
**Previous:** `handOffs/hand-off-44.md` (S43 closed — rotated at S44 open)
**Baseline entering S44:** 7,906 pass / 40 skip / 0 fail / 378 files at `82e5b0d`. scrmlTS clean + in sync with origin. **scrml-support: 18 untracked files (S43 design work) — push HELD, decision needed.**

---

## 0. Pickup mode (open)

S43 closed design-heavy with 8 deep-dives + joint synthesis + 5 forged tech-experts + a custom voice-author agent. Compiler test counts unchanged. The whole design arc is sitting untracked in scrml-support — none of it has propagated cross-machine yet. Triage queue + decisions surfaced below.

---

## 1. Open questions surfaced at S44 start (carried from S43 §1)

1. **scrml-support push HELD** — 18 untracked files (8 deep-dives + 6 progress files in correct location + 2 stray progress files at root + joint synthesis + user-voice-scrmlTS.md). Without push, S43 design work stays on this machine only. Decision: push from this clone, OR sync via the other machine.
2. **2 stray progress files at scrml-support root** — `.progress-editor-keyword-alias-2026-04-26.md`, `.progress-smart-app-splitting-2026-04-26.md` need moving to `docs/deep-dives/` before scrml-support push.
3. **6nz inbox arrivals (parked)** — 4 untracked at `handOffs/incoming/2026-04-26-1041-*` (1 message + 3 .scrml sidecar reproducers). Bugs M/N/O from playground-six. Need triage/intake/dispatch decision before substantive S44 work.
4. **Master-PA inbox messages outstanding** — 2 messages at `~/scrmlMaster/handOffs/incoming/`:
   - `2026-04-26-1230-scrmlTS-to-master-staleness-reconciliation-and-cross-machine-rule.md`
   - `2026-04-25-0750-giti-to-master-push-request-s8-close.md` (carried from earlier)
5. **bazel-toolchain-expert ambiguity** — when forging round-2 (B's debate experts), decide whether `bazel-toolchain-expert` is meaningfully different from already-forged `bazel-expert` or just a re-naming.
6. **`dist/` pollution** under `handOffs/incoming/dist/` — STILL pending disposition (5+ sessions running). Files: `2026-04-22-0940-bugI-name-mangling-bleed.{client.js,html}`, `scrml-runtime.js`.

---

## 2. Sync state at S44 open (cross-machine hygiene)

| Repo | HEAD | Origin | Ahead/Behind | Worktree |
|---|---|---|---|---|
| scrmlTS | `82e5b0d` | `82e5b0d` | 0/0 | 4 untracked (6nz inbox bugs M/N/O) |
| scrml-support | `091c4f5` | `091c4f5` | 0/0 | 18 untracked (S43 design work + user-voice) |

No divergence to reconcile. State matches S43 close exactly — no in-flight from another machine.

---

## 3. Top of queue (S44 candidates carried from S43 §6)

### Immediate
1. Decide on scrml-support push (§1.1).
2. Triage 6nz inbox bugs M/N/O (§1.3).
3. Move 2 stray progress files (§1.2).
4. Bake scrml-voice-author bio → unlock first article *"Why programming for the browser needs a different kind of language."*

### Investigation (per the design arc)
5. Forge specialized experts (next wave, ~8-10 agents) — covers B's, Superposition's, G's debates.
6. Run debates — 5 ready to fire after expert forging (A, B, C, E+combined, G, Superposition).
7. H's empirical prerequisite — reactive-graph static-resolvability study.
8. Codegen-rewrite UX deep-dive (queued post-C / post-E-Path-B).
9. Spec-vs-implementation gap audit (candidate from F+E pattern).
10. Compile-time external-shape introspection deep-dive (queued post-E).

### Compiler-bug carry (parked while design arc runs)
11. Dispatch A7 — `${@reactive}` BLOCK_REF interpolation in component def. T2.
12. Dispatch A8 — `<select><option>` children in component def. T2 (may resolve as side-effect of A7).
13. Settings.json PreToolUse hook for F4 (S42 finding).
14. Stage 4/5/7/8 (Scope C) follow-ups.

### Earlier carries
- Bug L re-attempt (widened scope; depends on string + regex + template + comment unification).
- Self-host parity (couples to Bug L).
- `scrml vendor add <url>` CLI (downstream of bridges debate C).
- Bun.SQL Phase 2.5.
- LSP `endLine`/`endCol` Span detached.
- Strategic: Problem B (discoverability/SEO/naming).
- Cross-repo: 6nz playground-four cosmetic reverts.

---

## 4. Standing rules in force (carried — see S43 §8 for full)

- Major moves require deep-dives + debates from radical-doubt + know-everything mindsets.
- Radical doubt is a SAFETY mechanism, NOT skepticism.
- Real-time user-voice append (not wrap-batched).
- "Make no mistakes" for irreversible operations.
- Cross-machine sync hygiene (codified in pa.md).
- AI-agent friction is NOT a language-design constraint.
- Superposition is an explicit language pillar.
- `docs/changelog.md` is THE changelog (in-repo).
- Hand-off context-density permanent rule (bloat OK, under-doc not OK).
- "wrap" is an 8-step operation.
- Worktree-isolation startup verification + path discipline (paste verbatim block in every isolation: "worktree" dispatch).
- `examples/VERIFIED.md` is user's verification log; PA never marks rows checked.
- Every dev dispatch that writes scrml MUST include `docs/articles/llm-kickstarter-v1-2026-04-25.md` + `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`.
- Compiler-bug fixes via `scrml-dev-pipeline` with `isolation: "worktree"`, `model: "opus"`. PA does not edit compiler source without express user authorization.
- Commits to `main` only after explicit user authorization. Push only after explicit authorization. Authorization stands for the scope specified, not beyond.
- All agents on Opus (`model: "opus"`).

---

## 5. Session log

- 2026-04-26 — S44 opened. pa.md + S43-closed hand-off read. Rotated S43-closed → `handOffs/hand-off-44.md`. Cross-machine sync hygiene: scrmlTS 0/0, scrml-support 0/0. Inbox state matches S43 close (no new arrivals). Surfacing §1 open questions to user before substantive work.

---

## Tags
#session-44 #open #design-arc-continuation-pending #scrml-support-push-pending-decision #6nz-bugs-mno-pending-triage

## Links
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
- [docs/changelog.md](./docs/changelog.md)
- [handOffs/hand-off-44.md](./handOffs/hand-off-44.md) — S43 closed (rotated S44 open)
- `scrml-support/user-voice-scrmlTS.md` — S43 entries throughout; S44 to be appended in real-time
