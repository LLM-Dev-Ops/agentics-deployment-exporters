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

import { randomUUID } from 'crypto';

import type {
  ExecutiveSummary,
  DeployReferenceInput,
  ExecutionMetricsInput,
  DeployPreview,
  PreviewChange,
  DeployRecord,
  RiskLevel,
  DeployStatus,
} from '../synthesis/index.js';

import {
  buildExecutiveSummary,
  buildSynthesisFromPreview,
  buildSynthesisFromRecord,
  elevateRiskForProduction,
  isProductionTarget,
  calculateSuccessRate,
  determineEnvironment,
  extractBlockingIssuesFromPreview,
} from '../synthesis/index.js';

// =============================================================================
// TYPES
// =============================================================================

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

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a timestamp for logging.
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * Determines if an environment requires production risk elevation.
 *
 * @param input - Deploy input
 * @returns true if production environment
 */
export function isProductionDeployment(input: DeployInput): boolean {
  return isProductionTarget(input.environment);
}

/**
 * Calculates success rate from deployment result.
 *
 * @param result - Deployment execution result
 * @returns Success rate (0.0 to 1.0)
 */
export function calculateDeploySuccessRate(result: {
  steps_completed?: number;
  steps_total?: number;
  logs?: readonly DeployStepLog[];
}): number {
  if (result.steps_completed !== undefined && result.steps_total !== undefined) {
    return calculateSuccessRate(result.steps_completed, result.steps_total);
  }

  if (result.logs) {
    const completed = result.logs.filter((l) => l.status === 'completed').length;
    const total = result.logs.filter((l) => l.status !== 'skipped').length;
    return calculateSuccessRate(completed, total);
  }

  return 1.0;
}

/**
 * Counts blocking issues from deployment result.
 *
 * @param result - Deployment result containing preview or logs
 * @returns Number of blocking issues (failed or delete operations)
 */
export function countBlockingIssues(result: {
  preview?: DeployPreview;
  logs?: readonly DeployStepLog[];
}): number {
  let count = 0;

  if (result.preview) {
    count += result.preview.changes.filter((c) => c.action === 'delete').length;
    count += result.preview.changes.filter((c) => c.destructive).length;
  }

  if (result.logs) {
    count += result.logs.filter((l) => l.status === 'failed').length;
  }

  return count;
}

/**
 * Extracts blocking issues from deployment result.
 *
 * @param result - Deployment result
 * @returns List of blocking issue descriptions
 */
export function extractBlockingIssues(result: {
  preview?: DeployPreview;
  logs?: readonly DeployStepLog[];
  error?: string;
}): readonly string[] {
  const issues: string[] = [];

  if (result.preview) {
    issues.push(...extractBlockingIssuesFromPreview(result.preview));
  }

  if (result.logs) {
    for (const log of result.logs) {
      if (log.status === 'failed') {
        issues.push(`Step failed: ${log.step}${log.error ? ` - ${log.error}` : ''}`);
      }
    }
  }

  if (result.error) {
    issues.push(`Deployment error: ${result.error}`);
  }

  return Object.freeze(issues);
}

// =============================================================================
// PREVIEW COMMAND
// =============================================================================

/**
 * Previews a deployment without executing it.
 * Generates synthesis for approval workflow.
 *
 * @param input - Deployment input
 * @returns Preview result with synthesis
 */
export async function deployPreview(input: DeployInput): Promise<DeployPreviewResult> {
  const startTime = Date.now();
  const logs: DeployStepLog[] = [];

  // Log: Validate input
  logs.push({
    step: 'validate_input',
    status: 'running',
    timestamp: now(),
  });

  // Simulate preview generation
  const changes: PreviewChange[] = [
    {
      resource: `${input.environment}/app`,
      action: 'update',
      description: 'Update application deployment',
    },
    {
      resource: `${input.environment}/config`,
      action: 'update',
      description: 'Update configuration',
    },
  ];

  // Add version change if specified
  if (input.version) {
    changes.push({
      resource: `${input.environment}/version`,
      action: 'update',
      description: `Update to version ${input.version}`,
    });
  }

  // Complete validation step
  logs.push({
    step: 'validate_input',
    status: 'completed',
    timestamp: now(),
    durationMs: Date.now() - startTime,
  });

  // Log: Generate preview
  const previewStart = Date.now();
  logs.push({
    step: 'generate_preview',
    status: 'running',
    timestamp: now(),
  });

  // Determine base risk level
  let riskLevel: RiskLevel = 'low';
  const hasDestructive = changes.some((c) => c.action === 'delete' || c.destructive);

  if (hasDestructive) {
    riskLevel = 'medium';
  }

  // Production preview is minimum high risk
  if (isProductionDeployment(input)) {
    riskLevel = riskLevel === 'low' ? 'high' : riskLevel;
    if (riskLevel === 'medium') {
      riskLevel = 'high';
    }
  }

  const preview: DeployPreview = {
    changes: Object.freeze(changes),
    estimated_duration_seconds: changes.length * 30,
    requires_approval: isProductionDeployment(input) || hasDestructive,
    risk_level: riskLevel,
  };

  logs.push({
    step: 'generate_preview',
    status: 'completed',
    timestamp: now(),
    durationMs: Date.now() - previewStart,
  });

  // Build synthesis from preview
  const deployRef: DeployReferenceInput = {
    environment: input.environment,
    timestamp: now(),
    version: input.version,
    commit_sha: input.commit_sha || process.env['GIT_SHA'],
  };

  let synthesis = buildSynthesisFromPreview(preview, deployRef, false);

  // CRITICAL: Production risk elevation
  if (isProductionDeployment(input)) {
    synthesis = elevateRiskForProduction(synthesis);
  }

  // High preview risk → critical synthesis risk
  if (preview.risk_level === 'high' && synthesis.risk_level !== 'critical') {
    synthesis = Object.freeze({
      ...synthesis,
      risk_level: 'critical',
      advisory_notes: Object.freeze([
        ...(synthesis.advisory_notes || []),
        'Preview indicates high-risk changes',
      ]),
    });
  }

  // Approval requirement as blocking issue
  if (preview.requires_approval) {
    const blockingIssues = [...synthesis.execution.blocking_issues];
    if (!blockingIssues.some((i) => i.includes('approval'))) {
      blockingIssues.push('Deployment requires approval before execution');
    }

    synthesis = Object.freeze({
      ...synthesis,
      execution: Object.freeze({
        ...synthesis.execution,
        blocking_issues: Object.freeze(blockingIssues),
      }),
    });
  }

  return Object.freeze({
    success: true,
    preview,
    logs: Object.freeze(logs),
    synthesis,
  });
}

// =============================================================================
// RUN COMMAND
// =============================================================================

/**
 * Executes a deployment.
 * Generates synthesis for tracking and audit.
 *
 * @param input - Deployment input
 * @param preview - Optional preview result (for approved deployments)
 * @returns Run result with synthesis
 */
export async function deployRun(
  input: DeployInput,
  preview?: DeployPreviewResult
): Promise<DeployRunResult> {
  const startTime = Date.now();
  const deployId = randomUUID();
  const logs: DeployStepLog[] = [];

  // Initialize deployment record
  let record: DeployRecord = {
    id: deployId,
    environment: input.environment,
    timestamp: now(),
    status: 'pending',
    version: input.version,
    commit_sha: input.commit_sha || process.env['GIT_SHA'],
    initiated_by: process.env['USER'] || 'system',
  };

  // Step 1: Validate prerequisites
  logs.push({
    step: 'validate_prerequisites',
    status: 'running',
    timestamp: now(),
  });

  // Check if approval is required but not provided
  const requiresApproval = preview?.preview.requires_approval && !input.options?.force;

  if (requiresApproval && !input.options?.advisory) {
    logs.push({
      step: 'validate_prerequisites',
      status: 'failed',
      timestamp: now(),
      durationMs: Date.now() - startTime,
      error: 'Deployment requires approval',
    });

    record = {
      ...record,
      status: 'failed',
      completed_at: now(),
      error: 'Deployment requires approval',
    };

    const metricsInput: ExecutionMetricsInput = {
      success_rate: 0,
      failed_iterations: 1,
      blocking_issues: ['Deployment requires approval'],
      steps_total: 1,
      steps_completed: 0,
    };

    const stepsExecuted = logs.map((l) => l.step);
    let synthesis = buildSynthesisFromRecord(record, stepsExecuted, metricsInput);

    if (isProductionDeployment(input)) {
      synthesis = elevateRiskForProduction(synthesis);
    }

    return Object.freeze({
      success: false,
      error: 'Deployment requires approval',
      record: Object.freeze(record),
      logs: Object.freeze(logs),
      synthesis,
    });
  }

  logs.push({
    step: 'validate_prerequisites',
    status: 'completed',
    timestamp: now(),
    durationMs: Date.now() - startTime,
  });

  // Step 2: Prepare deployment
  const prepareStart = Date.now();
  logs.push({
    step: 'prepare_deployment',
    status: 'running',
    timestamp: now(),
  });

  record = { ...record, status: 'in_progress' };

  logs.push({
    step: 'prepare_deployment',
    status: 'completed',
    timestamp: now(),
    durationMs: Date.now() - prepareStart,
  });

  // Step 3: Execute deployment
  const executeStart = Date.now();
  logs.push({
    step: 'execute_deployment',
    status: 'running',
    timestamp: now(),
  });

  // Simulate execution (in real implementation, this would perform actual deployment)
  const success = true; // Simulated success

  if (success) {
    logs.push({
      step: 'execute_deployment',
      status: 'completed',
      timestamp: now(),
      durationMs: Date.now() - executeStart,
    });

    // Step 4: Verify deployment
    const verifyStart = Date.now();
    logs.push({
      step: 'verify_deployment',
      status: 'running',
      timestamp: now(),
    });

    logs.push({
      step: 'verify_deployment',
      status: 'completed',
      timestamp: now(),
      durationMs: Date.now() - verifyStart,
    });

    record = {
      ...record,
      status: 'completed',
      completed_at: now(),
    };
  } else {
    logs.push({
      step: 'execute_deployment',
      status: 'failed',
      timestamp: now(),
      durationMs: Date.now() - executeStart,
      error: 'Deployment execution failed',
    });

    record = {
      ...record,
      status: 'failed',
      completed_at: now(),
      error: 'Deployment execution failed',
    };
  }

  // Build synthesis from execution
  const stepsExecuted = logs.map((l) => l.step);
  const stepsCompleted = logs.filter((l) => l.status === 'completed').length;
  const stepsTotal = logs.filter((l) => l.status !== 'skipped').length;

  const metricsInput: ExecutionMetricsInput = {
    success_rate: calculateSuccessRate(stepsCompleted, stepsTotal),
    failed_iterations: logs.filter((l) => l.status === 'failed').length,
    blocking_issues: extractBlockingIssues({ logs, error: record.error }),
    steps_total: stepsTotal,
    steps_completed: stepsCompleted,
  };

  let synthesis = buildSynthesisFromRecord(record, stepsExecuted, metricsInput);

  // Apply production risk elevation
  if (isProductionDeployment(input)) {
    synthesis = elevateRiskForProduction(synthesis);
  }

  // Advisory mode forces DEFER recommendation
  if (input.options?.advisory) {
    synthesis = Object.freeze({
      ...synthesis,
      recommendation: 'DEFER',
      advisory_notes: Object.freeze([
        ...(synthesis.advisory_notes || []),
        'Advisory mode: deployment result requires review',
      ]),
    });
  }

  return Object.freeze({
    success: record.status === 'completed',
    error: record.error,
    record: Object.freeze(record),
    logs: Object.freeze(logs),
    synthesis,
  });
}

// =============================================================================
// FULL DEPLOY COMMAND
// =============================================================================

/**
 * Performs a full deployment operation (preview + execute).
 *
 * @param input - Deployment input
 * @returns Full deployment result with synthesis
 */
export async function deploy(input: DeployInput): Promise<DeployFullResult> {
  const startTime = Date.now();

  // Step 1: Generate preview
  const previewResult = await deployPreview(input);

  // If dry run, return preview only
  if (input.options?.dryRun) {
    return Object.freeze({
      success: previewResult.success,
      preview: previewResult,
      synthesis: previewResult.synthesis,
    });
  }

  // Check if preview synthesis blocks execution
  if (previewResult.synthesis?.recommendation === 'REJECT') {
    return Object.freeze({
      success: false,
      error: 'Deployment rejected by synthesis: ' +
        (previewResult.synthesis.execution.blocking_issues.join(', ') ||
          'Risk assessment failed'),
      preview: previewResult,
      synthesis: previewResult.synthesis,
    });
  }

  // Step 2: Execute deployment
  const runResult = await deployRun(input, previewResult);

  // Build combined synthesis
  const stepsExecuted = [
    'preview',
    ...previewResult.logs.map((l) => `preview:${l.step}`),
    'execution',
    ...runResult.logs.map((l) => `run:${l.step}`),
  ];

  const totalSteps = previewResult.logs.length + runResult.logs.length;
  const completedSteps =
    previewResult.logs.filter((l) => l.status === 'completed').length +
    runResult.logs.filter((l) => l.status === 'completed').length;

  const deployRef: DeployReferenceInput = {
    environment: input.environment,
    timestamp: runResult.record.timestamp,
    version: input.version,
    commit_sha: input.commit_sha || process.env['GIT_SHA'],
  };

  const metricsInput: ExecutionMetricsInput = {
    success_rate: calculateSuccessRate(completedSteps, totalSteps),
    failed_iterations: countBlockingIssues({
      preview: previewResult.preview,
      logs: runResult.logs,
    }),
    blocking_issues: extractBlockingIssues({
      preview: previewResult.preview,
      logs: runResult.logs,
      error: runResult.error,
    }),
    steps_total: totalSteps,
    steps_completed: completedSteps,
  };

  let synthesis = buildExecutiveSummary(deployRef, metricsInput, stepsExecuted, {
    status: runResult.record.status,
    advisory: input.options?.advisory,
    metadata: {
      deployment_id: runResult.record.id,
      preview_changes: previewResult.preview.changes.length,
      duration_ms: Date.now() - startTime,
    },
  });

  // Apply production risk elevation
  if (isProductionDeployment(input)) {
    synthesis = elevateRiskForProduction(synthesis);
  }

  return Object.freeze({
    success: runResult.success,
    error: runResult.error,
    preview: previewResult,
    run: runResult,
    synthesis,
  });
}

// =============================================================================
// ROLLBACK COMMAND
// =============================================================================

/**
 * Rolls back a deployment to a previous version.
 *
 * @param input - Rollback input
 * @returns Rollback result with synthesis
 */
export async function deployRollback(
  input: DeployInput & { targetVersion: string }
): Promise<DeployRunResult> {
  const startTime = Date.now();
  const deployId = randomUUID();
  const logs: DeployStepLog[] = [];

  // Initialize record
  let record: DeployRecord = {
    id: deployId,
    environment: input.environment,
    timestamp: now(),
    status: 'pending',
    version: input.targetVersion,
    commit_sha: input.commit_sha,
    initiated_by: process.env['USER'] || 'system',
  };

  // Step 1: Validate rollback target
  logs.push({
    step: 'validate_rollback_target',
    status: 'running',
    timestamp: now(),
  });

  logs.push({
    step: 'validate_rollback_target',
    status: 'completed',
    timestamp: now(),
    durationMs: Date.now() - startTime,
  });

  // Step 2: Execute rollback
  const executeStart = Date.now();
  logs.push({
    step: 'execute_rollback',
    status: 'running',
    timestamp: now(),
  });

  record = { ...record, status: 'in_progress' };

  // Simulate rollback execution
  logs.push({
    step: 'execute_rollback',
    status: 'completed',
    timestamp: now(),
    durationMs: Date.now() - executeStart,
  });

  // Step 3: Verify rollback
  const verifyStart = Date.now();
  logs.push({
    step: 'verify_rollback',
    status: 'running',
    timestamp: now(),
  });

  logs.push({
    step: 'verify_rollback',
    status: 'completed',
    timestamp: now(),
    durationMs: Date.now() - verifyStart,
  });

  record = {
    ...record,
    status: 'rolled_back',
    completed_at: now(),
  };

  // Build synthesis for rollback
  const stepsExecuted = logs.map((l) => l.step);
  const stepsCompleted = logs.filter((l) => l.status === 'completed').length;
  const stepsTotal = logs.length;

  const metricsInput: ExecutionMetricsInput = {
    success_rate: calculateSuccessRate(stepsCompleted, stepsTotal),
    failed_iterations: logs.filter((l) => l.status === 'failed').length,
    blocking_issues: [],
    steps_total: stepsTotal,
    steps_completed: stepsCompleted,
  };

  let synthesis = buildSynthesisFromRecord(record, stepsExecuted, metricsInput);

  // Rollback always results in DEFER for review
  synthesis = Object.freeze({
    ...synthesis,
    recommendation: 'DEFER',
    advisory_notes: Object.freeze([
      ...(synthesis.advisory_notes || []),
      `Rolled back to version ${input.targetVersion}`,
      'Rollback requires post-deployment verification',
    ]),
  });

  // Apply production risk elevation
  if (isProductionDeployment(input)) {
    synthesis = elevateRiskForProduction(synthesis);
  }

  return Object.freeze({
    success: true,
    record: Object.freeze(record),
    logs: Object.freeze(logs),
    synthesis,
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  deploy,
  deployPreview,
  deployRun,
  deployRollback,
  isProductionDeployment,
  calculateDeploySuccessRate,
  countBlockingIssues,
  extractBlockingIssues,
};
