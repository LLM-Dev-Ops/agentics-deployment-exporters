/**
 * Type Definitions for Verification Module
 *
 * This module defines all types used for verifying export artifacts,
 * round-trip validation, integrity checking, and completeness verification.
 *
 * Based on SPARC_PSEUDOCODE.md sections 5.3 and 6.3:
 * - Round-Trip Validation (6.3)
 * - Output Verification Failures (5.3)
 *
 * @module verification/types
 * @version 1.0.0
 */
// =============================================================================
// ROUND-TRIP VALIDATION TYPES
// =============================================================================
/**
 * Difference types found between artifact sets.
 */
export const ArtifactDifferenceTypeValues = [
    'MISSING_IN_FIRST',
    'MISSING_IN_SECOND',
    'CONTENT_DIFFERS',
    'PATH_MISMATCH',
    'CONTENT_TYPE_MISMATCH',
];
/**
 * Error codes for round-trip validation failures.
 */
export const RoundTripErrorCodeValues = [
    'NON_DETERMINISTIC_TRANSFORM',
    'PATH_MISMATCH',
    'CONTENT_MISMATCH',
    'ARTIFACT_COUNT_MISMATCH',
    'TRANSFORM_FAILED',
];
/**
 * Verification error codes.
 */
export const VerificationErrorCodeValues = [
    'INTEGRITY_FAILURE',
    'HASH_MISMATCH',
    'FUTURE_TIMESTAMP',
    'INVALID_CONTENT',
    'SIGNATURE_INVALID',
    'FORMAT_CONSTRAINT_VIOLATION',
];
/**
 * Verification warning codes.
 */
export const VerificationWarningCodeValues = [
    'INCOMPLETE_EXPORT',
    'MISSING_SIGNATURE',
    'DEPRECATED_FORMAT',
];
/**
 * Integrity error codes.
 */
export const IntegrityErrorCodeValues = [
    'HASH_MISMATCH',
    'FUTURE_TIMESTAMP',
    'INVALID_CONTENT',
    'MISSING_SIGNATURE_FIELD',
    'INVALID_TIMESTAMP_FORMAT',
];
// =============================================================================
// TYPE GUARDS
// =============================================================================
/**
 * Type guard for ArtifactDifferenceType.
 */
export function isArtifactDifferenceType(value) {
    return (typeof value === 'string' &&
        ArtifactDifferenceTypeValues.includes(value));
}
/**
 * Type guard for RoundTripErrorCode.
 */
export function isRoundTripErrorCode(value) {
    return (typeof value === 'string' &&
        RoundTripErrorCodeValues.includes(value));
}
/**
 * Type guard for VerificationErrorCode.
 */
export function isVerificationErrorCode(value) {
    return (typeof value === 'string' &&
        VerificationErrorCodeValues.includes(value));
}
/**
 * Type guard for IntegrityErrorCode.
 */
export function isIntegrityErrorCode(value) {
    return (typeof value === 'string' &&
        IntegrityErrorCodeValues.includes(value));
}
/**
 * Type guard for SignedArtifact.
 */
export function isSignedArtifact(artifact) {
    return '_signature' in artifact && artifact._signature !== undefined;
}
/**
 * Type guard for ArtifactSignature.
 */
export function isArtifactSignature(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const obj = value;
    return (typeof obj.algorithm === 'string' &&
        typeof obj.contentHash === 'string' &&
        typeof obj.sourceIntentId === 'string' &&
        typeof obj.sourceChecksum === 'string' &&
        typeof obj.signedAt === 'string' &&
        typeof obj.signerVersion === 'string');
}
//# sourceMappingURL=types.js.map