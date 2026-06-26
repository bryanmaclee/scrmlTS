# ss38 — HAMT / structural-sharing maps (FBIP increment 1) — SURVEY-FIRST

**Fill-note:** the FBIP feasibility DD's **bounded, zero-soundness-risk first increment** — swap the §59 value-native map RUNTIME representation from COW-clone-the-whole-map to a **HAMT** (hash-array-mapped-trie / persistent structural-sharing) structure. Still pure/immutable (structural sharing, NOT in-place mutation) → **no uniqueness analysis pass needed, zero soundness risk.** Kills the O(n)-clone-per-insert hot-loop tax (the DG/lexer slice mechanics gap) AND the existing **S94 super-linear blow-up** → **value-positive REGARDLESS of Road B.** Captures most of the mechanics-beauty win without the full FBIP subsystem. RATIFIED-direction S222 (the FBIP graduated path, increment 1).

**⚠️ Shares the §59 map runtime with ss37 (Set) → SEQUENCE, do NOT parallel-fire both.** Recommended: HAMT-swap maps HERE first, then build Set (ss37) on the HAMT template. OR if ss37 already landed on COW, HAMT-swap map+set together in this list.

**Shared ingestion:** the §59 value-native map runtime — the value-canonical hasher, the map structure, the method surface (`.insert`/`.get`/etc.), the lossless codec, order-independent `==`. The swap changes ONLY the internal structure (→ HAMT) while preserving EVERY observable: value-canonical hashing, order-independent `==`, the codec round-trip, the method surface, AND the source-level COW form (`@m = @m.insert(k,v)` stays — only the runtime gets cheap).

**coreFiles:** the runtime §59 map structure + value-canonical hasher (`dist/scrml-runtime.js` map impl) · codegen map lowering · the full §59 map test suite (the swap MUST preserve all map semantics).

**Brief reminders:** SURVEY-FIRST — Phase 0 confirms a HAMT preserves value-canonical hashing + order-independent `==` + the lossless codec (the §59.5 acyclic-value keystone is unchanged). It's a runtime-representation change: source semantics + API + wire-format UNCHANGED, observable only as speed. **Differential-test against the current COW map** (identical observable behavior on the full map suite — any diff is a bug; this IS the FBIP soundness-gate pattern in miniature). R26 + FULL `bun run test`. Standalone value: the S94 super-linear blow-up fix.

## Items

1. **HAMT map runtime swap** (FBIP increment 1 + S94 blow-up fix) `[status=open]` **SURVEY-FIRST**
   - Swap §59 map internal rep COW → HAMT (persistent structural sharing); O(n) clone-per-insert → O(log n) shared-path. Preserve value-canonical hashing, order-independent `==`, lossless codec, method surface, source-COW form.
   - Differential-test vs current COW map (observably identical). Then sequence ss37 (Set) on the HAMT template.
   - Footprint: runtime map structure + hasher; codegen lowering (likely unchanged — source form is stable); test-suite preservation.
