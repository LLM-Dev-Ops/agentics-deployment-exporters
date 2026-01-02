/**
 * Verification Module - Export Artifact Verification
 *
 * This module provides utilities for verifying export artifacts:
 * - Round-trip validation for determinism
 * - Integrity verification for content hashes and signatures
 * - Completeness checking for export coverage
 *
 * Based on SPARC_PSEUDOCODE.md sections:
 * - 5.3 Output Verification Failures
 * - 6.3 Round-Trip Validation
 *
 * @module verification
 * @version 1.0.0
 */
export type { RoundTripValidationResult, ArtifactDifference, ArtifactDifferenceType, RoundTripErrorCode, RoundTripOptions, VerificationResult, VerificationError, VerificationWarning, VerificationErrorCode, VerificationWarningCode, VerificationOptions, IntegrityResult, IntegrityError, IntegrityErrorCode, CompletenessResult, ArtifactSignature, SignedArtifact, FormatConstraintViolation, FormatConstraintResult, } from './types.js';
export { ArtifactDifferenceTypeValues, RoundTripErrorCodeValues, VerificationErrorCodeValues, VerificationWarningCodeValues, IntegrityErrorCodeValues, isArtifactDifferenceType, isRoundTripErrorCode, isVerificationErrorCode, isIntegrityErrorCode, isSignedArtifact, isArtifactSignature, } from './types.js';
export { RoundTripValidator, createRoundTripValidator, validateRoundTrip, computePackageChecksum, } from './RoundTripValidator.js';
export { IntegrityVerifier, createIntegrityVerifier, verifyArtifactIntegrity, verifyAllArtifactsIntegrity, computeContentHash, } from './IntegrityVerifier.js';
export type { CompletenessOptions, CompletenesSummary } from './CompletenessChecker.js';
export { CompletenessChecker, createCompletenessChecker, checkCompleteness, getMissingComponents, isExportComplete, } from './CompletenessChecker.js';
import type { ExportArtifact, NormalizedIntent, ValidatedIntent } from '../core/types.js';
import type { IExporter } from '../core/interfaces.js';
import type { VerificationResult, VerificationOptions } from './types.js';
/**
 * Combined verification of export artifacts.
 *
 * Performs all verification checks:
 * - Integrity verification (hashes, signatures, timestamps)
 * - Completeness checking (all components exported)
 * - Optionally, round-trip validation (determinism)
 *
 * @param artifacts - Artifacts to verify
 * @param intent - Source intent for completeness checking
 * @param options - Verification options
 * @returns Combined verification result
 */
export declare function verifyExport(artifacts: readonly ExportArtifact[], intent: ValidatedIntent | NormalizedIntent, options?: VerificationOptions): VerificationResult;
/**
 * Full verification including round-trip validation.
 *
 * Performs all verification checks plus round-trip validation
 * to ensure deterministic transformation.
 *
 * @param intent - Source intent
 * @param exporter - Exporter that produced the artifacts
 * @param artifacts - Artifacts to verify
 * @param options - Verification options
 * @returns Combined verification result
 */
export declare function verifyExportWithRoundTrip(intent: NormalizedIntent, exporter: IExporter, artifacts: readonly ExportArtifact[], options?: VerificationOptions): VerificationResult;
//# sourceMappingURL=index.d.ts.map