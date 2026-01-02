/**
 * Error Hierarchy for Agentics Deployment Exporters
 *
 * This module defines the complete error hierarchy for the exporter system.
 * All errors follow a consistent structure with:
 * - Unique error codes (V1xxx, S2xxx, T3xxx, E4xxx, I5xxx)
 * - Processing stage identification
 * - Recoverability information
 * - Source location tracking
 * - Remediation guidance
 *
 * Error Code Ranges:
 * - V1xxx: Validation errors (input validation failures)
 * - S2xxx: Schema errors (version/schema mismatches)
 * - T3xxx: Transform errors (transformation failures)
 * - E4xxx: Serialization errors (output encoding failures)
 * - I5xxx: Integrity errors (checksum/signature failures)
 *
 * @module core/errors
 * @version 1.0.0
 */
import type { ErrorStage } from './types.js';
/**
 * Source location in the original intent.
 */
export interface ErrorSourceLocation {
    /** JSONPath to the problematic field */
    readonly path: string;
    /** Line number (if available from parsing) */
    readonly line?: number;
    /** Column number (if available from parsing) */
    readonly column?: number;
}
/**
 * Diagnostic context for error reporting.
 */
export interface ErrorContext {
    /** Intent version */
    readonly intentVersion?: string;
    /** Exporter version */
    readonly exporterVersion?: string;
    /** Target format */
    readonly targetFormat?: string;
    /** Correlation ID for tracing */
    readonly correlationId?: string;
    /** Additional context data */
    readonly data?: Readonly<Record<string, unknown>>;
}
/**
 * Remediation guidance for error resolution.
 */
export interface ErrorRemediation {
    /** Human-readable suggestion */
    readonly suggestion: string;
    /** Link to documentation */
    readonly documentationUrl?: string;
    /** Example of correct usage */
    readonly examples?: readonly string[];
}
/**
 * Base class for all export errors.
 *
 * All errors in the export system extend this base class, which provides:
 * - Unique error code for programmatic handling
 * - Processing stage identification
 * - Recoverability information
 * - Source location tracking
 * - Remediation guidance
 *
 * @abstract
 * @example
 * ```typescript
 * try {
 *   await exporter.transform(intent);
 * } catch (error) {
 *   if (error instanceof BaseExportError) {
 *     console.log(`Error ${error.code} at stage ${error.stage}`);
 *     if (error.recoverable) {
 *       // Retry logic
 *     }
 *   }
 * }
 * ```
 */
export declare abstract class BaseExportError extends Error {
    /**
     * Unique error code (e.g., V1001, T3002)
     */
    abstract readonly code: string;
    /**
     * Processing stage where error occurred
     */
    abstract readonly stage: ErrorStage;
    /**
     * Whether the error is recoverable via retry
     */
    abstract readonly recoverable: boolean;
    /**
     * Source location in the intent (if applicable)
     */
    readonly source: ErrorSourceLocation | undefined;
    /**
     * Diagnostic context
     */
    readonly context: ErrorContext | undefined;
    /**
     * Remediation guidance
     */
    readonly remediation: ErrorRemediation | undefined;
    /**
     * Original error that caused this error
     */
    readonly cause: Error | undefined;
    constructor(message: string, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
        remediation?: ErrorRemediation;
        cause?: Error;
    });
    /**
     * Get a structured representation of the error.
     */
    toJSON(): Readonly<Record<string, unknown>>;
    /**
     * Get a human-readable string representation.
     */
    toString(): string;
}
/**
 * Base class for validation errors.
 * These errors occur during input validation before transformation.
 */
export declare abstract class ValidationError extends BaseExportError {
    readonly stage: ErrorStage;
    readonly recoverable = false;
}
/**
 * Missing required field error.
 * @code V1001
 */
export declare class MissingRequiredFieldError extends ValidationError {
    readonly code = "V1001";
    constructor(field: string, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
    });
}
/**
 * Invalid type error.
 * @code V1002
 */
export declare class InvalidTypeError extends ValidationError {
    readonly code = "V1002";
    constructor(field: string, expectedType: string, actualType: string, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
    });
}
/**
 * Value out of range error.
 * @code V1003
 */
export declare class ValueOutOfRangeError extends ValidationError {
    readonly code = "V1003";
    constructor(field: string, value: unknown, min?: number, max?: number, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
    });
}
/**
 * Pattern mismatch error.
 * @code V1004
 */
export declare class PatternMismatchError extends ValidationError {
    readonly code = "V1004";
    constructor(field: string, value: string, pattern: string, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
    });
}
/**
 * Array length violation error.
 * @code V1005
 */
export declare class ArrayLengthViolationError extends ValidationError {
    readonly code = "V1005";
    constructor(field: string, actualLength: number, minLength?: number, maxLength?: number, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
    });
}
/**
 * Invalid reference error.
 * @code V1006
 */
export declare class InvalidReferenceError extends ValidationError {
    readonly code = "V1006";
    constructor(reference: string, referenceType: string, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
    });
}
/**
 * Constraint violation error.
 * @code V1007
 */
export declare class ConstraintViolationError extends ValidationError {
    readonly code = "V1007";
    constructor(constraint: string, details: string, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
    });
}
/**
 * Semantic validation error.
 * @code V1008
 */
export declare class SemanticValidationError extends ValidationError {
    readonly code = "V1008";
    constructor(message: string, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
        remediation?: ErrorRemediation;
    });
}
/**
 * Base class for schema-related errors.
 * These errors occur when the intent schema version is incompatible.
 */
export declare abstract class SchemaError extends BaseExportError {
    readonly stage: ErrorStage;
    readonly recoverable = false;
}
/**
 * Unsupported API version error.
 * @code S2001
 */
export declare class UnsupportedVersionError extends SchemaError {
    readonly code = "S2001";
    constructor(version: string, supportedVersions: readonly string[], options?: {
        context?: ErrorContext;
    });
}
/**
 * Version too old error.
 * @code S2002
 */
export declare class VersionTooOldError extends SchemaError {
    readonly code = "S2002";
    constructor(version: string, minimumVersion: string, options?: {
        context?: ErrorContext;
    });
}
/**
 * Version too new error.
 * @code S2003
 */
export declare class VersionTooNewError extends SchemaError {
    readonly code = "S2003";
    constructor(version: string, maximumVersion: string, options?: {
        context?: ErrorContext;
    });
}
/**
 * Unknown intent kind error.
 * @code S2004
 */
export declare class UnknownKindError extends SchemaError {
    readonly code = "S2004";
    constructor(kind: string, supportedKinds: readonly string[], options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
    });
}
/**
 * Schema mismatch error.
 * @code S2005
 */
export declare class SchemaMismatchError extends SchemaError {
    readonly code = "S2005";
    constructor(message: string, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
        remediation?: ErrorRemediation;
    });
}
/**
 * Base class for transformation errors.
 * These errors occur during the intent-to-artifact transformation.
 */
export declare abstract class TransformError extends BaseExportError {
    readonly stage: ErrorStage;
    readonly recoverable: boolean;
}
/**
 * Template rendering failure error.
 * @code T3001
 */
export declare class TemplateRenderError extends TransformError {
    readonly code = "T3001";
    constructor(templateName: string, details: string, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
        cause?: Error;
    });
}
/**
 * Resource mapping failure error.
 * @code T3002
 */
export declare class ResourceMappingError extends TransformError {
    readonly code = "T3002";
    constructor(resourceType: string, resourceName: string, details: string, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
    });
}
/**
 * Computation overflow error.
 * @code T3003
 */
export declare class ComputationOverflowError extends TransformError {
    readonly code = "T3003";
    readonly recoverable: boolean;
    constructor(operation: string, details: string, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
    });
}
/**
 * Circular dependency detected error.
 * @code T3004
 */
export declare class CircularDependencyError extends TransformError {
    readonly code = "T3004";
    readonly recoverable: boolean;
    constructor(cycle: readonly string[], options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
    });
}
/**
 * Unsupported feature error.
 * @code T3005
 */
export declare class UnsupportedFeatureError extends TransformError {
    readonly code = "T3005";
    readonly recoverable: boolean;
    constructor(feature: string, targetFormat: string, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
    });
}
/**
 * Resource conflict error.
 * @code T3006
 */
export declare class ResourceConflictError extends TransformError {
    readonly code = "T3006";
    readonly recoverable: boolean;
    constructor(resourceA: string, resourceB: string, conflictType: string, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
    });
}
/**
 * Base class for serialization errors.
 * These errors occur during output encoding.
 */
export declare abstract class SerializationError extends BaseExportError {
    readonly stage: ErrorStage;
    readonly recoverable: boolean;
}
/**
 * Syntax error in generated output.
 * @code E4001
 */
export declare class OutputSyntaxError extends SerializationError {
    readonly code = "E4001";
    constructor(format: string, details: string, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
        cause?: Error;
    });
}
/**
 * Encoding error.
 * @code E4002
 */
export declare class EncodingError extends SerializationError {
    readonly code = "E4002";
    constructor(encoding: string, details: string, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
        cause?: Error;
    });
}
/**
 * Size limit exceeded error.
 * @code E4003
 */
export declare class SizeLimitExceededError extends SerializationError {
    readonly code = "E4003";
    readonly recoverable: boolean;
    constructor(actualSize: number, maxSize: number, artifact: string, options?: {
        context?: ErrorContext;
    });
}
/**
 * Invalid UTF-8 sequence error.
 * @code E4004
 */
export declare class InvalidUtf8Error extends SerializationError {
    readonly code = "E4004";
    constructor(position: number, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
    });
}
/**
 * Format-specific error.
 * @code E4005
 */
export declare class FormatError extends SerializationError {
    readonly code = "E4005";
    constructor(format: string, details: string, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
        remediation?: ErrorRemediation;
        cause?: Error;
    });
}
/**
 * Base class for integrity errors.
 * These errors occur during checksum/signature verification.
 */
export declare abstract class IntegrityError extends BaseExportError {
    readonly stage: ErrorStage;
    readonly recoverable = true;
}
/**
 * Checksum mismatch error.
 * @code I5001
 */
export declare class ChecksumMismatchError extends IntegrityError {
    readonly code = "I5001";
    constructor(artifact: string, expected: string, actual: string, options?: {
        context?: ErrorContext;
    });
}
/**
 * Signature verification failure error.
 * @code I5002
 */
export declare class SignatureVerificationError extends IntegrityError {
    readonly code = "I5002";
    constructor(artifact: string, reason: string, options?: {
        context?: ErrorContext;
    });
}
/**
 * Hash computation error.
 * @code I5003
 */
export declare class HashComputationError extends IntegrityError {
    readonly code = "I5003";
    constructor(algorithm: string, details: string, options?: {
        context?: ErrorContext;
        cause?: Error;
    });
}
/**
 * Manifest inconsistency error.
 * @code I5004
 */
export declare class ManifestInconsistencyError extends IntegrityError {
    readonly code = "I5004";
    constructor(details: string, options?: {
        context?: ErrorContext;
    });
}
/**
 * Parse error for input parsing failures.
 */
export declare class ParseError extends BaseExportError {
    readonly code = "P0001";
    readonly stage: ErrorStage;
    readonly recoverable = false;
    constructor(message: string, options?: {
        source?: ErrorSourceLocation;
        context?: ErrorContext;
        remediation?: ErrorRemediation;
        cause?: Error;
    });
}
/**
 * Packaging error for artifact bundling failures.
 */
export declare class PackagingError extends BaseExportError {
    readonly code = "K0001";
    readonly stage: ErrorStage;
    readonly recoverable = true;
    constructor(message: string, options?: {
        context?: ErrorContext;
        remediation?: ErrorRemediation;
        cause?: Error;
    });
}
/**
 * Error code categories.
 */
export declare const ErrorCategories: {
    readonly VALIDATION: "V";
    readonly SCHEMA: "S";
    readonly TRANSFORM: "T";
    readonly SERIALIZATION: "E";
    readonly INTEGRITY: "I";
    readonly PARSE: "P";
    readonly PACKAGE: "K";
};
export type ErrorCategory = (typeof ErrorCategories)[keyof typeof ErrorCategories];
/**
 * Get the category from an error code.
 */
export declare function getErrorCategory(code: string): ErrorCategory | undefined;
/**
 * Check if an error code is in a specific category.
 */
export declare function isErrorInCategory(code: string, category: ErrorCategory): boolean;
/**
 * Type guard to check if an error is a BaseExportError.
 */
export declare function isExportError(error: unknown): error is BaseExportError;
/**
 * Type guard to check if an error is recoverable.
 */
export declare function isRecoverableError(error: unknown): boolean;
/**
 * Extract error details for logging.
 */
export declare function extractErrorDetails(error: unknown): Readonly<Record<string, unknown>>;
//# sourceMappingURL=errors.d.ts.map