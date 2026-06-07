# D3 — Value-Native Map RUNTIME (§59) progress

Re-dispatch after socket-death of prior D3 (zero committed). Fresh start.

## 2026-06-06 — startup
- [done] Worktree verified, merge main (already up-to-date — base fbb3c208 has D0+D1), bun install, bun run pretest.
- [done] Read primary.map.md + SURVEY-SYNTHESIS D3 + SPEC §59 in full.
- [done] Read fnv1a-hash.ts:82, _scrml_structural_eq @2491, normalizeType @180, wire-format codec, _scrml_value_indexed_key @594, runtime-chunks.ts.
- First commit: WIP(d3): start at <pwd>.

## Design decisions (PINNED)
- value-canonical primitive forms (see runtime header doc).
- map shape: { __scrml_map: true, entries: {[canonStr]: {k,v}}, ordered, order? }.
- @ordered: explicit `order` array maintained per insert/remove; unordered = no sidecar.

## Steps
- [ ] Step 1: _scrml_fnv1a + _scrml_value_canonical (commit)
- [ ] Step 2: map structure + method surface (commit)
- [ ] Step 3: codec encode/decode (commit)
- [ ] Step 4: map case in _scrml_structural_eq (commit)
- [ ] Step 5: chunk markers in runtime-chunks.ts (commit)
- [ ] Step 6: runtime-unit tests (commit)
- [ ] Step 7: full suite + within-node verification

## 2026-06-06 — progress
- [done] Step 1-3 (597947aa): _scrml_fnv1a (FNV-1a verbatim, byte-matches TS ref) + _scrml_value_canonical (length-prefixed self-delimiting; -0->0, 1==1.0, field-order-independent) + map structure { __scrml_map, entries:{[canonStr]:{k,v}}, ordered, order? } + full method surface + codec.
- [done] Step 4 (0c5e914c): map case in _scrml_structural_eq (order-independent, gated on __scrml_map tag; non-map regression-free; equality-semantics 39/0).
- [in flight] Step 5: chunk markers (RUNTIME_CHUNK_ORDER += 'map'; CHUNK_MARKERS.map; catalog doc) + 2 coupled count tests 27->28 (tree-shaking + c10).
- [next] Step 6: runtime-unit tests.

## 2026-06-06 — steps 5-6 complete
- [done] Step 5 (15bde85f): 'map' chunk marker + RUNTIME_CHUNK_ORDER 27->28 + 2 coupled count tests (tree-shaking + c10) updated.
- [done] Step 6: value-native-map-runtime-s169.test.js — 59 tests, all pass. Covers fnv1a==TS-ref, canonical hash-consistency (field-order/enums/arrays/-0/1-vs-1.0/string-delimiter/empty-string-vs-not), full method surface, MISS->null, stored-not-vs-absence via .has, entries {key,value} struct + positional correspondence, @ordered insertion order + JS-numeric-key trap, codec round-trip (+stored-not §57 envelope + bit-stability), map == order-independent (+@ordered), map-vs-non-map false-no-crash, chunk wiring.
- [CALL] §F4 design call surfaced: codec preserves @ordered FLAG but NOT insertion order (canonical key order on wire) — §59.10 bit-stability + §59.9 order-not-value-identity; lossless at VALUE level (== holds). Documented in codec comment + tests §F4/§F4b.
- [next] Step 7: full suite + within-node verification.
