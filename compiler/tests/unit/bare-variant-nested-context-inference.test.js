/* SPDX-License-Identifier: MIT
 * S84 v0.2.4 #4.5 + #5-followon — bare-variant inference extensions.
 *
 * Two related coverage gaps in the bare-variant inference helper family
 * in `compiler/src/type-system.ts` (introduced by Bug 7 in v0.2.1 and
 * extended by Bug 5 in v0.2.4):
 *
 *   Gap A — nested struct literals in array-typed initializers.
 *     `<x>: { f: Enum }[] = [{ f: .V }, ...]`
 *     Before #4.5: `.V` was silently accepted OR fired E-VARIANT-AMBIGUOUS
 *     ("no resolvable type context"). The inline-struct annotation
 *     `{ f: Enum }` resolved to `tArray(tAsIs())` because `resolveTypeExpr`
 *     had no parser branch for inline-struct shapes — the struct's field
 *     type was lost.
 *
 *   Gap B — bare-variant inference at control-flow positions.
 *     if-stmt condition, while-stmt condition, return-stmt value,
 *     function call-arg. Before #5-followon: bare variants at these
 *     positions were silently accepted. The TS walker's case handlers
 *     for these positions did not invoke any of the three inference
 *     helpers.
 *
 * **What this dispatch ships:**
 *   - Gap A: inline-struct branch in `resolveTypeExpr` + companion walker
 *     `inferBareVariantsWithStructNav` that navigates array/struct/field
 *     type-context through nested struct literals. Bar-form enum
 *     declaration parser fix (`parseEnumBody` + `parseEnumVariantsFromRaw`)
 *     to handle `.Pending | .Success | .Failed` shape.
 *   - Gap B: wire `inferBareVariantsAtComparisonSites` into if-stmt /
 *     while-stmt condExpr. Wire `inferBareVariantsInExpr` into return-stmt
 *     value via `__enclosingFnReturnType` plumbing. Wire call-arg
 *     inference via a new helper that walks ExprNodes node-aware and
 *     dispatches per-arg type-context resolution from typed function
 *     callees.
 *
 * Spec authority:
 *   §14.10 line 7291 — "any other position where the type is fixed by
 *   the surrounding declaration" (covers Gap A's struct field within
 *   typed array AND Gap B's four control-flow positions).
 *   §34 — E-VARIANT-AMBIGUOUS + E-TYPE-063 catalog rows.
 */

import { describe, test, expect } from "bun:test";
import { runTS } from "../../src/type-system.ts";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function compile(source, filePath = "/test/app.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast } = buildAST(bs);
  const fileAST = {
    filePath,
    source,
    nodes: ast.nodes ?? [],
    machineDecls: ast.machineDecls ?? [],
    typeDecls: ast.typeDecls ?? [],
    components: ast.components ?? [],
    imports: ast.imports ?? [],
    exports: ast.exports ?? [],
    ast,
  };
  const result = runTS({
    files: [fileAST],
    protectAnalysis: { views: new Map() },
    routeMap: { functions: new Map() },
  });
  return { ast, errors: result.errors };
}

function errsByCode(errors, code) {
  return (errors ?? []).filter((e) => e?.code === code);
}

// ===========================================================================
// Gap A — nested struct literals in array-typed initializers
// ===========================================================================

describe("Gap A.1 — array-of-record positive", () => {
  test("Gap A.1.1 `<x>: { f: Enum }[] = [{ f: .V }]` (brace-form enum) — no fire", () => {
    const src = `<program>\${
      type Status:enum = { Todo, InProgress, Done }
      <cards>: { id: number, title: string, status: Status }[] = [
        { id: 1, title: "x", status: .Todo },
        { id: 2, title: "y", status: .InProgress },
        { id: 3, title: "z", status: .Done },
      ]
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("Gap A.1.2 same but bar-form enum (canonical example shape)", () => {
    // Canonical form per examples/06-kanban-board.scrml. The bar-form enum
    // declaration MUST parse correctly for `.V` to resolve against `Status`.
    const src = `<program>\${
      type Status:enum = .Todo | .InProgress | .Done
      <cards>: { id: number, status: Status }[] = [
        { id: 1, status: .Todo },
        { id: 2, status: .InProgress },
      ]
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });
});

describe("Gap A.2 — nested struct positive (multi-level navigation)", () => {
  test("Gap A.2.1 `<x>: { outer: { inner: Enum } } = { outer: { inner: .V } }` — no fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      <state>: { outer: { inner: Phase } } = { outer: { inner: .Loading } }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("Gap A.2.2 nested struct with typo fires E-TYPE-063 on the typo", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      <state>: { outer: { inner: Phase } } = { outer: { inner: .Bogus } }
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBe(1);
    expect(e063[0].message).toContain(".Bogus");
    expect(e063[0].message).toContain("Phase");
  });
});

describe("Gap A.3 — mixed-types field types untouched", () => {
  test("Gap A.3.1 `{ id: number, status: Status }[]` — number field stays untouched", () => {
    const src = `<program>\${
      type Status:enum = .Todo | .Done
      <cards>: { id: number, status: Status }[] = [
        { id: 1, status: .Todo },
        { id: 2, status: .Done },
      ]
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
    // Negative invariant: a numeric literal in the number field must not
    // trigger any bare-variant diagnostic.
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});

describe("Gap A.4 — typo in array-of-record fires E-TYPE-063", () => {
  test("Gap A.4.1 `.Bogus` inside array-of-record element", () => {
    const src = `<program>\${
      type Status:enum = .Todo | .InProgress | .Done
      <cards>: { id: number, status: Status }[] = [
        { id: 1, status: .Bogus },
        { id: 2, status: .InProgress },
      ]
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBeGreaterThanOrEqual(1);
    expect(e063.some((e) => e.message.includes(".Bogus"))).toBe(true);
    expect(e063.some((e) => e.message.includes("Status"))).toBe(true);
    // The non-typo .InProgress must NOT fire any diagnostic.
    const variantAmbiguous = errsByCode(errors, "E-VARIANT-AMBIGUOUS");
    expect(variantAmbiguous.length).toBe(0);
  });
});

describe("Gap A.5 — union-typed field preserves ambiguity diagnostic", () => {
  test("Gap A.5.1 `<x>: { f: A | B }[]` where .X exists in both — E-VARIANT-AMBIGUOUS", () => {
    const src = `<program>\${
      type A:enum = { X, Y, Z }
      type B:enum = { X, Y, W }
      <items>: { f: A | B }[] = [{ f: .X }]
    }</program>`;
    const { errors } = compile(src);
    const ambiguous = errsByCode(errors, "E-VARIANT-AMBIGUOUS");
    expect(ambiguous.length).toBe(1);
    expect(ambiguous[0].message).toContain(".X");
    // Both enum names appear in the ambiguity message.
    expect(ambiguous[0].message).toContain("A");
    expect(ambiguous[0].message).toContain("B");
  });
});

// ===========================================================================
// Gap B — control-flow positions (if-cond, while-cond, return-stmt, call-arg)
// ===========================================================================

describe("Gap B.1 — if-stmt condition", () => {
  test("Gap B.1.1 `if (@phase == .V) {...}` with engine-declared cell — no fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      <phase>: Phase = .Idle
      function check() {
        if (@phase == .Loading) { return 1 }
        return 0
      }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("Gap B.1.2 `if (.V == @phase)` (symmetric) — no fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      <phase>: Phase = .Idle
      function check() {
        if (.Loading == @phase) { return 1 }
        return 0
      }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("Gap B.1.3 `if (@phase == .Bogus)` fires E-TYPE-063 on the typo", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      <phase>: Phase = .Idle
      function check() {
        if (@phase == .Bogus) { return 1 }
        return 0
      }
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBeGreaterThanOrEqual(1);
    expect(e063.some((e) => e.message.includes(".Bogus"))).toBe(true);
  });
});

describe("Gap B.2 — while-stmt condition", () => {
  test("Gap B.2.1 `while (@flag != .Done) {...}` — no fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Working, Done }
      <flag>: Phase = .Idle
      function loop() {
        while (@flag != .Done) {
          @flag = .Working
        }
      }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("Gap B.2.2 `while (@flag != .Bogus)` fires E-TYPE-063", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Working, Done }
      <flag>: Phase = .Idle
      function loop() {
        while (@flag != .Bogus) {
          @flag = .Working
        }
      }
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.some((e) => e.message.includes(".Bogus"))).toBe(true);
  });
});

describe("Gap B.3 — return-stmt value", () => {
  test("Gap B.3.1 `function f() -> Phase { return .V }` — no fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      function start() -> Phase { return .Loading }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("Gap B.3.2 `function f() -> Phase { return .Bogus }` fires E-TYPE-063", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      function start() -> Phase { return .Bogus }
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.some((e) => e.message.includes(".Bogus"))).toBe(true);
  });
});

describe("Gap B.4 — function call-arg", () => {
  test("Gap B.4.1 `applyState(.V)` with `fn applyState(s: Phase)` — no fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      function applyState(s: Phase) -> number { return 1 }
      function main() { applyState(.Loading) }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("Gap B.4.2 `applyState(.Bogus)` fires E-TYPE-063 on the typo", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Ready }
      function applyState(s: Phase) -> number { return 1 }
      function main() { applyState(.Bogus) }
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.some((e) => e.message.includes(".Bogus"))).toBe(true);
  });
});

// ===========================================================================
// End-to-end: examples/06-kanban-board.scrml compiles cleanly
// (acceptance criterion from brief)
// ===========================================================================

describe("Gap A end-to-end — examples/06-kanban-board.scrml", () => {
  test("kanban file compiles with zero E-VARIANT-AMBIGUOUS", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const file = path.resolve("./examples/06-kanban-board.scrml");
    if (!fs.existsSync(file)) {
      // Skip when running from an unexpected CWD (e.g. inside a worktree).
      return;
    }
    const source = fs.readFileSync(file, "utf8");
    const { errors } = compile(source, file);
    const ambiguous = errsByCode(errors, "E-VARIANT-AMBIGUOUS");
    expect(ambiguous.length).toBe(0);
    // E-TYPE-063 must also stay at zero — every bare variant in the file
    // resolves to a real variant of the enum it references.
    const typeMismatch = errsByCode(errors, "E-TYPE-063");
    expect(typeMismatch.length).toBe(0);
  });
});
