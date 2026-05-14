/**
 * Tests for `scrml generate auth` subcommand.
 *
 * Paired with Sub-task A (W-AUTH-LOGIN-MISSING warning); ships together
 * in v0.2.x per OQ-3 ratification (docs/changes/03-contact-book-auth-
 * redirect-SCOPING/SCOPING.md §5).
 *
 * Sections:
 *  §1  Trivial generate — empty CWD writes pages/auth/login.scrml.
 *  §2  Idempotency — running twice does not clobber the first write.
 *  §3  --target / --target-dir overrides — output location respects flags.
 *  §4  DB integration — <db src="..."> in app.scrml propagates into template.
 *  §5  Unknown type / bad args — error exits with non-zero exit code.
 *  §6  Template shape — generated file has the expected canonical primitives
 *      (use of `not`, `<page auth="optional">`, `verifyPassword`).
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// ---------------------------------------------------------------------------
// Temp directory helpers
// ---------------------------------------------------------------------------

let tmpDir;

function setupTmp() {
  tmpDir = join(tmpdir(), `scrml-generate-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tmpDir, { recursive: true });
}

function teardownTmp() {
  if (tmpDir && existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Run runGenerate with cwd set to tmpDir.
 * Captures stdout/stderr output; intercepts process.exit so tests can
 * assert on error-path behaviour without aborting the runner.
 */
async function runGenerateInTmp(args = []) {
  const origCwd = process.cwd();
  process.chdir(tmpDir);

  const logs = [];
  const warns = [];
  const errors = [];
  let exitCode = null;

  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;
  const origExit = process.exit;

  console.log = (...a) => logs.push(a.join(" "));
  console.warn = (...a) => warns.push(a.join(" "));
  console.error = (...a) => errors.push(a.join(" "));
  process.exit = (code) => {
    exitCode = code;
    throw new Error(`__EXIT_${code}__`);
  };

  try {
    const { runGenerate } = await import("../../src/commands/generate.js");
    try {
      await runGenerate(args);
    } catch (err) {
      if (!/^__EXIT_/.test(String(err && err.message))) throw err;
    }
  } finally {
    console.log = origLog;
    console.warn = origWarn;
    console.error = origError;
    process.exit = origExit;
    process.chdir(origCwd);
  }

  return { logs, warns, errors, exitCode };
}

// ---------------------------------------------------------------------------
// §1 — trivial generate
// ---------------------------------------------------------------------------

describe("§1 trivial generate auth", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("empty CWD writes pages/auth/login.scrml", async () => {
    await runGenerateInTmp(["auth"]);
    const out = join(tmpDir, "pages", "auth", "login.scrml");
    expect(existsSync(out)).toBe(true);
  });

  test("generated file contains canonical scrml login primitives", async () => {
    await runGenerateInTmp(["auth"]);
    const src = readFileSync(join(tmpDir, "pages", "auth", "login.scrml"), "utf8");
    // <page auth="optional"> override is load-bearing — without it the
    // global auth gate would loop on /login.
    expect(src).toContain(`<page auth="optional">`);
    // Use of verifyPassword from scrml:auth.
    expect(src).toContain(`verifyPassword`);
    expect(src).toContain(`from 'scrml:auth'`);
    // Use of `not` for absence checks (NOT null/undefined per S89 absolute rule).
    expect(src).toContain("row is not");
    expect(src).toContain("if (not ok)");
    // No null/undefined tokens (S89 absolute rule).
    expect(src).not.toMatch(/\bnull\b/);
    expect(src).not.toMatch(/\bundefined\b/);
  });
});

// ---------------------------------------------------------------------------
// §2 — idempotency
// ---------------------------------------------------------------------------

describe("§2 idempotency", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("running twice does not clobber the first write", async () => {
    await runGenerateInTmp(["auth"]);
    const target = join(tmpDir, "pages", "auth", "login.scrml");
    expect(existsSync(target)).toBe(true);

    // Mutate the file so we can detect clobber.
    const marker = "// adopter-edited marker";
    const original = readFileSync(target, "utf8");
    writeFileSync(target, original + "\n" + marker, "utf8");

    // Second run should warn and skip.
    const { warns } = await runGenerateInTmp(["auth"]);
    const after = readFileSync(target, "utf8");
    expect(after).toContain(marker);  // marker preserved
    expect(warns.join("\n")).toContain("already exists");
  });
});

// ---------------------------------------------------------------------------
// §3 — --target / --target-dir overrides
// ---------------------------------------------------------------------------

describe("§3 target overrides", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("--target=<path> writes to the explicit path", async () => {
    await runGenerateInTmp(["auth", "--target=./login.scrml"]);
    expect(existsSync(join(tmpDir, "login.scrml"))).toBe(true);
    // Default path NOT used.
    expect(existsSync(join(tmpDir, "pages", "auth", "login.scrml"))).toBe(false);
  });

  test("--target-dir=<dir> writes login.scrml into that dir", async () => {
    await runGenerateInTmp(["auth", "--target-dir=./src/pages"]);
    expect(existsSync(join(tmpDir, "src", "pages", "login.scrml"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §4 — DB integration via <db src="..."> detection
// ---------------------------------------------------------------------------

describe("§4 db src detection", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("app.scrml with <db src=\"./contacts.db\"> wires the template to ./contacts.db", async () => {
    // Seed an app.scrml that the project-root heuristic will pick up.
    writeFileSync(
      join(tmpDir, "app.scrml"),
      `<program auth="required">\n  <db src="./contacts.db" tables="contacts">\n  </>\n</program>\n`,
      "utf8",
    );
    await runGenerateInTmp(["auth"]);
    const src = readFileSync(join(tmpDir, "pages", "auth", "login.scrml"), "utf8");
    // The <db src=> in the generated file should now point at ./contacts.db,
    // not the template's placeholder ./app.db.
    expect(src).toContain(`<db src="./contacts.db"`);
    expect(src).not.toContain(`<db src="./app.db"`);
  });

  test("project without <db> falls back to placeholder app.db", async () => {
    // No app.scrml at all → no DB detected → placeholder retained.
    await runGenerateInTmp(["auth"]);
    const src = readFileSync(join(tmpDir, "pages", "auth", "login.scrml"), "utf8");
    expect(src).toContain(`<db src="./app.db"`);
  });
});

// ---------------------------------------------------------------------------
// §5 — error paths
// ---------------------------------------------------------------------------

describe("§5 error paths", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("unknown type exits with code 1", async () => {
    const { exitCode, errors } = await runGenerateInTmp(["nonexistent-thing"]);
    expect(exitCode).toBe(1);
    expect(errors.join("\n")).toContain("Unknown generator type");
  });

  test("--help prints usage and writes nothing", async () => {
    const { logs } = await runGenerateInTmp(["--help"]);
    expect(logs.join("\n")).toContain("scrml generate");
    expect(existsSync(join(tmpDir, "pages", "auth", "login.scrml"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §6 — template content quality
// ---------------------------------------------------------------------------

describe("§6 template content quality", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("generated template uses safe failure paths (no try/catch)", async () => {
    await runGenerateInTmp(["auth"]);
    const src = readFileSync(join(tmpDir, "pages", "auth", "login.scrml"), "utf8");
    // No try/catch in canonical scrml.
    expect(src).not.toMatch(/\btry\s*\{/);
    expect(src).not.toMatch(/\bcatch\b/);
    expect(src).not.toMatch(/\bthrow\b/);
  });

  test("generated template uses `is not` and `not` for absence, not null/undefined", async () => {
    await runGenerateInTmp(["auth"]);
    const src = readFileSync(join(tmpDir, "pages", "auth", "login.scrml"), "utf8");
    // S89 absolute rule.
    expect(src).not.toMatch(/\bnull\b/);
    expect(src).not.toMatch(/\bundefined\b/);
    // Canonical absence shape:
    expect(src).toMatch(/is\s+not\b/);
  });

  test("generated template imports verifyPassword from scrml:auth (not raw bcrypt etc.)", async () => {
    await runGenerateInTmp(["auth"]);
    const src = readFileSync(join(tmpDir, "pages", "auth", "login.scrml"), "utf8");
    expect(src).toMatch(/import\s+\{\s*verifyPassword\s*\}\s+from\s+'scrml:auth'/);
  });
});
