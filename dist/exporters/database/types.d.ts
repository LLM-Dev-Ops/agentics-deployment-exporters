/**
 * Database Schema Exporter Type Definitions
 *
 * This module defines types for database schema generation including
 * tables, columns, indexes, foreign keys, and migrations.
 *
 * All types are immutable and designed for deterministic serialization.
 *
 * @module exporters/database/types
 * @version 1.0.0
 */
export type { SQLDialect, SQLDataType, SQLColumn, SQLForeignKey, SQLIndex, SQLTable, SQLDocument, } from '../../serializers/base/types.js';
/**
 * Extended column definition with additional metadata.
 */
export interface Column {
    /** Column name */
    readonly name: string;
    /** Data type (abstract, mapped to dialect-specific) */
    readonly type: ColumnType;
    /** Length for string types */
    readonly length?: number | undefined;
    /** Precision for decimal types */
    readonly precision?: number | undefined;
    /** Scale for decimal types */
    readonly scale?: number | undefined;
    /** Whether column allows NULL values */
    readonly nullable: boolean;
    /** Whether column is primary key */
    readonly primaryKey: boolean;
    /** Whether column has unique constraint */
    readonly unique: boolean;
    /** Default value */
    readonly defaultValue?: string | number | boolean | null | undefined;
    /** Auto-increment/serial */
    readonly autoIncrement?: boolean | undefined;
    /** Foreign key reference */
    readonly references?: ForeignKeyReference | undefined;
    /** Column comment/description */
    readonly comment?: string | undefined;
    /** Column-level check constraint */
    readonly check?: string | undefined;
}
/**
 * Abstract column types (mapped to dialect-specific types).
 */
export type ColumnType = 'string' | 'text' | 'integer' | 'bigint' | 'smallint' | 'float' | 'double' | 'decimal' | 'boolean' | 'date' | 'datetime' | 'timestamp' | 'time' | 'uuid' | 'json' | 'jsonb' | 'binary' | 'blob' | 'array' | 'enum';
/**
 * Foreign key reference definition.
 */
export interface ForeignKeyReference {
    /** Referenced table name */
    readonly table: string;
    /** Referenced column name */
    readonly column: string;
    /** ON DELETE action */
    readonly onDelete?: ForeignKeyAction | undefined;
    /** ON UPDATE action */
    readonly onUpdate?: ForeignKeyAction | undefined;
    /** Constraint name */
    readonly constraintName?: string | undefined;
}
/**
 * Foreign key referential actions.
 */
export type ForeignKeyAction = 'cascade' | 'set null' | 'set default' | 'restrict' | 'no action';
/**
 * Standalone foreign key constraint.
 */
export interface ForeignKey {
    /** Constraint name */
    readonly name: string;
    /** Source table */
    readonly sourceTable: string;
    /** Source columns */
    readonly sourceColumns: readonly string[];
    /** Referenced table */
    readonly targetTable: string;
    /** Referenced columns */
    readonly targetColumns: readonly string[];
    /** ON DELETE action */
    readonly onDelete?: ForeignKeyAction | undefined;
    /** ON UPDATE action */
    readonly onUpdate?: ForeignKeyAction | undefined;
}
/**
 * Database index definition.
 */
export interface Index {
    /** Index name */
    readonly name: string;
    /** Indexed columns */
    readonly columns: readonly IndexColumn[];
    /** Whether index is unique */
    readonly unique: boolean;
    /** Index type */
    readonly type?: IndexType | undefined;
    /** Partial index WHERE clause */
    readonly where?: string | undefined;
    /** Index comment */
    readonly comment?: string | undefined;
    /** Include columns (PostgreSQL covering indexes) */
    readonly include?: readonly string[] | undefined;
    /** Concurrent creation (non-blocking) */
    readonly concurrent?: boolean | undefined;
}
/**
 * Column in an index with optional direction.
 */
export interface IndexColumn {
    /** Column name */
    readonly name: string;
    /** Sort direction */
    readonly direction?: 'ASC' | 'DESC' | undefined;
    /** Null ordering */
    readonly nulls?: 'FIRST' | 'LAST' | undefined;
    /** Operator class (PostgreSQL) */
    readonly opclass?: string | undefined;
}
/**
 * Index types.
 */
export type IndexType = 'btree' | 'hash' | 'gin' | 'gist' | 'brin' | 'spgist' | 'fulltext';
/**
 * Database table definition.
 */
export interface Table {
    /** Table name */
    readonly name: string;
    /** Schema name */
    readonly schema?: string | undefined;
    /** Table columns */
    readonly columns: readonly Column[];
    /** Composite primary key (if not defined on columns) */
    readonly primaryKey?: readonly string[] | undefined;
    /** Table indexes */
    readonly indexes?: readonly Index[] | undefined;
    /** Foreign key constraints */
    readonly foreignKeys?: readonly ForeignKey[] | undefined;
    /** Unique constraints */
    readonly uniqueConstraints?: readonly UniqueConstraint[] | undefined;
    /** Check constraints */
    readonly checkConstraints?: readonly CheckConstraint[] | undefined;
    /** Table comment */
    readonly comment?: string | undefined;
    /** Table options (engine, charset, etc.) */
    readonly options?: TableOptions | undefined;
}
/**
 * Unique constraint definition.
 */
export interface UniqueConstraint {
    /** Constraint name */
    readonly name: string;
    /** Constrained columns */
    readonly columns: readonly string[];
}
/**
 * Check constraint definition.
 */
export interface CheckConstraint {
    /** Constraint name */
    readonly name: string;
    /** Check expression */
    readonly expression: string;
}
/**
 * Table options (dialect-specific).
 */
export interface TableOptions {
    /** Storage engine (MySQL) */
    readonly engine?: string | undefined;
    /** Character set */
    readonly charset?: string | undefined;
    /** Collation */
    readonly collation?: string | undefined;
    /** Row format */
    readonly rowFormat?: string | undefined;
    /** Table tablespace */
    readonly tablespace?: string | undefined;
    /** Partitioning */
    readonly partitioning?: PartitionDefinition | undefined;
}
/**
 * Partition definition.
 */
export interface PartitionDefinition {
    /** Partition type */
    readonly type: 'RANGE' | 'LIST' | 'HASH' | 'KEY';
    /** Partition columns */
    readonly columns: readonly string[];
    /** Partition definitions */
    readonly partitions?: readonly Partition[] | undefined;
}
/**
 * Single partition.
 */
export interface Partition {
    /** Partition name */
    readonly name: string;
    /** VALUES LESS THAN or VALUES IN */
    readonly values: string | readonly string[];
}
/**
 * Database migration file.
 */
export interface Migration {
    /** Migration number (for ordering) */
    readonly number: number;
    /** Migration name */
    readonly name: string;
    /** Full migration filename */
    readonly filename: string;
    /** Up migration SQL */
    readonly up: string;
    /** Down migration SQL */
    readonly down: string;
    /** Migration description */
    readonly description?: string | undefined;
    /** Tables created */
    readonly creates?: readonly string[] | undefined;
    /** Tables altered */
    readonly alters?: readonly string[] | undefined;
    /** Tables dropped */
    readonly drops?: readonly string[] | undefined;
    /** Checksum for change detection */
    readonly checksum?: string | undefined;
}
/**
 * Migration set (all migrations for a database).
 */
export interface MigrationSet {
    /** Database name */
    readonly database: string;
    /** SQL dialect */
    readonly dialect: DatabaseDialect;
    /** Ordered migrations */
    readonly migrations: readonly Migration[];
    /** Base migration number */
    readonly baseNumber?: number | undefined;
}
/**
 * Complete database schema configuration.
 */
export interface DatabaseConfiguration {
    /** Database name */
    readonly name: string;
    /** SQL dialect */
    readonly dialect: DatabaseDialect;
    /** Database schema (namespace) */
    readonly schema?: string | undefined;
    /** Tables */
    readonly tables: readonly Table[];
    /** Views (optional) */
    readonly views?: readonly View[] | undefined;
    /** Sequences (optional) */
    readonly sequences?: readonly Sequence[] | undefined;
    /** Extensions (PostgreSQL) */
    readonly extensions?: readonly string[] | undefined;
    /** Custom types/enums */
    readonly customTypes?: readonly CustomType[] | undefined;
}
/**
 * Supported database dialects.
 */
export type DatabaseDialect = 'postgresql' | 'mysql' | 'mariadb' | 'sqlite' | 'mssql' | 'oracle';
/**
 * Database view definition.
 */
export interface View {
    /** View name */
    readonly name: string;
    /** Schema name */
    readonly schema?: string | undefined;
    /** View definition (SELECT statement) */
    readonly definition: string;
    /** Whether view is materialized */
    readonly materialized?: boolean | undefined;
    /** Check option */
    readonly checkOption?: 'LOCAL' | 'CASCADED' | undefined;
    /** Comment */
    readonly comment?: string | undefined;
}
/**
 * Database sequence definition.
 */
export interface Sequence {
    /** Sequence name */
    readonly name: string;
    /** Schema name */
    readonly schema?: string | undefined;
    /** Start value */
    readonly start?: number | undefined;
    /** Increment by */
    readonly increment?: number | undefined;
    /** Minimum value */
    readonly minValue?: number | undefined;
    /** Maximum value */
    readonly maxValue?: number | undefined;
    /** Cycle option */
    readonly cycle?: boolean | undefined;
    /** Cache size */
    readonly cache?: number | undefined;
}
/**
 * Custom type definition (enum, composite).
 */
export interface CustomType {
    /** Type name */
    readonly name: string;
    /** Schema name */
    readonly schema?: string | undefined;
    /** Type kind */
    readonly kind: 'enum' | 'composite' | 'range';
    /** Enum values (for enum types) */
    readonly values?: readonly string[] | undefined;
    /** Composite attributes (for composite types) */
    readonly attributes?: readonly {
        name: string;
        type: string;
    }[] | undefined;
}
/**
 * Database-related resource types from intent.
 */
export declare const DATABASE_RESOURCE_TYPES: readonly ["database", "table", "index", "migration", "schema", "view", "sequence"];
export type DatabaseResourceType = (typeof DATABASE_RESOURCE_TYPES)[number];
/**
 * Check if a resource type is database-related.
 */
export declare function isDatabaseResourceType(type: string): type is DatabaseResourceType;
/**
 * DDL statement with metadata.
 */
export interface DDLStatement {
    /** Statement type */
    readonly type: DDLStatementType;
    /** SQL statement */
    readonly sql: string;
    /** Object name */
    readonly objectName: string;
    /** Object type */
    readonly objectType: DDLObjectType;
    /** Dependencies (objects this depends on) */
    readonly dependencies?: readonly string[] | undefined;
}
/**
 * DDL statement types.
 */
export type DDLStatementType = 'CREATE' | 'ALTER' | 'DROP' | 'TRUNCATE' | 'COMMENT';
/**
 * DDL object types.
 */
export type DDLObjectType = 'TABLE' | 'INDEX' | 'VIEW' | 'SEQUENCE' | 'TYPE' | 'CONSTRAINT' | 'TRIGGER' | 'FUNCTION' | 'COLUMN';
/**
 * Default dialect for database exports.
 */
export declare const DEFAULT_DIALECT: DatabaseDialect;
/**
 * Default migration number format (4 digits).
 */
export declare const MIGRATION_NUMBER_FORMAT = 4;
/**
 * Common timestamp default values by dialect.
 */
export declare const TIMESTAMP_DEFAULTS: Readonly<Record<DatabaseDialect, string>>;
//# sourceMappingURL=types.d.ts.map