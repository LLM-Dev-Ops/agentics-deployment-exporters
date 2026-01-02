/**
 * Validator Types
 *
 * Type definitions for the IntentValidator module.
 * Follows SPARC Architecture and Refinement specifications.
 */
// -----------------------------------------------------------------------------
// Error Codes (V1xxx pattern as per SPARC_REFINEMENT.md)
// -----------------------------------------------------------------------------
/**
 * Validation error code categories
 */
export const ValidationErrorCodes = {
    // Schema errors (V1000-V1099)
    SCHEMA_INVALID_JSON: 'V1001',
    SCHEMA_INVALID_YAML: 'V1002',
    SCHEMA_MISSING_REQUIRED: 'V1003',
    SCHEMA_INVALID_TYPE: 'V1004',
    SCHEMA_PATTERN_MISMATCH: 'V1005',
    SCHEMA_VALUE_OUT_OF_RANGE: 'V1006',
    SCHEMA_ARRAY_LENGTH_VIOLATION: 'V1007',
    SCHEMA_UNKNOWN_API_VERSION: 'V1008',
    // Reference errors (V1100-V1199)
    REF_UNDEFINED_RESOURCE: 'V1101',
    REF_UNDEFINED_SECRET: 'V1102',
    REF_UNDEFINED_CONFIG: 'V1103',
    REF_CIRCULAR_DEPENDENCY: 'V1104',
    REF_INVALID_PATH: 'V1105',
    // Constraint errors (V1200-V1299)
    CONSTRAINT_RESOURCE_LIMIT: 'V1201',
    CONSTRAINT_REPLICA_COUNT: 'V1202',
    CONSTRAINT_PORT_RANGE: 'V1203',
    CONSTRAINT_NAME_FORMAT: 'V1204',
    CONSTRAINT_ENV_VAR_FORMAT: 'V1205',
    CONSTRAINT_CROSS_FIELD: 'V1206',
    // Security errors (V1300-V1399)
    SECURITY_SQL_INJECTION: 'V1301',
    SECURITY_SHELL_INJECTION: 'V1302',
    SECURITY_TEMPLATE_INJECTION: 'V1303',
    SECURITY_PATH_TRAVERSAL: 'V1304',
    SECURITY_FORBIDDEN_PATTERN: 'V1305',
};
//# sourceMappingURL=types.js.map