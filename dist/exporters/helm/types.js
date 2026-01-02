/**
 * Helm-Specific Type Definitions
 *
 * This module defines all types specific to Helm chart generation.
 * These types model the structure of Helm charts and their components.
 *
 * @module exporters/helm/types
 * @version 1.0.0
 */
// =============================================================================
// TYPE GUARDS
// =============================================================================
/**
 * Type guard for HelmChart.
 */
export function isHelmChart(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const chart = value;
    return (chart['apiVersion'] === 'v2' &&
        typeof chart['name'] === 'string' &&
        typeof chart['version'] === 'string' &&
        typeof chart['description'] === 'string');
}
/**
 * Type guard for HelmValues.
 */
export function isHelmValues(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const values = value;
    return (typeof values['replicaCount'] === 'number' &&
        typeof values['image'] === 'object' &&
        typeof values['service'] === 'object' &&
        typeof values['resources'] === 'object');
}
//# sourceMappingURL=types.js.map