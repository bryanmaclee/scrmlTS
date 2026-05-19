/**
 * bug-4-docs-mode-escape.test.js — Bug 4 C-narrow implementation: locus gate
 * on `?{` recognition per SPEC §3.1 + §8.1.
 *
 * S108 close per deep-dive at `scrml-support/docs/deep-dives/bug-4-docs-mode-escape-2026-05-19.md`.
 *
 * Pre-S108: BS recognized `?{` as a SQL opener at markup-text level too —
 * adopters writing scrml-about-scrml docs prose hit a catastrophic failure
 * mode where bare `?{` ate the rest of the file as SQL (EOF-cascade). 86%
 * of adopter pages (83 of 96) already used entity-escape workarounds.
 *
 * Post-S108 (C-narrow): `?{` is a SQL opener ONLY in Logic context.
 *   - `?{...}` inside `${...}` → opens SQL (Logic-parent path; canonical §3.1)
 *   - `?{...}` in markup-text body → text + orphan-brace machinery; no SQL
 *   - `?{...}` at bare top-level → text + orphan-brace; no SQL
 *
 * The `<pre>` / `<code>` raw-content S101 mechanism continues to work as
 * before — it was already inert for `?{` at S101.
 *
 * Coverage:
 *   §1  dogfood prose case — `<p>The ?{ context opens SQL</p>` produces text + orphan, no cascade
 *   §2  legitimate path — `${ const rows = ?{ ... } }` still opens SQL inside logic
 *   §3  S101 regression — `<pre><code>?{ ... }</code></pre>` still inert (raw-content)
 *   §4  cascade prevention — bare `?{` no longer eats the rest of the file
 *   §5  attribute-value safety — `<div data-x="?{ }">` still inert (quoted attr)
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";

function split(src) {
  return splitBlocks("/tmp/test.scrml", src);
}

// ---------------------------------------------------------------------------
// §1: Dogfood prose case
// ---------------------------------------------------------------------------

describe("§1: dogfood prose case — `?{` in markup body is not a SQL opener", () => {
  test("`<p>The ?{ context opens SQL</p>` produces no SQL block + a clean error", () => {
    const { blocks, errors } = split("<p>The ?{ context opens SQL</p>");
    // No SQL block emitted anywhere in the tree (the load-bearing assertion).
    function findSql(nodes) {
      if (!nodes) return null;
      if (!Array.isArray(nodes)) {
        if (nodes.type === "sql") return nodes;
        return findSql(nodes.children);
      }
      for (const n of nodes) {
        const found = findSql(n);
        if (found) return found;
      }
      return null;
    }
    expect(findSql(blocks)).toBeNull();
    // The error surface points at the unclosed-brace / unclosed-element
    // pattern rather than the pre-S108 SQL-EOF-cascade. Just verify some
    // error fired — adopters get diagnostic friction at the right spot.
    expect(errors.length).toBeGreaterThan(0);
  });

  test("`?{` followed by balanced `}` in prose is benign — no SQL block emitted", () => {
    const { blocks } = split("<p>Use ?{ } in prose to denote SQL syntax (note the escape).</p>");
    const sqlBlocks = blocks.filter((b) => b.type === "sql");
    expect(sqlBlocks).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §2: Legitimate Logic-parent path still works
// ---------------------------------------------------------------------------

describe("§2: Logic-parent path — `?{` inside `${...}` still opens SQL", () => {
  test("`${ const rows = ?{ SELECT 1 } }` parses with SQL child of Logic", () => {
    const { blocks } = split("${ const rows = ?{ SELECT 1 } }");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("logic");
    const sqlChild = blocks[0].children.find((c) => c.type === "sql");
    expect(sqlChild).toBeDefined();
    expect(sqlChild.raw).toBe("?{ SELECT 1 }");
  });

  test("`${ ?{ SELECT 1 } }` (no surrounding text) — SQL child still detected", () => {
    const { blocks } = split("${ ?{ SELECT 1 } }");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("logic");
    expect(blocks[0].children.find((c) => c.type === "sql")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §3: S101 raw-content regression
// ---------------------------------------------------------------------------

describe("§3: S101 raw-content — `<pre>` and `<code>` continue to suppress `?{`", () => {
  test("`<pre><code>?{ SELECT 1 }</code></pre>` produces no SQL child", () => {
    const src = "<pre><code>?{ SELECT 1 }</code></pre>";
    const { blocks } = split(src);
    // Tree-walk to find any sql block anywhere
    function findSql(b) {
      if (!b) return null;
      if (b.type === "sql") return b;
      if (Array.isArray(b.children)) {
        for (const c of b.children) {
          const found = findSql(c);
          if (found) return found;
        }
      }
      return null;
    }
    for (const b of blocks) {
      expect(findSql(b)).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// §4: Cascade prevention
// ---------------------------------------------------------------------------

describe("§4: cascade prevention — bare `?{` no longer opens SQL-to-EOF cascade", () => {
  test("balanced `?{...}` in prose — no SQL block + markup intact", () => {
    // Balanced braces inside prose flow through the orphan-brace machinery
    // (the `{` from `?{` increments depth, the matching `}` decrements).
    // The markup parses normally; no SQL block emitted.
    const src = `<article>
  <p>Use ?{} or ?&#123;&#125; to denote SQL syntax inline.</p>
  <p>Another paragraph.</p>
</article>`;
    const { blocks } = split(src);
    const article = blocks.find((b) => b.type === "markup" && b.name === "article");
    expect(article).toBeDefined();
    // No SQL block anywhere in the tree
    function findSql(b) {
      if (!b) return null;
      if (b.type === "sql") return b;
      if (Array.isArray(b.children)) {
        for (const c of b.children) {
          const found = findSql(c);
          if (found) return found;
        }
      }
      return null;
    }
    expect(findSql(article)).toBeNull();
  });

  test("unbalanced `?{` (dogfood worst case) — cleaner error, no SQL block, no EOF cascade", () => {
    // Per the deep-dive at §"Loses": "Unbalanced `?{` alone (the dogfood
    // repro's worst case) still produces an error — but a *different*
    // error (orphan-brace unclosed at EOF), with a cleaner pointer."
    //
    // Pre-S108: catastrophic — `?{` opens SQL context, eats everything
    // to EOF including the `</article>` closer, cascade of false errors.
    // Post-S108: orphan-brace + unclosed-element errors that point at the
    // ACTUAL source position of the `?{`.
    const src = `<article>
  <p>Discussing ?{ syntax for SQL.</p>
  <p>Another paragraph.</p>
</article>`;
    const { blocks, errors } = split(src);
    // No SQL block in the AST
    function findSql(nodes) {
      if (!nodes) return null;
      if (!Array.isArray(nodes)) {
        if (nodes.type === "sql") return nodes;
        return findSql(nodes.children);
      }
      for (const n of nodes) {
        const found = findSql(n);
        if (found) return found;
      }
      return null;
    }
    expect(findSql(blocks)).toBeNull();
    // Cleaner error surface — E-CTX-003 unclosed-element rather than
    // the SQL EOF-cascade. Just verify some error fired (the orphan-brace
    // makes `</p>` get treated as text per the S93 Bug 3-adjacent gate,
    // which leaves `<p>` unclosed and `<article>` unclosed at EOF).
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.code === "E-CTX-003")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §5: Attribute value safety (regression — already inert per quoted-string handling)
// ---------------------------------------------------------------------------

describe("§5: attribute-value safety — `?{` in quoted attr value still inert", () => {
  test("`<div data-x=\"?{ }\">` produces no SQL block (quoted attr value path)", () => {
    const { blocks } = split('<div data-x="?{ }">content</div>');
    function findSql(b) {
      if (!b) return null;
      if (b.type === "sql") return b;
      if (Array.isArray(b.children)) {
        for (const c of b.children) {
          const found = findSql(c);
          if (found) return found;
        }
      }
      return null;
    }
    for (const b of blocks) {
      expect(findSql(b)).toBeNull();
    }
  });
});
