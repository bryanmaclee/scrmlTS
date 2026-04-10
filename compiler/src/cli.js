#!/usr/bin/env bun
/**
 * scrml — CLI entry point with subcommand routing.
 *
 * Usage:
 *   scrml compile <file.scrml|dir> [options]
 *   scrml dev <file.scrml|dir> [options]
 *   scrml build <dir> [options]
 *   scrml --help
 *   scrml --version
 *
 * Falls through to compile if the first arg is a .scrml file or directory.
 */

import { statSync } from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read version from the nearest package.json that has it
let version = "0.2.0";
try {
  // Walk up to find a package.json with a version field
  const pkgPath = join(__dirname, "../../package.json");
  const pkg = JSON.parse(await Bun.file(pkgPath).text());
  if (pkg.version) version = pkg.version;
} catch { /* use default */ }

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log(`scrml compiler v${version}

Usage:
  scrml init [directory]                     Scaffold a new scrml project
  scrml compile <file.scrml|dir> [options]   Compile scrml source
  scrml dev <file.scrml|dir> [options]       Compile + watch + serve
  scrml build <dir> [options]                Build production server
  scrml serve [options]                      Start persistent compiler server

Options (compile / dev):
  --output-dir, -o <dir>  Output directory (default: dist/ next to input)
  --verbose, -v           Per-stage timing and counts
  --convert-legacy-css    Convert <style> blocks to #{...}
  --embed-runtime         Embed runtime inline instead of writing a separate file
  --watch, -w             Watch for changes and recompile (compile command only)

Options (dev):
  --port <n>            HTTP port for dev server (default: 3000)

Options (build):
  --output <dir>        Output directory (default: dist/ next to input)
  --embed-runtime       Embed runtime inline instead of writing a separate file
  --minify              Enable minification (Phase 2 — accepted but no-op in v1)

Options (serve):
  --port <n>            HTTP port for compiler server (default: 3100, or SCRML_PORT env)
  --verbose, -v         Log per-stage timing for each compilation

Options (global):
  --help, -h            Show this message
  --version             Print version
`);
  process.exit(0);
}

if (args[0] === "--version") {
  console.log(version);
  process.exit(0);
}

// Resolve subcommand
let subcommand = args[0];
let subArgs = args.slice(1);

// Fall through: if first arg is a .scrml file or a directory, treat as compile
if (subcommand !== "compile" && subcommand !== "dev" && subcommand !== "build" && subcommand !== "serve" && subcommand !== "init") {
  // Check if it looks like a file or directory rather than a subcommand
  const looksLikeInput = subcommand.endsWith(".scrml") || (() => {
    try { return statSync(subcommand).isDirectory(); } catch { return false; }
  })();

  if (looksLikeInput) {
    subcommand = "compile";
    subArgs = args; // include the first arg — it is the input
  } else {
    console.error(`Unknown subcommand: ${subcommand}`);
    console.error('Run `scrml --help` for usage.');
    process.exit(1);
  }
}

// Dispatch to subcommand handler
if (subcommand === "init") {
  const { runInit } = await import("./commands/init.js");
  await runInit(subArgs);
} else if (subcommand === "compile") {
  const { runCompile } = await import("./commands/compile.js");
  await runCompile(subArgs);
} else if (subcommand === "dev") {
  const { runDev } = await import("./commands/dev.js");
  await runDev(subArgs);
} else if (subcommand === "build") {
  const { runBuild } = await import("./commands/build.js");
  await runBuild(subArgs);
} else if (subcommand === "serve") {
  const { runServe } = await import("./commands/serve.js");
  await runServe(subArgs);
}
