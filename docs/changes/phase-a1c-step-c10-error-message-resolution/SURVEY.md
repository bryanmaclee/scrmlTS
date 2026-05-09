# A1c — Step C10 — SURVEY (4-level error message resolution emission, L12)

**Author:** dispatch agent (general-purpose, pipeline-persona substitution authorized).
**Date:** 2026-05-08 (S73).
**Worktree:** `.claude/worktrees/agent-a44100c824bdd5b59`.
**Baseline tests:** 10,176 / 60 / 1 / 0 (confirmed, second run after first run had 2-fail flake from promote-test side effects on a temp dir — not relevant to C10).

## 1. Verdict

**PROCEED-AS-BRIEFED.** The brief's scope and design are correct. No surprises. The minimal-shape implementation crystallises as:

1. NEW runtime helpers in `runtime-template.js` — adds-only at the END to avoid sibling-merge conflict (chunk-detected → new `messages` chunk):
   - `_scrml_messages_inline` (Level-1 storage: `{ "<cellName>::<validatorName>": "<override>" }`).
   - `_scrml_messages_registered` (Level-2 storage: `{ <Tag>: (field, ...payload) => string }`).
   - `_scrml_messages_register(map)` — public facade for L2 registration (sibling of `_scrml_navigate` etc.).
   - `_scrml_messages_register_inline(cellName, validatorName, override)` — Level-1 emission helper.
   - `_scrml_message_for(error, fieldName, cellName?)` — the 4-level walker (Level 1 → Level 2 → Level 3).
   - `_SCRML_DEFAULT_MESSAGES` — Level-3 catalog: 14 universal-core tags + Custom + a `_fallback`.
2. NEW codegen file `compiler/src/codegen/emit-messages.ts` — single export `emitInlineMessageOverrides(node, qualifiedName, opts)` returns `_scrml_messages_register_inline(cellName, validatorName, override)` registration lines. Returns `null` when nothing to emit. C7's emission path (`_appendSidecar` in `emit-logic.ts`) calls it adjacent to the existing validator sidecar.
3. Edit `runtime-chunks.ts` — add `messages` to `RUNTIME_CHUNK_ORDER` + `CHUNK_MARKERS` so the chunk is tree-shakeable.
4. Edit `emit-client.ts` — chunk-detection: when a state-decl has any validator with `inlineOverride !== null` OR any `<errors of=>` element appears (C11 will trigger this independently), add `messages` chunk. For C10's slice, trigger ONLY on `inlineOverride !== null` so isolated test sources without C11 still emit the chunk; the C11 sibling can add its own trigger when it lands.
5. Edit `emit-logic.ts` — call `emitInlineMessageOverrides(node, qualifiedName, opts)` next to `emitValidatorRunnerSidecar`, append to sidecar parts. Independent of C7 — emits even when C7 skips (e.g., a top-level cell with override would still register override, though no runner consumes it; defensive emit is cheap and forward-compatible with §55.5 L11 Edge A enforcement).
6. Edit `stdlib/data/index.scrml` — re-export `registerMessages` + `messageFor` so user code can do `import { registerMessages, messageFor } from 'scrml:data'`. The actual function bodies are thin wrappers that call `_scrml_messages_register` / `_scrml_message_for`. Mirror the `parseVariant` re-export pattern.
7. NEW test file `compiler/tests/unit/c10-error-message-resolution.test.js` — Level-1 wins, Level-2 wins over Level-3, Level-3 default fires, 14+1 default messages render, parameterised tags.

## 2. Verified pre-existing state (sanity-check the brief's claims)

- **B13 inline-override extraction → CONFIRMED.** `validator.inlineOverride: string | null` populated by B13. Test reference: `compiler/tests/unit/c7-per-cell-validator-runner.test.js:721-735`.
- **C7 strips trailing string-literal arg → CONFIRMED.** `compiler/src/codegen/emit-validators.ts:280-296` — `lowerValidatorArgs` consults `validator.inlineOverride` and slices the trailing `lit("string", ...)` arg.
- **`scrml:data` location → CONFIRMED.** `stdlib/data/index.scrml` re-exports from `validate.scrml`, `transform.scrml`, `parse.scrml`. **No `registerMessages` or `messageFor` exists today — C10 adds them.** Mirroring `parseVariant`'s pattern: a single-purpose `.scrml` module re-exported from `index.scrml`.
- **`messageFor` is greenfield → CONFIRMED.** Single match in code base: `compiler/src/codegen/emit-synth-surface.ts:53` (a comment forward-referencing C10).
- **Runtime-template chunk pattern → CONFIRMED.** `runtime-template.js:389-407` shows the validator chunk pattern (single-line `// §X.X ... (chunk: 'foo')` marker, content follows). C5 reset chunk at line 331 is the same shape.
- **Chunk-detection precedent → CONFIRMED.** `emit-client.ts:203-209` adds `validators` chunk when `node.validators.length > 0`. C10's chunk-detection adds `messages` when ANY validator has a non-null `inlineOverride`.
- **`fireValidator` returns ValidationError shape → CONFIRMED.** `runtime-validators.js:25-50` documents the 14 tags + payload fields verbatim. Custom tag at SPEC §55.9 line 25229.

## 3. Authorized decisions

### 3a. Chunk vs sibling-const-injection

**Decision: chunk-add `messages`.** C5 reset and C7 validators already use the chunk pattern. A new chunk `messages` is the consistent home, allows tree-shaking when no overrides + no `<errors of=>`, and keeps the 14+1 default-message catalog out of files that don't need it.

### 3b. messageFor location: stdlib re-export OR runtime-helper-only

**Decision: BOTH.** Runtime helper `_scrml_message_for` is the canonical implementation (lives in the new `messages` chunk). `messageFor` is exported from `stdlib/data/messages.scrml` as a thin wrapper that calls `_scrml_message_for` — gives users `import { messageFor } from 'scrml:data'`. C11 can call `_scrml_message_for` directly from emitted code (no import needed). User code calls `messageFor` after import.

The wrapper-vs-direct-call asymmetry mirrors `_scrml_navigate` / `navigate()` (rewrite.ts:304 rewrites `navigate(...)` → `_scrml_navigate(...)`). I will NOT add a rewrite-rule for `messageFor` because `messageFor` semantics are in user-explicit-import territory (per spec line 25292 "auto-imported via `use scrml:data`"), and the existing import-resolution machinery handles that. C11 emits direct `_scrml_message_for` calls (no import required); user code goes through the stdlib re-export.

### 3c. Level-3 default catalog phrasing

Spec example phrasings (§55.10 lines 25282-25283 + §41.12 lines 17084-17087) inform the voice. Non-condescending professional. Catalog:

| Tag | Default message |
|---|---|
| Required | "{field} is required." |
| NotSome | "{field} is required." (semantically same in user-facing — different from `req` only on `""`/`[]`) |
| LengthFailed(predicate) | "{field} length must satisfy {predicate}." |
| PatternMismatch | "{field} doesn't match the expected format." |
| MinFailed(threshold) | "{field} must be at least {threshold}." |
| MaxFailed(threshold) | "{field} must be at most {threshold}." |
| GtFailed(expected) | "{field} must be greater than {expected}." |
| LtFailed(expected) | "{field} must be less than {expected}." |
| GteFailed(expected) | "{field} must be greater than or equal to {expected}." |
| LteFailed(expected) | "{field} must be less than or equal to {expected}." |
| EqFailed(expected) | "{field} must equal {expected}." |
| NeqFailed(forbidden) | "{field} cannot equal {forbidden}." |
| OneOfFailed(set) | "{field} must be one of: {set}." |
| NotInFailed(set) | "{field} cannot be any of: {set}." |
| Custom(tag) | "{field} failed validation ({tag})." |
| _fallback | "{field} is invalid." (unknown / future tags) |

Each entry is a function `(fieldName, payload) => string`. The `relational-predicate` payload for `LengthFailed` renders as e.g., `">= 2"`. Array payloads render via `Array.prototype.join(", ")`.

### 3d. Level-1 storage key shape

`<cellName>::<validatorName>` — uses `::` as separator (collision-safe since cell names cannot contain `::`). Override values are bare strings (Level-1 is static-string only per L12 Edge F). Lookup: `_scrml_messages_inline[cellName + "::" + validatorName]`.

For top-level cells, `cellName` is the bare name; for compound children, it is the qualified path (e.g., `"signup.email"`) — the same key C7 uses for its derivations. This means `<signup>` `<email req("custom message")>` with B13-extracted `validator.inlineOverride = "custom message"` registers as `_scrml_messages_register_inline("signup.email", "req", "custom message")`.

### 3e. Per-call-site fieldName resolution

Per §55.10 line 25272 + §41.12 line 17095, `messageFor(errorTag, fieldName, ...)` accepts the field display name as positional arg 2. C10's `_scrml_message_for(error, fieldName, cellName?)` has identical semantics. C11 will emit the cell's display name as `fieldName` (likely the bare name — `"name"`, `"email"` — though spec allows future label-attribute resolution). For C10's tests: pass the display name explicitly.

### 3f. Test surface

Unit tests in `compiler/tests/unit/c10-error-message-resolution.test.js`:

- §C10.0 — chunk wiring (chunk in `RUNTIME_CHUNK_ORDER`, content includes the helpers, tree-shakes when no validators+overrides).
- §C10.1 — `_scrml_message_for` with no Level-1, no Level-2 → Level-3 default fires for each of 14 tags + Custom + fallback.
- §C10.2 — Level-2 register wins over Level-3.
- §C10.3 — Level-1 inline override wins over Level-2 + Level-3.
- §C10.4 — `registerMessages` last-write-wins (compose, not error).
- §C10.5 — parameterised tags interpolate payload (`MinFailed(18)` → "Must be at least 18.").
- §C10.6 — codegen `emitInlineMessageOverrides` returns null for empty/no-override validator arrays; emits one register-call per validator with non-null override.
- §C10.7 — chunk-detection adds `messages` chunk only when at least one validator has `inlineOverride !== null`.
- §C10.8 — `messageFor` reachable via `import { messageFor } from 'scrml:data'` (compilation succeeds, runtime call works).

## 4. Out of scope (deferred to siblings/future)

- **`<errors of=expr/>` element** — C11.
- **Cross-field deps verification** — C9.
- **Engine-state validators (§55.14)** — Wave 4+.
- **Match Level-4 escape hatch** — consumer-side; not emitted by C10.
- **i18n locale switching** — future. `registerMessages` supports last-write-wins composition which is a forward-compatible primitive.
- **Field-display-name resolution from labels** — C11 territory; C10 just accepts whatever C11 passes.

## 5. Risk register

- **Sibling-merge with C11 on `runtime-template.js`** — mitigated: append at END, no edits to existing chunks. C11 may add its own chunk (e.g., `errors_element`) — same append pattern. Order in `CHUNK_MARKERS` is by appearance in template, so C10's `messages` will be after `validators` and before `derived`.

  **Correction:** since chunks are ordered by their marker's position in the template (sorted ascending by `idx`), inserting `messages` AFTER existing chunks (at the end of the file or just after `validators`) is fine. The runtime-chunks.ts builder doesn't care about insertion order in `CHUNK_MARKERS`; only the actual position. To minimise sibling collision, place the marker-insertion AT THE END of the runtime template (after `deep_reactive`).

  **Wait — there's a constraint.** `messages` needs to come AFTER `validators` AND `derived` chunks are loaded if `_scrml_message_for` ever depends on those (it doesn't, but defensive). It needs to come BEFORE any chunk that calls into `_scrml_message_for` (none today; C11 will be in `errors_element` chunk). Putting it at the END of the file is safe.

- **Test brittleness** — keep tests data-driven (table for the 14+1 default messages) so future tweaks to phrasing only update one place.

- **Sandbox shape** — C7's runtime-end-to-end tests use `assembleRuntime(new Set(RUNTIME_CHUNK_ORDER))` + `eval`-style execution. Mirror that pattern. The 14+1 default catalog tests can run pure-JS without the assembled runtime (just dynamic import of the helpers), but the integration tests (Level-1 win, etc.) need the full runtime.

## 6. Files-to-touch

| File | Action | Reason |
|---|---|---|
| `compiler/src/runtime-template.js` | edit (append-only at END) | new `messages` chunk (helpers + default catalog) |
| `compiler/src/codegen/runtime-chunks.ts` | edit | add `messages` to ORDER + MARKERS |
| `compiler/src/codegen/emit-client.ts` | edit | chunk-detection trigger on `inlineOverride !== null` |
| `compiler/src/codegen/emit-messages.ts` | NEW | per-cell inline-override registration codegen |
| `compiler/src/codegen/emit-logic.ts` | edit | wire emitInlineMessageOverrides into sidecar pipeline |
| `stdlib/data/messages.scrml` | NEW | `registerMessages` + `messageFor` user-facing wrappers |
| `stdlib/data/index.scrml` | edit | re-export from messages.scrml |
| `compiler/tests/unit/c10-error-message-resolution.test.js` | NEW | unit tests |
| `compiler/tests/unit/runtime-tree-shaking.test.js` | possible edit | chunk-count assertion (if test exists with hardcoded count) |
| `docs/changes/phase-a1c-step-c10-error-message-resolution/{progress,SURVEY}.md` | NEW | crash-recovery |

(Verifying tree-shaking test: will read its current state when implementation reaches that step.)

## 7. Exit gates

- 0 regressions vs 10,176 baseline.
- Chunk tree-shakes when no overrides + no errors-of element.
- Level-1 wins; Level-2 wins over 3; Level-3 fires for all 14 + Custom + fallback.
- `messageFor` callable from emitted JS as `_scrml_message_for(...)` AND callable from user scrml as `messageFor(...)` after `import { messageFor } from 'scrml:data'`.
- Hookpoints documented for C11 (the `_scrml_message_for(error, fieldName, cellName?)` signature).
