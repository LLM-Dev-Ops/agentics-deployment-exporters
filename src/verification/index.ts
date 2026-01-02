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

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  // Round-trip validation types
  RoundTripValidationResult,
  ArtifactDifference,
  ArtifactDifferenceType,
  RoundTripErrorCode,
  RoundTripOptions,
  // Verification result types
  VerificationResult,
  VerificationError,
  VerificationWarning,
  VerificationErrorCode,
  VerificationWarningCode,
  VerificationOptions,
  // Integrity types
  IntegrityResult,
  IntegrityError,
  IntegrityErrorCode,
  // Completeness types
  CompletenessResult,
  // Signature types
  ArtifactSignature,
  SignedArtifact,
  // Format constraint types
  FormatConstraintViolation,
  FormatConstraintResult,
} from './types.js';

export {
  // Type value arrays
  ArtifactDifferenceTypeValues,
  RoundTripErrorCodeValues,
  VerificationErrorCodeValues,
  VerificationWarningCodeValues,
  IntegrityErrorCodeValues,
  // Type guards
  isArtifactDifferenceType,
  isRoundTripErrorCode,
  isVerificationErrorCode,
  isIntegrityErrorCode,
  isSignedArtifact,
  isArtifactSignature,
} from './types.js';

// =============================================================================
// ROUND-TRIP VALIDATOR EXPORTS
// =============================================================================

export {
  RoundTripValidator,
  createRoundTripValidator,
  validateRoundTrip,
  computePackageChecksum,
} from './RoundTripValidator.js';

// =============================================================================
// INTEGRITY VERIFIER EXPORTS
// =============================================================================

export {
  IntegrityVerifier,
  createIntegrityVerifier,
  verifyArtifactIntegrity,
  verifyAllArtifactsIntegrity,
  computeContentHash,
} from './IntegrityVerifier.js';

// =============================================================================
// COMPLETENESS CHECKER EXPORTS
// =============================================================================

export type { CompletenessOptions, CompletenesSummary } from './CompletenessChecker.js';

export {
  CompletenessChecker,
  createCompletenessChecker,
  checkCompleteness,
  getMissingComponents,
  isExportComplete,
} from './CompletenessChecker.js';

// =============================================================================
// COMBINED VERIFICATION
// =============================================================================

import type { ExportArtifact, NormalizedIntent, ValidatedIntent } from '../core/types.js';
import type { IExporter } from '../core/interfaces.js';
import type {
  VerificationResult,
  VerificationError,
  VerificationWarning,
  VerificationOptions,
} from './types.js';
import { IntegrityVerifier } from './IntegrityVerifier.js';
import { CompletenessChecker } from './CompletenessChecker.js';
import { RoundTripValidator } from './RoundTripValidator.js';

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
export function verifyExport(
  artifacts: readonly ExportArtifact[],
  intent: ValidatedIntent | NormalizedIntent,
  options?: VerificationOptions
): VerificationResult {
  const errors: VerificationError[] = [];
  const warnings: VerificationWarning[] = [];

  // Integrity verification
  const integrityVerifier = new IntegrityVerifier(options);
  const integrityResult = integrityVerifier.verifyAll(artifacts);

  for (const error of integrityResult.errors) {
    errors.push({
      code: error.code as any,
      message: `Integrity error: ${error.code}`,
      details: {
        expected: error.expected,
        actual: error.actual,
        ...error.details,
      },
    });
  }

  // Completeness verification
  if (!options?.skipCompleteness) {
    const completenessChecker = new CompletenessChecker();
    const completenessResult = completenessChecker.check(intent, artifacts);

    if (!completenessResult.complete) {
      warnings.push({
        code: 'INCOMPLETE_EXPORT',
        message: `Export is ${completenessResult.completenessPercentage}% complete`,
        missingComponents: completenessResult.missingComponents,
      });
    }
  }

  const valid = errors.length === 0 && (!options?.strict || warnings.length === 0);

  const baseResult = {
    valid,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
  };

  return Object.freeze(
    valid
      ? baseResult
      : { ...baseResult, recommendation: 'Regenerate artifacts after fixing source intent' }
  );
}

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
export function verifyExportWithRoundTrip(
  intent: NormalizedIntent,
  exporter: IExporter,
  artifacts: readonly ExportArtifact[],
  options?: VerificationOptions
): VerificationResult {
  const errors: VerificationError[] = [];
  const warnings: VerificationWarning[] = [];

  // Round-trip validation
  const roundTripValidator = new RoundTripValidator();
  const roundTripResult = roundTripValidator.validate(intent, exporter);

  if (!roundTripResult.valid) {
    errors.push({
      code: 'INTEGRITY_FAILURE',
      message: `Non-deterministic transformation: ${roundTripResult.error}`,
      details: {
        checksum1: roundTripResult.checksum1,
        checksum2: roundTripResult.checksum2,
        differences: roundTripResult.differences,
      },
    });
  }

  // Run standard verification
  const standardResult = verifyExport(artifacts, intent, options);
  errors.push(...standardResult.errors);
  warnings.push(...standardResult.warnings);

  const valid = errors.length === 0 && (!options?.strict || warnings.length === 0);

  const baseResult = {
    valid,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
  };

  return Object.freeze(
    valid
      ? baseResult
      : { ...baseResult, recommendation: 'Regenerate artifacts after fixing source intent or exporter' }
  );
}
