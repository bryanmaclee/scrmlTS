/**
 * request-tag-and-server-fn-reactive.test.js — `<request>` + `@var = serverFn()`
 *
 * Regression: giti inbound 2026-04-20 GITI-001.
 *
 * Two coupled issues in giti's repro:
 *
 * 1. `@data = loadValue()` (loadValue is a `server function`) emitted
 *    `_scrml_reactive_set("data", _scrml_fetch_loadValue_N())` — storing
 *    the UNAWAITED Promise. Readers of `@data` saw `[object Promise]` or
 *    undefined on the `.value` access.
 *
 * 2. `<request id="req1">` without a `url=` attribute emitted a full
 *    fetch machinery whose `fetch(urlExpr, ...)` call had urlExpr=`""`.
 *    The empty-URL fetch ran on mount, silently failed, and added
 *    runtime noise. The tag was being used as a wrapper around a body
 *    that already did its own fetch (`\${ @data = loadValue() }`); the
 *    tag's own machinery was redundant.
 *
 * Fixes (emit-client.ts + emit-reactive-wiring.ts):
 *   - Post-emit rewrite: `_scrml_reactive_set("X", _scrml_fetch_Y_N(...))`
 *     is wrapped in `(async () => _scrml_reactive_set("X", await
 *     _scrml_fetch_Y_N(...)))();` when Y is a server fn (fetch stub or
 *     CPS wrapper per fnNameMap).
 *   - emitRequestNode skips the whole fetch machinery emission when no
 *     `url=` attribute is present.
 *
 * Coverage:
 *   §1  `@data = serverFn()` wrapped in async IIFE with await
 *   §2  emitted JS parses (no SyntaxError)
 *   §3  `<request>` without url= emits no fetch machinery
 *   §4  `<request url="...">` still emits the machinery (regression guard)
 *   §5  Non-server-fn assignment stays synchronous (regression guard)
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/request-tag");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

function fix(name, src) {
  const path = join(FIXTURE_DIR, name);
  writeFileSync(path, src);
  return path;
}

let gitiFx, urlFx, plainFx;

beforeAll(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true });

  gitiFx = fix("giti-001.scrml", `<program>

\${
  server function loadValue() {
    lift { value: 42 }
  }
}

<div>
  <request id="req1">
    \${ @data = loadValue() }
  </>
  <p>\${@data}</p>
</div>

</program>
`);

  urlFx = fix("request-with-url.scrml", `<program>

\${
  @items = []
}

<request id="list" url="/api/items">
  \${ @items = [] }
</>
<p>\${@items.length}</p>

</program>
`);

  plainFx = fix("plain-set.scrml", `<program>

\${
  @count = 0
  function bump() { @count = @count + 1 }
}

<button onclick=bump()>inc</button>
<p>\${@count}</p>

</program>
`);
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

function compile(path) {
  return compileScrml({ inputFiles: [path], outputDir: FIXTURE_OUTPUT, write: false });
}

// ---------------------------------------------------------------------------
// §1: `@data = serverFn()` is awaited
// ---------------------------------------------------------------------------

describe("§1: GITI-001 — `@data = serverFn()` awaited before reactive set", () => {
  test("compile succeeds", () => {
    const result = compile(gitiFx);
    expect(result.errors).toEqual([]);
  });

  test("reactive-set of a server-fn call is wrapped in async IIFE with await", () => {
    const result = compile(gitiFx);
    const js = result.outputs.get(gitiFx).clientJs;
    // The new wrapped form
    expect(js).toMatch(/\(async\s*\(\s*\)\s*=>\s*_scrml_reactive_set\("data",\s*await\s+_scrml_fetch_loadValue_\d+\(\)\s*\)\)\(\s*\);/);
    // Must NOT be the unawaited form
    expect(js).not.toMatch(/_scrml_reactive_set\("data",\s*_scrml_fetch_loadValue_\d+\(\s*\)\s*\);/);
  });
});

// ---------------------------------------------------------------------------
// §2: emitted JS parses
// ---------------------------------------------------------------------------

describe("§2: emitted JS parses as a module", () => {
  test("GITI-001 output parses (new Function)", () => {
    const result = compile(gitiFx);
    const js = result.outputs.get(gitiFx).clientJs;
    const stripped = js.replace(/^\s*import\s[^;]*;/gm, "");
    expect(() => new Function(stripped)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// §3: `<request>` without url= emits no fetch machinery
// ---------------------------------------------------------------------------

describe("§3: `<request id=\"req1\">` without url= emits no fetch", () => {
  test("no empty-URL fetch call is emitted", () => {
    const result = compile(gitiFx);
    const js = result.outputs.get(gitiFx).clientJs;
    // The buggy pattern was `fetch("", { method: "GET" })`. Must not appear.
    expect(js).not.toMatch(/fetch\(""\s*,\s*\{\s*method:\s*"GET"\s*\}/);
    // The full request-state vars must also be absent
    expect(js).not.toContain("_scrml_request_req1_fetch");
  });
});

// ---------------------------------------------------------------------------
// §4: `<request url="...">` still emits fetch machinery
// ---------------------------------------------------------------------------

describe("§4: `<request url=\"/api/items\">` still emits the machinery", () => {
  test("regression: tag with url= produces fetch function referencing the URL", () => {
    const result = compile(urlFx);
    expect(result.errors).toEqual([]);
    const js = result.outputs.get(urlFx).clientJs;
    expect(js).toContain("_scrml_request_list_fetch");
    expect(js).toContain('"/api/items"');
  });
});

// ---------------------------------------------------------------------------
// §5: Non-server-fn reactive-set stays synchronous
// ---------------------------------------------------------------------------

describe("§5: `@count = @count + 1` stays synchronous (regression guard)", () => {
  test("plain reactive mutation does NOT get the async IIFE wrapper", () => {
    const result = compile(plainFx);
    expect(result.errors).toEqual([]);
    const js = result.outputs.get(plainFx).clientJs;
    // The count mutation must appear as a plain reactive-set
    expect(js).toContain('_scrml_reactive_set("count"');
    // And NOT inside an async IIFE
    expect(js).not.toMatch(/\(async\s*\(\s*\)\s*=>\s*_scrml_reactive_set\("count"/);
  });
});
