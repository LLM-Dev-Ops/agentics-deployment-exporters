/**
 * Manifest Generator for Package Documentation
 *
 * Generates deterministic package manifests following the SPARC architecture
 * specification. Manifests include artifact listings, checksums, and metadata.
 *
 * Key features:
 * - Deterministic manifest generation (sorted keys)
 * - Complete artifact tracking
 * - Exporter version documentation
 * - Intent lineage preservation
 *
 * @module packaging/manifest/ManifestGenerator
 * @version 1.0.0
 */
import type { ExportArtifact } from '../../core/types.js';
import type { PackageManifest, IntentReference, ExporterInfo } from '../types.js';
/**
 * Metadata required for manifest generation.
 */
export interface ManifestMetadata {
    /** Intent reference */
    readonly intent: IntentReference;
    /** Exporter information */
    readonly exporters: Readonly<Record<string, ExporterInfo>>;
    /** Override timestamp for deterministic output */
    readonly timestampOverride?: string;
    /** Optional signature to include */
    readonly signature?: string;
}
/**
 * Generates package manifests for artifact bundles.
 *
 * The generator produces deterministic manifests with sorted keys
 * and consistent formatting for reproducible builds.
 *
 * @example
 * ```typescript
 * const generator = new ManifestGenerator();
 *
 * const manifest = generator.generateManifest(artifacts, {
 *   intent: {
 *     name: 'my-deployment',
 *     version: '1.0.0',
 *     hash: 'sha256:abc123...',
 *   },
 *   exporters: {
 *     TerraformExporter: { version: '1.0.0' },
 *   },
 * });
 *
 * console.log(JSON.stringify(manifest, null, 2));
 * ```
 */
export declare class ManifestGenerator {
    private readonly checksumGenerator;
    /**
     * Create a new ManifestGenerator.
     */
    constructor();
    /**
     * Generate a package manifest from artifacts.
     *
     * @param artifacts - Export artifacts to include in manifest
     * @param metadata - Manifest metadata
     * @returns Complete package manifest
     */
    generateManifest(artifacts: readonly ExportArtifact[], metadata: ManifestMetadata): PackageManifest;
    /**
     * Serialize a manifest to JSON with sorted keys.
     *
     * @param manifest - Manifest to serialize
     * @param pretty - Whether to use pretty formatting (default: true)
     * @returns JSON string
     */
    serializeManifest(manifest: PackageManifest, pretty?: boolean): string;
    /**
     * Parse a manifest from JSON string.
     *
     * @param json - JSON string to parse
     * @returns Parsed manifest
     * @throws Error if JSON is invalid or doesn't match manifest schema
     */
    parseManifest(json: string): PackageManifest;
    /**
     * Validate a manifest structure.
     *
     * @param manifest - Manifest to validate
     * @returns Array of validation errors (empty if valid)
     */
    validateManifest(manifest: PackageManifest): readonly string[];
    /**
     * Create a minimal manifest for testing.
     *
     * @param overrides - Override specific fields
     * @returns Test manifest
     */
    createTestManifest(overrides?: Partial<PackageManifest>): PackageManifest;
    /**
     * Create an artifact entry from an export artifact.
     */
    private createArtifactEntry;
    /**
     * Serialize content to string.
     */
    private serializeContent;
    /**
     * Type guard for manifest validation.
     */
    private isValidManifest;
    /**
     * JSON replacer that sorts object keys for determinism.
     */
    private sortedReplacer;
}
/**
 * Create a ManifestGenerator.
 */
export declare function createManifestGenerator(): ManifestGenerator;
/**
 * Generate a manifest from artifacts.
 *
 * Convenience function for one-shot manifest generation.
 *
 * @param artifacts - Export artifacts
 * @param metadata - Manifest metadata
 * @returns Package manifest
 */
export declare function generateManifest(artifacts: readonly ExportArtifact[], metadata: ManifestMetadata): PackageManifest;
/**
 * Parse a manifest from JSON.
 *
 * @param json - JSON string
 * @returns Package manifest
 */
export declare function parseManifest(json: string): PackageManifest;
//# sourceMappingURL=ManifestGenerator.d.ts.map