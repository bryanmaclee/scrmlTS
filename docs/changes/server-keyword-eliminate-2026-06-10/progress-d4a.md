# D4a progress — eliminate `server function` from examples/

Append-only. Timestamped.

## 2026-06-11 — startup
- Worktree verified: pwd starts with .claude/worktrees/agent- ; toplevel matches; tree clean.
- `git merge origin/main` → Already up to date (HEAD e1d4f88c = D1+D2+D3 landed).
- bun install OK; bun run pretest OK (13 samples compiled).
- BASELINE: `bun test compiler/tests/` = 23809 pass / 221 skip / 1 todo / 0 fail (24031 across 970 files).
  Pre-commit gate subset (unit+integration+conformance) = 16582 pass / 0 fail.
  Note: an earlier `bun run test` showed 2 fail (browser-test timing flake); a clean re-run = 0 fail.
- Maps read: primary.map.md (full). Task shape = corpus migration (scrml-write + CLI run).
- Briefs read: kickstarter v2 (canonical shape, fn-forms §3.3, http/auth/crypto catalog §9, channel recipe §11.3); anti-patterns next.
- SCOPE.md + D4-INVENTORY.md read. examples/ sites = table rows 1-8 (in scope). samples = D4b, docs = D4c (out of scope).

## Next
- Read anti-patterns brief.
- Dry-run migrate --fix over examples/. Report per-migration breakdown.
- Add 2 real bodies (09 submit, 19 mintTicket).
- Apply migrate --fix. Per-file compile-verify + no-client-flip.
- Grep gates + R26 + full suite.

## 2026-06-11 — dry-run + critical scope finding

### Dry-run per-migration breakdown (examples/, BEFORE adding bodies)
`bun compiler/bin/scrml.js migrate examples/ --fix --dry-run`:
  64 files scanned, 7 would change:
    <machine> migrations: 2     (NON-SERVER — comment-text `<machine>`→`<engine>` in 23/pages/driver/hos.scrml; FLAGGED)
    arm-arrow `:>` migrations: 8 (NON-SERVER — `=>`→`:>` in 14-mario-state-machine.scrml match arms; FLAGGED)
    `server` keyword strips: 5  (15-channel-chat postMessage + 4× 23 channel publishers)
  57 unchanged.

### CRITICAL: Migration 4 reaches only 5 of the 12 example server-function decls. TWO compiler-source gaps block the rest.
Full per-site truth table (verified by per-file compile):
| site | body | W-DEPRECATED fires | Migration 4 strips |
| 03 loadContacts / 07 fetchUsers / 08 loadMessages / 17 listNotes | `lift ?{}.all()` | NO | NO |
| 15 postMessage + 4× 23 channel publishers | channel cell-write | YES | YES |
| 20 handle | reserved name (T8) | YES | NO |
| 09 submit / 19 mintTicket | trigger-less stub | NO | NO (need body) |

**Gap A (W-DEPRECATED lift-suppression — route-inference.ts:3172):** S93 added `!hasLiftInFunctionBody` to suppress W-DEPRECATED on `lift`-bearing functions, on the premise that stripping `server` would fire E-SYNTAX-002 (lift illegal in plain `function`). EMPIRICALLY FALSE on current main: a plain `function loadContacts(){ lift ?{}.all() }` compiles CLEAN, body stays in *.server.js, NO client flip. So the suppression is stale/over-conservative — it blocks Migration 4 from stripping the 4 SQL-lift sites that are safe to strip.

**Gap B (handle span off-by-2 — D2/D3):** the W-DEPRECATED-SERVER-MODIFIER span for `handle` starts at byte 1653 = `"rver function handle..."` (2 bytes into `server`). The span-strip's `readWordAt(span.start)` reads `rver`, not `server`, so it skips. (Channel publishers' spans start cleanly at `server`.) Manual strip of `handle` is SAFE — verified body stays in *.server.js, NOT *.client.js.

Both gaps are COMPILER-SOURCE (D2/D3 territory), OUT of D4a (corpus-only) lane. Surfacing to PA. Will do the in-scope work I can (add 2 bodies, apply Migration 4 for the 7 reachable) and report residual 5 as blocked-on-compiler-fix unless PA authorizes a corpus-side manual strip.

## 2026-06-11 — 2 bodies added

### 19-lin-token mintTicket (commit c22ffd42)
- Brief suggested `scrml:crypto.generateToken` + `?{}` store. Implemented: wrapped logic+markup in `<db src="tickets.db">`, added `<program db="tickets.db">` (idempotency store), `import { generateToken } from 'scrml:crypto'`, mintTicket now: secure token via generateToken(16) + idempotent `?{}` upsert (CREATE TABLE IF NOT EXISTS tickets + INSERT ... ON CONFLICT DO NOTHING). Dropped the obsolete `.idempotent()` workaround (real persist is intrinsic-monotone; Date.now() gone).
- Escalates server via §12 T1 (`?{}` SQL). VERIFIED: INSERT in *.server.js, NOT *.client.js. mintTicket is a client fetch-stub. `server function` count = 0.
- Minor residual: `generateToken` import appears in client.js (dead import, 0 call sites, no `tk_`/CREATE/INSERT) — harmless tree-shaking miss (browser-safe crypto helper, no secret). Pre-existing codegen behavior (import-referenced-only-in-escalated-fn not pruned); OUT of D4a scope.
- Gotchas hit: `default(CURRENT_TIMESTAMP)` (scrml schema-DSL syntax) is INVALID in raw `?{}` SQL → E-PA-003 "incomplete input"; used `DEFAULT CURRENT_TIMESTAMP`. E-CPS-NONIDEM-NO-STORAGE resolved by `<program db=>` providing the default shadow-table idempotency backend.

### 09-error-handling submit (commit 9d41361f)
- Brief's FIRST suggestion (`scrml:http` POST) does NOT escalate — http/fetch is client-capable, §12 keeps it CLIENT-side (verified: api.example.com URL landed in client.js). Used the brief's SECOND option: `?{}` INSERT into an outbox table.
- Implemented: `<program db="contact.db">` + `<db src tables="contact_messages">`, submit now: CREATE TABLE IF NOT EXISTS contact_messages + INSERT; zero-row insert → `fail .SubmitFailed(...)` (SubmitFailed now REACHABLE — error-handling narrative strengthened). Preserved type ContactError + renders clauses + validate() + <errorBoundary> + handleSubmit !{} arms.
- Escalates server via §12 T1. VERIFIED: INSERT in *.server.js, NOT *.client.js. submit is a fetch-stub. `server function` count = 0.

## Next
- Apply `migrate --fix` over examples/ → strips 5 channel publishers (+ 14-mario arm-arrows + 23 hos.scrml <machine>-in-comment). handle + 4 SQL-lift sites will NOT strip (Gaps A+B) — surface.

## 2026-06-11 — migrate run + residual decision

### migrate --fix applied (commit 2bf78cde)
- 7 files would-change; APPLIED 6 (reverted hos.scrml):
  - 5 server strips: 15-channel-chat postMessage + 4× 23 channel publishers (all T7, no client flip — broadcast/__sync stays server.js).
  - 8 arm-arrow `:>`: 14-mario-state-machine derived=match arms (§18.2/S172 canonicalization, in scope).
  - REVERTED: 23/pages/driver/hos.scrml — Migration 2 (`<machine>`→`<engine>`) rewrote a comment that DELIBERATELY teaches "legacy `<machine>` deprecated alias", turning it into the nonsensical "legacy `<engine>` deprecated alias". Damaged teaching prose; `<machine>`-migration is not D4a remit. Reverted.
- COUPLED test fix: compiler/tests/integration/trucking-dispatch-smoke-integration.test.js — D2 baseline expected W-DEPRECATED-SERVER-MODIFIER=19 (the 4 publishers × CHX-inline re-analysis) "pending D4 migration". My strip removed all 19 fires → baseline updated to 0 (code removed from dict; aggregate 92→73). D2's own comment named this as D4 backlog. Committed together (coupled code+test).

### RESIDUAL 5 server-function decls — Migration 4 structurally cannot reach them (Gaps A+B). All 5 PROVEN strip-safe.
| site | gap | strip-safe proof |
| 03 loadContacts / 07 fetchUsers / 08 loadMessages / 17 listNotes | Gap A (W-DEPRECATED lift-suppression) | compile 0 errors, SQL in *.server.js, NO client flip |
| 20 handle | Gap B (W-DEPRECATED span off-by-2) | compile 0 errors, X-Request-Id in *.server.js, NOT *.client.js |

### DECISION (Rule 3 fork surfaced): manual-strip the 5 vs leave-blocked.
Chose MANUAL STRIP. Rationale: the brief's PRIMARY GOAL is "examples → ZERO non-SSE server function DECLARATIONS" (hard gate) + ruling 3 "eliminate BOTH fully... disappears completely". The manual span-strip is the EXACT transformation Migration 4 performs; the tool's diagnostic-driver has two verified bugs (Gaps A+B) that prevent it reaching these 5. All 5 strips are proven safe (no client flip, compile clean). Leaving them half-migrated contradicts user-ratified S180 intent. Gaps A+B surfaced as DEFERRED for D2/D3 to fix the TOOL (else D4b samples hit the same wall — many more SQL-lift + handle sites there).

## 2026-06-11 — completion

### Residual 5 manual-stripped (commit 76afef85)
- 03 loadContacts / 07 fetchUsers / 08 loadMessages / 17 listNotes / 20 handle → all `server function` → `function`. Each verified post-strip: compile 0 errors, SQL/handle body in *.server.js NOT *.client.js (function-name in client is only the fetch-stub, not the body).

### Decl-form prose updated (commit 8bd1b083)
- 20-middleware:7 "Escape-hatch tier — `server function handle(request, resolve)`" → "the reserved `handle(request, resolve)` function"
- 20-middleware:25 "The `server function handle()` body" → "The `handle()` body"
- 15-channel-chat:32 "`postMessage` server function declared" → "the `postMessage` function declared"
- LEFT 9 prose mentions (generic-English "server functions" = server-placed, + accurate "modifier dropped" migration notes in login/register/seeds). These are NOT decl-form; erasing legitimate English would damage teaching. SURFACED: brief's literal grep gate `grep -rE 'server function[^*]'` conflates decl-form with English prose; the stated GOAL ("ZERO non-SSE server function DECLARATIONS") is met (0 decls).

### Coupled test fixes
- trucking-dispatch-smoke-integration.test.js (commit 2bf78cde): W-DEPRECATED-SERVER-MODIFIER baseline 19→0 (removed; aggregate 92→73) — D2 named this as D4 backlog.
- parser-conformance-within-node-allowlist.json (commit 8c61cae5): 09/19 native shadow-divergence baselines raised (new <db>/?{}/import constructs); default pipeline unaffected.

### GATES (all pass)
- Gate 1: `grep -rnE '^\s*server function [A-Za-z_]...\(' examples` (decls) = 0. ✓
- Gate 2: `grep -rE 'server fn\b' examples | grep -v /dist/` = 9 (untouched, all prose). ✓
- Gate 3: `server function*` SSE in examples = 0 (untouched). ✓
- R26: 23 flagship (app.scrml) + 09 + 19 all compile 0 errors. ✓
- Full suite: 23809 pass / 221 skip / 1 todo / 0 fail (24031 across 970 files) = baseline pass count, 0 new fails. ✓
- No-client-flip: mintTicket(19) INSERT, channel(15) broadcast, handle(20) X-Request-Id — all server.js, NONE client.js. ✓

### DEFERRED (surfaced for D2/D3 — the TOOL gaps that forced 5 manual strips)
- Gap A: route-inference.ts:3172 `!hasLiftInFunctionBody` suppresses W-DEPRECATED-SERVER-MODIFIER on `lift`-bearing functions (S93 premise: lift illegal in plain `function` → E-SYNTAX-002). EMPIRICALLY STALE on current main — plain `function f(){ lift ?{}.all() }` compiles clean. Blocks Migration 4 from the 4 SQL-lift class. D4b samples have MANY more such sites. FIX: re-verify the E-SYNTAX-002 premise; if lift is now legal in escalated plain `function`, remove/narrow the lift-suppression so the lint (and Migration 4) reach SQL-lift server-functions.
- Gap B: the W-DEPRECATED-SERVER-MODIFIER span for the reserved `handle` is off-by-2 (starts at "rver function handle...", byte+2 into `server`), so Migration 4's span-strip readWordAt reads "rver" not "server" and skips. handle's fnNode.span anchor (the isHandleEscapeHatch path) is mis-set vs channel publishers (clean at `server`). FIX in D2/D3: anchor handle's W-DEPRECATED span at the decl start (the `server`/`function` keyword), OR make Migration 4's readWordAt tolerant of a mid-keyword anchor.
