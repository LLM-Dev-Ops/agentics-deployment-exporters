/**
 * YAML Serializer
 *
 * This module provides YAML serialization with deterministic output.
 * All operations are pure and produce identical output for identical input.
 *
 * Features:
 * - Multi-document support (---)
 * - Block style (default) vs flow style
 * - Proper quoting for special characters
 * - Anchor/alias handling
 * - Deterministic key ordering
 *
 * @module serializers/yaml/YAMLSerializer
 * @version 1.0.0
 */
import { BaseSerializer } from '../base/BaseSerializer.js';
import type { SerializerFormat, ValidationResult, YAMLSerializerOptions } from '../base/types.js';
/**
 * YAML Serializer with deterministic output.
 *
 * This serializer converts JavaScript objects to YAML format with
 * guaranteed deterministic output. Keys are always sorted alphabetically
 * and formatting is consistent.
 *
 * @example
 * ```typescript
 * const serializer = new YAMLSerializer();
 *
 * const yaml = serializer.serialize({
 *   apiVersion: 'v1',
 *   kind: 'ConfigMap',
 *   metadata: { name: 'my-config' },
 *   data: { key: 'value' }
 * });
 * ```
 */
export declare class YAMLSerializer extends BaseSerializer<YAMLSerializerOptions> {
    readonly format: SerializerFormat;
    protected readonly defaultOptions: Required<YAMLSerializerOptions>;
    constructor();
    /**
     * Serialize data to YAML format.
     */
    protected doSerialize(data: unknown, options: Required<YAMLSerializerOptions>): string;
    /**
     * Deserialize YAML to structured data.
     */
    protected doDeserialize(text: string): unknown;
    /**
     * Validate YAML content.
     */
    protected doValidate(text: string): ValidationResult;
    /**
     * Format any value to YAML.
     */
    private formatValue;
    /**
     * Format a number value.
     */
    private formatNumber;
    /**
     * Format a string value with appropriate quoting.
     */
    private formatString;
    /**
     * Format a folded string (>).
     */
    private formatFoldedString;
    /**
     * Format an array.
     */
    private formatArray;
    /**
     * Format an array in flow style.
     */
    private formatFlowArray;
    /**
     * Format an object.
     */
    private formatObject;
    /**
     * Format an object in flow style.
     */
    private formatFlowObject;
    /**
     * Check if a value should use flow style.
     */
    private shouldUseFlowStyle;
    /**
     * Check if a value is simple (scalar).
     */
    private isSimpleValue;
    /**
     * Check if formatted output is multi-line.
     */
    private isMultiLine;
    /**
     * Parse YAML text to JavaScript objects.
     *
     * This is a basic YAML parser for common structures.
     * For production use with complex YAML, consider a dedicated parser.
     */
    private parseYAML;
    /**
     * Parse a single YAML document.
     */
    private parseYAMLDocument;
}
/**
 * Create a new YAML serializer instance.
 */
export declare function createYAMLSerializer(): YAMLSerializer;
//# sourceMappingURL=YAMLSerializer.d.ts.map