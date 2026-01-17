/**
 * Deploy Command with Executive Synthesis Integration
 *
 * This module provides deployment operations with integrated
 * executive synthesis for deployment validation and approval workflows.
 *
 * ## Features
 *
 * - Deployment preview with risk assessment
 * - Deployment execution with progress tracking
 * - Production risk elevation
 * - Executive summary generation for approval workflows
 *
 * @module commands/deploy
 * @version 1.0.0
 */
import type { ExecutiveSummary, DeployPreview, DeployRecord, DeployStatus } from '../synthesis/index.js';
/**
 * Deploy command input configuration.
 */
export interface DeployInput {
    /** Target environment */
    readonly environment: string;
    /** Version to deploy */
    readonly version?: string;
    /** Git commit SHA */
    readonly commit_sha?: string;
    /** Intent or artifact path */
    readonly source?: string;
    /** Deployment options */
    readonly options?: DeployOptions;
}
/**
 * Deployment options.
 */
export interface DeployOptions {
    /** Dry run mode - preview only */
    readonly dryRun?: boolean;
    /** Advisory mode - generate synthesis but don't block */
    readonly advisory?: boolean;
    /** Force deployment without approval */
    readonly force?: boolean;
    /** Maximum wait time in seconds */
    readonly timeout?: number;
    /** Enable verbose logging */
    readonly verbose?: boolean;
}
/**
 * Deployment step log entry.
 */
export interface DeployStepLog {
    /** Step name */
    readonly step: string;
    /** Step status */
    readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    /** Timestamp */
    readonly timestamp: string;
    /** Duration in milliseconds (if completed) */
    readonly durationMs?: number;
    /** Error message (if failed) */
    readonly error?: string;
}
/**
 * Base result for all deploy operations.
 */
export interface DeployCommandResult {
    /** Whether the operation succeeded */
    readonly success: boolean;
    /** Error message if failed */
    readonly error?: string;
    /** Execution synthesis */
    readonly synthesis?: ExecutiveSummary;
}
/**
 * Result of a deployment preview operation.
 */
export interface DeployPreviewResult extends DeployCommandResult {
    /** Preview details */
    readonly preview: DeployPreview;
    /** Preview logs */
    readonly logs: readonly DeployStepLog[];
}
/**
 * Result of a deployment run operation.
 */
export interface DeployRunResult extends DeployCommandResult {
    /** Deployment record */
    readonly record: DeployRecord;
    /** Execution logs */
    readonly logs: readonly DeployStepLog[];
}
/**
 * Combined result for full deploy operation.
 */
export interface DeployFullResult extends DeployCommandResult {
    /** Preview result (if performed) */
    readonly preview?: DeployPreviewResult;
    /** Run result (if executed) */
    readonly run?: DeployRunResult;
}
/**
 * Rollback input with target version.
 */
export interface RollbackInput extends DeployInput {
    /** Target version to rollback to */
    readonly targetVersion: string;
}
/**
 * Result of a deployment status check (read-only, no synthesis).
 */
export interface DeployStatusResult {
    /** Whether the status check succeeded */
    readonly success: boolean;
    /** Current deployment status */
    readonly status: DeployStatus;
    /** Current version deployed */
    readonly currentVersion?: string;
    /** Last deployment timestamp */
    readonly lastDeployedAt?: string;
    /** Health check results */
    readonly health?: DeployHealthCheck;
    /** Error message if status check failed */
    readonly error?: string;
}
/**
 * Health check results for deployment status.
 */
export interface DeployHealthCheck {
    /** Overall health status */
    readonly status: 'healthy' | 'degraded' | 'unhealthy';
    /** Individual component checks */
    readonly components: readonly ComponentHealth[];
    /** Last check timestamp */
    readonly checkedAt: string;
}
/**
 * Individual component health status.
 */
export interface ComponentHealth {
    /** Component name */
    readonly name: string;
    /** Component status */
    readonly status: 'healthy' | 'degraded' | 'unhealthy';
    /** Status message */
    readonly message?: string;
}
/**
 * Blast radius estimation for deployment impact.
 */
export interface BlastRadiusEstimation {
    /** Affected resource count */
    readonly affectedResources: number;
    /** Affected services list */
    readonly affectedServices: readonly string[];
    /** Downstream dependencies impacted */
    readonly downstreamImpact: number;
    /** Estimated users affected */
    readonly estimatedUsersAffected?: number;
    /** Blast radius severity: localized, moderate, widespread, critical */
    readonly severity: 'localized' | 'moderate' | 'widespread' | 'critical';
    /** Human-readable summary */
    readonly summary: string;
}
/**
 * Rollback feasibility assessment.
 */
export interface RollbackFeasibility {
    /** Feasibility score (0.0 to 1.0, higher = easier to rollback) */
    readonly score: number;
    /** Whether rollback is possible */
    readonly isPossible: boolean;
    /** Estimated rollback duration in seconds */
    readonly estimatedDurationSeconds: number;
    /** Potential data loss risk */
    readonly dataLossRisk: 'none' | 'minimal' | 'moderate' | 'significant';
    /** Blocking factors for rollback */
    readonly blockingFactors: readonly string[];
    /** Human-readable assessment */
    readonly assessment: string;
}
/**
 * Data integrity assessment for rollback operations.
 */
export interface DataIntegrityAssessment {
    /** Integrity score (0.0 to 1.0, higher = better integrity) */
    readonly score: number;
    /** Schema compatibility status */
    readonly schemaCompatibility: 'compatible' | 'migration_required' | 'incompatible';
    /** Data migration requirements */
    readonly migrationRequired: boolean;
    /** Potential data loss areas */
    readonly potentialDataLoss: readonly string[];
    /** Recovery completeness estimate (percentage) */
    readonly recoveryCompleteness: number;
    /** Human-readable assessment */
    readonly assessment: string;
}
/**
 * Enhanced synthesis metadata for deployment operations.
 */
export interface DeploymentSynthesisMetadata {
    /** Deployment ID */
    readonly deployment_id?: string;
    /** Preview change count */
    readonly preview_changes?: number;
    /** Duration in milliseconds */
    readonly duration_ms?: number;
    /** Blast radius estimation */
    readonly blast_radius?: BlastRadiusEstimation;
    /** Rollback feasibility assessment */
    readonly rollback_feasibility?: RollbackFeasibility;
    /** Data integrity assessment (for rollbacks) */
    readonly data_integrity?: DataIntegrityAssessment;
    /** Diff validity status */
    readonly diff_validity?: 'valid' | 'stale' | 'invalid';
    /** Target reachability status */
    readonly target_reachability?: 'reachable' | 'partial' | 'unreachable';
    /** Idempotency confirmation */
    readonly idempotency_confirmed?: boolean;
}
/**
 * Determines if an environment requires production risk elevation.
 *
 * @param input - Deploy input
 * @returns true if production environment
 */
export declare function isProductionDeployment(input: DeployInput): boolean;
/**
 * Calculates success rate from deployment result.
 *
 * @param result - Deployment execution result
 * @returns Success rate (0.0 to 1.0)
 */
export declare function calculateDeploySuccessRate(result: {
    steps_completed?: number;
    steps_total?: number;
    logs?: readonly DeployStepLog[];
}): number;
/**
 * Counts blocking issues from deployment result.
 *
 * @param result - Deployment result containing preview or logs
 * @returns Number of blocking issues (failed or delete operations)
 */
export declare function countBlockingIssues(result: {
    preview?: DeployPreview;
    logs?: readonly DeployStepLog[];
}): number;
/**
 * Extracts blocking issues from deployment result.
 *
 * @param result - Deployment result
 * @returns List of blocking issue descriptions
 */
export declare function extractBlockingIssues(result: {
    preview?: DeployPreview;
    logs?: readonly DeployStepLog[];
    error?: string;
}): readonly string[];
/**
 * Estimates blast radius for deployment changes.
 *
 * @param preview - Deployment preview with changes
 * @param input - Deployment input
 * @returns Blast radius estimation
 */
export declare function estimateBlastRadius(preview: DeployPreview, input: DeployInput): BlastRadiusEstimation;
/**
 * Assesses rollback feasibility for a deployment.
 *
 * @param preview - Deployment preview
 * @param input - Deployment input
 * @returns Rollback feasibility assessment
 */
export declare function assessRollbackFeasibility(preview: DeployPreview, input: DeployInput): RollbackFeasibility;
/**
 * Assesses data integrity for rollback operations.
 *
 * @param currentVersion - Current deployed version
 * @param targetVersion - Target rollback version
 * @param input - Deployment input
 * @returns Data integrity assessment
 */
export declare function assessDataIntegrity(currentVersion: string | undefined, targetVersion: string, input: DeployInput): DataIntegrityAssessment;
/**
 * Validates diff freshness and validity.
 *
 * @param preview - Deployment preview
 * @param previewTimestamp - When preview was generated
 * @returns Diff validity status
 */
export declare function validateDiffValidity(preview: DeployPreview, previewTimestamp: string): 'valid' | 'stale' | 'invalid';
/**
 * Checks target environment reachability.
 *
 * @param input - Deployment input
 * @returns Target reachability status
 */
export declare function checkTargetReachability(input: DeployInput): 'reachable' | 'partial' | 'unreachable';
/**
 * Previews a deployment without executing it.
 * Generates synthesis for approval workflow.
 *
 * @param input - Deployment input
 * @returns Preview result with synthesis
 */
export declare function deployPreview(input: DeployInput): Promise<DeployPreviewResult>;
/**
 * Executes a deployment.
 * Generates synthesis for tracking and audit.
 *
 * @param input - Deployment input
 * @param preview - Optional preview result (for approved deployments)
 * @returns Run result with synthesis
 */
export declare function deployRun(input: DeployInput, preview?: DeployPreviewResult): Promise<DeployRunResult>;
/**
 * Performs a full deployment operation (preview + execute).
 *
 * @param input - Deployment input
 * @returns Full deployment result with synthesis
 */
export declare function deploy(input: DeployInput): Promise<DeployFullResult>;
/**
 * Rolls back a deployment to a previous version.
 *
 * @param input - Rollback input
 * @returns Rollback result with synthesis
 */
export declare function deployRollback(input: DeployInput & {
    targetVersion: string;
}): Promise<DeployRunResult>;
/**
 * Retrieves current deployment status.
 *
 * NOTE: This is a read-only operation and does NOT generate synthesis.
 * Status checks are purely observational and do not require approval workflows.
 *
 * @param input - Deployment input (only environment is required)
 * @returns Status result (no synthesis field)
 */
export declare function deployStatus(input: Pick<DeployInput, 'environment'>): Promise<DeployStatusResult>;
declare const _default: {
    deploy: typeof deploy;
    deployPreview: typeof deployPreview;
    deployRun: typeof deployRun;
    deployRollback: typeof deployRollback;
    deployStatus: typeof deployStatus;
    isProductionDeployment: typeof isProductionDeployment;
    calculateDeploySuccessRate: typeof calculateDeploySuccessRate;
    countBlockingIssues: typeof countBlockingIssues;
    extractBlockingIssues: typeof extractBlockingIssues;
    estimateBlastRadius: typeof estimateBlastRadius;
    assessRollbackFeasibility: typeof assessRollbackFeasibility;
    assessDataIntegrity: typeof assessDataIntegrity;
    validateDiffValidity: typeof validateDiffValidity;
    checkTargetReachability: typeof checkTargetReachability;
};
export default _default;
//# sourceMappingURL=deploy.d.ts.map