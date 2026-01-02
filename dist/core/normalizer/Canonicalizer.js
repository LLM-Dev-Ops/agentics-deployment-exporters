/**
 * Canonicalizer Module
 *
 * Provides deterministic structure canonicalization for intent objects.
 * Ensures byte-for-byte reproducibility through:
 * - Alphabetical key sorting
 * - Stable array ordering (topological for dependencies)
 * - Removal of undefined/null optional fields
 * - Consistent formatting
 *
 * @module core/normalizer/Canonicalizer
 */
import { isArray, isPlainObject, NormalizationError, } from './types.js';
/**
 * Default canonicalization options
 */
const DEFAULT_OPTIONS = {
    sortKeys: true,
    removeUndefined: true,
    removeNull: false,
    topologicalSort: true,
    dependencyFields: ['dependsOn', 'dependencies', 'requires'],
};
/**
 * Canonicalize any value to a deterministic form
 *
 * This function is the core of determinism guarantees:
 * - Same input always produces same output
 * - Output is sorted and normalized
 * - Pure function with no side effects
 *
 * @param obj - The value to canonicalize
 * @param options - Canonicalization options
 * @returns The canonicalized value
 */
export function canonicalize(obj, options = {}) {
    const opts = {
        ...DEFAULT_OPTIONS,
        ...options,
    };
    return canonicalizeValue(obj, opts, new WeakSet());
}
/**
 * Internal canonicalization function with cycle detection
 */
function canonicalizeValue(value, options, seen) {
    // Handle primitives
    if (value === null) {
        return options.removeNull ? undefined : null;
    }
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== 'object') {
        return value;
    }
    // Check for cycles
    if (seen.has(value)) {
        throw new NormalizationError('Circular reference detected during canonicalization', 'CANONICALIZATION_FAILED');
    }
    seen.add(value);
    try {
        if (isArray(value)) {
            return canonicalizeArray(value, options, seen);
        }
        if (isPlainObject(value)) {
            return canonicalizeObject(value, options, seen);
        }
        // Handle Date objects - convert to ISO string
        if (value instanceof Date) {
            return value.toISOString();
        }
        // Handle Map - convert to sorted object
        if (value instanceof Map) {
            const obj = {};
            for (const [k, v] of value) {
                obj[String(k)] = v;
            }
            return canonicalizeObject(obj, options, seen);
        }
        // Handle Set - convert to sorted array
        if (value instanceof Set) {
            return canonicalizeArray([...value], options, seen);
        }
        // For other objects, return as-is
        return value;
    }
    finally {
        seen.delete(value);
    }
}
/**
 * Canonicalize an object with sorted keys
 */
function canonicalizeObject(obj, options, seen) {
    const result = {};
    // Get keys and sort alphabetically if enabled
    let keys = Object.keys(obj);
    if (options.sortKeys) {
        keys = keys.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    }
    for (const key of keys) {
        const value = obj[key];
        // Skip undefined values if configured
        if (value === undefined && options.removeUndefined) {
            continue;
        }
        // Skip null values if configured
        if (value === null && options.removeNull) {
            continue;
        }
        const canonicalValue = canonicalizeValue(value, options, seen);
        // Skip if canonicalization returned undefined
        if (canonicalValue !== undefined) {
            result[key] = canonicalValue;
        }
    }
    return result;
}
/**
 * Canonicalize an array with stable ordering
 */
function canonicalizeArray(arr, options, seen) {
    // First, canonicalize each element
    const canonicalized = arr
        .map((item) => canonicalizeValue(item, options, seen))
        .filter((item) => item !== undefined);
    // Check if this is an array of objects with dependency fields
    if (options.topologicalSort &&
        canonicalized.length > 0 &&
        shouldTopologicallySort(canonicalized, options.dependencyFields)) {
        // Filter out null values and cast to Record<string, unknown>[]
        const objectItems = canonicalized.filter((item) => item !== null && typeof item === 'object' && !Array.isArray(item));
        return topologicalSort(objectItems, options.dependencyFields);
    }
    // For arrays of primitives or objects without dependencies, use stable sort
    return stableSort(canonicalized);
}
/**
 * Check if an array should be topologically sorted
 */
function shouldTopologicallySort(arr, dependencyFields) {
    if (!isArray(arr) || arr.length === 0) {
        return false;
    }
    // Check if items are objects with a name/id and dependency field
    return arr.every((item) => {
        if (!isPlainObject(item)) {
            return false;
        }
        const hasId = 'name' in item || 'id' in item || 'type' in item;
        const hasDeps = dependencyFields.some((field) => field in item);
        return hasId || hasDeps;
    });
}
/**
 * Stable sort for arrays - maintains determinism
 *
 * For objects: sort by canonical key (type/name or id)
 * For primitives: sort by string representation
 */
function stableSort(arr) {
    return [...arr].sort((a, b) => {
        const keyA = getCanonicalKey(a);
        const keyB = getCanonicalKey(b);
        return keyA.localeCompare(keyB, 'en', { sensitivity: 'base' });
    });
}
/**
 * Get a canonical key for sorting
 */
function getCanonicalKey(value) {
    if (value === null) {
        return '\x00null';
    }
    if (value === undefined) {
        return '\x00undefined';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number') {
        // Pad numbers for proper numeric sorting
        return String(value).padStart(20, '0');
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    if (isPlainObject(value)) {
        // Use type/name, name, or id as key
        if ('type' in value && 'name' in value) {
            return `${String(value.type)}/${String(value.name)}`;
        }
        if ('name' in value) {
            return String(value.name);
        }
        if ('id' in value) {
            return String(value.id);
        }
        if ('key' in value) {
            return String(value.key);
        }
        // Fallback to JSON representation
        return JSON.stringify(value);
    }
    if (isArray(value)) {
        return JSON.stringify(value);
    }
    return String(value);
}
/**
 * Topological sort for arrays with dependencies
 *
 * Ensures deterministic ordering where dependencies come before dependents
 */
function topologicalSort(items, dependencyFields) {
    // Build nodes with dependencies
    const nodes = items.map((item) => ({
        id: getNodeId(item),
        dependsOn: getDependencies(item, dependencyFields),
    }));
    // Create a map for O(1) lookup
    const nodeMap = new Map();
    for (const item of items) {
        nodeMap.set(getNodeId(item), item);
    }
    // Kahn's algorithm for topological sort
    const inDegree = new Map();
    const adjacency = new Map();
    // Initialize
    for (const node of nodes) {
        inDegree.set(node.id, 0);
        adjacency.set(node.id, []);
    }
    // Build graph
    for (const node of nodes) {
        for (const dep of node.dependsOn) {
            // Only count dependencies that exist in the array
            if (inDegree.has(dep)) {
                const current = inDegree.get(node.id) ?? 0;
                inDegree.set(node.id, current + 1);
                adjacency.get(dep)?.push(node.id);
            }
        }
    }
    // Find all nodes with no dependencies (in-degree 0)
    // Sort alphabetically for determinism
    const queue = [...inDegree.entries()]
        .filter(([, degree]) => degree === 0)
        .map(([id]) => id)
        .sort((a, b) => a.localeCompare(b, 'en'));
    const result = [];
    const visited = new Set();
    while (queue.length > 0) {
        // Sort queue for determinism at each step
        queue.sort((a, b) => a.localeCompare(b, 'en'));
        const current = queue.shift();
        if (visited.has(current)) {
            continue;
        }
        visited.add(current);
        const item = nodeMap.get(current);
        if (item) {
            result.push(item);
        }
        // Process dependents
        const dependents = adjacency.get(current) ?? [];
        for (const dependent of dependents) {
            const degree = inDegree.get(dependent) ?? 0;
            inDegree.set(dependent, degree - 1);
            if (degree - 1 === 0) {
                queue.push(dependent);
            }
        }
    }
    // Check for cycles
    if (result.length !== items.length) {
        throw new NormalizationError('Circular dependency detected in topological sort', 'CIRCULAR_REFERENCE');
    }
    return result;
}
/**
 * Get a unique identifier for a node
 */
function getNodeId(item) {
    if ('type' in item && 'name' in item) {
        return `${String(item.type)}/${String(item.name)}`;
    }
    if ('name' in item) {
        return String(item.name);
    }
    if ('id' in item) {
        return String(item.id);
    }
    // Fallback - use deterministic hash of content
    return JSON.stringify(item);
}
/**
 * Get dependencies from an item
 */
function getDependencies(item, dependencyFields) {
    for (const field of dependencyFields) {
        if (field in item) {
            const deps = item[field];
            if (isArray(deps)) {
                return deps.filter((d) => typeof d === 'string');
            }
        }
    }
    return [];
}
/**
 * Compute a deterministic hash of a canonical value
 *
 * This produces a stable string representation for comparison
 */
export function computeCanonicalString(value) {
    const canonical = canonicalize(value);
    return JSON.stringify(canonical);
}
/**
 * Check if two values are canonically equal
 */
export function canonicalEquals(a, b) {
    return computeCanonicalString(a) === computeCanonicalString(b);
}
/**
 * Sort object keys recursively (convenience function)
 */
export function sortObjectKeys(obj) {
    return canonicalize(obj, { sortKeys: true });
}
//# sourceMappingURL=Canonicalizer.js.map