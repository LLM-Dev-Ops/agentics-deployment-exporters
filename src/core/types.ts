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

// =============================================================================
// BRANDED TYPES (for type safety)
// =============================================================================

/**
 * Branded type for exporter identifiers.
 * Ensures type safety when passing exporter IDs between functions.
 */
export type ExporterId = string & { readonly __brand: 'ExporterId' };

/**
 * Branded type for serializer identifiers.
 */
export type SerializerId = string & { readonly __brand: 'SerializerId' };

/**
 * Branded type for signer identifiers.
 */
export type SignerId = string & { readonly __brand: 'SignerId' };

// =============================================================================
// SEMANTIC VERSION
// =============================================================================

/**
 * Semantic version string type following semver format.
 * Pattern: MAJOR.MINOR.PATCH
 */
export type SemanticVersion = `${number}.${number}.${number}`;

/**
 * Zod schema for semantic version validation.
 */
export const SemanticVersionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'Invalid semantic version format')
  .transform((v) => v as SemanticVersion);

/**
 * Parsed semantic version for comparison operations.
 */
export interface ParsedSemanticVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

/**
 * Parse a semantic version string into its components.
 * Pure function - no side effects.
 */
export function parseSemanticVersion(version: SemanticVersion): ParsedSemanticVersion {
  const [major, minor, patch] = version.split('.').map(Number);
  return Object.freeze({ major: major!, minor: minor!, patch: patch! });
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
] as const;

export type ExportFormat = (typeof ExportFormatValues)[number];

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
] as const;

export type SerializerType = (typeof SerializerTypeValues)[number];

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
] as const;

export type SigningAlgorithm = (typeof SigningAlgorithmValues)[number];

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
] as const;

export type IntentSection = (typeof IntentSectionValues)[number];

export const IntentSectionSchema = z.enum(IntentSectionValues);

// =============================================================================
// CLOUD PROVIDER
// =============================================================================

/**
 * Supported cloud providers.
 */
export const CloudProviderValues = ['aws', 'gcp', 'azure', 'multi'] as const;

export type CloudProvider = (typeof CloudProviderValues)[number];

export const CloudProviderSchema = z.enum(CloudProviderValues);

// =============================================================================
// CONTENT ENCODING
// =============================================================================

/**
 * Supported content encodings for artifacts.
 */
export const ContentEncodingValues = ['utf-8', 'binary'] as const;

export type ContentEncoding = (typeof ContentEncodingValues)[number];

export const ContentEncodingSchema = z.enum(ContentEncodingValues);

// =============================================================================
// EXPORT ARTIFACT
// =============================================================================

/**
 * Represents a single exported artifact.
 * Artifacts are immutable and contain all information needed for serialization.
 */
export interface ExportArtifact {
  /** Relative path within output directory */
  readonly path: string;
  /** Raw content (pre-serialization) - must be serializable */
  readonly content: unknown;
  /** Target format for serialization */
  readonly format: SerializerType;
  /** Content encoding */
  readonly encoding: ContentEncoding;
  /** Optional metadata for traceability */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export const ExportArtifactSchema = z.object({
  path: z.string().min(1),
  content: z.unknown(),
  format: SerializerTypeSchema,
  encoding: ContentEncodingSchema,
  metadata: z.record(z.unknown()).optional(),
});

// =============================================================================
// EXPORT OPTIONS
// =============================================================================

/**
 * Configuration options for export operations.
 */
export interface ExportOptions {
  /** Target cloud provider */
  readonly provider?: CloudProvider;
  /** Target environment name */
  readonly environment?: string;
  /** Additional variables for templating */
  readonly variables?: Readonly<Record<string, unknown>>;
  /** Enable verbose output in generated artifacts */
  readonly verbose?: boolean;
}

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
export const ValidationSeverityValues = ['error', 'warning'] as const;

export type ValidationSeverity = (typeof ValidationSeverityValues)[number];

/**
 * Single validation error with location and remediation info.
 */
export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly expected?: unknown;
  readonly actual?: unknown;
}

/**
 * Single validation warning.
 */
export interface ValidationWarning {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

/**
 * Result of a validation operation.
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
}

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

// =============================================================================
// PARSED INTENT
// =============================================================================

/**
 * Source location metadata for error reporting.
 */
export interface SourceLocation {
  readonly line: number;
  readonly column: number;
  readonly offset: number;
}

/**
 * Source map for tracking original positions.
 */
export interface SourceMap {
  readonly locations: Readonly<Record<string, SourceLocation>>;
}

/**
 * Intent format detection result.
 */
export const IntentFormatValues = ['json', 'yaml', 'unknown'] as const;

export type IntentFormat = (typeof IntentFormatValues)[number];

/**
 * Result of parsing a DeploymentIntent file.
 * Contains raw data with source location metadata.
 */
export interface ParsedIntent {
  /** Raw parsed data */
  readonly data: Readonly<Record<string, unknown>>;
  /** Source location metadata */
  readonly sourceMap?: SourceMap;
  /** Detected format */
  readonly format: IntentFormat;
  /** Original source content (for error reporting) */
  readonly source?: string;
}

// =============================================================================
// VALIDATED INTENT
// =============================================================================

/**
 * Intent that has passed all validation checks.
 * Contains typed, validated data.
 */
export interface ValidatedIntent {
  /** Intent identifier */
  readonly intentId: string;
  /** Intent version */
  readonly version: SemanticVersion;
  /** Schema version */
  readonly schemaVersion: SemanticVersion;
  /** Creation timestamp from metadata */
  readonly createdAt: string;
  /** Content checksum */
  readonly checksum: string;
  /** Validated specification */
  readonly spec: ValidatedIntentSpec;
  /** Provenance information */
  readonly provenance?: IntentProvenance;
}

/**
 * Validated intent specification.
 */
export interface ValidatedIntentSpec {
  readonly target: IntentTarget;
  readonly resources: readonly IntentResource[];
  readonly networking?: Readonly<Record<string, unknown>>;
  readonly security?: Readonly<Record<string, unknown>>;
  readonly observability?: Readonly<Record<string, unknown>>;
  readonly scaling?: Readonly<Record<string, unknown>>;
}

/**
 * Intent target specification.
 */
export interface IntentTarget {
  readonly provider: CloudProvider;
  readonly region?: string;
  readonly environment?: string;
}

/**
 * Intent resource definition.
 */
export interface IntentResource {
  readonly type: string;
  readonly name: string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly dependencies?: readonly string[];
  readonly outputs?: readonly string[];
}

/**
 * Intent provenance information.
 */
export interface IntentProvenance {
  readonly sourceIntent?: string;
  readonly derivationChain?: readonly string[];
  readonly auditTrail?: readonly AuditEntry[];
}

/**
 * Single audit trail entry.
 */
export interface AuditEntry {
  readonly timestamp: string;
  readonly actor: string;
  readonly action: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

// =============================================================================
// NORMALIZED INTENT
// =============================================================================

/**
 * Intent in canonical form after normalization.
 * All defaults applied, references expanded, structure canonicalized.
 */
export interface NormalizedIntent extends ValidatedIntent {
  /** Canonical hash of normalized content */
  readonly canonicalHash: string;
  /** Normalization metadata */
  readonly normalization: NormalizationMetadata;
}

/**
 * Metadata about the normalization process.
 */
export interface NormalizationMetadata {
  /** Normalizer version */
  readonly normalizerVersion: SemanticVersion;
  /** Defaults that were applied */
  readonly appliedDefaults: readonly string[];
  /** References that were expanded */
  readonly expandedReferences: readonly string[];
  /** Timestamp of normalization (from intent, not runtime) */
  readonly normalizedAt: string;
}

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
] as const;

export type ErrorStage = (typeof ErrorStageValues)[number];

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
} as const;

export type ErrorCodeRange = keyof typeof ErrorCodeRanges;

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
} as const;

/**
 * Schema error codes (S2xxx)
 */
export const SchemaErrorCodes = {
  UNSUPPORTED_VERSION: 'S2001',
  VERSION_TOO_OLD: 'S2002',
  VERSION_TOO_NEW: 'S2003',
  UNKNOWN_KIND: 'S2004',
  SCHEMA_MISMATCH: 'S2005',
} as const;

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
} as const;

/**
 * Serialization error codes (E4xxx)
 */
export const SerializationErrorCodes = {
  SYNTAX_ERROR: 'E4001',
  ENCODING_ERROR: 'E4002',
  SIZE_LIMIT_EXCEEDED: 'E4003',
  INVALID_UTF8: 'E4004',
  FORMAT_ERROR: 'E4005',
} as const;

/**
 * Integrity error codes (I5xxx)
 */
export const IntegrityErrorCodes = {
  CHECKSUM_MISMATCH: 'I5001',
  SIGNATURE_VERIFICATION_FAILED: 'I5002',
  HASH_COMPUTATION_ERROR: 'I5003',
  MANIFEST_INCONSISTENCY: 'I5004',
} as const;

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
export function generateDeterministicUUID(
  intentHash: string,
  resourcePath: readonly string[]
): string {
  const name = `${intentHash}:${resourcePath.join('/')}`;
  return uuidv5(name, UUID_NAMESPACE_AGENTICS);
}

// =============================================================================
// SERIALIZER OPTIONS
// =============================================================================

/**
 * Options for serialization operations.
 */
export interface SerializerOptions {
  /** Indentation size (spaces) */
  readonly indent?: number;
  /** Use tabs instead of spaces */
  readonly useTabs?: boolean;
  /** Sort object keys alphabetically */
  readonly sortKeys?: boolean;
  /** Include comments in output */
  readonly includeComments?: boolean;
  /** Line width for wrapping */
  readonly lineWidth?: number;
}

export const SerializerOptionsSchema = z.object({
  indent: z.number().int().min(0).max(8).optional(),
  useTabs: z.boolean().optional(),
  sortKeys: z.boolean().optional(),
  includeComments: z.boolean().optional(),
  lineWidth: z.number().int().min(40).max(200).optional(),
});

/**
 * Extended options for formatting operations.
 */
export interface FormatOptions extends SerializerOptions {
  /** Validate content before formatting */
  readonly validateFirst?: boolean;
}

export const FormatOptionsSchema = SerializerOptionsSchema.extend({
  validateFirst: z.boolean().optional(),
});

// =============================================================================
// SIGNING OPTIONS AND RESULTS
// =============================================================================

/**
 * Options for signing operations.
 */
export interface SignOptions {
  /** Key identifier */
  readonly keyId?: string;
  /** Include timestamp in signature */
  readonly timestamp?: boolean;
  /** Additional metadata to include */
  readonly metadata?: Readonly<Record<string, string>>;
}

/**
 * Result of a signing operation.
 */
export interface SignatureResult {
  /** Base64-encoded signature */
  readonly signature: string;
  /** Algorithm used */
  readonly algorithm: SigningAlgorithm;
  /** Key identifier */
  readonly keyId: string;
  /** Signing timestamp (if requested) */
  readonly timestamp?: string;
  /** Public key (for verification) */
  readonly publicKey?: string;
}

/**
 * Options for signature verification.
 */
export interface VerifyOptions {
  /** Expected key ID */
  readonly expectedKeyId?: string;
  /** Public key to use */
  readonly publicKey?: string;
  /** Allow expired signatures */
  readonly allowExpired?: boolean;
}

/**
 * Result of signature verification.
 */
export interface VerificationResult {
  readonly valid: boolean;
  readonly keyId?: string;
  readonly timestamp?: string;
  readonly error?: string;
}

// =============================================================================
// VALIDATION OPTIONS AND RULES
// =============================================================================

/**
 * Options for validation operations.
 */
export interface ValidationOptions {
  /** Strict mode - fail on warnings */
  readonly strict?: boolean;
  /** Rule IDs to skip */
  readonly skipRules?: readonly string[];
  /** Additional context for validation */
  readonly context?: Readonly<Record<string, unknown>>;
}

/**
 * Result of a validation rule check.
 */
export interface ValidationRuleResult {
  readonly passed: boolean;
  readonly message?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Validation rule definition.
 */
export interface ValidationRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly severity: ValidationSeverity;
  validate(intent: ParsedIntent): ValidationRuleResult;
}

/**
 * Result of intent validation.
 */
export interface IntentValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
  /** Validated intent (if valid) */
  readonly intent?: ValidatedIntent;
}

// =============================================================================
// ORCHESTRATION TYPES
// =============================================================================

/**
 * Options for orchestration operations.
 */
export interface OrchestrationOptions {
  /** Export formats to include */
  readonly formats?: readonly ExportFormat[];
  /** Maximum parallel exporters */
  readonly concurrency?: number;
  /** Continue on exporter failure */
  readonly continueOnError?: boolean;
  /** Dry run (plan only, no execution) */
  readonly dryRun?: boolean;
}

/**
 * Export operation metadata.
 */
export interface ExportMetadata {
  /** Export session ID */
  readonly sessionId: string;
  /** Start timestamp (from intent metadata, not runtime) */
  readonly startedAt: string;
  /** Completion timestamp (from intent metadata, not runtime) */
  readonly completedAt: string;
  /** Duration in milliseconds */
  readonly durationMs: number;
  /** Exporter versions used */
  readonly exporterVersions: Readonly<Record<ExporterId, SemanticVersion>>;
}

/**
 * Export error with full context.
 */
export interface ExportError {
  readonly exporterId: ExporterId;
  readonly code: string;
  readonly message: string;
  readonly stage: ErrorStage;
  readonly recoverable: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Export warning.
 */
export interface ExportWarning {
  readonly exporterId: ExporterId;
  readonly code: string;
  readonly message: string;
}

/**
 * Result of an export operation.
 */
export interface ExportResult {
  readonly success: boolean;
  readonly artifacts: readonly ExportArtifact[];
  readonly errors: readonly ExportError[];
  readonly warnings: readonly ExportWarning[];
  readonly metadata: ExportMetadata;
}

// =============================================================================
// EXECUTION PLAN
// =============================================================================

/**
 * Single exporter in an execution plan.
 */
export interface ExporterPlanItem {
  readonly exporterId: ExporterId;
  readonly exporterName: string;
  readonly targetFormat: ExportFormat;
  readonly estimatedArtifacts: number;
  readonly dependencies: readonly ExporterId[];
}

/**
 * Execution plan for export operations.
 */
export interface ExecutionPlan {
  /** Exporters to execute */
  readonly exporters: readonly ExporterPlanItem[];
  /** Execution order */
  readonly order: readonly ExporterId[];
  /** Dependencies between exporters */
  readonly dependencies: ReadonlyMap<ExporterId, readonly ExporterId[]>;
  /** Estimated total artifacts */
  readonly estimatedArtifacts: number;
}

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
] as const;

export type ProgressEventType = (typeof ProgressEventTypeValues)[number];

/**
 * Progress event for export operations.
 */
export interface ProgressEvent {
  readonly type: ProgressEventType;
  readonly exporterId?: ExporterId;
  readonly progress?: number;
  readonly message?: string;
  readonly artifact?: ExportArtifact;
  readonly error?: Error;
}

/**
 * Progress handler function type.
 */
export type ProgressHandler = (event: ProgressEvent) => void;

// =============================================================================
// TRACEABILITY METADATA
// =============================================================================

/**
 * Traceability metadata embedded in artifacts.
 */
export interface TraceabilityMetadata {
  /** Hash of the source intent */
  readonly intentHash: string;
  /** Intent version */
  readonly intentVersion: SemanticVersion;
  /** Exporter version */
  readonly exporterVersion: SemanticVersion;
  /** Export ID */
  readonly exportId: string;
  /** Correlation ID for multi-artifact exports */
  readonly correlationId: string;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for ExportFormat.
 */
export function isExportFormat(value: unknown): value is ExportFormat {
  return (
    typeof value === 'string' &&
    ExportFormatValues.includes(value as ExportFormat)
  );
}

/**
 * Type guard for SerializerType.
 */
export function isSerializerType(value: unknown): value is SerializerType {
  return (
    typeof value === 'string' &&
    SerializerTypeValues.includes(value as SerializerType)
  );
}

/**
 * Type guard for SigningAlgorithm.
 */
export function isSigningAlgorithm(value: unknown): value is SigningAlgorithm {
  return (
    typeof value === 'string' &&
    SigningAlgorithmValues.includes(value as SigningAlgorithm)
  );
}

/**
 * Type guard for IntentSection.
 */
export function isIntentSection(value: unknown): value is IntentSection {
  return (
    typeof value === 'string' &&
    IntentSectionValues.includes(value as IntentSection)
  );
}

/**
 * Type guard for CloudProvider.
 */
export function isCloudProvider(value: unknown): value is CloudProvider {
  return (
    typeof value === 'string' &&
    CloudProviderValues.includes(value as CloudProvider)
  );
}

/**
 * Type guard for ErrorStage.
 */
export function isErrorStage(value: unknown): value is ErrorStage {
  return (
    typeof value === 'string' && ErrorStageValues.includes(value as ErrorStage)
  );
}

// =============================================================================
// FREEZE UTILITIES
// =============================================================================

/**
 * Deep freeze an object to ensure immutability.
 * Pure function - creates frozen copy without modifying input.
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const frozen = Object.freeze({ ...obj });

  Object.keys(frozen).forEach((key) => {
    const value = (frozen as Record<string, unknown>)[key];
    if (value !== null && typeof value === 'object') {
      (frozen as Record<string, unknown>)[key] = deepFreeze(value);
    }
  });

  return frozen;
}
