/**
 * Module Resolver — handles import/export resolution for the scrml compiler.
 *
 * Per §21: scrml files MAY export and import types, components, and functions.
 * The module system uses ES module syntax with scrml-specific constraints.
 *
 * This module provides:
 *   1. Import graph construction from FileAST import declarations
 *   2. Circular dependency detection (E-IMPORT-002)
 *   3. Topological sort for compilation order
 *   4. Export registry building from FileAST export declarations
 *   5. Import validation (E-IMPORT-004: name not found in exports)
 *
 * Error codes:
 *   E-IMPORT-001  export used outside a ${ } context (detected at AST builder level)
 *   E-IMPORT-002  Circular import detected
 *   E-IMPORT-003  import inside a function body (detected at AST builder level)
 *   E-IMPORT-004  Imported name not found in target file's exports
 *
 * Design: v1 — named exports only, no default exports, no re-exports resolution,
 * relative paths only.
 */

import { resolve, dirname, join } from "path";
import { existsSync } from "fs";

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ModuleError {
  /**
   * @param {string} code
   * @param {string} message
   * @param {{ file: string, start: number, end: number, line: number, col: number }|null} span
   * @param {'error'|'warning'} [severity]
   */
  constructor(code, message, span = null, severity = "error") {
    this.code = code;
    this.message = message;
    this.span = span;
    this.severity = severity;
  }
}

// ---------------------------------------------------------------------------
// Import graph construction
// ---------------------------------------------------------------------------

/**
 * Build an import graph from a set of FileASTs.
 *
 * Returns a Map where:
 *   key = absolute file path
 *   value = { imports: [{ names: string[], source: string, absSource: string, span }], exports: [{ name, kind, span }] }
 *
 * @param {object[]} fileASTs — array of { filePath, ast } objects from TAB stage
 * @returns {{ graph: Map<string, object>, errors: ModuleError[] }}
 */
export function buildImportGraph(fileASTs) {
  const graph = new Map();
  const errors = [];

  for (const file of fileASTs) {
    const filePath = file.filePath || file.ast?.filePath;
    if (!filePath) continue;

    const imports = [];
    const exports = [];

    // Collect imports from AST
    const astImports = file.ast?.imports || [];
    for (const imp of astImports) {
      if (!imp.source) continue;

      // Resolve relative path to absolute
      const absSource = resolveModulePath(imp.source, filePath);

      imports.push({
        names: imp.names || [],
        source: imp.source,
        absSource,
        isDefault: imp.isDefault || false,
        span: imp.span || null,
      });
    }

    // Collect exports from AST
    const astExports = file.ast?.exports || [];
    for (const exp of astExports) {
      if (exp.exportedName) {
        // Handle comma-separated re-export names
        const names = exp.exportedName.split(",").map(s => s.trim()).filter(Boolean);
        for (const name of names) {
          exports.push({
            name,
            kind: exp.exportKind || "unknown",
            reExportSource: exp.reExportSource ? resolveModulePath(exp.reExportSource, filePath) : null,
            span: exp.span || null,
          });
        }
      }
    }

    graph.set(filePath, { imports, exports });
  }

  return { graph, errors };
}

// ---------------------------------------------------------------------------
// Circular dependency detection (E-IMPORT-002)
// ---------------------------------------------------------------------------

/**
 * Detect circular imports in the import graph.
 *
 * @param {Map<string, object>} graph — import graph from buildImportGraph
 * @returns {ModuleError[]} — E-IMPORT-002 errors for each cycle detected
 */
export function detectCircularImports(graph) {
  const errors = [];
  const visited = new Set();
  const inStack = new Set();

  function dfs(filePath, path) {
    if (inStack.has(filePath)) {
      // Found a cycle
      const cycleStart = path.indexOf(filePath);
      const cycle = path.slice(cycleStart).concat(filePath);
      const cycleStr = cycle.map(p => p.split("/").pop()).join(" -> ");
      errors.push(new ModuleError(
        "E-IMPORT-002",
        `E-IMPORT-002: Circular import detected: ${cycleStr}. ` +
        `Break the cycle by extracting shared code into a third file that both can import.`,
        null,
      ));
      return;
    }
    if (visited.has(filePath)) return;

    visited.add(filePath);
    inStack.add(filePath);

    const entry = graph.get(filePath);
    if (entry) {
      for (const imp of entry.imports) {
        dfs(imp.absSource, [...path, filePath]);
      }
    }

    inStack.delete(filePath);
  }

  for (const filePath of graph.keys()) {
    dfs(filePath, []);
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Topological sort for compilation order
// ---------------------------------------------------------------------------

/**
 * Produce a topological ordering of files based on the import graph.
 * Files with no imports come first; files that depend on others come after
 * their dependencies.
 *
 * @param {Map<string, object>} graph
 * @returns {string[]} — file paths in compilation order
 */
export function topologicalSort(graph) {
  const sorted = [];
  const visited = new Set();
  const temp = new Set();

  function visit(filePath) {
    if (visited.has(filePath)) return;
    if (temp.has(filePath)) return; // cycle — already reported by detectCircularImports
    temp.add(filePath);

    const entry = graph.get(filePath);
    if (entry) {
      for (const imp of entry.imports) {
        if (graph.has(imp.absSource)) {
          visit(imp.absSource);
        }
      }
    }

    temp.delete(filePath);
    visited.add(filePath);
    sorted.push(filePath);
  }

  for (const filePath of graph.keys()) {
    visit(filePath);
  }

  return sorted;
}

// ---------------------------------------------------------------------------
// Export registry
// ---------------------------------------------------------------------------

/**
 * Build an export registry: Map<filePath, Map<name, {kind, isComponent}>>
 *
 * @param {Map<string, object>} graph
 * @returns {Map<string, Map<string, {kind: string, isComponent: boolean}>>}
 */
export function buildExportRegistry(graph) {
  const registry = new Map();

  for (const [filePath, entry] of graph) {
    const names = new Map();
    for (const exp of entry.exports) {
      const kind = exp.kind ?? "const";
      const name = exp.name;
      // Components are const exports with PascalCase names (uppercase first letter)
      const isComponent = kind === "const" && name.length > 0 &&
        name[0] >= "A" && name[0] <= "Z";
      names.set(name, { kind, isComponent });
    }
    registry.set(filePath, names);
  }

  return registry;
}

// ---------------------------------------------------------------------------
// Import validation (E-IMPORT-004)
// ---------------------------------------------------------------------------

/**
 * Validate that all imported names exist in the target file's exports.
 *
 * @param {Map<string, object>} graph
 * @param {Map<string, Set<string>>} exportRegistry
 * @returns {ModuleError[]}
 */
export function validateImports(graph, exportRegistry) {
  const errors = [];

  for (const [filePath, entry] of graph) {
    for (const imp of entry.imports) {
      // Skip .js imports — they follow standard ES module semantics
      if (imp.source.endsWith(".js")) continue;

      const targetExports = exportRegistry.get(imp.absSource);
      if (!targetExports) {
        // Target file is not in the compilation set — could be an external file
        // We only validate imports between files in the compilation set
        continue;
      }

      for (const name of imp.names) {
        if (!targetExports.has(name)) {
          errors.push(new ModuleError(
            "E-IMPORT-004",
            `E-IMPORT-004: \`${name}\` is not exported by \`${imp.source}\`. ` +
            `Check the file for available exports, or add \`export ${name}\` to \`${imp.source}\`.`,
            imp.span,
          ));
        }
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Module resolution
// ---------------------------------------------------------------------------

/**
 * Run the full module resolution pipeline:
 * 1. Build import graph
 * 2. Detect circular imports
 * 3. Validate imports against exports
 * 4. Return compilation order
 *
 * @param {object[]} fileASTs — array of TAB output objects
 * @returns {{ compilationOrder: string[], exportRegistry: Map<string, Set<string>>, errors: ModuleError[] }}
 */
export function resolveModules(fileASTs) {
  const allErrors = [];

  // Step 1: Build the import graph
  const { graph, errors: graphErrors } = buildImportGraph(fileASTs);
  allErrors.push(...graphErrors);

  // Step 2: Detect circular imports
  const circularErrors = detectCircularImports(graph);
  allErrors.push(...circularErrors);

  // Step 3: Build export registry
  const exportRegistry = buildExportRegistry(graph);

  // Step 4: Validate imports
  const importErrors = validateImports(graph, exportRegistry);
  allErrors.push(...importErrors);

  // Step 5: Topological sort
  const compilationOrder = topologicalSort(graph);

  return {
    compilationOrder,
    exportRegistry,
    importGraph: graph,
    errors: allErrors,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * The root directory for stdlib modules.
 * `scrml:crypto` resolves to `<STDLIB_ROOT>/crypto/index.scrml` or `<STDLIB_ROOT>/crypto.scrml`.
 */
const STDLIB_ROOT = resolve(dirname(new URL(import.meta.url).pathname), "../../stdlib");

/**
 * Resolve a module path relative to the importing file.
 *
 * Supports three forms:
 *   - Relative: `./types.scrml`, `../shared.scrml` → resolved from importer directory
 *   - Stdlib:   `scrml:crypto`, `scrml:auth` → resolved from stdlib/ directory
 *   - Other:    returned as-is (future extensibility)
 *
 * @param {string} source — the path from the import statement
 * @param {string} importerPath — absolute path of the importing file
 * @returns {string} — absolute path of the target module
 */
function resolveModulePath(source, importerPath) {
  if (source.startsWith("./") || source.startsWith("../")) {
    return resolve(dirname(importerPath), source);
  }
  if (source.startsWith("scrml:")) {
    const moduleName = source.slice("scrml:".length);
    // Try <stdlib>/<name>/index.scrml first, then <stdlib>/<name>.scrml
    const dirPath = join(STDLIB_ROOT, moduleName, "index.scrml");
    const filePath = join(STDLIB_ROOT, `${moduleName}.scrml`);
    // Prefer directory form (allows multi-file modules)
    if (existsSync(dirPath)) return dirPath;
    return filePath;
  }
  if (source.startsWith("vendor:")) {
    // §40.4: vendor: resolves to <project>/vendor/<path>/index.scrml or .scrml
    const vendorName = source.slice("vendor:".length);
    const projectRoot = resolve(dirname(importerPath), "..");
    const vendorDirPath = join(projectRoot, "vendor", vendorName, "index.scrml");
    const vendorFilePath = join(projectRoot, "vendor", `${vendorName}.scrml`);
    if (existsSync(vendorDirPath)) return vendorDirPath;
    return vendorFilePath;
  }
  // Non-relative, non-stdlib, non-vendor paths: return as-is
  return source;
}

/**
 * Check if a source path is a stdlib import.
 * @param {string} source
 * @returns {boolean}
 */
export function isStdlibImport(source) {
  return source.startsWith("scrml:");
}
