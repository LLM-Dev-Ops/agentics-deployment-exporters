/**
 * JSON Serializer
 *
 * This module provides JSON serialization with deterministic output.
 * All operations are pure and produce identical output for identical input.
 *
 * Features:
 * - Pretty printing with configurable indent
 * - Key sorting (for determinism)
 * - Minification option
 * - BigInt handling
 * - Deterministic output guaranteed
 *
 * @module serializers/json/JSONSerializer
 * @version 1.0.0
 */

import {
  BaseSerializer,
  ParseError,
  validationFromError,
} from '../base/BaseSerializer.js';
import type {
  JSONSerializerOptions,
  SerializerFormat,
  ValidationResult,
} from '../base/types.js';
import {
  createValidResult,
  DEFAULT_JSON_OPTIONS,
} from '../base/types.js';

// =============================================================================
// JSON SERIALIZER
// =============================================================================

/**
 * JSON Serializer with deterministic output.
 *
 * This serializer produces byte-identical JSON output for identical input.
 * Keys are always sorted alphabetically and formatting is consistent.
 *
 * @example
 * ```typescript
 * const serializer = new JSONSerializer();
 *
 * // Pretty print with sorted keys
 * const json = serializer.serialize({ z: 1, a: 2 });
 * // {
 * //   "a": 2,
 * //   "z": 1
 * // }
 *
 * // Minified
 * const minified = serializer.serialize({ z: 1, a: 2 }, { minify: true });
 * // {"a":2,"z":1}
 * ```
 */
export class JSONSerializer extends BaseSerializer<JSONSerializerOptions> {
  public readonly format: SerializerFormat = 'json';
  protected readonly defaultOptions: Required<JSONSerializerOptions> =
    DEFAULT_JSON_OPTIONS;

  constructor() {
    super('json');
  }

  // ===========================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ===========================================================================

  /**
   * Serialize data to JSON format.
   */
  protected doSerialize(
    data: unknown,
    options: Required<JSONSerializerOptions>
  ): string {
    // Handle BigInt if needed
    const processedData = options.handleBigInt
      ? this.processBigInt(data, options.bigIntAsString)
      : data;

    // Check depth
    this.validateDepth(processedData, 0, options.maxDepth);

    if (options.minify) {
      return this.serializeMinified(processedData);
    }

    return this.serializePretty(processedData, options);
  }

  /**
   * Deserialize JSON to structured data.
   */
  protected doDeserialize(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Try to extract line/column from error message
        const match = error.message.match(/at position (\d+)/);
        if (match) {
          const position = parseInt(match[1]!, 10);
          const { line, column } = this.positionToLineColumn(text, position);
          throw new ParseError(error.message, line, column, text);
        }
      }
      throw new ParseError(
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Validate JSON content.
   */
  protected doValidate(text: string): ValidationResult {
    try {
      JSON.parse(text);
      return createValidResult();
    } catch (error) {
      return validationFromError(error);
    }
  }

  // ===========================================================================
  // SERIALIZATION
  // ===========================================================================

  /**
   * Serialize with pretty printing.
   */
  private serializePretty(
    data: unknown,
    options: Required<JSONSerializerOptions>
  ): string {
    return this.formatValue(data, 0, options);
  }

  /**
   * Serialize to minified JSON (no whitespace).
   */
  private serializeMinified(data: unknown): string {
    return this.formatValueMinified(data);
  }

  /**
   * Format a value with pretty printing.
   */
  private formatValue(
    value: unknown,
    depth: number,
    options: Required<JSONSerializerOptions>
  ): string {
    if (value === null) {
      return 'null';
    }

    if (value === undefined) {
      return 'null'; // JSON doesn't have undefined, convert to null
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'number') {
      return this.formatNumber(value);
    }

    if (typeof value === 'string') {
      return this.formatString(value);
    }

    if (Array.isArray(value)) {
      return this.formatArray(value, depth, options);
    }

    if (typeof value === 'object') {
      return this.formatObject(value as Record<string, unknown>, depth, options);
    }

    // Should not reach here after processing
    throw new Error(`Cannot serialize value of type: ${typeof value}`);
  }

  /**
   * Format a value without whitespace.
   */
  private formatValueMinified(value: unknown): string {
    if (value === null || value === undefined) {
      return 'null';
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'number') {
      return this.formatNumber(value);
    }

    if (typeof value === 'string') {
      return this.formatString(value);
    }

    if (Array.isArray(value)) {
      const elements = value.map((v) => this.formatValueMinified(v));
      return '[' + elements.join(',') + ']';
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value).sort((a, b) =>
        a.localeCompare(b, 'en', { sensitivity: 'base' })
      );
      const pairs = keys.map((key) => {
        const val = (value as Record<string, unknown>)[key];
        return this.formatString(key) + ':' + this.formatValueMinified(val);
      });
      return '{' + pairs.join(',') + '}';
    }

    throw new Error(`Cannot serialize value of type: ${typeof value}`);
  }

  /**
   * Format a number value.
   */
  private formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot serialize non-finite number: ${value}`);
    }

    if (Number.isInteger(value)) {
      return String(value);
    }

    // Use fixed representation for consistency
    // This ensures deterministic output across platforms
    const str = value.toFixed(15).replace(/\.?0+$/, '');

    // If the result looks like an integer, add .0
    if (!str.includes('.') && !str.includes('e') && !str.includes('E')) {
      return str;
    }

    return str;
  }

  /**
   * Format a string value.
   */
  private formatString(value: string): string {
    let result = '"';

    for (const char of value) {
      switch (char) {
        case '"':
          result += '\\"';
          break;
        case '\\':
          result += '\\\\';
          break;
        case '\b':
          result += '\\b';
          break;
        case '\f':
          result += '\\f';
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
        default:
          // Escape control characters
          const code = char.charCodeAt(0);
          if (code < 32) {
            result += '\\u' + code.toString(16).padStart(4, '0');
          } else {
            result += char;
          }
      }
    }

    return result + '"';
  }

  /**
   * Format an array with pretty printing.
   */
  private formatArray(
    arr: unknown[],
    depth: number,
    options: Required<JSONSerializerOptions>
  ): string {
    if (arr.length === 0) {
      return '[]';
    }

    const indent = this.createIndentString(depth, options);
    const innerIndent = this.createIndentString(depth + 1, options);

    const elements = arr.map((item) =>
      this.formatValue(item, depth + 1, options)
    );

    // Check if single-line fits
    const singleLine = '[' + elements.join(', ') + ']';
    if (
      singleLine.length <= options.lineWidth &&
      !singleLine.includes('\n')
    ) {
      return singleLine;
    }

    // Multi-line format
    const lines = elements.map((el) => innerIndent + el);
    return '[\n' + lines.join(',\n') + '\n' + indent + ']';
  }

  /**
   * Format an object with pretty printing.
   */
  private formatObject(
    obj: Record<string, unknown>,
    depth: number,
    options: Required<JSONSerializerOptions>
  ): string {
    // Sort keys for determinism
    const keys = Object.keys(obj).sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' })
    );

    if (keys.length === 0) {
      return '{}';
    }

    const indent = this.createIndentString(depth, options);
    const innerIndent = this.createIndentString(depth + 1, options);

    const pairs = keys.map((key) => {
      const value = obj[key];
      const formattedKey = this.formatString(key);
      const formattedValue = this.formatValue(value, depth + 1, options);
      return formattedKey + ': ' + formattedValue;
    });

    // Check if single-line fits
    const singleLine = '{' + pairs.join(', ') + '}';
    if (
      singleLine.length <= options.lineWidth &&
      !singleLine.includes('\n')
    ) {
      return singleLine;
    }

    // Multi-line format
    const lines = pairs.map((pair) => innerIndent + pair);
    return '{\n' + lines.join(',\n') + '\n' + indent + '}';
  }

  // ===========================================================================
  // BIGINT HANDLING
  // ===========================================================================

  /**
   * Process BigInt values in data structure.
   */
  private processBigInt(data: unknown, asString: boolean): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'bigint') {
      if (asString) {
        return data.toString();
      }
      // Convert to number (may lose precision for large values)
      const num = Number(data);
      if (!Number.isSafeInteger(num)) {
        throw new Error(
          `BigInt value ${data} exceeds safe integer range. Use bigIntAsString: true`
        );
      }
      return num;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.processBigInt(item, asString));
    }

    if (typeof data === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.processBigInt(value, asString);
      }
      return result;
    }

    return data;
  }

  // ===========================================================================
  // VALIDATION UTILITIES
  // ===========================================================================

  /**
   * Validate nesting depth.
   */
  private validateDepth(
    data: unknown,
    currentDepth: number,
    maxDepth: number
  ): void {
    if (currentDepth > maxDepth) {
      throw new Error(`Maximum depth of ${maxDepth} exceeded`);
    }

    if (Array.isArray(data)) {
      for (const item of data) {
        this.validateDepth(item, currentDepth + 1, maxDepth);
      }
    } else if (typeof data === 'object' && data !== null) {
      for (const value of Object.values(data)) {
        this.validateDepth(value, currentDepth + 1, maxDepth);
      }
    }
  }

  /**
   * Convert byte position to line/column.
   */
  private positionToLineColumn(
    text: string,
    position: number
  ): { line: number; column: number } {
    let line = 1;
    let column = 1;

    for (let i = 0; i < position && i < text.length; i++) {
      if (text[i] === '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
    }

    return { line, column };
  }

  /**
   * Create indentation string.
   */
  private createIndentString(
    depth: number,
    options: Required<JSONSerializerOptions>
  ): string {
    if (depth <= 0) {
      return '';
    }

    if (options.useTabs) {
      return '\t'.repeat(depth);
    }

    return ' '.repeat(depth * options.indent);
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new JSON serializer instance.
 */
export function createJSONSerializer(): JSONSerializer {
  return new JSONSerializer();
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a string is valid JSON.
 */
export function isValidJSON(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pretty print JSON with sorted keys.
 */
export function prettyPrintJSON(
  data: unknown,
  indent: number = 2
): string {
  const serializer = new JSONSerializer();
  return serializer.serialize(data, { indent, sortKeys: true });
}

/**
 * Minify JSON.
 */
export function minifyJSON(data: unknown): string {
  const serializer = new JSONSerializer();
  return serializer.serialize(data, { minify: true });
}
