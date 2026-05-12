/**
 * `bun scrml promote --match` safety-harness — Option B coverage (post-S86).
 *
 * Mirrors compiler/tests/commands/migrate-program-shape.test.js section 5b —
 * same shape, same bug, same fix. Ports the Option B (transactional in-place
 * rewrite + restore) safety-harness fix from migrate.js (commit 95bd7f9) to
 * promote.js#sanityCheckParse.
 *
 * Bug (pre-fix):
 *   `sanityCheckParse` staged the rewritten source under a unique tmp dir
 *   and invoked compileScrml with gather:false. For any importer with a
 *   relative `.scrml` import, MOD fired E-IMPORT-006 because the staged tmp
 *   dir did not contain the import target — the gate failed-closed on every
 *   multi-file route file.
 *
 * Fix (option B):
 *   Read backup -> write rewrite IN PLACE at original path -> compileScrml
 *   with gather:true -> ALWAYS restore from backup on exit. Crash window
 *   microseconds. Cross-file imports resolve naturally from the file's real
 *   on-disk position.
 *
 * Coverage:
 *   (1) positive — single-file (no imports) — regression of pre-fix happy path
 *   (2) positive — multi-file (cross-file imports) — THE FIX
 *   (3) crash recovery — bad rewrite returns ok:false; file restored
 *   (4) crash recovery — broken-import rewrite returns ok:false; file restored
 *   (5) on-disk invariant — dry-run leaves the file untouched even when
 *       the harness writes the rewrite mid-check (option-B restore path)
 *   (6) read-failure shape — sanityCheckParse on a non-existent path returns
 *       ok:false with a safety-harness error (no throw)
 *   (7) staging-write-failure shape — read-only target file returns ok:false
 *       (or throws restore-failure); content invariant preserved
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdirSync,
  rmSync,
  cpSync,
  readFileSync,
  writeFileSync,
  chmodSync,
  existsSync,
} from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import {
  promoteMatchOnFile,
  sanityCheckParse,
} from "../../src/commands/promote.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(
  __dirname,
  "..",
  "fixtures",
  "promote-multi-file-app",
);

let tmpDir;

function setupTmp() {
  tmpDir = join(
    tmpdir(),
    `scrml-promote-harness-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(tmpDir, { recursive: true });
}

function teardownTmp() {
  if (tmpDir && existsSync(tmpDir)) {
    // Best-effort: restore writability before rm in case a test chmod'd
    // anything read-only.
    try {
      chmodSync(tmpDir, 0o755);
    } catch {}
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Build a self-contained exhaustive-chain fixture (no cross-file imports).
// Used for the regression-guard test — the pre-fix code passed this case;
// post-fix must continue to pass it.
function selfContainedExhaustive() {
  const D = "$" + "{";
  return [
    "${",
    "  type Phase:enum = { Idle, Loading, Error, Success }",
    "  <phase>: Phase = .Idle",
    "}",
    "",
    "<div>",
    "  " + D,
    "    if (@phase is .Idle) {",
    "      <p>idle</p>",
    "    } else if (@phase is .Loading) {",
    "      <p>loading</p>",
    "    } else if (@phase is .Error) {",
    "      <p>error</p>",
    "    } else if (@phase is .Success) {",
    "      <p>success</p>",
    "    }",
    "  }",
    "</>",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 1. positive — single-file promotion: regression guard for pre-fix happy path
// ---------------------------------------------------------------------------

describe("§1 single-file promotion — regression guard (no cross-file imports)", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("self-contained exhaustive chain: gate passes; file rewritten in place", () => {
    const filePath = join(tmpDir, "self-contained.scrml");
    const original = selfContainedExhaustive();
    writeFileSync(filePath, original, "utf8");

    const r = promoteMatchOnFile(
      filePath,
      null,
      { dryRun: false, check: false },
      tmpDir,
    );

    expect(r.status).toBe("promoted");
    expect(r.count).toBeGreaterThan(0);
    const after = readFileSync(filePath, "utf8");
    expect(after).toContain("<match for=Phase on=@phase>");
    expect(after).not.toContain("if (@phase is .Idle)");
  });
});

// ---------------------------------------------------------------------------
// 2. positive — multi-file promotion: THE FIX (cross-file imports)
// ---------------------------------------------------------------------------

describe("§2 multi-file promotion — cross-file imports (THE FIX)", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("route file with cross-file import: gate passes; rewritten in place", () => {
    // Copy the checked-in fixture tree into a fresh tmp tree so we can rewrite
    // in place without mutating the source tree.
    cpSync(FIXTURES_DIR, tmpDir, { recursive: true });
    const route = join(tmpDir, "pages", "dashboard.scrml");
    const original = readFileSync(route, "utf8");

    // Sanity: fixture has the cross-file import and the exhaustive chain.
    expect(original).toContain(
      "import { label, APP_NAME } from '../models/labels.scrml'",
    );
    expect(original).toContain("if (@phase is .Idle)");

    const r = promoteMatchOnFile(
      route,
      null,
      { dryRun: false, check: false },
      tmpDir,
    );

    // Pre-fix: returns status 'failed' with reason mentioning E-IMPORT-006
    // (the safety-harness rejected the rewrite). Post-fix: gate passes.
    expect(r.status).toBe("promoted");
    expect(r.count).toBeGreaterThan(0);

    // On-disk: <match> block present; cross-file import preserved verbatim.
    const after = readFileSync(route, "utf8");
    expect(after).toContain("<match for=Phase on=@phase>");
    expect(after).toContain("<Idle>");
    expect(after).toContain("<Loading>");
    expect(after).toContain("<Error>");
    expect(after).toContain("<Success>");
    expect(after).toContain(
      "import { label, APP_NAME } from '../models/labels.scrml'",
    );
    expect(after).not.toContain("if (@phase is .Idle)");
  });

  test("dry-run on multi-file fixture: gate passes; file on disk unchanged", () => {
    // Option-B's transactional flow writes the rewrite to the file mid-check
    // and then restores from the in-memory backup. Verify the restore path
    // runs in dry-run mode (where the caller explicitly does not want any
    // on-disk change).
    cpSync(FIXTURES_DIR, tmpDir, { recursive: true });
    const route = join(tmpDir, "pages", "dashboard.scrml");
    const before = readFileSync(route, "utf8");

    const r = promoteMatchOnFile(
      route,
      null,
      { dryRun: true, check: false },
      tmpDir,
    );

    // Dry-run with promotable chain: status 'promoted' + diff returned, but
    // file on disk MUST be byte-identical to the pre-call content (option-B
    // restore-from-backup invariant; dry-run never leaves the file mutated).
    expect(r.status).toBe("promoted");
    expect(typeof r.diff).toBe("string");
    const after = readFileSync(route, "utf8");
    expect(after).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// 3. crash recovery — file is always restored
// ---------------------------------------------------------------------------

describe("§3 crash recovery — file restored on harness exit", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("compile fails on unclosed-block rewrite: file restored from backup", () => {
    // sanityCheckParse should restore the file regardless of how the inner
    // compile call exits. Feed a rewrite with an unclosed dollar-brace block
    // — block-splitter reliably reports E-CTX-003 (unclosed 'logic' block).
    // The gate returns ok:false; the file on disk MUST be the original backup.
    const filePath = join(tmpDir, "crashy.scrml");
    const original = "<program>\n  <div>hello</div>\n</program>";
    writeFileSync(filePath, original, "utf8");

    // The literal source we feed: a `${` that is never closed.
    const badRewrite = "${ this never closes ";
    const r = sanityCheckParse(badRewrite, filePath);

    expect(r.ok).toBe(false);
    // Critical invariant: the file on disk is the original, not the rewrite,
    // regardless of the gate outcome.
    expect(readFileSync(filePath, "utf8")).toBe(original);
  });

  test("compile fails on broken-import rewrite (E-IMPORT-006): file restored", () => {
    // A more realistic crash-adjacent scenario: rewrite introduces a broken
    // relative import. Compile returns ok:false with a real error; file must
    // be restored from backup.
    const filePath = join(tmpDir, "broken-import.scrml");
    const original = "<program>\n  ${ <count> = 0 }\n  <div>x</div>\n</program>";
    writeFileSync(filePath, original, "utf8");

    const rewritten =
      "<program>\n  ${ import { gone } from \"./nonexistent.scrml\" }\n  <div>broken</div>\n</program>";
    const r = sanityCheckParse(rewritten, filePath);

    expect(r.ok).toBe(false);
    // File on disk is the original — NOT the rewrite that fired E-IMPORT-006.
    expect(readFileSync(filePath, "utf8")).toBe(original);
  });

  // The brief calls out synthetic write-failure mid-stage. Bun's `fs` module
  // is not trivially monkey-patchable mid-test (writeFileSync is captured at
  // import time in promote.js), so we exercise the staging-write-error PATH
  // by chmod'ing the target FILE to 0444. On the harness's flow:
  //   1. readFileSync(originalPath) succeeds (file is readable)
  //   2. writeFileSync(originalPath, rewritten) fails with EACCES
  //   3. finally: writeFileSync(originalPath, originalContent) ALSO fails
  //      with EACCES (file is still 0444) — restore-failure path throws.
  // We accept BOTH outcomes (depends on filesystem semantics on the
  // running platform): ok:false with staging-write error, OR restore-failure
  // throw. The content invariant must hold either way.
  test("staging-write-failure on read-only file: error reported; content preserved", () => {
    const filePath = join(tmpDir, "readonly.scrml");
    const original = "<program>\n  <div>x</div>\n</program>";
    writeFileSync(filePath, original, "utf8");
    chmodSync(filePath, 0o444);

    let outcome;
    try {
      outcome = sanityCheckParse("REWRITTEN_CONTENT", filePath);
    } catch (e) {
      outcome = { thrown: true, message: e.message };
    }

    // Restore writability for teardown.
    try {
      chmodSync(filePath, 0o644);
    } catch {}
    const contentAfter = readFileSync(filePath, "utf8");

    if (outcome && outcome.thrown) {
      // Restore-failure path — both the staging write AND the restore write
      // failed (file is 0444). Harness contract: throw rather than silently
      // leave a broken state. File content is still 'original' because the
      // staging write also failed (no data was actually written).
      expect(outcome.message).toContain("safety-harness");
      expect(outcome.message).toContain("failed to restore");
      // The staging write failed too, so on-disk is still the original.
      expect(contentAfter).toBe(original);
    } else {
      // Staging-write-failure path: ok:false + diagnostic message + file
      // content unchanged.
      expect(outcome.ok).toBe(false);
      expect(
        outcome.errors.some((e) =>
          (e.message || "").includes("safety-harness"),
        ),
      ).toBe(true);
      expect(contentAfter).toBe(original);
    }
  });

  test("read-failure on nonexistent path: returns ok:false; no file created", () => {
    const ghost = join(tmpDir, "subdir", "does-not-exist.scrml");
    const r = sanityCheckParse("anything", ghost);

    expect(r.ok).toBe(false);
    expect(r.errors).toBeDefined();
    expect(r.errors.length).toBe(1);
    expect(r.errors[0].message).toContain("safety-harness");
    expect(r.errors[0].message).toContain("cannot read original file");
    // We never wrote anything: the ghost path still doesn't exist.
    expect(existsSync(ghost)).toBe(false);
  });
});
