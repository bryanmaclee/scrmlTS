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
 *   derived       _scrml_derived_declare/subscribe/get, flush
 *   lift          _scrml_lift
 *   scope         _scrml_cleanup_registry, _scrml_register_cleanup, _scrml_destroy_scope
 *   timers        _scrml_timer_start/stop/pause/resume/stop_scope_timers
 *   animation     _scrml_animation_frame, _scrml_cancel_animation_frames, animationFrame
 *   reconciliation _scrml_reconcile_list, _scrml_lis
 *   utilities     _scrml_deep_set, _scrml_debounce, _scrml_throttle, _scrml_reactive_debounced,
 *                 _scrml_reactive_explicit_set, _scrml_upload, _scrml_navigate
 *   meta          _scrml_meta_emit, _scrml_tracking_stack, _scrml_meta_effect
 *   transitions   Transition CSS injection IIFE (scrml-fade/slide/fly animations)
 *   errors        _ScrmlError, NetworkError, ValidationError, SQLError, AuthError, etc.
 *   input         _scrml_input_keyboard/mouse/gamepad_create/destroy
 *   equality      _scrml_structural_eq
 *   deep_reactive _scrml_track, _scrml_trigger, _scrml_deep_reactive (Proxy),
 *                 _scrml_effect, _scrml_effect_static, _scrml_computed
 */

import { SCRML_RUNTIME } from "../runtime-template.js";

// ---------------------------------------------------------------------------
// Chunk ordering — must match the order chunks appear in SCRML_RUNTIME.
// Assembly in emit-client.ts uses this order.
// ---------------------------------------------------------------------------

export const RUNTIME_CHUNK_ORDER = [
  'core',
  'derived',
  'lift',
  'scope',
  'timers',
  'animation',
  'reconciliation',
  'utilities',
  'meta',
  'transitions',
  'errors',
  'input',
  'equality',
  'deep_reactive',
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
  derived:        '§6.6 Derived reactive runtime',
  scope:          '§6.7.3 Scope-aware cleanup registry',
  timers:         '§6.7.5 / §6.7.6 Timer and Poll runtime',
  animation:      '§6.7.7 animationFrame runtime',
  meta:           '§22.5 meta.emit() runtime',
  transitions:    'Transition CSS injection',
  errors:         '§19 Built-in error types',
  input:          '§35.1 Global input state registry',
  equality:       '§45 Structural equality',
  deep_reactive:  'Fine-grained reactivity primitives (Reactivity Phase 1)',

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
