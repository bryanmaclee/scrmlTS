/**
 * B1-FUP (S99) — TS scope walker named-form RHS identifier binding.
 *
 * Per B1's dispatch report deferred follow-on:
 *
 *   "Named-form RHS scoping: the type-system (TS) pass doesn't yet
 *    recognize named-form RHS identifiers (e.g., `r` in `<Done rows=r>`)
 *    as in-scope locals. Codegen emission is correct; only the TS
 *    scope-walker needs updating."
 *
 * Per SPEC §51.0.B.1 normative bullet 2:
 *
 *   "Bindings introduced by any of the three forms SHALL be in scope
 *    throughout the state-child body — markup interpolation, nested
 *    logic blocks, event-handler attribute values, <onTransition> /
 *    <onTimeout> element children, and the body of any nested
 *    <engine> declaration."
 *
 * The three forms are:
 *   1. Bare-attribute (positional)   — `<Done rows rule=.Idle>`
 *   2. Named                          — `<Done rows=r rule=.Idle>`
 *   3. Parenthesized (positional)     — `<Done(rows) rule=.Idle>`
 *   3prime. Parenthesized + named     — `<Done (rows=r) rule=.Idle>`
 *
 * Pre-S99 (B1-shipped state): only the positional/parenthesized form
 * (where attrs[i].value.kind === "absent") bound a local. The named
 * form (attrs[i].value.kind === "variable-ref") was silently dropped,
 * so body references to the RHS local fired E-SCOPE-001.
 *
 * Coverage:
 *   §1 Named form `<Done rows=r>` — `${r}` in body resolves.
 *   §2 Parenthesized + named form `<Done (rows=r)>` — `${r}` resolves.
 *   §3 Positional form `<Done rows>` — `${rows}` resolves (regression
 *      anchor: B1\'s existing wiring still works).
 *   §4 Parenthesized form `<Done(rows)>` — `${rows}` resolves (regression).
 *   §5 Multi-field named form `<OpenAt depth=d opener=k span=s>` —
 *      all three RHS locals resolve; the LHS field names are NOT bound.
 *   §6 Named-form RHS local that DIFFERS from outer binding — body refs
 *      resolve to the inner local; the local is arm-local.
 *   §7 Named-form RHS local with SAME name as outer function — inner local
 *      shadows; body refs resolve without E-SCOPE-001.
 *   §8 Named-form RHS local used in expressions: `${r}`, `${r + 1}`,
 *      `${r.length}`.
 *   §9 The named-form RHS local is NOT visible in sibling arms.
 */

import { describe, expect, test } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runSYM } from "../../src/symbol-table.ts";
import { runTS } from "../../src/type-system.ts";

function runUpToTS(source, filePath = "/test/b1-fup.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast, errors: tabErrors } = buildAST(bs);
  const fileAST = { filePath, ...ast };
  const symResult = runSYM({ filePath, ast });
  const tsResult = runTS({ files: [fileAST] });
  const allErrors = [
    ...(tabErrors ?? []),
    ...(symResult.errors ?? []),
    ...(tsResult.errors ?? []),
  ].filter((e) => e && e.severity !== "warning");
  return { ast, errors: allErrors };
}

// ---------------------------------------------------------------------------
// §1: named form `<Done rows=r>` — RHS local resolves inside body
// ---------------------------------------------------------------------------

describe("§1 (S99): named form `<Done rows=r>` — `${r}` in body resolves", () => {
  test("no E-SCOPE-001 on named-form RHS local reference", () => {
    const source = `<program>
\${
  type Phase:enum = {
    Idle,
    Done(rows: int)
  }
}

<engine for=Phase initial=.Idle>
  <Idle rule=.Done></>
  <Done rows=r rule=.Idle>
    <div>\${r}</div>
  </>
</>
</program>`;
    const { errors } = runUpToTS(source);
    const scopeErrs = errors.filter(
      (e) => e.code === "E-SCOPE-001" && /\br\b/.test(e.message ?? ""),
    );
    expect(scopeErrs.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §2: parenthesized + named form `<Done (rows=r)>` — RHS local resolves
// ---------------------------------------------------------------------------

describe("§2 (S99): parenthesized + named form `<Done (rows=r)>` — `${r}` resolves", () => {
  test("no E-SCOPE-001 on parenthesized-named-form RHS local reference", () => {
    const source = `<program>
\${
  type Phase:enum = {
    Idle,
    Done(rows: int)
  }
}

<engine for=Phase initial=.Idle>
  <Idle rule=.Done></>
  <Done (rows=r) rule=.Idle>
    <div>\${r}</div>
  </>
</>
</program>`;
    const { errors } = runUpToTS(source);
    const scopeErrs = errors.filter(
      (e) => e.code === "E-SCOPE-001" && /\br\b/.test(e.message ?? ""),
    );
    expect(scopeErrs.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §3: positional form `<Done rows>` — REGRESSION ANCHOR (B1\'s wiring)
// ---------------------------------------------------------------------------

describe("§3 (regression): positional form `<Done rows>` — `${rows}` resolves", () => {
  test("B1\'s existing positional-form wiring still binds the local", () => {
    const source = `<program>
\${
  type Phase:enum = {
    Idle,
    Done(rows: int)
  }
}

<engine for=Phase initial=.Idle>
  <Idle rule=.Done></>
  <Done rows rule=.Idle>
    <div>\${rows}</div>
  </>
</>
</program>`;
    const { errors } = runUpToTS(source);
    const scopeErrs = errors.filter(
      (e) => e.code === "E-SCOPE-001" && /\brows\b/.test(e.message ?? ""),
    );
    expect(scopeErrs.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §4: parenthesized form `<Done(rows)>` — REGRESSION ANCHOR
// ---------------------------------------------------------------------------

describe("§4 (regression): parenthesized form `<Done(rows)>` — `${rows}` resolves", () => {
  test("parenthesized-positional binding still works after the fix", () => {
    const source = `<program>
\${
  type Phase:enum = {
    Idle,
    Done(rows: int)
  }
}

<engine for=Phase initial=.Idle>
  <Idle rule=.Done></>
  <Done(rows) rule=.Idle>
    <div>\${rows}</div>
  </>
</>
</program>`;
    const { errors } = runUpToTS(source);
    const scopeErrs = errors.filter(
      (e) => e.code === "E-SCOPE-001" && /\brows\b/.test(e.message ?? ""),
    );
    expect(scopeErrs.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §5: multi-field named form — all three RHS locals are in scope
// ---------------------------------------------------------------------------

describe("§5 (S99): multi-field named `<OpenAt depth=d opener=k span=s>` — all RHS locals resolve", () => {
  test("three distinct RHS locals bound; body can reference all three", () => {
    const source = `<program>
\${
  type Bracket:enum = { Paren, Brace }
  type Stack:enum = {
    Balanced,
    OpenAt(depth: int, opener: Bracket, span: int)
  }
}

<engine for=Stack initial=.Balanced>
  <Balanced rule=.OpenAt></>
  <OpenAt depth=d opener=k span=s rule=.Balanced>
    <div>\${d} \${k} \${s}</div>
  </>
</>
</program>`;
    const { errors } = runUpToTS(source);
    const dErr = errors.filter(
      (e) => e.code === "E-SCOPE-001" && /\bd\b/.test(e.message ?? ""),
    );
    const kErr = errors.filter(
      (e) => e.code === "E-SCOPE-001" && /\bk\b/.test(e.message ?? ""),
    );
    const sErr = errors.filter(
      (e) => e.code === "E-SCOPE-001" && /\bs\b/.test(e.message ?? ""),
    );
    expect(dErr.length).toBe(0);
    expect(kErr.length).toBe(0);
    expect(sErr.length).toBe(0);
  });

  test("the LHS field names (depth, opener, span) are NOT bound — only the RHS locals", () => {
    // Per SPEC §51.0.B.1: in the named form, `field=local` binds the
    // local (RHS), NOT the field name (LHS). A body reference to the
    // FIELD name (without a matching outer binding) MUST fire
    // E-SCOPE-001 — only the chosen LOCAL name is in scope.
    const source = `<program>
\${
  type Bracket:enum = { Paren, Brace }
  type Stack:enum = {
    Balanced,
    OpenAt(depth: int, opener: Bracket, span: int)
  }
}

<engine for=Stack initial=.Balanced>
  <Balanced rule=.OpenAt></>
  <OpenAt depth=d opener=k span=s rule=.Balanced>
    <div>\${depth}</div>
  </>
</>
</program>`;
    const { errors } = runUpToTS(source);
    const depthErrs = errors.filter(
      (e) => e.code === "E-SCOPE-001" && /\bdepth\b/.test(e.message ?? ""),
    );
    expect(depthErrs.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §6: named-form RHS local that DIFFERS from outer binding
// ---------------------------------------------------------------------------

describe("§6 (S99): named-form RHS local with a name DIFFERENT from an outer binding", () => {
  test("inner local resolves cleanly; outer binding still accessible by its own name", () => {
    const source = `<program>
\${
  type Phase:enum = {
    Idle,
    Done(rows: int)
  }
  function outerHelper() {}
}

<engine for=Phase initial=.Idle>
  <Idle rule=.Done></>
  <Done rows=localRows rule=.Idle>
    <div>\${localRows}</div>
    <button onclick=outerHelper()>Help</button>
  </>
</>
</program>`;
    const { errors } = runUpToTS(source);
    const localErrs = errors.filter(
      (e) => e.code === "E-SCOPE-001" && /\blocalRows\b/.test(e.message ?? ""),
    );
    const outerErrs = errors.filter(
      (e) => e.code === "E-SCOPE-001" && /\bouterHelper\b/.test(e.message ?? ""),
    );
    expect(localErrs.length).toBe(0);
    expect(outerErrs.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §7: named-form RHS local with SAME name as outer function — inner shadow
// ---------------------------------------------------------------------------

describe("§7 (S99): named-form RHS local with SAME name as an outer function", () => {
  test("body references to the local resolve to the inner binding (no E-SCOPE-001)", () => {
    // `r` is also the name of an outer function. Inside the state-child
    // body, `${r}` should resolve to the payload local (inner scope) and
    // NOT fire E-SCOPE-001. The outer fn remains visible by other names
    // (function names are at file scope; the inner local merely shadows
    // the bare-name lookup within the arm body).
    const source = `<program>
\${
  type Phase:enum = {
    Idle,
    Done(rows: int)
  }
  function r() {}
}

<engine for=Phase initial=.Idle>
  <Idle rule=.Done></>
  <Done rows=r rule=.Idle>
    <div>\${r}</div>
  </>
</>
</program>`;
    const { errors } = runUpToTS(source);
    const rErrs = errors.filter(
      (e) => e.code === "E-SCOPE-001" && /\br\b/.test(e.message ?? ""),
    );
    expect(rErrs.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §8: named-form RHS local used in expressions and member-access
// ---------------------------------------------------------------------------

describe("§8 (S99): named-form RHS local in compound expressions", () => {
  test("`${r}`, `${r + 1}`, `${r.length}` all resolve cleanly", () => {
    // Scope binding is `tAsIs` (no type-aware tracking yet — that\'s
    // post-B1 / variant-field-type resolution work). So member access
    // like `${r.length}` only needs the BASE identifier `r` to be in
    // scope; member-side resolution is downstream of scope.
    const source = `<program>
\${
  type Phase:enum = {
    Idle,
    Done(rows: int)
  }
}

<engine for=Phase initial=.Idle>
  <Idle rule=.Done></>
  <Done rows=r rule=.Idle>
    <div>\${r}</div>
    <div>\${r + 1}</div>
    <div>\${r.length}</div>
  </>
</>
</program>`;
    const { errors } = runUpToTS(source);
    const rErrs = errors.filter(
      (e) => e.code === "E-SCOPE-001" && /\br\b/.test(e.message ?? ""),
    );
    expect(rErrs.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §9: named-form RHS local is arm-local — not visible in sibling arms
// ---------------------------------------------------------------------------

describe("§9 (S99): named-form RHS local is arm-local — not visible in sibling arms", () => {
  test("`r` declared via `<Done rows=r>` is NOT in scope inside `<Idle>`", () => {
    const source = `<program>
\${
  type Phase:enum = {
    Idle,
    Done(rows: int)
  }
}

<engine for=Phase initial=.Idle>
  <Idle rule=.Done>
    <div>\${r}</div>
  </>
  <Done rows=r rule=.Idle>
    <div>\${r}</div>
  </>
</>
</program>`;
    const { errors } = runUpToTS(source);
    const rErrs = errors.filter(
      (e) => e.code === "E-SCOPE-001" && /\br\b/.test(e.message ?? ""),
    );
    // `r` in <Idle> body has no binding → E-SCOPE-001 fires once.
    // `r` in <Done rows=r> body has a binding → does NOT fire.
    expect(rErrs.length).toBe(1);
  });
});
