/**
 * Checksum Generator for Artifact Integrity
 *
 * Generates deterministic checksums for artifacts and packages.
 * Supports SHA-256 (default), SHA-512, and BLAKE3 algorithms.
 *
 * Key features:
 * - Deterministic output for same input
 * - Multiple algorithm support
 * - File manifest generation
 * - Aggregate checksum computation
 *
 * @module packaging/checksum/ChecksumGenerator
 * @version 1.0.0
 */
import type { ExportArtifact } from '../../core/types.js';
import type { ChecksumAlgorithm, ChecksumManifest, ChecksumResult } from '../types.js';
/**
 * Generates deterministic checksums for content.
 *
 * All operations are pure functions that produce identical output
 * for identical input, ensuring reproducible builds.
 *
 * @example
 * ```typescript
 * const generator = new ChecksumGenerator();
 *
 * // Generate single checksum
 * const checksum = generator.generateChecksum(content);
 * console.log(checksum); // "sha256:abc123..."
 *
 * // Generate manifest for multiple artifacts
 * const manifest = generator.generateFileChecksums(artifacts);
 * console.log(manifest.aggregateChecksum);
 * ```
 */
export declare class ChecksumGenerator {
    private readonly algorithm;
    /**
     * Create a new ChecksumGenerator.
     *
     * @param algorithm - Checksum algorithm to use (default: sha256)
     */
    constructor(algorithm?: ChecksumAlgorithm);
    /**
     * Generate a checksum for content.
     *
     * This is a pure function - same input always produces same output.
     *
     * @param content - Content to checksum (string or Buffer)
     * @param algorithm - Override the default algorithm
     * @returns Hex-encoded checksum string with algorithm prefix
     */
    generateChecksum(content: string | Buffer, algorithm?: ChecksumAlgorithm): string;
    /**
     * Generate a checksum result with full metadata.
     *
     * @param content - Content to checksum
     * @param algorithm - Override the default algorithm
     * @returns Complete checksum result with algorithm metadata
     */
    computeChecksum(content: string | Buffer, algorithm?: ChecksumAlgorithm): ChecksumResult;
    /**
     * Generate checksums for multiple artifacts.
     *
     * Creates a manifest containing individual file checksums and
     * an aggregate checksum of all content.
     *
     * @param artifacts - Export artifacts to checksum
     * @param timestampOverride - Optional timestamp for deterministic output
     * @returns Checksum manifest with all file checksums
     */
    generateFileChecksums(artifacts: readonly ExportArtifact[], timestampOverride?: string): ChecksumManifest;
    /**
     * Generate an aggregate checksum from multiple checksums.
     *
     * The checksums are sorted and concatenated before hashing
     * to ensure deterministic output regardless of input order.
     *
     * @param checksums - Array of hex-encoded checksums
     * @returns Aggregate checksum result
     */
    generateAggregateChecksum(checksums: readonly string[]): ChecksumResult;
    /**
     * Verify that content matches an expected checksum.
     *
     * @param content - Content to verify
     * @param expectedChecksum - Expected checksum (with or without algorithm prefix)
     * @returns True if checksums match
     */
    verify(content: string | Buffer, expectedChecksum: string): boolean;
    /**
     * Verify a complete checksum manifest.
     *
     * @param artifacts - Artifacts to verify
     * @param manifest - Manifest with expected checksums
     * @returns Array of verification failures (empty if all valid)
     */
    verifyManifest(artifacts: readonly ExportArtifact[], manifest: ChecksumManifest): readonly string[];
    /**
     * Get the current algorithm.
     */
    getAlgorithm(): ChecksumAlgorithm;
    /**
     * Create a new generator with a different algorithm.
     *
     * @param algorithm - New algorithm to use
     * @returns New ChecksumGenerator instance
     */
    withAlgorithm(algorithm: ChecksumAlgorithm): ChecksumGenerator;
    /**
     * Serialize artifact content for checksum computation.
     */
    private serializeArtifactContent;
    /**
     * JSON replacer that sorts object keys for deterministic output.
     */
    private sortedReplacer;
    /**
     * Parse a checksum string to extract algorithm and value.
     */
    private parseChecksum;
}
/**
 * Create a ChecksumGenerator with the default algorithm (SHA-256).
 */
export declare function createChecksumGenerator(): ChecksumGenerator;
/**
 * Create a ChecksumGenerator with SHA-512 algorithm.
 */
export declare function createSHA512Generator(): ChecksumGenerator;
/**
 * Create a ChecksumGenerator with BLAKE3 algorithm.
 */
export declare function createBLAKE3Generator(): ChecksumGenerator;
/**
 * Generate a checksum for content using the default algorithm.
 *
 * This is a convenience function for one-off checksum generation.
 *
 * @param content - Content to checksum
 * @param algorithm - Algorithm to use (default: sha256)
 * @returns Prefixed checksum string
 */
export declare function generateChecksum(content: string | Buffer, algorithm?: ChecksumAlgorithm): string;
/**
 * Verify content against an expected checksum.
 *
 * @param content - Content to verify
 * @param expectedChecksum - Expected checksum
 * @returns True if checksums match
 */
export declare function verifyChecksum(content: string | Buffer, expectedChecksum: string): boolean;
//# sourceMappingURL=ChecksumGenerator.d.ts.map