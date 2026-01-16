/**
 * Executive Synthesis Builder
 *
 * Provides builder functions for constructing ExecutiveSummary objects
 * with proper risk assessment and recommendation logic.
 *
 * @module synthesis/builder
 * @version 1.0.0
 */
// =============================================================================
// CONSTANTS
// =============================================================================
/**
 * Success rate threshold for APPROVE recommendation.
 */
export const SUCCESS_RATE_THRESHOLD = 0.95;
/**
 * Production environment names for risk elevation.
 */
export const PRODUCTION_ENVIRONMENTS = ['production', 'prod', 'prd'];
// =============================================================================
// RISK ASSESSMENT
// =============================================================================
/**
 * Determines risk level based on execution metrics and environment.
 *
 * @param metrics - Execution metrics
 * @param environment - Target environment
 * @returns Assessed risk level
 */
export function assessRiskLevel(metrics, environment) {
    // Start with base risk assessment from metrics
    let riskLevel = 'low';
    if (metrics.failed_iterations > 0) {
        riskLevel = 'medium';
    }
    if (metrics.success_rate < 0.9) {
        riskLevel = 'high';
    }
    if (metrics.success_rate < 0.7 || metrics.blocking_issues.length > 0) {
        riskLevel = 'critical';
    }
    // Environment-based elevation handled separately
    return riskLevel;
}
/**
 * Determines recommendation based on metrics and conditions.
 *
 * @param metrics - Execution metrics
 * @param status - Deployment status
 * @param hasAdvisoryFlag - Whether advisory mode is enabled
 * @returns Recommended action
 */
export function determineRecommendation(metrics, status, hasAdvisoryFlag) {
    // REJECT for failures
    if (status === 'failed' || status === 'rolled_back') {
        return 'REJECT';
    }
    // DEFER for advisory mode
    if (hasAdvisoryFlag) {
        return 'DEFER';
    }
    // REJECT if there are blocking issues
    if (metrics.blocking_issues.length > 0) {
        return 'REJECT';
    }
    // APPROVE if success rate meets threshold
    if (metrics.success_rate >= SUCCESS_RATE_THRESHOLD) {
        return 'APPROVE';
    }
    // DEFER for marginal cases
    if (metrics.success_rate >= 0.8) {
        return 'DEFER';
    }
    // REJECT for low success rate
    return 'REJECT';
}
// =============================================================================
// PRODUCTION RISK ELEVATION
// =============================================================================
/**
 * Elevates risk level for production environments.
 * CRITICAL: Production deployments have elevated risk by default.
 *
 * @param summary - The executive summary to modify
 * @returns Modified summary with elevated production risk
 */
export function elevateRiskForProduction(summary) {
    const env = summary.deploy_reference.environment.toLowerCase();
    const isProduction = PRODUCTION_ENVIRONMENTS.some((prod) => env === prod || env.includes(prod));
    if (!isProduction) {
        return summary;
    }
    // Elevate risk: low -> medium, medium -> high, high -> critical
    let elevatedRisk = summary.risk_level;
    switch (summary.risk_level) {
        case 'low':
            elevatedRisk = 'medium';
            break;
        case 'medium':
            elevatedRisk = 'high';
            break;
        case 'high':
        case 'critical':
            elevatedRisk = 'critical';
            break;
    }
    // Add advisory note about production elevation
    const advisoryNotes = [
        ...(summary.advisory_notes || []),
        'Risk elevated for production environment deployment',
    ];
    return Object.freeze({
        ...summary,
        risk_level: elevatedRisk,
        advisory_notes: Object.freeze(advisoryNotes),
    });
}
/**
 * Checks if an environment is a production target.
 *
 * @param environment - Environment name to check
 * @returns true if production environment
 */
export function isProductionTarget(environment) {
    const env = environment.toLowerCase();
    return PRODUCTION_ENVIRONMENTS.some((prod) => env === prod || env.includes(prod));
}
// =============================================================================
// BUILDER FUNCTIONS
// =============================================================================
/**
 * Builds a DeployReference from input.
 *
 * @param input - Deploy reference input
 * @returns Frozen deploy reference
 */
export function buildDeployReference(input) {
    const ref = {
        environment: input.environment,
        timestamp: input.timestamp,
        ...(input.version !== undefined && { version: input.version }),
        ...(input.commit_sha !== undefined && { commit_sha: input.commit_sha }),
    };
    return Object.freeze(ref);
}
/**
 * Builds ExecutionMetrics from input.
 *
 * @param input - Execution metrics input
 * @returns Frozen execution metrics
 */
export function buildExecutionMetrics(input) {
    const metrics = {
        success_rate: Math.max(0, Math.min(1, input.success_rate)),
        failed_iterations: Math.max(0, input.failed_iterations),
        blocking_issues: Object.freeze(input.blocking_issues || []),
        ...(input.steps_total !== undefined && { steps_total: input.steps_total }),
        ...(input.steps_completed !== undefined && { steps_completed: input.steps_completed }),
    };
    return Object.freeze(metrics);
}
/**
 * Builds an ExecutiveSummary from deployment context.
 *
 * @param deployRef - Deploy reference input
 * @param metricsInput - Execution metrics input
 * @param stepsExecuted - List of executed step names
 * @param options - Additional options
 * @returns Frozen executive summary
 */
export function buildExecutiveSummary(deployRef, metricsInput, stepsExecuted, options) {
    const deploy_reference = buildDeployReference(deployRef);
    const execution = buildExecutionMetrics(metricsInput);
    const risk_level = assessRiskLevel(execution, deployRef.environment);
    const recommendation = determineRecommendation(execution, options?.status, options?.advisory);
    const summary = {
        deploy_reference,
        risk_level,
        recommendation,
        execution,
        steps_executed: Object.freeze([...stepsExecuted]),
        ...(options?.metadata !== undefined && { metadata: Object.freeze(options.metadata) }),
    };
    return Object.freeze(summary);
}
// =============================================================================
// DEPLOY PREVIEW SYNTHESIS
// =============================================================================
/**
 * Extracts blocking issues from a deploy preview.
 *
 * @param preview - Deploy preview to analyze
 * @returns List of blocking issues
 */
export function extractBlockingIssuesFromPreview(preview) {
    const issues = [];
    // Destructive changes are blocking issues
    for (const change of preview.changes) {
        if (change.action === 'delete' || change.destructive) {
            issues.push(`Destructive change: ${change.action} ${change.resource}`);
        }
    }
    // Unapproved high-risk previews are blocking
    if (preview.risk_level === 'high' || preview.risk_level === 'critical') {
        if (preview.requires_approval) {
            issues.push('High-risk deployment requires approval');
        }
    }
    return Object.freeze(issues);
}
/**
 * Calculates metrics from a deploy preview.
 *
 * @param preview - Deploy preview to analyze
 * @param approved - Whether the preview has been approved
 * @returns Execution metrics input
 */
export function calculatePreviewMetrics(preview, approved = false) {
    const totalChanges = preview.changes.length;
    const destructiveChanges = preview.changes.filter((c) => c.action === 'delete' || c.destructive).length;
    // Success rate based on non-destructive changes ratio
    const successRate = totalChanges > 0
        ? (totalChanges - destructiveChanges) / totalChanges
        : 1.0;
    const blockingIssues = extractBlockingIssuesFromPreview(preview);
    // Add approval requirement as blocking if not approved
    const allIssues = !approved && preview.requires_approval
        ? [...blockingIssues, 'Pending approval required']
        : blockingIssues;
    return {
        success_rate: successRate,
        failed_iterations: destructiveChanges,
        blocking_issues: allIssues,
        steps_total: totalChanges,
        steps_completed: approved ? totalChanges : 0,
    };
}
/**
 * Builds an ExecutiveSummary from a deploy preview.
 *
 * @param preview - Deploy preview
 * @param deployRef - Deploy reference input
 * @param approved - Whether the preview has been approved
 * @returns Frozen executive summary
 */
export function buildSynthesisFromPreview(preview, deployRef, approved = false) {
    const metrics = calculatePreviewMetrics(preview, approved);
    // Map preview changes to step names
    const stepsExecuted = preview.changes.map((c) => `${c.action}: ${c.resource}`);
    // Build base summary
    let summary = buildExecutiveSummary(deployRef, metrics, stepsExecuted, {
        status: approved ? 'pending' : 'preview',
        metadata: {
            estimated_duration_seconds: preview.estimated_duration_seconds,
            change_count: preview.changes.length,
        },
    });
    // Apply preview-specific risk elevation
    if (preview.risk_level === 'high') {
        summary = Object.freeze({
            ...summary,
            risk_level: 'critical',
            advisory_notes: Object.freeze([
                ...(summary.advisory_notes || []),
                'Preview indicates high-risk deployment',
            ]),
        });
    }
    return summary;
}
// =============================================================================
// DEPLOY RECORD SYNTHESIS
// =============================================================================
/**
 * Builds an ExecutiveSummary from a deployment record.
 *
 * @param record - Deployment record
 * @param stepsExecuted - Steps executed during deployment
 * @param metricsInput - Execution metrics
 * @returns Frozen executive summary
 */
export function buildSynthesisFromRecord(record, stepsExecuted, metricsInput) {
    const deployRef = {
        environment: record.environment,
        timestamp: record.timestamp,
        version: record.version,
        commit_sha: record.commit_sha,
    };
    let summary = buildExecutiveSummary(deployRef, metricsInput, stepsExecuted, {
        status: record.status,
        metadata: {
            deployment_id: record.id,
            initiated_by: record.initiated_by,
            completed_at: record.completed_at,
        },
    });
    // Elevate risk for production
    if (isProductionTarget(record.environment)) {
        summary = elevateRiskForProduction(summary);
    }
    // Add error as blocking issue if failed
    if (record.status === 'failed' && record.error) {
        const execution = {
            ...summary.execution,
            blocking_issues: Object.freeze([
                ...summary.execution.blocking_issues,
                `Deployment failed: ${record.error}`,
            ]),
        };
        summary = Object.freeze({
            ...summary,
            execution,
            risk_level: 'critical',
            recommendation: 'REJECT',
        });
    }
    return summary;
}
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Calculates success rate from step counts.
 *
 * @param stepsCompleted - Number of completed steps
 * @param stepsTotal - Total number of steps
 * @returns Success rate (0.0 to 1.0)
 */
export function calculateSuccessRate(stepsCompleted, stepsTotal) {
    if (stepsTotal <= 0) {
        return 1.0;
    }
    return Math.max(0, Math.min(1, stepsCompleted / stepsTotal));
}
/**
 * Determines environment from various input types.
 *
 * @param input - Input that may contain environment info
 * @returns Environment string or 'unknown'
 */
export function determineEnvironment(input) {
    if (typeof input === 'string') {
        return input;
    }
    return input.environment || input.target?.environment || 'unknown';
}
//# sourceMappingURL=builder.js.map