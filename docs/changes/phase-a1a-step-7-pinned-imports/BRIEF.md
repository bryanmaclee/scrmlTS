# Phase A1a Step 7 — Parser: `pinned` bareword on import items

**Status:** DRAFT — queued for dispatch after Step 6 lands.
**Predecessor:** Step 6 (`default=` + `pinned` on state-decl). Step 7 reuses the bareword-recognizer pattern Step 6 establishes for state-decl, ported to import-decl.
**Estimate:** 0.5-1 h focused work. Single-file extension in `ast-builder.js`.
**Authority:** SPEC §21.8 (cross-file engine import + `pinned` legal: `import { MarioMachine pinned } from './engines.scrml'`). M18. SPEC §34 entry `E-IMPORT-PINNED-INVALID` (A1b enforcement; not Step 7's job). AST contract: `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md` §1.4.

---

## §1 What lands

Extend the import-declaration parser in `compiler/src/ast-builder.js` so each `import-item` AST node carries a `pinned: boolean` field, set `true` iff the bareword `pinned` follows the imported name inside the brace list.

```scrml
import { MarioMachine pinned } from './engines.scrml'
//                    ──────  ↑ Step 7 sets pinned:true on this import-item
```

| Field | Type | Set when | Default |
|---|---|---|---|
| `pinned` | `boolean` | `pinned` bareword follows the import name (no separator) | `false` |

Multi-item lists work as expected: `import { foo pinned, bar, baz pinned }` → first + third items have `pinned: true`, second has `pinned: false`.

---

## §2 Scope

### §2.1 In-scope
1. Locate the import-item parser in `ast-builder.js` (survey).
2. Extend per-item lookahead: after the imported name (and any optional `as <alias>`), check next token. If next is IDENT `pinned` AND the token after that is either `,` or `}` (i.e., bareword position), consume it and set `pinned: true`.
3. Update `compiler/src/types/ast.ts` import-item type with `pinned?: boolean`.
4. Add new tests for: single pinned, multi-item with mixed pinned/non-pinned, pinned after `as` alias, regression of unmodified imports.
5. Update progress.md cumulative log.

### §2.2 Out-of-scope
- Forward-ref enforcement — `E-IMPORT-PINNED-INVALID` (cycle detection, valid-context check) is A1b.
- `pinned` inside default imports / namespace imports — only brace-list named items support `pinned` per spec.
- Codegen hoisting based on `pinned` — A1c.

### §2.3 `as` alias interaction
Spec ordering: `name [as alias] [pinned]`. Verify both forms parse:
- `import { foo pinned } from '...'`
- `import { foo as bar pinned } from '...'`

If survey reveals existing `as`-alias parsing path is structurally awkward to extend, document; defer to A1b only if completely blocked. Otherwise inline.

---

## §3 Survey-first mandate

1. Locate the import-item parser (likely a sub-helper or inline loop in the import-decl parser). Document file:line.
2. Confirm whether the existing tokenizer treats `pinned` as a regular IDENT in import context (it should — `pinned` is NOT a global KEYWORD per AST-CONTRACTS §2.1).
3. Check if the existing parser would silently reject a stray IDENT after the imported name (parse error today). The Step 7 change makes it legal.
4. Survey existing import tests/samples for any forms that might collide.

Document survey findings in `progress.md` BEFORE editing source. Authorization to correct the touchpoint if survey contradicts: granted.

---

## §4 Test plan

Add to a new file `compiler/tests/integration/parse-import-pinned.test.js` (or extend an existing import-parser test if one exists — survey first).

- §I7.1: `import { foo pinned } from './m.scrml'` — single pinned; assert AST import-item has `pinned: true`.
- §I7.2: `import { foo, bar } from './m.scrml'` — regression baseline; assert both have `pinned: false`.
- §I7.3: `import { foo pinned, bar, baz pinned } from './m.scrml'` — mixed; assert pinned-flags correctly.
- §I7.4: `import { foo as bar pinned } from './m.scrml'` — alias + pinned; assert `pinned: true`, `local: "bar"`, `imported: "foo"` (or whatever existing AST shape uses).
- §I7.5: `import { foo as bar } from './m.scrml'` — alias regression baseline.
- §I7.6: Default import + namespace import regression: confirm no `pinned` accidentally accepted in non-brace forms.

Aim: ~5-7 new cases.

---

## §5 Definition of done

1. ✅ `compiler/src/ast-builder.js` modified — import-item parser recognizes trailing `pinned` bareword.
2. ✅ `compiler/src/types/ast.ts` extended — import-item type has `pinned?: boolean`.
3. ✅ Self-host parity check: if `compiler/self-host/ast.scrml` has parallel import-item construction, mirror.
4. ✅ Tests added per §4. ~5-7 new cases.
5. ✅ Pre-commit + full `bun run test`: 0 fail, 43 skip, 0 regressions. Delta +5 to +7 pass.
6. ✅ Branch clean. NO `--no-verify`.
7. ✅ progress.md updated.

---

## §6 Branch

`phase-a1a-step-7-pinned-imports`, parented from main HEAD at dispatch time.

Standard commit cadence: WIP commits per meaningful unit, final clean compile-commit, PA cherry-pick to main on completion.

---

## §7 Tags

#phase-a1a #step-7 #pinned-imports #parser-only
