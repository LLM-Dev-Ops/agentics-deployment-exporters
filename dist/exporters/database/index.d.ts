/**
 * Database Schema Exporter Module
 *
 * Exports deployment intents to database schema files (DDL) and migrations.
 * Supports PostgreSQL and MySQL dialects with topological sorting for
 * foreign key dependencies.
 *
 * @module exporters/database
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import { DatabaseSchemaExporter } from '@agentics/deployment-exporters/exporters/database';
 *
 * const exporter = new DatabaseSchemaExporter();
 *
 * // Check if exporter can handle the intent
 * if (exporter.canHandle(validatedIntent)) {
 *   // Validate the intent
 *   const validation = exporter.validate(validatedIntent);
 *
 *   if (validation.valid) {
 *     // Transform to database schema artifacts
 *     const artifacts = exporter.transform(normalizedIntent, {
 *       environment: 'production',
 *       variables: { dialect: 'postgresql' },
 *     });
 *
 *     // artifacts contains:
 *     // - database/production/schema.sql
 *     // - database/production/migrations/0001_create_users_table.sql
 *     // - database/production/migrations/0001_create_users_table_rollback.sql
 *     // - ...
 *   }
 * }
 * ```
 */
export { DatabaseSchemaExporter, createDatabaseSchemaExporter } from './DatabaseSchemaExporter.js';
export { quoteIdentifier, formatTableName, mapColumnType, generateColumnDefinition, formatDefaultValue, generateCreateTable, generateCreateIndex, generateForeignKey, generateDropTable, generateDropIndex, generateCreateSequence, generateCreateView, generateCreateType, generateComment, DEFAULT_DDL_OPTIONS, type DDLGeneratorOptions, } from './DDLGenerator.js';
export { formatMigrationNumber, generateMigrationFilename, generateTableMigration, generateSchemaMigrations, topologicalSortTables, type SchemaMigrationOptions, } from './MigrationGenerator.js';
export type { SQLDialect, SQLDataType, SQLColumn, SQLForeignKey, SQLIndex, SQLTable, SQLDocument, } from './types.js';
export type { Column, ColumnType, ForeignKeyReference, ForeignKeyAction, ForeignKey, Index, IndexColumn, IndexType, Table, UniqueConstraint, CheckConstraint, TableOptions, PartitionDefinition, Partition, Migration, MigrationSet, DatabaseConfiguration, DatabaseDialect, View, Sequence, CustomType, DDLStatement, DDLStatementType, DDLObjectType, DatabaseResourceType, } from './types.js';
export { DATABASE_RESOURCE_TYPES, isDatabaseResourceType, DEFAULT_DIALECT, MIGRATION_NUMBER_FORMAT, TIMESTAMP_DEFAULTS, } from './types.js';
/**
 * Default export is the DatabaseSchemaExporter class for convenience.
 *
 * @example
 * ```typescript
 * import DatabaseSchemaExporter from '@agentics/deployment-exporters/exporters/database';
 *
 * const exporter = new DatabaseSchemaExporter();
 * ```
 */
export { DatabaseSchemaExporter as default } from './DatabaseSchemaExporter.js';
//# sourceMappingURL=index.d.ts.map