/**
 * Component Expander — Stage 3.2 of the scrml compiler pipeline (CE).
 *
 * Runs after TAB (Stage 3) and Module Resolution, before BPP (Stage 3.5).
 * For each file, builds a component registry from `component-def` nodes
 * in `ast.components`, then replaces all `isComponent: true` markup nodes
 * with expanded copies of the component's root element.
 *
 * Phase 1 scope:
 *   - Same-file resolution only (no cross-file imports)
 *   - Simple prop passing: caller attrs become named identifiers in component body
 *   - Children flow to `${children}` placeholder only
 *   - No typed props validation
 *   - No slot system
 *
 * Input contract:
 *   { filePath: string, ast: FileAST, errors: TABError[] }
 *   — same shape as TAB output and BPP input
 *
 * Output contract:
 *   { filePath: string, ast: FileAST, errors: CEError[] }
 *   — `component-def` nodes are consumed from ast.components and ast.nodes (removed)
 *   — `isComponent: true` markup nodes are replaced by expanded HTML markup nodes
 *   — No node at any depth of the AST retains kind === "component-def"
 *   — No markup node with isComponent: true remains (resolved ones are expanded;
 *     unresolved ones produce E-COMPONENT-020 and are left in place as-is)
 *
 * Error codes:
 *   E-COMPONENT-020 — component reference not found in file scope
 *   E-COMPONENT-021 — component body failed to re-parse (malformed component definition)
 *
 * Background on component-def.raw format:
 *   The `raw` field in a component-def node is produced by `collectExpr()` in the
 *   TAB logic parser. It is a space-joined sequence of logic tokenizer tokens, e.g.:
 *     `< div class = "card" / >`  (self-closing)
 *     `< div class = "card" >`   (block-form)
 *   The logic tokenizer treats `<` as a PUNCT token, so there is always a space
 *   between `<` and the tag name. Before re-parsing, this must be normalized
 *   back to valid scrml markup source.
 *
 * Performance budget: <= 5 ms per file.
 * Parallelism: per-file — fully parallel across Bun workers.
 */

import { splitBlocks } from "./block-splitter.js";
import { buildAST } from "./ast-builder.js";
import type {
  Span,
  FileAST,
  ASTNode,
  AttrNode,
  AttrValue,
  MarkupNode,
  LogicNode,
  ComponentDefNode,
  ImportDeclNode,
  TABErrorInfo,
} from "./types/ast.ts";

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/** A CE error produced during component expansion. */
export interface CEError {
  code: string;
  message: string;
  span: Span;
  severity?: string;
}

/**
 * Create a CEError value object.
 */
function makeCEError(
  code: string,
  message: string,
  span: Span,
  severity: string = "error"
): CEError {
  return { code, message, span, severity };
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** A single prop declaration inside a < props> block. */
interface PropDecl {
  name: string;
  type: string;
  optional: boolean;
  default: string | null;
  bindable: boolean;
  isSnippet: boolean;              // §14.9 — true when type is snippet/snippet?/snippet(...)
  snippetParamType: string | null; // §14.9 — raw type string, e.g. "Tab" in snippet(tab: Tab)
}

/** Mutable counter for assigning unique node IDs. */
interface NodeCounter {
  next: number;
}

/** An entry in the component registry built from component-def nodes. */
interface RegistryEntry {
  nodes: MarkupNode[];
  defSpan: Span;
  propsDecl: PropDecl[] | null;
  defChildren: ASTNode[];
  snippetProps: Map<string, PropDecl>;  // §14.9 — snippet-typed props
}

/**
 * A component-def node as it appears at runtime, which carries additional
 * fields set by ast-builder.js beyond the base ComponentDefNode interface.
 */
interface ExtendedComponentDefNode extends ComponentDefNode {
  /** Sibling AST nodes that are part of the component body (CSS, logic, etc.). */
  defChildren?: ASTNode[];
}

/**
 * An import node that may carry a `specifiers` array (alternate shape from
 * some import paths) in addition to the standard `names` array.
 */
type ImportWithSpecifiers = ImportDeclNode & {
  specifiers?: Array<{ imported: string; local: string }>;
};

/** Per-component export info stored in the export registry. */
interface ExportInfo {
  isComponent: boolean;
}

/** Cross-file export registry: source-path → (name → ExportInfo). */
type ExportRegistry = Map<string, Map<string, ExportInfo>>;

/** A TAB output record keyed by file path, used for cross-file lookups. */
interface TABFileRecord {
  ast: FileAST | null;
}

/** Map of file path → TAB output record. */
type FileASTMap = Map<string, TABFileRecord>;

// ---------------------------------------------------------------------------
// CE stage input/output shapes
// ---------------------------------------------------------------------------

/** A single file's record as it flows into CE. */
export interface CEFileInput {
  filePath: string;
  ast: FileAST;
  errors: TABErrorInfo[];
}

/** A single file's record output from CE. */
export interface CEFileOutput {
  filePath: string;
  ast: FileAST;
  errors: CEError[];
}

/** Input shape for the multi-file pipeline entry point `runCE`. */
export interface CEInput {
  files: CEFileInput[];
  exportRegistry?: ExportRegistry;
  fileASTMap?: FileASTMap;
}

/** Output shape for the multi-file pipeline entry point `runCE`. */
export interface CEOutput {
  files: CEFileOutput[];
  errors: CEError[];
}

// Primitive types allowed for bind: props (§15.11.1)
const BIND_PROP_PRIMITIVE_TYPES: Set<string> = new Set(["string", "number", "boolean"]);

// Detect function-typed prop: type expression contains '=>'
function isFunctionType(typeStr: unknown): boolean {
  return typeof typeStr === "string" && (typeStr.includes("=>") || typeStr.trim().startsWith("("));
}

// ---------------------------------------------------------------------------
// Node ID counter helper
// ---------------------------------------------------------------------------

/**
 * Walk an AST node tree and return the highest `id` found.
 * Used to initialize the CE node-ID counter so new nodes do not collide
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
// Raw normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a tokenized `raw` string from component-def back to parseable
 * scrml markup source.
 *
 * The raw field is a space-joined sequence of logic tokenizer tokens. The logic
 * tokenizer treats `<` as a PUNCT character, so the format is:
 *   `< tagname attr1 = "val1" attr2 / >`  (self-closing)
 *   `< tagname attr1 = "val1" attr2 >`    (block-form)
 *
 * After normalization:
 *   `<tagname attr1="val1" attr2/>`  (self-closing)
 *   `<tagname attr1="val1" attr2>`   (block-form)
 */
function normalizeTokenizedRaw(raw: string): string {
  let s = raw.trim();

  // Step 1a: Normalize tokenized closing tags: "< / ident >" → "</ident>"
  //   The logic tokenizer produces `<`, `/`, `ident`, `>` as separate tokens,
  //   so closing tags appear as "< / div >" (with spaces) in the raw.
  //   Must be done before step 1 so the `<` is not misidentified as an opener.
  s = s.replace(/< \/ ([A-Za-z][A-Za-z0-9_-]*) >/g, "</$1>");

  // Step 1: Remove space between `<` and the tag name (applied globally)
  //   "< tagname" → "<tagname"
  //   The logic tokenizer produces `< tagname` with a space for every opening tag.
  //   Changed from anchored /^<\s+/ to global /< ([A-Za-z])/g to handle nested tags.
  s = s.replace(/< ([A-Za-z])/g, "<$1");

  // Step 2: Handle self-closing closer "/ >" at end → "/>"
  //   The logic tokenizer produces `/` and `>` as separate tokens,
  //   so they appear as "/ >" (with spaces) in the raw.
  s = s.replace(/\s+\/\s+>(\s*)$/, "/>");
  s = s.replace(/\s+\/>\s*$/, "/>");

  // Step 3: Handle closing ">" at end → ">"
  //   Remove leading whitespace before the closing `>`.
  s = s.replace(/\s+>\s*$/, ">");

  // Step 4: Rejoin hyphenated attribute names
  //   "data - msg" → "data-msg", "aria - label" → "aria-label"
  //   The logic tokenizer splits hyphens as separate PUNCT tokens with spaces.
  s = s.replace(/(\w)\s+-\s+(\w)/g, "$1-$2");

  // Step 4b: Normalize optional prop markers: "name ? :" → "name?:"
  //   The logic tokenizer splits `?` as a separate PUNCT token with spaces.
  //   "onClose ? : type" → "onClose?: type"
  s = s.replace(/(\w)\s+\?\s*:/g, "$1?:");

  // Step 5: Remove spaces around `=` for attributes
  //   "attr = \"val\"" → "attr=\"val\""
  //   Be careful not to affect content inside attribute values.
  //   Since logic tokenizer puts spaces around every `=`, we can use
  //   a simple global replacement.
  //   Pattern: space-IDENT-space-equals or equals-space
  s = s.replace(/(\w)\s+=\s+/g, "$1=");
  s = s.replace(/\s+=\s+/g, "=");

  return s;
}

// ---------------------------------------------------------------------------
// Component registry builder
// ---------------------------------------------------------------------------

/**
 * Parse a component definition's `raw` expression string into markup AST nodes.
 *
 * The `raw` field from component-def is a space-joined logic token stream.
 * We normalize it back to parseable scrml markup and then run it through
 * BS + TAB to produce proper markup AST nodes.
 *
 * Returns { nodes: MarkupNode[], errors: CEError[] }
 *
 * Multi-root components (Phase 1.7+): all top-level markup nodes are returned.
 * Attrs/class merging applies to the first (primary) root node only.
 * Additional root nodes receive prop substitution but no caller attr override.
 *
 * Phase 1 limitation: Only self-closing and simple open-tag forms are supported.
 * Complex nested component bodies (those with markup children containing logic
 * blocks) are not supported and produce E-COMPONENT-021.
 */
function parseComponentBody(
  raw: string,
  componentName: string,
  filePath: string
): { nodes: MarkupNode[]; errors: CEError[] } {
  try {
    const normalized = normalizeTokenizedRaw(raw);

    const bsOut = splitBlocks(filePath + "#" + componentName, normalized);
    const tabOut = buildAST(bsOut) as { ast: FileAST; errors: TABErrorInfo[] };

    // Collect ALL markup nodes from the parsed result (multi-root support)
    const markupNodes = tabOut.ast.nodes.filter(n => n && n.kind === "markup") as MarkupNode[];

    // Filter out W-PROGRAM-001 and other warnings — they're expected for snippets
    const realErrors = tabOut.errors.filter(
      (e: TABErrorInfo) => e.severity !== "warning" && e.code !== "W-PROGRAM-001"
    );

    return {
      nodes: markupNodes,
      errors: realErrors.map((e: TABErrorInfo) => ({
        code: e.code,
        message: e.message,
        span: e.tabSpan,
      })),
    };
  } catch (e) {
    const err = e as Error;
    return {
      nodes: [],
      errors: [{
        code: "E-COMPONENT-021",
        message: err.message,
        span: { file: filePath, start: 0, end: 0, line: 1, col: 1 },
      }],
    };
  }
}

/**
 * Parse a single component-def node into a registry entry.
 * Used by both same-file and cross-file component resolution.
 */
function parseComponentDef(
  def: ExtendedComponentDefNode,
  filePath: string,
  ceErrors: CEError[]
): { nodes: MarkupNode[]; propsDecl: PropDecl[] | null; defChildren: ASTNode[] } | null {
  const { name, raw, span, defChildren } = def;
  if (!name || !raw) return null;

  const { nodes, errors: parseErrors } = parseComponentBody(raw, name, filePath);

  if (parseErrors.length > 0) {
    const defSpan = span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 };
    ceErrors.push(makeCEError(
      "E-COMPONENT-021",
      `E-COMPONENT-021: Component \`${name}\` has a malformed body that could not be re-parsed. ` +
      `Phase 1 supports self-closing and simple open-tag component definitions only. ` +
      `Parse error: ${parseErrors[0].message}`,
      defSpan,
    ));
    return null;
  }

  if (!nodes.length) return null;

  // Extract propsDecl from the primary (first) root element's `props` attribute
  const primaryNode = nodes[0];
  let propsDecl: PropDecl[] | null = null;
  if (primaryNode && Array.isArray(primaryNode.attrs)) {
    const propsAttr = primaryNode.attrs.find((a: AttrNode) => a && a.name === "props");
    if (propsAttr && propsAttr.value && propsAttr.value.kind === "props-block") {
      propsDecl = propsAttr.value.propsDecl as PropDecl[];
    }
  }

  // §14.9: Post-process — detect snippet-typed props and set isSnippet/snippetParamType
  if (propsDecl) {
    for (const decl of propsDecl) {
      // Set defaults if not present (PropDecl objects come from ast-builder parsePropsBlock)
      if (decl.isSnippet === undefined) decl.isSnippet = false;
      if (decl.snippetParamType === undefined) decl.snippetParamType = null;

      const trimType = decl.type.trim();
      // Normalize tokenized form: "snippet ( item : string )" → "snippet(item: string)"
      // The logic tokenizer inserts spaces around punctuation.
      const normalizedType = trimType.replace(/\s+/g, " ");
      const isSnippetBase = normalizedType === "snippet" || normalizedType === "snippet?";
      const snippetParenMatch = normalizedType.match(/^snippet\s*\((.+)\)$/);
      if (isSnippetBase || snippetParenMatch) {
        decl.isSnippet = true;
        if (snippetParenMatch) {
          const inner = snippetParenMatch[1].trim();
          const colonIdx = inner.indexOf(":");
          decl.snippetParamType = colonIdx !== -1 ? inner.slice(colonIdx + 1).trim() : inner.trim();
        }
        // snippet? makes the prop optional
        if (normalizedType === "snippet?") {
          decl.optional = true;
        }
      }
    }
  }

  // §15.11.1: E-COMPONENT-014 — bind prop declared with non-primitive type
  if (propsDecl) {
    const defSpan = def?.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 };
    for (const decl of propsDecl) {
      if (decl.bindable && !BIND_PROP_PRIMITIVE_TYPES.has(decl.type)) {
        ceErrors.push(makeCEError(
          "E-COMPONENT-014",
          `E-COMPONENT-014: \`bind\` prop \`${decl.name}\` has type \`${decl.type}\` which is not a primitive type. ` +
          `\`bind\` props must be primitive types (\`string\`, \`number\`, \`boolean\`). ` +
          `To share structured data, declare \`${decl.name}: ${decl.type}\` (without \`bind\`) and use state projection (§15.11.2).`,
          defSpan,
        ));
      }
      // §15.11.4: W-COMPONENT-001 — function-typed prop (escape hatch warning)
      // NOTE: This check is blocked when the component definition has function types in props={..}
      // because splitBlocks prematurely closes the tag on '>' inside plain {..} attribute values.
      // isFunctionType is checked here for completeness but will not fire until block-splitter.js
      // is updated to track plain { depth in scanAttributes.
      if (isFunctionType(decl.type)) {
        ceErrors.push(makeCEError(
          "W-COMPONENT-001",
          `W-COMPONENT-001: Component \`${name}\` declares function-typed prop \`${decl.name}\`. ` +
          `In scrml, child-to-parent communication is typically handled by \`bind:\` (for simple state) ` +
          `or state projection (for structured data). Function props are an escape hatch — ` +
          `prefer the state-based mechanisms when possible.`,
          defSpan,
          "warning",
        ));
      }
    }
  }

  // Remove the `props` attribute from the stored primary node
  const storedPrimary = primaryNode && Array.isArray(primaryNode.attrs)
    ? { ...primaryNode, attrs: primaryNode.attrs.filter((a: AttrNode) => a && a.name !== "props") }
    : primaryNode;

  // Secondary nodes (index 1+) are stored verbatim — no props attr stripping needed
  const storedNodes: MarkupNode[] = [storedPrimary as MarkupNode, ...nodes.slice(1)];

  return { nodes: storedNodes, propsDecl, defChildren: defChildren || [] };
}

function buildComponentRegistry(
  componentDefs: ExtendedComponentDefNode[],
  filePath: string,
  ceErrors: CEError[]
): Map<string, RegistryEntry> {
  const registry = new Map<string, RegistryEntry>();

  for (const def of componentDefs) {
    if (!def || def.kind !== "component-def") continue;

    const result = parseComponentDef(def, filePath, ceErrors);
    if (!result) continue;

    // §14.9: derive snippetProps map from propsDecl
    const snippetProps = new Map<string, PropDecl>();
    if (result.propsDecl) {
      for (const decl of result.propsDecl) {
        if (decl.isSnippet) snippetProps.set(decl.name, decl);
      }
    }

    registry.set(def.name, {
      nodes: result.nodes,
      defSpan: def.span,
      propsDecl: result.propsDecl,
      defChildren: result.defChildren,
      snippetProps,
    });
  }

  return registry;
}

// ---------------------------------------------------------------------------
// Prop substitution
// ---------------------------------------------------------------------------

/**
 * Apply prop substitutions to a cloned markup node tree.
 *
 * For Phase 1, props are the caller's attribute values. They are substituted
 * into the expanded markup by replacing occurrences of `${propName}` in
 * string-literal attribute values and text node content.
 */
function applyPropSubstitutions(text: string, props: Map<string, string>): string {
  if (props.size === 0) return text;
  return text.replace(/\$\{([^}]+)\}/g, (match: string, name: string) => {
    const trimmed = name.trim();
    return props.has(trimmed) ? (props.get(trimmed) as string) : match;
  });
}

/**
 * Substitute props recursively through a cloned AST node tree.
 */
function substituteProps(node: ASTNode, props: Map<string, string>): ASTNode {
  if (!node || typeof node !== "object") return node;
  if (props.size === 0) return node;

  // Clone the node shallowly
  const cloned = { ...node } as Record<string, unknown>;

  // Text nodes: substitute in value
  if (cloned.kind === "text") {
    const newVal = applyPropSubstitutions((cloned.value as string) ?? "", props);
    if (newVal !== cloned.value) {
      cloned.value = newVal;
    }
    return cloned as unknown as ASTNode;
  }

  // Markup nodes: substitute in attrs and recurse into children
  if (cloned.kind === "markup") {
    if (Array.isArray(cloned.attrs)) {
      cloned.attrs = (cloned.attrs as AttrNode[]).map((attr: AttrNode) => {
        if (!attr || !attr.value) return attr;
        if (attr.value.kind === "string-literal") {
          const newVal = applyPropSubstitutions(attr.value.value, props);
          if (newVal !== attr.value.value) {
            return { ...attr, value: { ...attr.value, value: newVal } };
          }
        }
        return attr;
      });
    }
    if (Array.isArray(cloned.children)) {
      cloned.children = (cloned.children as ASTNode[]).map((child: ASTNode) => substituteProps(child, props));
    }
    return cloned as unknown as ASTNode;
  }

  // Other node kinds: recurse into any array fields that look like node lists
  for (const key of Object.keys(cloned)) {
    if (key === "span" || key === "id") continue;
    if (Array.isArray(cloned[key])) {
      cloned[key] = (cloned[key] as unknown[]).map((item: unknown) => {
        if (item && typeof item === "object" && (item as Record<string, unknown>).kind) {
          return substituteProps(item as ASTNode, props);
        }
        return item;
      });
    }
  }

  return cloned as unknown as ASTNode;
}

// ---------------------------------------------------------------------------
// Class attribute merging
// ---------------------------------------------------------------------------

/**
 * Merge class attribute values.
 *
 * Rule: base (from component definition) + caller (space-separated), deduplicating
 * extra spaces. The base class from the component definition appears first.
 */
function mergeClasses(baseClass: string | null, callerClass: string | null): string | null {
  const base = (baseClass ?? "").trim();
  const caller = (callerClass ?? "").trim();
  if (!base && !caller) return null;
  if (!base) return caller;
  if (!caller) return base;
  return `${base} ${caller}`;
}

// ---------------------------------------------------------------------------
// Component expansion
// ---------------------------------------------------------------------------

/**
 * Expand a single component reference node.
 *
 * Replaces `node` (an isComponent: true markup node) with the component's
 * root elements, merging attributes and substituting props.
 *
 * For multi-root components:
 *   - The primary (first) root node receives the full treatment: attrs/class
 *     merging, children injection, prop substitution, bind: wiring.
 *   - Secondary root nodes (index 1+) receive prop substitution only; they
 *     are emitted as siblings after the primary expanded node.
 *
 * Returns an array of expanded nodes (original node wrapped in a single-element
 * array if expansion fails, with error added to ceErrors).
 */
function expandComponentNode(
  node: MarkupNode,
  registry: Map<string, RegistryEntry>,
  filePath: string,
  counter: NodeCounter,
  ceErrors: CEError[]
): MarkupNode[] {
  const componentName = node.tag;
  const def = registry.get(componentName);

  if (!def) {
    // E-COMPONENT-020: unresolved component reference
    ceErrors.push(makeCEError(
      "E-COMPONENT-020",
      `E-COMPONENT-020: Component \`${componentName}\` is not defined in this file. ` +
      `Define it with \`const ${componentName} = <element .../>\` before using it, ` +
      `or check the spelling.`,
      node.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 },
    ));
    // Leave the node as-is to allow downstream error recovery
    return [node];
  }

  // Primary root node (attrs/class/children merging applies to this one)
  const defNode = def.nodes[0];
  // Secondary root nodes (prop substitution only, emitted as siblings)
  const extraDefNodes = def.nodes.slice(1);

  // Build a props map from the caller's attribute values
  // Each caller attr (non-class) becomes a named prop: attr.name → string value
  const props = new Map<string, string>();
  const callerAttrs: AttrNode[] = node.attrs ?? [];
  let callerClassValue: string | null = null;

  for (const attr of callerAttrs) {
    if (!attr || !attr.name) continue;
    if (attr.name === "class") {
      // Collect class separately for merging
      if (attr.value && attr.value.kind === "string-literal") {
        callerClassValue = attr.value.value;
      }
      continue;
    }
    // For other attributes: extract string value for prop substitution
    if (attr.value && attr.value.kind === "string-literal") {
      props.set(attr.name, attr.value.value);
    } else if (attr.value && attr.value.kind === "variable-ref") {
      props.set(attr.name, attr.value.name);
    }
  }

  // §14.9 Phase 1.5: Slot detection — group caller children by slot="name"
  const slottedGroups = new Map<string, ASTNode[]>();
  const unslottedChildren: ASTNode[] = [];
  const callerChildrenRaw: ASTNode[] = node.children ?? [];

  for (const child of callerChildrenRaw) {
    if (!child) continue;
    // Check for slot= attribute on markup nodes
    const slotAttr = child.kind === "markup" && (child as MarkupNode).attrs
      ? ((child as MarkupNode).attrs ?? []).find((a: AttrNode) => a.name === "slot")
      : null;
    if (slotAttr && slotAttr.value && slotAttr.value.kind === "string-literal") {
      const slotName = slotAttr.value.value;
      // Validate: slot name must be a declared snippet prop
      if (def.snippetProps.size > 0 && !def.snippetProps.has(slotName)) {
        ceErrors.push(makeCEError(
          "E-COMPONENT-033",
          `E-COMPONENT-033: \`slot="${slotName}"\` does not target a snippet-typed prop on \`${componentName}\`. ` +
          `Declared snippet props: ${[...def.snippetProps.keys()].join(", ") || "(none)"}.`,
          child.span ?? node.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 },
        ));
      }
      // Validate: slot= on parametric snippet → error
      const snippetDecl = def.snippetProps.get(slotName);
      if (snippetDecl && snippetDecl.snippetParamType !== null) {
        ceErrors.push(makeCEError(
          "E-COMPONENT-034",
          `E-COMPONENT-034: \`slot="${slotName}"\` cannot be used on parametric snippet prop \`${slotName}\`. ` +
          `Parametric snippets require a lambda: \`${slotName}={ (param) => <markup/> }\`.`,
          child.span ?? node.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 },
        ));
      }
      // Strip slot= from the child's attrs (compile-time only)
      const strippedChild = {
        ...(child as MarkupNode),
        attrs: ((child as MarkupNode).attrs ?? []).filter((a: AttrNode) => a.name !== "slot"),
      } as ASTNode;
      if (!slottedGroups.has(slotName)) slottedGroups.set(slotName, []);
      slottedGroups.get(slotName)!.push(strippedChild);
    } else {
      unslottedChildren.push(child);
    }
  }

  // §16.6 Phase 1.6: Detect parametric snippet lambdas at call site
  // For each caller attr with kind "expr", check if it matches a parametric snippet prop
  const parametricSnippets = new Map<string, { paramName: string; body: string }>();
  const lambdaRe = /^\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)\s*=>\s*([\s\S]+)$/;

  if (def.snippetProps.size > 0) {
    for (const attr of callerAttrs) {
      if (!attr || !attr.name) continue;
      const snippetDecl = def.snippetProps.get(attr.name);
      if (!snippetDecl || snippetDecl.snippetParamType === null) continue;

      if (attr.value && (attr.value as Record<string, unknown>).kind === "expr") {
        const raw = (attr.value as Record<string, unknown>).raw as string;
        const match = raw.match(lambdaRe);
        if (match) {
          parametricSnippets.set(attr.name, { paramName: match[1], body: match[2].trim() });
        }
      }
    }
  }

  // Phase 2: typed props validation (§15.10)
  {
    const propsDecl = def.propsDecl;

    if (propsDecl && propsDecl.length > 0) {
      const declaredNames = new Set(propsDecl.map((p: PropDecl) => p.name));
      const callerPropNames = new Set(
        callerAttrs.filter((a: AttrNode) => a && a.name && a.name !== "class")
          // §15.11.1: strip bind: prefix so bind:propName matches prop named propName
          .map((a: AttrNode) => a.name.startsWith("bind:") ? a.name.slice(5) : a.name)
      );

      // E-COMPONENT-010: Missing required props (§14.9: snippet props fulfilled by slot= children or lambda)
      for (const decl of propsDecl) {
        if (!decl.optional && decl.default === null && !callerPropNames.has(decl.name)
            && !(decl.isSnippet && slottedGroups.has(decl.name))
            && !(decl.isSnippet && parametricSnippets.has(decl.name))) {
          ceErrors.push(makeCEError(
            "E-COMPONENT-010",
            `E-COMPONENT-010: Required prop \`${decl.name}\` (type: ${decl.type}) is missing ` +
            `at \`<${componentName}/>\` call site. ` +
            `Declare it as \`${decl.name}="value"\` on the call site.`,
            node.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 },
          ));
        }
      }

      // E-COMPONENT-011: Extra undeclared props
      // Note: bind:propName attrs use the base prop name for lookup (strip "bind:" prefix)
      for (const attr of callerAttrs) {
        if (!attr || !attr.name || attr.name === "class") continue;
        const effectiveName = attr.name.startsWith("bind:") ? attr.name.slice(5) : attr.name;
        if (!declaredNames.has(effectiveName)) {
          ceErrors.push(makeCEError(
            "E-COMPONENT-011",
            `E-COMPONENT-011: Prop \`${effectiveName}\` is not declared in \`${componentName}\`'s ` +
            `props block. Declared props: ${propsDecl.map((p: PropDecl) => p.name).join(", ")}.`,
            attr.span ?? node.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 },
          ));
        }
      }

      // E-COMPONENT-012: Duplicate prop name in props block and bare attribute on def root
      const defNodeAttrs = (def.nodes[0].attrs ?? []).filter((a: AttrNode) => a && a.name !== "class");
      for (const defAttr of defNodeAttrs) {
        if (declaredNames.has(defAttr.name)) {
          ceErrors.push(makeCEError(
            "E-COMPONENT-012",
            `E-COMPONENT-012: Prop \`${defAttr.name}\` is declared in both the \`props\` block ` +
            `and as a bare attribute on \`${componentName}\`'s root element. ` +
            `Remove the duplicate — use the \`props\` block or the bare attribute, not both.`,
            defAttr.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 },
          ));
        }
      }

      // §15.11.1: bind: call-site validation
      // For each bind:propName=@var attr, validate the prop is declared as bindable
      // and that the RHS is an @-prefixed reactive variable.
      for (const attr of callerAttrs) {
        if (!attr || !attr.name || !attr.name.startsWith("bind:")) continue;
        const propName = attr.name.slice(5); // "bind:visible" → "visible"
        const declaredProp = propsDecl.find((p: PropDecl) => p.name === propName);
        const attrSpan = attr.span ?? node.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 };

        if (declaredProp && !declaredProp.bindable) {
          // E-COMPONENT-013: prop exists but is not declared as bindable
          ceErrors.push(makeCEError(
            "E-COMPONENT-013",
            `E-COMPONENT-013: Prop \`${propName}\` on component \`${componentName}\` is not declared as bindable. ` +
            `Change the \`props\` block to \`bind ${propName}: type\` to allow two-way binding, ` +
            `or remove the \`bind:\` prefix and pass a value directly.`,
            attrSpan,
          ));
        }

        // E-ATTR-010 (component form): RHS must be @-prefixed reactive variable
        if (attr.value) {
          if (attr.value.kind === "variable-ref" && !attr.value.name.startsWith("@")) {
            ceErrors.push(makeCEError(
              "E-ATTR-010",
              `E-ATTR-010: \`${attr.name}\` requires a reactive \`@\` variable. ` +
              `\`${attr.value.name}\` is not reactive. ` +
              `Use \`@${attr.value.name}\` or remove the \`bind:\` prefix.`,
              attrSpan,
            ));
          } else if (attr.value.kind === "string-literal") {
            ceErrors.push(makeCEError(
              "E-ATTR-010",
              `E-ATTR-010: \`${attr.name}\` requires a reactive \`@\` variable. ` +
              `Got a string literal \`"${attr.value.value}"\` instead. ` +
              `Use an \`@\`-prefixed reactive variable, e.g. \`${attr.name}=@myVar\`.`,
              attrSpan,
            ));
          }
        }
      }

      // Apply defaults and null-fill for optional props not provided at call site
      for (const decl of propsDecl) {
        if (callerPropNames.has(decl.name)) continue; // caller provided it
        if (decl.default !== null) {
          props.set(decl.name, decl.default); // use declared default
        } else if (decl.optional) {
          props.set(decl.name, "null"); // optional with no default → null
        }
      }
    }
  }

  // Clone and substitute props into the definition's primary root node
  let expanded = substituteProps(defNode, props) as MarkupNode;

  // Merge class attribute:
  // Find the base class on the definition root element
  const defAttrs: AttrNode[] = defNode.attrs ?? [];
  const baseClassAttr = defAttrs.find((a: AttrNode) => a && a.name === "class");
  const baseClassValue = baseClassAttr && baseClassAttr.value && baseClassAttr.value.kind === "string-literal"
    ? baseClassAttr.value.value
    : null;

  const mergedClass = mergeClasses(baseClassValue, callerClassValue);

  // Merge caller attrs onto the expanded node:
  // - class: already handled via mergeClasses
  // - all other caller attrs override def attrs (caller wins for non-class conflicts)
  const callerNonClassAttrs = callerAttrs.filter((a: AttrNode) => a && a.name !== "class");
  const defNonClassAttrs = (expanded.attrs ?? []).filter((a: AttrNode) => a && a.name !== "class");

  // Build merged attrs: start with def attrs (non-class), then override with caller attrs
  const callerAttrNames = new Set(callerNonClassAttrs.map((a: AttrNode) => a.name));
  const mergedNonClassAttrs = [
    ...defNonClassAttrs.filter((a: AttrNode) => !callerAttrNames.has(a.name)),
    ...callerNonClassAttrs,
  ];

  // Reconstruct attrs with merged class first (if present)
  const newAttrs: AttrNode[] = [];
  if (mergedClass !== null) {
    newAttrs.push({
      name: "class",
      value: { kind: "string-literal", value: mergedClass, span: baseClassAttr?.span ?? node.span } as AttrValue,
      span: baseClassAttr?.span ?? node.span,
    });
  }
  newAttrs.push(...mergedNonClassAttrs);

  // Handle children: merge definition children + caller children
  // Use callerChildrenRaw (all caller children) for the overall injection,
  // plus slottedGroups/unslottedChildren from slot detection (Phase 1.5)
  const callerChildren: ASTNode[] = callerChildrenRaw;
  let finalChildren: ASTNode[] = expanded.children ?? [];

  // CE Phase 2: inject definition-body children (#{}, markup, logic siblings)
  const defChildren: ASTNode[] = (def.defChildren || []).map((dc: ASTNode) => {
    // Tag CSS blocks with component scope for @scope wrapping
    if (dc.kind === "css-inline" || dc.kind === "css") {
      return { ...dc, _componentScope: (node as MarkupNode).tag } as ASTNode;
    }
    return dc;
  });
  if (defChildren.length > 0) {
    finalChildren = [...defChildren, ...finalChildren];
  }

  if (callerChildren.length > 0 || slottedGroups.size > 0 || parametricSnippets.size > 0) {
    finalChildren = injectChildren(
      finalChildren, callerChildren,
      slottedGroups, unslottedChildren,
      ceErrors, componentName, filePath,
      node.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 },
      parametricSnippets,
    );
  }

  // §15.11.1: collect bind: prop wiring metadata for codegen
  // _bindProps: Array<{ propName: string, callerVar: string }>
  // propName is the component's prop name, callerVar is the @var name (without @)
  const _bindProps: Array<{ propName: string; callerVar: string }> = [];
  for (const attr of callerAttrs) {
    if (!attr || !attr.name || !attr.name.startsWith("bind:")) continue;
    const propName = attr.name.slice(5);
    if (attr.value && attr.value.kind === "variable-ref" && attr.value.name.startsWith("@")) {
      _bindProps.push({ propName, callerVar: attr.value.name.slice(1) }); // strip @
    }
  }

  // Assign a new ID to the primary expanded node
  const expandedNode = {
    ...expanded,
    id: ++counter.next,
    attrs: newAttrs,
    children: finalChildren,
    // Mark as expanded — no longer a component reference
    isComponent: false,
    _expandedFrom: componentName,
    ...(_bindProps.length > 0 ? { _bindProps } : {}),
  } as MarkupNode;

  // Expand secondary root nodes: prop substitution only, no attr/class/children merging
  const secondaryNodes: MarkupNode[] = extraDefNodes.map((extraNode: MarkupNode) => ({
    ...(substituteProps(extraNode, props) as MarkupNode),
    id: ++counter.next,
    isComponent: false,
    _expandedFrom: componentName,
  }));

  return [expandedNode, ...secondaryNodes];
}

/**
 * Inject caller children into the expanded component markup tree.
 *
 * A `${children}` slot is represented as a logic node with a bare-expr "children".
 * When found, it is replaced by the caller's children nodes.
 *
 * §14.9: `${...}` spread → unslotted children; `${render name()}` → slotted group.
 *
 * If no explicit slot is found, caller children are appended to the end of
 * the component's root element children.
 */
function injectChildren(
  expandedChildren: ASTNode[],
  callerChildren: ASTNode[],
  slottedGroups?: Map<string, ASTNode[]>,
  unslottedChildren?: ASTNode[],
  ceErrors?: CEError[],
  componentName?: string,
  filePath?: string,
  nodeSpan?: Span,
  parametricSnippets?: Map<string, { paramName: string; body: string }>,
): ASTNode[] {
  let slotFound = false;
  let spreadFound = false;
  const result: ASTNode[] = [];

  // §14.9: regex for render name() pattern (zero-param)
  const renderRe = /^render\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(\s*\)$/;
  // §16.6: regex for render name(expr) pattern (parametric)
  const renderParamRe = /^render\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(\s*(.+)\s*\)$/;

  for (const child of expandedChildren) {
    if (!child) continue;
    // Detect a ${children} or ${...} or ${render name()} slot
    if (child.kind === "logic") {
      const logicChild = child as LogicNode;

      // Check each body node for special bare-expr patterns
      const isChildrenSlot = Array.isArray(logicChild.body) && logicChild.body.some(
        (n: unknown) => {
          const node = n as Record<string, unknown>;
          return node && node.kind === "bare-expr" && node.expr && (node.expr as string).trim() === "children";
        }
      );

      // §14.9: ${...} spread — substitute with unslotted children
      const isSpreadSlot = Array.isArray(logicChild.body) && logicChild.body.some(
        (n: unknown) => {
          const node = n as Record<string, unknown>;
          return node && node.kind === "bare-expr" && node.expr && (node.expr as string).trim() === "...";
        }
      );

      // §14.9: ${render name()} — substitute with slotted group
      const renderMatch = Array.isArray(logicChild.body) && logicChild.body.reduce(
        (found: string | null, n: unknown) => {
          if (found) return found;
          const node = n as Record<string, unknown>;
          if (node && node.kind === "bare-expr" && node.expr) {
            const m = (node.expr as string).trim().match(renderRe);
            if (m) return m[1];
          }
          return null;
        },
        null as string | null,
      );

      // §16.6: ${render name(expr)} — parametric snippet substitution
      const renderParamMatch = !renderMatch && Array.isArray(logicChild.body) && logicChild.body.reduce(
        (found: { name: string; argExpr: string } | null, n: unknown) => {
          if (found) return found;
          const node = n as Record<string, unknown>;
          if (node && node.kind === "bare-expr" && node.expr) {
            const m = (node.expr as string).trim().match(renderParamRe);
            if (m) return { name: m[1], argExpr: m[2].trim() };
          }
          return null;
        },
        null as { name: string; argExpr: string } | null,
      );

      if (isChildrenSlot) {
        // Replace the slot with the caller's children (backward compat)
        if (spreadFound) {
          // E-COMPONENT-030: multiple spreads
          if (ceErrors) {
            ceErrors.push(makeCEError(
              "E-COMPONENT-030",
              `E-COMPONENT-030: Component \`${componentName}\` has multiple \`\${children}\`/\`\${...}\` spreads. ` +
              `Only one spread is allowed per component body.`,
              nodeSpan ?? { file: filePath ?? "", start: 0, end: 0, line: 1, col: 1 },
            ));
          }
        }
        const childrenToInject = unslottedChildren && unslottedChildren.length > 0
          ? unslottedChildren : callerChildren;
        result.push(...childrenToInject);
        slotFound = true;
        spreadFound = true;
        continue;
      }

      if (isSpreadSlot) {
        // §14.9: ${...} spread → unslotted children
        if (spreadFound) {
          if (ceErrors) {
            ceErrors.push(makeCEError(
              "E-COMPONENT-030",
              `E-COMPONENT-030: Component \`${componentName}\` has multiple \`\${children}\`/\`\${...}\` spreads. ` +
              `Only one spread is allowed per component body.`,
              nodeSpan ?? { file: filePath ?? "", start: 0, end: 0, line: 1, col: 1 },
            ));
          }
        }
        const childrenToInject = unslottedChildren && unslottedChildren.length > 0
          ? unslottedChildren : callerChildren;
        result.push(...childrenToInject);
        slotFound = true;
        spreadFound = true;
        continue;
      }

      if (renderMatch && slottedGroups) {
        // §14.9: ${render name()} → substitute slotted group
        const slotNodes = slottedGroups.get(renderMatch);
        if (slotNodes && slotNodes.length > 0) {
          result.push(...slotNodes);
        }
        slotFound = true;
        continue;
      }

      if (renderParamMatch && parametricSnippets) {
        // §16.6: ${render name(expr)} → substitute parametric snippet lambda body
        const snippet = parametricSnippets.get(renderParamMatch.name);
        if (snippet) {
          // Replace all occurrences of paramName with argExpr in the lambda body
          const paramRe = new RegExp(`\\b${snippet.paramName}\\b`, "g");
          const substituted = snippet.body.replace(paramRe, renderParamMatch.argExpr);
          // Emit as a bare-expr logic node containing the substituted markup
          result.push({
            kind: "logic",
            body: [{ kind: "bare-expr", expr: substituted, span: child.span }],
            span: child.span,
          } as unknown as ASTNode);
        }
        slotFound = true;
        continue;
      }
    }
    result.push(child);
  }

  if (!slotFound && callerChildren.length > 0) {
    // No explicit slot found — append caller children at the end
    result.push(...callerChildren);
  }

  // §14.9: E-COMPONENT-031 — unslotted children but no spread slot
  if (unslottedChildren && unslottedChildren.length > 0 && !spreadFound && slottedGroups && slottedGroups.size > 0) {
    if (ceErrors) {
      ceErrors.push(makeCEError(
        "E-COMPONENT-031",
        `E-COMPONENT-031: Component \`${componentName}\` received unslotted children but has no ` +
        `\`\${...}\` or \`\${children}\` spread in its body. Add a spread or assign children to slots.`,
        nodeSpan ?? { file: filePath ?? "", start: 0, end: 0, line: 1, col: 1 },
      ));
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// AST walk and expansion
// ---------------------------------------------------------------------------

/**
 * Recursively walk an array of AST nodes and expand component references.
 *
 * Returns a new array with component nodes replaced by their expansions.
 * Multi-root components produce multiple sibling nodes spread into the result.
 * Mutates nothing — the result is a new array (though subtrees that don't
 * need expansion are reused by reference for efficiency).
 */
function walkAndExpand(
  nodes: ASTNode[],
  registry: Map<string, RegistryEntry>,
  filePath: string,
  counter: NodeCounter,
  ceErrors: CEError[]
): ASTNode[] {
  const result: ASTNode[] = [];

  for (const node of nodes) {
    if (!node || typeof node !== "object") {
      result.push(node);
      continue;
    }

    // Skip component-def nodes — they are consumed here
    if (node.kind === "component-def") {
      continue;
    }

    // Expand component reference nodes
    if (node.kind === "markup" && (node as MarkupNode).isComponent === true) {
      const expandedNodes = expandComponentNode(node as MarkupNode, registry, filePath, counter, ceErrors);
      // For each expanded node: if expansion succeeded (isComponent: false), recurse into children
      for (const expanded of expandedNodes) {
        if (expanded && expanded !== node && expanded.isComponent !== true) {
          const expandedChildren = walkAndExpand(
            expanded.children ?? [],
            registry, filePath, counter, ceErrors
          );
          result.push({ ...expanded, children: expandedChildren });
        } else {
          result.push(expanded);
        }
      }
      continue;
    }

    // For markup nodes (non-component): recurse into children
    if (node.kind === "markup" || node.kind === "state") {
      const n = node as MarkupNode;
      const newChildren = walkAndExpand(n.children ?? [], registry, filePath, counter, ceErrors);
      // Only create a new object if children changed
      const changed = newChildren.length !== (n.children ?? []).length ||
        newChildren.some((c, i) => c !== (n.children ?? [])[i]);
      if (changed) {
        result.push({ ...node, children: newChildren } as ASTNode);
      } else {
        result.push(node);
      }
      continue;
    }

    // For logic blocks: recurse into body (may contain lift expressions with markup)
    if (node.kind === "logic") {
      const logicNode = node as LogicNode;
      const newBody = walkLogicBody(logicNode.body ?? [], registry, filePath, counter, ceErrors);
      const changed = newBody.length !== (logicNode.body ?? []).length ||
        newBody.some((c, i) => c !== (logicNode.body ?? [])[i]);
      if (changed) {
        result.push({ ...node, body: newBody } as ASTNode);
      } else {
        result.push(node);
      }
      continue;
    }

    // All other node kinds: pass through unchanged
    result.push(node);
  }

  return result;
}

/**
 * Walk a LogicNode[] body and expand any component references found in
 * lift expressions or nested markup nodes.
 */
function walkLogicBody(
  bodyNodes: unknown[],
  registry: Map<string, RegistryEntry>,
  filePath: string,
  counter: NodeCounter,
  ceErrors: CEError[]
): unknown[] {
  const result: unknown[] = [];
  let changed = false;

  for (const node of bodyNodes) {
    if (!node || typeof node !== "object") {
      result.push(node);
      continue;
    }

    const n = node as Record<string, unknown>;

    // Skip component-def nodes — they are consumed by CE
    if (n.kind === "component-def") {
      changed = true;
      continue;
    }

    if (n.kind === "lift-expr" && n.expr && typeof n.expr === "object") {
      const expr = n.expr as Record<string, unknown>;
      if (expr.kind === "markup") {
        const liftMarkup = expr.node as MarkupNode;
        if (liftMarkup && liftMarkup.kind === "markup" && liftMarkup.isComponent === true) {
          const expandedNodes = expandComponentNode(liftMarkup, registry, filePath, counter, ceErrors);
          // For lift-expr: take the first expanded node (Phase 2 for full multi-root lift)
          const expanded = expandedNodes[0];
          if (expanded && expanded !== liftMarkup) {
            const newNode = { ...n, expr: { kind: "markup", node: expanded } };
            result.push(newNode);
            changed = true;
            continue;
          }
        }
      }
    }

    // Recurse into nested bodies (for-stmt, if-stmt, etc.)
    let nodeChanged = false;
    const newNode = { ...n };
    for (const key of ["body", "consequent", "alternate"]) {
      if (Array.isArray(n[key])) {
        const newBody = walkLogicBody(n[key] as unknown[], registry, filePath, counter, ceErrors);
        if (newBody !== n[key]) {
          newNode[key] = newBody;
          nodeChanged = true;
        }
      }
    }
    result.push(nodeChanged ? newNode : node);
    if (nodeChanged) changed = true;
  }

  return changed ? result : bodyNodes;
}

// ---------------------------------------------------------------------------
// Component reference scanner
// ---------------------------------------------------------------------------

/**
 * Check whether any node in an AST node array has isComponent: true.
 * Used to skip CE processing on files with no component references.
 */
function hasAnyComponentRefs(nodes: ASTNode[]): boolean {
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    if (node.kind === "markup" && (node as MarkupNode).isComponent === true) return true;
    if ((node.kind === "markup" || node.kind === "state") && Array.isArray((node as MarkupNode).children)) {
      if (hasAnyComponentRefs((node as MarkupNode).children ?? [])) return true;
    }
    if (node.kind === "logic" && Array.isArray((node as LogicNode).body)) {
      if (hasAnyComponentRefsInLogic((node as LogicNode).body ?? [])) return true;
    }
  }
  return false;
}

/**
 * Check whether any logic body node tree contains a component reference.
 */
function hasAnyComponentRefsInLogic(bodyNodes: unknown[]): boolean {
  for (const node of bodyNodes) {
    if (!node || typeof node !== "object") continue;
    const n = node as Record<string, unknown>;
    if (n.kind === "lift-expr" && n.expr && typeof n.expr === "object") {
      const expr = n.expr as Record<string, unknown>;
      if (expr.kind === "markup") {
        const liftMarkup = expr.node as Record<string, unknown>;
        if (liftMarkup && liftMarkup.isComponent === true) return true;
      }
    }
    for (const key of ["body", "consequent", "alternate"]) {
      if (Array.isArray(n[key])) {
        if (hasAnyComponentRefsInLogic(n[key] as unknown[])) return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Public entry point — per-file
// ---------------------------------------------------------------------------

/**
 * Run CE on a single TAB output record.
 */
export function runCEFile(
  tabOutput: CEFileInput,
  exportRegistry?: ExportRegistry,
  fileASTMap?: FileASTMap
): CEFileOutput {
  const { filePath, ast, errors: _tabErrors } = tabOutput;

  const ceErrors: CEError[] = [];

  // If AST is absent, pass through unchanged
  if (!ast) {
    return { filePath, ast, errors: ceErrors };
  }

  // Build the component registry from ast.components (same-file)
  const componentDefs = (ast.components ?? []) as ExtendedComponentDefNode[];

  // Phase 2: also check for imported component references
  const hasComponentDefs = componentDefs.length > 0;
  const hasComponentRefs = hasAnyComponentRefs(ast.nodes ?? []);
  const hasImportedComponents = exportRegistry && fileASTMap &&
    (ast.imports ?? []).some((imp: ImportDeclNode) => {
      const importExt = imp as ImportWithSpecifiers;
      const targetExports = exportRegistry.get(imp.source as string);
      if (!targetExports) return false;
      // Normalize: AST imports use imp.names (string[]), but some paths may use
      // imp.specifiers ({imported, local}[]). Handle both shapes.
      const names = importExt.specifiers ? importExt.specifiers.map((s) => s.imported) : (imp.names ?? []);
      return names.some((name: string) => {
        const info = targetExports.get(name);
        return info && info.isComponent;
      });
    });

  if (!hasComponentDefs && !hasComponentRefs && !hasImportedComponents) {
    return { filePath, ast, errors: ceErrors };
  }

  const registry = buildComponentRegistry(componentDefs, filePath, ceErrors);

  // Phase 2: add imported components to the registry from cross-file sources
  if (exportRegistry && fileASTMap) {
    for (const imp of (ast.imports ?? [])) {
      const importExt = imp as ImportWithSpecifiers;
      const targetExports = exportRegistry.get(imp.source as string);
      if (!targetExports) continue;
      const targetTab = fileASTMap.get(imp.source as string);
      if (!targetTab || !targetTab.ast) continue;
      const targetComponents = (targetTab.ast.components ?? []) as ExtendedComponentDefNode[];

      // Normalize: AST imports use imp.names (string[]), but some paths may use
      // imp.specifiers ({imported, local}[]). Handle both shapes.
      const importedNames = importExt.specifiers ? importExt.specifiers.map((s) => s.imported) : (imp.names ?? []);
      for (const importedName of importedNames) {
        const info = targetExports.get(importedName);
        if (!info || !info.isComponent) continue;

        // Find the ComponentDef in the source file's pre-CE AST
        const compDef = targetComponents.find((c: ExtendedComponentDefNode) => c.name === importedName);
        if (!compDef) continue;

        // Only add if not already in the same-file registry (same-file takes precedence)
        if (!registry.has(importedName)) {
          // Build the component entry the same way as buildComponentRegistry
          const defNode = parseComponentDef(compDef, imp.source as string, ceErrors);
          if (defNode) {
            // §14.9: derive snippetProps for cross-file components
            const xSnippetProps = new Map<string, PropDecl>();
            if (defNode.propsDecl) {
              for (const decl of defNode.propsDecl) {
                if (decl.isSnippet) xSnippetProps.set(decl.name, decl);
              }
            }
            registry.set(importedName, {
              nodes: defNode.nodes,
              defSpan: compDef.span,
              propsDecl: defNode.propsDecl ?? null,
              defChildren: defNode.defChildren ?? [],
              snippetProps: xSnippetProps,
            });
          }
        }
      }
    }
  }

  // Initialize the node-ID counter from the maximum ID already assigned by TAB
  const maxExistingId = findMaxId(ast.nodes ?? []);
  const counter: NodeCounter = { next: maxExistingId };

  // Walk the AST and expand all component references
  const expandedNodes = walkAndExpand(ast.nodes ?? [], registry, filePath, counter, ceErrors);

  // Produce updated AST:
  // - nodes: expanded (component-defs consumed from logic bodies, isComponent refs replaced)
  // - components: cleared (all definitions have been processed)
  const updatedAst: FileAST = {
    ...ast,
    nodes: expandedNodes,
    components: [], // component-def nodes are consumed by this stage
  };

  return { filePath, ast: updatedAst, errors: ceErrors };
}

// ---------------------------------------------------------------------------
// Public entry point — multi-file (pipeline contract)
// ---------------------------------------------------------------------------

/**
 * Pipeline-contract entry point. Takes the multi-file form used by the
 * pipeline runner.
 */
export function runCE(input: CEInput): CEOutput {
  const { files, exportRegistry, fileASTMap } = input;
  const processedFiles = (files || []).map((f: CEFileInput) => runCEFile(f, exportRegistry, fileASTMap));
  const allErrors = processedFiles.flatMap((f: CEFileOutput) => f.errors);
  return { files: processedFiles, errors: allErrors };
}
