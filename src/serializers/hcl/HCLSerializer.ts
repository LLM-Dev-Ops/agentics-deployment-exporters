/**
 * HCL Serializer
 *
 * This module provides HCL (HashiCorp Configuration Language) serialization
 * for Terraform configurations. All operations are pure and deterministic.
 *
 * Features:
 * - Proper block formatting
 * - Attribute alignment
 * - Expression handling (var.xxx, local.xxx)
 * - Multi-line strings (heredoc)
 * - Support for resources, variables, outputs, providers
 *
 * @module serializers/hcl/HCLSerializer
 * @version 1.0.0
 */

import {
  BaseSerializer,
  ParseError,
  validationFromError,
} from '../base/BaseSerializer.js';
import type {
  HCLDocument,
  HCLSerializerOptions,
  SerializerFormat,
  ValidationResult,
} from '../base/types.js';
import {
  createValidResult,
  DEFAULT_HCL_OPTIONS,
} from '../base/types.js';
import {
  createFormatterState,
  escapeHCLString,
  formatBlock,
  formatHeredoc,
  groupBlocksByType,
  incrementIndent,
  quoteHCLIdentifier,
  shouldUseHeredoc,
  sortBlocksInGroup,
} from './HCLFormatter.js';

// =============================================================================
// HCL SERIALIZER
// =============================================================================

/**
 * HCL Serializer for Terraform configurations.
 *
 * This serializer converts JavaScript objects to HCL format.
 * It supports all standard HCL constructs including:
 * - Resources
 * - Data sources
 * - Variables
 * - Outputs
 * - Locals
 * - Providers
 * - Modules
 *
 * @example
 * ```typescript
 * const serializer = new HCLSerializer();
 *
 * const hcl = serializer.serialize({
 *   resource: {
 *     aws_instance: {
 *       web: {
 *         ami: 'ami-12345',
 *         instance_type: 't2.micro',
 *       }
 *     }
 *   }
 * });
 * ```
 */
export class HCLSerializer extends BaseSerializer<HCLSerializerOptions> {
  public readonly format: SerializerFormat = 'hcl';
  protected readonly defaultOptions: Required<HCLSerializerOptions> =
    DEFAULT_HCL_OPTIONS;

  constructor() {
    super('hcl');
  }

  // ===========================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ===========================================================================

  /**
   * Serialize data to HCL format.
   */
  protected doSerialize(
    data: unknown,
    options: Required<HCLSerializerOptions>
  ): string {
    if (data === null || data === undefined) {
      return '';
    }

    // Handle HCLDocument structure
    if (this.isHCLDocument(data)) {
      return this.serializeDocument(data, options);
    }

    // Handle raw object (Terraform-style structure)
    if (typeof data === 'object' && !Array.isArray(data)) {
      return this.serializeRawObject(
        data as Record<string, unknown>,
        options
      );
    }

    throw new Error(
      'HCL serialization requires an object or HCLDocument structure'
    );
  }

  /**
   * Deserialize HCL to structured data.
   *
   * Note: Full HCL parsing is complex; this provides basic parsing
   * for common Terraform structures.
   */
  protected doDeserialize(text: string): unknown {
    // Basic HCL parsing
    // For production use, consider using a proper HCL parser library
    return this.parseHCL(text);
  }

  /**
   * Validate HCL content.
   */
  protected doValidate(text: string): ValidationResult {
    try {
      this.parseHCL(text);
      return createValidResult();
    } catch (error) {
      return validationFromError(error);
    }
  }

  // ===========================================================================
  // HCL DOCUMENT SERIALIZATION
  // ===========================================================================

  /**
   * Type guard for HCLDocument.
   */
  private isHCLDocument(data: unknown): data is HCLDocument {
    return (
      typeof data === 'object' &&
      data !== null &&
      'blocks' in data &&
      Array.isArray((data as HCLDocument).blocks)
    );
  }

  /**
   * Serialize an HCLDocument structure.
   */
  private serializeDocument(
    doc: HCLDocument,
    options: Required<HCLSerializerOptions>
  ): string {
    const state = createFormatterState(options);

    // Group and sort blocks for deterministic output
    const groups = groupBlocksByType(doc.blocks);
    const sections: string[] = [];

    for (const [_type, blocks] of groups) {
      const sortedBlocks = sortBlocksInGroup(blocks);
      const formattedBlocks = sortedBlocks.map((block) =>
        formatBlock(block, state)
      );

      sections.push(formattedBlocks.join('\n\n'));
    }

    return sections.join(
      options.blankLinesBetweenBlocks ? '\n\n' : '\n'
    );
  }

  // ===========================================================================
  // RAW OBJECT SERIALIZATION
  // ===========================================================================

  /**
   * Serialize a raw Terraform-style object.
   *
   * Expected structure:
   * ```
   * {
   *   resource: { type: { name: { ... } } },
   *   variable: { name: { ... } },
   *   output: { name: { ... } },
   *   ...
   * }
   * ```
   */
  private serializeRawObject(
    data: Record<string, unknown>,
    options: Required<HCLSerializerOptions>
  ): string {
    const state = createFormatterState(options);
    const sections: string[] = [];

    // Process in deterministic order
    const blockTypes = Object.keys(data).sort((a, b) =>
      this.getBlockTypeOrder(a) - this.getBlockTypeOrder(b)
    );

    for (const blockType of blockTypes) {
      const blockData = data[blockType];
      if (blockData === null || blockData === undefined) {
        continue;
      }

      const formatted = this.formatBlockType(
        blockType,
        blockData,
        state,
        options
      );
      if (formatted) {
        sections.push(formatted);
      }
    }

    return sections.join(options.blankLinesBetweenBlocks ? '\n\n' : '\n');
  }

  /**
   * Get ordering priority for block types.
   */
  private getBlockTypeOrder(type: string): number {
    const order: Record<string, number> = {
      terraform: 0,
      provider: 1,
      variable: 2,
      locals: 3,
      data: 4,
      resource: 5,
      module: 6,
      output: 7,
      moved: 8,
      import: 9,
    };
    return order[type] ?? 100;
  }

  /**
   * Format a block type section.
   */
  private formatBlockType(
    blockType: string,
    blockData: unknown,
    state: ReturnType<typeof createFormatterState>,
    options: Required<HCLSerializerOptions>
  ): string {
    if (typeof blockData !== 'object' || blockData === null) {
      return '';
    }

    // Special handling for locals (single block with attributes)
    if (blockType === 'locals') {
      return this.formatLocalsBlock(
        blockData as Record<string, unknown>,
        state
      );
    }

    // Handle two-level blocks (resource, data)
    if (blockType === 'resource' || blockType === 'data') {
      return this.formatTwoLevelBlocks(
        blockType,
        blockData as Record<string, Record<string, unknown>>,
        state,
        options
      );
    }

    // Handle single-level blocks (variable, output, provider, module)
    return this.formatSingleLevelBlocks(
      blockType,
      blockData as Record<string, unknown>,
      state,
      options
    );
  }

  /**
   * Format locals block.
   */
  private formatLocalsBlock(
    locals: Record<string, unknown>,
    state: ReturnType<typeof createFormatterState>
  ): string {
    const keys = Object.keys(locals).sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' })
    );

    if (keys.length === 0) {
      return '';
    }

    const maxKeyLength = Math.max(...keys.map((k) => k.length));
    const innerState = incrementIndent(state);
    const lines: string[] = [];

    for (const key of keys) {
      const value = locals[key];
      const formattedValue = this.formatValue(value, innerState);
      const paddedKey = state.options.alignAttributes
        ? key.padEnd(maxKeyLength)
        : key;
      lines.push(`  ${paddedKey} = ${formattedValue}`);
    }

    return `locals {\n${lines.join('\n')}\n}`;
  }

  /**
   * Format two-level blocks (resource, data).
   */
  private formatTwoLevelBlocks(
    blockType: string,
    blocks: Record<string, Record<string, unknown>>,
    state: ReturnType<typeof createFormatterState>,
    options: Required<HCLSerializerOptions>
  ): string {
    const result: string[] = [];

    // Sort by resource type
    const resourceTypes = Object.keys(blocks).sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' })
    );

    for (const resourceType of resourceTypes) {
      const resources = blocks[resourceType];
      if (!resources || typeof resources !== 'object') {
        continue;
      }

      // Sort by resource name
      const resourceNames = Object.keys(resources).sort((a, b) =>
        a.localeCompare(b, 'en', { sensitivity: 'base' })
      );

      for (const resourceName of resourceNames) {
        const resourceConfig = resources[resourceName];
        const block = this.formatResourceBlock(
          blockType,
          resourceType,
          resourceName,
          resourceConfig as Record<string, unknown>,
          state
        );
        result.push(block);
      }
    }

    return result.join(options.blankLinesBetweenBlocks ? '\n\n' : '\n');
  }

  /**
   * Format single-level blocks (variable, output, provider, module).
   */
  private formatSingleLevelBlocks(
    blockType: string,
    blocks: Record<string, unknown>,
    state: ReturnType<typeof createFormatterState>,
    options: Required<HCLSerializerOptions>
  ): string {
    const result: string[] = [];

    // Sort by name
    const names = Object.keys(blocks).sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' })
    );

    for (const name of names) {
      const config = blocks[name];
      const block = this.formatNamedBlock(
        blockType,
        name,
        config as Record<string, unknown>,
        state
      );
      result.push(block);
    }

    return result.join(options.blankLinesBetweenBlocks ? '\n\n' : '\n');
  }

  /**
   * Format a resource/data block.
   */
  private formatResourceBlock(
    blockType: string,
    resourceType: string,
    resourceName: string,
    config: Record<string, unknown>,
    state: ReturnType<typeof createFormatterState>
  ): string {
    const header = `${blockType} "${resourceType}" "${resourceName}" {`;
    const body = this.formatBlockBody(config, state);
    return `${header}\n${body}\n}`;
  }

  /**
   * Format a named block (variable, output, etc.).
   */
  private formatNamedBlock(
    blockType: string,
    name: string,
    config: Record<string, unknown>,
    state: ReturnType<typeof createFormatterState>
  ): string {
    const quotedName = `"${escapeHCLString(name)}"`;
    const header = `${blockType} ${quotedName} {`;
    const body = this.formatBlockBody(config, state);
    return `${header}\n${body}\n}`;
  }

  /**
   * Format block body (attributes and nested blocks).
   */
  private formatBlockBody(
    config: Record<string, unknown>,
    state: ReturnType<typeof createFormatterState>
  ): string {
    const innerState = incrementIndent(state);
    const lines: string[] = [];

    // Separate attributes from nested blocks
    const attributes: Record<string, unknown> = {};
    const nestedBlocks: Record<string, unknown[]> = {};

    for (const [key, value] of Object.entries(config)) {
      if (this.isNestedBlock(value)) {
        if (!nestedBlocks[key]) {
          nestedBlocks[key] = [];
        }
        if (Array.isArray(value)) {
          nestedBlocks[key].push(...value);
        } else {
          nestedBlocks[key].push(value);
        }
      } else {
        attributes[key] = value;
      }
    }

    // Format attributes
    const attrKeys = Object.keys(attributes).sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' })
    );
    const maxKeyLength =
      attrKeys.length > 0 ? Math.max(...attrKeys.map((k) => k.length)) : 0;

    for (const key of attrKeys) {
      const value = attributes[key];
      const formattedValue = this.formatValue(value, innerState);
      const paddedKey = state.options.alignAttributes
        ? key.padEnd(maxKeyLength)
        : key;
      lines.push(`  ${paddedKey} = ${formattedValue}`);
    }

    // Format nested blocks
    const blockKeys = Object.keys(nestedBlocks).sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' })
    );

    if (lines.length > 0 && blockKeys.length > 0) {
      lines.push('');
    }

    for (const blockKey of blockKeys) {
      const blockValues = nestedBlocks[blockKey]!;
      for (const blockValue of blockValues) {
        lines.push(
          this.formatNestedBlock(
            blockKey,
            blockValue as Record<string, unknown>,
            innerState
          )
        );
      }
    }

    return lines.join('\n');
  }

  /**
   * Check if a value should be a nested block.
   */
  private isNestedBlock(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (Array.isArray(value)) {
      return (
        value.length > 0 &&
        value.every((v) => typeof v === 'object' && v !== null && !Array.isArray(v))
      );
    }

    if (typeof value === 'object') {
      // Check if it looks like a nested block (has complex nested structure)
      const keys = Object.keys(value);
      return keys.some((k) => {
        const v = (value as Record<string, unknown>)[k];
        return typeof v === 'object' && v !== null && !Array.isArray(v);
      });
    }

    return false;
  }

  /**
   * Format a nested block.
   */
  private formatNestedBlock(
    name: string,
    config: Record<string, unknown>,
    state: ReturnType<typeof createFormatterState>
  ): string {
    const innerState = incrementIndent(state);
    const lines: string[] = [];

    const keys = Object.keys(config).sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' })
    );
    const maxKeyLength =
      keys.length > 0 ? Math.max(...keys.map((k) => k.length)) : 0;

    for (const key of keys) {
      const value = config[key];
      const formattedValue = this.formatValue(value, innerState);
      const paddedKey = state.options.alignAttributes
        ? key.padEnd(maxKeyLength)
        : key;
      lines.push(`    ${paddedKey} = ${formattedValue}`);
    }

    return `  ${name} {\n${lines.join('\n')}\n  }`;
  }

  // ===========================================================================
  // VALUE FORMATTING
  // ===========================================================================

  /**
   * Format a value for HCL output.
   */
  private formatValue(
    value: unknown,
    state: ReturnType<typeof createFormatterState>
  ): string {
    if (value === null || value === undefined) {
      return 'null';
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error(`Cannot serialize non-finite number: ${value}`);
      }
      if (Number.isInteger(value)) {
        return String(value);
      }
      return value.toFixed(15).replace(/\.?0+$/, '');
    }

    if (typeof value === 'bigint') {
      return String(value);
    }

    if (typeof value === 'string') {
      // Check for HCL references (var., local., etc.)
      if (this.isHCLReference(value)) {
        return value;
      }

      // Check if should use heredoc
      if (shouldUseHeredoc(value, state.options.lineWidth)) {
        return formatHeredoc(value, state);
      }

      return `"${escapeHCLString(value)}"`;
    }

    if (Array.isArray(value)) {
      return this.formatArray(value, state);
    }

    if (typeof value === 'object') {
      return this.formatObject(value as Record<string, unknown>, state);
    }

    throw new Error(`Cannot format value of type: ${typeof value}`);
  }

  /**
   * Check if a string is an HCL reference.
   */
  private isHCLReference(value: string): boolean {
    // Common Terraform references
    const referencePatterns = [
      /^var\.[a-zA-Z_][a-zA-Z0-9_]*$/,
      /^local\.[a-zA-Z_][a-zA-Z0-9_]*$/,
      /^data\.[a-zA-Z_][a-zA-Z0-9_.-]*$/,
      /^module\.[a-zA-Z_][a-zA-Z0-9_.-]*$/,
      /^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_.-]*$/,
      /^\$\{.+\}$/,
    ];

    return referencePatterns.some((pattern) => pattern.test(value));
  }

  /**
   * Format an array for HCL.
   */
  private formatArray(
    arr: unknown[],
    state: ReturnType<typeof createFormatterState>
  ): string {
    if (arr.length === 0) {
      return '[]';
    }

    const elements = arr.map((el) => this.formatValue(el, state));

    // Try single line first
    const singleLine = `[${elements.join(', ')}]`;
    if (
      singleLine.length <= state.options.lineWidth &&
      !singleLine.includes('\n')
    ) {
      return singleLine;
    }

    // Multi-line format
    const lines = elements.map((el) => `    ${el},`);

    return `[\n${lines.join('\n')}\n  ]`;
  }

  /**
   * Format an object for HCL.
   */
  private formatObject(
    obj: Record<string, unknown>,
    state: ReturnType<typeof createFormatterState>
  ): string {
    const keys = Object.keys(obj).sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' })
    );

    if (keys.length === 0) {
      return '{}';
    }

    const maxKeyLength = Math.max(...keys.map((k) => k.length));
    const innerState = incrementIndent(state);
    const lines: string[] = [];

    for (const key of keys) {
      const value = obj[key];
      const formattedValue = this.formatValue(value, innerState);
      const quotedKey = quoteHCLIdentifier(key, state.options.quoteKeys);
      const paddedKey = state.options.alignAttributes
        ? quotedKey.padEnd(maxKeyLength + (quotedKey.length - key.length))
        : quotedKey;
      lines.push(`    ${paddedKey} = ${formattedValue}`);
    }

    return `{\n${lines.join('\n')}\n  }`;
  }

  // ===========================================================================
  // HCL PARSING
  // ===========================================================================

  /**
   * Basic HCL parser.
   *
   * This provides basic parsing for Terraform-style HCL files.
   * For production use with complex HCL, consider a dedicated parser.
   */
  private parseHCL(text: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    let pos = 0;

    // Skip whitespace and comments
    const skipWhitespace = () => {
      while (pos < text.length) {
        // Skip whitespace
        if (/\s/.test(text[pos]!)) {
          pos++;
          continue;
        }
        // Skip line comments
        if (text[pos] === '#' || (text[pos] === '/' && text[pos + 1] === '/')) {
          while (pos < text.length && text[pos] !== '\n') {
            pos++;
          }
          continue;
        }
        // Skip block comments
        if (text[pos] === '/' && text[pos + 1] === '*') {
          pos += 2;
          while (pos < text.length - 1) {
            if (text[pos] === '*' && text[pos + 1] === '/') {
              pos += 2;
              break;
            }
            pos++;
          }
          continue;
        }
        break;
      }
    };

    // Parse identifier
    const parseIdentifier = (): string => {
      const start = pos;
      while (pos < text.length && /[a-zA-Z0-9_-]/.test(text[pos]!)) {
        pos++;
      }
      return text.slice(start, pos);
    };

    // Parse string
    const parseString = (): string => {
      if (text[pos] !== '"') {
        throw new ParseError(`Expected '"' at position ${pos}`);
      }
      pos++; // Skip opening quote
      let result = '';
      while (pos < text.length && text[pos] !== '"') {
        if (text[pos] === '\\' && pos + 1 < text.length) {
          pos++;
          switch (text[pos]) {
            case 'n':
              result += '\n';
              break;
            case 'r':
              result += '\r';
              break;
            case 't':
              result += '\t';
              break;
            case '"':
              result += '"';
              break;
            case '\\':
              result += '\\';
              break;
            default:
              result += text[pos];
          }
        } else {
          result += text[pos];
        }
        pos++;
      }
      pos++; // Skip closing quote
      return result;
    };

    // Parse value
    const parseValue = (): unknown => {
      skipWhitespace();

      // String
      if (text[pos] === '"') {
        return parseString();
      }

      // Object/Block
      if (text[pos] === '{') {
        return parseObject();
      }

      // Array
      if (text[pos] === '[') {
        return parseArray();
      }

      // Heredoc
      if (text[pos] === '<' && text[pos + 1] === '<') {
        return parseHeredoc();
      }

      // Number, boolean, null, or reference
      const start = pos;
      while (
        pos < text.length &&
        !/[\s=\[\]{}(),]/.test(text[pos]!) &&
        text[pos] !== '#'
      ) {
        pos++;
      }
      const value = text.slice(start, pos);

      if (value === 'true') return true;
      if (value === 'false') return false;
      if (value === 'null') return null;
      if (/^-?\d+\.?\d*([eE][+-]?\d+)?$/.test(value)) {
        return Number(value);
      }
      return value; // Reference or identifier
    };

    // Parse object
    const parseObject = (): Record<string, unknown> => {
      const obj: Record<string, unknown> = {};
      pos++; // Skip opening brace
      skipWhitespace();

      while (pos < text.length && text[pos] !== '}') {
        skipWhitespace();
        if (text[pos] === '}') break;

        // Parse key
        let key: string;
        if (text[pos] === '"') {
          key = parseString();
        } else {
          key = parseIdentifier();
        }

        skipWhitespace();

        // Check for = or nested block
        if (text[pos] === '=') {
          pos++; // Skip =
          obj[key] = parseValue();
        } else if (text[pos] === '{') {
          // Nested block
          obj[key] = parseObject();
        }

        skipWhitespace();
      }

      pos++; // Skip closing brace
      return obj;
    };

    // Parse array
    const parseArray = (): unknown[] => {
      const arr: unknown[] = [];
      pos++; // Skip opening bracket
      skipWhitespace();

      while (pos < text.length && text[pos] !== ']') {
        arr.push(parseValue());
        skipWhitespace();
        if (text[pos] === ',') {
          pos++;
          skipWhitespace();
        }
      }

      pos++; // Skip closing bracket
      return arr;
    };

    // Parse heredoc
    const parseHeredoc = (): string => {
      pos += 2; // Skip <<
      const indented = text[pos] === '-';
      if (indented) pos++;

      // Parse delimiter
      const delimStart = pos;
      while (pos < text.length && /[A-Z_]/.test(text[pos]!)) {
        pos++;
      }
      const delimiter = text.slice(delimStart, pos);

      // Skip to newline
      while (pos < text.length && text[pos] !== '\n') {
        pos++;
      }
      pos++; // Skip newline

      // Read content until delimiter
      let content = '';
      while (pos < text.length) {
        const lineStart = pos;
        while (pos < text.length && text[pos] !== '\n') {
          pos++;
        }
        const line = text.slice(lineStart, pos);
        if (line.trim() === delimiter) {
          pos++; // Skip newline
          break;
        }
        content += (content ? '\n' : '') + line;
        pos++; // Skip newline
      }

      return content;
    };

    // Parse top-level blocks
    while (pos < text.length) {
      skipWhitespace();
      if (pos >= text.length) break;

      const blockType = parseIdentifier();
      if (!blockType) break;

      skipWhitespace();

      // Parse labels
      const labels: string[] = [];
      while (text[pos] === '"') {
        labels.push(parseString());
        skipWhitespace();
      }

      // Parse block body
      if (text[pos] !== '{') {
        throw new ParseError(`Expected '{' after block labels at position ${pos}`);
      }

      const blockBody = parseObject();

      // Store in result based on block type and labels
      if (!result[blockType]) {
        result[blockType] = {};
      }

      if (labels.length === 0) {
        result[blockType] = blockBody;
      } else if (labels.length === 1) {
        (result[blockType] as Record<string, unknown>)[labels[0]!] = blockBody;
      } else {
        // Two-level (e.g., resource, data)
        const level1 = result[blockType] as Record<string, Record<string, unknown>>;
        if (!level1[labels[0]!]) {
          level1[labels[0]!] = {};
        }
        level1[labels[0]!]![labels[1]!] = blockBody;
      }

      skipWhitespace();
    }

    return result;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new HCL serializer instance.
 */
export function createHCLSerializer(): HCLSerializer {
  return new HCLSerializer();
}
