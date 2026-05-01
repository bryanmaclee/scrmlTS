/**
 * Name Resolver — Stage 3.05 of the scrml compiler pipeline (NR).
 *
 * Implements the unified state-type registry name resolution per SPEC §15.15
 * and PIPELINE.md Stage 3.05. Walks every tag-bearing AST node (`MarkupNode`,
 * `StateNode`, `StateConstructorDefNode`, `MachineDeclNode`) and stamps two
 * advisory fields on each:
 *
 *   resolvedKind:     'html-builtin' | 'scrml-lifecycle' | 'user-state-type'
 *                   | 'user-component' | 'unknown'
 *   resolvedCategory: 'html' | 'channel' | 'engine' | 'timer' | 'poll' | 'db'
 *                   | 'schema' | 'request' | 'errorBoundary' | 'machine'
 *                   | 'user-component' | 'user-state-type' | 'unknown'
 *
 * Phase P1 — SHADOW MODE.  NR runs and emits diagnostics, but downstream
 * stages (CE, MOD, TS, codegen) continue to route on the legacy `isComponent`
 * discriminator. The new fields are advisory in P1; the routing flip moves
 * to P2/P3 once shadow-mode results have been validated.
 *
 * Diagnostics emitted by NR:
 *   W-CASE-001       Lowercase user-declared state-type/component shadowing
 *                    a built-in HTML element (SPEC §15.15.4).
 *   W-WHITESPACE-001 Opener uses whitespace between `<` and the identifier;
 *                    canonical form is no-space (SPEC §15.15.5).
 *
 * Lookup order (SPEC §15.15.2):
 *   1. Same-file user declaration (case-sensitive).
 *   2. Imported name from MOD `exportRegistry` (case-sensitive).
 *   3. Built-in scrml lifecycle keyword (case-sensitive).
 *   4. Built-in HTML element (case-insensitive).
 *   5. Otherwise unknown — downstream stages handle hard errors.
 *
 * Performance budget:  <= 5 ms per file (pure AST traversal).
 */

import { isHtmlElement } from "./html-elements.js";
import type { ASTNode, FileAST, Span } from "./types/ast.ts";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ResolvedKind =
  | "html-builtin"
  | "scrml-lifecycle"
  | "user-state-type"
  | "user-component"
  | "unknown";

export type ResolvedCategory =
  | "html"
  | "channel"
  | "engine"
  | "timer"
  | "poll"
  | "db"
  | "schema"
  | "request"
  | "errorBoundary"
  | "machine"
  | "user-component"
  | "user-state-type"
  | "unknown";

export interface NRError {
  code: "W-CASE-001" | "W-WHITESPACE-001";
  message: string;
  span: Span;
  severity: "warning";
}

export interface NRResult {
  filePath: string;
  errors: NRError[];
  /** Per-tag-name registry actually constructed for this file (debugging aid). */
  registrySize: number;
  /** Counts of each resolvedKind hit (debugging aid). */
  kindCounts: Record<ResolvedKind, number>;
}

// ---------------------------------------------------------------------------
// Built-in lifecycle table (compile-time constant)
// ---------------------------------------------------------------------------
//
// These are the scrml lifecycle state-types that pre-date any user code and
// therefore cannot collide with user names (in either direction).
const LIFECYCLE_CATEGORY: Record<string, ResolvedCategory> = {
  channel: "channel",
  engine: "engine",
  machine: "machine",       // alias for engine; W-DEPRECATED-001 emitted by TAB
  timer: "timer",
  poll: "poll",
  db: "db",
  schema: "schema",
  request: "request",
  errorBoundary: "errorBoundary",
  errorboundary: "errorBoundary",
};

function isLifecycleKeyword(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(LIFECYCLE_CATEGORY, name);
}

// ---------------------------------------------------------------------------
// Per-file registry construction (advisory; built fresh per NR run)
// ---------------------------------------------------------------------------

interface LocalDecl {
  kind: ResolvedKind;
  category: ResolvedCategory;
}

/** Build the same-file declaration registry from the AST. */
function buildSameFileRegistry(ast: FileAST): Map<string, LocalDecl> {
  const reg = new Map<string, LocalDecl>();

  // Components — kind:user-component
  for (const c of ast.components ?? []) {
    if (c?.name) {
      reg.set(c.name, { kind: "user-component", category: "user-component" });
    }
  }

  // Type declarations — kind:user-state-type
  for (const t of ast.typeDecls ?? []) {
    if (t?.name) {
      // Don't clobber a same-name component (component takes precedence per
      // §15.15.2 lookup order).
      if (!reg.has(t.name)) {
        reg.set(t.name, { kind: "user-state-type", category: "user-state-type" });
      }
    }
  }

  // Inline state-constructor-def nodes — kind:user-state-type
  function collect(nodes: ASTNode[]): void {
    if (!nodes) return;
    for (const n of nodes) {
      if (!n) continue;
      const anyN = n as any;
      if (anyN.kind === "state-constructor-def" && anyN.stateType) {
        if (!reg.has(anyN.stateType)) {
          reg.set(anyN.stateType, { kind: "user-state-type", category: "user-state-type" });
        }
      }
      if (Array.isArray(anyN.children)) collect(anyN.children);
    }
  }
  collect(ast.nodes ?? []);

  return reg;
}

/**
 * Walk declaration sites and emit W-CASE-001 on each user state-type/component
 * whose lowercase name shadows an HTML element. This fires per declaration
 * (independent of any use site) per SPEC §15.15.4.
 */
function emitCaseDiagnosticsForDeclarations(ast: FileAST, acc: WalkAccumulator): void {
  const decls: Array<{ name: string; span: Span | undefined; kind: ResolvedKind }> = [];
  for (const c of ast.components ?? []) {
    if (c?.name) decls.push({ name: c.name, span: (c as any).span, kind: "user-component" });
  }
  for (const t of ast.typeDecls ?? []) {
    if (t?.name) decls.push({ name: t.name, span: (t as any).span, kind: "user-state-type" });
  }
  function collectDecls(nodes: ASTNode[]): void {
    if (!nodes) return;
    for (const n of nodes) {
      if (!n) continue;
      const anyN = n as any;
      if (anyN.kind === "state-constructor-def" && anyN.stateType) {
        decls.push({ name: anyN.stateType, span: anyN.span, kind: "user-state-type" });
      }
      if (Array.isArray(anyN.children)) collectDecls(anyN.children);
      if (Array.isArray(anyN.body)) collectDecls(anyN.body);
    }
  }
  collectDecls(ast.nodes ?? []);
  for (const d of decls) {
    if (!d.span) continue;
    maybeEmitCase(
      d.name,
      d.span,
      { resolvedKind: d.kind, resolvedCategory: d.kind === "user-component" ? "user-component" : "user-state-type" },
      acc,
    );
  }
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

interface ResolutionContext {
  sameFileRegistry: Map<string, LocalDecl>;
  importedRegistry: Map<string, LocalDecl>;
}

interface Resolution {
  resolvedKind: ResolvedKind;
  resolvedCategory: ResolvedCategory;
}

function resolveName(name: string, ctx: ResolutionContext): Resolution {
  // 1. Same-file
  const local = ctx.sameFileRegistry.get(name);
  if (local) {
    return { resolvedKind: local.kind, resolvedCategory: local.category };
  }
  // 2. Imported
  const imported = ctx.importedRegistry.get(name);
  if (imported) {
    return { resolvedKind: imported.kind, resolvedCategory: imported.category };
  }
  // 3. scrml lifecycle (case-sensitive)
  if (isLifecycleKeyword(name)) {
    return { resolvedKind: "scrml-lifecycle", resolvedCategory: LIFECYCLE_CATEGORY[name] };
  }
  // 4. HTML built-in (case-insensitive — HTML element names are case-insensitive
  //    per the HTML spec)
  if (isHtmlElement(name)) {
    return { resolvedKind: "html-builtin", resolvedCategory: "html" };
  }
  // 5. Unknown — downstream stages own E-COMPONENT-020 / E-MARKUP-001 / E-STATE-001
  return { resolvedKind: "unknown", resolvedCategory: "unknown" };
}

// ---------------------------------------------------------------------------
// AST walker — populates resolvedKind/resolvedCategory and emits diagnostics
// ---------------------------------------------------------------------------

interface WalkAccumulator {
  errors: NRError[];
  kindCounts: Record<ResolvedKind, number>;
  // Track which (name, line, col) combinations have already emitted W-CASE-001
  // / W-WHITESPACE-001 so we never spam (one diagnostic per source position).
  caseEmitted: Set<string>;
  whitespaceEmitted: Set<string>;
}

function spanKey(name: string, span: Span | null | undefined): string {
  if (!span) return name + ":?:?";
  return `${name}:${span.line}:${span.col}`;
}

function maybeEmitCase(
  name: string,
  span: Span,
  resolution: Resolution,
  acc: WalkAccumulator,
): void {
  // W-CASE-001: a user-declared state-type or component whose name is
  // lowercase (first char a-z) AND collides (case-insensitively) with a
  // built-in HTML element.
  const isUserKind =
    resolution.resolvedKind === "user-state-type" ||
    resolution.resolvedKind === "user-component";
  if (!isUserKind) return;
  if (name.length === 0) return;
  const firstChar = name.charCodeAt(0);
  if (firstChar < 0x61 || firstChar > 0x7a) return; // not lowercase a-z
  if (!isHtmlElement(name)) return; // no HTML collision
  const key = spanKey(name, span);
  if (acc.caseEmitted.has(key)) return;
  acc.caseEmitted.add(key);
  acc.errors.push({
    code: "W-CASE-001",
    message:
      `W-CASE-001: User-declared state-type/component \`${name}\` shadows the built-in HTML element \`<${name}>\`. ` +
      `Resolution still succeeds (the user declaration takes precedence), but readers may be confused. ` +
      `Recommended: rename to PascalCase (e.g., \`${name[0].toUpperCase() + name.slice(1)}\`).`,
    span,
    severity: "warning",
  });
}

function maybeEmitWhitespace(
  name: string,
  span: Span,
  openerHadSpaceAfterLt: boolean,
  acc: WalkAccumulator,
): void {
  if (!openerHadSpaceAfterLt) return;
  const key = spanKey(name, span);
  if (acc.whitespaceEmitted.has(key)) return;
  acc.whitespaceEmitted.add(key);
  acc.errors.push({
    code: "W-WHITESPACE-001",
    message:
      `W-WHITESPACE-001: Opener \`< ${name}>\` uses whitespace between \`<\` and the identifier. ` +
      `The canonical form is no-space (\`<${name}>\`); the with-space form is deprecated and ` +
      `becomes E-WHITESPACE-001 in P3. Migration tooling: \`scrml-migrate\` (planned).`,
    span,
    severity: "warning",
  });
}

function walk(nodes: ASTNode[], ctx: ResolutionContext, acc: WalkAccumulator): void {
  if (!nodes) return;
  for (const n of nodes) {
    if (!n) continue;
    const anyN = n as any;
    const kind = anyN.kind as string;

    // Resolve every tag-bearing node.
    if (kind === "markup" && anyN.tag) {
      const res = resolveName(anyN.tag, ctx);
      anyN.resolvedKind = res.resolvedKind;
      anyN.resolvedCategory = res.resolvedCategory;
      acc.kindCounts[res.resolvedKind]++;
      if (anyN.span) {
        maybeEmitCase(anyN.tag, anyN.span, res, acc);
        maybeEmitWhitespace(
          anyN.tag,
          anyN.span,
          anyN.openerHadSpaceAfterLt === true,
          acc,
        );
      }
    } else if (
      (kind === "state" || kind === "state-constructor-def") &&
      anyN.stateType
    ) {
      const res = resolveName(anyN.stateType, ctx);
      anyN.resolvedKind = res.resolvedKind;
      anyN.resolvedCategory = res.resolvedCategory;
      acc.kindCounts[res.resolvedKind]++;
      if (anyN.span) {
        maybeEmitCase(anyN.stateType, anyN.span, res, acc);
        maybeEmitWhitespace(
          anyN.stateType,
          anyN.span,
          anyN.openerHadSpaceAfterLt === true,
          acc,
        );
      }
    } else if (kind === "machine-decl" && (anyN.machineName || anyN.governedType)) {
      // machine-decl is a state-form lifecycle (the keyword `engine` or `machine`)
      // — resolved category is always "engine" (canonical) or "machine" (legacy).
      const category: ResolvedCategory = anyN.legacyMachineKeyword === true ? "machine" : "engine";
      anyN.resolvedKind = "scrml-lifecycle";
      anyN.resolvedCategory = category;
      acc.kindCounts["scrml-lifecycle"]++;
      if (anyN.span) {
        maybeEmitWhitespace(
          anyN.legacyMachineKeyword === true ? "machine" : "engine",
          anyN.span,
          anyN.openerHadSpaceAfterLt === true,
          acc,
        );
      }
    }

    // Recurse into children.
    if (Array.isArray(anyN.children)) walk(anyN.children, ctx, acc);
    // Logic-block bodies hold function-decl, const-decl etc. but tag nodes
    // inside lift-blocks live in `body` arrays of those statements. Walk
    // anything that looks like a body or branch.
    if (Array.isArray(anyN.body)) walk(anyN.body, ctx, acc);
    if (Array.isArray(anyN.consequent)) walk(anyN.consequent, ctx, acc);
    if (Array.isArray(anyN.alternate)) walk(anyN.alternate, ctx, acc);
    if (Array.isArray(anyN.arms)) {
      for (const arm of anyN.arms) {
        if (arm && Array.isArray(arm.body)) walk(arm.body, ctx, acc);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface NRInput {
  filePath: string;
  ast: FileAST;
  /** MOD's exportRegistry (Map<filePath, Map<name, {kind, isComponent}>>). Optional;
   *  when absent NR runs same-file-only resolution. */
  exportRegistry?: Map<string, Map<string, { kind: string; isComponent: boolean }>>;
  /** MOD's importGraph (per-file imports). When provided alongside exportRegistry,
   *  NR resolves imported names that match an opener tag. */
  importGraph?: Map<string, { imports: Array<{ names: string[]; absSource: string }> }>;
}

/**
 * Run NR over a single TAB result. Mutates `ast` in place by adding
 * resolvedKind/resolvedCategory to each tag-bearing node.
 */
export function runNR(input: NRInput): NRResult {
  const { filePath, ast, exportRegistry, importGraph } = input;

  // Build same-file registry.
  const sameFileRegistry = buildSameFileRegistry(ast);

  // Build imported registry from MOD output (when available).
  const importedRegistry = new Map<string, LocalDecl>();
  if (exportRegistry && importGraph) {
    const fileImports = importGraph.get(filePath);
    if (fileImports) {
      for (const imp of fileImports.imports ?? []) {
        const targetExports = exportRegistry.get(imp.absSource);
        if (!targetExports) continue;
        for (const importedName of imp.names ?? []) {
          const exported = targetExports.get(importedName);
          if (!exported) continue;
          const local: LocalDecl = exported.isComponent
            ? { kind: "user-component", category: "user-component" }
            : { kind: "user-state-type", category: "user-state-type" };
          // Same-file declarations win over imports.
          if (!sameFileRegistry.has(importedName)) {
            importedRegistry.set(importedName, local);
          }
        }
      }
    }
  }

  const acc: WalkAccumulator = {
    errors: [],
    kindCounts: {
      "html-builtin": 0,
      "scrml-lifecycle": 0,
      "user-state-type": 0,
      "user-component": 0,
      unknown: 0,
    },
    caseEmitted: new Set(),
    whitespaceEmitted: new Set(),
  };

  // Emit W-CASE-001 on declaration sites first (per SPEC §15.15.4 — fires
  // independently of use sites).
  emitCaseDiagnosticsForDeclarations(ast, acc);

  walk(ast.nodes ?? [], { sameFileRegistry, importedRegistry }, acc);

  return {
    filePath,
    errors: acc.errors,
    registrySize: sameFileRegistry.size + importedRegistry.size,
    kindCounts: acc.kindCounts,
  };
}

/**
 * Run NR over an array of TAB results. Each AST is mutated in place.
 * Returns the per-file results array in the same order.
 */
export function runNRBatch(
  tabResults: Array<{ filePath: string; ast: FileAST }>,
  exportRegistry?: Map<string, Map<string, { kind: string; isComponent: boolean }>>,
  importGraph?: Map<string, { imports: Array<{ names: string[]; absSource: string }> }>,
): NRResult[] {
  const out: NRResult[] = [];
  for (const r of tabResults) {
    if (!r || !r.ast) continue;
    out.push(
      runNR({
        filePath: r.filePath,
        ast: r.ast,
        exportRegistry,
        importGraph,
      }),
    );
  }
  return out;
}
