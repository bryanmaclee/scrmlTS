/**
 * F-BUILD-002: generateServerEntry deduplicates re-exported names.
 *
 * Coverage for the paired-dispatch fix from
 *   docs/changes/f-compile-002-build-002/diagnosis.md
 *
 * Pre-fix behavior (the bug):
 *   `emit-server.ts:166` emits `export const _scrml_session_destroy = { ... }`
 *   from EVERY server.js with `authMiddlewareEntry`. The build's
 *   `generateServerEntry` then walks each server.js and emits one
 *   `import { _scrml_session_destroy } from "./X.server.js"` per module.
 *   Multiple imports of the same identifier into a single entry module is a
 *   JavaScript SyntaxError ("Identifier '_scrml_session_destroy' has already
 *   been declared") — `bun run` and `node --check` both reject it on load.
 *
 *   Additionally the routes registry array was emitted as
 *   `routes = [_scrml_session_destroy, _scrml_session_destroy, ...]` — wasteful
 *   even if it had loaded, since each entry registers the same handler at the
 *   same path/method.
 *
 * Post-fix behavior:
 *   `generateServerEntry` tracks seen names across modules. The first module
 *   that exports a name wins — subsequent modules' duplicates are filtered
 *   from their import line. If a module's entire name list overlaps with
 *   already-seen names, no import line is emitted for it. The routes registry
 *   is also de-duplicated.
 *
 * Tests:
 *   §1. Two modules each exporting `_scrml_session_destroy` → entry has
 *       exactly one `import { _scrml_session_destroy }` line.
 *   §2. Modules with mixed names (one shared, others unique) → unique names
 *       still imported; shared name imported once from the first module.
 *   §3. The generated entry is `node --check`-clean (no SyntaxError).
 *   §4. The routes registry has each name exactly once.
 *   §5. WS handler names are also de-duplicated when shared across modules.
 *   §6. A module whose entire export set is duplicated — no import line is
 *       emitted (no syntactically empty `import {}` line).
 */

import { describe, test, expect } from "bun:test";
import { generateServerEntry } from "../../src/commands/build.js";
import { writeFileSync, mkdirSync, rmSync, existsSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { execSync } from "child_process";

// ---------------------------------------------------------------------------
// §1. Single shared name across two modules → imported exactly once
// ---------------------------------------------------------------------------

describe("F-BUILD-002 §1: shared `_scrml_session_destroy` deduped to one import", () => {
  test("two modules with the same name → exactly one import line for that name", () => {
    const modules = [
      { filename: "page-a.server.js", routeNames: ["_scrml_session_destroy", "_scrml_route_a"], wsHandlerNames: [] },
      { filename: "page-b.server.js", routeNames: ["_scrml_session_destroy", "_scrml_route_b"], wsHandlerNames: [] },
    ];
    const entry = generateServerEntry(modules);

    // Count occurrences of the duplicate name in import statements.
    const importLines = entry.split("\n").filter(l => l.match(/^\s*import\b/));
    const dupCount = importLines.filter(l => l.includes("_scrml_session_destroy")).length;
    expect(dupCount).toBe(1);

    // The two unique names still appear in their own modules' imports.
    expect(entry).toMatch(/import\s+\{[^}]*_scrml_route_a[^}]*\}\s+from\s+"\.\/page-a\.server\.js"/);
    expect(entry).toMatch(/import\s+\{[^}]*_scrml_route_b[^}]*\}\s+from\s+"\.\/page-b\.server\.js"/);
  });
});

// ---------------------------------------------------------------------------
// §2. First-importer wins — the shared name is imported from page-a.server.js
// ---------------------------------------------------------------------------

describe("F-BUILD-002 §2: first-importer wins for shared names", () => {
  test("`_scrml_session_destroy` is imported from the FIRST module that exports it", () => {
    const modules = [
      { filename: "first.server.js", routeNames: ["_scrml_session_destroy"], wsHandlerNames: [] },
      { filename: "second.server.js", routeNames: ["_scrml_session_destroy"], wsHandlerNames: [] },
      { filename: "third.server.js", routeNames: ["_scrml_session_destroy"], wsHandlerNames: [] },
    ];
    const entry = generateServerEntry(modules);

    // First module gets the import.
    expect(entry).toMatch(/import\s+\{\s*_scrml_session_destroy\s*\}\s+from\s+"\.\/first\.server\.js"/);
    // Second and third do NOT (they have nothing else to import; nothing to emit).
    expect(entry).not.toMatch(/import\s+\{[^}]*_scrml_session_destroy[^}]*\}\s+from\s+"\.\/second\.server\.js"/);
    expect(entry).not.toMatch(/import\s+\{[^}]*_scrml_session_destroy[^}]*\}\s+from\s+"\.\/third\.server\.js"/);
  });
});

// ---------------------------------------------------------------------------
// §3. The generated entry is `node --check`-clean
// ---------------------------------------------------------------------------

describe("F-BUILD-002 §3: generated entry parses without SyntaxError", () => {
  test("write entry to a temp file and verify `node --check` accepts it", () => {
    const modules = [
      { filename: "a.server.js", routeNames: ["_scrml_session_destroy", "_scrml_route_a"], wsHandlerNames: [] },
      { filename: "b.server.js", routeNames: ["_scrml_session_destroy", "_scrml_route_b"], wsHandlerNames: [] },
      { filename: "c.server.js", routeNames: ["_scrml_session_destroy"], wsHandlerNames: [] },
    ];
    const entry = generateServerEntry(modules);

    // Write to temp file and check via node --check (syntax-only validation).
    const dir = mkdtempSync(join(tmpdir(), "f-build-002-"));
    try {
      const entryPath = join(dir, "_server.js");
      writeFileSync(entryPath, entry);
      // node --check exits 0 if syntax is valid, non-zero on error.
      // We capture stderr to surface the SyntaxError if any.
      let ok = true;
      let err = "";
      try {
        execSync(`node --check "${entryPath}"`, { stdio: ["ignore", "ignore", "pipe"] });
      } catch (e) {
        ok = false;
        err = e.stderr?.toString() ?? String(e);
      }
      expect({ ok, err }).toEqual({ ok: true, err: "" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// §4. Routes registry is de-duplicated
// ---------------------------------------------------------------------------

describe("F-BUILD-002 §4: routes registry de-duplicates shared names", () => {
  test("`_scrml_session_destroy` appears exactly once in the routes array", () => {
    const modules = [
      { filename: "a.server.js", routeNames: ["_scrml_session_destroy"], wsHandlerNames: [] },
      { filename: "b.server.js", routeNames: ["_scrml_session_destroy"], wsHandlerNames: [] },
    ];
    const entry = generateServerEntry(modules);

    // Pull out the const routes = [...] block. The dedup operates on entry
    // construction, so the source-of-truth is the routes array body.
    const routesMatch = entry.match(/const routes = \[\n([\s\S]*?)\n\];/);
    expect(routesMatch).not.toBeNull();
    const body = routesMatch[1];
    // The destroy name should appear exactly once.
    const occurrences = body.split("\n")
      .filter(l => l.trim().replace(/,$/, "") === "_scrml_session_destroy");
    expect(occurrences.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §5. WS handler names are de-duplicated
// ---------------------------------------------------------------------------

describe("F-BUILD-002 §5: WS handler names also de-duplicate", () => {
  test("two modules sharing a ws handler name → one import line for it", () => {
    const modules = [
      { filename: "a.server.js", routeNames: [], wsHandlerNames: ["_scrml_ws_handlers"] },
      { filename: "b.server.js", routeNames: [], wsHandlerNames: ["_scrml_ws_handlers"] },
    ];
    const entry = generateServerEntry(modules);

    const importLines = entry.split("\n").filter(l => l.match(/^\s*import\b.*_scrml_ws_handlers/));
    expect(importLines.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §6. Module whose entire export set is duplicated → no empty import emitted
// ---------------------------------------------------------------------------

describe("F-BUILD-002 §6: empty-after-dedup module emits no import line", () => {
  test("when all of a module's names are already imported, no `import {} from` is emitted", () => {
    const modules = [
      { filename: "first.server.js", routeNames: ["_scrml_session_destroy"], wsHandlerNames: [] },
      // second only exports the same name → after dedup, nothing left to import.
      { filename: "second.server.js", routeNames: ["_scrml_session_destroy"], wsHandlerNames: [] },
    ];
    const entry = generateServerEntry(modules);

    // No empty `import {} from` (some bundlers tolerate this; we should never
    // emit it because it's unnecessary noise and breaks tree-shake heuristics).
    expect(entry).not.toMatch(/import\s*\{\s*\}\s*from/);
    // Specifically: no import line referencing second.server.js.
    expect(entry).not.toMatch(/from\s+"\.\/second\.server\.js"/);
  });
});

// ---------------------------------------------------------------------------
// §7. No false positives — modules with completely unique names are unchanged
// ---------------------------------------------------------------------------

describe("F-BUILD-002 §7: regression — unique-named modules unaffected", () => {
  test("two modules with disjoint name sets each get their own import line", () => {
    const modules = [
      { filename: "a.server.js", routeNames: ["_scrml_route_a", "_scrml_route_a2"], wsHandlerNames: [] },
      { filename: "b.server.js", routeNames: ["_scrml_route_b"], wsHandlerNames: [] },
    ];
    const entry = generateServerEntry(modules);

    expect(entry).toMatch(/import\s+\{\s*_scrml_route_a,\s*_scrml_route_a2\s*\}\s+from\s+"\.\/a\.server\.js"/);
    expect(entry).toMatch(/import\s+\{\s*_scrml_route_b\s*\}\s+from\s+"\.\/b\.server\.js"/);
  });
});
