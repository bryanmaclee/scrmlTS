/**
 * I-FN-PROMOTABLE — Unit Tests
 *
 * Tests for compiler/src/lint-i-fn-promotable.js (S122 Unit EE).
 *
 * Coverage:
 *   §1  Positive — function body with only local mutation + no @-cell writes
 *       fires I-FN-PROMOTABLE.
 *   §2  Negative A — function body mutates an outer-scope `let` variable;
 *       NO I-FN-PROMOTABLE (E-FN-003 condition).
 *   §3  Negative B — function body writes to an `@`-cell;
 *       NO I-FN-PROMOTABLE (§54.6.1 unconditional check).
 *   §4  Negative C — declaration is already `fn`; NO I-FN-PROMOTABLE
 *       (avoid double-lint).
 *   §5  Negative D (structural skip) — function is `async`; NO I-FN-PROMOTABLE
 *       (fn is sync; async cannot be fn-promoted).
 *   §6  Diagnostic shape — required fields present + severity is "info".
 *   §7  Lint never blocks compile — files with the lint still produce output.
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compileSource(source) {
  const dir = join(tmpdir(), "scrml-i-fn-test-" + Math.random().toString(36).slice(2));
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, "test.scrml");
  writeFileSync(filePath, source, "utf8");
  let result;
  try {
    result = compileScrml({
      inputFiles: [filePath],
      outputDir: join(dir, "dist"),
      write: false,
    });
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
  return result;
}

function getFnPromotableDiags(result) {
  return (result.lintDiagnostics ?? []).filter(d => d.code === "I-FN-PROMOTABLE");
}

// ---------------------------------------------------------------------------
// §1 Positive — fn-eligible body
// ---------------------------------------------------------------------------

describe("§1 I-FN-PROMOTABLE — positive: function body meets fn-body constraints", () => {
  test("function with only local mutation + no @-cell writes fires I-FN-PROMOTABLE", () => {
    const src = `\${
  function add_one(x: number) {
    let z = x + 1
    return z
  }
}
<div>Hello</>`;
    const result = compileSource(src);
    const diags = getFnPromotableDiags(result);
    expect(diags.length).toBe(1);
    expect(diags[0].message).toContain("add_one");
    expect(diags[0].message).toContain("§48.3.3");
    expect(diags[0].message).toContain("§56");
  });

  test("function with destructured params and local-only logic fires the lint", () => {
    const src = `\${
  function build_pair(a: number, b: number) {
    let sum = a + b
    let prod = a * b
    return sum + prod
  }
}
<div>Hello</>`;
    const result = compileSource(src);
    const diags = getFnPromotableDiags(result);
    expect(diags.length).toBe(1);
    expect(diags[0].message).toContain("build_pair");
  });
});

// ---------------------------------------------------------------------------
// §2 Negative A — outer `let` mutation
// ---------------------------------------------------------------------------

describe("§2 I-FN-PROMOTABLE — negative: outer-scope let mutation", () => {
  test("function that writes to an outer let variable does NOT fire", () => {
    const src = `\${
  let counter = 0
  function bump(x: number) {
    counter = counter + x
    return counter
  }
}
<div>Hello</>`;
    const result = compileSource(src);
    const diags = getFnPromotableDiags(result);
    expect(diags.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §3 Negative B — @-cell write
// ---------------------------------------------------------------------------

describe("§3 I-FN-PROMOTABLE — negative: @-cell write", () => {
  test("function that writes to an @-cell does NOT fire", () => {
    const src = `\${
  <total>: number = 0
  function add_to_total(x: number) {
    @total = @total + x
    return @total
  }
}
<div>Hello</>`;
    const result = compileSource(src);
    const diags = getFnPromotableDiags(result);
    expect(diags.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §4 Negative C — already `fn`
// ---------------------------------------------------------------------------

describe("§4 I-FN-PROMOTABLE — negative: already promoted to fn", () => {
  test("a declaration already using fn does NOT fire (avoid double-lint)", () => {
    const src = `\${
  fn pure_helper(x: number) {
    let z = x + 1
    return z
  }
}
<div>Hello</>`;
    const result = compileSource(src);
    const diags = getFnPromotableDiags(result);
    expect(diags.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §5 Negative D — async function (structural skip)
// ---------------------------------------------------------------------------

describe("§5 I-FN-PROMOTABLE — negative: structural skip-list", () => {
  test("server function (its own surface §12.5) does NOT fire", () => {
    // server functions have isServer=true; they're a separate ergonomic surface
    // (§12.5) and not candidates for the pure-fn promotion lint.
    const src = `\${
  server function ping() {
    return "pong"
  }
}
<div>Hello</>`;
    const result = compileSource(src);
    const diags = getFnPromotableDiags(result);
    expect(diags.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §6 Diagnostic shape + severity
// ---------------------------------------------------------------------------

describe("§6 I-FN-PROMOTABLE — diagnostic shape", () => {
  test("diagnostic carries required fields with severity=info", () => {
    const src = `\${
  function pure_calc(x: number) {
    let z = x * 2
    return z
  }
}
<div>Hello</>`;
    const result = compileSource(src);
    const diags = getFnPromotableDiags(result);
    expect(diags.length).toBe(1);
    const d = diags[0];
    expect(d.code).toBe("I-FN-PROMOTABLE");
    expect(d.severity).toBe("info");
    expect(typeof d.line).toBe("number");
    expect(typeof d.column).toBe("number");
    expect(typeof d.message).toBe("string");
    expect(typeof d.filePath).toBe("string");
    // Ghost + correction surface adopter-facing rewrite path
    expect(d.ghost).toContain("function pure_calc");
    expect(d.correction).toContain("fn pure_calc");
  });
});

// ---------------------------------------------------------------------------
// §6b Negative — body reads mutable browser/global state (GitHub #17)
//      The lint shares `checkFnBodyProhibitions` as its eligibility probe, so a
//      `function` that reads window.location / document.cookie / navigator.* is
//      NOT fn-eligible and must NOT be suggested for promotion. A genuinely-pure
//      sibling (string-arg parse) must STILL be suggested.
// ---------------------------------------------------------------------------

describe("§6b I-FN-PROMOTABLE — negative: mutable global-state read", () => {
  test("function reading window.location.search does NOT fire I-FN-PROMOTABLE", () => {
    const src = `\${
  function getN() {
    const v = parseInt(new URLSearchParams(window.location.search).get("n"), 10)
    return isNaN(v) ? 0 : v
  }
}
<div>Hi</>`;
    const result = compileSource(src);
    expect(getFnPromotableDiags(result).length).toBe(0);
  });

  test("function reading document.cookie does NOT fire I-FN-PROMOTABLE", () => {
    const src = `\${
  function readCookie() {
    const c = document.cookie
    return c
  }
}
<div>Hi</>`;
    const result = compileSource(src);
    expect(getFnPromotableDiags(result).length).toBe(0);
  });

  test("a genuinely-pure sibling (string-arg parse) STILL fires I-FN-PROMOTABLE", () => {
    const src = `\${
  function numOrAbsent(s: string) {
    const v = parseInt(new URLSearchParams(s).get("n"), 10)
    return isNaN(v) ? 0 : v
  }
}
<div>Hi</>`;
    const result = compileSource(src);
    const diags = getFnPromotableDiags(result);
    expect(diags.length).toBe(1);
    expect(diags[0].message).toContain("numOrAbsent");
  });
});

// ---------------------------------------------------------------------------
// §7 Lint never blocks compile
// ---------------------------------------------------------------------------

describe("§7 I-FN-PROMOTABLE — non-blocking", () => {
  test("a file that fires the lint still compiles cleanly (no errors injected)", () => {
    const src = `\${
  function adder(x: number) {
    let z = x + 1
    return z
  }
}
<div>Hello</>`;
    const result = compileSource(src);
    expect(result.errors?.length ?? 0).toBe(0);
    // The lint should not surface in `errors` channel — it's info-level only.
    const errorsAreFnPromotable = (result.errors ?? []).some(e => e.code === "I-FN-PROMOTABLE");
    expect(errorsAreFnPromotable).toBe(false);
  });
});
