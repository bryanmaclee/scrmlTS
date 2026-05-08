/**
 * compiler/src/multi-statement-scan.ts
 *
 * A1b B18 helper — single-pass character walker that finds every top-level
 * semicolon in a text region, where "top-level" means OUTSIDE all of:
 *
 *   - paren depth `(...)` (call args, grouped expressions)
 *   - brace depth `{...}` (block bodies, object literals, ${...}-interpolation)
 *   - bracket depth `[...]` (array literals, index expressions)
 *   - single-quoted string `'...'` (with `\`-escape)
 *   - double-quoted string `"..."` (with `\`-escape)
 *   - backtick template literal `` `...` `` (with `\`-escape)
 *   - line comment `// ... \n`
 *   - block comment `/* ... *\/`
 *
 * Inside a backtick template literal, `${...}` opens a brace-tracked region
 * — `;` inside the interpolation is treated as expression-internal (i.e.,
 * NOT a top-level hit) because brace depth > 0 throughout. This is the
 * conservative reading: JS template-literal interpolations only allow
 * expressions, so `;` inside them is invalid input anyway, and treating
 * such `;` as expression-internal avoids false positives if the user
 * embeds a string-template fragment inside an attribute value.
 *
 * SPEC authority:
 *   - §5.2.3 lines 1140-1144 (event-handler bare-form rule, expression-
 *     internal exception)
 *   - §4.14 line 980 (`:`-shorthand body multi-statement rejection)
 *   - §34 catalog row 14260 (E-MULTI-STATEMENT-HANDLER)
 *
 * Two fire-sites consume this helper:
 *   1. ast-builder.js markup branch — scan the opener portion of `block.raw`
 *      to detect multi-statement event-handler attribute values.
 *   2. symbol-table.ts SYM PASS 11 (validateEngineStateChildrenAndRules) —
 *      scan `bodyRaw` of `:`-shorthand engine state-children.
 */

export interface SemicolonHit {
  /** Offset (relative to the input text) where the top-level `;` was found. */
  offset: number;
}

/**
 * Scan `text` and return every top-level semicolon's offset.
 *
 * Returns `[]` when no top-level `;` appears OR when input is empty / non-
 * string. Defensive against malformed input — unterminated strings/comments
 * just consume to end-of-input without erroring.
 */
export function scanForTopLevelSemicolon(text: string): SemicolonHit[] {
  const hits: SemicolonHit[] = [];
  if (typeof text !== "string" || text.length === 0) return hits;

  const len = text.length;
  let pos = 0;
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;

  while (pos < len) {
    const c = text[pos]!;
    const next = pos + 1 < len ? text[pos + 1]! : "";

    // ---- Comments (only outside strings; we re-enter from top each iter) ----
    if (c === "/" && next === "/") {
      pos += 2;
      while (pos < len && text[pos] !== "\n") pos++;
      // leave \n for the outer loop's general-character path
      continue;
    }
    if (c === "/" && next === "*") {
      pos += 2;
      while (pos < len) {
        if (text[pos] === "*" && pos + 1 < len && text[pos + 1] === "/") {
          pos += 2;
          break;
        }
        pos++;
      }
      continue;
    }

    // ---- String openers ----
    if (c === '"') {
      pos++;
      while (pos < len) {
        const sc = text[pos]!;
        if (sc === "\\" && pos + 1 < len) { pos += 2; continue; }
        if (sc === '"') { pos++; break; }
        pos++;
      }
      continue;
    }
    if (c === "'") {
      pos++;
      while (pos < len) {
        const sc = text[pos]!;
        if (sc === "\\" && pos + 1 < len) { pos += 2; continue; }
        if (sc === "'") { pos++; break; }
        pos++;
      }
      continue;
    }
    if (c === "`") {
      // Backtick template — track interpolation `${...}` via brace depth.
      pos++;
      let interpDepth = 0;
      while (pos < len) {
        const tc = text[pos]!;
        if (tc === "\\" && pos + 1 < len) { pos += 2; continue; }
        if (interpDepth > 0) {
          // Inside ${...} — track nested braces and inner strings/comments.
          if (tc === "{") { interpDepth++; pos++; continue; }
          if (tc === "}") { interpDepth--; pos++; continue; }
          // Inside the interpolation, treat strings/comments minimally —
          // since `;` inside an interpolation is expression-internal anyway,
          // we don't need fine-grained tracking. But we DO need to handle
          // string openers so a `}` inside a string doesn't close the interp.
          if (tc === '"') {
            pos++;
            while (pos < len) {
              const ssc = text[pos]!;
              if (ssc === "\\" && pos + 1 < len) { pos += 2; continue; }
              if (ssc === '"') { pos++; break; }
              pos++;
            }
            continue;
          }
          if (tc === "'") {
            pos++;
            while (pos < len) {
              const ssc = text[pos]!;
              if (ssc === "\\" && pos + 1 < len) { pos += 2; continue; }
              if (ssc === "'") { pos++; break; }
              pos++;
            }
            continue;
          }
          if (tc === "`") {
            // Nested template literal inside interpolation — recurse via
            // a self-call on the slice. For our purposes, just consume to
            // matching backtick (without further nested-interp accounting,
            // since this is rare in attribute values).
            pos++;
            let nestDepth = 0;
            while (pos < len) {
              const ntc = text[pos]!;
              if (ntc === "\\" && pos + 1 < len) { pos += 2; continue; }
              if (nestDepth > 0) {
                if (ntc === "{") nestDepth++;
                else if (ntc === "}") nestDepth--;
                pos++;
                continue;
              }
              if (ntc === "`") { pos++; break; }
              if (ntc === "$" && pos + 1 < len && text[pos + 1] === "{") {
                nestDepth = 1;
                pos += 2;
                continue;
              }
              pos++;
            }
            continue;
          }
          pos++;
          continue;
        }
        // Outside interpolation, inside backtick body.
        if (tc === "$" && pos + 1 < len && text[pos + 1] === "{") {
          interpDepth = 1;
          pos += 2;
          continue;
        }
        if (tc === "`") { pos++; break; }
        pos++;
      }
      continue;
    }

    // ---- Bracket / paren / brace tracking ----
    if (c === "(") { parenDepth++; pos++; continue; }
    if (c === ")") { if (parenDepth > 0) parenDepth--; pos++; continue; }
    if (c === "[") { bracketDepth++; pos++; continue; }
    if (c === "]") { if (bracketDepth > 0) bracketDepth--; pos++; continue; }
    if (c === "{") { braceDepth++; pos++; continue; }
    if (c === "}") { if (braceDepth > 0) braceDepth--; pos++; continue; }

    // ---- Top-level semicolon? ----
    if (c === ";") {
      if (parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
        hits.push({ offset: pos });
      }
      pos++;
      continue;
    }

    pos++;
  }

  return hits;
}

/**
 * Test whether an attribute name is in the event-handler family for the
 * purpose of L19 (multi-statement-handler) enforcement.
 *
 * Per SPEC §5.2.3 the rule applies to bare-form event-handler attributes.
 * The recognized shapes (per primer §9.6 + ast-builder existing handling):
 *
 *   - `on<word>` lowercase HTML event names: `onclick`, `onsubmit`, ...
 *   - `on:<word>` namespaced-event syntax (Svelte-derived; §5.2.x)
 *   - `onserver:<word>` / `onclient:<word>` channel-handler attrs (§38.6.1)
 *
 * BRIEF.md OUT OF SCOPE called out the `onserver:`/`onclient:` cases as
 * scope-restrictable; per saved survey §1(a) we include them via prefix
 * match (the same single-expression discipline applies and the regex is
 * broad enough to cover the family without false positives elsewhere).
 */
export function isEventHandlerAttrName(name: string): boolean {
  if (typeof name !== "string" || name.length === 0) return false;
  if (/^on[a-z]+$/i.test(name)) return true;
  if (/^on:/i.test(name)) return true;
  if (/^onserver:/i.test(name)) return true;
  if (/^onclient:/i.test(name)) return true;
  return false;
}
