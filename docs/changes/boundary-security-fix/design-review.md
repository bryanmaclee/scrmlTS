# Design Review: boundary-security-fix

## Reviewers Invoked

- `scrml-integration-pipeline-reviewer`: NOT AVAILABLE — unreviewed by specialist
- `scrml-type-system-reviewer`: NOT AVAILABLE — unreviewed by specialist
- `scrml-diagnostics-quality-reviewer`: NOT AVAILABLE — unreviewed by specialist

## Self-Review (Pipeline Agent)

### Architecture Assessment

**closureCaptures map (Step 1):** Sound design. Walking each function body's AST to identify identifiers defined in outer scopes is standard closure analysis. The `Map<string, Set<string>>` (fnId -> captured varIds) is the correct data structure. It sits alongside the existing `callees` field in `AnalysisRecord` as a companion data structure. No AST shape changes required — this reads existing nodes.

**Prop-passed function detection (Step 2):** The SPEC at section 15.11.6 (line 6995) already mandates this: "Route Inference SHALL detect server functions passed as props." Implementation gap, not design question. The detection surface is component markup nodes where an attribute value matches a known function name. This is conservative (direct name match only) but consistent with RI's existing DC-011 accepted limitation of "direct patterns only."

**Call-graph BFS reactive deps (Step 3):** This is the Bug J fix. `extractReactiveDeps` currently does string/AST scanning of the expression itself but does not follow function calls. BFS through the call graph to collect transitive reactive deps is the correct approach. The function index from RI provides the call graph. Key concern: this needs the function bodies to be available at CG time. The `collectFileFunctions` utility already provides this. Performance budget: the BFS is bounded by the number of functions in the file (typically < 50). No concern.

**Fixed-point taint propagation (Step 4):** The lattice (`pure < client < server`) with join = max is well-founded. Fixed-point iteration with a MAX_ITER guard is standard. Cycle guard via MAX_ITER is sufficient given the bounded function count. Tarjan SCC would be more elegant but is not necessary for correctness — MAX_ITER catches infinite loops and the lattice is finite so convergence is guaranteed in at most N iterations where N = number of functions.

**Fail-closed _ensureBoundary (Step 5):** Converting console.warn to throw is the correct security posture for a boundary enforcement function. The current code at emit-logic.ts:318-327 defaults missing boundary to "client" — this silently misclassifies server functions. After Step 4, every function has a resolved taint status, so missing boundary at CG time is a compiler bug. Throwing is appropriate.

### Risk Assessment

**Regression risk:** MODERATE. The main risk is that the closureCaptures map identifies captures that change existing functions' boundary classification. Functions that were previously client-side may become server-side. This is the INTENDED behavior but could surprise tests that assert specific boundary assignments. Anomaly detection will catch this.

**Performance risk:** LOW. Closure analysis is O(n*m) where n = functions, m = average body size. Fixed-point iteration is O(k*n) where k = lattice height (3). Both are well within the 15ms budget.

**Compatibility risk:** LOW. No new syntax, no new error codes visible to users (except _ensureBoundary throw, which only fires on compiler bugs). The compiler silently becomes more correct.

### Concerns

1. The `_ensureBoundary` change (Step 5) could break existing tests that deliberately exercise codegen paths without a boundary set. These tests would need to be updated to pass a boundary. This is a test-maintenance cost, not a design concern.

2. The reactive-deps BFS (Step 3) needs access to function bodies at CG time. Currently `collectFileFunctions` walks the AST and returns `FunctionDeclNode[]`. The function bodies are available via `fnNode.body`. Need to verify this is accessible from reactive-deps.ts's call sites.

## Consolidated Verdict

**APPROVE** — with the note that all three specialist reviewers are unavailable. The design follows the debate winner (Approach C, score 54/60), is consistent with the existing architecture, and addresses documented security gaps.

## Tags
#boundary-security-fix #design-review #approve #unreviewed-by-specialist

## Links
- [impact-analysis](./impact-analysis.md)
- [deep-dive](../../deep-dives/boundary-security-indirect-refs-2026-04-24.md)
