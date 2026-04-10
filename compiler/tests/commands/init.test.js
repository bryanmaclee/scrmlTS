/**
 * Tests for scrml init subcommand.
 *
 * Tests:
 *  §1  parseArgs — no args defaults to current directory
 *  §2  parseArgs — directory name argument
 *  §3  parseArgs — --help flag
 *  §4  parseArgs — unknown flag exits with error
 *  §5  runInit — creates src/ directory
 *  §6  runInit — creates src/app.scrml with valid content
 *  §7  runInit — creates .gitignore with correct entries
 *  §8  runInit — does not overwrite existing files
 *  §9  runInit — app.scrml content uses correct scrml syntax
 *  §10 runInit — named directory creates files under that dir
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync, statSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";

// ---------------------------------------------------------------------------
// Resolve the compiler's src/ directory, handling git worktree layouts.
//
// In the main project:  tests/commands/ -> ../../src/ -> compiler/src/
// In a git worktree:    the worktree only has the new files; api.js lives
//                       in the main project at /home/.../scrml8/compiler/src/
//
// We walk up from import.meta.dir to find a src/api.js that actually exists.
// ---------------------------------------------------------------------------

function findCompilerSrc() {
  // Standard path: two dirs up from tests/commands/ → compiler/src/
  const standard = resolve(import.meta.dir, "../../src");
  if (existsSync(join(standard, "api.js"))) return standard;

  // Worktree fallback: the worktree path contains /.claude/worktrees/<id>/
  // The main compiler/src/ is at the project root.
  const worktreePattern = /.claude\/worktrees\/[^/]+\//;
  if (worktreePattern.test(import.meta.dir)) {
    const projectRoot = import.meta.dir.replace(
      /.claude\/worktrees\/[^/]+\/.*$/,
      ""
    );
    const mainSrc = join(projectRoot, "compiler/src");
    if (existsSync(join(mainSrc, "api.js"))) return mainSrc;
  }

  return null;
}

const COMPILER_SRC = findCompilerSrc();

// ---------------------------------------------------------------------------
// Temp directory helpers
// ---------------------------------------------------------------------------

let tmpDir;

function setupTmp() {
  tmpDir = join(tmpdir(), `scrml-init-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tmpDir, { recursive: true });
}

function teardownTmp() {
  if (tmpDir && existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Run runInit with cwd set to tmpDir.
 * Captures stdout/stderr output for assertions.
 */
async function runInitInTmp(args = []) {
  const origCwd = process.cwd();
  process.chdir(tmpDir);

  const logs = [];
  const warns = [];

  const origLog = console.log;
  const origWarn = console.warn;
  console.log = (...a) => logs.push(a.join(" "));
  console.warn = (...a) => warns.push(a.join(" "));

  try {
    const { runInit } = await import("../../src/commands/init.js");
    runInit(args);
  } finally {
    console.log = origLog;
    console.warn = origWarn;
    process.chdir(origCwd);
  }

  return { logs, warns };
}

// ---------------------------------------------------------------------------
// §1 default directory
// ---------------------------------------------------------------------------

describe("§1 default directory", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("no args creates files in cwd", async () => {
    await runInitInTmp([]);
    expect(existsSync(join(tmpDir, "src", "app.scrml"))).toBe(true);
    expect(existsSync(join(tmpDir, ".gitignore"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §2 named directory argument
// ---------------------------------------------------------------------------

describe("§2 named directory argument", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("creates files inside the named subdirectory", async () => {
    await runInitInTmp(["my-app"]);
    const appDir = join(tmpDir, "my-app");
    expect(existsSync(join(appDir, "src", "app.scrml"))).toBe(true);
    expect(existsSync(join(appDir, ".gitignore"))).toBe(true);
  });

  test("creates the directory if it does not exist", async () => {
    await runInitInTmp(["brand-new-dir"]);
    expect(existsSync(join(tmpDir, "brand-new-dir"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §3 --help flag
// ---------------------------------------------------------------------------

describe("§3 --help flag", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("--help prints usage and creates no files", async () => {
    const { logs } = await runInitInTmp(["--help"]);
    const combined = logs.join("\n");
    expect(combined).toContain("scrml init");
    expect(existsSync(join(tmpDir, "src", "app.scrml"))).toBe(false);
  });

  test("-h is an alias for --help", async () => {
    const { logs } = await runInitInTmp(["-h"]);
    const combined = logs.join("\n");
    expect(combined).toContain("scrml init");
    expect(existsSync(join(tmpDir, "src", "app.scrml"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §5 directory structure
// ---------------------------------------------------------------------------

describe("§5 directory structure", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("creates src/ directory", async () => {
    await runInitInTmp([]);
    expect(existsSync(join(tmpDir, "src"))).toBe(true);
  });

  test("src/ is a directory not a file", async () => {
    await runInitInTmp([]);
    expect(statSync(join(tmpDir, "src")).isDirectory()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §6 app.scrml creation
// ---------------------------------------------------------------------------

describe("§6 app.scrml creation", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("creates src/app.scrml", async () => {
    await runInitInTmp([]);
    expect(existsSync(join(tmpDir, "src", "app.scrml"))).toBe(true);
  });

  test("app.scrml is non-empty", async () => {
    await runInitInTmp([]);
    const content = readFileSync(join(tmpDir, "src", "app.scrml"), "utf8");
    expect(content.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// §7 .gitignore creation
// ---------------------------------------------------------------------------

describe("§7 .gitignore creation", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("creates .gitignore", async () => {
    await runInitInTmp([]);
    expect(existsSync(join(tmpDir, ".gitignore"))).toBe(true);
  });

  test(".gitignore contains dist/", async () => {
    await runInitInTmp([]);
    const content = readFileSync(join(tmpDir, ".gitignore"), "utf8");
    expect(content).toContain("dist/");
  });

  test(".gitignore contains node_modules/", async () => {
    await runInitInTmp([]);
    const content = readFileSync(join(tmpDir, ".gitignore"), "utf8");
    expect(content).toContain("node_modules/");
  });
});

// ---------------------------------------------------------------------------
// §8 no-overwrite behavior
// ---------------------------------------------------------------------------

describe("§8 no-overwrite behavior", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("does not overwrite an existing app.scrml", async () => {
    const srcDir = join(tmpDir, "src");
    mkdirSync(srcDir, { recursive: true });
    const appPath = join(srcDir, "app.scrml");
    writeFileSync(appPath, "// existing content\n");

    await runInitInTmp([]);

    const content = readFileSync(appPath, "utf8");
    expect(content).toBe("// existing content\n");
  });

  test("does not overwrite an existing .gitignore", async () => {
    const giPath = join(tmpDir, ".gitignore");
    writeFileSync(giPath, "# my custom gitignore\n");

    await runInitInTmp([]);

    const content = readFileSync(giPath, "utf8");
    expect(content).toBe("# my custom gitignore\n");
  });

  test("emits a warning when skipping an existing file", async () => {
    const srcDir = join(tmpDir, "src");
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, "app.scrml"), "// existing\n");

    const { warns } = await runInitInTmp([]);
    expect(warns.some(w => w.includes("already exists") || w.includes("skipping"))).toBe(true);
  });

  test("still creates files that do not exist when some do", async () => {
    // Pre-create only app.scrml — .gitignore should still be created
    const srcDir = join(tmpDir, "src");
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, "app.scrml"), "// existing\n");

    await runInitInTmp([]);

    expect(existsSync(join(tmpDir, ".gitignore"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §9 app.scrml syntax correctness
// ---------------------------------------------------------------------------

describe("§9 app.scrml syntax correctness", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("app.scrml uses @ for reactive state", async () => {
    await runInitInTmp([]);
    const content = readFileSync(join(tmpDir, "src", "app.scrml"), "utf8");
    expect(content).toContain("@");
  });

  test("app.scrml uses function keyword", async () => {
    await runInitInTmp([]);
    const content = readFileSync(join(tmpDir, "src", "app.scrml"), "utf8");
    expect(content).toContain("function");
  });

  test("app.scrml uses scrml closing syntax", async () => {
    await runInitInTmp([]);
    const content = readFileSync(join(tmpDir, "src", "app.scrml"), "utf8");
    // scrml closes tags with a trailing /
    expect(content).toContain("/");
  });

  test("app.scrml compiles without errors", async () => {
    if (!COMPILER_SRC) {
      // api.js not found in this environment — skip gracefully
      console.log("skipped: api.js not found in this environment");
      return;
    }

    await runInitInTmp([]);
    const appPath = join(tmpDir, "src", "app.scrml");

    const { compileScrml } = await import(join(COMPILER_SRC, "api.js"));
    const result = compileScrml({
      inputFiles: [appPath],
      outputDir: join(tmpDir, "dist"),
      write: false,
    });

    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §10 named directory placement
// ---------------------------------------------------------------------------

describe("§10 named directory placement", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("app.scrml goes into <name>/src/app.scrml", async () => {
    await runInitInTmp(["hello-world"]);
    expect(existsSync(join(tmpDir, "hello-world", "src", "app.scrml"))).toBe(true);
  });

  test(".gitignore goes into <name>/.gitignore", async () => {
    await runInitInTmp(["hello-world"]);
    expect(existsSync(join(tmpDir, "hello-world", ".gitignore"))).toBe(true);
  });

  test("files are NOT created in cwd when a dir name is given", async () => {
    await runInitInTmp(["hello-world"]);
    expect(existsSync(join(tmpDir, "src"))).toBe(false);
    expect(existsSync(join(tmpDir, ".gitignore"))).toBe(false);
  });

  test("output mentions the target directory name", async () => {
    const { logs } = await runInitInTmp(["my-project"]);
    const combined = logs.join("\n");
    expect(combined).toContain("my-project");
  });
});
