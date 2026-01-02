/**
 * Completeness Checker for Export Verification
 *
 * Verifies that all intent components were successfully exported
 * and reports any missing components.
 *
 * Based on SPARC_PSEUDOCODE.md section 5.3 VerifyOutput algorithm:
 * - Check all intent components were exported
 * - Report missing components
 *
 * @module verification/CompletenessChecker
 * @version 1.0.0
 */
import type { ExportArtifact, NormalizedIntent, ValidatedIntent } from '../core/types.js';
import type { CompletenessResult } from './types.js';
/**
 * Configuration options for completeness checking.
 */
export interface CompletenessOptions {
    /** Custom component extractor function */
    readonly componentExtractor?: (intent: ValidatedIntent | NormalizedIntent) => readonly string[];
    /** Custom artifact component mapper */
    readonly artifactMapper?: (artifact: ExportArtifact) => readonly string[];
    /** Ignore missing components matching these patterns */
    readonly ignorePatterns?: readonly RegExp[];
    /** Require all components to be present */
    readonly strict?: boolean;
}
/**
 * Verifies export completeness by checking that all intent components
 * were included in the export.
 *
 * @example
 * ```typescript
 * const checker = new CompletenessChecker();
 *
 * // Check completeness
 * const result = checker.check(intent, artifacts);
 *
 * if (!result.complete) {
 *   console.warn('Missing components:', result.missingComponents);
 *   console.log(`Export is ${result.completenessPercentage}% complete`);
 * }
 * ```
 */
export declare class CompletenessChecker {
    private readonly options;
    private readonly componentExtractor;
    private readonly artifactMapper;
    /**
     * Create a new CompletenessChecker.
     *
     * @param options - Checker options
     */
    constructor(options?: CompletenessOptions);
    /**
     * Check completeness of an export against the source intent.
     *
     * @param intent - Source intent containing all components
     * @param artifacts - Exported artifacts to check
     * @returns Completeness result
     */
    check(intent: ValidatedIntent | NormalizedIntent, artifacts: readonly ExportArtifact[]): CompletenessResult;
    /**
     * Check completeness across multiple export formats.
     *
     * @param intent - Source intent
     * @param artifactsByFormat - Map of format to artifacts
     * @returns Map of format to completeness result
     */
    checkByFormat(intent: ValidatedIntent | NormalizedIntent, artifactsByFormat: ReadonlyMap<string, readonly ExportArtifact[]>): ReadonlyMap<string, CompletenessResult>;
    /**
     * Get a summary of completeness across all formats.
     *
     * @param resultsByFormat - Map of format to completeness result
     * @returns Summary with overall completeness
     */
    summarize(resultsByFormat: ReadonlyMap<string, CompletenessResult>): CompletenesSummary;
    /**
     * Get list of components that are partially exported.
     *
     * Components that appear in some formats but not others.
     *
     * @param resultsByFormat - Map of format to completeness result
     * @returns List of partially exported component names
     */
    getPartiallyExported(resultsByFormat: ReadonlyMap<string, CompletenessResult>): readonly string[];
    /**
     * Check if a component should be ignored based on patterns.
     */
    private shouldIgnore;
}
/**
 * Summary of completeness across multiple formats.
 */
export interface CompletenesSummary {
    /** Whether export is complete across all formats */
    readonly complete: boolean;
    /** Number of formats checked */
    readonly formatsChecked: number;
    /** Total number of components expected */
    readonly totalComponents: number;
    /** Components missing from ALL formats */
    readonly missingFromAll: readonly string[];
    /** Overall completeness percentage */
    readonly overallPercentage: number;
    /** Individual results by format */
    readonly byFormat: ReadonlyMap<string, CompletenessResult>;
}
/**
 * Create a new CompletenessChecker instance.
 *
 * @param options - Checker options
 */
export declare function createCompletenessChecker(options?: CompletenessOptions): CompletenessChecker;
/**
 * Check completeness of an export.
 *
 * Convenience function for one-off completeness checking.
 *
 * @param intent - Source intent
 * @param artifacts - Exported artifacts
 * @returns Completeness result
 */
export declare function checkCompleteness(intent: ValidatedIntent | NormalizedIntent, artifacts: readonly ExportArtifact[]): CompletenessResult;
/**
 * Get missing components from an export.
 *
 * @param intent - Source intent
 * @param artifacts - Exported artifacts
 * @returns List of missing component names
 */
export declare function getMissingComponents(intent: ValidatedIntent | NormalizedIntent, artifacts: readonly ExportArtifact[]): readonly string[];
/**
 * Check if an export is complete.
 *
 * @param intent - Source intent
 * @param artifacts - Exported artifacts
 * @returns True if all components were exported
 */
export declare function isExportComplete(intent: ValidatedIntent | NormalizedIntent, artifacts: readonly ExportArtifact[]): boolean;
//# sourceMappingURL=CompletenessChecker.d.ts.map