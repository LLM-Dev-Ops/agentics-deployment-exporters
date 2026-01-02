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
export * from './base/index.js';
export * from './hcl/index.js';
export * from './yaml/index.js';
export * from './json/index.js';
export * from './sql/index.js';
import type { ISerializer } from '../core/interfaces.js';
import type { SerializerFormat, SerializerId, SerializerOptions, ValidationResult } from './base/types.js';
import { HCLSerializer, createHCLSerializer } from './hcl/HCLSerializer.js';
import { YAMLSerializer, createYAMLSerializer } from './yaml/YAMLSerializer.js';
import { JSONSerializer, createJSONSerializer } from './json/JSONSerializer.js';
import { SQLSerializer, createSQLSerializer } from './sql/SQLSerializer.js';
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
export declare class SerializerRegistry {
    private static instance;
    private readonly serializers;
    private readonly formatMap;
    private constructor();
    /**
     * Get the singleton registry instance.
     */
    static getInstance(): SerializerRegistry;
    /**
     * Reset the registry (for testing).
     */
    static reset(): void;
    /**
     * Register default serializers.
     */
    private registerDefaults;
    /**
     * Register a serializer.
     *
     * @param serializer - Serializer to register
     * @throws Error if serializer with same ID already registered
     */
    register(serializer: ISerializer): void;
    /**
     * Get serializer by ID.
     *
     * @param id - Serializer ID
     * @returns Serializer or undefined if not found
     */
    get(id: SerializerId): ISerializer | undefined;
    /**
     * Get serializer by format type.
     *
     * @param format - Serializer format
     * @returns Serializer or undefined if not found
     */
    getByFormat(format: SerializerFormat): ISerializer | undefined;
    /**
     * List all registered serializers.
     *
     * @returns Array of registered serializers (sorted by ID for determinism)
     */
    list(): readonly ISerializer[];
    /**
     * Check if a serializer is registered.
     *
     * @param id - Serializer ID
     * @returns true if registered
     */
    has(id: SerializerId): boolean;
    /**
     * Check if a format has a registered serializer.
     *
     * @param format - Format to check
     * @returns true if a serializer is registered for this format
     */
    hasFormat(format: SerializerFormat): boolean;
    /**
     * Unregister a serializer.
     *
     * @param id - Serializer ID to remove
     * @returns true if serializer was removed
     */
    unregister(id: SerializerId): boolean;
}
/**
 * Get a serializer for the given format.
 *
 * @param format - Target format
 * @returns Serializer instance
 * @throws Error if no serializer registered for format
 */
export declare function getSerializer(format: SerializerFormat): ISerializer;
/**
 * Serialize data to the specified format.
 *
 * @param data - Data to serialize
 * @param format - Target format
 * @param options - Serialization options
 * @returns Serialized string
 * @throws Error if serialization fails
 */
export declare function serialize(data: unknown, format: SerializerFormat, options?: SerializerOptions): string;
/**
 * Deserialize string to structured data.
 *
 * @param text - Text to parse
 * @param format - Source format
 * @returns Parsed data
 * @throws Error if parsing fails
 */
export declare function deserialize(text: string, format: SerializerFormat): unknown;
/**
 * Validate content for the specified format.
 *
 * @param text - Content to validate
 * @param format - Expected format
 * @returns Validation result
 */
export declare function validate(text: string, format: SerializerFormat): ValidationResult;
/**
 * Reformat content for consistency.
 *
 * @param text - Content to reformat
 * @param format - Content format
 * @param options - Formatting options
 * @returns Reformatted content
 * @throws Error if reformatting fails
 */
export declare function reformat(text: string, format: SerializerFormat, options?: SerializerOptions): string;
/**
 * Factory functions for creating serializer instances.
 */
export declare const Serializers: {
    /**
     * Create an HCL serializer.
     */
    readonly hcl: typeof createHCLSerializer;
    /**
     * Create a YAML serializer.
     */
    readonly yaml: typeof createYAMLSerializer;
    /**
     * Create a JSON serializer.
     */
    readonly json: typeof createJSONSerializer;
    /**
     * Create a SQL serializer.
     */
    readonly sql: typeof createSQLSerializer;
    /**
     * Create a serializer for the specified format.
     */
    readonly create: (format: SerializerFormat) => ISerializer;
};
export { HCLSerializer, YAMLSerializer, JSONSerializer, SQLSerializer, };
//# sourceMappingURL=index.d.ts.map