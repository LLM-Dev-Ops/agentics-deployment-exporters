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

import { createReadStream, promises as fs, constants as fsConstants } from 'node:fs';
import type { Readable } from 'node:stream';

import type { IIntentLoader } from '../interfaces.js';
import type { ParsedIntent, IntentFormat } from '../types.js';
import { parseJSON, parseYAML } from './IntentParser.js';
import {
  type LoaderConfig,
  DEFAULT_LOADER_CONFIG,
  LoaderError,
  LoaderErrorCodes,
  type EncodingDetectionResult,
  type FormatDetectionResult,
} from './types.js';

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
export class IntentLoader implements IIntentLoader {
  private readonly config: LoaderConfig;

  constructor(config: Partial<LoaderConfig> = {}) {
    this.config = { ...DEFAULT_LOADER_CONFIG, ...config };
  }

  /**
   * Load a deployment intent from a file path.
   * Supports files up to 100MB with automatic streaming for large files.
   *
   * @param path - Absolute path to the intent file (JSON or YAML)
   * @returns Parsed intent with source location metadata
   * @throws LoaderError on file access, encoding, or parsing failures
   */
  async loadFromFile(path: string): Promise<ParsedIntent> {
    // Validate file exists and is accessible
    await this.validateFileAccess(path);

    // Get file stats
    const stats = await fs.stat(path);

    // Validate file size
    if (stats.size > this.config.maxFileSize) {
      throw new LoaderError(
        LoaderErrorCodes.FILE_TOO_LARGE,
        `File size ${stats.size} bytes exceeds maximum allowed size of ${this.config.maxFileSize} bytes`,
        {
          path,
          details: {
            fileSize: stats.size,
            maxSize: this.config.maxFileSize,
          },
        }
      );
    }

    // For smaller files, read directly; for larger files, use streaming
    const STREAM_THRESHOLD = 10 * 1024 * 1024; // 10MB

    if (stats.size > STREAM_THRESHOLD) {
      return this.loadFromFileStream(path);
    }

    // Read file content
    const buffer = await this.readFileWithTimeout(path);

    // Detect and validate encoding
    const encodingResult = this.detectEncoding(buffer);

    // Decode content to string
    const content = this.decodeBuffer(buffer, encodingResult);

    // Detect format
    const formatResult = this.detectFormatInternal(content);

    if (formatResult.format === 'unknown') {
      throw new LoaderError(
        LoaderErrorCodes.FORMAT_DETECTION_FAILED,
        `Unable to detect file format: ${formatResult.reason}`,
        { path }
      );
    }

    // Parse content
    return this.parseContent(content, formatResult.format);
  }

  /**
   * Load a deployment intent from a string content.
   *
   * @param content - The intent content as a string
   * @param format - The format of the content (optional, auto-detected if not provided)
   * @returns Parsed intent with source location metadata
   * @throws LoaderError on parsing failures
   */
  loadFromString(content: string, format?: IntentFormat): ParsedIntent {
    // Fail-fast: validate input
    if (!content) {
      throw new LoaderError(
        LoaderErrorCodes.EMPTY_CONTENT,
        'Content is empty or undefined'
      );
    }

    // Detect format if not provided
    const effectiveFormat = format ?? this.detectFormat(content);

    if (effectiveFormat === 'unknown') {
      throw new LoaderError(
        LoaderErrorCodes.FORMAT_DETECTION_FAILED,
        'Unable to detect content format'
      );
    }

    return this.parseContentSync(content, effectiveFormat);
  }

  /**
   * Load a deployment intent from a readable stream.
   * Designed for processing large files (up to 100MB) efficiently.
   *
   * @param stream - The readable stream containing the intent
   * @param format - The format of the content (optional, auto-detected if not provided)
   * @returns Parsed intent with source location metadata
   * @throws LoaderError on streaming or parsing failures
   */
  async loadFromStream(stream: Readable, format?: IntentFormat): Promise<ParsedIntent> {
    // Collect chunks with size limit
    const chunks: Buffer[] = [];
    let totalSize = 0;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        stream.destroy();
        reject(
          new LoaderError(
            LoaderErrorCodes.STREAM_TIMEOUT,
            `Stream read timeout after ${this.config.timeout}ms`
          )
        );
      }, this.config.timeout);

      stream.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;

        if (totalSize > this.config.maxFileSize) {
          stream.destroy();
          clearTimeout(timeout);
          reject(
            new LoaderError(
              LoaderErrorCodes.FILE_TOO_LARGE,
              `Stream size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`
            )
          );
          return;
        }

        chunks.push(chunk);
      });

      stream.on('end', () => {
        clearTimeout(timeout);

        try {
          const buffer = Buffer.concat(chunks);
          const encodingResult = this.detectEncoding(buffer);
          const content = this.decodeBuffer(buffer, encodingResult);

          // Detect format if not provided
          const effectiveFormat = format ?? this.detectFormat(content);

          if (effectiveFormat === 'unknown') {
            reject(
              new LoaderError(
                LoaderErrorCodes.FORMAT_DETECTION_FAILED,
                'Unable to detect content format'
              )
            );
            return;
          }

          const result = this.parseContentSync(content, effectiveFormat);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', (error: Error) => {
        clearTimeout(timeout);
        reject(
          new LoaderError(
            LoaderErrorCodes.STREAM_READ_ERROR,
            `Error reading from stream: ${error.message}`,
            { cause: error }
          )
        );
      });
    });
  }

  /**
   * Detect the format of content based on its structure.
   *
   * @param content - The content to analyze
   * @returns The detected format or 'unknown' if detection fails
   */
  detectFormat(content: string): IntentFormat {
    return this.detectFormatInternal(content).format;
  }

  /**
   * Load from file using streaming for large files.
   */
  private async loadFromFileStream(path: string): Promise<ParsedIntent> {
    const chunks: Buffer[] = [];
    let totalSize = 0;

    return new Promise((resolve, reject) => {
      const stream = createReadStream(path, {
        highWaterMark: this.config.streamBufferSize,
      });

      const timeout = setTimeout(() => {
        stream.destroy();
        reject(
          new LoaderError(
            LoaderErrorCodes.STREAM_TIMEOUT,
            `File read timeout after ${this.config.timeout}ms`,
            { path }
          )
        );
      }, this.config.timeout);

      stream.on('data', (chunk: Buffer | string) => {
        const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
        totalSize += buffer.length;

        if (totalSize > this.config.maxFileSize) {
          stream.destroy();
          clearTimeout(timeout);
          reject(
            new LoaderError(
              LoaderErrorCodes.FILE_TOO_LARGE,
              `File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`,
              { path }
            )
          );
          return;
        }

        chunks.push(buffer);
      });

      stream.on('end', () => {
        clearTimeout(timeout);

        try {
          const buffer = Buffer.concat(chunks);
          const encodingResult = this.detectEncoding(buffer);
          const content = this.decodeBuffer(buffer, encodingResult);
          const formatResult = this.detectFormatInternal(content);

          if (formatResult.format === 'unknown') {
            reject(
              new LoaderError(
                LoaderErrorCodes.FORMAT_DETECTION_FAILED,
                `Unable to detect file format: ${formatResult.reason}`,
                { path }
              )
            );
            return;
          }

          const result = this.parseContentSync(content, formatResult.format);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', (error: Error) => {
        clearTimeout(timeout);
        reject(
          new LoaderError(
            LoaderErrorCodes.FILE_READ_ERROR,
            `Error reading file: ${error.message}`,
            { path, cause: error }
          )
        );
      });
    });
  }

  /**
   * Validate file access permissions.
   */
  private async validateFileAccess(path: string): Promise<void> {
    try {
      await fs.access(path, fsConstants.R_OK);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new LoaderError(
          LoaderErrorCodes.FILE_NOT_FOUND,
          `File not found: ${path}`,
          { path, cause: error as Error }
        );
      }

      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new LoaderError(
          LoaderErrorCodes.FILE_ACCESS_DENIED,
          `Permission denied: ${path}`,
          { path, cause: error as Error }
        );
      }

      throw new LoaderError(
        LoaderErrorCodes.FILE_READ_ERROR,
        `Error accessing file: ${(error as Error).message}`,
        { path, cause: error as Error }
      );
    }
  }

  /**
   * Read file with timeout.
   */
  private async readFileWithTimeout(path: string): Promise<Buffer> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const buffer = await fs.readFile(path, { signal: controller.signal });
      return buffer;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new LoaderError(
          LoaderErrorCodes.STREAM_TIMEOUT,
          `File read timeout after ${this.config.timeout}ms`,
          { path }
        );
      }

      throw new LoaderError(
        LoaderErrorCodes.FILE_READ_ERROR,
        `Error reading file: ${(error as Error).message}`,
        { path, cause: error as Error }
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Detect encoding from buffer content.
   * Checks for BOM and validates encoding.
   */
  private detectEncoding(buffer: Buffer): EncodingDetectionResult {
    // Check for BOM (Byte Order Mark)
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return {
        encoding: 'utf-8',
        confidence: 1.0,
        bom: 'utf-8',
        skipBytes: 3,
      };
    }

    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      return {
        encoding: 'utf-16le',
        confidence: 1.0,
        bom: 'utf-16le',
        skipBytes: 2,
      };
    }

    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
      return {
        encoding: 'utf-16be',
        confidence: 1.0,
        bom: 'utf-16be',
        skipBytes: 2,
      };
    }

    // No BOM - try to detect encoding heuristically
    // Check for null bytes which indicate UTF-16
    let hasNullBytes = false;
    const nullBytePositions: ('odd' | 'even')[] = [];

    for (let i = 0; i < Math.min(buffer.length, 1000); i++) {
      if (buffer[i] === 0) {
        hasNullBytes = true;
        nullBytePositions.push(i % 2 === 0 ? 'even' : 'odd');
      }
    }

    if (hasNullBytes) {
      const evenCount = nullBytePositions.filter((p) => p === 'even').length;
      const oddCount = nullBytePositions.filter((p) => p === 'odd').length;

      if (evenCount > oddCount * 2) {
        return {
          encoding: 'utf-16be',
          confidence: 0.8,
          bom: 'none',
          skipBytes: 0,
        };
      }

      if (oddCount > evenCount * 2) {
        return {
          encoding: 'utf-16le',
          confidence: 0.8,
          bom: 'none',
          skipBytes: 0,
        };
      }
    }

    // Default to UTF-8
    // Validate UTF-8 sequences
    if (this.config.strictEncoding && !this.isValidUTF8(buffer)) {
      throw new LoaderError(
        LoaderErrorCodes.INVALID_UTF8_SEQUENCE,
        'Invalid UTF-8 byte sequence detected'
      );
    }

    return {
      encoding: 'utf-8',
      confidence: hasNullBytes ? 0.5 : 0.9,
      bom: 'none',
      skipBytes: 0,
    };
  }

  /**
   * Validate UTF-8 byte sequences.
   */
  private isValidUTF8(buffer: Buffer): boolean {
    let i = 0;

    while (i < buffer.length) {
      const byte = buffer[i];

      if (byte === undefined) {
        break;
      }

      if (byte <= 0x7f) {
        // ASCII
        i++;
      } else if ((byte & 0xe0) === 0xc0) {
        // 2-byte sequence
        const next = buffer[i + 1];
        if (i + 1 >= buffer.length || next === undefined || (next & 0xc0) !== 0x80) {
          return false;
        }
        i += 2;
      } else if ((byte & 0xf0) === 0xe0) {
        // 3-byte sequence
        const next1 = buffer[i + 1];
        const next2 = buffer[i + 2];
        if (
          i + 2 >= buffer.length ||
          next1 === undefined ||
          next2 === undefined ||
          (next1 & 0xc0) !== 0x80 ||
          (next2 & 0xc0) !== 0x80
        ) {
          return false;
        }
        i += 3;
      } else if ((byte & 0xf8) === 0xf0) {
        // 4-byte sequence
        const next1 = buffer[i + 1];
        const next2 = buffer[i + 2];
        const next3 = buffer[i + 3];
        if (
          i + 3 >= buffer.length ||
          next1 === undefined ||
          next2 === undefined ||
          next3 === undefined ||
          (next1 & 0xc0) !== 0x80 ||
          (next2 & 0xc0) !== 0x80 ||
          (next3 & 0xc0) !== 0x80
        ) {
          return false;
        }
        i += 4;
      } else {
        return false;
      }
    }

    return true;
  }

  /**
   * Decode buffer to string using detected encoding.
   */
  private decodeBuffer(buffer: Buffer, encoding: EncodingDetectionResult): string {
    const contentBuffer = encoding.skipBytes > 0 ? buffer.subarray(encoding.skipBytes) : buffer;

    switch (encoding.encoding) {
      case 'utf-8':
        return contentBuffer.toString('utf-8');
      case 'utf-16le':
        return contentBuffer.toString('utf16le');
      case 'utf-16be':
        // Node.js doesn't have native UTF-16BE support, swap bytes
        const swapped = Buffer.alloc(contentBuffer.length);
        for (let i = 0; i < contentBuffer.length - 1; i += 2) {
          const byte1 = contentBuffer[i + 1];
          const byte2 = contentBuffer[i];
          if (byte1 !== undefined && byte2 !== undefined) {
            swapped[i] = byte1;
            swapped[i + 1] = byte2;
          }
        }
        return swapped.toString('utf16le');
      default:
        return contentBuffer.toString('utf-8');
    }
  }

  /**
   * Detect format from content.
   */
  private detectFormatInternal(content: string): FormatDetectionResult {
    const trimmed = content.trim();

    if (!trimmed) {
      return {
        format: 'unknown',
        confidence: 0,
        reason: 'Content is empty',
      };
    }

    // Check for JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(trimmed);
        return {
          format: 'json',
          confidence: 1.0,
          reason: 'Valid JSON structure detected',
        };
      } catch {
        // Could be YAML that starts with { or [
      }
    }

    // Check for YAML indicators
    const yamlIndicators = [
      /^---\s*$/m, // Document start
      /^[a-zA-Z_][a-zA-Z0-9_]*:\s/, // Key-value pair
      /^\s*-\s+/, // List item
      /^%YAML/, // YAML directive
    ];

    for (const pattern of yamlIndicators) {
      if (pattern.test(trimmed)) {
        return {
          format: 'yaml',
          confidence: 0.9,
          reason: 'YAML structure indicators detected',
        };
      }
    }

    // Try parsing as JSON first (more strict)
    try {
      JSON.parse(trimmed);
      return {
        format: 'json',
        confidence: 0.8,
        reason: 'Content parses as valid JSON',
      };
    } catch {
      // Not valid JSON
    }

    // Try parsing as YAML (more lenient)
    if (/^[a-zA-Z_][a-zA-Z0-9_]*:/.test(trimmed)) {
      return {
        format: 'yaml',
        confidence: 0.7,
        reason: 'Content appears to be YAML',
      };
    }

    return {
      format: 'unknown',
      confidence: 0,
      reason: 'Unable to determine format from content structure',
    };
  }

  /**
   * Parse content and create ParsedIntent (async wrapper).
   */
  private async parseContent(
    content: string,
    format: 'json' | 'yaml'
  ): Promise<ParsedIntent> {
    return this.parseContentSync(content, format);
  }

  /**
   * Parse content and create ParsedIntent (synchronous).
   */
  private parseContentSync(
    content: string,
    format: 'json' | 'yaml'
  ): ParsedIntent {
    // Parse content based on format
    const parseResult = format === 'json' ? parseJSON(content) : parseYAML(content);

    // Create ParsedIntent
    const parsedIntent: ParsedIntent = {
      data: parseResult.data,
      sourceMap: parseResult.sourceMap,
      format,
      source: content,
    };

    return parsedIntent;
  }
}

/**
 * Create a new IntentLoader with default configuration.
 */
export function createIntentLoader(config?: Partial<LoaderConfig>): IntentLoader {
  return new IntentLoader(config);
}

/**
 * Convenience function to load an intent from a file path.
 */
export async function loadIntentFromFile(path: string): Promise<ParsedIntent> {
  const loader = new IntentLoader();
  return loader.loadFromFile(path);
}

/**
 * Convenience function to load an intent from a string.
 */
export function loadIntentFromString(
  content: string,
  format?: IntentFormat
): ParsedIntent {
  const loader = new IntentLoader();
  return loader.loadFromString(content, format);
}
