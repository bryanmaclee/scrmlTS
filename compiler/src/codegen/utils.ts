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

/**
 * A scrml function parameter — either a bare string (legacy "name:Type" form)
 * or a structured object produced by `parseParamList` in `ast-builder.js`.
 *
 * Structured shape (post-§7.3.2 — A3 default-parameter support):
 *   { name: string, typeAnnotation?: string, defaultValue?: string, isLin?: boolean, isRest?: boolean }
 *
 * Param.defaultValue, when present, is the RAW source text of the default
 * expression (`"0"`, `"start"`, `'"hello"'`, `"() => 42"`). It compiles
 * directly into the emitted JS via `${name} = ${defaultValue}` per §7.3.2.
 */
export type ParamLike = string | {
  name?: string;
  typeAnnotation?: string;
  defaultValue?: string;
  isLin?: boolean;
  isRest?: boolean;
  [key: string]: unknown;
};

/**
 * Extract the bare parameter NAME (no type annotation, no default value).
 * Used at call sites (e.g. `fetchStub(${paramNames.join(", ")})`) where we
 * want the identifier only.
 *
 * @param p the param entry from `fnNode.params`
 * @param i the param's index in the list (for synthesizing `_scrml_arg_N`)
 */
export function paramName(p: ParamLike, i: number): string {
  if (typeof p === "string") return p.split(":")[0].trim();
  return p.name ?? `_scrml_arg_${i}`;
}

/**
 * Format ONE parameter for a function-DECLARATION signature.
 *
 * §7.3.2: default parameters compile directly to JavaScript default parameter
 * syntax. When `p.defaultValue` is present, the output is `name = defaultValue`;
 * otherwise the bare `name` is emitted. Rest-parameter (`...name`) prefix is
 * applied when `p.isRest === true`.
 *
 * NOT for call-site argument lists — use `paramName()` there.
 *
 * @param p the param entry from `fnNode.params`
 * @param i the param's index in the list (for synthesizing `_scrml_arg_N`)
 */
export function paramSignature(p: ParamLike, i: number): string {
  if (typeof p === "string") return p.split(":")[0].trim();
  const name = p.name ?? `_scrml_arg_${i}`;
  const rest = p.isRest ? "..." : "";
  const def = typeof p.defaultValue === "string" && p.defaultValue.trim().length > 0
    ? ` = ${p.defaultValue}`
    : "";
  return `${rest}${name}${def}`;
}
