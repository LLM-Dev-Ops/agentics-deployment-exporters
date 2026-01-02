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

import type {
  FormatOptions,
  SerializerFormat,
  SerializerId,
  SerializerOptions,
  ValidationResult,
} from './types.js';
import {
  createInvalidResult,
  createSerializerId,
  createValidResult,
  DEFAULT_FORMAT_OPTIONS,
} from './types.js';

// =============================================================================
// SERIALIZER ERROR
// =============================================================================

/**
 * Error thrown during serialization operations.
 */
export class SerializerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly line?: number,
    public readonly column?: number,
    public readonly path?: string
  ) {
    super(message);
    this.name = 'SerializerError';
    Object.freeze(this);
  }
}

/**
 * Error thrown during parsing/deserialization.
 */
export class ParseError extends SerializerError {
  constructor(
    message: string,
    line?: number,
    column?: number,
    public readonly source?: string
  ) {
    super(message, 'E4001', line, column);
    this.name = 'ParseError';
    Object.freeze(this);
  }
}

/**
 * Error thrown for invalid format.
 */
export class FormatError extends SerializerError {
  constructor(message: string, path?: string) {
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
export abstract class BaseSerializer<
  TOptions extends SerializerOptions = SerializerOptions,
> {
  /**
   * Unique identifier for this serializer.
   */
  public readonly id: SerializerId;

  /**
   * The format this serializer produces.
   */
  public abstract readonly format: SerializerFormat;

  /**
   * Default options for this serializer.
   */
  protected abstract readonly defaultOptions: Required<TOptions>;

  /**
   * Create a new serializer instance.
   *
   * @param idSuffix - Optional suffix for the serializer ID
   */
  constructor(idSuffix?: string) {
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
  public serialize(data: unknown, options?: TOptions): string {
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
  public deserialize(text: string): unknown {
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
  public reformat(text: string, options?: FormatOptions): string {
    const formatOptions: FormatOptions = {
      ...DEFAULT_FORMAT_OPTIONS,
      ...options,
    };

    // Optionally validate first
    if (formatOptions.validateFirst) {
      const validation = this.validate(text);
      if (!validation.valid) {
        const firstError = validation.errors[0];
        throw new FormatError(
          firstError?.message ?? 'Validation failed',
          firstError?.path
        );
      }
    }

    // Parse and re-serialize
    const data = this.deserialize(text);
    return this.serialize(data, options as TOptions);
  }

  /**
   * Validate that content is valid for this format.
   *
   * @param text - Content to validate
   * @returns Validation result with errors/warnings
   */
  public validate(text: string): ValidationResult {
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
  // ABSTRACT METHODS (must be implemented by subclasses)
  // ===========================================================================

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
  protected abstract doSerialize(
    data: unknown,
    options: Required<TOptions>
  ): string;

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
  protected mergeOptions(options?: TOptions): Required<TOptions> {
    if (!options) {
      return { ...this.defaultOptions };
    }

    // Merge with defaults, user options take precedence
    const merged = { ...this.defaultOptions };
    for (const key of Object.keys(options) as (keyof TOptions)[]) {
      if (options[key] !== undefined) {
        (merged as Record<string, unknown>)[key as string] = options[key];
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
  protected sortObjectKeys(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sortObjectKeys(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sorted: Record<string, unknown> = {};
      const keys = Object.keys(data).sort((a, b) =>
        a.localeCompare(b, 'en', { sensitivity: 'base' })
      );

      for (const key of keys) {
        sorted[key] = this.sortObjectKeys(
          (data as Record<string, unknown>)[key]
        );
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
  protected createIndent(
    level: number,
    options: Required<SerializerOptions>
  ): string {
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
  protected escapeString(str: string, quoteChar: '"' | "'" = '"'): string {
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
  protected needsQuoting(str: string, specialChars: string): boolean {
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
  protected isValidIdentifier(
    str: string,
    pattern: RegExp = /^[a-zA-Z_][a-zA-Z0-9_]*$/
  ): boolean {
    return pattern.test(str);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a validation result from a parse error.
 */
export function validationFromError(error: unknown): ValidationResult {
  if (error instanceof SerializerError) {
    // Build error object without undefined properties
    const validationError: {
      code: string;
      message: string;
      line?: number;
      column?: number;
      path?: string;
    } = {
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
export function validateSerializable(
  data: unknown,
  path: string[] = []
): ValidationResult {
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
        const warnings: Array<{ code: string; message: string; path: string }> =
          [];
        for (let i = 0; i < data.length; i++) {
          const result = validateSerializable(data[i], [...path, String(i)]);
          if (!result.valid) {
            return result;
          }
          warnings.push(
            ...result.warnings.map((w) => ({
              code: w.code,
              message: w.message,
              path: w.path ?? '',
            }))
          );
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
      const warnings: Array<{ code: string; message: string; path: string }> =
        [];
      for (const [key, value] of Object.entries(data)) {
        const result = validateSerializable(value, [...path, key]);
        if (!result.valid) {
          return result;
        }
        warnings.push(
          ...result.warnings.map((w) => ({
            code: w.code,
            message: w.message,
            path: w.path ?? '',
          }))
        );
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
