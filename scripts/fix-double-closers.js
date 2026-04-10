#!/usr/bin/env bun
/**
 * Fix // double-closer patterns in gauntlet files.
 * Replaces // that appears after content (not as line-start comment) with / /
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";

const root = resolve(import.meta.dir, "../gauntlet/round3");

function findScrml(dir) {
  let files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files = files.concat(findScrml(full));
    else if (entry.endsWith(".scrml")) files.push(full);
  }
  return files;
}

let totalFixed = 0;
for (const f of findScrml(root)) {
  const content = readFileSync(f, "utf8");
  const lines = content.split("\n");
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();

    // Skip lines that start with // (actual comments)
    if (trimmed.startsWith("//")) continue;

    // Look for // that appears after content like: content// or content /
    // Pattern: something>text// or something/ / or >//
    // We need to find // that is NOT:
    // - Inside a string ("https://...")
    // - A real comment at line start
    // - Inside ${...} expressions

    // Simple heuristic: if // appears and there's a > or / before it on the same line
    // (suggesting it's closing tags), replace with / /

    let idx = 0;
    let newLine = line;
    let lineChanged = false;

    while (true) {
      idx = newLine.indexOf("//", idx);
      if (idx === -1) break;

      // Don't touch URLs
      if (idx > 0 && newLine[idx-1] === ":") { idx += 2; continue; }

      // Don't touch if it's inside a string (rough check: count quotes before)
      const before = newLine.slice(0, idx);
      const dblQuotes = (before.match(/"/g) || []).length;
      const sglQuotes = (before.match(/'/g) || []).length;
      const backticks = (before.match(/`/g) || []).length;
      if (dblQuotes % 2 !== 0 || sglQuotes % 2 !== 0 || backticks % 2 !== 0) {
        idx += 2;
        continue;
      }

      // Check if this looks like a double closer: content before it on the line
      // that includes > or / (tag content)
      if (before.trim().length > 0 && (before.includes(">") || before.includes("/"))) {
        newLine = newLine.slice(0, idx) + "/ /" + newLine.slice(idx + 2);
        lineChanged = true;
        idx += 3; // skip past "/ /"
      } else {
        idx += 2;
      }
    }

    if (lineChanged) {
      lines[i] = newLine;
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(f, lines.join("\n"));
    totalFixed++;
    console.log(`Fixed: ${f.replace(root + "/", "")}`);
  }
}

console.log(`\nTotal files fixed: ${totalFixed}`);
