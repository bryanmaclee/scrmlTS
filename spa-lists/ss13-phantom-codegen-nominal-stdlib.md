# sPA ss13 — phantom-codegen-nominal-stdlib

**Launch:** `read spa.md ss13` · **Branch:** `spa/ss13` · **Worktree:** `../scrml-spa-ss13`
**Merged from:** phantom-codegen-nominal-flips · stdlib-canonical-form

> **Big green-field arcs.** §29/§58/§59 are Nominal (spec-defined, zero codegen) — each is a
> multi-subsystem implementation that flips a Nominal banner. Dispatch per-section, not as one.

## Shared ingestion
The "spec-defined, no codegen" / Nominal-banner-flip features: §23 foreign-code/sidecar/WASM (zero
`WebAssembly.instantiate` in codegen/), §29 vanilla file interop (.js/.html/.css pass-through), §58 Build
Story (Merkle closure + lock), §59 Value-Native Maps. PLUS the stdlib canonical-form migration (11
stdlib .scrml using JS anti-patterns: `throw new Error`→`fail .Variant`, `try{}`→`!{}`, bun imports).
Threads: the `api.js` per-file emit + `module-resolver.js` pipeline these flip; `compute-program-config.ts`
(config/manifest); the S132 §29-reframe-to-Nominal + re-trigger-on-friction pattern; §47 cross-refs;
§19 fail/`!{}` as the stdlib-migration target.

## Core files
`compiler/SPEC.md` (Nominal §29/§58/§59) · `compiler/src/api.js` · `compiler/src/compute-program-config.ts` · `compiler/src/module-resolver.js` · `stdlib/*`

## Items (least-ingestion-first)
1. **`stdlib-canonical-form-cleanup`** `[open]` experiment LOW · tier high — migrate 11 stdlib .scrml off JS error/import anti-patterns (Phase 3 remainder: 3a throw, 3b try, 3c bun-import). **WARNING:** the test's cited codes (E-ERROR-006/007/E-IMPORT-005) are author-shorthand, NOT live spec codes — verify. Entry: `stdlib-canonical-form-cleanup.test.js` (L173/184/195).
2. **`browser-language-overclaims`** `[open]` feature n-a · tier med — §23 sidecar/WASM/supervised-restarts spec-defined but no codegen (grep confirms zero `WebAssembly.instantiate`/sidecar-spawn). Parked phantom-codegen gap; user verbatim "no amendments to published articles for now." Entry: §23 SPEC (no impl file to anchor).
3. **`vanilla-file-interop-impl`** `[open]` feature Nominal · tier high — implement §29 Vanilla File Interop (.js/.html/.css pass-through; flip the Nominal banner). Touches file-discovery + per-file emit + the §21 named-binding import path (live JS interop today). Re-trigger ≥2 adopter friction. Entry: api.js per-file emit + module-resolver.js.
4. **`build-story-impl`** `[open]` feature Nominal · tier high — implement §58 Build Story (`compile(source, buildStory)` + Merkle closure + `build-story.lock`). Composite SHA-256 + manifest/config + new sidecar; SPEC-only. Entry: compute-program-config.ts + a new closure/lock module + api.js; §47 interaction.
5. **`value-native-maps-impl`** `[open]` feature Nominal · tier high — implement §59 Value-Native Maps (`[KeyT:ValT]` type/grammar, `[k:v]` literals, value-canonical key codec, method-native ops). Cross-cutting: type-system + tokenizer/parser + codegen + runtime + §47.1.6 hashing; `lint-w-map-iteration-order.js` already exists; RATIFIED-DESIGN locks M1-M9. Entry: type-system.ts + tokenizer.ts + new map-emit codegen.

## Progress
`ss13.progress.md`. Land on `spa/ss13`; ping PA inbox when ready. Do not advance main / do not push.
