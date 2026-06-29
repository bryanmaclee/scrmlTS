/**
 * Conformance adapter — impl#1 (the TypeScript/Bun reference compiler).
 *
 * This is the (a) "which diagnostic codes fire" HALF of the SCOPE's adapter
 * interface (docs/changes/conformance-suite-d3-2026-06-29/SCOPE.md §2):
 *
 *     compile(source) -> { codes: string[] }
 *
 * The (b) runtime-effect half — `run(artifact, input[]) -> { dom, state }` —
 * is being designed in a parallel deliberation (W3) and is NOT built here.
 *
 * `compile()` writes the source to a throwaway temp file, runs the reference
 * compiler (`compileScrml`, src/api.js), and returns the SORTED UNIQUE set of
 * `.code` values across BOTH diagnostic streams:
 *
 *   - result.errors   — fatal diagnostics (E-* / severity:"error" / no-prefix)
 *   - result.warnings — non-fatal diagnostics (W-* / I-* / severity:warning|info)
 *
 * Unioning both streams is load-bearing: per the api.js partition rule, a
 * W-/I- code (e.g. W-CG-001) lands in result.warnings, NEVER result.errors.
 * The conformance contract is "this source fires exactly this code-set"
 * (presence, not line/col — SCOPE OQ3), so the stream a code arrives on is an
 * impl detail the adapter normalizes away.
 */
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
// api.js is the reference compiler's public entry (plain ESM .js).
import { compileScrml } from "../../compiler/src/api.js";

export interface CompileResult {
  /** Sorted, de-duplicated diagnostic codes across errors + warnings. */
  codes: string[];
}

interface Diagnostic {
  code?: string;
  severity?: string;
  message?: string;
}

/**
 * Compile a single scrml source string and return its diagnostic code-set.
 * Side-effect free from the caller's perspective: the temp dir is removed
 * before return (success OR throw).
 */
export function compile(source: string): CompileResult {
  const dir = mkdtempSync(join(tmpdir(), "scrml-conf-impl1-"));
  const file = join(dir, "case.scrml");
  writeFileSync(file, source);
  try {
    const result = compileScrml({
      inputFiles: [file],
      write: false,
      outputDir: join(dir, "out"),
      log: () => {},
    }) as { errors?: Diagnostic[]; warnings?: Diagnostic[] };

    const diags: Diagnostic[] = [
      ...(result.errors ?? []),
      ...(result.warnings ?? []),
    ];
    const codes = [
      ...new Set(
        diags
          .map((d) => d?.code)
          .filter((c): c is string => typeof c === "string" && c.length > 0),
      ),
    ].sort();
    return { codes };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
