/**
 * @module block-analysis
 *
 * D2 — the block-analysis sidecar BUILDER + serializer.
 *
 * Projects every named block in a `.scrml` file (function / component / engine /
 * type / channel) into a deterministic, pretty-printed JSON artifact —
 * `<base>.block-analysis.json` (written by D3's `--emit-block-analysis` flag) —
 * that flogence's block-lease / dock tooling consumes INSTEAD of running a
 * second (regex) parser over the source (the drift-avoidance architecture,
 * SCOPE §0). Each block carries its EXACT source span (from the AST `span`
 * field) and, for blocks with a structured logic body, its SHALLOW dotted-path
 * read/write footprint (computed by D1's `footprintForBlock`).
 *
 * This is PURE data exposure — no new analysis beyond the footprint D1 already
 * built, no SPEC change, no runtime behavior change, no body-DG touch. The
 * artifact dissolves dock's next-def-boundary heuristic (true AST spans) and
 * gives the lease the dotted-grain footprint the body-DG's root-cell `reads`/
 * `writes` are deliberately too coarse for (SCOPE §1 Fact 1/2).
 *
 * What we project, per block in the file:
 *   {
 *     "id": "<relpath>::<name>",      // the lease anchor (dock's existing key)
 *     "kind": "function",             // function|component|engine|type|channel
 *     "name": "sendMessage",
 *     "span": { "start": 5412, "end": 5901, "line": 154, "endLine": 171 },
 *     "reads":  ["currentDriver", "messageForm.draft"],   // SORTED dotted, no @
 *     "writes": ["errorMessage", "messageForm.draft"],
 *     "footprintDepth": "shallow"     // honesty marker (transitive = later slice)
 *   }
 *
 * `line`/`endLine` are the load-bearing diff-scope fields — raw `git diff` line
 * ranges map onto source lines, so the consumer compares against `span.line`
 * (which TAB maps back to the original source), NOT byte offsets (SCOPE §3).
 * type / channel blocks carry empty footprints (honest-empty: they declare no
 * reactive reads/writes). v1 footprint depth is uniformly `"shallow"`.
 *
 * Determinism (mirrors `engine-graph.ts` + the reachability serializer):
 *   - Blocks emitted in SOURCE ORDER (`span.start` ascending).
 *   - `reads` / `writes` SORTED + de-duplicated (D1 returns them sorted).
 *   - Stable object key order via fixed literal-key construction.
 *   - `JSON.stringify(_, null, 2) + "\n"`.
 * Two compiles of the same source produce byte-identical output.
 *
 * Node discovery REUSES the canonical FileAST collections + codegen collectors
 * (`collectC12EngineDecls` / `collectC14DerivedEngineDecls`) so this sidecar
 * sees EXACTLY the blocks the rest of the pipeline does — no separate walk to
 * drift out of sync.
 *
 * Cross-references:
 *   - docs/changes/block-analysis-emit-2026-06-18/SCOPE-AND-DECOMPOSITION.md
 *   - compiler/src/block-analysis-footprint.ts — `footprintForBlock` (D1).
 *   - compiler/src/engine-graph.ts — the sidecar pattern this mirrors.
 *   - compiler/src/types/ast.ts — FunctionDeclNode / ComponentDefNode /
 *     EngineDeclNode / TypeDeclNode / ChannelDeclNode / FileAST / Span.
 */

import { footprintForBlock } from "./block-analysis-footprint.ts";
import {
  collectC12EngineDecls,
  collectC14DerivedEngineDecls,
} from "./codegen/emit-engine.ts";

// ---------------------------------------------------------------------------
// Local shape mirrors (the fields we read off the FileAST / block nodes).
// Mirrored — not imported — to keep this module's type-import surface lean,
// matching the precedent in engine-graph.ts. Loose `unknown`-keyed records
// because the collectors hand back lightly-typed nodes.
// ---------------------------------------------------------------------------

/** A loosely-typed AST node. */
type AnyNode = Record<string, unknown>;

/** The byte/line span every AST node carries (`ast.ts` `Span`). */
interface SpanShape {
  start?: number;
  end?: number;
  line?: number;
}

// ---------------------------------------------------------------------------
// Emitted-JSON projection shapes (the public artifact contract).
// ---------------------------------------------------------------------------

/** The lease kind of a block. */
export type BlockKind = "function" | "component" | "engine" | "type" | "channel";

/** A block's source span: byte offsets + 1-based first/last line. */
export interface BlockSpan {
  /** Byte offset of the first character. */
  start: number;
  /** Byte offset one past the last character. */
  end: number;
  /** 1-based line of the block opener (the diff-scope anchor). */
  line: number;
  /** 1-based line of the block's last character. */
  endLine: number;
}

/** One block in the file's block-analysis projection. */
export interface BlockAnalysisBlock {
  /** `<relpath>::<name>` — the lease anchor (dock's existing key). */
  id: string;
  kind: BlockKind;
  name: string;
  span: BlockSpan;
  /** SHALLOW dotted-path reads (sorted, de-duplicated, no `@`). */
  reads: string[];
  /** SHALLOW dotted-path writes (sorted, de-duplicated, no `@`). */
  writes: string[];
  /** Honesty marker — v1 is uniformly `"shallow"` (no call-graph). */
  footprintDepth: "shallow";
}

/** Top-level artifact shape. Honest-empty `{ version, file, blocks: [] }` for a
 *  file with no named blocks (NOT an error). */
export interface BlockAnalysis {
  version: 1;
  file: string;
  blocks: BlockAnalysisBlock[];
}

// ---------------------------------------------------------------------------
// FileAST normalization + relative-path resolution
// ---------------------------------------------------------------------------

/**
 * Normalize the orchestrator's per-file object to the underlying FileAST. The
 * orchestrator may hand us the AST directly (`{ nodes, components, ... }`) or
 * wrapped (`{ ast: {...} }`) — mirror the collectors' dual-shape tolerance.
 */
function unwrapFileAST(file: unknown): AnyNode | undefined {
  if (!file || typeof file !== "object") return undefined;
  const obj = file as AnyNode;
  const inner = obj.ast;
  if (inner && typeof inner === "object") return inner as AnyNode;
  return obj;
}

/**
 * Recover the per-file SOURCE TEXT the orchestrator threads on its wrapped
 * per-file object. The api.js CE loop re-attaches the RAW file source (the same
 * text the Block Splitter + TAB built the AST spans against — `readFileSync` of
 * the `.scrml` file, see api.js `sourceByFile`) as `_sourceText` on the OUTER
 * `{ filePath, ast, _sourceText }` object, NOT on the inner `ast`. The earlier
 * `source` / `preprocessedSource` fallbacks remain for any caller that hands the
 * AST directly with those fields set; `_sourceText` is the live-pipeline field.
 *
 * CRITICAL — span coordinate basis: AST `span.start` / `span.end` / `span.line`
 * all index into this RAW source (BS/TAB never rewrites byte positions), so
 * `endLine` derived from a slice of `_sourceText` lands on the correct RAW line.
 * Passing a preprocessed (`${...}`-expanded) text here would be off-by-lines.
 */
function sourceFromFile(file: unknown): string | undefined {
  if (!file || typeof file !== "object") return undefined;
  const obj = file as AnyNode;
  if (typeof obj._sourceText === "string") return obj._sourceText;
  if (typeof obj.source === "string") return obj.source as string;
  if (typeof obj.preprocessedSource === "string") return obj.preprocessedSource as string;
  return undefined;
}

/**
 * The repo-relative path used in the block `id` and the artifact `file` field.
 *
 * `id` is dock's existing `<relpath>::<name>` key, so zero consumer churn. We
 * derive the relative path by stripping everything up to and including the
 * first `examples/`, `compiler/`, `stdlib/`, `samples/`, `scripts/`, `src/`, or
 * `tests/` segment when present (the project-root anchors), else fall back to
 * the absolute path verbatim (the consumer keys on whatever the compiler
 * emits — determinism, not a specific root, is the contract). Always uses `/`.
 */
function relativeFilePath(filePath: string): string {
  if (typeof filePath !== "string" || filePath.length === 0) return "";
  const normalized = filePath.replace(/\\/g, "/");
  // Anchor on the first project-root directory segment we recognize so the
  // `id` is stable across machines (absolute prefixes differ; the in-repo
  // path does not). Order longest-first is irrelevant — first match wins on
  // position, and these are disjoint roots.
  const ANCHORS = ["examples/", "compiler/", "stdlib/", "samples/", "scripts/", "src/", "tests/"];
  let best = -1;
  for (const anchor of ANCHORS) {
    const idx = normalized.indexOf(anchor);
    if (idx !== -1 && (best === -1 || idx < best)) best = idx;
  }
  return best === -1 ? normalized : normalized.slice(best);
}

// ---------------------------------------------------------------------------
// Span projection
// ---------------------------------------------------------------------------

const NEWLINE = /\n/g;

/**
 * Project a node's `span` into the artifact's `{ start, end, line, endLine }`.
 *
 * `start` / `end` are byte offsets; `line` is the 1-based opener line the AST
 * already carries. `endLine` is NOT a field the AST tracks, so we derive it:
 * `line` plus the count of newlines BEFORE the block's LAST content character.
 *
 * The last content character sits at byte `end - 1` (`end` is one-past-the-last).
 * We count newlines in the slice `[start, end - 1)` — i.e. up to but EXCLUDING
 * that last character — so the result is the 1-based line of `source[end - 1]`.
 * Excluding `end - 1` is load-bearing: an AST `span.end` may include a trailing
 * newline AFTER the block's closing `}` (observed on top-level function decls).
 * Counting `[start, end)` would count that trailing newline and over-report
 * `endLine` by one line. `[start, end - 1)` lands on the closing-brace line in
 * BOTH forms (trailing-newline present or absent) — verified on the bigFn repro.
 *
 * The full source text is threaded in so the slice is exact; when absent (a unit
 * test feeding synthetic nodes with no `source`), `endLine` falls back to `line`
 * — an honest single-line approximation that never claims a span it can't
 * substantiate.
 */
function projectSpan(span: SpanShape | undefined, source: string | undefined): BlockSpan {
  const start = typeof span?.start === "number" ? span.start : 0;
  const end = typeof span?.end === "number" ? span.end : start;
  const line = typeof span?.line === "number" ? span.line : 1;

  let endLine = line;
  if (typeof source === "string" && end > start && end <= source.length) {
    // Slice up to the LAST content character (byte `end - 1`), excluding it, so
    // a trailing newline inside the span never inflates the line count.
    const slice = source.slice(start, end - 1);
    const matches = slice.match(NEWLINE);
    endLine = line + (matches ? matches.length : 0);
  }

  return { start, end, line, endLine };
}

// ---------------------------------------------------------------------------
// Channel name extraction (mirrors emit-channel.ts attr read)
// ---------------------------------------------------------------------------

/**
 * The channel's logical name, read off its `name=` attribute. Channel decls are
 * `MarkupNode`s (`tag: "channel"`) carrying an `attrs` array (or legacy
 * `attributes`) of `{ name, value }`; mirror `emit-channel.ts readChannelMeta`
 * so we agree with the canonical consumer (string-literal value, else a bare
 * `@var` ref with the `@` stripped). Falls back to `"channel"` (the same
 * default emit-channel uses) when the name attr is absent.
 */
function channelName(node: AnyNode): string {
  const attrs = (Array.isArray(node.attrs) ? node.attrs : node.attributes) as AnyNode[] | undefined;
  if (!Array.isArray(attrs)) return "channel";
  for (const attr of attrs) {
    if (attr && typeof attr === "object" && attr.name === "name") {
      const value = attr.value as AnyNode | string | undefined;
      if (typeof value === "string") return value;
      if (value && typeof value === "object") {
        if (value.kind === "string-literal" && typeof value.value === "string") return value.value;
        if (value.kind === "variable-ref" && typeof value.name === "string") {
          return value.name.replace(/^@/, "");
        }
      }
      return "channel";
    }
  }
  return "channel";
}

// ---------------------------------------------------------------------------
// Per-block projection
// ---------------------------------------------------------------------------

/**
 * The `varName` identity of an engine block — the §51.0.C auto-declared
 * variable on `_record.engineMeta` (SCOPE §1 Fact 1). Falls back to the legacy
 * `engineName` field, then the empty string (a malformed engine the collectors
 * would not have returned).
 */
function engineVarName(node: AnyNode): string {
  const record = node._record as { engineMeta?: { varName?: unknown } } | undefined;
  const varName = record?.engineMeta?.varName;
  if (typeof varName === "string" && varName.length > 0) return varName;
  if (typeof node.engineName === "string") return node.engineName;
  return "";
}

/**
 * Build one block projection. `kind` + `name` are caller-resolved (each
 * collection knows its own kind + name field). The footprint comes from D1's
 * `footprintForBlock` for fn/component/engine blocks (only fns carry a
 * structured logic body, so component/engine yield honest-empty today —
 * SCOPE §3) and is empty for type/channel blocks (they declare no reactive
 * reads/writes).
 */
function projectBlock(
  node: AnyNode,
  kind: BlockKind,
  name: string,
  relPath: string,
  source: string | undefined,
  fileAST: AnyNode | undefined,
): BlockAnalysisBlock {
  const span = projectSpan(node.span as SpanShape | undefined, source);

  let reads: string[] = [];
  let writes: string[] = [];
  if (kind === "function" || kind === "component" || kind === "engine") {
    const footprint = footprintForBlock(node, fileAST);
    reads = footprint.reads;
    writes = footprint.writes;
  }

  return {
    id: `${relPath}::${name}`,
    kind,
    name,
    span,
    reads,
    writes,
    footprintDepth: "shallow",
  };
}

// ---------------------------------------------------------------------------
// Block discovery (reuse the FileAST collections + codegen collectors)
// ---------------------------------------------------------------------------

/**
 * Walk the node tree collecting every top-level `function-decl` (a named block).
 *
 * Functions do NOT sit directly on `FileAST.nodes` — even a module-level `fn`
 * is wrapped in a `logic` node (its decls in `logic.body`), and a page-embedded
 * `${…}` block is a `logic` node nested under `<page>` markup `children`. So we
 * descend `markup.children` + `logic.body` (the structural wrappers) to reach
 * the function-decls, mirroring the D1 footprint test's `functionDecls` walker
 * + engine-graph's markup-children collector.
 *
 * We do NOT descend into a function-decl's OWN body: a function nested inside
 * another function's body is reached transitively (BREAK-2 territory) and would
 * collide on the `<relpath>::<name>` anchor; dock keys on top-level defs.
 */
function collectFunctionDecls(
  nodes: unknown,
  out: { node: AnyNode; kind: BlockKind; name: string }[],
): void {
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const n = node as AnyNode;
    if (n.kind === "function-decl") {
      const name = typeof n.name === "string" ? n.name : "";
      if (name) out.push({ node: n, kind: "function", name });
      // Do NOT descend into the fn's own body (top-level defs only).
      continue;
    }
    // Descend the structural wrappers that hold function-decls: `logic` nodes
    // carry them in `body`; markup containers in `children`.
    if (Array.isArray(n.children)) collectFunctionDecls(n.children, out);
    if (Array.isArray(n.body)) collectFunctionDecls(n.body, out);
  }
}

/**
 * Collect every named block in a FileAST as an unsorted `(node, kind, name)`
 * list. Functions are discovered by walking the node tree (`logic.body` /
 * markup `children`); components / types / channels via their dedicated
 * `FileAST` collections; engines via the canonical codegen collectors (C12
 * non-derived + C14 derived) so engine discovery matches emission exactly.
 * Identity fields per SCOPE §1 Fact 1.
 */
function collectBlocks(fileAST: AnyNode): { node: AnyNode; kind: BlockKind; name: string }[] {
  const out: { node: AnyNode; kind: BlockKind; name: string }[] = [];

  // Functions — walk the node tree (they live in `logic.body`, nested under
  // markup `children` when page-embedded — never directly on `FileAST.nodes`).
  collectFunctionDecls(fileAST.nodes, out);

  // Components — `FileAST.components` (component-def, `.name`).
  const components = Array.isArray(fileAST.components) ? (fileAST.components as AnyNode[]) : [];
  for (const node of components) {
    if (node && typeof node === "object") {
      const name = typeof node.name === "string" ? node.name : "";
      if (name) out.push({ node, kind: "component", name });
    }
  }

  // Engines — canonical collectors (C12 non-derived + C14 derived). Identity is
  // `_record.engineMeta.varName` (§51.0.C). Reuse, don't re-walk.
  const c12 = collectC12EngineDecls(fileAST) as unknown as AnyNode[];
  for (const node of c12) {
    const name = engineVarName(node);
    if (name) out.push({ node, kind: "engine", name });
  }
  const c14 = collectC14DerivedEngineDecls(fileAST) as unknown as AnyNode[];
  for (const node of c14) {
    const name = engineVarName(node);
    if (name) out.push({ node, kind: "engine", name });
  }

  // Types — `FileAST.typeDecls` (type-decl, `.name`).
  const typeDecls = Array.isArray(fileAST.typeDecls) ? (fileAST.typeDecls as AnyNode[]) : [];
  for (const node of typeDecls) {
    if (node && typeof node === "object") {
      const name = typeof node.name === "string" ? node.name : "";
      if (name) out.push({ node, kind: "type", name });
    }
  }

  // Channels — `FileAST.channelDecls` (markup `tag:"channel"`, name in attrs).
  const channelDecls = Array.isArray(fileAST.channelDecls) ? (fileAST.channelDecls as AnyNode[]) : [];
  for (const node of channelDecls) {
    if (node && typeof node === "object") {
      out.push({ node, kind: "channel", name: channelName(node) });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the in-memory block analysis for ONE file AST. Blocks are emitted in
 * SOURCE ORDER (`span.start` ascending) — a stable, deterministic order across
 * the heterogeneous collections we gather them from. A file with no named
 * blocks yields an honest-empty `blocks: []`.
 *
 * @param file   The orchestrator's per-file object. The live pipeline hands a
 *               WRAPPED `{ filePath, ast, _sourceText }` (the RAW file source on
 *               the OUTER object as `_sourceText`); a caller may also hand the
 *               AST directly with `.source` / `.preprocessedSource` set.
 * @param source Optional source text. When provided it wins; otherwise the
 *               RAW `_sourceText` on the outer object (then `.source` /
 *               `.preprocessedSource`) is used. `endLine` is derived exactly
 *               from the span slice when ANY source resolves, else falls back to
 *               the opener `line`. Pass the SAME source the spans index into
 *               (RAW, not `${...}`-expanded — see `sourceFromFile`).
 */
export function buildBlockAnalysisForFile(file: unknown, source?: string): BlockAnalysis {
  const fileAST = unwrapFileAST(file);
  if (!fileAST) return { version: 1, file: "", blocks: [] };

  const filePath = typeof fileAST.filePath === "string" ? fileAST.filePath : "";
  const relPath = relativeFilePath(filePath);

  // Resolve the source the span byte-offsets index into. An explicit `source`
  // arg wins; otherwise recover the RAW `_sourceText` the orchestrator threads
  // on the OUTER wrapped object (the inner `ast` carries no source field — that
  // is why the metaFiles-stage call previously collapsed `endLine` to `line`).
  const effectiveSource =
    typeof source === "string" ? source : sourceFromFile(file);

  const collected = collectBlocks(fileAST);
  const blocks = collected.map(({ node, kind, name }) =>
    projectBlock(node, kind, name, relPath, effectiveSource, fileAST),
  );

  // Source order: the load-bearing determinism axis. Byte offset `span.start`
  // ascending; tie-break on `id` so two blocks at the same offset (a malformed
  // edge case) still sort stably.
  blocks.sort((a, b) => {
    if (a.span.start !== b.span.start) return a.span.start - b.span.start;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return { version: 1, file: relPath, blocks };
}

/**
 * Build the block analysis for a SET of file ASTs (the orchestrator's per-file
 * `metaFiles`). Returns one `BlockAnalysis` per file, in file order. The emit
 * layer (D3) writes one sidecar per source file, so the per-file shape is what
 * the write-loop consumes.
 *
 * Each `file` is the WRAPPED `{ filePath, ast, _sourceText }` object the live
 * pipeline carries; `buildBlockAnalysisForFile` recovers the RAW `_sourceText`
 * off it (`sourceFromFile`) for exact `endLine` derivation. No explicit `source`
 * arg is threaded here — the source rides on the object itself.
 */
export function buildBlockAnalysis(files: unknown): BlockAnalysis[] {
  const list = Array.isArray(files) ? files : files != null ? [files] : [];
  return list.map((file) => buildBlockAnalysisForFile(file));
}

/**
 * Serialize a `BlockAnalysis` to a deterministic, pretty-printed JSON string
 * (2-space indent, trailing newline). The analysis is already built with stable
 * ordering; the fixed key-insertion order of the projection objects makes
 * `JSON.stringify` output byte-stable across compiles.
 *
 * An empty file serializes to `{\n  "version": 1,\n  "file": "",\n  "blocks": []\n}\n`.
 */
export function serializeBlockAnalysis(analysis: BlockAnalysis): string {
  return JSON.stringify(analysis, null, 2) + "\n";
}

/**
 * Convenience: build + serialize the block analysis for a SINGLE file. The emit
 * layer (D3) calls this once per source file to produce its `.block-analysis.json`
 * sidecar, mirroring `buildEngineGraphJson`'s lazy result-fn wiring in api.js.
 */
export function buildBlockAnalysisJson(file: unknown, source?: string): string {
  return serializeBlockAnalysis(buildBlockAnalysisForFile(file, source));
}
