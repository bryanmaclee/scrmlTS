# SCOPE — payload-binding gap cluster (S184 dog-food)

**Filed:** S184 (2026-06-11). **Source:** L22/parseVariant dog-food. **Authorized:** user "scope the gap fixes."
Three related gaps in variant-payload binding. All confirmed empirically; none filed before S184.

## Payload-binding blast-radius map (empirical)
| Surface | Multi-field payload binding | Single-field |
|---|---|---|
| JS-style `match @x { .V(a,b) :> }` | WORKS | works |
| engine state-child `<V a b>` | WORKS | works |
| **`!{}` error arms `::V(a,b)` / `::V a b`** | **BROKEN** | works (`::V a`) |
| **`<match>` block-form `<V a b>`** | **BROKEN** | **BROKEN** (even `<V a>`) |

## Gap 1 — `!{}` error-handler arms: multi-field binding not scoped
**Reproducer:** any 2+-field error variant (`DbError::Conflict(field, detail)`; stdlib `ParseError::InvalidPayload(field, reason)`).
`save() !{ | ::Conflict(field, detail) :> { log(field+detail) } }` → `E-SCOPE-001` on field+detail.

**Root (traced):**
- Parser `ast-builder.js ~11654`: paren form `::V(a, b)` captures `binding = "a, b"` (comma-JOINED string, all idents); space form `::V a b` captures only the 1st ident (`binding = "a"`, `b` leaks into the body).
- Typer `type-system.ts:9282-9284`: `scopeChain.bind(arm.binding, ...)` binds `arm.binding` as a SINGLE name. For the paren form it binds the literal name `"a, b"` → individual `a`/`b` never resolve → E-SCOPE-001.

**Fix:** at `type-system.ts:9283`, split `arm.binding` on `,` (trim) and `scopeChain.bind` EACH name. (~3 lines.) This fixes the paren form `::V(a, b)` — the §19.4.3 canonical multi-field form.
**Open Q (minor):** the SPACE form `::V a b` for `!{}` — support it (extend the parser at 11671 to consume all space-separated idents, like engine/match tags) or leave it (paren is §19.4.3 canonical)? Lean: paren-only canonical for `!{}`; the space form stays single-binding. Worth a 1-line decision.

## Gap 2 — `<match>` block-form arms: payload binding not scoped (single OR multi)
**Reproducer:** `<match for=R on=@r> <Done count> "${count}" </> ... </>` → `count` undeclared (E-SCOPE-001). Contradicts PRIMER §6.2 (`<Error msg>` → `${msg}` taught as working).

**Root (traced):**
- The JS-style `match-arm-block` typer case (`type-system.ts:9578-9590`) registers EACH `payloadBindings` entry into the arm-body scope — the WORKING path.
- The `<match for=T>` BLOCK-form arms (parsed via `match-statechild-parser.ts` → `MatchArmEntry`; symbol-table.ts ~10494) do NOT reach that per-binding registration: the block-form arm bodies are scope-checked without the variant payload bindings in scope. The parser captures `payloadBindingsRaw` + codegen (`emit-match.ts:622-629`) splits it, but the TYPER fires E-SCOPE-001 first.

**Fix:** wire the block-form arm payload bindings into the arm-body scope in the typer — mirror the JS-style `match-arm-block` handling at 9588 (split `payloadBindingsRaw` / read `payloadBindings`, bind each into the arm scope before walking the body).
**KEY Open Q:** is `<match>` block-form payload binding intended LIVE, or native-parser-only / spec-ahead? PRIMER §6.2 teaches it as working AND the JS-style + engine paths work, so the INTENT is clearly that it works → likely a real live-typer wire-up. But the block-form parser comment ("Phase 4 will tokenize") hints the wiring was staged. CONFIRM intent before fixing: if native-only-by-design, the fix is a PRIMER §6.2 caveat instead. Lean: wire it live (the feature is taught + the sibling paths work).

## Gap 3 — SPEC §41.13 worked example doesn't compile (doc bug)
`compiler/SPEC.md:20644-20646`: `| ::ParseError msg :> { fail LoadError::Malformed(msg) }` → `E-SCOPE-001` + `E-TYPE-080`. `::ParseError` is the ENUM name, not a variant; the canonical handler matches the four ParseError VARIANTS (§20663 normative).
**Fix (doc):** correct the example to individual ParseError variant arms. The canonical handler needs `::InvalidPayload(field, reason)` (multi-field) → **depends on Gap 1** (else the example still won't compile). Sequence: Gap 1 → then the SPEC example.

## Sequencing + dispatch shape
- Gaps 1 + 2 are both TYPER scope-registration fixes in `type-system.ts` → ONE dispatch (same file, related). Gap 1 ~3 lines; Gap 2 mirrors the 9588 path.
- Gap 3 is a doc fix that DEPENDS on Gap 1 (the canonical example uses a multi-field ParseError variant) → land after Gap 1, PA-direct doc edit.
- Open Qs to ratify before dispatch: (1.Q) `!{}` space-form multi support (lean: paren-only); (2.Q) `<match>` block-form payload intended-live (lean: yes, wire it).

## RATIFIED — S184 user (both leans):
- (1.Q) `!{}` multi-field: PAREN-only canonical `::V(a, b)` (§19.4.3). The space form `::V a b` stays
  single-binding — do NOT extend the parser for space-multi. Fix = comma-split in the typer (9283).
- (2.Q) `<match>` block-form payload binding: WIRE IT LIVE (mirror the JS-style match-arm-block path at
  type-system.ts:9588). It is taught (PRIMER §6.2) + the JS-style/engine siblings work — intent is live.
