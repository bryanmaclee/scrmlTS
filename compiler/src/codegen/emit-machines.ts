/**
 * §51.5 Machine Codegen — Transition Tables + Runtime Guards
 *
 * Generates:
 *   1. Transition lookup tables for each enum with transitions{} and each < machine>
 *   2. Runtime guard wrappers for machine-bound reactive variable assignments
 *   3. Effect block execution after successful transitions
 *
 * The lookup table is a constant object: { "From:To": true }
 * Runtime guard pattern:
 *   const __prev = _scrml_reactive_get("varName");
 *   if (!__scrml_transitions_MachineName[__prev.variant + ":" + newValue.variant]) {
 *     throw new Error("E-MACHINE-001-RT: ...");
 *   }
 *   _scrml_reactive_set("varName", newValue);
 */

// ---------------------------------------------------------------------------
// §51.5.2 — Transition Lookup Table
// ---------------------------------------------------------------------------

interface TransitionRule {
  from: string;
  to: string;
  guard: string | null;
  label: string | null;
  effectBody: string | null;
}

/**
 * Emit a transition lookup table as a const declaration.
 *
 * @param tableName — JS variable name for the table (e.g. "__scrml_transitions_OrderStatus")
 * @param rules — transition rules from the enum or machine
 * @returns lines of JS code
 */
export function emitTransitionTable(tableName: string, rules: TransitionRule[]): string[] {
  const lines: string[] = [];
  const entries: string[] = [];

  for (const rule of rules) {
    const key = `${rule.from}:${rule.to}`;
    if (rule.guard) {
      // Guard rules need runtime evaluation — store the guard expression
      entries.push(`  "${key}": { guard: true }`);
    } else {
      entries.push(`  "${key}": true`);
    }
  }

  // Also add wildcard expansions: if "*.X" exists, it means "any => X"
  // We don't expand wildcards into the table — runtime checks handle them

  lines.push(`const ${tableName} = {`);
  lines.push(entries.join(",\n"));
  lines.push(`};`);

  return lines;
}

// ---------------------------------------------------------------------------
// §51.5.2 — Runtime Guard Wrapper
// ---------------------------------------------------------------------------

/**
 * Emit a runtime transition guard for a reactive assignment.
 *
 * Pattern:
 *   // §51 transition guard: @varName (MachineName)
 *   (function() {
 *     const __prev = _scrml_reactive_get("varName");
 *     const __next = <newValueExpr>;
 *     const __key = (__prev?.variant ?? "*") + ":" + (__next?.variant ?? "*");
 *     const __rule = __scrml_transitions_<Name>[__key]
 *       ?? __scrml_transitions_<Name>["*:" + (__next?.variant ?? "*")]
 *       ?? __scrml_transitions_<Name>[(__prev?.variant ?? "*") + ":*"]
 *       ?? __scrml_transitions_<Name>["*:*"];
 *     if (!__rule) {
 *       throw new Error("E-MACHINE-001-RT: ...");
 *     }
 *     _scrml_reactive_set("varName", __next);
 *   })();
 *
 * @param encodedVarName — the encoded reactive variable name
 * @param newValueExpr — the JS expression for the new value
 * @param tableName — the transition table variable name
 * @param machineName — machine or enum name for error messages
 * @param guardRules — rules that have guards (for runtime guard evaluation)
 * @returns lines of JS code
 */
export function emitTransitionGuard(
  encodedVarName: string,
  newValueExpr: string,
  tableName: string,
  machineName: string,
  guardRules: TransitionRule[],
): string[] {
  const lines: string[] = [];

  lines.push(`// §51 transition guard: ${encodedVarName} (${machineName})`);
  lines.push(`(function() {`);
  lines.push(`  var __prev = _scrml_reactive_get("${encodedVarName}");`);
  lines.push(`  var __next = ${newValueExpr};`);
  lines.push(`  var __key = (__prev != null && __prev.variant != null ? __prev.variant : "*") + ":" + (__next != null && __next.variant != null ? __next.variant : "*");`);
  lines.push(`  var __rule = ${tableName}[__key]`);
  lines.push(`    || ${tableName}["*:" + (__next != null && __next.variant != null ? __next.variant : "*")]`);
  lines.push(`    || ${tableName}[(__prev != null && __prev.variant != null ? __prev.variant : "*") + ":*"]`);
  lines.push(`    || ${tableName}["*:*"];`);
  lines.push(`  if (!__rule) {`);
  lines.push(`    throw new Error("E-MACHINE-001-RT: Illegal transition. Variable: ${encodedVarName}, governed by: ${machineName}. Move: " + (__prev != null && __prev.variant != null ? "." + __prev.variant : String(__prev)) + " => " + (__next != null && __next.variant != null ? "." + __next.variant : String(__next)) + ". No rule permits this transition.");`);
  lines.push(`  }`);

  // Guard evaluation
  if (guardRules.length > 0) {
    lines.push(`  // Guard evaluation`);
    for (const rule of guardRules) {
      if (!rule.guard) continue;
      const guardKey = `${rule.from}:${rule.to}`;
      const label = rule.label ? ` [${rule.label}]` : "";
      lines.push(`  if (__key === "${guardKey}" && !(${rule.guard})) {`);
      lines.push(`    throw new Error("E-MACHINE-001-RT: Transition guard failed${label}. Variable: ${encodedVarName}, governed by: ${machineName}. Move: .${rule.from} => .${rule.to}. Guard: ${rule.guard.replace(/"/g, '\\"')}");`);
      lines.push(`  }`);
    }
  }

  lines.push(`  _scrml_reactive_set("${encodedVarName}", __next);`);

  // Effect blocks
  const effectRules = guardRules.filter(r => r.effectBody);
  if (effectRules.length > 0) {
    lines.push(`  // Effect blocks`);
    for (const rule of effectRules) {
      if (!rule.effectBody) continue;
      const effectKey = `${rule.from}:${rule.to}`;
      lines.push(`  if (__key === "${effectKey}") {`);
      lines.push(`    var event = { from: __prev, to: __next };`);
      lines.push(`    ${rule.effectBody}`);
      lines.push(`  }`);
    }
  }

  lines.push(`})();`);

  return lines;
}
