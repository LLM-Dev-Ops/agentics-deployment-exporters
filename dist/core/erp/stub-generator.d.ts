/**
 * ERP Integration Stub Generator
 *
 * Generates format-specific placeholder stubs for ERP integration slots.
 * Each stub is deterministic, auditable, and clearly marked as an
 * integration resolution point.
 *
 * Supports multiple output formats:
 * - Terraform (null_resource, local-exec)
 * - Kubernetes (ConfigMap, Secret)
 * - CloudFormation (Custom Resource)
 * - Helm (values placeholders)
 * - Generic (JSON, YAML, ENV)
 *
 * @module core/erp/stub-generator
 * @version 1.0.0
 */
import type { IntegrationSlot, StubOutputFormat } from './types.js';
import type { ExportArtifact } from '../types.js';
/**
 * Options for generating stub artifacts.
 */
export interface StubArtifactOptions {
    /**
     * Output format for the stub.
     */
    readonly format: StubOutputFormat;
    /**
     * Base path for artifact output.
     * @default 'erp-integrations'
     */
    readonly basePath?: string;
    /**
     * Whether to include resolution instructions as comments.
     * @default true
     */
    readonly includeInstructions?: boolean;
    /**
     * Whether to include original properties in output.
     * @default false
     */
    readonly includeOriginalProperties?: boolean;
}
/**
 * Generated stub artifact with metadata.
 */
export interface StubArtifactResult {
    /**
     * The export artifact ready for serialization.
     */
    readonly artifact: ExportArtifact;
    /**
     * The integration slot this artifact represents.
     */
    readonly slot: IntegrationSlot;
    /**
     * Checksum of the generated content.
     */
    readonly contentHash: string;
}
/**
 * ERP Integration Stub Generator.
 *
 * Generates format-specific placeholder stubs for ERP integration slots.
 * All output is deterministic and auditable.
 */
export declare class ERPStubGenerator {
    /**
     * Generate a stub artifact for an integration slot.
     *
     * @param slot - The integration slot to generate a stub for
     * @param options - Generation options
     * @returns The generated stub artifact with metadata
     */
    generateStubArtifact(slot: IntegrationSlot, options: StubArtifactOptions): StubArtifactResult;
    /**
     * Generate stub artifacts for multiple integration slots.
     *
     * @param slots - The integration slots to generate stubs for
     * @param options - Generation options
     * @returns Array of generated stub artifacts
     */
    generateStubArtifacts(slots: readonly IntegrationSlot[], options: StubArtifactOptions): readonly StubArtifactResult[];
    /**
     * Generate a manifest of all ERP integration slots.
     *
     * @param slots - All integration slots
     * @param intentId - The source intent ID
     * @param intentHash - The source intent hash
     * @returns Export artifact containing the manifest
     */
    generateManifest(slots: readonly IntegrationSlot[], intentId: string, intentHash: string): ExportArtifact;
    /**
     * Generate stub content based on format.
     */
    private generateStubContent;
    /**
     * Get artifact path and serializer format.
     */
    private getArtifactPathAndFormat;
    /**
     * Generate content hash.
     */
    private hashContent;
    /**
     * Group slots by vendor.
     */
    private groupByVendor;
    /**
     * Group slots by integration type.
     */
    private groupByIntegrationType;
}
/**
 * Factory function to create an ERP Stub Generator.
 */
export declare function createERPStubGenerator(): ERPStubGenerator;
/**
 * Generate header comments for stub files.
 */
export declare function generateStubHeader(slot: IntegrationSlot): string[];
//# sourceMappingURL=stub-generator.d.ts.map