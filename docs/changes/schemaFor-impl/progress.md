# schemaFor impl — progress

Worktree: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ad399e595c0ed8bbb`
Branch: `worktree-agent-ad399e595c0ed8bbb`
Base SHA: `5f4ada4`

## Step 1 — Survey (in progress)

### Pipeline finding (load-bearing for hook-point choice)

The `<schema>` body is **NOT** parsed as a separate pipeline stage today. `schema-differ.js`'s `parseSchemaBlock` is invoked ONLY by `scrml migrate` (subcommand, not the compile pipeline). At compile time the `<schema>` AST node is constructed as:

```
{ kind: "state", stateType: "schema", attrs: [], children: [<text/logic blocks>] }
```

Verified via AST trace (synthetic reproducer with `<schema>${ schemaFor(User) }</>`):
- `<schema>` children = `[ text("\n    "), logic{body:[bare-expr{exprNode:{kind:"call",callee:{name:"schemaFor"},args:[ident("User")]}}]}, text("\n") ]`
- Schema bodies pass through compilation without semantic interpretation; codegen ignores them.
- The downstream `scrml migrate` tool re-reads the source file as raw text and applies regex-based `parseSchemaBlock` on the verbatim source body.

### Hook point decision

Mirror **parseVariant**'s walker shape (CallExpression form) — NOT formFor's (markup-element form). schemaFor's surface is `${ schemaFor(T) }` interpolated as a `bare-expr` inside a `logic` block child of a `<schema>` state node.

Two-pass shape:
1. **Walker** (type-system stage, mirroring `walkAndValidateParseVariantCalls`): finds `call` ExprNodes where `callee.name` is a local bound to imported `schemaFor`; validates type-arg + options + call context + per-field SQL-mappability; annotates the call-node.
2. **AST rewrite** (type-system stage, after validation): walks `<schema>` state nodes, finds child `logic` blocks containing a `bare-expr` with a validated schemaFor `call`, and replaces those `logic` children with `text` nodes carrying the synthesized shared-core table-declaration body. After rewrite, `<schema>` is a flat text body — the downstream `scrml migrate` regex parser ingests it identically to hand-authored content.

This matches SCOPE §3.1's source-level-expansion hypothesis. SPEC §41.15.9 step 6 ("Annotates the AST node with the resolved struct shape + transform metadata") is satisfied by the validator pass; the codegen-side rewrite produces the equivalent table-declaration fragment.

### Call-context validation strategy

The brief flagged §41.15.8 `E-SCHEMAFOR-INVALID-CALL-CONTEXT` as walking-parent-context-aware. Since the walker is invoked per-child of `<schema>` state nodes (NOT a generic ExprNode walker), the context is implicit: when the walker finds a schemaFor call inside a schema child, it's valid; when found by a fallback ExprNode walker covering everywhere else, it's invalid (and emits the error). The implementation:

- **Pass A:** walk `<schema>` state nodes' `children` arrays; for each child `logic` block, find the schemaFor call (if any), validate, annotate, and rewrite the child with a synthesized text node.
- **Pass B:** walk every OTHER ExprNode in the file (top-level logic, function bodies, page bodies, etc.) looking for schemaFor calls; any such call is `E-SCHEMAFOR-INVALID-CALL-CONTEXT`.

### Helper extraction decision

Verified `walkStructFields` / `validateTypeArgument` are NOT extracted at formFor (S102) — formFor inlines its own validation + walk. Per SCOPE §3.2 + §3.3, schemaFor likewise inlines.

### Validator-clause parsing reuse

`parseValidatorClauses` + `parseStructFieldRawClauses` infrastructure in `emit-form-for.ts` is reusable directly:
- `parseValidatorClauses(raw)` parses `req length(>=2) pattern(...)` per-field into `{name, argsRaw}` validators.
- The struct-field-raw-clauses map is built per-file at type-system.ts:4024+ to recover the validator tail from the raw struct body.

schemaFor can reuse the same `_structFieldRawClauses` map built at type-system.ts:4024 (or build its own — TBD by code-locality).

Next: write stdlib stub, then type-system + codegen.
