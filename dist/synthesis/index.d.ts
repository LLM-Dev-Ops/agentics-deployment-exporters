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
export type { RiskLevel, Recommendation, DeployReference, ExecutionMetrics, ExecutiveSummary, DeployReferenceInput, ExecutionMetricsInput, ChangeAction, PreviewChange, DeployPreview, DeployStatus, DeployRecord, } from './types.js';
export { RiskLevelValues, RecommendationValues, ChangeActionValues, DeployStatusValues, isRiskLevel, isRecommendation, isChangeAction, isDeployStatus, isExecutiveSummary, } from './types.js';
export { SUCCESS_RATE_THRESHOLD, PRODUCTION_ENVIRONMENTS, assessRiskLevel, determineRecommendation, elevateRiskForProduction, isProductionTarget, buildDeployReference, buildExecutionMetrics, buildExecutiveSummary, extractBlockingIssuesFromPreview, calculatePreviewMetrics, buildSynthesisFromPreview, buildSynthesisFromRecord, calculateSuccessRate, determineEnvironment, } from './builder.js';
//# sourceMappingURL=index.d.ts.map