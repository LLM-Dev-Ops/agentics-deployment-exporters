/**
 * SQL Serializer
 *
 * This module provides SQL DDL serialization with deterministic output.
 * All operations are pure and produce identical output for identical input.
 *
 * Features:
 * - PostgreSQL dialect (primary)
 * - MySQL, SQLite support
 * - Identifier quoting
 * - Type mapping
 * - Foreign key constraints
 * - Index definitions
 *
 * @module serializers/sql/SQLSerializer
 * @version 1.0.0
 */
import { BaseSerializer } from '../base/BaseSerializer.js';
import type { SerializerFormat, SQLSerializerOptionsRequired, ValidationResult } from '../base/types.js';
/**
 * SQL Serializer for DDL statements.
 *
 * This serializer converts SQL table definitions to DDL statements
 * with guaranteed deterministic output. All statements are sorted
 * and formatted consistently.
 *
 * @example
 * ```typescript
 * const serializer = new SQLSerializer();
 *
 * const ddl = serializer.serialize({
 *   dialect: 'postgresql',
 *   tables: [{
 *     name: 'users',
 *     columns: [
 *       { name: 'id', type: 'integer', primaryKey: true },
 *       { name: 'email', type: 'string', length: 255, unique: true },
 *       { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
 *     ]
 *   }]
 * });
 * ```
 */
export declare class SQLSerializer extends BaseSerializer<SQLSerializerOptionsRequired> {
    readonly format: SerializerFormat;
    protected readonly defaultOptions: SQLSerializerOptionsRequired;
    constructor();
    /**
     * Serialize data to SQL DDL format.
     */
    protected doSerialize(data: unknown, options: SQLSerializerOptionsRequired): string;
    /**
     * Deserialize SQL to structured data.
     *
     * Note: Full SQL parsing is complex; this provides basic parsing
     * for CREATE TABLE statements.
     */
    protected doDeserialize(text: string): unknown;
    /**
     * Validate SQL content.
     */
    protected doValidate(text: string): ValidationResult;
    /**
     * Type guard for SQLDocument.
     */
    private isSQLDocument;
    /**
     * Serialize an SQLDocument structure.
     */
    private serializeDocument;
    /**
     * Format table name with optional schema prefix.
     */
    private formatTableName;
    /**
     * Format CREATE TABLE statement.
     */
    private formatCreateTable;
    /**
     * Basic SQL DDL parser.
     *
     * This provides basic parsing for CREATE TABLE statements.
     * For production use with complex SQL, consider a dedicated parser.
     */
    private parseSQL;
    /**
     * Parse table body (columns and constraints).
     */
    private parseTableBody;
    /**
     * Split by comma, respecting parentheses.
     */
    private splitByComma;
    /**
     * Parse a column definition.
     */
    private parseColumnDef;
    /**
     * Map SQL type name to abstract type.
     */
    private mapTypeFromSQL;
    /**
     * Parse a default value.
     */
    private parseDefaultValue;
    /**
     * Detect SQL dialect from text.
     */
    private detectDialect;
}
/**
 * Create a new SQL serializer instance.
 */
export declare function createSQLSerializer(): SQLSerializer;
//# sourceMappingURL=SQLSerializer.d.ts.map