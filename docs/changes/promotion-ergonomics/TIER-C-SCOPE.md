---
title: Promotion ergonomics — Tier C SCOPE (--engine + W-MATCH-TRANSITIONS-ACCRUING)
date: 2026-05-07
session: S66
status: SCOPED — queued, not yet dispatched
parent: SCOPE.md, SURVEY-PHASE-B.md
authority: Bryan-authorized S66; Tier C deferred from Tier B re-scope per Finding B (W-MATCH-TRANSITIONS-ACCRUING does not exist; needs groundwork)
estimate: ~10-18h (single-session shippable)
predecessor: Tier B (S66, commits 7df773f → a841ab4) — `--match` shipped + lint substrate proven
---

# Tier C — `bun scrml promote --engine` + `W-MATCH-TRANSITIONS-ACCRUING` lint

## Why this exists as a separate dispatch

Tier B Phase 0 sub-survey (`SURVEY-PHASE-B.md` §2) found that `W-MATCH-TRANSITIONS-ACCRUING` — the discovery-surface lint Phase 3 was scoped to pair with — has no §34 row, no impl, no §28 suppression config. Folding it into Tier B would have silently expanded the dispatch by 3-5h to add the missing groundwork. Bryan ratified the split: Tier B ships `--match`; Tier C ships `--engine` + the missing lint, on its own dispatch with proper groundwork.

The CLI surface `bun scrml promote --engine` was locked in Tier A (`commands/promote.js`); Tier B left it printing "deferred to Tier C — needs W-MATCH-TRANSITIONS-ACCRUING groundwork" and exiting 2. Tier C lifts that.

## Two pieces (same workflow as Tier B)

### Piece A — `W-MATCH-TRANSITIONS-ACCRUING` lint

**Severity:** warning (NOT info). Three reasons it's stronger than `I-MATCH-PROMOTABLE`:
1. It targets code the dev has actively staged toward Tier 2 (rules are present; the dev wrote `rule="..."` attributes deliberately).
2. The Tier-1 rules-inert semantic (L7) is documented but easy to forget — a forgotten staged engine is a real bug profile (rules look like they should fire; they don't).
3. The accrual signal is concrete: rules-bearing arms exist; the "are you done staging?" question is well-posed.

**Fires when:**
- A `<match>` block-form has at least one state-arm with a `rule="..."` attribute, AND
- The match has an `on=expr` discriminator (so the lift target — engine `derived=` or auto-decl — is determinable), AND
- The match's `for=Type` is an enum (already required for any block-form match)

**Does NOT fire on:**
- `<match>` arms with no `rule=` (no accrual; no Tier-2 readiness signal yet)
- Already-promoted `<engine>` blocks (idempotency at lint level)
- Match without `on=expr` (the discriminator is the cell — needs separate consideration; defer)

**Message shape:**
```
W-MATCH-TRANSITIONS-ACCRUING at app.scrml:42 — this <match for=Phase
on=@phase> block has rule= attributes on 3 arms (.Loading, .Error, .Success).
Rules are legal-but-inert in match (L7); to enforce them, lift to a <engine>
(Tier 2). Run `bun scrml promote --engine app.scrml:42` to promote.
```

**Sibling relationship to `W-MATCH-RULE-INERT`:** the existing `W-MATCH-RULE-INERT` warns at the rule-attribute site that the rule is inert. That's per-rule-decl. `W-MATCH-TRANSITIONS-ACCRUING` is the higher-level "the match is staged for promotion" signal — same rules, but framed as "the WHOLE match is ready to lift." Both fire on the same code; one is per-attribute, one is per-match-block. They're complementary.

**Implementation:**
- New lint pass at `compiler/src/lint-w-match-transitions-accruing.js`. Sibling to S66 Tier B's `lint-i-match-promotable.js`.
- Wired in `api.js` Stage 6.4 alongside the existing I-MATCH-PROMOTABLE lint.
- Walks `MarkupNode`s with `kind: "match"` (or whatever the match-block AST kind is — verify in survey).
- Counts `rule=` attributes across state-children. If ≥1, emit warning.
- Tests in `compiler/tests/unit/lint-w-match-transitions-accruing.test.js`.

### Piece B — `bun scrml promote --engine` AST→AST rewrite

**Transformation:**

Input:
```scrml
<match for=Phase on=@phase>
    <Idle>
        <button onclick=load()>Load</button>
    </>
    <Loading rule="onResult.ok(n) -> Success(n)"
             rule="onResult.err(m) -> Error(m)">
        Loading...
    </>
    <Error msg>
        <div>${msg}</div>
        <button rule="retry -> Loading">Retry</button>
    </>
    <Success count>
        Got ${count} rows
    </>
</>
```

Output:
```scrml
<engine for=Phase initial=.Idle>
    <Idle>
        <button onclick=load()>Load</button>
    </>
    <Loading rule="onResult.ok(n) -> Success(n)"
             rule="onResult.err(m) -> Error(m)">
        Loading...
    </>
    <Error msg>
        <div>${msg}</div>
        <button rule="retry -> Loading">Retry</button>
    </>
    <Success count>
        Got ${count} rows
    </>
</>
```

The transformation is even simpler than Tier B's `--match`:
1. Token swap `<match` → `<engine` at the opening tag
2. Drop `on=expr` attribute from the opener
3. Add `initial=.X` attribute (see "initial= choice" below)
4. State-children carry forward verbatim (same syntactic shape)

**`initial=` choice — design decision needed:**

Three options:
- **Option 1 — first arm:** use the first declared state-arm as `initial=`. Mechanical; predictable; matches the order the dev wrote.
- **Option 2 — required `--initial=.X` flag:** force the dev to specify. No silent assumptions; but adds CLI ceremony.
- **Option 3 — error on ambiguity, accept flag override:** if there's a clear "first" arm, use it; otherwise error with "specify --initial=.X".

**PA lean: Option 1.** scrml's existing engine semantics: `<engine>` requires `initial=`, but the W-ENGINE-INITIAL-MISSING lint defaults to "first variant" if omitted (per primer §7). The promote operation should match that convention — first arm wins. If the dev disagrees, they edit the resulting `initial=` attribute manually (small post-edit, clearly marked).

**`derived=` interaction:** if the source `<match>` had `on=@cell` and the cell is a `const`-derived cell, the engine target should use `derived=expr` (per L20). Detect this case during transformation; emit `<engine for=T derived=@cell>` instead of `<engine for=T initial=.X>`. (No `initial=` on derived engines.)

**Skips (non-promotable; report each):**
- Match without `on=expr` — no discriminator path to engine
- Match where `for=` resolves to a non-enum type (already invalid Tier 1; not our problem to fix)
- Match where `derived=` would resolve to an effectful expression (engine derived semantics require pure expr)
- Match where rule-attribute syntax is malformed (parser would have errored already)

**Span-based rewrite path** (Tier B precedent — proven). AST locates spans; string operations rewrite. State-children preserved verbatim because we never re-emit them.

**Sanity-parse pattern** (Tier B precedent): rewritten source staged in temp file, run through `compileScrml({ write: false })` to verify it parses + type-checks (engine has stricter checks than match — exhaustiveness, transition validity).

**Idempotent:** re-running on `<engine>` is no-op (no `<match>` blocks to lift).

**Exit codes** (per SPEC §56.5.5, same as `--match`):
- 0: promoted N sites cleanly
- 0: no promotable sites found (informational)
- 1: file not parseable
- 2: ambiguous site needs human (e.g., conflicting `initial=` candidates if Option 3 chosen)

### Piece C — Sanity-parse strictness for engine target

The big difference from `--match`: `<engine>` blocks have stricter compile-time checks than `<match>`:
- Exhaustiveness over enum variants (E-MATCH-NOT-EXHAUSTIVE — but this should already be enforced at Tier 1 match)
- `initial=.X` MUST name a declared arm
- Transition-rule validity (E-ENGINE-INVALID-TRANSITION) — rule targets must be declared variants
- No direct cell writes inside the engine — only `.advance(.event)` paths

The transformation should NOT silently produce code that fails these checks. The sanity-parse run catches them. If it fails:
- Report which check failed
- Leave the file untouched
- Exit 2 with diagnostic ("transformation valid syntactically but engine validation failed: <reason>")

This is a real risk — a `<match>` may be Tier-1-valid but Tier-2-invalid (e.g., a rule targets a variant that isn't declared as an arm; the dev wrote it as documentation intent, not as a real transition). The CLI must catch + report cleanly.

## Phase plan (target: 10-18h single-session)

### Phase 0 — Survey (~30-60min)

Walk Tier B precedent + verify W-MATCH match-block AST kind + verify `on=expr` resolution path. Cost confidence interval.

### Phase 0a — Spec amendment (~30-60min)

- Add §34 catalog row for W-MATCH-TRANSITIONS-ACCRUING
- Add §28 suppression config row
- SPEC §56 update: change `--engine` status from "deferred to Tier C" to "shipped Tier C"
- SPEC §56.5.2 add `<match>` → `<engine>` rewrite rules with `initial=` semantics

### Phase 1 — `W-MATCH-TRANSITIONS-ACCRUING` lint (~3-5h)

- New lint module
- Wire in api.js Stage 6.4
- Tests: rules-bearing match fires; rules-free match doesn't; engine doesn't; partial-rules-bearing fires; nested matches handled

### Phase 2 — `bun scrml promote --engine` AST→AST rewrite (~4-8h)

- Replace stub at `commands/promote.js` `--engine` handler
- Token swap + attribute manipulation
- `derived=` vs `initial=` branching
- Sanity-parse with engine-strict semantics
- Idempotency
- Tests: golden-file rewrite for canonical case, derived-engine case, skip cases (non-enum, no-on-expr, malformed rule), idempotency

### Phase 3 — Docs touch-up (~1-2h)

- Primer §13.8 — `--engine` shipped status; lint family complete
- Primer §11 — W-MATCH-TRANSITIONS-ACCRUING anti-pattern row (if applicable)
- Article tier-ladder-promotion — concrete `--engine` worked example; remove "deferred" caveat
- Kickstarter §6 CLI table — `--engine` shipped

### Phase 4 — Final verification

- `bun run test` full suite green
- `bun scrml promote --engine` sanity test on real example with rules-bearing match
- Update progress.md

## Dependencies + ordering

**Required before this dispatch fires:** none. Tier B is shipped; A1b B-series is far enough along that match-block AST is stable. No other in-flight dispatches block Tier C.

**Soft dependencies / interactions:**
- A1c (codegen+runtime) is orthogonal — engine codegen exists today; lifted matches compile fine
- A1b future steps (B6+) — irrelevant to lift mechanics
- L20 derived engine — need to handle `derived=expr` case correctly (small extra work)

## Risks

1. **`initial=` ambiguity.** If multiple arms are equally good candidates for `initial=` (e.g., the developer ordered them alphabetically rather than by lifecycle), Option 1 (first arm) may produce a surprising result. Mitigation: dry-run output prominently shows the chosen `initial=`; dev can override in dry-run review.

2. **Sanity-parse failure rate.** A `<match>` may be Tier-1-valid but Tier-2-invalid (rule targets undeclared variants used as documentation). Real-world rate unknown until corpus data; could be 0%, could be 30%. Mitigation: clear error message + leave-untouched; dev sees exactly what broke.

3. **W-MATCH-TRANSITIONS-ACCRUING vs W-MATCH-RULE-INERT redundancy concerns.** Both warn on the same code from different angles. Mitigation: lint suppression configs for each (already standard); doc clearly explains complementary roles.

4. **Tier B precedent biases optimism.** Tier B re-scoped UPWARD from 25-41h to "STOP at Phase 0" finding the SCOPE assumed unparseable surface. Tier C SCOPE could have similar discoveries. Mitigation: mandatory Phase 0 survey-first sub-phase.

## Trigger conditions

Tier C is queued — fire when one of these lands:

1. Bryan-authorized direct dispatch (any time)
2. Real adopter friction reported with rules-bearing matches that would benefit from auto-lift
3. A1c (codegen+runtime) ratification needs Tier-2 examples to be one-step-removed-from-trivial
4. Conference / talk preparation that wants the full tier-ladder demo end-to-end

## What NOT to do

- Do NOT fire Tier C before A+ verdict execution items #3 are confirmed landed (per S64 carry-forward — primer §1 already covers two-Tier-1-shapes, but verify before dispatch). UPDATE: A+ #3 is small docs touch; fold into Phase 3 if not yet landed.
- Do NOT bundle additional features with Tier C (e.g., "while we're touching engine codegen, let's also..."). Tier C is `--engine` + W-MATCH-TRANSITIONS-ACCRUING; full stop.
- Do NOT silently change `initial=` semantics from primer §7 default (first variant). The promote operation is a carry-forward, not a redesign.

## Estimate breakdown

| Piece | Estimate |
|---|---|
| Phase 0 survey | 0.5-1h |
| Phase 0a spec | 0.5-1h |
| Phase 1 lint | 3-5h |
| Phase 2 CLI rewrite | 4-8h |
| Phase 3 docs | 1-2h |
| Phase 4 verification | 0.5-1h |
| **Total** | **9.5-18h** |

Single-session shippable. Tier B's actual landing was within the re-scoped 16-26h envelope (full session). Tier C is smaller because the CLI scaffold is proven (mirror commands/promote.js's `--match` handler) and the lint substrate is proven (mirror lint-i-match-promotable.js).

## Tags

#promotion-ergonomics #tier-c #scoped-not-dispatched #w-match-transitions-accruing #bun-scrml-promote-engine #engine-lift #queued

## Cross-references

- [SCOPE.md](./SCOPE.md) — original Tier A/B design lock (S65)
- [SURVEY-NOTE.md](./SURVEY-NOTE.md) — original survey (S65 Tier A landing)
- [SURVEY-PHASE-B.md](./SURVEY-PHASE-B.md) — S66 Tier B Phase 0 findings (the doc that defined Tier C's existence)
- [progress.md](./progress.md) — Tier A/B progress log
- `compiler/SPEC.md` §51 — engine spec (Tier 2 commitment)
- `compiler/SPEC.md` §56 — promotion ergonomics normative spec (--engine "deferred to Tier C" notes here)
- `compiler/SPEC.md` §18.0.2 — W-MATCH-RULE-INERT (sibling lint)
- `compiler/src/commands/promote.js` — Tier B-shipped `--match`; `--engine` stub awaits Tier C
- `compiler/src/lint-i-match-promotable.js` — Tier B precedent for new lint module
- Primer §13.8 — current Tier B ship state; will update Tier C status
- Primer §7 — engine concepts, `initial=` semantics
