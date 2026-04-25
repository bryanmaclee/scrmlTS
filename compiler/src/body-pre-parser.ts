/**
 * Body Pre-Parser — Stage 3.5 of the scrml compiler pipeline (BPP).
 *
 * Runs after TAB (Stage 3) and before PA (Stage 4). For every FunctionDecl,
 * PureDecl, and fn-shorthand node in every FileAST, BPP checks whether the
 * body is a single BareExpr wrapper (the TAB deferred-body pattern). If it
 * is, BPP tokenizes the raw body string and parses it into a full LogicNode[]
 * tree, replacing the BareExpr array in place.
 *
 * Input contract:
 *   { filePath: string, ast: FileAST, errors: TABErrorInfo[] }
 *   — errors must be empty; BPP does not run on files with TAB errors.
 *
 * Output contract:
 *   { filePath: string, ast: FileAST, errors: BPPError[] }
 *   — no BareExpr appears in any FunctionDecl/PureDecl body position.
 *   — top-level BareExpr expression statements in LogicBlock.body are left untouched.
 *
 * Error codes:
 *   E-BPP-001 — parse failure in a function/fn body
 *
 * Performance budget: <= 10 ms per file.
 * Parallelism: per-file — fully parallel across Bun workers.
 */

import { tokenizeLogic } from "./tokenizer.ts";
import { parseLogicBody } from "./ast-builder.js";
import { emitStringFromTree } from "./expression-parser.ts";
import type {
  Span,
  ExprNode,
  FileAST,
  ASTNode,
  LogicStatement,
  FunctionDeclNode,
  BareExprNode,
  TABErrorInfo,
} from "./types/ast.ts";

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/** A BPP error produced when a function body cannot be parsed. */
export interface BPPError {
  code: string;
  message: string;
  span: Span;
}

/**
 * Create a BPPError value object.
 */
function makeBPPError(code: string, message: string, span: Span): BPPError {
  return { code, message, span };
}

// ---------------------------------------------------------------------------
// Node ID counter
// ---------------------------------------------------------------------------

/** Mutable counter for assigning unique node IDs. */
interface NodeCounter {
  next: number;
}

// ---------------------------------------------------------------------------
// BPP stage input/output shapes
// ---------------------------------------------------------------------------

/** A single file's record as it flows into BPP from the CE/TAB stage. */
export interface BPPFileInput {
  filePath: string;
  ast: FileAST;
  errors: TABErrorInfo[];
}

/** A single file's record output from BPP. */
export interface BPPFileOutput {
  filePath: string;
  ast: FileAST;
  errors: BPPError[];
}

/** Input shape for the multi-file pipeline entry point `runBPP`. */
export interface BPPInput {
  files: BPPFileInput[];
}

/** Output shape for the multi-file pipeline entry point `runBPP`. */
export interface BPPOutput {
  files: BPPFileOutput[];
  errors: BPPError[];
}

// ---------------------------------------------------------------------------
// Max node ID walker
// ---------------------------------------------------------------------------

/**
 * Walk an AST node tree and return the highest `id` found.
 * Used to initialize the BPP node-ID counter so new nodes do not collide
 * with IDs assigned by TAB.
 */
function findMaxId(nodes: ASTNode[]): number {
  let max = 0;

  function visit(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (typeof n.id === "number" && n.id > max) max = n.id;
    for (const key of Object.keys(n)) {
      if (key === "span") continue;
      const val = n[key];
      if (Array.isArray(val)) {
        for (const child of val) visit(child);
      } else if (val && typeof val === "object") {
        visit(val);
      }
    }
  }

  for (const node of nodes) visit(node);
  return max;
}

// ---------------------------------------------------------------------------
// BPP transform — depth-first AST walk
// ---------------------------------------------------------------------------

/**
 * Attempt to parse a single BareExpr body into a LogicStatement[] tree.
 *
 * Returns { nodes: LogicStatement[], parseErrors: TABErrorInfo[] }.
 * If parseErrors is non-empty, the body string is malformed; the caller
 * should emit E-BPP-001 and leave the body unchanged.
 */
function parseBody(
  rawBody: string,
  bodySpan: Span,
  filePath: string,
  counter: NodeCounter
): { nodes: LogicStatement[]; parseErrors: TABErrorInfo[] } {
  const parseErrors: TABErrorInfo[] = [];

  // tokenizeLogic expects: content, baseOffset, baseLine, baseCol, children
  // The BareExpr span carries the source position of the body content.
  const tokens = tokenizeLogic(
    rawBody,
    bodySpan.start,
    bodySpan.line,
    bodySpan.col,
    [] // no block-splitter children — the body was already extracted as a raw string
  );

  // parseLogicBody expects: tokens, filePath, childBlocks, parentBlock, counter, errors, blockContext
  // parentBlock.type is accessed only when a BLOCK_REF token is encountered.
  // Since children is [], no BLOCK_REF tokens are produced, so parentBlock.type is never read.
  // We pass { type: "logic" } as a safe sentinel.
  const nodes: LogicStatement[] = parseLogicBody(
    tokens,
    filePath,
    [],                  // childBlocks
    { type: "logic" },  // parentBlock sentinel
    counter,
    parseErrors,
    "logic"              // blockContext
  );

  return { nodes, parseErrors };
}

/**
 * Walk a LogicStatement[] body and recursively apply BPP to any nested
 * function-decl nodes found within it.
 *
 * Mutates body arrays in place on matched nodes.
 */
function walkBody(
  bodyNodes: LogicStatement[],
  filePath: string,
  counter: NodeCounter,
  errors: BPPError[]
): void {
  for (const node of bodyNodes) {
    if (!node || typeof node !== "object") continue;

    if (node.kind === "function-decl") {
      processFunctionNode(node, filePath, counter, errors);
    } else if ("body" in node && Array.isArray((node as { body?: unknown }).body)) {
      // Other node kinds that carry a body sub-array (e.g., future constructs)
      walkBody((node as { body: LogicStatement[] }).body, filePath, counter, errors);
    }
  }
}

/**
 * Process a single function-decl node.
 *
 * If its body is the TAB deferred pattern (single BareExpr), parse it.
 * Recurse into the parsed (or already-parsed) body for nested functions.
 */
function processFunctionNode(
  node: FunctionDeclNode,
  filePath: string,
  counter: NodeCounter,
  errors: BPPError[]
): void {
  const body = node.body;

  // Check for the TAB deferred pattern: exactly one BareExpr node in the body array
  // Phase 4d Step 8: BareExprNode.expr TS field deleted — read via (any) for runtime fallback
  if (
    Array.isArray(body) &&
    body.length === 1 &&
    body[0].kind === "bare-expr" &&
    (typeof (body[0] as any).expr === "string" || (body[0] as BareExprNode).exprNode != null)
  ) {
    const bareExprNode = body[0] as BareExprNode;
    const rawBody = bareExprNode.exprNode
      ? emitStringFromTree(bareExprNode.exprNode as ExprNode)
      : ((bareExprNode as any).expr ?? "");
    const bodySpan = bareExprNode.span;

    const { nodes: parsedNodes, parseErrors } = parseBody(rawBody, bodySpan, filePath, counter);

    if (parseErrors.length > 0) {
      // Parse failure — emit E-BPP-001 and leave the body as the original BareExpr
      // (downstream stages will treat this as a hard error)
      errors.push(makeBPPError(
        "E-BPP-001",
        `E-BPP-001: Function body of \`${node.name || "(anonymous)"}\` could not be parsed. ` +
        `Parse error: ` +
        parseErrors.map((e) => (e as { message?: string }).message || String(e)).join("; "),
        bodySpan,
      ));
      // Body is left as-is (the single BareExpr wrapper remains)
      return;
    }

    // Replace the single-BareExpr body with the fully parsed LogicStatement[]
    node.body = parsedNodes;

    // Recurse into the newly parsed body for nested function declarations
    walkBody(node.body, filePath, counter, errors);
  } else {
    // Body is already parsed (not the TAB deferred pattern) — recurse as-is
    if (Array.isArray(body)) {
      walkBody(body, filePath, counter, errors);
    }
  }
}

/**
 * Walk all top-level AST nodes in a FileAST and apply BPP to function
 * declarations wherever they appear.
 *
 * Top-level BareExpr nodes in LogicBlock.body (expression statements) are
 * NOT modified — only function body positions are processed.
 */
function walkASTNodes(
  astNodes: ASTNode[],
  filePath: string,
  counter: NodeCounter,
  errors: BPPError[]
): void {
  for (const node of astNodes) {
    if (!node || typeof node !== "object") continue;

    switch (node.kind) {
      case "logic":
        // Walk the logic block body for function declarations.
        // Top-level BareExpr nodes in body are left untouched — only
        // function-decl / pure-decl body positions are targets.
        if (Array.isArray(node.body)) {
          for (const bodyNode of node.body) {
            if (bodyNode && bodyNode.kind === "function-decl") {
              processFunctionNode(bodyNode, filePath, counter, errors);
            }
          }
        }
        break;

      case "markup":
      case "state":
        // Recurse into markup/state children (they may contain logic blocks)
        if (Array.isArray(node.children)) {
          walkASTNodes(node.children, filePath, counter, errors);
        }
        break;

      case "meta":
        // Meta block body may contain function declarations
        if (Array.isArray(node.body)) {
          for (const bodyNode of node.body) {
            if (bodyNode && bodyNode.kind === "function-decl") {
              processFunctionNode(bodyNode, filePath, counter, errors);
            }
          }
        }
        break;

      default:
        // text, comment, sql, css-inline, style, error-effect — no function bodies
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

/**
 * Run BPP on a single TAB output record.
 *
 * BPP does not run if TAB returned errors (per the input contract). In that
 * case the file is returned unchanged with an empty BPP error list.
 */
export function runBPPFile(tabOutput: BPPFileInput): BPPFileOutput {
  const { filePath, ast, errors: tabErrors } = tabOutput;

  // Input contract: BPP does not run if TAB produced errors
  if (tabErrors && tabErrors.length > 0) {
    return { filePath, ast, errors: [] };
  }

  const bppErrors: BPPError[] = [];

  // Initialize the node-ID counter from the maximum ID already assigned by TAB
  // so that BPP-generated node IDs do not collide with TAB-generated IDs.
  const maxExistingId = findMaxId(ast.nodes || []);
  const counter: NodeCounter = { next: maxExistingId };

  // Walk the AST and process all function declaration bodies
  walkASTNodes(ast.nodes || [], filePath, counter, bppErrors);

  // The AST is mutated in place; return the same reference
  return { filePath, ast, errors: bppErrors };
}

/**
 * Pipeline-contract entry point. Takes the multi-file form used by the
 * pipeline runner.
 */
export function runBPP(input: BPPInput): BPPOutput {
  const processedFiles = (input.files || []).map(runBPPFile);

  // Aggregate all per-file errors into a top-level errors array for
  // pipeline consumers that check errors at the project level.
  const allErrors = processedFiles.flatMap((f) => f.errors);

  return { files: processedFiles, errors: allErrors };
}
