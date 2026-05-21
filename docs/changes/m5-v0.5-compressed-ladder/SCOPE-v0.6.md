# M5/M6 compressed MD ladder — v0.6 cut SCOPE

**Status:** scope-locked S115. Authority: DD #27
`scrml-support/docs/deep-dives/m5-m6-scope-revision-2026-05-21.md` (Shape α, ratified);
v0.5 first cut landed S115 (`3c21c885` F3, `85645a93` F5/F6, `65157654` F2).

**This doc:** the v0.6 second cut of Shape α. v0.5 (retire-class + cheap bridge-lights)
is complete; v0.6 is the bridge-full + swap + delete.

## v0.6 units

| Unit | Feature | Disposition | Files | Est |
|---|---|---|---|---|
| **F1** | attrs[] native tokenizer | BRIDGE-LIGHT (native parser) | `tag-frame.{scrml,js}` + `parse-markup.{scrml,js}` | 14-20h |
| **F7** | state/SQL/CSS native sub-parsers | **BRIDGE-FULL — irreducible** | `tag-frame.{scrml,js}` + `parse-markup.{scrml,js}` + new sub-parser modules | 20-30h |
| **F8** | error-effect + meta payloads | BRIDGE-LIGHT (catalog-rename, Approach C) | `meta-checker.ts` + downstream meta walk-sites + native-parser Meta block | 5-8h |
| **M5 swap** | pipeline swap behind `--parser=scrml-native` past M5-LIGHT | re-entered M5 | `api.js` + the seam | 6-12h |
| **M6 delete** | joint retirement | deletion | BS + ast-builder + BPP + Acorn + statechild re-tokenizers + buildSpanTable + findForbiddenSwitchInRaw | 10-24h |

## Dependency + dispatch ordering

```
F1 ──┐
     ├──> F7 ──┐
F8 ──┘         ├──> M5 swap ──> M6 delete
               │
   (F8 ∥ F1, then F7 after F1)
```

- **F1 and F7 collide** — both edit `tag-frame.scrml` + `parse-markup.scrml` (the
  native-parser markup-layer core). They MUST sequence: **F1 first** (also the Cluster-A
  enabler — F1 attrs unblocks F6-shaped derivations), **F7 after F1 lands**.
- **F8 is file-disjoint from F1** (meta-checker.ts + downstream + native Meta block;
  verify at brief time it does not touch tag-frame/parse-markup) — F8 ∥ F1.
- **M5 swap** needs F1 + F7 + F8 all landed (the native parser must produce the full
  surface before the pipeline can swap onto it).
- **M6 delete** needs M5 swap landed + soak (the native parser must be the proven
  pipeline before BS/Acorn/ast-builder are deleted).

**S115 fired:** F1 (this cut's first dispatch). F8 brief authored when F1 is in flight.
F7 dispatched after F1 lands. M5/M6 are separate later cuts — NOT fired at S115.

## M5-FULL §34 reconciliation (carried)

The native-parser `E-STMT-*` / `E-EXPR-*` codes are not yet in SPEC §34 (intentional
pre-M5 gap — non-compliance item #5 from the S115 maps refresh). The **M5-swap dispatch
brief MUST include a §34 reconciliation task**.

## Tags
#m5 #m6 #compressed-md-ladder #v0.6 #scope-locked #DD-27 #S115
