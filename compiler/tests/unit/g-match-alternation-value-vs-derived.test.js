/**
 * g-match-alternation-value-vs-derived (2026-06-18) — JS-style value-return
 * `match expr { ... }` must accept variant-pattern alternation (`.A | .B :> v`)
 * the SAME way `derived=match` already does.
 *
 * THE BUG: a `|`-PATTERN-alternation arm (`.Small | .Big :> v`) in a value-return
 * match (`const <x> = match`, `return match`, bare `match expr { ... }`) hard-
 * errored E-SYNTAX-011 ("Match arm guard clauses are not supported in v1") —
 * MIS-classifying variant-pattern alternation as a `| cond` guard clause. The
 * `derived=match @x { .Small | .Big => .Healthy ... }` form ACCEPTED the same
 * alternation and compiled clean.
 *
 * SPEC RULING (Rule 4): variant-pattern alternation `.A | .B :> v` IS canonically
 * valid in JS-style value-return match. §51.0.J's normative `derived=match` worked
 * example uses it (`.Small | .Big => .Healthy`), and the kickstarter §4.10 teaches
 * the identical form. §18.10 / E-SYNTAX-011 excludes GUARD clauses (`| cond` where
 * cond is a boolean, or `if cond`) — NOT `| .Variant` pattern alternation.
 *
 * THE FIX (three coupled seams):
 *   1. ast-builder.js collectExpr S27 arm-boundary: a `.Variant =>` immediately
 *      following a top-level `|` is an alternation CONTINUATION, not a new arm —
 *      do not break (kept the whole `|`-chain in one bare-expr).
 *   2. type-system.ts parseArmPattern: a top-level `|` whose every segment is a
 *      VARIANT pattern is alternation (NOT a guard) — harvest the full variant set
 *      into `altVariants`, do NOT set `hasGuard`. The `::` alias is accepted at the
 *      variant-match site too.
 *   3. type-system.ts extractArmsFromMatchNode: push EVERY alternate so
 *      exhaustiveness coverage + dead-arm checks see each variant.
 *
 * The value-return match CODEGEN (emit-control-flow.ts parseMatchArm Form 0 +
 * armCondition) already emitted the OR-chain for `tests:[...]` arms (S84/S83), so
 * the fix is parser+typer; this suite VERIFIES the OR-codegen is reached.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let tmpDir;
beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "g-match-alt-"));
});

function compile(src) {
  const srcPath = join(tmpDir, "repro.scrml");
  const outDir = join(tmpDir, "dist");
  writeFileSync(srcPath, src);
  const result = compileScrml({ inputFiles: [srcPath], outputDir: outDir, log: () => {} });
  const outPath = join(outDir, "repro.client.js");
  let out = "";
  try { out = readFileSync(outPath, "utf8"); } catch {}
  return { result, out };
}

const codesOf = (result) =>
  [...(result.errors ?? []), ...(result.warnings ?? [])].map((e) => e.code);

describe("g-match-alternation-value-vs-derived — value-return match accepts alternation", () => {
  it("the brief reproducer compiles (no E-SYNTAX-011) + emits the OR-match", () => {
    const src = `<program>
\${ type H:enum = { Small, Big, Dead } }
<m>: H = .Small
const <s> = match @m {
  .Small | .Big :> "alive"
  .Dead :> "dead"
}
<div>\${@s}</div>
</program>
`;
    const { result, out } = compile(src);
    // The mis-classification is GONE.
    expect(codesOf(result)).not.toContain("E-SYNTAX-011");
    expect(result.errors ?? []).toHaveLength(0);
    // The OR-match fires the arm for EITHER alternate.
    expect(out).toMatch(/_scrml_match_\d+ === "Small" \|\| _scrml_match_\d+ === "Big"/);
    expect(out).toMatch(/return "alive"/);
    expect(out).toMatch(/=== "Dead"/);
    expect(out).toMatch(/return "dead"/);
  });

  it("three-way alternation `.A | .B | .C :> v` emits a 3-term OR-chain", () => {
    const src = `<program>
\${ type H:enum = { Small, Big, Fire, Dead } }
<m>: H = .Small
const <s> = match @m {
  .Small | .Big | .Fire :> "alive"
  .Dead :> "dead"
}
<div>\${@s}</div>
</program>
`;
    const { result, out } = compile(src);
    expect(result.errors ?? []).toHaveLength(0);
    expect(out).toMatch(
      /_scrml_match_\d+ === "Small" \|\| _scrml_match_\d+ === "Big" \|\| _scrml_match_\d+ === "Fire"/,
    );
  });

  it("the `::` alias alternation (`::Small | ::Big :> v`) compiles + emits the OR-match", () => {
    const src = `<program>
\${ type H:enum = { Small, Big, Dead } }
<m>: H = .Small
const <s> = match @m {
  ::Small | ::Big :> "alive"
  ::Dead :> "dead"
}
<div>\${@s}</div>
</program>
`;
    const { result, out } = compile(src);
    expect(codesOf(result)).not.toContain("E-SYNTAX-011");
    expect(result.errors ?? []).toHaveLength(0);
    expect(out).toMatch(/_scrml_match_\d+ === "Small" \|\| _scrml_match_\d+ === "Big"/);
  });

  it("`return match` (§18.3) with a typed param accepts alternation", () => {
    const src = `<program>
\${ type S:enum = { Loading, Success, Error }
  function getLabel(status: S) {
    return match status {
      .Loading | .Success :> "ok"
      .Error :> "failed"
    }
  }
}
<div>\${getLabel(.Loading)}</div>
</program>
`;
    const { result, out } = compile(src);
    expect(codesOf(result)).not.toContain("E-SYNTAX-011");
    expect(result.errors ?? []).toHaveLength(0);
    expect(out).toMatch(/=== "Loading" \|\| _scrml_match_\d+ === "Success"/);
  });

  it("emitted value-return-alternation JS parses (node-level Function() parse)", () => {
    const src = `<program>
\${ type H:enum = { Small, Big, Dead } }
<m>: H = .Small
const <s> = match @m {
  .Small | .Big :> "alive"
  .Dead :> "dead"
}
<div>\${@s}</div>
</program>
`;
    const { out } = compile(src);
    expect(out).not.toContain("could not be compiled");
    expect(() => {
      new Function(
        "_scrml_reactive_get",
        "_scrml_reactive_set",
        "_scrml_init_set",
        "document",
        out.replace(/^\/\/ Requires:.*\n/, ""),
      );
    }).not.toThrow();
  });
});

describe("g-match-alternation-value-vs-derived — exhaustiveness narrows to the full alternate set", () => {
  it("alternation covering all-but-one variant still fires E-TYPE-020 for the gap", () => {
    const src = `<program>
\${ type H:enum = { Small, Big, Dead } }
<m>: H = .Small
const <s> = match @m {
  .Small | .Big :> "alive"
}
<div>\${@s}</div>
</program>
`;
    const { result } = compile(src);
    // Both .Small AND .Big are counted (only .Dead is missing).
    expect(codesOf(result)).toContain("E-TYPE-020");
    const exh = (result.errors ?? []).find((e) => e.code === "E-TYPE-020");
    expect(exh.message).toMatch(/Dead/);
    expect(exh.message).not.toMatch(/Small/);
    expect(exh.message).not.toMatch(/Big/);
  });

  it("alternation + singleton arms together exhaust the enum (compiles clean)", () => {
    const src = `<program>
\${ type H:enum = { Small, Big, Dead } }
<m>: H = .Small
const <s> = match @m {
  .Small | .Big :> "alive"
  .Dead :> "dead"
}
<div>\${@s}</div>
</program>
`;
    const { result } = compile(src);
    expect(result.errors ?? []).toHaveLength(0);
  });

  it("a variant repeated across two alternation arms fires the duplicate/dead-arm diagnostic", () => {
    const src = `<program>
\${ type H:enum = { Small, Big, Dead } }
<m>: H = .Small
const <s> = match @m {
  .Small | .Big :> "alive"
  .Dead | .Small :> "weird"
}
<div>\${@s}</div>
</program>
`;
    const { result } = compile(src);
    // .Small is covered twice → dead/duplicate arm.
    expect(codesOf(result)).toContain("E-TYPE-023");
  });
});

describe("g-match-alternation-value-vs-derived — REAL guards still rejected (no over-relax)", () => {
  it("a real `| cond` boolean guard still fires E-SYNTAX-011", () => {
    const src = `<program>
\${ type H:enum = { Small, Big, Dead } }
<m>: H = .Small
<n>: int = 5
const <s> = match @m {
  .Small | @n > 3 :> "alive"
  .Dead :> "dead"
  else :> "x"
}
<div>\${@s}</div>
</program>
`;
    const { result } = compile(src);
    expect(codesOf(result)).toContain("E-SYNTAX-011");
  });

  it("a real `if cond` guard still fires E-SYNTAX-011", () => {
    const src = `<program>
\${ type H:enum = { Small, Big, Dead } }
<m>: H = .Small
<n>: int = 5
const <s> = match @m {
  .Small if @n > 3 :> "alive"
  .Dead :> "dead"
  else :> "x"
}
<div>\${@s}</div>
</program>
`;
    const { result } = compile(src);
    expect(codesOf(result)).toContain("E-SYNTAX-011");
  });
});

describe("g-match-alternation-value-vs-derived — derived=match parity (no regression)", () => {
  it("the kickstarter §4.10 / §51.0.J derived=match alternation still compiles", () => {
    const src = `<program>
\${ type Mario:enum = { Small, Big, Fire, Cape }
  type Health:enum = { Healthy, AtRisk, Critical } }
<engine for=Mario initial=.Small>
  <Small rule=.Big : "small">
  <Big rule=.Fire : "big">
  <Fire rule=.Cape : "fire">
  <Cape rule=.Small : "cape">
</>
<engine for=Health derived=match @mario {
  .Small | .Big :> .Healthy
  .Fire | .Cape :> .AtRisk
  _              :> .Critical
}>
  <Healthy : "ok">
  <AtRisk : "warn">
  <Critical : "bad">
</>
</program>
`;
    const { result } = compile(src);
    expect(codesOf(result)).not.toContain("E-SYNTAX-011");
    expect(result.errors ?? []).toHaveLength(0);
  });
});
