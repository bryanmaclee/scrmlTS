/**
 * dg-projected-var-reader-credit.test.js — Stage 7 DG E-DG-002 reader credit
 * for §51.9 derived-engine projected reactive variables.
 *
 * Regression for v0.2.4 #3: `creditReader` in compiler/src/dependency-graph.ts
 * previously redirected reads of a projected var (e.g. `@healthRisk`) ONLY
 * to its source var (`@marioState`), zeroing out the projected var's own
 * direct reader set. The post-Stage-7 unused-reactive sweep then false-fired
 * E-DG-002 on every projected var that had downstream consumers.
 *
 * Fix: credit BOTH the projected var AND the upstream source.
 *
 * Coverage:
 *   1. POSITIVE: projected var with downstream reads (markup interpolation,
 *      function-call arg, if= attribute) — no E-DG-002 on the projected var.
 *   2. NEGATIVE: projected var with ZERO actual readers — E-DG-002 DOES still
 *      fire on the projected var (the substantive case must keep working).
 *   3. SOURCE-VAR PRESERVED: source var continues to be credited via the
 *      projection redirect (no false-fire on the source).
 *
 * Spec authority: SPEC §51.9 (derived/projection engines), §31.5 (DG normative),
 * §34 (E-DG-002 catalog).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { compileScrml } from "../../src/api.js";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/dg-projected-var-reader-credit");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

beforeAll(() => { mkdirSync(FIXTURE_DIR, { recursive: true }); });
afterAll(() => { rmSync(FIXTURE_DIR, { recursive: true, force: true }); });

function compileSource(source, filename = "test.scrml") {
  const filePath = resolve(join(FIXTURE_DIR, filename));
  writeFileSync(filePath, source);
  const result = compileScrml({ inputFiles: [filePath], outputDir: FIXTURE_OUTPUT, write: true });
  // api.js splits errors into `result.errors` (fatal-grade) and `result.warnings`.
  // E-DG-002 is a `warning` severity diagnostic — read both channels and union.
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

describe("§51.9 derived-engine projected var — E-DG-002 reader credit", () => {
  test("POSITIVE: projected var with markup ${@projected} read fires no E-DG-002", () => {
    const source = [
      "${",
      "  type MarioState:enum = { Small, Big, Fire, Cape }",
      "  type HealthRisk:enum = { AtRisk, Safe }",
      "}",
      "",
      "<engine for=MarioState initial=.Small>",
      "  <Small rule=(.Big | .Fire | .Cape)></>",
      "  <Big   rule=(.Fire | .Cape | .Small)></>",
      "  <Fire  rule=.Small></>",
      "  <Cape  rule=.Small></>",
      "</>",
      "",
      "<engine for=HealthRisk derived=@marioState>",
      "  .Small               => .AtRisk",
      "  .Big | .Fire | .Cape => .Safe",
      "</>",
      "",
      "<program>",
      "  <p>Status: ${@healthRisk}</>",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "projected-markup-read.scrml");
    expect(fatalErrors).toEqual([]);
    expect(edg002For(errors, "healthRisk")).toBeUndefined();
    // Source var is also credited via the §51.9 redirect.
    expect(edg002For(errors, "marioState")).toBeUndefined();
  });

  test("POSITIVE: projected var passed to fn call fires no E-DG-002", () => {
    const source = [
      "${",
      "  type MarioState:enum = { Small, Big, Fire, Cape }",
      "  type HealthRisk:enum = { AtRisk, Safe }",
      "",
      "  fn riskBanner(r: HealthRisk) -> string {",
      "    match r {",
      "      .AtRisk => \"DANGER\"",
      "      .Safe   => \"OK\"",
      "    }",
      "  }",
      "}",
      "",
      "<engine for=MarioState initial=.Small>",
      "  <Small rule=(.Big | .Fire | .Cape)></>",
      "  <Big   rule=(.Fire | .Cape | .Small)></>",
      "  <Fire  rule=.Small></>",
      "  <Cape  rule=.Small></>",
      "</>",
      "",
      "<engine for=HealthRisk derived=@marioState>",
      "  .Small               => .AtRisk",
      "  .Big | .Fire | .Cape => .Safe",
      "</>",
      "",
      "<program>",
      "  <p>${riskBanner(@healthRisk)}</>",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "projected-fncall-read.scrml");
    expect(fatalErrors).toEqual([]);
    expect(edg002For(errors, "healthRisk")).toBeUndefined();
    expect(edg002For(errors, "marioState")).toBeUndefined();
  });

  test("POSITIVE: projected var in if= attribute fires no E-DG-002", () => {
    const source = [
      "${",
      "  type MarioState:enum = { Small, Big, Fire, Cape }",
      "  type HealthRisk:enum = { AtRisk, Safe }",
      "}",
      "",
      "<engine for=MarioState initial=.Small>",
      "  <Small rule=(.Big | .Fire | .Cape)></>",
      "  <Big   rule=(.Fire | .Cape | .Small)></>",
      "  <Fire  rule=.Small></>",
      "  <Cape  rule=.Small></>",
      "</>",
      "",
      "<engine for=HealthRisk derived=@marioState>",
      "  .Small               => .AtRisk",
      "  .Big | .Fire | .Cape => .Safe",
      "</>",
      "",
      "<program>",
      "  <div if=(@healthRisk == HealthRisk::AtRisk)>WATCH OUT</>",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "projected-if-attr-read.scrml");
    expect(fatalErrors).toEqual([]);
    expect(edg002For(errors, "healthRisk")).toBeUndefined();
    expect(edg002For(errors, "marioState")).toBeUndefined();
  });

  test("NEGATIVE (regression): projected var with ZERO readers DOES fire E-DG-002", () => {
    // No reference to @healthRisk anywhere. The substantive E-DG-002 case
    // must still work — the fix must NOT mask truly-unused projected vars.
    // We DO reference @marioState in markup so the source var is consumed
    // (we want to isolate the fire to @healthRisk).
    const source = [
      "${",
      "  type MarioState:enum = { Small, Big, Fire, Cape }",
      "  type HealthRisk:enum = { AtRisk, Safe }",
      "}",
      "",
      "<engine for=MarioState initial=.Small>",
      "  <Small rule=(.Big | .Fire | .Cape)></>",
      "  <Big   rule=(.Fire | .Cape | .Small)></>",
      "  <Fire  rule=.Small></>",
      "  <Cape  rule=.Small></>",
      "</>",
      "",
      "<engine for=HealthRisk derived=@marioState>",
      "  .Small               => .AtRisk",
      "  .Big | .Fire | .Cape => .Safe",
      "</>",
      "",
      "<program>",
      "  <p>State: ${@marioState}</>",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "projected-no-readers.scrml");
    expect(fatalErrors).toEqual([]);
    // Substantive case: projected var has zero readers — warning MUST fire.
    expect(edg002For(errors, "healthRisk")).toBeDefined();
    // Source var has a reader (the ${@marioState} interpolation) — no false-fire.
    expect(edg002For(errors, "marioState")).toBeUndefined();
  });

  test("SOURCE-VAR CREDIT preserved: reading projected var still credits source", () => {
    // Only consumer of either var is `${@healthRisk}` in markup. With the
    // fix, this credits BOTH @healthRisk (directly) AND @marioState (via
    // the projection redirect). Without the upstream credit, the source
    // var would false-fire — regression guard from §51.9 slice 2.
    const source = [
      "${",
      "  type MarioState:enum = { Small, Big }",
      "  type HealthRisk:enum = { AtRisk, Safe }",
      "}",
      "",
      "<engine for=MarioState initial=.Small>",
      "  <Small rule=.Big></>",
      "  <Big rule=.Small></>",
      "</>",
      "",
      "<engine for=HealthRisk derived=@marioState>",
      "  .Small => .AtRisk",
      "  .Big   => .Safe",
      "</>",
      "",
      "<program>",
      "  <p>${@healthRisk}</>",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "source-var-credit-preserved.scrml");
    expect(fatalErrors).toEqual([]);
    expect(edg002For(errors, "healthRisk")).toBeUndefined();
    expect(edg002For(errors, "marioState")).toBeUndefined();
  });
});
