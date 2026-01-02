/**
 * DDL Generator
 *
 * This module provides pure functions for generating SQL DDL statements
 * (CREATE TABLE, CREATE INDEX, etc.) with support for PostgreSQL and MySQL.
 *
 * All operations are deterministic and produce identical output for
 * identical input, regardless of execution environment.
 *
 * @module exporters/database/DDLGenerator
 * @version 1.0.0
 */
import { TIMESTAMP_DEFAULTS } from './types.js';
// =============================================================================
// TYPE MAPPING
// =============================================================================
/**
 * Map abstract column type to PostgreSQL type.
 */
const POSTGRESQL_TYPE_MAP = {
    string: 'VARCHAR',
    text: 'TEXT',
    integer: 'INTEGER',
    bigint: 'BIGINT',
    smallint: 'SMALLINT',
    float: 'REAL',
    double: 'DOUBLE PRECISION',
    decimal: 'NUMERIC',
    boolean: 'BOOLEAN',
    date: 'DATE',
    datetime: 'TIMESTAMP',
    timestamp: 'TIMESTAMPTZ',
    time: 'TIME',
    uuid: 'UUID',
    json: 'JSON',
    jsonb: 'JSONB',
    binary: 'BYTEA',
    blob: 'BYTEA',
    array: 'TEXT[]',
    enum: 'VARCHAR',
};
/**
 * Map abstract column type to MySQL type.
 */
const MYSQL_TYPE_MAP = {
    string: 'VARCHAR',
    text: 'TEXT',
    integer: 'INT',
    bigint: 'BIGINT',
    smallint: 'SMALLINT',
    float: 'FLOAT',
    double: 'DOUBLE',
    decimal: 'DECIMAL',
    boolean: 'TINYINT(1)',
    date: 'DATE',
    datetime: 'DATETIME',
    timestamp: 'TIMESTAMP',
    time: 'TIME',
    uuid: 'CHAR(36)',
    json: 'JSON',
    jsonb: 'JSON',
    binary: 'BINARY',
    blob: 'BLOB',
    array: 'JSON',
    enum: 'ENUM',
};
/**
 * Get the type map for a dialect.
 */
function getTypeMap(dialect) {
    switch (dialect) {
        case 'mysql':
        case 'mariadb':
            return MYSQL_TYPE_MAP;
        default:
            return POSTGRESQL_TYPE_MAP;
    }
}
/**
 * Default DDL generator options.
 */
export const DEFAULT_DDL_OPTIONS = {
    dialect: 'postgresql',
    uppercaseKeywords: true,
    quoteIdentifiers: true,
    ifNotExists: true,
    includeDrops: false,
    includeComments: true,
};
// =============================================================================
// IDENTIFIER FORMATTING
// =============================================================================
/**
 * Quote an identifier based on dialect.
 */
export function quoteIdentifier(name, dialect) {
    switch (dialect) {
        case 'mysql':
        case 'mariadb':
            return `\`${name.replace(/`/g, '``')}\``;
        default:
            return `"${name.replace(/"/g, '""')}"`;
    }
}
/**
 * Format table name with optional schema.
 */
export function formatTableName(name, schema, options) {
    const effectiveSchema = schema ?? options.schemaPrefix;
    if (options.quoteIdentifiers) {
        if (effectiveSchema) {
            return `${quoteIdentifier(effectiveSchema, options.dialect)}.${quoteIdentifier(name, options.dialect)}`;
        }
        return quoteIdentifier(name, options.dialect);
    }
    if (effectiveSchema) {
        return `${effectiveSchema}.${name}`;
    }
    return name;
}
// =============================================================================
// COLUMN GENERATION
// =============================================================================
/**
 * Map column type to dialect-specific type.
 */
export function mapColumnType(column, dialect) {
    const typeMap = getTypeMap(dialect);
    const baseType = typeMap[column.type];
    // Handle string with length
    if (column.type === 'string' && column.length) {
        return `VARCHAR(${column.length})`;
    }
    // Handle decimal with precision/scale
    if (column.type === 'decimal' && column.precision !== undefined) {
        const scale = column.scale ?? 0;
        const typeName = dialect === 'mysql' || dialect === 'mariadb' ? 'DECIMAL' : 'NUMERIC';
        return `${typeName}(${column.precision},${scale})`;
    }
    return baseType;
}
/**
 * Generate column definition.
 */
export function generateColumnDefinition(column, options) {
    const kw = (word) => options.uppercaseKeywords ? word.toUpperCase() : word.toLowerCase();
    const parts = [];
    // Column name
    if (options.quoteIdentifiers) {
        parts.push(quoteIdentifier(column.name, options.dialect));
    }
    else {
        parts.push(column.name);
    }
    // Data type
    parts.push(mapColumnType(column, options.dialect));
    // NOT NULL
    if (!column.nullable && !column.primaryKey) {
        parts.push(kw('NOT NULL'));
    }
    // PRIMARY KEY (for single-column PK)
    if (column.primaryKey) {
        parts.push(kw('PRIMARY KEY'));
    }
    // UNIQUE
    if (column.unique && !column.primaryKey) {
        parts.push(kw('UNIQUE'));
    }
    // DEFAULT
    if (column.defaultValue !== undefined) {
        parts.push(kw('DEFAULT'));
        parts.push(formatDefaultValue(column.defaultValue, column.type, options.dialect));
    }
    // CHECK constraint
    if (column.check) {
        parts.push(`${kw('CHECK')} (${column.check})`);
    }
    return parts.join(' ');
}
/**
 * Format a default value.
 */
export function formatDefaultValue(value, columnType, dialect) {
    if (value === null) {
        return 'NULL';
    }
    if (typeof value === 'boolean') {
        if (dialect === 'mysql' || dialect === 'mariadb') {
            return value ? '1' : '0';
        }
        return value ? 'TRUE' : 'FALSE';
    }
    if (typeof value === 'number') {
        return String(value);
    }
    // Check for function calls
    if (value.includes('(') && value.includes(')')) {
        return value;
    }
    // Check for special timestamp values
    if (columnType === 'timestamp' || columnType === 'datetime') {
        const upperValue = value.toUpperCase();
        if (upperValue === 'NOW' || upperValue === 'CURRENT_TIMESTAMP') {
            return TIMESTAMP_DEFAULTS[dialect];
        }
    }
    // String value - escape and quote
    return `'${value.replace(/'/g, "''")}'`;
}
// =============================================================================
// CREATE TABLE GENERATION
// =============================================================================
/**
 * Generate CREATE TABLE statement.
 */
export function generateCreateTable(table, options) {
    const kw = (word) => options.uppercaseKeywords ? word.toUpperCase() : word.toLowerCase();
    const tableName = formatTableName(table.name, table.schema, options);
    const lines = [];
    // Sort columns deterministically: primary key first, then alphabetically
    const sortedColumns = [...table.columns].sort((a, b) => {
        if (a.primaryKey && !b.primaryKey)
            return -1;
        if (!a.primaryKey && b.primaryKey)
            return 1;
        return a.name.localeCompare(b.name, 'en');
    });
    // Column definitions
    for (const column of sortedColumns) {
        lines.push('  ' + generateColumnDefinition(column, options));
    }
    // Composite primary key
    if (table.primaryKey && table.primaryKey.length > 1) {
        const pkCols = table.primaryKey
            .map(c => options.quoteIdentifiers ? quoteIdentifier(c, options.dialect) : c)
            .join(', ');
        lines.push(`  ${kw('PRIMARY KEY')} (${pkCols})`);
    }
    // Unique constraints
    if (table.uniqueConstraints) {
        const sortedConstraints = [...table.uniqueConstraints].sort((a, b) => a.name.localeCompare(b.name, 'en'));
        for (const uc of sortedConstraints) {
            const ucCols = uc.columns
                .map(c => options.quoteIdentifiers ? quoteIdentifier(c, options.dialect) : c)
                .join(', ');
            const constraintName = options.quoteIdentifiers
                ? quoteIdentifier(uc.name, options.dialect)
                : uc.name;
            lines.push(`  ${kw('CONSTRAINT')} ${constraintName} ${kw('UNIQUE')} (${ucCols})`);
        }
    }
    // Check constraints
    if (table.checkConstraints) {
        const sortedChecks = [...table.checkConstraints].sort((a, b) => a.name.localeCompare(b.name, 'en'));
        for (const check of sortedChecks) {
            const constraintName = options.quoteIdentifiers
                ? quoteIdentifier(check.name, options.dialect)
                : check.name;
            lines.push(`  ${kw('CONSTRAINT')} ${constraintName} ${kw('CHECK')} (${check.expression})`);
        }
    }
    // Build statement
    let sql = kw('CREATE TABLE');
    if (options.ifNotExists) {
        sql += ' ' + kw('IF NOT EXISTS');
    }
    sql += ` ${tableName} (\n`;
    sql += lines.join(',\n');
    sql += '\n)';
    // MySQL table options
    if ((options.dialect === 'mysql' || options.dialect === 'mariadb') && table.options) {
        if (table.options.engine) {
            sql += ` ${kw('ENGINE')}=${table.options.engine}`;
        }
        if (table.options.charset) {
            sql += ` ${kw('DEFAULT CHARSET')}=${table.options.charset}`;
        }
        if (table.options.collation) {
            sql += ` ${kw('COLLATE')}=${table.options.collation}`;
        }
    }
    sql += ';';
    // Collect dependencies from foreign keys
    const dependencies = [];
    for (const column of table.columns) {
        if (column.references) {
            dependencies.push(column.references.table);
        }
    }
    if (table.foreignKeys) {
        for (const fk of table.foreignKeys) {
            dependencies.push(fk.targetTable);
        }
    }
    return Object.freeze({
        type: 'CREATE',
        sql,
        objectName: table.name,
        objectType: 'TABLE',
        dependencies: dependencies.length > 0 ? [...new Set(dependencies)] : undefined,
    });
}
// =============================================================================
// CREATE INDEX GENERATION
// =============================================================================
/**
 * Generate CREATE INDEX statement.
 */
export function generateCreateIndex(index, tableName, tableSchema, options) {
    const kw = (word) => options.uppercaseKeywords ? word.toUpperCase() : word.toLowerCase();
    const fullTableName = formatTableName(tableName, tableSchema, options);
    const indexName = options.quoteIdentifiers
        ? quoteIdentifier(index.name, options.dialect)
        : index.name;
    let sql = kw('CREATE');
    if (index.unique) {
        sql += ' ' + kw('UNIQUE');
    }
    sql += ' ' + kw('INDEX');
    if (index.concurrent && options.dialect === 'postgresql') {
        sql += ' ' + kw('CONCURRENTLY');
    }
    if (options.ifNotExists && options.dialect === 'postgresql') {
        sql += ' ' + kw('IF NOT EXISTS');
    }
    sql += ` ${indexName}`;
    sql += ` ${kw('ON')} ${fullTableName}`;
    // Index type (PostgreSQL USING clause)
    if (index.type && index.type !== 'btree') {
        if (options.dialect === 'postgresql' || options.dialect === 'mysql' || options.dialect === 'mariadb') {
            sql += ` ${kw('USING')} ${index.type}`;
        }
    }
    // Columns
    const columnDefs = index.columns.map(col => formatIndexColumn(col, options));
    sql += ` (${columnDefs.join(', ')})`;
    // Include columns (PostgreSQL)
    if (index.include && index.include.length > 0 && options.dialect === 'postgresql') {
        const includeCols = index.include.map(c => options.quoteIdentifiers ? quoteIdentifier(c, options.dialect) : c);
        sql += ` ${kw('INCLUDE')} (${includeCols.join(', ')})`;
    }
    // WHERE clause (partial index)
    if (index.where) {
        sql += ` ${kw('WHERE')} ${index.where}`;
    }
    sql += ';';
    return Object.freeze({
        type: 'CREATE',
        sql,
        objectName: index.name,
        objectType: 'INDEX',
        dependencies: [tableName],
    });
}
/**
 * Format index column definition.
 */
function formatIndexColumn(col, options) {
    const kw = (word) => options.uppercaseKeywords ? word.toUpperCase() : word.toLowerCase();
    let result = options.quoteIdentifiers
        ? quoteIdentifier(col.name, options.dialect)
        : col.name;
    if (col.opclass) {
        result += ` ${col.opclass}`;
    }
    if (col.direction) {
        result += ` ${kw(col.direction)}`;
    }
    if (col.nulls) {
        result += ` ${kw('NULLS')} ${kw(col.nulls)}`;
    }
    return result;
}
// =============================================================================
// FOREIGN KEY GENERATION
// =============================================================================
/**
 * Generate ALTER TABLE ADD FOREIGN KEY statement.
 */
export function generateForeignKey(fk, tableSchema, options) {
    const kw = (word) => options.uppercaseKeywords ? word.toUpperCase() : word.toLowerCase();
    const sourceTable = formatTableName(fk.sourceTable, tableSchema, options);
    const targetTable = formatTableName(fk.targetTable, tableSchema, options);
    const constraintName = options.quoteIdentifiers
        ? quoteIdentifier(fk.name, options.dialect)
        : fk.name;
    const sourceCols = fk.sourceColumns.map(c => options.quoteIdentifiers ? quoteIdentifier(c, options.dialect) : c).join(', ');
    const targetCols = fk.targetColumns.map(c => options.quoteIdentifiers ? quoteIdentifier(c, options.dialect) : c).join(', ');
    let sql = `${kw('ALTER TABLE')} ${sourceTable}`;
    sql += ` ${kw('ADD CONSTRAINT')} ${constraintName}`;
    sql += ` ${kw('FOREIGN KEY')} (${sourceCols})`;
    sql += ` ${kw('REFERENCES')} ${targetTable} (${targetCols})`;
    if (fk.onDelete) {
        sql += ` ${kw('ON DELETE')} ${kw(fk.onDelete.replace('_', ' '))}`;
    }
    if (fk.onUpdate) {
        sql += ` ${kw('ON UPDATE')} ${kw(fk.onUpdate.replace('_', ' '))}`;
    }
    sql += ';';
    return Object.freeze({
        type: 'ALTER',
        sql,
        objectName: fk.name,
        objectType: 'CONSTRAINT',
        dependencies: [fk.sourceTable, fk.targetTable],
    });
}
// =============================================================================
// DROP GENERATION
// =============================================================================
/**
 * Generate DROP TABLE statement.
 */
export function generateDropTable(tableName, tableSchema, options) {
    const kw = (word) => options.uppercaseKeywords ? word.toUpperCase() : word.toLowerCase();
    const fullName = formatTableName(tableName, tableSchema, options);
    const sql = `${kw('DROP TABLE IF EXISTS')} ${fullName};`;
    return Object.freeze({
        type: 'DROP',
        sql,
        objectName: tableName,
        objectType: 'TABLE',
    });
}
/**
 * Generate DROP INDEX statement.
 */
export function generateDropIndex(indexName, tableName, tableSchema, options) {
    const kw = (word) => options.uppercaseKeywords ? word.toUpperCase() : word.toLowerCase();
    const quotedIndex = options.quoteIdentifiers
        ? quoteIdentifier(indexName, options.dialect)
        : indexName;
    let sql;
    if (options.dialect === 'mysql' || options.dialect === 'mariadb') {
        const fullTable = formatTableName(tableName, tableSchema, options);
        sql = `${kw('DROP INDEX')} ${quotedIndex} ${kw('ON')} ${fullTable};`;
    }
    else {
        // PostgreSQL, SQLite
        sql = `${kw('DROP INDEX IF EXISTS')} ${quotedIndex};`;
    }
    return Object.freeze({
        type: 'DROP',
        sql,
        objectName: indexName,
        objectType: 'INDEX',
    });
}
// =============================================================================
// SEQUENCE GENERATION
// =============================================================================
/**
 * Generate CREATE SEQUENCE statement (PostgreSQL).
 */
export function generateCreateSequence(sequence, options) {
    // Sequences are primarily PostgreSQL
    if (options.dialect !== 'postgresql') {
        return null;
    }
    const kw = (word) => options.uppercaseKeywords ? word.toUpperCase() : word.toLowerCase();
    const seqName = formatTableName(sequence.name, sequence.schema, options);
    let sql = `${kw('CREATE SEQUENCE')}`;
    if (options.ifNotExists) {
        sql += ` ${kw('IF NOT EXISTS')}`;
    }
    sql += ` ${seqName}`;
    if (sequence.start !== undefined) {
        sql += ` ${kw('START WITH')} ${sequence.start}`;
    }
    if (sequence.increment !== undefined) {
        sql += ` ${kw('INCREMENT BY')} ${sequence.increment}`;
    }
    if (sequence.minValue !== undefined) {
        sql += ` ${kw('MINVALUE')} ${sequence.minValue}`;
    }
    if (sequence.maxValue !== undefined) {
        sql += ` ${kw('MAXVALUE')} ${sequence.maxValue}`;
    }
    if (sequence.cycle !== undefined) {
        sql += sequence.cycle ? ` ${kw('CYCLE')}` : ` ${kw('NO CYCLE')}`;
    }
    if (sequence.cache !== undefined) {
        sql += ` ${kw('CACHE')} ${sequence.cache}`;
    }
    sql += ';';
    return Object.freeze({
        type: 'CREATE',
        sql,
        objectName: sequence.name,
        objectType: 'SEQUENCE',
    });
}
// =============================================================================
// VIEW GENERATION
// =============================================================================
/**
 * Generate CREATE VIEW statement.
 */
export function generateCreateView(view, options) {
    const kw = (word) => options.uppercaseKeywords ? word.toUpperCase() : word.toLowerCase();
    const viewName = formatTableName(view.name, view.schema, options);
    let sql = kw('CREATE');
    if (view.materialized && options.dialect === 'postgresql') {
        sql += ' ' + kw('MATERIALIZED');
    }
    sql += ' ' + kw('VIEW');
    if (options.ifNotExists && !view.materialized) {
        sql += ' ' + kw('IF NOT EXISTS');
    }
    sql += ` ${viewName}`;
    sql += ` ${kw('AS')}\n${view.definition}`;
    if (view.checkOption) {
        sql += `\n${kw('WITH')} ${kw(view.checkOption)} ${kw('CHECK OPTION')}`;
    }
    sql += ';';
    return Object.freeze({
        type: 'CREATE',
        sql,
        objectName: view.name,
        objectType: 'VIEW',
    });
}
// =============================================================================
// CUSTOM TYPE GENERATION
// =============================================================================
/**
 * Generate CREATE TYPE statement (PostgreSQL).
 */
export function generateCreateType(customType, options) {
    if (options.dialect !== 'postgresql') {
        return null;
    }
    const kw = (word) => options.uppercaseKeywords ? word.toUpperCase() : word.toLowerCase();
    const typeName = formatTableName(customType.name, customType.schema, options);
    let sql;
    if (customType.kind === 'enum' && customType.values) {
        const values = customType.values.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');
        sql = `${kw('CREATE TYPE')} ${typeName} ${kw('AS ENUM')} (${values});`;
    }
    else if (customType.kind === 'composite' && customType.attributes) {
        const attrs = customType.attributes.map(a => `${a.name} ${a.type}`).join(', ');
        sql = `${kw('CREATE TYPE')} ${typeName} ${kw('AS')} (${attrs});`;
    }
    else {
        return null;
    }
    return Object.freeze({
        type: 'CREATE',
        sql,
        objectName: customType.name,
        objectType: 'TYPE',
    });
}
// =============================================================================
// COMMENT GENERATION
// =============================================================================
/**
 * Generate COMMENT ON statement.
 */
export function generateComment(objectType, objectName, columnName, comment, tableSchema, options) {
    // Comments only supported in PostgreSQL
    if (options.dialect !== 'postgresql') {
        return null;
    }
    const kw = (word) => options.uppercaseKeywords ? word.toUpperCase() : word.toLowerCase();
    let target;
    if (objectType === 'COLUMN' && columnName) {
        const tableName = formatTableName(objectName, tableSchema, options);
        const colName = options.quoteIdentifiers
            ? quoteIdentifier(columnName, options.dialect)
            : columnName;
        target = `${tableName}.${colName}`;
    }
    else {
        target = formatTableName(objectName, tableSchema, options);
    }
    const escapedComment = comment.replace(/'/g, "''");
    const sql = `${kw('COMMENT ON')} ${kw(objectType)} ${target} ${kw('IS')} '${escapedComment}';`;
    return Object.freeze({
        type: 'COMMENT',
        sql,
        objectName,
        objectType: objectType,
    });
}
//# sourceMappingURL=DDLGenerator.js.map