/**
 * Executive Synthesis Type Definitions
 *
 * This module defines types for generating executive summaries
 * of deployment operations, providing decision-support information
 * for approval workflows.
 *
 * @module synthesis/types
 * @version 1.0.0
 */
// =============================================================================
// RISK LEVEL
// =============================================================================
/**
 * Risk levels for deployment operations.
 * Used to communicate deployment risk to approvers.
 */
export const RiskLevelValues = ['low', 'medium', 'high', 'critical'];
// =============================================================================
// RECOMMENDATION
// =============================================================================
/**
 * Recommendation actions for deployment operations.
 */
export const RecommendationValues = ['APPROVE', 'DEFER', 'REJECT'];
// =============================================================================
// DEPLOY PREVIEW TYPES
// =============================================================================
/**
 * Change action types for deployment preview.
 */
export const ChangeActionValues = ['create', 'update', 'delete', 'no-op'];
// =============================================================================
// DEPLOY RECORD TYPES
// =============================================================================
/**
 * Status of a deployment.
 */
export const DeployStatusValues = [
    'pending',
    'in_progress',
    'completed',
    'failed',
    'rolled_back',
];
// =============================================================================
// TYPE GUARDS
// =============================================================================
/**
 * Type guard for RiskLevel.
 */
export function isRiskLevel(value) {
    return typeof value === 'string' && RiskLevelValues.includes(value);
}
/**
 * Type guard for Recommendation.
 */
export function isRecommendation(value) {
    return typeof value === 'string' && RecommendationValues.includes(value);
}
/**
 * Type guard for ChangeAction.
 */
export function isChangeAction(value) {
    return typeof value === 'string' && ChangeActionValues.includes(value);
}
/**
 * Type guard for DeployStatus.
 */
export function isDeployStatus(value) {
    return typeof value === 'string' && DeployStatusValues.includes(value);
}
/**
 * Type guard for ExecutiveSummary.
 */
export function isExecutiveSummary(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const obj = value;
    return (typeof obj.deploy_reference === 'object' &&
        obj.deploy_reference !== null &&
        isRiskLevel(obj.risk_level) &&
        isRecommendation(obj.recommendation) &&
        typeof obj.execution === 'object' &&
        obj.execution !== null &&
        Array.isArray(obj.steps_executed));
}
//# sourceMappingURL=types.js.map