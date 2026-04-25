// One-shot patch script for fix-lift-sql-chained-call.
// Applies surgical edits to ast-builder.js and emit-logic.ts.
//
// Run from worktree root:
//   bun docs/changes/fix-lift-sql-chained-call/apply-fix.mjs

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dir, '../../..');

function patchFile(file, edits) {
  let src = fs.readFileSync(file, 'utf8');
  for (const { find, replace, label } of edits) {
    if (!src.includes(find)) {
      console.error(`PATCH FAILED: '${label}' — find string not present in ${file}`);
      console.error("---FIND---");
      console.error(find);
      console.error("---END FIND---");
      process.exit(1);
    }
    const before = src;
    src = src.replace(find, replace);
    if (src === before) {
      console.error(`PATCH NO-OP: '${label}' — replace produced identical content`);
      process.exit(1);
    }
    console.log(`Applied: ${label}`);
  }
  fs.writeFileSync(file, src);
}

// ---- EDIT ast-builder.js ----

const astBuilderPath = path.join(repoRoot, 'compiler/src/ast-builder.js');

// Helper: a function that consumes trailing chained method calls from the
// parent token stream and appends them to a SQL childNode. Mirrors the pattern
// used at lines ~1918-1940 and ~3421-3442.
const helperInsertAnchor = `      argsExpr: args ? safeParseExprToNode(args, spanOf(startTok, peek())?.start ?? 0) : undefined,
      span: spanOf(startTok, peek()),
    };
  }

  /**
   * Parse a single statement and return an AST node.
   * Handles: let, const, @reactive, lift, for, if, while, return, bare-expr.
   */
  function parseOneStatement() {`;

const helperInsertReplacement = `      argsExpr: args ? safeParseExprToNode(args, spanOf(startTok, peek())?.start ?? 0) : undefined,
      span: spanOf(startTok, peek()),
    };
  }

  /**
   * §SQL: collect chained method calls (.run(), .all(), .get(), …) from the
   * parent token stream and append them to a SQL node's chainedCalls array.
   * Mirrors the consumption pattern used by the bare-BLOCK_REF handler
   * (parseOneStatement BLOCK_REF case and the buildBlock body-loop). Extracted
   * so the lift+BLOCK_REF case can apply the same chain-consumption when its
   * BLOCK_REF child is a SQL node (fix-lift-sql-chained-call, S40).
   */
  function consumeSqlChainedCalls(sqlNode) {
    if (!sqlNode || sqlNode.kind !== "sql" || !sqlNode.chainedCalls) return;
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
        // §8.9.5: \`.nobatch()\` is a compile-time marker with no
        // runtime effect. Flag the node and drop the call.
        if (methodTok.text === "nobatch") {
          sqlNode.nobatch = true;
        } else {
          sqlNode.chainedCalls.push({ method: methodTok.text, args });
        }
      } else {
        // Defensive: a dot followed by a non-IDENT is malformed; bail to avoid
        // spinning. The trailing tokens fall through to the parent's normal
        // statement processing.
        break;
      }
    }
  }

  /**
   * Parse a single statement and return an AST node.
   * Handles: let, const, @reactive, lift, for, if, while, return, bare-expr.
   */
  function parseOneStatement() {`;

// Edit 1: lift+BLOCK_REF in parseOneStatement (line ~2243)
const liftSite1Find = `    // LIFT
    if (tok.kind === "KEYWORD" && tok.text === "lift") {
      const startTok = consume();
      if (peek().kind === "BLOCK_REF") {
        const refTok = consume();
        const child = refTok.block;
        if (child) {
          const childNode = buildBlock(child, filePath, "logic", counter, errors);
          return { id: ++counter.next, kind: "lift-expr", expr: { kind: "markup", node: childNode }, span: spanOf(startTok, refTok) };
        }
      }`;

const liftSite1Replace = `    // LIFT
    if (tok.kind === "KEYWORD" && tok.text === "lift") {
      const startTok = consume();
      if (peek().kind === "BLOCK_REF") {
        const refTok = consume();
        const child = refTok.block;
        if (child) {
          // Build the child block in its own native context (sql / markup / logic / etc.).
          // Previously hardcoded to "logic" — that worked for the original markup case but
          // suppresses correct context for ?{} SQL blocks. Use parentBlock.type to mirror
          // the pattern in parseOneStatement BLOCK_REF case (line ~1914) and the buildBlock
          // body-loop BLOCK_REF case (line ~3417). The buildBlock dispatch keys off
          // block.type, so the parentContextKind argument is mainly informational here.
          const childNode = buildBlock(child, filePath, parentBlock.type, counter, errors);
          // fix-lift-sql-chained-call (S40): when the BLOCK_REF child is a SQL
          // node, consume any trailing .method() chain and wrap as a SQL
          // lift-expr variant. The previous code wrapped a SQL node as
          // {kind:"markup"} which (a) lied about the payload, (b) caused
          // emit-lift to render an empty <div>, and (c) left the trailing
          // .all()/.get()/.run() chain orphan in the parent token stream.
          if (childNode && childNode.kind === "sql") {
            consumeSqlChainedCalls(childNode);
            return {
              id: ++counter.next,
              kind: "lift-expr",
              expr: { kind: "sql", node: childNode },
              span: spanOf(startTok, peek()),
            };
          }
          return { id: ++counter.next, kind: "lift-expr", expr: { kind: "markup", node: childNode }, span: spanOf(startTok, refTok) };
        }
      }`;

// Edit 2: lift+BLOCK_REF in buildBlock body-loop (line ~4066)
const liftSite2Find = `    // LIFT STATEMENT: \`lift expr ;\`
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
      } else if`;

const liftSite2Replace = `    // LIFT STATEMENT: \`lift expr ;\`
    if (tok.kind === "KEYWORD" && tok.text === "lift") {
      const startTok = consume();

      // If the next token is a BLOCK_REF, the lift target is an embedded block
      if (peek().kind === "BLOCK_REF") {
        const refTok = consume();
        const child = refTok.block;
        if (child) {
          // See parseOneStatement lift+BLOCK_REF site (~line 2245) for the
          // matching SQL-aware handling rationale.
          const childNode = buildBlock(child, filePath, parentBlock.type, counter, errors);
          if (childNode && childNode.kind === "sql") {
            consumeSqlChainedCalls(childNode);
            nodes.push({
              id: ++counter.next,
              kind: "lift-expr",
              expr: { kind: "sql", node: childNode },
              span: spanOf(startTok, peek()),
            });
          } else {
            nodes.push({
              id: ++counter.next,
              kind: "lift-expr",
              expr: { kind: "markup", node: childNode },
              span: spanOf(startTok, refTok),
            });
          }
        }
      } else if`;

patchFile(astBuilderPath, [
  { find: helperInsertAnchor, replace: helperInsertReplacement, label: "ast-builder: insert consumeSqlChainedCalls helper" },
  { find: liftSite1Find,      replace: liftSite1Replace,        label: "ast-builder: parseOneStatement lift+BLOCK_REF — SQL-aware" },
  { find: liftSite2Find,      replace: liftSite2Replace,        label: "ast-builder: buildBlock body-loop lift+BLOCK_REF — SQL-aware" },
]);

console.log("\nast-builder.js patches applied.");
