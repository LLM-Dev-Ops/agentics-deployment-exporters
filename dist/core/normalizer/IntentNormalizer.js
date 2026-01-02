/**
 * IntentNormalizer Module
 *
 * Main normalization module that transforms ValidatedIntent to NormalizedIntent.
 * Applies transformations in strict order to ensure determinism.
 *
 * TRANSFORMATIONS (in order):
 * 1. Default application
 * 2. Reference expansion (resolve all $ref)
 * 3. Alias resolution
 * 4. Format canonicalization
 * 5. Version normalization
 *
 * GUARANTEES:
 * - Idempotent: normalize(normalize(x)) === normalize(x)
 * - Deterministic: same input always produces same output
 * - Reversible: original can be reconstructed with metadata
 *
 * @module core/normalizer/IntentNormalizer
 */
import { createHash } from 'crypto';
import { v5 as uuidv5 } from 'uuid';
import { canonicalize, canonicalEquals, computeCanonicalString, } from './Canonicalizer.js';
import { applyDefaults, normalizeEnvVars, normalizePorts, normalizeResources, normalizeSecrets, } from './DefaultResolver.js';
import { expandReferences } from './RefExpander.js';
import { isArray, isPlainObject, UUID_NAMESPACE_AGENTICS, } from './types.js';
/**
 * Normalizer version for tracking
 */
const NORMALIZER_VERSION = '1.0.0';
/**
 * Alias definitions for field name normalization
 * Maps alternative names to canonical names
 */
const FIELD_ALIASES = {
    // Container-related aliases
    containerImage: 'image',
    dockerImage: 'image',
    imageName: 'image',
    // Replica-related aliases
    instances: 'replicas',
    scale: 'replicas',
    count: 'replicas',
    // Resource-related aliases
    limits: 'resources.limits',
    requests: 'resources.requests',
    cpu: 'resources.requests.cpu',
    memory: 'resources.requests.memory',
    // Environment-related aliases
    environment: 'env',
    envVars: 'env',
    environmentVariables: 'env',
    // Dependency-related aliases
    dependencies: 'dependsOn',
    requires: 'dependsOn',
    // Namespace-related aliases
    ns: 'namespace',
};
/**
 * Normalize a validated intent to canonical form
 *
 * This is the main entry point for normalization.
 * It applies all transformations in strict order.
 *
 * @param intent - The validated intent to normalize
 * @param options - Normalization options
 * @returns The normalized intent with metadata
 */
export function normalize(intent, options = {}) {
    const { expandReferences: shouldExpandRefs = true, applyDefaults: shouldApplyDefaults = true, canonicalize: shouldCanonicalize = true, preserveOriginal = true, strict = false, } = options;
    // Compute hash of original for traceability
    const originalHash = computeIntentHash(intent);
    const transformations = [];
    const expandedReferences = [];
    let appliedDefaults = [];
    // Start with a deep clone to avoid mutation
    let current = deepClone(intent);
    // Step 1: Apply defaults
    if (shouldApplyDefaults) {
        const defaultResult = applyDefaults(current, {
            recordAppliedDefaults: true,
            strict,
        });
        current = defaultResult.intent;
        appliedDefaults = defaultResult.appliedDefaults;
        for (const def of defaultResult.appliedDefaults) {
            transformations.push({
                type: 'default_applied',
                path: def.path,
                before: undefined,
                after: def.value,
            });
        }
    }
    // Step 2: Expand references
    if (shouldExpandRefs) {
        const refResult = expandReferences(current, {
            failOnUnresolved: strict,
            trackResolved: true,
        });
        current = refResult.intent;
        for (const ref of refResult.resolvedRefs) {
            expandedReferences.push(ref);
            transformations.push({
                type: 'reference_expanded',
                path: ref,
                after: '(expanded)',
            });
        }
    }
    // Step 3: Resolve aliases
    current = resolveAliases(current, transformations);
    // Step 4: Canonicalize structure
    if (shouldCanonicalize) {
        current = canonicalize(current);
        transformations.push({
            type: 'format_canonicalized',
            path: '$',
            after: '(canonicalized)',
        });
    }
    // Step 5: Normalize version
    current = normalizeVersion(current, transformations);
    // Build normalized metadata
    const normalizedMetadata = buildNormalizedMetadata(current.metadata);
    // Build normalized spec
    const normalizedSpec = buildNormalizedSpec(current.spec);
    // Compute hash of normalized output
    const normalizedIntent = {
        apiVersion: current.apiVersion,
        kind: current.kind,
        metadata: normalizedMetadata,
        spec: normalizedSpec,
    };
    const normalizedHash = computeIntentHash(normalizedIntent);
    // Build normalization metadata
    const normalizationMetadata = {
        normalizerVersion: NORMALIZER_VERSION,
        normalizedAt: preserveOriginal
            ? new Date().toISOString()
            : '1970-01-01T00:00:00.000Z',
        originalHash,
        normalizedHash,
        expandedReferences,
        appliedDefaults,
        transformations,
    };
    return {
        ...normalizedIntent,
        _normalization: normalizationMetadata,
    };
}
/**
 * Verify that normalization is idempotent
 *
 * @param intent - The normalized intent to verify
 * @returns True if normalizing again produces the same result
 */
export function verifyIdempotent(intent) {
    // Remove normalization metadata before re-normalizing
    const { _normalization, ...rest } = intent;
    const reNormalized = normalize(rest, {
        preserveOriginal: false,
    });
    // Compare without normalization metadata
    const { _normalization: _, ...reNormalizedRest } = reNormalized;
    return canonicalEquals(rest, reNormalizedRest);
}
/**
 * Resolve field aliases to canonical names
 */
function resolveAliases(intent, transformations) {
    const spec = intent.spec;
    const resolvedSpec = {};
    for (const [key, value] of Object.entries(spec)) {
        const canonicalKey = FIELD_ALIASES[key] ?? key;
        if (canonicalKey !== key) {
            transformations.push({
                type: 'alias_resolved',
                path: `$.spec.${key}`,
                before: key,
                after: canonicalKey,
            });
        }
        // Handle nested path aliases like 'resources.limits'
        if (canonicalKey.includes('.')) {
            setNestedValue(resolvedSpec, canonicalKey, value);
        }
        else {
            resolvedSpec[canonicalKey] = value;
        }
    }
    return {
        ...intent,
        spec: resolvedSpec,
    };
}
/**
 * Set a nested value using dot notation path
 */
function setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined) {
            current[part] = {};
        }
        current = current[part];
    }
    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
}
/**
 * Normalize API version format
 */
function normalizeVersion(intent, transformations) {
    const originalVersion = intent.apiVersion;
    let normalizedVersion = originalVersion;
    // Normalize version format
    if (!originalVersion.includes('/')) {
        // Short form like 'v1' -> 'agentics.io/v1'
        normalizedVersion = `agentics.io/${originalVersion}`;
        transformations.push({
            type: 'version_normalized',
            path: '$.apiVersion',
            before: originalVersion,
            after: normalizedVersion,
        });
    }
    return {
        ...intent,
        apiVersion: normalizedVersion,
    };
}
/**
 * Build normalized metadata with all required fields
 */
function buildNormalizedMetadata(metadata) {
    return {
        name: metadata.name,
        version: metadata.version ?? '1.0.0',
        namespace: metadata.namespace ?? 'default',
        labels: sortObjectKeys(metadata.labels ?? {}),
        annotations: sortObjectKeys(metadata.annotations ?? {}),
        createdAt: metadata.createdAt ?? '1970-01-01T00:00:00.000Z',
    };
}
/**
 * Build normalized spec with all fields resolved
 */
function buildNormalizedSpec(spec) {
    const envVars = isArray(spec.env) ? normalizeEnvVars(spec.env) : [];
    const ports = isArray(spec.ports) ? normalizePorts(spec.ports) : [];
    const secrets = isArray(spec.secrets) ? normalizeSecrets(spec.secrets) : [];
    const dependsOn = isArray(spec.dependsOn) ? sortStringArray(spec.dependsOn) : [];
    // Collect remaining fields
    const baseFields = ['replicas', 'image', 'resources', 'env', 'ports', 'secrets', 'dependsOn'];
    const additionalFields = {};
    for (const [key, value] of Object.entries(spec)) {
        if (!baseFields.includes(key)) {
            additionalFields[key] = value;
        }
    }
    return {
        replicas: spec.replicas ?? 1,
        image: spec.image ?? '',
        resources: normalizeResources(spec.resources),
        env: envVars,
        ports,
        secrets,
        dependsOn,
        ...sortObjectKeys(additionalFields),
    };
}
/**
 * Sort object keys alphabetically
 */
function sortObjectKeys(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    for (const key of keys) {
        sorted[key] = obj[key];
    }
    return sorted;
}
/**
 * Sort an array of strings
 */
function sortStringArray(arr) {
    return [...arr].sort((a, b) => a.localeCompare(b, 'en'));
}
/**
 * Compute SHA-256 hash of an intent
 */
function computeIntentHash(intent) {
    const canonical = computeCanonicalString(intent);
    return createHash('sha256').update(canonical).digest('hex');
}
/**
 * Generate a deterministic UUID for a resource
 *
 * Uses UUID v5 with the intent hash and resource path
 */
export function generateDeterministicUUID(intentHash, resourcePath) {
    const name = `${intentHash}:${resourcePath.join('/')}`;
    return uuidv5(name, UUID_NAMESPACE_AGENTICS);
}
/**
 * Deep clone a value
 */
function deepClone(value) {
    if (value === null || typeof value !== 'object') {
        return value;
    }
    if (isArray(value)) {
        return value.map(deepClone);
    }
    if (value instanceof Date) {
        return new Date(value.getTime());
    }
    if (isPlainObject(value)) {
        const result = {};
        for (const [k, v] of Object.entries(value)) {
            result[k] = deepClone(v);
        }
        return result;
    }
    return value;
}
/**
 * Create a normalizer with preset options
 */
export function createNormalizer(defaultOptions = {}) {
    return (intent, options = {}) => {
        return normalize(intent, { ...defaultOptions, ...options });
    };
}
/**
 * Validate that an intent is in normalized form
 */
export function isNormalized(intent) {
    if (!isPlainObject(intent)) {
        return false;
    }
    // Check for normalization metadata
    if (!('_normalization' in intent)) {
        return false;
    }
    const meta = intent._normalization;
    if (!isPlainObject(meta)) {
        return false;
    }
    // Check required metadata fields
    const requiredFields = [
        'normalizerVersion',
        'normalizedAt',
        'originalHash',
        'normalizedHash',
    ];
    for (const field of requiredFields) {
        if (!(field in meta)) {
            return false;
        }
    }
    return true;
}
/**
 * Extract the original intent hash from a normalized intent
 */
export function getOriginalHash(intent) {
    return intent._normalization.originalHash;
}
/**
 * Extract the normalized hash from a normalized intent
 */
export function getNormalizedHash(intent) {
    return intent._normalization.normalizedHash;
}
/**
 * Get the list of applied defaults from a normalized intent
 */
export function getAppliedDefaults(intent) {
    return intent._normalization.appliedDefaults;
}
/**
 * Get the list of expanded references from a normalized intent
 */
export function getExpandedReferences(intent) {
    return intent._normalization.expandedReferences;
}
/**
 * Compare two normalized intents for equality (ignoring metadata)
 */
export function normalizedEquals(a, b) {
    const { _normalization: _a, ...restA } = a;
    const { _normalization: _b, ...restB } = b;
    return canonicalEquals(restA, restB);
}
/**
 * Reconstruct the original intent structure (without original values)
 */
export function reconstructOriginal(intent) {
    const { _normalization, ...rest } = intent;
    return {
        apiVersion: rest.apiVersion,
        kind: rest.kind,
        metadata: {
            name: rest.metadata.name,
            version: rest.metadata.version,
            namespace: rest.metadata.namespace,
            labels: rest.metadata.labels,
            annotations: rest.metadata.annotations,
            createdAt: rest.metadata.createdAt,
        },
        spec: { ...rest.spec },
    };
}
//# sourceMappingURL=IntentNormalizer.js.map