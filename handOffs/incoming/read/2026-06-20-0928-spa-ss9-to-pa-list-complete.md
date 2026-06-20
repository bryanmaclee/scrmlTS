# sPA ss9 (server-authority-keyword) → PA — list complete (re-integration request)

**needs: action** · 2026-06-20 09:28 · from sPA-ss9 · to PA inbox

## TL;DR
List `ss9 server-authority-keyword` DISPOSITIONED. **1 item LANDED on `spa/ss9`, 4 PARKED (escalates).** Branch tip `03d5d938`, base `85ff…`→`85d9e958`, **2 ahead / 0 behind origin/main** — clean linear, ready to re-integrate. The list is escalate-dominated: the `server`-keyword arc is essentially COMPLETE (S180 read-surface scrub + S181 teaching-strings), so only one mechanical residual remained landable; the rest is design-track / project-scale.

## Branch to re-integrate
**`spa/ss9`** @ `03d5d938`
- `4a703df4` — item 1 (emit-logic emitted-JS comment reword)
- `03d5d938` — list-disposition bookkeeping (statuses + ss9.progress.md)
2 ahead / 0 behind origin/main → `git merge --ff-only spa/ss9` is clean, OR file-delta per your single-writer discipline. Worktree: `../scrml-spa-ss9` (sibling; outside `.claude/worktrees/`).

## LANDED (1)

### item 1 — `g-server-keyword-full-migration` @ `4a703df4`
The bulk arc is DONE (S180 read-surfaces = 0 non-SSE `server function`; S181 teaching-strings reworded). I landed the ONE remaining mechanical residual: the **2 emitted-JS comments** the S181 agent named — `emit-logic.ts:1699` (let SQL-init) + `:1805` (const SQL-init) emit `// … use a server function.` into adopter output. Reworded → `use a server-side function.` matching the S181 "server-side function / inferred-boundary" phrasing. This closes the "2 emitted-JS comments" deferred sub-residual of **`g-server-keyword-error-msg`** (RESOLVED S181).
- Emitted-comment text only; no logic change. **No test coupling** — `reactive-decl-sql-chained-call.test.js` asserts the `// SQL-init for @X` PREFIX (unchanged).
- **Verify:** residual emitted `server function.` = 0; new string ×2; targeted unit `reactive-decl-sql-chained-call.test.js` **21/21**; the bookkeeping commit ran the FULL gate clean (**17427 tests, 0 fail, 1 todo**).
- **known-gaps action (suggested):** the `g-server-keyword-error-msg` "2 emitted-JS comments" sub-residual is now closed; its OTHER deferred half (SPEC §20.5 example-input) remains open — see flag below.

**FLAG — sub-residual NOT mechanical, left for your judgment:** the §20.5 SPEC example-input blocks (`SPEC.md:14060` `server function getProfile`, `:14098` `checkAuth`) still teach the deprecated form. I did **not** migrate them: those bodies escalate ONLY via `session` access, so whether dropping `server` is safe turns on **whether `session`-access is a §12.2 escalation trigger**. If it is NOT, these examples NEED `server` (or rewrite to `server fn`) — i.e. a correctly-left carve-out like the session-only / SSE cases S180 preserved, not a scrub. That's an escalation-semantics judgment (exactly why the S181 agent deferred it), not a sPA reword. Recommend a one-line ruling: migrate vs leave-as-carve-out.

## PARKED — escalates (4)

### item 2 — `g-sse-server-keyword-deferred` → design-track
Design-deferred, NOT sPA-executable. DD run S181 ruled **KEEP**; both re-trigger conditions UNMET — giti-025/026 (SSE generator-params-unwired / client-reactive-binding-dead) remain OPEN → SSE wiring not confirmed end-to-end; zero `.scrml` corpus pressure. KEEP stands as the standing disposition. No code change.

### item 3 — `g-sse-server-keyword` → design-track (near-dup of #2)
Same KEEP disposition. **Doc-correction for you:** the list/known-gaps cite `isSSE = isServer && isGenerator` at `route-inference.ts:3226` — that line is **STALE**. Verified live: `isSSE` is at **`route-inference.ts:3563`** (`isServer && (record.fnNode).isGenerator === true`); `:3226` is now an S180-D3.1 lift-suppression comment region. The stale ref lives in **`docs/known-gaps.md:82`** (PA-owned durable doc) — flagged for your correction; nothing landable in code.

### item 4 — `g-tier1-ssr-prerender` → PA/dPA architecture
Exceeds a bounded sPA dispatch. Already SPLIT per the S196 STOP/SPLIT gate; **"no existing SSR-pre-render path to mirror"** → the FIRST step is an architecture/design pass (how scrml SSR-renders markup with loaded rows + flash-free hydration adopting pre-rendered DOM), which is your/dPA territory (the sPA is not a deliberator). §52.8 names BOTH tiers → a unified server-authoritative-SSR pass covers Tier-1+Tier-2. NOT a blocker (client-side load works; brief first-paint placeholder flash). Recommend route to a DD/architecture pass → then a multi-dispatch build. `W-AUTH-002` is its tracking warning (obsolete on land).

### item 5 — `flux-mmorpg-build` → PA project / Bucket-B
Project-scale, not a list-item — a shared server-authoritative MMORPG (ASCII + Three.js-FPS + puzzle-portal) is a multi-session build (the list itself says "arguably Bucket-B"). The original **§52 server-sync blocker framing is STALE** (S194 auto-persist retraction → persist is explicit `?{}`), but the build is partly gated on item 4's server-authoritative-SSR infra. Recommend you own as a project / move to Bucket-B.

## Operational note (worktree-recipe gap — actionable for the contract)
The non-blocking **post-commit** hook runs the FULL `compiler/tests/` incl. browser; `browser-conditionals.test.js` failed 11/11 in this FRESH worktree, **purely** because it reads built samples from the **gitignored** `samples/compilation-tests/dist/` which `git worktree add` does NOT check out. Confirmed: present on main (passes 11/11), absent in worktree → "sample loads" fails at 1ms. **Not a regression** (the blocking pre-commit gate excludes browser; the full 17427-test gate passed). Suggest the `spa-scrml.md` §Worktree recipe symlink `samples/compilation-tests/dist` from main (alongside node_modules) so post-commit / browser-verify on sPA branches doesn't throw spurious failures.

## End-state
All 5 items dispositioned (1 landed `4a703df4`, 4 parked). Branch `spa/ss9` @ `03d5d938`, clean, 2 ahead / 0 behind. Per `spa-scrml.md` §Lifecycle the PA owns re-integration + all durable bookkeeping (known-gaps marks, master-list, changelog, push, worktree cleanup). Instance can be closed.
