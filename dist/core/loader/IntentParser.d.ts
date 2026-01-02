/**
 * IntentParser - Deterministic JSON and YAML parsing for DeploymentIntent.
 *
 * This module provides parsing functions that are:
 * - Deterministic: Same input always produces identical output
 * - Fail-fast: Invalid input is rejected immediately
 * - Location-aware: Tracks source locations for error reporting
 */
import type { SourceMap } from '../types.js';
import { type ParserOptions } from './types.js';
/**
 * Result of a parsing operation.
 */
export interface ParseResult {
    /**
     * The parsed data as a raw object.
     */
    readonly data: Readonly<Record<string, unknown>>;
    /**
     * Source map for error location tracking.
     */
    readonly sourceMap: SourceMap;
}
/**
 * Parse JSON content with source location tracking.
 * This function is deterministic - same input always produces identical output.
 *
 * @param content - The JSON string to parse
 * @param options - Parser options for controlling behavior
 * @returns ParseResult with data and source map
 * @throws LoaderError on parsing failures
 */
export declare function parseJSON(content: string, options?: ParserOptions): ParseResult;
/**
 * Parse YAML content with source location tracking.
 * This function is deterministic - same input always produces identical output.
 *
 * @param content - The YAML string to parse
 * @param options - Parser options for controlling behavior
 * @returns ParseResult with data and source map
 * @throws LoaderError on parsing failures
 */
export declare function parseYAML(content: string, options?: ParserOptions): ParseResult;
/**
 * Verify that parsing is deterministic by comparing two parses.
 * Used for testing and validation.
 */
export declare function verifyDeterminism(content: string, format: 'json' | 'yaml', options?: ParserOptions): boolean;
//# sourceMappingURL=IntentParser.d.ts.map