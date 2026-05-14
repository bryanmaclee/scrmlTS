/**
 * §40.9.9 worked example — end-to-end pipeline replay (A-3.5 close, S91).
 *
 * The §40.9.9 worked example (SPEC.md lines 17807-17878) is the normative
 * worked example for the §40.9 closure-analysis pipeline. It exercises:
 *
 *   1. App-scope role-enum declaration (`type UserRole:enum = { ... }`)
 *      consumed by the A-3.2 role-enum resolver.
 *   2. Program-auth gate (`<program auth="required">`) — closed-form;
 *      gated_for_role = non-anonymous variants.
 *   3. Auth-role-block gate (`<auth role="Admin">`) — closed-form;
 *      gated_for_role = {Admin}.
 *   4. Reachability-solver Component 4 driven by the AuthGraph: the
 *      `<auth role="Admin">` block is OUT for non-Admin viewers, IN for
 *      Admin viewers. Per-role ChunkPlan emission (Components 1+2+3+4+5
 *      composed) without E-CLOSURE-001 termination failure.
 *
 * This test is the proof that the A-3.5 wire-in (api.js Stage 7.55 →
 * runReachabilitySolver Stage 7.6) is end-to-end coherent: compile a
 * scrml source string through the full driver, then assert on the
 * shipped `authGraph` + `reachabilityRecord` shapes against §40.9.9's
 * normative claims.
 *
 * **NOTE — §40.9.9 case-mismatch editorial bug:** the SPEC's verbatim
 * §40.9.9 fixture uses `<auth role="admin">` (lowercase) against an
 * enum declaring `Admin` (uppercase). Per SPEC §6.X (line 6914): *"String
 * matching is case-sensitive — the string must exactly match the variant
 * name as declared."* — the lowercase form does NOT match the uppercase
 * variant; the classifier (correctly) treats it as a non-foldable static
 * lookup. The §40.9.9 prose then claims the gate IS closed-form-classified
 * (step 5, lines 17858-17873). This is a SPEC editorial inconsistency,
 * NOT a classifier bug — the case-sensitivity rule wins per §6.X.
 *
 * This integration test uses `role="Admin"` (case-matched) to exercise
 * the classifier's closed-form path that §40.9.9 prose describes. The
 * structural shape (program-auth + auth-role-block + role-enum + nested
 * navigation markup) is faithful to §40.9.9; the only deviation is the
 * variant-name capitalization. Deferred item: surface to PA for a SPEC
 * §40.9.9 fixture-correction dispatch.
 *
 * Spec authority:
 *   - SPEC.md §40.9.9 (line 17807) — worked example normative text
 *   - SPEC.md §40.9.5 (line 17719) — Component 4 normative statement
 *   - SPEC.md §40.1.1 (line 17157) — static role classification anchor
 *   - SPEC.md §40.9.11 (line 17892) — error-code catalog (E-CLOSURE-001,
 *     E-CLOSURE-002, W-AUTH-RUNTIME-FALLBACK)
 *   - compiler/src/auth-graph.ts — A-3 derivation pass
 *   - compiler/src/api.js Stage 7.55 — A-3.5 wire-in (S91)
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "a35-spec-40-9-9-"));
});

afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

/**
 * The §40.9.9 worked-example shape, ported with case-matched variant names
 * (`Admin` vs the SPEC's `admin`). Structural fidelity preserved:
 *
 *   - `<program auth="required">` with `db=` and a four-variant role enum
 *   - top-level reactive cell `@count` and click handler `increment()`
 *   - `<auth role="Admin">` block wrapping an admin-only nav link
 *   - free-standing button reading `@count` (forces ProfileWidget-like
 *     worst-case-union admission via reachable component closure)
 *
 * The `<block Header>` / `<block Dashboard>` / `<block ProfileWidget>`
 * components from §40.9.9 are collapsed inline — the closure-analysis
 * normative claims don't require block factoring; the per-gate
 * classification + per-role filtering exercise the same code path either
 * way.
 */
const WORKED_EXAMPLE_SOURCE = `<program title="Dispatch" auth="required">

type UserRole:enum = { Anonymous, Driver, Dispatcher, Admin }

<count> = 0

function increment() {
  @count = @count + 1
}

<nav class="flex items-center gap-3 p-4 border-b">
  <h1 class="text-xl font-semibold">Dispatch</h1>
  <a href="/loads" class="text-blue-600">Loads</a>
  <auth role="Admin">
    <a href="/admin" class="text-red-600">Admin</a>
  </auth>
</nav>

<button onclick=increment()
        class="px-3 py-1 rounded bg-slate-100">
  \${@count}
</button>

</program>
`;

async function compileWorkedExample() {
  const filePath = join(TMP, "app.scrml");
  writeFileSync(filePath, WORKED_EXAMPLE_SOURCE);
  return compileScrml({
    inputFiles: [filePath],
    outputDir: join(TMP, "dist"),
    write: false,
  });
}

// ---------------------------------------------------------------------------
// §1 — Pipeline-level invariants (compile succeeds, no E-CLOSURE-001)
// ---------------------------------------------------------------------------

describe("§40.9.9 — pipeline termination", () => {
  test("compile succeeds — no fatal errors", async () => {
    const result = await compileWorkedExample();
    const fatalErrors = result.errors.filter(e => e.severity !== "warning" && !e.code?.startsWith("W-") && !e.code?.startsWith("I-"));
    expect(fatalErrors).toEqual([]);
  });

  test("closure analysis terminates — E-CLOSURE-001 NOT emitted", async () => {
    const result = await compileWorkedExample();
    const closureTerminationErrors = result.errors.filter(e => e.code === "E-CLOSURE-001");
    expect(closureTerminationErrors).toEqual([]);
  });

  test("no E-CLOSURE-002 — role enum is declared, no structural impossibility", async () => {
    const result = await compileWorkedExample();
    const noEnumErrors = result.errors.filter(e => e.code === "E-CLOSURE-002");
    expect(noEnumErrors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §2 — AuthGraph shape (A-3 derivation, wired via Stage 7.55)
// ---------------------------------------------------------------------------

describe("§40.9.9 — AuthGraph derivation", () => {
  test("authGraph surfaced on compile result", async () => {
    const result = await compileWorkedExample();
    expect(result.authGraph).toBeDefined();
    expect(result.authGraph).not.toBeNull();
  });

  test("role enum resolved to `UserRole` with all four variants", async () => {
    const result = await compileWorkedExample();
    const roleEnum = result.authGraph?.roleEnum;
    expect(roleEnum).toBeDefined();
    expect(roleEnum?.name).toBe("UserRole");
    expect(roleEnum?.isImplicitAnonymous).toBe(false);
    expect([...(roleEnum?.variants ?? [])].sort()).toEqual(
      ["Admin", "Anonymous", "Dispatcher", "Driver"]
    );
  });

  test("two gates enumerated — program-auth + auth-role-block", async () => {
    const result = await compileWorkedExample();
    const gates = [...(result.authGraph?.gates?.values() ?? [])];
    expect(gates.length).toBe(2);

    const programGate = gates.find(g => g.siteKind === "program-auth");
    expect(programGate).toBeDefined();
    expect(programGate?.role).toBe("required");

    const authBlockGate = gates.find(g => g.siteKind === "auth-role-block");
    expect(authBlockGate).toBeDefined();
    expect(authBlockGate?.role).toBe("Admin");
  });

  test("program-auth classification: closed-form, gated_for_role = non-anonymous variants", async () => {
    const result = await compileWorkedExample();
    const gates = [...(result.authGraph?.gates?.values() ?? [])];
    const programGate = gates.find(g => g.siteKind === "program-auth");
    expect(programGate?.classification).toBeDefined();
    expect(programGate?.classification?.closed_form).toBe(true);
    if (programGate?.classification?.closed_form === true) {
      const gatedFor = [...programGate.classification.gated_for_role].sort();
      // `required` excludes the Anonymous floor per §40.9.5 closed-form
      // expansion (auth.ts:1426 `nonAnonymousVariants`).
      expect(gatedFor).toEqual(["Admin", "Dispatcher", "Driver"]);
    }
  });

  test("auth-role-block classification: closed-form, gated_for_role = {Admin}", async () => {
    const result = await compileWorkedExample();
    const gates = [...(result.authGraph?.gates?.values() ?? [])];
    const authBlockGate = gates.find(g => g.siteKind === "auth-role-block");
    expect(authBlockGate?.classification).toBeDefined();
    expect(authBlockGate?.classification?.closed_form).toBe(true);
    if (authBlockGate?.classification?.closed_form === true) {
      const gatedFor = [...authBlockGate.classification.gated_for_role];
      expect(gatedFor).toEqual(["Admin"]);
    }
  });
});

// ---------------------------------------------------------------------------
// §3 — ReachabilityRecord shape (A-2.5 Component 4, fed by AuthGraph)
// ---------------------------------------------------------------------------

describe("§40.9.9 — ReachabilityRecord per-role ChunkPlan emission", () => {
  test("reachabilityRecord surfaced on compile result", async () => {
    const result = await compileWorkedExample();
    expect(result.reachabilityRecord).toBeDefined();
  });

  test("closures map populated — at least one entry point per file", async () => {
    const result = await compileWorkedExample();
    const closures = result.reachabilityRecord?.closures;
    expect(closures).toBeDefined();
    expect(closures?.size ?? 0).toBeGreaterThan(0);
  });

  test("ChunkPlan emitted per effective role (4 variants — Admin / Dispatcher / Driver / Anonymous)", async () => {
    const result = await compileWorkedExample();
    const closures = result.reachabilityRecord?.closures;
    expect(closures).toBeDefined();

    // For each entry point, the byRole map should carry one ChunkPlan per
    // effective role variant. With UserRole:enum = {Anonymous, Driver,
    // Dispatcher, Admin} declared, Component 4 derives effectiveRoles
    // from the enum's variant set — so each entry should have 4 keyed
    // plans.
    let observedRolesPerEntry = null;
    for (const [, rps] of closures ?? []) {
      const roleSet = new Set(rps.byRole?.keys() ?? []);
      observedRolesPerEntry = roleSet;
      break; // sample the first entry; other entries match (same enum).
    }
    expect(observedRolesPerEntry).not.toBeNull();
    expect(observedRolesPerEntry?.size ?? 0).toBe(4);
    // Variant-name order is not load-bearing; just check membership.
    const sortedRoles = [...(observedRolesPerEntry ?? [])].sort();
    expect(sortedRoles).toEqual(["Admin", "Anonymous", "Dispatcher", "Driver"]);
  });

  test("each per-role ChunkPlan carries the four ChunkContents tiers", async () => {
    const result = await compileWorkedExample();
    const closures = result.reachabilityRecord?.closures;
    let sample = null;
    for (const [, rps] of closures ?? []) {
      for (const [, plan] of rps.byRole ?? []) {
        sample = plan;
        break;
      }
      if (sample) break;
    }
    expect(sample).not.toBeNull();
    // ChunkPlan shape per types/reachability.ts:123
    expect(sample.initialChunk).toBeDefined();
    expect(sample.prefetchTier1).toBeDefined();
    expect(sample.prefetchTier2).toBeDefined();
    expect(sample.prefetchTierN).toBeDefined();
    // ChunkContents shape — four set/array containers.
    expect(sample.initialChunk.componentNodeIds).toBeDefined();
    expect(sample.initialChunk.reactiveCellNodeIds).toBeDefined();
    expect(sample.initialChunk.serverFnNodeIds).toBeDefined();
    expect(sample.initialChunk.vendorUnitNames).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §4 — Per-role filtering (§40.9.5 Component 4 normative claim)
// ---------------------------------------------------------------------------

describe("§40.9.9 — per-role filtering at component level", () => {
  test("Admin role's componentNodeIds ⊇ non-Admin role's componentNodeIds", async () => {
    // The §40.9.9 normative claim (step 5, lines 17858-17873): for a
    // viewer with Admin role, the `<auth role="Admin">` block is IN —
    // its component children are admitted to the chunk. For Driver /
    // Dispatcher / Anonymous, the block is OUT — its children are
    // filtered from the chunk.
    //
    // Therefore: |Admin.componentNodeIds| ≥ |OtherRole.componentNodeIds|
    // for every other-role plan in the same entry point. (Equality is
    // possible if no component children sit inside the gate; strictly-
    // greater holds when the gated block contains real components.)
    //
    // The current fixture has a free-standing `<a>` link inside the
    // `<auth>` block — that link is a markup leaf, not a registered
    // component. The component-set deltas may therefore be size-equal.
    // We assert the WEAKER invariant (no Admin component is missing
    // from other-role plans BY FAULT — i.e. other-role plans are
    // subsets of the Admin plan).
    const result = await compileWorkedExample();
    const closures = result.reachabilityRecord?.closures;
    expect(closures).toBeDefined();

    for (const [, rps] of closures ?? []) {
      const adminPlan = rps.byRole?.get("Admin");
      if (!adminPlan) continue;
      const adminComponents = adminPlan.initialChunk.componentNodeIds;
      for (const role of ["Driver", "Dispatcher", "Anonymous"]) {
        const rolePlan = rps.byRole?.get(role);
        if (!rolePlan) continue;
        for (const id of rolePlan.initialChunk.componentNodeIds) {
          expect(adminComponents.has(id)).toBe(true);
        }
      }
    }
  });
});
