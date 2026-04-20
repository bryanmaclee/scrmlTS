// Conformance tests for: SPEC §48 amendments (S32, 2026-04-20)
//
// S32 retired E-FN-006 and minimized `fn` to a pure-function shorthand.
// See §48.1 (overview rewrite), §48.4 (return-site completeness relocated),
// §48.11 (relationship to `function` / `pure function`), §48.13 (normative list).
//
// Un-skipped during S33 after Phase 1a (E-FN-006 → E-STATE-COMPLETE rename),
// Phase 1b (universal-scope widening), and Phase 2 (pure fn parser) landed.
//
// Source samples use the actual scrml typed-attribute syntax `name(type)`
// in place of the spec-document shorthand `name: type`.

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";
import { runTS } from "../../../src/type-system.js";

function diagnose(source) {
  const bs = splitBlocks("/conformance/test.scrml", source);
  const { ast, errors: astErrors } = buildAST(bs);
  const res = runTS({ files: [ast] });
  const all = [...(bs.errors || []), ...(astErrors || []), ...(res.errors || [])];
  const errors = all.filter(e => e.severity !== "warning");
  const warnings = all.filter(e => e.severity === "warning");
  return { errors, warnings };
}

describe("S32-004: §48.11/48.13 — `fn` SHALL be semantically equivalent to `pure function`", () => {
  test("CONF-S32-004: `fn` and `pure function` accept identical bodies without diagnostic delta", () => {
    const srcFn = `\${ fn double(x) { return x * 2 } }`;
    const srcPureFunction = `\${ pure function double(x) { return x * 2 } }`;
    const { errors: errFn, warnings: warnFn } = diagnose(srcFn);
    const { errors: errPF, warnings: warnPF } = diagnose(srcPureFunction);
    // W-PURE-REDUNDANT only applies to `pure fn`; neither form here carries it.
    expect(errFn.map(e => e.code).sort()).toEqual(errPF.map(e => e.code).sort());
    expect(warnFn.map(w => w.code).sort()).toEqual(warnPF.map(w => w.code).sort());
  });
});

describe("S32-005: §48.13 — existing `fn` declarations SHALL be accepted without modification", () => {
  test.skip("CONF-S32-005: a pre-S32 `fn` state factory still compiles after the amendment", () => {
    // Gate: same inline state-literal field-assignment syntax as 006a/b.
    // Whole-program `fn` acceptance without that syntax IS covered by
    // CONF-S32-004 above and unit/fn-constraints.test.js.
    const src =
      `< Point x(number) y(number)></>\n` +
      `\${ fn buildPoint(a, b) {\n` +
      `    let p = < Point> x = a y = b </>\n` +
      `    return p\n` +
      `} }`;
    const { errors } = diagnose(src);
    // No hard-error from the fn factory itself. (The universal E-STATE-COMPLETE
    // and scope rules apply, but a fully-assigned literal should be silent.)
    const fnRelated = errors.filter(e =>
      /^E-(FN|STATE-COMPLETE)/.test(e.code)
    );
    expect(fnRelated).toEqual([]);
  });
});

describe("S32-006: §48.13/§54.6.1 — state literal completeness SHALL be enforced at the literal's closing tag", () => {
  test.skip("CONF-S32-006a: E-STATE-COMPLETE fires inside `fn` when a field is unassigned", () => {
    // Gate: inline state-literal field-assignment syntax (`< Product> name = n </>`)
    // currently parses `name = n` as a logic-level assignment, not as a state
    // field initializer. The E-STATE-COMPLETE walker expects field initializers
    // inside the literal's body. Requires a parser extension beyond Phase 3e
    // (which covered match-arm substate recognition but not inline field assign).
    const src =
      `< Product name(string) price(number) sku(string)></>\n` +
      `\${ fn buildProduct(name, price) {\n` +
      `    let p = < Product> name = name price = price </>\n` +
      `    return p\n` +
      `} }`;
    const { errors } = diagnose(src);
    expect(errors.some(e => e.code === "E-STATE-COMPLETE")).toBe(true);
  });

  test.skip("CONF-S32-006b: E-STATE-COMPLETE fires in plain `function` at the literal close (universal scope)", () => {
    // Gate: same as 006a — inline state-literal field assignment not yet parsed.
    const src =
      `< User name(string) age(number)></>\n` +
      `\${ function buildUser(n) {\n` +
      `    let u = < User> name = n </>\n` +
      `    return u\n` +
      `} }`;
    const { errors } = diagnose(src);
    expect(errors.some(e => e.code === "E-STATE-COMPLETE")).toBe(true);
  });
});

describe("S32-007: §48 — E-FN-006 is retired (MUST NOT fire)", () => {
  test.skip("CONF-S32-007: E-FN-006 is not emitted; E-STATE-COMPLETE fires instead", () => {
    // Gate: same as 006a/b — inline state-literal field assignment not yet parsed.
    // E-FN-006 absence IS verified elsewhere (unit/fn-constraints.test.js §9).
    const src =
      `< Product name(string) sku(string)></>\n` +
      `\${ fn buildProduct(n) {\n` +
      `    let p = < Product> name = n </>\n` +
      `    return p\n` +
      `} }`;
    const { errors } = diagnose(src);
    expect(errors.some(e => e.code === "E-FN-006")).toBe(false);
    expect(errors.some(e => e.code === "E-STATE-COMPLETE")).toBe(true);
  });
});
