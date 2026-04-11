/**
 * @module lint-ghost-patterns
 * Ghost-error lint pre-pass for scrml.
 *
 * Scans a .scrml source string for known React/Vue/Svelte syntax patterns that
 * do not exist in scrml and emits "did you mean?" diagnostics. Runs BEFORE the
 * main compiler pipeline — diagnostics are warnings, not fatal errors. The real
 * compiler always runs regardless of lint findings.
 *
 * Anti-pattern catalog: scrml-support/docs/ghost-error-mitigation-plan.md §Anti-Pattern Catalog
 * Integration: called by api.js:compileScrml() before Stage 2 (BS).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   line: number,
 *   column: number,
 *   ghost: string,
 *   correction: string,
 *   message: string,
 *   severity: 'warning',
 *   code: string,
 * }} LintDiagnostic
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a flat string offset to { line, column } (1-based).
 *
 * @param {string} source
 * @param {number} offset — byte offset into source
 * @returns {{ line: number, column: number }}
 */
function offsetToLineCol(source, offset) {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === "\n") {
      line++;
      lastNewline = i;
    }
  }
  const column = offset - lastNewline;
  return { line, column };
}

/**
 * Build a lint diagnostic from a regex match.
 *
 * @param {string} source
 * @param {RegExpExecArray} match
 * @param {string} ghost        — short pattern label shown in message
 * @param {string} correction   — correct scrml equivalent
 * @param {string} see          — spec section reference (e.g. "§5")
 * @param {string} code         — lint warning code (W-LINT-NNN)
 * @returns {LintDiagnostic}
 */
function makeDiag(source, match, ghost, correction, see, code) {
  const { line, column } = offsetToLineCol(source, match.index);
  return {
    line,
    column,
    ghost,
    correction,
    message: `Line ${line}: Found '${ghost}' — scrml uses '${correction}'. See ${see}.`,
    severity: "warning",
    code,
  };
}

// ---------------------------------------------------------------------------
// Logic-block exclusion
// ---------------------------------------------------------------------------

/**
 * Build an array of [start, end] ranges that correspond to `${...}` logic
 * blocks in the source. Matches are brace-balanced. Content inside these
 * ranges should not trigger ghost-pattern detection (the user is writing JS
 * expression syntax inside a legitimate scrml logic interpolation).
 *
 * Also excludes `#{...}` CSS context blocks from some checks (per-pattern).
 *
 * @param {string} source
 * @returns {Array<[number, number]>}
 */
function buildLogicRanges(source) {
  const ranges = [];
  let i = 0;
  while (i < source.length) {
    // Match ${ — logic interpolation start
    if (source[i] === "$" && source[i + 1] === "{") {
      const start = i;
      i += 2;
      let depth = 1;
      while (i < source.length && depth > 0) {
        if (source[i] === "{") depth++;
        else if (source[i] === "}") depth--;
        i++;
      }
      ranges.push([start, i]);
    } else {
      i++;
    }
  }
  return ranges;
}

/**
 * Returns true if the given offset falls inside any of the provided ranges.
 *
 * @param {number} offset
 * @param {Array<[number, number]>} ranges
 * @returns {boolean}
 */
function inRange(offset, ranges) {
  for (const [start, end] of ranges) {
    if (offset >= start && offset < end) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// CSS context detection
// ---------------------------------------------------------------------------

/**
 * Build ranges for `#{...}` CSS context blocks (brace-balanced).
 * Used to detect Svelte-style `${}` interpolations inside CSS values.
 *
 * @param {string} source
 * @returns {Array<[number, number]>}
 */
function buildCssRanges(source) {
  const ranges = [];
  let i = 0;
  while (i < source.length) {
    if (source[i] === "#" && source[i + 1] === "{") {
      const start = i;
      i += 2;
      let depth = 1;
      while (i < source.length && depth > 0) {
        if (source[i] === "{") depth++;
        else if (source[i] === "}") depth--;
        i++;
      }
      ranges.push([start, i]);
    } else {
      i++;
    }
  }
  return ranges;
}

// ---------------------------------------------------------------------------
// Pattern definitions
// ---------------------------------------------------------------------------

/**
 * Each pattern:
 *   regex       — RegExp with global flag (exec loop)
 *   ghost       — display label for message
 *   correction  — scrml equivalent
 *   see         — spec section
 *   code        — W-LINT-NNN
 *   skipIf      — optional fn(offset, logicRanges, cssRanges) -> bool to skip match
 */
const PATTERNS = [
  // Pattern 1: <style> block — unambiguous, no scrml meaning
  {
    regex: /<style\b/gi,
    ghost: "<style>",
    correction: "#{ css rules }",
    see: "§9",
    code: "W-LINT-001",
    skipIf: null, // Never a valid scrml construct
  },

  // Pattern 2: oninput=${...} arrow that assigns to @var — ghost bind pattern
  // Matches: oninput=${  (any)  @var = ...}
  {
    regex: /\boninput\s*=\s*\$\{[^}]*@\w+\s*=/gi,
    ghost: "oninput=${e => @x = e.target.value}",
    correction: "bind:value=@x",
    see: "§5",
    code: "W-LINT-002",
    skipIf: null, // Whole pattern including ${ is the ghost; no false-positive risk
  },

  // Pattern 3: className= — React class attribute
  {
    regex: /\bclassName\s*=/g,
    ghost: "className={expr}",
    correction: 'class:name=@cond or class="name"',
    see: "§5",
    code: "W-LINT-003",
    skipIf: (offset, logicRanges) => inRange(offset, logicRanges),
  },

  // Pattern 4: onChange=, onSubmit= (camelCase events)
  // Matches any on[Upper] event name assignment
  {
    regex: /\bon[A-Z]\w*\s*=/g,
    ghost: "onChange={handler}",
    correction: "onchange=handler()",
    see: "§5",
    code: "W-LINT-004",
    skipIf: (offset, logicRanges) => inRange(offset, logicRanges),
  },

  // Pattern 5: value={expr} where { is NOT preceded by $ — JSX attribute braces
  // Must match: value={  but NOT value=${
  // Negative lookbehind: not preceded by $
  {
    regex: /\bvalue\s*=\s*(?<!\$)\{/g,
    ghost: "value={@state}",
    correction: "value=@state",
    see: "§5",
    code: "W-LINT-005",
    skipIf: (offset, logicRanges) => inRange(offset, logicRanges),
  },

  // Pattern 6: for (item of @items) — JS for-of loop in markup context
  // (only meaningful outside ${} logic blocks)
  {
    regex: /\bfor\s*\(\s*\w+\s+of\s+@/g,
    ghost: "for (item of @items)",
    correction: "for @items / lift item /",
    see: "§10",
    code: "W-LINT-006",
    skipIf: (offset, logicRanges) => inRange(offset, logicRanges),
  },

  // Pattern 7: <Comp prop={val}> — JSX attribute braces on component props
  // Matches prop={  but NOT prop=${ and NOT value= (covered by P5)
  // Only trigger when the attribute name is NOT 'value' (P5 covers that)
  {
    regex: /\b(?!value\b)(\w+)\s*=\s*(?<!\$)\{(?!\{)/g,
    ghost: "<Comp prop={val}>",
    correction: "<Comp prop=val>",
    see: "§5",
    code: "W-LINT-007",
    skipIf: (offset, logicRanges) => inRange(offset, logicRanges),
  },

  // Pattern 8: {cond && <El>} — React conditional rendering
  // Only trigger outside ${} logic blocks (inside logic it's valid JS)
  {
    regex: /\{[^}]+&&\s*</g,
    ghost: "{cond && <El>}",
    correction: "<El if=@cond>",
    see: "§17",
    code: "W-LINT-008",
    skipIf: (offset, logicRanges) => inRange(offset, logicRanges),
  },

  // Pattern 9: onClick=, onDblClick= etc. (camelCase click events)
  // Note: onC... catches onClick, onClose etc. — but camelCase is the signal.
  // Covered generically by W-LINT-004 (on[Upper]) but kept explicit for clarity
  // Deduplicated: W-LINT-004 already matches onClick. This entry is intentionally
  // omitted — W-LINT-004 (on[A-Z]) covers all camelCase events including onClick.
  // Keeping the slot here as a comment so the pattern numbering matches the plan.
  // (No separate entry for W-LINT-009 — W-LINT-004 subsumes it.)

  // Pattern 10: ${} interpolation INSIDE #{} CSS context — Svelte pattern
  // Matches: #{ ... ${ ... } ... } — the ${ inside CSS is the ghost
  {
    regex: /\$\{/g,
    ghost: "${} in CSS context",
    correction: "@var directly in #{}",
    see: "§9",
    code: "W-LINT-010",
    skipIf: (offset, logicRanges, cssRanges) => {
      // Only trigger if we're inside a #{} CSS block
      if (!inRange(offset, cssRanges)) return true; // skip — not in CSS context
      // Also skip if this ${ is a logic interpolation itself (nested ${} in CSS is the ghost)
      return false;
    },
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Lint a scrml source string for known ghost patterns from other frameworks.
 *
 * Each diagnostic describes a pattern that does not exist in scrml and suggests
 * the correct scrml equivalent. Diagnostics are warnings — they do not block
 * compilation.
 *
 * @param {string} source    — raw .scrml file content
 * @param {string} [filePath] — optional file path for future use (not currently used in messages)
 * @returns {LintDiagnostic[]}
 */
export function lintGhostPatterns(source, filePath) {
  if (!source || source.length === 0) return [];

  const logicRanges = buildLogicRanges(source);
  const cssRanges = buildCssRanges(source);
  const diagnostics = [];

  for (const pattern of PATTERNS) {
    const re = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;
    while ((match = re.exec(source)) !== null) {
      const offset = match.index;

      // Apply false-positive guard
      if (pattern.skipIf && pattern.skipIf(offset, logicRanges, cssRanges)) {
        continue;
      }

      diagnostics.push(
        makeDiag(source, match, pattern.ghost, pattern.correction, pattern.see, pattern.code)
      );

      // Prevent infinite loops on zero-width matches
      if (match[0].length === 0) re.lastIndex++;
    }
  }

  // Sort by line, then column for deterministic output
  diagnostics.sort((a, b) => a.line !== b.line ? a.line - b.line : a.column - b.column);

  return diagnostics;
}
