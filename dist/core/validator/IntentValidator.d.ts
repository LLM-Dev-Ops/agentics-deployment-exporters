/**
 * Intent Validator
 *
 * Main validator implementing IIntentValidator.
 * Coordinates all validation layers in order:
 * 1. Structural validation (JSON Schema via Zod)
 * 2. Semantic validation (business rules)
 * 3. Reference validation (integrity checks)
 * 4. Security validation (injection prevention)
 *
 * Collects ALL errors before failing (not fail-fast).
 * Validation is deterministic - same input always produces same result.
 */
import type { IIntentValidator, IntentValidationResult, ParsedIntent, ValidationOptions, ValidationRule } from './types.js';
/**
 * Main intent validator that coordinates all validation layers.
 *
 * Implements the IIntentValidator interface and provides:
 * - Structural validation using Zod schemas
 * - Reference integrity checking
 * - Business constraint validation
 * - Security vulnerability scanning
 *
 * All-or-nothing: If any error is found, the entire intent is rejected.
 * Deterministic: Same input always produces same validation result.
 */
export declare class IntentValidator implements IIntentValidator {
    private readonly schemaValidator;
    private readonly refValidator;
    private readonly constraintValidator;
    private readonly securityValidator;
    private readonly customRules;
    constructor();
    /**
     * Validate parsed intent against schema and business rules.
     * Collects ALL errors before failing (not fail-fast at individual rule level).
     *
     * @param intent - Parsed intent to validate
     * @param options - Validation options
     * @returns Validation result with all errors and warnings
     */
    validate(intent: ParsedIntent, options?: ValidationOptions): Promise<IntentValidationResult>;
    /**
     * Register a custom validation rule.
     *
     * @param rule - Validation rule to register
     */
    registerRule(rule: ValidationRule): void;
    /**
     * Get all registered validation rules (including built-in descriptions).
     */
    getRules(): readonly ValidationRule[];
    /**
     * Build validation metadata.
     */
    private buildMetadata;
    /**
     * Build validated intent from parsed intent.
     */
    private buildValidatedIntent;
    /**
     * Sort issues by path for deterministic output.
     */
    private sortIssues;
}
/**
 * Create a new IntentValidator instance.
 */
export declare function createIntentValidator(): IIntentValidator;
//# sourceMappingURL=IntentValidator.d.ts.map