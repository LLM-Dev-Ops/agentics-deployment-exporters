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
import { BaseSerializer } from '../base/BaseSerializer.js';
import type { JSONSerializerOptions, SerializerFormat, ValidationResult } from '../base/types.js';
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
export declare class JSONSerializer extends BaseSerializer<JSONSerializerOptions> {
    readonly format: SerializerFormat;
    protected readonly defaultOptions: Required<JSONSerializerOptions>;
    constructor();
    /**
     * Serialize data to JSON format.
     */
    protected doSerialize(data: unknown, options: Required<JSONSerializerOptions>): string;
    /**
     * Deserialize JSON to structured data.
     */
    protected doDeserialize(text: string): unknown;
    /**
     * Validate JSON content.
     */
    protected doValidate(text: string): ValidationResult;
    /**
     * Serialize with pretty printing.
     */
    private serializePretty;
    /**
     * Serialize to minified JSON (no whitespace).
     */
    private serializeMinified;
    /**
     * Format a value with pretty printing.
     */
    private formatValue;
    /**
     * Format a value without whitespace.
     */
    private formatValueMinified;
    /**
     * Format a number value.
     */
    private formatNumber;
    /**
     * Format a string value.
     */
    private formatString;
    /**
     * Format an array with pretty printing.
     */
    private formatArray;
    /**
     * Format an object with pretty printing.
     */
    private formatObject;
    /**
     * Process BigInt values in data structure.
     */
    private processBigInt;
    /**
     * Validate nesting depth.
     */
    private validateDepth;
    /**
     * Convert byte position to line/column.
     */
    private positionToLineColumn;
    /**
     * Create indentation string.
     */
    private createIndentString;
}
/**
 * Create a new JSON serializer instance.
 */
export declare function createJSONSerializer(): JSONSerializer;
/**
 * Check if a string is valid JSON.
 */
export declare function isValidJSON(text: string): boolean;
/**
 * Pretty print JSON with sorted keys.
 */
export declare function prettyPrintJSON(data: unknown, indent?: number): string;
/**
 * Minify JSON.
 */
export declare function minifyJSON(data: unknown): string;
//# sourceMappingURL=JSONSerializer.d.ts.map