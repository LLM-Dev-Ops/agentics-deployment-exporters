/**
 * IntentParser - Deterministic JSON and YAML parsing for DeploymentIntent.
 *
 * This module provides parsing functions that are:
 * - Deterministic: Same input always produces identical output
 * - Fail-fast: Invalid input is rejected immediately
 * - Location-aware: Tracks source locations for error reporting
 */

import * as yaml from 'yaml';
import type { SourceMap } from '../types.js';
import {
  SourceMapBuilder,
  LoaderError,
  LoaderErrorCodes,
  type ParserOptions,
  DEFAULT_PARSER_OPTIONS,
} from './types.js';

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
export function parseJSON(
  content: string,
  options: ParserOptions = DEFAULT_PARSER_OPTIONS
): ParseResult {
  // Fail-fast: reject empty content immediately
  if (!content || content.trim().length === 0) {
    throw new LoaderError(
      LoaderErrorCodes.EMPTY_CONTENT,
      'Content is empty or contains only whitespace'
    );
  }

  const sourceMapBuilder = new SourceMapBuilder();

  try {
    // Use native JSON.parse for deterministic parsing
    const data = JSON.parse(content) as unknown;

    // Validate that result is an object
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      throw new LoaderError(
        LoaderErrorCodes.INVALID_STRUCTURE,
        'Parsed content must be an object, not an array or primitive'
      );
    }

    // Validate structure depth and key count if strict mode
    if (options.strict) {
      validateStructure(data as Record<string, unknown>, options, []);
    }

    // Track source locations if enabled
    if (options.trackLocations) {
      buildJSONSourceMap(content, data as Record<string, unknown>, sourceMapBuilder);
    }

    return {
      data: data as Readonly<Record<string, unknown>>,
      sourceMap: sourceMapBuilder.build(),
    };
  } catch (error) {
    if (error instanceof LoaderError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      // Extract position from error message if available
      const position = extractJSONErrorPosition(error.message, content);

      throw new LoaderError(
        LoaderErrorCodes.JSON_PARSE_ERROR,
        `JSON parsing failed: ${error.message}`,
        position
          ? { line: position.line, column: position.column, cause: error }
          : { cause: error }
      );
    }

    const cause = error instanceof Error ? error : undefined;
    throw new LoaderError(
      LoaderErrorCodes.JSON_PARSE_ERROR,
      `Unexpected error during JSON parsing: ${String(error)}`,
      cause ? { cause } : undefined
    );
  }
}

/**
 * Parse YAML content with source location tracking.
 * This function is deterministic - same input always produces identical output.
 *
 * @param content - The YAML string to parse
 * @param options - Parser options for controlling behavior
 * @returns ParseResult with data and source map
 * @throws LoaderError on parsing failures
 */
export function parseYAML(
  content: string,
  options: ParserOptions = DEFAULT_PARSER_OPTIONS
): ParseResult {
  // Fail-fast: reject empty content immediately
  if (!content || content.trim().length === 0) {
    throw new LoaderError(
      LoaderErrorCodes.EMPTY_CONTENT,
      'Content is empty or contains only whitespace'
    );
  }

  const sourceMapBuilder = new SourceMapBuilder();

  try {
    // Parse YAML with strict options for determinism
    const doc = yaml.parseDocument(content, {
      strict: options.strict,
      uniqueKeys: true,
    });

    // Check for parsing errors
    if (doc.errors && doc.errors.length > 0) {
      const firstError = doc.errors[0];
      if (firstError) {
        const pos = firstError.pos ? getYAMLPosition(content, firstError.pos[0] ?? 0) : undefined;

        throw new LoaderError(
          LoaderErrorCodes.YAML_PARSE_ERROR,
          `YAML parsing failed: ${firstError.message}`,
          pos ? { line: pos.line, column: pos.column } : undefined
        );
      }
    }

    // Check for warnings in strict mode
    if (options.strict && doc.warnings && doc.warnings.length > 0) {
      const firstWarning = doc.warnings[0];
      if (firstWarning) {
        const pos = firstWarning.pos ? getYAMLPosition(content, firstWarning.pos[0] ?? 0) : undefined;

        throw new LoaderError(
          LoaderErrorCodes.YAML_PARSE_ERROR,
          `YAML parsing warning (strict mode): ${firstWarning.message}`,
          pos ? { line: pos.line, column: pos.column } : undefined
        );
      }
    }

    // Convert to JavaScript object
    const data = doc.toJS() as unknown;

    // Validate that result is an object
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      throw new LoaderError(
        LoaderErrorCodes.INVALID_STRUCTURE,
        'Parsed content must be an object, not an array or primitive'
      );
    }

    // Validate structure depth and key count if strict mode
    if (options.strict) {
      validateStructure(data as Record<string, unknown>, options, []);
    }

    // Track source locations if enabled
    if (options.trackLocations) {
      buildYAMLSourceMap(doc, sourceMapBuilder, '$');
    }

    return {
      data: data as Readonly<Record<string, unknown>>,
      sourceMap: sourceMapBuilder.build(),
    };
  } catch (error) {
    if (error instanceof LoaderError) {
      throw error;
    }

    if (error instanceof yaml.YAMLError) {
      const pos = error.pos ? getYAMLPosition(content, error.pos[0] ?? 0) : undefined;

      throw new LoaderError(
        LoaderErrorCodes.YAML_PARSE_ERROR,
        `YAML parsing failed: ${error.message}`,
        pos
          ? { line: pos.line, column: pos.column, cause: error }
          : { cause: error }
      );
    }

    const cause = error instanceof Error ? error : undefined;
    throw new LoaderError(
      LoaderErrorCodes.YAML_PARSE_ERROR,
      `Unexpected error during YAML parsing: ${String(error)}`,
      cause ? { cause } : undefined
    );
  }
}

/**
 * Validate structure depth and key count.
 * Fail-fast on constraint violations.
 */
function validateStructure(
  data: Record<string, unknown>,
  options: ParserOptions,
  path: string[]
): void {
  // Check depth
  if (path.length > options.maxDepth) {
    throw new LoaderError(
      LoaderErrorCodes.MAX_DEPTH_EXCEEDED,
      `Maximum nesting depth of ${options.maxDepth} exceeded at path: ${path.join('.')}`,
      { details: { path: path.join('.'), maxDepth: options.maxDepth } }
    );
  }

  const keys = Object.keys(data);

  // Check key count
  if (keys.length > options.maxKeys) {
    throw new LoaderError(
      LoaderErrorCodes.MAX_KEYS_EXCEEDED,
      `Maximum key count of ${options.maxKeys} exceeded at path: ${path.join('.') || '$'}`,
      { details: { path: path.join('.') || '$', keyCount: keys.length, maxKeys: options.maxKeys } }
    );
  }

  for (const key of keys) {
    const value = data[key];
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            validateStructure(item as Record<string, unknown>, options, [...path, key, String(i)]);
          }
        }
      } else if (typeof value === 'object') {
        validateStructure(value as Record<string, unknown>, options, [...path, key]);
      }
    }
  }
}

/**
 * Extract error position from JSON.parse error message.
 */
function extractJSONErrorPosition(
  message: string,
  content: string
): { line: number; column: number } | undefined {
  // Try to extract position from common error formats
  // Format: "at position N" or "at line N column N"
  const positionMatch = message.match(/at position (\d+)/i);
  if (positionMatch) {
    const offsetStr = positionMatch[1];
    if (offsetStr) {
      const offset = parseInt(offsetStr, 10);
      return offsetToLineColumn(content, offset);
    }
  }

  const lineColMatch = message.match(/line (\d+) column (\d+)/i);
  if (lineColMatch) {
    const lineStr = lineColMatch[1];
    const colStr = lineColMatch[2];
    if (lineStr && colStr) {
      return {
        line: parseInt(lineStr, 10),
        column: parseInt(colStr, 10),
      };
    }
  }

  return undefined;
}

/**
 * Convert byte offset to line and column numbers.
 */
function offsetToLineColumn(
  content: string,
  offset: number
): { line: number; column: number } {
  let line = 1;
  let column = 1;

  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }

  return { line, column };
}

/**
 * Build source map from JSON content.
 * Uses character position tracking for location mapping.
 */
function buildJSONSourceMap(
  content: string,
  data: Record<string, unknown>,
  sourceMap: SourceMapBuilder,
  path: string = '$',
  searchStart: number = 0
): number {
  // Find object start
  const objectStart = content.indexOf('{', searchStart);
  if (objectStart !== -1) {
    const loc = offsetToLineColumn(content, objectStart);
    sourceMap.setLocation(path, { ...loc, offset: objectStart });
  }

  let pos = objectStart + 1;
  const keys = Object.keys(data);

  for (const key of keys) {
    // Find the key in the content
    const keyPattern = `"${escapeRegExp(key)}"`;
    const keyRegex = new RegExp(keyPattern);
    const remaining = content.slice(pos);
    const keyMatch = remaining.match(keyRegex);

    if (keyMatch && keyMatch.index !== undefined) {
      const keyPos = pos + keyMatch.index;
      const keyLoc = offsetToLineColumn(content, keyPos);
      sourceMap.setLocation(`${path}.${key}`, { ...keyLoc, offset: keyPos });
      pos = keyPos + key.length + 2; // Skip past key and quotes
    }

    const value = data[key];
    if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        const arrayStart = content.indexOf('[', pos);
        if (arrayStart !== -1) {
          const arrLoc = offsetToLineColumn(content, arrayStart);
          sourceMap.setLocation(`${path}.${key}`, { ...arrLoc, offset: arrayStart });
          pos = arrayStart + 1;
          for (let i = 0; i < value.length; i++) {
            const item = value[i];
            if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
              pos = buildJSONSourceMap(
                content,
                item as Record<string, unknown>,
                sourceMap,
                `${path}.${key}[${i}]`,
                pos
              );
            }
          }
        }
      } else {
        pos = buildJSONSourceMap(
          content,
          value as Record<string, unknown>,
          sourceMap,
          `${path}.${key}`,
          pos
        );
      }
    }
  }

  return pos;
}

/**
 * Build source map from YAML document.
 */
function buildYAMLSourceMap(
  node: yaml.Document | yaml.Node | null,
  sourceMap: SourceMapBuilder,
  path: string
): void {
  if (!node) {
    return;
  }

  // Handle Document node
  if (node instanceof yaml.Document) {
    if (node.contents) {
      buildYAMLSourceMap(node.contents, sourceMap, path);
    }
    return;
  }

  // Track node location if available
  if (node.range) {
    const [start] = node.range;
    sourceMap.setLocation(path, {
      line: 0, // Will be computed from offset
      column: 0,
      offset: start ?? 0,
    });
  }

  // Handle different node types
  if (yaml.isMap(node)) {
    for (const item of node.items) {
      const key = yaml.isScalar(item.key) ? String(item.key.value) : String(item.key);
      const childPath = `${path}.${key}`;

      if (item.key && yaml.isScalar(item.key) && item.key.range) {
        sourceMap.setLocation(childPath, {
          line: 0,
          column: 0,
          offset: item.key.range[0] ?? 0,
        });
      }

      if (item.value && yaml.isNode(item.value)) {
        buildYAMLSourceMap(item.value, sourceMap, childPath);
      }
    }
  } else if (yaml.isSeq(node)) {
    for (let i = 0; i < node.items.length; i++) {
      const item = node.items[i];
      if (item !== null && item !== undefined && yaml.isNode(item)) {
        buildYAMLSourceMap(item, sourceMap, `${path}[${i}]`);
      }
    }
  }
}

/**
 * Get line and column from YAML position.
 */
function getYAMLPosition(
  content: string,
  offset: number
): { line: number; column: number } {
  return offsetToLineColumn(content, offset);
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Verify that parsing is deterministic by comparing two parses.
 * Used for testing and validation.
 */
export function verifyDeterminism(
  content: string,
  format: 'json' | 'yaml',
  options: ParserOptions = DEFAULT_PARSER_OPTIONS
): boolean {
  const parse = format === 'json' ? parseJSON : parseYAML;

  const result1 = parse(content, options);
  const result2 = parse(content, options);

  // Compare serialized results for byte-equality
  const str1 = JSON.stringify(result1.data);
  const str2 = JSON.stringify(result2.data);

  return str1 === str2;
}
