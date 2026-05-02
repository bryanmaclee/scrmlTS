/**
 * §51.5 Phase 3D — Machine Transition Guard Wiring Integration Tests
 *
 * Verifies that emitTransitionGuard is correctly wired into the reactive
 * assignment rewrite path (rewriteBlockBody in emit-control-flow.ts).
 *
 * Coverage:
 *   §51.5-d-1  rewriteBlockBody emits transition guard structure for machine-bound var
 *   §51.5-d-2  rewriteBlockBody emits plain reactive_set for non-machine var
 *   §51.5-d-3  rewriteBlockBody with no machineBindings is backward-compatible
 *   §51.5-d-4  guard output contains E-ENGINE-001-RT error string
 *   §51.5-d-5  guard output contains the transition lookup table variable
 *   §51.5-d-6  guard wraps assignment in validation IIFE with __prev/__next
 *   §51.5-d-7  multiple assignments in one block: only machine-bound gets guard
 *   §51.5-d-8  guard rules are passed to emitTransitionGuard (guard field)
 *   §51.5-d-9  null machineBindings behaves like no bindings
 *   §51.5-d-10 empty machineBindings Map: no guards emitted
 */

import { describe, test, expect } from "bun:test";
import { rewriteBlockBody } from "../../src/codegen/emit-control-flow.ts";

// ---------------------------------------------------------------------------
// §51.5-d: rewriteBlockBody machine guard wiring
// ---------------------------------------------------------------------------

describe("§51.5-d rewriteBlockBody machine guard wiring", () => {
  const orderStatusBindings = new Map([
    ["status", {
      engineName: "OrderStatus",
      tableName: "__scrml_transitions_OrderStatus",
      rules: [
        { from: "Pending", to: "Processing", guard: null, label: null, effectBody: null },
        { from: "Processing", to: "Shipped", guard: null, label: null, effectBody: null },
      ],
    }],
  ]);

  test("§51.5-d-1 machine-bound assignment emits guard structure (IIFE + validation)", () => {
    const result = rewriteBlockBody("@status = OrderStatus.Processing", orderStatusBindings);

    // Guard should emit the transition table lookup
    expect(result).toContain("__scrml_transitions_OrderStatus");
    // Guard should include runtime error for illegal transitions
    expect(result).toContain("E-ENGINE-001-RT");
    // Guard reads previous value
    expect(result).toContain("_scrml_reactive_get");
    // Guard writes via reactive_set as the final step (after validation)
    expect(result).toContain("_scrml_reactive_set");
    // Guard must use __prev/__next pattern
    expect(result).toContain("__prev");
    expect(result).toContain("__next");
    // Guard must be wrapped in an IIFE
    expect(result).toContain("(function()");
  });

  test("§51.5-d-2 non-machine var emits plain reactive_set", () => {
    const result = rewriteBlockBody("@count = @count + 1", orderStatusBindings);

    // @count is not in the machine bindings — plain set, no guard
    expect(result).toContain('_scrml_reactive_set("count"');
    expect(result).not.toContain("E-ENGINE-001-RT");
    expect(result).not.toContain("__scrml_transitions");
  });

  test("§51.5-d-3 no machineBindings param is backward-compatible", () => {
    // No machineBindings passed — original behavior, plain reactive_set
    const result = rewriteBlockBody("@status = OrderStatus.Processing");

    expect(result).toContain('_scrml_reactive_set("status"');
    expect(result).not.toContain("E-ENGINE-001-RT");
    expect(result).not.toContain("__scrml_transitions");
  });

  test("§51.5-d-4 guard contains E-ENGINE-001-RT error code", () => {
    const result = rewriteBlockBody("@status = OrderStatus.Shipped", orderStatusBindings);

    expect(result).toContain("E-ENGINE-001-RT");
  });

  test("§51.5-d-5 guard references the transition table variable", () => {
    const result = rewriteBlockBody("@status = OrderStatus.Processing", orderStatusBindings);

    expect(result).toContain("__scrml_transitions_OrderStatus");
  });

  test("§51.5-d-6 guard wraps assignment in IIFE with __prev/__next", () => {
    const result = rewriteBlockBody("@status = OrderStatus.Processing", orderStatusBindings);

    // emitTransitionGuard wraps in (function() { ... })()
    expect(result).toContain("(function()");
    expect(result).toContain("})()");
    // Uses __prev for current value and __next for new value
    expect(result).toContain("__prev");
    expect(result).toContain("__next");
  });

  test("§51.5-d-7 mixed block: only machine-bound var gets guard", () => {
    const result = rewriteBlockBody(
      "@count = @count + 1; @status = OrderStatus.Processing",
      orderStatusBindings,
    );

    // @count: plain set, no guard
    expect(result).toContain('_scrml_reactive_set("count"');
    // @status: guarded — contains guard markers
    expect(result).toContain("__scrml_transitions_OrderStatus");
    expect(result).toContain("E-ENGINE-001-RT");
  });

  test("§51.5-d-8 guard rules with guard field are passed to emitTransitionGuard", () => {
    const bindingsWithGuard = new Map([
      ["status", {
        engineName: "OrderStatus",
        tableName: "__scrml_transitions_OrderStatus",
        rules: [
          { from: "Pending", to: "Processing", guard: "@isAdmin", label: "admin_only", effectBody: null },
        ],
      }],
    ]);

    const result = rewriteBlockBody("@status = OrderStatus.Processing", bindingsWithGuard);

    // Guard rule (with guard field set) should appear in output
    expect(result).toContain("@isAdmin");
    expect(result).toContain("admin_only");
  });

  test("§51.5-d-9 null machineBindings behaves like no bindings", () => {
    const result = rewriteBlockBody("@status = OrderStatus.Processing", null);

    // null machineBindings → plain reactive_set (no guard)
    expect(result).toContain('_scrml_reactive_set("status"');
    expect(result).not.toContain("E-ENGINE-001-RT");
    expect(result).not.toContain("__scrml_transitions");
  });

  test("§51.5-d-10 empty machineBindings Map: no guards emitted", () => {
    const result = rewriteBlockBody("@status = OrderStatus.Processing", new Map());

    // Empty map → plain reactive_set for all vars (var not in map)
    expect(result).toContain('_scrml_reactive_set("status"');
    expect(result).not.toContain("E-ENGINE-001-RT");
    expect(result).not.toContain("__scrml_transitions");
  });
});
