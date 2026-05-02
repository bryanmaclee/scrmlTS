/**
 * @module commands/migrate
 * scrml migrate subcommand.
 *
 * Automated source rewrites for the deprecation/migration patterns introduced
 * in S52+S53. The CLI is opt-in — it never runs as part of `compile`/`dev`/`build`.
 *
 * Migrations shipped (P4):
 *   1. Whitespace-after-`<` (W-WHITESPACE-001):  `< db>` → `<db>`, etc.
 *      Applies only to known scrml lifecycle/structural keywords.
 *   2. `<machine>` keyword (W-DEPRECATED-001):   `<machine` → `<engine`.
 *
 * Migrations deferred (P4):
 *   3. Form 2 → Form 1 component desugaring (`export const Name = <markup>` →
 *      `export <Name>{markup}</>`). Deferred because text-substitution can't
 *      cleanly handle the surrounding `${ ... }` block boundary — the
 *      transformation requires either splitting the block or an AST-level
 *      rewrite. Tracked for P5+.
 *
 * Usage:
 *   scrml migrate <file|dir> [options]
 *
 * Options:
 *   --dry-run            Print unified diff to stdout without writing
 *   --check              Exit non-zero if any file would be modified (CI-friendly)
 *   --include=<glob>     File pattern to match (default: '*.scrml')
 *   --exclude=<glob>     Pattern to exclude (default: 'samples/' is excluded by default)
 *   --no-default-excludes  Disable the built-in `samples/` exclusion
 *   --help, -h           Show this message
 *
 * Safety model:
 *   - For each file: read source, apply text-substitution migrations, then
 *     parse the rewritten source via `compileScrml({ write: false })`. If the
 *     rewritten source fails to parse, the file is left untouched and the
 *     failure is reported.
 *   - `samples/compilation-tests/` and `compiler/tests/` directories are
 *     excluded by default — those exercise deprecation paths intentionally.
 *   - Default operation is in-place rewriting. Use `--dry-run` for preview.
 */

import {
  readFileSync,
  writeFileSync,
  statSync,
  readdirSync,
  existsSync,
  mkdtempSync,
} from "fs";
import { resolve, join, relative, sep } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../api.js";

// ---------------------------------------------------------------------------
// ANSI color helpers
// ---------------------------------------------------------------------------

const isTTY = process.stderr.isTTY && process.stdout.isTTY;

const c = {
  red:    (s) => isTTY ? `\x1b[31m${s}\x1b[0m` : s,
  yellow: (s) => isTTY ? `\x1b[33m${s}\x1b[0m` : s,
  green:  (s) => isTTY ? `\x1b[32m${s}\x1b[0m` : s,
  cyan:   (s) => isTTY ? `\x1b[36m${s}\x1b[0m` : s,
  dim:    (s) => isTTY ? `\x1b[2m${s}\x1b[0m` : s,
  bold:   (s) => isTTY ? `\x1b[1m${s}\x1b[0m` : s,
};

// ---------------------------------------------------------------------------
// Migration rules
// ---------------------------------------------------------------------------

/**
 * Lifecycle / structural keywords whose openers may legitimately be rewritten.
 *
 * These are the keywords that NR / TAB recognize as compiler-known top-level
 * forms — never user-defined identifiers, never plain HTML tags. Only these
 * are rewritten to keep Migration 1 conservative (false-positives on a generic
 * lowercase `<\s+ident>` would mangle bareword text inside `${ }` blocks or
 * literal HTML body content.)
 *
 * Sourced from name-resolver.ts LIFECYCLE_CATEGORY plus structural keywords
 * (program / page / body / lin) recognized by BS / TAB.
 */
const KNOWN_KEYWORDS = new Set([
  // Lifecycle (name-resolver.ts LIFECYCLE_CATEGORY)
  "channel",
  "engine",
  "machine",
  "timer",
  "poll",
  "db",
  "schema",
  "request",
  "errorBoundary",
  "errorboundary",
  // Structural (top-level scrml constructs)
  "program",
  "page",
  "body",
  "lin",
]);

/**
 * Apply Migration 1 (W-WHITESPACE-001) and Migration 2 (W-DEPRECATED-001)
 * to a source string. Returns the rewritten source.
 *
 * Migration 1 — whitespace-after-`<`:
 *   `< db>` / `< schema/>` / `< channel for=X>` → `<db>` / `<schema/>` etc.
 *
 *   The regex captures the `<`, any whitespace, an identifier matching a known
 *   keyword, and the boundary character (whitespace, `>`, or `/`). It rewrites
 *   to `<ident<boundary>`, preserving the rest of the opener verbatim.
 *
 *   We restrict the identifier to the KNOWN_KEYWORDS list. A generic
 *   `< [a-z]+` rule would falsely match arbitrary lowercase HTML / component
 *   refs and even tag-like text inside string literals, which the regex
 *   approach can't disambiguate.
 *
 *   We also avoid rewriting `< /name>` (close tag) — the regex only matches
 *   when the next char after `<\s+` is a letter, not `/`.
 *
 * Migration 2 — `<machine>` keyword:
 *   `<machine` / `< machine` → `<engine` / `< engine` (preserving any
 *   leading whitespace after `<` — Migration 1 will normalize that on a
 *   follow-up pass).
 *
 *   Applied AFTER Migration 1 in the same pass: Migration 1 may have already
 *   normalized `< machine` → `<machine`, in which case Migration 2 picks it
 *   up here. If Migration 2 runs first on `< machine`, it produces `< engine`,
 *   and Migration 1 then normalizes that to `<engine`.
 *
 * @param {string} source — raw source text
 * @returns {{ rewritten: string, changed: boolean, migrations: { whitespace: number, machine: number } }}
 */
export function applyMigrations(source) {
  let result = source;
  let whitespaceCount = 0;
  let machineCount = 0;

  // Migration 1: `< KEYWORD<boundary>` → `<KEYWORD<boundary>`
  //
  // Pattern: `<` + at-least-one whitespace char + lowercase identifier +
  //          (whitespace | `>` | `/`).
  // Capture the identifier and the boundary char so we can re-emit them.
  // Apply only when the identifier is a known scrml keyword.
  result = result.replace(
    /<(\s+)([a-zA-Z][a-zA-Z0-9]*)(\s|>|\/)/g,
    (match, _ws, ident, boundary) => {
      if (!KNOWN_KEYWORDS.has(ident)) return match;
      whitespaceCount++;
      return `<${ident}${boundary}`;
    }
  );

  // Migration 2: `<\s*machine` (opener) → `<\s*engine`
  //
  // Pattern matches `<` + optional whitespace + `machine` + (whitespace | `>` |
  // `/`). The trailing-boundary check ensures we don't mangle identifiers
  // like `<machineState>` (false positive — `machineState` starts with
  // `machine` but isn't `machine` itself).
  result = result.replace(
    /<(\s*)machine(\s|>|\/)/g,
    (_match, ws, boundary) => {
      machineCount++;
      return `<${ws}engine${boundary}`;
    }
  );

  return {
    rewritten: result,
    changed: result !== source,
    migrations: {
      whitespace: whitespaceCount,
      machine: machineCount,
    },
  };
}

// ---------------------------------------------------------------------------
// Sanity-check parse — verify rewritten source still compiles
// ---------------------------------------------------------------------------

/**
 * Parse the rewritten source via the existing pipeline to verify it's still
 * valid scrml. Stages the rewritten source under a unique temp directory so
 * `compileScrml` can read it from disk.
 *
 * @param {string} rewrittenSource
 * @param {string} originalPath — original file path (basename preserved for error spans)
 * @returns {{ ok: boolean, errors: object[] }}
 */
function sanityCheckParse(rewrittenSource, originalPath) {
  // Stage the rewritten source in a temp file so compileScrml can read it.
  // We preserve the original basename so error messages reference a similar
  // path. The tmp dir is unique per call.
  const stagingDir = mkdtempSync(join(tmpdir(), "scrml-migrate-check-"));
  const baseName = originalPath.split(sep).pop() || "staged.scrml";
  const stagedPath = join(stagingDir, baseName);
  writeFileSync(stagedPath, rewrittenSource, "utf8");

  let result;
  try {
    result = compileScrml({
      inputFiles: [stagedPath],
      write: false,
      gather: false,
      log: () => {},
    });
  } catch (err) {
    return {
      ok: false,
      errors: [{ message: `compiler crashed: ${err.message}` }],
    };
  }

  // Errors (severity 'error' or unspecified) block the migration.
  // Warnings are fine — the whole point is fixing W-WHITESPACE-001 /
  // W-DEPRECATED-001, but the rewritten source may still surface OTHER
  // unrelated warnings, which we don't want to block on.
  const blockingErrors = (result.errors || []).filter(
    (e) => !e.severity || e.severity === "error"
  );

  return {
    ok: blockingErrors.length === 0,
    errors: blockingErrors,
  };
}

// ---------------------------------------------------------------------------
// Diff rendering (unified, simplified — no external deps)
// ---------------------------------------------------------------------------

/**
 * Produce a simple unified-diff-style preview of two source texts.
 *
 * Not a full unified diff — we don't need hunks. We just emit:
 *   - file header
 *   - line-by-line `-` (removed) / `+` (added) for changed lines
 *   - unchanged lines elided to `...`
 *
 * @param {string} oldText
 * @param {string} newText
 * @param {string} relPath
 * @returns {string}
 */
function simpleDiff(oldText, newText, relPath) {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const out = [];

  out.push(c.bold(`--- ${relPath}`));
  out.push(c.bold(`+++ ${relPath}`));

  // Walk both line arrays. When lines match, advance both. When they differ,
  // emit a `-` for the old line and a `+` for the new line. We don't try to
  // align — the migrations are line-local, so 1-for-1 substitution holds.
  const max = Math.max(oldLines.length, newLines.length);
  let inHunk = false;
  for (let i = 0; i < max; i++) {
    const oldL = i < oldLines.length ? oldLines[i] : null;
    const newL = i < newLines.length ? newLines[i] : null;
    if (oldL === newL) {
      if (inHunk) {
        out.push(c.dim("..."));
        inHunk = false;
      }
      continue;
    }
    inHunk = true;
    if (oldL !== null) out.push(c.red(`- ${oldL}`));
    if (newL !== null) out.push(c.green(`+ ${newL}`));
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Argument parser
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`scrml migrate <file|directory> [options]

Apply automated source rewrites for deprecated scrml syntax patterns.

Migrations shipped:
  - Whitespace-after-\`<\`  (W-WHITESPACE-001): \`< db>\` → \`<db>\`
  - \`<machine>\` keyword     (W-DEPRECATED-001): \`<machine\` → \`<engine\`

Arguments:
  <file>                  A single .scrml file
  <directory>             A directory — all matching files inside are migrated

Options:
  --dry-run               Print unified diff to stdout without writing
  --check                 Exit non-zero if any file would be modified (CI-friendly)
  --include=<glob>        File pattern (default: '*.scrml')
  --exclude=<glob>        Additional exclude pattern (substring match)
  --no-default-excludes   Disable built-in samples/ + tests/ exclusions
  --help, -h              Show this message

Safety:
  Each file is sanity-parsed after rewriting. If the result fails to compile,
  the file is left untouched and the failure is reported.

  By default, paths under \`samples/\` or \`tests/\` are skipped — they exercise
  deprecation paths on purpose. Pass --no-default-excludes to override.

Examples:
  scrml migrate src/                       # in-place rewrite
  scrml migrate src/app.scrml --dry-run    # preview only
  scrml migrate src/ --check               # CI gate; exit 1 if anything would change
`);
}

/**
 * @param {string[]} args
 * @returns {{ paths: string[], dryRun: boolean, check: boolean,
 *             include: string, excludes: string[], help: boolean }}
 */
function parseArgs(args) {
  const paths = [];
  let dryRun = false;
  let check = false;
  let include = "*.scrml";
  const excludes = [];
  let useDefaultExcludes = true;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--check") {
      check = true;
    } else if (arg.startsWith("--include=")) {
      include = arg.slice("--include=".length);
    } else if (arg === "--include") {
      include = args[++i];
      if (!include) {
        console.error(c.red("error:") + ` --include requires a value`);
        process.exit(1);
      }
    } else if (arg.startsWith("--exclude=")) {
      excludes.push(arg.slice("--exclude=".length));
    } else if (arg === "--exclude") {
      const val = args[++i];
      if (!val) {
        console.error(c.red("error:") + ` --exclude requires a value`);
        process.exit(1);
      }
      excludes.push(val);
    } else if (arg === "--no-default-excludes") {
      useDefaultExcludes = false;
    } else if (arg.startsWith("-")) {
      console.error(c.red("error:") + ` Unknown option: ${arg}`);
      console.error(c.dim("Run `scrml migrate --help` for usage."));
      process.exit(1);
    } else {
      paths.push(arg);
    }
  }

  if (useDefaultExcludes) {
    // Skip directories that exercise deprecation paths on purpose.
    excludes.push(`${sep}samples${sep}`);
    excludes.push(`${sep}tests${sep}`);
  }

  return { paths, dryRun, check, include, excludes, help };
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

/**
 * Recursively collect .scrml files under a path.
 *
 * Filters: include pattern (suffix-only, since we accept '*.scrml'-style
 * globs), exclude substring matches.
 *
 * @param {string} root — absolute path to a file or directory
 * @param {string} include — pattern (e.g. '*.scrml')
 * @param {string[]} excludes — substring exclude patterns
 * @returns {string[]} absolute file paths
 */
function collectFiles(root, include, excludes) {
  const suffix = include.startsWith("*") ? include.slice(1) : include;
  const out = [];

  function isExcluded(absPath) {
    for (const pat of excludes) {
      if (absPath.includes(pat)) return true;
    }
    return false;
  }

  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.startsWith(".")) continue; // skip dotfiles / .git
      const full = join(dir, entry);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) {
        if (isExcluded(full + sep)) continue;
        walk(full);
      } else if (st.isFile()) {
        if (isExcluded(full)) continue;
        if (full.endsWith(suffix)) {
          out.push(full);
        }
      }
    }
  }

  let st;
  try { st = statSync(root); } catch {
    return [];
  }
  if (st.isFile()) {
    if (!isExcluded(root) && root.endsWith(suffix)) {
      out.push(root);
    }
  } else if (st.isDirectory()) {
    walk(root);
  }
  return out.sort();
}

// ---------------------------------------------------------------------------
// Per-file processing
// ---------------------------------------------------------------------------

/**
 * Process a single file: read, apply migrations, sanity-parse, write or report.
 *
 * @param {string} filePath
 * @param {{ dryRun: boolean, check: boolean }} opts
 * @param {string} cwd
 * @returns {{ status: 'unchanged' | 'changed' | 'failed' | 'unreadable',
 *             migrations?: { whitespace: number, machine: number },
 *             reason?: string,
 *             diff?: string }}
 */
export function migrateFile(filePath, opts, cwd) {
  const relPath = relative(cwd, filePath);

  let source;
  try {
    source = readFileSync(filePath, "utf8");
  } catch (err) {
    return { status: "unreadable", reason: err.message };
  }

  const { rewritten, changed, migrations } = applyMigrations(source);

  if (!changed) {
    return { status: "unchanged" };
  }

  // Sanity-check: parse the rewritten source.
  const parseResult = sanityCheckParse(rewritten, filePath);
  if (!parseResult.ok) {
    const messages = parseResult.errors.map(e => e.message || String(e)).join("; ");
    return {
      status: "failed",
      reason: `rewritten source failed to parse: ${messages}`,
    };
  }

  if (opts.dryRun) {
    const diff = simpleDiff(source, rewritten, relPath);
    return { status: "changed", migrations, diff };
  }

  if (opts.check) {
    // --check: do not write; signal "would change" via status.
    return { status: "changed", migrations };
  }

  // Write in-place.
  try {
    writeFileSync(filePath, rewritten, "utf8");
  } catch (err) {
    return { status: "failed", reason: `write failed: ${err.message}` };
  }
  return { status: "changed", migrations };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Entry point for the migrate subcommand.
 *
 * @param {string[]} args — raw argv slice after "migrate"
 */
export function runMigrate(args) {
  const { paths, dryRun, check, include, excludes, help } = parseArgs(args);

  if (help) {
    printHelp();
    return;
  }

  if (paths.length === 0) {
    console.error(c.red("error:") + " scrml migrate requires at least one file or directory");
    console.error(c.dim("Run `scrml migrate --help` for usage."));
    process.exit(1);
  }

  const cwd = process.cwd();

  // Collect all files to process across all input paths.
  const allFiles = [];
  for (const p of paths) {
    const abs = resolve(cwd, p);
    if (!existsSync(abs)) {
      console.error(c.red("error:") + ` Path not found: ${p}`);
      process.exit(1);
    }
    const files = collectFiles(abs, include, excludes);
    allFiles.push(...files);
  }

  // Dedupe (paths may overlap when both a parent dir and child file are passed).
  const seen = new Set();
  const uniqueFiles = [];
  for (const f of allFiles) {
    if (seen.has(f)) continue;
    seen.add(f);
    uniqueFiles.push(f);
  }

  if (uniqueFiles.length === 0) {
    console.log(c.yellow("No files matched."));
    return;
  }

  // Process.
  let changedCount = 0;
  let unchangedCount = 0;
  let failedCount = 0;
  let totalWhitespace = 0;
  let totalMachine = 0;
  const failures = [];

  for (const file of uniqueFiles) {
    const r = migrateFile(file, { dryRun, check }, cwd);
    if (r.status === "changed") {
      changedCount++;
      if (r.migrations) {
        totalWhitespace += r.migrations.whitespace;
        totalMachine += r.migrations.machine;
      }
      if (dryRun && r.diff) {
        console.log(r.diff);
        console.log("");
      } else if (!dryRun) {
        const verb = check ? "would migrate" : "migrated";
        console.log(c.green(`  ${verb}`) + `  ${relative(cwd, file)}`);
      }
    } else if (r.status === "unchanged") {
      unchangedCount++;
    } else {
      failedCount++;
      failures.push({ file: relative(cwd, file), reason: r.reason });
      console.error(c.red("  failed   ") + `${relative(cwd, file)}: ${r.reason}`);
    }
  }

  // Summary.
  console.log("");
  console.log(c.bold("Summary:"));
  console.log(`  ${uniqueFiles.length} file${uniqueFiles.length !== 1 ? "s" : ""} scanned`);
  if (changedCount > 0) {
    const verb = dryRun ? "would change" : (check ? "would change" : "changed");
    console.log(`  ${c.green(changedCount)} ${verb}`);
    if (totalWhitespace > 0) console.log(`    ${c.dim(`whitespace migrations:`)} ${totalWhitespace}`);
    if (totalMachine > 0) console.log(`    ${c.dim(`<machine> migrations:`)} ${totalMachine}`);
  }
  if (unchangedCount > 0) {
    console.log(`  ${c.dim(`${unchangedCount} unchanged`)}`);
  }
  if (failedCount > 0) {
    console.log(`  ${c.red(failedCount)} failed`);
  }

  // Exit codes:
  //   --check   → 1 if any file would change OR any file failed
  //   default   → 1 if any file failed (writes succeeded → 0)
  if (check && (changedCount > 0 || failedCount > 0)) {
    process.exit(1);
  }
  if (!check && failedCount > 0) {
    process.exit(1);
  }
}
