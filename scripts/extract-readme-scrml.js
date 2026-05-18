#!/usr/bin/env bun
/**
 * scripts/extract-readme-scrml.js
 *
 * Compile-gate for `​```scrml` fenced blocks in `README.md`. Triggered by the
 * pre-push hook when a `refs/tags/v*` ref is in the push payload (release-tag
 * push). README.md is the community-facing nominal reference for scrml; its
 * code examples should compile clean + lint clean at every release-tag cut.
 *
 * Behavior per block:
 *   - Default: compile + lint-clean check (any error fails the gate; any
 *     ghost-pattern lint W-LINT-* fails the gate).
 *   - Opt-out marker: a snippet whose first non-blank line is
 *     `// gate: skip` is skipped (used for illustrative fragments that
 *     aren't standalone-runnable).
 *
 * The marker default is opt-OUT (default-gated) because README.md is the
 * community-facing SoT and accuracy is the load-bearing intent.
 *
 * Exit: 0 on all-pass; 1 on any failure. Stdout summarises per-block status;
 * stderr carries compile/lint error details on failure.
 *
 * Authored S101 (2026-05-18). Companion to the pre-push hook.
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { execFileSync } from "child_process";
import { lintGhostPatterns } from "../compiler/src/lint-ghost-patterns.js";

const README_PATH = "README.md";
const README = readFileSync(README_PATH, "utf8");

// Extract every ```scrml ... ``` fenced block plus its 1-based start line.
function extractBlocks(text) {
  const blocks = [];
  const lines = text.split("\n");
  let inBlock = false;
  let blockStartLine = 0;
  let blockBody = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inBlock && line.trimEnd() === "```scrml") {
      inBlock = true;
      blockStartLine = i + 2; // first content line is i+2 (1-based)
      blockBody = [];
      continue;
    }
    if (inBlock && line.trimEnd() === "```") {
      blocks.push({ startLine: blockStartLine, body: blockBody.join("\n") });
      inBlock = false;
      continue;
    }
    if (inBlock) blockBody.push(line);
  }
  return blocks;
}

const blocks = extractBlocks(README);
if (blocks.length === 0) {
  console.log("README scrml gate: no ```scrml blocks found in README.md.");
  process.exit(0);
}

const tempDir = mkdtempSync(join(tmpdir(), "readme-gate-"));
let passed = 0;
let skipped = 0;
let failed = 0;
const failures = [];

for (let i = 0; i < blocks.length; i++) {
  const { body, startLine } = blocks[i];
  const blockNum = i + 1;
  const firstContentLine = body.split("\n").find((l) => l.trim().length > 0) ?? "";
  if (/^\s*\/\/\s*gate:\s*skip\b/.test(firstContentLine)) {
    skipped++;
    console.log(`  README.md:${startLine}  block #${blockNum} — SKIP (// gate: skip)`);
    continue;
  }

  // Compile check.
  const path = join(tempDir, `snippet-${blockNum}.scrml`);
  writeFileSync(path, body);
  let compileOk = true;
  let compileOutput = "";
  try {
    execFileSync("bun", ["run", "compiler/src/cli.js", "compile", path], {
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    compileOk = false;
    compileOutput =
      (err.stderr ? err.stderr.toString() : "") +
      (err.stdout ? err.stdout.toString() : "");
  }

  // Lint check (ghost-pattern lints). Run regardless of compile result so we
  // surface both classes of failure.
  const ghostDiags = lintGhostPatterns(body, path);
  const ghostFailing = ghostDiags.length > 0;

  if (compileOk && !ghostFailing) {
    passed++;
    console.log(`  README.md:${startLine}  block #${blockNum} — OK`);
    continue;
  }

  failed++;
  const why = [];
  if (!compileOk) why.push("compile-fail");
  if (ghostFailing) why.push(`${ghostDiags.length} ghost-pattern lint(s)`);
  console.error(`  README.md:${startLine}  block #${blockNum} — FAILED (${why.join("; ")})`);
  failures.push({ blockNum, startLine, compileOutput, ghostDiags });
}

rmSync(tempDir, { recursive: true, force: true });

if (failed > 0) {
  console.error("");
  console.error("=== README scrml gate — failure detail ===");
  for (const f of failures) {
    console.error(`\n--- README.md:${f.startLine}  block #${f.blockNum} ---`);
    if (f.compileOutput) {
      console.error(
        f.compileOutput
          .split("\n")
          .filter((l) => l.trim().length > 0)
          .slice(0, 12)
          .map((l) => `  ${l}`)
          .join("\n"),
      );
    }
    if (f.ghostDiags.length > 0) {
      console.error("  Ghost-pattern lints:");
      for (const d of f.ghostDiags.slice(0, 6)) {
        console.error(`    ${d.code ?? "W-LINT-?"}: ${d.message ?? ""}`);
      }
      if (f.ghostDiags.length > 6) {
        console.error(`    ... and ${f.ghostDiags.length - 6} more`);
      }
    }
  }
}

console.log("");
console.log(
  `README scrml gate: ${passed} passed, ${skipped} skipped, ${failed} failed (${blocks.length} total).`,
);

if (failed > 0) {
  console.error("");
  console.error(
    "If a block is intentionally a non-runnable illustrative fragment, " +
      "add `// gate: skip` as its first content line.",
  );
}

process.exit(failed > 0 ? 1 : 0);
