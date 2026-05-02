# Progress: p3.a

Append-only timestamped progress log for P3.A — channel cross-file inline-expansion via
CHX (CE phase 2 under UCD). T2-large.

## Session 1

- [start] Branch created: `changes/p3.a` from `4a36ae3`. Worktree clean.
- [start] Baseline confirmed via `bun run test`: 8512 pass / 40 skip / 0 fail / 416 files.
- [start] Pre-snapshot written: `docs/changes/p3.a/pre-snapshot.md`.
- [step 2] Diagnosis test added (skipped until fix lands): `compiler/tests/unit/p3a-diagnosis.test.js`.
  Confirmed today's failure mode for the P3 dive §6.2 worked example:
    - `E-IMPORT-001` (TAB rejects `export` outside `${ }` block)
    - `E-IMPORT-004` (cascade — channel never registered as export)
    - `E-RI-002`, `E-SCOPE-001` x2 (downstream cascade)
- [step 3] Type system additions: `ChannelDeclNode` interface + `FileAST.channelDecls` field
  + `ExportDeclNode.exportKind` doc updated to mention `"channel"`.
- [step 4] TAB amendment in `compiler/src/ast-builder.js`:
    * `extractChannelNameFromOpener(rawOpener)` helper.
    * `liftBareDeclarations` extended to detect `export <channel name="X" attrs>{body}</>` →
      synthesize paired ExportDeclNode + tagged ChannelMarkup.
    * `buildBlock` post-processing rewrites the synthesized export-decl to
      {exportKind: "channel", exportedName: <name>}.
    * `collectHoisted` populates `channelDecls`.
    * `_p3aIsExport` / `_p3aExportName` markers propagated from BS block to AST markup node.
    * E-CHANNEL-EXPORT-001 NEW (channel exports without string-literal name=).
    * Self-host parity test extended with `channelDecls` filter.
- [step 5] MOD amendment in `compiler/src/module-resolver.js`:
    * `buildExportRegistry` now records `category: "component" | "channel" | "type" | "function" | "const" | "other"`
      alongside the legacy `isComponent` boolean for backcompat.
- [step 5b] Gauntlet Phase 1 fix (`compiler/src/gauntlet-phase1-checks.js`):
    * E-IMPORT-001 suppression extended to also handle the `export <channel ...>` pattern
      (next markup block with `name === "channel"`), parallel to the existing P2 component
      suppression (next markup with `isComponent === true`).
- [step 5c] Import name parser fix (`compiler/src/ast-builder.js`):
    * `import { "dispatch-board" as dispatchBoard } from './channels.scrml'` now correctly
      strips the quotes from the imported name. Channel exports use kebab-case names that
      aren't valid JS identifiers, so the import syntax allows quoting; the stored name is
      the unquoted form that matches the channel's `name=` attribute and the MOD registry key.
  Tests: 8514p/41s/0f (the 2 extra passes are probe diagnostics; will be removed at the end).
  Compile probe shows E-IMPORT-001 and E-IMPORT-004 are now resolved; remaining errors are
  the expected cascade from the un-inlined channel body (E-RI-002, E-SCOPE-001), which CHX
  will fix.
