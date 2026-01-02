/**
 * Shared Type Definitions for Serializers
 *
 * This module defines all types shared across serializer implementations.
 * All types are designed for immutability and deterministic behavior.
 *
 * @module serializers/base/types
 * @version 1.0.0
 */
import { z } from 'zod';
export const SerializerOptionsSchema = z.object({
    indent: z.number().int().min(0).max(8).default(2),
    useTabs: z.boolean().default(false),
    sortKeys: z.boolean().default(true),
    includeComments: z.boolean().default(false),
    lineWidth: z.number().int().min(40).max(200).default(80),
    trailingNewline: z.boolean().default(true),
});
/**
 * Default serializer options ensuring deterministic output.
 */
export const DEFAULT_SERIALIZER_OPTIONS = {
    indent: 2,
    useTabs: false,
    sortKeys: true,
    includeComments: false,
    lineWidth: 80,
    trailingNewline: true,
};
export const FormatOptionsSchema = SerializerOptionsSchema.extend({
    validateFirst: z.boolean().default(true),
    preserveComments: z.boolean().default(false),
});
/**
 * Default format options.
 */
export const DEFAULT_FORMAT_OPTIONS = {
    ...DEFAULT_SERIALIZER_OPTIONS,
    validateFirst: true,
    preserveComments: false,
};
/**
 * Create a successful validation result.
 */
export function createValidResult(warnings = []) {
    return Object.freeze({
        valid: true,
        errors: Object.freeze([]),
        warnings: Object.freeze([...warnings]),
    });
}
/**
 * Create a failed validation result.
 */
export function createInvalidResult(errors, warnings = []) {
    return Object.freeze({
        valid: false,
        errors: Object.freeze([...errors]),
        warnings: Object.freeze([...warnings]),
    });
}
// =============================================================================
// HCL-SPECIFIC TYPES
// =============================================================================
/**
 * HCL block types.
 */
export const HCLBlockTypeValues = [
    'resource',
    'data',
    'variable',
    'output',
    'locals',
    'provider',
    'terraform',
    'module',
    'moved',
    'import',
];
export const HCLSerializerOptionsSchema = SerializerOptionsSchema.extend({
    alignAttributes: z.boolean().default(true),
    blankLinesBetweenBlocks: z.boolean().default(true),
    quoteKeys: z.boolean().default(false),
});
/**
 * Default HCL serializer options.
 */
export const DEFAULT_HCL_OPTIONS = {
    ...DEFAULT_SERIALIZER_OPTIONS,
    alignAttributes: true,
    blankLinesBetweenBlocks: true,
    quoteKeys: false,
};
export const YAMLSerializerOptionsSchema = SerializerOptionsSchema.extend({
    flowStyle: z.enum(['block', 'flow', 'auto']).default('block'),
    defaultScalarStyle: z
        .enum(['plain', 'single-quoted', 'double-quoted', 'literal', 'folded'])
        .default('plain'),
    forceQuotes: z.boolean().default(false),
    multiDocument: z.boolean().default(false),
    keepUndefined: z.boolean().default(false),
    customTags: z.array(z.string()).default([]),
});
/**
 * Default YAML serializer options.
 */
export const DEFAULT_YAML_OPTIONS = {
    ...DEFAULT_SERIALIZER_OPTIONS,
    flowStyle: 'block',
    defaultScalarStyle: 'plain',
    forceQuotes: false,
    multiDocument: false,
    keepUndefined: false,
    customTags: [],
};
export const JSONSerializerOptionsSchema = SerializerOptionsSchema.extend({
    minify: z.boolean().default(false),
    handleBigInt: z.boolean().default(true),
    bigIntAsString: z.boolean().default(true),
    maxDepth: z.number().int().min(1).max(100).default(50),
});
/**
 * Default JSON serializer options.
 */
export const DEFAULT_JSON_OPTIONS = {
    ...DEFAULT_SERIALIZER_OPTIONS,
    minify: false,
    handleBigInt: true,
    bigIntAsString: true,
    maxDepth: 50,
};
// =============================================================================
// SQL-SPECIFIC TYPES
// =============================================================================
/**
 * Supported SQL dialects.
 */
export const SQLDialectValues = [
    'postgresql',
    'mysql',
    'sqlite',
    'mssql',
    'oracle',
];
/**
 * SQL data types (abstract, mapped to dialect-specific types).
 */
export const SQLDataTypeValues = [
    'string',
    'text',
    'integer',
    'bigint',
    'float',
    'double',
    'decimal',
    'boolean',
    'date',
    'datetime',
    'timestamp',
    'time',
    'uuid',
    'json',
    'jsonb',
    'binary',
    'blob',
];
export const SQLSerializerOptionsSchema = SerializerOptionsSchema.extend({
    dialect: z.enum(SQLDialectValues).default('postgresql'),
    quoteIdentifiers: z.boolean().default(true),
    uppercaseKeywords: z.boolean().default(true),
    ifNotExists: z.boolean().default(true),
    includeDrops: z.boolean().default(false),
    schemaPrefix: z.string().optional(),
});
/**
 * Default SQL serializer options.
 */
export const DEFAULT_SQL_OPTIONS = {
    ...DEFAULT_SERIALIZER_OPTIONS,
    dialect: 'postgresql',
    quoteIdentifiers: true,
    uppercaseKeywords: true,
    ifNotExists: true,
    includeDrops: false,
    schemaPrefix: undefined,
};
/**
 * Create a serializer ID.
 */
export function createSerializerId(id) {
    return id;
}
/**
 * Serializer format types.
 */
export const SerializerFormatValues = [
    'hcl',
    'yaml',
    'json',
    'sql',
    'toml',
];
/**
 * Check if a value is a valid serializer format.
 */
export function isSerializerFormat(value) {
    return (typeof value === 'string' &&
        SerializerFormatValues.includes(value));
}
//# sourceMappingURL=types.js.map