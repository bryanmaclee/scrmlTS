/**
 * @module commands/compile
 * scrml compile subcommand.
 *
 * Parses args, resolves inputs, calls compileScrml(), formats output.
 * Supports --watch / -w with a 100ms debounce.
 * Pretty error output with colors and source locations.
 */

import { statSync, watch, readFileSync, existsSync } from "fs";
import { resolve, dirname, join, relative, basename } from "path";
import { compileScrml, scanDirectory } from "../api.js";

// ---------------------------------------------------------------------------
// ANSI color helpers — no dependencies
// ---------------------------------------------------------------------------

const isTTY = process.stderr.isTTY && process.stdout.isTTY;

const c = {
  red:     (s) => isTTY ? `\x1b[31m${s}\x1b[0m` : s,
  yellow:  (s) => isTTY ? `\x1b[33m${s}\x1b[0m` : s,
  green:   (s) => isTTY ? `\x1b[32m${s}\x1b[0m` : s,
  cyan:    (s) => isTTY ? `\x1b[36m${s}\x1b[0m` : s,
  dim:     (s) => isTTY ? `\x1b[2m${s}\x1b[0m` : s,
  bold:    (s) => isTTY ? `\x1b[1m${s}\x1b[0m` : s,
  magenta: (s) => isTTY ? `\x1b[35m${s}\x1b[0m` : s,
};

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`scrml compile <file.scrml|directory> [options]

Compile one or more scrml source files.

Arguments:
  <file.scrml>            A single .scrml file
  <directory>             A directory — all .scrml files inside are compiled

Options:
  --output-dir, -o <dir>  Output directory (default: dist/ next to input)
  --verbose, -v           Show per-stage timing and counts
  --embed-runtime         Embed runtime inline instead of writing a separate file
  --emit-batch-plan       Print the Stage 7.5 BatchPlan as JSON (§PIPELINE)
  --watch, -w             Watch for changes and recompile
  --convert-legacy-css    Convert <style> blocks to #{...}
  --mode <mode>           Output mode: browser (default) or library
  --self-host             Use compiled scrml modules (requires build-self-host.js)
  --help, -h              Show this message

Examples:
  scrml compile src/app.scrml
  scrml compile src/
  scrml compile src/app.scrml -o build/ --verbose
`);
}

// ---------------------------------------------------------------------------
// Argument parser
// ---------------------------------------------------------------------------

/**
 * Parse compile-command arguments.
 *
 * @param {string[]} args
 * @returns {{ inputFiles: string[], outputDir: string|null, verbose: boolean,
 *             convertLegacyCss: boolean, embedRuntime: boolean, watchMode: boolean,
 *             mode: 'browser'|'library', selfHost: boolean }}
 */
function parseArgs(args) {
  const inputFiles = [];
  let outputDir = null;
  let verbose = false;
  let convertLegacyCss = false;
  let embedRuntime = false;
  let watchMode = false;
  let mode = 'browser';
  let selfHost = false;
  let emitBatchPlan = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--output" || arg === "--output-dir" || arg === "-o") {
      outputDir = args[++i];
      if (!outputDir) {
        console.error(c.red("error:") + ` ${arg} requires a directory path`);
        process.exit(1);
      }
    } else if (arg === "--verbose" || arg === "-v") {
      verbose = true;
    } else if (arg === "--convert-legacy-css") {
      convertLegacyCss = true;
    } else if (arg === "--embed-runtime") {
      embedRuntime = true;
    } else if (arg === "--watch" || arg === "-w") {
      watchMode = true;
    } else if (arg === "--mode") {
      const modeVal = args[++i];
      if (!modeVal) {
        console.error(c.red("error:") + ` --mode requires a value (browser or library)`);
        process.exit(1);
      }
      if (modeVal !== 'browser' && modeVal !== 'library') {
        console.error(c.red("error:") + ` Unknown mode: ${modeVal}. Valid values: browser, library`);
        process.exit(1);
      }
      mode = modeVal;
    } else if (arg === "--self-host") {
      selfHost = true;
    } else if (arg === "--emit-batch-plan") {
      emitBatchPlan = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith("-")) {
      console.error(c.red("error:") + ` Unknown option: ${arg}`);
      console.error(c.dim("Run `scrml compile --help` for usage."));
      process.exit(1);
    } else if (arg.endsWith(".scrml")) {
      inputFiles.push(resolve(arg));
    } else {
      // Directory?
      try {
        const stat = statSync(arg);
        if (stat.isDirectory()) {
          const dirFiles = scanDirectory(arg);
          if (dirFiles.length === 0) {
            console.error(c.yellow("warning:") + ` No .scrml files found in ${arg}`);
          }
          inputFiles.push(...dirFiles);
          continue;
        }
      } catch { /* not a directory or file */ }

      // Maybe they forgot the extension?
      try {
        statSync(arg + ".scrml");
        inputFiles.push(resolve(arg + ".scrml"));
        continue;
      } catch { /* nope */ }

      console.error(c.red("error:") + ` Cannot find file or directory: ${arg}`);
      process.exit(1);
    }
  }

  return { inputFiles, outputDir, verbose, convertLegacyCss, embedRuntime, watchMode, mode, selfHost, emitBatchPlan };
}

// ---------------------------------------------------------------------------
// Pretty error formatting
// ---------------------------------------------------------------------------

/**
 * Read a few lines around a source location for context display.
 *
 * @param {string} filePath
 * @param {number} line — 1-based line number
 * @param {number} [contextLines=2]
 * @returns {string} formatted source snippet with line numbers
 */
function getSourceContext(filePath, line, contextLines = 2) {
  try {
    const source = readFileSync(filePath, "utf8");
    const lines = source.split("\n");
    const start = Math.max(0, line - 1 - contextLines);
    const end = Math.min(lines.length, line + contextLines);

    let result = "";
    for (let i = start; i < end; i++) {
      const lineNum = String(i + 1).padStart(4);
      const marker = (i + 1 === line) ? c.red(" > ") : "   ";
      const numStr = (i + 1 === line) ? c.red(lineNum) : c.dim(lineNum);
      result += `${marker}${numStr} ${c.dim("|")} ${lines[i]}\n`;
    }
    return result;
  } catch {
    return "";
  }
}

/**
 * Format a compiler error for pretty terminal output.
 *
 * @param {object} err — compiler error object
 * @param {string} cwd — current working directory for relative paths
 * @returns {string}
 */
function formatError(err, cwd) {
  const parts = [];

  // Header: error code + message
  const label = c.bold(c.red("error"));
  const code = err.code ? c.dim(`[${err.code}]`) : "";
  parts.push(`${label}${code ? " " + code : ""}: ${err.message}`);

  // Source location
  if (err.filePath || err.file) {
    const filePath = err.filePath || err.file;
    const relPath = relative(cwd, filePath);
    const loc = err.line ? `:${err.line}${err.column ? ":" + err.column : ""}` : "";
    parts.push(`  ${c.cyan("-->")} ${relPath}${loc}`);

    // Source context
    if (err.line) {
      const ctx = getSourceContext(filePath, err.line);
      if (ctx) parts.push(ctx.trimEnd());
    }
  }

  // Stage info
  if (err.stage) {
    parts.push(`  ${c.dim("stage:")} ${err.stage}`);
  }

  return parts.join("\n");
}

/**
 * Format a compiler warning.
 *
 * @param {object} warn
 * @param {string} cwd
 * @returns {string}
 */
function formatWarning(warn, cwd) {
  const label = c.bold(c.yellow("warning"));
  const code = warn.code ? c.dim(`[${warn.code}]`) : "";
  let msg = `${label}${code ? " " + code : ""}: ${warn.message}`;

  if (warn.filePath || warn.file) {
    const filePath = warn.filePath || warn.file;
    const relPath = relative(cwd, filePath);
    const loc = warn.line ? `:${warn.line}` : "";
    msg += `\n  ${c.cyan("-->")} ${relPath}${loc}`;
  }

  return msg;
}

// ---------------------------------------------------------------------------
// Compilation runner
// ---------------------------------------------------------------------------

/**
 * Run a single compilation pass and print pretty summary.
 *
 * @param {object} opts — same shape as compileScrml options (minus write/log)
 * @param {object|null} [selfHostModules] — pre-loaded self-hosted modules, or null
 * @returns {{ success: boolean }}
 */
function runOnce(opts, selfHostModules = null) {
  const { inputFiles, outputDir, verbose, convertLegacyCss, embedRuntime, mode, emitBatchPlan } = opts;
  const cwd = process.cwd();

  if (verbose) {
    const modeLabel = mode + (selfHostModules ? " [self-host]" : "");
    console.log(c.dim(`scrml compile — ${inputFiles.length} input file(s) [mode: ${modeLabel}]`));
    for (const f of inputFiles) {
      console.log(c.dim(`  ${relative(cwd, f)}`));
    }
  }

  let result;
  try {
    result = compileScrml({
      inputFiles,
      outputDir,
      verbose,
      convertLegacyCss,
      embedRuntime,
      mode,
      write: true,
      log: verbose ? (msg) => console.log(c.dim(msg)) : () => {},
      selfHostModules,
    });
  } catch (err) {
    // ENOENT — file not found, not a compiler bug
    if (err.code === "ENOENT") {
      const missingPath = err.path || err.message;
      console.error(c.red("error:") + ` File not found: ${missingPath}`);
      return { success: false };
    }
    // Unexpected crash — show a clean message, not a stack trace
    console.error("");
    console.error(c.bold(c.red("Compiler crashed unexpectedly:")));
    console.error(`  ${err.message}`);
    if (verbose && err.stack) {
      console.error(c.dim(err.stack));
    }
    console.error("");
    console.error(c.dim("This is a compiler bug. Please report it."));
    return { success: false };
  }

  // Print warnings
  if (result.warnings.length > 0) {
    console.error("");
    for (const w of result.warnings) {
      console.error(formatWarning(w, cwd));
    }
  }

  // Print errors
  if (result.errors.length > 0) {
    console.error("");
    for (const e of result.errors) {
      console.error(formatError(e, cwd));
      console.error("");
    }
  }

  // Summary line
  const rawOutRel = relative(cwd, result.outputDir) || result.outputDir;
  const outRel = rawOutRel.startsWith("..") ? result.outputDir : rawOutRel;
  if (result.errors.length > 0) {
    const errCount = result.errors.length;
    const warnCount = result.warnings.length;
    const counts = [c.red(`${errCount} error${errCount !== 1 ? "s" : ""}`)];
    if (warnCount > 0) counts.push(c.yellow(`${warnCount} warning${warnCount !== 1 ? "s" : ""}`));
    console.error(c.bold(c.red("FAILED")) + ` — ${counts.join(", ")}`);
    return { success: false };
  }

  // Success summary
  const fileLabel = inputFiles.length === 1 ? "file" : "files";
  const summary = c.bold(c.green(`Compiled ${inputFiles.length} ${fileLabel} in ${result.durationMs}ms`));
  const arrow = c.green("->");
  console.log(`\n${summary} ${arrow} ${c.cyan(outRel + "/")}`);

  if (result.warnings.length > 0) {
    console.log(c.yellow(`  ${result.warnings.length} warning${result.warnings.length !== 1 ? "s" : ""}`));
  }

  if (emitBatchPlan && typeof result.batchPlanJson === "function") {
    console.log("\n" + c.dim("// --- BatchPlan (§PIPELINE Stage 7.5) ---"));
    console.log(result.batchPlanJson());
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Self-host module loader
// ---------------------------------------------------------------------------

/**
 * Dynamically load compiled self-hosted scrml modules from dist/self-host/.
 * Returns an object with { resolveModules, runMetaChecker } from the compiled JS.
 * Throws if the compiled modules do not exist (run build-self-host.js first).
 *
 * @param {string} compilerSrcDir — absolute path to compiler/src/
 * @returns {Promise<{resolveModules: Function, runMetaChecker: Function}>}
 */
async function loadSelfHostModules(compilerSrcDir) {
  // compiler/src/ → compiler/dist/self-host/
  const distSelfHostDir = resolve(compilerSrcDir, "..", "dist", "self-host");
  const moduleResolverPath = join(distSelfHostDir, "module-resolver.js");
  const metaCheckerPath = join(distSelfHostDir, "meta-checker.js");
  // Try both names: tokenizer.js (expected) and tab.js (build script output name)
  let tokenizerPath = join(distSelfHostDir, "tokenizer.js");
  if (!existsSync(tokenizerPath)) {
    tokenizerPath = join(distSelfHostDir, "tab.js");
  }

  let moduleResolverMod, metaCheckerMod, tokenizerMod;
  try {
    moduleResolverMod = await import(moduleResolverPath);
  } catch (err) {
    throw new Error(
      `--self-host: failed to load compiled module-resolver.\n` +
      `  Expected: ${moduleResolverPath}\n` +
      `  Run: bun run compiler/scripts/build-self-host.js\n` +
      `  Original error: ${err.message}`
    );
  }

  try {
    metaCheckerMod = await import(metaCheckerPath);
  } catch (err) {
    throw new Error(
      `--self-host: failed to load compiled meta-checker.\n` +
      `  Expected: ${metaCheckerPath}\n` +
      `  Run: bun run compiler/scripts/build-self-host.js\n` +
      `  Original error: ${err.message}`
    );
  }

  const resolveModules = moduleResolverMod.resolveModules;
  const runMetaChecker = metaCheckerMod.runMetaChecker;

  if (typeof resolveModules !== "function") {
    throw new Error(
      `--self-host: compiled module-resolver.js does not export resolveModules.\n` +
      `  Got: ${typeof resolveModules}\n` +
      `  Re-run: bun run compiler/scripts/build-self-host.js`
    );
  }
  if (typeof runMetaChecker !== "function") {
    throw new Error(
      `--self-host: compiled meta-checker.js does not export runMetaChecker.\n` +
      `  Got: ${typeof runMetaChecker}\n` +
      `  Re-run: bun run compiler/scripts/build-self-host.js`
    );
  }

  // Tokenizer — optional (only loaded if compiled module exists)
  let tokenizer = null;
  try {
    tokenizerMod = await import(tokenizerPath);
    if (typeof tokenizerMod.tokenizeBlock === "function") {
      tokenizer = {
        tokenizeBlock: tokenizerMod.tokenizeBlock,
        tokenizeAttributes: tokenizerMod.tokenizeAttributes,
        tokenizeLogic: tokenizerMod.tokenizeLogic,
        tokenizeSQL: tokenizerMod.tokenizeSQL,
        tokenizeCSS: tokenizerMod.tokenizeCSS,
        tokenizeError: tokenizerMod.tokenizeError,
        tokenizePassthrough: tokenizerMod.tokenizePassthrough,
      };
    }
  } catch {
    // Tokenizer self-host module not available — use JS original
  }

  // Load remaining self-hosted stages (optional — each loaded if available)
  const result = { resolveModules, runMetaChecker, tokenizer };

  const optionalModules = [
    { file: "bs.js", key: "splitBlocks", exportName: "splitBlocks" },
    { file: "ast.js", key: "buildAST", exportName: "buildAST" },
    { file: "bpp.js", key: "bpp", loader: (mod) => ({
        splitBareExprStatements: mod.splitBareExprStatements,
        splitMergedStatements: mod.splitMergedStatements,
        isLeakedComment: mod.isLeakedComment,
        stripLeakedComments: mod.stripLeakedComments,
      })
    },
    { file: "pa.js", key: "runPA", exportName: "runPA" },
    { file: "ri.js", key: "runRI", exportName: "runRI" },
    { file: "ts.js", key: "runTS", exportName: "runTS" },
    { file: "dg.js", key: "runDG", exportName: "runDG" },
    { file: "cg.js", key: "runCG", exportName: "runCG" },
  ];

  for (const { file, key, exportName, loader } of optionalModules) {
    const modPath = join(distSelfHostDir, file);
    try {
      if (existsSync(modPath)) {
        const mod = await import(modPath);
        if (loader) {
          result[key] = loader(mod);
        } else if (typeof mod[exportName] === "function") {
          result[key] = mod[exportName];
        }
      }
    } catch {
      // Optional module not available — use JS original
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Entry point for the compile subcommand.
 *
 * @param {string[]} args — raw argv slice after "compile"
 */
export async function runCompile(args) {
  const opts = parseArgs(args);

  if (opts.inputFiles.length === 0) {
    console.error(c.red("error:") + " No input files specified.\n");
    console.error("Usage: scrml compile <file.scrml|directory> [options]\n");
    console.error("Examples:");
    console.error("  scrml compile src/app.scrml");
    console.error("  scrml compile src/");
    console.error("");
    console.error("Options:");
    console.error("  --output-dir, -o <dir>  Output directory (default: dist/)");
    console.error("  --verbose, -v           Show per-stage timing");
    console.error("  --embed-runtime         Embed runtime instead of external script");
    console.error("  --watch, -w             Watch mode (recompile on changes)");
    console.error("  --convert-legacy-css    Convert <style> blocks to #{...}");
    console.error("  --mode <mode>           Output mode: browser (default) or library");
    console.error("  --self-host             Use compiled scrml modules for all pipeline stages");
    console.error("                          Requires: bun run compiler/scripts/build-self-host.js");
    process.exit(1);
  }

  // Load self-hosted modules if requested (async, before first compilation)
  let selfHostModules = null;
  if (opts.selfHost) {
    const compilerSrcDir = resolve(new URL(import.meta.url).pathname, "..", "..");
    try {
      selfHostModules = await loadSelfHostModules(compilerSrcDir);
      const loadedModules = ["module-resolver", "meta-checker"];
      if (selfHostModules.tokenizer) loadedModules.push("tokenizer");
      if (selfHostModules.splitBlocks) loadedModules.push("block-splitter");
      if (selfHostModules.buildAST) loadedModules.push("ast-builder");
      if (selfHostModules.bpp) loadedModules.push("body-pre-parser");
      if (selfHostModules.runPA) loadedModules.push("protect-analyzer");
      if (selfHostModules.runRI) loadedModules.push("route-inference");
      if (selfHostModules.runTS) loadedModules.push("type-system");
      if (selfHostModules.runDG) loadedModules.push("dependency-graph");
      if (selfHostModules.runCG) loadedModules.push("codegen");
      console.log(c.dim(`self-host: loaded ${loadedModules.length} compiled scrml modules (${loadedModules.join(", ")})`));
    } catch (err) {
      console.error(c.red("error:") + ` ${err.message}`);
      process.exit(1);
    }
  }

  const { success } = runOnce(opts, selfHostModules);

  if (!opts.watchMode) {
    if (!success) process.exit(1);
    return;
  }

  // ---------------------------------------------------------------------------
  // Watch mode
  // ---------------------------------------------------------------------------

  console.log(c.dim(`\nWatching for changes... (Ctrl+C to stop)`));

  // Determine directories to watch (unique set containing all input files)
  const dirsToWatch = new Set(opts.inputFiles.map(f => dirname(f)));

  let debounceTimer = null;

  function scheduleRecompile(eventType, filename) {
    if (filename && !filename.endsWith(".scrml")) return; // ignore non-scrml changes
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log(c.dim(`\n[watch] Change detected — recompiling...`));
      runOnce(opts, selfHostModules);
    }, 100);
  }

  for (const dir of dirsToWatch) {
    watch(dir, { recursive: true }, scheduleRecompile);
  }

  // Keep process alive
  await new Promise(() => {});
}
