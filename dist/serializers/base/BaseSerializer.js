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
import { createInvalidResult, createSerializerId, createValidResult, DEFAULT_FORMAT_OPTIONS, } from './types.js';
// =============================================================================
// SERIALIZER ERROR
// =============================================================================
/**
 * Error thrown during serialization operations.
 */
export class SerializerError extends Error {
    code;
    line;
    column;
    path;
    constructor(message, code, line, column, path) {
        super(message);
        this.code = code;
        this.line = line;
        this.column = column;
        this.path = path;
        this.name = 'SerializerError';
        Object.freeze(this);
    }
}
/**
 * Error thrown during parsing/deserialization.
 */
export class ParseError extends SerializerError {
    source;
    constructor(message, line, column, source) {
        super(message, 'E4001', line, column);
        this.source = source;
        this.name = 'ParseError';
        Object.freeze(this);
    }
}
/**
 * Error thrown for invalid format.
 */
export class FormatError extends SerializerError {
    constructor(message, path) {
        super(message, 'E4005', undefined, undefined, path);
        this.name = 'FormatError';
        Object.freeze(this);
    }
}
// =============================================================================
// ABSTRACT BASE SERIALIZER
// =============================================================================
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
export class BaseSerializer {
    /**
     * Unique identifier for this serializer.
     */
    id;
    /**
     * Create a new serializer instance.
     *
     * @param idSuffix - Optional suffix for the serializer ID
     */
    constructor(idSuffix) {
        const suffix = idSuffix ? `-${idSuffix}` : '';
        this.id = createSerializerId(`serializer${suffix}`);
        Object.freeze(this.id);
    }
    // ===========================================================================
    // PUBLIC API
    // ===========================================================================
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
    serialize(data, options) {
        // Merge options with defaults (deterministically)
        const mergedOptions = this.mergeOptions(options);
        // Sort data if sortKeys is enabled (for determinism)
        const sortedData = mergedOptions.sortKeys
            ? this.sortObjectKeys(data)
            : data;
        // Perform serialization
        let result = this.doSerialize(sortedData, mergedOptions);
        // Ensure trailing newline if requested
        if (mergedOptions.trailingNewline && !result.endsWith('\n')) {
            result += '\n';
        }
        return result;
    }
    /**
     * Deserialize string to structured data.
     *
     * @param text - String content to parse
     * @returns Parsed data structure
     * @throws ParseError if parsing fails
     */
    deserialize(text) {
        if (typeof text !== 'string') {
            throw new ParseError('Input must be a string');
        }
        return this.doDeserialize(text);
    }
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
    reformat(text, options) {
        const formatOptions = {
            ...DEFAULT_FORMAT_OPTIONS,
            ...options,
        };
        // Optionally validate first
        if (formatOptions.validateFirst) {
            const validation = this.validate(text);
            if (!validation.valid) {
                const firstError = validation.errors[0];
                throw new FormatError(firstError?.message ?? 'Validation failed', firstError?.path);
            }
        }
        // Parse and re-serialize
        const data = this.deserialize(text);
        return this.serialize(data, options);
    }
    /**
     * Validate that content is valid for this format.
     *
     * @param text - Content to validate
     * @returns Validation result with errors/warnings
     */
    validate(text) {
        if (typeof text !== 'string') {
            return createInvalidResult([
                {
                    code: 'E4001',
                    message: 'Input must be a string',
                },
            ]);
        }
        if (text.trim().length === 0) {
            return createInvalidResult([
                {
                    code: 'E4001',
                    message: 'Input is empty',
                },
            ]);
        }
        return this.doValidate(text);
    }
    // ===========================================================================
    // PROTECTED UTILITIES
    // ===========================================================================
    /**
     * Merge user options with defaults.
     *
     * Options are merged in a deterministic way with user options
     * taking precedence over defaults.
     *
     * @param options - User-provided options
     * @returns Complete options with all defaults applied
     */
    mergeOptions(options) {
        if (!options) {
            return { ...this.defaultOptions };
        }
        // Merge with defaults, user options take precedence
        const merged = { ...this.defaultOptions };
        for (const key of Object.keys(options)) {
            if (options[key] !== undefined) {
                merged[key] = options[key];
            }
        }
        return merged;
    }
    /**
     * Recursively sort object keys alphabetically.
     *
     * This ensures deterministic output regardless of input order.
     * Uses locale-independent sorting for consistency across environments.
     *
     * @param data - Data to sort
     * @returns Data with sorted keys
     */
    sortObjectKeys(data) {
        if (data === null || data === undefined) {
            return data;
        }
        if (Array.isArray(data)) {
            return data.map((item) => this.sortObjectKeys(item));
        }
        if (typeof data === 'object' && data !== null) {
            const sorted = {};
            const keys = Object.keys(data).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
            for (const key of keys) {
                sorted[key] = this.sortObjectKeys(data[key]);
            }
            return sorted;
        }
        return data;
    }
    /**
     * Create indentation string.
     *
     * @param level - Indentation level (0-based)
     * @param options - Options with indent settings
     * @returns Indentation string
     */
    createIndent(level, options) {
        if (level <= 0) {
            return '';
        }
        if (options.useTabs) {
            return '\t'.repeat(level);
        }
        return ' '.repeat(level * options.indent);
    }
    /**
     * Escape special characters in a string.
     *
     * @param str - String to escape
     * @param quoteChar - Quote character being used
     * @returns Escaped string
     */
    escapeString(str, quoteChar = '"') {
        let result = '';
        for (const char of str) {
            switch (char) {
                case '\\':
                    result += '\\\\';
                    break;
                case '\n':
                    result += '\\n';
                    break;
                case '\r':
                    result += '\\r';
                    break;
                case '\t':
                    result += '\\t';
                    break;
                case quoteChar:
                    result += '\\' + quoteChar;
                    break;
                default:
                    result += char;
            }
        }
        return result;
    }
    /**
     * Check if a string needs quoting.
     *
     * @param str - String to check
     * @param specialChars - Characters that require quoting
     * @returns true if string needs quoting
     */
    needsQuoting(str, specialChars) {
        if (str.length === 0) {
            return true;
        }
        // Check for special characters
        for (const char of specialChars) {
            if (str.includes(char)) {
                return true;
            }
        }
        // Check for leading/trailing whitespace
        if (str !== str.trim()) {
            return true;
        }
        // Check if it looks like a number or boolean
        if (/^[-+]?\d*\.?\d+([eE][-+]?\d+)?$/.test(str)) {
            return true;
        }
        if (str === 'true' || str === 'false' || str === 'null') {
            return true;
        }
        return false;
    }
    /**
     * Check if a string is a valid identifier.
     *
     * @param str - String to check
     * @param pattern - Regex pattern for valid identifiers
     * @returns true if string is a valid identifier
     */
    isValidIdentifier(str, pattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/) {
        return pattern.test(str);
    }
}
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Create a validation result from a parse error.
 */
export function validationFromError(error) {
    if (error instanceof SerializerError) {
        // Build error object without undefined properties
        const validationError = {
            code: error.code,
            message: error.message,
        };
        if (error.line !== undefined) {
            validationError.line = error.line;
        }
        if (error.column !== undefined) {
            validationError.column = error.column;
        }
        if (error.path !== undefined) {
            validationError.path = error.path;
        }
        return createInvalidResult([validationError]);
    }
    if (error instanceof Error) {
        return createInvalidResult([
            {
                code: 'E4001',
                message: error.message,
            },
        ]);
    }
    return createInvalidResult([
        {
            code: 'E4001',
            message: String(error),
        },
    ]);
}
/**
 * Validate that all values in an object are serializable.
 */
export function validateSerializable(data, path = []) {
    if (data === null || data === undefined) {
        return createValidResult();
    }
    const type = typeof data;
    switch (type) {
        case 'string':
        case 'number':
        case 'boolean':
            return createValidResult();
        case 'bigint':
            // BigInt is serializable but needs special handling
            return createValidResult([
                {
                    code: 'W4001',
                    message: 'BigInt values will be converted to strings',
                    path: path.join('.'),
                },
            ]);
        case 'function':
        case 'symbol':
            return createInvalidResult([
                {
                    code: 'E4002',
                    message: `Cannot serialize ${type}`,
                    path: path.join('.'),
                },
            ]);
        case 'object':
            if (Array.isArray(data)) {
                const warnings = [];
                for (let i = 0; i < data.length; i++) {
                    const result = validateSerializable(data[i], [...path, String(i)]);
                    if (!result.valid) {
                        return result;
                    }
                    warnings.push(...result.warnings.map((w) => ({
                        code: w.code,
                        message: w.message,
                        path: w.path ?? '',
                    })));
                }
                return createValidResult(warnings);
            }
            if (data instanceof Date) {
                return createValidResult();
            }
            if (data instanceof Map || data instanceof Set) {
                return createInvalidResult([
                    {
                        code: 'E4002',
                        message: `Cannot directly serialize ${data.constructor.name}, convert to object/array first`,
                        path: path.join('.'),
                    },
                ]);
            }
            // Regular object
            const warnings = [];
            for (const [key, value] of Object.entries(data)) {
                const result = validateSerializable(value, [...path, key]);
                if (!result.valid) {
                    return result;
                }
                warnings.push(...result.warnings.map((w) => ({
                    code: w.code,
                    message: w.message,
                    path: w.path ?? '',
                })));
            }
            return createValidResult(warnings);
        default:
            return createInvalidResult([
                {
                    code: 'E4002',
                    message: `Unknown type: ${type}`,
                    path: path.join('.'),
                },
            ]);
    }
}
//# sourceMappingURL=BaseSerializer.js.map