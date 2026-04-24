/**
 * mangle-record-value-bleed.test.js — Regression test for Bug I
 *
 * Bug I (adopter inbound 2026-04-22): user function `lines()` at module scope
 * causes the compiler to mangle `n.lines` inside record-literal value positions
 * to `n._scrml_lines_N`. The root cause: emit-client.ts's post-processing regex
 * used a fixed-width negative lookbehind `(?<!\.)` but the emitter outputs spaces
 * around `.` (e.g., `n . lines`), so the lookbehind saw a space and allowed the
 * match. Fix: extend to `(?<!\.\s*)` for variable-length lookbehind.
 *
 * Related: Bug D (6nz inbound 2026-04-20) — same mangling regex, but for direct
 * `.` property access without spaces (e.g., `classList.toggle`).
 *
 * Coverage:
 *   §1  Record literal values with spaced `.` are NOT mangled
 *   §2  Call sites ARE still mangled correctly
 *   §3  Variable references in non-call position are handled correctly
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/mangle-record-value-bleed");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

// Bug I reproducer: user fn `lines()` + record literal with `lines: n.lines`
const RECORD_FIXTURE = join(FIXTURE_DIR, "record-bleed.scrml");
const RECORD_SRC = `<program>

\${
    function lines() {
        return [""]
    }

    @items = [{ id: 0, lines: ["x", "y"], other: "a" }]

    function copyAll() {
        return @items.map((n, i) => {
            return {
                id: n.id,
                lines: n.lines,
                other: n.other
            }
        })
    }

    @copied = copyAll()
}

<div>
    <p>\${lines()[0]}</p>
    <p>\${@items[0].lines[0]}</p>
</div>

</program>
`;

// Edge case: multiple user fns whose names match record fields
const MULTI_FN_FIXTURE = join(FIXTURE_DIR, "multi-fn.scrml");
const MULTI_FN_SRC = `<program>

\${
    function name() { return "default" }
    function count() { return 0 }

    @data = { name: "Alice", count: 42 }

    function process() {
        return { name: @data.name, count: @data.count }
    }

    @result = process()
}

<div>
    <p>\${name()}</p>
    <p>\${@result.name}</p>
</div>

</program>
`;

beforeAll(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  writeFileSync(RECORD_FIXTURE, RECORD_SRC);
  writeFileSync(MULTI_FN_FIXTURE, MULTI_FN_SRC);
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// §1: Record literal values with spaced `.` are NOT mangled
// ---------------------------------------------------------------------------

describe("§1: record literal values are NOT mangled", () => {
  test("Bug I: `n.lines` in record value is preserved, not mangled to `n._scrml_lines_N`", () => {
    const result = compileScrml({
      inputFiles: [RECORD_FIXTURE],
      outputDir: FIXTURE_OUTPUT,
      write: false,
    });

    expect(result.errors).toEqual([]);
    const out = result.outputs.get(RECORD_FIXTURE);
    expect(out).toBeDefined();
    const clientJs = out.clientJs;

    // The record value `n.lines` (or `n . lines` with spaces) must NOT be mangled
    expect(clientJs).not.toMatch(/n\s*\.\s*_scrml_lines_/);
    // The record value `n.id` and `n.other` must also be preserved
    expect(clientJs).not.toMatch(/n\s*\.\s*_scrml_/);
  });

  test("multiple fn names matching record fields: values are preserved", () => {
    const result = compileScrml({
      inputFiles: [MULTI_FN_FIXTURE],
      outputDir: FIXTURE_OUTPUT,
      write: false,
    });

    expect(result.errors).toEqual([]);
    const clientJs = result.outputs.get(MULTI_FN_FIXTURE).clientJs;

    // `@data.name` and `@data.count` in record values must not be mangled
    expect(clientJs).not.toMatch(/\.\s*_scrml_name_/);
    expect(clientJs).not.toMatch(/\.\s*_scrml_count_/);
  });
});

// ---------------------------------------------------------------------------
// §2: Call sites ARE still mangled correctly
// ---------------------------------------------------------------------------

describe("§2: call sites are still mangled", () => {
  test("user fn `lines()` call site is mangled", () => {
    const result = compileScrml({
      inputFiles: [RECORD_FIXTURE],
      outputDir: FIXTURE_OUTPUT,
      write: false,
    });

    const clientJs = result.outputs.get(RECORD_FIXTURE).clientJs;

    // The function declaration uses the mangled name
    expect(clientJs).toMatch(/function _scrml_lines_\d+\(\)/);
    // The call site uses the mangled name
    expect(clientJs).toMatch(/_scrml_lines_\d+\(\)/);
  });

  test("user fn `copyAll()` call site is mangled", () => {
    const result = compileScrml({
      inputFiles: [RECORD_FIXTURE],
      outputDir: FIXTURE_OUTPUT,
      write: false,
    });

    const clientJs = result.outputs.get(RECORD_FIXTURE).clientJs;

    // The function declaration uses the mangled name
    expect(clientJs).toMatch(/function _scrml_copyAll_\d+\(\)/);
    // The call site uses the mangled name
    expect(clientJs).toMatch(/_scrml_copyAll_\d+\(\)/);
  });

  test("user fns `name()` and `count()` call sites are mangled", () => {
    const result = compileScrml({
      inputFiles: [MULTI_FN_FIXTURE],
      outputDir: FIXTURE_OUTPUT,
      write: false,
    });

    const clientJs = result.outputs.get(MULTI_FN_FIXTURE).clientJs;

    expect(clientJs).toMatch(/function _scrml_name_\d+\(\)/);
    expect(clientJs).toMatch(/function _scrml_count_\d+\(\)/);
    expect(clientJs).toMatch(/_scrml_name_\d+\(\)/);
  });
});

// ---------------------------------------------------------------------------
// §3: Variable references in non-call position are handled correctly
// ---------------------------------------------------------------------------

describe("§3: non-call references", () => {
  test("record key `lines:` is NOT mangled (followed by `:`, not in lookahead set)", () => {
    const result = compileScrml({
      inputFiles: [RECORD_FIXTURE],
      outputDir: FIXTURE_OUTPUT,
      write: false,
    });

    const clientJs = result.outputs.get(RECORD_FIXTURE).clientJs;

    // Record keys should appear as-is (e.g., `lines :` or `lines:`)
    // They should NOT be mangled because `:` is not in the regex lookahead
    expect(clientJs).not.toMatch(/_scrml_lines_\d+\s*:/);
  });

  test("array index access `.lines[0]` is NOT mangled", () => {
    const result = compileScrml({
      inputFiles: [RECORD_FIXTURE],
      outputDir: FIXTURE_OUTPUT,
      write: false,
    });

    const clientJs = result.outputs.get(RECORD_FIXTURE).clientJs;

    // `.lines[0]` property access must be preserved
    expect(clientJs).not.toMatch(/\.\s*_scrml_lines_\d+\[/);
    // Verify the original `.lines[0]` pattern exists
    expect(clientJs).toMatch(/\.lines\[0\]/);
  });
});
