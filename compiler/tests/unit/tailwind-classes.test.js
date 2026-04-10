/**
 * Tailwind Utility Classes — Unit Tests
 *
 * Tests for src/tailwind-classes.js (SPEC §25).
 *
 * Coverage:
 *   §1  Known utility classes produce correct CSS
 *   §2  Unknown classes return null / are ignored
 *   §3  getAllUsedCSS combines multiple classes
 *   §4  Spacing utilities (padding, margin)
 *   §5  Sizing utilities (width, height)
 *   §6  Flexbox utilities
 *   §7  Grid utilities
 *   §8  Typography utilities
 *   §9  Color utilities (text-*, bg-*)
 *   §10 Border utilities
 *   §11 Effect utilities (shadow, opacity)
 *   §12 Layout utilities (display, position, overflow, z-index)
 *   §13 Responsive prefixes (sm:, md:, lg:, xl:, 2xl:)
 *   §14 State prefixes (hover:, focus:, active:, disabled:)
 *   §15 Combined responsive + state prefixes
 *   §16 scanClassesFromHtml extracts class names
 *   §17 Deduplication in getAllUsedCSS
 *   §18 Edge cases (null, empty, undefined)
 */

import { describe, test, expect } from "bun:test";
import { getTailwindCSS, getAllUsedCSS, scanClassesFromHtml } from "../../src/tailwind-classes.js";

// ---------------------------------------------------------------------------
// §1 Known utility classes produce correct CSS
// ---------------------------------------------------------------------------

describe("§1 Known utility classes", () => {
  test("p-4 produces correct padding rule", () => {
    const css = getTailwindCSS("p-4");
    expect(css).toContain("padding: 1rem");
    expect(css).toContain(".p-4");
  });

  test("m-2 produces correct margin rule", () => {
    const css = getTailwindCSS("m-2");
    expect(css).toContain("margin: 0.5rem");
  });

  test("flex produces display: flex", () => {
    const css = getTailwindCSS("flex");
    expect(css).toContain("display: flex");
  });

  test("text-center produces text-align: center", () => {
    const css = getTailwindCSS("text-center");
    expect(css).toContain("text-align: center");
  });

  test("hidden produces display: none", () => {
    const css = getTailwindCSS("hidden");
    expect(css).toContain("display: none");
  });
});

// ---------------------------------------------------------------------------
// §2 Unknown classes return null / are ignored
// ---------------------------------------------------------------------------

describe("§2 Unknown classes", () => {
  test("unknown class returns null", () => {
    expect(getTailwindCSS("not-a-tailwind-class")).toBeNull();
  });

  test("arbitrary class returns null", () => {
    expect(getTailwindCSS("my-custom-class")).toBeNull();
  });

  test("empty string returns null", () => {
    expect(getTailwindCSS("")).toBeNull();
  });

  test("getAllUsedCSS ignores unknown classes", () => {
    const css = getAllUsedCSS(["p-4", "not-real", "flex"]);
    expect(css).toContain("padding: 1rem");
    expect(css).toContain("display: flex");
    expect(css).not.toContain("not-real");
  });
});

// ---------------------------------------------------------------------------
// §3 getAllUsedCSS combines multiple classes
// ---------------------------------------------------------------------------

describe("§3 getAllUsedCSS", () => {
  test("combines multiple classes into one CSS string", () => {
    const css = getAllUsedCSS(["p-4", "m-2", "flex"]);
    expect(css).toContain("padding: 1rem");
    expect(css).toContain("margin: 0.5rem");
    expect(css).toContain("display: flex");
  });

  test("empty array returns empty string", () => {
    expect(getAllUsedCSS([])).toBe("");
  });

  test("all unknown classes returns empty string", () => {
    expect(getAllUsedCSS(["foo", "bar", "baz"])).toBe("");
  });
});

// ---------------------------------------------------------------------------
// §4 Spacing utilities
// ---------------------------------------------------------------------------

describe("§4 Spacing utilities", () => {
  test("p-0 through p-12", () => {
    expect(getTailwindCSS("p-0")).toContain("padding: 0px");
    expect(getTailwindCSS("p-1")).toContain("padding: 0.25rem");
    expect(getTailwindCSS("p-8")).toContain("padding: 2rem");
    expect(getTailwindCSS("p-12")).toContain("padding: 3rem");
  });

  test("px-* sets left and right padding", () => {
    const css = getTailwindCSS("px-4");
    expect(css).toContain("padding-left: 1rem");
    expect(css).toContain("padding-right: 1rem");
  });

  test("py-* sets top and bottom padding", () => {
    const css = getTailwindCSS("py-2");
    expect(css).toContain("padding-top: 0.5rem");
    expect(css).toContain("padding-bottom: 0.5rem");
  });

  test("pt/pr/pb/pl individual sides", () => {
    expect(getTailwindCSS("pt-4")).toContain("padding-top: 1rem");
    expect(getTailwindCSS("pr-4")).toContain("padding-right: 1rem");
    expect(getTailwindCSS("pb-4")).toContain("padding-bottom: 1rem");
    expect(getTailwindCSS("pl-4")).toContain("padding-left: 1rem");
  });

  test("m-0 through m-12", () => {
    expect(getTailwindCSS("m-0")).toContain("margin: 0px");
    expect(getTailwindCSS("m-4")).toContain("margin: 1rem");
    expect(getTailwindCSS("m-12")).toContain("margin: 3rem");
  });

  test("mx-auto", () => {
    const css = getTailwindCSS("mx-auto");
    expect(css).toContain("margin-left: auto");
    expect(css).toContain("margin-right: auto");
  });

  test("my-* sets top and bottom margin", () => {
    const css = getTailwindCSS("my-6");
    expect(css).toContain("margin-top: 1.5rem");
    expect(css).toContain("margin-bottom: 1.5rem");
  });

  test("mt/mr/mb/ml individual sides", () => {
    expect(getTailwindCSS("mt-2")).toContain("margin-top: 0.5rem");
    expect(getTailwindCSS("mr-2")).toContain("margin-right: 0.5rem");
    expect(getTailwindCSS("mb-2")).toContain("margin-bottom: 0.5rem");
    expect(getTailwindCSS("ml-2")).toContain("margin-left: 0.5rem");
  });

  test("space-x-* and space-y-*", () => {
    expect(getTailwindCSS("space-x-4")).toContain("margin-left: 1rem");
    expect(getTailwindCSS("space-y-2")).toContain("margin-top: 0.5rem");
  });
});

// ---------------------------------------------------------------------------
// §5 Sizing utilities
// ---------------------------------------------------------------------------

describe("§5 Sizing utilities", () => {
  test.each([
    ["w-0", "width: 0px"],
    ["w-4", "width: 1rem"],
    ["w-full", "width: 100%"],
    ["w-screen", "width: 100vw"],
    ["w-auto", "width: auto"],
  ])("%s produces correct width", (cls, expected) => {
    expect(getTailwindCSS(cls)).toContain(expected);
  });

  test("h-* height values", () => {
    expect(getTailwindCSS("h-0")).toContain("height: 0px");
    expect(getTailwindCSS("h-8")).toContain("height: 2rem");
    expect(getTailwindCSS("h-full")).toContain("height: 100%");
    expect(getTailwindCSS("h-screen")).toContain("height: 100vh");
  });

  test("min-w-*, max-w-*", () => {
    expect(getTailwindCSS("min-w-0")).toContain("min-width: 0px");
    expect(getTailwindCSS("max-w-lg")).toContain("max-width: 32rem");
    expect(getTailwindCSS("max-w-full")).toContain("max-width: 100%");
  });

  test("min-h-*, max-h-*", () => {
    expect(getTailwindCSS("min-h-0")).toContain("min-height: 0px");
    expect(getTailwindCSS("min-h-screen")).toContain("min-height: 100vh");
    expect(getTailwindCSS("max-h-full")).toContain("max-height: 100%");
  });
});

// ---------------------------------------------------------------------------
// §6 Flexbox utilities
// ---------------------------------------------------------------------------

describe("§6 Flexbox utilities", () => {
  test("flex display", () => {
    expect(getTailwindCSS("flex")).toContain("display: flex");
  });

  test("flex-row and flex-col", () => {
    expect(getTailwindCSS("flex-row")).toContain("flex-direction: row");
    expect(getTailwindCSS("flex-col")).toContain("flex-direction: column");
  });

  test("flex-wrap", () => {
    expect(getTailwindCSS("flex-wrap")).toContain("flex-wrap: wrap");
  });

  test("items-center", () => {
    expect(getTailwindCSS("items-center")).toContain("align-items: center");
  });

  test("justify-between", () => {
    expect(getTailwindCSS("justify-between")).toContain("justify-content: space-between");
  });

  test("gap-4", () => {
    expect(getTailwindCSS("gap-4")).toContain("gap: 1rem");
  });

  test("flex-1, flex-auto, flex-none", () => {
    expect(getTailwindCSS("flex-1")).toContain("flex: 1 1 0%");
    expect(getTailwindCSS("flex-auto")).toContain("flex: 1 1 auto");
    expect(getTailwindCSS("flex-none")).toContain("flex: none");
  });

  test("grow and shrink", () => {
    expect(getTailwindCSS("grow")).toContain("flex-grow: 1");
    expect(getTailwindCSS("shrink")).toContain("flex-shrink: 1");
  });
});

// ---------------------------------------------------------------------------
// §7 Grid utilities
// ---------------------------------------------------------------------------

describe("§7 Grid utilities", () => {
  test("grid display", () => {
    expect(getTailwindCSS("grid")).toContain("display: grid");
  });

  test("grid-cols-3", () => {
    expect(getTailwindCSS("grid-cols-3")).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
  });

  test("grid-rows-2", () => {
    expect(getTailwindCSS("grid-rows-2")).toContain("grid-template-rows: repeat(2, minmax(0, 1fr))");
  });

  test("col-span-6", () => {
    expect(getTailwindCSS("col-span-6")).toContain("grid-column: span 6 / span 6");
  });

  test("row-span-2", () => {
    expect(getTailwindCSS("row-span-2")).toContain("grid-row: span 2 / span 2");
  });
});

// ---------------------------------------------------------------------------
// §8 Typography utilities
// ---------------------------------------------------------------------------

describe("§8 Typography utilities", () => {
  test.each([
    ["text-xs", "font-size: 0.75rem"],
    ["text-sm", "font-size: 0.875rem"],
    ["text-base", "font-size: 1rem"],
    ["text-lg", "font-size: 1.125rem"],
    ["text-xl", "font-size: 1.25rem"],
    ["text-2xl", "font-size: 1.5rem"],
    ["text-9xl", "font-size: 8rem"],
  ])("%s produces correct font-size", (cls, expected) => {
    expect(getTailwindCSS(cls)).toContain(expected);
  });

  test("font-thin through font-black", () => {
    expect(getTailwindCSS("font-thin")).toContain("font-weight: 100");
    expect(getTailwindCSS("font-normal")).toContain("font-weight: 400");
    expect(getTailwindCSS("font-bold")).toContain("font-weight: 700");
    expect(getTailwindCSS("font-black")).toContain("font-weight: 900");
  });

  test("text-left, text-center, text-right", () => {
    expect(getTailwindCSS("text-left")).toContain("text-align: left");
    expect(getTailwindCSS("text-center")).toContain("text-align: center");
    expect(getTailwindCSS("text-right")).toContain("text-align: right");
  });

  test("leading-*", () => {
    expect(getTailwindCSS("leading-tight")).toContain("line-height: 1.25");
    expect(getTailwindCSS("leading-normal")).toContain("line-height: 1.5");
  });

  test("tracking-*", () => {
    expect(getTailwindCSS("tracking-tight")).toContain("letter-spacing: -0.025em");
    expect(getTailwindCSS("tracking-wide")).toContain("letter-spacing: 0.025em");
  });

  test("uppercase, lowercase, capitalize", () => {
    expect(getTailwindCSS("uppercase")).toContain("text-transform: uppercase");
    expect(getTailwindCSS("lowercase")).toContain("text-transform: lowercase");
    expect(getTailwindCSS("capitalize")).toContain("text-transform: capitalize");
  });

  test("truncate", () => {
    const css = getTailwindCSS("truncate");
    expect(css).toContain("overflow: hidden");
    expect(css).toContain("text-overflow: ellipsis");
    expect(css).toContain("white-space: nowrap");
  });
});

// ---------------------------------------------------------------------------
// §9 Color utilities
// ---------------------------------------------------------------------------

describe("§9 Color utilities", () => {
  test("text-white and text-black", () => {
    expect(getTailwindCSS("text-white")).toContain("color: #ffffff");
    expect(getTailwindCSS("text-black")).toContain("color: #000000");
  });

  test("text-red-500", () => {
    expect(getTailwindCSS("text-red-500")).toContain("color: #ef4444");
  });

  test("bg-blue-600", () => {
    expect(getTailwindCSS("bg-blue-600")).toContain("background-color: #2563eb");
  });

  test("bg-transparent", () => {
    expect(getTailwindCSS("bg-transparent")).toContain("background-color: transparent");
  });

  test("all named colors have 50-950 shades for text and bg", () => {
    const colors = ["slate", "gray", "red", "orange", "amber", "yellow", "green",
      "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet",
      "purple", "fuchsia", "pink", "rose"];
    for (const color of colors) {
      expect(getTailwindCSS(`text-${color}-500`)).not.toBeNull();
      expect(getTailwindCSS(`bg-${color}-500`)).not.toBeNull();
      expect(getTailwindCSS(`text-${color}-50`)).not.toBeNull();
      expect(getTailwindCSS(`text-${color}-950`)).not.toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// §10 Border utilities
// ---------------------------------------------------------------------------

describe("§10 Border utilities", () => {
  test("border widths", () => {
    expect(getTailwindCSS("border")).toContain("border-width: 1px");
    expect(getTailwindCSS("border-2")).toContain("border-width: 2px");
    expect(getTailwindCSS("border-4")).toContain("border-width: 4px");
  });

  test("border colors", () => {
    expect(getTailwindCSS("border-red-500")).toContain("border-color: #ef4444");
    expect(getTailwindCSS("border-black")).toContain("border-color: #000000");
  });

  test("rounded sizes", () => {
    expect(getTailwindCSS("rounded")).toContain("border-radius: 0.25rem");
    expect(getTailwindCSS("rounded-lg")).toContain("border-radius: 0.5rem");
    expect(getTailwindCSS("rounded-full")).toContain("border-radius: 9999px");
    expect(getTailwindCSS("rounded-none")).toContain("border-radius: 0px");
  });
});

// ---------------------------------------------------------------------------
// §11 Effect utilities
// ---------------------------------------------------------------------------

describe("§11 Effect utilities", () => {
  test("shadow sizes", () => {
    expect(getTailwindCSS("shadow")).toContain("box-shadow:");
    expect(getTailwindCSS("shadow-sm")).toContain("box-shadow:");
    expect(getTailwindCSS("shadow-lg")).toContain("box-shadow:");
    expect(getTailwindCSS("shadow-none")).toContain("box-shadow: 0 0 #0000");
  });

  test("opacity values", () => {
    expect(getTailwindCSS("opacity-0")).toContain("opacity: 0");
    expect(getTailwindCSS("opacity-50")).toContain("opacity: 0.5");
    expect(getTailwindCSS("opacity-100")).toContain("opacity: 1");
  });
});

// ---------------------------------------------------------------------------
// §12 Layout utilities
// ---------------------------------------------------------------------------

describe("§12 Layout utilities", () => {
  test.each([
    ["block", "display: block"],
    ["inline-block", "display: inline-block"],
    ["inline", "display: inline"],
    ["hidden", "display: none"],
    ["table", "display: table"],
  ])("%s produces correct display value", (cls, expected) => {
    expect(getTailwindCSS(cls)).toContain(expected);
  });

  test("position values", () => {
    expect(getTailwindCSS("relative")).toContain("position: relative");
    expect(getTailwindCSS("absolute")).toContain("position: absolute");
    expect(getTailwindCSS("fixed")).toContain("position: fixed");
    expect(getTailwindCSS("sticky")).toContain("position: sticky");
  });

  test("overflow values", () => {
    expect(getTailwindCSS("overflow-hidden")).toContain("overflow: hidden");
    expect(getTailwindCSS("overflow-auto")).toContain("overflow: auto");
    expect(getTailwindCSS("overflow-scroll")).toContain("overflow: scroll");
  });

  test("z-index values", () => {
    expect(getTailwindCSS("z-0")).toContain("z-index: 0");
    expect(getTailwindCSS("z-10")).toContain("z-index: 10");
    expect(getTailwindCSS("z-50")).toContain("z-index: 50");
  });

  test("top/right/bottom/left values", () => {
    expect(getTailwindCSS("top-0")).toContain("top: 0px");
    expect(getTailwindCSS("right-4")).toContain("right: 1rem");
    expect(getTailwindCSS("bottom-auto")).toContain("bottom: auto");
    expect(getTailwindCSS("left-full")).toContain("left: 100%");
  });
});

// ---------------------------------------------------------------------------
// §13 Responsive prefixes
// ---------------------------------------------------------------------------

describe("§13 Responsive prefixes", () => {
  test("sm: prefix wraps in media query", () => {
    const css = getTailwindCSS("sm:flex");
    expect(css).toContain("@media (min-width: 640px)");
    expect(css).toContain("display: flex");
  });

  test("md: prefix wraps in media query", () => {
    const css = getTailwindCSS("md:hidden");
    expect(css).toContain("@media (min-width: 768px)");
    expect(css).toContain("display: none");
  });

  test("lg: prefix wraps in media query", () => {
    const css = getTailwindCSS("lg:grid-cols-3");
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
  });

  test("xl: prefix wraps in media query", () => {
    const css = getTailwindCSS("xl:p-8");
    expect(css).toContain("@media (min-width: 1280px)");
    expect(css).toContain("padding: 2rem");
  });

  test("2xl: prefix wraps in media query", () => {
    const css = getTailwindCSS("2xl:text-lg");
    expect(css).toContain("@media (min-width: 1536px)");
    expect(css).toContain("font-size: 1.125rem");
  });

  test("responsive prefix with unknown base returns null", () => {
    expect(getTailwindCSS("sm:not-real")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §14 State prefixes
// ---------------------------------------------------------------------------

describe("§14 State prefixes", () => {
  test("hover: prefix produces :hover pseudo-class", () => {
    const css = getTailwindCSS("hover:bg-blue-500");
    expect(css).toContain(":hover");
    expect(css).toContain("background-color: #3b82f6");
  });

  test("focus: prefix produces :focus pseudo-class", () => {
    const css = getTailwindCSS("focus:border-blue-500");
    expect(css).toContain(":focus");
    expect(css).toContain("border-color: #3b82f6");
  });

  test("active: prefix produces :active pseudo-class", () => {
    const css = getTailwindCSS("active:bg-red-600");
    expect(css).toContain(":active");
    expect(css).toContain("background-color: #dc2626");
  });

  test("disabled: prefix produces :disabled pseudo-class", () => {
    const css = getTailwindCSS("disabled:opacity-50");
    expect(css).toContain(":disabled");
    expect(css).toContain("opacity: 0.5");
  });

  test("state prefix with unknown base returns null", () => {
    expect(getTailwindCSS("hover:not-real")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §15 Combined responsive + state prefixes
// ---------------------------------------------------------------------------

describe("§15 Combined prefixes", () => {
  test("sm:hover:bg-blue-500 applies both media query and pseudo-class", () => {
    const css = getTailwindCSS("sm:hover:bg-blue-500");
    expect(css).toContain("@media (min-width: 640px)");
    expect(css).toContain(":hover");
    expect(css).toContain("background-color: #3b82f6");
  });

  test("lg:focus:text-white applies both media query and pseudo-class", () => {
    const css = getTailwindCSS("lg:focus:text-white");
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toContain(":focus");
    expect(css).toContain("color: #ffffff");
  });
});

// ---------------------------------------------------------------------------
// §16 scanClassesFromHtml
// ---------------------------------------------------------------------------

describe("§16 scanClassesFromHtml", () => {
  test("extracts class names from a single element", () => {
    const classes = scanClassesFromHtml('<div class="p-4 flex items-center"></div>');
    expect(classes).toContain("p-4");
    expect(classes).toContain("flex");
    expect(classes).toContain("items-center");
  });

  test("extracts from multiple elements", () => {
    const html = '<div class="flex"><span class="text-red-500 font-bold">hi</span></div>';
    const classes = scanClassesFromHtml(html);
    expect(classes).toContain("flex");
    expect(classes).toContain("text-red-500");
    expect(classes).toContain("font-bold");
  });

  test("returns empty array for no class attributes", () => {
    expect(scanClassesFromHtml("<div></div>")).toEqual([]);
  });

  test("returns empty array for empty string", () => {
    expect(scanClassesFromHtml("")).toEqual([]);
  });

  test("returns empty array for null", () => {
    expect(scanClassesFromHtml(null)).toEqual([]);
  });

  test("deduplicates class names", () => {
    const html = '<div class="p-4 flex"><span class="p-4 m-2"></span></div>';
    const classes = scanClassesFromHtml(html);
    const p4Count = classes.filter(c => c === "p-4").length;
    expect(p4Count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §17 Deduplication in getAllUsedCSS
// ---------------------------------------------------------------------------

describe("§17 Deduplication", () => {
  test("duplicate class names produce CSS only once", () => {
    const css = getAllUsedCSS(["p-4", "p-4", "flex", "flex"]);
    const p4Matches = css.match(/\.p-4/g);
    expect(p4Matches).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// §18 Edge cases
// ---------------------------------------------------------------------------

describe("§18 Edge cases", () => {
  test("getTailwindCSS(null) returns null", () => {
    expect(getTailwindCSS(null)).toBeNull();
  });

  test("getTailwindCSS(undefined) returns null", () => {
    expect(getTailwindCSS(undefined)).toBeNull();
  });

  test("getAllUsedCSS(null) returns empty string", () => {
    expect(getAllUsedCSS(null)).toBe("");
  });

  test("getAllUsedCSS(undefined) returns empty string", () => {
    expect(getAllUsedCSS(undefined)).toBe("");
  });

  test("p-px uses 1px value", () => {
    expect(getTailwindCSS("p-px")).toContain("padding: 1px");
  });

  test("fractional spacing p-0.5", () => {
    expect(getTailwindCSS("p-0.5")).toContain("padding: 0.125rem");
  });
});
