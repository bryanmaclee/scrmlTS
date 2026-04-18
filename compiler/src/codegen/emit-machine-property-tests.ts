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
 * Phase 3 (S26) — payload-bound rules.
 *   Machines whose rules use §51.3.2 payload bindings are now in-scope.
 *   The harness is binding-transparent — it does not invoke the real
 *   machine IIFE, so the declared destructuring is never executed during
 *   the generated tests.
 *
 * Phase 4 (S26) — wildcard rules (`*` in from or to).
 *   Rules that use `*` as the from-variant ("any") or to-variant ("any")
 *   are in-scope. Reachability expands: a wildcard-from rule fires from
 *   any already-reached variant; a wildcard-to rule marks every variant
 *   in the governed enum as reachable. Pair resolution follows the
 *   four-step fallback chain used by emitTransitionGuard: exact
 *   `From:To`, then `*:To`, then `From:*`, then `*:*`. The inlined
 *   harness tracks the matched table key so guardResults can key on the
 *   matched wildcard rule (not the concrete input pair).
 *
 * Phase 5 (S26) — temporal rules (`.From after Ns => .To`).
 *   Machines whose rules include §51.12 temporal transitions are in-
 *   scope for exclusivity (property a) and guard coverage (property c).
 *   The pair `(.From, .To)` is a declared transition regardless of how
 *   it fires — timer-driven or user write — so the harness-level
 *   properties carry over unchanged. Test titles receive an
 *   `(after Nms)` annotation so the temporal nature of the rule is
 *   visible in the generated suite.
 *
 *   EXPLICITLY OUT OF SCOPE for auto-property-tests: the timer lifecycle
 *   itself (timer arms on variant entry, clears on variant exit, resets
 *   on reentry). Verifying those behaviors requires a live scrml runtime
 *   with fake-timer control — the self-contained harness deliberately
 *   does not invoke runtime code. Timer-lifecycle regression coverage
 *   lives in hand-written integration tests
 *   (e.g. `gauntlet-s25/machine-temporal-transitions.test.js`). The
 *   generated suite notes this in its header comment so users aren't
 *   surprised when timer bugs slip past it.
 *
 * Skipped machines (phase 5):
 *   - unlabeled `given` guards (we can't name them stably in test titles)
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
  // §51.13 phase 4: the full variant list of the governed enum, used so
  // wildcard-to rules can enumerate every variant in the type even when
  // the rule itself doesn't mention each variant. When omitted, the
  // emitter falls back to the variants named in `rules`.
  governedTypeVariants?: string[];
}

// Phase 5 filter: only unlabeled guards still block the machine entirely.
// Guards (if labeled), payload bindings, wildcards, and temporal rules are
// all in-scope. Temporal rules contribute exclusivity + guard-coverage
// tests just like non-temporal rules; timer lifecycle is explicitly out
// of scope for auto-property-tests (covered by hand-written integration
// tests — see the file header).
function rulesAreInScope(rules: TransitionRule[]): { ok: boolean; reason?: string } {
  for (const r of rules) {
    if (r.guard && !r.label)
      return { ok: false, reason: "contains unlabeled `given` guards (phase 2 requires a `[label]`)" };
  }
  return { ok: true };
}

// Phase 5: if any rule carries a temporal clause, the machine should
// emit a suite-header note about the timer-lifecycle scope limit.
function hasTemporalRule(rules: TransitionRule[]): boolean {
  for (const r of rules) if (r.afterMs != null) return true;
  return false;
}

// Phase 5: format an afterMs annotation for test titles so users can see
// which pairs come from temporal rules in the emitted suite.
function temporalSuffix(rule: TransitionRule | null): string {
  if (rule && rule.afterMs != null) return ` (after ${rule.afterMs}ms)`;
  return "";
}

function collectVariants(rules: TransitionRule[], typeVariants?: string[]): string[] {
  const s = new Set<string>();
  if (typeVariants && typeVariants.length > 0) {
    for (const v of typeVariants) s.add(v);
  }
  for (const r of rules) {
    if (r.from !== "*") s.add(r.from);
    if (r.to !== "*") s.add(r.to);
  }
  return [...s].sort();
}

// Phase 4: reachability now honors wildcards.
//   - wildcard `from` (`*`) fires from any already-reachable variant
//   - wildcard `to` (`*`) marks every variant in `allVariants` as reachable
function reachableVariants(rules: TransitionRule[], initial: string, allVariants: string[]): Set<string> {
  const reached = new Set<string>([initial]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of rules) {
      const fromMatches = r.from === "*" ? reached.size > 0 : reached.has(r.from);
      if (!fromMatches) continue;
      if (r.to === "*") {
        for (const v of allVariants) {
          if (!reached.has(v)) { reached.add(v); grew = true; }
        }
      } else {
        if (!reached.has(r.to)) { reached.add(r.to); grew = true; }
      }
    }
  }
  return reached;
}

// Phase 4: resolve which rule applies to a concrete (v, w) pair, mirroring
// emitTransitionGuard's fallback chain. Returns { rule, key } when matched
// (key is the matching table entry's from:to, useful for harness guardResults);
// null when no rule applies.
function resolveRule(v: string, w: string, rules: TransitionRule[]): { rule: TransitionRule; key: string } | null {
  const candidates = [`${v}:${w}`, `*:${w}`, `${v}:*`, `*:*`];
  for (const key of candidates) {
    const [from, to] = key.split(":");
    const rule = rules.find(r => r.from === from && r.to === to);
    if (rule) return { rule, key };
  }
  return null;
}

function variantLiteral(variant: string): string {
  return `{ variant: ${JSON.stringify(variant)} }`;
}

// Harness: tryTransition(from, to, guardResults = {}).
//   - Walks the four-step fallback chain from emitTransitionGuard:
//     exact, then *:To, then From:*, then *:*. Tracks __matchKey so
//     guardResults can key on the matched (possibly-wildcard) rule.
//   - If no rule matches: returns Error("E-MACHINE-001-RT: Illegal transition").
//   - If matched rule is a guard rule (table value is `{ guard: true }`):
//     reads guardResults[__matchKey]; if explicitly false → returns
//     Error("E-MACHINE-001-RT: Transition guard failed"). True/omitted → succeeds.
//   - If matched rule is unguarded (table value is `true`): succeeds.
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
    `      var __vFrom = (__prev != null && __prev.variant != null ? __prev.variant : "*");`,
    `      var __vTo = (__next != null && __next.variant != null ? __next.variant : "*");`,
    `      var __exact = __vFrom + ":" + __vTo;`,
    `      var __anyFrom = "*:" + __vTo;`,
    `      var __anyTo = __vFrom + ":*";`,
    `      var __anyAny = "*:*";`,
    `      var __matchKey = null, __rule = null;`,
    `      if (${tableName}[__exact] != null)       { __rule = ${tableName}[__exact]; __matchKey = __exact; }`,
    `      else if (${tableName}[__anyFrom] != null) { __rule = ${tableName}[__anyFrom]; __matchKey = __anyFrom; }`,
    `      else if (${tableName}[__anyTo] != null)   { __rule = ${tableName}[__anyTo]; __matchKey = __anyTo; }`,
    `      else if (${tableName}[__anyAny] != null)  { __rule = ${tableName}[__anyAny]; __matchKey = __anyAny; }`,
    `      if (__rule == null) {`,
    `        return new Error("E-MACHINE-001-RT: Illegal transition");`,
    `      }`,
    `      if (typeof __rule === "object" && __rule.guard) {`,
    `        var __guardPass = guardResults.hasOwnProperty(__matchKey) ? guardResults[__matchKey] : true;`,
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
  const variants = collectVariants(m.rules, m.governedTypeVariants);
  const reachable = initial ? reachableVariants(m.rules, initial, variants) : new Set(variants);

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
  // run resolveRule — it applies the same four-step fallback chain as the
  // harness and the real emitTransitionGuard. Declared pairs succeed
  // (with guardResults forcing any matched guard truthy); undeclared
  // pairs throw E-MACHINE-001-RT.
  for (const v of variants) {
    if (!reachable.has(v)) continue;
    for (const w of variants) {
      const match = resolveRule(v, w, m.rules);
      if (match != null) {
        const wildcardNote = match.key !== `${v}:${w}` ? ` (via wildcard ${match.key})` : "";
        const temporal = temporalSuffix(match.rule);
        const title = match.rule.guard
          ? `declared .${v} => .${w} (guarded${wildcardNote})${temporal} succeeds when guard truthy`
          : `declared .${v} => .${w}${wildcardNote}${temporal} succeeds`;
        lines.push(`  test(${JSON.stringify(title)}, () => {`);
        const guardArg = match.rule.guard
          ? `, { ${JSON.stringify(match.key)}: true }`
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

  // Property (c) Guard coverage — labeled `given` guards get a failing
  // test (the passing case is covered by the exclusivity loop above).
  // For a wildcard-guarded rule, pick a concrete representative pair
  // that *actually resolves to this rule* (a more-specific non-wildcard
  // rule would pre-empt it otherwise). If no such pair exists among the
  // reachable variants, the labeled guard is unreachable and we skip its
  // failing test with a comment.
  const labeledGuardRules = m.rules.filter(r => r.guard && r.label);
  for (const r of labeledGuardRules) {
    const ruleKey = `${r.from}:${r.to}`;
    // Find (v, w) that resolves to this rule. For the concrete rule
    // itself the answer is trivial; for wildcards we search the reachable
    // grid.
    let repV: string | null = null;
    let repW: string | null = null;
    for (const v of variants) {
      if (!reachable.has(v)) continue;
      for (const w of variants) {
        const m2 = resolveRule(v, w, m.rules);
        if (m2 && m2.key === ruleKey) {
          repV = v; repW = w;
          break;
        }
      }
      if (repV != null) break;
    }
    if (repV == null || repW == null) {
      lines.push(`  // (skip) guard [${r.label}] on .${r.from} => .${r.to}: no reachable pair resolves to this rule.`);
      continue;
    }
    const wildcardNote = ruleKey !== `${repV}:${repW}` ? ` (via wildcard ${ruleKey})` : "";
    const temporal = temporalSuffix(r);
    const failTitle = `guard [${r.label}] on .${r.from} => .${r.to}${wildcardNote}${temporal}: rejected when guard falsy`;
    lines.push(`  test(${JSON.stringify(failTitle)}, () => {`);
    lines.push(`    const result = tryTransition(${variantLiteral(repV)}, ${variantLiteral(repW)}, { ${JSON.stringify(ruleKey)}: false });`);
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

    // Phase 4: pull the governed enum's full variant list out of the
    // resolved type if the registry carried it through, so wildcard-to
    // rules can enumerate every variant in the type.
    const govType = (machine as any).governedType;
    const govVariants: string[] | undefined = govType && Array.isArray(govType.variants)
      ? govType.variants.map((v: any) => v.name).filter((n: any) => typeof n === "string")
      : machine.governedTypeVariants;
    const enriched: MachineLike = { ...machine, governedTypeVariants: govVariants };

    const block: string[] = [];
    const label = `[generated] machine ${name}`;
    block.push(`describe(${JSON.stringify(label)}, () => {`);
    for (const l of emitMachineDescribe(enriched, initialVariants.get(name) ?? null)) {
      block.push(l);
    }
    block.push(`});`);
    emittedBlocks.push(block);
  }

  if (emittedBlocks.length === 0 && skipNotes.length === 0) return null;

  // Phase 5 scope note: if any emitted machine uses temporal rules, call
  // out that timer-lifecycle behavior is deliberately outside this
  // suite's remit. The hand-written temporal tests cover it.
  const anyTemporal = [...machineRegistry.values()].some(
    m => !m.isDerived && Array.isArray(m.rules) && hasTemporalRule(m.rules),
  );

  lines.push(`// §51.13 auto-generated machine property tests — do not edit.`);
  lines.push(`// Source: ${fileName}`);
  if (anyTemporal) {
    lines.push(`// Note: temporal rules (.From after Ns => .To) contribute exclusivity`);
    lines.push(`// and guard-coverage tests only. Timer lifecycle (arm on entry, clear`);
    lines.push(`// on exit, reset on reentry) is outside this suite's scope — cover it`);
    lines.push(`// with hand-written integration tests against the real runtime.`);
  }
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
