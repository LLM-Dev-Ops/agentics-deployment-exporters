/**
 * Validator Module
 *
 * Exports all validator components for intent validation.
 *
 * Usage:
 * ```typescript
 * import {
 *   IntentValidator,
 *   createIntentValidator,
 *   SchemaValidator,
 *   RefValidator,
 *   ConstraintValidator,
 *   SecurityValidator,
 * } from './core/validator';
 *
 * const validator = createIntentValidator();
 * const result = await validator.validate(parsedIntent);
 *
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */

// Main validator
export { IntentValidator, createIntentValidator } from './IntentValidator.js';

// Sub-validators
export { SchemaValidator } from './SchemaValidator.js';
export { RefValidator } from './RefValidator.js';
export { ConstraintValidator } from './ConstraintValidator.js';
export { SecurityValidator } from './SecurityValidator.js';

// Types
export type {
  // Core interfaces
  IIntentValidator,
  ParsedIntent,
  ValidatedIntent,

  // Validation results
  IntentValidationResult,
  ValidationMetadata,
  SchemaValidationResult,
  SecurityScanResult,
  CircularDependencyResult,

  // Issues and rules
  ValidationIssue,
  ValidationRule,
  ValidationOptions,
  ValidationSeverity,
  ValidationIssueCategory,

  // Schema types
  SchemaVersion,

  // Reference types
  InternalReference,

  // Constraint types
  CrossFieldConstraint,

  // Security types
  InjectionPattern,

  // Intent structure types
  IntentMetadata,
  IntentSpec,
  ResourceSpec,
  ServiceSpec,
  ImageSpec,
  PortSpec,
  ResourceRequirements,
  ResourceQuantity,
  HealthCheckSpec,
  EnvVarSpec,
  EnvVarSource,
  SecretKeyRef,
  ConfigMapKeyRef,
  SecretSpec,
  NetworkingSpec,
  IngressSpec,
  NetworkPolicySpec,
  StorageSpec,
  SecuritySpec,
  RBACSpec,
  RoleSpec,
  RuleSpec,
  SourceLocation,
  SourceMap,
} from './types.js';

// Error codes
export { ValidationErrorCodes } from './types.js';
export type { ValidationErrorCode } from './types.js';
