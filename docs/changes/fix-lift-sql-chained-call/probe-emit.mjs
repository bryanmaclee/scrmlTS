// Probe: what does emit-logic emit for the fixed lift-expr AST?
import { emitLogicNode } from '../../../compiler/src/codegen/emit-logic.ts';

// AST shape produced by the patched ast-builder for `lift ?{`SELECT …`}.all()`.
const liftAll = {
  id: 22,
  kind: "lift-expr",
  expr: {
    kind: "sql",
    node: {
      id: 21,
      kind: "sql",
      query: "SELECT id, name, email, phone FROM contacts ORDER BY name",
      chainedCalls: [{ method: "all", args: "" }],
    },
  },
};

const liftGet = {
  id: 24,
  kind: "lift-expr",
  expr: {
    kind: "sql",
    node: {
      id: 23,
      kind: "sql",
      query: "SELECT id, name FROM contacts WHERE id = ${userId}",
      chainedCalls: [{ method: "get", args: "" }],
    },
  },
};

const liftRun = {
  id: 26,
  kind: "lift-expr",
  expr: {
    kind: "sql",
    node: {
      id: 25,
      kind: "sql",
      query: "DELETE FROM contacts WHERE id = ${id}",
      chainedCalls: [{ method: "run", args: "" }],
    },
  },
};

console.log("=== boundary: server, lift ?{...}.all() ===");
console.log(emitLogicNode(liftAll, { boundary: "server" }));

console.log("\n=== boundary: server, lift ?{...}.get() (with ${param}) ===");
console.log(emitLogicNode(liftGet, { boundary: "server" }));

console.log("\n=== boundary: server, lift ?{...}.run() (with ${param}) ===");
console.log(emitLogicNode(liftRun, { boundary: "server" }));

console.log("\n=== boundary: client, lift ?{...}.all() (unusual; falls through to plain SQL stmt) ===");
console.log(emitLogicNode(liftAll, { boundary: "client" }));
