/**
 * Tailwind Utility Classes — embedded registry for the scrml compiler.
 *
 * Per SPEC section 25, the scrml compiler embeds Tailwind utility definitions
 * and emits only the CSS rules for classes actually used. No Tailwind CLI,
 * PostCSS, or purge step is required.
 *
 * Exports:
 *   getTailwindCSS(className)            — returns CSS rule string or null
 *   getAllUsedCSS(classNames[])          — returns combined CSS string for all matched classes
 *   scanClassesFromHtml(html)            — extracts all class names from HTML class="" attributes
 *   findUnsupportedTailwindShapes(src)   — returns W-TAILWIND-001 diagnostics for class strings
 *                                          that look like Tailwind variant/arbitrary syntax
 *                                          (SPEC §26.3, SPEC-ISSUE-012). The full variant +
 *                                          arbitrary-value system is not yet supported, so the
 *                                          warning fires on shape regardless of whether the
 *                                          embedded engine has incidental partial support.
 */

// ---------------------------------------------------------------------------
// Tailwind spacing scale (shared by padding, margin, gap, etc.)
// ---------------------------------------------------------------------------

const SPACING_SCALE = {
  "0": "0px",
  "px": "1px",
  "0.5": "0.125rem",
  "1": "0.25rem",
  "1.5": "0.375rem",
  "2": "0.5rem",
  "2.5": "0.625rem",
  "3": "0.75rem",
  "3.5": "0.875rem",
  "4": "1rem",
  "5": "1.25rem",
  "6": "1.5rem",
  "7": "1.75rem",
  "8": "2rem",
  "9": "2.25rem",
  "10": "2.5rem",
  "11": "2.75rem",
  "12": "3rem",
  "14": "3.5rem",
  "16": "4rem",
  "20": "5rem",
  "24": "6rem",
  "28": "7rem",
  "32": "8rem",
  "36": "9rem",
  "40": "10rem",
  "44": "11rem",
  "48": "12rem",
  "52": "13rem",
  "56": "14rem",
  "60": "15rem",
  "64": "16rem",
  "72": "18rem",
  "80": "20rem",
  "96": "24rem",
};

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

const COLOR_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const COLOR_PALETTE = {
  slate:   { 50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0", 300: "#cbd5e1", 400: "#94a3b8", 500: "#64748b", 600: "#475569", 700: "#334155", 800: "#1e293b", 900: "#0f172a", 950: "#020617" },
  gray:    { 50: "#f9fafb", 100: "#f3f4f6", 200: "#e5e7eb", 300: "#d1d5db", 400: "#9ca3af", 500: "#6b7280", 600: "#4b5563", 700: "#374151", 800: "#1f2937", 900: "#111827", 950: "#030712" },
  red:     { 50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca", 300: "#fca5a5", 400: "#f87171", 500: "#ef4444", 600: "#dc2626", 700: "#b91c1c", 800: "#991b1b", 900: "#7f1d1d", 950: "#450a0a" },
  orange:  { 50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa", 300: "#fdba74", 400: "#fb923c", 500: "#f97316", 600: "#ea580c", 700: "#c2410c", 800: "#9a3412", 900: "#7c2d12", 950: "#431407" },
  amber:   { 50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309", 800: "#92400e", 900: "#78350f", 950: "#451a03" },
  yellow:  { 50: "#fefce8", 100: "#fef9c3", 200: "#fef08a", 300: "#fde047", 400: "#facc15", 500: "#eab308", 600: "#ca8a04", 700: "#a16207", 800: "#854d0e", 900: "#713f12", 950: "#422006" },
  green:   { 50: "#f0fdf4", 100: "#dcfce7", 200: "#bbf7d0", 300: "#86efac", 400: "#4ade80", 500: "#22c55e", 600: "#16a34a", 700: "#15803d", 800: "#166534", 900: "#14532d", 950: "#052e16" },
  emerald: { 50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7", 400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857", 800: "#065f46", 900: "#064e3b", 950: "#022c22" },
  teal:    { 50: "#f0fdfa", 100: "#ccfbf1", 200: "#99f6e4", 300: "#5eead4", 400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488", 700: "#0f766e", 800: "#115e59", 900: "#134e4a", 950: "#042f2e" },
  cyan:    { 50: "#ecfeff", 100: "#cffafe", 200: "#a5f3fc", 300: "#67e8f9", 400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2", 700: "#0e7490", 800: "#155e75", 900: "#164e63", 950: "#083344" },
  sky:     { 50: "#f0f9ff", 100: "#e0f2fe", 200: "#bae6fd", 300: "#7dd3fc", 400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7", 700: "#0369a1", 800: "#075985", 900: "#0c4a6e", 950: "#082f49" },
  blue:    { 50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8", 800: "#1e40af", 900: "#1e3a8a", 950: "#172554" },
  indigo:  { 50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 800: "#3730a3", 900: "#312e81", 950: "#1e1b4b" },
  violet:  { 50: "#f5f3ff", 100: "#ede9fe", 200: "#ddd6fe", 300: "#c4b5fd", 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed", 700: "#6d28d9", 800: "#5b21b6", 900: "#4c1d95", 950: "#2e1065" },
  purple:  { 50: "#faf5ff", 100: "#f3e8ff", 200: "#e9d5ff", 300: "#d8b4fe", 400: "#c084fc", 500: "#a855f7", 600: "#9333ea", 700: "#7e22ce", 800: "#6b21a8", 900: "#581c87", 950: "#3b0764" },
  fuchsia: { 50: "#fdf4ff", 100: "#fae8ff", 200: "#f5d0fe", 300: "#f0abfc", 400: "#e879f9", 500: "#d946ef", 600: "#c026d3", 700: "#a21caf", 800: "#86198f", 900: "#701a75", 950: "#4a044e" },
  pink:    { 50: "#fdf2f8", 100: "#fce7f3", 200: "#fbcfe8", 300: "#f9a8d4", 400: "#f472b6", 500: "#ec4899", 600: "#db2777", 700: "#be185d", 800: "#9d174d", 900: "#831843", 950: "#500724" },
  rose:    { 50: "#fff1f2", 100: "#ffe4e6", 200: "#fecdd3", 300: "#fda4af", 400: "#fb7185", 500: "#f43f5e", 600: "#e11d48", 700: "#be123c", 800: "#9f1239", 900: "#881337", 950: "#4c0519" },
};

// ---------------------------------------------------------------------------
// Static utility registry (built once on import)
// ---------------------------------------------------------------------------

/** @type {Map<string, string>} className -> CSS rule */
const registry = new Map();

// ---------------------------------------------------------------------------
// Spacing utilities: p-*, px-*, py-*, pt/pr/pb/pl-*, m-*, mx-*, my-*, mt/mr/mb/ml-*
// ---------------------------------------------------------------------------

const PADDING_MAP = {
  "p": "padding",
  "px": ["padding-left", "padding-right"],
  "py": ["padding-top", "padding-bottom"],
  "pt": "padding-top",
  "pr": "padding-right",
  "pb": "padding-bottom",
  "pl": "padding-left",
};

const MARGIN_MAP = {
  "m": "margin",
  "mx": ["margin-left", "margin-right"],
  "my": ["margin-top", "margin-bottom"],
  "mt": "margin-top",
  "mr": "margin-right",
  "mb": "margin-bottom",
  "ml": "margin-left",
};

function registerSpacing() {
  for (const [prefix, prop] of Object.entries(PADDING_MAP)) {
    for (const [scale, value] of Object.entries(SPACING_SCALE)) {
      const cls = `${prefix}-${scale}`;
      if (Array.isArray(prop)) {
        registry.set(cls, `.${escapeCssClass(cls)} { ${prop.map(p => `${p}: ${value}`).join("; ")} }`);
      } else {
        registry.set(cls, `.${escapeCssClass(cls)} { ${prop}: ${value} }`);
      }
    }
  }

  for (const [prefix, prop] of Object.entries(MARGIN_MAP)) {
    for (const [scale, value] of Object.entries(SPACING_SCALE)) {
      const cls = `${prefix}-${scale}`;
      if (Array.isArray(prop)) {
        registry.set(cls, `.${escapeCssClass(cls)} { ${prop.map(p => `${p}: ${value}`).join("; ")} }`);
      } else {
        registry.set(cls, `.${escapeCssClass(cls)} { ${prop}: ${value} }`);
      }
    }
    // Auto margin
    if (prefix === "mx" || prefix === "my" || prefix === "m" || prefix === "ml" || prefix === "mr" || prefix === "mt" || prefix === "mb") {
      const cls = `${prefix}-auto`;
      if (Array.isArray(prop)) {
        registry.set(cls, `.${escapeCssClass(cls)} { ${prop.map(p => `${p}: auto`).join("; ")} }`);
      } else {
        registry.set(cls, `.${escapeCssClass(cls)} { ${prop}: auto }`);
      }
    }
  }

  // space-x-* and space-y-*
  for (const [scale, value] of Object.entries(SPACING_SCALE)) {
    registry.set(`space-x-${scale}`, `.space-x-${escapeCssClass(scale)} > :not([hidden]) ~ :not([hidden]) { margin-left: ${value} }`);
    registry.set(`space-y-${scale}`, `.space-y-${escapeCssClass(scale)} > :not([hidden]) ~ :not([hidden]) { margin-top: ${value} }`);
  }
}

// ---------------------------------------------------------------------------
// Sizing: w-*, h-*, min-w-*, min-h-*, max-w-*, max-h-*
// ---------------------------------------------------------------------------

const SIZE_SCALE = {
  ...SPACING_SCALE,
  "auto": "auto",
  "1/2": "50%",
  "1/3": "33.333333%",
  "2/3": "66.666667%",
  "1/4": "25%",
  "2/4": "50%",
  "3/4": "75%",
  "1/5": "20%",
  "2/5": "40%",
  "3/5": "60%",
  "4/5": "80%",
  "1/6": "16.666667%",
  "full": "100%",
  "screen": "100vw",
  "min": "min-content",
  "max": "max-content",
  "fit": "fit-content",
};

const HEIGHT_SCALE = {
  ...SPACING_SCALE,
  "auto": "auto",
  "1/2": "50%",
  "1/3": "33.333333%",
  "2/3": "66.666667%",
  "1/4": "25%",
  "2/4": "50%",
  "3/4": "75%",
  "1/5": "20%",
  "2/5": "40%",
  "3/5": "60%",
  "4/5": "80%",
  "1/6": "16.666667%",
  "full": "100%",
  "screen": "100vh",
  "min": "min-content",
  "max": "max-content",
  "fit": "fit-content",
};

function registerSizing() {
  for (const [scale, value] of Object.entries(SIZE_SCALE)) {
    registry.set(`w-${scale}`, `.${escapeCssClass(`w-${scale}`)} { width: ${value} }`);
  }
  for (const [scale, value] of Object.entries(HEIGHT_SCALE)) {
    registry.set(`h-${scale}`, `.${escapeCssClass(`h-${scale}`)} { height: ${value} }`);
  }

  // min-w, max-w
  for (const [k, v] of [["0", "0px"], ["full", "100%"], ["min", "min-content"], ["max", "max-content"], ["fit", "fit-content"], ["screen", "100vw"]]) {
    registry.set(`min-w-${k}`, `.${escapeCssClass(`min-w-${k}`)} { min-width: ${v} }`);
    registry.set(`max-w-${k}`, `.${escapeCssClass(`max-w-${k}`)} { max-width: ${v} }`);
  }
  // Common max-w breakpoints
  for (const [k, v] of [["xs", "20rem"], ["sm", "24rem"], ["md", "28rem"], ["lg", "32rem"], ["xl", "36rem"], ["2xl", "42rem"], ["3xl", "48rem"], ["4xl", "56rem"], ["5xl", "64rem"], ["6xl", "72rem"], ["7xl", "80rem"]]) {
    registry.set(`max-w-${k}`, `.${escapeCssClass(`max-w-${k}`)} { max-width: ${v} }`);
  }

  // min-h, max-h
  for (const [k, v] of [["0", "0px"], ["full", "100%"], ["min", "min-content"], ["max", "max-content"], ["fit", "fit-content"], ["screen", "100vh"]]) {
    registry.set(`min-h-${k}`, `.${escapeCssClass(`min-h-${k}`)} { min-height: ${v} }`);
    registry.set(`max-h-${k}`, `.${escapeCssClass(`max-h-${k}`)} { max-height: ${v} }`);
  }
}

// ---------------------------------------------------------------------------
// Flexbox
// ---------------------------------------------------------------------------

function registerFlexbox() {
  registry.set("flex", ".flex { display: flex }");
  registry.set("inline-flex", ".inline-flex { display: inline-flex }");
  registry.set("flex-row", ".flex-row { flex-direction: row }");
  registry.set("flex-row-reverse", ".flex-row-reverse { flex-direction: row-reverse }");
  registry.set("flex-col", ".flex-col { flex-direction: column }");
  registry.set("flex-col-reverse", ".flex-col-reverse { flex-direction: column-reverse }");
  registry.set("flex-wrap", ".flex-wrap { flex-wrap: wrap }");
  registry.set("flex-nowrap", ".flex-nowrap { flex-wrap: nowrap }");
  registry.set("flex-wrap-reverse", ".flex-wrap-reverse { flex-wrap: wrap-reverse }");
  registry.set("flex-1", ".flex-1 { flex: 1 1 0% }");
  registry.set("flex-auto", ".flex-auto { flex: 1 1 auto }");
  registry.set("flex-initial", ".flex-initial { flex: 0 1 auto }");
  registry.set("flex-none", ".flex-none { flex: none }");
  registry.set("grow", ".grow { flex-grow: 1 }");
  registry.set("grow-0", ".grow-0 { flex-grow: 0 }");
  registry.set("shrink", ".shrink { flex-shrink: 1 }");
  registry.set("shrink-0", ".shrink-0 { flex-shrink: 0 }");

  // items-*
  for (const [k, v] of [["start", "flex-start"], ["end", "flex-end"], ["center", "center"], ["baseline", "baseline"], ["stretch", "stretch"]]) {
    registry.set(`items-${k}`, `.items-${k} { align-items: ${v} }`);
  }

  // justify-*
  for (const [k, v] of [["start", "flex-start"], ["end", "flex-end"], ["center", "center"], ["between", "space-between"], ["around", "space-around"], ["evenly", "space-evenly"]]) {
    registry.set(`justify-${k}`, `.justify-${k} { justify-content: ${v} }`);
  }

  // gap-*
  for (const [scale, value] of Object.entries(SPACING_SCALE)) {
    registry.set(`gap-${scale}`, `.${escapeCssClass(`gap-${scale}`)} { gap: ${value} }`);
    registry.set(`gap-x-${scale}`, `.${escapeCssClass(`gap-x-${scale}`)} { column-gap: ${value} }`);
    registry.set(`gap-y-${scale}`, `.${escapeCssClass(`gap-y-${scale}`)} { row-gap: ${value} }`);
  }
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

function registerGrid() {
  registry.set("grid", ".grid { display: grid }");
  registry.set("inline-grid", ".inline-grid { display: inline-grid }");

  // grid-cols-1 through grid-cols-12 + none
  for (let i = 1; i <= 12; i++) {
    registry.set(`grid-cols-${i}`, `.grid-cols-${i} { grid-template-columns: repeat(${i}, minmax(0, 1fr)) }`);
  }
  registry.set("grid-cols-none", ".grid-cols-none { grid-template-columns: none }");

  // grid-rows-1 through grid-rows-6 + none
  for (let i = 1; i <= 6; i++) {
    registry.set(`grid-rows-${i}`, `.grid-rows-${i} { grid-template-rows: repeat(${i}, minmax(0, 1fr)) }`);
  }
  registry.set("grid-rows-none", ".grid-rows-none { grid-template-rows: none }");

  // col-span-1 through col-span-12 + full
  for (let i = 1; i <= 12; i++) {
    registry.set(`col-span-${i}`, `.col-span-${i} { grid-column: span ${i} / span ${i} }`);
  }
  registry.set("col-span-full", ".col-span-full { grid-column: 1 / -1 }");

  // row-span-1 through row-span-6 + full
  for (let i = 1; i <= 6; i++) {
    registry.set(`row-span-${i}`, `.row-span-${i} { grid-row: span ${i} / span ${i} }`);
  }
  registry.set("row-span-full", ".row-span-full { grid-row: 1 / -1 }");
}

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

function registerTypography() {
  // Text sizes
  const TEXT_SIZES = {
    "xs": ["0.75rem", "1rem"],
    "sm": ["0.875rem", "1.25rem"],
    "base": ["1rem", "1.5rem"],
    "lg": ["1.125rem", "1.75rem"],
    "xl": ["1.25rem", "1.75rem"],
    "2xl": ["1.5rem", "2rem"],
    "3xl": ["1.875rem", "2.25rem"],
    "4xl": ["2.25rem", "2.5rem"],
    "5xl": ["3rem", "1"],
    "6xl": ["3.75rem", "1"],
    "7xl": ["4.5rem", "1"],
    "8xl": ["6rem", "1"],
    "9xl": ["8rem", "1"],
  };

  for (const [k, [fs, lh]] of Object.entries(TEXT_SIZES)) {
    registry.set(`text-${k}`, `.text-${escapeCssClass(k)} { font-size: ${fs}; line-height: ${lh} }`);
  }

  // Font weights
  const FONT_WEIGHTS = {
    "thin": "100",
    "extralight": "200",
    "light": "300",
    "normal": "400",
    "medium": "500",
    "semibold": "600",
    "bold": "700",
    "extrabold": "800",
    "black": "900",
  };

  for (const [k, v] of Object.entries(FONT_WEIGHTS)) {
    registry.set(`font-${k}`, `.font-${k} { font-weight: ${v} }`);
  }

  // Text alignment
  registry.set("text-left", ".text-left { text-align: left }");
  registry.set("text-center", ".text-center { text-align: center }");
  registry.set("text-right", ".text-right { text-align: right }");
  registry.set("text-justify", ".text-justify { text-align: justify }");

  // Leading (line-height)
  const LEADING = {
    "3": ".75rem", "4": "1rem", "5": "1.25rem", "6": "1.5rem",
    "7": "1.75rem", "8": "2rem", "9": "2.25rem", "10": "2.5rem",
    "none": "1", "tight": "1.25", "snug": "1.375",
    "normal": "1.5", "relaxed": "1.625", "loose": "2",
  };

  for (const [k, v] of Object.entries(LEADING)) {
    registry.set(`leading-${k}`, `.leading-${k} { line-height: ${v} }`);
  }

  // Tracking (letter-spacing)
  const TRACKING = {
    "tighter": "-0.05em", "tight": "-0.025em", "normal": "0em",
    "wide": "0.025em", "wider": "0.05em", "widest": "0.1em",
  };

  for (const [k, v] of Object.entries(TRACKING)) {
    registry.set(`tracking-${k}`, `.tracking-${k} { letter-spacing: ${v} }`);
  }

  // Text transforms
  registry.set("uppercase", ".uppercase { text-transform: uppercase }");
  registry.set("lowercase", ".lowercase { text-transform: lowercase }");
  registry.set("capitalize", ".capitalize { text-transform: capitalize }");
  registry.set("normal-case", ".normal-case { text-transform: none }");

  // Truncate
  registry.set("truncate", ".truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap }");

  // Whitespace
  registry.set("whitespace-normal", ".whitespace-normal { white-space: normal }");
  registry.set("whitespace-nowrap", ".whitespace-nowrap { white-space: nowrap }");
  registry.set("whitespace-pre", ".whitespace-pre { white-space: pre }");

  // Font style
  registry.set("italic", ".italic { font-style: italic }");
  registry.set("not-italic", ".not-italic { font-style: normal }");

  // Text decoration
  registry.set("underline", ".underline { text-decoration-line: underline }");
  registry.set("overline", ".overline { text-decoration-line: overline }");
  registry.set("line-through", ".line-through { text-decoration-line: line-through }");
  registry.set("no-underline", ".no-underline { text-decoration-line: none }");
}

// ---------------------------------------------------------------------------
// Colors: text-{color}-{shade}, bg-{color}-{shade}
// ---------------------------------------------------------------------------

function registerColors() {
  // Special colors
  registry.set("text-white", ".text-white { color: #ffffff }");
  registry.set("text-black", ".text-black { color: #000000 }");
  registry.set("text-transparent", ".text-transparent { color: transparent }");
  registry.set("bg-white", ".bg-white { background-color: #ffffff }");
  registry.set("bg-black", ".bg-black { background-color: #000000 }");
  registry.set("bg-transparent", ".bg-transparent { background-color: transparent }");

  for (const [colorName, shades] of Object.entries(COLOR_PALETTE)) {
    for (const shade of COLOR_SHADES) {
      const hex = shades[shade];
      if (!hex) continue;
      registry.set(`text-${colorName}-${shade}`, `.text-${colorName}-${shade} { color: ${hex} }`);
      registry.set(`bg-${colorName}-${shade}`, `.bg-${colorName}-${shade} { background-color: ${hex} }`);
    }
  }
}

// ---------------------------------------------------------------------------
// Borders
// ---------------------------------------------------------------------------

function registerBorders() {
  // Border widths
  registry.set("border", ".border { border-width: 1px }");
  registry.set("border-0", ".border-0 { border-width: 0px }");
  registry.set("border-2", ".border-2 { border-width: 2px }");
  registry.set("border-4", ".border-4 { border-width: 4px }");
  registry.set("border-8", ".border-8 { border-width: 8px }");

  // Border sides
  for (const [side, prop] of [["t", "border-top-width"], ["r", "border-right-width"], ["b", "border-bottom-width"], ["l", "border-left-width"]]) {
    registry.set(`border-${side}`, `.border-${side} { ${prop}: 1px }`);
    registry.set(`border-${side}-0`, `.border-${side}-0 { ${prop}: 0px }`);
    registry.set(`border-${side}-2`, `.border-${side}-2 { ${prop}: 2px }`);
    registry.set(`border-${side}-4`, `.border-${side}-4 { ${prop}: 4px }`);
  }

  // Border colors
  for (const [colorName, shades] of Object.entries(COLOR_PALETTE)) {
    for (const shade of COLOR_SHADES) {
      const hex = shades[shade];
      if (!hex) continue;
      registry.set(`border-${colorName}-${shade}`, `.border-${colorName}-${shade} { border-color: ${hex} }`);
    }
  }
  registry.set("border-white", ".border-white { border-color: #ffffff }");
  registry.set("border-black", ".border-black { border-color: #000000 }");
  registry.set("border-transparent", ".border-transparent { border-color: transparent }");

  // Border style
  registry.set("border-solid", ".border-solid { border-style: solid }");
  registry.set("border-dashed", ".border-dashed { border-style: dashed }");
  registry.set("border-dotted", ".border-dotted { border-style: dotted }");
  registry.set("border-none", ".border-none { border-style: none }");

  // Rounded
  const ROUNDED_SIZES = {
    "": "0.25rem", "none": "0px", "sm": "0.125rem", "md": "0.375rem",
    "lg": "0.5rem", "xl": "0.75rem", "2xl": "1rem", "3xl": "1.5rem", "full": "9999px",
  };

  for (const [k, v] of Object.entries(ROUNDED_SIZES)) {
    const cls = k ? `rounded-${k}` : "rounded";
    registry.set(cls, `.${escapeCssClass(cls)} { border-radius: ${v} }`);
  }

  // Rounded per-side
  for (const [side, props] of [
    ["t", ["border-top-left-radius", "border-top-right-radius"]],
    ["r", ["border-top-right-radius", "border-bottom-right-radius"]],
    ["b", ["border-bottom-right-radius", "border-bottom-left-radius"]],
    ["l", ["border-top-left-radius", "border-bottom-left-radius"]],
  ]) {
    for (const [k, v] of Object.entries(ROUNDED_SIZES)) {
      const cls = k ? `rounded-${side}-${k}` : `rounded-${side}`;
      registry.set(cls, `.${escapeCssClass(cls)} { ${props.map(p => `${p}: ${v}`).join("; ")} }`);
    }
  }
}

// ---------------------------------------------------------------------------
// Effects: shadow, opacity
// ---------------------------------------------------------------------------

function registerEffects() {
  const SHADOWS = {
    "sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    "md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    "lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    "xl": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
    "inner": "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
    "none": "0 0 #0000",
  };

  for (const [k, v] of Object.entries(SHADOWS)) {
    const cls = k ? `shadow-${k}` : "shadow";
    registry.set(cls, `.${escapeCssClass(cls)} { box-shadow: ${v} }`);
  }

  // Opacity
  for (const n of [0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100]) {
    registry.set(`opacity-${n}`, `.opacity-${n} { opacity: ${n / 100} }`);
  }
}

// ---------------------------------------------------------------------------
// Layout: display, position, overflow, z-index, inset
// ---------------------------------------------------------------------------

function registerLayout() {
  // Display
  registry.set("block", ".block { display: block }");
  registry.set("inline-block", ".inline-block { display: inline-block }");
  registry.set("inline", ".inline { display: inline }");
  registry.set("hidden", ".hidden { display: none }");
  registry.set("table", ".table { display: table }");
  registry.set("table-row", ".table-row { display: table-row }");
  registry.set("table-cell", ".table-cell { display: table-cell }");

  // Position
  registry.set("static", ".static { position: static }");
  registry.set("relative", ".relative { position: relative }");
  registry.set("absolute", ".absolute { position: absolute }");
  registry.set("fixed", ".fixed { position: fixed }");
  registry.set("sticky", ".sticky { position: sticky }");

  // Overflow
  for (const v of ["auto", "hidden", "visible", "scroll", "clip"]) {
    registry.set(`overflow-${v}`, `.overflow-${v} { overflow: ${v} }`);
    registry.set(`overflow-x-${v}`, `.overflow-x-${v} { overflow-x: ${v} }`);
    registry.set(`overflow-y-${v}`, `.overflow-y-${v} { overflow-y: ${v} }`);
  }

  // Inset (top, right, bottom, left)
  for (const [dir, prop] of [["top", "top"], ["right", "right"], ["bottom", "bottom"], ["left", "left"]]) {
    for (const [scale, value] of Object.entries(SPACING_SCALE)) {
      registry.set(`${dir}-${scale}`, `.${escapeCssClass(`${dir}-${scale}`)} { ${prop}: ${value} }`);
    }
    registry.set(`${dir}-auto`, `.${dir}-auto { ${prop}: auto }`);
    registry.set(`${dir}-full`, `.${dir}-full { ${prop}: 100% }`);
  }
  // inset-*
  for (const [scale, value] of Object.entries(SPACING_SCALE)) {
    registry.set(`inset-${scale}`, `.${escapeCssClass(`inset-${scale}`)} { inset: ${value} }`);
  }
  registry.set("inset-auto", ".inset-auto { inset: auto }");

  // Z-index
  for (const n of [0, 10, 20, 30, 40, 50]) {
    registry.set(`z-${n}`, `.z-${n} { z-index: ${n} }`);
  }
  registry.set("z-auto", ".z-auto { z-index: auto }");

  // Object fit
  registry.set("object-contain", ".object-contain { object-fit: contain }");
  registry.set("object-cover", ".object-cover { object-fit: cover }");
  registry.set("object-fill", ".object-fill { object-fit: fill }");
  registry.set("object-none", ".object-none { object-fit: none }");

  // Cursor
  registry.set("cursor-pointer", ".cursor-pointer { cursor: pointer }");
  registry.set("cursor-default", ".cursor-default { cursor: default }");
  registry.set("cursor-not-allowed", ".cursor-not-allowed { cursor: not-allowed }");
  registry.set("cursor-wait", ".cursor-wait { cursor: wait }");

  // Pointer events
  registry.set("pointer-events-none", ".pointer-events-none { pointer-events: none }");
  registry.set("pointer-events-auto", ".pointer-events-auto { pointer-events: auto }");

  // Select
  registry.set("select-none", ".select-none { user-select: none }");
  registry.set("select-text", ".select-text { user-select: text }");
  registry.set("select-all", ".select-all { user-select: all }");
  registry.set("select-auto", ".select-auto { user-select: auto }");
}

// ---------------------------------------------------------------------------
// Responsive prefixes
// ---------------------------------------------------------------------------

const RESPONSIVE_BREAKPOINTS = {
  "sm": "640px",
  "md": "768px",
  "lg": "1024px",
  "xl": "1280px",
  "2xl": "1536px",
};

// ---------------------------------------------------------------------------
// State prefixes
// ---------------------------------------------------------------------------

const STATE_PSEUDO_CLASSES = {
  "hover": "hover",
  "focus": "focus",
  "active": "active",
  "disabled": "disabled",
  "first": "first-child",
  "last": "last-child",
  "odd": "nth-child(odd)",
  "even": "nth-child(even)",
  "visited": "visited",
  "focus-within": "focus-within",
  "focus-visible": "focus-visible",
};

// ---------------------------------------------------------------------------
// CSS class name escaping
// ---------------------------------------------------------------------------

/**
 * Escape special characters in a CSS class name for use in a selector.
 * @param {string} cls
 * @returns {string}
 */
function escapeCssClass(cls) {
  return cls.replace(/[.:/\\%[\]#()]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Lookup logic
// ---------------------------------------------------------------------------

/**
 * Parse a class name into its prefix chain and base utility.
 * E.g., "sm:hover:text-red-500" -> { responsive: "sm", state: "hover", base: "text-red-500" }
 * @param {string} className
 * @returns {{ responsive: string|null, state: string|null, base: string }}
 */
function parseClassName(className) {
  const parts = className.split(":");
  let responsive = null;
  let state = null;
  let base = parts[parts.length - 1];

  for (let i = 0; i < parts.length - 1; i++) {
    const prefix = parts[i];
    if (RESPONSIVE_BREAKPOINTS[prefix]) {
      responsive = prefix;
    } else if (STATE_PSEUDO_CLASSES[prefix]) {
      state = prefix;
    }
  }

  return { responsive, state, base };
}

/**
 * Get the CSS rule for a single Tailwind utility class name.
 * Returns the CSS rule string or null if the class is not recognized.
 *
 * Supports responsive prefixes (sm:, md:, lg:, xl:, 2xl:) and
 * state prefixes (hover:, focus:, active:, disabled:).
 *
 * @param {string} className
 * @returns {string|null}
 */
export function getTailwindCSS(className) {
  if (!className || typeof className !== "string") return null;

  const { responsive, state, base } = parseClassName(className);

  // Look up the base utility
  const baseRule = registry.get(base);
  if (!baseRule) return null;

  // If no prefixes, return as-is
  if (!responsive && !state) return baseRule;

  // Build the modified rule
  // Extract the selector and declaration from the base rule
  const selectorMatch = baseRule.match(/^(\.[^\s{]+)\s*\{(.+)\}$/s);
  if (!selectorMatch) return baseRule;

  const [, , declaration] = selectorMatch;
  const escapedName = escapeCssClass(className);

  let rule;
  if (state) {
    const pseudo = STATE_PSEUDO_CLASSES[state];
    rule = `.${escapedName}:${pseudo} {${declaration}}`;
  } else {
    rule = `.${escapedName} {${declaration}}`;
  }

  if (responsive) {
    const bp = RESPONSIVE_BREAKPOINTS[responsive];
    rule = `@media (min-width: ${bp}) { ${rule} }`;
  }

  return rule;
}

/**
 * Get combined CSS for an array of class names.
 * Unknown classes are silently ignored.
 *
 * @param {string[]} classNames
 * @returns {string}
 */
export function getAllUsedCSS(classNames) {
  if (!classNames || !Array.isArray(classNames)) return "";

  const seen = new Set();
  const rules = [];

  for (const cls of classNames) {
    if (!cls || seen.has(cls)) continue;
    seen.add(cls);
    const css = getTailwindCSS(cls);
    if (css) rules.push(css);
  }

  return rules.join("\n");
}

/**
 * Scan an HTML string for all class="" attribute values and extract individual class names.
 *
 * @param {string} html
 * @returns {string[]}
 */
export function scanClassesFromHtml(html) {
  if (!html || typeof html !== "string") return [];

  const classNames = new Set();
  const re = /\bclass="([^"]*)"/g;
  let match;

  while ((match = re.exec(html)) !== null) {
    const value = match[1];
    for (const cls of value.split(/\s+/)) {
      if (cls) classNames.add(cls);
    }
  }

  return [...classNames];
}

// ---------------------------------------------------------------------------
// W-TAILWIND-001: unsupported Tailwind syntax detection (SPEC §26.3,
// SPEC-ISSUE-012). The full Tailwind variant + arbitrary-value system is
// listed as TBD in §26.3 — when adopters write class strings using that
// syntax the embedded engine either silently drops them (e.g.
// `p-[1.5rem]`) or, for incidentally-handled prefixes (e.g. `md:`,
// `hover:`), happens to emit a rule today but the spec considers the
// feature unfinished. This pre-pass surfaces a warning on every class
// whose shape suggests variant or arbitrary-value syntax so adopters are
// not surprised when SPEC-ISSUE-012 closes and the semantics may shift.
//
// Detection rule:
//   1. Skip names that contain neither `:` nor `[` (look like USER classes).
//   2. Otherwise fire — the name has Tailwind variant or arbitrary-value
//      shape and falls under SPEC-ISSUE-012.
//
// False positives on user-defined classes named like `weird:name` are
// acceptable; users can rename. Better to over-warn than to silently drop.
// ---------------------------------------------------------------------------

/**
 * Convert a flat string offset to { line, column } (1-based).
 *
 * @param {string} source
 * @param {number} offset — byte offset into source
 * @returns {{ line: number, column: number }}
 */
function offsetToLineCol(source, offset) {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === "\n") {
      line++;
      lastNewline = i;
    }
  }
  const column = offset - lastNewline;
  return { line, column };
}

/**
 * @typedef {{
 *   line: number,
 *   column: number,
 *   className: string,
 *   message: string,
 *   severity: 'warning',
 *   code: 'W-TAILWIND-001',
 * }} TailwindLintDiagnostic
 */

/**
 * Scan a source string (any text, typically a `.scrml` file) for class names
 * inside `class="..."` attributes that look like Tailwind variant or
 * arbitrary-value syntax. Return one diagnostic per offending (offset, class)
 * pair. Within a single `class="..."` value duplicate offenders are reported
 * once; across multiple `class=` attributes each occurrence is reported.
 *
 * @param {string} source
 * @returns {TailwindLintDiagnostic[]}
 */
export function findUnsupportedTailwindShapes(source) {
  if (!source || typeof source !== "string") return [];

  const diagnostics = [];
  const attrRe = /\bclass="([^"]*)"/g;
  let attrMatch;

  while ((attrMatch = attrRe.exec(source)) !== null) {
    const attrValue = attrMatch[1];
    const attrValueStart = attrMatch.index + attrMatch[0].indexOf('"') + 1;

    // Walk the attribute value, recording each class name and its source offset.
    // Classes are whitespace-separated; we need per-class offsets so messages
    // point at the offending class, not the start of the attribute.
    const classRe = /\S+/g;
    let classMatch;
    const seenInThisAttr = new Set();
    while ((classMatch = classRe.exec(attrValue)) !== null) {
      const cls = classMatch[0];
      if (seenInThisAttr.has(cls)) continue;
      seenInThisAttr.add(cls);

      // Skip user-shaped classes (no Tailwind variant/arbitrary syntax).
      if (!cls.includes(":") && !cls.includes("[")) continue;

      // Tailwind-shape: emit W-TAILWIND-001. The full variant + arbitrary-value
      // system is unfinished (SPEC-ISSUE-012) so we warn on shape regardless of
      // whether the embedded engine has incidental partial support — adopters
      // should treat all such classes as TBD until that issue closes.
      const offset = attrValueStart + classMatch.index;
      const { line, column } = offsetToLineCol(source, offset);
      diagnostics.push({
        line,
        column,
        className: cls,
        message:
          `Line ${line}: Class \`${cls}\` looks like Tailwind variant/arbitrary ` +
          `syntax which is not yet supported in this scrml revision ` +
          `(SPEC-ISSUE-012). The class will not produce any CSS. Use a base ` +
          `utility class (e.g. \`p-4\` instead of \`md:p-4\`) or define your ` +
          `own CSS rule.`,
        severity: "warning",
        code: "W-TAILWIND-001",
      });
    }
  }

  // Sort by line, then column for deterministic output (mirrors lintGhostPatterns).
  diagnostics.sort((a, b) => a.line !== b.line ? a.line - b.line : a.column - b.column);
  return diagnostics;
}

// ---------------------------------------------------------------------------
// Initialize registry on module load
// ---------------------------------------------------------------------------

registerSpacing();
registerSizing();
registerFlexbox();
registerGrid();
registerTypography();
registerColors();
registerBorders();
registerEffects();
registerLayout();
