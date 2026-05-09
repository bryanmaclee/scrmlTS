# Phase A1c — Step C10: 4-level error message resolution emission (L12)

**Phase:** A1c. Wave 3 sibling (parallel with C9, C11 after C8 land).
**Estimate:** ~5-7 h focused.
**Dispatched:** 2026-05-08 (S73).
**Authority chain:** SPEC §55.10 (4-level error message resolution chain) + L12. SCOPE-AND-DECOMPOSITION row C10 (`docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md:223`).

## Goal (one paragraph)

C7+C8 emit RAW `ValidationError` enum tags into `errors` arrays/maps. C10 emits the runtime `messageFor(errorTag)` helper that walks the 4-level resolution chain to render a tag → user-facing string: **Level 1** inline override on field decl (highest priority, static-string only — extracted by B13 into `validator.inlineOverride`); **Level 2** project-registered messages via `data.registerMessages({.Tag: (field, ...payload) => string})` per §55.10 lines 25257-25268; **Level 3** scrml:data shipped English defaults (zero-config floor); **Level 4** `match` escape hatch is consumer-side, not C10's emission. C10 emits the `messageFor` runtime + the per-(cell,validator)-Level-1 override storage + ensures the Level-2 registration API is available.

## What's already in place (depth-of-survey signal)

- **B13 inline-override extraction:** `validator.inlineOverride: string | null` on every validator entry already extracted from trailing string-literal arg. C10 records per-(cell,validator) override → at message-render time, look up by (cellName, validatorName).
- **C7 strips the inline-message-override slot from emitted args:** the override does NOT pass through to C6's fire functions; C7 captures it for C10's lookup.
- **`scrml:data` stdlib:** already shipped (per primer §10) — `validate`, `isValid`, `firstError`, predicate builders. The `registerMessages` API is mentioned in primer §13.7 D4 + SPEC §41.12 (L12). Survey-confirm whether `data.registerMessages` is implemented today or whether C10 adds it.
- **`messageFor` location:** auto-imported via `use scrml:data` per §55.10 line 25292. Survey-confirm whether `messageFor` is in `scrml:data` today or C10 adds it.
- **C8 emits raw enum tags:** `<compound>.<field>.errors[0]` is a `ValidationError` value object like `{tag: "Required"}` or `{tag: "MinFailed", threshold: 18}`. C10 reads this shape via `messageFor`.

## Scope (in / out)

**IN scope (C10):**
1. **`messageFor(errorTag, fieldName, cellName?)` runtime helper:** walks the 4-level chain for ANY ValidationError tag. Level 1 (lookup by `(cellName, validatorName)` in C10's storage); Level 2 (lookup in `data.registerMessages`-populated table); Level 3 (shipped English defaults — one default per ValidationError tag).
2. **Level-1 storage emission:** per state-decl with validators, for each validator with non-null `inlineOverride`, emit a registration into `_scrml_validator_inline_messages` (or equivalent runtime table) keyed by `(cellName, validatorName)` → override string.
3. **Level-2 API completion:** `scrml:data` `registerMessages({...})` — survey whether it exists today; if not, add it. The API stores into a runtime table consulted by `messageFor`.
4. **Level-3 default catalog:** for each of the 14 universal-core ValidationError tags (Required, NotSome, LengthFailed, PatternMismatch, MinFailed, MaxFailed, GtFailed, LtFailed, GteFailed, LteFailed, EqFailed, NeqFailed, OneOfFailed, NotInFailed) + Custom escape hatch — emit a default English message (e.g., `Required`: "This field is required."; `MinFailed(threshold)`: "Must be at least ${threshold}."). Per §55.10 line 25275-25276.
5. **`messageFor` is consumed by C11** (`<errors of=>` rendering) — C10 just makes the helper available; C11 calls it.
6. **Tests:** unit tests covering: Level-1 inline override wins; Level-2 registered message wins over Level-3 default when no Level-1; Level-3 default fires when no Level-1 + no Level-2; the 14+1 default messages all render; `messageFor` works for both bare tags and parameterized tags (e.g., `MinFailed(18)`).

**OUT of scope (deferred):**
- **`<errors of=expr/>` element** — **C11** consumes `messageFor`.
- **Cross-field validator deps** — **C9**.
- **Engine-state-cell validators** — §55.14.

## Spec verification (pa.md Rule 4)

- **§55.10 lines 25243-25301** verbatim: 4-level chain; Level 1 static-string only (no `${}` interpolation); Level 2 functions take `(fieldName, ...errorTagPayload)` to string; Level 3 always available zero-config; Level 4 is `match` escape hatch (not C10's emission). `messageFor(errorTag)` walks Levels 1→2→3 automatically; if Level 1 inline override is present for the specific (field, validator) pair, it wins. ✓

## Dispatch protocol

S67 worktree-as-scratch landing.

## Authorized decisions

- **File locus:** Likely a NEW `compiler/src/codegen/emit-messages.ts` for the codegen side + extension to `runtime-template.js` (or new chunk) for the runtime helper. `messageFor` may also need to live in stdlib's `scrml:data` per spec — survey-confirm and pick the right home.
- **Default catalog phrasing:** stay close to the spec example phrasings; aim for non-condescending professional. Survey-confirm if there are existing message strings anywhere in the codebase to mirror.
- **Test file:** `compiler/tests/unit/c10-error-message-resolution.test.js`.

## Sibling-dispatch awareness

Two SIBLING dispatches running in parallel: **C9** (cross-field deps; mostly test-only) and **C11** (`<errors of=expr/>` element; touches `emit-html.ts` + likely `emit-bindings.ts`). Your likely C10 touchpoints are `runtime-template.js` (new chunk) + a NEW `emit-messages.ts` + stdlib `scrml:data` extension. Avoid touching `emit-html.ts` (C11 territory). If you need to touch `runtime-template.js`, do it adds-only at the END (no merge conflicts with C9/C11 if they happen to touch it). C7's `validators` chunk pattern (chunk 16) is the precedent if you go chunk-route.

## Anti-patterns reading

`scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` if i18n-library idioms creep in (intl-messageformat, FormatJS, react-intl, etc.). Resolution chain is bespoke scrml.

## File-modification inventory expected

| File | Reason |
|---|---|
| `compiler/src/codegen/emit-messages.ts` (NEW likely) | Level-1 inline-override codegen emission |
| `compiler/src/runtime-template.js` (likely) | `messageFor` runtime helper + Level-2/Level-3 storage |
| `compiler/src/codegen/runtime-chunks.ts` (possible) | new `messages` chunk if cleanly separable |
| `compiler/src/codegen/emit-client.ts` (possible) | chunk-detection trigger |
| `stdlib/data/index.scrml` OR equivalent (likely) | `registerMessages` API + `messageFor` re-export from scrml:data |
| `compiler/src/codegen/emit-validators.ts` (possible) | extend C7 to call into emit-messages for inline-override registration |
| `compiler/tests/unit/c10-error-message-resolution.test.js` (NEW) | unit tests |
| `compiler/tests/unit/runtime-tree-shaking.test.js` (possible) | chunk-count adjustment if a new chunk added |
| `docs/changes/phase-a1c-step-c10-error-message-resolution/{progress,SURVEY}.md` | crash-recovery + survey |

## Definition of Done

- All §scope IN items shipped.
- 0 regressions vs baseline (10,176 / 60 / 1 / 0 post-C8 land).
- Spec re-verified (§55.10) against SPEC.md text.
- `messageFor` reachable by C11; C11's hookpoints documented.
