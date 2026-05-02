# Progress: p3-spec-paperwork

- [start] Branch `changes/p3-spec-paperwork` created from `9123b4d` (S53 main tip).
- [start] Inventory complete: 86 occurrences in compiler/SPEC.md.
- [start] migration-plan.md written: 20 REPLACE / 66 KEEP.
- [start] Baseline `bun test` (pre-commit hook scope: unit + integration + conformance, no browser): 7826 pass / 30 skip / 0 fail / 7856 tests / 397 files.
- [classification] Conservative skip list documented: ~66 occurrences are normative concept text, deprecation policy, error-message templates, grammar rules, and section headings.
- [batch-1] §51.3.x worked examples — 10 replacements done. `bun test` post-batch: 7826 / 30 / 0 (zero regressions). Replacements at lines 18364, 18465, 18492, 18541, 18656, 18663, 18770, 18789, 18798, 18805.
- [batch-2] §51.9 derived/projection examples — 3 replacements done. `bun test` post-batch: 7826 / 30 / 0 (zero regressions). Replacements:
  1. line 19085 (`< engine name=UI for=UIMode derived=@order>`)
  2. line 19172 (`< engine name=FetchMachine for=FetchState>`)
  3. line 19180 (`< engine name=UI for=UIFlag derived=@state>`)
- [next] Batch 3 — §51.11/§51.12/§51.14 (audit, temporal, replay) — 3 replacements.
