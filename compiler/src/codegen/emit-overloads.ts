import { genVar } from "./var-counter.ts";
import { emitLogicNode } from "./emit-logic.js";
import type { CompileContext } from "./context.ts";

/** A single AST node from the overload body. */
interface OverloadBodyNode {
  body?: OverloadBodyNode[];
  [key: string]: unknown;
}

/**
 * Emit state-type overload dispatch functions.
 *
 * If the fileAST has an overloadRegistry from TS, generate a dispatch function
 * for each overload set that checks the argument's __scrml_state_type tag.
 */
export function emitOverloads(ctx: CompileContext): string[] {
  const overloadRegistry = ctx.fileAST.overloadRegistry as Map<string, Map<string, OverloadBodyNode>> | undefined;
  const lines: string[] = [];

  if (!overloadRegistry || overloadRegistry.size === 0) {
    return lines;
  }

  lines.push("// State-type overload dispatch functions");
  lines.push("");

  for (const [fnName, overloads] of overloadRegistry) {
    const dispatchName = genVar(`dispatch_${fnName}`);
    lines.push(`function ${dispatchName}(_scrml_arg) {`);
    lines.push(`  const _scrml_type = _scrml_arg?.__scrml_state_type;`);

    let first = true;
    for (const [stateType, fnNode] of overloads) {
      const prefix = first ? "if" : "} else if";
      first = false;
      genVar(`${fnName}_${stateType}`);
      lines.push(`  ${prefix} (_scrml_type === ${JSON.stringify(stateType)}) {`);

      // Emit the overload body inline
      const body = fnNode.body ?? [];
      for (const stmt of body) {
        const code = emitLogicNode(stmt);
        if (code) {
          for (const line of code.split("\n")) {
            lines.push(`    ${line}`);
          }
        }
      }
    }

    lines.push(`  } else {`);
    lines.push(`    throw new Error(\`No overload of '${fnName}' matches state type '\${_scrml_type ?? "unknown"}'\`);`);
    lines.push(`  }`);
    lines.push(`}`);
    lines.push("");
  }

  return lines;
}
