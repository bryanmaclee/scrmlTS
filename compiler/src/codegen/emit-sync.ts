/**
 * §52.6 Compiler-Generated Sync Infrastructure
 *
 * Emits the three pieces of sync infrastructure for `server @var` declarations:
 *   1. `emitInitialLoad`      — async IIFE to fetch initial value on mount
 *   2. `emitOptimisticUpdate` — reactive subscriber with try/catch rollback
 *   3. `emitServerSyncStub`   — placeholder server sync function (follow-up: real route)
 *
 * Only Tier 2 (`server @var = loadFn()`) is implemented here. Tier 1 (type-level
 * authority with `table=`) requires server route generation and is a follow-up task.
 *
 * Generated output is appended to client JS by emitReactiveWiring after the
 * top-level logic statements pass (Step 4b).
 */

// ---------------------------------------------------------------------------
// §52.6.1 Initial Load
// ---------------------------------------------------------------------------

/**
 * Emit an async IIFE that populates the server-authoritative variable on mount.
 *
 * Strategy:
 *   - If `initExpr` contains a function call (has `(`), treat it as the load
 *     function. Await it and set the reactive variable.
 *   - If `initExpr` has no function call, this is a literal placeholder
 *     (e.g. `server @count = 0`). The type system already emitted W-AUTH-001.
 *     No async load is generated — return empty lines.
 *
 * §52.4.3: The initExpr is the CLIENT-SIDE PLACEHOLDER shown while loading.
 * The async IIFE replaces the placeholder with the authoritative value once
 * the server responds.
 *
 * Pattern:
 * ```javascript
 * // server @varName — initial load on mount (§52.6.1)
 * (async () => {
 *   _scrml_reactive_set("varName", await (loadFn()));
 * })();
 * ```
 *
 * @param varName  - reactive variable name (no `@` prefix)
 * @param initExpr - raw initializer expression from the reactive-decl node
 */
export function emitInitialLoad(varName: string, initExpr: string): string[] {
  // If no function call detected in initExpr, no initial load is generated.
  // W-AUTH-001 was already emitted by the type system for this case.
  if (!initExpr || !initExpr.includes("(")) {
    return [];
  }

  const varJs = JSON.stringify(varName);

  return [
    `// server @${varName} — initial load on mount (§52.6.1)`,
    `(async () => {`,
    `  _scrml_reactive_set(${varJs}, await (${initExpr}));`,
    `})();`,
  ];
}

// ---------------------------------------------------------------------------
// §52.6.2 Optimistic Update + §52.6.3 Rollback on Error
// ---------------------------------------------------------------------------

/**
 * Emit a reactive subscriber that performs optimistic update with rollback.
 *
 * When client code assigns to a `server @var`, the assignment goes through
 * `_scrml_reactive_set`. This subscriber detects the new value and:
 *   1. Captures the previous value (for rollback)
 *   2. Calls the server sync stub to persist the new value
 *   3. On error: restores the previous value (rollback)
 *
 * A module-level `_scrml_prev_varName` variable tracks the last-known-good
 * value before each assignment. On rollback, the state is restored and the
 * tracking variable is reset.
 *
 * Pattern:
 * ```javascript
 * // server @varName — optimistic update + rollback (§52.6.2, §52.6.3)
 * let _scrml_prev_varName = _scrml_reactive_get("varName");
 * _scrml_reactive_subscribe("varName", async function(_scrml_next_varName) {
 *   const _scrml_rollback_varName = _scrml_prev_varName;
 *   _scrml_prev_varName = _scrml_next_varName;
 *   try {
 *     await _scrml_server_sync_varName(_scrml_next_varName);
 *   } catch (_e) {
 *     _scrml_reactive_set("varName", _scrml_rollback_varName);
 *     _scrml_prev_varName = _scrml_rollback_varName;
 *   }
 * });
 * ```
 *
 * @param varName - reactive variable name (no `@` prefix)
 */
export function emitOptimisticUpdate(varName: string): string[] {
  const varJs = JSON.stringify(varName);
  const nextArg = `_scrml_next_${varName}`;
  const prevVar = `_scrml_prev_${varName}`;
  const rollbackVar = `_scrml_rollback_${varName}`;
  const syncFn = `_scrml_server_sync_${varName}`;

  return [
    `// server @${varName} — optimistic update + rollback (§52.6.2, §52.6.3)`,
    `let ${prevVar} = _scrml_reactive_get(${varJs});`,
    `_scrml_reactive_subscribe(${varJs}, async function(${nextArg}) {`,
    `  const ${rollbackVar} = ${prevVar};`,
    `  ${prevVar} = ${nextArg};`,
    `  try {`,
    `    await ${syncFn}(${nextArg});`,
    `  } catch (_e) {`,
    `    _scrml_reactive_set(${varJs}, ${rollbackVar});`,
    `    ${prevVar} = ${rollbackVar};`,
    `  }`,
    `});`,
  ];
}

// ---------------------------------------------------------------------------
// §52.6 Server Sync Stub
// ---------------------------------------------------------------------------

/**
 * Emit a client-side stub for the server sync function.
 *
 * This stub will be replaced by a real server route fetch call when Tier 1
 * server route generation is implemented (follow-up task in emit-server.ts).
 * For now it logs a warning so developers know sync is not yet wired.
 *
 * The stub is named `_scrml_server_sync_<varName>` and accepts the new value.
 * It is called by the optimistic update subscriber (emitOptimisticUpdate).
 *
 * Pattern:
 * ```javascript
 * // TODO: replace with real server route fetch (§52.6.2 follow-up)
 * async function _scrml_server_sync_varName(value) {
 *   // POST /_scrml/sync/varName — not yet wired
 *   console.warn("scrml: server sync stub for @varName (not yet wired)");
 * }
 * ```
 *
 * @param varName - reactive variable name (no `@` prefix)
 */
export function emitServerSyncStub(varName: string): string[] {
  const syncFn = `_scrml_server_sync_${varName}`;
  const routePath = `/_scrml/sync/${varName}`;

  return [
    `// TODO: replace with real server route fetch (§52.6.2 follow-up)`,
    `async function ${syncFn}(value) {`,
    `  // POST ${routePath} — server sync route not yet wired`,
    `  console.warn(${JSON.stringify(`scrml: server sync stub for @${varName} (not yet wired)`)});`,
    `}`,
  ];
}
