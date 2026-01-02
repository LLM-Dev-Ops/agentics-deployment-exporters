/**
 * ExecutionPlanner - Builds execution DAG for export orchestration.
 *
 * This module is responsible for:
 * - Determining which exporters are applicable for a given intent
 * - Building a dependency graph between exporters
 * - Computing topological order for execution
 * - Grouping exporters into phases for parallel execution
 *
 * The planner ensures deterministic execution order - same input always
 * produces the same execution plan.
 */
import type { ExecutionPlan, ExporterId, IExporter, NormalizedIntent, OrchestrationOptions } from './types.js';
/**
 * Error thrown when a circular dependency is detected in the execution graph.
 */
export declare class CircularDependencyError extends Error {
    readonly cycle: readonly ExporterId[];
    constructor(cycle: readonly ExporterId[], message?: string);
}
/**
 * Error thrown when a dependency references an unknown exporter.
 */
export declare class UnknownDependencyError extends Error {
    readonly exporterId: ExporterId;
    readonly dependency: ExporterId;
    constructor(exporterId: ExporterId, dependency: ExporterId, message?: string);
}
/**
 * Builds execution plans from intents and registered exporters.
 */
export declare class ExecutionPlanner {
    /**
     * Build an execution plan for the given intent.
     *
     * @param intent - The normalized intent to export
     * @param exporters - Available exporters
     * @param options - Orchestration options
     * @returns ExecutionPlan describing how to execute the export
     */
    buildPlan(intent: NormalizedIntent, exporters: readonly IExporter[], options?: OrchestrationOptions): ExecutionPlan;
    /**
     * Filter exporters to only those applicable for the intent.
     */
    private filterApplicableExporters;
    /**
     * Build the dependency graph between exporters.
     */
    private buildDependencyGraph;
    /**
     * Perform topological sort using Kahn's algorithm.
     * Returns exporters in execution order (dependencies first).
     */
    private topologicalSort;
    /**
     * Compute execution phases for parallel execution.
     * Exporters in the same phase have no dependencies on each other
     * and can be executed in parallel.
     */
    private computePhases;
    /**
     * Build plan items with all metadata.
     */
    private buildPlanItems;
    /**
     * Get the sections that an exporter will process from the intent.
     */
    private getApplicableSections;
    /**
     * Estimate the number of artifacts an exporter will produce.
     * This is a heuristic based on the exporter type and sections.
     */
    private estimateArtifactCount;
    /**
     * Create an invalid plan with validation errors.
     */
    private createInvalidPlan;
    /**
     * Validate that a plan is executable.
     * This performs additional checks beyond what buildPlan does.
     */
    validatePlan(plan: ExecutionPlan): readonly string[];
}
//# sourceMappingURL=ExecutionPlanner.d.ts.map