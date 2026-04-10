/**
 * @module serve-client
 * Client helper for the persistent scrml compiler server.
 *
 * Checks if the serve process is running and sends compile requests to it,
 * falling back to direct compilation if the server isn't available.
 *
 * Usage:
 *   import { compileViaServer } from "./serve-client.js";
 *   const result = await compileViaServer({ inputFiles: [...], outputDir: "dist" });
 */

import { compileScrml } from "./api.js";

const DEFAULT_PORT = 3100;

/**
 * Get the server URL from environment or default.
 * @returns {string}
 */
function getServerUrl() {
  const port = parseInt(process.env.SCRML_PORT ?? String(DEFAULT_PORT), 10);
  return `http://localhost:${port}`;
}

/**
 * Check if the compiler server is running.
 *
 * @param {string} [serverUrl] — override server URL
 * @returns {Promise<boolean>}
 */
export async function isServerRunning(serverUrl) {
  const url = serverUrl || getServerUrl();
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(500) });
    if (res.ok) {
      const data = await res.json();
      return data.status === "ok";
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Get server health info.
 *
 * @param {string} [serverUrl] — override server URL
 * @returns {Promise<{ status: string, uptime: number, compilations: number, memoryMB: number } | null>}
 */
export async function getServerHealth(serverUrl) {
  const url = serverUrl || getServerUrl();
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

/**
 * Compile via the persistent server, falling back to direct compilation
 * if the server is not running.
 *
 * @param {object} options
 * @param {string[]} options.inputFiles       — .scrml file paths to compile
 * @param {string}  [options.outputDir]       — output directory
 * @param {boolean} [options.verbose]         — per-stage timing
 * @param {boolean} [options.convertLegacyCss]
 * @param {boolean} [options.embedRuntime]
 * @param {boolean} [options.write]           — write output files (default true)
 * @param {string}  [options.serverUrl]       — override server URL
 *
 * @returns {Promise<{
 *   errors: object[],
 *   warnings: object[],
 *   fileCount: number,
 *   outputDir: string,
 *   durationMs: number,
 *   outputs: object,
 *   usedServer: boolean
 * }>}
 */
export async function compileViaServer(options = {}) {
  const {
    inputFiles = [],
    outputDir,
    verbose = false,
    convertLegacyCss = false,
    embedRuntime = false,
    write = true,
    serverUrl,
  } = options;

  const url = serverUrl || getServerUrl();

  // Try the server first
  const running = await isServerRunning(url);

  if (running) {
    try {
      const res = await fetch(`${url}/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputFiles,
          outputDir,
          options: { verbose, convertLegacyCss, embedRuntime, write },
        }),
        signal: AbortSignal.timeout(30000), // 30s timeout for compilation
      });

      if (res.ok) {
        const result = await res.json();
        return { ...result, usedServer: true };
      }

      // Server returned an error — fall through to direct compilation
      const err = await res.json().catch(() => ({}));
      if (verbose) {
        console.warn(`[serve-client] Server returned ${res.status}: ${err.error || "unknown error"}, falling back to direct compilation`);
      }
    } catch (fetchErr) {
      if (verbose) {
        console.warn(`[serve-client] Server request failed: ${fetchErr.message}, falling back to direct compilation`);
      }
    }
  }

  // Fallback: direct compilation
  const result = compileScrml({
    inputFiles,
    outputDir,
    verbose,
    convertLegacyCss,
    embedRuntime,
    write,
    log: verbose ? console.log : () => {},
  });

  // Convert outputs Map to plain object for consistency
  const outputsObj = {};
  if (result.outputs) {
    for (const [filePath, output] of result.outputs) {
      outputsObj[filePath] = output;
    }
  }

  return {
    errors: result.errors,
    warnings: result.warnings,
    fileCount: result.fileCount,
    outputDir: result.outputDir,
    durationMs: result.durationMs,
    outputs: outputsObj,
    usedServer: false,
  };
}

/**
 * Shut down the compiler server.
 *
 * @param {string} [serverUrl] — override server URL
 * @returns {Promise<boolean>} — true if shutdown was acknowledged
 */
export async function shutdownServer(serverUrl) {
  const url = serverUrl || getServerUrl();
  try {
    const res = await fetch(`${url}/shutdown`, {
      method: "POST",
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
