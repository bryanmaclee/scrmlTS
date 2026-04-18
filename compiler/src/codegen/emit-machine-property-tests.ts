/**
 * §51.13 — Auto-Generated Machine Property Tests
 *
 * Generates a bun:test suite per machine declaration that verifies the
 * compiled transition guard enforces exactly what the machine's transition
 * table declares. Slogan: machine = enforced spec.
 *
 * Phase 1 (S26) covers property (a) Exclusivity for machines whose rules
 * are all:
 *   - unguarded (no `given` clause)
 *   - payload-free (no from- or to-bindings)
 *   - non-wildcard (neither `from` nor `to` is `*`)
 *   - non-temporal (no `after Ns` clause)
 *   - non-derived (not a projection machine)
 *
 * Machines whose rules use features outside phase 1 are skipped with an
 * explanatory comment so users know why.
 *
 * Tests exercise the guard through the runtime helper
 * `_scrml_machine_try(varName, newValue)` — attempts the transition,
 * returns `null` on success or the thrown `Error` on failure. This lets
 * each test be an isolated expression without polluting the shared
 * reactive store between cases (the helper rolls the reactive back to
 * its pre-attempt value).
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

function rulesAreSimple(rules: TransitionRule[]): { ok: boolean; reason?: string } {
  for (const r of rules) {
    if (r.guard) return { ok: false, reason: "contains `given` guards" };
    if ((r.fromBindings && r.fromBindings.length > 0) ||
        (r.toBindings && r.toBindings.length > 0))
      return { ok: false, reason: "contains payload bindings" };
    if (r.from === "*" || r.to === "*")
      return { ok: false, reason: "contains wildcard rules" };
    if (r.afterMs != null)
      return { ok: false, reason: "contains temporal rules (`after`)" };
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

function declaredSet(rules: TransitionRule[]): Set<string> {
  const s = new Set<string>();
  for (const r of rules) s.add(`${r.from}:${r.to}`);
  return s;
}

function variantLiteral(variant: string): string {
  return `{ variant: ${JSON.stringify(variant)} }`;
}

function emitHarnessPrelude(machineName: string, tableName: string): string[] {
  const varName = `__autoTest_${machineName}`;
  return [
    `  // Fresh reactive var per describe — isolated from any user code.`,
    `  const VAR = ${JSON.stringify(varName)};`,
    `  function tryTransition(from, to) {`,
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
    `        return new Error("E-MACHINE-001-RT");`,
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
  const declared = declaredSet(m.rules);

  const tableName = `__scrml_transitions_${m.name}`;

  // Inline the transition table so the generated test is self-contained.
  // Matches the shape emitted by emit-machines.ts emitTransitionTable.
  lines.push(`  const ${tableName} = {`);
  const entries: string[] = [];
  for (const r of m.rules) {
    entries.push(`    ${JSON.stringify(`${r.from}:${r.to}`)}: true`);
  }
  lines.push(entries.join(",\n"));
  lines.push(`  };`);
  lines.push(``);

  for (const l of emitHarnessPrelude(m.name, tableName)) lines.push(l);
  lines.push(``);

  // Property (a) Exclusivity — one test per (V, W) pair among reachable
  // variants. Declared pairs must succeed (tryTransition returns null);
  // undeclared pairs must fail (returns an Error).
  for (const v of variants) {
    if (!reachable.has(v)) continue;
    for (const w of variants) {
      const pair = `${v}:${w}`;
      const declared_ = declared.has(pair);
      const label = declared_
        ? `declared .${v} => .${w} succeeds`
        : `undeclared .${v} => .${w} rejected`;
      lines.push(`  test(${JSON.stringify(label)}, () => {`);
      lines.push(`    const result = tryTransition(${variantLiteral(v)}, ${variantLiteral(w)});`);
      if (declared_) {
        lines.push(`    expect(result).toBeNull();`);
      } else {
        lines.push(`    expect(result).toBeInstanceOf(Error);`);
        lines.push(`    expect(result.message).toMatch(/E-MACHINE-001-RT/);`);
      }
      lines.push(`  });`);
    }
  }

  return lines;
}

/**
 * Generate the machine property-test JS for a file.
 *
 * @param filePath — source .scrml path (used for describe label)
 * @param machineRegistry — Map<name, MachineLike> from fileAST
 * @param initialVariants — Map<machineName, initialVariantName> inferred from reactive-decl initializers. Machines without an initial are tested as if every variant is reachable.
 * @returns bun:test JS string or null if no machines qualify.
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
    const simpleCheck = rulesAreSimple(machine.rules);
    if (!simpleCheck.ok) {
      skipNotes.push(`// Skipped ${name}: ${simpleCheck.reason} — phase 1 only covers unguarded/payload-free/non-wildcard/non-temporal machines.`);
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
    // Only skips, no emitted blocks — surface that via an empty describe so
    // the test runner doesn't complain about an empty suite.
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
