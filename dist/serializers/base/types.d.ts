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
export declare const SerializerOptionsSchema: z.ZodObject<{
    indent: z.ZodDefault<z.ZodNumber>;
    useTabs: z.ZodDefault<z.ZodBoolean>;
    sortKeys: z.ZodDefault<z.ZodBoolean>;
    includeComments: z.ZodDefault<z.ZodBoolean>;
    lineWidth: z.ZodDefault<z.ZodNumber>;
    trailingNewline: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    indent: number;
    useTabs: boolean;
    sortKeys: boolean;
    includeComments: boolean;
    lineWidth: number;
    trailingNewline: boolean;
}, {
    indent?: number | undefined;
    useTabs?: boolean | undefined;
    sortKeys?: boolean | undefined;
    includeComments?: boolean | undefined;
    lineWidth?: number | undefined;
    trailingNewline?: boolean | undefined;
}>;
/**
 * Default serializer options ensuring deterministic output.
 */
export declare const DEFAULT_SERIALIZER_OPTIONS: Required<SerializerOptions>;
/**
 * Extended options for formatting operations.
 */
export interface FormatOptions extends SerializerOptions {
    /** Validate content before formatting */
    readonly validateFirst?: boolean;
    /** Preserve original comments when reformatting */
    readonly preserveComments?: boolean;
}
export declare const FormatOptionsSchema: z.ZodObject<{
    indent: z.ZodDefault<z.ZodNumber>;
    useTabs: z.ZodDefault<z.ZodBoolean>;
    sortKeys: z.ZodDefault<z.ZodBoolean>;
    includeComments: z.ZodDefault<z.ZodBoolean>;
    lineWidth: z.ZodDefault<z.ZodNumber>;
    trailingNewline: z.ZodDefault<z.ZodBoolean>;
} & {
    validateFirst: z.ZodDefault<z.ZodBoolean>;
    preserveComments: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    indent: number;
    useTabs: boolean;
    sortKeys: boolean;
    includeComments: boolean;
    lineWidth: number;
    validateFirst: boolean;
    trailingNewline: boolean;
    preserveComments: boolean;
}, {
    indent?: number | undefined;
    useTabs?: boolean | undefined;
    sortKeys?: boolean | undefined;
    includeComments?: boolean | undefined;
    lineWidth?: number | undefined;
    validateFirst?: boolean | undefined;
    trailingNewline?: boolean | undefined;
    preserveComments?: boolean | undefined;
}>;
/**
 * Default format options.
 */
export declare const DEFAULT_FORMAT_OPTIONS: Required<FormatOptions>;
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
export declare function createValidResult(warnings?: readonly ValidationWarning[]): ValidationResult;
/**
 * Create a failed validation result.
 */
export declare function createInvalidResult(errors: readonly ValidationError[], warnings?: readonly ValidationWarning[]): ValidationResult;
/**
 * HCL block types.
 */
export declare const HCLBlockTypeValues: readonly ["resource", "data", "variable", "output", "locals", "provider", "terraform", "module", "moved", "import"];
export type HCLBlockType = (typeof HCLBlockTypeValues)[number];
/**
 * HCL expression types.
 */
export type HCLExpression = HCLLiteral | HCLReference | HCLFunctionCall | HCLList | HCLMap | HCLHeredoc;
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
export declare const HCLSerializerOptionsSchema: z.ZodObject<{
    indent: z.ZodDefault<z.ZodNumber>;
    useTabs: z.ZodDefault<z.ZodBoolean>;
    sortKeys: z.ZodDefault<z.ZodBoolean>;
    includeComments: z.ZodDefault<z.ZodBoolean>;
    lineWidth: z.ZodDefault<z.ZodNumber>;
    trailingNewline: z.ZodDefault<z.ZodBoolean>;
} & {
    alignAttributes: z.ZodDefault<z.ZodBoolean>;
    blankLinesBetweenBlocks: z.ZodDefault<z.ZodBoolean>;
    quoteKeys: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    indent: number;
    useTabs: boolean;
    sortKeys: boolean;
    includeComments: boolean;
    lineWidth: number;
    trailingNewline: boolean;
    alignAttributes: boolean;
    blankLinesBetweenBlocks: boolean;
    quoteKeys: boolean;
}, {
    indent?: number | undefined;
    useTabs?: boolean | undefined;
    sortKeys?: boolean | undefined;
    includeComments?: boolean | undefined;
    lineWidth?: number | undefined;
    trailingNewline?: boolean | undefined;
    alignAttributes?: boolean | undefined;
    blankLinesBetweenBlocks?: boolean | undefined;
    quoteKeys?: boolean | undefined;
}>;
/**
 * Default HCL serializer options.
 */
export declare const DEFAULT_HCL_OPTIONS: Required<HCLSerializerOptions>;
/**
 * YAML flow style types.
 */
export type YAMLFlowStyle = 'block' | 'flow' | 'auto';
/**
 * YAML scalar style types.
 */
export type YAMLScalarStyle = 'plain' | 'single-quoted' | 'double-quoted' | 'literal' | 'folded';
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
export declare const YAMLSerializerOptionsSchema: z.ZodObject<{
    indent: z.ZodDefault<z.ZodNumber>;
    useTabs: z.ZodDefault<z.ZodBoolean>;
    sortKeys: z.ZodDefault<z.ZodBoolean>;
    includeComments: z.ZodDefault<z.ZodBoolean>;
    lineWidth: z.ZodDefault<z.ZodNumber>;
    trailingNewline: z.ZodDefault<z.ZodBoolean>;
} & {
    flowStyle: z.ZodDefault<z.ZodEnum<["block", "flow", "auto"]>>;
    defaultScalarStyle: z.ZodDefault<z.ZodEnum<["plain", "single-quoted", "double-quoted", "literal", "folded"]>>;
    forceQuotes: z.ZodDefault<z.ZodBoolean>;
    multiDocument: z.ZodDefault<z.ZodBoolean>;
    keepUndefined: z.ZodDefault<z.ZodBoolean>;
    customTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    indent: number;
    useTabs: boolean;
    sortKeys: boolean;
    includeComments: boolean;
    lineWidth: number;
    trailingNewline: boolean;
    flowStyle: "block" | "flow" | "auto";
    defaultScalarStyle: "literal" | "plain" | "single-quoted" | "double-quoted" | "folded";
    forceQuotes: boolean;
    multiDocument: boolean;
    keepUndefined: boolean;
    customTags: string[];
}, {
    indent?: number | undefined;
    useTabs?: boolean | undefined;
    sortKeys?: boolean | undefined;
    includeComments?: boolean | undefined;
    lineWidth?: number | undefined;
    trailingNewline?: boolean | undefined;
    flowStyle?: "block" | "flow" | "auto" | undefined;
    defaultScalarStyle?: "literal" | "plain" | "single-quoted" | "double-quoted" | "folded" | undefined;
    forceQuotes?: boolean | undefined;
    multiDocument?: boolean | undefined;
    keepUndefined?: boolean | undefined;
    customTags?: string[] | undefined;
}>;
/**
 * Default YAML serializer options.
 */
export declare const DEFAULT_YAML_OPTIONS: Required<YAMLSerializerOptions>;
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
export declare const JSONSerializerOptionsSchema: z.ZodObject<{
    indent: z.ZodDefault<z.ZodNumber>;
    useTabs: z.ZodDefault<z.ZodBoolean>;
    sortKeys: z.ZodDefault<z.ZodBoolean>;
    includeComments: z.ZodDefault<z.ZodBoolean>;
    lineWidth: z.ZodDefault<z.ZodNumber>;
    trailingNewline: z.ZodDefault<z.ZodBoolean>;
} & {
    minify: z.ZodDefault<z.ZodBoolean>;
    handleBigInt: z.ZodDefault<z.ZodBoolean>;
    bigIntAsString: z.ZodDefault<z.ZodBoolean>;
    maxDepth: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    indent: number;
    useTabs: boolean;
    sortKeys: boolean;
    includeComments: boolean;
    lineWidth: number;
    maxDepth: number;
    trailingNewline: boolean;
    minify: boolean;
    handleBigInt: boolean;
    bigIntAsString: boolean;
}, {
    indent?: number | undefined;
    useTabs?: boolean | undefined;
    sortKeys?: boolean | undefined;
    includeComments?: boolean | undefined;
    lineWidth?: number | undefined;
    maxDepth?: number | undefined;
    trailingNewline?: boolean | undefined;
    minify?: boolean | undefined;
    handleBigInt?: boolean | undefined;
    bigIntAsString?: boolean | undefined;
}>;
/**
 * Default JSON serializer options.
 */
export declare const DEFAULT_JSON_OPTIONS: Required<JSONSerializerOptions>;
/**
 * Supported SQL dialects.
 */
export declare const SQLDialectValues: readonly ["postgresql", "mysql", "sqlite", "mssql", "oracle"];
export type SQLDialect = (typeof SQLDialectValues)[number];
/**
 * SQL data types (abstract, mapped to dialect-specific types).
 */
export declare const SQLDataTypeValues: readonly ["string", "text", "integer", "bigint", "float", "double", "decimal", "boolean", "date", "datetime", "timestamp", "time", "uuid", "json", "jsonb", "binary", "blob"];
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
export declare const SQLSerializerOptionsSchema: z.ZodObject<{
    indent: z.ZodDefault<z.ZodNumber>;
    useTabs: z.ZodDefault<z.ZodBoolean>;
    sortKeys: z.ZodDefault<z.ZodBoolean>;
    includeComments: z.ZodDefault<z.ZodBoolean>;
    lineWidth: z.ZodDefault<z.ZodNumber>;
    trailingNewline: z.ZodDefault<z.ZodBoolean>;
} & {
    dialect: z.ZodDefault<z.ZodEnum<["postgresql", "mysql", "sqlite", "mssql", "oracle"]>>;
    quoteIdentifiers: z.ZodDefault<z.ZodBoolean>;
    uppercaseKeywords: z.ZodDefault<z.ZodBoolean>;
    ifNotExists: z.ZodDefault<z.ZodBoolean>;
    includeDrops: z.ZodDefault<z.ZodBoolean>;
    schemaPrefix: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    indent: number;
    useTabs: boolean;
    sortKeys: boolean;
    includeComments: boolean;
    lineWidth: number;
    trailingNewline: boolean;
    dialect: "postgresql" | "mysql" | "sqlite" | "mssql" | "oracle";
    quoteIdentifiers: boolean;
    uppercaseKeywords: boolean;
    ifNotExists: boolean;
    includeDrops: boolean;
    schemaPrefix?: string | undefined;
}, {
    indent?: number | undefined;
    useTabs?: boolean | undefined;
    sortKeys?: boolean | undefined;
    includeComments?: boolean | undefined;
    lineWidth?: number | undefined;
    trailingNewline?: boolean | undefined;
    dialect?: "postgresql" | "mysql" | "sqlite" | "mssql" | "oracle" | undefined;
    quoteIdentifiers?: boolean | undefined;
    uppercaseKeywords?: boolean | undefined;
    ifNotExists?: boolean | undefined;
    includeDrops?: boolean | undefined;
    schemaPrefix?: string | undefined;
}>;
/**
 * SQL options with schemaPrefix explicitly optional.
 */
export type SQLSerializerOptionsRequired = Required<Omit<SQLSerializerOptions, 'schemaPrefix'>> & {
    schemaPrefix: string | undefined;
};
/**
 * Default SQL serializer options.
 */
export declare const DEFAULT_SQL_OPTIONS: SQLSerializerOptionsRequired;
/**
 * Serializer identifier (branded type).
 */
export type SerializerId = string & {
    readonly __brand: 'SerializerId';
};
/**
 * Create a serializer ID.
 */
export declare function createSerializerId(id: string): SerializerId;
/**
 * Serializer format types.
 */
export declare const SerializerFormatValues: readonly ["hcl", "yaml", "json", "sql", "toml"];
export type SerializerFormat = (typeof SerializerFormatValues)[number];
/**
 * Check if a value is a valid serializer format.
 */
export declare function isSerializerFormat(value: unknown): value is SerializerFormat;
//# sourceMappingURL=types.d.ts.map