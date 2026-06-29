/**
 * Conformance runner — codes (a) half + runtime-effect (b) half.
 *
 * Each case dir holds `case.scrml` + `expected.json`. The runner checks:
 *
 *   (a) CODES   — emitted ⊇ expect.codes  AND  emitted ∩ expect.notCodes = ∅
 *       (SUPERSET, not exact: real compiles emit incidental codes the source
 *       conf tests ignore; presence, not line/col — SCOPE OQ3).
 *
 *   (b) RUNTIME — when expect carries any of { input, dom, domAnchored, state }:
 *       compile + execute the artifact in a DOM (adapter `run()`), drive the
 *       input sequence, then assert:
 *         - state       : merged {cells, derived} snapshot ⊇ expect.state
 *         - dom         : whole-tree normalized <body> === expect.dom
 *         - domAnchored : per-selector assertions hold on the live <body>
 *       HARD INVARIANT: the (b) half reads the POST-run LIVE DOM, never the
 *       static .html (DD OQ1 step 1).
 *
 * Run directly:  `bun conformance/run.ts`   (exits non-zero on any failure)
 * Or via bun:test: conformance/conformance-corpus.test.js
 */
import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";
import { compile } from "./adapters/impl1-ts.ts";
import { run, runAnchored, type InputStep, type AnchoredAssertion } from "./adapters/impl1-ts.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CASES_DIR = join(HERE, "cases");

export interface ExpectedCase {
  id: string;
  description: string;
  "language-version": string;
  "source-test"?: string;
  "runtime-half-pending"?: boolean;
  "runtime-half-ref"?: string;
  /** OQ4 — MANDATORY spec anchor for (b) runtime cases (the soundness gate). */
  spec?: string;
  rationale?: string;
  expect: {
    codes: string[];
    notCodes: string[];
    // (b) runtime-effect half:
    input?: InputStep[];
    /** Whole-tree canonical normalized <body> (OQ1 default mode). */
    dom?: string;
    /** Anchored per-selector assertions (OQ1 brittleness escape / authoring surface). */
    domAnchored?: AnchoredAssertion[];
    /** Final state-cell values — compared against merged {cells, derived}. */
    state?: Record<string, unknown>;
  };
}

export interface LoadedCase {
  dir: string;
  relDir: string;
  source: string;
  expected: ExpectedCase;
}

export interface CaseResult {
  id: string;
  relDir: string;
  pass: boolean;
  emitted: string[];
  missing: string[]; // required codes that did NOT fire
  forbidden: string[]; // notCodes that DID fire
  runtimeHalfPending: boolean;
  /** Runtime (b) half failures (empty when the case has no runtime half or it passed). */
  runtimeFailures: string[];
  hasRuntimeHalf: boolean;
}

/** Recursively collect every leaf case dir (one holding case.scrml + expected.json). */
export function loadCases(casesDir: string = CASES_DIR): LoadedCase[] {
  const out: LoadedCase[] = [];
  const stack: string[] = [casesDir];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    const scrml = join(dir, "case.scrml");
    const exp = join(dir, "expected.json");
    if (existsSync(scrml) && existsSync(exp)) {
      const expected = JSON.parse(readFileSync(exp, "utf8")) as ExpectedCase;
      const ex = expected.expect ?? { codes: [], notCodes: [] };
      ex.codes = ex.codes ?? [];
      ex.notCodes = ex.notCodes ?? [];
      expected.expect = ex;
      out.push({
        dir,
        relDir: relative(casesDir, dir),
        source: readFileSync(scrml, "utf8"),
        expected,
      });
      continue; // a case dir is a leaf — do not descend further
    }
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) stack.push(p);
    }
  }
  return out.sort((a, b) => a.relDir.localeCompare(b.relDir));
}

/** True when the case declares any (b) runtime-effect expectation. */
export function hasRuntimeHalf(c: LoadedCase): boolean {
  const e = c.expected.expect;
  return (
    e.input !== undefined ||
    e.dom !== undefined ||
    e.domAnchored !== undefined ||
    e.state !== undefined
  );
}

/** Stable structural equality (order-insensitive for plain objects). */
function stableKey(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableKey).join(",") + "]";
  const o = v as Record<string, unknown>;
  return "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ":" + stableKey(o[k])).join(",") + "}";
}
function deepEqual(a: unknown, b: unknown): boolean {
  return stableKey(a) === stableKey(b);
}

/** Run one case's CODES (a) half through impl#1 and diff against the contract. */
export function runCase(c: LoadedCase): CaseResult {
  const { codes: emitted } = compile(c.source);
  const emittedSet = new Set(emitted);
  const missing = c.expected.expect.codes.filter((code) => !emittedSet.has(code));
  const forbidden = c.expected.expect.notCodes.filter((code) => emittedSet.has(code));
  return {
    id: c.expected.id,
    relDir: c.relDir,
    pass: missing.length === 0 && forbidden.length === 0,
    emitted,
    missing,
    forbidden,
    runtimeHalfPending: c.expected["runtime-half-pending"] === true,
    runtimeFailures: [],
    hasRuntimeHalf: hasRuntimeHalf(c),
  };
}

/**
 * Run one case's RUNTIME (b) half — compile + execute + drive + assert
 * state/dom/domAnchored. Returns the failure list (empty = pass). A case with
 * no runtime half returns an empty list.
 */
export async function runCaseRuntime(c: LoadedCase): Promise<string[]> {
  if (!hasRuntimeHalf(c)) return [];
  const e = c.expected.expect;
  const failures: string[] = [];

  const r = await run(c.source, e.input ?? []);

  // state — merged {cells, derived}, expected is a subset.
  if (e.state) {
    const merged: Record<string, unknown> = { ...r.state.cells, ...r.state.derived };
    for (const k of Object.keys(e.state)) {
      if (!(k in merged)) {
        failures.push("state: cell '" + k + "' absent from snapshot");
      } else if (!deepEqual(merged[k], e.state[k])) {
        failures.push(
          "state: cell '" + k + "' expected " + JSON.stringify(e.state[k]) +
            ", got " + JSON.stringify(merged[k]),
        );
      }
    }
  }

  // dom — whole-tree canonical compare (OQ1 default mode).
  if (e.dom !== undefined && r.dom !== e.dom) {
    failures.push("dom (whole-tree) mismatch:\n    expected: " + JSON.stringify(e.dom) + "\n    got:      " + JSON.stringify(r.dom));
  }

  // domAnchored — per-selector assertions on the live <body> (OQ1 anchored mode).
  if (e.domAnchored) {
    const anchored = runAnchored(r.body, e.domAnchored);
    for (const f of anchored.failures) failures.push("domAnchored: " + f);
  }

  return failures;
}

export async function runAll(casesDir: string = CASES_DIR): Promise<{
  results: CaseResult[];
  passed: number;
  failed: number;
}> {
  const cases = loadCases(casesDir);
  const results: CaseResult[] = [];
  for (const c of cases) {
    const r = runCase(c);
    if (r.hasRuntimeHalf) {
      r.runtimeFailures = await runCaseRuntime(c);
      if (r.runtimeFailures.length > 0) r.pass = false;
    }
    results.push(r);
  }
  const passed = results.filter((r) => r.pass).length;
  return { results, passed, failed: results.length - passed };
}

async function main(): Promise<void> {
  const { results, passed, failed } = await runAll();
  for (const r of results) {
    const tag = r.pass ? "PASS" : "FAIL";
    const rt = r.runtimeHalfPending ? "  [runtime-half-pending]" : r.hasRuntimeHalf ? "  [runtime]" : "";
    console.log(`${tag}  ${r.relDir}${rt}`);
    if (!r.pass) {
      if (r.missing.length > 0) {
        console.log(`        missing required codes: ${JSON.stringify(r.missing)}`);
      }
      if (r.forbidden.length > 0) {
        console.log(`        forbidden codes present: ${JSON.stringify(r.forbidden)}`);
      }
      if (r.missing.length > 0 || r.forbidden.length > 0) {
        console.log(`        emitted: ${JSON.stringify(r.emitted)}`);
      }
      for (const f of r.runtimeFailures) {
        console.log(`        runtime: ${f}`);
      }
    }
  }
  console.log(
    `\nconformance (impl#1): ${passed}/${results.length} cases pass` +
      (failed > 0 ? `, ${failed} FAILED` : ""),
  );
  process.exit(failed === 0 ? 0 : 1);
}

// `import.meta.main` is a Bun extension (true when run as the entrypoint).
if ((import.meta as unknown as { main?: boolean }).main) main();
