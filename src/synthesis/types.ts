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
export const RiskLevelValues = ['low', 'medium', 'high', 'critical'] as const;

export type RiskLevel = (typeof RiskLevelValues)[number];

// =============================================================================
// RECOMMENDATION
// =============================================================================

/**
 * Recommendation actions for deployment operations.
 */
export const RecommendationValues = ['APPROVE', 'DEFER', 'REJECT'] as const;

export type Recommendation = (typeof RecommendationValues)[number];

// =============================================================================
// DEPLOY REFERENCE
// =============================================================================

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

// =============================================================================
// EXECUTION METRICS
// =============================================================================

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

// =============================================================================
// EXECUTIVE SUMMARY
// =============================================================================

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

// =============================================================================
// BUILDER INPUT TYPES
// =============================================================================

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

// =============================================================================
// DEPLOY PREVIEW TYPES
// =============================================================================

/**
 * Change action types for deployment preview.
 */
export const ChangeActionValues = ['create', 'update', 'delete', 'no-op'] as const;

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
] as const;

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

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for RiskLevel.
 */
export function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === 'string' && RiskLevelValues.includes(value as RiskLevel);
}

/**
 * Type guard for Recommendation.
 */
export function isRecommendation(value: unknown): value is Recommendation {
  return typeof value === 'string' && RecommendationValues.includes(value as Recommendation);
}

/**
 * Type guard for ChangeAction.
 */
export function isChangeAction(value: unknown): value is ChangeAction {
  return typeof value === 'string' && ChangeActionValues.includes(value as ChangeAction);
}

/**
 * Type guard for DeployStatus.
 */
export function isDeployStatus(value: unknown): value is DeployStatus {
  return typeof value === 'string' && DeployStatusValues.includes(value as DeployStatus);
}

/**
 * Type guard for ExecutiveSummary.
 */
export function isExecutiveSummary(value: unknown): value is ExecutiveSummary {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.deploy_reference === 'object' &&
    obj.deploy_reference !== null &&
    isRiskLevel(obj.risk_level) &&
    isRecommendation(obj.recommendation) &&
    typeof obj.execution === 'object' &&
    obj.execution !== null &&
    Array.isArray(obj.steps_executed)
  );
}
