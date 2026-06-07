# MAP BUILD — PHASE C — DISPATCH D3: runtime (value-canonical hasher + map structure + method surface + codec + map-`==`)

(Verbatim archive of the dispatch prompt, per S136.)

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full + **`docs/changes/map-build-phase-c-2026-06-06/SURVEY-SYNTHESIS.md` (the D3 section — exact fire-sites, the reuse-templates, and the 3 load-bearing runtime design calls)**. Maps reflect `4c8063b6`; source current (D0/D1/§59.8 in your base after merge-startup). Report `Maps consulted: …; load-bearing finding: …`.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
1. `pwd` starts with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90). Save `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` == `WORKTREE_ROOT`.
3. **`git -C "$WORKTREE_ROOT" merge main` (S112) — inherit D0 (`normalizeUnion`) + D1.** Conflicts → STOP.
4. `git status --short` clean. 5. `bun install`. 6. `bun run pretest`.
**Path discipline (S99/S126):** edits via Bash on worktree-absolute paths; NEVER `cd` into main; `git -C "$WORKTREE_ROOT"` + worktree-absolute paths only. First commit: `WIP(d3): start at <pwd>`.

# TASK — the value-native map RUNTIME (§59) in `compiler/src/runtime-template.js`
Read SPEC §59 IN FULL (esp. §59.5 key-hash, §59.6 read, §59.7 write, §59.9 ==, §59.10 codec) + the SURVEY-SYNTHESIS D3 section FIRST (Rule 4). This dispatch is RUNTIME-ONLY (the `_scrml_*` helpers the codegen D4 will emit calls to). It is INDEPENDENT of the parser (D2) — testable in isolation by calling the helpers directly. **Authoritative file: `compiler/src/runtime-template.js`** (NOT the stale `dist/scrml-runtime.js`). Register chunk markers in `compiler/src/codegen/runtime-chunks.ts`.

## Scope

1. **`_scrml_fnv1a(str)`** — transcribe `compiler/src/codegen/fnv1a-hash.ts:82` VERBATIM into the runtime (it is a compile-time TS util; the runtime needs its own copy). Constants are NORMATIVE: prime `16777619`, offset basis `2166136261`, `Math.imul(h, prime) >>> 0`, output `h.toString(36).padStart(8,"0")`. Do NOT change them.

2. **`_scrml_value_canonical(v)`** — the value→canonical-string walker (§59.5; the headline net-new piece). Mirror the `_scrml_structural_eq` (~2491) walk SHAPE + the `normalizeType` (`codegen/type-encoding.ts:180`) alpha-sort discipline, but over LIVE values producing a STRING:
   - **struct**: fields **alpha-sorted by name** (`Object.keys(v).sort()`), each `name:canon(value)`.
   - **enum**: `_tag(canon(payload-fields…))`.
   - **array**: element-ordered `[canon(e0),canon(e1),…]`.
   - **primitives by literal form** — ⚠ **PIN THE BYTE-EXACT SERIALIZATION (the hash-consistency sharp edge).** Decide + DOCUMENT a canonical form for: number (`1` vs `1.0` vs `1e0` — normalize; handle `-0`→`0`), string (a delimiter/escape that can't collide with structural punctuation), boolean, `not`/`null`. Two §45-structurally-equal values MUST produce byte-identical strings (that is the §59.5 keystone). Add explicit tests for the edge cases.
   - **acyclic precondition is satisfied** (the D0/cycles-prereq) — you do NOT need a cycle-guard (unlike `_scrml_structural_eq` which kept one defensively). Note this.

3. **The map data structure** — SURVEY-SYNTHESIS recommends: a tagged plain object keyed by the FULL canonical key-string, storing `{ k: <keyValue>, v: <value> }` entries (k preserved for `.keys()`/`.entries()` + collision `==`). Clone-on-write. Shape suggestion (decide + document): `{ __scrml_map: true, entries: { [canonStr]: {k, v} }, ordered: bool, order?: [canonStr…] }` — a value, not a class (no identity, §45.6). It MUST: (a) be distinguishable from a plain struct/array at runtime (the `__scrml_map` tag); (b) round-trip through the codec; (c) compare structurally. **Full-canonical-string keying makes distinct-value collisions impossible**, so no in-bucket `==` is needed (simpler than FNV-bucketing — recommended for v1; the FNV hash from step 1 is available if you choose hash-bucketing instead, but justify it).

4. **`@ordered` insertion-order** — ⚠ JS objects iterate **integer-like string keys in numeric order, NOT insertion order** (an `[int: V]` map would silently reorder). So: the UNORDERED default does NOT promise order (relies on unspecified iteration — consistent with "unordered + loud", §59.8) and carries NO `order` sidecar (zero cost). An `@ordered` map maintains an explicit `order: [canonStr…]` array on every `.insert`/`.remove` (the "visibly costs more", §59.8) and iterates via it. Test the integer-key case explicitly.

5. **Method surface** (all PURE — return a NEW map via clone-on-write; reassignment-canonical, §59.7):
   `_scrml_map_from_entries(pairs)` (for the literal) · `_scrml_map_get(m,k)` · `_scrml_map_insert(m,k,v)` · `_scrml_map_remove(m,k)` · `_scrml_map_update(m,k,fn)` · `_scrml_map_insert_all(m,other)` · `_scrml_map_has(m,k)` · `_scrml_map_get_or(m,k,d)` · `_scrml_map_keys(m)` · `_scrml_map_values(m)` · `_scrml_map_entries(m)` · `_scrml_map_size(m)` · `_scrml_map_sorted(m)` · `_scrml_map_sorted_by(m,fn)`.
   - **`_scrml_map_get` MISS returns `null`** (the `not` sentinel — §42/S89 no-null; `not`→JS `null`). NOT `undefined` — so it composes with `given`/`is some` (which test `!== null && !== undefined`). A STORED `not` value is `null` too — `.has(k)` is the disambiguator (§59.6).
   - **`.entries()` returns `[{ key, value }]` STRUCTS** (the S169 iteration ruling — the entry is a struct, NOT a tuple). `.keys()` → `[KeyT]`; `.values()` → `[ValT]`. **Positional correspondence**: `keys()[i]` / `values()[i]` / `entries()[i]` share one ordering within an observation (§59.8).
   - `.insertAll(other)` — `other` is ANOTHER map (§59.7, scrml has no tuple); insert all its entries (last-wins).
   - `.update(k, fn)` — `fn` receives the current value or `not` (`null`); upsert.

6. **`_scrml_map_encode(m)` / `_scrml_map_decode(x)`** — lossless codec (§59.10). Entries-array encoding `[[k,v],…]` **canonically ordered** (by canonical key-string, for bit-stability). A stored `not`/`null` value reuses the EXISTING §57 absence-envelope `{ __scrml_absent: true }` per-value — find the §57 encoder (`codegen/wire-format.ts:184`) + decoder (`runtime-template.js:710`) and reuse the envelope at the leaf; do NOT re-invent absence encoding. The decoder reconstructs the tagged map. Round-trips across §57 wire / SQL-JSON / `==`.

7. **Order-independent map `==`** (§59.9) — add a **`map` case to `_scrml_structural_eq`** (it has no map case today): two maps are equal iff same canonical-key set with structurally-equal values, **regardless of order** (even for `@ordered` maps — `==` ignores order). ⚠ This touches EXISTING `_scrml_structural_eq` — the map branch MUST NOT change non-map behavior (gate on the `__scrml_map` tag first). Verify existing structural-eq tests stay green.

8. **Chunk markers** — register the `_scrml_map_*` + `_scrml_value_canonical` + `_scrml_fnv1a` functions in `codegen/runtime-chunks.ts` (~218 `CHUNK_MARKERS`) so tree-shaking keeps them when maps are used (and drops them when not). Without this, a map-using build → `ReferenceError`.

## DEFER (v1)
- Codegen lowering (D4 emits the calls to these helpers) — out of scope.
- HAMT / structural-sharing (plain-object clone-on-write for v1).
- `set` (D5).

## VERIFICATION (before DONE) — D3 is testable in ISOLATION
1. Full `bun run test` — baseline **23,143/0/220/1/918** (post-D1). ZERO regressions (esp. the existing `_scrml_structural_eq` tests, given the new map branch).
2. NEW runtime-unit tests (call the helpers directly — no parser/codegen needed):
   - **hash-consistency**: `_scrml_value_canonical` byte-identical for structurally-equal values with different field ORDER (`{a:1,b:2}` vs `{b:2,a:1}`); enums; arrays; the pinned primitive edge cases (`1`/`1.0`, `-0`/`0`, strings with delimiter chars).
   - each method: insert/get/remove/update/insertAll/has/getOr/keys/values/entries/size/sorted; `_scrml_map_get` MISS → `null`; a STORED `not` distinguished from absence via `.has`.
   - `.entries()` element is a `{key,value}` struct; keys/values/entries positional correspondence.
   - `@ordered` integer-key insertion order preserved (the JS-numeric-key trap); unordered default does not crash on integer keys.
   - codec round-trip (incl. a stored-`not` via the §57 envelope); map `==` order-independent (and `@ordered` maps equal regardless of insertion order); map-vs-non-map `==` is false (the typer fires E-EQ-001 at compile, but the runtime should not crash).
3. within-node parity 1005/0 (a runtime-template change shouldn't shift the parser corpus; verify).
4. R26: N/A (no map source until D2+D4 integrate). The runtime-unit tests + 0-regression are the gate.

## COMMIT DISCIPLINE (S83)
Commit per unit (fnv1a+canonical; structure+methods; codec; map-==; chunk markers; tests). `git diff`→`git add`→commit each. Clean `git status` before DONE. Update `progress.md` per step.

## REPORT (raw structured text)
`WORKTREE_PATH` · `FINAL_SHA` · `FILES_TOUCHED` · merge-startup result · full-suite + within-node counts · per-piece status (1-8) · **the pinned primitive-canonical-form decision** (number/string/-0/not) · the map data-structure shape you chose · `@ordered` sidecar approach · deferred items · maps feedback.
