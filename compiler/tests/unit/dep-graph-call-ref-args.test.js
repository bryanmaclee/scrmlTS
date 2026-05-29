/**
 * dep-graph-call-ref-args.test.js — Stage 7 DG E-DG-002 false-fire on
 * `@var` references nested inside call-ref attribute arguments
 * (`<button onclick=fn(@var)>`).
 *
 * Bug 4.5 (S87) — sibling fix to Bug 4 (commit cee4469). The
 * route-inference walker (W-DEAD-FUNCTION / markupReferencedNames) was
 * already correctly recursing into call-ref args via
 * `route-inference.ts:2087-2100`. The dependency-graph "has-readers"
 * walker `sweepNodeForAtRefs` was the SIBLING that missed the same
 * shape — its markup-attr scan
 * (`compiler/src/dependency-graph.ts:1812-1849`) handled
 * `string` / `variable-ref` / `expr` attrVal kinds but skipped the
 * `call-ref` kind. Args containing `@var` were never credited to the
 * cell's reader set, so E-DG-002 false-fired on every cell consumed
 * exclusively through a call-ref attribute (e.g.
 * `<button onclick=delete(@todoId)>`).
 *
 * Coverage:
 *   T1  Single `@var` arg — `<button onclick=logIt(@cell)>` no E-DG-002.
 *   T2  Multiple args including `@var` — `fn(@a, "x", @b)` credits both.
 *   T3  Nested member access — `fn(@compound.field)` credits parent.
 *   T4  Multiple call-refs on same element — `<input onfocus=a(@x)
 *       onblur=b(@y)>` credits both.
 *   T5  Transitive read via called function — `<button onclick=updateAll()>`
 *       where `updateAll()` reads `@count` credits @count to readers.
 *   T6  REGRESSION GUARD — truly-dead cell (no call-ref or other reader)
 *       STILL fires E-DG-002 (the fix MUST NOT mask substantive cases).
 *   T7  REGRESSION GUARD — call-ref args without `@var` (literals only)
 *       behave normally; no spurious credit and no error.
 *   T8  REGRESSION GUARD — existing variable-ref / expr / string attrVal
 *       paths still work (composes cleanly with the new branch).
 *
 * Spec authority: SPEC §31.5 (DG normative), §34 (E-DG-002 catalog),
 *   §5.2.2 (event-handler attribute syntax — call-ref form),
 *   §6 (V5-strict access — `@cell` is a read).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join, resolve } from "path";
import { compileScrml } from "../../src/api.js";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/dep-graph-call-ref-args");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

beforeAll(() => { mkdirSync(FIXTURE_DIR, { recursive: true }); });
afterAll(() => { rmSync(FIXTURE_DIR, { recursive: true, force: true }); });

function compileSource(source, filename = "test.scrml") {
  const filePath = resolve(join(FIXTURE_DIR, filename));
  writeFileSync(filePath, source);
  const result = compileScrml({ inputFiles: [filePath], outputDir: FIXTURE_OUTPUT, write: true });
  const fatalErrors = result.errors || [];
  const warnings = result.warnings || [];
  const allDiagnostics = [...fatalErrors, ...warnings];
  return { errors: allDiagnostics, warnings, fatalErrors };
}

function edg002For(diagnostics, varName) {
  return diagnostics.find((e) =>
    e.code === "E-DG-002" && new RegExp("`@" + varName + "`").test(e.message)
  );
}

function wDeadFor(diagnostics, fnName) {
  return diagnostics.find((e) =>
    e.code === "W-DEAD-FUNCTION" && new RegExp("`" + fnName + "`").test(e.message)
  );
}

describe("Bug 4.5 — DG sweepNodeForAtRefs handles call-ref attrVal", () => {
  test("T1: single `@var` arg — <button onclick=logIt(@cell)> — no E-DG-002 on @cell", () => {
    // Canonical repro from Bug 4.5 brief.
    const source = [
      "<program>",
      "  ${",
      "    @cell = \"hello\"",
      "    function logIt(msg) { console.log(msg) }",
      "  }",
      "  <button onclick=logIt(@cell)>Click</>",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "t1-single-arg.scrml");
    expect(fatalErrors).toEqual([]);
    expect(edg002For(errors, "cell")).toBeUndefined();
    // The called function is referenced by the call-ref name; should not be dead.
    expect(wDeadFor(errors, "logIt")).toBeUndefined();
  });

  test("T2: multiple args including @var — fn(@a, \"x\", @b) credits BOTH", () => {
    const source = [
      "<program>",
      "  ${",
      "    @first = \"hello\"",
      "    @second = 42",
      "    function combine(a, label, b) { return a + label + b }",
      "  }",
      "  <button onclick=combine(@first, \"x\", @second)>Combine</>",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "t2-multiple-args.scrml");
    expect(fatalErrors).toEqual([]);
    expect(edg002For(errors, "first")).toBeUndefined();
    expect(edg002For(errors, "second")).toBeUndefined();
    expect(wDeadFor(errors, "combine")).toBeUndefined();
  });

  test("T3: nested member access — fn(@compound.field) credits parent compound", () => {
    // S142 gate-tail: ad-hoc compound state uses the canonical structural-
    // children form (PRIMER §5 / SPEC §6.3) — `<user> <name>=.. <age>=.. </>`.
    // The pre-S142 brace form `<user> = { <name> = .. }` is NOT a recognized
    // compound shape; it parsed as a plain cell whose init was the raw markup
    // string, leaking `_scrml_reactive_set("user", { < name > = .. })` (invalid
    // JS the emit gate now catches).
    const source = [
      "<program>",
      "  ${",
      "    <user>",
      "      <name> = \"alice\"",
      "      <age> = 30",
      "    </>",
      "    function greet(label) { console.log(label) }",
      "  }",
      "  <button onclick=greet(@user.name)>Greet</>",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "t3-nested-member.scrml");
    expect(fatalErrors).toEqual([]);
    // The compound parent `@user` is the registered cell name; nested member
    // access via `@user.name` should credit `@user`.
    expect(edg002For(errors, "user")).toBeUndefined();
    expect(wDeadFor(errors, "greet")).toBeUndefined();
  });

  test("T4: multiple call-refs on same element — both credited", () => {
    const source = [
      "<program>",
      "  ${",
      "    @focusVar = \"f\"",
      "    @blurVar = \"b\"",
      "    function onF(x) { console.log(x) }",
      "    function onB(x) { console.log(x) }",
      "  }",
      "  <input onfocus=onF(@focusVar) onblur=onB(@blurVar) />",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "t4-multiple-attrs.scrml");
    expect(fatalErrors).toEqual([]);
    expect(edg002For(errors, "focusVar")).toBeUndefined();
    expect(edg002For(errors, "blurVar")).toBeUndefined();
  });

  test("T5: transitive read via called function — <button onclick=updateAll()> credits cells read inside updateAll", () => {
    // No `@var` arg, but the called function transitively reads `@count`.
    // The fnTransitiveReads map (built upstream in dep-graph) should be
    // queried from the call-ref `name` field, mirroring the existing
    // `extractCallees` path at `dependency-graph.ts:1795-1803`.
    const source = [
      "<program>",
      "  ${",
      "    @count = 0",
      "    function updateAll() {",
      "      console.log(@count)",
      "    }",
      "  }",
      "  <button onclick=updateAll()>Update</>",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "t5-transitive.scrml");
    expect(fatalErrors).toEqual([]);
    // `@count` is read inside `updateAll`; transitively credits the call-ref.
    expect(edg002For(errors, "count")).toBeUndefined();
    expect(wDeadFor(errors, "updateAll")).toBeUndefined();
  });

  test("T6: NEGATIVE — truly-dead cell with NO reader STILL fires E-DG-002", () => {
    // Substantive guard: the fix must NOT mask cells that genuinely have
    // no readers. `@unused` is declared but never appears in any markup,
    // any function body, or any call-ref arg.
    const source = [
      "<program>",
      "  ${",
      "    @unused = \"truly orphaned\"",
      "    @reader = \"read by call-ref\"",
      "    function consume(x) { console.log(x) }",
      "  }",
      "  <button onclick=consume(@reader)>Click</>",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "t6-truly-dead.scrml");
    expect(fatalErrors).toEqual([]);
    // Substantive case: `@unused` has zero readers — warning MUST fire.
    expect(edg002For(errors, "unused")).toBeDefined();
    // `@reader` IS read via the call-ref — must NOT fire (false-fire would
    // be the original bug shape).
    expect(edg002For(errors, "reader")).toBeUndefined();
  });

  test("T7: REGRESSION — call-ref with literal-only args (no @var) behaves normally", () => {
    // The new branch must short-circuit cleanly when args contain no
    // `@var` references — no spurious credits, no errors.
    const source = [
      "<program>",
      "  ${",
      "    function logLabel(label, n) { console.log(label, n) }",
      "  }",
      "  <button onclick=logLabel(\"clicked\", 42)>Click</>",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "t7-literal-args.scrml");
    expect(fatalErrors).toEqual([]);
    expect(wDeadFor(errors, "logLabel")).toBeUndefined();
  });

  test("T8: REGRESSION — variable-ref / string attrVal paths still work (composes with new branch)", () => {
    // Defense-in-depth: confirm the existing variable-ref + raw-string
    // attrVal branches still credit `@var` correctly, post-fix.
    const source = [
      "<program>",
      "  ${",
      "    @vrefVar = \"v\"",
      "    @rawVar = true",
      "  }",
      "  <input value=@vrefVar disabled=@rawVar />",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "t8-existing-paths.scrml");
    expect(fatalErrors).toEqual([]);
    expect(edg002For(errors, "vrefVar")).toBeUndefined();
    expect(edg002For(errors, "rawVar")).toBeUndefined();
  });
});
