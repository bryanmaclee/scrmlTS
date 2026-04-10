/**
 * @module codegen/emit-worker
 *
 * Generates self-contained worker JS bundles from extracted nested
 * <program name="..."> ASTs (§4.12.4).
 *
 * Each worker gets its own script with `self.onmessage` wiring.
 * Function declarations inside the worker are compiled and included.
 * `send(x)` calls in the body are rewritten to `self.postMessage(x)`.
 */

import { emitLogicNode } from "./emit-logic.ts";

/**
 * Generate a self-contained worker JS string from the extracted worker AST.
 *
 * @param name - Worker name (from the `name=` attribute)
 * @param children - Child AST nodes of the worker program
 * @param whenMessage - The WhenMessageNode (kind: "when-message"), or null
 * @returns Complete worker JS source string
 */
export function generateWorkerJs(
  name: string,
  children: any[],
  whenMessage: any | null,
): string {
  const lines: string[] = [];
  lines.push(`// Generated worker: ${name}`);

  // Emit function declarations from the worker's children
  for (const child of children) {
    if (!child || typeof child !== "object") continue;

    if (child.kind === "logic") {
      for (const stmt of (child.body ?? [])) {
        if (stmt?.kind === "function-decl") {
          const fnCode = emitLogicNode(stmt);
          if (fnCode) {
            lines.push(fnCode);
          }
        }
      }
    }
  }

  // Emit the onmessage handler from the when-message node
  if (whenMessage) {
    const binding: string = whenMessage.binding ?? "data";
    let body: string = whenMessage.bodyRaw ?? "";

    // Rewrite send(...) → self.postMessage(...)
    body = rewriteSendToPostMessage(body);

    lines.push(`self.onmessage = function(event) {`);
    lines.push(`  var ${binding} = event.data;`);

    // Indent body lines
    for (const bodyLine of body.split("\n")) {
      lines.push(`  ${bodyLine}`);
    }

    lines.push(`};`);
  }

  return lines.join("\n");
}

/**
 * Rewrite `send(...)` calls to `self.postMessage(...)` in worker body text.
 * Uses word-boundary matching to avoid rewriting e.g. `resend(...)`.
 */
export function rewriteSendToPostMessage(body: string): string {
  return body.replace(/\bsend\s*\(/g, "self.postMessage(");
}
