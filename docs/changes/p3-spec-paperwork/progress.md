# Progress: p3-spec-paperwork

- [start] Branch `changes/p3-spec-paperwork` created from `9123b4d` (S53 main tip).
- [start] Inventory complete: 86 occurrences in compiler/SPEC.md.
- [start] migration-plan.md written: 20 REPLACE / 66 KEEP.
- [start] Baseline `bun test` (pre-commit hook scope: unit + integration + conformance, no browser): 7826 pass / 30 skip / 0 fail / 7856 tests / 397 files.
- [classification] Conservative skip list documented: ~66 occurrences are normative concept text, deprecation policy, error-message templates, grammar rules, and section headings.
- [batch-1] §51.3.x worked examples — 10 replacements done. `bun test` post-batch: 7826 / 30 / 0 (zero regressions). Replacements:
  1. line 18364 (E-MACHINE-001 hint text — bind @status to a < engine>)
  2. line 18465 (`< engine name=MarioMachine for=MarioState>`)
  3. line 18492 (`< engine name=CannonMachine for=CannonState>`)
  4. line 18541 (`< engine name=DateRange for=Booking>`)
  5. line 18656 (`< engine name=UserFlow for=Column>`)
  6. line 18663 (`< engine name=AdminFlow for=Column>`)
  7. line 18770 (E-MACHINE-001 hint text — create a < engine name=AdminUnlock>)
  8. line 18789 (`< engine name=DeveloperFlow for=TaskStatus>`)
  9. line 18798 (`< engine name=QAFlow for=TaskStatus>`)
  10. line 18805 (`< engine name=PMFlow for=TaskStatus>`)
- [next] Commit batch 1, then batch 2 (§51.9 derived/projection examples — 3 replacements).
