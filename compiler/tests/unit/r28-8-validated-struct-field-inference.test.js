/* SPDX-License-Identifier: MIT
 * R28-8 (§14.10) — bare-variant inference into VALIDATED named-:struct fields.
 *
 * The struct-body resolver (`parseStructBody` → `resolveTypeExpr`) lowers a
 * `:struct` field carrying a trailing validator (`category: Category req`) to
 * `asIs` — the trailing `req` / `length(...)` / etc. defeats every typed branch
 * of `resolveTypeExpr` and the registry lookup. The bare-variant inference
 * walker (`inferBareVariantsWithStructNav`) then read that `asIs` as the field
 * type and, finding no enum context, fired E-VARIANT-AMBIGUOUS on `.News`.
 *
 * Plain (un-validated) enum fields already resolved (S84 v0.2.4 #4.5). The gap
 * was specific to a TRAILING VALIDATOR on the field.
 *
 * The fix is LOCALIZED (R28-8 Phase-0 survey chose approach B): the field's
 * true enum / enum-subset base is recovered from the raw clause and stashed on
 * an `AsIsType.bareVariantBase` sidecar at resolution time; the inference walker
 * substitutes it (`refineFieldTypeForBareVariant`) WITHOUT changing the `asIs`
 * kind that formFor / schemaFor / tableFor / type-encoding read. The root
 * resolver is intentionally NOT changed (it regresses those consumers).
 *
 * Spec authority: §14.10 catch-all — "any other position where the type is
 * fixed by the surrounding declaration" — covers the object-literal field whose
 * named struct type is statically known. No SPEC amendment needed.
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
// 1 — validated enum field (`Category req`) resolves the bare variant
// ===========================================================================

describe("R28-8.1 — validated enum field bare-variant resolves", () => {
  test("`category: Category req` + `{ category: .News }` — no E-VARIANT-AMBIGUOUS", () => {
    const src = `<program>\${
      type Category:enum = { News, Opinion, Tech, Culture }
      type Article:struct = { id: number, category: Category req }
      <draft>: Article = { id: 0, category: .News }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("`length(...)` validator (not just `req`) also resolves", () => {
    const src = `<program>\${
      type Category:enum = { News, Opinion, Tech }
      type Article:struct = { id: number, category: Category req }
      type Tag:enum = { Hot, Cold }
      type Item:struct = { title: string req length(>=2), tag: Tag req }
      <it>: Item = { title: "xy", tag: .Hot }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });
});

// ===========================================================================
// 2 — typo in a validated enum field fires E-TYPE-063 (real inference)
// ===========================================================================

describe("R28-8.2 — typo names the enum (E-TYPE-063, not E-VARIANT-AMBIGUOUS)", () => {
  test("`{ category: .Newz }` fires E-TYPE-063 naming `Category`", () => {
    const src = `<program>\${
      type Category:enum = { News, Opinion, Tech, Culture }
      type Article:struct = { id: number, category: Category req }
      <draft>: Article = { id: 0, category: .Newz }
    }</program>`;
    const { errors } = compile(src);
    // The diagnostic must be E-TYPE-063 (proves real inference, not a silent
    // skip), and it must name the enum so the writer can find the typo.
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBe(1);
    expect(e063[0].message).toContain(".Newz");
    expect(e063[0].message).toContain("Category");
    // It must NOT be the no-context E-VARIANT-AMBIGUOUS.
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});

// ===========================================================================
// 3 — enum-SUBSET validated field resolves against the SUBSET (not the base)
// ===========================================================================

describe("R28-8.3 — subset-refined validated field resolves against the subset", () => {
  test("in-subset variant `{ role: .Admin }` — no fire", () => {
    const src = `<program>\${
      type Role:enum = { Admin, Editor, Viewer }
      type Member:struct = { id: number, role: Role oneOf([.Admin, .Editor]) req }
      <m>: Member = { id: 0, role: .Admin }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
    expect(errsByCode(errors, "E-CONTRACT-001").length).toBe(0);
  });

  test("out-of-subset variant `{ role: .Viewer }` — fires E-CONTRACT-001 (subset, not base)", () => {
    const src = `<program>\${
      type Role:enum = { Admin, Editor, Viewer }
      type Member:struct = { id: number, role: Role oneOf([.Admin, .Editor]) req }
      <m>: Member = { id: 0, role: .Viewer }
    }</program>`;
    const { errors } = compile(src);
    // `.Viewer` IS a real Role variant, so NOT E-TYPE-063; it is EXCLUDED by the
    // subset, so the subset-aware static check fires E-CONTRACT-001. This proves
    // the recovery kept the SUBSET PredicatedType, not the bare base enum.
    const eContract = errsByCode(errors, "E-CONTRACT-001");
    expect(eContract.length).toBe(1);
    expect(eContract[0].message).toContain(".Viewer");
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});

// ===========================================================================
// 4 — control: plain (un-validated) enum field still works (no regression)
// ===========================================================================

describe("R28-8.4 — control: plain enum field unchanged", () => {
  test("`category: Category` (no validator) + `{ category: .News }` — no fire", () => {
    const src = `<program>\${
      type Category:enum = { News, Opinion, Tech, Culture }
      type Article:struct = { id: number, category: Category }
      <draft>: Article = { id: 0, category: .News }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("plain enum field with a typo still fires E-TYPE-063", () => {
    const src = `<program>\${
      type Category:enum = { News, Opinion, Tech, Culture }
      type Article:struct = { id: number, category: Category }
      <draft>: Article = { id: 0, category: .Nope }
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBe(1);
    expect(e063[0].message).toContain("Category");
  });
});

// ===========================================================================
// 5 — nullable validated enum field (`Category req | not`) resolves
// ===========================================================================

describe("R28-8.5 — nullable validated enum field resolves the bare variant", () => {
  test("`category: Category req | not` + `{ category: .News }` — no fire", () => {
    const src = `<program>\${
      type Category:enum = { News, Opinion, Tech, Culture }
      type Article:struct = { id: number, category: Category req | not }
      <draft>: Article = { id: 0, category: .News }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("nullable validated field still admits `not` as the absence value", () => {
    const src = `<program>\${
      type Category:enum = { News, Opinion, Tech }
      type Article:struct = { id: number, category: Category req | not }
      <draft>: Article = { id: 0, category: not }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("nullable validated field typo still fires E-TYPE-063", () => {
    const src = `<program>\${
      type Category:enum = { News, Opinion, Tech }
      type Article:struct = { id: number, category: Category req | not }
      <draft>: Article = { id: 0, category: .Bogus }
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBe(1);
    expect(e063[0].message).toContain("Category");
  });
});

// ===========================================================================
// 6 — negative: a stray variant in a PRIMITIVE validated field still fails
//     (the sidecar is only attached for enum bases — no false context)
// ===========================================================================

describe("R28-8.6 — primitive validated field does NOT host a bare variant", () => {
  test("`title: string req` + `{ title: .News }` still fires (no spurious context)", () => {
    const src = `<program>\${
      type Category:enum = { News, Opinion, Tech }
      type Article:struct = { id: number, title: string req }
      <draft>: Article = { id: 0, title: .News }
    }</program>`;
    const { errors } = compile(src);
    // A bare variant in a string-typed field has no enum context — it must
    // still be rejected (the recovery only attaches enum bases). Accept either
    // the no-context E-VARIANT-AMBIGUOUS or a type-mismatch — the invariant is
    // that it is NOT silently accepted.
    const rejected =
      errsByCode(errors, "E-VARIANT-AMBIGUOUS").length +
      errsByCode(errors, "E-TYPE-063").length +
      errsByCode(errors, "E-TYPE-031").length;
    expect(rejected).toBeGreaterThan(0);
  });
});
