/**
 * S98 — W-LINT-024 Svelte `$store` auto-subscribe prefix inside `${...}`
 * markup-interp.
 *
 * S97 hand-off recorded this as the ONLY remaining `generic-error` in the
 * brute-force stress harness — every other framework-syntax-in-scrml ghost
 * produced a specific lint, but Svelte's `$store` auto-subscribe was
 * generic-error-fallback-only. This test suite pins the approach (a) fix:
 * detect `$ident` inside `${...}` markup-interp slots; surface specific
 * scrml alternatives (canonical `@cell` for reactive cells, `.subscribe()`
 * for explicit store objects).
 *
 * Skip conditions covered:
 *   - Outside `${...}`: not Svelte-ghost context (narrowly scoped to
 *     markup-interpolation per approach (a)).
 *   - Inside a string literal: `"$store"` is literal text, not a ghost.
 *   - Inside a `//` comment: documentation about Svelte syntax.
 *   - Preceded by `\` (escape): adopter opt-out.
 *
 * Future-extension hooks (NOT in this PR — gated on friction signals):
 *   - (b) follow `.subscribe(` call form to catch API-shape ghosts.
 *   - (c) scope-aware later-stage detection for highest accuracy.
 *
 * SPEC authority:
 *   - §6 (state declarations)
 *   - §6.1 (V5-strict access — `@cell` is the canonical reactive sigil)
 */

import { describe, test, expect } from "bun:test";
import { lintGhostPatterns } from "../../src/lint-ghost-patterns.js";

function lintCodes(src) {
  return lintGhostPatterns(src).map((d) => d.code);
}

function lintDiags(src) {
  return lintGhostPatterns(src);
}

describe("§1 — W-LINT-024 fires on `$ident` inside `${...}` markup-interp", () => {
  test("§1.1 ${ $count } in markup fires W-LINT-024", () => {
    const src = `<program><p>\${ $count }</p></program>`;
    expect(lintCodes(src)).toContain("W-LINT-024");
  });

  test("§1.2 ${$store} (no whitespace) fires", () => {
    const src = `<program><span>\${$store}</span></program>`;
    expect(lintCodes(src)).toContain("W-LINT-024");
  });

  test("§1.3 ${ $user.name } compound access still fires (matches at the `$`)", () => {
    const src = `<program><h1>\${ $user.name }</h1></program>`;
    expect(lintCodes(src)).toContain("W-LINT-024");
  });

  test("§1.4 ${ $_private } underscore-leading identifier fires", () => {
    const src = `<program><p>\${ $_private }</p></program>`;
    expect(lintCodes(src)).toContain("W-LINT-024");
  });

  test("§1.5 diagnostic shape — message + correction + code are sane", () => {
    const src = `<program><p>\${ $count }</p></program>`;
    const diag = lintDiags(src).find((d) => d.code === "W-LINT-024");
    expect(diag).toBeDefined();
    expect(diag.severity).toBe("warning");
    expect(diag.ghost).toMatch(/store/i);
    expect(diag.correction).toMatch(/@cell|@count/);
    expect(diag.line).toBeGreaterThan(0);
    expect(diag.column).toBeGreaterThan(0);
  });
});

describe("§2 — anti-cases: canonical scrml does NOT fire W-LINT-024", () => {
  test("§2.1 ${ count } (no `$`) does not fire", () => {
    const src = `<program><p>\${ count }</p></program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-024");
  });

  test("§2.2 ${ @count } canonical scrml reactive read does NOT fire", () => {
    const src = `<program><p>\${ @count }</p></program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-024");
  });

  test("§2.3 ${ @user.name } compound reactive read does NOT fire", () => {
    const src = `<program><p>\${ @user.name }</p></program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-024");
  });

  test("§2.4 `$count` OUTSIDE `${...}` does NOT fire (narrowly scoped)", () => {
    // Bare `$count` in markup-text position is not a Svelte ghost in the
    // approach-(a) interpretation — Svelte's auto-subscribe specifically
    // lives inside its `{...}` (== scrml's `${...}`) interp slot.
    const src = `<program><p>$count is literal text</p></program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-024");
  });

  test("§2.5 the `${` interpolation opener itself does NOT fire (the `$` is followed by `{`)", () => {
    const src = `<program><p>\${ x }</p></program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-024");
  });
});

describe("§3 — skip conditions per the brief", () => {
  test("§3.1 ${ \\$count } (escaped `$`) does NOT fire", () => {
    // Negative lookbehind in the regex rejects `\$`.
    const src = `<program><p>\${ \\$count }</p></program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-024");
  });

  test('§3.2 string literal inside ${} containing "$store" does NOT fire (string-context-aware)', () => {
    const src = `<program><p>\${ "the $store pattern" }</p></program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-024");
  });

  test("§3.3 single-quoted string literal containing '$store' does NOT fire", () => {
    const src = `<program><p>\${ 'the $store pattern' }</p></program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-024");
  });

  test("§3.4 line-comment `// $store ...` does NOT fire", () => {
    const src = `<program>
// In Svelte, $store auto-subscribes — scrml has no equivalent.
<p>\${ @count }</p>
</program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-024");
  });
});

describe("§4 — cross-fire prevention", () => {
  test("§4.1 W-LINT-024 fire does not also trip Vue/Angular/TS lints", () => {
    const src = `<program><p>\${ $count }</p></program>`;
    const codes = lintCodes(src);
    expect(codes).toContain("W-LINT-024");
    expect(codes).not.toContain("W-LINT-020"); // Vue {{}}
    expect(codes).not.toContain("W-LINT-021"); // Angular
    expect(codes).not.toContain("W-LINT-022"); // TS types
    expect(codes).not.toContain("W-LINT-023"); // React Fragment
  });

  test("§4.2 multiple `$ident` reads in one `${...}` each fire", () => {
    const src = `<program><p>\${ $count + $total }</p></program>`;
    const w24Count = lintCodes(src).filter((c) => c === "W-LINT-024").length;
    expect(w24Count).toBe(2);
  });
});
