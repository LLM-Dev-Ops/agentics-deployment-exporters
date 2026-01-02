/**
 * Reference Validator
 *
 * Validates internal references and checks for circular dependencies.
 * Ensures all referenced entities exist within the intent.
 */
import type { CircularDependencyResult, InternalReference, ParsedIntent, ValidationIssue } from './types.js';
/**
 * Validates internal references within a DeploymentIntent.
 * Checks that all referenced resources, secrets, and configs exist.
 * Detects circular dependencies in resource definitions.
 */
export declare class RefValidator {
    /**
     * Validate all references in the intent.
     *
     * @param intent - The parsed intent to validate
     * @returns Array of validation issues for any reference errors
     */
    validateReferences(intent: ParsedIntent): ValidationIssue[];
    /**
     * Check for circular dependencies in the resource graph.
     *
     * @param intent - The parsed intent to check
     * @returns Result indicating if circular dependencies exist and the cycles found
     */
    detectCircularDependencies(intent: ParsedIntent): CircularDependencyResult;
    /**
     * Get all internal references from the intent.
     *
     * @param intent - The parsed intent to analyze
     * @returns Array of all internal references found
     */
    extractAllReferences(intent: ParsedIntent): InternalReference[];
    /**
     * Extract resource definitions from spec.
     */
    private extractResources;
    /**
     * Extract secret definitions from spec.
     */
    private extractSecrets;
    /**
     * Extract service definitions from spec.
     */
    private extractServices;
    /**
     * Validate that all resource dependencies reference existing resources.
     */
    private validateResourceDependencies;
    /**
     * Validate that all secret references in environment variables exist.
     */
    private validateSecretReferences;
    /**
     * Validate circular dependencies in resource graph.
     */
    private validateCircularDependencies;
    /**
     * Validate service references (e.g., in networking or config).
     */
    private validateServiceReferences;
    /**
     * Find cycles in the resource dependency graph using DFS.
     */
    private findCycles;
}
//# sourceMappingURL=RefValidator.d.ts.map