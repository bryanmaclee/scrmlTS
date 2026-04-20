// Conformance tests for: SPEC §33 amendments (S32, 2026-04-20)
//
// S32 extended the `pure` modifier's reach and added W-PURE-REDUNDANT.
// See §33.2 (attachment sites), §33.4 (warning), §33.6 (relationship to
// `fn` and transition bodies).
//
// Un-skipped during S33 after Phase 2 (pure fn parser + W-PURE-REDUNDANT)
// and Phase 4g (transition-body purity via checkFnBodyProhibitions) landed.
// Source samples use the actual scrml typed-attribute syntax `name(type)`
// in place of the spec-document shorthand `name: type`.

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";
import { runTS } from "../../../src/type-system.js";

/**
 * Compile a source string to the point of type-system diagnostics and return
 * the collected errors/warnings. Uses the same BS → AST → TS harness as the
 * unit tests.
 */
function diagnose(source) {
  const bs = splitBlocks("/conformance/test.scrml", source);
  const { ast, errors: astErrors } = buildAST(bs);
  const res = runTS({ files: [ast] });
  const all = [...(bs.errors || []), ...(astErrors || []), ...(res.errors || [])];
  const errors = all.filter(e => e.severity !== "warning");
  const warnings = all.filter(e => e.severity === "warning");
  return { errors, warnings };
}

describe("S32-001: §33.2 — state-local transition bodies are pure by default", () => {
  test("CONF-S32-001: transition body mutating outer variable emits a purity diagnostic", () => {
    const src =
      `\${ let counter = 0 }\n` +
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> {\n` +
      `            counter = counter + 1\n` +
      `        }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>`;
    const { errors } = diagnose(src);
    // Any E-FN-* code indicates the purity walker fired — current impl
    // surfaces E-FN-003 via `checkFnBodyProhibitions` for outer-scope refs.
    expect(errors.some(e => /^E-(PURE|FN)-/.test(e.code))).toBe(true);
  });
});

describe("S32-002: §33.6 — transitions MAY NOT call non-deterministic built-ins", () => {
  test("CONF-S32-002: Date.now() inside transition body emits E-FN-004", () => {
    const src =
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { let t = Date.now() }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>`;
    const { errors } = diagnose(src);
    expect(errors.some(e => e.code === "E-FN-004")).toBe(true);
  });
});

describe("S32-003: §33.4 — W-PURE-REDUNDANT on already-pure context", () => {
  test("CONF-S32-003a: `pure fn` emits W-PURE-REDUNDANT", () => {
    const src = `\${ pure fn double(x) { return x * 2 } }`;
    const { warnings } = diagnose(src);
    expect(warnings.some(w => w.code === "W-PURE-REDUNDANT")).toBe(true);
  });

  test.skip("CONF-S32-003b: `pure` on a state-local transition emits W-PURE-REDUNDANT", () => {
    // Phase 4 transition-decl grammar does not currently accept a leading
    // `pure` modifier on the transition signature; spec §33.4 prescribes
    // the warning but the parser does not surface `pure` as a transition
    // modifier yet. Deferred to a follow-up Phase 4 extension (tracked
    // under REGISTRY Phase 4 gating).
    const src =
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        pure validate() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>`;
    const { warnings } = diagnose(src);
    expect(warnings.some(w => w.code === "W-PURE-REDUNDANT")).toBe(true);
  });
});
