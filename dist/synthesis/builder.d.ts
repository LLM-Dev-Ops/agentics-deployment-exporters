/**
 * Executive Synthesis Builder
 *
 * Provides builder functions for constructing ExecutiveSummary objects
 * with proper risk assessment and recommendation logic.
 *
 * @module synthesis/builder
 * @version 1.0.0
 */
import type { ExecutiveSummary, DeployReference, ExecutionMetrics, DeployReferenceInput, ExecutionMetricsInput, RiskLevel, Recommendation, DeployPreview, DeployRecord } from './types.js';
/**
 * Success rate threshold for APPROVE recommendation.
 */
export declare const SUCCESS_RATE_THRESHOLD = 0.95;
/**
 * Production environment names for risk elevation.
 */
export declare const PRODUCTION_ENVIRONMENTS: readonly ["production", "prod", "prd"];
/**
 * Determines risk level based on execution metrics and environment.
 *
 * @param metrics - Execution metrics
 * @param environment - Target environment
 * @returns Assessed risk level
 */
export declare function assessRiskLevel(metrics: ExecutionMetrics, environment?: string): RiskLevel;
/**
 * Determines recommendation based on metrics and conditions.
 *
 * @param metrics - Execution metrics
 * @param status - Deployment status
 * @param hasAdvisoryFlag - Whether advisory mode is enabled
 * @returns Recommended action
 */
export declare function determineRecommendation(metrics: ExecutionMetrics, status?: string, hasAdvisoryFlag?: boolean): Recommendation;
/**
 * Elevates risk level for production environments.
 * CRITICAL: Production deployments have elevated risk by default.
 *
 * @param summary - The executive summary to modify
 * @returns Modified summary with elevated production risk
 */
export declare function elevateRiskForProduction(summary: ExecutiveSummary): ExecutiveSummary;
/**
 * Checks if an environment is a production target.
 *
 * @param environment - Environment name to check
 * @returns true if production environment
 */
export declare function isProductionTarget(environment: string): boolean;
/**
 * Builds a DeployReference from input.
 *
 * @param input - Deploy reference input
 * @returns Frozen deploy reference
 */
export declare function buildDeployReference(input: DeployReferenceInput): DeployReference;
/**
 * Builds ExecutionMetrics from input.
 *
 * @param input - Execution metrics input
 * @returns Frozen execution metrics
 */
export declare function buildExecutionMetrics(input: ExecutionMetricsInput): ExecutionMetrics;
/**
 * Builds an ExecutiveSummary from deployment context.
 *
 * @param deployRef - Deploy reference input
 * @param metricsInput - Execution metrics input
 * @param stepsExecuted - List of executed step names
 * @param options - Additional options
 * @returns Frozen executive summary
 */
export declare function buildExecutiveSummary(deployRef: DeployReferenceInput, metricsInput: ExecutionMetricsInput, stepsExecuted: readonly string[], options?: {
    readonly status?: string;
    readonly advisory?: boolean;
    readonly metadata?: Readonly<Record<string, unknown>>;
}): ExecutiveSummary;
/**
 * Extracts blocking issues from a deploy preview.
 *
 * @param preview - Deploy preview to analyze
 * @returns List of blocking issues
 */
export declare function extractBlockingIssuesFromPreview(preview: DeployPreview): readonly string[];
/**
 * Calculates metrics from a deploy preview.
 *
 * @param preview - Deploy preview to analyze
 * @param approved - Whether the preview has been approved
 * @returns Execution metrics input
 */
export declare function calculatePreviewMetrics(preview: DeployPreview, approved?: boolean): ExecutionMetricsInput;
/**
 * Builds an ExecutiveSummary from a deploy preview.
 *
 * @param preview - Deploy preview
 * @param deployRef - Deploy reference input
 * @param approved - Whether the preview has been approved
 * @returns Frozen executive summary
 */
export declare function buildSynthesisFromPreview(preview: DeployPreview, deployRef: DeployReferenceInput, approved?: boolean): ExecutiveSummary;
/**
 * Builds an ExecutiveSummary from a deployment record.
 *
 * @param record - Deployment record
 * @param stepsExecuted - Steps executed during deployment
 * @param metricsInput - Execution metrics
 * @returns Frozen executive summary
 */
export declare function buildSynthesisFromRecord(record: DeployRecord, stepsExecuted: readonly string[], metricsInput: ExecutionMetricsInput): ExecutiveSummary;
/**
 * Calculates success rate from step counts.
 *
 * @param stepsCompleted - Number of completed steps
 * @param stepsTotal - Total number of steps
 * @returns Success rate (0.0 to 1.0)
 */
export declare function calculateSuccessRate(stepsCompleted: number, stepsTotal: number): number;
/**
 * Determines environment from various input types.
 *
 * @param input - Input that may contain environment info
 * @returns Environment string or 'unknown'
 */
export declare function determineEnvironment(input: {
    environment?: string;
    target?: {
        environment?: string;
    };
} | string): string;
//# sourceMappingURL=builder.d.ts.map