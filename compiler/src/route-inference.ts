/**
 * Route Inferrer — Stage 5 of the scrml compiler pipeline (RI).
 *
 * Input:  { files: FileAST[], protectAnalysis: ProtectAnalysis }
 * Output: { routeMap: RouteMap, errors: RIError[] }
 *
 * RouteMap = {
 *   functions: Map<FunctionNodeId, FunctionRoute>,
 * }
 *
 * FunctionRoute = {
 *   functionNodeId: FunctionNodeId,
 *   boundary: 'client' | 'server' | 'middleware',  // middleware = handle() escape hatch (§ 39.3)
 *   escalationReasons: EscalationReason[],  // empty if client
 *   generatedRouteName: string | null,       // null for client functions
 *   serverEntrySpan: Span | null,
 *   cpsSplit: CPSSplit | null,               // non-null when CPS transformation applies
 * }
 *
 * CPSSplit = {
 *   serverStmtIndices: number[],   // indices into the function body that run on server
 *   clientStmtIndices: number[],   // indices into the function body that run on client
 *   returnVarName: string | null,  // the name of the variable that receives the server result
 * }
 *
 * EscalationReason =
 *   | { kind: 'protected-field-access', field: string, stateBlockId: string }
 *   | { kind: 'server-only-resource',   resourceType: string, span: Span }
 *   | { kind: 'explicit-annotation',    span: Span }
 *
 * FunctionNodeId = "{filePath}::{span.start}"
 *
 * Error codes produced:
 *   E-RI-002  server-escalated function assigns to @reactive variable (AT_IDENT in assignment)
 *             NOTE: E-RI-002 is suppressed when (a) CPS transformation is applicable — CPS splits
 *             the function at the server/client boundary so reactive assignments stay client-side,
 *             or (b) the function has no DIRECT server triggers (it is escalated only by calling
 *             other server functions). A purely-transitively-escalated function is a client function
 *             that uses fetch stubs — it executes on the client and can mutate reactive state.
 *             E-RI-002 is only emitted when CPS cannot split AND direct triggers are present.
 *   E-ROUTE-001  warning — unresolvable callee (variable-stored function ref, computed member)
 *
 * What RI does NOT do:
 *   - No code generation.
 *   - No type resolution.
 *   - No full alias tracking (DC-011 accepted limitation — direct patterns only).
 *   - No SQL query execution or validation.
 *   - No dependency graph construction.
 *
 * Performance budget: <= 15 ms for the full project.
 */

import type {
  Span,
  FileAST,
  ASTNode,
  LogicStatement,
  FunctionDeclNode,
  StateNode,
  LogicNode,
  ImportDeclNode,
} from "./types/ast.ts";

import type { ProtectAnalysis } from "./protect-analyzer.ts";

// ---------------------------------------------------------------------------
// RI-internal types
// ---------------------------------------------------------------------------

/** A reason why a function was escalated to run on the server. */
export type EscalationReason =
  | { kind: "protected-field-access"; field: string; stateBlockId: string }
  | { kind: "server-only-resource"; resourceType: string; span: Span }
  | { kind: "explicit-annotation"; span: Span };

/**
 * CPS transformation split plan.
 * When applicable, the compiler splits the function at the server/client boundary.
 */
export interface CPSSplit {
  /** Indices into the function body that run on the server. */
  serverStmtIndices: number[];
  /** Indices into the function body that run on the client. */
  clientStmtIndices: number[];
  /** The reactive variable name that receives the server result, or null. */
  returnVarName: string | null;
}

/** A resolved route entry for a single function. */
export interface FunctionRoute {
  functionNodeId: string;
  boundary: "client" | "server" | "middleware";
  escalationReasons: EscalationReason[];
  generatedRouteName: string | null;
  explicitRoute: string | null;
  explicitMethod: string | null;
  isSSE: boolean;
  serverEntrySpan: Span | null;
  cpsSplit: CPSSplit | null;
}

/** A page route entry derived from file-based routing. */
export interface PageRoute {
  filePath: string;
  urlPattern: string;
  params: string[];
  layoutFilePath: string | null;
  isCatchAll: boolean;
}

/** Auth middleware configuration derived from <program auth="required"> or auto-escalation. */
export interface AuthMiddleware {
  filePath: string;
  auth: string;
  loginRedirect: string;
  csrf: string;
  sessionExpiry: string;
  autoEscalated?: boolean;
}

/** The complete route map produced by RI. */
export interface RouteMap {
  functions: Map<string, FunctionRoute>;
  pages: Map<string, PageRoute>;
  authMiddleware: Map<string, AuthMiddleware>;
}

/** Per-function analysis record (used during transitive escalation). */
interface AnalysisRecord {
  fnNodeId: string;
  filePath: string;
  fnNode: FunctionDeclNode;
  isPure: false;
  directTriggers: EscalationReason[];
  callees: string[];
  warnings: RouteWarning[];
}

/** An entry in the global function index. */
interface FunctionIndexEntry {
  fnNodeId: string;
  filePath: string;
  fnNode: FunctionDeclNode;
}

/** Result of walkBodyForTriggers. */
interface WalkResult {
  triggers: EscalationReason[];
  callees: string[];
  warnings: RouteWarning[];
}

/** Internal warning record for E-ROUTE-001. */
interface RouteWarning {
  code: string;
  message: string;
  span: Span;
  severity?: "error" | "warning";
}

/** CPS eligibility analysis result. */
interface CPSResult {
  eligible: boolean;
  serverStmtIndices: number[];
  clientStmtIndices: number[];
  returnVarName: string | null;
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class RIError {
  code: string;
  message: string;
  span: Span;
  severity?: "error" | "warning";
  filePath?: string;

  constructor(code: string, message: string, span: Span) {
    this.code = code;
    this.message = message;
    this.span = span;
  }
}

// ---------------------------------------------------------------------------
// Server-only resource detection (Trigger 1)
//
// Detects Bun-specific APIs, file-system access, and SQL contexts.
// All ?{} SQL blocks auto-escalate to server per §12.2 Trigger 1.
// ---------------------------------------------------------------------------

/** A pattern that signals server-only resource access in a bare-expr string. */
interface ServerOnlyPattern {
  pattern: RegExp;
  resourceType: string;
}

/**
 * Patterns that indicate server-only resource access.
 * Applied to bare-expr node `expr` strings.
 */
const SERVER_ONLY_PATTERNS: ServerOnlyPattern[] = [
  // SQL context sigil (?{}) — all database access is server-side (§12.2 Trigger 1)
  { pattern: /\?\{/, resourceType: "sql-query" },
  // Bun-specific APIs
  { pattern: /\bBun\.file\s*\(/, resourceType: "Bun.file" },
  { pattern: /\bBun\.write\s*\(/, resourceType: "Bun.write" },
  { pattern: /\bBun\.spawn\s*\(/, resourceType: "Bun.spawn" },
  { pattern: /\bBun\.serve\s*\(/, resourceType: "Bun.serve" },
  { pattern: /\bBun\.env\b/, resourceType: "Bun.env" },
  { pattern: /\bnew\s+Bun\.Server\b/, resourceType: "Bun.Server" },
  { pattern: /\bnew\s+Database\s*\(/, resourceType: "bun:sqlite Database" },
  // Node.js fs module calls
  { pattern: /\bfs\.readFile\s*\(/, resourceType: "fs.readFile" },
  { pattern: /\bfs\.writeFile\s*\(/, resourceType: "fs.writeFile" },
  { pattern: /\bfs\.readFileSync\s*\(/, resourceType: "fs.readFileSync" },
  { pattern: /\bfs\.writeFileSync\s*\(/, resourceType: "fs.writeFileSync" },
  { pattern: /\bfs\.unlink\s*\(/, resourceType: "fs.unlink" },
  { pattern: /\bfs\.mkdir\s*\(/, resourceType: "fs.mkdir" },
  { pattern: /\bfs\.rmdir\s*\(/, resourceType: "fs.rmdir" },
  { pattern: /\bfs\.stat\s*\(/, resourceType: "fs.stat" },
  { pattern: /\bfs\.existsSync\s*\(/, resourceType: "fs.existsSync" },
  { pattern: /\breadFileSync\s*\(/, resourceType: "readFileSync" },
  { pattern: /\bwriteFileSync\s*\(/, resourceType: "writeFileSync" },
  // process.env is server-only
  { pattern: /\bprocess\.env\b/, resourceType: "process.env" },
  // env() built-in is server-only unless prefixed with `public`
  { pattern: /(?<!public )\benv\s*\(/, resourceType: "env()" },
  // session object is server-only (§20.5 — available only in server-escalated functions)
  { pattern: /\bsession\b/, resourceType: "session" },
];

/**
 * scrml module names whose exports are server-only.
 * Functions imported from these modules cannot run on the client.
 *
 * Used in CPS analysis and server-trigger detection to recognize calls
 * like hash(password) (from scrml:crypto) as server-side operations
 * even though they are not user-defined functions in the AST.
 */
const SERVER_ONLY_SCRML_MODULES = new Set<string>([
  "scrml:crypto",
  "scrml:auth",
  "scrml:data",
  "scrml:http",
]);

/**
 * Check a bare-expr string for server-only resource access patterns.
 * Returns the first matching resourceType, or null if none match.
 */
function detectServerOnlyResource(expr: string): string | null {
  for (const { pattern, resourceType } of SERVER_ONLY_PATTERNS) {
    if (pattern.test(expr)) return resourceType;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Protected field detection (Trigger 2)
// ---------------------------------------------------------------------------

/**
 * Build a regex that matches `.fieldName` as a member access in an expression.
 *
 * Per DC-011: this is a conservative structural check. False negatives are
 * possible for aliased accesses. False positives are possible for field names
 * that appear as property names on non-db objects.
 */
function memberAccessRegex(fieldName: string): RegExp {
  return new RegExp(`\\.${escapeRegex(fieldName)}\\b`);
}

/**
 * Build a regex that matches `{ fieldName }` or `{ fieldName,` or `, fieldName }` etc.
 * in a destructuring pattern.
 */
function destructuringRegex(fieldName: string): RegExp {
  return new RegExp(`(?:^|[{,\\s])\\s*${escapeRegex(fieldName)}\\s*(?:[,}:])`);
}

/** Escape a string for use in a RegExp. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Check a bare-expr string for direct member access of a protected field.
 */
function bareExprAccessesField(expr: string, fieldName: string): boolean {
  return memberAccessRegex(fieldName).test(expr);
}

/**
 * Check a let-decl or const-decl node for direct destructuring of a protected field.
 */
function declDestructuresField(init: string, fieldName: string): boolean {
  return destructuringRegex(fieldName).test(init);
}

// ---------------------------------------------------------------------------
// Call site extraction
// ---------------------------------------------------------------------------

/**
 * Pattern to match direct function calls: `identifierName(`
 * Does NOT match: `obj.method(` or `fn[x](`.
 */
const DIRECT_CALL_REGEX = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;

/**
 * Pattern to detect computed member access.
 * `identifier[` — a computed property access.
 */
const COMPUTED_MEMBER_REGEX = /\b[A-Za-z_$][A-Za-z0-9_$]*\s*\[/;

/**
 * Extract direct callee names from a bare-expr string.
 * Returns an array of name strings (may contain duplicates).
 */
function extractCalleesFromExpr(expr: string): string[] {
  const names: string[] = [];
  const re = new RegExp(DIRECT_CALL_REGEX.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(expr)) !== null) {
    names.push(m[1]);
  }
  return names;
}

// ---------------------------------------------------------------------------
// AST walker utilities
// ---------------------------------------------------------------------------

/**
 * Collect all StateBlock nodes with stateType === 'db' from a FileAST's node tree.
 */
function collectDbBlocks(nodes: ASTNode[]): StateNode[] {
  const result: StateNode[] = [];
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    if (node.kind === "state" && (node as StateNode).stateType === "db") {
      result.push(node as StateNode);
    }
    if ("children" in node && Array.isArray(node.children) && node.children.length > 0) {
      result.push(...collectDbBlocks(node.children as ASTNode[]));
    }
  }
  return result;
}

/**
 * Collect all function/fn nodes from a LogicStatement[] body tree.
 * Recurses into nested function bodies.
 */
function collectFunctionNodes(body: LogicStatement[]): FunctionDeclNode[] {
  const result: FunctionDeclNode[] = [];
  for (const node of body) {
    if (!node || typeof node !== "object") continue;
    if (node.kind === "function-decl") {
      result.push(node as FunctionDeclNode);
      if (Array.isArray((node as FunctionDeclNode).body)) {
        result.push(...collectFunctionNodes((node as FunctionDeclNode).body));
      }
    }
  }
  return result;
}

/**
 * Collect all top-level function nodes from a FileAST.
 * Searches inside LogicBlock nodes at the top level, then recurses.
 */
export function collectFileFunctions(fileAST: FileAST): FunctionDeclNode[] {
  const nodes: ASTNode[] = fileAST.nodes ?? ((fileAST as any).ast ? (fileAST as any).ast.nodes : []);
  const result: FunctionDeclNode[] = [];

  function visitNodes(astNodes: ASTNode[]): void {
    for (const node of astNodes) {
      if (!node || typeof node !== "object") continue;
      if (node.kind === "logic") {
        const logicNode = node as LogicNode;
        if (Array.isArray(logicNode.body)) {
          result.push(...collectFunctionNodes(logicNode.body));
        }
      }
      if (node.kind === "function-decl") {
        result.push(node as FunctionDeclNode);
        const fnNode = node as FunctionDeclNode;
        if (Array.isArray(fnNode.body)) {
          result.push(...collectFunctionNodes(fnNode.body));
        }
      }
      // Recurse into markup/state/meta children
      if ("children" in node && Array.isArray((node as any).children)) {
        visitNodes((node as any).children);
      }
    }
  }

  visitNodes(nodes);
  return result;
}

/**
 * Collect the span.start values of all function nodes that live inside a
 * nested <program name="..."> worker body.
 *
 * Worker programs are markup nodes with tag === "program" AND a non-empty
 * `name` attribute. The root <program> has no name attribute.
 *
 * Functions inside worker bodies cannot access protected fields or shared
 * reactive state — no DB access, no server escalation triggers are meaningful
 * there. E-ROUTE-001 is suppressed for these functions.
 */
function collectWorkerBodyFunctionIds(fileAST: FileAST): Set<number> {
  const nodes: ASTNode[] = fileAST.nodes ?? ((fileAST as any).ast ? (fileAST as any).ast.nodes : []);
  const result = new Set<number>();

  function visitNodes(astNodes: ASTNode[], insideWorker: boolean): void {
    for (const node of astNodes) {
      if (!node || typeof node !== "object") continue;

      // Detect a named <program name="..."> markup node — this is a worker body.
      let enteringWorker = insideWorker;
      if (node.kind === "markup" && (node as any).tag === "program") {
        const attrs: any[] = (node as any).attrs ?? [];
        const hasName = attrs.some(
          (a: any) => a && (a.name === "name" || a.key === "name") && (a.value || a.val),
        );
        if (hasName) {
          enteringWorker = true;
        }
      }

      // Collect all functions inside worker bodies.
      if (enteringWorker && node.kind === "logic") {
        const logicNode = node as LogicNode;
        if (Array.isArray(logicNode.body)) {
          for (const fn of collectFunctionNodes(logicNode.body)) {
            result.add(fn.span.start);
          }
        }
      }

      // Recurse into children.
      if ("children" in node && Array.isArray((node as any).children)) {
        visitNodes((node as any).children, enteringWorker);
      }
    }
  }

  visitNodes(nodes, false);
  return result;
}

// ---------------------------------------------------------------------------
// FunctionNodeId
// ---------------------------------------------------------------------------

/**
 * Construct a FunctionNodeId from a filePath and a function node.
 */
function makeFunctionNodeId(filePath: string, fnNode: FunctionDeclNode): string {
  return `${filePath}::${fnNode.span.start}`;
}

// ---------------------------------------------------------------------------
// Route name generation
// ---------------------------------------------------------------------------

let _routeCounter = 0;

/**
 * Generate a deterministic compiler-internal route name.
 * Uses a counter + function name for human readability in error messages,
 * but this name is NOT user-visible.
 */
export function generateRouteName(functionName: string): string {
  _routeCounter++;
  const safe = (functionName || "anon").replace(/[^A-Za-z0-9_]/g, "_");
  return `__ri_route_${safe}_${_routeCounter}`;
}

// ---------------------------------------------------------------------------
// Trigger detection — body walker
// ---------------------------------------------------------------------------

/**
 * Walk a LogicStatement[] body and collect escalation triggers.
 *
 * Returns:
 *   triggers  — EscalationReason[] from direct body analysis (NOT transitive)
 *   callees   — string[] of directly-called function names (for transitive escalation)
 *   warnings  — RouteWarning[] for unresolvable callees (E-ROUTE-001)
 *
 * @param isWorkerBody — when true, E-ROUTE-001 is suppressed. Worker program bodies
 *   (<program name="...">) are isolated execution contexts with no access to protected
 *   fields or shared reactive state. Computed member access there is safe and expected
 *   (e.g., array indexing in sieve algorithms). Emitting E-ROUTE-001 inside workers
 *   would be noise with no actionable signal.
 */
export function walkBodyForTriggers(
  body: LogicStatement[],
  protectedFields: Set<string>,
  stateBlockIdByField: Map<string, string>,
  filePath: string,
  isWorkerBody: boolean = false,
): WalkResult {
  const triggers: EscalationReason[] = [];
  const callees: string[] = [];
  const warnings: RouteWarning[] = [];

  function visitNode(node: LogicStatement | ASTNode): void {
    if (!node || typeof node !== "object") return;

    // Trigger 1: ?{} SQL context — all database access is server-side by default.
    if (node.kind === "sql") {
      triggers.push({
        kind: "server-only-resource",
        resourceType: "sql-query",
        span: node.span,
      });
      return;
    }

    if (node.kind === "bare-expr") {
      const expr = (node as any).expr ?? "";

      // Trigger 1: server-only resource access.
      const resourceType = detectServerOnlyResource(expr);
      if (resourceType !== null) {
        triggers.push({
          kind: "server-only-resource",
          resourceType,
          span: node.span,
        });
      }

      // Trigger 2: protected field access via direct member expression.
      for (const fieldName of protectedFields) {
        if (bareExprAccessesField(expr, fieldName)) {
          triggers.push({
            kind: "protected-field-access",
            field: fieldName,
            stateBlockId: stateBlockIdByField.get(fieldName) ?? "",
          });
        }
      }

      // Callee extraction for transitive escalation.
      const names = extractCalleesFromExpr(expr);
      callees.push(...names);

      // E-ROUTE-001: computed member access warning.
      // Suppressed inside worker bodies — workers have no protected fields or shared
      // reactive state, so computed array indexing (e.g., flags[i]) is safe and expected.
      if (!isWorkerBody && COMPUTED_MEMBER_REGEX.test(expr)) {
        warnings.push({
          code: "E-ROUTE-001",
          message:
            `E-ROUTE-001: Computed member access detected in expression \`${expr.slice(0, 80)}\`. ` +
            `The compiler cannot statically determine the accessed property name. ` +
            `If this accesses a protected field via a computed key, it will not be detected by route inference. ` +
            `Use a direct property access (e.g., \`row.fieldName\`) to ensure correct route placement.`,
          span: node.span,
          severity: "warning",
        });
      }

      return; // Don't recurse into bare-expr text.
    }

    if (
      node.kind === "let-decl" ||
      node.kind === "const-decl" ||
      node.kind === "tilde-decl"
    ) {
      const init = (node as any).init ?? "";

      // Trigger 2: protected field access via direct destructuring.
      for (const fieldName of protectedFields) {
        if (declDestructuresField(init, fieldName)) {
          triggers.push({
            kind: "protected-field-access",
            field: fieldName,
            stateBlockId: stateBlockIdByField.get(fieldName) ?? "",
          });
        }
      }

      // Trigger 1: server-only resource in the init expression (e.g. ?{} SQL sigil, Bun.file(), etc.)
      const resourceType = detectServerOnlyResource(init);
      if (resourceType !== null) {
        triggers.push({
          kind: "server-only-resource",
          resourceType,
          span: node.span,
        });
      }

      // Callee extraction from the init expression.
      const names = extractCalleesFromExpr(init);
      callees.push(...names);
      return;
    }

    if (node.kind === "reactive-decl") {
      // @name = expr — reactive-decl IS an assignment to an @-prefixed identifier.
      // Also scan the init for server-only resources and callees.
      const init = (node as any).init ?? "";

      // Trigger 1: server-only resource in the init expression (e.g. ?{} SQL sigil).
      // Matches the same check applied to let-decl/const-decl/tilde-decl above.
      const reactDeclResourceType = detectServerOnlyResource(init);
      if (reactDeclResourceType !== null) {
        triggers.push({
          kind: "server-only-resource",
          resourceType: reactDeclResourceType,
          span: node.span,
        });
      }

      const names = extractCalleesFromExpr(init);
      callees.push(...names);
      return;
    }

    // For nested function-decl: do NOT recurse into their bodies
    // here — they are separate function nodes with their own analysis entries.
    if (node.kind === "function-decl") {
      return;
    }

    // For all other node kinds, recursively visit array fields.
    for (const key of Object.keys(node)) {
      if (key === "span" || key === "id") continue;
      const val = (node as any)[key];
      if (Array.isArray(val)) {
        for (const child of val) {
          visitNode(child);
        }
      }
    }
  }

  for (const node of body) {
    visitNode(node);
  }

  return { triggers, callees, warnings };
}

/**
 * Check whether a function body directly contains an assignment to an @-prefixed
 * identifier (reactive-decl nodes) or an AT_IDENT in assignment position in a bare-expr.
 *
 * Per §12.7: "RI walks the parsed function body for assignment expressions where the
 * left-hand side is an AT_IDENT token in assignment position."
 */
function findReactiveAssignment(body: LogicStatement[]): LogicStatement | null {
  function visitNode(node: LogicStatement): LogicStatement | null {
    if (!node || typeof node !== "object") return null;

    // reactive-decl is the canonical AT_IDENT assignment form.
    if (node.kind === "reactive-decl") {
      return node;
    }

    // Also check bare-expr for @name = pattern.
    if (node.kind === "bare-expr") {
      const expr = (node as any).expr ?? "";
      if (/\B@[A-Za-z_$][A-Za-z0-9_$]*\s*=[^=]/.test(expr)) {
        return node;
      }
      return null;
    }

    // Do not recurse into nested function bodies.
    if (node.kind === "function-decl") {
      return null;
    }

    // Recurse into array children.
    for (const key of Object.keys(node)) {
      if (key === "span" || key === "id") continue;
      const val = (node as any)[key];
      if (Array.isArray(val)) {
        for (const child of val) {
          const found = visitNode(child);
          if (found !== null) return found;
        }
      }
    }

    return null;
  }

  for (const node of body) {
    const found = visitNode(node);
    if (found !== null) return found;
  }

  return null;
}

// ---------------------------------------------------------------------------
// CPS transformation analysis
// ---------------------------------------------------------------------------

/**
 * Determine whether a function body is eligible for CPS transformation and,
 * if so, compute the split plan.
 *
 * CPS is eligible when:
 *   - There is at least one server-trigger statement
 *   - There is at least one reactive statement
 *   - No single statement is BOTH a server trigger AND a reactive assignment
 */
export function analyzeCPSEligibility(
  body: LogicStatement[],
  protectedFields: Set<string>,
  stateBlockIdByField: Map<string, string>,
  functionIndex: Map<string, FunctionIndexEntry[]>,
  analysisMap: Map<string, AnalysisRecord>,
  resolvedServerFnIds: Set<string>,
  importedServerFnNames: Set<string>,
): CPSResult | null {
  if (!body || body.length === 0) return null;

  const serverIndices: number[] = [];
  const reactiveIndices: number[] = [];
  const reactiveServerIndices: number[] = []; // reactive-decls whose init calls a server fn
  const mixedIndices: number[] = []; // bare-expr statements that are BOTH server + reactive

  for (let i = 0; i < body.length; i++) {
    const node = body[i];
    if (!node || typeof node !== "object") continue;

    const isReactive = isReactiveStatement(node);
    const isServer = isServerTriggerStatement(
      node,
      protectedFields,
      stateBlockIdByField,
      functionIndex,
      analysisMap,
      resolvedServerFnIds,
      importedServerFnNames,
    );

    // Special case: reactive-decl with server function call OR server-only
    // resource in init — CPS-eligible.
    const isReactiveServer =
      isReactive &&
      node.kind === "reactive-decl" &&
      (hasServerCallInInit(node, functionIndex, resolvedServerFnIds, importedServerFnNames) ||
        hasServerOnlyResourceInInit(node));

    if (isReactiveServer) {
      reactiveServerIndices.push(i);
    } else if (isReactive && isServer) {
      // bare-expr with both @var= and server resource — truly unsplittable
      mixedIndices.push(i);
    } else if (isReactive) {
      reactiveIndices.push(i);
    } else if (isServer) {
      serverIndices.push(i);
    }
    // Statements that are neither are client-side by default
  }

  // CPS is applicable when:
  // 1. There are NO mixed (unsplittable) statements
  // 2. There is at least one reactive statement (pure reactive or reactive-server)
  // 3. There is at least one server-side element (server statement or reactive-server)
  const hasReactive = reactiveIndices.length > 0 || reactiveServerIndices.length > 0;
  const hasServer = serverIndices.length > 0 || reactiveServerIndices.length > 0;

  if (!hasReactive || !hasServer) return null;
  if (mixedIndices.length > 0) return null;

  // Compute the split.
  const allServerIndices = [...serverIndices, ...reactiveServerIndices].sort((a, b) => a - b);
  const clientStmtIndices: number[] = [];
  for (let i = 0; i < body.length; i++) {
    if (!serverIndices.includes(i)) {
      clientStmtIndices.push(i);
    }
    // Note: reactiveServerIndices are in BOTH lists.
  }

  // Detect returnVarName from reactive-server statements.
  let returnVarName: string | null = null;
  for (const ri of reactiveServerIndices) {
    const node = body[ri];
    if (node.kind === "reactive-decl" && (node as any).name) {
      returnVarName = (node as any).name;
      break;
    }
  }

  return {
    eligible: true,
    serverStmtIndices: allServerIndices,
    clientStmtIndices,
    returnVarName,
  };
}

/**
 * Check if a reactive-decl node's init expression calls a server-escalated function.
 */
function hasServerCallInInit(
  node: LogicStatement,
  functionIndex: Map<string, FunctionIndexEntry[]>,
  resolvedServerFnIds: Set<string>,
  importedServerFnNames: Set<string>,
): boolean {
  const init = (node as any).init ?? "";
  if (!init) return false;
  const callees = extractCalleesFromExpr(init);
  for (const calleeName of callees) {
    const calleeEntries = functionIndex.get(calleeName);
    if (calleeEntries) {
      for (const { fnNodeId: calleeId } of calleeEntries) {
        if (resolvedServerFnIds.has(calleeId)) return true;
      }
    }
    if (importedServerFnNames.has(calleeName)) return true;
  }
  return false;
}

/**
 * Check if a reactive-decl node's init expression contains a server-only
 * resource: SQL sigil (?{`), Bun.* APIs, process.env, env(), etc.
 */
function hasServerOnlyResourceInInit(node: LogicStatement): boolean {
  const init = typeof (node as any).init === "string" ? (node as any).init : "";
  if (!init) return false;

  // Check for SQL sigil (?{`)
  if (/\?\{`/.test(init)) return true;

  // Check for other server-only resource patterns
  if (detectServerOnlyResource(init) !== null) return true;

  return false;
}

/**
 * Check if a single statement node is a reactive assignment.
 */
function isReactiveStatement(node: LogicStatement): boolean {
  if (node.kind === "reactive-decl") return true;
  if (node.kind === "bare-expr") {
    const expr = (node as any).expr ?? "";
    if (/\B@[A-Za-z_$][A-Za-z0-9_$]*\s*=[^=]/.test(expr)) return true;
  }
  return false;
}

/**
 * Check if a single statement node contains a server-only trigger.
 */
function isServerTriggerStatement(
  node: LogicStatement,
  protectedFields: Set<string>,
  stateBlockIdByField: Map<string, string>,
  functionIndex: Map<string, FunctionIndexEntry[]>,
  analysisMap: Map<string, AnalysisRecord>,
  resolvedServerFnIds: Set<string>,
  importedServerFnNames: Set<string>,
): boolean {
  if (!node || typeof node !== "object") return false;

  // SQL blocks are always server-side
  if (node.kind === "sql") return true;

  if (node.kind === "bare-expr") {
    const expr = (node as any).expr ?? "";

    // Server-only resource access
    if (detectServerOnlyResource(expr) !== null) return true;

    // Protected field access
    for (const fieldName of protectedFields) {
      if (bareExprAccessesField(expr, fieldName)) return true;
    }

    // Calls to server-escalated functions or scrml: stdlib imports
    const callees = extractCalleesFromExpr(expr);
    for (const calleeName of callees) {
      const calleeEntries = functionIndex.get(calleeName);
      if (calleeEntries) {
        for (const { fnNodeId: calleeId } of calleeEntries) {
          if (resolvedServerFnIds.has(calleeId)) return true;
        }
      }
      if (importedServerFnNames.has(calleeName)) return true;
    }
  }

  if (node.kind === "let-decl" || node.kind === "const-decl") {
    const init = (node as any).init ?? "";

    // Protected field via destructuring
    for (const fieldName of protectedFields) {
      if (declDestructuresField(init, fieldName)) return true;
    }

    // Server-only resource in init
    if (detectServerOnlyResource(init) !== null) return true;

    // Calls to server-escalated functions or scrml: stdlib imports in init
    const callees = extractCalleesFromExpr(init);
    for (const calleeName of callees) {
      const calleeEntries = functionIndex.get(calleeName);
      if (calleeEntries) {
        for (const { fnNodeId: calleeId } of calleeEntries) {
          if (resolvedServerFnIds.has(calleeId)) return true;
        }
      }
      if (importedServerFnNames.has(calleeName)) return true;
    }
  }

  // NOTE: reactive-decl nodes are NOT checked for server triggers here.
  // A reactive-decl like `@data = serverCall()` is CPS-eligible.
  // The only truly ineligible case is when a bare-expr contains BOTH
  // a reactive @-assignment AND server access in the same expression string.

  return false;
}

// ---------------------------------------------------------------------------
// Global function registry
// ---------------------------------------------------------------------------

/**
 * Build a global index of all function nodes across all files.
 * Key: function name → array of { fnNodeId, filePath, fnNode }
 */
export function buildFunctionIndex(files: FileAST[]): Map<string, FunctionIndexEntry[]> {
  const index = new Map<string, FunctionIndexEntry[]>();

  for (const fileAST of files) {
    const filePath = fileAST.filePath;
    const fnNodes = collectFileFunctions(fileAST);
    for (const fnNode of fnNodes) {
      const name = fnNode.name;
      if (!name) continue;
      const fnNodeId = makeFunctionNodeId(filePath, fnNode);
      if (!index.has(name)) index.set(name, []);
      index.get(name)!.push({ fnNodeId, filePath, fnNode });
    }
  }

  return index;
}

/**
 * Build a set of function names imported from server-only scrml: modules.
 *
 * When a file imports { hash } from 'scrml:crypto', hash is server-only
 * even though it has no AST node in the user's code.
 */
function buildImportedServerFnNames(files: FileAST[]): Set<string> {
  const names = new Set<string>();
  for (const fileAST of files) {
    const imports: ImportDeclNode[] =
      fileAST.imports ?? ((fileAST as any).ast ? (fileAST as any).ast.imports : []) ?? [];
    for (const node of imports) {
      if (node && node.kind === "import-decl" && node.source) {
        const source = node.source.replace(/^['"]|['"]$/g, "");
        if (SERVER_ONLY_SCRML_MODULES.has(source)) {
          for (const name of node.names ?? []) {
            names.add(name);
          }
        }
      }
    }
  }
  return names;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/** Input to the RI stage. */
export interface RIInput {
  files: FileAST[];
  protectAnalysis: ProtectAnalysis;
}

/** Output of the RI stage. */
export interface RIOutput {
  routeMap: RouteMap;
  errors: (RIError | { code: string; message: string; severity: string; filePath: string })[];
}

/**
 * Run the Route Inferrer (RI, Stage 5).
 */
export function runRI(input: RIInput): RIOutput {
  const { files, protectAnalysis } = input;

  // Reset the route counter for deterministic output within a single runRI call.
  _routeCounter = 0;

  const functions = new Map<string, FunctionRoute>();
  const errors: (RIError | { code: string; message: string; severity: string; filePath: string })[] = [];

  // ------------------------------------------------------------------
  // Step 1: Build a global set of all protected field names across all
  // db state blocks, and a mapping from field name → StateBlockId.
  // ------------------------------------------------------------------

  const allProtectedFields = new Set<string>();
  const stateBlockIdByField = new Map<string, string>();

  if (protectAnalysis && protectAnalysis.views) {
    for (const [stateBlockId, dbTypeViews] of protectAnalysis.views) {
      if (dbTypeViews.tables) {
        for (const [, tableTypeView] of dbTypeViews.tables) {
          if (tableTypeView.protectedFields) {
            for (const fieldName of tableTypeView.protectedFields) {
              allProtectedFields.add(fieldName);
              stateBlockIdByField.set(fieldName, stateBlockId);
            }
          }
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Step 2: Build a global function index for transitive escalation.
  // ------------------------------------------------------------------
  const functionIndex = buildFunctionIndex(files);

  // ------------------------------------------------------------------
  // Step 2b: Build a set of function names imported from server-only
  // scrml: modules.
  // ------------------------------------------------------------------
  const importedServerFnNames = buildImportedServerFnNames(files);

  // ------------------------------------------------------------------
  // Step 3: First pass — collect all function nodes and compute DIRECT
  // escalation (no transitive resolution yet).
  // ------------------------------------------------------------------

  const analysisMap = new Map<string, AnalysisRecord>();

  for (const fileAST of files) {
    const filePath = fileAST.filePath;
    const fnNodes = collectFileFunctions(fileAST);

    // Collect the span.start values of functions inside worker bodies
    // (<program name="...">) so we can suppress E-ROUTE-001 for them.
    const workerBodyFnIds = collectWorkerBodyFunctionIds(fileAST);

    for (const fnNode of fnNodes) {
      const fnNodeId = makeFunctionNodeId(filePath, fnNode);

      // Trigger 4: explicit server annotation.
      const explicitTriggers: EscalationReason[] = [];
      if (fnNode.isServer === true) {
        explicitTriggers.push({
          kind: "explicit-annotation",
          span: fnNode.span,
        });
      }

      // Scan the function body for direct triggers and callees.
      // E-ROUTE-001 is suppressed for functions inside worker bodies.
      const body = Array.isArray(fnNode.body) ? fnNode.body : [];
      const isWorkerBody = workerBodyFnIds.has(fnNode.span.start);
      const { triggers: bodyTriggers, callees, warnings } = walkBodyForTriggers(
        body,
        allProtectedFields,
        stateBlockIdByField,
        filePath,
        isWorkerBody,
      );

      const directTriggers: EscalationReason[] = [...explicitTriggers, ...bodyTriggers];

      analysisMap.set(fnNodeId, {
        fnNodeId,
        filePath,
        fnNode,
        isPure: false,
        directTriggers,
        callees,
        warnings,
      });
    }
  }

  // ------------------------------------------------------------------
  // Step 4: Direct-only escalation — no transitive callee inheritance.
  // A function is server-escalated only by its own direct triggers:
  //   - explicit `server` annotation
  //   - ?{} SQL block in the function body
  //   - access to protect= fields
  //   - access to session object
  //   - access to server-only resources (Bun.file, Bun.env, fs.*, etc.)
  // Calling a server function is NOT a trigger. The caller stays client-side
  // and uses a fetch stub at codegen time (§12 escalation rules, RI spec header).
  // ------------------------------------------------------------------

  /**
   * Resolve escalation reasons for a function node ID.
   * Returns ONLY the function's own direct triggers — does not recurse into callees.
   * A function that calls server functions stays client-side and uses fetch stubs.
   * It can freely mutate reactive state (§12, E-RI-002 suppression rule).
   */
  function resolveEscalation(fnNodeId: string): EscalationReason[] {
    const record = analysisMap.get(fnNodeId);
    if (!record) return []; // External function — non-escalating.
    return [...record.directTriggers];
  }

  // ------------------------------------------------------------------
  // Step 5: Pre-resolve all directly server-escalated function IDs.
  // resolvedServerFnIds contains ONLY directly-escalated functions.
  // This set is used by CPS analysis to identify server calls within
  // client function bodies, enabling the server/client boundary split.
  // ------------------------------------------------------------------

  const escalationResults = new Map<string, { allReasons: EscalationReason[]; deduped: EscalationReason[] }>();
  const resolvedServerFnIds = new Set<string>();

  for (const [fnNodeId] of analysisMap) {
    const allReasons = resolveEscalation(fnNodeId);
    const deduped = deduplicateReasons(allReasons);
    escalationResults.set(fnNodeId, { allReasons, deduped });
    if (allReasons.length > 0) {
      resolvedServerFnIds.add(fnNodeId);
    }
  }

  // ------------------------------------------------------------------
  // Step 6: Finalize RouteMap entries, apply CPS analysis, collect errors.
  // ------------------------------------------------------------------

  for (const [fnNodeId, record] of analysisMap) {
    // Accumulate E-ROUTE-001 warnings (with severity propagated).
    for (const w of record.warnings) {
      const riErr = new RIError(w.code, w.message, w.span);
      if (w.severity) riErr.severity = w.severity;
      errors.push(riErr);
    }

    // §39.3: handle() escape hatch — treat as middleware boundary.
    if ((record.fnNode as any).isHandleEscapeHatch === true) {
      functions.set(fnNodeId, {
        functionNodeId: fnNodeId,
        boundary: "middleware",
        escalationReasons: [],
        generatedRouteName: null,
        explicitRoute: null,
        explicitMethod: null,
        isSSE: false,
        serverEntrySpan: null,
        cpsSplit: null,
      });
      continue;
    }

    const { allReasons, deduped } = escalationResults.get(fnNodeId)!;

    const isServer = allReasons.length > 0;
    const boundary: "client" | "server" = isServer ? "server" : "client";

    let cpsSplit: CPSSplit | null = null;

    if (isServer) {
      const body = Array.isArray(record.fnNode.body) ? record.fnNode.body : [];

      // §36: SSE generator functions — skip E-RI-002 and CPS analysis.
      if ((record.fnNode as any).isGenerator === true) {
        // Generator functions skip CPS and E-RI-002. cpsSplit remains null.
      } else {
        const reactiveAssignment = findReactiveAssignment(body);

        if (reactiveAssignment !== null) {
          const cpsResult = analyzeCPSEligibility(
            body,
            allProtectedFields,
            stateBlockIdByField,
            functionIndex,
            analysisMap,
            resolvedServerFnIds,
            importedServerFnNames,
          );

          if (cpsResult && cpsResult.eligible) {
            cpsSplit = {
              serverStmtIndices: cpsResult.serverStmtIndices,
              clientStmtIndices: cpsResult.clientStmtIndices,
              returnVarName: cpsResult.returnVarName,
            };
          } else {
            // CPS not applicable: fire E-RI-002 for ANY server-escalated function.
            errors.push(new RIError(
              "E-RI-002",
              `E-RI-002: Server-escalated function \`${record.fnNode.name ?? "<anonymous>"}\` ` +
              `assigns to a \`@\` reactive variable. Reactive state is client-side; server ` +
              `functions cannot mutate it directly. Move the reactive assignment to a client-side ` +
              `callback, or restructure the function so the reactive mutation occurs on the client.`,
              (reactiveAssignment as any).span ?? record.fnNode.span,
            ));
          }
        }
      }
    }

    // Build the FunctionRoute entry.
    const hasExplicitRoute = !!(record.fnNode as any).route;
    const generatedRouteName = isServer
      ? (hasExplicitRoute ? (record.fnNode as any).route : generateRouteName(record.fnNode.name ?? "anon"))
      : null;

    const serverEntrySpan = isServer ? record.fnNode.span : null;

    // §36: generator server functions are SSE endpoints (GET, text/event-stream)
    const isSSE = isServer && (record.fnNode as any).isGenerator === true;

    functions.set(fnNodeId, {
      functionNodeId: fnNodeId,
      boundary,
      escalationReasons: deduped,
      generatedRouteName,
      explicitRoute: hasExplicitRoute ? (record.fnNode as any).route : null,
      explicitMethod: isSSE ? "GET" : ((record.fnNode as any).method ?? null),
      isSSE,
      serverEntrySpan,
      cpsSplit,
    });
  }

  // ------------------------------------------------------------------
  // Step 7: Build page route tree from file paths (file-based routing).
  // ------------------------------------------------------------------

  const pages = buildPageRouteTree(files);

  // ------------------------------------------------------------------
  // Step 8: Collect auth middleware from <program auth="required"> across
  // all files.
  // ------------------------------------------------------------------

  const authMiddleware = new Map<string, AuthMiddleware>();

  // 8a: Explicit auth= from <program auth="required">
  for (const fileAST of files) {
    const authConfig = fileAST.authConfig ?? ((fileAST as any).ast ? (fileAST as any).ast.authConfig : null);
    if (!authConfig || authConfig.auth !== "required") continue;

    authMiddleware.set(fileAST.filePath, {
      filePath: fileAST.filePath,
      auth: authConfig.auth,
      loginRedirect: authConfig.loginRedirect ?? "/login",
      csrf: authConfig.csrf ?? "off",
      sessionExpiry: authConfig.sessionExpiry ?? "1h",
    });
  }

  // 8b: Auto-escalate auth for files with protect= fields
  if (protectAnalysis && protectAnalysis.views) {
    const filesWithProtectedFields = new Set<string>();
    for (const [stateBlockId] of protectAnalysis.views) {
      const filePath = stateBlockId.split("::")[0];
      const dbTypeViews = protectAnalysis.views.get(stateBlockId);
      if (dbTypeViews && dbTypeViews.tables) {
        for (const [, tableTypeView] of dbTypeViews.tables) {
          if (tableTypeView.protectedFields && tableTypeView.protectedFields.size > 0) {
            filesWithProtectedFields.add(filePath);
            break;
          }
        }
      }
    }

    for (const filePath of filesWithProtectedFields) {
      if (authMiddleware.has(filePath)) continue; // explicit auth= takes precedence
      authMiddleware.set(filePath, {
        filePath,
        auth: "required",
        loginRedirect: "/login",
        csrf: "auto",
        sessionExpiry: "1h",
        autoEscalated: true,
      });
      errors.push({
        code: "W-AUTH-001",
        message:
          `W-AUTH-001: File has protect= fields but no explicit auth= attribute. ` +
          `Auth middleware auto-injected (auth="required", csrf="auto"). ` +
          `Add <program auth="required"> to control auth settings explicitly.`,
        severity: "warning",
        filePath,
      });
    }
  }

  return {
    routeMap: { functions, pages, authMiddleware },
    errors,
  };
}

// ---------------------------------------------------------------------------
// File-based page routing
// ---------------------------------------------------------------------------

/**
 * Build a page route tree from file paths.
 *
 * Convention:
 *   - Files under a `routes/` directory are page routes.
 *   - `index.scrml` maps to the directory's path (e.g., routes/index.scrml → /).
 *   - `[param].scrml` maps to a dynamic segment (e.g., routes/users/[id].scrml → /users/:id).
 *   - `_layout.scrml` provides a shared layout wrapper for sibling routes.
 *   - `[...slug].scrml` is a catch-all route.
 *   - Files NOT under a `routes/` directory are treated as single-page apps (route = /).
 */
export function buildPageRouteTree(files: FileAST[]): Map<string, PageRoute> {
  const pages = new Map<string, PageRoute>();

  for (const fileAST of files) {
    const filePath = fileAST.filePath;

    const routesIdx = filePath.indexOf("/routes/");
    if (routesIdx === -1) {
      // Not under a routes/ directory — single-page app, mount at /
      pages.set(filePath, {
        filePath,
        urlPattern: "/",
        params: [],
        layoutFilePath: null,
        isCatchAll: false,
      });
      continue;
    }

    // Extract the relative path after routes/
    const relativePath = filePath.slice(routesIdx + "/routes/".length);

    // Skip _layout.scrml files — they are layout wrappers, not pages
    const fileName = relativePath.split("/").pop();
    if (fileName === "_layout.scrml") continue;

    // Convert file path to URL pattern
    const { urlPattern, params, isCatchAll } = filePathToUrlPattern(relativePath);

    // Look for a _layout.scrml in the same directory or ancestor directories
    const layoutFilePath = findLayoutFile(filePath, routesIdx);

    pages.set(filePath, {
      filePath,
      urlPattern,
      params,
      layoutFilePath,
      isCatchAll,
    });
  }

  return pages;
}

/**
 * Convert a relative file path (under routes/) to a URL pattern.
 *
 * Examples:
 *   "index.scrml"              → { urlPattern: "/", params: [], isCatchAll: false }
 *   "about.scrml"              → { urlPattern: "/about", params: [], isCatchAll: false }
 *   "users/[id].scrml"         → { urlPattern: "/users/:id", params: ["id"], isCatchAll: false }
 *   "users/index.scrml"        → { urlPattern: "/users", params: [], isCatchAll: false }
 *   "posts/[...slug].scrml"    → { urlPattern: "/posts/*slug", params: ["slug"], isCatchAll: true }
 */
function filePathToUrlPattern(relativePath: string): { urlPattern: string; params: string[]; isCatchAll: boolean } {
  // Remove .scrml extension
  const withoutExt = relativePath.replace(/\.scrml$/, "");

  // Split into segments
  const segments = withoutExt.split("/").filter(Boolean);

  const params: string[] = [];
  let isCatchAll = false;
  const urlSegments: string[] = [];

  for (const seg of segments) {
    // index at the end means the directory path itself
    if (seg === "index" && segments.indexOf(seg) === segments.length - 1) {
      continue;
    }

    // Catch-all: [...param]
    const catchAllMatch = seg.match(/^\[\.\.\.(\w+)\]$/);
    if (catchAllMatch) {
      params.push(catchAllMatch[1]);
      urlSegments.push(`*${catchAllMatch[1]}`);
      isCatchAll = true;
      continue;
    }

    // Dynamic segment: [param]
    const paramMatch = seg.match(/^\[(\w+)\]$/);
    if (paramMatch) {
      params.push(paramMatch[1]);
      urlSegments.push(`:${paramMatch[1]}`);
      continue;
    }

    // Static segment
    urlSegments.push(seg);
  }

  const urlPattern = "/" + urlSegments.join("/");

  return { urlPattern, params, isCatchAll };
}

/**
 * Find the nearest _layout.scrml file for a given page file.
 * Searches the same directory and ancestor directories up to the routes/ root.
 */
function findLayoutFile(filePath: string, routesIdx: number): string | null {
  const routesRoot = filePath.slice(0, routesIdx + "/routes/".length);
  let dir = filePath.slice(0, filePath.lastIndexOf("/"));

  while (dir.length >= routesRoot.length - 1) {
    const layoutPath = dir + "/_layout.scrml";
    // We cannot check the filesystem here (RI is a pure analysis pass).
    // Instead, we record the expected layout path.
    if (dir + "/" !== routesRoot || dir === routesRoot.slice(0, -1)) {
      return layoutPath;
    }
    // Move to parent directory
    const parentDir = dir.slice(0, dir.lastIndexOf("/"));
    if (parentDir === dir) break;
    dir = parentDir;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Deduplicate EscalationReason[] by kind + distinguishing field.
 * Preserves first occurrence of each unique reason.
 */
function deduplicateReasons(reasons: EscalationReason[]): EscalationReason[] {
  const seen = new Set<string>();
  const result: EscalationReason[] = [];
  for (const r of reasons) {
    let key: string;
    if (r.kind === "protected-field-access") {
      key = `pfa:${r.field}:${r.stateBlockId}`;
    } else if (r.kind === "server-only-resource") {
      key = `sor:${r.resourceType}`;
    } else if (r.kind === "explicit-annotation") {
      key = "ea";
    } else {
      key = JSON.stringify(r);
    }
    if (!seen.has(key)) {
      seen.add(key);
      result.push(r);
    }
  }
  return result;
}

/**
 * Produce a short human-readable description of the first escalation reason.
 * Used in E-RI-001 error messages.
 */
function describeFirstReason(reasons: EscalationReason[]): string {
  if (reasons.length === 0) return "unknown reason";
  const r = reasons[0];
  if (r.kind === "explicit-annotation") return "explicit `server` annotation";
  if (r.kind === "server-only-resource") return `server-only resource \`${r.resourceType}\``;
  if (r.kind === "protected-field-access") return `protected field access \`${r.field}\``;
  return (r as any).kind;
}
