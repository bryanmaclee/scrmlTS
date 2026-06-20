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
1. **`stdlib-canonical-form-cleanup`** `[parked → PA scope]` experiment LOW · tier high — migrate 11 stdlib .scrml off JS error/import anti-patterns (Phase 3 remainder: 3a throw, 3b try, 3c bun-import). **WARNING:** the test's cited codes (E-ERROR-006/007/E-IMPORT-005) are author-shorthand, NOT live spec codes — verify. Entry: `stdlib-canonical-form-cleanup.test.js` (L173/184/195). → **DESIGN-GATED** (3c needs SPEC §40.4 amendment OR vendoring; 3a/3b cross-caller blast radius + assertion-framework semantics). See Disposition §1.
2. **`browser-language-overclaims`** `[parked]` feature n-a · tier med — §23 sidecar/WASM/supervised-restarts spec-defined but no codegen (grep confirms zero `WebAssembly.instantiate`/sidecar-spawn). Parked phantom-codegen gap; user verbatim "no amendments to published articles for now." Entry: §23 SPEC (no impl file to anchor). → **USER-BLOCKED** (only action = article amendment, vetoed). See Disposition §2.
3. **`vanilla-file-interop-impl`** `[parked]` feature Nominal · tier high — implement §29 Vanilla File Interop (.js/.html/.css pass-through; flip the Nominal banner). Touches file-discovery + per-file emit + the §21 named-binding import path (live JS interop today). Re-trigger ≥2 adopter friction. Entry: api.js per-file emit + module-resolver.js. → **FRICTION-GATED** (Bug 10, Nominal/framing-corrected S132; trigger not fired). See Disposition §3.
4. **`build-story-impl`** `[parked → re-bucket]` feature Nominal · tier high — implement §58 Build Story (`compile(source, buildStory)` + Merkle closure + `build-story.lock`). Composite SHA-256 + manifest/config + new sidecar; SPEC-only. Entry: compute-program-config.ts + a new closure/lock module + api.js; §47 interaction. → **NOT-SPA-SIZED** (~90-200h, M6-gated; sibling sPA ss14 item5 already flagged "deferred feature arc → design/feature track"). See Disposition §4.
5. **`value-native-maps-impl`** `[parked → already-done]` feature Nominal · tier high — implement §59 Value-Native Maps (`[KeyT:ValT]` type/grammar, `[k:v]` literals, value-canonical key codec, method-native ops). Cross-cutting: type-system + tokenizer/parser + codegen + runtime + §47.1.6 hashing; `lint-w-map-iteration-order.js` already exists; RATIFIED-DESIGN locks M1-M9. Entry: type-system.ts + tokenizer.ts + new map-emit codegen. → **STALE FOOTPRINT — ALREADY IMPLEMENTED** (known-gaps: "BUILT S169, Nominal→Implemented"; 202 tests green / 9 files). See Disposition §5.

---

## Disposition (sPA ss13 — S209, 2026-06-20) — WHOLE LIST PARK/ESCALATE, zero landings

Verified all 5 items against primary sources (live code/tests, `docs/known-gaps.md`, the §59 RATIFIED-DESIGN, the entry test's own deferral notes) per R4/R26 — NOT the stale S208 footprints. None is bounded sПА-executable work. This is the contract's whole-list-stall / stand-down condition. Detail in `ss13.progress.md`. Net for the PA:

- **§1 stdlib Phase 3 → ESCALATE (design scope).** The entry test (`stdlib-canonical-form-cleanup.test.js`) already `.skip`s C21/C22/C23 "pending PA scope decision … coordinated API refactor (signatures + callers + spec extension)." Verified surface: 3a `throw new Error`→`fail .Variant` (43 hits/11 files, incl. comments) changes fn contracts → every caller of a throwing stdlib fn becomes a failable-caller; the `scrml:test` assertion fns (`assertEqual`/`assertThrows`/…) are called from every `~{}` block, and `assertThrows` *needs* `try/catch` to catch the function-under-test — blast radius far exceeds the list's stdlib+api.js+module-resolver ingestion. 3c `from "bun"`/`"bun:sqlite"` (2 files: redis, store/kv) is **explicitly** "needs SPEC §40.4 amendment OR vendoring" — a design ruling. The `${…}` host blocks are scrml **logic** (not `_{}` foreign-code), so the throws/trys ARE scrml-surface, but the migration model is undefined.
- **§2 §23 browser overclaims → PARK (user-blocked).** Only available action is amending published articles; user verbatim "no amendments to published articles for now." Phantom-codegen gap (sidecar/WASM/supervised-restarts spec'd, zero codegen) stands as a record.
- **§3 §29 vanilla interop → PARK (friction-gated).** known-gaps Bug 10: Nominal/framing-corrected S132, deliberately deferred, re-trigger ≥2 adopter friction. No trigger fired; live JS interop today is §21 (distinct + working).
- **§4 §58 build story → ESCALATE/re-bucket.** known-gaps:1236 (filed by sPA ss14 item5, S209): SPEC'd but 0 impl symbols, ~90-200h, M6-gated; "Re-bucket candidate: a deferred feature arc, not an sPA fix — consider moving to a design/feature track." Concur. Trust-sensitive (Merkle/SHA-256), `*`-marked not-yet-proven clauses → needs PA staging, not a speculative sПА first-slice.
- **§5 §59 value-native maps → ALREADY BUILT (list stale).** known-gaps: "value-native map §59 BUILT S169 (Nominal→Implemented)"; the 9 `value-native-map-*` suites pass 202/202. The S208 footprint ("implement §59, green-field") used the dead Nominal banner. Residual = **doc reconcile only** (flip SPEC §59 Nominal banner + reconcile §0 counts + fix this list) — PA/SPEC territory, not a build.

**Recommendation to PA:** ss13 was clustered from two stale premises — "Nominal-flip green-field §29/§58/§59" (but §59 is built; §29/§58 are deliberate deferrals) and "stdlib mechanical cleanup" (but Phase 3 is design-gated). Suggest: (a) mark §59 integrated/doc-reconcile; (b) re-bucket §58 to the design/feature track (joins ss14's same call); (c) leave §29/§23 as standing deferrals; (d) open a PA/dPA scope item for the stdlib `fail`/`!{}`/bun-import migration model (incl. SPEC §40.4). No branch code to re-integrate — this disposition + `ss13.progress.md` ARE the deliverable.

## Progress
`ss13.progress.md`. Land on `spa/ss13`; ping PA inbox when ready. Do not advance main / do not push.
