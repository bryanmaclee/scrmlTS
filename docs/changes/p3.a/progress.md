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
- [step 4] TAB amendment in `compiler/src/ast-builder.js`:
    * New helper `extractChannelNameFromOpener(rawOpener)` — extracts the value of
      `name="..."` (or `name='...'`) from a `<channel>` opener (string-literal only).
    * `liftBareDeclarations` extended to detect the `export <channel name="X" attrs>{body}</>`
      pattern (text-ending-in-export + markup block where `next.name === "channel"`). On
      match: emits the pre-export prefix, a synthetic logic block tagged
      `_p3aChannelExport: <channelName>`, and the channel markup block tagged
      `_p3aIsExport: true`.
    * `buildBlock` for type="logic" post-processing: when the BS block carries
      `_p3aChannelExport`, the synthesized export-decl is rewritten to
      `{exportKind: "channel", exportedName: <channelName>}` and the synthesized
      const-decl is dropped from `body`.
    * `collectHoisted` populates `channelDecls` by walking ast.nodes for any markup
      with `tag === "channel"` (top-level + inside markup ancestors).
    * `buildAST` returns now include `ast.channelDecls`.
    * Self-host parity test (`compiler/tests/self-host/ast.test.js`) extended with
      `channelDecls` filter (analogous to `machineDecls`).
    * E-CHANNEL-EXPORT-001 (NEW): channel exports without a string-literal `name=`
      attribute fail with this error code (reactive-ref forms unsupported for
      cross-file export — wire-layer identity must be compile-time stable).
  Tests: 8512p/41s/0f (unchanged).
