#!/usr/bin/env bun
/**
 * Phase A1a Step 12 — validate batch-2 didn't introduce parser-bug-driven
 * decl loss. Compare AST decl counts pre/post commit.
 *
 * For each file, compare HEAD vs HEAD~1 — if total state-decl count
 * (including writes) DECREASED, that's a parser-bug-driven loss.
 *
 * Usage:
 *   bun scripts/step12-validate-batch.mjs <commit-pre> <commit-post>
 */

import { execSync } from "node:child_process";
import { splitBlocks } from "../compiler/src/block-splitter.js";
import { buildAST } from "../compiler/src/ast-builder.js";

function countStateDecls(source) {
  let astOut;
  try {
    const bs = splitBlocks("test.scrml", source);
    astOut = buildAST(bs);
  } catch (e) { return -1; }
  const ast = astOut.ast;
  let count = 0;
  const seen = new WeakSet();
  function walk(n) {
    if (!n || typeof n !== "object") return;
    if (seen.has(n)) return;
    seen.add(n);
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.kind === "state-decl") count++;
    for (const k of Object.keys(n)) {
      if (k === "span" || k === "parent") continue;
      walk(n[k]);
    }
  }
  walk(ast);
  return count;
}

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error("Usage: bun scripts/step12-validate-batch.mjs <pre-commit> <post-commit>");
  process.exit(1);
}
const [preRef, postRef] = args;

// Get list of files modified in postRef vs preRef.
const filesOut = execSync(`git diff --name-only ${preRef} ${postRef} -- samples/`, { encoding: "utf8" });
const files = filesOut.split("\n").filter(f => f.endsWith(".scrml"));

let regressed = 0;
let same = 0;
let improved = 0;
let parseFailedPre = 0;
let parseFailedPost = 0;

for (const f of files) {
  let pre, post;
  try { pre = execSync(`git show ${preRef}:${f}`, { encoding: "utf8" }); }
  catch (e) { pre = null; }
  try { post = execSync(`git show ${postRef}:${f}`, { encoding: "utf8" }); }
  catch (e) { post = null; }
  if (pre === null || post === null) continue;

  const preCount = countStateDecls(pre);
  const postCount = countStateDecls(post);
  if (preCount === -1) parseFailedPre++;
  if (postCount === -1) parseFailedPost++;
  if (preCount > postCount) {
    regressed++;
    console.log(`REGRESSED\t${f}\tpre=${preCount}\tpost=${postCount}\tdiff=${postCount - preCount}`);
  } else if (preCount < postCount) {
    improved++;
  } else {
    same++;
  }
}

console.log("");
console.log(`# Files compared: ${files.length}`);
console.log(`# Regressed (decl count dropped): ${regressed}`);
console.log(`# Same: ${same}`);
console.log(`# Improved: ${improved}`);
console.log(`# parseFailedPre: ${parseFailedPre}`);
console.log(`# parseFailedPost: ${parseFailedPost}`);
