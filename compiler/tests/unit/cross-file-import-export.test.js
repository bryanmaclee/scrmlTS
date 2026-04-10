/**
 * Cross-file import/export — Unit Tests
 *
 * Coverage:
 *   §A  Type registry seeding — imported enum types are recognized in TS
 *   §B  Type registry seeding — imported struct types are recognized in TS
 *   §C  Local type declarations win over imported types (local takes precedence)
 *   §D  processFile with no importedTypes — single-file behavior unchanged
 *   §E  runTS with importedTypesByFile — type visible across files
 *   §G  emit-client.ts — .scrml import source rewritten to .client.js
 *   §H  emit-client.ts — .js import source NOT rewritten (passes through)
 *   §I  emit-client.ts — scrml: and vendor: imports emit as real JS import statements (§41.3)
 *   §J  emit-client.ts — multiple stdlib imports + import+usage in same file
 *
 * API surface exercised:
 *   - runTS({ files, protectAnalysis, routeMap, importedTypesByFile })
 *   - buildTypeRegistry(typeDecls, errors, fileSpan)    (directly in §A-C)
 *   - generateClientJs(ctx)                             (in §G-J)
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runTS, buildTypeRegistry } from "../../src/type-system.ts";
import { generateClientJs } from "../../src/codegen/emit-client.ts";
import { makeCompileContext } from "../../src/codegen/context.ts";
import { BindingRegistry } from "../../src/codegen/binding-registry.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY_SPAN = { file: "test.scrml", start: 0, end: 0, line: 1, col: 1 };
const EMPTY_PROTECT = { views: new Map() };
const EMPTY_ROUTE = { functions: new Map() };

// Scrml logic delimiter — avoids template literal interpolation issues in test sources.
const OPEN = "${";
const CLOSE = "}";

/**
 * Run BS + TAB on a source string and return the TAB output.
 */
function tabOn(filePath, source) {
  const bsOut = splitBlocks(filePath, source);
  return buildAST(bsOut);
}

/**
 * Build a minimal type-decl node for testing.
 */
function makeTypeDecl(name, typeKind, raw) {
  return { kind: "type-decl", name, typeKind, raw };
}

/**
 * Build a minimal CompileContext for testing emit-client.ts directly.
 */
function makeTestCtx(fileAST) {
  return makeCompileContext({
    filePath: fileAST.filePath,
    fileAST,
    routeMap: { functions: new Map() },
    depGraph: { nodes: new Map(), edges: [] },
    protectedFields: new Map(),
    authMiddleware: null,
    middlewareConfig: null,
    csrfEnabled: false,
    encodingCtx: null,
    mode: "browser",
    testMode: false,
    dbVar: "_scrml_db",
    workerNames: [],
    errors: [],
    registry: new BindingRegistry(),
    derivedNames: new Set(),
    analysis: null,
    usedRuntimeChunks: new Set(["core", "scope", "errors", "transitions"]),
  });
}

// ---------------------------------------------------------------------------
// §A  Type registry seeding — imported enum types are recognized in TS
// ---------------------------------------------------------------------------

describe("§A  imported enum type seeding", () => {
  test("§A1  buildTypeRegistry produces correct enum from type-decl node", () => {
    const typeDecls = [
      makeTypeDecl("TaskStatus", "enum", "{ Todo, InProgress, Done }"),
    ];
    const registry = buildTypeRegistry(typeDecls, [], EMPTY_SPAN);

    const taskStatusType = registry.get("TaskStatus");
    expect(taskStatusType).toBeDefined();
    expect(taskStatusType.kind).toBe("enum");
    expect(taskStatusType.variants).toHaveLength(3);
    expect(taskStatusType.variants.map(v => v.name)).toEqual(["Todo", "InProgress", "Done"]);
  });

  test("§A2  imported enum type is seeded into runTS registry via importedTypesByFile", () => {
    // Simulate what api.js builds: a registry entry for TaskStatus from types.scrml
    const depsTypeDecls = [
      makeTypeDecl("TaskStatus", "enum", "{ Todo, InProgress, Done }"),
    ];
    const depRegistry = buildTypeRegistry(depsTypeDecls, [], EMPTY_SPAN);
    const taskStatusType = depRegistry.get("TaskStatus");

    // app.scrml imports TaskStatus
    const src = "<program>\n" + OPEN + " import { TaskStatus } from \"./types.scrml\" " + CLOSE + "\n</program>";
    const appAST = tabOn("/app/app.scrml", src);

    const importedTypes = new Map();
    importedTypes.set("TaskStatus", taskStatusType);
    const importedTypesByFile = new Map();
    importedTypesByFile.set("/app/app.scrml", importedTypes);

    const tsResult = runTS({
      files: [appAST],
      protectAnalysis: EMPTY_PROTECT,
      routeMap: EMPTY_ROUTE,
      importedTypesByFile,
    });

    expect(tsResult.files).toHaveLength(1);
    // No type-related errors from unknown TaskStatus
    const typeErrors = tsResult.errors.filter(e =>
      e.code && (e.code.startsWith("E-TYPE-") || e.code === "E-SCOPE-002")
    );
    expect(typeErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §B  Type registry seeding — imported struct types
// ---------------------------------------------------------------------------

describe("§B  imported struct type seeding", () => {
  test("§B1  buildTypeRegistry produces correct struct from type-decl node", () => {
    const typeDecls = [
      makeTypeDecl("Config", "struct", "{ timeout: number, retries: number }"),
    ];
    const registry = buildTypeRegistry(typeDecls, [], EMPTY_SPAN);

    const configType = registry.get("Config");
    expect(configType).toBeDefined();
    expect(configType.kind).toBe("struct");
    expect(configType.fields).toBeDefined();
    expect(configType.fields.has("timeout")).toBe(true);
    expect(configType.fields.has("retries")).toBe(true);
  });

  test("§B2  struct imported via importedTypesByFile does not cause type errors", () => {
    const depsTypeDecls = [
      makeTypeDecl("Config", "struct", "{ timeout: number, retries: number }"),
    ];
    const depRegistry = buildTypeRegistry(depsTypeDecls, [], EMPTY_SPAN);
    const configType = depRegistry.get("Config");

    const src = "<program>\n" + OPEN + " import { Config } from \"./config.scrml\" " + CLOSE + "\n</program>";
    const appAST = tabOn("/app/app.scrml", src);

    const importedTypes = new Map();
    importedTypes.set("Config", configType);
    const importedTypesByFile = new Map();
    importedTypesByFile.set("/app/app.scrml", importedTypes);

    const tsResult = runTS({
      files: [appAST],
      protectAnalysis: EMPTY_PROTECT,
      routeMap: EMPTY_ROUTE,
      importedTypesByFile,
    });

    expect(tsResult.files).toHaveLength(1);
    const typeErrors = tsResult.errors.filter(e =>
      e.code && e.code.startsWith("E-TYPE-")
    );
    expect(typeErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §C  Local type declarations win over imported types
// ---------------------------------------------------------------------------

describe("§C  local type wins over imported type", () => {
  test("§C1  local type is not overwritten by importedTypes of same name", () => {
    // Simulate an import providing Status with 2 variants
    const importedStatus = {
      kind: "enum",
      name: "Status",
      variants: [
        { name: "Active", payload: null },
        { name: "Inactive", payload: null },
      ],
    };

    // The local file declares Status with 3 variants
    const src = "<program>\n" + OPEN + "\n  import { Status } from \"./shared.scrml\"\n  type Status:enum = { Active, Inactive, Pending }\n" + CLOSE + "\n</program>";
    const appAST = tabOn("/app/app.scrml", src);

    const importedTypes = new Map();
    importedTypes.set("Status", importedStatus);
    const importedTypesByFile = new Map();
    importedTypesByFile.set("/app/app.scrml", importedTypes);

    const tsResult = runTS({
      files: [appAST],
      protectAnalysis: EMPTY_PROTECT,
      routeMap: EMPTY_ROUTE,
      importedTypesByFile,
    });

    // Should compile without crashing
    expect(tsResult.files).toHaveLength(1);
    // No fatal type errors
    const fatalErrors = tsResult.errors.filter(e =>
      e.severity !== "warning" && e.code && e.code.startsWith("E-TYPE-0")
    );
    expect(fatalErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §D  processFile with no importedTypes — single-file behavior unchanged
// ---------------------------------------------------------------------------

describe("§D  single-file behavior unchanged", () => {
  test("§D1  runTS without importedTypesByFile compiles single file correctly", () => {
    const src = "<program>\n" + OPEN + "\n  type Role:enum = { Admin, User }\n  @role:Role = .User\n" + CLOSE + "\n<p>hello</>\n</program>";
    const appAST = tabOn("/app/single.scrml", src);

    // No importedTypesByFile — backward-compatible
    const tsResult = runTS({
      files: [appAST],
      protectAnalysis: EMPTY_PROTECT,
      routeMap: EMPTY_ROUTE,
    });

    expect(tsResult.files).toHaveLength(1);
    // Role type must be recognized — no exhaustiveness errors
    const typeErrors = tsResult.errors.filter(e =>
      e.code === "E-TYPE-020" || e.code === "E-TYPE-006"
    );
    expect(typeErrors).toHaveLength(0);
  });

  test("§D2  runTS with empty importedTypesByFile — same as no map", () => {
    const src = "<program>\n" + OPEN + " const x = 42 " + CLOSE + "\n</program>";
    const appAST = tabOn("/app/single2.scrml", src);

    const tsResult = runTS({
      files: [appAST],
      protectAnalysis: EMPTY_PROTECT,
      routeMap: EMPTY_ROUTE,
      importedTypesByFile: new Map(), // empty map — no cross-file types
    });

    expect(tsResult.files).toHaveLength(1);
    expect(tsResult.errors.filter(e => e.severity !== "warning")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §E  runTS with importedTypesByFile — cross-file type visibility
// ---------------------------------------------------------------------------

describe("§E  runTS importedTypesByFile parameter", () => {
  test("§E1  file without imports is unaffected by importedTypesByFile", () => {
    const src = "<program>\n" + OPEN + " export type TaskStatus:enum = { Todo, Done } " + CLOSE + "\n</program>";
    const libAST = tabOn("/lib/types.scrml", src);

    const importedTypesByFile = new Map();
    // lib/types.scrml has no imports — nothing in the map for it

    const tsResult = runTS({
      files: [libAST],
      protectAnalysis: EMPTY_PROTECT,
      routeMap: EMPTY_ROUTE,
      importedTypesByFile,
    });

    expect(tsResult.files).toHaveLength(1);
    expect(tsResult.errors.filter(e => e.severity !== "warning")).toHaveLength(0);
  });

  test("§E2  multiple files — each gets its own importedTypes slice", () => {
    const libSrc = "<program>\n" + OPEN + " export type Color:enum = { Red, Green, Blue } " + CLOSE + "\n</program>";
    const libAST = tabOn("/lib/colors.scrml", libSrc);

    const appSrc = "<program>\n" + OPEN + " import { Color } from \"./colors.scrml\" " + CLOSE + "\n</program>";
    const appAST = tabOn("/app/app.scrml", appSrc);

    const libTypeDecls = [makeTypeDecl("Color", "enum", "{ Red, Green, Blue }")];
    const libRegistry = buildTypeRegistry(libTypeDecls, [], EMPTY_SPAN);

    const importedTypes = new Map();
    importedTypes.set("Color", libRegistry.get("Color"));

    const importedTypesByFile = new Map();
    // lib/colors.scrml has no imports — no entry for it
    // app.scrml imports Color — entry for it
    importedTypesByFile.set("/app/app.scrml", importedTypes);

    const tsResult = runTS({
      files: [libAST, appAST],
      protectAnalysis: EMPTY_PROTECT,
      routeMap: EMPTY_ROUTE,
      importedTypesByFile,
    });

    expect(tsResult.files).toHaveLength(2);
    const fatalErrors = tsResult.errors.filter(e => e.severity !== "warning");
    expect(fatalErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §G  emit-client.ts — .scrml import source rewritten to .client.js
// ---------------------------------------------------------------------------

describe("§G  .scrml import rewritten to .client.js", () => {
  test("§G1  ./types.scrml import becomes ./types.client.js in client JS", () => {
    const fileAST = {
      filePath: "/app/app.scrml",
      imports: [],
      exports: [],
      typeDecls: [],
      nodes: [],
      ast: {
        imports: [
          {
            kind: "import-decl",
            source: "./types.scrml",
            names: ["TaskStatus"],
            isDefault: false,
            raw: "import { TaskStatus } from \"./types.scrml\"",
          },
        ],
        nodes: [],
      },
    };

    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    expect(clientJs).toContain('import { TaskStatus } from "./types.client.js"');
    expect(clientJs).not.toContain('import { TaskStatus } from "./types.scrml"');
  });

  test("§G2  ../shared/types.scrml import is also rewritten correctly", () => {
    const fileAST = {
      filePath: "/app/pages/home.scrml",
      imports: [],
      exports: [],
      typeDecls: [],
      nodes: [],
      ast: {
        imports: [
          {
            kind: "import-decl",
            source: "../shared/types.scrml",
            names: ["UserRole"],
            isDefault: false,
            raw: "import { UserRole } from \"../shared/types.scrml\"",
          },
        ],
        nodes: [],
      },
    };

    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    expect(clientJs).toContain('import { UserRole } from "../shared/types.client.js"');
    expect(clientJs).not.toContain('../shared/types.scrml');
  });
});

// ---------------------------------------------------------------------------
// §H  emit-client.ts — .js import source NOT rewritten
// ---------------------------------------------------------------------------

describe("§H  .js import passes through unchanged", () => {
  test("§H1  ./helper.js import is not rewritten", () => {
    const fileAST = {
      filePath: "/app/app.scrml",
      imports: [],
      exports: [],
      typeDecls: [],
      nodes: [],
      ast: {
        imports: [
          {
            kind: "import-decl",
            source: "./helper.js",
            names: ["formatDate"],
            isDefault: false,
            raw: "import { formatDate } from \"./helper.js\"",
          },
        ],
        nodes: [],
      },
    };

    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    expect(clientJs).toContain('import { formatDate } from "./helper.js"');
  });
});

// ---------------------------------------------------------------------------
// §I  emit-client.ts — scrml: and vendor: imports emit as real JS import statements (§41.3)
//
// Per §41.3, scrml: prefixed imports are valid Bun module specifiers and must be
// emitted as real JS import statements in the client output. They are NOT commented
// out. vendor: imports follow the same rule.
// ---------------------------------------------------------------------------

describe("§I  scrml: and vendor: imports emit as real JS import statements", () => {
  test("§I1  scrml:http use-decl emits as a real import statement", () => {
    const fileAST = {
      filePath: "/app/app.scrml",
      imports: [],
      exports: [],
      typeDecls: [],
      nodes: [],
      ast: {
        imports: [
          {
            kind: "use-decl",
            source: "scrml:http",
            names: ["fetch"],
            isDefault: false,
            raw: "use scrml:http { fetch }",
          },
        ],
        nodes: [],
      },
    };

    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    // scrml: imports must emit as real import statements (§41.3)
    expect(clientJs).toContain('import { fetch } from "scrml:http"');
    // Must NOT be commented out
    expect(clientJs).not.toContain("// use-decl: use scrml:http { fetch }");
  });

  test("§I2  vendor: import emits as a real import statement", () => {
    const fileAST = {
      filePath: "/app/app.scrml",
      imports: [],
      exports: [],
      typeDecls: [],
      nodes: [],
      ast: {
        imports: [
          {
            kind: "import-decl",
            source: "vendor:lodash",
            names: ["debounce"],
            isDefault: false,
            raw: "import { debounce } from \"vendor:lodash\"",
          },
        ],
        nodes: [],
      },
    };

    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    // vendor: imports must emit as real import statements
    expect(clientJs).toContain('import { debounce } from "vendor:lodash"');
    // Must NOT be commented out
    expect(clientJs).not.toContain("// import-decl:");
  });

  test("§I3  scrml:crypto import emits correct named import statement", () => {
    const fileAST = {
      filePath: "/app/app.scrml",
      imports: [],
      exports: [],
      typeDecls: [],
      nodes: [],
      ast: {
        imports: [
          {
            kind: "import-decl",
            source: "scrml:crypto",
            names: ["hash"],
            isDefault: false,
            raw: "import { hash } from 'scrml:crypto'",
          },
        ],
        nodes: [],
      },
    };

    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    expect(clientJs).toContain('import { hash } from "scrml:crypto"');
  });
});

// ---------------------------------------------------------------------------
// §J  emit-client.ts — multiple stdlib imports + import+usage in same file
// ---------------------------------------------------------------------------

describe("§J  multiple stdlib imports emit correctly", () => {
  test("§J1  two scrml: imports in same file both emit as real import statements", () => {
    const fileAST = {
      filePath: "/app/app.scrml",
      imports: [],
      exports: [],
      typeDecls: [],
      nodes: [],
      ast: {
        imports: [
          {
            kind: "import-decl",
            source: "scrml:crypto",
            names: ["hash", "uuid"],
            isDefault: false,
            raw: "import { hash, uuid } from 'scrml:crypto'",
          },
          {
            kind: "import-decl",
            source: "scrml:auth",
            names: ["session"],
            isDefault: false,
            raw: "import { session } from 'scrml:auth'",
          },
        ],
        nodes: [],
      },
    };

    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    expect(clientJs).toContain('import { hash, uuid } from "scrml:crypto"');
    expect(clientJs).toContain('import { session } from "scrml:auth"');
    // Neither should be commented out
    expect(clientJs).not.toContain("// import-decl:");
  });

  test("§J2  scrml: import and local .scrml import coexist correctly", () => {
    const fileAST = {
      filePath: "/app/app.scrml",
      imports: [],
      exports: [],
      typeDecls: [],
      nodes: [],
      ast: {
        imports: [
          {
            kind: "import-decl",
            source: "scrml:crypto",
            names: ["hash"],
            isDefault: false,
            raw: "import { hash } from 'scrml:crypto'",
          },
          {
            kind: "import-decl",
            source: "./types.scrml",
            names: ["UserRole"],
            isDefault: false,
            raw: "import { UserRole } from './types.scrml'",
          },
        ],
        nodes: [],
      },
    };

    const ctx = makeTestCtx(fileAST);
    const clientJs = generateClientJs(ctx);

    // stdlib import passes through unchanged
    expect(clientJs).toContain('import { hash } from "scrml:crypto"');
    // local .scrml import is rewritten to .client.js
    expect(clientJs).toContain('import { UserRole } from "./types.client.js"');
    // original .scrml path must not appear
    expect(clientJs).not.toContain('./types.scrml');
  });
});
