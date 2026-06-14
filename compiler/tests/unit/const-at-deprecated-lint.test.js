// ---------------------------------------------------------------------------
// Class A — W-CONST-AT-DEPRECATED info-lint + Migration 4 (const @name)
// (sym-cell-registration-completeness-2026-06-13, MIGRATE+DEPRECATE ruling S192)
// ---------------------------------------------------------------------------
//
// The legacy expression-form derived cell `const @name = expr` (ADR Option-A
// FOLD, S60) is non-canonical: SPEC §6.6.1 states `const <name> = expr` is the
// SOLE derived-decl syntax. The `@`-form silently drops the cell inside a markup
// element body (Class-A census null-set). This commit (a) emits an info-level
// W-CONST-AT-DEPRECATED steering to `const <name>` and (b) ships Migration 4 in
// `bun scrml migrate --fix`. Lint + migration are coupled (no warn window).

import { describe, test, expect } from "bun:test";
import { writeFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { compileScrml } from "../../src/api.js";
import { applyMigrations } from "../../src/commands/migrate.js";

const TMP = mkdtempSync(join(tmpdir(), "const-at-"));

function compile(src) {
  const p = join(TMP, `t-${Math.random().toString(36).slice(2)}.scrml`);
  writeFileSync(p, src);
  const r = compileScrml({ inputFiles: [p], write: false, outputDir: join(TMP, "out") });
  return r;
}
function constAtWarnings(r) {
  return (r.warnings ?? []).filter(w => (w.code ?? "").includes("W-CONST-AT-DEPRECATED"));
}
function constAtErrors(r) {
  return (r.errors ?? []).filter(e => (e.code ?? "").includes("CONST-AT-DEPRECATED"));
}

describe("W-CONST-AT-DEPRECATED — legacy `const @name` derived cell", () => {
  test("fires (info / result.warnings) on `const @doubled = expr` in logic", () => {
    const r = compile(`<program>\${\n  <c> = 0\n  const @doubled = @c * 2\n}\n<p>\${@doubled}</p></program>`);
    const w = constAtWarnings(r);
    expect(w.length).toBe(1);
    expect(w[0].severity).toBe("info");
    expect(w[0].message).toMatch(/const <doubled>/);
    // Partition: it must land in warnings, NEVER in errors (non-fatal).
    expect(constAtErrors(r).length).toBe(0);
  });

  test("fires on the TYPED legacy form `const @total: number = expr`", () => {
    const r = compile(`<program>\${\n  <a> = 0\n  const @total: number = @a + 1\n}\n<p>\${@total}</p></program>`);
    expect(constAtWarnings(r).length).toBe(1);
  });

  test("does NOT fire on the canonical `const <doubled> = expr`", () => {
    const r = compile(`<program>\${\n  <c> = 0\n  const <doubled> = @c * 2\n}\n<p>\${@doubled}</p></program>`);
    expect(constAtWarnings(r).length).toBe(0);
  });

  test("does NOT fire on a plain `<x> = expr` reactive cell", () => {
    const r = compile(`<program>\${\n  <c> = 0\n}\n<p>\${@c}</p></program>`);
    expect(constAtWarnings(r).length).toBe(0);
  });
});

describe("Migration 4 — `const @name` → `const <name>` (bun scrml migrate --fix)", () => {
  test("rewrites a basic decl", () => {
    const r = applyMigrations(`const @doubled = @count * 2`);
    expect(r.rewritten).toBe(`const <doubled> = @count * 2`);
    expect(r.migrations.constAt).toBe(1);
  });

  test("rewrites a typed decl, preserving indentation + the type segment", () => {
    const r = applyMigrations(`    const @total: number = @a + @b`);
    expect(r.rewritten).toBe(`    const <total>: number = @a + @b`);
    expect(r.migrations.constAt).toBe(1);
  });

  test("leaves a `//`-comment mention untouched, migrates the real decl below", () => {
    const r = applyMigrations(`// const @derived = expr is the syntax\nconst @real = @x`);
    expect(r.rewritten).toBe(`// const @derived = expr is the syntax\nconst <real> = @x`);
    expect(r.migrations.constAt).toBe(1);
  });

  test("is idempotent (already-canonical `const <x>` untouched)", () => {
    const once = applyMigrations(`const @doubled = @count * 2`).rewritten;
    const twice = applyMigrations(once);
    expect(twice.migrations.constAt).toBe(0);
    expect(twice.rewritten).toBe(once);
  });

  test("the migrated form is W-CONST-AT-DEPRECATED lint-clean (no warn window)", () => {
    const migrated = applyMigrations(
      `<program>\${\n  <c> = 0\n  const @doubled = @c * 2\n}\n<p>\${@doubled}</p></program>`,
    ).rewritten;
    const r = compile(migrated);
    expect(constAtWarnings(r).length).toBe(0);
  });
});

describe("W-CONST-AT-DEPRECATED — markup-element-body silent-drop coverage (FIX 2)", () => {
  test("FIRES on `const @x = expr` directly in a `<div>` prose body (the new coverage)", () => {
    const r = compile(`<program>\n<div>\n  const @count = 5\n</div>\n</program>`);
    const w = constAtWarnings(r);
    expect(w.length).toBe(1);
    expect(w[0].severity ?? "").not.toBe("error");
    expect(w[0].message).toMatch(/const <count>/);
    // Partition: never lands in errors (non-fatal).
    expect(constAtErrors(r).length).toBe(0);
  });

  test("FIRES on `const @x = expr` in a `<db>` state-block body (also a silent-drop site)", () => {
    const r = compile(`<program>\n<db src="./x.db" tables="t">\${ <products> = [] }\n  const @count = @products.length\n</db>\n</program>`);
    expect(constAtWarnings(r).length).toBe(1);
  });

  test("does NOT fire on canonical `const <x>` in a markup body (that is a loud E-CTX error, not W-CONST-AT)", () => {
    const r = compile(`<program>\n<div>\n  const <doubled> = 5\n</div>\n</program>`);
    expect(constAtWarnings(r).length).toBe(0);
    // §6.6.1 (FIX 3): `const <x>` in a raw markup body mis-parses `<x>` as an
    // element open-tag and loud-errors E-CTX-001 — it does NOT register there.
    const eCtx = (r.errors ?? []).filter(e => (e.code ?? "") === "E-CTX-001");
    expect(eCtx.length).toBeGreaterThan(0);
  });

  test("does NOT double-fire on `const @x` in a `<program>` direct body (AST-path lint already fires)", () => {
    const r = compile(`<program>\n<c> = 3\nconst @doubled = @c * 2\n<p>\${@doubled}</p>\n</program>`);
    expect(constAtWarnings(r).length).toBe(1);
  });

  test("over-fire guard: `const @x == @y` comparison does NOT fire", () => {
    const r = compile(`<program>\n<div>\n  const @x == @y\n</div>\n</program>`);
    expect(constAtWarnings(r).length).toBe(0);
  });

  test("over-fire guard: a mid-prose `const @foo` (not at line start) does NOT fire", () => {
    const r = compile(`<program>\n<p>using const @foo loosely as prose = sample</p>\n</program>`);
    expect(constAtWarnings(r).length).toBe(0);
  });
});
