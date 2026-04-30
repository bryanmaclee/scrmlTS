/**
 * VP-1 — Per-Element Attribute Allowlist
 *
 * Walks the AST and emits warnings when an attribute is unrecognized on a
 * scrml-special element (registered in `attribute-registry.js`), or when
 * the attribute is recognized but its literal string-value is not on the
 * recognized-values list (e.g. `auth="role:X"`).
 *
 * Closes:
 *   - F-AUTH-001: `auth="role:X"` silently inert on `<page>` / `<program>` /
 *     `<channel>`. (Surfaces as W-ATTR-002.)
 *   - F-CHANNEL-005: `<channel auth="role:X">` silently inert at wire level.
 *     (Same surface.)
 *
 * Severity: WARNING (`W-ATTR-001`, `W-ATTR-002`). Per OQ-10 default
 * (deep-dive §10.10), VP-1 is warn-level because scrml has historically
 * accepted unknown attributes as forwarded HTML. Promoting to error would
 * regress every page that uses a forward-compat attribute (e.g.
 * `data-testid` on `<page>`). The warning surfaces gaps without breaking.
 *
 * Scope: only scrml-special elements registered in
 * `compiler/src/attribute-registry.js`. Plain HTML elements are NOT
 * policed — they pass through as before.
 *
 * Cross-reference:
 *   - SPEC §40 (auth) + §52 (state authority).
 *   - SPEC §6 (program), §38 (channels), §51 (machines).
 */

import type { Span, FileAST, MarkupNode } from "../types/ast.ts";
import { getElementAttrSchema, isOpenAttrPrefix } from "../attribute-registry.js";

// ---------------------------------------------------------------------------
// Diagnostic shape
// ---------------------------------------------------------------------------

export interface AttrAllowlistWarning {
  code: string;
  message: string;
  span: Span;
  severity: "warning";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function attrLiteralValue(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { kind?: string; value?: unknown };
  if (v.kind !== "string-literal") return null;
  if (typeof v.value !== "string") return null;
  return v.value;
}

function valueIsRecognized(
  literal: string,
  allowedValues: string[],
  allowSubvalueColon: boolean
): boolean {
  if (allowedValues.includes(literal)) return true;
  if (allowSubvalueColon) {
    const colonIdx = literal.indexOf(":");
    if (colonIdx > 0) {
      const prefix = literal.slice(0, colonIdx);
      if (allowedValues.includes(prefix)) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Per-element validation
// ---------------------------------------------------------------------------

function visitMarkup(
  node: MarkupNode,
  filePath: string,
  warnings: AttrAllowlistWarning[]
): void {
  const tag = node.tag ?? "";
  if (!tag) return;

  const schema = getElementAttrSchema(tag);
  if (schema) {
    for (const attr of node.attrs ?? []) {
      if (!attr || !attr.name) continue;
      const name = attr.name;

      // Open-prefix attributes (bind:, on:, data-, aria-, etc.) are always
      // allowed — they are runtime-special forms with open-ended names.
      if (isOpenAttrPrefix(name)) continue;

      const spec = schema.allowedAttrs.get(name);
      if (!spec) {
        // W-ATTR-001 — unrecognized attribute name on a scrml-special element.
        const span = attr.span ?? node.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 };
        warnings.push({
          code: "W-ATTR-001",
          message:
            `W-ATTR-001: Attribute \`${name}=\` is not recognized on \`<${tag}>\`. ` +
            `It is currently forwarded to the rendered HTML as-is and has no compile-time effect. ` +
            `If you intended a scrml-specific behavior (auth scoping, route binding, etc.), ` +
            `check the spelling against the documented attributes for \`<${tag}>\`. ` +
            `If you intended a plain HTML attribute, this warning is informational.`,
          span,
          severity: "warning",
        });
        continue;
      }

      // Recognized name — check value-shape if allowedValues is declared.
      if (spec.allowedValues && spec.allowedValues.length > 0) {
        const literal = attrLiteralValue(attr.value);
        if (literal !== null) {
          // Empty string treated as recognized (HTML boolean-attribute idiom)
          if (literal === "") continue;
          if (!valueIsRecognized(literal, spec.allowedValues, spec.allowSubvalueColon)) {
            const span = attr.span ?? node.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 };
            const recognized = spec.allowedValues.map((v) => `"${v}"`).join(" | ");
            warnings.push({
              code: "W-ATTR-002",
              message:
                `W-ATTR-002: Value \`"${literal}"\` is not a recognized shape for ` +
                `\`${name}=\` on \`<${tag}>\`. ` +
                `Recognized values: ${recognized}. ` +
                `The attribute is currently accepted as-is with no compile-time enforcement. ` +
                (name === "auth"
                  ? `For role-based access control, the \`role:X\` shape is documented in the dispatch ` +
                    `app FRICTION ledger but is NOT yet implemented (see F-AUTH-001). The page is ` +
                    `silently authorized for every authenticated user; gate roles via a server fn ` +
                    `until the ergonomic completion lands.`
                  : `Use one of the recognized values to ensure the attribute does what its name implies.`),
              span,
              severity: "warning",
            });
          }
        }
      }
    }
  }

  // Recurse into markup children
  for (const child of node.children ?? []) visitGeneric(child, filePath, warnings);
}

function visitGeneric(node: unknown, filePath: string, warnings: AttrAllowlistWarning[]): void {
  if (!node || typeof node !== "object") return;
  const n = node as { kind?: string };
  if (n.kind === "markup") {
    visitMarkup(node as MarkupNode, filePath, warnings);
    return;
  }
  if (n.kind === "logic") {
    const lb = node as { body?: unknown[] };
    if (Array.isArray(lb.body)) {
      for (const c of lb.body) visitGeneric(c, filePath, warnings);
    }
    return;
  }
  const generic = node as Record<string, unknown>;
  if (Array.isArray(generic.children)) {
    for (const c of generic.children as unknown[]) visitGeneric(c, filePath, warnings);
  }
  if (Array.isArray(generic.body)) {
    for (const c of generic.body as unknown[]) visitGeneric(c, filePath, warnings);
  }
  if (Array.isArray(generic.branches)) {
    for (const c of generic.branches as unknown[]) visitGeneric(c, filePath, warnings);
  }
  if (generic.target && typeof generic.target === "object") {
    const t = generic.target as { kind?: string; node?: unknown };
    if (t.kind === "markup" && t.node) visitGeneric(t.node, filePath, warnings);
  }
  if (generic.then && typeof generic.then === "object") visitGeneric(generic.then, filePath, warnings);
  if (generic.else && typeof generic.else === "object") visitGeneric(generic.else, filePath, warnings);
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export function runAttributeAllowlistFile(file: {
  filePath: string;
  ast: FileAST | null | undefined;
}): AttrAllowlistWarning[] {
  const warnings: AttrAllowlistWarning[] = [];
  const ast = file.ast;
  if (!ast) return warnings;
  for (const n of ast.nodes ?? []) visitGeneric(n, file.filePath, warnings);
  return warnings;
}

/**
 * Run VP-1 over a multi-file set.
 */
export function runAttributeAllowlist(input: {
  files: Array<{ filePath: string; ast: FileAST | null | undefined }>;
}): { errors: AttrAllowlistWarning[] } {
  const all: AttrAllowlistWarning[] = [];
  for (const f of input.files) {
    all.push(...runAttributeAllowlistFile(f));
  }
  return { errors: all };
}
