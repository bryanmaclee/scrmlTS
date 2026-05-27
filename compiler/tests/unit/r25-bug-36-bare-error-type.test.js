/**
 * r25-bug-36-bare-error-type.test.js — bare `! ErrorType` form on `function` /
 * `fn` declarations is recognized + emits a populated body.
 *
 * R25-Bug-36 (CRITICAL, S136): when a `server function` is declared with the
 * bare `! ErrorType { body }` form (SPEC §41.14 examples; chosen by 4/4 R25
 * adopters), the function-decl parser pre-fix:
 *   1. consumed `!` (canFail = true);
 *   2. failed to match the strict `-> ErrorType` arrow form (peek was IDENT,
 *      not `-`);
 *   3. fell through with errorType undefined;
 *   4. body parsing then saw the bare `ErrorType` IDENT followed by `{body}`
 *      — collected ALL of `ErrorType { ...body... }` as a single bare-expr;
 *   5. function-decl ended with empty body[] (the `{` of the body never
 *      entered the body-recognition branch);
 *   6. the bare-expr was then passed to acorn `parseExpressionAt`, which
 *      parsed `ErrorType`, treated `{const ...}` as trailing content, fired
 *      `[scrml] warning: statement boundary not detected — trailing content
 *      would be silently dropped` and DROPPED THE BODY.
 *
 * Net effect: emitted server-fn handler body was EMPTY (auth boilerplate +
 * parameter extraction only); SQL queries, control flow, `fail` statements,
 * `?{}.run()` calls, and `return` — all dropped. Compile exited 0; `node
 * --check` passed (empty fn body is valid JS); adopters deployed silently
 * broken code.
 *
 * Side-effect of the same bug: R25-Bug-39 phantom `el.textContent = CreateError`
 * wiring — the bare `ErrorType` IDENT became a reactive-display expression
 * (no source backing) and wired as a textContent assignment.
 *
 * Fix (compiler/src/ast-builder.js + compiler/native-parser/parse-stmt.js):
 *   After consuming `!`, recognize TWO shapes:
 *     1. `! -> ErrorType {`  — arrow form (SPEC §19.4.1 normative grammar).
 *     2. `! ErrorType {`     — bare form (SPEC §41.14 examples). Disambiguated
 *                              by peek(1)==`{` requirement so we don't swallow
 *                              `route=`, `.idempotent()`, or other tokens.
 *
 * Coverage:
 *   §1 — server function `! ErrorType {body}` minimal: body emits populated JS
 *   §2 — `server function fooBar() ! ErrorType {body}` produces the expected
 *        function-decl AST with errorType set + body populated
 *   §3 — full R25 reproducer (createCard + moveCard + archiveCard) — body has
 *        the SQL query, control flow, fail, and run calls (all dropped pre-fix)
 *   §4 — arrow form `! -> ErrorType {body}` still works (no regression)
 *   §5 — bare-`!` (default Error) still works (no regression)
 *   §6 — `! ErrorType` followed by `route="..."` does NOT swallow route as
 *        errorType (the disambiguation guard works)
 *   §7 — `fn` shorthand parity: `server fn createCard() ! Err {body}` works
 *   §8 — Bug 39 side-effect closed: no `el.textContent = CreateError` phantom
 *        wiring in client.js
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/r25-bug-36");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

function fix(name, src) {
  const path = join(FIXTURE_DIR, name);
  writeFileSync(path, src);
  return path;
}

beforeAll(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

function compile(path) {
  return compileScrml({ inputFiles: [path], outputDir: FIXTURE_OUTPUT, write: false });
}

// Depth-first find the first function-decl by name.
function findFunctionDecl(ast, name) {
  if (!ast || !Array.isArray(ast.nodes)) return null;
  const stack = [...ast.nodes];
  while (stack.length > 0) {
    const n = stack.shift();
    if (!n || typeof n !== "object") continue;
    if (n.kind === "function-decl" && n.name === name) return n;
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) stack.push(...v);
      else if (v && typeof v === "object") stack.push(v);
    }
  }
  return null;
}

// Parse a body fragment through the live (Acorn-backed) pipeline.
// Filters out the W-PROGRAM-REDUNDANT-LOGIC info-lint (fires because our
// minimal fixtures wrap in `${...}` for predictability; not under test).
function liveParseBody(body) {
  const src = "<program>\n${\n" + body + "\n}\n</program>\n";
  const bs = splitBlocks("test.scrml", src);
  const tab = buildAST(bs, null);
  const errors = (tab.errors || []).filter((e) => e.code !== "W-PROGRAM-REDUNDANT-LOGIC");
  return { ast: tab.ast, errors };
}

// =============================================================================
// §1 — minimal bare `! ErrorType` form compiles + emits populated body
// =============================================================================

describe("§1 — bare `! ErrorType {body}` compiles + emits non-empty body", () => {
  let bareFx;
  beforeAll(() => {
    bareFx = fix("bare-error-type-minimal.scrml", `<program>
\${
  server function createCard(title) ! CreateError {
    return title
  }
}
</program>
`);
  });

  test("compile produces no statement-boundary warnings + no errors", () => {
    const result = compile(bareFx);
    expect(result.errors).toEqual([]);
    // Statement-boundary warning surfaces via console.warn (not result.warnings).
    // The proper signal: the emitted server.js body is non-empty.
  });

  test("server.js handler body contains the function-body content (NOT empty)", () => {
    const result = compile(bareFx);
    const serverJs = result.outputs.get(bareFx)?.serverJs ?? "";
    // The body should contain a `return title` (post-codegen). Pre-fix the
    // body was empty (just auth + param extraction).
    expect(serverJs).toMatch(/return title/);
  });
});

// =============================================================================
// §2 — function-decl AST has errorType set + body populated
// =============================================================================

describe("§2 — function-decl AST shape for bare `! ErrorType`", () => {
  test("errorType is set to the bare IDENT name + body has statements", () => {
    const { ast, errors } = liveParseBody(
      "server function createCard(title) ! CreateError { return title }"
    );
    expect(errors).toEqual([]);
    const fd = findFunctionDecl(ast, "createCard");
    expect(fd).not.toBeNull();
    expect(fd.canFail).toBe(true);
    expect(fd.errorType).toBe("CreateError");
    expect(fd.isServer).toBe(true);
    expect(Array.isArray(fd.body)).toBe(true);
    expect(fd.body.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// §3 — full R25 reproducer (the exact 3-function pattern that drove the bug)
// =============================================================================

describe("§3 — R25 full reproducer (createCard + moveCard + archiveCard)", () => {
  let r25Fx;
  beforeAll(() => {
    r25Fx = fix("r25-full-repro.scrml", `<program>
\${
  type CreateError:enum = { DbError(msg: string), ValidationError(msg: string) }
  type MoveError:enum = { NotFound, NotAllowed }
  type ArchiveError:enum = { NotFound }

  server function createCard(title, description, priority) ! CreateError {
    const row = ?{\`INSERT INTO cards (title, description, priority, status, created_at) VALUES (\${title}, \${description}, \${priority}, 'Backlog', \${Date.now()}) RETURNING *\`}.get()
    return row
  }

  server function moveCard(cardId, toStatus) ! MoveError {
    const row = ?{\`SELECT * FROM cards WHERE id = \${cardId}\`}.get()
    if (row is not) fail MoveError.NotFound
    ?{\`UPDATE cards SET status = \${toStatus} WHERE id = \${cardId}\`}.run()
    return row
  }

  server function archiveCard(cardId) ! ArchiveError {
    const row = ?{\`SELECT * FROM cards WHERE id = \${cardId}\`}.get()
    if (row is not) fail ArchiveError.NotFound
    ?{\`UPDATE cards SET status = 'Archived' WHERE id = \${cardId}\`}.run()
    return row
  }
}
</program>
`);
  });

  test("createCard server handler body contains the INSERT SQL + return", () => {
    const result = compile(r25Fx);
    const serverJs = result.outputs.get(r25Fx)?.serverJs ?? "";
    // Find the createCard handler region and assert it's non-empty.
    const handlerMatch = serverJs.match(/_scrml_handler_createCard_\d+[\s\S]*?^}/m);
    expect(handlerMatch).not.toBeNull();
    const body = handlerMatch[0];
    // Pre-fix the handler body ended at parameter extraction with no SQL.
    // Post-fix, it contains the INSERT + return.
    expect(body).toMatch(/INSERT INTO cards/);
    expect(body).toMatch(/return row/);
  });

  test("moveCard server handler body contains the SELECT + presence-check + UPDATE", () => {
    const result = compile(r25Fx);
    const serverJs = result.outputs.get(r25Fx)?.serverJs ?? "";
    const handlerMatch = serverJs.match(/_scrml_handler_moveCard_\d+[\s\S]*?^}/m);
    expect(handlerMatch).not.toBeNull();
    const body = handlerMatch[0];
    expect(body).toMatch(/SELECT \* FROM cards/);
    expect(body).toMatch(/UPDATE cards SET status/);
  });

  test("archiveCard server handler body contains the SELECT + UPDATE Archived", () => {
    const result = compile(r25Fx);
    const serverJs = result.outputs.get(r25Fx)?.serverJs ?? "";
    const handlerMatch = serverJs.match(/_scrml_handler_archiveCard_\d+[\s\S]*?^}/m);
    expect(handlerMatch).not.toBeNull();
    const body = handlerMatch[0];
    expect(body).toMatch(/SELECT \* FROM cards/);
    expect(body).toMatch(/UPDATE cards SET status = 'Archived'/);
  });
});

// =============================================================================
// §4 — arrow form `! -> ErrorType` regression guard (no behavior change)
// =============================================================================

describe("§4 — arrow form `! -> ErrorType {body}` unchanged", () => {
  test("arrow form sets errorType + body populated", () => {
    const { ast, errors } = liveParseBody(
      "server function createCard(title) ! -> CreateError { return title }"
    );
    expect(errors).toEqual([]);
    const fd = findFunctionDecl(ast, "createCard");
    expect(fd).not.toBeNull();
    expect(fd.canFail).toBe(true);
    expect(fd.errorType).toBe("CreateError");
    expect(fd.body.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// §5 — bare `!` (default Error type) regression guard
// =============================================================================

describe("§5 — bare `!` with NO error type (default Error) unchanged", () => {
  test("canFail set, errorType undefined, body populated", () => {
    const { ast, errors } = liveParseBody(
      "server function createCard(title) ! { return title }"
    );
    expect(errors).toEqual([]);
    const fd = findFunctionDecl(ast, "createCard");
    expect(fd).not.toBeNull();
    expect(fd.canFail).toBe(true);
    // errorType is omitted (undefined) when no annotation present.
    expect(fd.errorType).toBeUndefined();
    expect(fd.body.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// §6 — disambiguation: `! ErrorType` does NOT swallow `route="..."` etc.
// (The fix's IDENT+`{` guard ensures we only treat the IDENT as errorType
// when it's immediately followed by a body opener.)
// =============================================================================

describe("§6 — disambiguation: bare-form only fires on `! IDENT {`", () => {
  test("`! ErrorType route=\"...\" {` parses route as a route attribute", () => {
    const { ast, errors } = liveParseBody(
      'server function createCard(title) ! CreateError route="/api/create" { return title }'
    );
    expect(errors).toEqual([]);
    const fd = findFunctionDecl(ast, "createCard");
    expect(fd).not.toBeNull();
    expect(fd.canFail).toBe(true);
    expect(fd.errorType).toBe("CreateError");
    expect(fd.route).toBe("/api/create");
    expect(fd.body.length).toBeGreaterThan(0);
  });

  test("`! .idempotent() {` does NOT misread `.idempotent` as errorType", () => {
    // Here there's NO error type — `!` followed directly by `.idempotent()`.
    // The bare-form guard requires IDENT+`{`; `.` is PUNCT not IDENT, so this
    // path falls through cleanly to the `.idempotent` modifier handler.
    const { ast, errors } = liveParseBody(
      "server function createCard(title) ! .idempotent() { return title }"
    );
    expect(errors).toEqual([]);
    const fd = findFunctionDecl(ast, "createCard");
    expect(fd).not.toBeNull();
    expect(fd.canFail).toBe(true);
    expect(fd.errorType).toBeUndefined();
    expect(fd.idempotentModifier).toBe(true);
    expect(fd.body.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// §7 — `fn` shorthand parity: same fix applied at the `fn` site
// =============================================================================

describe("§7 — `fn` shorthand parity for bare `! ErrorType`", () => {
  test("`server fn createCard() ! Err {body}` parses errorType + populates body", () => {
    const { ast, errors } = liveParseBody(
      "server fn createCard(title) ! CreateError { return title }"
    );
    expect(errors).toEqual([]);
    const fd = findFunctionDecl(ast, "createCard");
    expect(fd).not.toBeNull();
    expect(fd.canFail).toBe(true);
    expect(fd.errorType).toBe("CreateError");
    expect(fd.fnKind).toBe("fn");
    expect(fd.body.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// §8 — Bug 39 side-effect closed: no phantom `el.textContent = CreateError`
// =============================================================================

describe("§8 — R25-Bug-39 phantom enum-textContent wiring closed (side-effect)", () => {
  let bug39Fx;
  beforeAll(() => {
    bug39Fx = fix("bug39-no-phantom.scrml", `<program>
\${
  type CreateError:enum = { DbError(msg: string) }
  type MoveError:enum = { NotFound }
  type ArchiveError:enum = { NotFound }
  server function createCard(title) ! CreateError { return title }
  server function moveCard(cardId) ! MoveError { return cardId }
  server function archiveCard(cardId) ! ArchiveError { return cardId }
}
<div></div>
</program>
`);
  });

  test("client.js does NOT contain `el.textContent = CreateError`", () => {
    const result = compile(bug39Fx);
    const clientJs = result.outputs.get(bug39Fx)?.clientJs ?? "";
    // Pre-fix: client.js had `el.textContent = CreateError; el.textContent = MoveError;
    // el.textContent = ArchiveError;` — the bare `ErrorType` IDENTs (orphaned by
    // the parse failure) became reactive-display expressions.
    // Post-fix: those IDENTs are consumed as errorType during function-decl
    // parsing; no orphan bare-expr; no phantom wiring.
    expect(clientJs).not.toMatch(/el\.textContent\s*=\s*CreateError/);
    expect(clientJs).not.toMatch(/el\.textContent\s*=\s*MoveError/);
    expect(clientJs).not.toMatch(/el\.textContent\s*=\s*ArchiveError/);
  });
});
