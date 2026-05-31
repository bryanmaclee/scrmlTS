// match-arrow-colon-canonical-s147.test.js — S147 / change-id
// match-colon-arrow-canonical-2026-05-30.
//
// SPEC §18.2 / §34: the canonical match / `!{}`-handler arm separator is `:>`.
// `=>` and `->` are DEPRECATED arm-separator aliases accepted during the
// deprecation window — they parse, build, and emit identically to `:>`, and
// surface the info-level lint `W-MATCH-ARROW-LEGACY`. The lint is
// ARM-CONTEXT-SCOPED: it fires ONLY at the arm-separator position, never on a
// `=>` arrow-function glyph or a `->` `fn`-return separator.
//
// This file verifies, end to end:
//   §A — the arm-separator glyph is PRESERVED on the built AST node (`armArrow`)
//        for `:>` / `=>` / `->`, in both inline and block arm forms.
//   §B — W-MATCH-ARROW-LEGACY fires for `=>` and `->` match arms (markup
//        `${match}` + JS-style value-match decl), does NOT fire for `:>`, and
//        does NOT fire on a non-arm `=>` (arrow-fn) or `->` (fn-return) in the
//        same file. Confirms the info-level diagnostic-stream partition (S93).
//   §C — `!{}` error-handler arms fire the lint in lockstep for `=>` / `->`.
//   §D — `bun scrml migrate --fix` rewrites `=>` / `->` arm separators to `:>`
//        while leaving arrow-functions and fn-returns untouched.

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { compileScrml } from "../../src/api.js";
import { rewriteMatchArmArrows } from "../../src/commands/migrate.js";

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

let TMP;
beforeAll(() => { TMP = mkdtempSync(join(tmpdir(), "match-colon-s147-")); });
afterAll(() => { if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true }); });

function fx(relPath, source) {
  const abs = join(TMP, relPath);
  mkdirSync(join(abs, "..").replace(/\/$/, ""), { recursive: true });
  writeFileSync(abs, source);
  return abs;
}

function compile(filename, source) {
  const abs = fx(filename, source);
  return compileScrml({ inputFiles: [abs], outputDir: join(TMP, "dist"), write: false, log: () => {} });
}

// Cross-stream diagnostic collector. W-/I- codes land in result.warnings via
// the S93 partition; never assert against result.errors alone for a W- code.
function allDiags(result) {
  return [...(result.errors || []), ...(result.warnings || []), ...(result.lintDiagnostics || [])];
}
function diagsOf(result, code) {
  return allDiags(result).filter((e) => e && e.code === code);
}

// Build the AST for a tiny program and collect every match-arm / handler-arm
// node carrying an `armArrow` field.
function armArrowsFor(src) {
  const bs = splitBlocks("/test/app.scrml", src);
  const { ast } = buildAST(bs);
  const out = [];
  (function walk(n) {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.kind === "match-arm-inline" || n.kind === "match-arm-block") {
      out.push({ kind: n.kind, test: n.test ?? null, variant: n.variant ?? null, armArrow: n.armArrow });
    } else if (n.kind === "guarded-expr" && Array.isArray(n.arms)) {
      for (const arm of n.arms) out.push({ kind: "handler-arm", pattern: arm.pattern, armArrow: arm.armArrow });
    }
    for (const k of Object.keys(n)) { if (k === "span") continue; walk(n[k]); }
  })(ast);
  return out;
}

// ---------------------------------------------------------------------------
// §A — glyph preservation on the AST node
// ---------------------------------------------------------------------------

describe("§A: arm-separator glyph preserved on the AST node (armArrow)", () => {
  for (const glyph of [":>", "=>", "->"]) {
    test(`inline arms record armArrow="${glyph}" for each of three arms`, () => {
      const src = `<program>\n\${\nlet s = match d {\n  .North ${glyph} "up"\n  .South ${glyph} "down"\n  else   ${glyph} "x"\n}\n}\n</program>\n`;
      const arms = armArrowsFor(src).filter((a) => a.kind === "match-arm-inline");
      expect(arms.length).toBe(3);
      for (const a of arms) expect(a.armArrow).toBe(glyph);
    });

    test(`block arms record armArrow="${glyph}"`, () => {
      const src = `<program>\n\${\nlet s = match d {\n  .North ${glyph} { "up" }\n  else   ${glyph} { "x" }\n}\n}\n</program>\n`;
      const arms = armArrowsFor(src).filter((a) => a.kind === "match-arm-block");
      expect(arms.length).toBe(2);
      for (const a of arms) expect(a.armArrow).toBe(glyph);
    });
  }
});

// ---------------------------------------------------------------------------
// §B — W-MATCH-ARROW-LEGACY firing scope (match arms)
// ---------------------------------------------------------------------------

const MATCH_PROGRAM = (glyph) => `<program name="P">

type Dir:enum = { North, South, East }

<dir> = Dir.North

<double> = (x) => x * 2

fn pure_ret(x: int) -> int {
  return x + 1
}

<page>
  <p>\${match dir {
    .North ${glyph} "up"
    .South ${glyph} "down"
    else   ${glyph} "x"
  }}</p>
  <p>{double(21)}</p>
  <p>{pure_ret(1)}</p>
</page>

</program>
`;

describe("§B: W-MATCH-ARROW-LEGACY arm-context scope (match arms)", () => {
  test("`=>` markup match arms fire the lint once per arm (3x)", () => {
    const result = compile("b/eq.scrml", MATCH_PROGRAM("=>"));
    const lints = diagsOf(result, "W-MATCH-ARROW-LEGACY");
    expect(lints.length).toBe(3);
    for (const l of lints) {
      expect(l.severity).toBe("info");
      expect(l.message).toContain(":>");
    }
  });

  test("`->` markup match arms fire the lint once per arm (3x)", () => {
    const result = compile("b/dash.scrml", MATCH_PROGRAM("->"));
    const lints = diagsOf(result, "W-MATCH-ARROW-LEGACY");
    expect(lints.length).toBe(3);
    for (const l of lints) expect(l.severity).toBe("info");
  });

  test("`:>` canonical arms do NOT fire the lint", () => {
    const result = compile("b/colon.scrml", MATCH_PROGRAM(":>"));
    expect(diagsOf(result, "W-MATCH-ARROW-LEGACY").length).toBe(0);
  });

  test("the lint does NOT fire on the arrow-fn `=>` or the fn-return `->` in the same file", () => {
    // The `:>` program contains an arrow-fn (`(x) => x * 2`) and a fn-return
    // (`-> int`) but zero deprecated ARM separators. Zero lints proves the
    // scope is the arm position only.
    const result = compile("b/colon-scope.scrml", MATCH_PROGRAM(":>"));
    expect(diagsOf(result, "W-MATCH-ARROW-LEGACY").length).toBe(0);
  });

  test("info-level partition: W-MATCH-ARROW-LEGACY lands in result.warnings, never result.errors (S93)", () => {
    const result = compile("b/partition.scrml", MATCH_PROGRAM("=>"));
    const inWarnings = (result.warnings || []).filter((e) => e.code === "W-MATCH-ARROW-LEGACY");
    const inErrors = (result.errors || []).filter((e) => e.code === "W-MATCH-ARROW-LEGACY");
    expect(inWarnings.length).toBe(3);
    expect(inErrors.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §C — `!{}` error-handler arm lockstep
// ---------------------------------------------------------------------------

const HANDLER_PROGRAM = (glyph) => `\${
  type FetchErr:enum = { Timeout, Refused, Other }

  function loadit()! -> FetchErr {
    const r = doFetch() !{
      ::Timeout(e) ${glyph} "to"
      ::Refused(e) ${glyph} "rf"
      ::Other(e) ${glyph} "ot"
    }
    return r
  }
}
<program><p>x</p></program>
`;

describe("§C: W-MATCH-ARROW-LEGACY lockstep on `!{}` handler arms", () => {
  test("`=>` handler arms fire the lint (>=1)", () => {
    const result = compile("c/eq.scrml", HANDLER_PROGRAM("=>"));
    expect(diagsOf(result, "W-MATCH-ARROW-LEGACY").length).toBeGreaterThan(0);
    for (const l of diagsOf(result, "W-MATCH-ARROW-LEGACY")) expect(l.severity).toBe("info");
  });

  test("`->` handler arms fire the lint (>=1)", () => {
    const result = compile("c/dash.scrml", HANDLER_PROGRAM("->"));
    expect(diagsOf(result, "W-MATCH-ARROW-LEGACY").length).toBeGreaterThan(0);
  });

  test("`:>` handler arms do NOT fire the lint", () => {
    const result = compile("c/colon.scrml", HANDLER_PROGRAM(":>"));
    expect(diagsOf(result, "W-MATCH-ARROW-LEGACY").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §D — `migrate --fix` arm-arrow rewrite precision
// ---------------------------------------------------------------------------

describe("§D: migrate --fix rewrites arm separators to `:>` only", () => {
  const SRC = `<program name="X">
type Dir = enum { North, South, East }

<dir> = Dir.North
<double> = (x) => x * 2

fn label(d: Dir) -> string {
  return "x"
}

<page>
  <p>\${match dir {
    .North => "up"
    .South -> "down"
    else   => "x"
  }}</p>
</page>
</program>
`;

  test("all three arm separators (=>/->/=> ) become :>", () => {
    const r = rewriteMatchArmArrows(SRC, "/tmp/x.scrml");
    expect(r.changed).toBe(true);
    expect(r.count).toBe(3);
    // Each arm now uses `:>`.
    expect(r.rewritten).toContain('.North :> "up"');
    expect(r.rewritten).toContain('.South :> "down"');
    expect(r.rewritten).toContain('else   :> "x"');
  });

  test("the arrow-function glyph `(x) => x * 2` is UNTOUCHED", () => {
    const r = rewriteMatchArmArrows(SRC, "/tmp/x.scrml");
    expect(r.rewritten).toContain("<double> = (x) => x * 2");
    expect(r.rewritten).not.toContain("<double> = (x) :> x * 2");
  });

  test("the fn-return separator `-> string` is UNTOUCHED", () => {
    const r = rewriteMatchArmArrows(SRC, "/tmp/x.scrml");
    expect(r.rewritten).toContain("fn label(d: Dir) -> string");
    expect(r.rewritten).not.toContain("fn label(d: Dir) :> string");
  });

  test("a file with only `:>` arms (plus an arrow-fn + fn-return) is a no-op", () => {
    // Canonical `:>` arms, an arrow-fn (`=>`), and a fn-return (`->`). The
    // rewrite must touch NONE of them: zero arm edits, source unchanged.
    const colonOnly = `<program name="X">
type Dir = enum { North, South }

<dir> = Dir.North
<double> = (x) => x * 2

fn label(d: Dir) -> string {
  return "x"
}

<page>
  <p>\${match dir {
    .North :> "up"
    .South :> "down"
  }}</p>
</page>
</program>
`;
    const r = rewriteMatchArmArrows(colonOnly, "/tmp/x.scrml");
    expect(r.count).toBe(0);
    expect(r.changed).toBe(false);
    expect(r.rewritten).toBe(colonOnly);
  });

  test("post-rewrite source produces zero W-MATCH-ARROW-LEGACY", () => {
    const r = rewriteMatchArmArrows(SRC, "/tmp/x.scrml");
    const result = compile("d/after.scrml", r.rewritten);
    expect(diagsOf(result, "W-MATCH-ARROW-LEGACY").length).toBe(0);
  });
});
