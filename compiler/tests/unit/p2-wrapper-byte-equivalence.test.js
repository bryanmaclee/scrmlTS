/**
 * P2-wrapper §21.2 byte-equivalence — Unit Tests
 *
 * Asserts the canonical equivalence of Form 1 and Form 2:
 *
 *   Form 1: `export <Name outerAttrs>{body}</Name>`
 *   Form 2: `export const Name = <body-root attrs+outerAttrs>...</body-root>`
 *
 * After the wrapper fix (P2-wrapper, 2026-04-30 SPEC §21.2 amendment), these
 * forms produce IDENTICAL AST structure for the export-decl entry. The body's
 * single root markup element absorbs all of the outer's attributes; the outer
 * `<Name>` tag disappears at the source level.
 *
 * Coverage:
 *   §A  AST equivalence — Form 1 and Form 2 produce identical export-decl
 *       raw + exportedName + exportKind for matching component shapes.
 *   §B  Outer-attr absorption — class merging, props block, mixed attrs.
 *   §C  E-EXPORT-002 — empty body / multi-rooted body / non-markup body.
 *   §D  E-EXPORT-003 — outer attr name conflicts with body-root attr name.
 *   §E  Class-merge exception — `class` on outer + `class` on body root is
 *       NOT a conflict (per §15.5 class merging rule).
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function tabOn(filePath, source) {
  const bsOut = splitBlocks(filePath, source);
  return buildAST(bsOut);
}

function realErrors(errs) {
  return (errs || []).filter(e => e && e.severity !== "warning");
}

function exportSig(exp) {
  if (!exp) return null;
  return {
    kind: exp.kind,
    exportedName: exp.exportedName,
    exportKind: exp.exportKind,
    isPure: exp.isPure ?? false,
    isServer: exp.isServer ?? false,
    raw: exp.raw,
  };
}

// ---------------------------------------------------------------------------
// §A — AST equivalence between Form 1 and Form 2
// ---------------------------------------------------------------------------

describe("§A Form 1 and Form 2 produce identical export-decl raw", () => {
  test("simple body, no outer attrs, no body attrs → identical raw", () => {
    const form1 = `export <Card>
  <div>hello</div>
</Card>
`;
    const form2 = `\${ export const Card = <div>hello</div> }
`;
    const t1 = tabOn("/test/c1.scrml", form1);
    const t2 = tabOn("/test/c2.scrml", form2);
    expect(realErrors(t1.errors)).toEqual([]);
    expect(realErrors(t2.errors)).toEqual([]);
    expect(exportSig(t1.ast.exports[0])).toEqual(exportSig(t2.ast.exports[0]));
  });

  test("body with class only, no outer attrs → identical raw", () => {
    const form1 = `export <Card>
  <div class="card">hello</div>
</Card>
`;
    const form2 = `\${ export const Card = <div class="card">hello</div> }
`;
    const t1 = tabOn("/test/c1.scrml", form1);
    const t2 = tabOn("/test/c2.scrml", form2);
    expect(realErrors(t1.errors)).toEqual([]);
    expect(realErrors(t2.errors)).toEqual([]);
    expect(exportSig(t1.ast.exports[0])).toEqual(exportSig(t2.ast.exports[0]));
  });

  test("outer attrs absorbed onto body root (props block) → identical raw", () => {
    const form1 = `export <Greeting props={ name: string }>
  <p>Hello, \${name}!</p>
</Greeting>
`;
    const form2 = `\${ export const Greeting = <p props={ name: string }>Hello, \${name}!</p> }
`;
    const t1 = tabOn("/test/c1.scrml", form1);
    const t2 = tabOn("/test/c2.scrml", form2);
    expect(realErrors(t1.errors)).toEqual([]);
    expect(realErrors(t2.errors)).toEqual([]);
    expect(exportSig(t1.ast.exports[0])).toEqual(exportSig(t2.ast.exports[0]));
  });
});

// ---------------------------------------------------------------------------
// §B — Outer-attr absorption details
// ---------------------------------------------------------------------------

describe("§B Outer-attr absorption", () => {
  test("class on outer merges with class on body root", () => {
    const form1 = `export <Box class="component">
  <div class="card-body">hello</div>
</Box>
`;
    const form2 = `\${ export const Box = <div class="card-body" class="component">hello</div> }
`;
    const t1 = tabOn("/test/b1.scrml", form1);
    const t2 = tabOn("/test/b2.scrml", form2);
    expect(realErrors(t1.errors)).toEqual([]);
    expect(realErrors(t2.errors)).toEqual([]);
    expect(exportSig(t1.ast.exports[0])).toEqual(exportSig(t2.ast.exports[0]));
  });

  test("mixed outer attrs (props + class + bare attr) on body root", () => {
    const form1 = `export <Card class="frame" props={ x: string }>
  <div class="body">\${x}</div>
</Card>
`;
    const form2 = `\${ export const Card = <div class="body" class="frame" props={ x: string }>\${x}</div> }
`;
    const t1 = tabOn("/test/m1.scrml", form1);
    const t2 = tabOn("/test/m2.scrml", form2);
    expect(realErrors(t1.errors)).toEqual([]);
    expect(realErrors(t2.errors)).toEqual([]);
    expect(exportSig(t1.ast.exports[0])).toEqual(exportSig(t2.ast.exports[0]));
  });

  test("no outer attrs but body has many attrs → identical raw", () => {
    const form1 = `export <Pre>
  <pre class="code" data-lang="js" autofocus>x</pre>
</Pre>
`;
    const form2 = `\${ export const Pre = <pre class="code" data-lang="js" autofocus>x</pre> }
`;
    const t1 = tabOn("/test/p1.scrml", form1);
    const t2 = tabOn("/test/p2.scrml", form2);
    expect(realErrors(t1.errors)).toEqual([]);
    expect(realErrors(t2.errors)).toEqual([]);
    expect(exportSig(t1.ast.exports[0])).toEqual(exportSig(t2.ast.exports[0]));
  });
});

// ---------------------------------------------------------------------------
// §C — E-EXPORT-002: empty body / multi-rooted body
// ---------------------------------------------------------------------------

describe("§C E-EXPORT-002: body must be single-rooted markup", () => {
  test("empty body fires E-EXPORT-002", () => {
    const src = `export <Empty></Empty>
`;
    const t = tabOn("/test/e.scrml", src);
    const errs = realErrors(t.errors);
    expect(errs.some(e => e.code === "E-EXPORT-002")).toBe(true);
    // No export-decl should be created when body is invalid
    expect(t.ast.exports.length).toBe(0);
  });

  test("body with two top-level markup roots fires E-EXPORT-002", () => {
    const src = `export <Multi>
  <span>one</span>
  <span>two</span>
</Multi>
`;
    const t = tabOn("/test/m.scrml", src);
    const errs = realErrors(t.errors);
    expect(errs.some(e => e.code === "E-EXPORT-002")).toBe(true);
    expect(t.ast.exports.length).toBe(0);
  });

  test("body with text-only content (no markup root) fires E-EXPORT-002", () => {
    const src = `export <TextOnly>
  just some text
</TextOnly>
`;
    const t = tabOn("/test/t.scrml", src);
    const errs = realErrors(t.errors);
    expect(errs.some(e => e.code === "E-EXPORT-002")).toBe(true);
    expect(t.ast.exports.length).toBe(0);
  });

  test("body with whitespace-only text is allowed if there is one markup root", () => {
    const src = `export <Whitespace>

  <div>ok</div>

</Whitespace>
`;
    const t = tabOn("/test/w.scrml", src);
    const errs = realErrors(t.errors);
    expect(errs.filter(e => e.code === "E-EXPORT-002").length).toBe(0);
    expect(t.ast.exports.length).toBe(1);
    expect(t.ast.exports[0].exportedName).toBe("Whitespace");
  });
});

// ---------------------------------------------------------------------------
// §D — E-EXPORT-003: outer attr conflicts with body-root attr
// ---------------------------------------------------------------------------

describe("§D E-EXPORT-003: outer attr conflicts with body root attr", () => {
  test("outer 'title' conflicts with body root 'title' fires E-EXPORT-003", () => {
    const src = `export <Bad title="outer">
  <div title="inner">x</div>
</Bad>
`;
    const t = tabOn("/test/c.scrml", src);
    const errs = realErrors(t.errors);
    expect(errs.some(e => e.code === "E-EXPORT-003")).toBe(true);
    expect(t.ast.exports.length).toBe(0);
  });

  test("outer typed-prop name vs body root attr name conflict", () => {
    const src = `export <Bad title="outer">
  <div title="inner">x</div>
</Bad>
`;
    const t = tabOn("/test/p.scrml", src);
    const errs = realErrors(t.errors);
    expect(errs.some(e => e.code === "E-EXPORT-003")).toBe(true);
  });

  test("non-conflicting attrs (different names) succeed", () => {
    const src = `export <OK data-x="outer">
  <div title="inner">x</div>
</OK>
`;
    const t = tabOn("/test/ok.scrml", src);
    const errs = realErrors(t.errors);
    expect(errs.filter(e => e.code === "E-EXPORT-003").length).toBe(0);
    expect(t.ast.exports.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §E — Class-merge exception: `class` on both is NOT a conflict
// ---------------------------------------------------------------------------

describe("§E Class-merge exception", () => {
  test("class on outer + class on body root is NOT E-EXPORT-003", () => {
    const src = `export <Card class="component">
  <div class="card-body">x</div>
</Card>
`;
    const t = tabOn("/test/cm.scrml", src);
    const errs = realErrors(t.errors);
    expect(errs.filter(e => e.code === "E-EXPORT-003").length).toBe(0);
    expect(t.ast.exports.length).toBe(1);
  });
});
