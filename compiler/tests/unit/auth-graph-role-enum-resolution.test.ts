/**
 * auth-graph — A-3.2 Role enum resolution tests.
 *
 * S90 wave A-3.2 — exercises `resolveRoleEnum` (called from
 * `runAuthGraph`) against synthesized FileAST inputs covering the
 * ratified OQ-A3-F (b)+(c) dual rule:
 *
 *   1. (b) reference-based discovery (`<auth role="X">` → owning enum).
 *   2. (b) zero-match → (c) entry-file `<program>`-body-scope fallback.
 *   3. (b) multi-match → (c) reconciliation.
 *   4. Ambiguity → E-AUTH-GRAPH-002.
 *   5. No-auth-gates + no-enum → synthesized `_anonymous` floor.
 *   6. Auth-role-block gates without backing enum → E-AUTH-GRAPH-002.
 *
 * Tests build FileAST fixtures in-memory (mirroring the A-3.1 pattern
 * at `auth-graph-site-enumerator.test.ts`) — no `.scrml` fixture
 * compilation needed; the resolver consumes the post-TAB shape directly.
 */

import { describe, test, expect } from "bun:test";
import { runAuthGraph } from "../../src/auth-graph.ts";
import type {
  FileAST,
  MarkupNode,
  ASTNode,
  Span,
  AttrNode,
  TypeDeclNode,
  LogicNode,
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

function enumDecl(name: string, variantsRaw: string): TypeDeclNode {
  return {
    id: nid(),
    span: SPAN,
    kind: "type-decl",
    name,
    typeKind: "enum",
    raw: variantsRaw,
  };
}

function logicNode(typeDecls: TypeDeclNode[]): LogicNode {
  return {
    id: nid(),
    span: SPAN,
    kind: "logic",
    body: [],
    imports: [],
    exports: [],
    typeDecls,
    components: [],
  };
}

interface FileOpts {
  /** Type-decls hoisted to FileAST.typeDecls (the canonical post-TAB list). */
  typeDecls?: TypeDeclNode[];
  /** Override hasProgramRoot detection (defaults to nodes inspection). */
  hasProgramRoot?: boolean;
}

function file(
  filePath: string,
  nodes: ASTNode[],
  opts: FileOpts = {},
): FileAST {
  const hasProgramRoot =
    opts.hasProgramRoot
      ?? nodes.some(n => n && (n as MarkupNode).tag === "program");
  return {
    filePath,
    nodes,
    imports: [],
    exports: [],
    components: [],
    typeDecls: opts.typeDecls ?? [],
    spans: {},
    hasProgramRoot,
    authConfig: null,
    middlewareConfig: null,
  };
}

// ---------------------------------------------------------------------------
// §1 — (b) reference-based discovery (PRIMARY rule)
// ---------------------------------------------------------------------------

describe("§1 (b) reference-based discovery — single enum match", () => {
  test("single enum owning the referenced variant → wins (b) rule", () => {
    // Setup: a UserRole enum with three variants; <auth role="admin">
    // references one. (b) rule yields exactly one match.
    const userRoleEnum = enumDecl("UserRole", "{ Anonymous, User, Admin }");
    const authBlock = markup("auth", [attr("role", "Admin")]);
    const programLogic = logicNode([userRoleEnum]);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [programLogic, page]);
    const f = file("/abs/entry.scrml", [program], { typeDecls: [userRoleEnum] });

    const { graph, errors } = runAuthGraph([f], null);

    expect(errors).toHaveLength(0);
    expect(graph.roleEnum).not.toBeNull();
    expect(graph.roleEnum!.name).toBe("UserRole");
    expect(graph.roleEnum!.variants).toEqual(["Anonymous", "User", "Admin"]);
    expect(graph.roleEnum!.isImplicitAnonymous).toBe(false);
    expect(graph.roleEnum!.filePath).toBe("/abs/entry.scrml");
  });

  test("multi-file corpus: enum in one file, gate in another → (b) finds across files", () => {
    // The role enum lives in the entry file; an <auth> gate lives in a
    // sub-page file. The (b) rule walks the GATE set across all files,
    // and the candidate pool across all files — match succeeds.
    const userRoleEnum = enumDecl("UserRole", "{ Reader, Editor, Admin }");
    const entryProgram = markup(
      "program",
      [],
      [logicNode([userRoleEnum])],
    );
    const entryFile = file("/abs/entry.scrml", [entryProgram], {
      typeDecls: [userRoleEnum],
    });

    const authBlock = markup("auth", [attr("role", "Editor")]);
    const subPage = markup("page", [], [authBlock]);
    const subFile = file("/abs/sub.scrml", [subPage], {
      hasProgramRoot: false,
    });

    const { graph, errors } = runAuthGraph([entryFile, subFile], null);

    expect(errors).toHaveLength(0);
    expect(graph.roleEnum).not.toBeNull();
    expect(graph.roleEnum!.name).toBe("UserRole");
  });
});

// ---------------------------------------------------------------------------
// §2 — (b) multi-match → (c) reconciliation
// ---------------------------------------------------------------------------

describe("§2 (b) multi-match → (c) entry-file-program-scope reconciliation", () => {
  test("two enums share an admin-shaped variant; (c) entry-file program scope picks the winner", () => {
    // Both UserRole and Permission declare an "Admin" variant. The
    // <auth role="Admin"> gate is ambiguous to (b) alone (2 candidates).
    // (c) checks the entry file's <program> body scope — UserRole sits
    // there, Permission doesn't → reconciles to UserRole.
    const userRoleEnum = enumDecl("UserRole", "{ User, Admin }");
    const permEnum = enumDecl("Permission", "{ Read, Admin, Delete }");

    const authBlock = markup("auth", [attr("role", "Admin")]);
    const programLogic = logicNode([userRoleEnum]);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [programLogic, page]);
    const entryFile = file("/abs/entry.scrml", [program], {
      typeDecls: [userRoleEnum],
    });

    // The Permission enum lives in a sibling file, NOT in the entry
    // file's <program> body scope.
    const permFile = file("/abs/perm.scrml", [], {
      typeDecls: [permEnum],
      hasProgramRoot: false,
    });

    const { graph, errors } = runAuthGraph([entryFile, permFile], null);

    expect(errors).toHaveLength(0);
    expect(graph.roleEnum).not.toBeNull();
    expect(graph.roleEnum!.name).toBe("UserRole");
    expect(graph.roleEnum!.filePath).toBe("/abs/entry.scrml");
  });
});

// ---------------------------------------------------------------------------
// §3 — (c) fallback when (b) yields zero matches
// ---------------------------------------------------------------------------

describe("§3 (c) entry-file program-body-scope discovery — (b) zero-match fallback", () => {
  test("enum declared in entry-file program scope, no auth-role-block gates → (c) wins by structural position", () => {
    // No <auth role=> gates exist (only program-auth via authConfig is
    // a binary gate — doesn't reference variants). (b) yields nothing;
    // (c) finds the enum in the entry file's <program> body.
    const userRoleEnum = enumDecl("UserRole", "{ Guest, Member }");
    const programLogic = logicNode([userRoleEnum]);
    const program = markup("program", [], [programLogic]);
    const f = file("/abs/entry.scrml", [program], {
      typeDecls: [userRoleEnum],
    });

    const { graph, errors } = runAuthGraph([f], null);

    expect(errors).toHaveLength(0);
    expect(graph.roleEnum).not.toBeNull();
    expect(graph.roleEnum!.name).toBe("UserRole");
    expect(graph.roleEnum!.variants).toEqual(["Guest", "Member"]);
    expect(graph.roleEnum!.isImplicitAnonymous).toBe(false);
  });

  test("enum declared OUTSIDE entry-file program-body — still found via file-level scan when (c) program-scope match fails", () => {
    // (b) fails (no <auth role=>); (c) prefers in-program-scope but
    // falls back to file-level enum scan when no program-scope match
    // exists. Confirms (c)'s pragmatic fallback path documented in
    // `findEntryFileProgramScopeEnum`.
    const userRoleEnum = enumDecl("UserRole", "{ Anon, Auth }");
    const program = markup("program", []);
    const f = file("/abs/entry.scrml", [program], {
      // Enum is hoisted to file-level typeDecls but never logically
      // nested in a <program>-body logic block.
      typeDecls: [userRoleEnum],
    });

    const { graph, errors } = runAuthGraph([f], null);

    expect(errors).toHaveLength(0);
    expect(graph.roleEnum).not.toBeNull();
    expect(graph.roleEnum!.name).toBe("UserRole");
  });
});

// ---------------------------------------------------------------------------
// §4 — Ambiguity → E-AUTH-GRAPH-002
// ---------------------------------------------------------------------------

describe("§4 ambiguity — (b) multi-match + (c) no-reconcile → E-AUTH-GRAPH-002", () => {
  test("two enums share variant; entry-file program body has neither → E-AUTH-GRAPH-002 fires", () => {
    // UserRole and Permission both declare "Admin". The entry file's
    // <program> body has NEITHER enum (both live in sibling files).
    // (c) cannot reconcile → E-AUTH-GRAPH-002.
    const userRoleEnum = enumDecl("UserRole", "{ User, Admin }");
    const permEnum = enumDecl("Permission", "{ Read, Admin }");

    const authBlock = markup("auth", [attr("role", "Admin")]);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [page]);  // no inner enums
    const entryFile = file("/abs/entry.scrml", [program]);  // no typeDecls

    const userRoleFile = file("/abs/user-role.scrml", [], {
      typeDecls: [userRoleEnum],
      hasProgramRoot: false,
    });
    const permFile = file("/abs/perm.scrml", [], {
      typeDecls: [permEnum],
      hasProgramRoot: false,
    });

    const { graph, errors } = runAuthGraph(
      [entryFile, userRoleFile, permFile],
      null,
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe("E-AUTH-GRAPH-002");
    expect(errors[0]!.message).toContain("UserRole");
    expect(errors[0]!.message).toContain("Permission");
    expect(errors[0]!.message).toContain("(b)+(c) discovery dual rule");
    expect(graph.roleEnum).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §5 — Empty-role-enum + no-role-enum handling
// ---------------------------------------------------------------------------

describe("§5 no-enum handling (A-3.2.b)", () => {
  test("no auth gates + no role enum → synthesized `_anonymous` floor", () => {
    // Adopter has no auth surface at all. Per PIPELINE Stage 7.6 line
    // 2380, RS treats every entry point as having a single anonymous
    // viewer role. A-3.2 synthesizes the `_anonymous` enum so the
    // downstream traversal has a role to dispatch on.
    const program = markup("program", [], [markup("h1")]);
    const f = file("/abs/no-auth.scrml", [program]);

    const { graph, errors } = runAuthGraph([f], null);

    expect(errors).toHaveLength(0);
    expect(graph.roleEnum).not.toBeNull();
    expect(graph.roleEnum!.name).toBe("_anonymous");
    expect(graph.roleEnum!.variants).toEqual(["_anonymous"]);
    expect(graph.roleEnum!.isImplicitAnonymous).toBe(true);
    expect(graph.gates.size).toBe(0);
  });

  test("only binary auth gates (program-auth required) + no role enum → synthesized `_anonymous` floor, no diagnostic", () => {
    // `<program auth="required">` is a binary gate (session presence),
    // not a role-variant reference. A-3.2 does NOT require a role enum
    // for binary gates — synthesizes the floor.
    const program = markup("program", [attr("auth", "required")]);
    const f: FileAST = {
      filePath: "/abs/binary.scrml",
      nodes: [program],
      imports: [],
      exports: [],
      components: [],
      typeDecls: [],
      spans: {},
      hasProgramRoot: true,
      authConfig: {
        auth: "required",
        loginRedirect: "/login",
        csrf: "off",
        sessionExpiry: "1h",
      },
      middlewareConfig: null,
    };

    const { graph, errors } = runAuthGraph([f], null);

    expect(errors).toHaveLength(0);
    expect(graph.gates.size).toBe(1);
    expect(graph.roleEnum).not.toBeNull();
    expect(graph.roleEnum!.isImplicitAnonymous).toBe(true);
    expect(graph.roleEnum!.name).toBe("_anonymous");
  });

  test("auth-role-block gate (variant-referencing) + no role enum → E-AUTH-GRAPH-002", () => {
    // <auth role="admin"> is a variant-referencing gate. No backing
    // enum declared → E-AUTH-GRAPH-002 fires (per dispatch brief
    // A-3.2.b).
    const authBlock = markup("auth", [attr("role", "admin")]);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [page]);
    const f = file("/abs/gated.scrml", [program]);

    const { graph, errors } = runAuthGraph([f], null);

    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe("E-AUTH-GRAPH-002");
    expect(errors[0]!.message).toContain("no `:enum` is declared at app scope");
    expect(errors[0]!.filePath).toBe("/abs/gated.scrml");
    expect(graph.roleEnum).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §6 — Variant parser edge cases (private helper coverage via integration)
// ---------------------------------------------------------------------------

describe("§6 variant parser edge cases (via resolveRoleEnum integration)", () => {
  test("enum with comma-separated variants on one line → all variants parsed", () => {
    const e = enumDecl("UserRole", "{ A, B, C, D }");
    const authBlock = markup("auth", [attr("role", "C")]);
    const programLogic = logicNode([e]);
    const program = markup("program", [], [programLogic, markup("page", [], [authBlock])]);
    const f = file("/abs/e.scrml", [program], { typeDecls: [e] });

    const { graph } = runAuthGraph([f], null);

    expect(graph.roleEnum!.variants).toEqual(["A", "B", "C", "D"]);
  });

  test("enum with newline-separated variants → all variants parsed", () => {
    const e = enumDecl("UserRole", "{\n  Alpha\n  Beta\n  Gamma\n}");
    const authBlock = markup("auth", [attr("role", "Beta")]);
    const programLogic = logicNode([e]);
    const program = markup("program", [], [programLogic, markup("page", [], [authBlock])]);
    const f = file("/abs/nl.scrml", [program], { typeDecls: [e] });

    const { graph } = runAuthGraph([f], null);

    expect(graph.roleEnum!.variants).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  test("enum with payload variants → payload stripped from variant name", () => {
    const e = enumDecl("State", "{ Pending, Success(n:number), Failed(msg:string) }");
    const f = file("/abs/p.scrml", [markup("program", [], [logicNode([e])])], {
      typeDecls: [e],
    });

    const { graph } = runAuthGraph([f], null);

    // (b) yielded zero (no <auth role=>); (c) found via entry-file
    // program-scope. Variant payloads stripped.
    expect(graph.roleEnum!.variants).toEqual(["Pending", "Success", "Failed"]);
  });
});
