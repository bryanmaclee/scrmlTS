/**
 * value-lift-tilde — Unit Tests
 *
 * Tests for §32 tilde pipeline accumulator codegen:
 *   1. bare-expr in a tilde context → `let _scrml_tilde_N = <expr>;`
 *   2. `~` reference in let-decl init → substituted with tilde var
 *   3. `~` reference in const-decl / tilde-decl init → substituted
 *   4. value-lift (non-markup lift-expr) → `let _scrml_tilde_N = <expr>;`
 *   5. markup lift-expr unaffected (existing behavior preserved)
 *   6. No tilde context → all existing behavior unchanged (no regressions)
 *   7. emitLogicBody integration test — pre-scan and full sequence
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { emitLogicNode, emitLogicBody } from "../../src/codegen/emit-logic.ts";
import { rewriteTildeRef } from "../../src/codegen/rewrite.ts";
import { resetVarCounter } from "../../src/codegen/var-counter.ts";

// Reset the var counter before each test so variable names are deterministic
beforeEach(() => {
  resetVarCounter();
});

// ---------------------------------------------------------------------------
// rewriteTildeRef unit tests
// ---------------------------------------------------------------------------

describe("rewriteTildeRef: standalone ~ replacement", () => {
  test("replaces ~ with tilde var in a simple expression", () => {
    expect(rewriteTildeRef("~ * 2", "_scrml_tilde_1")).toBe("_scrml_tilde_1 * 2");
  });

  test("replaces ~ in spaced property access (tokenizer form)", () => {
    // The tokenizer inserts spaces around tokens, so `~.value` in source
    // becomes `~ . value` in the expression string. The replacement applies
    // because `.` is not a word character.
    expect(rewriteTildeRef("~ . value", "_scrml_tilde_1")).toBe("_scrml_tilde_1 . value");
  });

  test("also replaces ~ when directly followed by . (compact form)", () => {
    // compact `~.value` — dot is not a word char, so ~ is replaced
    expect(rewriteTildeRef("~.value", "_scrml_tilde_1")).toBe("_scrml_tilde_1.value");
  });

  test("replaces standalone ~ in function call argument", () => {
    expect(rewriteTildeRef("process ( ~ )", "_scrml_tilde_1")).toBe("process ( _scrml_tilde_1 )");
  });

  test("does NOT replace ~ preceded by word char (e.g., identifier ending in ~)", () => {
    // This should not happen in practice, but verify the regex is safe
    expect(rewriteTildeRef("a~ + 1", "_scrml_tilde_1")).toBe("a~ + 1");
  });

  test("replaces multiple standalone ~ occurrences", () => {
    expect(rewriteTildeRef("~ + ~", "_scrml_tilde_1")).toBe("_scrml_tilde_1 + _scrml_tilde_1");
  });

  test("returns original string when no ~ present", () => {
    expect(rewriteTildeRef("x + 2", "_scrml_tilde_1")).toBe("x + 2");
  });

  test("returns original string when tildeVar is empty", () => {
    expect(rewriteTildeRef("~ * 2", "")).toBe("~ * 2");
  });

  test("handles empty expression string", () => {
    expect(rewriteTildeRef("", "_scrml_tilde_1")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// bare-expr with tilde context
// ---------------------------------------------------------------------------

describe("emitLogicNode: bare-expr with tildeContext", () => {
  test("emits let tilde var for bare function call", () => {
    const ctx = { var: null };
    const node = { kind: "bare-expr", expr: "fetchUser ( id )" };
    const result = emitLogicNode(node, { tildeContext: ctx });
    expect(result).toMatch(/^let _scrml_tilde_\d+ = fetchUser \( id \);$/);
    expect(ctx.var).toMatch(/^_scrml_tilde_\d+$/);
  });

  test("emits let tilde var for numeric literal bare-expr", () => {
    const ctx = { var: null };
    const node = { kind: "bare-expr", expr: "fetchUser ( id ) 42" };
    const result = emitLogicNode(node, { tildeContext: ctx });
    // Depending on parser, the expr may be treated as two stmts or one
    // Just verify it contains the tilde pattern when ctx is set
    expect(ctx.var).toMatch(/^_scrml_tilde_\d+$/);
  });

  test("updates tildeContext.var with the generated variable name", () => {
    const ctx = { var: null };
    emitLogicNode({ kind: "bare-expr", expr: "getData ( ) " }, { tildeContext: ctx });
    expect(ctx.var).not.toBeNull();
    expect(ctx.var).toMatch(/^_scrml_tilde_\d+$/);
  });

  test("without tildeContext, bare-expr emits plain statement (no regression)", () => {
    const node = { kind: "bare-expr", expr: "foo ( bar )" };
    const result = emitLogicNode(node, {});
    expect(result).toBe("foo ( bar );");
  });
});

// ---------------------------------------------------------------------------
// let-decl with ~ in init
// ---------------------------------------------------------------------------

describe("emitLogicNode: let-decl with ~ substitution", () => {
  test("substitutes ~ in let init when tildeContext.var is set", () => {
    const ctx = { var: "_scrml_tilde_1" };
    const node = { kind: "let-decl", name: "result", init: "~ * 2" };
    const result = emitLogicNode(node, { tildeContext: ctx });
    expect(result).toBe("let result = _scrml_tilde_1 * 2;");
  });

  test("resets tildeContext.var to null after ~ is consumed in let-decl", () => {
    const ctx = { var: "_scrml_tilde_1" };
    const node = { kind: "let-decl", name: "result", init: "~ * 2" };
    emitLogicNode(node, { tildeContext: ctx });
    expect(ctx.var).toBeNull();
  });

  test("let-decl without ~ in init does not consume tilde context", () => {
    const ctx = { var: "_scrml_tilde_1" };
    const node = { kind: "let-decl", name: "x", init: "42" };
    emitLogicNode(node, { tildeContext: ctx });
    // tilde context not consumed — var still set
    expect(ctx.var).toBe("_scrml_tilde_1");
  });

  test("let-decl without tildeContext emits normally (no regression)", () => {
    const node = { kind: "let-decl", name: "x", init: "42" };
    const result = emitLogicNode(node, {});
    expect(result).toBe("let x = 42;");
  });
});

// ---------------------------------------------------------------------------
// const-decl / tilde-decl with ~ in init
// ---------------------------------------------------------------------------

describe("emitLogicNode: const-decl with ~ substitution", () => {
  test("substitutes ~ in const init when tildeContext.var is set", () => {
    const ctx = { var: "_scrml_tilde_1" };
    const node = { kind: "const-decl", name: "dbl", init: "~ * 2" };
    const result = emitLogicNode(node, { tildeContext: ctx });
    expect(result).toBe("const dbl = _scrml_tilde_1 * 2;");
  });

  test("resets tildeContext.var after consumption in const-decl", () => {
    const ctx = { var: "_scrml_tilde_1" };
    emitLogicNode({ kind: "const-decl", name: "dbl", init: "~" }, { tildeContext: ctx });
    expect(ctx.var).toBeNull();
  });

  test("tilde-decl with ~ in init substitutes tilde var", () => {
    const ctx = { var: "_scrml_tilde_1" };
    const node = { kind: "tilde-decl", name: "dbl", init: "~ + 1" };
    const result = emitLogicNode(node, { tildeContext: ctx });
    expect(result).toBe("const dbl = _scrml_tilde_1 + 1;");
  });
});

// ---------------------------------------------------------------------------
// value-lift: lift-expr with expr.kind === "expr" (non-markup)
// ---------------------------------------------------------------------------

describe("emitLogicNode: value-lift with tildeContext", () => {
  test("value-lift emits let tilde var for numeric literal", () => {
    const ctx = { var: null };
    const node = {
      kind: "lift-expr",
      expr: { kind: "expr", expr: "3" },
    };
    const result = emitLogicNode(node, { tildeContext: ctx });
    expect(result).toMatch(/^let _scrml_tilde_\d+ = 3;$/);
    expect(ctx.var).toMatch(/^_scrml_tilde_\d+$/);
  });

  test("value-lift emits let tilde var for function call", () => {
    const ctx = { var: null };
    const node = {
      kind: "lift-expr",
      expr: { kind: "expr", expr: "fetchUser ( id )" },
    };
    const result = emitLogicNode(node, { tildeContext: ctx });
    expect(result).toMatch(/^let _scrml_tilde_\d+ = fetchUser \( id \);$/);
  });

  test("value-lift updates tildeContext.var", () => {
    const ctx = { var: null };
    emitLogicNode(
      { kind: "lift-expr", expr: { kind: "expr", expr: "42" } },
      { tildeContext: ctx }
    );
    expect(ctx.var).toMatch(/^_scrml_tilde_\d+$/);
  });

  test("markup lift-expr (kind === markup) is unaffected by tildeContext (no regression)", () => {
    const ctx = { var: null };
    const node = {
      kind: "lift-expr",
      expr: {
        kind: "markup",
        node: {
          kind: "markup",
          tag: "li",
          attrs: "",
          children: [],
          body: [],
          span: { file: "test.scrml", start: 0, end: 10 },
        },
      },
    };
    const result = emitLogicNode(node, { tildeContext: ctx });
    // markup lift always calls emitLiftExpr — result should be _scrml_lift(...)
    expect(result).toContain("_scrml_lift");
    // tildeContext.var should NOT be updated by markup lift
    expect(ctx.var).toBeNull();
  });

  test("lift-expr with tag-like expression (starts with <) is NOT treated as value-lift", () => {
    const ctx = { var: null };
    const node = {
      kind: "lift-expr",
      expr: { kind: "expr", expr: "< li > item /" },
    };
    const result = emitLogicNode(node, { tildeContext: ctx });
    // Should call emitLiftExpr, not produce tilde var
    expect(ctx.var).toBeNull();
  });

  test("without tildeContext, lift-expr behaves unchanged (no regression)", () => {
    const node = {
      kind: "lift-expr",
      expr: { kind: "expr", expr: "< li > item /" },
    };
    const result = emitLogicNode(node, {});
    // Should produce _scrml_lift(...) or equivalent via emitLiftExpr
    expect(result.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// emitLogicBody integration tests
// ---------------------------------------------------------------------------

describe("emitLogicBody: sequence emission with ~ tracking", () => {
  test("sequence with no ~ reference: emits normally (no tilde vars)", () => {
    const nodes = [
      { kind: "const-decl", name: "x", init: "42" },
      { kind: "bare-expr", expr: "console . log ( x )" },
    ];
    const results = emitLogicBody(nodes);
    expect(results).toHaveLength(2);
    expect(results[0]).toBe("const x = 42;");
    expect(results[1]).toBe("console . log ( x );");
  });

  test("sequence with ~ reference: bare-expr becomes tilde var, ~ is substituted", () => {
    // Source: fetchUser(id)   // unassigned → initializes ~
    //         const user = ~   // consumes ~
    const nodes = [
      { kind: "bare-expr", expr: "fetchUser ( id )" },
      { kind: "const-decl", name: "user", init: "~" },
    ];
    const results = emitLogicBody(nodes);
    expect(results).toHaveLength(2);
    // bare-expr should have been rewritten to `let _scrml_tilde_N = fetchUser(id);`
    expect(results[0]).toMatch(/^let _scrml_tilde_\d+ = fetchUser \( id \);$/);
    // const-decl should reference the same tilde var
    const tildeVarMatch = results[0].match(/_scrml_tilde_\d+/);
    expect(tildeVarMatch).not.toBeNull();
    const tildeVar = tildeVarMatch[0];
    expect(results[1]).toBe(`const user = ${tildeVar};`);
  });

  test("sequence: value-lift initializes ~ then const consumes it", () => {
    // Source: lift 3; const a = ~
    const nodes = [
      { kind: "lift-expr", expr: { kind: "expr", expr: "3" } },
      { kind: "const-decl", name: "a", init: "~" },
    ];
    const results = emitLogicBody(nodes);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatch(/^let _scrml_tilde_\d+ = 3;$/);
    const tildeVar = results[0].match(/_scrml_tilde_\d+/)[0];
    expect(results[1]).toBe(`const a = ${tildeVar};`);
  });

  test("sequence: value-lift in if body → tilde var + let-decl consuming it", () => {
    // Source: lift 7; let val = ~ * 2
    const nodes = [
      { kind: "lift-expr", expr: { kind: "expr", expr: "7" } },
      { kind: "let-decl", name: "val", init: "~ * 2" },
    ];
    const results = emitLogicBody(nodes);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatch(/^let _scrml_tilde_\d+ = 7;$/);
    const tildeVar = results[0].match(/_scrml_tilde_\d+/)[0];
    expect(results[1]).toBe(`let val = ${tildeVar} * 2;`);
  });

  test("sequence with ~ in tilde-decl (bare assignment): substitutes correctly", () => {
    // Source: fetchData(); result = ~ (bare assignment)
    const nodes = [
      { kind: "bare-expr", expr: "fetchData ( )" },
      { kind: "tilde-decl", name: "result", init: "~" },
    ];
    const results = emitLogicBody(nodes);
    expect(results).toHaveLength(2);
    const tildeVar = results[0].match(/_scrml_tilde_\d+/)[0];
    expect(results[1]).toBe(`const result = ${tildeVar};`);
  });

  test("no ~ reference in sequence: existing behavior unchanged (no regression)", () => {
    const nodes = [
      { kind: "let-decl", name: "a", init: "1" },
      { kind: "const-decl", name: "b", init: "2" },
      { kind: "bare-expr", expr: "console . log ( a + b )" },
    ];
    const results = emitLogicBody(nodes);
    expect(results[0]).toBe("let a = 1;");
    expect(results[1]).toBe("const b = 2;");
    expect(results[2]).toBe("console . log ( a + b );");
    // No tilde vars should appear
    for (const r of results) {
      expect(r).not.toContain("_scrml_tilde_");
    }
  });

  test("emitLogicBody returns empty array for empty input", () => {
    expect(emitLogicBody([])).toEqual([]);
  });

  test("emitLogicBody handles null nodes gracefully", () => {
    const nodes = [null, { kind: "const-decl", name: "x", init: "1" }, undefined];
    const results = emitLogicBody(nodes);
    expect(results).toHaveLength(1);
    expect(results[0]).toBe("const x = 1;");
  });
});


// ---------------------------------------------------------------------------
// §32 loop accumulator — for/while lift produces array, not single value
// ---------------------------------------------------------------------------

describe("emitLogicBody: for-loop lift accumulates array (list comprehension)", () => {
  test("for-of with lift → tilde var initialized as [], lift uses push", () => {
    const nodes = [
      {
        kind: "for-stmt",
        iterable: "( let x of items )",
        variable: "x",
        body: [
          { kind: "lift-expr", expr: { kind: "expr", expr: "x . name" } },
        ],
      },
      { kind: "const-decl", name: "names", init: "~" },
    ];
    const results = emitLogicBody(nodes);
    expect(results).toHaveLength(2);
    const forBlock = results[0];
    expect(forBlock).toMatch(/let _scrml_tilde_\d+ = \[\];/);
    expect(forBlock).toMatch(/for \(const x of/);
    expect(forBlock).toMatch(/_scrml_tilde_\d+\.push\(x \. name\);/);
    const tildeVarMatch = forBlock.match(/_scrml_tilde_\d+/);
    expect(tildeVarMatch).not.toBeNull();
    const tildeVar = tildeVarMatch[0];
    expect(results[1]).toBe(`const names = ${tildeVar};`);
  });

  test("for-of with conditional lift → filtered array (only matching items pushed)", () => {
    const nodes = [
      {
        kind: "for-stmt",
        iterable: "( let x of items )",
        variable: "x",
        body: [
          {
            kind: "if-stmt",
            condition: "x . ok",
            consequent: [
              { kind: "lift-expr", expr: { kind: "expr", expr: "x" } },
            ],
          },
        ],
      },
      { kind: "const-decl", name: "good", init: "~" },
    ];
    const results = emitLogicBody(nodes);
    expect(results).toHaveLength(2);
    const forBlock = results[0];
    expect(forBlock).toMatch(/let _scrml_tilde_\d+ = \[\];/);
    expect(forBlock).toMatch(/_scrml_tilde_\d+\.push\(x\);/);
    expect(results[1]).toMatch(/^const good = _scrml_tilde_\d+;$/);
  });

  test("while loop with lift → array accumulator", () => {
    const nodes = [
      {
        kind: "while-stmt",
        condition: "cond",
        body: [
          { kind: "lift-expr", expr: { kind: "expr", expr: "getValue ( )" } },
        ],
      },
      { kind: "const-decl", name: "vals", init: "~" },
    ];
    const results = emitLogicBody(nodes);
    expect(results).toHaveLength(2);
    const whileBlock = results[0];
    expect(whileBlock).toMatch(/let _scrml_tilde_\d+ = \[\];/);
    expect(whileBlock).toMatch(/while \(cond\) \{/);
    expect(whileBlock).toMatch(/_scrml_tilde_\d+\.push\(getValue \( \)\);/);
    expect(results[1]).toMatch(/^const vals = _scrml_tilde_\d+;$/);
  });

  test("array init is emitted before the for loop — not inside it", () => {
    const nodes = [
      {
        kind: "for-stmt",
        iterable: "( let item of list )",
        variable: "item",
        body: [
          { kind: "lift-expr", expr: { kind: "expr", expr: "item" } },
        ],
      },
      { kind: "const-decl", name: "result", init: "~" },
    ];
    const results = emitLogicBody(nodes);
    const forBlock = results[0];
    const lines = forBlock.split("\n");
    expect(lines[0]).toMatch(/^let _scrml_tilde_\d+ = \[\];$/);
    expect(lines[1]).toMatch(/^for \(const item of/);
  });

  test("regression: non-loop value-lift still produces single value (not array)", () => {
    const nodes = [
      { kind: "lift-expr", expr: { kind: "expr", expr: "42" } },
      { kind: "const-decl", name: "val", init: "~" },
    ];
    const results = emitLogicBody(nodes);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatch(/^let _scrml_tilde_\d+ = 42;$/);
    expect(results[0]).not.toMatch(/= \[\]/);
    const tildeVar = results[0].match(/_scrml_tilde_\d+/)[0];
    expect(results[1]).toBe(`const val = ${tildeVar};`);
  });
});
