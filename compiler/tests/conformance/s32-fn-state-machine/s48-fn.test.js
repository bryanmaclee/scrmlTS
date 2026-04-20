// Conformance tests for: SPEC §48 amendments (S32, 2026-04-20)
//
// S32 retired E-FN-006 and minimized `fn` to a pure-function shorthand.
// See §48.1 (overview rewrite), §48.4 (return-site completeness relocated),
// §48.11 (relationship to `function` / `pure function`), §48.13 (normative list).
//
// STATUS: ALL TESTS SKIPPED — spec-only amendment as of commit 1d1c49d.
// Compiler implementation of E-STATE-COMPLETE (replacing E-FN-006) has NOT
// landed. These tests are gating tests for the implementer.

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../../src/api.js";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Compile a scrml source string and return { errors, warnings }.
 * Writes to a temp file, invokes compileScrml with write:false, cleans up.
 */
function diagnose(source) {
  const dir = mkdtempSync(join(tmpdir(), "scrml-conf-"));
  const path = join(dir, "app.scrml");
  writeFileSync(path, source);
  try {
    const result = compileScrml({ inputFiles: [path], write: false, mode: "library" });
    return { errors: result.errors || [], warnings: result.warnings || [] };
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

describe("S32-004: §48.11/48.13 — `fn` SHALL be semantically equivalent to `pure function`", () => {
  test.skip("CONF-S32-004: `fn` and `pure function` accept identical bodies without diagnostic delta", () => {
    // Expected: a body that is valid under `pure function` is valid under `fn`
    // and vice versa. The diagnostic set SHALL be identical for the two forms.
    const srcFn = `${"${"} fn double(x) { return x * 2 } ${"}"}`;
    const srcPureFunction = `${"${"} pure function double(x) { return x * 2 } ${"}"}`;

    const { errors: errFn, warnings: warnFn } = diagnose(srcFn);
    const { errors: errPF, warnings: warnPF } =
      diagnose(srcPureFunction);

    // The two declarations are semantically equivalent: same error set,
    // same warning set (modulo W-PURE-REDUNDANT which only affects `pure fn`).
    expect(errFn.map((e) => e.code).sort()).toEqual(
      errPF.map((e) => e.code).sort()
    );
    expect(warnFn.map((w) => w.code).sort()).toEqual(
      warnPF.map((w) => w.code).sort()
    );
  });
});

describe("S32-005: §48.13 — existing `fn` declarations SHALL be accepted without modification", () => {
  test.skip("CONF-S32-005: a pre-S32 `fn` state factory still compiles after the amendment", () => {
    // Expected: this is the original `fn buildPoint` factory form from §48.14.1.
    // Under the amendment, this SHALL still compile without error.
    const src = `
      < state Point>
          x: number
          y: number
      </>
      ${"${"}
        fn buildPoint(a, b) {
            let p = < Point> x = a y = b </>
            return p
        }
      ${"}"}
    `;
    const { errors } = diagnose(src);
    expect(errors).toEqual([]);
  });
});

describe("S32-006: §48.13/§54.6.1 — state literal completeness SHALL be enforced at the literal's closing tag", () => {
  // Gates on Phase 3 (§54.2) parser support for inline-state-literal field
  // assignments (`let p = < Product> name = n </>`). Type-system widening
  // (Phase 1b) is complete; waiting on grammar.
  test.skip("CONF-S32-006a: E-STATE-COMPLETE fires inside `fn` at the literal close, not at `return`", () => {
    // Expected: the old E-FN-006 would point at `return p`. The new
    // E-STATE-COMPLETE SHALL point at the state literal's closing tag (`</>`),
    // which is the site of the actually-unassigned field.
    const src = `
      < state Product>
          name: string
          price: number
          sku: string
      </>
      ${"${"}
        fn buildProduct(name, price) {
            let p = < Product> name = name price = price </>  // sku unassigned
            return p
        }
      ${"}"}
    `;
    const { errors } = diagnose(src);
    const eStateComplete = errors.find((e) => e.code === "E-STATE-COMPLETE");
    expect(eStateComplete).toBeDefined();
    // The diagnostic's location SHALL point at the literal's `</>`, not `return p`.
    // Implementer: assert on line/column matches the closer token.
  });

  // Gates on Phase 3 (§54.2) parser support; type-system widening (Phase 1b)
  // is live and verified via fn-constraints.test.js §9 "function bodies too" test.
  test.skip("CONF-S32-006b: E-STATE-COMPLETE fires in plain `function` at the literal close (universal scope)", () => {
    // Expected: the same check applies in a bare `function` body — before S32,
    // E-FN-006 only fired inside `fn`. Now E-STATE-COMPLETE is universal.
    const src = `
      < state User>
          name: string
          age: number
      </>
      ${"${"}
        function buildUser(n) {
            let u = < User> name = n </>  // age unassigned
            return u
        }
      ${"}"}
    `;
    const { errors } = diagnose(src);
    expect(errors.some((e) => e.code === "E-STATE-COMPLETE")).toBe(true);
  });
});

describe("S32-007: §48 — E-FN-006 is retired (MUST NOT fire)", () => {
  // Gates on Phase 3 parser support (same as CONF-S32-006*). E-FN-006 absence
  // is verified via the type-system rename (commit dd5f41d, Phase 1a).
  test.skip("CONF-S32-007: no diagnostic with code 'E-FN-006' is emitted by the S32-compliant compiler", () => {
    // Expected: E-FN-006 is retired. The diagnostic catalog SHALL NOT emit
    // any diagnostic with code 'E-FN-006' under any circumstance. Its role
    // is fully subsumed by E-STATE-COMPLETE (§54.6.1).
    const src = `
      < state Product>
          name: string
          sku: string
      </>
      ${"${"}
        fn buildProduct(n) {
            let p = < Product> name = n </>
            return p
        }
      ${"}"}
    `;
    const { errors } = diagnose(src);
    expect(errors.some((e) => e.code === "E-FN-006")).toBe(false);
    // And the replacement SHALL fire instead:
    expect(errors.some((e) => e.code === "E-STATE-COMPLETE")).toBe(true);
  });
});
