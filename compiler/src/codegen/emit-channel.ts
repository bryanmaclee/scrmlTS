import { genVar } from "./var-counter.ts";
import { emitLogicNode } from "./emit-logic.js";
import { CGError } from "./errors.ts";

/**
 * §35 `<channel>` — WebSocket state type codegen.
 *
 * `<channel>` is a lifecycle markup element that generates persistent WebSocket
 * infrastructure. It emits no HTML. Like `<timer>` and `<poll>`, the AST node is
 * `kind: "markup", tag: "channel"`.
 *
 * Three codegen functions are exported:
 *
 * 1. `collectChannelNodes(nodes)` — walk AST, collect all channel markup nodes
 * 2. `emitChannelClientJs(node, errors, filePath)` — client-side WebSocket setup
 * 3. `emitChannelServerJs(node, errors, filePath)` — server-side upgrade route
 * 4. `emitChannelWsHandlers(nodes, errors, filePath)` — merged Bun.serve() websocket: block
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChannelAttrs {
  name: string;
  safeName: string;
  topic: string;
  reconnectMs: number;
  hasProtect: boolean;
  hasPresence: boolean;
}

interface ChannelHandlers {
  open: string | null;
  message: string | null;
  close: string | null;
}

// ---------------------------------------------------------------------------
// Channel node collection
// ---------------------------------------------------------------------------

/**
 * Walk an AST node tree and collect all `<channel>` markup nodes.
 */
export function collectChannelNodes(nodes: any[]): any[] {
  const result: any[] = [];

  function visit(nodeList: any[]): void {
    for (const node of nodeList) {
      if (!node || typeof node !== "object") continue;

      if (node.kind === "markup") {
        if ((node.tag ?? "") === "channel") {
          result.push(node);
        }
        if (Array.isArray(node.children)) {
          visit(node.children);
        }
        continue;
      }

      if (node.kind === "logic" && Array.isArray(node.body)) {
        continue;
      }

      if (Array.isArray(node.children)) {
        visit(node.children);
      }
    }
  }

  visit(nodes);
  return result;
}

// ---------------------------------------------------------------------------
// Channel attribute extraction helpers
// ---------------------------------------------------------------------------

/**
 * Extract channel attributes from a `<channel>` markup node.
 */
function extractChannelAttrs(node: any): ChannelAttrs {
  const attrs: any[] = node.attrs ?? node.attributes ?? [];
  const attrMap = new Map<string, any>(attrs.map((a: any) => [a.name, a]));

  const nameAttr = attrMap.get("name");
  let name = "channel";
  if (nameAttr) {
    const v = nameAttr.value;
    if (v?.kind === "string-literal") name = v.value;
    else if (v?.kind === "variable-ref") name = (v.name ?? "").replace(/^@/, "");
    else if (typeof v === "string") name = v;
  }

  const safeName = name.replace(/[^a-zA-Z0-9_]/g, "_");

  const topicAttr = attrMap.get("topic");
  let topic = name;
  if (topicAttr) {
    const v = topicAttr.value;
    if (v?.kind === "string-literal") topic = v.value;
    else if (v?.kind === "variable-ref") topic = (v.name ?? "").replace(/^@/, "");
    else if (typeof v === "string") topic = v;
  }

  const reconnAttr = attrMap.get("reconnect");
  let reconnectMs = 2000;
  if (reconnAttr) {
    const v = reconnAttr.value;
    const raw = v?.kind === "string-literal" ? v.value : (v?.name ?? "").replace(/^@/, "");
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 0) reconnectMs = parsed;
  }

  const hasProtect = attrMap.has("protect");
  const hasPresence = attrMap.has("presence");

  return { name, safeName, topic, reconnectMs, hasProtect, hasPresence };
}

/**
 * Extract `onserver:` lifecycle attribute handlers from a channel node.
 */
function extractChannelHandlers(node: any): ChannelHandlers {
  const attrs: any[] = node.attrs ?? node.attributes ?? [];
  const attrMap = new Map<string, any>(attrs.map((a: any) => [a.name, a]));

  function attrToCall(attr: any): string | null {
    if (!attr) return null;
    const v = attr.value;
    if (!v) return null;
    if (v.kind === "call") return `${v.name}(${v.args ?? ""})`;
    if (v.kind === "variable-ref") return `${v.name}()`;
    if (v.kind === "string-literal") return v.value;
    return null;
  }

  return {
    open: attrToCall(attrMap.get("onserver:open")),
    message: attrToCall(attrMap.get("onserver:message")),
    close: attrToCall(attrMap.get("onserver:close")),
  };
}

/**
 * Extract `@shared` variable names from a channel node's children.
 */
export function extractSharedVars(node: any): string[] {
  const shared: string[] = [];
  const children: any[] = node.children ?? [];

  function walkForShared(nodeList: any[]): void {
    for (const n of nodeList) {
      if (!n || typeof n !== "object") continue;
      if (n.kind === "reactive-decl" && n.isShared === true) {
        shared.push(n.name ?? "");
      }
      if (Array.isArray(n.children)) walkForShared(n.children);
      if (n.kind === "logic" && Array.isArray(n.body)) walkForShared(n.body);
    }
  }

  walkForShared(children);
  return shared.filter(Boolean);
}

// ---------------------------------------------------------------------------
// Client JS emission
// ---------------------------------------------------------------------------

/**
 * Emit client-side JavaScript for a single `<channel>` node.
 */
export function emitChannelClientJs(node: any, errors: CGError[], filePath: string): string[] {
  const lines: string[] = [];
  const { name, safeName, topic, reconnectMs } = extractChannelAttrs(node);
  const { open: openHandler, message: msgHandler } = extractChannelHandlers(node);
  const sharedVars = extractSharedVars(node);

  const varName = `_scrml_ws_${safeName}`;
  const wsVar = "_ws";
  const reconnVar = "_reconn";
  const connectFn = "_connect";

  lines.push(`// <channel name="${name}" topic="${topic}"> — WebSocket client (§35)`);
  lines.push(`const ${varName} = (() => {`);
  lines.push(`  let ${wsVar}, ${reconnVar};`);
  lines.push(`  function ${connectFn}() {`);
  lines.push(`    ${wsVar} = new WebSocket(\`ws://\${location.host}/_scrml_ws/${safeName}\`);`);

  if (openHandler) {
    lines.push(`    ${wsVar}.onopen = () => { ${openHandler}; };`);
  } else {
    lines.push(`    ${wsVar}.onopen = () => {};`);
  }

  lines.push(`    ${wsVar}.onmessage = (e) => {`);
  lines.push(`      try {`);
  lines.push(`        const _d = JSON.parse(e.data);`);

  if (sharedVars.length > 0) {
    lines.push(`        if (_d.__type === "__sync") {`);
    lines.push(`          // @shared variable sync from server`);
    for (const varN of sharedVars) {
      lines.push(`          if (_d.__key === ${JSON.stringify(varN)}) _scrml_reactive_set(${JSON.stringify(varN)}, _d.__val);`);
    }
    lines.push(`          return;`);
    lines.push(`        }`);
  }

  if (msgHandler) {
    lines.push(`        ${msgHandler};`);
  }

  lines.push(`      } catch (_e) {}`);
  lines.push(`    };`);

  if (reconnectMs > 0) {
    lines.push(`    ${wsVar}.onclose = () => { ${reconnVar} = setTimeout(${connectFn}, ${reconnectMs}); };`);
  } else {
    lines.push(`    ${wsVar}.onclose = () => {};`);
  }

  lines.push(`  }`);
  lines.push(`  ${connectFn}();`);
  lines.push(`  _scrml_register_cleanup(() => { ${wsVar}?.close(); clearTimeout(${reconnVar}); });`);
  lines.push(`  return {`);
  lines.push(`    send: (d) => ${wsVar}?.readyState === 1 && ${wsVar}.send(JSON.stringify(d)),`);
  lines.push(`    close: () => ${wsVar}?.close(),`);

  if (sharedVars.length > 0) {
    lines.push(`    syncShared: (key, val) => ${wsVar}?.readyState === 1 &&`);
    lines.push(`      ${wsVar}.send(JSON.stringify({ __type: "__sync", __key: key, __val: val })),`);
  }

  lines.push(`  };`);
  lines.push(`})();`);

  if (sharedVars.length > 0) {
    lines.push(`// @shared effects for <channel name="${name}">`);
    for (const varN of sharedVars) {
      lines.push(`_scrml_effect(() => ${varName}.syncShared(${JSON.stringify(varN)}, _scrml_reactive_get(${JSON.stringify(varN)})));`);
    }
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Server route emission
// ---------------------------------------------------------------------------

/**
 * Emit server-side JavaScript for a single `<channel>` node.
 */
export function emitChannelServerJs(node: any, errors: CGError[], filePath: string, hasAuth = false): string[] {
  const lines: string[] = [];
  const { name, safeName, topic, hasProtect } = extractChannelAttrs(node);

  const path = `/_scrml_ws/${safeName}`;

  lines.push(`// <channel name="${name}"> — WebSocket upgrade route (§35)`);
  lines.push(`routes.push({`);
  lines.push(`  path: ${JSON.stringify(path)},`);
  lines.push(`  method: "GET",`);
  lines.push(`  isWebSocket: true,`);
  lines.push(`  handler: (req, server) => {`);

  if (hasAuth || hasProtect) {
    lines.push(`    // Auth check for WebSocket upgrade`);
    lines.push(`    const _authResult = _scrml_auth_check(req);`);
    lines.push(`    if (_authResult) return _authResult;`);
  }

  lines.push(`    const ok = server.upgrade(req, { data: { __ch: ${JSON.stringify(name)}, __topic: ${JSON.stringify(topic)} } });`);
  lines.push(`    return ok ? undefined : new Response("WebSocket upgrade failed", { status: 400 });`);
  lines.push(`  },`);
  lines.push(`});`);

  return lines;
}

// ---------------------------------------------------------------------------
// WebSocket handlers object emission
// ---------------------------------------------------------------------------

/**
 * Emit the merged `_scrml_ws_handlers` export for all channels in a file.
 */
export function emitChannelWsHandlers(channelNodes: any[], errors: CGError[], filePath: string): string[] {
  if (channelNodes.length === 0) return [];

  const lines: string[] = [];
  lines.push(`// WebSocket handlers for ${channelNodes.length} channel(s) — passed to Bun.serve() websocket:`);
  lines.push(`export const _scrml_ws_handlers = {`);

  // open
  lines.push(`  open(ws) {`);
  lines.push(`    ws.subscribe(ws.data.__topic);`);
  for (const node of channelNodes) {
    const { name } = extractChannelAttrs(node);
    const { open: openHandler } = extractChannelHandlers(node);
    if (openHandler) {
      lines.push(`    if (ws.data.__ch === ${JSON.stringify(name)}) { ${openHandler}; }`);
    }
  }
  lines.push(`  },`);

  // message
  lines.push(`  message(ws, raw) {`);
  lines.push(`    try {`);
  lines.push(`      const d = JSON.parse(raw);`);
  lines.push(`      const __ch = ws.data.__ch;`);
  for (const node of channelNodes) {
    const { name } = extractChannelAttrs(node);
    const { message: msgHandler } = extractChannelHandlers(node);
    const sharedVars = extractSharedVars(node);

    lines.push(`      if (__ch === ${JSON.stringify(name)}) {`);

    if (sharedVars.length > 0) {
      lines.push(`        if (d.__type === "__sync") {`);
      lines.push(`          // Broadcast @shared sync to all other subscribers`);
      lines.push(`          ws.publish(ws.data.__topic, raw);`);
      lines.push(`          return;`);
      lines.push(`        }`);
    }

    if (msgHandler) {
      lines.push(`        ${msgHandler};`);
    }

    lines.push(`      }`);
  }
  lines.push(`    } catch (_e) {}`);
  lines.push(`  },`);

  // close
  lines.push(`  close(ws) {`);
  lines.push(`    ws.unsubscribe(ws.data.__topic);`);
  for (const node of channelNodes) {
    const { name } = extractChannelAttrs(node);
    const { close: closeHandler } = extractChannelHandlers(node);
    if (closeHandler) {
      lines.push(`    if (ws.data.__ch === ${JSON.stringify(name)}) { ${closeHandler}; }`);
    }
  }
  lines.push(`  },`);

  lines.push(`};`);

  return lines;
}
