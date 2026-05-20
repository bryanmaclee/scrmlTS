# scrmlTS — Session 109 (IN-FLIGHT — user AFK)

**Date:** 2026-05-19
**Previous:** `handOffs/hand-off-111.md` (S108 CLOSE — rotated at S109 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S109 OPEN:** `df1211d` (S108 wrap)
**HEAD at this update:** `e8ba2f7` (S109 in-flight, 10 commits under AFK directive)
**Origin sync at OPEN:** scrmlTS 0/0; scrml-support 0/0 (**push pending** — user did not authorize push during AFK session)

## S109 in-flight landings (user authorized "ship Fix A, then keep going down the list. afk")

1. **`6005993`** `chore(s109-open): maps refresh + hand-off rotation` — 22-commits-behind maps watermark refreshed; 8 maps regenerated (2 via project-mapper agent, 6 PA-direct after the agent socket dropped mid-dispatch).
2. **`204b563`** `feat(bug-2): C-narrow — markup-text mode does NOT track string state (SPEC §3.1 + §8.1)` — adopter-reported phantom E-SYNTAX-050 + cascade. Bisecting reducer found root cause was NOT multi-line `<a>` + entity-encoded body (reporter's hypothesis) but **any unpaired `'` or `"` in markup-text** (`<code>X</code>'s`, `text "with quotes`). Removed `block-splitter.js:1059-1095` markup-text-level quote-tracking block; 17 new unit tests; 0 regressions. Sibling locus argument to Bug 4 C-narrow (S108).
3. **`21f14d3`** `docs(known-gaps): rotate Bug 2 entry — SHIPPED S109`
4. **`6d69534`** `feat(tailwind-arbitrary): S109 Bug 1 partial closure — ring-[length|color|var|keyword]` — ring family partial closure. Single-property box-shadow emit with kind-dispatch (length → currentColor; color/var/keyword → 3px default width). ring-offset + gradient still deferred (need preflight CSS infrastructure). 23 new tests; 0 regressions. 4 sibling tests updated.
5. **`3c1b897`** `docs(known-gaps): rotate Bug 1 entry — ring shipped; ring-offset + gradient preflight-blocked` — added a "preflight blocker" explainer.
6. **`3609985`** `feat(builtin-types): S109 tableFor v1.next item #6 — date + timestamp as first-class primitives` — `date`/`timestamp` formalized as `tPrimitive` in BUILTIN_TYPES; emit-table-for.ts + emit-schema-for.ts extended with `date` case.
7. **`1c4469c`** `docs(benchmarks): S109 refresh — bundle (21.5 KB total) + build (36.7 ms median)` — RESULTS.md refreshed. Bundle vs. Phase B: +5.8 KB JS gzip. Build vs. v0.3.0 STABLE: −44%. Stale-dist measurement artifact caught + fixed.
8. **`07904b9`** `fix(test): builtin-types-date-timestamp test was vacuous — compileScrml signature misuse` — **the S109 commit #6 test file was VACUOUS.** `compileScrml(filePath, opts)` with a string first-arg compiles NOTHING (`fileCount: 0, errors: []`) — every `expect(errors).toEqual([])` passed vacuously. Surfaced while writing the match-block-phase5 integration test. Fixed: canonical `compileScrml({ inputFiles, ... })` shape + `fileCount > 0` guard on every test + §4 schemaFor source corrected (needs `import { schemaFor } from 'scrml:data'`). date/timestamp feature itself VERIFIED correct via real compile.
9. **`2691b20`** `feat(match-block): S109 Phase 5 — wildcard `<_>` explicit render + full-pipeline integration gap fix` — **TWO things.** (a) Wildcard `<_>` explicit render: `emit-variant-guard.ts` gains optional `defaultArmTag`; the wildcard arm emits as the dispatcher's catch-all `else { ... }` branch. (b) **PRE-EXISTING INTEGRATION GAP FOUND + FIXED:** `collectMatchBlocks` + `findEngineVarForType` walked `fileAST.nodes` but the pipeline passes an outer wrapper with nodes under `fileAST.ast.nodes` → a REAL compile found 0 match-blocks → dispatcher NEVER emitted. **Match block-form had never worked end-to-end outside the S108 unit tests** (which call the helper with the bare AST). Fix mirrors emit-engine.ts's dual-shape handling. NEW `match-block-phase5-wildcard.test.js` (5 tests incl. 2 full-compile integration tests reading client JS off disk — the regression guard).
10. **`e8ba2f7`** `docs(known-gaps): match block-form — note S109 Phase 5 wildcard + integration gap fix`

## State at this update

- HEAD: `e8ba2f7`
- Working tree clean except `docs/m1-benchmark-results.md` (gitignored, written by bundle-size-benchmark.js)
- Pre-commit gate: **13,355 pass / 88 skip / 1 todo / 0 fail / 694 files / 44,883 expect** (latest)
- Delta from S108 close (13,304 / 690 / 44,794): **+51 pass / +4 files / +89 expect / 0 regressions**
- **Push pending** — user did not explicitly authorize push during the AFK session; surface this immediately when user returns
- Worktree list: main only (agent worktree cleaned at S109 OPEN)
- Hook gate: Configuration B (pre-commit + post-commit + pre-push all active)
- `scrml-support/docs/deep-dives/bug-4-docs-mode-escape-2026-05-19.md` STILL untracked locally at scrml-support — S108 deep-dive that appears never to have been committed; flagged for user decision

## Things S109 surfaced that the user should know

1. **Match block-form was NOT actually end-to-end functional** before S109 `2691b20`. The S107-S108 "shipped" framing was true for the unit-test surface but the full-pipeline path was broken (collectMatchBlocks node-walker bug). NOW genuinely works. The known-gaps.md "end-to-end functional" claim was overclaimed S107-S108 and is now corrected + true.
2. **A vacuous test shipped in S109 `3609985`** (builtin-types). Caught + fixed same session at `07904b9`. Root cause: `compileScrml` takes a single options object; a string first-arg is a silent no-op. Worth a grep across other test files for the same misuse pattern — DID NOT do that grep this session (flag for follow-up).
3. **Bundle grew +5.8 KB JS gzip** since the 2026-05-15 Phase B baseline (13.9 → 19.7 KB). Tracked to match-block runtime + Bug 5 P3 + ring + Bug 4 + formFor B5. Not a regression — real feature runtime. Documented honestly in RESULTS.md.

## Remaining S108 carry-forwards (NOT touched this AFK session)

### tableFor v1.next — 5 items remain (item #6 date/timestamp shipped S109)

| # | Item | Why deferred this session |
|---|---|---|
| 1 | §41.16.7 sort-state explicit decl | Type-system visibility refactor; medium scope |
| 2 | §41.16.8 SELECTABLE-CELL-WRONG-TYPE strict-mode | Requires threading `stateTypeRegistry` into `_processTableForNode`; structural change |
| 3 | §41.16.10 OQ-TF-7 positional column slots | New grammar shape; design-level |
| 4 | §17.4a for/else codegen | Pre-existing broader gap; not tableFor-specific |
| 5 | Inline event handler arrow-param | Rewriter bug; needs investigation |

### Match block-form Phase 5 — remaining (wildcard SHIPPED S109)

- Payload-binding typer scope (`<Ready(rows)> : doSomething(rows)` — `rows` not in typer scope inside arm body)
- Bare-variant inference in nested expression positions
- Browser test for runtime arm-swap on reactive change
- Samples + a dedicated integration-test file beyond the phase5-wildcard guard
- PRIMER §18 / match-block section refresh (PRIMER has no dedicated match-block walkthrough)

### Larger carry-forwards (need user direction / design)

- formFor v1.next B2 (registerRenderer) / B3 (`@label` annotation) / B4 (auto-recurse nested struct) — ~8-15h, each needs a design decision
- variantNames — next L22 family member; full 4-gate walk (sliver test + synonym-detection + asymmetric-forfeit-cost) required first
- Native parser M2 expression parser — ~2-4 sessions
- Self-host bootstrap broken-import — S102 carry; investigation-first
- Bug 1 ring-offset + gradient — blocked on preflight CSS emission infrastructure (a real new subsystem)

---

---

## Session-start state

- Working tree clean
- `handOffs/incoming/` empty
- `git worktree list` shows main only
- Hook gate: Configuration B (`.git/hooks/` has pre-commit + post-commit + pre-push + .bak files)
- pkg.json version `0.3.3` (unchanged — no release cut planned at OPEN)
- Tests at HEAD (per S108 close ledger; not re-baselined this session yet):
  - pre-commit subset: **13,304 pass / 88 skip / 1 todo / 0 fail / 690 files / 44,794 expect**
  - full `bun test compiler/tests/`: **16,147 pass / 169 skip / 1 todo / 0 fail / 723 files / 47,209 expect**
- **Maps watermark: `6616a69` — HEAD `df1211d` is ~23 commits ahead.** Mandatory refresh BEFORE any dev-agent dispatch this session.
- scrml-support: 1 untracked file (`docs/deep-dives/bug-4-docs-mode-escape-2026-05-19.md` from S108 — not committed; surface to user).

## Session-start checklist completed

- [x] Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL (886 lines)
- [x] Read `docs/PA-SCRML-PRIMER.md` (§1-§13.6 in full; §13.7-§15 spot-coverage)
- [x] Read `compiler/SPEC-INDEX.md` IN FULL — S108 SPEC changes noted (§4.17 amended Bug 4 cross-ref; §7.4.2 NEW Bug 5 P3; §26.4/§26.5 Tailwind full-fix expansion; §34 +1 row `W-TAILWIND-UNRECOGNIZED-CLASS`; §41.14.7 Codegen subsection for formFor B5)
- [x] Read `master-list.md` §0 LIVE DASHBOARD + §N open work + §M known bugs spot-read
- [x] Read `handOffs/hand-off-111.md` (S108 CLOSE)
- [x] Read last contentful user-voice entries (S100, S102, S103) — no NEW entries since S103
- [x] Hand-off rotated (S108 close → `handOffs/hand-off-111.md`)
- [x] This fresh `hand-off.md` created for S109
- [x] Git fetch + ahead-behind hygiene (both repos 0/0)
- [x] Worktrees + inbox verified clean
- [x] Hook gate verified Configuration B

## Open questions to surface immediately

1. **Next priority pick** — S108 close enumerated several mid-tier carry-forwards. Top candidates (PA recommendation order, subject to user direction):
   - **(a) Maps refresh** (light; ~5-15min PA-direct OR project-mapper agent) — prerequisite for any dev-agent dispatch this session
   - **(b) Bug 2 phantom E-SYNTAX-050 + 4-cascade** (MED-HI dogfood; needs bisecting reducer; ~2-4h) — last remaining HIGH/MED-HI dogfood bug
   - **(c) Bug 1 ring/gradient compound families** (medium; box-shadow stack trick + multi-utility coordination) — still-deferred Tailwind families
   - **(d) tableFor v1.next 6-item batch** (~6-10h aggregate) — sort-state explicit decl + SELECTABLE-CELL-WRONG-TYPE strict-mode + positional column slots + §17.4a for/else codegen + `date`/`timestamp` BUILTIN_TYPE + inline event handler arrow-param
   - **(e) formFor v1.next B2-B4** (~8-15h aggregate) — registerRenderer + `@label` annotation + auto-recurse nested struct
   - **(f) variantNames (next L22 family member)** — smallest primitive; full 4-gate walk first
   - **(g) Match block-form Phase 5 polish** (~6-10h aggregate) — samples + browser test + PRIMER §18 refresh + wildcard explicit render + payload-binding typer scope + bare-variant inference in nested expression positions
   - **(h) Native parser M2 expression parser** (~2-4 sessions per DD §D7)
   - **(i) Self-host bootstrap broken-import** (~2-4h; S102 carry; unaddressed S103-S108)
   - **(j) Build benchmarks refresh** (~30min-1h; 5+ days stale; last 2026-05-14 v0.3.0 STABLE)
2. **scrml-support untracked deep-dive** — `bug-4-docs-mode-escape-2026-05-19.md` exists locally but NOT committed at session start. Verify with user whether this should be committed (it was load-bearing for S108's Bug 4 C-narrow landing). Possibility: was committed in S108 and got lost, OR was the result of an agent-side write that PA never landed. Surface and clarify.

## Things S109 PA must NOT screw up (carry from S108)

- **Maps refresh BEFORE any dev-agent dispatch** — `6616a69` watermark vs HEAD `df1211d` is ~23 commits behind.
- **`?{` recognition is now Logic-context-only** — block-splitter.js comment block at line 1443 names SPEC §3.1 + §8.1 + the deep-dive path explicitly. Preserve the C-narrow gate if touching brace-context recognition.
- **`_scrml_label_for` is messages-chunk-gated** — typeof-guard in emit-form-for.ts is load-bearing for formFor in files without inline-override validators. Don't remove without preferred long-term fix (messages chunk unconditionally activates on formFor expansion) OR runtime-helper moved to always-present chunk.
- **Match block-form Phase 4 v1 limitations documented in module header** — read emit-match.ts module header before any S109 changes.
- **Tailwind ARBITRARY_PREFIX_MAP + VALID_MATH_FUNCTIONS are now the source of truth for FULL fix** — when adding new families update both. `ring-*` family in particular needs compound-multi-property emission (box-shadow stack).
- **Hook gate is Configuration B** — `--no-verify` is the S88 process-violation surface; never bypass without explicit authorization.
- **Bug 4 C-narrow has scope-expansion follow-ons** — 6 OQs surfaced in the deep-dive; Q-BUG4-OPEN-1 (extend gate to `!{`/`^{`/`_{`) + Q-BUG4-OPEN-5 (broad-C bare-`/` extension) are the load-bearing scope expansions. None block C-narrow; all deferred pending friction signal.

## Carry-forwards from S108 (no change since close)

- v1.0+ structural cleanup of browser-test effect-leak pattern (G1 close residue from S105)
- OQ-TF-11 sub-debate (if user contests MEDIUM verdict on row binding `:let` vs implicit `@row`)
- Puppeteer dep cleanup (Q-PW-PORT-OPEN-1 ratified DEFER; awaiting 1-2 release cycles post-S103 Playwright cutover)
- LEGACY `_scrml_subscribers` retirement (v0.4+; Q-RT3-SR-OPEN-3 ratified DEFER post-impl)
- Marketing-shaped (per pa.md Rule 1 — DEFER unless raised): formFor + schemaFor + tableFor combined sample app + scrml.dev refresh; v0.4 announce content; Bug 4 C-narrow + Bug 5 P3 + match block-form full Tier 1 closure narrative

## Tags

#session-109 #OPEN #single-machine #maps-stale #ready-for-direction
