/**
 * Types specific to the IntentLoader module.
 * Provides configuration and source mapping for error location tracking.
 */
/**
 * Default loader configuration values.
 */
export const DEFAULT_LOADER_CONFIG = {
    maxFileSize: 104857600, // 100MB
    streamBufferSize: 65536, // 64KB
    timeout: 30000, // 30 seconds
    preserveSourceLocations: true,
    strictEncoding: true,
    supportedEncodings: ['utf-8', 'utf-16le', 'utf-16be'],
};
/**
 * Mutable source map builder for tracking source locations.
 * Used during parsing to build source location metadata.
 */
export class SourceMapBuilder {
    locationMap;
    constructor() {
        this.locationMap = new Map();
    }
    /**
     * Add a location mapping for a JSON path.
     *
     * @param jsonPath - The JSON path (e.g., "$.metadata.name")
     * @param location - The source location
     */
    setLocation(jsonPath, location) {
        this.locationMap.set(jsonPath, location);
    }
    /**
     * Get the source location for a JSON path.
     *
     * @param jsonPath - The JSON path to look up
     * @returns The source location or undefined if not found
     */
    getLocation(jsonPath) {
        return this.locationMap.get(jsonPath);
    }
    /**
     * Check if a location exists for a path.
     *
     * @param jsonPath - The JSON path to check
     */
    hasLocation(jsonPath) {
        return this.locationMap.has(jsonPath);
    }
    /**
     * Get the number of tracked locations.
     */
    get size() {
        return this.locationMap.size;
    }
    /**
     * Build an immutable SourceMap from this builder.
     */
    build() {
        const locations = {};
        for (const [path, loc] of this.locationMap) {
            locations[path] = Object.freeze({ ...loc });
        }
        return Object.freeze({ locations: Object.freeze(locations) });
    }
}
/**
 * Default parser options.
 */
export const DEFAULT_PARSER_OPTIONS = {
    trackLocations: true,
    strict: true,
    maxDepth: 100,
    maxKeys: 10000,
};
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
};
/**
 * Structured error for loader operations.
 */
export class LoaderError extends Error {
    code;
    path;
    line;
    column;
    details;
    constructor(code, message, options) {
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
    toDisplayString() {
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
//# sourceMappingURL=types.js.map