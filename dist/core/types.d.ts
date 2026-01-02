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
/**
 * Fixed namespace UUID for deterministic UUID v5 generation.
 * Generated from "agentics.io/deployment-exporters" using DNS namespace.
 */
export declare const UUID_NAMESPACE_AGENTICS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
/**
 * Branded type for exporter identifiers.
 * Ensures type safety when passing exporter IDs between functions.
 */
export type ExporterId = string & {
    readonly __brand: 'ExporterId';
};
/**
 * Branded type for serializer identifiers.
 */
export type SerializerId = string & {
    readonly __brand: 'SerializerId';
};
/**
 * Branded type for signer identifiers.
 */
export type SignerId = string & {
    readonly __brand: 'SignerId';
};
/**
 * Semantic version string type following semver format.
 * Pattern: MAJOR.MINOR.PATCH
 */
export type SemanticVersion = `${number}.${number}.${number}`;
/**
 * Zod schema for semantic version validation.
 */
export declare const SemanticVersionSchema: z.ZodEffects<z.ZodString, `${number}.${number}.${number}`, string>;
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
export declare function parseSemanticVersion(version: SemanticVersion): ParsedSemanticVersion;
/**
 * Supported export target formats.
 * Each format corresponds to a specific infrastructure-as-code target.
 */
export declare const ExportFormatValues: readonly ["terraform", "kubernetes", "helm", "cloudformation", "arm", "gcp-dm", "iam", "sql", "docker-compose", "config"];
export type ExportFormat = (typeof ExportFormatValues)[number];
export declare const ExportFormatSchema: z.ZodEnum<["terraform", "kubernetes", "helm", "cloudformation", "arm", "gcp-dm", "iam", "sql", "docker-compose", "config"]>;
/**
 * Supported serialization formats.
 */
export declare const SerializerTypeValues: readonly ["hcl", "yaml", "json", "sql", "toml", "ini", "env"];
export type SerializerType = (typeof SerializerTypeValues)[number];
export declare const SerializerTypeSchema: z.ZodEnum<["hcl", "yaml", "json", "sql", "toml", "ini", "env"]>;
/**
 * Supported cryptographic signing algorithms.
 */
export declare const SigningAlgorithmValues: readonly ["ed25519", "rsa-pss", "ecdsa-p256", "ecdsa-p384"];
export type SigningAlgorithm = (typeof SigningAlgorithmValues)[number];
export declare const SigningAlgorithmSchema: z.ZodEnum<["ed25519", "rsa-pss", "ecdsa-p256", "ecdsa-p384"]>;
/**
 * Sections of a DeploymentIntent that can be processed by exporters.
 */
export declare const IntentSectionValues: readonly ["compute", "network", "storage", "database", "kubernetes", "security", "config"];
export type IntentSection = (typeof IntentSectionValues)[number];
export declare const IntentSectionSchema: z.ZodEnum<["compute", "network", "storage", "database", "kubernetes", "security", "config"]>;
/**
 * Supported cloud providers.
 */
export declare const CloudProviderValues: readonly ["aws", "gcp", "azure", "multi"];
export type CloudProvider = (typeof CloudProviderValues)[number];
export declare const CloudProviderSchema: z.ZodEnum<["aws", "gcp", "azure", "multi"]>;
/**
 * Supported content encodings for artifacts.
 */
export declare const ContentEncodingValues: readonly ["utf-8", "binary"];
export type ContentEncoding = (typeof ContentEncodingValues)[number];
export declare const ContentEncodingSchema: z.ZodEnum<["utf-8", "binary"]>;
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
export declare const ExportArtifactSchema: z.ZodObject<{
    path: z.ZodString;
    content: z.ZodUnknown;
    format: z.ZodEnum<["hcl", "yaml", "json", "sql", "toml", "ini", "env"]>;
    encoding: z.ZodEnum<["utf-8", "binary"]>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    path: string;
    format: "sql" | "hcl" | "yaml" | "json" | "toml" | "ini" | "env";
    encoding: "utf-8" | "binary";
    content?: unknown;
    metadata?: Record<string, unknown> | undefined;
}, {
    path: string;
    format: "sql" | "hcl" | "yaml" | "json" | "toml" | "ini" | "env";
    encoding: "utf-8" | "binary";
    content?: unknown;
    metadata?: Record<string, unknown> | undefined;
}>;
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
export declare const ExportOptionsSchema: z.ZodObject<{
    provider: z.ZodOptional<z.ZodEnum<["aws", "gcp", "azure", "multi"]>>;
    environment: z.ZodOptional<z.ZodString>;
    variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    verbose: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    provider?: "aws" | "gcp" | "azure" | "multi" | undefined;
    environment?: string | undefined;
    variables?: Record<string, unknown> | undefined;
    verbose?: boolean | undefined;
}, {
    provider?: "aws" | "gcp" | "azure" | "multi" | undefined;
    environment?: string | undefined;
    variables?: Record<string, unknown> | undefined;
    verbose?: boolean | undefined;
}>;
/**
 * Severity levels for validation issues.
 */
export declare const ValidationSeverityValues: readonly ["error", "warning"];
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
export declare const ValidationErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    path: z.ZodOptional<z.ZodString>;
    expected: z.ZodOptional<z.ZodUnknown>;
    actual: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    code: string;
    message: string;
    path?: string | undefined;
    expected?: unknown;
    actual?: unknown;
}, {
    code: string;
    message: string;
    path?: string | undefined;
    expected?: unknown;
    actual?: unknown;
}>;
export declare const ValidationWarningSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    path: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    message: string;
    path?: string | undefined;
}, {
    code: string;
    message: string;
    path?: string | undefined;
}>;
export declare const ValidationResultSchema: z.ZodObject<{
    valid: z.ZodBoolean;
    errors: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        path: z.ZodOptional<z.ZodString>;
        expected: z.ZodOptional<z.ZodUnknown>;
        actual: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        path?: string | undefined;
        expected?: unknown;
        actual?: unknown;
    }, {
        code: string;
        message: string;
        path?: string | undefined;
        expected?: unknown;
        actual?: unknown;
    }>, "many">;
    warnings: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        path: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        path?: string | undefined;
    }, {
        code: string;
        message: string;
        path?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    valid: boolean;
    errors: {
        code: string;
        message: string;
        path?: string | undefined;
        expected?: unknown;
        actual?: unknown;
    }[];
    warnings: {
        code: string;
        message: string;
        path?: string | undefined;
    }[];
}, {
    valid: boolean;
    errors: {
        code: string;
        message: string;
        path?: string | undefined;
        expected?: unknown;
        actual?: unknown;
    }[];
    warnings: {
        code: string;
        message: string;
        path?: string | undefined;
    }[];
}>;
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
export declare const IntentFormatValues: readonly ["json", "yaml", "unknown"];
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
/**
 * Processing stages where errors can occur.
 * Used for error categorization and handling.
 */
export declare const ErrorStageValues: readonly ["parse", "validate", "transform", "serialize", "package"];
export type ErrorStage = (typeof ErrorStageValues)[number];
export declare const ErrorStageSchema: z.ZodEnum<["parse", "validate", "transform", "serialize", "package"]>;
/**
 * Error code ranges by category.
 * V1xxx: Validation errors
 * S2xxx: Schema errors
 * T3xxx: Transform errors
 * E4xxx: Serialization errors
 * I5xxx: Integrity errors
 */
export declare const ErrorCodeRanges: {
    readonly VALIDATION: {
        readonly start: 1000;
        readonly end: 1999;
        readonly prefix: "V";
    };
    readonly SCHEMA: {
        readonly start: 2000;
        readonly end: 2999;
        readonly prefix: "S";
    };
    readonly TRANSFORM: {
        readonly start: 3000;
        readonly end: 3999;
        readonly prefix: "T";
    };
    readonly SERIALIZATION: {
        readonly start: 4000;
        readonly end: 4999;
        readonly prefix: "E";
    };
    readonly INTEGRITY: {
        readonly start: 5000;
        readonly end: 5999;
        readonly prefix: "I";
    };
};
export type ErrorCodeRange = keyof typeof ErrorCodeRanges;
/**
 * Validation error codes (V1xxx)
 */
export declare const ValidationErrorCodes: {
    readonly MISSING_REQUIRED_FIELD: "V1001";
    readonly INVALID_TYPE: "V1002";
    readonly VALUE_OUT_OF_RANGE: "V1003";
    readonly PATTERN_MISMATCH: "V1004";
    readonly ARRAY_LENGTH_VIOLATION: "V1005";
    readonly INVALID_REFERENCE: "V1006";
    readonly CONSTRAINT_VIOLATION: "V1007";
    readonly SEMANTIC_ERROR: "V1008";
};
/**
 * Schema error codes (S2xxx)
 */
export declare const SchemaErrorCodes: {
    readonly UNSUPPORTED_VERSION: "S2001";
    readonly VERSION_TOO_OLD: "S2002";
    readonly VERSION_TOO_NEW: "S2003";
    readonly UNKNOWN_KIND: "S2004";
    readonly SCHEMA_MISMATCH: "S2005";
};
/**
 * Transform error codes (T3xxx)
 */
export declare const TransformErrorCodes: {
    readonly TEMPLATE_RENDER_FAILED: "T3001";
    readonly RESOURCE_MAPPING_FAILED: "T3002";
    readonly COMPUTATION_OVERFLOW: "T3003";
    readonly CIRCULAR_DEPENDENCY: "T3004";
    readonly UNSUPPORTED_FEATURE: "T3005";
    readonly RESOURCE_CONFLICT: "T3006";
};
/**
 * Serialization error codes (E4xxx)
 */
export declare const SerializationErrorCodes: {
    readonly SYNTAX_ERROR: "E4001";
    readonly ENCODING_ERROR: "E4002";
    readonly SIZE_LIMIT_EXCEEDED: "E4003";
    readonly INVALID_UTF8: "E4004";
    readonly FORMAT_ERROR: "E4005";
};
/**
 * Integrity error codes (I5xxx)
 */
export declare const IntegrityErrorCodes: {
    readonly CHECKSUM_MISMATCH: "I5001";
    readonly SIGNATURE_VERIFICATION_FAILED: "I5002";
    readonly HASH_COMPUTATION_ERROR: "I5003";
    readonly MANIFEST_INCONSISTENCY: "I5004";
};
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
export declare function generateDeterministicUUID(intentHash: string, resourcePath: readonly string[]): string;
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
export declare const SerializerOptionsSchema: z.ZodObject<{
    indent: z.ZodOptional<z.ZodNumber>;
    useTabs: z.ZodOptional<z.ZodBoolean>;
    sortKeys: z.ZodOptional<z.ZodBoolean>;
    includeComments: z.ZodOptional<z.ZodBoolean>;
    lineWidth: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    indent?: number | undefined;
    useTabs?: boolean | undefined;
    sortKeys?: boolean | undefined;
    includeComments?: boolean | undefined;
    lineWidth?: number | undefined;
}, {
    indent?: number | undefined;
    useTabs?: boolean | undefined;
    sortKeys?: boolean | undefined;
    includeComments?: boolean | undefined;
    lineWidth?: number | undefined;
}>;
/**
 * Extended options for formatting operations.
 */
export interface FormatOptions extends SerializerOptions {
    /** Validate content before formatting */
    readonly validateFirst?: boolean;
}
export declare const FormatOptionsSchema: z.ZodObject<{
    indent: z.ZodOptional<z.ZodNumber>;
    useTabs: z.ZodOptional<z.ZodBoolean>;
    sortKeys: z.ZodOptional<z.ZodBoolean>;
    includeComments: z.ZodOptional<z.ZodBoolean>;
    lineWidth: z.ZodOptional<z.ZodNumber>;
} & {
    validateFirst: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    indent?: number | undefined;
    useTabs?: boolean | undefined;
    sortKeys?: boolean | undefined;
    includeComments?: boolean | undefined;
    lineWidth?: number | undefined;
    validateFirst?: boolean | undefined;
}, {
    indent?: number | undefined;
    useTabs?: boolean | undefined;
    sortKeys?: boolean | undefined;
    includeComments?: boolean | undefined;
    lineWidth?: number | undefined;
    validateFirst?: boolean | undefined;
}>;
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
/**
 * Progress event types.
 */
export declare const ProgressEventTypeValues: readonly ["start", "progress", "complete", "error"];
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
/**
 * Type guard for ExportFormat.
 */
export declare function isExportFormat(value: unknown): value is ExportFormat;
/**
 * Type guard for SerializerType.
 */
export declare function isSerializerType(value: unknown): value is SerializerType;
/**
 * Type guard for SigningAlgorithm.
 */
export declare function isSigningAlgorithm(value: unknown): value is SigningAlgorithm;
/**
 * Type guard for IntentSection.
 */
export declare function isIntentSection(value: unknown): value is IntentSection;
/**
 * Type guard for CloudProvider.
 */
export declare function isCloudProvider(value: unknown): value is CloudProvider;
/**
 * Type guard for ErrorStage.
 */
export declare function isErrorStage(value: unknown): value is ErrorStage;
/**
 * Deep freeze an object to ensure immutability.
 * Pure function - creates frozen copy without modifying input.
 */
export declare function deepFreeze<T>(obj: T): Readonly<T>;
//# sourceMappingURL=types.d.ts.map