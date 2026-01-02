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
/**
 * Default component extractor from intent resources.
 */
function defaultComponentExtractor(intent) {
    if (!intent.spec?.resources) {
        return [];
    }
    return intent.spec.resources.map((r) => r.name);
}
/**
 * Default artifact to component mapper.
 * Extracts component references from artifact paths and metadata.
 */
function defaultArtifactMapper(artifact) {
    const components = [];
    // Extract from path (e.g., "resources/my-component.tf" -> "my-component")
    const pathMatch = artifact.path.match(/(?:resources\/)?([^/]+)\.[^.]+$/);
    if (pathMatch && pathMatch[1]) {
        components.push(pathMatch[1]);
    }
    // Extract from metadata if present
    if (artifact.metadata) {
        if (typeof artifact.metadata.componentId === 'string') {
            components.push(artifact.metadata.componentId);
        }
        if (typeof artifact.metadata.componentName === 'string') {
            components.push(artifact.metadata.componentName);
        }
        if (Array.isArray(artifact.metadata.components)) {
            components.push(...artifact.metadata.components.filter((c) => typeof c === 'string'));
        }
    }
    return components;
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
export class CompletenessChecker {
    options;
    componentExtractor;
    artifactMapper;
    /**
     * Create a new CompletenessChecker.
     *
     * @param options - Checker options
     */
    constructor(options) {
        this.options = options ?? {};
        this.componentExtractor =
            options?.componentExtractor ?? defaultComponentExtractor;
        this.artifactMapper = options?.artifactMapper ?? defaultArtifactMapper;
    }
    /**
     * Check completeness of an export against the source intent.
     *
     * @param intent - Source intent containing all components
     * @param artifacts - Exported artifacts to check
     * @returns Completeness result
     */
    check(intent, artifacts) {
        // Extract expected components from intent
        const expectedComponents = new Set(this.componentExtractor(intent));
        // Extract exported components from artifacts
        const exportedComponents = new Set();
        for (const artifact of artifacts) {
            const components = this.artifactMapper(artifact);
            for (const component of components) {
                exportedComponents.add(component);
            }
        }
        // Find missing components
        const missingComponents = [];
        for (const expected of expectedComponents) {
            if (!exportedComponents.has(expected)) {
                // Check if should be ignored
                if (this.shouldIgnore(expected)) {
                    continue;
                }
                missingComponents.push(expected);
            }
        }
        // Calculate completeness percentage
        const totalComponents = expectedComponents.size;
        const exportedCount = totalComponents - missingComponents.length;
        const completenessPercentage = totalComponents > 0
            ? Math.round((exportedCount / totalComponents) * 100)
            : 100;
        return Object.freeze({
            complete: missingComponents.length === 0,
            exportedComponents: Object.freeze([...exportedComponents]),
            missingComponents: Object.freeze(missingComponents.sort()),
            totalComponents,
            completenessPercentage,
        });
    }
    /**
     * Check completeness across multiple export formats.
     *
     * @param intent - Source intent
     * @param artifactsByFormat - Map of format to artifacts
     * @returns Map of format to completeness result
     */
    checkByFormat(intent, artifactsByFormat) {
        const results = new Map();
        for (const [format, artifacts] of artifactsByFormat) {
            results.set(format, this.check(intent, artifacts));
        }
        return results;
    }
    /**
     * Get a summary of completeness across all formats.
     *
     * @param resultsByFormat - Map of format to completeness result
     * @returns Summary with overall completeness
     */
    summarize(resultsByFormat) {
        const allMissing = new Set();
        const allExported = new Set();
        let totalComponents = 0;
        for (const result of resultsByFormat.values()) {
            for (const component of result.missingComponents) {
                allMissing.add(component);
            }
            for (const component of result.exportedComponents) {
                allExported.add(component);
            }
            totalComponents = Math.max(totalComponents, result.totalComponents);
        }
        // A component is truly missing only if missing from ALL formats
        const trulyMissing = [...allMissing].filter((m) => !allExported.has(m));
        const overallPercentage = totalComponents > 0
            ? Math.round(((totalComponents - trulyMissing.length) / totalComponents) * 100)
            : 100;
        return Object.freeze({
            complete: trulyMissing.length === 0,
            formatsChecked: resultsByFormat.size,
            totalComponents,
            missingFromAll: Object.freeze(trulyMissing.sort()),
            overallPercentage,
            byFormat: resultsByFormat,
        });
    }
    /**
     * Get list of components that are partially exported.
     *
     * Components that appear in some formats but not others.
     *
     * @param resultsByFormat - Map of format to completeness result
     * @returns List of partially exported component names
     */
    getPartiallyExported(resultsByFormat) {
        const componentFormats = new Map();
        // Track which formats each component appears in
        for (const [format, result] of resultsByFormat) {
            for (const component of result.exportedComponents) {
                if (!componentFormats.has(component)) {
                    componentFormats.set(component, new Set());
                }
                componentFormats.get(component).add(format);
            }
        }
        // Find components not in all formats
        const totalFormats = resultsByFormat.size;
        const partiallyExported = [];
        for (const [component, formats] of componentFormats) {
            if (formats.size > 0 && formats.size < totalFormats) {
                partiallyExported.push(component);
            }
        }
        return Object.freeze(partiallyExported.sort());
    }
    // ===========================================================================
    // PRIVATE METHODS
    // ===========================================================================
    /**
     * Check if a component should be ignored based on patterns.
     */
    shouldIgnore(component) {
        if (!this.options.ignorePatterns) {
            return false;
        }
        return this.options.ignorePatterns.some((pattern) => pattern.test(component));
    }
}
// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================
/**
 * Create a new CompletenessChecker instance.
 *
 * @param options - Checker options
 */
export function createCompletenessChecker(options) {
    return new CompletenessChecker(options);
}
// =============================================================================
// STANDALONE UTILITY FUNCTIONS
// =============================================================================
/**
 * Check completeness of an export.
 *
 * Convenience function for one-off completeness checking.
 *
 * @param intent - Source intent
 * @param artifacts - Exported artifacts
 * @returns Completeness result
 */
export function checkCompleteness(intent, artifacts) {
    const checker = new CompletenessChecker();
    return checker.check(intent, artifacts);
}
/**
 * Get missing components from an export.
 *
 * @param intent - Source intent
 * @param artifacts - Exported artifacts
 * @returns List of missing component names
 */
export function getMissingComponents(intent, artifacts) {
    const result = checkCompleteness(intent, artifacts);
    return result.missingComponents;
}
/**
 * Check if an export is complete.
 *
 * @param intent - Source intent
 * @param artifacts - Exported artifacts
 * @returns True if all components were exported
 */
export function isExportComplete(intent, artifacts) {
    const result = checkCompleteness(intent, artifacts);
    return result.complete;
}
//# sourceMappingURL=CompletenessChecker.js.map