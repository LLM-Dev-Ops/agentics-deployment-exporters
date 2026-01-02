/**
 * Security Validator
 *
 * Validates against injection attacks and security vulnerabilities.
 * Prevents SQL, shell, template, and path traversal injections.
 */
import type { InjectionPattern, ParsedIntent, SecurityScanResult, ValidationIssue } from './types.js';
/**
 * Validates intent values against security vulnerabilities.
 * Scans for injection attacks and dangerous patterns.
 */
export declare class SecurityValidator {
    private readonly patterns;
    private readonly scannedPatterns;
    constructor();
    /**
     * Scan the intent for security issues.
     *
     * @param intent - The parsed intent to scan
     * @returns Security scan result with all issues found
     */
    scan(intent: ParsedIntent): SecurityScanResult;
    /**
     * Validate a single string value for security issues.
     *
     * @param value - The string value to validate
     * @param path - The JSONPath to this value
     * @returns Array of validation issues found
     */
    validateString(value: string, path: string): ValidationIssue[];
    /**
     * Get all registered injection patterns.
     */
    getPatterns(): readonly InjectionPattern[];
    /**
     * Add a custom injection pattern.
     */
    addPattern(pattern: InjectionPattern): void;
    /**
     * Recursively scan an object for security issues.
     */
    private scanObject;
    /**
     * Create a security issue from a pattern match.
     */
    private createSecurityIssue;
    /**
     * Get the appropriate error code for an injection type.
     */
    private getErrorCode;
    /**
     * Get remediation guidance for an injection type.
     */
    private getRemediation;
    /**
     * Get documentation URL for an injection type.
     */
    private getDocumentationUrl;
    /**
     * Truncate a value for display in error messages.
     */
    private truncateValue;
}
//# sourceMappingURL=SecurityValidator.d.ts.map