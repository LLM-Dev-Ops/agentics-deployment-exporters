/**
 * Database Schema Exporter Type Definitions
 *
 * This module defines types for database schema generation including
 * tables, columns, indexes, foreign keys, and migrations.
 *
 * All types are immutable and designed for deterministic serialization.
 *
 * @module exporters/database/types
 * @version 1.0.0
 */
// =============================================================================
// INTENT RESOURCE MAPPING
// =============================================================================
/**
 * Database-related resource types from intent.
 */
export const DATABASE_RESOURCE_TYPES = [
    'database',
    'table',
    'index',
    'migration',
    'schema',
    'view',
    'sequence',
];
/**
 * Check if a resource type is database-related.
 */
export function isDatabaseResourceType(type) {
    const lowerType = type.toLowerCase();
    return DATABASE_RESOURCE_TYPES.includes(lowerType) ||
        lowerType.includes('database') ||
        lowerType.includes('table') ||
        lowerType.includes('schema');
}
// =============================================================================
// DEFAULT VALUES
// =============================================================================
/**
 * Default dialect for database exports.
 */
export const DEFAULT_DIALECT = 'postgresql';
/**
 * Default migration number format (4 digits).
 */
export const MIGRATION_NUMBER_FORMAT = 4;
/**
 * Common timestamp default values by dialect.
 */
export const TIMESTAMP_DEFAULTS = {
    postgresql: 'CURRENT_TIMESTAMP',
    mysql: 'CURRENT_TIMESTAMP',
    mariadb: 'CURRENT_TIMESTAMP',
    sqlite: "datetime('now')",
    mssql: 'GETDATE()',
    oracle: 'SYSTIMESTAMP',
};
//# sourceMappingURL=types.js.map