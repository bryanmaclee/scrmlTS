// ---------------------------------------------------------------------------
// spec-server-deprecate-batch-2 — D4 spec-amendment regression tests.
//
// Insight 26 Batch 2 (2026-05-08) lands the spec-side amendments for the
// `server function` modifier deprecation. The diagnostic itself was added
// in Batch 1 (route-inference.ts D5). This test guards the spec entries so
// they don't drift back out.
//
// Insight 27 (2026-05-08) lands a single normative paragraph in §8.4.1
// documenting fragment-reuse via call-graph extraction (no new SQL surface).
//
// Co-located with route-inference.test.js by topic; the implementation
// behavior is already covered by §29/§30 of route-inference.test.js.
// ---------------------------------------------------------------------------

import { test, describe, expect, beforeAll } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SPEC_PATH = resolve(__dirname, "..", "..", "SPEC.md");

let SPEC = "";
beforeAll(() => {
  SPEC = readFileSync(SPEC_PATH, "utf-8");
});

describe("spec — Insight 26 Batch 2: server function deprecation amendments", () => {
  test("§34 catalog contains W-DEPRECATED-SERVER-MODIFIER row", () => {
    expect(SPEC).toContain("| W-DEPRECATED-SERVER-MODIFIER |");
    // The row must reference §52.10 (canonical) and §12.2 (Trigger 4).
    const row = SPEC.match(/\| W-DEPRECATED-SERVER-MODIFIER \|[^\n]+/);
    expect(row).toBeTruthy();
    expect(row[0]).toContain("§12.2");
    expect(row[0]).toContain("§52.10");
    expect(row[0]).toContain("Warning");
  });

  test("§34 catalog contains E-DEPRECATED-SERVER-MODIFIER row (deprecation cycle endpoint)", () => {
    expect(SPEC).toContain("| E-DEPRECATED-SERVER-MODIFIER |");
    const row = SPEC.match(/\| E-DEPRECATED-SERVER-MODIFIER \|[^\n]+/);
    expect(row).toBeTruthy();
    expect(row[0]).toContain("§12.2");
    expect(row[0]).toContain("§52.10");
    expect(row[0]).toContain("Error");
  });

  test("§34 catalog contains W-DEAD-FUNCTION row (Batch 1 D4 spec catch-up)", () => {
    expect(SPEC).toContain("| W-DEAD-FUNCTION |");
    const row = SPEC.match(/\| W-DEAD-FUNCTION \|[^\n]+/);
    expect(row).toBeTruthy();
    expect(row[0]).toContain("§12.2");
    expect(row[0]).toContain("Warning");
  });

  test("§12.2 contains Trigger 5 (caller-context propagation)", () => {
    // The trigger must mention caller-context propagation by name.
    expect(SPEC).toMatch(/5\.\s+\*\*Caller-context propagation\.\*\*/);
    // And must reference Step 5c in route-inference.ts.
    const triggerSection = SPEC.split("### 12.2 Escalation Triggers")[1];
    expect(triggerSection).toBeTruthy();
    const before12_3 = triggerSection.split("### 12.3")[0];
    expect(before12_3).toContain("Caller-context propagation");
    expect(before12_3).toContain("Step 5c");
  });

  test("§12.2 contains Trigger 6 (dead-code unreached-warn)", () => {
    expect(SPEC).toMatch(/6\.\s+\*\*Dead-code unreached-warn\.\*\*/);
    const triggerSection = SPEC.split("### 12.2 Escalation Triggers")[1];
    const before12_3 = triggerSection.split("### 12.3")[0];
    expect(before12_3).toContain("Dead-code unreached-warn");
    expect(before12_3).toContain("W-DEAD-FUNCTION");
  });

  test("§12.2 Trigger 4 marked DEPRECATED and cross-references §52.10 / §34", () => {
    const triggerSection = SPEC.split("### 12.2 Escalation Triggers")[1];
    const before12_3 = triggerSection.split("### 12.3")[0];
    // Trigger 4 (the explicit `server` annotation) must be marked DEPRECATED.
    expect(before12_3).toMatch(/4\.\s+The function has an explicit `server` annotation[\s\S]*DEPRECATED/);
    expect(before12_3).toContain("§52.10");
    expect(before12_3).toContain("W-DEPRECATED-SERVER-MODIFIER");
  });

  test("§52.10 retitled to mark `server function` as Deprecated", () => {
    expect(SPEC).toContain("### 52.10 Interaction with `server function` (Deprecated)");
  });

  test("§52.10 contains migration note + warn-then-error deprecation cycle wording", () => {
    const sect = SPEC.split("### 52.10 Interaction with `server function`")[1];
    expect(sect).toBeTruthy();
    const before52_11 = sect.split("### 52.11")[0];
    expect(before52_11).toContain("Migration note");
    expect(before52_11).toContain("W-DEPRECATED-SERVER-MODIFIER");
    expect(before52_11).toContain("E-DEPRECATED-SERVER-MODIFIER");
    expect(before52_11).toContain("Insight 26");
  });

  test("§52.10 explicitly preserves `server @var` cell authority modifier (NOT deprecated)", () => {
    const sect = SPEC.split("### 52.10 Interaction with `server function`")[1];
    const before52_11 = sect.split("### 52.11")[0];
    // The disambiguation must be explicit: cell authority modifier stays.
    expect(before52_11).toContain("NOT DEPRECATED");
    expect(before52_11).toContain("§52.4");
  });
});

describe("spec — Insight 27: §8.4.1 fragment-reuse paragraph", () => {
  test("§8.4.1 subsection exists with normative title", () => {
    expect(SPEC).toContain("#### 8.4.1 Fragment Reuse via Call-Graph Extraction");
  });

  test("§8.4.1 documents call-graph extraction as canonical idiom", () => {
    const sect = SPEC.split("#### 8.4.1 Fragment Reuse via Call-Graph Extraction")[1];
    expect(sect).toBeTruthy();
    const before8_5 = sect.split("### 8.5")[0];
    // The example function name from the brief.
    expect(before8_5).toContain("activeUsers");
    // Explicit non-shipping list:
    expect(before8_5).toContain("`sql\\`\\``");  // tagged template
    expect(before8_5).toContain("`?if`");        // ?if directive
    expect(before8_5).toContain("`scrml:sql`");  // query builder
    // Insight 27 attribution.
    expect(before8_5).toContain("Insight 27");
  });

  test("§8.4.1 contains normative statements about fragment-as-value prohibition", () => {
    const sect = SPEC.split("#### 8.4.1 Fragment Reuse via Call-Graph Extraction")[1];
    const before8_5 = sect.split("### 8.5")[0];
    expect(before8_5).toContain("Normative statements");
    expect(before8_5).toContain("function extraction");
    expect(before8_5).toContain("E-SQL-003");
  });
});
