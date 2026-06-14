// ---------------------------------------------------------------------------
// Class C — `ref=@name` element-ref binding SYM registration
// (sym-cell-registration-completeness-2026-06-13, REGISTER ruling S192)
// ---------------------------------------------------------------------------
//
// A `ref=@name` attribute on a markup element binds the runtime DOM element to
// a reactive cell (codegen emit-bindings.ts emits `_scrml_reactive_set(name,
// querySelector(...))`). Pre-fix, the ref name was never registered into SYM
// `stateCells`, so `lookupStateCell(@name)` returned null. PASS 1.d now
// registers a lightweight resolvable record (`_cellKind: "ref"`).
//
// These are SYM-registration-only tests; codegen byte-identity is asserted
// separately (the change touches no emit-* module).

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runSYM, lookupStateCell } from "../../src/symbol-table.ts";

function buildScope(source) {
  const bs = splitBlocks("ref-test.scrml", source);
  const { ast } = buildAST(bs);
  runSYM({ filePath: "ref-test.scrml", ast });
  return ast._scope;
}

describe("Class C — ref=@name registers a resolvable SYM cell", () => {
  test("a plain `<canvas ref=@c>` makes `@c` resolve", () => {
    const scope = buildScope(`<page>\n<canvas ref=@c width="100"></canvas>\n<p>\${@c}</p>\n</page>`);
    const rec = lookupStateCell(scope, "c");
    expect(rec).not.toBeNull();
    expect(rec.name).toBe("c");
    expect(rec._cellKind).toBe("ref");
  });

  test("a `<div ref=@box>` resolves at file scope", () => {
    const scope = buildScope(`<page>\n<div ref=@box>box</div>\n</page>`);
    expect(lookupStateCell(scope, "box")).not.toBeNull();
  });

  test("a `ref=@cardEl` inside a `\${ for ... lift }` render-site resolves", () => {
    const scope = buildScope(
      `<page>\n<div ref=@todoColumn>\n  \${ for (let x of @cards) {\n    lift <div ref=@cardEl>\${x}</div>\n  }}\n</div>\n</page>`,
    );
    expect(lookupStateCell(scope, "todoColumn")).not.toBeNull();
    expect(lookupStateCell(scope, "cardEl")).not.toBeNull();
    expect(lookupStateCell(scope, "cardEl")._cellKind).toBe("ref");
  });

  test("dev-intent wins: a real `<c>` state-decl keeps the slot over a `ref=@c`", () => {
    const scope = buildScope(`<c> = 0\n<page>\n<canvas ref=@c></canvas>\n</page>`);
    const rec = lookupStateCell(scope, "c");
    expect(rec).not.toBeNull();
    // The structural decl owns it — NOT the synth ref record.
    expect(rec._cellKind).not.toBe("ref");
    expect(rec.structuralForm).toBe(true);
  });

  test("two elements sharing `ref=@row` register once (first-writer-wins)", () => {
    const scope = buildScope(
      `<page>\n<div ref=@row>a</div>\n<div ref=@row>b</div>\n</page>`,
    );
    const rec = lookupStateCell(scope, "row");
    expect(rec).not.toBeNull();
    expect(rec._cellKind).toBe("ref");
  });

  test("a non-ref `@name` is unaffected (no spurious registration)", () => {
    const scope = buildScope(`<page>\n<canvas ref=@c></canvas>\n</page>`);
    // `notARef` was never a ref nor a decl — stays unresolved.
    expect(lookupStateCell(scope, "notARef")).toBeNull();
  });
});
