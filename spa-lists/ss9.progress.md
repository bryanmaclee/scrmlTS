# ss9 — server-authority-keyword · progress

Branch `spa/ss9` (base `85d9e958` = origin/main @ S209). Append-only.

## 2026-06-20 (S209) — autonomous run, list dispositioned

- **Boot:** worktree `../scrml-spa-ss9` created from origin/main (`git worktree add -b spa/ss9`); node_modules symlinked from main. Warmed coreFiles + footprints (known-gaps §S175/§g-server-keyword-* + §g-tier1-ssr; route-inference.ts isSSE; emit-logic.ts; SPEC §20.5).
- **Finding (cross-cutting):** the `server`-keyword arc is essentially COMPLETE — read-surfaces scrubbed S180, teaching-strings reworded S181. ss9 is therefore an escalate-dominated list: 1 trivial landing + 4 design/project parks.

### item 1 — g-server-keyword-full-migration → LANDED `4a703df4`
- Reworded the 2 **emitted-JS** comments in `emit-logic.ts` (:1699 let-SQL-init, :1805 const-SQL-init): `use a server function.` → `use a server-side function.` — the deferred sub-residual of `g-server-keyword-error-msg` (RESOLVED S181). Matches the S181 teaching-string rework ("server-side function" / inferred-boundary phrasing).
- Emitted-comment text only; no logic change. **No test coupling** — `reactive-decl-sql-chained-call.test.js` asserts the `// SQL-init for @X` PREFIX (unchanged).
- Verify: residual emitted `server function.` = 0; new string present 2×; targeted unit test **21/21 pass**. Blocking pre-commit gate (unit+integration+conformance) clean.
- **Sub-residual flagged to PA (NOT mechanical):** SPEC §20.5 example-input (`server function getProfile/checkAuth`, SPEC.md:14060/14098) escalates ONLY via `session` access → migrating turns on whether `session`-access is a §12.2 trigger (escalation-semantics judgment; may be a correctly-left carve-out like session-only/SSE). Out of bounded-reword scope by design.

### item 2 — g-sse-server-keyword-deferred → PARKED (PA design-track)
- Design-deferred. DD run S181 ruled KEEP; both re-trigger conditions UNMET (giti-025/026 SSE-wiring OPEN + zero `.scrml` corpus pressure). No code change.

### item 3 — g-sse-server-keyword → PARKED (PA design-track)
- Near-dup of #2; same KEEP disposition. Verified live `isSSE` is at `route-inference.ts:3563` (`isServer && isGenerator===true`); `:3226` is now an S180-D3.1 comment region. The stale `:3226` hint lives in **known-gaps.md:82** (PA-owned durable doc) → flagged for PA correction. Nothing landable in code.

### item 4 — g-tier1-ssr-prerender → PARKED/ESCALATE (PA/dPA — architecture)
- Substantial new SSR-pre-render subsystem; already SPLIT per S196 STOP/SPLIT gate; "no path to mirror" → needs an architecture/design pass FIRST (PA/dPA territory). §52.8 covers BOTH tiers → a unified server-authoritative-SSR pass. NOT a blocker. Exceeds a bounded sPA dispatch.

### item 5 — flux-mmorpg-build → PARKED/ESCALATE (PA — project-scale)
- Project-scale MMORPG dogfood (arguably Bucket-B). Original §52-server-sync blocker framing STALE (S194 auto-persist retraction → explicit `?{}`); partly gated on #4's server-authoritative-SSR infra. Recommend PA own as a project / move to Bucket-B.

## Operational note for the PA (worktree-recipe gap)
The non-blocking **post-commit** hook runs the FULL `compiler/tests/` incl. browser tests; `browser-conditionals.test.js` failed 11/11 in this fresh worktree because it reads built samples from the **gitignored** `samples/compilation-tests/dist/` which `git worktree add` does NOT check out. Confirmed: present on main (passes 11/11), absent in worktree. **Not a regression** — a worktree-provisioning gap. The `spa-scrml.md` §Worktree recipe symlinks node_modules but not the built sample dist; consider symlinking `samples/compilation-tests/dist` from main (like node_modules) so post-commit/browser-verify on sPA branches is clean.

## End-state
All 5 items dispositioned: 1 landed-on-branch (`4a703df4`), 4 parked. Branch tip `4a703df4`, clean, 1 commit ahead of origin/main. Re-integration message sent to `scrml/handOffs/incoming/`.
