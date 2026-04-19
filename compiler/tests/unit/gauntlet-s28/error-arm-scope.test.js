/**
 * S28 gauntlet — §19 error-arm handler scope-push.
 *
 * Pre-S28 the `guarded-expr` case in type-system.ts exhaustiveness-checked
 * error arms but never walked the arm HANDLER bodies through the scope
 * checker. Two bugs hid behind this:
 *
 *   1. An undeclared identifier inside an arm handler (`!{ ::X -> typo() }`)
 *      compiled cleanly — no E-SCOPE-001 — because the handler never saw
 *      the scope walker.
 *   2. The caught-error binding (`::X(e) -> use(e)`) was invisible to the
 *      walker on any future coverage effort. Scope-push must bind it.
 *
 * S28 adds per-arm scope-push: enter a child scope, bind `arm.binding`
 * (when present), run checkLogicExprIdents on `arm.handlerExpr`, pop.
 * Queued from S25 as "error-arm `!{}` bindings scope-push".
 */

import { describe, test, expect } from "bun:test";
import { resolve } from "path";
import { writeFileSync, rmSync, existsSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { compileScrml } from "../../../src/api.js";

const tmpRoot = resolve(tmpdir(), "scrml-s28-error-arm-scope");
let tmpCounter = 0;

function compile(src) {
  const tmpDir = resolve(tmpRoot, `case-${++tmpCounter}-${Date.now()}`);
  const tmpInput = resolve(tmpDir, "app.scrml");
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(tmpInput, src);
  try {
    const result = compileScrml({
      inputFiles: [tmpInput],
      write: false,
      outputDir: tmpDir,
    });
    return { errors: result.errors ?? [] };
  } finally {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe("S28 §19 error-arm handler scope-push", () => {
  test("caught-error binding is visible inside the arm handler", () => {
    const src = `<program>
\${
  type E:enum = { NotFound, BadInput }
  fn risky(): number err E { return 1 }
  function log(msg: E) {}
  function go() {
    let x = risky() !{
      ::NotFound(e) -> log(e)
      ::BadInput(err) -> log(err)
    }
  }
}
<p>x</>
</program>
`;
    const { errors } = compile(src);
    const scopeErrs = errors.filter(e => (e.code ?? "") === "E-SCOPE-001");
    expect(scopeErrs).toEqual([]);
  });

  test("undeclared identifier in arm handler → E-SCOPE-001", () => {
    const src = `<program>
\${
  type E:enum = { NotFound }
  fn risky(): number err E { return 1 }
  function go() {
    let x = risky() !{
      ::NotFound(e) -> undeclaredIdent(e)
    }
  }
}
<p>x</>
</program>
`;
    const { errors } = compile(src);
    const scopeErrs = errors.filter(e => (e.code ?? "") === "E-SCOPE-001");
    expect(scopeErrs.length).toBeGreaterThan(0);
    expect(scopeErrs[0].message).toContain("undeclaredIdent");
  });

  test("binding from one arm does NOT leak into another arm", () => {
    // Each arm has its own scope. `e` bound in the first arm's handler is
    // gone by the time the second arm runs. A reference to the first
    // arm's binding from the second arm should fire E-SCOPE-001.
    const src = `<program>
\${
  type E:enum = { A, B }
  fn risky(): number err E { return 1 }
  function log(v: E) {}
  function go() {
    let x = risky() !{
      ::A(first) -> log(first)
      ::B(second) -> log(first)
    }
  }
}
<p>x</>
</program>
`;
    const { errors } = compile(src);
    const scopeErrs = errors.filter(e => (e.code ?? "") === "E-SCOPE-001");
    expect(scopeErrs.length).toBeGreaterThan(0);
    expect(scopeErrs[0].message).toContain("first");
  });

  test("binding is not visible OUTSIDE the arm (no leak into enclosing scope)", () => {
    // After the `!{}` expression completes, the binding `e` is out of scope.
    // Any reference to `e` in a later statement must fire E-SCOPE-001.
    const src = `<program>
\${
  type E:enum = { Only }
  fn risky(): number err E { return 1 }
  function log(v: E) {}
  function go() {
    let x = risky() !{
      ::Only(e) -> log(e)
    }
    log(e)
  }
}
<p>x</>
</program>
`;
    const { errors } = compile(src);
    const scopeErrs = errors.filter(e => (e.code ?? "") === "E-SCOPE-001");
    // The second `log(e)` should fire — `e` is outside the arm scope.
    expect(scopeErrs.length).toBeGreaterThan(0);
  });

  test("handler can still reference enclosing scope's locals + params", () => {
    const src = `<program>
\${
  type E:enum = { Only }
  fn risky(): number err E { return 1 }
  function log(v: number) {}
  function go(base: number) {
    let multiplier = 2
    let x = risky() !{
      ::Only(e) -> log(base * multiplier)
    }
  }
}
<p>x</>
</program>
`;
    const { errors } = compile(src);
    const scopeErrs = errors.filter(e => (e.code ?? "") === "E-SCOPE-001");
    expect(scopeErrs).toEqual([]);
  });

  test("unbound arm (no `(binding)` clause) — handler still scope-checked", () => {
    // A bare variant arm like `::Only -> log(1)` has no binding. The handler
    // should still run through the scope walker (catches typos like
    // `undeclared()`).
    const src = `<program>
\${
  type E:enum = { Only }
  fn risky(): number err E { return 1 }
  function log(v: number) {}
  function go() {
    let x = risky() !{
      ::Only -> neverDeclared()
    }
  }
}
<p>x</>
</program>
`;
    const { errors } = compile(src);
    const scopeErrs = errors.filter(e => (e.code ?? "") === "E-SCOPE-001");
    expect(scopeErrs.length).toBeGreaterThan(0);
    expect(scopeErrs[0].message).toContain("neverDeclared");
  });
});
