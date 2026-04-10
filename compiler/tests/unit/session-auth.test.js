/**
 * Session/Auth (Option C Hybrid) -- Unit Tests
 *
 * Tests for session/auth support across the pipeline:
 *   - html-elements.js: auth attributes on <program>
 *   - ast-builder.js: auth attribute parsing and authConfig extraction
 *   - route-inference.js: auth middleware generation
 *   - code-generator.js: session middleware, CSRF injection, @session projection, session.destroy()
 *
 * Coverage:
 *   S1  <program> element shape includes auth, loginRedirect, csrf, sessionExpiry attributes
 *   S2  AST builder parses auth="required" and stores authConfig on AST
 *   S3  AST builder applies defaults: loginRedirect="/login", csrf="off", sessionExpiry="1h"
 *   S4  AST builder stores auth properties directly on the program markup node
 *   S5  AST builder: no authConfig when auth attribute is absent
 *   S6  RI generates authMiddleware when auth="required"
 *   S7  RI does not generate authMiddleware when auth is absent
 *   S8  RI authMiddleware includes correct loginRedirect, csrf, sessionExpiry
 *   S9  CG server JS includes session middleware when auth is configured
 *   S10 CG server JS includes auth check middleware with redirect
 *   S11 CG server JS includes session.destroy() handler
 *   S12 CG server JS includes CSRF functions when csrf="auto"
 *   S13 CG server JS omits CSRF functions when csrf="off"
 *   S14 CG client JS includes @session reactive projection when auth is configured
 *   S15 CG client JS includes session.destroy() with redirect
 *   S16 CG client JS omits @session when auth is not configured
 *   S17 CG HTML injects CSRF hidden input into <form> when csrf="auto"
 *   S18 CG HTML does not inject CSRF input when csrf="off"
 *   S19 CG loginRedirect wiring uses custom path
 */

import { describe, test, expect } from "bun:test";
import { getElementShape } from "../../src/html-elements.js";
import { buildAST } from "../../src/ast-builder.js";
import { splitBlocks } from "../../src/block-splitter.js";
import { runRI } from "../../src/route-inference.js";
import { runCG } from "../../src/code-generator.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function span(start, file = "/test/app.scrml") {
  return { file, start, end: start + 10, line: 1, col: start + 1 };
}

/**
 * Parse a scrml source string through BS + TAB to get a FileAST.
 */
function parseSource(source, filePath = "/test/app.scrml") {
  const bsResult = splitBlocks(filePath, source);
  const tabResult = buildAST(bsResult);
  return tabResult;
}

/**
 * Build a minimal FileAST with the given nodes and optional authConfig.
 */
function makeFileAST(filePath, nodes, opts = {}) {
  return {
    filePath,
    nodes,
    ast: {
      filePath,
      nodes,
      authConfig: opts.authConfig ?? null,
      imports: [],
      exports: [],
      components: [],
      typeDecls: [],
      spans: {},
      hasProgramRoot: true,
    },
    imports: [],
    exports: [],
    components: [],
    typeDecls: [],
    nodeTypes: opts.nodeTypes ?? new Map(),
  };
}

function makeMarkupNode(tag, attrs = [], children = [], opts = {}) {
  return {
    kind: "markup",
    tag,
    attributes: attrs,
    attrs,
    children,
    selfClosing: opts.selfClosing ?? false,
    span: opts.span ?? span(0),
    ...opts,
  };
}

function makeFormNode(children = [], attrs = []) {
  return makeMarkupNode("form", attrs, children);
}

// ---------------------------------------------------------------------------
// S1: <program> element shape includes auth attributes
// ---------------------------------------------------------------------------

describe("S1: <program> element shape auth attributes", () => {
  test("program shape includes auth attribute", () => {
    const shape = getElementShape("program");
    expect(shape).not.toBeNull();
    expect(shape.attributes.has("auth")).toBe(true);
  });

  test("program shape includes loginRedirect attribute", () => {
    const shape = getElementShape("program");
    expect(shape.attributes.has("loginRedirect")).toBe(true);
  });

  test("program shape includes csrf attribute", () => {
    const shape = getElementShape("program");
    expect(shape.attributes.has("csrf")).toBe(true);
  });

  test("program shape includes sessionExpiry attribute", () => {
    const shape = getElementShape("program");
    expect(shape.attributes.has("sessionExpiry")).toBe(true);
  });

  test("auth attributes are all string type", () => {
    const shape = getElementShape("program");
    expect(shape.attributes.get("auth").type).toBe("string");
    expect(shape.attributes.get("loginRedirect").type).toBe("string");
    expect(shape.attributes.get("csrf").type).toBe("string");
    expect(shape.attributes.get("sessionExpiry").type).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// S2-S5: AST builder auth parsing
// ---------------------------------------------------------------------------

describe("S2: AST builder parses auth attributes", () => {
  test("auth='required' is stored in authConfig", () => {
    const result = parseSource('<program auth="required">\n</program>');
    expect(result.ast.authConfig).not.toBeNull();
    expect(result.ast.authConfig.auth).toBe("required");
  });

  test("all auth attributes are parsed", () => {
    const result = parseSource(
      '<program auth="required" loginRedirect="/signin" csrf="auto" sessionExpiry="2h">\n</program>'
    );
    const cfg = result.ast.authConfig;
    expect(cfg.auth).toBe("required");
    expect(cfg.loginRedirect).toBe("/signin");
    expect(cfg.csrf).toBe("auto");
    expect(cfg.sessionExpiry).toBe("2h");
  });
});

describe("S3: AST builder auth attribute defaults", () => {
  test("loginRedirect defaults to /login", () => {
    const result = parseSource('<program auth="required">\n</program>');
    expect(result.ast.authConfig.loginRedirect).toBe("/login");
  });

  test("csrf defaults to off", () => {
    const result = parseSource('<program auth="required">\n</program>');
    expect(result.ast.authConfig.csrf).toBe("off");
  });

  test("sessionExpiry defaults to 1h", () => {
    const result = parseSource('<program auth="required">\n</program>');
    expect(result.ast.authConfig.sessionExpiry).toBe("1h");
  });
});

describe("S4: program node annotated with auth properties", () => {
  test("program markup node has auth, loginRedirect, csrf, sessionExpiry", () => {
    const result = parseSource(
      '<program auth="required" loginRedirect="/signin" csrf="auto" sessionExpiry="30m">\n</program>'
    );
    const programNode = result.ast.nodes.find(n => n.kind === "markup" && n.tag === "program");
    expect(programNode).toBeDefined();
    expect(programNode.auth).toBe("required");
    expect(programNode.loginRedirect).toBe("/signin");
    expect(programNode.csrf).toBe("auto");
    expect(programNode.sessionExpiry).toBe("30m");
  });
});

describe("S5: no authConfig when auth is absent", () => {
  test("authConfig is null when no auth attribute", () => {
    const result = parseSource('<program db="./app.db">\n</program>');
    expect(result.ast.authConfig).toBeNull();
  });

  test("program node has no auth property when auth is absent", () => {
    const result = parseSource('<program db="./app.db">\n</program>');
    const programNode = result.ast.nodes.find(n => n.kind === "markup" && n.tag === "program");
    expect(programNode.auth).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// S6-S8: RI auth middleware generation
// ---------------------------------------------------------------------------

describe("S6: RI generates authMiddleware", () => {
  test("authMiddleware entry created when auth=required", () => {
    const file = makeFileAST("/test/app.scrml", [], {
      authConfig: { auth: "required", loginRedirect: "/login", csrf: "off", sessionExpiry: "1h" },
    });
    const result = runRI({ files: [file], protectAnalysis: null });
    expect(result.routeMap.authMiddleware).toBeDefined();
    expect(result.routeMap.authMiddleware.size).toBe(1);
    expect(result.routeMap.authMiddleware.has("/test/app.scrml")).toBe(true);
  });
});

describe("S7: RI no authMiddleware when absent", () => {
  test("authMiddleware is empty when no auth config", () => {
    const file = makeFileAST("/test/app.scrml", []);
    const result = runRI({ files: [file], protectAnalysis: null });
    expect(result.routeMap.authMiddleware.size).toBe(0);
  });
});

describe("S8: RI authMiddleware has correct properties", () => {
  test("authMiddleware entry has loginRedirect, csrf, sessionExpiry", () => {
    const file = makeFileAST("/test/app.scrml", [], {
      authConfig: { auth: "required", loginRedirect: "/auth", csrf: "auto", sessionExpiry: "2h" },
    });
    const result = runRI({ files: [file], protectAnalysis: null });
    const mw = result.routeMap.authMiddleware.get("/test/app.scrml");
    expect(mw.auth).toBe("required");
    expect(mw.loginRedirect).toBe("/auth");
    expect(mw.csrf).toBe("auto");
    expect(mw.sessionExpiry).toBe("2h");
  });
});

// ---------------------------------------------------------------------------
// S8b: RI auto-escalates auth when protect= fields exist
// ---------------------------------------------------------------------------

function makeProtectAnalysis(filePath, tableName, protectedFields) {
  const stateBlockId = `${filePath}::0`;
  const views = new Map();
  views.set(stateBlockId, {
    stateBlockId,
    dbPath: "/test/db.sqlite",
    tables: new Map([
      [tableName, {
        tableName,
        fullSchema: [],
        clientSchema: [],
        protectedFields: new Set(protectedFields),
      }],
    ]),
  });
  return { views };
}

describe("S8b: RI auto-escalates auth for protect= fields", () => {
  test("file with protect= but no auth= gets auto-injected auth middleware", () => {
    const file = makeFileAST("/test/app.scrml", []);
    const pa = makeProtectAnalysis("/test/app.scrml", "users", ["password_hash", "email"]);
    const result = runRI({ files: [file], protectAnalysis: pa });
    expect(result.routeMap.authMiddleware.size).toBe(1);
    expect(result.routeMap.authMiddleware.has("/test/app.scrml")).toBe(true);
    const mw = result.routeMap.authMiddleware.get("/test/app.scrml");
    expect(mw.auth).toBe("required");
    expect(mw.csrf).toBe("auto");
    expect(mw.autoEscalated).toBe(true);
  });

  test("auto-escalated auth uses sensible defaults", () => {
    const file = makeFileAST("/test/app.scrml", []);
    const pa = makeProtectAnalysis("/test/app.scrml", "users", ["secret"]);
    const result = runRI({ files: [file], protectAnalysis: pa });
    const mw = result.routeMap.authMiddleware.get("/test/app.scrml");
    expect(mw.loginRedirect).toBe("/login");
    expect(mw.csrf).toBe("auto");
    expect(mw.sessionExpiry).toBe("1h");
  });

  test("explicit auth= takes precedence over auto-escalation", () => {
    const file = makeFileAST("/test/app.scrml", [], {
      authConfig: { auth: "required", loginRedirect: "/signin", csrf: "off", sessionExpiry: "2h" },
    });
    const pa = makeProtectAnalysis("/test/app.scrml", "users", ["password_hash"]);
    const result = runRI({ files: [file], protectAnalysis: pa });
    expect(result.routeMap.authMiddleware.size).toBe(1);
    const mw = result.routeMap.authMiddleware.get("/test/app.scrml");
    // Explicit config wins — not auto defaults
    expect(mw.loginRedirect).toBe("/signin");
    expect(mw.csrf).toBe("off");
    expect(mw.sessionExpiry).toBe("2h");
    expect(mw.autoEscalated).toBeUndefined();
  });

  test("file without protect= and without auth= gets no auth middleware", () => {
    const file = makeFileAST("/test/app.scrml", []);
    const result = runRI({ files: [file], protectAnalysis: null });
    expect(result.routeMap.authMiddleware.size).toBe(0);
  });

  test("file with empty protect= (no protected fields) gets no auto-escalation", () => {
    const file = makeFileAST("/test/app.scrml", []);
    const pa = makeProtectAnalysis("/test/app.scrml", "users", []); // empty set
    const result = runRI({ files: [file], protectAnalysis: pa });
    expect(result.routeMap.authMiddleware.size).toBe(0);
  });

  test("W-AUTH-001 warning emitted on auto-escalation", () => {
    const file = makeFileAST("/test/app.scrml", []);
    const pa = makeProtectAnalysis("/test/app.scrml", "users", ["password_hash"]);
    const result = runRI({ files: [file], protectAnalysis: pa });
    const warning = result.errors.find(e => e.code === "W-AUTH-001");
    expect(warning).toBeDefined();
    expect(warning.severity).toBe("warning");
    expect(warning.message).toContain("protect=");
    expect(warning.message).toContain("auto-injected");
  });

  test("no W-AUTH-001 when explicit auth= is present", () => {
    const file = makeFileAST("/test/app.scrml", [], {
      authConfig: { auth: "required", loginRedirect: "/login", csrf: "auto", sessionExpiry: "1h" },
    });
    const pa = makeProtectAnalysis("/test/app.scrml", "users", ["password_hash"]);
    const result = runRI({ files: [file], protectAnalysis: pa });
    const warning = result.errors.find(e => e.code === "W-AUTH-001");
    expect(warning).toBeUndefined();
  });

  test("multiple files — only file with protect= gets auto-escalated", () => {
    const file1 = makeFileAST("/test/public.scrml", []);
    const file2 = makeFileAST("/test/admin.scrml", []);
    const pa = makeProtectAnalysis("/test/admin.scrml", "users", ["password_hash"]);
    const result = runRI({ files: [file1, file2], protectAnalysis: pa });
    expect(result.routeMap.authMiddleware.size).toBe(1);
    expect(result.routeMap.authMiddleware.has("/test/admin.scrml")).toBe(true);
    expect(result.routeMap.authMiddleware.has("/test/public.scrml")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// S9-S16: CG code generation
// ---------------------------------------------------------------------------

describe("S9: CG server JS includes session middleware", () => {
  test("server JS contains session middleware when auth is configured", () => {
    const file = makeFileAST("/test/app.scrml", [
      makeMarkupNode("program", [], []),
    ]);
    const routeMap = {
      functions: new Map(),
      authMiddleware: new Map([
        ["/test/app.scrml", {
          filePath: "/test/app.scrml",
          auth: "required",
          loginRedirect: "/login",
          csrf: "off",
          sessionExpiry: "1h",
        }],
      ]),
    };
    const result = runCG({ files: [file], routeMap, depGraph: null, protectAnalysis: null });
    const output = result.outputs.get("/test/app.scrml");
    expect(output.serverJs).not.toBeNull();
    expect(output.serverJs).toContain("_scrml_session_middleware");
    expect(output.serverJs).toContain("scrml_sid");
  });
});

describe("S10: CG server JS includes auth check middleware", () => {
  test("auth check redirects to loginRedirect", () => {
    const file = makeFileAST("/test/app.scrml", [
      makeMarkupNode("program", [], []),
    ]);
    const routeMap = {
      functions: new Map(),
      authMiddleware: new Map([
        ["/test/app.scrml", {
          filePath: "/test/app.scrml",
          auth: "required",
          loginRedirect: "/signin",
          csrf: "off",
          sessionExpiry: "1h",
        }],
      ]),
    };
    const result = runCG({ files: [file], routeMap, depGraph: null, protectAnalysis: null });
    const output = result.outputs.get("/test/app.scrml");
    expect(output.serverJs).toContain("_scrml_auth_check");
    expect(output.serverJs).toContain("/signin");
    expect(output.serverJs).toContain("302");
  });
});

describe("S11: CG server JS includes session.destroy()", () => {
  test("session destroy handler is generated", () => {
    const file = makeFileAST("/test/app.scrml", [
      makeMarkupNode("program", [], []),
    ]);
    const routeMap = {
      functions: new Map(),
      authMiddleware: new Map([
        ["/test/app.scrml", {
          filePath: "/test/app.scrml",
          auth: "required",
          loginRedirect: "/login",
          csrf: "off",
          sessionExpiry: "1h",
        }],
      ]),
    };
    const result = runCG({ files: [file], routeMap, depGraph: null, protectAnalysis: null });
    const output = result.outputs.get("/test/app.scrml");
    expect(output.serverJs).toContain("_scrml_session_destroy");
    expect(output.serverJs).toContain("/_scrml/session/destroy");
    expect(output.serverJs).toContain("Expires=Thu, 01 Jan 1970");
  });
});

describe("S12: CG server JS includes CSRF when csrf=auto", () => {
  test("CSRF functions generated when csrf=auto", () => {
    const file = makeFileAST("/test/app.scrml", [
      makeMarkupNode("program", [], []),
    ]);
    const routeMap = {
      functions: new Map(),
      authMiddleware: new Map([
        ["/test/app.scrml", {
          filePath: "/test/app.scrml",
          auth: "required",
          loginRedirect: "/login",
          csrf: "auto",
          sessionExpiry: "1h",
        }],
      ]),
    };
    const result = runCG({ files: [file], routeMap, depGraph: null, protectAnalysis: null });
    const output = result.outputs.get("/test/app.scrml");
    expect(output.serverJs).toContain("_scrml_generate_csrf");
    expect(output.serverJs).toContain("_scrml_validate_csrf");
    expect(output.serverJs).toContain("X-CSRF-Token");
  });
});

describe("S13: CG server JS omits CSRF when csrf=off", () => {
  test("no CSRF functions when csrf=off", () => {
    const file = makeFileAST("/test/app.scrml", [
      makeMarkupNode("program", [], []),
    ]);
    const routeMap = {
      functions: new Map(),
      authMiddleware: new Map([
        ["/test/app.scrml", {
          filePath: "/test/app.scrml",
          auth: "required",
          loginRedirect: "/login",
          csrf: "off",
          sessionExpiry: "1h",
        }],
      ]),
    };
    const result = runCG({ files: [file], routeMap, depGraph: null, protectAnalysis: null });
    const output = result.outputs.get("/test/app.scrml");
    expect(output.serverJs).not.toContain("_scrml_generate_csrf");
    expect(output.serverJs).not.toContain("_scrml_validate_csrf");
  });
});

describe("S14: CG client JS includes @session projection", () => {
  test("@session reactive variable generated when auth is configured", () => {
    const file = makeFileAST("/test/app.scrml", [
      makeMarkupNode("program", [], []),
    ]);
    const routeMap = {
      functions: new Map(),
      authMiddleware: new Map([
        ["/test/app.scrml", {
          filePath: "/test/app.scrml",
          auth: "required",
          loginRedirect: "/login",
          csrf: "off",
          sessionExpiry: "1h",
        }],
      ]),
    };
    const result = runCG({ files: [file], routeMap, depGraph: null, protectAnalysis: null });
    const output = result.outputs.get("/test/app.scrml");
    expect(output.clientJs).not.toBeNull();
    expect(output.clientJs).toContain("_scrml_session");
    expect(output.clientJs).toContain("_scrml_session_init");
    expect(output.clientJs).toContain("/_scrml/session");
  });
});

describe("S15: CG client JS session.destroy() with redirect", () => {
  test("session.destroy() clears session and redirects", () => {
    const file = makeFileAST("/test/app.scrml", [
      makeMarkupNode("program", [], []),
    ]);
    const routeMap = {
      functions: new Map(),
      authMiddleware: new Map([
        ["/test/app.scrml", {
          filePath: "/test/app.scrml",
          auth: "required",
          loginRedirect: "/auth/login",
          csrf: "off",
          sessionExpiry: "1h",
        }],
      ]),
    };
    const result = runCG({ files: [file], routeMap, depGraph: null, protectAnalysis: null });
    const output = result.outputs.get("/test/app.scrml");
    expect(output.clientJs).toContain("destroy");
    expect(output.clientJs).toContain("/_scrml/session/destroy");
    expect(output.clientJs).toContain("/auth/login");
  });
});

describe("S16: CG client JS omits @session when no auth", () => {
  test("no @session when auth is not configured", () => {
    const file = makeFileAST("/test/app.scrml", [
      makeMarkupNode("program", [], []),
    ]);
    const routeMap = {
      functions: new Map(),
      authMiddleware: new Map(),
    };
    const result = runCG({ files: [file], routeMap, depGraph: null, protectAnalysis: null });
    const output = result.outputs.get("/test/app.scrml");
    // No client JS at all (no functions, no @session)
    // or client JS without session
    if (output.clientJs) {
      expect(output.clientJs).not.toContain("_scrml_session_init");
    }
  });
});

// ---------------------------------------------------------------------------
// S17-S18: CG CSRF injection in HTML
// ---------------------------------------------------------------------------

describe("S17: CG HTML injects CSRF into forms when csrf=auto", () => {
  test("form element gets hidden CSRF input", () => {
    const formNode = makeFormNode([
      { kind: "text", value: "Submit", span: span(20) },
    ]);
    const file = makeFileAST("/test/app.scrml", [
      makeMarkupNode("program", [], [formNode]),
    ]);
    const routeMap = {
      functions: new Map(),
      authMiddleware: new Map([
        ["/test/app.scrml", {
          filePath: "/test/app.scrml",
          auth: "required",
          loginRedirect: "/login",
          csrf: "auto",
          sessionExpiry: "1h",
        }],
      ]),
    };
    const result = runCG({ files: [file], routeMap, depGraph: null, protectAnalysis: null });
    const output = result.outputs.get("/test/app.scrml");
    expect(output.html).toContain('name="_csrf"');
    expect(output.html).toContain('data-scrml-csrf');
    expect(output.html).toContain('type="hidden"');
  });
});

describe("S18: CG HTML no CSRF when csrf=off", () => {
  test("form element does not get CSRF input when csrf=off", () => {
    const formNode = makeFormNode([
      { kind: "text", value: "Submit", span: span(20) },
    ]);
    const file = makeFileAST("/test/app.scrml", [
      makeMarkupNode("program", [], [formNode]),
    ]);
    const routeMap = {
      functions: new Map(),
      authMiddleware: new Map([
        ["/test/app.scrml", {
          filePath: "/test/app.scrml",
          auth: "required",
          loginRedirect: "/login",
          csrf: "off",
          sessionExpiry: "1h",
        }],
      ]),
    };
    const result = runCG({ files: [file], routeMap, depGraph: null, protectAnalysis: null });
    const output = result.outputs.get("/test/app.scrml");
    if (output.html) {
      expect(output.html).not.toContain('name="_csrf"');
    }
  });
});

// ---------------------------------------------------------------------------
// S19: loginRedirect custom path wiring
// ---------------------------------------------------------------------------

describe("S19: CG loginRedirect uses custom path", () => {
  test("custom loginRedirect path in server and client JS", () => {
    const file = makeFileAST("/test/app.scrml", [
      makeMarkupNode("program", [], []),
    ]);
    const routeMap = {
      functions: new Map(),
      authMiddleware: new Map([
        ["/test/app.scrml", {
          filePath: "/test/app.scrml",
          auth: "required",
          loginRedirect: "/custom/auth/page",
          csrf: "off",
          sessionExpiry: "1h",
        }],
      ]),
    };
    const result = runCG({ files: [file], routeMap, depGraph: null, protectAnalysis: null });
    const output = result.outputs.get("/test/app.scrml");
    expect(output.serverJs).toContain("/custom/auth/page");
    expect(output.clientJs).toContain("/custom/auth/page");
  });
});
