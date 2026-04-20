/**
 * §54.6.3 — E-STATE-TRANSITION-ILLEGAL (S32 Phase 4e)
 *
 * When code calls a transition method on a state-typed binding whose
 * resolved type has DECLARED transitions but the called method is not
 * among them, the compiler surfaces E-STATE-TRANSITION-ILLEGAL.
 *
 * Not fired when:
 *   - The state type has NO transitions field at all (terminal — that's
 *     Phase 4f's E-STATE-TERMINAL-MUTATION territory, covered separately).
 *   - The member access is not a call (field read).
 *   - The call name IS in the transitions map.
 *   - The receiver resolves to something other than a StateType.
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

describe("§54.6.3: E-STATE-TRANSITION-ILLEGAL — call to undeclared transition", () => {
  test("legal call — declared transition does not error", () => {
    const { errors } = compile(
      `<program>\n` +
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>\n` +
      `\${\n` +
      `  let sub: Draft = < Draft></>;\n` +
      `  sub.validate()\n` +
      `}\n` +
      `</program>`
    );
    expect(hasCode(errors, "E-STATE-TRANSITION-ILLEGAL")).toBe(false);
  });

  test("illegal call — undeclared method fires E-STATE-TRANSITION-ILLEGAL", () => {
    const { errors } = compile(
      `<program>\n` +
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>\n` +
      `\${\n` +
      `  let sub: Draft = < Draft></>;\n` +
      `  sub.wrongName()\n` +
      `}\n` +
      `</program>`
    );
    expect(hasCode(errors, "E-STATE-TRANSITION-ILLEGAL", "wrongName")).toBe(true);
  });

  test("error message names the substate and lists declared transitions", () => {
    const { errors } = compile(
      `<program>\n` +
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { }\n` +
      `        cancel() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>\n` +
      `\${\n` +
      `  let sub: Draft = < Draft></>;\n` +
      `  sub.bogus()\n` +
      `}\n` +
      `</program>`
    );
    const err = errors.find(e => e.code === "E-STATE-TRANSITION-ILLEGAL");
    expect(err).toBeDefined();
    const msg = String(err.message);
    expect(msg).toContain("Draft");
    expect(msg).toContain("bogus");
    // Declared transitions listed (order-independent)
    expect(/validate/.test(msg)).toBe(true);
    expect(/cancel/.test(msg)).toBe(true);
  });

  test("field read (member access, no call) does NOT fire", () => {
    const { errors } = compile(
      `<program>\n` +
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>\n` +
      `\${\n` +
      `  let sub: Draft = < Draft></>;\n` +
      `  sub.body\n` +
      `}\n` +
      `</program>`
    );
    expect(hasCode(errors, "E-STATE-TRANSITION-ILLEGAL")).toBe(false);
  });

  test("state with NO transitions field (terminal) does NOT fire 4e", () => {
    // Phase 4f territory — 4e is silent when transitions is undefined.
    const { errors } = compile(
      `<program>\n` +
      `< Submission id(string)>\n` +
      `    < Draft body(string)></>\n` +
      `    < Validated body(string)></>\n` +
      `</>\n` +
      `\${\n` +
      `  let sub: Draft = < Draft></>;\n` +
      `  sub.anything()\n` +
      `}\n` +
      `</program>`
    );
    expect(hasCode(errors, "E-STATE-TRANSITION-ILLEGAL")).toBe(false);
  });

  test("call on non-state binding does NOT fire", () => {
    const { errors } = compile(
      `<program>\n` +
      `\${\n` +
      `  let x = "hello"\n` +
      `  x.toUpperCase()\n` +
      `}\n` +
      `</program>`
    );
    expect(hasCode(errors, "E-STATE-TRANSITION-ILLEGAL")).toBe(false);
  });

  test("reactive @ binding call — legal transition does not error", () => {
    const { errors } = compile(
      `<program>\n` +
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>\n` +
      `\${\n` +
      `  @sub: Draft = < Draft></>;\n` +
      `  @sub.validate()\n` +
      `}\n` +
      `</program>`
    );
    expect(hasCode(errors, "E-STATE-TRANSITION-ILLEGAL")).toBe(false);
  });

  test("reactive @ binding call — undeclared method fires E-STATE-TRANSITION-ILLEGAL", () => {
    const { errors } = compile(
      `<program>\n` +
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>\n` +
      `\${\n` +
      `  @sub: Draft = < Draft></>;\n` +
      `  @sub.badMethod()\n` +
      `}\n` +
      `</program>`
    );
    expect(hasCode(errors, "E-STATE-TRANSITION-ILLEGAL", "badMethod")).toBe(true);
  });
});
