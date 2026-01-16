/**
 * Synthesis Module - Executive Summary Generation
 *
 * This module provides utilities for generating executive summaries
 * of deployment operations, supporting decision-making workflows
 * for deployment approvals.
 *
 * ## Features
 *
 * - Risk assessment based on execution metrics
 * - Automatic recommendation generation (APPROVE/DEFER/REJECT)
 * - Production environment risk elevation
 * - Preview and record synthesis builders
 *
 * @module synthesis
 * @version 1.0.0
 */
export { 
// Type value arrays
RiskLevelValues, RecommendationValues, ChangeActionValues, DeployStatusValues, 
// Type guards
isRiskLevel, isRecommendation, isChangeAction, isDeployStatus, isExecutiveSummary, } from './types.js';
// =============================================================================
// BUILDER EXPORTS
// =============================================================================
export { 
// Constants
SUCCESS_RATE_THRESHOLD, PRODUCTION_ENVIRONMENTS, 
// Risk assessment
assessRiskLevel, determineRecommendation, 
// Production elevation
elevateRiskForProduction, isProductionTarget, 
// Builder functions
buildDeployReference, buildExecutionMetrics, buildExecutiveSummary, 
// Preview synthesis
extractBlockingIssuesFromPreview, calculatePreviewMetrics, buildSynthesisFromPreview, 
// Record synthesis
buildSynthesisFromRecord, 
// Utilities
calculateSuccessRate, determineEnvironment, } from './builder.js';
//# sourceMappingURL=index.js.map