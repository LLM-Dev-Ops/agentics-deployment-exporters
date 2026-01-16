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
/**
 * Risk levels for deployment operations.
 * Used to communicate deployment risk to approvers.
 */
export declare const RiskLevelValues: readonly ["low", "medium", "high", "critical"];
export type RiskLevel = (typeof RiskLevelValues)[number];
/**
 * Recommendation actions for deployment operations.
 */
export declare const RecommendationValues: readonly ["APPROVE", "DEFER", "REJECT"];
export type Recommendation = (typeof RecommendationValues)[number];
/**
 * Reference information linking synthesis to deployment record.
 */
export interface DeployReference {
    /** Target environment (development, staging, production) */
    readonly environment: string;
    /** Deployment timestamp (ISO 8601) */
    readonly timestamp: string;
    /** Deployment version or tag */
    readonly version?: string;
    /** Git commit SHA */
    readonly commit_sha?: string;
}
/**
 * Execution metrics from the deployment operation.
 */
export interface ExecutionMetrics {
    /** Ratio of successful steps (0.0 to 1.0) */
    readonly success_rate: number;
    /** Number of failed iterations or attempts */
    readonly failed_iterations: number;
    /** List of issues that block deployment */
    readonly blocking_issues: readonly string[];
    /** Optional: Total number of steps executed */
    readonly steps_total?: number;
    /** Optional: Number of steps completed successfully */
    readonly steps_completed?: number;
}
/**
 * Executive summary of a deployment operation.
 * Provides decision-support information for deployment approval.
 */
export interface ExecutiveSummary {
    /** Reference to the deployment record */
    readonly deploy_reference: DeployReference;
    /** Assessed risk level */
    readonly risk_level: RiskLevel;
    /** Recommended action */
    readonly recommendation: Recommendation;
    /** Execution metrics */
    readonly execution: ExecutionMetrics;
    /** Steps executed in the operation */
    readonly steps_executed: readonly string[];
    /** Advisory notes for the reviewer */
    readonly advisory_notes?: readonly string[];
    /** Additional metadata */
    readonly metadata?: Readonly<Record<string, unknown>>;
}
/**
 * Input for building deployment reference.
 */
export interface DeployReferenceInput {
    readonly environment: string;
    readonly timestamp: string;
    readonly version?: string;
    readonly commit_sha?: string;
}
/**
 * Input for building execution metrics.
 */
export interface ExecutionMetricsInput {
    readonly success_rate: number;
    readonly failed_iterations: number;
    readonly blocking_issues?: readonly string[];
    readonly steps_total?: number;
    readonly steps_completed?: number;
}
/**
 * Change action types for deployment preview.
 */
export declare const ChangeActionValues: readonly ["create", "update", "delete", "no-op"];
export type ChangeAction = (typeof ChangeActionValues)[number];
/**
 * Single change in a deployment preview.
 */
export interface PreviewChange {
    /** Resource identifier */
    readonly resource: string;
    /** Action to be taken */
    readonly action: ChangeAction;
    /** Description of the change */
    readonly description?: string;
    /** Whether this change is destructive */
    readonly destructive?: boolean;
}
/**
 * Deployment preview result.
 */
export interface DeployPreview {
    /** List of changes */
    readonly changes: readonly PreviewChange[];
    /** Estimated duration in seconds */
    readonly estimated_duration_seconds?: number;
    /** Whether approval is required */
    readonly requires_approval?: boolean;
    /** Risk level of the preview */
    readonly risk_level?: RiskLevel;
}
/**
 * Status of a deployment.
 */
export declare const DeployStatusValues: readonly ["pending", "in_progress", "completed", "failed", "rolled_back"];
export type DeployStatus = (typeof DeployStatusValues)[number];
/**
 * Deployment record tracking deployment state.
 */
export interface DeployRecord {
    /** Unique deployment ID */
    readonly id: string;
    /** Target environment */
    readonly environment: string;
    /** Deployment timestamp */
    readonly timestamp: string;
    /** Current status */
    readonly status: DeployStatus;
    /** Version being deployed */
    readonly version?: string;
    /** Git commit SHA */
    readonly commit_sha?: string;
    /** User or system that initiated deployment */
    readonly initiated_by?: string;
    /** Completion timestamp (if completed) */
    readonly completed_at?: string;
    /** Error message (if failed) */
    readonly error?: string;
}
/**
 * Type guard for RiskLevel.
 */
export declare function isRiskLevel(value: unknown): value is RiskLevel;
/**
 * Type guard for Recommendation.
 */
export declare function isRecommendation(value: unknown): value is Recommendation;
/**
 * Type guard for ChangeAction.
 */
export declare function isChangeAction(value: unknown): value is ChangeAction;
/**
 * Type guard for DeployStatus.
 */
export declare function isDeployStatus(value: unknown): value is DeployStatus;
/**
 * Type guard for ExecutiveSummary.
 */
export declare function isExecutiveSummary(value: unknown): value is ExecutiveSummary;
//# sourceMappingURL=types.d.ts.map