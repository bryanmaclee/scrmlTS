/**
 * W-INPUT-STATE-MARKUP-NONREACTIVE — info-level lint that surfaces a SILENT
 * footgun: an input-state `<#id>.field` read placed inside a markup
 * interpolation (`${ ... }` in a markup body / value position) renders ONCE at
 * mount and never re-renders on input change (SPEC §36.6).
 *
 * **Why this lint exists.** §36.1 + §36.6 make input-state (`<keyboard>` /
 * `<mouse>` / `<gamepad>`) a LIVE-READ source, NOT a reactive cell: unlike
 * `<poll>`, an input-state `<#id>` read does NOT establish a reactive
 * subscription. That non-reactivity is CORRECT and intentional (input drives
 * imperative game logic at the `animationFrame` callback, not reactive UI). The
 * DEFECT this lint closes is the SILENCE: an author who writes
 * `<div>cursor.x = ${<#cursor>.x}</div>` expecting the coordinate to track the
 * mouse ships a one-shot value rendered at mount with zero diagnostic. The lint
 * restores a signal and steers the author to the §36.6 `@cell` bridge (read
 * `<#id>` inside an `animationFrame` loop, assign to an `@cell`, then
 * interpolate the `@cell` — which IS reactive).
 *
 * **Spec:** SPEC §36.6 (input-state × `animationFrame` interaction; the
 * "Markup interpolation is the same (S210, 6nz AF ruling)" paragraph names this
 * lint as the planned info-nudge). §36.1 (input-state is not subscribable,
 * unlike `<poll>`). Ruled + ratified by-design (S210 + S219); the render-once
 * behavior is the CONTRACT and is NOT changed here — this lint only makes the
 * footgun loud.
 *
 * **Pipeline placement:** runs as a post-BS pass invoked from api.js over the
 * block-split AST (`bsResults`), alongside the sibling
 * `runWInterpInRawContent`. A markup `${...}` interpolation is captured by the
 * block-splitter as a `{ type: "logic", raw: "${...}" }` node whose interior is
 * the interpolation expression text, so the walk scans that captured string
 * directly — no NR / scope resolution. Diagnostics flow through `collectErrors`,
 * where the `W-` prefix + `severity:"info"` partition them into
 * `result.warnings` (non-fatal; CLI exit stays 0) — never `result.errors`.
 *
 * **Detection (conservative — false positives are worse than misses).** Two
 * passes per file:
 *
 *   1. Collect the file's DECLARED input-state ids — markup nodes named
 *      `keyboard` / `mouse` / `gamepad` carrying an `id="..."` attribute
 *      (extracted from the node `raw`). This is the key conservatism: a `<#id>`
 *      ref is SHARED between §36 input-state and the §6.7.7 `<request>` render
 *      bridge — and the request bridge IS reactive (`<#feed>.data` in markup
 *      re-renders). By firing ONLY when the ref id matches a declared
 *      input-state element, the lint never false-fires on a reactive request
 *      ref.
 *
 *   2. Walk `{ type: "logic" }` interpolation nodes whose parent is NOT a
 *      logic-BODY container (`program` / `page` / `channel` / `component` /
 *      `schema` / `seeds` / `module`) — those host the program logic body, not a
 *      markup value interp. For each markup-interp node, fire when its
 *      `${...}` interior:
 *        a. contains a `<#id>` ref where `id` is a declared input-state id, AND
 *        b. does NOT contain an `animationFrame(` call — the §36.6 bridge / game
 *           loop reads `<#id>` inside `animationFrame`, which is the CORRECT
 *           reactive-by-assignment pattern and must never be flagged.
 *
 * **Deferred edge cases (noted, not fired — info-lint must not over-fire):**
 *   - Attribute-position interps (`<div style="left: ${<#cursor>.x}px">`): the
 *     block-splitter keeps these inside the element opener `raw` (no nested
 *     `logic` child), so they are NOT walked here. Same footgun, different
 *     capture shape; deferred to keep the scan disjoint from the opener parse.
 *   - An indirect read (`${formatCursor()}` where `formatCursor` reads `<#id>`
 *     internally) carries no `<#id>` token in the interp text, so it does not
 *     fire — out of scope for a conservative textual scan.
 *
 * @module lint-w-input-state-markup-nonreactive
 */

/**
 * Input-state element names (SPEC §36). Markup nodes with one of these names
 * and an `id="..."` attribute declare an input-state id referenceable via
 * `<#id>`.
 */
const INPUT_STATE_NAMES = new Set(["keyboard", "mouse", "gamepad"]);

/**
 * Container roots that host a LOGIC BODY (`${ ... }` statements block), not a
 * markup VALUE interpolation. A `${...}` directly under one of these is the
 * program/page/channel logic body — the legitimate place to read `<#id>` (incl.
 * inside an `animationFrame` loop). Mirrors the block-splitter's
 * `COMPOUND_LIFT_EXEMPT_TAGS` container set (plus `component`). Kept local so the
 * lint has no import-time coupling to the splitter internals.
 */
const LOGIC_BODY_CONTAINERS = new Set([
  "program",
  "page",
  "channel",
  "component",
  "schema",
  "seeds",
  "module",
]);

/**
 * Extract the `id` attribute value from an input-state element's raw opener.
 * Handles both `id="x"` and `id='x'`. Returns null when absent (an input-state
 * element with no `id` is an E-INPUT-00x error, handled elsewhere — the lint
 * simply does not register it).
 *
 * @param {string} raw — the markup node's raw opener text
 * @returns {string | null}
 */
function extractId(raw) {
  if (typeof raw !== "string") return null;
  const m = raw.match(/\bid\s*=\s*("([^"]*)"|'([^']*)')/);
  if (!m) return null;
  return m[2] !== undefined ? m[2] : m[3];
}

/**
 * Walk a block-split AST and collect the set of declared input-state ids
 * (markup `keyboard` / `mouse` / `gamepad` nodes carrying an `id`).
 *
 * @param {object[]} blocks
 * @returns {Set<string>}
 */
function collectInputStateIds(blocks) {
  const ids = new Set();
  const seen = new WeakSet();
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const n of node) walk(n);
      return;
    }
    if (seen.has(node)) return;
    seen.add(node);
    if (
      node.type === "markup" &&
      typeof node.name === "string" &&
      INPUT_STATE_NAMES.has(node.name.toLowerCase())
    ) {
      const id = extractId(node.raw);
      if (id) ids.add(id);
    }
    if (Array.isArray(node.children)) walk(node.children);
  }
  walk(blocks);
  return ids;
}

/**
 * Strip the `${` / `}` interpolation wrapper from a logic node's raw, returning
 * the interior expression text. Returns null when the raw is not a `${...}`
 * interpolation (e.g. a bare `{...}` brace context, defensively).
 *
 * @param {string} raw
 * @returns {string | null}
 */
function interpInterior(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("${")) return null;
  // Interior is everything between the leading `${` and the trailing `}`.
  const start = raw.indexOf("${");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start + 1) return null;
  return raw.slice(start + 2, end);
}

/**
 * Find the FIRST input-state `<#id>` ref in an interpolation interior whose id
 * is in `inputStateIds`. Returns the id, or null when none match.
 *
 * The `<#id>` ref shape: `<#` followed by an identifier, then `>`. Only refs
 * whose id is a declared input-state id are considered (a request-bridge ref to
 * a non-input-state id is deliberately ignored — that surface is reactive).
 *
 * @param {string} interior
 * @param {Set<string>} inputStateIds
 * @returns {string | null}
 */
function findInputStateRef(interior, inputStateIds) {
  if (typeof interior !== "string" || inputStateIds.size === 0) return null;
  const re = /<#([A-Za-z_$][\w$]*)>/g;
  let m;
  while ((m = re.exec(interior)) !== null) {
    if (inputStateIds.has(m[1])) return m[1];
  }
  return null;
}

/**
 * Build the W-INPUT-STATE-MARKUP-NONREACTIVE diagnostic message. Names the
 * footgun (render-once, no reactive subscription — §36.6) and steers to the
 * `@cell` bridge with a concrete, actionable shape.
 *
 * @param {string} id — the input-state element id read in the interp
 * @returns {string}
 */
function buildMessage(id) {
  return (
    `W-INPUT-STATE-MARKUP-NONREACTIVE: an input-state read \`<#${id}>.…\` ` +
    `appears inside a markup interpolation. Per SPEC §36.6, input-state ` +
    `(\`<keyboard>\` / \`<mouse>\` / \`<gamepad>\`) is a LIVE-READ source, NOT a ` +
    `reactive cell — this interpolation is evaluated ONCE at mount and does NOT ` +
    `re-render when the input changes (no reactive subscription is set up). For ` +
    `live UI, use the \`@cell\` bridge: read \`<#${id}>\` inside an ` +
    `\`animationFrame\` loop, assign the value to an \`@cell\`, then interpolate ` +
    `the \`@cell\` (which IS reactive). e.g. ` +
    `\`@x = 0\` … \`\${ function loop() { @x = <#${id}>.x; animationFrame(loop) } ` +
    `animationFrame(loop) }\` … \`<div>\${@x}</div>\`. ` +
    `Info-level (6nz AF, §36.6) — non-fatal; the read still compiles and ` +
    `renders its one-shot mount value, but it will not update, so this is a ` +
    `silent footgun if you intended live coordinates.`
  );
}

/**
 * Walk a block-split AST, visiting every markup-VALUE interpolation
 * (`{ type: "logic", raw: "${...}" }`) whose parent is NOT a logic-body
 * container. Calls `visit(node, interior)` with the interpolation interior text.
 *
 * @param {object[]} blocks
 * @param {(node: object, interior: string) => void} visit
 */
function walkMarkupInterps(blocks, visit) {
  const seen = new WeakSet();
  function walk(node, parentName) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const n of node) walk(n, parentName);
      return;
    }
    if (seen.has(node)) return;
    seen.add(node);

    if (node.type === "logic" && typeof node.raw === "string") {
      // A `${...}` logic node is a markup VALUE interpolation only when its
      // parent is NOT a logic-body container. Under `program`/`page`/etc. it is
      // the program logic body (where reading `<#id>` is correct).
      const isLogicBody =
        typeof parentName === "string" &&
        LOGIC_BODY_CONTAINERS.has(parentName.toLowerCase());
      if (!isLogicBody) {
        const interior = interpInterior(node.raw);
        if (interior !== null) visit(node, interior);
      }
    }

    const childParent = node.type === "markup" ? node.name : parentName;
    if (Array.isArray(node.children)) walk(node.children, childParent);
  }
  walk(blocks, null);
}

/**
 * Collect W-INPUT-STATE-MARKUP-NONREACTIVE diagnostics over the block-split AST.
 *
 * @param {Array<{ filePath?: string, blocks?: object[] }>} bsResults — array of
 *   block-splitter results (`{ filePath, blocks, errors }`)
 * @returns {Array<{ filePath: string, line: number, column: number, code: string, severity: string, message: string, span: object }>}
 */
export function runWInputStateMarkupNonreactive(bsResults) {
  const diagnostics = [];
  if (!bsResults || !Array.isArray(bsResults)) return diagnostics;

  for (const result of bsResults) {
    if (!result || !Array.isArray(result.blocks)) continue;
    const filePath = result.filePath || "";

    // Pass 1 — declared input-state ids. No input-state element → nothing to
    // flag (every candidate ref would be a request bridge or undeclared).
    const inputStateIds = collectInputStateIds(result.blocks);
    if (inputStateIds.size === 0) continue;

    // Pass 2 — markup-value interps reading a declared input-state id, NOT
    // inside an `animationFrame` loop.
    walkMarkupInterps(result.blocks, (node, interior) => {
      // The §36.6 bridge / game loop reads `<#id>` inside `animationFrame` — the
      // CORRECT pattern. Never flag an interp containing an `animationFrame(`
      // call.
      if (/\banimationFrame\s*\(/.test(interior)) return;

      const id = findInputStateRef(interior, inputStateIds);
      if (!id) return;

      const span = node.span || {};
      diagnostics.push({
        filePath,
        line: span.line ?? 0,
        column: span.col ?? 0,
        code: "W-INPUT-STATE-MARKUP-NONREACTIVE",
        severity: "info",
        message: buildMessage(id),
        span,
      });
    });
  }

  return diagnostics;
}
