/**
 * VP-3 — Attribute Interpolation Validation
 *
 * Tests for the `runAttributeInterpolation` validation pass. Closes
 * F-CHANNEL-001 silent-failure window (`<channel name="driver-${id}">` is
 * silently inert).
 *
 * Coverage:
 *   §1  Static name (no interp) → no error
 *   §2  Interpolated name → E-CHANNEL-007
 *   §3  Plain HTML attr with interp → no error (registry has no entry)
 *   §4  Recognized attr that supportsInterpolation:true → no error
 *   §5  Diagnostic shape: code, message, span, severity
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runAttributeInterpolationFile } from "../../src/validators/attribute-interpolation.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compile(source, filePath = "/test/uvb-w1.scrml") {
  const bs = splitBlocks(filePath, source);
  const tab = buildAST(bs);
  const errors = runAttributeInterpolationFile({ filePath, ast: tab.ast });
  return { ast: tab.ast, errors };
}

function codes(errors) {
  return errors.map((e) => e.code);
}

// ---------------------------------------------------------------------------
// §1: Static name → no error
// ---------------------------------------------------------------------------

describe("VP-3 §1: static channel name passes silently", () => {
  test("<channel name=\"chat\"> emits no error", () => {
    const src = `<program>
<channel name="chat">
</>
</program>`;
    const { errors } = compile(src);
    expect(codes(errors)).not.toContain("E-CHANNEL-007");
  });

  test("<channel name=\"driver-events\"> emits no error", () => {
    const src = `<program>
<channel name="driver-events">
</>
</program>`;
    const { errors } = compile(src);
    expect(codes(errors)).not.toContain("E-CHANNEL-007");
  });
});

// ---------------------------------------------------------------------------
// §2: Interpolated name → E-CHANNEL-007
// ---------------------------------------------------------------------------

describe("VP-3 §2: interpolated channel name emits E-CHANNEL-007", () => {
  test("<channel name=\"driver-${id}\"> emits E-CHANNEL-007", () => {
    const src = `<program>
\${
  let id = 7
}
<channel name="driver-\${id}">
</>
</program>`;
    const { errors } = compile(src);
    expect(codes(errors)).toContain("E-CHANNEL-007");
    const e = errors.find((x) => x.code === "E-CHANNEL-007");
    expect(e?.message).toContain("name=");
    expect(e?.message).toContain("<channel>");
    expect(e?.message).toContain("F-CHANNEL-001");
    expect(e?.severity).toBe("error");
  });

  test("<channel name=\"driver-${@driverId}\"> emits E-CHANNEL-007", () => {
    const src = `<program>
\${
  let driverId = 7
}
<channel name="driver-\${@driverId}">
</>
</program>`;
    const { errors } = compile(src);
    expect(codes(errors)).toContain("E-CHANNEL-007");
  });

  test("<channel topic=\"x-${id}\"> emits E-CHANNEL-007 (topic also non-interpolating)", () => {
    const src = `<program>
\${ let id = 1 }
<channel name="static" topic="x-\${id}">
</>
</program>`;
    const { errors } = compile(src);
    expect(codes(errors)).toContain("E-CHANNEL-007");
  });
});

// ---------------------------------------------------------------------------
// §3: Plain HTML attr → no error
// ---------------------------------------------------------------------------

describe("VP-3 §3: plain HTML elements not policed", () => {
  test("<div title=\"a-${x}\"> emits no error (div not in registry)", () => {
    const src = `<program>
\${ let x = 1 }
<div title="a-\${x}">y</div>
</program>`;
    const { errors } = compile(src);
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §5: Diagnostic shape
// ---------------------------------------------------------------------------

describe("VP-3 §5: diagnostic shape", () => {
  test("emitted diagnostic has code/message/span/severity", () => {
    const src = `<program>
\${ let id = 1 }
<channel name="x-\${id}">
</>
</program>`;
    const { errors } = compile(src);
    const e = errors.find((x) => x.code === "E-CHANNEL-007");
    expect(e).toBeDefined();
    expect(typeof e.code).toBe("string");
    expect(typeof e.message).toBe("string");
    expect(e.severity).toBe("error");
    expect(typeof e.span).toBe("object");
    expect(typeof e.span.line).toBe("number");
  });

  test("error message includes the offending value", () => {
    const src = `<program>
\${ let id = 1 }
<channel name="driver-\${id}">
</>
</program>`;
    const { errors } = compile(src);
    const e = errors.find((x) => x.code === "E-CHANNEL-007");
    expect(e?.message).toContain("driver-${id}");
  });

  test("error message recommends static-name + payload-filter pattern", () => {
    const src = `<program>
\${ let id = 1 }
<channel name="x-\${id}">
</>
</program>`;
    const { errors } = compile(src);
    const e = errors.find((x) => x.code === "E-CHANNEL-007");
    expect(e?.message).toContain("payload");
  });
});

// ---------------------------------------------------------------------------
// §6: Channel auth value is not interp-checked (auth doesn't take ${...} values either,
// but VP-1 surfaces the role: pattern, not VP-3)
// ---------------------------------------------------------------------------

describe("VP-3 §6: only attrs with supportsInterpolation:false are policed", () => {
  test("static-only auth attr does not get false-positive interp warnings", () => {
    const src = `<program auth="required">
<div>x</div>
</program>`;
    const { errors } = compile(src);
    expect(errors).toHaveLength(0);
  });
});
