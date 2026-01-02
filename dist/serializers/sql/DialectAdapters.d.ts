/**
 * SQL Dialect Adapters
 *
 * This module provides dialect-specific adaptations for SQL serialization.
 * Each adapter handles type mapping, identifier quoting, and syntax differences.
 *
 * @module serializers/sql/DialectAdapters
 * @version 1.0.0
 */
import type { SQLColumn, SQLDataType, SQLDialect, SQLIndex } from '../base/types.js';
/**
 * Type mapping for PostgreSQL.
 */
export declare const POSTGRESQL_TYPE_MAP: Record<SQLDataType, string>;
/**
 * Type mapping for MySQL.
 */
export declare const MYSQL_TYPE_MAP: Record<SQLDataType, string>;
/**
 * Type mapping for SQLite.
 */
export declare const SQLITE_TYPE_MAP: Record<SQLDataType, string>;
/**
 * Type mapping for MS SQL Server.
 */
export declare const MSSQL_TYPE_MAP: Record<SQLDataType, string>;
/**
 * Type mapping for Oracle.
 */
export declare const ORACLE_TYPE_MAP: Record<SQLDataType, string>;
/**
 * Interface for SQL dialect adapters.
 */
export interface SQLDialectAdapter {
    /** Dialect name */
    readonly dialect: SQLDialect;
    /** Quote an identifier (table/column name) */
    quoteIdentifier(name: string): string;
    /** Map abstract type to dialect type */
    mapType(column: SQLColumn): string;
    /** Format a column definition */
    formatColumn(column: SQLColumn, uppercase: boolean): string;
    /** Format a foreign key constraint */
    formatForeignKey(column: SQLColumn, tableName: string, uppercase: boolean): string;
    /** Format an index definition */
    formatIndex(index: SQLIndex, tableName: string, uppercase: boolean): string;
    /** Format CREATE TABLE statement */
    formatCreateTable(tableName: string, columns: readonly string[], constraints: readonly string[], ifNotExists: boolean, uppercase: boolean): string;
    /** Format DROP TABLE statement */
    formatDropTable(tableName: string, uppercase: boolean): string;
    /** Format a default value */
    formatDefaultValue(value: string | number | boolean | null): string;
    /** Get auto-increment syntax */
    getAutoIncrementSyntax(): string;
    /** Get current timestamp function */
    getCurrentTimestampFunction(): string;
}
/**
 * PostgreSQL dialect adapter.
 */
export declare class PostgreSQLAdapter implements SQLDialectAdapter {
    readonly dialect: SQLDialect;
    quoteIdentifier(name: string): string;
    mapType(column: SQLColumn): string;
    formatColumn(column: SQLColumn, uppercase: boolean): string;
    formatForeignKey(column: SQLColumn, tableName: string, uppercase: boolean): string;
    formatIndex(index: SQLIndex, tableName: string, uppercase: boolean): string;
    formatCreateTable(tableName: string, columns: readonly string[], constraints: readonly string[], ifNotExists: boolean, uppercase: boolean): string;
    formatDropTable(tableName: string, uppercase: boolean): string;
    formatDefaultValue(value: string | number | boolean | null): string;
    getAutoIncrementSyntax(): string;
    getCurrentTimestampFunction(): string;
}
/**
 * MySQL dialect adapter.
 */
export declare class MySQLAdapter implements SQLDialectAdapter {
    readonly dialect: SQLDialect;
    quoteIdentifier(name: string): string;
    mapType(column: SQLColumn): string;
    formatColumn(column: SQLColumn, uppercase: boolean): string;
    formatForeignKey(column: SQLColumn, tableName: string, uppercase: boolean): string;
    formatIndex(index: SQLIndex, tableName: string, uppercase: boolean): string;
    formatCreateTable(tableName: string, columns: readonly string[], constraints: readonly string[], ifNotExists: boolean, uppercase: boolean): string;
    formatDropTable(tableName: string, uppercase: boolean): string;
    formatDefaultValue(value: string | number | boolean | null): string;
    getAutoIncrementSyntax(): string;
    getCurrentTimestampFunction(): string;
}
/**
 * SQLite dialect adapter.
 */
export declare class SQLiteAdapter implements SQLDialectAdapter {
    readonly dialect: SQLDialect;
    quoteIdentifier(name: string): string;
    mapType(column: SQLColumn): string;
    formatColumn(column: SQLColumn, uppercase: boolean): string;
    formatForeignKey(_column: SQLColumn, _tableName: string, _uppercase: boolean): string;
    formatIndex(index: SQLIndex, tableName: string, uppercase: boolean): string;
    formatCreateTable(tableName: string, columns: readonly string[], constraints: readonly string[], ifNotExists: boolean, uppercase: boolean): string;
    formatDropTable(tableName: string, uppercase: boolean): string;
    formatDefaultValue(value: string | number | boolean | null): string;
    getAutoIncrementSyntax(): string;
    getCurrentTimestampFunction(): string;
}
/**
 * Get the appropriate adapter for a dialect.
 */
export declare function getDialectAdapter(dialect: SQLDialect): SQLDialectAdapter;
//# sourceMappingURL=DialectAdapters.d.ts.map