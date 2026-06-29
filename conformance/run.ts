/**
 * Conformance runner (codes half).
 *
 * Loads every case under conformance/cases/, runs the impl#1 adapter
 * `compile()` on each `case.scrml`, and checks the emitted diagnostic
 * code-set against `expected.json`:
 *
 *   - PRESENCE:  emitted ⊇ expect.codes      (every required code fired)
 *   - ABSENCE:   emitted ∩ expect.notCodes = ∅ (no forbidden code fired)
 *
 * It is a SUPERSET check, not exact-equality: real compiles emit incidental
 * codes (W-PROGRAM-*, W-WHITESPACE-001, W-SQL-ROW-UNTYPED, …) that the source
 * conf tests ignore (they assert with `.some(e => e.code === X)`). The
 * conformance contract is "this source fires exactly these REQUIRED codes and
 * none of these FORBIDDEN codes" (SCOPE OQ3 — presence, not line/col).
 *
 * Run directly:  `bun conformance/run.ts`   (exits non-zero on any failure)
 * Or via bun:test: conformance/conformance-corpus.test.js
 *
 * The (b) runtime-effect half (`expect.input/dom/state`) is reserved in the
 * schema but NOT handled here — that is the parallel-DD W3 build.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";
import { compile } from "./adapters/impl1-ts.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CASES_DIR = join(HERE, "cases");

export interface ExpectedCase {
  id: string;
  description: string;
  "language-version": string;
  "source-test"?: string;
  "runtime-half-pending"?: boolean;
  "runtime-half-ref"?: string;
  expect: {
    codes: string[];
    notCodes: string[];
    // RESERVED for the (b) runtime-effect half (W3) — not populated yet:
    // input?: unknown[]; dom?: unknown; state?: Record<string, unknown>;
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

/** Run one case through impl#1 and diff the code-set against the contract. */
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
  };
}

export function runAll(casesDir: string = CASES_DIR): {
  results: CaseResult[];
  passed: number;
  failed: number;
} {
  const results = loadCases(casesDir).map(runCase);
  const passed = results.filter((r) => r.pass).length;
  return { results, passed, failed: results.length - passed };
}

function main(): void {
  const { results, passed, failed } = runAll();
  for (const r of results) {
    const tag = r.pass ? "PASS" : "FAIL";
    const rt = r.runtimeHalfPending ? "  [runtime-half-pending]" : "";
    console.log(`${tag}  ${r.relDir}${rt}`);
    if (!r.pass) {
      if (r.missing.length > 0) {
        console.log(`        missing required codes: ${JSON.stringify(r.missing)}`);
      }
      if (r.forbidden.length > 0) {
        console.log(`        forbidden codes present: ${JSON.stringify(r.forbidden)}`);
      }
      console.log(`        emitted: ${JSON.stringify(r.emitted)}`);
    }
  }
  console.log(
    `\nconformance (impl#1, codes half): ${passed}/${results.length} cases pass` +
      (failed > 0 ? `, ${failed} FAILED` : ""),
  );
  process.exit(failed === 0 ? 0 : 1);
}

// `import.meta.main` is a Bun extension (true when run as the entrypoint).
// Accessed portably so this file also typechecks without bun-types present.
if ((import.meta as unknown as { main?: boolean }).main) main();
