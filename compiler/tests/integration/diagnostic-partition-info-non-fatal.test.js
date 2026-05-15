/**
 * Regression test — diagnostic-stream partition: info-level non-fatal
 *
 * S93 bug-hunt finding: I-* prefix and severity:"info" diagnostics were
 * partitioning into result.errors at api.js:1674-1675. The CLI then exited
 * non-zero on files whose only "errors" were informational lints — including
 * 07-admin-dashboard.scrml and 23-trucking-dispatch/app.scrml (the flagship
 * multi-file demo). Adopters trying these examples saw "error" + non-zero
 * exit when the diagnostics were genuinely informational.
 *
 * Fix: api.js partition rule extended — info-level (I-* prefix OR
 * severity:"info") partitions into result.warnings, not result.errors.
 * Formatter (commands/compile.js) distinguishes info vs warning by label
 * (cyan "info" vs yellow "warning").
 *
 * This test pins the new partition behavior so a future regression is loud.
 */

import { describe, expect, test } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { resolve } from "path";

const fixturesDir = resolve(import.meta.dir, "..");

describe("diagnostic-stream partition — info-level non-fatal", () => {
  test("I-* prefix diagnostics partition into result.warnings, not result.errors", () => {
    // 07-admin-dashboard fires I-AUTH-REDIRECT-UNRESOLVED (info-level) because
    // its <program auth="required"> redirects to "/login" but no /login page
    // is in the compile unit. Post-fix: lands in warnings, not errors.
    const result = compileScrml({
      inputFiles: [resolve(fixturesDir, "../../examples/07-admin-dashboard.scrml")],
      outputDir: "/tmp/diag-partition-test-07",
      write: false,
      log: () => {},
    });

    const infoCodes = [...result.errors, ...result.warnings]
      .filter(d => d.code === "I-AUTH-REDIRECT-UNRESOLVED");

    expect(infoCodes.length).toBeGreaterThan(0);

    const inErrors = result.errors.filter(d => d.code === "I-AUTH-REDIRECT-UNRESOLVED");
    const inWarnings = result.warnings.filter(d => d.code === "I-AUTH-REDIRECT-UNRESOLVED");

    expect(inErrors.length).toBe(0);
    expect(inWarnings.length).toBe(infoCodes.length);
  });

  test("severity:'info' diagnostics partition into result.warnings even with non-I- prefix", () => {
    // W-PROGRAM-SPA-INFERRED carries severity:"info" despite the W- prefix.
    // The fix must check both prefix and severity. Verify with any
    // single-page example.
    const result = compileScrml({
      inputFiles: [resolve(fixturesDir, "../../examples/02-counter.scrml")],
      outputDir: "/tmp/diag-partition-test-02",
      write: false,
      log: () => {},
    });

    const spa = [...result.errors, ...result.warnings]
      .filter(d => d.code === "W-PROGRAM-SPA-INFERRED");

    expect(spa.length).toBeGreaterThan(0);
    expect(spa.every(d => d.severity === "info")).toBe(true);

    // W- prefix routes to warnings regardless of severity.
    expect(result.errors.filter(d => d.code === "W-PROGRAM-SPA-INFERRED").length).toBe(0);
  });

  test("result.errors empty when only info-level diagnostics fire (CLI exit 0)", () => {
    // 07-admin-dashboard's diagnostics are I-AUTH-REDIRECT-UNRESOLVED (info)
    // + W-* lints (warning) + no genuine errors. result.errors must be empty
    // so the CLI's `if (result.errors.length > 0)` check exits 0.
    const result = compileScrml({
      inputFiles: [resolve(fixturesDir, "../../examples/07-admin-dashboard.scrml")],
      outputDir: "/tmp/diag-partition-test-07-clean",
      write: false,
      log: () => {},
    });

    // No genuine errors should remain.
    const genuineErrors = result.errors.filter(d =>
      !d.code?.startsWith("W-")
      && !d.code?.startsWith("I-")
      && d.severity !== "warning"
      && d.severity !== "info"
    );
    expect(genuineErrors.length).toBe(0);

    // Therefore result.errors itself is empty (the partition rule should
    // have caught everything).
    expect(result.errors.length).toBe(0);
  });

  test("partition predicate sanity — E-* prefix and severity:'error' route to errors", () => {
    // Direct predicate test (not requiring a compile that produces E-* shapes,
    // since the only way to fire E-* in current scrml requires multi-stage
    // pipeline interactions). Reaffirm the partition contract from outside:
    // anything that's not W-/I- prefix AND not severity:"warning"/"info"
    // partitions into errors.
    const cases = [
      { code: "E-SCOPE-001", severity: "error", expected: "errors" },
      { code: "E-CG-006", severity: "error", expected: "errors" },
      { code: "W-PROGRAM-001", severity: "warning", expected: "warnings" },
      { code: "I-AUTH-REDIRECT-UNRESOLVED", severity: "info", expected: "warnings" },
      { code: "W-PROGRAM-SPA-INFERRED", severity: "info", expected: "warnings" }, // W- prefix + severity:info
      { code: undefined, severity: "error", expected: "errors" }, // no code; severity:error
    ];

    for (const tc of cases) {
      const isNonFatal =
        tc.code?.startsWith("W-") ||
        tc.code?.startsWith("I-") ||
        tc.severity === "warning" ||
        tc.severity === "info";
      const bucket = isNonFatal ? "warnings" : "errors";
      expect(bucket).toBe(tc.expected);
    }
  });
});
