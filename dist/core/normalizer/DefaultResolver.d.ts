/**
 * DefaultResolver Module
 *
 * Applies default values to ValidatedIntent in a deterministic order.
 * All defaults are defined centrally to ensure consistency and traceability.
 *
 * Key principles:
 * - Defaults come ONLY from intent schema, not exporter preferences
 * - Applied in deterministic order (alphabetical by path)
 * - Records all applied defaults for audit trail
 *
 * @module core/normalizer/DefaultResolver
 */
import { AppliedDefault, EnvVar, Port, ResourceSpec, Secret, ValidatedIntent } from './types.js';
/**
 * Options for default resolution
 */
export interface DefaultResolverOptions {
    /**
     * Whether to record applied defaults for audit
     * @default true
     */
    readonly recordAppliedDefaults?: boolean;
    /**
     * Custom default values to merge with schema defaults
     */
    readonly customDefaults?: Record<string, unknown>;
    /**
     * Strict mode - fail if required field is missing even after defaults
     * @default true
     */
    readonly strict?: boolean;
}
/**
 * Result of default resolution
 */
export interface DefaultResolutionResult {
    /**
     * The intent with defaults applied
     */
    readonly intent: ValidatedIntent;
    /**
     * List of defaults that were applied
     */
    readonly appliedDefaults: readonly AppliedDefault[];
}
/**
 * Default value definition
 */
interface DefaultDefinition {
    readonly path: string;
    readonly value: unknown;
    readonly condition?: (intent: ValidatedIntent) => boolean;
}
/**
 * Apply default values to a validated intent
 *
 * @param intent - The validated intent to apply defaults to
 * @param options - Default resolution options
 * @returns The intent with defaults applied and audit trail
 */
export declare function applyDefaults(intent: ValidatedIntent, options?: DefaultResolverOptions): DefaultResolutionResult;
/**
 * Get the list of all defined defaults
 * Useful for documentation and testing
 */
export declare function getDefaultDefinitions(): readonly DefaultDefinition[];
/**
 * Check if a field has a default value defined
 */
export declare function hasDefault(path: string): boolean;
/**
 * Get the default value for a field
 */
export declare function getDefault(path: string): unknown;
/**
 * Apply defaults to environment variables
 * Ensures consistent structure
 */
export declare function normalizeEnvVars(envVars: readonly EnvVar[]): readonly EnvVar[];
/**
 * Apply defaults to ports
 * Ensures protocol is set
 */
export declare function normalizePorts(ports: readonly Port[]): readonly Port[];
/**
 * Apply defaults to secrets
 */
export declare function normalizeSecrets(secrets: readonly Secret[]): readonly Secret[];
/**
 * Apply defaults to resource spec
 */
export declare function normalizeResources(resources: Partial<ResourceSpec> | undefined): ResourceSpec;
export {};
//# sourceMappingURL=DefaultResolver.d.ts.map