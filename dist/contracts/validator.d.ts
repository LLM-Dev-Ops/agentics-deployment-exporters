/**
 * Contract Validator for Agentics Deployment Exporters
 *
 * Provides JSON Schema validation using AJV for strict request validation.
 * All validation is deterministic and side-effect free.
 *
 * @module contracts/validator
 * @version 1.0.0
 */
import type { ExporterRequest, ValidationResult } from './types.js';
/**
 * Contract validator for exporter requests.
 * Uses AJV for JSON Schema validation with strict mode enabled.
 */
export declare class ContractValidator {
    private ajv;
    private validateFn;
    private readonly schemaVersion;
    private initPromise;
    /**
     * Creates a new ContractValidator instance.
     * Initialization is lazy - call init() or any validation method to initialize.
     */
    constructor();
    /**
     * Initializes the validator by loading AJV and compiling the schema.
     * This is called automatically on first use.
     */
    init(): Promise<void>;
    private doInit;
    /**
     * Validates an exporter request against the JSON Schema.
     * Pure function - no side effects.
     *
     * @param request - The request to validate
     * @returns Validation result with errors if any
     */
    validate(request: unknown): Promise<ValidationResult>;
    /**
     * Validates and returns a typed request if valid.
     * Throws if validation fails.
     *
     * @param request - The request to validate
     * @returns The validated and typed request
     * @throws Error if validation fails
     */
    validateOrThrow(request: unknown): Promise<ExporterRequest>;
    /**
     * Checks if a request is valid without returning detailed errors.
     *
     * @param request - The request to check
     * @returns true if valid, false otherwise
     */
    isValid(request: unknown): Promise<boolean>;
    /**
     * Synchronous validation (requires init() to have been called first).
     * Throws if not initialized.
     *
     * @param request - The request to validate
     * @returns Validation result with errors if any
     */
    validateSync(request: unknown): ValidationResult;
    /**
     * Gets the schema version used for validation.
     *
     * @returns The schema version string
     */
    getSchemaVersion(): string;
    /**
     * Gets the raw JSON Schema object.
     *
     * @returns The JSON Schema
     */
    getSchema(): object;
    /**
     * Transforms AJV errors into our ValidationErrorDetail format.
     *
     * @param ajvErrors - AJV error objects
     * @returns Transformed error details
     */
    private transformErrors;
}
/**
 * Creates a new ContractValidator instance.
 * Factory function for convenient instantiation.
 *
 * @returns A new ContractValidator
 */
export declare function createContractValidator(): ContractValidator;
/**
 * Gets the default (singleton) validator instance.
 * Lazy initialization for efficiency.
 *
 * @returns The default ContractValidator
 */
export declare function getDefaultValidator(): ContractValidator;
/**
 * Validates a request using the default validator.
 * Convenience function for one-off validations.
 *
 * @param request - The request to validate
 * @returns Validation result
 */
export declare function validateRequest(request: unknown): Promise<ValidationResult>;
/**
 * Validates a request and throws if invalid.
 * Convenience function for one-off validations.
 *
 * @param request - The request to validate
 * @returns The validated request
 * @throws Error if validation fails
 */
export declare function validateRequestOrThrow(request: unknown): Promise<ExporterRequest>;
//# sourceMappingURL=validator.d.ts.map