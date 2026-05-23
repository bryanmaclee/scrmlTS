// parser-conformance-canary.test.js — M5 gap-ledger: dual-pipeline canary
// recursive-axis unit coverage.
//
// The dual-pipeline canary (compiler/tests/parser-conformance/
// dual-pipeline-canary.js) diffs the native-vs-live FileAST along TWO axes:
//   - the TOP-LEVEL node-kind sequence (`topKindSequence`); and
//   - the RECURSIVE node-kind sequence (`nodeKindSequence`) — the DEEP axis
//     that catches divergences nested below a top-level node.
//
// `parser-conformance-corpus.test.js` exercises the canary against the real
// ~1000-file corpus; this file is the FOCUSED unit coverage for the deep
// axis. It feeds `diffFileASTs` synthetic live/native FileAST pairs (the diff
// is pure data — it never re-runs a parse pipeline) and asserts the verdict:
//   - a top-level-equal but deep-divergent pair classifies `DIFF-deep-seq`;
//   - a fully deep-equal pair classifies `EXACT`;
//   - a top-level-divergent pair keeps its top-level class (the deep axis
//     does not re-bucket a file that already has a top-level cause).

import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";

import {
  nodeKindSequence,
  topKindSequence,
  diffFileASTs,
  classifyDivergence,
  sourceHasPhantomStateAdmission,
  isLiveDegenerate,
} from "./parser-conformance/dual-pipeline-canary.js";

// fakeFileAST — a minimal FileAST-shaped record for the diff. `diffFileASTs`
// reads `.nodes`, the six hoist arrays, and `.hasProgramRoot` — nothing else.
function fakeFileAST(nodes) {
  return {
    nodes,
    imports: [],
    exports: [],
    components: [],
    typeDecls: [],
    machineDecls: [],
    channelDecls: [],
    hasProgramRoot: true,
  };
}

// node — a tiny ASTNode-shaped record: a `kind` and optional `children`.
function node(kind, children) {
  return Array.isArray(children) ? { kind, children } : { kind };
}

describe("dual-pipeline-canary — nodeKindSequence (the recursive walk)", () => {
  test("walks children pre-order, recursively", () => {
    const tree = [
      node("markup", [
        node("text"),
        node("state", [node("text")]),
      ]),
      node("comment"),
    ];
    expect(nodeKindSequence(tree)).toEqual([
      "markup", "text", "state", "text", "comment",
    ]);
  });

  test("topKindSequence sees only the top row — the deep state is hidden", () => {
    const tree = [node("markup", [node("state")])];
    expect(topKindSequence(tree)).toEqual(["markup"]);
    expect(nodeKindSequence(tree)).toEqual(["markup", "state"]);
  });

  test("tolerates null / undefined / missing children", () => {
    expect(nodeKindSequence([null, undefined, node("text")])).toEqual(["text"]);
    expect(nodeKindSequence(undefined)).toEqual([]);
  });
});

describe("dual-pipeline-canary — diffFileASTs deep axis", () => {
  test("top-level-equal, deep-equal → both axes equal", () => {
    const live = fakeFileAST([node("markup", [node("state", [node("text")])])]);
    const native = fakeFileAST([node("markup", [node("state", [node("text")])])]);
    const d = diffFileASTs(live, native);
    expect(d.topSeqEqual).toBe(true);
    expect(d.deepSeqEqual).toBe(true);
    expect(d.deepFirstDivergence).toBe(null);
  });

  test("top-level-equal but deep-divergent → topSeqEqual true, deepSeqEqual false", () => {
    // both pipelines yield a single top-level `markup` — the top-level diff is
    // clean — but the live pipeline nests a `state` where native nests a
    // `markup`. Only the deep axis sees it.
    const live = fakeFileAST([node("markup", [node("state")])]);
    const native = fakeFileAST([node("markup", [node("markup")])]);
    const d = diffFileASTs(live, native);
    expect(d.topSeqEqual).toBe(true);
    expect(d.deepSeqEqual).toBe(false);
    expect(d.deepFirstDivergence).toEqual({
      index: 1, liveKind: "state", nativeKind: "markup",
    });
  });

  test("deepFirstDivergence reports an (end) sentinel on a length mismatch", () => {
    const live = fakeFileAST([node("markup", [node("text"), node("text")])]);
    const native = fakeFileAST([node("markup", [node("text")])]);
    const d = diffFileASTs(live, native);
    expect(d.topSeqEqual).toBe(true);
    expect(d.deepSeqEqual).toBe(false);
    expect(d.deepFirstDivergence).toEqual({
      index: 2, liveKind: "text", nativeKind: "(end)",
    });
  });
});

describe("dual-pipeline-canary — classifyDivergence-equivalent verdict logic", () => {
  // classifyDivergence drives both real pipelines from source; the verdict
  // logic itself is the boolean cascade over a diffFileASTs record. These
  // tests reproduce that cascade against synthetic diffs to lock the new
  // DIFF-deep-seq branch + the tightened EXACT criteria.

  // verdictFromDiff — the EXACT / DIFF-deep-seq decision for a clean-top diff,
  // mirroring the first two branches of classifyDivergence.
  function verdictFromDiff(d) {
    if (d.topSeqEqual && d.hoistEqual && d.programRootEqual && d.deepSeqEqual) {
      return "EXACT";
    }
    if (d.topSeqEqual && d.hoistEqual && d.programRootEqual &&
        d.deepSeqEqual === false) {
      return "DIFF-deep-seq";
    }
    return "(top-level class)";
  }

  test("a fully-matching pair classifies EXACT", () => {
    const ast = [node("markup", [node("text"), node("state", [node("text")])])];
    const d = diffFileASTs(fakeFileAST(ast), fakeFileAST(ast));
    expect(verdictFromDiff(d)).toBe("EXACT");
  });

  test("a top-level-equal, deep-divergent pair classifies DIFF-deep-seq", () => {
    const live = fakeFileAST([node("markup", [node("state")])]);
    const native = fakeFileAST([node("markup", [node("markup")])]);
    const d = diffFileASTs(live, native);
    expect(verdictFromDiff(d)).toBe("DIFF-deep-seq");
  });

  test("a top-level-divergent pair is NOT EXACT and NOT DIFF-deep-seq — it keeps a top-level class", () => {
    const live = fakeFileAST([node("state"), node("markup")]);
    const native = fakeFileAST([node("markup"), node("markup")]);
    const d = diffFileASTs(live, native);
    // top sequences differ → topSeqEqual false → falls through to the
    // top-level taxonomy, never reaching the deep-axis branches.
    expect(d.topSeqEqual).toBe(false);
    expect(verdictFromDiff(d)).toBe("(top-level class)");
  });
});

// =============================================================================
// Wave 6 Unit B — LIVE-PHANTOM class coverage. The new class credits native-
// correctness when LIVE admits a `< Ident>` state opener at a position SPEC
// §4.3 forbids (post-identifier non-terminator: `.` / `(` / `,` / `+` / `-` /
// etc. — the operator chars of a less-than expression). Native correctly
// rejects per P5-12b (`isStateTagBoundaryAfterLt`, S121); live's broad admit
// causes a phantom state-with-children that swallows content.
//
// Sibling to LIVE-DEGENERATE — both credit native-correctness when LIVE is
// the broken oracle, both `explained: true` (strict-pass-equivalent). The
// class will go away at M6 when block-splitter.js is deleted.
// =============================================================================
describe("dual-pipeline-canary — sourceHasPhantomStateAdmission", () => {
  test("detects `< p.foo)` — the bun-admin shape (less-than + property access)", () => {
    const src = "const x = items.filter(p => p.q < p.threshold).length";
    expect(sourceHasPhantomStateAdmission(src)).toBe(true);
  });

  test("detects `< n+1` (less-than + arithmetic)", () => {
    const src = "if (x < n+1) { return 0 }";
    expect(sourceHasPhantomStateAdmission(src)).toBe(true);
  });

  test("detects `< fn()` (less-than + call)", () => {
    const src = "while (i < fn()) { i = i + 1 }";
    expect(sourceHasPhantomStateAdmission(src)).toBe(true);
  });

  test("does NOT flag `< db src=...>` (legitimate state opener — `=` is a terminator)", () => {
    const src = `< db src="./products.db">contents</db>`;
    expect(sourceHasPhantomStateAdmission(src)).toBe(false);
  });

  test("does NOT flag `< engine>` (legitimate state opener — `>` is a terminator)", () => {
    const src = "< engine>contents</engine>";
    expect(sourceHasPhantomStateAdmission(src)).toBe(false);
  });

  test("does NOT flag `< engine name>` (legitimate state opener — ws is a terminator)", () => {
    const src = "< engine name>contents</engine>";
    expect(sourceHasPhantomStateAdmission(src)).toBe(false);
  });

  test("does NOT flag `<p>foo</p>` (no whitespace between `<` and ident — markup tag, not phantom shape)", () => {
    const src = "<p>foo</p>";
    expect(sourceHasPhantomStateAdmission(src)).toBe(false);
  });

  test("does NOT flag `< 3` (whitespace + non-letter — not a phantom site)", () => {
    const src = "if (x < 3) { return 0 }";
    expect(sourceHasPhantomStateAdmission(src)).toBe(false);
  });

  test("tolerates empty / non-string input", () => {
    expect(sourceHasPhantomStateAdmission("")).toBe(false);
    expect(sourceHasPhantomStateAdmission(null)).toBe(false);
    expect(sourceHasPhantomStateAdmission(undefined)).toBe(false);
  });

  test("finds at least one phantom site mixed in with legitimate openers", () => {
    const src =
      "< db src=\"./x.db\">x</db>\n" +
      "const y = a.filter(p => p.q < p.threshold).length";
    expect(sourceHasPhantomStateAdmission(src)).toBe(true);
  });
});

describe("dual-pipeline-canary — classifyDivergence LIVE-PHANTOM branch", () => {
  // Synthetic-input cases. classifyDivergence calls both real pipelines, so
  // these inputs need to produce the right shape end-to-end — not just match
  // the predicate. The first case mirrors bun-admin's failure shape; the
  // others lock the no-false-positive contract on legitimate openers.

  test("a legitimate markup file (`<p>foo</p>`) classifies EXACT, NOT LIVE-PHANTOM", () => {
    const src = "<p>foo</p>";
    const v = classifyDivergence("test://exact.scrml", src);
    expect(v.class).toBe("EXACT");
    expect(v.explained).toBe(true);
  });

  test("a legitimate `< db>` state opener classifies EXACT, NOT LIVE-PHANTOM", () => {
    // `< db src="...">` is the canonical SPEC §4.3 state opener — live and
    // native both admit identically. NOT a phantom shape.
    const src = `< db src="./x.db">contents</db>`;
    const v = classifyDivergence("test://state-opener.scrml", src);
    // Even if the file lands in some other class (DIFF-* / GAP-*), it MUST
    // NOT be LIVE-PHANTOM — the source has no phantom admission site.
    expect(v.class).not.toBe("LIVE-PHANTOM");
  });

  test("the real bun-admin corpus file classifies LIVE-PHANTOM (smoke — wires both pipelines + the predicate)", () => {
    const path =
      __dirname + "/../../samples/compilation-tests/gauntlet-r10-bun-admin.scrml";
    const src = readFileSync(path, "utf8");
    const v = classifyDivergence(path, src);
    expect(v.class).toBe("LIVE-PHANTOM");
    expect(v.explained).toBe(true);
    // The first deep divergence must have liveKind === 'state' — the
    // fingerprint gate that distinguishes LIVE-PHANTOM from a generic
    // DIFF-deep-seq.
    expect(v.detail.deepFirstDivergence).not.toBe(null);
    expect(v.detail.deepFirstDivergence.liveKind).toBe("state");
  });
});

// =============================================================================
// Wave 8 Unit W8-CANARY-DEGEN-GUARD — LIVE-DEGENERATE ratio-guard relaxation.
//
// The S121 GAP-NEB survey
// (docs/changes/m5-c2-gap-ledger/gap-neb-survey-s121-2026-05-22.md §4) lowered
// the `isLiveDegenerate` size-ratio guard from 3.0x to 1.5x. Two corpus files
// (`gauntlet-r11-zig-buildconfig.scrml` at 1.86x, `tailwind-prose-coverage.
// scrml` at 2.50x) carry the LIVE-DEGENERATE signature (liveMarkup===0,
// nativeMarkup>=1) but had been suppressed by the 3.0x threshold — corpus-
// stale shapes where live silently drops content and native correctly
// preserves it. The 1.5x cutoff absorbs both while preserving 1.86x headroom
// below the lowest legitimate LIVE-DEGENERATE ratio (3.36x).
//
// These tests lock the new threshold against silent regression: a ratio at or
// above 1.5x classifies as LIVE-DEGENERATE; a ratio below does not. The
// `liveMarkup === 0 ∧ nativeMarkup >= 1` shape gate remains the primary
// fingerprint; the ratio guard is defense-in-depth.
// =============================================================================
describe("dual-pipeline-canary — isLiveDegenerate ratio guard (W8-CANARY-DEGEN-GUARD)", () => {
  // mkDegenSeqs(liveLen, nativeLen, nativeMarkup) — build two synthetic
  // recursive-kind sequences (liveDeep, nativeDeep) shaped exactly the way
  // `isLiveDegenerate` consumes them. The live sequence has ZERO `markup`
  // entries (the degenerate signature); the native sequence contains
  // `nativeMarkup` `markup` entries followed by filler `text` entries to
  // reach the requested length.
  function mkDegenSeqs(liveLen, nativeLen, nativeMarkup) {
    if (nativeMarkup > nativeLen) {
      throw new Error("nativeMarkup must be <= nativeLen");
    }
    const liveDeep = new Array(liveLen).fill("text");
    const nativeDeep = [];
    for (let i = 0; i < nativeMarkup; i = i + 1) nativeDeep.push("markup");
    for (let i = nativeMarkup; i < nativeLen; i = i + 1) nativeDeep.push("text");
    return { liveDeep, nativeDeep };
  }

  // The two W8-CANARY-DEGEN-GUARD absorption targets — the surveyed corpus
  // ratios at which the post-fix predicate MUST fire. The pre-fix predicate
  // returned false on both because 1.86 < 3.0 and 2.50 < 3.0.

  test("2.50x ratio (tailwind-prose-coverage shape) classifies as LIVE-DEGENERATE", () => {
    // live deep len 6, native deep len 15 — the surveyed tailwind ratio.
    const { liveDeep, nativeDeep } = mkDegenSeqs(6, 15, 4);
    expect(nativeDeep.length / liveDeep.length).toBeCloseTo(2.5, 2);
    expect(isLiveDegenerate(liveDeep, nativeDeep)).toBe(true);
  });

  test("1.86x ratio (zig-buildconfig shape) classifies as LIVE-DEGENERATE", () => {
    // live deep len 7, native deep len 13 — the surveyed zig ratio.
    const { liveDeep, nativeDeep } = mkDegenSeqs(7, 13, 1);
    expect(nativeDeep.length / liveDeep.length).toBeCloseTo(1.857, 2);
    expect(isLiveDegenerate(liveDeep, nativeDeep)).toBe(true);
  });

  // The previously-handled LIVE-DEGENERATE population — confirm the new
  // threshold did NOT regress any of them.

  test("3.36x ratio (lowest legitimate LIVE-DEGENERATE — rust-dev-lin-lift-pipeline shape) still classifies as LIVE-DEGENERATE", () => {
    // live deep len 11, native deep len 37 — the lowest legitimate
    // LIVE-DEGENERATE ratio in the surveyed corpus.
    const { liveDeep, nativeDeep } = mkDegenSeqs(11, 37, 3);
    expect(nativeDeep.length / liveDeep.length).toBeCloseTo(3.36, 1);
    expect(isLiveDegenerate(liveDeep, nativeDeep)).toBe(true);
  });

  test("ratios above the old 3.0x threshold (e.g. 4.0x / 10.0x / 26.7x) still classify as LIVE-DEGENERATE", () => {
    // dashboard-like ratio 4.0x.
    const a = mkDegenSeqs(10, 40, 5);
    expect(isLiveDegenerate(a.liveDeep, a.nativeDeep)).toBe(true);
    // blog-cms-like ratio 10.0x.
    const b = mkDegenSeqs(10, 100, 20);
    expect(isLiveDegenerate(b.liveDeep, b.nativeDeep)).toBe(true);
    // dashboard-parallel-like ratio 26.7x.
    const c = mkDegenSeqs(9, 240, 60);
    expect(isLiveDegenerate(c.liveDeep, c.nativeDeep)).toBe(true);
  });

  // Threshold pin — the boundary cases. The predicate is `>= 1.5 *
  // liveDeep.length` so a 1.5x ratio FIRES (boundary inclusive); just below
  // (e.g. 1.49x) does NOT.

  test("a ratio exactly at the 1.5x threshold classifies as LIVE-DEGENERATE (boundary inclusive)", () => {
    // live deep len 10, native deep len 15 — exactly 1.5x.
    const { liveDeep, nativeDeep } = mkDegenSeqs(10, 15, 4);
    expect(nativeDeep.length).toBe(1.5 * liveDeep.length);
    expect(isLiveDegenerate(liveDeep, nativeDeep)).toBe(true);
  });

  test("a ratio just below 1.5x does NOT classify as LIVE-DEGENERATE", () => {
    // live deep len 10, native deep len 14 — ratio 1.4x.
    const { liveDeep, nativeDeep } = mkDegenSeqs(10, 14, 3);
    expect(nativeDeep.length / liveDeep.length).toBeCloseTo(1.4, 2);
    expect(isLiveDegenerate(liveDeep, nativeDeep)).toBe(false);
  });

  // The shape gate is non-negotiable — even at very large ratios, a live
  // sequence with at least one `markup` node OR a native sequence with zero
  // `markup` nodes must NOT classify as LIVE-DEGENERATE. The class encodes
  // "live dropped markup; native preserved it"; a live tree carrying a
  // `markup` is not degenerate-in-the-LIVE-DEGENERATE-sense.

  test("a live sequence WITH at least one `markup` does NOT classify (shape gate)", () => {
    // liveDeep includes a `markup` — degenerate-live signature broken even at
    // a huge ratio.
    const liveDeep = ["markup", "text"];
    const nativeDeep = new Array(20).fill("markup");
    expect(nativeDeep.length / liveDeep.length).toBe(10);
    expect(isLiveDegenerate(liveDeep, nativeDeep)).toBe(false);
  });

  test("a native sequence with zero `markup` nodes does NOT classify (shape gate)", () => {
    // nativeDeep has no `markup` at all — the native side is not the
    // substantial-markup-tree the class encodes.
    const liveDeep = ["text"];
    const nativeDeep = new Array(20).fill("text");
    expect(isLiveDegenerate(liveDeep, nativeDeep)).toBe(false);
  });

  test("empty deep sequences do NOT classify (shape gate)", () => {
    expect(isLiveDegenerate([], [])).toBe(false);
    expect(isLiveDegenerate([], ["markup"])).toBe(false);
  });
});

describe("dual-pipeline-canary — classifyDivergence absorbs surveyed GAP-NEB shapes via the relaxed guard", () => {
  // End-to-end: build synthetic FileASTs whose recursive node-kind sequences
  // reproduce the surveyed `gauntlet-r11-zig-buildconfig` and `tailwind-
  // prose-coverage` shapes (liveDeep length 7 / 6, nativeDeep length 13 / 15
  // — ratios 1.86 and 2.50). With the 1.5x guard these flow through the
  // LIVE-DEGENERATE branch (explained: true). With the prior 3.0x guard
  // they would have flowed through to GAP-native-extra-block (explained:
  // false). This locks the absorption against silent re-regression.

  function fakeFileASTWithDeep(nodes) {
    return {
      nodes,
      imports: [],
      exports: [],
      components: [],
      typeDecls: [],
      machineDecls: [],
      channelDecls: [],
      hasProgramRoot: true,
    };
  }

  test("zig-buildconfig-shape (1.86x ratio, liveMarkup=0, nativeMarkup>=1) — isLiveDegenerate fires", () => {
    // liveDeep length 7 (no markup), nativeDeep length 13 (>=1 markup).
    // We test the predicate directly here — the full classifyDivergence call
    // would need a matching source string which is what the corpus harness
    // covers.
    const liveDeep = ["comment", "comment", "comment", "comment", "comment", "comment", "text"];
    const nativeDeep = [
      "comment", "comment", "comment", "comment", "comment", "comment", "text",
      "markup", "text", "logic", "text", "logic", "text",
    ];
    expect(liveDeep.length).toBe(7);
    expect(nativeDeep.length).toBe(13);
    expect(isLiveDegenerate(liveDeep, nativeDeep)).toBe(true);
  });

  test("tailwind-prose-coverage-shape (2.50x ratio, liveMarkup=0, nativeMarkup=4) — isLiveDegenerate fires", () => {
    // liveDeep length 6 (no markup), nativeDeep length 15 (4 markup nodes:
    // article, h1, p, code).
    const liveDeep = ["comment", "comment", "comment", "comment", "comment", "text"];
    const nativeDeep = [
      "comment", "comment", "comment", "comment", "comment", "text",
      "markup", "text", "markup", "text", "text", "markup", "text", "markup", "text",
    ];
    expect(liveDeep.length).toBe(6);
    expect(nativeDeep.length).toBe(15);
    expect(isLiveDegenerate(liveDeep, nativeDeep)).toBe(true);
  });

  test("a small genuine non-`<program>` file (live and native within 1.4x — below the guard) does NOT mis-classify", () => {
    // The defense-in-depth case: a small component-only file where live and
    // native agree at comparable size; the guard must NOT classify it.
    const liveDeep = ["text", "text", "text", "text", "text"];
    const nativeDeep = ["markup", "text", "text", "text", "text", "text", "text"];
    expect(nativeDeep.length / liveDeep.length).toBeCloseTo(1.4, 2);
    expect(isLiveDegenerate(liveDeep, nativeDeep)).toBe(false);
  });
});
