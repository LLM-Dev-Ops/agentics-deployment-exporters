/**
 * HCL Formatter
 *
 * This module provides HCL-specific formatting rules and utilities.
 * All functions are pure and deterministic.
 *
 * @module serializers/hcl/HCLFormatter
 * @version 1.0.0
 */
import type { HCLBlock, HCLExpression, HCLSerializerOptions } from '../base/types.js';
/**
 * HCL reserved words that should not be used as unquoted identifiers.
 */
export declare const HCL_RESERVED_WORDS: ReadonlySet<string>;
/**
 * Characters that require quoting in HCL identifiers.
 */
export declare const HCL_SPECIAL_CHARS = "={}[](),:\"'\n\r\t ";
/**
 * Pattern for valid HCL identifiers.
 */
export declare const HCL_IDENTIFIER_PATTERN: RegExp;
/**
 * Immutable formatter state for tracking indentation and alignment.
 */
export interface HCLFormatterState {
    readonly indentLevel: number;
    readonly maxKeyLength: number;
    readonly options: Required<HCLSerializerOptions>;
}
/**
 * Create initial formatter state.
 */
export declare function createFormatterState(options?: HCLSerializerOptions): HCLFormatterState;
/**
 * Create new state with incremented indent.
 */
export declare function incrementIndent(state: HCLFormatterState): HCLFormatterState;
/**
 * Create new state with updated max key length.
 */
export declare function withMaxKeyLength(state: HCLFormatterState, maxKeyLength: number): HCLFormatterState;
/**
 * Create indentation string for given state.
 */
export declare function createIndent(state: HCLFormatterState): string;
/**
 * Check if a string is a valid HCL identifier.
 */
export declare function isValidHCLIdentifier(str: string): boolean;
/**
 * Check if a string needs quoting in HCL.
 */
export declare function needsHCLQuoting(str: string): boolean;
/**
 * Quote an HCL identifier if needed.
 */
export declare function quoteHCLIdentifier(str: string, forceQuote?: boolean): string;
/**
 * Escape special characters in HCL string.
 */
export declare function escapeHCLString(str: string): string;
/**
 * Check if a string should use heredoc format.
 */
export declare function shouldUseHeredoc(str: string, lineWidth: number): boolean;
/**
 * Format a string as heredoc.
 */
export declare function formatHeredoc(str: string, state: HCLFormatterState, delimiter?: string): string;
/**
 * Format a primitive value for HCL.
 */
export declare function formatPrimitiveValue(value: unknown): string;
/**
 * Format an HCL expression.
 */
export declare function formatExpression(expr: HCLExpression, state: HCLFormatterState): string;
/**
 * Format a list/array for HCL.
 */
export declare function formatList(elements: readonly string[], state: HCLFormatterState): string;
/**
 * Format a map/object entry.
 */
export declare function formatMapEntry(key: string, value: string, state: HCLFormatterState, keyPadding?: number): string;
/**
 * Format a map/object for HCL.
 */
export declare function formatMap(entries: readonly {
    readonly key: string;
    readonly value: HCLExpression;
}[], state: HCLFormatterState): string;
/**
 * Format block labels.
 */
export declare function formatBlockLabels(labels: readonly string[]): string;
/**
 * Format a single HCL block.
 */
export declare function formatBlock(block: HCLBlock, state: HCLFormatterState): string;
/**
 * Calculate attribute alignment within a block.
 */
export declare function calculateAttributeAlignment(attributes: Readonly<Record<string, HCLExpression>>): number;
/**
 * Group blocks by type for organization.
 */
export declare function groupBlocksByType(blocks: readonly HCLBlock[]): Map<string, HCLBlock[]>;
/**
 * Sort blocks within a group for determinism.
 */
export declare function sortBlocksInGroup(blocks: readonly HCLBlock[]): HCLBlock[];
//# sourceMappingURL=HCLFormatter.d.ts.map