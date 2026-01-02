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

// =============================================================================
// MAIN EXPORTER
// =============================================================================

export { DatabaseSchemaExporter, createDatabaseSchemaExporter } from './DatabaseSchemaExporter.js';

// =============================================================================
// GENERATORS
// =============================================================================

export {
  // DDL Generation
  quoteIdentifier,
  formatTableName,
  mapColumnType,
  generateColumnDefinition,
  formatDefaultValue,
  generateCreateTable,
  generateCreateIndex,
  generateForeignKey,
  generateDropTable,
  generateDropIndex,
  generateCreateSequence,
  generateCreateView,
  generateCreateType,
  generateComment,
  DEFAULT_DDL_OPTIONS,
  type DDLGeneratorOptions,
} from './DDLGenerator.js';

export {
  // Migration Generation
  formatMigrationNumber,
  generateMigrationFilename,
  generateTableMigration,
  generateSchemaMigrations,
  topologicalSortTables,
  type SchemaMigrationOptions,
} from './MigrationGenerator.js';

// =============================================================================
// TYPES
// =============================================================================

// Re-export base SQL types
export type {
  SQLDialect,
  SQLDataType,
  SQLColumn,
  SQLForeignKey,
  SQLIndex,
  SQLTable,
  SQLDocument,
} from './types.js';

// Database-specific types
export type {
  // Column types
  Column,
  ColumnType,
  ForeignKeyReference,
  ForeignKeyAction,
  ForeignKey,

  // Index types
  Index,
  IndexColumn,
  IndexType,

  // Table types
  Table,
  UniqueConstraint,
  CheckConstraint,
  TableOptions,
  PartitionDefinition,
  Partition,

  // Migration types
  Migration,
  MigrationSet,

  // Configuration types
  DatabaseConfiguration,
  DatabaseDialect,
  View,
  Sequence,
  CustomType,

  // DDL types
  DDLStatement,
  DDLStatementType,
  DDLObjectType,

  // Resource mapping
  DatabaseResourceType,
} from './types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

export {
  DATABASE_RESOURCE_TYPES,
  isDatabaseResourceType,
  DEFAULT_DIALECT,
  MIGRATION_NUMBER_FORMAT,
  TIMESTAMP_DEFAULTS,
} from './types.js';

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

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
