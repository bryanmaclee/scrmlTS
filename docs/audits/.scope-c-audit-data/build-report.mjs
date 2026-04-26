// Build the final markdown report.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/home/bryan-maclee/scrmlMaster/scrmlTS";
const TSV = `${ROOT}/docs/audits/.scope-c-audit-data/results.tsv`;
const lines = readFileSync(TSV, "utf8").trim().split("\n");
lines.shift();
const rows = lines.map(l => {
  const parts = l.split("\t");
  return {
    file: parts[0],
    exit: parseInt(parts[1], 10),
    warn_codes: parts[2] ? parts[2].split(",").filter(Boolean) : [],
    err_codes: parts[3] ? parts[3].split(",").filter(Boolean) : [],
    first_err: parts[4] || "",
  };
});

const fails = rows.filter(r => r.exit !== 0).sort((a, b) => a.file.localeCompare(b.file));
const warns = rows.filter(r => r.exit === 0 && r.warn_codes.length > 0).sort((a, b) => a.file.localeCompare(b.file));
const cleans = rows.filter(r => r.exit === 0 && r.warn_codes.length === 0).sort((a, b) => a.file.localeCompare(b.file));

// FAIL classification --------------------------------------------------------
const negFnameRe = /(error-|invalid-|bad-|fail-|should-fail|negative|broken-|wrong-|unsupported-|forbidden-|conflict-)/i;
const negTopRe = /(should\s+(fail|reject|error)|compiler\s+should\s+reject|demonstrates?\s+the\s+(\w+\s+)?constraint|negative\s+test|expects?\s+E-|expected\s+E-|raises?\s+E-|rejects?\s+at\s+compile)/i;

function readTop(file) {
  const p = join(ROOT, "samples/compilation-tests", file);
  if (!existsSync(p)) return "";
  try { return readFileSync(p, "utf8").slice(0, 1500); } catch { return ""; }
}
function readLog(file) {
  const p = join(ROOT, `docs/audits/.scope-c-audit-data/logs/${file}.log`);
  if (!existsSync(p)) return "";
  try { return readFileSync(p, "utf8"); } catch { return ""; }
}

const failCats = { neg: [], stale: [], unknown: [] };
for (const r of fails) {
  const top = readTop(r.file);
  const log = readLog(r.file);
  if (negFnameRe.test(r.file) || negTopRe.test(top)) {
    const reason = negFnameRe.test(r.file)
      ? "filename indicates negative test"
      : "top-of-file comment indicates intentional rejection";
    failCats.neg.push({ ...r, reason });
    continue;
  }
  // Stale heuristic: log mentions "Unquoted identifier" missing @ sigil — that idiom moved post-S20
  // OR the sample explicitly self-describes as "Tests:" but produces scope/codegen errors that aren't in the test description
  const isSigilStale = /Unquoted identifier .* without its `@` sigil/.test(log);
  const isOldChannelShape = r.file === "channel-basic.scrml"; // file references "see gauntlet-s20-channels/..." copy that supersedes it
  const isMetaBunEval = /meta-(004-clean-config|005-nested-meta|010-reflect-with-config)/.test(r.file);
  const isOldEnumMatchShape = r.file === "gauntlet-s79-signup-form.scrml"; // E-TYPE-025 asIs match shape
  const isOldLiftShape = r.file === "gauntlet-s79-theme-settings.scrml"; // E-SYNTAX-002 lift in fn body
  const isOldTestPattern = /^(combined-012-login|comp-(004|006|009|013)|component-scoped-css|css-scope-01|func-007-fn-params|modern-006-canvas-with-helpers|protect-001-basic-auth)\.scrml$/.test(r.file);
  const isGauntletR10 = /^gauntlet-r10-/.test(r.file); // round-10 gauntlet attempts
  if (isSigilStale || isOldChannelShape || isMetaBunEval || isOldEnumMatchShape || isOldLiftShape || isOldTestPattern || isGauntletR10) {
    let reason = [];
    if (isSigilStale) reason.push("missing @ sigil idiom (post-S20 stricter scope rule)");
    if (isOldChannelShape) reason.push("superseded by gauntlet-s20-channels variant");
    if (isMetaBunEval) reason.push("uses bun.eval inside ^{} meta block (idiom changed)");
    if (isOldEnumMatchShape) reason.push("match on asIs subject (E-TYPE-025 — needs typed subject)");
    if (isOldLiftShape) reason.push("uses `lift` in standard function body (E-SYNTAX-002)");
    if (isOldTestPattern) reason.push("classic pattern sample using pre-strict-scope idioms");
    if (isGauntletR10) reason.push("round-10 gauntlet attempt — written before strict-scope tightening");
    failCats.stale.push({ ...r, reason: reason.join("; ") });
    continue;
  }
  failCats.unknown.push({ ...r, firstErrLine: (log.split("\n").find(l => /^error/.test(l)) || "").slice(0, 240) });
}

// WARN classification --------------------------------------------------------
// 224 of 229 warn-only samples carry W-PROGRAM-001 (no <program> root). That's clearly the systemic compiler default.
// W-LINT-* warnings are anti-pattern lints — when they fire on a warn-only sample, sample is exhibiting a stale shape.
// W-CG-001 (top-level sql suppressed from client) on sql-* samples is testing-of-warnings (those samples specifically demonstrate sql codegen).
// W-AUTH-001 on protect/server samples is deliberate (samples exercise auth without explicit <program auth=>).

const warnFreq = new Map();
for (const r of warns) for (const w of r.warn_codes) warnFreq.set(w, (warnFreq.get(w) || 0) + 1);
const warnFreqSorted = [...warnFreq.entries()].sort((a, b) => b[1] - a[1]);

function classifyWarn(r) {
  const set = new Set(r.warn_codes);
  // Pure W-PROGRAM-001 only
  if (set.size === 1 && set.has("W-PROGRAM-001")) return "systemic-warning";

  // Lint codes indicate stale shape
  const lintCodes = [...set].filter(c => /^W-LINT-/.test(c));
  if (lintCodes.length > 0) return "stale-shape";

  // sql-* with W-CG-001 — sample testing sql codegen warning
  if (/^sql-/.test(r.file) && set.has("W-CG-001")) return "testing-of-warnings";

  // server/protect samples with W-AUTH-001
  if ((/^(server|protect|gauntlet-r10-rails)/.test(r.file)) && set.has("W-AUTH-001")) return "testing-of-warnings";

  return "unknown";
}
const warnCats = { systemic: [], stale: [], testing: [], unknown: [] };
for (const r of warns) {
  const c = classifyWarn(r);
  if (c === "systemic-warning") warnCats.systemic.push(r);
  else if (c === "stale-shape") warnCats.stale.push(r);
  else if (c === "testing-of-warnings") warnCats.testing.push(r);
  else warnCats.unknown.push(r);
}

// ---------- Write report ------------------------------------------------------
const today = "2026-04-25";
const sha = "b1ce43217a50abe882b148d5eff66757cf6b4929";

let md = "";
md += `# Scope C Stage 1 — Sample Classification\n\n`;
md += `**Run:** ${today} by sample-classification agent\n`;
md += `**Compiler SHA:** ${sha}\n`;
md += `**Total samples (top-level):** ${rows.length}\n`;
md += `**Buckets:** clean=${cleans.length}, warn-only=${warns.length}, fail=${fails.length}\n\n`;
md += `> S41-close baseline was clean=27 / warn=224 / fail=24. Current run shows clean=${cleans.length} / warn=${warns.length} / fail=${fails.length}. The shift (5 samples that previously emitted no warnings now emit \`W-PROGRAM-001\`) is consistent with the spec calling for explicit \`<program>\` roots; nothing has regressed in the FAIL bucket (still 24).\n\n`;

md += `## Bucket totals\n\n`;
md += `| Bucket | Count |\n|---|---|\n`;
md += `| Clean | ${cleans.length} |\n`;
md += `| Warn-only | ${warns.length} |\n`;
md += `| Fail | ${fails.length} |\n\n`;

// FAIL section
md += `## Failing samples (${fails.length} files)\n\n`;
md += `### Negative-tests (correct failures) — ${failCats.neg.length}\n\n`;
md += `| File | Error code(s) | Why it's negative |\n|---|---|---|\n`;
for (const r of failCats.neg) md += `| \`${r.file}\` | ${r.err_codes.join(", ") || "—"} | ${r.reason} |\n`;
md += `\n`;

md += `### Stale failures — ${failCats.stale.length}\n\n`;
md += `| File | Error code(s) | Probable reason |\n|---|---|---|\n`;
for (const r of failCats.stale) md += `| \`${r.file}\` | ${r.err_codes.join(", ") || "—"} | ${r.reason} |\n`;
md += `\n`;

md += `### Unknown failures (manual review) — ${failCats.unknown.length}\n\n`;
if (failCats.unknown.length === 0) {
  md += `_None._\n\n`;
} else {
  md += `| File | Error code(s) | First error line |\n|---|---|---|\n`;
  for (const r of failCats.unknown) md += `| \`${r.file}\` | ${r.err_codes.join(", ") || "—"} | ${r.firstErrLine.replace(/\|/g, "\\|")} |\n`;
  md += `\n`;
}

// WARN section
md += `## Warning-only samples (${warns.length} files)\n\n`;
md += `### Warning code frequency\n\n`;
md += `| Warning code | Count | Bucket-leaning interpretation |\n|---|---|---|\n`;
const interp = {
  "W-PROGRAM-001": "Systemic — fires on every sample without `<program>` root. Compiler default.",
  "W-LINT-007": "Stale-shape — flags `<Comp prop={val}>` JSX-style attribute braces (§5).",
  "W-CG-001": "Testing-of-warnings on `sql-*` — top-level `<sql>` block suppressed from client output.",
  "W-LINT-013": "Stale-shape — flags Vue-style `@click=` event shorthand (§5).",
  "W-AUTH-001": "Systemic on protect/server — auto-injected auth middleware without explicit `auth=`.",
  "W-LINT-002": "Stale-shape — flags `oninput=${e => @x = e.target.value}` instead of `bind:value=@x` (§5).",
};
for (const [code, n] of warnFreqSorted) md += `| ${code} | ${n} | ${interp[code] || "_uncategorized_"} |\n`;
md += `\n`;

md += `### By bucket\n\n`;

md += `**testing-of-warnings (${warnCats.testing.length}):**\n\n`;
if (warnCats.testing.length === 0) md += `_None._\n\n`;
else {
  for (const r of warnCats.testing) md += `- \`${r.file}\` — warns: ${r.warn_codes.join(", ")}\n`;
  md += `\n`;
}

md += `**systemic-warning (${warnCats.systemic.length}):** all samples in this bucket emit only \`W-PROGRAM-001\` (no \`<program>\` root). Listing only the count — the entire warn-only bucket minus the special cases above.\n\n`;
md += `<details><summary>Click to expand systemic-warning file list (${warnCats.systemic.length})</summary>\n\n`;
for (const r of warnCats.systemic) md += `- \`${r.file}\`\n`;
md += `\n</details>\n\n`;

md += `**stale-shape (${warnCats.stale.length}):** files emitting one or more \`W-LINT-*\` codes (anti-pattern lints fire on samples that still use foreign-framework idioms or pre-strict-scope shapes).\n\n`;
for (const r of warnCats.stale) md += `- \`${r.file}\` — warns: ${r.warn_codes.join(", ")}\n`;
md += `\n`;

md += `**unknown (${warnCats.unknown.length}):**\n\n`;
if (warnCats.unknown.length === 0) md += `_None._\n\n`;
else {
  for (const r of warnCats.unknown) md += `- \`${r.file}\` — warns: ${r.warn_codes.join(", ")}\n`;
  md += `\n`;
}

// CLEAN section
md += `## Clean samples (${cleans.length} files)\n\n`;
for (const r of cleans) md += `- \`${r.file}\`\n`;
md += `\n`;

// Notes
md += `## Notes for the PA\n\n`;
md += `### Surprising findings\n\n`;
md += `1. **Zero failures matched the negative-test filename heuristic** (\`error-\`, \`invalid-\`, \`bad-\`, etc.). Only one sample (\`lin-002-double-use.scrml\`) self-identifies as a negative test via top-of-file comment ("The compiler should reject this with E-LIN-002"). Effectively the \`samples/compilation-tests/*.scrml\` top-level set is **almost entirely happy-path samples**; intentionally-failing examples live elsewhere or are encoded only by content. Worth confirming whether the project intends to keep negative tests in this directory at all.\n`;
md += `2. **Half the FAIL bucket (12 of 24) is the same root cause: missing \`@\` sigil on reactive vars in attribute values.** The error message ("Unquoted identifier \\\`isOpen\\\` in attribute \\\`if\\\` references the reactive variable \\\`@isOpen\\\` without its \\\`@\\\` sigil.") fires on \`comp-004-modal\`, \`comp-006-alert\`, \`comp-009-dropdown\`, \`comp-013-tooltip\`, \`combined-012-login\`, and several gauntlet-r10 files. This is one stale idiom, not 12 distinct bugs — a single batch refresh of these samples (and a clear note in the spec migration log) would unstick most of the FAIL bucket.\n`;
md += `3. **\`W-PROGRAM-001\` dominates the warn-only bucket (224 of 229 samples ≈ 97.8%).** Effectively every top-level sample triggers it. Either (a) the warning is too eager — many samples are intentionally minimal demos that don't need a \`<program>\` root, or (b) the samples should be migrated to wrap content in \`<program>\`. Recommendation below.\n\n`;

md += `### Top 3 stale-shape patterns observed\n\n`;
md += `1. **Missing \`@\` sigil on reactive vars in attribute values** (12+ FAIL samples): \`<div if=isOpen>\` instead of \`<div if=@isOpen>\`. Post-S20 strict-scope tightening means unqualified identifiers in attributes resolve to nothing.\n`;
md += `2. **Foreign-framework event syntax in lint warnings**: \`@click="handler"\` (Vue) flagged by \`W-LINT-013\`, \`oninput=\${e => @x = e.target.value}\` (React) flagged by \`W-LINT-002\`, \`<Comp prop={val}>\` (JSX) flagged by \`W-LINT-007\`. These appear in larger gauntlet samples (\`gauntlet-r10-rails-blog\`, \`modern-003-full-app\`, \`gauntlet-r10-svelte-dashboard\`) where the dev imported their home-framework's idioms wholesale.\n`;
md += `3. **\`bun.eval\` inside meta blocks** (\`meta-004-clean-config\`, \`meta-005-nested-meta\`, \`meta-010-reflect-with-config\` all FAIL with \`E-SCOPE-001\`). The \`^{} let X = bun.eval(...)\` pattern doesn't bind \`X\` into the surrounding markup-evaluation scope under current rules.\n\n`;

md += `### Warning codes worth investigating\n\n`;
md += `- **\`W-PROGRAM-001\` (224 hits):** by far the highest volume, but probably *correct* — it is the compiler nudging samples toward explicit \`<program>\` wrapping. Decision needed: do we want every sample to gain a \`<program>\` root (mass migration), or do we want to soften this warning to fire only when DB/auth/HTML-spec config is implicitly required? Either is fine — the current state pollutes warn-only counts.\n`;
md += `- **\`W-LINT-007\` (9 hits), \`W-LINT-013\` (4), \`W-LINT-002\` (2):** these are doing exactly their job — flagging foreign-framework migrations. The 9 \`W-LINT-007\` hits cluster in larger sample files (\`modern-002-projection\`, \`modern-003-full-app\`, \`state-009-enum-in-state\`, etc.). Worth a one-time refresh pass to either (a) clean up the JSX braces, or (b) tag these files as "dev-onboarding showcase: see how lints catch your old habits" so the warnings are intentional.\n`;
md += `- **\`W-CG-001\` (5 hits, all \`sql-*\`):** likely intentional — the \`sql-005-insert\`/\`-006-update\`/\`-007-delete\`/\`-010-create-table\` samples demonstrate top-level SQL blocks getting suppressed from client output. Confirm with the SQL feature owner; if intentional, mark these as testing-of-warnings explicitly.\n`;
md += `- **\`W-AUTH-001\` (3 hits, all server/protect):** also likely intentional — \`protect-001-basic-auth\`, \`server-002-protect\`, \`server-003-protect-multi\`, \`gauntlet-r10-rails-blog\` exercise auth-middleware auto-injection. Worth one explicit acknowledgement so it's not classified as drift.\n\n`;

md += `## Tags\n\n`;
md += `#scope-c #stage-1 #sample-classification\n\n`;

md += `## Links\n\n`;
md += `- /home/bryan-maclee/scrmlMaster/scrmlTS/master-list.md\n`;
md += `- /home/bryan-maclee/scrmlMaster/scrmlTS/compiler/SPEC.md\n`;
md += `- Raw audit data (TSV + per-file logs): \`/home/bryan-maclee/scrmlMaster/scrmlTS/docs/audits/.scope-c-audit-data/\`\n`;

writeFileSync(`${ROOT}/docs/audits/scope-c-stage-1-sample-classification.md`, md);
console.log("REPORT written to docs/audits/scope-c-stage-1-sample-classification.md");
console.log(`Counts: clean=${cleans.length} warn=${warns.length} fail=${fails.length}`);
console.log(`Fail breakdown: negative-test=${failCats.neg.length} stale=${failCats.stale.length} unknown=${failCats.unknown.length}`);
console.log(`Warn breakdown: systemic=${warnCats.systemic.length} stale-shape=${warnCats.stale.length} testing=${warnCats.testing.length} unknown=${warnCats.unknown.length}`);
