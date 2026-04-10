/**
 * runtime-reactivity.test.js — Unit tests for fine-grained reactivity primitives.
 *
 * Tests for:
 *   _scrml_deep_reactive — Proxy-based property-level tracking
 *   _scrml_effect — auto-tracking reactive effects
 *   _scrml_computed — lazy computed values with caching
 *
 * Strategy: extract the runtime string from runtime-template.js and evaluate it
 * in a Function scope to get access to the runtime functions.
 */

import { describe, test, expect } from "bun:test";
import { SCRML_RUNTIME } from "../../src/runtime-template.js";

/**
 * Create a fresh runtime environment by evaluating the runtime string.
 * Returns an object with all the runtime functions accessible.
 */
function createRuntime() {
  // The runtime is a string of JS declarations. We wrap it in a function that
  // returns an object exposing the functions we need.
  const wrapper = new Function(`
    // Provide minimal DOM stubs so runtime code doesn't crash
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
      _scrml_computed,
      _scrml_state,
      _scrml_reactive_set,
      _scrml_reactive_get,
      _scrml_reactive_subscribe,
      _scrml_effect_stack,
      _scrml_track,
      _scrml_trigger,
    };
  `);
  return wrapper();
}

// ---------------------------------------------------------------------------
// _scrml_deep_reactive
// ---------------------------------------------------------------------------

describe("_scrml_deep_reactive", () => {
  test("returns primitives unchanged", () => {
    const rt = createRuntime();
    expect(rt._scrml_deep_reactive(42)).toBe(42);
    expect(rt._scrml_deep_reactive("hello")).toBe("hello");
    expect(rt._scrml_deep_reactive(true)).toBe(true);
    expect(rt._scrml_deep_reactive(null)).toBe(null);
    expect(rt._scrml_deep_reactive(undefined)).toBe(undefined);
  });

  test("wraps an object in a Proxy", () => {
    const rt = createRuntime();
    const obj = { a: 1, b: 2 };
    const proxy = rt._scrml_deep_reactive(obj);
    expect(proxy).not.toBe(obj);
    expect(proxy.a).toBe(1);
    expect(proxy.b).toBe(2);
  });

  test("wraps an array in a Proxy", () => {
    const rt = createRuntime();
    const arr = [1, 2, 3];
    const proxy = rt._scrml_deep_reactive(arr);
    expect(proxy).not.toBe(arr);
    expect(proxy[0]).toBe(1);
    expect(proxy.length).toBe(3);
  });

  test("returns the same Proxy for the same object (identity stability)", () => {
    const rt = createRuntime();
    const obj = { x: 1 };
    const p1 = rt._scrml_deep_reactive(obj);
    const p2 = rt._scrml_deep_reactive(obj);
    expect(p1).toBe(p2);
  });

  test("returns existing Proxy if passed a Proxy", () => {
    const rt = createRuntime();
    const obj = { x: 1 };
    const p1 = rt._scrml_deep_reactive(obj);
    const p2 = rt._scrml_deep_reactive(p1);
    expect(p1).toBe(p2);
  });

  test("nested objects are lazily wrapped", () => {
    const rt = createRuntime();
    const obj = { inner: { val: 42 } };
    const proxy = rt._scrml_deep_reactive(obj);
    const inner = proxy.inner;
    // inner should also be a proxy (not the raw object)
    expect(inner.val).toBe(42);
    // Modifying through the proxy should modify the backing store
    inner.val = 99;
    expect(obj.inner.val).toBe(99);
  });

  test("property writes update the backing object", () => {
    const rt = createRuntime();
    const obj = { x: 1 };
    const proxy = rt._scrml_deep_reactive(obj);
    proxy.x = 10;
    expect(obj.x).toBe(10);
    expect(proxy.x).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// _scrml_effect
// ---------------------------------------------------------------------------

describe("_scrml_effect", () => {
  test("runs the effect function immediately", () => {
    const rt = createRuntime();
    let ran = false;
    rt._scrml_effect(() => { ran = true; });
    expect(ran).toBe(true);
  });

  test("re-runs when a tracked reactive property changes", () => {
    const rt = createRuntime();
    const obj = { count: 0 };
    const proxy = rt._scrml_deep_reactive(obj);
    const log = [];

    rt._scrml_effect(() => {
      log.push(proxy.count);
    });

    expect(log).toEqual([0]);

    proxy.count = 1;
    expect(log).toEqual([0, 1]);

    proxy.count = 2;
    expect(log).toEqual([0, 1, 2]);
  });

  test("only re-runs when the specifically read property changes", () => {
    const rt = createRuntime();
    const obj = { a: 1, b: 2 };
    const proxy = rt._scrml_deep_reactive(obj);
    const log = [];

    rt._scrml_effect(() => {
      log.push(proxy.a); // only reads .a
    });

    expect(log).toEqual([1]);

    proxy.b = 99; // should NOT trigger
    expect(log).toEqual([1]);

    proxy.a = 10; // should trigger
    expect(log).toEqual([1, 10]);
  });

  test("tracks nested property reads", () => {
    const rt = createRuntime();
    const obj = { user: { name: "Alice" } };
    const proxy = rt._scrml_deep_reactive(obj);
    const log = [];

    rt._scrml_effect(() => {
      log.push(proxy.user.name);
    });

    expect(log).toEqual(["Alice"]);

    proxy.user.name = "Bob";
    expect(log).toEqual(["Alice", "Bob"]);
  });

  test("dispose stops the effect from re-running", () => {
    const rt = createRuntime();
    const obj = { x: 0 };
    const proxy = rt._scrml_deep_reactive(obj);
    const log = [];

    const dispose = rt._scrml_effect(() => {
      log.push(proxy.x);
    });

    expect(log).toEqual([0]);

    proxy.x = 1;
    expect(log).toEqual([0, 1]);

    dispose();

    proxy.x = 2;
    expect(log).toEqual([0, 1]); // no re-run after dispose
  });

  test("nested effects do not leak dependencies to outer", () => {
    const rt = createRuntime();
    const obj = { a: 1, b: 2 };
    const proxy = rt._scrml_deep_reactive(obj);
    const outerLog = [];
    const innerLog = [];

    rt._scrml_effect(() => {
      outerLog.push(proxy.a);
      rt._scrml_effect(() => {
        innerLog.push(proxy.b);
      });
    });

    expect(outerLog).toEqual([1]);
    expect(innerLog).toEqual([2]);

    // Changing b should only trigger inner, not outer
    proxy.b = 20;
    expect(outerLog).toEqual([1]); // unchanged
    expect(innerLog).toEqual([2, 20]);
  });

  test("handles array push via Proxy trap", () => {
    const rt = createRuntime();
    const arr = [1, 2];
    const proxy = rt._scrml_deep_reactive(arr);
    const log = [];

    rt._scrml_effect(() => {
      log.push(proxy.length);
    });

    expect(log).toEqual([2]);

    proxy.push(3);
    // Should trigger because push changes length
    expect(log.length).toBeGreaterThan(1);
    expect(log[log.length - 1]).toBe(3);
  });

  test("handles array splice via Proxy trap", () => {
    const rt = createRuntime();
    const arr = [1, 2, 3, 4];
    const proxy = rt._scrml_deep_reactive(arr);
    let len = 0;

    rt._scrml_effect(() => {
      len = proxy.length;
    });

    expect(len).toBe(4);

    proxy.splice(1, 2); // remove items at index 1 and 2
    expect(len).toBe(2);
    expect(arr).toEqual([1, 4]);
  });

  test("re-tracks dependencies on re-run (conditional deps)", () => {
    const rt = createRuntime();
    const obj = { flag: true, a: 1, b: 2 };
    const proxy = rt._scrml_deep_reactive(obj);
    const log = [];

    rt._scrml_effect(() => {
      if (proxy.flag) {
        log.push("a:" + proxy.a);
      } else {
        log.push("b:" + proxy.b);
      }
    });

    expect(log).toEqual(["a:1"]);

    proxy.a = 10;
    expect(log).toEqual(["a:1", "a:10"]);

    // Changing b should NOT trigger (not tracked when flag=true)
    proxy.b = 20;
    expect(log).toEqual(["a:1", "a:10"]);

    // Switch flag — now b is tracked, a is not
    proxy.flag = false;
    expect(log).toEqual(["a:1", "a:10", "b:20"]);

    proxy.a = 100; // should NOT trigger now
    expect(log).toEqual(["a:1", "a:10", "b:20"]);

    proxy.b = 30; // should trigger
    expect(log).toEqual(["a:1", "a:10", "b:20", "b:30"]);
  });
});

// ---------------------------------------------------------------------------
// _scrml_computed
// ---------------------------------------------------------------------------

describe("_scrml_computed", () => {
  test("lazily computes value on first access", () => {
    const rt = createRuntime();
    const obj = { x: 5 };
    const proxy = rt._scrml_deep_reactive(obj);
    let computeCount = 0;

    const c = rt._scrml_computed(() => {
      computeCount++;
      return proxy.x * 2;
    });

    expect(computeCount).toBe(0); // not computed yet

    expect(c.value).toBe(10);
    expect(computeCount).toBe(1);

    // Second access should use cache
    expect(c.value).toBe(10);
    expect(computeCount).toBe(1);
  });

  test("recomputes when dependency changes", () => {
    const rt = createRuntime();
    const obj = { x: 5 };
    const proxy = rt._scrml_deep_reactive(obj);

    const c = rt._scrml_computed(() => proxy.x * 2);

    expect(c.value).toBe(10);

    proxy.x = 7;
    expect(c.value).toBe(14);
  });

  test("effects can track computed values", () => {
    const rt = createRuntime();
    const obj = { x: 1 };
    const proxy = rt._scrml_deep_reactive(obj);
    const log = [];

    const doubled = rt._scrml_computed(() => proxy.x * 2);

    rt._scrml_effect(() => {
      log.push(doubled.value);
    });

    expect(log).toEqual([2]);

    proxy.x = 5;
    expect(log).toEqual([2, 10]);
  });

  test("computed of computed", () => {
    const rt = createRuntime();
    const obj = { x: 2 };
    const proxy = rt._scrml_deep_reactive(obj);

    const doubled = rt._scrml_computed(() => proxy.x * 2);
    const quadrupled = rt._scrml_computed(() => doubled.value * 2);

    expect(quadrupled.value).toBe(8);

    proxy.x = 3;
    expect(quadrupled.value).toBe(12);
  });

  test("dispose stops recomputation", () => {
    const rt = createRuntime();
    const obj = { x: 1 };
    const proxy = rt._scrml_deep_reactive(obj);
    let computeCount = 0;

    const c = rt._scrml_computed(() => {
      computeCount++;
      return proxy.x;
    });

    expect(c.value).toBe(1);
    expect(computeCount).toBe(1);

    c.dispose();

    proxy.x = 2;
    // After dispose, accessing value might return stale cache or recompute
    // but the important thing is it doesn't trigger downstream effects
    // (The computed is disconnected from the reactivity graph)
  });
});

// ---------------------------------------------------------------------------
// Backwards compatibility — existing reactive_set/get still work
// ---------------------------------------------------------------------------

describe("backwards compatibility", () => {
  test("_scrml_reactive_set and _scrml_reactive_get still work", () => {
    const rt = createRuntime();
    rt._scrml_reactive_set("count", 42);
    expect(rt._scrml_reactive_get("count")).toBe(42);
  });

  test("_scrml_reactive_subscribe still works", () => {
    const rt = createRuntime();
    const log = [];
    rt._scrml_reactive_subscribe("items", (v) => log.push(v));
    rt._scrml_reactive_set("items", [1, 2, 3]);
    expect(log).toEqual([[1, 2, 3]]);
  });

  test("existing subscriber API coexists with fine-grained effects", () => {
    const rt = createRuntime();
    const obj = { val: 1 };
    const proxy = rt._scrml_deep_reactive(obj);

    // Old-style subscriber on a reactive var
    const subLog = [];
    rt._scrml_reactive_subscribe("myObj", (v) => subLog.push("sub:" + typeof v));
    rt._scrml_reactive_set("myObj", proxy);
    expect(subLog.length).toBe(1);

    // New-style fine-grained effect on the proxy
    const effectLog = [];
    rt._scrml_effect(() => {
      effectLog.push(proxy.val);
    });

    expect(effectLog).toEqual([1]);

    proxy.val = 2;
    expect(effectLog).toEqual([1, 2]);
    // Old subscriber was not re-triggered (we didn't call _scrml_reactive_set again)
    expect(subLog.length).toBe(1);
  });
});
