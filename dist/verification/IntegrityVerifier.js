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
import { createHash } from 'node:crypto';
import { isSignedArtifact } from './types.js';
// =============================================================================
// CONSTANTS
// =============================================================================
/**
 * Maximum allowed future timestamp drift (in milliseconds).
 * Allows for small clock skew between systems.
 */
const MAX_FUTURE_DRIFT_MS = 60_000; // 1 minute
/**
 * Maximum age for timestamps (in milliseconds).
 * Very old timestamps might indicate corrupted data.
 */
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 1 year
/**
 * Default checksum algorithm.
 */
const DEFAULT_ALGORITHM = 'SHA-256';
// =============================================================================
// CONTENT VALIDATORS
// =============================================================================
/**
 * Content type validators for different serialization formats.
 */
const CONTENT_VALIDATORS = {
    json: (content) => {
        if (typeof content === 'string') {
            try {
                JSON.parse(content);
                return true;
            }
            catch {
                return false;
            }
        }
        return typeof content === 'object';
    },
    yaml: (content) => {
        if (typeof content !== 'string')
            return false;
        // Basic YAML validation - check for common patterns
        return !content.includes('\t') || content.includes(':');
    },
    hcl: (content) => {
        if (typeof content !== 'string')
            return false;
        // Basic HCL validation - check for block structure
        return content.includes('{') && content.includes('}');
    },
    sql: (content) => {
        if (typeof content !== 'string')
            return false;
        // Basic SQL validation - check for common keywords
        const upperContent = content.toUpperCase();
        return (upperContent.includes('CREATE') ||
            upperContent.includes('SELECT') ||
            upperContent.includes('INSERT') ||
            upperContent.includes('ALTER') ||
            upperContent.includes('DROP'));
    },
    toml: (content) => {
        if (typeof content !== 'string')
            return false;
        // Basic TOML validation
        return content.includes('=') || content.includes('[');
    },
    ini: (content) => {
        if (typeof content !== 'string')
            return false;
        // Basic INI validation
        return content.includes('=') || content.includes('[');
    },
    env: (content) => {
        if (typeof content !== 'string')
            return false;
        // Basic ENV validation - lines should be KEY=VALUE
        const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
        return lines.every((line) => line.includes('=') || line.trim() === '');
    },
};
// =============================================================================
// INTEGRITY VERIFIER
// =============================================================================
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
export class IntegrityVerifier {
    referenceTimestamp;
    /**
     * Create a new IntegrityVerifier.
     *
     * @param options - Verification options
     */
    constructor(options) {
        this.referenceTimestamp = options?.referenceTimestamp
            ? new Date(options.referenceTimestamp)
            : new Date();
    }
    /**
     * Verify the integrity of a single artifact.
     *
     * Based on SPARC_PSEUDOCODE.md section 5.3 verifyArtifactIntegrity subroutine.
     *
     * @param artifact - Artifact to verify
     * @returns Integrity verification result
     */
    verifyArtifact(artifact) {
        const errors = [];
        // Verify signature if present
        if (isSignedArtifact(artifact) && artifact._signature) {
            const signatureErrors = this.verifySignature(artifact._signature, artifact);
            errors.push(...signatureErrors);
        }
        // Verify content type
        const contentErrors = this.verifyContentType(artifact);
        errors.push(...contentErrors);
        return Object.freeze({
            valid: errors.length === 0,
            errors: Object.freeze(errors),
        });
    }
    /**
     * Verify the integrity of multiple artifacts.
     *
     * @param artifacts - Artifacts to verify
     * @returns Map of artifact path to integrity result
     */
    verifyArtifacts(artifacts) {
        const results = new Map();
        for (const artifact of artifacts) {
            results.set(artifact.path, this.verifyArtifact(artifact));
        }
        return results;
    }
    /**
     * Verify all artifacts and return a combined result.
     *
     * @param artifacts - Artifacts to verify
     * @returns Combined integrity result
     */
    verifyAll(artifacts) {
        const allErrors = [];
        for (const artifact of artifacts) {
            const result = this.verifyArtifact(artifact);
            allErrors.push(...result.errors);
        }
        return Object.freeze({
            valid: allErrors.length === 0,
            errors: Object.freeze(allErrors),
        });
    }
    /**
     * Verify signature metadata on a signed artifact.
     *
     * @param signature - Signature metadata to verify
     * @param artifact - Artifact containing the content
     * @returns Array of integrity errors (empty if valid)
     */
    verifySignature(signature, artifact) {
        const errors = [];
        // Verify required signature fields
        const requiredFields = [
            'algorithm',
            'contentHash',
            'sourceIntentId',
            'signedAt',
        ];
        for (const field of requiredFields) {
            if (!(field in signature) || !signature[field]) {
                errors.push(Object.freeze({
                    code: 'MISSING_SIGNATURE_FIELD',
                    details: { field },
                }));
            }
        }
        if (errors.length > 0) {
            return Object.freeze(errors);
        }
        // Recompute content hash
        const computedHash = this.computeContentHash(artifact.content, signature.algorithm);
        if (computedHash !== signature.contentHash) {
            errors.push(Object.freeze({
                code: 'HASH_MISMATCH',
                expected: signature.contentHash,
                actual: computedHash,
            }));
        }
        // Verify timestamp format and reasonableness
        const timestampResult = this.verifyTimestamp(signature.signedAt);
        if (timestampResult !== null) {
            errors.push(timestampResult);
        }
        return Object.freeze(errors);
    }
    /**
     * Verify that a timestamp is valid and reasonable.
     *
     * @param timestamp - ISO 8601 timestamp string
     * @returns Integrity error if invalid, null if valid
     */
    verifyTimestamp(timestamp) {
        // Parse timestamp
        const signedAt = new Date(timestamp);
        if (isNaN(signedAt.getTime())) {
            return Object.freeze({
                code: 'INVALID_TIMESTAMP_FORMAT',
                signedAt: timestamp,
            });
        }
        const now = this.referenceTimestamp.getTime();
        const signedAtMs = signedAt.getTime();
        // Check for future timestamp (with small drift allowance)
        if (signedAtMs > now + MAX_FUTURE_DRIFT_MS) {
            return Object.freeze({
                code: 'FUTURE_TIMESTAMP',
                signedAt: timestamp,
                details: {
                    referenceTime: this.referenceTimestamp.toISOString(),
                    driftMs: signedAtMs - now,
                },
            });
        }
        // Check for very old timestamp
        if (now - signedAtMs > MAX_AGE_MS) {
            // This is a warning-level issue, but we include it for completeness
            return null; // Don't fail on old timestamps
        }
        return null;
    }
    /**
     * Verify that content matches the declared format.
     *
     * @param artifact - Artifact to verify
     * @returns Array of integrity errors (empty if valid)
     */
    verifyContentType(artifact) {
        const errors = [];
        const validator = CONTENT_VALIDATORS[artifact.format];
        if (!validator) {
            // Unknown format - skip validation
            return Object.freeze(errors);
        }
        const content = artifact.content;
        if (!validator(content)) {
            errors.push(Object.freeze({
                code: 'INVALID_CONTENT',
                contentType: artifact.format,
                details: {
                    path: artifact.path,
                    expectedFormat: artifact.format,
                },
            }));
        }
        return Object.freeze(errors);
    }
    /**
     * Compute content hash using the specified algorithm.
     *
     * @param content - Content to hash
     * @param algorithm - Hash algorithm (e.g., "SHA-256")
     * @returns Hex-encoded hash
     */
    computeContentHash(content, algorithm = DEFAULT_ALGORITHM) {
        const normalizedContent = this.normalizeContent(content);
        const normalizedAlgorithm = algorithm.toLowerCase().replace('-', '');
        const hash = createHash(normalizedAlgorithm);
        hash.update(normalizedContent, 'utf-8');
        return hash.digest('hex');
    }
    // ===========================================================================
    // PRIVATE METHODS
    // ===========================================================================
    /**
     * Normalize content to a string for hashing.
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
}
// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================
/**
 * Create a new IntegrityVerifier instance.
 *
 * @param options - Verification options
 */
export function createIntegrityVerifier(options) {
    return new IntegrityVerifier(options);
}
// =============================================================================
// STANDALONE UTILITY FUNCTIONS
// =============================================================================
/**
 * Verify the integrity of an artifact.
 *
 * Convenience function for one-off verification.
 *
 * @param artifact - Artifact to verify
 * @returns Integrity verification result
 */
export function verifyArtifactIntegrity(artifact) {
    const verifier = new IntegrityVerifier();
    return verifier.verifyArtifact(artifact);
}
/**
 * Verify the integrity of multiple artifacts.
 *
 * @param artifacts - Artifacts to verify
 * @returns Combined integrity result
 */
export function verifyAllArtifactsIntegrity(artifacts) {
    const verifier = new IntegrityVerifier();
    return verifier.verifyAll(artifacts);
}
/**
 * Compute content hash for verification.
 *
 * @param content - Content to hash
 * @param algorithm - Hash algorithm (default: SHA-256)
 * @returns Hex-encoded hash
 */
export function computeContentHash(content, algorithm = 'SHA-256') {
    const verifier = new IntegrityVerifier();
    return verifier.computeContentHash(content, algorithm);
}
//# sourceMappingURL=IntegrityVerifier.js.map