# F-RI-001 deeper — Diagnosis

W4 dispatch. Builds on `docs/changes/f-ri-001/diagnosis.md` (S50).

## TL;DR

**Root cause:** `collectReferencedNames` in `compiler/src/route-inference.ts:1143`
extracts identifier names from **flat expression strings** via a regex, which
matches identifiers **inside string-literal contents**. The capture-taint loop
(Step 5b) then matches those bogus names against `fnNameToNodeIds` (a global
name → fn-id map across ALL files in the RI input). When a string literal
happens to contain a token that names a server function in any peer file, the
client function gets falsely tainted to server, which then fires E-RI-002.

**The reproduction in dispatch app:** the `transition()` client function in
`examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml` contains the
string literal `"/login?reason=unauthorized"`. The regex extracts `login` as a
"referenced identifier" of the function body. `app.scrml` declares
`server function login(email, password)`. The capture-taint loop sees `login`
in `transition`'s closureCaptures, finds it in `fnNameToNodeIds` resolving to
the server `login` fn, and propagates server-taint to `transition`. Then
E-RI-002 fires because `transition` contains a `@`-assignment.

**Why the S50 narrow regression tests pass:** they construct hand-built FileAST
fixtures with no peer files containing server fn names that collide with
identifiers inside string literals. Single-file repros (e.g.
`docs/changes/f-ri-001/repro1-canonical.scrml`) also pass — even if the
client fn has `"/login..."` in a string literal, no peer file declares
`server function login` to collide with.

**Why the dispatch app pages with M2 workaround do not fire:** with the
workaround in place, `transition()` calls `setError(errMsg)` instead of
assigning `@errorMessage = result.error` directly. `setError` IS in the
closureCaptures, but it's also in `calleesSet` (because it's directly called),
so the capture-taint loop's `if (calleesSet.has(capturedName)) continue` skip
applies. The string literal `"/login..."` still generates `login` as a
captured name, and the taint still propagates. **But!** `transition` no longer
contains a top-level `@`-assignment — the assignment is hidden inside
`setError(msg)` (which is a separate fn). So `findReactiveAssignment` returns
null for `transition`, and E-RI-002 is not fired. The workaround works by
indirection — moving the @-assignment out of the function so the E-RI-002
check has nothing to find.

This is also why the simpler multi-server-fn fixture I tried first
(`docs/changes/f-ri-001-deeper/repro-multi-fn.scrml`) compiles clean: the
string literals in my simpler fixture don't contain identifiers that collide
with peer server fn names — there's no peer `function login` in the same RI
input.

## Mechanism

`compiler/src/route-inference.ts:1143-1214` `collectReferencedNames`:
```ts
const IDENT_RE = /\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g;

function extractIdentsFromString(str: string): void {
  if (!str) return;
  let m: RegExpExecArray | null;
  const re = new RegExp(IDENT_RE.source, "g");
  while ((m = re.exec(str)) !== null) {
    if (!JS_KEYWORDS.has(m[1])) {
      names.add(m[1]);
    }
  }
}
```

For each bare-expr / let-decl / const-decl / tilde-decl / lin-decl / reactive-*
declaration, it stringifies the ExprNode via `emitStringFromTree` and runs the
regex on the flat string. The flat string includes string-literal content. The
regex makes no distinction between an identifier and a token-shaped substring
inside a string literal.

`compiler/src/route-inference.ts:1438-1445` builds a global `fnNameToNodeIds`:
```ts
const fnNameToNodeIds = new Map<string, string[]>();
for (const [fnNodeId, record] of analysisMap) {
  const name = record.fnNode.name;
  if (!name) continue;
  if (!fnNameToNodeIds.has(name)) fnNameToNodeIds.set(name, []);
  fnNameToNodeIds.get(name)!.push(fnNodeId);
}
```

This map spans ALL files in the RI input. There is no per-file scope.

Step 5b at `compiler/src/route-inference.ts:1459-1511` then iterates each
function's `closureCaptures` and looks each name up in `fnNameToNodeIds`. If
any matched fn is server-tainted, the current function gets tainted.

When `closureCaptures` contains a name harvested from a string literal — and
that name happens to be the name of a peer server fn anywhere in the project
— the current fn falsely escalates to server.

## Confirmed via instrumentation

I instrumented `route-inference.ts` Step 5b with `RI_DIAG=transition` env var
gating, ran the dispatch-app directory compile with the M2 workaround
removed, and observed:

```
[RI_DIAG] iter=1 fn=transition file=...pages/dispatch/load-detail.scrml
[RI_DIAG]   directTriggers=[]
[RI_DIAG]   callees=["getSessionToken","transitionStatusServer",
                     "publishBoardEvent","publishLoadEvent","refresh"]
[RI_DIAG]   closureCaptures=["getSessionToken","load","id",
                             "transitionStatusServer","target","location",
                             "href","login","reason","unauthorized","error",
                             "publishBoardEvent","status","change",
                             "publishLoadEvent","refresh"]
[RI_DIAG]   captured name 'login' resolves to 1 fn(s):
[RI_DIAG]     id=...app.scrml::6944 server=true file=...app.scrml
error [E-RI-002]: ... transition ...
```

Each of `login`, `reason`, `unauthorized`, `change`, `status` come from the
two string literals `"/login?reason=unauthorized"` and `"status-change"`.
`login` is the only one that happens to also be a peer server fn name —
`server function login` in `app.scrml`. The match triggers the false taint.

Verification of contrapositive: with the M2 workaround restored, the same
function still has `login` in its `closureCaptures`, but it does not contain
a top-level `@`-assignment, so E-RI-002 is not fired. The workaround masks
the underlying false taint.

## Fix architecture

Replace the regex-based identifier extraction with a structural walk of the
ExprNode tree using `forEachIdentInExprNode` (already exists in
`compiler/src/expression-parser.ts:2083`). This walker:
- Calls callback only on `kind === "ident"` nodes.
- Skips `LitExpr` nodes (string/number/bool/null/template content is not
  scanned for free identifiers — except template-literal `${...}`
  interpolations, which DO contain real identifier reads).
- Skips `MemberExpr.property` (it's a member access name, not a free var).
- Skips `LambdaExpr` body (new scope).

Specifically:
1. `collectReferencedNames` walks the body's structural ExprNode fields:
   - `bare-expr.exprNode`
   - `let-decl.initExpr`, `const-decl.initExpr`, `tilde-decl.initExpr`,
     `lin-decl.initExpr`, `reactive-*-decl.initExpr`
   - `if-stmt.condExpr`, `if-expr.condExpr`
   - `return-stmt.exprNode`, `throw-stmt.exprNode`
   - `for-stmt.iterableExpr`
   - `while-stmt.condExpr`
   - `match-stmt.subjectExpr` and arm bodies
   - `switch-stmt.subjectExpr` and case-body recursion
   - `try-stmt` body / catch / finally
   - control-flow body recursion (if/while/for/etc. consequent + alternate)
2. For each ExprNode found, run `forEachIdentInExprNode` with a callback
   that adds `ident.name` to the `names` set (filtering out reactive
   `@x` and tilde `~` names — they aren't free function-name references).
3. Do NOT descend into nested function-decls (preserves existing behavior).

The fix is contained to `route-inference.ts` — `collectReferencedNames` is
the only consumer of the regex-on-flat-string pattern that participates in
the capture-taint loop.

## Why this is a correct fix (vs. e.g. per-file fnNameToNodeIds)

The RI step 5b is intentionally cross-file: a closure in file A that
captures a fn from file B (via import) MUST escalate. Restricting
`fnNameToNodeIds` to per-file would break that intent. Per the deep-dive
§5.1 M5 recommendation (B): the fix is "find the actual capture-taint or
analysisMap leak, fix it." The leak here is **identifier extraction reading
string-literal content**, not the cross-file scope of the analysis.

The S39 boundary-security-fix work that introduced closureCaptures is sound
in concept — the bug is in **what counts as "referenced" in the body**.
Token-shaped substrings inside string literals are not references.

## Test discipline

§D — Multi-fn, **string-literal-collision** repro: minimal multi-file fixture
with a client fn whose body contains a string literal whose token text
matches a peer server fn name. Pre-fix: E-RI-002 fires. Post-fix: no taint.

§E — analysisMap leak coverage: per-fn isolation test. Two functions in the
same file that don't reference each other; one server-escalated, one client.
Confirm no taint cross-pollution. (This will be a non-test in the post-fix
world, but it locks in the invariant.)

§F — workaround-removable smoke test: dispatch-app `transition` w/o M2
workaround compiles clean (full directory compile).

The S50 7-test narrow regression suite at
`compiler/tests/unit/route-inference-f-ri-001.test.js` MUST still pass —
those exercise the closure-capture path with a peer server fn called by
identifier reference (not via string literal), and the structural walker
captures those references correctly.

## Notes / out-of-scope confirmations

- The if-stmt's condition and return-stmt's expression are **not** currently
  walked by `collectReferencedNames` (the recursion only follows array
  fields). The fix here will incidentally close that gap by adding explicit
  ExprNode recursion — but the bug we're fixing is the string-literal
  pollution, not the missing-condition gap.

- Cross-file `fnNameToNodeIds` is intentional. We do NOT change it.

- F-CPS-001 (repro4, nested control-flow + direct trigger) is unaffected.
  This is M10 architectural and remains deferred.

- F-RI-001-FOLLOW (`obj.error is not` member access) is unaffected. This is
  W8/M9 territory.

## Tags

- pipeline-stage: RI
- error-code: E-RI-002
- friction-id: F-RI-001
- root-cause: regex-on-flat-string-extracts-identifiers-from-string-literals
- mechanism: M5 (file-context-dependent escalation)
- fix-shape: structural ExprNode walk via existing forEachIdentInExprNode

## Links

- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a41394a95344425f7/compiler/src/route-inference.ts` (lines 1143-1214 `collectReferencedNames`, lines 1438-1511 capture-taint loop)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a41394a95344425f7/compiler/src/expression-parser.ts` (lines 2083-2177 `forEachIdentInExprNode`)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a41394a95344425f7/examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml` (M2 workaround at lines 260-283)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a41394a95344425f7/examples/23-trucking-dispatch/app.scrml` (server `login` fn at line 177)
- `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/systemic-silent-failure-sweep-2026-04-30.md` §4.5
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a41394a95344425f7/docs/changes/f-ri-001/diagnosis.md`
