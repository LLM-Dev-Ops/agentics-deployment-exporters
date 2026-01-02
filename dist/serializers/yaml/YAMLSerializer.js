/**
 * YAML Serializer
 *
 * This module provides YAML serialization with deterministic output.
 * All operations are pure and produce identical output for identical input.
 *
 * Features:
 * - Multi-document support (---)
 * - Block style (default) vs flow style
 * - Proper quoting for special characters
 * - Anchor/alias handling
 * - Deterministic key ordering
 *
 * @module serializers/yaml/YAMLSerializer
 * @version 1.0.0
 */
import { BaseSerializer, validationFromError, } from '../base/BaseSerializer.js';
import { createValidResult, DEFAULT_YAML_OPTIONS, } from '../base/types.js';
import { createYAMLFormatterState, createYAMLIndent, determineYAMLQuoteStyle, escapeYAMLDoubleQuoted, escapeYAMLSingleQuoted, formatYAMLKey, formatYAMLLiteralBlock, incrementYAMLIndent, joinYAMLDocuments, needsYAMLQuoting, splitYAMLDocuments, YAML_DOC_START, } from './YAMLFormatter.js';
// =============================================================================
// YAML SERIALIZER
// =============================================================================
/**
 * YAML Serializer with deterministic output.
 *
 * This serializer converts JavaScript objects to YAML format with
 * guaranteed deterministic output. Keys are always sorted alphabetically
 * and formatting is consistent.
 *
 * @example
 * ```typescript
 * const serializer = new YAMLSerializer();
 *
 * const yaml = serializer.serialize({
 *   apiVersion: 'v1',
 *   kind: 'ConfigMap',
 *   metadata: { name: 'my-config' },
 *   data: { key: 'value' }
 * });
 * ```
 */
export class YAMLSerializer extends BaseSerializer {
    format = 'yaml';
    defaultOptions = DEFAULT_YAML_OPTIONS;
    constructor() {
        super('yaml');
    }
    // ===========================================================================
    // ABSTRACT METHOD IMPLEMENTATIONS
    // ===========================================================================
    /**
     * Serialize data to YAML format.
     */
    doSerialize(data, options) {
        const state = createYAMLFormatterState(options);
        // Handle multi-document
        if (Array.isArray(data) && options.multiDocument) {
            const documents = data.map((doc) => this.formatValue(doc, state));
            return joinYAMLDocuments(documents);
        }
        return this.formatValue(data, state);
    }
    /**
     * Deserialize YAML to structured data.
     */
    doDeserialize(text) {
        return this.parseYAML(text);
    }
    /**
     * Validate YAML content.
     */
    doValidate(text) {
        try {
            this.parseYAML(text);
            return createValidResult();
        }
        catch (error) {
            return validationFromError(error);
        }
    }
    // ===========================================================================
    // VALUE FORMATTING
    // ===========================================================================
    /**
     * Format any value to YAML.
     */
    formatValue(value, state) {
        if (value === null) {
            return 'null';
        }
        if (value === undefined) {
            return state.options.keepUndefined ? 'null' : '';
        }
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }
        if (typeof value === 'number') {
            return this.formatNumber(value);
        }
        if (typeof value === 'bigint') {
            return String(value);
        }
        if (typeof value === 'string') {
            return this.formatString(value, state);
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (Array.isArray(value)) {
            return this.formatArray(value, state);
        }
        if (typeof value === 'object') {
            return this.formatObject(value, state);
        }
        throw new Error(`Cannot serialize value of type: ${typeof value}`);
    }
    /**
     * Format a number value.
     */
    formatNumber(value) {
        if (Number.isNaN(value)) {
            return '.nan';
        }
        if (!Number.isFinite(value)) {
            return value > 0 ? '.inf' : '-.inf';
        }
        if (Number.isInteger(value)) {
            return String(value);
        }
        // Use fixed representation to avoid floating point issues
        return value.toFixed(15).replace(/\.?0+$/, '');
    }
    /**
     * Format a string value with appropriate quoting.
     */
    formatString(value, state) {
        // Determine if quoting is needed
        const needsQuotes = needsYAMLQuoting(value, state.options.forceQuotes);
        if (!needsQuotes) {
            return value;
        }
        // Determine quoting style
        const style = determineYAMLQuoteStyle(value, state.options.defaultScalarStyle);
        switch (style) {
            case 'plain':
                return value;
            case 'single-quoted':
                return `'${escapeYAMLSingleQuoted(value)}'`;
            case 'double-quoted':
                return `"${escapeYAMLDoubleQuoted(value)}"`;
            case 'literal':
                return formatYAMLLiteralBlock(value, state);
            case 'folded':
                return this.formatFoldedString(value, state);
            default:
                return `"${escapeYAMLDoubleQuoted(value)}"`;
        }
    }
    /**
     * Format a folded string (>).
     */
    formatFoldedString(value, state) {
        const innerIndent = createYAMLIndent(incrementYAMLIndent(state));
        let header = '>';
        if (!value.endsWith('\n')) {
            header += '-';
        }
        // Wrap text at line width
        const maxWidth = state.options.lineWidth - innerIndent.length;
        const words = value.split(/\s+/);
        const lines = [];
        let currentLine = '';
        for (const word of words) {
            if (currentLine.length + word.length + 1 > maxWidth) {
                if (currentLine) {
                    lines.push(innerIndent + currentLine);
                }
                currentLine = word;
            }
            else {
                currentLine += (currentLine ? ' ' : '') + word;
            }
        }
        if (currentLine) {
            lines.push(innerIndent + currentLine);
        }
        return header + '\n' + lines.join('\n');
    }
    /**
     * Format an array.
     */
    formatArray(arr, state) {
        if (arr.length === 0) {
            return '[]';
        }
        // Check if flow style should be used
        if (this.shouldUseFlowStyle(arr, state)) {
            return this.formatFlowArray(arr, state);
        }
        // Block style
        const indent = createYAMLIndent(state);
        const innerState = incrementYAMLIndent(state);
        const lines = [];
        for (const item of arr) {
            const formattedItem = this.formatValue(item, innerState);
            // Check if item is an object or multi-line
            if (this.isMultiLine(formattedItem)) {
                // Multi-line: put on next line
                lines.push(`${indent}- `);
                const itemLines = formattedItem.split('\n');
                const firstLine = itemLines[0] ?? '';
                lines[lines.length - 1] += firstLine;
                for (let i = 1; i < itemLines.length; i++) {
                    const itemLine = itemLines[i];
                    if (itemLine !== undefined) {
                        lines.push(itemLine);
                    }
                }
            }
            else {
                lines.push(`${indent}- ${formattedItem}`);
            }
        }
        return lines.join('\n');
    }
    /**
     * Format an array in flow style.
     */
    formatFlowArray(arr, state) {
        const elements = arr.map((item) => {
            const formatted = this.formatValue(item, state);
            // Ensure simple values for flow style
            if (this.isMultiLine(formatted)) {
                // Fall back to inline representation
                if (typeof item === 'object' && item !== null) {
                    return this.formatFlowObject(item, state);
                }
            }
            return formatted;
        });
        return '[' + elements.join(', ') + ']';
    }
    /**
     * Format an object.
     */
    formatObject(obj, state) {
        const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
        if (keys.length === 0) {
            return '{}';
        }
        // Check if flow style should be used
        if (this.shouldUseFlowStyle(obj, state)) {
            return this.formatFlowObject(obj, state);
        }
        // Block style
        const indent = createYAMLIndent(state);
        const innerState = incrementYAMLIndent(state);
        const lines = [];
        for (const key of keys) {
            const value = obj[key];
            const formattedKey = formatYAMLKey(key);
            const formattedValue = this.formatValue(value, innerState);
            // Check if value is multi-line
            if (this.isMultiLine(formattedValue)) {
                // Multi-line: put on next line with proper indentation
                lines.push(`${indent}${formattedKey}:`);
                const valueLines = formattedValue.split('\n');
                for (const valueLine of valueLines) {
                    lines.push(valueLine);
                }
            }
            else if (formattedValue === '' ||
                (typeof value === 'object' && value !== null && !Array.isArray(value))) {
                // Object with block formatting or empty
                lines.push(`${indent}${formattedKey}:`);
                if (formattedValue) {
                    const valueLines = formattedValue.split('\n');
                    for (const valueLine of valueLines) {
                        lines.push(valueLine);
                    }
                }
            }
            else {
                lines.push(`${indent}${formattedKey}: ${formattedValue}`);
            }
        }
        return lines.join('\n');
    }
    /**
     * Format an object in flow style.
     */
    formatFlowObject(obj, state) {
        const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
        const pairs = keys.map((key) => {
            const value = obj[key];
            const formattedKey = formatYAMLKey(key);
            let formattedValue = this.formatValue(value, state);
            // Ensure simple values for flow style
            if (this.isMultiLine(formattedValue)) {
                if (Array.isArray(value)) {
                    formattedValue = this.formatFlowArray(value, state);
                }
                else if (typeof value === 'object' && value !== null) {
                    formattedValue = this.formatFlowObject(value, state);
                }
            }
            return `${formattedKey}: ${formattedValue}`;
        });
        return '{' + pairs.join(', ') + '}';
    }
    // ===========================================================================
    // UTILITY METHODS
    // ===========================================================================
    /**
     * Check if a value should use flow style.
     */
    shouldUseFlowStyle(value, state) {
        if (state.options.flowStyle === 'flow') {
            return true;
        }
        if (state.options.flowStyle === 'block') {
            return false;
        }
        // Auto: use flow for simple, short collections
        if (Array.isArray(value)) {
            if (value.length <= 3 && value.every((v) => this.isSimpleValue(v))) {
                return true;
            }
        }
        if (typeof value === 'object' && value !== null) {
            const keys = Object.keys(value);
            if (keys.length <= 2 && keys.every((k) => this.isSimpleValue(value[k]))) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if a value is simple (scalar).
     */
    isSimpleValue(value) {
        return (value === null ||
            value === undefined ||
            typeof value === 'boolean' ||
            typeof value === 'number' ||
            typeof value === 'bigint' ||
            (typeof value === 'string' && value.length < 40 && !value.includes('\n')));
    }
    /**
     * Check if formatted output is multi-line.
     */
    isMultiLine(formatted) {
        return formatted.includes('\n');
    }
    // ===========================================================================
    // YAML PARSING
    // ===========================================================================
    /**
     * Parse YAML text to JavaScript objects.
     *
     * This is a basic YAML parser for common structures.
     * For production use with complex YAML, consider a dedicated parser.
     */
    parseYAML(text) {
        const trimmed = text.trim();
        if (trimmed.length === 0) {
            return null;
        }
        // Handle multi-document
        if (trimmed.includes(YAML_DOC_START)) {
            const documents = splitYAMLDocuments(trimmed);
            if (documents.length > 1) {
                return documents.map((doc) => this.parseYAMLDocument(doc));
            }
            if (documents.length === 1) {
                return this.parseYAMLDocument(documents[0]);
            }
        }
        return this.parseYAMLDocument(trimmed);
    }
    /**
     * Parse a single YAML document.
     */
    parseYAMLDocument(text) {
        const lines = text.split('\n');
        let lineIdx = 0;
        const skipWhitespace = () => {
            while (lineIdx < lines.length) {
                const line = lines[lineIdx].trim();
                if (line.length === 0 || line.startsWith('#')) {
                    lineIdx++;
                    continue;
                }
                break;
            }
        };
        const getIndent = (line) => {
            return line.length - line.trimStart().length;
        };
        const parseValue = (_indent) => {
            skipWhitespace();
            if (lineIdx >= lines.length) {
                return null;
            }
            const line = lines[lineIdx];
            const currentIndent = getIndent(line);
            const content = line.trimStart();
            // Check for flow sequence
            if (content.startsWith('[')) {
                return parseFlowSequence(content);
            }
            // Check for flow mapping
            if (content.startsWith('{')) {
                return parseFlowMapping(content);
            }
            // Check for block sequence
            if (content.startsWith('-')) {
                return parseBlockSequence(currentIndent);
            }
            // Check for mapping
            if (content.includes(':')) {
                const colonIdx = content.indexOf(':');
                const afterColon = content.substring(colonIdx + 1).trim();
                // Empty value means nested structure
                if (afterColon.length === 0) {
                    return parseBlockMapping(currentIndent);
                }
                // Inline value
                return parseBlockMapping(currentIndent);
            }
            // Scalar
            lineIdx++;
            return parseScalar(content);
        };
        const parseScalar = (content) => {
            // Handle null
            if (content === '~' || content === 'null') {
                return null;
            }
            // Handle booleans
            const lower = content.toLowerCase();
            if (lower === 'true' || lower === 'yes' || lower === 'on') {
                return true;
            }
            if (lower === 'false' || lower === 'no' || lower === 'off') {
                return false;
            }
            // Handle numbers
            if (/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(content)) {
                return Number(content);
            }
            // Handle special floats
            if (content === '.inf' || content === '.Inf')
                return Infinity;
            if (content === '-.inf' || content === '-.Inf')
                return -Infinity;
            if (content === '.nan' || content === '.NaN')
                return NaN;
            // Handle quoted strings
            if ((content.startsWith('"') && content.endsWith('"')) ||
                (content.startsWith("'") && content.endsWith("'"))) {
                return content.slice(1, -1);
            }
            return content;
        };
        const parseFlowSequence = (content) => {
            lineIdx++;
            const result = [];
            let inner = content.slice(1, -1).trim();
            while (inner.length > 0) {
                if (inner.startsWith('{')) {
                    const end = findMatchingBracket(inner, 0, '{', '}');
                    result.push(parseFlowMapping(inner.slice(0, end + 1)));
                    inner = inner.slice(end + 1).replace(/^,\s*/, '');
                }
                else if (inner.startsWith('[')) {
                    const end = findMatchingBracket(inner, 0, '[', ']');
                    result.push(parseFlowSequence(inner.slice(0, end + 1)));
                    inner = inner.slice(end + 1).replace(/^,\s*/, '');
                }
                else {
                    const commaIdx = inner.indexOf(',');
                    if (commaIdx === -1) {
                        result.push(parseScalar(inner.trim()));
                        break;
                    }
                    else {
                        result.push(parseScalar(inner.slice(0, commaIdx).trim()));
                        inner = inner.slice(commaIdx + 1).trim();
                    }
                }
            }
            return result;
        };
        const parseFlowMapping = (content) => {
            lineIdx++;
            const result = {};
            let inner = content.slice(1, -1).trim();
            while (inner.length > 0) {
                const colonIdx = inner.indexOf(':');
                if (colonIdx === -1)
                    break;
                let key = inner.slice(0, colonIdx).trim();
                // Remove quotes from key
                if ((key.startsWith('"') && key.endsWith('"')) ||
                    (key.startsWith("'") && key.endsWith("'"))) {
                    key = key.slice(1, -1);
                }
                inner = inner.slice(colonIdx + 1).trim();
                if (inner.startsWith('{')) {
                    const end = findMatchingBracket(inner, 0, '{', '}');
                    result[key] = parseFlowMapping(inner.slice(0, end + 1));
                    inner = inner.slice(end + 1).replace(/^,\s*/, '');
                }
                else if (inner.startsWith('[')) {
                    const end = findMatchingBracket(inner, 0, '[', ']');
                    result[key] = parseFlowSequence(inner.slice(0, end + 1));
                    inner = inner.slice(end + 1).replace(/^,\s*/, '');
                }
                else {
                    const commaIdx = inner.indexOf(',');
                    if (commaIdx === -1) {
                        result[key] = parseScalar(inner.trim());
                        break;
                    }
                    else {
                        result[key] = parseScalar(inner.slice(0, commaIdx).trim());
                        inner = inner.slice(commaIdx + 1).trim();
                    }
                }
            }
            return result;
        };
        const findMatchingBracket = (str, start, open, close) => {
            let depth = 0;
            for (let i = start; i < str.length; i++) {
                if (str[i] === open)
                    depth++;
                if (str[i] === close)
                    depth--;
                if (depth === 0)
                    return i;
            }
            return str.length - 1;
        };
        const parseBlockSequence = (baseIndent) => {
            const result = [];
            while (lineIdx < lines.length) {
                skipWhitespace();
                if (lineIdx >= lines.length)
                    break;
                const line = lines[lineIdx];
                const currentIndent = getIndent(line);
                const content = line.trimStart();
                if (currentIndent < baseIndent)
                    break;
                if (currentIndent > baseIndent && !content.startsWith('-'))
                    break;
                if (!content.startsWith('-'))
                    break;
                lineIdx++;
                const valueContent = content.slice(1).trim();
                if (valueContent.length === 0) {
                    // Nested value on next line
                    result.push(parseValue(currentIndent + 2));
                }
                else if (valueContent.startsWith('[') || valueContent.startsWith('{')) {
                    // Inline flow
                    result.push(valueContent.startsWith('[')
                        ? parseFlowSequence(valueContent)
                        : parseFlowMapping(valueContent));
                }
                else if (valueContent.includes(':')) {
                    // Inline mapping
                    lineIdx--; // Re-parse from this line
                    const tempLine = '  '.repeat(currentIndent / 2 + 1) + valueContent;
                    const tempLines = lines.slice();
                    tempLines[lineIdx] = tempLine;
                    lines[lineIdx] = tempLine;
                    result.push(parseBlockMapping(currentIndent + 2));
                    lines[lineIdx] = line;
                }
                else {
                    result.push(parseScalar(valueContent));
                }
            }
            return result;
        };
        const parseBlockMapping = (baseIndent) => {
            const result = {};
            while (lineIdx < lines.length) {
                skipWhitespace();
                if (lineIdx >= lines.length)
                    break;
                const line = lines[lineIdx];
                const currentIndent = getIndent(line);
                const content = line.trimStart();
                if (currentIndent < baseIndent)
                    break;
                if (content.startsWith('-'))
                    break;
                const colonIdx = content.indexOf(':');
                if (colonIdx === -1)
                    break;
                let key = content.slice(0, colonIdx).trim();
                // Remove quotes from key
                if ((key.startsWith('"') && key.endsWith('"')) ||
                    (key.startsWith("'") && key.endsWith("'"))) {
                    key = key.slice(1, -1);
                }
                const valueContent = content.slice(colonIdx + 1).trim();
                lineIdx++;
                if (valueContent.length === 0) {
                    // Nested value on next line
                    result[key] = parseValue(currentIndent + 2);
                }
                else if (valueContent.startsWith('[')) {
                    result[key] = parseFlowSequence(valueContent);
                }
                else if (valueContent.startsWith('{')) {
                    result[key] = parseFlowMapping(valueContent);
                }
                else {
                    result[key] = parseScalar(valueContent);
                }
            }
            return result;
        };
        return parseValue(0);
    }
}
// =============================================================================
// FACTORY FUNCTION
// =============================================================================
/**
 * Create a new YAML serializer instance.
 */
export function createYAMLSerializer() {
    return new YAMLSerializer();
}
//# sourceMappingURL=YAMLSerializer.js.map