/**
 * @module api
 * scrml compiler — programmatic API (self-hosted JS port).
 *
 * Exports the full BS→TAB→CE→BPP→PA→RI→TS→MC→DG→CG pipeline as a reusable
 * function so that CLI commands, test suites, watch loops, and language
 * servers can all drive compilation without spawning a subprocess.
 *
 * Self-hosted port of compiler/src/api.js.
 * Translation rules applied:
 *   - === → == and !== → != (scrml equality semantics)
 *   - Type annotations removed
 *   - Imports updated to self-hosted .js modules where available
 *   - Regex brace literals use String.fromCharCode(123/125)
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "fs";
import { resolve, extname, dirname, basename, join } from "path";

// Import all pipeline stages from build-self-host.js output (compiler/dist/self-host/)
import { splitBlocks } from "../dist/self-host/bs.js";
import { buildAST } from "../dist/self-host/ast.js";
import { runCE } from "../src/component-expander.ts";  // CE not yet self-hosted

import { runPA } from "../dist/self-host/pa.js";
import { runRI } from "../dist/self-host/ri.js";
import { runTS } from "../dist/self-host/ts.js";
import { runMetaChecker } from "../dist/self-host/meta-checker.js";
import { runDG } from "../dist/self-host/dg.js";
import { runCG } from "../dist/self-host/cg.js";
import { runMetaEval } from "../src/meta-eval.ts";  // ME not yet self-hosted
import { resolveModules } from "../dist/self-host/module-resolver.js";

// ---------------------------------------------------------------------------
// Directory scanner
// ---------------------------------------------------------------------------

/**
 * Recursively scan a directory for .scrml files.
 * Used when the compiler is given a directory instead of individual files.
 * Directory structure maps to URL paths per the file-based routing convention.
 *
 * @param {string} dirPath — directory to scan
 * @returns {string[]} — array of absolute .scrml file paths, sorted
 */
export function scanDirectory(dirPath) {
  const results = [];
  const absDir = resolve(dirPath);

  function walk(dir) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith(".scrml")) {
        results.push(fullPath);
      }
    }
  }

  walk(absDir);
  return results.sort();
}

// ---------------------------------------------------------------------------
// Legacy CSS conversion
// ---------------------------------------------------------------------------

/**
 * Pre-process source to convert `<style>...</style>` blocks to `#{...}`.
 * Used when convertLegacyCss option is set.
 *
 * @param {string} source
 * @returns {string}
 */
function convertLegacyCssSource(source) {
  // Brace literals escaped for future scrml compilation of this file:
  // String.fromCharCode(123) == '{', String.fromCharCode(125) == '}'
  const ob = String.fromCharCode(123);
  const cb = String.fromCharCode(125);
  return source.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, content) => {
    return "#" + ob + content + cb;
  });
}

// ---------------------------------------------------------------------------
// compileScrml
// ---------------------------------------------------------------------------

/**
 * Run the full scrml compiler pipeline on a set of input files.
 *
 * @param {object} options
 * @param {string[]} options.inputFiles        — resolved .scrml file paths to compile
 * @param {string}  [options.outputDir]        — directory to write output files; defaults to dist/ next to first input
 * @param {boolean} [options.verbose]          — emit per-stage timing and counts to options.log
 * @param {boolean} [options.convertLegacyCss] — pre-process <style> blocks to #{…}
 * @param {boolean} [options.embedRuntime]     — embed runtime inline instead of writing separate file (browser mode only)
 * @param {boolean} [options.write]            — write output files to disk (default true)
 * @param {boolean} [options.sourceMap]        — generate Source Map v3 .map files alongside JS output (default false)
 * @param {function} [options.log]             — logging function; defaults to console.log
 * @param {string}  [options.mode]             — output mode: 'browser' or 'library' (default 'browser')
 *   'browser': emits HTML + client IIFE JS + server JS (standard browser app)
 *   'library': emits ES module exports JS + server JS (importable module, no HTML, no runtime)
 * @param {object|null} [options.selfHostModules] — optional self-hosted module overrides.
 *   When provided, uses compiled scrml modules instead of the JS originals for:
 *   - selfHostModules.resolveModules — replaces module-resolver.js:resolveModules
 *   - selfHostModules.runMetaChecker — replaces meta-checker.js:runMetaChecker
 *   All other pipeline stages always use the JS originals.
 *   Caller is responsible for pre-loading modules (async import before calling compileScrml).
 *
 * @returns {object} — { errors, warnings, fileCount, outputDir, durationMs, outputs }
 */
export function compileScrml(options = {}) {
  const {
    inputFiles = [],
    verbose = false,
    convertLegacyCss = false,
    embedRuntime = false,
    write = true,
    sourceMap = false,
    mode = 'browser',
    log = console.log,
    selfHostModules = null,
  } = options;

  let { outputDir } = options;

  if (!outputDir && inputFiles.length > 0) {
    outputDir = join(dirname(inputFiles[0]), "dist");
  }

  const allErrors = [];

  function stage(name, fn) {
    const start = performance.now();
    const result = fn();
    const ms = (performance.now() - start).toFixed(1);
    if (verbose) log(`  [${name}] ${ms}ms`);
    return result;
  }

  function collectErrors(stageName, errors) {
    if (errors && errors.length > 0) {
      for (const e of errors) {
        allErrors.push({ stage: stageName, code: e.code, message: e.message, severity: e.severity, ...e });
        if (verbose) log(`  [${stageName}] ${e.code}: ${e.message}`);
      }
    }
  }

  const pipelineStart = performance.now();

  // Stage 2: Block Splitter (per-file)
  const bsResults = [];
  const sourceByFile = new Map();
  for (const inputFile of inputFiles) {
    const filePath = resolve(inputFile);
    let source = readFileSync(filePath, "utf8");
    if (convertLegacyCss) {
      source = convertLegacyCssSource(source);
    }
    sourceByFile.set(filePath, source);
    try {
      const result = stage("BS", () => splitBlocks(filePath, source));
      bsResults.push(result);
      collectErrors("BS", result.errors);
      if (verbose) log(`  [BS] ${filePath}: ${result.blocks.length} blocks`);
    } catch (e) {
      allErrors.push({ stage: "BS", code: e.code || "E-BS-000", message: e.message });
    }
  }

  if (bsResults.length == 0) {
    const errors = allErrors;
    const warnings = [];
    return { errors, warnings, fileCount: 0, outputDir: outputDir || "", durationMs: 0, outputs: new Map() };
  }

  // Stage 3: TAB (per-file)
  const tabResults = [];
  for (const bsResult of bsResults) {
    const result = stage("TAB", () => buildAST(bsResult));
    collectErrors("TAB", result.errors);
    // Attach source text for library-mode codegen (export-decl span extraction)
    if (result.filePath && sourceByFile.has(result.filePath)) {
      result._sourceText = sourceByFile.get(result.filePath);
    }
    tabResults.push(result);
    if (verbose) log(`  [TAB] ${result.filePath}: ${result.ast?.nodes?.length ?? 0} nodes`);
  }

  // Stage 3.1: Module Resolution
  // When selfHostModules.resolveModules is provided, use it instead of the JS original.
  const _resolveModules = selfHostModules?.resolveModules ?? resolveModules;
  const moduleResult = stage("MOD", () => _resolveModules(tabResults));
  collectErrors("MOD", moduleResult.errors);
  if (verbose) {
    const importCount = [...moduleResult.importGraph.values()].reduce((n, e) => n + e.imports.length, 0);
    const exportCount = [...moduleResult.exportRegistry.values()].reduce((n, e) => n + e.size, 0);
    log(`  [MOD] ${importCount} import(s), ${exportCount} export(s), order: ${moduleResult.compilationOrder.map(p => basename(p)).join(" -> ")}`);
  }

  // Stage 3.2: CE — Component Expander (per-file)
  // Runs after TAB and Module Resolution, before BPP.
  // Builds a same-file component registry and replaces all isComponent: true
  // markup nodes with their expanded markup subtrees.
  // Phase 2: also resolves imported components via exportRegistry + fileASTMap.
  //
  // Build fileASTMap from tabResults BEFORE the CE loop — CE consumes ast.components
  // so the cross-file lookup must use the pre-CE AST.
  const fileASTMap = new Map();
  for (const tabResult of tabResults) {
    if (tabResult.filePath) {
      fileASTMap.set(tabResult.filePath, tabResult);
    }
  }

  const ceResults = [];
  for (const tabResult of tabResults) {
    const result = stage("CE", () => runCE({
      files: [tabResult],
      exportRegistry: moduleResult.exportRegistry,
      fileASTMap,
    }));
    collectErrors("CE", result.errors);
    // Re-attach source text for library-mode codegen (CE creates new file objects)
    for (const ceFile of result.files) {
      if (ceFile.filePath && sourceByFile.has(ceFile.filePath)) {
        ceFile._sourceText = sourceByFile.get(ceFile.filePath);
      }
    }
    ceResults.push(...result.files);
  }

  // Stage 4: PA (all files)
  const paResult = stage("PA", () => runPA({ files: ceResults }));
  collectErrors("PA", paResult.errors);
  if (verbose) {
    const viewCount = paResult.protectAnalysis?.views?.size ?? 0;
    log(`  [PA] ${viewCount} db block(s) analyzed`);
  }

  // Stage 5: RI (all files)
  const riResult = stage("RI", () => runRI({ files: ceResults, protectAnalysis: paResult.protectAnalysis }));
  collectErrors("RI", riResult.errors);
  if (verbose) {
    const routeCount = riResult.routeMap?.functions?.size ?? 0;
    const authCount = riResult.routeMap?.authMiddleware?.size ?? 0;
    log(`  [RI] ${routeCount} function(s) routed, ${authCount} auth guard(s)`);
  }

  // Stage 6: TS (all files)
  const tsResult = stage("TS", () => runTS({
    files: ceResults,
    protectAnalysis: paResult.protectAnalysis,
    routeMap: riResult.routeMap,
  }));
  collectErrors("TS", tsResult.errors);

  // Stage 6.5: META — Meta Check + Eval (merged MC+ME, runs before DG)
  // MC validates phase separation (E-META-001) and reflect() calls (E-META-003).
  // ME evaluates compile-time ^{} blocks with emit() and splices results into AST.
  // Combined so DG sees the post-meta-expansion AST.
  // When selfHostModules.runMetaChecker is provided, use it instead of the JS original.
  const metaFiles = tsResult.files || ceResults;
  const _runMetaChecker = selfHostModules?.runMetaChecker ?? runMetaChecker;
  const mcResult = stage("MC", () => _runMetaChecker({ files: metaFiles }));
  collectErrors("MC", mcResult.errors);
  const metaEvalResult = stage("ME", () => runMetaEval({ files: metaFiles }));
  collectErrors("ME", metaEvalResult.errors);

  // Stage 7: DG (all files — sees post-meta-expansion AST)
  const dgResult = stage("DG", () => runDG({
    files: metaFiles,
    routeMap: riResult.routeMap,
  }));
  collectErrors("DG", dgResult.errors);

  // Stage 8: CG (all files)
  const cgResult = stage("CG", () => runCG({
    files: metaFiles,
    routeMap: riResult.routeMap,
    depGraph: dgResult.depGraph,
    protectAnalysis: paResult.protectAnalysis,
    embedRuntime,
    sourceMap,
    mode,
  }));
  collectErrors("CG", cgResult.errors);

  const durationMs = parseFloat((performance.now() - pipelineStart).toFixed(1));

  // ---------------------------------------------------------------------------
  // Write output files
  // ---------------------------------------------------------------------------

  let fileCount = 0;

  if (write && outputDir) {
    mkdirSync(outputDir, { recursive: true });

    // In browser mode, write the shared runtime file (not needed in library mode)
    if (mode != 'library' && cgResult.runtimeJs && cgResult.runtimeFilename) {
      writeFileSync(join(outputDir, cgResult.runtimeFilename), cgResult.runtimeJs);
      if (verbose) log(`  [CG] Wrote shared runtime: ${cgResult.runtimeFilename}`);
    }

    if (cgResult.outputs) {
      for (const [filePath, output] of cgResult.outputs) {
        const base = basename(filePath, ".scrml");
        if (output.serverJs) {
          writeFileSync(join(outputDir, `${base}.server.js`), output.serverJs);
          fileCount++;
        }
        if (mode == 'library') {
          // Library mode: write libraryJs as <base>.js (importable ES module)
          if (output.libraryJs) {
            writeFileSync(join(outputDir, `${base}.js`), output.libraryJs);
            fileCount++;
          }
        } else {
          // Browser mode: write clientJs as <base>.client.js + html
          if (output.clientJs) {
            writeFileSync(join(outputDir, `${base}.client.js`), output.clientJs);
            fileCount++;
          }
          if (output.html) {
            writeFileSync(join(outputDir, `${base}.html`), output.html);
            fileCount++;
          }
        }
        if (output.css) {
          writeFileSync(join(outputDir, `${base}.css`), output.css);
          fileCount++;
        }
        // Source map files (only written when sourceMap:true was passed to compileScrml)
        if (output.clientJsMap) {
          writeFileSync(join(outputDir, `${base}.client.js.map`), output.clientJsMap);
          if (verbose) log(`  [CG] Wrote source map: ${base}.client.js.map`);
        }
        if (output.serverJsMap) {
          writeFileSync(join(outputDir, `${base}.server.js.map`), output.serverJsMap);
          if (verbose) log(`  [CG] Wrote source map: ${base}.server.js.map`);
        }
      }
    }
  } else if (!write && cgResult.outputs) {
    // Still count outputs even when not writing
    for (const [, output] of cgResult.outputs) {
      if (output.serverJs) fileCount++;
      if (output.clientJs) fileCount++;
      if (output.libraryJs) fileCount++;
      if (output.html) fileCount++;
      if (output.css) fileCount++;
    }
  }

  const errors = allErrors.filter(e => !e.code?.startsWith("W-") && e.severity != "warning");
  const warnings = allErrors.filter(e => e.code?.startsWith("W-") || e.severity == "warning");

  return {
    errors,
    warnings,
    fileCount,
    outputDir: outputDir || "",
    durationMs,
    outputs: cgResult.outputs || new Map(),
  };
}
