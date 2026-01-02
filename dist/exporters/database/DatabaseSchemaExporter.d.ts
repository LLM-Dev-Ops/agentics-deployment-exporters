/**
 * Database Schema Exporter
 *
 * Main exporter implementation that transforms NormalizedIntent into
 * database schema files (DDL) and migrations. Supports PostgreSQL and MySQL.
 *
 * All exports are deterministic and produce byte-identical output for the
 * same input, regardless of execution environment.
 *
 * @module exporters/database/DatabaseSchemaExporter
 * @version 1.0.0
 */
import type { ExportArtifact, ExporterId, ExportFormat, ExportOptions, NormalizedIntent, SemanticVersion, SerializerType, ValidatedIntent, ValidationResult } from '../../core/types.js';
import type { IExporter } from '../../core/interfaces.js';
/**
 * Exports deployment intents to database schema files.
 *
 * Generates SQL DDL files including:
 * - Schema DDL (CREATE TABLE, CREATE INDEX)
 * - Migration files (numbered, with up/down)
 *
 * All output is deterministic with topological ordering for foreign keys.
 *
 * @example
 * ```typescript
 * const exporter = new DatabaseSchemaExporter();
 * const artifacts = exporter.transform(normalizedIntent, {
 *   variables: { dialect: 'postgresql' }
 * });
 * // artifacts contains schema.sql, migrations/0001_*.sql, etc.
 * ```
 */
export declare class DatabaseSchemaExporter implements IExporter {
    readonly id: ExporterId;
    readonly name: string;
    readonly version: SemanticVersion;
    readonly targetFormat: ExportFormat;
    /**
     * Transform a normalized intent into database schema artifacts.
     *
     * @param intent - Normalized, validated DeploymentIntent
     * @param options - Optional export configuration
     * @returns Array of export artifacts (SQL files)
     */
    transform(intent: NormalizedIntent, options?: ExportOptions): readonly ExportArtifact[];
    /**
     * Validate that an intent can be exported by this exporter.
     *
     * @param intent - Intent to validate
     * @returns Validation result with errors/warnings
     */
    validate(intent: ValidatedIntent): ValidationResult;
    /**
     * Check if this exporter can handle the given intent.
     *
     * @param intent - Intent to check
     * @returns true if this exporter can handle the intent
     */
    canHandle(intent: ValidatedIntent): boolean;
    /**
     * Get the serializers required by this exporter.
     *
     * @returns Array of serializer types needed for artifact serialization
     */
    getRequiredSerializers(): readonly SerializerType[];
    /**
     * Resolve the SQL dialect from options.
     */
    private resolveDialect;
    /**
     * Extract database configuration from intent.
     */
    private extractDatabaseConfiguration;
    /**
     * Extract table definition from intent resource.
     */
    private extractTable;
    /**
     * Extract column definition.
     */
    private extractColumn;
    /**
     * Map raw column type to ColumnType.
     */
    private mapColumnType;
    /**
     * Extract default value.
     */
    private extractDefaultValue;
    /**
     * Extract foreign key action.
     */
    private extractForeignKeyAction;
    /**
     * Extract index definition.
     */
    private extractIndex;
    /**
     * Extract index type.
     */
    private extractIndexType;
    /**
     * Extract foreign key definition.
     */
    private extractForeignKey;
    /**
     * Extract primary key columns.
     */
    private extractPrimaryKey;
    /**
     * Generate schema DDL artifact.
     */
    private generateSchemaArtifact;
    /**
     * Generate migration artifacts.
     */
    private generateMigrationArtifacts;
}
/**
 * Create a new DatabaseSchemaExporter instance.
 *
 * @returns New DatabaseSchemaExporter instance
 */
export declare function createDatabaseSchemaExporter(): DatabaseSchemaExporter;
//# sourceMappingURL=DatabaseSchemaExporter.d.ts.map