/**
 * B-prereq follow-ups #1 + #3 (S135) — source-form Shape 1 variant-progression
 *
 * Closes orthogonal #1 (parser whitespace-collapse defeats findTopLevelArrow on
 * bare-dot variant lifecycle annotations) + #3 (qualified-enum name stripping
 * incomplete; broke discrimination match + diagnostic text) surfaced by S134
 * B-prereq.
 *
 * These tests exercise the SOURCE-FORM path via `compileScrml` — distinct from
 * `lifecycle-shape1-tracker.test.js` which uses direct-AST construction and
 * therefore bypasses parser tokenization quirks.
 *
 * Coverage:
 *   - Bare-dot variant lifecycle annotation on Shape 1 cells:
 *     `<phase>: (.Draft to .Published) = Article.Draft` — the canonical adopter
 *     form per kickstarter §3.2 + SPEC §14.12.3 (Shape 1 row). Validates Fix #1
 *     (findTopLevelArrow tolerance) — without Fix #1 the parser's whitespace-
 *     collapse around `.` defeats glyph detection and the tracker silently
 *     never fires.
 *
 *   - Qualified-enum variant lifecycle annotation on Shape 1 cells:
 *     `<phase>: (Article.Draft to Article.Published) = Article.Draft`. Validates
 *     Fix #3 (parseLifecycleReturnAnnotation now strips the `EnumName.` prefix
 *     so the discrimination regex matches against canonical bare-dot `.Draft`
 *     adopter discrimination, AND the diagnostic message text shows the
 *     correctly-stripped variant names rather than `(asIs to asIs)` or
 *     `if (phase is .Article.Draft)` shapes).
 *
 *   - Mixed source-forms: annotation qualified, discrim bare-dot — should
 *     compose cleanly after Fix #3.
 *
 *   - Diagnostic-message text: verifies the correct `(.Draft to .Published)`
 *     label rather than the pre-fix `(asIs to asIs)`.
 *
 *   - Probe #3 end-to-end: combined fixes — discrim + transition + read passes,
 *     subsequent outer-scope read fires (transition is scope-local).
 *
 *   - Regression pinning: presence-progression source-form already worked
 *     pre-S135 (the `not` token is word-bounded by definition); these tests
 *     verify Fix #1's broader boundary tolerance didn't break that path.
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let TMP;
function setup() {
  if (!TMP) TMP = mkdtempSync(join(tmpdir(), "lifecycle-source-form-"));
  return TMP;
}

function compileSource(name, source) {
  const dir = setup();
  const filePath = join(dir, `${name}.scrml`);
  writeFileSync(filePath, source);
  const result = compileScrml({
    inputFiles: [filePath],
    outputDir: join(dir, `${name}.dist`),
    write: false,
    log: () => {},
  });
  return {
    errors: result.errors || [],
    warnings: result.warnings || [],
  };
}

// ---------------------------------------------------------------------------
// §B-Prereq Follow-up #1 — bare-dot variant lifecycle annotation source-form
// ---------------------------------------------------------------------------

describe("§B-Prereq.followups source-form — bare-dot variant lifecycle annotation", () => {
  test("Test 1 — bare-dot pre-transition read fires E-TYPE-001", () => {
    // The canonical adopter form per kickstarter §3.2:
    //   <phase>: (.Draft to .Published) = Article.Draft
    //   ${ @phase.publishedAt }   // pre-transition read — should fire E-TYPE-001
    //
    // Without Fix #1, parser whitespace-collapse around `.` produces
    // `(.Draft to.Published)` which defeats findTopLevelArrow → no tracker.
    const src = `type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }

<phase>: (.Draft to .Published) = Article.Draft

\${
    @phase.publishedAt
}`;
    const result = compileSource("bare-dot-pre-read", src);
    const fires = result.errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toMatch(/phase/);
    expect(fires[0].message).toMatch(/on a Shape 1 reactive cell/);
  });

  test("Test 2 — bare-dot with discrim + transition + read inside passes", () => {
    // Inside the if-discrim + transition + read: should pass (no fire).
    const src = `type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }

<phase>: (.Draft to .Published) = Article.Draft

\${
    if (@phase is .Draft) {
        transition(@phase)
        @phase.publishedAt
    }
}`;
    const result = compileSource("bare-dot-discrim-transition", src);
    const typeFires = result.errors.filter(e => e.code === "E-TYPE-001");
    const variantFires = result.errors.filter(e => e.code === "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED");
    expect(typeFires.length).toBe(0);
    expect(variantFires.length).toBe(0);
  });

  test("Test 3 — bare-dot with discrim but no transition() fires VARIANT-NOT-TRANSITIONED", () => {
    // Discrim entered + post-shape access without transition() — fires the
    // E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED variant-specific code.
    const src = `type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }

<phase>: (.Draft to .Published) = Article.Draft

\${
    if (@phase is .Draft) {
        @phase.publishedAt
    }
}`;
    const result = compileSource("bare-dot-discrim-no-transition", src);
    const fires = result.errors.filter(e => e.code === "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toMatch(/phase/);
    expect(fires[0].message).toMatch(/\.Draft/);
    expect(fires[0].message).toMatch(/\.Published/);
  });

  test("Test 4 — bare-dot outer read after inner transition() still fires (scope-local)", () => {
    // transition() advances state only in the inner if-block scope; the outer
    // ${} read is back to pre-transition.
    const src = `type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }

<phase>: (.Draft to .Published) = Article.Draft

\${
    if (@phase is .Draft) {
        transition(@phase)
        @phase.publishedAt
    }
}
\${
    @phase.publishedAt
}`;
    const result = compileSource("bare-dot-outer-read", src);
    const fires = result.errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBeGreaterThanOrEqual(1);
  });

  test("Test 5 — bare-dot write-then-read with post-variant init passes", () => {
    // Writing the post-variant transitions the cell; subsequent reads pass.
    const src = `type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }

<phase>: (.Draft to .Published) = Article.Draft

\${
    @phase = Article.Published
}
\${
    @phase.publishedAt
}`;
    const result = compileSource("bare-dot-write-then-read", src);
    const fires = result.errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBe(0);
  });

  test("Test 6 — bare-dot diagnostic shows correct variant names (not asIs)", () => {
    // Verifies Fix #3.b: the E-TYPE-001 variant-progression fallback uses
    // .<variantName> labels, not formatTypeForDiagnostic(preType=asIs).
    const src = `type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }

<phase>: (.Draft to .Published) = Article.Draft

\${
    @phase.publishedAt
}`;
    const result = compileSource("bare-dot-diagnostic", src);
    const fire = result.errors.find(e => e.code === "E-TYPE-001");
    expect(fire).toBeDefined();
    // Diagnostic should contain `.Draft` and `.Published`, NOT `asIs`.
    expect(fire.message).toMatch(/\.Draft/);
    expect(fire.message).toMatch(/\.Published/);
    expect(fire.message).not.toMatch(/asIs/);
  });
});

// ---------------------------------------------------------------------------
// §B-Prereq.followups source-form — qualified-enum variant lifecycle annotation
// ---------------------------------------------------------------------------

describe("§B-Prereq.followups source-form — qualified-enum variant lifecycle annotation", () => {
  test("Test 7 — qualified-enum pre-transition read fires E-TYPE-001", () => {
    const src = `type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }

<phase>: (Article.Draft to Article.Published) = Article.Draft

\${
    @phase.publishedAt
}`;
    const result = compileSource("qualified-pre-read", src);
    const fires = result.errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toMatch(/phase/);
  });

  test("Test 8 — qualified-enum diagnostic strips EnumName prefix (no .Article.Draft)", () => {
    // Validates Fix #3: parseLifecycleReturnAnnotation strips both leading `.`
    // AND the `EnumName.` prefix. Without Fix #3 the diagnostic showed
    // `if (phase is .Article.Draft)` — extra dot, broken.
    const src = `type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }

<phase>: (Article.Draft to Article.Published) = Article.Draft

\${
    @phase.publishedAt
}`;
    const result = compileSource("qualified-diagnostic-strip", src);
    const fire = result.errors.find(e => e.code === "E-TYPE-001");
    expect(fire).toBeDefined();
    // Should contain `.Draft` / `.Published`, NOT `.Article.Draft`.
    expect(fire.message).toMatch(/\.Draft/);
    expect(fire.message).toMatch(/\.Published/);
    expect(fire.message).not.toMatch(/\.Article\.Draft/);
    expect(fire.message).not.toMatch(/\.Article\.Published/);
    // And NOT `asIs`.
    expect(fire.message).not.toMatch(/asIs/);
  });

  test("Test 9 — qualified-enum with bare-dot discrim + transition passes", () => {
    // Mixed source-form: annotation qualified, body uses bare-dot variant.
    // Fix #3 means preVariantName='Draft' (stripped); the walker's
    // discrimination regex looks for `\\b<binding>\\s+is\\s+\\.<variant>\\b`
    // which matches `phase is .Draft` regardless of annotation form.
    const src = `type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }

<phase>: (Article.Draft to Article.Published) = Article.Draft

\${
    if (@phase is .Draft) {
        transition(@phase)
        @phase.publishedAt
    }
}`;
    const result = compileSource("qualified-mixed-discrim", src);
    const fires = result.errors.filter(e =>
      e.code === "E-TYPE-001" || e.code === "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED"
    );
    expect(fires.length).toBe(0);
  });

  test("Test 10 — qualified-enum without transition() fires VARIANT-NOT-TRANSITIONED", () => {
    const src = `type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }

<phase>: (Article.Draft to Article.Published) = Article.Draft

\${
    if (@phase is .Draft) {
        @phase.publishedAt
    }
}`;
    const result = compileSource("qualified-no-transition", src);
    const fires = result.errors.filter(e => e.code === "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toMatch(/phase/);
    // After Fix #3.b: variant labels in diagnostic should be `.Draft`/`.Published`, not asIs.
    expect(fires[0].message).toMatch(/\.Draft/);
    expect(fires[0].message).toMatch(/\.Published/);
  });
});

// ---------------------------------------------------------------------------
// §B-Prereq.followups source-form — presence-progression regression coverage
// ---------------------------------------------------------------------------

describe("§B-Prereq.followups source-form — presence-progression (Fix #1 boundary regression)", () => {
  test("Test 11 — presence-progression source-form still fires (no regression from Fix #1)", () => {
    // Fix #1 broadened findTopLevelArrow's next-boundary from whitespace-only
    // to non-identifier-char. The presence-progression case `(not to User)`
    // worked pre-Fix #1 because `not` and `User` are both word-bounded by
    // whitespace. Verify it still works after Fix #1.
    const src = `type User:struct = {
    id: number,
    name: string
}

<state>: (not to User) = not

\${
    @state.name
}`;
    const result = compileSource("presence-source-form", src);
    const fires = result.errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toMatch(/state/);
    expect(fires[0].message).toMatch(/on a Shape 1 reactive cell/);
  });

  test("Test 12 — presence-progression discrim passes (no regression)", () => {
    const src = `type User:struct = {
    id: number,
    name: string
}

<state>: (not to User) = not

\${
    @state = { id: 1, name: "Alice" }
}
\${
    @state.name
}`;
    const result = compileSource("presence-write-read", src);
    const fires = result.errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §B-Prereq.followups source-form — legacy `->` glyph (pre-existing path)
// ---------------------------------------------------------------------------

describe("§B-Prereq.followups source-form — legacy '->' glyph still parses", () => {
  test("Test 13 — legacy '->' bare-dot lifecycle annotation still resolves + fires", () => {
    // The legacy `->` glyph has always had a more tolerant next-boundary
    // (allowed whitespace OR direct `>`). After Fix #1 the canonical `to`
    // matches the same flexibility. Verify legacy still parses and the
    // tracker still fires on Shape 1 cells.
    //
    // Note: W-LIFECYCLE-LEGACY-ARROW is emitted only at struct-field sites
    // today (extractLifecycleFields at type-system.ts:2213); Shape 1 cell
    // lifecycle annotations using `->` resolve identically but the lint
    // emission for Shape 1 is a pre-existing gap, orthogonal to S135 scope.
    const src = `type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }

<phase>: (.Draft -> .Published) = Article.Draft

\${
    @phase.publishedAt
}`;
    const result = compileSource("legacy-arrow-bare-dot", src);
    const lifecycleFires = result.errors.filter(e =>
      e.code === "E-TYPE-001" || e.code === "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED"
    );
    expect(lifecycleFires.length).toBeGreaterThanOrEqual(1);
    // Diagnostic should still use `.Draft` / `.Published` labels (Fix #3.b).
    expect(lifecycleFires[0].message).toMatch(/\.Draft/);
    expect(lifecycleFires[0].message).toMatch(/\.Published/);
  });
});

// ---------------------------------------------------------------------------
// §B-Prereq.followups source-form — Probe #3 end-to-end (brief-mandated)
// ---------------------------------------------------------------------------

describe("§B-Prereq.followups source-form — Probe #3 end-to-end combined fixes", () => {
  test("Test 14 — end-to-end: inner discrim+transition passes, outer read fires", () => {
    // Brief Probe #3:
    //   <phase>: (.Draft to .Published) = .Draft
    //   ${ if (@phase is .Draft) { transition(@phase); @phase.publishedAt } }    // OK
    //   ${ @phase.publishedAt }                                                  // fires (scope-local)
    //
    // Note: init uses `Article.Draft` not bare `.Draft` because bare init hits
    // E-VARIANT-AMBIGUOUS at type-resolution time (orthogonal to lifecycle
    // tracker, not in scope for these fixes — per known-gaps §1 B-prereq notes,
    // bare init form on Shape 1 cells is a separate gap).
    const src = `type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }

<phase>: (.Draft to .Published) = Article.Draft

\${
    if (@phase is .Draft) {
        transition(@phase)
        @phase.publishedAt
    }
}
\${
    @phase.publishedAt
}`;
    const result = compileSource("probe-3-end-to-end", src);
    // Inner block: no fires.
    // Outer block: E-TYPE-001 fires (transition is scope-local).
    const fires = result.errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toMatch(/phase/);
    expect(fires[0].message).toMatch(/\.Draft/);
    expect(fires[0].message).toMatch(/\.Published/);
  });
});

// ---------------------------------------------------------------------------
// §B-Prereq.followups source-form — engine carve-out preserved
// ---------------------------------------------------------------------------

describe("§B-Prereq.followups source-form — engine-cell carve-out unchanged", () => {
  test("Test 15 — bare-dot lifecycle on engine-named cell still fires E-TYPE-LIFECYCLE-ON-ENGINE-CELL", () => {
    // The Fix #1 broader boundary doesn't affect the engine-cell carve-out
    // path — `checkLifecycleOnEngineCells` runs BEFORE the per-access tracker.
    const src = `<program>

type Phase:enum = { Idle, Done }

<engine for=Phase initial=.Idle>
  <Idle rule=.Done></>
  <Done></>
</>

<phase>: (.Idle to .Done) = .Idle

</program>`;
    const result = compileSource("engine-carve-out", src);
    const carveOut = result.errors.filter(
      e => e.code === "E-TYPE-LIFECYCLE-ON-ENGINE-CELL");
    expect(carveOut.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// §B-Prereq.followups source-form — fn-return path regression
// ---------------------------------------------------------------------------

describe("§B-Prereq.followups source-form — fn-return path regression baseline", () => {
  test("Test 16 — fn-return presence-progression source-form (S131 HU-2 path) unchanged", () => {
    // The fn-return tracker (S131) is structurally identical to the cell-value
    // tracker via the same parseLifecycleReturnAnnotation. Verify Fix #1 +
    // Fix #3 don't regress fn-return discrimination. The canonical fn-body
    // pattern (matches `lifecycle-landing-2-5-pipeline.test.js`) wraps the
    // test code in a top-level `${...}` block with a `function boot() {...}`
    // body so the fn-return tracker (which walks fn-decl bodies) sees the
    // binding.
    const src = `\${
  type User:struct = { id: number, name: string }

  server function loadUser(id: number) -> (not to User) {
    return <User id=id name="Alice">
  }

  function boot() {
    const u = loadUser(42)
    console.log(u.name)
  }
}

<program></program>`;
    const result = compileSource("fn-return-presence", src);
    // u was not discriminated; should fire E-TYPE-001.
    const fires = result.errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toMatch(/\bu\b/);
    expect(fires[0].message).toMatch(/from a function return/);
  });

  test("Test 17 — fn-return variant-progression source-form (bare-dot) — Fix #1 path", () => {
    // The fn-return tracker uses the same findTopLevelArrow + the same
    // parseLifecycleReturnAnnotation. Variant-progression in fn-return
    // position was previously only tested via direct-AST construction
    // (existing tests use `(.Draft to .Published)` with explicit spacing).
    // Verify source-form also reaches the tracker now.
    const src = `\${
  type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }

  server function publish(id: number) -> (.Draft to .Published) {
    return Article.Published(body: "hi", publishedAt: 0)
  }

  function boot() {
    const a = publish(42)
    if (a is .Draft) {
      a.publishedAt
    }
  }
}

<program></program>`;
    const result = compileSource("fn-return-variant-bare-dot", src);
    const fires = result.errors.filter(e => e.code === "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toMatch(/\.Draft/);
    expect(fires[0].message).toMatch(/\.Published/);
  });
});
