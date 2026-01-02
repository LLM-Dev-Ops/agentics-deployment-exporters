/**
 * Constraint Validator
 *
 * Validates business rules and cross-field constraints.
 * Implements semantic validation beyond schema structure.
 */
import type { CrossFieldConstraint, ParsedIntent, ValidationIssue } from './types.js';
/**
 * Validates business rules and cross-field constraints.
 * Implements semantic validation that goes beyond JSON Schema structure.
 */
export declare class ConstraintValidator {
    private readonly constraints;
    constructor();
    /**
     * Validate all constraints on the intent.
     *
     * @param intent - The parsed intent to validate
     * @returns Array of validation issues for any constraint violations
     */
    validateConstraints(intent: ParsedIntent): ValidationIssue[];
    /**
     * Add a custom constraint.
     *
     * @param constraint - The constraint to add
     */
    addConstraint(constraint: CrossFieldConstraint): void;
    /**
     * Get all registered constraints.
     */
    getConstraints(): readonly CrossFieldConstraint[];
    /**
     * Validate replica counts are positive.
     */
    private validateReplicaCount;
    /**
     * Validate port numbers are in valid range.
     */
    private validatePortRanges;
    /**
     * Validate name formats follow Kubernetes conventions.
     */
    private validateNameFormats;
    /**
     * Validate environment variable names follow conventions.
     */
    private validateEnvVarNames;
    /**
     * Validate resource constraints (requests <= limits).
     */
    private validateResourceConstraints;
    /**
     * Validate all registered cross-field constraints.
     */
    private validateCrossFieldConstraints;
}
//# sourceMappingURL=ConstraintValidator.d.ts.map