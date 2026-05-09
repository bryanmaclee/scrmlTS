---
title: A1c C4 Phase 0 SURVEY — Bind:* dispatch (L17)
date: 2026-05-08
session: S73 (continued)
worktree: agent-afdf0e452515a64dd
branch: worktree-agent-afdf0e452515a64dd
baseline-head: 26ce40b (post-C3, after rebase onto main)
status: SURVEY COMPLETE — verdict PROCEED-AS-BRIEFED (with locus correction inside emit-bindings.ts)
---

## §0 Methodology + worktree state

Read in full: BRIEF.md, SPEC §5.4 + §5.4.1 (lines 1210-1385), C3 SURVEY.md (full),
`compiler/src/codegen/emit-bindings.ts` (506 LOC, full), `compiler/src/codegen/binding-registry.ts`
(195 LOC, full), `compiler/src/codegen/emit-html.ts` lines 820-915 (C3 render-by-tag emission +
LogicBinding population), `compiler/src/codegen/emit-predicates.ts` exports list,
`compiler/src/codegen/emit-client.ts` lines 280-295 + 540 (registry consumption + emitBindings
invocation), `compiler/tests/unit/c3-render-spec-expansion.test.js` (parseAndRunSYM helper +
test scaffold), `compiler/tests/unit/bind-value.test.js` lines 1-300 (assertion patterns
for bind dispatch ClientJS output).

PA-PRIMER §11 (anti-patterns) + §13.7 B5/B6 specifics absorbed.

### Worktree state
- WORKTREE_ROOT: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-afdf0e452515a64dd`
- HEAD before rebase: `1ed9c22` (S72 close — pre-C0/C1/C2/C3); HEAD after rebase: `26ce40b`
  (C3 ship). Rebase clean (no conflicts).
- `bun install` → 114 packages
- `bun run pretest` → 12 samples 0 errors
- Baseline `bun run test` → **9,895 pass / 60 skip / 1 todo / 0 fail / 34,338 expects** ✓
  (matches brief's expected baseline exactly)

---

## §1 Locus confirmation — file authority

**BRIEF §file-locus authorization:** "Most likely extension to `compiler/src/codegen/emit-bindings.ts`
… A new sibling is also fine if cleaner."

**Survey verdict:** EXTEND `emit-bindings.ts`. The existing `emitBindings(ctx)` function
(line 194, the sole codegen consumer of `ctx.registry`) already runs once per file and emits
all source-level `bind:*` wiring. Adding a parallel pass over `ctx.registry.logicBindings.filter(b => b.kind === "render-by-tag")` at the end of the same function is the lowest-friction extension.

**Why not a sibling module?**
1. The bind dispatch shapes (lines 269-362) are 100% reusable for C4 — same `_scrml_reactive_get` /
   `_scrml_reactive_set` runtime API, same `_scrml_effect` wiring, same numeric/enum coercion
   patterns, same predicate-gating logic.
2. The `enumVarMap`, `reactiveTypeMap`, and `parsePredicateAnnotation`/`predicateToJsExpr`
   helpers are already imported + built once per file in `emitBindings`. Lifting these to a
   shared module to consume from a sibling C4 module is a refactoring tax with no scope
   benefit; brief authorizes inline duplication if lifting requires substantial restructuring.
3. Existing pattern: `emitBindings` already handles **three** distinct dispatch families
   (`ref=`, `bind:*`, `class:*`). Adding a fourth (`render-by-tag` → `bind:*`) is consistent
   with the file's prevailing structure.

**Decision:** Append a new top-level pass to `emitBindings` after the existing markup-walk
loop, walking `ctx.registry.logicBindings.filter(b => b.kind === "render-by-tag")`. This pass
synthesizes the bind:* wiring per the §5.4.1 dispatch table.

---

## §2 Existing infrastructure map (depth-of-survey discount)

| C4 need | Existing infrastructure | Reuse path |
|---|---|---|
| Read render-by-tag bindings from registry | `ctx.registry.logicBindings` already populated by C3 with `kind === "render-by-tag"` entries (cellName, renderSpecTag, renderSpecAttrs, declValidators) | Direct array filter at top of new pass. |
| Resolve cell read/write via reactive runtime | `_scrml_reactive_get(name)` / `_scrml_reactive_set(name, val)` are the canonical runtime calls. Used by every existing dispatch shape. | Reuse `readExpr` + `writeExpr(...)` patterns from lines 261-267 (no path-binding for cell-name; render-by-tag cellName is always a simple identifier per §6.2 Shape 2). |
| Numeric coercion for type=number/range | `inputType` extracted from `mkNode.attributes` line 280-286; `Number(event.target.value)` selector at line 286 | Same logic, but read `type` from `binding.renderSpecAttrs` instead of mkNode.attrs. |
| Enum coercion for `<select>` | `enumVarMap.get(rootKey)` returns the enum type name; `${EnumName}_toEnum[event.target.value]` coercion at line 285 | Reuse same `enumVarMap` (already built in emitBindings); look up by `binding.cellName`. |
| Predicate gating for refinement-typed cells | `parsePredicateAnnotation` + `predicateToJsExpr` from emit-predicates.ts. Used at lines 297-303. | Reuse same `reactiveTypeMap` (already built in emitBindings); look up by `binding.cellName`. |
| DOM selector for the rendered element | C3 stamped `data-scrml-render-by-tag="<placeholderId>"` on the rendered element. | `document.querySelector('[data-scrml-render-by-tag="<id>"]')` — mirror the existing `bindSelector` pattern at line 240-242. |
| Bind-flavour dispatch by render-spec | §5.4.1 spec table — input type discriminator + tag discriminator | New helper `_dispatchByRenderSpec(renderSpecTag, renderSpecAttrs)` returns `"value" \| "checked" \| "files" \| "group"` + numeric/enum flag. |
| Event-name selection (input vs change) | Existing logic line 270-272: `<select>` + `<input type="checkbox|file|radio">` use "change"; everything else uses "input" | Same logic; reuse via dispatch helper. |

**Discount:** All required runtime + helper infrastructure exists. New code is:

1. One small helper `dispatchByRenderSpec(renderSpecTag, renderSpecAttrs): { flavour, inputEvent, isNumeric }` — pure function, ~20 LOC.
2. One new pass at the end of `emitBindings` that walks render-by-tag bindings and synthesizes the wiring. Each binding emits a JS block similar to the existing `bind:value` / `bind:checked` / `bind:files` / `bind:group` blocks (lines 269-361), but driven by the registry entry instead of a markup-walked attribute.
3. Helper extraction: I'll extract a small `emitBindWiring({ flavour, elemId, selector, readExpr, writeExpr, inputEvent, predicateInfo })` helper that BOTH paths consume (source-level bind:* and render-by-tag) — modest DRY win without restructuring. If the extraction proves too invasive in implementation, I'll fall back to inline duplication per brief authorization.

**Estimate revision:** brief says ~3-4h. Survey says **~2.5-3h**. Forecast +18 to +28 tests.

---

## §3 Implementation plan

### §3.1 Helper: `dispatchByRenderSpec` (~25 LOC)

Pure function. Given `renderSpecTag` + `renderSpecAttrs`, returns:

```ts
type BindDispatch = {
  flavour: "value" | "checked" | "files" | "group";
  inputEvent: "input" | "change";
  isNumeric: boolean;       // type=number or type=range
  isSelectEnum: boolean;    // tag === "select" + cell is enum-typed (resolved by caller)
};

function dispatchByRenderSpec(tag: string, attrs: any[]): BindDispatch {
  const typeAttr = attrs.find(a => a?.name === "type")?.value?.value ?? "";
  if (tag === "input") {
    if (typeAttr === "checkbox") return { flavour: "checked", inputEvent: "change", isNumeric: false, isSelectEnum: false };
    if (typeAttr === "file")     return { flavour: "files",   inputEvent: "change", isNumeric: false, isSelectEnum: false };
    if (typeAttr === "radio")    return { flavour: "group",   inputEvent: "change", isNumeric: false, isSelectEnum: false };
    const isNumeric = typeAttr === "number" || typeAttr === "range";
    return { flavour: "value", inputEvent: "input", isNumeric, isSelectEnum: false };
  }
  if (tag === "textarea") return { flavour: "value", inputEvent: "input", isNumeric: false, isSelectEnum: false };
  if (tag === "select")   return { flavour: "value", inputEvent: "change", isNumeric: false, isSelectEnum: true /* refined by caller against enumVarMap */ };
  // Fallback — should not happen for bindable cells (B6 already gated illegal shapes); default to bind:value/input for safety.
  return { flavour: "value", inputEvent: "input", isNumeric: false, isSelectEnum: false };
}
```

### §3.2 Render-by-tag wiring pass (~80 LOC)

Appended at end of `emitBindings` (before `return lines`):

```ts
// A1c C4 — render-by-tag bind dispatch (§5.4.1 / L17). For each render-by-tag
// LogicBinding stamped by C3, emit the bind:* wiring keyed off the cell's
// renderSpec element type.
const renderByTagBindings = (ctx.registry?.logicBindings ?? [])
  .filter((b: any) => b?.kind === "render-by-tag");

for (const binding of renderByTagBindings) {
  const cellName: string = binding.cellName;
  const placeholderId: string = binding.placeholderId;
  const renderSpecTag: string = binding.renderSpecTag;
  const renderSpecAttrs: any[] = binding.renderSpecAttrs ?? [];
  if (!cellName || !placeholderId || !renderSpecTag) continue;

  const dispatch = dispatchByRenderSpec(renderSpecTag, renderSpecAttrs);
  const selector = `[data-scrml-render-by-tag="${placeholderId}"]`;
  const elemId = genVar(`render_by_tag_elem_${renderSpecTag}`);

  const readExpr = `_scrml_reactive_get(${JSON.stringify(cellName)})`;
  const writeExpr = (val: string) => `_scrml_reactive_set(${JSON.stringify(cellName)}, ${val})`;

  // Predicate gating (§53.7.2). Reuse the same path as source-level bind:value.
  const typeAnnotation = reactiveTypeMap.get(cellName);
  const predInfo = typeAnnotation ? parsePredicateAnnotation(typeAnnotation) : null;

  // Enum coercion for <select> + enum-typed cell.
  const enumTypeName = (renderSpecTag === "select") ? enumVarMap.get(cellName) : undefined;

  // Build the writeValue expression per dispatch flavour.
  let writeValueExpr: string;
  switch (dispatch.flavour) {
    case "value":
      if (enumTypeName) writeValueExpr = `(${enumTypeName}_toEnum[event.target.value] ?? event.target.value)`;
      else if (dispatch.isNumeric) writeValueExpr = "Number(event.target.value)";
      else writeValueExpr = "event.target.value";
      break;
    case "checked": writeValueExpr = "event.target.checked"; break;
    case "files":   writeValueExpr = "event.target.files"; break;
    case "group":   writeValueExpr = "event.target.value"; break;
  }

  lines.push(`// render-by-tag bind:${dispatch.flavour}=@${cellName} (cell=${cellName}, tag=${renderSpecTag})`);
  lines.push(`{`);
  lines.push(`  const ${elemId} = document.querySelector('${selector}');`);
  lines.push(`  if (${elemId}) {`);
  // Initial DOM read sync.
  if (dispatch.flavour === "value") {
    lines.push(`    ${elemId}.value = ${readExpr};`);
  } else if (dispatch.flavour === "checked") {
    lines.push(`    ${elemId}.checked = ${readExpr};`);
  } else if (dispatch.flavour === "group") {
    lines.push(`    ${elemId}.checked = (${readExpr} === ${elemId}.value);`);
  }
  // (files: no initial DOM-write — files are read-only; effect tracks @cell)

  // Event listener.
  if (predInfo && dispatch.flavour === "value") {
    const checkExpr = predicateToJsExpr(predInfo.predicate, "event.target.value");
    lines.push(`    ${elemId}.addEventListener(${JSON.stringify(dispatch.inputEvent)}, (event) => {`);
    lines.push(`      // §53.7.2 runtime predicate check before reactive assignment`);
    lines.push(`      if (${checkExpr}) { ${writeExpr(writeValueExpr)}; }`);
    lines.push(`    });`);
  } else {
    lines.push(`    ${elemId}.addEventListener(${JSON.stringify(dispatch.inputEvent)}, (event) => ${writeExpr(writeValueExpr)});`);
  }

  // Reactive effect (cell → DOM). Mirrors source-level bind dispatch.
  if (dispatch.flavour === "value") {
    lines.push(`    _scrml_effect(() => { ${elemId}.value = ${readExpr}; });`);
  } else if (dispatch.flavour === "checked") {
    lines.push(`    _scrml_effect(() => { ${elemId}.checked = ${readExpr}; });`);
  } else if (dispatch.flavour === "group") {
    lines.push(`    _scrml_effect(() => { ${elemId}.checked = (${readExpr} === ${elemId}.value); });`);
  } else if (dispatch.flavour === "files") {
    lines.push(`    _scrml_effect(() => { /* files are read-only from DOM — effect tracks @${cellName} */ ${readExpr}; });`);
  }

  lines.push(`  }`);
  lines.push(`}`);
  lines.push("");
}
```

### §3.3 Multi-render of same cell

If the same cell appears at multiple `<userName/>` use sites, C3 records ONE LogicBinding PER use site (different `placeholderId`s). Each gets its own `_scrml_effect` block — both DOM nodes update when @userName changes. **The runtime correctness for L16 multi-render is intrinsic** because each binding is independently wired; no de-dup needed.

DOM selector strategy: each placeholder id is unique (genVar), so `querySelector` on `[data-scrml-render-by-tag="<id>"]` picks the right element per binding.

### §3.4 Tests (~25-35 tests, 1 new file)

`compiler/tests/unit/c4-bind-dispatch.test.js`:

- §C4.1 Text input dispatch — `<userName/>` + `<input type="text"/>` → bind:value, "input" event, _scrml_reactive_get/set
- §C4.2 Checkbox dispatch — `<input type="checkbox"/>` → bind:checked, "change" event, event.target.checked
- §C4.3 File dispatch — `<input type="file"/>` → bind:files, "change" event, event.target.files, no DOM-write effect (read-only)
- §C4.4 Radio dispatch — `<input type="radio"/>` → bind:group, "change" event, `(read === elem.value)` initial check
- §C4.5 Number-input numeric coercion — `<input type="number"/>` → Number(event.target.value)
- §C4.6 Range-input numeric coercion — `<input type="range"/>` → Number(event.target.value)
- §C4.7 Textarea dispatch — `<textarea/>` → bind:value, "input" event
- §C4.8 Select dispatch — `<select>...</>` → bind:value, "change" event
- §C4.9 Select + enum-typed cell — `${Theme}_toEnum[event.target.value]` coercion
- §C4.10 Multi-render same cell — two `<userName/>` → two distinct DOM selectors + two effects
- §C4.11 Multiple distinct cells — `<userName/>` + `<email/>` → two bind:value blocks, distinct cell names
- §C4.12 Hookpoint contract — `data-scrml-render-by-tag="<id>"` selector matches C3's stamp
- §C4.13 Read uses _scrml_reactive_get, write uses _scrml_reactive_set (runtime API contract)
- §C4.14 Email/url/password/tel/search/date/time/etc. — all default to bind:value/input event
- §C4.15 No render-by-tag bindings → no C4 output (zero-presence regression guard)
- §C4.16 Source-level bind:* unchanged (regression guard for existing emit-bindings paths)
- §C4.17 Predicate-gated render-by-tag value — runtime check emitted before set
- §C4.18 Effect block subscribes for cell→DOM sync (each flavour)

### §3.5 Sub-step boundaries (commit cadence)

| WIP | Sub-step | Est | Commit |
|---|---|---|---|
| WIP-1 | Pre-impl scratch: SURVEY + progress baseline snapshot | 30 min | `WIP(c4): survey + progress` |
| WIP-2 | Add `dispatchByRenderSpec` helper + render-by-tag pass to emit-bindings.ts | 60 min | `WIP(c4): dispatch helper + emit pass` |
| WIP-3 | Test file scaffolding + §C4.1-§C4.6 (input shapes + numeric coercion) | 45 min | `WIP(c4): test scaffold + input dispatch tests` |
| WIP-4 | §C4.7-§C4.12 (textarea/select/enum/multi-render/hookpoint) | 30 min | `WIP(c4): textarea+select+multi-render tests` |
| WIP-5 | §C4.13-§C4.18 (runtime API + regression guards + predicate gating) | 30 min | `WIP(c4): regression guards + predicate gate tests` |
| WIP-6 | Final pretest + full test sweep + Wave 1 closure note | 15 min | `feat(c4): SHIP — bind:* dispatch (Wave 1 CLOSED)` |

**Total: ~3.5 h** (lower end of brief's 3-4h estimate).

---

## §4 Spec verification (pa.md Rule 4)

Re-read SPEC §5.4.1 (lines 1318-1385) verbatim. Brief's table accurately encodes spec.
**Drift caught:** brief's table lists "text/email/url/password/etc." for bind:value; spec
§5.4.1 names a wider list explicitly: text, email, number, url, search, tel, password, date,
time, datetime-local, color, range, hidden. Resolution: my dispatch logic uses negative-form
(`if not checkbox/file/radio` → bind:value), which subsumes ALL types-not-otherwise-special
including the wider list. No correction needed; brief's "any other type" wording is
operationally equivalent.

§5.4 / §14.4.1 enum coercion — spec confirms: `<select>` + enum-typed cell auto-coerces via
`<EnumName>_toEnum[event.target.value]`. Reuses existing logic. ✓

§53.7.2 predicate gating — spec confirms: predicated-typed cells gate writes via runtime
predicate check before reactive assignment. Reuses existing logic. ✓

L17 lock — confirmed: "Compiler dispatches binding by render-spec; writable requires
bindable." C4's render-by-tag walker fires only for `kind === "bindable"` cells (C3 already
filtered via getCellKind), so the "writable requires bindable" half is satisfied
transitively. ✓

No spec amendments needed. Brief is authoritative.

---

## §5 Diff envelope expected

| Diff source | Cause | Magnitude |
|---|---|---|
| `compiler/src/codegen/emit-bindings.ts` | New helper (~25 LOC) + new pass at end (~80 LOC) | ~110 LOC additive |
| `compiler/tests/unit/c4-bind-dispatch.test.js` | NEW file ~450 LOC, ~25-35 tests | NEW |
| `docs/changes/phase-a1c-step-c4-bind-dispatch/SURVEY.md` | NEW | NEW |
| `docs/changes/phase-a1c-step-c4-bind-dispatch/progress.md` | NEW append-only | NEW |
| Existing test corpus | Source-level bind:* paths untouched; C3 hookpoint emission untouched | ZERO existing-output diff |

---

## §6 Verdict

**PROCEED-AS-BRIEFED** with the following clarifications (no scope changes):

1. **Locus:** `emit-bindings.ts` (confirmed; reuses enumVarMap, reactiveTypeMap, predicate
   helpers built once per file).
2. **No new runtime helpers needed.** The wiring uses the same `_scrml_reactive_get/set` and
   `_scrml_effect` runtime API as source-level bind:*. Pure compile-time addition.
3. **Helper refactoring deferred** if it requires substantial restructuring; inline pattern-
   replication is the default per brief authorization. (Will assess in WIP-2.)
4. **Cost revision:** ~3.5h vs brief's 3-4h — modest discount because reuse paths are
   already isolated as named helpers (no extraction tax). Test count forecast +25 (within
   brief's "+20 to +35" expectation).

---

## §7 References

- BRIEF: `docs/changes/phase-a1c-step-c4-bind-dispatch/BRIEF.md`
- SPEC §5.4 + §5.4.1: `compiler/SPEC.md:1210-1385`
- C3 SURVEY: `docs/changes/phase-a1c-step-c3-render-spec-expansion/SURVEY.md`
- emit-bindings.ts: 506 LOC, full read; bind dispatch at lines 269-362
- binding-registry.ts: LogicBinding `kind === "render-by-tag"` shape at lines 64-147
- emit-html.ts: render-by-tag emission at lines 820-915 (registers binding for C4)
- emit-predicates.ts: parsePredicateAnnotation, predicateToJsExpr exports
- emit-client.ts:541 — `emitBindings(ctx)` invocation point (sole codegen consumer)

---

## §8 Tags

#a1c #c4 #phase-0 #survey-complete #proceed-as-briefed #bind-dispatch
#emit-bindings-extension #l17 #wave-1-closer #depth-of-survey-discount
