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
      primaryKey: /primary\s+key/i.test(restStr),
      notNull: /not\s+null/i.test(restStr),
      unique: /unique/i.test(restStr),
      default: null,
      references: null,
      renameFrom: null,
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

    columns.push(col);
  }

  return columns;
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
 * @param {{ tables: TableDecl[] }} desired
 * @param {{ tables: ActualTable[] }} actual
 * @returns {{ sql: string[], warnings: string[] }}
 */
export function diffSchema(desired, actual) {
  const sql = [];
  const warnings = [];

  const actualMap = new Map(actual.tables.map(t => [t.name, t]));
  const desiredMap = new Map(desired.tables.map(t => [t.name, t]));

  // 1. New tables (in desired but not actual)
  for (const table of desired.tables) {
    if (!actualMap.has(table.name)) {
      sql.push(generateCreateTable(table));
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
        // Simple ADD COLUMN (SQLite supports this for nullable columns without constraints)
        const canSimpleAdd = !col.notNull || col.default !== null;
        if (canSimpleAdd) {
          sql.push(generateAddColumn(table.name, col));
        } else {
          // Needs 12-step rebuild
          const rebuildSql = generate12StepRebuild(table, actualTable);
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
        const rebuildSql = generate12StepRebuild(table, actualTable);
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
 */
function generateCreateTable(table) {
  const colDefs = table.columns.map(col => {
    let def = `"${col.name}" ${col.type}`;
    if (col.primaryKey) def += " PRIMARY KEY";
    if (col.notNull) def += " NOT NULL";
    if (col.unique) def += " UNIQUE";
    if (col.default !== null) def += ` DEFAULT (${col.default})`;
    if (col.references) def += ` REFERENCES "${col.references.table}"("${col.references.column}")`;
    return "  " + def;
  });

  return `CREATE TABLE "${table.name}" (\n${colDefs.join(",\n")}\n);`;
}

/**
 * Generate ALTER TABLE ADD COLUMN SQL.
 */
function generateAddColumn(tableName, col) {
  let def = `ALTER TABLE "${tableName}" ADD COLUMN "${col.name}" ${col.type}`;
  if (col.notNull && col.default !== null) def += " NOT NULL";
  if (col.unique) def += " UNIQUE";
  if (col.default !== null) def += ` DEFAULT (${col.default})`;
  if (col.references) def += ` REFERENCES "${col.references.table}"("${col.references.column}")`;
  return def + ";";
}

/**
 * Generate the 12-step SQLite ALTER TABLE workaround (§38.6.3).
 * Used when column changes can't be done with simple ALTER TABLE.
 */
function generate12StepRebuild(desiredTable, actualTable) {
  const tmpName = `_scrml_tmp_${desiredTable.name}`;
  const lines = [];

  // 1. Create new table with desired schema (temp name)
  lines.push(generateCreateTable({ ...desiredTable, name: tmpName }));

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
