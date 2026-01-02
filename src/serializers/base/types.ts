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

// =============================================================================
// SERIALIZER OPTIONS
// =============================================================================

/**
 * Base options for all serialization operations.
 * These options ensure deterministic, reproducible output.
 */
export interface SerializerOptions {
  /** Indentation size in spaces (default: 2) */
  readonly indent?: number;
  /** Use tabs instead of spaces for indentation */
  readonly useTabs?: boolean;
  /** Sort object keys alphabetically for determinism (default: true) */
  readonly sortKeys?: boolean;
  /** Include comments in output where supported */
  readonly includeComments?: boolean;
  /** Maximum line width before wrapping (default: 80) */
  readonly lineWidth?: number;
  /** Trailing newline at end of file (default: true) */
  readonly trailingNewline?: boolean;
}

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
export const DEFAULT_SERIALIZER_OPTIONS: Required<SerializerOptions> = {
  indent: 2,
  useTabs: false,
  sortKeys: true,
  includeComments: false,
  lineWidth: 80,
  trailingNewline: true,
};

// =============================================================================
// FORMAT OPTIONS
// =============================================================================

/**
 * Extended options for formatting operations.
 */
export interface FormatOptions extends SerializerOptions {
  /** Validate content before formatting */
  readonly validateFirst?: boolean;
  /** Preserve original comments when reformatting */
  readonly preserveComments?: boolean;
}

export const FormatOptionsSchema = SerializerOptionsSchema.extend({
  validateFirst: z.boolean().default(true),
  preserveComments: z.boolean().default(false),
});

/**
 * Default format options.
 */
export const DEFAULT_FORMAT_OPTIONS: Required<FormatOptions> = {
  ...DEFAULT_SERIALIZER_OPTIONS,
  validateFirst: true,
  preserveComments: false,
};

// =============================================================================
// VALIDATION RESULT
// =============================================================================

/**
 * Single validation error.
 */
export interface ValidationError {
  /** Error code (e.g., 'E4001') */
  readonly code: string;
  /** Human-readable error message */
  readonly message: string;
  /** Line number (1-based) */
  readonly line?: number;
  /** Column number (1-based) */
  readonly column?: number;
  /** JSONPath or XPath to error location */
  readonly path?: string;
}

/**
 * Single validation warning.
 */
export interface ValidationWarning {
  /** Warning code */
  readonly code: string;
  /** Human-readable warning message */
  readonly message: string;
  /** Line number (1-based) */
  readonly line?: number;
  /** Column number (1-based) */
  readonly column?: number;
  /** Path to warning location */
  readonly path?: string;
}

/**
 * Result of a validation operation.
 */
export interface ValidationResult {
  /** Whether validation passed */
  readonly valid: boolean;
  /** Validation errors (if any) */
  readonly errors: readonly ValidationError[];
  /** Validation warnings (if any) */
  readonly warnings: readonly ValidationWarning[];
}

/**
 * Create a successful validation result.
 */
export function createValidResult(
  warnings: readonly ValidationWarning[] = []
): ValidationResult {
  return Object.freeze({
    valid: true,
    errors: Object.freeze([]),
    warnings: Object.freeze([...warnings]),
  });
}

/**
 * Create a failed validation result.
 */
export function createInvalidResult(
  errors: readonly ValidationError[],
  warnings: readonly ValidationWarning[] = []
): ValidationResult {
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
] as const;

export type HCLBlockType = (typeof HCLBlockTypeValues)[number];

/**
 * HCL expression types.
 */
export type HCLExpression =
  | HCLLiteral
  | HCLReference
  | HCLFunctionCall
  | HCLList
  | HCLMap
  | HCLHeredoc;

/**
 * HCL literal value.
 */
export interface HCLLiteral {
  readonly type: 'literal';
  readonly value: string | number | boolean | null;
}

/**
 * HCL reference (var.xxx, local.xxx, etc.).
 */
export interface HCLReference {
  readonly type: 'reference';
  readonly parts: readonly string[];
}

/**
 * HCL function call.
 */
export interface HCLFunctionCall {
  readonly type: 'function';
  readonly name: string;
  readonly args: readonly HCLExpression[];
}

/**
 * HCL list.
 */
export interface HCLList {
  readonly type: 'list';
  readonly elements: readonly HCLExpression[];
}

/**
 * HCL map/object.
 */
export interface HCLMap {
  readonly type: 'map';
  readonly entries: readonly HCLMapEntry[];
}

/**
 * HCL map entry.
 */
export interface HCLMapEntry {
  readonly key: string;
  readonly value: HCLExpression;
}

/**
 * HCL heredoc string.
 */
export interface HCLHeredoc {
  readonly type: 'heredoc';
  readonly delimiter: string;
  readonly content: string;
  readonly indented: boolean;
}

/**
 * HCL block structure.
 */
export interface HCLBlock {
  readonly type: HCLBlockType;
  readonly labels: readonly string[];
  readonly attributes: Readonly<Record<string, HCLExpression>>;
  readonly blocks: readonly HCLBlock[];
}

/**
 * HCL document (root structure).
 */
export interface HCLDocument {
  readonly blocks: readonly HCLBlock[];
}

/**
 * HCL serializer-specific options.
 */
export interface HCLSerializerOptions extends SerializerOptions {
  /** Align attribute equals signs */
  readonly alignAttributes?: boolean;
  /** Add blank lines between blocks */
  readonly blankLinesBetweenBlocks?: boolean;
  /** Quote all attribute keys */
  readonly quoteKeys?: boolean;
}

export const HCLSerializerOptionsSchema = SerializerOptionsSchema.extend({
  alignAttributes: z.boolean().default(true),
  blankLinesBetweenBlocks: z.boolean().default(true),
  quoteKeys: z.boolean().default(false),
});

/**
 * Default HCL serializer options.
 */
export const DEFAULT_HCL_OPTIONS: Required<HCLSerializerOptions> = {
  ...DEFAULT_SERIALIZER_OPTIONS,
  alignAttributes: true,
  blankLinesBetweenBlocks: true,
  quoteKeys: false,
};

// =============================================================================
// YAML-SPECIFIC TYPES
// =============================================================================

/**
 * YAML flow style types.
 */
export type YAMLFlowStyle = 'block' | 'flow' | 'auto';

/**
 * YAML scalar style types.
 */
export type YAMLScalarStyle =
  | 'plain'
  | 'single-quoted'
  | 'double-quoted'
  | 'literal'
  | 'folded';

/**
 * YAML serializer-specific options.
 */
export interface YAMLSerializerOptions extends SerializerOptions {
  /** Flow style for collections */
  readonly flowStyle?: YAMLFlowStyle;
  /** Default scalar quoting style */
  readonly defaultScalarStyle?: YAMLScalarStyle;
  /** Force quotes on strings */
  readonly forceQuotes?: boolean;
  /** Output multiple documents */
  readonly multiDocument?: boolean;
  /** Keep undefined values as null */
  readonly keepUndefined?: boolean;
  /** Custom tag handling */
  readonly customTags?: readonly string[];
}

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
export const DEFAULT_YAML_OPTIONS: Required<YAMLSerializerOptions> = {
  ...DEFAULT_SERIALIZER_OPTIONS,
  flowStyle: 'block',
  defaultScalarStyle: 'plain',
  forceQuotes: false,
  multiDocument: false,
  keepUndefined: false,
  customTags: [],
};

// =============================================================================
// JSON-SPECIFIC TYPES
// =============================================================================

/**
 * JSON serializer-specific options.
 */
export interface JSONSerializerOptions extends SerializerOptions {
  /** Minify output (single line, no whitespace) */
  readonly minify?: boolean;
  /** Handle BigInt values */
  readonly handleBigInt?: boolean;
  /** Convert BigInt to string representation */
  readonly bigIntAsString?: boolean;
  /** Maximum depth for nested objects */
  readonly maxDepth?: number;
}

export const JSONSerializerOptionsSchema = SerializerOptionsSchema.extend({
  minify: z.boolean().default(false),
  handleBigInt: z.boolean().default(true),
  bigIntAsString: z.boolean().default(true),
  maxDepth: z.number().int().min(1).max(100).default(50),
});

/**
 * Default JSON serializer options.
 */
export const DEFAULT_JSON_OPTIONS: Required<JSONSerializerOptions> = {
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
] as const;

export type SQLDialect = (typeof SQLDialectValues)[number];

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
] as const;

export type SQLDataType = (typeof SQLDataTypeValues)[number];

/**
 * SQL column definition.
 */
export interface SQLColumn {
  readonly name: string;
  readonly type: SQLDataType;
  readonly length?: number;
  readonly precision?: number;
  readonly scale?: number;
  readonly nullable?: boolean;
  readonly primaryKey?: boolean;
  readonly unique?: boolean;
  readonly default?: string | number | boolean | null;
  readonly references?: SQLForeignKey;
}

/**
 * SQL foreign key reference.
 */
export interface SQLForeignKey {
  readonly table: string;
  readonly column: string;
  readonly onDelete?: 'cascade' | 'set null' | 'restrict' | 'no action';
  readonly onUpdate?: 'cascade' | 'set null' | 'restrict' | 'no action';
}

/**
 * SQL index definition.
 */
export interface SQLIndex {
  readonly name: string;
  readonly columns: readonly string[];
  readonly unique?: boolean;
  readonly type?: 'btree' | 'hash' | 'gin' | 'gist';
  readonly where?: string;
}

/**
 * SQL table definition.
 */
export interface SQLTable {
  readonly name: string;
  readonly schema?: string;
  readonly columns: readonly SQLColumn[];
  readonly primaryKey?: readonly string[];
  readonly indexes?: readonly SQLIndex[];
  readonly uniqueConstraints?: readonly {
    readonly name: string;
    readonly columns: readonly string[];
  }[];
}

/**
 * SQL DDL document.
 */
export interface SQLDocument {
  readonly tables: readonly SQLTable[];
  readonly dialect: SQLDialect;
}

/**
 * SQL serializer-specific options.
 */
export interface SQLSerializerOptions extends SerializerOptions {
  /** Target SQL dialect */
  readonly dialect?: SQLDialect;
  /** Quote identifiers */
  readonly quoteIdentifiers?: boolean;
  /** Uppercase keywords */
  readonly uppercaseKeywords?: boolean;
  /** Include IF NOT EXISTS */
  readonly ifNotExists?: boolean;
  /** Include DROP statements */
  readonly includeDrops?: boolean;
  /** Schema prefix for tables */
  readonly schemaPrefix?: string;
}

export const SQLSerializerOptionsSchema = SerializerOptionsSchema.extend({
  dialect: z.enum(SQLDialectValues).default('postgresql'),
  quoteIdentifiers: z.boolean().default(true),
  uppercaseKeywords: z.boolean().default(true),
  ifNotExists: z.boolean().default(true),
  includeDrops: z.boolean().default(false),
  schemaPrefix: z.string().optional(),
});

/**
 * SQL options with schemaPrefix explicitly optional.
 */
export type SQLSerializerOptionsRequired = Required<
  Omit<SQLSerializerOptions, 'schemaPrefix'>
> & { schemaPrefix: string | undefined };

/**
 * Default SQL serializer options.
 */
export const DEFAULT_SQL_OPTIONS: SQLSerializerOptionsRequired = {
  ...DEFAULT_SERIALIZER_OPTIONS,
  dialect: 'postgresql',
  quoteIdentifiers: true,
  uppercaseKeywords: true,
  ifNotExists: true,
  includeDrops: false,
  schemaPrefix: undefined,
};

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Serializer identifier (branded type).
 */
export type SerializerId = string & { readonly __brand: 'SerializerId' };

/**
 * Create a serializer ID.
 */
export function createSerializerId(id: string): SerializerId {
  return id as SerializerId;
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
] as const;

export type SerializerFormat = (typeof SerializerFormatValues)[number];

/**
 * Check if a value is a valid serializer format.
 */
export function isSerializerFormat(value: unknown): value is SerializerFormat {
  return (
    typeof value === 'string' &&
    SerializerFormatValues.includes(value as SerializerFormat)
  );
}
