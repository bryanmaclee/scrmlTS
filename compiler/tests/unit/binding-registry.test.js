/**
 * binding-registry.js — Unit Tests
 *
 * Tests for the BindingRegistry class that mediates between HTML generation
 * and client JS generation.
 *
 * Coverage:
 *   §1  Construction — fresh registry is empty
 *   §2  addEventBinding / eventBindings — add/read contract
 *   §3  addLogicBinding / logicBindings — add/read contract
 *   §4  Event bindings — shape validation
 *   §5  Logic bindings — conditional display and reactive refs
 *   §6  Multiple bindings — ordering preserved
 */

import { describe, test, expect } from "bun:test";
import { BindingRegistry } from "../../src/codegen/binding-registry.ts";

// ---------------------------------------------------------------------------
// §1  Construction
// ---------------------------------------------------------------------------

describe("BindingRegistry — construction", () => {
  test("new registry has empty eventBindings", () => {
    const r = new BindingRegistry();
    expect(r.eventBindings).toEqual([]);
  });

  test("new registry has empty logicBindings", () => {
    const r = new BindingRegistry();
    expect(r.logicBindings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §2  Event bindings — add/read contract
// ---------------------------------------------------------------------------

describe("BindingRegistry — event bindings", () => {
  test("addEventBinding stores and exposes via getter", () => {
    const r = new BindingRegistry();
    const entry = {
      placeholderId: "_scrml_attr_onclick_1",
      eventName: "onclick",
      handlerName: "handleClick",
      handlerArgs: [],
    };
    r.addEventBinding(entry);
    expect(r.eventBindings).toHaveLength(1);
    expect(r.eventBindings[0]).toBe(entry);
  });

  test("multiple event bindings are stored in order", () => {
    const r = new BindingRegistry();
    r.addEventBinding({ placeholderId: "a", eventName: "onclick", handlerName: "fn1", handlerArgs: [] });
    r.addEventBinding({ placeholderId: "b", eventName: "onsubmit", handlerName: "fn2", handlerArgs: [] });
    r.addEventBinding({ placeholderId: "c", eventName: "onchange", handlerName: "fn3", handlerArgs: [] });
    expect(r.eventBindings).toHaveLength(3);
    expect(r.eventBindings[0].placeholderId).toBe("a");
    expect(r.eventBindings[1].placeholderId).toBe("b");
    expect(r.eventBindings[2].placeholderId).toBe("c");
  });

  test("event binding with args preserves arg values", () => {
    const r = new BindingRegistry();
    const args = [
      { kind: "string-literal", value: "apple" },
      { kind: "number-literal", value: 42 },
    ];
    r.addEventBinding({
      placeholderId: "p1",
      eventName: "onclick",
      handlerName: "addItem",
      handlerArgs: args,
    });
    expect(r.eventBindings[0].handlerArgs).toBe(args);
    expect(r.eventBindings[0].handlerArgs).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// §3  Logic bindings — add/read contract
// ---------------------------------------------------------------------------

describe("BindingRegistry — logic bindings", () => {
  test("addLogicBinding stores and exposes via getter", () => {
    const r = new BindingRegistry();
    const entry = {
      placeholderId: "_scrml_logic_1",
      expr: "@count + 1",
    };
    r.addLogicBinding(entry);
    expect(r.logicBindings).toHaveLength(1);
    expect(r.logicBindings[0]).toBe(entry);
  });

  test("logic binding with reactiveRefs preserves the Set", () => {
    const r = new BindingRegistry();
    const refs = new Set(["count", "total"]);
    r.addLogicBinding({
      placeholderId: "p1",
      expr: "@count + @total",
      reactiveRefs: refs,
    });
    expect(r.logicBindings[0].reactiveRefs).toBe(refs);
    expect(r.logicBindings[0].reactiveRefs.has("count")).toBe(true);
    expect(r.logicBindings[0].reactiveRefs.has("total")).toBe(true);
  });

  test("conditional display binding preserves isConditionalDisplay and varName", () => {
    const r = new BindingRegistry();
    r.addLogicBinding({
      placeholderId: "p1",
      expr: "@visible",
      isConditionalDisplay: true,
      varName: "visible",
    });
    expect(r.logicBindings[0].isConditionalDisplay).toBe(true);
    expect(r.logicBindings[0].varName).toBe("visible");
  });
});

// ---------------------------------------------------------------------------
// §4  Event bindings — shape validation
// ---------------------------------------------------------------------------

describe("BindingRegistry — event binding shape", () => {
  test("event binding has all required fields", () => {
    const r = new BindingRegistry();
    r.addEventBinding({
      placeholderId: "id1",
      eventName: "onclick",
      handlerName: "handler",
      handlerArgs: ["arg1"],
    });
    const b = r.eventBindings[0];
    expect(b).toHaveProperty("placeholderId");
    expect(b).toHaveProperty("eventName");
    expect(b).toHaveProperty("handlerName");
    expect(b).toHaveProperty("handlerArgs");
  });
});

// ---------------------------------------------------------------------------
// §5  Logic bindings — conditional display and reactive refs
// ---------------------------------------------------------------------------

describe("BindingRegistry — logic binding variants", () => {
  test("logic binding without reactiveRefs defaults to undefined", () => {
    const r = new BindingRegistry();
    r.addLogicBinding({ placeholderId: "p1", expr: "@x" });
    expect(r.logicBindings[0].reactiveRefs).toBeUndefined();
  });

  test("logic binding without isConditionalDisplay defaults to undefined", () => {
    const r = new BindingRegistry();
    r.addLogicBinding({ placeholderId: "p1", expr: "@x" });
    expect(r.logicBindings[0].isConditionalDisplay).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §6  Multiple bindings — ordering preserved
// ---------------------------------------------------------------------------

describe("BindingRegistry — mixed bindings ordering", () => {
  test("event and logic bindings are independent", () => {
    const r = new BindingRegistry();
    r.addEventBinding({ placeholderId: "e1", eventName: "onclick", handlerName: "fn", handlerArgs: [] });
    r.addLogicBinding({ placeholderId: "l1", expr: "@x" });
    r.addEventBinding({ placeholderId: "e2", eventName: "onchange", handlerName: "fn2", handlerArgs: [] });
    r.addLogicBinding({ placeholderId: "l2", expr: "@y" });

    expect(r.eventBindings).toHaveLength(2);
    expect(r.logicBindings).toHaveLength(2);
    expect(r.eventBindings[0].placeholderId).toBe("e1");
    expect(r.eventBindings[1].placeholderId).toBe("e2");
    expect(r.logicBindings[0].placeholderId).toBe("l1");
    expect(r.logicBindings[1].placeholderId).toBe("l2");
  });
});
