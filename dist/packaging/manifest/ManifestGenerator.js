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
import { ChecksumGenerator } from '../checksum/ChecksumGenerator.js';
// =============================================================================
// CONSTANTS
// =============================================================================
/**
 * Current manifest schema version.
 */
const MANIFEST_VERSION = '1.0.0';
/**
 * Generator identification string.
 */
const GENERATOR_ID = 'agentics-deployment-exporters@1.0.0';
// =============================================================================
// MANIFEST GENERATOR
// =============================================================================
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
export class ManifestGenerator {
    checksumGenerator;
    /**
     * Create a new ManifestGenerator.
     */
    constructor() {
        this.checksumGenerator = new ChecksumGenerator();
    }
    /**
     * Generate a package manifest from artifacts.
     *
     * @param artifacts - Export artifacts to include in manifest
     * @param metadata - Manifest metadata
     * @returns Complete package manifest
     */
    generateManifest(artifacts, metadata) {
        const timestamp = metadata.timestampOverride ?? new Date().toISOString();
        // Generate artifact entries (sorted by path for determinism)
        const sortedArtifacts = [...artifacts].sort((a, b) => a.path.localeCompare(b.path));
        const artifactEntries = sortedArtifacts.map((artifact) => this.createArtifactEntry(artifact));
        // Sort exporter keys for determinism
        const sortedExporters = {};
        for (const key of Object.keys(metadata.exporters).sort()) {
            sortedExporters[key] = metadata.exporters[key];
        }
        const manifest = {
            version: MANIFEST_VERSION,
            generated: timestamp,
            generator: GENERATOR_ID,
            intent: metadata.intent,
            artifacts: Object.freeze(artifactEntries),
            exporters: Object.freeze(sortedExporters),
        };
        // Add signature if provided
        if (metadata.signature) {
            return Object.freeze({
                ...manifest,
                signature: metadata.signature,
            });
        }
        return Object.freeze(manifest);
    }
    /**
     * Serialize a manifest to JSON with sorted keys.
     *
     * @param manifest - Manifest to serialize
     * @param pretty - Whether to use pretty formatting (default: true)
     * @returns JSON string
     */
    serializeManifest(manifest, pretty = true) {
        return JSON.stringify(manifest, this.sortedReplacer, pretty ? 2 : 0);
    }
    /**
     * Parse a manifest from JSON string.
     *
     * @param json - JSON string to parse
     * @returns Parsed manifest
     * @throws Error if JSON is invalid or doesn't match manifest schema
     */
    parseManifest(json) {
        const parsed = JSON.parse(json);
        if (!this.isValidManifest(parsed)) {
            throw new Error('Invalid manifest format');
        }
        return Object.freeze(parsed);
    }
    /**
     * Validate a manifest structure.
     *
     * @param manifest - Manifest to validate
     * @returns Array of validation errors (empty if valid)
     */
    validateManifest(manifest) {
        const errors = [];
        // Check required fields
        if (!manifest.version) {
            errors.push('Missing required field: version');
        }
        if (!manifest.generated) {
            errors.push('Missing required field: generated');
        }
        if (!manifest.generator) {
            errors.push('Missing required field: generator');
        }
        if (!manifest.intent) {
            errors.push('Missing required field: intent');
        }
        else {
            if (!manifest.intent.name) {
                errors.push('Missing required field: intent.name');
            }
            if (!manifest.intent.version) {
                errors.push('Missing required field: intent.version');
            }
            if (!manifest.intent.hash) {
                errors.push('Missing required field: intent.hash');
            }
        }
        if (!Array.isArray(manifest.artifacts)) {
            errors.push('Invalid field: artifacts must be an array');
        }
        else {
            for (let i = 0; i < manifest.artifacts.length; i++) {
                const artifact = manifest.artifacts[i];
                if (!artifact.path) {
                    errors.push(`Missing required field: artifacts[${i}].path`);
                }
                if (!artifact.checksum) {
                    errors.push(`Missing required field: artifacts[${i}].checksum`);
                }
            }
        }
        if (!manifest.exporters || typeof manifest.exporters !== 'object') {
            errors.push('Invalid field: exporters must be an object');
        }
        return Object.freeze(errors);
    }
    /**
     * Create a minimal manifest for testing.
     *
     * @param overrides - Override specific fields
     * @returns Test manifest
     */
    createTestManifest(overrides) {
        return Object.freeze({
            version: MANIFEST_VERSION,
            generated: '2024-01-01T00:00:00.000Z',
            generator: GENERATOR_ID,
            intent: {
                name: 'test-intent',
                version: '1.0.0',
                hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
            },
            artifacts: [],
            exporters: {},
            ...overrides,
        });
    }
    // ===========================================================================
    // PRIVATE METHODS
    // ===========================================================================
    /**
     * Create an artifact entry from an export artifact.
     */
    createArtifactEntry(artifact) {
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
     * Type guard for manifest validation.
     */
    isValidManifest(value) {
        if (typeof value !== 'object' || value === null) {
            return false;
        }
        const obj = value;
        return (typeof obj.version === 'string' &&
            typeof obj.generated === 'string' &&
            typeof obj.generator === 'string' &&
            typeof obj.intent === 'object' &&
            Array.isArray(obj.artifacts) &&
            typeof obj.exporters === 'object');
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
 * Create a ManifestGenerator.
 */
export function createManifestGenerator() {
    return new ManifestGenerator();
}
/**
 * Generate a manifest from artifacts.
 *
 * Convenience function for one-shot manifest generation.
 *
 * @param artifacts - Export artifacts
 * @param metadata - Manifest metadata
 * @returns Package manifest
 */
export function generateManifest(artifacts, metadata) {
    const generator = new ManifestGenerator();
    return generator.generateManifest(artifacts, metadata);
}
/**
 * Parse a manifest from JSON.
 *
 * @param json - JSON string
 * @returns Package manifest
 */
export function parseManifest(json) {
    const generator = new ManifestGenerator();
    return generator.parseManifest(json);
}
//# sourceMappingURL=ManifestGenerator.js.map