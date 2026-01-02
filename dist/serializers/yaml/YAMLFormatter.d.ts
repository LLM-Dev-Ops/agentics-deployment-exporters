/**
 * YAML Formatter
 *
 * This module provides YAML-specific formatting rules and utilities.
 * All functions are pure and deterministic.
 *
 * @module serializers/yaml/YAMLFormatter
 * @version 1.0.0
 */
import type { YAMLScalarStyle, YAMLSerializerOptions } from '../base/types.js';
/**
 * YAML special characters that may require quoting.
 */
export declare const YAML_SPECIAL_CHARS = ":{}[]&*?|<>=!%@`#,";
/**
 * YAML reserved indicators at start of value.
 */
export declare const YAML_INDICATOR_CHARS = "-?:,[]{}#&*!|>'\"%@`";
/**
 * Characters that start flow indicators.
 */
export declare const YAML_FLOW_INDICATORS = "[]{},:";
/**
 * Document separators.
 */
export declare const YAML_DOC_START = "---";
export declare const YAML_DOC_END = "...";
/**
 * Immutable formatter state for YAML output.
 */
export interface YAMLFormatterState {
    readonly indentLevel: number;
    readonly inFlow: boolean;
    readonly options: Required<YAMLSerializerOptions>;
}
/**
 * Create initial formatter state.
 */
export declare function createYAMLFormatterState(options?: YAMLSerializerOptions): YAMLFormatterState;
/**
 * Create new state with incremented indent.
 */
export declare function incrementYAMLIndent(state: YAMLFormatterState): YAMLFormatterState;
/**
 * Create new state for flow context.
 */
export declare function enterFlowContext(state: YAMLFormatterState): YAMLFormatterState;
/**
 * Create indentation string for given state.
 */
export declare function createYAMLIndent(state: YAMLFormatterState): string;
/**
 * Determine if a string needs quoting in YAML.
 */
export declare function needsYAMLQuoting(value: string, forceQuotes?: boolean): boolean;
/**
 * Determine the best quoting style for a string.
 */
export declare function determineYAMLQuoteStyle(value: string, _preferredStyle?: YAMLScalarStyle): YAMLScalarStyle;
/**
 * Escape a string for double-quoted YAML.
 */
export declare function escapeYAMLDoubleQuoted(value: string): string;
/**
 * Escape a string for single-quoted YAML (only single quotes need escaping).
 */
export declare function escapeYAMLSingleQuoted(value: string): string;
/**
 * Format a string value with appropriate quoting style.
 */
export declare function formatYAMLString(value: string, state: YAMLFormatterState): string;
/**
 * Format a literal block scalar (|).
 */
export declare function formatYAMLLiteralBlock(value: string, state: YAMLFormatterState): string;
/**
 * Format a folded block scalar (>).
 */
export declare function formatYAMLFoldedBlock(value: string, state: YAMLFormatterState): string;
/**
 * Check if a key needs quoting in YAML.
 */
export declare function needsYAMLKeyQuoting(key: string): boolean;
/**
 * Format a YAML key.
 */
export declare function formatYAMLKey(key: string): string;
/**
 * Format an array in flow style.
 */
export declare function formatYAMLFlowArray(elements: readonly string[], _state: YAMLFormatterState): string;
/**
 * Format an object in flow style.
 */
export declare function formatYAMLFlowObject(entries: readonly {
    key: string;
    value: string;
}[], _state: YAMLFormatterState): string;
/**
 * Check if text is a multi-document YAML.
 */
export declare function isMultiDocumentYAML(text: string): boolean;
/**
 * Split multi-document YAML into individual documents.
 */
export declare function splitYAMLDocuments(text: string): string[];
/**
 * Join documents with proper separators.
 */
export declare function joinYAMLDocuments(documents: readonly string[]): string;
/**
 * Format a YAML comment.
 */
export declare function formatYAMLComment(comment: string, state: YAMLFormatterState): string;
/**
 * Extract comments from YAML text (basic implementation).
 */
export declare function extractYAMLComments(text: string): {
    line: number;
    comment: string;
}[];
/**
 * Validate anchor name.
 */
export declare function isValidYAMLAnchor(name: string): boolean;
/**
 * Format an anchor.
 */
export declare function formatYAMLAnchor(name: string): string;
/**
 * Format an alias.
 */
export declare function formatYAMLAlias(name: string): string;
//# sourceMappingURL=YAMLFormatter.d.ts.map