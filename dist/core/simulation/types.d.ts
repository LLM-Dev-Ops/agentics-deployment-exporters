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
/**
 * Types of simulation sources that can be detected.
 */
export declare const SimulationSourceValues: readonly ["agentics-simulation-engine", "monte-carlo", "discrete-event", "agent-based", "system-dynamics", "hybrid", "custom", "unknown"];
export type SimulationSource = (typeof SimulationSourceValues)[number];
export declare const SimulationSourceSchema: z.ZodEnum<["agentics-simulation-engine", "monte-carlo", "discrete-event", "agent-based", "system-dynamics", "hybrid", "custom", "unknown"]>;
/**
 * Types of simulation artifacts that can be recognized.
 */
export declare const SimulationArtifactTypeValues: readonly ["scenario-result", "capacity-model", "load-profile", "behavior-trace", "state-timeline", "decision-tree", "optimization-result", "sensitivity-analysis", "forecast-projection", "risk-assessment", "resource-allocation", "workflow-simulation", "event-log", "metric-collection"];
export type SimulationArtifactType = (typeof SimulationArtifactTypeValues)[number];
export declare const SimulationArtifactTypeSchema: z.ZodEnum<["scenario-result", "capacity-model", "load-profile", "behavior-trace", "state-timeline", "decision-tree", "optimization-result", "sensitivity-analysis", "forecast-projection", "risk-assessment", "resource-allocation", "workflow-simulation", "event-log", "metric-collection"]>;
/**
 * Status of a simulation artifact.
 */
export declare const SimulationStatusValues: readonly ["completed", "partial", "failed", "in-progress", "archived"];
export type SimulationStatus = (typeof SimulationStatusValues)[number];
export declare const SimulationStatusSchema: z.ZodEnum<["completed", "partial", "failed", "in-progress", "archived"]>;
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
export declare const SimulationArtifactReferenceSchema: z.ZodObject<{
    referenceId: z.ZodString;
    source: z.ZodEnum<["agentics-simulation-engine", "monte-carlo", "discrete-event", "agent-based", "system-dynamics", "hybrid", "custom", "unknown"]>;
    artifactType: z.ZodEnum<["scenario-result", "capacity-model", "load-profile", "behavior-trace", "state-timeline", "decision-tree", "optimization-result", "sensitivity-analysis", "forecast-projection", "risk-assessment", "resource-allocation", "workflow-simulation", "event-log", "metric-collection"]>;
    status: z.ZodEnum<["completed", "partial", "failed", "in-progress", "archived"]>;
    sourceType: z.ZodString;
    sourcePath: z.ZodString;
    resourceName: z.ZodString;
    originalProperties: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    simulationId: z.ZodOptional<z.ZodString>;
    scenarioId: z.ZodOptional<z.ZodString>;
    executedAt: z.ZodOptional<z.ZodString>;
    durationMs: z.ZodOptional<z.ZodNumber>;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    status: "failed" | "completed" | "partial" | "in-progress" | "archived";
    source: "unknown" | "custom" | "agentics-simulation-engine" | "monte-carlo" | "discrete-event" | "agent-based" | "system-dynamics" | "hybrid";
    referenceId: string;
    sourceType: string;
    sourcePath: string;
    resourceName: string;
    originalProperties: Record<string, unknown>;
    confidence: number;
    artifactType: "scenario-result" | "capacity-model" | "load-profile" | "behavior-trace" | "state-timeline" | "decision-tree" | "optimization-result" | "sensitivity-analysis" | "forecast-projection" | "risk-assessment" | "resource-allocation" | "workflow-simulation" | "event-log" | "metric-collection";
    durationMs?: number | undefined;
    simulationId?: string | undefined;
    scenarioId?: string | undefined;
    executedAt?: string | undefined;
}, {
    status: "failed" | "completed" | "partial" | "in-progress" | "archived";
    source: "unknown" | "custom" | "agentics-simulation-engine" | "monte-carlo" | "discrete-event" | "agent-based" | "system-dynamics" | "hybrid";
    referenceId: string;
    sourceType: string;
    sourcePath: string;
    resourceName: string;
    originalProperties: Record<string, unknown>;
    confidence: number;
    artifactType: "scenario-result" | "capacity-model" | "load-profile" | "behavior-trace" | "state-timeline" | "decision-tree" | "optimization-result" | "sensitivity-analysis" | "forecast-projection" | "risk-assessment" | "resource-allocation" | "workflow-simulation" | "event-log" | "metric-collection";
    durationMs?: number | undefined;
    simulationId?: string | undefined;
    scenarioId?: string | undefined;
    executedAt?: string | undefined;
}>;
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
export declare const SimulationMetricsSchema: z.ZodObject<{
    performance: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    resourceUtilization: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    costProjections: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    capacityThresholds: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    custom: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    custom?: Record<string, unknown> | undefined;
    performance?: Record<string, number> | undefined;
    resourceUtilization?: Record<string, number> | undefined;
    costProjections?: Record<string, number> | undefined;
    capacityThresholds?: Record<string, number> | undefined;
}, {
    custom?: Record<string, unknown> | undefined;
    performance?: Record<string, number> | undefined;
    resourceUtilization?: Record<string, number> | undefined;
    costProjections?: Record<string, number> | undefined;
    capacityThresholds?: Record<string, number> | undefined;
}>;
/**
 * Priority levels for recommendations.
 */
export declare const RecommendationPriorityValues: readonly ["critical", "high", "medium", "low", "informational"];
export type RecommendationPriority = (typeof RecommendationPriorityValues)[number];
export declare const RecommendationPrioritySchema: z.ZodEnum<["critical", "high", "medium", "low", "informational"]>;
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
export declare const SimulationRecommendationSchema: z.ZodObject<{
    recommendationId: z.ZodString;
    priority: z.ZodEnum<["critical", "high", "medium", "low", "informational"]>;
    category: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    actionItems: z.ZodArray<z.ZodString, "many">;
    estimatedImpact: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    relatedReferences: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    description: string;
    priority: "low" | "medium" | "high" | "critical" | "informational";
    category: string;
    recommendationId: string;
    title: string;
    actionItems: string[];
    relatedReferences: string[];
    estimatedImpact?: Record<string, unknown> | undefined;
}, {
    description: string;
    priority: "low" | "medium" | "high" | "critical" | "informational";
    category: string;
    recommendationId: string;
    title: string;
    actionItems: string[];
    relatedReferences: string[];
    estimatedImpact?: Record<string, unknown> | undefined;
}>;
/**
 * Status of an implementation plan item.
 */
export declare const PlanItemStatusValues: readonly ["proposed", "approved", "in-progress", "completed", "deferred", "rejected"];
export type PlanItemStatus = (typeof PlanItemStatusValues)[number];
export declare const PlanItemStatusSchema: z.ZodEnum<["proposed", "approved", "in-progress", "completed", "deferred", "rejected"]>;
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
export declare const ImplementationPlanItemSchema: z.ZodObject<{
    itemId: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    priority: z.ZodEnum<["critical", "high", "medium", "low", "informational"]>;
    status: z.ZodEnum<["proposed", "approved", "in-progress", "completed", "deferred", "rejected"]>;
    phase: z.ZodString;
    prerequisites: z.ZodArray<z.ZodString, "many">;
    affectedResources: z.ZodArray<z.ZodString, "many">;
    simulationEvidence: z.ZodArray<z.ZodString, "many">;
    estimatedEffort: z.ZodOptional<z.ZodString>;
    successCriteria: z.ZodArray<z.ZodString, "many">;
    risks: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "in-progress" | "proposed" | "approved" | "deferred" | "rejected";
    phase: string;
    description: string;
    priority: "low" | "medium" | "high" | "critical" | "informational";
    itemId: string;
    risks: string[];
    title: string;
    prerequisites: string[];
    affectedResources: string[];
    simulationEvidence: string[];
    successCriteria: string[];
    estimatedEffort?: string | undefined;
}, {
    status: "completed" | "in-progress" | "proposed" | "approved" | "deferred" | "rejected";
    phase: string;
    description: string;
    priority: "low" | "medium" | "high" | "critical" | "informational";
    itemId: string;
    risks: string[];
    title: string;
    prerequisites: string[];
    affectedResources: string[];
    simulationEvidence: string[];
    successCriteria: string[];
    estimatedEffort?: string | undefined;
}>;
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
export declare const SimulationDetectionResultSchema: z.ZodObject<{
    hasSimulationArtifacts: z.ZodBoolean;
    references: z.ZodArray<z.ZodObject<{
        referenceId: z.ZodString;
        source: z.ZodEnum<["agentics-simulation-engine", "monte-carlo", "discrete-event", "agent-based", "system-dynamics", "hybrid", "custom", "unknown"]>;
        artifactType: z.ZodEnum<["scenario-result", "capacity-model", "load-profile", "behavior-trace", "state-timeline", "decision-tree", "optimization-result", "sensitivity-analysis", "forecast-projection", "risk-assessment", "resource-allocation", "workflow-simulation", "event-log", "metric-collection"]>;
        status: z.ZodEnum<["completed", "partial", "failed", "in-progress", "archived"]>;
        sourceType: z.ZodString;
        sourcePath: z.ZodString;
        resourceName: z.ZodString;
        originalProperties: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        simulationId: z.ZodOptional<z.ZodString>;
        scenarioId: z.ZodOptional<z.ZodString>;
        executedAt: z.ZodOptional<z.ZodString>;
        durationMs: z.ZodOptional<z.ZodNumber>;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        status: "failed" | "completed" | "partial" | "in-progress" | "archived";
        source: "unknown" | "custom" | "agentics-simulation-engine" | "monte-carlo" | "discrete-event" | "agent-based" | "system-dynamics" | "hybrid";
        referenceId: string;
        sourceType: string;
        sourcePath: string;
        resourceName: string;
        originalProperties: Record<string, unknown>;
        confidence: number;
        artifactType: "scenario-result" | "capacity-model" | "load-profile" | "behavior-trace" | "state-timeline" | "decision-tree" | "optimization-result" | "sensitivity-analysis" | "forecast-projection" | "risk-assessment" | "resource-allocation" | "workflow-simulation" | "event-log" | "metric-collection";
        durationMs?: number | undefined;
        simulationId?: string | undefined;
        scenarioId?: string | undefined;
        executedAt?: string | undefined;
    }, {
        status: "failed" | "completed" | "partial" | "in-progress" | "archived";
        source: "unknown" | "custom" | "agentics-simulation-engine" | "monte-carlo" | "discrete-event" | "agent-based" | "system-dynamics" | "hybrid";
        referenceId: string;
        sourceType: string;
        sourcePath: string;
        resourceName: string;
        originalProperties: Record<string, unknown>;
        confidence: number;
        artifactType: "scenario-result" | "capacity-model" | "load-profile" | "behavior-trace" | "state-timeline" | "decision-tree" | "optimization-result" | "sensitivity-analysis" | "forecast-projection" | "risk-assessment" | "resource-allocation" | "workflow-simulation" | "event-log" | "metric-collection";
        durationMs?: number | undefined;
        simulationId?: string | undefined;
        scenarioId?: string | undefined;
        executedAt?: string | undefined;
    }>, "many">;
    implementationPlan: z.ZodOptional<z.ZodAny>;
    summary: z.ZodObject<{
        totalReferences: z.ZodNumber;
        bySource: z.ZodRecord<z.ZodString, z.ZodNumber>;
        byArtifactType: z.ZodRecord<z.ZodString, z.ZodNumber>;
        byStatus: z.ZodRecord<z.ZodString, z.ZodNumber>;
        highConfidenceCount: z.ZodNumber;
        planItemCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalReferences: number;
        highConfidenceCount: number;
        bySource: Record<string, number>;
        byArtifactType: Record<string, number>;
        byStatus: Record<string, number>;
        planItemCount: number;
    }, {
        totalReferences: number;
        highConfidenceCount: number;
        bySource: Record<string, number>;
        byArtifactType: Record<string, number>;
        byStatus: Record<string, number>;
        planItemCount: number;
    }>;
}, "strip", z.ZodTypeAny, {
    references: {
        status: "failed" | "completed" | "partial" | "in-progress" | "archived";
        source: "unknown" | "custom" | "agentics-simulation-engine" | "monte-carlo" | "discrete-event" | "agent-based" | "system-dynamics" | "hybrid";
        referenceId: string;
        sourceType: string;
        sourcePath: string;
        resourceName: string;
        originalProperties: Record<string, unknown>;
        confidence: number;
        artifactType: "scenario-result" | "capacity-model" | "load-profile" | "behavior-trace" | "state-timeline" | "decision-tree" | "optimization-result" | "sensitivity-analysis" | "forecast-projection" | "risk-assessment" | "resource-allocation" | "workflow-simulation" | "event-log" | "metric-collection";
        durationMs?: number | undefined;
        simulationId?: string | undefined;
        scenarioId?: string | undefined;
        executedAt?: string | undefined;
    }[];
    summary: {
        totalReferences: number;
        highConfidenceCount: number;
        bySource: Record<string, number>;
        byArtifactType: Record<string, number>;
        byStatus: Record<string, number>;
        planItemCount: number;
    };
    hasSimulationArtifacts: boolean;
    implementationPlan?: any;
}, {
    references: {
        status: "failed" | "completed" | "partial" | "in-progress" | "archived";
        source: "unknown" | "custom" | "agentics-simulation-engine" | "monte-carlo" | "discrete-event" | "agent-based" | "system-dynamics" | "hybrid";
        referenceId: string;
        sourceType: string;
        sourcePath: string;
        resourceName: string;
        originalProperties: Record<string, unknown>;
        confidence: number;
        artifactType: "scenario-result" | "capacity-model" | "load-profile" | "behavior-trace" | "state-timeline" | "decision-tree" | "optimization-result" | "sensitivity-analysis" | "forecast-projection" | "risk-assessment" | "resource-allocation" | "workflow-simulation" | "event-log" | "metric-collection";
        durationMs?: number | undefined;
        simulationId?: string | undefined;
        scenarioId?: string | undefined;
        executedAt?: string | undefined;
    }[];
    summary: {
        totalReferences: number;
        highConfidenceCount: number;
        bySource: Record<string, number>;
        byArtifactType: Record<string, number>;
        byStatus: Record<string, number>;
        planItemCount: number;
    };
    hasSimulationArtifacts: boolean;
    implementationPlan?: any;
}>;
/**
 * Output format options for simulation artifact exports.
 */
export declare const SimulationExportFormatValues: readonly ["implementation-plan-json", "implementation-plan-yaml", "executive-summary-md", "detailed-report-md", "metrics-csv", "recommendations-json", "timeline-json"];
export type SimulationExportFormat = (typeof SimulationExportFormatValues)[number];
export declare const SimulationExportFormatSchema: z.ZodEnum<["implementation-plan-json", "implementation-plan-yaml", "executive-summary-md", "detailed-report-md", "metrics-csv", "recommendations-json", "timeline-json"]>;
/**
 * Type guard for SimulationSource.
 */
export declare function isSimulationSource(value: unknown): value is SimulationSource;
/**
 * Type guard for SimulationArtifactType.
 */
export declare function isSimulationArtifactType(value: unknown): value is SimulationArtifactType;
/**
 * Type guard for SimulationStatus.
 */
export declare function isSimulationStatus(value: unknown): value is SimulationStatus;
//# sourceMappingURL=types.d.ts.map