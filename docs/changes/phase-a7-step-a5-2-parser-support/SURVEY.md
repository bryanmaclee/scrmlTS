---
title: A5-2 Phase 0 SURVEY — parser support for §51.0.M-Q
date: 2026-05-08
session: S70
worktree: agent-ac20dd0bc553333e5
worktree-base: cb73f41 (BRIEF.md commit on main)
status: SURVEY COMPLETE — awaiting PA acknowledgment before implementation
predecessor: BRIEF.md (cb73f41)
---

## §0 Survey methodology

Read every file/section in BRIEF §10 read-list. Cross-checked with primer §13.7
B14/B15/B17/B20 specifics blocks. Verified each §3.X best-guess against current
HEAD (now `cb73f41`).

**Worktree state at survey time:**
- WORKTREE_ROOT: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ac20dd0bc553333e5`
- HEAD: `cb73f41` (fast-forwarded from `f59bbcc` to pick up BRIEF.md)
- Tree: clean
- `bun install`: completed (114 packages)
- `bun run pretest`: completed (samples/compilation-tests/dist populated)

---

## §1 Locus confirmation — file + line ranges per §4.1 deliverable

### §1.1 Deliverable 1 — `<onTimeout>` element inside engine state-child bodies

**Brief best-guess:** `engine-statechild-parser.ts`, `symbol-table.ts` (new type), `ast.ts`.

**Confirmed locus (corrected):**
- **`compiler/src/engine-statechild-parser.ts:276-388`** — `parseEngineStateChildren` function. Extension point: after `bodyRaw` is extracted (currently at line 380), add a body-level scan for `<onTimeout ...>` (or `<onTimeout .../>` self-close) and capture each as `OnTimeoutEntry { after: string; to: string; rawOffset: number }`. Add results to the new field on `EngineStateChildEntry.onTimeoutElements`.
- **`compiler/src/symbol-table.ts:312-343`** — `EngineStateChildEntry` shape. Extension: +4 fields per BRIEF §3.2 (`historyAttr`, `internalRule`, `onTimeoutElements`, `innerEngines`). Plus 2 new exported types: `OnTimeoutEntry`, `NestedEngineEntry`.
- **`compiler/src/types/ast.ts`** — **NO CHANGE NEEDED.** `engine-decl` AST nodes are constructed as plain JS objects in ast-builder.js (line 8696-8725); `ast.ts` does not declare an `EngineDeclNode` interface. Adding `parallelAttr: boolean` is a JS-object field addition only.

**Body-level scan pattern:** `<onTimeout>` is self-closing per §51.0.M form `<onTimeout after=DURATION to=.Variant/>`. Scan via regex `/<onTimeout\b([^>]*?)\/>/g` over `bodyRaw`. Each match's attribute slice is parsed for `after=` and `to=` literal values. `rawOffset` is `bodyRaw`-relative. The scan is conservative — `<onTimeout>` with explicit closer `<onTimeout>...</onTimeout>` is not in spec form (not self-closing) and would be left to A5-3 typer to surface.

**Span integrity:** `rawOffset` on `OnTimeoutEntry` is the start of `<` within `bodyRaw`. Absolute file offset is reconstructable by adding `engine-decl.span.start` + offset of `bodyRaw` start within `rulesRaw` + the `OnTimeoutEntry.rawOffset`. Mirrors the B15 deferral pattern.

### §1.2 Deliverable 2 — `history` bare attribute on engine state-child openers

**Brief best-guess:** `engine-statechild-parser.ts`.

**Confirmed locus:**
- **`compiler/src/engine-statechild-parser.ts:296-333`** — opener-attribute scan. Currently extracts only `rule=` via regex line 322. Extension: after `tagMatch` (line 304), scan `afterTag` for the bare token `history` (similar to ast-builder's `pinned` recognition pattern at line 8601: `/\bpinned\b(?!\s*=)/`). Set `historyAttr: boolean` on the resulting `EngineStateChildEntry`.

**Bare-attribute regex:** `/\bhistory\b(?!\s*=)/`. Negative lookahead avoids false-match on a hypothetical `history=...` attribute (not currently in spec).

**No tokenizer change needed** — opener attribute scanning happens entirely inside `engine-statechild-parser.ts` operating on raw text (`rulesRaw`).

### §1.3 Deliverable 3 — `internal:rule=` prefix on engine state-child openers

**Brief best-guess:** `engine-statechild-parser.ts`, possibly `tokenizer.ts`.

**Confirmed locus (corrected — tokenizer NOT touched):**
- **`compiler/src/engine-statechild-parser.ts:319-333`** — `rule=` extraction block. Extension: add a parallel extraction for `internal:rule=` BEFORE the canonical `rule=` extraction (so the canonical-rule regex doesn't accidentally swallow it). Use the same `parseRuleAttrValue` helper (line 102) to produce an `EngineRuleForm`. Set `internalRule: EngineRuleForm` on the entry. Default value is `{ kind: "absent" }` per BRIEF §3.2.

**Tokenizer feasibility verified:**
- Main tokenizer (`compiler/src/tokenizer.ts`) does NOT explicitly enumerate attribute prefixes. `bind:`, `on:`, `onserver:`, `onclient:`, `class:` are handled generically — the colon flows through as part of the attribute name token. Lines 248, 326-367, etc. confirm.
- Engine state-child opener attribute scan is INSIDE `engine-statechild-parser.ts` operating directly on `rulesRaw` substrings — never goes through the main tokenizer. So `internal:rule=` recognition is local to `engine-statechild-parser.ts` regex.
- **Verdict: zero tokenizer change.** Local-regex-based extraction inside the engine state-child parser.

**Regex sketch:** `/(?:^|\s)internal:rule\s*=\s*(.+?)(?=\s+\w+\s*=|\s*\/?\s*$)/s` — mirrors the existing `rule=` regex (line 322) with `internal:` prefix added.

**Ordering caveat:** the `internal:rule=` regex MUST run before the `rule=` regex on the same opener text — otherwise the canonical-rule regex's lookahead could match the `internal:` prefix's `rule=` substring. Implementation: extract `internal:rule=` first, REMOVE the matched substring from a working copy of `afterTag`, then run the canonical-rule regex. Or use a non-capturing exclusion in the canonical regex's negative lookbehind. The strip-and-rerun pattern is simpler and matches the file's existing style.

### §1.4 Deliverable 4 — `parallel` bare attribute on file-scope `<engine>`

**Brief best-guess:** `ast-builder.js`, `ast.ts`.

**Confirmed locus:**
- **`compiler/src/ast-builder.js:8563-8725`** — engine-decl construction block. The `pinned` bare-attribute pattern at line 8601 is the direct precedent: `const pinnedMatch = /\bpinned\b(?!\s*=)/.test(header);`. Add a sibling: `const parallelMatch = /\bparallel\b(?!\s*=)/.test(header);`. Plumb to the engine-decl construction at line 8696, adding `parallelAttr: parallelMatch === true,` to the returned object.
- **`compiler/src/types/ast.ts`** — NO CHANGE NEEDED (no EngineDeclNode interface; engine-decl is a plain JS object).

**`engineMeta.parallelAttr` mirror:** PASS 10.A's engine-meta builder (`symbol-table.ts:3680-3694`) currently sets `parallelAttr: undefined`. Update to read from `engineDecl.parallelAttr` (the new ast-builder field) — change `undefined` to `engineDecl.parallelAttr === true`. Symmetric with how `isPinned` flows.

### §1.5 Deliverable 5 — Nested `<engine>` declarations in state-child bodies

**Brief best-guess:** `engine-statechild-parser.ts`, possibly delegating to `ast-builder.js`'s engine-decl path.

**Confirmed locus:**
- **`compiler/src/engine-statechild-parser.ts:276-388`** — `parseEngineStateChildren` function. Extension point: same as deliverable 1 — after `bodyRaw` is extracted, scan for nested `<engine ...>...</>` openers + closers within bodyRaw. Each match yields a `NestedEngineEntry { rawText: string; rawOffset: number }`. Add to `innerEngines: NestedEngineEntry[]` on the entry.
- **NO DELEGATION to ast-builder.js's engine-decl path in this dispatch.** Rationale: the ast-builder engine-decl construction (line 8563-8725) operates on a `block` from BS that already classified as an engine-form structural block. State-child bodies are RAW TEXT; nested engines inside them are not pre-classified by BS into walkable blocks. Going through ast-builder's path would require synthesizing a fake `block` shape — premature complexity for A5-2's pure-shape mandate. **A5-2 captures `rawText` + `rawOffset` only.** Future A5-3 typer may invoke the engine-decl construction logic directly (or A1c codegen may walk via the raw text). The forward-compat shape stays minimal.

**Body scan: nested `<engine>` openers.** Scan bodyRaw for `<engine\b` openers; for each, find the matching `</>` or `</engine>` closer using the same depth-tracking pattern as `findStateChildCloser` (line 209-261). Capture the slice as `rawText`. Self-closing `<engine .../>` is NOT a legal nested-engine form (an engine must contain state-children) — flag for A5-3 typer if observed.

**Composite-state-child marker:** Per BRIEF §4.1, "the composite state-child marker is `innerEngines.length > 0`". Confirmed — no separate flag needed. A5-3 typer reads `EngineStateChildEntry.innerEngines.length` to decide composite vs non-composite.

### §1.6 Deliverable 6 — `.Variant.history` target form recognition

**Brief best-guess:** `engine-statechild-parser.ts`. Phase 0 chooses Option A / B / C.

**Confirmed locus:**
- **`compiler/src/engine-statechild-parser.ts:102-163`** — `parseRuleAttrValue` function. Extension: extend the single-target regex (line 122) to admit an optional `.history` suffix; produce the §1.6 §3.3 Option A flag.

**Option A vs B vs C — recommendation: Option A.**

Per BRIEF §3.3:
- **Option A — flag on existing forms.** `{ kind: "single"; target: string; historyForm?: boolean }`. Same for `multi`-form (each target tracked individually if a multi-target list ever mixes history + non-history forms — defensive shape).
- **Option B — new shape.** `{ kind: "history"; outerVariant: string }`.
- **Option C — string-encoded.** Keep `target: ".Playing.history"` literal.

**Recommended: Option A** with a per-target flag. Rationale:
1. **Existing consumers (B15 PASS 11 at `symbol-table.ts:4355-4400`) walk `r.target` / `r.targets` for variant-membership validation against `engineMeta.variants`.** Under Option A with `historyForm: true`, those existing variant checks continue working correctly (B15 confirms `target` is a known variant; the `.history` suffix is metadata that doesn't change variant identity).
2. **Option B would force every consumer to add a new switch branch.** B15's switch at line 4335 already has 6 cases — adding a 7th breaks every walker that switches on `kind`.
3. **Option C loses static discrimination.** A5-3 typer would have to re-parse strings — fragile.
4. **B16 derived-engine consumers** (`symbol-table.ts:lookupDerivedEngineMeta`) and **A1c codegen** (`emit-machines.ts` per primer §7) read `engineMeta.stateChildren[].rule.target` — Option A is transparent to them; Option B requires shape-aware migration.

**Implementation under Option A:**
```typescript
export type EngineRuleForm =
  | { kind: "absent" }
  | { kind: "single"; target: string; historyForm?: boolean }   // +flag
  | { kind: "multi"; targets: string[]; historyForms?: boolean[] } // +parallel array
  | { kind: "wildcard" }
  | { kind: "legacy-arrow"; raw: string }
  | { kind: "parse-error"; raw: string; reason: string };
```

The `historyForms` parallel array on `multi` keeps API symmetry with `targets` (one flag per target). Most callsites can ignore them; B15 / B16 / A5-3 / A1c read them only when needed.

**Regex extension in `parseRuleAttrValue`:**
- Single-target: extend `^\.([A-Z][A-Za-z0-9_]*)$` to `^\.([A-Z][A-Za-z0-9_]*)(\.history)?$` and propagate the flag.
- Multi-target: each `.A.history` alternative parsed via the same extended regex; `historyForms[i] = true` when matched.

### §1.7 Deliverable 7 — `.Variant.history` recognition as engine-variable assignment RHS

**Brief best-guess:** `expression-parser.ts` (verification only, possibly no changes).

**CONFIRMED — ZERO SOURCE CHANGE in expression-parser.**

Verified from BRIEF §3.6:
- B20's bare-variant regex at `compiler/src/expression-parser.ts:750-753`:
  ```js
  s = s.replace(
    /(?<![A-Za-z0-9_$\)\]"'`]\s*)\.\s*([A-Z][A-Za-z0-9_]*)/g,
    '__scrml_bare_variant_$1__'
  );
  ```
  This matches `.Playing` (uppercase first letter) and replaces with `__scrml_bare_variant_Playing__`.
- After replacement, the original `.Playing.history` becomes `__scrml_bare_variant_Playing__.history`.
- Acorn parses this as `MemberExpression(Identifier("__scrml_bare_variant_Playing__"), Identifier("history"))`.
- `esTreeToExprNode` MemberExpression case (`expression-parser.ts:1070-1083`) produces `{kind: "member", object: <ident>, property: <ident>}`. The bare-variant placeholder unmasks at line 903-905 to `IdentExpr { name: ".Playing" }` (the leading-dot form).
- Result: `MemberExpr { object: IdentExpr ".Playing", property: IdentExpr "history" }` — a structured AST node.

**`shouldSkipExprParse` admission verified:**
- `compiler/src/ast-builder.js:138`: `if (/^\s*\./.test(t) && !/^\s*\.\s*[A-Z]/.test(t)) return true;`
- For `.Playing.history`: starts with `.`, followed by `P` (uppercase) → does NOT skip. The expression-parser receives the string and B20's regex handles the `.Playing` mask; the trailing `.history` is plain JS member access.

**No new helper, no new placeholder, no source-side code change.** A5-2 may add a recognition note + light unit-test verification (e.g., a test asserting that `.Playing.history` parses to the expected `MemberExpr` structure). The downstream A5-3 typer interprets the resulting MemberExpr structure semantically — A5-3's territory.

---

## §2 Body-walk feasibility — load-bearing cost question

**Question:** does `engine-statechild-parser.ts` currently walk into state-child bodies enough to find `<onTimeout>` siblings + nested `<engine>` declarations? Or does the body-walk need a substantial advance?

**Verdict: NO substantial body-walk advance needed. A5-2's body-scan is a localized regex pass over `bodyRaw`, paralleling the existing top-level `rulesRaw` scan.**

**Reasoning:**
1. The existing parser at line 359-365 finds the matching closer for each state-child via `findStateChildCloser`, then captures `bodyRaw = rulesRaw.slice(bodyStart, bodyEnd)`. After that, A5-2's body scan operates on `bodyRaw` itself — the same regex/depth-tracking patterns used at the top level can be applied to the body.
2. `<onTimeout>` is a self-closing structural element with a fixed tag — a simple regex `/<onTimeout\b([^>]*?)\/>/g` over `bodyRaw` finds all occurrences without needing a full XML body parse.
3. Nested `<engine>` declarations are bracketed by `<engine ...>` ... `</>` (or `</engine>`). The same `findStateChildCloser`-style depth tracker (already present at lines 209-261) can be reused (refactored to take a configurable tag parameter, OR copied and specialized).
4. No tokenizer change. No BS change. No ast-builder restructure. Engine-decl AST node remains "raw body string at top level"; the structural extraction happens at ONE deeper level inside `engine-statechild-parser.ts`.

**Edge cases A5-2 must handle:**
- `<onTimeout>` inside a nested `<engine>`'s body must be associated with the INNER engine's state-child, not the OUTER. **Solution:** when the body-scan encounters a nested `<engine>` opener, SKIP its full body region (find the closer, advance past it) before continuing the `<onTimeout>` sibling scan. The inner engine's `<onTimeout>` siblings will be picked up when A5-3 (or a recursive A5-2 invocation) processes the nested engine's own `bodyRaw`.
- `<onTimeout>` inside a `${...}` interpolation block — not legal per §51.0.M (`<onTimeout>` is a structural element, not an expression). Skip via `${...}` interpolation skip pattern (already at lines 213-224).
- `<onTimeout>` inside a string literal — extremely unlikely but defensible: scan respects quote context (mirror the `findOpenerEnd` in-quote tracker at lines 178-184).

**Cost decomposition:**
- Body-scan helpers: `scanForOnTimeout(bodyRaw): OnTimeoutEntry[]` and `scanForNestedEngines(bodyRaw): NestedEngineEntry[]`. Each ~30-50 LOC. **Estimate: ~80-120 LOC parser-side.**
- Opener-attribute extension (history bare + internal:rule= prefix): ~30-50 LOC parser-side.
- ast-builder.js parallel attr: ~5 LOC.
- symbol-table.ts type extensions + PASS 10.A registration: ~30 LOC.
- expression-parser.ts: ZERO CHANGE.
- tokenizer.ts: ZERO CHANGE.
- ast.ts: ZERO CHANGE (engine-decl is plain JS object).
- **Total source delta: ~150-200 LOC.**

**No body-walk advance (BS/parser-level) needed.** The structural extraction happens entirely within `engine-statechild-parser.ts` operating on raw text.

---

## §3 `.Variant.history` expression-parser path — verified

**Verdict: zero source change in `expression-parser.ts`.**

Verified by tracing the regex transformation:
1. Input: `@appMode = .Playing.history`
2. After B20's `preprocessForAcorn` regex line 750-753: `@appMode = __scrml_bare_variant_Playing__.history`
3. Acorn parses: `AssignmentExpression(@appMode, MemberExpression(Identifier "__scrml_bare_variant_Playing__", Identifier "history"))`.
4. `esTreeToExprNode` MemberExpression case at line 1070-1083 produces `MemberExpr`.
5. The bare-variant placeholder unmask at line 903-905 turns the inner identifier into `IdentExpr { name: ".Playing" }`.
6. Final: `AssignExpr { left: <@appMode>, right: MemberExpr { object: IdentExpr ".Playing", property: IdentExpr "history" } }`.

A5-3 typer recognizes this MemberExpr-on-bare-variant pattern as the §51.0.N `.Variant.history` target form. No A5-2 source change.

**Recommendation:** A5-2 unit tests include 1-3 cases that verify `.Variant.history` parses to the expected MemberExpr shape (anchoring the contract for A5-3). Pure verification — no source change.

---

## §4 Tokenizer `internal:` prefix feasibility — verified

**Verdict: zero source change in `tokenizer.ts`.**

Confirmed:
- The main tokenizer does not enumerate attribute prefixes. The `:` is part of the generic attribute-name token (e.g., `bind:value`, `class:active`) and flows through.
- Engine state-child opener attributes are NEVER scanned by the main tokenizer — they live inside `engine-decl.rulesRaw` (raw text). The state-child opener parsing happens entirely within `engine-statechild-parser.ts` via local regex.
- `internal:rule=` recognition lives in the same local-regex pass as canonical `rule=`.

**No closed prefix registry exists.** Tokenizer is not gated.

---

## §5 Cost decomposition — sub-step recommendation

**Per BRIEF §5 estimate: ~6-9h if all extensions ride existing infrastructure; up to ~12-15h if a body-walk advance is required.**

**Survey verdict: lower end, ~7-10h, all rides existing infra.**

**Recommended single-dispatch decomposition (in order, with WIP commit after each):**

1. **Sub-step 1 — Type extensions (no logic).** Add `OnTimeoutEntry`, `NestedEngineEntry` exports to `symbol-table.ts`. Extend `EngineStateChildEntry` with `historyAttr`, `internalRule`, `onTimeoutElements`, `innerEngines`. Extend `EngineRuleForm.single` with `historyForm?: boolean`, `EngineRuleForm.multi` with `historyForms?: boolean[]`. Compile-clean checkpoint. **Est. 0.5h.**
2. **Sub-step 2 — `parallel` bare attribute on file-scope `<engine>`.** Add `parallelAttr` to `ast-builder.js` engine-decl construction. Mirror in PASS 10.A engine-meta builder. **Est. 0.5h.**
3. **Sub-step 3 — `history` bare attribute on state-child openers.** Extend `engine-statechild-parser.ts` opener-scan to recognize `history`. Set `historyAttr: boolean` on each entry. **Est. 0.5h.**
4. **Sub-step 4 — `internal:rule=` prefix on state-child openers.** Extend opener-scan to extract `internal:rule=` BEFORE canonical `rule=` (strip-and-rerun pattern). Reuse `parseRuleAttrValue` for the value. Default `internalRule: { kind: "absent" }`. **Est. 1h.**
5. **Sub-step 5 — `.Variant.history` recognition in `parseRuleAttrValue`.** Extend single-target regex + multi-target item regex to admit `.history` suffix. Set `historyForm` / `historyForms` flag. **Est. 1h.**
6. **Sub-step 6 — `<onTimeout>` body-scan.** Add `scanForOnTimeoutEntries(bodyRaw): OnTimeoutEntry[]` helper. Wire into `parseEngineStateChildren` after `bodyRaw` is captured. **Est. 1.5h.**
7. **Sub-step 7 — Nested `<engine>` body-scan.** Add `scanForNestedEngineEntries(bodyRaw): NestedEngineEntry[]` helper. Skip nested-engine body region during `<onTimeout>` scan to avoid mis-association. **Est. 1.5h.**
8. **Sub-step 8 — PASS 10.A flow-through.** Update `symbol-table.ts:3680-3694` engineMeta builder to populate `parallelAttr` from engineDecl. PASS 11 (B15) already populates `stateChildren`; A5-2's extended `EngineStateChildEntry` flows through transparently — confirm by reading existing test fixtures. **Est. 0.5h.**
9. **Sub-step 9 — Unit tests.** New file `compiler/tests/unit/a5-2-parser-support.test.js` per BRIEF §6.1 sections §A5-2.1 through §A5-2.10. **Target: 35-50 tests. Est. 2-3h.**
10. **Sub-step 10 — Full-suite regression check.** Run `bun run test`, confirm baseline 9,626 → 9,626 + N new (where N is the test count from sub-step 9), 0 fail. **Est. 0.5h.**

**Total estimate: ~9-10h, single dispatch, all WIP-committable.**

**Recommended commit cadence:**
- Sub-step 1: WIP commit `a5-2: type extensions for OnTimeout/NestedEngine + history flag`.
- Sub-step 2: WIP commit `a5-2: parallel bare attribute on file-scope engine`.
- Sub-step 3-4: WIP commit `a5-2: history + internal:rule= state-child opener attrs`.
- Sub-step 5: WIP commit `a5-2: .Variant.history recognition in parseRuleAttrValue`.
- Sub-step 6-7: WIP commit `a5-2: <onTimeout> + nested <engine> body-scan helpers`.
- Sub-step 8: WIP commit `a5-2: PASS 10.A parallelAttr flow-through`.
- Sub-step 9-10: SHIP commit `feat(a5-2): SHIP — parser support for §51.0.M-Q (S67 ratified extensions)`.

Per pa.md: WIP commits after each meaningful unit. Final SHIP can squash via `git commit --amend` if desired.

---

## §6 `EngineRuleForm.historyForm` recommendation — Option A

**Final recommendation (re-stated from §1.6): Option A.**

```typescript
export type EngineRuleForm =
  | { kind: "absent" }
  | { kind: "single"; target: string; historyForm?: boolean }
  | { kind: "multi"; targets: string[]; historyForms?: boolean[] }
  | { kind: "wildcard" }
  | { kind: "legacy-arrow"; raw: string }
  | { kind: "parse-error"; raw: string; reason: string };
```

**Downstream consumer survey (verified):**
- **B15** (`symbol-table.ts:4332-4402`): switch on `r.kind` → reads `r.target` / `r.targets`. Option A is transparent — adding optional fields doesn't break the switch.
- **B16** (per primer §13.7 B16 specifics): reads `engineMeta.stateChildren` via the same shape; no shape-aware code there. Transparent.
- **B17** (per primer §13.7 B17 specifics): mostly synthesized-AST tests; doesn't read `EngineRuleForm`.
- **B18** (`symbol-table.ts:4418-4436`): reads `sc.isColonShorthand` + `sc.bodyRaw`. Doesn't touch `rule`. Transparent.
- **A1c codegen** (per primer §7 — `emit-machines.ts:478-714`): future consumer; will need to know `historyForm` flag for the lowering. Option A puts the flag exactly where A1c expects to find it (alongside `target` / `targets`).

**Option A wins on minimal blast radius.** Approved.

---

## §7 SCOPE CORRECTIONS to BRIEF

**Per BRIEF §5: "Phase 0 must include any SCOPE CORRECTIONS."**

### §7.1 No structural deliverable shifts to A5-3.
All seven §4.1 deliverables remain in A5-2 scope. Each is achievable as pure parser-shape extension without typer logic.

### §7.2 No unanticipated touch-points.
Tokenizer + ast.ts + BS are NOT touched (BRIEF correctly anticipated this for tokenizer; survey confirms ast.ts also untouched per the JS-object construction pattern).

### §7.3 Pre-Stage-2 lint pass — `<onTimeout>` is not a ghost-pattern.
`compiler/src/lint-ghost-patterns.js` line 353-357 catalogs `on[A-Z]` as W-LINT-004 — but it operates on HTML attribute names like `onClick=`, not on tag-shaped occurrences `<onTimeout>`. Verified: zero churn. **No lint catalog change.**

### §7.4 BS classifier unchanged.
The block-splitter classifies `<onTimeout/>` and nested `<engine>` declarations inside engine-decl bodies based on BS's structural rules. Since those occurrences appear inside `engine-decl.rulesRaw` (raw text — BS already DOES NOT walk engine bodies), no BS change is needed. The whole structural extraction is local to `engine-statechild-parser.ts`.

### §7.5 Self-closing `<engine .../>` form is NOT introduced.
Per §51.0.B, an engine declaration ALWAYS has a body (state-children). A self-closing `<engine .../>` opener is an error case that A5-3 typer can flag (or A5-2 can flag as `parse-error`-shape entry per BRIEF §4.3). For nested-engine recognition, A5-2 finds the matching `</>` or `</engine>` closer and captures the body region. Self-closing form is NOT a recognized shape.

### §7.6 `historyForms` parallel array on multi — defensive shape.
A spec-pure reading: a multi-target list `(.A.history | .B.history)` is unusual but not forbidden. Per §51.0.N: ".Variant.history... usable wherever .Variant is legal as a rule= target." Spec doesn't forbid mixing within a multi-list. Defensive `historyForms: boolean[]` parallel array supports mixed lists without API churn. Most cases will have all `false` or all `true`; mixed cases are tolerated.

---

## §8 Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| `<onTimeout>` body-scan mis-counts when nested engines are present (sees inner engine's `<onTimeout>` as outer's sibling). | Medium | Sub-step 6/7 ordering: nested-engine scan FIRST captures inner-body regions; `<onTimeout>` scan SKIPS those regions. Tests §A5-2.5 + §A5-2.7 codify. |
| `internal:rule=` regex collides with canonical `rule=` regex's lookahead. | Low | Strip-and-rerun pattern: extract `internal:rule=` first, remove the matched substring before running the canonical `rule=` regex. Tests §A5-2.3 + §A5-2.7 codify. |
| `historyForm` flag mis-set when `.X.history` appears in a multi-target list. | Low | Per-target parsing in `parseRuleAttrValue` sets `historyForms[i]` independently. Tests §A5-2.6 codify. |
| `.Variant.history` parses to wrong shape in expression-parser (regex matches `.Playing.history` as `.Playing` + member). | Low — zero-source-change bet. | Add unit test §A5-2.6 verifying the resulting MemberExpr shape. If wrong, escalate to PA — this is the only zero-source-change bet in the dispatch. |
| `parallel` bareword regex matches inside attribute values (e.g., `name=parallel`). | Low | Use `\bparallel\b(?!\s*=)` with negative-lookahead — same pattern as `pinned` (verified working since B14). |
| BRIEF §6.1's 35-50 test count overshoots feasible scope. | Low | Tests are unit tests on parser shape — proven achievable in B15 (43 tests) and B14 (36 tests). Scope is consistent with peers. |
| 0-regression contract violated. | Critical | Run `bun run test` between each WIP commit. Halt + diagnose at first regression — never push forward through a fail. Per BRIEF §6.3 baseline is 9,626 / 0 fail / 60 skip / 1 todo. |

---

## §9 Recommendation

**Proceed as briefed.** All seven §4.1 deliverables map to existing-infra extensions with zero tokenizer/ast.ts/BS churn. Total source delta ~150-200 LOC + 35-50 unit tests. Estimated 9-10h, single dispatch, all WIP-committable.

**Option A on `EngineRuleForm.historyForm` confirmed.** Transparent to all downstream consumers (B15/B16/B17/B18/A1c).

**`.Variant.history` zero-source-change in expression-parser CONFIRMED** (with one verification unit test as anchor).

**No scope amendments needed.** Survey confirms BRIEF §3.X best-guesses are accurate or tighter than estimated. Tokenizer / ast.ts / BS untouched.

**Ready for PA acknowledgment + implementation authorization.**

---

## §10 References

- BRIEF.md (this dispatch's brief) — `docs/changes/phase-a7-step-a5-2-parser-support/BRIEF.md`
- `compiler/SPEC.md:20503-20988` — §51.0.M through §51.0.Q
- `compiler/src/symbol-table.ts:200-310` — EngineMetadata + EngineStateChildEntry shapes
- `compiler/src/symbol-table.ts:3680-3720` — PASS 10.A engine registration
- `compiler/src/symbol-table.ts:4218-4437` — PASS 11 B15 walker (confirms how `EngineStateChildEntry` flows downstream)
- `compiler/src/engine-statechild-parser.ts` (full file) — primary touch-point
- `compiler/src/expression-parser.ts:686-772` — preprocessForAcorn (B20 bare-variant regex)
- `compiler/src/expression-parser.ts:903-906` — bare-variant placeholder unmask
- `compiler/src/ast-builder.js:119-142` — shouldSkipExprParse leading-dot relaxation (B20)
- `compiler/src/ast-builder.js:8563-8725` — engine-decl construction (parallel attr add point)
- `docs/PA-SCRML-PRIMER.md:664-768` — B14/B15/B17/B20 specifics blocks (load-bearing context)
