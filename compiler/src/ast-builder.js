/**
 * AST Builder — Stage 3b of the scrml compiler pipeline (TAB).
 *
 * Receives the Block tree from the Block Splitter and the token streams
 * produced by the Tokenizer, then constructs a typed FileAST.
 *
 * Input:  { filePath: string, blocks: Block[] }   (BS output)
 * Output: { filePath: string, ast: FileAST, errors: TABError[] }
 *
 * FileAST = {
 *   filePath: string,
 *   nodes:      ASTNode[],
 *   imports:    ImportDecl[],
 *   exports:    ExportDecl[],
 *   components: ComponentDef[],
 *   typeDecls:  TypeDecl[],
 *   spans:      SpanTable,       // nodeId → Span
 * }
 *
 * ASTNode discriminated by `.kind`:
 *   'markup'      — MarkupElement
 *   'state'       — StateBlock
 *   'state-constructor-def' — StateConstructorDef (§35.2)
 *   'logic'       — LogicBlock
 *   'sql'         — SQLBlock
 *   'css-inline'  — CSSInlineBlock
 *   'style'       — StyleBlock
 *   'error-effect' — ErrorEffectBlock
 *   'meta'        — MetaBlock
 *   'text'        — TextNode
 *   'comment'     — CommentNode
 *   'throw-stmt'  — ThrowStmt (§19) — error throw expression
 *   'guarded-expr' — GuardedExpr (§19) — expression with !{} error context
 *
 * Every node carries a `span` field. Spans reference the preprocessed source.
 * No type information, no scope resolution, no code generation here.
 */

import {
  tokenizeAttributes as _defaultTokenizeAttributes,
  tokenizeLogic as _defaultTokenizeLogic,
  tokenizeSQL as _defaultTokenizeSQL,
  tokenizeCSS as _defaultTokenizeCSS,
  tokenizeError as _defaultTokenizeError,
  tokenizePassthrough as _defaultTokenizePassthrough,
} from "./tokenizer.ts";

import { parseExprToNode } from "./expression-parser.ts";

/**
 * Phase 3.5: detect expressions that should NOT be parsed to ExprNode.
 * Returns true for:
 * - HTML tag fragments (tokenizer-spaced: `< / span >`, `< button onclick = ...`)
 * - Leading-dot method chains (`. all ( )` SQL continuations)
 * - C-style for-loop headers (`( let i = 0 ; i < 10 ; i + + )`)
 * - emit() calls with embedded HTML strings
 *
 * These patterns produce EscapeHatchExpr nodes that always fall back to the
 * string pipeline. Skipping them avoids the escape hatch round-trip.
 */
function shouldSkipExprParse(expr) {
  if (!expr || typeof expr !== "string") return true;
  const t = expr.trim();
  if (!t) return true;
  // HTML tag fragments: starts with `<` or `>` (tag content/closers) or contains tag syntax
  if (/^\s*</.test(t)) return true;
  if (/^\s*>/.test(t)) return true;
  // Closing tag fragments in the middle: `</span>`, `< / span >`
  if (/< \/ [a-z]/i.test(t)) return true;
  // Multi-line strings with embedded HTML (e.g. emit("<div>...\n...</div>"))
  if (/\n/.test(t) && /<[a-z]/i.test(t)) return true;
  // Leading dot: `.method()` chain continuations (not a standalone expression)
  if (/^\s*\./.test(t)) return true;
  // C-style for-loop header: `( init ; cond ; update )`
  if (/^\s*\(/.test(t) && /;\s*/.test(t) && t.trim().endsWith(")")) return true;
  return false;
}

/**
 * Module-level safe expression parser — wraps parseExprToNode in try/catch.
 * Returns undefined on failure. Used by parseAttributes (module-level scope)
 * and other module-level helpers that need ExprNode but lack access to the
 * closure-scoped safeParseExprToNode inside parseLogicBody.
 */
function safeParseExprToNodeGlobal(expr, filePath, startOffset) {
  if (!expr || typeof expr !== "string" || !expr.trim()) return undefined;
  if (shouldSkipExprParse(expr)) return undefined;
  try {
    return parseExprToNode(expr, filePath, startOffset ?? 0);
  } catch (_e) {
    return undefined;
  }
}

// Module-level tokenizer references — overridable by buildAST(bsOutput, tokenizerOverrides)
let tokenizeAttributes = _defaultTokenizeAttributes;
let tokenizeLogic = _defaultTokenizeLogic;
let tokenizeSQL = _defaultTokenizeSQL;
let tokenizeCSS = _defaultTokenizeCSS;
let tokenizeError = _defaultTokenizeError;
let tokenizePassthrough = _defaultTokenizePassthrough;

// ---------------------------------------------------------------------------
// Pre-tokenization preprocessing
// ---------------------------------------------------------------------------

/**
 * Preprocess raw text before tokenization to handle constructs the tokenizer
 * can't parse. The tokenizer drops `#` characters, so `<#name>.send(...)` and
 * `<#name>` must be replaced with placeholder identifiers before tokenization.
 *
 * Order matters: worker refs (<#name>.send) must be replaced BEFORE input state
 * refs (<#name>) to avoid partial matches.
 */
function preprocessWorkerAndStateRefs(raw) {
  if (!raw || !raw.includes("<#")) return raw;
  // <#name>.send( → _scrml_worker_name.send(
  raw = raw.replace(/<#([A-Za-z_$][A-Za-z0-9_$]*)>\s*\.\s*send\s*\(/g, '_scrml_worker_$1.send(');
  // when message from <#name> → when message from _scrml_worker_name
  raw = raw.replace(/when\s+message\s+from\s+<#([A-Za-z_$][A-Za-z0-9_$]*)>/g, 'when message from _scrml_worker_$1');
  // when error from <#name> → when error from _scrml_worker_name
  raw = raw.replace(/when\s+error\s+from\s+<#([A-Za-z_$][A-Za-z0-9_$]*)>/g, 'when error from _scrml_worker_$1');
  // <#name> (standalone state ref) → _scrml_input_$1_
  raw = raw.replace(/<#([A-Za-z_$][A-Za-z0-9_$]*)>/g, '_scrml_input_$1_');
  return raw;
}

// ---------------------------------------------------------------------------
// Block-level pre-processing: bare top-level declaration lifting
// ---------------------------------------------------------------------------

/**
 * Regex that matches text blocks starting with a bare declaration keyword.
 * Matches (at the start of the raw content, which may have leading whitespace):
 *   server fn <name>  |  server function <name>  |  fn <name>
 *   function <name>   |  type <name>
 */
const BARE_DECL_RE = /^\s*(server\s+(?:fn|function)\s|type\s+\w|fn\s+\w|function\s+\w)/;

/**
 * Walk a block tree and convert text blocks that start with a bare declaration
 * keyword into synthetic logic blocks.
 *
 * This enables bare top-level declarations inside any markup or state context:
 *
 *   <program>
 *     type Color:enum = { Red, Green, Blue }
 *     fn greet(name) { return "Hello " + name }
 *     server fn getData() { return ?{ SELECT * FROM items } }
 *   </program>
 *
 * The synthetic logic block wraps the raw text with `${` and `}` so buildBlock
 * case "logic" processes it normally (it slices off the first 2 and last 1 chars
 * to recover the original text as the body).
 *
 * Only text blocks whose trimmed content STARTS with a bare declaration keyword
 * are lifted. Plain whitespace-only text or markup content is left as-is.
 *
 * @param {object[]} blocks  — Block[] from the Block Splitter
 * @returns {object[]}  — transformed Block[] (new array, no mutation)
 */
function liftBareDeclarations(blocks) {
  return blocks.map(block => {
    // Recursively process children of markup/state contexts
    if (block.type === "markup" || block.type === "state") {
      const newChildren = liftBareDeclarations(block.children || []);
      return { ...block, children: newChildren };
    }

    // Convert text blocks that start with a bare declaration keyword
    if (block.type === "text" && BARE_DECL_RE.test(block.raw)) {
      return {
        type: "logic",
        raw: "${" + block.raw + "}",
        span: block.span,
        depth: block.depth,
        children: [],       // text blocks have no block children
        name: null,
        closerForm: null,
        isComponent: false,
        _synthetic: true,   // diagnostic marker
      };
    }

    return block;
  });
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class TABError extends Error {
  constructor(code, message, span) {
    super(`${message} (line ${span.line}, col ${span.col})`);
    this.name = "TABError";
    this.code = code;
    this.tabSpan = span;
  }
}

// ---------------------------------------------------------------------------
// Span helpers
// ---------------------------------------------------------------------------

/**
 * Attach `file` to a block-splitter span to produce a full Span.
 * BS spans have: { start, end, line, col }.
 * Full spans add: { file }.
 */
function fullSpan(bsSpan, filePath) {
  return {
    file: filePath,
    start: bsSpan.start,
    end: bsSpan.end,
    line: bsSpan.line,
    col: bsSpan.col,
  };
}

function tokenSpan(tok, filePath) {
  return {
    file: filePath,
    start: tok.span.start,
    end: tok.span.end,
    line: tok.span.line,
    col: tok.span.col,
  };
}

// ---------------------------------------------------------------------------
// Match arm arrow helper (§18, §19)
// ---------------------------------------------------------------------------

/**
 * Returns true if `tok` is a match arm arrow token.
 * Accepts both the canonical `=>` and the alias `:>` (§18, §19).
 */
function isMatchArrow(tok) {
  return tok != null && tok.kind === "OPERATOR" && (tok.text === "=>" || tok.text === ":>");
}

// ---------------------------------------------------------------------------
// Known boolean HTML attributes (E-ATTR-002 set)
// ---------------------------------------------------------------------------

const BOOLEAN_ATTRS = new Set([
  "disabled",
  "checked",
  "readonly",
  "required",
  "selected",
  "multiple",
  "open",
  "hidden",
]);

// ---------------------------------------------------------------------------
// Supported bind: directive names (§5.4)
// ---------------------------------------------------------------------------

const BIND_DIRECTIVES = new Set([
  "bind:value",
  "bind:checked",
  "bind:selected",
  "bind:group",
  "bind:files",
]);

// ---------------------------------------------------------------------------
// Block context → user-readable label
// ---------------------------------------------------------------------------

/**
 * Convert an internal blockContext string to the user-facing label used in
 * diagnostic messages.  This keeps internal identifier names out of error
 * text.
 *
 * @param {string} ctx  — internal context string ('meta', 'sql', 'css', etc.)
 * @returns {string}    — human-readable label including the delimiter syntax
 */
function contextLabel(ctx) {
  switch (ctx) {
    case "meta":    return "`^{ }` meta";
    case "sql":     return "`?{ }` SQL";
    case "css":     return "`#{ }` CSS";
    case "error":   return "`!{ }` error";
    case "state":   return "state";
    case "markup":  return "markup";
    default:        return `\`${ctx}\``;
  }
}

// ---------------------------------------------------------------------------
// Attribute parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parse the attribute token stream produced by tokenizeAttributes() into
 * AttrNode[].
 *
 * AttrNode = { name: string, value: AttrValue, span: Span }
 * AttrValue =
 *   | { kind: 'string-literal', value: string }
 *   | { kind: 'variable-ref',   name: string }
 *   | { kind: 'call-ref',       name: string, args: string[] }
 *   | { kind: 'expr',           raw: string, refs: string[] }
 *   | { kind: 'absent' }
 *
 * @param {import('./tokenizer.ts').Token[]} tokens
 * @param {string} filePath
 * @param {TABError[]} errors
 * @param {boolean} [isComponent=false]  — true when parsing attrs for a component call site.
 *   Unrecognized bind: names skip E-ATTR-011 when true (§15.11.1 — CE validates component
 *   bind: props against the propsDecl and emits E-COMPONENT-013 if prop is not bindable).
 * @returns {AttrNode[]}
 */
function parseAttributes(tokens, filePath, errors, isComponent = false) {
  const attrs = [];
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];

    if (tok.kind === "ATTR_NAME") {
      const nameSpan = tokenSpan(tok, filePath);
      const name = tok.text;
      i++;

      // Check for ATTR_EQ
      if (i < tokens.length && tokens[i].kind === "ATTR_EQ") {
        i++; // consume `=`

        if (i < tokens.length) {
          const valTok = tokens[i];
          i++;

          let value;
          const valSpan = tokenSpan(valTok, filePath);
          if (valTok.kind === "ATTR_STRING") {
            value = { kind: "string-literal", value: valTok.text, span: valSpan };
            // E-ATTR-002: boolean attribute with a quoted string value
            if (BOOLEAN_ATTRS.has(name)) {
              errors.push(new TABError(
                "E-ATTR-002",
                `E-ATTR-002: Attribute \`${name}\` is a boolean attribute but was given a quoted string value \`"${valTok.text}"\`. ` +
                `Use an unquoted boolean expression instead — for example \`${name}=myBoolVar\` or omit the value entirely for \`${name}\` (presence = true).`,
                valSpan,
              ));
            }
          } else if (valTok.kind === "ATTR_CALL") {
            // text is JSON.stringify({ name, args })
            let parsed;
            try { parsed = JSON.parse(valTok.text); } catch { parsed = { name: valTok.text, args: "" }; }
            const rawArgs = parsed.args || "";
            // Split args on commas, handling nested parens
            const argList = rawArgs.trim().length === 0
              ? []
              : splitArgs(rawArgs);
            const _argExprNodes = argList.map(a => safeParseExprToNodeGlobal(a, filePath, valSpan?.start ?? 0)).filter(Boolean);
            value = { kind: "call-ref", name: parsed.name, args: argList, argExprNodes: _argExprNodes.length === argList.length ? _argExprNodes : undefined, span: valSpan };
          } else if (valTok.kind === "ATTR_IDENT") {
            value = { kind: "variable-ref", name: valTok.text, exprNode: safeParseExprToNodeGlobal(valTok.text, filePath, valSpan?.start ?? 0), span: valSpan };
          } else if (valTok.kind === "ATTR_BLOCK") {
            if (name === "props") {
              // Brace-block attribute value: `props={...}` typed props declaration (§15.10)
              const propsDecl = parsePropsBlock(valTok.text, valSpan, errors);
              value = { kind: "props-block", propsDecl, span: valSpan };
            } else {
              // §14.9: Non-props brace-block — expression attribute (e.g. snippet lambda,
              // event handler). Parse as expr, same as ATTR_EXPR.
              const raw = valTok.text;
              const refs = [];
              const refRe = /@([A-Za-z_$][A-Za-z0-9_$]*)/g;
              let m;
              while ((m = refRe.exec(raw)) !== null) {
                if (!refs.includes(m[1])) refs.push(m[1]);
              }
              value = { kind: "expr", raw, refs, exprNode: safeParseExprToNodeGlobal(raw, filePath, valSpan?.start ?? 0), span: valSpan };
            }
          } else if (valTok.kind === "ATTR_EXPR") {
            // Boolean expression for if= attribute (e.g. !@var, @a === 1, @a && @b quoted).
            // Extract all @varname references for reactive subscription.
            const raw = valTok.text;
            const refs = [];
            const refRe = /@([A-Za-z_$][A-Za-z0-9_$]*)/g;
            let m;
            while ((m = refRe.exec(raw)) !== null) {
              if (!refs.includes(m[1])) refs.push(m[1]);
            }
            value = { kind: "expr", raw, refs, exprNode: safeParseExprToNodeGlobal(raw, filePath, valSpan?.start ?? 0), span: valSpan };
          } else {
            // E-ATTR-001: unexpected token type as attribute value
            errors.push(new TABError(
              "E-ATTR-001",
              `E-ATTR-001: The value \`${valTok.text}\` is not valid for attribute \`${name}\`. ` +
              `Attribute values must be a quoted string literal, an unquoted identifier, or a call expression. ` +
              `For example: \`${name}="hello"\`, \`${name}=myVar\`, or \`${name}=\${expression}\`.`,
              valSpan,
            ));
            value = { kind: "absent" };
          }

          // Span covers name through end of value
          const attrSpan = {
            file: filePath,
            start: nameSpan.start,
            end: tokenSpan(valTok, filePath).end,
            line: nameSpan.line,
            col: nameSpan.col,
          };

          // §5.4: bind: directive validation
          // §15.11.1: on component call sites (isComponent=true), defer E-ATTR-011 for
          // unrecognized bind: names — CE validates against propsDecl (E-COMPONENT-013).
          if (name.startsWith("bind:")) {
            if (!BIND_DIRECTIVES.has(name) && !isComponent) {
              errors.push(new TABError(
                "E-ATTR-011",
                `E-ATTR-011: \`${name}\` is not a supported bind directive. ` +
                `Supported: \`bind:value\`, \`bind:checked\`, \`bind:selected\`, \`bind:group\`, \`bind:this\`. ` +
                `If you intended a regular attribute, remove the \`bind:\` prefix.`,
                attrSpan,
              ));
            }
            // bind: target must be an @-prefixed reactive variable or a dotted state path
            if (value.kind === "variable-ref") {
              if (!value.name.startsWith("@") && !value.name.includes(".")) {
                errors.push(new TABError(
                  "E-ATTR-010",
                  `E-ATTR-010: \`${name}\` requires a reactive \`@\` variable or state field path. ` +
                  `\`${value.name}\` is not reactive. ` +
                  `Use \`@${value.name}\` or a state field path like \`stateObj.field\`.`,
                  attrSpan,
                ));
              }
            } else if (value.kind === "string-literal") {
              errors.push(new TABError(
                "E-ATTR-010",
                `E-ATTR-010: \`${name}\` requires a reactive \`@\` variable. ` +
                `Got a string literal \`"${value.value}"\` instead. ` +
                `Use an \`@\`-prefixed reactive variable, e.g. \`${name}=@myVar\`.`,
                attrSpan,
              ));
            }
          }

          // §5.5.2: class: directive validation — E-ATTR-013
          // The right-hand side of class:name= accepts:
          //   @variable    — reactive variable (class:active=@isActive)
          //   obj.prop     — property access (class:done=todo.completed); root key subscribed
          //   (expr)       — parenthesized boolean expression (ATTR_EXPR → expr kind)
          //   fn()         — function call (ATTR_CALL → call-ref kind)
          // Rejects: bare identifiers (no @, no dot), string literals, absent.
          if (name.startsWith("class:")) {
            if (value.kind === "variable-ref") {
              const _isReactive = value.name.startsWith("@");
              const _isDotPath  = !_isReactive && value.name.includes(".");
              if (!_isReactive && !_isDotPath) {
                errors.push(new TABError(
                  "E-ATTR-013",
                  `E-ATTR-013: \`${name}\` requires a boolean expression. ` +
                  `\`${value.name}\` is a bare identifier — did you mean \`@${value.name}\`? ` +
                  `Valid forms: \`${name}=@myVar\`, \`${name}=obj.prop\`, \`${name}=(expr)\`, \`${name}=fn()\`.`,
                  attrSpan,
                ));
              }
              // @variable and obj.prop forms pass through — wired in emit-bindings.ts
            } else if (value.kind === "string-literal") {
              errors.push(new TABError(
                "E-ATTR-013",
                `E-ATTR-013: \`${name}\` requires a boolean expression, not a string literal. ` +
                `Got \`"${value.value}"\`. ` +
                `Valid forms: \`${name}=@myVar\`, \`${name}=obj.prop\`, \`${name}=(expr)\`, \`${name}=fn()\`.`,
                attrSpan,
              ));
            } else if (value.kind === "absent") {
              errors.push(new TABError(
                "E-ATTR-013",
                `E-ATTR-013: \`${name}\` requires a boolean expression. ` +
                `No value was provided. Valid forms: \`${name}=@myVar\`, \`${name}=obj.prop\`, \`${name}=(expr)\`, \`${name}=fn()\`.`,
                attrSpan,
              ));
            }
            // call-ref (fn()) and expr ((a === b)) pass through without error — wired in emit-bindings.ts
          }

          attrs.push({ name, value, span: attrSpan });
        }
      } else {
        // Boolean attribute — no value
        // §5.5.2: class: directives without a value are also E-ATTR-013 (absent RHS)
        if (name.startsWith("class:")) {
          errors.push(new TABError(
            "E-ATTR-013",
            `E-ATTR-013: \`${name}\` requires a reactive \`@\` variable. ` +
            `No value was provided. Use \`${name}=@myVar\`.`,
            nameSpan,
          ));
        }
        attrs.push({ name, value: { kind: "absent" }, span: nameSpan });
      }
      continue;
    }

    // Skip TAG_OPEN, TAG_CLOSE_GT, TAG_SELF_CLOSE, EOF
    i++;
  }

  return attrs;
}

/**
 * Parse typed attribute declarations from tokenized state block attributes.
 *
 * Typed declarations use ATTR_TYPED_DECL tokens (produced by the tokenizer
 * for `name(type)` patterns in state blocks). Returns both standard attrs
 * and a separate typedAttrs array.
 *
 * @param {import('./tokenizer.ts').Token[]} tokens
 * @param {string} filePath
 * @param {TABError[]} errors
 * @returns {{ attrs: AttrNode[], typedAttrs: TypedAttrDecl[], hasTypedDecls: boolean }}
 *
 * TypedAttrDecl = {
 *   name: string,
 *   typeExpr: string,    — raw type expression (e.g. "string", "number", "enum { A, B }")
 *   optional: boolean,   — true if type ends with ?
 *   defaultValue: string|null, — default value if `= value` present in type expr
 *   span: Span
 * }
 */
/**
 * Walk an AST node tree and tag all function-decl nodes with a stateTypeScope.
 * Used to mark functions inside state constructors for state-type dispatch overloading.
 *
 * @param {object[]} nodes  — ASTNode[] (children of a state-constructor-def)
 * @param {string} stateTypeName  — the state type name (e.g., "card", "badge")
 */
function tagFunctionsWithStateType(nodes, stateTypeName) {
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    if (node.kind === "function-decl") {
      node.stateTypeScope = stateTypeName;
    }
    // Recurse into logic blocks to find functions declared inside ${} inside the constructor
    if (node.kind === "logic" && Array.isArray(node.body)) {
      for (const stmt of node.body) {
        if (stmt && (stmt.kind === "function-decl")) {
          stmt.stateTypeScope = stateTypeName;
        }
      }
    }
    // Recurse into children
    if (Array.isArray(node.children)) {
      tagFunctionsWithStateType(node.children, stateTypeName);
    }
  }
}

function parseTypedAttributes(tokens, filePath, errors) {
  const attrs = [];
  const typedAttrs = [];
  let hasTypedDecls = false;
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];

    if (tok.kind === "ATTR_TYPED_DECL") {
      hasTypedDecls = true;
      let parsed;
      try { parsed = JSON.parse(tok.text); } catch { parsed = { name: "?", typeExpr: "" }; }

      const { name, typeExpr: rawTypeExpr } = parsed;
      const span = tokenSpan(tok, filePath);

      // Check for default value: `type = defaultValue`
      let typeExpr = rawTypeExpr.trim();
      let defaultValue = null;
      const eqIdx = typeExpr.indexOf("=");
      if (eqIdx !== -1) {
        defaultValue = typeExpr.slice(eqIdx + 1).trim();
        typeExpr = typeExpr.slice(0, eqIdx).trim();
      }

      // Check for optional marker: `type?`
      let optional = false;
      if (typeExpr.endsWith("?")) {
        optional = true;
        typeExpr = typeExpr.slice(0, -1).trim();
      }

      // Default value implies optional
      if (defaultValue !== null) {
        optional = true;
      }

      typedAttrs.push({ name, typeExpr, optional, defaultValue, span });
      i++;
      continue;
    }

    if (tok.kind === "ATTR_NAME") {
      const nameSpan = tokenSpan(tok, filePath);
      const name = tok.text;
      i++;

      // Check for ATTR_EQ
      if (i < tokens.length && tokens[i].kind === "ATTR_EQ") {
        i++; // consume `=`

        if (i < tokens.length) {
          const valTok = tokens[i];
          i++;

          let value;
          const valSpan = tokenSpan(valTok, filePath);
          if (valTok.kind === "ATTR_STRING") {
            value = { kind: "string-literal", value: valTok.text, span: valSpan };
          } else if (valTok.kind === "ATTR_IDENT") {
            value = { kind: "variable-ref", name: valTok.text, exprNode: safeParseExprToNodeGlobal(valTok.text, filePath, valSpan?.start ?? 0), span: valSpan };
          } else {
            value = { kind: "absent" };
          }

          const attrSpan = {
            file: filePath,
            start: nameSpan.start,
            end: tokenSpan(valTok, filePath).end,
            line: nameSpan.line,
            col: nameSpan.col,
          };
          attrs.push({ name, value, span: attrSpan });
        }
      } else {
        // Boolean attribute — no value
        attrs.push({ name, value: { kind: "absent" }, span: nameSpan });
      }
      continue;
    }

    // Skip TAG_OPEN, TAG_CLOSE_GT, TAG_SELF_CLOSE, EOF
    i++;
  }

  return { attrs, typedAttrs, hasTypedDecls };
}

/**
 * Split a comma-separated argument string, respecting parentheses nesting.
 * @param {string} raw
 * @returns {string[]}
 */
function splitArgs(raw) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of raw) {
    if (ch === "(" || ch === "[" || ch === "{") { depth++; cur += ch; }
    else if (ch === ")" || ch === "]" || ch === "}") { depth--; cur += ch; }
    else if (ch === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim().length > 0) parts.push(cur.trim());
  return parts;
}

/**
 * Split a string on commas at top-level depth (not inside braces/parens/brackets).
 *
 * @param {string} raw
 * @returns {string[]}
 */
function splitAtTopLevelCommas(raw) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of raw) {
    if (ch === "{" || ch === "(" || ch === "[") { depth++; current += ch; }
    else if (ch === "}" || ch === ")" || ch === "]") { depth--; current += ch; }
    else if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/**
 * Parse a props declaration block content string into a structured array.
 *
 * Input: raw content between the braces of `props={...}`, e.g.:
 *   "name: string, size?: string, role: UserRole, count: number = 0"
 *
 * Grammar:
 *   prop-decl ::= identifier ('?')? ':' type-expr ('=' literal)?
 *
 * Returns:
 *   Array<{ name: string, type: string, optional: boolean, default: string|null }>
 *
 * @param {string} raw    — content between the braces (braces not included)
 * @param {object} span   — span for error reporting
 * @param {TABError[]} errors
 * @returns {Array}
 */
function parsePropsBlock(raw, span, errors) {
  const props = [];
  const parts = splitAtTopLevelCommas(raw);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // §15.11.1: detect bindable prop declaration: "bind name: type"
    let bindable = false;
    let propText = trimmed;
    if (propText.startsWith("bind ")) {
      bindable = true;
      propText = propText.slice(5).trim(); // strip "bind " prefix
    }

    // Match: identifier, optional '?', ':', type, optional '= default'
    const match = propText.match(/^([A-Za-z_][A-Za-z0-9_]*)(\?)?\s*:\s*(.+)$/);
    if (!match) {
      errors.push(new TABError(
        "E-COMPONENT-019",
        `E-COMPONENT-019: Invalid prop declaration \`${trimmed}\` in props block. ` +
        `Expected format: \`name: type\`, \`name?: type\`, \`name: type = default\`, ` +
        `\`bind name: type\` (bindable prop), or \`name: fn-signature\` (function prop).`,
        span,
      ));
      continue;
    }

    const name = match[1];
    const optional = match[2] === "?";
    let typeAndDefault = match[3].trim();

    // Split off default value: find '=' not followed by '=' or '>'
    let defaultValue = null;
    const eqMatch = typeAndDefault.match(/^(.+?)\s*=(?!=|>)\s*(.+)$/);
    if (eqMatch) {
      typeAndDefault = eqMatch[1].trim();
      defaultValue = eqMatch[2].trim();
    }

    // §15.11.4: detect function-typed prop — type contains "=>" or starts with "("
    const isFunctionProp = typeAndDefault.includes("=>") || typeAndDefault.trim().startsWith("(");

    props.push({
      name,
      type: typeAndDefault,
      optional: optional || defaultValue !== null,
      default: defaultValue,
      bindable,            // §15.11.1: true when declared as "bind name: type"
      isFunctionProp,      // §15.11.4: true when type is a function signature
      isSnippet: false,              // §14.9: set by CE post-processing
      snippetParamType: null,        // §14.9: set by CE post-processing
    });
  }

  return props;
}

// ---------------------------------------------------------------------------
// Logic block parser
// ---------------------------------------------------------------------------

/**
 * Parse the token stream of a logic or meta block body into LogicNode[].
 *
 * This is a best-effort structural parser. The TAB stage is NOT a full JS
 * parser — it recognises scrml-specific constructs (lift, fn, @,
 * function declarations, reactive decls, imports, exports, type decls,
 * const component defs) and wraps everything else as BareExpr nodes.
 *
 * The parser is intentionally conservative: when it sees a construct it can
 * classify, it produces the appropriate node kind. When it cannot classify,
 * it accumulates tokens until a natural boundary (`;`, a keyword at statement
 * start, or EOF) and emits a BareExpr.
 *
 * @param {import('./tokenizer.ts').Token[]} tokens
 * @param {string} filePath
 * @param {object[]} childBlocks  — child blocks of the parent logic block
 * @param {object}   parentBlock  — the enclosing BS block (for child lookup)
 * @param {{ next: number }} counter  — node ID counter shared with buildBlock
 * @param {TABError[]} errors
 * @param {string} blockContext   — 'logic' or 'meta'
 * @returns {LogicNode[]}
 */
export function parseLogicBody(tokens, filePath, childBlocks, parentBlock, counter, errors, blockContext) {
  const nodes = [];
  let i = 0;

  function peek(n = 0) {
    return i + n < tokens.length ? tokens[i + n] : { kind: "EOF", text: "", span: { start: 0, end: 0, line: 1, col: 1 } };
  }

  function consume() {
    return i < tokens.length ? tokens[i++] : peek();
  }

  function spanOf(startTok, endTok) {
    return {
      file: filePath,
      start: startTok.span.start,
      end: endTok.span.end,
      line: startTok.span.line,
      col: startTok.span.col,
    };
  }

  /**
   * Phase 1: safely parse an expression string to ExprNode.
   * Never throws — returns undefined on failure.
   * Used to populate parallel ExprNode fields alongside existing string fields.
   */
  function safeParseExprToNode(expr, startOffset) {
    if (!expr || typeof expr !== "string" || !expr.trim()) return undefined;
    if (shouldSkipExprParse(expr)) return undefined;
    try {
      // Automatically thread tilde context from the closure-scoped flag
      return parseExprToNode(expr, filePath, startOffset ?? 0, _tildeActive ? { tildeActive: true } : undefined);
    } catch (_e) {
      return undefined;
    }
  }

  /**
   * Collect tokens into a raw expression string up to (but not including)
   * the next statement boundary. Returns { expr: string, span }.
   *
   * Statement boundary: `;`, an unbalanced `}`, or a keyword that starts a
   * new top-level statement (lift, function, fn, const, let, import, export,
   * type, pure, server), or EOF.
   */
  /** Join token parts using newlines when tokens span different source lines, spaces otherwise. */
  function joinWithNewlines(parts, partLines) {
    if (parts.length === 0) return "";
    let result = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const sep = (partLines[i] > partLines[i - 1]) ? "\n" : " ";
      result += sep + parts[i];
    }
    return result;
  }

  function collectExpr(stopAt = null) {
    const parts = [];
    const partLines = []; // parallel array: source line number for each part
    const startTok = peek();
    let lastTok = startTok;
    let depth = 0;
    let angleDepth = 0; // Track < ... > nesting for component tag expressions

    const STMT_KEYWORDS = new Set(["lift", "function", "fn", "const", "let", "import", "export", "use", "type", "server", "for", "while", "do", "if", "return", "match", "partial", "switch", "try", "fail", "transaction", "throw", "continue", "break", "when", "given"]);
    const DECL_KEYWORDS = new Set(["const", "let", "type", "function", "fn"]);

    while (true) {
      const tok = peek();
      if (tok.kind === "EOF") break;
      // Skip comments — they must not leak as JS statements (BUG-2)
      if (tok.kind === "COMMENT") { consume(); continue; }
      if (stopAt && tok.text === stopAt && depth === 0) break;
      // BLOCK_REF at depth 0 is a statement boundary — the child block
      // (sql, error-effect, meta) should be its own AST node, not part of a bare-expr.
      // Exception: when the BLOCK_REF is inside a tag body (tagNesting > 0), the
      // block is part of the enclosing component expression, not a separate statement.
      if (tok.kind === "BLOCK_REF" && depth === 0 && parts.length > 0 && (tok.block?.tagNesting ?? 0) === 0) break;
      // Statement boundary at depth 0
      if (depth === 0) {
        if (tok.kind === "PUNCT" && tok.text === ";") {
          lastTok = consume();
          break;
        }
        if (tok.kind === "PUNCT" && tok.text === "}") break;
        // Another statement-starting keyword is a boundary (do not consume).
        // Guard: angleDepth === 0 ensures we are NOT inside a tag expression
        // (e.g. <div if=visible>). Keywords used as HTML attributes must not
        // break expression collection mid-tag.
        // Guard: last part is not "." — e.g. `node.type` should NOT break at `type`.
        // Keywords after a dot are property accesses, not statement boundaries.
        if (parts.length > 0 && angleDepth === 0 && tok.kind === "KEYWORD" && STMT_KEYWORDS.has(tok.text) && parts[parts.length - 1]?.trim() !== ".") break;
        // BUG-R14-002: @name = or bare name = at depth 0 starts a new statement.
        // Guards:
        //   1. angleDepth > 0 — inside a tag expression (< div class="x" />),
        //      IDENT = is an attribute, not a statement boundary.
        //   2. lastPart is a decl keyword (const, let, etc.) — e.g.
        //      `export const MAX_RETRIES = 3` should not break at `MAX_RETRIES =`.
        //   3. lastPart === "=" — collecting RHS of an assignment expression (§50: chained
        //      assignment). `a = b = c = 0` collects RHS `b = c = 0`: seeing `c =` is
        //      part of the chain, not a new statement boundary.
        if (parts.length > 0 && angleDepth === 0) {
          const lastPart = parts[parts.length - 1];
          if (!DECL_KEYWORDS.has(lastPart)) {
            const next1 = peek(1);
            const isAssign = next1 && next1.kind === "PUNCT" && next1.text === "=" && peek(2)?.text !== "=";
            if (isAssign) {
              if (tok.kind === "AT_IDENT" && lastPart !== "=") break;
              if (tok.kind === "IDENT" && lastPart !== "." && lastPart !== "=") break;
            }
          }
        }
        // BUG-ASI-NEWLINE: When at depth 0 and the current token is on a new line
        // relative to the last consumed token, AND the last consumed token ends a
        // value expression (IDENT, NUMBER, STRING, closing paren/bracket), AND the
        // current token begins a new statement (IDENT or KEYWORD), treat the newline
        // as a statement boundary. This handles multi-line ^{} meta bodies like:
        //   let variants = reflect(Color).variants
        //   emit("<p>" + variants.join(", ") + "/")
        // Without this, collectExpr greedily consumes both lines as a single let-decl.
        if (
          parts.length > 0 &&
          angleDepth === 0 &&
          // (Slice 3) removed redundant identity check `lastTok !== startTok` — it was an
          // off-by-one (peek/consume return same object, so it meant >=2 tokens, not >=1).
          // `parts.length > 0` is the authoritative "have we consumed something" signal.
          tok.span.line > lastTok.span.line // current token is on a later line
        ) {
          const lastKind = lastTok.kind;
          const lastText = lastTok.text;
          // lastTok ends an expression if it's a value-producing token
          const lastEndsValue = (
            lastKind === "IDENT" ||
            lastKind === "NUMBER" ||
            lastKind === "STRING" ||
            (lastKind === "PUNCT" && (lastText === ")" || lastText === "]"))
          );
          // tok starts a new statement if it's an IDENT (function call) or unhandled KEYWORD
          const tokStartsStmt = (
            tok.kind === "IDENT" ||
            (tok.kind === "KEYWORD" && !STMT_KEYWORDS.has(tok.text))
          );
          if (lastEndsValue && tokStartsStmt) break;
        }
      }
      // Track brace / paren depth
      if (tok.kind === "PUNCT" && (tok.text === "{" || tok.text === "(" || tok.text === "[")) depth++;
      if (tok.kind === "PUNCT" && (tok.text === "}" || tok.text === ")" || tok.text === "]")) {
        if (depth === 0) break;
        depth--;
      }
      // Track angle-bracket depth for tag expressions (< tag attr="val" />)
      // Open: `<` followed by an IDENT (tag name pattern)
      if (tok.kind === "PUNCT" && tok.text === "<" && depth === 0) {
        const afterLt = peek(1);
        if (afterLt && (afterLt.kind === "IDENT" || afterLt.kind === "KEYWORD")) {
          angleDepth++;
        }
      }
      // Close: `>` closes a tag expression (covers both `>` and the `>` in `/>`)
      if (angleDepth > 0 && tok.kind === "PUNCT" && tok.text === ">" && depth === 0) {
        angleDepth--;
      }
      // E-EQ-004: `===` and `!==` are not valid scrml operators (§45)
      if (tok.kind === "OPERATOR" && (tok.text === "===" || tok.text === "!==")) {
        const eqSpan = tokenSpan(tok, filePath);
        const replacement = tok.text === "===" ? "==" : "!=";
        errors.push(new TABError(
          "E-EQ-004",
          `E-EQ-004: \`${tok.text}\` is not a valid scrml operator. Use \`${replacement}\` instead — scrml equality is always strict.`,
          eqSpan,
        ));
        lastTok = consume();
        parts.push(replacement);
        partLines.push(lastTok.span?.line ?? 0);
        continue;
      }
      // E-EQ-002: `== not` and `!= not` — use `is not` instead (§45)
      // Recovery: rewrite `== not` → `is not`, `!= not` → `is not not` in the expression.
      if (tok.kind === "OPERATOR" && (tok.text === "==" || tok.text === "!=")) {
        const nextTok = peek(1);
        if (nextTok && nextTok.kind === "KEYWORD" && nextTok.text === "not") {
          const eqSpan = tokenSpan(tok, filePath);
          errors.push(new TABError(
            "E-EQ-002",
            `E-EQ-002: \`${tok.text} not\` is not valid — use \`is not\` to check for absence (§45).`,
            eqSpan,
          ));
          // Consume both `==`/`!=` and `not`, emit recovered `is not` form
          consume(); // consume the operator
          lastTok = consume(); // consume `not`
          parts.push(tok.text === "!=" ? "is not not" : "is not");
          partLines.push(lastTok.span?.line ?? 0);
          continue;
        }
      }
      lastTok = consume();
      // Re-quote STRING tokens so their delimiters are preserved in the expression
      if (lastTok.kind === "STRING") {
        parts.push(`"${lastTok.text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
      } else {
        parts.push(lastTok.text);
      }
      partLines.push(lastTok.span?.line ?? 0);
    }

    return {
      expr: joinWithNewlines(parts, partLines),
      span: parts.length > 0 ? spanOf(startTok, lastTok) : spanOf(startTok, startTok),
    };
  }

  /**
   * Collect a braced block body as raw text.  Returns { body: string, span }
   * Caller should have already seen the opening `{`.
   */
  function collectBracedBody() {
    const startTok = peek();
    let depth = 1;
    const parts = [];
    const partLines = [];
    let lastTok = startTok;

    while (depth > 0) {
      const tok = peek();
      if (tok.kind === "EOF") break;
      if (tok.kind === "PUNCT" && tok.text === "{") depth++;
      if (tok.kind === "PUNCT" && tok.text === "}") {
        depth--;
        if (depth === 0) { lastTok = consume(); break; }
      }
      lastTok = consume();
      parts.push(lastTok.text);
      partLines.push(lastTok.span?.line ?? 0);
    }

    return {
      body: joinWithNewlines(parts, partLines),
      span: parts.length > 0 ? spanOf(startTok, lastTok) : spanOf(startTok, startTok),
    };
  }

  /**
   * Collect a lift expression. Unlike collectExpr, this collector includes
   * `/` tag closers as part of the expression (for inline markup like
   * `lift <li>${item}/`). Collection stops at `;`, `}`, a BLOCK_REF at
   * depth 0 (after collecting some tokens), or a statement keyword at
   * depth 0.
   *
   * @returns {{ expr: string, span: object }}
   */
  function collectLiftExpr() {
    const parts = [];
    const partLines = [];
    const startTok = peek();
    let lastTok = startTok;
    let depth = 0;
    // Track whether we're inside a markup tag's text content (between > and /).
    // Keywords in text content should NOT be treated as statement boundaries.
    let angleDepth = 0;

    const STMT_KEYWORDS = new Set(["lift", "function", "fn", "const", "let", "import", "export", "use", "type", "server", "for", "while", "do", "if", "return", "match", "partial", "switch", "try", "fail", "transaction", "throw", "continue", "break", "when", "given"]);

    while (true) {
      const tok = peek();
      if (tok.kind === "EOF") break;
      // BLOCK_REF at depth 0 after we have content is a boundary.
      // Exception: inside a tag body (tagNesting > 0) the block is part of the expression.
      if (tok.kind === "BLOCK_REF" && depth === 0 && parts.length > 0 && (tok.block?.tagNesting ?? 0) === 0) break;
      // Track markup nesting depth: `< tag` opens, `/` closes.
      // Inside markup content (tagDepth > 0), keywords are text, not code.
      if (tok.text === "<" && (tok.kind === "PUNCT" || tok.kind === "OPERATOR")) {
        const next = peek(1);
        // `< ident` or `< keyword` = tag open. `< /` = closing tag (also increments,
        // but the `/` that follows will decrement).
        if (next && (next.kind === "IDENT" || next.kind === "KEYWORD")) {
          angleDepth++;
        }
      }
      // `/` at depth > 0 closes the innermost tag
      if (tok.text === "/" && tok.kind === "PUNCT" && angleDepth > 0) {
        angleDepth--;
      }
      // Statement boundary at depth 0
      if (depth === 0) {
        if (tok.kind === "PUNCT" && tok.text === ";") {
          lastTok = consume();
          break;
        }
        if (tok.kind === "PUNCT" && tok.text === "}") break;
        // Statement keyword boundary (do not consume)
        // Guard: keywords after "." are property accesses (e.g. node.type), not boundaries.
        // Guard: keywords inside markup text content (angleDepth > 0) are text, not code.
        if (parts.length > 0 && angleDepth === 0 && tok.kind === "KEYWORD" && STMT_KEYWORDS.has(tok.text) && parts[parts.length - 1]?.trim() !== ".") break;
      }
      // Track brace / paren / angle depth
      if (tok.kind === "PUNCT" && (tok.text === "{" || tok.text === "(" || tok.text === "[")) depth++;
      if (tok.kind === "PUNCT" && (tok.text === "}" || tok.text === ")" || tok.text === "]")) {
        if (depth === 0) break;
        depth--;
      }
      // Consume the token — including `/` which collectExpr would stop at for operators
      lastTok = consume();
      // Re-quote STRING tokens so their delimiters are preserved
      if (lastTok.kind === "STRING") {
        parts.push(`"${lastTok.text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
      } else {
        parts.push(lastTok.text);
      }
      partLines.push(lastTok.span?.line ?? 0);
    }

    return {
      expr: joinWithNewlines(parts, partLines),
      span: parts.length > 0 ? spanOf(startTok, lastTok) : spanOf(startTok, startTok),
    };
  }

  /**
   * §53 Inline Type Predicates — type annotation collector (parseLogicBody closure).
   * Called after consuming `@name` when peek() is `:`.
   * Consumes `:` and collects the type expression (including balanced parens and
   * optional [label] suffix) up to `=` or `,` at paren depth 0.
   * Returns the annotation string (e.g. "number(>0 && <10000)[valid_x]") or null.
   */
  function collectTypeAnnotation() {
    if (peek().text !== ':') return null;
    consume(); // consume ':'
    const parts = [];
    let depth = 0;
    while (peek().kind !== 'EOF') {
      const t = peek();
      if (t.text === '(') {
        depth++;
        parts.push(t.text);
        consume();
      } else if (t.text === ')') {
        if (depth === 0) break; // unmatched ')' — stop
        depth--;
        parts.push(t.text);
        consume();
        // Check for label suffix [ident] immediately after closing paren at depth 0
        if (depth === 0 && peek().text === '[') {
          parts.push(peek().text); consume(); // consume '['
          while (peek().kind !== 'EOF' && peek().text !== ']') {
            parts.push(peek().text); consume();
          }
          if (peek().text === ']') { parts.push(peek().text); consume(); } // consume ']'
        }
      } else if (t.text === '=' && depth === 0) {
        // Stop at assignment (but not ==)
        const next = peek(1);
        if (next && next.text === '=') {
          // == operator — include it
          parts.push(t.text); consume();
        } else {
          break;
        }
      } else if (t.text === ',' && depth === 0) {
        break; // stop at comma (param lists)
      } else {
        parts.push(t.text);
        consume();
      }
    }
    const annotation = parts.join('').trim();
    return annotation || null;
  }

  // Phase 4: tilde context tracking. Set to true after a value-lift (lift-expr with
  // expr.kind === "expr"). When active, safeParseExprToNode passes tildeActive to the
  // expression parser so standalone `~` is parsed as the tilde accumulator, not bitwise NOT.
  // Cleared after the next statement that contains `~` is parsed.
  let _tildeActive = false;

  /**
   * Parse a braced body `{ ... }` into a structured LogicNode[] tree.
   * Caller should have already consumed the opening `{`.
   * Consumes up to and including the closing `}`.
   */
  function parseRecursiveBody() {
    const stmts = [];
    while (true) {
      const tok = peek();
      if (tok.kind === "EOF") break;
      // Closing brace ends the body
      if (tok.kind === "PUNCT" && tok.text === "}") {
        consume();
        break;
      }
      // Skip bare semicolons
      if (tok.kind === "PUNCT" && tok.text === ";") { consume(); continue; }
      // Skip comments
      if (tok.kind === "COMMENT") { consume(); continue; }
      // Skip whitespace tokens
      if (tok.text.trim() === "" && tok.kind !== "EOF") { consume(); continue; }

      const node = parseOneStatement();
      if (node) {
        // GUARDED-EXPR: check if next token is a BLOCK_REF to error-effect — if so, wrap
        const nextTok = peek();
        if (nextTok.kind === "BLOCK_REF" && nextTok.block && nextTok.block.type === "error-effect") {
          consume();
          const errBlock = buildBlock(nextTok.block, filePath, parentBlock.type, counter, errors);
          stmts.push({
            id: ++counter.next,
            kind: "guarded-expr",
            guardedNode: node,
            arms: errBlock ? errBlock.arms : [],
            span: { ...node.span, end: nextTok.block.span.end },
          });
        } else {
          stmts.push(node);
        }
        // Phase 4: track tilde context — value-lift activates, ~ consumption deactivates
        if (node.kind === "lift-expr" && node.expr && node.expr.kind === "expr") {
          _tildeActive = true;
        } else if (_tildeActive) {
          // Any non-lift statement after a value-lift may consume ~; deactivate after one statement
          _tildeActive = false;
        }
      }
    }
    return stmts;
  }

  /**
   * Parse a single statement and return an AST node.
   * Handles: let, const, @reactive, lift, for, if, while, return, bare-expr.
   */
  function parseOneStatement() {
    const tok = peek();

    // BLOCK_REF — embedded child block
    if (tok.kind === "BLOCK_REF") {
      consume();
      const child = tok.block;
      if (child) {
        const childNode = buildBlock(child, filePath, parentBlock.type, counter, errors);
        if (childNode) {
          childNode.span = fullSpan(child.span, filePath);
          // §SQL: collect chained method calls (.run(), .all(), .get()) from parent token stream
          if (childNode.kind === "sql" && childNode.chainedCalls) {
            while (peek().kind === "PUNCT" && peek().text === ".") {
              consume(); // dot
              if (peek().kind === "IDENT") {
                const methodTok = consume();
                let args = "";
                if (peek().kind === "PUNCT" && peek().text === "(") {
                  consume(); // open paren
                  while (peek().kind !== "EOF" && !(peek().kind === "PUNCT" && peek().text === ")")) {
                    args += consume().text;
                  }
                  if (peek().kind === "PUNCT" && peek().text === ")") consume(); // close paren
                }
                childNode.chainedCalls.push({ method: methodTok.text, args });
              }
            }
          }
          return childNode;
        }
      }
      return null;
    }

    // LABEL PREFIX: `label: while (...)` or `label: do { ... }` or `label: for (...)`
    // Lookahead: IDENT + PUNCT(":") + KEYWORD(while|do|for) → consume label, continue parsing
    if (tok.kind === "IDENT" && peek(1)?.kind === "PUNCT" && peek(1)?.text === ":" &&
        peek(2)?.kind === "KEYWORD" && (peek(2)?.text === "while" || peek(2)?.text === "do" || peek(2)?.text === "for")) {
      const labelTok = consume();  // consume label identifier
      const labelName = labelTok.text;
      consume();  // consume ":"
      // Now parse the loop statement and attach the label
      const loopNode = parseOneStatement();
      if (loopNode && (loopNode.kind === "while-stmt" || loopNode.kind === "do-while-stmt" || loopNode.kind === "for-stmt")) {
        loopNode.label = labelName;
        return loopNode;
      }
      return loopNode;
    }

    // LET
    if (tok.kind === "KEYWORD" && tok.text === "let") {
      const startTok = consume();
      let name = "";
      if (peek().kind === "IDENT") name = consume().text;
      else if (peek().kind === "KEYWORD") name = consume().text;
      if (peek().text === "=" && peek(1)?.text !== "=") {
        consume();
        // If-as-expression: `let a = if (cond) { lift val }`
        if (peek().kind === "KEYWORD" && peek().text === "if") {
          const ifNode = parseOneIfStmt();
          return { id: ++counter.next, kind: "let-decl", name, init: "", ifExpr: { ...ifNode, kind: "if-expr" }, span: spanOf(startTok, peek()) };
        }
        // For-as-expression: `let names = for (item of items) { lift item.name }`
        if (peek().kind === "KEYWORD" && peek().text === "for") {
          const forNode = parseOneForStmt();
          return { id: ++counter.next, kind: "let-decl", name, init: "", forExpr: { ...forNode, kind: "for-expr" }, span: spanOf(startTok, peek()) };
        }
        const { expr, span } = collectExpr();
        return { id: ++counter.next, kind: "let-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), span: spanOf(startTok, peek()) };
      } else {
        const { expr, span } = collectExpr();
        return { id: ++counter.next, kind: "let-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), span: spanOf(startTok, peek()) };
      }
    }

    // CONST — may be `const @name = expr` (reactive-derived-decl) or `const name = expr`
    if (tok.kind === "KEYWORD" && tok.text === "const") {
      const startTok = consume();
      // Check for `const @name = expr` — derived reactive value
      if (peek().kind === "AT_IDENT") {
        const atTok = consume();
        const derivedName = atTok.text.slice(1); // strip @
        if (peek().text === "=" && peek(1)?.text !== "=") {
          consume();
          const { expr, span } = collectExpr();
          return { id: ++counter.next, kind: "reactive-derived-decl", name: derivedName, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), span: spanOf(startTok, peek()) };
        } else {
          return { id: ++counter.next, kind: "reactive-derived-decl", name: derivedName, init: "", span: spanOf(startTok, peek()) };
        }
      }
      let name = "";
      if (peek().kind === "IDENT" || peek().kind === "KEYWORD") name = consume().text;
      if (peek().text === "=" && peek(1)?.text !== "=") {
        consume();
        // If-as-expression: `const a = if (cond) { lift val }`
        if (peek().kind === "KEYWORD" && peek().text === "if") {
          const ifNode = parseOneIfStmt();
          return { id: ++counter.next, kind: "const-decl", name, init: "", ifExpr: { ...ifNode, kind: "if-expr" }, span: spanOf(startTok, peek()) };
        }
        // For-as-expression: `const names = for (item of items) { lift item.name }`
        if (peek().kind === "KEYWORD" && peek().text === "for") {
          const forNode = parseOneForStmt();
          return { id: ++counter.next, kind: "const-decl", name, init: "", forExpr: { ...forNode, kind: "for-expr" }, span: spanOf(startTok, peek()) };
        }
        const { expr, span } = collectExpr();
        return { id: ++counter.next, kind: "const-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), span: spanOf(startTok, peek()) };
      } else {
        return { id: ++counter.next, kind: "const-decl", name, init: "", span: tokenSpan(startTok, filePath) };
      }
    }

    // @debounced(N) MODIFIER: `@debounced(N) name = expr`
    if (tok.kind === "AT_IDENT" && tok.text === "@debounced") {
      const startTok = consume();
      let delay = 300;
      if (peek().text === "(") {
        consume();
        const delayParts = [];
        while (peek().text !== ")" && peek().kind !== "EOF") {
          delayParts.push(consume().text);
        }
        if (peek().text === ")") consume();
        delay = parseInt(delayParts.join("").trim(), 10) || 300;
      }
      let name = "";
      if (peek().kind === "IDENT" || peek().kind === "KEYWORD") name = consume().text;
      if (peek().text === "=" && peek(1)?.text !== "=") {
        consume();
        const { expr, span } = collectExpr();
        return { id: ++counter.next, kind: "reactive-debounced-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), delay, span: spanOf(startTok, peek()) };
      }
      const { expr, span } = collectExpr();
      return { id: ++counter.next, kind: "bare-expr", expr: startTok.text + " " + name + (expr ? " " + expr : ""), span: spanOf(startTok, peek()) };
    }

    // server MODIFIER: `server @varName = expr` → reactive-decl with isServer: true (§52.4)
    // Guard: only consume `server` when the next token is AT_IDENT.
    // This ensures `server function` and `server fn` fall through to their own handlers.
    if (tok.kind === "KEYWORD" && tok.text === "server" && peek(1)?.kind === "AT_IDENT") {
      const startTok = consume(); // consume `server`
      const atTok = consume(); // consume `@varName`
      const name = atTok.text.slice(1); // strip @
      // §53: optional type annotation — `server @name: Type(pred) = expr`
      const typeAnnotation = collectTypeAnnotation();
      if (peek().text === "=" && peek(1)?.text !== "=") {
        consume(); // consume `=`
        const { expr } = collectExpr();
        const node = { id: ++counter.next, kind: "reactive-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), isServer: true, span: spanOf(startTok, peek()) };
        if (typeAnnotation) node.typeAnnotation = typeAnnotation;
        return node;
      }
      // Malformed — emit as bare-expr
      const { expr } = collectExpr();
      return { id: ++counter.next, kind: "bare-expr", expr: startTok.text + " " + atTok.text + (expr ? " " + expr : ""), span: spanOf(startTok, peek()) };
    }

    // @shared MODIFIER: `@shared varName = expr` → reactive-decl with isShared: true (§37.4)
    if (tok.kind === "AT_IDENT" && tok.text === "@shared") {
      const startTok = consume(); // consume `@shared`
      // Expect: IDENT or KEYWORD (varName), then =, then expr
      if ((peek().kind === "IDENT" || peek().kind === "KEYWORD") && peek(1)?.text === "=" && peek(2)?.text !== "=") {
        const nameTok = consume(); // consume varName
        consume(); // consume `=`
        const { expr } = collectExpr();
        return { id: ++counter.next, kind: "reactive-decl", name: nameTok.text, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), isShared: true, span: spanOf(startTok, peek()) };
      }
      // Malformed @shared — emit as bare-expr
      const { expr } = collectExpr();
      return { id: ++counter.next, kind: "bare-expr", expr: startTok.text + (expr ? " " + expr : ""), span: spanOf(startTok, peek()) };
    }

    // REACTIVE DECL / NESTED ASSIGN / ARRAY MUTATION: @name...
    if (tok.kind === "AT_IDENT") {
      const startTok = consume();
      const name = tok.text.slice(1);

      // Check for dotted path: @obj.path.to.prop = value  OR  @arr.push(...)
      if (peek().text === ".") {
        // Collect the dot-separated path segments
        const pathSegments = [];
        let peekIdx = 0;
        let tempTokens = [];

        // Lookahead to collect .ident chains
        while (peek().text === ".") {
          const dotTok = consume();
          tempTokens.push(dotTok);
          if (peek().kind === "IDENT" || peek().kind === "KEYWORD") {
            const segTok = consume();
            tempTokens.push(segTok);
            pathSegments.push(segTok.text);
          } else {
            break;
          }
        }

        // Check for array mutation patterns: @arr.push(...), @arr.splice(...)
        const ARRAY_MUTATIONS = ["push", "pop", "shift", "unshift", "splice", "sort", "reverse", "fill"];
        const lastSeg = pathSegments[pathSegments.length - 1];
        if (pathSegments.length === 1 && ARRAY_MUTATIONS.includes(lastSeg) && peek().text === "(") {
          // @arr.push(item) → reactive-array-mutation node
          consume(); // consume "("
          const argParts = [];
          let parenDepth = 1;
          while (parenDepth > 0 && peek().kind !== "EOF") {
            const t = consume();
            if (t.text === "(") parenDepth++;
            if (t.text === ")") { parenDepth--; if (parenDepth === 0) break; }
            argParts.push(t.text);
          }
          const _ramArgs = argParts.join(" ").trim();
          return {
            id: ++counter.next,
            kind: "reactive-array-mutation",
            target: name,
            method: lastSeg,
            args: _ramArgs,
            argsExpr: safeParseExprToNode(_ramArgs, spanOf(startTok, peek())?.start ?? 0),
            span: spanOf(startTok, peek()),
          };
        }

        // Check for nested assignment: @obj.path = value
        if (peek().text === "=" && peek(1)?.text !== "=") {
          consume(); // consume "="
          const { expr, span } = collectExpr();
          return {
            id: ++counter.next,
            kind: "reactive-nested-assign",
            target: name,
            path: pathSegments,
            value: expr,
            valueExpr: safeParseExprToNode(expr, 0),
            span: spanOf(startTok, peek()),
          };
        }

        // Not a nested assignment or array mutation — reconstruct as bare-expr
        const pathStr = "." + pathSegments.join(".");
        const { expr, span } = collectExpr();
        return { id: ++counter.next, kind: "bare-expr", expr: startTok.text + pathStr + (expr ? " " + expr : ""), span: spanOf(startTok, peek()) };
      }

      // Type annotation: @name: Type(predicate) = expr  (§53)
      if (peek().text === ":") {
        const typeAnnotation = collectTypeAnnotation();
        if (peek().text === "=" && peek(1)?.text !== "=") {
          consume(); // consume '='
          const { expr } = collectExpr();
          return { id: ++counter.next, kind: "reactive-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), typeAnnotation, span: spanOf(startTok, peek()) };
        }
        // Malformed — fall through to bare-expr
      }

      // Simple reactive decl: @name = expr
      if (peek().text === "=" && peek(1)?.text !== "=") {
        consume();
        const { expr, span } = collectExpr();
        return { id: ++counter.next, kind: "reactive-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), span: spanOf(startTok, peek()) };
      }

      // @set(@obj, "path", value) — explicit escape hatch
      if (name === "set" && peek().text === "(") {
        consume(); // consume "("
        const argParts = [];
        let parenDepth = 1;
        while (parenDepth > 0 && peek().kind !== "EOF") {
          const t = consume();
          if (t.text === "(") parenDepth++;
          if (t.text === ")") { parenDepth--; if (parenDepth === 0) break; }
          argParts.push(t.text);
        }
        const argsStr = argParts.join(" ").trim();
        return {
          id: ++counter.next,
          kind: "reactive-explicit-set",
          args: argsStr,
          argsExpr: safeParseExprToNode(argsStr, spanOf(startTok, peek())?.start ?? 0),
          span: spanOf(startTok, peek()),
        };
      }

      // Otherwise: bare-expr starting with @name
      const { expr, span } = collectExpr();
      return { id: ++counter.next, kind: "bare-expr", expr: startTok.text + (expr ? " " + expr : ""), span: spanOf(startTok, peek()) };
    }

    // LIFT
    if (tok.kind === "KEYWORD" && tok.text === "lift") {
      const startTok = consume();
      if (peek().kind === "BLOCK_REF") {
        const refTok = consume();
        const child = refTok.block;
        if (child) {
          const childNode = buildBlock(child, filePath, "logic", counter, errors);
          return { id: ++counter.next, kind: "lift-expr", expr: { kind: "markup", node: childNode }, span: spanOf(startTok, refTok) };
        }
      } else {
        const { expr, span } = collectLiftExpr();
        return { id: ++counter.next, kind: "lift-expr", expr: { kind: "expr", expr, exprNode: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0) }, span: spanOf(startTok, peek()) };
      }
      return null;
    }

    // FOR: `for variable in iterable { body }`
    //   OR JS-style: `for (const x of iterable) { body }`
    if (tok.kind === "KEYWORD" && tok.text === "for") {
      const startTok = consume();
      let variable = "item";
      let iterable;
      if (peek().kind === "PUNCT" && peek().text === "(") {
        // JS-style: for (const|let|var x of|in iterable) or C-style: for (init; cond; update)
        consume(); // consume `(`
        // Detect C-style: look for `;` at paren depth 1 before closing `)`
        let isCStyleFor = false;
        {
          let d = 1;
          for (let la = 0; ; la++) {
            const t = peek(la);
            if (t.kind === "EOF") break;
            if (t.kind === "PUNCT" && (t.text === "(" || t.text === "[" || t.text === "{")) d++;
            if (t.kind === "PUNCT" && (t.text === ")" || t.text === "]" || t.text === "}")) {
              d--;
              if (d === 0) break;
            }
            if (d === 1 && t.kind === "PUNCT" && t.text === ";") { isCStyleFor = true; break; }
          }
        }
        if (isCStyleFor) {
          // C-style for: collect raw tokens from `(` to `)` (inclusive)
          // emitForStmt expects iterable in the form "( init; cond; update )"
          const rawParts = ["("];
          let d = 1;
          while (d > 0 && peek().kind !== "EOF") {
            const t = consume();
            rawParts.push(t.text);
            if (t.kind === "PUNCT" && (t.text === "(" || t.text === "[" || t.text === "{")) d++;
            if (t.kind === "PUNCT" && (t.text === ")" || t.text === "]" || t.text === "}")) d--;
          }
          iterable = rawParts.join(" ");
          variable = null;
        } else {
          // for-of / for-in: for (const|let|var x of|in iterable)
          // skip const/let/var
          if (peek().kind === "KEYWORD" && (peek().text === "const" || peek().text === "let" || peek().text === "var")) {
            consume();
          }
          // variable name
          if (peek().kind === "IDENT" || peek().kind === "KEYWORD") {
            variable = consume().text;
          }
          // skip `of` or `in`
          if (peek().kind === "KEYWORD" && (peek().text === "of" || peek().text === "in")) {
            consume();
          }
          // collect iterable expression up to `)`
          const { expr: iterExpr } = collectExpr(")");
          iterable = iterExpr.trim();
          if (peek().kind === "PUNCT" && peek().text === ")") {
            consume(); // consume `)`
          }
        }
      } else {
        // scrml-style: for variable in iterable
        if (peek().kind === "IDENT" || peek().kind === "KEYWORD") {
          variable = consume().text;
        }
        // Consume `in` keyword
        if (peek().kind === "KEYWORD" && peek().text === "in") {
          consume();
        }
        const { expr: iterExpr } = collectExpr("{");
        iterable = iterExpr.trim();
      }
      let body = [];
      if (peek().text === "{") {
        consume();
        body = parseRecursiveBody();
      }
      // Phase 4: detect C-style for-loop and parse parts individually
      const _cStyleMatch = iterable.match(/^\(\s*(.*?)\s*;\s*(.*?)\s*;\s*(.*?)\s*\)$/s);
      const _cStyleParts = _cStyleMatch ? {
        initExpr: safeParseExprToNode(_cStyleMatch[1].trim().replace(/\s*\+\s*\+/g, "++").replace(/\s*-\s*-/g, "--"), 0),
        condExpr: safeParseExprToNode(_cStyleMatch[2].trim(), 0),
        updateExpr: safeParseExprToNode(_cStyleMatch[3].trim().replace(/\s*\+\s*\+/g, "++").replace(/\s*-\s*-/g, "--"), 0),
      } : undefined;
      return {
        id: ++counter.next,
        kind: "for-stmt",
        variable,
        iterable,
        body,
        iterExpr: safeParseExprToNode(iterable, 0),
        ...(_cStyleParts && _cStyleParts.initExpr && _cStyleParts.condExpr && _cStyleParts.updateExpr ? { cStyleParts: _cStyleParts } : {}),
        span: spanOf(startTok, peek()),
      };
    }

    // IF
    if (tok.kind === "KEYWORD" && tok.text === "if") {
      return parseOneIfStmt();
    }

    // WHILE: `while condition { body }`
    if (tok.kind === "KEYWORD" && tok.text === "while") {
      const startTok = consume();
      const { expr: condition, span: condSpan } = collectExpr("{");
      let body = [];
      if (peek().text === "{") {
        consume();
        body = parseRecursiveBody();
      }
      return {
        id: ++counter.next,
        kind: "while-stmt",
        condition: condition.trim(),
        body,
        condExpr: safeParseExprToNode(condition.trim(), 0),
        span: spanOf(startTok, peek()),
      };
    }

    // DO-WHILE: `do { body } while (condition);`
    if (tok.kind === "KEYWORD" && tok.text === "do") {
      const startTok = consume(); // consume `do`
      let body = [];
      if (peek().text === "{") {
        consume();
        body = parseRecursiveBody();
      }
      // consume `while`
      if (peek().kind === "KEYWORD" && peek().text === "while") {
        consume();
      }
      // collect condition — while (condition)
      const { expr: condition } = collectExpr();
      // consume optional trailing semicolon
      if (peek().kind === "PUNCT" && peek().text === ";") consume();
      return {
        id: ++counter.next,
        kind: "do-while-stmt",
        condition: condition.trim(),
        body,
        condExpr: safeParseExprToNode(condition.trim(), 0),
        span: spanOf(startTok, peek()),
      };
    }

    // BREAK: `break;` or `break label;`
    if (tok.kind === "KEYWORD" && tok.text === "break") {
      const startTok = consume(); // consume `break`
      let label = null;
      // If next token is an identifier on the same line, it's a label target
      const nextBreak = peek();
      if (nextBreak.kind === "IDENT" && nextBreak.line === startTok.line) {
        label = consume().text;
      }
      // consume optional trailing semicolon
      if (peek().kind === "PUNCT" && peek().text === ";") consume();
      return {
        id: ++counter.next,
        kind: "break-stmt",
        label,
        span: spanOf(startTok, peek()),
      };
    }

    // CONTINUE: `continue;` or `continue label;`
    if (tok.kind === "KEYWORD" && tok.text === "continue") {
      const startTok = consume(); // consume `continue`
      let label = null;
      // If next token is an identifier on the same line, it's a label target
      const nextCont = peek();
      if (nextCont.kind === "IDENT" && nextCont.line === startTok.line) {
        label = consume().text;
      }
      // consume optional trailing semicolon
      if (peek().kind === "PUNCT" && peek().text === ";") consume();
      return {
        id: ++counter.next,
        kind: "continue-stmt",
        label,
        span: spanOf(startTok, peek()),
      };
    }

    // RETURN: `return expr;`
    // BUG-AST-RETURN-CONST: If the next non-comment token after `return` is a
    // declaration keyword (const, let, function, fn, type), emit a bare return —
    // the declaration is a separate statement, not the return value.
    if (tok.kind === "KEYWORD" && tok.text === "return") {
      const startTok = consume();
      // Peek past comments to find the real next token
      let lookAhead = 0;
      while (peek(lookAhead).kind === "COMMENT") lookAhead++;
      const next = peek(lookAhead);
      const RETURN_DECL_KW = new Set(["const", "let", "type", "function", "fn"]);
      if (next && next.kind === "KEYWORD" && RETURN_DECL_KW.has(next.text)) {
        return {
          id: ++counter.next,
          kind: "return-stmt",
          expr: "",
          span: spanOf(startTok, startTok),
        };
      }
      const { expr, span } = collectExpr();
      return {
        id: ++counter.next,
        kind: "return-stmt",
        expr: expr.trim(),
        exprNode: safeParseExprToNode(expr.trim(), 0),
        span: spanOf(startTok, peek()),
      };
    }

    // THROW: `throw ErrorType("message")` or `throw ErrorType("msg", cause: e)`
    if (tok.kind === "KEYWORD" && tok.text === "throw") {
      const startTok = consume();
      const { expr, span } = collectExpr();
      return {
        id: ++counter.next,
        kind: "throw-stmt",
        expr: expr.trim(),
        exprNode: safeParseExprToNode(expr.trim(), 0),
        span: spanOf(startTok, peek()),
      };
    }

    // GIVEN: `given ident [, ident]* => { body }` — §42.2.3 presence guard
    // Single: `given x => { body }` — execute body if x is not null/undefined
    // Multi: `given x, y => { body }` — all-or-nothing; body runs only if ALL vars present
    if (tok.kind === "KEYWORD" && tok.text === "given") {
      const startTok = consume(); // consume 'given'
      const variables = [];
      // Collect comma-separated plain identifiers (§42.2.3 v1: no property paths)
      while (peek().kind === "IDENT" || peek().kind === "AT_IDENT") {
        let name = consume().text;
        if (name.startsWith("@")) name = name.slice(1); // strip @ if user wrote @x
        variables.push(name);
        if (peek().kind === "PUNCT" && peek().text === ",") {
          consume(); // consume ','
        } else {
          break;
        }
      }
      // consume '=>' (tokenized as a single OPERATOR token by tokenizeLogic)
      if (isMatchArrow(peek())) {
        consume(); // consume '=>'
      }
      // parse body
      let body = [];
      if (peek().kind === "PUNCT" && peek().text === "{") {
        consume(); // consume '{'
        body = parseRecursiveBody();
      }
      return {
        id: ++counter.next,
        kind: "given-guard",
        variables,
        body,
        span: spanOf(startTok, peek()),
      };
    }

    // PARTIAL MATCH: `partial match expr { arms }` — §18.18
    if (tok.kind === "KEYWORD" && tok.text === "partial" && peek(1).kind === "KEYWORD" && peek(1).text === "match") {
      consume(); // consume 'partial'
      const startTok = consume(); // consume 'match'
      const { expr: header } = collectExpr("{");
      let body = [];
      if (peek().text === "{") {
        consume();
        body = parseRecursiveBody();
      }
      return {
        id: ++counter.next,
        kind: "match-stmt",
        header: header.trim(),
        partial: true,
        body,
        headerExpr: safeParseExprToNode(header.trim(), 0),
        span: spanOf(startTok, peek()),
      };
    }

    // SWITCH / TRY / MATCH — minimal handling: store as structured node with raw body
    if (tok.kind === "KEYWORD" && (tok.text === "switch" || tok.text === "try" || tok.text === "match")) {
      const startTok = consume();
      const keyword = startTok.text;
      const { expr: header } = collectExpr("{");
      let body = [];
      if (peek().text === "{") {
        consume();
        body = parseRecursiveBody();
      }
      const node = {
        id: ++counter.next,
        kind: `${keyword}-stmt`,
        header: header.trim(),
        body,
        headerExpr: safeParseExprToNode(header.trim(), 0),
        span: spanOf(startTok, peek()),
      };

      // For try statements, look for catch/finally clauses
      if (keyword === "try") {
        if (peek().kind === "KEYWORD" && peek().text === "catch") {
          consume(); // consume "catch"
          const { expr: catchHeader } = collectExpr("{");
          let catchBody = [];
          if (peek().text === "{") {
            consume();
            catchBody = parseRecursiveBody();
          }
          node.catchNode = {
            header: catchHeader.trim(),
            body: catchBody,
          };
        }
        if (peek().kind === "KEYWORD" && peek().text === "finally") {
          consume(); // consume "finally"
          const { expr: finallyHeader } = collectExpr("{");
          let finallyBody = [];
          if (peek().text === "{") {
            consume();
            finallyBody = parseRecursiveBody();
          }
          node.finallyNode = {
            header: finallyHeader.trim(),
            body: finallyBody,
          };
        }
        node.span = spanOf(startTok, peek());
      }

      return node;
    }

    // NESTED FUNCTION DECLARATION inside a function body.
    // The main while (true) loop handles top-level function declarations, but
    // parseRecursiveBody() calls parseOneStatement() -- which must also handle
    // the `function` keyword so that nested functions are parsed recursively
    // rather than falling through to the bare-expr default.
    if (tok.kind === "KEYWORD" && tok.text === "function") {
      const startTok = consume(); // consume `function`
      let isGenerator = false;
      if (peek().text === "*") {
        isGenerator = true;
        consume(); // consume `*`
      }
      let name = "";
      if (peek().kind === "IDENT" || peek().kind === "KEYWORD") name = consume().text;
      const params = parseParamList();
      let canFail = false;
      if (peek().text === "!") {
        consume(); // consume `!`
        canFail = true;
      }
      // Skip return type annotation — `: TypeName` or `-> TypeName` between `)` and `{`
      // Handles: `: Mario`, `-> string`, `: Array<Thing>`, etc.
      if (peek().text === ":") {
        consume(); // consume `:`
        let angleDepth = 0;
        while (peek().kind !== "EOF") {
          if (peek().text === "<") { angleDepth++; consume(); }
          else if (peek().text === ">") { angleDepth--; consume(); }
          else if (peek().text === "{" && angleDepth === 0) break;
          else consume();
        }
      } else if (peek().text === "-" && peek(1)?.text === ">") {
        consume(); // consume `-`
        consume(); // consume `>`
        // Skip the type name(s) until `{`
        let angleDepth = 0;
        while (peek().kind !== "EOF") {
          if (peek().text === "<") { angleDepth++; consume(); }
          else if (peek().text === ">") { angleDepth--; consume(); }
          else if (peek().text === "{" && angleDepth === 0) break;
          else consume();
        }
      }
      let body = [];
      if (peek().text === "{") {
        consume(); // consume `{`
        body = parseRecursiveBody();
      }
      return {
        id: ++counter.next,
        kind: "function-decl",
        name,
        params,
        body,
        fnKind: "function",
        isServer: false,
        isGenerator,
        canFail,
        span: spanOf(startTok, peek()),
      };
    }

    // LIN-DECL: `lin name = expr` → linear type variable declaration (§35.2)
    // lin is now a KEYWORD. Detect before TILDE-DECL so bare `lin` as KEYWORD doesn't fall through.
    // A bare `lin` not followed by `IDENT =` falls through to bare-expr (unusual back-compat).
    if (tok.kind === "KEYWORD" && tok.text === "lin") {
      const nameTok = peek(1);
      const eqTok = peek(2);
      if (nameTok?.kind === "IDENT" &&
          eqTok?.kind === "PUNCT" && eqTok.text === "=" &&
          peek(3)?.text !== "=") {
        const startTok = consume();          // consume "lin"
        const name = consume().text;         // consume IDENT name
        consume();                           // consume "="
        const { expr } = collectExpr();
        return { id: ++counter.next, kind: "lin-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), span: spanOf(startTok, peek()) };
      }
      // fall through: bare `lin` expression (not a declaration)
    }

    // TILDE-DECL: bare `name = expr` (no keyword) → ~-typed must-use variable
    // Same pattern as let-decl but triggered by IDENT (not a keyword)
    // Exclusions: dotted (obj.prop=), bracket (arr[i]=), augmented (name+=), comparison (name==)
    // All exclusions are automatic: peek(1) won't be PUNCT "=" for those cases.
    if (tok.kind === "IDENT") {
      const nextTok = peek(1);
      if (nextTok && nextTok.kind === "PUNCT" && nextTok.text === "=" && peek(2)?.text !== "=") {
        const startTok = consume(); // consume IDENT (the name)
        const name = startTok.text;
        consume(); // consume `=`
        const { expr, span } = collectExpr();
        return { id: ++counter.next, kind: "tilde-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), span: spanOf(startTok, peek()) };
      }
    }


    // MATCH ARM BLOCK BODY: `. VariantName => { ... }`, `else => { ... }`, `not => { ... }`
    // Parse the block body as structured AST nodes rather than including `{ }` as raw text.
    // This ensures the component expander can process lift-expr nodes inside match arm blocks
    // (e.g., `lift <InfoStep>` inside `.Info => { lift <InfoStep> }`).
    //
    // Form 1: `. VariantName => {` — enum variant arm with block body
    if (tok.kind === 'PUNCT' && tok.text === '.' &&
        peek(1) && peek(1).kind === 'IDENT' && /^[A-Z]/.test(peek(1).text) &&
        peek(2) && isMatchArrow(peek(2)) &&
        peek(3) && peek(3).kind === 'PUNCT' && peek(3).text === '{') {
      const startTok = tok;
      consume(); // '.'
      const variantNameTok = consume(); // IDENT (PascalCase variant name)
      consume(); // '=>'
      consume(); // '{'
      const blockBody = parseRecursiveBody(); // parse until matching '}'
      return {
        id: ++counter.next,
        kind: 'match-arm-block',
        variant: variantNameTok.text,
        isWildcard: false,
        body: blockBody,
        span: spanOf(startTok, peek()),
      };
    }

    // Form 2: `else => {` — wildcard arm with block body
    if (tok.kind === 'KEYWORD' && tok.text === 'else' &&
        peek(1) && isMatchArrow(peek(1)) &&
        peek(2) && peek(2).kind === 'PUNCT' && peek(2).text === '{') {
      const startTok = tok;
      consume(); // 'else'
      consume(); // '=>'
      consume(); // '{'
      const blockBody = parseRecursiveBody();
      return {
        id: ++counter.next,
        kind: 'match-arm-block',
        variant: null,
        isWildcard: true,
        body: blockBody,
        span: spanOf(startTok, peek()),
      };
    }

    // Form 3: `not => {` — absence arm with block body (§42)
    if (tok.kind === 'KEYWORD' && tok.text === 'not' &&
        peek(1) && isMatchArrow(peek(1)) &&
        peek(2) && peek(2).kind === 'PUNCT' && peek(2).text === '{') {
      const startTok = tok;
      consume(); // 'not'
      consume(); // '=>'
      consume(); // '{'
      const blockBody = parseRecursiveBody();
      return {
        id: ++counter.next,
        kind: 'match-arm-block',
        variant: '__not__',
        isWildcard: false,
        isNotArm: true,
        body: blockBody,
        span: spanOf(startTok, peek()),
      };
    }

    // E-SYNTAX-043: Detect old `(x) =>` presence guard syntax (§42.2.3)
    // The old form `(x) => { body }` is removed; use `given x => { body }` instead.
    if (isOldPresenceGuardPattern()) {
      const guardStart = peek();
      // Consume the entire `( IDENT [, IDENT]* ) =>` header
      consume(); // consume `(`
      while (!(peek().kind === "PUNCT" && peek().text === ")") && peek().kind !== "EOF") consume();
      if (peek().kind === "PUNCT" && peek().text === ")") consume(); // consume `)`
      if (isMatchArrow(peek())) consume(); // consume `=>`
      // Drain the body `{ ... }` if present, to prevent cascade errors
      if (peek().kind === "PUNCT" && peek().text === "{") {
        consume(); // consume `{`
        collectBracedBody(); // drain body tokens
      }
      errors.push(new TABError(
        "E-SYNTAX-043",
        `E-SYNTAX-043: \`(x) =>\` presence guard syntax is no longer valid. ` +
        `Use \`given x => { ... }\` instead. ` +
        `The old \`(x) =>\` form was removed when the \`given\` keyword was introduced (§42.2.3).`,
        tokenSpan(guardStart, filePath),
      ));
      return null;
    }

    // §6.7.1a: ON MOUNT — `on mount { body }` desugars to bare-expr (§6.7.1a)
    // 'on' and 'mount' are both IDENTs (not keywords), so check by text.
    if (tok.kind === "IDENT" && tok.text === "on" &&
        peek(1)?.kind === "IDENT" && peek(1)?.text === "mount" &&
        peek(2)?.text === "{") {
      const startTok = consume(); // consume 'on'
      consume();                  // consume 'mount'
      consume();                  // consume '{'
      const { body, span: bodySpan } = collectBracedBody();
      return { id: ++counter.next, kind: "bare-expr", expr: body, exprNode: safeParseExprToNode(body, 0), span: spanOf(startTok, peek()) };
    }

    // §6.7.1b: ON DISMOUNT — `on dismount { body }` desugars to cleanup(() => { body })
    if (tok.kind === "IDENT" && tok.text === "on" &&
        peek(1)?.kind === "IDENT" && peek(1)?.text === "dismount" &&
        peek(2)?.text === "{") {
      const startTok = consume(); // consume 'on'
      consume();                  // consume 'dismount'
      consume();                  // consume '{'
      const { body, span: bodySpan } = collectBracedBody();
      return { id: ++counter.next, kind: "bare-expr", expr: `cleanup(() => { ${body} })`, span: spanOf(startTok, peek()) };
    }

    // Default: bare-expr
    {
      const startTok = peek();
      const { expr, span } = collectExpr();
      if (expr.trim().length > 0) {
        return { id: ++counter.next, kind: "bare-expr", expr, exprNode: safeParseExprToNode(expr, 0), span };
      } else {
        const stuckTok = peek();
        if (stuckTok.kind !== "EOF") {
          const stuckSpan = tokenSpan(stuckTok, filePath);
          if (blockContext === "meta") {
            errors.push(new TABError(
              "E-META-002",
              `E-META-002: \`${stuckTok.text}\` is not valid inside a \`^{ }\` meta block. ` +
              `Meta blocks contain logic code, not direct markup. ` +
              `If you intended to emit markup here, use a \`lift\` expression: \`lift <tag>...</tag>\`.`,
              stuckSpan,
            ));
          } else {
            errors.push(new TABError(
              "E-PARSE-001",
              `E-PARSE-001: \`${stuckTok.text}\` is not valid here. ` +
              `Expected a tag name, expression, or block opener (\`\${}\`/\`#{}\`/\`?{}\`/\`^{}\`). ` +
              `Inside a \`\${ }\` logic block, the compiler expects a statement, a \`let\`/\`const\` declaration, an expression, or a \`lift\`. ` +
              `Check that any surrounding expression is complete and all brackets are balanced.`,
              stuckSpan,
            ));
          }
          consume();
        }
        return null;
      }
    }
  }

  /**
   * Parse an if/else-if/else chain into a structured AST node.
   * Returns { kind: "if-stmt", condition, consequent, alternate }
   */
  /**
   * Collect an if-statement condition.
   *
   * When the condition is paren-wrapped `(...)`, consume EXACTLY the balanced parens
   * (ignoring STMT_KEYWORD boundaries inside the parens). This prevents braceless-if
   * bodies from being absorbed into the condition by the STMT_KEYWORDS/ASI-NEWLINE rules.
   *
   * Falls back to `collectExpr("{")` for non-paren conditions.
   */
  function collectIfCondition() {
    if (peek().text !== "(") {
      return collectExpr("{");
    }
    const parts = [];
    const partLines = [];
    const startTok = peek();
    let lastTok = startTok;
    let depth = 0;

    while (true) {
      const tok = peek();
      if (tok.kind === "EOF") break;
      if (tok.kind === "COMMENT") { consume(); continue; }
      // Track depth for all bracket types
      if (tok.kind === "PUNCT" && (tok.text === "(" || tok.text === "[" || tok.text === "{")) depth++;
      if (tok.kind === "PUNCT" && (tok.text === ")" || tok.text === "]" || tok.text === "}")) {
        if (depth === 0) break; // unmatched closer — stop
        depth--;
      }
      lastTok = consume();
      // Re-quote STRING tokens so their delimiters are preserved in the expression
      if (lastTok.kind === "STRING") {
        parts.push(`"${lastTok.text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
      } else {
        parts.push(lastTok.text);
      }
      partLines.push(lastTok.span?.line ?? 0);
      // After closing the outermost `(`, stop
      if (depth === 0 && parts.length > 0) break;
    }
    return {
      expr: joinWithNewlines(parts, partLines),
      span: parts.length > 0 ? spanOf(startTok, lastTok) : spanOf(startTok, startTok),
    };
  }

  function parseOneIfStmt() {
    const startTok = consume(); // consume `if`
    const { expr: condition } = collectIfCondition();
    let consequent = [];
    if (peek().text === "{") {
      consume();
      consequent = parseRecursiveBody();
    } else if (peek().kind !== "EOF" && !(peek().kind === "PUNCT" && (peek().text === "}" || peek().text === ";"))) {
      // Braceless single-statement if-body: `if (cond) stmt`
      const singleStmt = parseOneStatement();
      if (singleStmt) consequent = [singleStmt];
    }
    let alternate = null;
    // Check for else / else if
    if (peek().kind === "KEYWORD" && peek().text === "else") {
      consume(); // consume `else`
      if (peek().kind === "KEYWORD" && peek().text === "if") {
        // else if → recursive
        alternate = [parseOneIfStmt()];
      } else if (peek().text === "{") {
        consume();
        alternate = parseRecursiveBody();
      }
    }
    return {
      id: ++counter.next,
      kind: "if-stmt",
      condition: condition.trim(),
      consequent,
      alternate,
      condExpr: safeParseExprToNode(condition.trim(), 0),
      span: spanOf(startTok, peek()),
    };
  }

  /**
   * Parse a for-loop statement inline — used by for-as-expression:
   *   `const names = for (item of items) { lift item.name }`
   * Assumes the `for` keyword token is next (not yet consumed).
   */
  function parseOneForStmt() {
    const startTok = consume(); // consume `for`
    let variable = 'item';
    let iterable;
    if (peek().kind === 'PUNCT' && peek().text === '(') {
      consume(); // consume `(`
      // Detect C-style: look for `;` at paren depth 1 before closing `)`
      let isCStyleFor = false;
      {
        let d = 1;
        for (let la = 0; ; la++) {
          const t = peek(la);
          if (t.kind === 'EOF') break;
          if (t.kind === 'PUNCT' && (t.text === '(' || t.text === '[' || t.text === '{')) d++;
          if (t.kind === 'PUNCT' && (t.text === ')' || t.text === ']' || t.text === '}')) {
            d--;
            if (d === 0) break;
          }
          if (d === 1 && t.kind === 'PUNCT' && t.text === ';') { isCStyleFor = true; break; }
        }
      }
      if (isCStyleFor) {
        const rawParts = ['('];
        let d = 1;
        while (d > 0 && peek().kind !== 'EOF') {
          const t = consume();
          rawParts.push(t.text);
          if (t.kind === 'PUNCT' && (t.text === '(' || t.text === '[' || t.text === '{')) d++;
          if (t.kind === 'PUNCT' && (t.text === ')' || t.text === ']' || t.text === '}')) d--;
        }
        iterable = rawParts.join(' ');
        variable = null;
      } else {
        // for-of / for-in: for (const|let|var x of|in iterable)
        if (peek().kind === 'KEYWORD' && (peek().text === 'const' || peek().text === 'let' || peek().text === 'var')) {
          consume();
        }
        if (peek().kind === 'IDENT' || peek().kind === 'KEYWORD') {
          variable = consume().text;
        }
        if (peek().kind === 'KEYWORD' && (peek().text === 'of' || peek().text === 'in')) {
          consume();
        }
        const { expr: iterExpr } = collectExpr(')');
        iterable = iterExpr.trim();
        if (peek().kind === 'PUNCT' && peek().text === ')') {
          consume(); // consume `)`
        }
      }
    } else {
      // scrml-style: for variable in iterable
      if (peek().kind === 'IDENT' || peek().kind === 'KEYWORD') {
        variable = consume().text;
      }
      if (peek().kind === 'KEYWORD' && peek().text === 'in') {
        consume();
      }
      const { expr: iterExpr } = collectExpr('{');
      iterable = iterExpr.trim();
    }
    let body = [];
    if (peek().text === '{') {
      consume();
      body = parseRecursiveBody();
    }
    return {
      id: ++counter.next,
      kind: 'for-stmt',
      variable,
      iterable,
      body,
      span: spanOf(startTok, peek()),
    };
  }

  /**
   * Parse a function parameter list `( param, param, ... )` into string[].
   * Assumes next token is `(`.
   */
  function parseParamList() {
    const params = [];
    if (peek().text !== "(") return params;
    consume(); // consume `(`
    let depth = 1;
    let cur = "";
    // §53: parse param entries into {name, typeAnnotation?} objects.
    // "x: number(>0)" → {name: "x", typeAnnotation: "number(>0)"}
    // "x" → {name: "x"}
    // §35.2.1: lin-annotated params — "lin x" or "lin x: string" → {name: "x", isLin: true, ...}
    // Downstream consumers (emit-functions.ts, emit-server.ts, type-system.ts) already
    // handle both string and {name} forms via typeof checks.
    function pushParam(raw) {
      const s = raw.trim();
      if (!s) return;
      // §35.2.1: detect `lin name` prefix — parameter declared as linear.
      const LIN_PREFIX = /^lin\s+(.+)$/;
      const linMatch = LIN_PREFIX.exec(s);
      const isLin = linMatch !== null;
      const effective = isLin ? linMatch[1].trim() : s;
      const colonIdx = effective.indexOf(':');
      if (colonIdx === -1) {
        params.push(isLin ? { name: effective, isLin: true } : { name: effective });
      } else {
        const name = effective.slice(0, colonIdx).trim();
        const typeAnnotation = effective.slice(colonIdx + 1).trim() || null;
        params.push(isLin ? { name, typeAnnotation, isLin: true } : { name, typeAnnotation });
      }
    }
    while (true) {
      const tok = peek();
      if (tok.kind === "EOF") break;
      if (tok.text === "(" || tok.text === "[" || tok.text === "{") { depth++; cur += tok.text; consume(); }
      else if (tok.text === ")" || tok.text === "]" || tok.text === "}") {
        depth--;
        if (depth === 0) { consume(); break; }
        cur += tok.text;
        consume();
      } else if (tok.text === "," && depth === 1) {
        pushParam(cur);
        cur = "";
        consume();
      } else {
        // Insert a space before IDENT/KEYWORD tokens to prevent concatenation like
        // `lin token` → `lintoken`. Punctuation tokens (: ( ) > etc.) don't need spaces.
        if (cur.length > 0 && (tok.kind === 'IDENT' || tok.kind === 'KEYWORD' || tok.kind === 'AT_IDENT') &&
            cur[cur.length - 1] !== ' ') {
          cur += ' ';
        }
        cur += tok.text;
        consume();
      }
    }
    pushParam(cur);
    return params;
  }

  /**
   * Returns true if the current token position matches the removed presence guard pattern:
   *   `(x) =>` or `(x, y) =>` — §42.2.3 form replaced by `given x => { ... }`, E-SYNTAX-043.
   * Does NOT consume any tokens. Uses the outer peek() closure.
   */
  function isOldPresenceGuardPattern() {
    if (!(peek(0).kind === "PUNCT" && peek(0).text === "(")) return false;
    let la = 1;
    // Must have at least one identifier or @identifier after the open paren
    if (!(peek(la).kind === "IDENT" || peek(la).kind === "AT_IDENT")) return false;
    la++;
    // Skip dot-access chains: `.prop.subprop` (handles `(t.due_date) =>`)
    while (
      peek(la).kind === "PUNCT" && peek(la).text === "." &&
      (peek(la + 1).kind === "IDENT")
    ) {
      la += 2;
    }
    // Skip bracket index access: `[...]` (handles `(arr[i]) =>`, `(arr[i].prop) =>`)
    if (peek(la).kind === "PUNCT" && peek(la).text === "[") {
      let depth = 1;
      la++;
      while (depth > 0 && peek(la).kind !== "EOF") {
        if (peek(la).text === "[") depth++;
        else if (peek(la).text === "]") depth--;
        la++;
      }
    }
    // Skip call parens: `(...)` (handles `(fn()) =>`, `(fn(x)) =>`)
    if (peek(la).kind === "PUNCT" && peek(la).text === "(") {
      let depth = 1;
      la++;
      while (depth > 0 && peek(la).kind !== "EOF") {
        if (peek(la).text === "(") depth++;
        else if (peek(la).text === ")") depth--;
        la++;
      }
    }
    // Skip any comma-separated identifiers (with optional dot chains): `, IDENT[.prop]*`
    while (
      peek(la).kind === "PUNCT" && peek(la).text === "," &&
      (peek(la + 1).kind === "IDENT" || peek(la + 1).kind === "AT_IDENT")
    ) {
      la += 2;
      // Skip dot chains on this param too
      while (
        peek(la).kind === "PUNCT" && peek(la).text === "." &&
        (peek(la + 1).kind === "IDENT")
      ) {
        la += 2;
      }
    }
    // Must close with `)`
    if (!(peek(la).kind === "PUNCT" && peek(la).text === ")")) return false;
    la++;
    // Must be followed by `=>` (isMatchArrow handles both `=>` and `:>`)
    return isMatchArrow(peek(la));
  }

  while (true) {
    const tok = peek();
    if (tok.kind === "EOF") break;

    // Phase 4: update tilde context based on last pushed node
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      if (lastNode.kind === "lift-expr" && lastNode.expr && lastNode.expr.kind === "expr") {
        _tildeActive = true;
      } else if (_tildeActive) {
        _tildeActive = false;
      }
    }

    // Skip comments
    if (tok.kind === "COMMENT") { consume(); continue; }

    // Skip bare semicolons
    if (tok.kind === "PUNCT" && tok.text === ";") { consume(); continue; }

    // Skip whitespace tokens (shouldn't appear — tokenizer strips them — but guard anyway)
    if (tok.text.trim() === "" && tok.kind !== "EOF") { consume(); continue; }

    // GUARDED-EXPR (outer loop): error-effect BLOCK_REF after a node wraps previous node
    // If the current token is a BLOCK_REF to error-effect AND we have a previous node,
    // replace the last node with a guarded-expr.
    if (tok.kind === "BLOCK_REF" && tok.block && tok.block.type === "error-effect" && nodes.length > 0) {
      consume();
      const errBlock = buildBlock(tok.block, filePath, parentBlock.type, counter, errors);
      const lastNode = nodes[nodes.length - 1];
      nodes[nodes.length - 1] = {
        id: ++counter.next,
        kind: "guarded-expr",
        guardedNode: lastNode,
        arms: errBlock ? errBlock.arms : [],
        span: { ...lastNode.span, end: tok.block.span.end },
      };
      continue;
    }

    // BLOCK_REF — embedded child block from the block splitter
    if (tok.kind === "BLOCK_REF") {
      consume();
      const child = tok.block;
      if (child) {
        // Build the child AST node — pass the parent block's type as context
        const childNode = buildBlock(child, filePath, parentBlock.type, counter, errors);
        if (childNode) {
          childNode.span = fullSpan(child.span, filePath);
          // §SQL: collect chained method calls (.run(), .all(), .get()) from parent token stream
          if (childNode.kind === "sql" && childNode.chainedCalls) {
            while (peek().kind === "PUNCT" && peek().text === ".") {
              consume(); // dot
              if (peek().kind === "IDENT") {
                const methodTok = consume();
                let args = "";
                if (peek().kind === "PUNCT" && peek().text === "(") {
                  consume(); // open paren
                  while (peek().kind !== "EOF" && !(peek().kind === "PUNCT" && peek().text === ")")) {
                    args += consume().text;
                  }
                  if (peek().kind === "PUNCT" && peek().text === ")") consume(); // close paren
                }
                childNode.chainedCalls.push({ method: methodTok.text, args });
              }
            }
          }
          nodes.push(childNode);
        }
      }
      continue;
    }

    // IMPORT — parse structured import data per §21.3
    if (tok.kind === "KEYWORD" && tok.text === "import") {
      const startTok = consume();
      const { expr, span } = collectExpr();
      const rawStr = "import " + expr;

      // Parse structured import: `{ Name1, Name2 } from './path'` or `Name from './path'`
      const importNode = { id: ++counter.next, kind: "import-decl", raw: rawStr, span, names: [], source: null, isDefault: false };

      // Match: { names } from 'source' or "source"
      const namedMatch = expr.match(/^\s*\{\s*([^}]*)\}\s*from\s+["']([^"']+)["']/);
      if (namedMatch) {
        importNode.names = namedMatch[1].split(",").map(s => s.trim()).filter(Boolean);
        importNode.source = namedMatch[2];
      } else {
        // Match: defaultName from 'source'
        const defaultMatch = expr.match(/^\s*(\w+)\s+from\s+["']([^"']+)["']/);
        if (defaultMatch) {
          importNode.names = [defaultMatch[1]];
          importNode.source = defaultMatch[2];
          importNode.isDefault = true;
        }
      }

      nodes.push(importNode);
      continue;
    }

    // USE — parse use declarations per §40.2
    // Syntax: use scrml:ui { Button, Card } or use vendor:path { name }
    if (tok.kind === "KEYWORD" && tok.text === "use") {
      const startTok = consume();
      const { expr, span } = collectExpr();
      const rawStr = "use " + expr;

      const useNode = { id: ++counter.next, kind: "use-decl", raw: rawStr, span, names: [], source: null };

      // Match: source { names } — e.g., scrml:ui { Button, Card }
      const namedMatch = expr.match(/^\s*([\w:/.@-]+)\s*\{\s*([^}]*)\}/);
      if (namedMatch) {
        useNode.source = namedMatch[1].trim();
        useNode.names = namedMatch[2].split(",").map(s => s.trim()).filter(Boolean);
      } else {
        // Match: just a source — e.g., use scrml:ui (wide import)
        const sourceOnly = expr.match(/^\s*([\w:/.@-]+)\s*$/);
        if (sourceOnly) {
          useNode.source = sourceOnly[1].trim();
        }
      }

      nodes.push(useNode);
      continue;
    }

    // EXPORT — parse structured export data per §21.2
    if (tok.kind === "KEYWORD" && tok.text === "export") {
      const startTok = consume();
      const { expr, span } = collectExpr();
      const rawStr = "export " + expr;

      const exportNode = { id: ++counter.next, kind: "export-decl", raw: rawStr, span, exportedName: null, exportKind: null, reExportSource: null };

      // Re-export: { names } from 'source'
      const reExportMatch = expr.match(/^\s*\{\s*([^}]*)\}\s*from\s+["']([^"']+)["']/);
      if (reExportMatch) {
        exportNode.exportedName = reExportMatch[1].split(",").map(s => s.trim()).filter(Boolean).join(", ");
        exportNode.exportKind = "re-export";
        exportNode.reExportSource = reExportMatch[2];
      } else {
        // export type Name... | export function Name... | export fn Name... | export const Name... | export let Name...
        const declMatch = expr.match(/^\s*(type|function|fn|const|let)\s+(\w+)/);
        if (declMatch) {
          exportNode.exportKind = declMatch[1];
          exportNode.exportedName = declMatch[2];
        }
      }

      nodes.push(exportNode);
      continue;
    }

    // TYPE DECLARATION: `type name:kind = { ... }`
    if (tok.kind === "KEYWORD" && tok.text === "type") {
      const startTok = consume();
      const nameTok = peek();
      let typeName = "";
      let typeKind = "";

      if (peek().kind === "IDENT" || peek().kind === "KEYWORD") {
        typeName = consume().text;
      }

      // :kind
      if (peek().text === ":") {
        consume(); // consume `:`
        typeKind = peek().kind === "IDENT" || peek().kind === "KEYWORD"
          ? consume().text
          : "";
      }

      // = { ... }
      let raw = "";
      if (peek().text === "=") {
        consume(); // consume `=`
        if (peek().text === "{") {
          consume(); // consume `{`
          const { body, span: bodySpan } = collectBracedBody();
          raw = "{ " + body + " }";
          nodes.push({
            id: ++counter.next,
            kind: "type-decl",
            name: typeName,
            typeKind,
            raw,
            span: spanOf(startTok, peek()),
          });
        } else {
          const { expr, span: exprSpan } = collectExpr();
          raw = expr;
          nodes.push({
            id: ++counter.next,
            kind: "type-decl",
            name: typeName,
            typeKind,
            raw,
            span: spanOf(startTok, peek()),
          });
        }
      } else {
        // Type decl without body
        nodes.push({
          id: ++counter.next,
          kind: "type-decl",
          name: typeName,
          typeKind,
          raw: "",
          span: tokenSpan(startTok, filePath),
        });
      }
      continue;
    }

    // @debounced(N) MODIFIER: `@debounced(N) name = expr`
    if (tok.kind === "AT_IDENT" && tok.text === "@debounced") {
      const startTok = consume(); // consume `@debounced`
      let delay = 300; // default debounce delay
      if (peek().text === "(") {
        consume(); // consume `(`
        const delayParts = [];
        while (peek().text !== ")" && peek().kind !== "EOF") {
          delayParts.push(consume().text);
        }
        if (peek().text === ")") consume(); // consume `)`
        delay = parseInt(delayParts.join("").trim(), 10) || 300;
      }
      // Expect `name = expr`
      let name = "";
      if (peek().kind === "IDENT" || peek().kind === "KEYWORD") {
        name = consume().text;
      }
      if (peek().text === "=" && peek(1)?.text !== "=") {
        consume(); // consume `=`
        const { expr, span } = collectExpr();
        nodes.push({
          id: ++counter.next,
          kind: "reactive-debounced-decl",
          name,
          init: expr,
          delay,
          span: spanOf(startTok, peek()),
        });
      } else {
        // Malformed — emit as bare-expr
        const { expr, span } = collectExpr();
        nodes.push({
          id: ++counter.next,
          kind: "bare-expr",
          expr: startTok.text + " " + name + (expr ? " " + expr : ""),
          span: spanOf(startTok, peek()),
        });
      }
      continue;
    }

    // server MODIFIER: `server @varName = expr` → reactive-decl with isServer: true (§52.4)
    // Guard: only consume `server` when the next token is AT_IDENT.
    // This ensures `server function` and `server fn` fall through to their own handlers.
    if (tok.kind === "KEYWORD" && tok.text === "server" && peek(1)?.kind === "AT_IDENT") {
      const startTok = consume(); // consume `server`
      const atTok = consume(); // consume `@varName`
      const name = atTok.text.slice(1); // strip @
      // §53: optional type annotation — `server @name: Type(pred) = expr`
      const typeAnnotation = collectTypeAnnotation();
      if (peek().text === "=" && peek(1)?.text !== "=") {
        consume(); // consume `=`
        const { expr } = collectExpr();
        const node = { id: ++counter.next, kind: "reactive-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), isServer: true, span: spanOf(startTok, peek()) };
        if (typeAnnotation) node.typeAnnotation = typeAnnotation;
        nodes.push(node);
        continue;
      }
      // Malformed — emit as bare-expr
      const { expr } = collectExpr();
      nodes.push({ id: ++counter.next, kind: "bare-expr", expr: startTok.text + " " + atTok.text + (expr ? " " + expr : ""), span: spanOf(startTok, peek()) });
      continue;
    }

    // @shared MODIFIER: `@shared varName = expr` → reactive-decl with isShared: true (§37.4)
    if (tok.kind === "AT_IDENT" && tok.text === "@shared") {
      const startTok = consume(); // consume `@shared`
      // Expect: IDENT or KEYWORD (varName), then =, then expr
      if ((peek().kind === "IDENT" || peek().kind === "KEYWORD") && peek(1)?.text === "=" && peek(2)?.text !== "=") {
        const nameTok = consume(); // consume varName
        consume(); // consume `=`
        const { expr } = collectExpr();
        nodes.push({ id: ++counter.next, kind: "reactive-decl", name: nameTok.text, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), isShared: true, span: spanOf(startTok, peek()) });
        continue;
      }
      // Malformed @shared — emit as bare-expr
      const { expr } = collectExpr();
      nodes.push({ id: ++counter.next, kind: "bare-expr", expr: startTok.text + (expr ? " " + expr : ""), span: spanOf(startTok, peek()) });
      continue;
    }

    // REACTIVE DECLARATION / NESTED ASSIGN / ARRAY MUTATION: `@name...`
    if (tok.kind === "AT_IDENT") {
      const startTok = consume();
      const name = tok.text.slice(1); // strip @

      // Check for dotted path: @obj.path.to.prop = value  OR  @arr.push(...)
      if (peek().text === ".") {
        const pathSegments = [];
        const tempTokens = [];

        while (peek().text === ".") {
          const dotTok = consume();
          tempTokens.push(dotTok);
          if (peek().kind === "IDENT" || peek().kind === "KEYWORD") {
            const segTok = consume();
            tempTokens.push(segTok);
            pathSegments.push(segTok.text);
          } else {
            break;
          }
        }

        // Array mutation patterns: @arr.push(...), @arr.splice(...)
        const ARRAY_MUTATIONS = ["push", "pop", "shift", "unshift", "splice", "sort", "reverse", "fill"];
        const lastSeg = pathSegments[pathSegments.length - 1];
        if (pathSegments.length === 1 && ARRAY_MUTATIONS.includes(lastSeg) && peek().text === "(") {
          consume(); // consume "("
          const argParts = [];
          let parenDepth = 1;
          while (parenDepth > 0 && peek().kind !== "EOF") {
            const t = consume();
            if (t.text === "(") parenDepth++;
            if (t.text === ")") { parenDepth--; if (parenDepth === 0) break; }
            argParts.push(t.text);
          }
          const _ramArgs2 = argParts.join(" ").trim();
          nodes.push({
            id: ++counter.next,
            kind: "reactive-array-mutation",
            target: name,
            method: lastSeg,
            args: _ramArgs2,
            argsExpr: safeParseExprToNode(_ramArgs2, spanOf(startTok, peek())?.start ?? 0),
            span: spanOf(startTok, peek()),
          });
          continue;
        }

        // Nested assignment: @obj.path = value
        if (peek().text === "=" && peek(1)?.text !== "=") {
          consume(); // consume "="
          const { expr, span } = collectExpr();
          nodes.push({
            id: ++counter.next,
            kind: "reactive-nested-assign",
            target: name,
            path: pathSegments,
            value: expr,
            valueExpr: safeParseExprToNode(expr, 0),
            span: spanOf(startTok, peek()),
          });
          continue;
        }

        // Not a nested assignment or array mutation — reconstruct as bare-expr
        const pathStr = "." + pathSegments.join(".");
        const { expr, span } = collectExpr();
        nodes.push({
          id: ++counter.next,
          kind: "bare-expr",
          expr: startTok.text + pathStr + (expr ? " " + expr : ""),
          span: spanOf(startTok, peek()),
        });
        continue;
      }

      // Type annotation: @name: Type(predicate) = expr  (§53)
      if (peek().text === ":") {
        const typeAnnotation = collectTypeAnnotation();
        if (peek().text === "=" && peek(1)?.text !== "=") {
          consume(); // consume '='
          const { expr } = collectExpr();
          nodes.push({
            id: ++counter.next,
            kind: "reactive-decl",
            name,
            init: expr,
            initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0),
            typeAnnotation,
            span: spanOf(startTok, peek()),
          });
          continue;
        }
        // Malformed — fall through to bare-expr
      }

      // Simple reactive decl: @name = expr
      if (peek().text === "=" && peek(1)?.text !== "=") {
        consume(); // consume `=`
        const { expr, span } = collectExpr();
        nodes.push({
          id: ++counter.next,
          kind: "reactive-decl",
          name,
          init: expr,
          initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0),
          span: spanOf(startTok, peek()),
        });
        continue;
      }

      // @set(@obj, "path", value) — explicit escape hatch
      if (name === "set" && peek().text === "(") {
        consume(); // consume "("
        const argParts = [];
        let parenDepth = 1;
        while (parenDepth > 0 && peek().kind !== "EOF") {
          const t = consume();
          if (t.text === "(") parenDepth++;
          if (t.text === ")") { parenDepth--; if (parenDepth === 0) break; }
          argParts.push(t.text);
        }
        const _resArgs = argParts.join(" ").trim();
        nodes.push({
          id: ++counter.next,
          kind: "reactive-explicit-set",
          args: _resArgs,
          argsExpr: safeParseExprToNode(_resArgs, spanOf(startTok, peek())?.start ?? 0),
          span: spanOf(startTok, peek()),
        });
        continue;
      }

      // @name used as expression (not declaration)
      const { expr, span } = collectExpr();
      nodes.push({
        id: ++counter.next,
        kind: "bare-expr",
        expr: startTok.text + (expr ? " " + expr : ""),
        span: spanOf(startTok, peek()),
      });
      continue;
    }

    // LET DECLARATION: `let name = expr` (with optional `?` propagation)
    if (tok.kind === "KEYWORD" && tok.text === "let") {
      const startTok = consume();
      let name = "";
      if (peek().kind === "IDENT") name = consume().text;
      else if (peek().kind === "KEYWORD") name = consume().text; // e.g. `let in`

      if (peek().text === "=" && peek(1)?.text !== "=") {
        consume(); // consume `=`
        // If-as-expression: `let a = if (cond) { lift val }`
        if (peek().kind === "KEYWORD" && peek().text === "if") {
          const ifNode = parseOneIfStmt();
          nodes.push({
            id: ++counter.next,
            kind: "let-decl",
            name,
            init: "",
            ifExpr: { ...ifNode, kind: "if-expr" },
            span: spanOf(startTok, peek()),
          });
        // For-as-expression: `let names = for (item of items) { lift item.name }`
        } else if (peek().kind === "KEYWORD" && peek().text === "for") {
          const forNode = parseOneForStmt();
          nodes.push({
            id: ++counter.next,
            kind: "let-decl",
            name,
            init: "",
            forExpr: { ...forNode, kind: "for-expr" },
            span: spanOf(startTok, peek()),
          });
        } else {
        const { expr, span } = collectExpr();
        // Check for `?` propagation suffix
        const stripped = expr.trimEnd();
        if (stripped.endsWith("?")) {
          const innerExpr = stripped.slice(0, -1).trimEnd();
          nodes.push({
            id: ++counter.next,
            kind: "propagate-expr",
            binding: name,
            expr: innerExpr,
            exprNode: safeParseExprToNode(innerExpr, 0),
            span: spanOf(startTok, peek()),
          });
        } else {
          nodes.push({
            id: ++counter.next,
            kind: "let-decl",
            name,
            init: expr,
            initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0),
            span: spanOf(startTok, peek()),
          });
        }
        }
      } else {
        const { expr, span } = collectExpr();
        nodes.push({
          id: ++counter.next,
          kind: "let-decl",
          name,
          init: expr,
          span: spanOf(startTok, peek()),
        });
      }
      continue;
    }

    // CONST DECLARATION: `const @name = expr` (reactive derived) or
    //                     `const Name = <element ...>` (component def) or
    //                     `const name = expr`
    if (tok.kind === "KEYWORD" && tok.text === "const") {
      const startTok = consume();

      // Check for `const @name = expr` — derived reactive value
      if (peek().kind === "AT_IDENT") {
        const atTok = consume();
        const derivedName = atTok.text.slice(1); // strip @
        if (peek().text === "=" && peek(1)?.text !== "=") {
          consume(); // consume `=`
          const { expr, span } = collectExpr();
          nodes.push({
            id: ++counter.next,
            kind: "reactive-derived-decl",
            name: derivedName,
            init: expr,
            initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0),
            span: spanOf(startTok, peek()),
          });
        } else {
          nodes.push({
            id: ++counter.next,
            kind: "reactive-derived-decl",
            name: derivedName,
            init: "",
            span: spanOf(startTok, peek()),
          });
        }
        continue;
      }

      let name = "";
      if (peek().kind === "IDENT" || peek().kind === "KEYWORD") name = consume().text;

      if (peek().text === "=" && peek(1)?.text !== "=") {
        consume(); // consume `=`
        // If-as-expression: `const a = if (cond) { lift val }`
        if (peek().kind === "KEYWORD" && peek().text === "if") {
          const ifNode = parseOneIfStmt();
          nodes.push({
            id: ++counter.next,
            kind: "const-decl",
            name,
            init: "",
            ifExpr: { ...ifNode, kind: "if-expr" },
            span: spanOf(startTok, peek()),
          });
        // For-as-expression: `const names = for (item of items) { lift item.name }`
        } else if (peek().kind === "KEYWORD" && peek().text === "for") {
          const forNode = parseOneForStmt();
          nodes.push({
            id: ++counter.next,
            kind: "const-decl",
            name,
            init: "",
            forExpr: { ...forNode, kind: "for-expr" },
            span: spanOf(startTok, peek()),
          });
        } else {
        const { expr, span } = collectExpr();
        // Check if this is a component definition (name starts with uppercase).
        // In meta context, const declarations are always const-decl regardless of casing.
        if (blockContext !== "meta" && name && name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase()) {
          nodes.push({
            id: ++counter.next,
            kind: "component-def",
            name,
            raw: expr,
            span: spanOf(startTok, peek()),
          });
        } else {
          nodes.push({
            id: ++counter.next,
            kind: "const-decl",
            name,
            init: expr,
            initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0),
            span: spanOf(startTok, peek()),
          });
        }
        }
      } else {
        nodes.push({
          id: ++counter.next,
          kind: "const-decl",
          name,
          init: "",
          span: tokenSpan(startTok, filePath),
        });
      }
      continue;
    }

    // LIFT STATEMENT: `lift expr ;`
    if (tok.kind === "KEYWORD" && tok.text === "lift") {
      const startTok = consume();

      // If the next token is a BLOCK_REF, the lift target is an embedded block
      if (peek().kind === "BLOCK_REF") {
        const refTok = consume();
        const child = refTok.block;
        if (child) {
          const childNode = buildBlock(child, filePath, "logic", counter, errors);
          nodes.push({
            id: ++counter.next,
            kind: "lift-expr",
            expr: { kind: "markup", node: childNode },
            span: spanOf(startTok, refTok),
          });
        }
      } else {
        // lift with expression or identifier — use collectLiftExpr to include / closers
        const { expr, span } = collectLiftExpr();
        nodes.push({
          id: ++counter.next,
          kind: "lift-expr",
          expr: { kind: "expr", expr, exprNode: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0) },
          span: spanOf(startTok, peek()),
        });
      }
      continue;
    }

    // FAIL EXPRESSION: `fail EnumType::Variant(args)` or `fail EnumType::Variant`
    if (tok.kind === "KEYWORD" && tok.text === "fail") {
      const startTok = consume(); // consume `fail`

      // Collect the fail target expression as raw text.
      // Expected forms: `EnumType::Variant(args)` or `EnumType::Variant`
      let enumType = "";
      let variant = "";
      let args = "";

      // Parse EnumType
      if (peek().kind === "IDENT" || peek().kind === "KEYWORD") {
        enumType = consume().text;
      }

      // Parse :: separator (tokenized as a single OPERATOR token "::")
      if (peek().text === "::") {
        consume(); // consume `::`

        // Parse Variant name
        if (peek().kind === "IDENT" || peek().kind === "KEYWORD") {
          variant = consume().text;
        }
      }

      // Parse optional args in parens
      if (peek().text === "(") {
        consume(); // consume `(`
        const argParts = [];
        let depth = 1;
        while (depth > 0) {
          const t = peek();
          if (t.kind === "EOF") break;
          if (t.text === "(") depth++;
          if (t.text === ")") {
            depth--;
            if (depth === 0) { consume(); break; }
          }
          argParts.push(consume().text);
        }
        args = argParts.join(" ");
      }

      nodes.push({
        id: ++counter.next,
        kind: "fail-expr",
        enumType,
        variant,
        args,
        argsExpr: args ? safeParseExprToNode(args, spanOf(startTok, peek())?.start ?? 0) : undefined,
        span: spanOf(startTok, peek()),
      });
      continue;
    }

    // FUNCTION DECLARATION: `[server] function name(params) [route="path"] [method="METHOD"] { body }`
    if (
      tok.kind === "KEYWORD" && tok.text === "function" ||
      (tok.kind === "KEYWORD" && tok.text === "server" && peek(1).kind === "KEYWORD" && peek(1).text === "function")
    ) {
      let isServer = false;
      let startTok = tok;

      if (tok.text === "server") {
        isServer = true;
        startTok = consume(); // consume `server`
      }
      consume(); // consume `function`

      // Detect generator function: `server function*` (§36)
      let isGenerator = false;
      if (peek().text === "*") {
        isGenerator = true;
        consume(); // consume `*`
      }

      let name = "";
      if (peek().kind === "IDENT" || peek().kind === "KEYWORD") name = consume().text;

      const params = parseParamList();

      // Parse optional `!` (canFail) and `-> ErrorType` after parameter list
      let canFail = false;
      let errorType = undefined;
      if (peek().text === "!") {
        consume(); // consume `!`
        canFail = true;
        // Parse optional `-> ErrorType`
        if (peek().text === "-" && peek(1)?.text === ">") {
          consume(); // consume `-`
          consume(); // consume `>`
          if (peek().kind === "IDENT" || peek().kind === "KEYWORD") {
            errorType = consume().text;
          }
        }
      }

      // Skip return type annotation — `: TypeName` or `-> TypeName` between `)` and `{`
      // Handles: `: Mario`, `-> string`, `: Array<Thing>`, etc.
      if (peek().text === ":") {
        consume(); // consume `:`
        let angleDepth = 0;
        while (peek().kind !== "EOF") {
          if (peek().text === "<") { angleDepth++; consume(); }
          else if (peek().text === ">") { angleDepth--; consume(); }
          else if (peek().text === "{" && angleDepth === 0) break;
          else consume();
        }
      } else if (!canFail && peek().text === "-" && peek(1)?.text === ">") {
        // Non-failable `-> ReturnType` (failable `-> ErrorType` already handled above)
        consume(); // consume `-`
        consume(); // consume `>`
        let angleDepth = 0;
        while (peek().kind !== "EOF") {
          if (peek().text === "<") { angleDepth++; consume(); }
          else if (peek().text === ">") { angleDepth--; consume(); }
          else if (peek().text === "{" && angleDepth === 0) break;
          else consume();
        }
      }
      // Parse optional route= and method= attributes after parameter list
      let route = undefined;
      let method = undefined;
      while (peek().kind === "IDENT" && (peek().text === "route" || peek().text === "method")) {
        const attrName = consume().text; // consume attribute name
        if (peek().text === "=") {
          consume(); // consume `=`
          if (peek().kind === "STRING") {
            const value = consume().text;
            if (attrName === "route") route = value;
            else if (attrName === "method") method = value;
          }
        }
      }

      let body = [];
      if (peek().text === "{") {
        consume(); // consume `{`
        body = parseRecursiveBody();
      }

      nodes.push({
        id: ++counter.next,
        kind: "function-decl",
        name,
        params,
        body,
        fnKind: "function",
        isServer,
        isGenerator,
        canFail,
        errorType,
        route,
        method,
        // §39: handle() escape hatch recognition (§39.3.1).
        // Naming-based: isServer && name === 'handle' (not a generator). CG uses this to weave
        // the middleware pipeline around route handlers.
        isHandleEscapeHatch: isServer && !isGenerator && name === 'handle',
        span: spanOf(startTok, peek()),
      });
      continue;
    }

    // FN SHORTHAND: `[server] fn name { body }` (no parens)
    if (
      tok.kind === "KEYWORD" && tok.text === "fn" ||
      (tok.kind === "KEYWORD" && tok.text === "server" && peek(1).kind === "KEYWORD" && peek(1).text === "fn")
    ) {
      // E-PARSE-002: `fn` shorthand is only valid in a logic context, not meta or other blocks
      if (blockContext !== "logic") {
        errors.push(new TABError(
          "E-PARSE-002",
          `E-PARSE-002: \`fn\` can only be used inside a \`\${ }\` logic block. ` +
          `Here it appears inside a ${contextLabel(blockContext)} block, where it is not valid. ` +
          `Use a standard \`function\` declaration instead, or move the function definition into a \`\${ }\` block.`,
          tokenSpan(tok, filePath),
        ));
      }

      let isServer = false;
      let startTok = tok;

      if (tok.text === "server") {
        isServer = true;
        startTok = consume(); // consume `server`
      }
      consume(); // consume `fn`

      let name = "";
      if (peek().kind === "IDENT" || peek().kind === "KEYWORD") name = consume().text;

      // fn can optionally have a param list
      let params = [];
      if (peek().text === "(") {
        params = parseParamList();
      }

      // Parse optional `!` (canFail) and `-> ErrorType` after parameter list
      let canFail = false;
      let errorType = undefined;
      if (peek().text === "!") {
        consume(); // consume `!`
        canFail = true;
        // Parse optional `-> ErrorType`
        if (peek().text === "-" && peek(1)?.text === ">") {
          consume(); // consume `-`
          consume(); // consume `>`
          if (peek().kind === "IDENT" || peek().kind === "KEYWORD") {
            errorType = consume().text;
          }
        }
      }

      // Skip return type annotation — `: TypeName` between `)` and `{`
      // Handles: `: Mario`, `: HurtResult`, `: Array<Thing>`, etc.
      if (peek().text === ":") {
        consume(); // consume `:`
        let angleDepth = 0;
        while (peek().kind !== "EOF") {
          if (peek().text === "<") { angleDepth++; consume(); }
          else if (peek().text === ">") { angleDepth--; consume(); }
          else if (peek().text === "{" && angleDepth === 0) break;
          else consume();
        }
      }
      let body = [];
      if (peek().text === "{") {
        consume(); // consume `{`
        body = parseRecursiveBody();
      }

      nodes.push({
        id: ++counter.next,
        kind: "function-decl",
        name,
        params,
        body,
        fnKind: "fn",
        isServer,
        canFail,
        errorType,
        span: spanOf(startTok, peek()),
      });
      continue;
    }

    // LABEL PREFIX in main loop: `label: while (...)` or `label: do { ... }` or `label: for (...)`
    if (tok.kind === "IDENT" && peek(1)?.kind === "PUNCT" && peek(1)?.text === ":" &&
        peek(2)?.kind === "KEYWORD" && (peek(2)?.text === "while" || peek(2)?.text === "do" || peek(2)?.text === "for")) {
      const labelTok = consume();  // consume label identifier
      const labelName = labelTok.text;
      consume();  // consume ":"
      // Re-read the current token and handle as a loop statement below
      const loopTok = peek();
      let loopNode = null;
      if (loopTok.text === "while") {
        consume(); // consume `while`
        const { expr: condition } = collectExpr("{");
        let body = [];
        if (peek().text === "{") { consume(); body = parseRecursiveBody(); }
        loopNode = { id: ++counter.next, kind: "while-stmt", label: labelName, condition: condition.trim(), condExpr: safeParseExprToNode(condition.trim(), 0), body, span: spanOf(labelTok, peek()) };
      } else if (loopTok.text === "do") {
        consume(); // consume `do`
        let body = [];
        if (peek().text === "{") { consume(); body = parseRecursiveBody(); }
        if (peek().kind === "KEYWORD" && peek().text === "while") consume();
        const { expr: condition } = collectExpr();
        if (peek().kind === "PUNCT" && peek().text === ";") consume();
        loopNode = { id: ++counter.next, kind: "do-while-stmt", label: labelName, condition: condition.trim(), condExpr: safeParseExprToNode(condition.trim(), 0), body, span: spanOf(labelTok, peek()) };
      } else if (loopTok.text === "for") {
        const forNode = parseOneForStmt();
        if (forNode) { forNode.label = labelName; loopNode = forNode; }
      }
      if (loopNode) nodes.push(loopNode);
      continue;
    }

    // FOR STATEMENT: `for variable in iterable { body }`
    //   OR JS-style: `for (const x of iterable) { body }`
    if (tok.kind === "KEYWORD" && tok.text === "for") {
      const startTok = consume();
      let variable = "item";
      let iterable;
      if (peek().kind === "PUNCT" && peek().text === "(") {
        // JS-style: for (const|let|var x of|in iterable) or C-style: for (init; cond; update)
        consume(); // consume `(`
        // Detect C-style: look for `;` at paren depth 1 before closing `)`
        let isCStyleFor = false;
        {
          let d = 1;
          for (let la = 0; ; la++) {
            const t = peek(la);
            if (t.kind === "EOF") break;
            if (t.kind === "PUNCT" && (t.text === "(" || t.text === "[" || t.text === "{")) d++;
            if (t.kind === "PUNCT" && (t.text === ")" || t.text === "]" || t.text === "}")) {
              d--;
              if (d === 0) break;
            }
            if (d === 1 && t.kind === "PUNCT" && t.text === ";") { isCStyleFor = true; break; }
          }
        }
        if (isCStyleFor) {
          // C-style for: collect raw tokens from `(` to `)` (inclusive)
          // emitForStmt expects iterable in the form "( init; cond; update )"
          const rawParts = ["("];
          let d = 1;
          while (d > 0 && peek().kind !== "EOF") {
            const t = consume();
            rawParts.push(t.text);
            if (t.kind === "PUNCT" && (t.text === "(" || t.text === "[" || t.text === "{")) d++;
            if (t.kind === "PUNCT" && (t.text === ")" || t.text === "]" || t.text === "}")) d--;
          }
          iterable = rawParts.join(" ");
          variable = null;
        } else {
          // for-of / for-in: for (const|let|var x of|in iterable)
          // skip const/let/var
          if (peek().kind === "KEYWORD" && (peek().text === "const" || peek().text === "let" || peek().text === "var")) {
            consume();
          }
          // variable name
          if (peek().kind === "IDENT" || peek().kind === "KEYWORD") {
            variable = consume().text;
          }
          // skip `of` or `in`
          if (peek().kind === "KEYWORD" && (peek().text === "of" || peek().text === "in")) {
            consume();
          }
          // collect iterable expression up to `)`
          const { expr: iterExpr } = collectExpr(")");
          iterable = iterExpr.trim();
          if (peek().kind === "PUNCT" && peek().text === ")") {
            consume(); // consume `)`
          }
        }
      } else {
        // scrml-style: for variable in iterable
        if (peek().kind === "IDENT" || peek().kind === "KEYWORD") {
          variable = consume().text;
        }
        // Consume `in` keyword
        if (peek().kind === "KEYWORD" && peek().text === "in") {
          consume();
        }
        const { expr: iterExpr } = collectExpr("{");
        iterable = iterExpr.trim();
      }
      let body = [];
      if (peek().text === "{") {
        consume();
        body = parseRecursiveBody();
      }
      // Phase 4: detect C-style for-loop and parse parts individually
      const _cStyleMatch2 = iterable.match(/^\(\s*(.*?)\s*;\s*(.*?)\s*;\s*(.*?)\s*\)$/s);
      const _cStyleParts2 = _cStyleMatch2 ? {
        initExpr: safeParseExprToNode(_cStyleMatch2[1].trim().replace(/\s*\+\s*\+/g, "++").replace(/\s*-\s*-/g, "--"), 0),
        condExpr: safeParseExprToNode(_cStyleMatch2[2].trim(), 0),
        updateExpr: safeParseExprToNode(_cStyleMatch2[3].trim().replace(/\s*\+\s*\+/g, "++").replace(/\s*-\s*-/g, "--"), 0),
      } : undefined;
      nodes.push({
        id: ++counter.next,
        kind: "for-stmt",
        variable,
        iterable,
        body,
        iterExpr: safeParseExprToNode(iterable, 0),
        ...(_cStyleParts2 && _cStyleParts2.initExpr && _cStyleParts2.condExpr && _cStyleParts2.updateExpr ? { cStyleParts: _cStyleParts2 } : {}),
        span: spanOf(startTok, peek()),
      });
      continue;
    }

    // IF STATEMENT
    if (tok.kind === "KEYWORD" && tok.text === "if") {
      const node = parseOneIfStmt();
      if (node) nodes.push(node);
      continue;
    }

    // WHILE STATEMENT: `while condition { body }`
    if (tok.kind === "KEYWORD" && tok.text === "while") {
      const startTok = consume();
      const { expr: condition } = collectExpr("{");
      let body = [];
      if (peek().text === "{") {
        consume();
        body = parseRecursiveBody();
      }
      nodes.push({
        id: ++counter.next,
        kind: "while-stmt",
        condition: condition.trim(),
        body,
        condExpr: safeParseExprToNode(condition.trim(), 0),
        span: spanOf(startTok, peek()),
      });
      continue;
    }

    // DO-WHILE STATEMENT
    if (tok.kind === "KEYWORD" && tok.text === "do") {
      const startTok = consume(); // consume `do`
      let body = [];
      if (peek().text === "{") {
        consume();
        body = parseRecursiveBody();
      }
      if (peek().kind === "KEYWORD" && peek().text === "while") consume();
      const { expr: condition } = collectExpr();
      if (peek().kind === "PUNCT" && peek().text === ";") consume();
      nodes.push({
        id: ++counter.next,
        kind: "do-while-stmt",
        condition: condition.trim(),
        body,
        condExpr: safeParseExprToNode(condition.trim(), 0),
        span: spanOf(startTok, peek()),
      });
      continue;
    }

    // BREAK STATEMENT: `break;` or `break label;`
    if (tok.kind === "KEYWORD" && tok.text === "break") {
      const startTok = consume();
      let label = null;
      const nextBreak = peek();
      if (nextBreak.kind === "IDENT" && nextBreak.line === startTok.line) {
        label = consume().text;
      }
      if (peek().kind === "PUNCT" && peek().text === ";") consume();
      nodes.push({
        id: ++counter.next,
        kind: "break-stmt",
        label,
        span: spanOf(startTok, peek()),
      });
      continue;
    }

    // CONTINUE STATEMENT: `continue;` or `continue label;`
    if (tok.kind === "KEYWORD" && tok.text === "continue") {
      const startTok = consume();
      let label = null;
      const nextCont = peek();
      if (nextCont.kind === "IDENT" && nextCont.line === startTok.line) {
        label = consume().text;
      }
      if (peek().kind === "PUNCT" && peek().text === ";") consume();
      nodes.push({
        id: ++counter.next,
        kind: "continue-stmt",
        label,
        span: spanOf(startTok, peek()),
      });
      continue;
    }

    // RETURN STATEMENT: `return expr;`
    // BUG-AST-RETURN-CONST: If the next non-comment token after `return` is a
    // declaration keyword, emit a bare return — the declaration is a separate statement.
    if (tok.kind === "KEYWORD" && tok.text === "return") {
      const startTok = consume();
      const DECL_KW = new Set(["const", "let", "type", "function", "fn"]);
      let lookAhead = 0;
      while (peek(lookAhead).kind === "COMMENT") lookAhead++;
      const next = peek(lookAhead);
      if (next && next.kind === "KEYWORD" && DECL_KW.has(next.text)) {
        nodes.push({
          id: ++counter.next,
          kind: "return-stmt",
          expr: "",
          span: spanOf(startTok, startTok),
        });
        continue;
      }
      const { expr } = collectExpr();
      nodes.push({
        id: ++counter.next,
        kind: "return-stmt",
        expr: expr.trim(),
        exprNode: safeParseExprToNode(expr.trim(), 0),
        span: spanOf(startTok, peek()),
      });
      continue;
    }

    // THROW STATEMENT: `throw ErrorType("message")`
    if (tok.kind === "KEYWORD" && tok.text === "throw") {
      const startTok = consume();
      const { expr } = collectExpr();
      nodes.push({
        id: ++counter.next,
        kind: "throw-stmt",
        expr: expr.trim(),
        exprNode: safeParseExprToNode(expr.trim(), 0),
        span: spanOf(startTok, peek()),
      });
      continue;
    }

    // PARTIAL MATCH: `partial match expr { arms }` — §18.18
    if (tok.kind === "KEYWORD" && tok.text === "partial" && peek(1).kind === "KEYWORD" && peek(1).text === "match") {
      consume(); // consume 'partial'
      const startTok = consume(); // consume 'match'
      const { expr: header } = collectExpr("{");
      let body = [];
      if (peek().text === "{") {
        consume();
        body = parseRecursiveBody();
      }
      nodes.push({
        id: ++counter.next,
        kind: "match-stmt",
        header: header.trim(),
        partial: true,
        body,
        headerExpr: safeParseExprToNode(header.trim(), 0),
        span: spanOf(startTok, peek()),
      });
      continue;
    }

    // SWITCH / TRY / MATCH — minimal structured handling
    if (tok.kind === "KEYWORD" && (tok.text === "switch" || tok.text === "try" || tok.text === "match")) {
      const startTok = consume();
      const keyword = startTok.text;
      const { expr: header } = collectExpr("{");
      let body = [];
      if (peek().text === "{") {
        consume();
        body = parseRecursiveBody();
      }
      const node = {
        id: ++counter.next,
        kind: `${keyword}-stmt`,
        header: header.trim(),
        body,
        headerExpr: safeParseExprToNode(header.trim(), 0),
        span: spanOf(startTok, peek()),
      };

      // For try statements, look for catch/finally clauses
      if (keyword === "try") {
        if (peek().kind === "KEYWORD" && peek().text === "catch") {
          consume(); // consume "catch"
          const { expr: catchHeader } = collectExpr("{");
          let catchBody = [];
          if (peek().text === "{") {
            consume();
            catchBody = parseRecursiveBody();
          }
          node.catchNode = {
            header: catchHeader.trim(),
            body: catchBody,
          };
        }
        if (peek().kind === "KEYWORD" && peek().text === "finally") {
          consume(); // consume "finally"
          const { expr: finallyHeader } = collectExpr("{");
          let finallyBody = [];
          if (peek().text === "{") {
            consume();
            finallyBody = parseRecursiveBody();
          }
          node.finallyNode = {
            header: finallyHeader.trim(),
            body: finallyBody,
          };
        }
        node.span = spanOf(startTok, peek());
      }

      nodes.push(node);
      continue;
    }

    // TRANSACTION BLOCK: `transaction { body }`
    if (tok.kind === "KEYWORD" && tok.text === "transaction") {
      const startTok = consume(); // consume `transaction`
      let body = [];
      if (peek().text === "{") {
        consume(); // consume `{`
        body = parseRecursiveBody();
      }
      nodes.push({
        id: ++counter.next,
        kind: "transaction-block",
        body,
        span: spanOf(startTok, peek()),
      });
      continue;
    }

    // CLEANUP built-in: `cleanup(() => { ... })`
    if (tok.kind === "KEYWORD" && tok.text === "cleanup") {
      const startTok = consume(); // consume `cleanup`
      if (peek().text === "(") {
        consume(); // consume `(`
        // Collect the callback expression until the matching `)`
        const callbackParts = [];
        let depth = 1;
        let lastTok = peek();
        while (depth > 0) {
          const t = peek();
          if (t.kind === "EOF") break;
          if (t.text === "(") depth++;
          if (t.text === ")") {
            depth--;
            if (depth === 0) { lastTok = consume(); break; }
          }
          lastTok = consume();
          if (lastTok.kind === "STRING") {
            callbackParts.push(`"${lastTok.text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
          } else {
            callbackParts.push(lastTok.text);
          }
        }
        // Consume optional trailing semicolon
        if (peek().kind === "PUNCT" && peek().text === ";") consume();
        nodes.push({
          id: ++counter.next,
          kind: "cleanup-registration",
          callback: callbackParts.join(" "),
          callbackExpr: safeParseExprToNode(callbackParts.join(" "), spanOf(startTok, lastTok)?.start ?? 0),
          span: spanOf(startTok, lastTok),
        });
      }
      continue;
    }

    // WHEN reactive effect: `when @var changes { body }` or `when (@var1, @var2) changes { body }`
    // §4.12.4: WHEN MESSAGE lifecycle: `when message(binding) { body }` — worker message handler
    if (tok.kind === "KEYWORD" && tok.text === "when") {
      const startTok = consume(); // consume `when`

      // §4.12.4: Check for `when message(binding) { ... }` or
      // `when message from _scrml_worker_name (binding) { ... }` or
      // `when error from _scrml_worker_name (binding) { ... }`
      if (peek().kind === "IDENT" && (peek().text === "message" || peek().text === "error")) {
        const eventType = consume().text; // consume `message` or `error`
        let workerName = null; // null = inside-worker (no `from`)
        // Check for `from _scrml_worker_name`
        if ((peek().kind === "KEYWORD" || peek().kind === "IDENT") && peek().text === "from") {
          consume(); // consume `from`
          if (peek().kind === "IDENT") {
            const workerRef = consume().text; // consume `_scrml_worker_name`
            // Extract name from _scrml_worker_NAME pattern
            const m = workerRef.match(/^_scrml_worker_(.+)$/);
            workerName = m ? m[1] : workerRef;
          }
        }
        let binding = "data"; // default binding name
        if (peek().text === "(") {
          consume(); // consume `(`
          if (peek().kind === "IDENT") {
            binding = consume().text;
          }
          if (peek().text === ")") consume(); // consume `)`
        }
        // Parse body: `{ ... }`
        const bodyParts = [];
        if (peek().text === "{") {
          consume(); // consume `{`
          let depth = 1;
          let lastTok = peek();
          while (depth > 0 && peek().kind !== "EOF") {
            const t = peek();
            if (t.text === "{") depth++;
            if (t.text === "}") {
              depth--;
              if (depth === 0) { lastTok = consume(); break; }
            }
            lastTok = consume();
            if (lastTok.kind === "STRING") {
              bodyParts.push(`"${lastTok.text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
            } else {
              bodyParts.push(lastTok.text);
            }
          }
          const _whenWorkerBody = bodyParts.join(" ");
          nodes.push({
            id: ++counter.next,
            kind: workerName ? "when-worker-" + eventType : "when-message",
            eventType,
            workerName,
            binding,
            bodyRaw: _whenWorkerBody,
            bodyExpr: safeParseExprToNode(_whenWorkerBody, spanOf(startTok, lastTok)?.start ?? 0),
            span: spanOf(startTok, lastTok),
          });
        }
        continue;
      }

      const dependencies = [];

      // Parse dependency list: either single @var or parenthesized (@var1, @var2)
      if (peek().text === "(") {
        consume(); // consume `(`
        while (peek().text !== ")" && peek().kind !== "EOF") {
          if (peek().kind === "AT_IDENT") {
            dependencies.push(consume().text.replace(/^@/, ""));
          } else if (peek().text === ",") {
            consume(); // skip comma
          } else {
            consume(); // skip unexpected token
          }
        }
        if (peek().text === ")") consume(); // consume `)`
      } else if (peek().kind === "AT_IDENT") {
        dependencies.push(consume().text.replace(/^@/, ""));
      }

      // Expect `changes` keyword
      if (peek().kind === "KEYWORD" && peek().text === "changes") {
        consume(); // consume `changes`
      }

      // Parse body: `{ ... }`
      const bodyNodes = [];
      if (peek().text === "{") {
        consume(); // consume `{`
        let depth = 1;
        const bodyParts = [];
        let lastTok = peek();
        while (depth > 0 && peek().kind !== "EOF") {
          const t = peek();
          if (t.text === "{") depth++;
          if (t.text === "}") {
            depth--;
            if (depth === 0) { lastTok = consume(); break; }
          }
          lastTok = consume();
          if (lastTok.kind === "STRING") {
            bodyParts.push(`"${lastTok.text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
          } else {
            bodyParts.push(lastTok.text);
          }
        }
        // Store body as raw expression string for emit-logic to rewrite
        if (bodyParts.length > 0) {
          bodyNodes.push(bodyParts.join(" "));
        }

        const _whenEffectBody = bodyParts.join(" ");
        nodes.push({
          id: ++counter.next,
          kind: "when-effect",
          dependencies,
          bodyRaw: _whenEffectBody,
          bodyExpr: safeParseExprToNode(_whenEffectBody, spanOf(startTok, lastTok)?.start ?? 0),
          span: spanOf(startTok, lastTok),
        });
      }
      continue;
    }

    // UPLOAD built-in: `upload(file, url)`
    if (tok.kind === "KEYWORD" && tok.text === "upload") {
      const startTok = consume(); // consume `upload`
      if (peek().text === "(") {
        consume(); // consume `(`
        // Collect first arg (file)
        const fileParts = [];
        let depth = 1;
        let lastTok = peek();
        while (true) {
          const t = peek();
          if (t.kind === "EOF") break;
          if (t.text === "(") depth++;
          if (t.text === ")") {
            depth--;
            if (depth === 0) { lastTok = consume(); break; }
          }
          if (t.text === "," && depth === 1) { consume(); break; }
          lastTok = consume();
          fileParts.push(lastTok.text);
        }
        // Collect second arg (url)
        const urlParts = [];
        depth = 1;
        while (depth > 0) {
          const t = peek();
          if (t.kind === "EOF") break;
          if (t.text === "(") depth++;
          if (t.text === ")") {
            depth--;
            if (depth === 0) { lastTok = consume(); break; }
          }
          lastTok = consume();
          if (lastTok.kind === "STRING") {
            urlParts.push(`"${lastTok.text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
          } else {
            urlParts.push(lastTok.text);
          }
        }
        // Consume optional trailing semicolon
        if (peek().kind === "PUNCT" && peek().text === ";") consume();
        const _uploadFile = fileParts.join(" ").trim();
        const _uploadUrl = urlParts.join(" ").trim();
        nodes.push({
          id: ++counter.next,
          kind: "upload-call",
          file: _uploadFile,
          fileExpr: safeParseExprToNode(_uploadFile, spanOf(startTok, lastTok)?.start ?? 0),
          url: _uploadUrl,
          urlExpr: safeParseExprToNode(_uploadUrl, spanOf(startTok, lastTok)?.start ?? 0),
          span: spanOf(startTok, lastTok),
        });
      }
      continue;
    }

    // DEBOUNCE built-in: `debounce(fn, ms)`
    if (tok.kind === "KEYWORD" && tok.text === "debounce") {
      const startTok = consume(); // consume `debounce`
      if (peek().text === "(") {
        consume(); // consume `(`
        const fnParts = [];
        let depth = 1;
        let lastTok = peek();
        while (true) {
          const t = peek();
          if (t.kind === "EOF") break;
          if (t.text === "(") depth++;
          if (t.text === ")") {
            depth--;
            if (depth === 0) { lastTok = consume(); break; }
          }
          if (t.text === "," && depth === 1) { consume(); break; }
          lastTok = consume();
          fnParts.push(lastTok.text);
        }
        const delayParts = [];
        depth = 1;
        while (depth > 0) {
          const t = peek();
          if (t.kind === "EOF") break;
          if (t.text === "(") depth++;
          if (t.text === ")") {
            depth--;
            if (depth === 0) { lastTok = consume(); break; }
          }
          lastTok = consume();
          delayParts.push(lastTok.text);
        }
        if (peek().kind === "PUNCT" && peek().text === ";") consume();
        nodes.push({
          id: ++counter.next,
          kind: "debounce-call",
          fn: fnParts.join(" ").trim(),
          fnExpr: safeParseExprToNode(fnParts.join(" ").trim(), spanOf(startTok, lastTok)?.start ?? 0),
          delay: parseInt(delayParts.join("").trim(), 10) || 300,
          span: spanOf(startTok, lastTok),
        });
      }
      continue;
    }

    // THROTTLE built-in: `throttle(fn, ms)`
    if (tok.kind === "KEYWORD" && tok.text === "throttle") {
      const startTok = consume(); // consume `throttle`
      if (peek().text === "(") {
        consume(); // consume `(`
        const fnParts = [];
        let depth = 1;
        let lastTok = peek();
        while (true) {
          const t = peek();
          if (t.kind === "EOF") break;
          if (t.text === "(") depth++;
          if (t.text === ")") {
            depth--;
            if (depth === 0) { lastTok = consume(); break; }
          }
          if (t.text === "," && depth === 1) { consume(); break; }
          lastTok = consume();
          fnParts.push(lastTok.text);
        }
        const delayParts = [];
        depth = 1;
        while (depth > 0) {
          const t = peek();
          if (t.kind === "EOF") break;
          if (t.text === "(") depth++;
          if (t.text === ")") {
            depth--;
            if (depth === 0) { lastTok = consume(); break; }
          }
          lastTok = consume();
          delayParts.push(lastTok.text);
        }
        if (peek().kind === "PUNCT" && peek().text === ";") consume();
        nodes.push({
          id: ++counter.next,
          kind: "throttle-call",
          fn: fnParts.join(" ").trim(),
          fnExpr: safeParseExprToNode(fnParts.join(" ").trim(), spanOf(startTok, lastTok)?.start ?? 0),
          delay: parseInt(delayParts.join("").trim(), 10) || 100,
          span: spanOf(startTok, lastTok),
        });
      }
      continue;
    }

    // GIVEN: `given ident [, ident]* => { body }` — §42.2.3 presence guard
    // Single: `given x => { body }` — execute body if x is not null/undefined
    // Multi: `given x, y => { body }` — all-or-nothing; body runs only if ALL vars present
    if (tok.kind === "KEYWORD" && tok.text === "given") {
      const startTok = consume(); // consume 'given'
      const variables = [];
      // Collect comma-separated plain identifiers (§42.2.3 v1: no property paths)
      while (peek().kind === "IDENT" || peek().kind === "AT_IDENT") {
        let name = consume().text;
        if (name.startsWith("@")) name = name.slice(1); // strip @ if user wrote @x
        variables.push(name);
        if (peek().kind === "PUNCT" && peek().text === ",") {
          consume(); // consume ','
        } else {
          break;
        }
      }
      // consume '=>' (tokenized as a single OPERATOR token by tokenizeLogic)
      if (isMatchArrow(peek())) {
        consume(); // consume '=>'
      }
      // parse body
      let body = [];
      if (peek().kind === "PUNCT" && peek().text === "{") {
        consume(); // consume '{'
        body = parseRecursiveBody();
      }
      nodes.push({
        id: ++counter.next,
        kind: "given-guard",
        variables,
        body,
        span: spanOf(startTok, peek()),
      });
      continue;
    }

    // LIN-DECL: `lin name = expr` → linear type variable declaration (§35.2)
    // lin is now a KEYWORD. Detect before TILDE-DECL so bare `lin` as KEYWORD doesn't fall through.
    // A bare `lin` not followed by `IDENT =` falls through to bare-expr (unusual back-compat).
    if (tok.kind === "KEYWORD" && tok.text === "lin") {
      const nameTok = peek(1);
      const eqTok = peek(2);
      if (nameTok?.kind === "IDENT" &&
          eqTok?.kind === "PUNCT" && eqTok.text === "=" &&
          peek(3)?.text !== "=") {
        const startTok = consume();          // consume "lin"
        const name = consume().text;         // consume IDENT name
        consume();                           // consume "="
        const { expr } = collectExpr();
        nodes.push({ id: ++counter.next, kind: "lin-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), span: spanOf(startTok, peek()) });
        continue;
      }
      // fall through: bare `lin` expression (not a declaration)
    }

    // TILDE-DECL: bare `name = expr` (no keyword) → ~-typed must-use variable
    // Same pattern as let-decl but triggered by IDENT (not a keyword)
    // Exclusions: dotted (obj.prop=), bracket (arr[i]=), augmented (name+=), comparison (name==)
    // All exclusions are automatic: peek(1) won't be PUNCT "=" for those cases.
    if (tok.kind === "IDENT") {
      const nextTok = peek(1);
      if (nextTok && nextTok.kind === "PUNCT" && nextTok.text === "=" && peek(2)?.text !== "=") {
        const startTok = consume(); // consume IDENT (the name)
        const name = startTok.text;
        consume(); // consume `=`
        const { expr, span } = collectExpr();
        nodes.push({ id: ++counter.next, kind: "tilde-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), span: spanOf(startTok, peek()) });
        continue;
      }
    }

    // E-SYNTAX-043: Detect old `(x) =>` presence guard syntax (§42.2.3)
    // The old form `(x) => { body }` is removed; use `given x => { body }` instead.
    if (isOldPresenceGuardPattern()) {
      const guardStart = peek();
      // Consume the entire `( IDENT [, IDENT]* ) =>` header
      consume(); // consume `(`
      while (!(peek().kind === "PUNCT" && peek().text === ")") && peek().kind !== "EOF") consume();
      if (peek().kind === "PUNCT" && peek().text === ")") consume(); // consume `)`
      if (isMatchArrow(peek())) consume(); // consume `=>`
      // Drain the body `{ ... }` if present, to prevent cascade errors
      if (peek().kind === "PUNCT" && peek().text === "{") {
        consume(); // consume `{`
        collectBracedBody(); // drain body tokens
      }
      errors.push(new TABError(
        "E-SYNTAX-043",
        `E-SYNTAX-043: \`(x) =>\` presence guard syntax is no longer valid. ` +
        `Use \`given x => { ... }\` instead. ` +
        `The old \`(x) =>\` form was removed when the \`given\` keyword was introduced (§42.2.3).`,
        tokenSpan(guardStart, filePath),
      ));
      continue;
    }

    // §6.7.1a: ON MOUNT — `on mount { body }` desugars to bare-expr
    // 'on' and 'mount' are both IDENTs (not keywords), so check by text.
    if (tok.kind === "IDENT" && tok.text === "on" &&
        peek(1)?.kind === "IDENT" && peek(1)?.text === "mount" &&
        peek(2)?.text === "{") {
      const startTok = consume(); // consume 'on'
      consume();                  // consume 'mount'
      consume();                  // consume '{'
      const { body, span: bodySpan } = collectBracedBody();
      nodes.push({ id: ++counter.next, kind: "bare-expr", expr: body, exprNode: safeParseExprToNode(body, 0), span: spanOf(startTok, peek()) });
      continue;
    }

    // §6.7.1b: ON DISMOUNT — `on dismount { body }` desugars to cleanup(() => { body })
    if (tok.kind === "IDENT" && tok.text === "on" &&
        peek(1)?.kind === "IDENT" && peek(1)?.text === "dismount" &&
        peek(2)?.text === "{") {
      const startTok = consume(); // consume 'on'
      consume();                  // consume 'dismount'
      consume();                  // consume '{'
      const { body, span: bodySpan } = collectBracedBody();
      nodes.push({ id: ++counter.next, kind: "bare-expr", expr: `cleanup(() => { ${body} })`, span: spanOf(startTok, peek()) });
      continue;
    }

    // Anything else: BareExpr — collect until statement boundary (with optional `?` propagation)
    {
      const startTok = peek();
      const { expr, span } = collectExpr();
      if (expr.trim().length > 0) {
        // Check for `?` propagation suffix on bare expressions
        const stripped = expr.trimEnd();
        if (stripped.endsWith("?")) {
          const innerExpr = stripped.slice(0, -1).trimEnd();
          nodes.push({
            id: ++counter.next,
            kind: "propagate-expr",
            binding: null,
            expr: innerExpr,
            exprNode: safeParseExprToNode(innerExpr, 0),
            span,
          });
        } else {
          nodes.push({ id: ++counter.next, kind: "bare-expr", expr, exprNode: safeParseExprToNode(expr, 0), span });
        }
      } else {
        // The current token stopped the collector without being consumed —
        // it is a token this parser cannot classify or advance past.
        // Record an error and consume it to prevent an infinite loop.
        const stuckTok = peek();
        if (stuckTok.kind !== "EOF") {
          const stuckSpan = tokenSpan(stuckTok, filePath);
          // E-META-002 fires inside a meta block; E-PARSE-001 fires everywhere else.
          if (blockContext === "meta") {
            errors.push(new TABError(
              "E-META-002",
              `E-META-002: \`${stuckTok.text}\` is not valid inside a \`^{ }\` meta block. ` +
              `Meta blocks contain logic code, not direct markup. ` +
              `If you intended to emit markup here, use a \`lift\` expression: \`lift <tag>...</tag>\`.`,
              stuckSpan,
            ));
          } else {
            errors.push(new TABError(
              "E-PARSE-001",
              `E-PARSE-001: \`${stuckTok.text}\` is not valid here. ` +
              `Expected a tag name, expression, or block opener (\`\${}\`/\`#{}\`/\`?{}\`/\`^{}\`). ` +
              `Inside a \`\${ }\` logic block, the compiler expects a statement, a \`let\`/\`const\` declaration, an expression, or a \`lift\`. ` +
              `Check that any surrounding expression is complete and all brackets are balanced.`,
              stuckSpan,
            ));
          }
          consume(); // advance past the stuck token to prevent an infinite loop
        }
      }
    }
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// SQL block parser
// ---------------------------------------------------------------------------

/**
 * Parse SQL block tokens into { query, chainedCalls }.
 * @param {Token[]} tokens
 * @param {string} filePath
 * @returns {{ query: string, chainedCalls: ChainCall[] }}
 */
function parseSQLTokens(tokens, filePath) {
  let query = "";
  const chainedCalls = [];
  let i = 0;

  // First token should be SQL_RAW
  if (i < tokens.length && tokens[i].kind === "SQL_RAW") {
    query = tokens[i].text;
    i++;
  }

  // Subsequent tokens: method calls grouped as IDENT, PUNCT((), SQL_ARGS|string, PUNCT())
  while (i < tokens.length && tokens[i].kind !== "EOF") {
    const tok = tokens[i];
    if (tok.kind === "IDENT") {
      const methodName = tok.text;
      i++;
      // Consume `(`
      if (i < tokens.length && tokens[i].kind === "PUNCT" && tokens[i].text === "(") i++;
      // Consume args
      let args = "";
      if (i < tokens.length && tokens[i].kind === "SQL_ARGS") {
        args = tokens[i].text;
        i++;
      }
      // Consume `)`
      if (i < tokens.length && tokens[i].kind === "PUNCT" && tokens[i].text === ")") i++;
      chainedCalls.push({
        method: methodName,
        args,
        span: tokenSpan(tok, filePath),
      });
    } else {
      i++;
    }
  }

  return { query, chainedCalls };
}

// ---------------------------------------------------------------------------
// CSS block parser
// ---------------------------------------------------------------------------

/**
 * Parse CSS tokens into CSSRule[].
 * @param {Token[]} tokens
 * @param {string} filePath
 * @returns {CSSRule[]}
 */
/**
 * Scan a CSS value string for `@identifier` reactive variable references and
 * expressions containing them. Returns an array of reactive reference descriptors.
 *
 * Each descriptor: { name: string, expr: string | null }
 *   - `name` is the bare identifier (without `@`)
 *   - `expr` is the full expression string if the `@var` is part of an expression
 *     (e.g., `@x * 2` or `@isDark ? "a" : "b"`), or null for a simple `@var` reference.
 *
 * @param {string} value — the raw CSS value text
 * @returns {{ refs: { name: string, expr: string | null }[], isExpression: boolean }}
 */
function scanCSSValueForReactiveRefs(value) {
  const AT_IDENT_RE = /@([A-Za-z_$][A-Za-z0-9_$]*)/g;
  const refs = [];
  const seenNames = new Set();
  let match;

  while ((match = AT_IDENT_RE.exec(value)) !== null) {
    const name = match[1];
    if (!seenNames.has(name)) {
      seenNames.add(name);
      refs.push({ name });
    }
  }

  if (refs.length === 0) return { refs: [], isExpression: false };

  // Determine if this is a simple @var reference or an expression.
  // A simple reference: the entire value (after trimming) is exactly `@name`
  // or `@name unit` (e.g., `@spacing px`).
  // An expression: contains operators, ternaries, function calls around the @var.
  const trimmed = value.trim();
  const simpleRefRe = /^@[A-Za-z_$][A-Za-z0-9_$]*(\s+[A-Za-z%]+)?$/;
  const isExpression = !simpleRefRe.test(trimmed);

  if (isExpression) {
    // For expressions, attach the full expression string to each ref
    for (const ref of refs) {
      ref.expr = trimmed;
    }
  } else {
    for (const ref of refs) {
      ref.expr = null;
    }
  }

  return { refs, isExpression };
}

function parseCSSTokens(tokens, filePath) {
  const rules = [];
  let i = 0;

  while (i < tokens.length && tokens[i].kind !== "EOF") {
    const tok = tokens[i];
    if (tok.kind === "CSS_PROP") {
      const prop = tok.text;
      const startSpan = tokenSpan(tok, filePath);
      i++;
      // Expect CSS_COLON
      if (i < tokens.length && tokens[i].kind === "CSS_COLON") i++;
      // Expect CSS_VALUE
      let value = "";
      if (i < tokens.length && tokens[i].kind === "CSS_VALUE") {
        value = tokens[i].text;
        i++;
      }
      // Optional CSS_SEMI
      if (i < tokens.length && tokens[i].kind === "CSS_SEMI") i++;

      // Scan for @var reactive references in the CSS value
      const { refs, isExpression } = scanCSSValueForReactiveRefs(value);
      const rule = { prop, value, span: startSpan };
      if (refs.length > 0) {
        rule.reactiveRefs = refs;
        rule.isExpression = isExpression;
      }
      rules.push(rule);
    } else if (tok.kind === "CSS_SELECTOR") {
      const selector = tok.text;
      const selectorSpan = tokenSpan(tok, filePath);
      i++;
      // If followed by CSS_LBRACE, consume declarations until CSS_RBRACE
      if (i < tokens.length && tokens[i].kind === "CSS_LBRACE") {
        i++; // consume {
        const declarations = [];
        while (i < tokens.length && tokens[i].kind !== "CSS_RBRACE" && tokens[i].kind !== "EOF") {
          if (tokens[i].kind === "CSS_PROP") {
            const prop = tokens[i].text;
            const propSpan = tokenSpan(tokens[i], filePath);
            i++;
            if (i < tokens.length && tokens[i].kind === "CSS_COLON") i++;
            let value = "";
            if (i < tokens.length && tokens[i].kind === "CSS_VALUE") {
              value = tokens[i].text;
              i++;
            }
            if (i < tokens.length && tokens[i].kind === "CSS_SEMI") i++;
            const { refs, isExpression } = scanCSSValueForReactiveRefs(value);
            const decl = { prop, value, span: propSpan };
            if (refs.length > 0) { decl.reactiveRefs = refs; decl.isExpression = isExpression; }
            declarations.push(decl);
          } else {
            i++;
          }
        }
        if (i < tokens.length && tokens[i].kind === "CSS_RBRACE") i++; // consume }
        rules.push({ selector, declarations, span: selectorSpan });
      } else {
        // Selector without braces (unusual, keep as flat selector for backward compat)
        rules.push({ selector, span: selectorSpan });
      }
    } else {
      i++;
    }
  }

  return rules;
}

// ---------------------------------------------------------------------------
// Test block parser (~{})
// ---------------------------------------------------------------------------

/**
 * Parse test block tokens into a TestGroup IR node.
 *
 * Test body syntax:
 *   ~{ ["group name"]
 *     [before { statements }]
 *     test "name" { body }
 *     test "name" { body }
 *     [after { statements }]
 *   }
 *
 * Token kinds produced by tokenizeLogic:
 *   IDENT — identifiers, including "test", "assert", "before", "after"
 *            (these are NOT in the KEYWORDS set so they tokenize as IDENT)
 *   STRING — string literal content (without surrounding quotes)
 *   PUNCT  — single-char punctuation including { and }
 *   OPERATOR — multi-char operators like ==, !=, >=, <=
 *   EOF
 *
 * @param {Token[]} tokens - from tokenizeLogic
 * @param {string} filePath
 * @param {object} span - block span (for line numbers)
 * @param {TABError[]} errors
 * @returns {{ name: string|null, line: number, tests: object[], before: string[]|null, after: string[]|null }}
 */
function parseTestBody(tokens, filePath, span, errors) {
  let i = 0;
  let groupName = null;
  const tests = [];
  let beforeStmts = null;
  let afterStmts = null;

  /**
   * Collect raw statement tokens until a closing } at depth 0, or EOF.
   * Returns an array of raw statement strings.
   */
  function collectBody() {
    const stmts = [];
    let depth = 0;
    let parts = [];

    while (i < tokens.length && tokens[i].kind !== "EOF") {
      const tok = tokens[i];
      if (tok.kind === "PUNCT" && tok.text === "{") {
        depth++;
        parts.push(tok.text);
        i++;
      } else if (tok.kind === "PUNCT" && tok.text === "}") {
        if (depth === 0) break; // end of this body — do not consume
        depth--;
        parts.push(tok.text);
        i++;
        if (depth === 0 && parts.length > 0) {
          stmts.push(parts.join(" ").trim());
          parts = [];
        }
      } else {
        parts.push(tok.text);
        i++;
      }
    }
    if (parts.length > 0) {
      const s = parts.join(" ").trim();
      if (s) stmts.push(s);
    }
    return stmts;
  }

  /**
   * Split a raw assert expression string into { raw, op, lhs, rhs }.
   * Operators checked longest-first to avoid partial matches (>= before >).
   */
  function parseAssertExpr(raw) {
    const ops = ["==", "!=", ">=", "<=", ">", "<"];
    for (const op of ops) {
      const idx = raw.indexOf(op);
      if (idx !== -1) {
        const lhs = raw.slice(0, idx).trim();
        const rhs = raw.slice(idx + op.length).trim();
        if (lhs && rhs) {
          return { raw, op, lhs, rhs };
        }
      }
    }
    return { raw, op: null, lhs: null, rhs: null };
  }

  /**
   * Collect tokens for an assert expression until the next top-level statement
   * boundary: another assert/test/before/after IDENT at depth 0, or } or EOF.
   */
  function collectAssertTokens() {
    const parts = [];
    let depth = 0;
    while (i < tokens.length && tokens[i].kind !== "EOF") {
      const tok = tokens[i];
      if (tok.kind === "PUNCT" && tok.text === "}" && depth === 0) break;
      if (depth === 0 && tok.kind === "IDENT" &&
          (tok.text === "assert" || tok.text === "test" ||
           tok.text === "before" || tok.text === "after")) break;
      if (tok.kind === "PUNCT" && tok.text === "{") depth++;
      else if (tok.kind === "PUNCT" && tok.text === "}") depth--;
      parts.push(tok.text);
      i++;
    }
    return parts.join(" ").trim();
  }

  // Main parse loop
  while (i < tokens.length && tokens[i].kind !== "EOF") {
    const tok = tokens[i];

    // Group name: leading string literal before any tests or before-block
    if (tok.kind === "STRING" && groupName === null && tests.length === 0 && beforeStmts === null) {
      groupName = tok.text;
      i++;
      continue;
    }

    // before { } block
    if (tok.kind === "IDENT" && tok.text === "before") {
      i++; // consume "before"
      if (i < tokens.length && tokens[i].kind === "PUNCT" && tokens[i].text === "{") i++;
      beforeStmts = collectBody();
      if (i < tokens.length && tokens[i].kind === "PUNCT" && tokens[i].text === "}") i++;
      continue;
    }

    // after { } block
    if (tok.kind === "IDENT" && tok.text === "after") {
      i++; // consume "after"
      if (i < tokens.length && tokens[i].kind === "PUNCT" && tokens[i].text === "{") i++;
      afterStmts = collectBody();
      if (i < tokens.length && tokens[i].kind === "PUNCT" && tokens[i].text === "}") i++;
      continue;
    }

    // test "name" { } sub-block
    if (tok.kind === "IDENT" && tok.text === "test") {
      const testLine = (tok.span && tok.span.line) ? tok.span.line : span.line;
      i++; // consume "test"

      let testName = "";
      if (i < tokens.length && tokens[i].kind === "STRING") {
        testName = tokens[i].text;
        i++;
      }

      // Consume opening {
      if (i < tokens.length && tokens[i].kind === "PUNCT" && tokens[i].text === "{") i++;

      const caseBody = [];
      const caseAsserts = [];

      while (i < tokens.length && tokens[i].kind !== "EOF") {
        const inner = tokens[i];
        if (inner.kind === "PUNCT" && inner.text === "}") break;

        if (inner.kind === "IDENT" && inner.text === "assert") {
          i++; // consume "assert"
          const rawExpr = collectAssertTokens();
          const assertNode = parseAssertExpr(rawExpr);
          caseAsserts.push(assertNode);
          caseBody.push("assert " + rawExpr);
        } else {
          // Non-assert statement: collect tokens until next assert keyword or }
          const stmtParts = [];
          let depth = 0;
          while (i < tokens.length && tokens[i].kind !== "EOF") {
            const t = tokens[i];
            if (t.kind === "PUNCT" && t.text === "}" && depth === 0) break;
            if (depth === 0 && t.kind === "IDENT" && t.text === "assert") break;
            if (t.kind === "PUNCT" && t.text === "{") depth++;
            else if (t.kind === "PUNCT" && t.text === "}") depth--;
            stmtParts.push(t.text);
            i++;
          }
          const stmt = stmtParts.join(" ").trim();
          if (stmt) caseBody.push(stmt);
        }
      }

      // Consume closing }
      if (i < tokens.length && tokens[i].kind === "PUNCT" && tokens[i].text === "}") i++;

      tests.push({
        name: testName,
        line: testLine,
        body: caseBody,
        asserts: caseAsserts,
      });
      continue;
    }

    // Top-level assert (outside any test "name" {} sub-block)
    if (tok.kind === "IDENT" && tok.text === "assert") {
      i++; // consume "assert"
      const rawExpr = collectAssertTokens();
      const assertNode = parseAssertExpr(rawExpr);

      // Group top-level asserts into an implicit anonymous test case
      if (tests.length === 0 || tests[tests.length - 1].name !== "") {
        tests.push({
          name: "",
          line: (tok.span && tok.span.line) ? tok.span.line : span.line,
          body: [],
          asserts: [],
        });
      }
      const implicit = tests[tests.length - 1];
      implicit.asserts.push(assertNode);
      implicit.body.push("assert " + rawExpr);
      continue;
    }

    // Skip unrecognized tokens at top level
    i++;
  }

  return {
    name: groupName,
    line: span.line,
    tests,
    before: beforeStmts,
    after: afterStmts,
  };
}

// ---------------------------------------------------------------------------
// Error effect block parser
// ---------------------------------------------------------------------------

/**
 * Parse error-effect block content into MatchArm[].
 *
 * Error arm syntax: `| ::TypeA e -> handler`
 * We use a best-effort scan through the token stream.
 *
 * @param {Token[]} tokens
 * @param {string} filePath
 * @returns {MatchArm[]}
 */
function parseErrorTokens(tokens, filePath) {
  const arms = [];
  let i = 0;

  while (i < tokens.length && tokens[i].kind !== "EOF") {
    const tok = tokens[i];

    // Arm starts with `|`
    if (tok.kind === "PUNCT" && tok.text === "|") {
      const armStart = tok;
      i++;

      // Pattern: `::TypeName` or `_ `
      let pattern = "_";
      let binding = "";

      if (i < tokens.length && tokens[i].kind === "OPERATOR" && tokens[i].text === "::") {
        i++; // consume `::`
        if (i < tokens.length && (tokens[i].kind === "IDENT" || tokens[i].kind === "KEYWORD")) {
          pattern = "::" + tokens[i].text;
          i++;
        }
      } else if (i < tokens.length && tokens[i].text === "_") {
        pattern = "_";
        i++;
      }

      // Binding variable
      if (i < tokens.length && (tokens[i].kind === "IDENT")) {
        binding = tokens[i].text;
        i++;
      }

      // Arrow `->`
      if (i < tokens.length && tokens[i].kind === "OPERATOR" && (tokens[i].text === "=>" || tokens[i].text === ":>")) {
        i++; // Note: the tokenizer may emit `=>` or `:>` but the spec uses `->`. Handle both.
      } else if (i < tokens.length && tokens[i].kind === "PUNCT" && tokens[i].text === "-") {
        i++; // consume `-`
        if (i < tokens.length && tokens[i].kind === "OPERATOR" && tokens[i].text === ">") i++; // won't happen with `>`
        // `>` is emitted as PUNCT `>`
        if (i < tokens.length && tokens[i].kind === "PUNCT" && tokens[i].text === ">") i++;
      }

      // Handler: collect until next `|`, next simplified arm start, or EOF
      // BUG-ASI-ERROR-ARM: Track source line per token so newlines between statements
      // survive into rewriteBlockBody (which splits on semicolons and newlines).
      const handlerParts = [];
      const handlerPartLines = []; // parallel: source line number for each part
      while (i < tokens.length && tokens[i].kind !== "EOF") {
        if (tokens[i].kind === "PUNCT" && tokens[i].text === "|") break;
        // Also stop at simplified arm start (TypeName => or _ =>)
        if (
          i + 1 < tokens.length &&
          (tokens[i].kind === "IDENT" || tokens[i].kind === "KEYWORD") &&
          tokens[i + 1].kind === "OPERATOR" &&
          (tokens[i + 1].text === "=>" || tokens[i + 1].text === ":>") &&
          (tokens[i].text === "_" || /^[A-Z]/.test(tokens[i].text))
        ) break;
        // Re-quote STRING tokens so their delimiters are preserved in the handler
        if (tokens[i].kind === "STRING") {
          handlerParts.push('"' + tokens[i].text.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"');
        } else {
          handlerParts.push(tokens[i].text);
        }
        handlerPartLines.push(tokens[i].span?.line ?? 0);
        i++;
      }

      // Join with newline when consecutive tokens are on different source lines.
      let handlerJoined = handlerParts.length === 0 ? "" : handlerParts[0];
      for (let pi = 1; pi < handlerParts.length; pi++) {
        const sep = (handlerPartLines[pi] > handlerPartLines[pi - 1]) ? "\n" : " ";
        handlerJoined += sep + handlerParts[pi];
      }

      const _handlerTrimmed = handlerJoined.trim();
      arms.push({
        pattern,
        binding,
        handler: _handlerTrimmed,
        handlerExpr: (!_handlerTrimmed.startsWith("{")) ? safeParseExprToNodeGlobal(_handlerTrimmed, filePath, tokenSpan(armStart, filePath)?.start ?? 0) : undefined,
        span: tokenSpan(armStart, filePath),
      });
    } else if (
      i + 1 < tokens.length &&
      (tok.kind === "IDENT" || tok.kind === "KEYWORD") &&
      tokens[i + 1].kind === "OPERATOR" &&
      (tokens[i + 1].text === "=>" || tokens[i + 1].text === ":>") &&
      (tok.text === "_" || /^[A-Z]/.test(tok.text))
    ) {
      // Simplified arm syntax (§19 short form): TypeName => handler
      // No leading pipe, no :: prefix, no explicit binding variable name.
      // Produces the same arm shape as pipe-style arms, with implicit binding "e".
      const armStart = tok;
      const typeName = tok.text;
      const pattern = typeName === "_" ? "_" : "::" + typeName;
      const binding = "e";
      i++; // consume TypeName or _
      i++; // consume =>
      const handlerParts = [];
      const handlerPartLines = []; // parallel: source line number for each part
      while (i < tokens.length && tokens[i].kind !== "EOF") {
        // Stop at next simplified arm start (TypeName => or _ =>)
        if (
          i + 1 < tokens.length &&
          (tokens[i].kind === "IDENT" || tokens[i].kind === "KEYWORD") &&
          tokens[i + 1].kind === "OPERATOR" &&
          (tokens[i + 1].text === "=>" || tokens[i + 1].text === ":>") &&
          (tokens[i].text === "_" || /^[A-Z]/.test(tokens[i].text))
        ) break;
        // Stop at pipe-style arm start
        if (tokens[i].kind === "PUNCT" && tokens[i].text === "|") break;
        if (tokens[i].kind === "STRING") {
          handlerParts.push('"' + tokens[i].text.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"');
        } else {
          handlerParts.push(tokens[i].text);
        }
        handlerPartLines.push(tokens[i].span?.line ?? 0);
        i++;
      }
      // Join with newline when consecutive tokens are on different source lines.
      let handlerJoined = handlerParts.length === 0 ? "" : handlerParts[0];
      for (let pi = 1; pi < handlerParts.length; pi++) {
        const sep = (handlerPartLines[pi] > handlerPartLines[pi - 1]) ? "\n" : " ";
        handlerJoined += sep + handlerParts[pi];
      }
      const _handlerTrimmed2 = handlerJoined.trim();
      arms.push({
        pattern,
        binding,
        handler: _handlerTrimmed2,
        handlerExpr: (!_handlerTrimmed2.startsWith("{")) ? safeParseExprToNodeGlobal(_handlerTrimmed2, filePath, tokenSpan(armStart, filePath)?.start ?? 0) : undefined,
        span: tokenSpan(armStart, filePath),
      });
    } else {
      i++;
    }
  }

  return arms;
}

// ---------------------------------------------------------------------------
// Core block → ASTNode builder
// ---------------------------------------------------------------------------

/**
 * Build an ASTNode from a single Block.
 *
 * `parentContextKind` is the kind of the enclosing block (used for MetaBlock
 * parentContext field). For top-level blocks this is null.
 *
 * @param {object} block  — Block from BS output
 * @param {string} filePath
 * @param {string | null} parentContextKind
 * @param {{ next: number }} counter  — node ID counter shared across the compilation unit
 * @param {TABError[]} errors
 * @returns {ASTNode | null}
 */
function buildBlock(block, filePath, parentContextKind, counter, errors) {
  const span = fullSpan(block.span, filePath);

  switch (block.type) {

    // ------------------------------------------------------------------ text
    case "text":
      return {
        id: ++counter.next,
        kind: "text",
        value: block.raw,
        span,
      };

    // --------------------------------------------------------------- comment
    case "comment":
      return {
        id: ++counter.next,
        kind: "comment",
        value: block.raw,
        span,
      };

    // -------------------------------------------------------------- markup
    case "markup": {
      const attrTokens = tokenizeAttributes(
        block.raw,
        block.span.start,
        block.span.line,
        block.span.col,
        "markup"
      );
      const attrs = parseAttributes(attrTokens, filePath, errors, block.isComponent === true);

      const children = block.children.map(child =>
        buildBlock(child, filePath, "markup", counter, errors)
      ).filter(Boolean);

      return {
        id: ++counter.next,
        kind: "markup",
        tag: block.name,
        attrs,
        children,
        selfClosing: block.closerForm === "self-closing",
        closerForm: block.closerForm,
        isComponent: block.isComponent === true,
        span,
      };
    }

    // --------------------------------------------------------------- state
    case "state": {
      // §51.3: `< machine MachineName for TypeName>` — machine declaration
      // BS creates: block.name = "machine", block.raw = full tag content
      // including the opener line and body text up to the `/` closer.
      // Children contain text nodes with the rule content.
      if (block.name === "machine") {
        const machineRaw = (block.raw || "").trim();
        // Extract header: "< machine MachineName for TypeName>"
        // The first line (up to `>` or newline) contains the declaration.
        const firstLineEnd = machineRaw.indexOf(">");
        const headerLine = firstLineEnd >= 0
          ? machineRaw.slice(0, firstLineEnd)
          : machineRaw.split("\n")[0];
        // Strip "< machine " prefix
        let header = headerLine;
        const machineIdx = header.indexOf("machine");
        if (machineIdx >= 0) header = header.slice(machineIdx + "machine".length).trim();

        const forIdx = header.indexOf(" for ");
        let machineName = "";
        let governedType = "";
        if (forIdx >= 0) {
          machineName = header.slice(0, forIdx).trim();
          governedType = header.slice(forIdx + 5).trim();
        } else {
          machineName = header.trim();
        }
        // Strip trailing > or / from governedType
        governedType = governedType.replace(/[>/\s]+$/, "").trim();

        // Extract rules from children (text nodes containing the rule lines)
        let rulesRaw = "";
        if (block.children && block.children.length > 0) {
          for (const child of block.children) {
            if (child.raw) rulesRaw += child.raw + "\n";
          }
        }
        // Also extract from raw content after the header line
        if (!rulesRaw && firstLineEnd >= 0) {
          rulesRaw = machineRaw.slice(firstLineEnd + 1);
          // Strip trailing closer
          rulesRaw = rulesRaw.replace(/\/\s*$/, "");
        }
        rulesRaw = rulesRaw.trim();

        return {
          id: ++counter.next,
          kind: "machine-decl",
          machineName,
          governedType,
          rulesRaw,
          span,
        };
      }

      const attrTokens = tokenizeAttributes(
        block.raw,
        block.span.start,
        block.span.line,
        block.span.col,
        "state"
      );

      // §35.2: Check for typed attribute declarations. If present, this is a
      // state constructor definition, not a state instantiation.
      const { attrs, typedAttrs, hasTypedDecls } = parseTypedAttributes(attrTokens, filePath, errors);

      const children = block.children.map(child =>
        buildBlock(child, filePath, "state", counter, errors)
      ).filter(Boolean);

      if (hasTypedDecls) {
        // State constructor definition — `< name attrib(type)>` with typed declarations
        // Tag all function-decl nodes inside the constructor with stateTypeScope
        // so the type system can build an overload registry for state-type dispatch.
        tagFunctionsWithStateType(children, block.name);

        return {
          id: ++counter.next,
          kind: "state-constructor-def",
          stateType: block.name,
          typedAttrs,
          attrs,       // any non-typed attrs (e.g., metadata)
          children,    // constructor body
          span,
        };
      }

      return {
        id: ++counter.next,
        kind: "state",
        stateType: block.name,
        attrs,
        children,
        span,
      };
    }

    // --------------------------------------------------------------- logic
    case "logic": {
      // Body is between `${` and `}` — 2 chars prefix, 1 char suffix
      const bodyRaw = preprocessWorkerAndStateRefs(block.raw.slice(2, block.raw.length - 1));
      const bodyOffset = block.span.start + 2;
      const bodyLine = block.span.line;
      const bodyCol = block.span.col + 2;

      const tokens = tokenizeLogic(bodyRaw, bodyOffset, bodyLine, bodyCol, block.children);
      const body = parseLogicBody(tokens, filePath, block.children, block, counter, errors, "logic");

      // Hoist imports and exports from the body
      const imports = body.filter(n => n.kind === "import-decl");
      const exports = body.filter(n => n.kind === "export-decl");
      const typeDecls = body.filter(n => n.kind === "type-decl");
      // Attach defChildren to each component-def: siblings that follow it in the body.
      // Mark consumed nodes so they're removed from the body (avoid duplicate CSS output).
      const components = [];
      const consumedIndices = new Set();
      for (let ci = 0; ci < body.length; ci++) {
        if (body[ci].kind === "component-def") {
          const defChildren = [];
          for (let si = ci + 1; si < body.length; si++) {
            if (body[si].kind === "component-def" || body[si].kind === "import-decl" ||
                body[si].kind === "export-decl" || body[si].kind === "type-decl") break;
            defChildren.push(body[si]);
            consumedIndices.add(si);
          }
          body[ci].defChildren = defChildren;
          components.push(body[ci]);
        }
      }
      // Remove consumed nodes from body to prevent duplicate output
      const filteredBody = consumedIndices.size > 0
        ? body.filter((_, i) => !consumedIndices.has(i))
        : body;

      return {
        id: ++counter.next,
        kind: "logic",
        body: filteredBody,
        imports,
        exports,
        typeDecls,
        components,
        span,
      };
    }

    // --------------------------------------------------------------- sql
    case "sql": {
      const bodyRaw = block.raw.slice(2, block.raw.length - 1);
      const bodyOffset = block.span.start + 2;
      const bodyLine = block.span.line;
      const bodyCol = block.span.col + 2;

      const tokens = tokenizeSQL(bodyRaw, bodyOffset, bodyLine, bodyCol);
      const { query, chainedCalls } = parseSQLTokens(tokens, filePath);

      return {
        id: ++counter.next,
        kind: "sql",
        query,
        chainedCalls,
        span,
      };
    }

    // --------------------------------------------------------------- css (inline)
    case "css": {
      const bodyRaw = block.raw.slice(2, block.raw.length - 1);
      const bodyOffset = block.span.start + 2;
      const bodyLine = block.span.line;
      const bodyCol = block.span.col + 2;

      const tokens = tokenizeCSS(bodyRaw, bodyOffset, bodyLine, bodyCol);
      const rules = parseCSSTokens(tokens, filePath);

      return {
        id: ++counter.next,
        kind: "css-inline",
        rules,
        span,
      };
    }

    // --------------------------------------------------------------- style block
    case "style": {
      // `<style>` blocks: body is everything between `>` and the closer.
      // Since the block splitter treats this as a markup block with name="style",
      // the children already contain the CSS content as text/comment blocks.
      const children = block.children.map(child =>
        buildBlock(child, filePath, "style", counter, errors)
      ).filter(Boolean);

      return {
        id: ++counter.next,
        kind: "style",
        rules: [],        // detailed CSS parsing deferred — body is in children
        children,
        span,
      };
    }

    // --------------------------------------------------------------- error-effect
    case "error-effect": {
      // The raw may have two shapes:
      //   Legacy: `!{ | ::Type e -> body | ... }`
      //   New:    `!{ tryBody } catch Type [as binding] { handlerBody } ...`
      //
      // For legacy we strip `!{` and `}` and tokenize the whole thing.
      // For the new shape we split at the first `}` to get the try body, then
      // parse `catch TYPE [as BINDING] { body }` arms from the remainder.
      const rawContent = block.raw.slice(2); // strip leading `!{`
      const arms = [];

      // Detect whether any `catch` keyword follows the first `}`
      const firstClose = rawContent.indexOf("}");
      const hasCatch = firstClose !== -1 &&
        /\}\s*catch\b/.test(rawContent.slice(firstClose));

      if (hasCatch) {
        // Split: tryBodyRaw is up to first `}`, rest has the catch arms
        const tryBodyRaw = rawContent.slice(0, firstClose);
        let rest = rawContent.slice(firstClose + 1).trim();

        // Parse each `catch TYPE [as BINDING] { handlerBody }` arm
        const catchPattern = /^catch\s+([A-Za-z_$][A-Za-z0-9_$]*)(?:\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*))?\s*\{/;
        while (rest.length > 0) {
          const m = rest.match(catchPattern);
          if (!m) break;
          const typeName = m[1];
          const binding = m[2] ?? "";
          // Find the matching closing `}` (tracking nesting)
          const openPos = rest.indexOf("{", m.index ?? 0);
          let depth = 0;
          let closePos = openPos;
          for (let ci = openPos; ci < rest.length; ci++) {
            if (rest[ci] === "{") depth++;
            else if (rest[ci] === "}") { depth--; if (depth === 0) { closePos = ci; break; } }
          }
          const handlerBody = rest.slice(openPos + 1, closePos).trim();
          arms.push({
            pattern: typeName,
            binding,
            handler: handlerBody,
            handlerExpr: safeParseExprToNodeGlobal(handlerBody, filePath, block.span?.start ?? 0),
            span: { file: filePath, start: block.span.start, end: block.span.end, line: block.span.line, col: block.span.col },
          });
          rest = rest.slice(closePos + 1).trim();
        }

        // Parse the try body as logic nodes
        const bodyOffset = block.span.start + 2;
        const tryTokens = tokenizeLogic(tryBodyRaw, bodyOffset, block.span.line, block.span.col + 2, []);
        const tryBody = parseLogicBody(tryTokens, filePath, [], block, counter, errors, "logic");

        return {
          id: ++counter.next,
          kind: "error-effect",
          body: tryBody,
          arms,
          span,
        };
      } else {
        // Legacy `| ::Type e -> body` format
        const bodyRaw = rawContent.slice(0, rawContent.length - 1); // strip trailing `}`
        const bodyOffset = block.span.start + 2;
        const tokens = tokenizeError(bodyRaw, bodyOffset, block.span.line, block.span.col + 2);
        const legacyArms = parseErrorTokens(tokens, filePath);
        return {
          id: ++counter.next,
          kind: "error-effect",
          arms: legacyArms,
          span,
        };
      }
    }

    // --------------------------------------------------------------- meta
    case "meta": {
      const bodyRaw = block.raw.slice(2, block.raw.length - 1);
      const bodyOffset = block.span.start + 2;
      const bodyLine = block.span.line;
      const bodyCol = block.span.col + 2;

      const tokens = tokenizeLogic(bodyRaw, bodyOffset, bodyLine, bodyCol, block.children);
      const body = parseLogicBody(tokens, filePath, block.children, block, counter, errors, "meta");

      // parentContext: the kind passed in from the enclosing block
      // For top-level meta blocks, default to 'markup'
      const parentContext = parentContextKind
        ? mapParentContext(parentContextKind)
        : "markup";

      return {
        id: ++counter.next,
        kind: "meta",
        body,
        parentContext,
        span,
      };
    }

    // --------------------------------------------------------------- test (~{})
    case "test": {
      const bodyRaw = block.raw.slice(2, block.raw.length - 1);
      const bodyOffset = block.span.start + 2;
      const bodyLine = block.span.line;
      const bodyCol = block.span.col + 2;

      const tokens = tokenizeLogic(bodyRaw, bodyOffset, bodyLine, bodyCol, block.children);
      const testGroup = parseTestBody(tokens, filePath, span, errors);

      return {
        id: ++counter.next,
        kind: "test",
        testGroup,
        span,
      };
    }

    default: {
      // E-PARSE-001: unrecognized block structure — returning null would
      // silently drop the block. Record the condition so the user knows what
      // was missed.
      errors.push(new TABError(
        "E-PARSE-001",
        `E-PARSE-001: The construct starting here is not a recognized scrml block. ` +
        `Valid blocks are: markup tags, \`< state>\` blocks, \`\${ }\` logic, \`?{ }\` SQL, \`#{ }\` inline CSS, ` +
        `\`<style>\`, \`!{ }\` error handlers, \`^{ }\` meta, and \`~{ }\` test contexts. ` +
        `If you intended one of these, check that the opening delimiter is spelled correctly.`,
        span,
      ));
      return null;
    }
  }
}

/**
 * Map block.type to the ParentContextKind expected in the MetaBlock contract.
 * @param {string} blockType
 * @returns {string}
 */
function mapParentContext(blockType) {
  switch (blockType) {
    case "markup":      return "markup";
    case "state":       return "state";
    case "logic":       return "logic";
    case "sql":         return "sql";
    case "css":         return "css";
    case "error-effect": return "error";
    case "meta":        return "meta";
    default:            return "markup";
  }
}

// ---------------------------------------------------------------------------
// Hoist collector
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// §17.1.1 — else / else-if= chain collapsing
// ---------------------------------------------------------------------------

/** Check if a node is whitespace-only text (doesn't break chains). */
function isWhitespaceText(node) {
  return node.kind === "text" && (!node.value || !node.value.trim());
}

/** Get the named attribute from a markup node's attrs array. */
function getAttr(node, name) {
  if (node.kind !== "markup") return null;
  const attrs = node.attrs ?? [];
  return attrs.find(a => a.name === name) ?? null;
}

/** Has any of the named attributes. */
function hasAttr(node, ...names) {
  return names.some(n => getAttr(node, n) !== null);
}

/**
 * Scan a children array for if=/else-if=/else chains and collapse them
 * into IfChainExpr nodes. Recurses into all children.
 */
function collapseIfChains(nodes, errors, filePath) {
  // First recurse into children of each node
  for (const node of nodes) {
    if (node.children && Array.isArray(node.children)) {
      node.children = collapseIfChains(node.children, errors, filePath);
    }
    // Logic blocks have body arrays with nested markup
    if (node.body && Array.isArray(node.body)) {
      node.body = collapseIfChains(node.body, errors, filePath);
    }
  }

  // Now scan this level for chains
  const result = [];
  let i = 0;

  while (i < nodes.length) {
    const node = nodes[i];

    // E-CTRL-005: else or else-if on same element as if=
    if (node.kind === "markup" && hasAttr(node, "if") && (hasAttr(node, "else") || hasAttr(node, "else-if"))) {
      const span = node.span ?? { line: 0, col: 0 };
      errors.push(new TABError(
        "E-CTRL-005",
        `E-CTRL-005: \`else\` or \`else-if=\` and \`if=\` cannot appear on the same element.`,
        span,
      ));
      result.push(node);
      i++;
      continue;
    }

    // E-CTRL-001/002: orphaned else or else-if (no preceding if=)
    if (node.kind === "markup" && !hasAttr(node, "if")) {
      if (hasAttr(node, "else")) {
        const span = node.span ?? { line: 0, col: 0 };
        errors.push(new TABError(
          "E-CTRL-001",
          `E-CTRL-001: \`else\` on line ${span.line} has no preceding \`if=\` element at the same level.`,
          span,
        ));
        result.push(node);
        i++;
        continue;
      }
      if (hasAttr(node, "else-if")) {
        const span = node.span ?? { line: 0, col: 0 };
        errors.push(new TABError(
          "E-CTRL-002",
          `E-CTRL-002: \`else-if=\` on line ${span.line} has no preceding \`if=\` element at the same level.`,
          span,
        ));
        result.push(node);
        i++;
        continue;
      }
    }

    // Not an if= element — pass through
    if (node.kind !== "markup" || !hasAttr(node, "if")) {
      result.push(node);
      i++;
      continue;
    }

    // Found if= — start building chain
    const ifAttr = getAttr(node, "if");
    const branches = [{ condition: ifAttr.value, element: node }];
    let elseBranch = null;
    let j = i + 1;

    while (j < nodes.length) {
      // Skip whitespace-only text nodes
      if (isWhitespaceText(nodes[j])) {
        j++;
        continue;
      }

      const sibling = nodes[j];
      if (sibling.kind !== "markup") break;

      // E-CTRL-004: else/else-if on state opener
      if ((sibling.kind === "state" || sibling.kind === "state-constructor-def") &&
          (hasAttr(sibling, "else") || hasAttr(sibling, "else-if"))) {
        errors.push(new TABError(
          "E-CTRL-004",
          `E-CTRL-004: \`else\` or \`else-if=\` cannot appear on a state object opener.`,
          sibling.span ?? { line: 0, col: 0 },
        ));
        break;
      }

      if (hasAttr(sibling, "else-if")) {
        if (elseBranch) {
          // E-CTRL-003: extending past else
          errors.push(new TABError(
            "E-CTRL-003",
            `E-CTRL-003: The element on line ${(sibling.span?.line ?? 0)} tries to extend a chain that already ended with \`else\`.`,
            sibling.span ?? { line: 0, col: 0 },
          ));
          break;
        }
        const elseIfAttr = getAttr(sibling, "else-if");
        branches.push({ condition: elseIfAttr.value, element: sibling });
        j++;
        continue;
      }

      if (hasAttr(sibling, "else")) {
        if (elseBranch) {
          // E-CTRL-003
          errors.push(new TABError(
            "E-CTRL-003",
            `E-CTRL-003: The element on line ${(sibling.span?.line ?? 0)} tries to extend a chain that already ended with \`else\`.`,
            sibling.span ?? { line: 0, col: 0 },
          ));
          break;
        }
        elseBranch = sibling;
        j++;
        continue;
      }

      // Not an else/else-if — chain ends
      break;
    }

    // If chain has only one branch (just if=, no else/else-if), pass through as-is
    if (branches.length === 1 && !elseBranch) {
      result.push(node);
      i++;
      continue;
    }

    // Produce IfChainExpr node
    result.push({
      id: node.id,
      kind: "if-chain",
      branches,
      elseBranch,
      span: node.span,
    });

    // Skip whitespace nodes between i+1 and j (they were consumed by the chain)
    i = j;
  }

  return result;
}

/**
 * Walk an ASTNode tree and collect all import-decl, export-decl,
 * type-decl, and component-def nodes that live inside logic blocks.
 * These are hoisted into the FileAST top-level fields.
 */
function collectHoisted(nodes) {
  const imports = [];
  const exports = [];
  const typeDecls = [];
  const components = [];
  const machineDecls = [];

  function walk(nodeList) {
    for (const node of nodeList) {
      if (!node) continue;
      if (node.kind === "logic") {
        // Use the pre-filtered arrays cached on the logic node — do NOT also
        // walk node.body here, which would push every import-decl twice.
        imports.push(...(node.imports || []));
        exports.push(...(node.exports || []));
        typeDecls.push(...(node.typeDecls || []));
        components.push(...(node.components || []));
      }
      // §51.3: machine-decl nodes are children of markup (program), not logic
      if (node.kind === "machine-decl") {
        machineDecls.push(node);
      }
      if (node.kind === "markup" || node.kind === "state") {
        walk(node.children || []);
      }
      if (node.kind === "meta") {
        walkBodyNodes(node.body || []);
      }
    }
  }

  function walkBodyNodes(bodyNodes) {
    for (const node of bodyNodes) {
      if (!node) continue;
      if (node.kind === "import-decl") imports.push(node);
      if (node.kind === "export-decl") exports.push(node);
      if (node.kind === "type-decl") typeDecls.push(node);
      if (node.kind === "component-def") components.push(node);
      if (node.kind === "function-decl" && node.body) walkBodyNodes(node.body);
    }
  }

  walk(nodes);
  return { imports, exports, typeDecls, components, machineDecls };
}

// ---------------------------------------------------------------------------
// Span table builder
// ---------------------------------------------------------------------------

/**
 * Walk the AST and populate a span table: Map<nodeId, Span>.
 * Node IDs are assigned during construction (stored as `id` on each node);
 * this pass only reads them — it does not mutate any node.
 *
 * @param {ASTNode[]} nodes
 * @returns {Map<number, Span>}
 */
function buildSpanTable(nodes) {
  const table = new Map();

  function assign(node) {
    if (!node || typeof node !== "object") return;
    if (node.id !== undefined && node.span) table.set(node.id, node.span);

    for (const key of Object.keys(node)) {
      if (key === "span" || key === "id") continue;
      const val = node[key];
      if (Array.isArray(val)) val.forEach(assign);
      else if (val && typeof val === "object" && val.kind) assign(val);
    }
  }

  nodes.forEach(assign);
  return table;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Build a FileAST from Block Splitter output.
 *
 * @param {{ filePath: string, blocks: import('./block-splitter.js').Block[] }} bsOutput
 * @returns {{ filePath: string, ast: FileAST, errors: TABError[] }}
 */
export function buildAST(bsOutput, tokenizerOverrides) {
  const { filePath, blocks } = bsOutput;

  // When self-hosted tokenizer overrides are provided, install them as the
  // module-level tokenizer functions. Restore defaults after this call.
  if (tokenizerOverrides) {
    tokenizeAttributes = tokenizerOverrides.tokenizeAttributes ?? _defaultTokenizeAttributes;
    tokenizeLogic = tokenizerOverrides.tokenizeLogic ?? _defaultTokenizeLogic;
    tokenizeSQL = tokenizerOverrides.tokenizeSQL ?? _defaultTokenizeSQL;
    tokenizeCSS = tokenizerOverrides.tokenizeCSS ?? _defaultTokenizeCSS;
    tokenizeError = tokenizerOverrides.tokenizeError ?? _defaultTokenizeError;
    tokenizePassthrough = tokenizerOverrides.tokenizePassthrough ?? _defaultTokenizePassthrough;
  }

  // Node ID counter — local to this compilation unit to avoid cross-file collisions
  const counter = { next: 0 };

  // Accumulate all TAB errors encountered during this build pass
  const errors = [];

  // Lift bare top-level declarations (type, fn, function, server fn/function)
  // into synthetic logic blocks before building the AST. This allows users to
  // write them without an explicit ${ } wrapper.
  const liftedBlocks = liftBareDeclarations(blocks);

  // Build each top-level block into an ASTNode
  let nodes = liftedBlocks.map(block => buildBlock(block, filePath, null, counter, errors)).filter(Boolean);

  // §17.1.1: Collapse if=/else-if=/else sibling chains into IfChainExpr nodes
  nodes = collapseIfChains(nodes, errors, filePath);

  // Hoist imports, exports, type decls, components, machine decls from logic blocks
  const { imports, exports, typeDecls, components, machineDecls } = collectHoisted(nodes);

  // Build span table
  const spanTable = buildSpanTable(nodes);

  // Convert span table Map to plain object for serialisability
  const spans = {};
  for (const [id, span] of spanTable) {
    spans[id] = span;
  }

  // W-PROGRAM-001: Check for <program> root element
  const hasProgramRoot = nodes.some(
    n => n.kind === "markup" && n.tag === "program"
  );

  // ---------------------------------------------------------------------------
  // Session/auth attribute extraction from <program> (Option C hybrid)
  //
  // When <program auth="required" loginRedirect="/login" csrf="auto" sessionExpiry="2h">
  // is present, extract these into a top-level `authConfig` on the AST and annotate the
  // program markup node with the parsed auth properties.
  // ---------------------------------------------------------------------------

  let authConfig = null;
  const programNode = nodes.find(n => n.kind === "markup" && n.tag === "program");
  if (programNode) {
    const programAttrs = programNode.attrs ?? [];

    const getAttrValue = (name) => {
      const a = programAttrs.find(attr => attr.name === name);
      if (!a || !a.value || a.value.kind === "absent") return null;
      if (a.value.kind === "string-literal") return a.value.value;
      return null;
    };

    const authVal = getAttrValue("auth");
    if (authVal) {
      const loginRedirect = getAttrValue("loginRedirect") ?? "/login";
      const csrf = getAttrValue("csrf") ?? "off";
      const sessionExpiry = getAttrValue("sessionExpiry") ?? "1h";

      authConfig = {
        auth: authVal,
        loginRedirect,
        csrf,
        sessionExpiry,
      };

      // Annotate the program node directly for downstream stages
      programNode.auth = authVal;
      programNode.loginRedirect = loginRedirect;
      programNode.csrf = csrf;
      programNode.sessionExpiry = sessionExpiry;
    }
  }

  // ---------------------------------------------------------------------------
  // Middleware attribute extraction from <program> (§39)
  //
  // When <program cors="*" log="structured" csrf="on" ratelimit="100/min" headers="strict">
  // is present, extract these into a top-level `middlewareConfig` on the AST.
  // E-MW-001: csrf="on" without session infrastructure.
  // E-MW-002: ratelimit= value does not match N/unit pattern.
  // ---------------------------------------------------------------------------

  let middlewareConfig = null;
  if (programNode) {
    const programAttrs2 = programNode.attrs ?? [];

    const getMWAttr = (attrName) => {
      const a = programAttrs2.find(attr => attr.name === attrName);
      if (!a || !a.value || a.value.kind === 'absent') return null;
      if (a.value.kind === 'string-literal') return a.value.value;
      return null;
    };

    const mwCors = getMWAttr('cors');
    const mwLog = getMWAttr('log');
    const mwCsrf = getMWAttr('csrf');
    const mwRatelimit = getMWAttr('ratelimit');
    const mwHeaders = getMWAttr('headers');

    if (mwCors !== null || mwLog !== null || mwCsrf !== null || mwRatelimit !== null || mwHeaders !== null) {
      middlewareConfig = { cors: mwCors, log: mwLog, csrf: mwCsrf, ratelimit: mwRatelimit, headers: mwHeaders };
    }

    // E-MW-001: csrf="on" requires session infrastructure (auth= on <program>).
    if (mwCsrf === 'on' && !authConfig) {
      const programSpan2 = programNode.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 };
      errors.push(new TABError(
        'E-MW-001',
        'E-MW-001: csrf="on" requires session infrastructure. ' +
        'Add <program auth="required"> or use a session handler, or remove csrf="on".',
        programSpan2,
      ));
    }

    // E-MW-002: ratelimit= value must match N/unit where unit is sec, min, or hour.
    if (mwRatelimit !== null && !/^\d+\/(sec|min|hour)$/.test(mwRatelimit)) {
      const ratelimitAttr = programAttrs2.find(attr => attr.name === 'ratelimit');
      const ratelimitSpan = ratelimitAttr?.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 };
      errors.push(new TABError(
        'E-MW-002',
        'E-MW-002: Invalid ratelimit= value "' + mwRatelimit + '". Expected format: N/unit where unit is sec, min, or hour. Example: ratelimit="100/min".',
        ratelimitSpan,
      ));
    }
  }

  // E-MW-005/E-MW-006: handle() validation across top-level logic blocks.
  // E-MW-005: more than one handle() defined at file top level.
  // E-MW-006: handle() defined nested inside another function body.
  //
  // NOTE: ${ } logic blocks inside <program>...</program> are CHILDREN of the
  // program markup node (ast.nodes[0].children), not top-level nodes. We must
  // search programNode.children (and top-level nodes for files without <program>).
  {
    // Build the list of node arrays to search for top-level logic blocks.
    // Includes both top-level nodes and children of the <program> markup node.
    const nodeListsToSearch = [nodes];
    if (programNode && Array.isArray(programNode.children)) {
      nodeListsToSearch.push(programNode.children);
    }

    const topLevelHandles = [];
    for (const nodeList of nodeListsToSearch) {
      for (const node of nodeList) {
        if (node?.kind === 'logic') {
          for (const stmt of (node.body ?? [])) {
            if (stmt?.kind === 'function-decl' && stmt.isHandleEscapeHatch) {
              topLevelHandles.push(stmt);
            }
          }
        }
      }
    }

    // E-MW-005: duplicate handle()
    if (topLevelHandles.length > 1) {
      const firstSpan = topLevelHandles[0].span;
      const firstLine = firstSpan ? firstSpan.line : '?';
      for (let idx = 1; idx < topLevelHandles.length; idx++) {
        errors.push(new TABError(
          'E-MW-005',
          'E-MW-005: Only one handle() function is allowed per file. A second definition was found here; the first is at line ' + firstLine + '.',
          topLevelHandles[idx].span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 },
        ));
      }
    }

    // E-MW-006: handle() defined nested inside another function body.
    function findNestedHandles(stmts) {
      for (const stmt of (stmts ?? [])) {
        if (!stmt) continue;
        if (stmt.kind === 'function-decl' && stmt.isHandleEscapeHatch) {
          errors.push(new TABError(
            'E-MW-006',
            'E-MW-006: handle() must be defined at file top level inside a ${ } block. Found definition inside a nested function body.',
            stmt.span ?? { file: filePath, start: 0, end: 0, line: 1, col: 1 },
          ));
        }
        if (stmt.kind === 'function-decl' && !stmt.isHandleEscapeHatch) {
          findNestedHandles(stmt.body ?? []);
        }
        if (stmt.kind === 'if-stmt') {
          findNestedHandles(stmt.consequent ?? []);
          findNestedHandles(stmt.alternate ?? []);
        }
        if (stmt.kind === 'for-stmt' || stmt.kind === 'while-stmt') {
          findNestedHandles(stmt.body ?? []);
        }
      }
    }

    for (const nodeList of nodeListsToSearch) {
      for (const node of nodeList) {
        if (node?.kind === 'logic') {
          for (const stmt of (node.body ?? [])) {
            if (stmt?.kind === 'function-decl' && !stmt.isHandleEscapeHatch) {
              findNestedHandles(stmt.body ?? []);
            }
          }
        }
      }
    }
  }

  const ast = {
    filePath,
    nodes,
    imports,
    exports,
    components,
    typeDecls,
    machineDecls,
    spans,
    hasProgramRoot,
    authConfig,
    middlewareConfig,
  };

  if (!hasProgramRoot) {
    errors.push(new TABError(
      "W-PROGRAM-001",
      `W-PROGRAM-001: No <program> root element found. Consider wrapping your file ` +
      `content in <program> ... </program> for explicit configuration of database ` +
      `connections, protection, and HTML spec version.`,
      { start: 0, end: 0, line: 1, col: 1 },
    ));
    // Mark as warning severity for downstream filtering
    errors[errors.length - 1].severity = "warning";
  }

  // Restore default tokenizer functions if overrides were installed
  if (tokenizerOverrides) {
    tokenizeAttributes = _defaultTokenizeAttributes;
    tokenizeLogic = _defaultTokenizeLogic;
    tokenizeSQL = _defaultTokenizeSQL;
    tokenizeCSS = _defaultTokenizeCSS;
    tokenizeError = _defaultTokenizeError;
    tokenizePassthrough = _defaultTokenizePassthrough;
  }

  return { filePath, ast, errors };
}

/**
 * Pipeline-contract wrapper. Accepts the BS output shape.
 *
 * @param {{ filePath: string, blocks: Block[] }} input
 * @returns {{ filePath: string, ast: FileAST, errors: TABError[] }}
 */
export function runTAB(input) {
  return buildAST(input);
}

export { TABError as default };
