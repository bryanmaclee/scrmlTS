import { collectCssBlocks } from "./collect.ts";
import { replaceCssVarRefs } from "./utils.ts";

/** A CSS declaration: property + value with optional reactive references. */
interface CSSDeclaration {
  prop: string;
  value: string;
  reactiveRefs?: Array<{ name: string }>;
  isExpression?: boolean;
}

/** A CSS rule: either grouped (selector + declarations) or flat (prop + value). */
interface CSSRule {
  selector?: string;
  declarations?: CSSDeclaration[];
  prop?: string;
  value?: string;
  reactiveRefs?: Array<{ name: string }>;
  isExpression?: boolean;
}

/** A CSS block node (css-inline or style block) from the AST. */
interface CSSBlock {
  rules?: CSSRule[];
  body?: string;
  text?: string;
  value?: string;
  _componentScope?: string | null;
}

/**
 * Render the CSS rules from a single CSS block (inline #{} or style block)
 * into a CSS string fragment.
 */
function renderCssBlock(block: CSSBlock): string {
  if (block.rules && Array.isArray(block.rules)) {
    const ruleParts: string[] = [];
    for (const rule of block.rules) {
      if (rule.selector && rule.declarations) {
        // Grouped rule: selector { declarations }
        const declParts: string[] = [];
        for (const decl of rule.declarations) {
          let value = decl.value;
          if (decl.reactiveRefs && decl.reactiveRefs.length > 0) {
            if (decl.isExpression) {
              const exprPropName = `scrml-expr-${decl.reactiveRefs.map(r => r.name).join("-")}`;
              value = `var(--${exprPropName})`;
            } else {
              value = replaceCssVarRefs(value);
            }
          }
          declParts.push(`${decl.prop}: ${value};`);
        }
        ruleParts.push(`${rule.selector} { ${declParts.join(" ")} }`);
      } else if (rule.selector) {
        // Flat selector (no braces — legacy / unusual)
        ruleParts.push(rule.selector);
      } else if (rule.prop && rule.value !== undefined) {
        let value = rule.value;
        if (rule.reactiveRefs && rule.reactiveRefs.length > 0) {
          if (rule.isExpression) {
            const exprPropName = `scrml-expr-${rule.reactiveRefs.map(r => r.name).join("-")}`;
            value = `var(--${exprPropName})`;
          } else {
            value = replaceCssVarRefs(value);
          }
        }
        ruleParts.push(`${rule.prop}: ${value};`);
      }
    }
    return ruleParts.join(" ");
  }
  // Fallback: use body/text/value string directly (backward compat with tests)
  return block.body ?? block.text ?? block.value ?? "";
}

/**
 * Collect and concatenate all CSS from inline #{} blocks and <style> blocks.
 * When a CSS rule contains reactive @var references, replaces them with
 * CSS custom property references (var(--scrml-varName)).
 *
 * Component-scoped CSS (blocks inside a component expanded by CE, tagged with
 * `_componentScope` by collectCssBlocks) is wrapped in a native CSS @scope block:
 *
 *   @scope ([data-scrml-scope="ComponentName"]) to ([data-scrml-scope]:not([data-scrml-scope="ComponentName"])) {
 *     /* original rules unchanged *\/
 *   }
 *
 * The "donut scope" (`to (...)`) ensures rules do not bleed into nested
 * components that have their own scope boundary.
 *
 * Program-level CSS (not inside any component) is emitted without wrapping.
 *
 * @param nodes  — top-level AST nodes
 */
export function generateCss(nodes: object[], cssBlocks?: { inlineBlocks: object[]; styleBlocks: object[] }): string {
  const { inlineBlocks, styleBlocks } = cssBlocks ?? collectCssBlocks(nodes);

  // Separate program-level blocks from component-scoped blocks.
  const programInlineBlocks = (inlineBlocks as CSSBlock[]).filter(b => b._componentScope == null);
  const componentInlineBlocks = (inlineBlocks as CSSBlock[]).filter(b => b._componentScope != null);
  const programStyleBlocks = (styleBlocks as CSSBlock[]).filter(b => b._componentScope == null);
  const componentStyleBlocks = (styleBlocks as CSSBlock[]).filter(b => b._componentScope != null);

  const parts: string[] = [];

  // --- Program-level CSS (no @scope wrapping) ---
  for (const block of programInlineBlocks) {
    const css = renderCssBlock(block);
    if (css) parts.push(css);
  }
  for (const block of programStyleBlocks) {
    const body = block.body ?? block.text ?? block.value ?? "";
    if (body) parts.push(body);
  }

  // --- Component-scoped CSS (wrapped in @scope) ---
  /** componentName → rendered CSS fragments */
  const componentCssMap = new Map<string, string[]>();

  for (const block of componentInlineBlocks) {
    const name = block._componentScope!;
    const css = renderCssBlock(block);
    if (!css) continue;
    if (!componentCssMap.has(name)) componentCssMap.set(name, []);
    componentCssMap.get(name)!.push(css);
  }
  for (const block of componentStyleBlocks) {
    const name = block._componentScope!;
    const body = block.body ?? block.text ?? block.value ?? "";
    if (!body) continue;
    if (!componentCssMap.has(name)) componentCssMap.set(name, []);
    componentCssMap.get(name)!.push(body);
  }

  for (const [name, cssParts] of componentCssMap) {
    const scopeBlock = [
      `@scope ([data-scrml-scope="${name}"]) to ([data-scrml-scope]:not([data-scrml-scope="${name}"])) {`,
      cssParts.join("\n"),
      `}`,
    ].join("\n");
    parts.push(scopeBlock);
  }

  return parts.join("\n");
}
