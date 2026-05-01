/**
 * F-AUTH-002 W5: ast-builder export-decl recognizes pure/server modifiers.
 *
 * Pre-fix behavior (the bug):
 *   `export server function NAME(...)` was parsed as an export-decl with
 *   raw="export server" (collectExpr stopped at `function` because
 *   STMT_KEYWORDS includes both `function` and `server`, and parts.length>0
 *   triggered the statement-boundary guard once `server` was consumed). The
 *   exportedName was null and the export registry lost the function name.
 *   Cross-file imports of `getUser` then failed with E-IMPORT-004.
 *
 *   The same was true for `export server fn`, `export pure function`,
 *   `export pure fn`, and `export pure server function|fn`.
 *
 * Post-fix behavior:
 *   The EXPORT branch of parseLogicBody peek-and-consumes optional
 *   modifier tokens (`pure`, `server`, `pure server`) BEFORE collectExpr.
 *   The export-decl carries `isPure: boolean` and `isServer: boolean`
 *   flags. exportedName + exportKind are now populated correctly.
 *
 * Spec contract: SPEC §21.5.1 (Modifier-Carrying Exports).
 *
 * NOTE on cross-file ?{} resolution: SPEC §44.7.1 (module-with-db-context)
 * defines the contract for `export server function` containing `?{}` blocks
 * inside pure-fn files. The full cross-file emission lifecycle (auto-detect
 * library mode for pure-fn files; cross-file fetch-stub generation) is
 * scheduled for W5-FOLLOW dispatches and is NOT covered here. This test
 * suite covers ONLY the parser-level export-modifier registration fix.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function parseExport(src) {
  const filePath = "/test/fixture.scrml";
  const bs = splitBlocks(filePath, src);
  const result = buildAST(bs);
  const exports = result.ast?.exports ?? [];
  return exports[0];
}

describe("F-AUTH-002 — export-decl modifier handling", () => {
  test("export function NAME records exportedName + kind=function", () => {
    const exp = parseExport("${ export function getUser(id) { return id } }");
    expect(exp).toBeDefined();
    expect(exp.exportedName).toBe("getUser");
    expect(exp.exportKind).toBe("function");
    expect(exp.isPure).toBe(false);
    expect(exp.isServer).toBe(false);
  });

  test("export fn NAME records exportedName + kind=fn", () => {
    const exp = parseExport("${ export fn double(n) { return n * 2 } }");
    expect(exp).toBeDefined();
    expect(exp.exportedName).toBe("double");
    expect(exp.exportKind).toBe("fn");
    expect(exp.isPure).toBe(false);
    expect(exp.isServer).toBe(false);
  });

  test("export server function NAME records exportedName + isServer", () => {
    const src = "${ export server function getUser(id) { return id } }";
    const exp = parseExport(src);
    expect(exp).toBeDefined();
    expect(exp.exportedName).toBe("getUser");
    expect(exp.exportKind).toBe("function");
    expect(exp.isServer).toBe(true);
    expect(exp.isPure).toBe(false);
  });

  test("export server fn NAME records exportedName + isServer", () => {
    const src = "${ export server fn fetchOne() { return 1 } }";
    const exp = parseExport(src);
    expect(exp).toBeDefined();
    expect(exp.exportedName).toBe("fetchOne");
    expect(exp.exportKind).toBe("fn");
    expect(exp.isServer).toBe(true);
    expect(exp.isPure).toBe(false);
  });

  test("export pure function NAME records exportedName + isPure", () => {
    const src = "${ export pure function clamp(x) { return x } }";
    const exp = parseExport(src);
    expect(exp).toBeDefined();
    expect(exp.exportedName).toBe("clamp");
    expect(exp.exportKind).toBe("function");
    expect(exp.isPure).toBe(true);
    expect(exp.isServer).toBe(false);
  });

  test("export pure fn NAME records exportedName + isPure", () => {
    const src = "${ export pure fn add(a, b) { return a + b } }";
    const exp = parseExport(src);
    expect(exp).toBeDefined();
    expect(exp.exportedName).toBe("add");
    expect(exp.exportKind).toBe("fn");
    expect(exp.isPure).toBe(true);
    expect(exp.isServer).toBe(false);
  });

  test("export pure server function NAME records both flags", () => {
    const src = "${ export pure server function calc(x) { return x } }";
    const exp = parseExport(src);
    expect(exp).toBeDefined();
    expect(exp.exportedName).toBe("calc");
    expect(exp.exportKind).toBe("function");
    expect(exp.isPure).toBe(true);
    expect(exp.isServer).toBe(true);
  });

  test("export pure server fn NAME records both flags", () => {
    const src = "${ export pure server fn ping() { return 'pong' } }";
    const exp = parseExport(src);
    expect(exp).toBeDefined();
    expect(exp.exportedName).toBe("ping");
    expect(exp.exportKind).toBe("fn");
    expect(exp.isPure).toBe(true);
    expect(exp.isServer).toBe(true);
  });

  test("export const preserves isPure/isServer = false defaults", () => {
    const exp = parseExport("${ export const MAX = 100 }");
    expect(exp).toBeDefined();
    expect(exp.exportedName).toBe("MAX");
    expect(exp.exportKind).toBe("const");
    expect(exp.isPure).toBe(false);
    expect(exp.isServer).toBe(false);
  });

  test("export type preserves isPure/isServer = false defaults", () => {
    const exp = parseExport("${ export type Status:enum = { Active, Off } }");
    expect(exp).toBeDefined();
    expect(exp.exportedName).toBe("Status");
    expect(exp.exportKind).toBe("type");
    expect(exp.isPure).toBe(false);
    expect(exp.isServer).toBe(false);
  });

  test("re-export preserves isPure/isServer = false defaults", () => {
    const exp = parseExport(`\${ export { Status } from './types.scrml' }`);
    expect(exp).toBeDefined();
    expect(exp.exportedName).toBe("Status");
    expect(exp.exportKind).toBe("re-export");
    expect(exp.isPure).toBe(false);
    expect(exp.isServer).toBe(false);
  });

  test("export server function captures full body in raw text", () => {
    // F-AUTH-002 root cause: prior to this fix the raw was just "export server"
    // and the function body fell out of the export-decl span. The downstream
    // function-decl handler then created a function-decl with isServer=false
    // (because `server` had already been consumed by collectExpr). Verify the
    // raw now spans the full declaration.
    const src = `\${
      export server function getUser(userId) {
        return ?{\`SELECT * FROM users WHERE id = \${userId}\`}.get()
      }
    }`;
    const exp = parseExport(src);
    expect(exp).toBeDefined();
    expect(exp.raw).toContain("export server function");
    expect(exp.raw).toContain("getUser");
    expect(exp.raw).toContain("SELECT");
    expect(exp.exportedName).toBe("getUser");
    expect(exp.isServer).toBe(true);
  });

  test("module-resolver registers server function exports correctly", async () => {
    // Verify the export-decl produces a valid entry in the module export
    // registry (downstream of TAB). Pre-fix, exportedName was null and the
    // entry was unrecognized.
    const src = `\${
      export server function getUser(userId) { return userId }
    }`;
    const filePath = "/test/auth.scrml";
    const bs = splitBlocks(filePath, src);
    const ast = buildAST(bs);

    const { resolveModules } = await import("../../src/module-resolver.js");
    const resolved = resolveModules([ast]);

    const exports = resolved.exportRegistry.get(filePath);
    expect(exports).toBeDefined();
    expect(exports.has("getUser")).toBe(true);
    const entry = exports.get("getUser");
    expect(entry.kind).toBe("function");
  });
});
