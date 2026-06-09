/**
 * stdlib-time-now-capability — scrml:time.now() capability gate (DD1 Fork 1, 1C)
 *
 * now() reads the host wall clock → NON-DETERMINISTIC (class-C IO, §48.3.4).
 * The capability rule:
 *   - server function body → OK
 *   - function (event-handler / effect class) body → OK
 *   - pure `fn` / `pure function` body → E-FN-004 (rejected)
 *   - a USER's own `function now() {}` called in a `function` → NOT falsely gated
 *
 * The gate is binding-aware: it fires only on a bare call to a local name bound
 * to `now` from `import ... 'scrml:time'`. It does not match member access
 * (`x.now()`) or substring shapes (`nowInTimezone()`).
 *
 * §C also pins the shim: now() returns a number close to Date.now().
 */

import { describe, test, expect } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";
import * as time from "../../runtime/stdlib/time.js";

let TMP;
function ensureTmp() {
  if (!TMP) TMP = mkdtempSync(join(tmpdir(), "time-now-cap-"));
  return TMP;
}
function fx(relPath, source) {
  const abs = join(ensureTmp(), relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, source);
  return abs;
}
function compile(rel, source) {
  const src = fx(rel, source);
  return compileScrml({
    inputFiles: [src],
    outputDir: join(ensureTmp(), dirname(rel), "dist"),
    write: false,
    log: () => {},
  });
}
function efn004(result) {
  return [...(result.errors || []), ...(result.warnings || [])].filter(
    (d) => d.code === "E-FN-004",
  );
}

describe("§A: scrml:time.now() capability gate", () => {
  test("N1: now() in a `server function` → OK (no E-FN-004)", () => {
    const result = compile("n1/app.scrml", [
      "${",
      "    import { now } from 'scrml:time'",
      "    server function stamp() {",
      "        return now()",
      "    }",
      "}",
      'h1 "now in server fn"',
    ].join("\n"));
    expect(efn004(result)).toEqual([]);
  });

  test("N2: now() in a `function` (event-handler / effect class) → OK", () => {
    const result = compile("n2/app.scrml", [
      "${",
      "    import { now } from 'scrml:time'",
      "    function onTick() {",
      "        return now()",
      "    }",
      "    server function _use() { return onTick() }",
      "}",
      'h1 "now in function"',
    ].join("\n"));
    expect(efn004(result)).toEqual([]);
  });

  test("N3: now() in a pure `fn` body → E-FN-004", () => {
    const result = compile("n3/app.scrml", [
      "${",
      "    import { now } from 'scrml:time'",
      "    fn elapsed(then) {",
      "        return now() - then",
      "    }",
      "    server function _use() { return elapsed(0) }",
      "}",
      'h1 "now in fn — should reject"',
    ].join("\n"));
    const hits = efn004(result);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    // The message names the offending callee + points at function/server function.
    expect(hits[0].message).toContain("now()");
    expect(hits[0].message.toLowerCase()).toContain("non-deterministic");
  });

  test("N3b: now() purity-gate surface is UNIFORM with the host non-det gate", () => {
    // The §48 fn-body prohibition walker (E-FN-001..E-FN-005, incl. the host
    // NON_DET_CALLS gate that catches Date.now / Math.random) fires for the
    // CANONICAL pure form `fn` only — it does NOT fire inside a `pure function`
    // body TODAY. That is a pre-existing, UNIFORM gap: Date.now() / Math.random()
    // in a `pure function` are equally un-gated. The now() gate is deliberately
    // wired to that same surface (it does not single out now() to be stricter
    // than the host non-det calls). This test pins that uniformity: now() and
    // Date.now() behave IDENTICALLY inside a `pure function`. Closing the
    // `pure function` purity-enforcement gap (for the whole §48 prohibition set,
    // not just now()) is a separate follow-on — see progress.md DEFERRED.
    const withNow = compile("n3b-now/app.scrml", [
      "${",
      "    import { now } from 'scrml:time'",
      "    pure function elapsedP(then) {",
      "        return now() - then",
      "    }",
      "    server function _use() { return elapsedP(0) }",
      "}",
      'h1 "now in pure function"',
    ].join("\n"));
    const withDateNow = compile("n3b-date/app.scrml", [
      "${",
      "    pure function elapsedD(then) {",
      "        return Date.now() - then",
      "    }",
      "    server function _use() { return elapsedD(0) }",
      "}",
      'h1 "Date.now in pure function"',
    ].join("\n"));
    // Same surface: whatever Date.now() does in a `pure function`, now() does too.
    expect(efn004(withNow).length).toBe(efn004(withDateNow).length);
  });

  test("N4: a USER's own `function now() {}` called in a `function` is NOT falsely gated", () => {
    const result = compile("n4/app.scrml", [
      "${",
      "    function now() { return 42 }",
      "    fn usesUserNow() {",
      "        return now() + 1",
      "    }",
      "    server function _use() { return usesUserNow() }",
      "}",
      'h1 "user now — no E-FN-004"',
    ].join("\n"));
    // No import of now from scrml:time → the binding-aware gate must not fire.
    expect(efn004(result)).toEqual([]);
  });

  test("N5: aliased import `now as currentTime` in a pure `fn` → E-FN-004 on the alias", () => {
    const result = compile("n5/app.scrml", [
      "${",
      "    import { now as currentTime } from 'scrml:time'",
      "    fn elapsedA(then) {",
      "        return currentTime() - then",
      "    }",
      "    server function _use() { return elapsedA(0) }",
      "}",
      'h1 "aliased now in fn — should reject"',
    ].join("\n"));
    const hits = efn004(result);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].message).toContain("currentTime()");
  });

  test("N6: a DIFFERENT scrml:time import (formatDate) in a pure `fn` is NOT gated by the now() rule", () => {
    const result = compile("n6/app.scrml", [
      "${",
      "    import { formatDate } from 'scrml:time'",
      "    fn label(ts) {",
      "        return formatDate(ts)",
      "    }",
      "    server function _use() { return label(0) }",
      "}",
      'h1 "formatDate in fn — pure, no E-FN-004"',
    ].join("\n"));
    expect(efn004(result)).toEqual([]);
  });
});

describe("§C: scrml:time.now() shim behavior", () => {
  test("N7: now() returns a number close to Date.now()", () => {
    const before = Date.now();
    const v = time.now();
    const after = Date.now();
    expect(typeof v).toBe("number");
    expect(v).toBeGreaterThanOrEqual(before);
    expect(v).toBeLessThanOrEqual(after);
  });
});
