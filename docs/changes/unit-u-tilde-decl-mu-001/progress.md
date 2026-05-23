# Progress: unit-u-tilde-decl-mu-001

- [start] Branch created. Baseline: 1× E-MU-001 in tag-frame.scrml (`consumedRhs`). 13912 tests passing 0 fail.
- [diagnosis] Root cause located: type-system.ts case "tilde-decl" (line 8722) unconditionally calls `mustUseTracker.declare(name)`. Per §48.3.3, tilde-decl semantically represents reassignment (`x = 5`), NOT a fresh declaration. When a name is already bound by an enclosing let/const/lin-decl, the tilde-decl is a reassignment and should NOT register as a fresh must-use variable.
- [plan] Add scope-binding tracking to checkLinear: collect let/const/lin-decl names from current scope body (mirroring `collectLocalDecls` at line 12174); thread parent-bindings through recursive checkLinear calls and closure case. Skip mustUseTracker.declare() when name is already a known binding. Init-walk still runs (RHS may reference must-use names).
- [repro] Minimal repro saved at /tmp/scrml-mu-tag-frame-shape.scrml. Shape: `let X = false; while (...) { if (X) {...}; if (...) { if (...) { X = true } } }`. Reads X BEFORE reassignment in deeply-nested branch. Also confirmed: `fn f(x) { x = 5 }` (param + tilde-decl reassignment + no read) ALSO fires falsely — same root cause.
- [fix] type-system.ts: CheckLinearOpts extended with paramNames + parentBindings; knownBindings set built per checkLinear call (params ∪ outer-scope bindings ∪ this-scope let/const/lin-decl); case "tilde-decl" gated on `!knownBindings.has(name)`; function-decl threads paramNames (incl. non-lin params); closure threads parentBindings = knownBindings.
- [test] 8 regression tests added to tilde-decl.test.js. Tests pre/post: 21 → 29 in tilde-decl.test.js; 13912 → 13920 full unit+integration+conformance.
- [verify] tag-frame.scrml E-MU-001 count: 1 → 0. Total errors in tag-frame.scrml: 0. No regressions in full suite (0 fail).
- [done] Final SHA pending commit.
