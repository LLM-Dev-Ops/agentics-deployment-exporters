/**
 * Serializers Module
 *
 * This module provides the main entry point for all serializer functionality.
 * It exports the SerializerRegistry, factory functions, and all serializer types.
 *
 * All serializers are:
 * - Pure functions (no side effects)
 * - Deterministic (same input = same output)
 * - Stateless (no instance variables affecting output)
 * - Synchronous (no async operations)
 *
 * @module serializers
 * @version 1.0.0
 */
// =============================================================================
// RE-EXPORTS
// =============================================================================
// Base types and utilities
export * from './base/index.js';
// HCL serializer
export * from './hcl/index.js';
// YAML serializer
export * from './yaml/index.js';
// JSON serializer
export * from './json/index.js';
// SQL serializer
export * from './sql/index.js';
import { createInvalidResult, } from './base/types.js';
import { HCLSerializer, createHCLSerializer } from './hcl/HCLSerializer.js';
import { YAMLSerializer, createYAMLSerializer } from './yaml/YAMLSerializer.js';
import { JSONSerializer, createJSONSerializer } from './json/JSONSerializer.js';
import { SQLSerializer, createSQLSerializer } from './sql/SQLSerializer.js';
// =============================================================================
// SERIALIZER REGISTRY
// =============================================================================
/**
 * Registry for managing serializer instances.
 *
 * The registry provides a centralized way to access serializers by ID or format.
 * It ensures only one instance of each serializer is created (singleton pattern).
 *
 * @example
 * ```typescript
 * const registry = SerializerRegistry.getInstance();
 *
 * // Get serializer by format
 * const yamlSerializer = registry.getByFormat('yaml');
 *
 * // Serialize data
 * const yaml = yamlSerializer?.serialize({ key: 'value' });
 *
 * // Or use the factory directly
 * const json = createJSONSerializer().serialize({ key: 'value' });
 * ```
 */
export class SerializerRegistry {
    static instance = null;
    serializers;
    formatMap;
    constructor() {
        this.serializers = new Map();
        this.formatMap = new Map();
        this.registerDefaults();
    }
    /**
     * Get the singleton registry instance.
     */
    static getInstance() {
        if (!SerializerRegistry.instance) {
            SerializerRegistry.instance = new SerializerRegistry();
        }
        return SerializerRegistry.instance;
    }
    /**
     * Reset the registry (for testing).
     */
    static reset() {
        SerializerRegistry.instance = null;
    }
    /**
     * Register default serializers.
     */
    registerDefaults() {
        this.register(createHCLSerializer());
        this.register(createYAMLSerializer());
        this.register(createJSONSerializer());
        this.register(createSQLSerializer());
    }
    /**
     * Register a serializer.
     *
     * @param serializer - Serializer to register
     * @throws Error if serializer with same ID already registered
     */
    register(serializer) {
        if (this.serializers.has(serializer.id)) {
            throw new Error(`Serializer with ID '${serializer.id}' already registered`);
        }
        this.serializers.set(serializer.id, serializer);
        this.formatMap.set(serializer.format, serializer.id);
    }
    /**
     * Get serializer by ID.
     *
     * @param id - Serializer ID
     * @returns Serializer or undefined if not found
     */
    get(id) {
        return this.serializers.get(id);
    }
    /**
     * Get serializer by format type.
     *
     * @param format - Serializer format
     * @returns Serializer or undefined if not found
     */
    getByFormat(format) {
        const id = this.formatMap.get(format);
        return id ? this.serializers.get(id) : undefined;
    }
    /**
     * List all registered serializers.
     *
     * @returns Array of registered serializers (sorted by ID for determinism)
     */
    list() {
        const serializers = Array.from(this.serializers.values());
        return serializers.sort((a, b) => a.id.localeCompare(b.id, 'en', { sensitivity: 'base' }));
    }
    /**
     * Check if a serializer is registered.
     *
     * @param id - Serializer ID
     * @returns true if registered
     */
    has(id) {
        return this.serializers.has(id);
    }
    /**
     * Check if a format has a registered serializer.
     *
     * @param format - Format to check
     * @returns true if a serializer is registered for this format
     */
    hasFormat(format) {
        return this.formatMap.has(format);
    }
    /**
     * Unregister a serializer.
     *
     * @param id - Serializer ID to remove
     * @returns true if serializer was removed
     */
    unregister(id) {
        const serializer = this.serializers.get(id);
        if (!serializer) {
            return false;
        }
        this.serializers.delete(id);
        this.formatMap.delete(serializer.format);
        return true;
    }
}
// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================
/**
 * Get a serializer for the given format.
 *
 * @param format - Target format
 * @returns Serializer instance
 * @throws Error if no serializer registered for format
 */
export function getSerializer(format) {
    const registry = SerializerRegistry.getInstance();
    const serializer = registry.getByFormat(format);
    if (!serializer) {
        throw new Error(`No serializer registered for format: ${format}`);
    }
    return serializer;
}
/**
 * Serialize data to the specified format.
 *
 * @param data - Data to serialize
 * @param format - Target format
 * @param options - Serialization options
 * @returns Serialized string
 * @throws Error if serialization fails
 */
export function serialize(data, format, options) {
    const serializer = getSerializer(format);
    return serializer.serialize(data, options);
}
/**
 * Deserialize string to structured data.
 *
 * @param text - Text to parse
 * @param format - Source format
 * @returns Parsed data
 * @throws Error if parsing fails
 */
export function deserialize(text, format) {
    const serializer = getSerializer(format);
    return serializer.deserialize(text);
}
/**
 * Validate content for the specified format.
 *
 * @param text - Content to validate
 * @param format - Expected format
 * @returns Validation result
 */
export function validate(text, format) {
    try {
        const serializer = getSerializer(format);
        return serializer.validate(text);
    }
    catch (error) {
        return createInvalidResult([
            {
                code: 'E4001',
                message: error instanceof Error ? error.message : String(error),
            },
        ]);
    }
}
/**
 * Reformat content for consistency.
 *
 * @param text - Content to reformat
 * @param format - Content format
 * @param options - Formatting options
 * @returns Reformatted content
 * @throws Error if reformatting fails
 */
export function reformat(text, format, options) {
    const serializer = getSerializer(format);
    return serializer.reformat(text, options);
}
// =============================================================================
// TYPE-SAFE FACTORY FUNCTIONS
// =============================================================================
/**
 * Factory functions for creating serializer instances.
 */
export const Serializers = {
    /**
     * Create an HCL serializer.
     */
    hcl: createHCLSerializer,
    /**
     * Create a YAML serializer.
     */
    yaml: createYAMLSerializer,
    /**
     * Create a JSON serializer.
     */
    json: createJSONSerializer,
    /**
     * Create a SQL serializer.
     */
    sql: createSQLSerializer,
    /**
     * Create a serializer for the specified format.
     */
    create(format) {
        switch (format) {
            case 'hcl':
                return createHCLSerializer();
            case 'yaml':
                return createYAMLSerializer();
            case 'json':
                return createJSONSerializer();
            case 'sql':
                return createSQLSerializer();
            default:
                throw new Error(`Unknown serializer format: ${format}`);
        }
    },
};
// =============================================================================
// SERIALIZER CLASSES EXPORT (for type checking)
// =============================================================================
export { HCLSerializer, YAMLSerializer, JSONSerializer, SQLSerializer, };
//# sourceMappingURL=index.js.map