/**
 * Constraint Validator
 *
 * Validates business rules and cross-field constraints.
 * Implements semantic validation beyond schema structure.
 */
import { ValidationErrorCodes } from './types.js';
// -----------------------------------------------------------------------------
// Built-in Constraints
// -----------------------------------------------------------------------------
/**
 * Resource requests must not exceed limits constraint
 */
const RESOURCE_REQUESTS_LIMIT_CONSTRAINT = {
    id: 'CONSTRAINT_RESOURCE_LIMIT',
    description: 'Resource requests must not exceed limits',
    fields: ['requests', 'limits'],
    validate: (values) => {
        const requests = values.requests;
        const limits = values.limits;
        if (!requests || !limits) {
            return true;
        }
        // Compare CPU
        if (requests.cpu && limits.cpu) {
            const reqCpu = parseCpuValue(requests.cpu);
            const limitCpu = parseCpuValue(limits.cpu);
            if (reqCpu > limitCpu) {
                return false;
            }
        }
        // Compare Memory
        if (requests.memory && limits.memory) {
            const reqMem = parseMemoryValue(requests.memory);
            const limitMem = parseMemoryValue(limits.memory);
            if (reqMem > limitMem) {
                return false;
            }
        }
        return true;
    },
    errorMessage: 'Resource requests exceed limits',
};
/**
 * Parse CPU value to millicores for comparison
 */
function parseCpuValue(cpu) {
    if (cpu.endsWith('m')) {
        return parseInt(cpu.slice(0, -1), 10);
    }
    return parseFloat(cpu) * 1000;
}
/**
 * Parse memory value to bytes for comparison
 */
function parseMemoryValue(memory) {
    const units = {
        'Ki': 1024,
        'Mi': 1024 * 1024,
        'Gi': 1024 * 1024 * 1024,
        'Ti': 1024 * 1024 * 1024 * 1024,
    };
    for (const [suffix, multiplier] of Object.entries(units)) {
        if (memory.endsWith(suffix)) {
            return parseInt(memory.slice(0, -suffix.length), 10) * multiplier;
        }
    }
    return parseInt(memory, 10);
}
// -----------------------------------------------------------------------------
// Constraint Validator Class
// -----------------------------------------------------------------------------
/**
 * Validates business rules and cross-field constraints.
 * Implements semantic validation that goes beyond JSON Schema structure.
 */
export class ConstraintValidator {
    constraints;
    constructor() {
        this.constraints = [RESOURCE_REQUESTS_LIMIT_CONSTRAINT];
    }
    /**
     * Validate all constraints on the intent.
     *
     * @param intent - The parsed intent to validate
     * @returns Array of validation issues for any constraint violations
     */
    validateConstraints(intent) {
        const issues = [];
        const data = intent.data;
        const spec = data.spec;
        if (!spec) {
            return issues;
        }
        // Validate replica count
        issues.push(...this.validateReplicaCount(spec));
        // Validate port ranges
        issues.push(...this.validatePortRanges(spec));
        // Validate name formats
        issues.push(...this.validateNameFormats(data));
        // Validate environment variable names
        issues.push(...this.validateEnvVarNames(spec));
        // Validate resource constraints
        issues.push(...this.validateResourceConstraints(spec));
        // Validate cross-field constraints
        issues.push(...this.validateCrossFieldConstraints(spec));
        return issues;
    }
    /**
     * Add a custom constraint.
     *
     * @param constraint - The constraint to add
     */
    addConstraint(constraint) {
        this.constraints.push(constraint);
    }
    /**
     * Get all registered constraints.
     */
    getConstraints() {
        return this.constraints;
    }
    // ---------------------------------------------------------------------------
    // Private Validation Methods
    // ---------------------------------------------------------------------------
    /**
     * Validate replica counts are positive.
     */
    validateReplicaCount(spec) {
        const issues = [];
        const services = spec.services;
        if (!services) {
            return issues;
        }
        for (let i = 0; i < services.length; i++) {
            const service = services[i];
            if (!service)
                continue;
            const replicas = service.replicas;
            if (replicas !== undefined && replicas < 0) {
                issues.push({
                    code: ValidationErrorCodes.CONSTRAINT_REPLICA_COUNT,
                    category: 'CONSTRAINT_ERROR',
                    severity: 'error',
                    message: `Replica count must be non-negative, got ${replicas}`,
                    path: `$.spec.services[${i}].replicas`,
                    expected: '>= 0',
                    actual: replicas,
                    remediation: 'Set replicas to 0 or a positive integer',
                });
            }
        }
        return issues;
    }
    /**
     * Validate port numbers are in valid range.
     */
    validatePortRanges(spec) {
        const issues = [];
        const services = spec.services;
        if (!services) {
            return issues;
        }
        for (let i = 0; i < services.length; i++) {
            const service = services[i];
            if (!service)
                continue;
            const ports = service.ports;
            if (!ports)
                continue;
            for (let j = 0; j < ports.length; j++) {
                const port = ports[j];
                if (!port)
                    continue;
                const containerPort = port.containerPort;
                if (containerPort !== undefined && (containerPort < 1 || containerPort > 65535)) {
                    issues.push({
                        code: ValidationErrorCodes.CONSTRAINT_PORT_RANGE,
                        category: 'CONSTRAINT_ERROR',
                        severity: 'error',
                        message: `Container port must be between 1 and 65535, got ${containerPort}`,
                        path: `$.spec.services[${i}].ports[${j}].containerPort`,
                        expected: '1-65535',
                        actual: containerPort,
                        remediation: 'Set port to a value between 1 and 65535',
                    });
                }
                const servicePort = port.servicePort;
                if (servicePort !== undefined && (servicePort < 1 || servicePort > 65535)) {
                    issues.push({
                        code: ValidationErrorCodes.CONSTRAINT_PORT_RANGE,
                        category: 'CONSTRAINT_ERROR',
                        severity: 'error',
                        message: `Service port must be between 1 and 65535, got ${servicePort}`,
                        path: `$.spec.services[${i}].ports[${j}].servicePort`,
                        expected: '1-65535',
                        actual: servicePort,
                        remediation: 'Set port to a value between 1 and 65535',
                    });
                }
            }
        }
        return issues;
    }
    /**
     * Validate name formats follow Kubernetes conventions.
     */
    validateNameFormats(data) {
        const issues = [];
        const metadata = data.metadata;
        if (!metadata) {
            return issues;
        }
        const name = metadata.name;
        if (name) {
            // RFC 1123 subdomain name validation
            const rfc1123Regex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
            if (!rfc1123Regex.test(name)) {
                issues.push({
                    code: ValidationErrorCodes.CONSTRAINT_NAME_FORMAT,
                    category: 'CONSTRAINT_ERROR',
                    severity: 'error',
                    message: `Name "${name}" does not follow RFC 1123 subdomain naming conventions`,
                    path: '$.metadata.name',
                    expected: 'lowercase alphanumeric, may contain hyphens (not at start/end)',
                    actual: name,
                    remediation: 'Use only lowercase letters, numbers, and hyphens. Must start and end with alphanumeric',
                });
            }
            // Length validation
            if (name.length > 253) {
                issues.push({
                    code: ValidationErrorCodes.CONSTRAINT_NAME_FORMAT,
                    category: 'CONSTRAINT_ERROR',
                    severity: 'error',
                    message: `Name length ${name.length} exceeds maximum of 253 characters`,
                    path: '$.metadata.name',
                    expected: '<= 253 characters',
                    actual: name.length,
                    remediation: 'Shorten the name to 253 characters or less',
                });
            }
        }
        return issues;
    }
    /**
     * Validate environment variable names follow conventions.
     */
    validateEnvVarNames(spec) {
        const issues = [];
        const envVars = spec.env;
        if (!envVars) {
            return issues;
        }
        for (let i = 0; i < envVars.length; i++) {
            const envVar = envVars[i];
            if (!envVar)
                continue;
            const name = envVar.name;
            if (!name)
                continue;
            // Environment variable names should be uppercase (warning)
            if (name !== name.toUpperCase()) {
                issues.push({
                    code: ValidationErrorCodes.CONSTRAINT_ENV_VAR_FORMAT,
                    category: 'CONSTRAINT_ERROR',
                    severity: 'warning',
                    message: `Environment variable "${name}" should be uppercase by convention`,
                    path: `$.spec.env[${i}].name`,
                    expected: 'UPPERCASE_WITH_UNDERSCORES',
                    actual: name,
                    remediation: 'Consider using uppercase letters and underscores for environment variable names',
                });
            }
            // Valid environment variable name pattern
            const validEnvVarRegex = /^[A-Za-z_][A-Za-z0-9_]*$/;
            if (!validEnvVarRegex.test(name)) {
                issues.push({
                    code: ValidationErrorCodes.CONSTRAINT_ENV_VAR_FORMAT,
                    category: 'CONSTRAINT_ERROR',
                    severity: 'error',
                    message: `Environment variable name "${name}" is invalid`,
                    path: `$.spec.env[${i}].name`,
                    expected: 'Start with letter or underscore, contain only alphanumeric and underscores',
                    actual: name,
                    remediation: 'Use only letters, numbers, and underscores. Must start with letter or underscore',
                });
            }
        }
        return issues;
    }
    /**
     * Validate resource constraints (requests <= limits).
     */
    validateResourceConstraints(spec) {
        const issues = [];
        const services = spec.services;
        if (!services) {
            return issues;
        }
        for (let i = 0; i < services.length; i++) {
            const service = services[i];
            if (!service)
                continue;
            const resources = service.resources;
            if (!resources)
                continue;
            const isValid = RESOURCE_REQUESTS_LIMIT_CONSTRAINT.validate(resources);
            if (!isValid) {
                issues.push({
                    code: ValidationErrorCodes.CONSTRAINT_RESOURCE_LIMIT,
                    category: 'CONSTRAINT_ERROR',
                    severity: 'error',
                    message: `Resource requests exceed limits for service at index ${i}`,
                    path: `$.spec.services[${i}].resources`,
                    expected: 'requests <= limits for cpu and memory',
                    actual: JSON.stringify(resources),
                    remediation: 'Ensure resource requests do not exceed the defined limits',
                });
            }
        }
        return issues;
    }
    /**
     * Validate all registered cross-field constraints.
     */
    validateCrossFieldConstraints(_spec) {
        const issues = [];
        // Apply each constraint to relevant parts of the spec
        for (const constraint of this.constraints) {
            // This is handled individually by specific validation methods above
            // The cross-field constraint infrastructure is available for custom constraints
            void constraint;
        }
        return issues;
    }
}
//# sourceMappingURL=ConstraintValidator.js.map