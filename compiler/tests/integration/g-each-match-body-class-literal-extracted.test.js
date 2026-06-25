/**
 * ss20 #6 (flogence cockpit finding #3) — regression GUARD: non-interpolated
 * `class="…"` literal tokens used ONLY inside `<each>` / `<match>` block-form
 * bodies MUST emit CSS rules. "Squashed bubbles" — the single most common
 * "green compile, wrong render" trap in flogence's cockpit work.
 *
 * STATE OF THE TS COMPILER (this suite's target):
 *   The TS class collector (`codegen/collect-class-names.ts`
 *   → `collectClassNamesFromAst`) ALREADY handles this — `match-block` /
 *   `each-block` body subtrees are walked via `bodyChildren` (+ match
 *   `armBodyChildren`) since the S212 fix (`d0339df0`), on top of the Bug-17
 *   `${...}`-LOGIC control-flow walk (`3b48e4df`). The `index.ts` CSS-emit
 *   path unions `scanClassesFromHtml(htmlBody)` with
 *   `collectClassNamesFromAst(nodes)`, so each/match-body literal classes
 *   reach `getAllUsedCSS`. ss17 (`72b52b6d`) touched only `emit-each.ts` (the
 *   runtime emitter) with "no runtime-template change", so the each-block AST
 *   shape — and thus this collector contract — is intact post-ss17.
 *
 *   This file is therefore a GUARD, not a RED→GREEN bug proof. The existing
 *   `g-tailwind-markup-block-scan.test.js` (S212) covers the base
 *   each/match-arm cases; this file adds the flogence-exact shape plus the
 *   ss20-brief adversarial edges S212 did NOT cover: the flogence card-stack
 *   utilities (incl. the `space-y-*` "space-between" selector form), an
 *   interpolated-class control, a class used BOTH inside and outside an each,
 *   keyed / indexed `<each>`, and a class living only in an `<empty>` body.
 *   ss20 is each-codegen follow-on work — this locks the collector↔each-block
 *   contract against future each-AST-shape churn.
 *
 *   NB (out of scope, surfaced to sPA): flogence compiles via the SELF-HOST
 *   compiler, whose class collection (`compiler/self-host/cg-parts/
 *   section-assembly.js` ~L2113-2118) is `scanClassesFromHtml(htmlBody)`-only
 *   and never calls `collectClassNamesFromAst` — so it misses ALL each/match-
 *   body classes. That is flogence's actual locus; it is B4-deferred and NOT
 *   touched here.
 *
 * Per SPEC §26.1: "the compiler scans the source for class names and emits a
 * CSS rule for each Tailwind utility class it finds." Markup position is
 * irrelevant. These are VALUE assertions on the emitted CSS text.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "g-each-match-body-class-"));
});

afterAll(() => {
  if (TMP) rmSync(TMP, { recursive: true, force: true });
});

function compileSource(name, source) {
  const filePath = join(TMP, `${name}.scrml`);
  writeFileSync(filePath, source);
  const outDir = join(TMP, `${name}.dist`);
  const result = compileScrml({
    inputFiles: [filePath],
    outputDir: outDir,
    write: true,
    log: () => {},
  });
  const errors = (result.errors || []).filter(
    e => e.severity == null || e.severity === "error",
  );
  let css = "";
  try {
    css = readFileSync(join(outDir, `${name}.css`), "utf8");
  } catch {
    // file missing — leave css empty so assertions surface a clear failure
  }
  return { errors, css };
}

// A rule for `.cls` exists if the class name appears as a selector token:
// `.cls{`, `.cls `, `.cls:`, `.cls>` or `.cls,`. Tolerant of utilities whose
// selector carries a combinator/pseudo after the class (e.g. `space-y-*`
// emits `.space-y-3 > :not([hidden]) ~ :not([hidden])`).
function hasRule(css, cls) {
  const esc = cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("\\." + esc + "(\\s|\\{|:|>|,)").test(css);
}

describe("ss20 #6: flogence card-stack — class literals only inside an <each> body emit CSS", () => {
  test("every flogence card utility used ONLY inside the <each> item body emits a rule", () => {
    // Mirrors the flogence cockpit shape: the card wrapper + its contents live
    // inside the per-node <each> body. None of these classes appear in the
    // static top-level HTML.
    const src = `<div class="p-6">
  \${ <fleet>: string[] = [] }
  <each in=@fleet as node>
    <div class="space-y-3 border-indigo-600 rounded-xl shadow-lg py-4">
      <span class="h-5">\${node}</span>
    </div>
  </each>
</div>
`;
    const { errors, css } = compileSource("flogence-cards", src);
    expect(errors).toEqual([]);

    // Top-level control — worked pre-S212.
    expect(hasRule(css, "p-6")).toBe(true);

    // The "squashed bubbles" set — all used ONLY inside the <each> body.
    expect(hasRule(css, "space-y-3")).toBe(true);      // space-between selector form
    expect(hasRule(css, "border-indigo-600")).toBe(true);
    expect(hasRule(css, "rounded-xl")).toBe(true);
    expect(hasRule(css, "shadow-lg")).toBe(true);
    expect(hasRule(css, "py-4")).toBe(true);
    expect(hasRule(css, "h-5")).toBe(true);
  });
});

describe("ss20 #6: <each>/<match> body literal-class collection — adversarial edges", () => {
  test("interpolated class routes to safelist; the static literal token is still collected", () => {
    // `class="underline ${node}"`: the static token `underline` is statically
    // extractable and MUST emit; the interpolated `${node}` portion is left to
    // the safelist (we cannot statically resolve it). Parity with the static-
    // HTML path's treatment of interpolated classes.
    const src = `<div>
  \${ <fleet>: string[] = [] }
  <each in=@fleet as node>
    <span class="underline \${node}">\${node}</span>
  </each>
</div>
`;
    const { errors, css } = compileSource("interp-class", src);
    expect(errors).toEqual([]);
    expect(hasRule(css, "underline")).toBe(true);
  });

  test("a class used BOTH inside and outside an <each> is collected once, rule present", () => {
    const src = `<div class="block">
  \${ <fleet>: string[] = [] }
  <each in=@fleet as node>
    <span class="block">\${node}</span>
  </each>
</div>
`;
    const { errors, css } = compileSource("both-in-out", src);
    expect(errors).toEqual([]);
    // Present, and exactly one rule (Set union — no duplication).
    expect(hasRule(css, "block")).toBe(true);
    const ruleCount = (css.match(/\.block\s*\{/g) || []).length;
    expect(ruleCount).toBe(1);
  });

  test("multi-token class in an <each> body — all tokens collected", () => {
    const src = `<div>
  \${ <fleet>: string[] = [] }
  <each in=@fleet as node>
    <span class="italic uppercase leading-7">\${node}</span>
  </each>
</div>
`;
    const { errors, css } = compileSource("multitoken", src);
    expect(errors).toEqual([]);
    expect(hasRule(css, "italic")).toBe(true);
    expect(hasRule(css, "uppercase")).toBe(true);
    expect(hasRule(css, "leading-7")).toBe(true);
  });

  test("keyed <each> body class emits a rule", () => {
    const src = `<div>
  \${ <fleet>: string[] = [] }
  <each in=@fleet as node key=node>
    <span class="rounded-2xl">\${node}</span>
  </each>
</div>
`;
    const { errors, css } = compileSource("keyed-each", src);
    expect(errors).toEqual([]);
    expect(hasRule(css, "rounded-2xl")).toBe(true);
  });

  test("indexed <each> body class emits a rule", () => {
    const src = `<div>
  \${ <fleet>: string[] = [] }
  <each in=@fleet as node, idx>
    <span class="tracking-tight">\${node}</span>
  </each>
</div>
`;
    const { errors, css } = compileSource("indexed-each", src);
    expect(errors).toEqual([]);
    expect(hasRule(css, "tracking-tight")).toBe(true);
  });

  test("class living only in an <each> <empty> body emits a rule", () => {
    const src = `<div>
  \${ <fleet>: string[] = [] }
  <each in=@fleet as node>
    <span class="text-emerald-500">\${node}</span>
    <empty>
      <p class="text-rose-400">no nodes</p>
    </empty>
  </each>
</div>
`;
    const { errors, css } = compileSource("empty-body", src);
    expect(errors).toEqual([]);
    expect(hasRule(css, "text-emerald-500")).toBe(true);
    expect(hasRule(css, "text-rose-400")).toBe(true);
  });

  test("deeply nested <match> inside <each> inside <match> — innermost arm class emits", () => {
    const src = `<div>
  \${
    type Phase:enum = { Idle, Ready }
    <phase>: Phase = .Idle
    <fleet>: string[] = []
  }
  <match for=Phase on=@phase>
    <Idle>
      <each in=@fleet as node>
        <match for=Phase on=@phase>
          <Idle>
            <span class="tracking-widest">\${node}</span>
          </>
          <Ready>
            <span class="ml-10">ready</span>
          </>
        </match>
      </each>
    </>
    <Ready>
      <span class="ml-12">outer ready</span>
    </>
  </match>
</div>
`;
    const { errors, css } = compileSource("deep-nest", src);
    expect(errors).toEqual([]);
    expect(hasRule(css, "tracking-widest")).toBe(true);
    expect(hasRule(css, "ml-10")).toBe(true);
    expect(hasRule(css, "ml-12")).toBe(true);
  });
});
