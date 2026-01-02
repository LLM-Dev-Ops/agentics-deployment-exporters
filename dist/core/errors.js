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
// =============================================================================
// BASE EXPORT ERROR
// =============================================================================
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
export class BaseExportError extends Error {
    /**
     * Source location in the intent (if applicable)
     */
    source;
    /**
     * Diagnostic context
     */
    context;
    /**
     * Remediation guidance
     */
    remediation;
    /**
     * Original error that caused this error
     */
    cause;
    constructor(message, options) {
        super(message);
        this.name = this.constructor.name;
        this.source = options?.source ?? undefined;
        this.context = options?.context ?? undefined;
        this.remediation = options?.remediation ?? undefined;
        this.cause = options?.cause ?? undefined;
        // Ensure proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, new.target.prototype);
        // Capture stack trace, excluding constructor call
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
    /**
     * Get a structured representation of the error.
     */
    toJSON() {
        return Object.freeze({
            name: this.name,
            code: this.code,
            message: this.message,
            stage: this.stage,
            recoverable: this.recoverable,
            source: this.source,
            context: this.context,
            remediation: this.remediation,
            stack: this.stack,
        });
    }
    /**
     * Get a human-readable string representation.
     */
    toString() {
        const parts = [`[${this.code}] ${this.message}`];
        if (this.source?.path) {
            parts.push(`at ${this.source.path}`);
            if (this.source.line !== undefined) {
                parts.push(`(line ${this.source.line})`);
            }
        }
        return parts.join(' ');
    }
}
// =============================================================================
// VALIDATION ERRORS (V1xxx)
// =============================================================================
/**
 * Base class for validation errors.
 * These errors occur during input validation before transformation.
 */
export class ValidationError extends BaseExportError {
    stage = 'validate';
    recoverable = false;
}
/**
 * Missing required field error.
 * @code V1001
 */
export class MissingRequiredFieldError extends ValidationError {
    code = 'V1001';
    constructor(field, options) {
        super(`Missing required field: ${field}`, {
            ...options,
            remediation: {
                suggestion: `Add the required field "${field}" to your intent`,
                examples: [`"${field}": <value>`],
            },
        });
    }
}
/**
 * Invalid type error.
 * @code V1002
 */
export class InvalidTypeError extends ValidationError {
    code = 'V1002';
    constructor(field, expectedType, actualType, options) {
        super(`Invalid type for field "${field}": expected ${expectedType}, got ${actualType}`, {
            ...options,
            remediation: {
                suggestion: `Change the value of "${field}" to type ${expectedType}`,
            },
        });
    }
}
/**
 * Value out of range error.
 * @code V1003
 */
export class ValueOutOfRangeError extends ValidationError {
    code = 'V1003';
    constructor(field, value, min, max, options) {
        const rangeDesc = min !== undefined && max !== undefined
            ? `between ${min} and ${max}`
            : min !== undefined
                ? `at least ${min}`
                : `at most ${max}`;
        super(`Value out of range for "${field}": ${value} (must be ${rangeDesc})`, {
            ...options,
            remediation: {
                suggestion: `Adjust the value to be ${rangeDesc}`,
            },
        });
    }
}
/**
 * Pattern mismatch error.
 * @code V1004
 */
export class PatternMismatchError extends ValidationError {
    code = 'V1004';
    constructor(field, value, pattern, options) {
        super(`Pattern mismatch for "${field}": "${value}" does not match ${pattern}`, {
            ...options,
            remediation: {
                suggestion: `Adjust the value to match the pattern: ${pattern}`,
            },
        });
    }
}
/**
 * Array length violation error.
 * @code V1005
 */
export class ArrayLengthViolationError extends ValidationError {
    code = 'V1005';
    constructor(field, actualLength, minLength, maxLength, options) {
        const constraint = minLength !== undefined && maxLength !== undefined
            ? `between ${minLength} and ${maxLength}`
            : minLength !== undefined
                ? `at least ${minLength}`
                : `at most ${maxLength}`;
        super(`Array length violation for "${field}": length ${actualLength} (must be ${constraint})`, {
            ...options,
            remediation: {
                suggestion: `Adjust the array to have ${constraint} elements`,
            },
        });
    }
}
/**
 * Invalid reference error.
 * @code V1006
 */
export class InvalidReferenceError extends ValidationError {
    code = 'V1006';
    constructor(reference, referenceType, options) {
        super(`Invalid ${referenceType} reference: "${reference}" not found`, {
            ...options,
            remediation: {
                suggestion: `Ensure the referenced ${referenceType} "${reference}" is defined`,
            },
        });
    }
}
/**
 * Constraint violation error.
 * @code V1007
 */
export class ConstraintViolationError extends ValidationError {
    code = 'V1007';
    constructor(constraint, details, options) {
        super(`Constraint violation: ${constraint} - ${details}`, {
            ...options,
            remediation: {
                suggestion: `Fix the constraint violation: ${constraint}`,
            },
        });
    }
}
/**
 * Semantic validation error.
 * @code V1008
 */
export class SemanticValidationError extends ValidationError {
    code = 'V1008';
    constructor(message, options) {
        super(message, options);
    }
}
// =============================================================================
// SCHEMA ERRORS (S2xxx)
// =============================================================================
/**
 * Base class for schema-related errors.
 * These errors occur when the intent schema version is incompatible.
 */
export class SchemaError extends BaseExportError {
    stage = 'validate';
    recoverable = false;
}
/**
 * Unsupported API version error.
 * @code S2001
 */
export class UnsupportedVersionError extends SchemaError {
    code = 'S2001';
    constructor(version, supportedVersions, options) {
        super(`Unsupported API version: ${version}. Supported versions: ${supportedVersions.join(', ')}`, {
            ...options,
            remediation: {
                suggestion: `Update your intent to use a supported version`,
                examples: supportedVersions.map((v) => `"$schema": "${v}"`),
            },
        });
    }
}
/**
 * Version too old error.
 * @code S2002
 */
export class VersionTooOldError extends SchemaError {
    code = 'S2002';
    constructor(version, minimumVersion, options) {
        super(`Intent version ${version} is too old. Minimum supported version is ${minimumVersion}`, {
            ...options,
            remediation: {
                suggestion: `Migrate your intent to version ${minimumVersion} or later`,
                documentationUrl: 'https://docs.agentics.io/migration',
            },
        });
    }
}
/**
 * Version too new error.
 * @code S2003
 */
export class VersionTooNewError extends SchemaError {
    code = 'S2003';
    constructor(version, maximumVersion, options) {
        super(`Intent version ${version} is too new. Maximum supported version is ${maximumVersion}`, {
            ...options,
            remediation: {
                suggestion: `Upgrade your exporter to support version ${version}`,
            },
        });
    }
}
/**
 * Unknown intent kind error.
 * @code S2004
 */
export class UnknownKindError extends SchemaError {
    code = 'S2004';
    constructor(kind, supportedKinds, options) {
        super(`Unknown intent kind: "${kind}". Supported kinds: ${supportedKinds.join(', ')}`, {
            ...options,
            remediation: {
                suggestion: `Use one of the supported intent kinds`,
                examples: supportedKinds.map((k) => `"kind": "${k}"`),
            },
        });
    }
}
/**
 * Schema mismatch error.
 * @code S2005
 */
export class SchemaMismatchError extends SchemaError {
    code = 'S2005';
    constructor(message, options) {
        super(message, options);
    }
}
// =============================================================================
// TRANSFORM ERRORS (T3xxx)
// =============================================================================
/**
 * Base class for transformation errors.
 * These errors occur during the intent-to-artifact transformation.
 */
export class TransformError extends BaseExportError {
    stage = 'transform';
    recoverable = true; // Most transform errors can be retried
}
/**
 * Template rendering failure error.
 * @code T3001
 */
export class TemplateRenderError extends TransformError {
    code = 'T3001';
    constructor(templateName, details, options) {
        super(`Template rendering failed for "${templateName}": ${details}`, {
            ...options,
            remediation: {
                suggestion: 'Check template syntax and variable references',
            },
        });
    }
}
/**
 * Resource mapping failure error.
 * @code T3002
 */
export class ResourceMappingError extends TransformError {
    code = 'T3002';
    constructor(resourceType, resourceName, details, options) {
        super(`Resource mapping failed for ${resourceType}/${resourceName}: ${details}`, {
            ...options,
            remediation: {
                suggestion: 'Verify resource definition and property values',
            },
        });
    }
}
/**
 * Computation overflow error.
 * @code T3003
 */
export class ComputationOverflowError extends TransformError {
    code = 'T3003';
    recoverable = false;
    constructor(operation, details, options) {
        super(`Computation overflow in ${operation}: ${details}`, {
            ...options,
            remediation: {
                suggestion: 'Reduce the values to within safe limits',
            },
        });
    }
}
/**
 * Circular dependency detected error.
 * @code T3004
 */
export class CircularDependencyError extends TransformError {
    code = 'T3004';
    recoverable = false;
    constructor(cycle, options) {
        super(`Circular dependency detected: ${cycle.join(' -> ')} -> ${cycle[0]}`, {
            ...options,
            remediation: {
                suggestion: 'Remove the circular reference between resources',
            },
        });
    }
}
/**
 * Unsupported feature error.
 * @code T3005
 */
export class UnsupportedFeatureError extends TransformError {
    code = 'T3005';
    recoverable = false;
    constructor(feature, targetFormat, options) {
        super(`Feature "${feature}" is not supported for target format "${targetFormat}"`, {
            ...options,
            remediation: {
                suggestion: `Remove or replace the unsupported feature "${feature}"`,
            },
        });
    }
}
/**
 * Resource conflict error.
 * @code T3006
 */
export class ResourceConflictError extends TransformError {
    code = 'T3006';
    recoverable = false;
    constructor(resourceA, resourceB, conflictType, options) {
        super(`Resource conflict between "${resourceA}" and "${resourceB}": ${conflictType}`, {
            ...options,
            remediation: {
                suggestion: 'Resolve the conflict by renaming or removing one resource',
            },
        });
    }
}
// =============================================================================
// SERIALIZATION ERRORS (E4xxx)
// =============================================================================
/**
 * Base class for serialization errors.
 * These errors occur during output encoding.
 */
export class SerializationError extends BaseExportError {
    stage = 'serialize';
    recoverable = true;
}
/**
 * Syntax error in generated output.
 * @code E4001
 */
export class OutputSyntaxError extends SerializationError {
    code = 'E4001';
    constructor(format, details, options) {
        super(`Syntax error in generated ${format}: ${details}`, {
            ...options,
            remediation: {
                suggestion: 'Report this as a bug in the exporter',
            },
        });
    }
}
/**
 * Encoding error.
 * @code E4002
 */
export class EncodingError extends SerializationError {
    code = 'E4002';
    constructor(encoding, details, options) {
        super(`Encoding error (${encoding}): ${details}`, {
            ...options,
            remediation: {
                suggestion: 'Check for invalid characters in the input',
            },
        });
    }
}
/**
 * Size limit exceeded error.
 * @code E4003
 */
export class SizeLimitExceededError extends SerializationError {
    code = 'E4003';
    recoverable = false;
    constructor(actualSize, maxSize, artifact, options) {
        super(`Size limit exceeded for "${artifact}": ${actualSize} bytes (max: ${maxSize} bytes)`, {
            ...options,
            remediation: {
                suggestion: 'Reduce the size of the artifact or split into multiple files',
            },
        });
    }
}
/**
 * Invalid UTF-8 sequence error.
 * @code E4004
 */
export class InvalidUtf8Error extends SerializationError {
    code = 'E4004';
    constructor(position, options) {
        super(`Invalid UTF-8 sequence at position ${position}`, {
            ...options,
            remediation: {
                suggestion: 'Check for and remove invalid UTF-8 characters',
            },
        });
    }
}
/**
 * Format-specific error.
 * @code E4005
 */
export class FormatError extends SerializationError {
    code = 'E4005';
    constructor(format, details, options) {
        super(`${format} format error: ${details}`, options);
    }
}
// =============================================================================
// INTEGRITY ERRORS (I5xxx)
// =============================================================================
/**
 * Base class for integrity errors.
 * These errors occur during checksum/signature verification.
 */
export class IntegrityError extends BaseExportError {
    stage = 'package';
    recoverable = true;
}
/**
 * Checksum mismatch error.
 * @code I5001
 */
export class ChecksumMismatchError extends IntegrityError {
    code = 'I5001';
    constructor(artifact, expected, actual, options) {
        super(`Checksum mismatch for "${artifact}": expected ${expected.substring(0, 16)}..., got ${actual.substring(0, 16)}...`, {
            ...options,
            remediation: {
                suggestion: 'Retry the export operation',
            },
        });
    }
}
/**
 * Signature verification failure error.
 * @code I5002
 */
export class SignatureVerificationError extends IntegrityError {
    code = 'I5002';
    constructor(artifact, reason, options) {
        super(`Signature verification failed for "${artifact}": ${reason}`, {
            ...options,
            remediation: {
                suggestion: 'Check the signing key configuration',
            },
        });
    }
}
/**
 * Hash computation error.
 * @code I5003
 */
export class HashComputationError extends IntegrityError {
    code = 'I5003';
    constructor(algorithm, details, options) {
        super(`Hash computation error (${algorithm}): ${details}`, {
            ...options,
            remediation: {
                suggestion: 'Check system resources and retry',
            },
        });
    }
}
/**
 * Manifest inconsistency error.
 * @code I5004
 */
export class ManifestInconsistencyError extends IntegrityError {
    code = 'I5004';
    constructor(details, options) {
        super(`Manifest inconsistency: ${details}`, {
            ...options,
            remediation: {
                suggestion: 'Regenerate the export package',
            },
        });
    }
}
// =============================================================================
// PARSE ERROR (used by loaders)
// =============================================================================
/**
 * Parse error for input parsing failures.
 */
export class ParseError extends BaseExportError {
    code = 'P0001';
    stage = 'parse';
    recoverable = false;
    constructor(message, options) {
        super(message, options);
    }
}
// =============================================================================
// PACKAGING ERROR
// =============================================================================
/**
 * Packaging error for artifact bundling failures.
 */
export class PackagingError extends BaseExportError {
    code = 'K0001';
    stage = 'package';
    recoverable = true;
    constructor(message, options) {
        super(message, options);
    }
}
// =============================================================================
// ERROR CODE UTILITIES
// =============================================================================
/**
 * Error code categories.
 */
export const ErrorCategories = {
    VALIDATION: 'V',
    SCHEMA: 'S',
    TRANSFORM: 'T',
    SERIALIZATION: 'E',
    INTEGRITY: 'I',
    PARSE: 'P',
    PACKAGE: 'K',
};
/**
 * Get the category from an error code.
 */
export function getErrorCategory(code) {
    const prefix = code.charAt(0);
    return Object.values(ErrorCategories).includes(prefix)
        ? prefix
        : undefined;
}
/**
 * Check if an error code is in a specific category.
 */
export function isErrorInCategory(code, category) {
    return code.startsWith(category);
}
/**
 * Type guard to check if an error is a BaseExportError.
 */
export function isExportError(error) {
    return error instanceof BaseExportError;
}
/**
 * Type guard to check if an error is recoverable.
 */
export function isRecoverableError(error) {
    return isExportError(error) && error.recoverable;
}
/**
 * Extract error details for logging.
 */
export function extractErrorDetails(error) {
    if (isExportError(error)) {
        return error.toJSON();
    }
    if (error instanceof Error) {
        return Object.freeze({
            name: error.name,
            message: error.message,
            stack: error.stack,
        });
    }
    return Object.freeze({
        message: String(error),
    });
}
//# sourceMappingURL=errors.js.map