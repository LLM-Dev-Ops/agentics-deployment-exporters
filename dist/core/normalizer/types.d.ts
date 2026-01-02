/**
 * IntentNormalizer Types
 *
 * Type definitions for the normalization module.
 * This module transforms ValidatedIntent to canonical NormalizedIntent form.
 *
 * @module core/normalizer/types
 */
/**
 * Semantic version string following semver format
 */
export type SemanticVersion = `${number}.${number}.${number}`;
/**
 * Supported API versions for the DeploymentIntent
 */
export type ApiVersion = 'agentics.io/v1alpha1' | 'agentics.io/v1beta1' | 'agentics.io/v1';
/**
 * Resource reference using $ref syntax
 */
export interface ResourceReference {
    readonly $ref: string;
}
/**
 * Resource definition for the intent
 */
export interface Resource {
    readonly type: string;
    readonly name: string;
    readonly properties?: Record<string, unknown>;
    readonly dependsOn?: readonly string[];
    readonly metadata?: Record<string, unknown>;
}
/**
 * Environment variable definition
 */
export interface EnvVar {
    readonly name: string;
    readonly value?: string;
    readonly valueFrom?: {
        readonly secretKeyRef?: {
            readonly name: string;
            readonly key: string;
        };
        readonly configMapKeyRef?: {
            readonly name: string;
            readonly key: string;
        };
    };
}
/**
 * Port definition
 */
export interface Port {
    readonly name?: string;
    readonly containerPort: number;
    readonly protocol?: 'TCP' | 'UDP';
}
/**
 * Resource requirements (CPU, memory)
 */
export interface ResourceRequirements {
    readonly cpu: string;
    readonly memory: string;
}
/**
 * Resource limits and requests
 */
export interface ResourceSpec {
    readonly limits: ResourceRequirements;
    readonly requests: ResourceRequirements;
}
/**
 * Secret definition
 */
export interface Secret {
    readonly name: string;
    readonly type?: string;
    readonly data?: Record<string, string>;
}
/**
 * Intent metadata
 */
export interface IntentMetadata {
    readonly name: string;
    readonly version?: string;
    readonly namespace?: string;
    readonly labels?: Record<string, string>;
    readonly annotations?: Record<string, string>;
    readonly createdAt?: string;
}
/**
 * Intent specification
 */
export interface IntentSpec {
    readonly replicas?: number;
    readonly image?: string;
    readonly resources?: ResourceSpec;
    readonly env?: readonly EnvVar[];
    readonly ports?: readonly Port[];
    readonly secrets?: readonly Secret[];
    readonly dependsOn?: readonly string[];
    readonly [key: string]: unknown;
}
/**
 * Validated intent structure from the validator phase
 */
export interface ValidatedIntent {
    readonly apiVersion: ApiVersion;
    readonly kind: string;
    readonly metadata: IntentMetadata;
    readonly spec: IntentSpec;
    readonly definitions?: Record<string, unknown>;
    readonly extensions?: Record<string, unknown>;
}
/**
 * Normalized intent with canonical form
 */
export interface NormalizedIntent {
    readonly apiVersion: ApiVersion;
    readonly kind: string;
    readonly metadata: NormalizedMetadata;
    readonly spec: NormalizedSpec;
    readonly _normalization: NormalizationMetadata;
}
/**
 * Normalized metadata with all fields resolved
 */
export interface NormalizedMetadata {
    readonly name: string;
    readonly version: string;
    readonly namespace: string;
    readonly labels: Record<string, string>;
    readonly annotations: Record<string, string>;
    readonly createdAt: string;
}
/**
 * Normalized spec with all defaults applied
 */
export interface NormalizedSpec {
    readonly replicas: number;
    readonly image: string;
    readonly resources: ResourceSpec;
    readonly env: readonly EnvVar[];
    readonly ports: readonly Port[];
    readonly secrets: readonly Secret[];
    readonly dependsOn: readonly string[];
    readonly [key: string]: unknown;
}
/**
 * Options for normalization process
 */
export interface NormalizationOptions {
    /**
     * Whether to expand all $ref references inline
     * @default true
     */
    readonly expandReferences?: boolean;
    /**
     * Whether to apply default values
     * @default true
     */
    readonly applyDefaults?: boolean;
    /**
     * Whether to canonicalize structure (sort keys, etc.)
     * @default true
     */
    readonly canonicalize?: boolean;
    /**
     * Whether to preserve original values in metadata
     * @default true
     */
    readonly preserveOriginal?: boolean;
    /**
     * Strict mode - fail on any ambiguity
     * @default false
     */
    readonly strict?: boolean;
}
/**
 * Metadata about the normalization process
 */
export interface NormalizationMetadata {
    /**
     * Version of the normalizer
     */
    readonly normalizerVersion: SemanticVersion;
    /**
     * Timestamp when normalization occurred (ISO 8601)
     */
    readonly normalizedAt: string;
    /**
     * Hash of the original input
     */
    readonly originalHash: string;
    /**
     * Hash of the normalized output
     */
    readonly normalizedHash: string;
    /**
     * References that were expanded
     */
    readonly expandedReferences: readonly string[];
    /**
     * Defaults that were applied
     */
    readonly appliedDefaults: readonly AppliedDefault[];
    /**
     * Transformations applied during normalization
     */
    readonly transformations: readonly TransformationRecord[];
}
/**
 * Record of a default value that was applied
 */
export interface AppliedDefault {
    /**
     * JSONPath to the field
     */
    readonly path: string;
    /**
     * Default value that was applied
     */
    readonly value: unknown;
    /**
     * Source of the default (schema, exporter, etc.)
     */
    readonly source: 'schema' | 'spec';
}
/**
 * Record of a transformation applied during normalization
 */
export interface TransformationRecord {
    /**
     * Type of transformation
     */
    readonly type: TransformationType;
    /**
     * JSONPath to the affected field
     */
    readonly path: string;
    /**
     * Value before transformation
     */
    readonly before?: unknown;
    /**
     * Value after transformation
     */
    readonly after: unknown;
}
/**
 * Types of transformations applied during normalization
 */
export type TransformationType = 'default_applied' | 'reference_expanded' | 'alias_resolved' | 'format_canonicalized' | 'version_normalized';
/**
 * Error thrown during normalization
 */
export declare class NormalizationError extends Error {
    readonly code: NormalizationErrorCode;
    readonly path?: string | undefined;
    readonly cause?: Error | undefined;
    constructor(message: string, code: NormalizationErrorCode, path?: string | undefined, cause?: Error | undefined);
}
/**
 * Error codes for normalization failures
 */
export type NormalizationErrorCode = 'CIRCULAR_REFERENCE' | 'UNRESOLVED_REFERENCE' | 'INVALID_REFERENCE_FORMAT' | 'MISSING_REQUIRED_FIELD' | 'TYPE_MISMATCH' | 'CANONICALIZATION_FAILED' | 'DETERMINISM_VIOLATION';
/**
 * Result of reference expansion
 */
export interface RefExpansionResult {
    /**
     * The expanded value
     */
    readonly value: unknown;
    /**
     * List of references that were resolved
     */
    readonly resolvedRefs: readonly string[];
    /**
     * Whether any circular references were detected
     */
    readonly hasCircularRef: boolean;
    /**
     * Path of circular reference if detected
     */
    readonly circularRefPath?: string;
}
/**
 * Interface for topological sorting of resources
 */
export interface DependencyNode {
    readonly id: string;
    readonly dependsOn: readonly string[];
}
/**
 * UUID namespace for deterministic UUID generation
 * Using a fixed namespace for agentics deployment exports
 */
export declare const UUID_NAMESPACE_AGENTICS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
/**
 * Default values for normalization
 */
export declare const DEFAULT_VALUES: {
    readonly replicas: 1;
    readonly namespace: "default";
    readonly version: "1.0.0";
    readonly protocol: "TCP";
    readonly resources: {
        readonly limits: {
            readonly cpu: "1000m";
            readonly memory: "512Mi";
        };
        readonly requests: {
            readonly cpu: "100m";
            readonly memory: "128Mi";
        };
    };
};
/**
 * Type guard to check if a value is a ResourceReference
 */
export declare function isResourceReference(value: unknown): value is ResourceReference;
/**
 * Type guard to check if a value is a plain object
 */
export declare function isPlainObject(value: unknown): value is Record<string, unknown>;
/**
 * Type guard to check if a value is an array
 */
export declare function isArray(value: unknown): value is readonly unknown[];
//# sourceMappingURL=types.d.ts.map