/**
 * structural-in-logic-body.test.js — E-STRUCTURAL-ELEMENT-MISPLACED in `${...}` logic-body
 *
 * Closes the silent-swallow class for scrml-defined structural elements
 * (§4.15: <schema>, <engine>, <channel>, <page>, <auth>, <errors>,
 * <onTransition>, <onTimeout>, <onIdle>, <match>) that appear inside a
 * `${...}` logic body.
 *
 * The bug (pre-fix): `parseLogicBody`'s html-fragment fallback at the
 * bare-expr-vs-html-fragment branch (two sites — the outer top-level loop AND
 * the inner `parseOneStatement`) silently swallowed the entire structural-element
 * run as `kind: "html-fragment"` raw text. Adopter intent ("set up DB schema
 * conditionally inside a logic block") disappeared from the output with zero
 * diagnostic. Empirical pre-fix probe (PA-confirmed) — 0 errors / 0 warnings
 * for `<program><count> = 0\n${\n  <schema><users>id int</></>}</program>`;
 * the compiled clientJs carried only the `count` declaration; the schema was
 * absent.
 *
 * The fix (ast-builder.js):
 *   §4.15 — `STRUCTURAL_ELEMENT_PLACEMENT` table maps each structural-element
 *   name → canonical-placement message. `leadingTagName(expr)` extracts the
 *   first tag opener. The two html-fragment fallback sites in `parseLogicBody`
 *   gate on `leadingTagName(expr) in STRUCTURAL_ELEMENT_PLACEMENT` and push
 *   `E-STRUCTURAL-ELEMENT-MISPLACED` (§34 reuse — its documented semantic is
 *   "used outside its owning locus"). The html-fragment node is still emitted
 *   so downstream stage shapes stay stable; the error carries the diagnostic.
 *
 * Coverage:
 *   §1  10 structural kinds (one test each) — schema / engine / channel / page /
 *       auth / errors / onTransition / onTimeout / onIdle / match — fire
 *       E-STRUCTURAL-ELEMENT-MISPLACED at the right code, with a message that
 *       names the element + cites canonical placement.
 *   §2  Inner-fallback fire (nested logic body, e.g. inside an `if (true) { ${...} }`).
 *   §3  Negative regressions:
 *         - HTML elements (`<div>`, `<p>`) — no fire.
 *         - Reactive-decl `<NAME> = expr` — no fire (handled upstream).
 *         - PascalCase component `<MyComponent>` — no fire.
 *         - Render-by-tag self-closing `<varname/>` — no fire.
 *         - Structural at canonical position (`<schema>` as direct child
 *           of `<program>`) — no fire.
 *   §4  Multi-fire — two structural misplacements in the same `${...}` body
 *       both surface as distinct errors.
 *
 * Per §4.15 the structural-element registry is case-sensitive. `<Schema>`
 * (capitalized) is NOT a registered structural element; it's treated as a
 * PascalCase component — no fire. The reverse (lowercase `<engine>`) is
 * the registered name and fires.
 *
 * DRIVER: `compileScrml({ inputFiles, write:false })` end-to-end.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/structural-in-logic-body");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

beforeAll(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

function fix(name, src) {
  const p = join(FIXTURE_DIR, name);
  writeFileSync(p, src);
  return p;
}

function compile(path) {
  return compileScrml({ inputFiles: [path], outputDir: FIXTURE_OUTPUT, write: false, log: () => {} });
}

function structuralErrors(result) {
  return (result.errors || []).filter(e => e.code === "E-STRUCTURAL-ELEMENT-MISPLACED");
}

// ---------------------------------------------------------------------------
// §1 — All 10 structural kinds fire on misplacement
// ---------------------------------------------------------------------------

describe("§1 — structural-element misplacement in `${...}` logic body", () => {

  test("§1.1 — `<schema>` inside `${...}` fires E-STRUCTURAL-ELEMENT-MISPLACED", () => {
    const p = fix("schema.scrml", `<program db="./app.db">
  <count> = 0
  \${
    <schema>
      <users>
        id        int
        username  string
      </>
    </>
  }
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("<schema>");
    expect(errs[0].message).toContain("logic body");
    expect(errs[0].message).toContain("§4.15");
  });

  test("§1.2 — `<engine>` inside `${...}` fires", () => {
    const p = fix("engine.scrml", `<program>
  <count> = 0
  \${
    <engine for=Foo initial=.Idle>
      <Idle></>
    </>
  }
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("<engine>");
    expect(errs[0].message).toContain("§51");
  });

  test("§1.3 — `<channel>` inside `${...}` fires", () => {
    const p = fix("channel.scrml", `<program>
  <count> = 0
  \${
    <channel name="ch1">
      ping  string
    </>
  }
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("<channel>");
    expect(errs[0].message).toContain("§38");
  });

  test("§1.4 — `<page>` inside `${...}` fires", () => {
    const p = fix("page.scrml", `<program>
  <count> = 0
  \${
    <page>
      <p>Hi</p>
    </>
  }
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("<page>");
    expect(errs[0].message).toContain("§40");
  });

  test("§1.5 — `<auth>` inside `${...}` fires", () => {
    const p = fix("auth.scrml", `<program>
  <count> = 0
  \${
    <auth role="admin">
      <p>Admin section</p>
    </>
  }
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("<auth>");
    expect(errs[0].message).toContain("§40.9");
  });

  test("§1.6 — `<errors>` inside `${...}` fires", () => {
    const p = fix("errors.scrml", `<program>
  <count> = 0
  \${
    <errors of=@count>
    </>
  }
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("<errors>");
    expect(errs[0].message).toContain("§55.8");
  });

  test("§1.7 — `<onTransition>` inside `${...}` fires", () => {
    const p = fix("onTransition.scrml", `<program>
  <count> = 0
  \${
    <onTransition to=.Active>
    </>
  }
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("<onTransition>");
    expect(errs[0].message).toContain("§51.0.H");
  });

  test("§1.8 — `<onTimeout>` inside `${...}` fires", () => {
    const p = fix("onTimeout.scrml", `<program>
  <count> = 0
  \${
    <onTimeout after="5s" to=.Idle/>
  }
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("<onTimeout>");
    expect(errs[0].message).toContain("§51.0.M");
  });

  test("§1.9 — `<onIdle>` inside `${...}` fires", () => {
    const p = fix("onIdle.scrml", `<program>
  <count> = 0
  \${
    <onIdle after="30s" to=.Idle/>
  }
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("<onIdle>");
    expect(errs[0].message).toContain("§51.0.R");
  });

  // §1.10 — <match> is NOT in the kill-list. Block-form <match> is markup-as-
  // value (§18.0.1 + §1.4 L1 pillar) — it is grammatical wherever a value-
  // yielding expression sits, including `${...}` markup-emit contexts. This is
  // the canonical output of `bun scrml promote --match` (S66 SHIPPED).
  // The <match> negative-regression case lives in §3 below (§3.8).
});

// ---------------------------------------------------------------------------
// §2 — Inner-fallback fire (nested logic body)
// ---------------------------------------------------------------------------

describe("§2 — inner-fallback fire (nested `${...}` inside an if-body)", () => {

  test("§2.1 — `<schema>` inside a nested `${...}` (inside `if (true) { ${...} }`) fires", () => {
    const p = fix("nested-schema.scrml", `<program db="./app.db">
  <count> = 0
  \${
    if (true) {
      \${
        <schema>
          <users>
            id  int
          </>
        </>
      }
    }
  }
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("<schema>");
  });
});

// ---------------------------------------------------------------------------
// §3 — Negative regressions — no fire on legitimate constructs
// ---------------------------------------------------------------------------

describe("§3 — negative regressions (no fire on legitimate constructs)", () => {

  test("§3.1 — `<div>` inside `${...}` does NOT fire (HTML element)", () => {
    const p = fix("html-div.scrml", `<program>
  <count> = 0
  \${
    <div>hello</div>
  }
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(0);
  });

  test("§3.2 — `<p>` inside `${...}` does NOT fire (HTML element)", () => {
    const p = fix("html-p.scrml", `<program>
  <count> = 0
  \${
    <p>hi there</p>
  }
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(0);
  });

  test("§3.3 — reactive-decl `<other> = 1` inside `${...}` does NOT fire", () => {
    // The reactive-decl path (tryParseStructuralDecl) intercepts these well
    // before the html-fragment fallback. Regression guard so the fix doesn't
    // accidentally widen its catchment to the upstream reactive-decl path.
    const p = fix("reactive-decl.scrml", `<program>
  <count> = 0
  \${
    <other> = 1
  }
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(0);
  });

  test("§3.4 — PascalCase component `<MyComponent>` inside `${...}` does NOT fire", () => {
    // PascalCase component names are disjoint from the §4.15 structural-element
    // registry (which uses lowercase names). The placement table lookup is
    // case-sensitive — "MyComponent" is not a key.
    const p = fix("pascal-component.scrml", `<program>
  <count> = 0
  \${
    <MyComponent prop=5/>
  }
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(0);
  });

  test("§3.5 — render-by-tag `<varname/>` inside `${...}` does NOT fire", () => {
    // Self-closing reactive cell render of a lowercase user variable. The name
    // is lowercase but not in the structural-element registry — no fire.
    const p = fix("render-by-tag.scrml", `<program>
  <count> = 0
  <other> = 99
  \${
    <other/>
  }
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(0);
  });

  test("§3.6 — `<schema>` at canonical position (direct child of <program>) does NOT fire", () => {
    // The fix lives in parseLogicBody's html-fragment fallback only — the
    // canonical placement (<schema> as a direct child of <program>) is not a
    // `${...}` logic body, so the fallback never runs.
    const p = fix("canonical-schema.scrml", `<program db="./app.db">
  <schema>
    <users>
      id  int
    </>
  </>
  <count> = 0
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(0);
  });

  test("§3.7 — capitalized `<Schema>` is treated as a component (no fire)", () => {
    // Per §4.15 the registry is case-sensitive. <Schema> is NOT the registered
    // structural element — it's a user PascalCase component. No fire.
    const p = fix("capitalized-Schema.scrml", `<program>
  <count> = 0
  \${
    <Schema/>
  }
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(0);
  });

  test("§3.8 — `<match>` block-form inside `${...}` markup-emit does NOT fire", () => {
    // Block-form <match> is markup-as-value (§18.0.1 + §1.4 L1 pillar) —
    // grammatical wherever a value-yielding expression sits. The canonical
    // output of `bun scrml promote --match` (S66) wraps the rewritten match
    // block inside the same `${...}` the if-chain occupied. Regression guard
    // against the false-positive class — without removing <match> from the
    // kill-list, 3 promote-safety-harness tests would fail with this fix.
    const p = fix("match-block-form.scrml", `<program>
  type Phase:enum = { Idle, Loading, Error, Success }
  <phase>: Phase = .Idle
  <div>
    \${
      <match for=Phase on=@phase>
        <Idle></>
        <Loading></>
        <Error></>
        <Success></>
      </>
    }
  </>
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §4 — Multi-fire — multiple structural misplacements in the same `${...}` body
// ---------------------------------------------------------------------------

describe("§4 — multi-fire in one `${...}` body", () => {

  test("§4.1 — two sequential structural elements both fire", () => {
    // Two separate `${...}` blocks each carrying a structural element;
    // each fires its own E-STRUCTURAL-ELEMENT-MISPLACED. Tests that the
    // fix's `errors.push` is per-statement, not one-and-done.
    const p = fix("multi-fire.scrml", `<program db="./app.db">
  <count> = 0
  \${
    <schema>
      <users>
        id  int
      </>
    </>
  }
  \${
    <onTransition to=.Active>
    </>
  }
</program>
`);
    const r = compile(p);
    const errs = structuralErrors(r);
    expect(errs.length).toBe(2);
    const codes = errs.map(e => {
      // Pull the element name from the message; both should be present.
      const m = e.message.match(/`<([A-Za-z]+)>`/);
      return m ? m[1] : null;
    });
    expect(codes).toContain("schema");
    expect(codes).toContain("onTransition");
  });
});
