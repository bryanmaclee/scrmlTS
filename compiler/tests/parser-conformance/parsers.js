/**
 * Parser comparator interface — acorn (oracle) vs scrml-native (stub pre-M1).
 *
 * Per scrml-native-parser-design-2026-05-17.md §D6:
 *   "A driver that walks the corpus, runs both parsers, normalizes output
 *    (strip spans for Tier 1+2, keep for Tier 3), and diffs."
 *
 * Pre-M1: the scrml-native parser does not exist. The stub returns acorn's
 * output verbatim so the harness can prove its own correctness (Tier 1+2
 * trivially pass on every corpus file). Post-M1 the stub is replaced by
 * the real native lexer+parser per §D7-M1 and the test begins gating real
 * conformance.
 *
 * @typedef {object} ParseOpts
 * @property {("expression"|"statements")} [mode="statements"] — Acorn entry surface
 * @property {number} [ecmaVersion=2025]
 * @property {("module"|"script")} [sourceType="module"]
 * @property {boolean} [allowAwaitOutsideFunction=true]
 * @property {boolean} [allowReturnOutsideFunction=true]
 *
 * @typedef {object} ParseOutput
 * @property {object|null} ast — ESTree-ish AST (acorn shape) or null on failure
 * @property {string|null} error — error message on failure, else null
 *
 * @typedef {object} Parser
 * @property {string} name — "acorn" | "scrml-native"
 * @property {(source: string, opts?: ParseOpts) => ParseOutput} parse
 */

// @ts-ignore — acorn has its own types
import * as acorn from "acorn";

const DEFAULT_OPTS = {
  ecmaVersion: 2025,
  sourceType: "module",
  allowAwaitOutsideFunction: true,
  allowReturnOutsideFunction: true,
};

/**
 * Build the acorn options object from ParseOpts, honoring overrides.
 */
function buildAcornOpts(opts) {
  return {
    ecmaVersion: opts.ecmaVersion ?? DEFAULT_OPTS.ecmaVersion,
    sourceType: opts.sourceType ?? DEFAULT_OPTS.sourceType,
    allowAwaitOutsideFunction: opts.allowAwaitOutsideFunction ?? DEFAULT_OPTS.allowAwaitOutsideFunction,
    allowReturnOutsideFunction: opts.allowReturnOutsideFunction ?? DEFAULT_OPTS.allowReturnOutsideFunction,
    locations: true,
  };
}

/**
 * Acorn parser — the conformance oracle.
 *
 * NOTE: this is "raw" acorn — no scrml plugins (scrmlAtPlugin, scrmlEnumPlugin)
 * and no preprocessing (preprocessForAcorn). The bench corpus is plain JS, so
 * raw acorn handles it. For .scrml inputs, raw acorn will fail on scrml-extension
 * tokens (`@`-cells, `::`, bare variants, `is`, `match`, `?{}`, etc.) — those
 * corpus rows surface as PARSE FAILURE on both parsers in lockstep (because the
 * stub also routes through raw acorn), which is the expected pre-M1 baseline.
 * Post-M1 those rows shift to "known-divergent" disposition per §D6.
 *
 * @type {Parser}
 */
export const acornParser = {
  name: "acorn",
  parse(source, opts = {}) {
    if (typeof source !== "string") return { ast: null, error: "non-string input" };
    const mode = opts.mode ?? "statements";
    const acornOpts = buildAcornOpts(opts);
    try {
      let ast;
      if (mode === "expression") {
        ast = acorn.Parser.parseExpressionAt(source, 0, acornOpts);
      } else {
        ast = acorn.Parser.parse(source, acornOpts);
      }
      return { ast, error: null };
    } catch (err) {
      return { ast: null, error: err && err.message ? err.message : String(err) };
    }
  },
};

/**
 * scrml-native parser — PLACEHOLDER — replaced at M1 per
 * scrml-native-parser-design-2026-05-17.md §D7-M1.
 *
 * Pre-M1 contract: returns acorn's output unchanged. This makes Tier 1+2
 * trivially pass on every corpus file, which is the baseline-infrastructure
 * verification — it proves the harness wiring, normalization, and diff logic
 * work BEFORE the real native parser exists.
 *
 * M1 swap-in surface: replace this function body with a call to the
 * scrml-authored lexer+parser. The interface (parse(source, opts) → {ast, error})
 * does NOT change. The test file does NOT change. Only this body changes.
 *
 * @type {Parser}
 */
export const scrmlNativeParserStub = {
  name: "scrml-native",
  parse(source, opts = {}) {
    // PLACEHOLDER — replaced at M1 per scrml-native-parser-design-2026-05-17.md D7 M1
    return acornParser.parse(source, opts);
  },
};

/** Convenience export — the two-parser tuple a comparator iterates. */
export const CONFORMANCE_PARSERS = [acornParser, scrmlNativeParserStub];
