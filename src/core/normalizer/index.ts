/**
 * IntentNormalizer Module
 *
 * Provides deterministic normalization of ValidatedIntent to NormalizedIntent.
 * This module is the critical component for ensuring byte-for-byte reproducibility.
 *
 * ## Key Guarantees
 *
 * - **Idempotent**: `normalize(normalize(x)) === normalize(x)`
 * - **Deterministic**: Same input always produces same output
 * - **Reversible**: Original structure can be reconstructed with metadata
 *
 * ## Transformation Order
 *
 * 1. Default application
 * 2. Reference expansion (resolve all $ref)
 * 3. Alias resolution
 * 4. Format canonicalization
 * 5. Version normalization
 *
 * ## Usage Example
 *
 * ```typescript
 * import { normalize } from './core/normalizer';
 *
 * const normalized = normalize(validatedIntent, {
 *   expandReferences: true,
 *   applyDefaults: true,
 *   canonicalize: true,
 * });
 *
 * // Access normalization metadata
 * console.log(normalized._normalization.originalHash);
 * console.log(normalized._normalization.appliedDefaults);
 * ```
 *
 * @module core/normalizer
 */

// Main normalizer
export {
  createNormalizer,
  generateDeterministicUUID,
  getAppliedDefaults,
  getExpandedReferences,
  getNormalizedHash,
  getOriginalHash,
  isNormalized,
  normalize,
  normalizedEquals,
  reconstructOriginal,
  verifyIdempotent,
} from './IntentNormalizer.js';

// Canonicalizer
export {
  canonicalize,
  canonicalEquals,
  computeCanonicalString,
  sortObjectKeys,
} from './Canonicalizer.js';

export type { CanonicalizationOptions } from './Canonicalizer.js';

// Default resolver
export {
  applyDefaults,
  getDefault,
  getDefaultDefinitions,
  hasDefault,
  normalizeEnvVars,
  normalizePorts,
  normalizeResources,
  normalizeSecrets,
} from './DefaultResolver.js';

export type {
  DefaultResolutionResult,
  DefaultResolverOptions,
} from './DefaultResolver.js';

// Reference expander
export {
  createRef,
  expandReferences,
  findReferences,
  getRefPath,
  hasReferences,
  validateReferences,
} from './RefExpander.js';

export type {
  ExpansionResult,
  RefExpanderOptions,
} from './RefExpander.js';

// Types
export type {
  ApiVersion,
  AppliedDefault,
  DependencyNode,
  EnvVar,
  IntentMetadata,
  IntentSpec,
  NormalizedIntent,
  NormalizedMetadata,
  NormalizationMetadata,
  NormalizationOptions,
  NormalizedSpec,
  Port,
  RefExpansionResult,
  Resource,
  ResourceReference,
  ResourceRequirements,
  ResourceSpec,
  Secret,
  SemanticVersion,
  TransformationRecord,
  TransformationType,
  ValidatedIntent,
} from './types.js';

// Constants and utilities
export {
  DEFAULT_VALUES,
  isArray,
  isPlainObject,
  isResourceReference,
  NormalizationError,
  UUID_NAMESPACE_AGENTICS,
} from './types.js';

export type { NormalizationErrorCode } from './types.js';
