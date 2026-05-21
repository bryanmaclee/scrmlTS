# Dispatch — v0.6 / F1: native-parser attribute tokenizer

**Authority:** DD #27 `scrml-support/docs/deep-dives/m5-m6-scope-revision-2026-05-21.md`
(F1 / Cluster A); SCOPE `docs/changes/m5-v0.5-compressed-ladder/SCOPE-v0.6.md`.
**Estimate:** 14-20h. **Task shape:** native-parser feature addition.

## Goal

Give the scrml-native parser a markup **attribute tokenizer** — extend the markup layer
(MK2 `TagFrame` / MK3) so it tokenizes the attributes inside a tag opener and produces
`attrs[]` + `tokenizedAttrs` on each markup node, matching the shape the live FileAST
produces. Attributes are first-class scrml grammar (`<button onclick=${...}>`,
`<input bind:value=@x>`, `<engine for=LexMode>`, `<program auth="required">`) — without
`attrs[]` the native markup AST cannot represent the language.

This is **BRIDGE-LIGHT** — native attribute tokenization is genuinely the markup-layer
parser's job (the same layer that already does `BodyMode` + `DisplayTextLiteral`). The
work is IN the native parser; downstream consumers need NO refactoring because the
`attrs[]` shape produced IS the language's shape.

## Why (DD #27)

The M5 agent's MD.1 baseline (20-30h) assumed a translation-layer overhead — re-running
the live `tokenizeAttributes` against opener-span text (a double-tokenize). DD #27
compressed it: a native attribute tokenizer directly inside `TagFrame` avoids the
double-tokenize. MD.1-LIGHT = 14-20h.

## Phase 0 — survey (MANDATORY before any edit)

1. **The target shape.** Read the live `attrs[]` definition + the 6-variant attribute
   value union + `tokenizedAttrs` in `compiler/src/types/ast.ts`. Read how the live
   `tokenizeAttributes` (in `compiler/src/tokenizer.ts`) produces them. The native
   parser must produce the SAME shape — that is the behavioral contract.
2. **The native markup layer.** Read `compiler/native-parser/tag-frame.scrml` (the
   MK2 TagFrame engine — tag tree + opener spans) and `parse-markup.scrml` — determine
   where the tag opener is captured and where attribute tokenization should attach.
   Per DD #27: "MK2 already includes TagFrame for the tag tree + tag opener spans" —
   F1 extends TagFrame with a native attribute tokenizer over the opener extent.
3. **The native lexer.** The native parser's M1 lexer (`lex-*.scrml`) tokenizes the
   source; determine whether attribute tokens ride the existing token stream or need a
   markup-layer sub-tokenize of the opener extent.
4. Report the live→native shape mapping in your final report.

## Implementation

1. Extend the native markup layer (`tag-frame.{scrml,js}` + `parse-markup.{scrml,js}`)
   with attribute tokenization over the tag-opener extent. Each native markup node gains
   `attrs[]` (the 6-variant value union — match the live union exactly: string-literal /
   expr / dynamic-class / bind / event-handler / absent, or whatever the live
   `types/ast.ts` enumerates) + `tokenizedAttrs`.
2. Per native-parser convention each file is a **`.scrml` canonical shape + a `.js`
   running shadow** — author BOTH; the `.scrml` carries the canonical Pillar-5b shape.
3. Attribute *parsing* of `${...}` / `@x` expression values feeds through the native
   `parse-expr` layer (already built, M2-M4) — do NOT re-implement expression parsing.

## Constraints

- **No live-pipeline wiring.** This is native-parser code the M5 swap (later v0.6 cut)
  activates. Verify via the native-parser conformance harness — feed corpus exemplars,
  assert the produced `attrs[]` matches the live `tokenizeAttributes` output for the
  same source. Do NOT wire into `compiler/src/` or the live FileAST.
- Do NOT touch `compiler/src/` except read-only (to read the target shape).
- Do NOT introduce a native↔live translation layer — produce the native shape directly.
- Coupled code + test = one logical unit (same commit). NEVER `--no-verify`.
- `.scrml`/`.js` shadow discipline — both files, `.scrml` canonical.
- F1 and F7 (state/SQL/CSS) both touch `tag-frame.scrml` + `parse-markup.scrml`. F7 is
  dispatched AFTER F1 lands — you have these files to yourself; no merge race.

## Deliverable / report

WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED · the live→native attrs shape mapping from
Phase 0 · where the tokenizer attached (file:line) · conformance test count + result
(incl. parity vs live `tokenizeAttributes`) · test delta · maps-consulted line.
