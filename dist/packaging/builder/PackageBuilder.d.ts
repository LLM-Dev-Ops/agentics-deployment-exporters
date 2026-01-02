/**
 * Package Builder for Artifact Bundling
 *
 * Builds complete artifact packages with manifests, checksums, and signatures.
 * Implements atomic operations for reliability.
 *
 * Key features:
 * - Incremental artifact addition
 * - Automatic manifest generation
 * - Optional signing and checksums
 * - Atomic finalization
 *
 * @module packaging/builder/PackageBuilder
 * @version 1.0.0
 */
import type { ExportArtifact } from '../../core/types.js';
import type { ArtifactPackage, BuilderState, PackageOptions, IntentReference, ExporterInfo } from '../types.js';
/**
 * Metadata for package creation.
 */
export interface PackageBuildMetadata {
    /** Intent reference */
    readonly intent: IntentReference;
    /** Exporter information */
    readonly exporters: Readonly<Record<string, ExporterInfo>>;
    /** Override timestamp for deterministic output */
    readonly timestampOverride?: string;
}
/**
 * Builds artifact packages incrementally.
 *
 * The builder accumulates artifacts and metadata, then produces
 * a complete package with manifest and optional signatures.
 * All operations are designed for atomic completion.
 *
 * @example
 * ```typescript
 * const builder = new PackageBuilder({
 *   format: 'tar.gz',
 *   sign: true,
 * });
 *
 * // Add artifacts
 * builder.addArtifact(artifact1);
 * builder.addArtifact(artifact2);
 *
 * // Build package
 * const pkg = await builder.build({
 *   intent: { name: 'my-deployment', version: '1.0.0', hash: 'sha256:...' },
 *   exporters: { TerraformExporter: { version: '1.0.0' } },
 * });
 * ```
 */
export declare class PackageBuilder {
    private readonly options;
    private readonly artifacts;
    private readonly checksumGenerator;
    private readonly archiveCreator;
    private readonly manifestGenerator;
    private signer;
    private finalized;
    /**
     * Create a new PackageBuilder.
     *
     * @param options - Package build options
     */
    constructor(options?: PackageOptions);
    /**
     * Add an artifact to the package.
     *
     * @param artifact - Export artifact to add
     * @throws Error if builder has been finalized
     */
    addArtifact(artifact: ExportArtifact): void;
    /**
     * Add multiple artifacts to the package.
     *
     * @param artifacts - Export artifacts to add
     * @throws Error if builder has been finalized
     */
    addArtifacts(artifacts: readonly ExportArtifact[]): void;
    /**
     * Get the current artifact count.
     */
    getArtifactCount(): number;
    /**
     * Get the current builder state.
     */
    getState(): BuilderState;
    /**
     * Build the artifact package.
     *
     * This method:
     * 1. Generates checksums for all artifacts
     * 2. Creates the package manifest
     * 3. Optionally signs the manifest
     * 4. Creates the archive
     * 5. Returns the complete package
     *
     * @param metadata - Package metadata
     * @returns Built artifact package
     * @throws Error if no artifacts added or builder already finalized
     */
    build(metadata: PackageBuildMetadata): Promise<ArtifactPackage>;
    /**
     * Build from provided artifacts without using builder state.
     *
     * Static method for one-shot package creation.
     *
     * @param artifacts - Export artifacts to package
     * @param metadata - Package metadata
     * @param options - Package options
     * @returns Built artifact package
     */
    static buildFromArtifacts(artifacts: readonly ExportArtifact[], metadata: PackageBuildMetadata, options?: PackageOptions): Promise<ArtifactPackage>;
    /**
     * Create a finalized buffer without metadata.
     *
     * This creates a simple archive without full manifest.
     *
     * @returns Archive buffer
     * @throws Error if no artifacts or already finalized
     */
    finalize(): Promise<Buffer>;
    /**
     * Reset the builder for reuse.
     */
    reset(): void;
    /**
     * Generate the package manifest.
     */
    private generateManifest;
    /**
     * Generate artifact entries with checksums.
     */
    private generateArtifactEntries;
    /**
     * Create archive with embedded manifest.
     */
    private createArchiveWithManifest;
    /**
     * Serialize content to string.
     */
    private serializeContent;
    /**
     * JSON replacer that sorts object keys for determinism.
     */
    private sortedReplacer;
}
/**
 * Create a PackageBuilder with default options.
 */
export declare function createPackageBuilder(): PackageBuilder;
/**
 * Create a PackageBuilder for tar.gz packages.
 */
export declare function createTarGzPackageBuilder(): PackageBuilder;
/**
 * Create a PackageBuilder for zip packages.
 */
export declare function createZipPackageBuilder(): PackageBuilder;
/**
 * Create a PackageBuilder with signing enabled.
 */
export declare function createSignedPackageBuilder(): PackageBuilder;
/**
 * Build a package from artifacts in one call.
 *
 * @param artifacts - Export artifacts
 * @param metadata - Package metadata
 * @param options - Package options
 * @returns Artifact package
 */
export declare function buildPackage(artifacts: readonly ExportArtifact[], metadata: PackageBuildMetadata, options?: PackageOptions): Promise<ArtifactPackage>;
//# sourceMappingURL=PackageBuilder.d.ts.map