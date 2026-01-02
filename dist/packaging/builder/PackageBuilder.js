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
import { ChecksumGenerator } from '../checksum/ChecksumGenerator.js';
import { ArtifactSigner } from '../signer/ArtifactSigner.js';
import { ArchiveCreator } from './ArchiveCreator.js';
import { ManifestGenerator } from '../manifest/ManifestGenerator.js';
// =============================================================================
// CONSTANTS
// =============================================================================
/**
 * Default package options.
 */
const DEFAULT_OPTIONS = {
    format: 'tar.gz',
    sign: false,
    checksumAlgorithm: 'sha256',
    includeLineage: false,
    compressionLevel: 6,
};
/**
 * Package manifest version.
 */
const MANIFEST_VERSION = '1.0.0';
/**
 * Generator identification.
 */
const GENERATOR_ID = 'agentics-deployment-exporters@1.0.0';
// =============================================================================
// PACKAGE BUILDER
// =============================================================================
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
export class PackageBuilder {
    options;
    artifacts;
    checksumGenerator;
    archiveCreator;
    manifestGenerator;
    signer = null;
    finalized = false;
    /**
     * Create a new PackageBuilder.
     *
     * @param options - Package build options
     */
    constructor(options) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.artifacts = [];
        this.checksumGenerator = new ChecksumGenerator(this.options.checksumAlgorithm);
        this.archiveCreator = new ArchiveCreator({
            compressionLevel: this.options.compressionLevel,
        });
        this.manifestGenerator = new ManifestGenerator();
        if (this.options.sign) {
            this.signer = new ArtifactSigner();
        }
    }
    /**
     * Add an artifact to the package.
     *
     * @param artifact - Export artifact to add
     * @throws Error if builder has been finalized
     */
    addArtifact(artifact) {
        if (this.finalized) {
            throw new Error('Cannot add artifacts to a finalized builder');
        }
        this.artifacts.push(artifact);
    }
    /**
     * Add multiple artifacts to the package.
     *
     * @param artifacts - Export artifacts to add
     * @throws Error if builder has been finalized
     */
    addArtifacts(artifacts) {
        for (const artifact of artifacts) {
            this.addArtifact(artifact);
        }
    }
    /**
     * Get the current artifact count.
     */
    getArtifactCount() {
        return this.artifacts.length;
    }
    /**
     * Get the current builder state.
     */
    getState() {
        return Object.freeze({
            artifacts: Object.freeze([...this.artifacts]),
            options: this.options,
            finalized: this.finalized,
        });
    }
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
    async build(metadata) {
        if (this.finalized) {
            throw new Error('Builder has already been finalized');
        }
        if (this.artifacts.length === 0) {
            throw new Error('Cannot build package with no artifacts');
        }
        // Mark as finalized to prevent further modifications
        this.finalized = true;
        // Generate manifest
        const manifest = await this.generateManifest(metadata);
        // Create archive with manifest
        const archiveContent = await this.createArchiveWithManifest(manifest);
        // Compute package checksum
        const packageChecksum = this.checksumGenerator.computeChecksum(archiveContent);
        return Object.freeze({
            content: archiveContent,
            checksum: packageChecksum,
            manifest,
            format: this.options.format ?? 'tar.gz',
        });
    }
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
    static async buildFromArtifacts(artifacts, metadata, options) {
        const builder = new PackageBuilder(options);
        builder.addArtifacts(artifacts);
        return builder.build(metadata);
    }
    /**
     * Create a finalized buffer without metadata.
     *
     * This creates a simple archive without full manifest.
     *
     * @returns Archive buffer
     * @throws Error if no artifacts or already finalized
     */
    async finalize() {
        if (this.finalized) {
            throw new Error('Builder has already been finalized');
        }
        if (this.artifacts.length === 0) {
            throw new Error('Cannot finalize package with no artifacts');
        }
        this.finalized = true;
        if (this.options.format === 'zip') {
            return this.archiveCreator.createZip(this.artifacts);
        }
        return this.archiveCreator.createTarGz(this.artifacts);
    }
    /**
     * Reset the builder for reuse.
     */
    reset() {
        this.artifacts.length = 0;
        this.finalized = false;
    }
    // ===========================================================================
    // PRIVATE METHODS
    // ===========================================================================
    /**
     * Generate the package manifest.
     */
    async generateManifest(metadata) {
        const timestamp = metadata.timestampOverride ?? new Date().toISOString();
        // Generate artifact entries with checksums
        const artifactEntries = this.generateArtifactEntries();
        // Create base manifest
        let manifest = {
            version: MANIFEST_VERSION,
            generated: timestamp,
            generator: GENERATOR_ID,
            intent: metadata.intent,
            artifacts: artifactEntries,
            exporters: metadata.exporters,
        };
        // Add signature if signing is enabled
        if (this.signer && this.options.sign) {
            const manifestContent = JSON.stringify(manifest, this.sortedReplacer, 2);
            const signResult = await this.signer.sign(manifestContent, this.options.signOptions);
            manifest = {
                ...manifest,
                signature: signResult.signature,
            };
        }
        return Object.freeze(manifest);
    }
    /**
     * Generate artifact entries with checksums.
     */
    generateArtifactEntries() {
        // Sort artifacts by path for deterministic ordering
        const sorted = [...this.artifacts].sort((a, b) => a.path.localeCompare(b.path));
        return sorted.map((artifact) => {
            const content = this.serializeContent(artifact.content);
            const buffer = Buffer.from(content, 'utf-8');
            const checksum = this.checksumGenerator.generateChecksum(buffer);
            // Extract exporter from metadata if available
            const exporter = artifact.metadata?.exporter ?? 'unknown';
            return Object.freeze({
                path: artifact.path,
                exporter,
                format: artifact.format,
                checksum,
                size: buffer.length,
            });
        });
    }
    /**
     * Create archive with embedded manifest.
     */
    async createArchiveWithManifest(manifest) {
        // Create manifest artifact
        const manifestContent = JSON.stringify(manifest, this.sortedReplacer, 2);
        const manifestArtifact = {
            path: 'manifest.json',
            content: manifestContent,
            format: 'json',
            encoding: 'utf-8',
        };
        // Combine manifest with other artifacts
        const allArtifacts = [manifestArtifact, ...this.artifacts];
        if (this.options.format === 'zip') {
            return this.archiveCreator.createZip(allArtifacts);
        }
        return this.archiveCreator.createTarGz(allArtifacts);
    }
    /**
     * Serialize content to string.
     */
    serializeContent(content) {
        if (typeof content === 'string') {
            return content;
        }
        if (Buffer.isBuffer(content)) {
            return content.toString('utf-8');
        }
        return JSON.stringify(content, this.sortedReplacer, 2);
    }
    /**
     * JSON replacer that sorts object keys for determinism.
     */
    sortedReplacer = (_key, value) => {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            const sorted = {};
            for (const k of Object.keys(value).sort()) {
                sorted[k] = value[k];
            }
            return sorted;
        }
        return value;
    };
}
// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================
/**
 * Create a PackageBuilder with default options.
 */
export function createPackageBuilder() {
    return new PackageBuilder();
}
/**
 * Create a PackageBuilder for tar.gz packages.
 */
export function createTarGzPackageBuilder() {
    return new PackageBuilder({ format: 'tar.gz' });
}
/**
 * Create a PackageBuilder for zip packages.
 */
export function createZipPackageBuilder() {
    return new PackageBuilder({ format: 'zip' });
}
/**
 * Create a PackageBuilder with signing enabled.
 */
export function createSignedPackageBuilder() {
    return new PackageBuilder({ sign: true });
}
/**
 * Build a package from artifacts in one call.
 *
 * @param artifacts - Export artifacts
 * @param metadata - Package metadata
 * @param options - Package options
 * @returns Artifact package
 */
export async function buildPackage(artifacts, metadata, options) {
    return PackageBuilder.buildFromArtifacts(artifacts, metadata, options);
}
//# sourceMappingURL=PackageBuilder.js.map