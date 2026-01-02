/**
 * Database Schema Exporter
 *
 * Main exporter implementation that transforms NormalizedIntent into
 * database schema files (DDL) and migrations. Supports PostgreSQL and MySQL.
 *
 * All exports are deterministic and produce byte-identical output for the
 * same input, regardless of execution environment.
 *
 * @module exporters/database/DatabaseSchemaExporter
 * @version 1.0.0
 */
import { isDatabaseResourceType, DEFAULT_DIALECT } from './types.js';
import { generateCreateTable, generateCreateIndex, generateForeignKey, DEFAULT_DDL_OPTIONS, } from './DDLGenerator.js';
import { generateSchemaMigrations, topologicalSortTables } from './MigrationGenerator.js';
// =============================================================================
// CONSTANTS
// =============================================================================
const EXPORTER_ID = 'database';
const EXPORTER_NAME = 'Database Schema Exporter';
const EXPORTER_VERSION = '1.0.0';
// =============================================================================
// DATABASE SCHEMA EXPORTER CLASS
// =============================================================================
/**
 * Exports deployment intents to database schema files.
 *
 * Generates SQL DDL files including:
 * - Schema DDL (CREATE TABLE, CREATE INDEX)
 * - Migration files (numbered, with up/down)
 *
 * All output is deterministic with topological ordering for foreign keys.
 *
 * @example
 * ```typescript
 * const exporter = new DatabaseSchemaExporter();
 * const artifacts = exporter.transform(normalizedIntent, {
 *   variables: { dialect: 'postgresql' }
 * });
 * // artifacts contains schema.sql, migrations/0001_*.sql, etc.
 * ```
 */
export class DatabaseSchemaExporter {
    id = EXPORTER_ID;
    name = EXPORTER_NAME;
    version = EXPORTER_VERSION;
    targetFormat = 'sql';
    /**
     * Transform a normalized intent into database schema artifacts.
     *
     * @param intent - Normalized, validated DeploymentIntent
     * @param options - Optional export configuration
     * @returns Array of export artifacts (SQL files)
     */
    transform(intent, options) {
        const environment = options?.environment ?? intent.spec.target.environment;
        const dialect = this.resolveDialect(options);
        // Extract database configuration from intent
        const dbConfig = this.extractDatabaseConfiguration(intent, dialect);
        // Generate artifacts
        const artifacts = [];
        // Generate schema DDL
        artifacts.push(this.generateSchemaArtifact(dbConfig, intent, environment));
        // Generate migrations
        const migrationArtifacts = this.generateMigrationArtifacts(dbConfig, intent, environment);
        artifacts.push(...migrationArtifacts);
        // Sort artifacts by path for deterministic output
        return [...artifacts].sort((a, b) => a.path.localeCompare(b.path, 'en'));
    }
    /**
     * Validate that an intent can be exported by this exporter.
     *
     * @param intent - Intent to validate
     * @returns Validation result with errors/warnings
     */
    validate(intent) {
        const errors = [];
        const warnings = [];
        // Check for database resources
        const dbResources = intent.spec.resources.filter(r => isDatabaseResourceType(r.type));
        if (dbResources.length === 0) {
            warnings.push({
                code: 'DB001',
                message: 'No database resources found in intent',
                path: '$.spec.resources',
            });
        }
        // Validate each database resource
        const tableNames = new Set();
        for (let i = 0; i < dbResources.length; i++) {
            const resource = dbResources[i];
            const resourceType = resource.type.toLowerCase();
            if (resourceType === 'table' || resourceType.includes('table')) {
                // Validate table name
                if (!resource.name) {
                    errors.push({
                        code: 'DB002',
                        message: 'Table resource must have a name',
                        path: `$.spec.resources[${i}].name`,
                    });
                }
                else if (tableNames.has(resource.name)) {
                    errors.push({
                        code: 'DB003',
                        message: `Duplicate table name: ${resource.name}`,
                        path: `$.spec.resources[${i}].name`,
                    });
                }
                else {
                    tableNames.add(resource.name);
                }
                // Validate columns
                const columns = resource.properties.columns;
                if (!columns || !Array.isArray(columns) || columns.length === 0) {
                    errors.push({
                        code: 'DB004',
                        message: 'Table must have at least one column',
                        path: `$.spec.resources[${i}].properties.columns`,
                    });
                }
            }
        }
        // Validate foreign key references
        for (let i = 0; i < dbResources.length; i++) {
            const resource = dbResources[i];
            const columns = resource.properties.columns;
            if (Array.isArray(columns)) {
                for (const col of columns) {
                    if (typeof col === 'object' && col !== null && 'references' in col) {
                        const ref = col.references;
                        if (ref.table && !tableNames.has(ref.table)) {
                            warnings.push({
                                code: 'DB101',
                                message: `Foreign key references unknown table: ${ref.table}`,
                                path: `$.spec.resources[${i}].properties.columns`,
                            });
                        }
                    }
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * Check if this exporter can handle the given intent.
     *
     * @param intent - Intent to check
     * @returns true if this exporter can handle the intent
     */
    canHandle(intent) {
        return intent.spec.resources.some(r => isDatabaseResourceType(r.type));
    }
    /**
     * Get the serializers required by this exporter.
     *
     * @returns Array of serializer types needed for artifact serialization
     */
    getRequiredSerializers() {
        return ['sql'];
    }
    // =============================================================================
    // PRIVATE METHODS
    // =============================================================================
    /**
     * Resolve the SQL dialect from options.
     */
    resolveDialect(options) {
        if (options?.variables?.dialect) {
            const dialect = options.variables.dialect;
            if (typeof dialect === 'string') {
                const normalizedDialect = dialect.toLowerCase();
                if (['postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql', 'oracle'].includes(normalizedDialect)) {
                    return normalizedDialect;
                }
            }
        }
        return DEFAULT_DIALECT;
    }
    /**
     * Extract database configuration from intent.
     */
    extractDatabaseConfiguration(intent, dialect) {
        const dbResources = intent.spec.resources.filter(r => isDatabaseResourceType(r.type));
        // Extract database name
        const dbResource = dbResources.find(r => r.type.toLowerCase() === 'database');
        const databaseName = dbResource?.name ?? intent.intentId.replace(/-/g, '_');
        // Extract tables
        const tableResources = dbResources.filter(r => r.type.toLowerCase() === 'table' || r.type.toLowerCase().includes('table'));
        const tables = tableResources.map(r => this.extractTable(r));
        // Sort tables deterministically
        const sortedTables = [...tables].sort((a, b) => a.name.localeCompare(b.name, 'en'));
        return Object.freeze({
            name: databaseName,
            dialect,
            schema: dbResource?.properties.schema,
            tables: Object.freeze(sortedTables),
        });
    }
    /**
     * Extract table definition from intent resource.
     */
    extractTable(resource) {
        const props = resource.properties;
        const columns = [];
        const indexes = [];
        const foreignKeys = [];
        // Extract columns
        const rawColumns = props.columns;
        if (Array.isArray(rawColumns)) {
            for (const col of rawColumns) {
                if (typeof col === 'object' && col !== null) {
                    const column = this.extractColumn(col);
                    columns.push(column);
                    // Extract inline foreign key
                    if ('references' in col) {
                        const ref = col.references;
                        if (ref && typeof ref.table === 'string') {
                            foreignKeys.push({
                                name: `fk_${resource.name}_${column.name}`,
                                sourceTable: resource.name,
                                sourceColumns: [column.name],
                                targetTable: ref.table,
                                targetColumns: [typeof ref.column === 'string' ? ref.column : 'id'],
                                onDelete: this.extractForeignKeyAction(ref.onDelete),
                                onUpdate: this.extractForeignKeyAction(ref.onUpdate),
                            });
                        }
                    }
                }
            }
        }
        // Extract indexes
        const rawIndexes = props.indexes;
        if (Array.isArray(rawIndexes)) {
            for (const idx of rawIndexes) {
                if (typeof idx === 'object' && idx !== null) {
                    const index = this.extractIndex(idx, resource.name);
                    indexes.push(index);
                }
            }
        }
        // Extract explicit foreign keys
        const rawForeignKeys = props.foreignKeys;
        if (Array.isArray(rawForeignKeys)) {
            for (const fk of rawForeignKeys) {
                if (typeof fk === 'object' && fk !== null) {
                    const foreignKey = this.extractForeignKey(fk, resource.name);
                    foreignKeys.push(foreignKey);
                }
            }
        }
        // Sort for determinism
        const sortedColumns = [...columns].sort((a, b) => {
            if (a.primaryKey && !b.primaryKey)
                return -1;
            if (!a.primaryKey && b.primaryKey)
                return 1;
            return a.name.localeCompare(b.name, 'en');
        });
        const sortedIndexes = [...indexes].sort((a, b) => a.name.localeCompare(b.name, 'en'));
        const sortedForeignKeys = [...foreignKeys].sort((a, b) => a.name.localeCompare(b.name, 'en'));
        return Object.freeze({
            name: resource.name,
            schema: typeof props.schema === 'string' ? props.schema : undefined,
            columns: Object.freeze(sortedColumns),
            primaryKey: this.extractPrimaryKey(columns, props),
            indexes: sortedIndexes.length > 0 ? Object.freeze(sortedIndexes) : undefined,
            foreignKeys: sortedForeignKeys.length > 0 ? Object.freeze(sortedForeignKeys) : undefined,
            comment: typeof props.description === 'string' ? props.description : undefined,
        });
    }
    /**
     * Extract column definition.
     */
    extractColumn(col) {
        const name = typeof col.name === 'string' ? col.name : 'unnamed';
        const type = this.mapColumnType(col.type);
        return Object.freeze({
            name,
            type,
            length: typeof col.length === 'number' ? col.length : undefined,
            precision: typeof col.precision === 'number' ? col.precision : undefined,
            scale: typeof col.scale === 'number' ? col.scale : undefined,
            nullable: col.nullable !== false && col.primaryKey !== true,
            primaryKey: col.primaryKey === true,
            unique: col.unique === true,
            defaultValue: this.extractDefaultValue(col.default),
            autoIncrement: col.autoIncrement === true,
            comment: typeof col.comment === 'string' ? col.comment : undefined,
            check: typeof col.check === 'string' ? col.check : undefined,
        });
    }
    /**
     * Map raw column type to ColumnType.
     */
    mapColumnType(rawType) {
        if (typeof rawType !== 'string') {
            return 'string';
        }
        const typeMap = {
            string: 'string',
            varchar: 'string',
            text: 'text',
            int: 'integer',
            integer: 'integer',
            bigint: 'bigint',
            smallint: 'smallint',
            float: 'float',
            double: 'double',
            decimal: 'decimal',
            numeric: 'decimal',
            bool: 'boolean',
            boolean: 'boolean',
            date: 'date',
            datetime: 'datetime',
            timestamp: 'timestamp',
            time: 'time',
            uuid: 'uuid',
            json: 'json',
            jsonb: 'jsonb',
            binary: 'binary',
            blob: 'blob',
            array: 'array',
            enum: 'enum',
        };
        return typeMap[rawType.toLowerCase()] ?? 'string';
    }
    /**
     * Extract default value.
     */
    extractDefaultValue(raw) {
        if (raw === undefined)
            return undefined;
        if (raw === null)
            return null;
        if (typeof raw === 'boolean')
            return raw;
        if (typeof raw === 'number')
            return raw;
        if (typeof raw === 'string')
            return raw;
        return undefined;
    }
    /**
     * Extract foreign key action.
     */
    extractForeignKeyAction(raw) {
        if (typeof raw !== 'string')
            return undefined;
        const normalized = raw.toLowerCase().replace(/_/g, ' ');
        const validActions = ['cascade', 'set null', 'set default', 'restrict', 'no action'];
        return validActions.includes(normalized) ? normalized : undefined;
    }
    /**
     * Extract index definition.
     */
    extractIndex(idx, tableName) {
        const name = typeof idx.name === 'string'
            ? idx.name
            : `idx_${tableName}_${Date.now()}`;
        const columns = [];
        if (Array.isArray(idx.columns)) {
            for (const col of idx.columns) {
                if (typeof col === 'string') {
                    columns.push({ name: col });
                }
                else if (typeof col === 'object' && col !== null) {
                    const colObj = col;
                    columns.push({
                        name: typeof colObj.name === 'string' ? colObj.name : '',
                        direction: colObj.direction === 'DESC' ? 'DESC' : 'ASC',
                    });
                }
            }
        }
        return Object.freeze({
            name,
            columns: Object.freeze(columns),
            unique: idx.unique === true,
            type: this.extractIndexType(idx.type),
            where: typeof idx.where === 'string' ? idx.where : undefined,
        });
    }
    /**
     * Extract index type.
     */
    extractIndexType(raw) {
        if (typeof raw !== 'string')
            return undefined;
        const validTypes = ['btree', 'hash', 'gin', 'gist', 'brin', 'spgist'];
        const normalized = raw.toLowerCase();
        return validTypes.includes(normalized) ? normalized : undefined;
    }
    /**
     * Extract foreign key definition.
     */
    extractForeignKey(fk, tableName) {
        const name = typeof fk.name === 'string'
            ? fk.name
            : `fk_${tableName}_${Date.now()}`;
        const sourceColumns = Array.isArray(fk.columns)
            ? fk.columns.filter((c) => typeof c === 'string')
            : [];
        const targetColumns = Array.isArray(fk.referencedColumns)
            ? fk.referencedColumns.filter((c) => typeof c === 'string')
            : ['id'];
        return Object.freeze({
            name,
            sourceTable: tableName,
            sourceColumns: Object.freeze(sourceColumns),
            targetTable: typeof fk.referencedTable === 'string' ? fk.referencedTable : '',
            targetColumns: Object.freeze(targetColumns),
            onDelete: this.extractForeignKeyAction(fk.onDelete),
            onUpdate: this.extractForeignKeyAction(fk.onUpdate),
        });
    }
    /**
     * Extract primary key columns.
     */
    extractPrimaryKey(columns, props) {
        // Check for explicit primary key definition
        if (Array.isArray(props.primaryKey)) {
            const pk = props.primaryKey.filter((c) => typeof c === 'string');
            if (pk.length > 0)
                return Object.freeze(pk);
        }
        // Extract from columns marked as primary key
        const pkColumns = columns.filter(c => c.primaryKey).map(c => c.name);
        if (pkColumns.length > 1) {
            return Object.freeze(pkColumns);
        }
        return undefined;
    }
    /**
     * Generate schema DDL artifact.
     */
    generateSchemaArtifact(config, intent, environment) {
        const ddlOptions = {
            ...DEFAULT_DDL_OPTIONS,
            dialect: config.dialect,
        };
        const basePath = environment
            ? `database/${environment}`
            : 'database';
        // Generate DDL statements
        const statements = [];
        // Header
        statements.push('-- =============================================================================');
        statements.push(`-- Database Schema: ${config.name}`);
        statements.push('-- =============================================================================');
        statements.push(`-- Intent ID: ${intent.intentId}`);
        statements.push(`-- Intent Version: ${intent.version}`);
        statements.push(`-- Intent Hash: ${intent.canonicalHash}`);
        statements.push(`-- Exporter: ${EXPORTER_NAME} v${EXPORTER_VERSION}`);
        statements.push(`-- Dialect: ${config.dialect}`);
        statements.push('-- =============================================================================');
        statements.push('');
        // Sort tables for foreign key ordering
        const sortedTables = topologicalSortTables(config.tables);
        // Create tables
        statements.push('-- Tables');
        statements.push('-- -----------------------------------------------------------------------------');
        for (const table of sortedTables) {
            const ddl = generateCreateTable(table, ddlOptions);
            statements.push(ddl.sql);
            statements.push('');
        }
        // Foreign keys (after all tables)
        const allForeignKeys = [];
        for (const table of sortedTables) {
            if (table.foreignKeys) {
                for (const fk of table.foreignKeys) {
                    const ddl = generateForeignKey(fk, table.schema, ddlOptions);
                    allForeignKeys.push(ddl.sql);
                }
            }
        }
        if (allForeignKeys.length > 0) {
            statements.push('-- Foreign Keys');
            statements.push('-- -----------------------------------------------------------------------------');
            for (const fkSql of allForeignKeys) {
                statements.push(fkSql);
            }
            statements.push('');
        }
        // Indexes
        const allIndexes = [];
        for (const table of sortedTables) {
            if (table.indexes) {
                for (const index of table.indexes) {
                    const ddl = generateCreateIndex(index, table.name, table.schema, ddlOptions);
                    allIndexes.push(ddl.sql);
                }
            }
        }
        if (allIndexes.length > 0) {
            statements.push('-- Indexes');
            statements.push('-- -----------------------------------------------------------------------------');
            for (const idxSql of allIndexes) {
                statements.push(idxSql);
            }
        }
        return {
            path: `${basePath}/schema.sql`,
            content: statements.join('\n'),
            format: 'sql',
            encoding: 'utf-8',
            metadata: {
                intentId: intent.intentId,
                intentHash: intent.canonicalHash,
                exporterVersion: EXPORTER_VERSION,
                dialect: config.dialect,
                tableCount: config.tables.length,
            },
        };
    }
    /**
     * Generate migration artifacts.
     */
    generateMigrationArtifacts(config, intent, environment) {
        const basePath = environment
            ? `database/${environment}/migrations`
            : 'database/migrations';
        const migrationSet = generateSchemaMigrations(config, {
            separateTables: true,
            includeComments: true,
        });
        const artifacts = [];
        for (const migration of migrationSet.migrations) {
            // UP migration
            artifacts.push({
                path: `${basePath}/${migration.filename}`,
                content: migration.up,
                format: 'sql',
                encoding: 'utf-8',
                metadata: {
                    intentId: intent.intentId,
                    intentHash: intent.canonicalHash,
                    exporterVersion: EXPORTER_VERSION,
                    dialect: config.dialect,
                    migrationNumber: migration.number,
                    migrationType: 'up',
                    checksum: migration.checksum,
                },
            });
            // DOWN migration (rollback)
            const downFilename = migration.filename.replace('.sql', '_rollback.sql');
            artifacts.push({
                path: `${basePath}/${downFilename}`,
                content: migration.down,
                format: 'sql',
                encoding: 'utf-8',
                metadata: {
                    intentId: intent.intentId,
                    intentHash: intent.canonicalHash,
                    exporterVersion: EXPORTER_VERSION,
                    dialect: config.dialect,
                    migrationNumber: migration.number,
                    migrationType: 'down',
                },
            });
        }
        return artifacts;
    }
}
// =============================================================================
// FACTORY FUNCTION
// =============================================================================
/**
 * Create a new DatabaseSchemaExporter instance.
 *
 * @returns New DatabaseSchemaExporter instance
 */
export function createDatabaseSchemaExporter() {
    return new DatabaseSchemaExporter();
}
//# sourceMappingURL=DatabaseSchemaExporter.js.map