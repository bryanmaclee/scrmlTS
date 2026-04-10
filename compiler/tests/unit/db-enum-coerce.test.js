import { describe, it, expect } from "bun:test";
import { rewriteEnumToEnum } from "../../src/codegen/rewrite.ts";

describe("DB-to-enum coercion — toEnum() rewrite (§14.4.3)", () => {
  it("rewrites method form: Status.toEnum(raw)", () => {
    const input = `TaskStatus.toEnum(row.status)`;
    const result = rewriteEnumToEnum(input);
    expect(result).toBe(`(TaskStatus_toEnum[row.status] ?? null)`);
  });

  it("rewrites function form: toEnum(Status, raw)", () => {
    const input = `toEnum(TaskStatus, row.status)`;
    const result = rewriteEnumToEnum(input);
    expect(result).toBe(`(TaskStatus_toEnum[row.status] ?? null)`);
  });

  it("rewrites inside .map() — the DB idiom", () => {
    const input = `rows.map(row => ({ ...row, status: TaskStatus.toEnum(row.status) ?? row.status }))`;
    const result = rewriteEnumToEnum(input);
    expect(result).toContain(`(TaskStatus_toEnum[row.status] ?? null)`);
    expect(result).toContain(`?? row.status`);
  });

  it("rewrites multiple enum fields in one expression", () => {
    const input = `({ priority: Priority.toEnum(row.priority), status: Status.toEnum(row.status) })`;
    const result = rewriteEnumToEnum(input);
    expect(result).toContain(`(Priority_toEnum[row.priority] ?? null)`);
    expect(result).toContain(`(Status_toEnum[row.status] ?? null)`);
  });

  it("passes through non-toEnum expressions unchanged", () => {
    const input = `TaskStatus.Todo`;
    const result = rewriteEnumToEnum(input);
    expect(result).toBe(`TaskStatus.Todo`);
  });

  it("handles whitespace variations", () => {
    const input = `TaskStatus . toEnum( row.status )`;
    const result = rewriteEnumToEnum(input);
    expect(result).toBe(`(TaskStatus_toEnum[row.status] ?? null)`);
  });
});
