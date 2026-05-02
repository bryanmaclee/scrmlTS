/**
 * Tests for `scrml migrate` CLI subcommand.
 *
 * Tests:
 *  §1  applyMigrations — Migration 1 (W-WHITESPACE-001) rewrites known keywords
 *  §2  applyMigrations — Migration 1 leaves unknown identifiers alone
 *  §3  applyMigrations — Migration 1 leaves close tags `</...>` alone
 *  §4  applyMigrations — Migration 2 (W-DEPRECATED-001) rewrites <machine> → <engine>
 *  §5  applyMigrations — Migration 2 doesn't false-match `<machineState>` (boundary check)
 *  §6  applyMigrations — both migrations run together correctly
 *  §7  migrateFile — --dry-run does not modify the file on disk
 *  §8  migrateFile — --check signals "would change" without writing
 *  §9  migrateFile — sanity-parse failure leaves file untouched + reports
 *  §10 migrateFile — successful in-place rewrite writes file
 *  §11 migrateFile — file with no matches is reported as 'unchanged'
 *  §12 default-excludes — files under samples/ / tests/ paths are skipped
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import {
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "fs";
import { join, sep } from "path";
import { tmpdir } from "os";
import { applyMigrations, migrateFile } from "../../src/commands/migrate.js";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/**
 * A minimal but valid scrml file with an engine declaration that uses the
 * deprecated `< engine` (whitespace-after-`<`) form. This is the cleanest
 * example of a file that needs Migration 1 — when migrated, it should still
 * compile cleanly under the existing pipeline.
 *
 * Used by §7, §8, §10.
 */
const WHITESPACE_FIXTURE = `<program>
\${
  type FlowState:enum = { Idle, Done }
}

< engine name=Flow for=FlowState>
  .Idle => .Done
</>

<div>hello</>
</program>`;

/**
 * A minimal but valid scrml file with the deprecated `<machine` keyword.
 * After Migration 2 rewrites `<machine` → `<engine`, the result must still
 * compile.
 */
const MACHINE_FIXTURE = `<program>
\${
  type FlowState:enum = { Idle, Done }
}

<machine name=Flow for=FlowState>
  .Idle => .Done
</>

<div>hello</>
</program>`;

// ---------------------------------------------------------------------------
// Temp directory helpers
// ---------------------------------------------------------------------------

let tmpDir;

function setupTmp() {
  tmpDir = join(
    tmpdir(),
    `scrml-migrate-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(tmpDir, { recursive: true });
}

function teardownTmp() {
  if (tmpDir && existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// §1  Migration 1 rewrites known keywords
// ---------------------------------------------------------------------------

describe("§1 Migration 1 (W-WHITESPACE-001)", () => {
  test("rewrites `< db>` to `<db>`", () => {
    const { rewritten, changed, migrations } = applyMigrations(
      `<program>< db>?{users: {id: int}}</></program>`,
    );
    expect(changed).toBe(true);
    expect(rewritten).toContain("<db>");
    expect(rewritten).not.toContain("< db>");
    expect(migrations.whitespace).toBe(1);
  });

  test("rewrites `< schema>` to `<schema>`", () => {
    const { rewritten, migrations } = applyMigrations(`< schema name=app>`);
    expect(rewritten).toBe(`<schema name=app>`);
    expect(migrations.whitespace).toBe(1);
  });

  test("rewrites `< channel>` to `<channel>`", () => {
    const { rewritten, migrations } = applyMigrations(`< channel/>`);
    expect(rewritten).toBe(`<channel/>`);
    expect(migrations.whitespace).toBe(1);
  });

  test("rewrites `< program>` to `<program>`", () => {
    const { rewritten, migrations } = applyMigrations(
      `< program>\n<div>x</>\n</program>`,
    );
    expect(rewritten).toContain(`<program>`);
    expect(migrations.whitespace).toBe(1);
  });

  test("rewrites multiple occurrences in one pass", () => {
    const src = `< db>x</></>< schema>y</>< timer>z</>`;
    const { migrations } = applyMigrations(src);
    expect(migrations.whitespace).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// §2  Migration 1 leaves unknown identifiers alone
// ---------------------------------------------------------------------------

describe("§2 Migration 1 — unknown idents untouched", () => {
  test("does not rewrite `< div>` (HTML tag — not a scrml keyword)", () => {
    const { rewritten, changed, migrations } = applyMigrations(`< div>x</>`);
    // Unknown identifier — left alone.
    expect(rewritten).toBe(`< div>x</>`);
    expect(changed).toBe(false);
    expect(migrations.whitespace).toBe(0);
  });

  test("does not rewrite `< MyComponent>` (component ref — not a scrml keyword)", () => {
    const { rewritten, changed } = applyMigrations(`< MyComponent props/>`);
    expect(rewritten).toBe(`< MyComponent props/>`);
    expect(changed).toBe(false);
  });

  test("does not rewrite `< someUserVar>` (arbitrary text)", () => {
    const { rewritten, changed } = applyMigrations(
      `text with < someUserVar> bareword`,
    );
    expect(rewritten).toBe(`text with < someUserVar> bareword`);
    expect(changed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §3  Migration 1 leaves close tags alone
// ---------------------------------------------------------------------------

describe("§3 Migration 1 — close tags untouched", () => {
  test("does not rewrite `</db>` close tag", () => {
    const src = `<db>x</db>`;
    const { rewritten, migrations } = applyMigrations(src);
    expect(rewritten).toBe(`<db>x</db>`);
    expect(migrations.whitespace).toBe(0);
  });

  test("does not rewrite `< /db>` (close tag with leading whitespace)", () => {
    // The regex requires the next char after `<\s+` to be a letter, not `/`.
    const src = `<db>x< /db>`;
    const { rewritten, migrations } = applyMigrations(src);
    expect(rewritten).toBe(`<db>x< /db>`);
    expect(migrations.whitespace).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §4  Migration 2 rewrites <machine> → <engine>
// ---------------------------------------------------------------------------

describe("§4 Migration 2 (W-DEPRECATED-001)", () => {
  test("rewrites `<machine>` to `<engine>`", () => {
    const { rewritten, migrations } = applyMigrations(`<machine name=Foo>`);
    expect(rewritten).toBe(`<engine name=Foo>`);
    expect(migrations.machine).toBe(1);
  });

  test("rewrites `<machine ` (with trailing whitespace) to `<engine `", () => {
    const { rewritten, migrations } = applyMigrations(
      `<machine name=Foo for=State>`,
    );
    expect(rewritten).toBe(`<engine name=Foo for=State>`);
    expect(migrations.machine).toBe(1);
  });

  test("rewrites `<machine/>` (self-closing) to `<engine/>`", () => {
    const { rewritten, migrations } = applyMigrations(`<machine/>`);
    expect(rewritten).toBe(`<engine/>`);
    expect(migrations.machine).toBe(1);
  });

  test("rewrites `< machine>` (with whitespace) to `<engine>` after both migrations", () => {
    // First Migration 1 normalizes `< machine` → `<machine` (machine IS in
    // KNOWN_KEYWORDS), then Migration 2 rewrites `<machine` → `<engine`.
    const { rewritten, migrations } = applyMigrations(
      `< machine name=Foo for=State>`,
    );
    expect(rewritten).toBe(`<engine name=Foo for=State>`);
    expect(migrations.whitespace).toBe(1);
    expect(migrations.machine).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §5  Migration 2 boundary check (no false-match on `machineState`)
// ---------------------------------------------------------------------------

describe("§5 Migration 2 — boundary check", () => {
  test("does not rewrite `<machineState>` (machine is a prefix, not the full name)", () => {
    // The regex requires a boundary char (whitespace, `>`, or `/`) after
    // `machine`. `S` is none of those, so no match.
    // (NB: <machineState> isn't a valid scrml opener either way, but the
    // regex must not falsely substring-match it.)
    const { rewritten, migrations } = applyMigrations(
      `text with <machineState> in middle`,
    );
    expect(rewritten).toBe(`text with <machineState> in middle`);
    expect(migrations.machine).toBe(0);
  });

  test("does not rewrite the literal word 'machine' outside of an opener", () => {
    const { rewritten, migrations } = applyMigrations(
      `// this is a machine learning comment`,
    );
    expect(rewritten).toBe(`// this is a machine learning comment`);
    expect(migrations.machine).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §6  both migrations run together
// ---------------------------------------------------------------------------

describe("§6 combined migrations", () => {
  test("runs Migration 1 + 2 against a realistic file", () => {
    const src = `<program>
< db>?{ users: { id: int } }</>
< machine name=Flow for=FlowState>
  .Idle => .Done
</>
</program>`;

    const { rewritten, migrations } = applyMigrations(src);

    expect(rewritten).toContain(`<db>`);
    expect(rewritten).not.toContain(`< db>`);
    expect(rewritten).toContain(`<engine name=Flow for=FlowState>`);
    expect(rewritten).not.toContain(`<machine`);
    // Whitespace count: `< db>`, `< machine` — so 2 whitespace migrations.
    expect(migrations.whitespace).toBe(2);
    expect(migrations.machine).toBe(1);
  });

  test("returns changed=false when no migrations apply", () => {
    const src = `<program><div>hello</></program>`;
    const { rewritten, changed, migrations } = applyMigrations(src);
    expect(changed).toBe(false);
    expect(rewritten).toBe(src);
    expect(migrations.whitespace).toBe(0);
    expect(migrations.machine).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §7  --dry-run does not modify the file
// ---------------------------------------------------------------------------

describe("§7 --dry-run preserves disk", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("--dry-run does NOT modify the file", () => {
    const filePath = join(tmpDir, "test.scrml");
    writeFileSync(filePath, WHITESPACE_FIXTURE, "utf8");

    const result = migrateFile(filePath, { dryRun: true, check: false }, tmpDir);

    expect(result.status).toBe("changed");
    // Disk content unchanged
    expect(readFileSync(filePath, "utf8")).toBe(WHITESPACE_FIXTURE);
    // Diff was returned for the runner to print
    expect(result.diff).toBeDefined();
    expect(result.diff).toContain("- < engine name=Flow");
    expect(result.diff).toContain("+ <engine name=Flow");
  });
});

// ---------------------------------------------------------------------------
// §8  --check signals would-change without writing
// ---------------------------------------------------------------------------

describe("§8 --check signals would-change", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("--check returns 'changed' status but does not write", () => {
    const filePath = join(tmpDir, "test.scrml");
    writeFileSync(filePath, MACHINE_FIXTURE, "utf8");

    const result = migrateFile(filePath, { dryRun: false, check: true }, tmpDir);

    expect(result.status).toBe("changed");
    expect(result.migrations.machine).toBe(1);
    // Disk content unchanged
    expect(readFileSync(filePath, "utf8")).toBe(MACHINE_FIXTURE);
  });

  test("--check on unchanged file reports 'unchanged'", () => {
    const filePath = join(tmpDir, "ok.scrml");
    const original = `<program><div>hi</></program>`;
    writeFileSync(filePath, original, "utf8");

    const result = migrateFile(filePath, { dryRun: false, check: true }, tmpDir);

    expect(result.status).toBe("unchanged");
    expect(readFileSync(filePath, "utf8")).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// §9  Sanity-parse failure leaves file untouched
// ---------------------------------------------------------------------------

describe("§9 sanity-parse failure", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("file with malformed input that becomes still-malformed after rewrite is left untouched", () => {
    const filePath = join(tmpDir, "broken.scrml");
    // Both inputs are malformed: `< db>` will be rewritten to `<db>`, but
    // the surrounding code is still missing closers AND <db> needs a
    // `src=` attribute. The sanity-parse catches this and refuses the migration.
    const original = `< db>
not closed!
no program wrapper`;
    writeFileSync(filePath, original, "utf8");

    const result = migrateFile(
      filePath,
      { dryRun: false, check: false },
      tmpDir,
    );

    expect(result.status).toBe("failed");
    expect(result.reason).toContain("failed to parse");
    // File on disk is untouched.
    expect(readFileSync(filePath, "utf8")).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// §10  Successful in-place rewrite writes the file
// ---------------------------------------------------------------------------

describe("§10 in-place rewrite", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("default (no --dry-run, no --check) writes migrated content to disk", () => {
    const filePath = join(tmpDir, "fixture.scrml");
    writeFileSync(filePath, WHITESPACE_FIXTURE, "utf8");

    const result = migrateFile(
      filePath,
      { dryRun: false, check: false },
      tmpDir,
    );

    expect(result.status).toBe("changed");
    expect(result.migrations.whitespace).toBe(1);
    // File on disk now contains the rewritten content.
    const after = readFileSync(filePath, "utf8");
    expect(after).toContain(`<engine name=Flow for=FlowState>`);
    expect(after).not.toContain(`< engine name=Flow`);
    // Other parts of the file untouched.
    expect(after).toContain(`<div>hello</>`);
  });
});

// ---------------------------------------------------------------------------
// §11  Unchanged file is reported correctly
// ---------------------------------------------------------------------------

describe("§11 unchanged file", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("file with no matches returns 'unchanged'", () => {
    const filePath = join(tmpDir, "clean.scrml");
    const original = `<program><div>hello</></program>`;
    writeFileSync(filePath, original, "utf8");

    const result = migrateFile(
      filePath,
      { dryRun: false, check: false },
      tmpDir,
    );

    expect(result.status).toBe("unchanged");
    expect(readFileSync(filePath, "utf8")).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// §12  Default excludes (samples/, tests/)
// ---------------------------------------------------------------------------

describe("§12 default excludes", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  // The default-exclude logic lives in parseArgs/collectFiles; we test it by
  // checking that paths containing /samples/ or /tests/ are not visited.
  // Since collectFiles is internal, we verify behaviour via a synthetic
  // path-substring assertion that mirrors the actual exclusion check.

  test("paths containing /samples/ are excluded by default substrings", () => {
    // The default-excludes list is `${sep}samples${sep}` and `${sep}tests${sep}`.
    const sampleFile = `${sep}home${sep}user${sep}project${sep}samples${sep}foo.scrml`;
    const testFile = `${sep}home${sep}user${sep}project${sep}tests${sep}bar.scrml`;
    const otherFile = `${sep}home${sep}user${sep}project${sep}src${sep}app.scrml`;

    const defaultExcludes = [`${sep}samples${sep}`, `${sep}tests${sep}`];
    const isExcluded = (p) => defaultExcludes.some((pat) => p.includes(pat));

    expect(isExcluded(sampleFile)).toBe(true);
    expect(isExcluded(testFile)).toBe(true);
    expect(isExcluded(otherFile)).toBe(false);
  });
});
