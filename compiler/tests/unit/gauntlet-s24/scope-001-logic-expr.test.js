/**
 * S24 gauntlet — §2a E-SCOPE-001 in logic expression initializers.
 *
 * Before S24, E-SCOPE-001 fired only for unquoted identifiers in markup
 * attribute values (type-system.ts:visitAttr). Undeclared identifiers
 * inside `${}` logic expressions compiled clean — a typo in a let/const
 * initializer would fall through to JS runtime with a ReferenceError,
 * with no compile-time diagnostic.
 *
 * This initial MVP walks the initExpr of every `let` / `const` declaration
 * and emits E-SCOPE-001 for any bare ident that cannot be resolved against:
 *   - the current ScopeChain (function params, prior let/const, prior
 *     function-decls, imports, pre-bound exports),
 *   - the type registry (user-declared enum/struct names),
 *   - the global allowlist (JS/DOM/scrml-meta built-ins),
 *   - underscore-prefixed names (runtime helpers).
 *
 * Skipped: `@`-prefixed reactive refs (DG handles those); member-access
 * chains lookup only the base ident; numeric-looking tokens.
 *
 * Future work: extend coverage from let/const init to bare-expr statements,
 * if-stmt conditions, match-stmt subjects, return-expr operands, and the
 * body-level bare-expr path. This MVP keeps the blast radius bounded to
 * the existing err-scope-001-undeclared.scrml fixture.
 */

import { describe, test, expect } from "bun:test";
import { resolve, dirname } from "path";
import { writeFileSync, rmSync, existsSync, mkdirSync } from "fs";
import { compileScrml } from "../../../src/api.js";

const testDir = dirname(new URL(import.meta.url).pathname);
let tmpCounter = 0;

function compileSrc(source, testName = `s24-scope-${++tmpCounter}`) {
  const tmpDir = resolve(testDir, `_tmp_${testName}`);
  const tmpInput = resolve(tmpDir, `${testName}.scrml`);
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(tmpInput, source);
  try {
    const result = compileScrml({
      inputFiles: [tmpInput],
      write: false,
      outputDir: resolve(tmpDir, "out"),
    });
    return {
      errors: result.errors ?? [],
      scope001: (result.errors ?? []).filter(e => e.code === "E-SCOPE-001"),
    };
  } finally {
    if (existsSync(tmpInput)) rmSync(tmpInput);
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe("S24 §2a — E-SCOPE-001 on undeclared ident in let/const init", () => {
  test("bare undeclared ident in let init → E-SCOPE-001", () => {
    const src = `<program>
\${
  let x = undeclaredVar + 1
}
<p>x</>
</program>
`;
    const { scope001 } = compileSrc(src);
    expect(scope001.some(e => /undeclaredVar/.test(e.message))).toBe(true);
  });

  test("bare undeclared ident in const init → E-SCOPE-001", () => {
    const src = `<program>
\${
  const y = alsoUndeclared + 2
}
<p>y</>
</program>
`;
    const { scope001 } = compileSrc(src);
    expect(scope001.some(e => /alsoUndeclared/.test(e.message))).toBe(true);
  });

  test("declared-first sibling let is resolvable", () => {
    const src = `<program>
\${
  let a = 1
  let b = a + 1
}
<p>\${b}</>
</program>
`;
    const { scope001 } = compileSrc(src);
    expect(scope001).toEqual([]);
  });

  test("function param is resolvable in let init inside body", () => {
    const src = `<program>
\${
  function fn(x) {
    let y = x * 2
    return y
  }
}
<p>\${fn(5)}</>
</program>
`;
    const { scope001 } = compileSrc(src);
    expect(scope001).toEqual([]);
  });

  test("JS built-ins (Math, JSON) don't fire E-SCOPE-001", () => {
    const src = `<program>
\${
  let r = Math.random()
  let s = JSON.stringify({x: 1})
  let p = parseInt("42")
  let c = console.log
}
<p>ok</>
</program>
`;
    const { scope001 } = compileSrc(src);
    expect(scope001).toEqual([]);
  });

  test("member access chain — only base ident is resolved", () => {
    const src = `<program>
\${
  type Color:enum = { Red, Green, Blue }
  let c = Color.Red
  let d = undeclaredBase.field.nested
}
<p>x</>
</program>
`;
    const { scope001 } = compileSrc(src);
    expect(scope001.some(e => /undeclaredBase/.test(e.message))).toBe(true);
    expect(scope001.some(e => /\bColor\b/.test(e.message))).toBe(false);
  });

  test("reactive @var references are skipped (DG owns those)", () => {
    const src = `<program>
\${
  @counter = 0
  let x = @counter + 1
}
<p>\${x}</>
</program>
`;
    const { scope001 } = compileSrc(src);
    expect(scope001).toEqual([]);
  });

  test("underscore-prefixed names are skipped (runtime helpers)", () => {
    const src = `<program>
\${
  let x = _scrml_something_not_in_scope
  let y = _anyInternal
}
<p>x</>
</program>
`;
    const { scope001 } = compileSrc(src);
    expect(scope001).toEqual([]);
  });

  test("self-reference in init does not flag the binding's own name", () => {
    const src = `<program>
\${
  let x = x
}
<p>x</>
</program>
`;
    const { scope001 } = compileSrc(src);
    expect(scope001.some(e => /\bx\b/.test(e.message))).toBe(false);
  });

  test("forward reference to a later-declared export still resolves", () => {
    const src = `<program>
\${
  function consumer() {
    const result = laterHelper(1)
    return result
  }
  export function laterHelper(n) { return n * 2 }
}
<p>\${consumer()}</>
</program>
`;
    const { scope001 } = compileSrc(src);
    expect(scope001).toEqual([]);
  });
});
