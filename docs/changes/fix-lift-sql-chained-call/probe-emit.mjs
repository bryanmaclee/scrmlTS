// Probe: what does emit-logic emit for the buggy lift-expr AST?
import { emitLogicNode } from '../../../compiler/src/codegen/emit-logic.ts';

const liftExpr = {
  id: 22,
  kind: "lift-expr",
  expr: {
    kind: "markup",
    node: {
      id: 21,
      kind: "sql",
      query: "SELECT id, name, email, phone FROM contacts ORDER BY name",
      chainedCalls: [],
    },
  },
};

console.log("=== boundary: server ===");
console.log(emitLogicNode(liftExpr, { boundary: "server" }));

console.log("\n=== boundary: client ===");
console.log(emitLogicNode(liftExpr, { boundary: "client" }));
