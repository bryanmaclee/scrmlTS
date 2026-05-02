# P3.A Diagnosis — F-CHANNEL-003 today

**Date:** 2026-05-02
**Probe:** `compiler/tests/unit/p3a-diagnosis.test.js`
**Worked-example fixture:** P3 dive §6.2 (cross-file `<channel name="dispatch-board">`)

## What happens today (pre-P3.A)

Compiling a consumer that imports a channel from a separate `.scrml` file
yields **5 errors** with these codes:

| Code | Count | Meaning |
|---|---|---|
| `E-IMPORT-001` | 1 | `export` declaration outside `${ }` logic block |
| `E-IMPORT-004` | 1 | `"dispatch-board"` is not exported by `./channels.scrml` |
| `E-RI-002` | 1 | Server-escalated function `refreshBoard` cascade |
| `E-SCOPE-001` | 2 | downstream scope cascade |

The first error (`E-IMPORT-001`) is the architectural gap. TAB's
`liftBareDeclarations` pre-pass detects `export` + PascalCase markup and
desugars it to `${ export const Name = <markup> }`, but the same pre-pass
does NOT detect `export` + channel markup. The trailing bare `export`
keyword therefore reaches the logic-body parser as an unbound `export`
token, triggering E-IMPORT-001.

Once `E-IMPORT-001` fires, the channel is never registered as an export;
the consumer's import hits `E-IMPORT-004`; the consumer's body references
to `refreshBoard` and `@loads` (which would have been provided by the
inlined channel) cascade into RI/scope errors.

## Where the gap lives in the code

`compiler/src/ast-builder.js:651` — the P2 detection condition:

```js
if (next && next.type === "markup" && next.isComponent === true && next.name) {
```

For a channel block, `next.isComponent === false` (lowercase tag name). The
detection silently falls through.

## What P3.A does

Per P3 dive §4.1 + §4.4:

1. **TAB amendment** (`compiler/src/ast-builder.js`): extend the P2 detection
   so that `next.type === "markup" && next.name === "channel"` also triggers
   a synthesis step. Unlike the component case (which desugars to
   `${ export const Name = <markup> }`), the channel case emits BOTH:
   - a `ChannelDeclNode` AST node (the parsed `<channel>` markup body, marked
     `isExport: true`)
   - an `export-decl` AST node with `exportKind: "channel"` and
     `exportedName` = the channel's `name=` attribute value.

2. **MOD amendment** (`compiler/src/module-resolver.js`): extend
   `buildExportRegistry` to register channel exports with `category: "channel"`
   alongside the legacy `isComponent` boolean.

3. **CE phase 2 (CHX)** (`compiler/src/component-expander.ts`): under UCD,
   add a Phase 2 walk that finds markup nodes with `resolvedCategory ===
   "channel"` and `crossFile === true`, looks up the exporter's
   ChannelDeclNode, and inlines a copy of its body at the reference site,
   replacing the cross-file reference.

4. **NR amendment** (`compiler/src/name-resolver.ts`): extend
   `buildImportedRegistry` to recognize channel exports (
   `info.category === "channel"`) and produce
   `resolvedKind: "user-channel"`, `resolvedCategory: "channel"`.

5. **No CG change** (per W6 insight + P3 dive §4.5): the inlined channel
   markup is shape-identical to a per-page declaration. `emit-channel.ts`
   continues to consume `kind: "markup", tag: "channel"` nodes; no new
   runtime semantics; no change to wire-layer identity.

## Post-fix expectation

Zero errors compiling the same fixture; channel topic name `dispatch-board`
visible in `consumer.client.js`; multi-page broadcast property holds (case
3 of P3 dive §6.3).

## Tags

#p3-a #diagnosis #f-channel-003 #cross-file-channel #scrmlTS

## Links

- [P3 dive §4.1, §4.4, §6.2](file:///home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/p3-cross-file-inline-expansion-2026-05-02.md)
- [diagnosis test](../../compiler/tests/unit/p3a-diagnosis.test.js)
- [progress.md](./progress.md)
