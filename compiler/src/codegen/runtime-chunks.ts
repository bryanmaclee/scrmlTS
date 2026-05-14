/**
 * @module codegen/runtime-chunks
 *
 * RUNTIME_CHUNKS — named subsections of SCRML_RUNTIME for tree-shaking.
 *
 * Splits the monolithic SCRML_RUNTIME string into named chunks by searching
 * for unique section marker strings. Each chunk corresponds to a runtime
 * feature group. Chunks are assembled in `emit-client.ts` based on what the
 * compiled scrml file actually uses.
 *
 * Always-included chunks: 'core', 'scope', 'errors', 'transitions'
 * (Pre-populated in makeCompileContext() in context.ts.)
 *
 * Conditionally-included chunks: all others.
 * (Added by detectRuntimeChunks() in emit-client.ts.)
 *
 * Chunk → runtime functions:
 *   core          _scrml_state, _scrml_subscribers, _scrml_reactive_get/set/subscribe/propagate_dirty
 *   reset         _scrml_default_set/_fns, _scrml_init_set/_fns, _scrml_reset (§6.8)
 *   validators    14 universal-core fire functions, VALIDATOR_RUNTIME map,
 *                 _scrml_validator_fire (§55.1, C7) — inlined verbatim from
 *                 compiler/src/runtime-validators.js
 *   derived       _scrml_derived_declare/subscribe/get, flush
 *   lift          _scrml_lift
 *   scope         _scrml_cleanup_registry, _scrml_register_cleanup, _scrml_destroy_scope
 *   timers        _scrml_timer_start/stop/pause/resume/stop_scope_timers
 *   animation     _scrml_animation_frame, _scrml_cancel_animation_frames, animationFrame
 *   reconciliation _scrml_reconcile_list, _scrml_lis
 *   utilities     _scrml_deep_set, _scrml_reactive_debounced,
 *                 _scrml_reactive_throttled (S79 — §6.13 reactivity attr),
 *                 _scrml_reactivity_cancel + _scrml_reactivity_timers + _scrml_throttle_state
 *                 (S79 — per-cell timer registry; consumed by _scrml_reset for cancel-on-reset),
 *                 _scrml_reactive_explicit_set, _scrml_upload, _scrml_navigate
 *                 (S81 OQ-2 2026-05-11: `_scrml_debounce` + `_scrml_throttle`
 *                 RETIRED — imperative `debounce(fn,ms)`/`throttle(fn,ms)` keyword-
 *                 calls replaced by stdlib `scrml:time` imports. State-cell
 *                 timing still flows through the `_scrml_throttle_state` +
 *                 `_scrml_reactive_debounced`/`_scrml_reactive_throttled` path.)
 *   meta          _scrml_meta_emit, _scrml_tracking_stack, _scrml_meta_effect
 *   transitions   Transition CSS injection IIFE (scrml-fade/slide/fly animations)
 *   errors        _ScrmlError, NetworkError, ValidationError, SQLError, AuthError, etc.
 *   input         _scrml_input_keyboard/mouse/gamepad_create/destroy
 *   equality      _scrml_structural_eq
 *   deep_reactive _scrml_track, _scrml_trigger, _scrml_deep_reactive (Proxy),
 *                 _scrml_effect, _scrml_effect_static, _scrml_computed
 *   messages      _scrml_messages_inline/_registered, _scrml_messages_register,
 *                 _scrml_messages_register_inline, _scrml_message_for,
 *                 _SCRML_DEFAULT_MESSAGES, _SCRML_TAG_TO_VALIDATOR (§55.10, C10)
 *   engine        _scrml_engine_check_transition, _scrml_engine_advance,
 *                 _scrml_engine_direct_set (§51.0.F + §51.0.G, C13).
 *                 Tree-shaken when usage.engines is false.
 *   prefetch      _scrml_prefetch_tier1 (§40.9.7 tier-1 idle prefetch, A-4.3) +
 *                 _scrml_prefetch_tier2 + _SCRML_CHUNKS manifest scaffold
 *                 (§40.9.7 tier-2 hover prefetch, A-4.4) +
 *                 _scrml_fetch_chunk(epId, role, tier) (§40.9.7 tier-N
 *                 on-demand dispatch hook, A-4.5 — structurally shipped,
 *                 never fires in v0.3 per OQ-A2-B Option a + OQ-A4-D Option a).
 *
 *                 The `prefetch` chunk groups ALL THREE prefetch/dispatch
 *                 surfaces (tier-1 idle, tier-2 hover, tier-N on-demand)
 *                 under ONE tree-shake gate. Single-marker design (A-4.4 +
 *                 A-4.5 decision): adding sibling markers would let us
 *                 tree-shake the three functions independently, but in
 *                 practice apps that use any of them almost always use
 *                 at least tier-1. Single chunk keeps the marker table
 *                 simpler.
 *
 *                 Tree-shaken when ALL of:
 *                   • no chunk has non-empty tier-1 admission
 *                   • no chunk has non-empty tier-N admission
 *                   • no `<a data-scrml-prefetch>` was emitted in any
 *                     HTML file for this compile unit (i.e. no internal
 *                     `<a href>` linked to a known route).
 *                 `detectRuntimeChunks` reads `ctx.hasPrefetchableLinks`
 *                 (A-4.4; set by `emit-html.ts`) plus per-(EP, role)
 *                 tier-1 / tier-N admission scans (A-4.3 + A-4.5);
 *                 any signal lights up the chunk.
 *                 OQ-A4-G ratification (S91): Option γ — `requestIdleCallback`
 *                 browser-side with `setTimeout(fn, 1)` Safari fallback;
 *                 Bun-runtime primitive reserved as v0.4 extension point.
 */

import { SCRML_RUNTIME } from "../runtime-template.js";

// ---------------------------------------------------------------------------
// Chunk ordering — must match the order chunks appear in SCRML_RUNTIME.
// Assembly in emit-client.ts uses this order.
// ---------------------------------------------------------------------------

export const RUNTIME_CHUNK_ORDER = [
  'core',
  'reset',
  'validators',
  'derived',
  'lift',
  'scope',
  'timers',
  'animation',
  'reconciliation',
  'utilities',
  'prefetch',
  'meta',
  'transitions',
  'errors',
  'input',
  'equality',
  'deep_reactive',
  'messages',
  'engine',
] as const;

export type RuntimeChunkName = (typeof RUNTIME_CHUNK_ORDER)[number];

// ---------------------------------------------------------------------------
// Chunk boundary markers.
//
// Each value is a short substring that appears EXACTLY ONCE in SCRML_RUNTIME
// and marks the start of the corresponding chunk. 'core' has no marker —
// it is everything before the first boundary.
//
// SYNTAX SAFETY REQUIREMENT: Each marker must be at a position where:
//   1. The previous chunk ends with syntactically complete JavaScript, AND
//   2. The new chunk starts with syntactically complete JavaScript.
//
// Safe marker types:
//   - §X.X spec references in single-line comments (// §X.X ...).
//     The split happens after the '// ' prefix which stays in the previous chunk.
//     Both chunks have valid JS: previous ends with empty comment, new starts mid-comment.
//   - 'function _name' at function declaration starts.
//     Previous chunk ends after the preceding function's closing brace.
//     New chunk starts with a complete function declaration.
//
// UNSAFE: Splitting inside a block comment (/* ... */). The opening /* would
// be in the previous chunk without a closing */, causing a syntax error.
//
// These markers were verified against runtime-template.js on 2026-04-06.
// If the runtime is restructured, update these markers accordingly.
// ---------------------------------------------------------------------------

type NonCoreChunkName = Exclude<RuntimeChunkName, 'core'>;

const CHUNK_MARKERS: Record<NonCoreChunkName, string> = {
  // §X.X section header comments — each appears exactly once, in a // comment line.
  // Split position is mid-comment-line (after '// '). Both sides are valid JS.
  reset:          "§6.8 reset+default runtime (chunk: 'reset')",
  validators:     "§55.1 Validator predicate runtime catalog (chunk: 'validators')",
  derived:        '§6.6 Derived reactive runtime',
  scope:          '§6.7.3 Scope-aware cleanup registry',
  timers:         '§6.7.5 / §6.7.6 Timer and Poll runtime',
  animation:      '§6.7.7 animationFrame runtime',
  // Section marker covers BOTH §40.9.7 tier-1 idle-prefetch (A-4.3) AND
  // §40.9.7 tier-2 hover-prefetch (A-4.4). The chunk's content runs from
  // the tier-1 marker through to the next chunk's marker (`meta`); both
  // runtime functions plus the `_SCRML_CHUNKS` manifest scaffold sit in
  // that range. See chunk-catalog block above for the single-marker
  // rationale.
  prefetch:       "§40.9.7 tier-1 idle prefetch runtime (chunk: 'prefetch')",
  meta:           '§22.5 meta.emit() runtime',
  transitions:    'Transition CSS injection',
  errors:         '§19 Built-in error types',
  input:          '§35.1 Global input state registry',
  equality:       '§45 Structural equality',
  deep_reactive:  'Fine-grained reactivity primitives (Reactivity Phase 1)',
  messages:       "§55.10 Error message resolution runtime (chunk: 'messages')",
  engine:         "§51.0.F + §51.0.G Engine state-machine runtime hooks (chunk: 'engine')",

  // Function definition markers — 'function _name' starts at a line boundary.
  // Previous chunk ends after the preceding function/IIFE closing brace.
  // New chunk starts with a complete function declaration. Both sides are valid JS.
  lift:           'function _scrml_lift',
  reconciliation: 'function _scrml_reconcile_list',
  utilities:      'function _scrml_deep_set',
};

// ---------------------------------------------------------------------------
// buildRuntimeChunks — splits SCRML_RUNTIME into named chunk strings.
// ---------------------------------------------------------------------------

function buildRuntimeChunks(): Record<RuntimeChunkName, string> {
  // Locate each chunk boundary in SCRML_RUNTIME
  const positions: Array<{ name: NonCoreChunkName; idx: number }> = [];

  for (const [name, marker] of Object.entries(CHUNK_MARKERS) as Array<[NonCoreChunkName, string]>) {
    const idx = SCRML_RUNTIME.indexOf(marker);
    if (idx === -1) {
      // Warn but don't crash — a missing marker means the chunk falls back to
      // the previous chunk boundary, and the runtime still works (just not tree-shaken).
      // This should never happen unless runtime-template.js was edited without
      // updating CHUNK_MARKERS.
      if (typeof console !== "undefined") {
        console.warn(`[scrml runtime-chunks] Marker not found for chunk "${name}": "${marker}". Tree-shaking will be disabled for this chunk.`);
      }
      continue;
    }
    positions.push({ name, idx });
  }

  // Sort by ascending position
  positions.sort((a, b) => a.idx - b.idx);

  const chunks: Partial<Record<RuntimeChunkName, string>> = {};

  // 'core' is everything before the first boundary
  chunks.core = positions.length > 0
    ? SCRML_RUNTIME.slice(0, positions[0].idx)
    : SCRML_RUNTIME;

  // Each subsequent chunk runs from its marker start to the next marker's start
  for (let i = 0; i < positions.length; i++) {
    const chunkStart = positions[i].idx;
    const chunkEnd = i + 1 < positions.length ? positions[i + 1].idx : SCRML_RUNTIME.length;
    chunks[positions[i].name] = SCRML_RUNTIME.slice(chunkStart, chunkEnd);
  }

  // Fill in any chunks that had missing markers with empty string
  // so downstream code doesn't crash on undefined access.
  for (const name of RUNTIME_CHUNK_ORDER) {
    if (chunks[name] === undefined) {
      chunks[name] = '';
    }
  }

  return chunks as Record<RuntimeChunkName, string>;
}

export const RUNTIME_CHUNKS: Record<RuntimeChunkName, string> = buildRuntimeChunks();

// ---------------------------------------------------------------------------
// assembleRuntime — produce the runtime string from a set of chunk names.
//
// Chunks are assembled in RUNTIME_CHUNK_ORDER so the output is always in the
// correct dependency order regardless of the order chunks were registered.
// ---------------------------------------------------------------------------

export function assembleRuntime(chunkNames: Set<string>): string {
  return RUNTIME_CHUNK_ORDER
    .filter(name => chunkNames.has(name))
    .map(name => RUNTIME_CHUNKS[name] ?? '')
    .join('');
}
