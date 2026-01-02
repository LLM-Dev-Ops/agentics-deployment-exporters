/**
 * RefExpander Module
 *
 * Expands all $ref references in a ValidatedIntent to inline values.
 * Handles circular reference detection and rejection.
 *
 * Key principles:
 * - All references are resolved to their concrete values
 * - Circular references are detected and rejected
 * - Deterministic expansion order (alphabetical by reference path)
 * - Pure function with no side effects
 *
 * @module core/normalizer/RefExpander
 */
import { isArray, isPlainObject, isResourceReference, NormalizationError, } from './types.js';
/**
 * Expand all $ref references in a validated intent
 *
 * @param intent - The validated intent with potential references
 * @param options - Expansion options
 * @returns The intent with all references expanded inline
 */
export function expandReferences(intent, options = {}) {
    const { maxDepth = 100, failOnUnresolved = true, trackResolved = true, } = options;
    // Build definition registry from intent.definitions
    const definitions = buildDefinitionRegistry(intent);
    const resolvedRefs = [];
    const unresolvedRefs = [];
    // Expand the entire intent
    const expanded = expandValue(intent, definitions, new Set(), 0, maxDepth, resolvedRefs, unresolvedRefs, trackResolved);
    // Check for unresolved references
    if (failOnUnresolved && unresolvedRefs.length > 0) {
        throw new NormalizationError(`Unresolved references: ${unresolvedRefs.join(', ')}`, 'UNRESOLVED_REFERENCE');
    }
    // Sort for determinism
    resolvedRefs.sort((a, b) => a.localeCompare(b, 'en'));
    unresolvedRefs.sort((a, b) => a.localeCompare(b, 'en'));
    return {
        intent: expanded,
        resolvedRefs,
        unresolvedRefs,
    };
}
/**
 * Build a registry of definitions from the intent
 */
function buildDefinitionRegistry(intent) {
    const registry = new Map();
    // Add definitions from the definitions section
    if (intent.definitions && isPlainObject(intent.definitions)) {
        for (const [key, value] of Object.entries(intent.definitions)) {
            // Support both full path and short name
            registry.set(`#/definitions/${key}`, value);
            registry.set(key, value);
        }
    }
    // Add spec sections as potential reference targets
    if (intent.spec && isPlainObject(intent.spec)) {
        for (const [key, value] of Object.entries(intent.spec)) {
            registry.set(`#/spec/${key}`, value);
        }
    }
    // Add resources by name if they exist
    if (intent.spec?.resources && isArray(intent.spec.resources)) {
        for (const resource of intent.spec.resources) {
            if (isPlainObject(resource) && 'name' in resource) {
                const name = String(resource.name);
                registry.set(`#/resources/${name}`, resource);
                registry.set(name, resource);
            }
        }
    }
    // Add secrets by name if they exist
    if (intent.spec?.secrets && isArray(intent.spec.secrets)) {
        for (const secret of intent.spec.secrets) {
            if (isPlainObject(secret) && 'name' in secret) {
                const name = String(secret.name);
                registry.set(`#/secrets/${name}`, secret);
            }
        }
    }
    return registry;
}
/**
 * Recursively expand references in a value
 */
function expandValue(value, definitions, visited, depth, maxDepth, resolvedRefs, unresolvedRefs, trackResolved) {
    // Check depth limit
    if (depth > maxDepth) {
        throw new NormalizationError(`Maximum reference expansion depth (${maxDepth}) exceeded`, 'CIRCULAR_REFERENCE');
    }
    // Handle null/undefined
    if (value === null || value === undefined) {
        return value;
    }
    // Handle primitives
    if (typeof value !== 'object') {
        return value;
    }
    // Handle references
    if (isResourceReference(value)) {
        return expandReference(value, definitions, visited, depth, maxDepth, resolvedRefs, unresolvedRefs, trackResolved);
    }
    // Handle arrays
    if (isArray(value)) {
        return value.map((item) => expandValue(item, definitions, visited, depth + 1, maxDepth, resolvedRefs, unresolvedRefs, trackResolved));
    }
    // Handle objects
    if (isPlainObject(value)) {
        const result = {};
        // Sort keys for determinism
        const keys = Object.keys(value).sort((a, b) => a.localeCompare(b, 'en'));
        for (const key of keys) {
            result[key] = expandValue(value[key], definitions, visited, depth + 1, maxDepth, resolvedRefs, unresolvedRefs, trackResolved);
        }
        return result;
    }
    return value;
}
/**
 * Expand a single reference
 */
function expandReference(ref, definitions, visited, depth, maxDepth, resolvedRefs, unresolvedRefs, trackResolved) {
    const refPath = ref.$ref;
    // Validate reference format
    if (!isValidRefFormat(refPath)) {
        throw new NormalizationError(`Invalid reference format: ${refPath}`, 'INVALID_REFERENCE_FORMAT');
    }
    // Check for circular reference
    if (visited.has(refPath)) {
        throw new NormalizationError(`Circular reference detected: ${refPath}`, 'CIRCULAR_REFERENCE', refPath);
    }
    // Look up the reference
    const resolved = resolveReference(refPath, definitions);
    if (resolved === undefined) {
        unresolvedRefs.push(refPath);
        return ref; // Return original reference if not found
    }
    // Track resolution
    if (trackResolved) {
        resolvedRefs.push(refPath);
    }
    // Add to visited set for cycle detection
    visited.add(refPath);
    try {
        // Recursively expand the resolved value
        return expandValue(resolved, definitions, visited, depth + 1, maxDepth, resolvedRefs, unresolvedRefs, trackResolved);
    }
    finally {
        // Remove from visited set after processing
        visited.delete(refPath);
    }
}
/**
 * Resolve a reference path to its value
 */
function resolveReference(refPath, definitions) {
    // Try exact match first
    if (definitions.has(refPath)) {
        return definitions.get(refPath);
    }
    // Try without leading #
    const withoutHash = refPath.replace(/^#\/?/, '');
    if (definitions.has(withoutHash)) {
        return definitions.get(withoutHash);
    }
    // Try just the last segment
    const segments = refPath.split('/');
    const lastSegment = segments[segments.length - 1];
    if (lastSegment && definitions.has(lastSegment)) {
        return definitions.get(lastSegment);
    }
    return undefined;
}
/**
 * Validate reference format
 */
function isValidRefFormat(ref) {
    // Allow various reference formats:
    // - #/definitions/name
    // - #/resources/name
    // - definitions/name
    // - name (short form)
    if (!ref || typeof ref !== 'string') {
        return false;
    }
    // Must not be empty
    if (ref.trim() === '') {
        return false;
    }
    // Must not contain dangerous patterns
    const dangerousPatterns = ['..', '//', '\\', '\n', '\r'];
    for (const pattern of dangerousPatterns) {
        if (ref.includes(pattern)) {
            return false;
        }
    }
    return true;
}
/**
 * Check if a value contains any references
 */
export function hasReferences(value) {
    if (value === null || value === undefined) {
        return false;
    }
    if (isResourceReference(value)) {
        return true;
    }
    if (isArray(value)) {
        return value.some(hasReferences);
    }
    if (isPlainObject(value)) {
        return Object.values(value).some(hasReferences);
    }
    return false;
}
/**
 * Find all references in a value
 */
export function findReferences(value) {
    const refs = [];
    collectReferences(value, refs);
    return refs.sort((a, b) => a.localeCompare(b, 'en'));
}
/**
 * Recursively collect all references
 */
function collectReferences(value, refs) {
    if (value === null || value === undefined) {
        return;
    }
    if (isResourceReference(value)) {
        refs.push(value.$ref);
        return;
    }
    if (isArray(value)) {
        for (const item of value) {
            collectReferences(item, refs);
        }
        return;
    }
    if (isPlainObject(value)) {
        for (const v of Object.values(value)) {
            collectReferences(v, refs);
        }
    }
}
/**
 * Validate that all references can be resolved
 */
export function validateReferences(intent) {
    const definitions = buildDefinitionRegistry(intent);
    const refs = findReferences(intent);
    const resolvedRefs = [];
    let hasCircularRef = false;
    let circularRefPath;
    for (const ref of refs) {
        const resolved = resolveReference(ref, definitions);
        if (resolved !== undefined) {
            resolvedRefs.push(ref);
        }
    }
    // Check for circular references using a simple traversal
    const visited = new Set();
    function checkCircular(refPath) {
        if (visited.has(refPath)) {
            hasCircularRef = true;
            circularRefPath = refPath;
            return true;
        }
        visited.add(refPath);
        const resolved = resolveReference(refPath, definitions);
        if (resolved && isPlainObject(resolved)) {
            const nestedRefs = findReferences(resolved);
            for (const nestedRef of nestedRefs) {
                if (checkCircular(nestedRef)) {
                    return true;
                }
            }
        }
        visited.delete(refPath);
        return false;
    }
    for (const ref of refs) {
        if (checkCircular(ref)) {
            break;
        }
    }
    const result = {
        value: intent,
        resolvedRefs,
        hasCircularRef,
    };
    if (circularRefPath !== undefined) {
        return { ...result, circularRefPath };
    }
    return result;
}
/**
 * Create a reference object
 */
export function createRef(path) {
    return { $ref: path };
}
/**
 * Get the target path from a reference
 */
export function getRefPath(ref) {
    return ref.$ref;
}
//# sourceMappingURL=RefExpander.js.map