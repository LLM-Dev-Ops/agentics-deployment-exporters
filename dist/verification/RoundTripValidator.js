/**
 * Round-Trip Validator for Determinism Verification
 *
 * Validates that transformation is deterministic by checking that
 * re-transformation produces identical output.
 *
 * Based on SPARC_PSEUDOCODE.md section 6.3 RoundTripValidation algorithm:
 * - Transform intent twice
 * - Compare checksums
 * - Find specific differences
 * - Verify individual artifact consistency
 *
 * @module verification/RoundTripValidator
 * @version 1.0.0
 */
import { createHash } from 'node:crypto';
// =============================================================================
// CONSTANTS
// =============================================================================
/**
 * Default options for round-trip validation.
 */
const DEFAULT_OPTIONS = {
    maxIterations: 2,
    includeContentDiff: false,
};
// =============================================================================
// ROUND-TRIP VALIDATOR
// =============================================================================
/**
 * Validates transformation determinism through round-trip testing.
 *
 * The validator performs the following checks:
 * 1. Transforms the intent multiple times
 * 2. Compares package checksums between transformations
 * 3. Identifies specific differences if checksums don't match
 * 4. Verifies individual artifact path and content consistency
 *
 * @example
 * ```typescript
 * const validator = new RoundTripValidator();
 * const result = validator.validate(intent, exporter);
 *
 * if (!result.valid) {
 *   console.error('Non-deterministic transformation:', result.error);
 *   console.error('Differences:', result.differences);
 * }
 * ```
 */
export class RoundTripValidator {
    /**
     * Validate that an exporter produces deterministic output.
     *
     * Based on SPARC_PSEUDOCODE.md section 6.3 RoundTripValidation algorithm.
     *
     * @param intent - Normalized intent to transform
     * @param exporter - Exporter to validate
     * @param options - Validation options
     * @returns Round-trip validation result
     */
    validate(intent, exporter, options) {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        try {
            // First transformation
            const artifacts1 = exporter.transform(intent);
            const checksum1 = this.computePackageChecksum(artifacts1);
            // Second transformation (should be identical)
            const artifacts2 = exporter.transform(intent);
            const checksum2 = this.computePackageChecksum(artifacts2);
            // Compare checksums
            if (checksum1 !== checksum2) {
                // Find specific differences
                const differences = this.findArtifactDifferences(artifacts1, artifacts2, opts.includeContentDiff);
                return Object.freeze({
                    valid: false,
                    error: 'NON_DETERMINISTIC_TRANSFORM',
                    checksum1,
                    checksum2,
                    differences,
                });
            }
            // Verify individual artifact consistency
            const consistencyResult = this.verifyArtifactConsistency(artifacts1, artifacts2);
            if (!consistencyResult.valid) {
                return consistencyResult;
            }
            return Object.freeze({
                valid: true,
                checksum: checksum1,
                artifactCount: artifacts1.length,
            });
        }
        catch (error) {
            return Object.freeze({
                valid: false,
                error: 'TRANSFORM_FAILED',
                differences: [],
            });
        }
    }
    /**
     * Validate multiple transformations for consistency.
     *
     * Performs n transformations and ensures all produce identical results.
     *
     * @param intent - Normalized intent to transform
     * @param exporter - Exporter to validate
     * @param iterations - Number of transformations to perform
     * @returns Round-trip validation result
     */
    validateMultiple(intent, exporter, iterations = 3) {
        if (iterations < 2) {
            iterations = 2;
        }
        try {
            const checksums = [];
            let firstArtifacts = null;
            for (let i = 0; i < iterations; i++) {
                const artifacts = exporter.transform(intent);
                const checksum = this.computePackageChecksum(artifacts);
                checksums.push(checksum);
                if (firstArtifacts === null) {
                    firstArtifacts = artifacts;
                }
            }
            // Check all checksums are identical
            const allMatch = checksums.every((cs) => cs === checksums[0]);
            const firstChecksum = checksums[0];
            const mismatchChecksum = checksums.find((cs) => cs !== firstChecksum);
            if (!allMatch && firstChecksum !== undefined && mismatchChecksum !== undefined) {
                return Object.freeze({
                    valid: false,
                    error: 'NON_DETERMINISTIC_TRANSFORM',
                    checksum1: firstChecksum,
                    checksum2: mismatchChecksum,
                    artifactCount: firstArtifacts?.length ?? 0,
                });
            }
            if (firstChecksum === undefined) {
                return Object.freeze({
                    valid: false,
                    error: 'TRANSFORM_FAILED',
                    differences: [],
                });
            }
            return Object.freeze({
                valid: true,
                checksum: firstChecksum,
                artifactCount: firstArtifacts?.length ?? 0,
            });
        }
        catch (error) {
            return Object.freeze({
                valid: false,
                error: 'TRANSFORM_FAILED',
                differences: [],
            });
        }
    }
    /**
     * Compute a deterministic package checksum.
     *
     * Based on SPARC_PSEUDOCODE.md section 6.3 computePackageChecksum subroutine.
     *
     * @param artifacts - Artifacts to checksum
     * @returns Hex-encoded SHA-256 checksum
     */
    computePackageChecksum(artifacts) {
        // Sort artifacts by path for deterministic ordering
        const sortedArtifacts = [...artifacts].sort((a, b) => a.path.localeCompare(b.path));
        // Create composite checksum input
        const checksumInput = sortedArtifacts.map((a) => ({
            path: a.path,
            contentHash: this.computeContentHash(a.content),
        }));
        // Serialize canonically and compute checksum
        const canonical = this.serializeCanonical(checksumInput);
        return this.computeSHA256(canonical);
    }
    /**
     * Find specific differences between two artifact sets.
     *
     * Based on SPARC_PSEUDOCODE.md section 6.3 findArtifactDifferences subroutine.
     *
     * @param artifacts1 - First artifact set
     * @param artifacts2 - Second artifact set
     * @param includeContentDiff - Whether to include detailed content diffs
     * @returns Array of differences found
     */
    findArtifactDifferences(artifacts1, artifacts2, includeContentDiff = false) {
        const differences = [];
        const paths1 = new Set(artifacts1.map((a) => a.path));
        const paths2 = new Set(artifacts2.map((a) => a.path));
        // Files only in first set
        for (const path of paths1) {
            if (!paths2.has(path)) {
                differences.push(Object.freeze({
                    type: 'MISSING_IN_SECOND',
                    path,
                }));
            }
        }
        // Files only in second set
        for (const path of paths2) {
            if (!paths1.has(path)) {
                differences.push(Object.freeze({
                    type: 'MISSING_IN_FIRST',
                    path,
                }));
            }
        }
        // Compare content of matching files
        const commonPaths = [...paths1].filter((p) => paths2.has(p));
        for (const path of commonPaths) {
            const a1 = artifacts1.find((a) => a.path === path);
            const a2 = artifacts2.find((a) => a.path === path);
            const content1 = this.normalizeContent(a1.content);
            const content2 = this.normalizeContent(a2.content);
            if (content1 !== content2) {
                const hash1 = this.computeSHA256(content1);
                const hash2 = this.computeSHA256(content2);
                const baseDifference = {
                    type: 'CONTENT_DIFFERS',
                    path,
                    hash1,
                    hash2,
                };
                const difference = includeContentDiff
                    ? { ...baseDifference, contentDiff: this.computeContentDiff(content1, content2) }
                    : baseDifference;
                differences.push(Object.freeze(difference));
            }
        }
        return Object.freeze(differences);
    }
    // ===========================================================================
    // PRIVATE METHODS
    // ===========================================================================
    /**
     * Verify individual artifact consistency between two sets.
     */
    verifyArtifactConsistency(artifacts1, artifacts2) {
        // Check artifact counts match
        if (artifacts1.length !== artifacts2.length) {
            return Object.freeze({
                valid: false,
                error: 'ARTIFACT_COUNT_MISMATCH',
                checksum1: String(artifacts1.length),
                checksum2: String(artifacts2.length),
            });
        }
        // Sort both by path for consistent comparison
        const sorted1 = [...artifacts1].sort((a, b) => a.path.localeCompare(b.path));
        const sorted2 = [...artifacts2].sort((a, b) => a.path.localeCompare(b.path));
        for (let i = 0; i < sorted1.length; i++) {
            const a1 = sorted1[i];
            const a2 = sorted2[i];
            if (a1.path !== a2.path) {
                return Object.freeze({
                    valid: false,
                    error: 'PATH_MISMATCH',
                    index: i,
                    path1: a1.path,
                    path2: a2.path,
                });
            }
            const content1 = this.normalizeContent(a1.content);
            const content2 = this.normalizeContent(a2.content);
            if (content1 !== content2) {
                return Object.freeze({
                    valid: false,
                    error: 'CONTENT_MISMATCH',
                    path: a1.path,
                    diff: this.computeContentDiff(content1, content2),
                });
            }
        }
        return Object.freeze({ valid: true });
    }
    /**
     * Compute SHA-256 hash of content.
     */
    computeSHA256(data) {
        const hash = createHash('sha256');
        hash.update(data, 'utf-8');
        return hash.digest('hex');
    }
    /**
     * Compute content hash for an artifact.
     */
    computeContentHash(content) {
        const normalized = this.normalizeContent(content);
        return this.computeSHA256(normalized);
    }
    /**
     * Normalize content to a string for comparison.
     */
    normalizeContent(content) {
        if (typeof content === 'string') {
            return content;
        }
        if (Buffer.isBuffer(content)) {
            return content.toString('utf-8');
        }
        // Serialize objects with sorted keys for determinism
        return JSON.stringify(content, this.sortedReplacer, 0);
    }
    /**
     * JSON replacer that sorts object keys.
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
    /**
     * Serialize object to canonical JSON form.
     */
    serializeCanonical(obj) {
        return JSON.stringify(obj, this.sortedReplacer, 0);
    }
    /**
     * Compute a simple diff between two content strings.
     */
    computeContentDiff(content1, content2) {
        const lines1 = content1.split('\n');
        const lines2 = content2.split('\n');
        const diffs = [];
        const maxLines = Math.max(lines1.length, lines2.length);
        for (let i = 0; i < Math.min(maxLines, 10); i++) {
            const line1 = lines1[i];
            const line2 = lines2[i];
            if (line1 !== line2) {
                if (line1 === undefined) {
                    diffs.push(`+${i + 1}: ${line2}`);
                }
                else if (line2 === undefined) {
                    diffs.push(`-${i + 1}: ${line1}`);
                }
                else {
                    diffs.push(`-${i + 1}: ${line1}`);
                    diffs.push(`+${i + 1}: ${line2}`);
                }
            }
        }
        if (maxLines > 10) {
            diffs.push(`... and ${maxLines - 10} more lines`);
        }
        return diffs.join('\n');
    }
}
// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================
/**
 * Create a new RoundTripValidator instance.
 */
export function createRoundTripValidator() {
    return new RoundTripValidator();
}
// =============================================================================
// STANDALONE UTILITY FUNCTIONS
// =============================================================================
/**
 * Validate that an exporter produces deterministic output.
 *
 * Convenience function for one-off validation.
 *
 * @param intent - Normalized intent to transform
 * @param exporter - Exporter to validate
 * @param options - Validation options
 * @returns Round-trip validation result
 */
export function validateRoundTrip(intent, exporter, options) {
    const validator = new RoundTripValidator();
    return validator.validate(intent, exporter, options);
}
/**
 * Compute package checksum for artifacts.
 *
 * @param artifacts - Artifacts to checksum
 * @returns Hex-encoded SHA-256 checksum
 */
export function computePackageChecksum(artifacts) {
    const validator = new RoundTripValidator();
    return validator.computePackageChecksum(artifacts);
}
//# sourceMappingURL=RoundTripValidator.js.map