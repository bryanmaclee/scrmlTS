# Progress: uvb-w1

- [start] Worktree verified at agent-a0e3e3da6eb661992; rebased onto main 70eb995; W0a stdlib + pathFor present.
- [start] `bun install` + `bash scripts/compile-test-samples.sh` to bring worktree to runnable state.
- [start] Pre-snapshot baseline captured: 8,221 pass / 40 skip / 0 fail / 387 files (after re-run; 2 initial fails were flaky network/ECONNREFUSED).
- [start] Pre-snapshot committed.

## Design notes

### Code/error namespace
- W-ATTR-001 (new): unrecognized attribute name on a registered scrml-special element — VP-1 warning.
- W-ATTR-002 (new): unrecognized value-shape on `auth=` (e.g. `role:X`) — VP-1 warning.
- E-COMPONENT-035 (new): post-CE invariant — residual `isComponent: true` markup node — VP-2 error. (E-COMPONENT-022 already taken for slot=, highest existing is 034; 035 is the next free.)
- E-CHANNEL-007 (new): attribute interpolation in non-interpolating attribute — VP-3 error. (E-CHANNEL-001..006 are taken; 007 is the next free.)

### Architecture
- New file: `compiler/src/attribute-registry.js` — per-element attribute schema for scrml-special elements (`<page>`, `<channel>`, `<machine>`, `<route>`, `<lin>`, `<for>`, `<if>`, `<else-if>`, `<else>`, `<server>`, `<dialog>`, `<schema>`, `<errorBoundary>`, `<program>`).  Reuses the existing `<program>` knowledge from `compiler/src/html-elements.js`. Also flags per-attribute `supportsInterpolation` for VP-3.
- New file: `compiler/src/validators/attribute-allowlist.ts` — VP-1 pass walking AST, emitting `W-ATTR-001/002`.
- New file: `compiler/src/validators/post-ce-invariant.ts` — VP-2 pass walking AST, emitting `E-COMPONENT-035` on residual `isComponent: true`.
- New file: `compiler/src/validators/attribute-interpolation.ts` — VP-3 pass walking AST, emitting `E-CHANNEL-007` (and possibly other future codes) on `${...}` in non-interpolating attribute values (currently `string-literal` value with `${` substring).

### Pipeline wiring (compiler/src/api.js)
- VP-2 (post-CE): runs immediately after `runCE` per file. Loud fail-fast on phantom components.
- VP-1 (post-RI/TS): runs after TS stage on each file's AST; warning level. Placement chosen so it sees the post-resolution AST — components have been expanded, types resolved.
- VP-3 (post-CE): runs alongside VP-2 (the same place). Errors surface before downstream stages waste cycles.

### AttrValue interpolation detection
A `name="driver-${driverId}"` attribute reaches CE/post-CE as `kind: "string-literal"` with `value: "driver-${driverId}"`. The literal contains `${` — that's the detection signal for VP-3.

### Auth value-shape semantics
`auth="role:X"` arrives as `kind: "string-literal", value: "role:X"`. Recognized values per §52: `required`, `optional`, `none` (and absent). Anything starting with `role:` is unrecognized → W-ATTR-002.

### Cascade test failures expected
- `examples/22-multifile/` corpus tests — current passes (silently emit phantom). After VP-2 they fail with E-COMPONENT-035. EXPECTED. Per dispatch: update the expected outcome to accept the error, OR skip with W2 deep-dive reference.
- Any auth-attribute fixture exercising `role:X` will gain a warning. Fixture warning counts may change.

- [next] Implement attribute-registry.js
