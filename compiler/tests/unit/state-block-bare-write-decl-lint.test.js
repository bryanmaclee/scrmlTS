// ---------------------------------------------------------------------------
// Class D — W-STATE-BLOCK-BARE-WRITE-DECL info-lint
// (sym-cell-registration-completeness-2026-06-13, MIGRATE+DEPRECATE ruling S192)
// ---------------------------------------------------------------------------
//
// A `<db>` / `<state>` body is markup context (SPEC §4). Per §38.4 ("bare names
// are LOCALS only") + §6 V5-strict, a bare `@x = init` directly in a state-block
// markup body is NOT a declaration — it is silently dropped (inert text), so the
// cell never resolves at SYM (the Class-D census null-set). The canonical form is
// the structural decl in a `${...}` logic block: `${ <x> = init }` (the
// 03-contact-book / 08-chat shape). This commit emits the info-level steering
// lint. INFO-not-error: the §34 E-WRITE-NOT-IN-LOGIC-CONTEXT row explicitly
// excludes state-block bodies; a hard error there is a bigger call (reserved
// E-STATE-BLOCK-BARE-WRITE-DECL).

import { describe, test, expect } from "bun:test";
import { writeFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { compileScrml } from "../../src/api.js";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runSYM, lookupStateCell } from "../../src/symbol-table.ts";

const TMP = mkdtempSync(join(tmpdir(), "sbbwd-"));
function compile(src) {
  const p = join(TMP, `t-${Math.random().toString(36).slice(2)}.scrml`);
  writeFileSync(p, src);
  return compileScrml({ inputFiles: [p], write: false, outputDir: join(TMP, "out") });
}
function sbbwdWarnings(r) {
  return (r.warnings ?? []).filter(w => (w.code ?? "").includes("W-STATE-BLOCK-BARE-WRITE-DECL"));
}
function sbbwdErrors(r) {
  return (r.errors ?? []).filter(e => (e.code ?? "").includes("STATE-BLOCK-BARE-WRITE-DECL"));
}
function resolves(src, name) {
  const ast = buildAST(splitBlocks("t.scrml", src)).ast;
  runSYM({ filePath: "t.scrml", ast });
  return !!lookupStateCell(ast._scope, name);
}

describe("W-STATE-BLOCK-BARE-WRITE-DECL — bare @x=init in a state-block body", () => {
  const BARE = `<program>\n< db src="./x.db" tables="products">\n  @products = []\n  @page = 1\n</db>\n<p>\${@products}</p>\n</program>`;
  const CANON = `<program>\n< db src="./x.db" tables="products">\${\n  <products> = []\n  <page> = 1\n}</db>\n<p>\${@products}</p>\n</program>`;

  test("fires once per bare @x=init line (info / result.warnings)", () => {
    const r = compile(BARE);
    const w = sbbwdWarnings(r);
    expect(w.length).toBe(2);
    expect(w[0].severity ?? "").not.toBe("error");
    // Partition: never lands in errors (non-fatal).
    expect(sbbwdErrors(r).length).toBe(0);
  });

  test("the message steers to the structural `${ <x> = ... }` form", () => {
    const r = compile(BARE);
    const w = sbbwdWarnings(r);
    expect(w[0].message).toMatch(/<products>/);
    expect(w[0].message).toMatch(/\$\{/);
  });

  test("does NOT fire on the canonical `${ <x> = init }` form", () => {
    const r = compile(CANON);
    expect(sbbwdWarnings(r).length).toBe(0);
  });

  test("does NOT fire on a bare @write inside a `${}` handler/fn body in the db", () => {
    const src = `<program>\n< db src="./x.db" tables="products">\${\n  <products> = []\n  server function load() { @products = [1] }\n}</db>\n<p>\${@products}</p>\n</program>`;
    expect(sbbwdWarnings(compile(src)).length).toBe(0);
  });

  test("the bare form does NOT resolve; the canonical form DOES (the underlying gap)", () => {
    expect(resolves(BARE, "products")).toBe(false);
    expect(resolves(CANON, "products")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// FIX 1 (sym-cell-registration-completeness-2026-06-13 fixup, S192) — the lint
// must fire on the CANONICAL no-space `<db>` / `<state>` opener, not just the
// DEPRECATED whitespace `< db>` form. BS classifies the canonical opener as
// `type=markup`; the pre-fixup scan only ran on the `type=state` whitespace form,
// so the lint was SILENT on exactly the canonical `<db>` an adopter writes.
// ---------------------------------------------------------------------------
describe("W-STATE-BLOCK-BARE-WRITE-DECL — canonical no-space opener coverage (FIX 1)", () => {
  // Canonical opener: NO space after `<` (the form an adopter writes).
  const CANON_DB = `<program>\n<db src="./x.db" tables="products">\n  @products = []\n  @page = 1\n</db>\n<p>\${@products}</p>\n</program>`;
  const CANON_STATE = `<program>\n<state>\n  @count = 0\n</state>\n<p>\${@count}</p>\n</program>`;
  const CANON_STRUCTURAL = `<program>\n<db src="./x.db" tables="products">\${\n  <products> = []\n  <page> = 1\n}</db>\n<p>\${@products}</p>\n</program>`;

  test("FIRES on the canonical no-space `<db>` bare-write body (the new coverage)", () => {
    const r = compile(CANON_DB);
    const w = sbbwdWarnings(r);
    expect(w.length).toBe(2);
    expect(w[0].severity ?? "").not.toBe("error");
    expect(sbbwdErrors(r).length).toBe(0);
  });

  test("FIRES on the canonical no-space `<state>` bare-write body", () => {
    const r = compile(CANON_STATE);
    expect(sbbwdWarnings(r).length).toBe(1);
  });

  test("does NOT fire on the canonical no-space `<db>` with `${ <x> = init }` structural form", () => {
    const r = compile(CANON_STRUCTURAL);
    expect(sbbwdWarnings(r).length).toBe(0);
  });

  test("over-fire guard: `@x == []` comparison inside a `${}` block does NOT fire", () => {
    const src = `<program>\n<db src="./x.db" tables="products">\${\n  <products> = []\n  effect=@products == []\n}</db>\n</program>`;
    expect(sbbwdWarnings(compile(src)).length).toBe(0);
  });

  test("over-fire guard: a `${} server function` body bare write does NOT fire (canonical opener)", () => {
    const src = `<program>\n<db src="./x.db" tables="products">\${\n  <products> = []\n  server function load() { @products = [1] }\n}</db>\n</program>`;
    expect(sbbwdWarnings(compile(src)).length).toBe(0);
  });
});
