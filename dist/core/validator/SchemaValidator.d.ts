/**
 * Schema Validator
 *
 * JSON Schema validation using Zod.
 * Validates DeploymentIntent structure, types, and required fields.
 * Supports schema versioning.
 */
import type { ParsedIntent, SchemaValidationResult, SchemaVersion } from './types.js';
/**
 * Validates parsed intents against Zod schemas.
 * Provides structural validation with detailed error messages.
 */
export declare class SchemaValidator {
    private readonly schema;
    constructor();
    /**
     * Validate a parsed intent against the schema.
     *
     * @param intent - The parsed intent to validate
     * @returns Schema validation result with all issues
     */
    validate(intent: ParsedIntent): SchemaValidationResult;
    /**
     * Get schema version information.
     *
     * @param apiVersion - The API version to look up
     * @returns Schema version info or undefined if not found
     */
    getSchemaVersion(apiVersion: string): SchemaVersion | undefined;
    /**
     * Check if an API version is supported.
     *
     * @param apiVersion - The API version to check
     * @returns True if the version is supported
     */
    isVersionSupported(apiVersion: string): boolean;
    /**
     * Get all supported API versions.
     */
    getSupportedVersions(): readonly string[];
    /**
     * Convert Zod errors to ValidationIssue format.
     */
    private convertZodErrors;
    /**
     * Format a Zod path to JSONPath format.
     */
    private formatPath;
    /**
     * Map Zod error codes to our validation error codes.
     */
    private mapZodErrorCode;
    /**
     * Extract expected value from Zod error.
     */
    private getExpectedValue;
    /**
     * Extract actual value from Zod error.
     */
    private getActualValue;
    /**
     * Get remediation guidance for Zod error.
     */
    private getRemediation;
}
//# sourceMappingURL=SchemaValidator.d.ts.map