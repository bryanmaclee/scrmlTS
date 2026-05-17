/**
 * Four-tier AST diff — per scrml-native-parser-design-2026-05-17.md §D6.
 *
 *   Tier 1 — Node-kind sequence (pre-order tree-walk node types).
 *            MUST match; mismatch is E-CONFORMANCE-1 (structural divergence).
 *   Tier 2 — Identifier / literal values, operator strings.
 *            MUST match; mismatch is E-CONFORMANCE-2 (value divergence).
 *   Tier 3 — Span preservation (start/end offsets, line/col).
 *            SHOULD match; informational on mismatch.
 *   Tier 4 — Full AST deep equality minus span fields.
 *            OPTIONAL; reports diff, does not fail.
 *
 * Path notation: JSON-pointer-style string ("/body/0/declarations/0/init/...")
 * — the exact key path from the root AST node to the divergent node, used for
 * diagnostic clarity in the test output.
 *
 * Span normalization: helper `stripSpans(ast)` returns a structurally-equivalent
 * deep-copy with `start`, `end`, `loc`, `range` fields removed at every depth.
 * Used by Tier 1+2 (which must be span-independent) and Tier 4 (which compares
 * shape, not positions).
 *
 * Per primer Pillar 5b: these diff functions are pure calculations over input
 * AST trees — `fn` body shape per D1 charter.
 */

// ---------------------------------------------------------------------------
// AST normalization
// ---------------------------------------------------------------------------

/** Span fields stripped by stripSpans. Acorn emits all of these. */
const SPAN_FIELDS = new Set(["start", "end", "loc", "range"]);

/**
 * Return a deep-copy of `node` with span fields removed at every depth.
 * Preserves all other fields (types, names, values, operators, structure).
 */
export function stripSpans(node) {
  if (node === null) return null;
  if (typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map(stripSpans);
  const out = {};
  for (const key of Object.keys(node)) {
    if (SPAN_FIELDS.has(key)) continue;
    out[key] = stripSpans(node[key]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// AST walking — produces the lockstep node-stream both parsers should agree on
// ---------------------------------------------------------------------------

/**
 * Pre-order DFS walk producing a flat array of { node, path } entries for
 * every node carrying a `type` discriminant. The path is a JSON-pointer-style
 * string from the root.
 *
 * Walks every property of every node (matches the loose ESTree-ish shape acorn
 * emits) so that array-valued children (body, properties, elements, ...) are
 * traversed in order.
 */
export function walkNodes(root) {
  const out = [];
  const seen = new WeakSet();
  function visit(node, path) {
    if (node === null || typeof node !== "object") return;
    if (seen.has(node)) return; // defensive — acorn shouldn't produce cycles
    seen.add(node);
    if (typeof node.type === "string") {
      out.push({ node, path });
    }
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        visit(node[i], `${path}/${i}`);
      }
      return;
    }
    for (const key of Object.keys(node)) {
      if (SPAN_FIELDS.has(key)) continue;
      const child = node[key];
      if (child === null || typeof child !== "object") continue;
      visit(child, `${path}/${key}`);
    }
  }
  visit(root, "");
  return out;
}

// ---------------------------------------------------------------------------
// Tier 1 — node-kind sequence
// ---------------------------------------------------------------------------

/**
 * Compare the pre-order node-kind sequence of two ASTs.
 *
 * @returns {{ match: boolean, divergences: Array<{ path: string, kindA: string|null, kindB: string|null }> }}
 *   - match: true iff the kind sequences are identical length-and-element-wise
 *   - divergences: per-index mismatches; first differing position OR length delta
 */
export function tier1NodeKindDiff(astA, astB) {
  const a = walkNodes(astA);
  const b = walkNodes(astB);
  const divergences = [];
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    const ea = a[i];
    const eb = b[i];
    const kindA = ea ? ea.node.type : null;
    const kindB = eb ? eb.node.type : null;
    if (kindA !== kindB) {
      divergences.push({
        path: ea ? ea.path : eb ? eb.path : `/(index ${i})`,
        kindA,
        kindB,
      });
    }
  }
  return { match: divergences.length === 0, divergences };
}

// ---------------------------------------------------------------------------
// Tier 2 — identifier / literal values, operator strings
// ---------------------------------------------------------------------------

/**
 * Per-node-kind, the scalar fields whose values MUST agree across parsers.
 * Field choices match the ESTree spec surface acorn emits.
 */
const TIER2_VALUE_FIELDS = {
  Identifier: ["name"],
  PrivateIdentifier: ["name"],
  Literal: ["value", "raw", "bigint", "regex"],
  TemplateElement: ["value", "tail"], // value is { cooked, raw } sub-object
  BinaryExpression: ["operator"],
  LogicalExpression: ["operator"],
  AssignmentExpression: ["operator"],
  UpdateExpression: ["operator", "prefix"],
  UnaryExpression: ["operator", "prefix"],
  VariableDeclaration: ["kind"], // "let" | "const" | "var"
  MethodDefinition: ["kind", "static", "computed"],
  Property: ["kind", "shorthand", "computed", "method"],
  ImportSpecifier: [], // names live on imported/local Identifier children
  ImportDefaultSpecifier: [],
  ImportNamespaceSpecifier: [],
  ExportNamedDeclaration: [], // names live on specifiers
  FunctionDeclaration: ["async", "generator"],
  FunctionExpression: ["async", "generator"],
  ArrowFunctionExpression: ["async", "expression"],
  ClassDeclaration: [],
  ClassExpression: [],
  MemberExpression: ["computed", "optional"],
  ChainExpression: [],
  CallExpression: ["optional"],
};

/**
 * Compare scalar value-fields between two ASTs walked in lockstep.
 * Requires Tier 1 to have produced matching node sequences (otherwise paths
 * misalign). Reports per-field mismatch.
 *
 * @returns {{ match: boolean, divergences: Array<{ path: string, field: string, valueA: any, valueB: any }> }}
 */
export function tier2ValueDiff(astA, astB) {
  const a = walkNodes(astA);
  const b = walkNodes(astB);
  const divergences = [];
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    const na = a[i].node;
    const nb = b[i].node;
    if (na.type !== nb.type) {
      // Structural divergence — Tier 1 reports it; do not double-count here.
      continue;
    }
    const fields = TIER2_VALUE_FIELDS[na.type];
    if (!fields) continue; // node type not in value-field catalog → skip
    for (const field of fields) {
      const va = na[field];
      const vb = nb[field];
      if (!scalarEqual(va, vb)) {
        divergences.push({
          path: a[i].path,
          field,
          valueA: va,
          valueB: vb,
        });
      }
    }
  }
  // Length mismatch is structural — Tier 1 owns it; Tier 2 reports only value drift.
  return { match: divergences.length === 0, divergences };
}

/**
 * Deep-equal for scalar value-fields. Handles: primitives, null/undefined,
 * arrays (rare — e.g., Literal.regex.flags), and the TemplateElement.value
 * sub-object { cooked, raw }.
 */
function scalarEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!scalarEqual(a[i], b[i])) return false;
    }
    return true;
  }
  // Plain object (TemplateElement.value, Literal.regex)
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!scalarEqual(a[k], b[k])) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Tier 3 — span preservation (informational)
// ---------------------------------------------------------------------------

/**
 * Compare start/end/loc fields between two ASTs walked in lockstep.
 * SHOULD match per §D6 but divergence is documented-per-file, not failed.
 *
 * @returns {{ match: boolean, divergences: Array<{ path: string, spanA: object, spanB: object }> }}
 */
export function tier3SpanDiff(astA, astB) {
  const a = walkNodes(astA);
  const b = walkNodes(astB);
  const divergences = [];
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    const na = a[i].node;
    const nb = b[i].node;
    if (na.type !== nb.type) continue;
    const sa = extractSpan(na);
    const sb = extractSpan(nb);
    if (!spanEqual(sa, sb)) {
      divergences.push({ path: a[i].path, spanA: sa, spanB: sb });
    }
  }
  return { match: divergences.length === 0, divergences };
}

function extractSpan(node) {
  return {
    start: node.start,
    end: node.end,
    loc: node.loc
      ? {
          start: node.loc.start ? { line: node.loc.start.line, column: node.loc.start.column } : null,
          end: node.loc.end ? { line: node.loc.end.line, column: node.loc.end.column } : null,
        }
      : null,
  };
}

function spanEqual(a, b) {
  if (a.start !== b.start) return false;
  if (a.end !== b.end) return false;
  if ((a.loc === null) !== (b.loc === null)) return false;
  if (a.loc === null) return true;
  const sa = a.loc.start, sb = b.loc.start;
  const ea = a.loc.end, eb = b.loc.end;
  if ((sa === null) !== (sb === null)) return false;
  if (sa && (sa.line !== sb.line || sa.column !== sb.column)) return false;
  if ((ea === null) !== (eb === null)) return false;
  if (ea && (ea.line !== eb.line || ea.column !== eb.column)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Tier 4 — full AST deep equality minus spans (informational)
// ---------------------------------------------------------------------------

/**
 * Deep-equality check between two ASTs after span stripping.
 * Reports the first ~50 leaf-divergence paths.
 *
 * @returns {{ match: boolean, divergences: Array<{ path: string, diff: string }> }}
 */
export function tier4FullDiff(astA, astB) {
  const strippedA = stripSpans(astA);
  const strippedB = stripSpans(astB);
  const divergences = [];
  deepDiff(strippedA, strippedB, "", divergences, 50);
  return { match: divergences.length === 0, divergences };
}

function deepDiff(a, b, path, out, limit) {
  if (out.length >= limit) return;
  if (a === b) return;
  if (a === null || b === null || typeof a !== typeof b) {
    out.push({ path, diff: `${describe(a)} !== ${describe(b)}` });
    return;
  }
  if (typeof a !== "object") {
    if (a !== b) out.push({ path, diff: `${describe(a)} !== ${describe(b)}` });
    return;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) {
      out.push({ path, diff: `array-vs-non-array` });
      return;
    }
    if (a.length !== b.length) {
      out.push({ path, diff: `length ${a.length} !== ${b.length}` });
      // continue: still surface index-level divergences
    }
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      deepDiff(a[i], b[i], `${path}/${i}`, out, limit);
      if (out.length >= limit) return;
    }
    return;
  }
  // object
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  const allKeys = new Set([...keysA, ...keysB]);
  for (const k of allKeys) {
    if (!(k in a)) { out.push({ path: `${path}/${k}`, diff: `missing in A` }); continue; }
    if (!(k in b)) { out.push({ path: `${path}/${k}`, diff: `missing in B` }); continue; }
    deepDiff(a[k], b[k], `${path}/${k}`, out, limit);
    if (out.length >= limit) return;
  }
}

function describe(v) {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "object") return Array.isArray(v) ? `array(len=${v.length})` : `object(type=${v.type ?? "?"})`;
  return String(v);
}
