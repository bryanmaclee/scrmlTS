/**
 * Schema differ — computes migration SQL from desired vs actual database state.
 *
 * SPEC §38.6: reads desired state from < schema> AST, reads actual state from
 * SQLite PRAGMA table_info(), generates migration SQL.
 *
 * @module schema-differ
 */

/**
 * Parse a < schema> AST node into structured table declarations.
 *
 * @param {object} schemaNode — AST node with kind: "schema" and body text
 * @returns {{ tables: TableDecl[] }}
 */
export function parseSchemaBlock(schemaBody) {
  const tables = [];
  const text = typeof schemaBody === "string" ? schemaBody : (schemaBody?.body ?? "");

  // Match: tableName { ... }
  const tablePattern = /(\w+)\s*\{([^}]*)\}/g;
  let match;
  while ((match = tablePattern.exec(text)) !== null) {
    const tableName = match[1];
    const columnsText = match[2];
    const columns = parseColumns(columnsText);
    tables.push({ name: tableName, columns });
  }

  return { tables };
}

/**
 * Parse column declarations from inside a table block.
 * Format: columnName: type constraint1 constraint2 ...
 *
 * Recognizes:
 *   - SQL-mirror constraints: primary key, not null, unique, default(...),
 *     references table(col), rename from id
 *   - Shared-core predicates (§39.5.7, L4): req, length(...), pattern(...),
 *     min(n), max(n), gt(n), lt(n), gte(n), lte(n), eq(n), neq(n),
 *     oneOf([...]), notIn([...]). Each captured into `sharedCorePredicates`.
 */
function parseColumns(text) {
  const columns = [];
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const name = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).trim();

    // Parse type (first word)
    const parts = rest.split(/\s+/);
    const type = parts[0] || "text";
    const restStr = rest.slice(type.length).trim();

    const col = {
      name,
      type: mapSqliteType(type),
      scrmlType: type.toLowerCase(),  // preserved for cell-type-aware lowering (e.g., req on text/blob)
      primaryKey: /primary\s+key/i.test(restStr),
      notNull: /not\s+null/i.test(restStr),
      unique: /unique/i.test(restStr),
      default: null,
      references: null,
      renameFrom: null,
      sharedCorePredicates: [],
    };

    // Parse default(...)
    const defaultMatch = restStr.match(/default\(([^)]+)\)/i);
    if (defaultMatch) col.default = defaultMatch[1];

    // Parse references table(column)
    const refMatch = restStr.match(/references\s+(\w+)\((\w+)\)/i);
    if (refMatch) col.references = { table: refMatch[1], column: refMatch[2] };

    // Parse rename from identifier
    const renameMatch = restStr.match(/rename\s+from\s+(\w+)/i);
    if (renameMatch) col.renameFrom = renameMatch[1];

    // Parse shared-core predicates (§39.5.7, L4 additive vocabulary).
    col.sharedCorePredicates = parseSharedCorePredicates(restStr);

    columns.push(col);
  }

  return columns;
}

/**
 * Universal-core predicate names recognized at the schema locus (§39.5.7).
 * `is some` is enumerated in §55.1 but NOT listed in §39.5.7 — schema has no
 * "EXISTS" notion beyond NOT NULL (handled by `req`).
 */
const SCHEMA_LOCUS_PREDICATES = new Set([
  "req",
  "length", "pattern",
  "min", "max",
  "gt", "lt", "gte", "lte",
  "eq", "neq",
  "oneOf", "notIn",
]);

/**
 * Parse the 13 shared-core predicates from a column constraint string.
 *
 * `req` is bareword-only; it must be matched with whitespace boundaries so
 * `requirement` or `required` (hypothetical user constraint names) don't
 * false-positive. The other predicates are call-form: `name(...)`. Predicate
 * argument extraction tracks nested `()` / `[]` so that `oneOf([1,2,3])`
 * and `pattern(/^abc$/)` capture cleanly without splitting on inner commas.
 *
 * @returns {SharedCorePredicate[]}
 *   Each entry: { name, raw, arg } where `arg` is the verbatim text inside
 *   the outermost parens (`null` for bareword `req`).
 */
function parseSharedCorePredicates(restStr) {
  const predicates = [];
  let i = 0;
  const n = restStr.length;

  while (i < n) {
    // Skip whitespace
    while (i < n && /\s/.test(restStr[i])) i++;
    if (i >= n) break;

    // Try to match an identifier (predicate name or other token)
    const identMatch = restStr.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
    if (!identMatch) {
      // Skip non-ident character (e.g., punctuation from another constraint we don't own)
      i++;
      continue;
    }
    const ident = identMatch[0];
    const identEnd = i + ident.length;

    if (!SCHEMA_LOCUS_PREDICATES.has(ident)) {
      i = identEnd;
      continue;
    }

    // For `req`: must be a bareword (followed by whitespace, end, or another
    // alphanum-leading constraint). A `(` after `req` would mean it's not the
    // bareword form — but §55.1 documents `req` as 0+inline (`req("Please...")`).
    // For the schema locus the inline-message form is permitted but currently
    // emits the same lowering; we accept both forms and treat them as the
    // same predicate for emission (the message is purely client-facing and
    // does NOT affect SQL).
    if (ident === "req") {
      // Skip optional inline-message arg `req("...")`
      let nextChar = identEnd;
      while (nextChar < n && /\s/.test(restStr[nextChar])) nextChar++;
      if (nextChar < n && restStr[nextChar] === "(") {
        const closingIdx = findMatchingParen(restStr, nextChar);
        if (closingIdx === -1) {
          // Malformed; bail without recording the predicate
          i = identEnd;
          continue;
        }
        predicates.push({ name: "req", arg: null, raw: restStr.slice(i, closingIdx + 1) });
        i = closingIdx + 1;
      } else {
        predicates.push({ name: "req", arg: null, raw: ident });
        i = identEnd;
      }
      continue;
    }

    // All other predicates require parens.
    let parenStart = identEnd;
    while (parenStart < n && /\s/.test(restStr[parenStart])) parenStart++;
    if (parenStart >= n || restStr[parenStart] !== "(") {
      // Predicate name without parens — not a valid call form. Skip.
      i = identEnd;
      continue;
    }
    const closingIdx = findMatchingParen(restStr, parenStart);
    if (closingIdx === -1) {
      i = identEnd;
      continue;
    }
    const argRaw = restStr.slice(parenStart + 1, closingIdx).trim();
    predicates.push({
      name: ident,
      arg: argRaw,
      raw: restStr.slice(i, closingIdx + 1),
    });
    i = closingIdx + 1;
  }

  return predicates;
}

/**
 * Given a string and the index of an opening `(`, return the index of the
 * matching `)` (taking nested parens and `[...]` into account). Returns -1
 * if unbalanced. Conservative: does NOT track string literals inside.
 * (Schema column constraints don't embed parens inside strings in practice;
 * if a future extension needs that, this helper will need string-tracking.)
 */
function findMatchingParen(str, openIdx) {
  if (str[openIdx] !== "(") return -1;
  let depth = 0;
  let bracketDepth = 0;
  for (let i = openIdx; i < str.length; i++) {
    const ch = str[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0 && bracketDepth === 0) return i;
    } else if (ch === "[") bracketDepth++;
    else if (ch === "]") bracketDepth--;
  }
  return -1;
}

/**
 * Map scrml schema types to SQLite affinity types (§38.4).
 */
function mapSqliteType(type) {
  const map = {
    text: "TEXT",
    integer: "INTEGER",
    real: "REAL",
    blob: "BLOB",
    boolean: "INTEGER", // SQLite has no BOOLEAN — maps to INTEGER
    timestamp: "TEXT",   // SQLite has no TIMESTAMP — maps to TEXT
  };
  return map[type.toLowerCase()] || "TEXT";
}

/**
 * Read actual database schema via PRAGMA table_info().
 *
 * @param {object} db — bun:sqlite Database instance
 * @returns {{ tables: ActualTable[] }}
 */
export function readActualSchema(db) {
  const tables = [];
  const tableNames = db.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_scrml_migrations'"
  ).all();

  for (const { name } of tableNames) {
    const columns = db.query(`PRAGMA table_info("${name}")`).all();
    tables.push({
      name,
      columns: columns.map(c => ({
        name: c.name,
        type: c.type || "TEXT",
        notNull: c.notnull === 1,
        default: c.dflt_value,
        primaryKey: c.pk === 1,
        // Shared-core predicates are NOT recoverable from PRAGMA table_info
        // (CHECK constraint text isn't exposed through PRAGMA). The diff is
        // structural-only for now — adding a CHECK to an existing column
        // shows up via the schema-rebuild path, not as a per-predicate diff.
        sharedCorePredicates: [],
      })),
    });
  }

  return { tables };
}

/**
 * Compute migration SQL by diffing desired vs actual schema.
 *
 * SPEC §38.6: diff operations are ADD TABLE, ADD COLUMN, DROP TABLE,
 * DROP COLUMN, ALTER COLUMN (via 12-step rebuild), RENAME COLUMN.
 *
 * The optional `options.driver` argument controls driver-specific lowering
 * forms per §39.5.8 (currently only `pattern()` differs across drivers:
 * Postgres uses `~`; SQLite/MySQL use `REGEXP`). Defaults to `"sqlite"` to
 * preserve existing behavior.
 *
 * @param {{ tables: TableDecl[] }} desired
 * @param {{ tables: ActualTable[] }} actual
 * @param {{ driver?: "sqlite"|"postgres"|"mysql" }} [options]
 * @returns {{ sql: string[], warnings: string[] }}
 */
export function diffSchema(desired, actual, options = {}) {
  const driver = options.driver ?? "sqlite";
  const sql = [];
  const warnings = [];

  const actualMap = new Map(actual.tables.map(t => [t.name, t]));
  const desiredMap = new Map(desired.tables.map(t => [t.name, t]));

  // 1. New tables (in desired but not actual)
  for (const table of desired.tables) {
    if (!actualMap.has(table.name)) {
      sql.push(generateCreateTable(table, driver));
    }
  }

  // 2. Modified tables (in both — check columns)
  for (const table of desired.tables) {
    const actualTable = actualMap.get(table.name);
    if (!actualTable) continue;

    const actualColMap = new Map(actualTable.columns.map(c => [c.name, c]));
    const desiredColMap = new Map(table.columns.map(c => [c.name, c]));

    // New columns
    for (const col of table.columns) {
      // Check rename
      if (col.renameFrom && actualColMap.has(col.renameFrom)) {
        sql.push(`ALTER TABLE "${table.name}" RENAME COLUMN "${col.renameFrom}" TO "${col.name}";`);
        continue;
      }

      if (!actualColMap.has(col.name)) {
        // Simple ADD COLUMN (SQLite supports this for nullable columns without constraints).
        // A column with shared-core `req` lowers to NOT NULL — same constraint,
        // same fast-path requirement (default required for non-null ADD COLUMN).
        const lowersToNotNull = col.notNull || hasReqPredicate(col);
        const canSimpleAdd = !lowersToNotNull || col.default !== null;
        if (canSimpleAdd) {
          sql.push(generateAddColumn(table.name, col, driver));
        } else {
          // Needs 12-step rebuild
          const rebuildSql = generate12StepRebuild(table, actualTable, driver);
          sql.push(...rebuildSql);
          break; // Rebuild handles all column changes at once
        }
      }
    }

    // Dropped columns (in actual but not desired, and not renamed)
    const renamedFrom = new Set(table.columns.filter(c => c.renameFrom).map(c => c.renameFrom));
    for (const actualCol of actualTable.columns) {
      if (!desiredColMap.has(actualCol.name) && !renamedFrom.has(actualCol.name)) {
        warnings.push(`W-SCHEMA-002: Dropping column "${actualCol.name}" from table "${table.name}" — data will be lost.`);
        // DROP COLUMN requires 12-step rebuild on older SQLite
        const rebuildSql = generate12StepRebuild(table, actualTable, driver);
        sql.push(...rebuildSql);
        break;
      }
    }
  }

  // 3. Dropped tables (in actual but not desired)
  for (const actualTable of actual.tables) {
    if (!desiredMap.has(actualTable.name)) {
      warnings.push(`W-SCHEMA-002: Dropping table "${actualTable.name}" — all data will be lost.`);
      sql.push(`DROP TABLE IF EXISTS "${actualTable.name}";`);
    }
  }

  return { sql, warnings };
}

/**
 * Generate CREATE TABLE SQL from a table declaration.
 *
 * Emits SQL-mirror constraints (PRIMARY KEY / NOT NULL / UNIQUE / DEFAULT /
 * REFERENCES) as before, then appends shared-core lowered constraints per
 * §39.5.8. Shared-core `req` adds `NOT NULL` (and a `CHECK (col != '')` for
 * text/blob), other shared-core predicates add `CHECK (...)` clauses.
 */
export function generateCreateTable(table, driver = "sqlite") {
  const colDefs = table.columns.map(col => {
    let def = `"${col.name}" ${col.type}`;
    if (col.primaryKey) def += " PRIMARY KEY";

    // SQL-mirror NOT NULL OR shared-core req → NOT NULL.
    // Avoid duplicate NOT NULL when both forms present.
    const wantsNotNull = col.notNull || hasReqPredicate(col);
    if (wantsNotNull) def += " NOT NULL";

    if (col.unique) def += " UNIQUE";
    if (col.default !== null) def += ` DEFAULT (${col.default})`;
    if (col.references) def += ` REFERENCES "${col.references.table}"("${col.references.column}")`;

    // §39.5.8 shared-core lowering: append CHECK clauses (and the req empty-
    // string check for text/blob).
    const checkClauses = lowerSharedCoreToChecks(col, driver);
    for (const clause of checkClauses) {
      def += ` ${clause}`;
    }

    return "  " + def;
  });

  return `CREATE TABLE "${table.name}" (\n${colDefs.join(",\n")}\n);`;
}

/**
 * Generate ALTER TABLE ADD COLUMN SQL.
 */
function generateAddColumn(tableName, col, driver = "sqlite") {
  let def = `ALTER TABLE "${tableName}" ADD COLUMN "${col.name}" ${col.type}`;

  // NOT NULL on ADD COLUMN requires a default (handled by the diff
  // canSimpleAdd guard). When both shared-core req and a default are present,
  // emit NOT NULL.
  const wantsNotNull = (col.notNull || hasReqPredicate(col)) && col.default !== null;
  if (wantsNotNull) def += " NOT NULL";

  if (col.unique) def += " UNIQUE";
  if (col.default !== null) def += ` DEFAULT (${col.default})`;
  if (col.references) def += ` REFERENCES "${col.references.table}"("${col.references.column}")`;

  // Shared-core CHECK clauses (per §39.5.8).
  const checkClauses = lowerSharedCoreToChecks(col, driver);
  for (const clause of checkClauses) {
    def += ` ${clause}`;
  }

  return def + ";";
}

/**
 * Returns true if the column has a shared-core `req` predicate.
 */
function hasReqPredicate(col) {
  return Array.isArray(col.sharedCorePredicates)
    && col.sharedCorePredicates.some(p => p.name === "req");
}

/**
 * Lower a column's shared-core predicates to standard SQL DDL CHECK clauses
 * (and, for `req` on text/blob, an additional CHECK for the empty-string
 * exclusion). Returns the clauses as an array of strings, in source order;
 * the caller concatenates them with leading whitespace.
 *
 * Per §39.5.8:
 *
 *   req               → NOT NULL (emitted by caller) + (text/blob only)
 *                       CHECK (col != '')
 *   length(<rel>)     → CHECK (length(col) <op> N)
 *   pattern(/re/)     → driver-specific:
 *                       SQLite/MySQL: CHECK (col REGEXP 're')
 *                       Postgres:     CHECK (col ~ 're')
 *   min(n)/max(n)     → CHECK (col >= n) / CHECK (col <= n)
 *   gt/lt/gte/lte/eq/neq → analogous CHECK (col <op> n)
 *   oneOf([v1,v2,...]) → CHECK (col IN (v1,v2,...))
 *   notIn([v1,v2,...]) → CHECK (col NOT IN (v1,v2,...))
 *
 * The `?{}` SQL passthrough block is inviolable per §39.5.8 line 16447 — this
 * function emits ONLY DDL constraint clauses; it never touches `?{}` text.
 *
 * @param {ColumnDecl} col
 * @param {"sqlite"|"postgres"|"mysql"} driver
 * @returns {string[]}
 */
function lowerSharedCoreToChecks(col, driver) {
  const out = [];
  const preds = col.sharedCorePredicates ?? [];
  const colName = col.name;
  const quotedCol = `"${colName}"`;

  for (const p of preds) {
    switch (p.name) {
      case "req": {
        // §39.5.8 line 16445: req → NOT NULL + (text/blob only) CHECK (col != '').
        // The NOT NULL is emitted by generateCreateTable / generateAddColumn at
        // the column-clause level. Here we add the empty-string check ONLY for
        // string-shaped columns (text/blob). Numeric/timestamp columns can't
        // hold the empty string anyway.
        if (col.scrmlType === "text" || col.scrmlType === "blob") {
          out.push(`CHECK (${quotedCol} != '')`);
        }
        break;
      }
      case "length": {
        const inner = lowerLengthArg(p.arg, quotedCol);
        if (inner !== null) out.push(`CHECK (${inner})`);
        break;
      }
      case "pattern": {
        const re = stripPatternLiteral(p.arg);
        if (re === null) break;
        if (driver === "postgres") {
          out.push(`CHECK (${quotedCol} ~ '${escapeSqlString(re)}')`);
        } else {
          // sqlite + mysql
          out.push(`CHECK (${quotedCol} REGEXP '${escapeSqlString(re)}')`);
        }
        break;
      }
      case "min":
        out.push(`CHECK (${quotedCol} >= ${p.arg})`);
        break;
      case "max":
        out.push(`CHECK (${quotedCol} <= ${p.arg})`);
        break;
      case "gt":
        out.push(`CHECK (${quotedCol} > ${p.arg})`);
        break;
      case "lt":
        out.push(`CHECK (${quotedCol} < ${p.arg})`);
        break;
      case "gte":
        out.push(`CHECK (${quotedCol} >= ${p.arg})`);
        break;
      case "lte":
        out.push(`CHECK (${quotedCol} <= ${p.arg})`);
        break;
      case "eq":
        out.push(`CHECK (${quotedCol} = ${p.arg})`);
        break;
      case "neq":
        out.push(`CHECK (${quotedCol} != ${p.arg})`);
        break;
      case "oneOf": {
        const items = stripArrayLiteral(p.arg);
        if (items === null) break;
        out.push(`CHECK (${quotedCol} IN (${items}))`);
        break;
      }
      case "notIn": {
        const items = stripArrayLiteral(p.arg);
        if (items === null) break;
        out.push(`CHECK (${quotedCol} NOT IN (${items}))`);
        break;
      }
      // No default — unknown predicates were already filtered by
      // parseSharedCorePredicates' SCHEMA_LOCUS_PREDICATES gate.
    }
  }

  return out;
}

/**
 * Lower the `length(<relational>)` argument to a SQL boolean expression.
 * `arg` is the raw string between the parens of `length(...)`. Per the spec,
 * the inner is a relational predicate: `>=N`, `>N`, `<=N`, `<N`, `==N`, `!=N`.
 *
 * @returns {string|null} — SQL like `length("col") >= 2`, or null on parse fail.
 */
function lowerLengthArg(arg, quotedCol) {
  if (typeof arg !== "string") return null;
  const m = arg.trim().match(/^(>=|<=|==|!=|>|<)\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const op = m[1] === "==" ? "=" : m[1];
  const n = m[2];
  return `length(${quotedCol}) ${op} ${n}`;
}

/**
 * Extract the regex source from `pattern(/re/)`. Accepts the slash-delimited
 * form (`/re/`) and a bare-string fallback (`'re'` or `"re"`). Returns null on
 * parse failure.
 */
function stripPatternLiteral(arg) {
  if (typeof arg !== "string") return null;
  const trimmed = arg.trim();
  // /re/ form
  if (trimmed.startsWith("/") && trimmed.endsWith("/") && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  // /re/flags form — strip flags (DDL-level CHECK can't honor JS regex flags;
  // emit pattern bare so the DBMS regex engine evaluates it case-sensitively
  // unless the source literal had no flags). For now, drop flags conservatively.
  const flagMatch = trimmed.match(/^\/(.+)\/[gimsuy]*$/);
  if (flagMatch) return flagMatch[1];
  // 'string' / "string" fallback
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1);
  }
  return null;
}

/**
 * Extract array-literal contents from `oneOf([v1, v2, ...])` or
 * `notIn([...])`. Returns the verbatim contents (without surrounding `[` `]`),
 * suitable for direct injection into a SQL `IN (...)` clause. Items are passed
 * through verbatim — string literals retain their quotes, numerics their digits.
 *
 * @returns {string|null}
 */
function stripArrayLiteral(arg) {
  if (typeof arg !== "string") return null;
  const trimmed = arg.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
  return trimmed.slice(1, -1).trim();
}

/**
 * Escape single-quotes for SQL string literal embedding (regex source for the
 * `pattern()` lowering). Not a full SQL injection guard — the regex source is
 * developer-authored at compile time, not user-supplied at runtime.
 */
function escapeSqlString(s) {
  return s.replace(/'/g, "''");
}

/**
 * Generate the 12-step SQLite ALTER TABLE workaround (§38.6.3).
 * Used when column changes can't be done with simple ALTER TABLE.
 */
function generate12StepRebuild(desiredTable, actualTable, driver = "sqlite") {
  const tmpName = `_scrml_tmp_${desiredTable.name}`;
  const lines = [];

  // 1. Create new table with desired schema (temp name)
  lines.push(generateCreateTable({ ...desiredTable, name: tmpName }, driver));

  // 2. Copy data — map columns that exist in both
  const desiredCols = desiredTable.columns.map(c => c.name);
  const actualCols = new Set(actualTable.columns.map(c => c.name));
  const renames = new Map(desiredTable.columns.filter(c => c.renameFrom).map(c => [c.name, c.renameFrom]));

  const selectCols = desiredCols.map(name => {
    if (renames.has(name) && actualCols.has(renames.get(name))) {
      return `"${renames.get(name)}" AS "${name}"`;
    }
    if (actualCols.has(name)) {
      return `"${name}"`;
    }
    // New column — use default or NULL
    const col = desiredTable.columns.find(c => c.name === name);
    if (col?.default !== null) {
      return `${col.default} AS "${name}"`;
    }
    return `NULL AS "${name}"`;
  });

  lines.push(`INSERT INTO "${tmpName}" (${desiredCols.map(n => `"${n}"`).join(", ")}) SELECT ${selectCols.join(", ")} FROM "${desiredTable.name}";`);

  // 3. Drop old table
  lines.push(`DROP TABLE "${desiredTable.name}";`);

  // 4. Rename temp to final
  lines.push(`ALTER TABLE "${tmpName}" RENAME TO "${desiredTable.name}";`);

  return lines;
}
