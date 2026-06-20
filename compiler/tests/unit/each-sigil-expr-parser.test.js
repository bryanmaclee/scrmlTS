/**
 * `@.` contextual iteration sigil — expr-parser structuring (§17.7.3)
 *
 * g-each-body-sigil-root-expr-parser (S210 ss3 item3). The acorn-based
 * `parseExprToNode` `scrmlAtPlugin` only consumed `@` followed by an
 * identifier-start char, so the `@.` contextual sigil (`@.` / `@.field`) fed to
 * the expr parser surfaced as an escape-hatch (ParseError) — the ExprNode layer
 * could not STRUCTURE the (valid-scrml) sigil. This was the ROOT of the ss14
 * `expr-node-corpus-invariant` each-sigil classifier false-positive (the
 * whitelist there was a band-aid over this gap).
 *
 * Fix: `scrmlAtPlugin` now tokenizes `@.` (+ optional immediately-following
 * field) as one name token, inline-ws-tolerant (`@ . name` from the BS join
 * path). Legality at the locus (inside an `<each>` body) is still decided
 * downstream by E-SYNTAX-064; the markup each-body lowering (emit-lift
 * string-rewrite) is unchanged. This layer's job is only to structure the sigil.
 *
 * §17.7.3: `@.` = the current iteration value; `@.field` parses as `(@.).field`
 * (member access on the sigil).
 */

import { describe, test, expect } from "bun:test";
import { parseExprToNode } from "../../src/expression-parser.ts";

function kindOf(src) {
  return parseExprToNode(src, "each-sigil.test.scrml", 0)?.kind;
}

describe("@. contextual sigil — parseExprToNode structuring (§17.7.3)", () => {
  test("bare `@.` structures as an ident (NOT escape-hatch)", () => {
    const n = parseExprToNode("@.", "t.scrml", 0);
    expect(n.kind).toBe("ident");
    expect(n.name).toBe("@.");
  });

  test("`@.field` structures as an ident named `@.field`", () => {
    const n = parseExprToNode("@.name", "t.scrml", 0);
    expect(n.kind).toBe("ident");
    expect(n.name).toBe("@.name");
  });

  test("space-padded `@ . name` (BS join form) structures identically", () => {
    expect(parseExprToNode("@ . name", "t.scrml", 0)).toMatchObject({ kind: "ident", name: "@.name" });
    expect(parseExprToNode("@  .  city", "t.scrml", 0)).toMatchObject({ kind: "ident", name: "@.city" });
  });

  test("`@.a.b` chains as member access on the `@.a` sigil base (§17.7.3 `(@.).field`)", () => {
    const n = parseExprToNode("@.address.city", "t.scrml", 0);
    expect(n.kind).toBe("member");
    expect(n.object).toMatchObject({ kind: "ident", name: "@.address" });
    expect(n.property).toBe("city");
  });

  test("`@.items[0]` chains as computed index on the sigil base", () => {
    const n = parseExprToNode("@.items[0]", "t.scrml", 0);
    expect(n.kind).toBe("index");
    expect(n.object).toMatchObject({ kind: "ident", name: "@.items" });
  });

  test("`@.count + 1` structures as a binary expression (not escape-hatch)", () => {
    expect(kindOf("@.count + 1")).toBe("binary");
  });

  test("NONE of the `@.` forms escape-hatch", () => {
    for (const src of ["@.", "@.name", "@ . name", "@.address.city", "@.items[0]", "@.count + 1", "@.active ? 1 : 2"]) {
      expect(kindOf(src)).not.toBe("escape-hatch");
    }
  });

  // Regression guards — the existing `@name` reader and normal member access
  // on a reactive var (`@x.y`) MUST be untouched (the non-destructive lookahead
  // only fires when `@` is followed — past inline ws — by a `.`).
  test("`@name` (plain reactive ref) is unaffected", () => {
    expect(parseExprToNode("@name", "t.scrml", 0)).toMatchObject({ kind: "ident", name: "@name" });
  });

  test("`@x.y` stays member access on `@x` (NOT the sigil)", () => {
    const n = parseExprToNode("@x.y", "t.scrml", 0);
    expect(n.kind).toBe("member");
    expect(n.object).toMatchObject({ kind: "ident", name: "@x" });
    expect(n.property).toBe("y");
  });
});
