/**
 * lint-w-each-promotable — compiler-generated iteration exemption (S184 Fix B)
 *
 * Change-id: ghost-lint-canonical-exempt-2026-06-11
 * Gap: g-ghost-lint-canonical-form-false-positive (LOW).
 *
 * Bug surface (components / L22 dog-food):
 *   `<tableFor for=T rows=@x/>` expands (in the TS pass, emit-table-for.ts) to
 *   an equivalent `for (row of @x) { lift <tr/> }` carrying `_tableForSynth:
 *   true`. W-EACH-PROMOTABLE walked the post-TS AST and fired on that
 *   COMPILER-GENERATED for-stmt — suggesting the adopter promote to `<each>`
 *   code they never wrote (and tableFor is already the canonical declarative
 *   form for type-driven rows, §41.16).
 *
 * Fix: the lint skips any for-stmt with a truthy `_tableForSynth` marker.
 *
 * MUST NOT weaken the genuine lint: a real adopter
 * `${ for (x of @coll) { lift <li/> } }` STILL fires W-EACH-PROMOTABLE.
 */

import { describe, test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

function compileLints(source, name) {
  const tmpDir = mkdtempSync(resolve(tmpdir(), "wep-tablefor-"));
  const tmpInput = resolve(tmpDir, `${name}.scrml`);
  const outDir = resolve(tmpDir, "out");
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(tmpInput, source);
  try {
    const result = compileScrml({
      inputFiles: [tmpInput],
      write: true,
      outputDir: outDir,
    });
    return {
      errors: result.errors ?? [],
      lintDiagnostics: result.lintDiagnostics ?? [],
    };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function countCode(diags, code) {
  return diags.filter((d) => d.code === code).length;
}

// ---------------------------------------------------------------------------
// §1 tableFor-generated iteration is EXEMPT
// ---------------------------------------------------------------------------

describe("§1 W-EACH-PROMOTABLE does NOT fire on tableFor-generated iteration", () => {
  test("Minimal repro — `<tableFor for=Row rows=@rows/>`", () => {
    const src = `\${ import { tableFor } from 'scrml:data' }
type Row:struct = { id: int, name: string }
<rows>: Row[] = []
<program>
    <tableFor for=Row rows=@rows/>
</program>`;
    const { lintDiagnostics } = compileLints(src, "tf-minimal");
    expect(countCode(lintDiagnostics, "W-EACH-PROMOTABLE")).toBe(0);
  });

  test("tableFor with omit= still exempt", () => {
    const src = `\${ import { tableFor } from 'scrml:data' }
type Row:struct = { id: int, name: string, role: string }
<rows>: Row[] = []
<program>
    <tableFor for=Row rows=@rows omit=["id"]/>
</program>`;
    const { lintDiagnostics } = compileLints(src, "tf-omit");
    expect(countCode(lintDiagnostics, "W-EACH-PROMOTABLE")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §2 Negative control — genuine adopter for/lift STILL fires
// ---------------------------------------------------------------------------

describe("§2 genuine adopter `${ for ... lift }` STILL fires W-EACH-PROMOTABLE", () => {
  test("Adopter-authored for-of + lift fires (lint's purpose preserved)", () => {
    const src = `<program>
<contacts> = []

<ul>
\${ for (let c of @contacts) {
    lift <li>placeholder</li>;
} }
</ul>

</program>`;
    const { errors, lintDiagnostics } = compileLints(src, "genuine-each");
    expect(errors).toEqual([]);
    expect(countCode(lintDiagnostics, "W-EACH-PROMOTABLE")).toBeGreaterThanOrEqual(1);
  });

  test("Adopter for/lift sitting ALONGSIDE a tableFor — adopter site fires, tableFor exempt", () => {
    const src = `\${ import { tableFor } from 'scrml:data' }
type Row:struct = { id: int, name: string }
<rows>: Row[] = []
<contacts> = []
<program>
    <tableFor for=Row rows=@rows/>
    <ul>
\${ for (let c of @contacts) {
    lift <li>placeholder</li>;
} }
    </ul>
</program>`;
    const { lintDiagnostics } = compileLints(src, "mixed");
    // Exactly the adopter site fires; the tableFor-generated iteration does not.
    expect(countCode(lintDiagnostics, "W-EACH-PROMOTABLE")).toBe(1);
  });
});
