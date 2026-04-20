/**
 * import-scope-registration.test.js — Imports in logic-block scope
 *
 * Regression: giti inbound 2026-04-20 GITI-002.
 *
 * `import { x } from './file.js'` inside a `${}` logic block was firing
 * a false E-SCOPE-001 whenever `x` was used elsewhere in the logic block
 * (including inside `server function` bodies). The codegen path already
 * wrote the import statement into `.server.js` and `.client.js`, so the
 * output was correct — but the scope-resolver rejected the use.
 *
 * Fix: `case "import-decl"` in type-system.ts now binds each imported
 * local name with `kind: "import"` so checkLogicExprIdents finds it via
 * scopeChain.lookup().
 *
 * Coverage:
 *   §1  Named import used in a function body — no E-SCOPE-001
 *   §2  Named import used in a `server function` body — no E-SCOPE-001
 *   §3  Named import used in a top-level logic expression — no E-SCOPE-001
 *   §4  Default import used in a logic expression — no E-SCOPE-001
 *   §5  Undeclared name (no import) still fires E-SCOPE-001 (negative control)
 *   §6  Multiple named imports all registered
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runTS } from "../../src/type-system.js";

function diagnose(src) {
  const bs = splitBlocks("/test/app.scrml", src);
  if (bs.errors && bs.errors.length > 0) return { errors: bs.errors };
  const { ast } = buildAST(bs);
  const res = runTS({ files: [ast] });
  return { errors: res.errors ?? [] };
}

function hasCode(errors, code) {
  return errors.some(e => e.code === code);
}

// ---------------------------------------------------------------------------
// §1: Named import used inside a regular function body — no E-SCOPE-001
// ---------------------------------------------------------------------------

describe("§1: named import used in a function body", () => {
  test("no E-SCOPE-001 on imported name used inside function body", () => {
    const src = `<program>

\${
  import { getGreeting } from './engine/probe.js'

  function greet() {
    lift getGreeting("world")
  }
}

<div>
  <button onclick=greet()>Greet</button>
</div>

</program>
`;
    const { errors } = diagnose(src);
    expect(hasCode(errors, "E-SCOPE-001")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §2: Named import used inside a server function body — no E-SCOPE-001
// (this is the exact giti GITI-002 repro shape)
// ---------------------------------------------------------------------------

describe("§2: named import used in a server function body", () => {
  test("no E-SCOPE-001 on imported name used inside server function", () => {
    const src = `<program>

\${
  import { getGreeting } from './engine/probe.js'

  server function loadGreeting() {
    lift getGreeting("world")
  }
}

<div>
  <p>\${loadGreeting()}</p>
</div>

</program>
`;
    const { errors } = diagnose(src);
    expect(hasCode(errors, "E-SCOPE-001")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §3: Named import used in a top-level logic expression — no E-SCOPE-001
// ---------------------------------------------------------------------------

describe("§3: named import used in a top-level logic expression", () => {
  test("no E-SCOPE-001 on imported name used in a bare-expr at logic top", () => {
    const src = `<program>

\${
  import { helper } from './engine/probe.js'

  @result = helper()
}

<p>\${@result}</p>

</program>
`;
    const { errors } = diagnose(src);
    expect(hasCode(errors, "E-SCOPE-001")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §4: Default import
// ---------------------------------------------------------------------------

describe("§4: default import used in a logic expression", () => {
  test("no E-SCOPE-001 on default-imported name", () => {
    const src = `<program>

\${
  import config from './engine/config.js'

  function read() {
    lift config
  }
}

<button onclick=read()>Go</button>

</program>
`;
    const { errors } = diagnose(src);
    expect(hasCode(errors, "E-SCOPE-001")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §5: Negative control — undeclared name still fires E-SCOPE-001
// ---------------------------------------------------------------------------

describe("§5: undeclared identifier still fires E-SCOPE-001", () => {
  test("bare use of a non-imported, non-declared name fires E-SCOPE-001", () => {
    const src = `<program>

\${
  function broken() {
    lift undeclaredHelper()
  }
}

<button onclick=broken()>X</button>

</program>
`;
    const { errors } = diagnose(src);
    expect(hasCode(errors, "E-SCOPE-001")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §6: Multiple named imports all registered
// ---------------------------------------------------------------------------

describe("§6: multiple named imports all enter scope", () => {
  test("all of {a, b, c} are resolvable", () => {
    const src = `<program>

\${
  import { alpha, beta, gamma } from './engine/probe.js'

  function demo() {
    lift alpha() + beta() + gamma()
  }
}

<button onclick=demo()>Run</button>

</program>
`;
    const { errors } = diagnose(src);
    expect(hasCode(errors, "E-SCOPE-001")).toBe(false);
  });
});
