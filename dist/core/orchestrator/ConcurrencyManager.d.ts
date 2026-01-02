/**
 * ConcurrencyManager - Parallel execution control for export orchestration.
 *
 * This module handles:
 * - Executing exporters in parallel with configurable concurrency limits
 * - Managing execution phases (groups of exporters that can run in parallel)
 * - Error handling per continueOnError setting
 * - Timeout handling for individual exporters
 * - Progress tracking and reporting
 *
 * Key principles:
 * - Atomic operations: all-or-nothing unless continueOnError is set
 * - Traceability: track which exporter produced which artifact
 * - Determinism: same execution order for same input (within phases)
 */
import type { ConcurrencyOptions, ExporterId, ExporterContext, ExporterExecutionResult, ExecutionPlan, IExporter, NormalizedIntent, ProgressHandler } from './types.js';
/**
 * Error thrown when execution times out.
 */
export declare class ExecutionTimeoutError extends Error {
    readonly exporterId: ExporterId;
    readonly timeoutMs: number;
    constructor(exporterId: ExporterId, timeoutMs: number, message?: string);
}
/**
 * Error thrown when execution fails and continueOnError is false.
 */
export declare class ExecutionAbortedError extends Error {
    readonly exporterId: ExporterId;
    readonly cause: Error;
    constructor(exporterId: ExporterId, cause: Error, message?: string);
}
/**
 * Manages concurrent execution of exporters.
 */
export declare class ConcurrencyManager {
    private progressHandlers;
    private aborted;
    /**
     * Execute a plan with parallel execution support.
     *
     * @param plan - The execution plan
     * @param exporters - Map of exporter ID to exporter instance
     * @param intent - The normalized intent
     * @param context - Execution context
     * @param options - Concurrency options
     * @returns Array of execution results
     */
    executeParallel(plan: ExecutionPlan, exporters: ReadonlyMap<ExporterId, IExporter>, intent: NormalizedIntent, context: Omit<ExporterContext, 'dependencyArtifacts' | 'intent'>, options?: Partial<ConcurrencyOptions>): Promise<readonly ExporterExecutionResult[]>;
    /**
     * Execute a single phase with concurrency control.
     */
    private executePhase;
    /**
     * Execute a single exporter.
     */
    private executeExporter;
    /**
     * Execute a function with an optional timeout.
     */
    private executeWithTimeout;
    /**
     * Create an ExportError from an Error.
     */
    private createExportError;
    /**
     * Get error code based on error type.
     */
    private getErrorCode;
    /**
     * Determine if an error is recoverable.
     */
    private isRecoverableError;
    /**
     * Subscribe to progress events.
     * @returns Unsubscribe function
     */
    onProgress(handler: ProgressHandler): () => void;
    /**
     * Emit a progress event to all handlers.
     */
    private emitProgress;
    /**
     * Abort current execution.
     */
    abort(): void;
    /**
     * Check if execution was aborted.
     */
    isAborted(): boolean;
    /**
     * Reset abort state.
     */
    reset(): void;
    /**
     * Calculate optimal concurrency based on phase composition.
     */
    static calculateOptimalConcurrency(plan: ExecutionPlan, maxConcurrency: number): number;
}
//# sourceMappingURL=ConcurrencyManager.d.ts.map