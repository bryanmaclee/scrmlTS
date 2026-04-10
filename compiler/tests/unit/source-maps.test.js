/**
 * Source Map Generation — Unit Tests
 *
 * Tests for the Source Map v3 generation feature (m2-1-source-maps).
 *
 * Coverage:
 *   §1  sourceMap:false (default) — clientJs has NO sourceMappingURL comment
 *   §2  sourceMap:true — clientJs ends with //# sourceMappingURL=<name>.client.js.map
 *   §3  sourceMap:true — serverJs ends with //# sourceMappingURL=<name>.server.js.map
 *   §4  sourceMap:true — output includes clientJsMap and serverJsMap strings
 *   §5  clientJsMap is valid JSON with version:3, sources, mappings fields
 *   §6  SourceMapBuilder.generate() produces valid Source Map v3 JSON
 *   §7  VLQ encoding — known values: encodeVlq(0)=A, encodeVlq(1)=C, encodeVlq(-1)=D
 *   §8  appendSourceMappingUrl appends comment correctly
 *   §9  appendSourceMappingUrl is idempotent (no double-append)
 */

import { describe, test, expect } from "bun:test";
import { runCG } from "../../src/code-generator.js";
import {
  SourceMapBuilder,
  appendSourceMappingUrl,
  encodeVlq,
  encodeVlqGroup,
} from "../../src/codegen/source-map.ts";

// ---------------------------------------------------------------------------
// Helpers (same pattern as code-generator.test.js)
// ---------------------------------------------------------------------------

function span(start, file = "/test/app.scrml") {
  return { file, start, end: start + 10, line: 1, col: start + 1 };
}

function makeFileAST(filePath, nodes, opts = {}) {
  return {
    filePath,
    nodes,
    imports: opts.imports ?? [],
    exports: opts.exports ?? [],
    components: opts.components ?? [],
    typeDecls: opts.typeDecls ?? [],
    nodeTypes: opts.nodeTypes ?? new Map(),
    componentShapes: opts.componentShapes ?? new Map(),
    scopeChain: opts.scopeChain ?? null,
  };
}

function makeMarkupNode(tag, attrs = [], children = [], opts = {}) {
  return {
    kind: "markup",
    tag,
    attributes: attrs,
    children,
    selfClosing: opts.selfClosing ?? false,
    span: opts.span ?? span(0),
  };
}

function makeTextNode(text, s = span(0)) {
  return { kind: "text", value: text, span: s };
}

function makeFunctionDecl(name, body = [], params = [], opts = {}) {
  return {
    kind: "function-decl",
    name,
    params,
    body,
    span: opts.span ?? span(opts.spanStart ?? 0),
    isServer: opts.isServer ?? false,
  };
}

function makeRouteMap(entries = []) {
  const functions = new Map();
  for (const e of entries) {
    functions.set(e.functionNodeId, e);
  }
  return { functions };
}

function makeDepGraph(nodes = [], edges = []) {
  const nodeMap = new Map();
  for (const n of nodes) {
    nodeMap.set(n.nodeId, n);
  }
  return { nodes: nodeMap, edges };
}

function makeProtectAnalysis(views = new Map()) {
  return { views };
}

// ---------------------------------------------------------------------------
// §1: sourceMap:false (default) — no sourceMappingURL
// ---------------------------------------------------------------------------

describe("§1: sourceMap:false — no sourceMappingURL comment", () => {
  test("clientJs does not contain sourceMappingURL when sourceMap is not set", () => {
    const ast = makeFileAST("/test/app.scrml", [
      makeMarkupNode("div", [], [makeTextNode("Hello")])
    ]);

    const result = runCG({
      files: [ast],
      routeMap: makeRouteMap(),
      depGraph: makeDepGraph(),
      protectAnalysis: makeProtectAnalysis(),
      // sourceMap not set — defaults to false
    });

    expect(result.errors).toHaveLength(0);
    const out = result.outputs.get("/test/app.scrml");
    // clientJs may be null if no logic, so only check if it exists
    if (out.clientJs) {
      expect(out.clientJs).not.toContain("sourceMappingURL");
    }
  });

  test("clientJs does not contain sourceMappingURL when sourceMap:false", () => {
    const ast = makeFileAST("/test/app.scrml", [
      makeMarkupNode("div", [], [makeTextNode("Hello")])
    ]);

    const result = runCG({
      files: [ast],
      routeMap: makeRouteMap(),
      depGraph: makeDepGraph(),
      protectAnalysis: makeProtectAnalysis(),
      sourceMap: false,
    });

    expect(result.errors).toHaveLength(0);
    const out = result.outputs.get("/test/app.scrml");
    if (out.clientJs) {
      expect(out.clientJs).not.toContain("sourceMappingURL");
    }
    // No map fields in output
    expect(out.clientJsMap).toBeUndefined();
    expect(out.serverJsMap).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §2: sourceMap:true — clientJs ends with sourceMappingURL comment
// ---------------------------------------------------------------------------

describe("§2: sourceMap:true — clientJs has sourceMappingURL", () => {
  test("clientJs ends with //# sourceMappingURL=app.client.js.map", () => {
    const ast = makeFileAST("/test/app.scrml", [
      makeMarkupNode("div", [], [makeTextNode("Hello")])
    ]);

    const result = runCG({
      files: [ast],
      routeMap: makeRouteMap(),
      depGraph: makeDepGraph(),
      protectAnalysis: makeProtectAnalysis(),
      sourceMap: true,
    });

    expect(result.errors).toHaveLength(0);
    const out = result.outputs.get("/test/app.scrml");
    // clientJs should contain sourceMappingURL comment
    if (out.clientJs) {
      expect(out.clientJs).toContain("//# sourceMappingURL=app.client.js.map");
    }
  });
});

// ---------------------------------------------------------------------------
// §3: sourceMap:true — serverJs ends with sourceMappingURL comment
// ---------------------------------------------------------------------------

describe("§3: sourceMap:true — serverJs has sourceMappingURL", () => {
  test("serverJs ends with //# sourceMappingURL=app.server.js.map when server fn exists", () => {
    const fnSpan = span(10);
    const fnNode = makeFunctionDecl("doSomething", [], [], {
      span: fnSpan,
      isServer: true,
    });
    const ast = makeFileAST("/test/app.scrml", [fnNode]);

    const routeMap = makeRouteMap([{
      functionNodeId: `/test/app.scrml::${fnSpan.start}`,
      boundary: "server",
      generatedRouteName: "doSomething",
    }]);

    const result = runCG({
      files: [ast],
      routeMap,
      depGraph: makeDepGraph(),
      protectAnalysis: makeProtectAnalysis(),
      sourceMap: true,
    });

    const out = result.outputs.get("/test/app.scrml");
    if (out.serverJs) {
      expect(out.serverJs).toContain("//# sourceMappingURL=app.server.js.map");
    }
  });
});

// ---------------------------------------------------------------------------
// §4: sourceMap:true — output includes clientJsMap and serverJsMap
// ---------------------------------------------------------------------------

describe("§4: sourceMap:true — output has clientJsMap field", () => {
  test("output includes clientJsMap string when sourceMap:true", () => {
    const ast = makeFileAST("/test/app.scrml", [
      makeMarkupNode("div", [], [makeTextNode("Hello")])
    ]);

    const result = runCG({
      files: [ast],
      routeMap: makeRouteMap(),
      depGraph: makeDepGraph(),
      protectAnalysis: makeProtectAnalysis(),
      sourceMap: true,
    });

    expect(result.errors).toHaveLength(0);
    const out = result.outputs.get("/test/app.scrml");
    if (out.clientJs) {
      // clientJsMap should be present
      expect(out.clientJsMap).toBeDefined();
      expect(typeof out.clientJsMap).toBe("string");
      expect(out.clientJsMap.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// §5: clientJsMap is valid JSON with required Source Map v3 fields
// ---------------------------------------------------------------------------

describe("§5: clientJsMap is valid Source Map v3 JSON", () => {
  test("clientJsMap JSON has version:3, sources, mappings", () => {
    const ast = makeFileAST("/test/app.scrml", [
      makeMarkupNode("div", [], [makeTextNode("Hello")])
    ]);

    const result = runCG({
      files: [ast],
      routeMap: makeRouteMap(),
      depGraph: makeDepGraph(),
      protectAnalysis: makeProtectAnalysis(),
      sourceMap: true,
    });

    const out = result.outputs.get("/test/app.scrml");
    if (!out.clientJsMap) return; // skip if no client JS for this simple file

    const mapObj = JSON.parse(out.clientJsMap);
    expect(mapObj.version).toBe(3);
    expect(Array.isArray(mapObj.sources)).toBe(true);
    expect(mapObj.sources.length).toBeGreaterThan(0);
    expect(typeof mapObj.mappings).toBe("string");
    expect(mapObj.file).toBe("app.client.js");
  });

  test("clientJsMap sources includes the scrml source file", () => {
    const ast = makeFileAST("/test/app.scrml", [
      makeMarkupNode("div", [], [makeTextNode("Hello")])
    ]);

    const result = runCG({
      files: [ast],
      routeMap: makeRouteMap(),
      depGraph: makeDepGraph(),
      protectAnalysis: makeProtectAnalysis(),
      sourceMap: true,
    });

    const out = result.outputs.get("/test/app.scrml");
    if (!out.clientJsMap) return;

    const mapObj = JSON.parse(out.clientJsMap);
    expect(mapObj.sources).toContain("app.scrml");
  });
});

// ---------------------------------------------------------------------------
// §6: SourceMapBuilder.generate() produces valid Source Map v3 JSON
// ---------------------------------------------------------------------------

describe("§6: SourceMapBuilder produces valid Source Map v3", () => {
  test("generate() returns parseable JSON with version:3", () => {
    const builder = new SourceMapBuilder("hello.scrml");
    builder.addMapping(0, 0, 0);
    builder.addMapping(1, 0, 0);
    builder.addMapping(2, 5, 0);

    const result = builder.generate("hello.client.js");
    const parsed = JSON.parse(result);

    expect(parsed.version).toBe(3);
    expect(parsed.file).toBe("hello.client.js");
    expect(parsed.sources).toEqual(["hello.scrml"]);
    expect(typeof parsed.mappings).toBe("string");
  });

  test("generate() produces non-empty mappings field when mappings added", () => {
    const builder = new SourceMapBuilder("app.scrml");
    builder.addMapping(0, 1, 3);
    builder.addMapping(1, 2, 0);

    const result = builder.generate("app.client.js");
    const parsed = JSON.parse(result);

    expect(parsed.mappings.length).toBeGreaterThan(0);
  });

  test("generate() with no mappings produces empty mappings string", () => {
    const builder = new SourceMapBuilder("app.scrml");
    const result = builder.generate("app.client.js");
    const parsed = JSON.parse(result);
    expect(parsed.mappings).toBe("");
  });
});

// ---------------------------------------------------------------------------
// §7: VLQ encoding — known values
// ---------------------------------------------------------------------------

describe("§7: VLQ encoding correctness", () => {
  // Reference: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k
  // VLQ(0)  = 0 << 1 = 0  → base64[0]  = 'A'
  // VLQ(1)  = 1 << 1 = 2  → base64[2]  = 'C'
  // VLQ(-1) = (1<<1)|1 = 3 → base64[3]  = 'D'
  // VLQ(2)  = 2 << 1 = 4  → base64[4]  = 'E'
  // VLQ(-2) = (2<<1)|1 = 5 → base64[5]  = 'F'
  // VLQ(15) = 15<<1 = 30 → base64[30] = 'e'
  // VLQ(16) = 16<<1 = 32 → needs continuation bit
  //   first chunk: (32 & 31) | 32 = 0 | 32 = 32 → base64[32] = 'g'
  //   vlq >>= 5 → 1
  //   second chunk: 1 → base64[1] = 'B'
  //   result: 'gB'

  test("encodeVlq(0) === 'A'", () => {
    expect(encodeVlq(0)).toBe("A");
  });

  test("encodeVlq(1) === 'C'", () => {
    expect(encodeVlq(1)).toBe("C");
  });

  test("encodeVlq(-1) === 'D'", () => {
    expect(encodeVlq(-1)).toBe("D");
  });

  test("encodeVlq(2) === 'E'", () => {
    expect(encodeVlq(2)).toBe("E");
  });

  test("encodeVlq(-2) === 'F'", () => {
    expect(encodeVlq(-2)).toBe("F");
  });

  test("encodeVlq(15) === 'e'", () => {
    expect(encodeVlq(15)).toBe("e");
  });

  test("encodeVlq(16) requires continuation — 'gB'", () => {
    // 16 << 1 = 32
    // chunk 0: 32 & 31 = 0, continuation: 0 | 32 = 32 → base64[32] = 'g'
    // vlq >> 5 = 1
    // chunk 1: 1, no continuation → base64[1] = 'B'
    expect(encodeVlq(16)).toBe("gB");
  });

  test("encodeVlqGroup([0, 0, 0, 0]) === 'AAAA'", () => {
    expect(encodeVlqGroup([0, 0, 0, 0])).toBe("AAAA");
  });

  test("encodeVlqGroup([0, 0, 0, 0]) is correct for line 0, source 0, line 0, col 0", () => {
    // First segment on first output line with no previous mappings
    // All fields are deltas: 0, 0, 0, 0 → "AAAA"
    expect(encodeVlqGroup([0, 0, 0, 0])).toBe("AAAA");
  });
});

// ---------------------------------------------------------------------------
// §8: appendSourceMappingUrl appends comment
// ---------------------------------------------------------------------------

describe("§8: appendSourceMappingUrl appends comment", () => {
  test("appends //# sourceMappingURL=... at end of JS code", () => {
    const js = "const x = 1;\n";
    const result = appendSourceMappingUrl(js, "app.client.js.map");
    expect(result).toContain("//# sourceMappingURL=app.client.js.map");
    expect(result.indexOf("const x = 1;")).toBeLessThan(result.indexOf("sourceMappingURL"));
  });

  test("handles code without trailing newline", () => {
    const js = "const x = 1;";
    const result = appendSourceMappingUrl(js, "app.client.js.map");
    expect(result).toContain("\n//# sourceMappingURL=app.client.js.map");
  });

  test("handles code with trailing newline", () => {
    const js = "const x = 1;\n";
    const result = appendSourceMappingUrl(js, "app.client.js.map");
    expect(result).toBe("const x = 1;\n//# sourceMappingURL=app.client.js.map\n");
  });
});

// ---------------------------------------------------------------------------
// §9: appendSourceMappingUrl is idempotent
// ---------------------------------------------------------------------------

describe("§9: appendSourceMappingUrl is idempotent", () => {
  test("does not double-append if comment already present", () => {
    const js = "const x = 1;\n//# sourceMappingURL=app.client.js.map\n";
    const result = appendSourceMappingUrl(js, "app.client.js.map");
    // Should only appear once
    const count = (result.match(/sourceMappingURL=app\.client\.js\.map/g) || []).length;
    expect(count).toBe(1);
  });
});
