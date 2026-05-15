# BS-Layer Corpus-Friction Bugs — Progress Log

**Started:** 2026-05-14 (S93+)
**Branch:** $(git branch --show-current)
**Worktree:** /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a60981bb9e0b9a6e8

## Phase 0 — Survey (complete)

### Findings

**BS-layer (compiler/src/block-splitter.js):**
- Line 444 `peekTopLevelStateDeclSignal()` — non-mutating peek for state-decl signals.
- Line 1237 — top-level/program/page/channel BS-layer state-decl recognition (lifts `<NAME> [attrs]> = expr` text early).
- Line 759-801 — **backtick template-literal tracking exists ONLY in `meta` frames (^{}).** Logic frames (${}) currently do NOT track backticks → `${ident}` inside backtick string starts a NEW logic block. This is Bug 3.
- Line 613 — `//` comment suppression at ALL levels (markup + brace). Already correctly strips markup `//` as comment-block.
- Line 655 — `<!-- -->` markup-comment suppression at non-brace contexts. Inside brace-contexts (e.g., `${}` logic), `<!--` is NOT skipped — it falls through as text. This is the Bug 4 mechanism: markup `<!-- -->` inside `${ const Card = <div>...<!--...-->...</> }` body lives at brace-context level 1 (the logic frame), so falls through as text.

**TAB liftBareDeclarations (compiler/src/ast-builder.js:668-1046):**
- Recognizes `export <Component>` (Form 1) at L735-868 — pairs text+markup. Includes `export <channel>`, `export <engine>`. 
- BARE_DECL_RE (L327) matches `(?:export\s+)?(server fn|type|fn|function|let|const)`. Lifts text into `${ ... }` synthetic logic.
- TOPLEVEL_STATE_DECL_RE (L348) matches `<NAME [attrs]> = expr` shape (with optional `const ` prefix) — lifts state-decls.
- **Missing**: a pair-recognizer for `const Name = <markup>` (text ends with `const NAME = ` + markup sibling). That's Bug 2.

**Bug 6 layer:**
- E-IMPORT-001 fires at `compiler/src/gauntlet-phase1-checks.js:177` for top-level text starting with `export`. Suppressed for Form-1 export-of-component/channel/engine — but NOT for `export type`/`export function`/`export const = value` (these are valid bare-decl lifts but G1 fires BEFORE TAB-level lift sees them).
- W-PROGRAM-001 fires at `compiler/src/ast-builder.js:10962` when no `<program>` root. Fires unconditionally — no pure-module shape suppression.

### Bug reproduction status (baseline confirmed)

| Bug | Repro | Diagnostic |
|-----|-------|------------|
| 1   | could not reproduce in simplified shapes; BS-layer already strips `//` as `comment` block at all levels. May have been fixed in prior S87 BS-comment-skip work. Will verify by adding regression test for the `//` markup case. | (none currently) |
| 2   | bug2.scrml | E-COMPONENT-035 (TodoRow unresolved) + E-SCOPE-001 (`item` not in scope) |
| 3   | bug3.scrml | E-SCOPE-001 on `hh` + `mm` (template-literal interpolation) |
| 3-adj | bug3adj.scrml | E-SCOPE-001 on `email` (renders `<p>${email}</>`) |
| 4   | bug4.scrml | E-COMPONENT-020 + E-COMPONENT-035 on Card use-site |
| 6   | bug6.scrml | E-IMPORT-001 + W-PROGRAM-001 |

### Fix order (planned)

1. **Bug 3 + 3-adj** — likely share a fix: BS-layer backtick template-literal tracking must extend to `logic` frames (currently only `meta`). For 3-adj, the markup interpolation inside `renders <p>` lives inside a logic-decl text-block synthesized as `${ type X:enum = { ... renders <p>${email}</> } }` — the inner `${email}` is parsed by BS as a new logic block at top-level (loses the email binding scope).

   Wait — but the type-decl text wraps in `${...}`, the renders `<p>${email}</>` is markup INSIDE the logic, and `${email}` inside `<p>` markup at brace-context tag-nesting level 1 should be fine. Let me verify with a focused trace.

2. **Bug 1** — verify root cause via regression test; appears already fixed.

3. **Bug 4** — extend BS-layer markup-comment suppression to skip `<!-- -->` inside brace-context tag-nesting (when frame.tagNesting > 0).

4. **Bug 2** — add lift recognizer in liftBareDeclarations for text ending in `const NAME = ` followed by markup sibling at program/page/file-root context.

5. **Bug 6** — split into 6A (E-IMPORT-001) and 6B (W-PROGRAM-001). For 6A: suppress E-IMPORT-001 for bare `export type`/`export function`/`export const`/`export server`/etc. when these forms already lift cleanly via BARE_DECL_RE — let TAB handle. For 6B: suppress W-PROGRAM-001 when file is pure-module shape (no markup nodes; only imports + exports + decls).


