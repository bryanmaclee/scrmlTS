/**
 * bug-k-sync-effect-throw.test.js — Regression tests for Bug K.
 *
 * Bug K: when a synchronous reactive effect throws an error, it halts the
 * calling function instead of being caught. Subsequent reactive writes in
 * the same function are silently dropped.
 *
 * Root cause: _scrml_trigger() called effect() without try/catch.
 * Fix: wrap each effect() in try/catch in _scrml_trigger, matching the
 * existing pattern for subscribers in _scrml_reactive_set.
 */

import { describe, test, expect } from "bun:test";
import { SCRML_RUNTIME } from "../../src/runtime-template.js";

function createRuntime() {
  const wrapper = new Function(`
    const document = { querySelector: () => null, createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, innerHTML: "" }), head: { appendChild: () => {} }, body: { appendChild: () => {} }, addEventListener: () => {}, removeEventListener: () => {} };
    const window = { addEventListener: () => {} };
    const requestAnimationFrame = (fn) => 0;
    const cancelAnimationFrame = () => {};
    const navigator = { getGamepads: () => [] };
    const setInterval = globalThis.setInterval;
    const clearInterval = globalThis.clearInterval;
    const setTimeout = globalThis.setTimeout;
    const clearTimeout = globalThis.clearTimeout;

    ${SCRML_RUNTIME}

    return {
      _scrml_deep_reactive,
      _scrml_effect,
      _scrml_state,
      _scrml_reactive_set,
      _scrml_reactive_get,
      _scrml_trigger,
      _scrml_reactive_subscribe,
    };
  `);
  return wrapper();
}

describe("Bug K: sync effect throw does not halt caller", () => {
  test("throwing effect does not prevent subsequent reactive writes", () => {
    const rt = createRuntime();

    // Set up initial state
    rt._scrml_reactive_set("a", 0);
    rt._scrml_reactive_set("b", 10);
    rt._scrml_reactive_set("c", "init");

    // Register an effect that throws when @a < 0 (simulates the reproducer)
    rt._scrml_effect(() => {
      const val = rt._scrml_reactive_get("a");
      if (val < 0) {
        // This simulates: ${@a < 0 ? null.bogus : "ok"}
        throw new TypeError("Cannot read properties of null");
      }
    });

    // Simulate twoOfThreeWrites() — all three writes must complete
    rt._scrml_reactive_set("a", -1);  // triggers the throwing effect
    rt._scrml_reactive_set("b", 20);
    rt._scrml_reactive_set("c", "done");

    // All three reactive variables must have their updated values
    expect(rt._scrml_reactive_get("a")).toBe(-1);
    expect(rt._scrml_reactive_get("b")).toBe(20);
    expect(rt._scrml_reactive_get("c")).toBe("done");
  });

  test("throwing effect still allows other effects on same variable to run", () => {
    const rt = createRuntime();

    rt._scrml_reactive_set("x", 0);

    const log = [];

    // Effect 1: throws when x > 5
    rt._scrml_effect(() => {
      const val = rt._scrml_reactive_get("x");
      if (val > 5) throw new Error("boom");
      log.push("effect1:" + val);
    });

    // Effect 2: should always run, even after effect 1 throws
    rt._scrml_effect(() => {
      log.push("effect2:" + rt._scrml_reactive_get("x"));
    });

    // Initial run: both effects fire normally
    expect(log).toEqual(["effect1:0", "effect2:0"]);

    // Set x = 10: effect 1 throws, but effect 2 must still run
    log.length = 0;
    rt._scrml_reactive_set("x", 10);
    // effect1 throws so doesn't push, but effect2 must push
    expect(log).toEqual(["effect2:10"]);
  });

  test("caller function completes despite throwing effect (exact reproducer pattern)", () => {
    const rt = createRuntime();

    rt._scrml_reactive_set("a", 0);
    rt._scrml_reactive_set("b", 10);
    rt._scrml_reactive_set("c", "init");

    // Wire up a display effect that reads @a and throws conditionally
    // (mirrors: <p>throws-when-a-neg: ${@a < 0 ? null.bogus : "ok"}</p>)
    let displayValue = "ok";
    rt._scrml_effect(() => {
      const a = rt._scrml_reactive_get("a");
      if (a < 0) {
        // Accessing null.bogus throws TypeError
        displayValue = null.bogus;
      } else {
        displayValue = "ok";
      }
    });

    // The caller function (like twoOfThreeWrites)
    function twoOfThreeWrites() {
      rt._scrml_reactive_set("a", -1);
      rt._scrml_reactive_set("b", 20);
      rt._scrml_reactive_set("c", "done");
    }

    // Must not throw — the effect's error is caught internally
    expect(() => twoOfThreeWrites()).not.toThrow();

    expect(rt._scrml_reactive_get("a")).toBe(-1);
    expect(rt._scrml_reactive_get("b")).toBe(20);
    expect(rt._scrml_reactive_get("c")).toBe("done");
  });

  test("subscriber try/catch still works (pre-existing behavior)", () => {
    const rt = createRuntime();

    rt._scrml_reactive_set("s", 0);

    // Subscribe with a throwing subscriber
    rt._scrml_reactive_subscribe("s", () => {
      throw new Error("subscriber boom");
    });

    // Must not throw — subscribers already had try/catch before Bug K fix
    expect(() => rt._scrml_reactive_set("s", 1)).not.toThrow();
    expect(rt._scrml_reactive_get("s")).toBe(1);
  });

  test("deep reactive proxy: throwing effect does not halt proxy writes", () => {
    const rt = createRuntime();

    const obj = rt._scrml_deep_reactive({ count: 0, label: "init" });

    // Effect that throws when count is negative
    rt._scrml_effect(() => {
      if (obj.count < 0) throw new Error("negative count");
    });

    // Writing a negative count triggers the throwing effect,
    // but subsequent writes must still work
    obj.count = -1;
    obj.label = "updated";

    expect(obj.count).toBe(-1);
    expect(obj.label).toBe("updated");
  });
});
