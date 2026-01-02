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

import type { ExportArtifact } from '../core/types.js';

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
] as const;

export type ArtifactDifferenceType = (typeof ArtifactDifferenceTypeValues)[number];

/**
 * Represents a specific difference found between two artifact sets.
 *
 * Based on SPARC_PSEUDOCODE.md section 6.3 findArtifactDifferences subroutine.
 */
export interface ArtifactDifference {
  /** Type of difference detected */
  readonly type: ArtifactDifferenceType;
  /** Path of the affected artifact */
  readonly path: string;
  /** Hash from first transformation (if applicable) */
  readonly hash1?: string;
  /** Hash from second transformation (if applicable) */
  readonly hash2?: string;
  /** Index in the artifact array (for path mismatches) */
  readonly index?: number;
  /** Detailed content diff (for content mismatches) */
  readonly contentDiff?: string;
}

/**
 * Result of round-trip validation.
 *
 * Based on SPARC_PSEUDOCODE.md section 6.3 RoundTripValidation algorithm.
 * Validates that transformation is deterministic by checking that
 * re-transformation produces identical output.
 */
export interface RoundTripValidationResult {
  /** Whether the round-trip validation passed */
  readonly valid: boolean;
  /** Error code if validation failed */
  readonly error?: RoundTripErrorCode;
  /** Checksum from first transformation */
  readonly checksum1?: string;
  /** Checksum from second transformation */
  readonly checksum2?: string;
  /** Checksum when valid (same as checksum1 and checksum2) */
  readonly checksum?: string;
  /** Number of artifacts produced */
  readonly artifactCount?: number;
  /** Specific differences found between transformations */
  readonly differences?: readonly ArtifactDifference[];
  /** Path that had a mismatch (for PATH_MISMATCH errors) */
  readonly path1?: string;
  /** Second path in mismatch (for PATH_MISMATCH errors) */
  readonly path2?: string;
  /** Index of mismatched artifact */
  readonly index?: number;
  /** Path of artifact with content mismatch */
  readonly path?: string;
  /** Content diff for content mismatches */
  readonly diff?: string;
}

/**
 * Error codes for round-trip validation failures.
 */
export const RoundTripErrorCodeValues = [
  'NON_DETERMINISTIC_TRANSFORM',
  'PATH_MISMATCH',
  'CONTENT_MISMATCH',
  'ARTIFACT_COUNT_MISMATCH',
  'TRANSFORM_FAILED',
] as const;

export type RoundTripErrorCode = (typeof RoundTripErrorCodeValues)[number];

// =============================================================================
// VERIFICATION RESULT TYPES
// =============================================================================

/**
 * Overall verification result for export artifacts.
 *
 * Based on SPARC_PSEUDOCODE.md section 5.3 VerifyOutput algorithm.
 */
export interface VerificationResult {
  /** Whether all verification checks passed */
  readonly valid: boolean;
  /** Verification errors encountered */
  readonly errors: readonly VerificationError[];
  /** Verification warnings */
  readonly warnings: readonly VerificationWarning[];
  /** Recommendation for fixing issues (if any) */
  readonly recommendation?: string;
}

/**
 * Single verification error.
 */
export interface VerificationError {
  /** Error code */
  readonly code: VerificationErrorCode;
  /** Human-readable message */
  readonly message: string;
  /** Export format that had the error */
  readonly format?: string;
  /** Artifact path if applicable */
  readonly artifact?: string;
  /** Additional error details */
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Single verification warning.
 */
export interface VerificationWarning {
  /** Warning code */
  readonly code: VerificationWarningCode;
  /** Human-readable message */
  readonly message: string;
  /** Export format that had the warning */
  readonly format?: string;
  /** Missing components (for INCOMPLETE_EXPORT) */
  readonly missingComponents?: readonly string[];
}

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
] as const;

export type VerificationErrorCode = (typeof VerificationErrorCodeValues)[number];

/**
 * Verification warning codes.
 */
export const VerificationWarningCodeValues = [
  'INCOMPLETE_EXPORT',
  'MISSING_SIGNATURE',
  'DEPRECATED_FORMAT',
] as const;

export type VerificationWarningCode = (typeof VerificationWarningCodeValues)[number];

// =============================================================================
// INTEGRITY RESULT TYPES
// =============================================================================

/**
 * Result of artifact integrity verification.
 *
 * Based on SPARC_PSEUDOCODE.md section 5.3 verifyArtifactIntegrity subroutine.
 */
export interface IntegrityResult {
  /** Whether the artifact passes integrity checks */
  readonly valid: boolean;
  /** Integrity errors found */
  readonly errors: readonly IntegrityError[];
}

/**
 * Single integrity error.
 */
export interface IntegrityError {
  /** Error code */
  readonly code: IntegrityErrorCode;
  /** Expected value (for mismatches) */
  readonly expected?: string;
  /** Actual computed value (for mismatches) */
  readonly actual?: string;
  /** Timestamp value (for timestamp errors) */
  readonly signedAt?: string;
  /** Content type (for content validation errors) */
  readonly contentType?: string;
  /** Additional details */
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Integrity error codes.
 */
export const IntegrityErrorCodeValues = [
  'HASH_MISMATCH',
  'FUTURE_TIMESTAMP',
  'INVALID_CONTENT',
  'MISSING_SIGNATURE_FIELD',
  'INVALID_TIMESTAMP_FORMAT',
] as const;

export type IntegrityErrorCode = (typeof IntegrityErrorCodeValues)[number];

// =============================================================================
// COMPLETENESS TYPES
// =============================================================================

/**
 * Result of completeness verification.
 *
 * Verifies that all intent components were exported.
 */
export interface CompletenessResult {
  /** Whether the export is complete */
  readonly complete: boolean;
  /** Components that were successfully exported */
  readonly exportedComponents: readonly string[];
  /** Components that are missing from the export */
  readonly missingComponents: readonly string[];
  /** Total number of components in the intent */
  readonly totalComponents: number;
  /** Percentage of components exported (0-100) */
  readonly completenessPercentage: number;
}

// =============================================================================
// ARTIFACT SIGNATURE TYPES
// =============================================================================

/**
 * Signature metadata embedded in signed artifacts.
 *
 * Based on SPARC_PSEUDOCODE.md section 2.4 signArtifacts subroutine.
 */
export interface ArtifactSignature {
  /** Signing algorithm used */
  readonly algorithm: string;
  /** Hash of the artifact content */
  readonly contentHash: string;
  /** ID of the source intent */
  readonly sourceIntentId: string;
  /** Checksum of the source intent */
  readonly sourceChecksum: string;
  /** When the artifact was signed (ISO 8601) */
  readonly signedAt: string;
  /** Version of the signer */
  readonly signerVersion: string;
  /** Cryptographic signature (if using asymmetric signing) */
  readonly cryptographicSignature?: string;
}

/**
 * Artifact with signature metadata.
 */
export interface SignedArtifact extends ExportArtifact {
  /** Signature metadata */
  readonly _signature?: ArtifactSignature;
}

// =============================================================================
// FORMAT CONSTRAINT TYPES
// =============================================================================

/**
 * Format-specific constraint violation.
 */
export interface FormatConstraintViolation {
  /** Format that has the violation */
  readonly format: string;
  /** Constraint that was violated */
  readonly constraint: string;
  /** Description of the violation */
  readonly description: string;
  /** Artifact path if applicable */
  readonly artifactPath?: string;
}

/**
 * Result of format constraint verification.
 */
export interface FormatConstraintResult {
  /** Whether all constraints are satisfied */
  readonly valid: boolean;
  /** Constraint violations found */
  readonly errors: readonly FormatConstraintViolation[];
  /** Constraint warnings */
  readonly warnings: readonly FormatConstraintViolation[];
}

// =============================================================================
// VERIFIER OPTIONS
// =============================================================================

/**
 * Options for verification operations.
 */
export interface VerificationOptions {
  /** Skip signature verification */
  readonly skipSignatureVerification?: boolean;
  /** Skip format constraint verification */
  readonly skipFormatConstraints?: boolean;
  /** Skip completeness verification */
  readonly skipCompleteness?: boolean;
  /** Custom timestamp to compare against (for testing) */
  readonly referenceTimestamp?: string;
  /** Strict mode - fail on warnings */
  readonly strict?: boolean;
}

/**
 * Options for round-trip validation.
 */
export interface RoundTripOptions {
  /** Maximum number of transformations to perform */
  readonly maxIterations?: number;
  /** Whether to include detailed content diffs */
  readonly includeContentDiff?: boolean;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for ArtifactDifferenceType.
 */
export function isArtifactDifferenceType(
  value: unknown
): value is ArtifactDifferenceType {
  return (
    typeof value === 'string' &&
    ArtifactDifferenceTypeValues.includes(value as ArtifactDifferenceType)
  );
}

/**
 * Type guard for RoundTripErrorCode.
 */
export function isRoundTripErrorCode(value: unknown): value is RoundTripErrorCode {
  return (
    typeof value === 'string' &&
    RoundTripErrorCodeValues.includes(value as RoundTripErrorCode)
  );
}

/**
 * Type guard for VerificationErrorCode.
 */
export function isVerificationErrorCode(
  value: unknown
): value is VerificationErrorCode {
  return (
    typeof value === 'string' &&
    VerificationErrorCodeValues.includes(value as VerificationErrorCode)
  );
}

/**
 * Type guard for IntegrityErrorCode.
 */
export function isIntegrityErrorCode(value: unknown): value is IntegrityErrorCode {
  return (
    typeof value === 'string' &&
    IntegrityErrorCodeValues.includes(value as IntegrityErrorCode)
  );
}

/**
 * Type guard for SignedArtifact.
 */
export function isSignedArtifact(artifact: ExportArtifact): artifact is SignedArtifact {
  return '_signature' in artifact && artifact._signature !== undefined;
}

/**
 * Type guard for ArtifactSignature.
 */
export function isArtifactSignature(value: unknown): value is ArtifactSignature {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.algorithm === 'string' &&
    typeof obj.contentHash === 'string' &&
    typeof obj.sourceIntentId === 'string' &&
    typeof obj.sourceChecksum === 'string' &&
    typeof obj.signedAt === 'string' &&
    typeof obj.signerVersion === 'string'
  );
}
