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
import { BaseSerializer, validationFromError, } from '../base/BaseSerializer.js';
import { createValidResult, DEFAULT_SQL_OPTIONS, } from '../base/types.js';
import { getDialectAdapter } from './DialectAdapters.js';
// =============================================================================
// SQL SERIALIZER
// =============================================================================
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
export class SQLSerializer extends BaseSerializer {
    format = 'sql';
    defaultOptions = DEFAULT_SQL_OPTIONS;
    constructor() {
        super('sql');
    }
    // ===========================================================================
    // ABSTRACT METHOD IMPLEMENTATIONS
    // ===========================================================================
    /**
     * Serialize data to SQL DDL format.
     */
    doSerialize(data, options) {
        if (!this.isSQLDocument(data)) {
            throw new Error('SQL serialization requires an SQLDocument structure');
        }
        return this.serializeDocument(data, options);
    }
    /**
     * Deserialize SQL to structured data.
     *
     * Note: Full SQL parsing is complex; this provides basic parsing
     * for CREATE TABLE statements.
     */
    doDeserialize(text) {
        return this.parseSQL(text);
    }
    /**
     * Validate SQL content.
     */
    doValidate(text) {
        try {
            this.parseSQL(text);
            return createValidResult();
        }
        catch (error) {
            return validationFromError(error);
        }
    }
    // ===========================================================================
    // DOCUMENT SERIALIZATION
    // ===========================================================================
    /**
     * Type guard for SQLDocument.
     */
    isSQLDocument(data) {
        return (typeof data === 'object' &&
            data !== null &&
            'tables' in data &&
            Array.isArray(data.tables));
    }
    /**
     * Serialize an SQLDocument structure.
     */
    serializeDocument(doc, options) {
        const adapter = getDialectAdapter(options.dialect);
        const statements = [];
        // Sort tables by name for determinism
        const sortedTables = [...doc.tables].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
        // Generate DROP statements if requested
        if (options.includeDrops) {
            for (const table of sortedTables.slice().reverse()) {
                const tableName = this.formatTableName(table.name, table.schema, options, adapter);
                statements.push(adapter.formatDropTable(tableName, options.uppercaseKeywords) + ';');
            }
            statements.push('');
        }
        // Generate CREATE TABLE statements
        for (const table of sortedTables) {
            const createStatement = this.formatCreateTable(table, adapter, options);
            statements.push(createStatement);
        }
        // Generate foreign key constraints (after all tables created)
        const fkStatements = [];
        for (const table of sortedTables) {
            const tableName = this.formatTableName(table.name, table.schema, options, adapter);
            for (const column of table.columns) {
                if (column.references) {
                    const fk = adapter.formatForeignKey(column, tableName, options.uppercaseKeywords);
                    if (fk) {
                        fkStatements.push(fk + ';');
                    }
                }
            }
        }
        if (fkStatements.length > 0) {
            statements.push('');
            statements.push(...fkStatements);
        }
        // Generate index statements
        const indexStatements = [];
        for (const table of sortedTables) {
            if (table.indexes && table.indexes.length > 0) {
                const tableName = this.formatTableName(table.name, table.schema, options, adapter);
                const sortedIndexes = [...table.indexes].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
                for (const index of sortedIndexes) {
                    indexStatements.push(adapter.formatIndex(index, tableName, options.uppercaseKeywords) + ';');
                }
            }
        }
        if (indexStatements.length > 0) {
            statements.push('');
            statements.push(...indexStatements);
        }
        return statements.join('\n');
    }
    /**
     * Format table name with optional schema prefix.
     */
    formatTableName(name, tableSchema, options, adapter) {
        const schema = tableSchema ?? options.schemaPrefix;
        if (options.quoteIdentifiers) {
            if (schema) {
                return `${adapter.quoteIdentifier(schema)}.${adapter.quoteIdentifier(name)}`;
            }
            return adapter.quoteIdentifier(name);
        }
        if (schema) {
            return `${schema}.${name}`;
        }
        return name;
    }
    /**
     * Format CREATE TABLE statement.
     */
    formatCreateTable(table, adapter, options) {
        const tableName = this.formatTableName(table.name, table.schema, options, adapter);
        // Sort columns by name for determinism (except preserve primary key first)
        const sortedColumns = [...table.columns].sort((a, b) => {
            if (a.primaryKey && !b.primaryKey)
                return -1;
            if (!a.primaryKey && b.primaryKey)
                return 1;
            return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
        });
        // Format column definitions
        const columnDefs = sortedColumns.map((col) => adapter.formatColumn(col, options.uppercaseKeywords));
        // Format constraints
        const constraints = [];
        // Composite primary key
        if (table.primaryKey && table.primaryKey.length > 1) {
            const kw = options.uppercaseKeywords ? 'PRIMARY KEY' : 'primary key';
            const cols = table.primaryKey
                .map((c) => (options.quoteIdentifiers ? adapter.quoteIdentifier(c) : c))
                .join(', ');
            constraints.push(`${kw} (${cols})`);
        }
        // Unique constraints
        if (table.uniqueConstraints) {
            const sortedConstraints = [...table.uniqueConstraints].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
            for (const uc of sortedConstraints) {
                const kw = options.uppercaseKeywords ? 'CONSTRAINT' : 'constraint';
                const unique = options.uppercaseKeywords ? 'UNIQUE' : 'unique';
                const cols = uc.columns
                    .map((c) => (options.quoteIdentifiers ? adapter.quoteIdentifier(c) : c))
                    .join(', ');
                constraints.push(`${kw} ${options.quoteIdentifiers ? adapter.quoteIdentifier(uc.name) : uc.name} ${unique} (${cols})`);
            }
        }
        return (adapter.formatCreateTable(tableName, columnDefs, constraints, options.ifNotExists, options.uppercaseKeywords) + ';');
    }
    // ===========================================================================
    // SQL PARSING
    // ===========================================================================
    /**
     * Basic SQL DDL parser.
     *
     * This provides basic parsing for CREATE TABLE statements.
     * For production use with complex SQL, consider a dedicated parser.
     */
    parseSQL(text) {
        const tables = [];
        const trimmed = text.trim();
        // Simple regex-based parsing for CREATE TABLE statements
        const createTableRegex = /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?(?:["'`]?(\w+)["'`]?\.)?["'`]?(\w+)["'`]?\s*\(([\s\S]*?)\);/gi;
        let match;
        while ((match = createTableRegex.exec(trimmed)) !== null) {
            const schema = match[2] ?? undefined;
            const tableName = match[3];
            const columnDefs = match[4];
            const table = this.parseTableBody(tableName, schema, columnDefs);
            tables.push(table);
        }
        return {
            tables,
            dialect: this.detectDialect(text),
        };
    }
    /**
     * Parse table body (columns and constraints).
     */
    parseTableBody(tableName, schema, body) {
        // Use mutable arrays during parsing
        const columnsList = [];
        const indexesList = [];
        const uniqueConstraintsList = [];
        let primaryKey = [];
        // Split by comma, but respect parentheses
        const parts = this.splitByComma(body);
        for (const part of parts) {
            const trimmedPart = part.trim();
            // Skip empty parts
            if (!trimmedPart)
                continue;
            // Check for PRIMARY KEY constraint
            if (/^PRIMARY\s+KEY/i.test(trimmedPart)) {
                const pkMatch = trimmedPart.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
                if (pkMatch) {
                    primaryKey = pkMatch[1]
                        .split(',')
                        .map((c) => c.trim().replace(/["'`]/g, ''));
                }
                continue;
            }
            // Check for UNIQUE constraint
            if (/^(CONSTRAINT\s+\w+\s+)?UNIQUE/i.test(trimmedPart)) {
                const ucMatch = trimmedPart.match(/(?:CONSTRAINT\s+["'`]?(\w+)["'`]?\s+)?UNIQUE\s*\(([^)]+)\)/i);
                if (ucMatch) {
                    uniqueConstraintsList.push({
                        name: ucMatch[1] ?? `uq_${tableName}_${uniqueConstraintsList.length}`,
                        columns: ucMatch[2]
                            .split(',')
                            .map((c) => c.trim().replace(/["'`]/g, '')),
                    });
                }
                continue;
            }
            // Check for FOREIGN KEY constraint
            if (/^(CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY/i.test(trimmedPart)) {
                // Foreign keys are handled differently - skip for now
                continue;
            }
            // Parse column definition
            const column = this.parseColumnDef(trimmedPart);
            if (column) {
                columnsList.push(column);
            }
        }
        // Build the final table object with proper optional fields
        const table = {
            name: tableName,
            ...(schema !== undefined && { schema }),
            columns: columnsList,
            ...(primaryKey.length > 0 && { primaryKey }),
            ...(indexesList.length > 0 && { indexes: indexesList }),
            ...(uniqueConstraintsList.length > 0 && { uniqueConstraints: uniqueConstraintsList }),
        };
        return table;
    }
    /**
     * Split by comma, respecting parentheses.
     */
    splitByComma(text) {
        const parts = [];
        let current = '';
        let depth = 0;
        for (const char of text) {
            if (char === '(') {
                depth++;
                current += char;
            }
            else if (char === ')') {
                depth--;
                current += char;
            }
            else if (char === ',' && depth === 0) {
                parts.push(current);
                current = '';
            }
            else {
                current += char;
            }
        }
        if (current.trim()) {
            parts.push(current);
        }
        return parts;
    }
    /**
     * Parse a column definition.
     */
    parseColumnDef(def) {
        // Match: name type [constraints...]
        const match = def.match(/^["'`]?(\w+)["'`]?\s+(\w+)(?:\(([^)]+)\))?\s*(.*)?$/i);
        if (!match) {
            return null;
        }
        const name = match[1];
        const typeName = match[2].toLowerCase();
        const typeParams = match[3];
        const constraints = match[4] ?? '';
        // Map type
        const type = this.mapTypeFromSQL(typeName);
        if (!type) {
            return null;
        }
        // Build the column object incrementally with optional properties
        let length;
        let precision;
        let scale;
        // Parse type parameters
        if (typeParams) {
            const params = typeParams.split(',').map((p) => parseInt(p.trim(), 10));
            if (params.length === 1) {
                length = params[0];
            }
            else if (params.length === 2) {
                precision = params[0];
                scale = params[1];
            }
        }
        // Parse constraints
        const nullable = /NOT\s+NULL/i.test(constraints) ? false : undefined;
        const primaryKey = /PRIMARY\s+KEY/i.test(constraints) ? true : undefined;
        const unique = /\bUNIQUE\b/i.test(constraints) ? true : undefined;
        let defaultValue;
        const defaultMatch = constraints.match(/DEFAULT\s+(.+?)(?:\s+|$)/i);
        if (defaultMatch) {
            defaultValue = this.parseDefaultValue(defaultMatch[1]);
        }
        // Construct column object with only defined properties
        const column = {
            name,
            type,
            ...(length !== undefined && { length }),
            ...(precision !== undefined && { precision }),
            ...(scale !== undefined && { scale }),
            ...(nullable !== undefined && { nullable }),
            ...(primaryKey !== undefined && { primaryKey }),
            ...(unique !== undefined && { unique }),
            ...(defaultValue !== undefined && { default: defaultValue }),
        };
        return column;
    }
    /**
     * Map SQL type name to abstract type.
     */
    mapTypeFromSQL(typeName) {
        const typeMap = {
            // PostgreSQL types
            varchar: 'string',
            text: 'text',
            integer: 'integer',
            int: 'integer',
            int4: 'integer',
            bigint: 'bigint',
            int8: 'bigint',
            real: 'float',
            float4: 'float',
            'double precision': 'double',
            float8: 'double',
            numeric: 'decimal',
            decimal: 'decimal',
            boolean: 'boolean',
            bool: 'boolean',
            date: 'date',
            timestamp: 'timestamp',
            timestamptz: 'timestamp',
            time: 'time',
            uuid: 'uuid',
            json: 'json',
            jsonb: 'jsonb',
            bytea: 'binary',
            // MySQL types
            tinyint: 'boolean',
            datetime: 'datetime',
            blob: 'blob',
            // SQLite types
            // (mostly covered above)
        };
        return typeMap[typeName] ?? null;
    }
    /**
     * Parse a default value.
     */
    parseDefaultValue(value) {
        const trimmed = value.trim();
        if (trimmed.toUpperCase() === 'NULL') {
            return null;
        }
        if (trimmed.toUpperCase() === 'TRUE') {
            return true;
        }
        if (trimmed.toUpperCase() === 'FALSE') {
            return false;
        }
        // Numeric value
        if (/^[-+]?\d*\.?\d+$/.test(trimmed)) {
            return Number(trimmed);
        }
        // String value (remove quotes)
        if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
            (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
            return trimmed.slice(1, -1);
        }
        // Function or expression
        return trimmed;
    }
    /**
     * Detect SQL dialect from text.
     */
    detectDialect(text) {
        const upperText = text.toUpperCase();
        // MySQL indicators
        if (upperText.includes('ENGINE=') ||
            upperText.includes('AUTO_INCREMENT') ||
            upperText.includes('CHARSET=')) {
            return 'mysql';
        }
        // SQLite indicators
        if (upperText.includes('AUTOINCREMENT') ||
            upperText.includes("DATETIME('NOW')")) {
            return 'sqlite';
        }
        // MS SQL indicators
        if (upperText.includes('NVARCHAR') ||
            upperText.includes('UNIQUEIDENTIFIER') ||
            upperText.includes('DATETIME2')) {
            return 'mssql';
        }
        // Oracle indicators
        if (upperText.includes('VARCHAR2') ||
            upperText.includes('NUMBER(') ||
            upperText.includes('CLOB')) {
            return 'oracle';
        }
        // Default to PostgreSQL
        return 'postgresql';
    }
}
// =============================================================================
// FACTORY FUNCTION
// =============================================================================
/**
 * Create a new SQL serializer instance.
 */
export function createSQLSerializer() {
    return new SQLSerializer();
}
//# sourceMappingURL=SQLSerializer.js.map