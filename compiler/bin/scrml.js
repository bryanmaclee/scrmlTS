#!/usr/bin/env bun
/**
 * scrml CLI — executable entry point.
 *
 * This file exists so that `npx scrml`, `bun run scrml`, or a direct
 * `./compiler/bin/scrml.js compile ...` all work. It simply re-exports
 * the subcommand router in src/cli.js.
 */
import "../src/cli.js";
