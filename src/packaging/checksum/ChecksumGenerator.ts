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

import { createHash, type Hash } from 'node:crypto';
import type { ExportArtifact } from '../../core/types.js';
import type {
  ChecksumAlgorithm,
  ChecksumManifest,
  ChecksumResult,
  FileChecksum,
} from '../types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default checksum algorithm.
 */
const DEFAULT_ALGORITHM: ChecksumAlgorithm = 'sha256';

/**
 * Mapping from our algorithm names to Node.js crypto names.
 */
const ALGORITHM_MAP: Readonly<Record<ChecksumAlgorithm, string>> = {
  sha256: 'sha256',
  sha512: 'sha512',
  blake3: 'blake2b512', // Node.js doesn't have BLAKE3, using BLAKE2b as fallback
};

// =============================================================================
// CHECKSUM GENERATOR
// =============================================================================

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
export class ChecksumGenerator {
  private readonly algorithm: ChecksumAlgorithm;

  /**
   * Create a new ChecksumGenerator.
   *
   * @param algorithm - Checksum algorithm to use (default: sha256)
   */
  constructor(algorithm: ChecksumAlgorithm = DEFAULT_ALGORITHM) {
    this.algorithm = algorithm;
  }

  /**
   * Generate a checksum for content.
   *
   * This is a pure function - same input always produces same output.
   *
   * @param content - Content to checksum (string or Buffer)
   * @param algorithm - Override the default algorithm
   * @returns Hex-encoded checksum string with algorithm prefix
   */
  public generateChecksum(
    content: string | Buffer,
    algorithm?: ChecksumAlgorithm
  ): string {
    const result = this.computeChecksum(content, algorithm ?? this.algorithm);
    return result.prefixed;
  }

  /**
   * Generate a checksum result with full metadata.
   *
   * @param content - Content to checksum
   * @param algorithm - Override the default algorithm
   * @returns Complete checksum result with algorithm metadata
   */
  public computeChecksum(
    content: string | Buffer,
    algorithm?: ChecksumAlgorithm
  ): ChecksumResult {
    const algo = algorithm ?? this.algorithm;
    const nodeAlgo = ALGORITHM_MAP[algo];

    // Convert string to buffer for consistent hashing
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

    // Create hash and compute
    const hash: Hash = createHash(nodeAlgo);
    hash.update(buffer);
    const value = hash.digest('hex');

    return Object.freeze({
      value,
      algorithm: algo,
      prefixed: `${algo}:${value}`,
    });
  }

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
  public generateFileChecksums(
    artifacts: readonly ExportArtifact[],
    timestampOverride?: string
  ): ChecksumManifest {
    // Sort artifacts by path for deterministic ordering
    const sortedArtifacts = [...artifacts].sort((a, b) => a.path.localeCompare(b.path));

    // Generate individual file checksums
    const files: FileChecksum[] = sortedArtifacts.map((artifact) => {
      const content = this.serializeArtifactContent(artifact);
      const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

      return Object.freeze({
        path: artifact.path,
        checksum: this.computeChecksum(buffer),
        size: buffer.length,
      });
    });

    // Generate aggregate checksum from all individual checksums
    const aggregateChecksum = this.generateAggregateChecksum(
      files.map((f) => f.checksum.value)
    );

    return Object.freeze({
      algorithm: this.algorithm,
      files: Object.freeze(files),
      aggregateChecksum,
      generatedAt: timestampOverride ?? new Date().toISOString(),
    });
  }

  /**
   * Generate an aggregate checksum from multiple checksums.
   *
   * The checksums are sorted and concatenated before hashing
   * to ensure deterministic output regardless of input order.
   *
   * @param checksums - Array of hex-encoded checksums
   * @returns Aggregate checksum result
   */
  public generateAggregateChecksum(checksums: readonly string[]): ChecksumResult {
    // Sort checksums for deterministic ordering
    const sorted = [...checksums].sort();

    // Concatenate all checksums with separator
    const concatenated = sorted.join(':');

    return this.computeChecksum(concatenated);
  }

  /**
   * Verify that content matches an expected checksum.
   *
   * @param content - Content to verify
   * @param expectedChecksum - Expected checksum (with or without algorithm prefix)
   * @returns True if checksums match
   */
  public verify(content: string | Buffer, expectedChecksum: string): boolean {
    // Parse expected checksum to extract algorithm if present
    const { algorithm, value } = this.parseChecksum(expectedChecksum);

    const computed = this.computeChecksum(content, algorithm);

    return computed.value === value;
  }

  /**
   * Verify a complete checksum manifest.
   *
   * @param artifacts - Artifacts to verify
   * @param manifest - Manifest with expected checksums
   * @returns Array of verification failures (empty if all valid)
   */
  public verifyManifest(
    artifacts: readonly ExportArtifact[],
    manifest: ChecksumManifest
  ): readonly string[] {
    const failures: string[] = [];

    // Create lookup map for artifacts
    const artifactMap = new Map(artifacts.map((a) => [a.path, a]));

    // Verify each file in manifest
    for (const fileChecksum of manifest.files) {
      const artifact = artifactMap.get(fileChecksum.path);

      if (!artifact) {
        failures.push(`Missing artifact: ${fileChecksum.path}`);
        continue;
      }

      const content = this.serializeArtifactContent(artifact);
      const computed = this.computeChecksum(content, manifest.algorithm);

      if (computed.value !== fileChecksum.checksum.value) {
        failures.push(
          `Checksum mismatch for ${fileChecksum.path}: expected ${fileChecksum.checksum.value.substring(0, 16)}..., got ${computed.value.substring(0, 16)}...`
        );
      }
    }

    // Verify aggregate checksum
    const currentChecksums = manifest.files.map((f) => f.checksum.value);
    const computedAggregate = this.generateAggregateChecksum(currentChecksums);

    if (computedAggregate.value !== manifest.aggregateChecksum.value) {
      failures.push('Aggregate checksum mismatch');
    }

    return Object.freeze(failures);
  }

  /**
   * Get the current algorithm.
   */
  public getAlgorithm(): ChecksumAlgorithm {
    return this.algorithm;
  }

  /**
   * Create a new generator with a different algorithm.
   *
   * @param algorithm - New algorithm to use
   * @returns New ChecksumGenerator instance
   */
  public withAlgorithm(algorithm: ChecksumAlgorithm): ChecksumGenerator {
    return new ChecksumGenerator(algorithm);
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Serialize artifact content for checksum computation.
   */
  private serializeArtifactContent(artifact: ExportArtifact): string | Buffer {
    const content = artifact.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Buffer.isBuffer(content)) {
      return content;
    }

    // For objects, serialize with sorted keys for determinism
    return JSON.stringify(content, this.sortedReplacer, 0);
  }

  /**
   * JSON replacer that sorts object keys for deterministic output.
   */
  private sortedReplacer = (_key: string, value: unknown): unknown => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      const keys = Object.keys(value as Record<string, unknown>).sort();
      for (const k of keys) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return value;
  };

  /**
   * Parse a checksum string to extract algorithm and value.
   */
  private parseChecksum(checksum: string): {
    algorithm: ChecksumAlgorithm;
    value: string;
  } {
    const colonIndex = checksum.indexOf(':');

    if (colonIndex === -1) {
      // No prefix, assume default algorithm
      return { algorithm: this.algorithm, value: checksum };
    }

    const prefix = checksum.substring(0, colonIndex);
    const value = checksum.substring(colonIndex + 1);

    // Validate algorithm
    if (prefix in ALGORITHM_MAP) {
      return { algorithm: prefix as ChecksumAlgorithm, value };
    }

    // Unknown prefix, treat whole string as value
    return { algorithm: this.algorithm, value: checksum };
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a ChecksumGenerator with the default algorithm (SHA-256).
 */
export function createChecksumGenerator(): ChecksumGenerator {
  return new ChecksumGenerator();
}

/**
 * Create a ChecksumGenerator with SHA-512 algorithm.
 */
export function createSHA512Generator(): ChecksumGenerator {
  return new ChecksumGenerator('sha512');
}

/**
 * Create a ChecksumGenerator with BLAKE3 algorithm.
 */
export function createBLAKE3Generator(): ChecksumGenerator {
  return new ChecksumGenerator('blake3');
}

// =============================================================================
// STANDALONE UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a checksum for content using the default algorithm.
 *
 * This is a convenience function for one-off checksum generation.
 *
 * @param content - Content to checksum
 * @param algorithm - Algorithm to use (default: sha256)
 * @returns Prefixed checksum string
 */
export function generateChecksum(
  content: string | Buffer,
  algorithm: ChecksumAlgorithm = 'sha256'
): string {
  const generator = new ChecksumGenerator(algorithm);
  return generator.generateChecksum(content);
}

/**
 * Verify content against an expected checksum.
 *
 * @param content - Content to verify
 * @param expectedChecksum - Expected checksum
 * @returns True if checksums match
 */
export function verifyChecksum(
  content: string | Buffer,
  expectedChecksum: string
): boolean {
  const generator = new ChecksumGenerator();
  return generator.verify(content, expectedChecksum);
}
