/**
 * reconcile-list-same-keys-fast-path.test.js — Unit tests for the B2
 * same-keys-in-same-order fast-path in `_scrml_reconcile_list`.
 *
 * Phase 3.B Candidate B2 (S106) — `docs/changes/runtime-perf-phase-3-partial-update-and-swap/SCOPING.md` §3.1.
 *
 * Hypothesis: when in-place mutations (e.g., toggling `.completed` on rows) leave
 * the keyed sequence unchanged, the keyed-list reconciler must skip the LIS
 * pipeline and DOM moves entirely. The fast-path bails BEFORE the newKeys/LIS
 * computation; per-row effects fire separately via _scrml_prop_subscribers.
 *
 * Tests:
 *   §1  Same keys in same order — zero insertBefore calls; nodes preserved by identity
 *   §2  Same keys reordered (swap-rows) — fast-path bails; LIS path runs; insertBefore fires
 *   §3  Count mismatch (item appended) — fast-path bails (length differs); LIS path runs
 *   §4  Count mismatch (item removed) — fast-path bails (length differs); LIS path runs
 *   §5  Same count, different key set — fast-path bails on first key mismatch
 *   §6  Empty newItems — existing empty fast-path (line 1240) still wins; B2 not entered
 *   §7  Bulk create from empty — existing bulk-create fast-path (line 1271) still wins; B2 not entered
 *   §8  keyFn invocation count — B2 makes one keyFn call per item until first mismatch, mirroring LIS path's pre-call walk
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { SCRML_RUNTIME } from "../../src/runtime-template.js";

/**
 * Evaluate the runtime string in a Function scope; return access to
 * _scrml_reconcile_list and helpers.
 *
 * NOTE: this test relies on happy-dom for real DOM (container.childNodes,
 * container.insertBefore, etc.). GlobalRegistrator must be active.
 */
function createRuntime() {
  const wrapper = new Function(`
    const requestAnimationFrame = (fn) => 0;
    const cancelAnimationFrame = () => {};
    const navigator = { getGamepads: () => [] };
    const setInterval = globalThis.setInterval;
    const clearInterval = globalThis.clearInterval;
    const setTimeout = globalThis.setTimeout;
    const clearTimeout = globalThis.clearTimeout;

    ${SCRML_RUNTIME}

    return {
      _scrml_reconcile_list,
      _scrml_lis,
    };
  `);
  return wrapper();
}

/**
 * Build a container pre-populated with keyed DOM nodes.
 * Returns { container, nodes } where nodes[i]._scrml_key === keys[i].
 */
function makeContainerWithKeyedChildren(keys) {
  const container = document.createElement("ul");
  const nodes = [];
  for (const key of keys) {
    const li = document.createElement("li");
    li._scrml_key = key;
    li.textContent = `item-${key}`;
    container.appendChild(li);
    nodes.push(li);
  }
  return { container, nodes };
}

/**
 * Patch container.insertBefore to count calls; restore on revert().
 */
function spyInsertBefore(container) {
  const original = container.insertBefore.bind(container);
  const spy = { count: 0 };
  container.insertBefore = (node, ref) => {
    spy.count++;
    return original(node, ref);
  };
  spy.revert = () => { container.insertBefore = original; };
  return spy;
}

beforeEach(() => {
  if (!globalThis.document) GlobalRegistrator.register();
});

afterEach(() => {
  if (globalThis.document) GlobalRegistrator.unregister();
});

describe("§1 same keys in same order — fast-path fires; no DOM moves", () => {
  test("5 items, identical order — insertBefore not called", () => {
    const rt = createRuntime();
    const { container, nodes } = makeContainerWithKeyedChildren([1, 2, 3, 4, 5]);
    const newItems = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
    const keyFn = (item) => item.id;
    let createCount = 0;
    const createFn = () => { createCount++; return null; };

    const spy = spyInsertBefore(container);
    rt._scrml_reconcile_list(container, newItems, keyFn, createFn);
    spy.revert();

    expect(spy.count).toBe(0);
    expect(createCount).toBe(0); // no new nodes needed
    // All original nodes preserved by identity
    const finalChildren = Array.from(container.childNodes);
    expect(finalChildren.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(finalChildren[i]).toBe(nodes[i]);
      expect(finalChildren[i]._scrml_key).toBe(i + 1);
    }
  });

  test("1000 items, identical order (canonical partial-update shape)", () => {
    const rt = createRuntime();
    const keys = Array.from({ length: 1000 }, (_, i) => i + 1);
    const { container, nodes } = makeContainerWithKeyedChildren(keys);
    const newItems = keys.map((id) => ({ id }));
    const keyFn = (item) => item.id;

    const spy = spyInsertBefore(container);
    rt._scrml_reconcile_list(container, newItems, keyFn, () => null);
    spy.revert();

    expect(spy.count).toBe(0);
    // First + last node identity preserved (sentinels)
    expect(container.childNodes[0]).toBe(nodes[0]);
    expect(container.childNodes[999]).toBe(nodes[999]);
  });
});

describe("§2 same keys reordered — fast-path bails; LIS runs", () => {
  test("swap-rows-shape: indices 1 and 998 swapped", () => {
    const rt = createRuntime();
    const keys = Array.from({ length: 1000 }, (_, i) => i + 1);
    const { container, nodes } = makeContainerWithKeyedChildren(keys);

    // Swap indices 1 and 998 in newItems
    const newKeys = [...keys];
    [newKeys[1], newKeys[998]] = [newKeys[998], newKeys[1]];
    const newItems = newKeys.map((id) => ({ id }));
    const keyFn = (item) => item.id;

    const spy = spyInsertBefore(container);
    rt._scrml_reconcile_list(container, newItems, keyFn, () => {
      throw new Error("createFn should not be called — all keys already in oldNodes");
    });
    spy.revert();

    // LIS path ran — exactly the 2 swapped nodes should have moved
    expect(spy.count).toBeGreaterThan(0);
    expect(spy.count).toBeLessThanOrEqual(2);
    // Node at position 1 should now be original nodes[998] (id=999)
    expect(container.childNodes[1]).toBe(nodes[998]);
    expect(container.childNodes[998]).toBe(nodes[1]);
  });

  test("simple 3-item reorder [1,2,3] → [3,1,2]", () => {
    const rt = createRuntime();
    const { container, nodes } = makeContainerWithKeyedChildren([1, 2, 3]);
    const newItems = [{ id: 3 }, { id: 1 }, { id: 2 }];
    const keyFn = (item) => item.id;

    const spy = spyInsertBefore(container);
    rt._scrml_reconcile_list(container, newItems, keyFn, () => {
      throw new Error("createFn should not be called");
    });
    spy.revert();

    expect(spy.count).toBeGreaterThan(0);
    const finalKeys = Array.from(container.childNodes).map((n) => n._scrml_key);
    expect(finalKeys).toEqual([3, 1, 2]);
  });
});

describe("§3 count mismatch (append) — fast-path bails on length check", () => {
  test("3→4 items appended", () => {
    const rt = createRuntime();
    const { container } = makeContainerWithKeyedChildren([1, 2, 3]);
    const newItems = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const keyFn = (item) => item.id;
    let createdId = null;
    const createFn = (item) => {
      createdId = item.id;
      const li = document.createElement("li");
      li.textContent = `item-${item.id}`;
      return li;
    };

    const spy = spyInsertBefore(container);
    rt._scrml_reconcile_list(container, newItems, keyFn, createFn);
    spy.revert();

    expect(createdId).toBe(4); // only the new item was created
    expect(container.childNodes.length).toBe(4);
    expect(spy.count).toBeGreaterThan(0); // LIS path placed the new node
  });
});

describe("§4 count mismatch (remove) — fast-path bails on length check", () => {
  test("3→2 items, middle removed", () => {
    const rt = createRuntime();
    const { container, nodes } = makeContainerWithKeyedChildren([1, 2, 3]);
    const newItems = [{ id: 1 }, { id: 3 }];
    const keyFn = (item) => item.id;

    rt._scrml_reconcile_list(container, newItems, keyFn, () => {
      throw new Error("createFn should not be called");
    });

    expect(container.childNodes.length).toBe(2);
    expect(container.childNodes[0]).toBe(nodes[0]); // id=1 preserved
    expect(container.childNodes[1]).toBe(nodes[2]); // id=3 preserved
  });
});

describe("§5 same count, different keys — fast-path bails on key mismatch", () => {
  test("[1,2,3] → [1,5,3]", () => {
    const rt = createRuntime();
    const { container, nodes } = makeContainerWithKeyedChildren([1, 2, 3]);
    const newItems = [{ id: 1 }, { id: 5 }, { id: 3 }];
    const keyFn = (item) => item.id;
    let createdId = null;
    const createFn = (item) => {
      createdId = item.id;
      const li = document.createElement("li");
      li.textContent = `item-${item.id}`;
      return li;
    };

    rt._scrml_reconcile_list(container, newItems, keyFn, createFn);

    expect(createdId).toBe(5); // id=5 is new
    expect(container.childNodes.length).toBe(3);
    const finalKeys = Array.from(container.childNodes).map((n) => n._scrml_key);
    expect(finalKeys).toEqual([1, 5, 3]);
    // id=1 and id=3 nodes preserved by identity
    expect(container.childNodes[0]).toBe(nodes[0]);
    expect(container.childNodes[2]).toBe(nodes[2]);
  });
});

describe("§6 empty newItems — pre-existing fast-path wins; B2 not entered", () => {
  test("3→0 — replaceChildren called once, B2 not reached", () => {
    const rt = createRuntime();
    const { container } = makeContainerWithKeyedChildren([1, 2, 3]);

    rt._scrml_reconcile_list(container, [], (item) => item.id, () => {
      throw new Error("createFn should not be called");
    });

    expect(container.childNodes.length).toBe(0);
  });
});

describe("§7 bulk create from empty — pre-existing bulk fast-path wins; B2 not entered", () => {
  test("0→3 — appendChild path, NOT the B2 same-order path", () => {
    const rt = createRuntime();
    const container = document.createElement("ul");
    const newItems = [{ id: 1 }, { id: 2 }, { id: 3 }];
    let createCount = 0;
    const createFn = (item) => {
      createCount++;
      const li = document.createElement("li");
      li.textContent = `item-${item.id}`;
      return li;
    };

    rt._scrml_reconcile_list(container, newItems, (item) => item.id, createFn);

    expect(createCount).toBe(3); // bulk-create path created all 3
    expect(container.childNodes.length).toBe(3);
    expect(container.childNodes[0]._scrml_key).toBe(1);
    expect(container.childNodes[2]._scrml_key).toBe(3);
  });
});

describe("§8 keyFn invocation count — Bug 64 (S159): one keyFn pass per reconcile (map build); B2/LIS reuse the precomputed keys", () => {
  test("same-order hit: keyFn called N times total (B2 fast-path), not 2N", () => {
    const rt = createRuntime();
    const { container } = makeContainerWithKeyedChildren([1, 2, 3, 4, 5]);
    const newItems = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
    let keyFnCalls = 0;
    const keyFn = (item) => { keyFnCalls++; return item.id; };

    rt._scrml_reconcile_list(container, newItems, keyFn, () => null);

    // Bug 64 (S159): keyFn is invoked exactly ONCE per item in the up-front
    // key/map build pass (N=5). B2 same-order check reuses the precomputed
    // newKeys[] (no extra keyFn calls) and bails — total 5, not 2N.
    expect(keyFnCalls).toBe(5);
  });

  test("mismatch at position 2: keyFn still called N=5 times (single map-build pass; B2 + LIS reuse the keys)", () => {
    const rt = createRuntime();
    const { container } = makeContainerWithKeyedChildren([1, 2, 3, 4, 5]);
    const newItems = [{ id: 1 }, { id: 2 }, { id: 99 }, { id: 4 }, { id: 5 }];
    let keyFnCalls = 0;
    const keyFn = (item) => { keyFnCalls++; return item.id; };
    const createFn = (item) => {
      const li = document.createElement("li");
      return li;
    };

    rt._scrml_reconcile_list(container, newItems, keyFn, createFn);

    // Bug 64 (S159): keyFn runs ONCE per item in the up-front key/map build
    // pass (N=5). The B2 same-order check reuses newKeys[] and bails at
    // position 2 (no keyFn calls); the LIS path also reuses newKeys[] (no
    // recompute). Total: 5, not the pre-fix 3 (B2) + 5 (LIS) = 8.
    expect(keyFnCalls).toBe(5);
  });
});
