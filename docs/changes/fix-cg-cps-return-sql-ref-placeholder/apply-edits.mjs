// Apply the AST builder + emit-server + emit-logic edits for
// fix-cg-cps-return-sql-ref-placeholder.
//
// Strategy: text-substitution with strict single-occurrence checks. Each
// edit asserts that its `before` snippet appears exactly once in the file
// before applying. If the assertion fails, the script aborts and reports
// the mismatch — so we can correct the script rather than silently writing
// wrong code.
//
// Run with: bun run docs/changes/fix-cg-cps-return-sql-ref-placeholder/apply-edits.mjs

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dir, "../../../");

function patch(file, before, after, label) {
  const path = resolve(ROOT, file);
  const src = readFileSync(path, "utf8");
  const occ = src.split(before).length - 1;
  if (occ !== 1) {
    throw new Error(`[${label}] BEFORE snippet found ${occ} times in ${file} — expected exactly 1`);
  }
  const out = src.replace(before, after);
  writeFileSync(path, out);
  console.log(`OK  ${label}  ${file}`);
}

// ---------------------------------------------------------------------------
// 1) ast-builder.js — add tryConsumeSqlInit helper after consumeSqlChainedCalls
// ---------------------------------------------------------------------------

patch(
  "compiler/src/ast-builder.js",
  `        break;
      }
    }
  }

  /**
   * Parse a single statement and return an AST node.`,
  `        break;
      }
    }
  }

  /**
   * fix-cg-cps-return-sql-ref-placeholder (S40 follow-up): when a reactive-decl
   * initializer (RHS of \`@x = …\`, \`server @x = …\`, \`@shared x = …\`,
   * \`@x: T = …\`) is a SQL \`?{}\` BLOCK_REF — possibly with a chained
   * \`.all()/.get()/.run()\` — build the structured SQL child node, consume
   * the chain, and return it. Caller attaches the returned node as
   * \`sqlNode\` on the reactive-decl AST node and sets \`init: ""\` /
   * omits \`initExpr\` so downstream consumers (batch-planner string scanner,
   * emit-server CPS path, emit-logic case "reactive-decl") opt into the
   * structured form instead of the broken \`/* sql-ref:N */\` placeholder
   * that \`safeParseExprToNode\` would otherwise produce.
   *
   * Mirrors the parent fix at \`return ?{…}.method()\` (commit 2a05585).
   *
   * Returns the SQL child node on success; null otherwise. On null, no
   * tokens are consumed and callers MUST fall through to the legacy
   * \`collectExpr()\` path. The optional trailing \`;\` is consumed here
   * when a SQL node is built.
   */
  function tryConsumeSqlInit() {
    const next = peek();
    if (!(next && next.kind === "BLOCK_REF" && next.block && next.block.type === "sql")) {
      return null;
    }
    const refTok = consume(); // consume the BLOCK_REF
    const childNode = buildBlock(refTok.block, filePath, parentBlock.type, counter, errors);
    if (!childNode || childNode.kind !== "sql") {
      // Defensive: BS contract guarantees BLOCK_REF.block.type === "sql"
      // means buildBlock returns a SQL node. If that ever breaks, we have
      // already consumed the BLOCK_REF token; surfacing as null here would
      // create a token-stream hole for the caller. Best-effort: return null
      // and let collectExpr emit whatever it can with the remaining tokens.
      return null;
    }
    consumeSqlChainedCalls(childNode);
    if (peek().kind === "PUNCT" && peek().text === ";") consume();
    return childNode;
  }

  /**
   * Parse a single statement and return an AST node.`,
  "1.helper",
);

// ---------------------------------------------------------------------------
// 2) ast-builder.js — parseOneStatement: server @name = expr  (L2117 area)
// ---------------------------------------------------------------------------

patch(
  "compiler/src/ast-builder.js",
  `      const typeAnnotation = collectTypeAnnotation();
      if (peek().text === "=" && peek(1)?.text !== "=") {
        consume(); // consume \`=\`
        const { expr } = collectExpr();
        const node = { id: ++counter.next, kind: "reactive-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), isServer: true, span: spanOf(startTok, peek()) };
        if (typeAnnotation) node.typeAnnotation = typeAnnotation;
        return node;
      }
      // Malformed — emit as bare-expr
      const { expr } = collectExpr();
      const _be2 = startTok.text + " " + atTok.text + (expr ? " " + expr : "");
      return { id: ++counter.next, kind: "bare-expr", expr: _be2, exprNode: safeParseExprToNode(_be2, 0), span: spanOf(startTok, peek()) };
    }`,
  `      const typeAnnotation = collectTypeAnnotation();
      if (peek().text === "=" && peek(1)?.text !== "=") {
        consume(); // consume \`=\`
        // fix-cg-cps-return-sql-ref-placeholder: detect \`server @x = ?{...}.method()\`.
        const _sqlInit = tryConsumeSqlInit();
        if (_sqlInit) {
          const node = { id: ++counter.next, kind: "reactive-decl", name, init: "", sqlNode: _sqlInit, isServer: true, span: spanOf(startTok, peek()) };
          if (typeAnnotation) node.typeAnnotation = typeAnnotation;
          return node;
        }
        const { expr } = collectExpr();
        const node = { id: ++counter.next, kind: "reactive-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), isServer: true, span: spanOf(startTok, peek()) };
        if (typeAnnotation) node.typeAnnotation = typeAnnotation;
        return node;
      }
      // Malformed — emit as bare-expr
      const { expr } = collectExpr();
      const _be2 = startTok.text + " " + atTok.text + (expr ? " " + expr : "");
      return { id: ++counter.next, kind: "bare-expr", expr: _be2, exprNode: safeParseExprToNode(_be2, 0), span: spanOf(startTok, peek()) };
    }`,
  "2.parseOneStatement.server-modifier",
);

// ---------------------------------------------------------------------------
// 3) ast-builder.js — parseOneStatement: @shared name = expr  (L2134 area)
// ---------------------------------------------------------------------------

patch(
  "compiler/src/ast-builder.js",
  `    // @shared MODIFIER: \`@shared varName = expr\` → reactive-decl with isShared: true (§37.4)
    if (tok.kind === "AT_IDENT" && tok.text === "@shared") {
      const startTok = consume(); // consume \`@shared\`
      // Expect: IDENT or KEYWORD (varName), then =, then expr
      if ((peek().kind === "IDENT" || peek().kind === "KEYWORD") && peek(1)?.text === "=" && peek(2)?.text !== "=") {
        const nameTok = consume(); // consume varName
        consume(); // consume \`=\`
        const { expr } = collectExpr();
        return { id: ++counter.next, kind: "reactive-decl", name: nameTok.text, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), isShared: true, span: spanOf(startTok, peek()) };
      }
      // Malformed @shared — emit as bare-expr
      const { expr } = collectExpr();
      const _be3 = startTok.text + (expr ? " " + expr : "");
      return { id: ++counter.next, kind: "bare-expr", expr: _be3, exprNode: safeParseExprToNode(_be3, 0), span: spanOf(startTok, peek()) };
    }`,
  `    // @shared MODIFIER: \`@shared varName = expr\` → reactive-decl with isShared: true (§37.4)
    if (tok.kind === "AT_IDENT" && tok.text === "@shared") {
      const startTok = consume(); // consume \`@shared\`
      // Expect: IDENT or KEYWORD (varName), then =, then expr
      if ((peek().kind === "IDENT" || peek().kind === "KEYWORD") && peek(1)?.text === "=" && peek(2)?.text !== "=") {
        const nameTok = consume(); // consume varName
        consume(); // consume \`=\`
        // fix-cg-cps-return-sql-ref-placeholder: detect \`@shared x = ?{...}.method()\`.
        const _sqlInit = tryConsumeSqlInit();
        if (_sqlInit) {
          return { id: ++counter.next, kind: "reactive-decl", name: nameTok.text, init: "", sqlNode: _sqlInit, isShared: true, span: spanOf(startTok, peek()) };
        }
        const { expr } = collectExpr();
        return { id: ++counter.next, kind: "reactive-decl", name: nameTok.text, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), isShared: true, span: spanOf(startTok, peek()) };
      }
      // Malformed @shared — emit as bare-expr
      const { expr } = collectExpr();
      const _be3 = startTok.text + (expr ? " " + expr : "");
      return { id: ++counter.next, kind: "bare-expr", expr: _be3, exprNode: safeParseExprToNode(_be3, 0), span: spanOf(startTok, peek()) };
    }`,
  "3.parseOneStatement.shared-modifier",
);

// ---------------------------------------------------------------------------
// 4) ast-builder.js — parseOneStatement: typed @name: T = expr  (L2222 area)
// ---------------------------------------------------------------------------

patch(
  "compiler/src/ast-builder.js",
  `      // Type annotation: @name: Type(predicate) = expr  (§53)
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
      }`,
  `      // Type annotation: @name: Type(predicate) = expr  (§53)
      if (peek().text === ":") {
        const typeAnnotation = collectTypeAnnotation();
        if (peek().text === "=" && peek(1)?.text !== "=") {
          consume(); // consume '='
          // fix-cg-cps-return-sql-ref-placeholder: detect \`@x: T = ?{...}.method()\`.
          const _sqlInit = tryConsumeSqlInit();
          if (_sqlInit) {
            return { id: ++counter.next, kind: "reactive-decl", name, init: "", sqlNode: _sqlInit, typeAnnotation, span: spanOf(startTok, peek()) };
          }
          const { expr } = collectExpr();
          return { id: ++counter.next, kind: "reactive-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), typeAnnotation, span: spanOf(startTok, peek()) };
        }
        // Malformed — fall through to bare-expr
      }

      // Simple reactive decl: @name = expr
      if (peek().text === "=" && peek(1)?.text !== "=") {
        consume();
        // fix-cg-cps-return-sql-ref-placeholder: detect \`@x = ?{...}.method()\`.
        // The bare \`?{}\` (no chained call) and \`?{...}.all()/.get()/.run()\` shapes
        // both flow through here. Without this, safeParseExprToNode preprocesses
        // the BLOCK_REF to \`__scrml_sql_placeholder__\` and emit-expr renders
        // \`/* sql-ref:-1 */\` — broken in both server CPS and client init contexts.
        const _sqlInit = tryConsumeSqlInit();
        if (_sqlInit) {
          return { id: ++counter.next, kind: "reactive-decl", name, init: "", sqlNode: _sqlInit, span: spanOf(startTok, peek()) };
        }
        const { expr, span } = collectExpr();
        return { id: ++counter.next, kind: "reactive-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), span: spanOf(startTok, peek()) };
      }`,
  "4.parseOneStatement.untyped-and-typed",
);

// ---------------------------------------------------------------------------
// 5) ast-builder.js — buildBlock body-loop: server @name = expr  (L3717 area)
// ---------------------------------------------------------------------------

patch(
  "compiler/src/ast-builder.js",
  `    if (tok.kind === "KEYWORD" && tok.text === "server" && peek(1)?.kind === "AT_IDENT") {
      const startTok = consume(); // consume \`server\`
      const atTok = consume(); // consume \`@varName\`
      const name = atTok.text.slice(1); // strip @
      // §53: optional type annotation — \`server @name: Type(pred) = expr\`
      const typeAnnotation = collectTypeAnnotation();
      if (peek().text === "=" && peek(1)?.text !== "=") {
        consume(); // consume \`=\`
        const { expr } = collectExpr();
        const node = { id: ++counter.next, kind: "reactive-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), isServer: true, span: spanOf(startTok, peek()) };
        if (typeAnnotation) node.typeAnnotation = typeAnnotation;
        nodes.push(node);
        continue;
      }`,
  `    if (tok.kind === "KEYWORD" && tok.text === "server" && peek(1)?.kind === "AT_IDENT") {
      const startTok = consume(); // consume \`server\`
      const atTok = consume(); // consume \`@varName\`
      const name = atTok.text.slice(1); // strip @
      // §53: optional type annotation — \`server @name: Type(pred) = expr\`
      const typeAnnotation = collectTypeAnnotation();
      if (peek().text === "=" && peek(1)?.text !== "=") {
        consume(); // consume \`=\`
        // fix-cg-cps-return-sql-ref-placeholder: detect \`server @x = ?{...}.method()\`.
        const _sqlInit = tryConsumeSqlInit();
        if (_sqlInit) {
          const node = { id: ++counter.next, kind: "reactive-decl", name, init: "", sqlNode: _sqlInit, isServer: true, span: spanOf(startTok, peek()) };
          if (typeAnnotation) node.typeAnnotation = typeAnnotation;
          nodes.push(node);
          continue;
        }
        const { expr } = collectExpr();
        const node = { id: ++counter.next, kind: "reactive-decl", name, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), isServer: true, span: spanOf(startTok, peek()) };
        if (typeAnnotation) node.typeAnnotation = typeAnnotation;
        nodes.push(node);
        continue;
      }`,
  "5.buildBlock.server-modifier",
);

// ---------------------------------------------------------------------------
// 6) ast-builder.js — buildBlock body-loop: @shared name = expr (L3742 area)
// ---------------------------------------------------------------------------

patch(
  "compiler/src/ast-builder.js",
  `    // @shared MODIFIER: \`@shared varName = expr\` → reactive-decl with isShared: true (§37.4)
    if (tok.kind === "AT_IDENT" && tok.text === "@shared") {
      const startTok = consume(); // consume \`@shared\`
      // Expect: IDENT or KEYWORD (varName), then =, then expr
      if ((peek().kind === "IDENT" || peek().kind === "KEYWORD") && peek(1)?.text === "=" && peek(2)?.text !== "=") {
        const nameTok = consume(); // consume varName
        consume(); // consume \`=\`
        const { expr } = collectExpr();
        nodes.push({ id: ++counter.next, kind: "reactive-decl", name: nameTok.text, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), isShared: true, span: spanOf(startTok, peek()) });
        continue;
      }`,
  `    // @shared MODIFIER: \`@shared varName = expr\` → reactive-decl with isShared: true (§37.4)
    if (tok.kind === "AT_IDENT" && tok.text === "@shared") {
      const startTok = consume(); // consume \`@shared\`
      // Expect: IDENT or KEYWORD (varName), then =, then expr
      if ((peek().kind === "IDENT" || peek().kind === "KEYWORD") && peek(1)?.text === "=" && peek(2)?.text !== "=") {
        const nameTok = consume(); // consume varName
        consume(); // consume \`=\`
        // fix-cg-cps-return-sql-ref-placeholder: detect \`@shared x = ?{...}.method()\`.
        const _sqlInit = tryConsumeSqlInit();
        if (_sqlInit) {
          nodes.push({ id: ++counter.next, kind: "reactive-decl", name: nameTok.text, init: "", sqlNode: _sqlInit, isShared: true, span: spanOf(startTok, peek()) });
          continue;
        }
        const { expr } = collectExpr();
        nodes.push({ id: ++counter.next, kind: "reactive-decl", name: nameTok.text, init: expr, initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0), isShared: true, span: spanOf(startTok, peek()) });
        continue;
      }`,
  "6.buildBlock.shared-modifier",
);

// ---------------------------------------------------------------------------
// 7) ast-builder.js — buildBlock body-loop: typed @name: T = expr  (L3837 area)
// ---------------------------------------------------------------------------

patch(
  "compiler/src/ast-builder.js",
  `      // Type annotation: @name: Type(predicate) = expr  (§53)
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
            ...(typeAnnotation ? { typeAnnotation } : {}),
            span: spanOf(startTok, peek()),
          });
          continue;
        }
        // Malformed — fall through to bare-expr
      }

      // Simple reactive decl: @name = expr
      if (peek().text === "=" && peek(1)?.text !== "=") {
        consume(); // consume \`=\`
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
      }`,
  `      // Type annotation: @name: Type(predicate) = expr  (§53)
      if (peek().text === ":") {
        const typeAnnotation = collectTypeAnnotation();
        if (peek().text === "=" && peek(1)?.text !== "=") {
          consume(); // consume '='
          // fix-cg-cps-return-sql-ref-placeholder: detect \`@x: T = ?{...}.method()\`.
          const _sqlInit = tryConsumeSqlInit();
          if (_sqlInit) {
            nodes.push({
              id: ++counter.next,
              kind: "reactive-decl",
              name,
              init: "",
              sqlNode: _sqlInit,
              ...(typeAnnotation ? { typeAnnotation } : {}),
              span: spanOf(startTok, peek()),
            });
            continue;
          }
          const { expr } = collectExpr();
          nodes.push({
            id: ++counter.next,
            kind: "reactive-decl",
            name,
            init: expr,
            initExpr: safeParseExprToNode(expr, spanOf(startTok, peek())?.start ?? 0),
            ...(typeAnnotation ? { typeAnnotation } : {}),
            span: spanOf(startTok, peek()),
          });
          continue;
        }
        // Malformed — fall through to bare-expr
      }

      // Simple reactive decl: @name = expr
      if (peek().text === "=" && peek(1)?.text !== "=") {
        consume(); // consume \`=\`
        // fix-cg-cps-return-sql-ref-placeholder: detect \`@x = ?{...}.method()\`.
        // Bare \`?{...}\` and \`?{...}.all()/.get()/.run()\` both flow through here.
        // Without this, safeParseExprToNode produces the broken sql-ref placeholder
        // ExprNode that emit-expr renders as \`/* sql-ref:-1 */\` — the leak this
        // fix targets in combined-007-crud (server.js:38,74 and client.js:55).
        const _sqlInit = tryConsumeSqlInit();
        if (_sqlInit) {
          nodes.push({
            id: ++counter.next,
            kind: "reactive-decl",
            name,
            init: "",
            sqlNode: _sqlInit,
            span: spanOf(startTok, peek()),
          });
          continue;
        }
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
      }`,
  "7.buildBlock.untyped-and-typed",
);

console.log("\nAll 7 ast-builder.js patches applied successfully.");
