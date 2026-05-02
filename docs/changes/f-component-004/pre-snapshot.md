# Pre-snapshot: f-component-004

## Baseline (commit 966a493)
- Tests: 8479 pass / 40 skip / 0 fail / 8519 total / 410 files
- Pre-existing flake: serve.test.js ECONNREFUSED (transient, network-dependent)

## Bug under investigation
substituteProps in CE walks markup text + attr values to substitute `${propName}`, but does NOT walk into ExprNode bodies of logic blocks (`${ ... }` containing statements/expressions). Result: prop refs inside logic blocks fail TS as undeclared.

## Repro
Form 1 + Form 2 component bodies with logic blocks referencing props produce identical errors (confirming pre-existing CE territory, not introduced by P2).

## Strategy
1. Find substituteProps in compiler/src/component-expander.ts
2. Build substitutePropsInExprNode helper with shadowing-aware walking
3. Invoke from substituteProps at logic-block markup positions
4. New tests: basic, member, lambda, local, template, nested, Form1+Form2 parity success
5. Update P2-wrapper parity test (currently asserts SAME errors → assert SAME success)
6. SPEC §15 normative paragraph
7. FRICTION.md F-COMPONENT-004 → RESOLVED
