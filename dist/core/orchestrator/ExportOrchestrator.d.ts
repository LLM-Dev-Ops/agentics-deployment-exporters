/**
 * ExportOrchestrator - Main orchestrator for deployment export operations.
 *
 * This module implements IExportOrchestrator and coordinates the entire
 * export process:
 * - Determining required exporters based on intent sections
 * - Building execution dependency graph (DAG)
 * - Managing parallel execution
 * - Handling partial failures (configurable)
 * - Coordinating artifact collection
 *
 * Key principles from SPARC_REFINEMENT.md:
 * - Atomic operations: all-or-nothing unless continueOnError
 * - Traceability: track which exporter produced which artifact
 * - Determinism: same execution order for same input
 */
import { ConcurrencyManager } from './ConcurrencyManager.js';
import { ExecutionPlanner } from './ExecutionPlanner.js';
import type { ExporterId, ExportResult, ExecutionPlan, IExporter, IExportOrchestrator, NormalizedIntent, OrchestrationOptions, ProgressHandler } from './types.js';
/**
 * Main export orchestrator implementation.
 */
export declare class ExportOrchestrator implements IExportOrchestrator {
    private readonly exporters;
    private readonly planner;
    private readonly concurrencyManager;
    private readonly progressHandlers;
    constructor();
    /**
     * Execute export process for the given intent.
     *
     * @param intent - The normalized deployment intent
     * @param options - Orchestration options
     * @returns Export result containing all artifacts or errors
     */
    execute(intent: NormalizedIntent, options?: OrchestrationOptions): Promise<ExportResult>;
    /**
     * Register an exporter with the orchestrator.
     */
    registerExporter(exporter: IExporter): void;
    /**
     * Unregister an exporter.
     */
    unregisterExporter(exporterId: ExporterId): boolean;
    /**
     * Get all registered exporters.
     */
    getExporters(): readonly IExporter[];
    /**
     * Get a registered exporter by ID.
     */
    getExporter(exporterId: ExporterId): IExporter | undefined;
    /**
     * Build an execution plan without executing it.
     */
    plan(intent: NormalizedIntent, options?: OrchestrationOptions): ExecutionPlan;
    /**
     * Subscribe to export progress events.
     * @returns Unsubscribe function
     */
    onProgress(handler: ProgressHandler): () => void;
    /**
     * Merge provided options with defaults.
     */
    private mergeOptions;
    /**
     * Validate all produced artifacts.
     */
    private validateArtifacts;
    /**
     * Create a failed export result.
     */
    private createFailedResult;
    /**
     * Create a dry run result (plan only, no execution).
     */
    private createDryRunResult;
    /**
     * Emit a progress event to all handlers.
     */
    private emitProgress;
    /**
     * Get the execution planner for advanced use cases.
     */
    getPlanner(): ExecutionPlanner;
    /**
     * Get the concurrency manager for advanced use cases.
     */
    getConcurrencyManager(): ConcurrencyManager;
    /**
     * Abort the current execution.
     */
    abort(): void;
    /**
     * Reset the orchestrator state.
     */
    reset(): void;
    /**
     * Check if any exporters can handle the given intent.
     */
    canExport(intent: NormalizedIntent): boolean;
    /**
     * Get exporters that can handle the given intent.
     */
    getApplicableExporters(intent: NormalizedIntent): readonly IExporter[];
    /**
     * Validate that all exporter dependencies are registered.
     */
    validateDependencies(): readonly string[];
}
/**
 * Create a new ExportOrchestrator instance.
 */
export declare function createOrchestrator(): ExportOrchestrator;
//# sourceMappingURL=ExportOrchestrator.d.ts.map