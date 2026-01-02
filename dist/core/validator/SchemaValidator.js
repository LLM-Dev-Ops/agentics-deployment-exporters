/**
 * Schema Validator
 *
 * JSON Schema validation using Zod.
 * Validates DeploymentIntent structure, types, and required fields.
 * Supports schema versioning.
 */
import { z } from 'zod';
import { ValidationErrorCodes } from './types.js';
// -----------------------------------------------------------------------------
// Zod Schemas
// -----------------------------------------------------------------------------
/**
 * Resource quantity schema (cpu, memory)
 */
const ResourceQuantitySchema = z.object({
    cpu: z.string().regex(/^(\d+m?|\d+\.\d+)$/).optional(),
    memory: z.string().regex(/^(\d+(Ki|Mi|Gi|Ti)?)$/).optional(),
}).strict();
/**
 * Resource requirements schema
 */
const ResourceRequirementsSchema = z.object({
    requests: ResourceQuantitySchema.optional(),
    limits: ResourceQuantitySchema.optional(),
}).strict();
/**
 * Port specification schema
 */
const PortSpecSchema = z.object({
    name: z.string().regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/).max(15).optional(),
    containerPort: z.number().int().min(1).max(65535),
    protocol: z.enum(['TCP', 'UDP']).optional(),
    servicePort: z.number().int().min(1).max(65535).optional(),
}).strict();
/**
 * Image specification schema
 */
const ImageSpecSchema = z.union([
    z.string().min(1),
    z.object({
        repository: z.string().min(1),
        tag: z.string().optional(),
        digest: z.string().regex(/^sha256:[a-f0-9]{64}$/).optional(),
    }).strict(),
]);
/**
 * Health check specification schema
 */
const HealthCheckSpecSchema = z.object({
    type: z.enum(['http', 'tcp', 'exec']),
    path: z.string().optional(),
    port: z.number().int().min(1).max(65535).optional(),
    command: z.array(z.string()).optional(),
    initialDelaySeconds: z.number().int().min(0).optional(),
    periodSeconds: z.number().int().min(1).optional(),
}).strict();
/**
 * Service specification schema
 */
const ServiceSpecSchema = z.object({
    name: z.string().regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/).min(1).max(63),
    image: ImageSpecSchema.optional(),
    replicas: z.number().int().min(0).optional(),
    ports: z.array(PortSpecSchema).optional(),
    resources: ResourceRequirementsSchema.optional(),
    healthCheck: HealthCheckSpecSchema.optional(),
}).strict();
/**
 * Secret key reference schema
 */
const SecretKeyRefSchema = z.object({
    name: z.string().min(1),
    key: z.string().min(1),
}).strict();
/**
 * ConfigMap key reference schema
 */
const ConfigMapKeyRefSchema = z.object({
    name: z.string().min(1),
    key: z.string().min(1),
}).strict();
/**
 * Environment variable source schema
 */
const EnvVarSourceSchema = z.object({
    secretKeyRef: SecretKeyRefSchema.optional(),
    configMapKeyRef: ConfigMapKeyRefSchema.optional(),
}).strict();
/**
 * Environment variable specification schema
 */
const EnvVarSpecSchema = z.object({
    name: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).min(1),
    value: z.string().optional(),
    valueFrom: EnvVarSourceSchema.optional(),
}).strict().refine((data) => data.value !== undefined || data.valueFrom !== undefined, { message: 'Either value or valueFrom must be specified' });
/**
 * Secret specification schema
 */
const SecretSpecSchema = z.object({
    name: z.string().regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/).min(1).max(253),
    type: z.string().optional(),
    data: z.record(z.string()).optional(),
}).strict();
/**
 * Resource specification schema
 */
const ResourceSpecSchema = z.object({
    type: z.string().min(1),
    name: z.string().min(1).max(253),
    dependsOn: z.array(z.string()).optional(),
    properties: z.record(z.unknown()).optional(),
}).strict();
/**
 * Ingress specification schema
 */
const IngressSpecSchema = z.object({
    enabled: z.boolean().optional(),
    host: z.string().optional(),
    path: z.string().optional(),
    tls: z.boolean().optional(),
}).strict();
/**
 * Network policy specification schema
 */
const NetworkPolicySpecSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['ingress', 'egress', 'both']),
}).strict();
/**
 * Networking specification schema
 */
const NetworkingSpecSchema = z.object({
    ingress: IngressSpecSchema.optional(),
    networkPolicies: z.array(NetworkPolicySpecSchema).optional(),
}).strict();
/**
 * Storage specification schema
 */
const StorageSpecSchema = z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    size: z.string().regex(/^(\d+(Ki|Mi|Gi|Ti)?)$/).optional(),
    mountPath: z.string().optional(),
}).strict();
/**
 * Rule specification schema
 */
const RuleSpecSchema = z.object({
    apiGroups: z.array(z.string()).optional(),
    resources: z.array(z.string()).optional(),
    verbs: z.array(z.string()).optional(),
}).strict();
/**
 * Role specification schema
 */
const RoleSpecSchema = z.object({
    name: z.string().min(1),
    rules: z.array(RuleSpecSchema).optional(),
}).strict();
/**
 * RBAC specification schema
 */
const RBACSpecSchema = z.object({
    enabled: z.boolean().optional(),
    roles: z.array(RoleSpecSchema).optional(),
}).strict();
/**
 * Security specification schema
 */
const SecuritySpecSchema = z.object({
    rbac: RBACSpecSchema.optional(),
    podSecurityContext: z.record(z.unknown()).optional(),
}).strict();
/**
 * Intent specification schema
 */
const IntentSpecSchema = z.object({
    targetFormat: z.string().min(1),
    provider: z.enum(['aws', 'gcp', 'azure', 'multi', 'local']).optional(),
    resources: z.array(ResourceSpecSchema).optional(),
    services: z.array(ServiceSpecSchema).optional(),
    env: z.array(EnvVarSpecSchema).optional(),
    secrets: z.array(SecretSpecSchema).optional(),
    networking: NetworkingSpecSchema.optional(),
    storage: z.array(StorageSpecSchema).optional(),
    security: SecuritySpecSchema.optional(),
    config: z.record(z.unknown()).optional(),
    extensions: z.record(z.unknown()).optional(),
}).strict();
/**
 * Intent metadata schema
 */
const IntentMetadataSchema = z.object({
    name: z.string().regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/).min(1).max(253),
    namespace: z.string().regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/).max(63).optional(),
    labels: z.record(z.string()).optional(),
    annotations: z.record(z.string()).optional(),
    version: z.string().regex(/^\d+\.\d+\.\d+(-[\w.]+)?$/).optional(),
    createdAt: z.string().datetime().optional(),
}).strict();
/**
 * Supported API versions
 */
const SUPPORTED_API_VERSIONS = [
    'agentics.io/v1alpha1',
    'agentics.io/v1beta1',
    'agentics.io/v1',
];
/**
 * Full DeploymentIntent schema
 */
const DeploymentIntentSchema = z.object({
    apiVersion: z.enum(SUPPORTED_API_VERSIONS),
    kind: z.literal('DeploymentIntent'),
    metadata: IntentMetadataSchema,
    spec: IntentSpecSchema,
}).strict();
// -----------------------------------------------------------------------------
// Schema Version Registry
// -----------------------------------------------------------------------------
const SCHEMA_VERSIONS = new Map([
    ['agentics.io/v1alpha1', {
            version: 'agentics.io/v1alpha1',
            deprecated: true,
            deprecatedAt: '2025-06-01',
            removedIn: 'agentics.io/v2',
        }],
    ['agentics.io/v1beta1', {
            version: 'agentics.io/v1beta1',
            deprecated: true,
            deprecatedAt: '2025-12-01',
            removedIn: 'agentics.io/v2',
        }],
    ['agentics.io/v1', {
            version: 'agentics.io/v1',
            deprecated: false,
        }],
]);
// -----------------------------------------------------------------------------
// Schema Validator Class
// -----------------------------------------------------------------------------
/**
 * Validates parsed intents against Zod schemas.
 * Provides structural validation with detailed error messages.
 */
export class SchemaValidator {
    schema;
    constructor() {
        this.schema = DeploymentIntentSchema;
    }
    /**
     * Validate a parsed intent against the schema.
     *
     * @param intent - The parsed intent to validate
     * @returns Schema validation result with all issues
     */
    validate(intent) {
        const result = this.schema.safeParse(intent.data);
        if (result.success) {
            return {
                valid: true,
                issues: [],
                data: result.data,
            };
        }
        const issues = this.convertZodErrors(result.error);
        return {
            valid: false,
            issues,
        };
    }
    /**
     * Get schema version information.
     *
     * @param apiVersion - The API version to look up
     * @returns Schema version info or undefined if not found
     */
    getSchemaVersion(apiVersion) {
        return SCHEMA_VERSIONS.get(apiVersion);
    }
    /**
     * Check if an API version is supported.
     *
     * @param apiVersion - The API version to check
     * @returns True if the version is supported
     */
    isVersionSupported(apiVersion) {
        return SUPPORTED_API_VERSIONS.includes(apiVersion);
    }
    /**
     * Get all supported API versions.
     */
    getSupportedVersions() {
        return SUPPORTED_API_VERSIONS;
    }
    /**
     * Convert Zod errors to ValidationIssue format.
     */
    convertZodErrors(error) {
        return error.errors.map((zodError) => {
            const path = this.formatPath(zodError.path);
            const { code, message } = this.mapZodErrorCode(zodError);
            return {
                code,
                category: 'SCHEMA_ERROR',
                severity: 'error',
                message: message || zodError.message,
                path,
                expected: this.getExpectedValue(zodError),
                actual: this.getActualValue(zodError),
                remediation: this.getRemediation(zodError),
            };
        });
    }
    /**
     * Format a Zod path to JSONPath format.
     */
    formatPath(pathParts) {
        if (pathParts.length === 0) {
            return '$';
        }
        return '$.' + pathParts.map(part => {
            if (typeof part === 'number') {
                return `[${part}]`;
            }
            return part;
        }).join('.');
    }
    /**
     * Map Zod error codes to our validation error codes.
     */
    mapZodErrorCode(error) {
        switch (error.code) {
            case 'invalid_type':
                return {
                    code: ValidationErrorCodes.SCHEMA_INVALID_TYPE,
                    message: `Expected ${error.expected}, received ${error.received}`,
                };
            case 'invalid_string':
                if ('validation' in error && error.validation === 'regex') {
                    return {
                        code: ValidationErrorCodes.SCHEMA_PATTERN_MISMATCH,
                        message: `String does not match required pattern`,
                    };
                }
                return {
                    code: ValidationErrorCodes.SCHEMA_PATTERN_MISMATCH,
                };
            case 'too_small':
                if (error.type === 'array') {
                    return {
                        code: ValidationErrorCodes.SCHEMA_ARRAY_LENGTH_VIOLATION,
                        message: `Array must contain at least ${error.minimum} element(s)`,
                    };
                }
                return {
                    code: ValidationErrorCodes.SCHEMA_VALUE_OUT_OF_RANGE,
                    message: `Value must be greater than or equal to ${error.minimum}`,
                };
            case 'too_big':
                if (error.type === 'array') {
                    return {
                        code: ValidationErrorCodes.SCHEMA_ARRAY_LENGTH_VIOLATION,
                        message: `Array must contain at most ${error.maximum} element(s)`,
                    };
                }
                return {
                    code: ValidationErrorCodes.SCHEMA_VALUE_OUT_OF_RANGE,
                    message: `Value must be less than or equal to ${error.maximum}`,
                };
            case 'invalid_enum_value':
                return {
                    code: ValidationErrorCodes.SCHEMA_PATTERN_MISMATCH,
                    message: `Invalid enum value. Expected one of: ${error.options.join(', ')}`,
                };
            case 'unrecognized_keys':
                return {
                    code: ValidationErrorCodes.SCHEMA_INVALID_TYPE,
                    message: `Unrecognized key(s): ${error.keys.join(', ')}`,
                };
            case 'invalid_literal':
                return {
                    code: ValidationErrorCodes.SCHEMA_PATTERN_MISMATCH,
                    message: `Expected literal value: ${String(error.expected)}`,
                };
            case 'custom':
                return {
                    code: ValidationErrorCodes.SCHEMA_INVALID_TYPE,
                };
            default:
                return {
                    code: ValidationErrorCodes.SCHEMA_INVALID_TYPE,
                };
        }
    }
    /**
     * Extract expected value from Zod error.
     */
    getExpectedValue(error) {
        if (error.code === 'invalid_type') {
            return error.expected;
        }
        if (error.code === 'invalid_enum_value') {
            return error.options;
        }
        if (error.code === 'invalid_literal') {
            return error.expected;
        }
        if (error.code === 'too_small' || error.code === 'too_big') {
            return error.code === 'too_small' ? `>= ${error.minimum}` : `<= ${error.maximum}`;
        }
        return undefined;
    }
    /**
     * Extract actual value from Zod error.
     */
    getActualValue(error) {
        if (error.code === 'invalid_type') {
            return error.received;
        }
        if (error.code === 'invalid_enum_value') {
            return error.received;
        }
        return undefined;
    }
    /**
     * Get remediation guidance for Zod error.
     */
    getRemediation(error) {
        switch (error.code) {
            case 'invalid_type':
                return `Change the value type from ${error.received} to ${error.expected}`;
            case 'invalid_string':
                return 'Ensure the string matches the required format';
            case 'too_small':
                return `Increase the value to meet the minimum requirement of ${error.minimum}`;
            case 'too_big':
                return `Decrease the value to meet the maximum requirement of ${error.maximum}`;
            case 'invalid_enum_value':
                return `Use one of the allowed values: ${error.options.join(', ')}`;
            case 'unrecognized_keys':
                return `Remove unrecognized keys: ${error.keys.join(', ')}`;
            default:
                return 'Review the field value and ensure it matches the schema requirements';
        }
    }
}
//# sourceMappingURL=SchemaValidator.js.map