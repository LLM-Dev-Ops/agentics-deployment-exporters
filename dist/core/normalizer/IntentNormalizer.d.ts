/**
 * IntentNormalizer Module
 *
 * Main normalization module that transforms ValidatedIntent to NormalizedIntent.
 * Applies transformations in strict order to ensure determinism.
 *
 * TRANSFORMATIONS (in order):
 * 1. Default application
 * 2. Reference expansion (resolve all $ref)
 * 3. Alias resolution
 * 4. Format canonicalization
 * 5. Version normalization
 *
 * GUARANTEES:
 * - Idempotent: normalize(normalize(x)) === normalize(x)
 * - Deterministic: same input always produces same output
 * - Reversible: original can be reconstructed with metadata
 *
 * @module core/normalizer/IntentNormalizer
 */
import { AppliedDefault, NormalizedIntent, NormalizationOptions, ValidatedIntent } from './types.js';
/**
 * Normalize a validated intent to canonical form
 *
 * This is the main entry point for normalization.
 * It applies all transformations in strict order.
 *
 * @param intent - The validated intent to normalize
 * @param options - Normalization options
 * @returns The normalized intent with metadata
 */
export declare function normalize(intent: ValidatedIntent, options?: NormalizationOptions): NormalizedIntent;
/**
 * Verify that normalization is idempotent
 *
 * @param intent - The normalized intent to verify
 * @returns True if normalizing again produces the same result
 */
export declare function verifyIdempotent(intent: NormalizedIntent): boolean;
/**
 * Generate a deterministic UUID for a resource
 *
 * Uses UUID v5 with the intent hash and resource path
 */
export declare function generateDeterministicUUID(intentHash: string, resourcePath: string[]): string;
/**
 * Create a normalizer with preset options
 */
export declare function createNormalizer(defaultOptions?: NormalizationOptions): (intent: ValidatedIntent, options?: NormalizationOptions) => NormalizedIntent;
/**
 * Validate that an intent is in normalized form
 */
export declare function isNormalized(intent: unknown): intent is NormalizedIntent;
/**
 * Extract the original intent hash from a normalized intent
 */
export declare function getOriginalHash(intent: NormalizedIntent): string;
/**
 * Extract the normalized hash from a normalized intent
 */
export declare function getNormalizedHash(intent: NormalizedIntent): string;
/**
 * Get the list of applied defaults from a normalized intent
 */
export declare function getAppliedDefaults(intent: NormalizedIntent): readonly AppliedDefault[];
/**
 * Get the list of expanded references from a normalized intent
 */
export declare function getExpandedReferences(intent: NormalizedIntent): readonly string[];
/**
 * Compare two normalized intents for equality (ignoring metadata)
 */
export declare function normalizedEquals(a: NormalizedIntent, b: NormalizedIntent): boolean;
/**
 * Reconstruct the original intent structure (without original values)
 */
export declare function reconstructOriginal(intent: NormalizedIntent): ValidatedIntent;
//# sourceMappingURL=IntentNormalizer.d.ts.map