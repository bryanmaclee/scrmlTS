/**
 * VP-3 — Attribute Interpolation Validation
 *
 * Walks the AST and emits an error when `${...}` interpolation appears in
 * an attribute value where the attribute is NOT flagged
 * `supportsInterpolation: true` in the per-element registry.
 *
 * Closes F-CHANNEL-001 (`<channel name="driver-${id}">` silently inert).
 * The literal `${id}` survives codegen as a static substring of the
 * channel WebSocket URL, so every "per-id" channel collapses to a single
 * broadcast topic. VP-3 turns this silent failure into a compile-time
 * error.
 *
 * Emits: E-CHANNEL-007 (currently the only emit point — future scrml
 * elements with non-interpolating attrs will reuse this pass and may
 * surface different codes via a per-element override.)
 *
 * Detection rule: AttrValue is `kind: "string-literal"` AND its `value`
 * string contains `${` (the literal interpolation marker survives TAB
 * for unsupported attributes).
 *
 * Cross-reference:
 *   - SPEC §38 (channels) — `name=` is literal; no interpolation supported.
 *   - F-CHANNEL-001 — closed silent-failure window after this pass lands.
 */

import type { Span, FileAST, ASTNode, MarkupNode, AttrNode } from "../types/ast.ts";
import { getElementAttrSchema } from "../attribute-registry.js";

// ---------------------------------------------------------------------------
// Diagnostic shape — matches CEError shape used by the existing component
// expander, so api.js's collectErrors picks it up unchanged.
// ---------------------------------------------------------------------------

export interface AttrInterpError {
  code: string;
  message: string;
  span: Span;
  severity: "error";
}

// ---------------------------------------------------------------------------
// Per-element error code mapping
//
// Tag-name → error code emitted when one of its non-interpolating attrs
// contains `${...}`. New elements that gain a non-interpolating attr should
// register a code here so the diagnostic carries the right prefix.
// ---------------------------------------------------------------------------

const ELEMENT_ERROR_CODE = new Map<string, string>([
  ["channel", "E-CHANNEL-007"],
  // Future: page route interpolation, machine name interpolation, etc.
  // would each get their own code. For now, fall through to a generic
  // E-ATTR-001 (registered below if needed).
]);

function errorCodeFor(tag: string): string {
  return ELEMENT_ERROR_CODE.get(tag.toLowerCase()) ?? "E-ATTR-001";
}

// ---------------------------------------------------------------------------
// Detection: literal containing `${`
// ---------------------------------------------------------------------------

interface StringLiteralAttrLike {
  kind: "string-literal";
  value: string;
  span: Span;
}

function attrValueHasInterpolation(value: unknown): { match: boolean; raw?: string } {
  if (!value || typeof value !== "object") return { match: false };
  const v = value as { kind?: string; value?: unknown };
  if (v.kind !== "string-literal") return { match: false };
  if (typeof v.value !== "string") return { match: false };
  // Standard scrml interpolation marker is `${`. The TAB stage preserves it
  // verbatim in `string-literal` values for attributes that do not have
  // dedicated reactive handling (e.g. `<channel name=>`).
  return { match: v.value.includes("${"), raw: v.value };
}

// ---------------------------------------------------------------------------
// AST walk — visit every markup node, check its attrs against the registry.
// ---------------------------------------------------------------------------

function visitMarkup(
  node: MarkupNode,
  filePath: string,
  errors: AttrInterpError[]
): void {
  const tag = node.tag ?? "";
  if (!tag) return;

  const schema = getElementAttrSchema(tag);
  if (schema) {
    for (const attr of node.attrs ?? []) {
      if (!attr || !attr.name) continue;
      const spec = schema.allowedAttrs.get(attr.name);
      // If we have no spec, it's unrecognized — VP-1's territory, skip here.
      if (!spec) continue;
      if (spec.supportsInterpolation === true) continue;

      const detection = attrValueHasInterpolation(attr.value);
      if (detection.match) {
        const span = attr.span ?? node.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 };
        errors.push({
          code: errorCodeFor(tag),
          message:
            `${errorCodeFor(tag)}: Attribute \`${attr.name}=\` on \`<${tag}>\` does not support \`\${...}\` ` +
            `interpolation. The expression is currently emitted as a literal substring of the attribute ` +
            `value (\`${detection.raw}\`), which silently breaks any per-instance scoping the adopter ` +
            `intended. ` +
            (tag.toLowerCase() === "channel"
              ? `For per-id channel scoping, use a static name + payload-side filtering: ` +
                `\`<channel name="driver-events">\` and filter messages on \`payload.targetId\`. ` +
                `(See F-CHANNEL-001 in examples/23-trucking-dispatch/FRICTION.md.)`
              : `Use a static literal for this attribute.`),
          span,
          severity: "error",
        });
      }
    }
  }

  // Recurse into markup children
  for (const child of node.children ?? []) visitGeneric(child, filePath, errors);
}

function visitGeneric(node: unknown, filePath: string, errors: AttrInterpError[]): void {
  if (!node || typeof node !== "object") return;
  const n = node as { kind?: string };
  if (n.kind === "markup") {
    visitMarkup(node as MarkupNode, filePath, errors);
    return;
  }

  // Logic block: walk body
  if (n.kind === "logic") {
    const lb = node as { body?: unknown[] };
    if (Array.isArray(lb.body)) {
      for (const c of lb.body) visitGeneric(c, filePath, errors);
    }
    return;
  }

  // Generic: walk known recursive containers
  const generic = node as Record<string, unknown>;
  if (Array.isArray(generic.children)) {
    for (const c of generic.children as unknown[]) visitGeneric(c, filePath, errors);
  }
  if (Array.isArray(generic.body)) {
    for (const c of generic.body as unknown[]) visitGeneric(c, filePath, errors);
  }
  if (Array.isArray(generic.branches)) {
    for (const c of generic.branches as unknown[]) visitGeneric(c, filePath, errors);
  }
  if (generic.target && typeof generic.target === "object") {
    const t = generic.target as { kind?: string; node?: unknown };
    if (t.kind === "markup" && t.node) visitGeneric(t.node, filePath, errors);
  }
  if (generic.then && typeof generic.then === "object") visitGeneric(generic.then, filePath, errors);
  if (generic.else && typeof generic.else === "object") visitGeneric(generic.else, filePath, errors);
}

// ---------------------------------------------------------------------------
// Public entry — single file
// ---------------------------------------------------------------------------

export function runAttributeInterpolationFile(file: {
  filePath: string;
  ast: FileAST | null | undefined;
}): AttrInterpError[] {
  const errors: AttrInterpError[] = [];
  const ast = file.ast;
  if (!ast) return errors;
  for (const n of ast.nodes ?? []) visitGeneric(n, file.filePath, errors);
  return errors;
}

/**
 * Run VP-3 over a multi-file set.
 */
export function runAttributeInterpolation(input: {
  files: Array<{ filePath: string; ast: FileAST | null | undefined }>;
}): { errors: AttrInterpError[] } {
  const all: AttrInterpError[] = [];
  for (const f of input.files) {
    all.push(...runAttributeInterpolationFile(f));
  }
  return { errors: all };
}
