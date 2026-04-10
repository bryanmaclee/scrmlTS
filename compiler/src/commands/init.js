/**
 * @module commands/init
 * scrml init subcommand.
 *
 * Creates a minimal but complete scrml project scaffold in the target directory.
 *
 * Usage:
 *   scrml init [directory]
 *
 * What it creates:
 *   <dir>/
 *     src/
 *       app.scrml    Hello world with a counter
 *     .gitignore     dist/, node_modules/
 *
 * Safety: never overwrites existing files. Warns and skips each conflict.
 */

import { mkdirSync, existsSync, writeFileSync } from "fs";
import { resolve, join, relative } from "path";

// ---------------------------------------------------------------------------
// ANSI color helpers — no dependencies
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
// File templates
// ---------------------------------------------------------------------------

/**
 * Minimal app.scrml — hello world with a counter.
 *
 * Uses <program> wrapper, reactive state, event handlers, and scoped CSS.
 */
const APP_SCRML = `// app.scrml — starter scrml app
// Run: scrml dev src/app.scrml

<program>

\${
    @count = 0
    @step = 1

    function increment() {
        @count = @count + Number(@step)
    }

    function decrement() {
        if (@count - @step >= 0) {
            @count = @count - @step
        }
    }

    function reset() {
        @count = 0
    }
}

<div class="app">
    <h1>Hello from scrml</>

    <p class="count">\${@count}</>

    <div class="controls">
        <button onclick=decrement()>-</>
        <button onclick=reset()>Reset</>
        <button onclick=increment()>+</>
    </>

    <label>
        Step size:
        <select bind:value=@step>
            <option value="1">1</>
            <option value="5">5</>
            <option value="10">10</>
        </select>
    </>
</>

#\{
    .app {
        max-width: 400px;
        margin: 4rem auto;
        text-align: center;
        font-family: system-ui, sans-serif;
    }

    .count {
        font-size: 4rem;
        font-weight: 700;
        margin: 1rem 0;
    }

    .controls {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
        margin-bottom: 1.5rem;
    }

    button {
        padding: 0.5rem 1.5rem;
        font-size: 1.1rem;
        border: 1px solid #ccc;
        border-radius: 6px;
        cursor: pointer;
        background: white;
    }

    button:hover { background: #f5f5f5; }

    label {
        color: #777;
        font-size: 0.9rem;
    }

    select {
        padding: 0.3rem;
        border-radius: 4px;
        border: 1px solid #ccc;
    }
}

</program>
`;

const GITIGNORE = `dist/
node_modules/
`;

// ---------------------------------------------------------------------------
// Argument parser
// ---------------------------------------------------------------------------

/**
 * Parse init-command arguments.
 *
 * @param {string[]} args
 * @returns {{ targetDir: string, help: boolean }}
 */
function parseArgs(args) {
  let targetDir = ".";
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg.startsWith("-")) {
      console.error(c.red("error:") + ` Unknown option: ${arg}`);
      console.error(c.dim("Run `scrml init --help` for usage."));
      process.exit(1);
    } else {
      // First positional arg is the target directory
      targetDir = arg;
    }
  }

  return { targetDir, help };
}

// ---------------------------------------------------------------------------
// File writer — warns and skips on conflict
// ---------------------------------------------------------------------------

/**
 * Write a file, skipping if it already exists.
 *
 * @param {string} filePath — absolute path
 * @param {string} content
 * @param {string} cwd — for relative display
 * @returns {{ wrote: boolean }}
 */
function writeIfNew(filePath, content, cwd) {
  // Use relative path only when it doesn't go outside CWD (avoids ugly ../../../../tmp/... output)
  const rawRel = relative(cwd, filePath);
  const rel = rawRel.startsWith("..") ? filePath : rawRel;
  if (existsSync(filePath)) {
    console.warn(c.yellow("warning:") + ` ${rel} already exists — skipping`);
    return { wrote: false };
  }
  writeFileSync(filePath, content, "utf8");
  console.log(c.green("  created") + `  ${rel}`);
  return { wrote: true };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Entry point for the init subcommand.
 *
 * @param {string[]} args — raw argv slice after "init"
 */
export function runInit(args) {
  const { targetDir, help } = parseArgs(args);

  if (help) {
    console.log(`scrml init [directory]

Create a new scrml project in the given directory (default: current directory).

Usage:
  scrml init            Init in current directory
  scrml init my-app     Init in ./my-app/

What is created:
  src/app.scrml         Hello world app with a counter
  .gitignore            Ignores dist/ and node_modules/

Options:
  --help, -h            Show this message

Existing files are never overwritten — conflicting files are skipped with a warning.
`);
    return;
  }

  const cwd = process.cwd();
  const projectDir = resolve(cwd, targetDir);
  const srcDir = join(projectDir, "src");

  // Show the target
  const displayDir = targetDir === "." ? "current directory" : targetDir;
  console.log(`\nInitializing scrml project in ${c.cyan(displayDir)}\n`);

  // Create directories
  try {
    mkdirSync(srcDir, { recursive: true });
  } catch (err) {
    console.error(c.red("error:") + ` Could not create directory structure: ${err.message}`);
    process.exit(1);
  }

  // Write files
  const appScrml = join(srcDir, "app.scrml");
  const gitignore = join(projectDir, ".gitignore");

  let created = 0;
  let skipped = 0;

  for (const [path, content] of [[appScrml, APP_SCRML], [gitignore, GITIGNORE]]) {
    const { wrote } = writeIfNew(path, content, cwd);
    if (wrote) created++;
    else skipped++;
  }

  // Summary
  console.log("");
  if (created > 0) {
    console.log(c.bold(c.green("Done.")) + ` ${created} file${created !== 1 ? "s" : ""} created.`);
  } else {
    console.log(c.yellow("Nothing created — all files already exist."));
  }
  if (skipped > 0) {
    console.log(c.dim(`${skipped} file${skipped !== 1 ? "s" : ""} skipped (already exist).`));
  }

  // Next steps
  const cdStep = targetDir !== "." ? `cd ${targetDir} && ` : "";
  console.log(`
Next steps:
  ${c.cyan(`${cdStep}scrml dev src/app.scrml`)}
`);
}
