/**
 * pgo-c2-markup-forstmt-fold.test.js — PGO Phase 3 follow-up C2 (S108).
 *
 * Sibling pattern to:
 *   - S102 hasResetExpr (compiler/tests/... — exercised via end-to-end compile)
 *   - S106 hasEqualityExpr (compiler/tests/unit/has-equality-expr-flag.test.js)
 *
 * Tests that `detectMarkupForStmtChunkPresence` in `compiler/src/ast-builder.js`:
 *   - Returns `{ hasChunkedMarkupTag: true, ... }` when the file has any markup
 *     tag in {timer, poll, timeout, keyboard, mouse, gamepad}.
 *   - Returns `{ hasChunkedMarkupTag: false, ... }` when no such markup tags
 *     exist (tree-shake).
 *   - Returns `{ hasForStmt: true, ... }` when the file has any for-stmt node.
 *   - Returns `{ hasForStmt: false, ... }` when no for-stmt exists (tree-shake).
 *   - Both flags fire independently and coexist correctly.
 *   - Sentinel short-circuit fires when BOTH flags are true.
 *   - Cross-feature regression: hasResetExpr + hasEqualityExpr + new flags all
 *     coexist without interference.
 *
 * Coverage:
 *   §1  File with no markup chunk tags + no for-stmt → both flags false
 *   §2  File with markup chunk tag only (timer/poll/timeout) → hasChunkedMarkupTag true
 *   §3  File with markup chunk tag only (keyboard/mouse/gamepad) → hasChunkedMarkupTag true
 *   §4  File with for-stmt only → hasForStmt true
 *   §5  File with both → both flags true (sentinel short-circuit path)
 *   §6  Non-chunked markup tags (div, span, p, etc.) → hasChunkedMarkupTag false
 *   §7  <channel> markup is NOT a chunked tag → hasChunkedMarkupTag false
 *   §8  Nested for-stmt inside markup → hasForStmt true
 *   §9  Nested chunked markup inside compound → hasChunkedMarkupTag true
 *   §10 Cross-feature coexistence: reset + equality + markup + for-stmt all flags
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function compileToAST(source) {
  const filePath = "/test/pgo-c2-markup-forstmt-fold.scrml";
  const blocks = splitBlocks(filePath, source);
  return buildAST(blocks);
}

describe("§1 PGO C2 — neither markup chunk tag nor for-stmt → both flags false (tree-shake)", () => {
  test("empty source", () => {
    const out = compileToAST("");
    expect(out.ast.hasChunkedMarkupTag).toBe(false);
    expect(out.ast.hasForStmt).toBe(false);
  });

  test("logic-only file with no for-stmt", () => {
    const out = compileToAST(`\${
@x = 0
@y = @x + 1
function noop() { @x = @x + 1 }
}`);
    expect(out.ast.hasChunkedMarkupTag).toBe(false);
    expect(out.ast.hasForStmt).toBe(false);
  });

  test("plain markup with no chunked tags", () => {
    const out = compileToAST(`<div><p>Hello</p><span>World</span></div>`);
    expect(out.ast.hasChunkedMarkupTag).toBe(false);
    expect(out.ast.hasForStmt).toBe(false);
  });
});

describe("§2 PGO C2 — chunked markup tag (timer/poll/timeout) only → hasChunkedMarkupTag true", () => {
  test("<timer> at top level", () => {
    const out = compileToAST(`<timer every=1000><div>tick</div></timer>`);
    expect(out.ast.hasChunkedMarkupTag).toBe(true);
    expect(out.ast.hasForStmt).toBe(false);
  });

  test("<poll> at top level", () => {
    const out = compileToAST(`<poll every=2000><div>poll</div></poll>`);
    expect(out.ast.hasChunkedMarkupTag).toBe(true);
    expect(out.ast.hasForStmt).toBe(false);
  });

  test("<timeout> at top level", () => {
    const out = compileToAST(`<timeout after=5000><div>delayed</div></timeout>`);
    expect(out.ast.hasChunkedMarkupTag).toBe(true);
    expect(out.ast.hasForStmt).toBe(false);
  });
});

describe("§3 PGO C2 — chunked markup tag (keyboard/mouse/gamepad) only → hasChunkedMarkupTag true", () => {
  test("<keyboard> at top level", () => {
    const out = compileToAST(`<keyboard><div>input</div></keyboard>`);
    expect(out.ast.hasChunkedMarkupTag).toBe(true);
    expect(out.ast.hasForStmt).toBe(false);
  });

  test("<mouse> at top level", () => {
    const out = compileToAST(`<mouse><div>cursor</div></mouse>`);
    expect(out.ast.hasChunkedMarkupTag).toBe(true);
    expect(out.ast.hasForStmt).toBe(false);
  });

  test("<gamepad> at top level", () => {
    const out = compileToAST(`<gamepad><div>controller</div></gamepad>`);
    expect(out.ast.hasChunkedMarkupTag).toBe(true);
    expect(out.ast.hasForStmt).toBe(false);
  });
});

describe("§4 PGO C2 — for-stmt only → hasForStmt true", () => {
  test("simple for-stmt at top level", () => {
    const out = compileToAST(`\${
@items = [1, 2, 3]
for (let x of @items) { @x = x }
}`);
    expect(out.ast.hasChunkedMarkupTag).toBe(false);
    expect(out.ast.hasForStmt).toBe(true);
  });

  test("for-stmt with non-reactive iter — flag still fires (conservative)", () => {
    const out = compileToAST(`\${
const arr = [1, 2, 3]
for (let x of arr) { /* non-reactive */ }
}`);
    expect(out.ast.hasChunkedMarkupTag).toBe(false);
    expect(out.ast.hasForStmt).toBe(true);
  });

  test("for-stmt inside function body", () => {
    const out = compileToAST(`\${
function loop() {
  const items = [1, 2, 3]
  for (let x of items) {
    /* body */
  }
}
}`);
    expect(out.ast.hasChunkedMarkupTag).toBe(false);
    expect(out.ast.hasForStmt).toBe(true);
  });
});

describe("§5 PGO C2 — both chunked markup tag AND for-stmt → both flags true (sentinel short-circuit)", () => {
  test("file with <timer> + for-stmt in distinct top-level locations", () => {
    const out = compileToAST(`\${
@items = [1, 2, 3]
for (let x of @items) { @x = x }
}
<timer every=1000><div>tick</div></timer>`);
    expect(out.ast.hasChunkedMarkupTag).toBe(true);
    expect(out.ast.hasForStmt).toBe(true);
  });

  test("file with <keyboard> + for-stmt inside the same logic", () => {
    const out = compileToAST(`\${
@list = ["a", "b"]
function handle() {
  for (let item of @list) { @list = @list }
}
}
<keyboard><div>keys</div></keyboard>`);
    expect(out.ast.hasChunkedMarkupTag).toBe(true);
    expect(out.ast.hasForStmt).toBe(true);
  });
});

describe("§6 PGO C2 — non-chunked markup tags don't fire hasChunkedMarkupTag", () => {
  test("only div/span/p/section", () => {
    const out = compileToAST(`<section><div><p>x</p><span>y</span></div></section>`);
    expect(out.ast.hasChunkedMarkupTag).toBe(false);
    expect(out.ast.hasForStmt).toBe(false);
  });

  test("native HTML form elements", () => {
    const out = compileToAST(`<form><input/><button>Go</button><textarea></textarea></form>`);
    expect(out.ast.hasChunkedMarkupTag).toBe(false);
    expect(out.ast.hasForStmt).toBe(false);
  });
});

describe("§7 PGO C2 — <channel> markup is NOT a chunked tag (per emit-client comment, inline WebSocket code)", () => {
  test("only <channel>", () => {
    const out = compileToAST(`\${
@chan = "/ws"
}
<channel name="msg" url=@chan />`);
    // Per case "markup" in emit-client.ts:638-641, <channel> is no-op for chunks.
    // The TAB-time walker must NOT include "channel" in CHUNKED_MARKUP_TAGS,
    // otherwise tree-shake of pure-channel files would miss the optimization.
    expect(out.ast.hasChunkedMarkupTag).toBe(false);
    expect(out.ast.hasForStmt).toBe(false);
  });
});

describe("§8 PGO C2 — chunked markup deep inside compound structures still fires", () => {
  test("<timer> deep inside nested <div>", () => {
    const out = compileToAST(`<div><div><div><div><timer every=1000><span>tick</span></timer></div></div></div></div>`);
    expect(out.ast.hasChunkedMarkupTag).toBe(true);
    expect(out.ast.hasForStmt).toBe(false);
  });

  test("for-stmt deep inside nested function body", () => {
    const out = compileToAST(`\${
function outer() {
  function inner() {
    function deepest() {
      const items = [1, 2, 3]
      for (let x of items) { /* deepest */ }
    }
  }
}
}`);
    expect(out.ast.hasChunkedMarkupTag).toBe(false);
    expect(out.ast.hasForStmt).toBe(true);
  });
});

describe("§9 PGO C2 — cross-feature coexistence with hasResetExpr + hasEqualityExpr", () => {
  test("file with reset + equality + chunked markup + for-stmt — all four flags fire", () => {
    const out = compileToAST(`\${
@x = 0
@items = [1, 2, 3]
function check() {
  if (@x == 0) { reset(@x) }
  for (let item of @items) { @x = item }
}
}
<timer every=1000><div>tick</div></timer>`);
    expect(out.ast.hasResetExpr).toBe(true);
    expect(out.ast.hasEqualityExpr).toBe(true);
    expect(out.ast.hasChunkedMarkupTag).toBe(true);
    expect(out.ast.hasForStmt).toBe(true);
  });

  test("file with only chunked markup — other flags stay false", () => {
    const out = compileToAST(`<keyboard><div>input</div></keyboard>`);
    expect(out.ast.hasResetExpr).toBe(false);
    expect(out.ast.hasEqualityExpr).toBe(false);
    expect(out.ast.hasChunkedMarkupTag).toBe(true);
    expect(out.ast.hasForStmt).toBe(false);
  });

  test("file with only for-stmt — other flags stay false", () => {
    const out = compileToAST(`\${
const arr = [1, 2, 3]
for (let x of arr) { }
}`);
    expect(out.ast.hasResetExpr).toBe(false);
    expect(out.ast.hasEqualityExpr).toBe(false);
    expect(out.ast.hasChunkedMarkupTag).toBe(false);
    expect(out.ast.hasForStmt).toBe(true);
  });

  test("file with only equality op — markup/forStmt stay false", () => {
    const out = compileToAST(`\${
@x = 5
const <isFive> = @x == 5
}`);
    expect(out.ast.hasResetExpr).toBe(false);
    expect(out.ast.hasEqualityExpr).toBe(true);
    expect(out.ast.hasChunkedMarkupTag).toBe(false);
    expect(out.ast.hasForStmt).toBe(false);
  });
});

describe("§10 PGO C2 — TAB-time flag drives detectRuntimeChunks behaviour (end-to-end probe)", () => {
  // These tests verify the OBSERVATION that the FileAST surface carries the
  // new fields so that detectRuntimeChunks consumers can read them safely.
  // The downstream chunk-set semantics are tested by existing emit-client
  // runtime-chunk tests (which all continue to pass with the C2 fold in
  // place — see the full pre-commit gate run).
  test("the new flags are emitted on every buildAST output, not just opt-in", () => {
    const out = compileToAST(`<div>hello</div>`);
    expect("hasChunkedMarkupTag" in out.ast).toBe(true);
    expect("hasForStmt" in out.ast).toBe(true);
    expect(typeof out.ast.hasChunkedMarkupTag).toBe("boolean");
    expect(typeof out.ast.hasForStmt).toBe("boolean");
  });

  test("flags are well-defined for malformed-but-parsable inputs", () => {
    const out = compileToAST(`<div/>`);
    expect(typeof out.ast.hasChunkedMarkupTag).toBe("boolean");
    expect(typeof out.ast.hasForStmt).toBe("boolean");
  });
});
