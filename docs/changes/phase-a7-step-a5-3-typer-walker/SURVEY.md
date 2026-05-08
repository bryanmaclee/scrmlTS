---
title: A5-3 Phase 0 SURVEY — typer + symbol-table walker for §51.0.M-Q
date: 2026-05-08
session: S70
worktree: agent-a61fa13bc731b14bb
worktree-base: 364b44f (BRIEF.md commit on main; rebased from f59bbcc to pick up A5-2 SHIP `bdc491c` + BRIEF)
status: SURVEY COMPLETE — awaiting PA acknowledgment before implementation
predecessor: BRIEF.md (364b44f)
---

## §0 Survey methodology

Read every file/section in BRIEF §9 read-list. Cross-checked with the A5-2 SURVEY
(`docs/changes/phase-a7-step-a5-2-parser-support/SURVEY.md`) since that survey
established the AST contracts A5-3 consumes. Verified each BRIEF §3.X best-guess against
current HEAD `364b44f`.

**Worktree state at survey time:**
- WORKTREE_ROOT: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a61fa13bc731b14bb`
- HEAD: `364b44f` (rebased from `f59bbcc` to pick up A5-2 SHIP `bdc491c` + BRIEF.md `364b44f`)
- Tree: clean (one bun.lock noise from `bun install`, immaterial)
- `bun install`: 114 packages
- `bun run pretest`: 12 samples compiled
- Baseline `bun run test`: **9,628 pass / 60 skip / 1 todo / 0 fail** — matches BRIEF §4.4

---

## §1 Locus confirmation — file + line ranges per §4.1 fire-site

Below: 12 fire-site rows from BRIEF §4.1 mapped to existing source loci. Two
**KEY FINDINGS** are surfaced inline (callout in §10 SCOPE CORRECTIONS).

### §1.1 Fire-site #1 — E-HISTORY-NO-INNER-ENGINE (NEW)

**Condition:** `entry.historyAttr === true && entry.innerEngines.length === 0`.

**Fire-site:** NEW PASS 16 walker, iterating `engineMeta.stateChildren[]` for each
`engine-decl`. Reads A5-2-populated `EngineStateChildEntry.historyAttr` +
`EngineStateChildEntry.innerEngines`.

**No existing fire-site.** Brand-new code from §34 catalog row 14250 (S67).

**Reuse pattern:** mirrors B15's per-state-child loop (`symbol-table.ts:4408-4478`),
firing per-entry diagnostics with engine-decl span fallback (the `fireB15Diagnostic`
helper at line 4269-4281 is reusable verbatim — rename to `fireA5Diagnostic` or share
generically).

### §1.2 Fire-site #2 — E-INTERNAL-RULE-NOT-COMPOSITE (NEW)

**Condition:** `entry.internalRule.kind !== "absent" && entry.innerEngines.length === 0`.

**Fire-site:** NEW PASS 16, same loop as #1. Reads `internalRule.kind`.

**No existing fire-site.** Brand-new code from §34 catalog row 14251 (S67).

### §1.3 Fire-site #3 — `<onTimeout to=>` not in `rule=` (E-ENGINE-INVALID-TRANSITION)

**Condition:** for each `entry.onTimeoutElements[i]`, validate `to` against `entry.rule`
per §51.0.F target-only forms. The check:

| `entry.rule.kind` | Legality of `<onTimeout to=.X/>` |
|---|---|
| `absent` | reject — terminal state has no transitions; `to=.X` cannot fire |
| `wildcard` | accept — escape hatch |
| `single` | accept iff `r.target === toEntry.to` (single match) |
| `multi`  | accept iff `r.targets.includes(toEntry.to)` |
| `legacy-arrow` / `parse-error` | already surfaced by B15; A5-3 does NOT double-fire — skip onTimeout legality when rule= is malformed |

**Fire-site:** NEW PASS 16, per-state-child loop, nested per-onTimeout loop.

**KEY FINDING #1 — first-ever E-ENGINE-INVALID-TRANSITION compile-time fire-site.**
The §34 catalog row says "Statically rejected when from-state is known; runtime-thrown
otherwise." Today, NO compile-time fire-site exists in the codebase
(`symbol-table.ts:4150,4544,6009` are all DEFERRED comments — verified by `grep`). So
A5-3's `<onTimeout to=>` legality check is the **first** compile-time
E-ENGINE-INVALID-TRANSITION fire-site. The check is well-bounded: `<onTimeout>` IS the
from-state (the surrounding state-child), so static-from-state is GIVEN.

This is per-spec valid — §51.0.M line 20567 says "Validated **compile-time** when
`rule=` is statically known (always true on engine state-children — the from-state IS
this state-child)." So A5-3 is statically privileged here.

### §1.4 Fire-site #4 — `<onTimeout to=>` not a variant of `for=Type` (E-ENGINE-RULE-INVALID-VARIANT)

**Condition:** `to` not in `engineMeta.variants`.

**Fire-site:** NEW PASS 16, same loop as #3. Reuses `engineMeta.variants` (populated by
PASS 11 / B15 BEFORE A5-3 runs — pipeline-order verified at
`symbol-table.ts:5999-6017` runs PASS 11 first, then PASS 12, 13, 14, 15; A5-3 PASS 16
runs at the end).

**Pattern:** mirrors B15's `case "single"` block (`symbol-table.ts:4431-4444`).

**Ordering note:** fire-site #3 (legality vs `rule=` set) and #4 (variant membership)
are independent — both can fire on the same `<onTimeout/>` if `to=.Bogus` AND
`.Bogus ∉ engineMeta.variants`. The dual-fire is intentional per §51.0.M: the variant
check is the type-safety guarantee (it's a variant of the engine's enum); the legality
check is the from-state contract. Both should surface for the developer.

### §1.5 Fire-site #5 — `<onTimeout>` outside engine state-child (E-STRUCTURAL-ELEMENT-MISPLACED)

**Condition:** `<onTimeout/>` element appears outside an engine state-child body.

**KEY FINDING #2 — REACHABILITY DEFERRAL.** A5-2 captures `<onTimeout/>` ONLY inside
`engine-statechild-parser.scanForOnTimeoutEntries` operating on
`EngineStateChildEntry.bodyRaw`. **A `<onTimeout/>` element appearing outside an
engine state-child body is NOT visible to A5-3 today** — it would sit in markup or
component-def.raw or some other non-walkable region. The same precondition gating
`<onTransition>` placement enforcement (`symbol-table.ts:5130` — "element not
tokenized") gates `<onTimeout>` placement enforcement.

**Verification:** `grep` for `STRUCTURAL-ELEMENT-MISPLACED` across `compiler/src/`
returns ZERO source-side fire-sites — only catalog text. The catalog row exists; no
code fires it; reachability is gated on a future markup-walker (B17 / A5-3 / a future
dispatch).

**Recommendation: scope-defer fire-site #5.** A5-3 cannot fire E-STRUCTURAL-ELEMENT-
MISPLACED for `<onTimeout>`-outside-engine-state-child without infrastructure that
doesn't exist in v0.next P1 (a markup walker that tokenizes `<onTimeout>` everywhere).
This is the same DEFERRED status as `<onTransition>` placement enforcement. **A5-3 should
explicitly defer this fire-site to a future markup-walker dispatch.** The
spec-requirement is acknowledged; no new spec amendment needed; the deferral is per-
infrastructure-precondition.

### §1.6 Fire-site #6 — `<onTimeout>` inside `<match>` block-form arm (E-STRUCTURAL-ELEMENT-MISPLACED)

**Same deferral as #5.** `<match>` block-form arm walking is also gated on a future
markup walker (`symbol-table.ts:5134` — "block-form match not parsed"). A5-3 cannot
reach this fire-site today.

**Recommendation: scope-defer fire-site #6.** Same precondition.

### §1.7 Fire-site #7 — Cascade-miss diagnostic (message extension on E-ENGINE-INVALID-TRANSITION)

**Condition:** when a write inside a composite is rejected by outer's `rule=`, extend
message to name BOTH engines.

**KEY FINDING #3 — DEFERRAL TIED TO E-ENGINE-INVALID-TRANSITION COMPILE-TIME WRITE
ENFORCEMENT.** The cascade-miss diagnostic is a message-shape extension on direct-write
detection. **Direct-write detection inside engine state-child bodies is DEFERRED**
(per `symbol-table.ts:4150` and `:4544` — "bodies are RAW TEXT — no walkable children
today"). With no detection of "direct write inside composite is rejected by outer's
rule=" in the code today, there is no fire-site to extend the message on.

**Recommendation: scope-defer fire-site #7.** A5-3 SHOULD NOT introduce direct-write
compile-time enforcement de novo — that's a separate dispatch (state-child-body-walker
landing) of substantial scope. The cascade-miss diagnostic IS scoped to the
direct-write fire-site that doesn't yet exist.

**Counter-option (NOT RECOMMENDED):** A5-3 could implement `bodyRaw`-text-scan for
top-level engine-variable writes inside composite bodies and validate against outer's
`rule=`. But this duplicates the body-walk infrastructure that A5-3 explicitly avoids
(per §1.8 / inner-engine-recursion question, see §3 below) — it's a much larger
dispatch and out of A5-3 scope. Defer.

### §1.8 Fire-site #8 — `internal:rule=` variant validation (E-ENGINE-RULE-INVALID-VARIANT)

**Condition:** each target in `internalRule` not in `engineMeta.variants`.

**Fire-site:** NEW PASS 16, per-state-child loop. Mirrors B15's `case "single"` /
`case "multi"` blocks for canonical `rule=` (`symbol-table.ts:4431-4477`) — same logic
applied to `entry.internalRule`.

**Reuse:** the same switch shape from B15 can be lifted into a helper
`validateRuleAttrVariants(rule: EngineRuleForm, variants: string[], variantSet: Set,
forType, varName, sc, errors, ...)` and called twice — once for `entry.rule` (already
done by B15 in PASS 11), once for `entry.internalRule` (A5-3 in PASS 16). This avoids
duplicating the switch.

**Implementation:** new helper in `symbol-table.ts` near the existing B15 logic; both
PASS 11 and PASS 16 invoke it. Or A5-3's PASS 16 inlines the validation specifically
for `internalRule` (smaller blast radius).

### §1.9 Fire-site #9 — `.Variant.history` target variant validation (E-ENGINE-RULE-INVALID-VARIANT)

**Condition:** the variant component (sans `.history`) of a `.Variant.history` target,
in canonical `rule=` OR `internal:rule=`, is not a variant.

**KEY FINDING #4 — ALREADY HANDLED BY B15 (transparently).** Per A5-2 SURVEY §1.6, the
`historyForm: boolean` flag rides existing `EngineRuleForm.single` / `multi` shapes;
the `target` / `targets` field carries the variant name (sans `.history`). B15's
existing variant validation (`symbol-table.ts:4431-4477`) reads `r.target` /
`r.targets` and validates against `engineMeta.variants` — TRANSPARENT to the new
`historyForm` flag. **This means B15 today already validates `.Playing.history` as
"is `Playing` a variant?" without any A5-3 code change.**

**Verification needed:** confirm with a test — does B15 fire E-ENGINE-RULE-INVALID-VARIANT
on `<Paused rule=.UnknownVariant.history>`? Per the parser flow (parseRuleAttrValue
strips `.history` and sets `historyForm: true`, leaving `target: "UnknownVariant"`),
the existing B15 switch hits `target = "UnknownVariant"`, validates against the variant
set, and fires correctly. **Verified by reading `parseRuleAttrValue` at
`engine-statechild-parser.ts:147+`** (the regex extracts `target` sans `.history`, sets
the flag).

**Recommendation:** A5-3 does NOT need new code for fire-site #9. The validation
runs for free via B15's existing path. Add 2-3 unit tests to A5-3 test file confirming
this transparency — anchors the contract for codegen consumers.

### §1.10 Fire-site #10 — Engine in component body (extends B17)

**Status: existing B17 walker `walkRejectEnginesInComponentDefChildren`
(`symbol-table.ts:5156-5208`) already fires E-COMPONENT-ENGINE-SCOPE on engine-decls
inside component-def.defChildren.**

**A5-3 extension question:** does A5-3 need to extend B17 to detect nested-engine
patterns inside the COMPONENT BODY (i.e., the component's `raw` markup body, not
defChildren)? Per BRIEF §4.1 row 10 — A5-3 "extends to A5-2-discovered nested patterns
when applicable."

**Reading:** A5-2's `NestedEngineEntry` captures inner `<engine>` declarations inside
state-child bodies — NOT inside component bodies. So there is no A5-2-side data point
that lets A5-3 detect `<engine>` inside component `raw` markup. The B17 deferral
(`symbol-table.ts:5131-5132` — "engine-decl inside the component-def `raw` markup body
(component body markup not parsed)") still applies.

**Recommendation:** A5-3 does NOT extend B17 for this in this dispatch. The defChildren
walker covers what's reachable. If a component body somehow gets an engine via
defChildren AND that engine has nested inner engines via A5-2 capture, B17's existing
walker still fires E-COMPONENT-ENGINE-SCOPE on the OUTER engine-decl (which is
sufficient — the inner engines' validity is moot if the outer is rejected).

### §1.11 Fire-site #11 — Engine in function/snippet body (extends B17)

**Reading:** function-decl bodies are walkable (per `ast-builder.js:4639,5720,6542,6690`).
`function-decl.body` is an array of nested AST nodes. Engines authored as JS-style
expressions inside a function body would need to be reachable via the AST walker.

**Analysis of current parser behavior:**
- Per `ast-builder.js:9149-9151` (cited in B17 comments): "engine-decl nodes are
  children of markup (program), not logic." Engines are markup children of the
  top-level `<program>` block, not logic statements.
- A `<engine>` declaration inside a function body would be markup-as-value, not a
  logic statement. The parser MAY classify it as markup-block; or MAY reject it at
  block-splitter time; behavior unverified.
- Snippet "bodies" don't exist as AST nodes — snippets are typed component props
  (per `component-expander.ts:148-149`), not separate decls. So "snippet body" reduces
  to "snippet-typed prop value" which is component-def territory.

**Verification approach:** write 1-2 negative-path tests during implementation —
attempting to author `<engine>` inside a function-decl body and confirm the resulting
SYM diagnostic state. If the parser already rejects (likely — engines are markup-form,
not function-statement-form), no A5-3 walker work is needed for this fire-site. If the
parser admits, A5-3 extends B17's walker to recurse into `function-decl.body` arrays
and fire E-COMPONENT-ENGINE-SCOPE on engine-decl children.

**Per BRIEF §4.1: "E-COMPONENT-ENGINE-SCOPE OR new code (Phase 0 decides — reuse
existing or open a new code)."** Recommendation: REUSE E-COMPONENT-ENGINE-SCOPE.
Rationale: §51.0.K's footnote (line 20452-20454, S67 amendment) says "Engines MAY NOT
be declared inside component bodies (E-COMPONENT-ENGINE-SCOPE)." — the singleton
invariant rationale applies symmetrically to functions and snippets (a function called
N times producing N "singletons" is the same violation). The catalog row already
covers the broader rule semantically; the message just needs to name the host
("function `foo`" vs "component `Bar`").

**Cost: low if parser rejects (1-2 tests, no walker change); medium if parser admits
(walker extension + ~5-10 tests).** Phase 0 cannot definitively answer without the
test — flagged for sub-step 6 verification.

### §1.12 Fire-site #12 — `parallel` silent-ignore on nested / derived engines

**Condition:** when `engine-decl.parallelAttr === true` AND (engine is nested) OR
(engine is derived) → ignore silently per §51.0.P.

**Fire-site:** NO diagnostic — silent semantic. PASS 16 reads `parallelAttr` on inner
engines (when A5-3 recurses into `NestedEngineEntry.rawText`) and on derived engines
(`engineMeta.derivedExpr !== null`); skips the attribute without firing.

**KEY FINDING #5:** for parallel-on-nested detection, A5-3 needs to recurse into
inner engines structurally — see §3 below. Without recursion, A5-3 can't read the
inner engine's `parallelAttr`. With recursion: trivial — just don't error.

**Without recursion (deferred path):** A5-3 documents that nested-engine `parallel`
detection is deferred to A1c codegen (which will walk the nested engine's structure
regardless, for codegen). **No diagnostic and no metadata** is the simplest path —
silently ignore IS exactly what spec §51.0.P prescribes, so the absence of a fire-site
IS the implementation. **A5-3 does ZERO work for fire-site #12.** It's a no-op by
spec design.

For derived engines specifically: file-scope derived engines that carry `parallel`
(e.g., `<engine for=X derived=expr parallel>`) — A5-3 PASS 16 can detect this
combination (`meta.derivedExpr != null && meta.parallelAttr === true`) and... do
nothing per spec. So the silent-ignore IS the implementation: skip without firing.

---

## §2 Walker placement decision — NEW PASS 16

**Verdict: NEW PASS 16 (`walkValidateA5HierarchyExtensions` or similar).**

**Rationale:**
1. **Scope clarity.** A5-3 introduces composite-aware logic (history/internalRule/
   onTimeoutElements all gated on `innerEngines.length > 0`) that's structurally
   distinct from B15's scope (variant-set + per-state-child rule= form check). Mixing
   them obscures both.
2. **PASS 11 is already 230 LOC.** Adding A5-3 inline (~100-150 LOC) would push it to
   ~350 LOC of mixed-concern walker — readability cost outweighs DRY benefit.
3. **Test isolation.** A5-3 tests targeting PASS 16 specifically can mock or skip
   PASS 11 setup (similar to how B17 tests are isolated from B15). With a shared
   PASS 11, every A5-3 test would also run B15 logic.
4. **PA lean confirmed** (BRIEF §3.8). The PA-lean rationale matches survey findings.
5. **PASS 16 number:** Pipeline (per `symbol-table.ts:5999-6074`) runs 10.A → 10.B →
   11 → 12 → 13 → 14 → 15. PASS 16 is the next free number.

**Implementation:**
```typescript
// PASS 16 (A5-3) — A7 hierarchy + temporal extensions
function walkValidateEngineA5Extensions(
  nodes: any, ast: any, errors: SYMDiagnostic[], filePath: string,
  visited: WeakSet<object>,
): void { /* mirror walkValidateEngineStateChildrenAndRules shape */ }

function validateEngineA5Extensions(
  engineDecl: any, ast: any, errors: SYMDiagnostic[], filePath: string,
): void {
  const record = engineDecl._record;
  if (!record?.engineMeta) return;
  const meta = record.engineMeta;
  // 1. EngineMetadata file-scope aggregation
  // 2. Per-state-child fire-sites #1, #2, #3, #4, #8 (and inner-engine recursion)
  // 3. Engine cohesion extension if applicable
}
```

Plus B15-PASS-11 retains responsibility for:
- canonical `rule=` variant validation (already running — covers fire-site #9 transparently)
- `:`-shorthand multi-statement (already running)

A5-3 PASS 16 owns NEW responsibilities only.

---

## §3 Inner-engine recursion — A5-3 vs A1c

### §3.1 The question

A5-2 captured `innerEngines: NestedEngineEntry[]` as raw text + offset. A5-3 needs to
walk inner engines for several reasons (per BRIEF §3.4):
- Validate `<onTimeout>` legality recursively inside inner engines.
- Engine cohesion enforcement on the inner engine's body.
- Variant validation on inner engine's `for=Type`.
- EngineMetadata aggregation for the inner engine.

**Phase 0 question:** does A5-3 invoke engine-decl construction logic on `rawText` to
produce a fully-walkable inner-engine record? OR punt structural recursion to A1c?

### §3.2 Cost analysis

**Path A — A5-3 recurses structurally.** A5-3 invokes `parseEngineStateChildren` on
the inner engine's `rulesRaw` (after extracting the inner header from `rawText`).
Produces an `EngineStateChildEntry[]` for the inner engine. Recursive call into
`validateEngineA5Extensions` with the inner engine's synthesized record.

**Cost:** ~100-150 LOC of synthesis + recursion. Risk: synthesizing a fake `engineDecl`
shape from `rawText` requires header parsing (`<engine for=X initial=Y>` — extract
`for=Type`, `initial=Variant`, `parallelAttr`, etc.). The ast-builder engine-decl path
(`ast-builder.js:8563-8725`) does this work today but operates on a `block` shape from
BS, not on raw text.

**Path B — Punt to A1c.** A5-3 does NOT recurse. Inner engines remain raw text in
`NestedEngineEntry`. A1c codegen walks the raw text (it must, for lowering). Inner-
engine fire-sites are deferred to A1c — meaning E-HISTORY-NO-INNER-ENGINE on
deeper-nested composites, `<onTimeout>` legality on inner engines, etc., would not
surface compile-time until A1c lands.

**Cost:** ~zero LOC. Risk: inner-engine diagnostics surface late (codegen-time, not
SYM-time). Worse developer feedback loop.

### §3.3 Verdict — RECOMMEND PATH B (PUNT, with structural extraction helper for A5-4)

**Reasoning:**
1. **A1c codegen MUST walk inner engines anyway** for lowering (it needs the inner
   state-children to emit transition tables, history-cell synth, etc.). A1c will
   produce structured walk infrastructure as a natural part of its work. A5-3
   replicating this work risks codegen-coupling drift (A5-3's synthesis MUST match
   A1c's, or diagnostics differ from emit).
2. **A5-3 fire-sites are mostly PARENT-level checks.** Fire-sites #1 (history), #2
   (internal:rule), #3 (onTimeout legality vs `rule=` set), #4 (onTimeout variant),
   #8 (internal:rule variants), #9 (.Variant.history) — all fire on the OUTER engine's
   state-children. They reference "is `innerEngines.length > 0`" (true/false suffices —
   no walking required) and read OUTER `engineMeta.variants` + OUTER `entry.rule`.
   **None of A5-3's primary fire-sites require recursing into inner engines.**
3. **Inner-engine recursion is needed only for DEFERRED fire-sites** (cascade-miss,
   inner-engine `<onTimeout>` legality, inner-engine cohesion). Per §1.5/1.6/1.7, those
   fire-sites are already deferred for OTHER reasons (markup walker not present, body
   walker not present). Adding inner-engine recursion to A5-3 only enables fire-sites
   that are already deferred — no marginal value.
4. **Test cleanliness.** Inner-engine recursion test infrastructure is non-trivial
   (synthesizing AST nodes for inner engines). Deferring keeps A5-3's test suite
   focused on the rich set of OUTER-engine fire-sites.

**RECOMMENDATION: PATH B — punt inner-engine structural recursion to A1c.**

A5-3 reads:
- `innerEngines.length > 0` (composite marker — sufficient for fire-sites #1, #2)
- `entry.rule` / `entry.internalRule` / `entry.onTimeoutElements` / `entry.historyAttr`
  on the OUTER engine's state-children (everything needed for fire-sites #3, #4, #8)

A5-3 does NOT read inner-engine details. The `NestedEngineEntry.rawText` is
forwarded to A5-4 / A1c without inner walking.

**Forward-compat:** A1c codegen (independent phase) will introduce inner-engine
walking infrastructure that landing a future A5-3-extension dispatch (post-A1c) could
reuse for inner-engine diagnostics (cascade-miss, etc.). At that point the deferred
fire-sites #5/6/7 also become reachable through the same body-walker work. This is
an aligned-deferral pattern, not a fragmented one.

### §3.4 Variant: split into two PASS 16 sub-passes?

Considered: PASS 16.A (outer-engine validation) + PASS 16.B (inner-engine recursion).
Rejected per §3.3 — the recursion sub-pass is empty in this dispatch.

---

## §4 EngineMetadata aggregation shape

**Per BRIEF §3.7 + §4.2:**

| Field | Aggregation |
|---|---|
| `historyAttr: boolean` | OR-reduce `stateChildren[].historyAttr` |
| `internalRules: ?[]` | concat over state-children where `internalRule.kind !== "absent"` |
| `onTimeoutElements: ?[]` | concat over state-children |
| `parentEngine` | populated only when A5-3 recurses inner engines (deferred per §3) → REMAINS undefined this dispatch |
| `innerEngines: StateCellRecord[]` | populated only when A5-3 recurses inner engines (deferred per §3) → REMAINS undefined this dispatch |

**SHAPE DECISION — annotated records (NOT bare arrays).**

Per BRIEF §4.2 — "Phase 0 SURVEY decision: bare arrays vs annotated `{stateChildTag,
...}` records. Codegen consumers (A5-4) drive the choice."

**Recommendation: annotated records.**

```typescript
// On EngineMetadata:
internalRules?: Array<{ stateChildTag: string; rule: EngineRuleForm }>;
onTimeoutElements?: Array<{ stateChildTag: string; entry: OnTimeoutEntry }>;
```

**Rationale:**
1. **A5-4 codegen needs the parent state-child tag** to emit the timer arming code on
   the right state-child entry hook. A bare array forces re-correlation against
   `stateChildren[]`.
2. **Diagnostics in A5-3 already need the tag** (the message says "state-child `<X>`
   has internal:rule= but no inner engine"). The annotation aligns with how the
   diagnostic is built.
3. **Cost is one extra field per record** — negligible memory.
4. **Symmetric** — both `internalRules` and `onTimeoutElements` carry the same pattern.

Existing `EngineMetadata.internalRules?: unknown[]` (B14 declared shape at
`symbol-table.ts:279`) gets tightened to the annotated shape. Same for
`onTimeoutElements?: unknown[]` at `symbol-table.ts:285`.

`historyAttr: boolean` stays a single boolean (OR-reduce — file-level summary fact).

---

## §5 Engine cohesion extension feasibility

**Per BRIEF §3.6 + §4.1 fire-site #11.**

**B17 walker extension to function/snippet bodies:**

Today's `walkRejectEnginesInComponentDefChildren` (`symbol-table.ts:5156-5208`) recurses
into `node.children`, `node.body`, `node.consequent`, `node.alternate`, `node.arms[].body`.
**It does NOT specifically gate on component-def — it recurses everywhere.** What gates
the diagnostic firing is the `node.kind === "component-def"` check at line 5178.

**To extend to function bodies:** add a sibling check at the same place:
```typescript
if (node.kind === "function-decl" && Array.isArray(node.body)) {
  for (const child of node.body) {
    if (!child || typeof child !== "object") continue;
    if (child.kind === "engine-decl") {
      fireFunctionEngineScope(child, node.name, errors, filePath);
    }
    walkRejectEnginesInComponentDefChildren(child, errors, filePath, visited);
  }
}
```

**Code reuse:** `E-COMPONENT-ENGINE-SCOPE` is the right code per BRIEF recommendation
(reuse, don't open new). Message names "function" instead of "component" — minor
adjustment in the existing `fireComponentEngineScope` helper or a new sibling
`fireFunctionEngineScope`.

**Verdict: FEASIBLE, low risk, ~20-30 LOC.** Reuses existing walker shape.

**Open question: does the parser produce `engine-decl` AST nodes inside
`function-decl.body` arrays?** Per `ast-builder.js:9149-9151` comments, "engine-decl
nodes are children of markup (program), not logic." This suggests engines inside
function bodies would NOT appear as `engine-decl` AST nodes — the parser may classify
them as markup-blocks or reject at block-split time. **Verification: write a
parser-roundtrip test** — author `function foo() { <engine for=X>...</> }`, confirm
how the AST shapes (engine-decl in body? markup-block? error?). Sub-step 6
verification.

**If the parser already rejects the shape:** A5-3 needs to add NO new walker code for
function/snippet bodies — the cohesion check is fait-accompli at parse time. A5-3 still
adds 1-2 confirmation tests anchoring "engine inside function body is rejected" — the
contract.

**If the parser admits the shape (engine-decl appears in function-decl.body):** A5-3
extends B17's walker as outlined above. ~30 LOC + 5-8 tests.

---

## §6 `<onTimeout>` placement walker — separate or covered

**Per §1.5/1.6 above — DEFERRED per same precondition that defers `<onTransition>`
placement.** No separate walker for A5-3.

A5-2's parser captures `<onTimeout>` ONLY inside engine state-child bodies (via
`scanForOnTimeoutEntries` over `bodyRaw`). `<onTimeout>` outside an engine state-child
is NOT visible to A5-3 — it would sit in markup or component-body raw text, neither of
which is walkable for structural elements today.

**Implication:** the §51.0.M placement-rule fire-site (E-STRUCTURAL-ELEMENT-MISPLACED
for misplaced `<onTimeout>`) is **explicitly deferred** by A5-3, on the same precondition
basis as `<onTransition>` placement enforcement (B17 Phase 0 SURVEY's catalog of
deferred fire-sites). A5-3 records this deferral; doesn't fire.

---

## §7 Cascade-miss diagnostic locus — ALSO DEFERRED

**Per §1.7 above:** the cascade-miss diagnostic is a message-shape extension on the
direct-write E-ENGINE-INVALID-TRANSITION fire-site. **That fire-site does not exist
yet** (compile-time direct-write detection inside engine state-child bodies is
DEFERRED — body parser limitation per `symbol-table.ts:4150,4544`). With no fire-site
to extend, A5-3 cannot land the cascade-miss message extension de novo without first
landing the direct-write detection (out of scope per BRIEF §6).

**Recommendation: A5-3 explicitly defers fire-site #7.** A future dispatch (state-child
body walker landing, OR a dedicated direct-write enforcement dispatch) will introduce
the parent fire-site; the cascade-miss extension lands at that time.

A5-3 SHALL document this deferral in the SHIP commit and progress.md so the next dispatch
picks it up cleanly.

---

## §8 Cost decomposition — sub-step recommendation

**BRIEF estimate: 5-8h (master-list).** Survey verdict: **lower end, ~5-7h** thanks
to scope-defers in §1.5/1.6/1.7 and inner-engine recursion punt to A1c (§3.3).

**Recommended sub-step decomposition (in order, with WIP commit after each):**

1. **Sub-step 1 — Type tightening (no logic).** Tighten `EngineMetadata.historyAttr`,
   `internalRules`, `onTimeoutElements` to the annotated shapes per §4. Compile-clean
   checkpoint. **Est. 0.5h.**
2. **Sub-step 2 — PASS 16 walker scaffold + EngineMetadata aggregation.** Add new pass
   `walkValidateEngineA5Extensions` mirroring `walkValidateEngineStateChildrenAndRules`
   shape. Inside `validateEngineA5Extensions`, populate `meta.historyAttr` (OR-reduce),
   `meta.internalRules` (concat with `stateChildTag`), `meta.onTimeoutElements` (concat
   with `stateChildTag`). Wire into `runSYM` after PASS 15. Add 5-10 unit tests verifying
   aggregation contract. **Est. 1h.**
3. **Sub-step 3 — Fire-sites #1 (E-HISTORY-NO-INNER-ENGINE) + #2
   (E-INTERNAL-RULE-NOT-COMPOSITE).** In `validateEngineA5Extensions`, iterate
   state-children; fire per-entry diagnostics. ~30 LOC. Add 8-10 unit tests
   (composite/non-composite/edge cases). **Est. 1h.**
4. **Sub-step 4 — Fire-sites #3 + #4 (`<onTimeout to=>` legality + variant validation).**
   Per state-child, per `onTimeoutElement`, validate `to` against `entry.rule`
   (single/multi/wildcard/absent → diagnostic decision per §1.3) AND against
   `engineMeta.variants` (#4). ~40 LOC. Add 12-15 unit tests covering all 4 rule kinds
   plus variant-membership cases. **Est. 1.5h.**
5. **Sub-step 5 — Fire-site #8 (`internal:rule=` variant validation).** Apply B15-style
   variant check to `entry.internalRule.target` / `targets`. ~25 LOC (or refactor B15's
   helper to share — defer refactor). Add 6-10 unit tests. **Est. 0.5h.**
6. **Sub-step 6 — Fire-site #11 verification (engine-in-function body).** Author
   parser-roundtrip test: does parser produce `engine-decl` inside `function-decl.body`?
   - If REJECTED: lock in a confirmation test; no walker change.
   - If ADMITTED: extend B17 walker per §5; add 5-8 unit tests.
   **Est. 0.5-1h depending on parser behavior.**
7. **Sub-step 7 — Fire-site #9 (`.Variant.history` variant validation transparency).**
   Add 3-5 unit tests confirming B15 already validates the underlying variant. NO
   source change. **Est. 0.5h.**
8. **Sub-step 8 — Fire-site #12 verification (parallel silent-ignore on derived).**
   Add 2-3 unit tests confirming `parallel` on derived engine produces no diagnostic
   (silent-ignore per spec). NO source change. **Est. 0.25h.**
9. **Sub-step 9 — Composition test (§A5-3.12) + full-suite regression.** Author one
   compositional test exercising history + internal:rule + onTimeoutElements +
   nested-engine on a single composite state-child. Run `bun run test`; confirm
   baseline 9,628 → 9,628 + N (where N is total new tests, target 50-70). 0 fail.
   **Est. 0.5-1h.**

**Total estimate: ~5.5-7.5h, single dispatch, all WIP-committable.**

**Recommended commit cadence:**
- Sub-step 1: WIP commit `WIP(a5-3): EngineMetadata type tightening`.
- Sub-step 2: WIP commit `WIP(a5-3): PASS 16 walker scaffold + aggregation`.
- Sub-step 3: WIP commit `WIP(a5-3): E-HISTORY-NO-INNER-ENGINE + E-INTERNAL-RULE-NOT-COMPOSITE`.
- Sub-step 4: WIP commit `WIP(a5-3): <onTimeout to=> legality + variant validation`.
- Sub-step 5: WIP commit `WIP(a5-3): internal:rule= variant validation`.
- Sub-step 6: WIP commit `WIP(a5-3): engine-in-function cohesion verification`.
- Sub-step 7-8: WIP commit `WIP(a5-3): transparency + silent-ignore tests`.
- Sub-step 9: SHIP commit `feat(a5-3): SHIP — typer + symbol-table walker for §51.0.M-Q ...`.

---

## §9 Inner-engine recursion test infrastructure

Per §3.3, A5-3 PUNTS inner-engine recursion to A1c. **No inner-engine recursion test
infrastructure is needed** for this dispatch. The composition test (§8 sub-step 9)
exercises a composite state-child that HAS inner engines (so `innerEngines.length > 0`
is exercised), but doesn't recurse inside them — the contract is that A5-3's outer-
state-child diagnostics fire correctly given inner engines as a flag, not as walkable
sub-records.

If a future dispatch lands inner-engine recursion, the infrastructure choices are:
- **Synthesized AST tests** — hand-build inner-engine records and pass to
  `validateEngineA5Extensions`. Pattern: B15 `validateEngineStateChildrenAndRules`
  is exported for direct test use (`symbol-table.ts:4294`); A5-3's
  `validateEngineA5Extensions` SHOULD also be exported for the same reason.
- **Full-pipeline tests** — author scrml source with composite state-children +
  malformed inner engines; run through `splitBlocks → buildAST → runSYM`.

Both are workable; the present dispatch ships only the first (synthesized AST tests
on outer-engine state-children — already the existing B14/B15/B17 pattern).

---

## §10 SCOPE CORRECTIONS to BRIEF

Per BRIEF §5 — "Phase 0 must include any SCOPE CORRECTIONS."

### §10.1 Fire-sites #5, #6, #7 — DEFER (precondition-gated)

Three fire-sites in BRIEF §4.1 are GATED on infrastructure that doesn't exist in v0.next P1:

- **Fire-site #5** (E-STRUCTURAL-ELEMENT-MISPLACED for `<onTimeout>` outside engine
  state-child) — gated on a markup walker that tokenizes `<onTimeout>` as a structural
  element everywhere. Same precondition that defers `<onTransition>` placement
  enforcement (B17 deferral catalog).
- **Fire-site #6** (E-STRUCTURAL-ELEMENT-MISPLACED for `<onTimeout>` inside `<match>`
  block-form arm) — gated on block-form match walker.
- **Fire-site #7** (cascade-miss message extension on E-ENGINE-INVALID-TRANSITION) —
  gated on direct-write compile-time enforcement inside engine state-child bodies.
  No such fire-site exists today; A5-3 should NOT introduce it de novo (out of scope).

**A5-3 explicitly defers all three fire-sites.** SHIP commit + progress.md document the
deferral. Future dispatch (markup walker + body walker landing — likely A5-4 sequence
or post-A1c) addresses them.

**The remaining 9 fire-sites (#1, #2, #3, #4, #8, #9, #10, #11, #12) ARE in A5-3 scope
and ARE addressable.** That's the dispatch.

### §10.2 Fire-site #9 — TRANSPARENT (no A5-3 source change)

Per §1.9, the `.Variant.history` variant validation already runs through B15's existing
canonical-rule variant check transparently (because A5-2's `historyForm` flag rides
the `EngineRuleForm.single`/`multi` shape and B15 reads `target`/`targets` blind to the
flag). A5-3 verifies via tests; no new diagnostic logic.

### §10.3 Inner-engine recursion DEFERRED to A1c (per §3.3)

BRIEF §3.4 leaned toward A5-3 recursing into inner engines. SURVEY recommends opposite:
PUNT to A1c. Rationale per §3.3: A5-3's primary fire-sites don't need inner walking;
A1c will produce the recursion infrastructure naturally; A5-3 replication risks
codegen-coupling drift. **EngineMetadata fields `parentEngine` and record-level
`innerEngines: StateCellRecord[]` REMAIN undefined this dispatch** (the
state-child-level `EngineStateChildEntry.innerEngines` IS populated by A5-2 and IS
read by A5-3 — for the composite marker only).

### §10.4 EngineMetadata aggregation shape — ANNOTATED records (per §4)

BRIEF §4.2 left this open ("Phase 0 SURVEY decision"). SURVEY recommends annotated
records over bare arrays.

### §10.5 Test count adjusted

BRIEF §4.3 estimate: 40-60 unit tests. Adjusting per scope-defers (no #5/6/7 testing,
~5-10 tests not authored) and reuse-checks (#9, #12 — minimal tests):

**Adjusted estimate: 50-65 unit tests.** Slightly higher than BRIEF estimate because
fire-sites #3 + #4 each carry 4-5 sub-cases (rule.kind variants × variant-membership
matrix).

### §10.6 Test sections — adjusted plan

| Section | Tests | Notes |
|---|---|---|
| §A5-3.1 — E-HISTORY-NO-INNER-ENGINE | 6-8 | composite/non-composite/edge cases |
| §A5-3.2 — E-INTERNAL-RULE-NOT-COMPOSITE | 6-8 | parallel to §A5-3.1 |
| §A5-3.3 — `<onTimeout to=>` legality vs `rule=` | 8-10 | absent / wildcard / single / multi / legacy-arrow / parse-error cases |
| §A5-3.4 — `<onTimeout to=>` variant validation | 4-6 | known/unknown variants |
| §A5-3.5 — `<onTimeout>` placement | DEFERRED | precondition-gated (§10.1) |
| §A5-3.6 — `internal:rule=` variant validation | 6-8 | single/multi/wildcard cases |
| §A5-3.7 — `.Variant.history` variant validation | 3-5 | transparency tests (§10.2) |
| §A5-3.8 — Cascade-miss message shape | DEFERRED | precondition-gated (§10.1) |
| §A5-3.9 — Engine cohesion (function/snippet) | 3-8 | depends on parser admit/reject (§5) |
| §A5-3.10 — `parallel` silent-ignore | 3-4 | nested + derived |
| §A5-3.11 — EngineMetadata aggregation | 6-8 | OR-reduce + concat + annotation |
| §A5-3.12 — Composition | 3-5 | full feature combination |
| §A5-3.13 — Inner-engine recursive validation | DEFERRED | per §3.3 (no recursion this dispatch) |

**Total: ~50-70 tests** (matches §10.5 estimate).

### §10.7 §34 catalog rows — UNCHANGED

Both new codes (E-HISTORY-NO-INNER-ENGINE row 14250, E-INTERNAL-RULE-NOT-COMPOSITE
row 14251) already landed at A5-1. No spec amendment needed by A5-3.

### §10.8 Final SHIP commit — adjusted message

Per BRIEF §8: `feat(a5-3): SHIP — typer + symbol-table walker for §51.0.M-Q (S67
ratified extensions; E-HISTORY-NO-INNER-ENGINE + E-INTERNAL-RULE-NOT-COMPOSITE +
cascade-miss + EngineMetadata aggregation + cohesion extension)`.

**SURVEY-amended:** drop "cascade-miss" (deferred per §10.1); add "<onTimeout> compile-
time legality" (the actual primary deliverable, first compile-time E-ENGINE-INVALID-
TRANSITION fire-site per §1.3 KEY FINDING #1):

`feat(a5-3): SHIP — typer + symbol-table walker for §51.0.M-Q (S67 ratified extensions;
E-HISTORY-NO-INNER-ENGINE + E-INTERNAL-RULE-NOT-COMPOSITE + <onTimeout> compile-time
legality + EngineMetadata aggregation + cohesion extension; cascade-miss + structural-
placement DEFERRED on infrastructure preconditions)`

---

## §11 Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| 0-regression contract violated. | Critical | Run `bun run test` between each WIP commit. Halt + diagnose at first regression. Baseline 9,628 / 60 / 1 / 0. |
| Engine-in-function-body parser behavior unknown (§5). | Medium | Sub-step 6 verification test resolves; either no walker change OR ~30 LOC extension. |
| `<onTimeout>` legality validation is the FIRST compile-time E-ENGINE-INVALID-TRANSITION fire-site (§1.3). | Medium | Spec §51.0.M explicitly authorizes static check (line 20567). Tests exercise all 6 EngineRuleForm kinds × all `to=` variant cases. Regression risk localized to A5-3 file only. |
| Annotated-record aggregation shape may need amendment for A5-4 codegen consumers. | Low | A5-4 consumers haven't authored yet — A5-3's annotated shape per §4 is a defensible default; if A5-4 needs different shape, refactor cost is low (one helper function). |
| Inner-engine recursion punt creates downstream debt. | Low-Medium | Spec deferral is documented (§51.0.Q.1 — E-CELL-OUT-OF-SCOPE explicitly deferred). A1c codegen will produce recursion infra; future dispatch can add inner-engine fire-sites at that time. |
| PASS 16 ordering vs PASS 15 (channels). | Low | A5-3 owns engine-related logic only; PASS 15 (channels) is engine-orthogonal. Order PASS 15 → 16 at end of pipeline mirrors B22 → B19 sequence. No interaction. |
| §A5-3.9 (engine-in-function-body) tests may discover parser admits the shape and walker extension is needed. | Low | If discovered, sub-step 6 covers the extension (~30 LOC + tests). Sub-step boundary well-defined. |

---

## §12 Recommendation

**PROCEED with scope amendment (§10).** Out of 12 fire-sites in BRIEF §4.1:
- **9 fire-sites IN scope** for A5-3: #1, #2, #3, #4, #8, #9, #10, #11, #12.
- **3 fire-sites DEFERRED** on infrastructure preconditions: #5, #6, #7. (Same
  preconditions that defer `<onTransition>` placement and direct-write detection.)

**Inner-engine recursion DEFERRED to A1c** per §3.3 — A5-3 reads only outer-engine
state-child fields; inner-engine `rawText` is opaque. EngineMetadata's record-level
`parentEngine` / `innerEngines` REMAIN undefined this dispatch.

**EngineMetadata aggregation: annotated records** (`{stateChildTag, ...}`) for codegen
clarity per §4.

**Total estimated cost: 5.5-7.5h, single dispatch, 9 sub-steps, 50-70 unit tests.**

**SCOPE AMENDMENT SUGGESTED.** PA review the §10 deferrals (especially #7 cascade-miss,
since it was a named BRIEF §1 deliverable) and either:
- Authorize implementation as-amended (recommended) — A5-3 ships 9 of 12 fire-sites with
  3 explicit deferrals on documented preconditions.
- OR amend further if cascade-miss (or any deferred fire-site) is must-ship — would
  require expanding A5-3 scope substantially (introducing direct-write compile-time
  enforcement de novo, 1.5-3x the current estimate).

**Survey verdict: PROCEED-AS-AMENDED.** Pending PA acknowledgment.

---

## §13 References

- BRIEF.md (this dispatch's brief) — `docs/changes/phase-a7-step-a5-3-typer-walker/BRIEF.md`
- A5-2 BRIEF + SURVEY — `docs/changes/phase-a7-step-a5-2-parser-support/{BRIEF,SURVEY}.md`
- `compiler/SPEC.md:20503-20988` — §51.0.M through §51.0.Q
- `compiler/SPEC.md:14234,14243,14248,14250-14251,14259` — §34 catalog rows
- `compiler/src/symbol-table.ts:265-323` — EngineMetadata + EngineRuleForm + new entries
- `compiler/src/symbol-table.ts:367-417` — EngineStateChildEntry + new fields
- `compiler/src/symbol-table.ts:3680-3795` — PASS 10.A engine registration
- `compiler/src/symbol-table.ts:4283-4513` — PASS 11 (B15) per-engine validator
- `compiler/src/symbol-table.ts:4516-4570` — PASS 11 walker
- `compiler/src/symbol-table.ts:5085-5251` — PASS 13 (B17) cohesion walker
- `compiler/src/symbol-table.ts:5999-6074` — runSYM PASS sequencing (PASS 16 attaches
  after PASS 15)
- `compiler/src/engine-statechild-parser.ts:202-349` — A5-2 body-scan helpers
  (scanForOnTimeoutEntries + scanForNestedEngineEntries)
- `compiler/src/ast-builder.js:8563-8728` — engine-decl construction (parallelAttr)
- `compiler/tests/unit/engine-statechild-b15.test.js` — B15 test patterns (the host A5-3
  emulates structurally)
- `compiler/tests/unit/a5-2-parser-support.test.js` — A5-2 test patterns (input data
  for A5-3 tests)
- `compiler/tests/unit/engine-component-scope-b17.test.js` — B17 test patterns
  (cohesion-walker tests that A5-3 may extend if §5/§1.11 sub-step 6 finds parser admits)

---

## §14 Tags

#a7 #a5-3 #typer-walker #s67-amendments #consumes-a5-2-ast #onTimeout-legality
#history-composite-only #internal-rule-composite-only #cascade-miss-deferred
#structural-placement-deferred #engine-metadata-aggregation #engine-cohesion-extension
#parallel-silent-ignore #inner-engine-recursion-deferred-to-a1c #scope-amendment-suggested
