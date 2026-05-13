# M-7C-D paired migration — progress

**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-af78f4fb86dcb0bb9`
**Dispatch:** compiler/src paired null+undefined bundled migrations (Wave 7.D + 8.D paired items)
**Base SHA at dispatch:** `78555f6`
**Worktree HEAD at dispatch:** `9b98118` (pre-rebase) → `78555f6` (post-rebase)

---

## Phase 0 — Classification (timestamped 2026-05-13T00:00Z)

Per audit §6 (null-audit `M-7C-D`) + §7 (undefined-audit `M-8C-D`): items 4, 5, 6, 7, 8, 9, 10, 13, 14, 17 are blocked by M-7C-D-12 (runtime absence-sentinel).

Below: classification of EACH M-7C-D-N + M-8C-D-N item with explicit safe/blocked decision.

### Items BLOCKED by M-7C-D-12 (runtime absence-sentinel infrastructure)

These items cannot land cleanly without a runtime `_scrml_absent` sentinel + `_scrml_is_absent` / `_scrml_is_some` helpers. The audits' §6 high-priority recommendations enumerate these explicitly:

- **M-7C-D-4 / M-8C-D-4** — emit-expr `is-not`/`is-some`/`is-not-not` emission. Replacement is `_scrml_is_absent(${left})` — sentinel-dependent.
- **M-7C-D-5 / M-8C-D-5** — codegen/rewrite.ts mass `not → null` regex + paired keyword rewrites. Sentinel-dependent.
- **M-7C-D-6** — Server-fn HTTP wire format. Needs spec §50/§41.13 amendment + tagged envelope.
- **M-7C-D-7 / M-8C-D-8** — Engine state-cell history initial null + derived-engine init-undefined throw. Sentinel-dependent.
- **M-7C-D-8** — Audit-log label/auditTarget literal "null" interpolation. Sentinel-dependent.
- **M-7C-D-9** — SQL `.get`/`.first` row-not-found absence. Sentinel-dependent + spec §39 absence amendment.
- **M-7C-D-10** — Reactive-wiring `targetExpr = "null"` interpolation. Sentinel-dependent.
- **M-7C-D-13 / M-8C-D-10** — Match-arm "not" kind + structured binding null + for-loop reconciler key. Sentinel-dependent.
- **M-7C-D-14 / M-8C-D-11 / M-8C-D-12** — Runtime `_scrml_lift_target` + capturedBindings + structural equality + array-first helpers. Sentinel-dependent + LIFT-5 prior art.
- **M-7C-D-17 / M-8C-D-9** — Machine-property-tests emitted runtime harness + machine-fn return undefined. Sentinel-dependent.
- **M-8C-D-6** — emit-server / emit-logic / scheduling `?? "undefined"` init fallback. Sentinel-dependent.
- **M-8C-D-7** — emit-server emitted §45 structural-equality helper. Sentinel-dependent.
- **M-7C-D-18 / M-8C-D-13** — runtime-validators absence preprocessing. Sentinel-dependent.

**Verdict:** DEFER all blocked items in this dispatch.

### Items NOT blocked by M-7C-D-12 — but blocked by AST-shape dependency

The audits recommend M-7C-D-1 / M-8C-D-1 (remove `"null"` and `"undefined"` from `litType` union in `ast.ts`) as "Structural cleanup; eliminates the canonical mirror inside the compiler." Investigation reveals these items have HARD downstream dependencies that block clean removal:

- **`expression-parser.ts` L987** manufactures `litType: "null"` from raw scrml source `null` keywords (so the gauntlet can flag them later).
- **`expression-parser.ts` L1187 / L1192 / L1197** manufactures `litType: "null"` as synthetic RHS for `is-not` / `is-some` / `is-not-not` binary operators. This synthetic node carries the operator's RHS even though no `null` appeared in source — it's the AST's representation of the absence-sentinel-RHS.
- **`expression-parser.ts` L1233 / L1258** manufactures `litType: "undefined"` for `reset()` arity-error synth.
- **`expression-parser.ts` L1316** manufactures `litType: "undefined"` for array-hole elements.
- **`expression-parser.ts` L1483** manufactures `litType: "null"` for empty-expr placeholder.
- **`expression-parser.ts` L1595 / L1596** `emitStringFromTree` consumes `litType === "null"` / `"undefined"` to round-trip diagnostics.
- **`component-expander.ts` L750-752** manufactures `litType: "null"` from component-decl `default="null"` form.
- **`gauntlet-phase3-eq-checks.js` L167, L168, L351-353, L378-386, L413-414, L606-607** detector pattern-matches `litType === "null"` / `"undefined"` to fire E-SYNTAX-042.
- **`compiler/tests/unit/gauntlet-s19/null-coverage.test.js`** REQUIRES the detector to fire E-SYNTAX-042 on user source containing `null` / `undefined` — this is the regression guard for the W-NULL ruling.

Removing `"null"` and `"undefined"` from the `litType` union without simultaneously redesigning the absence-sentinel AST representation would:
1. Break the parser (TS strict-mode rejects `satisfies LitExpr` with invalid `litType`).
2. Break the gauntlet detector (cannot pattern-match absent variants).
3. Break the E-SYNTAX-042 regression-guard test suite.

The audit M-7C-D-1 fix explicitly says: "Add new `AbsentSentinel` discriminator" — i.e., this is a **coordinated AST migration that requires the runtime-sentinel design in M-7C-D-12 as prerequisite** to ratify the shape of the replacement node.

**Verdict:** DEFER M-7C-D-1 / M-8C-D-1 (coupling with M-7C-D-12 is structural even if audit §6 didn't list them as direct blockers).

Cascading defer: **M-7C-D-2 / M-8C-D-2** (parser stop manufacturing `litType:"null"`/`"undefined"`) — same dependency. The parser cannot stop manufacturing these LitExprs until the replacement AST shape lands; otherwise the gauntlet detector loses its inputs.

Cascading defer: **M-7C-D-3** (component-expander default="null" path) — depends on the AST replacement.

### Items NOT blocked — VALUE_KEYWORDS sets

- **M-7C-D-11** — type-system `["null", tPrimitive("null")]` BUILTIN_TYPES at `type-system.ts` L578.
- **M-8C-D-14** — VALUE_KEYWORDS / GLOBAL_NAMES sets containing `"null"` / `"undefined"`:
  - `compiler/src/tokenizer.ts` L724 — `VALUE_KEYWORDS = new Set(['true', 'false', 'null', 'undefined', 'this'])` — feeds `_checkLastEndsValue` for ASI-NEWLINE logic.
  - `compiler/src/ast-builder.js` L2153 — `VALUE_KEYWORDS = new Set(["true", "false", "null", "undefined", "this", "not"])` — same purpose inside ast-builder ASI fallback.
  - `compiler/src/type-system.ts` L3143 — `LOGIC_SCOPE_GLOBAL_ALLOWLIST` contains `"undefined", "null"` — allows bare `null`/`undefined` to surface as ident-refs in logic scope without scope-resolver firing.

Investigation:

**Critical interaction:** the tokenizer + ast-builder VALUE_KEYWORDS entries for `"null"`/`"undefined"` exist to support ASI-NEWLINE statement separation when these tokens appear as value-position terminals. In current scrml, E-SYNTAX-042 rejects user source containing `null` / `undefined` — so the ASI behavior is only exercised on rejected source. Removing the entries would mean the parser sees user `<x> = null\n<y> = 0` and fails to apply ASI correctly. The user gets a confusing parse error rather than the targeted E-SYNTAX-042 diagnostic.

This is a USER-EXPERIENCE regression on already-rejected source — not a correctness regression — but it would also potentially confuse the gauntlet detector (which depends on the AST being well-formed enough that the walker can find the `litType: "null"` / `"undefined"` nodes).

**Same blocker logic:** these VALUE_KEYWORDS entries are infrastructure that supports the gauntlet's ability to produce a clean E-SYNTAX-042 message. They cannot be removed until the gauntlet shifts to a different detection path (likely tied to the new `AbsentSentinel` AST shape under M-7C-D-1).

**Verdict for VALUE_KEYWORDS in tokenizer + ast-builder:** DEFER — same chain-dependency.

**LOGIC_SCOPE_GLOBAL_ALLOWLIST L3143:** `"undefined"` and `"null"` are in a list of identifiers that scope-resolution permits as bare ident-refs (so the scope-walker doesn't emit E-SCOPE-001 for bare `null` / `undefined`). Removing them would cause the scope-walker to fire E-SCOPE-001 BEFORE the gauntlet fires E-SYNTAX-042, masking the better diagnostic. DEFER.

**BUILTIN_TYPES `["null", tPrimitive("null")]` L578:** This is the type-system entry that makes `: null` a valid type annotation. Per audit M-7C-D-11: "Remove. Scrml authors should not be able to write `: null` as type annotation." This is a single-line removal with no cascade through the parser/gauntlet — it would only surface when user code writes `: null` as a type annotation (no test coverage found). However, removing it without a replacement could regress type-resolution for any internal/compiler code that registers `tPrimitive("null")` via lookup. Investigation found `tPrimitive("null")` referenced 6× in `type-system.ts` — see L3882 + L3888 which create `tUnion([tPrimitive(elemShape.domInterface), tPrimitive("null")])` for DOM `ref=` bindings.

**Verdict for BUILTIN_TYPES L578:** **MICRO-RISKY** — removing the user-visible `: null` annotation path is the goal, but the internal DOM-ref binding code at L3882/L3888 still constructs `tPrimitive("null")` directly. Removing only the BUILTIN_TYPES Map entry would not break the internal callers (they call `tPrimitive` directly, not via map lookup), but it could break anyone using `: null` annotation in source (untested). The right design is to also migrate L3882/L3888 to use a non-null DOM-ref-absent representation — which itself depends on M-7C-D-12 sentinel design.

**Verdict:** DEFER M-7C-D-11.

---

## Final classification — this dispatch

**Items closed (committed in this dispatch):** NONE.

**Items deferred — M-7C-D-12 blocker (audit §6 explicit list):**
- M-7C-D-4, M-7C-D-5, M-7C-D-6, M-7C-D-7, M-7C-D-8, M-7C-D-9, M-7C-D-10, M-7C-D-13, M-7C-D-14, M-7C-D-17
- M-8C-D-4, M-8C-D-5, M-8C-D-6, M-8C-D-7, M-8C-D-8, M-8C-D-9, M-8C-D-10, M-8C-D-11, M-8C-D-12, M-8C-D-13

**Items deferred — structural AST coupling (chain-block via gauntlet detector):**
- M-7C-D-1, M-7C-D-2, M-7C-D-3
- M-8C-D-1, M-8C-D-2, M-8C-D-3
- M-7C-D-11 (BUILTIN_TYPES — coupled to DOM-ref-absent at type-system.ts L3882/L3888)
- M-8C-D-14 (VALUE_KEYWORDS / LOGIC_SCOPE_GLOBAL_ALLOWLIST — coupled to gauntlet detector path)

**Items deferred — needs PA disposition:**
- M-7C-D-15 (schema-differ SQL boundary, audit §5.5)
- M-7C-D-16 (route-record boundary discriminators)
- M-7C-D-18 / M-8C-D-13 (runtime-validators sweep)
- M-8C-D-15 (payload-positional undefined, audit §5.3)
- M-8C-D-16 (derived-cache invalidation marker, audit §5.4)

---

## Phase 1 — Audit-recommendation re-read

Re-reading audit §6 high-priority recommendations alongside the brief's "purely AST/parser/typer surface; safe to migrate without runtime-sentinel design" criterion:

The brief lists candidate-safe items as:
- AST `litType: "null"` + `litType: "undefined"` branches (ast.ts L1482/L1483) — paired
- VALUE_KEYWORDS sets in tokenizer.ts + ast-builder.js + expression-parser.ts + route-inference.ts + type-system.ts L3143 — paired
- Other purely-AST / purely-parser sites without codegen implications

However: NEITHER set is purely AST/parser-isolated. Both have load-bearing downstream coupling:

1. **AST litType branches** — manufactured by parser, consumed by gauntlet detector. Removing the branches without replacing the absence-representation breaks the chain.

2. **VALUE_KEYWORDS** — tokenizer/ast-builder entries support ASI for user source that contains `null` / `undefined` (currently rejected by gauntlet but must still parse coherently to reach the gauntlet phase).

3. **type-system L3143 LOGIC_SCOPE_GLOBAL_ALLOWLIST** — prevents scope-walker from firing E-SCOPE-001 before E-SYNTAX-042.

4. **type-system L578 BUILTIN_TYPES** — makes `: null` annotation type-resolvable; coupled to internal DOM-ref binding code.

---

## Outcome — Phase 2

**No code change in this dispatch.** The audit's §6 explicit ordering (M-7C-D-12 first, then bundled paired items) is correct; the items the brief identified as "safe" are actually structurally chain-blocked on M-7C-D-12's runtime-sentinel design (the new absence-representation must be ratified before the AST migration can land in a way that the gauntlet detector still works).

Recommendation for PA: dispatch M-7C-D-12 (runtime absence-sentinel design + helpers) as the next packet. With the sentinel + helpers in place, the paired items can land in single edit packets per the audit §6 recommendation.

---

## Timestamped log

- **2026-05-13T00:00Z** — Worktree verified at `agent-af78f4fb86dcb0bb9`; pwd / git-rev-parse / git-status checks pass.
- **2026-05-13T00:05Z** — Worktree HEAD was `9b98118` (older than `78555f6`). Rebased onto main; HEAD now at `78555f6`. `bun install` + `bun run pretest` pass.
- **2026-05-13T00:10Z** — Read primary.map.md + null-audit + undefined-audit. Cross-referenced §7 of 8.D for paired items.
- **2026-05-13T00:15Z** — Read `compiler/src/types/ast.ts` L1480-1590 to understand current LitExpr shape.
- **2026-05-13T00:20Z** — Grepped all `litType.*"null"` / `litType.*"undefined"` sites. Identified parser (L987/L1187/L1192/L1197/L1233/L1258/L1316/L1483) + component-expander (L751) + gauntlet (L167/L168/L351+/L378+/L413+/L607) + emitStringFromTree (L1595/L1596) coupling.
- **2026-05-13T00:25Z** — Read gauntlet-phase3-eq-checks.js L340-425 to confirm the AST-level detection path.
- **2026-05-13T00:30Z** — Grepped tests/unit/gauntlet-s19/null-coverage.test.js — confirmed regression-guard tests assert E-SYNTAX-042 fires on `== null` / `!= null` / `== undefined` / `!= undefined`.
- **2026-05-13T00:35Z** — Inspected VALUE_KEYWORDS in tokenizer.ts L724 + ast-builder.js L2153 + LOGIC_SCOPE_GLOBAL_ALLOWLIST in type-system.ts L3143. Confirmed each set is load-bearing for the parser→gauntlet pipeline.
- **2026-05-13T00:40Z** — Final classification produced (above).
- **2026-05-13T00:45Z** — Decision: DO NOT mutate code in this dispatch. Surface chain-block to PA as the load-bearing finding.
