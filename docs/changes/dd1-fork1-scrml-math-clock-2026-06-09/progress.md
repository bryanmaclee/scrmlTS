# DD1 Fork 1 — scrml:math (1A) + scrml:time.now() (1C) — progress

change-id: dd1-fork1-scrml-math-clock-2026-06-09
baseline HEAD: 46cffc83
worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ae922cf929160a698

## 2026-06-09 — Startup verification (PASS)
- pwd = worktree-absolute under .claude/worktrees/agent-ae922cf929160a698 — OK
- git rev-parse --show-toplevel == WORKTREE_ROOT — OK
- git status --short clean — OK
- bun install — OK (204 packages)
- bun run pretest — OK (13 samples compiled)
- baseline `bun test compiler/tests/` — deterministic run: 23601 pass / 0 fail / 220 skip / 1 todo, exit 0.
  (First run showed "2 fail" due to FLAKY network tests — ECONNREFUSED; clean re-run = 0 fail.
   Treating baseline as 0 fail per the brief contract.)

## 2026-06-09 — Phase 0 survey (REQUIRED — the two load-bearing mechanisms)

### Stdlib module pattern (confirmed)
- `stdlib/<name>/index.scrml` (scrml-facing `<program>${ export function ... }` + `~{ ... }` test block)
  + `compiler/runtime/stdlib/<name>.js` (hand-written ES-module shim — the ONE sanctioned host touch).
- `scrml:NAME` resolves to `STDLIB_ROOT/<name>/index.scrml` (module-resolver.js:735-742).
- Shim discovered at `STDLIB_RUNTIME_DIR/<name>.js`; absent → W-STDLIB-SHIM-MISSING (api.js:373). BOTH files mandatory.
- NO dist/ build step for math/time — only stdlib/compiler/ has a dist (self-host, out of scope).
  format/time ship index.scrml + shim only. math mirrors that: 2 files.

### 1A — scrml:math fn-pure-callability (LOAD-BEARING #1) — RESOLVED
- E-FN-003 (fn body calls a `function` callee, type-system.ts:17373) fires ONLY when the callee
  name is in `nonPureFnNames`. `nonPureFnNames` is populated ONLY from LOCAL `function-decl` nodes
  in the importing file (type-system.ts:6472-6473). IMPORTED stdlib `function`s are NEVER added.
- Therefore an imported stdlib `function` (format/regex/crypto-hash style) is ALREADY freely callable
  inside a pure `fn` body — E-FN-003 does not fire on imports. VERIFIED empirically:
  `import { capitalize } from 'scrml:format'; fn greet(n){ return capitalize(n) }` compiles exit 0,
  zero E-FN-003/E-FN-004.
- MECHANISM CHOSEN: scrml:math members are plain `export function` (matching format/regex exactly).
  No `fn`/`pure function` declaration and NO purity allowlist needed — imports are fn-callable by
  construction. This matches how the rest of the pure stdlib (format/regex/crypto-hash) is handled.

### 1C — E-FN-004 imported `now` gate (LOAD-BEARING #2) — RESOLVED
- E-FN-004 (non-det, type-system.ts:17393) is a TEXT `.includes()` check against NON_DET_CALLS
  member-expression strings ("Date.now", "Math.random", ...). A bare `now()` does NOT match — so
  appending "now" to NON_DET_CALLS would FALSE-FIRE on any user identifier `now`.
- MECHANISM CHOSEN: mirror the existing `scrml:data parseVariant` import-binding precedent
  (type-system.ts:6537-6565 `collectParseVariantImports`). Collect local names bound to `now` from
  `import { now } from 'scrml:time'` (n.kind === "import-decl" && n.source === "scrml:time"), thread
  the set into checkFnBodyProhibitions, and in the E-FN-004 walk fire when a call-identifier matches
  a `now`-from-`scrml:time` local. Binding-aware → a user's own `function now(){}` is NOT in the set
  → no false fire. No bare-string append to NON_DET_CALLS.

### SPEC §41 catalog format (confirmed)
- §41.4 lists scrml: protocol; §41.5 says the exact catalog is in the release manifest, not spec.
  §41.13-41.17 are detailed per-member subsections (scrml:data members + scrml:compiler).
- PLAN: add §41.18 (scrml:math catalog) + §41.19 (scrml:time.now() capability note) mirroring §41.17.
- No new §34 code needed for 1C — reuse E-FN-004 (binding-aware extension, same code/message family).

### Map currency
- primary.map.md watermark 049954e0; HEAD 46cffc83 ahead by S176. Map content used as starting
  hypothesis; all line numbers verified by grep. Line drift: E-FN-004 NON_DET_CALLS at 16947,
  E-FN-003/004 heuristic at 17373/17393, nonPureFnNames at 6260/6472, parseVariant import precedent
  at 6537. type-system.ts ~19,200L.

## 2026-06-09 — Phase 1 (scrml:math module + tests) — DONE
- NEW stdlib/math/index.scrml (214L): export function round/floor/ceil/abs/min/max/clamp/
  parseInt/parseFloat/toNumber/isNaN + `~{}` test block. min/max VARIADIC (...values) to mirror
  Math.min/max scalar+spread corpus shapes. parseInt radix-explicit (default 10). clamp ADDED
  (brief surface + the data.js de-leak target). Plain `export function` — fn-callable as imports.
- NEW compiler/runtime/stdlib/math.js (shim): byte-faithful mirror; sanctioned Math.*/Number.* touch.
  node --check OK.
- NEW compiler/tests/unit/stdlib-math.test.js (28 tests): §A behavioral against the REAL shim
  (M1-M25), §B compile-level — round() in pure `fn` clean no E-FN-003/004 (M26), clamp() in
  `function` (M27), shim rewrite scrml:math→./_scrml/math.js + W-STDLIB-SHIM-MISSING absent (M28).
- stdlib-shim-resolution.test.js: added {math, round} to NEW_SHIM_MANIFEST (§1 per-shim resolution).
- ALL 28 math tests pass. The "statement boundary not detected" warning on the `~{}` block is the
  SAME pre-existing tokenizer artifact format/index.scrml + time/index.scrml emit (verified) — not
  introduced here.

## 2026-06-09 — Phase 2 (scrml:time.now() + E-FN-004 capability gate + tests) — DONE
- stdlib/time/index.scrml: `export function now() { return Date.now() }` added as the FIRST export,
  with a capability-scoped doc comment (non-det; E-FN-004 in fn).
- compiler/runtime/stdlib/time.js: `export function now()` added + surface-list comment. node --check OK.
- type-system.ts (annotateNodes): NEW `collectNowFromScrmlTime(_allTopNodes)` (mirrors the
  parseVariant-from-scrml:data precedent) collects local names bound to `now` from
  `import ... 'scrml:time'` (handles aliasing — keys on spec.imported==="now", adds spec.local).
  Threaded as 8th arg into checkFnBodyProhibitions (signature + both call sites 7309/7548).
  E-FN-004 firing leg added: a bare call (CALL_RE, skips `.now(` member access) to a
  nowFromScrmlTime local fires E-FN-004 with a clear "call from function/server function" message.
- NEW compiler/tests/unit/stdlib-time-now-capability.test.js (8 tests):
  N1 server-fn OK · N2 function OK · N3 fn → E-FN-004 (message checks) · N3b uniformity-with-Date.now
  in `pure function` · N4 user `function now()` NOT falsely gated · N5 aliased `now as currentTime`
  fires on alias · N6 other scrml:time import (formatDate) in fn NOT gated · N7 shim returns number.
- ALL 8 pass. CLI end-to-end verified: server fn emits now()→./_scrml/time.js; fn fires E-FN-004.

### DEFERRED (surfaced, NOT in scope)
- `pure function` (fnKind="function" + isPure=true) purity-enforcement gap: the §48 fn-body
  prohibition walker (E-FN-001..E-FN-005, INCL. the host NON_DET_CALLS Date.now/Math.random gate)
  fires for the canonical `fn` form ONLY — it does NOT run on `pure function` bodies today. This is a
  PRE-EXISTING, UNIFORM gap (Date.now() in a `pure function` is equally un-gated). The now() gate is
  deliberately wired to that same surface — it does NOT single out now() to be stricter than the host
  non-det calls (cohesion). Closing the `pure function` gap (for the WHOLE §48 prohibition set, not
  just now()) is the right follow-on; pinned by test N3b's uniformity assertion. Out of scope here.

## 2026-06-09 — Phase 3 (stdlib-ouroboros self-fix) — PARTIAL (time.js DONE; data.js infra-blocked)

### CRITICAL Phase-0-class finding (empirically proven) — the cross-shim import IS infra-blocked
The brief's "byte-identical clean substitution via cross-shim import" assumption is empirically FALSE
under the current bundler/inliner. Two independent blockers, both proven by probe:
  1. CLIENT (data.js): data.js is one of the 4 statically client-inlined chunks
     (runtime-template.js `_loadStdlibChunk`: auth/crypto/data/host). The inliner STRIPS every
     top-level `import` line (`.replace(/^import[\s\S]*?;...$/gm, "")`) before wrapping the shim in an
     IIFE. A `data.js → import {min,max} from "./math.js"` therefore loses its import but KEEPS the
     `_mmin(...)` references → ReferenceError in the browser. PROVEN: ran the inliner's strip on a
     patched data.js — "import survives strip: false" while the clamp body still referenced `_mmin`.
  2. SERVER (time.js / any umbrella): bundleStdlibForRun copied ONLY `<name>.js` + matching SUBDIR
     tree — it did NOT copy sibling-FILE imports. PROVEN: importing `scrml:time` alone copied time.js
     but NOT a (patched) ./math.js dep → "Cannot find module" at runtime. Same latent gap already
     existed for scrml:oauth (oauth.js imports ./http.js+./crypto.js, never copied when oauth imported
     alone — PROVEN before fix).

### FIX (bounded, correct, in-scope infra) — server transitive sibling-FILE copy
- api.js bundleStdlibForRun: NEW `copyTransitiveShimSiblings(src, name)` crawls a just-copied shim's
  top-level relative-`.js` imports/exports and copies each sibling (recursively, idempotent via
  copiedFiles Set), mirroring the dep's path relative to STDLIB_RUNTIME_DIR. Bare/bun:/node: left to
  the runtime resolver; subdir imports already covered by the existing subDir copyTree.
- This ALSO fixes the pre-existing scrml:oauth latent bug (http.js/crypto.js now copied — PROVEN).

### DE-LEAK applied — time.js ONLY (server-bundled, now transitive-safe)
- time.js: `import { floor } from "./math.js"` + all 15 `Math.floor(` → `floor(`. Math count 15→0.
  Behavior byte-identical (formatRelative "2m ago", formatDuration "1m 30s", diffTime 3 — verified
  against the index.scrml `~{}` expectations). time.js is NOT client-inlined (only auth/crypto/data/
  host are; a client `scrml:time` import emits `_scrml_stdlib.time` which is never populated — i.e.
  scrml:time is already effectively server-only client-side), so the de-leak is server-path-clean.

### data.js — NOT de-leaked (infra-blocked, surfaced) — Math count stays 2
- data.js:382 clamp + :387 paginate Math.ceil. data.js IS statically client-inlined → a cross-shim
  import to math.js would be stripped and break the client (blocker #1 above). De-leaking data.js
  cleanly requires client-inliner work (add `math` to the inlined chunk set + order before data +
  registry-bridge the reference, OR teach the inliner to follow+inline cross-shim imports). That is
  real infra beyond the DD1 Fork 1 scalar-vocabulary remit. SURFACED as a follow-on; NOT shipped
  broken (Rule 3 — right answer over forcing a break-through). data.js retains its own arithmetic;
  math.js still exists as the canonical adopter-facing + time.js-shared surface.

### Tests
- NEW compiler/tests/unit/stdlib-transitive-shim-copy.test.js (3): X1 scrml:time→time.js+math.js,
  X2 scrml:oauth→oauth.js+http.js+crypto.js (latent-bug fix), X3 leaf (path) copies only itself.
- Re-ran stdlib-time / stdlib-shim-resolution / stdlib-oauth / data-set-algebra — all green
  (time de-leak + transitive copy introduce zero regressions).
- Leak count: time.js 15→0; data.js 2→2 (intentionally retained, infra-blocked).

## 2026-06-09 — Phase 4 (SPEC §41 + PRIMER §10) — DONE
- SPEC.md: NEW §41.18 (`scrml:math` — pure scalar/numeric vocabulary; the 11-member catalog table +
  fn-callability normative + radix-10 + no-ambient-Math + random() exclusion + cross-refs §33/§48/
  §41.5/§42.1) + NEW §41.19 (`scrml:time.now()` — capability-scoped wall clock; non-det E-FN-004 in
  fn, allowed in function/server function, binding-aware gate, no new §34 code, cross-refs
  §48.3.4/§48.6.2/§34). Inserted between §41.17 and §42.
- PRIMER §10: module count 16→17; NEW scrml:math line; scrml:time.now() capability note appended to
  the scrml:time line; honesty-positioning note that the scalar gap is now closed (PA-facing only —
  did NOT touch kickstarter / scrml.dev per Rule 1).
- No new §34 code added (reuse E-FN-004 — survey confirmed no distinct code needed).

## 2026-06-09 — Phase 5 (R26 EMPIRICAL) — within-node allowlist reconciliation
- Full-suite run surfaced 2 fail = the native-parser WITHIN-NODE parity per-fixture gate
  (parser-conformance-within-node.test.js, M6.5.b.0): stdlib/math/index.scrml (NEW file, residual
  276) + stdlib/time/index.scrml (now() addition, residual 37 over baseline). These are NOT my
  test failures — all 131 of my new+touched unit tests pass in isolation. They are the documented
  reconcile-the-allowlist protocol when a `.scrml` corpus file is added/changed (the native parser
  produces a divergent/incomplete AST for the same standard `export function` shapes ALL stdlib index
  files exhibit — format baseline ~514, time was ~696; native is opt-in/default-0-fail, this is the
  known native-parity backlog, not a new bug).
- Regenerated the EXACT raw within-node class counts via the test's own classifier
  (classifyDivergences over splitBlocks+buildAST vs nativeParseFile+populateNativeAttrValueExprNodes)
  and baked them into parser-conformance-within-node-allowlist.json:
    stdlib/math/index.scrml (NEW): {KIND-NAME:10, FIELD-SHAPE:37, MISSING-FIELD:173, EXTRA-FIELD:28,
      COUNT-LENGTH:2, SPAN-COORD:26}
    stdlib/time/index.scrml (updated): MISSING-FIELD 387→408, EXTRA-FIELD 141→143, FIELD-SHAPE 79→84,
      KIND-NAME 28→30, COUNT-LENGTH 4→6, SPAN-COORD 57→62 (the now() decl's delta).
- Surgical 14-line diff (math inserted before time, time updated in place — no top-level re-sort).
- within-node gate re-run: 1007 pass / 0 fail (both fixtures in budget; corpus 1002→1003 files).

## 2026-06-09 — Phase 5 (R26 EMPIRICAL) — DONE / PASS

### R26 adopter-shaped compile table
| Case | File shape | Expected | Result |
|---|---|---|---|
| R26-A OK | pure `fn` round/abs/clamp + `function` parseInt+now() + `server function` now()/formatRelative | clean compile, exit 0, no E-FN | PASS — exit 0, zero E-FN-003/004 |
| R26-A shims | scrml:math + scrml:time imported | both shims copied + rewritten | PASS — _scrml/math.js + _scrml/time.js present; server.js `from "./_scrml/math.js"` + `"./_scrml/time.js"`; no literal `scrml:` survives |
| R26-A emit | all emitted JS | node --check clean | PASS — 6/6 files (client/server/2×runtime/math/time) node --check OK |
| R26-B reject | now() in pure `fn` | E-FN-004, exit 1 | PASS — E-FN-004 fired ("scrml:time.now non-deterministic... call from function/server function"), exit 1 |
| R26-C security | client.js | no server-fn body / no _scrml_sql / no process.env / no Date.now leak | PASS — server fns appear ONLY as fetch stubs (_scrml_fetch_stamp/_scrml_fetch_howLongAgo → POST routes); 0 _scrml_sql / 0 process.env / 0 Date.now |

### Full suite
- baseline (pre-change, deterministic): 23601 pass / 0 fail / 220 skip
- final: 23645 pass / 0 fail / 220 skip / 1 todo (Ran 23866 across 954 files) — +44 tests (my new), 0 new failures.

### random() follow-on (OUT OF v1 SCOPE — filed)
`random()` (Math.random, ~5 corpus sites) is the SAME class-C non-deterministic surface as the wall
clock — but it is NOT a clock (does not fit scrml:time) and NOT pure (does not fit scrml:math).
Its home is a separate small design decision: `scrml:random` (a dedicated capability-scoped module,
gated by E-FN-004 exactly like now()) vs an impure carve-out inside scrml:math. NOT built here.
Recommend: a thin `scrml:random` mirroring the now() gate shape (binding-aware E-FN-004 on the
imported `random` binding) — cohesive with the now() precedent landed this dispatch.

### data.js de-leak follow-on (Phase 3 residual, OUT OF SCOPE — filed)
data.js (statically client-inlined) can't cross-import math.js without client-inliner work (the
inliner strips imports). Options: (a) add `math` to the inlined chunk set + order before data +
registry-bridge, or (b) teach the inliner to follow+inline cross-shim imports. ~2 Math leaks remain
in data.js (clamp + paginate ceil). The math.js shim already EXISTS as the canonical surface.
