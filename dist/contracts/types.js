/**
 * Contract Types for Agentics Deployment Exporters
 *
 * TypeScript type definitions derived from the JSON Schema contracts.
 * These types provide compile-time type safety for request/response contracts.
 *
 * @module contracts/types
 * @version 1.0.0
 */
/**
 * All supported export format values as array
 */
export const ExportFormatValues = [
    'terraform',
    'kubernetes',
    'helm',
    'cloudformation',
    'arm',
    'gcp-dm',
    'iam',
    'sql',
    'docker-compose',
    'config',
];
// =============================================================================
// TYPE GUARDS
// =============================================================================
/**
 * Type guard for Intent
 */
export function isIntent(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const obj = value;
    return (typeof obj.apiVersion === 'string' &&
        typeof obj.kind === 'string' &&
        typeof obj.metadata === 'object' &&
        obj.metadata !== null &&
        typeof obj.metadata.name === 'string');
}
/**
 * Type guard for ExportFormat
 */
export function isExportFormat(value) {
    return typeof value === 'string' && ExportFormatValues.includes(value);
}
/**
 * Type guard for ExporterRequest
 */
export function isExporterRequest(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const obj = value;
    return isIntent(obj.intent);
}
//# sourceMappingURL=types.js.map