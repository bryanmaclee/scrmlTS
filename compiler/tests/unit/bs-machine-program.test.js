/**
 * fix-bs-machine-closer — Regression tests for < machine> inside <program>
 *
 * Previously, the bare `/` closer of a `< machine>` state block inside `<program>`
 * was misattributed to the outer markup frame, causing a close-tag mismatch.
 * The BS has been fixed; these tests lock in correct behavior.
 *
 * < machine> is a state block (space after `<`). Its name is "machine" and
 * it closes with a bare `/` (inferred closer). When nested inside `<program>`
 * (a markup block), the `/` must close the machine state frame — not the
 * program markup frame. The program frame is then correctly closed by `</program>`.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks, BSError } from "../../src/block-splitter.js";

describe("< machine> state block inside <program> (fix-bs-machine-closer)", () => {
  test("< machine> inside <program> produces correct block structure", () => {
    const result = splitBlocks("test.scrml", [
      "<program>",
      "< machine name=AdminFlow for=OrderStatus>",
      "    .Pending    => .Processing",
      "    .Processing => .Shipped",
      "</>",
      "</program>",
    ].join("\n"));
    expect(result.errors).toHaveLength(0);
    expect(result.blocks).toHaveLength(1);
    const prog = result.blocks[0];
    expect(prog.type).toBe("markup");
    expect(prog.name).toBe("program");
    expect(prog.closerForm).toBe("explicit");
    const machine = prog.children.find(c => c.type === "state");
    expect(machine).toBeDefined();
    expect(machine.name).toBe("machine");
    expect(machine.closerForm).toBe("inferred");
  });

  test("< machine> closer does not consume </program>", () => {
    // The machine's bare `/` must close the machine frame, not the program frame.
    // After the machine closes, </program> must still match the open <program>.
    const result = splitBlocks("test.scrml", [
      "<program>",
      "< machine name=Flow for=Status>",
      "    .A => .B",
      "</>",
      "<div>content</>",
      "</program>",
    ].join("\n"));
    expect(result.errors).toHaveLength(0);
    const prog = result.blocks[0];
    expect(prog.name).toBe("program");
    expect(prog.closerForm).toBe("explicit");
    const machine = prog.children.find(c => c.type === "state" && c.name === "machine");
    expect(machine).toBeDefined();
    expect(machine.closerForm).toBe("inferred");
    const div = prog.children.find(c => c.type === "markup" && c.name === "div");
    expect(div).toBeDefined();
  });

  test("multiple < machine> blocks inside <program> all close correctly", () => {
    const result = splitBlocks("test.scrml", [
      "<program>",
      "< machine name=UserFlow for=Status>",
      "    .A => .B",
      "</>",
      "< machine name=AdminFlow for=Status>",
      "    .A => .B",
      "    .B => .A",
      "</>",
      "</program>",
    ].join("\n"));
    expect(result.errors).toHaveLength(0);
    const prog = result.blocks[0];
    expect(prog.name).toBe("program");
    const machines = prog.children.filter(c => c.type === "state" && c.name === "machine");
    expect(machines).toHaveLength(2);
    expect(machines[0].closerForm).toBe("inferred");
    expect(machines[1].closerForm).toBe("inferred");
  });

  test("< machine> with => arrows in body does not confuse the scanner", () => {
    // The `>` in `=>` transition arrows is at markup/state level and must be
    // treated as raw text, not a tag closer.
    const result = splitBlocks("test.scrml", [
      "<program>",
      "< machine name=TrafficController for=TrafficLight>",
      "    .Red    => .Green",
      "    .Green  => .Yellow",
      "    .Yellow => .Red",
      "</>",
      "</program>",
    ].join("\n"));
    expect(result.errors).toHaveLength(0);
    const prog = result.blocks[0];
    const machine = prog.children.find(c => c.type === "state");
    expect(machine).toBeDefined();
    expect(machine.raw).toContain("=> .Green");
    expect(machine.raw).toContain("=> .Yellow");
    expect(machine.raw).toContain("=> .Red");
    expect(prog.closerForm).toBe("explicit");
  });

  test("< machine> with logic block and markup siblings inside <program>", () => {
    // Reproduction of the machine-basic.scrml pattern wrapped in <program>
    const result = splitBlocks("test.scrml", [
      "<program>",
      "${",
      "    @status = Status.Pending",
      "}",
      "< machine name=AdminFlow for=Status>",
      "    .Pending    => .Processing",
      "    .Processing => .Done",
      "</>",
      "<div>",
      "    <h1>Status</>",
      "</>",
      "</program>",
    ].join("\n"));
    expect(result.errors).toHaveLength(0);
    const prog = result.blocks[0];
    expect(prog.type).toBe("markup");
    expect(prog.name).toBe("program");
    expect(prog.closerForm).toBe("explicit");
    const machine = prog.children.find(c => c.type === "state");
    expect(machine).toBeDefined();
    expect(machine.closerForm).toBe("inferred");
    const div = prog.children.find(c => c.type === "markup" && c.name === "div");
    expect(div).toBeDefined();
  });

  test("< machine> block name is 'machine' (keyword, not machine name)", () => {
    // The BS stores the block name as the keyword "machine" (first ident after whitespace).
    // The machine's actual name (AdminFlow) and type (OrderStatus) are in the raw text,
    // parsed by the TAB/AST-builder stage, not the block splitter.
    const result = splitBlocks("test.scrml", [
      "< machine name=AdminFlow for=OrderStatus>",
      "    .Pending => .Processing",
      "</>",
    ].join("\n"));
    expect(result.errors).toHaveLength(0);
    expect(result.blocks).toHaveLength(1);
    const machine = result.blocks[0];
    expect(machine.type).toBe("state");
    expect(machine.name).toBe("machine");
    expect(machine.raw).toContain("AdminFlow");
    expect(machine.raw).toContain("for=OrderStatus");
    expect(machine.closerForm).toBe("inferred");
  });
});
