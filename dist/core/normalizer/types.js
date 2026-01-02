/**
 * IntentNormalizer Types
 *
 * Type definitions for the normalization module.
 * This module transforms ValidatedIntent to canonical NormalizedIntent form.
 *
 * @module core/normalizer/types
 */
/**
 * Error thrown during normalization
 */
export class NormalizationError extends Error {
    code;
    path;
    cause;
    constructor(message, code, path, cause) {
        super(message);
        this.code = code;
        this.path = path;
        this.cause = cause;
        this.name = 'NormalizationError';
    }
}
/**
 * UUID namespace for deterministic UUID generation
 * Using a fixed namespace for agentics deployment exports
 */
export const UUID_NAMESPACE_AGENTICS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
/**
 * Default values for normalization
 */
export const DEFAULT_VALUES = {
    replicas: 1,
    namespace: 'default',
    version: '1.0.0',
    protocol: 'TCP',
    resources: {
        limits: {
            cpu: '1000m',
            memory: '512Mi',
        },
        requests: {
            cpu: '100m',
            memory: '128Mi',
        },
    },
};
/**
 * Type guard to check if a value is a ResourceReference
 */
export function isResourceReference(value) {
    return (typeof value === 'object' &&
        value !== null &&
        '$ref' in value &&
        typeof value.$ref === 'string');
}
/**
 * Type guard to check if a value is a plain object
 */
export function isPlainObject(value) {
    return (typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
/**
 * Type guard to check if a value is an array
 */
export function isArray(value) {
    return Array.isArray(value);
}
//# sourceMappingURL=types.js.map