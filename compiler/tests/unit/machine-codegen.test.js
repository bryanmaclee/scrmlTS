/**
 * §51.5 Machine Codegen — Transition Tables + Runtime Guards
 *
 * Tests emitTransitionTable and emitTransitionGuard from emit-machines.ts.
 */

import { describe, test, expect } from "bun:test";
import { emitTransitionTable, emitTransitionGuard } from "../../src/codegen/emit-machines.ts";

// ---------------------------------------------------------------------------
// §51.5-a: Transition table generation
// ---------------------------------------------------------------------------

describe("§51.5-a emitTransitionTable", () => {
  test("basic two-rule table", () => {
    const rules = [
      { from: "Pending", to: "Processing", guard: null, label: null, effectBody: null },
      { from: "Processing", to: "Shipped", guard: null, label: null, effectBody: null },
    ];
    const lines = emitTransitionTable("__scrml_transitions_OrderStatus", rules);
    const code = lines.join("\n");

    expect(code).toContain("const __scrml_transitions_OrderStatus");
    expect(code).toContain('"Pending:Processing": true');
    expect(code).toContain('"Processing:Shipped": true');
  });

  test("guarded rule stores guard marker", () => {
    const rules = [
      { from: "Done", to: "Todo", guard: "@isAdmin", label: null, effectBody: null },
    ];
    const lines = emitTransitionTable("__t", rules);
    const code = lines.join("\n");

    expect(code).toContain('"Done:Todo": { guard: true }');
  });

  test("wildcard rules included", () => {
    const rules = [
      { from: "*", to: "Error", guard: null, label: null, effectBody: null },
    ];
    const lines = emitTransitionTable("__t", rules);
    const code = lines.join("\n");

    expect(code).toContain('"*:Error": true');
  });
});

// ---------------------------------------------------------------------------
// §51.5-b: Runtime guard emission
// ---------------------------------------------------------------------------

describe("§51.5-b emitTransitionGuard", () => {
  test("basic guard wraps assignment in validation IIFE", () => {
    const lines = emitTransitionGuard(
      "r_status",
      "OrderStatus_Processing",
      "__scrml_transitions_OrderStatus",
      "OrderStatus",
      [],
    );
    const code = lines.join("\n");

    expect(code).toContain("_scrml_reactive_get");
    expect(code).toContain("_scrml_reactive_set");
    expect(code).toContain("E-MACHINE-001-RT");
    expect(code).toContain("__scrml_transitions_OrderStatus");
    expect(code).toContain("r_status");
  });

  test("guard rules emit guard evaluation block", () => {
    const guardRules = [
      { from: "Done", to: "Todo", guard: "@isAdmin", label: "admin_only", effectBody: null },
    ];
    const lines = emitTransitionGuard(
      "r_status",
      "Column_Todo",
      "__t",
      "AdminFlow",
      guardRules,
    );
    const code = lines.join("\n");

    expect(code).toContain("@isAdmin");
    expect(code).toContain("[admin_only]");
    expect(code).toContain("Guard:");
  });

  test("effect blocks emit event object and effect code", () => {
    const rules = [
      { from: "Shipped", to: "Delivered", guard: null, label: null, effectBody: "@log = [...@log, event.to]" },
    ];
    const lines = emitTransitionGuard(
      "r_order",
      "OrderStatus_Delivered",
      "__t",
      "OrderStatus",
      rules,
    );
    const code = lines.join("\n");

    expect(code).toContain("var event = { from: __prev, to: __next }");
    expect(code).toContain("@log = [...@log, event.to]");
  });

  test("wildcard lookup fallback chain is present", () => {
    const lines = emitTransitionGuard("r_x", "v", "__t", "M", []);
    const code = lines.join("\n");

    // Should try: exact key, *:to, from:*, *:* (S27: via __matchedKey
    // ternary chain rather than the old `||` chain). Each fallback rung
    // appears as a ternary test on the table.
    expect(code).toContain('(__t[__key] != null) ? __key');
    expect(code).toContain('(__t["*:" + __nextVariant] != null) ? ("*:" + __nextVariant)');
    expect(code).toContain('(__t[__prevVariant + ":*"] != null) ? (__prevVariant + ":*")');
    expect(code).toContain('(__t["*:*"] != null) ? "*:*"');
  });
});

// ---------------------------------------------------------------------------
// §51.5-c: Execution order (§53.8.2)
// ---------------------------------------------------------------------------

describe("§51.5-c execution order", () => {
  test("order: validation → set → effects", () => {
    const rules = [
      { from: "A", to: "B", guard: "x > 0", label: null, effectBody: "doSomething()" },
    ];
    const lines = emitTransitionGuard("r_v", "val", "__t", "M", rules);
    const code = lines.join("\n");

    const throwIdx = code.indexOf("throw new Error");
    const setIdx = code.indexOf("_scrml_reactive_set");
    const effectIdx = code.indexOf("doSomething()");

    // Validation (throw) comes before set, set comes before effect
    expect(throwIdx).toBeLessThan(setIdx);
    expect(setIdx).toBeLessThan(effectIdx);
  });
});
