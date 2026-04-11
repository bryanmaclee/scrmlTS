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
 * Detect whether a css-inline block is "flat-declaration" — i.e. all rules are
 * bare `prop: value;` pairs with no selectors. Flat-declaration blocks inside a
 * component scope compile to inline `style=""` on the containing element (DQ-7),
 * not to a scoped CSS file entry.
 *
 * A block is flat-declaration when:
 *   - It has a `rules` array (not a raw body string), AND
 *   - Every rule has `rule.prop` set and NO rule has `rule.selector`
 *
 * Program-level flat-declaration blocks are NOT affected — they still emit to the
 * global stylesheet.
 */
export function isFlatDeclarationBlock(block: { rules?: unknown; body?: string; text?: string; value?: string }): boolean {
  const rules = (block as CSSBlock).rules;
  if (!rules || !Array.isArray(rules) || rules.length === 0) return false;
  return rules.every(r => r.prop != null && r.selector == null);
}

/**
 * Render a flat-declaration css-inline block as an inline CSS `style=""` value.
 * Returns the raw "prop: value; prop: value;" string (no surrounding quotes).
 * Used by emit-html.ts to inject `style="..."` attributes.
 */
export function renderFlatDeclarationAsInlineStyle(block: { rules?: unknown }): string {
  const rules = (block as CSSBlock).rules;
  if (!rules || !Array.isArray(rules)) return "";
  const parts: string[] = [];
  for (const rule of rules) {
    if (rule.prop && rule.value !== undefined) {
      let value = rule.value;
      if (rule.reactiveRefs && rule.reactiveRefs.length > 0) {
        if (rule.isExpression) {
          const exprPropName = `scrml-expr-${rule.reactiveRefs.map((r: { name: string }) => r.name).join("-")}`;
          value = `var(--${exprPropName})`;
        } else {
          value = replaceCssVarRefs(value);
        }
      }
      parts.push(`${rule.prop}: ${value};`);
    }
  }
  return parts.join(" ");
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
 *   @scope ([data-scrml="ComponentName"]) to ([data-scrml]) {
 *     /* original rules unchanged *\/
 *   }
 *
 * The "donut scope" (`to ([data-scrml])`) ensures rules do not bleed into nested
 * components that have their own [data-scrml] attribute (DQ-7 native @scope).
 *
 * Flat-declaration #{} blocks inside a component scope (blocks with only bare
 * `prop: value;` pairs and no selectors) are skipped here — emit-html.ts emits
 * them as inline `style=""` attributes on the containing element (DQ-7).
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

  // --- Component-scoped CSS (wrapped in @scope, DQ-7 native CSS @scope) ---
  // Flat-declaration #{} blocks (all bare prop:value, no selectors) are skipped —
  // emit-html.ts handles them as inline style="" attributes.
  /** componentName → rendered CSS fragments */
  const componentCssMap = new Map<string, string[]>();

  for (const block of componentInlineBlocks) {
    // Skip flat-declaration blocks — they're emitted as inline style by emit-html.ts
    if (isFlatDeclarationBlock(block)) continue;

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
    // DQ-7: native CSS @scope with donut boundary.
    // data-scrml="Name" is the scope root. [data-scrml] (any value) is the donut limit —
    // rules do not bleed into nested constructor boundaries.
    const scopeBlock = [
      `@scope ([data-scrml="${name}"]) to ([data-scrml]) {`,
      cssParts.join("\n"),
      `}`,
    ].join("\n");
    parts.push(scopeBlock);
  }

  return parts.join("\n");
}
