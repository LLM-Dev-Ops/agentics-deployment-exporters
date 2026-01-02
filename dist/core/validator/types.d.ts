/**
 * Validator Types
 *
 * Type definitions for the IntentValidator module.
 * Follows SPARC Architecture and Refinement specifications.
 */
/**
 * Validation error code categories
 */
export declare const ValidationErrorCodes: {
    readonly SCHEMA_INVALID_JSON: "V1001";
    readonly SCHEMA_INVALID_YAML: "V1002";
    readonly SCHEMA_MISSING_REQUIRED: "V1003";
    readonly SCHEMA_INVALID_TYPE: "V1004";
    readonly SCHEMA_PATTERN_MISMATCH: "V1005";
    readonly SCHEMA_VALUE_OUT_OF_RANGE: "V1006";
    readonly SCHEMA_ARRAY_LENGTH_VIOLATION: "V1007";
    readonly SCHEMA_UNKNOWN_API_VERSION: "V1008";
    readonly REF_UNDEFINED_RESOURCE: "V1101";
    readonly REF_UNDEFINED_SECRET: "V1102";
    readonly REF_UNDEFINED_CONFIG: "V1103";
    readonly REF_CIRCULAR_DEPENDENCY: "V1104";
    readonly REF_INVALID_PATH: "V1105";
    readonly CONSTRAINT_RESOURCE_LIMIT: "V1201";
    readonly CONSTRAINT_REPLICA_COUNT: "V1202";
    readonly CONSTRAINT_PORT_RANGE: "V1203";
    readonly CONSTRAINT_NAME_FORMAT: "V1204";
    readonly CONSTRAINT_ENV_VAR_FORMAT: "V1205";
    readonly CONSTRAINT_CROSS_FIELD: "V1206";
    readonly SECURITY_SQL_INJECTION: "V1301";
    readonly SECURITY_SHELL_INJECTION: "V1302";
    readonly SECURITY_TEMPLATE_INJECTION: "V1303";
    readonly SECURITY_PATH_TRAVERSAL: "V1304";
    readonly SECURITY_FORBIDDEN_PATTERN: "V1305";
};
export type ValidationErrorCode = typeof ValidationErrorCodes[keyof typeof ValidationErrorCodes];
/**
 * Error categories as defined in SPARC_ARCHITECTURE.md
 */
export type ValidationIssueCategory = 'SCHEMA_ERROR' | 'REF_ERROR' | 'CONSTRAINT_ERROR' | 'SECURITY_ERROR';
/**
 * Severity level for validation issues
 */
export type ValidationSeverity = 'error' | 'warning';
/**
 * Represents a single validation issue found during validation
 */
export interface ValidationIssue {
    /** Machine-readable error code (V1xxx pattern) */
    readonly code: ValidationErrorCode;
    /** Error category for grouping */
    readonly category: ValidationIssueCategory;
    /** Issue severity */
    readonly severity: ValidationSeverity;
    /** Human-readable error message */
    readonly message: string;
    /** JSONPath to the problematic field */
    readonly path: string;
    /** Expected value or pattern (if applicable) */
    readonly expected?: unknown;
    /** Actual value found (if applicable) */
    readonly actual?: unknown;
    /** Remediation guidance */
    readonly remediation?: string;
    /** Documentation URL for more information */
    readonly documentationUrl?: string;
}
/**
 * Options for controlling validation behavior
 */
export interface ValidationOptions {
    /** Strict mode - treat warnings as errors */
    readonly strict?: boolean;
    /** Skip specific rule IDs during validation */
    readonly skipRules?: readonly string[];
    /** Additional context for validation (e.g., environment-specific constraints) */
    readonly context?: Readonly<Record<string, unknown>>;
    /** Schema version to validate against (defaults to latest) */
    readonly schemaVersion?: string;
    /** Enable security validation (default: true) */
    readonly enableSecurityValidation?: boolean;
    /** Custom validation rules to apply in addition to built-in rules */
    readonly customRules?: readonly ValidationRule[];
}
/**
 * Result of intent validation
 */
export interface IntentValidationResult {
    /** Whether validation passed (no errors) */
    readonly valid: boolean;
    /** All validation errors found */
    readonly errors: readonly ValidationIssue[];
    /** All validation warnings found */
    readonly warnings: readonly ValidationIssue[];
    /** The validated intent (only present if valid is true) */
    readonly intent?: ValidatedIntent | undefined;
    /** Validation metadata */
    readonly metadata: ValidationMetadata;
}
/**
 * Metadata about the validation process
 */
export interface ValidationMetadata {
    /** Schema version used for validation */
    readonly schemaVersion: string;
    /** Timestamp when validation was performed */
    readonly validatedAt: string;
    /** Number of rules applied */
    readonly rulesApplied: number;
    /** Duration of validation in milliseconds */
    readonly durationMs: number;
}
/**
 * A validation rule that can be registered with the validator
 */
export interface ValidationRule {
    /** Unique rule identifier */
    readonly id: string;
    /** Human-readable rule name */
    readonly name: string;
    /** Rule description */
    readonly description: string;
    /** Default severity when this rule is violated */
    readonly severity: ValidationSeverity;
    /** Category this rule belongs to */
    readonly category: ValidationIssueCategory;
    /**
     * Validate the intent against this rule
     * @param intent - The parsed intent to validate
     * @param context - Additional validation context
     * @returns Array of validation issues (empty if rule passes)
     */
    validate(intent: ParsedIntent, context?: Readonly<Record<string, unknown>>): readonly ValidationIssue[];
}
/**
 * Source location metadata for error reporting
 */
export interface SourceLocation {
    readonly line: number;
    readonly column: number;
    readonly offset?: number;
}
/**
 * Source map for tracking original positions
 */
export interface SourceMap {
    readonly locations: ReadonlyMap<string, SourceLocation>;
}
/**
 * Parsed intent before validation
 */
export interface ParsedIntent {
    /** Raw parsed data */
    readonly data: Readonly<Record<string, unknown>>;
    /** Source location metadata */
    readonly sourceMap?: SourceMap;
    /** Detected format */
    readonly format: 'json' | 'yaml';
    /** Original source content (for error reporting) */
    readonly source?: string;
}
/**
 * Intent after successful validation
 */
export interface ValidatedIntent {
    /** API version of the intent */
    readonly apiVersion: string;
    /** Kind of intent */
    readonly kind: string;
    /** Intent metadata */
    readonly metadata: IntentMetadata;
    /** Intent specification */
    readonly spec: IntentSpec;
    /** Original parsed data (preserved for reference) */
    readonly _raw: Readonly<Record<string, unknown>>;
}
/**
 * Intent metadata section
 */
export interface IntentMetadata {
    /** Unique name for this intent */
    readonly name: string;
    /** Optional namespace */
    readonly namespace?: string;
    /** Labels for categorization */
    readonly labels?: Readonly<Record<string, string>>;
    /** Annotations for additional metadata */
    readonly annotations?: Readonly<Record<string, string>>;
    /** Intent version */
    readonly version?: string;
    /** Creation timestamp (from intent, not runtime) */
    readonly createdAt?: string;
}
/**
 * Intent specification section
 */
export interface IntentSpec {
    /** Target export format */
    readonly targetFormat: string;
    /** Target provider (aws, gcp, azure, etc.) */
    readonly provider?: string;
    /** Resources to deploy */
    readonly resources?: readonly ResourceSpec[];
    /** Service configurations */
    readonly services?: readonly ServiceSpec[];
    /** Environment variables */
    readonly env?: readonly EnvVarSpec[];
    /** Secrets configuration */
    readonly secrets?: readonly SecretSpec[];
    /** Network configuration */
    readonly networking?: NetworkingSpec;
    /** Storage configuration */
    readonly storage?: readonly StorageSpec[];
    /** Security configuration */
    readonly security?: SecuritySpec;
    /** Custom configuration */
    readonly config?: Readonly<Record<string, unknown>>;
    /** Extension point for future fields */
    readonly extensions?: Readonly<Record<string, unknown>>;
}
/**
 * Resource specification
 */
export interface ResourceSpec {
    readonly type: string;
    readonly name: string;
    readonly dependsOn?: readonly string[];
    readonly properties?: Readonly<Record<string, unknown>>;
}
/**
 * Service specification
 */
export interface ServiceSpec {
    readonly name: string;
    readonly image?: ImageSpec | string;
    readonly replicas?: number;
    readonly ports?: readonly PortSpec[];
    readonly resources?: ResourceRequirements;
    readonly healthCheck?: HealthCheckSpec;
}
/**
 * Image specification
 */
export interface ImageSpec {
    readonly repository: string;
    readonly tag?: string;
    readonly digest?: string;
}
/**
 * Port specification
 */
export interface PortSpec {
    readonly name?: string;
    readonly containerPort: number;
    readonly protocol?: 'TCP' | 'UDP';
    readonly servicePort?: number;
}
/**
 * Resource requirements
 */
export interface ResourceRequirements {
    readonly requests?: ResourceQuantity;
    readonly limits?: ResourceQuantity;
}
/**
 * Resource quantity
 */
export interface ResourceQuantity {
    readonly cpu?: string;
    readonly memory?: string;
}
/**
 * Health check specification
 */
export interface HealthCheckSpec {
    readonly type: 'http' | 'tcp' | 'exec';
    readonly path?: string;
    readonly port?: number;
    readonly command?: readonly string[];
    readonly initialDelaySeconds?: number;
    readonly periodSeconds?: number;
}
/**
 * Environment variable specification
 */
export interface EnvVarSpec {
    readonly name: string;
    readonly value?: string;
    readonly valueFrom?: EnvVarSource;
}
/**
 * Environment variable source
 */
export interface EnvVarSource {
    readonly secretKeyRef?: SecretKeyRef;
    readonly configMapKeyRef?: ConfigMapKeyRef;
}
/**
 * Secret key reference
 */
export interface SecretKeyRef {
    readonly name: string;
    readonly key: string;
}
/**
 * ConfigMap key reference
 */
export interface ConfigMapKeyRef {
    readonly name: string;
    readonly key: string;
}
/**
 * Secret specification
 */
export interface SecretSpec {
    readonly name: string;
    readonly type?: string;
    readonly data?: Readonly<Record<string, string>>;
}
/**
 * Networking specification
 */
export interface NetworkingSpec {
    readonly ingress?: IngressSpec;
    readonly networkPolicies?: readonly NetworkPolicySpec[];
}
/**
 * Ingress specification
 */
export interface IngressSpec {
    readonly enabled?: boolean;
    readonly host?: string;
    readonly path?: string;
    readonly tls?: boolean;
}
/**
 * Network policy specification
 */
export interface NetworkPolicySpec {
    readonly name: string;
    readonly type: 'ingress' | 'egress' | 'both';
}
/**
 * Storage specification
 */
export interface StorageSpec {
    readonly name: string;
    readonly type: string;
    readonly size?: string;
    readonly mountPath?: string;
}
/**
 * Security specification
 */
export interface SecuritySpec {
    readonly rbac?: RBACSpec;
    readonly podSecurityContext?: Readonly<Record<string, unknown>>;
}
/**
 * RBAC specification
 */
export interface RBACSpec {
    readonly enabled?: boolean;
    readonly roles?: readonly RoleSpec[];
}
/**
 * Role specification
 */
export interface RoleSpec {
    readonly name: string;
    readonly rules?: readonly RuleSpec[];
}
/**
 * Rule specification
 */
export interface RuleSpec {
    readonly apiGroups?: readonly string[];
    readonly resources?: readonly string[];
    readonly verbs?: readonly string[];
}
/**
 * Interface for intent validation implementations
 */
export interface IIntentValidator {
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
     * Get all registered validation rules.
     */
    getRules(): readonly ValidationRule[];
}
/**
 * Schema validation result
 */
export interface SchemaValidationResult {
    readonly valid: boolean;
    readonly issues: readonly ValidationIssue[];
    readonly data?: unknown;
}
/**
 * Schema version information
 */
export interface SchemaVersion {
    readonly version: string;
    readonly deprecated: boolean;
    readonly deprecatedAt?: string;
    readonly removedIn?: string;
}
/**
 * Reference type for cross-reference checking
 */
export interface InternalReference {
    readonly type: 'resource' | 'secret' | 'config' | 'service';
    readonly name: string;
    readonly sourcePath: string;
}
/**
 * Circular dependency detection result
 */
export interface CircularDependencyResult {
    readonly hasCircular: boolean;
    readonly cycles: readonly string[][];
}
/**
 * Cross-field constraint definition
 */
export interface CrossFieldConstraint {
    readonly id: string;
    readonly description: string;
    readonly fields: readonly string[];
    readonly validate: (values: Readonly<Record<string, unknown>>) => boolean;
    readonly errorMessage: string;
}
/**
 * Security scan result
 */
export interface SecurityScanResult {
    readonly safe: boolean;
    readonly issues: readonly ValidationIssue[];
    readonly scannedPatterns: readonly string[];
}
/**
 * Injection pattern definition
 */
export interface InjectionPattern {
    readonly id: string;
    readonly type: 'sql' | 'shell' | 'template' | 'path';
    readonly pattern: RegExp;
    readonly description: string;
    readonly severity: ValidationSeverity;
}
//# sourceMappingURL=types.d.ts.map