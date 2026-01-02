/**
 * Core Type Definitions for Agentics Deployment Exporters
 *
 * This module defines all fundamental types used throughout the exporter system.
 * All types are designed for immutability and deterministic behavior.
 *
 * @module core/types
 * @version 1.0.0
 */
import { z } from 'zod';
import { v5 as uuidv5 } from 'uuid';
// =============================================================================
// CONSTANTS
// =============================================================================
/**
 * Fixed namespace UUID for deterministic UUID v5 generation.
 * Generated from "agentics.io/deployment-exporters" using DNS namespace.
 */
export const UUID_NAMESPACE_AGENTICS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
/**
 * Zod schema for semantic version validation.
 */
export const SemanticVersionSchema = z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Invalid semantic version format')
    .transform((v) => v);
/**
 * Parse a semantic version string into its components.
 * Pure function - no side effects.
 */
export function parseSemanticVersion(version) {
    const [major, minor, patch] = version.split('.').map(Number);
    return Object.freeze({ major: major, minor: minor, patch: patch });
}
// =============================================================================
// EXPORT FORMAT
// =============================================================================
/**
 * Supported export target formats.
 * Each format corresponds to a specific infrastructure-as-code target.
 */
export const ExportFormatValues = [
    'terraform',
    'kubernetes',
    'helm',
    'cloudformation',
    'arm',
    'gcp-dm',
    'iam',
    'sql',
    'docker-compose',
    'config',
];
export const ExportFormatSchema = z.enum(ExportFormatValues);
// =============================================================================
// SERIALIZER TYPE
// =============================================================================
/**
 * Supported serialization formats.
 */
export const SerializerTypeValues = [
    'hcl',
    'yaml',
    'json',
    'sql',
    'toml',
    'ini',
    'env',
];
export const SerializerTypeSchema = z.enum(SerializerTypeValues);
// =============================================================================
// SIGNING ALGORITHM
// =============================================================================
/**
 * Supported cryptographic signing algorithms.
 */
export const SigningAlgorithmValues = [
    'ed25519',
    'rsa-pss',
    'ecdsa-p256',
    'ecdsa-p384',
];
export const SigningAlgorithmSchema = z.enum(SigningAlgorithmValues);
// =============================================================================
// INTENT SECTION
// =============================================================================
/**
 * Sections of a DeploymentIntent that can be processed by exporters.
 */
export const IntentSectionValues = [
    'compute',
    'network',
    'storage',
    'database',
    'kubernetes',
    'security',
    'config',
];
export const IntentSectionSchema = z.enum(IntentSectionValues);
// =============================================================================
// CLOUD PROVIDER
// =============================================================================
/**
 * Supported cloud providers.
 */
export const CloudProviderValues = ['aws', 'gcp', 'azure', 'multi'];
export const CloudProviderSchema = z.enum(CloudProviderValues);
// =============================================================================
// CONTENT ENCODING
// =============================================================================
/**
 * Supported content encodings for artifacts.
 */
export const ContentEncodingValues = ['utf-8', 'binary'];
export const ContentEncodingSchema = z.enum(ContentEncodingValues);
export const ExportArtifactSchema = z.object({
    path: z.string().min(1),
    content: z.unknown(),
    format: SerializerTypeSchema,
    encoding: ContentEncodingSchema,
    metadata: z.record(z.unknown()).optional(),
});
export const ExportOptionsSchema = z.object({
    provider: CloudProviderSchema.optional(),
    environment: z.string().optional(),
    variables: z.record(z.unknown()).optional(),
    verbose: z.boolean().optional(),
});
// =============================================================================
// VALIDATION RESULT
// =============================================================================
/**
 * Severity levels for validation issues.
 */
export const ValidationSeverityValues = ['error', 'warning'];
export const ValidationErrorSchema = z.object({
    code: z.string(),
    message: z.string(),
    path: z.string().optional(),
    expected: z.unknown().optional(),
    actual: z.unknown().optional(),
});
export const ValidationWarningSchema = z.object({
    code: z.string(),
    message: z.string(),
    path: z.string().optional(),
});
export const ValidationResultSchema = z.object({
    valid: z.boolean(),
    errors: z.array(ValidationErrorSchema),
    warnings: z.array(ValidationWarningSchema),
});
/**
 * Intent format detection result.
 */
export const IntentFormatValues = ['json', 'yaml', 'unknown'];
// =============================================================================
// ERROR STAGE
// =============================================================================
/**
 * Processing stages where errors can occur.
 * Used for error categorization and handling.
 */
export const ErrorStageValues = [
    'parse',
    'validate',
    'transform',
    'serialize',
    'package',
];
export const ErrorStageSchema = z.enum(ErrorStageValues);
// =============================================================================
// ERROR CODES
// =============================================================================
/**
 * Error code ranges by category.
 * V1xxx: Validation errors
 * S2xxx: Schema errors
 * T3xxx: Transform errors
 * E4xxx: Serialization errors
 * I5xxx: Integrity errors
 */
export const ErrorCodeRanges = {
    VALIDATION: { start: 1000, end: 1999, prefix: 'V' },
    SCHEMA: { start: 2000, end: 2999, prefix: 'S' },
    TRANSFORM: { start: 3000, end: 3999, prefix: 'T' },
    SERIALIZATION: { start: 4000, end: 4999, prefix: 'E' },
    INTEGRITY: { start: 5000, end: 5999, prefix: 'I' },
};
/**
 * Validation error codes (V1xxx)
 */
export const ValidationErrorCodes = {
    MISSING_REQUIRED_FIELD: 'V1001',
    INVALID_TYPE: 'V1002',
    VALUE_OUT_OF_RANGE: 'V1003',
    PATTERN_MISMATCH: 'V1004',
    ARRAY_LENGTH_VIOLATION: 'V1005',
    INVALID_REFERENCE: 'V1006',
    CONSTRAINT_VIOLATION: 'V1007',
    SEMANTIC_ERROR: 'V1008',
};
/**
 * Schema error codes (S2xxx)
 */
export const SchemaErrorCodes = {
    UNSUPPORTED_VERSION: 'S2001',
    VERSION_TOO_OLD: 'S2002',
    VERSION_TOO_NEW: 'S2003',
    UNKNOWN_KIND: 'S2004',
    SCHEMA_MISMATCH: 'S2005',
};
/**
 * Transform error codes (T3xxx)
 */
export const TransformErrorCodes = {
    TEMPLATE_RENDER_FAILED: 'T3001',
    RESOURCE_MAPPING_FAILED: 'T3002',
    COMPUTATION_OVERFLOW: 'T3003',
    CIRCULAR_DEPENDENCY: 'T3004',
    UNSUPPORTED_FEATURE: 'T3005',
    RESOURCE_CONFLICT: 'T3006',
};
/**
 * Serialization error codes (E4xxx)
 */
export const SerializationErrorCodes = {
    SYNTAX_ERROR: 'E4001',
    ENCODING_ERROR: 'E4002',
    SIZE_LIMIT_EXCEEDED: 'E4003',
    INVALID_UTF8: 'E4004',
    FORMAT_ERROR: 'E4005',
};
/**
 * Integrity error codes (I5xxx)
 */
export const IntegrityErrorCodes = {
    CHECKSUM_MISMATCH: 'I5001',
    SIGNATURE_VERIFICATION_FAILED: 'I5002',
    HASH_COMPUTATION_ERROR: 'I5003',
    MANIFEST_INCONSISTENCY: 'I5004',
};
// =============================================================================
// DETERMINISTIC UUID GENERATION
// =============================================================================
/**
 * Generate a deterministic UUID v5 from intent hash and resource path.
 * This ensures reproducible outputs across executions.
 *
 * @param intentHash - SHA256 hash of the intent content
 * @param resourcePath - Path to the resource (e.g., ['app', 'service', 'main'])
 * @returns Deterministic UUID v5 string
 *
 * @example
 * const uuid = generateDeterministicUUID('abc123...', ['compute', 'instance', 'web']);
 * // Always returns the same UUID for the same inputs
 */
export function generateDeterministicUUID(intentHash, resourcePath) {
    const name = `${intentHash}:${resourcePath.join('/')}`;
    return uuidv5(name, UUID_NAMESPACE_AGENTICS);
}
export const SerializerOptionsSchema = z.object({
    indent: z.number().int().min(0).max(8).optional(),
    useTabs: z.boolean().optional(),
    sortKeys: z.boolean().optional(),
    includeComments: z.boolean().optional(),
    lineWidth: z.number().int().min(40).max(200).optional(),
});
export const FormatOptionsSchema = SerializerOptionsSchema.extend({
    validateFirst: z.boolean().optional(),
});
// =============================================================================
// PROGRESS TRACKING
// =============================================================================
/**
 * Progress event types.
 */
export const ProgressEventTypeValues = [
    'start',
    'progress',
    'complete',
    'error',
];
// =============================================================================
// TYPE GUARDS
// =============================================================================
/**
 * Type guard for ExportFormat.
 */
export function isExportFormat(value) {
    return (typeof value === 'string' &&
        ExportFormatValues.includes(value));
}
/**
 * Type guard for SerializerType.
 */
export function isSerializerType(value) {
    return (typeof value === 'string' &&
        SerializerTypeValues.includes(value));
}
/**
 * Type guard for SigningAlgorithm.
 */
export function isSigningAlgorithm(value) {
    return (typeof value === 'string' &&
        SigningAlgorithmValues.includes(value));
}
/**
 * Type guard for IntentSection.
 */
export function isIntentSection(value) {
    return (typeof value === 'string' &&
        IntentSectionValues.includes(value));
}
/**
 * Type guard for CloudProvider.
 */
export function isCloudProvider(value) {
    return (typeof value === 'string' &&
        CloudProviderValues.includes(value));
}
/**
 * Type guard for ErrorStage.
 */
export function isErrorStage(value) {
    return (typeof value === 'string' && ErrorStageValues.includes(value));
}
// =============================================================================
// FREEZE UTILITIES
// =============================================================================
/**
 * Deep freeze an object to ensure immutability.
 * Pure function - creates frozen copy without modifying input.
 */
export function deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    const frozen = Object.freeze({ ...obj });
    Object.keys(frozen).forEach((key) => {
        const value = frozen[key];
        if (value !== null && typeof value === 'object') {
            frozen[key] = deepFreeze(value);
        }
    });
    return frozen;
}
//# sourceMappingURL=types.js.map