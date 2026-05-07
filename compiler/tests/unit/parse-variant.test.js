/**
 * §41.13 / §53.10 — parseVariant call-site recognition + validation.
 *
 * Phase 2 deliverable 1: TS pass tests covering compile-time validation:
 *   - args[1] is a bare type-name resolving to a scrml-native :enum   → no error, annotated
 *   - args[1] is a bare type-name resolving to :struct                → E-PARSEVARIANT-TYPE-NOT-ENUM "is a struct"
 *   - args[1] is a string literal                                     → E-PARSEVARIANT-TYPE-NOT-ENUM "must be a bare type name"
 *   - args[1] is a numeric literal                                    → same
 *   - args[1] is a bare type-name that is undeclared                  → E-PARSEVARIANT-TYPE-NOT-ENUM "unknown type"
 *   - cross-file: ParseError variants reachable in `!{}` exhaustiveness
 *
 * Uses compileScrml (full pipeline) because parseVariant is imported from
 * `scrml:data` and the import resolution requires the full MOD + TS path.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "parse-variant-unit-"));
});

afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function fx(relPath, source) {
  const abs = join(TMP, relPath);
  mkdirSync(join(abs, "..").replace(/\/$/, ""), { recursive: true });
  writeFileSync(abs, source);
  return abs;
}

function realErrors(result) {
  return (result.errors || []).filter(e => e && e.severity !== "warning");
}

function compile(filename, source) {
  const abs = fx(filename, source);
  return compileScrml({
    inputFiles: [abs],
    outputDir: join(TMP, "dist"),
    write: false,
    log: () => {},
  });
}

// ---------------------------------------------------------------------------
// §1 — Happy path: arg[1] resolves to a local :enum
// ---------------------------------------------------------------------------

describe("§1 parseVariant happy path — bare-ident resolving to scrml-native enum", () => {
  test("local enum LoadResult — no errors, no E-PARSEVARIANT-* codes", () => {
    const result = compile("happy/local-enum.scrml", `\${
  import { parseVariant, ParseError } from 'scrml:data'

  type LoadResult:enum = {
    Success(rows: int)
    Empty
    Failed(reason: string)
  }

  function loadResult(raw)! -> ParseError {
    const v = parseVariant(raw, LoadResult)
    return v
  }
}
<program><p>x</p></program>
`);
    const errs = realErrors(result);
    const codes = errs.map(e => e.code);
    expect(codes.filter(c => c.startsWith("E-PARSEVARIANT-"))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §2 — Compile-error: arg[1] is a struct type
// ---------------------------------------------------------------------------

describe("§2 parseVariant — args[1] is a struct (E-PARSEVARIANT-TYPE-NOT-ENUM)", () => {
  test("struct-typed arg fires E-PARSEVARIANT-TYPE-NOT-ENUM with `is a struct`", () => {
    const result = compile("err/struct.scrml", `\${
  import { parseVariant, ParseError } from 'scrml:data'

  type Person:struct = {
    name: string
    age: number
  }

  function loadPerson(raw)! -> ParseError {
    const v = parseVariant(raw, Person)
    return v
  }
}
<program><p>x</p></program>
`);
    const errs = realErrors(result);
    const matches = errs.filter(e => e.code === "E-PARSEVARIANT-TYPE-NOT-ENUM");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some(e => /is a struct/i.test(String(e.message)))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §3 — Compile-error: arg[1] is a string literal
// ---------------------------------------------------------------------------

describe("§3 parseVariant — args[1] is a string literal (E-PARSEVARIANT-TYPE-NOT-ENUM)", () => {
  test('parseVariant(json, "Foo") fires E-PARSEVARIANT-TYPE-NOT-ENUM with "must be a bare type name"', () => {
    const result = compile("err/string-literal.scrml", `\${
  import { parseVariant, ParseError } from 'scrml:data'

  function loadX(raw)! -> ParseError {
    const v = parseVariant(raw, "Foo")
    return v
  }
}
<program><p>x</p></program>
`);
    const errs = realErrors(result);
    const matches = errs.filter(e => e.code === "E-PARSEVARIANT-TYPE-NOT-ENUM");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some(e => /must be a bare type name/i.test(String(e.message)))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §4 — Compile-error: arg[1] is a numeric literal
// ---------------------------------------------------------------------------

describe("§4 parseVariant — args[1] is a numeric literal", () => {
  test("parseVariant(json, 42) fires E-PARSEVARIANT-TYPE-NOT-ENUM", () => {
    const result = compile("err/num-literal.scrml", `\${
  import { parseVariant, ParseError } from 'scrml:data'

  function loadX(raw)! -> ParseError {
    const v = parseVariant(raw, 42)
    return v
  }
}
<program><p>x</p></program>
`);
    const errs = realErrors(result);
    const matches = errs.filter(e => e.code === "E-PARSEVARIANT-TYPE-NOT-ENUM");
    expect(matches.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// §5 — Compile-error: arg[1] is an undeclared type name
// ---------------------------------------------------------------------------

describe("§5 parseVariant — args[1] is undeclared type", () => {
  test("parseVariant(json, NoSuchType) fires E-PARSEVARIANT-TYPE-NOT-ENUM with 'unknown type'", () => {
    const result = compile("err/undeclared.scrml", `\${
  import { parseVariant, ParseError } from 'scrml:data'

  function loadX(raw)! -> ParseError {
    const v = parseVariant(raw, NoSuchType)
    return v
  }
}
<program><p>x</p></program>
`);
    const errs = realErrors(result);
    const matches = errs.filter(e => e.code === "E-PARSEVARIANT-TYPE-NOT-ENUM");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some(e => /unknown type/i.test(String(e.message)))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §6 — !{} handler exhaustiveness against ParseError
// ---------------------------------------------------------------------------

describe("§6 !{} exhaustiveness — parseVariant marked failable returning ParseError", () => {
  test("missing variant arm fires E-TYPE-080 against ParseError", () => {
    // Note: the `!{}` handler uses `_` wildcard or names every variant.
    // If the developer omits a variant AND has no wildcard, E-TYPE-080
    // should fire. This verifies the call's failure-type wired to ParseError.
    const result = compile("err-080/non-exhaustive.scrml", `\${
  import { parseVariant, ParseError } from 'scrml:data'

  type LR:enum = { Ok, NotOk }

  function go(raw)! -> ParseError {
    const v = parseVariant(raw, LR) !{
      | ::Malformed msg -> { return }
    }
    return v
  }
}
<program><p>x</p></program>
`);
    const errs = realErrors(result);
    const matches = errs.filter(e => e.code === "E-TYPE-080");
    const pvCodes = errs.filter(e => String(e.code).startsWith("E-PARSEVARIANT-"));
    expect(pvCodes).toEqual([]);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some(e => /ParseError/i.test(String(e.message)))).toBe(true);
  });

  test("wildcard `_` arm satisfies exhaustiveness — no E-TYPE-080", () => {
    const result = compile("ok-080/wildcard.scrml", `\${
  import { parseVariant, ParseError } from 'scrml:data'

  type LR2:enum = { Ok, NotOk }

  function go(raw)! -> ParseError {
    const v = parseVariant(raw, LR2) !{
      | _ -> { return }
    }
    return v
  }
}
<program><p>x</p></program>
`);
    const errs = realErrors(result);
    const matches = errs.filter(e => e.code === "E-TYPE-080");
    expect(matches).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §7 — Annotation invariant: emitted output reflects the monomorphization
// ---------------------------------------------------------------------------

describe("§7 codegen — emitted output for parseVariant is monomorphized", () => {
  test("emitted code contains a tag-discriminator switch keyed on each variant name", () => {
    const result = compile("emit/monomorph.scrml", `\${
  import { parseVariant, ParseError } from 'scrml:data'

  type Status:enum = {
    Pending
    Done(at: string)
    Cancelled(reason: string)
  }

  function go(raw)! -> ParseError {
    const v = parseVariant(raw, Status)
    return v
  }
}
<program><p>x</p></program>
`);
    // Look at any output JS — find one that has the IIFE shape.
    const errs = realErrors(result);
    expect(errs.filter(e => String(e.code).startsWith("E-PARSEVARIANT-"))).toEqual([]);
    // Output may be in serverJs or clientJs; test fixture file name keys it.
    const outputs = result.outputs;
    expect(outputs).toBeInstanceOf(Map);
    let foundMonomorph = false;
    for (const [_path, out] of outputs) {
      const allJs = (out.serverJs ?? "") + "\n" + (out.clientJs ?? "") + "\n" + (out.libraryJs ?? "");
      if (
        /switch \(_v\.tag\)/.test(allJs)
        && /case "Pending"/.test(allJs)
        && /case "Done"/.test(allJs)
        && /case "Cancelled"/.test(allJs)
        && /__scrml_error: true,\s*type:\s*"ParseError"/.test(allJs)
      ) {
        foundMonomorph = true;
        break;
      }
    }
    expect(foundMonomorph).toBe(true);
  });
});
