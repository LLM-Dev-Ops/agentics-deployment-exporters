/**
 * Migration Generator
 *
 * This module provides pure functions for generating numbered database
 * migration files with up/down SQL statements.
 *
 * All operations are deterministic and produce identical output for
 * identical input, regardless of execution environment.
 *
 * @module exporters/database/MigrationGenerator
 * @version 1.0.0
 */
import type { Table, Migration, MigrationSet } from './types.js';
import { type DDLGeneratorOptions } from './DDLGenerator.js';
import type { DatabaseConfiguration } from './types.js';
/**
 * Format a migration number with leading zeros.
 *
 * @param number - Migration number
 * @param digits - Number of digits (default: 4)
 * @returns Formatted number string
 *
 * @example
 * formatMigrationNumber(1); // "0001"
 * formatMigrationNumber(42, 6); // "000042"
 */
export declare function formatMigrationNumber(number: number, digits?: number): string;
/**
 * Generate a migration filename.
 *
 * @param number - Migration number
 * @param name - Migration name (will be sanitized)
 * @returns Migration filename
 *
 * @example
 * generateMigrationFilename(1, "Create users table");
 * // "0001_create_users_table.sql"
 */
export declare function generateMigrationFilename(number: number, name: string): string;
/**
 * Generate migration for creating a table.
 *
 * @param table - Table definition
 * @param number - Migration number
 * @param options - DDL generator options
 * @returns Migration object
 */
export declare function generateTableMigration(table: Table, number: number, options: DDLGeneratorOptions): Migration;
/**
 * Options for generating migrations from a schema.
 */
export interface SchemaMigrationOptions {
    /** Base migration number */
    readonly baseNumber?: number;
    /** Generate separate migration per table */
    readonly separateTables?: boolean;
    /** Include comments in migrations */
    readonly includeComments?: boolean;
    /** DDL generator options */
    readonly ddlOptions?: Partial<DDLGeneratorOptions>;
}
/**
 * Generate migrations for a complete database schema.
 *
 * @param config - Database configuration
 * @param options - Migration generation options
 * @returns Migration set
 */
export declare function generateSchemaMigrations(config: DatabaseConfiguration, options?: SchemaMigrationOptions): MigrationSet;
/**
 * Topologically sort tables based on foreign key dependencies.
 * Tables that are referenced by others come first.
 *
 * @param tables - Tables to sort
 * @returns Sorted tables (dependencies first)
 */
export declare function topologicalSortTables(tables: readonly Table[]): readonly Table[];
//# sourceMappingURL=MigrationGenerator.d.ts.map