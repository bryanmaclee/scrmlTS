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

import type { Span, FileAST, MarkupNode } from "../types/ast.ts";
import { getElementAttrSchema } from "../attribute-registry.js";
import { walkFileAst } from "./ast-walk.ts";

// ---------------------------------------------------------------------------
// Diagnostic shape
// ---------------------------------------------------------------------------

export interface AttrInterpError {
  code: string;
  message: string;
  span: Span;
  severity: "error";
}

// ---------------------------------------------------------------------------
// Per-element error code mapping
// ---------------------------------------------------------------------------

const ELEMENT_ERROR_CODE = new Map<string, string>([
  ["channel", "E-CHANNEL-007"],
]);

function errorCodeFor(tag: string): string {
  return ELEMENT_ERROR_CODE.get(tag.toLowerCase()) ?? "E-ATTR-001";
}

// ---------------------------------------------------------------------------
// Detection: literal containing `${`
// ---------------------------------------------------------------------------

function attrValueHasInterpolation(value: unknown): { match: boolean; raw?: string } {
  if (!value || typeof value !== "object") return { match: false };
  const v = value as { kind?: string; value?: unknown };
  if (v.kind !== "string-literal") return { match: false };
  if (typeof v.value !== "string") return { match: false };
  return { match: v.value.includes("${"), raw: v.value };
}

// ---------------------------------------------------------------------------
// Per-markup-node validation
// ---------------------------------------------------------------------------

function validateMarkup(
  node: MarkupNode,
  filePath: string,
  errors: AttrInterpError[]
): void {
  const tag = node.tag ?? "";
  if (!tag) return;
  const schema = getElementAttrSchema(tag);
  if (!schema) return;

  for (const attr of node.attrs ?? []) {
    if (!attr || !attr.name) continue;
    const spec = schema.allowedAttrs.get(attr.name);
    if (!spec) continue; // unknown attr — VP-1's territory.
    if (spec.supportsInterpolation === true) continue;

    const detection = attrValueHasInterpolation(attr.value);
    if (!detection.match) continue;

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

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export function runAttributeInterpolationFile(file: {
  filePath: string;
  ast: FileAST | null | undefined;
}): AttrInterpError[] {
  const errors: AttrInterpError[] = [];
  const ast = file.ast;
  if (!ast) return errors;

  walkFileAst(ast, (node) => {
    if (!node || typeof node !== "object") return;
    const n = node as { kind?: string };
    if (n.kind !== "markup") return;
    validateMarkup(node as MarkupNode, file.filePath, errors);
  });

  return errors;
}

export function runAttributeInterpolation(input: {
  files: Array<{ filePath: string; ast: FileAST | null | undefined }>;
}): { errors: AttrInterpError[] } {
  const all: AttrInterpError[] = [];
  for (const f of input.files) {
    all.push(...runAttributeInterpolationFile(f));
  }
  return { errors: all };
}
