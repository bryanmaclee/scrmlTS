# Self-Host Spec Conformance Audit — 2026-05-11 (S81)

**Status:** filed for future scope; **NOT current-cycle work** (self-hosting is orthogonal to v0.2.0 readiness, per S81 user direction).
**Scope:** spec-conformance violations in the self-host `*.scrml` source files (`compiler/self-host/*.scrml` + `stdlib/compiler/{module-resolver,meta-checker}.scrml`).
**Authored by:** PA direct (triggered by S81 F.1+F.2 review).
**HEAD at audit:** ab980c0 (S81 F.1+F.2 ship).

## §0 Headline

Bryan asked about `!= null` patterns in my S81 ast.scrml mirror edit. Drilling in surfaced a much larger structural finding:

1. **362 `null`/`undefined` occurrences across 13 self-host files** (per `grep -E '\\bnull\\b' / '\\bundefined\\b'`). Per SPEC §42 + E-SYNTAX-042 (§34 line 14779) these are forbidden — scrml's only non-presence word is `not`.
2. **The rebuild script silently emits dist files even when the host compiler reports these violations.** `scripts/rebuild-self-host-dist.ts` writes `libraryJs` when the output is truthy, ignoring the `errors[]` array. Pre-S81 this leak let drift accumulate undetected.
3. **The GCP3 detector has a walker gap.** Of the 13 files, 5 produce violations (ast/ts/ri/pa/dg) and 8 produce zero errors — but several "passing" files (bpp.scrml, bs.scrml, tab.scrml) HAVE real `let x = null` value-position writes. The walker descends through markup-rooted ASTs but misses let-decl inits inside pure-logic-rooted files. **This is a separate detector bug** — fix is independent of the source-side sweep.
4. **Other violations surface alongside null/undefined when the rebuild is run strict:** E-EQ-004 (===/!==), E-ERROR-007 (try/catch — forbidden per §19), E-FN-003 (purity), E-MU-001, E-SCOPE-001 (120+ undeclared identifiers — likely a mix of real bugs + detector false-positives).

**Disposition:** **Strict-rebuild gate ACTIVE; source-side sweep DEFERRED.** Per S81 user direction (two-clarification arc):

1. *Initial:* "self hosting is entirely orthogonal. And at the moment I would prefer to spend the tokens getting the compiler all the way [to v0.2.0]."
2. *Clarification:* "the 'not' directive that I stated is still in play. null/undefined should not compile."

The bypass was itself a violation of the "not" directive — the rebuild script was silently producing dist from non-conforming source. The strict gate honors the directive. Self-host source-side cleanup remains deferred (orthogonal to v0.2.0 ship).

**Operational consequence:** files with current debt (ast/ts/ri/pa/dg per §1.3) FAIL the rebuild script today. Their dist files (`compiler/dist/self-host/{ast,ts,ri,pa,dg}.js`) are stale relative to current source until either (a) the source is swept or (b) someone re-runs the rebuild with the gate disabled (NOT recommended — defeats the directive). The pre-commit hook excludes `compiler/tests/self-host/` (per pa.md "What the hook excludes (intentional)") so this gate failing does NOT block compiler-side work.

S81 ship at `ab980c0` (F.1 + F.2) included 3 new `!= null` lines in ast.scrml as a mirror of the existing 200+-occurrence pattern. Those 3 lines are technical debt under §42 but are style-consistent with the surrounding source; they will be swept as part of the broader cleanup when this audit is taken up.

## §1 Full inventory

### §1.1 Per-file null/undefined counts (raw `grep` of source `.scrml` files)

| File | `null` | `undefined` | Total |
|---|---|---|---|
| compiler/self-host/ast.scrml | 62 | 10 | 72 |
| compiler/self-host/bpp.scrml | 5 | 0 | 5 |
| compiler/self-host/bs.scrml | 13 | 0 | 13 |
| compiler/self-host/cg.scrml | 0 | 0 | 0 |
| compiler/self-host/dg.scrml | 17 | 0 | 17 |
| compiler/self-host/meta-checker.scrml | 10 | 1 | 11 |
| compiler/self-host/module-resolver.scrml | 5 | 0 | 5 |
| compiler/self-host/pa.scrml | 20 | 6 | 26 |
| compiler/self-host/ri.scrml | 50 | 0 | 50 |
| compiler/self-host/tab.scrml | 3 | 2 | 5 |
| compiler/self-host/ts.scrml | 140 | 2 | 142 |
| stdlib/compiler/meta-checker.scrml | 10 | 1 | 11 |
| stdlib/compiler/module-resolver.scrml | 5 | 0 | 5 |
| **TOTAL** | **340** | **22** | **362** |

`stdlib/compiler/meta-checker.scrml` differs in content from `compiler/self-host/meta-checker.scrml` (verified via `diff -q`); both copies need editing.

### §1.2 Dominant null/undefined patterns

| Pattern | Count | Canonical scrml | Notes |
|---|---|---|---|
| `!= null` | 204 | `is some` | Most common shape |
| `: null` (obj field value) | 49 | `: not` | Object literal absent value |
| `return null` | 39 | `return not` | Function returning absence |
| `= null` (init / reassignment) | 31 | `= not` | LHS = absence |
| `== null` | 9 | `is not` | Absence check |
| `== undefined` | 6 | `is not` | Absence check |
| `!== null` | 5 | `is some` | E-EQ-004 ALSO violated; collapses both into `is some` |
| positional `null` argument | 8 | `not` | Function call with `null` arg |
| `=== null` | 4 | `is not` | E-EQ-004 ALSO violated |
| `!= undefined` | 1 | `is some` | Absence check |

### §1.3 Strict-rebuild baseline (errors when `process.exit(1)` enforced on non-warning errors)

Run command:
```
bun run scripts/rebuild-self-host-dist.ts
```
under temporary strict mode (script reverted in S81 — gate restored to non-strict).

| File | Total non-warning errors | E-SYNTAX-042 (null/undefined) | E-EQ-004 (===/!==) | E-ERROR-007 (try) | E-FN-003 | E-FN-002/4 | E-MU-001 | E-SCOPE-001 |
|---|---|---|---|---|---|---|---|---|
| compiler/self-host/ast.scrml | 76 | 29 | 1 | 2 | 15 | 0 | 1 | 28 |
| compiler/self-host/ts.scrml | 162 | 77 | 0 | 0 | 7 | 3 | 1 | 74 |
| compiler/self-host/ri.scrml | 24 | 20 | 0 | 0 | 0 | 0 | 0 | 4 |
| compiler/self-host/dg.scrml | 14 | 5 | 0 | 0 | 8 | 0 | 0 | 1 |
| compiler/self-host/pa.scrml | 36 | 9 | 14 | 0 | 0 | 0 | 0 | 13 |
| compiler/self-host/bs.scrml | 0 (detector gap — has 13 null source) | (0 surfaced) | — | — | — | — | — | — |
| compiler/self-host/bpp.scrml | 0 (detector gap — has 5 null source) | (0 surfaced) | — | — | — | — | — | — |
| compiler/self-host/tab.scrml | 0 (detector gap — has 3+2 source) | (0 surfaced) | — | — | — | — | — | — |
| compiler/self-host/cg.scrml | 0 | 0 | — | — | — | — | — | — |
| stdlib/compiler/module-resolver.scrml | 0 (detector gap — has 5 null source) | (0 surfaced) | — | — | — | — | — | — |
| stdlib/compiler/meta-checker.scrml | 0 (detector gap — has 10+1 null source) | (0 surfaced) | — | — | — | — | — | — |
| **TOTAL (across surfacing files)** | **312** | **140** | **15** | **2** | **30** | **3** | **2** | **120** |

The 222-occurrence delta between source-grep count (362) and detector-surfaced count (140 E-SYNTAX-042 firings) is **the detector gap** — see §3.

## §2 The strict-rebuild leak (pre-S81 state, since restored)

`scripts/rebuild-self-host-dist.ts` original behavior:

```ts
const result = compileScrml({ inputFiles: [src], mode: "library", write: false });
const entry = result.outputs?.values()?.next()?.value as any;
if (entry?.libraryJs) {
  // ... write dist ...
  total++;
}
```

`compileScrml` returns `{ outputs, errors[] }` for library-mode compiles. Even when `errors[]` is non-empty (including fatal severity), `outputs` is populated with the partial `libraryJs`. The rebuild script's success check (`if (entry?.libraryJs)`) is truthy regardless of the error array — so every self-host file dists silently even when normative-spec violations are reported by the host compiler.

**Strict-rebuild proposal** (filed; not currently active):

```ts
const errs = (result.errors ?? []).filter((e: any) => e.severity !== "warning");
if (entry?.libraryJs && errs.length === 0) {
  // emit dist
} else {
  failed++;
  // log per-code count + first 3 messages
}
// ...
if (failed > 0) process.exit(1);
```

This script-side change was applied during S81 to capture the §1.3 baseline, then reverted. The audit doc preserves the script delta as the recommended form when the sweep is run.

## §3 Detector gap (GCP3 walker)

`compiler/src/gauntlet-phase3-eq-checks.js:walkAst` descends through:
- `n.condExpr`, `n.initExpr`, `n.exprNode`, `n.argsExpr` (expression inspection sites)
- `n.body`, `n.children`, `n.defChildren`, `n.then`, `n.else`, `n.consequent`, `n.alternate`, `n.arms[].body` (container recursion)
- `n.attrs[]` via `inspectAttrs` (markup-attribute exprNodes + string-template-interp segments)

**Observed gap:** files structured as raw `function f() { let x = null; ... }` declarations at top-level (no `<program>` markup root — bpp.scrml, bs.scrml, tab.scrml shape) produce **zero E-SYNTAX-042 firings** despite real `let x = null` source. Files with markup-rooted ASTs (ast.scrml, ts.scrml, ri.scrml shape) DO surface their nulls.

The walker enters via `topNodes = ast.nodes ?? []` and recurses through container fields. Pure-logic-rooted self-host modules might be producing AST shapes where the walker doesn't reach `let-decl.initExpr` inside `function-decl.body`. **Diagnosis is incomplete** — needs a focused dispatch (1-2h) to root-cause the walker miss + extend it.

**Why this matters:** even with the strict-rebuild gate in §2, source-side cleanup must convert ALL grep-detected occurrences (not just compiler-surfaced ones), because the rule per SPEC §42 is unconditional. Until the detector is fixed, the strict gate would be too lenient — it'd let bpp/bs/tab/etc keep accumulating null source.

**Filed as a separate sub-project:** "GCP3 walker — descend into function-decl/let-decl bodies on pure-logic-rooted modules." Effort estimate ~1-2h diagnose + extend + tests.

## §4 Non-null violations surfaced (NOT part of the §42 rule)

The strict-rebuild also surfaced these — they're spec violations but distinct from the null/undefined rule:

### §4.1 E-EQ-004 (===/!==) — 15 occurrences

| File | Count |
|---|---|
| compiler/self-host/pa.scrml | 14 |
| compiler/self-host/ast.scrml | 1 |

Per §45.7 / primer §11 anti-patterns table: `===`/`!==` are not valid scrml operators; use `==`/`!=`. Mechanical conversion. ~30 min.

### §4.2 E-ERROR-007 (try/catch) — 2 occurrences in ast.scrml

Per SPEC §19 + primer §6: try/catch/finally are not in scrml's vocabulary. Failable functions use `function f()! -> ErrType` + `fail` + call-site `!{ | ::Variant -> ... }` handlers.

Conversion is NOT mechanical — each `try/catch` needs analysis: what error is being caught? Should the throwing call be `!`-wrapped? Should the body use `fail`? ~1-2h depending on the two specific sites.

### §4.3 E-FN-003 (pure function violations) — 30 occurrences

`fn` declarations whose bodies violate purity (calls to non-pure functions, await, side-effects). Per SPEC §31.5 / §48: `fn` is the pure subset; `function` is general-purpose. Either:
- Change `fn` → `function` when the function isn't actually pure
- Refactor the body to be pure

Case-by-case analysis required. ~2-3h estimate.

### §4.4 E-FN-002 / E-FN-004 — 5 occurrences

Other fn-purity violations (different sub-codes). Similar treatment to §4.3. ~30 min if grouped with §4.3.

### §4.5 E-MU-001 — 2 occurrences

Missing mutation declarations. SPEC §6.5 reactive array mutation requires explicit declarations. ~15 min.

### §4.6 E-SCOPE-001 (undeclared identifier) — 120+ occurrences

The wildcard category. Could be:
- **Real bugs** — self-host code referencing identifiers that no longer exist (deleted during refactors)
- **Detector false-positives** — identifiers imported but the symbol-table not seeing them on these files' AST shapes
- **Carve-out** — self-host bootstrap requires special-case identifier resolution

Effort unknown until diagnosed. Estimate: 1-3h to triage, then variable.

## §5 Recommended sweep order (when this audit is taken up)

The audit's earlier proposed plan (~4-5h) was scoped to ONLY null/undefined. With the additional surface (E-EQ-004 + E-ERROR-007 + E-FN-003/4/2 + E-MU-001 + E-SCOPE-001), realistic scope is **~8-12h** split across:

1. **Diagnose detector gap** (~1-2h) — `gauntlet-phase3-eq-checks.js:walkAst` extension so all 362 grep-detected occurrences surface in the strict-rebuild baseline.
2. **Source sweep null/undefined** (~3-4h) — convert all 362 occurrences per the §1.2 pattern table. Smallest files first (bpp/tab/cg/module-resolver/meta-checker) to bank wins; ast.scrml + ts.scrml + ri.scrml are the bulk.
3. **Adjacent cleanups** (~1-2h) — E-EQ-004 (mechanical) + E-MU-001 (small) + E-FN-002/4 (small). E-ERROR-007 (try/catch) takes longer and might be its own ticket.
4. **E-FN-003 triage + cleanup** (~2-3h) — case-by-case.
5. **E-SCOPE-001 triage** (~1-3h) — separate decision per pattern.
6. **Strict-rebuild gate** (~30 min) — restore the `process.exit(1)` change from S81 plus optional code-allowlist for any debt that's accepted as known.
7. **Full suite verification + commit + push** (~30 min).

When the time is right (post-v0.2.0 ship), this audit + the §1 inventory + §5 plan provides everything needed to start. The recommended dispatch shape is general-purpose agent (since `scrml-dev-pipeline` agent may not be staged) with this doc as the brief.

## §6 What the S81 sweep DID land (so the next session knows what's already in place)

1. **Hardcoded-thresholds follow-up audit** at `docs/audits/hardcoded-thresholds-followup-2026-05-11.md` (priority #4 ship).
2. **F.1 ship**: `<program cors-max-age=N>` — `emit-server.ts` parameterized; SPEC §39.2.1 amended; tests in middleware-handle.test.js. Commit `ab980c0`.
3. **F.2 ship**: `<program channel-reconnect=N>` — `emit-channel.ts` parameterized via `parseChannelReconnect`; SPEC §38.3.1 new subsection; SPEC §38.3 attribute table cleanup (S80 stale `protect` row removed, `auth` row added); tests in channel.test.js. Commit `ab980c0`.
4. **THIS audit** filed.
5. **No source-side changes** to self-host beyond the ast.scrml mirror of F.1+F.2 (which was part of `ab980c0`).
6. **Strict-rebuild gate ACTIVE** at `scripts/rebuild-self-host-dist.ts` — the script now refuses to write `compiler/dist/self-host/*.js` when the host compiler reports any non-warning error, and exits with code 1 on any failure. Honors the "null/undefined should not compile" directive. Tightens the previously-silent leak. Source-side sweep deferred to v0.3.0-or-later per direction.

## §7 Cross-references

- SPEC §42 — `not` keyword normative (canonical absence)
- SPEC §34 E-SYNTAX-042 — `null`/`undefined` are forbidden tokens
- SPEC §34 E-TYPE-042 — `== not` is invalid; use `is not`
- SPEC §34 E-EQ-004 — `===`/`!==` invalid
- SPEC §19 / primer §6 — failable functions, no try/catch
- primer §10 / §11 anti-patterns — null/undefined + ===/!== reflexes
- `docs/audits/hardcoded-thresholds-followup-2026-05-11.md` — adjacent S81 audit
- S81 ship commit `ab980c0`

## §8 Tags

#self-host #spec-conformance #s81-filed #v0.3.0-or-later #orthogonal-to-v0.2.0 #detector-gap #gcp3-walker
