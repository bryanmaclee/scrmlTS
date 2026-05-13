/**
 * BS-layer HTML-comment skip — §27.2 markup-context native comment.
 *
 * Surfaced by S87 Wave-3 fixture-sweep dispatch. The block-splitter previously
 * did NOT skip `<!-- ... -->` HTML comments, so a literal `<program>` /
 * `</program>` (or any structural opener) inside an HTML comment was parsed
 * as a real opener/closer — corrupting the block stream.
 *
 * `//` line-comment suppression (SPEC §4.7) was already in place at all
 * context levels; HTML comments now mirror it at markup/state/root level.
 *
 * SPEC §4.7 amendment proposed: drop the "BS SHALL NOT handle <!-- -->"
 * exclusion line; replace with "BS SHALL skip <!-- ... --> at markup/state/
 * root context, mirroring //". Inside brace-delimited contexts (`${...}`,
 * `?{...}`, `#{...}`, `!{...}`, `^{...}`, `~{...}`) the sequence `<!--` is
 * NOT a comment and falls through as raw text.
 */
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";

function split(source) {
  return splitBlocks("test.scrml", source).blocks;
}

function splitWithErrors(source) {
  return splitBlocks("test.scrml", source);
}

describe("BS HTML-comment skip — §27.2 + §4.7-amend", () => {
  test("<!-- ... --> at top level produces a comment block (no tag recognition)", () => {
    const blocks = split("<!-- a simple html comment -->\n");
    expect(blocks).toHaveLength(2); // comment + trailing text/newline-text
    expect(blocks[0].type).toBe("comment");
    expect(blocks[0].raw).toBe("<!-- a simple html comment -->");
  });

  test("<!-- <program> --> does NOT open a real <program> context", () => {
    // The fake <program> inside the comment must NOT be parsed as a structural
    // opener. The result is one comment block + one real <program> block.
    const blocks = split("<!-- <program> -->\n<program></program>");
    // [comment, text(newline), program] OR [comment, program] depending on
    // text-flush behavior — assert by filtering out trailing whitespace text.
    const meaningful = blocks.filter(
      (b) => !(b.type === "text" && b.raw.trim() === "")
    );
    expect(meaningful).toHaveLength(2);
    expect(meaningful[0].type).toBe("comment");
    expect(meaningful[1].type).toBe("markup");
    expect(meaningful[1].name).toBe("program");
  });

  test("<!-- </program> --> does NOT close an open <program> context", () => {
    // Inside <program> body, the fake </program> in the HTML comment must NOT
    // pop the program frame. The trailing real </program> is what closes it.
    const blocks = split("<program><!-- </program> -->real</program>");
    expect(blocks).toHaveLength(1);
    const prog = blocks[0];
    expect(prog.type).toBe("markup");
    expect(prog.name).toBe("program");
    expect(prog.closerForm).toBe("explicit");
    // The body has [comment, text("real")] as children
    const comment = prog.children.find((c) => c.type === "comment");
    expect(comment).toBeDefined();
    expect(comment.raw).toBe("<!-- </program> -->");
  });

  test("<!-- <channel name='foo'> --> does NOT open a real <channel>", () => {
    // S87 dispatch repro shape: BS used to misparse the <channel> inside
    // an HTML comment as a real channel opener and then fail with E-CTX-001
    // when </program> tried to close the still-open <channel>.
    const result = splitWithErrors(
      "<program>\n  <!-- The user can write <channel name=\"foo\"> in their docs -->\n  <div>real</div>\n</program>"
    );
    expect(result.errors).toHaveLength(0);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].name).toBe("program");
    expect(result.blocks[0].closerForm).toBe("explicit");
  });

  test("mixed: real opener AFTER a commented-out opener", () => {
    // Validates that the comment skip does not corrupt the scanner's
    // position tracking — the real <p> after the comment must parse cleanly.
    const blocks = split("<!-- <p>fake</p> --><p>real</>");
    const meaningful = blocks.filter(
      (b) => !(b.type === "text" && b.raw.trim() === "")
    );
    expect(meaningful).toHaveLength(2);
    expect(meaningful[0].type).toBe("comment");
    expect(meaningful[1].type).toBe("markup");
    expect(meaningful[1].name).toBe("p");
    expect(meaningful[1].children[0].raw).toBe("real");
  });

  test("<!-- inside ${ ... } is NOT a comment (raw text)", () => {
    // Per scope rule: HTML-comment skip applies only at markup/state/root
    // context. Inside a logic block, `<!--` is just characters in JS source.
    // The whole `${...}` is a single logic block; no comment block appears.
    const blocks = split("${ const s = '<!-- not a comment -->'; }");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("logic");
    // No nested comment block was emitted inside the logic body.
    expect(blocks[0].children.find((c) => c.type === "comment")).toBeUndefined();
  });

  test("<!-- inside double-quoted string is NOT a comment", () => {
    // Quote-state guard: the global double-quote tracker must suppress
    // comment recognition when we're inside `"..."`.
    const blocks = split('<p title="<!-- literal -->">hi</>');
    // Should be one markup block — no spurious comment block.
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("markup");
    expect(blocks[0].name).toBe("p");
  });

  test("multi-line <!-- ... --> spans lines correctly", () => {
    // The comment scan must consume newlines until the first '-->'.
    const src = "<!-- line1\nline2\n<program>\nline3 -->\n<p>real</>";
    const result = splitWithErrors(src);
    expect(result.errors).toHaveLength(0);
    const meaningful = result.blocks.filter(
      (b) => !(b.type === "text" && b.raw.trim() === "")
    );
    expect(meaningful).toHaveLength(2);
    expect(meaningful[0].type).toBe("comment");
    expect(meaningful[0].raw).toContain("<program>");
    expect(meaningful[1].type).toBe("markup");
    expect(meaningful[1].name).toBe("p");
  });

  test("regression guard: existing // line-comment behavior unchanged", () => {
    // §4.7 `//` skip must continue to work exactly as before — the new
    // <!-- skip is additive, not a replacement.
    const blocks = split("// <program>\n<program></program>");
    const meaningful = blocks.filter(
      (b) => !(b.type === "text" && b.raw.trim() === "")
    );
    expect(meaningful).toHaveLength(2);
    expect(meaningful[0].type).toBe("comment");
    expect(meaningful[0].raw).toBe("// <program>\n");
    expect(meaningful[1].type).toBe("markup");
    expect(meaningful[1].name).toBe("program");
  });

  test("unclosed <!-- runs to EOF without throwing (best-effort recovery)", () => {
    // Mirrors `//`-at-EOF behavior: best-effort, no synthetic error.
    // Downstream stages will surface real problems if structure is broken.
    const result = splitWithErrors("<!-- unclosed comment runs to end");
    // No throw; one comment block produced.
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].type).toBe("comment");
  });
});
