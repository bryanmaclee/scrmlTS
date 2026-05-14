/**
 * auth-graph — W-AUTH-LOGIN-MISSING tier-2 lint tests.
 *
 * S91 03-contact-book auth-redirect fix — Proposal A two-tier severity.
 *
 * Per OQ-1 ratification (docs/changes/03-contact-book-auth-redirect-SCOPING
 * §5): the existing `I-AUTH-REDIRECT-UNRESOLVED` info-lint covers per-gate
 * redirect typos (gate names path "/loginX" instead of "/login"). A NEW
 * `W-AUTH-LOGIN-MISSING` warning surfaces the structural-gap case: at least
 * one gate names a redirect target but NO redirect target the gates name
 * resolves anywhere in `RouteMap.pages`. This is the S86 03-contact-book
 * latent bug shape — `<program auth="required">` declared, default
 * `loginRedirect="/login"` produced by RI, but no /login page authored.
 *
 * Tier behavior:
 *   - I-AUTH-REDIRECT-UNRESOLVED fires PER unresolved gate, info-level.
 *   - W-AUTH-LOGIN-MISSING fires AT MOST ONCE per compilation, warning,
 *     when EVERY redirect-naming gate failed to resolve.
 *   - The two CAN co-fire (e.g. single gate with typo & no other login
 *     page → both an info and a warning).
 */

import { describe, test, expect } from "bun:test";
import { runAuthGraph } from "../../src/auth-graph.ts";
import type { RouteMap, PageRoute } from "../../src/route-inference.ts";
import type {
  FileAST,
  MarkupNode,
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

interface FileOpts {
  authConfig?: AuthConfig | null;
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
    channelDecls: undefined,
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
// §1 — load-bearing trigger case (03-contact-book shape)
// ---------------------------------------------------------------------------

describe("§1 W-AUTH-LOGIN-MISSING — total structural gap", () => {
  test("<program auth='required'> with no /login page → W-AUTH-LOGIN-MISSING fires once at warning severity", () => {
    const program = markup("program", [attr("auth", "required")]);
    const f = file("/abs/03-contact-book.scrml", [program], {
      authConfig: REQUIRED_AUTH,
    });
    // RouteMap has the contact-book page at "/" but NO /login.
    const rm = routeMapWithPages(["/"]);

    const { errors } = runAuthGraph([f], rm);

    const loginMissing = errors.filter(e => e.code === "W-AUTH-LOGIN-MISSING");
    expect(loginMissing).toHaveLength(1);
    expect(loginMissing[0]!.severity).toBe("warning");
    expect(loginMissing[0]!.message).toContain('"/login"');
    expect(loginMissing[0]!.message).toContain("scrml generate auth");
    expect(loginMissing[0]!.filePath).toBe("/abs/03-contact-book.scrml");
  });

  test("<program auth='required'> with no /login page → I-AUTH-REDIRECT-UNRESOLVED ALSO fires (both tiers co-fire)", () => {
    const program = markup("program", [attr("auth", "required")]);
    const f = file("/abs/03-contact-book.scrml", [program], {
      authConfig: REQUIRED_AUTH,
    });
    const rm = routeMapWithPages(["/"]);

    const { errors } = runAuthGraph([f], rm);

    const info = errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED");
    const warn = errors.filter(e => e.code === "W-AUTH-LOGIN-MISSING");
    expect(info).toHaveLength(1);
    expect(info[0]!.severity).toBe("info");
    expect(warn).toHaveLength(1);
    expect(warn[0]!.severity).toBe("warning");
  });
});

// ---------------------------------------------------------------------------
// §2 — login page present → no fire
// ---------------------------------------------------------------------------

describe("§2 W-AUTH-LOGIN-MISSING — login page present", () => {
  test("<program auth='required'> with a /login page → no W-AUTH-LOGIN-MISSING", () => {
    const program = markup("program", [attr("auth", "required")]);
    const f = file("/abs/app.scrml", [program], { authConfig: REQUIRED_AUTH });
    // RouteMap has /login → redirect resolves.
    const rm = routeMapWithPages(["/login", "/"]);

    const { errors } = runAuthGraph([f], rm);

    expect(errors.filter(e => e.code === "W-AUTH-LOGIN-MISSING")).toHaveLength(0);
    expect(errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED")).toHaveLength(0);
  });

  test("<page auth='required' loginRedirect='/signin'> with a /signin page → no W-AUTH-LOGIN-MISSING", () => {
    const page = markup("page", [
      attr("route", "/admin"),
      attr("auth", "required"),
      attr("loginRedirect", "/signin"),
    ]);
    const program = markup("program", [], [page]);
    const f = file("/abs/multi.scrml", [program]);
    const rm = routeMapWithPages(["/signin", "/admin"]);

    const { errors } = runAuthGraph([f], rm);

    expect(errors.filter(e => e.code === "W-AUTH-LOGIN-MISSING")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §3 — per-gate typo case (info-only, no tier-2)
// ---------------------------------------------------------------------------

describe("§3 W-AUTH-LOGIN-MISSING — per-gate typo with working /login elsewhere", () => {
  test("<page loginRedirect='/loginX'> typo BUT app has /login working → only info, no warning", () => {
    // Page-level gate with a TYPO in loginRedirect (loginX), but the global
    // <program auth=required> defaults to /login which DOES resolve. So one
    // gate resolves; one doesn't. The tier-2 W-AUTH-LOGIN-MISSING should NOT
    // fire because anyResolved is true.
    const page = markup("page", [
      attr("route", "/admin"),
      attr("auth", "required"),
      attr("loginRedirect", "/loginX"),
    ]);
    const program = markup("program", [], [page]);
    const f = file("/abs/typo.scrml", [program], { authConfig: REQUIRED_AUTH });
    // RouteMap has /login (default redirect) but NOT /loginX.
    const rm = routeMapWithPages(["/login", "/admin"]);

    const { errors } = runAuthGraph([f], rm);

    const info = errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED");
    const warn = errors.filter(e => e.code === "W-AUTH-LOGIN-MISSING");
    expect(info).toHaveLength(1);
    expect(info[0]!.message).toContain('"/loginX"');
    expect(warn).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §4 — no auth gates → no fire
// ---------------------------------------------------------------------------

describe("§4 W-AUTH-LOGIN-MISSING — no auth gates", () => {
  test("file with no auth declarations → no W-AUTH-LOGIN-MISSING", () => {
    const program = markup("program", []);
    const f = file("/abs/plain.scrml", [program]);
    const rm = routeMapWithPages(["/"]);

    const { errors } = runAuthGraph([f], rm);

    expect(errors.filter(e => e.code === "W-AUTH-LOGIN-MISSING")).toHaveLength(0);
    expect(errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §5 — multi-gate, all unresolved → ONE fire, deduplicated
// ---------------------------------------------------------------------------

describe("§5 W-AUTH-LOGIN-MISSING — multi-gate aggregation", () => {
  test("3 gates with 3 different unresolved redirects → ONE W-AUTH-LOGIN-MISSING + 3 info diagnostics", () => {
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
    const f = file("/abs/multi-unresolved.scrml", [program], {
      authConfig: REQUIRED_AUTH,
    });
    // RouteMap has /admin but none of /login, /signin, /forbidden.
    const rm = routeMapWithPages(["/admin"]);

    const { errors } = runAuthGraph([f], rm);

    const info = errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED");
    const warn = errors.filter(e => e.code === "W-AUTH-LOGIN-MISSING");
    expect(info).toHaveLength(3);
    expect(warn).toHaveLength(1);
    // Warning message lists all unresolved targets.
    expect(warn[0]!.message).toContain('"/login"');
    expect(warn[0]!.message).toContain('"/signin"');
    expect(warn[0]!.message).toContain('"/forbidden"');
  });

  test("3 gates with 2 unresolved + 1 resolved → 2 info diagnostics + NO W-AUTH-LOGIN-MISSING", () => {
    const adminBlock = markup("auth", [
      attr("role", "admin"),
      attr("else", "/forbidden"),  // unresolved
    ]);
    const page = markup("page", [
      attr("route", "/admin"),
      attr("auth", "required"),
      attr("loginRedirect", "/signin"),  // resolved
    ], [adminBlock]);
    const program = markup("program", [], [page]);
    const f = file("/abs/partial.scrml", [program], {
      authConfig: REQUIRED_AUTH,  // /login → unresolved
    });
    const rm = routeMapWithPages(["/signin", "/admin"]);

    const { errors } = runAuthGraph([f], rm);

    const info = errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED");
    const warn = errors.filter(e => e.code === "W-AUTH-LOGIN-MISSING");
    expect(info).toHaveLength(2);
    expect(warn).toHaveLength(0);  // /signin resolved → anyResolved true → no tier-2
  });
});

// ---------------------------------------------------------------------------
// §6 — null routeMap (unit-test mode) → no fire
// ---------------------------------------------------------------------------

describe("§6 W-AUTH-LOGIN-MISSING — null routeMap", () => {
  test("null routeMap → no diagnostics emitted (unit-test bypass)", () => {
    const program = markup("program", [attr("auth", "required")]);
    const f = file("/abs/a.scrml", [program], { authConfig: REQUIRED_AUTH });

    const { errors } = runAuthGraph([f], null);

    expect(errors.filter(e => e.code === "W-AUTH-LOGIN-MISSING")).toHaveLength(0);
    expect(errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §7 — anchor verification: warning attaches to first redirect-naming gate
// ---------------------------------------------------------------------------

describe("§7 W-AUTH-LOGIN-MISSING — span anchor", () => {
  test("multi-file: first gate that names a redirect is the warning anchor", () => {
    const program = markup("program", [attr("auth", "required")]);
    const f1 = file("/abs/file1.scrml", [program], { authConfig: REQUIRED_AUTH });
    const rm = routeMapWithPages(["/home"]);

    const { errors } = runAuthGraph([f1], rm);

    const warn = errors.filter(e => e.code === "W-AUTH-LOGIN-MISSING");
    expect(warn).toHaveLength(1);
    // Warning's filePath matches the gate that named the redirect.
    expect(warn[0]!.filePath).toBe("/abs/file1.scrml");
  });
});
