/**
 * VP-2 — Post-CE Invariant Check
 *
 * Tests for the `runPostCEInvariant` validation pass. Closes
 * F-COMPONENT-001 silent-failure window where unresolved component
 * references survived CE and emitted phantom DOM elements.
 *
 * Coverage:
 *   §1  Resolved component (same-file) → no error
 *   §2  Unresolved component (no def, no import) → E-COMPONENT-035
 *   §3  Unresolved component inside a lift expression → E-COMPONENT-035
 *   §4  Unresolved component inside a for loop → E-COMPONENT-035
 *   §5  Plain HTML markup → no error
 *   §6  Diagnostic shape: code, message, span, severity
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runCE } from "../../src/component-expander.ts";
import { runPostCEInvariantFile } from "../../src/validators/post-ce-invariant.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compile(source, filePath = "/test/uvb-w1.scrml") {
  const bs = splitBlocks(filePath, source);
  const tab = buildAST(bs);
  const ce = runCE({ files: [tab] });
  const ceFile = ce.files[0];
  const errors = runPostCEInvariantFile({ filePath, ast: ceFile.ast });
  return { ast: ceFile.ast, ceErrors: ce.errors, errors };
}

function codes(errors) {
  return errors.map((e) => e.code);
}

// ---------------------------------------------------------------------------
// §1: Resolved component → no error
// ---------------------------------------------------------------------------

describe("VP-2 §1: resolved same-file component passes silently", () => {
  test("inline same-file component is expanded, no E-COMPONENT-035", () => {
    const src = `<program>
\${
  const Card = <div class="card"></>
}
<Card/>
</program>`;
    const { errors } = compile(src);
    expect(codes(errors)).not.toContain("E-COMPONENT-035");
  });
});

// ---------------------------------------------------------------------------
// §2: Plain HTML markup → no error
// ---------------------------------------------------------------------------

describe("VP-2 §5: plain HTML markup passes silently", () => {
  test("<div>...</div> alone emits no E-COMPONENT-035", () => {
    const src = `<program>
<div class="x">hello</div>
</program>`;
    const { errors } = compile(src);
    expect(codes(errors)).not.toContain("E-COMPONENT-035");
  });

  test("nested HTML emits no E-COMPONENT-035", () => {
    const src = `<program>
<div>
<ul>
<li>item</li>
</ul>
</div>
</program>`;
    const { errors } = compile(src);
    expect(codes(errors)).not.toContain("E-COMPONENT-035");
  });
});

// ---------------------------------------------------------------------------
// §3: Unresolved component → E-COMPONENT-035
// ---------------------------------------------------------------------------

describe("VP-2 §2/§3/§4: unresolved component emits E-COMPONENT-035", () => {
  test("unresolved component (no def, no import) emits E-COMPONENT-035", () => {
    // CE itself emits E-COMPONENT-020 here; VP-2 ALSO emits E-COMPONENT-035
    // because the residual `isComponent: true` node is left in place per the
    // recovery contract in component-expander.ts:619-630.
    const src = `<program>
<UserBadge/>
</program>`;
    const { errors } = compile(src);
    expect(codes(errors)).toContain("E-COMPONENT-035");
    const e = errors.find((x) => x.code === "E-COMPONENT-035");
    expect(e?.message).toContain("UserBadge");
    expect(e?.message).toContain("CE");
    expect(e?.severity).toBe("error");
  });

  test("unresolved component inside lift expression emits E-COMPONENT-035", () => {
    // Reproduces F-COMPONENT-001 — the canonical silent-failure pattern.
    const src = `<program>
\${
  const team = []
}
<ul>
\${ for (let m of team) {
  lift <li>
    <UserBadge name="x" role="y"/>
  </li>
} }
</ul>
</program>`;
    const { errors } = compile(src);
    expect(codes(errors)).toContain("E-COMPONENT-035");
  });

  test("unresolved component name appears in error message", () => {
    const src = `<program>
<MyMissingThing/>
</program>`;
    const { errors } = compile(src);
    const e = errors.find((x) => x.code === "E-COMPONENT-035");
    expect(e?.message).toContain("MyMissingThing");
  });

  test("error message points at lift workaround", () => {
    const src = `<program>
<UserBadge/>
</program>`;
    const { errors } = compile(src);
    const e = errors.find((x) => x.code === "E-COMPONENT-035");
    expect(e?.message).toContain("F-COMPONENT-001");
    expect(e?.message).toContain("lift");
  });
});

// ---------------------------------------------------------------------------
// §6: Diagnostic shape
// ---------------------------------------------------------------------------

describe("VP-2 §6: diagnostic shape", () => {
  test("emitted diagnostic has code/message/span/severity", () => {
    const src = `<program>
<MissingComp/>
</program>`;
    const { errors } = compile(src);
    const e = errors.find((x) => x.code === "E-COMPONENT-035");
    expect(e).toBeDefined();
    expect(typeof e.code).toBe("string");
    expect(typeof e.message).toBe("string");
    expect(e.severity).toBe("error");
    expect(typeof e.span).toBe("object");
    expect(typeof e.span.line).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// §7: Reproduces F-COMPONENT-001 specifically
// ---------------------------------------------------------------------------

describe("VP-2 §7: F-COMPONENT-001 reproducer (lift+import pattern)", () => {
  test("the 22-multifile-style pattern fails loudly", () => {
    // Even though we can't trigger the cross-file import path here without
    // a multi-file test fixture, the silent-failure window we close is the
    // residual-isComponent case — exercised by any unresolved component.
    const src = `<program>
\${
  import { LoadCard } from './nonexistent.scrml'
}
<ul>
\${ for (let l of @loads) {
  lift <li>
    <LoadCard load=l/>
  </li>
} }
</ul>
</program>`;
    const { errors } = compile(src);
    // The reproducer emits E-COMPONENT-035 because the LoadCard reference
    // survives CE without resolution. Without VP-2, this would be silently
    // emitted as document.createElement("LoadCard").
    expect(codes(errors)).toContain("E-COMPONENT-035");
  });
});
