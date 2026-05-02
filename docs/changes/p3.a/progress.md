# Progress: p3.a

Append-only timestamped progress log for P3.A — channel cross-file inline-expansion via
CHX (CE phase 2 under UCD). T2-large.

## Session 1

- [start] Branch created: `changes/p3.a` from `4a36ae3`. Worktree clean.
- [start] Baseline confirmed via `bun run test`: 8512 pass / 40 skip / 0 fail / 416 files.
- [start] Pre-snapshot written: `docs/changes/p3.a/pre-snapshot.md`.
- [step 2] Diagnosis test added (initially skipped): `compiler/tests/unit/p3a-diagnosis.test.js`.
  Confirmed today's failure mode for the P3 dive §6.2 worked example:
    - `E-IMPORT-001` (TAB rejects `export` outside `${ }` block — gap is in liftBareDeclarations)
    - `E-IMPORT-004` (cascade — channel never registered as export)
    - `E-RI-002`, `E-SCOPE-001` x2 (downstream cascade)
  Diagnosis artifact: `docs/changes/p3.a/diagnosis.md`.
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
    * `buildExportRegistry` now records `category: "component" | "channel" | "type" | "function" | "const" | "other"`.
    * Gauntlet Phase 1 fix: E-IMPORT-001 suppression extended to channel exports.
    * Import name parser fix: strip quotes from `import { "kebab-name" as alias }`.
- [step 6] state-type-routing.ts NEW: category routing table per OQ-P3-2 (b).
- [step 7] CHX (CE Phase 2) implementation in component-expander.ts:
    * `buildImportedChannelAliases` builds the local-alias → {imported, sourceKey} map
      from the consumer's imports + MOD's exportRegistry (filtering by category=channel).
    * `expandChannels` walks the AST, replacing each cross-file channel reference with
      a deep-cloned copy of the source's `<channel>` markup body (fresh node IDs,
      annotated with `_p3aInlinedFrom` for diagnostics).
    * Early-exit gate extended to also short-circuit when the file has channel imports.
    * `ExportInfo.category` field added to CE's view.
    * E-CHANNEL-008: cross-file `name=` collision detection.
- [step 8] Codegen fix in `emit-channel.ts`:
    * `collectChannelNodes` filters out markup nodes with `_p3aIsExport: true` so the
      exporter file does not emit duplicate `/_scrml_ws/<name>` routes — codegen happens
      at the inlined-consumer site (PURE-CHANNEL-FILE pattern per dive §6.2 step 9).
- [step 9] Test suite written + green (28 new tests):
    * `p3a-tab-channel-export-recognition.test.js` (6) — TAB synthesis tests.
    * `p3a-mod-channel-registry.test.js` (3) — MOD registry tests.
    * `p3a-chx-same-file-passthrough.test.js` (5) — regression pin for per-page channels.
    * `p3a-chx-cross-file-inline.test.js` (5) — cross-file inline expansion.
    * `p3a-cross-file-multi-page-broadcast.test.js` (3) — integration: multi-page broadcast.
    * `p3a-pure-channel-file.test.js` (2) — integration: PURE-CHANNEL-FILE pattern.
    * `p3a-name-collision-error.test.js` (2) — E-CHANNEL-008 collision tests.
    * `p3a-diagnosis.test.js` (1, formerly skipped, now active) — F-CHANNEL-003 closure.
    * (probe diagnostic file deleted before final commit).
  Final test count: 8539 pass / 40 skip / 0 fail / 424 files. **+27 net** from baseline.
- [step 10] SPEC + PIPELINE updates:
    * SPEC §21.2 normative: Form 1 extends to `<channel>`.
    * SPEC §38.12 NEW: "Cross-File Channel Inline-Expansion" — full mechanism, 9
      sub-sections, 3 worked examples (cross-file + multi-page + import-syntax),
      PURE-CHANNEL-FILE pattern, 3 new error codes documented.
    * SPEC §15.15.6 (Shadow Mode): updated — channel routing is now NR-authoritative;
      component routing remains legacy. Routing table reference added.
    * PIPELINE.md Stage 3.2: NEW "Phase 2: Channel Expansion (CHX)" subsection with
      algorithm, routing-table contract, error codes, PURE-CHANNEL-FILE recognition,
      backcompat statement.
- [step 11] FRICTION.md update:
    * F-CHANNEL-003 marked **ARCHITECTURALLY RESOLVED** with detailed resolution
      paragraph + P3.A-FOLLOW deferral note (~180 LOC inline boilerplate elimination
      target for the dispatch app's 15 channel decl sites).

## Final state

- 8539 pass / 40 skip / 0 fail / 424 files (+27 net from baseline).
- F-CHANNEL-003 architecturally closed.
- Concession C7 (DD1 §3, §38.4.1 per-page-scope carveout) never landed in main —
  the cross-file design lands directly without the carveout.
- Worktree clean.

## Deferred items

- **P3.A-FOLLOW** (T1-small): full sweep of the dispatch app's 15 channel decl sites
  to centralized `channels/<topic>.scrml` pure-channel-files. ~180 LOC inline
  boilerplate eliminated.
- **P3-FOLLOW** (T2-medium): migration of the 75 `isComponent` references to
  NR-authoritative routing. Deletes `compiler/src/state-type-routing.ts`.
- **W5-FOLLOW**: cross-file `?{}` SQL resolution (independent track per OQ-P3-8 (b);
  P3.A's worked examples document the SQL-via-page-ancestor pattern).
