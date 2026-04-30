# F-COMPONENT-001 — diagnosis

**Status:** BLOCKED — needs deep-dive.

**Severity:** higher than the friction file states. The "wrapped works" workaround
(`lift <div><Component/></div>`) does NOT actually expand the component — it produces
phantom `document.createElement("Component")` in the emitted client JS. The bare case
fires E-COMPONENT-020 louder; the wrapped case fails silently. Both are broken.

---

## Minimal repro

`/tmp/comp-repro/types.scrml`, `/tmp/comp-repro/components.scrml` — copies of
`examples/22-multifile/{types,components}.scrml`.

`/tmp/comp-repro/no-args.scrml`:

```scrml
<program>

${
  import { UserRole } from './types.scrml'
  import { UserBadge } from './components.scrml'
}

<div>
  ${ lift <UserBadge/> }
</div>

</program>
```

Compile: `bun compiler/src/cli.js compile /tmp/comp-repro/no-args.scrml -o /tmp/out/`

Output:

```
error [E-COMPONENT-020]: E-COMPONENT-020: Component `UserBadge` is not defined
in this file. Define it with `const UserBadge = <element .../>` before using
it, or check the spelling.
  stage: CE

FAILED — 1 error
```

Wrapping in `<li>` (mirroring `examples/22-multifile/app.scrml`) makes the
compile succeed — but inspecting the emitted `client.js` shows
`document.createElement("UserBadge")`, not an expanded `<span class="badge">…`
template.

The same phantom appears for the M2 dispatch app's `<LoadCard>` workaround in
`examples/23-trucking-dispatch/pages/dispatch/board.scrml` — the wrapped form
compiles cleanly but the JS output contains `document.createElement("LoadCard")`,
i.e. the component template never expanded.

---

## Root cause — three intersecting failures

### Fault 1 — CE early-returns for the wrapped case (silent skip)

`compiler/src/component-expander.ts:1437-1472` — `hasAnyComponentRefs` and
`hasAnyComponentRefsInLogic` decide whether CE has any work to do. If both
return false (and there are no same-file `component-def` nodes), CE early-returns
at line 1515 and the AST passes through unchanged.

```ts
function hasAnyComponentRefsInLogic(bodyNodes: unknown[]): boolean {
  for (const node of bodyNodes) {
    if (!node || typeof node !== "object") continue;
    const n = node as Record<string, unknown>;
    if (n.kind === "lift-expr" && n.expr && typeof n.expr === "object") {
      const expr = n.expr as Record<string, unknown>;
      if (expr.kind === "markup") {
        const liftMarkup = expr.node as Record<string, unknown>;
        if (liftMarkup && liftMarkup.isComponent === true) return true;  // ← only checks the lift target itself
      }
    }
    for (const key of ["body", "consequent", "alternate"]) {
      if (Array.isArray(n[key])) {
        if (hasAnyComponentRefsInLogic(n[key] as unknown[])) return true;
      }
    }
  }
  return false;
}
```

When the lift target is `<li>` and `<UserBadge/>` is a CHILD of `<li>`, this
function checks `liftMarkup.isComponent` — which is `false` for `<li>`. It does
not recurse into `liftMarkup.children`. So the function returns false, CE
early-returns, and the embedded `<UserBadge/>` reference passes through to
codegen as a phantom custom element.

### Fault 2 — exportRegistry / fileASTMap key mismatch in production

When CE does run (the bare case), it tries to resolve imported components in
`runCEFile` at lines 1499-1513:

```ts
const hasImportedComponents = exportRegistry && fileASTMap &&
  (ast.imports ?? []).some((imp: ImportDeclNode) => {
    const importExt = imp as ImportWithSpecifiers;
    const targetExports = exportRegistry.get(imp.source as string);  // ← raw import path
    if (!targetExports) return false;
    ...
  });
```

The CE code calls `exportRegistry.get(imp.source)` where `imp.source` is the
raw string from the AST (e.g. `'./components.scrml'`).

But `compiler/src/api.js:332-336` builds `fileASTMap` keyed by absolute
`tabResult.filePath`:

```js
const fileASTMap = new Map();
for (const tabResult of tabResults) {
  if (tabResult.filePath) {
    fileASTMap.set(tabResult.filePath, tabResult);
  }
}
```

And `compiler/src/module-resolver.js:303` builds the production exportRegistry
keyed by absolute `filePath`:

```js
registry.set(filePath, names);
```

So `exportRegistry.get("./components.scrml")` returns `undefined` even when the
absolute path `/tmp/comp-repro/components.scrml` is in the registry. The unit
test at `compiler/tests/unit/cross-file-components.test.js` masks this because
test code keys both maps to the same string the import declares (see test
file's own header comment, lines 21-25 — explicitly documented as a test-only
convention).

### Fault 3 — CLI doesn't gather imports

Even if Fault 2 were fixed, the CLI compile command only processes the files
the user explicitly passes. `compileScrml(options)` reads `options.inputFiles`
and never traverses imports to add dependent files. So compiling
`no-args.scrml` alone produces an exportRegistry containing only
`/tmp/comp-repro/no-args.scrml` — `components.scrml` is never read, never
TAB'd, never registered.

```
[DBG_CE] exportRegistry keys: [ "/tmp/comp-repro/no-args.scrml" ]
[DBG_CE] fileASTMap keys: [ "/tmp/comp-repro/no-args.scrml" ]
```

Even when the user passes ALL files manually:

```
$ bun compiler/src/cli.js compile /tmp/comp-repro/no-args.scrml \
    /tmp/comp-repro/components.scrml /tmp/comp-repro/types.scrml -o /tmp/out/
[DBG_CE] exportRegistry keys: [
  "/tmp/comp-repro/no-args.scrml",
  "/tmp/comp-repro/components.scrml",
  "/tmp/comp-repro/types.scrml"
]
[DBG_CE]   checking import source= "./components.scrml"  absSource= undefined
[DBG_CE]   hasImported= false   ← still false because imp.source vs absolute key mismatch
```

The lookup still misses because of Fault 2.

---

## Why the surface symptoms diverge

| Pattern | hasAnyComponentRefs | CE runs? | Outcome |
|---|---|---|---|
| Bare `${ lift <Component/> }` | true (lift target is a component) | yes | E-COMPONENT-020 (registry empty due to Fault 2/3) |
| Wrapped `${ lift <li><Component/></li> }` | false (lift target is `<li>`) | no — early return | Silent phantom `document.createElement("Component")` |
| Bare `<Component/>` in markup, no lift | true (top-level component ref) | yes | E-COMPONENT-020 |
| `<li><Component/></li>` outside `lift` | true (recurse into children works for plain markup, just not via logic) | yes | E-COMPONENT-020 |

So the F-COMPONENT-001 "wrapper makes it work" rule is exactly the set of
patterns that triggers Fault 1 (CE skip), which masks Fault 2/3 by never
attempting the lookup.

---

## Why a conservative fix won't work

Three options were considered:

**Option A — fix Fault 1 only:** make `hasAnyComponentRefsInLogic` recurse into
the lift target's markup children. CE would then run on wrapped cases. But
Fault 2/3 means the registry would still be empty, so wrapped cases would
START failing E-COMPONENT-020. This breaks the M2 workaround and breaks the
canonical `examples/22-multifile/app.scrml` example. Net regression.

**Option B — fix Fault 2 only:** change CE's lookup from `imp.source` to
`imp.absSource` (a field that doesn't exist on the AST yet). Or change the
registry key to match `imp.source`. Either change ripples into the
`exportRegistry` consumers in `module-resolver.validateImports` (which uses
`imp.absSource`) and in the type-import wiring in `api.js:407-410` (which
uses `imp.absSource` correctly). Picking one form means audit-and-fix every
consumer. Doable in isolation; not narrow.

**Option C — silence the bare case:** make CE in the lift path skip
E-COMPONENT-020 when the registry is empty AND the import statement covers
the name. This mirrors Fault 1's silent-skip behavior. Output stays phantom.
This violates the validation principle (compiler accepts it but it doesn't
work) and is exactly the gap the friction file calls out.

The narrow-fix space is constrained: A regresses good-looking code, B is
multi-stage, C is a validation-principle failure.

The real shape of the fix is end-to-end:

1. Decide whether the CLI auto-gathers imports (a la node bundlers) or
   the user explicitly lists all files. The current "hand-pass-all-files"
   shape doesn't even work because of Fault 2.
2. Decide a single key form for `exportRegistry` and `fileASTMap` and
   propagate it. `imp.absSource` looks like the right answer (it's already
   set by `module-resolver.buildImportGraph` line 131-157); it just needs to
   be carried onto the AST `import-decl` nodes that CE reads, OR CE needs
   to consume the import-graph object instead of the raw AST imports.
3. Fix `hasAnyComponentRefsInLogic` to recurse into nested markup so
   wrapped cases actually expand once 1+2 are in.
4. Add a test (or harden the existing cross-file unit tests) to verify
   the EMITTED OUTPUT contains the expanded component template, not just
   that CE doesn't throw. The existing tests assert "no isComponent: true
   markup remains" but they synthesize the maps with matched keys, so they
   never exercise Fault 2.

This is a deep-dive scope question because:

- It touches three stages (CLI, MOD, CE) and the AST contract (whether
  `import-decl` carries `absSource`).
- It requires deciding the auto-gather policy, which has spec implications
  (§21).
- The test-suite gap (synthetic maps masking the production key mismatch)
  is itself a finding that wants its own remediation.

---

## Recommended deep-dive scope

Question for the deep-dive: **how does cross-file component expansion work
end-to-end, and where does the import boundary cross stages?**

Sub-questions:

- Should the CLI auto-gather files reachable from the input(s) via imports?
  (Spec §21.5 talks about pure-type files compiling to nothing; if the
  CLI auto-gathers, do those still emit?)
- Should `exportRegistry` and `fileASTMap` be keyed by raw source string,
  absolute path, or both? (Test convention vs production convention currently
  diverge.)
- Should CE consume import metadata from the `import-decl` AST nodes, or
  from the resolved `importGraph` produced by `module-resolver`?
- What does "expand" mean for a cross-file component? Inline copy of the
  component subtree (current same-file behavior)? A shared symbol that codegen
  emits as `Component(props)` JS calls? The current pipeline assumes inline
  copy but the codegen for the unresolved phantom case produces a different
  JS shape — there is no single "expand" semantics in production.
- What's the test pattern that catches the production key mismatch? Probably
  a CLI-level integration test that compiles `examples/22-multifile/` and
  diffs the emitted JS for an actual `class="badge"` span, not just "no
  errors".

---

## Files inspected (read-only)

- `compiler/src/component-expander.ts` (lines 600-1597)
- `compiler/src/api.js` (lines 130-410, focus on Stage 3.1-3.2)
- `compiler/src/module-resolver.js` (lines 280-410)
- `compiler/src/commands/compile.js` (lines 270-320)
- `compiler/tests/unit/cross-file-components.test.js` (header + §C, §F)
- `examples/22-multifile/{app,components,types}.scrml`
- `examples/23-trucking-dispatch/pages/dispatch/board.scrml`
- `examples/23-trucking-dispatch/components/load-card.scrml`

---

## What was committed

- `docs/changes/f-component-001/progress.md`
- `docs/changes/f-component-001/diagnosis.md` (this file)
- No source-file changes. Diagnostic logging used during phase 1 was
  reverted before committing.

---

## F-COMPONENT-001-FOLLOW

Surfaced as part of this diagnosis: the wrapped-`<tr>` case the friction file
flags as needing inlined helper-fn workarounds is not a separate concern —
it's the same Fault-1 silent-skip path. Once the architectural fix lands, the
same `<tr>`-rooted component should expand correctly under `<table>`. No
separate follow-up needed.

The OTHER follow-up surfaced is **the test-suite gap**: existing cross-file
component tests synthesize key-matched exportRegistry/fileASTMap pairs, which
masks the production key mismatch. New end-to-end tests should diff the
emitted JS for actual component expansion. Mark this as F-COMPONENT-001-TEST
if the deep-dive doesn't already absorb it.

## Tags

#f-component-001 #ce #cross-file-imports #validation-principle #blocked #deep-dive-needed

## Links

- friction file: `examples/23-trucking-dispatch/FRICTION.md` (entry F-COMPONENT-001 starts at line 149)
- ce source: `compiler/src/component-expander.ts`
- api: `compiler/src/api.js`
- module resolver: `compiler/src/module-resolver.js`
- multi-file precedent: `examples/22-multifile/`
- m2 app: `examples/23-trucking-dispatch/pages/dispatch/board.scrml`
- progress: `docs/changes/f-component-001/progress.md`
