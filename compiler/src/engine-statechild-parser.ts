/* SPDX-License-Identifier: MIT
 * Phase A1b Step B15 — Engine state-child structural parser.
 *
 * Parses an engine's `rulesRaw` body text into a flat list of state-child
 * entries. State-children are the §51.0.B PascalCase variant tags inside an
 * `<engine for=Type>` body; each carries an optional `rule=` attribute (the
 * §51.0.F transition contract) and a body.
 *
 * **Why a custom parser?** The AST today stores engine bodies as raw text
 * (`engine-decl.rulesRaw`), not walkable AST nodes — see primer §13.7 B14
 * specifics ("Engine bodies are RAW TEXT (engine-decl.rulesRaw) — no
 * walkable children today"). This module fills the gap structurally enough
 * for B15's three responsibilities (exhaustiveness, rule= form check,
 * initial= validation). When the parser gains structural state-child
 * support, this module's output will mirror the AST one-to-one and the
 * file becomes a thin shim or is replaced.
 *
 * **What this parser DOES:**
 *   1. Recognize legacy arrow-rule lines (`.From => .To`) and SKIP them —
 *      legacy `<machine>` form is handled by `parseMachineRules` in the
 *      type-system; B15's PASS 11 walks only the new `<engine>` form.
 *   2. Recognize state-child opener tags (`<Variant rule=.X>`, `<Variant>`,
 *      `<Variant rule=(.A | .B)>`) and pair them with their closers
 *      (`</>`, `</Variant>`).
 *   3. Recognize `:`-shorthand body form (`<Variant rule=.X> : "..."`).
 *   4. Parse the `rule=` attribute value into one of the §51.0.F forms.
 *
 * **What this parser does NOT do:**
 *   - Parse the BODY of state-children (raw text only, per parser
 *     limitation). B15's compile-time E-ENGINE-INVALID-TRANSITION fire
 *     site for direct writes inside state-child bodies is therefore
 *     DEFERRED — see progress.md §"DEFERRED ITEMS".
 *   - Parse `effect=`, `<onTransition>`, `<onTimeout>`, `history`,
 *     `internal:rule=`, `parallel` — those belong to B17 / A7 dispatches.
 *   - Substitute for the type-system's enum-variant validation (it merely
 *     extracts the tag string; validation against the type's variants
 *     happens in PASS 11).
 */

import type { EngineRuleForm, EngineStateChildEntry } from "./symbol-table";

/**
 * Determine whether the engine body text appears to be in the LEGACY
 * `<machine>` arrow-rule form (`.From => .To`). The new `<engine>` state-
 * child form uses `<Variant ...>...</>` openers and never uses `=>`.
 *
 * Heuristic: presence of `=>` at top level (not inside braces) AND absence
 * of `<` opener for a state-child. The check is conservative — when in
 * doubt, return false so the parser attempts state-child extraction.
 *
 * Returns true iff the body is unambiguously legacy arrow-rules. Such
 * bodies are SKIPPED by B15's parser (the legacy form is the type-system's
 * territory; B15 deals exclusively with the new `<engine>` state-child
 * surface).
 */
export function isLegacyArrowRulesBody(rulesRaw: string): boolean {
  const trimmed = rulesRaw.trim();
  if (!trimmed) return false;
  // If the body never contains `<` followed by an uppercase letter
  // (state-child opener) but DOES contain `=>`, treat as legacy.
  const hasStateChildOpener = /<\s*[A-Z]/.test(trimmed);
  const hasArrow = /=>/.test(trimmed);
  if (!hasStateChildOpener && hasArrow) return true;
  return false;
}

/**
 * Split a top-level `|` alternation list into individual items. Respects
 * parentheses depth so nested groupings (rare in `rule=` but possible in
 * future extensions) don't fragment.
 */
function splitTopLevelPipe(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    if (c === "|" && depth === 0) {
      out.push(buf.trim());
      buf = "";
      continue;
    }
    buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/**
 * Parse a `rule=` attribute value (the substring after `rule=`, with any
 * surrounding quotes stripped) into one of the §51.0.F forms.
 *
 * Examples:
 *   ".NextVariant"            → { kind: "single", target: "NextVariant" }
 *   "(.A | .B | .C)"          → { kind: "multi", targets: ["A","B","C"] }
 *   "*"                       → { kind: "wildcard" }
 *   "event -> Variant"        → { kind: "legacy-arrow", raw: "event -> Variant" }
 *   "garbage"                 → { kind: "parse-error", raw: "garbage", reason: ... }
 */
export function parseRuleAttrValue(raw: string): EngineRuleForm {
  const v = raw.trim();
  if (v.length === 0) {
    return { kind: "parse-error", raw, reason: "empty rule= value" };
  }

  // Wildcard escape hatch — §51.0.F.
  if (v === "*") return { kind: "wildcard" };

  // Legacy event-arrow form — §51.3, deprecated. We detect to fire
  // E-ENGINE-RULE-LEGACY-SYNTAX in PASS 11.
  // Heuristic: contains `->` (not `=>` — that's the legacy *machine* arrow
  // INSIDE rulesRaw, distinct from the `rule=` attribute value).
  // Per §51.3 the form is `event -> Variant` (or `event(payload) -> Variant`).
  if (/->/.test(v) || /=>/.test(v)) {
    return { kind: "legacy-arrow", raw };
  }

  // Single-target form: `.Variant`.
  // Pattern: optional dot, PascalCase identifier, end.
  const singleMatch = v.match(/^\.([A-Z][A-Za-z0-9_]*)$/);
  if (singleMatch) {
    return { kind: "single", target: singleMatch[1]! };
  }

  // Multi-target form: `(.A | .B | .C)`.
  // Strip enclosing parens, split on `|`, parse each as `.Variant`.
  if (v.startsWith("(") && v.endsWith(")")) {
    const inner = v.slice(1, -1).trim();
    const parts = splitTopLevelPipe(inner);
    const targets: string[] = [];
    for (const p of parts) {
      const m = p.match(/^\.([A-Z][A-Za-z0-9_]*)$/);
      if (!m) {
        return {
          kind: "parse-error",
          raw,
          reason: `multi-target alternative '${p}' is not a valid '.Variant' reference`,
        };
      }
      targets.push(m[1]!);
    }
    if (targets.length === 0) {
      return { kind: "parse-error", raw, reason: "empty multi-target list" };
    }
    return { kind: "multi", targets };
  }

  // Bare PascalCase form (no leading dot) — accept defensively as single-
  // target. Spec is `.Variant`, but ergonomic surfacing has historically
  // accepted `Variant` too. Document the deviation as a future tightening.
  const bareMatch = v.match(/^([A-Z][A-Za-z0-9_]*)$/);
  if (bareMatch) {
    return { kind: "single", target: bareMatch[1]! };
  }

  return {
    kind: "parse-error",
    raw,
    reason: `'${v}' is not one of the §51.0.F forms (single-target '.X', multi-target '(.A | .B)', or wildcard '*')`,
  };
}

/**
 * Find the closing `>` for an opener that starts at index `open` in `s`.
 * Respects parentheses for `rule=(.A | .B)` and double-quoted attribute
 * values. Returns the index of `>` (one past the last attribute character)
 * or -1 if no closer was found.
 */
function findOpenerEnd(s: string, open: number): number {
  let i = open;
  let depth = 0;     // paren depth (rule=(.A | .B))
  let inQuote = "";  // " or ' or empty
  while (i < s.length) {
    const c = s[i]!;
    if (inQuote) {
      if (c === inQuote) inQuote = "";
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      inQuote = c;
      i++;
      continue;
    }
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === ">" && depth === 0) return i;
    i++;
  }
  return -1;
}

/**
 * Find the matching closer for an opener tag whose name is `tag` starting
 * AT or AFTER index `from` in `rulesRaw`. Recognizes:
 *   - `</>`           — generic closer (most common)
 *   - `</Variant>`    — explicit closer
 *
 * Honors nesting: every nested opener `<` increments depth, every closer
 * decrements. Returns the index of the closer's `<` (start), or -1 if no
 * matching closer was found.
 *
 * Note: state-child bodies that contain LOGIC blocks (`${ ... }`) or
 * other markup with `<` are an edge case. This implementation skips any
 * `${...}` interpolation block bodily (one level of brace matching).
 */
function findStateChildCloser(rulesRaw: string, from: number, tag: string): number {
  let i = from;
  let depth = 1;
  while (i < rulesRaw.length) {
    // Skip ${...} interpolation
    if (rulesRaw.startsWith("${", i)) {
      let j = i + 2;
      let braceDepth = 1;
      while (j < rulesRaw.length && braceDepth > 0) {
        if (rulesRaw[j] === "{") braceDepth++;
        else if (rulesRaw[j] === "}") braceDepth--;
        j++;
      }
      i = j;
      continue;
    }
    // Closer: `</>`
    if (rulesRaw.startsWith("</>", i)) {
      depth--;
      if (depth === 0) return i;
      i += 3;
      continue;
    }
    // Closer: `</Variant>`
    if (rulesRaw.startsWith("</", i)) {
      const end = rulesRaw.indexOf(">", i);
      if (end < 0) return -1;
      depth--;
      if (depth === 0) return i;
      i = end + 1;
      continue;
    }
    // Nested opener `<Tag` — increment depth (only for Pascal-cased tags;
    // HTML/lowercase tags don't matter for our state-child counting).
    if (rulesRaw[i] === "<") {
      const next = rulesRaw[i + 1];
      if (next && next >= "A" && next <= "Z") {
        depth++;
        // Advance past the opener
        const openerEnd = findOpenerEnd(rulesRaw, i + 1);
        if (openerEnd < 0) return -1;
        // Self-closing? `<Tag/>`
        if (rulesRaw[openerEnd - 1] === "/") {
          depth--; // self-close cancels the increment
        }
        i = openerEnd + 1;
        continue;
      }
    }
    i++;
  }
  return -1;
}

/**
 * Parse engine `rulesRaw` body into a list of state-child entries.
 *
 * Returns an empty array if the body is empty or appears to be in the
 * legacy `<machine>` arrow-rule form (`.From => .To`).
 *
 * Robustness: malformed openers and missing closers DO NOT throw. They
 * skip the offending region and continue scanning. PASS 11 in
 * symbol-table.ts handles diagnostic emission based on the parsed entries.
 *
 * @param rulesRaw — the raw text inside `<engine>...</>`
 * @returns flat list of state-child entries in source order
 */
export function parseEngineStateChildren(rulesRaw: string): EngineStateChildEntry[] {
  const out: EngineStateChildEntry[] = [];
  if (typeof rulesRaw !== "string") return out;
  if (!rulesRaw.trim()) return out;

  // Legacy arrow-rule body — skip parsing; type-system handles those.
  if (isLegacyArrowRulesBody(rulesRaw)) return out;

  let i = 0;
  while (i < rulesRaw.length) {
    // Find next `<` followed by an uppercase letter (state-child opener).
    const lt = rulesRaw.indexOf("<", i);
    if (lt < 0) break;
    const next = rulesRaw[lt + 1];
    if (!next || next < "A" || next > "Z") {
      i = lt + 1;
      continue;
    }

    // Found a state-child opener candidate. Find its `>`.
    const openerEnd = findOpenerEnd(rulesRaw, lt + 1);
    if (openerEnd < 0) break;

    // Extract opener text WITHOUT the leading `<` and trailing `>`.
    const openerInner = rulesRaw.slice(lt + 1, openerEnd);

    // Strip leading whitespace; first identifier-run is the tag.
    const openerTrimmed = openerInner.replace(/^\s+/, "");
    const tagMatch = openerTrimmed.match(/^([A-Z][A-Za-z0-9_]*)/);
    if (!tagMatch) {
      i = openerEnd + 1;
      continue;
    }
    const tag = tagMatch[1]!;
    const afterTag = openerTrimmed.slice(tag.length);

    // Self-closing? `<Variant/>` — accept and treat as empty body.
    const isSelfClose = openerInner.trimEnd().endsWith("/");

    // Extract `rule=` attribute value if present. Pattern accepts:
    //   rule=.X
    //   rule=(.A | .B)
    //   rule=*
    //   rule="event -> Variant"   (legacy form — flagged later)
    //   rule="(.A | .B)"          (quoted multi)
    let ruleForm: EngineRuleForm = { kind: "absent" };
    const ruleMatch = afterTag.match(/(?:^|\s)rule\s*=\s*(.+?)(?=\s+\w+\s*=|\s*\/?\s*$)/s);
    if (ruleMatch) {
      let val = ruleMatch[1]!.trim();
      // Strip surrounding quotes if present.
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1).trim();
      }
      // If trailing `/` got captured (self-close), strip it.
      if (val.endsWith("/")) val = val.slice(0, -1).trim();
      ruleForm = parseRuleAttrValue(val);
    }

    // Locate body end.
    let bodyStart = openerEnd + 1;
    let bodyEnd: number;
    let nextI: number;
    let isColonShorthand = false;
    if (isSelfClose) {
      bodyEnd = bodyStart;
      nextI = bodyStart;
    } else {
      // `:`-shorthand body? After `>`, optional whitespace, then `:`.
      // Body extends until newline (the canonical `:`-form is
      // single-expression, terminated by a newline per SPEC §4.14 / §51.0.I).
      const afterOpener = rulesRaw.slice(bodyStart);
      const colonShortcutMatch = afterOpener.match(/^\s*:\s*([^\n]*)/);
      if (colonShortcutMatch) {
        const colonStart = bodyStart + colonShortcutMatch[0].indexOf(":");
        const lineEnd = bodyStart + colonShortcutMatch[0].length;
        bodyEnd = lineEnd;
        nextI = lineEnd;
        // For `:`-shorthand, the body is the post-`:` text.
        // (We don't currently need it for B15 validation but record it.)
        bodyStart = colonStart + 1;
        isColonShorthand = true;
      } else {
        // Find matching closer for this state-child.
        const closerStart = findStateChildCloser(rulesRaw, bodyStart, tag);
        if (closerStart < 0) {
          // Malformed — skip this opener and continue scanning.
          i = openerEnd + 1;
          continue;
        }
        bodyEnd = closerStart;
        // Advance past the closer (skip `</>` or `</Variant>`).
        if (rulesRaw.startsWith("</>", closerStart)) {
          nextI = closerStart + 3;
        } else {
          const closerEnd = rulesRaw.indexOf(">", closerStart);
          nextI = closerEnd >= 0 ? closerEnd + 1 : rulesRaw.length;
        }
      }
    }

    out.push({
      tag,
      rule: ruleForm,
      bodyRaw: rulesRaw.slice(bodyStart, bodyEnd),
      isColonShorthand,
      rawOffset: lt,
    });
    i = nextI;
  }

  return out;
}
