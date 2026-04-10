/**
 * Build the HTTP route path for a server function.
 */
export function routePath(generatedRouteName: string): string {
  return `/_scrml/${generatedRouteName}`;
}

/**
 * Escape a string for use in an HTML attribute value.
 */
export function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replace `@varName` references in a CSS value string with CSS custom property
 * references: `var(--scrml-varName)`.
 *
 * @param value — raw CSS value text potentially containing @var refs
 * @returns CSS value with @var replaced by var(--scrml-varName)
 */
export function replaceCssVarRefs(value: string): string {
  return value.replace(/@([A-Za-z_$][A-Za-z0-9_$]*)/g, "var(--scrml-$1)");
}

export const VOID_ELEMENTS = new Set<string>([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);
