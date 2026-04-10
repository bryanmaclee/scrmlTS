/**
 * Chart Utilities — Layer 1 helper functions for SVG-based data visualization.
 *
 * These are pure functions that generate SVG-ready values. They are designed
 * to work with scrml's for/lift pattern and SVG elements registered in
 * html-elements.js.
 *
 * Layer 1 means these are utility functions, NOT state type constructors.
 * They can be imported and used with for/lift + SVG elements to build charts.
 *
 * Exports:
 *   linearScale(domain, range) → (value) => mappedValue
 *   timeScale(domain, range)   → (date) => mappedValue
 *   computeAxis(scale, ticks)  → { labels: [], positions: [] }
 *   pathFromPoints(points)     → SVG path "d" attribute string
 *   barLayout(data, width, height, opts) → rect[] with x, y, width, height
 *   pieLayout(data, cx, cy, radius)      → arc[] with path "d" strings
 */

// ---------------------------------------------------------------------------
// Linear scale
// ---------------------------------------------------------------------------

/**
 * Create a linear scale function that maps values from a domain to a range.
 *
 * @param {[number, number]} domain — input domain [min, max]
 * @param {[number, number]} range  — output range [min, max]
 * @returns {(value: number) => number} — scale function
 *
 * @example
 *   const xScale = linearScale([0, 100], [0, 800]);
 *   xScale(50); // → 400
 */
export function linearScale(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const dSpan = d1 - d0;
  const rSpan = r1 - r0;

  if (dSpan === 0) return () => r0;

  return function scale(value) {
    return r0 + ((value - d0) / dSpan) * rSpan;
  };
}

// ---------------------------------------------------------------------------
// Time scale
// ---------------------------------------------------------------------------

/**
 * Create a time scale function that maps Date values to a numeric range.
 *
 * @param {[Date|number, Date|number]} domain — input domain [startDate, endDate]
 * @param {[number, number]} range            — output range [min, max]
 * @returns {(date: Date|number) => number}   — scale function
 *
 * @example
 *   const tScale = timeScale([new Date('2024-01-01'), new Date('2024-12-31')], [0, 800]);
 *   tScale(new Date('2024-07-01')); // → ~400
 */
export function timeScale(domain, range) {
  const d0 = typeof domain[0] === "number" ? domain[0] : domain[0].getTime();
  const d1 = typeof domain[1] === "number" ? domain[1] : domain[1].getTime();

  const linear = linearScale([d0, d1], range);

  return function scale(date) {
    const t = typeof date === "number" ? date : date.getTime();
    return linear(t);
  };
}

// ---------------------------------------------------------------------------
// Axis computation
// ---------------------------------------------------------------------------

/**
 * Compute axis tick positions and labels for a scale.
 *
 * @param {function} scale         — a scale function (linearScale or timeScale)
 * @param {number|number[]} ticks  — number of ticks to generate, or explicit tick values
 * @param {[number, number]} [domain] — domain for auto-tick generation
 * @returns {{ labels: string[], positions: number[] }}
 *
 * @example
 *   const xScale = linearScale([0, 100], [0, 800]);
 *   const axis = computeAxis(xScale, 5, [0, 100]);
 *   // axis.labels = ["0", "25", "50", "75", "100"]
 *   // axis.positions = [0, 200, 400, 600, 800]
 */
export function computeAxis(scale, ticks, domain) {
  let tickValues;

  if (Array.isArray(ticks)) {
    tickValues = ticks;
  } else if (domain) {
    const [d0, d1] = domain;
    const n = typeof ticks === "number" ? ticks : 5;
    tickValues = [];
    for (let i = 0; i <= n; i++) {
      tickValues.push(d0 + ((d1 - d0) * i) / n);
    }
  } else {
    return { labels: [], positions: [] };
  }

  const labels = tickValues.map(v => String(Math.round(v * 100) / 100));
  const positions = tickValues.map(v => scale(v));

  return { labels, positions };
}

// ---------------------------------------------------------------------------
// SVG path from points
// ---------------------------------------------------------------------------

/**
 * Generate an SVG path "d" attribute string from an array of [x, y] points.
 *
 * @param {[number, number][]} points — array of [x, y] coordinate pairs
 * @param {object} [opts]
 * @param {boolean} [opts.closed=false] — whether to close the path
 * @returns {string} — SVG path "d" attribute value
 *
 * @example
 *   pathFromPoints([[0, 100], [50, 80], [100, 60]]);
 *   // → "M 0 100 L 50 80 L 100 60"
 */
export function pathFromPoints(points, opts = {}) {
  if (!points || points.length === 0) return "";

  const parts = [];
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    if (i === 0) {
      parts.push(`M ${x} ${y}`);
    } else {
      parts.push(`L ${x} ${y}`);
    }
  }

  if (opts.closed) {
    parts.push("Z");
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Bar layout
// ---------------------------------------------------------------------------

/**
 * Compute rectangle positions for a bar chart.
 *
 * @param {number[]} data    — data values
 * @param {number} width     — total chart width
 * @param {number} height    — total chart height
 * @param {object} [opts]
 * @param {number} [opts.padding=0.1] — padding ratio between bars (0-1)
 * @param {number} [opts.minValue=0]  — minimum value for y-axis
 * @returns {{ x: number, y: number, width: number, height: number, value: number }[]}
 */
export function barLayout(data, width, height, opts = {}) {
  if (!data || data.length === 0) return [];

  const padding = opts.padding ?? 0.1;
  const minValue = opts.minValue ?? 0;
  const maxValue = Math.max(...data, minValue);
  const barWidth = (width / data.length) * (1 - padding);
  const gap = (width / data.length) * padding;
  const yScale = linearScale([minValue, maxValue], [height, 0]);

  return data.map((value, i) => {
    const x = i * (barWidth + gap) + gap / 2;
    const barHeight = height - yScale(value);
    return {
      x,
      y: yScale(value),
      width: barWidth,
      height: barHeight,
      value,
    };
  });
}

// ---------------------------------------------------------------------------
// Pie layout
// ---------------------------------------------------------------------------

/**
 * Compute SVG arc path strings for a pie chart.
 *
 * @param {number[]} data   — data values (proportions computed automatically)
 * @param {number} cx       — center x
 * @param {number} cy       — center y
 * @param {number} radius   — radius
 * @returns {{ d: string, value: number, percentage: number }[]}
 */
export function pieLayout(data, cx, cy, radius) {
  if (!data || data.length === 0) return [];

  const total = data.reduce((sum, v) => sum + v, 0);
  if (total === 0) return data.map(() => ({ d: "", value: 0, percentage: 0 }));

  const arcs = [];
  let startAngle = -Math.PI / 2; // start from top

  for (const value of data) {
    const percentage = value / total;
    const endAngle = startAngle + percentage * 2 * Math.PI;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const largeArc = percentage > 0.5 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    arcs.push({ d, value, percentage });
    startAngle = endAngle;
  }

  return arcs;
}
