# R25-Bug-40 progress

## Setup (2026-05-27)
- pwd: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a6916fdd6adbdc91a
- post-`bun install` + `bun run pretest` + `git merge main` clean
- merged main = ebeba766 (R25-Bug-41 landing)

## Phase 0 — diagnosis

### Reproducer
`<each in=@items><li : @.name></each>` compiles WITHOUT BS error (because each's outer body is captured raw), BUT codegen emits an empty per-item factory body:
```
(_scrml_each_item, _scrml_each_idx) => {
  const _itemFrag = document.createDocumentFragment();
  return _itemFrag.firstChild;   // null — no <li> created
}
```

### Bare-body comparison (canonical workaround) works
`<each in=@items><li>${@.name}</li></each>` emits:
```
const _scrml_el_1 = document.createElement("li");
_scrml_frag_2.appendChild(document.createTextNode(String(_scrml_each_item.name)));
_scrml_el_1.appendChild(_scrml_frag_2);
_itemFrag.appendChild(_scrml_el_1);
```

### AST trace
For the FAILING shorthand reproducer:
- `each.bodyRaw` = `"<li : @.name>"` (preserved correctly)
- `each.templateChildren` = `[ { kind: "text", value: "\n                " } ]` — ONLY whitespace text!
- The `<li : @.name>` markup is NOT in templateChildren.

For bare-body:
- `each.templateChildren` includes a proper `{ kind: "markup", tag: "li", children: [...logic...] }`.

### Root cause
In `compiler/src/ast-builder.js:11306` the each-block dispatch calls `_splitBlocksForP2Form1(filePath, _bodyRawForReparse)` to re-parse the body. That calls `splitBlocks` from `block-splitter.js`. The `splitBlocks` function's `scanAttributes` (line 401) does NOT recognize SPEC §4.14 `:`-shorthand syntax. When it sees `<li : @.name>`:
- scanAttributes treats ` : @.name` as attribute content
- returns `{ selfClosing: false }` with the full text as `attrRaw`
- caller pushes a `<li>` context frame at `pushTagContext("markup", "li", ...)` (line 1944)
- no `</li>` ever appears → EOF reached
- `E-CTX-003 Unclosed 'li'` fires (line 2078)
- in the each-block recursive splitBlocks call, the errors are DISCARDED (ast-builder line 11312 comment "_subErrors intentionally discarded")
- the `<li>` opener that pushed the context never made it into a Block (still on the stack at EOF), so it's effectively dropped
- emit-each.ts then walks empty templateChildren → empty factory body

### SPEC §4.14 normative requirement
Per SPEC §4.14 (line 977-982):
> The block splitter recognizes a `:`-shorthand body by the post-attribute `:` token inside an opener — a within-opener scan concern.

The live BS path is CURRENTLY non-compliant with this clause. The native-parser (M5-swap target) DOES handle this correctly via `tokenizeOpenerFromLt` (parser-conformance-markup.test.js M6.6.b.1 suite).

### Cross-impact analysis
- **Engine state-children** (`<Idle : startGame()>` etc.): same BS-level issue exists, but engine state-children are downstream re-parsed from `rulesRaw` by `engine-statechild-parser.ts` which has its own `:`-shorthand grammar — so the live engine path masks the BS-level non-compliance. The current real engine samples in `samples/compilation-tests/` use bare-body form, NOT `:`-shorthand, so this is invisible in the corpus. Fixing scanAttributes will make engine BS-level shorthand "just work" but rulesRaw still feeds the same text to engine-statechild-parser, so engine behavior is unchanged (downstream parser is the authoritative validator).
- **`<empty : "literal">`** (overseer-3 separate finding): same root cause. The `<empty>` sub-element is parsed via the SAME `_splitBlocksForP2Form1` re-parse path inside each-block dispatch. Fixing scanAttributes fixes `<empty>` shorthand simultaneously.
- **Match block arms** (`<.Variant : expr>` in match block-form): match arm bodies are parsed by `match-statechild-parser.ts`, NOT BS — also masked. Fix unaffected.

### Fix plan
**Fix site: `compiler/src/block-splitter.js` `scanAttributes`**.

Add `:`-shorthand detection inside scanAttributes:
- At depth-0 (no quotes/braces/parens), detect ` :` (whitespace followed by `:`) followed by anything OTHER than `:` (avoid `::` namespace) AND OTHER than an immediately-adjacent ident-char (avoid stray namespace prefixes).
- When detected, switch to "shorthand body mode": continue scanning until depth-0 `>` is found, tracking angle/bracket/brace/paren/quote depth so embedded markup-as-value (e.g. `<Loading : <p>Loading...</>>`) doesn't close the opener prematurely.
- Return `{ attrRaw, selfClosing: false, shorthand: true }` (new field).
- Caller treats `shorthand: true` analogously to `selfClosing: true` — emits leaf block with `closerForm: "shorthand"`, does NOT push tag context.

The leaf block's `.raw` carries the entire opener including the `:`-shorthand body — that's what emit-each.ts's `detectShorthandOpener` already inspects. Existing emit-each.ts logic at lines 184-209 handles the leaf correctly (recognizes shorthand, extracts expression, emits textContent assignment).

### Acceptance criteria
- `<each in=@items><li : @.name></each>` emits non-empty per-item factory.
- All 10+ regression tests pass (covering attr-bearing, `as name`, `<each of=N>`, nested, mixed, `<empty>`, `<empty :>`, etc.).
- Pre-existing test baseline unchanged (no regressions in unit/integ/conformance).

## Phase 1 — fix (LANDED)

Implementation at three sites:

### compiler/src/block-splitter.js
1. `scanAttributes` extended:
   - Added `bracketDepth` tracking (companion to brace/paren — `>` inside `[expr]` doesn't close opener).
   - New `:`-shorthand introducer detection at depth-0: when `c === ':'` AND `ch(1) !== ':'` AND `attrRaw.length > 0 && /\s/.test(attrRaw[last])`, switch to `shorthand: true` mode. Record `shorthandColonAttrOff` (offset of `:` within attrRaw).
   - SPEC §4.14 compliance: mandatory whitespace BEFORE `:`. `<Tag:expr>` (no whitespace) still falls through to standard markup path → E-CTX-003 (or E-PARSE-001 in future strictness).
2. Markup `<TAG>` caller path (line ~1759):
   - Emits leaf block with `closerForm:"shorthand"` and `shorthandColonOff` field (offset in block.raw) when `shorthand:true`.
3. State `< TAG>` caller path (line ~1989):
   - Same emit-leaf treatment for engine state-children (`<Idle : startGame()>`). Side-effect win: BS-level recognition for engine state-children now also works (previously masked by downstream re-parse).

### compiler/src/ast-builder.js
- Markup dispatch case (line ~11365): when `block.closerForm === "shorthand"`, slice `block.raw` at the `shorthandColonOff`, append `>`, and tokenize that prefix. The shorthand body is captured separately into the markup AST node's `shorthandBodyRaw` field.

### compiler/src/codegen/emit-each.ts
1. `renderTemplateChildToJs`: prefer the authoritative `closerForm === "shorthand"` + `shorthandBodyRaw` AST fields; falls back to legacy `detectShorthandOpener` / `extractShorthandExpr` regex helpers for resilience.
2. `renderEmptyChildToJs`: added shorthand short-circuit so `<empty : "literal">` wires the body expression directly into the empty fragment as a textNode (no createElement for `<empty>` — it's a structural sub-element).

### compiler/tests/unit/p3-follow-no-isComponent-routing.test.js
- Raised `block-splitter.js` budget 23 → 26 for the new write-side stamps (markup-shorthand emit-stamp + state-shorthand emit-stamp + `isComponentName(stateName)` write-side call).

## Phase 2 — regression suite

New file: `compiler/tests/unit/each-colon-shorthand-r25-bug-40.test.js` — 20 tests in 14 sections (§1-§14).

## Phase 3 — verification

- New tests: 20/20 pass.
- Existing each-block.test.js: 24/24 pass (no regressions).
- Parser-conformance + engine-statechild + multi-statement-handler + machine-decl: 796/796 pass.
- **Full suite at PA baseline (`ebeba766`): 14851 pass / 0 fail / 88 skip / 1 todo. Post-fix: 14871 pass / 0 fail / 88 skip / 1 todo (delta = +20 new tests).**

## End-to-end reproducer verification

Compiled `<each in=@items><li : @.name></each>`:

BEFORE (pre-fix):
```js
(_scrml_each_item, _scrml_each_idx) => {
  const _itemFrag = document.createDocumentFragment();
  return _itemFrag.firstChild;   // null — bug
}
```

AFTER (post-fix):
```js
(_scrml_each_item, _scrml_each_idx) => {
  const _itemFrag = document.createDocumentFragment();
  const _scrml_el_1 = document.createElement("li");
  _scrml_el_1.textContent = String(_scrml_each_item.name);
  _itemFrag.appendChild(_scrml_el_1);
  return _itemFrag.firstChild;
}
```

`node --check` on emitted JS: **PARSE OK**.

## Commits

- `1c8d9fe0` WIP — root-cause diagnosis (progress.md)
- `8641db71` fix — SPEC §4.14 `:`-shorthand body BS-level recognition (core)
- `f6735f1e` test — regression suite + `<empty : 'literal'>` codegen
- `eca56ed9` fix — predecessor check tightening (SPEC §4.14 compliance — require non-empty attrRaw with whitespace; rejects `<Tag:expr>` shape)

## `<empty>` `:`-shorthand sub-case disposition

FIXED — included in this dispatch via the `renderEmptyChildToJs` shorthand short-circuit. Same code path; natural to fix together. Overseer-3's separate finding is closed alongside Bug 40.

## Deferred items

None within scope. Out-of-scope-but-noted:
- Engine state-child `:`-shorthand BS-level non-compliance was masked pre-S136 by downstream re-parse via engine-statechild-parser; fix here brings BS into line, no behavior change for engine semantics. Not separately filed.
- `<Tag:expr>` (no whitespace before `:`) currently fires E-CTX-003 rather than the SPEC-prescribed E-PARSE-001. This is a pre-existing diagnostic-class mismatch, not introduced by this fix. Out of scope.

## Reporting block

WORKTREE_PATH: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a6916fdd6adbdc91a
BRANCH: worktree-agent-a6916fdd6adbdc91a
FINAL_SHA: (see git log -1)
FILES_TOUCHED:
  - compiler/src/block-splitter.js (scanAttributes + 2 caller paths)
  - compiler/src/ast-builder.js (markup dispatch shorthand slicing)
  - compiler/src/codegen/emit-each.ts (renderTemplateChildToJs + renderEmptyChildToJs)
  - compiler/tests/unit/p3-follow-no-isComponent-routing.test.js (budget 23→26)
  - compiler/tests/unit/each-colon-shorthand-r25-bug-40.test.js (NEW, 20 tests)
  - docs/changes/r25-bug-40-each-colon-shorthand-2026-05-27/progress.md (NEW)
