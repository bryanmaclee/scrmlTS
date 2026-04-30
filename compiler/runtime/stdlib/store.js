// scrml:store — runtime shim
//
// Hand-written ES module mirroring stdlib/store/kv.scrml. SQLite-backed
// key-value store via bun:sqlite.
//
// Surface:
//   - createStore(dbPath, namespace?)        → store handle
//   - createSessionStore(dbPath)             → store handle (namespace="session")
//   - createCounter(dbPath, namespace?)      → counter handle
//
// All operations require Bun (uses bun:sqlite). In a browser context any call
// will throw because `bun:sqlite` cannot be imported.

import { Database } from "bun:sqlite";

function _initDb(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS kv_store (
      namespace TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at INTEGER,
      PRIMARY KEY (namespace, key)
    )
  `);
}

export function createStore(dbPath, namespace) {
  const ns = namespace || "default";
  const db = new Database(dbPath);
  _initDb(db);

  const stmtGet = db.prepare(
    "SELECT value, expires_at FROM kv_store WHERE namespace = ? AND key = ?"
  );
  const stmtSet = db.prepare(
    "INSERT OR REPLACE INTO kv_store (namespace, key, value, expires_at) VALUES (?, ?, ?, ?)"
  );
  const stmtDelete = db.prepare(
    "DELETE FROM kv_store WHERE namespace = ? AND key = ?"
  );
  const stmtKeys = db.prepare(
    "SELECT key FROM kv_store WHERE namespace = ? AND (expires_at IS NULL OR expires_at > ?)"
  );
  const stmtKeysPrefix = db.prepare(
    "SELECT key FROM kv_store WHERE namespace = ? AND key LIKE ? ESCAPE '\\\\' AND (expires_at IS NULL OR expires_at > ?)"
  );
  const stmtClear = db.prepare("DELETE FROM kv_store WHERE namespace = ?");
  const stmtDeleteExpired = db.prepare(
    "DELETE FROM kv_store WHERE namespace = ? AND expires_at IS NOT NULL AND expires_at <= ?"
  );

  return {
    get(key) {
      const now = Date.now();
      const row = stmtGet.get(ns, key);
      if (!row) return null;
      if (row.expires_at !== null && row.expires_at <= now) {
        stmtDelete.run(ns, key);
        return null;
      }
      try {
        return JSON.parse(row.value);
      } catch (e) {
        return row.value;
      }
    },
    set(key, value, ttl) {
      const expiresAt = ttl ? Date.now() + ttl * 1000 : null;
      stmtSet.run(ns, key, JSON.stringify(value), expiresAt);
    },
    delete(key) {
      stmtDelete.run(ns, key);
    },
    has(key) {
      const now = Date.now();
      const row = stmtGet.get(ns, key);
      if (!row) return false;
      if (row.expires_at !== null && row.expires_at <= now) {
        stmtDelete.run(ns, key);
        return false;
      }
      return true;
    },
    keys(prefix) {
      const now = Date.now();
      if (prefix) {
        const escaped = prefix.replace(/[%_\\]/g, "\\$&");
        const rows = stmtKeysPrefix.all(ns, escaped + "%", now);
        return rows.map((r) => r.key);
      }
      const rows = stmtKeys.all(ns, now);
      return rows.map((r) => r.key);
    },
    clear() {
      stmtClear.run(ns);
    },
    close() {
      db.close();
    },
    purgeExpired() {
      stmtDeleteExpired.run(ns, Date.now());
    },
  };
}

export function createSessionStore(dbPath) {
  return createStore(dbPath, "session");
}

export function createCounter(dbPath, namespace) {
  const store = createStore(dbPath, namespace || "counters");
  return {
    increment(key, by) {
      const current = store.get(key) || 0;
      const next = current + (by !== undefined ? by : 1);
      store.set(key, next);
      return next;
    },
    decrement(key, by) {
      const current = store.get(key) || 0;
      const next = current - (by !== undefined ? by : 1);
      store.set(key, next);
      return next;
    },
    reset(key) {
      store.set(key, 0);
    },
    get(key) {
      return store.get(key) || 0;
    },
    close() {
      store.close();
    },
  };
}
