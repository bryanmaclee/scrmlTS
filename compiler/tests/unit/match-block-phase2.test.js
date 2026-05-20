/**
 * match-block-phase2.test.js — Phase 2: match-statechild-parser + 5 SYM
 * diagnostics per SPEC §18.0.1 + §18.0.2.
 *
 * S107 Phase 2 authoring per docs/changes/match-block-form-scoping/SCOPING.md.
 *
 * Builds on Phase 1 (commit `82c48fd`) which produces the structured
 * `kind: "match-block"` AST node with `forType` / `onExprRaw` / `armsRaw`.
 * Phase 2 adds:
 *
 *   - block-splitter.js — STRUCTURAL_RAW_BODY_ELEMENTS gate: `<match>` body
 *     captured as raw text (single text-node child), eliminating the BS-side
 *     shape-confusion that `:`-shorthand vs bare-body otherwise caused.
 *   - match-statechild-parser.ts (NEW) — tokenizes armsRaw → MatchArmEntry[]
 *     recognizing all 3 body forms (self-closing / `:`-shorthand / bare-body),
 *     wildcard arm `<_>`, and parenthesized payload bindings `<Ready(rows)>`.
 *   - symbol-table.ts PASS 20 — fires 5 diagnostics:
 *       * W-MATCH-RULE-INERT
 *       * E-MATCH-EFFECT-FORBIDDEN
 *       * E-MATCH-ONTRANSITION-FORBIDDEN
 *       * E-MATCH-NOT-EXHAUSTIVE
 *       * E-MATCH-ON-REQUIRED (NEW §34 row this commit)
 *   - SPEC §34 + §18.0.1 amendments naming the new E-MATCH-ON-REQUIRED code.
 *
 * Phase 2 baseline: `</match>` is the canonical match closer. `</>` for the
 * outer match closer is NOT yet supported (depth-tracking conflict with arm-
 * children `</>` closers); Phase 5 may add it via match-statechild-parser
 * informing BS of arm-shape boundaries.
 *
 * Coverage (39 expects across 14 tests):
 *   Parser:
 *     §1  3 body forms recognized (self-closing / shorthand / bare-body)
 *     §2  wildcard arm `<_>` recognized
 *     §3  payload bindings `<Variant(field)>` captured (raw text, Phase 4 will tokenize)
 *     §4  attrs captured per arm (rule, effect, custom)
 *   Diagnostics:
 *     §5  W-MATCH-RULE-INERT fires on `rule=` arm attr
 *     §6  E-MATCH-EFFECT-FORBIDDEN fires on `effect=` arm attr
 *     §7  E-MATCH-ONTRANSITION-FORBIDDEN fires on `<onTransition>` in arm body
 *     §8  E-MATCH-NOT-EXHAUSTIVE fires when variants missing without wildcard
 *     §9  E-MATCH-NOT-EXHAUSTIVE silent when `<_>` wildcard present
 *     §10 E-MATCH-ON-REQUIRED fires when on= missing + no engine in scope
 *     §11 E-MATCH-ON-REQUIRED silent when engine for same Type is in scope
 *   Regression:
 *     §12 Engine state-child `rule=` is NOT flagged as W-MATCH-RULE-INERT
 *     §13 Well-formed match block produces zero diagnostics
 *     §14 `:`-shorthand body now works (Phase 1 limitation closed)
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { parseMatchArms, extractEnumVariants } from "../../src/match-statechild-parser.ts";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/match-block-phase2");
const FIXTURE_OUT = join(FIXTURE_DIR, "dist");

function fix(name, src) {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  const p = join(FIXTURE_DIR, name);
  writeFileSync(p, src);
  return p;
}

function compile(src) {
  const p = fix("test.scrml", src);
  return compileScrml({ inputFiles: [p], outputDir: FIXTURE_OUT, write: false });
}

function findDiagnostic(result, code) {
  for (const d of [...(result.errors || []), ...(result.warnings || [])]) {
    if (d.code === code) return d;
  }
  return null;
}

// ---------------------------------------------------------------------------
// §1: 3 body forms recognized
// ---------------------------------------------------------------------------

describe("§1: parser recognizes all 3 body forms", () => {
  test("self-closing arm", () => {
    const r = parseMatchArms(`<Idle/>`);
    expect(r.arms.length).toBe(1);
    expect(r.arms[0].variantName).toBe("Idle");
    expect(r.arms[0].bodyForm).toBe("self-closing");
    expect(r.arms[0].bodyRaw).toBe("");
  });

  test("`:`-shorthand arm", () => {
    const r = parseMatchArms(`<Idle> : <p>Idle</p>`);
    expect(r.arms.length).toBe(1);
    expect(r.arms[0].variantName).toBe("Idle");
    expect(r.arms[0].bodyForm).toBe("shorthand");
    expect(r.arms[0].bodyRaw).toBe("<p>Idle</p>");
  });

  test("bare-body arm with </>", () => {
    const r = parseMatchArms(`<Idle><p>Idle</p></>`);
    expect(r.arms.length).toBe(1);
    expect(r.arms[0].variantName).toBe("Idle");
    expect(r.arms[0].bodyForm).toBe("bare-body");
    expect(r.arms[0].bodyRaw).toBe("<p>Idle</p>");
  });
});

// ---------------------------------------------------------------------------
// §2: Wildcard arm
// ---------------------------------------------------------------------------

describe("§2: wildcard arm `<_>` recognized", () => {
  test("wildcard self-closing", () => {
    const r = parseMatchArms(`<Idle/> <_/>`);
    expect(r.arms.length).toBe(2);
    expect(r.arms[1].isWildcard).toBe(true);
    expect(r.arms[1].variantName).toBe("_");
  });
});

// ---------------------------------------------------------------------------
// §3: Payload bindings captured (parser-side; Phase 4 will tokenize)
// ---------------------------------------------------------------------------

describe("§3: payload bindings captured as raw", () => {
  test("`<Ready(rows)>` captures payloadBindingsRaw='rows'", () => {
    const r = parseMatchArms(`<Ready(rows)><p>${"$"}{rows.length}</p></>`);
    expect(r.arms.length).toBe(1);
    expect(r.arms[0].variantName).toBe("Ready");
    expect(r.arms[0].payloadBindingsRaw).toBe("rows");
  });
});

// ---------------------------------------------------------------------------
// §4: Attrs captured per arm
// ---------------------------------------------------------------------------

describe("§4: arm attrs captured", () => {
  test("rule= attr is captured by name", () => {
    const r = parseMatchArms(`<Idle rule=Loading/>`);
    expect(r.arms.length).toBe(1);
    const ruleAttr = r.arms[0].attrs.find((a) => a.name === "rule");
    expect(ruleAttr).toBeDefined();
    expect(ruleAttr.valueRaw).toBe("Loading");
  });
});

// ---------------------------------------------------------------------------
// §5: W-MATCH-RULE-INERT fires
// ---------------------------------------------------------------------------

describe("§5: W-MATCH-RULE-INERT fires on rule= arm attr", () => {
  test("fires when arm has rule=", () => {
    const r = compile(`\${ type Phase:enum = { Idle, Done } @phase = .Idle }
<match for=Phase on=@phase>
    <Idle rule=Done> : <p>Idle</p>
    <Done> : <p>Done</p>
</match>
`);
    const d = findDiagnostic(r, "W-MATCH-RULE-INERT");
    expect(d).not.toBeNull();
    expect(d.message).toContain("rule=");
    expect(d.message).toContain("legal-but-inert");
  });
});

// ---------------------------------------------------------------------------
// §6: E-MATCH-EFFECT-FORBIDDEN fires
// ---------------------------------------------------------------------------

describe("§6: E-MATCH-EFFECT-FORBIDDEN fires on effect= arm attr", () => {
  test("fires when arm has effect=", () => {
    const r = compile(`\${ type Phase:enum = { Idle, Done } @phase = .Idle }
<match for=Phase on=@phase>
    <Idle effect=\${doIt()}> : <p>Idle</p>
    <Done> : <p>Done</p>
</match>
`);
    const d = findDiagnostic(r, "E-MATCH-EFFECT-FORBIDDEN");
    expect(d).not.toBeNull();
    expect(d.message).toContain("effect=");
    expect(d.message).toContain("engine");
  });
});

// ---------------------------------------------------------------------------
// §7: E-MATCH-ONTRANSITION-FORBIDDEN fires
// ---------------------------------------------------------------------------

describe("§7: E-MATCH-ONTRANSITION-FORBIDDEN fires on <onTransition> in arm body", () => {
  test("fires when bare-body arm contains <onTransition>", () => {
    const r = compile(`\${ type Phase:enum = { Idle, Done } @phase = .Idle }
<match for=Phase on=@phase>
    <Idle>
        <onTransition to=.Done>\${ log("t") }</>
        <p>Idle</p>
    </>
    <Done> : <p>Done</p>
</match>
`);
    const d = findDiagnostic(r, "E-MATCH-ONTRANSITION-FORBIDDEN");
    expect(d).not.toBeNull();
    expect(d.message).toContain("onTransition");
  });
});

// ---------------------------------------------------------------------------
// §8: E-MATCH-NOT-EXHAUSTIVE fires
// ---------------------------------------------------------------------------

describe("§8: E-MATCH-NOT-EXHAUSTIVE fires when variants missing without wildcard", () => {
  test("fires when one variant missing", () => {
    const r = compile(`\${ type Phase:enum = { Idle, Loading, Done } @phase = .Idle }
<match for=Phase on=@phase>
    <Idle> : <p>Idle</p>
    <Done> : <p>Done</p>
</match>
`);
    const d = findDiagnostic(r, "E-MATCH-NOT-EXHAUSTIVE");
    expect(d).not.toBeNull();
    expect(d.message).toContain(".Loading");
  });
});

// ---------------------------------------------------------------------------
// §9: E-MATCH-NOT-EXHAUSTIVE silent when wildcard present
// ---------------------------------------------------------------------------

describe("§9: E-MATCH-NOT-EXHAUSTIVE silent when `<_>` present", () => {
  test("silent when wildcard catch-all present", () => {
    const r = compile(`\${ type Phase:enum = { Idle, Loading, Done } @phase = .Idle }
<match for=Phase on=@phase>
    <Idle> : <p>Idle</p>
    <_> : <p>other</p>
</match>
`);
    const d = findDiagnostic(r, "E-MATCH-NOT-EXHAUSTIVE");
    expect(d).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §10: E-MATCH-ON-REQUIRED fires
// ---------------------------------------------------------------------------

describe("§10: E-MATCH-ON-REQUIRED fires when on= missing + no engine in scope", () => {
  test("fires", () => {
    const r = compile(`\${ type Phase:enum = { Idle, Done } }
<match for=Phase>
    <Idle> : <p>Idle</p>
    <Done> : <p>Done</p>
</match>
`);
    const d = findDiagnostic(r, "E-MATCH-ON-REQUIRED");
    expect(d).not.toBeNull();
    expect(d.message).toContain("on=");
  });
});

// ---------------------------------------------------------------------------
// §11: E-MATCH-ON-REQUIRED silent when engine in scope
// ---------------------------------------------------------------------------

describe("§11: E-MATCH-ON-REQUIRED silent when engine for same Type in scope", () => {
  test("silent when <engine for=Phase> in scope (auto-implied on=)", () => {
    const r = compile(`\${ type Phase:enum = { Idle, Done } }
<engine for=Phase initial=.Idle>
  <Idle rule=.Done></>
  <Done rule=.Idle></>
</>

<match for=Phase>
    <Idle> : <p>Idle</p>
    <Done> : <p>Done</p>
</match>
`);
    const d = findDiagnostic(r, "E-MATCH-ON-REQUIRED");
    expect(d).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §12: Regression — engine state-child rule= NOT flagged as match-rule-inert
// ---------------------------------------------------------------------------

describe("§12: regression — engine state-child rule= is NOT W-MATCH-RULE-INERT", () => {
  test("engine rule= is silent (engine path untouched)", () => {
    const r = compile(`\${ type AppMode:enum = { Title, Playing } }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing rule=.Title></>
</>
`);
    const d = findDiagnostic(r, "W-MATCH-RULE-INERT");
    expect(d).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §13: Well-formed match block produces zero diagnostics
// ---------------------------------------------------------------------------

describe("§13: well-formed match produces no diagnostics", () => {
  test("complete + no rule/effect/onTransition + on= present", () => {
    const r = compile(`\${ type Phase:enum = { Idle, Done } @phase = .Idle }
<match for=Phase on=@phase>
    <Idle> : <p>Idle</p>
    <Done> : <p>Done</p>
</match>
`);
    expect(findDiagnostic(r, "W-MATCH-RULE-INERT")).toBeNull();
    expect(findDiagnostic(r, "E-MATCH-EFFECT-FORBIDDEN")).toBeNull();
    expect(findDiagnostic(r, "E-MATCH-ONTRANSITION-FORBIDDEN")).toBeNull();
    expect(findDiagnostic(r, "E-MATCH-NOT-EXHAUSTIVE")).toBeNull();
    expect(findDiagnostic(r, "E-MATCH-ON-REQUIRED")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §14: `:`-shorthand body form now works (Phase 1 limitation closed)
// ---------------------------------------------------------------------------

describe("§14: `:`-shorthand body form now compiles cleanly (Phase 1 limit closed)", () => {
  test("compile succeeds with `:`-shorthand arms", () => {
    const r = compile(`\${ type Phase:enum = { Idle, Done } @phase = .Idle }
<match for=Phase on=@phase>
    <Idle> : <p>Idle state</p>
    <Done> : <p>Done state</p>
</match>
`);
    // Pre-Phase-2 this fired multiple E-CTX-003 errors at BS-time. Post-Phase-2
    // the BS captures the body as raw text + the arm-parser tokenizes shorthand.
    const ctxErr = findDiagnostic(r, "E-CTX-003");
    expect(ctxErr).toBeNull();
    // Match-block diagnostics also clean for this well-formed case.
    expect(findDiagnostic(r, "E-MATCH-NOT-EXHAUSTIVE")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Helper: extractEnumVariants unit
// ---------------------------------------------------------------------------

describe("extractEnumVariants helper", () => {
  test("extracts unit variants", () => {
    const variants = extractEnumVariants("{ Idle, Loading, Done }");
    expect(variants).toEqual(["Idle", "Loading", "Done"]);
  });

  test("strips payload arglists from variants", () => {
    const variants = extractEnumVariants("{ Idle, Ready(rows), Failed(msg: string) }");
    expect(variants).toEqual(["Idle", "Ready", "Failed"]);
  });

  // S109 Phase 5 — the enum type-decl's `raw` field is tokenizer-JOINED text:
  // `Ready(count: int)` in source arrives as `Ready ( count : int )` with
  // spaces around the parens. Pre-S109, extractEnumVariants checked `s[pos]
  // === "("` immediately after the variant name and saw the SPACE, not the
  // `(`, so the payload-skip never fired — `count` + `int` were read as
  // phantom variants and fired a spurious E-MATCH-NOT-EXHAUSTIVE. Fixed by
  // skipping whitespace before the `(` probe.
  test("strips payload arglists with tokenizer-joined spacing (S109 regression guard)", () => {
    const variants = extractEnumVariants("{ Idle , Ready ( count : int ) }");
    expect(variants).toEqual(["Idle", "Ready"]);
  });

  test("strips multi-field payload arglists with tokenizer spacing", () => {
    const variants = extractEnumVariants(
      "{ A ( x : int ) , B ( y : string , z : int ) , C }"
    );
    expect(variants).toEqual(["A", "B", "C"]);
  });

  test("trailing unit variant after a spaced payload variant", () => {
    const variants = extractEnumVariants("{ Idle , Ready ( count : int ) , Done }");
    expect(variants).toEqual(["Idle", "Ready", "Done"]);
  });
});

// ---------------------------------------------------------------------------
// §12: payload-bearing enums — exhaustiveness no longer spuriously fails
//      (S109 Phase 5 — extractEnumVariants tokenizer-spacing fix)
// ---------------------------------------------------------------------------

describe("§12: payload-bearing enum in <match> — no spurious E-MATCH-NOT-EXHAUSTIVE", () => {
  test("`Ready(count: int)` enum + both arms covered → exhaustive (no false positive)", () => {
    const r = compile(`\${
    type Phase:enum = { Idle, Ready(count: int) }
    <phase>: Phase = .Idle
}
<page>
    <match for=Phase on=@phase>
        <Idle> : "waiting"
        <Ready> : "ready"
    </match>
</>
`);
    // Pre-S109 this fired `E-MATCH-NOT-EXHAUSTIVE: missing arm(s) for
    // variant(s): .count, .int` — the payload field name + type were read
    // as phantom variants.
    expect(findDiagnostic(r, "E-MATCH-NOT-EXHAUSTIVE")).toBeNull();
  });

  test("payload-bearing variant with a binding `<Ready(count)>` compiles clean", () => {
    const r = compile(`\${
    type Phase:enum = { Idle, Ready(count: int) }
    <phase>: Phase = .Idle
}
<page>
    <match for=Phase on=@phase>
        <Idle> : "waiting"
        <Ready(count)> : count
    </match>
</>
`);
    expect(findDiagnostic(r, "E-MATCH-NOT-EXHAUSTIVE")).toBeNull();
    // The payload binding path is reachable now — no scope/name errors on
    // `count` referenced in the `:`-shorthand arm body.
    expect(findDiagnostic(r, "E-NAME-NOT-FOUND")).toBeNull();
    expect((r.errors || []).length).toBe(0);
  });

  test("genuinely-missing variant STILL fires E-MATCH-NOT-EXHAUSTIVE (regression guard)", () => {
    const r = compile(`\${
    type Phase:enum = { Idle, Ready(count: int), Done }
    <phase>: Phase = .Idle
}
<page>
    <match for=Phase on=@phase>
        <Idle> : "waiting"
        <Ready> : "ready"
    </match>
</>
`);
    // `Done` is genuinely uncovered — the fix must NOT suppress real misses.
    const d = findDiagnostic(r, "E-MATCH-NOT-EXHAUSTIVE");
    expect(d).not.toBeNull();
    expect(d.message).toContain(".Done");
    expect(d.message).not.toContain(".count");
    expect(d.message).not.toContain(".int");
  });
});
