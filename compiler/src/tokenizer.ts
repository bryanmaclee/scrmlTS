/**
 * Tokenizer — Stage 3a of the scrml compiler pipeline (TAB).
 *
 * Produces per-block token streams from Block Splitter output. Each block type
 * gets its own tokenization rules. Tokens carry spans so every downstream AST
 * node can carry source location without recomputation.
 *
 * Token kinds
 * -----------
 * Common
 *   EOF
 *   IDENT         identifier (letter | _ | -) (letter | digit | _ | -)*
 *   NUMBER        numeric literal (integer or float)
 *   STRING        double-quoted or back-tick string literal (raw text between delimiters)
 *   PUNCT         single-char punctuation: ( ) [ ] { } , ; . : ! & | + - * / % ^ ~ = < > ?
 *   OPERATOR      multi-char operators: => == != <= >= ** ... etc.
 *   KEYWORD       scrml / JS reserved words (see KEYWORDS below)
 *   AT_IDENT      @name reactive sigil
 *   TILDE         ~ pipeline accumulator keyword
 *   BLOCK_REF     embedded child block placeholder (for logic/sql/css/error-effect/meta children)
 *   TEXT          raw text content (inside markup/state)
 *   COMMENT       // … to end-of-line
 *
 * Attribute-specific (markup / state block header)
 *   ATTR_NAME     attribute name
 *   ATTR_EQ       =
 *   ATTR_STRING   "…" quoted string value
 *   ATTR_IDENT    unquoted identifier value
 *   ATTR_CALL     unquoted fn() call value (name + args string)
 *   ATTR_BLOCK    {...} brace-block attribute value (raw content between braces, for props={...})
 *   ATTR_TYPED_DECL  name(type) typed attribute in state blocks
 *   ATTR_EXPR     boolean expression value for if= attribute (negation, equality, logical ops)
 *   TAG_OPEN      < name
 *   TAG_CLOSE_GT  >
 *   TAG_SELF_CLOSE />
 *
 * CSS-specific
 *   CSS_SELECTOR  selector text
 *   CSS_PROP      property name
 *   CSS_COLON     :
 *   CSS_VALUE     property value (everything up to ; or })
 *   CSS_SEMI      ;
 *   CSS_LBRACE    {
 *   CSS_RBRACE    }
 *
 * SQL-specific
 *   SQL_RAW       raw query text (template literal contents)
 *   SQL_ARGS      argument string for a chained call (synthetic token)
 */

// ---------------------------------------------------------------------------
// scrml + JS keywords
// ---------------------------------------------------------------------------
const KEYWORDS = new Set([
  // scrml-specific
  "lift", "fn", "server", "match", "is", "type", "let", "const", "import",
  "export", "from", "as", "default", "return", "if", "else", "for", "while",
  "of", "in", "do", "switch", "case", "break", "continue", "throw", "try",
  "catch", "finally", "new", "delete", "typeof", "instanceof", "void",
  "class", "extends", "super", "this", "null", "undefined", "true", "false",
  "function", "async", "await", "yield", "static", "get", "set",
  // scrml error system
  "fail", "transaction",
  // scrml built-in functions / modifiers
  "cleanup", "upload", "debounce", "throttle",
  // scrml env access modifier
  "env", "public",
  // scrml reactive effects (§6.7.4)
  "when", "changes",
  // scrml lifecycle built-ins (§6.7.5–6.7.7)
  "animationFrame",
  // scrml channel built-ins (§35)
  "broadcast", "disconnect",
  // scrml top-level
  "use", "using", "with", "navigate",
  // §42 absence value
  "not",
  // §42.2.3 given — presence guard keyword
  "given",
  // §18.18 partial match modifier
  "partial",
  // §35.2 linear types — lin variable declaration keyword
  "lin",
]);

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

export interface Span {
  start: number;
  end: number;
  line: number;
  col: number;
}

/** A child block from Block Splitter output. */
export interface Block {
  type: string;
  raw: string;
  span: { start: number; end: number; line?: number; col?: number };
  children?: Block[];
}

/**
 * A single token produced by the tokenizer. BLOCK_REF tokens additionally
 * carry a `block` field referencing the child Block from BS output.
 */
export interface Token {
  kind: string;
  text: string;
  span: Span;
  block?: Block;
}

// ---------------------------------------------------------------------------
// Token factory
// ---------------------------------------------------------------------------

function makeToken(kind: string, text: string, start: number, end: number, line: number, col: number): Token {
  return { kind, text, span: { start, end, line, col } };
}

// ---------------------------------------------------------------------------
// Attribute tokenizer — used by markup and state block headers
// ---------------------------------------------------------------------------

/**
 * Tokenize the attribute region of a markup or state block header.
 *
 * `raw` is the full raw string of the block (e.g. `<div class="foo" id=bar>`).
 * `baseOffset` is the source offset of the first character of `raw`.
 * `baseLine` / `baseCol` are the 1-based source position of the first character.
 *
 * Returns an array of attribute tokens (ATTR_NAME, ATTR_EQ, ATTR_STRING,
 * ATTR_IDENT, ATTR_CALL, ATTR_BLOCK, ATTR_EXPR) for the attribute region,
 * plus TAG_OPEN, TAG_CLOSE_GT or TAG_SELF_CLOSE.
 *
 * For state blocks the raw starts with `< ` (plus optional whitespace before the
 * identifier), so we skip past `<`, skip whitespace, then skip the identifier.
 * For markup blocks the raw starts with `<identifier`.
 */
export function tokenizeAttributes(raw: string, baseOffset: number, baseLine: number, baseCol: number, blockType: 'markup' | 'state'): Token[] {
  const tokens: Token[] = [];

  let pos = 0;      // offset within raw
  let line = baseLine;
  let col = baseCol;

  function absOff() { return baseOffset + pos; }

  function ch(n = 0) { return pos + n < raw.length ? raw[pos + n] : ""; }

  function advance(n = 1) {
    for (let i = 0; i < n; i++) {
      if (pos < raw.length) {
        if (raw[pos] === "\n") { line++; col = 1; }
        else { col++; }
        pos++;
      }
    }
  }

  function skipWs() {
    while (pos < raw.length && /[ \t\r\n\f]/.test(raw[pos])) advance();
  }

  function readIdentRaw() {
    let id = "";
    while (pos < raw.length && /[A-Za-z0-9_\-]/.test(raw[pos])) {
      id += raw[pos];
      advance();
    }
    return id;
  }

  // --- Consume the opening `<` ---
  const tagOpenStart = absOff();
  const tagOpenLine = line;
  const tagOpenCol = col;
  advance(); // consume `<`

  // Skip whitespace (for state blocks)
  if (blockType === "state") {
    skipWs();
  }

  // Read tag/state name
  const tagName = readIdentRaw();

  tokens.push(makeToken("TAG_OPEN", tagName, tagOpenStart, absOff(), tagOpenLine, tagOpenCol));

  // --- Now tokenize attributes until `>` or `/>` ---
  while (pos < raw.length) {
    skipWs();

    if (pos >= raw.length) break;

    const c = ch();

    // Self-closing: />
    if (c === "/" && ch(1) === ">") {
      const start = absOff();
      const l = line, co = col;
      advance(2);
      tokens.push(makeToken("TAG_SELF_CLOSE", "/>", start, absOff(), l, co));
      break;
    }

    // End of tag: >
    if (c === ">") {
      const start = absOff();
      const l = line, co = col;
      advance();
      tokens.push(makeToken("TAG_CLOSE_GT", ">", start, absOff(), l, co));
      break;
    }

    // Attribute name
    if (/[A-Za-z_@]/.test(c)) {
      const atStart = absOff();
      const atLine = line;
      const atCol = col;
      let name = "";
      while (pos < raw.length && /[A-Za-z0-9_\-:@]/.test(raw[pos])) {
        name += raw[pos];
        advance();
      }
      // §35.2: In state blocks, `name(type)` (no preceding `=`) is a typed
      // attribute declaration, not a call expression. Detect this pattern before
      // emitting the ATTR_NAME token.
      if (blockType === "state" && ch() === "(") {
        // Typed attribute declaration: collect the type expression inside parens.
        advance(); // consume `(`
        let typeExpr = "";
        let depth = 1;
        while (pos < raw.length && depth > 0) {
          if (raw[pos] === "(") depth++;
          else if (raw[pos] === ")") {
            depth--;
            if (depth === 0) { advance(); break; }
          }
          typeExpr += raw[pos];
          advance();
        }
        tokens.push(makeToken("ATTR_TYPED_DECL", JSON.stringify({ name, typeExpr }), atStart, absOff(), atLine, atCol));
        continue;  // next attribute
      }

      tokens.push(makeToken("ATTR_NAME", name, atStart, absOff(), atLine, atCol));

      skipWs();

      // Check for = assignment
      if (ch() === "=") {
        const eqStart = absOff();
        const eqLine = line;
        const eqCol = col;
        advance(); // consume `=`
        tokens.push(makeToken("ATTR_EQ", "=", eqStart, absOff(), eqLine, eqCol));

        skipWs();

        // Value: quoted string, brace-block, identifier, call, or if= expression
        if (ch() === '"') {
          // Quoted string value.
          // For `if=` attributes: quoted values may contain boolean expressions
          // (e.g. `if="@var === 'x'"`, `if="@a && @b"`). Emit ATTR_EXPR for if=
          // so downstream can distinguish from plain static strings.
          const vs = absOff();
          const vl = line;
          const vc = col;
          advance(); // consume opening `"`
          let str = "";
          while (pos < raw.length && raw[pos] !== '"') {
            if (raw[pos] === "\\" && pos + 1 < raw.length) {
              str += raw[pos] + raw[pos + 1];
              advance(2);
            } else {
              str += raw[pos];
              advance();
            }
          }
          if (ch() === '"') advance(); // consume closing `"`
          if (name === "if") {
            // if= quoted value: always emit ATTR_EXPR so the AST builder
            // can produce an expr node for reactive wiring.
            tokens.push(makeToken("ATTR_EXPR", str, vs, absOff(), vl, vc));
          } else {
            tokens.push(makeToken("ATTR_STRING", str, vs, absOff(), vl, vc));
          }
        } else if (ch() === '{') {
          // Brace-block attribute value: `props={...}` typed props declaration (§15.10)
          const vs = absOff();
          const vl = line;
          const vc = col;
          advance(); // consume opening `{`
          let blockContent = "";
          let depth = 1;
          while (pos < raw.length && depth > 0) {
            if (raw[pos] === '{') depth++;
            else if (raw[pos] === '}') {
              depth--;
              if (depth === 0) { advance(); break; }
            }
            blockContent += raw[pos];
            advance();
          }
          tokens.push(makeToken("ATTR_BLOCK", blockContent, vs, absOff(), vl, vc));
        } else if (ch() === "!") {
          // Unquoted negation expression: `!@var`, `!!@var`, `!obj.prop`, etc.
          // Applies to any attribute (if=, class:name=, show=, etc.).
          // Read everything up to whitespace or tag-close characters.
          // Note: `>` and `/` would close the tag so they cannot appear unquoted.
          // Expressions with >, <, &&, ||, ===, !== must be quoted; use parens: `(!@a || !@b)`.
          const vs = absOff();
          const vl = line;
          const vc = col;
          let expr = "";
          while (pos < raw.length && !/[ \t\r\n\f>\/]/.test(raw[pos])) {
            expr += raw[pos];
            advance();
          }
          tokens.push(makeToken("ATTR_EXPR", expr, vs, absOff(), vl, vc));
        } else if (ch() === "(") {
          // Parenthesized expression for any attribute: `if=(@state === "loading")`,
          // `class:active=(@tool === "select")`, `show=(@count > 0)`, etc.
          // Read everything between the outer parens, preserving the parens in the output.
          // Supports nested parens: `if=((@a || @b) && @c)`.
          const vs = absOff();
          const vl = line;
          const vc = col;
          let expr = "";
          expr += raw[pos]; // include opening (
          advance();
          let depth = 1;
          while (pos < raw.length && depth > 0) {
            if (raw[pos] === "(") depth++;
            else if (raw[pos] === ")") {
              depth--;
              if (depth === 0) {
                expr += raw[pos];
                advance();
                break;
              }
            }
            expr += raw[pos];
            advance();
          }
          tokens.push(makeToken("ATTR_EXPR", expr, vs, absOff(), vl, vc));
        } else if (ch() === '$' && pos + 1 < raw.length && raw[pos + 1] === '{') {
          // Inline expression: ${() => fn(arg)}, ${condition ? a : b}, etc.
          const vs = absOff();
          const vl = line;
          const vc = col;
          advance(); // consume '$'
          advance(); // consume '{'
          let expr = "";
          let depth = 1;
          while (pos < raw.length && depth > 0) {
            if (raw[pos] === '{') depth++;
            else if (raw[pos] === '}') {
              depth--;
              if (depth === 0) { advance(); break; }
            }
            expr += raw[pos];
            advance();
          }
          tokens.push(makeToken("ATTR_EXPR", expr, vs, absOff(), vl, vc));
        } else if (/[A-Za-z0-9_@]/.test(ch())) {
          // Unquoted: peek ahead to see if it's a call (has `(`)
          const vs = absOff();
          const vl = line;
          const vc = col;
          let ident = "";
          while (pos < raw.length && /[A-Za-z0-9_\-\.@]/.test(raw[pos])) {
            ident += raw[pos];
            advance();
          }
          if (ch() === "(") {
            // Call form: collect everything up to matching `)`
            let args = "";
            advance(); // consume `(`
            let depth = 1;
            while (pos < raw.length && depth > 0) {
              if (raw[pos] === "(") depth++;
              else if (raw[pos] === ")") { depth--; if (depth === 0) { advance(); break; } }
              args += raw[pos];
              advance();
            }
            tokens.push(makeToken("ATTR_CALL", JSON.stringify({ name: ident, args }), vs, absOff(), vl, vc));
          } else {
            tokens.push(makeToken("ATTR_IDENT", ident, vs, absOff(), vl, vc));
          }
        } else if (ch() === '<' && pos + 1 < raw.length && raw[pos + 1] === '#') {
          // Worker ref or input state ref in attribute value position.
          // The attribute scanner cannot handle '#' in identifiers, so we detect and decode
          // the <#name> pattern directly here.
          // <#name>.send(args) → ATTR_CALL { name: "_scrml_worker_name.send", args }
          // <#name>            → ATTR_IDENT "_scrml_input_name_"
          // Mirrors preprocessWorkerAndStateRefs() in ast-builder.js (logic block context).
          const vs = absOff();
          const vl = line;
          const vc = col;
          advance(2); // consume '<#'
          let refName = "";
          while (pos < raw.length && /[A-Za-z0-9_$]/.test(raw[pos])) {
            refName += raw[pos];
            advance();
          }
          if (ch() === '>') advance(); // consume '>'
          // Skip optional spaces, then check for .send(
          while (pos < raw.length && raw[pos] === ' ') advance();
          if (ch() === '.' && raw.slice(pos + 1).match(/^send\s*\(/)) {
            advance(); // consume '.'
            while (pos < raw.length && /[a-z]/.test(raw[pos])) advance(); // consume 'send'
            while (pos < raw.length && raw[pos] === ' ') advance(); // skip ws before (
            if (ch() === '(') {
              advance(); // consume '('
              let args = "";
              let depth = 1;
              while (pos < raw.length && depth > 0) {
                if (raw[pos] === '(') depth++;
                else if (raw[pos] === ')') { depth--; if (depth === 0) { advance(); break; } }
                args += raw[pos];
                advance();
              }
              tokens.push(makeToken("ATTR_CALL", JSON.stringify({ name: `_scrml_worker_${refName}.send`, args }), vs, absOff(), vl, vc));
            }
          } else {
            // Standalone <#name> — input state ref
            tokens.push(makeToken("ATTR_IDENT", `_scrml_input_${refName}_`, vs, absOff(), vl, vc));
          }
        }
        // (Other value forms not currently handled — fallthrough skips them)
      }
      // Boolean attribute (no =): ATTR_NAME alone is sufficient
    } else {
      // Sigil-prefixed brace block in standalone attribute position:
      // ${...}, ^{...}, ?{...}, #{...}, !{...}, ~{...}
      // Must consume as opaque unit — otherwise content like bun.eval() or
      // process.env would be tokenized as ATTR_NAME/ATTR_CALL, leaking
      // server-context code into client JS via event binding paths.
      if (
        (c === '$' || c === '^' || c === '?' || c === '#' || c === '!' || c === '~') &&
        pos + 1 < raw.length && raw[pos + 1] === '{'
      ) {
        advance(); advance(); // consume sigil and '{'
        let depth = 1;
        while (pos < raw.length && depth > 0) {
          const bc = raw[pos];
          if (bc === '`') {
            // Template literal: scan until matching backtick
            advance();
            while (pos < raw.length) {
              const tc = raw[pos];
              if (tc === '\\') { advance(); advance(); continue; }
              if (tc === '`') { advance(); break; }
              if (tc === '$' && pos + 1 < raw.length && raw[pos + 1] === '{') {
                advance(); advance();
                let innerDepth = 1;
                while (pos < raw.length && innerDepth > 0) {
                  const ic = raw[pos];
                  if (ic === '{') innerDepth++;
                  else if (ic === '}') { innerDepth--; if (innerDepth === 0) { advance(); break; } }
                  advance();
                }
                continue;
              }
              advance();
            }
            continue;
          }
          if (bc === '{') depth++;
          else if (bc === '}') {
            depth--;
            if (depth === 0) { advance(); break; }
          }
          advance();
        }
        continue;
      }
      // Unexpected char — skip
      advance();
    }
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Logic / meta block tokenizer
// ---------------------------------------------------------------------------

/**
 * Tokenize the body content of a logic (`${}`) or meta (`^{}`) block.
 *
 * `content` is the raw content BETWEEN the delimiters (i.e., the block `.raw`
 * with the opening `${` / `^{` and closing `}` stripped).
 *
 * `baseOffset` is the source offset of content[0].
 * `baseLine` / `baseCol` are the 1-based source position of content[0].
 *
 * Only brace-delimited child blocks (logic, sql, css, error-effect, meta) are
 * represented as BLOCK_REF tokens — text and comment blocks are raw content
 * that already appears verbatim in `content` and must not be skipped.
 *
 * `children` — child blocks in source order (from BS output)
 */
export function tokenizeLogic(content: string, baseOffset: number, baseLine: number, baseCol: number, children: Block[]): Token[] {
  const tokens: Token[] = [];

  let pos = 0;
  let line = baseLine;
  let col = baseCol;

  // Only brace-delimited block types should be skipped and replaced with BLOCK_REF.
  // Text and comment blocks are already represented as raw characters in `content`.
  const BLOCKREF_TYPES = new Set(["logic", "sql", "css", "error-effect", "meta"]);

  const childByStart = new Map<number, Block>();
  for (const child of children) {
    if (!BLOCKREF_TYPES.has(child.type)) continue;
    // child.span.start is absolute; content starts at baseOffset
    const relStart = child.span.start - baseOffset;
    if (relStart >= 0 && relStart < content.length) {
      childByStart.set(relStart, child);
    }
  }

  function absOff() { return baseOffset + pos; }
  function ch(n = 0) { return pos + n < content.length ? content[pos + n] : ""; }

  function advance(n = 1) {
    for (let i = 0; i < n; i++) {
      if (pos < content.length) {
        if (content[pos] === "\n") { line++; col = 1; }
        else { col++; }
        pos++;
      }
    }
  }

  function skipWs() {
    while (pos < content.length && /[ \t\r\n\f]/.test(content[pos])) advance();
  }

  function isIdentStart(c: string): boolean { return /[A-Za-z_$]/.test(c); }
  function isIdentPart(c: string): boolean  { return /[A-Za-z0-9_$]/.test(c); }

  function readIdent() {
    let id = "";
    while (pos < content.length && isIdentPart(content[pos])) {
      id += content[pos];
      advance();
    }
    return id;
  }

  function readLineComment() {
    const start = absOff();
    const l = line, c = col;
    let text = "";
    while (pos < content.length && content[pos] !== "\n") {
      text += content[pos];
      advance();
    }
    if (pos < content.length) { text += "\n"; advance(); } // consume \n
    tokens.push(makeToken("COMMENT", text, start, absOff(), l, c));
  }

  function readBlockComment() {
    const start = absOff();
    const l = line, c = col;
    let text = "";
    while (pos < content.length) {
      if (content[pos] === "*" && ch(1) === "/") {
        text += "*/";
        advance(2);
        break;
      }
      text += content[pos];
      advance();
    }
    tokens.push(makeToken("COMMENT", text, start, absOff(), l, c));
  }

  function readString(delim: string) {
    const start = absOff();
    const l = line, c = col;
    advance(); // consume opening delimiter
    let str = "";
    while (pos < content.length && content[pos] !== delim) {
      if (content[pos] === "\\" && pos + 1 < content.length) {
        str += content[pos] + content[pos + 1];
        advance(2);
      } else {
        str += content[pos];
        advance();
      }
    }
    if (pos < content.length) advance(); // consume closing delimiter
    tokens.push(makeToken("STRING", str, start, absOff(), l, c));
  }

  function readBacktickString() {
    const start = absOff();
    const l = line, c = col;
    advance(); // consume `
    let str = "";
    let depth = 1;
    while (pos < content.length && depth > 0) {
      if (content[pos] === "`") {
        depth--;
        if (depth === 0) { advance(); break; }
      }
      str += content[pos];
      advance();
    }
    tokens.push(makeToken("STRING", str, start, absOff(), l, c));
  }

  function readNumber() {
    const start = absOff();
    const l = line, c = col;
    let num = "";
    // Hex
    if (content[pos] === "0" && /[xXoObB]/.test(ch(1))) {
      num += content[pos] + content[pos + 1];
      advance(2);
      while (pos < content.length && /[0-9a-fA-F_]/.test(content[pos])) {
        num += content[pos];
        advance();
      }
    } else {
      while (pos < content.length && /[0-9_]/.test(content[pos])) {
        num += content[pos];
        advance();
      }
      if (ch() === "." && /[0-9]/.test(ch(1))) {
        num += ".";
        advance();
        while (pos < content.length && /[0-9_]/.test(content[pos])) {
          num += content[pos];
          advance();
        }
      }
      if (/[eE]/.test(ch())) {
        num += content[pos];
        advance();
        if (/[+-]/.test(ch())) { num += content[pos]; advance(); }
        while (pos < content.length && /[0-9]/.test(content[pos])) {
          num += content[pos];
          advance();
        }
      }
    }
    tokens.push(makeToken("NUMBER", num, start, absOff(), l, c));
  }

  // ---------------------------------------------------------------------------
  // Regex literal detection and consumption
  // ---------------------------------------------------------------------------

  /**
   * Returns true when the current `/` should be the start of a regex literal
   * rather than a division operator.
   *
   * Heuristic: `/` is a regex when the last non-comment token is NOT a
   * value-producing token. Value-producing (division): IDENT, NUMBER, STRING,
   * REGEX, value keywords (true/false/null/undefined/this), `)`, `]`.
   * Everything else → regex context.
   */
  function isRegexContext() {
    // Walk backward, skipping comments, to find the preceding token.
    // Regex context: token is an operator/punctuation that cannot end a value
    //   expression, OR a statement keyword, OR start of stream.
    // Division context: the preceding token produces a value (IDENT, NUMBER,
    //   STRING, REGEX, value keywords like true/false/null/undefined/this,
    //   or closing ) / ]).
    //
    // Explicit regex-context PUNCT tokens (cannot end a value expression):
    //   ( [ { , ; ! ~ & | ^ ? : = + - * % < > =>  and compound operators
    // Explicit division-context PUNCT/KEYWORD tokens (end a value expression):
    //   ) ]   and value keywords: true false null undefined this
    //
    // NOTE: This list intentionally excludes arithmetic operators (+, -, *, %)
    // from the regex-context set to avoid false positives like x * /foo/.test().
    // Instead we use a conservative whitelist for regex context.
    const REGEX_PUNCT = new Set(['(', '[', '{', ',', ';', '!', '~', '&', '|', '^', '?', ':', '=']);
    const REGEX_KEYWORDS = new Set([
      'return', 'typeof', 'void', 'delete', 'in', 'instanceof',
      'case', 'throw', 'new', 'if', 'else', 'while', 'for', 'do',
      'yield', 'await', 'of',
    ]);
    const VALUE_KEYWORDS = new Set(['true', 'false', 'null', 'undefined', 'this']);
    for (let i = tokens.length - 1; i >= 0; i--) {
      const t = tokens[i];
      if (t.kind === 'COMMENT') continue;
      // Division context: value-producing tokens
      if (t.kind === 'IDENT') return false;
      if (t.kind === 'NUMBER') return false;
      if (t.kind === 'STRING') return false;
      if (t.kind === 'REGEX') return false;
      if (t.kind === 'AT_IDENT') return false;
      if (t.kind === 'KEYWORD' && VALUE_KEYWORDS.has(t.text)) return false;
      if (t.kind === 'PUNCT' && (t.text === ')' || t.text === ']')) return false;
      // Regex context: explicit operator/punctuation whitelist
      if (t.kind === 'PUNCT' && REGEX_PUNCT.has(t.text)) return true;
      if (t.kind === 'OPERATOR') return true;  // => == != += etc.
      if (t.kind === 'KEYWORD' && REGEX_KEYWORDS.has(t.text)) return true;
      // Anything else (e.g. TILDE, BLOCK_REF, other PUNCT like < > + - * % ^ ~ /)
      // → treat as division context to avoid false positives on closing tags
      return false;
    }
    return true; // start of stream → regex
  }

  /**
   * Consume a regex literal. Called when isRegexContext() returns true and ch() === '/'.
   * Handles character classes [...] (which may contain unescaped /) and backslash
   * escapes. Emits a single REGEX token with the full text including flags.
   */
  function readRegex() {
    const start = absOff();
    const l = line, c = col;
    let raw = '/';
    advance(); // consume opening /

    let inClass = false;
    while (pos < content.length) {
      const c0 = content[pos];
      if (c0 === '\\' && pos + 1 < content.length) {
        // Escaped character — consume two chars verbatim
        raw += c0 + content[pos + 1];
        advance(2);
        continue;
      }
      if (c0 === '[') { inClass = true;  raw += c0; advance(); continue; }
      if (c0 === ']') { inClass = false; raw += c0; advance(); continue; }
      if (c0 === '/' && !inClass) {
        raw += c0; advance(); break; // closing slash
      }
      if (c0 === '\n') break; // unescaped newline — malformed, stop
      raw += c0;
      advance();
    }

    // Consume flags: g i m s u y d (ECMAScript regex flags)
    while (pos < content.length && /[gimsuyd]/.test(content[pos])) {
      raw += content[pos];
      advance();
    }

    tokens.push(makeToken('REGEX', raw, start, absOff(), l, c));
  }


  // Multi-char operators (longest first)
  const MULTI_OPS = [
    "...", "===", "!==", "**=", "&&=", "||=", "??=", "=>", ":>",
    "==", "!=", "<=", ">=", "**", "&&", "||", "??",
    "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=",
    "<<", ">>", ">>>", "::", ".."
  ];

  while (pos < content.length) {
    // Check for a child block at this position
    if (childByStart.has(pos)) {
      const child = childByStart.get(pos)!;
      const childLen = child.span.end - child.span.start;
      const start = absOff();
      const l = line, c = col;
      // Advance over the child's source region
      advance(childLen);
      const tok: Token = makeToken("BLOCK_REF", child.raw, start, absOff(), l, c);
      tok.block = child;
      tokens.push(tok);
      continue;
    }

    const c0 = ch();
    const l = line, co = col;
    const start = absOff();

    // Whitespace
    if (/[ \t\r\n\f]/.test(c0)) {
      advance();
      continue;
    }

    // Line comment
    if (c0 === "/" && ch(1) === "/") {
      advance(2);
      readLineComment();
      continue;
    }

    // Block comment
    if (c0 === "/" && ch(1) === "*") {
      advance(2);
      readBlockComment();
      continue;
    }

    // Regex literal — check after line/block comments but before single-char PUNCT.
    // isRegexContext() inspects the token stream to distinguish /pattern/flags
    // from division operators (x / y) and compound operators (/=).
    if (c0 === '/' && ch(1) !== '/' && ch(1) !== '*' && ch(1) !== '=' && isRegexContext()) {
      readRegex();
      continue;
    }

    // Strings
    if (c0 === '"' || c0 === "'") { readString(c0); continue; }
    if (c0 === "`") { readBacktickString(); continue; }

    // Numbers
    if (/[0-9]/.test(c0) || (c0 === "." && /[0-9]/.test(ch(1)))) {
      readNumber();
      continue;
    }

    // @ sigil — reactive variable or decorator
    if (c0 === "@") {
      advance();
      if (isIdentStart(ch())) {
        const name = readIdent();
        tokens.push(makeToken("AT_IDENT", "@" + name, start, absOff(), l, co));
      } else {
        tokens.push(makeToken("PUNCT", "@", start, absOff(), l, co));
      }
      continue;
    }

    // ~ pipeline accumulator
    if (c0 === "~") {
      advance();
      tokens.push(makeToken("TILDE", "~", start, absOff(), l, co));
      continue;
    }

    // Identifiers / keywords
    if (isIdentStart(c0)) {
      const name = readIdent();
      const kind = KEYWORDS.has(name) ? "KEYWORD" : "IDENT";
      tokens.push(makeToken(kind, name, start, absOff(), l, co));
      continue;
    }

    // Multi-char operators (check longest first)
    let matched = false;
    for (const op of MULTI_OPS) {
      if (content.startsWith(op, pos)) {
        advance(op.length);
        tokens.push(makeToken("OPERATOR", op, start, absOff(), l, co));
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Single-char punctuation / operators
    if (/[(){}\[\],;.:\-+*/%^&|!=<>?]/.test(c0)) {
      advance();
      tokens.push(makeToken("PUNCT", c0, start, absOff(), l, co));
      continue;
    }

    // Anything else: skip (not a recognized token)
    advance();
  }

  tokens.push(makeToken("EOF", "", absOff(), absOff(), line, col));
  return tokens;
}

// ---------------------------------------------------------------------------
// SQL block tokenizer
// ---------------------------------------------------------------------------

/**
 * Tokenize the body of a SQL block (`?{...}`).
 *
 * The content is typically a template literal: `` ?{`SELECT ...`} ``.
 * We extract the query string. Chained method calls (`.all()`, `.first()`, etc.)
 * appear in the PARENT logic block's token stream after the BLOCK_REF for this
 * SQL block — they are handled by the logic block parser.
 *
 * `content` — body text between `?{` and `}`
 */
export function tokenizeSQL(content: string, baseOffset: number, baseLine: number, baseCol: number): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = baseLine;
  let col = baseCol;

  function absOff() { return baseOffset + pos; }
  function ch(n = 0) { return pos + n < content.length ? content[pos + n] : ""; }

  function advance(n = 1) {
    for (let i = 0; i < n; i++) {
      if (pos < content.length) {
        if (content[pos] === "\n") { line++; col = 1; }
        else { col++; }
        pos++;
      }
    }
  }

  function skipWs() {
    while (pos < content.length && /[ \t\r\n\f]/.test(content[pos])) advance();
  }

  skipWs();

  // Backtick-delimited SQL string
  if (ch() === "`") {
    const start = absOff();
    const l = line, c = col;
    advance(); // consume `
    let query = "";
    while (pos < content.length && ch() !== "`") {
      query += content[pos];
      advance();
    }
    if (ch() === "`") advance(); // consume closing `
    tokens.push(makeToken("SQL_RAW", query, start, absOff(), l, c));
  } else {
    // Non-backtick fallback: treat rest as raw
    const start = absOff();
    const l = line, c = col;
    let query = content.slice(pos).trim();
    advance(content.length - pos);
    tokens.push(makeToken("SQL_RAW", query, start, absOff(), l, c));
  }

  tokens.push(makeToken("EOF", "", absOff(), absOff(), line, col));
  return tokens;
}

// ---------------------------------------------------------------------------
// CSS block tokenizer
// ---------------------------------------------------------------------------

/**
 * Lookahead helper: we're positioned at `:` after reading an ident that could
 * be either an element selector (`button:hover { ... }`) or a property name
 * (`color: red;`). Scan forward from `:` for the earliest `{`, `;`, or `}`:
 *   `{` first → pseudo compound selector; continue reading as CSS_SELECTOR.
 *   `;` or `}` first → property declaration.
 * Returns true if this colon introduces a selector.
 */
function colonIntroducesSelector(content: string, colonPos: number): boolean {
  for (let p = colonPos + 1; p < content.length; p++) {
    const c = content[p];
    if (c === "{") return true;
    if (c === ";" || c === "}") return false;
  }
  return false;
}

/**
 * Lookahead helper (GITI-007): disambiguate `nav a { ... }` (descendant
 * combinator selector) from `foo bar;` (malformed property value). Scan
 * forward for `{`, `;`, `}`; `{` first means we're in a selector rule.
 * Returns true if a `{` appears before the next statement terminator.
 */
function hasBraceBeforeSemiOrRbrace(content: string, startPos: number): boolean {
  for (let p = startPos; p < content.length; p++) {
    const c = content[p];
    if (c === "{") return true;
    if (c === ";" || c === "}") return false;
  }
  return false;
}

/**
 * Tokenize the body of a CSS inline block (`#{...}`).
 *
 * The body contains CSS property declarations and/or selector rules.
 * We produce CSS_PROP, CSS_COLON, CSS_VALUE, CSS_SEMI, CSS_LBRACE, and CSS_RBRACE tokens.
 *
 * Selector detection handles three forms:
 *   - Class/id/pseudo/combinator selectors starting with . # * [ > + ~ — always CSS_SELECTOR
 *   - Bare element selectors (e.g. body, div, h1) — identifier followed by { — CSS_SELECTOR
 *   - Compound element selectors (e.g. a.foo, button:hover, h1, h2) — ident followed by
 *     a selector-continuation char (`.`, `#`, `[`, `,`, `>`, `+`, `~`, `*`) or by `:`
 *     when the `:` resolves to a pseudo (first `{` before `;`/`}`) — CSS_SELECTOR
 *   - Property declarations — identifier followed by : resolving to a value — CSS_PROP
 */
export function tokenizeCSS(content: string, baseOffset: number, baseLine: number, baseCol: number): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = baseLine;
  let col = baseCol;

  function absOff() { return baseOffset + pos; }
  function ch(n = 0) { return pos + n < content.length ? content[pos + n] : ""; }

  function advance(n = 1) {
    for (let i = 0; i < n; i++) {
      if (pos < content.length) {
        if (content[pos] === "\n") { line++; col = 1; }
        else { col++; }
        pos++;
      }
    }
  }

  function skipWs() {
    while (pos < content.length && /[ \t\r\n\f]/.test(content[pos])) advance();
  }

  while (pos < content.length) {
    skipWs();
    if (pos >= content.length) break;

    // Comment
    if (ch() === "/" && ch(1) === "*") {
      advance(2);
      while (pos < content.length && !(ch() === "*" && ch(1) === "/")) advance();
      if (pos < content.length) advance(2);
      continue;
    }

    // Identifier: could be a CSS property name OR the start of an element-leading selector.
    // Disambiguation after reading the ident + skipWs():
    //   `{` → bare element selector (`body {`, `div {`)
    //   `.`, `#`, `[`, `,`, `>`, `+`, `~`, `*` → compound selector (`a.foo`, `h1, h2`, `ul > li`)
    //   `:` → ambiguous. Lookahead: if `{` appears before `;` or `}`, it's a pseudo selector
    //         (`button:hover { ... }`); otherwise a property declaration (`color: red;`).
    //   otherwise → property declaration (best-effort; degenerate input falls here).
    if (/[A-Za-z_\-]/.test(ch()) || (ch() === "-" && ch(1) === "-")) {
      const start = absOff();
      const l = line, c = col;
      let ident = "";
      while (pos < content.length && /[A-Za-z0-9_\-]/.test(content[pos])) {
        ident += content[pos];
        advance();
      }

      const beforeWs = pos;
      skipWs();
      const hadWs = pos > beforeWs;

      const nextCh = ch();
      const isCompoundSelectorChar =
        nextCh === "." || nextCh === "#" || nextCh === "[" || nextCh === "," ||
        nextCh === ">" || nextCh === "+" || nextCh === "~" || nextCh === "*";
      const isPseudoThenBrace = nextCh === ":" && colonIntroducesSelector(content, pos);
      // GITI-007: descendant combinator. `nav a { ... }` — after ident + ws,
      // another ident-start means the first ident was a selector, not a prop.
      // Only trigger when ws separated them (unspaced `nava` would be one ident
      // to the earlier loop anyway). Disambiguates from valueless-prop-followed-
      // by-next-rule (already malformed) by requiring a `{` before `;`/`}`
      // downstream.
      const isDescendantCombinator =
        hadWs && /[A-Za-z_\-]/.test(nextCh) && hasBraceBeforeSemiOrRbrace(content, pos);

      if (nextCh === "{") {
        // Bare element selector: `body {`, `div {`, `h1 {`, etc.
        // Emit CSS_SELECTOR; the `{` will be consumed as CSS_LBRACE in the next iteration.
        tokens.push(makeToken("CSS_SELECTOR", ident, start, absOff(), l, c));
      } else if (isCompoundSelectorChar || isPseudoThenBrace || isDescendantCombinator) {
        // Compound selector beginning with an element name. Consume through `{` or `}`
        // as one CSS_SELECTOR token. Examples: `a.foo`, `button:hover`, `h1, h2`, `ul > li`.
        // Preserve a single space after the ident if source had whitespace (descendant
        // combinator, selector-list separator, etc.); the continuation chars carry no
        // separator themselves (e.g. `a.foo` is unspaced).
        let sel = ident + (hadWs ? " " : "");
        while (pos < content.length && ch() !== "{" && ch() !== "}") {
          sel += content[pos];
          advance();
        }
        tokens.push(makeToken("CSS_SELECTOR", sel.trim(), start, absOff(), l, c));
      } else {
        // Property declaration: `color: red`, `font-size: 14px`, `--custom-prop: val`, etc.
        tokens.push(makeToken("CSS_PROP", ident, start, absOff(), l, c));

        if (ch() === ":") {
          const cs = absOff();
          const cl = line, cc = col;
          advance();
          tokens.push(makeToken("CSS_COLON", ":", cs, absOff(), cl, cc));

          skipWs();

          // Value: everything up to `;` or `}`
          const vs = absOff();
          const vl = line, vc = col;
          let value = "";
          while (pos < content.length && ch() !== ";" && ch() !== "}") {
            value += content[pos];
            advance();
          }
          tokens.push(makeToken("CSS_VALUE", value.trim(), vs, absOff(), vl, vc));

          if (ch() === ";") {
            const ss = absOff();
            const sl = line, sc = col;
            advance();
            tokens.push(makeToken("CSS_SEMI", ";", ss, absOff(), sl, sc));
          }
        }
      }
      continue;
    }

    // Selector characters: class (.foo), id (#bar), universal (*), attribute ([attr]),
    // child (>), adjacent (+), sibling (~), pseudo (:root, :hover, ::before).
    // These always start a CSS_SELECTOR token.
    if (/[\.#\*\[>+~:]/.test(ch())) {
      const start = absOff();
      const l = line, c = col;
      let sel = "";
      while (pos < content.length && ch() !== "{" && ch() !== "}") {
        sel += content[pos];
        advance();
      }
      tokens.push(makeToken("CSS_SELECTOR", sel.trim(), start, absOff(), l, c));
      continue;
    }

    // Brace tokens: open and close braces in selector rules
    if (ch() === "{") {
      const s = absOff();
      const bl = line, bc = col;
      advance();
      tokens.push(makeToken("CSS_LBRACE", "{", s, absOff(), bl, bc));
      continue;
    }

    if (ch() === "}") {
      const s = absOff();
      const bl = line, bc = col;
      advance();
      tokens.push(makeToken("CSS_RBRACE", "}", s, absOff(), bl, bc));
      continue;
    }

    advance(); // skip unrecognized chars
  }

  tokens.push(makeToken("EOF", "", absOff(), absOff(), line, col));
  return tokens;
}

// ---------------------------------------------------------------------------
// Error effect block tokenizer
// ---------------------------------------------------------------------------

/**
 * Tokenize the body of an error-effect block (`!{...}`).
 *
 * The body contains match arms: `| ::TypeA e -> handler`
 * We reuse the logic tokenizer.
 */
export function tokenizeError(content: string, baseOffset: number, baseLine: number, baseCol: number): Token[] {
  return tokenizeLogic(content, baseOffset, baseLine, baseCol, []);
}

// ---------------------------------------------------------------------------
// Text and comment passthrough
// ---------------------------------------------------------------------------

/**
 * Produce a minimal single-token stream for text and comment blocks.
 */
export function tokenizePassthrough(blockType: 'text' | 'comment', raw: string, baseOffset: number, baseLine: number, baseCol: number): Token[] {
  const kind = blockType === "comment" ? "COMMENT" : "TEXT";
  return [
    makeToken(kind, raw, baseOffset, baseOffset + raw.length, baseLine, baseCol),
    makeToken("EOF", "", baseOffset + raw.length, baseOffset + raw.length, baseLine, baseCol),
  ];
}

// ---------------------------------------------------------------------------
// Dispatcher: choose the right tokenizer for each block kind
// ---------------------------------------------------------------------------

/**
 * Tokenize a single Block from the Block Splitter output.
 *
 * The `block.raw` string includes the delimiters (e.g., `${` and `}`).
 * We strip those delimiters to get the body content.
 *
 * `block` — a Block from BS output
 * `filePath` — source file path (for error context; reserved for future use)
 */
export function tokenizeBlock(block: Block, filePath: string): Token[] {
  const { type, raw, span } = block;
  const baseOffset = span.start;
  const baseLine = span.line ?? 1;
  const baseCol = span.col ?? 1;

  switch (type) {
    case "markup":
    case "state":
      return tokenizeAttributes(raw, baseOffset, baseLine, baseCol, type as 'markup' | 'state');

    case "logic": {
      // Strip `${` prefix and `}` suffix to get body
      const body = raw.slice(2, raw.length - 1);
      return tokenizeLogic(body, baseOffset + 2, baseLine, baseCol + 2, block.children ?? []);
    }

    case "meta": {
      // Strip `^{` prefix and `}` suffix
      const body = raw.slice(2, raw.length - 1);
      return tokenizeLogic(body, baseOffset + 2, baseLine, baseCol + 2, block.children ?? []);
    }

    case "sql": {
      // Strip `?{` prefix and `}` suffix
      const body = raw.slice(2, raw.length - 1);
      return tokenizeSQL(body, baseOffset + 2, baseLine, baseCol + 2);
    }

    case "css": {
      // Strip `#{` prefix and `}` suffix
      const body = raw.slice(2, raw.length - 1);
      return tokenizeCSS(body, baseOffset + 2, baseLine, baseCol + 2);
    }

    case "error-effect": {
      // Strip `!{` prefix and `}` suffix
      const body = raw.slice(2, raw.length - 1);
      return tokenizeError(body, baseOffset + 2, baseLine, baseCol + 2);
    }

    case "test": {
      // Strip `~{` prefix and `}` suffix — reuse the logic-context tokenizer.
      // Test content is logic-like: identifiers, strings, operators, braces.
      // The test body parser (parseTestBody in ast-builder.js) processes the
      // token stream to extract test "name" { } blocks and assert statements.
      const body = raw.slice(2, raw.length - 1);
      return tokenizeLogic(body, baseOffset + 2, baseLine, baseCol + 2, block.children ?? []);
    }
    case "text":
    case "comment":
      return tokenizePassthrough(type as 'text' | 'comment', raw, baseOffset, baseLine, baseCol);

    default:
      // Unknown block type — return empty stream with EOF
      return [makeToken("EOF", "", baseOffset, baseOffset, baseLine, baseCol)];
  }
}
