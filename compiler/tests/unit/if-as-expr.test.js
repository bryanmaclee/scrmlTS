import { describe, it, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { writeFileSync, readFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

/**
 * If-as-expression: `const a = if (cond) { lift val }`
 * The `if` in expression position produces a value via `lift` and `~`.
 */
describe("if-as-expression", () => {
  const tmp = join(tmpdir(), `scrml-if-expr-${Date.now()}`);

  function compileAndRead(src) {
    mkdirSync(tmp, { recursive: true });
    const srcFile = join(tmp, "test.scrml");
    writeFileSync(srcFile, src);
    const outDir = join(tmp, "dist");
    mkdirSync(outDir, { recursive: true });
    const result = compileScrml({ inputFiles: [srcFile], outputDir: outDir });
    const clientJs = readFileSync(join(outDir, "test.client.js"), "utf8");
    rmSync(tmp, { recursive: true, force: true });
    return { result, clientJs };
  }

  it("const a = if (true) { lift 42 } produces valid JS", () => {
    const src = [
      '<program>',
      '${',
      '  const a = if (true) { lift 42 }',
      '  const b = ~',
      '}',
      '</program>',
    ].join('\n');
    const { result, clientJs } = compileAndRead(src);
    expect(result.errors || []).toHaveLength(0);
    // Should contain a tilde variable assignment
    expect(clientJs).toContain('= 42');
    // Should declare `a`
    expect(clientJs).toContain('const a');
    // No raw `lift` keyword in output
    expect(clientJs).not.toContain('lift 42');
  });

  it("const a = if (cond) { lift val } else { lift other } produces valid JS", () => {
    const src = [
      '<program>',
      '${',
      '  let cond = true',
      '  const a = if (cond) { lift "yes" } else { lift "no" }',
      '}',
      '</program>',
    ].join('\n');
    const { result, clientJs } = compileAndRead(src);
    expect(result.errors || []).toHaveLength(0);
    expect(clientJs).toContain('const a');
    expect(clientJs).toContain('"yes"');
    expect(clientJs).toContain('"no"');
  });

  it("let a = if (cond) { lift val } works with let", () => {
    const src = [
      '<program>',
      '${',
      '  let cond = true',
      '  let a = if (cond) { lift 99 }',
      '}',
      '</program>',
    ].join('\n');
    const { result, clientJs } = compileAndRead(src);
    expect(result.errors || []).toHaveLength(0);
    expect(clientJs).toContain('let a');
  });

  it("if as statement (not after =) still works as if-stmt", () => {
    const src = [
      '<program>',
      '${',
      '  let x = 0',
      '  if (true) { x = 1 }',
      '}',
      '</program>',
    ].join('\n');
    const { result, clientJs } = compileAndRead(src);
    expect(result.errors || []).toHaveLength(0);
    // Should be a normal if statement, not an IIFE
    expect(clientJs).toMatch(/if\s*\(\s*\(?\s*true\s*\)?\s*\)/);
    expect(clientJs).toContain('x = 1');
  });

  it("output passes node --check", () => {
    const src = [
      '<program>',
      '${',
      '  let cond = true',
      '  const a = if (cond) { lift 42 } else { lift 0 }',
      '  let b = if (cond) { lift "hello" }',
      '}',
      '</program>',
    ].join('\n');
    mkdirSync(tmp, { recursive: true });
    const srcFile = join(tmp, "test.scrml");
    writeFileSync(srcFile, src);
    const outDir = join(tmp, "dist");
    mkdirSync(outDir, { recursive: true });
    compileScrml({ inputFiles: [srcFile], outputDir: outDir });
    const clientJs = readFileSync(join(outDir, "test.client.js"), "utf8");
    rmSync(tmp, { recursive: true, force: true });

    // Verify it's syntactically valid JS
    // eslint-disable-next-line no-new-func
    expect(() => new Function(clientJs)).not.toThrow();
  });
});
