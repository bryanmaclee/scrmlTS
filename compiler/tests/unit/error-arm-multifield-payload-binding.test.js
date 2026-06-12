/**
 * error-arm-multifield-payload-binding.test.js
 *
 * Gap 1 (payload-binding-gaps-2026-06-11 / S184 dog-food) — a 2+-field error
 * variant's `!{}` handler arm using the §19.4.3 canonical PAREN form
 * `::V(a, b)` must bind ALL its payload fields into the handler-body scope.
 *
 * Root: the `!{}` parser (ast-builder.js) captures the paren bindings as the
 * comma-JOINED string `arm.binding = "field, detail"`. The typer
 * (type-system.ts) bound that literal as a SINGLE scope name, so individual
 * `field`/`detail` never resolved -> E-SCOPE-001 in the handler body.
 *
 * Fix: split `arm.binding` on `,` and bind each trimmed field name. Single-field
 * bare `::V a` (no comma) is a one-element list -> unchanged. The SPACE form
 * `::V a b` stays single-binding by design (S184 ruling — paren-only canonical).
 *
 * Coverage:
 *   §1  2-field paren `::Conflict(field, detail)` -> both bind (the repro)
 *   §2  single-field SPACE `::Network msg` -> still works (regression guard)
 *   §3  single-field paren `::Network(msg)` -> still works
 *   §4  3-field paren `::Trip(a, b, c)` -> all three bind
 *   §5  emitted handler body destructures each field + node-checks valid JS
 *   §6  cross-stream: E-SCOPE-001 absent from BOTH errors AND warnings (S92)
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { execFileSync } from "child_process";

function makeTmpDir(label) {
  const tmp = join(tmpdir(), `scrml-gap1-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(tmp, { recursive: true });
  return tmp;
}

// S92 cross-stream helper — a code can land in result.errors OR result.warnings
// depending on severity partition. Asserting only on result.errors silently
// passes if the diagnostic slips into result.warnings. Check BOTH streams.
function diagnosticsWithCode(result, code) {
  const errs = (result.errors ?? []).filter((d) => d && d.code === code);
  const warns = (result.warnings ?? []).filter((d) => d && d.code === code);
  return [...errs, ...warns];
}

function compile(label, src) {
  const tmp = makeTmpDir(label);
  const srcFile = join(tmp, "repro.scrml");
  writeFileSync(srcFile, src);
  const outDir = join(tmp, "dist");
  mkdirSync(outDir, { recursive: true });
  const result = compileScrml({ inputFiles: [srcFile], outputDir: outDir });
  return { result, tmp, outDir };
}

// ---------------------------------------------------------------------------
// §1: 2-field paren `::Conflict(field, detail)` — the reproducer
// ---------------------------------------------------------------------------

describe("Gap 1 §1: 2-field paren `::Conflict(field, detail)` binds both fields", () => {
  test("no E-SCOPE-001 on either field; handler body resolves both", () => {
    const { result, tmp } = compile("conflict", [
      "type DbError:enum = { Conflict(field: string, detail: string), Gone }",
      "function save() ! DbError { fail DbError::Conflict(\"e\", \"d\") }",
      "function run() {",
      "    const ok = save() !{",
      "        | ::Conflict(field, detail) :> { log(field + detail); return }",
      "        | ::Gone :> { return }",
      "    }",
      "    log(\"ok\")",
      "}",
    ].join("\n"));
    expect(diagnosticsWithCode(result, "E-SCOPE-001")).toEqual([]);
    expect(result.errors).toHaveLength(0);
    rmSync(tmp, { recursive: true, force: true });
  });
});

// ---------------------------------------------------------------------------
// §2: single-field SPACE `::Network msg` — regression guard (stays single-bind)
// ---------------------------------------------------------------------------

describe("Gap 1 §2: single-field SPACE `::Network msg` still binds", () => {
  test("space-form single binding unaffected by the comma-split fix", () => {
    const { result, tmp } = compile("space-single", [
      "type NetError:enum = { Network(msg: string), Gone }",
      "function fetch1() ! NetError { fail NetError::Network(\"x\") }",
      "function run() {",
      "    const r = fetch1() !{",
      "        | ::Network msg :> { log(msg); return }",
      "        | ::Gone :> { return }",
      "    }",
      "    log(\"done\")",
      "}",
    ].join("\n"));
    expect(diagnosticsWithCode(result, "E-SCOPE-001")).toEqual([]);
    expect(result.errors).toHaveLength(0);
    rmSync(tmp, { recursive: true, force: true });
  });
});

// ---------------------------------------------------------------------------
// §3: single-field paren `::Network(msg)` — one-element comma-split list
// ---------------------------------------------------------------------------

describe("Gap 1 §3: single-field paren `::Network(msg)` binds", () => {
  test("paren single-field is a one-element list -> binds cleanly", () => {
    const { result, tmp } = compile("paren-single", [
      "type NetError:enum = { Network(msg: string), Gone }",
      "function fetch1() ! NetError { fail NetError::Network(\"x\") }",
      "function run() {",
      "    const r = fetch1() !{",
      "        | ::Network(msg) :> { log(msg); return }",
      "        | ::Gone :> { return }",
      "    }",
      "    log(\"done\")",
      "}",
    ].join("\n"));
    expect(diagnosticsWithCode(result, "E-SCOPE-001")).toEqual([]);
    expect(result.errors).toHaveLength(0);
    rmSync(tmp, { recursive: true, force: true });
  });
});

// ---------------------------------------------------------------------------
// §4: 3-field paren `::Trip(a, b, c)` — all three bind
// ---------------------------------------------------------------------------

describe("Gap 1 §4: 3-field paren `::Trip(a, b, c)` binds all three", () => {
  test("no E-SCOPE-001 on a/b/c; all three resolve in the handler body", () => {
    const { result, tmp } = compile("triple", [
      "type Tri:enum = { Trip(a: string, b: string, c: string), Ok }",
      "function fetch3() ! Tri { fail Tri::Trip(\"1\", \"2\", \"3\") }",
      "function run() {",
      "    const r = fetch3() !{",
      "        | ::Trip(a, b, c) :> { log(a + b + c); return }",
      "        | ::Ok :> { return }",
      "    }",
      "    log(\"done\")",
      "}",
    ].join("\n"));
    expect(diagnosticsWithCode(result, "E-SCOPE-001")).toEqual([]);
    expect(result.errors).toHaveLength(0);
    rmSync(tmp, { recursive: true, force: true });
  });
});

// ---------------------------------------------------------------------------
// §5: emitted handler body destructures each field + node --check valid JS
// ---------------------------------------------------------------------------

describe("Gap 1 §5: emitted JS binds each field + is valid", () => {
  test("handler body destructures field/detail; client.js node-checks clean", () => {
    const { result, tmp, outDir } = compile("emit", [
      "type DbError:enum = { Conflict(field: string, detail: string), Gone }",
      "function save() ! DbError { fail DbError::Conflict(\"e\", \"d\") }",
      "function run() {",
      "    const ok = save() !{",
      "        | ::Conflict(field, detail) :> { log(field + detail); return }",
      "        | ::Gone :> { return }",
      "    }",
      "    log(\"ok\")",
      "}",
    ].join("\n"));
    expect(result.errors).toHaveLength(0);

    const clientJs = readFileSync(join(outDir, "repro.client.js"), "utf8");
    // Each payload field is destructured from the error data before use.
    expect(clientJs).toMatch(/const field = [^\n]*\.data\.field/);
    expect(clientJs).toMatch(/const detail = [^\n]*\.data\.detail/);

    // node --check the emitted client.js — no free-variable / syntax errors.
    const checkPath = join(outDir, "repro.client.js");
    expect(() => execFileSync("node", ["--check", checkPath])).not.toThrow();

    rmSync(tmp, { recursive: true, force: true });
  });
});
