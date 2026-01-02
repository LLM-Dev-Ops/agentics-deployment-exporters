/**
 * YAML Formatter
 *
 * This module provides YAML-specific formatting rules and utilities.
 * All functions are pure and deterministic.
 *
 * @module serializers/yaml/YAMLFormatter
 * @version 1.0.0
 */
import { DEFAULT_YAML_OPTIONS } from '../base/types.js';
// =============================================================================
// CONSTANTS
// =============================================================================
/**
 * YAML special characters that may require quoting.
 */
export const YAML_SPECIAL_CHARS = ':{}[]&*?|<>=!%@`#,';
/**
 * YAML reserved indicators at start of value.
 */
export const YAML_INDICATOR_CHARS = '-?:,[]{}#&*!|>\'"%@`';
/**
 * Characters that start flow indicators.
 */
export const YAML_FLOW_INDICATORS = '[]{},:';
/**
 * Document separators.
 */
export const YAML_DOC_START = '---';
export const YAML_DOC_END = '...';
/**
 * Create initial formatter state.
 */
export function createYAMLFormatterState(options) {
    return Object.freeze({
        indentLevel: 0,
        inFlow: false,
        options: Object.freeze({
            ...DEFAULT_YAML_OPTIONS,
            ...options,
        }),
    });
}
/**
 * Create new state with incremented indent.
 */
export function incrementYAMLIndent(state) {
    return Object.freeze({
        ...state,
        indentLevel: state.indentLevel + 1,
    });
}
/**
 * Create new state for flow context.
 */
export function enterFlowContext(state) {
    return Object.freeze({
        ...state,
        inFlow: true,
    });
}
// =============================================================================
// INDENTATION
// =============================================================================
/**
 * Create indentation string for given state.
 */
export function createYAMLIndent(state) {
    const { indentLevel, options } = state;
    if (indentLevel <= 0) {
        return '';
    }
    if (options.useTabs) {
        return '\t'.repeat(indentLevel);
    }
    return ' '.repeat(indentLevel * options.indent);
}
// =============================================================================
// STRING QUOTING
// =============================================================================
/**
 * Determine if a string needs quoting in YAML.
 */
export function needsYAMLQuoting(value, forceQuotes = false) {
    if (forceQuotes) {
        return true;
    }
    if (value.length === 0) {
        return true;
    }
    // Check for special values
    const lowerValue = value.toLowerCase();
    if (lowerValue === 'true' ||
        lowerValue === 'false' ||
        lowerValue === 'yes' ||
        lowerValue === 'no' ||
        lowerValue === 'on' ||
        lowerValue === 'off' ||
        lowerValue === 'null' ||
        lowerValue === '~') {
        return true;
    }
    // Check for numeric values
    if (/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(value)) {
        return true;
    }
    // Check for special numeric representations
    if (/^0[xXoObB][\da-fA-F]+$/.test(value)) {
        return true;
    }
    // Check for infinity/NaN
    if (/^[-+]?(\.inf|\.nan)$/i.test(value)) {
        return true;
    }
    // Check for leading/trailing whitespace
    if (value !== value.trim()) {
        return true;
    }
    // Check for indicator characters at start
    if (YAML_INDICATOR_CHARS.includes(value[0])) {
        return true;
    }
    // Check for special character sequences
    for (const char of YAML_SPECIAL_CHARS) {
        if (value.includes(char)) {
            return true;
        }
    }
    // Check for newlines
    if (value.includes('\n') || value.includes('\r')) {
        return true;
    }
    // Check for leading zeros
    if (/^0\d+$/.test(value)) {
        return true;
    }
    return false;
}
/**
 * Determine the best quoting style for a string.
 */
export function determineYAMLQuoteStyle(value, _preferredStyle = 'plain') {
    // Check if plain style is possible
    if (!needsYAMLQuoting(value, false)) {
        return 'plain';
    }
    // Use literal style for multi-line strings without trailing newline issues
    if (value.includes('\n') && !value.endsWith('\n\n')) {
        return 'literal';
    }
    // Use folded style for long single-line strings
    if (value.length > 80 && !value.includes('\n')) {
        return 'folded';
    }
    // Check if single quotes work (no single quotes in content)
    if (!value.includes("'")) {
        return 'single-quoted';
    }
    // Default to double quotes
    return 'double-quoted';
}
// =============================================================================
// STRING ESCAPING
// =============================================================================
/**
 * Escape a string for double-quoted YAML.
 */
export function escapeYAMLDoubleQuoted(value) {
    let result = '';
    for (const char of value) {
        switch (char) {
            case '"':
                result += '\\"';
                break;
            case '\\':
                result += '\\\\';
                break;
            case '\n':
                result += '\\n';
                break;
            case '\r':
                result += '\\r';
                break;
            case '\t':
                result += '\\t';
                break;
            case '\b':
                result += '\\b';
                break;
            case '\f':
                result += '\\f';
                break;
            case '\0':
                result += '\\0';
                break;
            default:
                // Escape non-printable characters
                const code = char.charCodeAt(0);
                if (code < 32 || (code >= 127 && code < 160)) {
                    result += `\\x${code.toString(16).padStart(2, '0')}`;
                }
                else {
                    result += char;
                }
        }
    }
    return result;
}
/**
 * Escape a string for single-quoted YAML (only single quotes need escaping).
 */
export function escapeYAMLSingleQuoted(value) {
    return value.replace(/'/g, "''");
}
// =============================================================================
// VALUE FORMATTING
// =============================================================================
/**
 * Format a string value with appropriate quoting style.
 */
export function formatYAMLString(value, state) {
    const style = state.options.forceQuotes
        ? state.options.defaultScalarStyle
        : determineYAMLQuoteStyle(value, state.options.defaultScalarStyle);
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
            return formatYAMLFoldedBlock(value, state);
        default:
            return `"${escapeYAMLDoubleQuoted(value)}"`;
    }
}
/**
 * Format a literal block scalar (|).
 */
export function formatYAMLLiteralBlock(value, state) {
    const indent = createYAMLIndent(incrementYAMLIndent(state));
    const lines = value.split('\n');
    // Determine block header indicators
    let header = '|';
    // Check for trailing newlines
    if (!value.endsWith('\n')) {
        header += '-'; // Strip final newline
    }
    else if (value.endsWith('\n\n')) {
        header += '+'; // Keep trailing newlines
    }
    // Format lines
    const formattedLines = lines.map((line) => (line ? indent + line : ''));
    return header + '\n' + formattedLines.join('\n');
}
/**
 * Format a folded block scalar (>).
 */
export function formatYAMLFoldedBlock(value, state) {
    const indent = createYAMLIndent(incrementYAMLIndent(state));
    // Determine block header indicators
    let header = '>';
    // Check for trailing newlines
    if (!value.endsWith('\n')) {
        header += '-';
    }
    else if (value.endsWith('\n\n')) {
        header += '+';
    }
    // Format as folded (soft-wrap at line width)
    const lines = [];
    let currentLine = '';
    for (const word of value.split(/\s+/)) {
        if (currentLine.length + word.length + 1 > state.options.lineWidth - indent.length) {
            if (currentLine) {
                lines.push(indent + currentLine);
            }
            currentLine = word;
        }
        else {
            currentLine += (currentLine ? ' ' : '') + word;
        }
    }
    if (currentLine) {
        lines.push(indent + currentLine);
    }
    return header + '\n' + lines.join('\n');
}
// =============================================================================
// KEY FORMATTING
// =============================================================================
/**
 * Check if a key needs quoting in YAML.
 */
export function needsYAMLKeyQuoting(key) {
    if (key.length === 0) {
        return true;
    }
    // Check for special characters
    if (key.includes(':') || key.includes('#') || key.includes('\n')) {
        return true;
    }
    // Check for leading/trailing whitespace
    if (key !== key.trim()) {
        return true;
    }
    // Check for indicator at start
    if (YAML_INDICATOR_CHARS.includes(key[0])) {
        return true;
    }
    // Check for reserved words
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'true' ||
        lowerKey === 'false' ||
        lowerKey === 'null' ||
        lowerKey === 'yes' ||
        lowerKey === 'no' ||
        lowerKey === '~') {
        return true;
    }
    return false;
}
/**
 * Format a YAML key.
 */
export function formatYAMLKey(key) {
    if (needsYAMLKeyQuoting(key)) {
        if (!key.includes("'")) {
            return `'${escapeYAMLSingleQuoted(key)}'`;
        }
        return `"${escapeYAMLDoubleQuoted(key)}"`;
    }
    return key;
}
// =============================================================================
// FLOW STYLE FORMATTING
// =============================================================================
/**
 * Format an array in flow style.
 */
export function formatYAMLFlowArray(elements, _state) {
    return '[' + elements.join(', ') + ']';
}
/**
 * Format an object in flow style.
 */
export function formatYAMLFlowObject(entries, _state) {
    const pairs = entries.map(({ key, value }) => `${formatYAMLKey(key)}: ${value}`);
    return '{' + pairs.join(', ') + '}';
}
// =============================================================================
// DOCUMENT HANDLING
// =============================================================================
/**
 * Check if text is a multi-document YAML.
 */
export function isMultiDocumentYAML(text) {
    // Count document separators
    const matches = text.match(/^---/gm);
    return matches !== null && matches.length > 1;
}
/**
 * Split multi-document YAML into individual documents.
 */
export function splitYAMLDocuments(text) {
    // Split on document start markers
    const parts = text.split(/^---\s*$/m);
    // Filter empty parts and trim
    return parts
        .map((part) => part.trim())
        .filter((part) => part.length > 0 && part !== YAML_DOC_END);
}
/**
 * Join documents with proper separators.
 */
export function joinYAMLDocuments(documents) {
    if (documents.length === 0) {
        return '';
    }
    if (documents.length === 1) {
        return documents[0];
    }
    return documents.map((doc) => YAML_DOC_START + '\n' + doc).join('\n');
}
// =============================================================================
// COMMENT HANDLING
// =============================================================================
/**
 * Format a YAML comment.
 */
export function formatYAMLComment(comment, state) {
    const indent = createYAMLIndent(state);
    const lines = comment.split('\n');
    return lines.map((line) => indent + '# ' + line).join('\n');
}
/**
 * Extract comments from YAML text (basic implementation).
 */
export function extractYAMLComments(text) {
    const comments = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const commentMatch = line.match(/#(.*)$/);
        if (commentMatch) {
            comments.push({
                line: i + 1,
                comment: commentMatch[1].trim(),
            });
        }
    }
    return comments;
}
// =============================================================================
// ANCHOR/ALIAS HANDLING
// =============================================================================
/**
 * Validate anchor name.
 */
export function isValidYAMLAnchor(name) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}
/**
 * Format an anchor.
 */
export function formatYAMLAnchor(name) {
    return `&${name}`;
}
/**
 * Format an alias.
 */
export function formatYAMLAlias(name) {
    return `*${name}`;
}
//# sourceMappingURL=YAMLFormatter.js.map