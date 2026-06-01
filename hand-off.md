# scrmlTS — Session 151 (CLOSE)

**Date:** 2026-06-01
**Previous:** `handOffs/hand-off-155.md` (= S150 CLOSE, the reference for this session).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-156.md` at S152 OPEN.

---

## 🏁 S151 CLOSE (wrap + push). Three landings + a self-demo-website milestone + MCP-dogfood research.

**Numbering note (one-time):** a prior "S151" was started erroneously (zero work). This real session reclaimed S151. The S150 CLOSE is preserved at `handOffs/hand-off-155.md` (byte-identical to the committed reference). Resolved at OPEN; ignore henceforth.

## State as of CLOSE
- **HEAD scrmlTS:** the S151 wrap commit (this commit) — pushed origin **0/0**. Session commits: `543e07fe` canon-fix(R28-C2) · `cce289b4` C4/R28-5 lifecycle · `c66af6b2` C1 self-demo website inc1 · + this wrap commit.
- **scrml-support:** user-voice S151 appended (as-we-go) — committed + pushed **0/0**.
- **Cross-machine:** scrmlTS + scrml-support both **0/0** with origin.
- **Tests:** full `bun run test` **22,456 pass / 0 fail / 224 skip / 1 todo / 862 files** (S150 baseline 22,450/220/861; +6 pass +4 skip = C4's +10 cases [6 active / 4 skip]; 0 regressions; pre-push gate passed end-to-end, NO `--no-verify`).
- **known-gaps §0:** HIGH 0 · MED 11 (C4/R28-5 RESOLVED) · LOW ~17 (+given-guard +srcmap-offset-threading carried) · Nominal 7. PLUS 7 NEW C1-dogfood bug-candidates filed needs-PA-confirm (see below) — NOT yet severity-counted pending confirm.
- **Worktrees:** NONE — both dispatch worktrees (C4 `wf_96f76c79-096-2`, C1 `wf_5d5afd3c-972-2`) cleaned at wrap step 6b (work landed via file-delta). `git worktree list` = main only.
- **Inbox:** empty. **Outbox:** none sent this session.

## 🔬 S151 EXECUTION LOG

### Session start
Reclaimed S151 from a void-started prior. Read pa.md + pa-scrmlTS.md (full, 1068L), SPEC-INDEX (full, 385L), PRIMER, master-list §0, user-voice S141–S150. Both repos 0/0, inbox empty, worktrees clean at OPEN.

### Arc 1 — C1 self-demo website, increment 1 (the milestone) — LANDED `c66af6b2`
The S148-ratified compile-transparent self-demo scrml.dev viewer, built into `docs/website-viewer/` (21 files), via a BG workflow (Design → Build[worktree] → Verify). **It works and the provenance is REAL** (the credibility crux): the committed `.js.map` + `.client.js` + engine-graph are **byte-identical to an independent regeneration** from `examples/14-mario-state-machine.scrml`; verify VLQ-decoded the map with its own decoder — hover src-line 69 (`@coins = @coins + n`) → JS line 52, bidirectional, line-honest, synthetic lines excluded. **Not a 0:0 stub.**
- **Layout (S151 revision, captured user-voice):** site-left-60% (live mario iframe) + right-40% STACKED — scrml source (top) / engine "what-comes-next" diagram (middle, engine-conditional) / tabbed JS·HTML·CSS output (bottom). Provenance links vertically.
- **Decisions ratified (3× AskUserQuestion):** showcase-only (live-edit deferred to C2a) · shell built AS a scrml app (full dogfood) · first-cut = viewer + flagships + dashboard then iterate.
- **TWO deviations the next PA must know:** (1) path is `docs/website-viewer/` (SIBLING), NOT nested `docs/website/viewer/` — a nested viewer gets swept into the 97-page-site compile by `scrml dev docs/website/` and regresses it; sibling keeps the 97-page site **provably untouched** (verify: zero `compiler/src` + zero `docs/website` edits). (2) Serve via `docs/website-viewer/scripts/serve.sh` (it symlinks the precomputed `/data`; bare `scrml dev` 404s the artifacts — `scrml dev` has no static-asset/public-dir convention).
- **SERVE-BEFORE-PUSH (S146) OVERRIDE:** the user did NOT eyeball it in a browser; they explicitly directed "commit C1" on the verification (build-agent Puppeteer-verified + verify's byte-identical adversarial check). PA flagged the hold; user overrode. `serve.sh` remains available to eyeball live anytime (it's inc1, iterable). Logged user-voice.
- **inc2 (next):** the other 3 engine-heavy flagships + full dashboard live-embed + KB-nav + PE-layer toggle; live-pane↔source hover (postMessage across the iframe); HTML/CSS-tab provenance (Phase-2); col-precise highlights (srcmap offset-threading). Open forks parked for owner: engine-graph multi-file write-loop bug (inc1 sidesteps via single-file compile; inc2's multi-file flagship `23-trucking-dispatch/hos` needs it fixed) · live-pane mount mechanism (iframe chosen; bidirectional hover needs postMessage) · dashboard live-embed.

### Arc 2 — C4/R28-5 object-literal lifecycle E-TYPE-001 dormancy — RESOLVED `cce289b4`
Function-local `const u: User = {…}` object-literal bindings skipped the lifecycle tracker (pre-transition field read compiled clean = silent safety gap). Root: `collectStructBindings` (type-system.ts) had JSX + positional-tuple enrollment paths but no `{`-object-literal branch (unlike working sibling `collectStateDeclStructBindings`). Fix (+22/-1): Path 4 reusing the existing `seedInitialFromObjectLiteral`; enrollment-only, gated on `lifecycleRegistry` (no over-fire), carve-outs preserved. +10 tests. reproduce→fix→verify BG workflow; independently verified. **Disclosure (NEW LOW filed):** the struct-field walker doesn't honor `given (u.field is not not)` guard discrimination — PRE-EXISTING (JSX form behaves identically), NOT introduced by C4; test asserts parity.

### Arc 3 — R28-C2 kickstarter canon-fix — LANDED `543e07fe` (PA-direct)
§11.3 real-time recipe: `<channel>` was a sibling of `<program>` (fires E-CHANNEL-OUTSIDE-PROGRAM per SPEC §38.1 / Insight 30) → moved inside `<program>`; PA compile-verified the fixed recipe exit-0 clean. §11.13 SSE: added `import { sleep } from 'scrml:time'`. **R28-C1 found STALE-open** — the `server fn`→`server function` flagship fix already landed S144 `44d61a19` (reverse-direction caught it; no action). **Parked (not safe-mechanical):** `print()` (~15 SPEC+kickstarter sites; NOT a defined builtin — canon-wide decision needed on the right idiom / JS-host passthrough) + `< db>` leading-space (markdown-display-vs-copy-paste tension).

### Arc 4 — MCP dogfood research (delivered; decisions QUEUED, nothing built)
Grounded against code: **MCP V0 is SHIPPED** — `<program mcp>` activates an 11-tool read-only stdio MCP server (`compiler/runtime/stdlib/mcp.js`); 8 topology tools work, 3 live-state tools (currentVariant/form-status/channel-state) are SHIPPED-BUT-BROKEN (= **Bug 14**, no server-side `globalThis._scrml_reactive_get` stash). The S122 "DevTools-for-agents" candidate is NOT unbuilt — its v0 tier IS that shipped MCP V0 (framing-corrected). The genuinely-NEW C1↔MCP work = a "site-as-corpus" MCP (engineReachableStates / provenanceFor / corpusStatus over the site's own artifacts; ~half free reads of already-emitted JSON). **Staging (queued, NOT built):** the `<program mcp>` flip on `docs/website-viewer/app.scrml` → a small **inc2** (tiny + reproduces Bug 14 on a public app); the corpus-MCP → its **own arc** after inc1. `docs/website-viewer/app.scrml` is a bare `<program>` today (flip-ready). Awaiting user ratify.

### Arc 5 — R28-8 RATIFIED (extend §14.10); predicate-fields question PARKED
- **R28-8 ratified** (condition "only drawback is extra work" PA-verified against §14.10): extend the bare-variant inference position-list to typed object-literal fields + `is some`-narrowed `==` RHS — same rule + same E-VARIANT-AMBIGUOUS union-guard at more positions, graceful qualify-fallback, no new ambiguity. Becomes an IMPL arc; makes kickstarter §4.8 correct. NOT yet implemented.
- **Predicate-fields standing question PARKED** (awaiting clarification — "exept" = except vs accept): grounded — struct field TYPES carry refinement predicates broadly (§53; `email: string(pattern(...))` etc.); the open edge = subset-restricting an enum field via `oneOf([.A,.B])` (not clearly spec'd, possible gap). User to confirm reading before any design call.

## 🐛 7 C1-DOGFOOD BUG-CANDIDATES (build-surfaced, NEEDS PA-CONFIRM before fix-dispatch — reverse-direction R26)
Filed in known-gaps §S151. Two significant:
1. **#6 (potential HIGH, looks new):** cross-file client-side `fn`/component imports break at runtime — page emits ES `import` in `client.js` but HTML loads it via non-`module` `<script>` → "Cannot use import statement outside a module", no client code runs. Blocks cross-file client composition; forced inlining in C1. **Highest-value — confirm + likely fix-dispatch first.**
2. **#7 (overlaps known caveat):** Tier-1 `<each>` body drops attribute `${}` interp / `class:` bindings / event handlers (literal-string emit). PRIMER §6.3 documents the attribute-interp half as a Landing-1 caveat; the class:/handler-drop may be broader. Forced Tier-0 `${for…lift}` in C1.
3–7 (lower): no `--sourceMap` CLI flag (API-only) · inline-object/`->{}` return-type miscompile (E-SCOPE-001 on keys + E-CODEGEN-INVALID-JS) · inline-object-string-in-reactive-write E-SCOPE-001 · multi-statement `when` body → invalid JS · `for=` substring in fn-string → E-FN-003. Plus minors (bare `/`→E-SYNTAX-050, nested `<each in=@.field>`, W-DEAD-FUNCTION RI false-positive on a `.then`-called fn).

## Open questions / S152 priorities (CARRY-FORWARD)
1. **C1 inc2** — 3 more flagships + full dashboard live-embed + KB-nav + PE-layer toggle + postMessage live-pane↔source hover. (Serve `serve.sh` for a browser look anytime.)
2. **Confirm + fix #6** (cross-file client imports → non-module script) — the highest-value dogfood finding; likely HIGH once confirmed.
3. **Confirm #7** scope (is the class:/handler-drop broader than the documented `<each>` Landing-1 attribute-interp caveat?).
4. **MCP dogfood** — ratify the `<program mcp>` flip (inc2) + the corpus-MCP arc; Bug 14 (3 broken live-state tools) is the real fix it surfaces.
5. **R28-8 impl arc** (extend §14.10 inference — ratified, unbuilt).
6. **Predicate-fields question** — get the user's reading, then decide (enum-subset `oneOf` gap?).
7. **`print()` canon-wide decision** (~15 sites; what idiom / JS-host passthrough?) + `< db>` markdown-spacing careful sweep.
8. Carried LOWs: srcmap offset-threading (col-precision) · engine-graph multi-file write-loop · given-guard struct-field discrimination · the C1 punch-list (x_scrml_kinds off-by-N, stale `docs/website/viewer/` header comments, intentional inline duplication).
9. Carried from earlier: `:`-shorthand-state-body block-splitter fragility (S145, keep+fix); C6 formFor-in-engine; R28-1c `<each>` same-key reactivity; tier-2 ceiling primitive DD; bank the C1 F1/F2 verdict to scrml-support/design-insights (only in user-voice + hand-offs today); maps refresh (stale for S149+S150+S151 codegen).

## pa.md directives in force
- Rules R1–R5. Working-style S147 (largest fully-ratified-for-go target, autonomous, park-on-input-needed). `full wrap` discriminator (S139) + 88% floor available.
- This session: 3 PA commits + wrap, branch-leak coherence held (ahead == PA-authored throughout); C1 serve-before-push OVERRIDDEN by explicit user "commit C1" (logged). Standing: `--no-verify` prohibition (held — full pre-push gate passed) · S88 explicit isolation:worktree (held, 2 worktree dispatches, 0 leaks) · S99 path-discipline · S147 branch-leak coherence (held) · S136 BRIEF.md archival (BG-workflow scripts persist the briefs on disk) · S138 R26 (C4 reproduce-gated + verified; #6/#7 await reverse-direction confirm) · S90 CWD gate · S94 bump-on-tag (NONE — no tag this session).

## Notes for next PA
- **pre-existing untracked in scrml-support** (`voice/articles/*devto*.md` + `tools/`) are NOT this session's work — left untracked; only `user-voice-scrmlTS.md` was committed.
- C4 + C1 dispatched as BG workflows; the persisted scripts are at `…/workflows/scripts/c4-objlit-lifecycle-fix-*.js` + `c1-website-build-inc1-*.js` (serve as BRIEF.md-equivalent forensic record).

## Tags
#session-151 #CLOSE #c1-self-demo-website-inc1 #real-provenance-byte-identical #c4-objlit-lifecycle-resolved #r28-c2-canon #mcp-dogfood-research #r28-8-ratified #serve-before-push-overridden #7-dogfood-bug-candidates #known-gaps-HIGH-0
