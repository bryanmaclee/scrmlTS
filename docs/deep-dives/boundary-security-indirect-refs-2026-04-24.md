# Deep Dive: Server/Client Boundary Security for Indirect References

**Date:** 2026-04-24
**Scope confirmed:** yes
**Feeds into:** debate + spec authoring + implementation decision

---

## Scope

**Question:** How should scrml enforce the server/client security boundary for indirect references -- callbacks, closures, higher-order functions, and reactive variable capture -- given that the current taint-propagation model only handles direct anchors and bugs I/J/NC-4 demonstrate real leakage through indirection?

**In scope:**
- Name-mangling bleed through closure capture (Bug I)
- Reactive dependency extraction missing function-body traversal (Bug J)
- `_ensureBoundary` warning shim defaulting to client (NC-4)
- Callbacks passed as props crossing the server boundary (SPEC gap between section 12 and section 15.11)
- Closures capturing variables later classified as server-side
- Higher-order functions where boundary depends on which function is passed
- Auth-middleware CSRF mint-on-403 as a concrete example of boundary enforcement weakness

**Out of scope:**
- Bug H (function-rettype match drops return) -- a codegen bug, not a boundary bug
- Bug K (sync-effect throw halts caller) -- a reactive scheduling bug, not a boundary bug
- The CPS transformation mechanism itself (already approved and implemented)
- General compiler architecture changes unrelated to boundary enforcement
- The `protect=` field system (working correctly for direct access)

---

## Context

### Current Boundary Model

scrml's server/client split relies on **taint-propagation from three explicit anchors** (SPEC section 12.2, `compiler/SPEC.md` line 5482):

1. **Trigger 1:** Resource access not available on client (SQL `?{}`, `Bun.file()`, `Bun.env`, `fs.*`, `process.env`, `session`)
2. **Trigger 2:** Protected field access (`protect=` on enclosing state block)
3. **Trigger 3:** Developer configuration (module/function never client-side)
4. **Trigger 4:** Explicit `server` annotation (section 11.4)

The route inferrer (`compiler/src/route-inference.ts`) performs a **direct-only escalation** strategy. Step 4 of the `inferRoutes` function (line 1117) explicitly states:

```
// Step 4: Direct-only escalation -- no transitive callee inheritance.
// A function is server-escalated only by its own direct triggers:
//   - explicit `server` annotation
//   - ?{} SQL block in the function body
//   - access to protect= fields
//   - access to session object
//   - access to server-only resources (Bun.file, Bun.env, fs.*, etc.)
// Calling a server function is NOT a trigger. The caller stays client-side
// and uses a fetch stub at codegen time (section 12 escalation rules, RI spec header).
```

This is a deliberate design choice: transitive escalation was considered and rejected in favor of CPS transformation (approved decision in `project_approved_decisions.md`). A client function that calls a server function stays client-side and invokes the server function via a generated fetch stub.

### What Works

- Direct `server` function calls: properly escalated, fetch stubs generated
- Direct `protect` field access: detected by `bareExprAccessesField` regex (line 556)
- Direct `?{}` SQL blocks: detected by pattern match on `\?\{` (line 208)
- CPS splits: when a function has both server triggers and reactive assignments, the compiler splits it at the boundary

### What Fails

Four categories of failure are demonstrated by real bugs:

**1. Name-mangling bleed (Bug I):**
The post-process in `emit-client.ts` (line 564) builds `fnNameMap` mapping original function names to mangled names (`_scrml_<name>_N`), then performs a global regex replace. The regex uses `(?<!\.)` negative lookbehind to avoid rewriting `obj.method()` calls (Bug D fix), but it still fires on **record literal values** where a property name matches a user function name:

```scrml
// Bug I reproducer (handOffs/incoming/2026-04-22-0940-bugI-name-mangling-bleed.scrml)
function lines() { return [""] }
@items = [{ id: 0, lines: ["x", "y"], other: "a" }]
function copyAll() {
    return @items.map((n, i) => {
        return {
            id: n.id,
            lines: n.lines,     // <-- becomes n._scrml_lines_N
            other: n.other
        }
    })
}
```

The regex `(?<!\.)\\blines\\b(?=\\s*[(;,}\\]\\n)]|$)` matches `n.lines` at the `,` following it. The lookbehind only checks for `.` immediately before `lines`, but here `n.` is the prefix -- the `.` is before `lines`, so the lookbehind should catch it. The actual bug may be that the regex matches `lines` in the key position (`lines: n.lines`) where the first `lines` (the key) is NOT preceded by `.`. The replace is global and replaces ALL occurrences, including the key.

This is a **security issue** because server-side variable names leak into client output, exposing type information through the mangled name format (`_scrml_<name>_N`).

**2. Reactive deps miss function-body indirection (Bug J):**
`extractReactiveDeps` in `reactive-deps.ts` (line 39) scans the **expression string** for `@var` patterns. It does not recurse into function bodies. When a helper function wraps a reactive read:

```scrml
// Bug J reproducer (handOffs/incoming/2026-04-22-0940-bugJ-markup-interp-helper-fn-hides-reactive.scrml)
function getMsg()   { return @msg }
function upperOf(s) { return s.toUpperCase() }
function record()   { return { text: @msg, len: @msg.length } }

// In markup:
<p>${upperOf(getMsg())} -- doesn't update: @msg read is behind getMsg()</p>
<p>${record().text} -- doesn't update: @msg read is behind record()</p>
<p>${upperOf(@msg)} -- updates: @msg is a literal ref in the interpolation</p>
```

The markup interpolation `${upperOf(getMsg())}` contains no `@` at the interpolation site. `extractReactiveDeps` returns empty set. `emit-event-wiring` sees `varRefs.length === 0` and skips the entire wiring block. The element renders once and never updates.

This is not directly a security boundary issue but reveals the same architectural limitation: **the compiler does not trace through function calls to find what they touch**. The same limitation means a callback passed as a prop that internally reads `@serverData` would not be detected as reactive, and if that callback also touches a protected field through a closure, the boundary check would miss it.

**3. `_ensureBoundary` is a warning shim (NC-4):**
In `emit-logic.ts` (line 318):

```typescript
function _ensureBoundary(opts: EmitLogicOpts, context: string): EmitLogicOpts {
  if (!opts.boundary) {
    if (!_boundaryWarnedFor.has(context)) {
      _boundaryWarnedFor.add(context);
      console.warn(`[emit-logic] ${context}: EmitLogicOpts.boundary missing -- defaulting to "client".`);
    }
    return { ...opts, boundary: "client" };
  }
  return opts;
}
```

When boundary information is missing, the function **defaults to client** with a console warning. This is a fail-open design. Any code path that fails to propagate boundary information will silently emit code as client-side, potentially exposing server-only logic.

**4. SPEC gap: section 12 x section 15.11 interaction:**
SPEC section 15.11.6 interaction notes (line 6995) states:

> If the function passed as a function-typed prop is a server-escalated function, the call inside the component body crosses the server boundary. Route Inference SHALL detect this and emit the appropriate infrastructure. The component body does not declare server intent; the compiler resolves it from the passed reference.

But the current route inferrer does NOT trace function references through prop passing. `walkBodyForTriggers` (line 516) extracts callees via `extractCalleesFromNode`, which matches `DIRECT_CALL_REGEX = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g` -- direct call patterns only. A function reference passed as `onSubmit=serverFn` to a component is not a call at the parent's scope; it's a reference. The component body calls it, but the component body is analyzed independently. The component body calls `onSubmit()` which is a parameter name, not a resolvable function in the global index.

---

## Approaches

### Approach A: Type-System Boundary Tags (Rust Send/Sync Model)

**How it works:** Introduce a compile-time type tag (analogous to Rust's `Send` trait) that propagates through the type system. Every variable, closure, and function reference carries a `boundary: "client" | "server" | "pure"` annotation. The tag is inferred transitively: a closure that captures a server-tagged variable becomes server-tagged. A function that accepts a callback parameter gets its boundary parameterized by the callback's tag. The compiler rejects cross-boundary violations at the type level.

**scrml example:**

```scrml
<program>
${
    // server-tagged by inference (touches ?{})
    server function getUser(id) {
        return ?{`SELECT * FROM users WHERE id = ${id}`}.get()
    }

    // pure-tagged: no server or client deps
    function formatName(user) { return user.first + " " + user.last }

    // client-tagged by inference: reads @reactive
    function displayUser() {
        let user = getUser(@userId)  // fetch stub generated
        @userName = formatName(user) // reactive write stays client-side
    }

    // COMPILE ERROR: callback captures server-tagged closure variable
    // The closure over `db` makes this server-tagged, but it's passed
    // as a client-side prop
    let db = ?{`SELECT count(*) FROM logs`}
    function logCount() { return db }  // server-tagged by capture
    // <MyComponent onLoad=logCount>   // E-BOUNDARY-001: server fn passed as client prop
}
</program>
```

**Gains:**
- Complete static enforcement -- no runtime boundary violations possible
- Closures, callbacks, and higher-order functions all handled by the type system
- Catches the Bug J class of problems: if `getMsg()` returns a server-tagged value, the caller is forced to handle the boundary
- Self-documenting: developers can see boundary tags in error messages

**Loses:**
- Significant compiler complexity: requires a full type inference pass that tracks boundary tags alongside value types
- May require developer-visible annotations in ambiguous cases (Rust needs explicit `Send` bounds on generic functions)
- Potential for "tag explosion" where every function signature needs boundary parameters
- No existing scrml type infrastructure for this -- the type system is a lookup table, not an inference engine

**Complexity:** Very high compiler complexity. Moderate spec complexity. Low developer complexity (mostly invisible when things work; clear errors when they don't).

**Prior art:**
- **Rust (Send/Sync):** Auto-derived marker traits. Closures inherit Send/Sync from captured data. Compile-time enforcement. Result: works extremely well, but requires a sophisticated ownership + borrow checker that scrml does not have.
- **Swift (Sendable):** Protocol conformance checked at compile time. `@Sendable` annotation on closures. Swift 6 makes this strict. Result: significant adoption friction (SE-0302 proposal), but catches real bugs.
- **Haskell (IO monad):** Type-level separation of pure and effectful code. No data constructors exported from IO monad -- one-way boundary. Result: gold standard for purity enforcement, but requires monadic programming style that scrml explicitly rejects (section 13: "The developer SHALL NOT write `async`, `await`, `Promise`").

---

### Approach B: Serialization Boundary with Compiler-Checked Crossing Points (Qwik $ Model)

**How it works:** Introduce explicit boundary-crossing points that the compiler recognizes and enforces. Any value that crosses the server/client boundary must be serializable. Closures that capture non-serializable state are compile errors at the crossing point. The compiler transforms boundary-crossing functions into QRL-like references with serialized captured state.

Unlike Approach A (which tags every value), this approach only checks at **crossing points** -- the places where data actually moves between server and client. The compiler identifies these points automatically (fetch stub calls, prop passing to components, event handler wiring) and enforces serialization constraints there.

**scrml example:**

```scrml
<program>
${
    server function saveItem(name, price) {
        ?{`INSERT INTO items (name, price) VALUES (${name}, ${price})`}.run()
    }

    @items = []

    // OK: saveItem is a server function. When passed as a prop,
    // the compiler emits a fetch-stub reference, not the function body.
    // The captured closure is empty (all args are explicit params).

    // COMPILE ERROR: closure captures @items (reactive, not serializable
    // across boundary) and is passed to a server-side context
    function addAndRefresh(name, price) {
        saveItem(name, price)   // OK: fetch stub call
        @items = [...@items, { name, price }]  // OK: reactive write on client
    }

    // This works because addAndRefresh stays client-side (no direct triggers)
    // and calls saveItem via fetch stub
}

<div>
    <button onclick=addAndRefresh("widget", 9.99)>Add</>
    // OK: addAndRefresh is client-side, onclick is client-side
</>
</program>
```

**For Bug J specifically**, the fix is orthogonal: the reactive-deps extractor needs to trace through function calls to find transitive `@var` reads. This is a separate pass (call-graph reactive analysis) that does not require boundary tags:

```scrml
<program>
${
    @msg = "hello"
    function getMsg() { return @msg }
    function upperOf(s) { return s.toUpperCase() }
}
<div>
    // Compiler builds call graph: upperOf(getMsg()) -> getMsg() -> reads @msg
    // Therefore this interpolation depends on @msg and gets wired
    <p>${upperOf(getMsg())}</>
</div>
</program>
```

**Gains:**
- Focused enforcement at actual boundary crossings, not on every value
- Aligns with existing fetch-stub architecture (the crossing point already exists)
- Lower compiler complexity than full type-tag inference
- Handles the prop-passing case: when `onSubmit=serverFn` is passed, the compiler checks at the prop-passing site
- Bug I fix is straightforward: scope the name-mangling to actual function call sites, not all identifier occurrences

**Loses:**
- Does not catch "latent" boundary violations where a closure captures server state but is never passed across a boundary (Approach A would catch this at definition time)
- Requires identifying ALL crossing points -- missing one is a security hole
- Serialization checking is a separate concern from boundary enforcement -- conflating them may miss cases where data is non-serializable but also non-sensitive

**Complexity:** Moderate compiler complexity (crossing-point identification + serialization check). Low spec complexity (rules are local to crossing points). Low developer complexity.

**Prior art:**
- **Qwik ($):** The `$` suffix marks serialization boundaries. Only `const` values that are serializable can be captured across `$` boundaries. Compiler optimizer enforces at build time. Result: works well for performance (lazy loading), but has learning curve ("why can't I capture `let`?").
- **React ("use server" / "use client"):** File-level directives mark boundary. Arguments and return values must be serializable. Closures in server actions capture variables that are serialized to the client and back. Result: known security concerns (serialization flaw CVE in React 19 server components); the boundary enforcement is partial.
- **Elm (ports):** All data crossing the Elm/JS boundary must be JSON-serializable. The runtime converts JavaScript values to JSON then decodes into Elm values. Result: extremely safe but limits expressiveness.

---

### Approach C: Interprocedural Taint Analysis (Extended Current Model)

**How it works:** Keep the current direct-anchor taint model but extend it with interprocedural analysis. Build a call graph during route inference. For each function, compute a transitive closure of what it touches through callees. If function A calls function B which reads a `protect=` field, then A is transitively tainted. Apply the same analysis to reactive deps: if markup calls `upperOf(getMsg())` and `getMsg()` reads `@msg`, then the markup depends on `@msg`.

This is the minimum extension to the existing architecture that fixes the known bugs without introducing new concepts.

**scrml example:**

```scrml
<program>
${
    // Step 1: Route inference builds call graph
    //   getUser -> [?{} SQL] -> server-tagged
    //   displayUser -> [getUser] -> calls server fn, stays client (fetch stub)
    //   helperFormat -> [] -> pure

    server function getUser(id) {
        return ?{`SELECT * FROM users WHERE id = ${id}`}.get()
    }
    function helperFormat(user) { return user.name.toUpperCase() }
    function displayUser() {
        let user = getUser(@userId)     // fetch stub
        @display = helperFormat(user)   // client-side
    }

    // Step 2: Reactive deps builds call graph for markup
    //   getMsg() -> reads @msg
    //   upperOf(getMsg()) -> transitively reads @msg
    //   => markup ${upperOf(getMsg())} depends on @msg

    @msg = "hello"
    function getMsg() { return @msg }
    function upperOf(s) { return s.toUpperCase() }
}
<div>
    <p>${upperOf(getMsg())}</p>
    // Compiler traces: upperOf -> getMsg -> @msg
    // Wires effect for @msg dependency
</div>
</program>
```

**For Bug I** (name-mangling), the fix is independent: restrict the post-process regex to only match identifiers in **call position** (followed by `(`), not in arbitrary expression positions.

**For NC-4** (`_ensureBoundary`), the fix is independent: change the warning to a hard error, or ensure all callers propagate boundary information.

**Gains:**
- Smallest delta from current architecture
- Fixes Bug J directly (transitive reactive deps)
- Fixes the section 12 x section 15.11 gap (if the call graph tracks prop-passed function references)
- No new concepts for developers to learn
- No changes to the spec's public API

**Loses:**
- Call graph construction adds O(n*m) complexity where n=functions, m=average callees
- Does not handle truly dynamic dispatch (computed function references, `fn[key]()`)
- Closures that capture variables but are never called still escape analysis
- May interact badly with the existing `function-decl` skip in `walkBodyForTriggers` (line 644: "For nested function-decl: do NOT recurse into their bodies here")

**Complexity:** Moderate compiler complexity (call graph construction). Low spec complexity (no new concepts). Zero developer complexity (invisible).

**Prior art:**
- **Java (interprocedural analysis in security tools like FindBugs/SpotBugs):** Taint tracking through call graphs. Result: effective for known patterns, high false-positive rate for dynamic dispatch.
- **Flow (Facebook's JS type checker):** Interprocedural type inference with call-graph-based analysis. Result: worked for large codebases but was abandoned in favor of TypeScript due to complexity.
- **GCC/Clang (taint analysis for security):** Compiler-level taint tracking through function calls. Result: effective but limited to direct calls; function pointers require manual annotation.

---

## Trade-off Matrix

| Dimension | Approach A: Type Tags | Approach B: Crossing Points | Approach C: Extended Taint |
|-----------|----------------------|---------------------------|---------------------------|
| Developer ergonomics | Low friction when working, clear errors on violation | Low friction, errors only at crossing points | Zero friction (invisible) |
| Compiler complexity | Very high (new type inference pass) | Moderate (crossing point identification + serialization check) | Moderate (call graph + transitive closure) |
| Spec clarity | High (explicit rules for every type) | Moderate (rules at crossing points only) | Low (implicit, behavior-defined) |
| Runtime cost | Zero (all compile-time) | Zero (all compile-time) | Zero (all compile-time) |
| Consistency with existing scrml patterns | Low (new concept: boundary tags) | Moderate (extends fetch-stub pattern) | High (extends existing taint model) |
| Prior art confidence | High (Rust/Swift proven) | High (Qwik/React proven) | Moderate (tooling-level, not language-level) |
| Coverage completeness | Complete (every value tagged) | Partial (only at crossing points) | Partial (only through static call graph) |
| Handles dynamic dispatch | No (needs annotation) | No (needs annotation) | No (E-ROUTE-001 warning already exists) |
| Bug I fix | Included (tag prevents mangling leak) | Separate fix needed | Separate fix needed |
| Bug J fix | Included (tag propagates through calls) | Separate fix (call-graph reactive deps) | Included (call-graph reactive deps) |
| NC-4 fix | Included (boundary always known from type) | Separate fix needed | Separate fix needed |

---

## Prior Art Table

| Language/Framework | Problem they solved | Their approach | Result |
|-------------------|-------------------|----------------|--------|
| Rust (Send/Sync) | Thread safety for closures and shared data | Auto-derived marker traits checked at compile time. Closures inherit Send/Sync from captured data. | Works extremely well. Gold standard for compile-time boundary enforcement. Requires ownership system scrml doesn't have. |
| Swift (Sendable) | Concurrency safety for actors and tasks | Protocol conformance + `@Sendable` closure annotation. Compiler checks at task/actor boundaries. Swift 6 makes strict. | Significant adoption friction (SE-0302), but catches real bugs. Gradual rollout proved necessary. |
| Haskell (IO monad) | Pure/impure function separation | Type-level IO tag. No way to extract values from IO without staying in IO. One-way monad. | Gold standard for purity. But requires monadic programming style that scrml explicitly rejects. |
| Qwik ($) | Lazy loading + resumability across server/client | `$` suffix marks serialization boundaries. Only serializable `const` values cross. Compiler optimizer enforces. | Works well for performance. Learning curve for "why can't I capture `let`?" Known limitation: developer must add `$` manually. |
| React ("use server") | Server action boundary | File-level directives. Arguments/return values serialized. Closures in server actions capture variables serialized to client and back. | Partial enforcement. Known serialization flaw CVE in React 19. Boundary is file-level, not expression-level. |
| Elm (ports) | Elm/JavaScript interop boundary | All crossing data must be JSON-serializable. Runtime converts JS values to JSON then decodes to Elm types. | Extremely safe. Limits expressiveness. Ports are "strong boundaries" -- not designed for fine-grained interop. |
| Java (FindBugs/SpotBugs) | Security taint analysis | Interprocedural call-graph-based taint tracking. | Effective for known patterns. High false-positive rate for dynamic dispatch. Tooling-level, not language-level. |

---

## Dev Agent Signal

No dev agents were polled for this deep dive. The question is primarily compiler-internal (how to extend taint propagation through indirect references). Dev agent polling would be appropriate for a follow-up question: "Should boundary violations be compile errors or warnings?" and "Should the `server` annotation be required on callbacks that touch server state, or should the compiler always infer it?"

---

## Open Questions

- **Interaction with `^{}` meta blocks:** Do meta blocks that capture closures need boundary analysis? If a `^{}` block captures a variable that is later classified as server-side, is that a compile-time or runtime boundary violation? The `^{}` audit (Phase 0 item 1) has remaining items for closure capture inside meta blocks.

- **Dynamic dispatch (`fn[key]()`):** All three approaches fail on computed function references. E-ROUTE-001 already warns about this. Should the spec formalize that dynamic dispatch across the boundary is always an error, or should there be a runtime check?

- **Recursive/mutually-recursive functions:** The call-graph approach (Approach C) needs cycle detection. If function A calls B and B calls A, and A touches a protected field, does B also get server-tagged? The current route inferrer skips nested function bodies (line 644), which sidesteps this but also misses legitimate cases.

- **Component props and boundary resolution:** SPEC section 15.11.6 says Route Inference SHALL detect server functions passed as props. The current implementation does NOT do this. Is this a spec violation that needs a bug fix, or does the spec need updating to reflect the actual (less capable) behavior?

- **Interaction with `lin` types:** Linear types (`lin`) have exactly-once consumption semantics. A `lin` value captured in a closure that crosses a boundary would need to be consumed exactly once on exactly one side. The intersection of `lin` and boundary enforcement is unspecified.

- **The name-mangling problem (Bug I) may be deeper than the regex:** The current post-process approach of globally replacing function names is architecturally fragile. Even with better regex, new edge cases will emerge. Should name-mangling be moved from post-process regex to the AST emission phase where the compiler knows the syntactic context of each identifier?

---

## Recommendation for Debate

**Approaches worth debating:** A (Type Tags) and C (Extended Taint). These represent the fundamental design tension: should scrml add a new type-system concept for boundary enforcement (maximizing safety) or extend the existing taint model (minimizing conceptual overhead)?

**Approaches that can be eliminated:** None should be fully eliminated. Approach B (Crossing Points) is a valid middle ground but is a subset of Approach A in enforcement power. It could be debated as a pragmatic first step toward Approach A.

**Suggested debate framing:** "Should scrml's boundary enforcement be a type-system property (boundary tags on every value, Rust model) or a flow-analysis property (interprocedural taint tracking, extended current model)? What is the minimum enforcement that prevents the demonstrated leakage classes while keeping compiler complexity tractable for a pre-1.0 language?"

**Suggested participants:**
- `@rust-result-statemachine-expert` -- advocates for type-level enforcement (Approach A)
- `@qwik-resumability-expert` -- advocates for serialization-boundary enforcement (Approach B)
- `@elm-architecture-expert` -- advocates for strong boundaries with limited crossing points
- `@scrml-dev-rust` -- developer perspective on type-tag ergonomics
- `@scrml-dev-react` -- developer perspective on familiar "use server" patterns
- `@scrml-dev-go` -- developer perspective on explicit-over-implicit philosophy

For maximum philosophical contrast: **Rust typestate expert (everything is a type) vs Elm architecture expert (boundary is architectural, not type-level) vs Qwik resumability expert (boundary is a serialization concern)**. Three-way debate captures the full spectrum.

---

## Tags
#deep-dive #boundary #security #server-client #reactive #compiler #codegen #route-inference #active

## Links
- [Bug I reproducer](../../handOffs/incoming/2026-04-22-0940-bugI-name-mangling-bleed.scrml)
- [Bug J reproducer](../../handOffs/incoming/2026-04-22-0940-bugJ-markup-interp-helper-fn-hides-reactive.scrml)
- [S38 hand-off (bug context)](../../handOffs/hand-off-39.md)
- [route-inference.ts](../../compiler/src/route-inference.ts)
- [reactive-deps.ts](../../compiler/src/codegen/reactive-deps.ts)
- [emit-client.ts](../../compiler/src/codegen/emit-client.ts)
- [emit-logic.ts (_ensureBoundary)](../../compiler/src/codegen/emit-logic.ts)
- [SPEC section 12 — Route Inference](../../compiler/SPEC.md)
- [SPEC section 11.4 — server annotation](../../compiler/SPEC.md)
- [SPEC section 15.11.4 — function-typed props](../../compiler/SPEC.md)
- [non-compliance report](../../.claude/maps/non-compliance.report.md)
- [progress log](./boundary-security-progress.md)
