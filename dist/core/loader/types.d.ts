/**
 * Types specific to the IntentLoader module.
 * Provides configuration and source mapping for error location tracking.
 */
import type { SourceLocation, SourceMap } from '../types.js';
/**
 * Configuration options for the IntentLoader.
 */
export interface LoaderConfig {
    /**
     * Maximum file size in bytes (default: 100MB = 104857600)
     */
    readonly maxFileSize: number;
    /**
     * Buffer size for stream processing (default: 64KB = 65536)
     */
    readonly streamBufferSize: number;
    /**
     * Timeout for file operations in milliseconds (default: 30000)
     */
    readonly timeout: number;
    /**
     * Whether to preserve source location metadata (default: true)
     */
    readonly preserveSourceLocations: boolean;
    /**
     * Whether to validate encoding strictly (default: true)
     */
    readonly strictEncoding: boolean;
    /**
     * Supported encodings for auto-detection
     */
    readonly supportedEncodings: readonly ('utf-8' | 'utf-16le' | 'utf-16be')[];
}
/**
 * Default loader configuration values.
 */
export declare const DEFAULT_LOADER_CONFIG: LoaderConfig;
/**
 * Mutable source map builder for tracking source locations.
 * Used during parsing to build source location metadata.
 */
export declare class SourceMapBuilder {
    private readonly locationMap;
    constructor();
    /**
     * Add a location mapping for a JSON path.
     *
     * @param jsonPath - The JSON path (e.g., "$.metadata.name")
     * @param location - The source location
     */
    setLocation(jsonPath: string, location: SourceLocation): void;
    /**
     * Get the source location for a JSON path.
     *
     * @param jsonPath - The JSON path to look up
     * @returns The source location or undefined if not found
     */
    getLocation(jsonPath: string): SourceLocation | undefined;
    /**
     * Check if a location exists for a path.
     *
     * @param jsonPath - The JSON path to check
     */
    hasLocation(jsonPath: string): boolean;
    /**
     * Get the number of tracked locations.
     */
    get size(): number;
    /**
     * Build an immutable SourceMap from this builder.
     */
    build(): SourceMap;
}
/**
 * Result of encoding detection.
 */
export interface EncodingDetectionResult {
    /**
     * The detected encoding.
     */
    readonly encoding: 'utf-8' | 'utf-16le' | 'utf-16be';
    /**
     * Confidence level (0-1) of the detection.
     */
    readonly confidence: number;
    /**
     * Byte order mark (BOM) found, if any.
     */
    readonly bom: 'none' | 'utf-8' | 'utf-16le' | 'utf-16be';
    /**
     * Number of bytes to skip (BOM length).
     */
    readonly skipBytes: number;
}
/**
 * Result of format detection.
 */
export interface FormatDetectionResult {
    /**
     * The detected format.
     */
    readonly format: 'json' | 'yaml' | 'unknown';
    /**
     * Confidence level (0-1) of the detection.
     */
    readonly confidence: number;
    /**
     * Reason for the detection result.
     */
    readonly reason: string;
}
/**
 * Parser options for fine-grained control.
 */
export interface ParserOptions {
    /**
     * Whether to track source locations (default: true).
     */
    readonly trackLocations: boolean;
    /**
     * Whether to use strict parsing mode (default: true).
     */
    readonly strict: boolean;
    /**
     * Maximum nesting depth allowed (default: 100).
     */
    readonly maxDepth: number;
    /**
     * Maximum number of keys allowed in an object (default: 10000).
     */
    readonly maxKeys: number;
}
/**
 * Default parser options.
 */
export declare const DEFAULT_PARSER_OPTIONS: ParserOptions;
/**
 * Error codes for loader operations.
 */
export declare const LoaderErrorCodes: {
    readonly FILE_NOT_FOUND: "V1001";
    readonly FILE_TOO_LARGE: "V1002";
    readonly FILE_ACCESS_DENIED: "V1003";
    readonly FILE_READ_ERROR: "V1004";
    readonly UNSUPPORTED_ENCODING: "V1101";
    readonly ENCODING_DETECTION_FAILED: "V1102";
    readonly INVALID_UTF8_SEQUENCE: "V1103";
    readonly INVALID_UTF16_SEQUENCE: "V1104";
    readonly FORMAT_DETECTION_FAILED: "V1201";
    readonly UNSUPPORTED_FORMAT: "V1202";
    readonly JSON_PARSE_ERROR: "V1301";
    readonly YAML_PARSE_ERROR: "V1302";
    readonly UNEXPECTED_TOKEN: "V1303";
    readonly INVALID_STRUCTURE: "V1304";
    readonly MAX_DEPTH_EXCEEDED: "V1305";
    readonly MAX_KEYS_EXCEEDED: "V1306";
    readonly STREAM_READ_ERROR: "V1401";
    readonly STREAM_TIMEOUT: "V1402";
    readonly STREAM_ABORTED: "V1403";
    readonly EMPTY_CONTENT: "V1501";
    readonly INVALID_CONTENT: "V1502";
};
export type LoaderErrorCode = (typeof LoaderErrorCodes)[keyof typeof LoaderErrorCodes];
/**
 * Structured error for loader operations.
 */
export declare class LoaderError extends Error {
    readonly code: LoaderErrorCode;
    readonly path: string | undefined;
    readonly line: number | undefined;
    readonly column: number | undefined;
    readonly details: Record<string, unknown> | undefined;
    constructor(code: LoaderErrorCode, message: string, options?: {
        path?: string;
        line?: number;
        column?: number;
        details?: Record<string, unknown>;
        cause?: Error;
    });
    /**
     * Create a human-readable error message with location.
     */
    toDisplayString(): string;
}
//# sourceMappingURL=types.d.ts.map