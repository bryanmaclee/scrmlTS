// One-shot edit script for fix-cg-sql-ref-placeholder.
// Performs three textual replacements:
//   1. ast-builder.js: parseOneStatement return-stmt (~line 2519) — add SQL BLOCK_REF detection
//   2. ast-builder.js: buildBlock body-loop return-stmt (~line 4654) — same
//   3. emit-logic.ts: case "return-stmt" — route to case "sql" when sqlNode is present
//
// Each replacement is anchor-based (find unique original text → replace with new text).
// Fails loudly if any anchor isn't found exactly once.

import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(file, find, replace, label) {
  const src = readFileSync(file, "utf8");
  const idx = src.indexOf(find);
  if (idx < 0) {
    console.error(`FAIL [${label}]: anchor not found in ${file}`);
    process.exit(1);
  }
  const second = src.indexOf(find, idx + find.length);
  if (second >= 0) {
    console.error(`FAIL [${label}]: anchor matched MORE than once in ${file} (idx ${idx}, ${second})`);
    process.exit(1);
  }
  const next = src.slice(0, idx) + replace + src.slice(idx + find.length);
  writeFileSync(file, next);
  console.log(`OK   [${label}]: ${file} (delta ${replace.length - find.length} chars)`);
}

// -------- Edit 1: parseOneStatement return-stmt
const ASTB = "compiler/src/ast-builder.js";

const find1 = `      if (next && next.kind === "KEYWORD" && RETURN_DECL_KW.has(next.text)) {
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
    }`;

const replace1 = `      if (next && next.kind === "KEYWORD" && RETURN_DECL_KW.has(next.text)) {
        return {
          id: ++counter.next,
          kind: "return-stmt",
          expr: "",
          span: spanOf(startTok, startTok),
        };
      }
      // fix-cg-sql-ref-placeholder (S40 follow-up): \`return ?{...}.method()\` —
      // when the immediate next non-comment token is a SQL BLOCK_REF, build the
      // child SQL node, consume any trailing .all()/.get()/.run() chain, and
      // attach it as \`sqlNode\` on the return-stmt. emit-logic case "return-stmt"
      // routes through case "sql" when sqlNode is present. Mirrors the
      // lift-expr SQL fix from \`fix-lift-sql-chained-call\` (S40).
      // Without this, \`safeParseExprToNode\` parses \`?{...}.all()\` → preprocesses
      // \`?{}\` to \`__scrml_sql_placeholder__\` → emits \`return /* sql-ref:-1 */.all();\`.
      if (next && next.kind === "BLOCK_REF" && next.block && next.block.type === "sql") {
        // Skip leading comments (already accounted for by lookAhead) — consume them.
        for (let i = 0; i < lookAhead; i++) consume();
        const refTok = consume(); // consume the BLOCK_REF
        const childNode = buildBlock(refTok.block, filePath, parentBlock.type, counter, errors);
        if (childNode && childNode.kind === "sql") {
          consumeSqlChainedCalls(childNode);
          // Optional trailing semicolon
          if (peek().kind === "PUNCT" && peek().text === ";") consume();
          return {
            id: ++counter.next,
            kind: "return-stmt",
            expr: refTok.text,
            sqlNode: childNode,
            span: spanOf(startTok, peek()),
          };
        }
        // Defensive: child wasn't SQL — fall through to legacy path.
      }
      const { expr, span } = collectExpr();
      return {
        id: ++counter.next,
        kind: "return-stmt",
        expr: expr.trim(),
        exprNode: safeParseExprToNode(expr.trim(), 0),
        span: spanOf(startTok, peek()),
      };
    }`;

replaceOnce(ASTB, find1, replace1, "ast-builder.parseOneStatement return-stmt");

// -------- Edit 2: buildBlock body-loop return-stmt
const find2 = `    if (tok.kind === "KEYWORD" && tok.text === "return") {
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
    }`;

const replace2 = `    if (tok.kind === "KEYWORD" && tok.text === "return") {
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
      // fix-cg-sql-ref-placeholder (S40 follow-up): mirror parseOneStatement —
      // \`return ?{...}.method()\` collapses to \`return /* sql-ref:-1 */.method()\`
      // when the BLOCK_REF is left to fall through collectExpr → safeParseExprToNode.
      // Detect the SQL BLOCK_REF here, build the child, and attach as \`sqlNode\`.
      if (next && next.kind === "BLOCK_REF" && next.block && next.block.type === "sql") {
        for (let i = 0; i < lookAhead; i++) consume();
        const refTok = consume();
        const childNode = buildBlock(refTok.block, filePath, parentBlock.type, counter, errors);
        if (childNode && childNode.kind === "sql") {
          consumeSqlChainedCalls(childNode);
          if (peek().kind === "PUNCT" && peek().text === ";") consume();
          nodes.push({
            id: ++counter.next,
            kind: "return-stmt",
            expr: refTok.text,
            sqlNode: childNode,
            span: spanOf(startTok, peek()),
          });
          continue;
        }
        // Defensive: child wasn't SQL — fall through.
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
    }`;

replaceOnce(ASTB, find2, replace2, "ast-builder.buildBlock-body return-stmt");

// -------- Edit 3: emit-logic.ts case "return-stmt"
const EMITLOG = "compiler/src/codegen/emit-logic.ts";

const find3 = `    case "return-stmt": {
      // Phase 3 fast path: when exprNode is present, skip all string splitting
      if (node.exprNode) {
        return \`return \${emitExpr(node.exprNode, _makeExprCtx(opts))};\`;
      }
      // Phase 4 fallback: exprNode is missing (rare — only for unparseable expressions)
      const retExpr: string = (node.expr ?? node.value ?? "").trim();
      return retExpr ? \`return \${emitExprField(node.exprNode, retExpr, _makeExprCtx(opts))};\` : "return;";
    }`;

const replace3 = `    case "return-stmt": {
      // fix-cg-sql-ref-placeholder (S40 follow-up): \`return ?{...}.method()\` —
      // when the AST builder attached a structured \`sqlNode\` (because \`return\` was
      // followed directly by a SQL BLOCK_REF), recurse into \`case "sql"\` and
      // wrap the resulting expression as a return statement. Mirrors the
      // \`lift ?{...}.method()\` SQL handling in \`case "lift-expr"\` above.
      if (node.sqlNode && node.sqlNode.kind === "sql") {
        const sqlStmt = emitLogicNode(node.sqlNode, opts);
        // \`case "sql"\` always returns an expression form ending in \`;\`.
        // Strip the trailing \`;\` so we can wrap as \`return …;\`.
        const sqlExpr = sqlStmt.replace(/;\\s*$/, "");
        return \`return \${sqlExpr};\`;
      }
      // Phase 3 fast path: when exprNode is present, skip all string splitting
      if (node.exprNode) {
        return \`return \${emitExpr(node.exprNode, _makeExprCtx(opts))};\`;
      }
      // Phase 4 fallback: exprNode is missing (rare — only for unparseable expressions)
      const retExpr: string = (node.expr ?? node.value ?? "").trim();
      return retExpr ? \`return \${emitExprField(node.exprNode, retExpr, _makeExprCtx(opts))};\` : "return;";
    }`;

replaceOnce(EMITLOG, find3, replace3, "emit-logic.case return-stmt");

console.log("ALL EDITS APPLIED");
