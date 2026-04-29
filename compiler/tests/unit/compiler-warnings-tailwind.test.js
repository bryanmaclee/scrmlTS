/**
 * compiler-warnings-tailwind — Unit Tests for W-TAILWIND-001
 *
 * Tests for `findUnsupportedTailwindShapes` (compiler/src/tailwind-classes.js)
 * and its wiring through `compileScrml` (compiler/src/api.js).
 *
 * W-TAILWIND-001 fires when a class string in a `class="..."` attribute looks
 * like Tailwind variant or arbitrary-value syntax (contains ':' or '['). The
 * full variant + arbitrary-value system is listed as TBD in SPEC §26.3 / SPEC-
 * ISSUE-012, so the warning is shape-based — it fires regardless of whether
 * the embedded engine has incidental partial support for the responsive /
 * state prefixes (`md:`, `hover:`, etc.).
 *
 * Coverage:
 *   §1  Variant prefixes — supported and unsupported, all fire on shape
 *   §2  Arbitrary values (p-[...], bg-[...])
 *   §3  Stacked variant + arbitrary value
 *   §4  Negatives — base utilities never fire
 *   §5  Negatives — user-shaped classes (no `:` or `[`)
 *   §6  Mixed attribute — fires only on offenders
 *   §7  Diagnostic shape (code, severity, message, line, column)
 *   §8  Multi-line / multi-attribute coverage
 *   §9  Integration via compileScrml.lintDiagnostics
 */

import { describe, test, expect } from "bun:test";
import { findUnsupportedTailwindShapes } from "../../src/tailwind-classes.js";
import { compileScrml } from "../../src/api.js";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scan(source) {
  return findUnsupportedTailwindShapes(source);
}

function fired(diags, className) {
  return diags.some(d => d.code === "W-TAILWIND-001" && d.className === className);
}

function compileSource(source) {
  const dir = join(tmpdir(), "scrml-tailwind-test-" + Math.random().toString(36).slice(2));
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, "test.scrml");
  writeFileSync(filePath, source, "utf8");
  let result;
  try {
    result = compileScrml({
      inputFiles: [filePath],
      outputDir: join(dir, "dist"),
      write: false,
    });
  } finally {
    try { unlinkSync(filePath); } catch {}
  }
  return result;
}

// ---------------------------------------------------------------------------
// §1 Variant prefixes — every Tailwind-shape class fires (SPEC-ISSUE-012)
// ---------------------------------------------------------------------------

describe("§1 Variant prefix shapes — fire on shape", () => {
  test("md:p-4 fires (responsive variant — TBD per §26.3)", () => {
    const diags = scan('<div class="md:p-4"></div>');
    expect(fired(diags, "md:p-4")).toBe(true);
    expect(diags.length).toBe(1);
  });

  test("hover:bg-blue-500 fires (state variant — TBD per §26.3)", () => {
    const diags = scan('<button class="hover:bg-blue-500">x</button>');
    expect(fired(diags, "hover:bg-blue-500")).toBe(true);
  });

  test("dark:p-4 fires (variant prefix not handled by embedded engine)", () => {
    const diags = scan('<div class="dark:p-4"></div>');
    expect(fired(diags, "dark:p-4")).toBe(true);
  });

  test("custom variant prefix (`weird:p-4`) fires", () => {
    const diags = scan('<div class="weird:p-4"></div>');
    expect(fired(diags, "weird:p-4")).toBe(true);
  });

  test("group-hover:bg-blue-500 fires (group-hover not implemented)", () => {
    const diags = scan('<button class="group-hover:bg-blue-500">x</button>');
    expect(fired(diags, "group-hover:bg-blue-500")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §2 Arbitrary values
// ---------------------------------------------------------------------------

describe("§2 Arbitrary values — fire on shape", () => {
  test("p-[1.5rem] fires", () => {
    const diags = scan('<div class="p-[1.5rem]"></div>');
    expect(fired(diags, "p-[1.5rem]")).toBe(true);
  });

  test("bg-[#ff00ff] fires", () => {
    const diags = scan('<div class="bg-[#ff00ff]"></div>');
    expect(fired(diags, "bg-[#ff00ff]")).toBe(true);
  });

  test("w-[42px] fires", () => {
    const diags = scan('<div class="w-[42px]"></div>');
    expect(fired(diags, "w-[42px]")).toBe(true);
  });

  test("text-[14px] fires", () => {
    const diags = scan('<span class="text-[14px]">hi</span>');
    expect(fired(diags, "text-[14px]")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §3 Stacked: variant + arbitrary value
// ---------------------------------------------------------------------------

describe("§3 Stacked variant + arbitrary value", () => {
  test("md:hover:p-[1.5rem] fires (stacked, includes both colon and bracket)", () => {
    const diags = scan('<div class="md:hover:p-[1.5rem]"></div>');
    expect(fired(diags, "md:hover:p-[1.5rem]")).toBe(true);
  });

  test("lg:bg-[#ff00ff] fires", () => {
    const diags = scan('<div class="lg:bg-[#ff00ff]"></div>');
    expect(fired(diags, "lg:bg-[#ff00ff]")).toBe(true);
  });

  test("sm:hover:bg-blue-500 fires (stacked supported variants — still TBD per §26.3)", () => {
    const diags = scan('<button class="sm:hover:bg-blue-500">x</button>');
    expect(fired(diags, "sm:hover:bg-blue-500")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §4 Negatives — base utilities never fire
// ---------------------------------------------------------------------------

describe("§4 Base utilities — must NOT fire", () => {
  test("p-4 does not fire (base utility, no variant shape)", () => {
    const diags = scan('<div class="p-4"></div>');
    expect(diags.length).toBe(0);
  });

  test("flex items-center justify-between (multiple base utilities) do not fire", () => {
    const diags = scan('<div class="flex items-center justify-between"></div>');
    expect(diags.length).toBe(0);
  });

  test("bg-blue-500 does not fire (no `:` or `[`)", () => {
    const diags = scan('<div class="bg-blue-500"></div>');
    expect(diags.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §5 Negatives — user-shaped classes (no `:` or `[`)
// ---------------------------------------------------------------------------

describe("§5 User classes — no Tailwind shape, must NOT fire", () => {
  test("my-custom-class does not fire", () => {
    const diags = scan('<div class="my-custom-class"></div>');
    expect(diags.length).toBe(0);
  });

  test("BEM-style (Block__element--modifier) does not fire", () => {
    const diags = scan('<div class="card__header--featured"></div>');
    expect(diags.length).toBe(0);
  });

  test("kebab-case user class with digits does not fire", () => {
    const diags = scan('<div class="user-card-2"></div>');
    expect(diags.length).toBe(0);
  });

  test("empty class= attribute produces no diagnostics", () => {
    const diags = scan('<div class=""></div>');
    expect(diags.length).toBe(0);
  });

  test("element with no class= attribute produces no diagnostics", () => {
    const diags = scan('<div></div><span>hi</span>');
    expect(diags.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §6 Mixed attribute — fires only on offenders
// ---------------------------------------------------------------------------

describe("§6 Mixed attribute — fires only on offenders", () => {
  test("p-4 md:p-8 my-custom — fires once for md:p-8 only", () => {
    const diags = scan('<div class="p-4 md:p-8 my-custom"></div>');
    expect(fired(diags, "md:p-8")).toBe(true);
    expect(diags.length).toBe(1);
  });

  test("p-4 dark:p-8 my-custom — fires once for dark:p-8", () => {
    const diags = scan('<div class="p-4 dark:p-8 my-custom"></div>');
    expect(fired(diags, "dark:p-8")).toBe(true);
    expect(diags.length).toBe(1);
  });

  test("p-4 p-[1rem] flex — fires once for p-[1rem] only", () => {
    const diags = scan('<div class="p-4 p-[1rem] flex"></div>');
    expect(fired(diags, "p-[1rem]")).toBe(true);
    expect(diags.length).toBe(1);
  });

  test("multiple offenders in one attribute fire once each", () => {
    const diags = scan('<div class="p-4 md:p-8 hover:bg-blue-500 my-custom"></div>');
    expect(diags.length).toBe(2);
    expect(fired(diags, "md:p-8")).toBe(true);
    expect(fired(diags, "hover:bg-blue-500")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §7 Diagnostic shape
// ---------------------------------------------------------------------------

describe("§7 Diagnostic shape", () => {
  test("diagnostic carries code, severity, message, className, line, column", () => {
    const diags = scan('<div class="md:p-4"></div>');
    expect(diags.length).toBe(1);
    const d = diags[0];
    expect(d.code).toBe("W-TAILWIND-001");
    expect(d.severity).toBe("warning");
    expect(d.className).toBe("md:p-4");
    expect(typeof d.line).toBe("number");
    expect(typeof d.column).toBe("number");
    expect(d.line).toBeGreaterThan(0);
    expect(d.column).toBeGreaterThan(0);
    expect(d.message).toContain("md:p-4");
    expect(d.message).toContain("SPEC-ISSUE-012");
  });

  test("message points adopters at base utility OR custom CSS rule", () => {
    const diags = scan('<div class="dark:p-4"></div>');
    const m = diags[0].message;
    expect(m).toMatch(/base utility class|own CSS rule/i);
  });
});

// ---------------------------------------------------------------------------
// §8 Multi-line / multi-attribute coverage
// ---------------------------------------------------------------------------

describe("§8 Multi-line / multi-attribute coverage", () => {
  test("two class= attributes on different lines both report", () => {
    const source =
      '<div class="md:p-4">\n' +
      '  <span class="p-[1rem]">hi</span>\n' +
      '</div>';
    const diags = scan(source);
    expect(fired(diags, "md:p-4")).toBe(true);
    expect(fired(diags, "p-[1rem]")).toBe(true);
    expect(diags.length).toBe(2);
  });

  test("diagnostics sorted by line then column", () => {
    const source =
      '<div class="md:p-4">\n' +
      '  <span class="p-[1rem]">hi</span>\n' +
      '</div>';
    const diags = scan(source);
    expect(diags.length).toBe(2);
    expect(diags[0].line).toBeLessThanOrEqual(diags[1].line);
    if (diags[0].line === diags[1].line) {
      expect(diags[0].column).toBeLessThan(diags[1].column);
    }
  });

  test("dedupe within a single class= attribute (same offender twice → once)", () => {
    const diags = scan('<div class="md:p-4 md:p-4"></div>');
    const count = diags.filter(d => d.className === "md:p-4").length;
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §9 Integration via compileScrml.lintDiagnostics
// ---------------------------------------------------------------------------

describe("§9 Integration: compileScrml lintDiagnostics field", () => {
  test("compileScrml surfaces W-TAILWIND-001 in lintDiagnostics", () => {
    const source = '<markup name="app">\n  <div class="md:p-4"></div>\n</>';
    const result = compileSource(source);
    const diags = result.lintDiagnostics || [];
    expect(diags.some(d => d.code === "W-TAILWIND-001" && d.className === "md:p-4")).toBe(true);
  });

  test("W-TAILWIND-001 is non-fatal — compilation still produces output", () => {
    const source = '<markup name="app">\n  <div class="md:p-4">x</div>\n</>';
    const result = compileSource(source);
    expect(result.errors.length).toBe(0);
    // Output exists for the file (HTML, client JS) — compilation was not blocked
    const outputs = [...result.outputs.values()];
    expect(outputs.length).toBe(1);
  });

  test("base-utility-only class strings produce no W-TAILWIND-001", () => {
    const source = '<markup name="app">\n  <div class="p-4 flex bg-blue-500">x</div>\n</>';
    const result = compileSource(source);
    const tailwindDiags = (result.lintDiagnostics || []).filter(d => d.code === "W-TAILWIND-001");
    expect(tailwindDiags.length).toBe(0);
  });
});
