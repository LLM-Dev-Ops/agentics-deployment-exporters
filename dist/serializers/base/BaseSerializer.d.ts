/**
 * Abstract Base Serializer
 *
 * This module provides the abstract base class for all serializer implementations.
 * It enforces the core contract: pure functions, deterministic output, stateless operation.
 *
 * All serializers must:
 * - Be pure functions (no side effects)
 * - Be deterministic (same input = same output)
 * - Be stateless (no instance variables that affect output)
 * - Be synchronous (no async operations)
 *
 * @module serializers/base/BaseSerializer
 * @version 1.0.0
 */
import type { FormatOptions, SerializerFormat, SerializerId, SerializerOptions, ValidationResult } from './types.js';
/**
 * Error thrown during serialization operations.
 */
export declare class SerializerError extends Error {
    readonly code: string;
    readonly line?: number | undefined;
    readonly column?: number | undefined;
    readonly path?: string | undefined;
    constructor(message: string, code: string, line?: number | undefined, column?: number | undefined, path?: string | undefined);
}
/**
 * Error thrown during parsing/deserialization.
 */
export declare class ParseError extends SerializerError {
    readonly source?: string | undefined;
    constructor(message: string, line?: number, column?: number, source?: string | undefined);
}
/**
 * Error thrown for invalid format.
 */
export declare class FormatError extends SerializerError {
    constructor(message: string, path?: string);
}
/**
 * Abstract base class for all serializer implementations.
 *
 * This class enforces the contract for serializers and provides
 * common utility methods. Subclasses must implement the abstract
 * methods for their specific format.
 *
 * @example
 * ```typescript
 * class JSONSerializer extends BaseSerializer<JSONSerializerOptions> {
 *   readonly format = 'json' as const;
 *
 *   protected doSerialize(data: unknown, options: Required<JSONSerializerOptions>): string {
 *     // Implementation
 *   }
 *
 *   protected doDeserialize(text: string): unknown {
 *     // Implementation
 *   }
 *
 *   protected doValidate(text: string): ValidationResult {
 *     // Implementation
 *   }
 * }
 * ```
 */
export declare abstract class BaseSerializer<TOptions extends SerializerOptions = SerializerOptions> {
    /**
     * Unique identifier for this serializer.
     */
    readonly id: SerializerId;
    /**
     * The format this serializer produces.
     */
    abstract readonly format: SerializerFormat;
    /**
     * Default options for this serializer.
     */
    protected abstract readonly defaultOptions: Required<TOptions>;
    /**
     * Create a new serializer instance.
     *
     * @param idSuffix - Optional suffix for the serializer ID
     */
    constructor(idSuffix?: string);
    /**
     * Serialize data to string format.
     *
     * This is the main serialization method. It ensures:
     * - Deterministic output (keys sorted, stable formatting)
     * - Pure function (no side effects)
     * - Complete options with defaults
     *
     * @param data - Data to serialize
     * @param options - Serialization options (merged with defaults)
     * @returns Serialized string
     * @throws SerializerError if serialization fails
     */
    serialize(data: unknown, options?: TOptions): string;
    /**
     * Deserialize string to structured data.
     *
     * @param text - String content to parse
     * @returns Parsed data structure
     * @throws ParseError if parsing fails
     */
    deserialize(text: string): unknown;
    /**
     * Reformat existing content for consistency.
     *
     * This parses and re-serializes the content to normalize
     * formatting without changing semantic content.
     *
     * @param text - Content to reformat
     * @param options - Formatting options
     * @returns Reformatted content
     * @throws SerializerError if reformatting fails
     */
    reformat(text: string, options?: FormatOptions): string;
    /**
     * Validate that content is valid for this format.
     *
     * @param text - Content to validate
     * @returns Validation result with errors/warnings
     */
    validate(text: string): ValidationResult;
    /**
     * Perform the actual serialization.
     *
     * This method must be:
     * - Pure (no side effects)
     * - Deterministic (same input = same output)
     *
     * @param data - Data to serialize (already sorted if sortKeys enabled)
     * @param options - Complete options (all defaults applied)
     * @returns Serialized string (without trailing newline handling)
     */
    protected abstract doSerialize(data: unknown, options: Required<TOptions>): string;
    /**
     * Perform the actual deserialization.
     *
     * @param text - Text to parse
     * @returns Parsed data structure
     * @throws ParseError if parsing fails
     */
    protected abstract doDeserialize(text: string): unknown;
    /**
     * Perform format-specific validation.
     *
     * @param text - Text to validate
     * @returns Validation result
     */
    protected abstract doValidate(text: string): ValidationResult;
    /**
     * Merge user options with defaults.
     *
     * Options are merged in a deterministic way with user options
     * taking precedence over defaults.
     *
     * @param options - User-provided options
     * @returns Complete options with all defaults applied
     */
    protected mergeOptions(options?: TOptions): Required<TOptions>;
    /**
     * Recursively sort object keys alphabetically.
     *
     * This ensures deterministic output regardless of input order.
     * Uses locale-independent sorting for consistency across environments.
     *
     * @param data - Data to sort
     * @returns Data with sorted keys
     */
    protected sortObjectKeys(data: unknown): unknown;
    /**
     * Create indentation string.
     *
     * @param level - Indentation level (0-based)
     * @param options - Options with indent settings
     * @returns Indentation string
     */
    protected createIndent(level: number, options: Required<SerializerOptions>): string;
    /**
     * Escape special characters in a string.
     *
     * @param str - String to escape
     * @param quoteChar - Quote character being used
     * @returns Escaped string
     */
    protected escapeString(str: string, quoteChar?: '"' | "'"): string;
    /**
     * Check if a string needs quoting.
     *
     * @param str - String to check
     * @param specialChars - Characters that require quoting
     * @returns true if string needs quoting
     */
    protected needsQuoting(str: string, specialChars: string): boolean;
    /**
     * Check if a string is a valid identifier.
     *
     * @param str - String to check
     * @param pattern - Regex pattern for valid identifiers
     * @returns true if string is a valid identifier
     */
    protected isValidIdentifier(str: string, pattern?: RegExp): boolean;
}
/**
 * Create a validation result from a parse error.
 */
export declare function validationFromError(error: unknown): ValidationResult;
/**
 * Validate that all values in an object are serializable.
 */
export declare function validateSerializable(data: unknown, path?: string[]): ValidationResult;
//# sourceMappingURL=BaseSerializer.d.ts.map