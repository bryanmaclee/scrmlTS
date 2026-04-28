# scrmlTS — Session 47 (CLOSED — wrapped + pushed)

**Date opened:** 2026-04-27
**Date closed:** 2026-04-28
**Previous:** `handOffs/hand-off-47.md` (S45 close — rotated at S47 open; slot 46 unused because S46 ran on the OTHER machine and its scrmlTS-side hand-off rotation never committed/synced here).
**Baseline entering S47:** scrmlTS at `b1f6a00` (clean, 0/0). scrml-support just pulled 26 commits to `8330760` (clean apart from carry-over `design-insights-tmp-G.md` untracked).
**State at S47 close:** scrmlTS clean + pushed (this wrap commit). scrml-support clean + pushed (5 net commits this session). Tests held at **7,952 pass / 40 skip / 0 fail / 381 files** — no compiler changes; design-only + voice-author increment. `design-insights-tmp-G.md` carry-over from S45 §1.9 RESOLVED via lift-then-delete.
**Tests at open:** unchanged from S45 close — 7,952 pass / 40 skip / 0 fail / 381 files (no compiler changes since S44 fix at `150c553`; S45 was design-only, machine-B S46 was voice-author + 1 article landing only).
**Tests at close:** verified `bun test` — same 7,952 / 40 / 0 / 381 (28,256 expects, 13.6s).

---

## 0. What just happened (the in-between session on the OTHER machine)

S46 ran on the other machine as a **scrml-voice-author session**. The scrmlTS-side touched only one new file (`docs/articles/why-programming-for-the-browser-needs-a-different-kind-of-language-devto-2026-04-27.md`, commit `b1f6a00`). The bulk of S46's output landed in scrml-support — that's what we just pulled (26 commits / 25,274 insertions / 45 files, mostly catch-up legacy artifacts plus the actual S46 deliverables).

**S46 deliverables:**
1. `scrml-support/voice/user-bio.md` (335 lines) — v0 bio from Tier 1 corpus crawl. **DRAFT**, awaits user "fully baked" signal before article mode unblocks. Tier 2-3 (hand-offs / deep-dives / design-insights) NOT yet crawled.
2. `scrmlTS/docs/articles/why-programming-...-devto-2026-04-27.md` — dev.to-ready article (frontmatter `published: false`). User picks one of 3 tweets, sets `published: true`, uploads.
3. `scrml-support/voice/articles/why-programming-...-draft-2026-04-27.md` (working draft + verification log).
4. `scrml-support/voice/articles/tweet-drafts-2026-04-27.md` (3 tweet options).
5. `~/.claude/agents/scrml-voice-author.md` — built end-to-end. **10 Absolute Constraints** in the agent definition: verbatim quotes only / citations mandatory / mark inference / privacy + write-path whitelist / do-not-claim discipline / bio gating / authorship disclaimer mandatory / public Further reading section / no em-dashes-en-dashes in article body / typo policy.
6. Master-list refresh on scrml-support (was S3, 17 days stale).
7. Machine-Cluster Expressiveness debate folded into canonical `design-insights.md`.
8. 2-machine fork on scrml-support reconciled at merge `9746260` (preserved both halves of design-insights + concatenated user-voice).

**This machine never ran S46.** S45 closed here last night, user moved machines, S46 happened there, came back here. scrml-support's `8330760 wrap S46: voice-author session close` is the canonical record.

---

## 0.5 What landed in S47 (this session, post-pickup)

Voice-author + carry-resolution session. No compiler changes. Tests held at 7,952/40/0/381.

**Voice-author work:**
- Bio v0 → v1: Tier 1 baseline SIGNED OFF; Tier 2-3 INCREMENT COMPLETE; sibling-repo sweep CLOSED EMPIRICALLY.
- 7 net-new verbatim quotes total: 6 from Tier 2-3 (NPM/Odin from `transformation-registry-design`; 4 workflow-style quotes from `hand-off-47`) + 1 from sibling-sweep (`> strip shift from roll`, 6nz z-motion shift-leak, captured in §3h).
- 1 v0 gap closure: R13 "see how it feels" was in Tier 1 all along; v0 missed it.
- Zero contradictions; zero position shifts; v0 load-bearing claims unchanged.
- Methodology durable: "grep-from-PA, deep-Read on hits, write back" recipe documented in bio §11 for any future sandbox-restricted crawl. Two background dispatches both saw sub-agent Bash/Read sandbox restrictions on giti/+6nz/ subtrees; PA closed those gaps directly with grep+Read at PA scope.

**Carry-resolution:**
- `design-insights-tmp-G.md` (S45 §1.9 carry, 2 sessions stale): comparison vs canonical `design-insights.md` §"scrml G" showed headline preserved but §"Debate-worthy follow-ups" lossy-compressed. Lifted 5 specific gates (3 measurement + 2 policy) into `scrml-support/docs/debate-wave-2026-04-26-actionables.md` §"G-debate storage-model migration gates" with attribution. Temp file deleted. Zero actionable loss.

**Sandbox observations (durable):**
- Background sub-agents have stricter Bash/Read sandboxing than the PA. Bash was universally denied for one of the sibling-sweep dispatches; Read denied on giti/+6nz/ for the other. The PA's own scope reaches all sibling repos for read, per pa.md per-repo PA convention. **Future dispatches that need cross-repo read should either pre-enumerate file paths (worked for scrml/ in this session, did NOT work for giti/+6nz/) OR fall back to PA-direct grep-then-Read for the blocked subset.**

**Cross-machine:**
- Pulled scrml-support 26 commits at session open (`d177afe..8330760`) — fast-forward; no conflicts. Local scrmlTS already at `b1f6a00` (article landing from machine-B S46).
- This machine's local rotation skipped slot 46 (machine-B's local hand-off-46.md never committed/synced); S45-close rotated to `hand-off-47.md`. First cross-machine numbering gap on record.

---

## 1. Open questions to surface IMMEDIATELY

Surface to user before any further work:

1. **Bio sign-off** — **RESOLVED S47.** User: *"sign off start the next bio-crawl"*. Bio went v0 → v1 (Tier 1 baseline SIGNED OFF + Tier 2-3 INCREMENT COMPLETE + sibling-sweep CLOSED EMPIRICALLY). 6 net-new verbatim quotes added (Tier 2-3) + 1 (sibling-sweep). Article mode unblocked.

2. **Article publish** — `scrmlTS/docs/articles/why-programming-...-devto-2026-04-27.md` has `published: false`. User: (a) picks one of the 3 tweets at `scrml-support/voice/articles/tweet-drafts-2026-04-27.md`, (b) flips frontmatter `published: true`, (c) sets `cover_image` if desired, (d) uploads to dev.to, (e) drops the companion tweet with article URL. PA does NOT push the publish-true commit without explicit user action.

3. **R4 user-side decision** — STILL OPEN from S45 Debate A. "Is R4 a real workflow or aspirational property?" Mathlib ships entirely on R1+R3, never R4. Bazel says R4 operational at scale. User said R1+R4 in S43. Judge recommended: design for R4, instrument first real R4 use as evidence, reopen if never exercised in 12 months. Surface for explicit yes/no before any capture-artifact implementation.

4. **Comp-time capability boundary SPEC commitment** — STILL the highest-leverage item from the S45 4-debate wave. Doc-only. Must land before any `^{}` / bridge / build-time feature evolves further. **Strong recommend tackling first** unless user prioritizes voice/article work.

5. **A9 candidate** — STILL pending intake.md. T2 fix (extend `walkAndExpand` to recurse into if-chain `branches`).

6. **`dist/` pollution** under `handOffs/incoming/dist/` — STILL pending disposition (now 8+ sessions). Probably just delete.

7. **rawSource-threading sweep** — gap in 5 expression-parser branches (S44 Bug M dispatch finding). Not yet intake-filed.

8. **BS-html-comment-opacity intake** at `docs/changes/fix-bs-html-comment-opacity/intake.md` — not yet dispatched. Severity low.

9. **`design-insights-tmp-G.md` in scrml-support** — **RESOLVED S47.** PA-direct read showed the temp file's headline insight (B-as-category-error, A-now-C-later, tar test, oss-transcripts) WAS captured in canonical `design-insights.md` §"scrml G", but the §"Debate-worthy follow-ups" section enumerating 5 specific testable measurement gates was lossy-compressed in canonical. Lifted those 5 gates (3 measurement + 2 policy) into `docs/debate-wave-2026-04-26-actionables.md` §"G-debate storage-model migration gates", with attribution to the temp file. Temp file deleted. Zero actionable loss; canonical preserved.

10. **agent-forge template fix** — make the forge produce blank-line-before-`model:` (S44 finding). Mechanical.

11. **S44+S45 user-voice gap** (noted in S45 §8 follow-up) — RESOLVED IMPLICITLY by S46's voice-author work, which expanded user-voice-scrmlTS.md from 788 → 3,741 lines and includes a full `## Session 46 — 2026-04-27` block. But verify: does the file now cover S44 + S45 + S46 contentful entries? If S44 + S45 still have gaps, backfill candidate stands.

12. **Tier 2-3 bio crawl follow-up** (from S46 next-session priorities) — **RESOLVED S47.** scrml-voice-author dispatched twice in S47: first for full Tier 2-3 (hand-offs + deep-dives + design-insights), then for sibling-repo sweep. PA closed final giti/+6nz/ gap empirically when sub-agent sandbox blocked Read on those subtrees. Methodology recipe ("grep-from-PA, deep-Read on hits, write back") documented in bio §11 for future sandbox-restricted scopes. Net yield: 6 + 1 = 7 net-new verbatim quotes; bio's v0 load-bearing claims confirmed unchanged.

---

## 2. Cross-repo state at S47 open

### 2.1 scrmlTS

- **HEAD:** `b1f6a00` (`docs(articles): add 'why programming for the browser needs a different kind of language' (dev.to draft)`).
- **Origin:** in sync (0/0).
- **Working tree:** clean except for this hand-off rewrite (about to land).
- **Untracked:** none.
- **One commit ahead of S45 close:** `b1f6a00` — the dev.to article (machine-B output during S46).

### 2.2 scrml-support

- **HEAD:** `8330760` (`wrap S46: voice-author session close`).
- **Origin:** in sync (0/0) post-pull.
- **Working tree:** 1 untracked — `design-insights-tmp-G.md` (carry-over from S45 §1.9; untouched).
- **Pulled in this S47 open:** 26 commits / 25,274 insertions / 45 files. Mostly legacy catch-up (S32 amendments, S19 gauntlet, S17 machine-cluster, S22 hand-offs, S26-era audits, etc.) plus S46 deliverables. The local clone here was apparently 26 commits behind even before S46 added its work — i.e., this clone was missing legacy commits that machine B had. Now caught up.

### 2.3 scrmlTS inbox

Empty (still only `dist/` pollution + `read/` archive).

### 2.4 6nz inbox (outbound from scrmlTS — carried, no action this session yet)

- `2026-04-25-1100-scrmlTS-to-6nz-s41-fixes-and-kickstarter.md`
- `2026-04-26-0919-scrmlTS-to-6nz-s42-close-fixes-and-kickstarter-v1.md`
- `2026-04-26-1430-scrmlTS-to-6nz-bugs-mno-triage.md`
- `2026-04-26-1530-scrmlTS-to-6nz-bugs-mo-shipped.md`

### 2.5 Master inbox (carried, no action this session yet)

- `2026-04-25-0750-giti-to-master-push-request-s8-close.md`
- `2026-04-26-1230-scrmlTS-to-master-staleness-reconciliation-and-cross-machine-rule.md`

---

## 3. Top of queue (S47 candidates)

### Immediate / clear / scoped

1. **Bio sign-off** + article publish chain (§1.1, §1.2) — user-driven, PA waits.
2. **Comp-time capability boundary SPEC commitment** (§1.4) — doc-only, highest leverage.
3. **R4 user-side decision** (§1.3).

### Investigation queue

4. **A9 intake** (§1.5).
5. **BS-html-comment opacity** intake → dispatch (§1.8).
6. **rawSource-threading sweep** (§1.7).
7. **Bug L widened-scope re-attempt** (carry).
8. **agent-forge template fix** (§1.10).
9. **S44+S45 user-voice gap verify** (§1.11) — quick read of `user-voice-scrmlTS.md` Sessions 44+45 to confirm coverage; backfill if absent.

### Strategic (downstream of S45 wave)

11. Manifest schema design for `.scrml-shape/objects/<hash>` + `manifest.toml` carrying `(root, compiler, target)` — designed NOW for SLSA L3 attestation later.
12. **`scrml fmt --upgrade-syntax`** tool sketch (Bug B's only operational requirement — pattern decoupled from any tier mechanism).
13. Bridge header schema + `scrml vendor add` CLI sketch (downstream of C).
14. `compat-debate` framing (how long does scrml promise source-compat?).
15. CVE-stream design (Sigstore-Rekor-shaped Merkle log; non-trivial).

### Earlier carries

- Self-host parity (couples to Bug L).
- Bun.SQL Phase 2.5.
- LSP `endLine`/`endCol` Span detached.
- Strategic: Problem B (discoverability/SEO/naming).
- Cross-repo: 6nz playground-four cosmetic reverts.

---

## 4. Standing rules in force

### NEW from S47 (durable directives)

- **PA-direct empirical-closure recipe for sandbox-blocked sub-agent crawls:** when a dispatched agent's Bash/Read sandbox blocks a path the PA can read, the PA closes the gap directly with `grep -c` from PA shell first (cheap, returns just file-with-match count), then targeted `Read` only on grep hits. Documented in `scrml-support/voice/user-bio.md` §11 with the empirical-closure recipe verbatim. Worth applying any time a sub-agent reports sandbox-restricted paths.
- **Cross-machine local-rotation gap convention:** when one machine runs a session-N that doesn't commit hand-off changes (because it was a sibling-repo-only session, e.g. voice-author), the OTHER machine's `handOffs/` slot N stays empty when picking up. Sequential numbering preserved by rotating S(N-1)-close to slot (N+1). Slot N stays "permanently empty on this clone" — first occurrence in S47 (slot 46 unused on this clone because machine-B's S46 didn't commit scrmlTS-side rotation). Document the gap explicitly so future sessions don't read missing slot as data loss.

### From machine-B S46 (durable directives)

- **Voice-author 10 Absolute Constraints:** see `~/.claude/agents/scrml-voice-author.md`. Load-bearing for any article-mode dispatch.
- **Authorship disclaimer mandatory** on every article: `*authored by claude, rubber stamped by Bryan MacLee*` (italics, under title).
- **Public Further reading section** mandatory at end of every article (cross-links + scrmlTS GitHub).
- **No em-dashes / en-dashes in article body, ever.** Compound hyphens (`first-class`, `compile-time`) are fine. Em-dash is "AI slop give-away."
- **Typo policy:** citations preserve typos verbatim; article prose fixes typos and missing-apostrophe contractions. Vocabulary, humour, ALL-CAPS emphasis, scrml-lowercase brand all preserved.
- **Bio gating clause:** article mode requires user "fully baked" signal on bio before generating new articles (the v1.6 was a one-time evaluation gate-bypass).
- **Voice-author write-path whitelist:** `scrml-support/voice/` (private drafts + bio) and `scrmlTS/docs/articles/` (publish-ready only). Marketing/, scrmlTS root, other repos hard-prohibited.
- **Diff-then-merge cross-machine pull:** when one machine is the working machine and another is a cloud agent (or just the other clone), the working machine's PA must always diff-then-merge, never blind-pull. The "if local has commits origin doesn't AND origin has commits local doesn't" case is a real merge with data on both sides. Codified after S46's design-insights + user-voice 2-machine fork reconcile.

### From S45 (durable)

- **Debate-judge condensed-prompt pattern:** for 5+ expert debates, condense positions to ~2k-token summaries before dispatch. Verbatim positions exceed stream idle timeout (~41 min observed on G-judge first attempt).
- **All-debate-resolutions-are-hybrids pattern:** every one of the 4 wave debates resolved as a composite/hybrid, not a single-position winner. Future debate framings should expect this.

### Carried from S44 + earlier

- Comp-time capability boundary must be SPEC'd before any `^{}` / bridge feature evolves further.
- Major moves require deep-dives + debates from radical-doubt + know-everything mindsets.
- Radical doubt is a SAFETY mechanism, NOT skepticism.
- Real-time user-voice append.
- "Make no mistakes" for irreversible operations.
- Cross-machine sync hygiene (codified pa.md S43).
- AI-agent friction is NOT a language-design constraint.
- Superposition is an explicit language pillar.
- `docs/changelog.md` is THE changelog (in-repo).
- Hand-off context-density permanent rule (bloat OK).
- "wrap" is an 8-step operation.
- Worktree-isolation startup verification + path discipline.
- `examples/VERIFIED.md` is user's verification log; PA never marks rows checked.
- Every dev dispatch that writes scrml MUST include `docs/articles/llm-kickstarter-v1-2026-04-25.md` + `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`.
- Compiler-bug fixes via `scrml-dev-pipeline` with `isolation: "worktree"`, `model: "opus"`. PA does not edit compiler source without express user authorization.
- Commits to `main` only after explicit user authorization. Push only after explicit authorization.
- All agents on Opus.
- Forged agents need blank line between `</example>` and `model:`.
- Mid-session forges aren't loadable until session restart.
- Superposition formalization HELD.

---

## 5. Tests at S47 open

Same as S45/S46 close — no compiler changes since `150c553` (S44 component-def-block-ref fix):

```
7952 pass
40 skip
0 fail
381 files
```

To re-verify mid-session, run `bun test` from repo root.

---

## 6. Numbering note (S46 vs S47, cross-machine convention)

**This machine** went S45 → S47 (skipping local slot 46) because S46 ran entirely on the OTHER machine. The OTHER machine's local hand-off-46.md (if it created one) was never committed/synced, so this machine's `handOffs/` directory has no slot 46. The S45-close hand-off rotated to **`hand-off-47.md`** at this session's open per the convention "name = opening session." This is the first cross-machine session-numbering gap on record; flagged here so future sessions don't read a missing slot 46 as data loss.

User-voice (`scrml-support/user-voice-scrmlTS.md`) DOES have a `## Session 46 — 2026-04-27` block (machine-B's voice work) — that file is shared via scrml-support and is canonical for session-numbering across machines. So global session count = 46 closed + 47 opening, but local rotation files skip slot 46 on this clone.

---

## 7. Recommended next-session opening sequence

1. Read `pa.md`.
2. Cross-machine sync FIRST (per pa.md S43 rule). Both repos pushed at S46 close + this S47 open's pull, so should be 0/0 going forward.
3. Read this hand-off in full.
4. Read `scrml-support/user-voice-scrmlTS.md` last 10+ contentful entries.
5. Surface §1 to user.
6. Probably-first action: §1.1 bio sign-off (gating §1.2 publish + §1.12 Tier 2-3 crawl).

---

## 8. Session log (chronological — S47)

- 2026-04-27 — S47 opened. Read pa.md + S45-close hand-off (rotated to `hand-off-47.md`). Cross-machine sync: scrmlTS clean 0/0 (already at `b1f6a00`); scrml-support behind 26 commits, pulled `d177afe..8330760` cleanly fast-forward (no conflicts; `design-insights-tmp-G.md` untracked carry survived). Voice-author S46 deliverables now visible locally. Drafted this hand-off and surfaced §1 to user.
- 2026-04-27 — User: *"sign off start the next bio-crawl"*. Bio v0 status block updated to "v1 — Tier 1 baseline SIGNED OFF" with sign-off note. Verbatim block appended to `user-voice-scrmlTS.md` (S47 entry). Dispatched `scrml-voice-author` (background) for Tier 2-3 incremental crawl with append-only discipline + write-path whitelist + incremental-commit protocol.
- 2026-04-27 — Tier 2-3 crawl completed. Bio 339→392 lines (+53). Net-new: 6 verbatim quotes (NPM/Odin from `transformation-registry-design`; 4 workflow-style from `hand-off-47`). 1 v0 gap closure (R13 "see how it feels"). Zero contradictions. §10/§11 added to bio (provenance + sibling-repo coverage gap). Coverage gap surfaced: agent's Bash sandbox blocked `find`/`ls` into `scrml/`, `giti/`, `6nz/` subtrees. Two scrml-support commits landed (`1ead983`, `782551b`).
- 2026-04-28 — User: *"yes the first one"* — close sibling-repo coverage gap. PA enumerated 23 sibling-repo files (3 scrml + 10 giti + 10 6nz). Re-dispatched `scrml-voice-author` with explicit Read paths. Result: scrml/ readable (3/3 read, 0 net-new — pure PA-admin); giti/+6nz/ Read-blocked at sub-agent permission level even with paths supplied. Bash universally denied this dispatch. PA closed the gap empirically via `grep -c` from PA scope: giti/ → 0 file matches → 0 quotes; 6nz/ → 1 match (`hand-off-4.md:52`) → 1 quote (`> strip shift from roll`, captured in §3h). All sibling-repo gaps closed. §11 rewritten from "STILL BLOCKED" to "CLOSED EMPIRICALLY"; methodology recipe documented for future sandbox-restricted scopes.
- 2026-04-28 — `design-insights-tmp-G.md` carry from S45 §1.9 resolved. PA-direct read showed canonical `design-insights.md` §"scrml G" preserved the headline insight but lossy-compressed the §"Debate-worthy follow-ups" section (5 specific testable gates). Lifted those 5 gates into `scrml-support/docs/debate-wave-2026-04-26-actionables.md` §"G-debate storage-model migration gates" with attribution. Temp file deleted. Zero actionable loss.
- 2026-04-28 — User: *"commit, push, wrap, do scrml-support too."* Wrap initiated. Tests run (7,952/40/0/381 — same as S45/S46 close). Master-list + changelog + hand-off updated. Both repos committed + pushed.

---

## Tags
#session-47 #closed #cross-machine-pickup #s46-was-other-machine #bio-v0-signed-off #bio-tier-2-3-complete #sibling-sweep-empirically-closed #design-insights-tmp-G-resolved-via-lift-then-delete #pa-direct-empirical-closure-recipe #cross-machine-rotation-gap-convention #comp-time-capability-boundary-still-highest-leverage #r4-vs-r3-still-open

## Links
- [pa.md](./pa.md)
- [master-list.md](./master-list.md) — S47 close numbers
- [docs/changelog.md](./docs/changelog.md) — S47 entry added at close
- [handOffs/hand-off-47.md](./handOffs/hand-off-47.md) — S45 close (rotated S47 open)
- `scrml-support/voice/user-bio.md` — bio v1 (Tier 1 SIGNED OFF + Tier 2-3 + sibling-sweep CLOSED EMPIRICALLY)
- `scrml-support/voice/progress-bio-tier-2-3-2026-04-27.md` — full crawl progress log
- `scrml-support/voice/articles/why-programming-...-draft-2026-04-27.md` — working draft + verification log
- `scrml-support/voice/articles/tweet-drafts-2026-04-27.md` — 3 tweet options
- `scrmlTS/docs/articles/why-programming-...-devto-2026-04-27.md` — dev.to-ready (publish: false)
- `scrml-support/hand-off.md` — post-S46 wrap
- `scrml-support/design-insights.md` — 4 S45-wave insights at lines 498/533/560/669
- `scrml-support/docs/debate-wave-2026-04-26-actionables.md` — terse S45-wave tracking doc + S47 G-gates lift
