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
// =============================================================================
// RE-EXPORTS FROM INDIVIDUAL EXPORTER MODULES
// Note: These modules don't have naming conflicts with each other
// =============================================================================
// Terraform exporter - re-export all
export * from './terraform/index.js';
// Kubernetes exporter - re-export all
export * from './kubernetes/index.js';
// Helm exporter - re-export all (TemplateGenerator has same name as CFN but we rename CFN's)
export * from './helm/index.js';
// CloudFormation exporter - export with namespaced names to avoid TemplateGenerator/ResourceMapper conflicts
export { CloudFormationExporter, createCloudFormationExporter, ResourceMapper as CFNResourceMapper, TemplateGenerator as CFNTemplateGenerator, toCFNLogicalId, sortObjectKeys as cfnSortObjectKeys, createRef, createGetAtt, createSub, createJoin, createIf, createImportValue, COMPONENT_TYPE_MAPPINGS, } from './cloudformation/index.js';
// IAM Policy exporter
export * from './iam/index.js';
// Database Schema exporter - export with namespaced names for Table/Index/ForeignKey conflicts
export { DatabaseSchemaExporter, createDatabaseSchemaExporter, quoteIdentifier, formatTableName, mapColumnType, generateColumnDefinition, formatDefaultValue, generateCreateTable, generateCreateIndex, generateForeignKey, generateDropTable, generateDropIndex, generateCreateSequence, generateCreateView, generateCreateType, generateComment, DEFAULT_DDL_OPTIONS, formatMigrationNumber, generateMigrationFilename, generateTableMigration, generateSchemaMigrations, topologicalSortTables, DATABASE_RESOURCE_TYPES, isDatabaseResourceType, DEFAULT_DIALECT, MIGRATION_NUMBER_FORMAT, TIMESTAMP_DEFAULTS, } from './database/index.js';
// Simulation exporter - for agentics-simulation-engine artifacts
export * from './simulation/index.js';
// Financial exporter - for enterprise-roi-engine artifacts
export * from './financial/index.js';
// Enterprise manifest generator - unified export package
export * from './enterprise/index.js';
// =============================================================================
// INTERNAL IMPORTS FOR REGISTRY
// Note: We import factory functions and classes for use in the registry
// =============================================================================
import { TerraformExporter } from './terraform/TerraformExporter.js';
import { createKubernetesExporter } from './kubernetes/KubernetesExporter.js';
import { createHelmExporter } from './helm/HelmExporter.js';
import { createCloudFormationExporter } from './cloudformation/CloudFormationExporter.js';
import { createIAMPolicyExporter } from './iam/IAMPolicyExporter.js';
import { createDatabaseSchemaExporter } from './database/DatabaseSchemaExporter.js';
import { createSimulationExporter } from './simulation/SimulationExporter.js';
import { createFinancialExporter } from './financial/FinancialExporter.js';
import { createEnterpriseManifestGenerator } from './enterprise/EnterpriseManifestGenerator.js';
// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================
/**
 * Factory function to create a new TerraformExporter instance.
 *
 * @returns New TerraformExporter instance
 */
export function createTerraformExporter() {
    return new TerraformExporter();
}
// =============================================================================
// EXPORTER REGISTRY
// =============================================================================
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
export class ExporterRegistry {
    static instance = null;
    exporters;
    formatMap;
    constructor() {
        this.exporters = new Map();
        this.formatMap = new Map();
        this.registerDefaults();
    }
    /**
     * Get the singleton registry instance.
     */
    static getInstance() {
        if (!ExporterRegistry.instance) {
            ExporterRegistry.instance = new ExporterRegistry();
        }
        return ExporterRegistry.instance;
    }
    /**
     * Reset the registry (for testing).
     */
    static reset() {
        ExporterRegistry.instance = null;
    }
    /**
     * Register default exporters.
     */
    registerDefaults() {
        this.register(createTerraformExporter());
        this.register(createKubernetesExporter());
        this.register(createHelmExporter());
        this.register(createCloudFormationExporter());
        this.register(createIAMPolicyExporter());
        this.register(createDatabaseSchemaExporter());
        this.register(createSimulationExporter());
        this.register(createFinancialExporter());
        this.register(createEnterpriseManifestGenerator());
    }
    /**
     * Register an exporter.
     *
     * @param exporter - Exporter to register
     * @throws Error if exporter with same ID already registered
     */
    register(exporter) {
        if (this.exporters.has(exporter.id)) {
            throw new Error(`Exporter with ID '${exporter.id}' already registered`);
        }
        this.exporters.set(exporter.id, exporter);
        this.formatMap.set(exporter.targetFormat, exporter.id);
    }
    /**
     * Get exporter by ID.
     *
     * @param id - Exporter ID
     * @returns Exporter or undefined if not found
     */
    get(id) {
        return this.exporters.get(id);
    }
    /**
     * Get exporter by target format.
     *
     * @param format - Export format
     * @returns Exporter or undefined if not found
     */
    getByFormat(format) {
        const id = this.formatMap.get(format);
        return id ? this.exporters.get(id) : undefined;
    }
    /**
     * List all registered exporters.
     *
     * @returns Array of registered exporters (sorted by ID for determinism)
     */
    list() {
        const exporters = Array.from(this.exporters.values());
        return exporters.sort((a, b) => a.id.localeCompare(b.id, 'en', { sensitivity: 'base' }));
    }
    /**
     * Check if an exporter is registered.
     *
     * @param id - Exporter ID
     * @returns true if registered
     */
    has(id) {
        return this.exporters.has(id);
    }
    /**
     * Check if a format has a registered exporter.
     *
     * @param format - Format to check
     * @returns true if an exporter is registered for this format
     */
    hasFormat(format) {
        return this.formatMap.has(format);
    }
    /**
     * Unregister an exporter.
     *
     * @param id - Exporter ID to remove
     * @returns true if exporter was removed
     */
    unregister(id) {
        const exporter = this.exporters.get(id);
        if (!exporter) {
            return false;
        }
        this.exporters.delete(id);
        this.formatMap.delete(exporter.targetFormat);
        return true;
    }
}
// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================
/**
 * Get an exporter for the given format.
 *
 * @param format - Target format
 * @returns Exporter instance
 * @throws Error if no exporter registered for format
 */
export function getExporter(format) {
    const registry = ExporterRegistry.getInstance();
    const exporter = registry.getByFormat(format);
    if (!exporter) {
        throw new Error(`No exporter registered for format: ${format}`);
    }
    return exporter;
}
// =============================================================================
// TYPE-SAFE FACTORY FUNCTIONS
// =============================================================================
/**
 * Factory functions for creating exporter instances.
 */
export const Exporters = {
    /**
     * Create a Terraform exporter.
     */
    terraform: createTerraformExporter,
    /**
     * Create a Kubernetes exporter.
     */
    kubernetes: createKubernetesExporter,
    /**
     * Create a Helm exporter.
     */
    helm: createHelmExporter,
    /**
     * Create a CloudFormation exporter.
     */
    cloudformation: createCloudFormationExporter,
    /**
     * Create an IAM Policy exporter.
     */
    iam: createIAMPolicyExporter,
    /**
     * Create a Database Schema exporter.
     */
    database: createDatabaseSchemaExporter,
    /**
     * Create a Simulation exporter for agentics-simulation-engine artifacts.
     */
    simulation: createSimulationExporter,
    /**
     * Create a Financial exporter for enterprise-roi-engine artifacts.
     */
    financial: createFinancialExporter,
    /**
     * Create an Enterprise Manifest generator for unified exports.
     */
    enterprise: createEnterpriseManifestGenerator,
    /**
     * Create an exporter for the specified format.
     */
    create(format) {
        switch (format) {
            case 'terraform':
                return createTerraformExporter();
            case 'kubernetes':
                return createKubernetesExporter();
            case 'helm':
                return createHelmExporter();
            case 'cloudformation':
                return createCloudFormationExporter();
            case 'iam':
                return createIAMPolicyExporter();
            case 'sql':
                return createDatabaseSchemaExporter();
            case 'config':
                // Return simulation exporter by default for 'config' format
                // Users can also directly use simulation/financial/enterprise factories
                return createSimulationExporter();
            default:
                throw new Error(`Unknown exporter format: ${format}`);
        }
    },
};
// =============================================================================
// EXPORTER CLASSES EXPORT (for type checking)
// Note: TerraformExporter, KubernetesExporter, HelmExporter are re-exported via export *
// CloudFormationExporter, IAMPolicyExporter, DatabaseSchemaExporter are re-exported above
// =============================================================================
export { TerraformExporter };
// KubernetesExporter is already exported via export * from './kubernetes/index.js'
// HelmExporter is already exported via export * from './helm/index.js'
// CloudFormationExporter is already exported above
// IAMPolicyExporter is already exported via export * from './iam/index.js'
// DatabaseSchemaExporter is already exported above
//# sourceMappingURL=index.js.map