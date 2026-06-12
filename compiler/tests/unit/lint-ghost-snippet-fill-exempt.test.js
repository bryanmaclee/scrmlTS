/**
 * lint-ghost-patterns — parametric-snippet-fill exemption (S184 Fix A)
 *
 * Change-id: ghost-lint-canonical-exempt-2026-06-11
 * Gap: g-ghost-lint-canonical-form-false-positive (LOW).
 *
 * Bug surface (components / L22 dog-food):
 *   The canonical §16.6 parametric-snippet-fill call site
 *   `<Card body={ (label) => <p>${label}</p> } />` (PRIMER §6.4(5); corpus
 *   examples/07, examples/27, samples/snippet-002-parametric) false-fired
 *   THREE ghost lints:
 *     - W-LINT-007: `prop={` matched the JSX `<Comp prop={val}>` regex; the
 *       markup-value exemption (`<Tag` after `{`) missed because the first
 *       body char is `(` (the lambda).
 *     - W-LINT-021: the lambda param `(label) =>` matched the Angular
 *       `(event)=` family (it grabs the `=` of `=>`).
 *     - W-LINT-004: a camelCase prop name `onPick={` matched the `on[A-Z]=`
 *       React-handler family.
 *
 * Fix: a snippet-fill exemption keyed on the §16.6 shape — a `prop={` whose
 * braced body opens a parenthesized-param arrow lambda RETURNING MARKUP
 * (`( <params> ) => <Tag...`). The "returns markup" requirement is what keeps
 * a genuine JSX scalar arrow `onClick={(e) => fn()}` (returns a call, not
 * markup) FIRING.
 *
 * MUST NOT weaken the genuine catches:
 *   - a real JSX scalar `<Comp prop={value}>` / `{fn()}` / `{a + b}` STILL fires W-LINT-007
 *   - a real JSX scalar arrow `onClick={(e) => fn()}` STILL fires W-LINT-007
 *   - a real Angular `(click)=handler` STILL fires W-LINT-021
 *   - a real React `onChange={handler}` STILL fires W-LINT-004
 */

import { describe, test, expect } from "bun:test";
import { lintGhostPatterns } from "../../src/lint-ghost-patterns.js";

function lint(source) {
  return lintGhostPatterns(source, "test.scrml");
}
function countCode(diags, code) {
  return diags.filter((d) => d.code === code).length;
}

// ---------------------------------------------------------------------------
// §1 Canonical §16.6 snippet-fill — NONE of W-LINT-007/021/004 fire
// ---------------------------------------------------------------------------

describe("§1 §16.6 parametric-snippet-fill `prop={ (p) => <markup/> }` is exempt", () => {
  test("Minimal repro — `<Card body={ (label) => <p>${label}</p> } />`", () => {
    const source = `<Card body={ (label) => <p>\${label}</p> } />`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
    expect(countCode(diags, "W-LINT-021")).toBe(0);
    expect(countCode(diags, "W-LINT-004")).toBe(0);
  });

  test("camelCase prop name `onPick={ (label) => <p/> }` — all three exempt", () => {
    const source = `<Card onPick={ (label) => <p>\${label}</p> } />`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
    expect(countCode(diags, "W-LINT-021")).toBe(0);
    expect(countCode(diags, "W-LINT-004")).toBe(0);
  });

  test("Zero-arg slot `slot={ () => <p/> }` exempt", () => {
    const source = `<Card slot={ () => <p>x</p> } />`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
    expect(countCode(diags, "W-LINT-021")).toBe(0);
  });

  test("Multi-param slot `row={ (a, b) => <td/> }` exempt", () => {
    const source = `<Card row={ (a, b) => <td>x</td> } />`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
    expect(countCode(diags, "W-LINT-021")).toBe(0);
  });

  test("Corpus shape — `row={ (item) => <span>${item.id}. ${item.label}</span> }`", () => {
    const source = `<List items=@items row={ (item) => <span>\${item.id}. \${item.label}</span> } />`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
    expect(countCode(diags, "W-LINT-021")).toBe(0);
  });

  test("No leading space after `{` — `body={(label) => <p/>}`", () => {
    const source = `<Card body={(label) => <p>x</p>} />`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
    expect(countCode(diags, "W-LINT-021")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §2 Negative controls — genuine framework ghosts STILL fire
// ---------------------------------------------------------------------------

describe("§2 W-LINT-007 still fires on genuine JSX scalar braced attrs", () => {
  test("Variable reference — `<Comp prop={value}>`", () => {
    expect(countCode(lint(`<Comp prop={value}>x</Comp>`), "W-LINT-007")).toBeGreaterThanOrEqual(1);
  });
  test("Function call — `<Comp prop={fn()}>`", () => {
    expect(countCode(lint(`<Comp prop={fn()}>x</Comp>`), "W-LINT-007")).toBeGreaterThanOrEqual(1);
  });
  test("Binary expression — `<Comp prop={a + b}>`", () => {
    expect(countCode(lint(`<Comp prop={a + b}>x</Comp>`), "W-LINT-007")).toBeGreaterThanOrEqual(1);
  });
  test("Scalar arrow (returns a call, NOT markup) — `<button onClick={(e) => fn()}>` STILL fires (R25 Bug 44)", () => {
    expect(countCode(lint(`<button onClick={(e) => fn()}>c</button>`), "W-LINT-007")).toBeGreaterThanOrEqual(1);
  });
  test("Scalar arrow returning a binary expr — `prop={(x) => x + 1}` STILL fires", () => {
    expect(countCode(lint(`<Comp prop={(x) => x + 1}>c</Comp>`), "W-LINT-007")).toBeGreaterThanOrEqual(1);
  });
});

describe("§2 W-LINT-021 still fires on genuine Angular event bindings", () => {
  test("Angular `(click)=handler()` — STILL fires", () => {
    expect(countCode(lint(`<button (click)=onClick()>c</button>`), "W-LINT-021")).toBeGreaterThanOrEqual(1);
  });
  test("Angular `(submit)=save()` — STILL fires", () => {
    expect(countCode(lint(`<form (submit)=save()>x</form>`), "W-LINT-021")).toBeGreaterThanOrEqual(1);
  });
});

describe("§2 W-LINT-004 still fires on genuine React camelCase handlers", () => {
  test("React `<input onChange={handler}>` — STILL fires", () => {
    expect(countCode(lint(`<input onChange={handler}/>`), "W-LINT-004")).toBeGreaterThanOrEqual(1);
  });
  test("React `<form onSubmit={save}>` — STILL fires", () => {
    expect(countCode(lint(`<form onSubmit={save}>x</form>`), "W-LINT-004")).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// §3 Mixed — snippet-fill alongside a genuine scalar prop: only scalar fires
// ---------------------------------------------------------------------------

describe("§3 mixed snippet-fill + genuine scalar on adjacent attrs", () => {
  test("`<Card body={ (l) => <p/> } title={x}>` — only `title={x}` fires W-LINT-007", () => {
    const source = `<Card body={ (l) => <p>x</p> } title={x}>y</Card>`;
    const diags = lint(source);
    // body= is snippet-fill (exempt); title={x} is a JSX scalar (fires).
    expect(countCode(diags, "W-LINT-007")).toBe(1);
  });
});
