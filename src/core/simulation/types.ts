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
] as const;

export type SimulationSource = (typeof SimulationSourceValues)[number];

export const SimulationSourceSchema = z.enum(SimulationSourceValues);

// =============================================================================
// SIMULATION ARTIFACT TYPES
// =============================================================================

/**
 * Types of simulation artifacts that can be recognized.
 */
export const SimulationArtifactTypeValues = [
  'scenario-result',        // Results from scenario execution
  'capacity-model',         // Capacity planning model output
  'load-profile',           // Load testing profile data
  'behavior-trace',         // Agent behavior traces
  'state-timeline',         // State changes over time
  'decision-tree',          // Decision tree outputs
  'optimization-result',    // Optimization algorithm results
  'sensitivity-analysis',   // Sensitivity analysis outputs
  'forecast-projection',    // Forecasting projections
  'risk-assessment',        // Risk modeling results
  'resource-allocation',    // Resource allocation recommendations
  'workflow-simulation',    // Workflow simulation outputs
  'event-log',              // Discrete event simulation logs
  'metric-collection',      // Collected simulation metrics
] as const;

export type SimulationArtifactType = (typeof SimulationArtifactTypeValues)[number];

export const SimulationArtifactTypeSchema = z.enum(SimulationArtifactTypeValues);

// =============================================================================
// SIMULATION STATUS
// =============================================================================

/**
 * Status of a simulation artifact.
 */
export const SimulationStatusValues = [
  'completed',      // Simulation completed successfully
  'partial',        // Partial results available
  'failed',         // Simulation failed
  'in-progress',    // Still running (should not be exported)
  'archived',       // Historical artifact
] as const;

export type SimulationStatus = (typeof SimulationStatusValues)[number];

export const SimulationStatusSchema = z.enum(SimulationStatusValues);

// =============================================================================
// SIMULATION ARTIFACT REFERENCE
// =============================================================================

/**
 * Represents a detected simulation artifact reference within a deployment intent.
 */
export interface SimulationArtifactReference {
  /**
   * Unique identifier for this reference within the intent.
   */
  readonly referenceId: string;

  /**
   * Source system that produced this simulation.
   */
  readonly source: SimulationSource;

  /**
   * Type of simulation artifact.
   */
  readonly artifactType: SimulationArtifactType;

  /**
   * Status of the simulation.
   */
  readonly status: SimulationStatus;

  /**
   * Resource type string that triggered detection.
   */
  readonly sourceType: string;

  /**
   * JSONPath to the resource within the intent.
   */
  readonly sourcePath: string;

  /**
   * Name of the resource containing this reference.
   */
  readonly resourceName: string;

  /**
   * Original properties associated with this simulation artifact.
   */
  readonly originalProperties: Readonly<Record<string, unknown>>;

  /**
   * Simulation identifier (if available).
   */
  readonly simulationId?: string;

  /**
   * Scenario identifier (if available).
   */
  readonly scenarioId?: string;

  /**
   * Execution timestamp (if available).
   */
  readonly executedAt?: string;

  /**
   * Duration of simulation in milliseconds (if available).
   */
  readonly durationMs?: number;

  /**
   * Confidence score for this detection (0.0 - 1.0).
   */
  readonly confidence: number;
}

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

// =============================================================================
// SIMULATION METRICS
// =============================================================================

/**
 * Extracted metrics from a simulation artifact.
 */
export interface SimulationMetrics {
  /**
   * Performance metrics (latency, throughput, etc.).
   */
  readonly performance?: Readonly<Record<string, number>>;

  /**
   * Resource utilization metrics.
   */
  readonly resourceUtilization?: Readonly<Record<string, number>>;

  /**
   * Cost projections.
   */
  readonly costProjections?: Readonly<Record<string, number>>;

  /**
   * Capacity thresholds.
   */
  readonly capacityThresholds?: Readonly<Record<string, number>>;

  /**
   * Custom metrics.
   */
  readonly custom?: Readonly<Record<string, unknown>>;
}

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
] as const;

export type RecommendationPriority = (typeof RecommendationPriorityValues)[number];

export const RecommendationPrioritySchema = z.enum(RecommendationPriorityValues);

/**
 * A recommendation derived from simulation results.
 */
export interface SimulationRecommendation {
  /**
   * Unique identifier for this recommendation.
   */
  readonly recommendationId: string;

  /**
   * Priority level.
   */
  readonly priority: RecommendationPriority;

  /**
   * Category of recommendation.
   */
  readonly category: string;

  /**
   * Human-readable title.
   */
  readonly title: string;

  /**
   * Detailed description.
   */
  readonly description: string;

  /**
   * Suggested action items.
   */
  readonly actionItems: readonly string[];

  /**
   * Estimated impact (if quantified).
   */
  readonly estimatedImpact?: Readonly<Record<string, unknown>>;

  /**
   * Related simulation reference IDs.
   */
  readonly relatedReferences: readonly string[];
}

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
] as const;

export type PlanItemStatus = (typeof PlanItemStatusValues)[number];

export const PlanItemStatusSchema = z.enum(PlanItemStatusValues);

/**
 * A single item in an implementation plan derived from simulation.
 */
export interface ImplementationPlanItem {
  /**
   * Unique identifier for this plan item.
   */
  readonly itemId: string;

  /**
   * Human-readable title.
   */
  readonly title: string;

  /**
   * Detailed description.
   */
  readonly description: string;

  /**
   * Priority level.
   */
  readonly priority: RecommendationPriority;

  /**
   * Current status.
   */
  readonly status: PlanItemStatus;

  /**
   * Category/phase of implementation.
   */
  readonly phase: string;

  /**
   * Prerequisites (other item IDs).
   */
  readonly prerequisites: readonly string[];

  /**
   * Resources affected by this item.
   */
  readonly affectedResources: readonly string[];

  /**
   * Simulation references that support this item.
   */
  readonly simulationEvidence: readonly string[];

  /**
   * Estimated effort (optional, as provided by simulation).
   */
  readonly estimatedEffort?: string;

  /**
   * Success criteria.
   */
  readonly successCriteria: readonly string[];

  /**
   * Risks identified from simulation.
   */
  readonly risks: readonly string[];
}

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

// =============================================================================
// IMPLEMENTATION PLAN
// =============================================================================

/**
 * Complete implementation plan derived from simulation artifacts.
 */
export interface ImplementationPlan {
  /**
   * Unique identifier for this plan.
   */
  readonly planId: string;

  /**
   * Plan version.
   */
  readonly version: string;

  /**
   * Creation timestamp.
   */
  readonly createdAt: string;

  /**
   * Source intent ID.
   */
  readonly sourceIntentId: string;

  /**
   * Source intent hash.
   */
  readonly sourceIntentHash: string;

  /**
   * Executive summary.
   */
  readonly summary: string;

  /**
   * Implementation phases.
   */
  readonly phases: readonly ImplementationPhase[];

  /**
   * All plan items.
   */
  readonly items: readonly ImplementationPlanItem[];

  /**
   * Simulation references used.
   */
  readonly simulationReferences: readonly string[];

  /**
   * Overall recommendations.
   */
  readonly recommendations: readonly SimulationRecommendation[];

  /**
   * Aggregated metrics from simulations.
   */
  readonly metrics: SimulationMetrics;

  /**
   * Audit information.
   */
  readonly audit: ImplementationPlanAudit;
}

/**
 * An implementation phase.
 */
export interface ImplementationPhase {
  /**
   * Phase identifier.
   */
  readonly phaseId: string;

  /**
   * Phase name.
   */
  readonly name: string;

  /**
   * Phase description.
   */
  readonly description: string;

  /**
   * Order in sequence (1-based).
   */
  readonly order: number;

  /**
   * Item IDs belonging to this phase.
   */
  readonly itemIds: readonly string[];
}

/**
 * Audit information for implementation plan.
 */
export interface ImplementationPlanAudit {
  /**
   * Intent ID that generated this plan.
   */
  readonly intentId: string;

  /**
   * Intent version.
   */
  readonly intentVersion: string;

  /**
   * Intent hash.
   */
  readonly intentHash: string;

  /**
   * Generation timestamp.
   */
  readonly generatedAt: string;

  /**
   * Exporter version.
   */
  readonly exporterVersion: string;

  /**
   * Simulation artifact count.
   */
  readonly simulationCount: number;

  /**
   * Detection confidence summary.
   */
  readonly confidenceSummary: Readonly<Record<string, number>>;
}

// =============================================================================
// DETECTION RESULT
// =============================================================================

/**
 * Result of simulation artifact detection on an intent.
 */
export interface SimulationDetectionResult {
  /**
   * Whether any simulation artifacts were detected.
   */
  readonly hasSimulationArtifacts: boolean;

  /**
   * All detected simulation artifact references.
   */
  readonly references: readonly SimulationArtifactReference[];

  /**
   * Generated implementation plan (if sufficient artifacts found).
   */
  readonly implementationPlan?: ImplementationPlan;

  /**
   * Summary statistics.
   */
  readonly summary: SimulationDetectionSummary;
}

/**
 * Summary statistics for simulation detection.
 */
export interface SimulationDetectionSummary {
  readonly totalReferences: number;
  readonly bySource: Readonly<Record<SimulationSource, number>>;
  readonly byArtifactType: Readonly<Record<SimulationArtifactType, number>>;
  readonly byStatus: Readonly<Record<SimulationStatus, number>>;
  readonly highConfidenceCount: number;
  readonly planItemCount: number;
}

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
] as const;

export type SimulationExportFormat = (typeof SimulationExportFormatValues)[number];

export const SimulationExportFormatSchema = z.enum(SimulationExportFormatValues);

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for SimulationSource.
 */
export function isSimulationSource(value: unknown): value is SimulationSource {
  return typeof value === 'string' && SimulationSourceValues.includes(value as SimulationSource);
}

/**
 * Type guard for SimulationArtifactType.
 */
export function isSimulationArtifactType(value: unknown): value is SimulationArtifactType {
  return typeof value === 'string' && SimulationArtifactTypeValues.includes(value as SimulationArtifactType);
}

/**
 * Type guard for SimulationStatus.
 */
export function isSimulationStatus(value: unknown): value is SimulationStatus {
  return typeof value === 'string' && SimulationStatusValues.includes(value as SimulationStatus);
}
