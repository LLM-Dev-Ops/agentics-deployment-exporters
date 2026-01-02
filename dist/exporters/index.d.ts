/**
 * Exporters Module
 *
 * This module provides the main entry point for all exporter functionality.
 * It exports the ExporterRegistry, factory functions, and all exporter types.
 *
 * All exporters are:
 * - Deterministic (same input = same output)
 * - Pure functions (no side effects)
 * - Stateless (no instance variables affecting output)
 *
 * @module exporters
 * @version 1.0.0
 */
import type { IExporter } from '../core/interfaces.js';
import type { ExporterId, ExportFormat } from '../core/types.js';
export * from './terraform/index.js';
export * from './kubernetes/index.js';
export * from './helm/index.js';
export { CloudFormationExporter, createCloudFormationExporter, ResourceMapper as CFNResourceMapper, TemplateGenerator as CFNTemplateGenerator, toCFNLogicalId, sortObjectKeys as cfnSortObjectKeys, createRef, createGetAtt, createSub, createJoin, createIf, createImportValue, COMPONENT_TYPE_MAPPINGS, type CFNTemplate, type CFNMetadata, type CFNResource, type CFNParameter, type CFNOutput, type CFNMapping, type CFNRef, type CFNGetAtt, type CFNSub, type CFNJoin, type CFNIf, type CFNImportValue, type CFNParameterFile, type CFNParameterFileEntry, type CFNResourceMapping, type AgenticsExporterMetadata, type CFNCreationPolicy, type CFNUpdatePolicy, type CFNInterfaceMetadata, type CFNParameterGroup, type ContainerSpec as CFNContainerSpec, type DatabaseSpec as CFNDatabaseSpec, type NetworkSpec as CFNNetworkSpec, type SubnetSpec as CFNSubnetSpec, type StorageSpec as CFNStorageSpec, type LifecycleRule as CFNLifecycleRule, type CorsRule as CFNCorsRule, } from './cloudformation/index.js';
export * from './iam/index.js';
export { DatabaseSchemaExporter, createDatabaseSchemaExporter, quoteIdentifier, formatTableName, mapColumnType, generateColumnDefinition, formatDefaultValue, generateCreateTable, generateCreateIndex, generateForeignKey, generateDropTable, generateDropIndex, generateCreateSequence, generateCreateView, generateCreateType, generateComment, DEFAULT_DDL_OPTIONS, formatMigrationNumber, generateMigrationFilename, generateTableMigration, generateSchemaMigrations, topologicalSortTables, DATABASE_RESOURCE_TYPES, isDatabaseResourceType, DEFAULT_DIALECT, MIGRATION_NUMBER_FORMAT, TIMESTAMP_DEFAULTS, type DDLGeneratorOptions, type SchemaMigrationOptions, type Column as DBColumn, type ColumnType as DBColumnType, type ForeignKeyReference, type ForeignKeyAction, type ForeignKey as DBForeignKey, type Index as DBIndex, type IndexColumn, type IndexType as DBIndexType, type Table as DBTable, type UniqueConstraint, type CheckConstraint, type TableOptions, type PartitionDefinition, type Partition, type Migration, type MigrationSet, type DatabaseConfiguration, type DatabaseDialect, type View, type Sequence, type CustomType, type DDLStatement, type DDLStatementType, type DDLObjectType, type DatabaseResourceType, type SQLDialect, type SQLDataType, type SQLColumn, type SQLForeignKey, type SQLIndex, type SQLTable, type SQLDocument, } from './database/index.js';
import { TerraformExporter } from './terraform/TerraformExporter.js';
import { createKubernetesExporter } from './kubernetes/KubernetesExporter.js';
import { createHelmExporter } from './helm/HelmExporter.js';
import { createCloudFormationExporter } from './cloudformation/CloudFormationExporter.js';
import { createIAMPolicyExporter } from './iam/IAMPolicyExporter.js';
import { createDatabaseSchemaExporter } from './database/DatabaseSchemaExporter.js';
/**
 * Factory function to create a new TerraformExporter instance.
 *
 * @returns New TerraformExporter instance
 */
export declare function createTerraformExporter(): IExporter;
/**
 * Registry for managing exporter instances.
 *
 * The registry provides a centralized way to access exporters by ID or format.
 * It ensures only one instance of each exporter is created (singleton pattern).
 *
 * @example
 * ```typescript
 * const registry = ExporterRegistry.getInstance();
 *
 * // Get exporter by format
 * const terraformExporter = registry.getByFormat('terraform');
 *
 * // Transform intent
 * const artifacts = terraformExporter?.transform(normalizedIntent);
 *
 * // Or use the factory directly
 * const exporter = createTerraformExporter();
 * const artifacts = exporter.transform(normalizedIntent);
 * ```
 */
export declare class ExporterRegistry {
    private static instance;
    private readonly exporters;
    private readonly formatMap;
    private constructor();
    /**
     * Get the singleton registry instance.
     */
    static getInstance(): ExporterRegistry;
    /**
     * Reset the registry (for testing).
     */
    static reset(): void;
    /**
     * Register default exporters.
     */
    private registerDefaults;
    /**
     * Register an exporter.
     *
     * @param exporter - Exporter to register
     * @throws Error if exporter with same ID already registered
     */
    register(exporter: IExporter): void;
    /**
     * Get exporter by ID.
     *
     * @param id - Exporter ID
     * @returns Exporter or undefined if not found
     */
    get(id: ExporterId): IExporter | undefined;
    /**
     * Get exporter by target format.
     *
     * @param format - Export format
     * @returns Exporter or undefined if not found
     */
    getByFormat(format: ExportFormat): IExporter | undefined;
    /**
     * List all registered exporters.
     *
     * @returns Array of registered exporters (sorted by ID for determinism)
     */
    list(): readonly IExporter[];
    /**
     * Check if an exporter is registered.
     *
     * @param id - Exporter ID
     * @returns true if registered
     */
    has(id: ExporterId): boolean;
    /**
     * Check if a format has a registered exporter.
     *
     * @param format - Format to check
     * @returns true if an exporter is registered for this format
     */
    hasFormat(format: ExportFormat): boolean;
    /**
     * Unregister an exporter.
     *
     * @param id - Exporter ID to remove
     * @returns true if exporter was removed
     */
    unregister(id: ExporterId): boolean;
}
/**
 * Get an exporter for the given format.
 *
 * @param format - Target format
 * @returns Exporter instance
 * @throws Error if no exporter registered for format
 */
export declare function getExporter(format: ExportFormat): IExporter;
/**
 * Factory functions for creating exporter instances.
 */
export declare const Exporters: {
    /**
     * Create a Terraform exporter.
     */
    readonly terraform: typeof createTerraformExporter;
    /**
     * Create a Kubernetes exporter.
     */
    readonly kubernetes: typeof createKubernetesExporter;
    /**
     * Create a Helm exporter.
     */
    readonly helm: typeof createHelmExporter;
    /**
     * Create a CloudFormation exporter.
     */
    readonly cloudformation: typeof createCloudFormationExporter;
    /**
     * Create an IAM Policy exporter.
     */
    readonly iam: typeof createIAMPolicyExporter;
    /**
     * Create a Database Schema exporter.
     */
    readonly database: typeof createDatabaseSchemaExporter;
    /**
     * Create an exporter for the specified format.
     */
    readonly create: (format: ExportFormat) => IExporter;
};
export { TerraformExporter };
//# sourceMappingURL=index.d.ts.map