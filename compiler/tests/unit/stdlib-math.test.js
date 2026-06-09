/**
 * stdlib-math — unit tests for scrml:math (DD1 Fork 1, 1A)
 *
 * Two surfaces:
 *   §A  Behavioral — import the real runtime shim (compiler/runtime/stdlib/math.js)
 *       and exercise every exported function. The shim is the sanctioned host
 *       Math.* / Number.* touch; these tests pin its behavior.
 *   §B  Compile-level — an adopter `import { round } from 'scrml:math'` used in a
 *       pure `fn` AND a `function` compiles clean (no E-FN-003 / E-FN-004) and
 *       the server-side output rewrites `scrml:math` → `./_scrml/math.js`.
 *
 * The §A function set mirrors stdlib/math/index.scrml exports exactly.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, mkdtempSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";
import * as math from "../../runtime/stdlib/math.js";

// ---------------------------------------------------------------------------
// §A — behavioral (against the real shim)
// ---------------------------------------------------------------------------

describe("scrml:math — round / floor / ceil", () => {
  test("M1: round ties toward +Infinity", () => {
    expect(math.round(2.4)).toBe(2);
    expect(math.round(2.5)).toBe(3);
    expect(math.round(-2.5)).toBe(-2);
  });
  test("M2: floor toward -Infinity", () => {
    expect(math.floor(2.9)).toBe(2);
    expect(math.floor(-2.1)).toBe(-3);
  });
  test("M3: ceil toward +Infinity", () => {
    expect(math.ceil(2.1)).toBe(3);
    expect(math.ceil(-2.9)).toBe(-2);
  });
});

describe("scrml:math — abs", () => {
  test("M4: negative → positive", () => {
    expect(math.abs(-5)).toBe(5);
  });
  test("M5: positive passthrough; zero", () => {
    expect(math.abs(5)).toBe(5);
    expect(math.abs(0)).toBe(0);
  });
});

describe("scrml:math — min / max", () => {
  test("M6: scalar args", () => {
    expect(math.min(3, 1, 2)).toBe(1);
    expect(math.max(3, 1, 2)).toBe(3);
  });
  test("M7: spread array (mirrors Math.min/max ...arr)", () => {
    expect(math.min(...[5, 2, 8])).toBe(2);
    expect(math.max(...[5, 2, 8])).toBe(8);
  });
  test("M8: two-arg pairwise (the common corpus shape)", () => {
    expect(math.min(10, 4)).toBe(4);
    expect(math.max(10, 4)).toBe(10);
  });
});

describe("scrml:math — clamp", () => {
  test("M9: in-range passthrough", () => {
    expect(math.clamp(5, 0, 10)).toBe(5);
  });
  test("M10: below floor", () => {
    expect(math.clamp(-3, 0, 10)).toBe(0);
  });
  test("M11: above ceiling", () => {
    expect(math.clamp(99, 0, 10)).toBe(10);
  });
});

describe("scrml:math — parseInt", () => {
  test("M12: default radix 10", () => {
    expect(math.parseInt("42")).toBe(42);
  });
  test("M13: explicit radix 16", () => {
    expect(math.parseInt("0xFF", 16)).toBe(255);
  });
  test("M14: leading-numeric prefix", () => {
    expect(math.parseInt("10px")).toBe(10);
  });
  test("M15: non-numeric → NaN", () => {
    expect(math.isNaN(math.parseInt("abc"))).toBe(true);
  });
  test("M16: no implicit-octal surprise on leading zero", () => {
    expect(math.parseInt("010")).toBe(10);
  });
});

describe("scrml:math — parseFloat", () => {
  test("M17: decimal", () => {
    expect(math.parseFloat("3.14")).toBe(3.14);
  });
  test("M18: trailing unit", () => {
    expect(math.parseFloat("1.5kg")).toBe(1.5);
  });
  test("M19: non-numeric → NaN", () => {
    expect(math.isNaN(math.parseFloat("abc"))).toBe(true);
  });
});

describe("scrml:math — toNumber", () => {
  test("M20: numeric string", () => {
    expect(math.toNumber("42")).toBe(42);
    expect(math.toNumber("3.14")).toBe(3.14);
  });
  test("M21: empty string → 0 (whole-value coercion, unlike parseInt)", () => {
    expect(math.toNumber("")).toBe(0);
  });
  test("M22: non-numeric → NaN", () => {
    expect(math.isNaN(math.toNumber("abc"))).toBe(true);
  });
});

describe("scrml:math — isNaN (Number.isNaN, no coercion)", () => {
  test("M23: NaN value → true", () => {
    expect(math.isNaN(math.toNumber("abc"))).toBe(true);
  });
  test("M24: real number → false", () => {
    expect(math.isNaN(42)).toBe(false);
  });
  test("M25: numeric string is NOT coerced → false", () => {
    expect(math.isNaN("42")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §B — compile-level (adopter import + pure-fn callability + shim rewrite)
// ---------------------------------------------------------------------------

let TMP;
beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "stdlib-math-"));
});
afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function fx(relPath, source) {
  const abs = join(TMP, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, source);
  return abs;
}

describe("§B: scrml:math compile-level", () => {
  test("M26: round() inside a pure `fn` body compiles clean — no E-FN-003 / E-FN-004", () => {
    const src = fx("m26/app.scrml", [
      "${",
      "    import { round, abs } from 'scrml:math'",
      "    fn netCents(dollars) {",
      "        return round(abs(dollars) * 100)",
      "    }",
      "    server function _use() { return netCents(1.255) }",
      "}",
      'h1 "math in pure fn"',
    ].join("\n"));

    const result = compileScrml({
      inputFiles: [src],
      outputDir: join(TMP, "m26", "dist"),
      write: true,
      log: () => {},
    });

    expect(result.errors).toEqual([]);
    const fnErrs = (result.errors || []).filter(
      (e) => e.code === "E-FN-003" || e.code === "E-FN-004",
    );
    expect(fnErrs).toEqual([]);
  });

  test("M27: clamp() inside a `function` (event-handler-class) body compiles clean", () => {
    const src = fx("m27/app.scrml", [
      "${",
      "    import { clamp } from 'scrml:math'",
      "    function _bound(x) {",
      "        return clamp(x, 0, 10)",
      "    }",
      "    server function _use() { return _bound(5) }",
      "}",
      'h1 "math in function"',
    ].join("\n"));

    const result = compileScrml({
      inputFiles: [src],
      outputDir: join(TMP, "m27", "dist"),
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);
  });

  test("M28: server-side output rewrites scrml:math → ./_scrml/math.js + shim copied", () => {
    const outDir = join(TMP, "m28", "dist");
    const src = fx("m28/app.scrml", [
      "${",
      "    import { parseInt, toNumber } from 'scrml:math'",
      "    server function _coerce(s) {",
      "        return parseInt(s, 10) + toNumber(s)",
      "    }",
      "}",
      'h1 "math shim rewrite"',
    ].join("\n"));

    const result = compileScrml({
      inputFiles: [src],
      outputDir: outDir,
      write: true,
      log: () => {},
    });

    expect(result.errors).toEqual([]);
    expect(existsSync(join(outDir, "_scrml", "math.js"))).toBe(true);

    const serverJs = readFileSync(join(outDir, "app.server.js"), "utf8");
    expect(serverJs).toContain('from "./_scrml/math.js"');
    expect(serverJs).not.toContain('from "scrml:math"');

    const missing = (result.warnings || []).filter(
      (w) => w.code === "W-STDLIB-SHIM-MISSING" && w.message.includes("scrml:math"),
    );
    expect(missing).toEqual([]);
  });
});
