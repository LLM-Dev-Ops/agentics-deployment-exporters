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
import type { ExecutiveSummary, DeployPreview, DeployRecord } from '../synthesis/index.js';
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
declare const _default: {
    deploy: typeof deploy;
    deployPreview: typeof deployPreview;
    deployRun: typeof deployRun;
    deployRollback: typeof deployRollback;
    isProductionDeployment: typeof isProductionDeployment;
    calculateDeploySuccessRate: typeof calculateDeploySuccessRate;
    countBlockingIssues: typeof countBlockingIssues;
    extractBlockingIssues: typeof extractBlockingIssues;
};
export default _default;
//# sourceMappingURL=deploy.d.ts.map