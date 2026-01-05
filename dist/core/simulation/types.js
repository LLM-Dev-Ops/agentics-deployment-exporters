/**
 * Simulation Artifact Types
 *
 * Type definitions for recognizing and processing simulation artifacts
 * produced by agentics-simulation-engine. These types enable the exporter
 * to identify simulation outputs and transform them into implementation plans.
 *
 * The exporter remains a passive translator - it does NOT modify simulation
 * logic or generate new simulations. It only recognizes and exports existing
 * simulation artifacts.
 *
 * @module core/simulation/types
 * @version 1.0.0
 */
import { z } from 'zod';
// =============================================================================
// SIMULATION SOURCE TYPES
// =============================================================================
/**
 * Types of simulation sources that can be detected.
 */
export const SimulationSourceValues = [
    'agentics-simulation-engine',
    'monte-carlo',
    'discrete-event',
    'agent-based',
    'system-dynamics',
    'hybrid',
    'custom',
    'unknown',
];
export const SimulationSourceSchema = z.enum(SimulationSourceValues);
// =============================================================================
// SIMULATION ARTIFACT TYPES
// =============================================================================
/**
 * Types of simulation artifacts that can be recognized.
 */
export const SimulationArtifactTypeValues = [
    'scenario-result', // Results from scenario execution
    'capacity-model', // Capacity planning model output
    'load-profile', // Load testing profile data
    'behavior-trace', // Agent behavior traces
    'state-timeline', // State changes over time
    'decision-tree', // Decision tree outputs
    'optimization-result', // Optimization algorithm results
    'sensitivity-analysis', // Sensitivity analysis outputs
    'forecast-projection', // Forecasting projections
    'risk-assessment', // Risk modeling results
    'resource-allocation', // Resource allocation recommendations
    'workflow-simulation', // Workflow simulation outputs
    'event-log', // Discrete event simulation logs
    'metric-collection', // Collected simulation metrics
];
export const SimulationArtifactTypeSchema = z.enum(SimulationArtifactTypeValues);
// =============================================================================
// SIMULATION STATUS
// =============================================================================
/**
 * Status of a simulation artifact.
 */
export const SimulationStatusValues = [
    'completed', // Simulation completed successfully
    'partial', // Partial results available
    'failed', // Simulation failed
    'in-progress', // Still running (should not be exported)
    'archived', // Historical artifact
];
export const SimulationStatusSchema = z.enum(SimulationStatusValues);
export const SimulationArtifactReferenceSchema = z.object({
    referenceId: z.string(),
    source: SimulationSourceSchema,
    artifactType: SimulationArtifactTypeSchema,
    status: SimulationStatusSchema,
    sourceType: z.string(),
    sourcePath: z.string(),
    resourceName: z.string(),
    originalProperties: z.record(z.unknown()),
    simulationId: z.string().optional(),
    scenarioId: z.string().optional(),
    executedAt: z.string().optional(),
    durationMs: z.number().optional(),
    confidence: z.number().min(0).max(1),
});
export const SimulationMetricsSchema = z.object({
    performance: z.record(z.number()).optional(),
    resourceUtilization: z.record(z.number()).optional(),
    costProjections: z.record(z.number()).optional(),
    capacityThresholds: z.record(z.number()).optional(),
    custom: z.record(z.unknown()).optional(),
});
// =============================================================================
// SIMULATION RECOMMENDATIONS
// =============================================================================
/**
 * Priority levels for recommendations.
 */
export const RecommendationPriorityValues = [
    'critical',
    'high',
    'medium',
    'low',
    'informational',
];
export const RecommendationPrioritySchema = z.enum(RecommendationPriorityValues);
export const SimulationRecommendationSchema = z.object({
    recommendationId: z.string(),
    priority: RecommendationPrioritySchema,
    category: z.string(),
    title: z.string(),
    description: z.string(),
    actionItems: z.array(z.string()),
    estimatedImpact: z.record(z.unknown()).optional(),
    relatedReferences: z.array(z.string()),
});
// =============================================================================
// IMPLEMENTATION PLAN ITEM
// =============================================================================
/**
 * Status of an implementation plan item.
 */
export const PlanItemStatusValues = [
    'proposed',
    'approved',
    'in-progress',
    'completed',
    'deferred',
    'rejected',
];
export const PlanItemStatusSchema = z.enum(PlanItemStatusValues);
export const ImplementationPlanItemSchema = z.object({
    itemId: z.string(),
    title: z.string(),
    description: z.string(),
    priority: RecommendationPrioritySchema,
    status: PlanItemStatusSchema,
    phase: z.string(),
    prerequisites: z.array(z.string()),
    affectedResources: z.array(z.string()),
    simulationEvidence: z.array(z.string()),
    estimatedEffort: z.string().optional(),
    successCriteria: z.array(z.string()),
    risks: z.array(z.string()),
});
export const SimulationDetectionResultSchema = z.object({
    hasSimulationArtifacts: z.boolean(),
    references: z.array(SimulationArtifactReferenceSchema),
    implementationPlan: z.any().optional(),
    summary: z.object({
        totalReferences: z.number(),
        bySource: z.record(z.number()),
        byArtifactType: z.record(z.number()),
        byStatus: z.record(z.number()),
        highConfidenceCount: z.number(),
        planItemCount: z.number(),
    }),
});
// =============================================================================
// EXPORT FORMAT OPTIONS
// =============================================================================
/**
 * Output format options for simulation artifact exports.
 */
export const SimulationExportFormatValues = [
    'implementation-plan-json',
    'implementation-plan-yaml',
    'executive-summary-md',
    'detailed-report-md',
    'metrics-csv',
    'recommendations-json',
    'timeline-json',
];
export const SimulationExportFormatSchema = z.enum(SimulationExportFormatValues);
// =============================================================================
// TYPE GUARDS
// =============================================================================
/**
 * Type guard for SimulationSource.
 */
export function isSimulationSource(value) {
    return typeof value === 'string' && SimulationSourceValues.includes(value);
}
/**
 * Type guard for SimulationArtifactType.
 */
export function isSimulationArtifactType(value) {
    return typeof value === 'string' && SimulationArtifactTypeValues.includes(value);
}
/**
 * Type guard for SimulationStatus.
 */
export function isSimulationStatus(value) {
    return typeof value === 'string' && SimulationStatusValues.includes(value);
}
//# sourceMappingURL=types.js.map