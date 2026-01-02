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

// =============================================================================
// ERROR CONTEXT INTERFACES
// =============================================================================

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
export abstract class BaseExportError extends Error {
  /**
   * Unique error code (e.g., V1001, T3002)
   */
  public abstract readonly code: string;

  /**
   * Processing stage where error occurred
   */
  public abstract readonly stage: ErrorStage;

  /**
   * Whether the error is recoverable via retry
   */
  public abstract readonly recoverable: boolean;

  /**
   * Source location in the intent (if applicable)
   */
  public readonly source: ErrorSourceLocation | undefined;

  /**
   * Diagnostic context
   */
  public readonly context: ErrorContext | undefined;

  /**
   * Remediation guidance
   */
  public readonly remediation: ErrorRemediation | undefined;

  /**
   * Original error that caused this error
   */
  public readonly cause: Error | undefined;

  constructor(
    message: string,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
      remediation?: ErrorRemediation;
      cause?: Error;
    }
  ) {
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
  public toJSON(): Readonly<Record<string, unknown>> {
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
  public override toString(): string {
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
export abstract class ValidationError extends BaseExportError {
  public readonly stage: ErrorStage = 'validate';
  public readonly recoverable = false;
}

/**
 * Missing required field error.
 * @code V1001
 */
export class MissingRequiredFieldError extends ValidationError {
  public readonly code = 'V1001';

  constructor(
    field: string,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
    }
  ) {
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
  public readonly code = 'V1002';

  constructor(
    field: string,
    expectedType: string,
    actualType: string,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
    }
  ) {
    super(
      `Invalid type for field "${field}": expected ${expectedType}, got ${actualType}`,
      {
        ...options,
        remediation: {
          suggestion: `Change the value of "${field}" to type ${expectedType}`,
        },
      }
    );
  }
}

/**
 * Value out of range error.
 * @code V1003
 */
export class ValueOutOfRangeError extends ValidationError {
  public readonly code = 'V1003';

  constructor(
    field: string,
    value: unknown,
    min?: number,
    max?: number,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
    }
  ) {
    const rangeDesc =
      min !== undefined && max !== undefined
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
  public readonly code = 'V1004';

  constructor(
    field: string,
    value: string,
    pattern: string,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
    }
  ) {
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
  public readonly code = 'V1005';

  constructor(
    field: string,
    actualLength: number,
    minLength?: number,
    maxLength?: number,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
    }
  ) {
    const constraint =
      minLength !== undefined && maxLength !== undefined
        ? `between ${minLength} and ${maxLength}`
        : minLength !== undefined
          ? `at least ${minLength}`
          : `at most ${maxLength}`;

    super(
      `Array length violation for "${field}": length ${actualLength} (must be ${constraint})`,
      {
        ...options,
        remediation: {
          suggestion: `Adjust the array to have ${constraint} elements`,
        },
      }
    );
  }
}

/**
 * Invalid reference error.
 * @code V1006
 */
export class InvalidReferenceError extends ValidationError {
  public readonly code = 'V1006';

  constructor(
    reference: string,
    referenceType: string,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
    }
  ) {
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
  public readonly code = 'V1007';

  constructor(
    constraint: string,
    details: string,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
    }
  ) {
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
  public readonly code = 'V1008';

  constructor(
    message: string,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
      remediation?: ErrorRemediation;
    }
  ) {
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
export abstract class SchemaError extends BaseExportError {
  public readonly stage: ErrorStage = 'validate';
  public readonly recoverable = false;
}

/**
 * Unsupported API version error.
 * @code S2001
 */
export class UnsupportedVersionError extends SchemaError {
  public readonly code = 'S2001';

  constructor(
    version: string,
    supportedVersions: readonly string[],
    options?: {
      context?: ErrorContext;
    }
  ) {
    super(
      `Unsupported API version: ${version}. Supported versions: ${supportedVersions.join(', ')}`,
      {
        ...options,
        remediation: {
          suggestion: `Update your intent to use a supported version`,
          examples: supportedVersions.map((v) => `"$schema": "${v}"`),
        },
      }
    );
  }
}

/**
 * Version too old error.
 * @code S2002
 */
export class VersionTooOldError extends SchemaError {
  public readonly code = 'S2002';

  constructor(
    version: string,
    minimumVersion: string,
    options?: {
      context?: ErrorContext;
    }
  ) {
    super(
      `Intent version ${version} is too old. Minimum supported version is ${minimumVersion}`,
      {
        ...options,
        remediation: {
          suggestion: `Migrate your intent to version ${minimumVersion} or later`,
          documentationUrl: 'https://docs.agentics.io/migration',
        },
      }
    );
  }
}

/**
 * Version too new error.
 * @code S2003
 */
export class VersionTooNewError extends SchemaError {
  public readonly code = 'S2003';

  constructor(
    version: string,
    maximumVersion: string,
    options?: {
      context?: ErrorContext;
    }
  ) {
    super(
      `Intent version ${version} is too new. Maximum supported version is ${maximumVersion}`,
      {
        ...options,
        remediation: {
          suggestion: `Upgrade your exporter to support version ${version}`,
        },
      }
    );
  }
}

/**
 * Unknown intent kind error.
 * @code S2004
 */
export class UnknownKindError extends SchemaError {
  public readonly code = 'S2004';

  constructor(
    kind: string,
    supportedKinds: readonly string[],
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
    }
  ) {
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
  public readonly code = 'S2005';

  constructor(
    message: string,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
      remediation?: ErrorRemediation;
    }
  ) {
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
export abstract class TransformError extends BaseExportError {
  public readonly stage: ErrorStage = 'transform';
  public readonly recoverable: boolean = true; // Most transform errors can be retried
}

/**
 * Template rendering failure error.
 * @code T3001
 */
export class TemplateRenderError extends TransformError {
  public readonly code = 'T3001';

  constructor(
    templateName: string,
    details: string,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
      cause?: Error;
    }
  ) {
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
  public readonly code = 'T3002';

  constructor(
    resourceType: string,
    resourceName: string,
    details: string,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
    }
  ) {
    super(
      `Resource mapping failed for ${resourceType}/${resourceName}: ${details}`,
      {
        ...options,
        remediation: {
          suggestion: 'Verify resource definition and property values',
        },
      }
    );
  }
}

/**
 * Computation overflow error.
 * @code T3003
 */
export class ComputationOverflowError extends TransformError {
  public readonly code = 'T3003';
  public readonly recoverable: boolean = false;

  constructor(
    operation: string,
    details: string,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
    }
  ) {
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
  public readonly code = 'T3004';
  public readonly recoverable: boolean = false;

  constructor(
    cycle: readonly string[],
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
    }
  ) {
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
  public readonly code = 'T3005';
  public readonly recoverable: boolean = false;

  constructor(
    feature: string,
    targetFormat: string,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
    }
  ) {
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
  public readonly code = 'T3006';
  public readonly recoverable: boolean = false;

  constructor(
    resourceA: string,
    resourceB: string,
    conflictType: string,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
    }
  ) {
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
export abstract class SerializationError extends BaseExportError {
  public readonly stage: ErrorStage = 'serialize';
  public readonly recoverable: boolean = true;
}

/**
 * Syntax error in generated output.
 * @code E4001
 */
export class OutputSyntaxError extends SerializationError {
  public readonly code = 'E4001';

  constructor(
    format: string,
    details: string,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
      cause?: Error;
    }
  ) {
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
  public readonly code = 'E4002';

  constructor(
    encoding: string,
    details: string,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
      cause?: Error;
    }
  ) {
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
  public readonly code = 'E4003';
  public readonly recoverable: boolean = false;

  constructor(
    actualSize: number,
    maxSize: number,
    artifact: string,
    options?: {
      context?: ErrorContext;
    }
  ) {
    super(
      `Size limit exceeded for "${artifact}": ${actualSize} bytes (max: ${maxSize} bytes)`,
      {
        ...options,
        remediation: {
          suggestion: 'Reduce the size of the artifact or split into multiple files',
        },
      }
    );
  }
}

/**
 * Invalid UTF-8 sequence error.
 * @code E4004
 */
export class InvalidUtf8Error extends SerializationError {
  public readonly code = 'E4004';

  constructor(
    position: number,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
    }
  ) {
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
  public readonly code = 'E4005';

  constructor(
    format: string,
    details: string,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
      remediation?: ErrorRemediation;
      cause?: Error;
    }
  ) {
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
export abstract class IntegrityError extends BaseExportError {
  public readonly stage: ErrorStage = 'package';
  public readonly recoverable = true;
}

/**
 * Checksum mismatch error.
 * @code I5001
 */
export class ChecksumMismatchError extends IntegrityError {
  public readonly code = 'I5001';

  constructor(
    artifact: string,
    expected: string,
    actual: string,
    options?: {
      context?: ErrorContext;
    }
  ) {
    super(
      `Checksum mismatch for "${artifact}": expected ${expected.substring(0, 16)}..., got ${actual.substring(0, 16)}...`,
      {
        ...options,
        remediation: {
          suggestion: 'Retry the export operation',
        },
      }
    );
  }
}

/**
 * Signature verification failure error.
 * @code I5002
 */
export class SignatureVerificationError extends IntegrityError {
  public readonly code = 'I5002';

  constructor(
    artifact: string,
    reason: string,
    options?: {
      context?: ErrorContext;
    }
  ) {
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
  public readonly code = 'I5003';

  constructor(
    algorithm: string,
    details: string,
    options?: {
      context?: ErrorContext;
      cause?: Error;
    }
  ) {
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
  public readonly code = 'I5004';

  constructor(
    details: string,
    options?: {
      context?: ErrorContext;
    }
  ) {
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
  public readonly code = 'P0001';
  public readonly stage: ErrorStage = 'parse';
  public readonly recoverable = false;

  constructor(
    message: string,
    options?: {
      source?: ErrorSourceLocation;
      context?: ErrorContext;
      remediation?: ErrorRemediation;
      cause?: Error;
    }
  ) {
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
  public readonly code = 'K0001';
  public readonly stage: ErrorStage = 'package';
  public readonly recoverable = true;

  constructor(
    message: string,
    options?: {
      context?: ErrorContext;
      remediation?: ErrorRemediation;
      cause?: Error;
    }
  ) {
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
} as const;

export type ErrorCategory = (typeof ErrorCategories)[keyof typeof ErrorCategories];

/**
 * Get the category from an error code.
 */
export function getErrorCategory(code: string): ErrorCategory | undefined {
  const prefix = code.charAt(0);
  return Object.values(ErrorCategories).includes(prefix as ErrorCategory)
    ? (prefix as ErrorCategory)
    : undefined;
}

/**
 * Check if an error code is in a specific category.
 */
export function isErrorInCategory(code: string, category: ErrorCategory): boolean {
  return code.startsWith(category);
}

/**
 * Type guard to check if an error is a BaseExportError.
 */
export function isExportError(error: unknown): error is BaseExportError {
  return error instanceof BaseExportError;
}

/**
 * Type guard to check if an error is recoverable.
 */
export function isRecoverableError(error: unknown): boolean {
  return isExportError(error) && error.recoverable;
}

/**
 * Extract error details for logging.
 */
export function extractErrorDetails(
  error: unknown
): Readonly<Record<string, unknown>> {
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
