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
export const DEFAULT_LOADER_CONFIG: LoaderConfig = {
  maxFileSize: 104857600, // 100MB
  streamBufferSize: 65536, // 64KB
  timeout: 30000, // 30 seconds
  preserveSourceLocations: true,
  strictEncoding: true,
  supportedEncodings: ['utf-8', 'utf-16le', 'utf-16be'],
} as const;

/**
 * Mutable source map builder for tracking source locations.
 * Used during parsing to build source location metadata.
 */
export class SourceMapBuilder {
  private readonly locationMap: Map<string, SourceLocation>;

  constructor() {
    this.locationMap = new Map();
  }

  /**
   * Add a location mapping for a JSON path.
   *
   * @param jsonPath - The JSON path (e.g., "$.metadata.name")
   * @param location - The source location
   */
  setLocation(jsonPath: string, location: SourceLocation): void {
    this.locationMap.set(jsonPath, location);
  }

  /**
   * Get the source location for a JSON path.
   *
   * @param jsonPath - The JSON path to look up
   * @returns The source location or undefined if not found
   */
  getLocation(jsonPath: string): SourceLocation | undefined {
    return this.locationMap.get(jsonPath);
  }

  /**
   * Check if a location exists for a path.
   *
   * @param jsonPath - The JSON path to check
   */
  hasLocation(jsonPath: string): boolean {
    return this.locationMap.has(jsonPath);
  }

  /**
   * Get the number of tracked locations.
   */
  get size(): number {
    return this.locationMap.size;
  }

  /**
   * Build an immutable SourceMap from this builder.
   */
  build(): SourceMap {
    const locations: Record<string, SourceLocation> = {};
    for (const [path, loc] of this.locationMap) {
      locations[path] = Object.freeze({ ...loc });
    }
    return Object.freeze({ locations: Object.freeze(locations) });
  }
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
export const DEFAULT_PARSER_OPTIONS: ParserOptions = {
  trackLocations: true,
  strict: true,
  maxDepth: 100,
  maxKeys: 10000,
} as const;

/**
 * Error codes for loader operations.
 */
export const LoaderErrorCodes = {
  // File errors (V1000-V1099)
  FILE_NOT_FOUND: 'V1001',
  FILE_TOO_LARGE: 'V1002',
  FILE_ACCESS_DENIED: 'V1003',
  FILE_READ_ERROR: 'V1004',

  // Encoding errors (V1100-V1199)
  UNSUPPORTED_ENCODING: 'V1101',
  ENCODING_DETECTION_FAILED: 'V1102',
  INVALID_UTF8_SEQUENCE: 'V1103',
  INVALID_UTF16_SEQUENCE: 'V1104',

  // Format errors (V1200-V1299)
  FORMAT_DETECTION_FAILED: 'V1201',
  UNSUPPORTED_FORMAT: 'V1202',

  // Parsing errors (V1300-V1399)
  JSON_PARSE_ERROR: 'V1301',
  YAML_PARSE_ERROR: 'V1302',
  UNEXPECTED_TOKEN: 'V1303',
  INVALID_STRUCTURE: 'V1304',
  MAX_DEPTH_EXCEEDED: 'V1305',
  MAX_KEYS_EXCEEDED: 'V1306',

  // Stream errors (V1400-V1499)
  STREAM_READ_ERROR: 'V1401',
  STREAM_TIMEOUT: 'V1402',
  STREAM_ABORTED: 'V1403',

  // Content errors (V1500-V1599)
  EMPTY_CONTENT: 'V1501',
  INVALID_CONTENT: 'V1502',
} as const;

export type LoaderErrorCode = (typeof LoaderErrorCodes)[keyof typeof LoaderErrorCodes];

/**
 * Structured error for loader operations.
 */
export class LoaderError extends Error {
  readonly code: LoaderErrorCode;
  readonly path: string | undefined;
  readonly line: number | undefined;
  readonly column: number | undefined;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    code: LoaderErrorCode,
    message: string,
    options?: {
      path?: string;
      line?: number;
      column?: number;
      details?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = 'LoaderError';
    this.code = code;
    this.path = options?.path ?? undefined;
    this.line = options?.line ?? undefined;
    this.column = options?.column ?? undefined;
    this.details = options?.details ?? undefined;

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LoaderError);
    }
  }

  /**
   * Create a human-readable error message with location.
   */
  toDisplayString(): string {
    let msg = `[${this.code}] ${this.message}`;

    if (this.path) {
      msg += `\n  File: ${this.path}`;
    }

    if (this.line !== undefined && this.column !== undefined) {
      msg += `\n  Location: line ${this.line}, column ${this.column}`;
    }

    return msg;
  }
}
