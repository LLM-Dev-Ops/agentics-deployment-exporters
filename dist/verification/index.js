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
export { 
// Type value arrays
ArtifactDifferenceTypeValues, RoundTripErrorCodeValues, VerificationErrorCodeValues, VerificationWarningCodeValues, IntegrityErrorCodeValues, 
// Type guards
isArtifactDifferenceType, isRoundTripErrorCode, isVerificationErrorCode, isIntegrityErrorCode, isSignedArtifact, isArtifactSignature, } from './types.js';
// =============================================================================
// ROUND-TRIP VALIDATOR EXPORTS
// =============================================================================
export { RoundTripValidator, createRoundTripValidator, validateRoundTrip, computePackageChecksum, } from './RoundTripValidator.js';
// =============================================================================
// INTEGRITY VERIFIER EXPORTS
// =============================================================================
export { IntegrityVerifier, createIntegrityVerifier, verifyArtifactIntegrity, verifyAllArtifactsIntegrity, computeContentHash, } from './IntegrityVerifier.js';
export { CompletenessChecker, createCompletenessChecker, checkCompleteness, getMissingComponents, isExportComplete, } from './CompletenessChecker.js';
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
export function verifyExport(artifacts, intent, options) {
    const errors = [];
    const warnings = [];
    // Integrity verification
    const integrityVerifier = new IntegrityVerifier(options);
    const integrityResult = integrityVerifier.verifyAll(artifacts);
    for (const error of integrityResult.errors) {
        errors.push({
            code: error.code,
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
    return Object.freeze(valid
        ? baseResult
        : { ...baseResult, recommendation: 'Regenerate artifacts after fixing source intent' });
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
export function verifyExportWithRoundTrip(intent, exporter, artifacts, options) {
    const errors = [];
    const warnings = [];
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
    return Object.freeze(valid
        ? baseResult
        : { ...baseResult, recommendation: 'Regenerate artifacts after fixing source intent or exporter' });
}
//# sourceMappingURL=index.js.map