/**
 * S28 gauntlet — §51.13 phase 7: guarded projection machines.
 *
 * Extends §51.13 phase 6 (which covered unguarded projections) to
 * projections whose rules carry labeled `given` guards. Mirrors phase 2's
 * parametrization model: the generated projection harness takes a
 * guardResults map keyed on rule label. For each source variant, the
 * generator walks declared rules in order and emits:
 *
 *   - one test per guarded rule: "projects .V => .T when [label] truthy"
 *     (earlier guards all false, the rule's label true)
 *   - one terminal test: "projects .V => .Fallback (after N guards falsy)"
 *     when an unguarded rule exists, OR
 *     "projects .V → undefined when all guards falsy" when none exists
 *
 * Unlabeled-guard constraint carries over from phase 2 — any projection
 * rule with a `given` but no `[label]` skips the whole machine with a
 * header comment.
 */

import { describe, test, expect } from "bun:test";
import { generateMachineTestJs } from "../../../src/codegen/emit-machine-property-tests.ts";

function mkRegistry(machines) {
  const r = new Map();
  for (const m of machines) r.set(m.name, m);
  return r;
}

describe("S28 §51.13 phase 7 — guarded projection machines", () => {
  test("unguarded projection (phase 6 subset) — single test per source variant", () => {
    const registry = mkRegistry([{
      name: "UI",
      isDerived: true,
      rules: [
        { from: "Draft",     to: "Editable", guard: null, label: null, effectBody: null },
        { from: "Submitted", to: "ReadOnly", guard: null, label: null, effectBody: null },
      ],
    }]);
    const out = generateMachineTestJs("/f.scrml", registry, new Map());
    expect(out).not.toBeNull();
    expect(out).toContain("[generated] projection machine UI");
    expect(out).toContain('"projects .Draft => .Editable"');
    expect(out).toContain('"projects .Submitted => .ReadOnly"');
    // No guard parametrization when nothing is guarded.
    expect(out).not.toMatch(/truthy|falsy/);
  });

  test("single guarded rule + unguarded fallback — one truthy test + one fallback test", () => {
    const registry = mkRegistry([{
      name: "UI",
      isDerived: true,
      rules: [
        { from: "Draft", to: "Editable", guard: "@isAdmin", label: "admin", effectBody: null },
        { from: "Draft", to: "ReadOnly", guard: null,       label: null,     effectBody: null },
      ],
    }]);
    const out = generateMachineTestJs("/f.scrml", registry, new Map());
    expect(out).not.toBeNull();
    // Guarded rule's truthy case
    expect(out).toContain('"projects .Draft => .Editable when [admin] truthy"');
    // Unguarded fallback after guard falsy
    expect(out).toContain('"projects .Draft => .ReadOnly (after 1 guard falsy)"');
    // No "undefined" terminal — unguarded rule catches it.
    expect(out).not.toContain("undefined when all guards falsy");
    // Harness receives a guardResults map
    expect(out).toContain('function __project_UI(src, guardResults)');
    expect(out).toContain('{ "admin": true }');
    expect(out).toContain('{ "admin": false }');
  });

  test("multiple guarded rules + unguarded fallback — N+1 tests for the source variant", () => {
    const registry = mkRegistry([{
      name: "Role",
      isDerived: true,
      rules: [
        { from: "User", to: "SuperAdmin", guard: "@superAdmin", label: "super", effectBody: null },
        { from: "User", to: "Admin",      guard: "@admin",      label: "admin", effectBody: null },
        { from: "User", to: "Regular",    guard: null,          label: null,    effectBody: null },
      ],
    }]);
    const out = generateMachineTestJs("/f.scrml", registry, new Map());
    expect(out).toContain('"projects .User => .SuperAdmin when [super] truthy"');
    expect(out).toContain('"projects .User => .Admin when [admin] truthy"');
    expect(out).toContain('"projects .User => .Regular (after 2 guards falsy)"');
    // Later guards false when testing an earlier guard (admin test forces super=false)
    expect(out).toContain('{ "super": false, "admin": true }');
    // Fallback map has both guards false
    expect(out).toContain('{ "super": false, "admin": false }');
  });

  test("guarded rules with no unguarded fallback — terminal `undefined` test added", () => {
    const registry = mkRegistry([{
      name: "Maybe",
      isDerived: true,
      rules: [
        { from: "X", to: "Yes", guard: "@wantYes", label: "yes", effectBody: null },
        { from: "X", to: "No",  guard: "@wantNo",  label: "no",  effectBody: null },
      ],
    }]);
    const out = generateMachineTestJs("/f.scrml", registry, new Map());
    expect(out).toContain('"projects .X => .Yes when [yes] truthy"');
    expect(out).toContain('"projects .X => .No when [no] truthy"');
    // No unguarded rule, so the terminal is an undefined test
    expect(out).toContain('".X → undefined when all guards falsy"');
    expect(out).toContain('toBeUndefined()');
  });

  test("mixed source variants — each gets its own rule chain", () => {
    const registry = mkRegistry([{
      name: "Mixed",
      isDerived: true,
      rules: [
        { from: "A", to: "One",   guard: "@gA",  label: "gA",  effectBody: null },
        { from: "A", to: "TwoA",  guard: null,   label: null,  effectBody: null },
        { from: "B", to: "TwoB",  guard: null,   label: null,  effectBody: null },
      ],
    }]);
    const out = generateMachineTestJs("/f.scrml", registry, new Map());
    // A: one guarded + fallback
    expect(out).toContain('"projects .A => .One when [gA] truthy"');
    expect(out).toContain('"projects .A => .TwoA (after 1 guard falsy)"');
    // B: unguarded only
    expect(out).toContain('"projects .B => .TwoB"');
    // B has no guard clause annotation
    expect(out).not.toContain('projects .B => .TwoB (after');
  });

  test("unlabeled projection guard skips the machine with a phase-7 comment", () => {
    const registry = mkRegistry([{
      name: "Bad",
      isDerived: true,
      rules: [
        { from: "X", to: "Y", guard: "@something", label: null, effectBody: null },
      ],
    }]);
    const out = generateMachineTestJs("/f.scrml", registry, new Map());
    expect(out).toContain("Skipped Bad");
    expect(out).toContain("unlabeled `given` guard");
    expect(out).toContain("phase 7");
    // Harness not emitted for skipped machines.
    expect(out).not.toContain("[generated] projection machine Bad");
  });

  test("inlined projection fn receives guardResults and honors label lookups", () => {
    const registry = mkRegistry([{
      name: "F",
      isDerived: true,
      rules: [
        { from: "A", to: "X", guard: "@g", label: "gate", effectBody: null },
        { from: "A", to: "Y", guard: null, label: null,   effectBody: null },
      ],
    }]);
    const out = generateMachineTestJs("/f.scrml", registry, new Map());
    // Exact shape of the guarded-rule dispatch: tag check AND guardResults[label]
    expect(out).toContain('if (tag === "A" && guardResults["gate"]) return "X"');
    // Unguarded fallback: just tag check
    expect(out).toContain('if (tag === "A") return "Y"');
    // Fn signature includes guardResults param
    expect(out).toContain('function __project_F(src, guardResults)');
    expect(out).toContain('guardResults = guardResults || {}');
  });

  test("test titles read naturally (scanned as a group)", () => {
    const registry = mkRegistry([{
      name: "Greeter",
      isDerived: true,
      rules: [
        { from: "Morning",   to: "GoodMorning", guard: "@formal", label: "formal", effectBody: null },
        { from: "Morning",   to: "Hey",         guard: null,      label: null,     effectBody: null },
        { from: "Evening",   to: "GoodEvening", guard: null,      label: null,     effectBody: null },
      ],
    }]);
    const out = generateMachineTestJs("/f.scrml", registry, new Map());
    // Source variants are enumerated via `collectSourceVariants` which
    // sorts alphabetically — Evening before Morning. Within a single source
    // the guarded-then-fallback ordering is preserved.
    const titleOrder = [
      'projects .Evening => .GoodEvening',
      'projects .Morning => .GoodMorning when [formal] truthy',
      'projects .Morning => .Hey (after 1 guard falsy)',
    ];
    let lastIdx = -1;
    for (const t of titleOrder) {
      const idx = out.indexOf(t);
      expect(idx).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });
});
