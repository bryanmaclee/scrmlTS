#!/usr/bin/env node
// splice-section-18.js
// Replaces §18 in SPEC.md with the new content from docs/spec-section-18-draft.md
// Usage: node scripts/splice-section-18.js
//
// Splice logic (all by content search, not hardcoded line numbers):
//   Keep: everything up to and including the blank line before "## 18."
//   Replace: old §18 body (from "## 18." up to but not including the closing ---)
//   Keep: closing --- separator and everything after (§19 onward)
//
// Also patches §34.4 to extend the "match arms:" paragraph with three new
// normative statements (lin/match gap resolution from §18.12).
//
// Also replaces the **Status:** line with an updated version record.

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

const specPath = resolve(root, "SPEC.md");
const draftPath = resolve(root, "docs/spec-section-18-draft.md");

const specLines = readFileSync(specPath, "utf8").split("\n");
const newSection18 = readFileSync(draftPath, "utf8");

// ── 1. Locate splice boundaries by content search (0-indexed) ────────────────
const s18Start = specLines.findIndex(l => l === "## 18. Pattern Matching and Enums");
if (s18Start === -1) throw new Error("Could not find §18 header");

const s19Start = specLines.findIndex(l => l === "## 19. Error Handling");
if (s19Start === -1) throw new Error("Could not find §19 header");

// Structure around the section:
//   s18Start-2: "---"
//   s18Start-1: ""   (blank)
//   s18Start:   "## 18. ..."
//   ...old §18 body...
//   s19Start-2: "---"
//   s19Start-1: ""   (blank)
//   s19Start:   "## 19. ..."
//
// We keep lines 0..(s18Start-1) inclusive (the --- + blank before §18),
// then insert new §18 content,
// then keep lines (s19Start-2)..end (the closing --- + blank + §19 onward).

const beforeLines = specLines.slice(0, s18Start);   // up to blank line before §18 header
const afterLines  = specLines.slice(s19Start - 2);  // from closing --- separator onward

const before = beforeLines.join("\n");
const after  = afterLines.join("\n");

// ── 2. Patch §34.4 ───────────────────────────────────────────────────────────
const old34_4 = `**match arms:** All arms of a \`match\` expression MUST consume the same set of \`lin\` variables. An arm that consumes a \`lin\` variable that another arm does not is E-LIN-003.`;

const new34_4 = `**match arms:** All arms of a \`match\` expression MUST consume the same set of \`lin\` variables. An arm that consumes a \`lin\` variable that another arm does not is E-LIN-003.

The following three rules extend §34.4 to cover gaps identified in the TS-C gate review (§18.12):

- **Match as consumption event:** A \`match\` expression over a \`lin\` variable IS a consumption event for that variable. The variable is consumed at the point of the \`match\` keyword, not inside each arm body.
- **Wildcard arm treatment:** The \`_\` arm is treated as a named arm for purposes of lin-set consistency. All arms including \`_\` MUST consume the same set of outer \`lin\` variables. An \`_\` arm that consumes a \`lin\` variable that explicit-variant arms do not (or vice versa) SHALL be a compile error (E-LIN-003).
- **Destructured payload bindings from \`lin\` values:** If the matched variable is \`lin\`, each destructured payload binding introduced in the arm pattern also inherits \`lin\` status. Each such binding MUST be consumed exactly once. Binding a field from a \`lin\` enum value does not satisfy the \`lin\` requirement for the other bindings; each is independent.`;

const patchedAfter = after.replace(old34_4, new34_4);
if (patchedAfter === after) {
  process.stderr.write("WARNING: §34.4 patch did not match — manual patch required.\n");
  process.stderr.write("Target text was:\n" + old34_4 + "\n");
} else {
  process.stdout.write("§34.4 patched.\n");
}

// ── 3. Patch the **Status:** line ────────────────────────────────────────────
// Replace the entire **Status:** line (regex anchored to start of line).
const statusRegex = /^\*\*Status:\*\* Draft.*$/m;
const newStatusLine = `**Status:** Draft — updated 2026-03-25 (see docs/spec-updates-2026-03-25.md; see docs/spec-updates-§4-2026-03-25.md for §4 block grammar additions); §4.10, §4.11, §10.4, §10.5 resolutions reviewed 2026-03-25 and revised per REVISE items in docs/reviews/language/spec-resolution-review-§4.10-§4.11-§10.4-§10.5-2026-03-25.md; §11 revised 2026-03-26 per design review docs/reviews/language/spec-review-§11-protect-PA-gate-2026-03-26.md (11 blocking issues resolved); §18 fully rewritten 2026-03-27 resolving all 11 blocking issues from docs/reviews/language/spec-review-§18-TS-C-gate-2026-03-27.md; E-EXHAUST-001 retired, E-TYPE-020 canonical; §34.4 extended with lin/match gap resolutions`;

const patchedBefore = before.replace(statusRegex, newStatusLine);
if (patchedBefore === before) {
  process.stderr.write("WARNING: status line patch did not match — manual update required.\n");
} else {
  process.stdout.write("Status line patched.\n");
}

// ── 4. Assemble and write ─────────────────────────────────────────────────────
// before ends with the blank line before §18 (no trailing newline from join)
// newSection18 starts with "## 18. ..." and has no leading newline
// patchedAfter starts with "---" (the closing separator before §19)
const assembled = patchedBefore + "\n" + newSection18 + "\n\n" + patchedAfter;

writeFileSync(specPath, assembled, "utf8");
const lineCount = assembled.split("\n").length;
process.stdout.write(`SPEC.md written — ${lineCount} lines. Splice complete.\n`);
process.stdout.write("Verify: §18 (pattern matching), §34.4 (lin/match rules), status header.\n");
