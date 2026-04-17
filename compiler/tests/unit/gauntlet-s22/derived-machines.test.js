/**
 * derived-machines.test.js — S22 §51.9 (I): derived / projection machines.
 *
 * Slice 1 (type-system): parses `< machine UI for UIMode derived from @order>`,
 * registers the derived machine with isDerived/sourceVar/projectedVarName,
 * and validates exhaustiveness over the source enum's variants
 * (E-MACHINE-018). Runtime codegen lands in a follow-up slice — these tests
 * exercise the parser + validator directly.
 */

import { describe, test, expect } from "bun:test";
import {
  buildMachineRegistry,
  buildTypeRegistry,
  validateDerivedMachines,
} from "../../../src/type-system.js";

function span() {
  return { file: "test.scrml", start: 0, end: 0, line: 1, col: 1 };
}

function makeTypeDecl(name, kind, raw) {
  return { kind: "type-decl", name, typeKind: kind, raw, span: span() };
}

function makeMachineDecl(machineName, governedType, rulesRaw, sourceVar = null) {
  return { kind: "machine-decl", machineName, governedType, rulesRaw, sourceVar, span: span() };
}

// Shared: a source machine + a projection enum used across the tests.
const ORDER_ENUM = makeTypeDecl("OrderState", "enum",
  "{ Draft\nSubmitted\nPaid\nShipping\nDelivered\nCancelled\nRefunded }");
const UIMODE_ENUM = makeTypeDecl("UIMode", "enum", "{ Editable\nReadOnly\nTerminal }");

describe("§51.9 slice 1 — derived-machine registration", () => {
  test("registers a derived machine with isDerived/sourceVar/projectedVarName", () => {
    const typeRegistry = buildTypeRegistry([ORDER_ENUM, UIMODE_ENUM], [], span());
    const orderMachine = makeMachineDecl("OrderMachine", "OrderState",
      ".Draft => .Submitted\n.Submitted => .Paid\n.Paid => .Shipping\n" +
      ".Shipping => .Delivered\n.Draft => .Cancelled\n.Paid => .Refunded",
    );
    const uiMachine = makeMachineDecl("UI", "UIMode",
      ".Draft => .Editable\n" +
      ".Submitted | .Paid | .Shipping => .ReadOnly\n" +
      ".Delivered | .Cancelled | .Refunded => .Terminal",
      "order",
    );
    const errors = [];
    const registry = buildMachineRegistry([orderMachine, uiMachine], typeRegistry, errors, span());
    expect(errors).toEqual([]);
    const ui = registry.get("UI");
    expect(ui).toBeDefined();
    expect(ui.isDerived).toBe(true);
    expect(ui.sourceVar).toBe("order");
    expect(ui.projectedVarName).toBe("ui");
    // Rules were expanded via | alternation: 1 + 3 + 3 = 7 projection rules.
    expect(ui.rules).toHaveLength(7);
    // Each rule RHS resolves to a single projection variant.
    expect(ui.rules.every(r => ["Editable", "ReadOnly", "Terminal"].includes(r.to))).toBe(true);
  });

  test("non-derived machines keep isDerived absent (falsy)", () => {
    const typeRegistry = buildTypeRegistry([ORDER_ENUM], [], span());
    const m = makeMachineDecl("OrderMachine", "OrderState", ".Draft => .Submitted");
    const errors = [];
    const registry = buildMachineRegistry([m], typeRegistry, errors, span());
    expect(errors).toEqual([]);
    expect(registry.get("OrderMachine").isDerived).toBeFalsy();
  });

  test("LHS variant names on projection rules are NOT validated against the projection enum", () => {
    // `.Draft` is a variant of OrderState (the source), not UIMode. The
    // projection rule's LHS refers to source variants; we must not flag it as
    // an unknown UIMode variant.
    const typeRegistry = buildTypeRegistry([ORDER_ENUM, UIMODE_ENUM], [], span());
    const uiMachine = makeMachineDecl("UI", "UIMode",
      ".Draft => .Editable\n" +
      ".Submitted | .Paid | .Shipping => .ReadOnly\n" +
      ".Delivered | .Cancelled | .Refunded => .Terminal",
      "order",
    );
    const errors = [];
    buildMachineRegistry([uiMachine], typeRegistry, errors, span());
    // Only the source-var resolution error (no '@order' reactive in this
    // stripped test) should appear — not an E-MACHINE-004 on `.Draft` etc.
    for (const e of errors) {
      expect(e.message).not.toContain(".Draft");
      expect(e.message).not.toContain(".Submitted");
    }
  });

  test("RHS variant names ARE validated against the projection enum (E-MACHINE-004)", () => {
    const typeRegistry = buildTypeRegistry([ORDER_ENUM, UIMODE_ENUM], [], span());
    const uiMachine = makeMachineDecl("UI", "UIMode",
      ".Draft => .Bogus",  // Bogus isn't a UIMode variant
      "order",
    );
    const errors = [];
    buildMachineRegistry([uiMachine], typeRegistry, errors, span());
    const e = errors.find(e => e.code === "E-MACHINE-004" && e.message.includes("Bogus"));
    expect(e).toBeDefined();
  });
});

describe("§51.9 slice 1 — validateDerivedMachines (exhaustiveness + source resolution)", () => {
  test("E-MACHINE-018: missing source-enum variant", () => {
    const typeRegistry = buildTypeRegistry([ORDER_ENUM, UIMODE_ENUM], [], span());
    const orderMachine = makeMachineDecl("OrderMachine", "OrderState",
      ".Draft => .Submitted",
    );
    // UI machine DOES NOT cover Refunded.
    const uiMachine = makeMachineDecl("UI", "UIMode",
      ".Draft => .Editable\n" +
      ".Submitted | .Paid | .Shipping => .ReadOnly\n" +
      ".Delivered | .Cancelled => .Terminal",
      "order",
    );
    const errors = [];
    const registry = buildMachineRegistry([orderMachine, uiMachine], typeRegistry, errors, span());

    // Simulate the post-annotation step: reactive `@order: OrderMachine = ...`.
    const reactiveBindings = new Map([["order", registry.get("OrderMachine")]]);
    validateDerivedMachines(registry, reactiveBindings, errors, span());

    const e = errors.find(e => e.code === "E-MACHINE-018");
    expect(e).toBeDefined();
    expect(e.message).toContain("Refunded");
    expect(e.message).toContain("OrderState");
  });

  test("Fully exhaustive derived machine passes with no errors", () => {
    const typeRegistry = buildTypeRegistry([ORDER_ENUM, UIMODE_ENUM], [], span());
    const orderMachine = makeMachineDecl("OrderMachine", "OrderState", ".Draft => .Submitted");
    const uiMachine = makeMachineDecl("UI", "UIMode",
      ".Draft => .Editable\n" +
      ".Submitted | .Paid | .Shipping => .ReadOnly\n" +
      ".Delivered | .Cancelled | .Refunded => .Terminal",
      "order",
    );
    const errors = [];
    const registry = buildMachineRegistry([orderMachine, uiMachine], typeRegistry, errors, span());
    const reactiveBindings = new Map([["order", registry.get("OrderMachine")]]);
    validateDerivedMachines(registry, reactiveBindings, errors, span());
    expect(errors.filter(e => e.code === "E-MACHINE-018")).toHaveLength(0);
  });

  test("E-MACHINE-004: source-var not bound to a machine", () => {
    const typeRegistry = buildTypeRegistry([ORDER_ENUM, UIMODE_ENUM], [], span());
    const uiMachine = makeMachineDecl("UI", "UIMode", ".Draft => .Editable", "order");
    const errors = [];
    const registry = buildMachineRegistry([uiMachine], typeRegistry, errors, span());
    // Empty reactiveBindings — `@order` does not exist in scope.
    validateDerivedMachines(registry, new Map(), errors, span());
    const e = errors.find(e => e.code === "E-MACHINE-004" && e.message.includes("source variable"));
    expect(e).toBeDefined();
    expect(e.message).toContain("@order");
  });

  test("E-MACHINE-004: transitive projection (deferred per §51.9.7)", () => {
    const typeRegistry = buildTypeRegistry([ORDER_ENUM, UIMODE_ENUM], [], span());
    const orderMachine = makeMachineDecl("OrderMachine", "OrderState", ".Draft => .Submitted");
    // First projection: from @order.
    const uiMachine = makeMachineDecl("UI", "UIMode",
      ".Draft => .Editable\n" +
      ".Submitted | .Paid | .Shipping => .ReadOnly\n" +
      ".Delivered | .Cancelled | .Refunded => .Terminal",
      "order",
    );
    // Second projection: from @ui — transitive, not supported.
    const stageEnum = makeTypeDecl("Stage", "enum", "{ Active\nDone }");
    const stageMachine = makeMachineDecl("Stage", "Stage",
      ".Editable => .Active\n.ReadOnly | .Terminal => .Done",
      "ui",
    );

    const errors = [];
    const registry = buildMachineRegistry(
      [orderMachine, uiMachine, stageMachine],
      buildTypeRegistry([ORDER_ENUM, UIMODE_ENUM, stageEnum], [], span()),
      errors, span(),
    );
    const reactiveBindings = new Map([
      ["order", registry.get("OrderMachine")],
      ["ui", registry.get("UI")],
    ]);
    validateDerivedMachines(registry, reactiveBindings, errors, span());
    const e = errors.find(e =>
      e.code === "E-MACHINE-004" && e.message.includes("transitive") || e.message.includes("Transitive")
    );
    expect(e).toBeDefined();
  });

  test("guarded projection rules are NOT counted for exhaustiveness; unguarded sibling needed", () => {
    // .Paid can be either .ReadOnly (if isAdmin) or .Editable (else).
    // Without a final unguarded rule for .Paid, coverage is incomplete.
    const typeRegistry = buildTypeRegistry([ORDER_ENUM, UIMODE_ENUM], [], span());
    const orderMachine = makeMachineDecl("OrderMachine", "OrderState", ".Draft => .Submitted");
    const uiMachine = makeMachineDecl("UI", "UIMode",
      ".Draft => .Editable\n" +
      ".Submitted => .ReadOnly\n" +
      ".Paid given (isAdmin) => .Editable\n" + // guarded — doesn't fully cover .Paid
      ".Shipping => .ReadOnly\n" +
      ".Delivered | .Cancelled | .Refunded => .Terminal",
      "order",
    );
    const errors = [];
    const registry = buildMachineRegistry([orderMachine, uiMachine], typeRegistry, errors, span());
    const reactiveBindings = new Map([["order", registry.get("OrderMachine")]]);
    validateDerivedMachines(registry, reactiveBindings, errors, span());
    // Either E-MACHINE-018 on .Paid (preferred) — or we accept the rule as total
    // (implementation may later prove a guard is exhaustive; for now require
    // the unguarded sibling).
    const e = errors.find(e => e.code === "E-MACHINE-018" && e.message.includes("Paid"));
    expect(e).toBeDefined();
  });
});
