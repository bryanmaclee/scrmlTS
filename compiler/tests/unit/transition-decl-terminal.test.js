/**
 * §54.6.4 — E-STATE-TERMINAL-MUTATION (S32 Phase 4f)
 *
 * A substate is "terminal" when:
 *   - it has a parentState set (i.e., it IS a substate, not a top-level
 *     state type), AND
 *   - its `transitions` field is undefined or empty (no declared
 *     outgoing transitions).
 *
 * Writing to a field on a terminal substate is illegal: a terminal
 * substate is, by definition, a resting state that cannot progress
 * further. Field mutation at that point has no defined semantics per
 * the state-local life-cycle model.
 *
 * Negative-space rules:
 *   - Non-terminal substate (has transitions): silent.
 *   - Top-level state (no parentState): silent — terminality is
 *     defined in the substate-graph sense per §54.
 *   - Field READ (no assignment): silent.
 *   - Call (not assignment): silent — that's 4e's territory.
 *   - Non-state binding: silent.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runTS } from "../../src/type-system.js";

function compile(src) {
  const bs = splitBlocks("/test/app.scrml", src);
  const { ast } = buildAST(bs);
  const res = runTS({ files: [ast] });
  return res;
}

function hasCode(errors, code, substring) {
  return errors.some(e => e.code === code && (!substring || String(e.message).includes(substring)));
}

describe("§54.6.4: E-STATE-TERMINAL-MUTATION — field write on terminal substate", () => {
  test("terminal substate — field write fires E-STATE-TERMINAL-MUTATION", () => {
    const { errors } = compile(
      `<program>\n` +
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>\n` +
      `\${\n` +
      `  let done: Validated = < Validated></>;\n` +
      `  done.body = "tampered";\n` +
      `}\n` +
      `</program>`
    );
    expect(hasCode(errors, "E-STATE-TERMINAL-MUTATION", "Validated")).toBe(true);
  });

  test("error message names the substate and the field", () => {
    const { errors } = compile(
      `<program>\n` +
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>\n` +
      `\${\n` +
      `  let done: Validated = < Validated></>;\n` +
      `  done.body = "tampered";\n` +
      `}\n` +
      `</program>`
    );
    const err = errors.find(e => e.code === "E-STATE-TERMINAL-MUTATION");
    expect(err).toBeDefined();
    const msg = String(err.message);
    expect(msg).toContain("Validated");
    expect(msg).toContain("body");
  });

  test("non-terminal substate — has transitions — silent", () => {
    const { errors } = compile(
      `<program>\n` +
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>\n` +
      `\${\n` +
      `  let d: Draft = < Draft></>;\n` +
      `  d.body = "x";\n` +
      `}\n` +
      `</program>`
    );
    expect(hasCode(errors, "E-STATE-TERMINAL-MUTATION")).toBe(false);
  });

  test("top-level state — no parentState — silent (4f is substate-graph-only)", () => {
    const { errors } = compile(
      `<program>\n` +
      `< Solo body(string)></>\n` +
      `\${\n` +
      `  let s: Solo = < Solo></>;\n` +
      `  s.body = "x";\n` +
      `}\n` +
      `</program>`
    );
    expect(hasCode(errors, "E-STATE-TERMINAL-MUTATION")).toBe(false);
  });

  test("field read on terminal substate — silent (reads are allowed)", () => {
    const { errors } = compile(
      `<program>\n` +
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>\n` +
      `\${\n` +
      `  let done: Validated = < Validated></>;\n` +
      `  let b = done.body;\n` +
      `}\n` +
      `</program>`
    );
    expect(hasCode(errors, "E-STATE-TERMINAL-MUTATION")).toBe(false);
  });

  test("non-state binding — silent", () => {
    const { errors } = compile(
      `<program>\n` +
      `\${\n` +
      `  let obj = { x: 1 };\n` +
      `  obj.x = 2;\n` +
      `}\n` +
      `</program>`
    );
    expect(hasCode(errors, "E-STATE-TERMINAL-MUTATION")).toBe(false);
  });

  test("reactive @ binding to terminal substate — fires on assignment", () => {
    const { errors } = compile(
      `<program>\n` +
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>\n` +
      `\${\n` +
      `  @done: Validated = < Validated></>;\n` +
      `  @done.body = "tampered";\n` +
      `}\n` +
      `</program>`
    );
    expect(hasCode(errors, "E-STATE-TERMINAL-MUTATION", "Validated")).toBe(true);
  });
});
