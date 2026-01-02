/**
 * IntentLoader - Main loader class for DeploymentIntent files.
 *
 * Implements IIntentLoader interface with support for:
 * - File system reading (sync/async)
 * - Stream processing for large files (up to 100MB)
 * - Format detection (JSON/YAML)
 * - Encoding detection (UTF-8, UTF-16)
 * - Source location metadata preservation
 *
 * All operations are fail-fast and deterministic.
 */
import type { Readable } from 'node:stream';
import type { IIntentLoader } from '../interfaces.js';
import type { ParsedIntent, IntentFormat } from '../types.js';
import { type LoaderConfig } from './types.js';
/**
 * IntentLoader class for loading DeploymentIntent from various sources.
 *
 * Features:
 * - Supports files up to 100MB with streaming
 * - Detects encoding (UTF-8, UTF-16LE, UTF-16BE)
 * - Detects format (JSON, YAML)
 * - Preserves source location metadata for error reporting
 * - All parsing is deterministic
 */
export declare class IntentLoader implements IIntentLoader {
    private readonly config;
    constructor(config?: Partial<LoaderConfig>);
    /**
     * Load a deployment intent from a file path.
     * Supports files up to 100MB with automatic streaming for large files.
     *
     * @param path - Absolute path to the intent file (JSON or YAML)
     * @returns Parsed intent with source location metadata
     * @throws LoaderError on file access, encoding, or parsing failures
     */
    loadFromFile(path: string): Promise<ParsedIntent>;
    /**
     * Load a deployment intent from a string content.
     *
     * @param content - The intent content as a string
     * @param format - The format of the content (optional, auto-detected if not provided)
     * @returns Parsed intent with source location metadata
     * @throws LoaderError on parsing failures
     */
    loadFromString(content: string, format?: IntentFormat): ParsedIntent;
    /**
     * Load a deployment intent from a readable stream.
     * Designed for processing large files (up to 100MB) efficiently.
     *
     * @param stream - The readable stream containing the intent
     * @param format - The format of the content (optional, auto-detected if not provided)
     * @returns Parsed intent with source location metadata
     * @throws LoaderError on streaming or parsing failures
     */
    loadFromStream(stream: Readable, format?: IntentFormat): Promise<ParsedIntent>;
    /**
     * Detect the format of content based on its structure.
     *
     * @param content - The content to analyze
     * @returns The detected format or 'unknown' if detection fails
     */
    detectFormat(content: string): IntentFormat;
    /**
     * Load from file using streaming for large files.
     */
    private loadFromFileStream;
    /**
     * Validate file access permissions.
     */
    private validateFileAccess;
    /**
     * Read file with timeout.
     */
    private readFileWithTimeout;
    /**
     * Detect encoding from buffer content.
     * Checks for BOM and validates encoding.
     */
    private detectEncoding;
    /**
     * Validate UTF-8 byte sequences.
     */
    private isValidUTF8;
    /**
     * Decode buffer to string using detected encoding.
     */
    private decodeBuffer;
    /**
     * Detect format from content.
     */
    private detectFormatInternal;
    /**
     * Parse content and create ParsedIntent (async wrapper).
     */
    private parseContent;
    /**
     * Parse content and create ParsedIntent (synchronous).
     */
    private parseContentSync;
}
/**
 * Create a new IntentLoader with default configuration.
 */
export declare function createIntentLoader(config?: Partial<LoaderConfig>): IntentLoader;
/**
 * Convenience function to load an intent from a file path.
 */
export declare function loadIntentFromFile(path: string): Promise<ParsedIntent>;
/**
 * Convenience function to load an intent from a string.
 */
export declare function loadIntentFromString(content: string, format?: IntentFormat): ParsedIntent;
//# sourceMappingURL=IntentLoader.d.ts.map