---
status: current
last-reviewed: 2026-05-22
---

# Corpus Compilation + Runtime Sweep — PLAN

**Authored S120 (2026-05-22).** Not yet executed — this is the plan; the sweep
runs later, on the trigger below.

## Why

Two compounding problems:

1. **The ouroboros.** Broken artifacts accumulate in the corpus and get cited
   as truth — examples, samples, README blocks, kickstarter snippets. A wrong
   artifact becomes the basis for the next thing. (User concern, S86 / S88 /
   S115; restated S120.)
2. **Every gate is compile-only.** The README gate, the pre-commit hook, the
   examples — all check that source *compiles*, none check that the output
   *runs*. `scrml compile` can exit 0 and emit broken JavaScript.

S120 surfaced how wide that gap is. The README's full-stack hero compiled
clean and was pushed live — then failed in the browser (`?{}` SQL un-lowered
into the client bundle, `nodeId=-1`). Diagnosing it showed
`examples/03-contact-book.scrml` — the flagship full-stack example — also
fails at runtime (`loadContacts is not a function` — a server fn called in a
render loop, not awaited; 403 CSRF). The full-stack DB story has multiple
runtime bugs that no gate sees.

A large compile **+ runtime** sweep of the whole corpus is overdue.

## Timing — the trigger

Do **not** run the full sweep yet, and do **not** mass-fix corpus bugs yet.

The native front-end rebuild (charter B — replace block-splitter + Acorn with
the native parser) is near its tail. M5 landed S119 (`--parser=scrml-native`
routable, 949/1000 canary). M6 deletes Acorn + the block-splitter and makes the
native parser the sole front-end.

**The native parser is the basis we will be fixing upon.** Fixing corpus bugs
against the current BS+Acorn front-end risks wasted work — the native parser
may compile the same source differently. Per the user (S120): *"it would make
sense not to fix too much until we know what basis we are fixing upon."*

**Trigger:** the full sweep runs once the native front-end is the sole/default
front-end (M6 — or M5 once `--parser=scrml-native` is trustworthy enough to
sweep against). Until then:

- Note bugs; do not mass-fix.
- **Exception:** an acute, public-facing falsehood (e.g., the S120 README hero
  claiming a broken app "runs") is fixed immediately — honestly and minimally,
  README/doc-only, no compiler change.

## Scope

| Surface | Count | Notes |
|---|---|---|
| `examples/` | 27 single-file + `23-trucking-dispatch` + `22-multifile` | the highest-visibility corpus |
| `samples/compilation-tests/` | ~289 | compile-only is acceptable for most; spot-run the representative ones |
| README `​```scrml` blocks | 4 | already gated on compile; add runtime |
| `docs/articles/llm-kickstarter-v2-*.md` snippets | — | the dev-agent canon; high blast radius |
| `stdlib/*.scrml` | 16 | import-only — compile-check in an importing harness |

## Method — per artifact

1. **Compile** — capture errors + warnings, AND inspect the output bundle for
   the silent-failure tells: `nodeId=-1` / `sql-ref unresolved` / `? { … }`
   un-lowered SQL / empty (`~3-line`) client bundles / `please report`
   comments. A clean exit code is NOT sufficient.
2. **Run** — start a dev server, drive the page with Playwright: load, assert
   no `pageerror` / `console.error`, interact (submit forms, click buttons),
   assert the expected DOM change. This is the new axis the corpus has never
   had.
3. **Classify** each artifact:
   - `PASS` — compiles clean + runs clean.
   - `COMPILE-BROKEN` — error, or silent broken-output tell.
   - `RUNTIME-BROKEN` — compiles, breaks in the browser.
   - `CORPUS-STALE` — artifact uses outdated/invalid scrml (migration backlog,
     not a compiler bug).
4. **Triage** — separate **compiler bugs** (valid scrml → bad output) from
   **corpus-stale** (artifact's fault). The gauntlet-overseer distinction.

## The gate gap to close (deliverable, not optional)

The sweep is a snapshot; the gate is the ratchet. Add a **runtime smoke-test**:

- Extend `scripts/extract-readme-scrml.js` (README gate) — after compile, run
  the block headless and assert no JS errors.
- A corpus runtime harness — `examples/` driven through dev-server + Playwright
  in CI / pre-push.
- Consider a machine-verified-runtime tier alongside the user-verified
  `examples/VERIFIED.md`.

Without this, the ouroboros refills.

## Seed bug ledger (found S120 — to confirm against the native-parser basis)

1. `?{}` SQL with no `<db>` element → un-lowered into the client bundle,
   `nodeId=-1`, **compile exits 0**. Should be a clean `E-` error, not silent
   broken output.
2. `<entry>` compound-state element inside a `<db>` body → **empty output**
   (whole body silently dropped).
3. `E-PA-002` fires even when the source includes the `CREATE TABLE` statement
   the error message itself prescribes as the fix.
4. A `server function` called inside a render `for`-loop → `… is not a
   function or its return value is not iterable` at runtime (CPS/await of the
   server call not handled). — `examples/03-contact-book.scrml`.
5. `403 Forbidden` on the server-fn `fetch` (CSRF) — `examples/03` runtime.
6. Realtime `<channel>` server fn reading a channel cell (`@entries`) → the
   server handler reads `_scrml_body["entries"]` that the client never sends.
7. **Gate blind spot** — compile-only gates pass compile-but-broken-JS.
8. **Server-side stdlib scheme not resolved.** Server codegen
   (`compiler/src/codegen/emit-server.ts` — line 448 comment claims to mirror
   client handling) emits literal `import { … } from "scrml:fs"` (or any
   other `scrml:*` stdlib module) into the generated `app.server.js`. Node's
   resolver rejects the `scrml:` scheme at runtime → `Cannot find package
   'scrml:fs'` → server module fails to load entirely → server-fn endpoints
   return 404. `scrml compile` exits 0 with no warning. **Found S121 running
   `dashboard/app.scrml`** — the dashboard imports `readFileSync` /
   `writeFileSync` / `existsSync` from `scrml:fs`; HTML shell serves (1398
   bytes); every `data-scrml-logic` slot is unfillable; every button hits
   404. `emit-client.ts` lines 331, 994, 1522 have the scheme-resolution
   logic for client-side imports — server-side parity is the apparent fix
   (post-M6, per this PLAN's timing rule).

Bugs 1-7 are provisional: re-confirm each against the native-parser front-end
once it is the basis — some may change shape or vanish; new ones will surface.
Bug 8 is a server-codegen defect — independent of front-end basis; will
persist across M6.

9. **Client-side codegen — non-`async` function bodies call `async` server-fn
   wrappers without `await`.** Same bug class as Bug #4. The compiler-emitted
   `_scrml_fetch_<name>_<id>(...)` helpers are `async` (they `await fetch(...)`),
   but caller functions are emitted as plain (non-`async`) JS functions that
   invoke the helpers without `await`. Result: `const x = _scrml_fetch_foo()`
   binds `x` to a Promise; subsequent uses (`x.someField`, `x.slice(...)`,
   `for (const k in x)`) operate on the Promise object instead of the
   resolved value. Silent at compile time; surfaces as:
     - "doesn't work" with no visible error if the caller's broken state isn't
       reflected in DOM (e.g. `state[name]` reads undefined-via-Promise.name
       and the loop pushes nonsense)
     - Uncaught TypeError if a string method is called (`Promise.slice` is
       undefined → TypeError on call)
     - Click handlers that "won't click" — handler fires, body throws,
       browser swallows the rejection
   **Found S121** running `dashboard/app.scrml` for the first time end-to-end.
   `_scrml_loadStatuses_14`, `_scrml_refresh_16`, `_scrml_verify_17`,
   `_scrml_markVerified_15` all emit as non-`async`; all call
   `_scrml_fetch_*` helpers without `await`. The Refresh button's `onclick`
   handler fires `_scrml_refresh_16()` which calls `_scrml_fetch_readCurrent
   Head_13()` then `.slice(0, 8)` on the Promise → TypeError → handler
   silently fails. The "browser shows nothing but a button that won't click"
   is precisely this dynamic.
   **Narrow fix shape (likely):** in `compiler/src/codegen/emit-client.ts`,
   any function whose body calls an `_scrml_fetch_*` helper (or any other
   compiler-emitted `async` helper) gets emitted as `async function`, and
   the calls get `await`-prefixed. Cascades up the call graph (callers of
   the rewritten function need the same treatment). The body-split / CPS
   pass at codegen is the structurally-right place; the narrow fix is a
   simpler-but-bounded variant.

Bug 9 is a client-codegen defect — independent of front-end basis; will
persist across M6. Same shape as Bug #4 (server-fn called in render loop
without await); the two are likely closed by one codegen change.

## Corpus-stale ledger (S121 Wave 7 Unit D survey)

Two GAP-native-extra-block residual files surveyed at S121
(`docs/changes/m5-c2-gap-ledger/gap-neb-survey-s121-2026-05-22.md`):
both are corpus-stale, NOT compiler bugs. Native is correct per SPEC.
Defer corpus edits to the M6-gated sweep (this PLAN's timing rule).

C1. `samples/gauntlet-r11-zig-buildconfig.scrml` — 30+ retired trailing-
slash closer forms per S80 Appendix E `</>` migration. The file pre-dates
the migration. **Fix at sweep time:** apply the `</>` → explicit-closer
migration mechanically (S80's migration tool may apply directly; verify).

C2. `samples/compilation-tests/tailwind-prose-coverage.scrml` — uses
`<code>x</>` against SPEC §4.17 line 1068: `</>` is plain text inside
raw-content elements; only `</code>` closes a `<code>` element. **Fix at
sweep time:** rewrite every `<code>x</>` to `<code>x</code>` (and same
for `<pre>` if any) — trivial mechanical edit.

C3. `compiler/self-host/bs.scrml` — 13 occurrences of literal `null`
keyword. Native parser correctly rejects per the S89 axiom ("null does
NOT EXIST IN SCRML! and never will!"); live's Acorn-based parser tolerates
it through JS-grammar inheritance. Discovered at S121 Wave 7 Unit C as
the actual cause of bs.scrml's DIFF-hoist-count divergence — the native
parse-expr.js KwNull rejection cascades through panic-mode resync, which
walks into the `type` parameter name in `function pushBraceContext(type, ...)`
and triggers a spurious typeDecl recovery. Fix at sweep time: migrate
every `null` → `not` per the S89 axiom + S89 wave 7.A precedent. Multi-line
ternary cascades (e.g. `(parent != null) ? a : b`) will resolve cleanly
once `null` is gone. **Side-task surfaced (separate dispatch):** parse-expr.js
emits generic `E-EXPR-UNEXPECTED` on KwNull; a normative `E-NULL-FORBIDDEN`
diagnostic + §34 row would be a strictly better adopter experience.
Sequenced AFTER M6 + corpus migration so the diagnostic doesn't fire on
in-tree self-host source still carrying `null`.

## Deliverables

1. A sweep report — full compile + runtime matrix per artifact.
2. A bug ledger — compiler bugs vs corpus-stale, prioritized.
3. The runtime gate upgrade (above).
4. A corpus-fix campaign decomposition — dispatched against the native-parser
   basis.
