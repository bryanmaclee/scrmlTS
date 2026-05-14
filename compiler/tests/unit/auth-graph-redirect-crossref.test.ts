/**
 * auth-graph — Auth-redirect cross-ref tests (A-3.4).
 *
 * S90 wave A-3.4 — exercises `crossRefRedirects` via the public
 * `runAuthGraph` entry point. Covers:
 *
 *   §1 — program-auth redirect projection from `FileAST.authConfig.loginRedirect`.
 *   §2 — page-auth redirect projection from `<page loginRedirect=>`.
 *   §3 — auth-role-block redirect projection from `<auth else=>` (+ redirect= fallback).
 *   §4 — null redirect when the gate has no redirect attr.
 *   §5 — `I-AUTH-REDIRECT-UNRESOLVED` fires when target path is not in RouteMap.pages.
 *   §6 — multi-gate file — all redirects projected independently.
 *
 * Per OQ-A2-E + OQ-A3-B (a) S90 ratification: A-3.4 records redirect paths
 * VERBATIM (bare-string disposition); consumer (A-2.5) resolves against
 * RouteMap. Unresolved redirects are INFO-level only, not errors.
 */

import { describe, test, expect } from "bun:test";
import { runAuthGraph } from "../../src/auth-graph.ts";
import type { RouteMap, PageRoute } from "../../src/route-inference.ts";
import type {
  FileAST,
  MarkupNode,
  ChannelDeclNode,
  ASTNode,
  Span,
  AttrNode,
  AuthConfig,
} from "../../src/types/ast.ts";

const SPAN: Span = { file: "test.scrml", start: 0, end: 0, line: 1, col: 1 };

let nextId = 1;
function nid(): number {
  return nextId++;
}

function attr(name: string, valueStr: string | null): AttrNode {
  if (valueStr === null) {
    return { name, value: { kind: "absent" }, span: SPAN };
  }
  return {
    name,
    value: { kind: "string-literal", value: valueStr, span: SPAN },
    span: SPAN,
  };
}

function markup(
  tag: string,
  attrs: AttrNode[] = [],
  children: ASTNode[] = [],
): MarkupNode {
  return {
    id: nid(),
    span: SPAN,
    kind: "markup",
    tag,
    attrs,
    children,
    selfClosing: false,
    closerForm: `</${tag}>`,
    isComponent: false,
  };
}

function channel(
  attrs: AttrNode[] = [],
  children: ASTNode[] = [],
): ChannelDeclNode {
  return markup("channel", attrs, children) as ChannelDeclNode;
}

interface FileOpts {
  authConfig?: AuthConfig | null;
  channelDecls?: ChannelDeclNode[];
}

function file(
  filePath: string,
  nodes: ASTNode[],
  opts: FileOpts = {},
): FileAST {
  return {
    filePath,
    nodes,
    imports: [],
    exports: [],
    components: [],
    typeDecls: [],
    channelDecls: opts.channelDecls,
    spans: {},
    hasProgramRoot: nodes.some(n => n && (n as MarkupNode).tag === "program"),
    authConfig: opts.authConfig ?? null,
    middlewareConfig: null,
  };
}

const REQUIRED_AUTH: AuthConfig = {
  auth: "required",
  loginRedirect: "/login",
  csrf: "off",
  sessionExpiry: "1h",
};

/** Build a minimal RouteMap with the given page URL patterns reachable. */
function routeMapWithPages(urlPatterns: string[]): RouteMap {
  const pages = new Map<string, PageRoute>();
  for (const urlPattern of urlPatterns) {
    pages.set(`/abs/route-for${urlPattern}.scrml`, {
      filePath: `/abs/route-for${urlPattern}.scrml`,
      urlPattern,
      params: [],
      layoutFilePath: null,
      isCatchAll: false,
    });
  }
  return {
    functions: new Map(),
    pages,
    authMiddleware: new Map(),
  };
}

// ---------------------------------------------------------------------------
// §1 — <program auth=...> redirect projection
// ---------------------------------------------------------------------------

describe("§1 program-auth redirect projection", () => {
  test("<program auth='required' loginRedirect='/login'> records '/login' verbatim", () => {
    const program = markup("program", [attr("auth", "required")]);
    const f = file("/abs/a.scrml", [program], { authConfig: REQUIRED_AUTH });
    // RouteMap has a page at /login so the redirect resolves.
    const rm = routeMapWithPages(["/login"]);

    const { graph, errors } = runAuthGraph([f], rm);

    expect(errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED")).toHaveLength(0);
    expect(graph.redirectTargets.size).toBe(1);
    expect(graph.redirectTargets.get(program.id)).toBe("/login");
  });

  test("<program auth='required' loginRedirect='/auth'> records '/auth' verbatim (non-default path)", () => {
    const program = markup("program", [attr("auth", "required")]);
    const customAuth: AuthConfig = {
      auth: "required",
      loginRedirect: "/auth",
      csrf: "off",
      sessionExpiry: "1h",
    };
    const f = file("/abs/c.scrml", [program], { authConfig: customAuth });
    const rm = routeMapWithPages(["/auth"]);

    const { graph, errors } = runAuthGraph([f], rm);

    expect(errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED")).toHaveLength(0);
    expect(graph.redirectTargets.get(program.id)).toBe("/auth");
  });
});

// ---------------------------------------------------------------------------
// §2 — <page auth=...> redirect projection
// ---------------------------------------------------------------------------

describe("§2 page-auth redirect projection", () => {
  test("<page auth='required' loginRedirect='/signin'> records '/signin' verbatim", () => {
    const page = markup("page", [
      attr("route", "/admin"),
      attr("auth", "required"),
      attr("loginRedirect", "/signin"),
    ]);
    const program = markup("program", [], [page]);
    const f = file("/abs/p.scrml", [program]);
    const rm = routeMapWithPages(["/signin"]);

    const { graph, errors } = runAuthGraph([f], rm);

    expect(errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED")).toHaveLength(0);
    expect(graph.redirectTargets.size).toBe(1);
    expect(graph.redirectTargets.get(page.id)).toBe("/signin");
  });
});

// ---------------------------------------------------------------------------
// §3 — <auth ...> block-form redirect projection
// ---------------------------------------------------------------------------

describe("§3 auth-role-block redirect projection (else= and redirect= forms)", () => {
  test("<auth role='admin' else='/login'> records '/login' from else=", () => {
    const authBlock = markup("auth", [
      attr("role", "admin"),
      attr("else", "/login"),
    ]);
    const page = markup("page", [], [authBlock]);
    const f = file("/abs/admin.scrml", [page]);
    const rm = routeMapWithPages(["/login"]);

    const { graph, errors } = runAuthGraph([f], rm);

    expect(errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED")).toHaveLength(0);
    expect(graph.redirectTargets.get(authBlock.id)).toBe("/login");
  });

  test("<auth check='hasPerm' redirect='/forbidden'> records '/forbidden' from redirect= fallback", () => {
    const authBlock = markup("auth", [
      attr("check", "hasPerm"),
      attr("redirect", "/forbidden"),
    ]);
    const page = markup("page", [], [authBlock]);
    const f = file("/abs/check.scrml", [page]);
    const rm = routeMapWithPages(["/forbidden"]);

    const { graph, errors } = runAuthGraph([f], rm);

    expect(errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED")).toHaveLength(0);
    expect(graph.redirectTargets.get(authBlock.id)).toBe("/forbidden");
  });
});

// ---------------------------------------------------------------------------
// §4 — null redirect when gate has no redirect target
// ---------------------------------------------------------------------------

describe("§4 null redirect when gate has no redirect attr", () => {
  test("<auth role='admin'> with no else/redirect attr → redirectTargets[id] === null", () => {
    const authBlock = markup("auth", [attr("role", "admin")]);
    const page = markup("page", [], [authBlock]);
    const f = file("/abs/no-redirect.scrml", [page]);

    const { graph, errors } = runAuthGraph([f], null);

    expect(errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED")).toHaveLength(0);
    expect(graph.redirectTargets.size).toBe(1);
    expect(graph.redirectTargets.get(authBlock.id)).toBeNull();
  });

  test("<channel auth='required'> records null redirect (channels never carry redirect)", () => {
    const ch = channel([attr("name", "presence"), attr("auth", "required")]);
    const program = markup("program", [], [ch]);
    const f = file("/abs/ws.scrml", [program], { channelDecls: [ch] });

    const { graph, errors } = runAuthGraph([f], null);

    expect(errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED")).toHaveLength(0);
    expect(graph.redirectTargets.size).toBe(1);
    expect(graph.redirectTargets.get(ch.id)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §5 — I-AUTH-REDIRECT-UNRESOLVED diagnostic
// ---------------------------------------------------------------------------

describe("§5 I-AUTH-REDIRECT-UNRESOLVED info diagnostic", () => {
  test("redirect to a path not in RouteMap.pages fires I-AUTH-REDIRECT-UNRESOLVED", () => {
    const program = markup("program", [attr("auth", "required")]);
    const f = file("/abs/a.scrml", [program], { authConfig: REQUIRED_AUTH });
    // RouteMap does NOT have /login — only /home.
    const rm = routeMapWithPages(["/home"]);

    const { graph, errors } = runAuthGraph([f], rm);

    expect(errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED")).toHaveLength(1);
    expect(errors[0]!.code).toBe("I-AUTH-REDIRECT-UNRESOLVED");
    expect(errors[0]!.severity).toBe("info");
    expect(errors[0]!.message).toContain('"/login"');
    expect(errors[0]!.filePath).toBe("/abs/a.scrml");

    // Even when unresolved, the redirect IS still recorded verbatim per
    // OQ-A3-B (a) bare-string rule — A-3.4 is informational, not gating.
    expect(graph.redirectTargets.get(program.id)).toBe("/login");
  });

  test("null routeMap → no diagnostics emitted (unit-test mode bypasses cross-ref)", () => {
    const program = markup("program", [attr("auth", "required")]);
    const f = file("/abs/a.scrml", [program], { authConfig: REQUIRED_AUTH });

    const { graph, errors } = runAuthGraph([f], null);

    expect(errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED")).toHaveLength(0);
    // Redirect is still projected — only the cross-ref step is skipped.
    expect(graph.redirectTargets.get(program.id)).toBe("/login");
  });

  test("redirect target IS in RouteMap.pages → no diagnostic", () => {
    const authBlock = markup("auth", [
      attr("role", "admin"),
      attr("else", "/login"),
    ]);
    const page = markup("page", [], [authBlock]);
    const f = file("/abs/admin.scrml", [page]);
    const rm = routeMapWithPages(["/login", "/home", "/dashboard"]);

    const { graph, errors } = runAuthGraph([f], rm);

    expect(errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED")).toHaveLength(0);
    expect(graph.redirectTargets.get(authBlock.id)).toBe("/login");
  });
});

// ---------------------------------------------------------------------------
// §6 — multi-gate aggregation
// ---------------------------------------------------------------------------

describe("§6 multi-gate file — independent redirect projection per gate", () => {
  test("file with 3 gates (program + page + auth-block) → each redirect recorded independently", () => {
    const adminBlock = markup("auth", [
      attr("role", "admin"),
      attr("else", "/forbidden"),
    ]);
    const page = markup("page", [
      attr("route", "/admin"),
      attr("auth", "required"),
      attr("loginRedirect", "/signin"),
    ], [adminBlock]);
    const program = markup("program", [], [page]);
    const f = file("/abs/multi.scrml", [program], { authConfig: REQUIRED_AUTH });
    const rm = routeMapWithPages(["/login", "/signin", "/forbidden"]);

    const { graph, errors } = runAuthGraph([f], rm);

    expect(errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED")).toHaveLength(0);
    expect(graph.gates.size).toBe(3);
    expect(graph.redirectTargets.size).toBe(3);
    // program → /login (from authConfig default)
    expect(graph.redirectTargets.get(program.id)).toBe("/login");
    // page → /signin (from <page loginRedirect=>)
    expect(graph.redirectTargets.get(page.id)).toBe("/signin");
    // auth-block → /forbidden (from <auth else=>)
    expect(graph.redirectTargets.get(adminBlock.id)).toBe("/forbidden");
  });

  test("multi-gate file with one unresolved redirect → one diagnostic, others clean", () => {
    const adminBlock = markup("auth", [
      attr("role", "admin"),
      attr("else", "/missing-path"),  // not in RouteMap
    ]);
    const page = markup("page", [
      attr("route", "/admin"),
      attr("auth", "required"),
      attr("loginRedirect", "/signin"),
    ], [adminBlock]);
    const program = markup("program", [], [page]);
    const f = file("/abs/multi-mixed.scrml", [program], { authConfig: REQUIRED_AUTH });
    // RouteMap has /login + /signin but NOT /missing-path.
    const rm = routeMapWithPages(["/login", "/signin"]);

    const { graph, errors } = runAuthGraph([f], rm);

    const redirectErrors = errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED");
    expect(redirectErrors).toHaveLength(1);
    expect(redirectErrors[0]!.message).toContain('"/missing-path"');

    // All three redirects ARE recorded verbatim despite the unresolved.
    expect(graph.redirectTargets.get(program.id)).toBe("/login");
    expect(graph.redirectTargets.get(page.id)).toBe("/signin");
    expect(graph.redirectTargets.get(adminBlock.id)).toBe("/missing-path");
  });
});
