/**
 * HCL Formatter
 *
 * This module provides HCL-specific formatting rules and utilities.
 * All functions are pure and deterministic.
 *
 * @module serializers/hcl/HCLFormatter
 * @version 1.0.0
 */
import { DEFAULT_HCL_OPTIONS } from '../base/types.js';
// =============================================================================
// CONSTANTS
// =============================================================================
/**
 * HCL reserved words that should not be used as unquoted identifiers.
 */
export const HCL_RESERVED_WORDS = new Set([
    'true',
    'false',
    'null',
    'for',
    'each',
    'in',
    'if',
    'else',
    'endif',
    'endfor',
]);
/**
 * Characters that require quoting in HCL identifiers.
 */
export const HCL_SPECIAL_CHARS = '={}[](),:"\'\n\r\t ';
/**
 * Pattern for valid HCL identifiers.
 */
export const HCL_IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;
/**
 * Create initial formatter state.
 */
export function createFormatterState(options) {
    return Object.freeze({
        indentLevel: 0,
        maxKeyLength: 0,
        options: Object.freeze({
            ...DEFAULT_HCL_OPTIONS,
            ...options,
        }),
    });
}
/**
 * Create new state with incremented indent.
 */
export function incrementIndent(state) {
    return Object.freeze({
        ...state,
        indentLevel: state.indentLevel + 1,
    });
}
/**
 * Create new state with updated max key length.
 */
export function withMaxKeyLength(state, maxKeyLength) {
    return Object.freeze({
        ...state,
        maxKeyLength,
    });
}
// =============================================================================
// INDENTATION
// =============================================================================
/**
 * Create indentation string for given state.
 */
export function createIndent(state) {
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
// IDENTIFIER HANDLING
// =============================================================================
/**
 * Check if a string is a valid HCL identifier.
 */
export function isValidHCLIdentifier(str) {
    if (!str || str.length === 0) {
        return false;
    }
    // Check against reserved words
    if (HCL_RESERVED_WORDS.has(str.toLowerCase())) {
        return false;
    }
    // Check pattern
    return HCL_IDENTIFIER_PATTERN.test(str);
}
/**
 * Check if a string needs quoting in HCL.
 */
export function needsHCLQuoting(str) {
    if (!str || str.length === 0) {
        return true;
    }
    // Reserved words need quoting
    if (HCL_RESERVED_WORDS.has(str.toLowerCase())) {
        return true;
    }
    // Check for special characters
    for (const char of HCL_SPECIAL_CHARS) {
        if (str.includes(char)) {
            return true;
        }
    }
    // Check if valid identifier
    return !HCL_IDENTIFIER_PATTERN.test(str);
}
/**
 * Quote an HCL identifier if needed.
 */
export function quoteHCLIdentifier(str, forceQuote = false) {
    if (forceQuote || needsHCLQuoting(str)) {
        return `"${escapeHCLString(str)}"`;
    }
    return str;
}
// =============================================================================
// STRING HANDLING
// =============================================================================
/**
 * Escape special characters in HCL string.
 */
export function escapeHCLString(str) {
    let result = '';
    for (const char of str) {
        switch (char) {
            case '\\':
                result += '\\\\';
                break;
            case '"':
                result += '\\"';
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
            case '$':
                // Escape interpolation start
                result += '$$';
                break;
            case '%':
                // Escape template directive start
                result += '%%';
                break;
            default:
                result += char;
        }
    }
    return result;
}
/**
 * Check if a string should use heredoc format.
 */
export function shouldUseHeredoc(str, lineWidth) {
    // Use heredoc for multi-line strings or very long strings
    if (str.includes('\n')) {
        return true;
    }
    if (str.length > lineWidth) {
        return true;
    }
    return false;
}
/**
 * Format a string as heredoc.
 */
export function formatHeredoc(str, state, delimiter = 'EOF') {
    const indent = createIndent(state);
    const indentedContent = state.options.indent > 0;
    if (indentedContent) {
        // Use indented heredoc (<<-)
        const lines = str.split('\n');
        const indentedLines = lines.map((line) => indent + '  ' + line).join('\n');
        return `<<-${delimiter}\n${indentedLines}\n${indent}${delimiter}`;
    }
    else {
        // Use regular heredoc (<<)
        return `<<${delimiter}\n${str}\n${delimiter}`;
    }
}
// =============================================================================
// VALUE FORMATTING
// =============================================================================
/**
 * Format a primitive value for HCL.
 */
export function formatPrimitiveValue(value) {
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
        // Use fixed representation to avoid floating point issues
        if (Number.isInteger(value)) {
            return String(value);
        }
        return value.toFixed(15).replace(/\.?0+$/, '');
    }
    if (typeof value === 'bigint') {
        return String(value);
    }
    if (typeof value === 'string') {
        return `"${escapeHCLString(value)}"`;
    }
    throw new Error(`Cannot format primitive value of type: ${typeof value}`);
}
/**
 * Format an HCL expression.
 */
export function formatExpression(expr, state) {
    switch (expr.type) {
        case 'literal':
            return formatPrimitiveValue(expr.value);
        case 'reference':
            return expr.parts.join('.');
        case 'function':
            const args = expr.args.map((arg) => formatExpression(arg, state));
            return `${expr.name}(${args.join(', ')})`;
        case 'list':
            return formatList(expr.elements.map((e) => formatExpression(e, state)), state);
        case 'map':
            return formatMap(expr.entries, state);
        case 'heredoc':
            return formatHeredoc(expr.content, state, expr.delimiter);
        default:
            throw new Error(`Unknown expression type: ${expr.type}`);
    }
}
/**
 * Format a list/array for HCL.
 */
export function formatList(elements, state) {
    if (elements.length === 0) {
        return '[]';
    }
    // Check if single line would be short enough
    const singleLine = `[${elements.join(', ')}]`;
    if (singleLine.length <= state.options.lineWidth && !singleLine.includes('\n')) {
        return singleLine;
    }
    // Multi-line format
    const innerState = incrementIndent(state);
    const indent = createIndent(innerState);
    const lines = elements.map((el) => `${indent}${el},`);
    return `[\n${lines.join('\n')}\n${createIndent(state)}]`;
}
/**
 * Format a map/object entry.
 */
export function formatMapEntry(key, value, state, keyPadding = 0) {
    const quotedKey = quoteHCLIdentifier(key, state.options.quoteKeys);
    const paddedKey = state.options.alignAttributes
        ? quotedKey.padEnd(keyPadding)
        : quotedKey;
    return `${paddedKey} = ${value}`;
}
/**
 * Format a map/object for HCL.
 */
export function formatMap(entries, state) {
    if (entries.length === 0) {
        return '{}';
    }
    // Calculate max key length for alignment
    const maxKeyLength = Math.max(...entries.map((e) => e.key.length));
    const alignedState = withMaxKeyLength(state, maxKeyLength);
    const innerState = incrementIndent(alignedState);
    const lines = [];
    const indent = createIndent(innerState);
    for (const entry of entries) {
        const formattedValue = formatExpression(entry.value, innerState);
        const line = formatMapEntry(entry.key, formattedValue, innerState, state.options.alignAttributes ? maxKeyLength : 0);
        lines.push(`${indent}${line}`);
    }
    return `{\n${lines.join('\n')}\n${createIndent(state)}}`;
}
// =============================================================================
// BLOCK FORMATTING
// =============================================================================
/**
 * Format block labels.
 */
export function formatBlockLabels(labels) {
    if (labels.length === 0) {
        return '';
    }
    return labels.map((label) => `"${escapeHCLString(label)}"`).join(' ');
}
/**
 * Format a single HCL block.
 */
export function formatBlock(block, state) {
    const indent = createIndent(state);
    const innerState = incrementIndent(state);
    // Block header
    const labels = formatBlockLabels(block.labels);
    const header = labels ? `${block.type} ${labels} {` : `${block.type} {`;
    // Collect and sort attribute keys for determinism
    const attrKeys = Object.keys(block.attributes).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    // Calculate max key length for alignment
    const maxKeyLength = attrKeys.length > 0 ? Math.max(...attrKeys.map((k) => k.length)) : 0;
    const alignedInnerState = withMaxKeyLength(innerState, maxKeyLength);
    const lines = [];
    // Format attributes
    for (const key of attrKeys) {
        const value = block.attributes[key];
        const innerIndent = createIndent(innerState);
        const formattedValue = formatExpression(value, alignedInnerState);
        const line = formatMapEntry(key, formattedValue, alignedInnerState, state.options.alignAttributes ? maxKeyLength : 0);
        lines.push(`${innerIndent}${line}`);
    }
    // Add blank line between attributes and nested blocks if both exist
    if (lines.length > 0 && block.blocks.length > 0) {
        lines.push('');
    }
    // Format nested blocks
    for (const nestedBlock of block.blocks) {
        lines.push(formatBlock(nestedBlock, innerState));
    }
    // Complete block
    return `${indent}${header}\n${lines.join('\n')}\n${indent}}`;
}
// =============================================================================
// DOCUMENT FORMATTING
// =============================================================================
/**
 * Calculate attribute alignment within a block.
 */
export function calculateAttributeAlignment(attributes) {
    const keys = Object.keys(attributes);
    if (keys.length === 0) {
        return 0;
    }
    return Math.max(...keys.map((k) => k.length));
}
/**
 * Group blocks by type for organization.
 */
export function groupBlocksByType(blocks) {
    const groups = new Map();
    // Define preferred order
    const preferredOrder = [
        'terraform',
        'provider',
        'variable',
        'locals',
        'data',
        'resource',
        'module',
        'output',
        'moved',
        'import',
    ];
    // Initialize groups in preferred order
    for (const type of preferredOrder) {
        groups.set(type, []);
    }
    // Add blocks to groups
    for (const block of blocks) {
        const group = groups.get(block.type);
        if (group) {
            group.push(block);
        }
        else {
            // Unknown block type - add at end
            groups.set(block.type, [block]);
        }
    }
    // Remove empty groups
    for (const [key, value] of groups) {
        if (value.length === 0) {
            groups.delete(key);
        }
    }
    return groups;
}
/**
 * Sort blocks within a group for determinism.
 */
export function sortBlocksInGroup(blocks) {
    return [...blocks].sort((a, b) => {
        // Sort by first label, then by subsequent labels
        for (let i = 0; i < Math.max(a.labels.length, b.labels.length); i++) {
            const labelA = a.labels[i] ?? '';
            const labelB = b.labels[i] ?? '';
            const cmp = labelA.localeCompare(labelB, 'en', { sensitivity: 'base' });
            if (cmp !== 0) {
                return cmp;
            }
        }
        return 0;
    });
}
//# sourceMappingURL=HCLFormatter.js.map