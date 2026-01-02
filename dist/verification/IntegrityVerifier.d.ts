/**
 * Integrity Verifier for Artifact Validation
 *
 * Verifies the integrity of export artifacts by checking signatures,
 * content hashes, timestamps, and content validity.
 *
 * Based on SPARC_PSEUDOCODE.md section 5.3 verifyArtifactIntegrity subroutine:
 * - Verify signature if present
 * - Recompute content hash and compare
 * - Verify timestamp reasonableness
 * - Validate content type
 *
 * @module verification/IntegrityVerifier
 * @version 1.0.0
 */
import type { ExportArtifact } from '../core/types.js';
import type { IntegrityResult, IntegrityError, ArtifactSignature, VerificationOptions } from './types.js';
/**
 * Verifies the integrity of export artifacts.
 *
 * The verifier performs the following checks:
 * 1. Verifies signature metadata if present
 * 2. Recomputes content hash and compares with stored hash
 * 3. Validates timestamp reasonableness
 * 4. Validates content matches declared type
 *
 * @example
 * ```typescript
 * const verifier = new IntegrityVerifier();
 *
 * // Verify a single artifact
 * const result = verifier.verifyArtifact(artifact);
 * if (!result.valid) {
 *   console.error('Integrity check failed:', result.errors);
 * }
 *
 * // Verify multiple artifacts
 * const results = verifier.verifyArtifacts(artifacts);
 * ```
 */
export declare class IntegrityVerifier {
    private readonly referenceTimestamp;
    /**
     * Create a new IntegrityVerifier.
     *
     * @param options - Verification options
     */
    constructor(options?: VerificationOptions);
    /**
     * Verify the integrity of a single artifact.
     *
     * Based on SPARC_PSEUDOCODE.md section 5.3 verifyArtifactIntegrity subroutine.
     *
     * @param artifact - Artifact to verify
     * @returns Integrity verification result
     */
    verifyArtifact(artifact: ExportArtifact): IntegrityResult;
    /**
     * Verify the integrity of multiple artifacts.
     *
     * @param artifacts - Artifacts to verify
     * @returns Map of artifact path to integrity result
     */
    verifyArtifacts(artifacts: readonly ExportArtifact[]): ReadonlyMap<string, IntegrityResult>;
    /**
     * Verify all artifacts and return a combined result.
     *
     * @param artifacts - Artifacts to verify
     * @returns Combined integrity result
     */
    verifyAll(artifacts: readonly ExportArtifact[]): IntegrityResult;
    /**
     * Verify signature metadata on a signed artifact.
     *
     * @param signature - Signature metadata to verify
     * @param artifact - Artifact containing the content
     * @returns Array of integrity errors (empty if valid)
     */
    verifySignature(signature: ArtifactSignature, artifact: ExportArtifact): readonly IntegrityError[];
    /**
     * Verify that a timestamp is valid and reasonable.
     *
     * @param timestamp - ISO 8601 timestamp string
     * @returns Integrity error if invalid, null if valid
     */
    verifyTimestamp(timestamp: string): IntegrityError | null;
    /**
     * Verify that content matches the declared format.
     *
     * @param artifact - Artifact to verify
     * @returns Array of integrity errors (empty if valid)
     */
    verifyContentType(artifact: ExportArtifact): readonly IntegrityError[];
    /**
     * Compute content hash using the specified algorithm.
     *
     * @param content - Content to hash
     * @param algorithm - Hash algorithm (e.g., "SHA-256")
     * @returns Hex-encoded hash
     */
    computeContentHash(content: unknown, algorithm?: string): string;
    /**
     * Normalize content to a string for hashing.
     */
    private normalizeContent;
    /**
     * JSON replacer that sorts object keys.
     */
    private sortedReplacer;
}
/**
 * Create a new IntegrityVerifier instance.
 *
 * @param options - Verification options
 */
export declare function createIntegrityVerifier(options?: VerificationOptions): IntegrityVerifier;
/**
 * Verify the integrity of an artifact.
 *
 * Convenience function for one-off verification.
 *
 * @param artifact - Artifact to verify
 * @returns Integrity verification result
 */
export declare function verifyArtifactIntegrity(artifact: ExportArtifact): IntegrityResult;
/**
 * Verify the integrity of multiple artifacts.
 *
 * @param artifacts - Artifacts to verify
 * @returns Combined integrity result
 */
export declare function verifyAllArtifactsIntegrity(artifacts: readonly ExportArtifact[]): IntegrityResult;
/**
 * Compute content hash for verification.
 *
 * @param content - Content to hash
 * @param algorithm - Hash algorithm (default: SHA-256)
 * @returns Hex-encoded hash
 */
export declare function computeContentHash(content: unknown, algorithm?: string): string;
//# sourceMappingURL=IntegrityVerifier.d.ts.map