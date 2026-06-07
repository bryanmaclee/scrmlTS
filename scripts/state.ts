// scripts/state.ts — DD3 Fork 3A (print-half). change-id: dd3-state-self-evidence-2026-06-07
//
// PRINTS a derive-don't-declare "state at HEAD" report to stdout. READ-ONLY: writes nothing.
// Run with: `bun scripts/state.ts`. Dependency-free (Bun built-ins only).
//
// House style mirrors scripts/regen-spec-index.ts (plain bun-run TS, readFileSync, anchor parsing).
//
// COUNT BASIS (the whole point of DD3 Fork 2 — see docs/known-gaps.md §0 "Count basis" legend):
//   Every gap in docs/known-gaps.md carries a grep token
//     <!-- @gap id=<id> sev=<HIGH|MED|LOW|NOMINAL> status=<open|resolved|deferred|nominal|non-gap|forensic> -->
//   Headline counts derive ONLY from these tokens:
//     HIGH/MED/LOW open = `sev=<SEV> status=open`
//     Nominal line      = `sev=NOMINAL status=nominal`
//   Everything else (resolved/deferred/non-gap/forensic, and a non-NOMINAL status=nominal such as the
//   framing-corrected Bug 10) is excluded — those are the four entries a human silently discounts.
//   The §R28/§R27 cluster-table OPEN rows DO count (their tokens live inline in each row's final cell).
//   This reproduces the canonical S170 hand-count HIGH 0 · MED 9 · LOW 18 · Nominal 9.

import { readFileSync } from "fs";
import { spawnSync } from "child_process";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

function sh(cmd: string, args: string[]): { stdout: string; stderr: string; ok: boolean } {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", ok: r.status === 0 };
}

// ── Gap counts (from @gap tokens) ──────────────────────────────────────────
function gapCounts() {
  const text = readFileSync(`${ROOT}/docs/known-gaps.md`, "utf8");
  const re = /<!--\s*@gap\s+id=(\S+)\s+sev=(HIGH|MED|LOW|NOMINAL)\s+status=(open|resolved|deferred|nominal|non-gap|forensic)\s*-->/g;
  const tokens: { id: string; sev: string; status: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) tokens.push({ id: m[1], sev: m[2], status: m[3] });
  const openBy = (sev: string) => tokens.filter((t) => t.sev === sev && t.status === "open").length;
  const high = openBy("HIGH");
  const med = openBy("MED");
  const low = openBy("LOW");
  const nominal = tokens.filter((t) => t.sev === "NOMINAL" && t.status === "nominal").length;
  return { tokens, high, med, low, nominal };
}

// ── bun test (pre-commit subset) ────────────────────────────────────────────
function testSummary() {
  const dirs = ["compiler/tests/unit", "compiler/tests/integration", "compiler/tests/conformance"];
  const r = sh("bun", ["test", ...dirs]);
  const out = r.stdout + "\n" + r.stderr; // bun prints the summary to stderr
  const grab = (label: string) => {
    const mm = out.match(new RegExp(`^\\s*(\\d+)\\s+${label}\\b`, "m"));
    return mm ? parseInt(mm[1], 10) : null;
  };
  return { pass: grab("pass"), skip: grab("skip"), fail: grab("fail"), exitOk: r.ok };
}

// ── version ─────────────────────────────────────────────────────────────────
function version() {
  return JSON.parse(readFileSync(`${ROOT}/package.json`, "utf8")).version as string;
}

// ── last-N session anchors (wrap(s…) commits) ────────────────────────────────
function sessionAnchors(n: number) {
  const r = sh("git", ["log", "--pretty=%h %s", "-n", "400"]);
  return r.stdout
    .split("\n")
    .filter((l) => /\bwrap\(s\d+/i.test(l))
    .slice(0, n);
}

// ── inventory ─────────────────────────────────────────────────────────────────
function findCount(dir: string, pattern: string): number {
  const r = sh("find", [dir, "-name", pattern]);
  return r.stdout.split("\n").filter((l) => l.trim().length > 0).length;
}
function inventory() {
  const testFiles = findCount("compiler/tests", "*.test.*");
  const samples = findCount("samples", "*.scrml");
  const examples = findCount("examples", "*.scrml");
  const specLines = readFileSync(`${ROOT}/compiler/SPEC.md`, "utf8").split("\n").length;
  return { testFiles, samples, examples, specLines };
}

// ── maps staleness ────────────────────────────────────────────────────────────
function mapsStaleness() {
  const mapText = readFileSync(`${ROOT}/.claude/maps/primary.map.md`, "utf8");
  const line3 = mapText.split("\n")[2] ?? "";
  const wm = line3.match(/commit:\s*([0-9a-f]+)/i);
  const watermark = wm ? wm[1] : null;
  const head = sh("git", ["rev-parse", "--short", "HEAD"]).stdout.trim();
  if (!watermark) return { watermark: null, head, note: "maps: watermark not parseable" };
  if (watermark === head) return { watermark, head, note: "maps: current" };
  // count commits between watermark and HEAD (how far behind the maps are)
  const rng = sh("git", ["rev-list", "--count", `${watermark}..HEAD`]);
  const behind = rng.ok ? rng.stdout.trim() : "?";
  return { watermark, head, note: `maps: ${behind} commits behind HEAD (watermark ${watermark}, HEAD ${head})` };
}

// ── render ──────────────────────────────────────────────────────────────────
function main() {
  const head = sh("git", ["rev-parse", "--short", "HEAD"]).stdout.trim();
  const g = gapCounts();
  const inv = inventory();
  const maps = mapsStaleness();
  const anchors = sessionAnchors(8);

  const L: string[] = [];
  L.push("══════════════════════════════════════════════════════════════════");
  L.push(`  scrmlTS — state at HEAD ${head}   (bun scripts/state.ts)`);
  L.push("══════════════════════════════════════════════════════════════════");
  L.push("");
  L.push(`Version: ${version()}`);
  L.push("");
  L.push("Open-gap inventory (derived from docs/known-gaps.md @gap tokens):");
  L.push(`  HIGH    open : ${g.high}`);
  L.push(`  MED     open : ${g.med}`);
  L.push(`  LOW     open : ${g.low}`);
  L.push(`  Nominal      : ${g.nominal}   (spec-ahead-of-impl)`);
  L.push(`  (${g.tokens.length} @gap tokens total; non-open excluded from the headline count)`);
  L.push("");

  L.push("Tests — pre-commit subset (unit + integration + conformance; NOT the browser suite):");
  const t = testSummary();
  if (t.pass === null && t.fail === null) {
    L.push("  (could not parse bun test summary — run `bun test` manually)");
  } else {
    L.push(`  pass : ${t.pass ?? "?"}    skip : ${t.skip ?? "?"}    fail : ${t.fail ?? "?"}`);
    if (t.fail && t.fail > 0) L.push("  ⚠ FAILURES present");
  }
  L.push("");

  L.push("Inventory (ground-truth scans):");
  L.push(`  test files (compiler/tests/*.test.*) : ${inv.testFiles}`);
  L.push(`  samples (samples/**/*.scrml)         : ${inv.samples}`);
  L.push(`  examples (examples/**/*.scrml)       : ${inv.examples}`);
  L.push(`  SPEC.md lines                        : ${inv.specLines}`);
  L.push("");

  L.push(`Maps: ${maps.note}`);
  L.push("");

  L.push(`Last ${anchors.length} session anchors (wrap(s…) commits):`);
  for (const a of anchors) L.push(`  ${a}`);
  L.push("");
  L.push("══════════════════════════════════════════════════════════════════");

  console.log(L.join("\n"));
}

main();
