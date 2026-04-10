/**
 * Chart Utilities — Unit Tests
 *
 * Tests for src/chart-utils.js (Layer 1 SVG chart helpers).
 *
 * Coverage:
 *   linearScale    — domain-to-range mapping, zero-span domain, identity
 *   timeScale      — Date-based mapping
 *   computeAxis    — tick generation from scale + domain
 *   pathFromPoints — SVG path "d" string generation
 *   barLayout      — bar chart rectangle computation
 *   pieLayout      — pie chart arc path computation
 */

import { describe, test, expect } from "bun:test";
import {
  linearScale,
  timeScale,
  computeAxis,
  pathFromPoints,
  barLayout,
  pieLayout,
} from "../../src/chart-utils.js";

// ---------------------------------------------------------------------------
// linearScale
// ---------------------------------------------------------------------------

describe("linearScale", () => {
  test("maps domain to range linearly", () => {
    const scale = linearScale([0, 100], [0, 800]);
    expect(scale(0)).toBe(0);
    expect(scale(100)).toBe(800);
    expect(scale(50)).toBe(400);
    expect(scale(25)).toBe(200);
  });

  test("handles inverted range", () => {
    const scale = linearScale([0, 100], [800, 0]);
    expect(scale(0)).toBe(800);
    expect(scale(100)).toBe(0);
    expect(scale(50)).toBe(400);
  });

  test("handles non-zero domain start", () => {
    const scale = linearScale([10, 20], [0, 100]);
    expect(scale(10)).toBe(0);
    expect(scale(20)).toBe(100);
    expect(scale(15)).toBe(50);
  });

  test("zero-span domain returns range start", () => {
    const scale = linearScale([5, 5], [0, 100]);
    expect(scale(5)).toBe(0);
    expect(scale(10)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// timeScale
// ---------------------------------------------------------------------------

describe("timeScale", () => {
  test("maps dates to range", () => {
    const start = new Date("2024-01-01").getTime();
    const end = new Date("2024-12-31").getTime();
    const scale = timeScale([start, end], [0, 800]);

    expect(scale(start)).toBe(0);
    expect(scale(end)).toBe(800);
  });

  test("accepts Date objects", () => {
    const scale = timeScale(
      [new Date("2024-01-01"), new Date("2024-12-31")],
      [0, 100]
    );
    expect(scale(new Date("2024-01-01"))).toBe(0);
    expect(scale(new Date("2024-12-31"))).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// computeAxis
// ---------------------------------------------------------------------------

describe("computeAxis", () => {
  test("generates tick positions and labels", () => {
    const scale = linearScale([0, 100], [0, 800]);
    const axis = computeAxis(scale, 4, [0, 100]);

    expect(axis.labels).toHaveLength(5); // 4 intervals = 5 tick marks
    expect(axis.labels[0]).toBe("0");
    expect(axis.labels[4]).toBe("100");
    expect(axis.positions[0]).toBe(0);
    expect(axis.positions[4]).toBe(800);
  });

  test("accepts explicit tick values", () => {
    const scale = linearScale([0, 100], [0, 800]);
    const axis = computeAxis(scale, [0, 50, 100]);

    expect(axis.labels).toEqual(["0", "50", "100"]);
    expect(axis.positions).toEqual([0, 400, 800]);
  });

  test("returns empty for no domain and numeric ticks", () => {
    const scale = linearScale([0, 100], [0, 800]);
    const axis = computeAxis(scale, 5);
    expect(axis.labels).toEqual([]);
    expect(axis.positions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// pathFromPoints
// ---------------------------------------------------------------------------

describe("pathFromPoints", () => {
  test("generates SVG path d attribute", () => {
    const d = pathFromPoints([[0, 100], [50, 80], [100, 60]]);
    expect(d).toBe("M 0 100 L 50 80 L 100 60");
  });

  test("generates closed path", () => {
    const d = pathFromPoints([[0, 0], [100, 0], [50, 100]], { closed: true });
    expect(d).toBe("M 0 0 L 100 0 L 50 100 Z");
  });

  test("empty points returns empty string", () => {
    expect(pathFromPoints([])).toBe("");
    expect(pathFromPoints(null)).toBe("");
  });

  test("single point returns M command only", () => {
    expect(pathFromPoints([[10, 20]])).toBe("M 10 20");
  });
});

// ---------------------------------------------------------------------------
// barLayout
// ---------------------------------------------------------------------------

describe("barLayout", () => {
  test("generates bar rectangles", () => {
    const bars = barLayout([10, 20, 30], 300, 200);
    expect(bars).toHaveLength(3);

    // Each bar has x, y, width, height, value
    for (const bar of bars) {
      expect(typeof bar.x).toBe("number");
      expect(typeof bar.y).toBe("number");
      expect(typeof bar.width).toBe("number");
      expect(typeof bar.height).toBe("number");
      expect(typeof bar.value).toBe("number");
    }
  });

  test("tallest bar reaches top", () => {
    const bars = barLayout([10, 20, 30], 300, 200);
    const tallest = bars.find(b => b.value === 30);
    expect(tallest.y).toBe(0);
    expect(tallest.height).toBe(200);
  });

  test("empty data returns empty array", () => {
    expect(barLayout([], 300, 200)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// pieLayout
// ---------------------------------------------------------------------------

describe("pieLayout", () => {
  test("generates arc paths", () => {
    const arcs = pieLayout([25, 25, 50], 100, 100, 80);
    expect(arcs).toHaveLength(3);

    for (const arc of arcs) {
      expect(typeof arc.d).toBe("string");
      expect(arc.d.length).toBeGreaterThan(0);
      expect(typeof arc.value).toBe("number");
      expect(typeof arc.percentage).toBe("number");
    }
  });

  test("percentages sum to 1", () => {
    const arcs = pieLayout([10, 20, 30, 40], 100, 100, 50);
    const totalPercentage = arcs.reduce((s, a) => s + a.percentage, 0);
    expect(Math.abs(totalPercentage - 1)).toBeLessThan(0.001);
  });

  test("single value gets full circle", () => {
    const arcs = pieLayout([100], 100, 100, 50);
    expect(arcs).toHaveLength(1);
    expect(arcs[0].percentage).toBe(1);
  });

  test("empty data returns empty array", () => {
    expect(pieLayout([], 100, 100, 50)).toEqual([]);
  });

  test("all-zero data returns zero percentages", () => {
    const arcs = pieLayout([0, 0, 0], 100, 100, 50);
    for (const arc of arcs) {
      expect(arc.percentage).toBe(0);
    }
  });
});
