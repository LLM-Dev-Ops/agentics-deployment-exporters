/**
 * Canonicalizer Module
 *
 * Provides deterministic structure canonicalization for intent objects.
 * Ensures byte-for-byte reproducibility through:
 * - Alphabetical key sorting
 * - Stable array ordering (topological for dependencies)
 * - Removal of undefined/null optional fields
 * - Consistent formatting
 *
 * @module core/normalizer/Canonicalizer
 */
/**
 * Options for canonicalization
 */
export interface CanonicalizationOptions {
    /**
     * Sort object keys alphabetically
     * @default true
     */
    readonly sortKeys?: boolean;
    /**
     * Remove undefined values from objects
     * @default true
     */
    readonly removeUndefined?: boolean;
    /**
     * Remove null values from objects
     * @default false
     */
    readonly removeNull?: boolean;
    /**
     * Use topological sort for arrays with dependencies
     * @default true
     */
    readonly topologicalSort?: boolean;
    /**
     * Fields that indicate an array should be topologically sorted
     */
    readonly dependencyFields?: readonly string[];
}
/**
 * Canonicalize any value to a deterministic form
 *
 * This function is the core of determinism guarantees:
 * - Same input always produces same output
 * - Output is sorted and normalized
 * - Pure function with no side effects
 *
 * @param obj - The value to canonicalize
 * @param options - Canonicalization options
 * @returns The canonicalized value
 */
export declare function canonicalize(obj: unknown, options?: CanonicalizationOptions): unknown;
/**
 * Compute a deterministic hash of a canonical value
 *
 * This produces a stable string representation for comparison
 */
export declare function computeCanonicalString(value: unknown): string;
/**
 * Check if two values are canonically equal
 */
export declare function canonicalEquals(a: unknown, b: unknown): boolean;
/**
 * Sort object keys recursively (convenience function)
 */
export declare function sortObjectKeys(obj: unknown): unknown;
//# sourceMappingURL=Canonicalizer.d.ts.map