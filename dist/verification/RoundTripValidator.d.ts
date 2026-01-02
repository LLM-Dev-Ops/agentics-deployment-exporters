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
import type { ExportArtifact, NormalizedIntent } from '../core/types.js';
import type { IExporter } from '../core/interfaces.js';
import type { RoundTripValidationResult, ArtifactDifference, RoundTripOptions } from './types.js';
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
export declare class RoundTripValidator {
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
    validate(intent: NormalizedIntent, exporter: IExporter, options?: RoundTripOptions): RoundTripValidationResult;
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
    validateMultiple(intent: NormalizedIntent, exporter: IExporter, iterations?: number): RoundTripValidationResult;
    /**
     * Compute a deterministic package checksum.
     *
     * Based on SPARC_PSEUDOCODE.md section 6.3 computePackageChecksum subroutine.
     *
     * @param artifacts - Artifacts to checksum
     * @returns Hex-encoded SHA-256 checksum
     */
    computePackageChecksum(artifacts: readonly ExportArtifact[]): string;
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
    findArtifactDifferences(artifacts1: readonly ExportArtifact[], artifacts2: readonly ExportArtifact[], includeContentDiff?: boolean): readonly ArtifactDifference[];
    /**
     * Verify individual artifact consistency between two sets.
     */
    private verifyArtifactConsistency;
    /**
     * Compute SHA-256 hash of content.
     */
    private computeSHA256;
    /**
     * Compute content hash for an artifact.
     */
    private computeContentHash;
    /**
     * Normalize content to a string for comparison.
     */
    private normalizeContent;
    /**
     * JSON replacer that sorts object keys.
     */
    private sortedReplacer;
    /**
     * Serialize object to canonical JSON form.
     */
    private serializeCanonical;
    /**
     * Compute a simple diff between two content strings.
     */
    private computeContentDiff;
}
/**
 * Create a new RoundTripValidator instance.
 */
export declare function createRoundTripValidator(): RoundTripValidator;
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
export declare function validateRoundTrip(intent: NormalizedIntent, exporter: IExporter, options?: RoundTripOptions): RoundTripValidationResult;
/**
 * Compute package checksum for artifacts.
 *
 * @param artifacts - Artifacts to checksum
 * @returns Hex-encoded SHA-256 checksum
 */
export declare function computePackageChecksum(artifacts: readonly ExportArtifact[]): string;
//# sourceMappingURL=RoundTripValidator.d.ts.map