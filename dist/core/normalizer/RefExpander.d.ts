/**
 * RefExpander Module
 *
 * Expands all $ref references in a ValidatedIntent to inline values.
 * Handles circular reference detection and rejection.
 *
 * Key principles:
 * - All references are resolved to their concrete values
 * - Circular references are detected and rejected
 * - Deterministic expansion order (alphabetical by reference path)
 * - Pure function with no side effects
 *
 * @module core/normalizer/RefExpander
 */
import { RefExpansionResult, ResourceReference, ValidatedIntent } from './types.js';
/**
 * Options for reference expansion
 */
export interface RefExpanderOptions {
    /**
     * Maximum depth for recursive expansion
     * @default 100
     */
    readonly maxDepth?: number;
    /**
     * Whether to fail on unresolved references
     * @default true
     */
    readonly failOnUnresolved?: boolean;
    /**
     * Whether to track resolved references for audit
     * @default true
     */
    readonly trackResolved?: boolean;
}
/**
 * Result of expanding references in an intent
 */
export interface ExpansionResult {
    /**
     * The intent with all references expanded
     */
    readonly intent: ValidatedIntent;
    /**
     * List of references that were resolved
     */
    readonly resolvedRefs: readonly string[];
    /**
     * List of references that could not be resolved
     */
    readonly unresolvedRefs: readonly string[];
}
/**
 * Expand all $ref references in a validated intent
 *
 * @param intent - The validated intent with potential references
 * @param options - Expansion options
 * @returns The intent with all references expanded inline
 */
export declare function expandReferences(intent: ValidatedIntent, options?: RefExpanderOptions): ExpansionResult;
/**
 * Check if a value contains any references
 */
export declare function hasReferences(value: unknown): boolean;
/**
 * Find all references in a value
 */
export declare function findReferences(value: unknown): readonly string[];
/**
 * Validate that all references can be resolved
 */
export declare function validateReferences(intent: ValidatedIntent): RefExpansionResult;
/**
 * Create a reference object
 */
export declare function createRef(path: string): ResourceReference;
/**
 * Get the target path from a reference
 */
export declare function getRefPath(ref: ResourceReference): string;
//# sourceMappingURL=RefExpander.d.ts.map