# scrmlTS — Session 132 (CLOSE)

**Date:** 2026-05-26
**Previous:** `handOffs/hand-off-134.md` (S131 CLOSE — grammar-lockdown + carry-forward: Lifecycle L2/2.5 + Iteration L1/2 + MCP V0.E + HU-3/4/5/6 lockdown sweep).
**Machine:** ⚠️ **MACHINE SWITCH at this wrap.** Next session likely on the OTHER machine. Everything durable is committed + PUSHED (both repos). **PA auto-memory (`~/.claude/...`) does NOT sync across machines** — so the cross-machine carriers are this hand-off (scrmlTS) + user-voice (scrml-support), both pushed. Two methodology lessons below are captured in user-voice so the other machine sees them.
**HEAD at S132 OPEN:** `c2d3f7ae`
**HEAD at S132 CLOSE:** (this wrap commit)
**pkg.json:** 0.6.0 (no tag cut)
**Hooks:** pre-commit + pre-push installed. `--no-verify` was USER-AUTHED for this wrap (docs/spec-only session, machine-switch urgency).
**Tests:** 21,584 baseline (S131). **S132 was docs/spec-ONLY — zero compiler-source changes — so no test-count delta.** Pre-commit subset ran green in every agent worktree (14,561 / 14,654 reported). Full suite NOT re-run at wrap (--no-verify authed; nothing compiled changed).

---

## ⭐ FIRST FIRE NEXT SESSION — E-FN-003 fix (user-directed: "fully prepped for first fire")

**Ready-to-dispatch. Route through `scrml-dev-pipeline` (compiler-source, T-tier). Paste the brief below.** The triage (S132 agent `aab45a46830ce7f04`) is complete — root-cause + fix-shape + repro + the 4 regression tests are all nailed. This is a HIGH/blocking bug that defeats the very "fn returns markup" idiom the canon now documents (PRIMER §6.4 sub-shape 4 / kickstarter §11.11).

> **TASK — Fix E-FN-003 false-positive on attributed-markup-return inside `fn`.**
>
> **Bug:** `${ fn badge(x) { return <span class="b">${x}</span> } }` false-fires `E-FN-003: fn body writes to 'class'`. Broader than first reported — also fires on `let m = <span class="c">…` (not just `return`) and on brace-attrs (`<a href={x}>`). I.e. ANY markup attribute (`name="…"` or `name={…}`), in a `return` OR a `let`-decl, inside an `fn` body.
>
> **Root cause:** `checkOuterScopeMutation` (`compiler/src/type-system.ts` ~12780-12813, reached via call-site ~13135) runs a TEXT-heuristic regex `ASSIGN_RE = /([A-Za-z_$][A-Za-z0-9_$]*)(?:\.[…])?\s*=[^=>]/` (line ~12780) over the SERIALIZED statement text (`nodeText` → `emitStringFromTree`, `expression-parser.ts:2035`, which re-serializes returned markup INCLUDING attributes). So `class="b"` appears in the text; `ASSIGN_RE` captures `class` as an assignment LHS (char after `=` is `"`, not `=`/`>`, so the exclusion passes); `class` ∉ `localNames` → false E-FN-003. Bounding: bare `function` escapes (the purity walker `checkFnBodyProhibitions` runs only for `fnKind==="fn"`, type-system.ts:5118); unattributed `fn` escapes (no `=` in serialized text).
>
> **Fix-shape (preferred — structural):** in `checkOuterScopeMutation`, detect whether the statement's value/`exprNode` is/contains a `kind==="markup"` node (markup is already a first-class node kind here — type-system.ts:4597, 9626) and SKIP the markup-rendered portion of `txt` before running `ASSIGN_RE`. This preserves real-write detection — the node-kind path at ~12785-12798 (`stmt.kind==="assignment"|"tilde-decl"`) AND the `@cell`-mutation path at ~13013-13064 are UNTOUCHED, so genuine outer-scope/`@cell` writes inside `fn` still fire. (Distinct from the §48.3.3 `@cell`-mutation DD — that's the 13013-13064 path; this is the 12780 text-heuristic path misreading markup attr names.)
>
> **Regression tests (MANDATORY — extend `compiler/tests/unit/gauntlet-s19/fn-prohibitions.test.js` §8 ~line 564):** (a) `fn` returning attributed markup → NO E-FN-003; (b) `let`-bound attributed markup inside `fn` → NO E-FN-003; (c) brace-attr (`href={x}`) → NO E-FN-003; (d) **NEGATIVE CONTROL** — `fn` body with a real outer-scope write (`counter = counter + 1`) alongside attributed markup → STILL fires E-FN-003 (proves the guard didn't over-suppress purity enforcement).
>
> **Repro files (retained):** `/tmp/efn003-repro.scrml` (case A) + `/tmp/efn003-{B,C,D,E}.scrml`. Invocation: `bun run compiler/src/cli.js compile <file>`. **Severity HIGH/blocking, adopter-facing.** No existing known-gaps closure needed beyond flipping Bug 12 → resolved + a changelog note.

---

## S132 in one paragraph

A **session-open + grammar-lockdown-decisions** session, ending in a machine-switch wrap. Opened cold (full mandatory reads: pa.md / PRIMER / SPEC-INDEX / master-list §0 / hand-off / user-voice S129-130 all IN FULL). Refreshed the 5-session-stale maps (S126→HEAD). User surfaced a **durable user-voice cadence rule** (append AS-WE-GO, never batch-at-wrap — power loss before wrap loses everything; S131's missing user-voice was power-loss, not negligence) — applied immediately + every session-directive since logged as-we-go. Then worked the grammar-lockdown remaining decisions PA+user: **Decision A (§29 vanilla-interop)** — PA teed it up on STALE status (a false binary retire-vs-implement; the carry-forward said "open since S110" but S131 Q-W3-4 had actually ratified "(c) defer"); user said "retire," the retirement agent surfaced the conflict, PA HELD the land + re-presented the true 3-option space + S131's anti-retire reasoning, user chose **(c) defer + Nominal-reframe** (landed: §2.1's false present-tense claim removed, §29 kept as Nominal, Q-W3-4 reaffirmed). **Decision B ($(param){})** — fired a DD; verdict: **DROP it** — the disliked `${function(){…lift…}}` shape NEVER compiled (E-SYNTAX-002), scrml already expresses one-shot-lift 5 ways, $(param){} is an L22-synonym; user ratified all 4 HU-Qs per PA leans → canon landing (PRIMER §6.4 + kickstarter §11.11 + §10.4/§49 SPEC fix) + E-FN-003 triage. **All work this session was docs/spec — zero compiler-source.**

---

## Commit ledger (S132)

**scrmlTS (5 + wrap, all pushed):**
| SHA | Subject |
|---|---|
| `51dd589d` | chore(s132-open): maps refresh @c2d3f7ae (S126→S131, 62 commits) + hand-off rotation |
| `77976bf8` | docs(S132 iteration Landing 4): PRIMER §6.3 + kickstarter §11.10 — `<each>` canon catch-up |
| `5ec5af56` | docs(S132 §29 option-c): reframe vanilla-interop to Nominal — NOT retire (reaffirms S131 Q-W3-4) |
| `5d52e4c8` | docs(S132 one-shot-lift canon): PRIMER §6.4 + kickstarter §11.11 + SPEC §10.4/§49 fix (HU-Q2+Q3) |
| (this wrap) | chore(s132-close): wrap — hand-off CLOSE + master-list §0.6 + changelog + known-gaps E-FN-003 |

**scrml-support (5, all pushed):** `ca2634b` (user-voice cadence rule) · `5f11622` (§29 retire ruling) · `3f07a2f` (§29 (c) revision + lesson) · `dc3cc96` (one-shot-lift DD) · `8ef13cc` (HU-Q1..Q4 ratification).

---

## Major arcs in detail

### Arc 1 — Maps refresh (user-authed)
`.claude/maps/` was stale at `3a909c1d` (S126); refreshed to HEAD via `project-mapper` (incremental, 62 commits). All 9 maps + non-compliance report rewatermarked to `c2d3f7ae` (the OPEN commit; subsequent S132 doc commits are post-watermark — maps note this drift is acceptable, docs-only). Landed in `51dd589d`.

### Arc 2 — User-voice cadence rule (DURABLE — applies cross-machine)
S131's missing user-voice was **power loss**, not negligence. User: *"some PAs update as we go along, others batch, sometimes details get lost when batching."* **Rule: append user-voice AS-WE-GO (each durable directive when it arrives), never batch-at-wrap.** A written-to-disk file survives a reboot; a wrap-time batch held in session context does not. Applied every directive since (committed incrementally to scrml-support). PA memory `feedback_user_voice.md` updated (this machine only). **Cross-machine carrier: user-voice-scrmlTS.md S132 (pushed).**

### Arc 3 — §29 vanilla-interop (Decision A) — the false-binary near-miss
PA teed §29 up as "open since S110 — retire vs implement," leaning retire. User: "retire." The §29-retirement agent then surfaced that **S131 Q-W3-4 had ratified "(c) defer indefinitely, NOT retired" ONE DAY prior**, with explicit anti-retire reasoning. PA had (1) trusted a stale hand-off "still open" line over the ratification record, and (2) presented a false binary (omitted option c). PA HELD the retire-land, surfaced the true 3-option space + S131's reasoning, user chose **(c)**. Landed (`5ec5af56`): §2.1's false present-tense "passes through the rest" claim removed (the real S110 contradiction); §29 KEPT with a Nominal banner; §47.5 three mislabeled §29→§21 cross-refs fixed; Q-W3-4 LEFT STANDING. The §29-retire branch (`ab47e60e`) was unwound (its §47.5 fix salvaged into (c)).

### Arc 4 — Iteration Landing 4
PRIMER §6.3 + kickstarter §11.10 `<each>` canon catch-up (was zero coverage). All examples compile-verified. Landed `77976bf8`.

### Arc 5 — one-shot-lift DD (Decision B) + canon landing
DD verdict (`scrml-support/docs/deep-dives/one-shot-lift-ergonomics-2026-05-26.md`): **DROP `$(param){}`.** The disliked `${ function name(){…lift…} }` shape never compiled (E-SYNTAX-002 — `lift` illegal in a `function` body); the pain was a memory of an invalid pattern; scrml already expresses all 5 one-shot-lift sub-shapes via existing primitives; `$(param){}` is an L22-synonym. User ratified all 4 HU-Qs per PA leans. Canon landed (`5d52e4c8`): PRIMER §6.4 + kickstarter §11.11 + the §10.4/§49 E-SYNTAX-002-is-`function`-only fix (the agent extended the fix to §49.6.2/§49.7/§49.12.1 which cited §10.4 — in-scope, verified lift-in-while-in-fn compiles). **HU-Q1 knock-on: the L19 multi-statement-handler relaxation is MOOT** (it was only ever a place for `$(param){}` to relax into; named-function path stands).

### Arc 6 — E-FN-003 triage (HU-Q4)
Complete — see the FIRST-FIRE brief at top. HIGH/blocking; fully scoped; fix deferred to next session per the machine-switch wrap.

---

## State at close

| Item | Value |
|---|---|
| HEAD | (this wrap commit) |
| pkg.json | 0.6.0 (no tag) |
| Tests | 21,584 (S131 baseline; docs/spec-only session, no delta; pre-commit subsets green) |
| Worktrees | main only (4 cleaned at wrap: a2cd4df canon / a62c2df0 Landing-4 / a981ad7d §29-c — all LANDED; ab47e60e §29-retire — UNWOUND) |
| Push | ✅ BOTH repos pushed at wrap (`--no-verify` authed) — clean for machine switch |
| Inbox | empty |
| S99 path-discipline counter | held — zero leaks across all S132 worktree dispatches |

---

## Carry-forward to S133

### #1 — FIRE FIRST: E-FN-003 fix (brief at top of this doc). HIGH/blocking, fully prepped.

### Grammar-lockdown remaining DECISIONS (UNVERIFIED status — apply the §29 lesson)
**⚠️ Verify each against the ratification record (HU docs + SPEC) BEFORE teeing up as a decision — the carry-forward "open" flags burned us on §29 (S131 had ratified it; the hand-off said "open").**
- **C** — E-SCHEMA-003 enforcement (schema-placement-inside-`<program>` enforce now vs defer). F-019 follow-on.
- **D** — Cluster B-code Site 1 retirement (META_BUILTINS purge; 3 prereqs, 7 live callers). Compiler-source.
- **E** — F-003 source-cascade (finish remaining sites; most landed S130).
- **G** — versioning drift (pkg.json 0.6.0 vs changelog) before any tag cut.
- ~~B ($(param){})~~ RESOLVED — dropped. ~~A (§29)~~ RESOLVED — (c) Nominal-reframe. ~~L19 relaxation~~ MOOT.

### Phase-1c cluster authoring (HU-6 ratified S131 — BG-fireable)
H flagship reveal (`^{}`+type-as-arg+refinement; wants user eyes on framing) · I self-host idiom · J error-handling · K kickstarter §4 engines · L worker/sidecar/SSE · M module/type-system · N 7 footnotes.

### Iteration/Lifecycle landings
Iteration Landing 3 (`promote --each` CLI impl — SPEC §56.10 spec'd) · Landing 5 (corpus migration 113 sites; BLOCKED by Landing 3 CLI) · Lifecycle Landing 3 (PRIMER + kickstarter flagship for `(A to B)`, F-023).

### Findings surfaced this session (act-on / log)
1. **`scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` DOES NOT EXIST** — pa.md mandates it in every gauntlet/dev brief, but it's absent from the repo tree (the Landing-4 agent flagged it; used kickstarter §7 + PRIMER §11 instead). **Either author it or amend pa.md to drop the mandate.** Real doc-integrity gap.
2. **`key=.id` does NOT silence `W-EACH-KEY-001`** in the common path — SPEC §17.7.5 says `.id` infers silently, but `lint-w-each-key.js` needs the cell's declared type to thread through the type-registry, which it doesn't — so the lint fires even with an `id` field. Fresh SPEC §17.7.5-ahead-of-impl gap. The canon docs (PRIMER §6.3 / kickstarter) carry the honest caveat (`key=@.id` is the reliable silencer today). Log to known-gaps next session.
3. **Canon snippet constraints (sub-shape 5):** `${render row(it)}` nested inside `${for…lift}` in a component body FAILS (Phase-1 component-body re-parse limit); the §16.6 lambda fill `prop={ (n)=><markup> }` triggers a cosmetic `W-LINT-007` false-positive (doesn't block). Shipped forms avoid both. Both are real, both noted in the DD.
4. **`error.map.md` doesn't catalog `E-SYNTAX-002`** at all (canon agent's maps-feedback) — candidate to add at next maps regen if the error map is meant to be exhaustive.

### Methodology lessons (in user-voice S132; bank to THIS-machine memory when next on this machine)
- **Verify carry-forward "open" status against the ratification record before teeing up as a DECISION, and present the full disposition space (not a binary).** The S131 hand-off said §29 "still open" while S131 Q-W3-4 had ratified defer. Extends pa.md Rule 4 + [[feedback_dd_brief_read_session_log]] to decision-teeing. (NEW memory candidate: `feedback_verify_status_before_decision.md`.)
- **User-voice cadence: as-we-go, never batch-at-wrap** (Arc 2; `feedback_user_voice.md` updated this machine).

### Open questions for S133
1. ~~Push~~ — DONE both repos at wrap.
2. **E-FN-003 fix** — queued FIRST (brief ready).
3. **C/D/E/F/G queue** — user hasn't picked the next; verify-status-first.
4. **BRIEFING-ANTI-PATTERNS.md** — author or de-mandate (finding #1).

---

## Tags
#session-132 #CLOSE #machine-switch #pushed-both-repos #grammar-lockdown-phase-2 #decision-A-§29-nominal-reframe #decision-B-dropped-$(param){} #one-shot-lift-canon-landed #E-FN-003-triaged-fix-queued-first #user-voice-as-we-go-rule #§29-false-binary-lesson
