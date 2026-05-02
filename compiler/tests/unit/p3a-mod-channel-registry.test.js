/**
 * P3.A — MOD (module-resolver) channel registry tests.
 *
 * Per P3 deep-dive §4.3.
 *
 * Verifies that buildExportRegistry correctly records channel exports with
 * `category: "channel"` (in addition to the legacy `isComponent` boolean).
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { buildImportGraph, buildExportRegistry } from "../../src/module-resolver.js";

function buildFileASTs(files) {
  return files.map(({ path, src }) => {
    const bs = splitBlocks(path, src);
    const tab = buildAST(bs);
    return { filePath: path, ast: tab.ast };
  });
}

describe("P3.A MOD — channel exports register with category=channel", () => {
  test("simple channel export — category and kind populated", () => {
    const fileASTs = buildFileASTs([
      {
        path: "/tmp/m1/channels.scrml",
        src: `export <channel name="ticker">
  ${"$"}{ @shared count:number = 0 }
</>
`,
      },
    ]);
    const { graph } = buildImportGraph(fileASTs);
    const registry = buildExportRegistry(graph);
    const exports = registry.get("/tmp/m1/channels.scrml");
    expect(exports).toBeDefined();
    expect(exports.size).toBe(1);
    const info = exports.get("ticker");
    expect(info).toBeDefined();
    expect(info.kind).toBe("channel");
    expect(info.category).toBe("channel");
    expect(info.isComponent).toBe(false);
  });

  test("multiple channel exports in one file — each gets category=channel", () => {
    const fileASTs = buildFileASTs([
      {
        path: "/tmp/m2/channels.scrml",
        src: `export <channel name="chat" topic="lobby">
  ${"$"}{ @shared messages = [] }
</>

export <channel name="updates">
  ${"$"}{ @shared count:number = 0 }
</>
`,
      },
    ]);
    const { graph } = buildImportGraph(fileASTs);
    const registry = buildExportRegistry(graph);
    const exports = registry.get("/tmp/m2/channels.scrml");
    expect(exports.size).toBe(2);
    expect(exports.get("chat").category).toBe("channel");
    expect(exports.get("updates").category).toBe("channel");
    // Neither is isComponent — channels are NOT components.
    expect(exports.get("chat").isComponent).toBe(false);
    expect(exports.get("updates").isComponent).toBe(false);
  });

  test("channel + component + type exports — categories don't collide", () => {
    const fileASTs = buildFileASTs([
      {
        path: "/tmp/m3/mixed.scrml",
        src: `${"$"}{
  export type Color = "red" | "blue"
  export const Card = <div class="card"/>
  export function helper(x) { return x * 2 }
}

export <channel name="ticker">
  ${"$"}{ @shared count:number = 0 }
</>
`,
      },
    ]);
    const { graph } = buildImportGraph(fileASTs);
    const registry = buildExportRegistry(graph);
    const exports = registry.get("/tmp/m3/mixed.scrml");
    expect(exports).toBeDefined();
    // ticker → channel
    expect(exports.get("ticker").category).toBe("channel");
    // Card → user-component (PascalCase const)
    // P3-FOLLOW: category vocabulary aligned with NR's resolvedCategory.
    expect(exports.get("Card").category).toBe("user-component");
    expect(exports.get("Card").isComponent).toBe(true);
    // helper → function
    expect(exports.get("helper").category).toBe("function");
    // Color → type
    expect(exports.get("Color").category).toBe("type");
  });
});
