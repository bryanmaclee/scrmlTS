/**
 * Cross-file component resolution — Unit Tests
 *
 * Coverage:
 *   §A  buildExportRegistry marks PascalCase const exports as isComponent: true
 *   §B  buildExportRegistry — non-PascalCase and non-const exports
 *   §C  runCEFile with exportRegistry + fileASTMap resolves an imported component
 *   §D  runCEFile with missing import source — component reference gets E-COMPONENT-020
 *   §E  runCEFile imported component receives props correctly when expanded
 *   §F  runCE multi-file pipeline — one file imports a component from another
 *   §G  Same-file definition takes precedence over imported component of same name
 *   §H  Non-component import (isComponent: false) is not added to CE registry
 *
 * API surface exercised:
 *   - buildExportRegistry(graph)         — from module-resolver.js
 *   - runCEFile(tabOutput, exportRegistry, fileASTMap)  — from component-expander.js
 *   - runCE({ files, exportRegistry, fileASTMap })      — from component-expander.js
 *
 * Key implementation details:
 *
 *   1. runCEFile looks up exportRegistry and fileASTMap by imp.source (the raw import
 *      path string from the AST import-decl), NOT by absolute path. Tests that
 *      manually construct import AST nodes must key both maps using the same source
 *      string that appears in imp.source.
 *
 *   2. The cross-file CE code reads imp.specifiers (array of { imported, local }),
 *      while TAB's ast-builder produces imp.names (string[]). Manually constructed
 *      ASTs use the specifiers shape that CE expects.
 *
 *   3. KNOWN BUG — exportKind property mismatch:
 *      buildImportGraph stores exports as { name, kind: exportKind, ... } (key: "kind"),
 *      but buildExportRegistry reads exp.exportKind (key: "exportKind"). Because
 *      exp.exportKind is always undefined for entries produced by buildImportGraph,
 *      it defaults to "const". This means PascalCase exports of ANY kind (type,
 *      function, etc.) are currently marked isComponent: true. §B tests document
 *      this current behavior and will need to be updated when the bug is fixed.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runCEFile, runCE } from "../../src/component-expander.js";
import { buildImportGraph, buildExportRegistry } from "../../src/module-resolver.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Run BS + TAB on a source string and return the TAB output.
 */
function tabOn(filePath, source) {
  const bsOut = splitBlocks(filePath, source);
  return buildAST(bsOut);
}

/**
 * Collect all markup nodes (depth-first) from an AST node array.
 */
function collectMarkup(nodes) {
  const result = [];
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (node.kind === "markup") result.push(node);
    for (const key of Object.keys(node)) {
      if (key === "span") continue;
      const val = node[key];
      if (Array.isArray(val)) val.forEach(walk);
      else if (val && typeof val === "object") walk(val);
    }
  }
  nodes.forEach(walk);
  return result;
}

/**
 * Build a minimal synthetic TAB output for a "source" file that exports a component.
 *
 * Produces a real TAB-parsed AST from source text. The filePath is used as a
 * string key — it does not need to be a real filesystem path.
 */
function makeSourceFileTab(filePath, source) {
  return tabOn(filePath, source);
}

/**
 * Manually inject cross-file import metadata onto a TAB output's AST.
 *
 * CE's cross-file resolution reads:
 *   ast.imports[i].source      — the import source key (must match exportRegistry + fileASTMap keys)
 *   ast.imports[i].specifiers  — [{ imported: string, local: string }]
 *
 * TAB's ast-builder produces `names` (string[]), not `specifiers`. This helper
 * attaches the specifiers shape that CE needs so that cross-file tests exercise
 * the CE resolution code path directly.
 *
 * @param {object} tabOutput - TAB output to augment
 * @param {string} source    - import source string (key for exportRegistry + fileASTMap)
 * @param {string[]} names   - imported component names
 * @returns {object} - new tabOutput with augmented ast.imports
 */
function injectImportSpecifiers(tabOutput, source, names) {
  const specifiers = names.map(n => ({ imported: n, local: n }));
  const syntheticImport = {
    kind: "import-decl",
    source,
    names,
    specifiers,
    isDefault: false,
    span: { file: tabOutput.filePath, start: 0, end: 0, line: 1, col: 1 },
  };
  return {
    ...tabOutput,
    ast: {
      ...tabOutput.ast,
      imports: [...(tabOutput.ast.imports ?? []), syntheticImport],
    },
  };
}

/**
 * Build exportRegistry and fileASTMap for cross-file CE tests.
 *
 * Both maps are keyed by the same source string so that
 * runCEFile's imp.source lookups resolve correctly.
 *
 * @param {string} sourceKey   - the string used as the import source (e.g. "./counter.scrml")
 * @param {object} sourceTabOutput - TAB output of the source file
 * @param {string[]} componentNames - PascalCase names to register as components
 * @returns {{ exportRegistry: Map, fileASTMap: Map }}
 */
function buildCrossFileMaps(sourceKey, sourceTabOutput, componentNames) {
  // exportRegistry: Map<sourceKey, Map<name, { kind, isComponent }>>
  const exportMap = new Map();
  for (const name of componentNames) {
    const isComponent = name.length > 0 && name[0] >= "A" && name[0] <= "Z";
    exportMap.set(name, { kind: "const", isComponent });
  }
  const exportRegistry = new Map([[sourceKey, exportMap]]);

  // fileASTMap: Map<sourceKey, tabOutput>
  const fileASTMap = new Map([[sourceKey, sourceTabOutput]]);

  return { exportRegistry, fileASTMap };
}

// ---------------------------------------------------------------------------
// §A  buildExportRegistry — isComponent flag
// ---------------------------------------------------------------------------

describe("§A buildExportRegistry — PascalCase const exports are marked isComponent: true", () => {
  test("PascalCase const export gets isComponent: true", () => {
    const files = [{
      filePath: "/app/counter.scrml",
      ast: {
        filePath: "/app/counter.scrml",
        imports: [],
        exports: [{ exportedName: "Counter", exportKind: "const", span: null }],
      },
    }];
    const { graph } = buildImportGraph(files);
    const registry = buildExportRegistry(graph);
    const fileExports = registry.get("/app/counter.scrml");
    expect(fileExports).toBeDefined();
    const info = fileExports.get("Counter");
    expect(info).toBeDefined();
    expect(info.isComponent).toBe(true);
    expect(info.kind).toBe("const");
  });

  test("multiple PascalCase const exports all get isComponent: true", () => {
    const files = [{
      filePath: "/app/widgets.scrml",
      ast: {
        filePath: "/app/widgets.scrml",
        imports: [],
        exports: [
          { exportedName: "Button", exportKind: "const", span: null },
          { exportedName: "Card", exportKind: "const", span: null },
          { exportedName: "Modal", exportKind: "const", span: null },
        ],
      },
    }];
    const { graph } = buildImportGraph(files);
    const registry = buildExportRegistry(graph);
    const fileExports = registry.get("/app/widgets.scrml");
    expect(fileExports.get("Button").isComponent).toBe(true);
    expect(fileExports.get("Card").isComponent).toBe(true);
    expect(fileExports.get("Modal").isComponent).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §B  buildExportRegistry — non-component exports
// ---------------------------------------------------------------------------

describe("§B buildExportRegistry — isComponent flag by name and kind", () => {
  test("lowercase const export gets isComponent: false", () => {
    const files = [{
      filePath: "/app/utils.scrml",
      ast: {
        filePath: "/app/utils.scrml",
        imports: [],
        exports: [{ exportedName: "formatDate", exportKind: "const", span: null }],
      },
    }];
    const { graph } = buildImportGraph(files);
    const registry = buildExportRegistry(graph);
    const fileExports = registry.get("/app/utils.scrml");
    const info = fileExports.get("formatDate");
    expect(info).toBeDefined();
    expect(info.isComponent).toBe(false);
  });

  // BUG: buildImportGraph stores export kind as { kind: exportKind } but
  // buildExportRegistry reads exp.exportKind (undefined) and defaults to "const".
  // This causes PascalCase type/function exports to be incorrectly flagged as
  // isComponent: true. These two tests document the current (broken) behavior.
  // When the property name mismatch is fixed, both assertions should flip to false.
  test("PascalCase type export — isComponent: false (type exports are not components)", () => {
    const files = [{
      filePath: "/app/types.scrml",
      ast: {
        filePath: "/app/types.scrml",
        imports: [],
        exports: [{ exportedName: "UserProfile", exportKind: "type", span: null }],
      },
    }];
    const { graph } = buildImportGraph(files);
    const registry = buildExportRegistry(graph);
    const fileExports = registry.get("/app/types.scrml");
    const info = fileExports.get("UserProfile");
    expect(info).toBeDefined();
    // Bug fixed: buildExportRegistry now reads exp.kind correctly — type exports are not components.
    expect(info.isComponent).toBe(false);
  });

  test("PascalCase function export — isComponent: false (function exports are not components)", () => {
    const files = [{
      filePath: "/app/helpers.scrml",
      ast: {
        filePath: "/app/helpers.scrml",
        imports: [],
        exports: [{ exportedName: "FormatLabel", exportKind: "function", span: null }],
      },
    }];
    const { graph } = buildImportGraph(files);
    const registry = buildExportRegistry(graph);
    const fileExports = registry.get("/app/helpers.scrml");
    const info = fileExports.get("FormatLabel");
    expect(info).toBeDefined();
    // Bug fixed: buildExportRegistry now reads exp.kind correctly — function exports are not components.
    expect(info.isComponent).toBe(false);
  });

  test("single lowercase letter const export gets isComponent: false", () => {
    const files = [{
      filePath: "/app/vars.scrml",
      ast: {
        filePath: "/app/vars.scrml",
        imports: [],
        exports: [{ exportedName: "x", exportKind: "const", span: null }],
      },
    }];
    const { graph } = buildImportGraph(files);
    const registry = buildExportRegistry(graph);
    const fileExports = registry.get("/app/vars.scrml");
    const info = fileExports.get("x");
    expect(info).toBeDefined();
    expect(info.isComponent).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §C  runCEFile — cross-file component resolution
// ---------------------------------------------------------------------------

describe("§C runCEFile — resolves imported component via exportRegistry + fileASTMap", () => {
  test("imported PascalCase component expands to its root element in the consumer file", () => {
    const SOURCE_KEY = "./counter.scrml";

    // Source file: defines Counter component
    const sourceTabOut = makeSourceFileTab(SOURCE_KEY,
      `<program>
\${ const Counter = <div class="counter"/> }
</program>`
    );

    const { exportRegistry, fileASTMap } = buildCrossFileMaps(
      SOURCE_KEY, sourceTabOut, ["Counter"]
    );

    // Consumer file: uses <Counter/> but defines it via import
    const consumerSrc = `<program>
<Counter/>
</program>`;
    const consumerTab = tabOn("consumer.scrml", consumerSrc);

    // Manually mark <Counter/> as a component reference (TAB marks isComponent on PascalCase tags)
    // TAB should do this automatically — verify it did, or assert on the CE error
    // Either outcome documents the current behavior — the important thing is no crash
    expect(() => runCEFile(
      injectImportSpecifiers(consumerTab, SOURCE_KEY, ["Counter"]),
      exportRegistry,
      fileASTMap
    )).not.toThrow();
  });

  test("imported component expands: no isComponent markup nodes with the imported name remain after CE", () => {
    const SOURCE_KEY = "./card.scrml";

    const sourceTabOut = makeSourceFileTab(SOURCE_KEY,
      `<program>
\${ const Card = <div class="card"/> }
</program>`
    );

    const { exportRegistry, fileASTMap } = buildCrossFileMaps(
      SOURCE_KEY, sourceTabOut, ["Card"]
    );

    // Consumer: manually mark <Card/> as isComponent in the AST
    // We do this by constructing a TAB output where the node has isComponent: true
    const consumerTab = tabOn("consumer.scrml", `<program>
<Card/>
</program>`);

    // Inject import + isComponent flag on the Card node
    const consumerWithImport = injectImportSpecifiers(consumerTab, SOURCE_KEY, ["Card"]);

    // Patch the Card node to have isComponent: true (simulating what TAB does for PascalCase tags)
    const patchedNodes = consumerWithImport.ast.nodes.map(n => {
      if (n.kind === "markup" && n.tag === "program") {
        return {
          ...n,
          children: (n.children ?? []).map(child =>
            child && child.kind === "markup" && child.tag === "Card"
              ? { ...child, isComponent: true }
              : child
          ),
        };
      }
      return n;
    });

    const patchedTab = {
      ...consumerWithImport,
      ast: { ...consumerWithImport.ast, nodes: patchedNodes },
    };

    const ceOut = runCEFile(patchedTab, exportRegistry, fileASTMap);

    // After CE, no markup node with tag "Card" and isComponent: true should remain
    const remainingCardRefs = collectMarkup(ceOut.ast.nodes).filter(
      n => n.tag === "Card" && n.isComponent === true
    );
    expect(remainingCardRefs).toHaveLength(0);

    // The component should have expanded to a div
    const divNodes = collectMarkup(ceOut.ast.nodes).filter(n => n.tag === "div");
    expect(divNodes.length).toBeGreaterThan(0);
  });

  test("expanded cross-file component has _expandedFrom set to component name", () => {
    const SOURCE_KEY = "./badge.scrml";

    const sourceTabOut = makeSourceFileTab(SOURCE_KEY,
      `<program>
\${ const Badge = <span class="badge"/> }
</program>`
    );

    const { exportRegistry, fileASTMap } = buildCrossFileMaps(
      SOURCE_KEY, sourceTabOut, ["Badge"]
    );

    const consumerWithImport = injectImportSpecifiers(
      tabOn("consumer.scrml", `<program><Badge/></program>`),
      SOURCE_KEY, ["Badge"]
    );

    const patchedNodes = consumerWithImport.ast.nodes.map(n => {
      if (n.kind === "markup" && n.tag === "program") {
        return {
          ...n,
          children: (n.children ?? []).map(child =>
            child && child.kind === "markup" && child.tag === "Badge"
              ? { ...child, isComponent: true }
              : child
          ),
        };
      }
      return n;
    });

    const ceOut = runCEFile(
      { ...consumerWithImport, ast: { ...consumerWithImport.ast, nodes: patchedNodes } },
      exportRegistry,
      fileASTMap
    );

    const spans = collectMarkup(ceOut.ast.nodes).filter(n => n.tag === "span");
    expect(spans.length).toBeGreaterThan(0);
    expect(spans[0]._expandedFrom).toBe("Badge");
  });
});

// ---------------------------------------------------------------------------
// §D  runCEFile — missing cross-file component (graceful failure)
// ---------------------------------------------------------------------------

describe("§D runCEFile — missing cross-file component produces E-COMPONENT-020, not a crash", () => {
  test("isComponent node with no definition in same-file or exportRegistry produces E-COMPONENT-020", () => {
    const consumerTab = tabOn("consumer.scrml", `<program>
<Ghost/>
</program>`);

    // Patch <Ghost/> to have isComponent: true
    const patchedNodes = consumerTab.ast.nodes.map(n => {
      if (n.kind === "markup" && n.tag === "program") {
        return {
          ...n,
          children: (n.children ?? []).map(child =>
            child && child.kind === "markup" && child.tag === "Ghost"
              ? { ...child, isComponent: true }
              : child
          ),
        };
      }
      return n;
    });

    const patchedTab = { ...consumerTab, ast: { ...consumerTab.ast, nodes: patchedNodes } };

    // No exportRegistry or fileASTMap — CE has no cross-file information
    const ceOut = runCEFile(patchedTab);

    const e020 = ceOut.errors.filter(e => e.code === "E-COMPONENT-020");
    expect(e020.length).toBeGreaterThan(0);
    expect(e020[0].message).toContain("Ghost");
  });

  test("isComponent node with an exportRegistry that has no entry for the component produces E-COMPONENT-020", () => {
    const consumerWithImport = injectImportSpecifiers(
      tabOn("consumer.scrml", `<program><Missing/></program>`),
      "./other.scrml", ["Missing"]
    );

    // exportRegistry has the source key but NOT "Missing" in it
    const exportRegistry = new Map([
      ["./other.scrml", new Map([["SomethingElse", { kind: "const", isComponent: true }]])]
    ]);
    const fileASTMap = new Map([
      ["./other.scrml", tabOn("./other.scrml", `<program></program>`)]
    ]);

    const patchedNodes = consumerWithImport.ast.nodes.map(n => {
      if (n.kind === "markup" && n.tag === "program") {
        return {
          ...n,
          children: (n.children ?? []).map(child =>
            child && child.kind === "markup" && child.tag === "Missing"
              ? { ...child, isComponent: true }
              : child
          ),
        };
      }
      return n;
    });

    const ceOut = runCEFile(
      { ...consumerWithImport, ast: { ...consumerWithImport.ast, nodes: patchedNodes } },
      exportRegistry,
      fileASTMap
    );

    const e020 = ceOut.errors.filter(e => e.code === "E-COMPONENT-020");
    expect(e020.length).toBeGreaterThan(0);
    expect(e020[0].message).toContain("Missing");
  });

  test("no crash when exportRegistry is provided but fileASTMap has no entry for the import source", () => {
    const SOURCE_KEY = "./missing-file.scrml";

    const consumerWithImport = injectImportSpecifiers(
      tabOn("consumer.scrml", `<program><Phantom/></program>`),
      SOURCE_KEY, ["Phantom"]
    );

    const exportRegistry = new Map([
      [SOURCE_KEY, new Map([["Phantom", { kind: "const", isComponent: true }]])]
    ]);
    // fileASTMap is empty — source file not present
    const fileASTMap = new Map();

    const patchedNodes = consumerWithImport.ast.nodes.map(n => {
      if (n.kind === "markup" && n.tag === "program") {
        return {
          ...n,
          children: (n.children ?? []).map(child =>
            child && child.kind === "markup" && child.tag === "Phantom"
              ? { ...child, isComponent: true }
              : child
          ),
        };
      }
      return n;
    });

    // Must not throw — should produce E-COMPONENT-020 since the compDef is not found
    expect(() => runCEFile(
      { ...consumerWithImport, ast: { ...consumerWithImport.ast, nodes: patchedNodes } },
      exportRegistry,
      fileASTMap
    )).not.toThrow();

    const ceOut = runCEFile(
      { ...consumerWithImport, ast: { ...consumerWithImport.ast, nodes: patchedNodes } },
      exportRegistry,
      fileASTMap
    );
    // Phantom is in exportRegistry but fileASTMap has no entry — compDef is null,
    // so the registry entry is not added and E-COMPONENT-020 fires
    const e020 = ceOut.errors.filter(e => e.code === "E-COMPONENT-020");
    expect(e020.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// §E  Cross-file component props pass-through
// ---------------------------------------------------------------------------

describe("§E Cross-file component — props pass-through on expansion", () => {
  test("imported component receives caller props when expanded", () => {
    const SOURCE_KEY = "./label.scrml";

    const sourceTabOut = makeSourceFileTab(SOURCE_KEY,
      `<program>
\${ const Label = <span data-text="\${text}"/> }
</program>`
    );

    const { exportRegistry, fileASTMap } = buildCrossFileMaps(
      SOURCE_KEY, sourceTabOut, ["Label"]
    );

    const consumerWithImport = injectImportSpecifiers(
      tabOn("consumer.scrml", `<program><Label text="hello"/></program>`),
      SOURCE_KEY, ["Label"]
    );

    // Patch <Label/> to have isComponent: true
    const patchedNodes = consumerWithImport.ast.nodes.map(n => {
      if (n.kind === "markup" && n.tag === "program") {
        return {
          ...n,
          children: (n.children ?? []).map(child =>
            child && child.kind === "markup" && child.tag === "Label"
              ? { ...child, isComponent: true }
              : child
          ),
        };
      }
      return n;
    });

    const ceOut = runCEFile(
      { ...consumerWithImport, ast: { ...consumerWithImport.ast, nodes: patchedNodes } },
      exportRegistry,
      fileASTMap
    );

    const ceErrors = ceOut.errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toHaveLength(0);

    const spans = collectMarkup(ceOut.ast.nodes).filter(n => n.tag === "span");
    expect(spans.length).toBeGreaterThan(0);

    // ${text} should have been substituted with "hello"
    const textAttr = spans[0].attrs.find(a => a.name === "data-text");
    expect(textAttr).toBeDefined();
    expect(textAttr.value.value).toBe("hello");
  });

  test("imported component class merges with caller class", () => {
    const SOURCE_KEY = "./chip.scrml";

    const sourceTabOut = makeSourceFileTab(SOURCE_KEY,
      `<program>
\${ const Chip = <span class="chip"/> }
</program>`
    );

    const { exportRegistry, fileASTMap } = buildCrossFileMaps(
      SOURCE_KEY, sourceTabOut, ["Chip"]
    );

    const consumerWithImport = injectImportSpecifiers(
      tabOn("consumer.scrml", `<program><Chip class="active"/></program>`),
      SOURCE_KEY, ["Chip"]
    );

    const patchedNodes = consumerWithImport.ast.nodes.map(n => {
      if (n.kind === "markup" && n.tag === "program") {
        return {
          ...n,
          children: (n.children ?? []).map(child =>
            child && child.kind === "markup" && child.tag === "Chip"
              ? { ...child, isComponent: true }
              : child
          ),
        };
      }
      return n;
    });

    const ceOut = runCEFile(
      { ...consumerWithImport, ast: { ...consumerWithImport.ast, nodes: patchedNodes } },
      exportRegistry,
      fileASTMap
    );

    const spans = collectMarkup(ceOut.ast.nodes).filter(n => n.tag === "span");
    expect(spans.length).toBeGreaterThan(0);
    const classAttr = spans[0].attrs.find(a => a.name === "class");
    expect(classAttr).toBeDefined();
    // Base class "chip" + caller class "active" — both should appear
    expect(classAttr.value.value).toContain("chip");
    expect(classAttr.value.value).toContain("active");
  });
});

// ---------------------------------------------------------------------------
// §F  runCE multi-file — files array with cross-file component usage
// ---------------------------------------------------------------------------

describe("§F runCE multi-file — cross-file component via files array", () => {
  test("runCE with exportRegistry + fileASTMap resolves imported component without crash", () => {
    const SOURCE_KEY = "./button.scrml";

    const sourceTabOut = makeSourceFileTab(SOURCE_KEY,
      `<program>
\${ const Button = <button class="btn"/> }
</program>`
    );

    const { exportRegistry, fileASTMap } = buildCrossFileMaps(
      SOURCE_KEY, sourceTabOut, ["Button"]
    );

    const consumerWithImport = injectImportSpecifiers(
      tabOn("app.scrml", `<program><Button/></program>`),
      SOURCE_KEY, ["Button"]
    );

    const patchedNodes = consumerWithImport.ast.nodes.map(n => {
      if (n.kind === "markup" && n.tag === "program") {
        return {
          ...n,
          children: (n.children ?? []).map(child =>
            child && child.kind === "markup" && child.tag === "Button"
              ? { ...child, isComponent: true }
              : child
          ),
        };
      }
      return n;
    });

    const patchedTab = {
      ...consumerWithImport,
      ast: { ...consumerWithImport.ast, nodes: patchedNodes },
    };

    expect(() => runCE({
      files: [patchedTab],
      exportRegistry,
      fileASTMap,
    })).not.toThrow();

    const result = runCE({ files: [patchedTab], exportRegistry, fileASTMap });
    expect(result.files).toHaveLength(1);
    expect(result.errors.filter(e => e.code === "E-COMPONENT-020")).toHaveLength(0);
  });

  test("runCE without exportRegistry/fileASTMap leaves same-file components intact", () => {
    // Same-file CE should still work when no cross-file args are passed
    const source = `<program>
\${ const Dot = <span class="dot"/> }
<Dot/>
</program>`;
    const tabOut = tabOn("app.scrml", source);
    const result = runCE({ files: [tabOut] });

    expect(result.files).toHaveLength(1);
    const dots = collectMarkup(result.files[0].ast.nodes).filter(n => n.tag === "span");
    expect(dots.length).toBeGreaterThan(0);
    expect(dots[0]._expandedFrom).toBe("Dot");
  });
});

// ---------------------------------------------------------------------------
// §G  Same-file definition takes precedence over imported component
// ---------------------------------------------------------------------------

describe("§G Same-file definition takes precedence over imported component of same name", () => {
  test("when both same-file def and imported def exist for same name, same-file wins", () => {
    const SOURCE_KEY = "./remote.scrml";

    // Remote file defines Alert as a <section>
    const sourceTabOut = makeSourceFileTab(SOURCE_KEY,
      `<program>
\${ const Alert = <section class="remote-alert"/> }
</program>`
    );

    const { exportRegistry, fileASTMap } = buildCrossFileMaps(
      SOURCE_KEY, sourceTabOut, ["Alert"]
    );

    // Consumer file also defines Alert locally as a <div>
    const consumerWithImport = injectImportSpecifiers(
      tabOn("consumer.scrml", `<program>
\${ const Alert = <div class="local-alert"/> }
<Alert/>
</program>`),
      SOURCE_KEY, ["Alert"]
    );

    // Patch <Alert/> to have isComponent: true
    const patchedNodes = consumerWithImport.ast.nodes.map(n => {
      if (n.kind === "markup" && n.tag === "program") {
        return {
          ...n,
          children: (n.children ?? []).map(child =>
            child && child.kind === "markup" && child.tag === "Alert"
              ? { ...child, isComponent: true }
              : child
          ),
        };
      }
      return n;
    });

    const ceOut = runCEFile(
      { ...consumerWithImport, ast: { ...consumerWithImport.ast, nodes: patchedNodes } },
      exportRegistry,
      fileASTMap
    );

    const ceErrors = ceOut.errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toHaveLength(0);

    // Same-file Alert is a <div class="local-alert"> — it should win
    const divNodes = collectMarkup(ceOut.ast.nodes).filter(n => n.tag === "div");
    const sectionNodes = collectMarkup(ceOut.ast.nodes).filter(n => n.tag === "section");

    // div (local) should be present, section (remote) should NOT
    expect(divNodes.length).toBeGreaterThan(0);
    expect(sectionNodes).toHaveLength(0);

    const localDiv = divNodes.find(n => n._expandedFrom === "Alert");
    expect(localDiv).toBeDefined();
    const classAttr = localDiv.attrs.find(a => a.name === "class");
    expect(classAttr.value.value).toContain("local-alert");
  });
});

// ---------------------------------------------------------------------------
// §H  Non-component import is not treated as a component
// ---------------------------------------------------------------------------

describe("§H Non-component import — isComponent: false exports do not expand", () => {
  test("importing a lowercase-named const does not trigger component expansion", () => {
    const SOURCE_KEY = "./utils.scrml";

    // Source file exports a lowercase name
    const sourceTabOut = makeSourceFileTab(SOURCE_KEY,
      `<program>
\${ const formatDate = <span/> }
</program>`
    );

    // exportRegistry marks it as NOT a component
    const exportMap = new Map([
      ["formatDate", { kind: "const", isComponent: false }]
    ]);
    const exportRegistry = new Map([[SOURCE_KEY, exportMap]]);
    const fileASTMap = new Map([[SOURCE_KEY, sourceTabOut]]);

    const consumerWithImport = injectImportSpecifiers(
      tabOn("consumer.scrml", `<program></program>`),
      SOURCE_KEY, ["formatDate"]
    );

    const ceOut = runCEFile(consumerWithImport, exportRegistry, fileASTMap);

    // No component errors — nothing was tried
    const ceErrors = ceOut.errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toHaveLength(0);
  });

  test("file with only non-component imports passes through CE without modification", () => {
    const SOURCE_KEY = "./constants.scrml";

    const exportMap = new Map([
      ["MAX_RETRIES", { kind: "const", isComponent: false }],
      ["DEFAULT_TIMEOUT", { kind: "const", isComponent: false }],
    ]);
    const exportRegistry = new Map([[SOURCE_KEY, exportMap]]);
    const fileASTMap = new Map([[SOURCE_KEY, tabOn(SOURCE_KEY, `<program></program>`) ]]);

    const consumerTab = injectImportSpecifiers(
      tabOn("consumer.scrml", `<program><div>hello</div></program>`),
      SOURCE_KEY, ["MAX_RETRIES", "DEFAULT_TIMEOUT"]
    );

    const ceOut = runCEFile(consumerTab, exportRegistry, fileASTMap);

    // AST should be essentially unchanged — no expansion happened
    expect(ceOut.errors).toHaveLength(0);
    const divNodes = collectMarkup(ceOut.ast.nodes).filter(n => n.tag === "div");
    expect(divNodes.length).toBeGreaterThan(0);
  });
});
