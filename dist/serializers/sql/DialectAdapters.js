/**
 * SQL Dialect Adapters
 *
 * This module provides dialect-specific adaptations for SQL serialization.
 * Each adapter handles type mapping, identifier quoting, and syntax differences.
 *
 * @module serializers/sql/DialectAdapters
 * @version 1.0.0
 */
// =============================================================================
// TYPE MAPPINGS
// =============================================================================
/**
 * Type mapping for PostgreSQL.
 */
export const POSTGRESQL_TYPE_MAP = {
    string: 'VARCHAR',
    text: 'TEXT',
    integer: 'INTEGER',
    bigint: 'BIGINT',
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
};
/**
 * Type mapping for MySQL.
 */
export const MYSQL_TYPE_MAP = {
    string: 'VARCHAR',
    text: 'TEXT',
    integer: 'INT',
    bigint: 'BIGINT',
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
};
/**
 * Type mapping for SQLite.
 */
export const SQLITE_TYPE_MAP = {
    string: 'TEXT',
    text: 'TEXT',
    integer: 'INTEGER',
    bigint: 'INTEGER',
    float: 'REAL',
    double: 'REAL',
    decimal: 'NUMERIC',
    boolean: 'INTEGER',
    date: 'TEXT',
    datetime: 'TEXT',
    timestamp: 'TEXT',
    time: 'TEXT',
    uuid: 'TEXT',
    json: 'TEXT',
    jsonb: 'TEXT',
    binary: 'BLOB',
    blob: 'BLOB',
};
/**
 * Type mapping for MS SQL Server.
 */
export const MSSQL_TYPE_MAP = {
    string: 'NVARCHAR',
    text: 'NVARCHAR(MAX)',
    integer: 'INT',
    bigint: 'BIGINT',
    float: 'REAL',
    double: 'FLOAT',
    decimal: 'DECIMAL',
    boolean: 'BIT',
    date: 'DATE',
    datetime: 'DATETIME2',
    timestamp: 'DATETIMEOFFSET',
    time: 'TIME',
    uuid: 'UNIQUEIDENTIFIER',
    json: 'NVARCHAR(MAX)',
    jsonb: 'NVARCHAR(MAX)',
    binary: 'VARBINARY',
    blob: 'VARBINARY(MAX)',
};
/**
 * Type mapping for Oracle.
 */
export const ORACLE_TYPE_MAP = {
    string: 'VARCHAR2',
    text: 'CLOB',
    integer: 'NUMBER',
    bigint: 'NUMBER(19)',
    float: 'BINARY_FLOAT',
    double: 'BINARY_DOUBLE',
    decimal: 'NUMBER',
    boolean: 'NUMBER(1)',
    date: 'DATE',
    datetime: 'TIMESTAMP',
    timestamp: 'TIMESTAMP WITH TIME ZONE',
    time: 'INTERVAL DAY TO SECOND',
    uuid: 'VARCHAR2(36)',
    json: 'CLOB',
    jsonb: 'CLOB',
    binary: 'RAW',
    blob: 'BLOB',
};
// =============================================================================
// POSTGRESQL ADAPTER
// =============================================================================
/**
 * PostgreSQL dialect adapter.
 */
export class PostgreSQLAdapter {
    dialect = 'postgresql';
    quoteIdentifier(name) {
        // PostgreSQL uses double quotes
        return `"${name.replace(/"/g, '""')}"`;
    }
    mapType(column) {
        const baseType = POSTGRESQL_TYPE_MAP[column.type];
        if (column.type === 'string' && column.length) {
            return `VARCHAR(${column.length})`;
        }
        if (column.type === 'decimal' && column.precision !== undefined) {
            const scale = column.scale ?? 0;
            return `NUMERIC(${column.precision},${scale})`;
        }
        return baseType;
    }
    formatColumn(column, uppercase) {
        const parts = [];
        parts.push(this.quoteIdentifier(column.name));
        parts.push(this.mapType(column));
        if (column.primaryKey) {
            parts.push(uppercase ? 'PRIMARY KEY' : 'primary key');
        }
        if (!column.nullable && !column.primaryKey) {
            parts.push(uppercase ? 'NOT NULL' : 'not null');
        }
        if (column.unique && !column.primaryKey) {
            parts.push(uppercase ? 'UNIQUE' : 'unique');
        }
        if (column.default !== undefined) {
            parts.push(uppercase ? 'DEFAULT' : 'default');
            parts.push(this.formatDefaultValue(column.default));
        }
        return parts.join(' ');
    }
    formatForeignKey(column, tableName, uppercase) {
        if (!column.references) {
            return '';
        }
        const kw = (word) => (uppercase ? word.toUpperCase() : word.toLowerCase());
        const ref = column.references;
        let sql = `${kw('alter table')} ${this.quoteIdentifier(tableName)} `;
        sql += `${kw('add constraint')} ${this.quoteIdentifier(`fk_${tableName}_${column.name}`)} `;
        sql += `${kw('foreign key')} (${this.quoteIdentifier(column.name)}) `;
        sql += `${kw('references')} ${this.quoteIdentifier(ref.table)}(${this.quoteIdentifier(ref.column)})`;
        if (ref.onDelete) {
            sql += ` ${kw('on delete')} ${kw(ref.onDelete.replace(/_/g, ' '))}`;
        }
        if (ref.onUpdate) {
            sql += ` ${kw('on update')} ${kw(ref.onUpdate.replace(/_/g, ' '))}`;
        }
        return sql;
    }
    formatIndex(index, tableName, uppercase) {
        const kw = (word) => (uppercase ? word.toUpperCase() : word.toLowerCase());
        let sql = kw('create');
        if (index.unique) {
            sql += ' ' + kw('unique');
        }
        sql += ' ' + kw('index');
        sql += ` ${this.quoteIdentifier(index.name)}`;
        sql += ` ${kw('on')} ${this.quoteIdentifier(tableName)}`;
        if (index.type && index.type !== 'btree') {
            sql += ` ${kw('using')} ${index.type}`;
        }
        sql += ` (${index.columns.map((c) => this.quoteIdentifier(c)).join(', ')})`;
        if (index.where) {
            sql += ` ${kw('where')} ${index.where}`;
        }
        return sql;
    }
    formatCreateTable(tableName, columns, constraints, ifNotExists, uppercase) {
        const kw = (word) => (uppercase ? word.toUpperCase() : word.toLowerCase());
        let sql = kw('create table');
        if (ifNotExists) {
            sql += ' ' + kw('if not exists');
        }
        sql += ` ${this.quoteIdentifier(tableName)} (\n`;
        sql += [...columns, ...constraints].map((line) => '  ' + line).join(',\n');
        sql += '\n)';
        return sql;
    }
    formatDropTable(tableName, uppercase) {
        const kw = (word) => (uppercase ? word.toUpperCase() : word.toLowerCase());
        return `${kw('drop table if exists')} ${this.quoteIdentifier(tableName)}`;
    }
    formatDefaultValue(value) {
        if (value === null) {
            return 'NULL';
        }
        if (typeof value === 'boolean') {
            return value ? 'TRUE' : 'FALSE';
        }
        if (typeof value === 'number') {
            return String(value);
        }
        // String value - check for function calls
        if (value.includes('(') && value.includes(')')) {
            return value; // Function call, don't quote
        }
        return `'${value.replace(/'/g, "''")}'`;
    }
    getAutoIncrementSyntax() {
        return 'SERIAL';
    }
    getCurrentTimestampFunction() {
        return 'CURRENT_TIMESTAMP';
    }
}
// =============================================================================
// MYSQL ADAPTER
// =============================================================================
/**
 * MySQL dialect adapter.
 */
export class MySQLAdapter {
    dialect = 'mysql';
    quoteIdentifier(name) {
        // MySQL uses backticks
        return `\`${name.replace(/`/g, '``')}\``;
    }
    mapType(column) {
        const baseType = MYSQL_TYPE_MAP[column.type];
        if (column.type === 'string' && column.length) {
            return `VARCHAR(${column.length})`;
        }
        if (column.type === 'decimal' && column.precision !== undefined) {
            const scale = column.scale ?? 0;
            return `DECIMAL(${column.precision},${scale})`;
        }
        return baseType;
    }
    formatColumn(column, uppercase) {
        const parts = [];
        parts.push(this.quoteIdentifier(column.name));
        parts.push(this.mapType(column));
        if (!column.nullable && !column.primaryKey) {
            parts.push(uppercase ? 'NOT NULL' : 'not null');
        }
        if (column.unique && !column.primaryKey) {
            parts.push(uppercase ? 'UNIQUE' : 'unique');
        }
        if (column.default !== undefined) {
            parts.push(uppercase ? 'DEFAULT' : 'default');
            parts.push(this.formatDefaultValue(column.default));
        }
        if (column.primaryKey) {
            parts.push(uppercase ? 'PRIMARY KEY' : 'primary key');
        }
        return parts.join(' ');
    }
    formatForeignKey(column, tableName, uppercase) {
        if (!column.references) {
            return '';
        }
        const kw = (word) => (uppercase ? word.toUpperCase() : word.toLowerCase());
        const ref = column.references;
        let sql = `${kw('alter table')} ${this.quoteIdentifier(tableName)} `;
        sql += `${kw('add constraint')} ${this.quoteIdentifier(`fk_${tableName}_${column.name}`)} `;
        sql += `${kw('foreign key')} (${this.quoteIdentifier(column.name)}) `;
        sql += `${kw('references')} ${this.quoteIdentifier(ref.table)}(${this.quoteIdentifier(ref.column)})`;
        if (ref.onDelete) {
            sql += ` ${kw('on delete')} ${kw(ref.onDelete.replace(/_/g, ' '))}`;
        }
        if (ref.onUpdate) {
            sql += ` ${kw('on update')} ${kw(ref.onUpdate.replace(/_/g, ' '))}`;
        }
        return sql;
    }
    formatIndex(index, tableName, uppercase) {
        const kw = (word) => (uppercase ? word.toUpperCase() : word.toLowerCase());
        let sql = kw('create');
        if (index.unique) {
            sql += ' ' + kw('unique');
        }
        sql += ' ' + kw('index');
        sql += ` ${this.quoteIdentifier(index.name)}`;
        sql += ` ${kw('on')} ${this.quoteIdentifier(tableName)}`;
        sql += ` (${index.columns.map((c) => this.quoteIdentifier(c)).join(', ')})`;
        return sql;
    }
    formatCreateTable(tableName, columns, constraints, ifNotExists, uppercase) {
        const kw = (word) => (uppercase ? word.toUpperCase() : word.toLowerCase());
        let sql = kw('create table');
        if (ifNotExists) {
            sql += ' ' + kw('if not exists');
        }
        sql += ` ${this.quoteIdentifier(tableName)} (\n`;
        sql += [...columns, ...constraints].map((line) => '  ' + line).join(',\n');
        sql += '\n) ' + kw('engine') + '=InnoDB ' + kw('default charset') + '=utf8mb4';
        return sql;
    }
    formatDropTable(tableName, uppercase) {
        const kw = (word) => (uppercase ? word.toUpperCase() : word.toLowerCase());
        return `${kw('drop table if exists')} ${this.quoteIdentifier(tableName)}`;
    }
    formatDefaultValue(value) {
        if (value === null) {
            return 'NULL';
        }
        if (typeof value === 'boolean') {
            return value ? '1' : '0';
        }
        if (typeof value === 'number') {
            return String(value);
        }
        if (value.includes('(') && value.includes(')')) {
            return value;
        }
        return `'${value.replace(/'/g, "''")}'`;
    }
    getAutoIncrementSyntax() {
        return 'AUTO_INCREMENT';
    }
    getCurrentTimestampFunction() {
        return 'CURRENT_TIMESTAMP';
    }
}
// =============================================================================
// SQLITE ADAPTER
// =============================================================================
/**
 * SQLite dialect adapter.
 */
export class SQLiteAdapter {
    dialect = 'sqlite';
    quoteIdentifier(name) {
        // SQLite uses double quotes
        return `"${name.replace(/"/g, '""')}"`;
    }
    mapType(column) {
        return SQLITE_TYPE_MAP[column.type];
    }
    formatColumn(column, uppercase) {
        const parts = [];
        parts.push(this.quoteIdentifier(column.name));
        parts.push(this.mapType(column));
        if (column.primaryKey) {
            parts.push(uppercase ? 'PRIMARY KEY' : 'primary key');
        }
        if (!column.nullable && !column.primaryKey) {
            parts.push(uppercase ? 'NOT NULL' : 'not null');
        }
        if (column.unique && !column.primaryKey) {
            parts.push(uppercase ? 'UNIQUE' : 'unique');
        }
        if (column.default !== undefined) {
            parts.push(uppercase ? 'DEFAULT' : 'default');
            parts.push(this.formatDefaultValue(column.default));
        }
        if (column.references) {
            const ref = column.references;
            const kw = (word) => (uppercase ? word.toUpperCase() : word.toLowerCase());
            parts.push(`${kw('references')} ${this.quoteIdentifier(ref.table)}(${this.quoteIdentifier(ref.column)})`);
        }
        return parts.join(' ');
    }
    formatForeignKey(_column, _tableName, _uppercase) {
        // SQLite handles foreign keys inline
        return '';
    }
    formatIndex(index, tableName, uppercase) {
        const kw = (word) => (uppercase ? word.toUpperCase() : word.toLowerCase());
        let sql = kw('create');
        if (index.unique) {
            sql += ' ' + kw('unique');
        }
        sql += ' ' + kw('index');
        sql += ` ${this.quoteIdentifier(index.name)}`;
        sql += ` ${kw('on')} ${this.quoteIdentifier(tableName)}`;
        sql += ` (${index.columns.map((c) => this.quoteIdentifier(c)).join(', ')})`;
        if (index.where) {
            sql += ` ${kw('where')} ${index.where}`;
        }
        return sql;
    }
    formatCreateTable(tableName, columns, constraints, ifNotExists, uppercase) {
        const kw = (word) => (uppercase ? word.toUpperCase() : word.toLowerCase());
        let sql = kw('create table');
        if (ifNotExists) {
            sql += ' ' + kw('if not exists');
        }
        sql += ` ${this.quoteIdentifier(tableName)} (\n`;
        sql += [...columns, ...constraints].map((line) => '  ' + line).join(',\n');
        sql += '\n)';
        return sql;
    }
    formatDropTable(tableName, uppercase) {
        const kw = (word) => (uppercase ? word.toUpperCase() : word.toLowerCase());
        return `${kw('drop table if exists')} ${this.quoteIdentifier(tableName)}`;
    }
    formatDefaultValue(value) {
        if (value === null) {
            return 'NULL';
        }
        if (typeof value === 'boolean') {
            return value ? '1' : '0';
        }
        if (typeof value === 'number') {
            return String(value);
        }
        if (value.includes('(') && value.includes(')')) {
            return value;
        }
        return `'${value.replace(/'/g, "''")}'`;
    }
    getAutoIncrementSyntax() {
        return 'AUTOINCREMENT';
    }
    getCurrentTimestampFunction() {
        return "datetime('now')";
    }
}
// =============================================================================
// ADAPTER FACTORY
// =============================================================================
/**
 * Get the appropriate adapter for a dialect.
 */
export function getDialectAdapter(dialect) {
    switch (dialect) {
        case 'postgresql':
            return new PostgreSQLAdapter();
        case 'mysql':
            return new MySQLAdapter();
        case 'sqlite':
            return new SQLiteAdapter();
        case 'mssql':
            // MS SQL would need its own adapter - fallback to PostgreSQL for now
            return new PostgreSQLAdapter();
        case 'oracle':
            // Oracle would need its own adapter - fallback to PostgreSQL for now
            return new PostgreSQLAdapter();
        default:
            return new PostgreSQLAdapter();
    }
}
//# sourceMappingURL=DialectAdapters.js.map