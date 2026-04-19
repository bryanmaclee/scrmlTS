/**
 * Test helper — extract the names of user-defined top-level functions from a
 * compiled client.js, filtering out compiler-internal helpers.
 *
 * Why this exists:
 *   The compiler mangles user function names through `genVar(name)`
 *   (compiler/src/codegen/var-counter.ts) which produces `_scrml_<safe>_<N>`
 *   where N is a per-compile counter. Tests that want to invoke a user
 *   function by its mangled form scan the compiled JS for top-level
 *   `function _scrml_<id>` declarations.
 *
 *   The trap: the compiler ALSO emits internal helpers under the same
 *   `_scrml_*` prefix (e.g. `_scrml_effect`, `_scrml_reactive_set`,
 *   `_scrml_machine_arm_timer`, …). A naive "anything matching `_scrml_`"
 *   filter would invoke compiler internals as if they were user code.
 *
 *   The other trap (the gotcha noted in S27 wrap, fixed S28): some internal-
 *   helper names are bare words like `_scrml_effect`, `_scrml_reflect`,
 *   `_scrml_lift`. A user function named `effect` mangles to
 *   `_scrml_effect_5` — same prefix as the internal `_scrml_effect`. A
 *   permissive regex like `/^_scrml_effect/` excludes both, so a user
 *   function named `effect` would silently disappear from the test's
 *   user-fn list. The negative lookahead `(?!_\d)` after each bare-word
 *   keyword excludes the internal helper but lets the suffixed user form
 *   through.
 *
 * Centralized so the regex is maintained in one place when new internal
 * helpers are added to the runtime template.
 */

/**
 * Names of internal helpers that the compiler emits as top-level
 * `function _scrml_…` declarations in compiled client.js. Two flavors:
 *
 *   1. Names ending with `_` (or containing `_`) — `_scrml_project_<Name>`,
 *      `_scrml_machine_arm_timer`, `_scrml_reactive_set`. These can never
 *      collide with mangled user functions because user names containing
 *      `_<digit>` would themselves be unusual scrml identifiers, and the
 *      mangle suffix is always `_<digit>`. We match the prefix without
 *      lookahead.
 *
 *   2. Bare-word internal names like `_scrml_effect`, `_scrml_reflect`,
 *      `_scrml_navigate`, `_scrml_subscribe`, `_scrml_track`, `_scrml_trigger`,
 *      `_scrml_lift`. A user function named after one of these mangles to
 *      `_scrml_<name>_<N>`. The `(?!_\d)` lookahead distinguishes the
 *      internal name (no `_<digit>` suffix) from the mangled user form.
 */
const INTERNAL_HELPER_PATTERN = new RegExp(
  "^_scrml_(" +
    // Suffix-style helpers (name ends with `_`, then a specifier follows)
    "project_|" +
    "derived_|" +
    "session_|" +
    "auth_|" +
    "cors_|" +
    "server_sync_|" +
    "machine_|" +
    "reactive_|" +
    "meta_|" +
    "deep_|" +
    "propagate_|" +
    "reconcile_|" +
    "destroy_|" +
    "register_|" +
    "timer_|" +
    "animation_|" +
    "stop_|" +
    // Bare-word helpers — guard against `_<digit>` suffix that would
    // indicate a mangled user function (`_scrml_effect_5`, `_scrml_lift_3`).
    "reflect(?!_\\d)|" +
    "navigate(?!_\\d)|" +
    "subscribe(?!_\\d)|" +
    "track(?!_\\d)|" +
    "trigger(?!_\\d)|" +
    "effect(?!_\\d)|" +
    "lift(?!_\\d)|" +
    "replay(?!_\\d)|" +
    "debounce(?!_\\d)|" +
    "throttle(?!_\\d)|" +
    "upload(?!_\\d)|" +
    "lis(?!_\\d)|" +
    // CSRF / utility — these have arbitrary tails (no `_<digit>` suffix
    // because they're hand-written, not mangled).
    "generate_csrf|" +
    "validate_csrf|" +
    "ensure_csrf" +
  ")"
);

/**
 * Scan compiled client.js for top-level `function _scrml_…` declarations
 * and return only those that look like mangled user functions (not matching
 * an internal-helper pattern). Accepts any signature — zero-arg AND
 * parameter-bearing functions qualify.
 *
 * @param {string} clientJs — compiled client.js source
 * @returns {string[]} — list of mangled user-function names in source order
 */
export function extractUserFns(clientJs) {
  const allFns = [...clientJs.matchAll(/^function (_scrml_[A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{/gm)]
    .map(m => m[1]);
  return allFns.filter(n => !INTERNAL_HELPER_PATTERN.test(n));
}
