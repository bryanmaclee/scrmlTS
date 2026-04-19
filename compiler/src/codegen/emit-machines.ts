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

import { rewriteExpr } from "./rewrite.ts";

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
    // §51.11.4 (S27) — labels are baked into the table so the audit push can
    // resolve them via the same wildcard-fallback chain that picks __rule.
    // Entry shapes:
    //   plain            "A:B": true
    //   guarded          "A:B": { guard: true }
    //   labeled          "A:B": { label: "foo" }
    //   guarded+labeled  "A:B": { guard: true, label: "foo" }
    const labelFrag = rule.label ? `, label: ${JSON.stringify(rule.label)}` : "";
    if (rule.guard) {
      entries.push(`  "${key}": { guard: true${labelFrag} }`);
    } else if (rule.label) {
      entries.push(`  "${key}": { label: ${JSON.stringify(rule.label)} }`);
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
      // §51.5 (S26) — rewrite @reactive refs to _scrml_reactive_get(...)
      // before emitting the guard as a JS expression. rule.guard captures
      // raw scrml text from the machine body; without this rewrite, guards
      // referencing reactive vars emit invalid JS (raw `@name` token).
      const guardJs = rewriteExpr(rule.guard);
      lines.push(`  if (tag === "${rule.from}" && (${guardJs})) return ${toLiteral};`);
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
  rules: TransitionRule[],
  auditTarget: string | null = null,
): string[] {
  const lines: string[] = [];

  lines.push(`// §51 transition guard: ${encodedVarName} (${machineName})`);
  lines.push(`(function() {`);
  lines.push(`  var __prev = _scrml_reactive_get("${encodedVarName}");`);
  lines.push(`  var __next = ${newValueExpr};`);
  // Variant extraction: payload variants emit as `{variant, data}` objects;
  // unit variants emit as bare strings (see emitEnumVariantObjects in
  // emit-client.ts). Both shapes reach this guard at runtime, and both must
  // compose a correct table key. Fallback order:
  //   1. object with `.variant` field → use that field
  //   2. non-null primitive (bare-string unit variant) → use the value itself
  //   3. null/undefined → "*" (matches the wildcard fallback contract below)
  // This mirrors the error-message fallback at line ~243 (`String(__prev)`)
  // that pre-dated the parity fix.
  lines.push(`  var __prevVariant = (__prev != null ? (__prev.variant != null ? __prev.variant : __prev) : "*");`);
  lines.push(`  var __nextVariant = (__next != null ? (__next.variant != null ? __next.variant : __next) : "*");`);
  lines.push(`  var __key = __prevVariant + ":" + __nextVariant;`);
  // §51.11.4 (S27) — track both the matched rule value AND the canonical
  // table key. The key is recorded in audit entries as the `rule` field so
  // replay consumers can identify which declared rule fired after wildcard
  // fallback. Precedence mirrors the `__rule` fallback chain: exact →
  // "*:To" → "From:*" → "*:*".
  lines.push(`  var __matchedKey = (${tableName}[__key] != null) ? __key`);
  lines.push(`    : (${tableName}["*:" + __nextVariant] != null) ? ("*:" + __nextVariant)`);
  lines.push(`    : (${tableName}[__prevVariant + ":*"] != null) ? (__prevVariant + ":*")`);
  lines.push(`    : (${tableName}["*:*"] != null) ? "*:*"`);
  lines.push(`    : null;`);
  lines.push(`  var __rule = __matchedKey != null ? ${tableName}[__matchedKey] : null;`);
  lines.push(`  if (!__rule) {`);
  lines.push(`    throw new Error("E-MACHINE-001-RT: Illegal transition. Variable: ${encodedVarName}, governed by: ${machineName}. Move: " + (__prev != null && __prev.variant != null ? "." + __prev.variant : String(__prev)) + " => " + (__next != null && __next.variant != null ? "." + __next.variant : String(__next)) + ". No rule permits this transition.");`);
  lines.push(`  }`);

  // §51.3.2 (S22) — payload-binding prelude. Before guard and effect bodies,
  // destructure `.data.<field>` for each from-/to-binding into a locally scoped
  // block. Each rule with bindings gets its own keyed guard so the vars are
  // only exposed when the (from → to) transition matches.
  const rulesWithBindings = rules.filter(r =>
    (r.fromBindings && r.fromBindings.length > 0) ||
    (r.toBindings && r.toBindings.length > 0)
  );

  // Guard evaluation (+ binding prelude when applicable)
  const guardRules = rules.filter(r => r.guard != null && r.guard !== "");
  if (guardRules.length > 0) {
    lines.push(`  // Guard evaluation`);
    for (const rule of guardRules) {
      if (!rule.guard) continue;
      const guardKey = `${rule.from}:${rule.to}`;
      const label = rule.label ? ` [${rule.label}]` : "";
      const prelude = buildBindingPreludeStmts(rule);
      // §51.5 (S26) — rewrite @reactive refs to _scrml_reactive_get(...) for
      // the JS evaluation. Diagnostic "Guard:" text keeps the raw scrml form
      // so the user sees the source they wrote.
      const guardJs = rewriteExpr(rule.guard);
      const guardDiag = rule.guard.replace(/"/g, '\\"');
      // S27: match against __matchedKey (the canonical rule key the
      // wildcard-fallback chain resolved to) rather than __key (the
      // literal runtime variants). Pre-S27 the comparison used __key,
      // so a rule like `* => .X given (…)` never fired its guard at
      // runtime — __key was e.g. "Pending:X", guardKey "*:X", and the
      // equality check always failed. With __matchedKey, wildcard
      // rules compare against the key the runtime actually selected.
      if (prelude.length > 0) {
        // Open a keyed block, declare bindings, then evaluate the guard.
        lines.push(`  if (__matchedKey === "${guardKey}") {`);
        for (const p of prelude) lines.push(`    ${p}`);
        lines.push(`    if (!(${guardJs})) {`);
        lines.push(`      throw new Error("E-MACHINE-001-RT: Transition guard failed${label}. Variable: ${encodedVarName}, governed by: ${machineName}. Move: .${rule.from} => .${rule.to}. Guard: ${guardDiag}");`);
        lines.push(`    }`);
        lines.push(`  }`);
      } else {
        lines.push(`  if (__matchedKey === "${guardKey}" && !(${guardJs})) {`);
        lines.push(`    throw new Error("E-MACHINE-001-RT: Transition guard failed${label}. Variable: ${encodedVarName}, governed by: ${machineName}. Move: .${rule.from} => .${rule.to}. Guard: ${guardDiag}");`);
        lines.push(`  }`);
      }
    }
  }

  lines.push(`  _scrml_reactive_set("${encodedVarName}", __next);`);

  // Effect blocks. Includes effect-only rules that have no `given` guard
  // (pre-S25 this filtered `guardRules`, which silently dropped any rule
  // whose effect was not paired with a guard).
  const effectRules = rules.filter(r => r.effectBody);
  if (effectRules.length > 0) {
    lines.push(`  // Effect blocks`);
    for (const rule of effectRules) {
      if (!rule.effectBody) continue;
      const effectKey = `${rule.from}:${rule.to}`;
      const prelude = buildBindingPreludeStmts(rule);
      // S27: same parity fix as guards — match on __matchedKey so
      // wildcard effect rules fire when the runtime resolves to them.
      lines.push(`  if (__matchedKey === "${effectKey}") {`);
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

  // §51.11 (S24 / S27) — audit clause emission. After state commit and
  // effect blocks, append an audit entry to the target reactive. Shape
  // per §51.11.4:
  //   { from: __prev, to: __next, at: Date.now(),
  //     rule: __matchedKey, label: <from table entry or null> }
  // The concat-then-set pattern produces a fresh array each transition so
  // the reactive fires its subscribers (mutating push would not). `rule`
  // is the canonical table key (with wildcards preserved); `label` is
  // extracted from the matched table entry when it's an object carrying a
  // `label` field (labeled guards per §51.3.2), else null.
  if (auditTarget) {
    lines.push(`  // §51.11 audit log push`);
    lines.push(`  var __auditLabel = (__rule != null && typeof __rule === "object" && __rule.label != null) ? __rule.label : null;`);
    // §51.11.4 specifies audit entries are frozen objects so consumers
    // (replay, time-travel, server-side log aggregators) can safely hold
    // long-lived references without worrying about mutation.
    lines.push(`  _scrml_reactive_set("${auditTarget}", (_scrml_reactive_get("${auditTarget}") || []).concat([Object.freeze({ from: __prev, to: __next, at: Date.now(), rule: __matchedKey, label: __auditLabel })]));`);
  }

  // §51.12 (S25) — temporal transitions. After state commit, clear any
  // previously-armed timer for this machine-bound var and, if the new
  // variant has outgoing temporal rules, arm a fresh one. Re-entering the
  // same variant clears and re-arms (reset-on-reentry default per the
  // deep-dive).
  const temporalRules = rules.filter(r => r.afterMs != null);
  if (temporalRules.length > 0) {
    lines.push(`  // §51.12 temporal transitions`);
    lines.push(`  _scrml_machine_clear_timer("${encodedVarName}");`);
    // __nextVariant is already declared at the top of the IIFE for matched-key
    // resolution (§51.11.4). The top declaration defaults to "*" for
    // variant-less values, which is equivalent for timer-arming purposes
    // because temporal rules always name a specific `from` variant.
    //
    // S27 (§51.11): pass a meta payload carrying auditTarget + rulesJson so
    // the timer's expiry path can push an audit entry and re-arm any
    // downstream temporal rule.
    const rulesPayload = JSON.stringify(
      temporalRules.map(r => ({
        from: r.from,
        afterMs: r.afterMs,
        to: r.to,
        label: r.label ?? null,
      }))
    );
    const auditTargetLit = auditTarget ? JSON.stringify(auditTarget) : "null";
    for (const rule of temporalRules) {
      // Wildcard `from` was rejected at parse time; only specific variants
      // reach here. Each temporal rule fires from exactly its declared
      // `from` variant.
      const labelLit = rule.label ? JSON.stringify(rule.label) : "null";
      lines.push(`  if (__nextVariant === "${rule.from}") {`);
      lines.push(`    _scrml_machine_arm_timer("${encodedVarName}", ${rule.afterMs}, "${rule.to}", { fromVariant: "${rule.from}", label: ${labelLit}, auditTarget: ${auditTargetLit}, rulesJson: ${JSON.stringify(rulesPayload)} });`);
      lines.push(`  }`);
    }
  }

  lines.push(`})();`);

  return lines;
}
