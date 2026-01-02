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
import type { Column, ColumnType, Table, Index, ForeignKey, DDLStatement, DatabaseDialect, CustomType, Sequence, View } from './types.js';
/**
 * Options for DDL generation.
 */
export interface DDLGeneratorOptions {
    /** SQL dialect */
    readonly dialect: DatabaseDialect;
    /** Uppercase SQL keywords */
    readonly uppercaseKeywords: boolean;
    /** Quote identifiers */
    readonly quoteIdentifiers: boolean;
    /** Include IF NOT EXISTS */
    readonly ifNotExists: boolean;
    /** Include DROP statements */
    readonly includeDrops: boolean;
    /** Include comments */
    readonly includeComments: boolean;
    /** Schema prefix */
    readonly schemaPrefix?: string;
}
/**
 * Default DDL generator options.
 */
export declare const DEFAULT_DDL_OPTIONS: DDLGeneratorOptions;
/**
 * Quote an identifier based on dialect.
 */
export declare function quoteIdentifier(name: string, dialect: DatabaseDialect): string;
/**
 * Format table name with optional schema.
 */
export declare function formatTableName(name: string, schema: string | undefined, options: DDLGeneratorOptions): string;
/**
 * Map column type to dialect-specific type.
 */
export declare function mapColumnType(column: Column, dialect: DatabaseDialect): string;
/**
 * Generate column definition.
 */
export declare function generateColumnDefinition(column: Column, options: DDLGeneratorOptions): string;
/**
 * Format a default value.
 */
export declare function formatDefaultValue(value: string | number | boolean | null, columnType: ColumnType, dialect: DatabaseDialect): string;
/**
 * Generate CREATE TABLE statement.
 */
export declare function generateCreateTable(table: Table, options: DDLGeneratorOptions): DDLStatement;
/**
 * Generate CREATE INDEX statement.
 */
export declare function generateCreateIndex(index: Index, tableName: string, tableSchema: string | undefined, options: DDLGeneratorOptions): DDLStatement;
/**
 * Generate ALTER TABLE ADD FOREIGN KEY statement.
 */
export declare function generateForeignKey(fk: ForeignKey, tableSchema: string | undefined, options: DDLGeneratorOptions): DDLStatement;
/**
 * Generate DROP TABLE statement.
 */
export declare function generateDropTable(tableName: string, tableSchema: string | undefined, options: DDLGeneratorOptions): DDLStatement;
/**
 * Generate DROP INDEX statement.
 */
export declare function generateDropIndex(indexName: string, tableName: string, tableSchema: string | undefined, options: DDLGeneratorOptions): DDLStatement;
/**
 * Generate CREATE SEQUENCE statement (PostgreSQL).
 */
export declare function generateCreateSequence(sequence: Sequence, options: DDLGeneratorOptions): DDLStatement | null;
/**
 * Generate CREATE VIEW statement.
 */
export declare function generateCreateView(view: View, options: DDLGeneratorOptions): DDLStatement;
/**
 * Generate CREATE TYPE statement (PostgreSQL).
 */
export declare function generateCreateType(customType: CustomType, options: DDLGeneratorOptions): DDLStatement | null;
/**
 * Generate COMMENT ON statement.
 */
export declare function generateComment(objectType: 'TABLE' | 'COLUMN' | 'INDEX', objectName: string, columnName: string | undefined, comment: string, tableSchema: string | undefined, options: DDLGeneratorOptions): DDLStatement | null;
//# sourceMappingURL=DDLGenerator.d.ts.map