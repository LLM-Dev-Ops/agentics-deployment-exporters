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
import { buildExecutiveSummary, buildSynthesisFromPreview, buildSynthesisFromRecord, elevateRiskForProduction, isProductionTarget, calculateSuccessRate, extractBlockingIssuesFromPreview, } from '../synthesis/index.js';
// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
/**
 * Creates a timestamp for logging.
 */
function now() {
    return new Date().toISOString();
}
/**
 * Determines if an environment requires production risk elevation.
 *
 * @param input - Deploy input
 * @returns true if production environment
 */
export function isProductionDeployment(input) {
    return isProductionTarget(input.environment);
}
/**
 * Calculates success rate from deployment result.
 *
 * @param result - Deployment execution result
 * @returns Success rate (0.0 to 1.0)
 */
export function calculateDeploySuccessRate(result) {
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
export function countBlockingIssues(result) {
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
export function extractBlockingIssues(result) {
    const issues = [];
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
/**
 * Estimates blast radius for deployment changes.
 *
 * @param preview - Deployment preview with changes
 * @param input - Deployment input
 * @returns Blast radius estimation
 */
export function estimateBlastRadius(preview, input) {
    const affectedResources = preview.changes.length;
    // Extract affected services from resource paths
    const affectedServices = [...new Set(preview.changes.map((c) => {
            const parts = c.resource.split('/');
            return parts.length > 1 ? parts[1] : parts[0];
        }))];
    // Calculate downstream impact (simulated - in production would query dependency graph)
    const downstreamImpact = Math.ceil(affectedResources * 1.5);
    // Estimate users affected based on environment
    const isProduction = isProductionDeployment(input);
    const estimatedUsersAffected = isProduction
        ? affectedResources * 1000 // Production = many users
        : affectedResources * 10; // Non-prod = limited users
    // Determine severity based on factors
    let severity = 'localized';
    const hasDestructive = preview.changes.some((c) => c.action === 'delete' || c.destructive);
    if (isProduction && hasDestructive) {
        severity = 'critical';
    }
    else if (isProduction || affectedResources > 10) {
        severity = 'widespread';
    }
    else if (affectedResources > 5 || hasDestructive) {
        severity = 'moderate';
    }
    const summary = `${affectedResources} resources affected, ${downstreamImpact} downstream dependencies, ${severity} impact severity`;
    return Object.freeze({
        affectedResources,
        affectedServices: Object.freeze(affectedServices),
        downstreamImpact,
        estimatedUsersAffected,
        severity,
        summary,
    });
}
/**
 * Assesses rollback feasibility for a deployment.
 *
 * @param preview - Deployment preview
 * @param input - Deployment input
 * @returns Rollback feasibility assessment
 */
export function assessRollbackFeasibility(preview, input) {
    const blockingFactors = [];
    // Check for irreversible changes
    const hasDeletes = preview.changes.some((c) => c.action === 'delete');
    const hasDestructive = preview.changes.some((c) => c.destructive);
    if (hasDeletes) {
        blockingFactors.push('Delete operations cannot be automatically reversed');
    }
    if (hasDestructive) {
        blockingFactors.push('Destructive changes may cause data loss on rollback');
    }
    // Check for database migrations (simulated detection)
    const hasMigrations = preview.changes.some((c) => c.resource.includes('migration') ||
        c.resource.includes('schema') ||
        c.description?.toLowerCase().includes('migration'));
    if (hasMigrations) {
        blockingFactors.push('Database migrations may require manual rollback');
    }
    // Calculate feasibility score
    let score = 1.0;
    if (hasDeletes)
        score -= 0.3;
    if (hasDestructive)
        score -= 0.3;
    if (hasMigrations)
        score -= 0.2;
    if (isProductionDeployment(input))
        score -= 0.1;
    score = Math.max(0, score);
    // Determine data loss risk
    let dataLossRisk = 'none';
    if (hasDestructive || hasDeletes) {
        dataLossRisk = hasMigrations ? 'significant' : 'moderate';
    }
    else if (hasMigrations) {
        dataLossRisk = 'minimal';
    }
    // Estimate rollback duration
    const estimatedDurationSeconds = preview.changes.length * 15 +
        (hasDeletes ? 60 : 0) +
        (hasMigrations ? 120 : 0);
    const isPossible = score > 0.2 && !hasDeletes;
    const assessment = isPossible
        ? `Rollback feasible with ${Math.round(score * 100)}% confidence. ${blockingFactors.length > 0 ? 'Considerations: ' + blockingFactors.join('; ') : ''}`
        : `Rollback may not be possible. Blocking factors: ${blockingFactors.join('; ')}`;
    return Object.freeze({
        score,
        isPossible,
        estimatedDurationSeconds,
        dataLossRisk,
        blockingFactors: Object.freeze(blockingFactors),
        assessment,
    });
}
/**
 * Assesses data integrity for rollback operations.
 *
 * @param currentVersion - Current deployed version
 * @param targetVersion - Target rollback version
 * @param input - Deployment input
 * @returns Data integrity assessment
 */
export function assessDataIntegrity(currentVersion, targetVersion, input) {
    const potentialDataLoss = [];
    // Simulate version comparison (in production would analyze actual schema changes)
    const versionGap = currentVersion && targetVersion
        ? Math.abs(parseFloat(currentVersion) - parseFloat(targetVersion))
        : 0;
    // Determine schema compatibility based on version gap
    let schemaCompatibility = 'compatible';
    let migrationRequired = false;
    if (versionGap >= 1.0) {
        schemaCompatibility = 'incompatible';
        migrationRequired = true;
        potentialDataLoss.push('Major version rollback may lose new data structures');
    }
    else if (versionGap >= 0.5) {
        schemaCompatibility = 'migration_required';
        migrationRequired = true;
        potentialDataLoss.push('Minor version changes may require data migration');
    }
    // Production environments have stricter data integrity requirements
    if (isProductionDeployment(input) && versionGap > 0) {
        potentialDataLoss.push('Production data created after target version may be affected');
    }
    // Calculate integrity score
    let score = 1.0;
    if (schemaCompatibility === 'incompatible')
        score -= 0.5;
    if (schemaCompatibility === 'migration_required')
        score -= 0.2;
    if (migrationRequired)
        score -= 0.1;
    if (isProductionDeployment(input))
        score -= 0.1;
    score = Math.max(0, score);
    // Estimate recovery completeness
    const recoveryCompleteness = Math.round(score * 100);
    const assessment = score >= 0.8
        ? `High data integrity confidence (${recoveryCompleteness}% recovery expected)`
        : score >= 0.5
            ? `Moderate data integrity risk. ${migrationRequired ? 'Migration required. ' : ''}Recovery: ${recoveryCompleteness}%`
            : `Low data integrity confidence. Manual intervention likely required. Recovery: ${recoveryCompleteness}%`;
    return Object.freeze({
        score,
        schemaCompatibility,
        migrationRequired,
        potentialDataLoss: Object.freeze(potentialDataLoss),
        recoveryCompleteness,
        assessment,
    });
}
/**
 * Validates diff freshness and validity.
 *
 * @param preview - Deployment preview
 * @param previewTimestamp - When preview was generated
 * @returns Diff validity status
 */
export function validateDiffValidity(preview, previewTimestamp) {
    // Check if preview has changes
    if (preview.changes.length === 0) {
        return 'invalid';
    }
    // Check if preview is stale (older than 5 minutes)
    const previewTime = new Date(previewTimestamp).getTime();
    const currentTime = Date.now();
    const ageMinutes = (currentTime - previewTime) / (1000 * 60);
    if (ageMinutes > 5) {
        return 'stale';
    }
    return 'valid';
}
/**
 * Checks target environment reachability.
 *
 * @param input - Deployment input
 * @returns Target reachability status
 */
export function checkTargetReachability(input) {
    // Simulated reachability check (in production would perform actual health checks)
    // For now, always return reachable
    return 'reachable';
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
export async function deployPreview(input) {
    const startTime = Date.now();
    const logs = [];
    // Log: Validate input
    logs.push({
        step: 'validate_input',
        status: 'running',
        timestamp: now(),
    });
    // Simulate preview generation
    const changes = [
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
    let riskLevel = 'low';
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
    const preview = {
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
    // Calculate enhanced synthesis metadata
    const previewTimestamp = now();
    const blastRadius = estimateBlastRadius(preview, input);
    const rollbackFeasibility = assessRollbackFeasibility(preview, input);
    const diffValidity = validateDiffValidity(preview, previewTimestamp);
    const targetReachability = checkTargetReachability(input);
    // Build synthesis from preview
    const deployRef = {
        environment: input.environment,
        timestamp: previewTimestamp,
        version: input.version,
        commit_sha: input.commit_sha || process.env['GIT_SHA'],
    };
    let synthesis = buildSynthesisFromPreview(preview, deployRef, false);
    // Add enhanced metadata to synthesis
    const enhancedMetadata = {
        preview_changes: preview.changes.length,
        duration_ms: Date.now() - startTime,
        blast_radius: blastRadius,
        rollback_feasibility: rollbackFeasibility,
        diff_validity: diffValidity,
        target_reachability: targetReachability,
        idempotency_confirmed: true, // Preview is idempotent
    };
    synthesis = Object.freeze({
        ...synthesis,
        metadata: Object.freeze({
            ...(synthesis.metadata || {}),
            ...enhancedMetadata,
        }),
    });
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
    // Blast radius severity affects risk level
    if (blastRadius.severity === 'critical' && synthesis.risk_level !== 'critical') {
        synthesis = Object.freeze({
            ...synthesis,
            risk_level: 'critical',
            advisory_notes: Object.freeze([
                ...(synthesis.advisory_notes || []),
                `Critical blast radius: ${blastRadius.summary}`,
            ]),
        });
    }
    // Low rollback feasibility adds blocking issue
    if (!rollbackFeasibility.isPossible) {
        const blockingIssues = [...synthesis.execution.blocking_issues];
        blockingIssues.push(`Rollback not feasible: ${rollbackFeasibility.assessment}`);
        synthesis = Object.freeze({
            ...synthesis,
            execution: Object.freeze({
                ...synthesis.execution,
                blocking_issues: Object.freeze(blockingIssues),
            }),
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
export async function deployRun(input, preview) {
    const startTime = Date.now();
    const deployId = randomUUID();
    const logs = [];
    // Initialize deployment record
    let record = {
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
        const metricsInput = {
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
    }
    else {
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
    const metricsInput = {
        success_rate: calculateSuccessRate(stepsCompleted, stepsTotal),
        failed_iterations: logs.filter((l) => l.status === 'failed').length,
        blocking_issues: extractBlockingIssues({ logs, error: record.error }),
        steps_total: stepsTotal,
        steps_completed: stepsCompleted,
    };
    let synthesis = buildSynthesisFromRecord(record, stepsExecuted, metricsInput);
    // Add enhanced metadata from preview if available
    const previewMetadata = preview?.synthesis?.metadata;
    const enhancedMetadata = {
        deployment_id: record.id,
        duration_ms: Date.now() - startTime,
        target_reachability: checkTargetReachability(input),
        idempotency_confirmed: record.status === 'completed',
        // Include blast radius and rollback feasibility from preview
        ...(previewMetadata?.blast_radius && { blast_radius: previewMetadata.blast_radius }),
        ...(previewMetadata?.rollback_feasibility && { rollback_feasibility: previewMetadata.rollback_feasibility }),
        ...(preview && { preview_changes: preview.preview.changes.length }),
    };
    synthesis = Object.freeze({
        ...synthesis,
        metadata: Object.freeze({
            ...(synthesis.metadata || {}),
            ...enhancedMetadata,
        }),
    });
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
export async function deploy(input) {
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
    const completedSteps = previewResult.logs.filter((l) => l.status === 'completed').length +
        runResult.logs.filter((l) => l.status === 'completed').length;
    const deployRef = {
        environment: input.environment,
        timestamp: runResult.record.timestamp,
        version: input.version,
        commit_sha: input.commit_sha || process.env['GIT_SHA'],
    };
    const metricsInput = {
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
export async function deployRollback(input) {
    const startTime = Date.now();
    const deployId = randomUUID();
    const logs = [];
    // Initialize record
    let record = {
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
    // Assess data integrity for the rollback
    const dataIntegrity = assessDataIntegrity(input.version, // Current version (before rollback)
    input.targetVersion, // Target rollback version
    input);
    // Calculate blocking issues based on data integrity assessment
    const blockingIssues = [];
    if (dataIntegrity.schemaCompatibility === 'incompatible') {
        blockingIssues.push('Schema incompatibility may require manual data migration');
    }
    if (dataIntegrity.potentialDataLoss.length > 0) {
        blockingIssues.push(...dataIntegrity.potentialDataLoss);
    }
    const metricsInput = {
        success_rate: calculateSuccessRate(stepsCompleted, stepsTotal),
        failed_iterations: logs.filter((l) => l.status === 'failed').length,
        blocking_issues: blockingIssues,
        steps_total: stepsTotal,
        steps_completed: stepsCompleted,
    };
    let synthesis = buildSynthesisFromRecord(record, stepsExecuted, metricsInput);
    // Add enhanced metadata with data integrity assessment
    const enhancedMetadata = {
        deployment_id: record.id,
        duration_ms: Date.now() - startTime,
        data_integrity: dataIntegrity,
        target_reachability: checkTargetReachability(input),
    };
    synthesis = Object.freeze({
        ...synthesis,
        metadata: Object.freeze({
            ...(synthesis.metadata || {}),
            ...enhancedMetadata,
        }),
    });
    // Rollback always results in DEFER for review
    const advisoryNotes = [
        ...(synthesis.advisory_notes || []),
        `Rolled back to version ${input.targetVersion}`,
        'Rollback requires post-deployment verification',
        `Data integrity: ${dataIntegrity.assessment}`,
        `Recovery completeness: ${dataIntegrity.recoveryCompleteness}%`,
    ];
    synthesis = Object.freeze({
        ...synthesis,
        recommendation: 'DEFER',
        advisory_notes: Object.freeze(advisoryNotes),
    });
    // Elevate risk based on data integrity score
    if (dataIntegrity.score < 0.5) {
        synthesis = Object.freeze({
            ...synthesis,
            risk_level: 'critical',
        });
    }
    else if (dataIntegrity.score < 0.8 && synthesis.risk_level === 'low') {
        synthesis = Object.freeze({
            ...synthesis,
            risk_level: 'medium',
        });
    }
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
// STATUS COMMAND (Read-Only - No Synthesis)
// =============================================================================
/**
 * Retrieves current deployment status.
 *
 * NOTE: This is a read-only operation and does NOT generate synthesis.
 * Status checks are purely observational and do not require approval workflows.
 *
 * @param input - Deployment input (only environment is required)
 * @returns Status result (no synthesis field)
 */
export async function deployStatus(input) {
    // Simulate status check (in production would query actual deployment state)
    const currentVersion = '1.0.0';
    const lastDeployedAt = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    // Simulate health check
    const health = {
        status: 'healthy',
        components: Object.freeze([
            { name: 'api', status: 'healthy', message: 'All endpoints responding' },
            { name: 'database', status: 'healthy', message: 'Connection pool active' },
            { name: 'cache', status: 'healthy', message: 'Redis connected' },
        ]),
        checkedAt: now(),
    };
    return Object.freeze({
        success: true,
        status: 'completed',
        currentVersion,
        lastDeployedAt,
        health: Object.freeze(health),
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
    deployStatus,
    isProductionDeployment,
    calculateDeploySuccessRate,
    countBlockingIssues,
    extractBlockingIssues,
    estimateBlastRadius,
    assessRollbackFeasibility,
    assessDataIntegrity,
    validateDiffValidity,
    checkTargetReachability,
};
//# sourceMappingURL=deploy.js.map