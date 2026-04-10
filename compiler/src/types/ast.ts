/**
 * AST Node Type System for the scrml Compiler
 *
 * Discriminated union types for all AST nodes produced by the TAB
 * (Typed AST Builder) stage of the compiler pipeline.
 *
 * This file is the single source of truth for AST shape in TypeScript.
 * Every node carries a `kind` string literal discriminant and an `id`
 * (unique within a compilation unit) plus a `span` for source location.
 *
 * No runtime code lives here — types and interfaces only.
 */

// ---------------------------------------------------------------------------
// Source Location
// ---------------------------------------------------------------------------

/** Byte-level source span referencing the preprocessed source. */
export interface Span {
  /** Absolute file path of the source file. */
  file: string;
  /** Byte offset of the first character. */
  start: number;
  /** Byte offset one past the last character. */
  end: number;
  /** 1-based line number. */
  line: number;
  /** 1-based column number. */
  col: number;
}

// ---------------------------------------------------------------------------
// Attribute Value Types
// ---------------------------------------------------------------------------

/**
 * Attribute values on markup elements.
 * Discriminated by `kind`.
 */
export type AttrValue =
  | StringLiteralAttrValue
  | VariableRefAttrValue
  | CallRefAttrValue
  | ExprAttrValue
  | PropsBlockAttrValue
  | AbsentAttrValue;

export interface StringLiteralAttrValue {
  kind: "string-literal";
  value: string;
  span: Span;
}

export interface VariableRefAttrValue {
  kind: "variable-ref";
  name: string;
  span: Span;
}

export interface CallRefAttrValue {
  kind: "call-ref";
  name: string;
  args: string[];
  span: Span;
}

export interface ExprAttrValue {
  kind: "expr";
  raw: string;
  refs: string[];
  span: Span;
}

export interface PropsBlockAttrValue {
  kind: "props-block";
  propsDecl: unknown;
  span: Span;
}

export interface AbsentAttrValue {
  kind: "absent";
}

// ---------------------------------------------------------------------------
// Attribute Node
// ---------------------------------------------------------------------------

/** A single attribute on a markup element or state block. */
export interface AttrNode {
  name: string;
  value: AttrValue;
  span: Span;
}

// ---------------------------------------------------------------------------
// Typed Attribute Declaration (State Constructor Definitions, section 35.2)
// ---------------------------------------------------------------------------

/** A typed attribute declaration inside a state constructor definition. */
export interface TypedAttrDecl {
  /** Attribute name. */
  name: string;
  /** Raw type expression (e.g. "string", "number", "enum { A, B }"). */
  typeExpr: string;
  /** True if the type ends with `?` or has a default value. */
  optional: boolean;
  /** Default value expression if `= value` is present, or null. */
  defaultValue: string | null;
  span: Span;
}

// ---------------------------------------------------------------------------
// CSS Rule Types
// ---------------------------------------------------------------------------

/** Reactive reference inside a CSS value (e.g. `@spacing`). */
export interface CSSReactiveRef {
  /** Bare identifier without `@`. */
  name: string;
  /** Full expression string if part of an expression, null for simple refs. */
  expr: string | null;
}

/** A single CSS property declaration. */
export interface CSSDeclaration {
  prop: string;
  value: string;
  span: Span;
  /** Present when the value contains `@var` reactive references. */
  reactiveRefs?: CSSReactiveRef[];
  /** True when the value is an expression (not a simple @var reference). */
  isExpression?: boolean;
}

/** A CSS rule — either a bare property or a selector block with declarations. */
export type CSSRule = CSSPropertyRule | CSSSelectorRule;

export interface CSSPropertyRule {
  prop: string;
  value: string;
  span: Span;
  reactiveRefs?: CSSReactiveRef[];
  isExpression?: boolean;
}

export interface CSSSelectorRule {
  selector: string;
  declarations?: CSSDeclaration[];
  span: Span;
}

// ---------------------------------------------------------------------------
// Error Effect Arm (match arm in !{} blocks)
// ---------------------------------------------------------------------------

/** A single match arm in an error-effect block. */
export interface ErrorArm {
  /** Pattern: `"::TypeName"` or `"_"` (wildcard). */
  pattern: string;
  /** Binding variable name (e.g. `e`), or empty string if none. */
  binding: string;
  /** Raw handler expression string. */
  handler: string;
  span: Span;
}

// ---------------------------------------------------------------------------
// SQL Chained Call
// ---------------------------------------------------------------------------

/** A chained method call on a SQL block (e.g. `.run()`, `.all()`, `.get()`). */
export interface SQLChainedCall {
  method: string;
  args: string;
}

// ---------------------------------------------------------------------------
// Lift Expression Target
// ---------------------------------------------------------------------------

/**
 * The target of a `lift` expression.
 * Either an inline markup node or a raw expression string.
 */
export type LiftTarget =
  | { kind: "markup"; node: ASTNode }
  | { kind: "expr"; expr: string };

// ---------------------------------------------------------------------------
// AST Node Interfaces
// ---------------------------------------------------------------------------

/** Common fields shared by every AST node. */
interface BaseNode {
  /** Unique numeric ID within the compilation unit. */
  id: number;
  /** Source location span. */
  span: Span;
}

// -- Markup --

/** An HTML/component element: `<tag attrs>children</tag>`. */
export interface MarkupNode extends BaseNode {
  kind: "markup";
  /** Element tag name (e.g. "div", "Button", "program"). */
  tag: string;
  /** Parsed attributes. */
  attrs: AttrNode[];
  /** Child AST nodes. */
  children: ASTNode[];
  /** True for self-closing elements (`<br/>`). */
  selfClosing: boolean;
  /** Closer form from the block splitter. */
  closerForm: string;
  /** True if this is a component call site (uppercase tag name). */
  isComponent: boolean;
  // Auth/middleware fields added by buildAST when tag === "program":
  auth?: string;
  loginRedirect?: string;
  csrf?: string;
  sessionExpiry?: string;
}

// -- Text & Comment --

/** A raw text node. */
export interface TextNode extends BaseNode {
  kind: "text";
  /** The text content. */
  value: string;
}

/** An HTML comment node. */
export interface CommentNode extends BaseNode {
  kind: "comment";
  /** The comment content (without delimiters). */
  value: string;
}

// -- State --

/** A state instantiation block: `< statetype attrs>children</ statetype>`. */
export interface StateNode extends BaseNode {
  kind: "state";
  /** The state type name (e.g. "card", "user"). */
  stateType: string;
  /** Parsed attributes. */
  attrs: AttrNode[];
  /** Child AST nodes. */
  children: ASTNode[];
}

/**
 * A state constructor definition (section 35.2).
 * Declares a state type with typed attributes.
 */
export interface StateConstructorDefNode extends BaseNode {
  kind: "state-constructor-def";
  /** The state type name being defined. */
  stateType: string;
  /** Typed attribute declarations (e.g. `name(string)`, `age(number?)`). */
  typedAttrs: TypedAttrDecl[];
  /** Any non-typed attributes (metadata). */
  attrs: AttrNode[];
  /** Constructor body nodes. */
  children: ASTNode[];
}

// -- Logic --

/** A logic block: `${ ... }`. Contains parsed statements. */
export interface LogicNode extends BaseNode {
  kind: "logic";
  /** Parsed statements and declarations. */
  body: LogicStatement[];
  /** Import declarations hoisted from this block. */
  imports: ImportDeclNode[];
  /** Export declarations hoisted from this block. */
  exports: ExportDeclNode[];
  /** Type declarations hoisted from this block. */
  typeDecls: TypeDeclNode[];
  /** Component definitions hoisted from this block. */
  components: ComponentDefNode[];
}

// -- SQL --

/** A SQL block: `?{ query }.method(args)`. */
export interface SQLNode extends BaseNode {
  kind: "sql";
  /** The raw SQL query string. */
  query: string;
  /** Chained method calls (`.run()`, `.all()`, `.get()`). */
  chainedCalls: SQLChainedCall[];
}

// -- CSS Inline --

/** An inline CSS block: `#{ prop: value; ... }`. */
export interface CSSInlineNode extends BaseNode {
  kind: "css-inline";
  /** Parsed CSS rules. */
  rules: CSSRule[];
}

// -- Style Block --

/** A `<style>` block containing CSS. */
export interface StyleNode extends BaseNode {
  kind: "style";
  /** Parsed CSS rules (may be empty — detailed parsing deferred to children). */
  rules: CSSRule[];
  /** Child nodes (text/comment containing CSS content). */
  children: ASTNode[];
}

// -- Error Effect --

/** An error-effect block: `!{ | pattern binding -> handler }`. */
export interface ErrorEffectNode extends BaseNode {
  kind: "error-effect";
  /** Match arms. */
  arms: ErrorArm[];
}

// -- Meta --

/** A meta block: `^{ ... }`. Compile-time code execution. */
export interface MetaNode extends BaseNode {
  kind: "meta";
  /** Parsed statements (same grammar as logic blocks). */
  body: LogicStatement[];
  /** The context this meta block appears in (markup, state, logic, sql, css, error, meta). */
  parentContext: string;
}

// -- Variable Declarations --

/** A `let` declaration: `let name = expr`. */
export interface LetDeclNode extends BaseNode {
  kind: "let-decl";
  /** Variable name. */
  name: string;
  /** Initializer expression (raw string). */
  init: string;
  /** If-as-expression: `let a = if (cond) { lift val }`. */
  ifExpr?: IfExprNode;
}

/** A `const` declaration: `const name = expr`. */
export interface ConstDeclNode extends BaseNode {
  kind: "const-decl";
  /** Variable name. */
  name: string;
  /** Initializer expression (raw string). */
  init: string;
  /** If-as-expression: `const a = if (cond) { lift val }`. */
  ifExpr?: IfExprNode;
}

/**
 * A tilde declaration: bare `name = expr` (no keyword).
 * Declares a ~-typed must-use variable.
 */
export interface TildeDeclNode extends BaseNode {
  kind: "tilde-decl";
  /** Variable name. */
  name: string;
  /** Initializer expression (raw string). */
  init: string;
}

// -- Reactive Declarations --

/** A reactive declaration: `@name = expr`. */
export interface ReactiveDeclNode extends BaseNode {
  kind: "reactive-decl";
  /** Reactive variable name (without `@`). */
  name: string;
  /** Initializer expression (raw string). */
  init: string;
  /** True if declared with `@shared` modifier (section 37.4). */
  isShared?: boolean;
}

/** A derived reactive declaration: `const @name = expr`. */
export interface ReactiveDerivedDeclNode extends BaseNode {
  kind: "reactive-derived-decl";
  /** Derived variable name (without `@`). */
  name: string;
  /** Derivation expression (raw string). */
  init: string;
}

/** A debounced reactive declaration: `@debounced(N) name = expr`. */
export interface ReactiveDebouncedDeclNode extends BaseNode {
  kind: "reactive-debounced-decl";
  /** Variable name. */
  name: string;
  /** Initializer expression (raw string). */
  init: string;
  /** Debounce delay in milliseconds (default 300). */
  delay: number;
}

/**
 * A reactive nested assignment: `@obj.path.to.prop = value`.
 * Assigns to a nested property of a reactive variable.
 */
export interface ReactiveNestedAssignNode extends BaseNode {
  kind: "reactive-nested-assign";
  /** Root reactive variable name (without `@`). */
  target: string;
  /** Dot-separated path segments (e.g. ["path", "to", "prop"]). */
  path: string[];
  /** Value expression (raw string). */
  value: string;
}

/**
 * A reactive array mutation: `@arr.push(item)`, `@arr.splice(0, 1)`, etc.
 * Triggers reactive update after the mutation.
 */
export interface ReactiveArrayMutationNode extends BaseNode {
  kind: "reactive-array-mutation";
  /** Root reactive variable name (without `@`). */
  target: string;
  /** Array method name (push, pop, shift, unshift, splice, sort, reverse, fill). */
  method: string;
  /** Raw arguments string. */
  args: string;
}

/** An explicit reactive set: `@set(@obj, "path", value)`. Escape hatch. */
export interface ReactiveExplicitSetNode extends BaseNode {
  kind: "reactive-explicit-set";
  /** Raw arguments string. */
  args: string;
}

// -- Function Declaration --

/** A function declaration: `[server] function|fn name(params) [!] { body }`. */
export interface FunctionDeclNode extends BaseNode {
  kind: "function-decl";
  /** Function name. */
  name: string;
  /** Parameter list (raw strings). */
  params: string[];
  /** Function body statements. */
  body: LogicStatement[];
  /** Declaration style: "function" (full) or "fn" (shorthand). */
  fnKind: "function" | "fn";
  /** True if prefixed with `server` keyword. */
  isServer: boolean;
  /** True if declared as a generator function (`function*`). */
  isGenerator?: boolean;
  /** True if the function can fail (`!` suffix). */
  canFail: boolean;
  /** Error type name when `! -> ErrorType` is specified. */
  errorType?: string;
  /** Route path for server functions (e.g. "/api/users"). */
  route?: string;
  /** HTTP method for server functions (e.g. "GET", "POST"). */
  method?: string;
  /**
   * True if this is a handle() escape hatch function (section 39.3.1).
   * Recognized by: isServer && !isGenerator && name === "handle".
   */
  isHandleEscapeHatch?: boolean;
  /** State type scope for functions inside state constructor defs. */
  stateTypeScope?: string;
}

// -- Component Definition --

/**
 * A component definition: `const ComponentName = <element ...>`.
 * Recognized when `const` declaration name starts with uppercase
 * (outside of meta context).
 */
export interface ComponentDefNode extends BaseNode {
  kind: "component-def";
  /** Component name (PascalCase). */
  name: string;
  /** Raw expression (the component template). */
  raw: string;
}

// -- Control Flow --

/** An if/else-if/else chain: `if condition { consequent } else { alternate }`. */
export interface IfStmtNode extends BaseNode {
  kind: "if-stmt";
  /** Condition expression (raw string). */
  condition: string;
  /** Consequent branch statements. */
  consequent: LogicStatement[];
  /** Alternate branch (else/else-if chain), or null. */
  alternate: LogicStatement[] | null;
}

/** An if-as-expression: `const a = if (cond) { lift val }`. */
export interface IfExprNode extends BaseNode {
  kind: "if-expr";
  /** Condition expression (raw string). */
  condition: string;
  /** Consequent branch statements. */
  consequent: LogicStatement[];
  /** Alternate branch (else chain), or null. */
  alternate: LogicStatement[] | null;
}

/** A for loop: `for variable in iterable { body }`. */
export interface ForStmtNode extends BaseNode {
  kind: "for-stmt";
  /** Loop variable name. */
  variable: string;
  /** Iterable expression (raw string). */
  iterable: string;
  /** Loop body statements. */
  body: LogicStatement[];
}

/** A while loop: `while condition { body }`. */
export interface WhileStmtNode extends BaseNode {
  kind: "while-stmt";
  /** Condition expression (raw string). */
  condition: string;
  /** Loop body statements. */
  body: LogicStatement[];
}

/** A return statement: `return expr`. */
export interface ReturnStmtNode extends BaseNode {
  kind: "return-stmt";
  /** Return expression (raw string). */
  expr: string;
}

/** A throw statement: `throw ErrorType("message")`. */
export interface ThrowStmtNode extends BaseNode {
  kind: "throw-stmt";
  /** Throw expression (raw string). */
  expr: string;
}

/** A switch statement: `switch header { body }`. */
export interface SwitchStmtNode extends BaseNode {
  kind: "switch-stmt";
  /** Switch header expression (raw string). */
  header: string;
  /** Body statements. */
  body: LogicStatement[];
}

/** A try/catch/finally statement. */
export interface TryStmtNode extends BaseNode {
  kind: "try-stmt";
  /** Try header (usually empty). */
  header: string;
  /** Try body statements. */
  body: LogicStatement[];
  /** Catch clause, if present. */
  catchNode?: {
    header: string;
    body: LogicStatement[];
  };
  /** Finally clause, if present. */
  finallyNode?: {
    header: string;
    body: LogicStatement[];
  };
}

/** A match statement (pattern matching): `match header { body }`. */
export interface MatchStmtNode extends BaseNode {
  kind: "match-stmt";
  /** Match header expression (raw string). */
  header: string;
  /** Body statements (match arms). */
  body: LogicStatement[];
}

// -- Expressions --

/** A bare expression (fallback when no declaration keyword matches). */
export interface BareExprNode extends BaseNode {
  kind: "bare-expr";
  /** Raw expression string. */
  expr: string;
}

/**
 * A lift expression: `lift <markup>` or `lift expr`.
 * Lifts a value from a logic block into the surrounding markup context.
 */
export interface LiftExprNode extends BaseNode {
  kind: "lift-expr";
  /** The lifted target — either inline markup or an expression. */
  expr: LiftTarget;
}

/**
 * A fail expression: `fail EnumType::Variant(args)`.
 * Early return with a typed error variant.
 */
export interface FailExprNode extends BaseNode {
  kind: "fail-expr";
  /** Enum type name. */
  enumType: string;
  /** Variant name. */
  variant: string;
  /** Raw argument string. */
  args: string;
}

/**
 * A propagation expression: `let name = expr?` or `expr?`.
 * Propagates errors via the `?` suffix operator.
 */
export interface PropagateExprNode extends BaseNode {
  kind: "propagate-expr";
  /** Binding name for `let name = expr?`, or null for bare `expr?`. */
  binding: string | null;
  /** The expression being propagated (without trailing `?`). */
  expr: string;
}

/**
 * A guarded expression: an expression or statement followed by `!{ ... }` error handler.
 * Wraps the guarded node with error-handling arms.
 */
export interface GuardedExprNode extends BaseNode {
  kind: "guarded-expr";
  /** The node being guarded. */
  guardedNode: LogicStatement;
  /** Error handling match arms from the `!{ }` block. */
  arms: ErrorArm[];
}

// -- Module Declarations --

/**
 * An import declaration: `import { Name } from './path'` or `import Name from './path'`.
 */
export interface ImportDeclNode extends BaseNode {
  kind: "import-decl";
  /** Full raw import text. */
  raw: string;
  /** Imported names. */
  names: string[];
  /** Source module path, or null if parse failed. */
  source: string | null;
  /** True for default imports (`import Name from ...`). */
  isDefault: boolean;
}

/**
 * A use declaration: `use scrml:ui { Button, Card }`.
 * Imports from the scrml standard library or vendor packages.
 */
export interface UseDeclNode extends BaseNode {
  kind: "use-decl";
  /** Full raw use text. */
  raw: string;
  /** Imported names. */
  names: string[];
  /** Source package/module path, or null. */
  source: string | null;
}

/**
 * An export declaration: `export function|const|let|type Name ...`
 * or re-export: `export { Name } from './path'`.
 */
export interface ExportDeclNode extends BaseNode {
  kind: "export-decl";
  /** Full raw export text. */
  raw: string;
  /** Exported name(s), or null. */
  exportedName: string | null;
  /** Export kind: "type", "function", "fn", "const", "let", "re-export", or null. */
  exportKind: string | null;
  /** Re-export source path, or null. */
  reExportSource: string | null;
}

/**
 * A type declaration: `type Name:kind = { ... }`.
 */
export interface TypeDeclNode extends BaseNode {
  kind: "type-decl";
  /** Type name. */
  name: string;
  /** Type kind modifier (e.g. "enum", "struct"), or empty string. */
  typeKind: string;
  /** Raw type body expression. */
  raw: string;
}

// -- Transaction --

/** A transaction block: `transaction { body }`. Wraps SQL operations in a transaction. */
export interface TransactionBlockNode extends BaseNode {
  kind: "transaction-block";
  /** Transaction body statements. */
  body: LogicStatement[];
}

// -- Built-in Effects & Utilities --

/** A cleanup registration: `cleanup(() => { ... })`. Registers a cleanup callback. */
export interface CleanupRegistrationNode extends BaseNode {
  kind: "cleanup-registration";
  /** Raw callback expression string. */
  callback: string;
}

/**
 * A reactive when-effect: `when @var changes { body }`.
 * Runs the body whenever the watched reactive variables change.
 */
export interface WhenEffectNode extends BaseNode {
  kind: "when-effect";
  /** Reactive variable names being watched (without `@`). */
  dependencies: string[];
  /** Raw body expression string. */
  bodyRaw: string;
}

/**
 * §4.12.4: Worker message handler: `when message(binding) { body }`.
 * Fires when the worker receives a postMessage from the parent.
 */
export interface WhenMessageNode extends BaseNode {
  kind: "when-message";
  /** The data parameter binding name. */
  binding: string;
  /** Raw body expression string. */
  bodyRaw: string;
}

/** An upload call: `upload(file, url)`. Built-in file upload utility. */
export interface UploadCallNode extends BaseNode {
  kind: "upload-call";
  /** File expression (raw string). */
  file: string;
  /** URL expression (raw string). */
  url: string;
}

/** A debounce call: `debounce(fn, ms)`. Built-in debounce utility. */
export interface DebounceCallNode extends BaseNode {
  kind: "debounce-call";
  /** Function expression (raw string). */
  fn: string;
  /** Delay in milliseconds. */
  delay: number;
}

/** A throttle call: `throttle(fn, ms)`. Built-in throttle utility. */
export interface ThrottleCallNode extends BaseNode {
  kind: "throttle-call";
  /** Function expression (raw string). */
  fn: string;
  /** Delay in milliseconds. */
  delay: number;
}

// ---------------------------------------------------------------------------
// Discriminated Unions
// ---------------------------------------------------------------------------

/**
 * Any statement that can appear inside a logic or meta block body.
 * This is the union of all declaration, control-flow, and expression nodes.
 */
export type LogicStatement =
  | LetDeclNode
  | ConstDeclNode
  | TildeDeclNode
  | ReactiveDeclNode
  | ReactiveDerivedDeclNode
  | ReactiveDebouncedDeclNode
  | ReactiveNestedAssignNode
  | ReactiveArrayMutationNode
  | ReactiveExplicitSetNode
  | FunctionDeclNode
  | ComponentDefNode
  | IfStmtNode
  | IfExprNode
  | ForStmtNode
  | WhileStmtNode
  | ReturnStmtNode
  | ThrowStmtNode
  | SwitchStmtNode
  | TryStmtNode
  | MatchStmtNode
  | BareExprNode
  | LiftExprNode
  | FailExprNode
  | PropagateExprNode
  | GuardedExprNode
  | ImportDeclNode
  | UseDeclNode
  | ExportDeclNode
  | TypeDeclNode
  | TransactionBlockNode
  | CleanupRegistrationNode
  | WhenEffectNode
  | WhenMessageNode
  | UploadCallNode
  | DebounceCallNode
  | ThrottleCallNode
  // Block-level nodes can appear inside logic bodies via BLOCK_REF:
  | MarkupNode
  | SQLNode
  | CSSInlineNode
  | MetaNode
  | ErrorEffectNode;

/**
 * Any AST node that can appear at the top level of a file
 * or as a child of a markup/state element.
 */
export type ASTNode =
  | MarkupNode
  | TextNode
  | CommentNode
  | StateNode
  | StateConstructorDefNode
  | LogicNode
  | SQLNode
  | CSSInlineNode
  | StyleNode
  | ErrorEffectNode
  | MetaNode
  | LogicStatement;

/**
 * The `kind` string literal for any AST node.
 * Useful for exhaustive switch statements.
 */
export type ASTNodeKind = ASTNode["kind"];

// ---------------------------------------------------------------------------
// Auth & Middleware Configuration
// ---------------------------------------------------------------------------

/** Authentication configuration extracted from `<program>` attributes. */
export interface AuthConfig {
  /** Auth mode (e.g. "required", "optional"). */
  auth: string;
  /** Redirect path for unauthenticated users. */
  loginRedirect: string;
  /** CSRF protection mode (e.g. "auto", "on", "off"). */
  csrf: string;
  /** Session expiry duration string (e.g. "1h", "2h"). */
  sessionExpiry: string;
}

/** Middleware configuration extracted from `<program>` attributes. */
export interface MiddlewareConfig {
  /** CORS origin pattern (e.g. "*"). */
  cors: string | null;
  /** Logging mode (e.g. "structured"). */
  log: string | null;
  /** CSRF protection mode. */
  csrf: string | null;
  /** Rate limit pattern (e.g. "100/min"). */
  ratelimit: string | null;
  /** Security headers mode (e.g. "strict"). */
  headers: string | null;
}

// ---------------------------------------------------------------------------
// File AST (top-level output of the TAB stage)
// ---------------------------------------------------------------------------

/**
 * The complete AST for a single scrml source file.
 * Produced by `buildAST()` / `runTAB()`.
 */
export interface FileAST {
  /** Absolute path of the source file. */
  filePath: string;
  /** Top-level AST nodes. */
  nodes: ASTNode[];
  /** All import declarations hoisted from logic blocks. */
  imports: ImportDeclNode[];
  /** All export declarations hoisted from logic blocks. */
  exports: ExportDeclNode[];
  /** All component definitions hoisted from logic blocks. */
  components: ComponentDefNode[];
  /** All type declarations hoisted from logic blocks. */
  typeDecls: TypeDeclNode[];
  /** Span table: maps node ID to its source span. */
  spans: Record<number, Span>;
  /** True if the file has a `<program>` root element. */
  hasProgramRoot: boolean;
  /** Auth configuration from `<program>` attributes, or null. */
  authConfig: AuthConfig | null;
  /** Middleware configuration from `<program>` attributes, or null. */
  middlewareConfig: MiddlewareConfig | null;
}

// ---------------------------------------------------------------------------
// TAB Output (full pipeline stage result)
// ---------------------------------------------------------------------------

/** Output of the TAB (Typed AST Builder) pipeline stage. */
export interface TABOutput {
  /** Absolute path of the source file. */
  filePath: string;
  /** The constructed FileAST. */
  ast: FileAST;
  /** Errors and warnings encountered during AST construction. */
  errors: TABErrorInfo[];
}

/** Serializable representation of a TAB error (mirrors the TABError class shape). */
export interface TABErrorInfo {
  /** Error code (e.g. "E-ATTR-002", "W-PROGRAM-001"). */
  code: string;
  /** Human-readable error message. */
  message: string;
  /** Source location where the error occurred. */
  tabSpan: Span;
  /** Severity level (defaults to "error"; "warning" for W- codes). */
  severity?: "error" | "warning";
}
