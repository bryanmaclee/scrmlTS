/**
 * @module codegen/ir
 *
 * CG Intermediate Representation (IR) — plain-object data types that sit
 * between AST analysis and string emission. Emitters receive IR slices
 * rather than raw AST nodes, making the contract explicit and testable.
 *
 * Factory functions (not classes) — each returns a typed shape:
 *   - createHtmlIR()   → HtmlIR
 *   - createCssIR()    → CssIR
 *   - createServerIR() → ServerIR
 *   - createClientIR() → ClientIR
 *   - createFileIR(filePath) → FileIR  (top-level container)
 *   - createTestIR()   → TestIR
 */

// ---------------------------------------------------------------------------
// IR interfaces
// ---------------------------------------------------------------------------

/** HTML output container: string fragments joined with "". */
export interface HtmlIR {
  parts: string[];
}

/** CSS output container: user-authored CSS plus Tailwind utilities. */
export interface CssIR {
  userCss: string;
  tailwindCss: string;
}

/** Server JS output container: lines joined with "\n". */
export interface ServerIR {
  lines: string[];
}

/** Client JS output container: lines joined with "\n". */
export interface ClientIR {
  lines: string[];
}

/** Top-level IR for a single compiled .scrml file. */
export interface FileIR {
  filePath: string;
  html: HtmlIR;
  css: CssIR;
  server: ServerIR;
  client: ClientIR;
}

// ---------------------------------------------------------------------------
// HtmlIR
// ---------------------------------------------------------------------------

/**
 * Create an HtmlIR container.
 * parts[] are string fragments to be joined with "".
 */
export function createHtmlIR(): HtmlIR {
  return { parts: [] };
}

// ---------------------------------------------------------------------------
// CssIR
// ---------------------------------------------------------------------------

/**
 * Create a CssIR container.
 */
export function createCssIR(): CssIR {
  return { userCss: "", tailwindCss: "" };
}

// ---------------------------------------------------------------------------
// ServerIR
// ---------------------------------------------------------------------------

/**
 * Create a ServerIR container.
 * lines[] are the emitted JS lines for the server module.
 */
export function createServerIR(): ServerIR {
  return { lines: [] };
}

// ---------------------------------------------------------------------------
// ClientIR
// ---------------------------------------------------------------------------

/**
 * Create a ClientIR container.
 * lines[] are the emitted JS lines for the client module.
 */
export function createClientIR(): ClientIR {
  return { lines: [] };
}

// ---------------------------------------------------------------------------
// FileIR
// ---------------------------------------------------------------------------

/**
 * Create a FileIR — the top-level IR for a single compiled file.
 *
 * @param filePath — the source .scrml file path
 */
export function createFileIR(filePath: string): FileIR {
  return {
    filePath,
    html: createHtmlIR(),
    css: createCssIR(),
    server: createServerIR(),
    client: createClientIR(),
  };
}

// ---------------------------------------------------------------------------
// TestIR — ~{} inline test context IR types
// ---------------------------------------------------------------------------

/**
 * A single assertion in a test case.
 *
 * The assert statement `assert a == b` is split into:
 *   - raw: "a == b"
 *   - op: "=="
 *   - lhs: "a"
 *   - rhs: "b"
 *
 * For `assert expr` (no comparison), op/lhs/rhs are null and raw is the full expr.
 */
export interface AssertStmt {
  /** Full raw expression string after `assert` keyword. */
  raw: string;
  /** Comparison operator: "==", "===", "!=", "!==", ">", ">=", "<", "<=" or null. */
  op: string | null;
  /** LHS expression string (when op is present). */
  lhs: string | null;
  /** RHS expression string (when op is present). */
  rhs: string | null;
}

/**
 * A single test case inside a ~{} block.
 *
 * Produced by `test "name" { body }` syntax.
 */
export interface TestCase {
  /** Test name from `test "name" { }` syntax. */
  name: string;
  /** Source line number of the `test` keyword. */
  line: number;
  /** Raw statement strings collected from the test body (before rewrite). */
  body: string[];
  /** Extracted assert statements from the test body. */
  asserts: AssertStmt[];
}

/**
 * A complete ~{} test block — corresponds to one ~{ ... } source block.
 *
 * A test group may contain multiple test cases. If no `test "name" { }` sub-blocks
 * are present, the group's body statements form an implicit single test case.
 */
export interface TestGroup {
  /** Optional group name from the first string literal in ~{}. */
  name: string | null;
  /** Source line number of the ~{ opener. */
  line: number;
  /** Named test cases from `test "name" { body }` sub-blocks. */
  tests: TestCase[];
  /** Raw statement strings from `before { }` block (if present). */
  before: string[] | null;
  /** Raw statement strings from `after { }` block (if present). */
  after: string[] | null;
}

/**
 * TestIR container for a file's test blocks.
 *
 * Collected from all ~{} nodes in the file AST during the analysis pass.
 * Passed to generateTestJs() in emit-test.ts.
 */
export interface TestIR {
  groups: TestGroup[];
}

/**
 * Create a TestIR container.
 */
export function createTestIR(): TestIR {
  return { groups: [] };
}
