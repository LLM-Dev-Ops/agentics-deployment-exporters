/**
 * Simulation Artifact Detector
 *
 * Detects simulation artifacts produced by agentics-simulation-engine within
 * deployment intents. This module identifies scenario results, capacity models,
 * load profiles, and other simulation outputs.
 *
 * The detector is deterministic - same input always produces identical output.
 * No network calls or external services are used.
 *
 * @module core/simulation/detector
 * @version 1.0.0
 */
import type { ValidatedIntent } from '../types.js';
import type { SimulationDetectionResult } from './types.js';
/**
 * Options for simulation detection.
 */
export interface SimulationDetectorOptions {
    /**
     * Minimum confidence threshold for including references.
     * @default 0.5
     */
    readonly minConfidence?: number;
    /**
     * Generate implementation plan if sufficient artifacts found.
     * @default true
     */
    readonly generatePlan?: boolean;
    /**
     * Include original properties in references.
     * @default true
     */
    readonly includeOriginalProperties?: boolean;
}
/**
 * Simulation Artifact Detector class.
 *
 * Detects simulation artifacts in deployment intents and optionally generates
 * implementation plans from the detected artifacts.
 *
 * All operations are deterministic and produce identical output for
 * identical input.
 */
export declare class SimulationArtifactDetector {
    private readonly options;
    constructor(options?: SimulationDetectorOptions);
    /**
     * Detect simulation artifacts in a validated intent.
     *
     * @param intent - The validated deployment intent to scan
     * @returns Detection result with all found references and optional plan
     */
    detect(intent: ValidatedIntent): SimulationDetectionResult;
    /**
     * Detect simulation references in a single resource.
     */
    private detectResourceReferences;
    /**
     * Create a simulation artifact reference.
     */
    private createReference;
    /**
     * Extract string property from properties object.
     */
    private extractStringProperty;
    /**
     * Extract number property from properties object.
     */
    private extractNumberProperty;
    /**
     * Generate detection summary.
     */
    private generateSummary;
    /**
     * Generate implementation plan from detected simulation artifacts.
     */
    private generateImplementationPlan;
    /**
     * Generate a deterministic plan ID.
     */
    private generatePlanId;
    /**
     * Generate plan items from simulation references.
     */
    private generatePlanItems;
    /**
     * Create a plan item from a simulation reference.
     */
    private createPlanItemFromReference;
    /**
     * Generate implementation phases from plan items.
     */
    private generatePhases;
    /**
     * Generate recommendations from simulation references.
     */
    private generateRecommendations;
    /**
     * Generate a recommendation for a specific artifact type.
     */
    private generateTypeRecommendation;
    /**
     * Extract aggregate metrics from simulation references.
     */
    private extractAggregateMetrics;
    /**
     * Extract metric values from properties.
     */
    private extractMetricValues;
    /**
     * Generate confidence summary.
     */
    private generateConfidenceSummary;
    /**
     * Generate plan summary text.
     */
    private generatePlanSummary;
}
/**
 * Factory function to create a Simulation Artifact Detector.
 */
export declare function createSimulationArtifactDetector(options?: SimulationDetectorOptions): SimulationArtifactDetector;
//# sourceMappingURL=detector.d.ts.map