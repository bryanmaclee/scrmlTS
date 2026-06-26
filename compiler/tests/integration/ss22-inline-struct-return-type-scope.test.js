/**
 * ss22 item 2 — g-server-fn-typed-object-literal-return (typer-scope false-fire).
 *
 * A function with an INLINE STRUCT return-type annotation
 * (`function f(id) -> { name: string, age: number } { body }`) false-fired
 * E-SCOPE-001 on the FIELD NAME (`name`). ROOT (corrected from the original
 * "server-fn object-literal field key" hypothesis): the ast-builder's
 * return-type-annotation skip loop broke on the FIRST depth-0 `{` — which for
 * an inline-struct return type is the TYPE's opening brace. The annotation
 * captured nothing and that `{` was consumed as the BODY opener, so the
 * function body began with `name : string , ...` — which the typer scope-walked
 * → a false E-SCOPE-001 on the field name. NOT server-specific: it fired on
 * CLIENT functions too (the original repro happened to be a server fn).
 *
 * Fix: a shared `consumeReturnTypeAnnotation` helper (ast-builder.js) treats a
 * depth-0 `{` in TYPE POSITION (annotation empty, or the previous token is a
 * type-combinator `|`/`&`/`,`) as an inline struct/object type, consuming the
 * balanced brace group into the annotation; the body-opening `{` (which follows
 * a completed type) still breaks. Applied to all four function-decl handlers in
 * parseLogicBody (top-level + nested, `:` + `->` forms).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "ss22-inline-struct-return-"));
});

afterAll(() => {
  if (TMP) rmSync(TMP, { recursive: true, force: true });
});

/** Compile a source string through the full pipeline (incl. typer). */
function compile(name, source) {
  const filePath = join(TMP, `${name}.scrml`);
  writeFileSync(filePath, source);
  const result = compileScrml({
    inputFiles: [filePath],
    outputDir: join(TMP, `${name}.dist`),
    write: false,
    log: () => {},
  });
  const scopeErrors = [...(result.errors || []), ...(result.warnings || [])]
    .filter((d) => d.code === "E-SCOPE-001");
  return { result, scopeErrors };
}

describe("ss22 item 2 — inline-struct return type does not scope-resolve field keys", () => {
  test("server fn with `-> { name: string, age: number }` does NOT fire E-SCOPE-001 on the field name", () => {
    const src = `<program>

\${
  server function getUser(id) -> { name: string, age: number } {
    return { name: id, age: 30 }
  }
}

<h1>x</h1>
</program>`;
    const { scopeErrors } = compile("server-inline-struct", src);
    const keyFires = scopeErrors.filter((d) => /\b(name|age)\b/.test(d.message ?? ""));
    expect(keyFires).toHaveLength(0);
  });

  test("CLIENT fn with `-> { name: string, age: number }` also does NOT fire (not server-specific)", () => {
    const src = `<program>

\${
  function getUser(id) -> { name: string, age: number } {
    return { name: id, age: 30 }
  }
}

<h1>x</h1>
</program>`;
    const { scopeErrors } = compile("client-inline-struct", src);
    const keyFires = scopeErrors.filter((d) => /\b(name|age)\b/.test(d.message ?? ""));
    expect(keyFires).toHaveLength(0);
  });

  test("inline-struct return type with a NON-object body (return a plain var) does NOT fire", () => {
    const src = `<program>

\${
  function getUser(id) -> { name: string, age: number } {
    let r = id
    return r
  }
}

<h1>x</h1>
</program>`;
    const { scopeErrors } = compile("inline-struct-var-return", src);
    const keyFires = scopeErrors.filter((d) => /\b(name|age)\b/.test(d.message ?? ""));
    expect(keyFires).toHaveLength(0);
  });

  test("union inline-struct return type `-> { name: string } | not` compiles without E-SCOPE-001 on the field", () => {
    const src = `<program>

\${
  function maybeUser(id) -> { name: string } | not {
    return { name: id }
  }
}

<h1>x</h1>
</program>`;
    const { scopeErrors } = compile("union-inline-struct", src);
    const keyFires = scopeErrors.filter((d) => /\bname\b/.test(d.message ?? ""));
    expect(keyFires).toHaveLength(0);
  });

  test("a genuinely-undeclared ident in VALUE position STILL fires E-SCOPE-001 (no over-suppression)", () => {
    const src = `<program>

\${
  function getUser(id) -> { name: string, age: number } {
    return { name: bogusUndeclaredValue, age: id }
  }
}

<h1>x</h1>
</program>`;
    const { scopeErrors } = compile("inline-struct-undeclared-value", src);
    const bogusFires = scopeErrors.filter((d) => /\bbogusUndeclaredValue\b/.test(d.message ?? ""));
    expect(bogusFires.length).toBeGreaterThan(0);
  });

  test("a genuinely-undeclared ident in the BODY still fires E-SCOPE-001 (body parsed correctly)", () => {
    const src = `<program>

\${
  function getUser(id) -> { name: string, age: number } {
    let bad = totallyUndeclared + id
    return { name: bad, age: id }
  }
}

<h1>x</h1>
</program>`;
    const { scopeErrors } = compile("inline-struct-undeclared-body", src);
    const fires = scopeErrors.filter((d) => /\btotallyUndeclared\b/.test(d.message ?? ""));
    expect(fires.length).toBeGreaterThan(0);
  });

  test("a plain type-name return `-> number { body }` still parses (no regression)", () => {
    const src = `<program>

\${
  function getN(x) -> number {
    return x + 1
  }
}

<h1>x</h1>
</program>`;
    const { result, scopeErrors } = compile("plain-type-return", src);
    expect(scopeErrors).toHaveLength(0);
    const genuine = (result.errors || []).filter((e) => e.severity == null || e.severity === "error");
    expect(genuine).toHaveLength(0);
  });
});
