# Progress: p3-spec-paperwork

- [start] Branch `changes/p3-spec-paperwork` created from `9123b4d` (S53 main tip).
- [start] Inventory complete: 86 occurrences in compiler/SPEC.md.
- [start] migration-plan.md written: 20 REPLACE / 66 KEEP.
- [start] Baseline `bun test` (pre-commit hook scope: unit + integration + conformance, no browser): 7826 pass / 30 skip / 0 fail / 7856 tests / 397 files.
- [classification] Conservative skip list documented: ~66 occurrences are normative concept text, deprecation policy, error-message templates, grammar rules, and section headings.
- [batch-1] §51.3.x worked examples — 10 replacements. `bun test`: 7826 / 30 / 0 (zero regressions). Lines 18364, 18465, 18492, 18541, 18656, 18663, 18770, 18789, 18798, 18805.
- [batch-2] §51.9 derived/projection examples — 3 replacements. `bun test`: 7826 / 30 / 0. Lines 19085, 19172, 19180.
- [batch-3] §51.11 audit / §51.12 temporal / §51.14 replay worked examples — 3 replacements. `bun test`: 7826 / 30 / 0 (zero regressions). Replacements:
  1. line 19264 (`< engine name=OrderFlow for=OrderStatus>` — §51.11.2 audit clause example)
  2. line 19456 (`< engine name=FetchMachine for=Fetch>` — §51.12.2 temporal example)
  3. line 19734 (`< engine name=OrderFlow for=S>` — §51.14.2 replay example)
- [next] Batch 4 — §51.15 state-local case examples — 2 replacements.
