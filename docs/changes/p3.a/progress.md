# Progress: p3.a

Append-only timestamped progress log for P3.A — channel cross-file inline-expansion via
CHX (CE phase 2 under UCD). T2-large.

## Session 1

- [start] Branch created: `changes/p3.a` from `4a36ae3`. Worktree clean.
- [start] Baseline confirmed via `bun run test`: 8512 pass / 40 skip / 0 fail / 416 files.
- [start] Pre-snapshot written: `docs/changes/p3.a/pre-snapshot.md`.
- [step 2] Diagnosis test added (skipped until fix lands): `compiler/tests/unit/p3a-diagnosis.test.js`.
  Confirmed today's failure mode for the P3 dive §6.2 worked example:
    - `E-IMPORT-001` (TAB rejects `export` outside `${ }` block — gap is in liftBareDeclarations)
    - `E-IMPORT-004` (cascade — channel never registered as export)
    - `E-RI-002`, `E-SCOPE-001` x2 (downstream cascade)
  Diagnosis artifact: `docs/changes/p3.a/diagnosis.md`.
- [step 3] Type system additions: `ChannelDeclNode` interface + `FileAST.channelDecls` field
  + `ExportDeclNode.exportKind` doc updated to mention `"channel"`. `.gitignore` updated to
  exclude `.tmp/` (per-dispatch scratchpad). Type-only changes; tests still 8512p/41s/0f
  (the 41st skip is the diagnosis pin).
