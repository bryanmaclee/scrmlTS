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

interface RuleBinding {
  localName: string;
  fieldName: string;
}

interface TransitionRule {
  from: string;
  to: string;
  guard: string | null;
  label: string | null;
  effectBody: string | null;
  // §51.3.2 (S22) — payload bindings resolved against the governed enum.
  // null when the rule had no binding-group on that side.
  fromBindings?: RuleBinding[] | null;
  toBindings?: RuleBinding[] | null;
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
// ---------------------------------------------------------------------------
// §51.9 (S22) — Derived / Projection Machine Codegen
// ---------------------------------------------------------------------------

interface DerivedMachineLike {
  name: string;
  governedTypeName: string;
  sourceVar?: string | null;
  projectedVarName?: string | null;
  rules: TransitionRule[];
}

/**
 * §51.9 — Emit the projection function for a derived machine.
 *
 * Shape:
 *   function _scrml_project_UI(src) {
 *     var tag = (src != null && typeof src === "object") ? src.variant : src;
 *     if (tag === "Draft") return "Editable";
 *     if (tag === "Submitted") return "ReadOnly";
 *     ...
 *     // Exhaustiveness was checked at compile time; this fallthrough
 *     // should be unreachable for well-typed source values.
 *     return undefined;
 *   }
 *
 * Projection rules with a `given` guard are evaluated top-to-bottom; the
 * first matching rule wins. Unguarded rules terminate their group per
 * §51.9.3. Destination is emitted as a plain string when unit; if the
 * projection enum declares the RHS variant with a payload, we still emit
 * a string (projection RHSs are single-variant-no-binding per §51.9.2 —
 * the spec reserves payload projections for future work, §51.9.7).
 */
export function emitProjectionFunction(machine: DerivedMachineLike): string[] {
  const fnName = `_scrml_project_${machine.name}`;
  const lines: string[] = [];
  lines.push(`function ${fnName}(src) {`);
  lines.push(`  var tag = (src != null && typeof src === "object") ? src.variant : src;`);
  for (const rule of machine.rules) {
    const toLiteral = `"${rule.to}"`;
    if (rule.guard) {
      lines.push(`  if (tag === "${rule.from}" && (${rule.guard})) return ${toLiteral};`);
    } else {
      lines.push(`  if (tag === "${rule.from}") return ${toLiteral};`);
    }
  }
  lines.push(`  return undefined;`);
  lines.push(`}`);
  return lines;
}

/**
 * §51.9 — Emit the runtime registration of the projected reactive.
 *
 * Registers the projected var in `_scrml_derived_fns` so `_scrml_reactive_get`
 * will delegate to `_scrml_derived_get` (see `runtime-template.js:71`). Also
 * subscribes the derived var to its source's dirty propagation edge so
 * writes to the source trigger DOM re-reads on the projection.
 *
 * Shape:
 *   _scrml_derived_fns["ui"] = function() {
 *     return _scrml_project_UI(_scrml_reactive_get("order"));
 *   };
 *   _scrml_derived_dirty["ui"] = true;
 *   (_scrml_derived_downstreams["order"] = _scrml_derived_downstreams["order"] || new Set()).add("ui");
 */
export function emitDerivedDeclaration(machine: DerivedMachineLike): string[] {
  const lines: string[] = [];
  const projected = machine.projectedVarName ?? machine.name.toLowerCase();
  const source = machine.sourceVar ?? "";
  const fnName = `_scrml_project_${machine.name}`;
  lines.push(`// §51.9 derived machine: @${projected} projects @${source} through ${machine.name}`);
  lines.push(`_scrml_derived_fns[${JSON.stringify(projected)}] = function() { return ${fnName}(_scrml_reactive_get(${JSON.stringify(source)})); };`);
  lines.push(`_scrml_derived_dirty[${JSON.stringify(projected)}] = true;`);
  lines.push(`(_scrml_derived_downstreams[${JSON.stringify(source)}] = _scrml_derived_downstreams[${JSON.stringify(source)}] || new Set()).add(${JSON.stringify(projected)});`);
  return lines;
}

/**
 * §51.3.2 (S22) — Build the destructuring statements for a rule's from-/to-
 * bindings. Emits `var <local> = __prev.data.<field>;` for from-bindings and
 * `var <local> = __next.data.<field>;` for to-bindings. Uses `var` rather
 * than `let` so the declarations function-hoist within the IIFE and stay
 * visible to the guard and effect bodies that follow.
 *
 * Exported for the gauntlet-s22 tests that assert on the emitted shape.
 */
export function buildBindingPreludeStmts(rule: TransitionRule): string[] {
  const out: string[] = [];
  for (const b of rule.fromBindings ?? []) {
    out.push(`var ${b.localName} = __prev != null && __prev.data != null ? __prev.data.${b.fieldName} : undefined;`);
  }
  for (const b of rule.toBindings ?? []) {
    out.push(`var ${b.localName} = __next != null && __next.data != null ? __next.data.${b.fieldName} : undefined;`);
  }
  return out;
}

export function emitTransitionGuard(
  encodedVarName: string,
  newValueExpr: string,
  tableName: string,
  machineName: string,
  guardRules: TransitionRule[],
  auditTarget: string | null = null,
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

  // §51.3.2 (S22) — payload-binding prelude. Before guard and effect bodies,
  // destructure `.data.<field>` for each from-/to-binding into a locally scoped
  // block. Each rule with bindings gets its own keyed guard so the vars are
  // only exposed when the (from → to) transition matches.
  const rulesWithBindings = guardRules.filter(r =>
    (r.fromBindings && r.fromBindings.length > 0) ||
    (r.toBindings && r.toBindings.length > 0)
  );

  // Guard evaluation (+ binding prelude when applicable)
  if (guardRules.length > 0) {
    lines.push(`  // Guard evaluation`);
    for (const rule of guardRules) {
      if (!rule.guard) continue;
      const guardKey = `${rule.from}:${rule.to}`;
      const label = rule.label ? ` [${rule.label}]` : "";
      const prelude = buildBindingPreludeStmts(rule);
      if (prelude.length > 0) {
        // Open a keyed block, declare bindings, then evaluate the guard.
        lines.push(`  if (__key === "${guardKey}") {`);
        for (const p of prelude) lines.push(`    ${p}`);
        lines.push(`    if (!(${rule.guard})) {`);
        lines.push(`      throw new Error("E-MACHINE-001-RT: Transition guard failed${label}. Variable: ${encodedVarName}, governed by: ${machineName}. Move: .${rule.from} => .${rule.to}. Guard: ${rule.guard.replace(/"/g, '\\"')}");`);
        lines.push(`    }`);
        lines.push(`  }`);
      } else {
        lines.push(`  if (__key === "${guardKey}" && !(${rule.guard})) {`);
        lines.push(`    throw new Error("E-MACHINE-001-RT: Transition guard failed${label}. Variable: ${encodedVarName}, governed by: ${machineName}. Move: .${rule.from} => .${rule.to}. Guard: ${rule.guard.replace(/"/g, '\\"')}");`);
        lines.push(`  }`);
      }
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
      const prelude = buildBindingPreludeStmts(rule);
      lines.push(`  if (__key === "${effectKey}") {`);
      lines.push(`    var event = { from: __prev, to: __next };`);
      for (const p of prelude) lines.push(`    ${p}`);
      lines.push(`    ${rule.effectBody}`);
      lines.push(`  }`);
    }
  }

  // Rules with bindings but no guard or effect (e.g. reserved for future inline
  // assertions) still need the bindings compile-time-visible, so we emit a
  // keyed block that only contains the destructuring. This is intentional
  // dead code at runtime but keeps the declarative surface consistent — the
  // spec says "bindings expose ... locals inside guard and effect-block",
  // which implies they are scoped to those constructs. When neither exists,
  // there is nothing for the bindings to be visible inside, so we skip the
  // emission entirely.
  // (No emission needed — left as a comment for future reviewers.)
  void rulesWithBindings;

  // §51.11 (S24) — audit clause emission. After state commit and effect
  // blocks, append an audit entry to the target reactive. Shape:
  //   { from: __prev, to: __next, at: Date.now() }
  // The concat-then-set pattern produces a fresh array each transition so
  // the reactive fires its subscribers (mutating push would not).
  if (auditTarget) {
    lines.push(`  // §51.11 audit log push`);
    lines.push(`  _scrml_reactive_set("${auditTarget}", (_scrml_reactive_get("${auditTarget}") || []).concat([{ from: __prev, to: __next, at: Date.now() }]));`);
  }

  lines.push(`})();`);

  return lines;
}
