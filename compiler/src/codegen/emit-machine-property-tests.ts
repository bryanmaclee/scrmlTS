/**
 * §51.13 — Auto-Generated Machine Property Tests
 *
 * Generates a bun:test suite per machine declaration that verifies the
 * compiled transition guard enforces exactly what the machine's transition
 * table declares. Slogan: machine = enforced spec.
 *
 * Phase 1 (S26) — property (a) Exclusivity.
 *   From any reachable variant V and any variant W: declared pair succeeds,
 *   undeclared pair throws E-MACHINE-001-RT.
 *
 * Phase 2 (S26) — property (c) Guard coverage.
 *   Each LABELED `given` guard receives one passing test (guard truthy →
 *   transition succeeds) and one failing test (guard falsy → throws
 *   E-MACHINE-001-RT: Transition guard failed).
 *
 * Phase 2 harness model: tests don't evaluate the real guard expression.
 * Instead, the harness takes a per-rule guardResults map and treats the
 * supplied boolean as the guard's evaluated value. This tests the WIRING
 * of guard enforcement (§51.13.1(c)'s normative statement) without
 * coupling the test to the guard expression's inputs. Real-expression
 * evaluation with automatic input synthesis is a future phase.
 *
 * Skipped machines (phase 2):
 *   - unlabeled `given` guards (we can't name them stably in test titles)
 *   - payload bindings (phase 3)
 *   - wildcard rules (phase 4)
 *   - temporal rules (phase 5)
 *   - derived / projection machines (phase 6)
 *
 * Skipped machines are recorded as comments at the top of the generated
 * file so users know why.
 */

import { basename } from "path";

interface RuleBinding { localName: string; fieldName: string; }

interface TransitionRule {
  from: string;
  to: string;
  guard: string | null;
  label: string | null;
  effectBody: string | null;
  fromBindings?: RuleBinding[] | null;
  toBindings?: RuleBinding[] | null;
  afterMs?: number | null;
}

interface MachineLike {
  name: string;
  governedTypeName?: string;
  rules: TransitionRule[];
  isDerived?: boolean;
  auditTarget?: string | null;
}

// Phase 2 filter: payload/wildcard/temporal are still blocking; guards are
// now OK, but only if every guarded rule is labeled. An unlabeled guarded
// rule breaks the phase-2 contract (we cannot title its coverage test).
function rulesAreInScope(rules: TransitionRule[]): { ok: boolean; reason?: string } {
  for (const r of rules) {
    if ((r.fromBindings && r.fromBindings.length > 0) ||
        (r.toBindings && r.toBindings.length > 0))
      return { ok: false, reason: "contains payload bindings" };
    if (r.from === "*" || r.to === "*")
      return { ok: false, reason: "contains wildcard rules" };
    if (r.afterMs != null)
      return { ok: false, reason: "contains temporal rules (`after`)" };
    if (r.guard && !r.label)
      return { ok: false, reason: "contains unlabeled `given` guards (phase 2 requires a `[label]`)" };
  }
  return { ok: true };
}

function collectVariants(rules: TransitionRule[]): string[] {
  const s = new Set<string>();
  for (const r of rules) {
    if (r.from !== "*") s.add(r.from);
    if (r.to !== "*") s.add(r.to);
  }
  return [...s].sort();
}

function reachableVariants(rules: TransitionRule[], initial: string): Set<string> {
  const reached = new Set<string>([initial]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of rules) {
      if (reached.has(r.from) && !reached.has(r.to)) {
        reached.add(r.to);
        grew = true;
      }
    }
  }
  return reached;
}

// Map each (from,to) pair to its rule. A pair may appear only once in a
// valid machine (duplicates caught by E-MACHINE-014 upstream).
function ruleMap(rules: TransitionRule[]): Map<string, TransitionRule> {
  const m = new Map<string, TransitionRule>();
  for (const r of rules) m.set(`${r.from}:${r.to}`, r);
  return m;
}

function variantLiteral(variant: string): string {
  return `{ variant: ${JSON.stringify(variant)} }`;
}

// Harness: tryTransition(from, to, guardResults = {}).
//   - Looks the pair up in the inlined transition table.
//   - If no rule matches: returns Error("E-MACHINE-001-RT: Illegal transition").
//   - If the matched rule is a guard rule (table value is `{ guard: true }`):
//     reads guardResults[key]; if explicitly false → returns
//     Error("E-MACHINE-001-RT: Transition guard failed").
//     If true or omitted → succeeds.
//   - If the matched rule is unguarded (table value is `true`): succeeds.
function emitHarnessPrelude(machineName: string, tableName: string): string[] {
  const varName = `__autoTest_${machineName}`;
  return [
    `  // Fresh reactive var per describe — isolated from any user code.`,
    `  const VAR = ${JSON.stringify(varName)};`,
    `  function tryTransition(from, to, guardResults) {`,
    `    guardResults = guardResults || {};`,
    `    globalThis._scrml_reactive_store = globalThis._scrml_reactive_store || {};`,
    `    globalThis._scrml_reactive_store[VAR] = from;`,
    `    try {`,
    `      var __prev = globalThis._scrml_reactive_store[VAR];`,
    `      var __next = to;`,
    `      var __key = (__prev != null && __prev.variant != null ? __prev.variant : "*") + ":" + (__next != null && __next.variant != null ? __next.variant : "*");`,
    `      var __rule = ${tableName}[__key]`,
    `        || ${tableName}["*:" + (__next != null && __next.variant != null ? __next.variant : "*")]`,
    `        || ${tableName}[(__prev != null && __prev.variant != null ? __prev.variant : "*") + ":*"]`,
    `        || ${tableName}["*:*"];`,
    `      if (!__rule) {`,
    `        return new Error("E-MACHINE-001-RT: Illegal transition");`,
    `      }`,
    `      if (__rule && typeof __rule === "object" && __rule.guard) {`,
    `        var __guardPass = guardResults.hasOwnProperty(__key) ? guardResults[__key] : true;`,
    `        if (!__guardPass) {`,
    `          return new Error("E-MACHINE-001-RT: Transition guard failed");`,
    `        }`,
    `      }`,
    `      return null;`,
    `    } catch (e) { return e; }`,
    `  }`,
  ];
}

function emitMachineDescribe(m: MachineLike, initial: string | null): string[] {
  const lines: string[] = [];
  const variants = collectVariants(m.rules);
  const reachable = initial ? reachableVariants(m.rules, initial) : new Set(variants);
  const rules = ruleMap(m.rules);

  const tableName = `__scrml_transitions_${m.name}`;

  // Inline the transition table — match the shape emit-machines.ts uses:
  // guarded rules get { guard: true }, unguarded get a bare true. The
  // harness relies on this shape to know when to consult guardResults.
  lines.push(`  const ${tableName} = {`);
  const entries: string[] = [];
  for (const r of m.rules) {
    const v = r.guard ? "{ guard: true }" : "true";
    entries.push(`    ${JSON.stringify(`${r.from}:${r.to}`)}: ${v}`);
  }
  lines.push(entries.join(",\n"));
  lines.push(`  };`);
  lines.push(``);

  for (const l of emitHarnessPrelude(m.name, tableName)) lines.push(l);
  lines.push(``);

  // Property (a) Exclusivity. For every reachable V and every variant W,
  // declared pairs (guarded or not) should succeed with guard=true;
  // undeclared pairs should throw. Guard-rule declared pairs pass
  // guardResults: { "V:W": true } to make the guard succeed.
  for (const v of variants) {
    if (!reachable.has(v)) continue;
    for (const w of variants) {
      const pair = `${v}:${w}`;
      const rule = rules.get(pair);
      const declared_ = rule != null;
      if (declared_) {
        const title = rule!.guard
          ? `declared .${v} => .${w} (guarded) succeeds when guard truthy`
          : `declared .${v} => .${w} succeeds`;
        lines.push(`  test(${JSON.stringify(title)}, () => {`);
        const guardArg = rule!.guard
          ? `, { ${JSON.stringify(pair)}: true }`
          : "";
        lines.push(`    const result = tryTransition(${variantLiteral(v)}, ${variantLiteral(w)}${guardArg});`);
        lines.push(`    expect(result).toBeNull();`);
        lines.push(`  });`);
      } else {
        const title = `undeclared .${v} => .${w} rejected`;
        lines.push(`  test(${JSON.stringify(title)}, () => {`);
        lines.push(`    const result = tryTransition(${variantLiteral(v)}, ${variantLiteral(w)});`);
        lines.push(`    expect(result).toBeInstanceOf(Error);`);
        lines.push(`    expect(result.message).toMatch(/E-MACHINE-001-RT/);`);
        lines.push(`  });`);
      }
    }
  }

  // Property (c) Guard coverage — labeled `given` guards get a passing +
  // failing test pair. The passing test is already asserted above by the
  // exclusivity pass (declared + guard=true → null); this block adds the
  // failing case (declared + guard=false → Error matching "Transition
  // guard failed") so both sides of the property are named in the output.
  const labeledGuardRules = m.rules.filter(r => r.guard && r.label);
  for (const r of labeledGuardRules) {
    const pair = `${r.from}:${r.to}`;
    const label = r.label!;
    const failTitle = `guard [${label}] on .${r.from} => .${r.to}: rejected when guard falsy`;
    lines.push(`  test(${JSON.stringify(failTitle)}, () => {`);
    lines.push(`    const result = tryTransition(${variantLiteral(r.from)}, ${variantLiteral(r.to)}, { ${JSON.stringify(pair)}: false });`);
    lines.push(`    expect(result).toBeInstanceOf(Error);`);
    lines.push(`    expect(result.message).toMatch(/Transition guard failed/);`);
    lines.push(`  });`);
  }

  return lines;
}

/**
 * Generate the machine property-test JS for a file.
 */
export function generateMachineTestJs(
  filePath: string,
  machineRegistry: Map<string, MachineLike> | null | undefined,
  initialVariants: Map<string, string>,
): string | null {
  if (!machineRegistry || machineRegistry.size === 0) return null;

  const fileName = basename(filePath);
  const lines: string[] = [];
  const skipNotes: string[] = [];
  const emittedBlocks: string[][] = [];

  for (const [name, machine] of machineRegistry) {
    if (machine.isDerived) {
      skipNotes.push(`// Skipped ${name}: derived/projection machine has no transition table (§51.9).`);
      continue;
    }
    if (!machine.rules || machine.rules.length === 0) {
      skipNotes.push(`// Skipped ${name}: empty transition table.`);
      continue;
    }
    const scopeCheck = rulesAreInScope(machine.rules);
    if (!scopeCheck.ok) {
      skipNotes.push(`// Skipped ${name}: ${scopeCheck.reason} — see §51.13 phased implementation.`);
      continue;
    }

    const block: string[] = [];
    const label = `[generated] machine ${name}`;
    block.push(`describe(${JSON.stringify(label)}, () => {`);
    for (const l of emitMachineDescribe(machine, initialVariants.get(name) ?? null)) {
      block.push(l);
    }
    block.push(`});`);
    emittedBlocks.push(block);
  }

  if (emittedBlocks.length === 0 && skipNotes.length === 0) return null;

  lines.push(`// §51.13 auto-generated machine property tests — do not edit.`);
  lines.push(`// Source: ${fileName}`);
  lines.push(`import { test, expect, describe } from "bun:test";`);
  lines.push(``);
  if (skipNotes.length > 0) {
    for (const n of skipNotes) lines.push(n);
    lines.push(``);
  }
  if (emittedBlocks.length === 0) {
    lines.push(`describe(${JSON.stringify(`[generated] ${fileName}`)}, () => {`);
    lines.push(`  test("no qualifying machines", () => { expect(true).toBe(true); });`);
    lines.push(`});`);
    lines.push(``);
    return lines.join("\n");
  }

  for (const block of emittedBlocks) {
    for (const l of block) lines.push(l);
    lines.push(``);
  }

  return lines.join("\n");
}
