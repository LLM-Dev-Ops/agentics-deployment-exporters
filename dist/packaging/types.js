/**
 * Type Definitions for Packaging Module
 *
 * This module defines all types used by the packaging components including
 * checksum, signing, manifest, and archive creation.
 *
 * @module packaging/types
 * @version 1.0.0
 */
// =============================================================================
// CHECKSUM TYPES
// =============================================================================
/**
 * Supported checksum algorithms.
 */
export const ChecksumAlgorithmValues = ['sha256', 'sha512', 'blake3'];
// =============================================================================
// TYPE GUARDS
// =============================================================================
/**
 * Type guard for ChecksumAlgorithm.
 */
export function isChecksumAlgorithm(value) {
    return (typeof value === 'string' &&
        ChecksumAlgorithmValues.includes(value));
}
/**
 * Type guard for PackageManifest.
 */
export function isPackageManifest(value) {
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
 * Type guard for LineageRecord.
 */
export function isLineageRecord(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const obj = value;
    return (typeof obj.artifactPath === 'string' &&
        typeof obj.sourceIntentHash === 'string' &&
        Array.isArray(obj.chain) &&
        typeof obj.artifactHash === 'string');
}
//# sourceMappingURL=types.js.map