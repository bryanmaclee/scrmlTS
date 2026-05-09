/**
 * Phase A1c Step C10 — Level-1 inline-message-override codegen emission.
 *
 * For every state-decl carrying a non-empty `validators[]` array where any
 * `validator.inlineOverride` is a non-null string, emit one
 * `_scrml_messages_register_inline(<cellName>, <validatorName>, <override>)`
 * call per such validator. The runtime helper lives in the `messages` chunk
 * (compiler/src/runtime-template.js — appended to SCRML_RUNTIME).
 *
 * The override slot is captured by B13 (resolver pass) onto
 * `validator.inlineOverride: string | null` and stripped from emitted args by
 * C7 (compiler/src/codegen/emit-validators.ts:280-296). This module ONLY
 * emits the L1 storage registration; messageFor's resolution chain is
 * runtime-only.
 *
 * Cross-references:
 *   - SPEC §55.10 (lines 25243-25301) — 4-level error message resolution
 *   - SPEC §55.9  (lines 25212-25241) — ValidationError enum (14 + Custom)
 *   - SPEC §41.12 (lines 17073-17115) — registerMessages API + messageFor
 *   - PA-SCRML-PRIMER §8 — validators + auto-synth surface
 *   - compiler/src/codegen/emit-validators.ts — C7 per-cell runner (sibling)
 *   - compiler/src/runtime-template.js — `messages` chunk runtime helpers
 *   - docs/changes/phase-a1c-step-c10-error-message-resolution/SURVEY.md
 *
 * # Skip rules
 *
 * Returns `null` (no emission) when any of the following are true:
 *   1. `node.validators` is null/undefined or empty array.
 *   2. No validator on the cell has a non-null string `inlineOverride`.
 *   3. `opts.boundary === "server"` — Level-1 storage is client-only (the
 *      runtime helper lives in the client runtime).
 *   4. `opts.insideFunctionBody` — reassignments don't re-register overrides.
 *
 * Unlike C7's emit-validators sidecar, this emitter does NOT skip top-level
 * non-compound cells (skip rule 7 of C7). Even if the cell's validator
 * runner doesn't fire (no per-field synth surface per §55.5 L11 Edge A), a
 * future codegen path (or user-explicit `messageFor` call) may still want
 * the inline override registered. Storage cost is one entry per override.
 *
 * # Cell-name key shape
 *
 * Per SURVEY §3d: `<cellName>::<validatorName>`. For top-level cells, the
 * cellName is the bare name; for compound children, it is the qualified path
 * (`signup.email`). The runtime helper concatenates `cellName + "::" +
 * validatorName` to form the storage key.
 */

interface EmitInlineMessagesOpts {
  /** Boundary (client/server). Server boundary skips emission. */
  boundary: "server" | "client";
  /** Inside-fn-body suppresses emission (mirrors C5/C7). */
  insideFunctionBody?: boolean;
}

/**
 * Emit Level-1 inline-override registrations for a state-decl, OR `null` if
 * the cell carries no overrides (or the skip preconditions match).
 *
 * The returned string is one or more newline-separated JS statements (no
 * trailing newline). Caller (`_appendSidecar` in emit-logic.ts) joins it
 * after the cell's primary `_scrml_reactive_set` registration, alongside C7's
 * validator runner sidecar.
 *
 * @param node — the state-decl AST node (must have `name`; `validators` array
 *               may be present)
 * @param qualifiedName — the cell's storage key (`compound.field` for compound
 *                        children; bare name for top-level)
 * @param opts — emission options
 */
export function emitInlineMessageOverrides(
  node: any,
  qualifiedName: string,
  opts: EmitInlineMessagesOpts,
): string | null {
  // Skip rule 1: no validators or empty array.
  const validators: any[] = Array.isArray(node?.validators) ? node.validators : [];
  if (validators.length === 0) return null;

  // Skip rule 3: server boundary.
  if (opts.boundary === "server") return null;

  // Skip rule 4: inside function body (reassignment, not declaration).
  if (opts.insideFunctionBody) return null;

  const lines: string[] = [];
  for (const v of validators) {
    if (!v || typeof v.name !== "string") continue;
    // Only emit when the inlineOverride slot is a non-null string.
    if (typeof v.inlineOverride !== "string") continue;
    lines.push(
      `_scrml_messages_register_inline(${JSON.stringify(qualifiedName)}, ${JSON.stringify(v.name)}, ${JSON.stringify(v.inlineOverride)});`,
    );
  }

  // Skip rule 2: no inline overrides found.
  if (lines.length === 0) return null;

  return lines.join("\n");
}
