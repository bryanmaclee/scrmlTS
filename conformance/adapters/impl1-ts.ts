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

// ===========================================================================
// (b) runtime-effect half — run(source, input[]) -> { dom, state } (DD W3).
// ===========================================================================
//
// impl#1 realizes the W1 adapter's `run()` over `compileScrml` + happy-dom:
//   (OQ1) execute the artifact in a DOM + serialize the normalized post-run
//         <body>  +  (OQ2) drive the selector-addressed event sequence  +
//   (OQ3) read globalThis.__scrml_conformance.snapshot().
//
// The OQ3 conformance hook is the ratified contract: "in conformance mode an
// impl publishes globalThis.__scrml_conformance with snapshot()+settled()."
// impl#1's ZERO-PRODUCTION-BYTE realization injects the shim below INSIDE the
// eval'd IIFE — the existing browser-harness reach-in idiom (the harness already
// appends `window._scrml_reactive_get = _scrml_reactive_get;` the same way). The
// shim therefore sees the runtime's module-scoped `_scrml_state` / `flush` /
// `_scrml_derived_*` by closure, WITHOUT baking ~978 B gzip into every shipped
// runtime (the SPA shared-runtime budget has only ~188 B headroom under its
// 16 KB gzip cap — a runtime-baked hook would regress v0-3-x-spa-tree-shake §1).
// The snapshot/settled signatures are byte-for-byte the ratified contract; only
// the BYTES' home differs, which is impl#1 freedom. (See the W3 report for the
// runtime-baked-vs-injected placement fork surfaced to PA.)

import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { SCRML_RUNTIME } from "../../compiler/src/runtime-template.js";
import { driveInputs, type InputStep, type ConformanceHook } from "../driver.ts";
import { normalizeDom, runAnchored, type AnchoredAssertion } from "../normalize.ts";

/**
 * The conformance introspection shim — impl#1's realization of the OQ3 contract.
 * Keyed by scrml-SOURCE cell names (author-visible: `_scrml_state` holds plain
 * reactive cells under their declared names; engine cells use the §51.0.C
 * auto-derived camelCase name, also author-visible). Absence collapses to JS
 * `null` per SPEC §42.5/§42.8 — never `undefined`.
 */
const CONFORMANCE_SHIM = `
;(function () {
  if (typeof globalThis === "undefined") return;
  function _conf_json(v) { return (v === undefined || v === null) ? null : v; }
  globalThis.__scrml_conformance = {
    snapshot: function () {
      if (typeof flush === "function") flush();
      var cells = {}, derived = {};
      for (var c in _scrml_state) cells[c] = _conf_json(_scrml_state[c]);
      for (var d in _scrml_derived_fns) derived[d] = _conf_json(_scrml_derived_get(d));
      return { cells: cells, derived: derived };
    },
    settled: function () {
      return new Promise(function (resolve) {
        Promise.resolve().then(function () {
          setTimeout(function () { if (typeof flush === "function") flush(); resolve(); }, 0);
        });
      });
    }
  };
})();
`;

export interface RunResult {
  /** Whole-tree canonical serialization of the post-run <body> (OQ1 default mode). */
  dom: string;
  /** Final scrml-semantic state, keyed by source cell names (OQ3 snapshot). */
  state: { cells: Record<string, unknown>; derived: Record<string, unknown> };
  /** The live post-run <body> node — fed to runAnchored() for anchored-mode cases. */
  body: unknown;
}

function ensureFreshDom(): void {
  // A fresh window per run isolates DOMContentLoaded listeners + state from the
  // prior run (verified: re-register drops old listeners). unregister() is async.
  if (GlobalRegistrator.isRegistered) {
    // best-effort synchronous teardown is not exposed; the async unregister is
    // awaited by the caller (run) before re-register.
  }
  GlobalRegistrator.register();
}

/**
 * Execute a scrml source in a DOM, drive the input sequence, and return the
 * normalized post-run DOM + final state snapshot. HARD INVARIANT: reads the
 * POST-run LIVE DOM, never the static .html (DD OQ1 step 1).
 */
export async function run(source: string, input: InputStep[] = []): Promise<RunResult> {
  if (GlobalRegistrator.isRegistered) await GlobalRegistrator.unregister();
  GlobalRegistrator.register();

  const dir = mkdtempSync(join(tmpdir(), "scrml-conf-run-"));
  const file = join(dir, "case.scrml");
  writeFileSync(file, source);
  try {
    const result = compileScrml({
      inputFiles: [file],
      write: false,
      outputDir: join(dir, "out"),
      log: () => {},
    }) as { outputs?: Map<string, { html?: string; clientJs?: string }> };

    const out = result.outputs ? result.outputs.get(file) : undefined;
    const html = (out && out.html) || "";
    const clientJs = (out && out.clientJs) || "";

    // Mirror the browser harness: extract <body> inner, strip <script>, mount.
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : html;
    const cleanHtml = bodyHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/g, "").trim();
    (globalThis as any).document.body.innerHTML = cleanHtml;

    // Execute runtime + client + conformance shim in ONE IIFE so the shim sees
    // the runtime internals by closure (OQ3 zero-byte realization).
    const code = "(function () {\n" + SCRML_RUNTIME + "\n" + clientJs + "\n" + CONFORMANCE_SHIM + "\n})();";
    // eslint-disable-next-line no-eval
    (0, eval)(code);

    const doc = (globalThis as any).document;
    doc.dispatchEvent(new (globalThis as any).Event("DOMContentLoaded", { bubbles: true }));

    const hook = (globalThis as any).__scrml_conformance as ConformanceHook | undefined;
    if (hook && hook.settled) await hook.settled();

    await driveInputs(doc, input, hook);

    if (hook && hook.settled) await hook.settled();

    const state = hook && hook.snapshot ? hook.snapshot() : { cells: {}, derived: {} };
    const dom = normalizeDom(doc.body);
    return { dom, state, body: doc.body };
  } finally {
    rmSync(dir, { recursive: true, force: true });
    delete (globalThis as any).__scrml_conformance;
  }
}

// Re-export the anchored-assertion runner + types so the corpus runner imports a
// single adapter surface.
export { runAnchored };
export type { InputStep, AnchoredAssertion };
