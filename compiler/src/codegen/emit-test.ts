/**
 * @module codegen/emit-test
 *
 * Generates bun:test output from TestGroup[] IR nodes collected from ~{} blocks.
 *
 * Output format:
 *   import { test, expect, describe, beforeEach } from "bun:test";
 *   describe("filename.scrml", () => {
 *     describe("groupName (line N)", () => {
 *       let scopeVar = initValue;
 *       beforeEach(() => { scopeVar = initValue; });
 *       test("caseName", () => {
 *         expect(lhs).toEqual(rhs);
 *       });
 *     });
 *   });
 *
 * Called by the CG orchestrator (index.ts) when testMode is enabled.
 * Returns null when no test groups exist (no ~{} blocks in source file).
 *
 * Assert compilation table:
 *   assert expr       → expect(expr).toBeTruthy()
 *   assert a == b     → expect(a).toEqual(b)
 *   assert a != b     → expect(a).not.toEqual(b)
 *   assert a > b      → expect(a).toBeGreaterThan(b)
 *   assert a >= b     → expect(a).toBeGreaterThanOrEqual(b)
 *   assert a < b      → expect(a).toBeLessThan(b)
 *   assert a <= b     → expect(a).toBeLessThanOrEqual(b)
 */

import { basename } from "path";
import type { TestGroup, AssertStmt } from "./ir.ts";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * A scope variable snapshot entry for beforeEach resets.
 *
 * Each entry corresponds to a variable declared in the surrounding scrml scope
 * that the test body may read or mutate. Emitted as `let name = initValue;`
 * declarations with a `beforeEach` reset block.
 */
export interface ScopeVarEntry {
  /** JavaScript identifier name (already encoded for the compiled output). */
  name: string;
  /** Initialization expression string (e.g., "0", '""', "false"). */
  initValue: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Map a scrml assert operator to the bun:test expect() method call.
 *
 * @param lhs — left-hand side expression string
 * @param op  — comparison operator from AssertStmt.op
 * @param rhs — right-hand side expression string
 * @returns   — a complete `expect(lhs).method(rhs)` call string
 */
function assertOpToExpect(lhs: string, op: string, rhs: string): string {
  switch (op) {
    case "==":  return `expect(${lhs}).toEqual(${rhs})`;
    case "!=":  return `expect(${lhs}).not.toEqual(${rhs})`;
    case ">":   return `expect(${lhs}).toBeGreaterThan(${rhs})`;
    case ">=":  return `expect(${lhs}).toBeGreaterThanOrEqual(${rhs})`;
    case "<":   return `expect(${lhs}).toBeLessThan(${rhs})`;
    case "<=":  return `expect(${lhs}).toBeLessThanOrEqual(${rhs})`;
    default:    return `expect(${lhs}).toEqual(${rhs})`;
  }
}

/**
 * Emit a single AssertStmt as a bun:test expect() call.
 *
 * @param stmt   — parsed assert statement from parseTestBody
 * @param indent — indentation string to prefix
 * @returns      — one line of JS (without trailing newline)
 */
function emitAssert(stmt: AssertStmt, indent: string): string {
  if (stmt.op !== null && stmt.lhs !== null && stmt.rhs !== null) {
    return `${indent}${assertOpToExpect(stmt.lhs, stmt.op, stmt.rhs)};`;
  }
  // Bare assert: assert expr → expect(expr).toBeTruthy()
  return `${indent}expect(${stmt.raw}).toBeTruthy();`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a bun:test JS file from TestGroup[] IR nodes.
 *
 * Produces a string of JavaScript that can be written as `<base>.test.js`
 * and run directly with `bun test`. The generated file uses describe/test/expect
 * from bun:test and needs no additional dependencies.
 *
 * @param filePath      — source .scrml file path (used for the outer describe label)
 * @param testGroups    — test groups collected from ~{} AST nodes during the analysis pass
 * @param scopeSnapshot — scope variables to declare and reset in beforeEach (optional)
 * @returns             — JS string, or null if testGroups is empty
 */
export function generateTestJs(
  filePath: string,
  testGroups: TestGroup[],
  scopeSnapshot: ScopeVarEntry[] = [],
): string | null {
  if (testGroups.length === 0) return null;

  const fileName = basename(filePath);
  const lines: string[] = [];

  // Imports — only import what is used
  const needsBeforeEach = testGroups.some(
    (g) => (g.before !== null && g.before.length > 0) || scopeSnapshot.length > 0
  );
  const importParts = ["test", "expect", "describe"];
  if (needsBeforeEach) importParts.push("beforeEach");
  lines.push(`import { ${importParts.join(", ")} } from "bun:test";`);
  lines.push(``);

  // Outer describe block — labelled with the source file name
  lines.push(`describe(${JSON.stringify(fileName)}, () => {`);

  for (const group of testGroups) {
    const groupLabel = group.name
      ? `${group.name} (line ${group.line})`
      : `(line ${group.line})`;

    lines.push(`  describe(${JSON.stringify(groupLabel)}, () => {`);

    // Scope variable declarations (let) — declared at describe scope for beforeEach access
    for (const v of scopeSnapshot) {
      lines.push(`    let ${v.name} = ${v.initValue};`);
    }

    // beforeEach block — present when scope vars need reset or a before{} block exists
    const hasBeforeEach = scopeSnapshot.length > 0 || (group.before !== null && group.before.length > 0);
    if (hasBeforeEach) {
      lines.push(`    beforeEach(() => {`);
      // Reset scope variables first
      for (const v of scopeSnapshot) {
        lines.push(`      ${v.name} = ${v.initValue};`);
      }
      // Then run before{} statements
      if (group.before !== null) {
        for (const stmt of group.before) {
          if (stmt) lines.push(`      ${stmt}`);
        }
      }
      lines.push(`    });`);
    }

    // Emit each test case
    for (const testCase of group.tests) {
      const caseName = testCase.name || "(anonymous)";
      lines.push(`    test(${JSON.stringify(caseName)}, () => {`);

      // Emit non-assert body statements first (setup code)
      for (const stmt of testCase.body) {
        if (!stmt.startsWith("assert ")) {
          lines.push(`      ${stmt}`);
        }
      }

      // Emit assert statements
      for (const assertStmt of testCase.asserts) {
        lines.push(emitAssert(assertStmt, "      "));
      }

      lines.push(`    });`);
    }

    lines.push(`  });`);
  }

  lines.push(`});`);
  lines.push(``); // trailing newline

  return lines.join("\n");
}
